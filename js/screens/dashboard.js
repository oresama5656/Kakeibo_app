// ============================================
// ダッシュボード画面 (v5.7 - 残高修正カテゴリー対応版)
// ============================================

import * as store from '../store.js';
import { setQuickInput } from './input.js';
import { setHistoryFilters } from './history.js';

export function render(container) {
  if (!container) return;
  const accounts = store.getAccounts();
  const totalBalance = store.getTotalBalance();
  const isPositive = totalBalance >= 0;

  container.innerHTML = `
    <div class="dashboard-screen">
      <div class="dashboard-header">
        <div class="total-label">総資産額</div>
        <div class="total-amount ${isPositive ? 'positive' : 'negative'}">
          ¥${Math.abs(totalBalance).toLocaleString('ja-JP')}
        </div>
      </div>

      <div class="chart-card">
        <div class="chart-card-title">💰 口座別残高</div>
        <div class="account-cards">
          ${[...accounts].sort((a,b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0) || (a.order || 0) - (b.order || 0)).map(acc => {
            const balance = store.getAccountBalance(acc.id);
            return `
              <div class="account-card" data-action="selectAccount" data-id="${acc.id}" style="cursor:pointer;">
                <span class="account-card-icon">${acc.icon}</span>
                <div class="account-card-info">
                  <div class="account-card-name">${store.escapeHTML(acc.name)}</div>
                  <div class="account-card-balance" style="color: ${balance >= 0 ? 'var(--color-income)' : 'var(--color-expense)'}">
                    ¥${Math.abs(balance).toLocaleString('ja-JP')}
                  </div>
                </div>
              </div>
            `;
          }).join('')}
        </div>
        <div style="margin-top: 16px; font-size: 11px; color: var(--text-muted); text-align: center; opacity: 0.8;">
          💡 口座をタップで入出金・残高調整メニューを表示
        </div>
      </div>
    </div>
  `;

  container.addEventListener('click', handleClick);

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
    <div class="modal-content" style="max-width: 320px; border-radius: 24px; padding-bottom: 24px;">
      <div class="modal-header" style="border-bottom: none;">
        <div class="modal-title">${account.icon} ${account.name}</div>
        <button class="modal-close modal-close-btn">✕</button>
      </div>
      <div style="text-align: center; margin-bottom: 20px; font-weight: 800; font-size: 1.4rem; color: var(--text-primary);">
        ¥${currentBalance.toLocaleString()}
      </div>
      <div class="quick-menu-grid" style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; padding: 0 16px;">
        <button class="btn btn-primary" data-type="expense" style="background: var(--color-expense); height: 60px; font-weight:bold;">支出</button>
        <button class="btn btn-primary" data-type="income" style="background: var(--color-income); height: 60px; font-weight:bold;">収入</button>
        <button class="btn btn-primary" data-type="transfer" style="background: var(--color-accent); height: 60px; font-weight:bold; color:white;">振替</button>
        <button class="btn btn-primary" data-type="history" style="background: #6366f1; height: 60px; font-weight:bold; color:white;">履歴</button>
        <button class="btn btn-secondary" data-type="correction" style="height: 60px; font-weight:bold; border: 1px solid var(--border-color); grid-column: span 2; background: var(--bg-hover);">残高の修正 (調整)</button>
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
    <div class="modal-content" style="max-width: 320px; border-radius: 24px;">
      <div class="modal-header">
        <div class="modal-title">残高の修正</div>
        <button class="modal-close modal-close-btn">✕</button>
      </div>
      <div style="padding: 0 16px 16px;">
        <div style="font-size: 0.8rem; color: var(--text-muted); margin-bottom: 8px;">現在: ¥${currentBalance.toLocaleString()}</div>
        <div class="form-group">
          <label class="form-label">実際の金額を入力</label>
          <input type="number" id="correction-target-amount" class="form-input" placeholder="0" inputmode="numeric">
        </div>
      </div>
      <div class="form-actions" style="padding: 16px; margin-top: 0;">
        <button class="btn btn-secondary modal-cancel-btn">戻る</button>
        <button class="btn btn-primary" id="go-to-correction" style="background: var(--color-accent); color: white;">次へ進む</button>
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
