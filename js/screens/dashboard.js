export function render(container) {
  const accounts = store.getAccounts();
  const totalBalance = store.getTotalBalance();

  const isPositive = totalBalance >= 0;

  container.innerHTML = `
    <div class="dashboard-screen">
      <div class="dashboard-header">
        <div class="total-label">総資産</div>
        <div class="total-amount ${isPositive ? 'positive' : 'negative'}">
          ¥${Math.abs(totalBalance).toLocaleString('ja-JP')}
        </div>
      </div>

      <!-- Account Balance Cards -->
      <div class="chart-card">
        <div class="chart-card-title">💰 口座別残高</div>
        <div class="account-cards">
          ${accounts.map(acc => {
            const balance = store.getAccountBalance(acc.id);
            return `
              <div class="account-card" data-action="selectAccount" data-id="${acc.id}" style="cursor:pointer;">
                <span class="account-card-icon">${acc.icon}</span>
                <div class="account-card-info">
                  <div class="account-card-name">${acc.name}</div>
                  <div class="account-card-balance" style="color: ${balance >= 0 ? 'var(--color-income)' : 'var(--color-expense)'}">
                    ¥${Math.abs(balance).toLocaleString('ja-JP')}
                  </div>
                </div>
              </div>
            `;
          }).join('')}
        </div>
        <div style="margin-top: var(--space-md); font-size: var(--font-size-xs); color: var(--text-muted); text-align: center;">
          💡 アイコンを長押し/ドラッグで振替、タップで入出金メニューを表示
        </div>
      </div>
    </div>
  `;

  container.addEventListener('click', handleClick);

  // Initialize Drag & Drop (PC版のみ有効)
  const isPC = window.innerWidth >= 768;
  const el = container.querySelector('.account-cards');
  
  if (isPC && el && window.Sortable) {
    Sortable.create(el, {
      sort: false, 
      animation: 150,
      ghostClass: 'sortable-ghost',
      dragClass: 'sortable-drag',
      delay: 0,
      onMove: (evt) => {
        el.querySelectorAll('.account-card').forEach(c => c.classList.remove('drag-over'));
        if (evt.related && evt.related.classList.contains('account-card')) {
          evt.related.classList.add('drag-over');
        }
      },
      onEnd: (evt) => {
        el.querySelectorAll('.account-card').forEach(c => c.classList.remove('drag-over'));
        const item = evt.item;
        const originalPointerEvents = item.style.pointerEvents;
        item.style.pointerEvents = 'none';

        const touch = evt.originalEvent.changedTouches ? evt.originalEvent.changedTouches[0] : evt.originalEvent;
        const targetEl = document.elementFromPoint(touch.clientX, touch.clientY)?.closest('.account-card');
        
        item.style.pointerEvents = originalPointerEvents;

        if (targetEl && targetEl !== item) {
          const fromId = item.dataset.id;
          const toId = targetEl.dataset.id;
          openQuickTransferModal(fromId, toId);
        }
        refresh(); 
      }
    });
  }
}

function openQuickTransferModal(fromId, toId) {
  const accounts = store.getAccounts();
  const fromAcc = accounts.find(a => a.id === fromId);
  const toAcc = accounts.find(a => a.id === toId);
  if (!fromAcc || !toAcc) return;

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.style.zIndex = '3000';
  overlay.innerHTML = `
    <div class="modal-content" style="margin: auto; border-radius: var(--radius-xl);">
      <div class="modal-header">
        <div class="modal-title">クイック振替 🔄</div>
        <button class="modal-close-btn">✕</button>
      </div>
      <div class="quick-transfer-header">
        <div style="text-align:center">
          <div style="font-size:2rem">${fromAcc.icon}</div>
          <div style="font-size:0.8rem">${fromAcc.name}</div>
        </div>
        <div class="transfer-arrow">➡</div>
        <div style="text-align:center">
          <div style="font-size:2rem">${toAcc.icon}</div>
          <div style="font-size:0.8rem">${toAcc.name}</div>
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">移動する金額</label>
        <input type="number" id="quick-transfer-amount" class="form-input" placeholder="0" inputmode="numeric">
      </div>
      <div class="form-actions">
        <button class="btn btn-secondary modal-cancel-btn">キャンセル</button>
        <button class="btn btn-primary" id="execute-quick-transfer">移動する</button>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);
  const input = overlay.querySelector('#quick-transfer-amount');
  setTimeout(() => input.focus(), 100);

  const close = () => { overlay.remove(); };
  overlay.querySelector('.modal-close-btn').onclick = close;
  overlay.querySelector('.modal-cancel-btn').onclick = close;
  
  overlay.querySelector('#execute-quick-transfer').onclick = () => {
    const amount = Number(input.value);
    if (!amount || amount <= 0) {
      window.showToast?.('金額を入力してください', 'error');
      return;
    }

    const tx = {
      date: new Date().toISOString().split('T')[0],
      type: 'transfer',
      amount: amount,
      category: '',
      fromAccount: fromAcc.name,
      toAccount: toAcc.name,
      memo: 'クイック振替'
    };

    store.addTransaction(tx);
    window.showToast?.('振替を完了しました ✓');
    close();
    refresh();
  };
}

function handleClick(e) {
  const target = e.target.closest('[data-action]');
  if (!target) return;

  if (target.dataset.action === 'selectAccount') {
    showQuickMenu(target.dataset.id);
  }
}

function showQuickMenu(accountId) {
  const account = store.getAccounts().find(a => a.id === accountId);
  if (!account) return;

  const currentBalance = store.getAccountBalance(accountId);

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.style.zIndex = '3000';
  overlay.innerHTML = `
    <div class="modal-content" style="max-width: 320px; border-radius: var(--radius-xl); padding-bottom: var(--space-lg);">
      <div class="modal-header" style="border-bottom: none; padding-bottom: 0;">
        <div class="modal-title" style="font-size: 1.1rem;">${account.icon} ${account.name}</div>
        <button class="modal-close modal-close-btn">✕</button>
      </div>
      <div style="text-align: center; margin-bottom: var(--space-md); font-weight: bold; font-size: 1.2rem; color: var(--text-secondary);">
        ¥${currentBalance.toLocaleString()}
      </div>
      <div class="quick-menu-grid" style="display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-md); padding: 0 var(--space-md);">
        <button class="btn btn-primary quick-menu-btn" data-type="expense" style="background: var(--color-expense); height: 60px; font-size: 1rem;">支出</button>
        <button class="btn btn-primary quick-menu-btn" data-type="income" style="background: var(--color-income); height: 60px; font-size: 1rem;">収入</button>
        <button class="btn btn-primary quick-menu-btn" data-type="transfer" style="background: var(--color-accent); height: 60px; font-size: 1rem; color: white;">振替</button>
        <button class="btn btn-secondary quick-menu-btn" data-type="correction" style="height: 60px; font-size: 1rem; border: 1px solid var(--border-medium);">修正 (調整)</button>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  const close = () => overlay.remove();
  overlay.querySelector('.modal-close-btn').onclick = close;

  overlay.querySelectorAll('.quick-menu-btn').forEach(btn => {
    btn.onclick = () => {
      const type = btn.dataset.type;
      close();

      if (type === 'correction') {
        openCorrectionModal(account, currentBalance);
      } else {
        const data = { type };
        if (type === 'expense' || type === 'transfer') data.fromAccount = account.name;
        if (type === 'income') data.toAccount = account.name;
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
    <div class="modal-content" style="max-width: 320px; border-radius: var(--radius-xl);">
      <div class="modal-header">
        <div class="modal-title">残高の修正</div>
        <button class="modal-close modal-close-btn">✕</button>
      </div>
      <div style="padding: 0 var(--space-md) var(--space-md);">
        <div style="font-size: 0.9rem; color: var(--text-muted); margin-bottom: var(--space-sm);">現在の残高: ¥${currentBalance.toLocaleString()}</div>
        <div class="form-group">
          <label class="form-label">新しい(実際の)金額を入力</label>
          <input type="number" id="correction-target-amount" class="form-input" placeholder="0" inputmode="numeric">
        </div>
      </div>
      <div class="form-actions" style="border-top: 1px solid var(--border-light); padding: var(--space-md); margin-top: 0;">
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
    const targetAmount = Number(input.value);
    const diff = targetAmount - currentBalance;
    if (diff === 0) return;

    const type = diff > 0 ? 'income' : 'expense';
    const amount = Math.abs(diff);

    const data = { type: type, amount: String(amount), memo: '残高修正' };
    if (type === 'income') data.toAccount = account.name;
    else data.fromAccount = account.name;

    setQuickInput(data);
    close();
    window.navigateTo?.('input');
  };
}

function refresh() {
  const container = document.getElementById('screen-dashboard');
  if (container) {
    container.removeEventListener('click', handleClick);
    render(container);
  }
}
