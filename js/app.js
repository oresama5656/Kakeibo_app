// ============================================
// メインアプリケーション (v2 - Google Auth 連携)
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
  initStore();
  try {
    // Wait for libraries to be ready
    if (window.google && window.gapi) {
      await auth.initGoogleAuth();
    } else {
      console.warn('Google libraries not loaded yet. Waiting...');
      setTimeout(async () => {
        if (window.google) await auth.initGoogleAuth();
      }, 2000);
    }
  } catch (err) {
    console.warn('Google Auth initialization skipped/failed:', err);
  }
  renderApp();
}

document.addEventListener('DOMContentLoaded', () => {
  initializeApp();
});

function renderApp() {
  // Apply saved theme
  const settings = getSettings();
  applyTheme(settings.darkMode || 'auto');

  const main = document.getElementById('main-content');
  const navContainer = document.getElementById('main-nav');

  const routes = {
    dashboard: renderDashboard,
    input: renderInput,
    history: renderHistory,
    settings: renderSettings
  };

  function navigate(screen) {
    // Clear previous screen if needed
    main.innerHTML = '';
    
    // Render the screen
    routes[screen](main);

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
    if (item) navigate(item.dataset.screen);
  });

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
