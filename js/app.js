// ============================================
// メインアプリケーション (v2.1 - 起動安定性向上)
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
  console.log('App initializing...');
  initStore();
  
  // Apply saved theme immediately
  const settings = getSettings();
  applyTheme(settings.darkMode || 'auto');

  // Start rendering the UI first (to keep app responsive)
  renderApp();

  // Then try to init Google Auth in background
  try {
    const checkGoogle = async () => {
      if (window.google && window.gapi) {
        console.log('Google SDK detected, initializing auth...');
        await auth.initGoogleAuth();
        // Re-render settings if current screen is settings to show updated login state
        const current = localStorage.getItem('kakeibo_current_screen');
        if (current === 'settings') {
          const main = document.getElementById('main-content');
          if (main) renderSettings(main);
        }
      } else {
        // Retry a few times if not loaded yet
        console.warn('Google SDK not ready, retrying in 2s...');
        setTimeout(checkGoogle, 2000);
      }
    };
    checkGoogle();
  } catch (err) {
    console.warn('Google Auth initialization failed:', err);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  initializeApp();
});

function renderApp() {
  const main = document.getElementById('main-content');
  const navContainer = document.getElementById('main-nav');
  
  if (!main || !navContainer) {
    console.error('Core DOM elements not found!');
    return;
  }

  const routes = {
    dashboard: renderDashboard,
    input: renderInput,
    history: renderHistory,
    settings: renderSettings
  };

  function navigate(screen) {
    console.log('Navigating to:', screen);
    // Clear and render
    main.innerHTML = '';
    if (routes[screen]) {
      routes[screen](main);
    } else {
      routes.dashboard(main);
    }

    // Update nav active state
    navContainer.querySelectorAll('.nav-item').forEach(item => {
      item.classList.toggle('active', item.dataset.screen === screen);
    });

    // Save current screen
    localStorage.setItem('kakeibo_current_screen', screen);
  }

  // Bind nav events (using a clean listener)
  navContainer.onclick = (e) => {
    const item = e.target.closest('.nav-item');
    if (item) {
      navigate(item.dataset.screen);
    }
  };

  // Initial render (last screen or dashboard)
  const lastScreen = localStorage.getItem('kakeibo_current_screen') || 'dashboard';
  navigate(lastScreen);
}

// Global Toast logic
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
