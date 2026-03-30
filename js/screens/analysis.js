// ============================================
// 分析画面 (円グラフ + カテゴリ別推移)
// ============================================

import * as store from '../store.js';

let pieChart = null;
let trendChart = null;

let analysisState = {
  viewType: 'expense', // expense | income
  periodType: 'month', // day | week | month | custom
  customStart: '',
  customEnd: '',
  chartMode: 'pie', // pie | trend
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
  const { start, end, label } = getPeriodDates();

  // Get filtered transactions
  const transactions = store.getTransactions().filter(tx => {
    if (tx.type !== analysisState.viewType) return false;
    if (tx.date < start || tx.date > end) return false;
    return true;
  });

  // Category breakdown
  const categoryTotals = {};
  const categories = store.getCategories();
  let grandTotal = 0;

  for (const tx of transactions) {
    const amount = Number(tx.amount) || 0;
    if (!categoryTotals[tx.category]) {
      const cat = categories.find(c => c.name === tx.category);
      categoryTotals[tx.category] = {
        name: tx.category,
        icon: cat?.icon || '❓',
        total: 0,
      };
    }
    categoryTotals[tx.category].total += amount;
    grandTotal += amount;
  }

  const sortedCategories = Object.values(categoryTotals).sort((a, b) => b.total - a.total);

  container.innerHTML = `
    <div class="dashboard-screen">
      <h2 style="font-size: var(--font-size-xl); margin-bottom: var(--space-md);">📊 分析</h2>

      <!-- View Type Toggle -->
      <div class="type-toggle" style="padding: 0 0 var(--space-md);">
        <button class="type-btn ${analysisState.viewType === 'expense' ? 'active' : ''}" data-type="expense" data-action="setViewType" style="border-color: var(--color-expense); color: var(--color-expense); ${analysisState.viewType === 'expense' ? 'background: var(--color-expense); color: white;' : ''}">支出</button>
        <button class="type-btn ${analysisState.viewType === 'income' ? 'active' : ''}" data-type="income" data-action="setViewType" style="border-color: var(--color-income); color: var(--color-income); ${analysisState.viewType === 'income' ? 'background: var(--color-income); color: white;' : ''}">収入</button>
      </div>

      <!-- Period Toggle -->
      <div class="chart-card">
        <div class="chart-period-toggle">
          <button class="period-btn ${analysisState.periodType === 'day' ? 'active' : ''}" data-action="setPeriodType" data-period="day">日</button>
          <button class="period-btn ${analysisState.periodType === 'week' ? 'active' : ''}" data-action="setPeriodType" data-period="week">週</button>
          <button class="period-btn ${analysisState.periodType === 'month' ? 'active' : ''}" data-action="setPeriodType" data-period="month">月</button>
          <button class="period-btn ${analysisState.periodType === 'custom' ? 'active' : ''}" data-action="setPeriodType" data-period="custom">期間指定</button>
        </div>

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
        <div class="chart-period-toggle" style="margin-bottom: var(--space-md);">
          <button class="period-btn ${analysisState.chartMode === 'pie' ? 'active' : ''}" data-action="setChartMode" data-mode="pie">🍩 内訳</button>
          <button class="period-btn ${analysisState.chartMode === 'trend' ? 'active' : ''}" data-action="setChartMode" data-mode="trend">📈 推移</button>
        </div>
        <div class="chart-container" style="height: 280px;">
          <canvas id="analysis-chart"></canvas>
        </div>
        ${sortedCategories.length === 0 ? `
          <div style="text-align:center; padding: 40px 0; color: var(--text-muted);">
            この期間のデータがありません
          </div>
        ` : ''}
      </div>

      <!-- Category Breakdown List -->
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
                    <span style="font-size: var(--font-size-sm); font-weight: var(--font-weight-bold); font-variant-numeric: tabular-nums;">¥${cat.total.toLocaleString('ja-JP')}</span>
                  </div>
                  <div style="height: 4px; background: var(--bg-input); border-radius: 2px; overflow: hidden;">
                    <div style="height: 100%; width: ${pct}%; background: ${analysisState.viewType === 'expense' ? 'var(--color-expense)' : 'var(--color-income)'}; border-radius: 2px; transition: width 0.3s ease;"></div>
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

  // Render chart
  if (sortedCategories.length > 0) {
    if (analysisState.chartMode === 'pie') {
      renderPieChart(sortedCategories);
    } else {
      renderTrendChart(start, end);
    }
  }

  // Events
  container.addEventListener('click', handleClick);
  container.querySelector('[data-action="setCustomStart"]')?.addEventListener('change', e => {
    analysisState.customStart = e.target.value;
    refresh();
  });
  container.querySelector('[data-action="setCustomEnd"]')?.addEventListener('change', e => {
    analysisState.customEnd = e.target.value;
    refresh();
  });
}

function handleClick(e) {
  const target = e.target.closest('[data-action]');
  if (!target) return;

  switch (target.dataset.action) {
    case 'setViewType':
      analysisState.viewType = target.dataset.type;
      refresh();
      break;
    case 'setPeriodType':
      analysisState.periodType = target.dataset.period;
      refresh();
      break;
    case 'setChartMode':
      analysisState.chartMode = target.dataset.mode;
      refresh();
      break;
  }
}

const CHART_COLORS = [
  '#6366f1', '#f43f5e', '#10b981', '#f59e0b', '#3b82f6',
  '#8b5cf6', '#ec4899', '#14b8a6', '#f97316', '#06b6d4',
  '#a855f7', '#ef4444', '#22c55e', '#eab308', '#2563eb',
  '#d946ef', '#e11d48', '#059669', '#ea580c', '#0891b2',
];

function renderPieChart(sortedCategories) {
  const canvas = document.getElementById('analysis-chart');
  if (!canvas) return;
  if (pieChart) pieChart.destroy();
  if (trendChart) { trendChart.destroy(); trendChart = null; }

  const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches ||
    document.documentElement.getAttribute('data-theme') === 'dark';

  pieChart = new Chart(canvas, {
    type: 'doughnut',
    data: {
      labels: sortedCategories.map(c => `${c.icon} ${c.name}`),
      datasets: [{
        data: sortedCategories.map(c => c.total),
        backgroundColor: CHART_COLORS.slice(0, sortedCategories.length),
        borderWidth: 2,
        borderColor: isDark ? '#1e1e35' : '#ffffff',
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'right',
          labels: {
            color: isDark ? '#e8e8f0' : '#1a1a2e',
            font: { size: 11 },
            padding: 8,
            usePointStyle: true,
            pointStyleWidth: 10,
          },
        },
        tooltip: {
          callbacks: {
            label: ctx => `${ctx.label}: ¥${ctx.parsed.toLocaleString('ja-JP')}`,
          },
        },
      },
    },
  });
}

function renderTrendChart(start, end) {
  const canvas = document.getElementById('analysis-chart');
  if (!canvas) return;
  if (trendChart) trendChart.destroy();
  if (pieChart) { pieChart.destroy(); pieChart = null; }

  const transactions = store.getTransactions().filter(tx => {
    if (tx.type !== analysisState.viewType) return false;
    if (tx.date < start || tx.date > end) return false;
    return true;
  });

  // Group by category and date
  const categoryDates = {};
  const allDates = new Set();

  for (const tx of transactions) {
    if (!categoryDates[tx.category]) categoryDates[tx.category] = {};
    if (!categoryDates[tx.category][tx.date]) categoryDates[tx.category][tx.date] = 0;
    categoryDates[tx.category][tx.date] += Number(tx.amount) || 0;
    allDates.add(tx.date);
  }

  const sortedDates = [...allDates].sort();
  const categories = store.getCategories();

  const datasets = Object.entries(categoryDates).map(([catName, dates], i) => {
    const cat = categories.find(c => c.name === catName);
    return {
      label: `${cat?.icon || ''} ${catName}`,
      data: sortedDates.map(d => dates[d] || 0),
      borderColor: CHART_COLORS[i % CHART_COLORS.length],
      backgroundColor: CHART_COLORS[i % CHART_COLORS.length] + '20',
      borderWidth: 2,
      tension: 0.3,
      pointRadius: sortedDates.length > 20 ? 0 : 3,
      fill: false,
    };
  });

  const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches ||
    document.documentElement.getAttribute('data-theme') === 'dark';
  const gridColor = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)';
  const textColor = isDark ? '#9ca3b8' : '#6b7280';

  trendChart = new Chart(canvas, {
    type: 'line',
    data: {
      labels: sortedDates.map(d => {
        const dt = new Date(d);
        return `${dt.getMonth() + 1}/${dt.getDate()}`;
      }),
      datasets,
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { intersect: false, mode: 'index' },
      plugins: {
        legend: {
          position: 'bottom',
          labels: {
            color: textColor,
            font: { size: 10 },
            padding: 8,
            usePointStyle: true,
          },
        },
        tooltip: {
          callbacks: {
            label: ctx => `${ctx.dataset.label}: ¥${ctx.parsed.y.toLocaleString('ja-JP')}`,
          },
        },
      },
      scales: {
        x: {
          grid: { color: gridColor },
          ticks: { color: textColor, maxTicksLimit: 8, font: { size: 10 } },
        },
        y: {
          grid: { color: gridColor },
          ticks: {
            color: textColor,
            font: { size: 10 },
            callback: val => `¥${val.toLocaleString('ja-JP')}`,
          },
        },
      },
    },
  });
}

function refresh() {
  const container = document.getElementById('screen-analysis');
  if (container) {
    container.removeEventListener('click', handleClick);
    render(container);
  }
}
