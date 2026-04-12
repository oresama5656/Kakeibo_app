/**
 * 共通基盤: ステータス管理とユーティリティ
 */

export const DEFAULT_CATEGORIES = [
  { id: 'cat_01', name: '食費', icon: '🍎', type: 'expense', order: 1, pinned: true },
  { id: 'cat_02', name: '日用品', icon: '🧻', type: 'expense', order: 2, pinned: true },
  { id: 'cat_03', name: '交通費', icon: '🚃', type: 'expense', order: 3, pinned: true },
  { id: 'cat_04', name: '交際費', icon: '🍻', type: 'expense', order: 4, pinned: true },
  { id: 'cat_05', name: '居住費', icon: '🏠', type: 'expense', order: 5, pinned: true },
  { id: 'cat_06', name: '娯楽', icon: '🎮', type: 'expense', order: 6, pinned: true },
  { id: 'cat_99', name: '残高修正', icon: '⚖️', type: 'expense', order: 99 },
  { id: 'cat_07', name: '給与', icon: '💰', type: 'income', order: 7, pinned: true },
  { id: 'cat_08', name: '他収入', icon: '🧧', type: 'income', order: 8, pinned: true },
  { id: 'cat_100', name: '残高修正', icon: '⚖️', type: 'income', order: 100 }
];

export const DEFAULT_ACCOUNTS = [
  { id: 'acc_01', name: '現金', icon: '💵', balance: 0, initialBalance: 0, order: 1 },
  { id: 'acc_02', name: '銀行A', icon: '🏦', balance: 0, initialBalance: 0, order: 2 },
  { id: 'acc_03', name: 'クレカ', icon: '💳', balance: 0, initialBalance: 0, order: 3 }
];

// シングルトンとしてのState
export let state = {
  transactions: [],
  categories: [],
  accounts: [],
  shortcuts: [],
  deletedIds: [],
  settings: { darkMode: 'auto' }
};

export function setState(newState) {
  state = { ...state, ...newState };
}

// ユーティリティ
export function normalizeDate(d) {
  if (!d) return '';
  if (typeof d !== 'string') return d;
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

export function escapeHTML(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export function formatLocalDate(date) {
  const d = date || new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function normalizeName(name) {
  if (!name) return '';
  return String(name).trim();
}

export function migrateTransactionIds(transactions, accounts, categories) {
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
