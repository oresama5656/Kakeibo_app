// ============================================
// 入力画面 (v2 - テンキー廃止、一括入力対応)
// ============================================

import * as store from '../store.js';

let lastUsedDate = localStorage.getItem('kakeibo_last_date') || '';

let state = {
  type: 'expense',
  amount: '',
  fromAccount: null,
  toAccount: null,
  category: null,
  date: new Date().toISOString().split('T')[0],
  memo: '',
  accountsExpanded: false,
  categoriesExpanded: false,
};

// Bulk input state (PC only)
let bulkRows = [];
let showBulkInput = false;

function resetState() {
  state = {
    ...state,
    amount: '',
    fromAccount: null,
    toAccount: null,
    category: null,
    memo: '',
    accountsExpanded: false,
    categoriesExpanded: false,
  };
  // Keep date (user often enters multiple items on same date)
}

function formatAmount(val) {
  if (!val) return '¥0';
  return '¥' + Number(val).toLocaleString('ja-JP');
}

function sortItems(items) {
  const pinned = items.filter(i => i.pinned).sort((a, b) => a.order - b.order);
  const rest = items.filter(i => !i.pinned).sort((a, b) => a.order - b.order);
  return { pinned, rest, all: [...pinned, ...rest] };
}

function renderIconGrid(items, selectedName, expanded, onSelect, onToggle, sectionTitle) {
  const { pinned, rest, all } = sortItems(items);
  const showExpand = rest.length > 0;
  const displayItems = expanded ? all : pinned;

  return `
    <div class="selector-section">
      <div class="selector-header">
        <span class="selector-title">${sectionTitle}</span>
        ${showExpand ? `
          <button class="selector-expand" data-action="${onToggle}">
            ${expanded ? '▲ 閉じる' : `▼ もっと見る (${rest.length})`}
          </button>
        ` : ''}
      </div>
      <div class="icon-grid ${expanded ? 'expanded' : ''}">
        ${displayItems.map(item => `
          <div class="icon-item ${item.name === selectedName ? 'selected' : ''} ${!item.pinned && expanded ? 'extra' : ''}"
               data-action="${onSelect}" data-name="${item.name}">
            <span class="icon-emoji">${item.icon}</span>
            <span class="icon-label">${item.name}</span>
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

function getTypeLabel(type) {
  switch (type) {
    case 'expense': return '支出';
    case 'income': return '収入';
    case 'transfer': return '振替';
  }
}

function getTodayStr() {
  return new Date().toISOString().split('T')[0];
}

export function render(container) {
  const accounts = store.getAccounts();
  const allCategories = store.getCategories();
  const shortcuts = store.getShortcuts();

  const categories = state.type === 'transfer'
    ? []
    : allCategories.filter(c => c.type === state.type || c.type === 'both');

  const showFromAccount = state.type === 'expense' || state.type === 'transfer';
  const showToAccount = state.type === 'income' || state.type === 'transfer';
  const showCategories = state.type !== 'transfer';

  const isPC = window.innerWidth >= 768;

  container.innerHTML = `
    <div class="input-screen">
      <!-- Type Toggle -->
      <div class="type-toggle">
        <button class="type-btn ${state.type === 'expense' ? 'active' : ''}" data-type="expense" data-action="setType">支出</button>
        <button class="type-btn ${state.type === 'income' ? 'active' : ''}" data-type="income" data-action="setType">収入</button>
        <button class="type-btn ${state.type === 'transfer' ? 'active' : ''}" data-type="transfer" data-action="setType">振替</button>
        ${isPC ? `<button class="type-btn bulk-toggle ${showBulkInput ? 'active' : ''}" data-action="toggleBulk" style="border-color: var(--color-accent); color: var(--color-accent); ${showBulkInput ? 'background: var(--color-accent); color: white;' : ''}">📋 一括入力</button>` : ''}
      </div>

      ${showBulkInput && isPC ? renderBulkInput(accounts, allCategories) : renderSingleInput(accounts, categories, shortcuts, showFromAccount, showToAccount, showCategories)}
    </div>
  `;

  bindEvents(container);
}

function renderSingleInput(accounts, categories, shortcuts, showFromAccount, showToAccount, showCategories) {
  return `
    <!-- Scrollable Fields -->
    <div class="input-fields">
      <!-- Amount Input -->
      <div class="amount-input-section">
        <div class="amount-input-wrapper">
          <span class="amount-yen">¥</span>
          <input type="number" class="amount-field" id="amount-input"
                 value="${state.amount}" placeholder="0"
                 inputmode="numeric" min="0" data-action="setAmount">
        </div>
      </div>

      ${shortcuts.length > 0 ? `
        <div class="shortcuts-section">
          <div class="selector-header">
            <span class="selector-title">⚡ ショートカット</span>
          </div>
          <div class="shortcuts-scroll">
            ${shortcuts.map(sc => `
              <button class="shortcut-chip" data-action="useShortcut" data-id="${sc.id}">
                ${sc.name}
              </button>
            `).join('')}
          </div>
        </div>
      ` : ''}

      ${showFromAccount ? renderIconGrid(
    accounts, state.fromAccount, state.accountsExpanded,
    'selectFromAccount', 'toggleAccounts',
    state.type === 'transfer' ? '💴 出金元' : '💴 口座'
  ) : ''}

      ${showToAccount ? renderIconGrid(
    accounts, state.toAccount,
    state.type === 'transfer' ? state.accountsExpanded : false,
    'selectToAccount', 'toggleAccounts',
    state.type === 'transfer' ? '💴 入金先' : '💴 入金口座'
  ) : ''}

      ${showCategories ? renderIconGrid(
    categories, state.category, state.categoriesExpanded,
    'selectCategory', 'toggleCategories',
    '📁 カテゴリー'
  ) : ''}

      <!-- Date with shortcuts & Memo -->
      <div class="selector-section">
        <div class="selector-header">
          <span class="selector-title">📅 日付</span>
        </div>
        <div class="date-row">
          <input type="date" class="date-input" value="${state.date}" data-action="setDate">
          <button class="date-shortcut-btn" data-action="dateToday">今日</button>
          <button class="date-shortcut-btn" data-action="dateLast" ${!lastUsedDate ? 'disabled' : ''}>
            最終${lastUsedDate ? ` (${formatShortDate(lastUsedDate)})` : ''}
          </button>
        </div>
        <div style="margin-top: var(--space-sm);">
          <input type="text" placeholder="メモ（任意）" value="${state.memo}" data-action="setMemo" style="width: 100%; height: 40px;">
        </div>
      </div>

      <!-- Submit Button -->
      <button class="submit-btn ${state.type}-mode" data-action="submit">
        ${getTypeLabel(state.type)}を記録する ✓
      </button>
    </div>
  `;
}

function renderBulkInput(accounts, allCategories) {
  const expenseCategories = allCategories.filter(c => c.type === 'expense' || c.type === 'both');
  const incomeCategories = allCategories.filter(c => c.type === 'income' || c.type === 'both');
  const categories = state.type === 'expense' ? expenseCategories : state.type === 'income' ? incomeCategories : [];

  if (bulkRows.length === 0) {
    bulkRows = [createBulkRow()];
  }

  return `
    <div class="input-fields bulk-input-section">
      <div class="selector-section">
        <div class="selector-header">
          <span class="selector-title">📋 一括入力 (${state.type === 'expense' ? '支出' : state.type === 'income' ? '収入' : '振替'})</span>
          <button class="selector-expand" data-action="addBulkRow">＋ 行を追加</button>
        </div>

        <div class="bulk-table-wrapper">
          <table class="bulk-table">
            <thead>
              <tr>
                <th>日付</th>
                <th>金額</th>
                ${state.type !== 'transfer' ? '<th>カテゴリー</th>' : ''}
                <th>${state.type === 'income' ? '入金先' : '出金元'}</th>
                ${state.type === 'transfer' ? '<th>入金先</th>' : ''}
                <th>メモ</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              ${bulkRows.map((row, i) => `
                <tr data-row="${i}">
                  <td><input type="date" value="${row.date}" data-field="date" data-row="${i}" class="bulk-input"></td>
                  <td><input type="number" value="${row.amount}" data-field="amount" data-row="${i}" class="bulk-input" placeholder="0" min="0"></td>
                  ${state.type !== 'transfer' ? `
                    <td><select data-field="category" data-row="${i}" class="bulk-input">
                      <option value="">--</option>
                      ${categories.map(c => `<option value="${c.name}" ${c.name === row.category ? 'selected' : ''}>${c.icon} ${c.name}</option>`).join('')}
                    </select></td>
                  ` : ''}
                  <td><select data-field="${state.type === 'income' ? 'toAccount' : 'fromAccount'}" data-row="${i}" class="bulk-input">
                    <option value="">--</option>
                    ${accounts.map(a => {
    const val = state.type === 'income' ? row.toAccount : row.fromAccount;
    return `<option value="${a.name}" ${a.name === val ? 'selected' : ''}>${a.icon} ${a.name}</option>`;
  }).join('')}
                  </select></td>
                  ${state.type === 'transfer' ? `
                    <td><select data-field="toAccount" data-row="${i}" class="bulk-input">
                      <option value="">--</option>
                      ${accounts.map(a => `<option value="${a.name}" ${a.name === row.toAccount ? 'selected' : ''}>${a.icon} ${a.name}</option>`).join('')}
                    </select></td>
                  ` : ''}
                  <td><input type="text" value="${row.memo || ''}" data-field="memo" data-row="${i}" class="bulk-input" placeholder="メモ"></td>
                  <td><button class="bulk-delete-btn" data-action="deleteBulkRow" data-row="${i}">✕</button></td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>

        <div class="form-actions" style="margin-top: var(--space-md);">
          <button class="btn btn-secondary" data-action="addBulkRow">＋ 行を追加</button>
          <button class="btn btn-primary" data-action="submitBulk">一括登録 (${bulkRows.length}件)</button>
        </div>
      </div>
    </div>
  `;
}

function createBulkRow() {
  return {
    date: state.date,
    amount: '',
    category: '',
    fromAccount: '',
    toAccount: '',
    memo: '',
  };
}

function formatShortDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

function bindEvents(container) {
  container.addEventListener('click', handleClick);

  // Amount input
  container.querySelector('#amount-input')?.addEventListener('input', e => {
    state.amount = e.target.value;
  });

  // Date
  container.querySelector('[data-action="setDate"]')?.addEventListener('change', e => {
    state.date = e.target.value;
  });

  // Memo
  container.querySelector('[data-action="setMemo"]')?.addEventListener('input', e => {
    state.memo = e.target.value;
  });

  // Bulk input field changes
  container.querySelectorAll('.bulk-input').forEach(input => {
    const event = input.tagName === 'SELECT' ? 'change' : 'input';
    input.addEventListener(event, e => {
      const row = Number(e.target.dataset.row);
      const field = e.target.dataset.field;
      if (bulkRows[row]) {
        bulkRows[row][field] = e.target.value;
      }
    });
  });
}

function handleClick(e) {
  const target = e.target.closest('[data-action]');
  if (!target) return;

  const action = target.dataset.action;

  switch (action) {
    case 'setType':
      state.type = target.dataset.type;
      state.category = null;
      state.categoriesExpanded = false;
      bulkRows = [];
      refresh();
      break;

    case 'selectFromAccount':
      state.fromAccount = target.dataset.name;
      refresh();
      break;

    case 'selectToAccount':
      state.toAccount = target.dataset.name;
      refresh();
      break;

    case 'selectCategory':
      state.category = target.dataset.name;
      refresh();
      break;

    case 'toggleAccounts':
      state.accountsExpanded = !state.accountsExpanded;
      refresh();
      break;

    case 'toggleCategories':
      state.categoriesExpanded = !state.categoriesExpanded;
      refresh();
      break;

    case 'dateToday':
      state.date = getTodayStr();
      refresh();
      break;

    case 'dateLast':
      if (lastUsedDate) {
        state.date = lastUsedDate;
        refresh();
      }
      break;

    case 'toggleBulk':
      showBulkInput = !showBulkInput;
      if (showBulkInput && bulkRows.length === 0) {
        bulkRows = [createBulkRow()];
      }
      refresh();
      break;

    case 'addBulkRow':
      bulkRows.push(createBulkRow());
      refresh();
      break;

    case 'deleteBulkRow': {
      const rowIdx = Number(target.dataset.row);
      bulkRows.splice(rowIdx, 1);
      if (bulkRows.length === 0) bulkRows.push(createBulkRow());
      refresh();
      break;
    }

    case 'submitBulk':
      submitBulk();
      break;

    case 'useShortcut': {
      const shortcuts = store.getShortcuts();
      const sc = shortcuts.find(s => s.id === target.dataset.id);
      if (sc) {
        state.type = sc.type || 'expense';
        state.amount = String(sc.amount || '');
        state.category = sc.category || null;
        state.fromAccount = sc.fromAccount || null;
        state.toAccount = sc.toAccount || null;
        refresh();
      }
      break;
    }

    case 'submit':
      submitTransaction();
      break;
  }
}

function submitTransaction() {
  const amount = Number(state.amount);
  if (!amount || amount <= 0) {
    window.showToast?.('金額を入力してください', 'error');
    return;
  }
  if (state.type === 'expense' && !state.fromAccount) {
    window.showToast?.('口座を選択してください', 'error');
    return;
  }
  if (state.type === 'income' && !state.toAccount) {
    window.showToast?.('入金口座を選択してください', 'error');
    return;
  }
  if (state.type === 'transfer' && (!state.fromAccount || !state.toAccount)) {
    window.showToast?.('出金元と入金先を選択してください', 'error');
    return;
  }
  if (state.type !== 'transfer' && !state.category) {
    window.showToast?.('カテゴリーを選択してください', 'error');
    return;
  }

  const tx = {
    date: state.date,
    type: state.type,
    amount: amount,
    category: state.category || '',
    fromAccount: state.fromAccount || '',
    toAccount: state.toAccount || '',
    memo: state.memo,
  };

  store.addTransaction(tx);

  // Save last used date
  lastUsedDate = state.date;
  localStorage.setItem('kakeibo_last_date', lastUsedDate);

  window.showToast?.(`${getTypeLabel(state.type)} ${formatAmount(state.amount)} を記録しました ✓`);
  resetState();
  refresh();
}

function submitBulk() {
  const validRows = bulkRows.filter(r => Number(r.amount) > 0);
  if (validRows.length === 0) {
    window.showToast?.('金額を入力してください', 'error');
    return;
  }

  let errors = [];
  validRows.forEach((row, i) => {
    if (state.type === 'expense' && !row.fromAccount) errors.push(`行${i + 1}: 口座未選択`);
    if (state.type === 'income' && !row.toAccount) errors.push(`行${i + 1}: 入金先未選択`);
    if (state.type !== 'transfer' && !row.category) errors.push(`行${i + 1}: カテゴリー未選択`);
  });

  if (errors.length > 0) {
    window.showToast?.(errors[0], 'error');
    return;
  }

  let count = 0;
  for (const row of validRows) {
    store.addTransaction({
      date: row.date || state.date,
      type: state.type,
      amount: Number(row.amount),
      category: row.category || '',
      fromAccount: row.fromAccount || '',
      toAccount: row.toAccount || '',
      memo: row.memo || '',
    });
    count++;
  }

  lastUsedDate = validRows[validRows.length - 1]?.date || state.date;
  localStorage.setItem('kakeibo_last_date', lastUsedDate);

  window.showToast?.(`${count}件の${getTypeLabel(state.type)}を一括登録しました ✓`);
  bulkRows = [createBulkRow()];
  refresh();
}

function refresh() {
  const container = document.getElementById('screen-input');
  if (container) {
    container.removeEventListener('click', handleClick);
    render(container);
    // Force reset scroll to left/top
    container.scrollLeft = 0;
    container.scrollTop = 0;
    window.scrollTo(0, 0);
    
    // Focus amount input after re-render (for PC version only)
    if (!showBulkInput && window.innerWidth >= 768) {
      setTimeout(() => {
        document.getElementById('amount-input')?.focus();
      }, 50);
    }
  }
}
