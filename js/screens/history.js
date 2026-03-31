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
  
  // --- 1. すべての取引を使って残高推移を事前計算 (通帳形式のため) ---
  // 日付順（古い順）に並べ替えて計算
  const sortedForCalc = [...allTransactions].sort((a, b) => {
    const d = (a.date || '').localeCompare(b.date || '');
    if (d !== 0) return d;
    return (a.id || '').localeCompare(b.id || '');
  });

  const accountBalances = {};
  accounts.forEach(a => accountBalances[a.id] = Number(a.initialBalance || 0));
  let totalBalance = accounts.reduce((sum, a) => sum + Number(a.initialBalance || 0), 0);

  const txRunningBalances = {}; // txId -> { balance: Number }

  for (const tx of sortedForCalc) {
    const amt = Number(tx.amount) || 0;
    if (tx.type === 'income') {
      if (accountBalances[tx.toAccountId] !== undefined) accountBalances[tx.toAccountId] += amt;
      totalBalance += amt;
    } else if (tx.type === 'expense') {
      if (accountBalances[tx.fromAccountId] !== undefined) accountBalances[tx.fromAccountId] -= amt;
      totalBalance -= amt;
    } else if (tx.type === 'transfer') {
      if (accountBalances[tx.fromAccountId] !== undefined) accountBalances[tx.fromAccountId] -= amt;
      if (accountBalances[tx.toAccountId] !== undefined) accountBalances[tx.toAccountId] += amt;
    }
    
    // フィルタ中の口座があればその残高、なければ総資産を記録
    txRunningBalances[tx.id] = filters.accountId 
      ? (accountBalances[filters.accountId] || 0)
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
      // 日付で降順 (新しい順)
      const dateA = a.date || '0000-00-00';
      const dateB = b.date || '0000-00-00';
      const dateComp = dateB.localeCompare(dateA);
      if (dateComp !== 0) return dateComp;
      
      // 同じ日付ならIDで降順 (作成が新しい順)
      const idA = a.id || '';
      const idB = b.id || '';
      return idB.localeCompare(idA);
    });

  // グルーピング (配列を使って表示順序を保証)
  const groupedTransactions = [];
  for (const tx of transactions) {
    if (groupedTransactions.length === 0 || groupedTransactions[groupedTransactions.length - 1].date !== tx.date) {
      groupedTransactions.push({ date: tx.date, items: [tx] });
    } else {
      groupedTransactions[groupedTransactions.length - 1].items.push(tx);
    }
  }

  container.innerHTML = `
    <div class="history-screen">
      <div class="history-header">
        <div class="history-filters">
          <input type="date" value="${filters.startDate}" data-action="filterStart" placeholder="開始日">
          <span style="color:var(--text-muted)">〜</span>
          <input type="date" value="${filters.endDate}" data-action="filterEnd" placeholder="終了日">
          <select data-action="filterAccount">
            <option value="">全口座 (資産推移)</option>
            ${accounts.map(a => `<option value="${a.id}" ${filters.accountId === a.id ? 'selected' : ''}>${a.icon} ${a.name}</option>`).join('')}
          </select>
          <select data-action="filterCategory">
            <option value="">全カテゴリー</option>
            ${categories.map(c => `<option value="${c.id}" ${filters.categoryId === c.id ? 'selected' : ''}>${c.icon} ${c.name}</option>`).join('')}
          </select>
        </div>
      </div>

      <div class="history-list">
        ${groupedTransactions.length === 0 ? `
          <div class="history-empty">
            <div class="history-empty-icon">📋</div>
            <div>取引データがありません</div>
          </div>
        ` : groupedTransactions.map(group => `
          <div class="history-date-group">
            <div class="history-date-label">${formatDateLabel(group.date)}</div>
            ${group.items.map(tx => renderHistoryItem(tx, txRunningBalances[tx.id])).join('')}
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

function renderHistoryItem(tx, balance) {
  const categories = store.getCategories();
  const accounts = store.getAccounts();
  
  // 現在のマスタデータからアイコンと名称を取得。なければスナップショットを使用。
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

  return `
    <div class="history-item" data-action="editTx" data-id="${tx.id}">
      <div class="history-item-icon ${tx.type}">${icon}</div>
      <div class="history-item-info">
        <div class="history-item-category">${categoryName}${tx.memo ? ` - ${tx.memo}` : ''}</div>
        <div class="history-item-account">${accountLabel}</div>
      </div>
      <div class="history-item-amount-group" style="text-align: right;">
        <div class="history-item-amount ${tx.type}">
          ${typeLabel}¥${Number(tx.amount).toLocaleString('ja-JP')}
        </div>
        <div class="history-item-running-balance" style="font-size: var(--font-size-xs); color: var(--text-muted); font-variant-numeric: tabular-nums;">
          残: ¥${(balance || 0).toLocaleString('ja-JP')}
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
