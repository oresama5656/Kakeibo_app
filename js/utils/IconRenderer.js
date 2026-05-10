/**
 * アイコン描画ユーティリティ (v5.0 - Glassmorphism対応版)
 */

// 絵文字から Lucide アイコン名へのマッピング
const EMOJI_TO_LUCIDE = {
  '🍎': 'utensils',
  '🍔': 'utensils',
  '🧻': 'shopping-bag',
  '🚃': 'car',
  '🚗': 'car',
  '🚲': 'bike',
  '🍻': 'users',
  '🏠': 'home',
  '🎮': 'gamepad-2',
  '⚖️': 'scale',
  '📂': 'folder',
  '💰': 'banknote',
  '🧧': 'gift',
  '💵': 'wallet',
  '🏦': 'landmark',
  '💳': 'credit-card',
  '🏥': 'stethoscope',
  '🔌': 'zap',
  '👔': 'briefcase',
  '📚': 'book-open',
  '✈️': 'plane'
};

// カテゴリーIDからカラークラスへのマッピング
const CATEGORY_COLORS = {
  'cat_01': 'color-food',
  'cat_02': 'color-daily',
  'cat_03': 'color-transport',
  'cat_04': 'color-social',
  'cat_05': 'color-house',
  'cat_06': 'color-hobby',
  'cat_07': 'color-income',
  'cat_08': 'color-income',
  'cat_99': 'color-other',
  'cat_100': 'color-other',
  'cat_98': 'color-other'
};

/**
 * グラスモフィズム・アイコンのHTMLを生成する
 * @param {string} iconStr - 絵文字または lucide:icon_name 形式の文字列
 * @param {string} categoryId - カテゴリーID（色決定用）
 * @param {object} options - { size, strokeWidth }
 */
export function renderIconHTML(iconStr, categoryId = '', options = {}) {
  const size = options.size || 20;
  const strokeWidth = options.strokeWidth || 2;
  const colorClass = CATEGORY_COLORS[categoryId] || 'color-other';
  
  let contentHtml = '';
  
  if (iconStr && iconStr.startsWith('lucide:')) {
    const iconName = iconStr.replace('lucide:', '').replace(/[^a-z0-9-]/g, ''); // 属性値の安全性を確保
    contentHtml = `<i data-lucide="${iconName}" width="${size}" height="${size}" stroke-width="${strokeWidth}"></i>`;
  } else if (EMOJI_TO_LUCIDE[iconStr]) {
    const iconName = EMOJI_TO_LUCIDE[iconStr];
    contentHtml = `<i data-lucide="${iconName}" width="${size}" height="${size}" stroke-width="${strokeWidth}"></i>`;
  } else {
    // フォールバック: 絵文字をそのまま表示（XSS対策のためエスケープ）
    const escaped = (iconStr || '📂').replace(/[&<>"']/g, m => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[m]));
    contentHtml = `<span class="icon-emoji">${escaped}</span>`;
  }

  return `
    <div class="glass-icon-v3 ${colorClass}">
      <div class="glass-frame">
        ${contentHtml}
      </div>
    </div>
  `;
}

/**
 * ユーザーが選択可能なアイコンのリストを返す
 */
export function getAvailableIcons() {
  return [
    'utensils', 'shopping-bag', 'car', 'train', 'bus', 'bike', 'plane',
    'home', 'lamp', 'plug', 'tv', 'gamepad-2', 'music', 'camera',
    'users', 'heart', 'heart-pulse', 'stethoscope', 'dumbbell',
    'banknote', 'wallet', 'landmark', 'credit-card', 'coins', 'gift',
    'briefcase', 'book-open', 'graduation-cap', 'pencil', 'languages',
    'shirt', 'watch', 'shopping-cart', 'package', 'truck',
    'phone', 'wifi', 'zap', 'droplets', 'flame',
    'coffee', 'beer', 'wine', 'pizza', 'ice-cream',
    'map-pin', 'navigation', 'ticket', 'umbrella', 'cloud', 'stethoscope', 'heart-pulse',
    'hand-coins', 'trash-2', 'wrench', 'scale', 'receipt'
  ];
}
