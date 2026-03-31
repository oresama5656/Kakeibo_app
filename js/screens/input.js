// ============================================
// 入力画面 (v2.6 - CSVテンプレ・一括・電卓・カンマ 全機能版)
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

let bulkRows = [];
let showBulkInput = false;
let calcState = { display: '0', currentValue: null, operator: null, waitingForNextValue: false };

const formatComma = (val) => {
  const num = val.toString().replace(/[^0-9]/g, '');
  return num ? Number(num).toLocaleString('ja-JP') : '';
};

const parseComma = (str) => Number(str.toString().replace(/,/g, '')) || 0;

export function setQuickInput(data) {
  state = { ...state, ...data, amount: data.amount ? formatComma(data.amount) : '', fromAccountsExpanded: false, toAccountsExpanded: false, categoriesExpanded: false };
  if (data.type === 'expense') state.toAccount = null;
  else if (data.type === 'income') state.fromAccount = null;
}

function resetState() {
  state = { ...state, amount: '', fromAccount: null, toAccount: null, category: null, memo: '', fromAccountsExpanded: false, toAccountsExpanded: false, categoriesExpanded: false };
}

function renderIconGrid(items, selectedName, expanded, onSelect, onToggle, sectionTitle) {
  const all = [...items].sort((a,b) => (a.order || 0) - (b.order || 0));
  let selectedItem = all.find(i => i.name === selectedName);
  if (!selectedItem && selectedName) selectedItem = { name: selectedName, icon: '⚖️' };
  
  const pinned = all.filter(i => i.pinned);
  const isPC = window.innerWidth >= 768;
  let displayItems = expanded ? all : pinned;
  if (!isPC && !expanded) displayItems = [];
  if (selectedItem && !displayItems.find(i => i.name === selectedItem.name)) displayItems.push(selectedItem);

  return `
    <div class="selector-section">
      <div class="selector-header">
        <span class="selector-title">
          ${sectionTitle}
          ${selectedItem ? `<span class="selected-summary-chip">${selectedItem.icon} ${selectedItem.name}</span>` : ''}
        </span>
        ${all.length > pinned.length ? `<button class="selector-expand" data-action="${onToggle}">${expanded ? '▲' : '▼ 全表示'}</button>` : ''}
      </div>
      <div class="icon-grid ${expanded ? 'expanded' : ''}">
        ${displayItems.map(item => `
          <div class="icon-item ${item.name === selectedName ? 'selected' : ''}" data-action="${onSelect}" data-name="${item.name}">
            <span class="icon-emoji">${item.icon}</span>
            <span class="icon-label">${item.name}</span>
          </div>
        `).join('')}
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
    <div class="input-screen" style="max-width: 100%; box-sizing: border-box; overflow-x: hidden;">
      <div class="type-toggle" style="margin-bottom: 20px;">
        <button class="type-btn ${state.type === 'expense' ? 'active' : ''}" data-action="setType" data-type="expense">支出</button>
        <button class="type-btn ${state.type === 'income' ? 'active' : ''}" data-action="setType" data-type="income">収入</button>
        <button class="type-btn ${state.type === 'transfer' ? 'active' : ''}" data-action="setType" data-type="transfer">振替</button>
        ${isPC ? `<button class="type-btn bulk-toggle ${showBulkInput ? 'active' : ''}" data-action="toggleBulk">📋 一括・CSV</button>` : ''}
      </div>

      <div class="input-fields" style="padding: 0 4px; box-sizing: border-box;">
        ${showBulkInput && isPC ? renderBulkInput(accounts, allCategories) : renderSingleInput(accounts, allCategories, shortcuts)}
      </div>
    </div>
    <input type="file" id="csv-import-input" accept=".csv" style="display: none;">
  `;
  bindEvents(container);
}

function renderSingleInput(accounts, allCategories, shortcuts) {
  const categories = state.type === 'transfer' ? [] : allCategories.filter(c => c.type === state.type || c.type === 'both');
  const showFromAccount = state.type === 'expense' || state.type === 'transfer';
  const showToAccount = state.type === 'income' || state.type === 'transfer';
  const showCategories = state.type !== 'transfer';

  return `
    <!-- ... 通常入力用UI (v2.5と同じ) ... -->
    <div class="amount-input-section" style="margin-bottom: 24px;">
      <div class="amount-input-wrapper" style="display: flex; align-items: center; border-radius: 20px; background: var(--bg-card); padding: 8px 16px; box-shadow: var(--shadow-sm); border: 2px solid var(--border-color); width: 100%; box-sizing: border-box;">
        <span class="amount-yen" style="font-size: 1.4rem; color: var(--text-muted); font-weight: 800; margin-right: 12px;">¥</span>
        <input type="text" class="amount-field" id="amount-input-formatted" value="${state.amount}" placeholder="0" inputmode="numeric" style="flex: 1; width: 0; border: none; background: transparent; font-size: 2rem; font-weight: 800; color: var(--text-primary); text-align: left; padding: 12px 0;">
        <button data-action="openCalculator" title="電卓" style="background: var(--bg-hover); border: none; width: 44px; height: 44px; min-width: 44px; border-radius: 12px; font-size: 1.2rem; cursor: pointer; display: flex; align-items: center; justify-content: center; margin-left: 8px;">🧮</button>
      </div>
    </div>

    ${showFromAccount ? renderIconGrid(accounts, state.fromAccount, state.fromAccountsExpanded, 'selectFromAccount', 'toggleFromAccounts', state.type === 'transfer' ? '💴 出金元' : '💴 口座') : ''}
    ${showToAccount ? renderIconGrid(accounts, state.toAccount, state.toAccountsExpanded, 'selectToAccount', 'toggleToAccounts', state.type === 'transfer' ? '💴 入金先' : '💴 入金口座') : ''}
    ${showCategories ? renderIconGrid(categories, state.category, state.categoriesExpanded, 'selectCategory', 'toggleCategories', '📁 カテゴリー') : ''}

    <div class="selector-section">
      <div class="selector-header"><span class="selector-title">📅 日付・メモ</span></div>
      <div style="display: flex; gap: 8px; margin-bottom: 12px;">
        <input type="date" class="date-input" value="${state.date}" data-action="setDate" style="flex: 1; padding: 12px; border-radius: 14px; border: 1px solid var(--border-color); background: var(--bg-card); min-width: 0;">
        <button data-action="dateToday" style="padding: 0 16px; border-radius: 14px; border: 1px solid var(--border-color); background: var(--bg-card); font-size: 0.8rem; font-weight: 800; white-space: nowrap;">今日</button>
      </div>
      <input type="text" placeholder="メモを入力..." value="${state.memo}" id="memo-input" style="width: 100%; height: 50px; padding: 0 16px; border-radius: 14px; border: 1px solid var(--border-color); background: var(--bg-card); font-size: 0.9rem; box-sizing: border-box;">
    </div>

    <button class="submit-btn ${state.type}-mode" data-action="submit" style="width: 100%; height: 64px; font-size: 1.2rem; font-weight: 800; border-radius: 20px; margin-top: 24px; box-shadow: var(--shadow-sm);">${state.type === 'expense' ? '支出' : state.type === 'income' ? '収入' : '振替'}を記録する ✓</button>
    
    ${shortcuts.length > 0 ? `
      <div style="margin-top: 32px;">
        <div class="selector-header"><span class="selector-title">⚡ クイック入力</span></div>
        <div class="shortcuts-scroll" style="display: flex; gap: 8px; overflow-x: auto; padding-bottom: 12px;">
          ${shortcuts.map(s => `<button class="shortcut-chip" data-action="useShortcut" data-id="${s.id}">${s.name}</button>`).join('')}
        </div>
      </div>
    ` : ''}
  `;
}

function renderBulkInput(accounts, allCategories) {
  if (bulkRows.length === 0) {
    bulkRows = [{ date: state.date, type: state.type, amount: '', category: '', fromAccount: '', toAccount: '', memo: '' }];
  }

  return `
    <div class="bulk-input-container" style="background: var(--bg-card); border-radius: 20px; border: 1px solid var(--border-color); padding: 20px; overflow-x: hidden;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
        <h3 style="font-size: 1rem; font-weight: 800;">一括入力・CSV管理</h3>
        <div style="display: flex; gap: 8px;">
          <button data-action="addBulkRow" style="background: var(--color-accent-light); color: var(--color-accent); padding: 8px 14px; border-radius: 10px; font-weight: bold; font-size: 0.75rem;">＋ 行追加</button>
          <button data-action="downloadCsvTemplate" style="background: var(--bg-hover); padding: 8px 14px; border-radius: 10px; font-weight: bold; font-size: 0.75rem;">📄 テンプレ</button>
          <button data-action="triggerCsvImport" style="background: var(--bg-hover); padding: 8px 14px; border-radius: 10px; font-weight: bold; font-size: 0.75rem;">📥 読込</button>
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
              <th></th>
            </tr>
          </thead>
          <tbody>
            ${bulkRows.map((row, i) => {
              const rowType = row.type || state.type;
              const catOptions = rowType === 'transfer' ? [] : allCategories.filter(c => c.type === rowType || c.type === 'both');
              
              return `
              <tr style="border-bottom: 1px solid var(--border-light);">
                <td style="padding:4px;"><input type="date" value="${row.date}" data-field="date" data-row="${i}" class="bulk-input" style="width:100%; border:none; background:transparent;"></td>
                <td style="padding:4px;">
                  <select data-field="type" data-row="${i}" class="bulk-input" style="width:100%; border:none; background:transparent;">
                    <option value="expense" ${rowType === 'expense' ? 'selected' : ''}>支出</option>
                    <option value="income" ${rowType === 'income' ? 'selected' : ''}>収入</option>
                    <option value="transfer" ${rowType === 'transfer' ? 'selected' : ''}>振替</option>
                  </select>
                </td>
                <td style="padding:4px;">
                  <select data-field="category" data-row="${i}" class="bulk-input" style="width:100%; border:none; background:transparent; ${rowType === 'transfer' ? 'opacity:0.3;' : ''}" ${rowType === 'transfer' ? 'disabled' : ''}>
                    <option value="">-</option>
                    ${catOptions.map(c => `<option value="${c.name}" ${c.name === row.category ? 'selected' : ''}>${c.name}</option>`).join('')}
                  </select>
                </td>
                <td style="padding:4px;"><input type="number" value="${row.amount}" data-field="amount" data-row="${i}" class="bulk-input" placeholder="0" style="width:100%; border:none; background:transparent; font-weight:bold;"></td>
                <td style="padding:4px;">
                  <select data-field="fromAccount" data-row="${i}" class="bulk-input" style="width:100%; border:none; background:transparent; ${rowType === 'income' ? 'opacity:0.3;' : ''}" ${rowType === 'income' ? 'disabled' : ''}>
                    <option value="">-</option>
                    ${accounts.map(a => `<option value="${a.name}" ${a.name === row.fromAccount ? 'selected' : ''}>${a.name}</option>`).join('')}
                  </select>
                </td>
                <td style="padding:4px;">
                  <select data-field="toAccount" data-row="${i}" class="bulk-input" style="width:100%; border:none; background:transparent; ${rowType === 'expense' ? 'opacity:0.3;' : ''}" ${rowType === 'expense' ? 'disabled' : ''}>
                    <option value="">-</option>
                    ${accounts.map(a => `<option value="${a.name}" ${a.name === row.toAccount ? 'selected' : ''}>${a.name}</option>`).join('')}
                  </select>
                </td>
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
    amountInput.addEventListener('input', (e) => {
      const val = e.target.value.replace(/[^0-9]/g, '');
      const formatted = formatComma(val);
      state.amount = formatted; e.target.value = formatted; 
    });
  }
  container.querySelector('#memo-input')?.addEventListener('input', (e) => { state.memo = e.target.value; });
  container.querySelector('[data-action="setDate"]')?.addEventListener('change', (e) => { state.date = e.target.value; });
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
  else if (action === 'setType') { state.type = target.dataset.type; state.category = null; refresh(); }
  else if (action === 'selectFromAccount') { state.fromAccount = target.dataset.name; refresh(); }
  else if (action === 'selectToAccount') { state.toAccount = target.dataset.name; refresh(); }
  else if (action === 'selectCategory') { state.category = target.dataset.name; refresh(); }
  else if (action === 'toggleFromAccounts') { state.fromAccountsExpanded = !state.fromAccountsExpanded; refresh(); }
  else if (action === 'toggleToAccounts') { state.toAccountsExpanded = !state.toAccountsExpanded; refresh(); }
  else if (action === 'toggleCategories') { state.categoriesExpanded = !state.categoriesExpanded; refresh(); }
  else if (action === 'dateToday') { state.date = new Date().toISOString().split('T')[0]; refresh(); }
  else if (action === 'submit') submit();
  else if (action === 'toggleBulk') { showBulkInput = !showBulkInput; refresh(); }
  else if (action === 'addBulkRow') { bulkRows.push({ date: state.date, amount: '', category: '', fromAccount: '', toAccount: '', memo: '' }); refresh(); }
  else if (action === 'deleteBulkRow') { bulkRows.splice(Number(target.dataset.row), 1); if (bulkRows.length===0) bulkRows=[{date:state.date,amount:'',category:'',fromAccount:'',toAccount:'',memo:''}]; refresh(); }
  else if (action === 'submitBulk') submitBulk();
  else if (action === 'triggerCsvImport') document.getElementById('csv-import-input').click();
  else if (action === 'downloadCsvTemplate') downloadCsvTemplate();
  else if (action === 'useShortcut') { const sc = store.getShortcuts().find(s => s.id === target.dataset.id); if (sc) { setQuickInput(sc); refresh(); } }
}

function downloadCsvTemplate() {
  const header = "日付,種類,カテゴリー,金額,口座,入金先,メモ\n";
  const row1 = `2026/3/1,収入,利息,2,SBI新生(固定費・ボーナス),,税引前利息\n`;
  const row2 = `2026/2/7,振替,,30000,SBI新生(固定費・ボーナス),現金,ATM 現金出金（提携取引）\n`;
  
  // 文字化け防止対策（BOM付きUTF-8）
  const bom = new Uint8Array([0xEF, 0xBB, 0xBF]);
  const blob = new Blob([bom, header + row1 + row2], { type: 'text/csv;charset=utf-8;' });
  
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
      
      bulkRows = res.data.map(r => {
        const rawType = r['種類'] || r.type || '';
        const mappedType = typeMap[rawType] || state.type;
        
        let fromAccount = r['口座'] || r.fromAccount || '';
        let toAccount = r['入金先'] || r.toAccount || '';

        // 収入の場合は「口座」に入力されたものを「入金先」として扱う
        if (mappedType === 'income' && !toAccount) {
          toAccount = fromAccount;
          fromAccount = '';
        }

        // 日付の正規化 (YYYY/M/D -> YYYY-MM-DD) - input[type=date]に必要
        let rawDate = r['日付'] || r.date || state.date;
        let date = rawDate;
        if (typeof rawDate === 'string') {
          const parts = rawDate.split(/[\/\-]/);
          if (parts.length === 3) {
            const y = parts[0];
            const m = parts[1].padStart(2, '0');
            const d = parts[2].padStart(2, '0');
            date = `${y}-${m}-${d}`;
          }
        }

        return {
          date: date,
          type: mappedType,
          amount: String(r['金額'] || r.amount || ''),
          category: r['カテゴリー'] || r.category || '',
          fromAccount,
          toAccount,
          memo: r['メモ'] || r.memo || ''
        };
      });
      refresh();
      window.showToast?.(`${bulkRows.length}件を読み込みました`);
    }
  });
}

function submit() {
  const amount = parseComma(state.amount);
  if (!amount || amount <= 0) { window.showToast?.('金額を入力してください', 'error'); return; }
  store.addTransaction({ ...state, amount, category: state.category || 'その他' });
  window.showToast?.('記録しました ✓'); resetState(); refresh();
}

function submitBulk() {
  const vs = bulkRows.filter(r => Number(r.amount) > 0);
  if (vs.length === 0) return;
  
  vs.forEach(r => {
    // 種類(type)がCSVから取得できていればそれを使用し、なければ現在のタブの種類を使用
    const finalType = r.type || state.type;
    store.addTransaction({ ...r, type: finalType, amount: Number(r.amount) });
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
  calcState = { display: String(parseComma(state.amount)), currentValue: null, operator: null, waitingForNextValue: false };
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
