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
        console.log('SDK detection successful. Loading GAPI components...');
        // 1. GAPIのロード
        gapi.load('client', async () => {
          try {
            await gapi.client.init({});
            console.log('GAPI client init base successful.');
            // 標準的な読み込み方式に変更 (502エラー対策)
            await gapi.client.load('sheets', 'v4');
            await gapi.client.load('drive', 'v3');
            console.log('GAPI sheets/drive loaded.');
            
            const storedToken = localStorage.getItem('g_access_token');
            if (storedToken) {
              accessToken = storedToken;
              gapi.client.setToken({ access_token: accessToken });
            }

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
            console.error('GAPI initialization major failure:', e);
            window.showToast?.(`API初期化エラー: ${e.message || JSON.stringify(e)}`, 'error');
            resolve(); // 続行は試みるが失敗の可能性大
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
      gapi.client.setToken({ access_token: accessToken });
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
    if (!gapi.client.drive) {
        console.log('Drive API client missing, retrying load...');
        await gapi.client.load('drive', 'v3');
    }
    const resp = await gapi.client.drive.files.list({
      q: "name = 'Kakeibo_App_Data' and mimeType = 'application/vnd.google-apps.spreadsheet' and trashed = false",
      fields: 'files(id, name)',
    });

    const files = resp.result.files;
    if (files && files.length > 0) {
      sheetId = files[0].id;
      console.log('Existing spreadsheet found:', sheetId);
    } else {
      console.log('No existing spreadsheet. Creating new one...');
      if (!gapi.client.sheets) {
          await gapi.client.load('sheets', 'v4');
      }
      // 新規作成
      const createResp = await gapi.client.sheets.spreadsheets.create({
        resource: { properties: { title: 'Kakeibo_App_Data' } }
      });
      sheetId = createResp.result.spreadsheetId;
      console.log('New spreadsheet created:', sheetId);
      await setupSpreadsheetSkeleton(sheetId);
    }

    localStorage.setItem('kakeibo_sheet_id', sheetId);
    return sheetId;
  } catch (err) {
    console.error('Sheets API update error:', err);
    throw err;
  }
}

/**
 * シートの指定範囲をクリアする（古いデータの残骸を防ぐため）
 */
export async function clearRows(spreadsheetId, range) {
  if (!accessToken) return;
  try {
    await gapi.client.sheets.spreadsheets.values.clear({
      spreadsheetId: spreadsheetId,
      range: range,
    });
  } catch (err) {
    console.warn('Clear error (non-fatal):', err);
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
  if (!accessToken) throw new Error('アクセストークンがありません。再ログインしてください。');
  try {
    const resp = await gapi.client.sheets.spreadsheets.values.update({
      spreadsheetId,
      range,
      valueInputOption: 'USER_ENTERED',
      resource: { values: rows }
    });
    return resp;
  } catch (e) {
    if (e.status === 401 || e.status === 403) {
      accessToken = null;
      localStorage.removeItem('g_access_token');
    }
    throw e;
  }
}

export async function readRows(spreadsheetId, range) {
  if (!accessToken) throw new Error('アクセストークンがありません。再ログインしてください。');
  try {
    const resp = await gapi.client.sheets.spreadsheets.values.get({
      spreadsheetId,
      range
    });
    return resp.result.values || [];
  } catch (e) {
    if (e.status === 401 || e.status === 403) {
      accessToken = null;
      localStorage.removeItem('g_access_token');
    }
    throw e;
  }
}
