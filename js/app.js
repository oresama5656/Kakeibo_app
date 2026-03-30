// ============================================
// メインアプリケーション (v2.3 - ID 齟齬解消・安定版)
// ============================================

import { initStore } from './store.js';
import * as auth from './auth.js';
import { render as renderInput } from './screens/input.js';
import { render as renderDashboard } from './screens/dashboard.js';
import { render as renderHistory } from './screens/history.js';
import { render as renderSettings, applyTheme } from './screens/settings.js';
import { getSettings } from './store.js';

// --- Initialize ---
async function initializeApp() {
  console.log('--- Kakeibo App Start ---');
  try {
    initStore();
    console.log('Store initialized.');
    
    const settings = getSettings();
    applyTheme(settings.darkMode || 'auto');
    console.log('Theme applied.');

    // UI rendering is the top priority
    renderApp();
    console.log('Initial renderApp() called.');

    // Background auth initialization
    initGoogleBackground();

  } catch (err) {
    console.error('CRITICAL: initializeApp failed:', err);
    const main = document.getElementById('main-content');
    if (main) main.innerHTML = `<div style="padding:20px; color:red;">エラーが発生しました。リロードしてください。<br>${err.message}</div>`;
  }
}

async function initGoogleBackground() {
  try {
    let retryCount = 0;
    const checkGoogle = async () => {
      if (window.google && window.gapi) {
        console.log('Google SDKs found. Initializing...');
        await auth.initGoogleAuth();
        // If we are on settings screen, re-render to show login button
        if (localStorage.getItem('kakeibo_current_screen') === 'settings') {
          const main = document.getElementById('main-content');
          if (main) renderSettings(main);
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
    console.warn('Silent auth failure:', err);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  initializeApp();
});

function renderApp() {
  const main = document.getElementById('main-content');
  const sidebar = document.getElementById('sidebar');
  const bottomTab = document.getElementById('bottom-tab');
  
  if (!main) {
    console.error('Main content element missing.');
    return;
  }

  const routes = {
    dashboard: renderDashboard,
    input: renderInput,
    history: renderHistory,
    settings: renderSettings
  };

  const navButtons = document.querySelectorAll('[data-screen]');

  function navigate(screen) {
    console.log('Navigate requested:', screen);
    
    // Safety check for Analysis (not implemented yet)
    if (screen === 'analysis') {
      window.showToast?.('分析画面は準備中です', 'info');
      screen = 'dashboard';
    }

    main.innerHTML = '';
    
    try {
      if (routes[screen]) {
        routes[screen](main);
      } else {
        console.warn('Route not found:', screen, 'falling back to dashboard');
        routes.dashboard(main);
        screen = 'dashboard';
      }
    } catch (err) {
      console.error(`Error rendering screen [${screen}]:`, err);
      main.innerHTML = `<div style="padding:20px;"><h3>⚠️ エラー</h3><pre>${err.message}</pre></div>`;
    }

    // Update nav active state (for both sidebar and bottom-tab)
    navButtons.forEach(btn => {
      btn.classList.toggle('active', btn.dataset.screen === screen);
    });

    // Save current screen
    localStorage.setItem('kakeibo_current_screen', screen);
  }

  // Handle navigation clicks
  const handleNavClick = (e) => {
    const btn = e.target.closest('[data-screen]');
    if (btn) {
      navigate(btn.dataset.screen);
    }
  };

  if (sidebar) sidebar.onclick = handleNavClick;
  if (bottomTab) bottomTab.onclick = handleNavClick;

  // Initial render (last screen or dashboard)
  const lastScreen = localStorage.getItem('kakeibo_current_screen') || 'input';
  navigate(lastScreen);
}

// Global Toast
window.showToast = (message, type = 'success') => {
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => {
    toast.classList.add('show');
    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }, 10);
};
