/**
 * Real-time Sync Client
 * Cloudflare Worker の WebSocket と接続し、データ更新を通知・受信します。
 */

import * as store from './store.js';

let ws;
const WORKER_WS_URL = 'wss://kakeibo-auth-worker.oresama5656.workers.dev/ws'; // 本番デプロイ済み

export function initRealtimeSync() {
  // ログイン済みの場合のみ接続（未ログイン時の無限再接続ループを防ぐ）
  import('./auth.js').then(auth => {
    if (auth.isLoggedIn()) connect();
  });
}

function connect() {
  console.log('Connecting to Real-time Sync Hub...');
  ws = new WebSocket(WORKER_WS_URL);

  ws.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      if (data.type === 'SYNC_REQUIRED') {
        console.log('Real-time update received. Pulling latest data...');
        store.pullFromCloud(); // store.js の同期処理を呼び出す
      }
    } catch (e) {
      console.error('WS Message Error:', e);
    }
  };

  ws.onclose = () => {
    console.warn('Real-time sync disconnected. Retrying in 5s...');
    setTimeout(connect, 5000);
  };

  ws.onerror = (err) => {
    console.error('WS Connection Error:', err);
    ws.close();
  };
}

/**
 * データが更新されたことを他デバイスに通知する
 */
export function notifyUpdate() {
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ type: 'UPDATE_NOTIFY' }));
  }
}
