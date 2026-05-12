/**
 * Kakeibo App Auth Worker
 * Google OAuth のリフレッシュトークンを安全に管理し、セッションを維持します。
 */

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    try {
      // 1. 認証コードをトークンに交換
      if (url.pathname === '/auth/callback' && request.method === 'POST') {
        const { code } = await request.json();
        
        // A. コードをトークンに交換
        const tokenResp = await fetch('https://oauth2.googleapis.com/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            code,
            client_id: env.GOOGLE_CLIENT_ID,
            client_secret: env.GOOGLE_CLIENT_SECRET,
            redirect_uri: env.REDIRECT_URI,
            grant_type: 'authorization_code',
          }),
        });

        const tokens = await tokenResp.json();
        console.log('Google Token Response:', JSON.stringify(tokens));
        if (tokens.error) throw new Error(tokens.error_description || tokens.error);

        // B. ユーザー情報を取得してメールアドレスを特定
        const userResp = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
          headers: { Authorization: `Bearer ${tokens.access_token}` }
        });
        const userInfo = await userResp.json();
        console.log('Google UserInfo Response:', JSON.stringify(userInfo));
        const email = userInfo.email;

        if (!email) throw new Error('Could not retrieve email from Google');

        // C. リフレッシュトークンをKVに保存
        if (tokens.refresh_token) {
          await env.KAKEIBO_AUTH_KV.put(`refresh_token:${email}`, tokens.refresh_token);
        }

        return new Response(JSON.stringify({
          access_token: tokens.access_token,
          expires_in: tokens.expires_in,
          email: email
        }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      // 2. トークンのリフレッシュ
      if (url.pathname === '/auth/refresh' && request.method === 'POST') {
        const { userId } = await request.json();
        const refreshToken = await env.KAKEIBO_AUTH_KV.get(`refresh_token:${userId}`);

        if (!refreshToken) {
          return new Response(JSON.stringify({ error: 'No refresh token found' }), { 
            status: 401, 
            headers: corsHeaders 
          });
        }

        const refreshResp = await fetch('https://oauth2.googleapis.com/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            refresh_token: refreshToken,
            client_id: env.GOOGLE_CLIENT_ID,
            client_secret: env.GOOGLE_CLIENT_SECRET,
            grant_type: 'refresh_token',
          }),
        });

        const data = await refreshResp.json();
        return new Response(JSON.stringify(data), { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        });
      }

      // 3. WebSocket 接続 (リアルタイム同期用)
      if (url.pathname === '/ws') {
        const upgradeHeader = request.headers.get('Upgrade');
        if (!upgradeHeader || upgradeHeader !== 'websocket') {
          return new Response('Expected Upgrade: websocket', { status: 426 });
        }

        const id = env.SYNC_HUB.idFromName('global_sync_hub');
        const stub = env.SYNC_HUB.get(id);
        return stub.fetch(request);
      }

      return new Response('Not Found', { status: 404 });
    } catch (err) {
      console.error('Worker Error:', err.message);
      return new Response(JSON.stringify({ error: err.message }), { 
        status: 500, 
        headers: corsHeaders 
      });
    }
  },
};

/**
 * リアルタイム同期を管理する Durable Object
 */
export class SyncHub {
  constructor(state, env) {
    this.state = state;
    this.sessions = new Set();
  }

  async fetch(request) {
    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);

    await this.handleSession(server);

    return new Response(null, { status: 101, webSocket: client });
  }

  async handleSession(server) {
    server.accept();
    this.sessions.add(server);

    server.addEventListener('message', async (msg) => {
      try {
        const data = JSON.parse(msg.data);
        if (data.type === 'UPDATE_NOTIFY') {
          this.broadcast({ type: 'SYNC_REQUIRED' }, server);
        }
      } catch (e) {
        console.error('WS Error:', e);
      }
    });

    server.addEventListener('close', () => {
      this.sessions.delete(server);
    });
  }

  broadcast(message, exclude) {
    const data = JSON.stringify(message);
    for (const session of this.sessions) {
      if (session !== exclude) {
        try {
          session.send(data);
        } catch (e) {
          this.sessions.delete(session);
        }
      }
    }
  }
}
