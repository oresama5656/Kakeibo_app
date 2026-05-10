// ============================================
// ダッシュボード画面 (v5.7 - 残高修正カテゴリー対応版)
// ============================================

import * as store from '../store.js';
import { setQuickInput } from './input.js';
import { setHistoryFilters } from './history.js';
import { renderIconHTML } from '../utils/IconRenderer.js';

export function render(container) {
  if (!container) return;
  const accounts = store.getAccounts();
  const totalBalance = store.getTotalBalance();
  const isPositive = totalBalance >= 0;

  container.innerHTML = `
    <div class="dashboard-screen premium-mode fadeIn">
      <!-- Summary Master Card (Unify with History/Analysis) -->
      <div class="total-summary-card" style="margin-left: calc(var(--space-md) * -1); margin-right: calc(var(--space-md) * -1); margin-top: calc(var(--space-md) * -1);">
        <div class="total-amount">¥${Math.abs(totalBalance).toLocaleString('ja-JP')}</div>
        <div style="font-size: 0.7rem; opacity: 0.7; font-weight: 600;">現在の総資産額</div>
      </div>

      <div class="premium-card-v3" style="margin-top: 24px;">
        <div class="chart-card-title" style="display: flex; align-items: center; gap: 8px; padding: 16px 16px 8px;">
          <i data-lucide="wallet" style="width: 18px; height: 18px; color: var(--color-accent);"></i>
          口座別内訳
        </div>
        <div class="account-cards-list">
          ${[...accounts].sort((a,b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0) || (a.order || 0) - (b.order || 0)).map((acc, idx) => {
            const balance = store.getAccountBalance(acc.id);
            const isLast = idx === accounts.length - 1;
            return `
              <div class="category-item-v3" data-action="selectAccount" data-id="${acc.id}" style="cursor:pointer; padding: 14px 16px; ${isLast ? 'border-bottom: none;' : ''}">
                <div class="cat-icon-frame" style="background: var(--bg-primary); border: 1px solid var(--border-light); font-size: 1.1rem;">${renderIconHTML(acc.icon, acc.id, { size: 22 })}</div>
                <div class="cat-info-v3">
                  <div class="cat-title-row">
                    <span class="cat-name-v3" style="font-size: 0.9rem; font-weight: 700; color: var(--text-primary);">${store.escapeHTML(acc.name)}</span>
                    <span class="cat-amount-v3" style="color: ${balance >= 0 ? 'var(--color-income)' : 'var(--color-expense)'}">
                      ¥${Math.abs(balance).toLocaleString('ja-JP')}
                    </span>
                  </div>
                  <div style="font-size: 0.7rem; color: var(--text-muted); font-weight: 600;">
                    ${acc.pinned ? '優先表示' : '通常'}
                  </div>
                </div>
                <div style="margin-left: 12px; color: var(--text-muted); opacity: 0.5;">
                  <i data-lucide="chevron-right" style="width: 16px; height: 16px;"></i>
                </div>
              </div>
            `;
          }).join('')}
        </div>
        <div style="padding: 16px; border-top: 1px solid var(--border-light); font-size: 11px; color: var(--text-muted); text-align: center; opacity: 0.8; display: flex; align-items: center; justify-content: center; gap: 4px;">
          <i data-lucide="info" style="width: 12px; height: 12px;"></i>
          口座をタップで入出金・残高調整
        </div>
      </div>
    </div>
  `;

  container.addEventListener('click', handleClick);
  if (window.lucide) lucide.createIcons();

  // Drag & Drop for PC (振り替え用)
  const el = container.querySelector('.account-cards');
  if (el && window.Sortable && window.innerWidth >= 768) {
    window.Sortable.create(el, {
      sort: false, animation: 150,
      onEnd: (evt) => {
        const item = evt.item;
        item.style.pointerEvents = 'none';
        const touch = evt.originalEvent.changedTouches ? evt.originalEvent.changedTouches[0] : evt.originalEvent;
        const target = document.elementFromPoint(touch.clientX, touch.clientY)?.closest('.account-card');
        item.style.pointerEvents = 'auto';
        if (target && target !== item) openQuickTransferModal(item.dataset.id, target.dataset.id);
        refresh();
      }
    });
  }
}

function handleClick(e) {
  const target = e.target.closest('[data-action]');
  if (!target) return;
  if (target.dataset.action === 'selectAccount') showQuickMenu(target.dataset.id);
}

function showQuickMenu(accountId) {
  const account = store.getAccounts().find(a => a.id === accountId);
  const currentBalance = store.getAccountBalance(accountId);
  if (!account) return;

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.style.zIndex = '3000';
  overlay.innerHTML = `
    <div class="premium-modal-v3">
      <div class="modal-header">
        <div class="modal-title">${store.escapeHTML(account.name)}</div>
        <button class="modal-close modal-close-btn">✕</button>
      </div>
      <div style="text-align: center; margin: 8px 0 24px; font-weight: 900; font-size: 1.8rem; color: var(--text-primary); letter-spacing: -0.5px;">
        ¥${currentBalance.toLocaleString()}
      </div>
      <div class="quick-menu-grid" style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
        <button class="btn" data-type="expense" style="background: var(--color-expense-bg); color: var(--color-expense); border: 1px solid rgba(244, 63, 94, 0.2);">支出</button>
        <button class="btn" data-type="income" style="background: var(--color-income-bg); color: var(--color-income); border: 1px solid rgba(16, 185, 129, 0.2);">収入</button>
        <button class="btn" data-type="transfer" style="background: var(--color-accent-light); color: var(--color-accent); border: 1px solid rgba(99, 102, 241, 0.2);">振替</button>
        <button class="btn" data-type="history" style="background: var(--bg-primary); border: 1px solid var(--border-light);">履歴</button>
        <button class="btn" data-type="correction" style="grid-column: span 2; background: var(--bg-primary); border: 1px solid var(--border-light); color: var(--text-muted); font-size: 0.8rem;">残高の修正 (調整)</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);
  const close = () => overlay.remove();
  overlay.querySelector('.modal-close-btn').onclick = close;
  overlay.querySelectorAll('button[data-type]').forEach(btn => {
    btn.onclick = () => {
      const type = btn.dataset.type;
      close();
      if (type === 'correction') openCorrectionModal(account, currentBalance);
      else if (type === 'history') { setHistoryFilters({ accountId: account.id }); window.navigateTo?.('history'); }
      else {
        const data = { type };
        if (type === 'expense' || type === 'transfer') data.fromAccountId = account.id;
        if (type === 'income') data.toAccountId = account.id;
        setQuickInput(data);
        window.navigateTo?.('input');
      }
    };
  });
}

function openCorrectionModal(account, currentBalance) {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.style.zIndex = '3500';
  overlay.innerHTML = `
    <div class="premium-modal-v3" style="max-width: 340px;">
      <div class="modal-header">
        <div class="modal-title">残高の修正</div>
        <button class="modal-close modal-close-btn">✕</button>
      </div>
      <div style="padding: 0 4px;">
        <div style="font-size: 0.75rem; font-weight: 800; color: var(--text-muted); margin-bottom: 16px; text-transform: uppercase; letter-spacing: 0.5px;">
          現在の帳簿残高: ¥${currentBalance.toLocaleString()}
        </div>
        <div class="form-group" style="margin-bottom: 24px;">
          <label class="form-label" style="font-weight: 800; font-size: 0.8rem; color: var(--text-primary);">実際の金額を入力</label>
          <input type="number" id="correction-target-amount" class="form-input" placeholder="0" inputmode="numeric" style="height: 56px; border-radius: 16px; font-size: 1.2rem; font-weight: 900; padding: 0 16px; border: 2px solid var(--border-light); background: var(--bg-primary);">
        </div>
      </div>
      <div class="form-actions" style="margin-top: 0; display: flex; gap: 12px;">
        <button class="btn modal-cancel-btn" style="background: var(--bg-primary); border: 1px solid var(--border-light); flex: 1;">戻る</button>
        <button class="btn btn-primary" id="go-to-correction" style="flex: 1.5;">確定する</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);
  const input = overlay.querySelector('#correction-target-amount');
  setTimeout(() => input.focus(), 100);
  const close = () => overlay.remove();
  overlay.querySelector('.modal-close-btn').onclick = close;
  overlay.querySelector('.modal-cancel-btn').onclick = close;
  overlay.querySelector('#go-to-correction').onclick = () => {
    const target = Number(input.value);
    const diff = target - currentBalance;
    if (diff === 0) { close(); return; }
    const type = diff > 0 ? 'income' : 'expense';
    
    // システム予約済みの「残高修正」カテゴリーIDを使用
    const data = { 
      type: type, 
      amount: String(Math.abs(diff)), 
      categoryId: type === 'expense' ? 'cat_99' : 'cat_100', 
      memo: '残高修正' 
    };
    if (type === 'income') data.toAccountId = account.id;
    else data.fromAccountId = account.id;
    setQuickInput(data);
    close();
    window.navigateTo?.('input');
  };
}

function openQuickTransferModal(fromId, toId) {
  const accs = store.getAccounts();
  const from = accs.find(a => a.id === fromId), to = accs.find(a => a.id === toId);
  if (!from || !to) return;
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `<div class="modal-content">...（振替処理）...</div>`; // 簡易化
  // 実装済みならそちらを維持
}

function refresh() {
  const container = document.getElementById('screen-dashboard');
  if (container) { container.removeEventListener('click', handleClick); render(container); }
}
