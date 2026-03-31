// ============================================
// 分析画面 (v6.1 - Chart.js プレミアムBS刷新版)
// ============================================

import * as store from '../store.js';
import { setHistoryFilters } from './history.js';

let plChart = null;
let totalAssetChart = null;
let bsBalanceChart = null;

let analysisState = {
  tab: 'pl', 
  viewType: 'expense', 
  periodType: 'month', 
  customStart: '',
  customEnd: '',
  chartMode: 'pie', // 'pie' or 'line'
  bsPeriod: 90,
  selectedAccountId: null,
};

function getPeriodDates() {
  const now = new Date();
  let start, end;
  switch (analysisState.periodType) {
    case 'week': 
      start = new Date(now); 
      start.setDate(now.getDate() - now.getDay()); 
      start.setHours(0,0,0,0); 
      end = new Date(now); 
      break;
    case 'month': 
      start = new Date(now.getFullYear(), now.getMonth(), 1); 
      end = new Date(now); 
      break;
    case 'year': 
      start = new Date(now.getFullYear(), 0, 1); 
      end = new Date(now); 
      break;
    case 'custom': 
      start = analysisState.customStart ? new Date(analysisState.customStart) : new Date(now.getFullYear(), now.getMonth(), 1); 
      end = analysisState.customEnd ? new Date(analysisState.customEnd + 'T23:59:59') : new Date(now); 
      break;
    default: 
      start = new Date(now.getFullYear(), now.getMonth(), 1); 
      end = new Date(now);
  }
  return { start: start.toISOString().split('T')[0], end: end.toISOString().split('T')[0] };
}

export function render(container) {
  if (!container) return;
  const contentHtml = analysisState.tab === 'pl' ? renderPLContent() : renderBSContent();
  
  container.innerHTML = `
    <div class="analysis-screen premium-mode">
      <div class="analysis-nav-header" style="margin-bottom: 24px; padding: 4px; background: var(--bg-hover); border-radius: 16px; display: flex; gap: 4px; border: 1px solid var(--border-color);">
        <button class="nav-tab-item ${analysisState.tab === 'pl' ? 'active' : ''}" data-tab="pl" data-action="setTab" style="flex:1; border:none; background:transparent; padding: 12px; border-radius: 12px; transition: all 0.2s; font-weight: 800; font-size: 0.9rem; display: flex; align-items: center; justify-content: center; gap: 8px; color: ${analysisState.tab === 'pl' ? 'var(--color-accent)' : 'var(--text-muted)'}; ${analysisState.tab === 'pl' ? 'background: var(--bg-card); box-shadow: var(--shadow-sm);' : ''}">📊 収支</button>
        <button class="nav-tab-item ${analysisState.tab === 'bs' ? 'active' : ''}" data-tab="bs" data-action="setTab" style="flex:1; border:none; background:transparent; padding: 12px; border-radius: 12px; transition: all 0.2s; font-weight: 800; font-size: 0.9rem; display: flex; align-items: center; justify-content: center; gap: 8px; color: ${analysisState.tab === 'bs' ? 'var(--color-accent)' : 'var(--text-muted)'}; ${analysisState.tab === 'bs' ? 'background: var(--bg-card); box-shadow: var(--shadow-sm);' : ''}">💎 資産</button>
      </div>
      <div class="analysis-body">${contentHtml}</div>
    </div>
  `;

  bindEvents(container);

  setTimeout(() => {
    if (analysisState.tab === 'pl') {
      const { start, end } = getPeriodDates();
      const txs = store.getTransactions().filter(tx => tx.type === analysisState.viewType && tx.date >= start && tx.date <= end);
      const totals = calculateCategoryTotals(txs);
      const sorted = Object.values(totals).sort((a,b) => b.total - a.total);
      
      if (analysisState.chartMode === 'pie') {
        renderPieChart(sorted);
      } else {
        renderPLLineChart(txs, start, end);
      }
    } else {
      // 資産タブのチャート
      const accounts = store.getAccounts();
      renderBSBalanceChart(accounts);
      
      const historyTotal = store.getAssetHistory(analysisState.bsPeriod);
      renderTotalAssetChart(historyTotal);
    }
  }, 50);
}

function renderPLContent() {
  const { start, end } = getPeriodDates();
  const txs = store.getTransactions().filter(tx => tx.type === analysisState.viewType && tx.date >= start && tx.date <= end);
  const totals = calculateCategoryTotals(txs);
  const grandTotal = Object.values(totals).reduce((sum, c) => sum + c.total, 0);
  const sorted = Object.values(totals).sort((a,b) => b.total - a.total);

  return `
    <div class="pl-content">
      <div style="display: flex; gap: 8px; margin-bottom: 20px; overflow-x: auto; padding-bottom: 4px;">
        <button class="filter-chip ${analysisState.periodType === 'week' ? 'active' : ''}" data-action="setPeriod" data-val="week">今週</button>
        <button class="filter-chip ${analysisState.periodType === 'month' ? 'active' : ''}" data-action="setPeriod" data-val="month">今月</button>
        <button class="filter-chip ${analysisState.periodType === 'year' ? 'active' : ''}" data-action="setPeriod" data-val="year">今年</button>
        <button class="filter-chip ${analysisState.periodType === 'custom' ? 'active' : ''}" data-action="setPeriod" data-val="custom">指定</button>
      </div>

      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
        <div class="type-toggle" style="margin-bottom:0;">
          <button class="type-btn ${analysisState.viewType === 'expense' ? 'active' : ''}" data-type="expense" data-action="setViewType" style="padding: 8px 20px;">支出</button>
          <button class="type-btn ${analysisState.viewType === 'income' ? 'active' : ''}" data-type="income" data-action="setViewType" style="padding: 8px 20px;">収入</button>
        </div>
        <div style="background: var(--bg-hover); padding: 4px; border-radius: 10px; display: flex; gap: 4px;">
          <button class="chart-mode-btn ${analysisState.chartMode === 'pie' ? 'active' : ''}" data-action="setChartMode" data-val="pie">⭕</button>
          <button class="chart-mode-btn ${analysisState.chartMode === 'line' ? 'active' : ''}" data-action="setChartMode" data-val="line">📈</button>
        </div>
      </div>

      <div class="simple-summary" style="text-align: center; margin: 24px 0;">
        <div style="font-size: 0.8rem; color: var(--text-secondary); margin-bottom: 4px;">期間合計 (${start} 〜 ${end})</div>
        <div style="font-size: 2.2rem; font-weight: 800; color: ${analysisState.viewType === 'expense' ? 'var(--color-expense)' : 'var(--color-income)'};">¥${grandTotal.toLocaleString()}</div>
      </div>

      <div class="chart-card"><div style="height: 250px;"><canvas id="analysis-chart"></canvas></div></div>

      <div style="margin-top: 32px;">
        <h4 style="font-size: 1rem; font-weight: 800; margin-bottom: 16px; color: var(--text-primary); display: flex; align-items: center; gap: 8px;">
          <span>📂</span> カテゴリー別内訳
        </h4>
        ${sorted.map(c => `
          <div class="category-summary-row premium-row" data-action="drillDown" data-category="${c.name}">
            <div class="row-icon-box">${c.icon}</div>
            <div class="row-content">
              <div class="row-top">
                <span class="row-name">${c.name}</span>
                <span class="row-amount">¥${c.total.toLocaleString()}</span>
              </div>
              <div class="row-bar-bg"><div class="row-bar-fill" style="width: ${(c.total/grandTotal)*100}%; background: linear-gradient(90deg, ${analysisState.viewType === 'expense' ? 'var(--color-expense)' : 'var(--color-income)'}, ${analysisState.viewType === 'expense' ? '#fb7185' : '#34d399'});"></div></div>
            </div>
            <span class="row-arrow">›</span>
          </div>
        `).join('')}
      </div>
    </div>

    <style>
      .filter-chip { background: var(--bg-secondary); border: 1px solid var(--border-color); padding: 8px 18px; border-radius: 20px; font-size: 0.85rem; font-weight: 800; color: var(--text-secondary); cursor: pointer; white-space: nowrap; transition: all 0.2s; box-shadow: var(--shadow-sm); }
      .filter-chip.active { background: var(--color-accent); border-color: var(--color-accent); color: white; transform: scale(1.05); box-shadow: 0 4px 12px var(--color-accent-light); }
      .chart-mode-btn { border: none; background: transparent; width: 36px; height: 36px; border-radius: 10px; font-size: 1.1rem; cursor: pointer; transition: all 0.2s; }
      .chart-mode-btn.active { background: var(--bg-card); box-shadow: var(--shadow-md); transform: scale(1.1); }
      
      .category-summary-row { display: flex; align-items: center; gap: 16px; padding: 16px; background: var(--bg-card); border-radius: 20px; margin-bottom: 12px; border: 1px solid var(--border-light); cursor: pointer; transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1); box-shadow: var(--shadow-sm); }
      .category-summary-row:hover { transform: translateX(4px); background: var(--bg-hover); border-color: var(--color-accent-light); }
      .category-summary-row:active { transform: scale(0.97); }
      
      .row-icon-box { font-size: 1.5rem; width: 44px; height: 44px; background: var(--bg-hover); border-radius: 12px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
      .row-content { flex: 1; }
      .row-top { display: flex; justify-content: space-between; font-size: 0.95rem; font-weight: 800; margin-bottom: 8px; }
      .row-bar-bg { height: 8px; background: var(--bg-hover); border-radius: 4px; overflow: hidden; }
      .row-bar-fill { height: 100%; border-radius: 4px; transition: width 1s ease-out; }
      .row-arrow { color: var(--text-muted); font-size: 1.4rem; font-weight: 300; transition: transform 0.2s; }
      .category-summary-row:hover .row-arrow { transform: translateX(2px); color: var(--color-accent); }
    </style>
  `;
}

function renderBSContent() {
  const accounts = store.getAccounts();
  const actualNetWorth = store.getTotalBalance();
  const positiveAccounts = accounts.filter(a => Number(a.balance) > 0).sort((a,b) => b.balance - a.balance);
  const negativeAccounts = accounts.filter(a => Number(a.balance) < 0).sort((a,b) => a.balance - b.balance);
  const totalAssets = positiveAccounts.reduce((sum, a) => sum + Number(a.balance), 0);
  const totalLiabilities = Math.abs(negativeAccounts.reduce((sum, a) => sum + Number(a.balance), 0));

  return `
    <div class="bs-content glass-effect-wrap">
      <!-- BS構成図 (バランス形式 - Chart.js) -->
      <div class="chart-card premium-card" style="margin-bottom: 24px; padding: 24px; border-radius: 24px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;">
          <div>
            <h4 style="font-size: 1.1rem; font-weight: 800; margin: 0;">🏛️ バランスシート</h4>
            <p style="font-size: 0.75rem; color: var(--text-muted); margin-top: 4px;">資産と負債のバランスを確認</p>
          </div>
          <div style="text-align: right;">
            <div style="font-size: 0.7rem; color: var(--text-muted); text-transform: uppercase; letter-spacing: 1px;">純資産 (Net Worth)</div>
            <div style="font-size: 1.4rem; font-weight: 800; color: var(--color-accent);">¥${actualNetWorth.toLocaleString()}</div>
          </div>
        </div>

        <div style="height: 340px; position: relative;">
          <canvas id="bs-balance-chart"></canvas>
        </div>

        <div class="bs-summary-footer">
          <div class="summary-item">
            <span class="dot asset"></span>
            <span class="label">資産合計</span>
            <span class="value">¥${totalAssets.toLocaleString()}</span>
          </div>
          <div class="summary-item">
            <span class="dot liability"></span>
            <span class="label">負債合計</span>
            <span class="value">¥${totalLiabilities.toLocaleString()}</span>
          </div>
        </div>
      </div>

      <!-- 残高のトレンド -->
      <div class="chart-card premium-card" style="padding: 24px; border-radius: 24px;">
        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px; gap: 12px;">
          <div>
            <h4 style="font-size: 1.1rem; font-weight: 800;">📈 推移グラフ</h4>
            <div style="font-size: 0.75rem; color: var(--text-muted);">口座別、または全体の推移</div>
          </div>
          <div style="display:flex; flex-direction:column; gap:8px; align-items:flex-end;">
            <select id="analysis-account-selector" style="font-size: 0.75rem; padding: 6px 12px; border-radius: 8px; border: 1px solid var(--border-color); background: var(--bg-hover); max-width: 150px;">
              <option value="total">📊 全体（純資産）</option>
              ${accounts.map(a => `<option value="${a.id}" ${a.id === analysisState.selectedAccountId ? 'selected' : ''}>${a.icon} ${a.name}</option>`).join('')}
            </select>
            <select id="bs-period-selector" style="font-size: 0.75rem; padding: 4px 8px; border-radius: 8px; border: 1px solid var(--border-color);">
              <option value="30" ${analysisState.bsPeriod === 30 ? 'selected' : ''}>1ヶ月</option>
              <option value="90" ${analysisState.bsPeriod === 90 ? 'selected' : ''}>3ヶ月</option>
              <option value="180" ${analysisState.bsPeriod === 180 ? 'selected' : ''}>半年</option>
              <option value="365" ${analysisState.bsPeriod === 365 ? 'selected' : ''}>1年</option>
            </select>
          </div>
        </div>
        <div style="height: 240px;"><canvas id="total-asset-chart"></canvas></div>
      </div>
    </div>

    <style>
      .bs-summary-footer { display: flex; justify-content: space-around; margin-top: 24px; padding-top: 16px; border-top: 1px solid var(--border-light); }
      .summary-item { display: flex; flex-direction: column; align-items: center; gap: 4px; }
      .summary-item .dot { width: 8px; height: 8px; border-radius: 50%; margin-bottom: 4px; }
      .summary-item .dot.asset { background: var(--color-accent); }
      .summary-item .dot.liability { background: var(--color-expense); }
      .summary-item .label { font-size: 0.7rem; color: var(--text-muted); font-weight: bold; }
      .summary-item .value { font-size: 0.9rem; font-weight: 800; }
      
      .premium-card { background: var(--bg-card); box-shadow: var(--shadow-lg); transition: transform 0.3s; }
      .premium-card:hover { transform: translateY(-4px); }
    </style>
  `;
}

function calculateCategoryTotals(txs) {
  const totals = {};
  const cats = store.getCategories();
  txs.forEach(tx => {
    if (!totals[tx.category]) {
      const c = cats.find(a => a.name === tx.category);
      totals[tx.category] = { name: tx.category, icon: c?.icon || '❓', total: 0 };
    }
    totals[tx.category].total += Number(tx.amount) || 0;
  });
  return totals;
}

function bindEvents(container) {
  container.querySelectorAll('[data-action="setTab"]').forEach(b => b.onclick = (e) => { analysisState.tab = e.currentTarget.dataset.tab; render(container); });
  container.querySelectorAll('[data-action="setViewType"]').forEach(b => b.onclick = (e) => { analysisState.viewType = e.currentTarget.dataset.type; render(container); });
  container.querySelectorAll('[data-action="setPeriod"]').forEach(b => b.onclick = (e) => { analysisState.periodType = e.currentTarget.dataset.val; render(container); });
  container.querySelectorAll('[data-action="setChartMode"]').forEach(b => b.onclick = (e) => { analysisState.chartMode = e.currentTarget.dataset.val; render(container); });
  
  container.querySelectorAll('[data-action="drillDown"]').forEach(row => {
    row.onclick = () => {
      const { start, end } = getPeriodDates();
      const category = row.dataset.category;
      setHistoryFilters({ startDate: start, endDate: end, account: '', category });
      window.navigateTo?.('history');
    };
  });

  const bsSel = container.querySelector('#bs-period-selector');
  if (bsSel) bsSel.onchange = e => { analysisState.bsPeriod = Number(e.target.value); render(container); };
  
  const accSel = container.querySelector('#analysis-account-selector');
  if (accSel) accSel.onchange = e => { 
    if (e.target.value === 'total') {
      analysisState.selectedAccountId = null;
    } else {
      analysisState.selectedAccountId = e.target.value;
    }
    render(container); 
  };
}

function renderPieChart(sorted) {
  const ctx = document.getElementById('analysis-chart')?.getContext('2d');
  if (!ctx) return;
  if (plChart) plChart.destroy();
  
  const totalAmount = sorted.reduce((sum, c) => sum + c.total, 0);
  
  plChart = new Chart(ctx, { 
    type: 'doughnut', 
    data: { 
      labels: sorted.map(c => c.name), 
      datasets: [{ 
        data: sorted.map(c => c.total), 
        backgroundColor: ['#6366f1', '#f43f5e', '#10b981', '#f59e0b', '#3b82f6', '#ec4899', '#8b5cf6', '#06b6d4'], 
        hoverBackgroundColor: ['#818cf8', '#fb7185', '#34d399', '#fbbf24', '#60a5fa', '#f472b6', '#a78bfa', '#22d3ee'],
        borderWidth: 0,
        hoverOffset: 15,
        spacing: 5
      }] 
    }, 
    options: { 
      responsive: true, 
      maintainAspectRatio: false, 
      animation: { animateScale: true, animateRotate: true, duration: 1000 },
      plugins: { 
        legend: { display: false }, // 内訳リストがあるため凡例はオフにしてチャートを大きく見せる
        tooltip: {
          backgroundColor: 'rgba(15, 15, 26, 0.9)',
          padding: 12,
          cornerRadius: 12,
          bodyFont: { size: 13, weight: 'bold' },
          callbacks: {
            label: (ctx) => ` ${ctx.label}: ¥${ctx.raw.toLocaleString()} (${((ctx.raw/totalAmount)*100).toFixed(1)}%)`
          }
        }
      }, 
      cutout: '75%' 
    },
    plugins: [{
      id: 'centerText',
      afterDraw: (chart) => {
        const { ctx, width, height } = chart;
        ctx.save();
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        // 合計金額タイトル
        ctx.font = 'bold 0.8rem sans-serif';
        ctx.fillStyle = '#9ca3b8';
        ctx.fillText('合計金額', width / 2, height / 2 - 15);
        
        // 合計金額数値
        ctx.font = 'bold 1.4rem sans-serif';
        ctx.fillStyle = analysisState.viewType === 'expense' ? '#f43f5e' : '#10b981';
        ctx.fillText('¥' + totalAmount.toLocaleString(), width / 2, height / 2 + 10);
        
        ctx.restore();
      }
    }]
  });
}

function renderBSBalanceChart(accounts) {
  const ctx = document.getElementById('bs-balance-chart')?.getContext('2d');
  if (!ctx) return;
  if (bsBalanceChart) bsBalanceChart.destroy();

  const actualNetWorth = store.getTotalBalance();
  const positiveAccounts = accounts.filter(a => Number(a.balance) > 0).sort((a,b) => b.balance - a.balance);
  const negativeAccounts = accounts.filter(a => Number(a.balance) < 0).sort((a,b) => a.balance - b.balance);

  // カラーパレット定義
  const assetColors = ['#6366f1', '#4b4df1', '#818cf8', '#a5b4fc', '#c7d2fe', '#e0e7ff'];
  const liabilityColors = ['#f43f5e', '#fb7185', '#fda4af', '#fecdd3', '#fff1f2'];
  
  const datasets = [];

  // 左側：資産
  positiveAccounts.forEach((acc, i) => {
    datasets.push({
      label: acc.name,
      data: [acc.balance, 0],
      backgroundColor: assetColors[i % assetColors.length],
      stack: 'bs',
      borderRadius: i === 0 ? { topLeft: 10, topRight: 10 } : 0,
      borderSkipped: false,
    });
  });

  // 右側：純資産
  if (actualNetWorth > 0) {
    datasets.push({
      label: '純資産',
      data: [0, actualNetWorth],
      backgroundColor: '#10b981', // 成功を表すグリーン
      stack: 'bs',
      borderRadius: { topLeft: 10, topRight: 10 },
      borderSkipped: false,
    });
  }

  // 右側：負債
  negativeAccounts.forEach((acc, i) => {
    datasets.push({
      label: acc.name,
      data: [0, Math.abs(acc.balance)],
      backgroundColor: liabilityColors[i % liabilityColors.length],
      stack: 'bs',
      borderRadius: i === negativeAccounts.length - 1 ? { bottomLeft: 10, bottomRight: 10 } : 0,
      borderSkipped: false,
    });
  });

  // 債務超過時の補填（左側）
  if (actualNetWorth < 0) {
    datasets.push({
      label: '純資産欠損',
      data: [Math.abs(actualNetWorth), 0],
      backgroundColor: 'rgba(148, 163, 184, 0.2)',
      borderDash: [5, 5],
      stack: 'bs',
      borderRadius: 10,
    });
  }

  bsBalanceChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: ['資産', '負債・純資産'],
      datasets: datasets
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false }, // ツールチップで見せるため凡例はオフ
        tooltip: {
          backgroundColor: 'rgba(15, 15, 26, 0.9)',
          titleFont: { size: 13, weight: 'bold' },
          bodyFont: { size: 12 },
          padding: 12,
          cornerRadius: 12,
          callbacks: {
            label: (context) => {
              const val = context.raw;
              if (val === 0) return null;
              return `${context.dataset.label}: ¥${val.toLocaleString()}`;
            }
          }
        }
      },
      scales: {
        x: {
          stacked: true,
          grid: { display: false },
          ticks: { font: { weight: 'bold', size: 12 } }
        },
        y: {
          stacked: true,
          grid: { color: 'rgba(255,255,255,0.05)' },
          ticks: { display: false }
        }
      },
      interaction: {
        mode: 'point'
      }
    }
  });
}

function renderPLLineChart(txs, start, end) {
  const ctx = document.getElementById('analysis-chart')?.getContext('2d');
  if (!ctx) return;
  if (plChart) plChart.destroy();

  const days = {};
  let current = new Date(start);
  const finish = new Date(end);
  while (current <= finish) {
    days[current.toISOString().split('T')[0]] = 0;
    current.setDate(current.getDate() + 1);
  }
  txs.forEach(tx => { if (days[tx.date] !== undefined) days[tx.date] += tx.amount; });

  const color = analysisState.viewType === 'expense' ? '#f43f5e' : '#10b981';

  plChart = new Chart(ctx, { 
    type: 'line', 
    data: { 
      labels: Object.keys(days).map(d => d.split('-').slice(1).join('/')), 
      datasets: [{ 
        label: analysisState.viewType === 'expense' ? '支出' : '収入',
        data: Object.values(days), 
        borderColor: color, 
        borderWidth: 3,
        tension: 0.4, 
        pointRadius: 0,
        pointHoverRadius: 6,
        fill: true,
        backgroundColor: (context) => {
          const chart = context.chart;
          const {ctx, chartArea} = chart;
          if (!chartArea) return null;
          const gradient = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
          gradient.addColorStop(0, color + '33');
          gradient.addColorStop(1, color + '00');
          return gradient;
        }
      }] 
    }, 
    options: { 
      responsive: true, 
      maintainAspectRatio: false, 
      plugins: { 
        legend: { display: false },
        tooltip: {
          backgroundColor: 'rgba(15, 15, 26, 0.9)',
          padding: 12,
          cornerRadius: 12,
          displayColors: false
        }
      },
      scales: { 
        x: { grid: { display: false }, ticks: { font: { size: 9 }, autoSkip: true, maxTicksLimit: 7 } }, 
        y: { beginAtZero: true, grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { font: { size: 9 } } } 
      } 
    } 
  });
}

function renderTotalAssetChart(history) {
  const ctx = document.getElementById('total-asset-chart')?.getContext('2d');
  if (!ctx || totalAssetChart) totalAssetChart?.destroy();

  let data = [];
  let label = '純資産';
  let color = '#4f46e5';

  if (analysisState.selectedAccountId) {
    const acc = store.getAccounts().find(a => a.id === analysisState.selectedAccountId);
    if (acc) {
      const accHistory = store.getAccountHistory(acc.name, analysisState.bsPeriod);
      data = accHistory.map(h => h.balance);
      label = acc.name;
      color = Number(acc.balance) < 0 ? '#f43f5e' : '#10b981';
    }
  } else {
    data = history.map(h => h.total);
  }

  totalAssetChart = new Chart(ctx, { 
    type: 'line', 
    data: { 
      labels: history.map(h => h.date.split('-').slice(1).join('/')), 
      datasets: [{ 
        label: label,
        data: data, 
        borderColor: color, 
        borderWidth: 4,
        tension: 0.4, 
        pointRadius: 0,
        pointHoverRadius: 6,
        pointHoverBackgroundColor: color,
        pointHoverBorderColor: '#fff',
        pointHoverBorderWidth: 2,
        fill: true, 
        backgroundColor: (context) => {
          const chart = context.chart;
          const {ctx, chartArea} = chart;
          if (!chartArea) return null;
          const gradient = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
          gradient.addColorStop(0, color + '44');
          gradient.addColorStop(1, color + '00');
          return gradient;
        }
      }] 
    }, 
    options: { 
      responsive: true, 
      maintainAspectRatio: false, 
      plugins: { 
        legend: { display: false },
        tooltip: {
          mode: 'index',
          intersect: false,
          callbacks: {
            label: (ctx) => `${ctx.dataset.label}: ¥${ctx.raw.toLocaleString()}`
          }
        }
      }, 
      scales: { 
        x: { display: true, ticks: { font: { size: 8 }, maxTicksLimit: 6 } }, 
        y: { ticks: { font: { size: 9 }, maxTicksLimit: 5 } } 
      } 
    } 
  });
}
