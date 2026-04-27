/**
 * 取引・履歴管理モジュール
 */
import { state, normalizeDate, normalizeName, formatLocalDate, generateId } from './BaseStore.js';

import { getTotalBalance } from './AccountStore.js';

export function getTransactions() { return state.transactions; }


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
  if (!tx.id) tx.id = generateId('tx');

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
  const end = new Date();
  const start = new Date();
  start.setDate(end.getDate() - days);
  return getAssetHistoryRange(formatLocalDate(start), formatLocalDate(end));
}

export function getAssetHistoryRange(startStr, endStr) {
  const history = [];
  const totalRaw = getTotalBalance();
  
  let cur = new Date(startStr);
  const fin = new Date(endStr);
  
  while (cur <= fin) {
    const dStr = formatLocalDate(cur);
    let bal = totalRaw;
    state.transactions.forEach(tx => {
      // 現在の合計残高から、指定日より後の取引をすべて逆演算して、その日時点の残高を算出する（バックワード計算）
      if (tx.date > dStr) {
        if (tx.type === 'income') bal -= tx.amount;
        else if (tx.type === 'expense') bal += tx.amount;
      }
    });
    history.push({ date: dStr, total: bal });
    cur.setDate(cur.getDate() + 1);
  }
  return history;
}

export function getAccountHistory(accountId, days = 30) {
  const end = new Date();
  const start = new Date();
  start.setDate(end.getDate() - days);
  return getAccountHistoryRange(accountId, formatLocalDate(start), formatLocalDate(end));
}

export function getAccountHistoryRange(accountId, startStr, endStr) {
  const history = [];
  const accObj = state.accounts.find(a => a.id === accountId || a.name === accountId);
  if (!accObj) return [];
  
  const currentAccBal = accObj.balance || 0;
  const targetId = accObj.id;
  
  let cur = new Date(startStr);
  const fin = new Date(endStr);
  
  while (cur <= fin) {
    const dStr = formatLocalDate(cur);
    let bal = currentAccBal;
    state.transactions.forEach(tx => {
      if (tx.date > dStr) {
        if (tx.type === 'income' && tx.toAccountId === targetId) bal -= tx.amount;
        else if (tx.type === 'expense' && tx.fromAccountId === targetId) bal += tx.amount;
        else if (tx.type === 'transfer') {
          if (tx.fromAccountId === targetId) bal += tx.amount;
          if (tx.toAccountId === targetId) bal -= tx.amount;
        }
      }
    });
    history.push({ date: dStr, balance: bal });
    cur.setDate(cur.getDate() + 1);
  }
  return history;
}
