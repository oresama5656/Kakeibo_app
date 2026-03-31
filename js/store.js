// ============================================
// データ管理モジュール (v3.9 - 標準カテゴリー自動補充版)
// ============================================

import * as auth from './auth.js';

const DEFAULT_CATEGORIES = [
  { id: 'cat_01', name: '食費', icon: '🍎', type: 'expense', order: 1 },
  { id: 'cat_02', name: '日用品', icon: '🧻', type: 'expense', order: 2 },
  { id: 'cat_03', name: '交通費', icon: '🚃', type: 'expense', order: 3 },
  { id: 'cat_04', name: '交際費', icon: '🍻', type: 'expense', order: 4 },
  { id: 'cat_05', name: '居住費', icon: '🏠', type: 'expense', order: 5 },
  { id: 'cat_06', name: '娯楽', icon: '🎮', type: 'expense', order: 6 },
  { id: 'cat_99', name: '残高修正', icon: '⚖️', type: 'expense', order: 99 }, // 標準装備
  { id: 'cat_07', name: '給与', icon: '💰', type: 'income', order: 7 },
  { id: 'cat_08', name: '他収入', icon: '🧧', type: 'income', order: 8 },
  { id: 'cat_100', name: '残高修正', icon: '⚖️', type: 'income', order: 100 } // 標準装備
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

function normalizeDate(d) {
  if (!d) return '';
  if (typeof d !== 'string') return d;
  
  // yyyy/m/d や yyyy-m-d を yyyy-mm-dd に
  const parts = d.split(/[/\-]/);
  if (parts.length === 3) {
    let y = parts[0].trim();
    if (y.length === 2) y = '20' + y;
    const m = parts[1].trim().padStart(2, '0');
    const dVal = parts[2].trim().split(' ')[0].padStart(2, '0');
    return `${y}-${m}-${dVal}`;
  }
  return d.trim();
}

/**
 * 名称の正規化 (トリム、比較用)
 */
function normalizeName(name) {
  if (!name) return '';
  return String(name).trim();
}

/**
 * 既存の取引データに足りないIDを名称から補完（マイグレーション）
 */
function migrateTransactionIds(transactions, accounts, categories) {
  return transactions.map(tx => {
    const updated = { ...tx };
    const normFrom = normalizeName(tx.fromAccount);
    const normTo = normalizeName(tx.toAccount);
    const normCat = normalizeName(tx.category);

    if (!tx.fromAccountId && normFrom) {
      const acc = accounts.find(a => normalizeName(a.name) === normFrom);
      if (acc) updated.fromAccountId = acc.id;
    }
    if (!tx.toAccountId && normTo) {
      const acc = accounts.find(a => normalizeName(a.name) === normTo);
      if (acc) updated.toAccountId = acc.id;
    }
    if (!tx.categoryId && normCat) {
      const cat = categories.find(c => normalizeName(c.name) === normCat);
      if (cat) updated.categoryId = cat.id;
    }
    return updated;
  });
}

export function initStore() {
  const localData = localStorage.getItem('kakeibo_data');
  if (localData) {
    state = JSON.parse(localData);
    if (!state.shortcuts) state.shortcuts = [];
    if (!state.deletedIds) state.deletedIds = [];
    
    // 既存データの正規化とID補完
    if (state.transactions) {
      state.transactions = state.transactions.map(tx => ({
        ...tx,
        date: normalizeDate(tx.date)
      }));
      state.transactions = migrateTransactionIds(state.transactions, state.accounts, state.categories);
    }
    
    // カテゴリーの初期チェックと補充
    if (!state.categories || state.categories.length === 0) {
      state.categories = [...DEFAULT_CATEGORIES];
    } else {
      // 「残高修正」がない既存ユーザーのために自動補充
      const hasExpenseCorrection = state.categories.find(c => c.name === '残高修正' && c.type === 'expense');
      const hasIncomeCorrection = state.categories.find(c => c.name === '残高修正' && c.type === 'income');
      
      if (!hasExpenseCorrection) {
        state.categories.push({ id: 'cat_fix_e', name: '残高修正', icon: '⚖️', type: 'expense', order: 99 });
      }
      if (!hasIncomeCorrection) {
        state.categories.push({ id: 'cat_fix_i', name: '残高修正', icon: '⚖️', type: 'income', order: 100 });
      }
    }
    
    if (!state.accounts || state.accounts.length === 0) {
      state.accounts = [...DEFAULT_ACCOUNTS];
    }
  } else {
    state.categories = [...DEFAULT_CATEGORIES];
    state.accounts = [...DEFAULT_ACCOUNTS];
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

function mergeData(local, cloud, deletedIds = [], priority = 'local') {
  const map = new Map();
  const delSet = new Set(deletedIds);
  
  if (priority === 'local') {
    // クラウドを先に、ローカルを後に上書き
    cloud.forEach(item => { if (item?.id && !delSet.has(item.id)) map.set(item.id, item); });
    local.forEach(item => { if (item?.id) map.set(item.id, item); });
  } else {
    // ローカルを先に、クラウドを後に上書き（初期読込用）
    local.forEach(item => { if (item?.id) map.set(item.id, item); });
    cloud.forEach(item => { if (item?.id && !delSet.has(item.id)) map.set(item.id, item); });
  }
  
  return Array.from(map.values());
}

export async function syncToCloud(sheetId, options = { merge: true }) {
  if (!auth.isLoggedIn()) return;
  if (options.merge) {
    const [cloudTx, cloudCat, cloudAcc, cloudSc] = await readAllFromCloud(sheetId);
    state.transactions = mergeData(state.transactions, cloudTx, state.deletedIds, 'local');
    state.categories = mergeData(state.categories, cloudCat, [], 'local');
    state.accounts = mergeData(state.accounts, cloudAcc, [], 'local');
    state.shortcuts = mergeData(state.shortcuts, cloudSc, [], 'local');
    
    // 同期データも常に正規化とID補完
    state.transactions = state.transactions.map(tx => ({ ...tx, date: normalizeDate(tx.date) }));
    state.transactions = migrateTransactionIds(state.transactions, state.accounts, state.categories);
    
    updateAccountBalances();
  }
  
  // スプレッドシートには 11 列書き出す: [ID, 日付, 金額, 種別, カテゴリ名, 出金名, メモ, 入金名, カテゴリID, 出金ID, 入金ID]
  const txRows = state.transactions.map(t => [
    t.id, t.date, t.amount, t.type, 
    t.category, t.fromAccount, t.memo, t.toAccount || '',
    t.categoryId || '', t.fromAccountId || '', t.toAccountId || ''
  ]);
  const catRows = state.categories.map(c => [c.id, c.name, c.icon, c.type, c.order, c.pinned ? 1 : 0]);
  const accRows = state.accounts.map(a => [a.id, a.name, a.icon, a.balance, a.initialBalance, a.order, a.pinned ? 1 : 0]);
  const scRows = (state.shortcuts || []).map(s => [
    s.id, s.name, s.type, s.amount, 
    s.category, s.fromAccount, s.toAccount, s.order,
    s.categoryId || '', s.fromAccountId || '', s.toAccountId || ''
  ]);

  await auth.clearRows(sheetId, 'transactions!A:K'); // 11列分クリア
  await auth.clearRows(sheetId, 'categories!A:F');
  await auth.clearRows(sheetId, 'accounts!A:G');
  await auth.clearRows(sheetId, 'shortcuts!A:K'); // 11列分クリア

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
    auth.readRows(sheetId, 'transactions!A:K'), // 11列読み込み
    auth.readRows(sheetId, 'categories!A:F'),
    auth.readRows(sheetId, 'accounts!A:G'),
    auth.readRows(sheetId, 'shortcuts!A:K') // 11列読み込み
  ]);
  const p = (rows, fn) => (rows.length > 0 && rows[0][0] !== 'EMPTY') ? rows.map(fn) : [];
  return [
    p(t, r => ({ 
      id: r[0], date: normalizeDate(r[1]), amount: Number(r[2]), type: r[3], 
      category: r[4], fromAccount: r[5], memo: r[6] || '', toAccount: r[7] || '',
      categoryId: r[8] || '', fromAccountId: r[9] || '', toAccountId: r[10] || '' 
    })),
    p(c, r => ({ id: r[0], name: r[1], icon: r[2], type: r[3], order: Number(r[4] || 0) })),
    p(a, r => ({ id: r[0], name: r[1], icon: r[2], balance: Number(r[3] || 0), initialBalance: Number(r[4] || 0), order: Number(r[5] || 0) })),
    p(s, r => ({ 
      id: r[0], name: r[1], type: r[2], amount: Number(r[3] || 0), 
      category: r[4], fromAccount: r[5], toAccount: r[6], order: Number(r[7] || 0),
      categoryId: r[8] || '', fromAccountId: r[9] || '', toAccountId: r[10] || ''
    }))
  ];
}

export async function loadFromCloud(sheetId) {
  const [tx, cat, acc, sc] = await readAllFromCloud(sheetId);
  // 初回読込（環境移行）時は、クラウド側のデータを絶対優先する
  state.transactions = mergeData(state.transactions, tx, state.deletedIds, 'cloud');
  state.categories = mergeData(state.categories, cat, [], 'cloud');
  state.accounts = mergeData(state.accounts, acc, [], 'cloud');
  state.shortcuts = mergeData(state.shortcuts, sc, [], 'cloud');
  
  // 明示的な正規化とID補完
  state.transactions = state.transactions.map(tx => ({ ...tx, date: normalizeDate(tx.date) }));
  state.transactions = migrateTransactionIds(state.transactions, state.accounts, state.categories);
  
  // ショートカットのID補完も行う
  if (state.shortcuts) {
    state.shortcuts = migrateTransactionIds(state.shortcuts, state.accounts, state.categories);
  }
  
  updateAccountBalances();
  isCloudSyncReady = true;
  save();
}

export function setCloudSyncReady(r) { isCloudSyncReady = r; }

export function updateAccountBalances() {
  state.accounts.forEach(a => a.balance = Number(a.initialBalance || 0));
  
  // ID または 名称で口座を特定するヘルパー
  const findAccount = (id, name) => {
    if (id) return state.accounts.find(a => a.id === id);
    if (name) return state.accounts.find(a => normalizeName(a.name) === normalizeName(name));
    return null;
  };

  [...state.transactions].reverse().forEach(tx => {
    const val = Number(tx.amount) || 0;
    if (tx.type === 'income') {
      const a = findAccount(tx.toAccountId, tx.toAccount);
      if (a) a.balance += val;
    } else if (tx.type === 'expense') {
      const a = findAccount(tx.fromAccountId, tx.fromAccount);
      if (a) a.balance -= val;
    } else if (tx.type === 'transfer') { 
      const from = findAccount(tx.fromAccountId, tx.fromAccount);
      const to = findAccount(tx.toAccountId, tx.toAccount);
      if (from) from.balance -= val;
      if (to) to.balance += val;
    }
  });
}

// --- Setters ---

// ID生成用のカウンター（ミリ秒が同じ場合の順序維持用）
let idCounter = 0;
function generateId() {
  idCounter++;
  return 'tx_' + Date.now() + '_' + String(idCounter).padStart(5, '0');
}

function sanitizeTransaction(tx) {
  tx.date = normalizeDate(tx.date);

  // マスタデータから最新のIDと名称を取得して補完（名寄せ）
  if (tx.fromAccount && !tx.fromAccountId) {
    const acc = state.accounts.find(a => normalizeName(a.name) === normalizeName(tx.fromAccount));
    if (acc) tx.fromAccountId = acc.id;
  }
  if (tx.toAccount && !tx.toAccountId) {
    const acc = state.accounts.find(a => normalizeName(a.name) === normalizeName(tx.toAccount));
    if (acc) tx.toAccountId = acc.id;
  }
  if (tx.category && !tx.categoryId) {
    const cat = state.categories.find(c => normalizeName(c.name) === normalizeName(tx.category));
    if (cat) tx.categoryId = cat.id;
  }

  // IDがある場合は、スナップショット名称を最新のマスタ名で更新（スプレッドシートの可読性維持のため）
  if (tx.fromAccountId) {
    const acc = state.accounts.find(a => a.id === tx.fromAccountId);
    if (acc) tx.fromAccount = acc.name;
  }
  if (tx.toAccountId) {
    const acc = state.accounts.find(a => a.id === tx.toAccountId);
    if (acc) tx.toAccount = acc.name;
  }
  if (tx.categoryId) {
    const cat = state.categories.find(c => c.id === tx.categoryId);
    if (cat) tx.category = cat.name;
  }

  if (tx.type === 'expense') {
    tx.toAccount = '';
    tx.toAccountId = '';
  } else if (tx.type === 'income') {
    tx.fromAccount = '';
    tx.fromAccountId = '';
  } else if (tx.type === 'transfer') {
    tx.category = '';
    tx.categoryId = '';
  }
  return tx;
}

export function addTransaction(tx) {
  if (!tx.id) tx.id = generateId();
  state.transactions.unshift(sanitizeTransaction(tx));
  updateAccountBalances();
  save();
}
export function updateTransaction(id, updates) {
  const idx = state.transactions.findIndex(t => t.id === id);
  if (idx !== -1) {
    state.transactions[idx] = sanitizeTransaction({ ...state.transactions[idx], ...updates });
    updateAccountBalances();
    save();
  }
}
export function deleteTransaction(id) {
  if (!id) return;
  if (!state.deletedIds.includes(id)) state.deletedIds.push(id);
  state.transactions = state.transactions.filter(t => t.id !== id);
  updateAccountBalances();
  save();
}
export function addAccount(a) { a.id = 'acc_' + Date.now(); state.accounts.push(a); updateAccountBalances(); save(); }
export function updateAccount(id, d) {
  const i = state.accounts.findIndex(a => a.id === id);
  if (i !== -1) {
    state.accounts[i] = { ...state.accounts[i], ...d };
    // すべての取引の名称スナップショットを更新（IDベースなので計算には影響しないが、スプレッドシートの可読性のため）
    state.transactions.forEach(tx => {
      if (tx.fromAccountId === id) tx.fromAccount = state.accounts[i].name;
      if (tx.toAccountId === id) tx.toAccount = state.accounts[i].name;
    });
    updateAccountBalances();
    save();
  }
}
export function deleteAccount(id) { state.accounts = state.accounts.filter(a => a.id !== id); save(); }
export function reorderAccounts(ids) {
  const map = new Map(ids.map((id, idx) => [id, idx + 1]));
  state.accounts.forEach(a => { if (map.has(a.id)) a.order = map.get(a.id); });
  save();
}
export function addCategory(c) { c.id = 'cat_' + Date.now(); state.categories.push(c); save(); }
export function updateCategory(id, d) {
  const i = state.categories.findIndex(c => c.id === id);
  if (i !== -1) {
    state.categories[i] = { ...state.categories[i], ...d };
    // すべての取引の名称スナップショットを更新
    state.transactions.forEach(tx => {
      if (tx.categoryId === id) tx.category = state.categories[i].name;
    });
    save();
  }
}
export function deleteCategory(id) { state.categories = state.categories.filter(c => c.id !== id); save(); }
export function reorderCategories(ids) {
  const map = new Map(ids.map((id, idx) => [id, idx + 1]));
  state.categories.forEach(c => { if (map.has(c.id)) c.order = map.get(c.id); });
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

export function getAccountHistory(accountId, days = 30) {
  const history = [];
  const now = new Date();
  const accObj = state.accounts.find(a => a.id === accountId || a.name === accountId);
  const currentAccBal = accObj?.balance || 0;
  const targetId = accObj?.id;
  const targetName = accObj?.name;

  for (let i = 0; i <= days; i++) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
    const dStr = d.toISOString().split('T')[0];
    let bal = currentAccBal;
    state.transactions.forEach(tx => {
      if (tx.date > dStr) {
        if (targetId) {
          if (tx.type === 'income' && tx.toAccountId === targetId) bal -= tx.amount;
          else if (tx.type === 'expense' && tx.fromAccountId === targetId) bal += tx.amount;
          else if (tx.type === 'transfer') {
            if (tx.fromAccountId === targetId) bal += tx.amount;
            if (tx.toAccountId === targetId) bal -= tx.amount;
          }
        } else if (targetName) {
          // 下位互換用（IDがない場合）
          if (tx.type === 'income' && tx.toAccount === targetName) bal -= tx.amount;
          else if (tx.type === 'expense' && tx.fromAccount === targetName) bal += tx.amount;
          else if (tx.type === 'transfer') {
            if (tx.fromAccount === targetName) bal += tx.amount;
            if (tx.toAccount === targetName) bal -= tx.amount;
          }
        }
      }
    });
    history.unshift({ date: dStr, balance: bal });
  }
  return history;
}
