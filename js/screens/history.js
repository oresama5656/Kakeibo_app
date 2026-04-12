// ============================================
// 履歴画面 (Advanced Premium UI)
// ============================================

import * as store from '../store.js';
import * as PeriodManager from '../components/analysis/PeriodManager.js';

let historyState = {
  periodType: 'month',
  referenceDate: new Date(),
  customStart: '',
  customEnd: '',
  accountId: '',
  categoryId: '',
};

/**
 * 外部からフィルターをセットするための関数
 */
export function setHistoryFilters(data) {
  if (data.startDate || data.endDate) {
    historyState.periodType = 'custom';
    historyState.customStart = data.startDate || '';
    historyState.customEnd = data.endDate || '';
  }
  if (data.accountId !== undefined) historyState.accountId = data.accountId;
  if (data.categoryId !== undefined) historyState.categoryId = data.categoryId;
}

export function render(container) {
  const allTransactions = store.getTransactions();
  const accounts = store.getAccounts();
  const categories = store.getCategories();
  const escape = (str) => store.escapeHTML(str);

  // 期間の計算
  const { start, end } = PeriodManager.getPeriodDates(historyState);
  
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
    txRunningBalances[tx.id] = (historyState.accountId && accountBalances[historyState.accountId] !== undefined)
      ? accountBalances[historyState.accountId]
      : totalBalance;
  }

  // --- 2. フィルタと表示用のソートを適用 ---
  const transactions = allTransactions
    .filter(tx => {
      if (tx.date < start || tx.date > end) return false;
      if (historyState.accountId && tx.fromAccountId !== historyState.accountId && tx.toAccountId !== historyState.accountId) return false;
      if (historyState.categoryId && tx.categoryId !== historyState.categoryId) return false;
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

  container.innerHTML = `
    <div class="history-screen premium-mode fadeIn">
      <!-- Summary Master Card -->
      <div class="total-summary-card">
        <div style="font-size: 0.75rem; opacity: 0.8; font-weight: 600; letter-spacing: 1px; margin-bottom: 4px;">
           ${escape(start.replace(/-/g, '.'))} — ${escape(end.replace(/-/g, '.'))}
        </div>
        <div class="total-amount">¥${filteredBalance.toLocaleString('ja-JP')}</div>
        <div style="font-size: 0.7rem; opacity: 0.7; font-weight: 600;">
          ${historyState.accountId ? escape(accounts.find(a => a.id === historyState.accountId)?.name || '選択中口座') + ' の残高' : '総資産額'}
        </div>
      </div>

      <!-- Advanced Filters (Segmented Control) -->
      <div class="analysis-segmented-control" style="margin-bottom: 12px;">
        <button class="segmented-item ${historyState.periodType === 'week' ? 'active' : ''}" data-action="setPeriod" data-val="week">週</button>
        <button class="segmented-item ${historyState.periodType === 'month' ? 'active' : ''}" data-action="setPeriod" data-val="month">月</button>
        <button class="segmented-item ${historyState.periodType === 'year' ? 'active' : ''}" data-action="setPeriod" data-val="year">年</button>
        <button class="segmented-item ${historyState.periodType === 'custom' ? 'active' : ''}" data-action="setPeriod" data-val="custom">指定</button>
      </div>

      <!-- Object Selectors (Stylish UI) -->
      <div class="premium-card-v3" style="padding: 12px; margin-bottom: 20px;">
        <div class="select-v3-container" style="display: flex; gap: 8px;">
          <select data-action="filterAccount" class="select-v3" style="flex: 1;">
            <option value="">🏦 全口座</option>
            ${accounts.map(a => `<option value="${a.id}" ${historyState.accountId === a.id ? 'selected' : ''}>${a.icon} ${escape(a.name)}</option>`).join('')}
          </select>
          <select data-action="filterCategory" class="select-v3" style="flex: 1;">
            <option value="">🏷️ 全カテゴリ</option>
            ${categories.map(c => `<option value="${c.id}" ${historyState.categoryId === c.id ? 'selected' : ''}>${c.icon} ${escape(c.name)}</option>`).join('')}
          </select>
        </div>
        <div class="period-nav-strip" style="margin-top: 12px; border-top: 1px solid var(--border-light); padding-top: 12px;">
          <button class="nav-round-btn" data-action="prevPeriod">‹</button>
          <div class="period-display" style="font-size: 0.8rem; font-weight: 800; color: var(--premium-deep);">${escape(formatDateLabel(start))} — ${escape(formatDateLabel(end))}</div>
          <button class="nav-round-btn" data-action="nextPeriod">›</button>
        </div>
      </div>

      <div class="history-list">
        ${groupedTransactions.length === 0 ? `
          <div class="premium-card-v3" style="text-align: center; padding: 60px var(--space-md);">
            <div style="font-size: 3.5rem; margin-bottom: 20px; opacity: 0.5;">📋</div>
            <div style="color: var(--text-muted); font-weight: 700; font-size: 0.9rem;">対象期間に取引がありません</div>
          </div>
        ` : groupedTransactions.map(group => `
          <div class="history-date-group">
            <div style="font-size: 0.75rem; font-weight: 800; color: var(--text-muted); margin: 24px 0 8px 8px; display: flex; align-items: center; gap: 8px; letter-spacing: 0.5px;">
              <span style="color: var(--premium-deep); font-weight: 900;">${group.date.slice(5).replace('-', '/')}</span>
              <span>${formatDateLabel(group.date)}</span>
            </div>
            <div class="premium-card-v3" style="padding: 2px 0;">
              ${group.items.map((tx, idx) => renderHistoryItem(tx, txRunningBalances[tx.id], idx === group.items.length - 1)).join('')}
            </div>
          </div>
        `).join('')}
      </div>
    </div>
  `;

  bindEvents(container);
}

function bindEvents(container) {
  const refresh = () => render(container);

  container.querySelectorAll('[data-action="setPeriod"]').forEach(b => b.onclick = (e) => {
    const val = e.currentTarget.dataset.val;
    if (val === 'custom') showCustomPeriodModal(container);
    else { historyState.periodType = val; historyState.referenceDate = new Date(); refresh(); }
  });
  
  container.querySelectorAll('[data-action="prevPeriod"]').forEach(b => b.onclick = () => { updateRefDate(-1); refresh(); });
  container.querySelectorAll('[data-action="nextPeriod"]').forEach(b => b.onclick = () => { updateRefDate(1); refresh(); });

  const accSelect = container.querySelector('[data-action="filterAccount"]');
  if (accSelect) accSelect.onchange = e => {
    historyState.accountId = e.target.value;
    refresh();
  };

  const catSelect = container.querySelector('[data-action="filterCategory"]');
  if (catSelect) catSelect.onchange = e => {
    historyState.categoryId = e.target.value;
    refresh();
  };

  container.onclick = handleClick;
}

function updateRefDate(dir) {
  const d = new Date(historyState.referenceDate);
  if (historyState.periodType === 'week') d.setDate(d.getDate() + (dir * 7));
  else if (historyState.periodType === 'month') d.setMonth(d.getMonth() + dir);
  else if (historyState.periodType === 'year') d.setFullYear(d.getFullYear() + dir);
  historyState.referenceDate = d;
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
  if (tx.type === 'expense') accountLabel = fromName;
  else if (tx.type === 'income') accountLabel = toName;
  else accountLabel = `${fromName} → ${toName}`;

  const typeLabel = tx.type === 'expense' ? '-' : tx.type === 'income' ? '+' : '';
  const amountColor = tx.type === 'expense' ? 'var(--color-expense)' : tx.type === 'income' ? 'var(--color-income)' : 'var(--color-transfer)';

  return `
    <div class="category-item-v3" data-action="editTx" data-id="${tx.id}" style="${isLast ? 'border-bottom: none;' : ''} padding: 14px 16px;">
      <div class="cat-icon-frame" style="background: var(--bg-primary); border: 1px solid var(--border-light); font-size: 1.1rem;">${escape(icon)}</div>
      <div class="cat-info-v3" style="flex: 1;">
        <div class="cat-title-row">
          <span class="cat-name-v3" style="font-size: 0.9rem; font-weight: 700; color: var(--premium-deep);">${escape(categoryName)}</span>
          <span class="cat-amount-v3" style="color: ${amountColor}; font-weight: 800; font-size: 1rem;">${typeLabel}¥${Number(tx.amount).toLocaleString('ja-JP')}</span>
        </div>
        <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 4px;">
          <div style="font-size: 0.7rem; color: var(--text-muted); font-weight: 600;">
            ${escape(accountLabel)}${tx.memo ? ` <span style="opacity: 0.6; font-weight: 400; color: var(--text-secondary);">| ${escape(tx.memo)}</span>` : ''}
          </div>
          <div style="font-size: 0.65rem; color: var(--text-muted); font-weight: 700; font-variant-numeric: tabular-nums; opacity: 0.9;">
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
  const dateObj = new Date(parts[0], parts[1] - 1, parts[2]);
  const days = ['日', '月', '火', '水', '木', '金', '土'];
  return `${dateObj.getMonth() + 1}月${dateObj.getDate()}日（${days[dateObj.getDay()]}）`;
}

function showCustomPeriodModal(container) {
  const existing = document.getElementById('custom-period-modal');
  if (existing) existing.remove();
  
  const modal = document.createElement('div');
  modal.id = 'custom-period-modal';
  modal.className = 'premium-modal-overlay fadeIn';
  
  const now = new Date();
  const ds = historyState.customStart || new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
  const de = historyState.customEnd || now.toISOString().split('T')[0];
  
  modal.innerHTML = `
    <div class="premium-modal-sheet slideUp">
      <div class="modal-drag-handle"></div>
      <div class="modal-header-v3">
        <h3 class="modal-title-v3">📅 期間を指定</h3>
        <button class="modal-close-v3" data-action="closeModal">&times;</button>
      </div>
      <div class="modal-body-v3">
        <div class="date-row-v3">
          <div class="date-field-v3">
            <label>開始日</label>
            <input type="date" id="modal-start-date" value="${ds}">
          </div>
          <div class="date-arrow-v3">→</div>
          <div class="date-field-v3">
            <label>終了日</label>
            <input type="date" id="modal-end-date" value="${de}">
          </div>
        </div>
      </div>
      <div class="modal-footer-v3">
        <button class="modal-apply-btn-v3">この期間で表示</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);

  const close = () => {
    const sheet = modal.querySelector('.premium-modal-sheet');
    sheet.style.transform = 'translateY(100%)';
    modal.style.opacity = '0';
    setTimeout(() => modal.remove(), 300);
  };

  modal.addEventListener('click', (e) => {
    if (e.target === modal || e.target.closest('[data-action="closeModal"]')) close();
  });

  modal.querySelector('.modal-apply-btn-v3').onclick = () => {
    const startVal = document.getElementById('modal-start-date').value;
    const endVal = document.getElementById('modal-end-date').value;
    if (startVal && endVal) {
      historyState.customStart = startVal;
      historyState.customEnd = endVal;
      historyState.periodType = 'custom';
      close();
      render(container);
    } else {
      window.showToast?.('日付を入力してください', 'error');
    }
  };
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
  if (container) render(container);
}
