// ============================================
// 設定画面 (モダン・ダッシュボード完全版)
// ============================================

import * as store from '../store.js';
import * as auth from '../auth.js';
import { RECOMMENDED_EMOJIS } from '../data.js';

export function render(container) {
  const settings = store.getSettings();
  const accounts = store.getAccounts();
  const categories = store.getCategories();
  const shortcuts = store.getShortcuts();

  const expenseCategories = categories.filter(c => c.type === 'expense');
  const incomeCategories = categories.filter(c => c.type === 'income');
  const sheetId = localStorage.getItem('kakeibo_sheet_id');

  container.innerHTML = `
    <div class="settings-screen modern-settings">
      
      <!-- 1. Header Area (Centered Profile) -->
      <div class="settings-header-hero" style="text-align: center; padding: 40px 0 20px; animation: fadeIn 0.5s ease-out;">
        <div class="app-avatar-centered" style="width: 80px; height: 80px; background: var(--bg-hover); border-radius: 50%; margin: 0 auto 16px; display: flex; align-items: center; justify-content: center; font-size: 2.5rem; box-shadow: var(--shadow-md); border: 4px solid var(--bg-card);">
           ⚙️
        </div>
        <h2 style="font-size: 1.5rem; font-weight: 800; color: var(--text-primary); margin-bottom: 4px;">アプリ設定</h2>
        <p style="font-size: 0.75rem; color: var(--text-muted); margin-bottom: 12px;">Sync Engine v5.1</p>
        
        <div class="cloud-status-pill" style="display: inline-flex; align-items: center; gap: 6px; padding: 6px 16px; border-radius: 50px; font-size: 0.7rem; font-weight: 700; ${auth.isLoggedIn() ? 'background: rgba(16, 185, 129, 0.1); color: var(--color-income); border: 1px solid rgba(16, 185, 129, 0.2);' : 'background: var(--bg-hover); color: var(--text-muted); border: 1px solid var(--border-color);'}">
          ${auth.isLoggedIn() ? '● Google同期中' : '○ 未ログイン'}
        </div>
      </div>

      <!-- 2. Fast Actions (Horizontal Icons) -->
      <div class="settings-quick-actions" style="display: flex; justify-content: center; gap: 24px; margin-bottom: 32px;">
        <div class="quick-action-item" data-action="toggleDarkMode" style="cursor: pointer; text-align: center;">
          <div style="width: 50px; height: 50px; background: var(--bg-card); border-radius: 14px; border: 1px solid var(--border-color); display: flex; align-items: center; justify-content: center; font-size: 1.4rem; margin-bottom: 6px;">
            ${getDarkModeActive(settings) ? '🌙' : '☀️'}
          </div>
          <div style="font-size: 0.65rem; font-weight: bold; color: var(--text-secondary);">テーマ</div>
        </div>
        <div class="quick-action-item" data-action="exportData" style="cursor: pointer; text-align: center;">
          <div style="width: 50px; height: 50px; background: var(--bg-card); border-radius: 14px; border: 1px solid var(--border-color); display: flex; align-items: center; justify-content: center; font-size: 1.4rem; margin-bottom: 6px;">
            📤
          </div>
          <div style="font-size: 0.65rem; font-weight: bold; color: var(--text-secondary);">出力</div>
        </div>
        <div class="quick-action-item" data-action="importData" style="cursor: pointer; text-align: center;">
          <div style="width: 50px; height: 50px; background: var(--bg-card); border-radius: 14px; border: 1px solid var(--border-color); display: flex; align-items: center; justify-content: center; font-size: 1.4rem; margin-bottom: 6px;">
            📥
          </div>
          <div style="font-size: 0.65rem; font-weight: bold; color: var(--text-secondary);">入力</div>
        </div>
      </div>

      <!-- 3. Account List (Left Aligned Card) -->
      <div class="settings-section-card" style="background: var(--bg-card); border-radius: 20px; border: 1px solid var(--border-color); margin-bottom: 24px; box-shadow: var(--shadow-sm); overflow: hidden;">
        <div style="padding: 16px 20px; font-size: 0.85rem; font-weight: 800; border-bottom: 1px solid var(--border-light); color: var(--text-primary);">💴 口座の管理</div>
        <div id="settings-accounts-list">
          ${accounts.sort((a,b) => a.order - b.order).map(acc => `
            <div class="settings-list-item draggable" data-id="${acc.id}" style="display: flex; align-items: center; padding: 14px 20px; border-bottom: 1px solid var(--border-light); cursor: pointer;">
              <span class="settings-drag-handle" style="color: var(--border-color); cursor: grab; padding-right: 16px;">⠿</span>
              <div class="item-icon-circle" style="width: 36px; height: 36px; background: var(--bg-input); border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 1.2rem; margin-right: 16px; flex-shrink: 0;">${acc.icon}</div>
              <div class="item-info-main" data-action="editAccount" data-id="${acc.id}" style="flex: 1; min-width: 0;">
                <div style="font-weight: 600; font-size: 0.95rem; line-height: 1.2;">${acc.name}</div>
                ${acc.pinned ? '<div style="font-size: 10px; color: var(--color-accent); font-weight: bold; margin-top: 2px;">📌 PINNED</div>' : ''}
              </div>
              <div style="color: var(--text-muted); font-size: 0.9rem;">›</div>
            </div>
          `).join('')}
        </div>
        <div class="list-footer-action" data-action="addAccount" style="padding: 16px; text-align: center; color: var(--color-accent); font-weight: bold; font-size: 0.85rem; cursor: pointer; background: rgba(99, 102, 241, 0.02);">
          ＋ 新しい口座を追加
        </div>
      </div>

      <!-- 4. Category Grid (Horizontal Tiles) -->
      <div class="grid-sections" style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 32px;">
        <!-- Expense -->
        <div style="background: var(--bg-card); border-radius: 20px; border: 1px solid var(--border-color); padding: 16px;">
          <div style="font-size: 0.7rem; font-weight: 800; color: var(--color-expense); margin-bottom: 12px; text-align: center; text-transform: uppercase;">支出カテゴリー</div>
          <div id="settings-expense-list">
             ${expenseCategories.slice(0, 4).map(c => `
               <div data-action="editCategory" data-id="${c.id}" style="display: flex; align-items: center; gap: 8px; padding: 6px 0; font-size: 0.8rem; cursor: pointer;">
                 <span>${c.icon}</span>
                 <span style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${c.name}</span>
               </div>
             `).join('')}
          </div>
          <button data-action="addCategory" data-type="expense" style="width: 100%; border: none; background: var(--bg-hover); color: var(--color-accent); font-size: 0.7rem; font-weight: bold; padding: 6px; border-radius: 8px; margin-top: 10px; cursor: pointer;">全表示・追加</button>
        </div>
        
        <!-- Income -->
        <div style="background: var(--bg-card); border-radius: 20px; border: 1px solid var(--border-color); padding: 16px;">
          <div style="font-size: 0.7rem; font-weight: 800; color: var(--color-income); margin-bottom: 12px; text-align: center; text-transform: uppercase;">収入カテゴリー</div>
          <div id="settings-income-list">
             ${incomeCategories.slice(0, 4).map(c => `
               <div data-action="editCategory" data-id="${c.id}" style="display: flex; align-items: center; gap: 8px; padding: 6px 0; font-size: 0.8rem; cursor: pointer;">
                 <span>${c.icon}</span>
                 <span style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${c.name}</span>
               </div>
             `).join('')}
          </div>
          <button data-action="addCategory" data-type="income" style="width: 100%; border: none; background: var(--bg-hover); color: var(--color-accent); font-size: 0.7rem; font-weight: bold; padding: 6px; border-radius: 8px; margin-top: 10px; cursor: pointer;">全表示・追加</button>
        </div>
      </div>

      <!-- 5. Cloud Connection (Center Alignment) -->
      <div style="padding: 24px; background: linear-gradient(to bottom, var(--bg-card), var(--bg-input)); border-radius: 24px; border: 1px solid var(--border-color); text-align: center; margin-bottom: 40px;">
        <div style="font-size: 2rem; margin-bottom: 12px;">☁️</div>
        ${!auth.isLoggedIn() ? `
          <h3 style="font-size: 0.95rem; font-weight: 800; margin-bottom: 16px;">Google連携でデータを保護</h3>
          <button class="btn btn-primary" data-action="googleLogin" style="width: 100%; max-width: 220px; border-radius: 50px; font-weight: bold;">Googleでログイン</button>
        ` : `
          <div style="font-size: 0.65rem; color: var(--text-muted); margin-bottom: 4px;">CONNECTED SPREADSHEET</div>
          <div style="font-size: 0.75rem; font-family: monospace; opacity: 0.7; margin-bottom: 20px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; padding: 0 20px;">${sheetId}</div>
          <div style="display: flex; gap: 10px; justify-content: center;">
            <button data-action="syncPull" style="background: var(--bg-primary); border: 1px solid var(--border-color); padding: 8px 16px; border-radius: 12px; font-size: 0.75rem; font-weight: bold; cursor: pointer;">📥 読込</button>
            <button data-action="syncPush" style="background: var(--color-accent); color: white; border: none; padding: 8px 16px; border-radius: 12px; font-size: 0.75rem; font-weight: bold; cursor: pointer;">📤 保存</button>
          </div>
          <div data-action="googleLogout" style="margin-top: 20px; font-size: 0.7rem; color: var(--color-danger); cursor: pointer; opacity: 0.8; text-decoration: underline;">ログアウト</div>
        `}
      </div>

      <!-- 6. Danger Area -->
      <div style="text-align: center; margin-bottom: 40px;">
        <button data-action="clearData" style="background: transparent; border: none; color: var(--color-danger); opacity: 0.6; font-size: 0.7rem; text-decoration: underline; cursor: pointer;">全データをリセットする</button>
      </div>

    </div>
  `;

  container.addEventListener('click', handleClick);
  initSortable('settings-accounts-list', 'account');
}

function initSortable(id, type) {
  const el = document.getElementById(id);
  if (!el || !window.Sortable) return;

  window.Sortable.create(el, {
    handle: '.settings-drag-handle',
    animation: 200,
    ghostClass: 'sortable-ghost',
    onEnd: () => {
      const items = Array.from(el.querySelectorAll('.draggable'));
      const ids = items.map(item => item.dataset.id);
      if (type === 'account') store.reorderAccounts(ids);
      else store.reorderCategories(ids);
      window.showToast?.('並べ替えを保存しました');
    }
  });
}

function getDarkModeActive(settings) {
  if (settings.darkMode === 'dark') return true;
  if (settings.darkMode === 'light') return false;
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

async function handleClick(e) {
  const target = e.target.closest('[data-action]');
  if (!target) return;
  const action = target.dataset.action;

  switch (action) {
    case 'editAccount': showAccountModal(target.dataset.id); break;
    case 'addAccount': showAccountModal(null); break;
    case 'editCategory': showCategoryModal(target.dataset.id); break;
    case 'addCategory': showCategoryModal(null, target.dataset.type); break;
    case 'toggleDarkMode': toggleDarkMode(); break;
    case 'exportData': exportData(); break;
    case 'importData': importData(); break;
    case 'clearData': clearData(); break;
    case 'googleLogin': handleGoogleLogin(); break;
    case 'googleLogout': handleLogout(); break;
    case 'syncPush': handleSyncPush(); break;
    case 'syncPull': handleSyncPull(); break;
  }
}

async function handleLogout() { if (confirm('ログアウトしますか？')) auth.signOut(); }
async function handleSyncPush() {
  const sId = localStorage.getItem('kakeibo_sheet_id');
  if (!sId) return;
  try {
    window.showToast?.('同期中...', 'info');
    await store.syncToCloud(sId);
    window.showToast?.('同期完了 ✓');
  } catch (err) { 
    window.showToast?.('エラーが発生しました', 'error'); 
    refresh();
  }
}
async function handleSyncPull() {
  const sId = localStorage.getItem('kakeibo_sheet_id');
  if (!sId || !confirm('上書きしますか？')) return;
  try {
    await store.loadFromCloud(sId);
    window.showToast?.('完了！再起動します...');
    setTimeout(() => window.location.reload(), 1000);
  } catch (err) { window.showToast?.('失敗しました', 'error'); }
}

async function handleGoogleLogin() {
  try {
    await auth.signIn();
    const result = await auth.getOrCreateSpreadsheet();
    if (result.id) {
       refresh();
       if (result.isNew) await store.syncToCloud(result.id);
       else window.location.reload(); 
    }
  } catch (err) { window.showToast?.('認証エラー', 'error'); }
}

// --- Modals ---

function showAccountModal(id) {
  const accounts = store.getAccounts();
  const acc = id ? accounts.find(a => a.id === id) : null;
  const isNew = !acc;

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal-content" style="max-width: 400px; padding: 24px;">
      <div class="modal-header"><h3 class="modal-title">${isNew ? '口座追加' : '口座編集'}</h3><button class="modal-close" data-action="closeModal">✕</button></div>
      <div class="form-group"><label class="form-label">名前</label><input class="form-input" type="text" id="acc-name" value="${acc?.name || ''}"></div>
      <div class="form-group"><label class="form-label">アイコン</label>
        <input class="form-input" type="text" id="acc-icon" value="${acc?.icon || '💰'}" style="width: 80px; text-align: center; font-size: 1.5rem;">
        <div class="emoji-picker-grid" style="display: grid; grid-template-columns: repeat(8, 1fr); gap: 6px; margin-top: 12px; cursor: pointer; max-height: 150px; overflow-y: auto;">
          ${RECOMMENDED_EMOJIS.map(e => `<span class="emoji-option" data-emoji="${e}">${e}</span>`).join('')}
        </div>
      </div>
      <div class="form-group"><label class="form-label">初期残高</label><input class="form-input" type="number" id="acc-balance" value="${acc?.initialBalance || 0}"></div>
      <div class="form-actions">${!isNew ? '<button class="btn btn-danger" data-action="deleteItem">削除</button>' : ''}<button class="btn btn-primary" data-action="saveItem" style="flex:2;">保存</button></div>
    </div>
  `;
  document.body.appendChild(overlay);

  overlay.addEventListener('click', (e) => {
    const em = e.target.closest('.emoji-option');
    if (em) { document.getElementById('acc-icon').value = em.dataset.emoji; return; }
    const act = e.target.closest('[data-action]')?.dataset.action;
    if (act === 'closeModal' || e.target === overlay) { overlay.remove(); return; }
    if (act === 'deleteItem' && confirm('削除しますか？')) { store.deleteAccount(id); overlay.remove(); refresh(); return; }
    if (act === 'saveItem') {
      const data = {
        name: document.getElementById('acc-name').value.trim(),
        icon: document.getElementById('acc-icon').value.trim() || '💰',
        initialBalance: Number(document.getElementById('acc-balance').value) || 0,
        order: acc?.order || accounts.length + 1
      };
      if (data.name) {
        if (isNew) store.addAccount(data); else store.updateAccount(id, data);
        overlay.remove(); refresh();
      }
    }
  });
}

function showCategoryModal(id, type) {
  const categories = store.getCategories();
  const cat = id ? categories.find(c => c.id === id) : null;
  const isNew = !cat;
  const cType = cat?.type || type || 'expense';

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal-content" style="max-width: 400px; padding: 24px;">
      <div class="modal-header"><h3 class="modal-title">${isNew ? 'カテゴリ追加' : 'カテゴリ編集'}</h3><button class="modal-close" data-action="closeModal">✕</button></div>
      <div class="form-group"><label class="form-label">名前</label><input class="form-input" type="text" id="cat-name" value="${cat?.name || ''}"></div>
      <div class="form-group"><label class="form-label">アイコン</label>
        <input class="form-input" type="text" id="cat-icon" value="${cat?.icon || '📁'}" style="width: 80px; text-align: center; font-size: 1.5rem;">
        <div class="emoji-picker-grid" style="display: grid; grid-template-columns: repeat(8, 1fr); gap: 6px; margin-top: 12px; cursor: pointer; max-height: 150px; overflow-y: auto;">
          ${RECOMMENDED_EMOJIS.map(e => `<span class="emoji-option" data-emoji="${e}">${e}</span>`).join('')}
        </div>
      </div>
      <div class="form-group"><label class="form-label">種類</label><select class="form-input" id="cat-type"><option value="expense" ${cType === 'expense' ? 'selected' : ''}>支出</option><option value="income" ${cType === 'income' ? 'selected' : ''}>収入</option></select></div>
      <div class="form-actions">${!isNew ? '<button class="btn btn-danger" data-action="deleteItem">削除</button>' : ''}<button class="btn btn-primary" data-action="saveItem" style="flex:2;">保存</button></div>
    </div>
  `;
  document.body.appendChild(overlay);

  overlay.addEventListener('click', (e) => {
    const em = e.target.closest('.emoji-option');
    if (em) { document.getElementById('cat-icon').value = em.dataset.emoji; return; }
    const act = e.target.closest('[data-action]')?.dataset.action;
    if (act === 'closeModal' || e.target === overlay) { overlay.remove(); return; }
    if (act === 'deleteItem' && confirm('削除しますか？')) { store.deleteCategory(id); overlay.remove(); refresh(); return; }
    if (act === 'saveItem') {
      const data = {
        name: document.getElementById('cat-name').value.trim(),
        icon: document.getElementById('cat-icon').value.trim() || '📁',
        type: document.getElementById('cat-type').value,
        order: cat?.order || categories.length + 1
      };
      if (data.name) {
        if (isNew) store.addCategory(data); else store.updateCategory(id, data);
        overlay.remove(); refresh();
      }
    }
  });
}

function toggleDarkMode() {
  const settings = store.getSettings();
  let next = settings.darkMode === 'dark' ? 'light' : settings.darkMode === 'light' ? 'auto' : 'dark';
  store.updateSettings({ darkMode: next });
  applyTheme(next);
  refresh();
}

function applyTheme(mode) {
  if (mode === 'dark') document.documentElement.setAttribute('data-theme', 'dark');
  else if (mode === 'light') document.documentElement.setAttribute('data-theme', 'light');
  else document.documentElement.removeAttribute('data-theme');
}

function exportData() {
  const blob = new Blob([JSON.stringify(store.exportAllData(), null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'kakeibo_backup.json'; a.click();
  URL.revokeObjectURL(url);
}

function importData() {
  const input = document.createElement('input');
  input.type = 'file'; input.accept = '.json';
  input.onchange = (e) => {
    const file = e.target.files[0];
    const reader = new FileReader();
    reader.onload = (ev) => {
      if (confirm('インポートしますか？')) {
        store.importAllData(JSON.parse(ev.target.result));
        window.location.reload();
      }
    };
    reader.readAsText(file);
  };
  input.click();
}

function clearData() { if (confirm('リセットしますか？')) { store.clearAllData(); window.location.reload(); } }

function refresh() {
  const container = document.getElementById('screen-settings');
  if (container) { container.removeEventListener('click', handleClick); render(container); }
}
