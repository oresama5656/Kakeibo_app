// ============================================
// 入力画面
// ============================================

import * as store from '../store.js';

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

function resetState() {
  state = {
    ...state,
    amount: '',
    fromAccount: null,
    toAccount: null,
    category: null,
    date: new Date().toISOString().split('T')[0],
    memo: '',
    accountsExpanded: false,
    categoriesExpanded: false,
  };
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

export function render(container) {
  const accounts = store.getAccounts();
  const allCategories = store.getCategories();
  const shortcuts = store.getShortcuts();

  // Filter categories by type
  const categories = state.type === 'transfer'
    ? []
    : allCategories.filter(c => c.type === state.type || c.type === 'both');

  const showFromAccount = state.type === 'expense' || state.type === 'transfer';
  const showToAccount = state.type === 'income' || state.type === 'transfer';
  const showCategories = state.type !== 'transfer';

  container.innerHTML = `
    <div class="input-screen">
      <!-- Type Toggle -->
      <div class="type-toggle">
        <button class="type-btn ${state.type === 'expense' ? 'active' : ''}" data-type="expense" data-action="setType">支出</button>
        <button class="type-btn ${state.type === 'income' ? 'active' : ''}" data-type="income" data-action="setType">収入</button>
        <button class="type-btn ${state.type === 'transfer' ? 'active' : ''}" data-type="transfer" data-action="setType">振替</button>
      </div>

      <!-- Amount -->
      <div class="amount-display">
        <div class="amount-value ${state.type}">${formatAmount(state.amount)}</div>
      </div>

      <!-- Scrollable Fields -->
      <div class="input-fields">
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
          accounts,
          state.fromAccount,
          state.accountsExpanded,
          'selectFromAccount',
          'toggleAccounts',
          state.type === 'transfer' ? '💴 出金元' : '💴 口座'
        ) : ''}

        ${showToAccount ? renderIconGrid(
          accounts,
          state.toAccount,
          state.type === 'transfer' ? state.accountsExpanded : false,
          'selectToAccount',
          'toggleAccounts',
          state.type === 'transfer' ? '💴 入金先' : '💴 入金口座'
        ) : ''}

        ${showCategories ? renderIconGrid(
          categories,
          state.category,
          state.categoriesExpanded,
          'selectCategory',
          'toggleCategories',
          '📁 カテゴリー'
        ) : ''}

        <!-- Date & Memo -->
        <div class="meta-row">
          <input type="date" class="date-input" value="${state.date}" data-action="setDate">
          <input type="text" placeholder="メモ（任意）" value="${state.memo}" data-action="setMemo">
        </div>
      </div>

      <!-- Numpad -->
      <div class="numpad">
        <button class="numpad-btn" data-action="numpad" data-val="7">7</button>
        <button class="numpad-btn" data-action="numpad" data-val="8">8</button>
        <button class="numpad-btn" data-action="numpad" data-val="9">9</button>
        <button class="numpad-btn" data-action="numpad" data-val="4">4</button>
        <button class="numpad-btn" data-action="numpad" data-val="5">5</button>
        <button class="numpad-btn" data-action="numpad" data-val="6">6</button>
        <button class="numpad-btn" data-action="numpad" data-val="1">1</button>
        <button class="numpad-btn" data-action="numpad" data-val="2">2</button>
        <button class="numpad-btn" data-action="numpad" data-val="3">3</button>
        <button class="numpad-btn clear" data-action="numpad" data-val="C">C</button>
        <button class="numpad-btn" data-action="numpad" data-val="0">0</button>
        <button class="numpad-btn submit ${state.type}-mode" data-action="submit">✓</button>
      </div>
    </div>
  `;

  // Event delegation
  container.addEventListener('click', handleClick);
  container.querySelector('[data-action="setDate"]')?.addEventListener('change', e => {
    state.date = e.target.value;
  });
  container.querySelector('[data-action="setMemo"]')?.addEventListener('input', e => {
    state.memo = e.target.value;
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
      refresh();
      break;

    case 'numpad': {
      const val = target.dataset.val;
      if (val === 'C') {
        state.amount = '';
      } else {
        if (state.amount.length < 10) {
          state.amount += val;
        }
      }
      // Just update the display without full re-render
      const display = document.querySelector('.amount-value');
      if (display) {
        display.textContent = formatAmount(state.amount);
        display.classList.add('bounce');
        setTimeout(() => display.classList.remove('bounce'), 150);
      }
      break;
    }

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

  const typeLabel = getTypeLabel(state.type);
  window.showToast?.(`${typeLabel} ${formatAmount(state.amount)} を記録しました ✓`);

  resetState();
  refresh();
}

function refresh() {
  const container = document.getElementById('screen-input');
  if (container) {
    container.removeEventListener('click', handleClick);
    render(container);
  }
}
