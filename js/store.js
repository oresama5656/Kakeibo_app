// ============================================
// データストア (localStorage版)
// 将来的にGoogle Sheets APIに差し替え可能な設計
// ============================================

import { DEFAULT_ACCOUNTS, DEFAULT_CATEGORIES, DEFAULT_SHORTCUTS } from './data.js';

const STORAGE_KEYS = {
  transactions: 'kakeibo_transactions',
  accounts: 'kakeibo_accounts',
  categories: 'kakeibo_categories',
  shortcuts: 'kakeibo_shortcuts',
  settings: 'kakeibo_settings',
};

// --- Utility ---
function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 9);
}

function load(key, fallback = []) {
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : fallback;
  } catch {
    return fallback;
  }
}

function save(key, data) {
  localStorage.setItem(key, JSON.stringify(data));
}

// --- Initialize ---
export function initStore() {
  if (!localStorage.getItem(STORAGE_KEYS.accounts)) {
    const accounts = DEFAULT_ACCOUNTS.map((a, i) => ({
      ...a,
      id: generateId() + i,
      initialBalance: 0,
    }));
    save(STORAGE_KEYS.accounts, accounts);
  }
  if (!localStorage.getItem(STORAGE_KEYS.categories)) {
    const categories = DEFAULT_CATEGORIES.map((c, i) => ({
      ...c,
      id: generateId() + i,
    }));
    save(STORAGE_KEYS.categories, categories);
  }
  if (!localStorage.getItem(STORAGE_KEYS.shortcuts)) {
    save(STORAGE_KEYS.shortcuts, DEFAULT_SHORTCUTS);
  }
  if (!localStorage.getItem(STORAGE_KEYS.transactions)) {
    save(STORAGE_KEYS.transactions, []);
  }
}

// --- Transactions ---
export function getTransactions() {
  return load(STORAGE_KEYS.transactions, []);
}

export function addTransaction(tx) {
  const transactions = getTransactions();
  const newTx = {
    ...tx,
    id: generateId(),
    createdAt: new Date().toISOString(),
  };
  transactions.push(newTx);
  save(STORAGE_KEYS.transactions, transactions);
  return newTx;
}

export function updateTransaction(id, updates) {
  const transactions = getTransactions();
  const idx = transactions.findIndex(t => t.id === id);
  if (idx === -1) return null;
  transactions[idx] = { ...transactions[idx], ...updates };
  save(STORAGE_KEYS.transactions, transactions);
  return transactions[idx];
}

export function deleteTransaction(id) {
  const transactions = getTransactions().filter(t => t.id !== id);
  save(STORAGE_KEYS.transactions, transactions);
}

// --- Accounts ---
export function getAccounts() {
  return load(STORAGE_KEYS.accounts, []);
}

export function addAccount(account) {
  const accounts = getAccounts();
  const newAccount = { ...account, id: generateId() };
  accounts.push(newAccount);
  save(STORAGE_KEYS.accounts, accounts);
  return newAccount;
}

export function updateAccount(id, updates) {
  const accounts = getAccounts();
  const idx = accounts.findIndex(a => a.id === id);
  if (idx === -1) return null;
  accounts[idx] = { ...accounts[idx], ...updates };
  save(STORAGE_KEYS.accounts, accounts);
  return accounts[idx];
}

export function deleteAccount(id) {
  const accounts = getAccounts().filter(a => a.id !== id);
  save(STORAGE_KEYS.accounts, accounts);
}

// --- Categories ---
export function getCategories() {
  return load(STORAGE_KEYS.categories, []);
}

export function addCategory(category) {
  const categories = getCategories();
  const newCat = { ...category, id: generateId() };
  categories.push(newCat);
  save(STORAGE_KEYS.categories, categories);
  return newCat;
}

export function updateCategory(id, updates) {
  const categories = getCategories();
  const idx = categories.findIndex(c => c.id === id);
  if (idx === -1) return null;
  categories[idx] = { ...categories[idx], ...updates };
  save(STORAGE_KEYS.categories, categories);
  return categories[idx];
}

export function deleteCategory(id) {
  const categories = getCategories().filter(c => c.id !== id);
  save(STORAGE_KEYS.categories, categories);
}

// --- Shortcuts ---
export function getShortcuts() {
  return load(STORAGE_KEYS.shortcuts, []);
}

export function addShortcut(shortcut) {
  const shortcuts = getShortcuts();
  const newSc = { ...shortcut, id: generateId() };
  shortcuts.push(newSc);
  save(STORAGE_KEYS.shortcuts, shortcuts);
  return newSc;
}

export function updateShortcut(id, updates) {
  const shortcuts = getShortcuts();
  const idx = shortcuts.findIndex(s => s.id === id);
  if (idx === -1) return null;
  shortcuts[idx] = { ...shortcuts[idx], ...updates };
  save(STORAGE_KEYS.shortcuts, shortcuts);
  return shortcuts[idx];
}

export function deleteShortcut(id) {
  const shortcuts = getShortcuts().filter(s => s.id !== id);
  save(STORAGE_KEYS.shortcuts, shortcuts);
}

// --- Balance Calculation ---
export function getAccountBalance(accountId) {
  const accounts = getAccounts();
  const account = accounts.find(a => a.id === accountId);
  if (!account) return 0;

  const transactions = getTransactions();
  let balance = account.initialBalance || 0;

  for (const tx of transactions) {
    const amount = Number(tx.amount) || 0;
    if (tx.type === 'income' && tx.toAccount === account.name) {
      balance += amount;
    } else if (tx.type === 'expense' && tx.fromAccount === account.name) {
      balance -= amount;
    } else if (tx.type === 'transfer') {
      if (tx.fromAccount === account.name) balance -= amount;
      if (tx.toAccount === account.name) balance += amount;
    }
  }
  return balance;
}

export function getAccountBalanceByName(accountName) {
  const accounts = getAccounts();
  const account = accounts.find(a => a.name === accountName);
  if (!account) return 0;
  return getAccountBalance(account.id);
}

export function getTotalBalance() {
  const accounts = getAccounts();
  return accounts.reduce((sum, acc) => sum + getAccountBalance(acc.id), 0);
}

// --- Asset History (calculated from transactions) ---
export function getAssetHistory(days = 90) {
  const transactions = getTransactions()
    .filter(t => t.date)
    .sort((a, b) => a.date.localeCompare(b.date));

  if (transactions.length === 0) return [];

  const accounts = getAccounts();
  const balances = {};
  accounts.forEach(a => { balances[a.name] = a.initialBalance || 0; });

  const dailyTotals = {};

  for (const tx of transactions) {
    const amount = Number(tx.amount) || 0;
    if (tx.type === 'income' && tx.toAccount) {
      balances[tx.toAccount] = (balances[tx.toAccount] || 0) + amount;
    } else if (tx.type === 'expense' && tx.fromAccount) {
      balances[tx.fromAccount] = (balances[tx.fromAccount] || 0) - amount;
    } else if (tx.type === 'transfer') {
      if (tx.fromAccount) balances[tx.fromAccount] = (balances[tx.fromAccount] || 0) - amount;
      if (tx.toAccount) balances[tx.toAccount] = (balances[tx.toAccount] || 0) + amount;
    }

    const total = Object.values(balances).reduce((s, v) => s + v, 0);
    dailyTotals[tx.date] = total;
  }

  // Fill in gaps and limit to requested days
  const dates = Object.keys(dailyTotals).sort();
  const endDate = new Date();
  const startDate = new Date(endDate);
  startDate.setDate(startDate.getDate() - days);
  const startStr = startDate.toISOString().split('T')[0];

  const result = [];
  let lastTotal = 0;
  for (const [date, total] of Object.entries(dailyTotals).sort(([a], [b]) => a.localeCompare(b))) {
    if (date >= startStr) {
      result.push({ date, total });
    }
    lastTotal = total;
  }

  // Add today if not present
  const todayStr = endDate.toISOString().split('T')[0];
  if (result.length === 0 || result[result.length - 1].date !== todayStr) {
    result.push({ date: todayStr, total: lastTotal });
  }

  return result;
}

// --- Settings ---
export function getSettings() {
  return load(STORAGE_KEYS.settings, {
    darkMode: 'auto', // 'auto', 'dark', 'light'
    sheetId: '',
  });
}

export function updateSettings(updates) {
  const settings = getSettings();
  const newSettings = { ...settings, ...updates };
  save(STORAGE_KEYS.settings, newSettings);
  return newSettings;
}

// --- Export / Import ---
export function exportAllData() {
  return {
    transactions: getTransactions(),
    accounts: getAccounts(),
    categories: getCategories(),
    shortcuts: getShortcuts(),
    settings: getSettings(),
    exportedAt: new Date().toISOString(),
  };
}

export function importAllData(data) {
  if (data.transactions) save(STORAGE_KEYS.transactions, data.transactions);
  if (data.accounts) save(STORAGE_KEYS.accounts, data.accounts);
  if (data.categories) save(STORAGE_KEYS.categories, data.categories);
  if (data.shortcuts) save(STORAGE_KEYS.shortcuts, data.shortcuts);
  if (data.settings) save(STORAGE_KEYS.settings, data.settings);
}

export function clearAllData() {
  Object.values(STORAGE_KEYS).forEach(key => localStorage.removeItem(key));
}
