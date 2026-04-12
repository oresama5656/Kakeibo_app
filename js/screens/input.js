// ============================================
// 入力画面 (v2.6 - CSVテンプレ・一括・電卓・カンマ 全機能版)
// ============================================

import * as store from '../store.js';

let lastUsedDate = localStorage.getItem('kakeibo_last_date') || '';

let state = {
  type: 'expense',
  amount: '', 
  fromAccountId: null,
  toAccountId: null,
  categoryId: null,
  date: store.formatLocalDate(),
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
  state = { 
    ...state, 
    ...data, 
    amount: data.amount ? formatComma(data.amount) : '', 
    fromAccountsExpanded: false, 
    toAccountsExpanded: false, 
    categoriesExpanded: false 
  };
  
  // ショートカットが名称で持っている場合の補完
  const accs = store.getAccounts();
  const cats = store.getCategories();
  if (data.fromAccount && !state.fromAccountId) {
    const a = accs.find(i => i.name === data.fromAccount);
    if (a) state.fromAccountId = a.id;
  }
  if (data.toAccount && !state.toAccountId) {
    const a = accs.find(i => i.name === data.toAccount);
    if (a) state.toAccountId = a.id;
  }
  if (data.category && !state.categoryId) {
    const c = cats.find(i => i.name === data.category);
    if (c) state.categoryId = c.id;
  }

  if (data.type === 'expense') state.toAccountId = null;
  else if (data.type === 'income') state.fromAccountId = null;
}

function resetState() {
  state = { 
    ...state, 
    amount: '', 
    fromAccountId: null, 
    toAccountId: null, 
    categoryId: null, 
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
  
  // 表示アイテムの決定 (ロジックを整理)
  let displayItems;
  if (expanded) {
    displayItems = all;
  } else if (pinned.length > 0) {
    displayItems = [...pinned];
    // 選択中のアイテムがピン留めになければ追加
    if (selectedItem && !pinned.some(i => i.id === selectedId)) {
      displayItems.push(selectedItem);
    }
  } else {
    displayItems = selectedItem ? [selectedItem] : [];
  }

  const showToggleButton = all.length > pinned.length;

  return `
    <div class="selector-section">
      <div class="selector-header">
        <span class="selector-title">
          ${store.escapeHTML(sectionTitle)}
          ${selectedItem ? `
            <span class="selected-summary-chip">
              ${store.escapeHTML(selectedItem.icon)} ${store.escapeHTML(selectedItem.name)}
              ${selectedItem.initialBalance !== undefined ? `<span style="font-size:0.75rem; opacity:0.7; margin-left:6px; font-weight: 500;">(残高: ¥${store.getAccountBalance(selectedId).toLocaleString()})</span>` : ''}
            </span>` : ''}
        </span>
        ${showToggleButton ? `<button class="selector-expand" data-action="${store.escapeHTML(onToggle)}">${expanded ? '▲ 閉じる' : '▼ 全表示'}</button>` : ''}
      </div>
      <div class="icon-grid ${expanded ? 'expanded' : ''}">
        ${displayItems.length > 0 ? displayItems.map(item => `
          <div class="icon-item ${item.id === selectedId ? 'selected' : ''}" data-action="${store.escapeHTML(onSelect)}" data-id="${store.escapeHTML(item.id)}">
            <span class="icon-emoji">${store.escapeHTML(item.icon)}</span>
            <span class="icon-label">${store.escapeHTML(item.name)}</span>
          </div>
        `).join('') : `<div style="padding: 10px; color: var(--text-muted); font-size: 0.8rem; text-align: center; width: 100%;">選択してください</div>`}
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

    ${showFromAccount ? renderIconGrid(accounts, state.fromAccountId, state.fromAccountsExpanded, 'selectFromAccount', 'toggleFromAccounts', state.type === 'transfer' ? '💴 出金元' : '💴 口座') : ''}
    ${showToAccount ? renderIconGrid(accounts, state.toAccountId, state.toAccountsExpanded, 'selectToAccount', 'toggleToAccounts', state.type === 'transfer' ? '💴 入金先' : '💴 入金口座') : ''}
    ${showCategories ? renderIconGrid(categories, state.categoryId, state.categoriesExpanded, 'selectCategory', 'toggleCategories', '📁 カテゴリー') : ''}

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
    bulkRows = [{ date: state.date, type: state.type, amount: '', categoryId: '', fromAccountId: '', toAccountId: '', memo: '' }];
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
                  <select data-field="categoryId" data-row="${i}" class="bulk-input" style="width:100%; border:none; background:transparent; ${rowType === 'transfer' ? 'opacity:0.3;' : ''}" ${rowType === 'transfer' ? 'disabled' : ''}>
                    <option value="">-</option>
                    ${catOptions.map(c => `<option value="${c.id}" ${c.id === row.categoryId ? 'selected' : ''}>${c.name}</option>`).join('')}
                  </select>
                </td>
                <td style="padding:4px;"><input type="number" value="${row.amount}" data-field="amount" data-row="${i}" class="bulk-input" placeholder="0" style="width:100%; border:none; background:transparent; font-weight:bold;"></td>
                <td style="padding:4px;">
                  <select data-field="fromAccountId" data-row="${i}" class="bulk-input" style="width:100%; border:none; background:transparent;">
                    <option value="">-</option>
                    ${accounts.map(a => `<option value="${a.id}" ${a.id === row.fromAccountId ? 'selected' : ''}>${a.name}</option>`).join('')}
                  </select>
                </td>
                <td style="padding:4px;">
                  <select data-field="toAccountId" data-row="${i}" class="bulk-input" style="width:100%; border:none; background:transparent; ${rowType !== 'transfer' ? 'opacity:0.3;' : ''}" ${rowType !== 'transfer' ? 'disabled' : ''}>
                    <option value="">-</option>
                    ${accounts.map(a => `<option value="${a.id}" ${a.id === row.toAccountId ? 'selected' : ''}>${a.name}</option>`).join('')}
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
    amountInput.oninput = (e) => {
      const val = e.target.value.replace(/[^0-9]/g, '');
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
  else if (action === 'addBulkRow') { bulkRows.push({ date: state.date, amount: '', categoryId: '', fromAccountId: '', toAccountId: '', memo: '' }); refresh(); }
  else if (action === 'deleteBulkRow') { bulkRows.splice(Number(target.dataset.row), 1); if (bulkRows.length===0) bulkRows=[{date:state.date,amount:'',categoryId:'',fromAccountId:'',toAccountId:'',memo:''}]; refresh(); }
  else if (action === 'submitBulk') submitBulk();
  else if (action === 'triggerCsvImport') document.getElementById('csv-import-input').click();
  else if (action === 'downloadCsvTemplate') downloadCsvTemplate();
  else if (action === 'useShortcut') { const sc = store.getShortcuts().find(s => s.id === target.dataset.id); if (sc) { setQuickInput(sc); refresh(); } }
}

function downloadCsvTemplate() {
  const header = "日付,種類,カテゴリー,金額,口座,入金先,メモ\n";
  const now = new Date();
  const dateStr = `${now.getFullYear()}/${now.getMonth() + 1}/${now.getDate()}`;
  
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

      bulkRows = res.data.map(r => {
        const rawType = r['種類'] || r.type || '';
        const mappedType = typeMap[rawType] || state.type;
        
        const rawFrom = r['口座'] || r.fromAccount || '';
        const rawTo = r['入金先'] || r.toAccount || '';
        const rawCat = r['カテゴリー'] || r.category || '';

        // 名称からIDを検索（名寄せ）
        const fromAcc = accs.find(a => a.name.trim() === rawFrom.trim());
        const toAcc = accs.find(a => a.name.trim() === rawTo.trim());
        const cat = cats.find(c => c.name.trim() === rawCat.trim());

        // 日付の正規化 (YYYY/M/D -> YYYY-MM-DD)
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
          category: rawCat,
          categoryId: cat ? cat.id : '',
          fromAccount: rawFrom,
          fromAccountId: fromAcc ? fromAcc.id : '',
          toAccount: rawTo,
          toAccountId: toAcc ? toAcc.id : '',
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
  if (op === '/') return v1 / v2;
  return v2;
}

function updateCalcDisplay(mainEl, formulaEl) {
  mainEl.textContent = formatComma(calcState.display);
  let opSymbol = { '+': '+', '-': '-', '*': '×', '/': '÷' }[calcState.operator] || '';
  formulaEl.textContent = calcState.currentValue != null ? `${formatComma(calcState.currentValue)} ${opSymbol}` : '';
}
