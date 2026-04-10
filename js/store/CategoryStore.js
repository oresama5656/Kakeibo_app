/**
 * カテゴリ管理モジュール
 */
import { state } from './BaseStore.js';

export function getCategories() { return state.categories; }

export function addCategory(c) { 
  c.id = 'cat_' + Date.now(); 
  state.categories.push(c); 
}

export function updateCategory(id, d) {
  const i = state.categories.findIndex(c => c.id === id);
  if (i !== -1) {
    state.categories[i] = { ...state.categories[i], ...d };
    state.transactions.forEach(tx => {
      if (tx.categoryId === id) tx.category = state.categories[i].name;
    });
  }
}

export function deleteCategory(id) { 
  state.categories = state.categories.filter(c => c.id !== id); 
  if (!state.deletedIds) state.deletedIds = [];
  if (!state.deletedIds.includes(id)) state.deletedIds.push(id);
}

export function reorderCategories(ids) {
  const map = new Map(ids.map((id, idx) => [id, idx + 1]));
  state.categories.forEach(c => { if (map.has(c.id)) c.order = map.get(c.id); });
}
