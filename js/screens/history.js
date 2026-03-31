// ============================================
// 履歴画面
// ============================================

import * as store from '../store.js';

let filters = {
  startDate: '',
  endDate: '',
  account: '',
};

/**
 * 外部からフィルターをセットするための関数
 * @param {Object} data { startDate, endDate, account }
 */
export function setHistoryFilters(data) {
  filters = {
    ...filters,
    ...data
  };
}

export function render(container) {
  const transactions = store.getTransactions()
    .filter(tx => {
      if (filters.startDate && tx.date < filters.startDate) return false;
      if (filters.endDate && tx.date > filters.endDate) return false;
      if (filters.account && tx.fromAccount !== filters.account && tx.toAccount !== filters.account) return false;
      return true;
    })
    .sort((a, b) => {
      const dateA = a.date || '0000-00-00';
      const dateB = b.date || '0000-00-00';
      const dateComp = dateB.localeCompare(dateA);
      if (dateComp !== 0) return dateComp;
      // 同日の場合はID（作成日時が含まれる）で降順
      return (b.id || '').localeCompare(a.id || '');
    });

  const accounts = store.getAccounts();

  // Group by date
  const groups = {};
  for (const tx of transactions) {
    if (!groups[tx.date]) groups[tx.date] = [];
    groups[tx.date].push(tx);
  }

  container.innerHTML = `
    <div class="history-screen">
      <div class="history-header">
        <div class="history-filters">
          <input type="date" value="${filters.startDate}" data-action="filterStart" placeholder="開始日">
          <span style="color:var(--text-muted)">〜</span>
          <input type="date" value="${filters.endDate}" data-action="filterEnd" placeholder="終了日">
          <select data-action="filterAccount">
            <option value="">全口座</option>
            ${accounts.map(a => `<option value="${a.name}" ${filters.account === a.name ? 'selected' : ''}>${a.icon} ${a.name}</option>`).join('')}
          </select>
        </div>
      </div>

      <div class="history-list">
        ${transactions.length === 0 ? `
          <div class="history-empty">
            <div class="history-empty-icon">📋</div>
            <div>取引データがありません</div>
          </div>
        ` : Object.entries(groups).map(([date, txs]) => `
          <div class="history-date-group">
            <div class="history-date-label">${formatDateLabel(date)}</div>
            ${txs.map(tx => renderHistoryItem(tx)).join('')}
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
    filters.account = e.target.value;
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

function renderHistoryItem(tx) {
  const categories = store.getCategories();
  const cat = categories.find(c => c.name === tx.category);
  const icon = cat ? cat.icon : (tx.type === 'transfer' ? '🔄' : '❓');

  let accountLabel = '';
  if (tx.type === 'expense') {
    accountLabel = tx.fromAccount;
  } else if (tx.type === 'income') {
    accountLabel = tx.toAccount;
  } else {
    accountLabel = `${tx.fromAccount} → ${tx.toAccount}`;
  }

  const typeLabel = tx.type === 'expense' ? '-' : tx.type === 'income' ? '+' : '';
  const category = tx.type === 'transfer' ? '振替' : tx.category;

  return `
    <div class="history-item" data-action="editTx" data-id="${tx.id}">
      <div class="history-item-icon ${tx.type}">${icon}</div>
      <div class="history-item-info">
        <div class="history-item-category">${category}${tx.memo ? ` - ${tx.memo}` : ''}</div>
        <div class="history-item-account">${accountLabel}</div>
      </div>
      <div class="history-item-amount ${tx.type}">
        ${typeLabel}¥${Number(tx.amount).toLocaleString('ja-JP')}
      </div>
    </div>
  `;
}

function formatDateLabel(dateStr) {
  const d = new Date(dateStr);
  const days = ['日', '月', '火', '水', '木', '金', '土'];
  const month = d.getMonth() + 1;
  const day = d.getDate();
  const dow = days[d.getDay()];
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
        <input class="form-input" type="date" id="edit-date" value="${tx.date}">
      </div>

      <div class="form-group">
        <label class="form-label">金額</label>
        <input class="form-input" type="number" id="edit-amount" value="${tx.amount}" min="0">
      </div>

      ${tx.type !== 'transfer' ? `
        <div class="form-group">
          <label class="form-label">カテゴリー</label>
          <select class="form-input" id="edit-category">
            ${categories.map(c => `<option value="${c.name}" ${c.name === tx.category ? 'selected' : ''}>${c.icon} ${c.name}</option>`).join('')}
          </select>
        </div>
      ` : ''}

      ${tx.type === 'expense' || tx.type === 'transfer' ? `
        <div class="form-group">
          <label class="form-label">出金元</label>
          <select class="form-input" id="edit-from">
            ${accounts.map(a => `<option value="${a.name}" ${a.name === tx.fromAccount ? 'selected' : ''}>${a.icon} ${a.name}</option>`).join('')}
          </select>
        </div>
      ` : ''}

      ${tx.type === 'income' || tx.type === 'transfer' ? `
        <div class="form-group">
          <label class="form-label">入金先</label>
          <select class="form-input" id="edit-to">
            ${accounts.map(a => `<option value="${a.name}" ${a.name === tx.toAccount ? 'selected' : ''}>${a.icon} ${a.name}</option>`).join('')}
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
      const updates = {
        date: document.getElementById('edit-date').value,
        amount: Number(document.getElementById('edit-amount').value),
        category: document.getElementById('edit-category')?.value || tx.category,
        fromAccount: document.getElementById('edit-from')?.value || tx.fromAccount,
        toAccount: document.getElementById('edit-to')?.value || tx.toAccount,
        memo: document.getElementById('edit-memo').value,
      };
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
