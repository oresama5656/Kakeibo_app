// ============================================
// 分析画面 (PL: 損益 / BS: 資産分析) - シンプル・スマホ重視版
// ============================================

import * as store from '../store.js';

let pieChart = null;
let trendChart = null;
let totalAssetChart = null;
let accountTrendChart = null;

let analysisState = {
  tab: 'pl', 
  viewType: 'expense', 
  periodType: 'month', 
  customStart: '',
  customEnd: '',
  chartMode: 'pie', 
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
      start.setDate(start.getDate() - start.getDay());
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
    default: return '';
  }
}

export function render(container) {
  // Simple Tab Header
  container.innerHTML = `
    <div class="analysis-screen simple-mode">
      <!-- 1. PL/BS Toggle (Segmented Controller Style) -->
      <div class="analysis-nav-header" style="margin-bottom: var(--space-lg); padding: 4px; background: var(--bg-hover); border-radius: var(--radius-lg); display: flex; gap: 4px; border: 1px solid var(--border-color);">
        <button class="nav-tab-item ${analysisState.tab === 'pl' ? 'active' : ''}" 
                data-tab="pl" 
                data-action="setTab" 
                style="flex:1; border:none; background:transparent; padding: 10px; border-radius: var(--radius-md); transition: all 0.2s; font-weight: bold; font-size: var(--font-size-sm); display: flex; align-items: center; justify-content: center; gap: 8px; color: ${analysisState.tab === 'pl' ? 'var(--color-accent)' : 'var(--text-muted)'}; ${analysisState.tab === 'pl' ? 'background: var(--bg-card); box-shadow: var(--shadow-sm);' : ''}">
          <span>📊</span> 収支 (PL)
        </button>
        <button class="nav-tab-item ${analysisState.tab === 'bs' ? 'active' : ''}" 
                data-tab="bs" 
                data-action="setTab" 
                style="flex:1; border:none; background:transparent; padding: 10px; border-radius: var(--radius-md); transition: all 0.2s; font-weight: bold; font-size: var(--font-size-sm); display: flex; align-items: center; justify-content: center; gap: 8px; color: ${analysisState.tab === 'bs' ? 'var(--color-accent)' : 'var(--text-muted)'}; ${analysisState.tab === 'bs' ? 'background: var(--bg-card); box-shadow: var(--shadow-sm);' : ''}">
          <span>💎</span> 資産 (BS)
        </button>
      </div>

      <div class="analysis-body">
        ${analysisState.tab === 'pl' ? renderPLContent() : renderBSContent()}
      </div>
    </div>
  `;

  // Chart Rendering
  setTimeout(() => {
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
  }, 0);

  bindEvents(container);
}

function renderPLContent() {
  const { label, start, end } = getPeriodDates();
  const transactions = store.getTransactions().filter(tx => tx.type === analysisState.viewType && tx.date >= start && tx.date <= end);
  const categoryTotals = calculateCategoryTotals(transactions);
  const grandTotal = Object.values(categoryTotals).reduce((sum, c) => sum + c.total, 0);
  const sortedCategories = Object.values(categoryTotals).sort((a, b) => b.total - a.total);

  return `
    <div class="pl-content">
      <!-- 2. Type Toggle (Expense / Income) -->
      <div class="type-toggle" style="margin-bottom: var(--space-md);">
        <button class="type-btn ${analysisState.viewType === 'expense' ? 'active' : ''}" style="border-radius: var(--radius-full) 0 0 var(--radius-full); border-color: var(--color-expense); color: var(--color-expense); ${analysisState.viewType === 'expense' ? 'background: var(--color-expense); color: #fff;' : ''}" data-type="expense" data-action="setViewType">支出</button>
        <button class="type-btn ${analysisState.viewType === 'income' ? 'active' : ''}" style="border-radius: 0 var(--radius-full) var(--radius-full) 0; border-color: var(--color-income); color: var(--color-income); ${analysisState.viewType === 'income' ? 'background: var(--color-income); color: #fff;' : ''}" data-type="income" data-action="setViewType">収入</button>
      </div>

      <!-- 3. Summary (Clean Centered) -->
      <div class="simple-summary" style="text-align: center; margin-bottom: var(--space-lg); padding: var(--space-md) 0;">
        <div style="font-size: var(--font-size-sm); color: var(--text-secondary);">${label} の合計</div>
        <div style="font-size: var(--font-size-3xl); font-weight: bold; color: ${analysisState.viewType === 'expense' ? 'var(--color-expense)' : 'var(--color-income)'};">
          ¥${grandTotal.toLocaleString('ja-JP')}
        </div>
      </div>

      <!-- 4. Controls & Chart (Consolidated Card) -->
      <div class="chart-card">
        <div class="header-flex" style="display:flex; justify-content: space-between; align-items:center; margin-bottom: var(--space-md); gap: var(--space-sm);">
          <select class="form-input" id="analysis-period-selector" style="flex:1; height: 36px; font-size: var(--font-size-xs);">
            <option value="day" ${analysisState.periodType === 'day' ? 'selected' : ''}>今日</option>
            <option value="week" ${analysisState.periodType === 'week' ? 'selected' : ''}>今週</option>
            <option value="month" ${analysisState.periodType === 'month' ? 'selected' : ''}>今月</option>
            <option value="custom" ${analysisState.periodType === 'custom' ? 'selected' : ''}>期間指定</option>
          </select>
          <select class="form-input" id="chart-mode-selector" style="flex:1; height: 36px; font-size: var(--font-size-xs);">
            <option value="pie" ${analysisState.chartMode === 'pie' ? 'selected' : ''}>内訳グラフ</option>
            <option value="trend" ${analysisState.chartMode === 'trend' ? 'selected' : ''}>推移グラフ</option>
          </select>
        </div>

        ${analysisState.periodType === 'custom' ? `
          <div style="display: flex; gap: 8px; align-items: center; margin-bottom: var(--space-md);">
            <input type="date" value="${analysisState.customStart}" data-action="setCustomStart" style="flex:1; font-size:var(--font-size-xs);">
            <span>〜</span>
            <input type="date" value="${analysisState.customEnd}" data-action="setCustomEnd" style="flex:1; font-size:var(--font-size-xs);">
          </div>
        ` : ''}

        <div class="chart-container" style="height: 260px; position: relative;">
          <canvas id="analysis-chart"></canvas>
          ${sortedCategories.length === 0 ? `<div style="position:absolute; inset:0; display:flex; align-items:center; justify-content:center; color:var(--text-muted); font-size:var(--font-size-sm);">データがありません</div>` : ''}
        </div>
      </div>

      <!-- 5. List -->
      ${sortedCategories.length > 0 ? `
        <div class="chart-card" style="margin-top: var(--space-md);">
          <div class="chart-card-title">カテゴリー内訳</div>
          ${sortedCategories.map(cat => {
            const pct = grandTotal > 0 ? ((cat.total / grandTotal) * 100).toFixed(1) : 0;
            return `
              <div class="analysis-row" style="display: flex; align-items: center; gap: 12px; padding: 12px 0; border-bottom: 1px solid var(--border-light);">
                <span style="font-size: 1.2rem; min-width: 24px; text-align:center;">${cat.icon}</span>
                <div style="flex: 1; min-width: 0;">
                  <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                    <span style="font-size: var(--font-size-sm); font-weight: 500;">${cat.name}</span>
                    <span style="font-size: var(--font-size-sm); font-weight: bold; font-variant-numeric: tabular-nums;">¥${cat.total.toLocaleString('ja-JP')}</span>
                  </div>
                  <div style="height: 4px; background: var(--bg-input); border-radius: 2px;">
                    <div style="height: 100%; width: ${pct}%; background: ${analysisState.viewType === 'expense' ? 'var(--color-expense)' : 'var(--color-income)'}; border-radius: 2px;"></div>
                  </div>
                </div>
                <span style="font-size: var(--font-size-xs); color: var(--text-muted); min-width: 40px; text-align: right;">${pct}%</span>
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

  // 資産と負債の計算
  const positiveAccounts = accounts.filter(a => (a.balance || 0) >= 0);
  const negativeAccounts = accounts.filter(a => (a.balance || 0) < 0);
  const totalAssets = positiveAccounts.reduce((sum, a) => sum + a.balance, 0);
  const totalLiabilities = Math.abs(negativeAccounts.reduce((sum, a) => sum + a.balance, 0));
  const netWorth = totalAssets - totalLiabilities;

  // 最大高さを決める（左右の合計は常にAssetと一致するはず）
  const maxHeight = Math.max(totalAssets, totalLiabilities + netWorth, 1);

  return `
    <div class="bs-content">
      <!-- 1. Summary Header -->
      <div class="simple-summary" style="text-align: center; margin-bottom: var(--space-lg); padding: var(--space-md) 0;">
        <div style="font-size: var(--font-size-sm); color: var(--text-secondary);">現在の純資産総額</div>
        <div style="font-size: var(--font-size-3xl); font-weight: bold; color: var(--color-accent);">¥${totalBalance.toLocaleString('ja-JP')}</div>
      </div>

      <!-- 2. BS Block Visualization -->
      <div class="chart-card" style="margin-bottom: var(--space-md);">
        <div class="chart-card-title" style="margin-bottom: var(--space-lg); text-align: center;">バランスシート構成</div>
        <div class="bs-block-container" style="display: flex; gap: 12px; height: 320px; align-items: flex-end; padding: 0 10px;">
          
          <!-- 左列: 資産 (Assets) -->
          <div class="bs-column" style="flex: 1; height: 100%; display: flex; flex-direction: column; justify-content: flex-end; gap: 2px;">
            <div style="text-align: center; font-size: var(--font-size-xs); font-weight: bold; margin-bottom: 4px; color: var(--text-secondary);">資産</div>
            ${positiveAccounts.length > 0 ? positiveAccounts.sort((a,b) => b.balance - a.balance).map(acc => {
              const h = (acc.balance / maxHeight) * 100;
              if (h < 5 && acc.balance > 0) return ''; // 小さすぎるのはスキップ
              return `
                <div style="height: ${h}%; background: #4f46e5; border-radius: 4px; display: flex; flex-direction: column; align-items: center; justify-content: center; overflow: hidden; color: white; padding: 4px; min-height: 20px; transition: transform 0.2s;" title="${acc.name}">
                  <span style="font-size: 10px; font-weight: bold; white-space: nowrap;">${acc.name}</span>
                  <span style="font-size: 9px; opacity: 0.9;">¥${(acc.balance/10000).toFixed(1)}万</span>
                </div>
              `;
            }).join('') : `<div style="height: 100%; background: var(--bg-hover); border-radius: 4px;"></div>`}
          </div>

          <!-- 右列: 負債 & 純資産 (Liabilities & Net Worth) -->
          <div class="bs-column" style="flex: 1; height: 100%; display: flex; flex-direction: column; justify-content: flex-end; gap: 2px;">
            <div style="text-align: center; font-size: var(--font-size-xs); font-weight: bold; margin-bottom: 4px; color: var(--text-secondary);">負債・純資産</div>
            
            <!-- 純資産 (Net Worth) -->
            ${netWorth > 0 ? `
              <div style="height: ${(netWorth / maxHeight) * 100}%; background: var(--color-accent); border-radius: 4px; display: flex; flex-direction: column; align-items: center; justify-content: center; color: white; padding: 4px; min-height: 20px;">
                <span style="font-size: 10px; font-weight: bold;">純資産</span>
                <span style="font-size: 9px; opacity: 0.9;">¥${(netWorth/10000).toFixed(1)}万</span>
              </div>
            ` : ''}

            <!-- 負債 (Liabilities) -->
            ${negativeAccounts.map(acc => {
              const val = Math.abs(acc.balance);
              const h = (val / maxHeight) * 100;
              return `
                <div style="height: ${h}%; background: #f43f5e; border-radius: 4px; display: flex; flex-direction: column; align-items: center; justify-content: center; overflow: hidden; color: white; padding: 4px; min-height: 20px;" title="${acc.name}">
                  <span style="font-size: 10px; font-weight: bold; white-space: nowrap;">${acc.name}</span>
                  <span style="font-size: 9px; opacity: 0.9;">¥${(val/10000).toFixed(1)}万</span>
                </div>
              `;
            }).join('')}
          </div>
        </div>
      </div>

      <!-- 3. Balance Trend -->
      <div class="chart-card">
        <div class="header-flex" style="display:flex; justify-content: space-between; align-items:center; margin-bottom: var(--space-md);">
          <div class="chart-card-title" style="margin: 0; font-size: var(--font-size-sm);">📈 総資産推移</div>
          <select class="form-input" id="bs-period-selector" style="width: 100px; height: 32px; font-size: var(--font-size-xs);">
            <option value="30" ${analysisState.bsPeriod === 30 ? 'selected' : ''}>1ヶ月</option>
            <option value="90" ${analysisState.bsPeriod === 90 ? 'selected' : ''}>3ヶ月</option>
            <option value="365" ${analysisState.bsPeriod === 365 ? 'selected' : ''}>1年</option>
          </select>
        </div>
        <div class="chart-container" style="height: 200px;">
          <canvas id="total-asset-chart"></canvas>
        </div>
      </div>

      <!-- 4. Account Trends -->
      <div class="chart-card" style="margin-top: var(--space-md);">
        <div class="header-flex" style="display:flex; justify-content: space-between; align-items:center; margin-bottom: var(--space-md);">
          <div class="chart-card-title" style="margin: 0; font-size: var(--font-size-sm);">🏦 口座別推移</div>
          <select class="form-input" id="bs-account-selector" style="width: 140px; height: 32px; font-size: var(--font-size-xs);">
            <option value="">選択...</option>
            ${accounts.map(acc => `<option value="${acc.id}" ${analysisState.selectedAccountId === acc.id ? 'selected' : ''}>${acc.icon} ${acc.name}</option>`).join('')}
          </select>
        </div>
        <div class="chart-container" style="height: 200px; position:relative;">
          <canvas id="account-trend-chart"></canvas>
          ${!analysisState.selectedAccountId ? `<div style="position:absolute; inset:0; display:flex; align-items:center; justify-content:center; color:var(--text-muted); font-size:var(--font-size-xs);">口座を選択してください</div>` : ''}
        </div>
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
  container.querySelector('#analysis-period-selector')?.addEventListener('change', e => { analysisState.periodType = e.target.value; refresh(); });
  container.querySelector('#chart-mode-selector')?.addEventListener('change', e => { analysisState.chartMode = e.target.value; refresh(); });
  container.querySelector('#bs-period-selector')?.addEventListener('change', e => { analysisState.bsPeriod = Number(e.target.value); refresh(); });
  container.querySelector('#bs-account-selector')?.addEventListener('change', e => { analysisState.selectedAccountId = e.target.value; refresh(); });
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
    responsive: true, maintainAspectRatio: false,
    interaction: { intersect: false, mode: 'index' },
    plugins: {
      legend: { labels: { color: textColor, font: { size: 10 }, padding: 10, usePointStyle: true } }
    },
    scales: {
      x: { grid: { color: gridColor }, ticks: { color: textColor, font: { size: 10 }, maxTicksLimit: 6 } },
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
        legend: { position: 'bottom', labels: { color: isDark ? '#e8e8f0' : '#1a1a2e', font: { size: 10 }, usePointStyle: true, padding: 15 } },
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
      label: `${cat?.name || name}`,
      data: sortedDates.map(d => dates[d] || 0),
      borderColor: colors[i % colors.length],
      tension: 0.3, fill: false, pointRadius: 2
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
