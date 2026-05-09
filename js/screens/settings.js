// ============================================
// 設定画面 (v6.0 - Premium Icon System統合版)
// ============================================

import * as store from '../store.js';
import * as auth from '../auth.js';
import { RECOMMENDED_EMOJIS } from '../data.js';
import { renderIconHTML } from '../utils/IconRenderer.js';

const RECOMMENDED_LUCIDE_ICONS = [
  'lucide:utensils', 'lucide:shopping-cart', 'lucide:home', 'lucide:car', 'lucide:bus',
  'lucide:heart', 'lucide:smile', 'lucide:coffee', 'lucide:tv', 'lucide:music',
  'lucide:book', 'lucide:pencil', 'lucide:camera', 'lucide:shirt', 'lucide:gift',
  'lucide:shopping-bag', 'lucide:briefcase', 'lucide:wallet', 'lucide:banknote', 'lucide:credit-card',
  'lucide:landmark', 'lucide:coins', 'lucide:piggy-bank', 'lucide:trending-up', 'lucide:stethoscope', 
  'lucide:pill', 'lucide:dumbbell', 'lucide:bike', 'lucide:plane', 'lucide:star', 
  'lucide:zap', 'lucide:flame', 'lucide:cat', 'lucide:dog', 'lucide:leaf'
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
      <div class="settings-quick-actions" style="display: flex; justify-content: center; gap: 24px; margin: 10px 0 32px;">
        <div class="quick-action" data-action="toggleDarkMode" style="cursor: pointer; text-align: center;">
          <div style="width: 52px; height: 52px; background: var(--bg-card); border-radius: 16px; display: flex; align-items: center; justify-content: center; border: 1px solid var(--border-color); box-shadow: var(--shadow-sm); color: var(--text-primary);">
            <i data-lucide="${getDarkModeActive(settings) ? 'moon' : 'sun'}" style="width: 22px; height: 22px;"></i>
          </div>
          <div style="font-size: 10px; margin-top: 6px; font-weight: 800; color: var(--text-secondary);">テーマ</div>
        </div>
        <div class="quick-action" data-action="exportDataExcel" style="cursor: pointer; text-align: center;">
          <div style="width: 52px; height: 52px; background: var(--bg-card); border-radius: 16px; display: flex; align-items: center; justify-content: center; border: 1px solid var(--border-color); box-shadow: var(--shadow-sm); color: var(--text-primary);">
            <i data-lucide="file-spreadsheet" style="width: 22px; height: 22px;"></i>
          </div>
          <div style="font-size: 10px; margin-top: 6px; font-weight: 800; color: var(--text-secondary);">エクセル保存</div>
        </div>
      </div>

      <!-- 口座セクション -->
      <div class="settings-section-card" style="background: var(--bg-card); border-radius: 20px; border: 1px solid var(--border-color); overflow: hidden; margin-bottom: 24px; box-shadow: var(--shadow-sm);">
        <div style="padding: 18px 20px; font-size: 0.85rem; font-weight: 800; border-bottom: 1px solid var(--border-light); background: rgba(0,0,0,0.01); display: flex; justify-content: space-between; align-items: center;">
          <div style="display: flex; align-items: center; gap: 8px;">
            <i data-lucide="wallet" style="width: 18px; height: 18px; color: var(--color-accent);"></i>
            <span>口座の管理</span>
          </div>
          <span style="font-size: 10px; background: var(--bg-hover); padding: 2px 8px; border-radius: 10px; color: var(--text-muted);">${accounts.length}件</span>
        </div>
        <div id="settings-accounts-list">
          ${accounts.sort((a,b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0) || (a.order || 0) - (b.order || 0)).map(acc => `
            <div class="settings-list-item draggable" data-id="${acc.id}" style="display: flex; align-items: center; padding: 14px 20px; border-bottom: 1px solid var(--border-light); cursor: pointer;" data-action="editAccount">
              <span class="settings-drag-handle" style="color: var(--border-color); cursor: grab; padding-right: 16px; font-size: 1.1rem;">⠿</span>
              ${renderIconHTML(acc.icon, acc.id, { size: 24 })}
              <span style="flex: 1; font-weight: 600; font-size: 1rem; color: var(--text-primary); margin-left: 12px;">${store.escapeHTML(acc.name)} ${acc.pinned ? '<span style="font-size: 12px; margin-left: 4px; vertical-align: middle;">📌</span>' : ''}</span>
              <span style="color: var(--text-muted); opacity: 0.4;">›</span>
            </div>
          `).join('')}
        </div>
        <div data-action="addAccount" style="padding: 16px; text-align: center; color: var(--color-accent); font-weight: 800; font-size: 0.85rem; cursor: pointer; background: rgba(99, 102, 241, 0.03); border-top: 1px solid var(--border-light);">＋ 新しい口座を追加</div>
      </div>

      <!-- カテゴリーセクション -->
      <div class="settings-category-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 16px; margin-bottom: 32px;">
        <!-- 支出カテゴリ -->
        <div style="background: var(--bg-card); border-radius: 20px; border: 1px solid var(--border-color); padding: 18px; box-shadow: var(--shadow-sm);">
          <div style="font-size: 0.75rem; font-weight: 800; color: var(--color-expense); margin-bottom: 16px; text-align:center; letter-spacing: 0.05em;">▼ 支出カテゴリ一覧</div>
          <div id="settings-expense-list">
            ${expenseCategories.sort((a,b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0) || (a.order || 0) - (b.order || 0)).map(cat => `
              <div class="settings-list-item draggable" data-id="${cat.id}" data-action="editCategory" style="display: flex; align-items: center; gap: 10px; padding: 12px 0; border-bottom: 1px solid var(--border-light); cursor: pointer;">
                <span class="settings-drag-handle" style="color: var(--border-color); cursor: grab; font-size: 13px;">⠿</span>
                ${renderIconHTML(cat.icon, cat.id, { size: 20 })}
                <span style="font-size: 0.9rem; font-weight: 600; color: var(--text-primary); flex:1; margin-left: 8px;">${store.escapeHTML(cat.name)} ${cat.pinned ? '📌' : ''}</span>
                <span style="color: var(--text-muted); opacity:0.3;">›</span>
              </div>
            `).join('')}
          </div>
          <div data-action="addCategory" data-type="expense" style="text-align: center; font-size: 0.8rem; color: var(--color-accent); margin-top: 14px; cursor: pointer; font-weight: 800;">＋ カテゴリの追加</div>
        </div>
        
        <!-- 収入カテゴリ -->
        <div style="background: var(--bg-card); border-radius: 20px; border: 1px solid var(--border-color); padding: 18px; box-shadow: var(--shadow-sm);">
          <div style="font-size: 0.75rem; font-weight: 800; color: var(--color-income); margin-bottom: 16px; text-align:center; letter-spacing: 0.05em;">▲ 収入カテゴリ一覧</div>
          <div id="settings-income-list">
            ${incomeCategories.sort((a,b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0) || (a.order || 0) - (b.order || 0)).map(cat => `
              <div class="settings-list-item draggable" data-id="${cat.id}" data-action="editCategory" style="display: flex; align-items: center; gap: 10px; padding: 12px 0; border-bottom: 1px solid var(--border-light); cursor: pointer;">
                <span class="settings-drag-handle" style="color: var(--border-color); cursor: grab; font-size: 13px;">⠿</span>
                ${renderIconHTML(cat.icon, cat.id, { size: 20 })}
                <span style="font-size: 0.9rem; font-weight: 600; color: var(--text-primary); flex:1; margin-left: 8px;">${store.escapeHTML(cat.name)} ${cat.pinned ? '📌' : ''}</span>
                <span style="color: var(--text-muted); opacity:0.3;">›</span>
              </div>
            `).join('')}
          </div>
          <div data-action="addCategory" data-type="income" style="text-align: center; font-size: 0.8rem; color: var(--color-accent); margin-top: 14px; cursor: pointer; font-weight: 800;">＋ カテゴリの追加</div>
        </div>
      </div>
      
      <!-- クラウド・同期管理 -->
      <div style="padding: 28px; background: linear-gradient(135deg, var(--bg-card) 0%, var(--bg-hover) 100%); border-radius: 24px; border: 1px solid var(--border-color); text-align: center; margin-bottom: 40px; box-shadow: var(--shadow-sm);">
        <div style="display: flex; justify-content: center; margin-bottom: 20px; color: var(--color-accent);">
          <i data-lucide="cloud-cog" style="width: 48px; height: 48px; stroke-width: 1.5px;"></i>
        </div>
        ${!auth.isLoggedIn() ? `
          <h3 style="font-size: 1.1rem; font-weight: 800; margin-bottom: 18px; color: var(--text-primary);">Googleクラウド同期</h3>
          <p style="font-size: 0.75rem; color: var(--text-muted); margin-bottom: 24px;">スプレッドシートと連携して<br>データを安全にバックアップ・共有できます。</p>
          <button class="btn btn-primary" data-action="googleLogin" style="width: 100%; max-width: 260px; border-radius: 50px; font-weight: 800; padding: 14px; margin-bottom: 16px; display: inline-flex; align-items: center; justify-content: center; gap: 8px;">
            <i data-lucide="log-in" style="width: 18px; height: 18px;"></i> 連携を開始する
          </button>
        ` : `
          <div style="font-size: 0.7rem; color: var(--text-muted); margin-bottom: 8px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.1em;">Connected Cloud ID</div>
          <div style="font-size: 10px; font-family: monospace; opacity: 0.8; margin-bottom: 24px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; padding: 0 15px; color: var(--color-accent);">${sheetId}</div>
          <div style="display: flex; gap: 12px; justify-content: center; max-width: 320px; margin: 0 auto;">
            <button data-action="syncPull" style="flex:1; padding: 14px; border-radius: 14px; border: 1px solid var(--border-color); background: var(--bg-card); font-size: 0.85rem; font-weight: 800; cursor: pointer; color: var(--text-primary); display: flex; align-items: center; justify-content: center; gap: 6px;">
              <i data-lucide="download" style="width: 16px; height: 16px;"></i> 読込
            </button>
            <button data-action="syncPush" style="flex:1; padding: 14px; border-radius: 14px; border: none; background: var(--color-accent); color: white; font-size: 0.85rem; font-weight: 800; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 6px;">
              <i data-lucide="upload" style="width: 16px; height: 16px;"></i> 保存
            </button>
          </div>
        `}
      </div>

      <!-- デンジャーゾーン -->
      <div style="text-align: center; padding-bottom: 40px;">
        <button data-action="clearData" style="background: transparent; border: none; color: var(--color-danger); font-size: 0.75rem; opacity: 0.5; text-decoration: underline; cursor: pointer; font-weight: 500;">アプリの全データを初期化</button>
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
    <div class="premium-modal-sheet slideUp" style="max-width: 450px;">
      <div class="modal-drag-handle"></div>
      <div class="modal-header-v3">
        <h3 class="modal-title-v3">${isNew ? '口座追加' : '口座編集'}</h3>
        <button class="modal-close-v3" data-action="closeModal">&times;</button>
      </div>
      <div class="modal-body-v3">
        <div class="form-group-v3">
          <label>口座名</label>
          <input type="text" id="acc-name" class="input-v3" value="${acc?.name || ''}" placeholder="例: 楽天カード">
        </div>
        
        <div class="form-group-v3">
          <label>アイコン設定</label>
          <div style="display: flex; gap: 12px; margin-bottom: 12px; align-items: center;">
            <div id="acc-icon-preview">${renderIconHTML(acc?.icon || 'lucide:wallet', id, { size: 32 })}</div>
            <input type="text" id="acc-icon" class="input-v3" value="${acc?.icon || 'lucide:wallet'}" style="flex: 1; font-family: monospace; font-size: 0.8rem;" placeholder="lucide:name or emoji">
          </div>
          <div class="icon-picker-grid-v3">
            ${RECOMMENDED_LUCIDE_ICONS.map(icon => `
              <div class="icon-option-v3" data-icon="${icon}">${renderIconHTML(icon, 'preview', { size: 20 })}</div>
            `).join('')}
            ${RECOMMENDED_EMOJIS.slice(0, 12).map(e => `
              <div class="icon-option-v3" data-icon="${e}" style="font-size: 1.2rem; display: flex; align-items: center; justify-content: center;">${e}</div>
            `).join('')}
          </div>
        </div>

        <div class="form-group-v3">
          <label>初期残高</label>
          <input type="number" id="acc-balance" class="input-v3" value="${acc?.initialBalance || 0}">
        </div>

        <div style="display: flex; align-items: center; gap: 10px; padding: 12px; background: var(--bg-hover); border-radius: 12px; margin-top: 10px;">
          <input type="checkbox" id="acc-pinned" ${acc?.pinned ? 'checked' : ''} style="width: 18px; height: 18px;">
          <label for="acc-pinned" style="font-size: 0.85rem; font-weight: 700; cursor: pointer; flex: 1;">📌 上位に固定する</label>
        </div>
      </div>
      <div class="modal-footer-v3">
        ${!isNew ? '<button class="btn-danger-v3" data-action="deleteItem" style="margin-right: auto;">削除</button>' : ''}
        <button class="modal-apply-btn-v3" data-action="saveItem">${isNew ? '追加' : '保存'}</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);
  if (window.lucide) lucide.createIcons();

  overlay.addEventListener('click', (e) => {
    const iconOpt = e.target.closest('.icon-option-v3');
    if (iconOpt) {
      const newIcon = iconOpt.dataset.icon;
      document.getElementById('acc-icon').value = newIcon;
      document.getElementById('acc-icon-preview').innerHTML = renderIconHTML(newIcon, id || 'new', { size: 32 });
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
        pinned: document.getElementById('acc-pinned').checked
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
    <div class="premium-modal-sheet slideUp" style="max-width: 450px;">
      <div class="modal-drag-handle"></div>
      <div class="modal-header-v3">
        <h3 class="modal-title-v3">カテゴリ管理</h3>
        <button class="modal-close-v3" data-action="closeModal">&times;</button>
      </div>
      <div class="modal-body-v3">
        <div class="form-group-v3">
          <label>名前</label>
          <input type="text" id="cat-name" class="input-v3" value="${cat?.name || ''}" placeholder="例: 食費">
        </div>

        <div class="form-group-v3">
          <label>アイコン設定</label>
          <div style="display: flex; gap: 12px; margin-bottom: 12px; align-items: center;">
            <div id="cat-icon-preview">${renderIconHTML(cat?.icon || 'lucide:folder', id, { size: 32 })}</div>
            <input type="text" id="cat-icon" class="input-v3" value="${cat?.icon || 'lucide:folder'}" style="flex: 1; font-family: monospace; font-size: 0.8rem;" placeholder="lucide:name or emoji">
          </div>
          <div class="icon-picker-grid-v3">
            ${RECOMMENDED_LUCIDE_ICONS.map(icon => `
              <div class="icon-option-v3" data-icon="${icon}">${renderIconHTML(icon, 'preview', { size: 20 })}</div>
            `).join('')}
            ${RECOMMENDED_EMOJIS.slice(0, 12).map(e => `
              <div class="icon-option-v3" data-icon="${e}" style="font-size: 1.2rem; display: flex; align-items: center; justify-content: center;">${e}</div>
            `).join('')}
          </div>
        </div>

        <div style="display: flex; align-items: center; gap: 10px; padding: 12px; background: var(--bg-hover); border-radius: 12px; margin-top: 10px;">
          <input type="checkbox" id="cat-pinned" ${cat?.pinned ? 'checked' : ''} style="width: 18px; height: 18px;">
          <label for="cat-pinned" style="font-size: 0.85rem; font-weight: 700; cursor: pointer; flex: 1;">📌 上位に固定する</label>
        </div>
      </div>
      <div class="modal-footer-v3">
        ${!isNew ? '<button class="btn-danger-v3" data-action="deleteItem" style="margin-right: auto;">削除</button>' : ''}
        <button class="modal-apply-btn-v3" data-action="saveItem">${isNew ? '追加' : '保存'}</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);
  if (window.lucide) lucide.createIcons();

  overlay.addEventListener('click', (e) => {
    const iconOpt = e.target.closest('.icon-option-v3');
    if (iconOpt) {
      const newIcon = iconOpt.dataset.icon;
      document.getElementById('cat-icon').value = newIcon;
      document.getElementById('cat-icon-preview').innerHTML = renderIconHTML(newIcon, id || 'new', { size: 32 });
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
        pinned: document.getElementById('cat-pinned').checked
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
