/**
 * データ管理エントリポイント (v4.0 - モジュール統合版)
 */

import * as auth from './auth.js';
import { 
  state, DEFAULT_CATEGORIES, DEFAULT_ACCOUNTS, 
  normalizeDate, migrateTransactionIds, setState, escapeHTML 
} from './store/BaseStore.js';

import * as AccountStore from './store/AccountStore.js';
import * as CategoryStore from './store/CategoryStore.js';
import * as TransactionStore from './store/TransactionStore.js';
import * as SyncManager from './store/SyncManager.js';
import * as sync from './sync.js';

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
    
    // カテゴリーの初期チェックと補充（クラウド未連携の場合のみデフォルトを補充する）
    const isCloudLinked = !!localStorage.getItem('kakeibo_sheet_id');
    if (!state.categories || state.categories.length === 0) {
      state.categories = [...DEFAULT_CATEGORIES];
    } else if (!isCloudLinked) {
      // クラウドと連携していない場合のみ、必須カテゴリーを補充する
      const hasExpenseCorrection = state.categories.find(c => (c.id === 'cat_99' || c.name === '残高修正') && c.type === 'expense');
      const hasIncomeCorrection = state.categories.find(c => (c.id === 'cat_100' || c.name === '残高修正') && c.type === 'income');
      if (!hasExpenseCorrection) state.categories.push({ id: 'cat_99', name: '残高修正', icon: '⚖️', type: 'expense', order: 99 });
      if (!hasIncomeCorrection) state.categories.push({ id: 'cat_100', name: '残高修正', icon: '⚖️', type: 'income', order: 100 });
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
        sync.notifyUpdate(); // 他デバイスへ通知
      } catch (e) { console.warn('Sync deferred'); }
    }
  }
}

export async function loadFromCloud(sheetId) {
  // ログイン済みのsheetIdを保存（initStoreの判定に使用）
  localStorage.setItem('kakeibo_sheet_id', sheetId);
  // 常にクラウドを正とする（初回ログイン時もリロード後も同じ）
  await SyncManager.syncToCloudInternal(sheetId, () => {
    localStorage.setItem('kakeibo_data', JSON.stringify(state));
  }, 'cloud');
  // リロードではなくイベントで画面を更新する（リロードがinitStoreを再実行してデフォルトを注入する原因だった）
  window.dispatchEvent(new CustomEvent('kakeibo-data-updated'));
}

/**
 * リアルタイム同期用のプル（差分マージして画面更新）
 */
export async function pullFromCloud() {
  const sheetId = localStorage.getItem('kakeibo_sheet_id');
  if (!sheetId) return;
  
  const prevState = JSON.stringify(state);
  
  await SyncManager.syncToCloudInternal(sheetId, () => {
    localStorage.setItem('kakeibo_data', JSON.stringify(state));
  });
  
  const nextState = JSON.stringify(state);
  
  // データに変化があった場合のみ、再描画イベントを発行
  if (prevState !== nextState) {
    window.dispatchEvent(new CustomEvent('kakeibo-data-updated'));
  }
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
export const getAssetHistoryRange = TransactionStore.getAssetHistoryRange;
export const getAccountHistoryRange = TransactionStore.getAccountHistoryRange;

// Sync API
export const blockSync = SyncManager.blockSync;
export const setCloudSyncReady = SyncManager.setCloudSyncReady;
export async function syncToCloud(sheetId, options) { 
  await SyncManager.syncToCloudInternal(sheetId, () => save()); 
}

// Misc
export { escapeHTML, formatLocalDate, formatDateLabel, formatFullDateLabel } from './store/BaseStore.js';
export function updateSettings(s) { state.settings = { ...state.settings, ...s }; save(); }
export function clearAllData() { state.transactions = []; state.deletedIds = []; AccountStore.updateAccountBalances(); save(); }
export function importAllData(d) { setState(d); save(); }
export function exportAllData() { return state; }
