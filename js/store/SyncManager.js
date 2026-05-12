/**
 * クラウド同期管理モジュール (v7.0 - Audit-Logged Sync)
 */
import * as auth from '../auth.js';
import { state, normalizeDate, migrateTransactionIds, setState } from './BaseStore.js';
import { updateAccountBalances } from './AccountStore.js';

let isCloudSyncReady = false;
let isSyncBlocked = false;
let isSyncing = false;

export function blockSync() { isSyncBlocked = true; }
export function isSyncBlockedNow() { return isSyncBlocked; }
export function setCloudSyncReady(r) { isCloudSyncReady = r; }
export function getCloudSyncReady() { return isCloudSyncReady; }
export function isSyncInProgress() { return isSyncing; }

function mergeData(local, cloud, deletedIds = [], priority = 'local') {
  const map = new Map();
  const delSet = new Set(deletedIds);
  if (priority === 'local') {
    cloud.forEach(item => { if (item?.id && !delSet.has(item.id)) map.set(item.id, item); });
    local.forEach(item => { if (item?.id) map.set(item.id, item); });
  } else {
    local.forEach(item => { if (item?.id) map.set(item.id, item); });
    cloud.forEach(item => { if (item?.id && !delSet.has(item.id)) map.set(item.id, item); });
  }
  return Array.from(map.values());
}

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
        id: r[0], name: r[1], type: r[2], amount: Number(r[3] || 0), 
        category: r[4], fromAccount: r[5], toAccount: r[6], order: Number(r[7] || 0),
        categoryId: r[8] || '', fromAccountId: r[9] || '', toAccountId: r[10] || ''
      }))
    };
  } catch (e) {
    console.error('[Sync] Read failed:', e);
    throw e;
  }
}

export async function syncToCloudInternal(sheetId, saveFn, priority = 'local') {
  if (!auth.isLoggedIn() || isSyncing) return;
  isSyncing = true;
  
  try {
    const cloud = await readAllFromCloud(sheetId);
    
    // --- 1. インテリジェント判定 & ログ ---
    const isLocalFresh = !localStorage.getItem('kakeibo_data') || state.transactions.length === 0;
    const isCloudExists = cloud.transactions.length > 0 || cloud.categories.length > 0 || cloud.accounts.length > 0;
    
    let mode = priority;
    if (isLocalFresh && isCloudExists) mode = 'cloud';
    
    await auth.writeLog(sheetId, `[Sync Start] mode=${mode}, cloudCount(tx=${cloud.transactions.length}, cat=${cloud.categories.length})`);

    // --- 2. データ生成 ---
    let nextTx, nextCat, nextAcc, nextSc;

    if (mode === 'cloud') {
      // 完全復元モード (クラウドを絶対正とする)
      nextTx = [...cloud.transactions];
      nextCat = [...cloud.categories];
      nextAcc = [...cloud.accounts];
      nextSc = [...cloud.shortcuts];
    } else {
      // マージモード
      nextTx = mergeData(state.transactions, cloud.transactions, state.deletedIds, mode);
      nextCat = mergeData(state.categories, cloud.categories, state.deletedIds || [], mode);
      nextAcc = mergeData(state.accounts, cloud.accounts, state.deletedIds || [], mode);
      nextSc = mergeData(state.shortcuts, cloud.shortcuts, [], mode);
    }

    // 異常検知ガード
    if (isCloudExists && nextCat.length === 0) {
        throw new Error('Merge resulted in zero categories despite cloud having data. Aborting to save data.');
    }

    // --- 3. 状態適用 ---
    state.transactions = nextTx.map(tx => ({ ...tx, date: normalizeDate(tx.date) }));
    state.transactions = migrateTransactionIds(state.transactions, nextAcc, nextCat);
    state.categories = nextCat;
    state.accounts = nextAcc;
    state.shortcuts = nextSc;
    updateAccountBalances();

    // --- 4. バッチ書き込み (Write-then-Cleanup パターン) ---
    // ✅ 先に書いてから余った行を消す。書き込み失敗時にクラウドが空になるリスクを排除。
    const txRows = state.transactions.map(t => [t.id, t.date, t.amount, t.type, t.category, t.fromAccount, t.memo, t.toAccount || '', t.categoryId || '', t.fromAccountId || '', t.toAccountId || '']);
    const catRows = state.categories.map(c => [c.id, c.name, c.icon, c.type, c.order, c.pinned ? 1 : 0]);
    const accRows = state.accounts.map(a => [a.id, a.name, a.icon, a.balance, a.initialBalance, a.order, a.pinned ? 1 : 0]);
    const scRows = (state.shortcuts || []).map(s => [s.id, s.name, s.type, s.amount, s.category, s.fromAccount, s.toAccount, s.order, s.categoryId || '', s.fromAccountId || '', s.toAccountId || '']);

    if (txRows.length === 0) txRows.push(['EMPTY']);
    if (catRows.length === 0) catRows.push(['EMPTY']);
    if (accRows.length === 0) accRows.push(['EMPTY']);
    if (scRows.length === 0) scRows.push(['EMPTY']);

    // STEP 1: 新しいデータを書き込む（既存行を上書き）
    // ここが失敗しても、クラウドには旧データが残る（安全）
    await auth.batchUpdateValues(sheetId, [
      { range: 'transactions!A1', values: txRows },
      { range: 'categories!A1', values: catRows },
      { range: 'accounts!A1', values: accRows },
      { range: 'shortcuts!A1', values: scRows },
      { range: 'settings!A1', values: [[JSON.stringify(state.settings)]] }
    ]);

    // STEP 2: 旧データの余った行をクリア（新データより多い行が残る場合のみ）
    // ここが失敗しても、余分な行が残るだけでデータ消失は起きない（軽微）
    const trailingClearRanges = [];
    if (cloud.transactions.length > txRows.length)
      trailingClearRanges.push(`transactions!A${txRows.length + 1}:K`);
    if (cloud.categories.length > catRows.length)
      trailingClearRanges.push(`categories!A${catRows.length + 1}:G`);
    if (cloud.accounts.length > accRows.length)
      trailingClearRanges.push(`accounts!A${accRows.length + 1}:G`);
    if (cloud.shortcuts.length > scRows.length)
      trailingClearRanges.push(`shortcuts!A${scRows.length + 1}:K`);

    if (trailingClearRanges.length > 0) {
      await auth.batchClear(sheetId, trailingClearRanges).catch(e => {
        console.warn('[Sync] Trailing row cleanup failed (non-critical):', e);
      });
    }

    await auth.writeLog(sheetId, `[Sync Success] Final count(tx=${state.transactions.length}, cat=${state.categories.length})`);
    
    if (state.deletedIds.length > 50) state.deletedIds = state.deletedIds.slice(-20);
    // saveFn は localStorage.setItem のみを行うこと。save() を再帰的に渡すと無限ループになる。
    saveFn();
  } catch (e) {
    console.error('[Sync] Critical Error:', e);
    await auth.writeLog(sheetId, `[Sync ERROR] ${e.message}`).catch(() => {});
    window.showToast?.('同期中にエラーが発生しました。', 'error');
    throw e;
  } finally {
    isSyncing = false;
  }
}
