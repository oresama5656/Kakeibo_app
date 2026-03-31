// ============================================
// データ管理モジュール (v3.7 - 安全な並べ替え対応)
// ============================================

import * as auth from './auth.js';

const DEFAULT_CATEGORIES = [
  { id: 'cat_01', name: '食費', icon: '🍎', type: 'expense', order: 1 },
  { id: 'cat_02', name: '日用品', icon: '🧻', type: 'expense', order: 2 },
  { id: 'cat_03', name: '交通費', icon: '🚃', type: 'expense', order: 3 },
  { id: 'cat_04', name: '交際費', icon: '🍻', type: 'expense', order: 4 },
  { id: 'cat_05', name: '居住費', icon: '🏠', type: 'expense', order: 5 },
  { id: 'cat_06', name: '娯楽', icon: '🎮', type: 'expense', order: 6 },
  { id: 'cat_07', name: '給与', icon: '💰', type: 'income', order: 7 },
  { id: 'cat_08', name: '他収入', icon: '🧧', type: 'income', order: 8 }
];

const DEFAULT_ACCOUNTS = [
  { id: 'acc_01', name: '現金', icon: '💵', balance: 0, initialBalance: 0, order: 1 },
  { id: 'acc_02', name: '銀行A', icon: '🏦', balance: 0, initialBalance: 0, order: 2 },
  { id: 'acc_03', name: 'クレカ', icon: '💳', balance: 0, initialBalance: 0, order: 3 }
];

let state = {
  transactions: [],
  categories: [],
  accounts: [],
  shortcuts: [],
  deletedIds: [],
  settings: { darkMode: 'auto' }
};

let isCloudSyncReady = false;

// --- Core API ---

export function initStore() {
  const localData = localStorage.getItem('kakeibo_data');
  if (localData) {
    state = JSON.parse(localData);
    if (!state.shortcuts) state.shortcuts = [];
    if (!state.deletedIds) state.deletedIds = [];
    if (!state.categories || state.categories.length === 0) state.categories = [...DEFAULT_CATEGORIES];
    if (!state.accounts || state.accounts.length === 0) state.accounts = [...DEFAULT_ACCOUNTS];
  } else {
    state.categories = [...DEFAULT_CATEGORIES];
    state.accounts = [...DEFAULT_ACCOUNTS];
    state.deletedIds = [];
  }
}

export async function save() {
  localStorage.setItem('kakeibo_data', JSON.stringify(state));
  if (auth.isLoggedIn()) {
    const sheetId = localStorage.getItem('kakeibo_sheet_id');
    if (sheetId && isCloudSyncReady) {
      try { await syncToCloud(sheetId); } catch (e) { console.warn('Sync deferred'); }
    }
  }
}

// --- Getters ---
export const getTransactions = () => state.transactions;
export const getCategories = () => state.categories;
export const getAccounts = () => state.accounts;
export const getSettings = () => state.settings;
export const getShortcuts = () => state.shortcuts || [];

export function getTotalBalance() {
  return state.accounts.reduce((sum, acc) => sum + (Number(acc.balance) || 0), 0);
}

export function getAccountBalance(id) {
  const acc = state.accounts.find(a => a.id === id);
  return acc ? (Number(acc.balance) || 0) : 0;
}

// --- Sync Logic ---

function mergeData(local, cloud, deletedIds = []) {
  const map = new Map();
  const delSet = new Set(deletedIds);
  cloud.forEach(item => { if (item?.id && !delSet.has(item.id)) map.set(item.id, item); });
  local.forEach(item => { if (item?.id) map.set(item.id, item); });
  return Array.from(map.values());
}

export async function syncToCloud(sheetId, options = { merge: true }) {
  if (!auth.isLoggedIn()) return;
  if (options.merge) {
    const [cloudTx, cloudCat, cloudAcc, cloudSc] = await readAllFromCloud(sheetId);
    state.transactions = mergeData(state.transactions, cloudTx, state.deletedIds);
    state.categories = mergeData(state.categories, cloudCat);
    state.accounts = mergeData(state.accounts, cloudAcc);
    state.shortcuts = mergeData(state.shortcuts, cloudSc);
    updateAccountBalances();
  }
  const txRows = state.transactions.map(t => [t.id, t.date, t.amount, t.type, t.category, t.fromAccount, t.memo, t.toAccount || '']);
  const catRows = state.categories.map(c => [c.id, c.name, c.icon, c.type, c.order, c.pinned ? 1 : 0]);
  const accRows = state.accounts.map(a => [a.id, a.name, a.icon, a.balance, a.initialBalance, a.order, a.pinned ? 1 : 0]);
  const scRows = (state.shortcuts || []).map(s => [s.id, s.name, s.type, s.amount, s.category, s.fromAccount, s.toAccount, s.order]);

  await auth.clearRows(sheetId, 'transactions!A:H');
  await auth.clearRows(sheetId, 'categories!A:F');
  await auth.clearRows(sheetId, 'accounts!A:G');
  await auth.clearRows(sheetId, 'shortcuts!A:H');

  await auth.writeRows(sheetId, 'transactions!A1', txRows.length ? txRows : [['EMPTY']]);
  await auth.writeRows(sheetId, 'categories!A1', catRows.length ? catRows : [['EMPTY']]);
  await auth.writeRows(sheetId, 'accounts!A1', accRows.length ? accRows : [['EMPTY']]);
  await auth.writeRows(sheetId, 'shortcuts!A1', scRows.length ? scRows : [['EMPTY']]);
  await auth.writeRows(sheetId, 'settings!A1', [[JSON.stringify(state.settings)]]);

  if (state.deletedIds.length > 50) state.deletedIds = state.deletedIds.slice(-20);
  localStorage.setItem('kakeibo_data', JSON.stringify(state));
}

async function readAllFromCloud(sheetId) {
  const [t, c, a, s] = await Promise.all([
    auth.readRows(sheetId, 'transactions!A:H'),
    auth.readRows(sheetId, 'categories!A:F'),
    auth.readRows(sheetId, 'accounts!A:G'),
    auth.readRows(sheetId, 'shortcuts!A:H')
  ]);
  const p = (rows, fn) => (rows.length > 0 && rows[0][0] !== 'EMPTY') ? rows.map(fn) : [];
  return [
    p(t, r => ({ id: r[0], date: r[1], amount: Number(r[2]), type: r[3], category: r[4], fromAccount: r[5], memo: r[6] || '', toAccount: r[7] || '' })),
    p(c, r => ({ id: r[0], name: r[1], icon: r[2], type: r[3], order: Number(r[4] || 0) })),
    p(a, r => ({ id: r[0], name: r[1], icon: r[2], balance: Number(r[3] || 0), initialBalance: Number(r[4] || 0), order: Number(r[5] || 0) })),
    p(s, r => ({ id: r[0], name: r[1], type: r[2], amount: Number(r[3] || 0), category: r[4], fromAccount: r[5], toAccount: r[6], order: Number(r[7] || 0) }))
  ];
}

export async function loadFromCloud(sheetId) {
  const [tx, cat, acc, sc] = await readAllFromCloud(sheetId);
  state.transactions = mergeData(state.transactions, tx, state.deletedIds);
  state.categories = mergeData(state.categories, cat);
  state.accounts = mergeData(state.accounts, acc);
  state.shortcuts = mergeData(state.shortcuts, sc);
  updateAccountBalances();
  isCloudSyncReady = true;
  save();
}

export function setCloudSyncReady(r) { isCloudSyncReady = r; }

export function updateAccountBalances() {
  state.accounts.forEach(a => a.balance = Number(a.initialBalance || 0));
  const f = (n) => state.accounts.find(a => a.name === n || a.id === n);
  [...state.transactions].reverse().forEach(tx => {
    const val = Number(tx.amount) || 0;
    if (tx.type === 'income') { const a = f(tx.toAccount); if (a) a.balance += val; }
    else if (tx.type === 'expense') { const a = f(tx.fromAccount); if (a) a.balance -= val; }
    else if (tx.type === 'transfer') { 
      const from = f(tx.fromAccount), to = f(tx.toAccount);
      if (from) from.balance -= val; if (to) to.balance += val;
    }
  });
}

// --- Setters ---
export function addTransaction(tx) {
  tx.id = 'tx_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);
  state.transactions.unshift(tx);
  updateAccountBalances();
  save();
}
export function deleteTransaction(id) {
  if (!id) return;
  if (!state.deletedIds.includes(id)) state.deletedIds.push(id);
  state.transactions = state.transactions.filter(t => t.id !== id);
  updateAccountBalances();
  save();
}
export function addAccount(a) { a.id = 'acc_' + Date.now(); state.accounts.push(a); updateAccountBalances(); save(); }
export function updateAccount(id, d) { const i = state.accounts.findIndex(a => a.id === id); if (i !== -1) { state.accounts[i] = { ...state.accounts[i], ...d }; updateAccountBalances(); save(); } }
export function deleteAccount(id) { state.accounts = state.accounts.filter(a => a.id !== id); save(); }
export function reorderAccounts(ids) {
  // 安全な並べ替え: 指定されたIDセットだけを現在の順番で上書きし、他は維持
  const newOrderMap = new Map(ids.map((id, index) => [id, index + 1]));
  state.accounts.forEach(acc => {
    if (newOrderMap.has(acc.id)) {
      acc.order = newOrderMap.get(acc.id);
    }
  });
  save();
}
export function addCategory(c) { c.id = 'cat_' + Date.now(); state.categories.push(c); save(); }
export function updateCategory(id, d) { const i = state.categories.findIndex(c => c.id === id); if (i !== -1) { state.categories[i] = { ...state.categories[i], ...d }; save(); } }
export function deleteCategory(id) { state.categories = state.categories.filter(c => c.id !== id); save(); }
export function reorderCategories(ids) {
  // 安全な並べ替え: 他のタイプのカテゴリーを消さないように
  const newOrderMap = new Map(ids.map((id, index) => [id, index + 1]));
  state.categories.forEach(cat => {
    if (newOrderMap.has(cat.id)) {
      cat.order = newOrderMap.get(cat.id);
    }
  });
  save();
}
export function updateSettings(s) { state.settings = { ...state.settings, ...s }; save(); }
export function clearAllData() { state.transactions = []; state.deletedIds = []; updateAccountBalances(); save(); }
export function importAllData(d) { state = d; save(); }
export function exportAllData() { return state; }

// --- Analysis Getters ---
export function getAssetHistory(days = 30) {
  const history = [];
  const now = new Date();
  const totalRaw = getTotalBalance();
  for (let i = 0; i <= days; i++) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
    const dStr = d.toISOString().split('T')[0];
    let bal = totalRaw;
    state.transactions.forEach(tx => {
      if (tx.date > dStr) {
        if (tx.type === 'income') bal -= tx.amount;
        else if (tx.type === 'expense') bal += tx.amount;
      }
    });
    history.unshift({ date: dStr, total: bal });
  }
  return history;
}

export function getAccountHistory(accountName, days = 30) {
  const history = [];
  const now = new Date();
  const accObj = state.accounts.find(a => a.name === accountName);
  const currentAccBal = accObj?.balance || 0;
  for (let i = 0; i <= days; i++) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
    const dStr = d.toISOString().split('T')[0];
    let bal = currentAccBal;
    state.transactions.forEach(tx => {
      if (tx.date > dStr) {
        if (tx.type === 'income' && tx.toAccount === accountName) bal -= tx.amount;
        else if (tx.type === 'expense' && tx.fromAccount === accountName) bal += tx.amount;
        else if (tx.type === 'transfer') {
          if (tx.fromAccount === accountName) bal += tx.amount;
          if (tx.toAccount === accountName) bal -= tx.amount;
        }
      }
    });
    history.unshift({ date: dStr, balance: bal });
  }
  return history;
}
