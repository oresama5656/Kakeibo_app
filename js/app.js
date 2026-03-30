// ============================================
// メインアプリケーション (v2.2 - 強制描画・安定化)
// ============================================

import { initStore } from './store.js';
import * as auth from './auth.js';
import { render as renderInput } from './screens/input.js';
import { render as renderDashboard } from './screens/dashboard.js';
import { render as renderHistory } from './screens/history.js';
import { render as renderAnalysis } from './screens/analysis.js'; // 分析画面も追加
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
    // Even if it fails, try to show something
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
        console.warn('Google SDK timeout. Cloud features will be unavailable.');
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
  const navContainer = document.getElementById('main-nav');
  
  if (!main || !navContainer) {
    console.error('DOM elements missing.');
    return;
  }

  const routes = {
    dashboard: renderDashboard,
    input: renderInput,
    history: renderHistory,
    analysis: renderAnalysis,
    settings: renderSettings
  };

  function navigate(screen) {
    console.log('Navigate requested:', screen);
    main.innerHTML = '';
    
    try {
      if (routes[screen]) {
        routes[screen](main);
      } else {
        console.warn('Route not found:', screen, 'falling back to dashboard');
        routes.dashboard(main);
      }
    } catch (err) {
      console.error(`Error rendering screen [${screen}]:`, err);
      main.innerHTML = `<div style="padding:20px;">
        <h3>⚠️ 読み込みエラー</h3>
        <p>画面の表示中にエラーが発生しました。</p>
        <pre style="font-size:12px; color:red;">${err.stack}</pre>
        <button onclick="localStorage.setItem('kakeibo_current_screen','dashboard'); location.reload();" class="btn btn-primary">ホームに戻る</button>
      </div>`;
    }

    // Update nav active state
    navContainer.querySelectorAll('.nav-item').forEach(item => {
      item.classList.toggle('active', item.dataset.screen === screen);
    });

    // Save current screen
    localStorage.setItem('kakeibo_current_screen', screen);
  }

  // Bind nav events
  navContainer.addEventListener('click', (e) => {
    const item = e.target.closest('.nav-item');
    if (item) {
      const screen = item.dataset.screen;
      navigate(screen);
    }
  });

  // Initial render (last screen or dashboard)
  const lastScreen = localStorage.getItem('kakeibo_current_screen') || 'dashboard';
  navigate(lastScreen);
}

// Global Toast
window.showToast = (message, type = 'success') => {
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => toast.classList.add('show'), 100);
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, 3000);
};
