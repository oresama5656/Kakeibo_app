/**
 * 分析画面 (v7.0 - モジュール化・コンポーネント分割版)
 */

import * as store from '../store.js';
import { setHistoryFilters } from './history.js';
import * as PeriodManager from '../components/analysis/PeriodManager.js';
import * as ChartManager from '../components/analysis/ChartManager.js';
import * as UIHelper from '../components/analysis/UIHelper.js';

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
  excludedCategoryIds: [],
};

export function render(container) {
  if (!container) return;
  const { start, end } = PeriodManager.getPeriodDates(analysisState);
  const contentHtml = analysisState.tab === 'pl' 
    ? UIHelper.renderPLContent(analysisState, start, end) 
    : UIHelper.renderBSContent(analysisState);
  
  container.innerHTML = `
    <div class="analysis-screen premium-mode fadeIn">
      <div class="analysis-main-nav-container">
        <div class="analysis-segmented-control main-nav" role="tablist">
          <button class="segmented-item ${analysisState.tab === 'pl' ? 'active' : ''}" 
                  data-tab="pl" data-action="setTab" 
                  aria-label="収支分析を表示" 
                  aria-selected="${analysisState.tab === 'pl' ? 'true' : 'false'}" 
                  role="tab">📊 収支</button>
          <button class="segmented-item ${analysisState.tab === 'bs' ? 'active' : ''}" 
                  data-tab="bs" data-action="setTab" 
                  aria-label="資産分析を表示" 
                  aria-selected="${analysisState.tab === 'bs' ? 'true' : 'false'}" 
                  role="tab">💎 資産</button>
        </div>
      </div>
      <div class="analysis-body">${contentHtml}</div>
    </div>
  `;

  bindEvents(container);

  setTimeout(() => {
    if (analysisState.tab === 'pl') {
      const txs = store.getTransactions().filter(tx => tx.type === analysisState.viewType && tx.date >= start && tx.date <= end);
      const totals = UIHelper.calculateCategoryTotals(txs);
      const activeSorted = Object.values(totals)
        .filter(c => !analysisState.excludedCategoryIds.includes(c.id))
        .sort((a,b) => b.total - a.total);
        
      if (analysisState.chartMode === 'pie') ChartManager.renderPieChart(activeSorted);
      else ChartManager.renderPLLineChart(txs, start, end, analysisState.viewType, analysisState.excludedCategoryIds);
    } else {
      const accounts = store.getAccounts();
      ChartManager.renderBSBalanceChart(accounts);
      const historyTotal = store.getAssetHistory(analysisState.bsPeriod);
      ChartManager.renderTotalAssetChart(historyTotal, analysisState.selectedAccountId, analysisState.bsPeriod);
    }
  }, 100);
}

function bindEvents(container) {
  const refresh = () => render(container);

  container.querySelectorAll('[data-action="setTab"]').forEach(b => b.onclick = (e) => { analysisState.tab = e.currentTarget.dataset.tab; refresh(); });
  container.querySelectorAll('[data-action="setViewType"]').forEach(b => b.onclick = (e) => { analysisState.viewType = e.currentTarget.dataset.type; refresh(); });
  container.querySelectorAll('[data-action="setPeriod"]').forEach(b => b.onclick = (e) => { 
    const val = e.currentTarget.dataset.val;
    if (val === 'custom') showCustomPeriodModal(container);
    else { analysisState.periodType = val; analysisState.referenceDate = new Date(); refresh(); }
  });
  
  container.querySelectorAll('[data-action="prevPeriod"]').forEach(b => b.onclick = () => { updateRefDate(-1); refresh(); });
  container.querySelectorAll('[data-action="nextPeriod"]').forEach(b => b.onclick = () => { updateRefDate(1); refresh(); });
  container.querySelectorAll('[data-action="setChartMode"]').forEach(b => b.onclick = (e) => { analysisState.chartMode = e.currentTarget.dataset.val; refresh(); });
  
  container.querySelectorAll('[data-action="drillDown"]').forEach(row => { row.onclick = (e) => {
    if (e.target.closest('.cat-check-v2')) return;
    const { start, end } = PeriodManager.getPeriodDates(analysisState);
    setHistoryFilters({ startDate: start, endDate: end, accountId: '', categoryId: row.dataset.categoryId });
    window.navigateTo?.('history');
  }; });
  
  container.querySelectorAll('.cat-checkbox').forEach(cb => cb.onchange = (e) => {
    const id = e.target.dataset.id;
    if (e.target.checked) analysisState.excludedCategoryIds = analysisState.excludedCategoryIds.filter(cid => cid !== id);
    else if (!analysisState.excludedCategoryIds.includes(id)) analysisState.excludedCategoryIds.push(id);
    refresh();
  });

  const allCheck = container.querySelector('#cat-all-check');
  if (allCheck) {
    allCheck.onchange = (e) => {
      if (e.target.checked) {
        analysisState.excludedCategoryIds = [];
      } else {
        const { start, end } = PeriodManager.getPeriodDates(analysisState);
        const txs = store.getTransactions().filter(tx => tx.type === analysisState.viewType && tx.date >= start && tx.date <= end);
        const totals = UIHelper.calculateCategoryTotals(txs);
        analysisState.excludedCategoryIds = Object.keys(totals);
      }
      refresh();
    };
  }

  const bsSel = container.querySelector('#bs-period-selector');
  if (bsSel) bsSel.onchange = e => { analysisState.bsPeriod = Number(e.target.value); refresh(); };
  const accSel = container.querySelector('#analysis-account-selector');
  if (accSel) accSel.onchange = e => { analysisState.selectedAccountId = e.target.value === 'total' ? null : e.target.value; refresh(); };
}

function updateRefDate(dir) {
  const d = new Date(analysisState.referenceDate);
  if (analysisState.periodType === 'week') d.setDate(d.getDate() + (dir * 7));
  else if (analysisState.periodType === 'month') d.setMonth(d.getMonth() + dir);
  else if (analysisState.periodType === 'year') d.setFullYear(d.getFullYear() + dir);
  analysisState.referenceDate = d;
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
    <div class="premium-modal-sheet slideUp">
      <div class="modal-drag-handle"></div>
      <div class="modal-header-v3">
        <h3 class="modal-title-v3">📅 期間を指定</h3>
        <button class="modal-close-v3" data-action="closeModal">&times;</button>
      </div>
      <div class="modal-body-v3">
        <div class="date-row-v3">
          <div class="date-field-v3">
            <label>開始日</label>
            <input type="date" id="modal-start-date" value="${ds}">
          </div>
          <div class="date-arrow-v3">→</div>
          <div class="date-field-v3">
            <label>終了日</label>
            <input type="date" id="modal-end-date" value="${de}">
          </div>
        </div>
      </div>
      <div class="modal-footer-v3">
        <button class="modal-apply-btn-v3">この期間で表示</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);

  // イベントハンドリング
  const close = () => {
    const sheet = modal.querySelector('.premium-modal-sheet');
    sheet.style.transform = 'translateY(100%)';
    modal.style.opacity = '0';
    setTimeout(() => modal.remove(), 300);
  };

  modal.addEventListener('click', (e) => {
    if (e.target === modal || e.target.closest('[data-action="closeModal"]')) {
      close();
    }
  });

  modal.querySelector('.modal-apply-btn-v3').onclick = () => {
    const startVal = document.getElementById('modal-start-date').value;
    const endVal = document.getElementById('modal-end-date').value;
    
    if (startVal && endVal) {
      analysisState.customStart = startVal;
      analysisState.customEnd = endVal;
      analysisState.periodType = 'custom';
      close();
      render(container);
    } else {
      window.showToast?.('日付を入力してください', 'error');
    }
  };
}
