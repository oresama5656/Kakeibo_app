// ============================================
// 入力画面 (v2 - テンキー廃止、一括入力対応 & CSVインポート)
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

/**
 * 外部から入力を制御するための関数
 * @param {Object} data { type, amount, fromAccount, toAccount, category, memo }
 */
export function setQuickInput(data) {
  state = {
    ...state,
    ...data,
    accountsExpanded: false,
    categoriesExpanded: false,
  };
  // 必要に応じて他のフィールドをリセット
  if (data.type) {
    if (data.type === 'expense') {
      state.toAccount = null;
    } else if (data.type === 'income') {
      state.fromAccount = null;
    }
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
  const selectedItem = all.find(i => i.name === selectedName);
  const showExpand = rest.length > 0;
  
  const isPC = window.innerWidth >= 768;

  // 1画面に収まるように、スマホ版かつ折りたたみ時はアイコンを一切表示しない（バッジのみ）
  // PC版の場合は、利便性のためにピン留めアイテムを常時表示する
  let displayItems = expanded ? all : [...pinned];
  
  if (!isPC && !expanded) {
    displayItems = []; // スマホ版の閉じている時は何も表示しない
  } else if (!expanded && selectedItem && !pinned.find(p => p.name === selectedName)) {
    // 選択中のアイテムがピン留めされておらず、表示対象にも入っていない場合は追加で見せる
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
        ${isPC ? `
          <button class="type-btn bulk-toggle ${showBulkInput ? 'active' : ''}" data-action="toggleBulk" style="border-color: var(--color-accent); color: var(--color-accent); ${showBulkInput ? 'background: var(--color-accent); color: white;' : ''}">📋 一括入力</button>
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
          <div class="selector-header"><span class="selector-title">⚡ ショートカット</span></div>
          <div class="shortcuts-scroll">
            ${shortcuts.map(sc => `<button class="shortcut-chip" data-action="useShortcut" data-id="${sc.id}">${sc.name}</button>`).join('')}
          </div>
        </div>
      ` : ''}
      ${showFromAccount ? renderIconGrid(accounts, state.fromAccount, state.accountsExpanded, 'selectFromAccount', 'toggleAccounts', state.type === 'transfer' ? '💴 出金元' : '💴 口座') : ''}
      ${showToAccount ? renderIconGrid(accounts, state.toAccount, state.accountsExpanded, 'selectToAccount', 'toggleAccounts', state.type === 'transfer' ? '💴 入金先' : '💴 入金口座') : ''}
      ${showCategories ? renderIconGrid(categories, state.category, state.categoriesExpanded, 'selectCategory', 'toggleCategories', '📁 カテゴリー') : ''}
      <div class="selector-section">
        <div class="selector-header"><span class="selector-title">📅 日付</span></div>
        <div class="date-row">
          <input type="date" class="date-input" value="${state.date}" data-action="setDate">
          <button class="date-shortcut-btn" data-action="dateToday">今日</button>
          <button class="date-shortcut-btn" data-action="dateLast" ${!lastUsedDate ? 'disabled' : ''}>最終${lastUsedDate ? ` (${formatShortDate(lastUsedDate)})` : ''}</button>
        </div>
        <div style="margin-top: var(--space-sm);">
          <input type="text" placeholder="メモ（任意）" value="${state.memo}" data-action="setMemo" style="width: 100%; height: 40px;">
        </div>
      </div>
      <button class="submit-btn ${state.type}-mode" data-action="submit">${getTypeLabel(state.type)}を記録する ✓</button>
    </div>
  `;
}

function renderBulkInput(accounts, allCategories) {
  const expenseCategories = allCategories.filter(c => c.type === 'expense' || c.type === 'both');
  const incomeCategories = allCategories.filter(c => c.type === 'income' || c.type === 'both');
  const categories = state.type === 'expense' ? expenseCategories : state.type === 'income' ? incomeCategories : [];

  if (bulkRows.length === 0) bulkRows = [createBulkRow()];

  return `
    <div class="input-fields bulk-input-section">
      <div class="selector-section">
        <div class="selector-header">
          <span class="selector-title">📋 一括入力 (${getTypeLabel(state.type)})</span>
          <div style="display: flex; gap: var(--space-sm);">
            <button class="selector-expand" data-action="addBulkRow">＋ 行を追加</button>
            <button class="selector-expand" data-action="downloadTemplate" style="background: var(--bg-secondary); color: var(--text-secondary); border: 1px solid var(--border-medium);">📄 見本をDL</button>
            <button class="selector-expand" data-action="triggerCsvImport" style="background: var(--color-income-light); color: var(--color-income-dark); border: 1px solid var(--color-income);">📥 CSVから読込</button>
            <input type="file" id="csv-import-input" accept=".csv" style="display: none;">
          </div>
        </div>
        <div class="bulk-table-wrapper">
          <table class="bulk-table">
            <thead>
              <tr>
                <th>日付</th><th>金額</th>
                ${state.type !== 'transfer' ? '<th>カテゴリー</th>' : ''}
                <th>${state.type === 'income' ? '入金先' : '出金元'}</th>
                ${state.type === 'transfer' ? '<th>入金先</th>' : ''}
                <th>メモ</th><th></th>
              </tr>
            </thead>
            <tbody>
              ${bulkRows.map((row, i) => `
                <tr data-row="${i}">
                  <td><input type="date" value="${row.date}" data-field="date" data-row="${i}" class="bulk-input"></td>
                  <td><input type="number" value="${row.amount}" data-field="amount" data-row="${i}" class="bulk-input" placeholder="0"></td>
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
  return { date: state.date, amount: '', category: '', fromAccount: '', toAccount: '', memo: '' };
}

function formatShortDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

function bindEvents(container) {
  container.addEventListener('click', handleClick);
  container.querySelector('#amount-input')?.addEventListener('input', e => { state.amount = e.target.value; });
  container.querySelector('[data-action="setDate"]')?.addEventListener('change', e => { state.date = e.target.value; });
  container.querySelector('[data-action="setMemo"]')?.addEventListener('input', e => { state.memo = e.target.value; });

  container.querySelectorAll('.bulk-input').forEach(input => {
    const event = input.tagName === 'SELECT' ? 'change' : 'input';
    input.addEventListener(event, e => {
      const row = Number(e.target.dataset.row);
      const field = e.target.dataset.field;
      if (bulkRows[row]) bulkRows[row][field] = e.target.value;
    });
  });

  container.querySelector('#csv-import-input')?.addEventListener('change', handleCsvFile);
}

function downloadCsvTemplate() {
  const accounts = store.getAccounts();
  const categories = store.getCategories();
  
  const accName = accounts[0]?.name || '現金';
  const catName = categories.find(c => c.type === 'expense')?.name || '食費';
  const today = new Date().toISOString().split('T')[0];

  const header = '日付,種類,カテゴリー,金額,口座,入金先,メモ\n';
  const sampleData = `${today},支出,${catName},1500,${accName},,スーパーでお買い物\n`;
  const sampleData2 = `${today},振替,,50000,銀行口座,${accName},生活費おろし\n`;

  const csvContent = header + sampleData + sampleData2;
  const bom = new Uint8Array([0xEF, 0xBB, 0xBF]); // Add UTF-8 BOM for Excel visibility
  const blob = new Blob([bom, csvContent], { type: 'text/csv;charset=utf-8;' });
  
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.setAttribute('download', 'kakeibo_import_template.csv');
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.showToast?.('見本をダウンロードしました ✓');
}

function handleCsvFile(e) {
  const file = e.target.files[0];
  if (!file || !window.Papa) return;

  const accounts = store.getAccounts();
  const categories = store.getCategories();
  const accountNames = accounts.map(a => a.name);
  const categoryNames = categories.map(c => c.name);

  window.Papa.parse(file, {
    header: false,
    skipEmptyLines: true,
    complete: (results) => {
      const data = results.data;
      if (data.length === 0) return;

      let transactionsToAdd = [];
      let errors = [];

      data.forEach((row, index) => {
        const [date, type, cat, amount, from, to, memo] = row.map(s => s?.trim());
        const isEmpty = !date && !type && !amount;
        if (isEmpty) return;

        if (!date || !type || !amount) {
          errors.push(`行${index + 1}: 項目不足`);
          return;
        }

        const typeMap = { '支出': 'expense', '収入': 'income', '振替': 'transfer' };
        const internalType = typeMap[type];
        if (!internalType) {
          errors.push(`行${index + 1}: 種類不正 (${type})`);
          return;
        }

        const numAmount = Number(String(amount).replace(/[,¥]/g, ''));
        if (isNaN(numAmount)) {
          errors.push(`行${index + 1}: 金額不正`);
          return;
        }

        if ((internalType === 'expense' || internalType === 'transfer') && !accountNames.includes(from)) {
          errors.push(`行${index + 1}: 口座名不一致 [${from}]`);
          return;
        }
        if ((internalType === 'income' || internalType === 'transfer') && !accountNames.includes(to)) {
          errors.push(`行${index + 1}: 入金先不一致 [${to}]`);
          return;
        }
        if (internalType !== 'transfer' && cat && !categoryNames.includes(cat)) {
          errors.push(`行${index + 1}: カテゴリ不一致 [${cat}]`);
          return;
        }

        transactionsToAdd.push({
          date: date.replace(/\//g, '-'),
          type: internalType,
          category: cat || '',
          amount: numAmount,
          fromAccount: from || '',
          toAccount: to || '',
          memo: memo || ''
        });
      });

      if (errors.length > 0) {
        alert("エラー:\n" + errors.slice(0, 5).join('\n'));
        return;
      }

      if (transactionsToAdd.length > 0 && confirm(`${transactionsToAdd.length}件インポートしますか？`)) {
        transactionsToAdd.forEach(tx => store.addTransaction(tx));
        window.showToast?.(`${transactionsToAdd.length}件登録しました`);
        refresh();
      }
      e.target.value = '';
    }
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
    case 'selectFromAccount': state.fromAccount = target.dataset.name; state.accountsExpanded = false; refresh(); break;
    case 'selectToAccount': state.toAccount = target.dataset.name; state.accountsExpanded = false; refresh(); break;
    case 'selectCategory': state.category = target.dataset.name; state.categoriesExpanded = false; refresh(); break;
    case 'toggleAccounts': state.accountsExpanded = !state.accountsExpanded; refresh(); break;
    case 'toggleCategories': state.categoriesExpanded = !state.categoriesExpanded; refresh(); break;
    case 'dateToday': state.date = getTodayStr(); refresh(); break;
    case 'dateLast': if (lastUsedDate) { state.date = lastUsedDate; refresh(); } break;
    case 'toggleBulk': showBulkInput = !showBulkInput; if (showBulkInput && bulkRows.length === 0) bulkRows = [createBulkRow()]; refresh(); break;
    case 'addBulkRow': bulkRows.push(createBulkRow()); refresh(); break;
    case 'deleteBulkRow':
      const rowIdx = Number(target.dataset.row);
      bulkRows.splice(rowIdx, 1);
      if (bulkRows.length === 0) bulkRows.push(createBulkRow());
      refresh();
      break;
    case 'submitBulk': submitBulk(); break;
    case 'triggerCsvImport': document.getElementById('csv-import-input')?.click(); break;
    case 'downloadTemplate': downloadCsvTemplate(); break;
    case 'useShortcut':
      const sc = store.getShortcuts().find(s => s.id === target.dataset.id);
      if (sc) {
        state.type = sc.type || 'expense';
        state.amount = String(sc.amount || '');
        state.category = sc.category || null;
        state.fromAccount = sc.fromAccount || null;
        state.toAccount = sc.toAccount || null;
        state.accountsExpanded = false;
        state.categoriesExpanded = false;
        refresh();
      }
      break;
    case 'submit': submitTransaction(); break;
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
  window.showToast?.(`${getTypeLabel(state.type)} 記録しました`);
  resetState();
  refresh();
}

function submitBulk() {
  const validRows = bulkRows.filter(r => Number(r.amount) > 0);
  if (validRows.length === 0) { window.showToast?.('金額を入力してください', 'error'); return; }
  validRows.forEach(row => {
    store.addTransaction({
      date: row.date || state.date, type: state.type, amount: Number(row.amount),
      category: row.category || '', fromAccount: row.fromAccount || '',
      toAccount: row.toAccount || '', memo: row.memo || '',
    });
  });
  window.showToast?.(`${validRows.length}件一括登録しました`);
  bulkRows = [createBulkRow()];
  refresh();
}

function refresh() {
  const container = document.getElementById('screen-input');
  if (container) {
    container.removeEventListener('click', handleClick);
    render(container);
  }
}
