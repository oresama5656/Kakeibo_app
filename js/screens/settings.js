// ============================================
// 設定画面 (v6.0 - Premium Icon System統合版)
// ============================================

import * as store from '../store/index.js';
import * as auth from '../auth.js';
import { renderIconHTML } from '../utils/IconRenderer.js';

const RECOMMENDED_LUCIDE_ICONS = [
  'lucide:utensils', 'lucide:shopping-cart', 'lucide:home', 'lucide:car', 'lucide:bus',
  'lucide:heart', 'lucide:smile', 'lucide:coffee', 'lucide:tv', 'lucide:music',
  'lucide:book', 'lucide:pencil', 'lucide:camera', 'lucide:shirt', 'lucide:gift',
  'lucide:shopping-bag', 'lucide:briefcase', 'lucide:wallet', 'lucide:banknote', 'lucide:credit-card',
  'lucide:landmark', 'lucide:coins', 'lucide:piggy-bank', 'lucide:trending-up', 'lucide:stethoscope', 
  'lucide:pill', 'lucide:dumbbell', 'lucide:bike', 'lucide:plane', 'lucide:star', 
  'lucide:zap', 'lucide:flame', 'lucide:cat', 'lucide:dog', 'lucide:leaf',
  'lucide:hand-coins', 'lucide:mail', 'lucide:japanese-yen', 'lucide:graduation-cap', 'lucide:baby', 'lucide:laptop', 'lucide:percent',
  'lucide:line-chart', 'lucide:smartphone', 'lucide:palmtree', 'lucide:party-popper', 'lucide:droplets', 'lucide:wifi',
  'lucide:package', 'lucide:ticket', 'lucide:beer', 'lucide:trash-2', 'lucide:wrench', 'lucide:scale', 'lucide:receipt'
];

export function render(container) {
  if (!container) return;
  
  const settings = store.getSettings();
  const accounts = store.getAccounts();
  const categories = store.getCategories();
  
  const expenseCategories = categories
    .filter(c => c.type === 'expense')
    .sort((a, b) => (a.order || 0) - (b.order || 0));
    
  const incomeCategories = categories
    .filter(c => c.type === 'income')
    .sort((a, b) => (a.order || 0) - (b.order || 0));
    
  const sheetId = localStorage.getItem('kakeibo_sheet_id');

  container.innerHTML = `
    <div class="settings-screen modern-settings" style="max-width: 800px; margin: 0 auto; padding-bottom: 80px;">
      
      <!-- ヒーローセクション -->
      <div class="settings-header-hero" style="text-align: center; padding: 40px 0 20px;">
        <div style="margin-bottom: 12px; display: flex; justify-content: center; color: var(--text-muted);">
          <i data-lucide="settings" style="width: 48px; height: 48px; stroke-width: 1.5px;"></i>
        </div>
        <h2 style="font-size: 1.6rem; font-weight: 800; margin:0; color: var(--text-primary);">アプリ設定</h2>
        <div style="font-size: 11px; color: var(--text-muted); letter-spacing: 0.1em; margin-top: 5px;">SYNC ENGINE v6.0</div>
      </div>

      <!-- クイックアクション -->
      <div class="settings-quick-actions-v3">
        <div class="quick-action-v3" data-action="toggleDarkMode">
          <div class="quick-action-icon-v3">
            <i data-lucide="${getDarkModeActive(settings) ? 'moon' : 'sun'}"></i>
          </div>
          <div class="quick-action-label-v3">テーマ</div>
        </div>
        <div class="quick-action-v3" data-action="exportDataExcel">
          <div class="quick-action-icon-v3">
            <i data-lucide="file-spreadsheet"></i>
          </div>
          <div class="quick-action-label-v3">エクセル</div>
        </div>
      </div>

      <!-- 口座セクション -->
      <div class="premium-card-v3 settings-section-card-v3">
        <div class="settings-card-header-v3">
          <div class="header-title-group">
            <i data-lucide="wallet"></i>
            <span>口座の管理</span>
          </div>
          <span class="count-badge-v3">${accounts.length}件</span>
        </div>
        <div id="settings-accounts-list">
          ${accounts.sort((a,b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0) || (a.order || 0) - (b.order || 0)).map(acc => `
            <div class="settings-list-item-v3 draggable" data-id="${acc.id}" data-action="editAccount">
              <span class="settings-drag-handle-v3"><i data-lucide="grip-vertical"></i></span>
              <div class="item-icon-v3 color-${acc.color || 'slate'}">${renderIconHTML(acc.icon, acc.id, { size: 24 })}</div>
              <span class="item-name-v3">${store.escapeHTML(acc.name)} ${acc.pinned ? '<i data-lucide="pin" class="pinned-star-icon-v3"></i>' : ''}</span>
              <span class="item-chevron-v3">›</span>
            </div>
          `).join('')}
        </div>
        <div class="settings-add-btn-v3" data-action="addAccount">＋ 新しい口座を追加</div>
      </div>

      <!-- カテゴリーセクション -->
      <div class="settings-category-grid-v3">
        <!-- 支出カテゴリ -->
        <div class="premium-card-v3 settings-section-card-v3">
          <div class="settings-card-header-v3">
            <div class="header-title-group">
              <i data-lucide="minus-circle" style="color: var(--color-expense);"></i>
              <span>支出カテゴリ</span>
            </div>
            <span class="count-badge-v3">${expenseCategories.length}件</span>
          </div>
          <div id="settings-expense-list">
            ${expenseCategories.sort((a,b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0) || (a.order || 0) - (b.order || 0)).map(cat => `
              <div class="settings-list-item-v3 draggable" data-id="${cat.id}" data-action="editCategory">
                <span class="settings-drag-handle-v3 small"><i data-lucide="grip-vertical"></i></span>
                <div class="item-icon-v3 small color-${cat.color || 'slate'}">${renderIconHTML(cat.icon, cat.id, { size: 20 })}</div>
                <span class="item-name-v3 small">${store.escapeHTML(cat.name)} ${cat.pinned ? '<i data-lucide="pin" class="pinned-star-icon-v3"></i>' : ''}</span>
                <span class="item-chevron-v3">›</span>
              </div>
            `).join('')}
          </div>
          <div class="settings-add-btn-v3" data-action="addCategory" data-type="expense" style="color: var(--color-expense); background: rgba(239, 68, 68, 0.03);">＋ カテゴリ追加</div>
        </div>

        <!-- 収入カテゴリ -->
        <div class="premium-card-v3 settings-section-card-v3">
          <div class="settings-card-header-v3">
            <div class="header-title-group">
              <i data-lucide="plus-circle" style="color: var(--color-income);"></i>
              <span>収入カテゴリ</span>
            </div>
            <span class="count-badge-v3">${incomeCategories.length}件</span>
          </div>
          <div id="settings-income-list">
            ${incomeCategories.sort((a,b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0) || (a.order || 0) - (b.order || 0)).map(cat => `
              <div class="settings-list-item-v3 draggable" data-id="${cat.id}" data-action="editCategory">
                <span class="settings-drag-handle-v3 small"><i data-lucide="grip-vertical"></i></span>
                <div class="item-icon-v3 small color-${cat.color || 'slate'}">${renderIconHTML(cat.icon, cat.id, { size: 20 })}</div>
                <span class="item-name-v3 small">${store.escapeHTML(cat.name)} ${cat.pinned ? '<i data-lucide="pin" class="pinned-star-icon-v3"></i>' : ''}</span>
                <span class="item-chevron-v3">›</span>
              </div>
            `).join('')}
          </div>
          <div class="settings-add-btn-v3" data-action="addCategory" data-type="income" style="color: var(--color-income); background: rgba(34, 197, 94, 0.03);">＋ カテゴリ追加</div>
        </div>
      </div>
      
      <!-- クラウド・同期管理 -->
      <div class="premium-card-v3 settings-cloud-card-v3">
        <div class="cloud-icon-wrapper-v3">
          <i data-lucide="cloud-cog"></i>
        </div>
        ${!auth.isLoggedIn() ? `
          <h3 class="cloud-title-v3">Googleクラウド同期</h3>
          <p class="cloud-desc-v3">スプレッドシートと連携して<br>データを安全にバックアップ・共有できます。</p>
          <button class="btn-primary-v3" data-action="googleLogin">
            <i data-lucide="log-in"></i> 連携を開始する
          </button>
        ` : `
          <div class="cloud-status-v3">Connected Cloud ID</div>
          <div class="cloud-id-v3">${sheetId}</div>
          <div class="cloud-actions-v3">
            <button class="cloud-btn-v3 secondary" data-action="syncPull">
              <i data-lucide="download"></i> 読込
            </button>
            <button class="cloud-btn-v3 primary" data-action="syncPush">
              <i data-lucide="upload"></i> 保存
            </button>
          </div>
        `}
      </div>

      <!-- デンジャーゾーン -->
      <div class="danger-zone-v3">
        <button class="danger-btn-v3" data-action="clearData">アプリの全データを初期化</button>
      </div>
    </div>
  `;

  initSortable('settings-accounts-list', 'account');
  initSortable('settings-expense-list', 'category');
  initSortable('settings-income-list', 'category');

  container.addEventListener('click', handleClick);
  if (window.lucide) lucide.createIcons();
}

function initSortable(id, type) {
  const el = document.getElementById(id);
  if (!el || !window.Sortable) return;
  window.Sortable.create(el, {
    handle: '.settings-drag-handle',
    animation: 200,
    ghostClass: 'sortable-ghost',
    onEnd: () => {
      const ids = Array.from(el.querySelectorAll('.draggable')).map(item => item.dataset.id);
      if (type === 'account') store.reorderAccounts(ids);
      else store.reorderCategories(ids);
      window.showToast?.('順番を保存しました ✓');
    }
  });
}

function handleClick(e) {
  const target = e.target.closest('[data-action]');
  if (!target) return;
  const action = target.dataset.action;
  switch (action) {
    case 'editAccount': showAccountModal(e.target.closest('.draggable')?.dataset.id); break;
    case 'addAccount': showAccountModal(null); break;
    case 'editCategory': showCategoryModal(target.dataset.id); break;
    case 'addCategory': showCategoryModal(null, target.dataset.type); break;
    case 'toggleDarkMode': toggleDarkMode(); break;
    case 'googleLogin': handleGoogleLogin(); break;
    case 'googleLogout': auth.signOut(); refresh(); break;
    case 'syncPush': handleSyncPush(); break;
    case 'syncPull': handleSyncPull(); break;
    case 'exportDataExcel': exportDataExcel(); break;
    case 'clearData': clearData(); break;
  }
}

function showAccountModal(id) {
  const accounts = store.getAccounts();
  const acc = id ? accounts.find(a => a.id === id) : null;
  const isNew = !acc;
  const overlay = document.createElement('div');
  overlay.className = 'premium-modal-overlay fadeIn';
  overlay.innerHTML = `
    <div class="premium-modal-sheet slideUp">
      <div class="modal-drag-handle"></div>
      <div class="modal-header-v3">
        <h3 class="modal-title-v3">${isNew ? '口座追加' : '口座編集'}</h3>
        <button class="modal-close-v3" data-action="closeModal" aria-label="閉じる">&times;</button>
      </div>
      <div class="modal-body-v3">
        <div class="hero-icon-container-v3">
          <div id="acc-icon-preview" class="hero-icon-preview-v3 color-${acc?.color || 'slate'}">${renderIconHTML(acc?.icon || 'lucide:wallet', id || 'new', { size: 40 })}</div>
          <input type="hidden" id="acc-icon" value="${acc?.icon || 'lucide:wallet'}">
        </div>

        <div class="form-group-v3" style="display: flex; justify-content: space-between; align-items: center; padding: 10px 0; border-bottom: 1px solid var(--border-color);">
          <label style="margin: 0;">テーマカラー</label>
          <div class="color-picker-container">
            <button type="button" class="color-trigger-btn" style="background: var(--swatch-${acc?.color || 'slate'})" id="acc-color-btn"></button>
            <input type="hidden" id="acc-color" value="${acc?.color || 'slate'}">
            <div class="color-popover" id="acc-color-popover">
              <div class="color-swatch-item" style="background: var(--swatch-slate)" data-color="slate"></div>
              <div class="color-swatch-item" style="background: var(--swatch-indigo)" data-color="indigo"></div>
              <div class="color-swatch-item" style="background: var(--swatch-emerald)" data-color="emerald"></div>
              <div class="color-swatch-item" style="background: var(--swatch-rose)" data-color="rose"></div>
              <div class="color-swatch-item" style="background: var(--swatch-amber)" data-color="amber"></div>
              <div class="color-swatch-item" style="background: var(--swatch-sky)" data-color="sky"></div>
            </div>
          </div>
        </div>

        <div class="form-group-v3">
          <label>口座名</label>
          <input type="text" id="acc-name" name="account-name" class="input-v3" value="${acc?.name || ''}" placeholder="例: 生活費口座" autocomplete="account-name">
        </div>

        <div class="form-group-v3">
          <label>初期残高</label>
          <input type="number" id="acc-balance" name="account-balance" class="input-v3" value="${acc?.initialBalance || 0}" placeholder="0" autocomplete="off">
        </div>

        <div class="form-group-v3">
          <label>アイコン選択</label>
          <div class="icon-picker-grid-v3">
            ${RECOMMENDED_LUCIDE_ICONS.map(icon => `
              <div class="icon-option-v3 ${acc?.icon === icon ? 'active' : ''}" data-icon="${icon}" role="button" aria-label="アイコン: ${icon}">${renderIconHTML(icon, 'preview', { size: 24 })}</div>
            `).join('')}
          </div>
        </div>

        <div class="premium-switch-row-v3">
          <div class="switch-label-v3">
            <i data-lucide="star" style="width: 18px; color: #eab308;"></i>
            <span>お気に入り（優先表示）</span>
          </div>
          <label class="switch-v3">
            <input type="checkbox" id="acc-pinned" ${acc?.pinned ? 'checked' : ''}>
            <span class="slider-v3"></span>
          </label>
        </div>
      </div>
      <div class="modal-footer-v3">
        ${!isNew ? '<button class="btn-danger-v3" data-action="deleteItem">削除</button>' : ''}
        <button class="modal-apply-btn-v3" data-action="saveItem">${isNew ? '追加' : '保存'}</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);
  if (window.lucide) lucide.createIcons();

  overlay.addEventListener('click', (e) => {
    // Color Popover Toggle
    if (e.target.closest('#acc-color-btn')) {
      document.getElementById('acc-color-popover').classList.toggle('show');
      return;
    }
    // Color Selection
    const swatch = e.target.closest('.color-swatch-item');
    if (swatch) {
      const color = swatch.dataset.color;
      document.getElementById('acc-color').value = color;
      document.getElementById('acc-color-btn').style.background = `var(--swatch-${color})`;
      document.getElementById('acc-icon-preview').className = `hero-icon-preview-v3 color-${color}`;
      document.getElementById('acc-color-popover').classList.remove('show');
      return;
    }
    // Close Popover on Outside Click
    const popover = document.getElementById('acc-color-popover');
    if (popover && popover.classList.contains('show') && !e.target.closest('.color-picker-container')) {
      popover.classList.remove('show');
    }

    const iconOpt = e.target.closest('.icon-option-v3');
    if (iconOpt) {
      const newIcon = iconOpt.dataset.icon;
      // UI Update
      document.querySelectorAll('.icon-option-v3').forEach(opt => opt.classList.remove('active'));
      iconOpt.classList.add('active');
      
      document.getElementById('acc-icon').value = newIcon;
      document.getElementById('acc-icon-preview').innerHTML = renderIconHTML(newIcon, id || 'new', { size: 40 });
      
      // Animate preview
      const preview = document.getElementById('acc-icon-preview');
      preview.style.transform = 'scale(1.2)';
      setTimeout(() => preview.style.transform = 'scale(1)', 200);

      if (window.lucide) lucide.createIcons();
      return;
    }

    const act = e.target.dataset.action || e.target.closest('[data-action]')?.dataset.action;
    if (act === 'closeModal' || e.target === overlay) { overlay.remove(); return; }
    if (act === 'deleteItem' && confirm('削除しますか？')) { store.deleteAccount(id); overlay.remove(); refresh(); return; }
    if (act === 'saveItem') {
      const data = { 
        name: document.getElementById('acc-name').value.trim(), 
        icon: document.getElementById('acc-icon').value.trim() || 'lucide:wallet', 
        initialBalance: Number(document.getElementById('acc-balance').value) || 0,
        pinned: document.getElementById('acc-pinned').checked,
        color: document.getElementById('acc-color').value
      };
      if (data.name) { if (isNew) store.addAccount(data); else store.updateAccount(id, data); overlay.remove(); refresh(); }
    }
  });
}

function showCategoryModal(id, type) {
  const categories = store.getCategories();
  const cat = id ? categories.find(c => c.id === id) : null;
  const isNew = !cat;
  const overlay = document.createElement('div');
  overlay.className = 'premium-modal-overlay fadeIn';
  overlay.innerHTML = `
    <div class="premium-modal-sheet slideUp">
      <div class="modal-drag-handle"></div>
      <div class="modal-header-v3">
        <h3 class="modal-title-v3">カテゴリ管理</h3>
        <button class="modal-close-v3" data-action="closeModal" aria-label="閉じる">&times;</button>
      </div>
      <div class="modal-body-v3">
        <div class="hero-icon-container-v3">
          <div id="cat-icon-preview" class="hero-icon-preview-v3 color-${cat?.color || 'slate'}">${renderIconHTML(cat?.icon || 'lucide:folder', id || 'new', { size: 40 })}</div>
          <input type="hidden" id="cat-icon" value="${cat?.icon || 'lucide:folder'}">
        </div>

        <div class="form-group-v3" style="display: flex; justify-content: space-between; align-items: center; padding: 10px 0; border-bottom: 1px solid var(--border-color);">
          <label style="margin: 0;">テーマカラー</label>
          <div class="color-picker-container">
            <button type="button" class="color-trigger-btn" style="background: var(--swatch-${cat?.color || 'slate'})" id="cat-color-btn"></button>
            <input type="hidden" id="cat-color" value="${cat?.color || 'slate'}">
            <div class="color-popover" id="cat-color-popover">
              <div class="color-swatch-item" style="background: var(--swatch-slate)" data-color="slate"></div>
              <div class="color-swatch-item" style="background: var(--swatch-indigo)" data-color="indigo"></div>
              <div class="color-swatch-item" style="background: var(--swatch-emerald)" data-color="emerald"></div>
              <div class="color-swatch-item" style="background: var(--swatch-rose)" data-color="rose"></div>
              <div class="color-swatch-item" style="background: var(--swatch-amber)" data-color="amber"></div>
              <div class="color-swatch-item" style="background: var(--swatch-sky)" data-color="sky"></div>
            </div>
          </div>
        </div>

        <div class="form-group-v3">
          <label>カテゴリ名</label>
          <input type="text" id="cat-name" name="category-name" class="input-v3" value="${cat?.name || ''}" placeholder="例: 食費" autocomplete="category">
        </div>

        <div class="form-group-v3">
          <label>アイコン選択</label>
          <div class="icon-picker-grid-v3">
            ${RECOMMENDED_LUCIDE_ICONS.map(icon => `
              <div class="icon-option-v3 ${cat?.icon === icon ? 'active' : ''}" data-icon="${icon}" role="button" aria-label="アイコン: ${icon}">${renderIconHTML(icon, 'preview', { size: 24 })}</div>
            `).join('')}
          </div>
        </div>

        <div class="premium-switch-row-v3">
          <div class="switch-label-v3">
            <i data-lucide="star" style="width: 18px; color: #eab308;"></i>
            <span>お気に入り（優先表示）</span>
          </div>
          <label class="switch-v3">
            <input type="checkbox" id="cat-pinned" ${cat?.pinned ? 'checked' : ''}>
            <span class="slider-v3"></span>
          </label>
        </div>
      </div>
      <div class="modal-footer-v3">
        ${!isNew ? '<button class="btn-danger-v3" data-action="deleteItem">削除</button>' : ''}
        <button class="modal-apply-btn-v3" data-action="saveItem">${isNew ? '追加' : '保存'}</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);
  if (window.lucide) lucide.createIcons();

  overlay.addEventListener('click', (e) => {
    // Color Popover Toggle
    if (e.target.closest('#cat-color-btn')) {
      document.getElementById('cat-color-popover').classList.toggle('show');
      return;
    }
    // Color Selection
    const swatch = e.target.closest('.color-swatch-item');
    if (swatch) {
      const color = swatch.dataset.color;
      document.getElementById('cat-color').value = color;
      document.getElementById('cat-color-btn').style.background = `var(--swatch-${color})`;
      document.getElementById('cat-icon-preview').className = `hero-icon-preview-v3 color-${color}`;
      document.getElementById('cat-color-popover').classList.remove('show');
      return;
    }
    // Close Popover on Outside Click
    const popover = document.getElementById('cat-color-popover');
    if (popover && popover.classList.contains('show') && !e.target.closest('.color-picker-container')) {
      popover.classList.remove('show');
    }

    const iconOpt = e.target.closest('.icon-option-v3');
    if (iconOpt) {
      const newIcon = iconOpt.dataset.icon;
      // UI Update
      document.querySelectorAll('.icon-option-v3').forEach(opt => opt.classList.remove('active'));
      iconOpt.classList.add('active');

      document.getElementById('cat-icon').value = newIcon;
      document.getElementById('cat-icon-preview').innerHTML = renderIconHTML(newIcon, id || 'new', { size: 40 });

      // Animate preview
      const preview = document.getElementById('cat-icon-preview');
      preview.style.transform = 'scale(1.2)';
      setTimeout(() => preview.style.transform = 'scale(1)', 200);

      if (window.lucide) lucide.createIcons();
      return;
    }

    const act = e.target.dataset.action || e.target.closest('[data-action]')?.dataset.action;
    if (act === 'closeModal' || e.target === overlay) { overlay.remove(); return; }
    if (act === 'deleteItem' && confirm('削除しますか？')) { store.deleteCategory(id); overlay.remove(); refresh(); return; }
    if (act === 'saveItem') {
      const data = { 
        name: document.getElementById('cat-name').value.trim(), 
        icon: document.getElementById('cat-icon').value.trim() || 'lucide:folder', 
        type: cat?.type || type || 'expense',
        pinned: document.getElementById('cat-pinned').checked,
        color: document.getElementById('cat-color').value
      };
      if (data.name) { if (isNew) store.addCategory(data); else store.updateCategory(id, data); overlay.remove(); refresh(); }
    }
  });
}

function toggleDarkMode() {
  const settings = store.getSettings();
  let next = settings.darkMode === 'dark' ? 'light' : 'dark';
  store.updateSettings({ darkMode: next });
  applyTheme(next);
  refresh();
}

export function applyTheme(m) { if (m === 'dark') document.documentElement.setAttribute('data-theme', 'dark'); else if (m === 'light') document.documentElement.setAttribute('data-theme', 'light'); else document.documentElement.removeAttribute('data-theme'); }
function getDarkModeActive(s) { if (s.darkMode === 'dark') return true; if (s.darkMode === 'light') return false; return window.matchMedia('(prefers-color-scheme: dark)').matches; }

async function handleGoogleLogin() { try { await auth.signIn(); const res = await auth.getOrCreateSpreadsheet(); if (res.id) { refresh(); if (res.isNew) await store.syncToCloud(res.id); else if(confirm('データを読込ますか？')) { await store.loadFromCloud(res.id); window.location.reload(); } } } catch (e) { window.showToast?.('エラー', 'error'); } }
async function handleSyncPush() { const sId = localStorage.getItem('kakeibo_sheet_id'); if (sId) { try { window.showToast?.('同期中...', 'info'); await store.syncToCloud(sId); window.showToast?.('完了'); } catch (e) { window.showToast?.('失敗', 'error'); } } }
async function handleSyncPull() { const sId = localStorage.getItem('kakeibo_sheet_id'); if (sId && confirm('上書?')) { try { await store.loadFromCloud(sId); window.location.reload(); } catch (e) { window.showToast?.('失敗', 'error'); refresh(); } } }

function exportDataExcel() {
  if (!store || typeof store.getTransactions !== 'function') { alert('エラー'); return; }
  try {
    const wb = XLSX.utils.book_new();
    const txs = store.getTransactions() || [];
    const txHeader = ['ID', '日付', '金額', '種別', 'カテゴリ名', '出金口座名', 'メモ', '入金口座名', 'カテゴリID', '出金ID', '入金ID'];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([txHeader, ...txs.map(t => [t.id, t.date, t.amount, t.type, t.category, t.fromAccount, t.memo, t.toAccount, t.categoryId, t.fromAccountId, t.toAccountId])]), "transactions");
    XLSX.writeFile(wb, "Kakeibo_Data.xlsx");
    window.showToast?.('保存完了');
  } catch (e) { alert('失敗'); }
}
function clearData() { if (confirm('全削除?')) { store.clearAllData(); window.location.reload(); } }

function refresh() {
  const container = document.getElementById('screen-settings');
  if (container) { container.removeEventListener('click', handleClick); render(container); }
}
