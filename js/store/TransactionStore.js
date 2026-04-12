/**
 * 取引・履歴管理モジュール
 */
import { state, normalizeDate, normalizeName, formatLocalDate } from './BaseStore.js';
import { getTotalBalance } from './AccountStore.js';

export function getTransactions() { return state.transactions; }

let idCounter = 0;
function generateId() {
  idCounter++;
  return 'tx_' + Date.now() + '_' + String(idCounter).padStart(5, '0');
}

function sanitizeTransaction(tx) {
  tx.date = normalizeDate(tx.date);
  
  // 金額のバリデーション: NaN を防ぎ、有限な数値であることを保証する
  tx.amount = Number(tx.amount);
  if (isNaN(tx.amount) || !isFinite(tx.amount)) {
    tx.amount = 0;
  }
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

  // スナップショット名称の同期
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

  if (tx.type === 'expense') { tx.toAccount = ''; tx.toAccountId = ''; }
  else if (tx.type === 'income') { tx.fromAccount = ''; tx.fromAccountId = ''; }
  else if (tx.type === 'transfer') { tx.category = ''; tx.categoryId = ''; }
  
  return tx;
}

export function addTransaction(tx) {
  if (!tx.id) tx.id = generateId();
  state.transactions.unshift(sanitizeTransaction(tx));
}

export function updateTransaction(id, updates) {
  const idx = state.transactions.findIndex(t => t.id === id);
  if (idx !== -1) {
    state.transactions[idx] = sanitizeTransaction({ ...state.transactions[idx], ...updates });
  }
}

export function deleteTransaction(id) {
  if (!id) return;
  if (!state.deletedIds.includes(id)) state.deletedIds.push(id);
  state.transactions = state.transactions.filter(t => t.id !== id);
}

export function getAssetHistory(days = 30) {
  const history = [];
  const now = new Date();
  const totalRaw = getTotalBalance();
  for (let i = 0; i <= days; i++) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
    const dStr = formatLocalDate(d);
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
  
  for (let i = 0; i <= days; i++) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
    const dStr = formatLocalDate(d);
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
        }
      }
    });
    history.unshift({ date: dStr, balance: bal });
  }
  return history;
}
