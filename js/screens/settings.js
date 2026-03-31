// ============================================
// 設定画面 (v5.4 - カテゴリー表示完全復旧版)
// ============================================

import * as store from '../store.js';
import * as auth from '../auth.js';
import { RECOMMENDED_EMOJIS } from '../data.js';

export function render(container) {
  if (!container) return;
  
  const settings = store.getSettings();
  const accounts = store.getAccounts();
  const categories = store.getCategories();
  const expenseCategories = categories.filter(c => c.type === 'expense');
  const incomeCategories = categories.filter(c => c.type === 'income');
  const sheetId = localStorage.getItem('kakeibo_sheet_id');

  container.innerHTML = `
    <div class="settings-screen modern-settings">
      <div class="settings-header-hero" style="text-align: center; padding: 40px 0 20px;">
        <div style="font-size: 3.5rem; margin-bottom: 5px;">⚙️</div>
        <h2 style="font-size: 1.6rem; font-weight: 800; margin:0;">アプリ設定</h2>
        <div style="font-size: 12px; color: var(--text-muted); opacity: 0.7;">Sync Engine v5.4</div>
      </div>

      <div class="settings-quick-actions" style="display: flex; justify-content: center; gap: 24px; margin: 10px 0 30px;">
        <div class="quick-action" data-action="toggleDarkMode" style="cursor: pointer; text-align: center;">
          <div style="width: 50px; height: 50px; background: var(--bg-card); border-radius: 14px; display: flex; align-items: center; justify-content: center; font-size: 1.3rem; border: 1px solid var(--border-color); box-shadow: var(--shadow-sm);">${getDarkModeActive(settings) ? '🌙' : '☀️'}</div>
          <div style="font-size: 10px; margin-top: 6px; font-weight: bold; color: var(--text-secondary);">テーマ</div>
        </div>
        <div class="quick-action" data-action="exportData" style="cursor: pointer; text-align: center;">
          <div style="width: 50px; height: 50px; background: var(--bg-card); border-radius: 14px; display: flex; align-items: center; justify-content: center; font-size: 1.3rem; border: 1px solid var(--border-color); box-shadow: var(--shadow-sm);">📤</div>
          <div style="font-size: 10px; margin-top: 6px; font-weight: bold; color: var(--text-secondary);">出力</div>
        </div>
      </div>

      <!-- 口座セクション -->
      <div class="settings-section-card" style="background: var(--bg-card); border-radius: 20px; border: 1px solid var(--border-color); overflow: hidden; margin-bottom: 24px;">
        <div style="padding: 18px 20px; font-size: 0.85rem; font-weight: 800; border-bottom: 1px solid var(--border-light); color: var(--text-primary); display: flex; justify-content: space-between;">
          <span>💴 口座管理</span>
          <span style="opacity: 0.5;">● ${accounts.length}</span>
        </div>
        <div id="settings-accounts-list">
          ${accounts.sort((a,b) => a.order - b.order).map(acc => `
            <div class="settings-list-item draggable" data-id="${acc.id}" style="display: flex; align-items: center; padding: 14px 20px; border-bottom: 1px solid var(--border-light); cursor: pointer;" data-action="editAccount">
              <span class="settings-drag-handle" style="color: var(--border-color); cursor: grab; padding-right: 16px;">⠿</span>
              <span style="font-size: 1.3rem; margin-right: 16px;">${acc.icon}</span>
              <span style="flex: 1; font-weight: 600; font-size: 1rem; color: var(--text-primary);">${acc.name}</span>
              <span style="color: var(--text-muted); font-size: 1.1rem;">›</span>
            </div>
          `).join('')}
        </div>
        <div data-action="addAccount" style="padding: 16px; text-align: center; color: var(--color-accent); font-weight: bold; font-size: 0.9rem; cursor: pointer; background: rgba(99, 102, 241, 0.02); border-top: 1px solid var(--border-light);">＋ 新しい口座を追加</div>
      </div>

      <!-- カテゴリーセクション -->
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 24px;">
        <!-- 支出 -->
        <div style="background: var(--bg-card); border-radius: 20px; border: 1px solid var(--border-color); padding: 16px;">
          <div style="font-size: 0.7rem; font-weight: 800; color: var(--color-expense); margin-bottom: 12px; text-align:center;">支出カテゴリ</div>
          <div id="settings-expense-list">
            ${expenseCategories.map(cat => `
              <div data-action="editCategory" data-id="${cat.id}" style="display: flex; align-items: center; gap: 10px; padding: 10px 0; border-bottom: 1px solid var(--border-light); cursor: pointer;">
                <span style="font-size: 1.1rem;">${cat.icon}</span>
                <span style="font-size: 0.85rem; font-weight: 500; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; flex:1;">${cat.name}</span>
                <span style="color: var(--text-muted); opacity:0.5;">›</span>
              </div>
            `).join('')}
          </div>
          <div data-action="addCategory" data-type="expense" style="text-align: center; font-size: 0.75rem; color: var(--color-accent); margin-top: 12px; cursor: pointer; font-weight: bold;">＋ 追加</div>
        </div>
        <!-- 収入 -->
        <div style="background: var(--bg-card); border-radius: 20px; border: 1px solid var(--border-color); padding: 16px;">
          <div style="font-size: 0.7rem; font-weight: 800; color: var(--color-income); margin-bottom: 12px; text-align:center;">収入カテゴリ</div>
          <div id="settings-income-list">
            ${incomeCategories.map(cat => `
              <div data-action="editCategory" data-id="${cat.id}" style="display: flex; align-items: center; gap: 10px; padding: 10px 0; border-bottom: 1px solid var(--border-light); cursor: pointer;">
                <span style="font-size: 1.1rem;">${cat.icon}</span>
                <span style="font-size: 0.85rem; font-weight: 500; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; flex:1;">${cat.name}</span>
                <span style="color: var(--text-muted); opacity:0.5;">›</span>
              </div>
            `).join('')}
          </div>
          <div data-action="addCategory" data-type="income" style="text-align: center; font-size: 0.75rem; color: var(--color-accent); margin-top: 12px; cursor: pointer; font-weight: bold;">＋ 追加</div>
        </div>
      </div>

      <!-- クラウド連携 -->
      <div style="padding: 24px; background: linear-gradient(135deg, var(--bg-card) 0%, var(--bg-hover) 100%); border-radius: 20px; border: 1px solid var(--border-color); text-align: center; margin-bottom: 40px;">
        <div style="font-size: 2.5rem; margin-bottom: 12px;">☁️</div>
        ${!auth.isLoggedIn() ? `
          <h3 style="font-size: 1rem; font-weight: 800; margin-bottom: 16px;">Google連携でバックアップ</h3>
          <button class="btn btn-primary" data-action="googleLogin" style="width: 100%; max-width: 240px; border-radius: 50px;">Googleで開始</button>
        ` : `
          <div style="font-size: 11px; color: var(--text-muted); margin-bottom: 6px;">Connected Sheet ID</div>
          <div style="font-size: 10px; font-family: monospace; opacity: 0.7; margin-bottom: 20px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; padding: 0 10px; color: var(--color-accent);">${sheetId}</div>
          <div style="display: flex; gap: 10px; justify-content: center;">
            <button data-action="syncPull" style="flex:1; padding: 12px; border-radius: 12px; border: 1px solid var(--border-color); background: var(--bg-card); font-size: 0.8rem; font-weight: bold; cursor: pointer;">📥 読込</button>
            <button data-action="syncPush" style="flex:1; padding: 12px; border-radius: 12px; border: none; background: var(--color-accent); color: white; font-size: 0.8rem; font-weight: bold; cursor: pointer;">📤 保存</button>
          </div>
          <div data-action="googleLogout" style="margin-top: 20px; font-size: 0.75rem; color: var(--color-danger); text-decoration: underline; cursor: pointer; opacity: 0.8;">ログアウト</div>
        `}
      </div>

      <div style="text-align: center; margin-bottom: 40px;">
        <button data-action="clearData" style="background: transparent; border: none; color: var(--color-danger); font-size: 0.75rem; opacity: 0.6; text-decoration: underline; cursor: pointer;">全データを初期化する</button>
      </div>
    </div>
  `;

  container.addEventListener('click', handleClick);
  initSortable('settings-accounts-list', 'account');
}

async function handleClick(e) {
  const target = e.target.closest('[data-action]');
  if (!target) return;
  const action = target.dataset.action;

  switch (action) {
    case 'editAccount': 
      const accId = e.target.closest('.draggable')?.dataset.id;
      if (accId) showAccountModal(accId); 
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
// モーダル・ダイアログ処理 (復旧版)
// -------------------------------------------------------------

function showAccountModal(id) {
  const accounts = store.getAccounts();
  const acc = id ? accounts.find(a => a.id === id) : null;
  const isNew = !acc;
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal-content" style="max-width: 400px; padding: 25px; animation: modalEnter 0.3s ease-out;">
      <div class="modal-header"><h3 class="modal-title">${isNew ? '口座追加' : '口座編集'}</h3><button class="modal-close" data-action="closeModal">✕</button></div>
      <div class="form-group"><label class="form-label">口座名</label><input class="form-input" type="text" id="acc-name" value="${acc?.name || ''}" placeholder="例: 生活費口座"></div>
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
    if (act === 'deleteItem' && confirm('口座を削除しますか？')) { store.deleteAccount(id); overlay.remove(); refresh(); return; }
    if (act === 'saveItem') {
      const data = {
        name: document.getElementById('acc-name').value.trim(),
        icon: document.getElementById('acc-icon').value.trim() || '💰',
        initialBalance: Number(document.getElementById('acc-balance').value) || 0,
        order: acc?.order || accounts.length + 1
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
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal-content" style="max-width: 400px; padding: 25px; animation: modalEnter 0.3s ease-out;">
      <div class="modal-header"><h3 class="modal-title">カテゴリ${isNew ? '追加' : '編集'}</h3><button class="modal-close" data-action="closeModal">✕</button></div>
      <div class="form-group"><label class="form-label">カテゴリ名</label><input class="form-input" type="text" id="cat-name" value="${cat?.name || ''}" placeholder="例: 趣味"></div>
      <div class="form-group"><label class="form-label">アイコン</label>
        <input class="form-input" type="text" id="cat-icon" value="${cat?.icon || '📁'}" style="width: 80px; text-align: center; font-size: 1.5rem;">
        <div class="emoji-picker-grid" style="display: grid; grid-template-columns: repeat(8, 1fr); gap: 6px; margin-top: 12px; cursor: pointer; max-height: 150px; overflow-y: auto;">
          ${RECOMMENDED_EMOJIS.map(e => `<span class="emoji-option" data-emoji="${e}">${e}</span>`).join('')}
        </div>
      </div>
      <div class="form-actions">${!isNew ? '<button class="btn btn-danger" data-action="deleteItem">削除</button>' : ''}<button class="btn btn-primary" data-action="saveItem" style="flex:2;">保存</button></div>
    </div>
  `;
  document.body.appendChild(overlay);
  overlay.addEventListener('click', (e) => {
    const em = e.target.closest('.emoji-option');
    if (em) { document.getElementById('cat-icon').value = em.dataset.emoji; return; }
    const act = e.target.closest('[data-action]')?.dataset.action;
    if (act === 'closeModal' || e.target === overlay) { overlay.remove(); return; }
    if (act === 'deleteItem' && confirm('カテゴリを削除しますか？')) { store.deleteCategory(id); overlay.remove(); refresh(); return; }
    if (act === 'saveItem') {
      const data = {
        name: document.getElementById('cat-name').value.trim(),
        icon: document.getElementById('cat-icon').value.trim() || '📁',
        type: cat?.type || type || 'expense',
        order: cat?.order || categories.length + 1
      };
      if (data.name) { if (isNew) store.addCategory(data); else store.updateCategory(id, data); overlay.remove(); refresh(); }
    }
  });
}

// -------------------------------------------------------------
// その他ユーティリティ
// -------------------------------------------------------------

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

function getDarkModeActive(settings) {
  if (settings.darkMode === 'dark') return true;
  if (settings.darkMode === 'light') return false;
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

function initSortable(id, type) {
  const el = document.getElementById(id);
  if (!el || !window.Sortable) return;
  window.Sortable.create(el, { handle: '.settings-drag-handle', animation: 200, onEnd: () => {
      const ids = Array.from(el.querySelectorAll('.draggable')).map(item => item.dataset.id);
      if (type === 'account') store.reorderAccounts(ids);
      else store.reorderCategories(ids);
      window.showToast?.('並べ替え完了');
  }});
}

async function handleGoogleLogin() {
  try { await auth.signIn(); const res = await auth.getOrCreateSpreadsheet(); if (res.id) { refresh(); if (res.isNew) await store.syncToCloud(res.id); else if(confirm('データを読み込みますか？')) { await store.loadFromCloud(res.id); window.location.reload(); } }
  } catch (err) { window.showToast?.('連携エラー', 'error'); }
}

async function handleLogout() { if (confirm('解除しますか？')) auth.signOut(); }
async function handleSyncPush() { const sId = localStorage.getItem('kakeibo_sheet_id'); if (sId) { try { window.showToast?.('同期中...', 'info'); await store.syncToCloud(sId); window.showToast?.('完了'); } catch (err) { window.showToast?.('失敗', 'error'); } } }
async function handleSyncPull() { const sId = localStorage.getItem('kakeibo_sheet_id'); if (sId && confirm('上書きしますか？')) { try { await store.loadFromCloud(sId); window.location.reload(); } catch (err) { window.showToast?.('失敗', 'error'); refresh(); } } }

function exportData() { const blob = new Blob([JSON.stringify(store.exportAllData(), null, 2)], { type: 'application/json' }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = 'kakeibo_backup.json'; a.click(); URL.revokeObjectURL(url); }
function importData() { const input = document.createElement('input'); input.type = 'file'; input.accept = '.json'; input.onchange = (e) => { const file = e.target.files[0]; const reader = new FileReader(); reader.onload = (ev) => { if (confirm('インポートしますか？')) { store.importAllData(JSON.parse(ev.target.result)); window.location.reload(); } }; reader.readAsText(file); }; input.click(); }
function clearData() { if (confirm('データを全削除しますか？')) { store.clearAllData(); window.location.reload(); } }

function refresh() {
  const container = document.getElementById('screen-settings');
  if (container) { container.removeEventListener('click', handleClick); render(container); }
}
