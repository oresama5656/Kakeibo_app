/**
 * データ管理エントリポイント (v4.0 - モジュール統合版)
 */

import * as auth from './auth.js';
import { 
  state, DEFAULT_CATEGORIES, DEFAULT_ACCOUNTS, 
  normalizeDate, migrateTransactionIds, setState, escapeHTML 
} from './BaseStore.js';

import * as AccountStore from './AccountStore.js';
import * as CategoryStore from './CategoryStore.js';
import * as TransactionStore from './TransactionStore.js';
import * as SyncManager from './SyncManager.js';
import * as sync from '../sync.js';

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
    if (!state.categories || !Array.isArray(state.categories) || state.categories.length === 0) {
      state.categories = [...DEFAULT_CATEGORIES];
    } else {
      // 必須カテゴリー（残高修正）の存在確認を ID ではなく「名前とタイプ」で確実に行う
      const requiredDefaults = [
        { name: '残高修正', icon: '⚖️', type: 'expense', order: 99 },
        { name: '残高修正', icon: '⚖️', type: 'income', order: 100 }
      ];
      
      requiredDefaults.forEach(def => {
        const exists = state.categories.find(c => c.name === def.name && c.type === def.type);
        if (!exists) {
          state.categories.push({ ...def, id: `cat_auto_${Date.now()}_${Math.random().toString(36).substr(2, 4)}` });
        }
      });
      // 表示順を維持
      state.categories.sort((a, b) => (a.order || 0) - (b.order || 0));
    }
    
    if (!state.accounts || !Array.isArray(state.accounts) || state.accounts.length === 0) {
      state.accounts = [...DEFAULT_ACCOUNTS];
    }

    // リロード後も同期フラグを維持
    const sheetId = localStorage.getItem('kakeibo_sheet_id');
    if (sheetId) SyncManager.setCloudSyncReady(true);
  } else {
    state.categories = [...DEFAULT_CATEGORIES];
    state.accounts = [...DEFAULT_ACCOUNTS];
    state.shortcuts = [];
    state.deletedIds = [];
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
        // force=true, priority='local': ローカルの変更をクラウドに書く。自動モード切り替え禁止。
        await SyncManager.syncToCloudInternal(sheetId, () => {
          localStorage.setItem('kakeibo_data', JSON.stringify(state));
        }, 'local', true); 
        sync.notifyUpdate();
      } catch (e) { console.warn('Sync deferred'); }
    }
  }
}

export async function loadFromCloud(sheetId) {
  localStorage.setItem('kakeibo_sheet_id', sheetId);
  // force=true, priority='cloud': 初回ログイン時は常にクラウドを正とする
  await SyncManager.syncToCloudInternal(sheetId, () => {
    localStorage.setItem('kakeibo_data', JSON.stringify(state));
  }, 'cloud', true);
  window.dispatchEvent(new CustomEvent('kakeibo-data-updated'));
}

/**
 * リアルタイム同期用のプル（クラウド→ローカルの読み込み専用）
 * save()による書き込み中はスキップする。
 * ⚠️ pullOnlyFromCloud を使うこと。syncToCloudInternal は書き戻しも行うため、
 *    API呼び出しが倍増してエラーの原因になる。
 */
export async function pullFromCloud() {
  const sheetId = localStorage.getItem('kakeibo_sheet_id');
  if (!sheetId) return;

  // save()がクラウドへ書き込み中の場合はスキップ
  if (SyncManager.isSyncInProgress()) {
    console.log('[pullFromCloud] Sync in progress, skipping.');
    return;
  }

  const prevState = JSON.stringify(state);

  const changed = await SyncManager.pullOnlyFromCloud(sheetId, () => {
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
export const addAccount = (account) => { 
  if (!account.name) throw new Error('口座名が必要です');
  AccountStore.addAccount(account); 
  AccountStore.updateAccountBalances(); 
  save(); 
};
export const updateAccount = (id, account) => { 
  AccountStore.updateAccount(id, account); 
  AccountStore.updateAccountBalances(); 
  save(); 
};
export const deleteAccount = (...args) => { AccountStore.deleteAccount(...args); save(); };
export const reorderAccounts = (...args) => { AccountStore.reorderAccounts(...args); save(); };
export const updateAccountBalances = AccountStore.updateAccountBalances;

// Category API
export const addCategory = (...args) => { CategoryStore.addCategory(...args); save(); };
export const updateCategory = (...args) => { CategoryStore.updateCategory(...args); save(); };
export const deleteCategory = (...args) => { CategoryStore.deleteCategory(...args); save(); };
export const reorderCategories = (...args) => { CategoryStore.reorderCategories(...args); save(); };

// Transaction API
export const addTransaction = (tx) => { 
  if (!tx.amount || isNaN(tx.amount)) throw new Error('金額が正しくありません');
  TransactionStore.addTransaction(tx); 
  AccountStore.updateAccountBalances(); 
  save(); 
};
export const updateTransaction = (id, tx) => { 
  TransactionStore.updateTransaction(id, tx); 
  AccountStore.updateAccountBalances(); 
  save(); 
};
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
export { escapeHTML, formatLocalDate, formatDateLabel, formatFullDateLabel } from './BaseStore.js';
export function updateSettings(s) { state.settings = { ...state.settings, ...s }; save(); }
export function clearAllData() { state.transactions = []; state.deletedIds = []; AccountStore.updateAccountBalances(); save(); }
export function importAllData(d) { setState(d); save(); }
export function exportAllData() { return state; }
