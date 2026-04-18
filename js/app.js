// ============================================
// メインアプリケーション (v3.5 - 同期ブロック・初期読込置換実装)
// ============================================

import { initStore } from './store.js';
import * as auth from './auth.js';
import { render as renderInput } from './screens/input.js';
import { render as renderDashboard } from './screens/dashboard.js';
import { render as renderHistory } from './screens/history.js';
import { render as renderAnalysis } from './screens/analysis.js';
import { render as renderSettings, applyTheme } from './screens/settings.js';
import * as store from './store.js';

// --- Initialize ---
async function initializeApp() {
  console.log('--- Kakeibo App [v3.3] Starting ---');
  try {
    store.initStore();
    
    const settings = store.getSettings();
    applyTheme(settings.darkMode || 'auto');

    // UI rendering priority
    setupNavigation();

    // Background auth initialization
    initGoogleBackground();

  } catch (err) {
    console.error('CRITICAL: initializeApp failed:', err);
  }
}

async function initGoogleBackground() {
  try {
    let retryCount = 0;
    const checkGoogle = async () => {
      if (window.google && window.gapi) {
        console.log('Google SDKs found. Initializing stable auth...');
        await auth.initGoogleAuth();
        
        const result = await auth.getOrCreateSpreadsheet().catch(e => {
            console.log('Initial spreadsheet check failed (likely not logged in or network error).');
            return { id: null, isNew: false };
        });

        const sheetId = typeof result === 'object' ? result.id : result;
        const isNew = typeof result === 'object' ? result.isNew : false;

        if (sheetId) {
          if (isNew) {
            console.log('New cloud link established. Sync ready.');
            store.setCloudSyncReady(true);
            await store.save(); // 初期状態を同期
          } else {
            console.log('Cloud link detected. Pulling latest data...');
            try {
              await store.loadFromCloud(sheetId);
              renderApp();
            } catch (err) {
              console.warn('Initial cloud pull failed (likely offline or network error):', err);
            }
          }
        }

        if (localStorage.getItem('kakeibo_current_screen') === 'settings') {
          const container = document.getElementById('screen-settings');
          if (container) renderSettings(container);
        }
      } else if (retryCount < 15) {
        retryCount++;
        setTimeout(checkGoogle, 1000);
      }
    };
    checkGoogle();
  } catch (err) {
    console.warn('Google Auth background process skipped.');
  }
}

function renderApp() {
  const currentScreen = localStorage.getItem('kakeibo_current_screen') || 'input';
  const container = document.getElementById(`screen-${currentScreen}`);
  if (container) {
    const renderFunctions = {
      input: renderInput,
      dashboard: renderDashboard,
      history: renderHistory,
      analysis: renderAnalysis,
      settings: renderSettings
    };
    if (renderFunctions[currentScreen]) {
      renderFunctions[currentScreen](container);
    }
  }
}

function setupNavigation() {
  const sidebar = document.getElementById('sidebar');
  const bottomTab = document.getElementById('bottom-tab');
  
  const screens = {
    input: document.getElementById('screen-input'),
    dashboard: document.getElementById('screen-dashboard'),
    history: document.getElementById('screen-history'),
    analysis: document.getElementById('screen-analysis'),
    settings: document.getElementById('screen-settings')
  };

  const renderFunctions = {
    input: renderInput,
    dashboard: renderDashboard,
    history: renderHistory,
    analysis: renderAnalysis,
    settings: renderSettings
  };

  const navButtons = document.querySelectorAll('[data-screen]');

  function navigate(screenName) {
    Object.keys(screens).forEach(key => {
      if (screens[key]) {
        if (key === screenName) {
          screens[key].style.display = 'block';
          screens[key].classList.add('active');
          if (renderFunctions[key]) {
            renderFunctions[key](screens[key]);
          }
        } else {
          screens[key].style.display = 'none';
          screens[key].classList.remove('active');
        }
      }
    });

    navButtons.forEach(btn => {
      btn.classList.toggle('active', btn.dataset.screen === screenName);
    });

    localStorage.setItem('kakeibo_current_screen', screenName);
  }

  const handleNavClick = (e) => {
    const btn = e.target.closest('[data-screen]');
    if (btn) navigate(btn.dataset.screen);
  };

  if (sidebar) sidebar.onclick = handleNavClick;
  if (bottomTab) bottomTab.onclick = handleNavClick;

  const lastScreen = localStorage.getItem('kakeibo_current_screen') || 'input';
  navigate(lastScreen);

  // --- Expose navigate for external use ---
  window.navigateTo = navigate;
}

document.addEventListener('DOMContentLoaded', initializeApp);

// Global Toast
window.showToast = (message, type = 'success') => {
  const toast = document.createElement('div');
  toast.className = `toast ${type} show`;
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, 3000);
};

// Service Worker Registration
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then(reg => console.log('Service Worker registered:', reg.scope))
      .catch(err => console.log('Service Worker registration failed:', err));
  });
}
