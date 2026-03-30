// ============================================
// ダッシュボード画面
// ============================================

import * as store from '../store.js';

let chart = null;
let currentPeriod = 90; // days

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

      <!-- Asset Trend Chart -->
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

      <!-- Account Balance Cards -->
      <div class="chart-card">
        <div class="chart-card-title">💰 口座別残高</div>
        <div class="account-cards">
          ${accounts.map(acc => {
            const balance = store.getAccountBalance(acc.id);
            return `
              <div class="account-card">
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

  // Render chart
  if (history.length > 0) {
    renderChart(history);
  }

  // Events
  container.addEventListener('click', handleClick);
}

function handleClick(e) {
  const target = e.target.closest('[data-action]');
  if (!target) return;

  if (target.dataset.action === 'setPeriod') {
    currentPeriod = Number(target.dataset.days);
    refresh();
  }
}

function renderChart(history) {
  const canvas = document.getElementById('asset-chart');
  if (!canvas) return;

  if (chart) {
    chart.destroy();
  }

  const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches ||
    document.documentElement.getAttribute('data-theme') === 'dark';

  const gridColor = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)';
  const textColor = isDark ? '#9ca3b8' : '#6b7280';

  chart = new Chart(canvas, {
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
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        intersect: false,
        mode: 'index',
      },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: isDark ? '#1e1e35' : '#ffffff',
          titleColor: textColor,
          bodyColor: isDark ? '#e8e8f0' : '#1a1a2e',
          borderColor: isDark ? '#2d2d4a' : '#e5e7eb',
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
          grid: { color: gridColor },
          ticks: {
            color: textColor,
            maxTicksLimit: 8,
            font: { size: 11 },
          },
        },
        y: {
          grid: { color: gridColor },
          ticks: {
            color: textColor,
            font: { size: 11 },
            callback: val => `¥${(val / 1000).toFixed(0)}K`,
          },
        },
      },
    },
  });
}

function refresh() {
  const container = document.getElementById('screen-dashboard');
  if (container) {
    container.removeEventListener('click', handleClick);
    render(container);
  }
}
