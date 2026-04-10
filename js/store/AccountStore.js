/**
 * 口座管理モジュール
 */
import { state, normalizeName } from './BaseStore.js';

export function getAccounts() { return state.accounts; }

export function getAccountBalance(id) {
  const acc = state.accounts.find(a => a.id === id);
  return acc ? (Number(acc.balance) || 0) : 0;
}

export function getTotalBalance() {
  return state.accounts.reduce((sum, acc) => sum + (Number(acc.balance) || 0), 0);
}

export function updateAccountBalances() {
  state.accounts.forEach(a => a.balance = Number(a.initialBalance || 0));
  
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

export function addAccount(a) { 
  a.id = 'acc_' + Date.now(); 
  state.accounts.push(a); 
}

export function updateAccount(id, d) {
  const i = state.accounts.findIndex(a => a.id === id);
  if (i !== -1) {
    state.accounts[i] = { ...state.accounts[i], ...d };
    // スナップショット名称の更新
    state.transactions.forEach(tx => {
      if (tx.fromAccountId === id) tx.fromAccount = state.accounts[i].name;
      if (tx.toAccountId === id) tx.toAccount = state.accounts[i].name;
    });
  }
}

export function deleteAccount(id) { 
  state.accounts = state.accounts.filter(a => a.id !== id); 
  if (!state.deletedIds) state.deletedIds = [];
  if (!state.deletedIds.includes(id)) state.deletedIds.push(id);
}

export function reorderAccounts(ids) {
  const map = new Map(ids.map((id, idx) => [id, idx + 1]));
  state.accounts.forEach(a => { if (map.has(a.id)) a.order = map.get(a.id); });
}
