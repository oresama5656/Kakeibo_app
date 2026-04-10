/**
 * 分析画面のUIテンプレート生成
 */
import * as store from '../../store.js';

export function calculateCategoryTotals(txs) {
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

export function renderPLContent(state, start, end) {
  const txs = store.getTransactions().filter(tx => tx.type === state.viewType && tx.date >= start && tx.date <= end);
  const totals = calculateCategoryTotals(txs);
  
  const grandTotal = Object.values(totals)
    .filter(c => !state.excludedCategoryIds.includes(c.id))
    .reduce((sum, c) => sum + c.total, 0);
    
  const sorted = Object.values(totals).sort((a,b) => b.total - a.total);

  return `
    <div class="pl-content fadeIn">
      <div class="period-filter-strip">
        <button class="filter-chip-v2 ${state.periodType === 'week' ? 'active' : ''}" data-action="setPeriod" data-val="week">📅 週</button>
        <button class="filter-chip-v2 ${state.periodType === 'month' ? 'active' : ''}" data-action="setPeriod" data-val="month">🗓️ 月</button>
        <button class="filter-chip-v2 ${state.periodType === 'year' ? 'active' : ''}" data-action="setPeriod" data-val="year">📊 年</button>
        <button class="filter-chip-v2 ${state.periodType === 'custom' ? 'active' : ''}" data-action="setPeriod" data-val="custom">🔍 指定</button>
      </div>

      <div class="analysis-controls-row">
        <div class="type-toggle-v2">
          <button class="type-btn-v2 ${state.viewType === 'expense' ? 'active' : ''}" data-type="expense" data-action="setViewType">支出</button>
          <button class="type-btn-v2 ${state.viewType === 'income' ? 'active' : ''}" data-type="income" data-action="setViewType">収入</button>
        </div>
        <div class="chart-mode-toggle">
          <button class="mode-btn ${state.chartMode === 'pie' ? 'active' : ''}" data-action="setChartMode" data-val="pie">⭕</button>
          <button class="mode-btn ${state.chartMode === 'line' ? 'active' : ''}" data-action="setChartMode" data-val="line">📈</button>
        </div>
      </div>

      <div class="period-navigation-wrapper">
        <button class="period-nav-btn" data-action="prevPeriod">‹</button>
        <div class="total-summary-card">
          <div style="font-size: 0.75rem; color: var(--text-muted); font-weight: 700;">${start} 〜 ${end}</div>
          <div class="total-amount ${state.viewType}">¥${grandTotal.toLocaleString()}</div>
        </div>
        <button class="period-nav-btn" data-action="nextPeriod">›</button>
      </div>

      <div class="premium-card chart-container">
        <canvas id="analysis-chart" style="height: 280px;"></canvas>
      </div>

      <div style="display: flex; justify-content: space-between; align-items: center; margin: 20px 10px 10px 10px;">
        <div style="font-size: 0.85rem; font-weight: 800; color: var(--text-muted); display: flex; align-items: center; gap: 6px;">📂 カテゴリー内訳</div>
        <div style="display: flex; align-items: center; gap: 6px; font-size: 0.8rem; font-weight: 700; background: var(--bg-hover); padding: 4px 10px; border-radius: 10px;">
          <input type="checkbox" id="cat-all-check" ${state.excludedCategoryIds.length === 0 ? 'checked' : ''} style="width: 16px; height: 16px; cursor: pointer;">
          <label for="cat-all-check" style="cursor: pointer; color: var(--text-primary);">すべて表示</label>
        </div>
      </div>

      <div class="category-list">
        ${sorted.map(c => {
          const isExcluded = state.excludedCategoryIds.includes(c.id);
          return `
            <div class="category-item-v2 ${isExcluded ? 'excluded' : ''}" data-id="${c.id}">
              <div class="cat-check-v2">
                <input type="checkbox" class="cat-checkbox" data-id="${c.id}" ${isExcluded ? '' : 'checked'}>
              </div>
              <div class="cat-clickable-v2" data-action="drillDown" data-category-id="${c.id}">
                <div class="cat-icon-v2">${c.icon}</div>
                <div class="cat-details-v2">
                  <div class="cat-top-v2">
                    <span class="cat-name">${c.name}</span>
                    <span class="cat-money">¥${c.total.toLocaleString()}</span>
                  </div>
                  <div class="cat-bar-bg-v2"><div class="cat-bar-v2 ${state.viewType}" style="width: ${grandTotal > 0 && !isExcluded ? (c.total/grandTotal)*100 : 0}%"></div></div>
                </div>
                <div class="cat-pct-v2">${grandTotal > 0 && !isExcluded ? ((c.total/grandTotal)*100).toFixed(0) : 0}%</div>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    </div>
  `;
}

export function renderBSContent(state) {
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
              ${accounts.map(a => `<option value="${a.id}" ${a.id === state.selectedAccountId ? 'selected' : ''}>${a.name}</option>`).join('')}
            </select>
            <select id="bs-period-selector" class="select-v2">
              <option value="30" ${state.bsPeriod === 30 ? 'selected' : ''}>30日</option>
              <option value="90" ${state.bsPeriod === 90 ? 'selected' : ''}>90日</option>
              <option value="365" ${state.bsPeriod === 365 ? 'selected' : ''}>1年</option>
            </select>
          </div>
        </div>
        <div style="height: 240px;"><canvas id="total-asset-chart"></canvas></div>
      </div>
    </div>
  `;
}
