// ============================================
// 分析画面 (v5.3 - 正確なBS算出・負債反映版)
// ============================================

import * as store from '../store.js';

let pieChart = null;
let totalAssetChart = null;

let analysisState = {
  tab: 'pl', 
  viewType: 'expense', 
  periodType: 'month', 
  customStart: '',
  customEnd: '',
  chartMode: 'pie', 
  bsPeriod: 90,
};

function getPeriodDates() {
  const now = new Date();
  let start, end;
  switch (analysisState.periodType) {
    case 'day': start = new Date(now); start.setHours(0,0,0,0); end = new Date(now); end.setHours(23,59,59,999); break;
    case 'week': start = new Date(now); start.setDate(start.getDate() - start.getDay()); start.setHours(0,0,0,0); end = new Date(now); break;
    case 'month': start = new Date(now.getFullYear(), now.getMonth(), 1); end = new Date(now); break;
    case 'custom': start = analysisState.customStart ? new Date(analysisState.customStart) : new Date(now.getFullYear(), now.getMonth(), 1); end = analysisState.customEnd ? new Date(analysisState.customEnd + 'T23:59:59') : new Date(now); break;
    default: start = new Date(now.getFullYear(), now.getMonth(), 1); end = new Date(now);
  }
  return { start: start.toISOString().split('T')[0], end: end.toISOString().split('T')[0] };
}

export function render(container) {
  if (!container) return;
  const contentHtml = analysisState.tab === 'pl' ? renderPLContent() : renderBSContent();
  
  container.innerHTML = `
    <div class="analysis-screen simple-mode">
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
      const transactions = store.getTransactions().filter(tx => tx.type === analysisState.viewType && tx.date >= start && tx.date <= end);
      const categoryTotals = calculateCategoryTotals(transactions);
      const sorted = Object.values(categoryTotals).sort((a,b) => b.total - a.total);
      if (sorted.length > 0) renderPieChart(sorted);
    } else {
      const history = store.getAssetHistory(analysisState.bsPeriod);
      if (history.length > 0) renderTotalAssetChart(history);
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
      <div class="type-toggle" style="margin-bottom: 20px;">
        <button class="type-btn ${analysisState.viewType === 'expense' ? 'active' : ''}" data-type="expense" data-action="setViewType" style="${analysisState.viewType === 'expense' ? 'background: var(--color-expense); color:white;' : 'color: var(--color-expense);'}">支出</button>
        <button class="type-btn ${analysisState.viewType === 'income' ? 'active' : ''}" data-type="income" data-action="setViewType" style="${analysisState.viewType === 'income' ? 'background: var(--color-income); color:white;' : 'color: var(--color-income);'}">収入</button>
      </div>
      <div class="simple-summary" style="text-align: center; margin: 32px 0;">
        <div style="font-size: 0.9rem; color: var(--text-secondary); margin-bottom: 4px;">期間合計</div>
        <div style="font-size: 2.2rem; font-weight: 800; color: ${analysisState.viewType === 'expense' ? 'var(--color-expense)' : 'var(--color-income)'};">¥${grandTotal.toLocaleString()}</div>
      </div>
      <div class="chart-card">
        <div class="chart-container" style="height: 250px;"><canvas id="analysis-chart"></canvas></div>
      </div>
      <div style="margin-top: 24px;">
        ${sorted.map(c => `
          <div style="display: flex; align-items: center; gap: 12px; padding: 14px; background: var(--bg-card); border-radius: 16px; margin-bottom: 10px; border: 1px solid var(--border-light); box-shadow: var(--shadow-sm);">
            <span style="font-size: 1.4rem;">${c.icon}</span>
            <div style="flex: 1;">
              <div style="display: flex; justify-content: space-between; font-size: 0.9rem; font-weight: 800;">
                <span>${c.name}</span>
                <span>¥${c.total.toLocaleString()}</span>
              </div>
              <div style="height: 6px; background: var(--bg-hover); border-radius: 3px; margin-top: 8px; overflow: hidden;">
                <div style="height: 100%; width: ${(c.total/grandTotal)*100}%; background: ${analysisState.viewType === 'expense' ? 'var(--color-expense)' : 'var(--color-income)'};"></div>
              </div>
            </div>
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

function renderBSContent() {
  const accounts = store.getAccounts();
  const actualNetWorth = store.getTotalBalance(); // 純資産
  
  // 資産（プラス）と負債（マイナス）を分離
  const positiveAccounts = accounts.filter(a => Number(a.balance) > 0).sort((a,b) => b.balance - a.balance);
  const negativeAccounts = accounts.filter(a => Number(a.balance) < 0).sort((a,b) => a.balance - b.balance);
  
  const totalAssets = positiveAccounts.reduce((sum, a) => sum + Number(a.balance), 0);
  const totalLiabilities = Math.abs(negativeAccounts.reduce((sum, a) => sum + Number(a.balance), 0));
  
  // 描画用の最大値を計算（資産の総量か、負債+純資産の総量の大きい方）
  const maxHeight = Math.max(totalAssets, totalLiabilities + Math.max(actualNetWorth, 0), 1);

  return `
    <div class="bs-content">
      <!-- 概要サマリー -->
      <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; margin: 16px 0 32px;">
        <div style="text-align: center; padding: 12px; background: var(--bg-card); border-radius: 16px; border: 1px solid var(--border-light);">
          <div style="font-size: 10px; color: var(--text-muted); margin-bottom: 4px;">総資産</div>
          <div style="font-size: 0.9rem; font-weight: 800; color: #4f46e5;">¥${totalAssets.toLocaleString()}</div>
        </div>
        <div style="text-align: center; padding: 12px; background: var(--bg-card); border-radius: 16px; border: 1px solid var(--border-light);">
          <div style="font-size: 10px; color: var(--text-muted); margin-bottom: 4px;">負債</div>
          <div style="font-size: 0.9rem; font-weight: 800; color: #f43f5e;">¥${totalLiabilities.toLocaleString()}</div>
        </div>
        <div style="text-align: center; padding: 12px; background: var(--color-accent); border-radius: 16px; color: white; box-shadow: var(--shadow-sm);">
          <div style="font-size: 10px; opacity: 0.9; margin-bottom: 4px;">純資産</div>
          <div style="font-size: 0.9rem; font-weight: 800;">¥${actualNetWorth.toLocaleString()}</div>
        </div>
      </div>

      <!-- BSチャート (バランスシート視覚化) -->
      <div class="chart-card" style="padding: 24px; margin-bottom: 24px;">
        <h4 style="font-size: 0.8rem; text-align: center; margin-bottom: 24px; color: var(--text-secondary);">資産・負債バランス（貸借対照表）</h4>
        <div style="display: flex; gap: 20px; height: 300px; align-items: flex-end;">
          <!-- 左側: 資産 -->
          <div style="flex: 1; height: 100%; display: flex; flex-direction: column; justify-content: flex-end; gap: 2px;">
            <div style="text-align: center; font-size: 10px; font-weight: 800; margin-bottom: 8px; color: #4f46e5;">[ 資産 ]</div>
            ${positiveAccounts.map(acc => {
              const h = (acc.balance / maxHeight) * 100;
              return `<div style="height: ${h}%; background: #4f46e5; border-radius: 6px; display: flex; flex-direction: column; align-items: center; justify-content: center; color: white; font-size: 9px; font-weight: 800; padding: 4px; overflow: hidden; min-height: ${h > 5 ? '20px' : '2px'};">
                ${h > 15 ? `<span>${acc.name}</span>` : ''}
              </div>`;
            }).join('')}
            ${totalAssets === 0 ? '<div style="flex:1; background: var(--bg-hover); border-radius: 6px;"></div>' : ''}
          </div>

          <!-- 右側: 負債 + 純資産 -->
          <div style="flex: 1; height: 100%; display: flex; flex-direction: column; justify-content: flex-end; gap: 2px;">
            <div style="text-align: center; font-size: 10px; font-weight: 800; margin-bottom: 8px; color: var(--text-secondary);">[ 負債・純資産 ]</div>
            ${actualNetWorth > 0 ? `<div style="height: ${(actualNetWorth / maxHeight) * 100}%; background: var(--color-accent); border-radius: 6px; display: flex; align-items: center; justify-content: center; color: white; font-size: 9px; font-weight: 800; margin-bottom: 2px;">純資産</div>` : ''}
            ${negativeAccounts.map(acc => {
              const h = (Math.abs(acc.balance) / maxHeight) * 100;
              return `<div style="height: ${h}%; background: #f43f5e; border-radius: 6px; display: flex; flex-direction: column; align-items: center; justify-content: center; color: white; font-size: 9px; font-weight: 800; padding: 4px; overflow: hidden; min-height: ${h > 5 ? '20px' : '2px'};">
                ${h > 15 ? `<span>${acc.name}</span>` : ''}
              </div>`;
            }).join('')}
          </div>
        </div>
      </div>

      <!-- 履歴推移 -->
      <div class="chart-card" style="padding: 20px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
          <span style="font-size: 0.85rem; font-weight: 800;">純資産の推移</span>
          <select id="bs-period-selector" style="font-size: 11px; padding: 4px 8px; border-radius: 8px; border: 1px solid var(--border-color); background: var(--bg-card); color: var(--text-primary);">
            <option value="30" ${analysisState.bsPeriod === 30 ? 'selected' : ''}>1ヶ月</option>
            <option value="90" ${analysisState.bsPeriod === 90 ? 'selected' : ''}>3ヶ月</option>
            <option value="180" ${analysisState.bsPeriod === 180 ? 'selected' : ''}>6ヶ月</option>
          </select>
        </div>
        <div style="height: 200px;"><canvas id="total-asset-chart"></canvas></div>
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

function bindEvents(container) {
  container.querySelectorAll('[data-action="setTab"]').forEach(b => b.onclick = (e) => { analysisState.tab = e.currentTarget.dataset.tab; render(container); });
  container.querySelectorAll('[data-action="setViewType"]').forEach(b => b.onclick = (e) => { analysisState.viewType = e.currentTarget.dataset.type; render(container); });
  const bsSel = container.querySelector('#bs-period-selector');
  if (bsSel) bsSel.onchange = e => { analysisState.bsPeriod = Number(e.target.value); render(container); };
}

function renderPieChart(sorted) {
  const ctx = document.getElementById('analysis-chart')?.getContext('2d');
  if (!ctx) return;
  if (pieChart) pieChart.destroy();
  pieChart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: sorted.map(c => c.name),
      datasets: [{ data: sorted.map(c => c.total), backgroundColor: ['#6366f1', '#f43f5e', '#10b981', '#f59e0b', '#3b82f6', '#8b5cf6'], borderWidth: 0 }]
    },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, cutout: '70%' }
  });
}

function renderTotalAssetChart(history) {
  const ctx = document.getElementById('total-asset-chart')?.getContext('2d');
  if (!ctx) return;
  if (totalAssetChart) totalAssetChart.destroy();
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  totalAssetChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: history.map(h => h.date.split('-').slice(1).join('/')),
      datasets: [{
        label: '純資産',
        data: history.map(h => h.total),
        borderColor: '#6366f1', borderWidth: 3, tension: 0.4, pointRadius: 0, fill: true,
        backgroundColor: 'rgba(99, 102, 241, 0.1)'
      }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { grid: { display: false }, ticks: { display: false } },
        y: { grid: { color: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }, ticks: { font: { size: 9 }, callback: v => '¥' + v.toLocaleString() } }
      }
    }
  });
}
