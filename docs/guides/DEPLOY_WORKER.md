# Cloudflare Workers デプロイ & 設定手順書

フェーズ2（永続セッション）とフェーズ3（リアルタイム同期）を有効にするための手順です。

## 1. Cloudflare の準備
1.  **Wrangler のインストール** (未導入の場合):
    ```bash
    npm install -g wrangler
    ```
2.  **ログイン**:
    ```bash
    wrangler login
    ```
3.  **KV データの作成**:
    ```bash
    wrangler kv:namespace create KAKEIBO_AUTH_KV
    ```
    表示された `id` を `worker/wrangler.toml` の `id = "..."` に貼り付けてください。

## 2. Google Cloud Console の設定
1.  [Google Cloud Console](https://console.cloud.google.com/) にアクセス。
2.  **API とサービス > 認証情報** を開く。
3.  既存の「OAuth 2.0 クライアント ID」を編集、または新規作成。
    -   **承認済みの JavaScript 生成元**: `http://localhost:3000` (と本番URL)
    -   **承認済みのリダイレクト URI**: `http://localhost:3000` (と本番URL)
4.  **クライアント ID** と **クライアント シークレット** を取得。
5.  `worker/wrangler.toml` の `GOOGLE_CLIENT_ID` と `GOOGLE_CLIENT_SECRET` を書き換えてください。

## 3. デプロイ
1.  Worker ディレクトリへ移動:
    ```bash
    cd worker
    ```
2.  デプロイ実行:
    ```bash
    wrangler deploy
    ```
3.  デプロイ後に表示される URL (例: `https://kakeibo-auth-worker.YOURNAME.workers.dev`) をコピー。
4.  `js/auth.js` の `WORKER_URL` をその URL に書き換えてください。
5.  `js/sync.js` の `WORKER_WS_URL` を `wss://(Workerのドメイン)/ws` に書き換えてください。

## 4. 動作確認
-   アプリにログインすると、初回のみ認証ポップアップが出ます。
-   一度ログインすれば、ブラウザを閉じても次回起動時に自動でアクセストークンが取得されます。
-   複数タブまたは複数デバイスで開いた状態で、一方で保存を行うと、もう一方の画面が自動で「カシャッ」と更新されるはずです。
