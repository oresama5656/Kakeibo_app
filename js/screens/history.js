// ============================================
// 履歴画面
// ============================================

import * as store from '../store.js';

let filters = {
  startDate: '',
  endDate: '',
  accountId: '',
  categoryId: '',
};

/**
 * 外部からフィルターをセットするための関数
 */
export function setHistoryFilters(data) {
  filters = {
    ...filters,
    ...data
  };
}

export function render(container) {
  const allTransactions = store.getTransactions();
  const accounts = store.getAccounts();
  const categories = store.getCategories();
  const escape = (str) => store.escapeHTML(str);
  
  // --- 1. すべての取引を使って残高推移を事前計算 (通帳形式のため) ---
  const sortedForCalc = [...allTransactions].sort((a, b) => {
    const d = (a.date || '').localeCompare(b.date || '');
    if (d !== 0) return d;
    return (a.id || '').localeCompare(b.id || '');
  });

  const accountBalances = {};
  accounts.forEach(a => accountBalances[a.id] = Number(a.initialBalance || 0));
  let totalBalance = accounts.reduce((sum, a) => sum + Number(a.initialBalance || 0), 0);

  const txRunningBalances = {}; 

  for (const tx of sortedForCalc) {
    const amt = Number(tx.amount) || 0;
    const fromExists = accountBalances[tx.fromAccountId] !== undefined;
    const toExists = accountBalances[tx.toAccountId] !== undefined;

    if (tx.type === 'income') {
      if (toExists) {
        accountBalances[tx.toAccountId] += amt;
        totalBalance += amt;
      }
    } else if (tx.type === 'expense') {
      if (fromExists) {
        accountBalances[tx.fromAccountId] -= amt;
        totalBalance -= amt;
      }
    } else if (tx.type === 'transfer') {
      if (fromExists) accountBalances[tx.fromAccountId] -= amt;
      if (toExists) accountBalances[tx.toAccountId] += amt;
      if (fromExists && !toExists) totalBalance -= amt;
      else if (!fromExists && toExists) totalBalance += amt;
    }
    txRunningBalances[tx.id] = (filters.accountId && accountBalances[filters.accountId] !== undefined)
      ? accountBalances[filters.accountId]
      : totalBalance;
  }

  // --- 2. フィルタと表示用のソートを適用 ---
  const transactions = allTransactions
    .filter(tx => {
      if (filters.startDate && tx.date < filters.startDate) return false;
      if (filters.endDate && tx.date > filters.endDate) return false;
      if (filters.accountId && tx.fromAccountId !== filters.accountId && tx.toAccountId !== filters.accountId) return false;
      if (filters.categoryId && tx.categoryId !== filters.categoryId) return false;
      return true;
    })
    .sort((a, b) => {
      const dateA = a.date || '0000-00-00';
      const dateB = b.date || '0000-00-00';
      const dateComp = dateB.localeCompare(dateA);
      if (dateComp !== 0) return dateComp;
      const idA = a.id || '';
      const idB = b.id || '';
      return idB.localeCompare(idA);
    });

  const groupedTransactions = [];
  for (const tx of transactions) {
    if (groupedTransactions.length === 0 || groupedTransactions[groupedTransactions.length - 1].date !== tx.date) {
      groupedTransactions.push({ date: tx.date, items: [tx] });
    } else {
      groupedTransactions[groupedTransactions.length - 1].items.push(tx);
    }
  }

  const filteredBalance = transactions.length > 0 ? txRunningBalances[transactions[0].id] : totalBalance;
  const today = new Date();
  const dateStr = `${today.getMonth() + 1}月${today.getDate()}日（${['日','月','火','水','木','金','土'][today.getDay()]}）`;

  container.innerHTML = `
    <div class="history-screen premium-mode fadeIn">
      <!-- Summary Master Card (Header) -->
      <div class="total-summary-card">
        <div style="font-size: 0.75rem; opacity: 0.8; font-weight: 600; letter-spacing: 1px; margin-bottom: 4px;">
          ${escape(dateStr)}
        </div>
        <div class="total-amount">¥${filteredBalance.toLocaleString('ja-JP')}</div>
        <div style="font-size: 0.7rem; opacity: 0.7; font-weight: 600;">
          ${filters.accountId ? escape(accounts.find(a => a.id === filters.accountId)?.name || '選択中口座') + ' の残高' : '総資産額'}
        </div>
      </div>

      <!-- Filter Controls (iOS Style like Analysis) -->
      <div class="premium-card-v3" style="padding: var(--space-md); margin-bottom: var(--space-lg);">
        <div style="font-size: 0.8rem; font-weight: 800; color: var(--premium-deep); margin-bottom: 12px; display: flex; align-items: center; gap: 6px;">
          <span>🔍 フィルター</span>
        </div>
        
        <div class="select-v3-container" style="display: flex; flex-wrap: wrap; gap: 10px;">
          <div style="flex: 1; min-width: 140px;">
            <label style="font-size: 0.65rem; color: var(--text-muted); font-weight: 700; display: block; margin-bottom: 4px;">開始日</label>
            <input type="date" value="${filters.startDate}" data-action="filterStart" class="form-input" style="width: 100%; height: 36px; padding: 0 8px; border-radius: var(--radius-md); font-size: 0.8rem;">
          </div>
          <div style="flex: 1; min-width: 140px;">
            <label style="font-size: 0.65rem; color: var(--text-muted); font-weight: 700; display: block; margin-bottom: 4px;">終了日</label>
            <input type="date" value="${filters.endDate}" data-action="filterEnd" class="form-input" style="width: 100%; height: 36px; padding: 0 8px; border-radius: var(--radius-md); font-size: 0.8rem;">
          </div>
        </div>

        <div class="select-v3-container" style="display: flex; flex-wrap: wrap; gap: 10px; margin-top: 10px;">
          <select data-action="filterAccount" class="select-v3" style="flex: 1; min-width: 140px;">
            <option value="">全口座 (資産推移)</option>
            ${accounts.map(a => `<option value="${a.id}" ${filters.accountId === a.id ? 'selected' : ''}>${a.icon} ${escape(a.name)}</option>`).join('')}
          </select>
          <select data-action="filterCategory" class="select-v3" style="flex: 1; min-width: 140px;">
            <option value="">全カテゴリー</option>
            ${categories.map(c => `<option value="${c.id}" ${filters.categoryId === c.id ? 'selected' : ''}>${c.icon} ${escape(c.name)}</option>`).join('')}
          </select>
        </div>
      </div>

      <div class="history-list">
        ${groupedTransactions.length === 0 ? `
          <div class="premium-card-v3" style="text-align: center; padding: 40px var(--space-md);">
            <div style="font-size: 3rem; margin-bottom: 16px; opacity: 0.5;">📋</div>
            <div style="color: var(--text-muted); font-weight: 600;">取引データがありません</div>
          </div>
        ` : groupedTransactions.map(group => `
          <div class="history-date-group">
            <div style="font-size: 0.8rem; font-weight: 800; color: var(--premium-deep); margin: 20px 0 10px 4px; display: flex; align-items: center; gap: 8px;">
              <span style="background: var(--premium-light); color: white; padding: 2px 8px; border-radius: 6px; font-size: 0.7rem;">${group.date.slice(5).replace('-', '/')}</span>
              <span>${formatDateLabel(group.date)}</span>
            </div>
            <div class="premium-card-v3" style="padding: 4px 0;">
              ${group.items.map((tx, idx) => renderHistoryItem(tx, txRunningBalances[tx.id], idx === group.items.length - 1)).join('')}
            </div>
          </div>
        `).join('')}
      </div>
    </div>
  `;

  // Events
  container.querySelector('[data-action="filterStart"]')?.addEventListener('change', e => {
    filters.startDate = e.target.value;
    refresh();
  });
  container.querySelector('[data-action="filterEnd"]')?.addEventListener('change', e => {
    filters.endDate = e.target.value;
    refresh();
  });
  container.querySelector('[data-action="filterAccount"]')?.addEventListener('change', e => {
    filters.accountId = e.target.value;
    refresh();
  });
  container.querySelector('[data-action="filterCategory"]')?.addEventListener('change', e => {
    filters.categoryId = e.target.value;
    refresh();
  });

  container.addEventListener('click', handleClick);
}

function handleClick(e) {
  const item = e.target.closest('[data-action="editTx"]');
  if (!item) return;

  const txId = item.dataset.id;
  showEditModal(txId);
}

function renderHistoryItem(tx, balance, isLast) {
  const categories = store.getCategories();
  const accounts = store.getAccounts();
  const escape = (str) => store.escapeHTML(str);
  
  const cat = categories.find(c => c.id === tx.categoryId);
  const icon = cat ? cat.icon : (tx.type === 'transfer' ? '🔄' : '❓');
  const categoryName = tx.type === 'transfer' ? '振替' : (cat ? cat.name : tx.category);

  const fromAcc = accounts.find(a => a.id === tx.fromAccountId);
  const toAcc = accounts.find(a => a.id === tx.toAccountId);
  const fromName = fromAcc ? fromAcc.name : tx.fromAccount;
  const toName = toAcc ? toAcc.name : tx.toAccount;

  let accountLabel = '';
  if (tx.type === 'expense') {
    accountLabel = fromName;
  } else if (tx.type === 'income') {
    accountLabel = toName;
  } else {
    accountLabel = `${fromName} → ${toName}`;
  }

  const typeLabel = tx.type === 'expense' ? '-' : tx.type === 'income' ? '+' : '';
  const amountColor = tx.type === 'expense' ? 'var(--color-expense)' : tx.type === 'income' ? 'var(--color-income)' : 'var(--color-transfer)';

  return `
    <div class="category-item-v3" data-action="editTx" data-id="${tx.id}" style="${isLast ? 'border-bottom: none;' : ''} padding: 12px 16px;">
      <div class="cat-icon-frame" style="background: var(--bg-primary); border: 1px solid var(--border-light);">${escape(icon)}</div>
      <div class="cat-info-v3" style="flex: 1;">
        <div class="cat-title-row">
          <span class="cat-name-v3" style="font-size: 0.9rem; font-weight: 700;">${escape(categoryName)}</span>
          <span class="cat-amount-v3" style="color: ${amountColor}; font-weight: 800;">${typeLabel}¥${Number(tx.amount).toLocaleString('ja-JP')}</span>
        </div>
        <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 4px;">
          <div style="font-size: 0.7rem; color: var(--text-muted); font-weight: 600;">
            ${escape(accountLabel)}${tx.memo ? ` <span style="opacity: 0.6; font-weight: 400;">| ${escape(tx.memo)}</span>` : ''}
          </div>
          <div style="font-size: 0.65rem; color: var(--text-muted); font-weight: 700; font-variant-numeric: tabular-nums; opacity: 0.8;">
            残: ¥${(balance || 0).toLocaleString('ja-JP')}
          </div>
        </div>
      </div>
    </div>
  `;
}

function formatDateLabel(dateStr) {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  
  const y = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10);
  const d = parseInt(parts[2], 10);
  const dateObj = new Date(y, m - 1, d);
  
  const days = ['日', '月', '火', '水', '木', '金', '土'];
  const month = dateObj.getMonth() + 1;
  const day = dateObj.getDate();
  const dow = days[dateObj.getDay()];
  return `${month}月${day}日（${dow}）`;
}

function showEditModal(txId) {
  const tx = store.getTransactions().find(t => t.id === txId);
  if (!tx) return;

  const categories = store.getCategories().filter(c => c.type === tx.type || c.type === 'both');
  const accounts = store.getAccounts();

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal-content">
      <div class="modal-header">
        <h3 class="modal-title">取引を編集</h3>
        <button class="modal-close" data-action="closeModal">✕</button>
      </div>

      <div class="form-group">
        <label class="form-label">日付</label>
        <input class="form-input" type="date" id="edit-date" value="${(tx.date || '').replace(/\//g, '-')}">
      </div>

      <div class="form-group">
        <label class="form-label">金額</label>
        <input class="form-input" type="number" id="edit-amount" value="${tx.amount}" min="0">
      </div>

      ${tx.type !== 'transfer' ? `
        <div class="form-group">
          <label class="form-label">カテゴリー</label>
          <select class="form-input" id="edit-category">
            ${categories.map(c => `<option value="${c.id}" ${c.id === tx.categoryId ? 'selected' : ''}>${c.icon} ${c.name}</option>`).join('')}
          </select>
        </div>
      ` : ''}

      ${tx.type === 'expense' || tx.type === 'transfer' ? `
        <div class="form-group">
          <label class="form-label">出金元</label>
          <select class="form-input" id="edit-from">
            ${accounts.map(a => `<option value="${a.id}" ${a.id === tx.fromAccountId ? 'selected' : ''}>${a.icon} ${a.name}</option>`).join('')}
          </select>
        </div>
      ` : ''}

      ${tx.type === 'income' || tx.type === 'transfer' ? `
        <div class="form-group">
          <label class="form-label">入金先</label>
          <select class="form-input" id="edit-to">
            ${accounts.map(a => `<option value="${a.id}" ${a.id === tx.toAccountId ? 'selected' : ''}>${a.icon} ${a.name}</option>`).join('')}
          </select>
        </div>
      ` : ''}

      <div class="form-group">
        <label class="form-label">メモ</label>
        <input class="form-input" type="text" id="edit-memo" value="${tx.memo || ''}">
      </div>

      <div class="form-actions">
        <button class="btn btn-danger" data-action="deleteTx" data-id="${tx.id}">削除</button>
        <button class="btn btn-primary" data-action="saveTx" data-id="${tx.id}">保存</button>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  overlay.addEventListener('click', (e) => {
    const action = e.target.closest('[data-action]')?.dataset.action;

    if (action === 'closeModal' || e.target === overlay) {
      overlay.remove();
    } else if (action === 'deleteTx') {
      if (confirm('この取引を削除しますか？')) {
        store.deleteTransaction(e.target.closest('[data-id]').dataset.id);
        overlay.remove();
        window.showToast?.('取引を削除しました');
        refresh();
      }
    } else if (action === 'saveTx') {
      const date = document.getElementById('edit-date').value;
      if (!date) {
        window.showToast?.('日付を入力してください', 'error');
        return;
      }
      const updates = {
        date: date,
        amount: Number(document.getElementById('edit-amount').value),
        categoryId: document.getElementById('edit-category')?.value || tx.categoryId,
        fromAccountId: document.getElementById('edit-from')?.value || tx.fromAccountId,
        toAccountId: document.getElementById('edit-to')?.value || tx.toAccountId,
        memo: document.getElementById('edit-memo').value,
      };
      
      // 名称スナップショットの補完
      if (updates.categoryId) updates.category = categories.find(c => c.id === updates.categoryId)?.name || '';
      if (updates.fromAccountId) updates.fromAccount = accounts.find(a => a.id === updates.fromAccountId)?.name || '';
      if (updates.toAccountId) updates.toAccount = accounts.find(a => a.id === updates.toAccountId)?.name || '';

      store.updateTransaction(tx.id, updates);
      overlay.remove();
      window.showToast?.('取引を更新しました ✓');
      refresh();
    }
  });
}

function refresh() {
  const container = document.getElementById('screen-history');
  if (container) {
    container.removeEventListener('click', handleClick);
    render(container);
  }
}
