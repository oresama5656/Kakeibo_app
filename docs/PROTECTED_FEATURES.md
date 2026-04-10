# 保護機能リスト (PROTECTED FEATURES)

> ⚠️ **AIへの重要指示**: このファイルに記載されたすべてのロジックは、
> **いかなる修正においても削除・移動・置換してはならない**。
> 修正後に必ず各機能の動作を確認すること。

---

## 【保護対象 #1】ピン留め機能

**場所:** `js/store/SyncManager.js` (同期), `js/screens/settings.js` (設定UI), `js/screens/dashboard.js`, `js/screens/input.js` (表示)

**役割:** 口座・カテゴリに `pinned: true` を設定すると、一覧の最上部に固定表示される。

**データ構造の保護（変更禁止）:**
```js
// accounts の各要素は pinned フィールドを持つ
{ id: 'acc_01', name: '現金', icon: '💵', balance: 0, initialBalance: 0, order: 1, pinned: false }

// categories の各要素も同様
{ id: 'cat_01', name: '食費', icon: '🍎', type: 'expense', order: 1, pinned: false }
```

**クラウド同期での保護（変更禁止）:**
```js
// store.js: syncToCloud() 内 - accounts の pinned フィールドを列7に書き出す
const accRows = state.accounts.map(a => [a.id, a.name, a.icon, a.balance, a.initialBalance, a.order, a.pinned ? 1 : 0]);
// ↑ この列順 (A:G の7列) を絶対に変えないこと

// store.js: readAllFromCloud() 内 - accounts 読み込み時に7列目から読み取る
p(a, r => ({ id: r[0], name: r[1], icon: r[2], balance: Number(r[3] || 0), initialBalance: Number(r[4] || 0), order: Number(r[5] || 0) }))
// ↑ 注意: 現在 pinned は読み込まれていない。今後追加する場合は pinned: r[6] === '1' を追加すること。
```
**ソートロジックの保護（変更禁止）:**
あらゆるリスト表示において、以下のソート順を維持すること。
```js
.sort((a,b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0) || (a.order || 0) - (b.order || 0))
```

**UIの保護（変更禁止）:**
`settings.js` の編集モーダル内の「ピン留め」チェックボックスを削除しないこと。また、ピン留めされた項目には一覧で 📌 アイコンを表示すること。

---

## 【保護対象 #2】口座並び替え（順序変更）機能

**場所:** `js/store.js` + `js/screens/settings.js`

**役割:** ドラッグ&ドロップで口座の表示順を変更できる。

**store.js の保護（変更禁止）:**
```js
export function reorderAccounts(ids) {
  const map = new Map(ids.map((id, idx) => [id, idx + 1]));
  state.accounts.forEach(a => { if (map.has(a.id)) a.order = map.get(a.id); });
  save();
}
```

**settings.js の保護（変更禁止）:**
```js
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
```

> ⚡ 設定画面を修正する際、`initSortable()` の呼び出し3行（accounts, expense, income）を必ず残すこと:
> ```js
> initSortable('settings-accounts-list', 'account');
> initSortable('settings-expense-list', 'category');
> initSortable('settings-income-list', 'category');
> ```

---

## 【保護対象 #3】残高計算ロジック

**場所:** `js/store.js` → `updateAccountBalances()`

**役割:** すべての取引から口座の現在残高を再計算する。アプリ全体の正確性の核心。

**完全なコード（変更禁止）:**
```js
export function updateAccountBalances() {
  state.accounts.forEach(a => a.balance = Number(a.initialBalance || 0));
  
  const findAccount = (id, name) => {
    if (id) return state.accounts.find(a => a.id === id);
    if (name) return state.accounts.find(a => normalizeName(a.name) === normalizeName(name));
    return null;
  };

  [...state.transactions].reverse().forEach(tx => {
    const val = Number(tx.amount) || 0;
    if (tx.type === 'income') {
      const a = findAccount(tx.toAccountId, tx.toAccount);
      if (a) a.balance += val;
    } else if (tx.type === 'expense') {
      const a = findAccount(tx.fromAccountId, tx.fromAccount);
      if (a) a.balance -= val;
    } else if (tx.type === 'transfer') { 
      const from = findAccount(tx.fromAccountId, tx.fromAccount);
      const to = findAccount(tx.toAccountId, tx.toAccount);
      if (from) from.balance -= val;
      if (to) to.balance += val;
    }
  });
}
```

---

## 【保護対象 #4】クラウド同期のデータ列構造

**場所:** `js/store.js` → `syncToCloud()` / `readAllFromCloud()`

**役割:** スプレッドシートのどの列に何のデータが入るかの定義。**変更すると全データが破損する。**

```
transactions: [ID, 日付, 金額, 種別, カテゴリ名, 出金口座名, メモ, 入金口座名, カテゴリID, 出金ID, 入金ID]  → 11列 (A:K)
categories:   [ID, 名前, アイコン, 種別, 並び順, pinned]  → 6列 (A:F)
accounts:     [ID, 名前, アイコン, 残高, 初期残高, 並び順, pinned]  → 7列 (A:G)
shortcuts:    [ID, 名前, 種別, 金額, カテゴリ名, 出金口座名, 入金口座名, 並び順, カテゴリID, 出金ID, 入金ID]  → 11列 (A:K)
```

---

## 【保護対象 #5】ID補完・データ移行ロジック

**場所:** `js/store.js` → `migrateTransactionIds()` / `sanitizeTransaction()`

**役割:** 旧データ（IDなし）から新データ（IDあり）への自動変換。削除するとデータ不整合が発生する。

```js
function migrateTransactionIds(transactions, accounts, categories) { ... }  // 絶対に削除しないこと
function sanitizeTransaction(tx) { ... }  // 絶対に削除しないこと
```
