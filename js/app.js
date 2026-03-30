// ============================================
// メインアプリケーション (ルーター & 初期化)
// ============================================

import { initStore } from './store.js';
import { render as renderInput } from './screens/input.js';
import { render as renderDashboard } from './screens/dashboard.js';
import { render as renderHistory } from './screens/history.js';
import { render as renderAnalysis } from './screens/analysis.js';
import { render as renderSettings, applyTheme } from './screens/settings.js';
import { getSettings } from './store.js';

// --- Initialize ---
document.addEventListener('DOMContentLoaded', () => {
  initStore();

  // Apply saved theme
  const settings = getSettings();
  applyTheme(settings.darkMode || 'auto');

  // Setup toast
  window.showToast = showToast;

  // Initial render
  navigateTo('input');

  // Setup navigation
  document.querySelectorAll('[data-screen]').forEach(btn => {
    btn.addEventListener('click', () => {
      navigateTo(btn.dataset.screen);
    });
  });
});

// --- Navigation ---
let currentScreen = '';

function navigateTo(screen) {
  if (screen === currentScreen) return;
  currentScreen = screen;

  // Update active states
  document.querySelectorAll('.nav-btn, .tab-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.screen === screen);
  });

  // Show/hide screens
  document.querySelectorAll('.screen').forEach(s => {
    s.classList.remove('active');
  });

  const screenEl = document.getElementById(`screen-${screen}`);
  if (screenEl) {
    screenEl.classList.add('active');

    // Render screen content
    switch (screen) {
      case 'input': renderInput(screenEl); break;
      case 'dashboard': renderDashboard(screenEl); break;
      case 'history': renderHistory(screenEl); break;
      case 'analysis': renderAnalysis(screenEl); break;
      case 'settings': renderSettings(screenEl); break;
    }
  }
}

// --- Toast ---
let toastTimer = null;

function showToast(message, type = 'success') {
  const toast = document.getElementById('toast');
  if (!toast) return;

  clearTimeout(toastTimer);

  toast.textContent = message;
  toast.style.borderColor = type === 'error' ? 'var(--color-expense)' : 'var(--color-income)';
  toast.classList.add('show');

  toastTimer = setTimeout(() => {
    toast.classList.remove('show');
  }, 2500);
}
