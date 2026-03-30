// ============================================
// 分析画面 (PL: 損益 / BS: 資産分析)
// ============================================

import * as store from '../store.js';

let pieChart = null;
let trendChart = null;
let totalAssetChart = null;
let accountTrendChart = null;

let analysisState = {
  tab: 'pl', // pl | bs
  viewType: 'expense', // expense | income
  periodType: 'month', // day | week | month | custom
  customStart: '',
  customEnd: '',
  chartMode: 'pie', // pie | trend
  bsPeriod: 90,
  selectedAccountId: null,
};

function getPeriodDates() {
  const now = new Date();
  let start, end;

  switch (analysisState.periodType) {
    case 'day':
      start = new Date(now); start.setHours(0,0,0,0);
      end = new Date(now); end.setHours(23,59,59,999);
      break;
    case 'week':
      start = new Date(now);
      start.setDate(start.getDate() - start.getDay()); // Sunday
      start.setHours(0,0,0,0);
      end = new Date(now); end.setHours(23,59,59,999);
      break;
    case 'month':
      start = new Date(now.getFullYear(), now.getMonth(), 1);
      end = new Date(now); end.setHours(23,59,59,999);
      break;
    case 'custom':
      start = analysisState.customStart ? new Date(analysisState.customStart) : new Date(now.getFullYear(), now.getMonth(), 1);
      end = analysisState.customEnd ? new Date(analysisState.customEnd + 'T23:59:59') : new Date(now);
      break;
    default:
      start = new Date(now.getFullYear(), now.getMonth(), 1);
      end = new Date(now);
  }

  return {
    start: start.toISOString().split('T')[0],
    end: end.toISOString().split('T')[0],
    label: getPeriodLabel(),
  };
}

function getPeriodLabel() {
  const now = new Date();
  switch (analysisState.periodType) {
    case 'day': return `${now.getMonth() + 1}月${now.getDate()}日`;
    case 'week': return '今週';
    case 'month': return `${now.getFullYear()}年${now.getMonth() + 1}月`;
    case 'custom': return '指定期間';
  }
}

export function render(container) {
  container.innerHTML = `
    <div class="analysis-screen">
      <h2 style="font-size: var(--font-size-xl); margin-bottom: var(--space-md);">📊 分析</h2>

      <!-- Tab Selection (PL / BS) -->
      <div class="tab-toggle" style="margin-bottom: var(--space-md); display: flex; gap: var(--space-xs); background: var(--bg-secondary); padding: 4px; border-radius: var(--radius-lg);">
        <button class="tab-btn ${analysisState.tab === 'pl' ? 'active' : ''}" data-tab="pl" data-action="setTab" style="flex:1; padding: 8px; border:none; border-radius:var(--radius-md); font-size:var(--font-size-sm); cursor:pointer; background:${analysisState.tab === 'pl' ? 'var(--bg-card)' : 'transparent'}; color:${analysisState.tab === 'pl' ? 'var(--color-primary)' : 'var(--text-secondary)'}; font-weight:${analysisState.tab === 'pl' ? 'bold' : 'normal'}; box-shadow:${analysisState.tab === 'pl' ? 'var(--shadow-sm)' : 'none'}; transition:all 0.2s;">
          収支 (PL)
        </button>
        <button class="tab-btn ${analysisState.tab === 'bs' ? 'active' : ''}" data-tab="bs" data-action="setTab" style="flex:1; padding: 8px; border:none; border-radius:var(--radius-md); font-size:var(--font-size-sm); cursor:pointer; background:${analysisState.tab === 'bs' ? 'var(--bg-card)' : 'transparent'}; color:${analysisState.tab === 'bs' ? 'var(--color-primary)' : 'var(--text-secondary)'}; font-weight:${analysisState.tab === 'bs' ? 'bold' : 'normal'}; box-shadow:${analysisState.tab === 'bs' ? 'var(--shadow-sm)' : 'none'}; transition:all 0.2s;">
          資産 (BS)
        </button>
      </div>

      ${analysisState.tab === 'pl' ? renderPLContent() : renderBSContent()}
    </div>
  `;

  if (analysisState.tab === 'pl') {
    const { start, end } = getPeriodDates();
    const transactions = store.getTransactions().filter(tx => tx.type === analysisState.viewType && tx.date >= start && tx.date <= end);
    const categoryTotals = calculateCategoryTotals(transactions);
    const sortedCategories = Object.values(categoryTotals).sort((a, b) => b.total - a.total);
    
    if (sortedCategories.length > 0) {
      if (analysisState.chartMode === 'pie') renderPieChart(sortedCategories);
      else renderTrendChart(start, end);
    }
  } else {
    const history = store.getAssetHistory(analysisState.bsPeriod);
    if (history.length > 0) renderTotalAssetChart(history);
    if (analysisState.selectedAccountId) renderAccountTrendChart(analysisState.selectedAccountId);
  }

  bindEvents(container);
}

function renderPLContent() {
  const { label } = getPeriodDates();
  const { start, end } = getPeriodDates();
  const transactions = store.getTransactions().filter(tx => tx.type === analysisState.viewType && tx.date >= start && tx.date <= end);
  const categoryTotals = calculateCategoryTotals(transactions);
  const grandTotal = Object.values(categoryTotals).reduce((sum, c) => sum + c.total, 0);
  const sortedCategories = Object.values(categoryTotals).sort((a, b) => b.total - a.total);

  return `
    <div class="analysis-section">
      <!-- View Type Toggle -->
      <div class="type-toggle" style="padding: 0 0 var(--space-md); display: flex; gap: var(--space-sm);">
        <button class="type-btn ${analysisState.viewType === 'expense' ? 'active' : ''}" data-type="expense" data-action="setViewType" style="flex:1; border-color: var(--color-expense); color: var(--color-expense); ${analysisState.viewType === 'expense' ? 'background: var(--color-expense); color: white;' : ''}">支出</button>
        <button class="type-btn ${analysisState.viewType === 'income' ? 'active' : ''}" data-type="income" data-action="setViewType" style="flex:1; border-color: var(--color-income); color: var(--color-income); ${analysisState.viewType === 'income' ? 'background: var(--color-income); color: white;' : ''}">収入</button>
      </div>

      <!-- Period Toggle -->
      <div class="chart-card">
        <div class="chart-card-title">📅 表示期間</div>
        <select class="form-input" id="analysis-period-selector" style="margin-bottom: var(--space-md); font-size: var(--font-size-sm);">
          <option value="day" ${analysisState.periodType === 'day' ? 'selected' : ''}>今日</option>
          <option value="week" ${analysisState.periodType === 'week' ? 'selected' : ''}>今週</option>
          <option value="month" ${analysisState.periodType === 'month' ? 'selected' : ''}>今月</option>
          <option value="custom" ${analysisState.periodType === 'custom' ? 'selected' : ''}>期間を自由に指定</option>
        </select>

        ${analysisState.periodType === 'custom' ? `
          <div class="meta-row" style="margin-bottom: var(--space-md);">
            <input type="date" value="${analysisState.customStart}" data-action="setCustomStart" style="flex:1; height:38px;">
            <span style="color:var(--text-muted)">〜</span>
            <input type="date" value="${analysisState.customEnd}" data-action="setCustomEnd" style="flex:1; height:38px;">
          </div>
        ` : ''}

        <div style="text-align: center; margin-bottom: var(--space-sm);">
          <span style="font-size: var(--font-size-sm); color: var(--text-secondary);">${label}</span>
          <div style="font-size: var(--font-size-2xl); font-weight: var(--font-weight-bold); color: ${analysisState.viewType === 'expense' ? 'var(--color-expense)' : 'var(--color-income)'};">
            ¥${grandTotal.toLocaleString('ja-JP')}
          </div>
        </div>
      </div>

      <!-- Chart Mode Toggle -->
      <div class="chart-card">
        <div class="chart-card-title">📊 表示形式</div>
        <select class="form-input" id="chart-mode-selector" style="margin-bottom: var(--space-md); font-size: var(--font-size-sm);">
          <option value="pie" ${analysisState.chartMode === 'pie' ? 'selected' : ''}>🍩 内訳 (円グラフ)</option>
          <option value="trend" ${analysisState.chartMode === 'trend' ? 'selected' : ''}>📈 推移 (折れ線グラフ)</option>
        </select>
        
        <div class="chart-container" style="height: 280px;">
          <canvas id="analysis-chart"></canvas>
        </div>
        ${sortedCategories.length === 0 ? `<div style="text-align:center; padding: 40px 0; color: var(--text-muted);">データがありません</div>` : ''}
      </div>

      <!-- Breakdown List -->
      ${sortedCategories.length > 0 ? `
        <div class="chart-card">
          <div class="chart-card-title">📋 カテゴリー内訳</div>
          ${sortedCategories.map(cat => {
            const pct = grandTotal > 0 ? ((cat.total / grandTotal) * 100).toFixed(1) : 0;
            return `
              <div style="display: flex; align-items: center; gap: var(--space-md); padding: var(--space-sm) 0; border-bottom: 1px solid var(--border-light);">
                <span style="font-size: 1.3rem; width: 36px; text-align: center;">${cat.icon}</span>
                <div style="flex: 1; min-width: 0;">
                  <div style="display: flex; justify-content: space-between; margin-bottom: 2px;">
                    <span style="font-size: var(--font-size-sm); font-weight: var(--font-weight-medium);">${cat.name}</span>
                    <span style="font-size: var(--font-size-sm); font-weight: var(--font-weight-bold);">¥${cat.total.toLocaleString('ja-JP')}</span>
                  </div>
                  <div style="height: 4px; background: var(--bg-input); border-radius: 2px;">
                    <div style="height: 100%; width: ${pct}%; background: ${analysisState.viewType === 'expense' ? 'var(--color-expense)' : 'var(--color-income)'}; border-radius: 2px;"></div>
                  </div>
                </div>
                <span style="font-size: var(--font-size-xs); color: var(--text-muted); width: 45px; text-align: right;">${pct}%</span>
              </div>
            `;
          }).join('')}
        </div>
      ` : ''}
    </div>
  `;
}

function renderBSContent() {
  const accounts = store.getAccounts();
  const totalBalance = store.getTotalBalance();

  return `
    <div class="analysis-section">
      <div class="chart-card" style="text-align:center; padding: var(--space-lg) 0;">
        <div style="font-size: var(--font-size-sm); color: var(--text-muted); margin-bottom: 4px;">現在の総資産</div>
        <div style="font-size: var(--font-size-3xl); font-weight: var(--font-weight-bold); color: var(--color-primary);">¥${totalBalance.toLocaleString('ja-JP')}</div>
      </div>

      <!-- Total Asset Trend -->
      <div class="chart-card">
        <div class="chart-card-title">📈 資産推移</div>
        <select class="form-input" id="bs-period-selector" style="margin-bottom: var(--space-md); font-size: var(--font-size-sm);">
          <option value="30" ${analysisState.bsPeriod === 30 ? 'selected' : ''}>過去1ヶ月</option>
          <option value="90" ${analysisState.bsPeriod === 90 ? 'selected' : ''}>過去3ヶ月</option>
          <option value="180" ${analysisState.bsPeriod === 180 ? 'selected' : ''}>過去6ヶ月</option>
          <option value="365" ${analysisState.bsPeriod === 365 ? 'selected' : ''}>過去1年</option>
        </select>
        <div class="chart-container" style="height: 240px;">
          <canvas id="total-asset-chart"></canvas>
        </div>
      </div>

      <!-- Account Specific Trend -->
      <div class="chart-card">
        <div class="chart-card-title">🏦 口座別残高推移</div>
        <select class="form-input" id="bs-account-selector" style="margin-bottom: var(--space-md); font-size: var(--font-size-sm);">
          <option value="">口座を選択してください</option>
          ${accounts.map(acc => `<option value="${acc.id}" ${analysisState.selectedAccountId === acc.id ? 'selected' : ''}>${acc.icon} ${acc.name}</option>`).join('')}
        </select>
        <div class="chart-container" style="height: 240px;">
          <canvas id="account-trend-chart"></canvas>
        </div>
        ${!analysisState.selectedAccountId ? `<div style="text-align:center; padding: 20px 0; color: var(--text-muted); font-size: var(--font-size-sm);">リストから口座を選択してください</div>` : ''}
      </div>
    </div>
  `;
}

function calculateCategoryTotals(transactions) {
  const totals = {};
  const categories = store.getCategories();
  for (const tx of transactions) {
    if (!totals[tx.category]) {
      const cat = categories.find(c => c.name === tx.category);
      totals[tx.category] = { name: tx.category, icon: cat?.icon || '❓', total: 0 };
    }
    totals[tx.category].total += Number(tx.amount) || 0;
  }
  return totals;
}

function bindEvents(container) {
  container.addEventListener('click', handleClick);
  
  container.querySelector('#analysis-period-selector')?.addEventListener('change', e => {
    analysisState.periodType = e.target.value;
    refresh();
  });

  container.querySelector('#chart-mode-selector')?.addEventListener('change', e => {
    analysisState.chartMode = e.target.value;
    refresh();
  });

  container.querySelector('#bs-period-selector')?.addEventListener('change', e => {
    analysisState.bsPeriod = Number(e.target.value);
    refresh();
  });

  container.querySelector('#bs-account-selector')?.addEventListener('change', e => {
    analysisState.selectedAccountId = e.target.value;
    refresh();
  });

  container.querySelector('[data-action="setCustomStart"]')?.addEventListener('change', e => { analysisState.customStart = e.target.value; refresh(); });
  container.querySelector('[data-action="setCustomEnd"]')?.addEventListener('change', e => { analysisState.customEnd = e.target.value; refresh(); });
}

function handleClick(e) {
  const target = e.target.closest('[data-action]');
  if (!target) return;
  const action = target.dataset.action;

  if (action === 'setTab') {
    analysisState.tab = target.dataset.tab;
    refresh();
  } else if (action === 'setViewType') {
    analysisState.viewType = target.dataset.type;
    refresh();
  }
}

function getCommonChartOptions(isDark) {
  const gridColor = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)';
  const textColor = isDark ? '#9ca3b8' : '#6b7280';
  return {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { intersect: false, mode: 'index' },
    plugins: {
      legend: {
        labels: { color: textColor, font: { size: 10 }, padding: 10, usePointStyle: true }
      }
    },
    scales: {
      x: { grid: { color: gridColor }, ticks: { color: textColor, font: { size: 10 }, maxTicksLimit: 8 } },
      y: { grid: { color: gridColor }, ticks: { color: textColor, font: { size: 10 }, callback: v => '¥' + v.toLocaleString() } }
    }
  };
}

function renderPieChart(sortedCategories) {
  const canvas = document.getElementById('analysis-chart');
  if (!canvas) return;
  if (pieChart) pieChart.destroy();
  if (trendChart) { trendChart.destroy(); trendChart = null; }

  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  const colors = ['#6366f1', '#f43f5e', '#10b981', '#f59e0b', '#3b82f6', '#8b5cf6', '#ec4899'];

  pieChart = new Chart(canvas, {
    type: 'doughnut',
    data: {
      labels: sortedCategories.map(c => `${c.icon} ${c.name}`),
      datasets: [{
        data: sortedCategories.map(c => c.total),
        backgroundColor: colors,
        borderWidth: 2,
        borderColor: isDark ? '#1e1e35' : '#ffffff',
      }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: {
        legend: { position: 'right', labels: { color: isDark ? '#e8e8f0' : '#1a1a2e', font: { size: 11 }, usePointStyle: true } },
        tooltip: { callbacks: { label: ctx => `${ctx.label}: ¥${ctx.parsed.toLocaleString()}` } }
      }
    }
  });
}

function renderTrendChart(start, end) {
  const canvas = document.getElementById('analysis-chart');
  if (!canvas) return;
  if (trendChart) trendChart.destroy();
  if (pieChart) { pieChart.destroy(); pieChart = null; }

  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  const transactions = store.getTransactions().filter(tx => tx.type === analysisState.viewType && tx.date >= start && tx.date <= end);
  
  const categoryDates = {};
  const allDates = new Set();
  for (const tx of transactions) {
    if (!categoryDates[tx.category]) categoryDates[tx.category] = {};
    categoryDates[tx.category][tx.date] = (categoryDates[tx.category][tx.date] || 0) + tx.amount;
    allDates.add(tx.date);
  }

  const sortedDates = [...allDates].sort();
  const categories = store.getCategories();
  const colors = ['#6366f1', '#f43f5e', '#10b981', '#f59e0b', '#3b82f6'];

  const datasets = Object.entries(categoryDates).map(([name, dates], i) => {
    const cat = categories.find(c => c.name === name);
    return {
      label: `${cat?.icon || ''} ${name}`,
      data: sortedDates.map(d => dates[d] || 0),
      borderColor: colors[i % colors.length],
      tension: 0.3, fill: false
    };
  });

  trendChart = new Chart(canvas, {
    type: 'line',
    data: { labels: sortedDates.map(d => d.split('-').slice(1).join('/')), datasets },
    options: getCommonChartOptions(isDark)
  });
}

function renderTotalAssetChart(history) {
  const canvas = document.getElementById('total-asset-chart');
  if (!canvas) return;
  if (totalAssetChart) totalAssetChart.destroy();

  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  const opts = getCommonChartOptions(isDark);
  opts.plugins.legend.display = false;

  totalAssetChart = new Chart(canvas, {
    type: 'line',
    data: {
      labels: history.map(h => h.date.split('-').slice(1).join('/')),
      datasets: [{
        label: '総資産',
        data: history.map(h => h.total),
        borderColor: '#6366f1',
        backgroundColor: 'rgba(99, 102, 241, 0.1)',
        fill: true, tension: 0.3, pointRadius: history.length > 30 ? 0 : 3
      }]
    },
    options: opts
  });
}

function renderAccountTrendChart(accountId) {
  const canvas = document.getElementById('account-trend-chart');
  if (!canvas) return;
  if (accountTrendChart) accountTrendChart.destroy();

  const account = store.getAccounts().find(a => a.id === accountId);
  if (!account) return;

  const history = store.getAccountHistory(account.name, analysisState.bsPeriod);
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  const opts = getCommonChartOptions(isDark);
  opts.plugins.legend.display = false;

  accountTrendChart = new Chart(canvas, {
    type: 'line',
    data: {
      labels: history.map(h => h.date.split('-').slice(1).join('/')),
      datasets: [{
        label: account.name,
        data: history.map(h => h.balance),
        borderColor: '#10b981',
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        fill: true, tension: 0.3, pointRadius: history.length > 30 ? 0 : 3
      }]
    },
    options: opts
  });
}

function refresh() {
  const container = document.getElementById('screen-analysis');
  if (container) {
    container.removeEventListener('click', handleClick);
    render(container);
  }
}
