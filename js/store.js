// ============================================
// データ管理モジュール (v3.5 - 確実な削除・マージ対応)
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
  deletedIds: [], // 削除された取引IDを管理
  settings: { darkMode: 'auto', currency: 'JPY' }
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
      try {
        await syncToCloud(sheetId);
      } catch (err) {
        console.warn('Auto-sync deferred:', err.message);
      }
    }
  }
}

// --- Sync Functions (マージロジック改修) ---

/**
 * IDベースでデータを統合する
 * @param {Array} local - ローカル配列
 * @param {Array} cloud - クラウド配列
 * @param {Array} deletedIds - 削除済みIDのリスト
 */
function mergeData(local, cloud, deletedIds = []) {
  const mergedMap = new Map();
  const delSet = new Set(deletedIds);

  // 1. クラウドのデータを入れる（ただし削除済みリストにあるものは無視）
  cloud.forEach(item => {
    if (item && item.id && !delSet.has(item.id)) {
      mergedMap.set(item.id, item);
    }
  });

  // 2. ローカルのデータで上書き（ローカルにあるものが常に最新）
  local.forEach(item => {
    if (item && item.id) {
      mergedMap.set(item.id, item);
    }
  });

  return Array.from(mergedMap.values());
}

export async function syncToCloud(sheetId, options = { merge: true }) {
  if (!auth.isLoggedIn()) throw new Error('Not logged in');

  try {
    // 1. PUSH前に最新を取得してマージ
    if (options.merge) {
      const [cloudTx, cloudCat, cloudAcc, cloudSc] = await readAllFromCloud(sheetId);
      state.transactions = mergeData(state.transactions, cloudTx, state.deletedIds);
      state.categories = mergeData(state.categories, cloudCat);
      state.accounts = mergeData(state.accounts, cloudAcc);
      state.shortcuts = mergeData(state.shortcuts, cloudSc);
      updateAccountBalances();
    }

    // 2. クラウドへ書き込み
    const txRows = state.transactions.map(t => [t.id, t.date, t.amount, t.type, t.category, t.fromAccount, t.memo, t.toAccount || '']);
    const catRows = state.categories.map(c => [c.id, c.name, c.icon, c.type, c.order, c.pinned ? 1 : 0]);
    const accRows = state.accounts.map(a => [a.id, a.name, a.icon, a.balance, a.initialBalance, a.order, a.pinned ? 1 : 0]);
    const scRows = state.shortcuts.map(s => [s.id, s.name, s.type, s.amount, s.category, s.fromAccount, s.toAccount, s.order]);
    
    // クリアしてから書き込み
    await auth.clearRows(sheetId, 'transactions!A:H');
    await auth.clearRows(sheetId, 'categories!A:F');
    await auth.clearRows(sheetId, 'accounts!A:G');
    await auth.clearRows(sheetId, 'shortcuts!A:H');

    await auth.writeRows(sheetId, 'transactions!A1', txRows.length ? txRows : [['EMPTY']]);
    await auth.writeRows(sheetId, 'categories!A1', catRows.length ? catRows : [['EMPTY']]);
    await auth.writeRows(sheetId, 'accounts!A1', accRows.length ? accRows : [['EMPTY']]);
    await auth.writeRows(sheetId, 'shortcuts!A1', scRows.length ? scRows : [['EMPTY']]);
    await auth.writeRows(sheetId, 'settings!A1', [[JSON.stringify(state.settings)]]);

    // 同期成功後、ゴミ箱を一旦整理（クラウドから消えたならもう追跡不要）
    // 簡易的に、直近の削除だけ追跡できれば良いためリセット気味にする
    if (state.deletedIds.length > 50) state.deletedIds = state.deletedIds.slice(-20);

    localStorage.setItem('kakeibo_data', JSON.stringify(state));
    console.log('--- Cloud Sync Successful ---');
  } catch (err) {
    console.error('Sync failed:', err);
    throw err;
  }
}

async function readAllFromCloud(sheetId) {
  const [txRows, catRows, accRows, scRows] = await Promise.all([
    auth.readRows(sheetId, 'transactions!A:H'),
    auth.readRows(sheetId, 'categories!A:F'),
    auth.readRows(sheetId, 'accounts!A:G'),
    auth.readRows(sheetId, 'shortcuts!A:H')
  ]);
  const parseRows = (rows, mapper) => (rows.length > 0 && rows[0][0] !== 'EMPTY') ? rows.map(mapper) : [];
  return [
    parseRows(txRows, r => ({ id: r[0], date: r[1], amount: Number(r[2]), type: r[3], category: r[4], fromAccount: r[5], memo: r[6] || '', toAccount: r[7] || '' })),
    parseRows(catRows, r => ({ id: r[0], name: r[1], icon: r[2], type: r[3], order: Number(r[4] || 0), pinned: r[5] === '1' })),
    parseRows(accRows, r => ({ id: r[0], name: r[1], icon: r[2], balance: Number(r[3] || 0), initialBalance: Number(r[4] || 0), order: Number(r[5] || 0), pinned: r[6] === '1' })),
    parseRows(scRows, r => ({ id: r[0], name: r[1], type: r[2], amount: Number(r[3] || 0), category: r[4], fromAccount: r[5], toAccount: r[6], order: Number(r[7] || 0) }))
  ];
}

export async function loadFromCloud(sheetId) {
  try {
    const [cloudTx, cloudCat, cloudAcc, cloudSc] = await readAllFromCloud(sheetId);
    state.transactions = mergeData(state.transactions, cloudTx, state.deletedIds);
    state.categories = mergeData(state.categories, cloudCat);
    state.accounts = mergeData(state.accounts, cloudAcc);
    state.shortcuts = mergeData(state.shortcuts, cloudSc);
    
    const setRows = await auth.readRows(sheetId, 'settings!A1');
    if (setRows.length > 0 && setRows[0][0]) {
      try { state.settings = JSON.parse(setRows[0][0]); } catch (e) {}
    }
    
    updateAccountBalances();
    isCloudSyncReady = true;
    save();
    return true;
  } catch (err) {
    console.error('loadFromCloud error:', err);
    throw err;
  }
}

export function setCloudSyncReady(ready = true) { isCloudSyncReady = ready; }
export const getTransactions = () => state.transactions;
export const getCategories = () => state.categories;
export const getAccounts = () => state.accounts;
export const getSettings = () => state.settings;
export const getTotalBalance = () => state.accounts.reduce((sum, acc) => sum + (Number(acc.balance) || 0), 0);

// --- Setters ---

export function addTransaction(tx) {
  const id = 'tx_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);
  state.transactions.unshift({ ...tx, id });
  updateAccountBalances();
  save();
}

export function deleteTransaction(id) {
  if (!id) return;
  // 削除済みリストへ追加
  if (!state.deletedIds.includes(id)) {
    state.deletedIds.push(id);
  }
  // 現在の取引リストから抹消
  state.transactions = state.transactions.filter(t => t.id !== id);
  updateAccountBalances();
  save();
}

export function updateAccountBalances() {
  state.accounts.forEach(acc => { acc.balance = Number(acc.initialBalance || 0); });
  const findAcc = (name) => state.accounts.find(a => a.name === name || a.id === name);
  
  [...state.transactions].reverse().forEach(tx => {
    const amt = Number(tx.amount) || 0;
    if (tx.type === 'income') {
      const a = findAcc(tx.toAccount); if (a) a.balance += amt;
    } else if (tx.type === 'expense') {
      const a = findAcc(tx.fromAccount); if (a) a.balance -= amt;
    } else if (tx.type === 'transfer') {
      const f = findAcc(tx.fromAccount), t = findAcc(tx.toAccount);
      if (f) f.balance -= amt; if (t) t.balance += amt;
    }
  });
}

// 他の基本的なアクセサ（他は省略せず含める）
export const getShortcuts = () => state.shortcuts || [];
export function addCategory(cat) { state.categories.push({ ...cat, id: 'cat_' + Date.now() }); save(); }
export function updateCategory(id, data) { const idx = state.categories.findIndex(c => c.id === id); if (idx !== -1) { state.categories[idx] = { ...state.categories[idx], ...data }; save(); } }
export function deleteCategory(id) { state.categories = state.categories.filter(c => c.id !== id); save(); }
export function reorderCategories(ids) { state.categories = ids.map((id, i) => ({ ...state.categories.find(c => c.id === id), order: i + 1 })); save(); }

export function addAccount(acc) { state.accounts.push({ ...acc, id: 'acc_' + Date.now(), balance: acc.initialBalance || 0 }); updateAccountBalances(); save(); }
export function updateAccount(id, data) { const idx = state.accounts.findIndex(a => a.id === id); if (idx !== -1) { state.accounts[idx] = { ...state.accounts[idx], ...data }; updateAccountBalances(); save(); } }
export function deleteAccount(id) { state.accounts = state.accounts.filter(a => a.id !== id); save(); }
export function reorderAccounts(ids) { state.accounts = ids.map((id, i) => ({ ...state.accounts.find(a => a.id === id), order: i + 1 })); save(); }

export function exportAllData() { return state; }
export function importAllData(data) { state = data; save(); }
export function clearAllData() { state.transactions = []; state.deletedIds = []; updateAccountBalances(); save(); }
export function updateSettings(s) { state.settings = { ...state.settings, ...s }; save(); }

export function getAssetHistory(days = 30) {
  const history = [];
  const now = new Date();
  for (let i = 0; i <= days; i++) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
    const dStr = d.toISOString().split('T')[0];
    let bal = getTotalBalance();
    state.transactions.forEach(tx => {
      if (tx.date > dStr) {
        if (tx.type === 'income') bal -= tx.amount;
        if (tx.type === 'expense') bal += tx.amount;
      }
    });
    history.unshift({ date: dStr, total: bal });
  }
  return history;
}

export function getAccountHistory(accountName, days = 30) {
  const history = [];
  const now = new Date();
  for (let i = 0; i <= days; i++) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
    const dStr = d.toISOString().split('T')[0];
    const acc = state.accounts.find(a => a.name === accountName);
    let bal = acc?.balance || 0;
    state.transactions.forEach(tx => {
      if (tx.date > dStr) {
        if (tx.type === 'income' && tx.toAccount === accountName) bal -= tx.amount;
        if (tx.type === 'expense' && tx.fromAccount === accountName) bal += tx.amount;
        if (tx.type === 'transfer') {
          if (tx.fromAccount === accountName) bal += tx.amount;
          if (tx.toAccount === accountName) bal -= tx.amount;
        }
      }
    });
    history.unshift({ date: dStr, balance: bal });
  }
  return history;
}
