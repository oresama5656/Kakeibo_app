// ============================================
// データ管理モジュール (v2.5 - クラウド対応)
// ============================================

import * as auth from './auth.js';

// --- 初期データ ---
const DEFAULT_CATEGORIES = [
  { id: 'cat_01', name: '食費', icon: '🍎', type: 'expense' },
  { id: 'cat_02', name: '日用品', icon: '🧻', type: 'expense' },
  { id: 'cat_03', name: '交通費', icon: '🚃', type: 'expense' },
  { id: 'cat_04', name: '交際費', icon: '🍻', type: 'expense' },
  { id: 'cat_05', name: '居住費', icon: '🏠', type: 'expense' },
  { id: 'cat_06', name: '娯楽', icon: '🎮', type: 'expense' },
  { id: 'cat_07', name: '給与', icon: '💰', type: 'income' },
  { id: 'cat_08', name: '他収入', icon: '🧧', type: 'income' }
];

const DEFAULT_ACCOUNTS = [
  { id: 'acc_01', name: '現金', icon: '💵', balance: 0 },
  { id: 'acc_02', name: '銀行A', icon: '🏦', balance: 0 },
  { id: 'acc_03', name: 'クレカ', icon: '💳', balance: 0 }
];

let state = {
  transactions: [],
  categories: [],
  accounts: [],
  shortcuts: [],
  settings: {
    darkMode: 'auto',
    currency: 'JPY',
    sheetId: null
  }
};

// --- Core API ---

export function initStore() {
  const localData = localStorage.getItem('kakeibo_data');
  if (localData) {
    state = JSON.parse(localData);
  } else {
    state.categories = [...DEFAULT_CATEGORIES];
    state.accounts = [...DEFAULT_ACCOUNTS];
    save();
  }
}

// データを保存 (Local + Cloud)
export async function save() {
  localStorage.setItem('kakeibo_data', JSON.stringify(state));
  
  // クラウド同期 (ログイン中の場合)
  if (auth.isLoggedIn()) {
    const sheetId = localStorage.getItem('kakeibo_sheet_id');
    if (sheetId) {
      try {
        console.log('Auto-syncing to cloud...');
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

  // 各データを配列形式に変換 (スプレッドシートの1行分が1配列)
  const txRows = state.transactions.map(t => [t.id, t.date, t.amount, t.type, t.categoryId, t.accountId, t.memo]);
  const catRows = state.categories.map(c => [c.id, c.name, c.icon, c.type]);
  const accRows = state.accounts.map(a => [a.id, a.name, a.icon, a.balance]);
  const setRows = [[JSON.stringify(state.settings)]];

  // シートごとに一括更新
  await auth.writeRows(sheetId, 'transactions!A1', txRows.length ? txRows : [['EMPTY']]);
  await auth.writeRows(sheetId, 'categories!A1', catRows.length ? catRows : [['EMPTY']]);
  await auth.writeRows(sheetId, 'accounts!A1', accRows.length ? accRows : [['EMPTY']]);
  await auth.writeRows(sheetId, 'settings!A1', setRows);
}

export async function loadFromCloud(sheetId) {
  if (!auth.isLoggedIn()) return;

  try {
    const [txRows, catRows, accRows, setRows] = await Promise.all([
      auth.readRows(sheetId, 'transactions!A:G'),
      auth.readRows(sheetId, 'categories!A:D'),
      auth.readRows(sheetId, 'accounts!A:D'),
      auth.readRows(sheetId, 'settings!A1')
    ]);

    if (txRows.length > 0 && txRows[0][0] !== 'EMPTY') {
      state.transactions = txRows.map(r => ({ id: r[0], date: r[1], amount: Number(r[2]), type: r[3], categoryId: r[4], accountId: r[5], memo: r[6] || '' }));
    }
    if (catRows.length > 0 && catRows[0][0] !== 'EMPTY') {
      state.categories = catRows.map(r => ({ id: r[0], name: r[1], icon: r[2], type: r[3] }));
    }
    if (accRows.length > 0 && accRows[0][0] !== 'EMPTY') {
      state.accounts = accRows.map(r => ({ id: r[0], name: r[1], icon: r[2], balance: Number(r[3]) }));
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
export const getSettings = () => state.settings;

// --- Setters ---
export function addTransaction(tx) {
  const id = 'tx_' + Date.now();
  state.transactions.unshift({ ...tx, id });
  save();
}

export function deleteTransaction(id) {
  state.transactions = state.transactions.filter(t => t.id !== id);
  save();
}

export function updateCategories(newCategories) {
  state.categories = newCategories;
  save();
}

export function updateAccounts(newAccounts) {
  state.accounts = newAccounts;
  save();
}

export function updateSettings(newSettings) {
  state.settings = { ...state.settings, ...newSettings };
  save();
}
