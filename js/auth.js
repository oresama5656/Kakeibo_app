// ============================================
// Google Sheets API / Drive API 連携 (OAuth 2.0)
// ============================================

const CLIENT_ID = '847697512612-g7cs60es07i6vghtq8q2j30e5b7t4h80.apps.googleusercontent.com';
const SCOPES = 'https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/drive.file';

let tokenClient;
let accessToken = null;

// Initialize Google GIS & GAPI
export function initGoogleAuth() {
  return new Promise((resolve) => {
    // 1. Initialize GIS for OAuth2 tokens
    tokenClient = google.accounts.oauth2.initTokenClient({
      client_id: CLIENT_ID,
      scope: SCOPES,
      callback: (resp) => {
        if (resp.error !== undefined) {
          throw (resp);
        }
        accessToken = resp.access_token;
        localStorage.setItem('g_access_token', accessToken);
        resolve(accessToken);
      },
    });

    // 2. Load GAPI client (gapi.load)
    gapi.load('client', async () => {
      await gapi.client.init({
        // We don't use API_KEY for Sheets API (Authorized calls skip it)
      });
      await gapi.client.load('sheets', 'v4');
      await gapi.client.load('drive', 'v3');
      
      // If token exists in storage, we might try to use it, but better to re-auth
      const storedToken = localStorage.getItem('g_access_token');
      if (storedToken) accessToken = storedToken;
      
      resolve();
    });
  });
}

export function signIn() {
  return new Promise((resolve, reject) => {
    tokenClient.callback = (resp) => {
      if (resp.error) {
        window.showToast?.('Googleログインに失敗しました', 'error');
        reject(resp);
        return;
      }
      accessToken = resp.access_token;
      localStorage.setItem('g_access_token', accessToken);
      resolve(accessToken);
    };
    tokenClient.requestAccessToken({ prompt: 'consent' });
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

/**
 * Find or create the "Kakeibo_App_Data" spreadsheet
 */
export async function getOrCreateSpreadsheet() {
  let sheetId = localStorage.getItem('kakeibo_sheet_id');
  if (sheetId) return sheetId;

  const q = "name = 'Kakeibo_App_Data' and mimeType = 'application/vnd.google-apps.spreadsheet' and trashed = false";
  const resp = await gapi.client.drive.files.list({
    q: q,
    fields: 'files(id, name)',
    headers: { Authorization: `Bearer ${accessToken}` }
  });

  const files = resp.result.files;
  if (files && files.length > 0) {
    sheetId = files[0].id;
  } else {
    // Create new spreadsheet
    const createResp = await gapi.client.sheets.spreadsheets.create({
      properties: { title: 'Kakeibo_App_Data' },
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    sheetId = createResp.result.spreadsheetId;
    
    // Initialize default sheets
    await setupSpreadsheetSkeleton(sheetId);
  }

  localStorage.setItem('kakeibo_sheet_id', sheetId);
  return sheetId;
}

async function setupSpreadsheetSkeleton(spreadsheetId) {
  const sheets = ['transactions', 'accounts', 'categories', 'shortcuts', 'settings'];
  const requests = sheets.map(name => ({
    addSheet: { properties: { title: name } }
  }));

  // Batch update to add sheets and remove the default "Sheet1"
  await gapi.client.sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    resource: {
      requests: [
        ...requests,
        { deleteSheet: { sheetId: 0 } } // Remove default Sheet1
      ]
    },
    headers: { Authorization: `Bearer ${accessToken}` }
  });
}

export async function writeRows(spreadsheetId, range, rows) {
  await gapi.client.sheets.spreadsheets.values.update({
    spreadsheetId,
    range,
    valueInputOption: 'USER_ENTERED',
    resource: { values: rows },
    headers: { Authorization: `Bearer ${accessToken}` }
  });
}

export async function readRows(spreadsheetId, range) {
  const resp = await gapi.client.sheets.spreadsheets.values.get({
    spreadsheetId,
    range,
    headers: { Authorization: `Bearer ${accessToken}` }
  });
  return resp.result.values || [];
}
