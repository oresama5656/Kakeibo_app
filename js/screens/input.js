// ============================================
// 入力画面 (v2.6 - CSVテンプレ・一括・電卓・カンマ 全機能版)
// ============================================

import * as store from '../store.js';
import { renderIconHTML } from '../utils/IconRenderer.js';

let lastUsedDate = localStorage.getItem('kakeibo_last_date') || '';

let state = {
  type: 'expense',
  amount: '', 
  fromAccountId: null,
  toAccountId: null,
  categoryId: null,
  date: lastUsedDate || store.formatLocalDate(),
  memo: '',
  fromAccountsExpanded: false,
  toAccountsExpanded: false,
  categoriesExpanded: false,
};

let bulkRows = [];
let showBulkInput = false;
let calcState = { display: '0', currentValue: null, operator: null, waitingForNextValue: false };

const formatComma = (val) => {
  if (val === undefined || val === null || val === '') return '';
  // 数字と小数点以外を除去
  let s = val.toString().replace(/[^0-9.]/g, '');
  if (s === '' || s === '.') return s === '.' ? '0.' : '';
  
  const parts = s.split('.');
  // 整数部分のフォーマット
  let integerPart = parts[0] ? Number(parts[0]).toLocaleString('ja-JP') : '0';
  
  // 小数部分の結合（最大2桁に制限）
  if (parts.length > 1) {
    return integerPart + '.' + parts.slice(1).join('').substring(0, 2);
  }
  return integerPart;
};

const parseComma = (str) => Number(str.toString().replace(/,/g, '')) || 0;

export function setQuickInput(data) {
  const accs = store.getAccounts();
  const cats = store.getCategories();
  
  let fromAccountId = data.fromAccountId || null;
  let toAccountId = data.toAccountId || null;
  let categoryId = data.categoryId || null;

  if (data.fromAccount && !fromAccountId) {
    const a = accs.find(i => i.name === data.fromAccount);
    if (a) fromAccountId = a.id;
  }
  if (data.toAccount && !toAccountId) {
    const a = accs.find(i => i.name === data.toAccount);
    if (a) toAccountId = a.id;
  }
  if (data.category && !categoryId) {
    const c = cats.find(i => i.name === data.category);
    if (c) categoryId = c.id;
  }

  if (data.type === 'expense') toAccountId = null;
  else if (data.type === 'income') fromAccountId = null;

  state = { 
    ...state, 
    ...data, 
    fromAccountId,
    toAccountId,
    categoryId,
    amount: data.amount ? formatComma(data.amount) : '', 
    fromAccountsExpanded: false, 
    toAccountsExpanded: false, 
    categoriesExpanded: false 
  };
}

function resetState() {
  state = { 
    ...state, 
    amount: '', 
    memo: '', 
    fromAccountsExpanded: false, 
    toAccountsExpanded: false, 
    categoriesExpanded: false 
  };
}

function renderIconGrid(items, selectedId, expanded, onSelect, onToggle, sectionTitle) {
  const all = [...items].sort((a,b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0) || (a.order || 0) - (b.order || 0));
  const selectedItem = all.find(i => i.id === selectedId);
  const pinned = all.filter(i => i.pinned);
  
  let displayItems;
  if (expanded) {
    displayItems = all;
  } else if (pinned.length > 0) {
    displayItems = [...pinned];
    if (selectedItem && !pinned.some(i => i.id === selectedId)) {
      displayItems.push(selectedItem);
    }
  } else {
    displayItems = selectedItem ? [selectedItem] : [];
  }

  const showToggleButton = all.length > pinned.length;

  return `
    <div class="premium-card-v3">
      <div class="selector-header">
        <span class="section-title-v3">
          ${store.escapeHTML(sectionTitle)}
          ${selectedItem ? `
            <span class="selected-summary-chip" style="background: var(--color-accent-light); color: var(--color-accent); border: none;">
              ${store.escapeHTML(selectedItem.name)}
            </span>` : ''}
        </span>
        ${showToggleButton ? `<button class="selector-expand" data-action="${store.escapeHTML(onToggle)}" style="color: var(--color-accent); font-weight: 800; font-size: 0.7rem;">
          ${expanded ? '<i data-lucide="chevron-up" style="width: 12px; height: 12px;"></i> 閉じる' : '<i data-lucide="chevron-down" style="width: 12px; height: 12px;"></i> 全て表示'}
        </button>` : ''}
      </div>
      <div class="icon-grid ${expanded ? 'expanded' : ''}">
        ${displayItems.length > 0 ? displayItems.map(item => `
          <div class="icon-item ${item.id === selectedId ? 'selected' : ''}" data-action="${store.escapeHTML(onSelect)}" data-id="${store.escapeHTML(item.id)}">
            ${renderIconHTML(item.icon, item.id, { size: 22 })}
            <span class="icon-label">${store.escapeHTML(item.name)}</span>
          </div>
        `).join('') : `<div style="padding: 20px; color: var(--text-muted); font-size: 0.8rem; text-align: center; width: 100%; font-weight: 600;">選択可能な項目がありません</div>`}
      </div>
    </div>
  `;
}

export function render(container) {
  if (!container) return;
  const accounts = store.getAccounts();
  const allCategories = store.getCategories();
  const shortcuts = store.getShortcuts();
  const isPC = window.innerWidth >= 768;

  container.innerHTML = `
    <div class="input-screen premium-mode" style="max-width: 100%; box-sizing: border-box; overflow-x: hidden;">
      <div class="analysis-segmented-control" style="margin-bottom: 20px;">
        <button class="segmented-item ${state.type === 'expense' ? 'active' : ''}" data-action="setType" data-type="expense">支出</button>
        <button class="segmented-item ${state.type === 'income' ? 'active' : ''}" data-action="setType" data-type="income">収入</button>
        <button class="segmented-item ${state.type === 'transfer' ? 'active' : ''}" data-action="setType" data-type="transfer">振替</button>
        ${isPC ? `
        <div style="border-left: 1px solid var(--border-color); margin: 4px 8px; height: 16px;"></div>
        <button class="segmented-item bulk-toggle ${showBulkInput ? 'active' : ''}" data-action="toggleBulk" style="flex: 1.5; display: flex; align-items: center; justify-content: center; gap: 4px;">
          <i data-lucide="list-plus" style="width: 14px; height: 14px;"></i> 一括入力
        </button>` : ''}
      </div>

      <div class="input-fields" style="padding: 0 4px; box-sizing: border-box;">
        ${showBulkInput && isPC ? renderBulkInput(accounts, allCategories) : renderSingleInput(accounts, allCategories, shortcuts)}
      </div>
    </div>
    <input type="file" id="csv-import-input" accept=".csv" style="display: none;">
  `;
  bindEvents(container);
  if (window.lucide) lucide.createIcons();
}

function renderSingleInput(accounts, allCategories, shortcuts) {
  const categories = state.type === 'transfer' ? [] : allCategories.filter(c => c.type === state.type || c.type === 'both');
  const showFromAccount = state.type === 'expense' || state.type === 'transfer';
  const showToAccount = state.type === 'income' || state.type === 'transfer';
  const showCategories = state.type !== 'transfer';

  return `
    <!-- ... 通常入力用UI (v2.5と同じ) ... -->
    <div class="premium-card-v3">
      <div class="selector-header">
        <span class="section-title-v3">金額入力</span>
      </div>
      <div class="amount-input-container-v3">
        <span class="amount-yen" style="font-size: 1.2rem; color: var(--text-muted); font-weight: 800; margin-right: 12px;">¥</span>
        <input type="text" class="amount-field" id="amount-input-formatted" value="${store.escapeHTML(state.amount)}" placeholder="0" inputmode="numeric" style="flex: 1; width: 0; border: none; background: transparent; font-size: 2.2rem; font-weight: 900; color: var(--text-primary); text-align: left; padding: 12px 0; letter-spacing: -1px; min-width: 0;">
        <button data-action="openCalculator" title="電卓" style="background: var(--bg-card); border: 1.5px solid var(--border-light); width: 48px; height: 48px; min-width: 48px; border-radius: 14px; cursor: pointer; display: flex; align-items: center; justify-content: center; margin-left: 8px; box-shadow: var(--shadow-sm); flex-shrink: 0;">
          <i data-lucide="calculator" style="width: 22px; height: 22px; color: var(--color-accent);"></i>
        </button>
      </div>
    </div>

    ${showFromAccount ? renderIconGrid(accounts, state.fromAccountId, state.fromAccountsExpanded, 'selectFromAccount', 'toggleFromAccounts', state.type === 'transfer' ? '出金元' : '口座') : ''}
    ${showToAccount ? renderIconGrid(accounts, state.toAccountId, state.toAccountsExpanded, 'selectToAccount', 'toggleToAccounts', state.type === 'transfer' ? '入金先' : '入金口座') : ''}
    ${showCategories ? renderIconGrid(categories, state.categoryId, state.categoriesExpanded, 'selectCategory', 'toggleCategories', 'カテゴリー') : ''}

    <div class="premium-card-v3">
      <div class="selector-header">
        <span class="section-title-v3">日付・メモ</span>
      </div>
      <div style="display: flex; gap: 12px; margin-bottom: 16px;">
        <div style="flex: 1; position: relative;">
          <input type="date" class="date-memo-input-v3" value="${store.escapeHTML(state.date)}" data-action="setDate" style="cursor: pointer;">
        </div>
        <button data-action="dateToday" style="padding: 0 24px; border-radius: 16px; border: none; background: var(--color-accent-light); color: var(--color-accent); font-size: 0.85rem; font-weight: 900; white-space: nowrap; cursor: pointer; transition: all 0.2s ease;">今日</button>
      </div>
      <div style="position: relative;">
        <input type="text" placeholder="メモを残す（任意）" value="${store.escapeHTML(state.memo)}" id="memo-input" class="date-memo-input-v3">
      </div>
    </div>

    <button class="submit-btn ${state.type}-mode" data-action="submit" style="width: 100%; height: 68px; font-size: 1.15rem; font-weight: 900; border-radius: 20px; margin-top: 10px; margin-bottom: 30px; box-shadow: 0 10px 20px var(--premium-shadow); display: flex; align-items: center; justify-content: center; gap: 12px; transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1); border: none; cursor: pointer;">
      <i data-lucide="check-circle-2" style="width: 24px; height: 24px;"></i>
      ${state.type === 'expense' ? '支出を記録する' : state.type === 'income' ? '収入を記録する' : '振替を実行する'}
    </button>
    
    ${shortcuts.length > 0 ? `
      <div class="premium-card-v3">
        <div class="selector-header">
          <span class="section-title-v3">⚡ クイック入力</span>
        </div>
        <div class="shortcuts-scroll" style="display: flex; gap: 8px; overflow-x: auto; padding-bottom: 4px;">
          ${shortcuts.map(s => `<button class="shortcut-chip" data-action="useShortcut" data-id="${store.escapeHTML(s.id)}">${store.escapeHTML(s.name)}</button>`).join('')}
        </div>
      </div>
    ` : ''}
  `;
}

function renderBulkInput(accounts, allCategories) {
  if (bulkRows.length === 0) {
    bulkRows = [{ date: state.date, type: state.type, amount: '', categoryId: '', fromAccountId: '', toAccountId: '', memo: '' }];
  }

  return `
    <div class="premium-card-v3">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
        <h3 style="font-size: 1rem; font-weight: 800;">一括入力・CSV管理</h3>
        <div style="display: flex; gap: 8px;">
          <button data-action="addBulkRow" style="background: var(--color-accent-light); color: var(--color-accent); padding: 8px 14px; border-radius: 10px; font-weight: bold; font-size: 0.75rem; display: flex; align-items: center; gap: 4px;">
            <i data-lucide="plus" style="width: 14px; height: 14px;"></i> 行追加
          </button>
          <button data-action="downloadCsvTemplate" style="background: var(--bg-hover); padding: 8px 14px; border-radius: 10px; font-weight: bold; font-size: 0.75rem; display: flex; align-items: center; gap: 4px;">
            <i data-lucide="file-text" style="width: 14px; height: 14px;"></i> テンプレ
          </button>
          <button data-action="triggerCsvImport" style="background: var(--bg-hover); padding: 8px 14px; border-radius: 10px; font-weight: bold; font-size: 0.75rem; display: flex; align-items: center; gap: 4px;">
            <i data-lucide="upload" style="width: 14px; height: 14px;"></i> 読込
          </button>
        </div>
      </div>
      <div style="max-height: 400px; overflow: auto; border: 1px solid var(--border-light); border-radius: 12px;">
        <table style="width: 100%; border-collapse: collapse; font-size: 0.8rem;">
          <thead style="background: var(--bg-hover); position: sticky; top:0; z-index:1;">
            <tr>
              <th style="padding:10px; text-align:left;">日付</th>
              <th style="padding:10px; text-align:left;">種類</th>
              <th style="padding:10px; text-align:left;">カテゴリー</th>
              <th style="padding:10px; text-align:left;">金額</th>
              <th style="padding:10px; text-align:left;">口座/${state.type === 'transfer' ? '元' : ''}</th>
              <th style="padding:10px; text-align:left;">入金先</th>
              <th style="padding:10px; text-align:left;">メモ</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            ${bulkRows.map((row, i) => {
              const rowType = row.type || state.type;
              const catOptions = rowType === 'transfer' ? [] : allCategories.filter(c => c.type === rowType || c.type === 'both');
              
              return `
              <tr style="border-bottom: 1px solid var(--border-light);">
                <td style="padding:4px;"><input type="date" value="${store.escapeHTML(row.date)}" data-field="date" data-row="${i}" class="bulk-input" style="width:100%; border:none; background:transparent;"></td>
                <td style="padding:4px;">
                  <select data-field="type" data-row="${i}" class="bulk-input" style="width:100%; border:none; background:transparent;">
                    <option value="expense" ${rowType === 'expense' ? 'selected' : ''}>支出</option>
                    <option value="income" ${rowType === 'income' ? 'selected' : ''}>収入</option>
                    <option value="transfer" ${rowType === 'transfer' ? 'selected' : ''}>振替</option>
                  </select>
                </td>
                <td style="padding:4px;">
                  <select data-field="categoryId" data-row="${i}" class="bulk-input" style="width:100%; border:none; background:transparent; ${rowType === 'transfer' ? 'opacity:0.3;' : ''}" ${rowType === 'transfer' ? 'disabled' : ''}>
                    <option value="">-</option>
                    ${catOptions.map(c => `<option value="${store.escapeHTML(c.id)}" ${c.id === row.categoryId ? 'selected' : ''}>${store.escapeHTML(c.name)}</option>`).join('')}
                  </select>
                </td>
                <td style="padding:4px;"><input type="number" value="${store.escapeHTML(row.amount)}" data-field="amount" data-row="${i}" class="bulk-input" placeholder="0" style="width:100%; border:none; background:transparent; font-weight:bold;"></td>
                <td style="padding:4px;">
                  <select data-field="fromAccountId" data-row="${i}" class="bulk-input" style="width:100%; border:none; background:transparent;">
                    <option value="">-</option>
                    ${accounts.map(a => `<option value="${store.escapeHTML(a.id)}" ${a.id === row.fromAccountId ? 'selected' : ''}>${store.escapeHTML(a.name)}</option>`).join('')}
                  </select>
                </td>
                <td style="padding:4px;">
                  <select data-field="toAccountId" data-row="${i}" class="bulk-input" style="width:100%; border:none; background:transparent; ${rowType !== 'transfer' ? 'opacity:0.3;' : ''}" ${rowType !== 'transfer' ? 'disabled' : ''}>
                    <option value="">-</option>
                    ${accounts.map(a => `<option value="${store.escapeHTML(a.id)}" ${a.id === row.toAccountId ? 'selected' : ''}>${store.escapeHTML(a.name)}</option>`).join('')}
                  </select>
                </td>
                <td style="padding:4px;"><input type="text" value="${store.escapeHTML(row.memo || '')}" data-field="memo" data-row="${i}" class="bulk-input" placeholder="メモ" style="width:100%; border:none; background:transparent;"></td>
                <td style="padding:4px; text-align:center;"><button data-action="deleteBulkRow" data-row="${i}" style="color:var(--color-danger); border:none; background:transparent; font-size:1rem; cursor:pointer;">✕</button></td>
              </tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>
      <button data-action="submitBulk" style="width:100%; margin-top:20px; height:50px; background:var(--color-accent); color:white; border-radius:12px; font-weight:800; border:none; cursor:pointer; font-size:1rem;">${bulkRows.length}件を一括登録</button>
    </div>
  `;
}

function bindEvents(container) {
  container.addEventListener('click', handleClick);
  const amountInput = container.querySelector('#amount-input-formatted');
  if (amountInput) {
    amountInput.oninput = (e) => {
      const val = e.target.value.replace(/[^0-9.]/g, '');
      const formatted = formatComma(val);
      state.amount = formatted; e.target.value = formatted; 
    };
  }
  const memoInput = container.querySelector('#memo-input');
  if (memoInput) memoInput.oninput = (e) => { state.memo = e.target.value; };
  const dateInput = container.querySelector('[data-action="setDate"]');
  if (dateInput) dateInput.onchange = (e) => { state.date = e.target.value; };
  container.querySelectorAll('.bulk-input').forEach(inp => {
    inp.addEventListener('change', e => { 
      const { field, row } = e.target.dataset; 
      if (bulkRows[row]) {
        bulkRows[row][field] = e.target.value;
        if (field === 'type') refresh(); 
      }
    });
  });
  container.querySelector('#csv-import-input')?.addEventListener('change', handleCsvFile);
}

function handleClick(e) {
  const target = e.target.closest('[data-action]');
  if (!target) return;
  const action = target.dataset.action;
  if (action === 'openCalculator') openCalculator();
  else if (action === 'setType') { state.type = target.dataset.type; state.categoryId = null; refresh(); }
  else if (action === 'selectFromAccount') { state.fromAccountId = target.dataset.id; state.fromAccountsExpanded = false; refresh(); }
  else if (action === 'selectToAccount') { state.toAccountId = target.dataset.id; state.toAccountsExpanded = false; refresh(); }
  else if (action === 'selectCategory') { state.categoryId = target.dataset.id; state.categoriesExpanded = false; refresh(); }
  else if (action === 'toggleFromAccounts') { state.fromAccountsExpanded = !state.fromAccountsExpanded; refresh(); }
  else if (action === 'toggleToAccounts') { state.toAccountsExpanded = !state.toAccountsExpanded; refresh(); }
  else if (action === 'toggleCategories') { state.categoriesExpanded = !state.categoriesExpanded; refresh(); }
  else if (action === 'dateToday') { state.date = store.formatLocalDate(); refresh(); }
  else if (action === 'submit') submit();
  else if (action === 'toggleBulk') { showBulkInput = !showBulkInput; refresh(); }
  else if (action === 'addBulkRow') { bulkRows.push({ date: state.date, type: state.type, amount: '', categoryId: '', fromAccountId: '', toAccountId: '', memo: '' }); refresh(); }
  else if (action === 'deleteBulkRow') { bulkRows.splice(Number(target.dataset.row), 1); if (bulkRows.length===0) bulkRows=[{date:state.date,amount:'',categoryId:'',fromAccountId:'',toAccountId:'',memo:''}]; refresh(); }
  else if (action === 'submitBulk') submitBulk();
  else if (action === 'triggerCsvImport') document.getElementById('csv-import-input').click();
  else if (action === 'downloadCsvTemplate') downloadCsvTemplate();
  else if (action === 'useShortcut') { const sc = store.getShortcuts().find(s => s.id === target.dataset.id); if (sc) { setQuickInput(sc); refresh(); } }
}

function downloadCsvTemplate() {
  const header = "日付,種類,カテゴリー,金額,口座,入金先,メモ\n";
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  const dateStr = `${y}-${m}-${d}`;
  
  const row1 = `${dateStr},支出,食料品,1000,現金,,スーパーで買い物\n`;
  const row2 = `${dateStr},収入,給料,200000,,常陽銀行,4月分給料\n`;
  const row3 = `${dateStr},振替,,10000,常陽銀行,現金,ATM引き出し\n`;
  
  // 文字化け防止対策（BOM付きUTF-8）
  const bom = new Uint8Array([0xEF, 0xBB, 0xBF]);
  const blob = new Blob([bom, header + row1 + row2 + row3], { type: 'text/csv;charset=utf-8;' });
  
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  link.setAttribute("href", url);
  link.setAttribute("download", "kakeibo_template.csv");
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

function handleCsvFile(e) {
  const file = e.target.files[0];
  if (!file) return;

  Papa.parse(file, {
    header: true,
    skipEmptyLines: true,
    complete: (res) => {
      const typeMap = { '支出': 'expense', '収入': 'income', '振替': 'transfer' };
      const accs = store.getAccounts();
      const cats = store.getCategories();

      // カラム名の特定を容易にするための候補リスト
      const keyMap = {
        date: ['日付', '取引日', '年月日', '取引年月日', 'date'],
        expense: ['お引出し', 'お引出し額', '支出金額', '払い出し', '出金', 'withdraw'],
        income: ['お預入れ', 'お預入れ額', '収入金額', '預け入れ', '入金', 'deposit'],
        amount: ['金額', 'amount'],
        type: ['種類', '種別', 'type'],
        memo: ['摘要', '内容', 'お取引内容', 'メモ', 'memo', 'description'],
        category: ['カテゴリー', 'カテゴリ', 'category'],
        account: ['口座', 'account'],
        toAccount: ['入金先', '振替先', 'toAccount']
      };

      const findVal = (row, keys) => {
        const key = keys.find(k => k in row);
        return key ? String(row[key] || '').trim() : '';
      };

      bulkRows = res.data.map(r => {
        // 1. 日付の取得と正規化 (YYYY-MM-DD)
        let date = findVal(r, keyMap.date) || state.date;
        if (date.includes('/') || date.includes('-')) {
          const parts = date.split(/[\/\-]/);
          if (parts.length === 3) {
            const y = parts[0].length === 2 ? '20' + parts[0] : parts[0];
            const m = parts[1].padStart(2, '0');
            const d = parts[2].split(' ')[0].padStart(2, '0');
            date = `${y}-${m}-${d}`;
          }
        }

        // 2. 金額と種類の判定（振替明示を最優先）
        let amount = 0;
        const rawType = findVal(r, keyMap.type);
        let mappedType = typeMap[rawType] || (Object.values(typeMap).includes(rawType) ? rawType : null);

        const rawAmount = findVal(r, keyMap.amount);
        const rawExp = findVal(r, keyMap.expense).replace(/,/g, '');
        const rawInc = findVal(r, keyMap.income).replace(/,/g, '');

        if (mappedType === 'transfer') {
          // 振替の場合は種類優先、金額はいずれかの列から取得
          amount = Number(rawAmount.replace(/,/g, '')) || Number(rawExp) || Number(rawInc) || 0;
        } else if (rawExp && Number(rawExp) > 0) {
          amount = Number(rawExp);
          mappedType = 'expense';
        } else if (rawInc && Number(rawInc) > 0) {
          amount = Number(rawInc);
          mappedType = 'income';
        } else if (rawAmount) {
          amount = Number(rawAmount.replace(/,/g, '')) || 0;
          mappedType = mappedType || rawType || state.type;
        } else {
          mappedType = mappedType || state.type;
        }

        // 3. 口座名とIDの自動マッピング（支出・収入・振替に応じて賢く振り分け）
        const rawAcc = findVal(r, keyMap.account);
        const rawToAcc = findVal(r, keyMap.toAccount);

        let finalFromAcc = '', finalToAcc = '';
        if (mappedType === 'expense') {
          finalFromAcc = rawAcc;
        } else if (mappedType === 'income') {
          finalToAcc = rawAcc;
        } else if (mappedType === 'transfer') {
          finalFromAcc = rawAcc;
          finalToAcc = rawToAcc || rawAcc; // テンプレ形式なら入金先を、それ以外なら共通口座を優先
        }

        const fromAccObj = accs.find(a => a.name.trim() === finalFromAcc.trim());
        const toAccObj = accs.find(a => a.name.trim() === finalToAcc.trim());

        // 4. その他（メモ、カテゴリー、口座IDの解決）
        const rawMemo = findVal(r, keyMap.memo);
        const rawCatName = findVal(r, keyMap.category);
        
        // カテゴリーの検索（全角半角スペース無視、完全一致優先）
        const clean = (s) => s.replace(/[\s　]/g, '');
        let cat = cats.find(c => clean(c.name) === clean(rawCatName));
        
        // 見つからない場合、種類（支出/収入）に応じた「その他」を検索
        if (!cat && rawCatName) {
          cat = cats.find(c => (clean(c.name) === 'その他' || clean(c.name) === '未分類') && (c.type === mappedType || c.type === 'both'));
        }

        return {
          date: date,
          type: mappedType,
          amount: amount,
          category: rawCatName,
          categoryId: cat ? cat.id : '',
          fromAccount: finalFromAcc,
          fromAccountId: fromAccObj ? fromAccObj.id : '',
          toAccount: finalToAcc,
          toAccountId: toAccObj ? toAccObj.id : '',
          memo: rawMemo
        };
      });

      refresh();
      window.showToast?.(`${bulkRows.length}件を読み込みました`);
    }
  });
}


function submit() {
  const amount = parseComma(state.amount);
  if (amount <= 0) { 
    window.showToast?.('金額を正の数値で入力してください', 'error'); 
    return; 
  }
  
  // 名称のスナップショットも一緒に保存
  const accs = store.getAccounts();
  const cats = store.getCategories();
  const fromAcc = accs.find(a => a.id === state.fromAccountId);
  const toAcc = accs.find(a => a.id === state.toAccountId);
  const cat = cats.find(c => c.id === state.categoryId);

  const tx = { 
    ...state, 
    amount, 
    fromAccount: fromAcc ? fromAcc.name : '',
    toAccount: toAcc ? toAcc.name : '',
    category: cat ? cat.name : (state.type === 'transfer' ? '' : 'その他'),
    categoryId: state.categoryId || (state.type === 'transfer' ? '' : 'cat_other')
  };

  store.addTransaction(tx);
  
  // 入力後残高の反映
  let balanceMsg = '';
  if (state.type === 'transfer') {
    const f = accs.find(a => a.id === state.fromAccountId);
    const t = accs.find(a => a.id === state.toAccountId);
    const fb = store.getAccountBalance(state.fromAccountId).toLocaleString();
    const tb = store.getAccountBalance(state.toAccountId).toLocaleString();
    balanceMsg = `\n残高: ${f?.name} ¥${fb} / ${t?.name} ¥${tb}`;
  } else {
    const targetId = state.type === 'expense' ? state.fromAccountId : state.toAccountId;
    const acc = accs.find(a => a.id === targetId);
    if (acc) {
      const b = store.getAccountBalance(targetId).toLocaleString();
      balanceMsg = `\n[${acc.name}] 残高: ¥${b}`;
    }
  }

  window.showToast?.('記録しました ✓' + balanceMsg); 
  localStorage.setItem('kakeibo_last_date', state.date);
  resetState(); 
  refresh();
}

function submitBulk() {
  const vs = bulkRows.filter(r => Number(r.amount) > 0);
  if (vs.length === 0) return;
  
  const accs = store.getAccounts();
  const cats = store.getCategories();

  vs.forEach(r => {
    const finalType = r.type || state.type;
    let tx = { ...r, type: finalType, amount: Number(r.amount) };

    // IDから最新の名称をセット（または名称からIDを補完）
    const fromAcc = accs.find(a => a.id === r.fromAccountId || a.name === r.fromAccount);
    const toAcc = accs.find(a => a.id === r.toAccountId || a.name === r.toAccount);
    const cat = cats.find(c => c.id === r.categoryId || c.name === r.category);

    if (fromAcc) { tx.fromAccountId = fromAcc.id; tx.fromAccount = fromAcc.name; }
    if (toAcc) { tx.toAccountId = toAcc.id; tx.toAccount = toAcc.name; }
    if (cat) { tx.categoryId = cat.id; tx.category = cat.name; }

    if (finalType === 'income') {
      tx.toAccountId = tx.toAccountId || tx.fromAccountId;
      tx.toAccount = tx.toAccount || tx.fromAccount;
      tx.fromAccountId = '';
      tx.fromAccount = '';
    } else if (finalType === 'expense') {
      tx.toAccountId = '';
      tx.toAccount = '';
    }

    store.addTransaction(tx);
  });
  
  window.showToast?.(`${vs.length}件を登録 ✓`); bulkRows = []; refresh();
}

function openCalculator() {
  const overlay = document.createElement('div');
  overlay.className = 'calc-overlay';
  overlay.style = `position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.5); backdrop-filter:blur(4px); z-index:4000; display:flex; align-items:flex-end; justify-content:center;`;
  overlay.innerHTML = `<div class="calc-container" style="width:100%; max-width:440px; background:var(--bg-app); border-top-left-radius:30px; border-top-right-radius:30px; padding:20px; padding-bottom: max(30px, env(safe-area-inset-bottom)); box-shadow: 0 -10px 40px rgba(0,0,0,0.2); animation: slideUp 0.3s cubic-bezier(0.2, 0.8, 0.2, 1);"><div style="width:40px; height:4px; background:var(--border-color); border-radius:2px; margin:0 auto 20px; opacity:0.5;"></div><div id="calc-display" style="background:var(--bg-card); padding:16px 20px; border-radius:18px; text-align:right; font-size:2.4rem; font-weight:800; margin-bottom:20px; border:2px solid var(--border-color); min-height:80px; display:flex; flex-direction:column; justify-content:center;"><div id="calc-formula" style="font-size:0.9rem; color:var(--text-muted); min-height:1.2em; font-weight:500;"></div><div id="calc-main-num">0</div></div><div class="calc-grid" style="display:grid; grid-template-columns: repeat(4, 1fr); gap:10px;"><button class="calc-btn" data-val="AC" style="background:#ef4444; color:white; border-radius:12px; height:50px; font-weight:800; border:none;">AC</button><button class="calc-btn" data-val="C" style="background:var(--bg-hover); border-radius:12px; height:50px; font-weight:800; border:none;">C</button><button class="calc-btn" data-val="/" style="background:var(--bg-hover); border-radius:12px; height:50px; font-weight:800; border:none;">÷</button><button class="calc-btn" data-val="*" style="background:var(--bg-hover); border-radius:12px; height:50px; font-weight:800; border:none;">×</button><button class="calc-btn num" data-val="7">7</button><button class="calc-btn num" data-val="8">8</button><button class="calc-btn num" data-val="9">9</button><button class="calc-btn" data-val="-" style="background:var(--bg-hover); border-radius:12px; height:50px; font-weight:800; border:none;">-</button><button class="calc-btn num" data-val="4">4</button><button class="calc-btn num" data-val="5">5</button><button class="calc-btn num" data-val="6">6</button><button class="calc-btn" data-val="+" style="background:var(--bg-hover); border-radius:12px; height:50px; font-weight:800; border:none;">+</button><button class="calc-btn num" data-val="1">1</button><button class="calc-btn num" data-val="2">2</button><button class="calc-btn num" data-val="3">3</button><button class="calc-btn" data-val="=" style="grid-row: span 2; background:var(--color-accent); color:white; border-radius:12px; font-weight:800; border:none; font-size:1.6rem;">=</button><button class="calc-btn num" data-val="0" style="grid-column: span 2;">0</button><button class="calc-btn num" data-val=".">.</button></div><div style="display:flex; gap:12px; margin-top:20px;"><button id="calc-cancel-btn" style="flex:1; height:56px; border:1px solid var(--border-color); background:var(--bg-card); border-radius:16px; font-weight:800;">キャンセル</button><button id="calc-apply-btn" style="flex:2; height:56px; border:none; background:var(--color-accent); color:white; border-radius:16px; font-weight:800;">適用 ✓</button></div></div><style>.calc-btn.num { background:var(--bg-card); border:1px solid var(--border-color); border-radius:12px; height:50px; font-weight:800; }</style>`;
  document.body.appendChild(overlay);
  const m = overlay.querySelector('#calc-main-num'), f = overlay.querySelector('#calc-formula');
  const initialNum = state.amount ? parseComma(state.amount) : 0;
  calcState = { display: String(initialNum), currentValue: null, operator: null, waitingForNextValue: false };
  updateCalcDisplay(m, f);
  overlay.addEventListener('click', (e) => {
    const btn = e.target.closest('.calc-btn'); if (btn) handleCalcInput(btn.dataset.val, m, f);
    if (e.target === overlay || e.target.id === 'calc-cancel-btn') overlay.remove();
    if (e.target.id === 'calc-apply-btn') { state.amount = formatComma(calcState.display); overlay.remove(); refresh(); }
  });
}

function refresh() {
  const container = document.getElementById('screen-input');
  if (container) { container.removeEventListener('click', handleClick); render(container); }
}

function handleCalcInput(val, mainEl, formulaEl) {
  if (val === 'AC') {
    calcState = { display: '0', currentValue: null, operator: null, waitingForNextValue: false };
  } else if (val === 'C') {
    calcState.display = '0';
  } else if (val === '=') {
    if (calcState.operator && !calcState.waitingForNextValue) {
      const result = performCalculation(calcState.currentValue, parseFloat(calcState.display), calcState.operator);
      calcState.display = String(result);
      calcState.currentValue = null;
      calcState.operator = null;
      calcState.waitingForNextValue = false;
    }
  } else if (['+', '-', '*', '/'].includes(val)) {
    const inputNum = parseFloat(calcState.display);
    if (calcState.currentValue == null) {
      calcState.currentValue = inputNum;
    } else if (calcState.operator && !calcState.waitingForNextValue) {
      const result = performCalculation(calcState.currentValue, inputNum, calcState.operator);
      calcState.display = String(result);
      calcState.currentValue = result;
    }
    calcState.waitingForNextValue = true;
    calcState.operator = val;
  } else {
    if (calcState.waitingForNextValue) {
      calcState.display = val;
      calcState.waitingForNextValue = false;
    } else {
      calcState.display = calcState.display === '0' ? val : calcState.display + val;
    }
  }
  updateCalcDisplay(mainEl, formulaEl);
}

function performCalculation(v1, v2, op) {
  if (op === '+') return v1 + v2;
  if (op === '-') return v1 - v2;
  if (op === '*') return v1 * v2;
  if (op === '/') {
    if (v2 === 0) {
      window.showToast?.('0で割ることはできません', 'error');
      return 0;
    }
    return v1 / v2;
  }
  return v2;
}

function updateCalcDisplay(mainEl, formulaEl) {
  mainEl.textContent = formatComma(calcState.display);
  let opSymbol = { '+': '+', '-': '-', '*': '×', '/': '÷' }[calcState.operator] || '';
  formulaEl.textContent = calcState.currentValue != null ? `${formatComma(calcState.currentValue)} ${opSymbol}` : '';
}
