// ============================================
// 設定画面
// ============================================

import * as store from '../store.js';

export function render(container) {
  const settings = store.getSettings();
  const accounts = store.getAccounts();
  const categories = store.getCategories();
  const shortcuts = store.getShortcuts();

  const expenseCategories = categories.filter(c => c.type === 'expense');
  const incomeCategories = categories.filter(c => c.type === 'income');

  container.innerHTML = `
    <div class="settings-screen">
      <h2 style="font-size: var(--font-size-xl); margin-bottom: var(--space-lg);">⚙️ 設定</h2>

      <div class="settings-section">
        <div class="settings-section-title">💴 口座管理 (${accounts.length})</div>
        <div class="settings-card" id="settings-accounts-list">
          ${accounts.sort((a, b) => a.order - b.order).map(acc => `
            <div class="settings-item draggable" data-id="${acc.id}">
              <div class="settings-drag-handle">⠿</div>
              <div class="settings-item-left" data-action="editAccount" data-id="${acc.id}">
                <span class="settings-item-icon">${acc.icon}</span>
                <span class="settings-item-label">${acc.name}</span>
                ${acc.pinned ? '<span style="font-size:0.7rem;color:var(--color-accent);">📌</span>' : ''}
              </div>
              <span class="settings-item-arrow" data-action="editAccount" data-id="${acc.id}">›</span>
            </div>
          `).join('')}
          <div class="settings-item" data-action="addAccount" style="justify-content:center; color:var(--color-accent);">
            <span style="font-weight: var(--font-weight-semibold);">＋ 口座を追加</span>
          </div>
        </div>
      </div>

      <!-- Expense Categories -->
      <div class="settings-section">
        <div class="settings-section-title">📁 支出カテゴリー (${expenseCategories.length})</div>
        <div class="settings-card" id="settings-expense-list">
          ${expenseCategories.sort((a, b) => a.order - b.order).map(cat => `
            <div class="settings-item draggable" data-id="${cat.id}">
              <div class="settings-drag-handle">⠿</div>
              <div class="settings-item-left" data-action="editCategory" data-id="${cat.id}">
                <span class="settings-item-icon">${cat.icon}</span>
                <span class="settings-item-label">${cat.name}</span>
                ${cat.pinned ? '<span style="font-size:0.7rem;color:var(--color-accent);">📌</span>' : ''}
              </div>
              <span class="settings-item-arrow" data-action="editCategory" data-id="${cat.id}">›</span>
            </div>
          `).join('')}
          <div class="settings-item" data-action="addCategory" data-type="expense" style="justify-content:center; color:var(--color-accent);">
            <span style="font-weight: var(--font-weight-semibold);">＋ 支出カテゴリーを追加</span>
          </div>
        </div>
      </div>

      <!-- Income Categories -->
      <div class="settings-section">
        <div class="settings-section-title">📁 収入カテゴリー (${incomeCategories.length})</div>
        <div class="settings-card" id="settings-income-list">
          ${incomeCategories.sort((a, b) => a.order - b.order).map(cat => `
            <div class="settings-item draggable" data-id="${cat.id}">
              <div class="settings-drag-handle">⠿</div>
              <div class="settings-item-left" data-action="editCategory" data-id="${cat.id}">
                <span class="settings-item-icon">${cat.icon}</span>
                <span class="settings-item-label">${cat.name}</span>
                ${cat.pinned ? '<span style="font-size:0.7rem;color:var(--color-accent);">📌</span>' : ''}
              </div>
              <span class="settings-item-arrow" data-action="editCategory" data-id="${cat.id}">›</span>
            </div>
          `).join('')}
          <div class="settings-item" data-action="addCategory" data-type="income" style="justify-content:center; color:var(--color-accent);">
            <span style="font-weight: var(--font-weight-semibold);">＋ 収入カテゴリーを追加</span>
          </div>
        </div>
      </div>

      <!-- Shortcuts -->
      <div class="settings-section">
        <div class="settings-section-title">⚡ ショートカット (${shortcuts.length})</div>
        <div class="settings-card">
          ${shortcuts.map(sc => `
            <div class="settings-item" data-action="editShortcut" data-id="${sc.id}">
              <div class="settings-item-left">
                <span class="settings-item-label">${sc.name}</span>
              </div>
              <span class="settings-item-arrow">›</span>
            </div>
          `).join('')}
          <div class="settings-item" data-action="addShortcut" style="justify-content:center; color:var(--color-accent);">
            <span style="font-weight: var(--font-weight-semibold);">＋ ショートカットを追加</span>
          </div>
        </div>
      </div>

      <!-- App Settings -->
      <div class="settings-section">
        <div class="settings-section-title">🎨 アプリ設定</div>
        <div class="settings-card">
          <div class="settings-item" data-action="toggleDarkMode">
            <div class="settings-item-left">
              <span class="settings-item-icon">🌙</span>
              <span class="settings-item-label">ダークモード</span>
            </div>
            <div class="toggle-switch ${getDarkModeActive(settings) ? 'active' : ''}" id="dark-toggle"></div>
          </div>
        </div>
      </div>

      <!-- Data Management -->
      <div class="settings-section">
        <div class="settings-section-title">💾 データ管理</div>
        <div class="settings-card">
          <div class="settings-item" data-action="exportData">
            <div class="settings-item-left">
              <span class="settings-item-icon">📤</span>
              <span class="settings-item-label">データをエクスポート</span>
            </div>
            <span class="settings-item-arrow">›</span>
          </div>
          <div class="settings-item" data-action="importData">
            <div class="settings-item-left">
              <span class="settings-item-icon">📥</span>
              <span class="settings-item-label">データをインポート</span>
            </div>
            <span class="settings-item-arrow">›</span>
          </div>
          <div class="settings-item" data-action="clearData" style="color: var(--color-danger);">
            <div class="settings-item-left">
              <span class="settings-item-icon">🗑️</span>
              <span class="settings-item-label">全データ削除</span>
            </div>
            <span class="settings-item-arrow">›</span>
          </div>
        </div>
      </div>
    </div>
  `;

  container.addEventListener('click', handleClick);

  // Initialize Sortable
  initSortable('settings-accounts-list', 'account');
  initSortable('settings-expense-list', 'category');
  initSortable('settings-income-list', 'category');
}

function initSortable(id, type) {
  const el = document.getElementById(id);
  if (!el || !window.Sortable) return;

  window.Sortable.create(el, {
    handle: '.settings-drag-handle',
    animation: 200,
    ghostClass: 'sortable-ghost',
    dragClass: 'sortable-drag',
    onEnd: () => {
      const items = Array.from(el.querySelectorAll('.draggable'));
      const ids = items.map(item => item.dataset.id);
      
      if (type === 'account') {
        store.reorderAccounts(ids);
      } else {
        store.reorderCategories(ids);
      }
      window.showToast?.('並べ替えを保存しました');
    }
  });
}

function getDarkModeActive(settings) {
  if (settings.darkMode === 'dark') return true;
  if (settings.darkMode === 'light') return false;
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

function handleClick(e) {
  const target = e.target.closest('[data-action]');
  if (!target) return;

  const action = target.dataset.action;

  switch (action) {
    case 'editAccount': showAccountModal(target.dataset.id); break;
    case 'addAccount': showAccountModal(null); break;
    case 'editCategory': showCategoryModal(target.dataset.id); break;
    case 'addCategory': showCategoryModal(null, target.dataset.type); break;
    case 'editShortcut': showShortcutModal(target.dataset.id); break;
    case 'addShortcut': showShortcutModal(null); break;
    case 'toggleDarkMode': toggleDarkMode(); break;
    case 'exportData': exportData(); break;
    case 'importData': importData(); break;
    case 'clearData': clearData(); break;
  }
}

// --- Account Modal ---
function showAccountModal(id) {
  const accounts = store.getAccounts();
  const acc = id ? accounts.find(a => a.id === id) : null;
  const isNew = !acc;

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal-content">
      <div class="modal-header">
        <h3 class="modal-title">${isNew ? '口座を追加' : '口座を編集'}</h3>
        <button class="modal-close" data-action="closeModal">✕</button>
      </div>
      <div class="form-group">
        <label class="form-label">口座名</label>
        <input class="form-input" type="text" id="acc-name" value="${acc?.name || ''}" placeholder="例: PayPay">
      </div>
      <div class="form-group">
        <label class="form-label">アイコン（絵文字）</label>
        <input class="form-input" type="text" id="acc-icon" value="${acc?.icon || '💰'}" style="font-size: 1.5rem; width: 80px; text-align: center;">
      </div>
      <div class="form-group">
        <label class="form-label">初期残高</label>
        <input class="form-input" type="number" id="acc-balance" value="${acc?.initialBalance || 0}">
      </div>
      <div class="form-group" style="display: flex; align-items: center; gap: var(--space-md);">
        <label class="form-label" style="margin: 0;">📌 ピン留め（上部固定）</label>
        <div class="toggle-switch ${acc?.pinned ? 'active' : ''}" id="acc-pinned" data-action="togglePin"></div>
      </div>
      <div class="form-actions">
        ${!isNew ? '<button class="btn btn-danger" data-action="deleteItem">削除</button>' : '<button class="btn btn-secondary" data-action="closeModal">キャンセル</button>'}
        <button class="btn btn-primary" data-action="saveItem">保存</button>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);
  let pinnedState = acc?.pinned || false;

  overlay.addEventListener('click', (e) => {
    const act = e.target.closest('[data-action]')?.dataset.action;
    if (act === 'closeModal' || e.target === overlay) { overlay.remove(); return; }
    if (act === 'togglePin') {
      pinnedState = !pinnedState;
      document.getElementById('acc-pinned').classList.toggle('active', pinnedState);
      return;
    }
    if (act === 'deleteItem') {
      if (confirm('この口座を削除しますか？')) {
        store.deleteAccount(id);
        overlay.remove();
        window.showToast?.('口座を削除しました');
        refresh();
      }
      return;
    }
    if (act === 'saveItem') {
      const data = {
        name: document.getElementById('acc-name').value.trim(),
        icon: document.getElementById('acc-icon').value.trim() || '💰',
        initialBalance: Number(document.getElementById('acc-balance').value) || 0,
        order: acc?.order || accounts.length + 1,
        pinned: pinnedState,
      };
      if (!data.name) { window.showToast?.('口座名を入力してください', 'error'); return; }
      if (isNew) {
        store.addAccount(data);
        window.showToast?.('口座を追加しました ✓');
      } else {
        store.updateAccount(id, data);
        window.showToast?.('口座を更新しました ✓');
      }
      overlay.remove();
      refresh();
    }
  });
}

// --- Category Modal ---
function showCategoryModal(id, type) {
  const categories = store.getCategories();
  const cat = id ? categories.find(c => c.id === id) : null;
  const isNew = !cat;
  const catType = cat?.type || type || 'expense';

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal-content">
      <div class="modal-header">
        <h3 class="modal-title">${isNew ? 'カテゴリーを追加' : 'カテゴリーを編集'}</h3>
        <button class="modal-close" data-action="closeModal">✕</button>
      </div>
      <div class="form-group">
        <label class="form-label">カテゴリー名</label>
        <input class="form-input" type="text" id="cat-name" value="${cat?.name || ''}">
      </div>
      <div class="form-group">
        <label class="form-label">アイコン（絵文字）</label>
        <input class="form-input" type="text" id="cat-icon" value="${cat?.icon || '📁'}" style="font-size: 1.5rem; width: 80px; text-align: center;">
      </div>
      <div class="form-group">
        <label class="form-label">種類</label>
        <select class="form-input" id="cat-type">
          <option value="expense" ${catType === 'expense' ? 'selected' : ''}>支出</option>
          <option value="income" ${catType === 'income' ? 'selected' : ''}>収入</option>
          <option value="both" ${catType === 'both' ? 'selected' : ''}>両方</option>
        </select>
      </div>
      <div class="form-group" style="display: flex; align-items: center; gap: var(--space-md);">
        <label class="form-label" style="margin: 0;">📌 ピン留め（上部固定）</label>
        <div class="toggle-switch ${cat?.pinned ? 'active' : ''}" id="cat-pinned" data-action="togglePin"></div>
      </div>
      <div class="form-actions">
        ${!isNew ? '<button class="btn btn-danger" data-action="deleteItem">削除</button>' : '<button class="btn btn-secondary" data-action="closeModal">キャンセル</button>'}
        <button class="btn btn-primary" data-action="saveItem">保存</button>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);
  let pinnedState = cat?.pinned || false;

  overlay.addEventListener('click', (e) => {
    const act = e.target.closest('[data-action]')?.dataset.action;
    if (act === 'closeModal' || e.target === overlay) { overlay.remove(); return; }
    if (act === 'togglePin') {
      pinnedState = !pinnedState;
      document.getElementById('cat-pinned').classList.toggle('active', pinnedState);
      return;
    }
    if (act === 'deleteItem') {
      if (confirm('このカテゴリーを削除しますか？')) {
        store.deleteCategory(id);
        overlay.remove();
        window.showToast?.('カテゴリーを削除しました');
        refresh();
      }
      return;
    }
    if (act === 'saveItem') {
      const data = {
        name: document.getElementById('cat-name').value.trim(),
        icon: document.getElementById('cat-icon').value.trim() || '📁',
        type: document.getElementById('cat-type').value,
        order: cat?.order || categories.length + 1,
        pinned: pinnedState,
      };
      if (!data.name) { window.showToast?.('カテゴリー名を入力してください', 'error'); return; }
      if (isNew) {
        store.addCategory(data);
        window.showToast?.('カテゴリーを追加しました ✓');
      } else {
        store.updateCategory(id, data);
        window.showToast?.('カテゴリーを更新しました ✓');
      }
      overlay.remove();
      refresh();
    }
  });
}

// --- Shortcut Modal ---
function showShortcutModal(id) {
  const shortcuts = store.getShortcuts();
  const accounts = store.getAccounts();
  const categories = store.getCategories();
  const sc = id ? shortcuts.find(s => s.id === id) : null;
  const isNew = !sc;

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal-content">
      <div class="modal-header">
        <h3 class="modal-title">${isNew ? 'ショートカットを追加' : 'ショートカットを編集'}</h3>
        <button class="modal-close" data-action="closeModal">✕</button>
      </div>
      <div class="form-group">
        <label class="form-label">ショートカット名</label>
        <input class="form-input" type="text" id="sc-name" value="${sc?.name || ''}" placeholder="例: いつものコンビニ">
      </div>
      <div class="form-group">
        <label class="form-label">種類</label>
        <select class="form-input" id="sc-type">
          <option value="expense" ${(sc?.type || 'expense') === 'expense' ? 'selected' : ''}>支出</option>
          <option value="income" ${sc?.type === 'income' ? 'selected' : ''}>収入</option>
          <option value="transfer" ${sc?.type === 'transfer' ? 'selected' : ''}>振替</option>
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">金額</label>
        <input class="form-input" type="number" id="sc-amount" value="${sc?.amount || ''}" min="0" placeholder="0">
      </div>
      <div class="form-group">
        <label class="form-label">カテゴリー</label>
        <select class="form-input" id="sc-category">
          <option value="">なし</option>
          ${categories.map(c => `<option value="${c.name}" ${c.name === sc?.category ? 'selected' : ''}>${c.icon} ${c.name}</option>`).join('')}
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">出金元</label>
        <select class="form-input" id="sc-from">
          <option value="">なし</option>
          ${accounts.map(a => `<option value="${a.name}" ${a.name === sc?.fromAccount ? 'selected' : ''}>${a.icon} ${a.name}</option>`).join('')}
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">入金先</label>
        <select class="form-input" id="sc-to">
          <option value="">なし</option>
          ${accounts.map(a => `<option value="${a.name}" ${a.name === sc?.toAccount ? 'selected' : ''}>${a.icon} ${a.name}</option>`).join('')}
        </select>
      </div>
      <div class="form-actions">
        ${!isNew ? '<button class="btn btn-danger" data-action="deleteItem">削除</button>' : '<button class="btn btn-secondary" data-action="closeModal">キャンセル</button>'}
        <button class="btn btn-primary" data-action="saveItem">保存</button>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  overlay.addEventListener('click', (e) => {
    const act = e.target.closest('[data-action]')?.dataset.action;
    if (act === 'closeModal' || e.target === overlay) { overlay.remove(); return; }
    if (act === 'deleteItem') {
      if (confirm('このショートカットを削除しますか？')) {
        store.deleteShortcut(id);
        overlay.remove();
        window.showToast?.('ショートカットを削除しました');
        refresh();
      }
      return;
    }
    if (act === 'saveItem') {
      const data = {
        name: document.getElementById('sc-name').value.trim(),
        type: document.getElementById('sc-type').value,
        amount: Number(document.getElementById('sc-amount').value) || 0,
        category: document.getElementById('sc-category').value,
        fromAccount: document.getElementById('sc-from').value,
        toAccount: document.getElementById('sc-to').value,
        order: sc?.order || shortcuts.length + 1,
      };
      if (!data.name) { window.showToast?.('名前を入力してください', 'error'); return; }
      if (isNew) {
        store.addShortcut(data);
        window.showToast?.('ショートカットを追加しました ✓');
      } else {
        store.updateShortcut(id, data);
        window.showToast?.('ショートカットを更新しました ✓');
      }
      overlay.remove();
      refresh();
    }
  });
}

// --- Dark Mode ---
function toggleDarkMode() {
  const settings = store.getSettings();
  let newMode;
  if (settings.darkMode === 'dark') newMode = 'light';
  else if (settings.darkMode === 'light') newMode = 'auto';
  else newMode = 'dark';

  store.updateSettings({ darkMode: newMode });
  applyTheme(newMode);
  refresh();
  window.showToast?.(`テーマ: ${newMode === 'auto' ? '自動' : newMode === 'dark' ? 'ダーク' : 'ライト'}`);
}

export function applyTheme(mode) {
  if (mode === 'dark') {
    document.documentElement.setAttribute('data-theme', 'dark');
  } else if (mode === 'light') {
    document.documentElement.setAttribute('data-theme', 'light');
  } else {
    document.documentElement.removeAttribute('data-theme');
  }
}

// --- Export / Import ---
function exportData() {
  const data = store.exportAllData();
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `kakeibo_backup_${new Date().toISOString().split('T')[0]}.json`;
  a.click();
  URL.revokeObjectURL(url);
  window.showToast?.('データをエクスポートしました ✓');
}

function importData() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.json';
  input.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target.result);
        if (confirm('現在のデータを上書きしてインポートしますか？')) {
          store.importAllData(data);
          window.showToast?.('データをインポートしました ✓');
          window.location.reload();
        }
      } catch {
        window.showToast?.('ファイルの読み込みに失敗しました', 'error');
      }
    };
    reader.readAsText(file);
  });
  input.click();
}

function clearData() {
  if (confirm('⚠️ 全てのデータを削除しますか？\nこの操作は取り消せません。')) {
    if (confirm('本当に削除しますか？（二重確認）')) {
      store.clearAllData();
      window.showToast?.('全データを削除しました');
      window.location.reload();
    }
  }
}

function refresh() {
  const container = document.getElementById('screen-settings');
  if (container) {
    container.removeEventListener('click', handleClick);
    render(container);
  }
}
