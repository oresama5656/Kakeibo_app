// ============================================
// 設定画面 (モダン・ダッシュボード 最終安定版)
// ============================================

import * as store from '../store.js';
import * as auth from '../auth.js';
import { RECOMMENDED_EMOJIS } from '../data.js';

export function render(container) {
  if (!container) return;
  
  const settings = store.getSettings();
  const accounts = store.getAccounts();
  const categories = store.getCategories();
  const shortcuts = store.getShortcuts();
  const expenseCategories = categories.filter(c => c.type === 'expense');
  const incomeCategories = categories.filter(c => c.type === 'income');
  const sheetId = localStorage.getItem('kakeibo_sheet_id');

  container.innerHTML = `
    <div class="settings-screen modern-settings">
      <div class="settings-header-hero" style="text-align: center; padding: 30px 0 10px;">
        <div style="font-size: 3rem; margin-bottom: 10px;">⚙️</div>
        <h2 style="font-size: 1.4rem; font-weight: 800; margin:0;">アプリ設定</h2>
        <div style="font-size: 10px; color: var(--text-muted); margin-top: 5px;">Kakeibo v5.3 Cloud</div>
      </div>

      <div class="settings-quick-actions" style="display: flex; justify-content: center; gap: 20px; margin: 20px 0;">
        <div class="quick-action" data-action="toggleDarkMode" style="cursor: pointer; text-align: center;">
          <div style="width: 45px; height: 45px; background: var(--bg-card); border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 1.2rem; border: 1px solid var(--border-color);">${getDarkModeActive(settings) ? '🌙' : '☀️'}</div>
          <div style="font-size: 9px; margin-top: 4px; font-weight: bold;">テーマ</div>
        </div>
        <div class="quick-action" data-action="exportData" style="cursor: pointer; text-align: center;">
          <div style="width: 45px; height: 45px; background: var(--bg-card); border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 1.2rem; border: 1px solid var(--border-color);">📤</div>
          <div style="font-size: 9px; margin-top: 4px; font-weight: bold;">保存</div>
        </div>
      </div>

      <div class="settings-main-card" style="background: var(--bg-card); border-radius: 20px; border: 1px solid var(--border-color); overflow: hidden; margin-bottom: 20px;">
        <div style="padding: 15px 20px; font-size: 0.8rem; font-weight: bold; border-bottom: 1px solid var(--border-light); background: rgba(0,0,0,0.02);">💸 口座の管理</div>
        <div id="settings-accounts-list">
          ${accounts.sort((a,b) => a.order - b.order).map(acc => `
            <div class="settings-list-item draggable" data-id="${acc.id}" style="display: flex; align-items: center; padding: 12px 20px; border-bottom: 1px solid var(--border-light); cursor: pointer;" data-action="editAccount">
              <span class="settings-drag-handle" style="color: var(--border-color); cursor: grab; padding-right: 15px;">⠿</span>
              <span style="font-size: 1.2rem; margin-right: 15px;">${acc.icon}</span>
              <span style="flex: 1; font-weight: 600; font-size: 0.95rem;">${acc.name}</span>
              ${acc.pinned ? '<span style="font-size: 10px; color: var(--color-accent);">📌</span>' : ''}
              <span style="color: var(--text-muted); margin-left: 10px;">›</span>
            </div>
          `).join('')}
        </div>
        <div data-action="addAccount" style="padding: 15px; text-align: center; color: var(--color-accent); font-weight: bold; font-size: 0.85rem; cursor: pointer; background: rgba(99, 102, 241, 0.02);">＋ 口座を追加</div>
      </div>

      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 20px;">
        <div style="background: var(--bg-card); border-radius: 20px; border: 1px solid var(--border-color); padding: 15px; text-align: center;">
          <div style="font-size: 0.7rem; font-weight: bold; color: var(--color-expense); margin-bottom: 10px;">支出カテゴリ</div>
          <button data-action="addCategory" data-type="expense" style="width: 100%; padding: 8px; border-radius: 8px; border: none; background: var(--bg-hover); color: var(--color-accent); font-size: 0.75rem; font-weight: bold; cursor: pointer;">全表示・追加</button>
        </div>
        <div style="background: var(--bg-card); border-radius: 20px; border: 1px solid var(--border-color); padding: 15px; text-align: center;">
          <div style="font-size: 0.7rem; font-weight: bold; color: var(--color-income); margin-bottom: 10px;">収入カテゴリ</div>
          <button data-action="addCategory" data-type="income" style="width: 100%; padding: 8px; border-radius: 8px; border: none; background: var(--bg-hover); color: var(--color-accent); font-size: 0.75rem; font-weight: bold; cursor: pointer;">全表示・追加</button>
        </div>
      </div>

      <div style="padding: 20px; background: linear-gradient(135deg, var(--bg-card) 0%, var(--bg-hover) 100%); border-radius: 20px; border: 1px solid var(--border-color); text-align: center;">
        <div style="font-size: 1.5rem; margin-bottom: 10px;">☁️</div>
        ${!auth.isLoggedIn() ? `
          <button class="btn btn-primary" data-action="googleLogin" style="width: 100%; border-radius: 50px;">Google連携を開始</button>
        ` : `
          <div style="font-size: 10px; color: var(--text-muted); margin-bottom: 5px;">Connected Spreadsheet</div>
          <div style="font-size: 9px; font-family: monospace; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; margin-bottom: 15px;">${sheetId}</div>
          <div style="display: flex; gap: 8px;">
            <button data-action="syncPull" style="flex:1; padding: 10px; border-radius: 10px; border: 1px solid var(--border-color); background: var(--bg-card); font-size: 0.8rem; font-weight: bold; cursor: pointer;">📥 読込</button>
            <button data-action="syncPush" style="flex:1; padding: 10px; border-radius: 10px; border: none; background: var(--color-accent); color: white; font-size: 0.8rem; font-weight: bold; cursor: pointer;">📤 保存</button>
          </div>
          <div data-action="googleLogout" style="margin-top: 15px; font-size: 0.7rem; color: var(--color-danger); text-decoration: underline; cursor: pointer;">連携を解除</div>
        `}
      </div>

      <div style="margin: 30px 0; text-align: center;">
        <button data-action="clearData" style="background: transparent; border: none; color: var(--color-danger); font-size: 0.7rem; opacity: 0.6; text-decoration: underline; cursor: pointer;">全データのリセット</button>
      </div>

    </div>
  `;

  // イベント登録
  container.addEventListener('click', handleClick);
  initSortable('settings-accounts-list', 'account');
}

function handleClick(e) {
  const target = e.target.closest('[data-action]');
  if (!target) return;
  const action = target.dataset.action;

  switch (action) {
    case 'editAccount': 
      const id = e.target.closest('.draggable')?.dataset.id;
      if (id) showAccountModal(id); 
      break;
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

// -------------------------------------------------------------
// 設定画面用ヘルパー
// -------------------------------------------------------------

function getDarkModeActive(settings) {
  if (settings.darkMode === 'dark') return true;
  if (settings.darkMode === 'light') return false;
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

function initSortable(id, type) {
  const el = document.getElementById(id);
  if (!el || !window.Sortable) return;
  window.Sortable.create(el, {
    handle: '.settings-drag-handle',
    animation: 200,
    onEnd: () => {
      const items = Array.from(el.querySelectorAll('.draggable'));
      const ids = items.map(item => item.dataset.id);
      if (type === 'account') store.reorderAccounts(ids);
      else store.reorderCategories(ids);
      window.showToast?.('並べ替えを保存しました');
    }
  });
}

async function handleGoogleLogin() {
  try {
    await auth.signIn();
    const result = await auth.getOrCreateSpreadsheet();
    if (result.id) {
       refresh();
       if (result.isNew) await store.syncToCloud(result.id);
       else {
         if(confirm('クラウドのデータを読み込みますか？')) {
           await store.loadFromCloud(result.id);
           window.location.reload();
         }
       }
    }
  } catch (err) { window.showToast?.('連携に失敗しました', 'error'); }
}

async function handleLogout() { if (confirm('解除しますか？')) auth.signOut(); }

async function handleSyncPush() {
  const sId = localStorage.getItem('kakeibo_sheet_id');
  if (!sId) return;
  try {
    window.showToast?.('同期中...', 'info');
    await store.syncToCloud(sId);
    window.showToast?.('完了 ✓');
  } catch (err) { window.showToast?.('失敗しました', 'error'); }
}

async function handleSyncPull() {
  const sId = localStorage.getItem('kakeibo_sheet_id');
  if (!sId || !confirm('クラウドのデータで上書きしますか？')) return;
  try {
    await store.loadFromCloud(sId);
    window.location.reload();
  } catch (err) { window.showToast?.('失敗しました', 'error'); refresh(); }
}

function toggleDarkMode() {
  const settings = store.getSettings();
  let next = settings.darkMode === 'dark' ? 'light' : settings.darkMode === 'light' ? 'auto' : 'dark';
  store.updateSettings({ darkMode: next });
  applyTheme(next);
  refresh();
}

export function applyTheme(mode) {
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
    const r = new FileReader();
    r.onload = (ev) => {
      try {
        if (confirm('インポートしますか？')) {
          store.importAllData(JSON.parse(ev.target.result));
          window.location.reload();
        }
      } catch { window.showToast?.('エラー', 'error'); }
    };
    r.readAsText(file);
  };
  input.click();
}

function clearData() { if (confirm('リセットしますか？')) { store.clearAllData(); window.location.reload(); } }

function showAccountModal(id) {
  const accounts = store.getAccounts();
  const acc = id ? accounts.find(a => a.id === id) : null;
  const isNew = !acc;
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal-content" style="max-width: 400px; padding: 25px;">
      <div class="modal-header"><h3 class="modal-title">${isNew ? '口座追加' : '口座編集'}</h3><button class="modal-close" data-action="closeModal">✕</button></div>
      <div class="form-group"><label class="form-label">名前</label><input class="form-input" type="text" id="acc-name" value="${acc?.name || ''}"></div>
      <div class="form-group"><label class="form-label">アイコン</label>
        <input class="form-input" type="text" id="acc-icon" value="${acc?.icon || '💰'}" style="width: 80px; text-align: center; font-size: 1.5rem;">
        <div class="emoji-picker-grid" style="display: grid; grid-template-columns: repeat(8, 1fr); gap: 5px; margin-top: 10px; cursor: pointer; max-height: 150px; overflow-y: auto;">
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
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal-content" style="max-width: 400px; padding: 25px;">
      <div class="modal-header"><h3 class="modal-title">カテゴリ管理</h3><button class="modal-close" data-action="closeModal">✕</button></div>
      <div class="form-group"><label class="form-label">名前</label><input class="form-input" type="text" id="cat-name" value="${cat?.name || ''}"></div>
      <div class="form-actions">${!isNew ? '<button class="btn btn-danger" data-action="deleteItem">削除</button>' : ''}<button class="btn btn-primary" data-action="saveItem" style="flex:2;">保存</button></div>
    </div>
  `;
  document.body.appendChild(overlay);
  overlay.addEventListener('click', (e) => {
    const act = e.target.closest('[data-action]')?.dataset.action;
    if (act === 'closeModal' || e.target === overlay) { overlay.remove(); return; }
    if (act === 'saveItem') { overlay.remove(); refresh(); }
  });
}

function refresh() {
  const container = document.getElementById('screen-settings');
  if (container) { container.removeEventListener('click', handleClick); render(container); }
}
