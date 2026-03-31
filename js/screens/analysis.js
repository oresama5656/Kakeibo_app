// ============================================
// 分析画面 (v5.2 - クラッシュ修正版)
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
  if (!container) return;
  
  // 1. 基本レイアウトの描画
  try {
    const contentHtml = analysisState.tab === 'pl' ? renderPLContent() : renderBSContent();
    
    container.innerHTML = `
      <div class="analysis-screen simple-mode">
        <!-- Tab Header -->
        <div class="analysis-nav-header" style="margin-bottom: var(--space-lg); padding: 4px; background: var(--bg-hover); border-radius: var(--radius-lg); display: flex; gap: 4px; border: 1px solid var(--border-color);">
          <button class="nav-tab-item ${analysisState.tab === 'pl' ? 'active' : ''}" 
                  data-tab="pl" 
                  data-action="setTab" 
                  style="flex:1; border:none; background:transparent; padding: 10px; border-radius: var(--radius-md); transition: all 0.2s; font-weight: bold; font-size: var(--font-size-sm); display: flex; align-items: center; justify-content: center; gap: 8px; color: ${analysisState.tab === 'pl' ? 'var(--color-accent)' : 'var(--text-muted)'}; ${analysisState.tab === 'pl' ? 'background: var(--bg-card); box-shadow: var(--shadow-sm);' : ''}">
            <span>📊</span> 収支
          </button>
          <button class="nav-tab-item ${analysisState.tab === 'bs' ? 'active' : ''}" 
                  data-tab="bs" 
                  data-action="setTab" 
                  style="flex:1; border:none; background:transparent; padding: 10px; border-radius: var(--radius-md); transition: all 0.2s; font-weight: bold; font-size: var(--font-size-sm); display: flex; align-items: center; justify-content: center; gap: 8px; color: ${analysisState.tab === 'bs' ? 'var(--color-accent)' : 'var(--text-muted)'}; ${analysisState.tab === 'bs' ? 'background: var(--bg-card); box-shadow: var(--shadow-sm);' : ''}">
            <span>💎</span> 資産
          </button>
        </div>

        <div class="analysis-body">
          ${contentHtml}
        </div>
      </div>
    `;
  } catch (err) {
    console.error('Render main content failed:', err);
    container.innerHTML = '<div style="padding: 20px; text-align:center;">表示エラーが発生しました</div>';
  }

  // 2. イベントバインド (コンテンツ描画直後に実行し、確実性を高める)
  bindEvents(container);

  // 3. グラフ描画 (非同期で実行)
  setTimeout(() => {
    try {
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
    } catch (err) {
      console.warn('Chart rendering deferred or failed:', err);
    }
  }, 50);
}

function renderPLContent() {
  const { label, start, end } = getPeriodDates();
  const transactions = store.getTransactions().filter(tx => tx.type === analysisState.viewType && tx.date >= start && tx.date <= end);
  const categoryTotals = calculateCategoryTotals(transactions);
  const grandTotal = Object.values(categoryTotals).reduce((sum, c) => sum + (Number(c.total) || 0), 0);
  const sortedCategories = Object.values(categoryTotals).sort((a, b) => b.total - a.total);

  return `
    <div class="pl-content">
      <div class="type-toggle" style="margin-bottom: var(--space-md);">
        <button class="type-btn ${analysisState.viewType === 'expense' ? 'active' : ''}" style="border-radius: var(--radius-full) 0 0 var(--radius-full); border-color: var(--color-expense); color: var(--color-expense); ${analysisState.viewType === 'expense' ? 'background: var(--color-expense); color: #fff;' : ''}" data-type="expense" data-action="setViewType">支出</button>
        <button class="type-btn ${analysisState.viewType === 'income' ? 'active' : ''}" style="border-radius: 0 var(--radius-full) var(--radius-full) 0; border-color: var(--color-income); color: var(--color-income); ${analysisState.viewType === 'income' ? 'background: var(--color-income); color: #fff;' : ''}" data-type="income" data-action="setViewType">収入</button>
      </div>

      <div class="simple-summary" style="text-align: center; margin-bottom: var(--space-lg); padding: var(--space-md) 0;">
        <div style="font-size: var(--font-size-sm); color: var(--text-secondary);">${label} 合計</div>
        <div style="font-size: var(--font-size-3xl); font-weight: bold; color: ${analysisState.viewType === 'expense' ? 'var(--color-expense)' : 'var(--color-income)'};">
          ¥${grandTotal.toLocaleString('ja-JP')}
        </div>
      </div>

      <div class="chart-card">
        <div class="header-flex" style="display:flex; justify-content: space-between; align-items:center; margin-bottom: var(--space-md); gap: 8px;">
          <select class="form-input" id="analysis-period-selector" style="flex:1; height: 36px; font-size: 11px;">
            <option value="day" ${analysisState.periodType === 'day' ? 'selected' : ''}>今日</option>
            <option value="week" ${analysisState.periodType === 'week' ? 'selected' : ''}>今週</option>
            <option value="month" ${analysisState.periodType === 'month' ? 'selected' : ''}>今月</option>
            <option value="custom" ${analysisState.periodType === 'custom' ? 'selected' : ''}>任意</option>
          </select>
          <select class="form-input" id="chart-mode-selector" style="flex:1; height: 36px; font-size: 11px;">
            <option value="pie" ${analysisState.chartMode === 'pie' ? 'selected' : ''}>円グラフ</option>
            <option value="trend" ${analysisState.chartMode === 'trend' ? 'selected' : ''}>推移</option>
          </select>
        </div>
        <div class="chart-container" style="height: 250px; position: relative;">
          <canvas id="analysis-chart"></canvas>
          ${sortedCategories.length === 0 ? `<div style="position:absolute; inset:0; display:flex; align-items:center; justify-content:center; color:var(--text-muted); font-size:12px;">なし</div>` : ''}
        </div>
      </div>

      <div class="category-list" style="margin-top: 16px;">
        ${sortedCategories.map(cat => {
          const pct = grandTotal > 0 ? ((cat.total / grandTotal) * 100).toFixed(1) : 0;
          return `
            <div style="display: flex; align-items: center; gap: 12px; padding: 12px; background: var(--bg-card); border-radius: 12px; margin-bottom: 8px; border: 1px solid var(--border-light);">
              <span style="font-size: 1.2rem;">${cat.icon}</span>
              <div style="flex: 1;">
                <div style="display: flex; justify-content: space-between; font-size: 13px; font-weight: 600;">
                  <span>${cat.name}</span>
                  <span>¥${cat.total.toLocaleString()}</span>
                </div>
                <div style="height: 4px; background: var(--bg-hover); border-radius: 2px; margin-top: 6px;">
                  <div style="height: 100%; width: ${pct}%; background: ${analysisState.viewType === 'expense' ? 'var(--color-expense)' : 'var(--color-income)'}; border-radius: 2px;"></div>
                </div>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    </div>
  `;
}

function renderBSContent() {
  const accounts = store.getAccounts();
  const totalBalance = store.getTotalBalance();

  const positiveAccounts = accounts.filter(a => (Number(a.balance) || 0) >= 0);
  const negativeAccounts = accounts.filter(a => (Number(a.balance) || 0) < 0);
  const totalAssets = Math.max(positiveAccounts.reduce((sum, a) => sum + (Number(a.balance) || 0), 0), 1);
  const totalLiabilities = Math.abs(negativeAccounts.reduce((sum, a) => sum + (Number(a.balance) || 0), 0));
  const netWorth = Math.max(totalAssets - totalLiabilities, 0);

  const maxHeight = Math.max(totalAssets, totalLiabilities + netWorth, 1);

  return `
    <div class="bs-content">
      <div class="simple-summary" style="text-align: center; margin: 24px 0;">
        <div style="font-size: 0.8rem; color: var(--text-secondary);">純資産総額</div>
        <div style="font-size: 2rem; font-weight: 800; color: var(--color-accent);">¥${totalBalance.toLocaleString()}</div>
      </div>

      <div class="chart-card" style="margin-bottom: 16px; padding: 20px;">
        <div style="font-size: 0.75rem; font-weight: bold; text-align: center; margin-bottom: 20px; color: var(--text-secondary);">構成バランス</div>
        <div style="display: flex; gap: 10px; height: 280px; align-items: flex-end;">
          
          <div style="flex: 1; height: 100%; display: flex; flex-direction: column; justify-content: flex-end; gap: 2px;">
            <div style="text-align: center; font-size: 10px; font-weight: bold; margin-bottom: 4px;">資産</div>
            ${positiveAccounts.length > 0 ? positiveAccounts.sort((a,b) => b.balance - a.balance).map(acc => {
              const h = (acc.balance / maxHeight) * 100;
              if (h < 3) return ''; 
              return `<div style="height: ${h}%; background: #4f46e5; border-radius: 4px; display: flex; align-items: center; justify-content: center; overflow: hidden; color: white; font-size: 9px; font-weight: bold; padding: 2px;" title="${acc.name}">${acc.name}</div>`;
            }).join('') : '<div style="flex:1; background: var(--bg-hover);"></div>'}
          </div>

          <div style="flex: 1; height: 100%; display: flex; flex-direction: column; justify-content: flex-end; gap: 2px;">
            <div style="text-align: center; font-size: 10px; font-weight: bold; margin-bottom: 4px;">純資産・負債</div>
            ${netWorth > 0 ? `<div style="height: ${(netWorth / maxHeight) * 100}%; background: var(--color-accent); border-radius: 4px; display: flex; align-items: center; justify-content: center; color: white; font-size: 9px; font-weight: bold;">純資産</div>` : ''}
            ${negativeAccounts.map(acc => {
              const h = (Math.abs(acc.balance) / maxHeight) * 100;
              if (h < 3) return '';
              return `<div style="height: ${h}%; background: #f43f5e; border-radius: 4px; display: flex; align-items: center; justify-content: center; color: white; font-size: 9px; font-weight: bold;">${acc.name}</div>`;
            }).join('')}
          </div>
        </div>
      </div>

      <div class="chart-card">
         <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
           <span style="font-size: 12px; font-weight: bold;">資産推移</span>
           <select id="bs-period-selector" style="font-size: 10px; padding: 4px;">
             <option value="30" ${analysisState.bsPeriod === 30 ? 'selected' : ''}>1ヶ月</option>
             <option value="90" ${analysisState.bsPeriod === 90 ? 'selected' : ''}>3ヶ月</option>
           </select>
         </div>
         <div style="height: 180px;"><canvas id="total-asset-chart"></canvas></div>
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
  if (!container) return;
  
  // 以前のリスナーを一度クリアするためにクローンして要素を置換する手法もあるが、
  // シンプルにセレクタで取得して登録する。
  
  container.querySelectorAll('[data-action="setTab"]').forEach(btn => {
    btn.onclick = (e) => {
      analysisState.tab = e.currentTarget.dataset.tab;
      refresh();
    };
  });

  container.querySelectorAll('[data-action="setViewType"]').forEach(btn => {
    btn.onclick = (e) => {
      analysisState.viewType = e.currentTarget.dataset.type;
      refresh();
    };
  });

  const periodSel = container.querySelector('#analysis-period-selector');
  if (periodSel) periodSel.onchange = e => { analysisState.periodType = e.target.value; refresh(); };

  const modeSel = container.querySelector('#chart-mode-selector');
  if (modeSel) modeSel.onchange = e => { analysisState.chartMode = e.target.value; refresh(); };

  const bsPeriodSel = container.querySelector('#bs-period-selector');
  if (bsPeriodSel) bsPeriodSel.onchange = e => { analysisState.bsPeriod = Number(e.target.value); refresh(); };
}

function renderPieChart(sortedCategories) {
  const canvas = document.getElementById('analysis-chart');
  if (!canvas) return;
  if (pieChart) pieChart.destroy();
  if (trendChart) { trendChart.destroy(); trendChart = null; }
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  pieChart = new Chart(canvas, {
    type: 'doughnut',
    data: {
      labels: sortedCategories.map(c => c.name),
      datasets: [{
        data: sortedCategories.map(c => c.total),
        backgroundColor: ['#6366f1', '#f43f5e', '#10b981', '#f59e0b', '#3b82f6'],
        borderWidth: 0
      }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false } }
    }
  });
}

function renderTotalAssetChart(history) {
  const canvas = document.getElementById('total-asset-chart');
  if (!canvas) return;
  if (totalAssetChart) totalAssetChart.destroy();
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  totalAssetChart = new Chart(canvas, {
    type: 'line',
    data: {
      labels: history.map(h => h.date.split('-').slice(1).join('/')),
      datasets: [{
        data: history.map(h => h.total),
        borderColor: '#6366f1',
        tension: 0.4, pointRadius: 0, fill: true,
        backgroundColor: 'rgba(99, 102, 241, 0.1)'
      }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { grid: { display: false }, ticks: { display: false } },
        y: { grid: { color: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }, ticks: { font: { size: 9 } } }
      }
    }
  });
}

function refresh() {
  const container = document.getElementById('screen-analysis');
  if (container) render(container);
}
