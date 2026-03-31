// ============================================
// 分析画面 (v6.3 - プレミアム・ナビゲーション完成版)
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
  referenceDate: new Date(), // 現在表示中の基準日
};

/**
 * 表示対象期間の開始日・終了日を取得
 */
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
 * 集計画面のメイン描画
 */
export function render(container) {
  if (!container) return;
  const contentHtml = analysisState.tab === 'pl' ? renderPLContent() : renderBSContent();
  
  container.innerHTML = `
    <div class="analysis-screen premium-mode fadeIn">
      <div class="analysis-nav-header premium-tab-nav">
        <button class="nav-tab-item ${analysisState.tab === 'pl' ? 'active' : ''}" data-tab="pl" data-action="setTab">📊 収支</button>
        <button class="nav-tab-item ${analysisState.tab === 'bs' ? 'active' : ''}" data-tab="bs" data-action="setTab">💎 資産</button>
      </div>
      <div class="analysis-body">${contentHtml}</div>
    </div>
    <style>
      .analysis-screen { padding: 8px; max-width: 800px; margin: 0 auto; }
      .premium-tab-nav { margin-bottom: 24px; padding: 4px; background: var(--bg-hover); border-radius: 16px; display: flex; gap: 4px; border: 1px solid var(--border-color); }
      .nav-tab-item { flex:1; border:none; background:transparent; padding: 12px; border-radius: 12px; transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); font-weight: 800; font-size: 0.9rem; display: flex; align-items: center; justify-content: center; gap: 8px; color: var(--text-muted); cursor: pointer; }
      .nav-tab-item.active { background: var(--bg-card); color: var(--color-accent); box-shadow: var(--shadow-sm); transform: scale(1.02); }
    </style>
  `;

  bindEvents(container);

  // チャート描画を遅延実行
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
      const accounts = store.getAccounts();
      renderBSBalanceChart(accounts);
      const historyTotal = store.getAssetHistory(analysisState.bsPeriod);
      renderTotalAssetChart(historyTotal);
    }
  }, 100);
}

/**
 * 収支（PL）タブの内容描画
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
        <div class="premium-total-card">
          <div class="total-label">${start} 〜 ${end} の合計</div>
          <div class="total-value ${analysisState.viewType} animate-number">¥${grandTotal.toLocaleString()}</div>
        </div>
        <button class="period-nav-btn" data-action="nextPeriod">›</button>
      </div>

      <div class="chart-card premium-card" style="padding: 24px; border-radius: 28px; margin-bottom: 32px; min-height: 320px;">
        <canvas id="analysis-chart"></canvas>
      </div>

      <div class="category-breakdown-section">
        <div class="section-header">
          <span class="dot"></span>
          <h4>カテゴリー別内訳</h4>
        </div>
        ${sorted.map(c => `
          <div class="category-row-v2" data-action="drillDown" data-category="${c.name}">
            <div class="cat-icon">${c.icon}</div>
            <div class="cat-info">
              <div class="cat-top">
                <span class="cat-name">${c.name}</span>
                <span class="cat-amount">¥${c.total.toLocaleString()}</span>
              </div>
              <div class="cat-progress-bg"><div class="cat-progress-fill ${analysisState.viewType}" style="width: ${grandTotal > 0 ? (c.total/grandTotal)*100 : 0}%"></div></div>
            </div>
            <div class="cat-percent">${grandTotal > 0 ? ((c.total/grandTotal)*100).toFixed(0) : 0}%</div>
          </div>
        `).join('')}
      </div>
    </div>

    <style>
      .period-filter-strip { display: flex; gap: 8px; margin-bottom: 24px; overflow-x: auto; padding: 4px 0; -webkit-overflow-scrolling: touch; scrollbar-width: none; }
      .period-filter-strip::-webkit-scrollbar { display: none; }
      .filter-chip-v2 { background: var(--bg-card); border: 1px solid var(--border-light); padding: 10px 20px; border-radius: 14px; font-size: 0.85rem; font-weight: 700; color: var(--text-secondary); cursor: pointer; white-space: nowrap; transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1); box-shadow: var(--shadow-sm); }
      .filter-chip-v2.active { background: var(--color-accent); border-color: var(--color-accent); color: white; transform: translateY(-2px); box-shadow: 0 4px 15px var(--color-accent-light); }
      
      .analysis-controls-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; }
      .type-toggle-v2 { background: var(--bg-hover); padding: 4px; border-radius: 14px; display: flex; gap: 4px; border: 1px solid var(--border-light); }
      .type-btn-v2 { border:none; background:transparent; cursor:pointer; padding: 8px 24px; border-radius: 10px; font-size: 0.85rem; font-weight: 800; color: var(--text-muted); transition: all 0.2s; }
      .type-btn-v2.active { background: var(--bg-card); box-shadow: var(--shadow-sm); }
      .type-btn-v2[data-type="expense"].active { color: var(--color-expense); }
      .type-btn-v2[data-type="income"].active { color: var(--color-income); }
      
      .chart-mode-toggle { display: flex; background: var(--bg-hover); padding: 4px; border-radius: 14px; gap: 4px; border: 1px solid var(--border-light); }
      .mode-btn { border:none; background:transparent; cursor:pointer; width: 38px; height: 38px; display: flex; align-items: center; justify-content: center; border-radius: 10px; font-size: 1.1rem; transition: all 0.2s; }
      .mode-btn.active { background: var(--bg-card); box-shadow: var(--shadow-sm); transform: scale(1.05); }

      .period-navigation-wrapper { display: flex; align-items: center; justify-content: center; gap: 8px; margin-bottom: 32px; }
      .period-nav-btn { width: 44px; height: 44px; border-radius: 50%; background: var(--bg-card); border: 1px solid var(--border-light); display: flex; align-items: center; justify-content: center; font-size: 1.8rem; color: var(--color-accent); cursor: pointer; transition: all 0.2s; box-shadow: var(--shadow-sm); border: none; }
      .period-nav-btn:hover { background: var(--color-accent-light); color: var(--color-accent); box-shadow: var(--shadow-md); }
      .period-nav-btn:active { transform: scale(0.9); }

      .premium-total-card { flex: 1; text-align: center; padding: 12px; }
      .total-label { font-size: 0.7rem; color: var(--text-muted); font-weight: 700; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 4px; }
      .total-value { font-size: 2.4rem; font-weight: 900; letter-spacing: -1.5px; line-height: 1.1; }
      .total-value.expense { color: var(--color-expense); }
      .total-value.income { color: var(--color-income); }

      .section-header { display: flex; align-items: center; gap: 10px; margin-bottom: 20px; }
      .section-header .dot { width: 6px; height: 6px; border-radius: 50%; background: var(--color-accent); }
      .section-header h4 { font-size: 1.1rem; font-weight: 900; color: var(--text-primary); margin:0; }

      .category-row-v2 { display: flex; align-items: center; gap: 16px; padding: 16px; background: var(--bg-card); border-radius: 20px; margin-bottom: 12px; border: 1px solid var(--border-light); cursor: pointer; transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1); box-shadow: var(--shadow-sm); }
      .category-row-v2:hover { transform: translateX(6px); border-color: var(--color-accent-light); box-shadow: var(--shadow-md); }
      .cat-icon { width: 44px; height: 44px; background: var(--bg-hover); border-radius: 14px; display: flex; align-items: center; justify-content: center; font-size: 1.4rem; }
      .cat-info { flex: 1; }
      .cat-top { display: flex; justify-content: space-between; margin-bottom: 8px; }
      .cat-name { font-size: 0.95rem; font-weight: 800; color: var(--text-primary); }
      .cat-amount { font-size: 0.95rem; font-weight: 800; font-variant-numeric: tabular-nums; }
      .cat-progress-bg { height: 6px; background: var(--bg-hover); border-radius: 3px; overflow: hidden; }
      .cat-progress-fill { height: 100%; border-radius: 3px; }
      .cat-progress-fill.expense { background: linear-gradient(90deg, var(--color-expense), #fb7185); }
      .cat-progress-fill.income { background: linear-gradient(90deg, var(--color-income), #34d399); }
      .cat-percent { font-size: 0.75rem; font-weight: 700; color: var(--text-muted); min-width: 35px; text-align: right; }

      .premium-card { background: var(--bg-card); box-shadow: var(--shadow-lg); transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); border: 1px solid var(--border-light); }
      .fadeIn { animation: fadeIn 0.4s ease-out forwards; }
      @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
    </style>
  `;
}

/**
 * 資産（BS）タブの内容描画
 */
function renderBSContent() {
  const accounts = store.getAccounts();
  const actualNetWorth = store.getTotalBalance();
  const positiveAccounts = accounts.filter(a => Number(a.balance) > 0).sort((a,b) => b.balance - a.balance);
  const negativeAccounts = accounts.filter(a => Number(a.balance) < 0).sort((a,b) => a.balance - b.balance);
  const totalAssets = positiveAccounts.reduce((sum, a) => sum + Number(a.balance), 0);
  const totalLiabilities = Math.abs(negativeAccounts.reduce((sum, a) => sum + Number(a.balance), 0));
  const bsTotal = Math.max(totalAssets, totalLiabilities);

  return `
    <div class="bs-content fadeIn">
      <div class="chart-card premium-card bs-wrapper-v2" style="margin-bottom: 24px; padding: 28px; border-radius: 32px; overflow: hidden; position: relative;">
        <div style="position: absolute; top: -100px; right: -100px; width: 300px; height: 300px; background: radial-gradient(circle, var(--color-accent-light) 0%, transparent 70%); z-index: 0; opacity: 0.3;"></div>

        <div style="position: relative; z-index: 1;">
          <div style="display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 32px; border-bottom: 1px solid var(--border-light); padding-bottom: 16px;">
            <div>
              <div style="font-size: 0.75rem; color: var(--text-muted); font-weight: 800; letter-spacing: 2px; text-transform: uppercase;">Assets & Liabilities</div>
              <h4 style="font-size: 1.5rem; font-weight: 900; margin: 0; background: linear-gradient(135deg, var(--text-primary), var(--text-secondary)); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">🏛️ 大局バランス</h4>
            </div>
            <div style="text-align: right;">
              <div style="font-size: 0.75rem; color: var(--text-secondary); font-weight: 700;">現在の純資産</div>
              <div style="font-size: 1.8rem; font-weight: 900; color: var(--color-accent); letter-spacing: -1px;">¥${actualNetWorth.toLocaleString()}</div>
            </div>
          </div>

          <div class="bs-block-container">
            <div class="bs-labels-top">
              <div class="bs-label-col"><span>資産</span><div class="bs-amount-badge">¥${bsTotal.toLocaleString()}</div></div>
              <div class="bs-label-col"><span>負債・純資産</span><div class="bs-amount-badge">¥${bsTotal.toLocaleString()}</div></div>
            </div>
            
            <div class="bs-chart-frame">
              <div style="height: 380px; position: relative;"><canvas id="bs-balance-chart"></canvas></div>
              <div class="bs-center-line"></div>
            </div>

            <div class="bs-labels-bottom">
              <div class="bs-label-hint">← 持ち物 (プラス)</div>
              <div class="bs-label-hint">(マイナス) 返すもの →</div>
            </div>
          </div>
        </div>
      </div>

      <div class="chart-card premium-card" style="padding: 24px; border-radius: 24px;">
        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px; gap: 12px;">
          <div>
            <h4 style="font-size: 1.1rem; font-weight: 800; margin: 0;">📈 推移グラフ</h4>
            <div style="font-size: 0.75rem; color: var(--text-muted);">口座別、または全体の推移</div>
          </div>
          <div style="display:flex; flex-direction:column; gap:8px; align-items:flex-end;">
            <select id="analysis-account-selector" class="premium-select">
              <option value="total">📊 全体（純資産）</option>
              ${accounts.map(a => `<option value="${a.id}" ${a.id === analysisState.selectedAccountId ? 'selected' : ''}>${a.icon} ${a.name}</option>`).join('')}
            </select>
            <select id="bs-period-selector" class="premium-select">
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
      .bs-wrapper-v2 { border: 1px solid var(--border-light); background: linear-gradient(180deg, var(--bg-card) 0%, var(--bg-primary) 100%); }
      .bs-labels-top { display: flex; justify-content: space-around; margin-bottom: 12px; }
      .bs-label-col { display: flex; flex-direction: column; align-items: center; gap: 4px; flex: 1; }
      .bs-label-col span { font-size: 0.85rem; font-weight: 900; color: var(--text-primary); }
      .bs-amount-badge { font-size: 0.75rem; font-weight: 800; background: var(--bg-hover); padding: 4px 12px; border-radius: 8px; color: var(--text-secondary); border: 1px solid var(--border-light); }
      .bs-chart-frame { position: relative; border-radius: 16px; overflow: hidden; background: var(--bg-card); border: 1px solid var(--border-light); }
      .bs-center-line { position: absolute; left: 50%; top: 0; bottom: 0; width: 1px; background: var(--border-light); z-index: 5; pointer-events: none; }
      .bs-labels-bottom { display: flex; justify-content: space-around; margin-top: 12px; }
      .bs-label-hint { font-size: 0.65rem; color: var(--text-muted); font-weight: 600; }
      .premium-select { font-size: 0.75rem; padding: 6px 12px; border-radius: 10px; border: 1px solid var(--border-color); background: var(--bg-hover); color: var(--text-primary); font-weight: 700; outline: none; transition: all 0.2s; }
      .premium-select:focus { border-color: var(--color-accent); }
    </style>
  `;
}

/**
 * カテゴリー別の合計を算出
 */
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

/**
 * イベントバインディング
 */
function bindEvents(container) {
  container.querySelectorAll('[data-action="setTab"]').forEach(b => b.onclick = (e) => { analysisState.tab = e.currentTarget.dataset.tab; render(container); });
  container.querySelectorAll('[data-action="setViewType"]').forEach(b => b.onclick = (e) => { analysisState.viewType = e.currentTarget.dataset.type; render(container); });
  
  container.querySelectorAll('[data-action="setPeriod"]').forEach(b => b.onclick = (e) => { 
    const val = e.currentTarget.dataset.val;
    if (val === 'custom') {
      showCustomPeriodModal(container);
    } else {
      analysisState.periodType = val; 
      analysisState.referenceDate = new Date(); // 期間選択肢をクリックしたときは今日にリセット
      render(container); 
    }
  });

  // 期間戻るボタン
  container.querySelectorAll('[data-action="prevPeriod"]').forEach(b => b.onclick = () => {
    const d = new Date(analysisState.referenceDate);
    if (analysisState.periodType === 'week') d.setDate(d.getDate() - 7);
    else if (analysisState.periodType === 'month') d.setMonth(d.getMonth() - 1);
    else if (analysisState.periodType === 'year') d.setFullYear(d.getFullYear() - 1);
    analysisState.referenceDate = d;
    render(container);
  });

  // 期間進むボタン
  container.querySelectorAll('[data-action="nextPeriod"]').forEach(b => b.onclick = () => {
    const d = new Date(analysisState.referenceDate);
    if (analysisState.periodType === 'week') d.setDate(d.getDate() + 7);
    else if (analysisState.periodType === 'month') d.setMonth(d.getMonth() + 1);
    else if (analysisState.periodType === 'year') d.setFullYear(d.getFullYear() + 1);
    analysisState.referenceDate = d;
    render(container);
  });
  
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
    analysisState.selectedAccountId = e.target.value === 'total' ? null : e.target.value;
    render(container); 
  };
}

/**
 * カスタム期間指定モーダル
 */
function showCustomPeriodModal(container) {
  const existing = document.getElementById('custom-period-modal');
  if (existing) existing.remove();

  const modal = document.createElement('div');
  modal.id = 'custom-period-modal';
  modal.className = 'premium-modal-overlay fadeIn';
  
  const now = new Date();
  const defaultStart = analysisState.customStart || new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
  const defaultEnd = analysisState.customEnd || now.toISOString().split('T')[0];

  modal.innerHTML = `
    <div class="premium-modal-content slideUp">
      <div class="modal-header">
        <h3>📅 期間を指定</h3>
        <button class="modal-close-btn">&times;</button>
      </div>
      <div class="modal-body">
        <div class="date-input-group">
          <label>開始日</label>
          <input type="date" id="modal-start-date" value="${defaultStart}">
        </div>
        <div class="date-input-group">
          <label>終了日</label>
          <input type="date" id="modal-end-date" value="${defaultEnd}">
        </div>
      </div>
      <div class="modal-footer">
        <button class="modal-apply-btn">この期間で表示</button>
      </div>
    </div>
    <style>
      .premium-modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0, 0, 0, 0.4); backdrop-filter: blur(8px); z-index: 2000; display: flex; align-items: center; justify-content: center; padding: 20px; }
      .premium-modal-content { background: var(--bg-card); width: 100%; max-width: 400px; border-radius: 28px; box-shadow: var(--shadow-xl); border: 1px solid var(--border-light); overflow: hidden; }
      .modal-header { padding: 20px 24px; border-bottom: 1px solid var(--border-light); display: flex; justify-content: space-between; align-items: center; }
      .modal-header h3 { font-size: 1.1rem; font-weight: 800; margin: 0; }
      .modal-close-btn { font-size: 1.8rem; line-height: 1; color: var(--text-muted); border: none; background: transparent; cursor: pointer; }
      .modal-body { padding: 24px; display: flex; flex-direction: column; gap: 20px; }
      .date-input-group { display: flex; flex-direction: column; gap: 8px; }
      .date-input-group label { font-size: 0.8rem; font-weight: 700; color: var(--text-secondary); }
      .date-input-group input { width: 100%; padding: 12px 16px; border-radius: 12px; border: 1px solid var(--border-color); background: var(--bg-hover); font-size: 1rem; font-weight: 700; color: var(--text-primary); outline: none; }
      .modal-footer { padding: 16px 24px 24px; }
      .modal-apply-btn { width: 100%; padding: 14px; border-radius: 14px; background: var(--color-accent); color: white; border:none; font-weight: 800; font-size: 1rem; box-shadow: 0 4px 12px var(--color-accent-light); transition: all 0.2s; cursor: pointer; }
      .modal-apply-btn:active { transform: scale(0.97); }
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
 * 収支タブ：円グラフ描画
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
        borderWidth: 0, spacing: 5, hoverOffset: 20
      }] 
    }, 
    options: { 
      responsive: true, maintainAspectRatio: false,
      plugins: { 
        legend: { display: false },
        tooltip: {
          backgroundColor: 'rgba(15, 15, 26, 0.95)',
          padding: 16, borderRadius: 16,
          titleFont: { size: 14, weight: 'bold' }, bodyFont: { size: 14 },
          callbacks: { label: (ctx) => ` ¥${ctx.raw.toLocaleString()} (${((ctx.raw/totalAmount)*100).toFixed(1)}%)` }
        }
      }, 
      cutout: '75%' 
    },
    plugins: [{
      id: 'centerText',
      afterDraw: (chart) => {
        const { ctx, width, height } = chart;
        ctx.save();
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.font = 'bold 0.8rem sans-serif'; ctx.fillStyle = '#9ca3b8';
        ctx.fillText('合計金額', width / 2, height / 2 - 15);
        ctx.font = 'bold 1.3rem sans-serif'; ctx.fillStyle = analysisState.viewType === 'expense' ? '#f43f5e' : '#10b981';
        ctx.fillText('¥' + totalAmount.toLocaleString(), width / 2, height / 2 + 10);
        ctx.restore();
      }
    }]
  });
}

/**
 * 収支タブ：推移折れ線グラフ描画
 */
function renderPLLineChart(txs, start, end) {
  const ctx = document.getElementById('analysis-chart')?.getContext('2d');
  if (!ctx) return;
  if (plChart) plChart.destroy();
  const days = {};
  let current = new Date(start);
  const finish = new Date(end);
  while (current <= finish) { days[current.toISOString().split('T')[0]] = 0; current.setDate(current.getDate() + 1); }
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
        pointRadius: 0, pointHoverRadius: 6, fill: true, 
        backgroundColor: (context) => {
          const {ctx, chartArea} = context.chart;
          if (!chartArea) return null;
          const gradient = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
          gradient.addColorStop(0, color + '33'); gradient.addColorStop(1, color + '00');
          return gradient;
        }
      }] 
    }, 
    options: { 
      responsive: true, maintainAspectRatio: false,
      plugins: { 
        legend: { display: false },
        tooltip: { backgroundColor: 'rgba(15, 15, 26, 0.95)', padding: 12, cornerRadius: 12, callbacks: { label: (ctx) => ` ¥${ctx.raw.toLocaleString()}` } }
      },
      scales: { 
        x: { grid: { display: false }, ticks: { font: { size: 9 }, maxTicksLimit: 7 } }, 
        y: { beginAtZero: true, grid: { color: 'rgba(0,0,0,0.03)' }, ticks: { font: { size: 9 } } } 
      } 
    } 
  });
}

/**
 * 資産タブ：構成ブロックグラフ描画
 */
function renderBSBalanceChart(accounts) {
  const ctx = document.getElementById('bs-balance-chart')?.getContext('2d');
  if (!ctx || !bsBalanceChart) { if (bsBalanceChart) bsBalanceChart.destroy(); }
  if (!ctx) return;

  const actualNetWorth = store.getTotalBalance();
  const positiveAccounts = accounts.filter(a => Number(a.balance) > 0).sort((a,b) => b.balance - a.balance);
  const negativeAccounts = accounts.filter(a => Number(a.balance) < 0).sort((a,b) => a.balance - b.balance);
  const assetColors = ['#4f46e5', '#6366f1', '#818cf8', '#a5b4fc', '#c7d2fe'];
  const liabilityColors = ['#e11d48', '#f43f5e', '#fb7185', '#fda4af', '#fecdd3'];
  const datasets = [];

  positiveAccounts.forEach((acc, i) => { datasets.push({ label: acc.name, data: [acc.balance, 0], backgroundColor: assetColors[i % assetColors.length], stack: 'bs', borderSkipped: false }); });
  if (actualNetWorth > 0) datasets.push({ label: '純資産', data: [0, actualNetWorth], backgroundColor: '#10b981', stack: 'bs', borderSkipped: false });
  negativeAccounts.forEach((acc, i) => { datasets.push({ label: acc.name, data: [0, Math.abs(acc.balance)], backgroundColor: liabilityColors[i % liabilityColors.length], stack: 'bs', borderSkipped: false }); });
  if (actualNetWorth < 0) datasets.push({ label: '純資産欠損', data: [Math.abs(actualNetWorth), 0], backgroundColor: 'rgba(100, 116, 139, 0.2)', stack: 'bs' });

  bsBalanceChart = new Chart(ctx, {
    type: 'bar',
    data: { labels: ['資産', '負債・純資産'], datasets: datasets },
    options: {
      responsive: true, maintainAspectRatio: false, categoryPercentage: 1.0, barPercentage: 1.0,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: 'rgba(15, 15, 26, 0.95)', padding: 16, cornerRadius: 16,
          callbacks: { label: (ctx) => ctx.raw !== 0 ? ` ${ctx.dataset.label}: ¥${ctx.raw.toLocaleString()}` : null }
        }
      },
      scales: { x: { stacked: true, display: false }, y: { stacked: true, display: false, beginAtZero: true } },
      animation: { duration: 1200, easing: 'easeOutQuart' }
    }
  });
}

/**
 * 資産タブ：純資産推移折れ線グラフ描画
 */
function renderTotalAssetChart(history) {
  const ctx = document.getElementById('total-asset-chart')?.getContext('2d');
  if (!ctx || totalAssetChart) totalAssetChart?.destroy();
  if (!ctx) return;

  let data = [];
  let label = '純資産';
  let color = '#6366f1';

  if (analysisState.selectedAccountId) {
    const acc = store.getAccounts().find(a => a.id === analysisState.selectedAccountId);
    if (acc) {
      const accHistory = store.getAccountHistory(acc.name, analysisState.bsPeriod);
      data = accHistory.map(h => h.balance); label = acc.name;
      color = Number(acc.balance) < 0 ? '#f43f5e' : '#10b981';
    }
  } else { data = history.map(h => h.total); }

  totalAssetChart = new Chart(ctx, { 
    type: 'line', 
    data: { 
      labels: history.map(h => h.date.split('-').slice(1).join('/')), 
      datasets: [{ 
        label: label, data: data, borderColor: color, borderWidth: 4, tension: 0.4, 
        pointRadius: 0, pointHoverRadius: 6, fill: true, 
        backgroundColor: (context) => {
          const {ctx, chartArea} = context.chart;
          if (!chartArea) return null;
          const gradient = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
          gradient.addColorStop(0, color + '33'); gradient.addColorStop(1, color + '00');
          return gradient;
        }
      }] 
    }, 
    options: { 
      responsive: true, maintainAspectRatio: false,
      plugins: { 
        legend: { display: false },
        tooltip: {
          backgroundColor: 'rgba(15, 15, 26, 0.95)', padding: 16, cornerRadius: 16,
          titleFont: { size: 13, weight: 'bold' }, bodyFont: { size: 14, weight: '900' },
          callbacks: { label: (ctx) => ` ¥${ctx.raw.toLocaleString()}` }
        }
      }, 
      scales: { 
        x: { grid: { display: false }, ticks: { font: { size: 9 }, maxTicksLimit: 6 } }, 
        y: { grid: { color: 'rgba(0,0,0,0.03)' }, ticks: { font: { size: 9 }, maxTicksLimit: 5, callback: val => '¥' + (val/10000) + '万' } } 
      }
    } 
  });
}
