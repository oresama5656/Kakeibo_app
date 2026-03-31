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

let isCloudSyncReady = false;

// --- Core API ---

export function initStore() {
  const localData = localStorage.getItem('kakeibo_data');
  if (localData) {
    state = JSON.parse(localData);
    // Ensure all keys exist
    if (!state.shortcuts) state.shortcuts = [];
    if (!state.categories || state.categories.length === 0) state.categories = [...DEFAULT_CATEGORIES];
    if (!state.accounts || state.accounts.length === 0) state.accounts = [...DEFAULT_ACCOUNTS];
    
    // 既存データがある場合は、クラウド同期の準備を一旦「未完了」にしてロードを待つ
    isCloudSyncReady = false;
  } else {
    state.categories = [...DEFAULT_CATEGORIES];
    state.accounts = [...DEFAULT_ACCOUNTS];
    // 初回は保存せず、クラウドからのロードを優先する。
    // ロードに失敗した（＝新規ユーザー）場合にのみ、後のタイミングで保存されるようにする。
    isCloudSyncReady = false;
  }
}

export async function save() {
  localStorage.setItem('kakeibo_data', JSON.stringify(state));
  if (auth.isLoggedIn()) {
    const sheetId = localStorage.getItem('kakeibo_sheet_id');
    if (sheetId) {
      // クラウドとの整合性が確認できるまで同期をスキップ
      if (!isCloudSyncReady) {
        console.log('Sync deferred: Waiting for cloud load to ensure data safety.');
        return;
      }
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
  if (!auth.isLoggedIn()) throw new Error('Not logged in');
  
  const txRows = state.transactions.map(t => [t.id, t.date, t.amount, t.type, t.category, t.fromAccount, t.memo, t.toAccount || '']);
  const catRows = state.categories.map(c => [c.id, c.name, c.icon, c.type, c.order, c.pinned ? 1 : 0]);
  const accRows = state.accounts.map(a => [a.id, a.name, a.icon, a.balance, a.initialBalance, a.order, a.pinned ? 1 : 0]);
  const scRows = state.shortcuts.map(s => [s.id, s.name, s.type, s.amount, s.category, s.fromAccount, s.toAccount, s.order]);
  const setRows = [[JSON.stringify(state.settings)]];

  // まず書き込みテストをして認証が有効かチェック
  try {
    await auth.clearRows(sheetId, 'transactions!A:H');
    await auth.clearRows(sheetId, 'categories!A:F');
    await auth.clearRows(sheetId, 'accounts!A:G');
    await auth.clearRows(sheetId, 'shortcuts!A:H');

    await auth.writeRows(sheetId, 'transactions!A1', txRows.length ? txRows : [['EMPTY']]);
    await auth.writeRows(sheetId, 'categories!A1', catRows.length ? catRows : [['EMPTY']]);
    await auth.writeRows(sheetId, 'accounts!A1', accRows.length ? accRows : [['EMPTY']]);
    await auth.writeRows(sheetId, 'shortcuts!A1', scRows.length ? scRows : [['EMPTY']]);
    await auth.writeRows(sheetId, 'settings!A1', setRows);
  } catch (err) {
    console.error('syncToCloud failed:', err);
    throw err;
  }
}

export async function loadFromCloud(sheetId) {
  if (!auth.isLoggedIn()) throw new Error('Not logged in');
  
  try {
    const [txRows, catRows, accRows, scRows, setRows] = await Promise.all([
      auth.readRows(sheetId, 'transactions!A:H'),
      auth.readRows(sheetId, 'categories!A:F'),
      auth.readRows(sheetId, 'accounts!A:G'),
      auth.readRows(sheetId, 'shortcuts!A:H'),
      auth.readRows(sheetId, 'settings!A1')
    ]);

    // トランザクション
    if (txRows.length > 0) {
      if (txRows[0][0] === 'EMPTY') {
        state.transactions = [];
      } else {
        state.transactions = txRows.map(r => ({ id: r[0], date: r[1], amount: Number(r[2]), type: r[3], category: r[4], fromAccount: r[5], memo: r[6] || '', toAccount: r[7] || '' }));
      }
    }
    
    // カテゴリー
    if (catRows.length > 0) {
       if (catRows[0][0] === 'EMPTY') {
         state.categories = [...DEFAULT_CATEGORIES];
       } else {
         state.categories = catRows.map(r => ({ id: r[0], name: r[1], icon: r[2], type: r[3], order: Number(r[4]), pinned: r[5] === '1' }));
       }
    }
    
    // 口座
    if (accRows.length > 0) {
      if (accRows[0][0] === 'EMPTY') {
        state.accounts = [...DEFAULT_ACCOUNTS];
      } else {
        state.accounts = accRows.map(r => ({ id: r[0], name: r[1], icon: r[2], balance: Number(r[3]), initialBalance: Number(r[4] || 0), order: Number(r[5] || 0), pinned: r[6] === '1' }));
      }
    }

    // ショートカット
    if (scRows.length > 0) {
      if (scRows[0][0] === 'EMPTY') {
        state.shortcuts = [];
      } else {
        state.shortcuts = scRows.map(r => ({ id: r[0], name: r[1], type: r[2], amount: Number(r[3]), category: r[4], fromAccount: r[5], toAccount: r[6], order: Number(r[7]) }));
      }
    }

    // 設定
    if (setRows.length > 0 && setRows[0][0]) {
      try {
        state.settings = JSON.parse(setRows[0][0]);
      } catch (e) { console.warn('Settings parse failed'); }
    }
    
    updateAccountBalances();
    fixDuplicateIds();
    localStorage.setItem('kakeibo_data', JSON.stringify(state));
    isCloudSyncReady = true; // 同期準備完了！
    return true;
  } catch (err) {
    console.error('loadFromCloud major error:', err);
    // ロード失敗時（新規ユーザーなどデータがない場合など）の挙動については
    // 呼び出し側の判断に任せるが、一応失敗したままだと一生保存できないので、
    // まったくファイルがない（＝新規）と判断できる場合はReadyにする必要がある。
    throw err; 
  }
}

/**
 * 外から同期を強制的にReadyにできるようにする（新規開始時など用）
 */
export function setCloudSyncReady(ready = true) {
  isCloudSyncReady = ready;
}

// --- Helper for normalized comparison ---
function normalize(str) {
  if (!str) return '';
  // 絵文字、空白、スラッシュを除去して比較
  return str.toString()
            .replace(/[\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF]/g, '')
            .replace(/\//g, '-')
            .trim();
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

// ダッシュボード用の累計資産推移データ
export function getAssetHistory(days = 90) {
  const history = [];
  const now = new Date();
  const dateLimit = new Date(now.getFullYear(), now.getMonth(), now.getDate() - days);
  
  for (let i = 0; i <= days; i++) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    
    let dailyBalance = getTotalBalance();
    state.transactions.forEach(tx => {
      const txDate = normalize(tx.date);
      if (txDate > dateStr) {
        if (tx.type === 'income') dailyBalance -= tx.amount;
        if (tx.type === 'expense') dailyBalance += tx.amount;
      }
    });

    history.unshift({ date: dateStr, total: dailyBalance });
  }
  return history;
}

// 特定口座の残高推移データ
export function getAccountHistory(accountName, days = 90) {
  const transactions = [...state.transactions].filter(t => t.date).sort((a, b) => a.date.localeCompare(b.date));
  const accounts = getAccounts();
  const account = accounts.find(a => a.name === accountName);
  let balance = account?.initialBalance || 0;

  const dailyBalances = {};
  for (const tx of transactions) {
    const amount = Number(tx.amount) || 0;
    if (tx.type === 'income' && tx.toAccount === accountName) {
      balance += amount;
    } else if (tx.type === 'expense' && tx.fromAccount === accountName) {
      balance -= amount;
    } else if (tx.type === 'transfer') {
      if (tx.fromAccount === accountName) balance -= amount;
      if (tx.toAccount === accountName) balance += amount;
    }
    dailyBalances[tx.date] = balance;
  }

  const endDate = new Date();
  const startDate = new Date(endDate);
  startDate.setDate(startDate.getDate() - days);
  const startStr = startDate.toISOString().split('T')[0];

  const result = [];
  // 全期間の履歴から範囲内を抽出
  for (const [date, bal] of Object.entries(dailyBalances).sort(([a], [b]) => a.localeCompare(b))) {
    if (date >= startStr) {
      result.push({ date, balance: bal });
    }
  }

  const todayStr = endDate.toISOString().split('T')[0];
  if (result.length === 0 || (result.length > 0 && result[result.length - 1].date !== todayStr)) {
    result.push({ date: todayStr, balance });
  }

  return result;
}

// --- Setters (Transactions) ---
export function addTransaction(tx) {
  // ミリ秒 + ランダム文字列で重複を確実に防ぐ
  const id = 'tx_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  state.transactions.unshift({ ...tx, id });
  updateAccountBalances();
  save();
}

/**
 * 既存の重複したIDを修復する
 */
export function fixDuplicateIds() {
  const ids = new Set();
  let fixed = false;
  state.transactions.forEach(tx => {
    if (!tx.id || ids.has(tx.id)) {
      tx.id = 'tx_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
      fixed = true;
    }
    ids.add(tx.id);
  });
  if (fixed) {
    console.log('Duplicate IDs found and fixed.');
    save();
  }
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
  // 1. 全口座のリセット
  state.accounts.forEach(acc => {
    acc.balance = Number(acc.initialBalance || 0);
  });

  const findAccount = (searchValue) => {
    if (!searchValue) return null;
    const searchNorm = normalize(searchValue);
    return state.accounts.find(a => 
      a.id === searchValue || 
      normalize(a.name) === searchNorm ||
      a.name === searchValue
    );
  };

  // 2. 取引を古い順に適用（即座に計算）
  [...state.transactions].reverse().forEach(tx => {
    if (tx.type === 'income') {
      const acc = findAccount(tx.toAccount);
      if (acc) acc.balance += Number(tx.amount);
    } else if (tx.type === 'expense') {
      const acc = findAccount(tx.fromAccount);
      if (acc) acc.balance -= Number(tx.amount);
    } else if (tx.type === 'transfer') {
      const fromAcc = findAccount(tx.fromAccount);
      const toAcc = findAccount(tx.toAccount);
      if (fromAcc) fromAcc.balance -= Number(tx.amount);
      if (toAcc) toAcc.balance += Number(tx.amount);
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
