// ============================================
// 分析画面 (v6.0 - 収支ドリルダウン・BS積立グラフ搭載版)
// ============================================

import * as store from '../store.js';
import { setHistoryFilters } from './history.js';

let plChart = null;
let totalAssetChart = null;
let bsStackedChart = null;

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
      const historyFull = getAssetCompositionHistory(analysisState.bsPeriod);
      renderBSStackedChart(historyFull);
      
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

      <div style="margin-top: 24px;">
        <h4 style="font-size: 0.9rem; font-weight: 800; margin-bottom: 12px; color: var(--text-secondary);">カテゴリー内訳 (クリックで履歴へ)</h4>
        ${sorted.map(c => `
          <div class="category-summary-row" data-action="drillDown" data-category="${c.name}">
            <span class="row-icon">${c.icon}</span>
            <div class="row-content">
              <div class="row-top">
                <span class="row-name">${c.name}</span>
                <span class="row-amount">¥${c.total.toLocaleString()}</span>
              </div>
              <div class="row-bar-bg"><div class="row-bar-fill" style="width: ${(c.total/grandTotal)*100}%; background: ${analysisState.viewType === 'expense' ? 'var(--color-expense)' : 'var(--color-income)'};"></div></div>
            </div>
            <span class="row-arrow">›</span>
          </div>
        `).join('')}
      </div>
    </div>

    <style>
      .filter-chip { background: var(--bg-card); border: 1px solid var(--border-color); padding: 6px 16px; border-radius: 20px; font-size: 0.85rem; font-weight: 800; color: var(--text-muted); cursor: pointer; white-space: nowrap; }
      .filter-chip.active { background: var(--color-accent); border-color: var(--color-accent); color: white; }
      .chart-mode-btn { border: none; background: transparent; width: 32px; height: 32px; border-radius: 8px; font-size: 1rem; cursor: pointer; }
      .chart-mode-btn.active { background: var(--bg-card); box-shadow: var(--shadow-sm); }
      .category-summary-row { display: flex; align-items: center; gap: 12px; padding: 14px; background: var(--bg-card); border-radius: 16px; margin-bottom: 10px; border: 1px solid var(--border-light); cursor: pointer; transition: transform 0.2s; }
      .category-summary-row:active { transform: scale(0.98); background: var(--bg-hover); }
      .row-icon { font-size: 1.4rem; min-width: 32px; text-align: center; }
      .row-content { flex: 1; }
      .row-top { display: flex; justify-content: space-between; font-size: 0.9rem; font-weight: 800; margin-bottom: 6px; }
      .row-bar-bg { height: 6px; background: var(--bg-hover); border-radius: 3px; overflow: hidden; }
      .row-bar-fill { height: 100%; border-radius: 3px; }
      .row-arrow { color: var(--text-muted); font-size: 1.2rem; margin-left: 4px; }
    </style>
  `;
}

function renderBSContent() {
  const actualNetWorth = store.getTotalBalance();

  return `
    <div class="bs-content">
      <div style="background: linear-gradient(135deg, var(--color-accent), #4f46e5); border-radius: 24px; padding: 24px; color: white; margin-bottom: 24px; box-shadow: 0 10px 30px rgba(99, 102, 241, 0.3);">
        <div style="font-size: 0.85rem; opacity: 0.8; margin-bottom: 8px;">現在の純資産</div>
        <div style="font-size: 2.4rem; font-weight: 800;">¥${actualNetWorth.toLocaleString()}</div>
        <div style="display: flex; gap: 20px; margin-top: 20px; padding-top: 20px; border-top: 1px solid rgba(255,255,255,0.2);">
          <div><div style="font-size: 0.7rem; opacity: 0.7;">資産計</div><div style="font-size: 1rem; font-weight: 800;">¥${store.getAccounts().filter(a=>a.balance>0).reduce((s,a)=>s+a.balance, 0).toLocaleString()}</div></div>
          <div><div style="font-size: 0.7rem; opacity: 0.7;">負債計</div><div style="font-size: 1rem; font-weight: 800;">¥${Math.abs(store.getAccounts().filter(a=>a.balance<0).reduce((s,a)=>s+a.balance, 0)).toLocaleString()}</div></div>
        </div>
      </div>

      <div class="chart-card" style="padding: 20px; margin-bottom: 24px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
          <h4 style="font-size: 0.95rem; font-weight: 800;">💎 資産構成の推移 (積み上げ)</h4>
          <select id="bs-period-selector" style="font-size: 0.8rem; padding: 4px 8px; border-radius: 8px; border: 1px solid var(--border-color);">
            <option value="30" ${analysisState.bsPeriod === 30 ? 'selected' : ''}>1ヶ月</option>
            <option value="90" ${analysisState.bsPeriod === 90 ? 'selected' : ''}>3ヶ月</option>
            <option value="180" ${analysisState.bsPeriod === 180 ? 'selected' : ''}>6ヶ月</option>
          </select>
        </div>
        <div style="height: 250px;"><canvas id="bs-stacked-chart"></canvas></div>
      </div>

      <div class="chart-card" style="padding: 20px; margin-bottom: 24px;">
        <h4 style="font-size: 0.95rem; font-weight: 800; margin-bottom: 16px;">📈 純資産のトレンド (全体)</h4>
        <div style="height: 180px;"><canvas id="total-asset-chart"></canvas></div>
      </div>
    </div>
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

function getAssetCompositionHistory(days = 90) {
  const history = [];
  const accounts = store.getAccounts();
  const transactions = store.getTransactions();
  const now = new Date();
  
  for (let i = 0; i <= days; i += Math.max(1, Math.floor(days/30))) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
    const dStr = d.toISOString().split('T')[0];
    
    const point = { date: dStr, balances: {} };
    accounts.forEach(acc => {
      let bal = acc.balance;
      // この日より後の取引を逆算して、この時点の残高を出す
      transactions.forEach(tx => {
        if (tx.date > dStr) {
          const val = Number(tx.amount) || 0;
          if (tx.type === 'income' && tx.toAccount === acc.name) bal -= val;
          else if (tx.type === 'expense' && tx.fromAccount === acc.name) bal += val;
          else if (tx.type === 'transfer') {
            if (tx.fromAccount === acc.name) bal += val;
            if (tx.toAccount === acc.name) bal -= val;
          }
        }
      });
      point.balances[acc.name] = bal;
    });
    history.unshift(point);
  }
  return history;
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
}

function renderPieChart(sorted) {
  const ctx = document.getElementById('analysis-chart')?.getContext('2d');
  if (!ctx) return;
  if (plChart) plChart.destroy();
  
  plChart = new Chart(ctx, { 
    type: 'doughnut', 
    data: { 
      labels: sorted.map(c => c.name), 
      datasets: [{ 
        data: sorted.map(c => c.total), 
        backgroundColor: ['#6366f1', '#f43f5e', '#10b981', '#f59e0b', '#3b82f6', '#ec4899', '#8b5cf6', '#06b6d4'], 
        borderWidth: 0,
        hoverOffset: 15
      }] 
    }, 
    options: { 
      responsive: true, 
      maintainAspectRatio: false, 
      animation: { animateScale: true, animateRotate: true },
      plugins: { 
        legend: { position: 'right', labels: { boxWidth: 12, usePointStyle: true, font: { size: 10, weight: 'bold' } } } 
      }, 
      cutout: '65%' 
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

  plChart = new Chart(ctx, { 
    type: 'line', 
    data: { 
      labels: Object.keys(days).map(d => d.split('-').slice(1).join('/')), 
      datasets: [{ 
        label: analysisState.viewType === 'expense' ? '支出' : '収入',
        data: Object.values(days), 
        borderColor: analysisState.viewType === 'expense' ? '#f43f5e' : '#10b981', 
        backgroundColor: analysisState.viewType === 'expense' ? 'rgba(244, 63, 94, 0.1)' : 'rgba(16, 185, 129, 0.1)',
        tension: 0.4, 
        fill: true,
        pointRadius: 2
      }] 
    }, 
    options: { 
      responsive: true, 
      maintainAspectRatio: false, 
      plugins: { legend: { display: false } },
      scales: { x: { ticks: { font: { size: 9 }, autoSkip: true, maxTicksLimit: 7 } }, y: { beginAtZero: true, ticks: { font: { size: 9 } } } } 
    } 
  });
}

function renderBSStackedChart(history) {
  const ctx = document.getElementById('bs-stacked-chart')?.getContext('2d');
  if (!ctx) return;
  if (bsStackedChart) bsStackedChart.destroy();

  const accounts = store.getAccounts();
  const datasets = accounts.map((acc, idx) => {
    const colors = ['#6366f1', '#10b981', '#f59e0b', '#3b82f6', '#ec4899', '#8b5cf6'];
    return {
      label: acc.name,
      data: history.map(h => h.balances[acc.name] || 0),
      backgroundColor: colors[idx % colors.length],
      stack: 'stack0'
    };
  });

  bsStackedChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: history.map(h => h.date.split('-').slice(1).join('/')),
      datasets: datasets
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { position: 'bottom', labels: { boxWidth: 10, font: { size: 9 } } } },
      scales: {
        x: { stacked: true, ticks: { font: { size: 8 } } },
        y: { stacked: true, ticks: { font: { size: 9 } } }
      }
    }
  });
}

function renderTotalAssetChart(history) {
  const ctx = document.getElementById('total-asset-chart')?.getContext('2d');
  if (!ctx || totalAssetChart) totalAssetChart?.destroy();
  totalAssetChart = new Chart(ctx, { 
    type: 'line', 
    data: { 
      labels: history.map(h => h.date.split('-').slice(1).join('/')), 
      datasets: [{ 
        data: history.map(h => h.total), 
        borderColor: '#4f46e5', 
        borderWidth: 3,
        tension: 0.3, 
        pointRadius: 0, 
        fill: true, 
        backgroundColor: 'rgba(79, 70, 229, 0.1)' 
      }] 
    }, 
    options: { 
      responsive: true, 
      maintainAspectRatio: false, 
      plugins: { legend: { display: false } }, 
      scales: { x: { display: true, ticks: { font: { size: 8 }, maxTicksLimit: 6 } }, y: { ticks: { font: { size: 9 }, maxTicksLimit: 5 } } } 
    } 
  });
}
