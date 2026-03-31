// ============================================
// 分析画面 (v6.5 - レイアウト安定化 & 構成復元版)
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
  chartMode: 'pie',
  bsPeriod: 90,
  selectedAccountId: null,
  referenceDate: new Date(),
};

function getPeriodDates() {
  const ref = new Date(analysisState.referenceDate);
  let start, end;
  switch (analysisState.periodType) {
    case 'week': 
      start = new Date(ref); 
      start.setDate(ref.getDate() - ref.getDay()); 
      start.setHours(0,0,0,0); 
      end = new Date(start); 
      end.setDate(start.getDate() + 6);
      end.setHours(23,59,59,999);
      break;
    case 'month': 
      start = new Date(ref.getFullYear(), ref.getMonth(), 1); 
      end = new Date(ref.getFullYear(), ref.getMonth() + 1, 0); 
      end.setHours(23,59,59,999);
      break;
    case 'year': 
      start = new Date(ref.getFullYear(), 0, 1); 
      end = new Date(ref.getFullYear(), 11, 31); 
      end.setHours(23,59,59,999);
      break;
    case 'custom': 
      start = analysisState.customStart ? new Date(analysisState.customStart + 'T00:00:00') : new Date(ref.getFullYear(), ref.getMonth(), 1); 
      end = analysisState.customEnd ? new Date(analysisState.customEnd + 'T23:59:59') : new Date(); 
      break;
    default: 
      start = new Date(ref.getFullYear(), ref.getMonth(), 1); 
      end = new Date();
  }
  return { start: start.toISOString().split('T')[0], end: end.toISOString().split('T')[0] };
}

/**
 * メイン描画関数
 */
export function render(container) {
  if (!container) return;
  const contentHtml = analysisState.tab === 'pl' ? renderPLContent() : renderBSContent();
  
  container.innerHTML = `
    <div class="analysis-screen premium-mode fadeIn">
      <!-- 永続ヘッダー -->
      <div class="analysis-nav-header premium-tab-nav">
        <button class="nav-tab-item ${analysisState.tab === 'pl' ? 'active' : ''}" data-tab="pl" data-action="setTab">📊 収支</button>
        <button class="nav-tab-item ${analysisState.tab === 'bs' ? 'active' : ''}" data-tab="bs" data-action="setTab">💎 資産</button>
      </div>

      <div class="analysis-body">${contentHtml}</div>

      <style>
        .analysis-screen { padding: 16px; max-width: 800px; margin: 0 auto; color: var(--text-primary); }
        .premium-tab-nav { margin-bottom: 24px; padding: 4px; background: var(--bg-hover); border-radius: 16px; display: flex; gap: 4px; border: 1px solid var(--border-color); }
        .nav-tab-item { flex:1; border:none; background:transparent; padding: 14px; border-radius: 12px; transition: all 0.3s; font-weight: 800; font-size: 0.95rem; display: flex; align-items: center; justify-content: center; gap: 8px; color: var(--text-muted); cursor: pointer; }
        .nav-tab-item.active { background: var(--bg-card); color: var(--color-accent); box-shadow: var(--shadow-sm); }
        
        .premium-card { background: var(--bg-card); border: 1px solid var(--border-light); border-radius: 28px; padding: 24px; box-shadow: var(--shadow-lg); transition: all 0.3s; margin-bottom: 24px; }
        .premium-card:hover { transform: translateY(-2px); box-shadow: var(--shadow-xl); }
        
        .fadeIn { animation: fadeIn 0.4s ease-out forwards; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
      </style>
    </div>
  `;

  bindEvents(container);

  setTimeout(() => {
    if (analysisState.tab === 'pl') {
      const { start, end } = getPeriodDates();
      const txs = store.getTransactions().filter(tx => tx.type === analysisState.viewType && tx.date >= start && tx.date <= end);
      const totals = calculateCategoryTotals(txs);
      const sorted = Object.values(totals).sort((a,b) => b.total - a.total);
      if (analysisState.chartMode === 'pie') renderPieChart(sorted);
      else renderPLLineChart(txs, start, end);
    } else {
      const accounts = store.getAccounts();
      renderBSBalanceChart(accounts);
      const historyTotal = store.getAssetHistory(analysisState.bsPeriod);
      renderTotalAssetChart(historyTotal);
    }
  }, 100);
}

/**
 * 収支タブ (PL)
 */
function renderPLContent() {
  const { start, end } = getPeriodDates();
  const txs = store.getTransactions().filter(tx => tx.type === analysisState.viewType && tx.date >= start && tx.date <= end);
  const totals = calculateCategoryTotals(txs);
  const grandTotal = Object.values(totals).reduce((sum, c) => sum + c.total, 0);
  const sorted = Object.values(totals).sort((a,b) => b.total - a.total);

  return `
    <div class="pl-content fadeIn">
      <div class="period-filter-strip">
        <button class="filter-chip-v2 ${analysisState.periodType === 'week' ? 'active' : ''}" data-action="setPeriod" data-val="week">📅 週</button>
        <button class="filter-chip-v2 ${analysisState.periodType === 'month' ? 'active' : ''}" data-action="setPeriod" data-val="month">🗓️ 月</button>
        <button class="filter-chip-v2 ${analysisState.periodType === 'year' ? 'active' : ''}" data-action="setPeriod" data-val="year">📊 年</button>
        <button class="filter-chip-v2 ${analysisState.periodType === 'custom' ? 'active' : ''}" data-action="setPeriod" data-val="custom">🔍 指定</button>
      </div>

      <div class="analysis-controls-row">
        <div class="type-toggle-v2">
          <button class="type-btn-v2 ${analysisState.viewType === 'expense' ? 'active' : ''}" data-type="expense" data-action="setViewType">支出</button>
          <button class="type-btn-v2 ${analysisState.viewType === 'income' ? 'active' : ''}" data-type="income" data-action="setViewType">収入</button>
        </div>
        <div class="chart-mode-toggle">
          <button class="mode-btn ${analysisState.chartMode === 'pie' ? 'active' : ''}" data-action="setChartMode" data-val="pie">⭕</button>
          <button class="mode-btn ${analysisState.chartMode === 'line' ? 'active' : ''}" data-action="setChartMode" data-val="line">📈</button>
        </div>
      </div>

      <div class="period-navigation-wrapper">
        <button class="period-nav-btn" data-action="prevPeriod">‹</button>
        <div class="total-summary-card">
          <div style="font-size: 0.75rem; color: var(--text-muted); font-weight: 700;">${start} 〜 ${end}</div>
          <div class="total-amount ${analysisState.viewType}">¥${grandTotal.toLocaleString()}</div>
        </div>
        <button class="period-nav-btn" data-action="nextPeriod">›</button>
      </div>

      <div class="premium-card chart-container">
        <canvas id="analysis-chart" style="height: 280px;"></canvas>
      </div>

      <div class="category-list">
        ${sorted.map(c => `
          <div class="category-item-v2" data-action="drillDown" data-category-id="${c.id}">
            <div class="cat-icon-v2">${c.icon}</div>
            <div class="cat-details-v2">
              <div class="cat-top-v2">
                <span class="cat-name">${c.name}</span>
                <span class="cat-money">¥${c.total.toLocaleString()}</span>
              </div>
              <div class="cat-bar-bg-v2"><div class="cat-bar-v2 ${analysisState.viewType}" style="width: ${grandTotal > 0 ? (c.total/grandTotal)*100 : 0}%"></div></div>
            </div>
            <div class="cat-pct-v2">${grandTotal > 0 ? ((c.total/grandTotal)*100).toFixed(0) : 0}%</div>
          </div>
        `).join('')}
      </div>
    </div>

    <style>
      .period-filter-strip { display: flex; gap: 8px; margin-bottom: 24px; overflow-x: auto; padding-bottom: 4px; scrollbar-width: none; }
      .filter-chip-v2 { background: var(--bg-card); border: 1px solid var(--border-light); padding: 10px 18px; border-radius: 14px; font-size: 0.85rem; font-weight: 800; color: var(--text-secondary); cursor: pointer; white-space: nowrap; transition: all 0.2s; }
      .filter-chip-v2.active { background: var(--color-accent); color: white; border-color: var(--color-accent); }
      
      .analysis-controls-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; }
      .type-toggle-v2 { background: var(--bg-hover); padding: 4px; border-radius: 14px; display: flex; border: 1px solid var(--border-light); }
      .type-btn-v2 { border:none; background:transparent; padding: 8px 20px; border-radius: 10px; font-size: 0.8rem; font-weight: 800; color: var(--text-muted); cursor:pointer; }
      .type-btn-v2.active { background: var(--bg-card); box-shadow: var(--shadow-sm); }
      .type-btn-v2[data-type="expense"].active { color: var(--color-expense); }
      .type-btn-v2[data-type="income"].active { color: var(--color-income); }

      .chart-mode-toggle { display: flex; background: var(--bg-hover); padding: 4px; border-radius: 14px; border: 1px solid var(--border-light); }
      .mode-btn { border:none; background:transparent; padding: 8px 12px; font-size: 1.1rem; border-radius: 10px; cursor:pointer; }
      .mode-btn.active { background: var(--bg-card); box-shadow: var(--shadow-sm); }

      .period-navigation-wrapper { display: flex; align-items: center; justify-content: center; gap: 16px; margin-bottom: 24px; }
      .period-nav-btn { width: 44px; height: 44px; border-radius: 50%; background: var(--bg-card); border: 1px solid var(--border-light); font-size: 1.4rem; color: var(--color-accent); cursor: pointer; display: flex; align-items: center; justify-content: center; }
      .total-summary-card { flex: 1; text-align: center; }
      .total-amount { font-size: 2.2rem; font-weight: 900; letter-spacing: -1px; }
      .total-amount.expense { color: var(--color-expense); }
      .total-amount.income { color: var(--color-income); }

      .category-item-v2 { display: flex; align-items: center; gap: 16px; padding: 16px; background: var(--bg-card); border-radius: 20px; border: 1px solid var(--border-light); margin-bottom: 12px; cursor: pointer; }
      .cat-icon-v2 { font-size: 1.5rem; width: 44px; height: 44px; background: var(--bg-hover); border-radius: 12px; display: flex; align-items: center; justify-content: center; }
      .cat-details-v2 { flex: 1; }
      .cat-top-v2 { display: flex; justify-content: space-between; margin-bottom: 8px; font-weight: 800; font-size: 0.95rem; }
      .cat-bar-bg-v2 { height: 6px; background: var(--bg-hover); border-radius: 3px; overflow: hidden; }
      .cat-bar-v2 { height: 100%; border-radius: 3px; }
      .cat-bar-v2.expense { background: linear-gradient(90deg, var(--color-expense), #fb7185); }
      .cat-bar-v2.income { background: linear-gradient(90deg, var(--color-income), #34d399); }
      .cat-pct-v2 { color: var(--text-muted); font-size: 0.8rem; font-weight: 700; min-width: 35px; text-align: right; }
    </style>
  `;
}

/**
 * 資産タブ (BS) - レイアウト崩れを修正
 */
function renderBSContent() {
  const accounts = store.getAccounts();
  const netWorth = store.getTotalBalance();
  
  return `
    <div class="bs-content fadeIn">
      <div class="premium-card stats-summary" style="padding: 28px; text-align: center; background: linear-gradient(135deg, var(--bg-card) 0%, var(--bg-hover) 100%);">
        <div style="font-size: 0.8rem; color: var(--text-muted); font-weight: 800; letter-spacing: 1px; margin-bottom: 8px;">TOTAL NET WORTH</div>
        <div style="font-size: 2.4rem; font-weight: 900; color: var(--color-accent); letter-spacing: -1.5px;">¥${netWorth.toLocaleString()}</div>
      </div>

      <div class="premium-card chart-card">
        <div style="font-size: 1rem; font-weight: 900; margin-bottom: 20px; display: flex; align-items: center; gap: 8px;">🏦 資産・負債バランス</div>
        <div style="height: 320px;"><canvas id="bs-balance-chart"></canvas></div>
      </div>

      <div class="premium-card asset-trend-card">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
          <h4 style="font-size: 1rem; font-weight: 900; margin: 0;">📈 資産推移</h4>
          <div style="display: flex; gap: 8px;">
            <select id="analysis-account-selector" class="select-v2">
              <option value="total">全体</option>
              ${accounts.map(a => `<option value="${a.id}" ${a.id === analysisState.selectedAccountId ? 'selected' : ''}>${a.name}</option>`).join('')}
            </select>
            <select id="bs-period-selector" class="select-v2">
              <option value="30" ${analysisState.bsPeriod === 30 ? 'selected' : ''}>30日</option>
              <option value="90" ${analysisState.bsPeriod === 90 ? 'selected' : ''}>90日</option>
              <option value="365" ${analysisState.bsPeriod === 365 ? 'selected' : ''}>1年</option>
            </select>
          </div>
        </div>
        <div style="height: 240px;"><canvas id="total-asset-chart"></canvas></div>
      </div>
    </div>

    <style>
      .select-v2 { background: var(--bg-hover); border: 1px solid var(--border-color); border-radius: 10px; padding: 6px 12px; font-size: 0.8rem; font-weight: 800; color: var(--text-primary); outline: none; }
    </style>
  `;
}

function calculateCategoryTotals(txs) {
  const totals = {};
  const cats = store.getCategories();
  txs.forEach(tx => {
    const cid = tx.categoryId || 'cat_other';
    if (!totals[cid]) {
      const c = cats.find(a => a.id === cid);
      totals[cid] = { id: cid, name: c?.name || tx.category || 'その他', icon: c?.icon || '❓', total: 0 };
    }
    totals[cid].total += Number(tx.amount) || 0;
  });
  return totals;
}

function bindEvents(container) {
  container.querySelectorAll('[data-action="setTab"]').forEach(b => b.onclick = (e) => { analysisState.tab = e.currentTarget.dataset.tab; render(container); });
  container.querySelectorAll('[data-action="setViewType"]').forEach(b => b.onclick = (e) => { analysisState.viewType = e.currentTarget.dataset.type; render(container); });
  container.querySelectorAll('[data-action="setPeriod"]').forEach(b => b.onclick = (e) => { 
    const val = e.currentTarget.dataset.val;
    if (val === 'custom') showCustomPeriodModal(container);
    else { analysisState.periodType = val; analysisState.referenceDate = new Date(); render(container); }
  });
  container.querySelectorAll('[data-action="prevPeriod"]').forEach(b => b.onclick = () => {
    const d = new Date(analysisState.referenceDate);
    if (analysisState.periodType === 'week') d.setDate(d.getDate() - 7);
    else if (analysisState.periodType === 'month') d.setMonth(d.getMonth() - 1);
    else if (analysisState.periodType === 'year') d.setFullYear(d.getFullYear() - 1);
    analysisState.referenceDate = d;
    render(container);
  });
  container.querySelectorAll('[data-action="nextPeriod"]').forEach(b => b.onclick = () => {
    const d = new Date(analysisState.referenceDate);
    if (analysisState.periodType === 'week') d.setDate(d.getDate() + 7);
    else if (analysisState.periodType === 'month') d.setMonth(d.getMonth() + 1);
    else if (analysisState.periodType === 'year') d.setFullYear(d.getFullYear() + 1);
    analysisState.referenceDate = d;
    render(container);
  });
  container.querySelectorAll('[data-action="setChartMode"]').forEach(b => b.onclick = (e) => { analysisState.chartMode = e.currentTarget.dataset.val; render(container); });
  container.querySelectorAll('[data-action="drillDown"]').forEach(row => { row.onclick = () => {
      const { start, end } = getPeriodDates();
      setHistoryFilters({ startDate: start, endDate: end, accountId: '', categoryId: row.dataset.categoryId });
      window.navigateTo?.('history');
  }; });
  const bsSel = container.querySelector('#bs-period-selector');
  if (bsSel) bsSel.onchange = e => { analysisState.bsPeriod = Number(e.target.value); render(container); };
  const accSel = container.querySelector('#analysis-account-selector');
  if (accSel) accSel.onchange = e => { analysisState.selectedAccountId = e.target.value === 'total' ? null : e.target.value; render(container); };
}

function showCustomPeriodModal(container) {
  const existing = document.getElementById('custom-period-modal');
  if (existing) existing.remove();
  const modal = document.createElement('div');
  modal.id = 'custom-period-modal';
  modal.className = 'premium-modal-overlay fadeIn';
  const now = new Date();
  const ds = analysisState.customStart || new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
  const de = analysisState.customEnd || now.toISOString().split('T')[0];
  modal.innerHTML = `
    <div class="premium-modal-content slideUp">
      <div class="modal-header"><h3>📅 期間を指定</h3><button class="modal-close-btn">&times;</button></div>
      <div class="modal-body"><div class="date-input-group"><label>開始日</label><input type="date" id="modal-start-date" value="${ds}"></div><div class="date-input-group"><label>終了日</label><input type="date" id="modal-end-date" value="${de}"></div></div>
      <div class="modal-footer"><button class="modal-apply-btn">この期間で表示</button></div>
    </div>
    <style>
      .premium-modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.4); backdrop-filter: blur(8px); z-index: 2000; display: flex; align-items: center; justify-content: center; padding: 20px; }
      .premium-modal-content { background: var(--bg-card); width: 100%; max-width: 400px; border-radius: 28px; box-shadow: var(--shadow-xl); border: 1px solid var(--border-light); overflow: hidden; }
      .modal-header { padding: 20px 24px; border-bottom: 1px solid var(--border-light); display: flex; justify-content: space-between; align-items: center; }
      .modal-close-btn { font-size: 1.8rem; line-height: 1; color: var(--text-muted); border: none; background: transparent; cursor: pointer; }
      .modal-body { padding: 24px; display: flex; flex-direction: column; gap: 20px; }
      .date-input-group { display: flex; flex-direction: column; gap: 8px; }
      .date-input-group label { font-size: 0.8rem; font-weight: 700; color: var(--text-secondary); }
      .date-input-group input { width: 100%; padding: 12px 16px; border-radius: 12px; border: 1px solid var(--border-color); background: var(--bg-hover); font-size: 1rem; color: var(--text-primary); outline: none; }
      .modal-footer { padding: 16px 24px 24px; }
      .modal-apply-btn { width: 100%; padding: 14px; border-radius: 14px; background: var(--color-accent); color: white; border:none; font-weight: 800; transition: all 0.2s; cursor: pointer; }
      .slideUp { animation: slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1); }
      @keyframes slideUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
    </style>
  `;
  document.body.appendChild(modal);
  modal.querySelector('.modal-close-btn').onclick = () => modal.remove();
  modal.onclick = (e) => { if (e.target === modal) modal.remove(); };
  modal.querySelector('.modal-apply-btn').onclick = () => {
    analysisState.customStart = document.getElementById('modal-start-date').value;
    analysisState.customEnd = document.getElementById('modal-end-date').value;
    analysisState.periodType = 'custom';
    modal.remove();
    render(container);
  };
}

/**
 * チャート描画: 円グラフ
 */
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
        borderWidth: 0, spacing: 6
      }] 
    }, 
    options: { 
      responsive: true, maintainAspectRatio: false,
      plugins: { 
        legend: { display: false },
        tooltip: {
          backgroundColor: 'rgba(15, 15, 26, 0.95)', padding: 16, cornerRadius: 16,
          callbacks: { label: (ctx) => ` ¥${ctx.raw.toLocaleString()} (${((ctx.raw/totalAmount)*100).toFixed(1)}%)` }
        }
      }, 
      cutout: '72%' 
    }
  });
}

/**
 * チャート描画: 折れ線 (PL)
 */
function renderPLLineChart(txs, start, end) {
  const ctx = document.getElementById('analysis-chart')?.getContext('2d');
  if (!ctx) return;
  if (plChart) plChart.destroy();
  const days = {};
  let cur = new Date(start);
  const fin = new Date(end);
  while (cur <= fin) { days[cur.toISOString().split('T')[0]] = 0; cur.setDate(cur.getDate() + 1); }
  txs.forEach(tx => { if (days[tx.date] !== undefined) days[tx.date] += Number(tx.amount); });
  const color = analysisState.viewType === 'expense' ? '#f43f5e' : '#10b981';
  plChart = new Chart(ctx, { 
    type: 'line', 
    data: { 
      labels: Object.keys(days).map(d => d.split('-').slice(1).join('/')), 
      datasets: [{ 
        label: analysisState.viewType === 'expense' ? '支出' : '収入', 
        data: Object.values(days), 
        borderColor: color, borderWidth: 4, tension: 0.4, 
        pointRadius: 0, fill: true, 
        backgroundColor: color + '22'
      }] 
    }, 
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } } 
  });
}

/**
 * チャート描画: バランスシート (標準マウント版)
 */
function renderBSBalanceChart(accounts) {
  const ctx = document.getElementById('bs-balance-chart')?.getContext('2d');
  if (!ctx) return;
  if (bsBalanceChart) bsBalanceChart.destroy();

  const actualNetWorth = store.getTotalBalance();
  const positiveAccounts = accounts.filter(a => Number(a.balance) > 0).sort((a,b) => b.balance - a.balance);
  const negativeAccounts = accounts.filter(a => Number(a.balance) < 0).sort((a,b) => a.balance - b.balance);
  const assetColors = ['#4f46e5', '#6366f1', '#818cf8', '#a5b4fc'];
  const liabilityColors = ['#e11d48', '#f43f5e', '#fb7185'];
  const datasets = [];

  positiveAccounts.forEach((acc, i) => { datasets.push({ label: acc.name, data: [acc.balance, 0], backgroundColor: assetColors[i % assetColors.length], stack: 'bs' }); });
  if (actualNetWorth > 0) datasets.push({ label: '純資産', data: [0, actualNetWorth], backgroundColor: '#10b981', stack: 'bs' });
  negativeAccounts.forEach((acc, i) => { datasets.push({ label: acc.name, data: [0, Math.abs(acc.balance)], backgroundColor: liabilityColors[i % liabilityColors.length], stack: 'bs' }); });
  
  bsBalanceChart = new Chart(ctx, {
    type: 'bar',
    data: { labels: ['資産', '負債・純資産'], datasets: datasets },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: 'rgba(15, 15, 26, 0.95)', padding: 16, cornerRadius: 16,
          callbacks: { label: (ctx) => ctx.raw !== 0 ? ` ${ctx.dataset.label}: ¥${ctx.raw.toLocaleString()}` : null }
        }
      },
      scales: { x: { stacked: true }, y: { stacked: true, beginAtZero: true } }
    }
  });
}

/**
 * チャート描画: 資産推移
 */
function renderTotalAssetChart(history) {
  const ctx = document.getElementById('total-asset-chart')?.getContext('2d');
  if (!ctx || totalAssetChart) totalAssetChart?.destroy();
  if (!ctx) return;

  let data = [];
  let label = '純資産';
  let color = '#6366f1';

  if (analysisState.selectedAccountId) {
    const accHistory = store.getAccountHistory(analysisState.selectedAccountId, analysisState.bsPeriod);
    const acc = store.getAccounts().find(a => a.id === analysisState.selectedAccountId);
    data = accHistory.map(h => h.balance); 
    label = acc ? acc.name : '不明な口座';
    color = (acc && Number(acc.balance) < 0) ? '#f43f5e' : '#10b981';
  } else { data = history.map(h => h.total); }

  totalAssetChart = new Chart(ctx, { 
    type: 'line', 
    data: { 
      labels: history.map(h => h.date.split('-').slice(1).join('/')), 
      datasets: [{ label: label, data: data, borderColor: color, borderWidth: 4, tension: 0.4, fill: true, backgroundColor: color + '22' }] 
    }, 
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } } 
  });
}
