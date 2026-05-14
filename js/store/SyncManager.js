import * as auth from '../auth.js';
import { state, normalizeDate, migrateTransactionIds, DEFAULT_CATEGORIES, DEFAULT_ACCOUNTS } from './BaseStore.js';
import { updateAccountBalances } from './AccountStore.js';

let isCloudSyncReady = false;
let isSyncBlocked = false;
let isSyncing = false;
let syncQueue = []; 
let isProcessingQueue = false;

export function blockSync() { isSyncBlocked = true; }
export function isSyncBlockedNow() { return isSyncBlocked; }
export function setCloudSyncReady(r) { isCloudSyncReady = r; }
export function getCloudSyncReady() { return isCloudSyncReady; }
export function isSyncInProgress() { return isSyncing; }

/**
 * データマージロジック
 */
function mergeData(local, cloud, deletedIds = [], priority = 'local') {
  const map = new Map();
  const delSet = new Set(deletedIds || []);
  
  if (priority === 'local') {
    cloud.forEach(item => { if (item?.id && !delSet.has(item.id)) map.set(item.id, item); });
    local.forEach(item => { if (item?.id) map.set(item.id, item); });
  } else {
    local.forEach(item => { if (item?.id) map.set(item.id, item); });
    cloud.forEach(item => { if (item?.id && !delSet.has(item.id)) map.set(item.id, item); });
  }
  return Array.from(map.values());
}

/**
 * クラウドからの全データ読み込み
 */
export async function readAllFromCloud(sheetId) {
  try {
    const [t, c, a, s] = await Promise.all([
      auth.readRows(sheetId, 'transactions!A:K'),
      auth.readRows(sheetId, 'categories!A:G'),
      auth.readRows(sheetId, 'accounts!A:G'),
      auth.readRows(sheetId, 'shortcuts!A:K')
    ]);
    const p = (rows, fn) => (rows && rows.length > 0 && rows[0][0] !== 'EMPTY') ? rows.map(fn) : [];
    return {
      transactions: p(t, r => ({ 
        id: r[0], date: normalizeDate(r[1]), amount: Number(r[2]), type: r[3], 
        category: r[4], fromAccount: r[5], memo: r[6] || '', toAccount: r[7] || '',
        categoryId: r[8] || '', fromAccountId: r[9] || '', toAccountId: r[10] || '' 
      })),
      categories: p(c, r => ({ id: r[0], name: r[1], icon: r[2], type: r[3], order: Number(r[4] || 0), pinned: r[5] === '1' || r[5] === 1 })),
      accounts: p(a, r => ({ id: r[0], name: r[1], icon: r[2], balance: Number(r[3] || 0), initialBalance: Number(r[4] || 0), order: Number(r[5] || 0), pinned: r[6] === '1' || r[6] === 1 })),
      shortcuts: p(s, r => ({ 
        id: r[0], name: r[1], type: r[2], amount: Number(r[3] || 0), category: r[4], 
        fromAccount: r[5], toAccount: r[6] || '', order: Number(r[7] || 0),
        categoryId: r[8] || '', fromAccountId: r[9] || '', toAccountId: r[10] || ''
      }))
    };
  } catch (e) {
    console.error('[SyncManager] Cloud Read Error:', e);
    throw e;
  }
}

/**
 * クラウドからの「読み込みのみ」実行（トランザクション制御付き）
 */
export async function pullOnlyFromCloud(sheetId, saveFn) {
  if (!auth.isLoggedIn() || isSyncing) return false;
  
  isSyncing = true;
  // 非直列化可能なデータが含まれないよう注意（stateは純粋なJSONオブジェクトとする）
  let prevStateBackup;
  try {
    prevStateBackup = JSON.stringify(state);
  } catch (e) {
    console.warn('[SyncManager] State backup failed (circular refs?), proceeding without rollback safety.');
  }

  try {
    const cloud = await readAllFromCloud(sheetId);
    const isCloudExists = cloud.transactions.length > 0 || cloud.categories.length > 0 || cloud.accounts.length > 0;
    
    if (!isCloudExists) return false;

    state.transactions = cloud.transactions.map(tx => ({ ...tx, date: normalizeDate(tx.date) }));
    state.categories = cloud.categories;
    state.accounts = cloud.accounts;
    state.shortcuts = cloud.shortcuts || [];
    
    migrateTransactionIds(state.transactions, state.accounts, state.categories);
    updateAccountBalances();
    saveFn();
    
    return true;
  } catch (e) {
    console.error('[SyncManager] Pull failed:', e);
    if (prevStateBackup) {
      try {
        const restored = JSON.parse(prevStateBackup);
        Object.assign(state, restored);
        console.log('[SyncManager] Rollback successful.');
      } catch (restoreErr) {
        console.error('[SyncManager] Rollback failed!', restoreErr);
      }
    }
    return false;
  } finally {
    isSyncing = false;
  }
}

/**
 * 外部エントリポイント
 */
export function syncToCloudInternal(sheetId, saveFn, priority = 'local', forcePriority = false) {
  if (!sheetId || isSyncBlocked) return Promise.resolve();

  return new Promise((resolve, reject) => {
    syncQueue.push({ sheetId, saveFn, priority, forcePriority, resolve, reject });
    
    if (!isProcessingQueue) {
      processQueue();
    }
  });
}

/**
 * キュープロセッサー
 */
async function processQueue() {
  if (syncQueue.length === 0) {
    isProcessingQueue = false;
    return;
  }

  isProcessingQueue = true;
  const request = syncQueue[0];

  try {
    await _performSync(request);
    const completedRequest = syncQueue.shift(); // 成功したのでキューから削除
    completedRequest.resolve(); // 呼び出し元に完了を通知
  } catch (err) {
    console.error('[SyncManager] Queue Error (Removed from queue):', err);
    const failedRequest = syncQueue.shift(); // エラー時はUIのフリーズを防ぐため破棄して通知
    failedRequest.reject(err);
  } finally {
    // 次の処理をスケジュール
    if (syncQueue.length > 0) {
      setTimeout(processQueue, 200);
    } else {
      isProcessingQueue = false;
    }
  }
}

/**
 * 同期実行の核心
 */
async function _performSync({ sheetId, saveFn, priority, forcePriority }) {
  isSyncing = true;
  try {
    const cloud = await readAllFromCloud(sheetId);
    const isCloudExists = cloud.transactions.length > 0 || cloud.categories.length > 0 || cloud.accounts.length > 0;

    // --- モード判定 ---
    let mode = 'merge';
    const isLocalFresh = localStorage.getItem('kakeibo_data') === null || state.transactions.length === 0;

    if (forcePriority) {
        // クラウドが空っぽ（新規作成直後など）の場合、'cloud'優先の指示があってもローカルの初期データをクラウドにアップロードする
        if (priority === 'cloud' && !isCloudExists) {
            mode = 'local-force';
        } else {
            mode = (priority === 'cloud') ? 'restore' : 'local-force';
        }
    } else if (isLocalFresh && isCloudExists) {
        mode = 'restore';
    }

    await auth.writeLog(sheetId, `[Sync Start] mode=${mode}, priority=${priority}, force=${forcePriority}`);

    let nextTx, nextCat, nextAcc, nextSc;

    if (mode === 'restore') {
        nextTx = cloud.transactions;
        nextCat = cloud.categories;
        nextAcc = cloud.accounts;
        nextSc = cloud.shortcuts;
    } else if (mode === 'local-force') {
        // ローカルを絶対正としてクラウドを上書き（マージしない）
        nextTx = [...state.transactions];
        nextCat = [...state.categories];
        nextAcc = [...state.accounts];
        nextSc = [...state.shortcuts];
    } else {
        // merge モード
        const deletedIds = state.deletedIds || [];
        nextTx = mergeData(state.transactions, cloud.transactions, deletedIds, 'local');
        nextCat = mergeData(state.categories, cloud.categories, deletedIds, 'local');
        nextAcc = mergeData(state.accounts, cloud.accounts, deletedIds, 'local');
        nextSc = mergeData(state.shortcuts || [], cloud.shortcuts || [], [], 'local');
    }

    // セーフティガードと自己修復（Auto-Healing）
    if (nextCat.length === 0) {
        console.warn('[SyncManager] Auto-healing missing categories');
        nextCat = [...DEFAULT_CATEGORIES];
    }
    if (nextAcc.length === 0) {
        console.warn('[SyncManager] Auto-healing missing accounts');
        nextAcc = [...DEFAULT_ACCOUNTS];
    }

    // 状態適用
    state.transactions = nextTx.map(tx => ({ ...tx, date: normalizeDate(tx.date) }));
    state.transactions = migrateTransactionIds(state.transactions, nextAcc, nextCat);
    state.categories = nextCat;
    state.accounts = nextAcc;
    state.shortcuts = nextSc;
    updateAccountBalances();

    // バッチ書き込み
    const txRows = state.transactions.map(t => [t.id, t.date, t.amount, t.type, t.category, t.fromAccount, t.memo, t.toAccount || '', t.categoryId || '', t.fromAccountId || '', t.toAccountId || '']);
    const catRows = state.categories.map(c => [c.id, c.name, c.icon, c.type, c.order, c.pinned ? 1 : 0]);
    const accRows = state.accounts.map(a => [a.id, a.name, a.icon, a.balance, a.initialBalance, a.order, a.pinned ? 1 : 0]);
    const scRows = (state.shortcuts || []).map(s => [s.id, s.name, s.type, s.amount, s.category, s.fromAccount, s.toAccount, s.order, s.categoryId || '', s.fromAccountId || '', s.toAccountId || '']);

    if (txRows.length === 0) txRows.push(['EMPTY']);
    if (catRows.length === 0) catRows.push(['EMPTY']);
    if (accRows.length === 0) accRows.push(['EMPTY']);
    if (scRows.length === 0) scRows.push(['EMPTY']);

    await auth.batchUpdateValues(sheetId, [
      { range: 'transactions!A1', values: txRows },
      { range: 'categories!A1', values: catRows },
      { range: 'accounts!A1', values: accRows },
      { range: 'shortcuts!A1', values: scRows },
      { range: 'settings!A1', values: [[JSON.stringify(state.settings)]] }
    ]);

    // 不要行のクリーンアップ
    const trailingClearRanges = [];
    if (cloud.transactions.length > txRows.length) trailingClearRanges.push(`transactions!A${txRows.length + 1}:K`);
    if (cloud.categories.length > catRows.length) trailingClearRanges.push(`categories!A${catRows.length + 1}:G`);
    if (cloud.accounts.length > accRows.length) trailingClearRanges.push(`accounts!A${accRows.length + 1}:G`);
    if (cloud.shortcuts.length > scRows.length) trailingClearRanges.push(`shortcuts!A${scRows.length + 1}:K`);

    if (trailingClearRanges.length > 0) {
      await auth.batchClear(sheetId, trailingClearRanges).catch(() => {});
    }

    await auth.writeLog(sheetId, `[Sync Success] txCount=${state.transactions.length}`);
    saveFn();
  } catch (e) {
    console.error('[SyncManager] _performSync Error:', e);
    await auth.writeLog(sheetId, `[Sync ERROR] ${e.message}`).catch(() => {});
    throw e; // processQueue 側でリトライ制御させるため throw する
  } finally {
    isSyncing = false;
  }
}
