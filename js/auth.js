const CLIENT_ID = '847697512612-g7cs60es07i6vghtq8q2j30e5b7t4h80.apps.googleusercontent.com';
const SCOPES = 'https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/userinfo.email';

import * as store from './store.js';

let tokenClient;
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

            // 2. GIS (OAuth2) の初期化
            tokenClient = google.accounts.oauth2.initTokenClient({
              client_id: CLIENT_ID,
              scope: SCOPES,
              callback: (resp) => {
                if (resp.error) return;
                handleTokenResponse(resp);
              },
            });

            isInitialized = true;
            
            // 初期化時にメールアドレスが保存されているか確認（セッション維持用）
            const storedEmail = localStorage.getItem('g_user_email');
            if (accessToken && !storedEmail) {
              // トークンはあるがメールがない場合（移行期間など）、取得を試みる
              await fetchAndCheckUserEmail(accessToken);
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
 * ログイン実行
 */
export function signIn() {
  return new Promise((resolve, reject) => {
    if (!tokenClient) return reject(new Error('Google SDK not ready.'));

    tokenClient.callback = (resp) => {
      if (resp.error) {
        window.showToast?.(`連携エラー: ${resp.error}`, 'error');
        reject(resp);
        return;
      }
      handleTokenResponse(resp);
      resolve(accessToken);
    };

    // 初回は確実にアカウント選択を出す
    tokenClient.requestAccessToken({ prompt: 'select_account' });
  });
}

/**
 * サイレント・リフレッシュ (ユーザー操作なしでトークン更新)
 */
async function silentRefresh() {
  return new Promise((resolve) => {
    if (!tokenClient) return resolve(false);
    
    tokenClient.callback = (resp) => {
      if (resp.error) {
        console.warn('Silent refresh failed:', resp.error);
        resolve(false);
        return;
      }
      handleTokenResponse(resp);
      console.log('Token refreshed silently.');
      resolve(true);
    };

    // prompt: none はサードパーティCookie制限等で動かないことが多いため、
    // promptを指定せずに実行（ログイン済みなら一瞬ポップアップが出るか出ないかで更新される）
    tokenClient.requestAccessToken({ prompt: '' });
  });
}

async function handleTokenResponse(resp) {
  const newTask = resp.access_token;
  
  // 以前のメールアドレスと比較して、アカウント変更を検知する
  await fetchAndCheckUserEmail(newTask);
  
  accessToken = newTask;
  gapi.client.setToken({ access_token: accessToken });
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

    if (!newEmail) return;

    const currentEmail = localStorage.getItem('g_user_email');

    // 初回ログイン時はメールを保存するだけ
    if (!currentEmail) {
      localStorage.setItem('g_user_email', newEmail);
      return;
    }

    // アカウントが切り替わった場合
    if (currentEmail !== newEmail) {
      console.warn('Account mismatch detected:', currentEmail, '->', newEmail);
      alert('別のアカウントが選択されました。データの混同を防ぐため、現在のデータを削除してログアウトします。');
      store.blockSync(); // 同期を即座に停止
      signOut(); // ここでリロードされる
    }
  } catch (e) {
    console.error('Failed to fetch user email:', e);
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

async function setupSpreadsheetSkeleton(spreadsheetId) {
  const sheets = ['transactions', 'accounts', 'categories', 'shortcuts', 'settings'];
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

