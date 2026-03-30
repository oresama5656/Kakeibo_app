# 📊 シンプル家計簿 (Kakeibo Web App)

シンプルで、Googleスプレッドシートとリアルタイムに同期できる家計簿Webアプリです。
PCとスマートフォンの両方から、広告なし・完全無料で資産管理ができます。

## 🌟 主な特徴

- **リアルタイム・クラウド同期**: Google Sheets APIを使用して、あなたのGoogleドライブ内のスプレッドシートにデータを直接保存。
- **ひと目でわかる資産推移**: Chart.jsを使用したダッシュボードで、資産の増減をグラフで可視化。
- **爆速入力UI**: スマホ片手でも入力しやすい大きなボタンと、カテゴリー/口座を絵文字で選べるアイコンピッカー。
- **ダークモード対応**: システム設定や好みに合わせて、目に優しい表示に切り替え可能。
- **安心のプライバシー**: サーバーを持たない純粋なWebアプリ。データはあなたのGoogleアカウント内にのみ保存されます。

## 🚀 セットアップガイド

個人のGoogleアカウントを使用して、自分専用の家計簿をデプロイ・利用するための手順です。

### 1. Google Cloud Console での準備
1. [Google Cloud Console](https://console.cloud.google.com/) にアクセスし、プロジェクトを作成します。
2. **APIとサービス** > **ライブラリ** から以下の2つを検索し、**有効化** します。
   - `Google Sheets API`
   - `Google Drive API`
3. **OAuth 同意画面** を設定します（「外部」を選択し、テストユーザーに自分のメールアドレスを追加）。
4. **認証情報** > **認証情報を作成** > **OAuth クライアント ID** を作成します。
   - **アプリケーションの種類**: ウェブ アプリケーション
   - **承認済みの JavaScript オリジン**:
     - `http://localhost:3000` （ローカル開発用）
     - `https://[あなたのGitHubユーザー名].github.io` （GitHub Pages公開用）
   - **クライアント ID** をコピーしておきます。

### 2. プログラムの構成
1. `js/auth.js` を開き、先ほど取得したクライアントIDを `CLIENT_ID` 変数に貼り付けます。
2. リポジトリを GitHub にプッシュし、**GitHub Pages** で公開設定を行います。

## 📂 フォルダ構成
- `index.html`: アプリの土台。Google SDKを読み込みます。
- `css/`: カスタムデザインシステム。ダークモード・アニメーション対応。
- `js/`: アプリケーションの脳。
  - `app.js`: 画面の切り替えと全体の初期化。
  - `auth.js`: Googleログイン、スプレッドシートの作成・読み書き。
  - `store.js`: 取引データの計算、ローカルとクラウドのデータ同期。
  - `screens/`: 各画面（入力・履歴・グラフ・設定）の表示ロジック。
- `js/data.js`: 初期データや絵文字リスト。

## 🔧 使用技術
- **Core**: Vanilla JavaScript (ES Module形式)
- **Styling**: CSS (Flexbox / Grid, CSS Variables)
- **API**: Google Cloud Services (GAPI / GIS)
- **Charts**: Chart.js

---
**Powered by Antigravity AI Assistant**
