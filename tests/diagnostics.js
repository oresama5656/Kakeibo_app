/**
 * Kakeibo App 自動診断スクリプト
 * Evaluatorエージェントがブラウザコンソールで実行し、
 * アプリの健全性を一瞬でチェックするためのツール。
 */

(function() {
  const results = [];
  const log = (name, pass, detail) => results.push({ name, status: pass ? '✅ PASS' : '❌ FAIL', detail });

  console.log("%c--- Kakeibo App Automated Diagnostics ---", "font-weight: bold; font-size: 1.2rem; color: #6366f1;");

  // 1. Navigation Check
  const bottomBtns = document.querySelectorAll('#bottom-tab .tab-btn');
  log("Bottom Navigation Buttons", bottomBtns.length === 5, `Expected 5, found ${bottomBtns.length}`);

  const sidebarBtns = document.querySelectorAll('#sidebar .nav-btn');
  log("Sidebar Navigation Buttons", sidebarBtns.length === 5, `Expected 5, found ${sidebarBtns.length}`);

  // 2. DOM Integrity
  const screens = ['input', 'dashboard', 'history', 'analysis', 'settings'];
  screens.forEach(s => {
    const el = document.getElementById(`screen-${s}`);
    log(`Screen [${s}] Container`, !!el, el ? "Found" : "MISSING!");
  });

  // 3. Analysis Screen (if current)
  const isAnalysis = document.getElementById('screen-analysis').classList.contains('active');
  if (isAnalysis) {
    const charts = document.querySelectorAll('canvas');
    log("Charts rendered", charts.length >= 1, `Found ${charts.length} canvas elements`);
  }

  // 4. Global Objects
  log("Store Module Access", typeof window.navigateTo === 'function', "window.navigateTo is reachable");

  // Output Summary
  console.table(results);
  
  const allPass = results.every(r => r.status === '✅ PASS');
  if (allPass) {
    console.log("%c>>> FINAL RESULT: ALL PASS <<<", "color: #10b981; font-weight: bold; font-size: 1.5rem;");
  } else {
    console.log("%c>>> FINAL RESULT: FAIL <<<", "color: #f43f5e; font-weight: bold; font-size: 1.5rem;");
  }
  
  return allPass ? "PASS" : "FAIL";
})();
