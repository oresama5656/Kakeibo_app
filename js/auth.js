// ============================================
// Google Sheets API / Drive API 連携 (OAuth 2.0)
// v2.1 - スマホ互換性強化版
// ============================================

const CLIENT_ID = '847697512612-g7cs60es07i6vghtq8q2j30e5b7t4h80.apps.googleusercontent.com';
const SCOPES = 'https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/drive.file';

let tokenClient;
let accessToken = null;
let isInitializing = false;

// Initialize Google GIS & GAPI
export async function initGoogleAuth() {
  if (isInitializing) return;
  isInitializing = true;

  return new Promise((resolve) => {
    // 1. GAPI Client Load
    const loadGapi = () => {
      gapi.load('client', async () => {
        try {
          await gapi.client.init({});
          // Discovery docs are helpful for mobile stability
          await gapi.client.load('https://sheets.googleapis.com/$discovery/rest?version=v4');
          await gapi.client.load('https://www.googleapis.com/discovery/v1/rest?name=drive&version=v3');
          
          const storedToken = localStorage.getItem('g_access_token');
          if (storedToken) accessToken = storedToken;
          
          console.log('GAPI client loaded.');
          resolve();
        } catch (e) {
          console.error('GAPI init error:', e);
          resolve(); // Resolve anyway to allow manual retries
        }
      });
    };

    // 2. GIS Token Client Init
    if (window.google && google.accounts.oauth2) {
      tokenClient = google.accounts.oauth2.initTokenClient({
        client_id: CLIENT_ID,
        scope: SCOPES,
        callback: '', // defined in signIn
      });
      loadGapi();
    } else {
      // Wait for SDKs
      let retries = 0;
      const wait = setInterval(() => {
        if (window.google && google.accounts.oauth2 && window.gapi) {
          clearInterval(wait);
          tokenClient = google.accounts.oauth2.initTokenClient({
            client_id: CLIENT_ID,
            scope: SCOPES,
            callback: '',
          });
          loadGapi();
        } else if (retries++ > 10) {
          clearInterval(wait);
          console.warn('Google SDK loads timed out.');
          resolve();
        }
      }, 500);
    }
  });
}

export function signIn() {
  return new Promise((resolve, reject) => {
    if (!tokenClient) {
      // Late initialization for mobile
      try {
        tokenClient = google.accounts.oauth2.initTokenClient({
          client_id: CLIENT_ID,
          scope: SCOPES,
          callback: '',
        });
      } catch (e) {
        window.showToast?.('Google SDKが準備中です。数秒待ってから再度お試しください', 'info');
        return reject(e);
      }
    }

    tokenClient.callback = (resp) => {
      if (resp.error) {
        console.error('GIS Error:', resp);
        // Error messages like 'popup_blocked_by_browser' are common on mobile
        if (resp.error === 'popup_blocked_by_browser') {
          window.showToast?.('ポップアップがブロックされました。ブラウザの設定を許可してください', 'error');
        } else {
          window.showToast?.(`連携エラー: ${resp.error}`, 'error');
        }
        reject(resp);
        return;
      }
      accessToken = resp.access_token;
      localStorage.setItem('g_access_token', accessToken);
      resolve(accessToken);
    };

    // Use prompt: 'select_account' to avoid silent failures on mobile
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

  if (!accessToken) throw new Error('No access token');

  try {
    const q = "name = 'Kakeibo_App_Data' and mimeType = 'application/vnd.google-apps.spreadsheet' and trashed = false";
    const resp = await gapi.client.drive.files.list({
      q: q,
      fields: 'files(id, name)',
    });

    const files = resp.result.files;
    if (files && files.length > 0) {
      sheetId = files[0].id;
    } else {
      const createResp = await gapi.client.sheets.spreadsheets.create({
        properties: { title: 'Kakeibo_App_Data' }
      });
      sheetId = createResp.result.spreadsheetId;
      await setupSpreadsheetSkeleton(sheetId);
    }

    localStorage.setItem('kakeibo_sheet_id', sheetId);
    return sheetId;
  } catch (err) {
    console.error('Drive/Sheets file lookup failed:', err);
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
  await gapi.client.sheets.spreadsheets.values.update({
    spreadsheetId,
    range,
    valueInputOption: 'USER_ENTERED',
    resource: { values: rows }
  });
}

export async function readRows(spreadsheetId, range) {
  if (!accessToken) return [];
  const resp = await gapi.client.sheets.spreadsheets.values.get({
    spreadsheetId,
    range
  });
  return resp.result.values || [];
}
