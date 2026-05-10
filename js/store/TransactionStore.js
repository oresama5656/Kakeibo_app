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
  let currentTotal = getTotalBalance();
  
  // 取引を日付の降順（新しい順）でソート
  const sortedTxs = [...state.transactions].sort((a, b) => b.date.localeCompare(a.date));
  
  // 今日から過去へ遡って、各日付の残高をキャッシュする
  const dailyBalances = new Map();
  const todayStr = formatLocalDate(new Date());
  let txIdx = 0;
  
  // 今日から開始日までの全期間を1回だけ走査
  let cur = new Date(todayStr);
  const startLimit = new Date(startStr);
  
  while (cur >= startLimit) {
    const dStr = formatLocalDate(cur);
    
    // この日より後の取引をすべて逆演算して、この日の「終了時点」の残高を求める
    while (txIdx < sortedTxs.length && sortedTxs[txIdx].date > dStr) {
      const tx = sortedTxs[txIdx];
      if (tx.type === 'income') currentTotal -= tx.amount;
      else if (tx.type === 'expense') currentTotal += tx.amount;
      txIdx++;
    }
    
    dailyBalances.set(dStr, currentTotal);
    cur.setDate(cur.getDate() - 1);
  }

  // 指定されたレンジ [startStr, endStr] のデータを抽出
  let walk = new Date(startStr);
  const endLimit = new Date(endStr);
  while (walk <= endLimit) {
    const dStr = formatLocalDate(walk);
    history.push({ date: dStr, total: dailyBalances.get(dStr) || currentTotal });
    walk.setDate(walk.getDate() + 1);
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
  
  const targetId = accObj.id;
  let currentAccBal = accObj.balance || 0;
  
  const sortedTxs = [...state.transactions].sort((a, b) => b.date.localeCompare(a.date));
  const dailyBalances = new Map();
  const todayStr = formatLocalDate(new Date());
  let txIdx = 0;
  
  let cur = new Date(todayStr);
  const startLimit = new Date(startStr);
  
  while (cur >= startLimit) {
    const dStr = formatLocalDate(cur);
    
    while (txIdx < sortedTxs.length && sortedTxs[txIdx].date > dStr) {
      const tx = sortedTxs[txIdx];
      if (tx.type === 'income' && tx.toAccountId === targetId) currentAccBal -= tx.amount;
      else if (tx.type === 'expense' && tx.fromAccountId === targetId) currentAccBal += tx.amount;
      else if (tx.type === 'transfer') {
        if (tx.fromAccountId === targetId) currentAccBal += tx.amount;
        if (tx.toAccountId === targetId) currentAccBal -= tx.amount;
      }
      txIdx++;
    }
    
    dailyBalances.set(dStr, currentAccBal);
    cur.setDate(cur.getDate() - 1);
  }

  let walk = new Date(startStr);
  const endLimit = new Date(endStr);
  while (walk <= endLimit) {
    const dStr = formatLocalDate(walk);
    history.push({ date: dStr, balance: dailyBalances.get(dStr) || currentAccBal });
    walk.setDate(walk.getDate() + 1);
  }
  
  return history;
}
