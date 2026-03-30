// ============================================
// ダッシュボード画面 (v3.4 - クイック機能・自動調整統合版)
// ============================================

import * as store from '../store.js';
import { openModal, closeModal } from '../utils.js';
import { setPreFillState } from './input.js';

let totalChart = null;
let accountChart = null;
let currentPeriod = 30;
let selectedAccountId = null;

export function render(container) {
  const accounts = store.getAccounts();
  const totalBalance = store.getTotalBalance();
  const history = store.getAssetHistory(currentPeriod);
  const isPositive = totalBalance >= 0;

  // 1. HTMLの構築
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
            <div style="font-size: 2rem; margin-bottom: 8px;">📊</div>
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

  // 2. グラフの描画
  if (history.length > 0) renderTotalChart(history);
  if (selectedAccountId) renderAccountChart(selectedAccountId);

  // 3. イベント設定
  const refresh = () => render(container);

  const handleClick = (e) => {
    // 振替ドラッグ中なら無視
    if (e.target.closest('.sortable-ghost')) return;

    const card = e.target.closest('.account-card');
    if (card) {
      openAccountMenu(card.dataset.id, refresh);
    }
  };

  container.addEventListener('click', handleClick, { once: true }); // 次回描画時にリセットされるようonce:true

  container.querySelector('#period-selector')?.addEventListener('change', e => {
    currentPeriod = Number(e.target.value);
    refresh();
  });

  container.querySelector('#account-selector')?.addEventListener('change', e => {
    selectedAccountId = e.target.value;
    refresh();
  });

  // 4. ドラッグ＆ドロップ (PCのみ)
  setupDragAndDrop(container, refresh);
}

// --- クイックメニュー ---
function openAccountMenu(accountId, refresh) {
  const acc = store.getAccounts().find(a => a.id === accountId);
  if (!acc) return;

  openModal(`
    <div style="text-align: center; margin-bottom: var(--space-md);">
      <div style="font-size: 3rem; margin-bottom: var(--space-sm);">${acc.icon}</div>
      <div style="font-weight: bold; font-size: 1.2rem;">${acc.name}</div>
      <div style="color: var(--text-muted); font-size: 0.9rem;">残高: ¥${store.getAccountBalance(acc.id).toLocaleString()}</div>
    </div>
    <div class="grid grid-2 gap-md">
      <button class="btn btn-expense" id="quick-expense">🧾 支出</button>
      <button class="btn btn-income" id="quick-income">💰 収入</button>
      <button class="btn btn-transfer" id="quick-transfer">🔄 振替</button>
      <button class="btn btn-secondary" id="quick-adjust">🔢 調整</button>
    </div>
  `);

  document.getElementById('quick-expense').onclick = () => {
    if (setPreFillState) setPreFillState({ type: 'expense', account: acc.name });
    closeModal();
    window.navigateTo('input');
  };
  document.getElementById('quick-income').onclick = () => {
    if (setPreFillState) setPreFillState({ type: 'income', account: acc.name });
    closeModal();
    window.navigateTo('input');
  };
  document.getElementById('quick-transfer').onclick = () => {
    if (setPreFillState) setPreFillState({ type: 'transfer', account: acc.name });
    closeModal();
    window.navigateTo('input');
  };

  document.getElementById('quick-adjust').onclick = () => {
    const currentVal = store.getAccountBalance(acc.id);
    const input = prompt(`「${acc.name}」の現在の「本当の残高」を入力してください：`, currentVal);
    
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
          memo: '残高調整 (自動計算)'
        });
        window.showToast?.(`残高を ¥${targetVal.toLocaleString()} に修正しました`);
      }
      closeModal();
      refresh();
    }
  };
}

// --- ドラッグ＆ドロップ ---
function setupDragAndDrop(container, refresh) {
  const isPC = window.innerWidth >= 768;
  const el = container.querySelector('.account-cards');
  if (isPC && el && window.Sortable) {
    Sortable.create(el, {
      sort: false, 
      animation: 150,
      ghostClass: 'sortable-ghost',
      dragClass: 'sortable-drag',
      onMove: (evt) => {
        container.querySelectorAll('.account-card').forEach(c => c.classList.remove('drag-over'));
        if (evt.related && evt.related.classList.contains('account-card')) {
          evt.related.classList.add('drag-over');
        }
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

// --- クイック振替モーダル ---
function openQuickTransferModal(fromId, toId, refresh) {
  const fromAcc = store.getAccounts().find(a => a.id === fromId);
  const toAcc = store.getAccounts().find(a => a.id === toId);
  if (!fromAcc || !toAcc) return;

  openModal(`
    <div class="modal-header">
      <div class="modal-title">クイック振替 🔄</div>
    </div>
    <div class="quick-transfer-header" style="display:flex; justify-content:space-around; align-items:center; margin: 20px 0;">
      <div style="text-align:center"><div style="font-size:2rem">${fromAcc.icon}</div><div>${fromAcc.name}</div></div>
      <div style="font-size:1.5rem">➡</div>
      <div style="text-align:center"><div style="font-size:2rem">${toAcc.icon}</div><div>${toAcc.name}</div></div>
    </div>
    <div class="form-group">
      <label class="form-label">移動する金額</label>
      <input type="number" id="quick-transfer-amount" class="form-input" placeholder="0" inputmode="numeric">
    </div>
    <div class="form-actions" style="margin-top:20px;">
      <button class="btn btn-secondary" onclick="closeModal()">キャンセル</button>
      <button class="btn btn-primary" id="execute-quick-transfer">移動する</button>
    </div>
  `);

  const input = document.getElementById('quick-transfer-amount');
  setTimeout(() => input?.focus(), 100);

  document.getElementById('execute-quick-transfer').onclick = () => {
    const amount = Number(input.value);
    if (!amount || amount <= 0) return;

    store.addTransaction({
      date: new Date().toISOString().split('T')[0],
      type: 'transfer',
      amount: amount,
      category: '',
      fromAccount: fromAcc.name,
      toAccount: toAcc.name,
      memo: 'クイック振替'
    });
    window.showToast?.('振替を完了しました ✓');
    closeModal();
    refresh();
  };
}

// --- グラフ描画ヘルパー ---
function renderTotalChart(history) {
  const canvas = document.getElementById('asset-chart');
  if (!canvas) return;
  if (totalChart) totalChart.destroy();

  const c = getChartColors();
  totalChart = new Chart(canvas, {
    type: 'line',
    data: {
      labels: history.map(h => {
        const d = new Date(h.date);
        return `${d.getMonth() + 1}/${d.getDate()}`;
      }),
      datasets: [{
        label: '総資産',
        data: history.map(h => h.total),
        borderColor: '#6366f1',
        backgroundColor: 'rgba(99, 102, 241, 0.1)',
        borderWidth: 2.5,
        fill: true,
        tension: 0.3,
        pointRadius: history.length > 30 ? 0 : 3,
      }],
    },
    options: chartOptions(c),
  });
}

function renderAccountChart(accountId) {
  const canvas = document.getElementById('account-chart');
  if (!canvas) return;
  if (accountChart) accountChart.destroy();

  const account = store.getAccounts().find(a => a.id === accountId);
  if (!account) return;

  const history = getAccountHistory(account.name, currentPeriod);
  if (history.length === 0) return;

  const c = getChartColors();
  accountChart = new Chart(canvas, {
    type: 'line',
    data: {
      labels: history.map(h => {
        const d = new Date(h.date);
        return `${d.getMonth() + 1}/${d.getDate()}`;
      }),
      datasets: [{
        label: account.name,
        data: history.map(h => h.balance),
        borderColor: '#10b981',
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        borderWidth: 2.5,
        fill: true,
        tension: 0.3,
        pointRadius: 0,
      }],
    },
    options: chartOptions(c),
  });
}

function getAccountHistory(accountName, days) {
  const transactions = store.getTransactions().sort((a, b) => a.date.localeCompare(b.date));
  const account = store.getAccounts().find(a => a.name === accountName);
  let balance = account?.initialBalance || 0;
  const balances = {};

  transactions.forEach(tx => {
    const amt = Number(tx.amount) || 0;
    if (tx.type === 'income' && tx.toAccount === accountName) balance += amt;
    else if (tx.type === 'expense' && tx.fromAccount === accountName) balance -= amt;
    else if (tx.type === 'transfer') {
      if (tx.fromAccount === accountName) balance -= amt;
      if (tx.toAccount === accountName) balance += amt;
    }
    balances[tx.date] = balance;
  });

  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(endDate.getDate() - days);
  const startStr = startDate.toISOString().split('T')[0];

  return Object.entries(balances)
    .filter(([date]) => date >= startStr)
    .map(([date, bal]) => ({ date, balance: bal }));
}

function getChartColors() {
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  return {
    gridColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
    textColor: isDark ? '#9ca3b8' : '#6b7280',
    tooltipBg: isDark ? '#1e1e35' : '#ffffff',
    tooltipBody: isDark ? '#e8e8f0' : '#1a1a2e',
    tooltipBorder: isDark ? '#2d2d4a' : '#e5e7eb',
  };
}

function chartOptions(c) {
  return {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      x: { grid: { display: false }, ticks: { color: c.textColor, maxTicksLimit: 7 } },
      y: { grid: { color: c.gridColor }, ticks: { color: c.textColor, callback: v => '¥' + (v/1000) + 'k' } }
    }
  };
}
