// ============================================
// データ管理モジュール (v3.0 - 完全版・全機能復元)
// ============================================

import * as auth from './auth.js';

// --- 初期データ ---
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
  settings: {
    darkMode: 'auto',
    currency: 'JPY'
  }
};

// --- Core API ---

export function initStore() {
  const localData = localStorage.getItem('kakeibo_data');
  if (localData) {
    state = JSON.parse(localData);
    // Ensure all keys exist
    if (!state.shortcuts) state.shortcuts = [];
    if (!state.categories || state.categories.length === 0) state.categories = [...DEFAULT_CATEGORIES];
    if (!state.accounts || state.accounts.length === 0) state.accounts = [...DEFAULT_ACCOUNTS];
  } else {
    state.categories = [...DEFAULT_CATEGORIES];
    state.accounts = [...DEFAULT_ACCOUNTS];
    save();
  }
}

export async function save() {
  localStorage.setItem('kakeibo_data', JSON.stringify(state));
  if (auth.isLoggedIn()) {
    const sheetId = localStorage.getItem('kakeibo_sheet_id');
    if (sheetId) {
      try {
        await syncToCloud(sheetId);
      } catch (err) {
        console.warn('Auto-sync failed:', err);
      }
    }
  }
}

// --- Sync Functions ---

export async function syncToCloud(sheetId) {
  if (!auth.isLoggedIn()) return;
  const txRows = state.transactions.map(t => [t.id, t.date, t.amount, t.type, t.categoryId, t.accountId, t.memo, t.toAccountId || '']);
  const catRows = state.categories.map(c => [c.id, c.name, c.icon, c.type, c.order, c.pinned ? 1 : 0]);
  const accRows = state.accounts.map(a => [a.id, a.name, a.icon, a.balance, a.initialBalance, a.order, a.pinned ? 1 : 0]);
  const scRows = state.shortcuts.map(s => [s.id, s.name, s.type, s.amount, s.category, s.fromAccount, s.toAccount, s.order]);
  const setRows = [[JSON.stringify(state.settings)]];

  await auth.writeRows(sheetId, 'transactions!A1', txRows.length ? txRows : [['EMPTY']]);
  await auth.writeRows(sheetId, 'categories!A1', catRows.length ? catRows : [['EMPTY']]);
  await auth.writeRows(sheetId, 'accounts!A1', accRows.length ? accRows : [['EMPTY']]);
  await auth.writeRows(sheetId, 'shortcuts!A1', scRows.length ? scRows : [['EMPTY']]);
  await auth.writeRows(sheetId, 'settings!A1', setRows);
}

export async function loadFromCloud(sheetId) {
  if (!auth.isLoggedIn()) return;
  try {
    const [txRows, catRows, accRows, scRows, setRows] = await Promise.all([
      auth.readRows(sheetId, 'transactions!A:H'),
      auth.readRows(sheetId, 'categories!A:F'),
      auth.readRows(sheetId, 'accounts!A:G'),
      auth.readRows(sheetId, 'shortcuts!A:H'),
      auth.readRows(sheetId, 'settings!A1')
    ]);

    if (txRows.length > 0 && txRows[0][0] !== 'EMPTY') {
      state.transactions = txRows.map(r => ({ id: r[0], date: r[1], amount: Number(r[2]), type: r[3], categoryId: r[4], accountId: r[5], memo: r[6] || '', toAccountId: r[7] || '' }));
    }
    if (catRows.length > 0 && catRows[0][0] !== 'EMPTY') {
      state.categories = catRows.map(r => ({ id: r[0], name: r[1], icon: r[2], type: r[3], order: Number(r[4]), pinned: r[5] === '1' }));
    }
    if (accRows.length > 0 && accRows[0][0] !== 'EMPTY') {
      state.accounts = accRows.map(r => ({ id: r[0], name: r[1], icon: r[2], balance: Number(r[3]), initialBalance: Number(r[4] || 0), order: Number(r[5] || 0), pinned: r[6] === '1' }));
    }
    if (scRows.length > 0 && scRows[0][0] !== 'EMPTY') {
      state.shortcuts = scRows.map(r => ({ id: r[0], name: r[1], type: r[2], amount: Number(r[3]), category: r[4], fromAccount: r[5], toAccount: r[6], order: Number(r[7]) }));
    }
    if (setRows.length > 0) {
      state.settings = JSON.parse(setRows[0][0]);
    }
    localStorage.setItem('kakeibo_data', JSON.stringify(state));
    return true;
  } catch (err) {
    console.error('Cloud load failed:', err);
    return false;
  }
}

// --- Getters ---
export const getTransactions = () => state.transactions;
export const getCategories = () => state.categories;
export const getAccounts = () => state.accounts;
export const getShortcuts = () => state.shortcuts || [];
export const getSettings = () => state.settings;

export function getTotalBalance() {
  return state.accounts.reduce((sum, acc) => sum + (acc.balance || 0), 0);
}

export function getAccountBalance(id) {
  const acc = state.accounts.find(a => a.id === id);
  return acc ? acc.balance : 0;
}

// ダッシュボード用の資産推移データ
export function getAssetHistory(days = 90) {
  const history = [];
  const now = new Date();
  
  // 開始日から今日までの毎日の残高を計算
  for (let i = 0; i <= days; i++) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    
    let dailyBalance = getTotalBalance();
    state.transactions.forEach(tx => {
      if (tx.date > dateStr) {
        if (tx.type === 'income') dailyBalance -= tx.amount;
        if (tx.type === 'expense') dailyBalance += tx.amount;
        if (tx.type === 'transfer') { /* 振替は総資産に影響しない */ }
      }
    });

    history.unshift({ date: dateStr, total: dailyBalance });
  }
  return history;
}

// --- Setters (Transactions) ---
export function addTransaction(tx) {
  const id = 'tx_' + Date.now();
  state.transactions.unshift({ ...tx, id });
  updateAccountBalances();
  save();
}

export function updateTransaction(id, data) {
  const idx = state.transactions.findIndex(t => t.id === id);
  if (idx !== -1) {
    state.transactions[idx] = { ...state.transactions[idx], ...data };
    updateAccountBalances();
    save();
  }
}

export function deleteTransaction(id) {
  state.transactions = state.transactions.filter(t => t.id !== id);
  updateAccountBalances();
  save();
}

function updateAccountBalances() {
  // 全口座の残高を初期残高でリセット
  state.accounts.forEach(acc => {
    acc.balance = acc.initialBalance || 0;
  });

  // 取引を古い順に適用
  [...state.transactions].reverse().forEach(tx => {
    if (tx.type === 'income') {
      const acc = state.accounts.find(a => a.name === tx.accountId || a.id === tx.accountId);
      if (acc) acc.balance += tx.amount;
    } else if (tx.type === 'expense') {
      const acc = state.accounts.find(a => a.name === tx.accountId || a.id === tx.accountId);
      if (acc) acc.balance -= tx.amount;
    } else if (tx.type === 'transfer') {
      const fromAcc = state.accounts.find(a => a.name === tx.accountId || a.id === tx.accountId);
      const toAcc = state.accounts.find(a => a.name === tx.toAccountId || a.id === tx.toAccountId);
      if (fromAcc) fromAcc.balance -= tx.amount;
      if (toAcc) toAcc.balance += tx.amount;
    }
  });
}

// --- Setters (Categories) ---
export function addCategory(cat) {
  const id = 'cat_' + Date.now();
  state.categories.push({ ...cat, id });
  save();
}
export function updateCategory(id, data) {
  const idx = state.categories.findIndex(c => c.id === id);
  if (idx !== -1) {
    state.categories[idx] = { ...state.categories[idx], ...data };
    save();
  }
}
export function deleteCategory(id) {
  state.categories = state.categories.filter(c => c.id !== id);
  save();
}
export function reorderCategories(ids) {
  const newCats = ids.map((id, index) => {
    const cat = state.categories.find(c => c.id === id);
    return { ...cat, order: index + 1 };
  });
  state.categories = newCats;
  save();
}

// --- Setters (Accounts) ---
export function addAccount(acc) {
  const id = 'acc_' + Date.now();
  state.accounts.push({ ...acc, id, balance: acc.initialBalance || 0 });
  updateAccountBalances();
  save();
}
export function updateAccount(id, data) {
  const idx = state.accounts.findIndex(a => a.id === id);
  if (idx !== -1) {
    state.accounts[idx] = { ...state.accounts[idx], ...data };
    updateAccountBalances();
    save();
  }
}
export function deleteAccount(id) {
  state.accounts = state.accounts.filter(a => a.id !== id);
  save();
}
export function reorderAccounts(ids) {
  const newAccs = ids.map((id, index) => {
    const acc = state.accounts.find(a => a.id === id);
    return { ...acc, order: index + 1 };
  });
  state.accounts = newAccs;
  save();
}

// --- Setters (Shortcuts) ---
export function addShortcut(sc) {
  const id = 'sc_' + Date.now();
  state.shortcuts.push({ ...sc, id });
  save();
}
export function updateShortcut(id, data) {
  const idx = state.shortcuts.findIndex(s => s.id === id);
  if (idx !== -1) {
    state.shortcuts[idx] = { ...state.shortcuts[idx], ...data };
    save();
  }
}
export function deleteShortcut(id) {
  state.shortcuts = state.shortcuts.filter(s => s.id !== id);
  save();
}

// --- Data Import/Export ---
export function exportAllData() { return state; }
export function importAllData(data) { state = data; save(); }
export function clearAllData() {
  state = { transactions: [], categories: [...DEFAULT_CATEGORIES], accounts: [...DEFAULT_ACCOUNTS], shortcuts: [], settings: state.settings };
  save();
}

export function updateSettings(newSettings) {
  state.settings = { ...state.settings, ...newSettings };
  save();
}
