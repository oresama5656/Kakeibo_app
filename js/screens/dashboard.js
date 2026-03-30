// ============================================
// ダッシュボード画面 (v2 - 口座別残高推移追加)
// ============================================

import * as store from '../store.js';

let totalChart = null;
let accountChart = null;
let currentPeriod = 90;
let selectedAccountId = null;

export function render(container) {
  const accounts = store.getAccounts();
  const totalBalance = store.getTotalBalance();
  const history = store.getAssetHistory(currentPeriod);

  const isPositive = totalBalance >= 0;

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
        <div class="chart-period-toggle">
          <button class="period-btn ${currentPeriod === 30 ? 'active' : ''}" data-action="setPeriod" data-days="30">1ヶ月</button>
          <button class="period-btn ${currentPeriod === 90 ? 'active' : ''}" data-action="setPeriod" data-days="90">3ヶ月</button>
          <button class="period-btn ${currentPeriod === 180 ? 'active' : ''}" data-action="setPeriod" data-days="180">6ヶ月</button>
          <button class="period-btn ${currentPeriod === 365 ? 'active' : ''}" data-action="setPeriod" data-days="365">1年</button>
          <button class="period-btn ${currentPeriod === 9999 ? 'active' : ''}" data-action="setPeriod" data-days="9999">全期間</button>
        </div>
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
        <div class="chart-period-toggle">
          ${accounts.map(acc => `
            <button class="period-btn ${selectedAccountId === acc.id ? 'active' : ''}"
                    data-action="selectAccount" data-id="${acc.id}">
              ${acc.icon} ${acc.name}
            </button>
          `).join('')}
        </div>
        <div class="chart-container">
          <canvas id="account-chart"></canvas>
        </div>
        ${!selectedAccountId ? `
          <div style="text-align:center; padding: 30px 0; color: var(--text-muted);">
            上のボタンから口座を選択してください
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
              <div class="account-card" data-action="selectAccount" data-id="${acc.id}" style="cursor:pointer;">
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

  // Render charts
  if (history.length > 0) {
    renderTotalChart(history);
  }
  if (selectedAccountId) {
    renderAccountChart(selectedAccountId);
  }

  container.addEventListener('click', handleClick);
}

function handleClick(e) {
  const target = e.target.closest('[data-action]');
  if (!target) return;

  if (target.dataset.action === 'setPeriod') {
    currentPeriod = Number(target.dataset.days);
    refresh();
  } else if (target.dataset.action === 'selectAccount') {
    selectedAccountId = target.dataset.id;
    refresh();
  }
}

function getChartColors() {
  const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches ||
    document.documentElement.getAttribute('data-theme') === 'dark';
  return {
    gridColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
    textColor: isDark ? '#9ca3b8' : '#6b7280',
    tooltipBg: isDark ? '#1e1e35' : '#ffffff',
    tooltipBody: isDark ? '#e8e8f0' : '#1a1a2e',
    tooltipBorder: isDark ? '#2d2d4a' : '#e5e7eb',
  };
}

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
        pointHoverRadius: 5,
        pointBackgroundColor: '#6366f1',
      }],
    },
    options: chartOptions(c),
  });
}

function renderAccountChart(accountId) {
  const canvas = document.getElementById('account-chart');
  if (!canvas) return;
  if (accountChart) accountChart.destroy();

  const accounts = store.getAccounts();
  const account = accounts.find(a => a.id === accountId);
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
        pointRadius: history.length > 30 ? 0 : 3,
        pointHoverRadius: 5,
        pointBackgroundColor: '#10b981',
      }],
    },
    options: chartOptions(c),
  });
}

function getAccountHistory(accountName, days) {
  const transactions = store.getTransactions()
    .filter(t => t.date)
    .sort((a, b) => a.date.localeCompare(b.date));

  if (transactions.length === 0) return [];

  const accounts = store.getAccounts();
  const account = accounts.find(a => a.name === accountName);
  let balance = account?.initialBalance || 0;

  const dailyBalances = {};

  for (const tx of transactions) {
    const amount = Number(tx.amount) || 0;
    if (tx.type === 'income' && tx.toAccount === accountName) {
      balance += amount;
    } else if (tx.type === 'expense' && tx.fromAccount === accountName) {
      balance -= amount;
    } else if (tx.type === 'transfer') {
      if (tx.fromAccount === accountName) balance -= amount;
      if (tx.toAccount === accountName) balance += amount;
    }
    dailyBalances[tx.date] = balance;
  }

  const endDate = new Date();
  const startDate = new Date(endDate);
  startDate.setDate(startDate.getDate() - days);
  const startStr = startDate.toISOString().split('T')[0];

  const result = [];
  for (const [date, bal] of Object.entries(dailyBalances).sort(([a], [b]) => a.localeCompare(b))) {
    if (date >= startStr) {
      result.push({ date, balance: bal });
    }
  }

  const todayStr = endDate.toISOString().split('T')[0];
  if (result.length === 0 || result[result.length - 1].date !== todayStr) {
    result.push({ date: todayStr, balance });
  }

  return result;
}

function chartOptions(c) {
  return {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { intersect: false, mode: 'index' },
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: c.tooltipBg,
        titleColor: c.textColor,
        bodyColor: c.tooltipBody,
        borderColor: c.tooltipBorder,
        borderWidth: 1,
        padding: 12,
        displayColors: false,
        callbacks: {
          label: ctx => `¥${ctx.parsed.y.toLocaleString('ja-JP')}`,
        },
      },
    },
    scales: {
      x: {
        grid: { color: c.gridColor },
        ticks: { color: c.textColor, maxTicksLimit: 8, font: { size: 11 } },
      },
      y: {
        grid: { color: c.gridColor },
        ticks: {
          color: c.textColor,
          font: { size: 11 },
          callback: val => `¥${(val / 1000).toFixed(0)}K`,
        },
      },
    },
  };
}

function refresh() {
  const container = document.getElementById('screen-dashboard');
  if (container) {
    container.removeEventListener('click', handleClick);
    render(container);
  }
}
