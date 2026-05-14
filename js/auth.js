const CLIENT_ID = '847697512612-g7cs60es07i6vghtq8q2j30e5b7t4h80.apps.googleusercontent.com';
const SCOPES = 'https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/userinfo.email';
const WORKER_URL = 'https://kakeibo-auth-worker.oresama5656.workers.dev'; // 本番デプロイ済み

import * as store from './store/index.js';

let codeClient;
let accessToken = null;
let isInitialized = false;

/**
 * Google SDKの初期化
 */
export async function initGoogleAuth() {
  if (isInitialized) return;

  return new Promise((resolve) => {
    const checkAndInit = () => {
      if (window.gapi && window.google) {
        // 1. GAPIのロード
        gapi.load('client', async () => {
          try {
            await gapi.client.init({});
            await gapi.client.load('sheets', 'v4');
            await gapi.client.load('drive', 'v3');
            
            const storedToken = localStorage.getItem('g_access_token');
            const storedTime = localStorage.getItem('g_token_timestamp');
            const now = Date.now();

            // 1時間(3600秒)で切れるため、55分経過していたら無効とみなす
            if (storedToken && storedTime && (now - Number(storedTime) < 55 * 60 * 1000)) {
              accessToken = storedToken;
              gapi.client.setToken({ access_token: accessToken });
              console.log('Valid stored token found. Active.');
              startAutoRefresh(); // 自動更新タイマー開始
            } else {
              localStorage.removeItem('g_access_token');
              localStorage.removeItem('g_token_timestamp');
            }

            // 2. GIS (OAuth2) の初期化 (Code Clientに変更)
            codeClient = google.accounts.oauth2.initCodeClient({
              client_id: CLIENT_ID,
              scope: SCOPES,
              ux_mode: 'popup',
              callback: async (resp) => {
                if (resp.error) return;
                await handleCodeResponse(resp.code);
              },
            });

            isInitialized = true;
            
            // 初期化時にメールアドレスが保存されているか確認（セッション維持用）
            const storedEmail = localStorage.getItem('g_user_email');
            if (!accessToken && storedEmail) {
              // メールはあるがトークンがない（または期限切れ）場合、Worker経由で自動復帰を試みる
              await silentRefresh();
            }

            resolve();
          } catch (e) {
            console.error('GAPI initialization failure:', e);
            resolve();
          }
        });
      } else {
        setTimeout(checkAndInit, 500);
      }
    };
    checkAndInit();
  });
}

/**
 * ログイン実行 (Codeを取得してWorkerへ送る)
 */
export function signIn() {
  return new Promise((resolve, reject) => {
    if (!codeClient) return reject(new Error('Google SDK not ready.'));

    codeClient.callback = async (resp) => {
      if (resp.error) {
        window.showToast?.(`連携エラー: ${resp.error}`, 'error');
        reject(resp);
        return;
      }
      try {
        await handleCodeResponse(resp.code);
        resolve(accessToken);
      } catch (e) {
        reject(e);
      }
    };

    codeClient.requestCode();
  });
}

/**
 * Worker経由でのトークン更新
 */
async function silentRefresh() {
  const userId = localStorage.getItem('g_user_email');
  if (!userId) return false;

  try {
    const resp = await fetch(`${WORKER_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId })
    });

    const data = await resp.json();
    if (data.error) {
      console.warn('Silent refresh failed via Worker:', data.error);
      return false;
    }

    handleTokenResponse(data);
    console.log('Token refreshed via Worker.');
    return true;
  } catch (e) {
    console.warn('Worker connection failed during refresh:', e);
    return false;
  }
}

async function handleCodeResponse(code) {
  // WorkerにCodeを送り、アクセストークン（とサーバー側でのリフレッシュトークン保存）を得る
  const resp = await fetch(`${WORKER_URL}/auth/callback`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code })
  });

  const data = await resp.json();
  if (data.error) throw new Error(data.error);

  await handleTokenResponse(data);
}

async function handleTokenResponse(data) {
  accessToken = data.access_token;
  gapi.client.setToken({ access_token: accessToken });
  
  // サーバーが特定したメールアドレスを保存
  if (data.email) {
    localStorage.setItem('g_user_email', data.email);
  }
  
  localStorage.setItem('g_access_token', accessToken);
  localStorage.setItem('g_token_timestamp', Date.now().toString());
  startAutoRefresh();
}

/**
 * ユーザーのメールアドレスを取得し、アカウントの不一致をチェックする
 */
async function fetchAndCheckUserEmail(token) {
  try {
    const response = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${token}` }
    });
    const userInfo = await response.json();
    const newEmail = userInfo.email;

    if (!newEmail) return true;

    const currentEmail = localStorage.getItem('g_user_email');

    // 初回ログイン時はメールを保存するだけ
    if (!currentEmail) {
      localStorage.setItem('g_user_email', newEmail);
      return true;
    }

    // アカウントが切り替わった場合
    if (currentEmail !== newEmail) {
      console.warn('Account mismatch detected:', currentEmail, '->', newEmail);
      alert('別のアカウントが選択されました。データの混同を防ぐため、現在のデータを削除してログアウトします。');
      store.blockSync(); // 同期を即座に停止
      
      // signOut()の前に確実にデータを消去する（リロードより前に消去を完了させる）
      localStorage.removeItem('kakeibo_data');
      localStorage.removeItem('kakeibo_sheet_id');
      localStorage.removeItem('g_user_email');
      
      signOut(); // ここでリロードされる
      return false; // 不一致を呼び出し元に伝える
    }
    
    return true; // 一致している、または初回
  } catch (e) {
    console.error('Failed to fetch user email:', e);
    return false;
  }
}

let refreshTimer = null;
function startAutoRefresh() {
  if (refreshTimer) clearTimeout(refreshTimer);
  // 50分ごとに更新を試みる
  refreshTimer = setTimeout(async () => {
    await silentRefresh();
  }, 50 * 60 * 1000);
}

export function signOut() {
  store.blockSync(); // ログアウト処理開始時に同期を遮断
  accessToken = null;
  if (refreshTimer) clearTimeout(refreshTimer);
  localStorage.removeItem('g_access_token');
  localStorage.removeItem('g_token_timestamp');
  localStorage.removeItem('g_user_email');
  localStorage.removeItem('kakeibo_sheet_id');
  localStorage.removeItem('kakeibo_data');
  localStorage.removeItem('kakeibo_current_screen'); // 念のため画面状態もリセット
  window.location.reload();
}

export function isLoggedIn() {
  return !!accessToken;
}

// --- Sheets API Helpers ---

export async function getOrCreateSpreadsheet() {
  if (!accessToken) {
    const success = await silentRefresh();
    if (!success) return { id: null, isNew: false };
  }
  
  try {
    const resp = await gapi.client.drive.files.list({
      q: "name = 'Kakeibo_App_Data' and mimeType = 'application/vnd.google-apps.spreadsheet' and trashed = false",
      fields: 'files(id, name)',
    });

    const files = resp.result.files;
    if (files && files.length > 0) {
      const sheetId = files[0].id;
      localStorage.setItem('kakeibo_sheet_id', sheetId);
      await ensureSheetsExist(sheetId);
      return { id: sheetId, isNew: false };
    } else {
      const createResp = await gapi.client.sheets.spreadsheets.create({
        resource: { properties: { title: 'Kakeibo_App_Data' } }
      });
      const sheetId = createResp.result.spreadsheetId;
      await setupSpreadsheetSkeleton(sheetId);
      localStorage.setItem('kakeibo_sheet_id', sheetId);
      return { id: sheetId, isNew: true };
    }
  } catch (err) {
    if (err.status === 401 || err.status === 403) {
      if (await silentRefresh()) return getOrCreateSpreadsheet();
    }
    throw err;
  }
}

export async function clearRows(spreadsheetId, range) {
  try {
    await gapi.client.sheets.spreadsheets.values.clear({ spreadsheetId, range });
  } catch (err) {
    if (err.status === 401 || err.status === 403) {
      if (await silentRefresh()) return clearRows(spreadsheetId, range);
    }
  }
}

/**
 * スプレッドシートにデバッグログを書き込む
 */
export async function writeLog(spreadsheetId, message) {
  try {
    const timestamp = new Date().toISOString();
    await gapi.client.sheets.spreadsheets.values.append({
      spreadsheetId,
      range: 'logs!A1',
      valueInputOption: 'USER_ENTERED',
      resource: { values: [[timestamp, message]] }
    });
  } catch (e) {
    console.warn('Failed to write cloud log:', e);
  }
}

/**
 * 複数の範囲を一括で消去
 */
export async function batchClear(spreadsheetId, ranges) {
  try {
    return await gapi.client.sheets.spreadsheets.values.batchClear({
      spreadsheetId,
      resource: { ranges }
    });
  } catch (e) {
    if (e.status === 401 || e.status === 403) {
      if (await silentRefresh()) return batchClear(spreadsheetId, ranges);
    }
    throw e;
  }
}

/**
 * 複数の範囲を一括で更新
 */
export async function batchUpdateValues(spreadsheetId, data) {
  try {
    return await gapi.client.sheets.spreadsheets.values.batchUpdate({
      spreadsheetId,
      resource: {
        valueInputOption: 'USER_ENTERED',
        data: data
      }
    });
  } catch (e) {
    if (e.status === 401 || e.status === 403) {
      if (await silentRefresh()) return batchUpdateValues(spreadsheetId, data);
    }
    throw e;
  }
}

/**
 * Google Sheets API の spreadsheets.batchUpdate を呼び出す汎用ラッパー
 * シート構造変更（行の追加・削除など）に使用する
 */
export async function batchUpdateRows(spreadsheetId, requests) {
  try {
    return await gapi.client.sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      resource: { requests }
    });
  } catch (e) {
    if (e.status === 401 || e.status === 403) {
      if (await silentRefresh()) return batchUpdateRows(spreadsheetId, requests);
    }
    throw e;
  }
}

async function ensureSheetsExist(spreadsheetId) {
  try {
    const resp = await gapi.client.sheets.spreadsheets.get({ spreadsheetId });
    const existingSheets = resp.result.sheets.map(s => s.properties.title);
    const requiredSheets = ['transactions', 'accounts', 'categories', 'shortcuts', 'settings', 'logs'];
    const missingSheets = requiredSheets.filter(name => !existingSheets.includes(name));

    if (missingSheets.length > 0) {
      const requests = missingSheets.map(name => ({ addSheet: { properties: { title: name } } }));
      await gapi.client.sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        resource: { requests }
      });
      console.log('[Auth] Automatically added missing sheets:', missingSheets);
    }
  } catch (e) {
    console.warn('[Auth] Failed to verify missing sheets (might fail later):', e);
  }
}

async function setupSpreadsheetSkeleton(spreadsheetId) {
  const sheets = ['transactions', 'accounts', 'categories', 'shortcuts', 'settings', 'logs'];
  const requests = sheets.map(name => ({ addSheet: { properties: { title: name } } }));
  await gapi.client.sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    resource: { requests: [...requests, { deleteSheet: { sheetId: 0 } }] }
  });
}

export async function writeRows(spreadsheetId, range, rows) {
  try {
    return await gapi.client.sheets.spreadsheets.values.update({
      spreadsheetId, range, valueInputOption: 'USER_ENTERED',
      resource: { values: rows }
    });
  } catch (e) {
    if (e.status === 401 || e.status === 403) {
      if (await silentRefresh()) return writeRows(spreadsheetId, range, rows);
    }
    throw e;
  }
}

export async function readRows(spreadsheetId, range) {
  try {
    const resp = await gapi.client.sheets.spreadsheets.values.get({ spreadsheetId, range });
    return resp.result.values || [];
  } catch (e) {
    if (e.status === 401 || e.status === 403) {
      if (await silentRefresh()) return readRows(spreadsheetId, range);
    }
    throw e;
  }
}

