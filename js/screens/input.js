// ============================================
// 入力画面 (v2.2 - 電卓機能搭載版)
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

// 電卓の状態
let calcState = {
  display: '0',
  currentValue: null,
  operator: null,
  waitingForNextValue: false
};

export function setQuickInput(data) {
  state = { ...state, ...data, fromAccountsExpanded: false, toAccountsExpanded: false, categoriesExpanded: false };
  if (data.type === 'expense') state.toAccount = null;
  else if (data.type === 'income') state.fromAccount = null;
}

function resetState() {
  state = { ...state, amount: '', fromAccount: null, toAccount: null, category: null, memo: '', fromAccountsExpanded: false, toAccountsExpanded: false, categoriesExpanded: false };
}

function sortItems(items) {
  const pinned = items.filter(i => i.pinned).sort((a, b) => (a.order || 0) - (b.order || 0));
  const rest = items.filter(i => !i.pinned).sort((a, b) => (a.order || 0) - (b.order || 0));
  return { pinned, rest, all: [...pinned, ...rest] };
}

function renderIconGrid(items, selectedName, expanded, onSelect, onToggle, sectionTitle) {
  const { pinned, rest, all } = sortItems(items);
  let selectedItem = all.find(i => i.name === selectedName);
  if (!selectedItem && selectedName) selectedItem = { name: selectedName, icon: '⚖️' };
  
  const showExpand = rest.length > 0;
  const isPC = window.innerWidth >= 768;
  let displayItems = expanded ? all : [...pinned];
  if (!isPC && !expanded) displayItems = [];
  if (selectedItem && !displayItems.find(i => i.name === selectedItem.name)) displayItems.push(selectedItem);

  return `
    <div class="selector-section">
      <div class="selector-header">
        <span class="selector-title">
          ${sectionTitle}
          ${selectedItem ? `<span class="selected-summary-chip">${selectedItem.icon} ${selectedItem.name}</span>` : ''}
        </span>
        ${showExpand ? `<button class="selector-expand" data-action="${onToggle}">${expanded ? '▲ 閉じる' : `▼ 全${all.length}件`}</button>` : ''}
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
  const categories = state.type === 'transfer' ? [] : allCategories.filter(c => c.type === state.type || c.type === 'both');
  const showFromAccount = state.type === 'expense' || state.type === 'transfer';
  const showToAccount = state.type === 'income' || state.type === 'transfer';
  const showCategories = state.type !== 'transfer';
  const isPC = window.innerWidth >= 768;

  container.innerHTML = `
    <div class="input-screen">
      <div class="type-toggle">
        <button class="type-btn ${state.type === 'expense' ? 'active' : ''}" data-action="setType" data-type="expense">支出</button>
        <button class="type-btn ${state.type === 'income' ? 'active' : ''}" data-action="setType" data-type="income">収入</button>
        <button class="type-btn ${state.type === 'transfer' ? 'active' : ''}" data-action="setType" data-type="transfer">振替</button>
        ${isPC ? `<button class="type-btn bulk-toggle ${showBulkInput ? 'active' : ''}" data-action="toggleBulk"> 一括入力</button>` : ''}
      </div>
      ${showBulkInput && isPC ? renderBulkInput(accounts, allCategories) : renderSingleInput(accounts, categories, shortcuts, showFromAccount, showToAccount, showCategories)}
    </div>
  `;
  bindEvents(container);
}

function renderSingleInput(accounts, categories, shortcuts, showFromAccount, showToAccount, showCategories) {
  return `
    <div class="input-fields">
      <div class="amount-input-section" style="position: relative; margin-bottom: 24px;">
        <div class="amount-input-wrapper" style="display: flex; align-items: center; border-radius: 20px; background: var(--bg-card); padding: 10px 20px; box-shadow: var(--shadow-sm); border: 1px solid var(--border-color);">
          <span class="amount-yen" style="font-size: 1.5rem; color: var(--text-muted); font-weight: 800; margin-right: 12px;">¥</span>
          <input type="number" class="amount-field" id="amount-input" value="${state.amount}" placeholder="0" inputmode="numeric" data-action="setAmount" style="flex: 1; border: none; background: transparent; font-size: 2.2rem; font-weight: 800; color: var(--text-primary); text-align: left; padding: 0;">
          <button data-action="openCalculator" title="電卓を開く" style="background: var(--bg-hover); border: none; width: 44px; height: 44px; border-radius: 12px; font-size: 1.4rem; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: transform 0.2s;">🧮</button>
        </div>
      </div>
      ${showFromAccount ? renderIconGrid(accounts, state.fromAccount, state.fromAccountsExpanded, 'selectFromAccount', 'toggleFromAccounts', state.type === 'transfer' ? '💴 出金元' : '💴 口座') : ''}
      ${showToAccount ? renderIconGrid(accounts, state.toAccount, state.toAccountsExpanded, 'selectToAccount', 'toggleToAccounts', state.type === 'transfer' ? '💴 入金先' : '💴 入金口座') : ''}
      ${showCategories ? renderIconGrid(categories, state.category, state.categoriesExpanded, 'selectCategory', 'toggleCategories', '📁 カテゴリー') : ''}
      <div class="selector-section">
        <div class="selector-header"><span class="selector-title">📅 補足情報</span></div>
        <div style="display: flex; gap: 8px; margin-bottom: 12px;">
          <input type="date" class="date-input" value="${state.date}" data-action="setDate" style="flex: 1; padding: 12px; border-radius: 14px; border: 1px solid var(--border-color); background: var(--bg-card);">
          <button data-action="dateToday" style="padding: 0 16px; border-radius: 14px; border: 1px solid var(--border-color); background: var(--bg-card); font-size: 0.8rem; font-weight: bold;">今日</button>
        </div>
        <input type="text" placeholder="メモを入力..." value="${state.memo}" id="memo-input" style="width: 100%; height: 50px; padding: 0 16px; border-radius: 14px; border: 1px solid var(--border-color); background: var(--bg-card); font-size: 0.9rem;">
      </div>
      <button class="submit-btn ${state.type}-mode" data-action="submit" style="height: 64px; font-size: 1.2rem; font-weight: 800; border-radius: 20px; margin-top: 24px; box-shadow: var(--shadow-sm);">${state.type === 'expense' ? '支出' : state.type === 'income' ? '収入' : '振替'}を記録 ✓</button>
    </div>
  `;
}

function bindEvents(container) {
  container.addEventListener('click', handleClick);
  container.querySelector('#amount-input')?.addEventListener('input', (e) => { state.amount = e.target.value; });
  container.querySelector('#memo-input')?.addEventListener('input', (e) => { state.memo = e.target.value; });
  container.querySelector('[data-action="setDate"]')?.addEventListener('change', (e) => { state.date = e.target.value; });
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
  else if (action === 'useShortcut') {
    const sc = store.getShortcuts().find(s => s.id === target.dataset.id);
    if (sc) { setQuickInput(sc); refresh(); }
  }
}

// -----------------------------------------------------------------------------------
// 電卓ロジック (Calculator UI & Logic)
// -----------------------------------------------------------------------------------

function openCalculator() {
  const overlay = document.createElement('div');
  overlay.className = 'calc-overlay';
  overlay.style = `position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.4); backdrop-filter:blur(4px); z-index:4000; display:flex; align-items:flex-end; justify-content:center; animation: fadeIn 0.2s;`;
  
  overlay.innerHTML = `
    <div class="calc-container" style="width:100%; max-width:440px; background:var(--bg-app); border-top-left-radius:30px; border-top-right-radius:30px; padding:20px; padding-bottom: max(30px, env(safe-area-inset-bottom)); box-shadow: 0 -10px 40px rgba(0,0,0,0.1); animation: slideUp 0.3s cubic-bezier(0.2, 0.8, 0.2, 1);">
      <div style="width:40px; height:4px; background:var(--border-color); border-radius:2px; margin:0 auto 20px; opacity:0.5;"></div>
      <div id="calc-display" style="background:var(--bg-card); padding:16px 20px; border-radius:18px; text-align:right; font-size:2.4rem; font-weight:800; font-family:monospace; margin-bottom:20px; overflow:hidden; border:1px solid var(--border-color); line-height:1; min-height:80px; display:flex; flex-direction:column; justify-content:center;">
        <div id="calc-formula" style="font-size:0.9rem; color:var(--text-muted); opacity:0.7; min-height:1.2em; font-weight:500;"></div>
        <div id="calc-main-num">0</div>
      </div>
      <div class="calc-grid" style="display:grid; grid-template-columns: repeat(4, 1fr); gap:12px;">
        <!-- Row 1 --><button class="calc-btn op" data-val="AC" style="background:#ef4444; color:white;">AC</button><button class="calc-btn op" data-val="C">C</button><button class="calc-btn op" data-val="/">÷</button><button class="calc-btn op" data-val="*">×</button>
        <!-- Row 2 --><button class="calc-btn" data-val="7">7</button><button class="calc-btn" data-val="8">8</button><button class="calc-btn" data-val="9">9</button><button class="calc-btn op" data-val="-">-</button>
        <!-- Row 3 --><button class="calc-btn" data-val="4">4</button><button class="calc-btn" data-val="5">5</button><button class="calc-btn" data-val="6">6</button><button class="calc-btn op" data-val="+">+</button>
        <!-- Row 4 --><button class="calc-btn" data-val="1">1</button><button class="calc-btn" data-val="2">2</button><button class="calc-btn" data-val="3">3</button><button class="calc-btn ok" data-val="=" style="grid-row: span 2; background:var(--color-accent); color:white; font-size:1.8rem; font-weight:800;">=</button>
        <!-- Row 5 --><button class="calc-btn" data-val="0" style="grid-column: span 2;">0</button><button class="calc-btn" data-val=".">.</button>
      </div>
      <div style="display:flex; gap:12px; margin-top:20px;">
        <button id="calc-cancel-btn" style="flex:1; height:56px; border:1px solid var(--border-color); background:var(--bg-card); border-radius:18px; font-weight:bold; cursor:pointer;">キャンセル</button>
        <button id="calc-apply-btn" style="flex:2; height:56px; border:none; background:var(--color-accent); color:white; border-radius:18px; font-weight:bold; font-size:1.1rem; cursor:pointer; box-shadow: var(--shadow-sm);">計算結果を入力 ✓</button>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  const displayMain = overlay.querySelector('#calc-main-num');
  const displayFormula = overlay.querySelector('#calc-formula');
  
  // 初期化
  calcState = { display: state.amount || '0', currentValue: null, operator: null, waitingForNextValue: false };
  updateCalcDisplay(displayMain, displayFormula);

  overlay.addEventListener('click', (e) => {
    const btn = e.target.closest('.calc-btn');
    if (btn) handleCalcInput(btn.dataset.val, displayMain, displayFormula);
    if (e.target === overlay || e.target.id === 'calc-cancel-btn') overlay.remove();
    if (e.target.id === 'calc-apply-btn') {
      state.amount = calcState.display;
      overlay.remove();
      refresh();
    }
  });
}

function handleCalcInput(val, displayMain, displayFormula) {
  if (!isNaN(val) || val === '.') {
    if (calcState.waitingForNextValue) {
      calcState.display = val === '.' ? '0.' : val;
      calcState.waitingForNextValue = false;
    } else {
      if (val === '.' && calcState.display.includes('.')) return;
      calcState.display = calcState.display === '0' && val !== '.' ? val : calcState.display + val;
    }
  } else if (val === 'AC') {
    calcState = { display: '0', currentValue: null, operator: null, waitingForNextValue: false };
  } else if (val === 'C') {
    calcState.display = calcState.display.length > 1 ? calcState.display.slice(0, -1) : '0';
  } else {
    const inputValue = parseFloat(calcState.display);
    if (calcState.currentValue === null) {
      calcState.currentValue = inputValue;
    } else if (calcState.operator) {
      const result = calculateResult(calcState.currentValue, inputValue, calcState.operator);
      calcState.display = String(result);
      calcState.currentValue = result;
    }
    calcState.waitingForNextValue = true;
    calcState.operator = val === '=' ? null : val;
  }
  updateCalcDisplay(displayMain, displayFormula);
}

function updateCalcDisplay(main, formula) {
  main.innerText = calcState.display;
  let op = calcState.operator;
  if (op === '*') op = '×'; if (op === '/') op = '÷';
  formula.innerText = calcState.currentValue !== null ? `${calcState.currentValue} ${op || ''}` : '';
}

function calculateResult(a, b, op) {
  switch (op) {
    case '+': return a + b;
    case '-': return a - b;
    case '*': return a * b;
    case '/': return b !== 0 ? a / b : 0;
    default: return b;
  }
}

function submit() {
  const amount = Number(state.amount);
  if (!amount || amount <= 0) { window.showToast?.('金額を入力してください', 'error'); return; }
  store.addTransaction({ ...state, amount, category: state.category || 'その他' });
  window.showToast?.('記録しました ✓');
  resetState(); refresh();
}

function refresh() {
  const container = document.getElementById('screen-input');
  if (container) { container.removeEventListener('click', handleClick); render(container); }
}

function renderBulkInput(accounts, categories) {
  return `<div class="bulk-input-section">一括入力は準備中（または既存のコードを維持）</div>`;
}
