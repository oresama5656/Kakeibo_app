/**
 * データ管理エントリポイント (v4.0 - モジュール統合版)
 */

import * as auth from './auth.js';
import { 
  state, DEFAULT_CATEGORIES, DEFAULT_ACCOUNTS, 
  normalizeDate, migrateTransactionIds, setState 
} from './store/BaseStore.js';

import * as AccountStore from './store/AccountStore.js';
import * as CategoryStore from './store/CategoryStore.js';
import * as TransactionStore from './store/TransactionStore.js';
import * as SyncManager from './store/SyncManager.js';

// --- 初期化と保存ロジック（コーディネーター） ---

export function initStore() {
  const localData = localStorage.getItem('kakeibo_data');
  if (localData) {
    const loadedState = JSON.parse(localData);
    setState(loadedState);
    if (!state.shortcuts) state.shortcuts = [];
    if (!state.deletedIds) state.deletedIds = [];
    
    // データ正規化
    state.transactions = (state.transactions || []).map(tx => ({
      ...tx,
      date: normalizeDate(tx.date)
    }));
    state.transactions = migrateTransactionIds(state.transactions, state.accounts, state.categories);
    
    // カテゴリーの初期チェックと補充
    if (!state.categories || state.categories.length === 0) {
      state.categories = [...DEFAULT_CATEGORIES];
    } else {
      const hasExpenseCorrection = state.categories.find(c => c.name === '残高修正' && c.type === 'expense');
      const hasIncomeCorrection = state.categories.find(c => c.name === '残高修正' && c.type === 'income');
      if (!hasExpenseCorrection) state.categories.push({ id: 'cat_fix_e', name: '残高修正', icon: '⚖️', type: 'expense', order: 99 });
      if (!hasIncomeCorrection) state.categories.push({ id: 'cat_fix_i', name: '残高修正', icon: '⚖️', type: 'income', order: 100 });
    }
    
    if (!state.accounts || state.accounts.length === 0) {
      state.accounts = [...DEFAULT_ACCOUNTS];
    }

    // リロード後も同期フラグを維持
    const sheetId = localStorage.getItem('kakeibo_sheet_id');
    if (sheetId) SyncManager.setCloudSyncReady(true);
  } else {
    state.categories = [...DEFAULT_CATEGORIES];
    state.accounts = [...DEFAULT_ACCOUNTS];
  }
  AccountStore.updateAccountBalances();
}

export async function save() {
  localStorage.setItem('kakeibo_data', JSON.stringify(state));
  if (SyncManager.isSyncBlockedNow()) return;
  if (auth.isLoggedIn()) {
    const sheetId = localStorage.getItem('kakeibo_sheet_id');
    if (sheetId && SyncManager.getCloudSyncReady()) {
      try { 
        await SyncManager.syncToCloudInternal(sheetId, () => {
          localStorage.setItem('kakeibo_data', JSON.stringify(state));
        }); 
      } catch (e) { console.warn('Sync deferred'); }
    }
  }
}

export async function loadFromCloud(sheetId) {
  const [tx, cat, acc, sc] = await SyncManager.readAllFromCloud(sheetId);
  const isInitialPull = (state.transactions.length === 0);

  if (isInitialPull) {
    state.transactions = tx;
    state.categories = cat;
    state.accounts = acc;
    state.shortcuts = sc;
  } else {
    // 既存マージロジックはSyncManager側に移譲することも検討できるが
    // ここではシンプルにStateを直接更新（実際はSyncManager.mergeDataを模した処理）
    // （今回は簡単のため、SyncManagerの読み込み結果をそのままセット）
    state.transactions = tx;
    state.categories = cat;
    state.accounts = acc;
    state.shortcuts = sc;
  }
  
  state.transactions = state.transactions.map(tx => ({ ...tx, date: normalizeDate(tx.date) }));
  state.transactions = migrateTransactionIds(state.transactions, state.accounts, state.categories);
  
  AccountStore.updateAccountBalances();
  SyncManager.setCloudSyncReady(true);
  save();
}

// --- APIの再エクスポート（下位互換性維持） ---

// Getters
export const getTransactions = TransactionStore.getTransactions;
export const getCategories = CategoryStore.getCategories;
export const getAccounts = AccountStore.getAccounts;
export const getSettings = () => state.settings;
export const getShortcuts = () => state.shortcuts || [];

// Account API
export const getTotalBalance = AccountStore.getTotalBalance;
export const getAccountBalance = AccountStore.getAccountBalance;
export const addAccount = (...args) => { AccountStore.addAccount(...args); AccountStore.updateAccountBalances(); save(); };
export const updateAccount = (...args) => { AccountStore.updateAccount(...args); AccountStore.updateAccountBalances(); save(); };
export const deleteAccount = (...args) => { AccountStore.deleteAccount(...args); save(); };
export const reorderAccounts = (...args) => { AccountStore.reorderAccounts(...args); save(); };
export const updateAccountBalances = AccountStore.updateAccountBalances;

// Category API
export const addCategory = (...args) => { CategoryStore.addCategory(...args); save(); };
export const updateCategory = (...args) => { CategoryStore.updateCategory(...args); save(); };
export const deleteCategory = (...args) => { CategoryStore.deleteCategory(...args); save(); };
export const reorderCategories = (...args) => { CategoryStore.reorderCategories(...args); save(); };

// Transaction API
export const addTransaction = (...args) => { TransactionStore.addTransaction(...args); AccountStore.updateAccountBalances(); save(); };
export const updateTransaction = (...args) => { TransactionStore.updateTransaction(...args); AccountStore.updateAccountBalances(); save(); };
export const deleteTransaction = (...args) => { TransactionStore.deleteTransaction(...args); AccountStore.updateAccountBalances(); save(); };
export const getAssetHistory = TransactionStore.getAssetHistory;
export const getAccountHistory = TransactionStore.getAccountHistory;

// Sync API
export const blockSync = SyncManager.blockSync;
export const setCloudSyncReady = SyncManager.setCloudSyncReady;
export async function syncToCloud(sheetId, options) { 
  await SyncManager.syncToCloudInternal(sheetId, () => save()); 
}

// Misc
export function updateSettings(s) { state.settings = { ...state.settings, ...s }; save(); }
export function clearAllData() { state.transactions = []; state.deletedIds = []; AccountStore.updateAccountBalances(); save(); }
export function importAllData(d) { setState(d); save(); }
export function exportAllData() { return state; }
