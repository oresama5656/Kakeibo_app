// ============================================
// Google Sheets API / Drive API 連携 (OAuth 2.0)
// v2.2 - Googleサーバー不調対策 & 安定版
// ============================================

const CLIENT_ID = '847697512612-g7cs60es07i6vghtq8q2j30e5b7t4h80.apps.googleusercontent.com';
const SCOPES = 'https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/drive.file';

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
            // 標準的な読み込み方式に変更 (502エラー対策)
            await gapi.client.load('sheets', 'v4');
            await gapi.client.load('drive', 'v3');
            
            const storedToken = localStorage.getItem('g_access_token');
            if (storedToken) accessToken = storedToken;

            // 2. GIS (OAuth2) の初期化
            tokenClient = google.accounts.oauth2.initTokenClient({
              client_id: CLIENT_ID,
              scope: SCOPES,
              callback: '', // signIn時に定義
            });

            isInitialized = true;
            console.log('Google API fully initialized.');
            resolve();
          } catch (e) {
            console.error('GAPI load error:', e);
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
    if (!tokenClient) {
      return reject(new Error('Google SDK not ready. Please try again.'));
    }

    tokenClient.callback = (resp) => {
      if (resp.error) {
        console.error('Login Error:', resp);
        window.showToast?.(`連携エラー: ${resp.error}`, 'error');
        reject(resp);
        return;
      }
      accessToken = resp.access_token;
      localStorage.setItem('g_access_token', accessToken);
      resolve(accessToken);
    };

    // select_account を指定することで、確実にダイアログを表示させる
    tokenClient.requestAccessToken({ prompt: 'select_account' });
  });
}

export function signOut() {
  accessToken = null;
  localStorage.removeItem('g_access_token');
  localStorage.removeItem('kakeibo_sheet_id');
  window.location.reload();
}

export function isLoggedIn() {
  return !!accessToken;
}

// --- Sheets API Helpers ---

export async function getOrCreateSpreadsheet() {
  let sheetId = localStorage.getItem('kakeibo_sheet_id');
  if (sheetId) return sheetId;

  if (!accessToken) throw new Error('Not logged in');

  try {
    // 既存ファイルの検索
    const resp = await gapi.client.drive.files.list({
      q: "name = 'Kakeibo_App_Data' and mimeType = 'application/vnd.google-apps.spreadsheet' and trashed = false",
      fields: 'files(id, name)',
    });

    const files = resp.result.files;
    if (files && files.length > 0) {
      sheetId = files[0].id;
    } else {
      // 新規作成
      const createResp = await gapi.client.sheets.spreadsheets.create({
        resource: { properties: { title: 'Kakeibo_App_Data' } }
      });
      sheetId = createResp.result.spreadsheetId;
      await setupSpreadsheetSkeleton(sheetId);
    }

    localStorage.setItem('kakeibo_sheet_id', sheetId);
    return sheetId;
  } catch (err) {
    console.error('Drive API error:', err);
    throw err;
  }
}

async function setupSpreadsheetSkeleton(spreadsheetId) {
  const sheets = ['transactions', 'accounts', 'categories', 'shortcuts', 'settings'];
  const requests = sheets.map(name => ({
    addSheet: { properties: { title: name } }
  }));

  await gapi.client.sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    resource: {
      requests: [
        ...requests,
        { deleteSheet: { sheetId: 0 } }
      ]
    }
  });
}

export async function writeRows(spreadsheetId, range, rows) {
  if (!accessToken) return;
  try {
    await gapi.client.sheets.spreadsheets.values.update({
      spreadsheetId,
      range,
      valueInputOption: 'USER_ENTERED',
      resource: { values: rows }
    });
  } catch (e) {
    console.warn('Write failed:', e);
  }
}

export async function readRows(spreadsheetId, range) {
  if (!accessToken) return [];
  try {
    const resp = await gapi.client.sheets.spreadsheets.values.get({
      spreadsheetId,
      range
    });
    return resp.result.values || [];
  } catch (e) {
    console.warn('Read failed:', e);
    return [];
  }
}
