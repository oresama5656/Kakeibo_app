/**
 * 分析画面のチャート描画ロジック (Chart.jsラッパー)
 */
import * as store from '../../store.js';

let plChart = null;
let totalAssetChart = null;
let bsBalanceChart = null;

export function renderPieChart(sorted) {
  const ctx = document.getElementById('analysis-chart')?.getContext('2d');
  if (!ctx) return;
  if (plChart) plChart.destroy();
  const totalAmount = sorted.reduce((sum, c) => sum + c.total, 0);
  plChart = new Chart(ctx, { 
    type: 'doughnut', 
    data: { 
      labels: sorted.map(c => c.name), 
      datasets: [{ 
        data: sorted.map(c => c.total), 
        backgroundColor: ['#6366f1', '#f43f5e', '#10b981', '#f59e0b', '#3b82f6', '#ec4899', '#8b5cf6', '#06b6d4'], 
        borderWidth: 0, spacing: 6
      }] 
    }, 
    options: { 
      responsive: true, maintainAspectRatio: false,
      plugins: { 
        legend: { display: false },
        tooltip: {
          backgroundColor: 'rgba(15, 15, 26, 0.95)', padding: 16, cornerRadius: 16,
          callbacks: { label: (ctx) => ` ¥${ctx.raw.toLocaleString()} (${((ctx.raw/totalAmount)*100).toFixed(1)}%)` }
        }
      }, 
      cutout: '72%' 
    }
  });
}

import { formatLocalDate } from '../../store/BaseStore.js';

export function renderPLLineChart(txs, start, end, viewType, excludedIds = []) {
  const ctx = document.getElementById('analysis-chart')?.getContext('2d');
  if (!ctx) return;
  if (plChart) plChart.destroy();
  const days = {};
  let cur = new Date(start);
  const fin = new Date(end);
  while (cur <= fin) { days[formatLocalDate(cur)] = 0; cur.setDate(cur.getDate() + 1); }
  
  txs.forEach(tx => { 
    if (days[tx.date] !== undefined && !excludedIds.includes(tx.categoryId)) {
      days[tx.date] += Number(tx.amount); 
    }
  });
  const color = viewType === 'expense' ? '#f43f5e' : '#10b981';
  plChart = new Chart(ctx, { 
    type: 'line', 
    data: { 
      labels: Object.keys(days).map(d => d.split('-').slice(1).join('/')), 
      datasets: [{ 
        label: viewType === 'expense' ? '支出' : '収入', 
        data: Object.values(days), 
        borderColor: color, borderWidth: 4, tension: 0.4, 
        pointRadius: 0, fill: true, 
        backgroundColor: color + '22'
      }] 
    }, 
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } } 
  });
}

export function renderBSBalanceChart(accounts) {
  const ctx = document.getElementById('bs-balance-chart')?.getContext('2d');
  if (!ctx) return;
  if (bsBalanceChart) bsBalanceChart.destroy();

  const actualNetWorth = store.getTotalBalance();
  const positiveAccounts = accounts.filter(a => Number(a.balance) > 0).sort((a,b) => b.balance - a.balance);
  const negativeAccounts = accounts.filter(a => Number(a.balance) < 0).sort((a,b) => a.balance - b.balance);
  const assetColors = ['#4f46e5', '#6366f1', '#818cf8', '#a5b4fc'];
  const liabilityColors = ['#e11d48', '#f43f5e', '#fb7185'];
  const datasets = [];

  positiveAccounts.forEach((acc, i) => { datasets.push({ label: acc.name, data: [acc.balance, 0], backgroundColor: assetColors[i % assetColors.length], stack: 'bs' }); });
  if (actualNetWorth > 0) datasets.push({ label: '純資産', data: [0, actualNetWorth], backgroundColor: '#10b981', stack: 'bs' });
  negativeAccounts.forEach((acc, i) => { datasets.push({ label: acc.name, data: [0, Math.abs(acc.balance)], backgroundColor: liabilityColors[i % liabilityColors.length], stack: 'bs' }); });
  
  bsBalanceChart = new Chart(ctx, {
    type: 'bar',
    data: { labels: ['資産', '負債・純資産'], datasets: datasets },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: 'rgba(15, 15, 26, 0.95)', padding: 16, cornerRadius: 16,
          callbacks: { label: (ctx) => ctx.raw !== 0 ? ` ${ctx.dataset.label}: ¥${ctx.raw.toLocaleString()}` : null }
        }
      },
      scales: { x: { stacked: true }, y: { stacked: true, beginAtZero: true } }
    }
  });
}

export function renderTotalAssetChart(history, selectedAccountId, bsPeriod) {
  const ctx = document.getElementById('total-asset-chart')?.getContext('2d');
  if (!ctx) return;
  if (totalAssetChart) totalAssetChart.destroy();

  let data = [];
  let label = '純資産';
  let color = '#6366f1';

  if (selectedAccountId) {
    const accHistory = store.getAccountHistory(selectedAccountId, bsPeriod);
    const acc = store.getAccounts().find(a => a.id === selectedAccountId);
    data = accHistory.map(h => h.balance); 
    label = acc ? acc.name : '不明な口座';
    color = (acc && Number(acc.balance) < 0) ? '#f43f5e' : '#10b981';
  } else { data = history.map(h => h.total); }

  totalAssetChart = new Chart(ctx, { 
    type: 'line', 
    data: { 
      labels: history.map(h => h.date.split('-').slice(1).join('/')), 
      datasets: [{ label: label, data: data, borderColor: color, borderWidth: 4, tension: 0.4, fill: true, backgroundColor: color + '22' }] 
    }, 
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } } 
  });
}
