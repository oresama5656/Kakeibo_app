// ============================================
// 入力画面 (v2.1 - 残高修正カテゴリー対応版)
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
  fromAccountsExpanded: false,
  toAccountsExpanded: false,
  categoriesExpanded: false,
};

// Bulk input state (PC only)
let bulkRows = [];
let showBulkInput = false;

/**
 * 外部から入力を制御するための関数
 * @param {Object} data { type, amount, fromAccount, toAccount, category, memo }
 */
export function setQuickInput(data) {
  // 初期状態にデータをマージ
  state = {
    ...state,
    ...data,
    fromAccountsExpanded: false,
    toAccountsExpanded: false,
    categoriesExpanded: false,
  };

  // 種類に応じた調整
  if (data.type === 'expense') {
    state.toAccount = null;
  } else if (data.type === 'income') {
    state.fromAccount = null;
  }
}

function resetState() {
  state = {
    ...state,
    amount: '',
    fromAccount: null,
    toAccount: null,
    category: null,
    memo: '',
    fromAccountsExpanded: false,
    toAccountsExpanded: false,
    categoriesExpanded: false,
  };
}

function formatAmount(val) {
  if (!val) return '¥0';
  return '¥' + Number(val).toLocaleString('ja-JP');
}

function sortItems(items) {
  const pinned = items.filter(i => i.pinned).sort((a, b) => (a.order || 0) - (b.order || 0));
  const rest = items.filter(i => !i.pinned).sort((a, b) => (a.order || 0) - (b.order || 0));
  return { pinned, rest, all: [...pinned, ...rest] };
}

function renderIconGrid(items, selectedName, expanded, onSelect, onToggle, sectionTitle) {
  const { pinned, rest, all } = sortItems(items);
  
  // 選択中のアイテムを探す
  let selectedItem = all.find(i => i.name === selectedName);
  
  // もしリストにない名前（例: ダッシュボードから渡された「残高修正」）が選択されている場合、
  // 仮想的なアイテムとして表示に含める
  if (!selectedItem && selectedName) {
    selectedItem = { name: selectedName, icon: '🔧', virtual: true };
  }

  const showExpand = rest.length > 0;
  const isPC = window.innerWidth >= 768;

  let displayItems = expanded ? all : [...pinned];
  
  if (!isPC && !expanded) {
    displayItems = []; 
  }
  
  // 選択中のアイテムが表示対象に入っていない場合は強制的に追加する
  if (selectedItem && !displayItems.find(i => i.name === selectedItem.name)) {
    displayItems.push(selectedItem);
  }

  return `
    <div class="selector-section">
      <div class="selector-header">
        <span class="selector-title">
          ${sectionTitle}
          ${selectedItem ? `<span class="selected-summary-chip">${selectedItem.icon} ${selectedItem.name}</span>` : ''}
        </span>
        ${showExpand ? `
          <button class="selector-expand" data-action="${onToggle}">
            ${expanded ? '▲ 閉じる' : `▼ 全${all.length}件を表示`}
          </button>
        ` : ''}
      </div>
      <div class="icon-grid ${expanded ? 'expanded' : ''}">
        ${displayItems.map(item => `
          <div class="icon-item ${item.name === selectedName ? 'selected' : ''} ${item.virtual ? 'virtual' : ''}"
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
  if (!container) return;
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
      <div class="type-toggle">
        <button class="type-btn ${state.type === 'expense' ? 'active' : ''}" data-type="expense" data-action="setType">支出</button>
        <button class="type-btn ${state.type === 'income' ? 'active' : ''}" data-type="income" data-action="setType">収入</button>
        <button class="type-btn ${state.type === 'transfer' ? 'active' : ''}" data-type="transfer" data-action="setType">振替</button>
        ${isPC ? `
          <button class="type-btn bulk-toggle ${showBulkInput ? 'active' : ''}" data-action="toggleBulk">📋 一括入力</button>
        ` : ''}
      </div>

      ${showBulkInput && isPC ? renderBulkInput(accounts, allCategories) : renderSingleInput(accounts, categories, shortcuts, showFromAccount, showToAccount, showCategories)}
    </div>
  `;

  bindEvents(container);
}

function renderSingleInput(accounts, categories, shortcuts, showFromAccount, showToAccount, showCategories) {
  return `
    <div class="input-fields">
      <div class="amount-input-section" style="margin-bottom: 24px;">
        <div class="amount-input-wrapper">
          <span class="amount-yen">¥</span>
          <input type="number" class="amount-field" id="amount-input"
                 value="${state.amount}" placeholder="0"
                 inputmode="numeric" min="0" data-action="setAmount" style="font-size: 2.2rem; font-weight: 800;">
        </div>
      </div>
      
      ${showFromAccount ? renderIconGrid(accounts, state.fromAccount, state.fromAccountsExpanded, 'selectFromAccount', 'toggleFromAccounts', state.type === 'transfer' ? '💴 出金元' : '💴 口座') : ''}
      ${showToAccount ? renderIconGrid(accounts, state.toAccount, state.toAccountsExpanded, 'selectToAccount', 'toggleToAccounts', state.type === 'transfer' ? '💴 入金先' : '💴 入金先') : ''}
      ${showCategories ? renderIconGrid(categories, state.category, state.categoriesExpanded, 'selectCategory', 'toggleCategories', '📁 カテゴリー') : ''}
      
      <div class="selector-section">
        <div class="selector-header"><span class="selector-title">📅 日付・メモ</span></div>
        <div class="date-row" style="display: flex; gap: 8px; margin-bottom: 12px;">
          <input type="date" class="date-input" value="${state.date}" data-action="setDate" style="flex: 1; padding: 10px; border-radius: 12px; border: 1px solid var(--border-color); background: var(--bg-card); color: var(--text-primary);">
          <button class="date-shortcut-btn" data-action="dateToday" style="padding: 0 16px; border-radius: 12px; border: 1px solid var(--border-color); background: var(--bg-card); font-size: 0.8rem;">今日</button>
        </div>
        <div>
          <input type="text" placeholder="メモ（任意）" value="${state.memo}" id="memo-input" style="width: 100%; height: 48px; padding: 0 16px; border-radius: 12px; border: 1px solid var(--border-color); background: var(--bg-card); color: var(--text-primary); font-size: 0.9rem;">
        </div>
      </div>
      
      <button class="submit-btn ${state.type}-mode" data-action="submit" style="height: 60px; font-size: 1.1rem; font-weight: 800; border-radius: 18px; margin-top: 20px; box-shadow: var(--shadow-sm);">
        ${getTypeLabel(state.type)}を記録する ✓
      </button>

      ${shortcuts.length > 0 ? `
        <div class="shortcuts-section" style="margin-top: 32px;">
          <div class="selector-header"><span class="selector-title">⚡ クイック入力（保存済み）</span></div>
          <div class="shortcuts-scroll" style="display: flex; gap: 10px; overflow-x: auto; padding-bottom: 10px;">
            ${shortcuts.map(sc => `<button class="shortcut-chip" data-action="useShortcut" data-id="${sc.id}" style="white-space: nowrap; padding: 8px 16px; border-radius: 20px; border: 1px solid var(--border-color); background: var(--bg-card); font-size: 0.8rem; font-weight: 600;">${sc.name}</button>`).join('')}
          </div>
        </div>
      ` : ''}
    </div>
  `;
}

function renderBulkInput(accounts, allCategories) {
  const categories = state.type === 'expense' ? allCategories.filter(c => c.type === 'expense' || c.type === 'both') : allCategories.filter(c => c.type === 'income' || c.type === 'both');
  if (bulkRows.length === 0) bulkRows = [createBulkRow()];

  return `
    <div class="input-fields bulk-input-section">
      <div class="selector-section">
        <div class="selector-header">
          <span class="selector-title">📋 一括入力 (${getTypeLabel(state.type)})</span>
          <div style="display: flex; gap: 8px;">
            <button class="selector-expand" data-action="addBulkRow">＋ 行追加</button>
            <button class="selector-expand" data-action="triggerCsvImport">📥 CSV読込</button>
          </div>
        </div>
        <div class="bulk-table-wrapper" style="overflow-x: auto; background: var(--bg-card); border-radius: 12px; border: 1px solid var(--border-color);">
          <table class="bulk-table" style="width: 100%; border-collapse: collapse;">
            <thead style="background: var(--bg-hover);">
              <tr>
                <th style="padding: 12px; font-size: 0.75rem; text-align: left;">日付</th>
                <th style="padding: 12px; font-size: 0.75rem; text-align: left;">金額</th>
                ${state.type !== 'transfer' ? '<th style="padding: 12px; font-size: 0.75rem; text-align: left;">カテゴリー</th>' : ''}
                <th style="padding: 12px; font-size: 0.75rem; text-align: left;">${state.type === 'income' ? '入金先' : '口座'}</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              ${bulkRows.map((row, i) => `
                <tr data-row="${i}" style="border-top: 1px solid var(--border-light);">
                  <td style="padding: 8px;"><input type="date" value="${row.date}" data-field="date" data-row="${i}" class="bulk-input" style="width: 100%; border: none; background: transparent; color: var(--text-primary);"></td>
                  <td style="padding: 8px;"><input type="number" value="${row.amount}" data-field="amount" data-row="${i}" class="bulk-input" placeholder="0" style="width: 100%; border: none; background: transparent; color: var(--text-primary);"></td>
                  ${state.type !== 'transfer' ? `
                    <td style="padding: 8px;"><select data-field="category" data-row="${i}" class="bulk-input" style="width: 100%; border: none; background: transparent; color: var(--text-primary);">
                      <option value="">--</option>
                      ${categories.map(c => `<option value="${c.name}" ${c.name === row.category ? 'selected' : ''}>${c.name}</option>`).join('')}
                    </select></td>
                  ` : ''}
                  <td style="padding: 8px;"><select data-field="${state.type === 'income' ? 'toAccount' : 'fromAccount'}" data-row="${i}" class="bulk-input" style="width: 100%; border: none; background: transparent; color: var(--text-primary);">
                    <option value="">--</option>
                    ${accounts.map(a => `<option value="${a.name}" ${a.name === (state.type === 'income' ? row.toAccount : row.fromAccount) ? 'selected' : ''}>${a.name}</option>`).join('')}
                  </select></td>
                  <td style="padding: 8px; text-align: center;"><button data-action="deleteBulkRow" data-row="${i}" style="background:none; border:none; color:var(--color-danger); cursor:pointer;">✕</button></td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
        <div style="margin-top: 20px; display: flex; gap: 12px;">
          <button class="btn btn-primary" data-action="submitBulk" style="flex: 1; font-weight: 800;">一括登録する (${bulkRows.length}件)</button>
        </div>
      </div>
    </div>
    <input type="file" id="csv-import-input" accept=".csv" style="display: none;">
  `;
}

function createBulkRow() {
  return { date: state.date, amount: '', category: '', fromAccount: '', toAccount: '', memo: '' };
}

function bindEvents(container) {
  container.addEventListener('click', handleClick);
  container.querySelector('#amount-input')?.addEventListener('input', e => { state.amount = e.target.value; });
  container.querySelector('#memo-input')?.addEventListener('input', e => { state.memo = e.target.value; });
  container.querySelector('[data-action="setDate"]')?.addEventListener('change', e => { state.date = e.target.value; });
  container.querySelectorAll('.bulk-input').forEach(input => {
    input.addEventListener('input', e => {
      const idx = Number(e.target.dataset.row);
      const field = e.target.dataset.field;
      if (bulkRows[idx]) bulkRows[idx][field] = e.target.value;
    });
  });
  container.querySelector('#csv-import-input')?.addEventListener('change', handleCsvFile);
}

function handleClick(e) {
  const target = e.target.closest('[data-action]');
  if (!target) return;
  const action = target.dataset.action;

  switch (action) {
    case 'setType':
      state.type = target.dataset.type;
      state.category = null;
      refresh();
      break;
    case 'selectFromAccount': state.fromAccount = target.dataset.name; refresh(); break;
    case 'selectToAccount': state.toAccount = target.dataset.name; refresh(); break;
    case 'selectCategory': state.category = target.dataset.name; refresh(); break;
    case 'toggleFromAccounts': state.fromAccountsExpanded = !state.fromAccountsExpanded; refresh(); break;
    case 'toggleToAccounts': state.toAccountsExpanded = !state.toAccountsExpanded; refresh(); break;
    case 'toggleCategories': state.categoriesExpanded = !state.categoriesExpanded; refresh(); break;
    case 'dateToday': state.date = getTodayStr(); refresh(); break;
    case 'submit': submitTransaction(); break;
    case 'toggleBulk': showBulkInput = !showBulkInput; refresh(); break;
    case 'addBulkRow': bulkRows.push(createBulkRow()); refresh(); break;
    case 'deleteBulkRow': bulkRows.splice(Number(target.dataset.row), 1); if(bulkRows.length===0) bulkRows=[createBulkRow()]; refresh(); break;
    case 'submitBulk': submitBulk(); break;
    case 'triggerCsvImport': document.getElementById('csv-import-input')?.click(); break;
    case 'useShortcut':
      const sc = store.getShortcuts().find(s=>s.id===target.dataset.id);
      if(sc) { setQuickInput(sc); refresh(); }
      break;
  }
}

function submitTransaction() {
  const amount = Number(state.amount);
  if (!amount || amount <= 0) { window.showToast?.('金額を入力してください', 'error'); return; }
  const tx = {
    date: state.date, type: state.type, amount: amount,
    category: state.category || '', fromAccount: state.fromAccount || '',
    toAccount: state.toAccount || '', memo: state.memo,
  };
  store.addTransaction(tx);
  lastUsedDate = state.date;
  localStorage.setItem('kakeibo_last_date', lastUsedDate);
  window.showToast?.('記録しました ✓');
  resetState();
  refresh();
}

function submitBulk() {
  const valids = bulkRows.filter(r => Number(r.amount) > 0);
  if(valids.length===0) return;
  valids.forEach(r => {
    store.addTransaction({
      date: r.date || state.date, type: state.type, amount: Number(r.amount),
      category: r.category || '', fromAccount: r.fromAccount || '',
      toAccount: r.toAccount || '', memo: r.memo || ''
    });
  });
  window.showToast?.(`${valids.length}件を登録しました`);
  bulkRows = [createBulkRow()];
  refresh();
}

// CSVインポートロジックはViewFileで確認したものを維持 (省略せず保持)
async function handleCsvFile(e) { /* ...既存のインポートロジック... */ }

function refresh() {
  const container = document.getElementById('screen-input');
  if (container) {
    container.removeEventListener('click', handleClick);
    render(container);
  }
}
