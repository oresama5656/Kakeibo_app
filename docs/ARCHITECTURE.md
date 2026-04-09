# アーキテクチャ定義書 (ARCHITECTURE)

> ⚠️ **AIへの重要指示**: このファイルはコード修正の前に必ず参照すること。
> 各ファイルの「責任範囲」を厳守し、修正するファイル以外には**絶対に手を加えないこと**。

---

## ファイル構成と責任範囲

| ファイル | 役割 | 触れてよいタイミング |
|---------|------|------------------|
| `js/store.js` | データの読み書き・クラウド同期・残高計算 | データ操作の追加・修正のみ |
| `js/app.js` | ナビゲーション・アプリ初期化・Googleログイン初期化 | 画面遷移の修正のみ |
| `js/auth.js` | Google OAuth・スプレッドシートAPI | 認証関係の修正のみ |
| `js/data.js` | 静的定数（絵文字リストなど） | データ定数の追加のみ |
| `js/screens/input.js` | 入力フォーム・ショートカット | 入力画面のUIのみ |
| `js/screens/dashboard.js` | 残高サマリー・ダッシュボード | ダッシュボード画面のUIのみ |
| `js/screens/history.js` | 取引履歴一覧・検索・フィルター | 履歴画面のUIのみ |
| `js/screens/analysis.js` | グラフ・資産推移・口座グラフ | 分析画面のUIのみ |
| `js/screens/settings.js` | 口座管理・カテゴリ管理・クラウド設定 | 設定画面のUIのみ |

---

## 依存関係（インポート関係）

```
app.js
  ├── store.js
  ├── auth.js
  ├── screens/input.js
  ├── screens/dashboard.js
  ├── screens/history.js
  ├── screens/analysis.js
  └── screens/settings.js

screens/*.js
  ├── store.js （データアクセス）
  ├── auth.js  （settings.jsのみ）
  └── data.js  （定数参照）

store.js
  └── auth.js  （クラウド同期）
```

---

## 修正のルール

### ✅ やってよいこと
- **指定されたファイルのみを編集する**
- 存在するロジックに新しいプロパティやイベントを追加する
- バグ修正のために最小限のコードを変更する

### ❌ やってはいけないこと
- **修正対象外のファイルを書き換える**
- 既存の `export` 関数を削除する
- `store.js` の `state` オブジェクトの構造を変更する
- `PROTECTED_FEATURES.md` に記載されたコードを削除・移動する

---

## データ構造（変更禁止）

### state オブジェクト
```js
let state = {
  transactions: [],  // { id, date, amount, type, category, fromAccount, memo, toAccount, categoryId, fromAccountId, toAccountId }
  categories: [],    // { id, name, icon, type, order, pinned }
  accounts: [],      // { id, name, icon, balance, initialBalance, order, pinned }
  shortcuts: [],     // { id, name, type, amount, category, fromAccount, toAccount, order, categoryId, fromAccountId, toAccountId }
  deletedIds: [],    // 削除済みIDのリスト（クラウド同期で使用）
  settings: { darkMode: 'auto' }
};
```

> `pinned` フィールドは口座・カテゴリのピン留め機能のために予約されています。削除禁止。
