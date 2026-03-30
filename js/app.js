// ============================================
// メインアプリケーション (v3.2 - キャッシュ回避版)
// ============================================

const V = '?v=' + Date.now(); // 毎回最新を読み込ませる

import { initStore } from './store.js?v=2.1';
import * as auth from './auth.js?v=2.1';
import { render as renderInput } from './screens/input.js?v=2.1';
import { render as renderDashboard } from './screens/dashboard.js?v=2.1';
import { render as renderHistory } from './screens/history.js?v=2.1';
import { render as renderSettings, applyTheme } from './screens/settings.js?v=2.1';
import { getSettings } from './store.js?v=2.1';
import * as store from './store.js?v=2.1';

// --- Initialize ---
async function initializeApp() {
  console.log('--- Kakeibo App [v3.2] Starting ---');
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
        console.log('Google SDKs found. Initializing...');
        await auth.initGoogleAuth();
        
        const sheetId = await auth.getOrCreateSpreadsheet();
        if (sheetId) {
          console.log('Cloud link detected. Pulling latest data...');
          const success = await store.loadFromCloud(sheetId);
          if (success) {
            console.log('Cloud data loaded successfully. Refreshing UI.');
            renderApp(); // Re-render everything with new data
          }
        }

        // Re-render settings if current
        if (localStorage.getItem('kakeibo_current_screen') === 'settings') {
          const container = document.getElementById('screen-settings');
          if (container) renderSettings(container);
        }
      } else if (retryCount < 10) {
        retryCount++;
        setTimeout(checkGoogle, 2000);
      } else {
        console.warn('Google SDK timeout.');
      }
    };
    checkGoogle();
  } catch (err) {
    console.warn('Google Auth silent failure:', err);
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
    settings: document.getElementById('screen-settings')
  };

  const renderFunctions = {
    input: renderInput,
    dashboard: renderDashboard,
    history: renderHistory,
    settings: renderSettings
  };

  const navButtons = document.querySelectorAll('[data-screen]');

  function navigate(screenName) {
    console.log('Navigating to:', screenName);

    // Fallback
    if (screenName === 'analysis') {
      window.showToast?.('分析画面は準備中です', 'info');
      screenName = 'dashboard';
    }

    // Toggle screen visibility
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

    // Update buttons
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
