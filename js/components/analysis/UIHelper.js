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
      const c = cats.find(cat => cat.id === cid) || cats.find(cat => cat.id === 'cat_98');
      totals[cid] = { id: cid, name: c?.name || tx.category || 'その他', icon: c?.icon || '📂', total: 0 };
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

  // 安全なエスケープ処理
  const escape = (str) => store.escapeHTML(str);

  return `
    <div class="pl-content fadeIn">
      <!-- Summary Master Card (深縹) -->
      <div class="total-summary-card">
        <div style="font-size: 0.75rem; opacity: 0.8; font-weight: 600; letter-spacing: 1px;">
          ${escape(start.replace(/-/g, '.'))} — ${escape(end.replace(/-/g, '.'))}
        </div>
        <div class="total-amount ${state.viewType}">¥${grandTotal.toLocaleString()}</div>
        <div style="font-size: 0.7rem; opacity: 0.7; font-weight: 600;">現在の${state.viewType === 'expense' ? '支出' : '収入'}合計</div>
      </div>

      <!-- Segmented Control (iOS Style) - Period -->
      <div class="analysis-segmented-control" role="tablist">
        <button class="segmented-item ${state.periodType === 'week' ? 'active' : ''}" data-action="setPeriod" data-val="week" role="tab" ${state.periodType === 'week' ? 'aria-selected="true"' : ''} type="button">週</button>
        <button class="segmented-item ${state.periodType === 'month' ? 'active' : ''}" data-action="setPeriod" data-val="month" role="tab" ${state.periodType === 'month' ? 'aria-selected="true"' : ''} type="button">月</button>
        <button class="segmented-item ${state.periodType === 'year' ? 'active' : ''}" data-action="setPeriod" data-val="year" role="tab" ${state.periodType === 'year' ? 'aria-selected="true"' : ''} type="button">年</button>
        <button class="segmented-item ${state.periodType === 'custom' ? 'active' : ''}" data-action="setPeriod" data-val="custom" role="tab" ${state.periodType === 'custom' ? 'aria-selected="true"' : ''} type="button">指定</button>
      </div>

      <!-- Segmented Control (iOS Style) - Type -->
      <div class="analysis-segmented-control" role="tablist">
        <button class="segmented-item ${state.viewType === 'expense' ? 'active' : ''}" data-type="expense" data-action="setViewType" role="tab" ${state.viewType === 'expense' ? 'aria-selected="true"' : ''} type="button">支出</button>
        <button class="segmented-item ${state.viewType === 'income' ? 'active' : ''}" data-type="income" data-action="setViewType" role="tab" ${state.viewType === 'income' ? 'aria-selected="true"' : ''} type="button">収入</button>
        <div style="width: 20px;"></div>
        <button class="segmented-item ${state.chartMode === 'pie' ? 'active' : ''}" data-action="setChartMode" data-val="pie" role="tab" ${state.chartMode === 'pie' ? 'aria-selected="true"' : ''} type="button">ドーナツ</button>
        <button class="segmented-item ${state.chartMode === 'line' ? 'active' : ''}" data-action="setChartMode" data-val="line" role="tab" ${state.chartMode === 'line' ? 'aria-selected="true"' : ''} type="button">推移</button>
      </div>

      <!-- Period Navigation -->
      <div class="period-nav-strip">
        <button class="nav-round-btn" data-action="prevPeriod" type="button">‹</button>
        <div class="period-display">${escape(store.formatDateLabel(start))} — ${escape(store.formatDateLabel(end))}</div>
        <button class="nav-round-btn" data-action="nextPeriod" type="button">›</button>
      </div>

      <!-- Chart Card -->
      <div class="premium-card-v3">
        <canvas id="analysis-chart" style="height: 280px;"></canvas>
      </div>

      <!-- Category List Title -->
      <div style="display: flex; justify-content: space-between; align-items: center; margin: 10px var(--space-md);">
        <h4 style="font-size: 0.9rem; font-weight: 800; color: #1a2a4d; margin: 0;">カテゴリー別内訳</h4>
        <div style="display: flex; align-items: center; gap: 6px; font-size: 0.7rem; font-weight: 700;">
          <input type="checkbox" id="cat-all-check" ${state.excludedCategoryIds.length === 0 ? 'checked' : ''} style="width: 14px; height: 14px; cursor: pointer;">
          <label for="cat-all-check" style="cursor: pointer; color: var(--text-muted);">全表示</label>
        </div>
      </div>

      <!-- Category List Card -->
      <div class="premium-card-v3">
        ${sorted.length === 0 ? '<div style="text-align:center; color:var(--text-muted); font-size:0.8rem;">データがありません</div>' : 
          sorted.map(c => {
            const isExcluded = state.excludedCategoryIds.includes(c.id);
            const pct = grandTotal > 0 && !isExcluded ? (c.total/grandTotal)*100 : 0;
            return `
              <div class="category-item-v3 ${isExcluded ? 'excluded' : ''}" data-id="${escape(c.id)}">
                <div class="cat-check-v2" style="padding-right: 12px; display: flex; align-items: center;">
                  <input type="checkbox" class="cat-checkbox" data-id="${escape(c.id)}" ${isExcluded ? '' : 'checked'} style="width: 16px; height: 16px; cursor: pointer;">
                </div>
                <div class="cat-icon-frame">${escape(c.icon)}</div>
                <div class="cat-info-v3" data-action="drillDown" data-category-id="${escape(c.id)}" style="cursor: pointer;">
                  <div class="cat-title-row">
                    <span class="cat-name-v3">${escape(c.name)}</span>
                    <span class="cat-amount-v3">¥${c.total.toLocaleString()}</span>
                  </div>
                  <div class="cat-progress-v3">
                    <div class="cat-progress-bar" style="width: ${pct}%"></div>
                  </div>
                </div>
                <div style="font-size: 0.7rem; font-weight: 800; color: var(--text-muted); margin-left: 10px; min-width: 30px; text-align: right;">
                  ${pct.toFixed(0)}%
                </div>
              </div>
            `;
          }).join('')}
      </div>
    </div>
  `;
}

export function renderBSContent(state, start, end) {
  const accounts = store.getAccounts();
  const netWorth = store.getTotalBalance();
  
  // 表示中の資産合計を計算（チェックされている口座のみ）
  const visibleBalance = accounts
    .filter(a => !state.excludedAccountIds.includes(a.id))
    .reduce((sum, a) => sum + Number(a.balance), 0);

  const escape = (str) => store.escapeHTML(str);
  const formatDateRange = (s, e) => `${s.split('-').join('/')} - ${e.split('-').join('/')}`;

  return `
    <div class="bs-content fadeIn">
      <!-- Period Selector (PLと統一) -->
      <div class="analysis-controls-container">
        <div class="analysis-period-nav">
          <button class="nav-btn-v3" data-action="prevPeriod" aria-label="前の期間">‹</button>
          <div class="current-period-v3">${formatDateRange(start, end)}</div>
          <button class="nav-btn-v3" data-action="nextPeriod" aria-label="次の期間">›</button>
        </div>
        
        <div class="analysis-segmented-control sub-nav">
          <button class="segmented-item mini ${state.periodType === 'week' ? 'active' : ''}" data-val="week" data-action="setPeriod">週</button>
          <button class="segmented-item mini ${state.periodType === 'month' ? 'active' : ''}" data-val="month" data-action="setPeriod">月</button>
          <button class="segmented-item mini ${state.periodType === 'year' ? 'active' : ''}" data-val="year" data-action="setPeriod">年</button>
          <button class="segmented-item mini ${state.periodType === 'custom' ? 'active' : ''}" data-val="custom" data-action="setPeriod">指定</button>
        </div>
      </div>

      <!-- Total Net Worth Master Card -->
      <div class="total-summary-card">
        <div class="total-amount income">¥${netWorth.toLocaleString()}</div>
        <div style="font-size: 0.7rem; opacity: 0.8; font-weight: 600; letter-spacing: 1px;">TOTAL NET WORTH</div>
        ${state.excludedAccountIds.length > 0 ? `
          <div style="font-size: 0.65rem; opacity: 0.6; margin-top: 8px; font-weight: 700;">
            表示中の合計: ¥${visibleBalance.toLocaleString()}
          </div>
        ` : ''}
      </div>

      <!-- Asset Balance Chart -->
      <div class="premium-card-v3">
        <h4 style="font-size: 0.9rem; font-weight: 800; margin-bottom: 20px; color: #1a2a4d;">🏦 資産・負債バランス</h4>
        <div style="height: 320px;"><canvas id="bs-balance-chart"></canvas></div>
      </div>

      <!-- Asset Trend Chart -->
      <div class="premium-card-v3">
        <h4 style="font-size: 0.9rem; font-weight: 800; color: #1a2a4d; margin-bottom: 20px;">📈 資産推移</h4>
        <div style="height: 240px;"><canvas id="total-asset-chart"></canvas></div>
      </div>
      ...

      <!-- Account List Title -->
      <div style="display: flex; justify-content: space-between; align-items: center; margin: 20px var(--space-md) 10px;">
        <h4 style="font-size: 0.9rem; font-weight: 800; color: #1a2a4d; margin: 0;">口座別内訳</h4>
        <div style="font-size: 0.7rem; font-weight: 700; color: var(--text-muted);">
          表示設定
        </div>
      </div>

      <!-- Account List Card -->
      <div class="premium-card-v3">
        ${accounts.length === 0 ? '<div style="text-align:center; padding:20px; color:var(--text-muted);">口座がありません</div>' : 
          accounts.sort((a,b) => b.balance - a.balance).map(a => {
            const isExcluded = state.excludedAccountIds.includes(a.id);
            const isNegative = Number(a.balance) < 0;
            return `
              <div class="category-item-v3 ${isExcluded ? 'excluded' : ''}" data-id="${escape(a.id)}">
                <div class="cat-check-v2" style="padding-right: 12px; display: flex; align-items: center;">
                  <input type="checkbox" class="acc-checkbox" data-id="${escape(a.id)}" ${isExcluded ? '' : 'checked'} style="width: 16px; height: 16px; cursor: pointer;">
                </div>
                <div class="cat-icon-frame">${escape(a.icon || '🏦')}</div>
                <div class="cat-info-v3">
                  <div class="cat-title-row">
                    <span class="cat-name-v3">${escape(a.name)}</span>
                    <span class="cat-amount-v3 ${isNegative ? 'expense' : 'income'}" style="font-size: 0.85rem;">
                      ¥${Number(a.balance).toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            `;
          }).join('')}
      </div>
    </div>
  `;
}
