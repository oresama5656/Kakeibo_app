// ============================================
// ダッシュボード画面 (v3.5 - 安全性強化版)
// ============================================

import * as store from '../store.js';
import { openModal, closeModal } from '../utils.js';
import { setPreFillState } from './input.js';

let totalChart = null;
let accountChart = null;
let currentPeriod = 30;
let selectedAccountId = null;

export function render(container) {
  try {
    const accounts = store.getAccounts();
    const totalBalance = store.getTotalBalance();
    const history = store.getAssetHistory(currentPeriod) || [];
    const isPositive = totalBalance >= 0;

    // 1. HTML構築
    container.innerHTML = `
      <div class="dashboard-screen">
        <div class="dashboard-header">
          <div class="total-label">総資産</div>
          <div class="total-amount ${isPositive ? 'positive' : 'negative'}">
            ¥${Math.abs(totalBalance).toLocaleString('ja-JP')}
          </div>
        </div>

        <!-- Total Asset Trend Chart -->
        <div class="chart-card">
          <div class="chart-card-title">📈 資産推移</div>
          <select class="form-input" id="period-selector" style="margin-bottom: var(--space-md); font-size: var(--font-size-sm);">
            <option value="30" ${currentPeriod === 30 ? 'selected' : ''}>過去1ヶ月</option>
            <option value="90" ${currentPeriod === 90 ? 'selected' : ''}>過去3ヶ月</option>
            <option value="180" ${currentPeriod === 180 ? 'selected' : ''}>過去6ヶ月</option>
            <option value="365" ${currentPeriod === 365 ? 'selected' : ''}>過去1年</option>
            <option value="9999" ${currentPeriod === 9999 ? 'selected' : ''}>全期間</option>
          </select>
          <div class="chart-container">
            <canvas id="asset-chart"></canvas>
          </div>
          ${history.length === 0 ? `
            <div style="text-align:center; padding: 40px 0; color: var(--text-muted);">
              取引を入力するとグラフが表示されます
            </div>
          ` : ''}
        </div>

        <!-- Account Balance Trend Chart -->
        <div class="chart-card">
          <div class="chart-card-title">🏦 口座別残高推移</div>
          <select class="form-input" id="account-selector" style="margin-bottom: var(--space-md); font-size: var(--font-size-sm);">
            <option value="">口座を選択してください</option>
            ${accounts.map(acc => `
              <option value="${acc.id}" ${selectedAccountId === acc.id ? 'selected' : ''}>
                ${acc.icon} ${acc.name}
              </option>
            `).join('')}
          </select>
          <div class="chart-container">
            <canvas id="account-chart"></canvas>
          </div>
          ${!selectedAccountId ? `
            <div style="text-align:center; padding: 30px 0; color: var(--text-muted);">
              リストから口座を選択してください
            </div>
          ` : ''}
        </div>

        <!-- Account Balance Cards -->
        <div class="chart-card">
          <div class="chart-card-title">💰 口座別残高</div>
          <div class="account-cards">
            ${accounts.map(acc => {
              const balance = store.getAccountBalance(acc.id);
              return `
                <div class="account-card" data-id="${acc.id}" style="cursor:pointer;">
                  <span class="account-card-icon">${acc.icon}</span>
                  <div class="account-card-info">
                    <div class="account-card-name">${acc.name}</div>
                    <div class="account-card-balance" style="color: ${balance >= 0 ? 'var(--color-income)' : 'var(--color-expense)'}">
                      ¥${Math.abs(balance).toLocaleString('ja-JP')}
                    </div>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        </div>
      </div>
    `;

    // 2. グラフ描画 (Error Guard付)
    try {
      if (history.length > 0 && typeof Chart !== 'undefined') renderTotalChart(history);
      if (selectedAccountId && typeof Chart !== 'undefined') renderAccountChart(selectedAccountId);
    } catch (chartErr) {
      console.error('Dashboard Chart Error:', chartErr);
    }

    // 3. イベント登録
    const refresh = () => render(container);

    container.onclick = (e) => {
      const card = e.target.closest('.account-card');
      if (card && !e.target.closest('.sortable-ghost')) {
        openAccountMenu(card.dataset.id, refresh);
      }
    };

    container.querySelector('#period-selector')?.onchange = (e) => {
      currentPeriod = Number(e.target.value);
      refresh();
    };

    container.querySelector('#account-selector')?.onchange = (e) => {
      selectedAccountId = e.target.value;
      refresh();
    };

    // 4. ドラッグ＆ドロップ (PCのみ)
    setupDragAndDrop(container, refresh);

  } catch (err) {
    console.error('CRITICAL: Dashboard render failed:', err);
    container.innerHTML = `<div style="padding:20px; color:red;">ダッシュボードの読み込みに失敗しました: ${err.message}</div>`;
  }
}

function openAccountMenu(accountId, refresh) {
  const acc = store.getAccounts().find(a => a.id === accountId);
  if (!acc) return;

  openModal(`
    <div style="text-align: center; margin-bottom: var(--space-md);">
      <div style="font-size: 3rem; margin-bottom: var(--space-sm);">${acc.icon}</div>
      <div style="font-weight: bold; font-size: 1.2rem;">${acc.name}</div>
    </div>
    <div class="grid grid-2 gap-md">
      <button class="btn btn-expense" id="quick-expense">🧾 支出</button>
      <button class="btn btn-income" id="quick-income">💰 収入</button>
      <button class="btn btn-transfer" id="quick-transfer">🔄 振替</button>
      <button class="btn btn-secondary" id="quick-adjust">🔢 調整</button>
    </div>
  `);

  document.getElementById('quick-expense').onclick = () => {
    setPreFillState({ type: 'expense', account: acc.name });
    closeModal();
    window.navigateTo('input');
  };
  document.getElementById('quick-income').onclick = () => {
    setPreFillState({ type: 'income', account: acc.name });
    closeModal();
    window.navigateTo('input');
  };
  document.getElementById('quick-transfer').onclick = () => {
    setPreFillState({ type: 'transfer', account: acc.name });
    closeModal();
    window.navigateTo('input');
  };
  document.getElementById('quick-adjust').onclick = () => {
    const currentVal = store.getAccountBalance(acc.id);
    const input = prompt(`「${acc.name}」の本当の残高を入力してください：`, currentVal);
    if (input !== null && !isNaN(input)) {
        const targetVal = Number(input);
        const diff = targetVal - currentVal;
        if (diff !== 0) {
          store.addTransaction({
            date: new Date().toISOString().split('T')[0],
            type: diff > 0 ? 'income' : 'expense',
            amount: Math.abs(diff),
            category: '残高調整',
            fromAccount: diff < 0 ? acc.name : '',
            toAccount: diff > 0 ? acc.name : '',
            memo: '残高調整'
          });
          window.showToast?.(`残高を ¥${targetVal.toLocaleString()} に修正しました`);
        }
        closeModal();
        refresh();
    }
  };
}

function setupDragAndDrop(container, refresh) {
  const isPC = window.innerWidth >= 768;
  const el = container.querySelector('.account-cards');
  if (isPC && el && window.Sortable) {
    Sortable.create(el, {
      sort: false, 
      animation: 150,
      onMove: (evt) => {
        container.querySelectorAll('.account-card').forEach(c => c.classList.remove('drag-over'));
        if (evt.related) evt.related.classList.add('drag-over');
      },
      onEnd: (evt) => {
        container.querySelectorAll('.account-card').forEach(c => c.classList.remove('drag-over'));
        const item = evt.item;
        const originalPointerEvents = item.style.pointerEvents;
        item.style.pointerEvents = 'none';

        const touch = evt.originalEvent.changedTouches ? evt.originalEvent.changedTouches[0] : evt.originalEvent;
        const targetEl = document.elementFromPoint(touch.clientX, touch.clientY)?.closest('.account-card');
        item.style.pointerEvents = originalPointerEvents;

        if (targetEl && targetEl !== item) {
          openQuickTransferModal(item.dataset.id, targetEl.dataset.id, refresh);
        } else {
          refresh();
        }
      }
    });
  }
}

function openQuickTransferModal(fromId, toId, refresh) {
  const fromAcc = store.getAccounts().find(a => a.id === fromId);
  const toAcc = store.getAccounts().find(a => a.id === toId);
  if (!fromAcc || !toAcc) return;

  openModal(`
    <div class="modal-title">クイック振替 🔄</div>
    <div style="display:flex; justify-content:space-around; padding: 20px 0;">
      <div>${fromAcc.icon} ${fromAcc.name}</div>
      <div>➡</div>
      <div>${toAcc.icon} ${toAcc.name}</div>
    </div>
    <input type="number" id="quick-transfer-amount" class="form-input" placeholder="金額を入力">
    <div class="form-actions" style="margin-top:20px;">
      <button class="btn btn-secondary" onclick="closeModal()">キャンセル</button>
      <button class="btn btn-primary" id="execute-quick-transfer">移動</button>
    </div>
  `);

  document.getElementById('execute-quick-transfer').onclick = () => {
    const amount = Number(document.getElementById('quick-transfer-amount').value);
    if (amount > 0) {
      store.addTransaction({
        date: new Date().toISOString().split('T')[0], type: 'transfer',
        amount, fromAccount: fromAcc.name, toAccount: toAcc.name, memo: 'クイック振替'
      });
      closeModal();
      refresh();
    }
  };
}

function renderTotalChart(history) {
  const canvas = document.getElementById('asset-chart');
  if (!canvas) return;
  if (totalChart) totalChart.destroy();
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  totalChart = new Chart(canvas, {
    type: 'line',
    data: {
      labels: history.map(h => h.date.slice(5)),
      datasets: [{
        label: '総資産', data: history.map(h => h.total),
        borderColor: '#6366f1', tension: 0.3, fill: true, backgroundColor: 'rgba(99, 102, 241, 0.1)'
      }]
    },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }
  });
}

function renderAccountChart(accountId) {
  const canvas = document.getElementById('account-chart');
  if (!canvas) return;
  if (accountChart) accountChart.destroy();
  const acc = store.getAccounts().find(a => a.id === accountId);
  if (!acc) return;
  const history = getAccountHistory(acc.name, currentPeriod);
  accountChart = new Chart(canvas, {
    type: 'line',
    data: {
      labels: history.map(h => h.date.slice(5)),
      datasets: [{
        label: acc.name, data: history.map(h => h.balance),
        borderColor: '#10b981', tension: 0.3, fill: true, backgroundColor: 'rgba(16, 185, 129, 0.1)'
      }]
    },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }
  });
}

function getAccountHistory(name, days) {
  const txs = store.getTransactions().sort((a,b) => a.date.localeCompare(b.date));
  const acc = store.getAccounts().find(a => a.name === name);
  let bal = acc?.initialBalance || 0;
  const map = {};
  txs.forEach(t => {
    const a = Number(t.amount) || 0;
    if (t.type === 'income' && t.toAccount === name) bal += a;
    else if (t.type === 'expense' && t.fromAccount === name) bal -= a;
    else if (t.type === 'transfer') {
      if (t.fromAccount === name) bal -= a;
      if (t.toAccount === name) bal += a;
    }
    map[t.date] = bal;
  });
  const start = new Date(); start.setDate(start.getDate() - days);
  const startStr = start.toISOString().split('T')[0];
  return Object.entries(map).filter(([d]) => d >= startStr).map(([d, b]) => ({ date: d, balance: b }));
}
