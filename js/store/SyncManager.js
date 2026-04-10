/**
 * クラウド同期管理モジュール
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
    const p = (rows, fn) => (rows.length > 0 && rows[0][0] !== 'EMPTY') ? rows.map(fn) : [];
    return [
      p(t, r => ({ 
        id: r[0], date: normalizeDate(r[1]), amount: Number(r[2]), type: r[3], 
        category: r[4], fromAccount: r[5], memo: r[6] || '', toAccount: r[7] || '',
        categoryId: r[8] || '', fromAccountId: r[9] || '', toAccountId: r[10] || '' 
      })),
      p(c, r => ({ id: r[0], name: r[1], icon: r[2], type: r[3], order: Number(r[4] || 0), pinned: r[5] === '1' || r[5] === 1 })),
      p(a, r => ({ id: r[0], name: r[1], icon: r[2], balance: Number(r[3] || 0), initialBalance: Number(r[4] || 0), order: Number(r[5] || 0), pinned: r[6] === '1' || r[6] === 1 })),
      p(s, r => ({ 
        id: r[0], name: r[1], type: r[2], amount: Number(r[3] || 0), 
        category: r[4], fromAccount: r[5], toAccount: r[6], order: Number(r[7] || 0),
        categoryId: r[8] || '', fromAccountId: r[9] || '', toAccountId: r[10] || ''
      }))
    ];
  } catch (e) {
    console.error('Failed to read from cloud:', e);
    throw e; // 上位でキャッチして同期を中断させる
  }
}

export async function syncToCloudInternal(sheetId, saveFn) {
  if (!auth.isLoggedIn() || isSyncing) return;
  
  isSyncing = true;
  try {
    const [cloudTx, cloudCat, cloudAcc, cloudSc] = await readAllFromCloud(sheetId);
  state.transactions = mergeData(state.transactions, cloudTx, state.deletedIds, 'local');
  // 安全ガード: 万が一クラウドが空、またはパースに失敗した場合はマージをスキップする
  if (cloudCat.length === 0 && state.categories.length > 5) {
    console.warn('Cloud categories are empty. Skipping merge to prevent data loss.');
  } else {
    state.categories = mergeData(state.categories, cloudCat, state.deletedIds || [], 'local');
  }

  if (cloudAcc.length === 0 && state.accounts.length > 0) {
    console.warn('Cloud accounts are empty. Skipping merge to prevent data loss.');
  } else {
    state.accounts = mergeData(state.accounts, cloudAcc, state.deletedIds || [], 'local');
  }
  state.shortcuts = mergeData(state.shortcuts, cloudSc, [], 'local');
  
  state.transactions = state.transactions.map(tx => ({ ...tx, date: normalizeDate(tx.date) }));
  state.transactions = migrateTransactionIds(state.transactions, state.accounts, state.categories);
  
  updateAccountBalances();

  const txRows = state.transactions.map(t => [
    t.id, t.date, t.amount, t.type, t.category, t.fromAccount, t.memo, t.toAccount || '',
    t.categoryId || '', t.fromAccountId || '', t.toAccountId || ''
  ]);
  const catRows = state.categories.map(c => [c.id, c.name, c.icon, c.type, c.order, c.pinned ? 1 : 0]);
  const accRows = state.accounts.length > 0 ? state.accounts.map(a => [a.id, a.name, a.icon, a.balance, a.initialBalance, a.order, a.pinned ? 1 : 0]) : [['EMPTY']];
  const scRows = (state.shortcuts || []).map(s => [
    s.id, s.name, s.type, s.amount, s.category, s.fromAccount, s.toAccount, s.order,
    s.categoryId || '', s.fromAccountId || '', s.toAccountId || ''
  ]);

  await Promise.all([
    auth.clearRows(sheetId, 'transactions!A:K'),
    auth.clearRows(sheetId, 'categories!A:F'),
    auth.clearRows(sheetId, 'accounts!A:G'),
    auth.clearRows(sheetId, 'shortcuts!A:K')
  ]);

  await Promise.all([
    auth.writeRows(sheetId, 'transactions!A1', txRows.length ? txRows : [['EMPTY']]),
    auth.writeRows(sheetId, 'categories!A1', catRows.length ? catRows : [['EMPTY']]),
    auth.writeRows(sheetId, 'accounts!A1', accRows.length ? accRows : [['EMPTY']]),
    auth.writeRows(sheetId, 'shortcuts!A1', scRows.length ? scRows : [['EMPTY']]),
    auth.writeRows(sheetId, 'settings!A1', [[JSON.stringify(state.settings)]])
  ]);

  if (state.deletedIds.length > 50) state.deletedIds = state.deletedIds.slice(-20);
    saveFn();
  } finally {
    isSyncing = false;
  }
}
