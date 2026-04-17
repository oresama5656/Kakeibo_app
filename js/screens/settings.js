// ============================================
// 設定画面 (v5.6 - レスポンシブ対応・はみ出し修正版)
// ============================================

import * as store from '../store.js';
import * as auth from '../auth.js';
import { RECOMMENDED_EMOJIS } from '../data.js';

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
        <div style="font-size: 3.5rem; margin-bottom: 8px;">⚙️</div>
        <h2 style="font-size: 1.6rem; font-weight: 800; margin:0; color: var(--text-primary);">アプリ設定</h2>
        <div style="font-size: 11px; color: var(--text-muted); letter-spacing: 0.1em; margin-top: 5px;">SYNC ENGINE v5.6</div>
      </div>

      <!-- クイックアクション -->
      <div class="settings-quick-actions" style="display: flex; justify-content: center; gap: 24px; margin: 10px 0 32px;">
        <div class="quick-action" data-action="toggleDarkMode" style="cursor: pointer; text-align: center;">
          <div style="width: 52px; height: 52px; background: var(--bg-card); border-radius: 16px; display: flex; align-items: center; justify-content: center; font-size: 1.3rem; border: 1px solid var(--border-color); box-shadow: var(--shadow-sm);">${getDarkModeActive(settings) ? '🌙' : '☀️'}</div>
          <div style="font-size: 10px; margin-top: 6px; font-weight: 800; color: var(--text-secondary);">テーマ</div>
        </div>
        <div class="quick-action" data-action="exportDataExcel" style="cursor: pointer; text-align: center;">
          <div style="width: 52px; height: 52px; background: var(--bg-card); border-radius: 16px; display: flex; align-items: center; justify-content: center; font-size: 1.3rem; border: 1px solid var(--border-color); box-shadow: var(--shadow-sm);">📊</div>
          <div style="font-size: 10px; margin-top: 6px; font-weight: 800; color: var(--text-secondary);">エクセル保存</div>
        </div>
      </div>

      <!-- 口座セクション (全幅) -->
      <div class="settings-section-card" style="background: var(--bg-card); border-radius: 20px; border: 1px solid var(--border-color); overflow: hidden; margin-bottom: 24px; box-shadow: var(--shadow-sm);">
        <div style="padding: 18px 20px; font-size: 0.85rem; font-weight: 800; border-bottom: 1px solid var(--border-light); background: rgba(0,0,0,0.01); display: flex; justify-content: space-between; align-items: center;">
          <span>💴 口座の管理</span>
          <span style="font-size: 10px; background: var(--bg-hover); padding: 2px 8px; border-radius: 10px; color: var(--text-muted);">${accounts.length}件</span>
        </div>
        <div id="settings-accounts-list">
          ${accounts.sort((a,b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0) || (a.order || 0) - (b.order || 0)).map(acc => `
            <div class="settings-list-item draggable" data-id="${acc.id}" style="display: flex; align-items: center; padding: 14px 20px; border-bottom: 1px solid var(--border-light); cursor: pointer;" data-action="editAccount">
              <span class="settings-drag-handle" style="color: var(--border-color); cursor: grab; padding-right: 16px; font-size: 1.1rem;">⠿</span>
              <span style="font-size: 1.3rem; margin-right: 16px;">${acc.icon}</span>
              <span style="flex: 1; font-weight: 600; font-size: 1rem; color: var(--text-primary);">${store.escapeHTML(acc.name)} ${acc.pinned ? '<span style="font-size: 12px; margin-left: 4px; vertical-align: middle;">📌</span>' : ''}</span>
              <span style="color: var(--text-muted); opacity: 0.4;">›</span>
            </div>
          `).join('')}
        </div>
        <div data-action="addAccount" style="padding: 16px; text-align: center; color: var(--color-accent); font-weight: 800; font-size: 0.85rem; cursor: pointer; background: rgba(99, 102, 241, 0.03); border-top: 1px solid var(--border-light);">＋ 新しい口座を追加</div>
      </div>

      <!-- カテゴリーセクション (レスポンシブ・グリッド) -->
      <div class="settings-category-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 16px; margin-bottom: 32px;">
        <!-- 支出カテゴリ -->
        <div style="background: var(--bg-card); border-radius: 20px; border: 1px solid var(--border-color); padding: 18px; box-shadow: var(--shadow-sm);">
          <div style="font-size: 0.75rem; font-weight: 800; color: var(--color-expense); margin-bottom: 16px; text-align:center; letter-spacing: 0.05em;">▼ 支出カテゴリ一覧</div>
          <div id="settings-expense-list">
            ${expenseCategories.sort((a,b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0) || (a.order || 0) - (b.order || 0)).map(cat => `
              <div class="settings-list-item draggable" data-id="${cat.id}" data-action="editCategory" style="display: flex; align-items: center; gap: 10px; padding: 12px 0; border-bottom: 1px solid var(--border-light); cursor: pointer;">
                <span class="settings-drag-handle" style="color: var(--border-color); cursor: grab; font-size: 13px;">⠿</span>
                <span style="font-size: 1.1rem;">${cat.icon}</span>
                <span style="font-size: 0.9rem; font-weight: 600; color: var(--text-primary); flex:1;">${store.escapeHTML(cat.name)} ${cat.pinned ? '📌' : ''}</span>
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
                <span style="font-size: 1.1rem;">${cat.icon}</span>
                <span style="font-size: 0.9rem; font-weight: 600; color: var(--text-primary); flex:1;">${store.escapeHTML(cat.name)} ${cat.pinned ? '📌' : ''}</span>
                <span style="color: var(--text-muted); opacity:0.3;">›</span>
              </div>
            `).join('')}
          </div>
          <div data-action="addCategory" data-type="income" style="text-align: center; font-size: 0.8rem; color: var(--color-accent); margin-top: 14px; cursor: pointer; font-weight: 800;">＋ カテゴリの追加</div>
        </div>
      </div>
      

      <!-- クラウド・同期管理 (モダン・スタイル) -->
      <div style="padding: 28px; background: linear-gradient(135deg, var(--bg-card) 0%, var(--bg-hover) 100%); border-radius: 24px; border: 1px solid var(--border-color); text-align: center; margin-bottom: 40px; box-shadow: var(--shadow-sm);">
        <div style="font-size: 2.8rem; margin-bottom: 16px;">☁️</div>
        ${!auth.isLoggedIn() ? `
          <h3 style="font-size: 1.1rem; font-weight: 800; margin-bottom: 18px; color: var(--text-primary);">Googleクラウド同期</h3>
          <p style="font-size: 0.75rem; color: var(--text-muted); margin-bottom: 24px;">スプレッドシートと連携して<br>データを安全にバックアップ・共有できます。</p>
          <button class="btn btn-primary" data-action="googleLogin" style="width: 100%; max-width: 260px; border-radius: 50px; font-weight: 800; padding: 14px; margin-bottom: 16px;">連携を開始する</button>
          <div data-action="exportDataExcel" style="font-size: 0.8rem; color: var(--color-accent); text-decoration: underline; cursor: pointer; font-weight: 800; opacity: 0.9;">💾 エクセル形式で全データを保存 (.xlsx)</div>
        ` : `
          <div style="font-size: 0.7rem; color: var(--text-muted); margin-bottom: 8px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.1em;">Connected Cloud ID</div>
          <div style="font-size: 10px; font-family: monospace; opacity: 0.8; margin-bottom: 24px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; padding: 0 15px; color: var(--color-accent);">${sheetId}</div>
          <div style="display: flex; gap: 12px; justify-content: center; max-width: 320px; margin: 0 auto;">
            <button data-action="syncPull" style="flex:1; padding: 14px; border-radius: 14px; border: 1px solid var(--border-color); background: var(--bg-card); font-size: 0.85rem; font-weight: 800; cursor: pointer; color: var(--text-primary);">📥 読込</button>
            <button data-action="syncPush" style="flex:1; padding: 14px; border-radius: 14px; border: none; background: var(--color-accent); color: white; font-size: 0.85rem; font-weight: 800; cursor: pointer;">📤 保存</button>
          </div>
          <div data-action="googleLogout" style="margin-top: 24px; font-size: 0.75rem; color: var(--color-danger); text-decoration: underline; cursor: pointer; opacity: 0.7; font-weight: bold;">連携を解除する</div>
        `}
      </div>

      <!-- デンジャーゾーン -->
      <div style="text-align: center; padding-bottom: 40px;">
        <button data-action="clearData" style="background: transparent; border: none; color: var(--color-danger); font-size: 0.75rem; opacity: 0.5; text-decoration: underline; cursor: pointer; font-weight: 500;">アプリの全データを初期化</button>
      </div>
    </div>
  `;

  // Sortable初期設定
  initSortable('settings-accounts-list', 'account');
  initSortable('settings-expense-list', 'category');
  initSortable('settings-income-list', 'category');

  container.addEventListener('click', handleClick);
}

// -------------------------------------------------------------
// イベント & モーダル処理
// -------------------------------------------------------------

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
    case 'googleLogout': handleLogout(); break;
    case 'syncPush': handleSyncPush(); break;
    case 'syncPull': handleSyncPull(); break;
    case 'exportDataExcel': exportDataExcel(); break;
    case 'clearData': clearData(); break;
  }
}

// モーダル表示 (アイコン選択などをより美しく)
function showAccountModal(id) {
  const accounts = store.getAccounts();
  const acc = id ? accounts.find(a => a.id === id) : null;
  const isNew = !acc;
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal-content" style="max-width: 400px; padding: 25px; border-radius: 24px;">
      <div class="modal-header"><h3 class="modal-title">${isNew ? '口座追加' : '口座編集'}</h3><button class="modal-close" data-action="closeModal">✕</button></div>
      <div class="form-group"><label class="form-label">名前</label><input class="form-input" type="text" id="acc-name" value="${acc?.name || ''}" placeholder="例: 楽天カード"></div>
      <div class="form-group"><label class="form-label">アイコン選択</label>
        <input class="form-input" type="text" id="acc-icon" value="${acc?.icon || '💰'}" style="width: 80px; text-align: center; font-size: 1.5rem; margin-bottom: 12px; background: var(--bg-hover);">
        <div style="display: grid; grid-template-columns: repeat(8, 1fr); gap: 6px; max-height: 140px; overflow-y: auto; padding: 5px;">
          ${RECOMMENDED_EMOJIS.map(e => `<span class="emoji-option" style="cursor:pointer; font-size: 1.2rem; text-align:center; padding: 4px; border-radius: 4px; hover:background:var(--bg-hover);" data-emoji="${e}">${e}</span>`).join('')}
        </div>
      </div>
      <div class="form-group"><label class="form-label">初期残高</label><input class="form-input" type="number" id="acc-balance" value="${acc?.initialBalance || 0}"></div>
      <div class="form-group" style="display: flex; align-items: center; gap: 10px; padding: 10px 0;">
        <input type="checkbox" id="acc-pinned" ${acc?.pinned ? 'checked' : ''} style="width: 20px; height: 20px;">
        <label for="acc-pinned" style="font-size: 0.9rem; font-weight: 600; cursor: pointer;">📌 重要な項目として上位に固定する</label>
      </div>
      <div class="form-actions" style="margin-top: 20px;">
        ${!isNew ? '<button class="btn btn-danger" data-action="deleteItem" style="flex:1;">削除</button>' : ''}
        <button class="btn btn-primary" data-action="saveItem" style="flex:2; background: var(--color-accent); color:white;">${isNew ? '追加する' : '保存する'}</button>
      </div>
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
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal-content" style="max-width: 400px; padding: 25px; border-radius: 24px;">
      <div class="modal-header"><h3 class="modal-title">カテゴリ管理</h3><button class="modal-close" data-action="closeModal">✕</button></div>
      <div class="form-group"><label class="form-label">名前</label><input class="form-input" type="text" id="cat-name" value="${cat?.name || ''}" placeholder="例: 交際費"></div>
      <div class="form-group"><label class="form-label">アイコン選択</label>
        <input class="form-input" type="text" id="cat-icon" value="${cat?.icon || '📁'}" style="width: 80px; text-align: center; font-size: 1.5rem; margin-bottom: 12px; background: var(--bg-hover);">
        <div style="display: grid; grid-template-columns: repeat(8, 1fr); gap: 6px; max-height: 140px; overflow-y: auto;">
          ${RECOMMENDED_EMOJIS.map(e => `<span class="emoji-option" style="cursor:pointer; font-size: 1.2rem; text-align:center; padding: 4px;" data-emoji="${e}">${e}</span>`).join('')}
        </div>
      </div>
      <div class="form-group" style="display: flex; align-items: center; gap: 10px; padding: 10px 0;">
        <input type="checkbox" id="cat-pinned" ${cat?.pinned ? 'checked' : ''} style="width: 20px; height: 20px;">
        <label for="cat-pinned" style="font-size: 0.9rem; font-weight: 600; cursor: pointer;">📌 重要な項目として上位に固定する</label>
      </div>
      <div class="form-actions" style="margin-top: 20px; display: flex; gap: 10px;">
        ${!isNew ? '<button class="btn btn-danger" data-action="deleteItem" style="flex:1; padding: 12px; border-radius:12px; font-weight:800; border:none; background:#ef4444; color:white; cursor:pointer;">削除</button>' : ''}
        <button class="btn btn-primary" data-action="saveItem" style="flex:2; padding: 12px; border-radius:12px; font-weight:800; border:none; background:var(--color-accent); color:white; cursor:pointer;">${isNew ? '追加する' : '保存する'}</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);

  overlay.addEventListener('click', (e) => {
    const act = e.target.dataset.action || e.target.closest('[data-action]')?.dataset.action;
    const em = e.target.closest('.emoji-option');
    if (em) { document.getElementById('cat-icon').value = em.dataset.emoji; return; }

    if (act === 'closeModal' || e.target === overlay) { overlay.remove(); return; }
    if (act === 'deleteItem' && confirm('削除しますか？')) {
      store.deleteCategory(id);
      overlay.remove();
      refresh();
      return;
    }
    if (act === 'saveItem') {
      const data = { 
        name: document.getElementById('cat-name').value.trim(), 
        icon: document.getElementById('cat-icon').value.trim() || '📁', 
        type: cat?.type || type || 'expense',
        pinned: document.getElementById('cat-pinned').checked
      };
      if (data.name) {
        if (isNew) store.addCategory(data);
        else store.updateCategory(id, data);
        overlay.remove();
        refresh();
      }
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
async function handleLogout() { if (confirm('解除?')) auth.signOut(); }
async function handleSyncPush() { const sId = localStorage.getItem('kakeibo_sheet_id'); if (sId) { try { window.showToast?.('同期中...', 'info'); await store.syncToCloud(sId); window.showToast?.('完了'); } catch (e) { window.showToast?.('失敗', 'error'); } } }
async function handleSyncPull() { const sId = localStorage.getItem('kakeibo_sheet_id'); if (sId && confirm('上書?')) { try { await store.loadFromCloud(sId); window.location.reload(); } catch (e) { window.showToast?.('失敗', 'error'); refresh(); } } }

function exportDataExcel() {
  if (!store || typeof store.getTransactions !== 'function') {
    alert('データの取得に失敗しました。');
    return;
  }

  try {
    const wb = XLSX.utils.book_new();
    const makeSheet = (name, rows) => {
      if (!rows || rows.length === 0) return;
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rows), name);
    };

    // 1. transactions
    const txs = store.getTransactions() || [];
    const txHeader = ['ID', '日付', '金額', '種別', 'カテゴリ名', '出金口座名', 'メモ', '入金口座名', 'カテゴリID', '出金ID', '入金ID'];
    const txRows = [
      txHeader,
      ...txs.length ? txs.map(t => [
        t.id, t.date, t.amount, t.type, t.category || '', t.fromAccount || '', t.memo || '', t.toAccount || '',
        t.categoryId || '', t.fromAccountId || '', t.toAccountId || ''
      ]) : [txHeader.map((_, i) => i === 0 ? 'EMPTY' : '')]
    ];
    makeSheet("transactions", txRows);

    // 2. accounts
    const accs = store.getAccounts() || [];
    const accHeader = ['ID', '名前', 'アイコン', '現在の残高', '初期残高', '順序', 'ピン留め'];
    const accRows = [
      accHeader,
      ...accs.length ? accs.map(a => [a.id, a.name, a.icon, a.balance, a.initialBalance, a.order, a.pinned ? 1 : 0]) : [accHeader.map((_, i) => i === 0 ? 'EMPTY' : '')]
    ];
    makeSheet("accounts", accRows);

    // 3. categories
    const cats = store.getCategories() || [];
    const catHeader = ['ID', '名前', 'アイコン', 'タイプ', '順序', 'ピン留め'];
    const catRows = [
      catHeader,
      ...cats.length ? cats.map(c => [c.id, c.name, c.icon, c.type, c.order, c.pinned ? 1 : 0]) : [catHeader.map((_, i) => i === 0 ? 'EMPTY' : '')]
    ];
    makeSheet("categories", catRows);

    // 4. shortcuts
    const scs = (typeof store.getShortcuts === 'function' ? store.getShortcuts() : []) || [];
    const scHeader = ['ID', '名前', 'タイプ', '金額', 'カテゴリ', '出金元', '入金先', '順序', 'カテゴリID', '出金ID', '入金ID'];
    const scRows = [
      scHeader,
      ...scs.length ? scs.map(s => [
        s.id, s.name, s.type, s.amount, s.category || '', s.fromAccount || '', s.toAccount || '', s.order,
        s.categoryId || '', s.fromAccountId || '', s.toAccountId || ''
      ]) : [scHeader.map((_, i) => i === 0 ? 'EMPTY' : '')]
    ];
    makeSheet("shortcuts", scRows);

    // 5. settings
    const settings = typeof store.getSettings === 'function' ? store.getSettings() : {};
    let settingsStr;
    try {
      settingsStr = JSON.stringify(settings);
    } catch (err) {
      settingsStr = '{"error": "Serialization failed"}';
    }
    makeSheet("settings", [['JSON_SETTINGS'], [settingsStr]]);

    XLSX.writeFile(wb, "Kakeibo_App_Full_Data.xlsx");
    if (typeof window.showToast === 'function') {
      window.showToast('エクセルを保存しました ✓');
    }
  } catch (e) {
    console.error('Export failed:', e);
    alert('エクスポートに失敗しました。');
  }
}
function clearData() { if (confirm('全削除?')) { store.clearAllData(); window.location.reload(); } }

function refresh() {
  const container = document.getElementById('screen-settings');
  if (container) { container.removeEventListener('click', handleClick); render(container); }
}
