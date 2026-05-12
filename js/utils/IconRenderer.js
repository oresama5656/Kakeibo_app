/**
 * アイコン描画ユーティリティ (v5.1 - モダンアイコン完全移行版)
 */

// 絵文字から Lucide アイコン名へのマッピング (移行用)
const EMOJI_TO_LUCIDE = {
  '🍎': 'utensils', '🍔': 'utensils', '🍱': 'utensils', '🍣': 'utensils', '🍚': 'utensils',
  '🧻': 'shopping-bag', '🛒': 'shopping-cart', '🛍️': 'shopping-cart',
  '🚃': 'car', '🚗': 'car', '🚙': 'car', '🚕': 'car', '🚲': 'bike', '✈️': 'plane',
  '🍻': 'users', '🍺': 'beer', '🍷': 'wine', '🏠': 'home', '🏨': 'home',
  '🎮': 'gamepad-2', '⚖️': 'scale', '📂': 'folder', '📁': 'folder', '📄': 'receipt',
  '💰': 'banknote', '💴': 'banknote', '💵': 'wallet', '👛': 'wallet', '💳': 'credit-card',
  '🏦': 'landmark', '💹': 'trending-up', '📈': 'trending-up', '📉': 'trending-down', '📊': 'bar-chart',
  '🧧': 'gift', '🎁': 'gift', '🏥': 'stethoscope', '💊': 'pill', '🔌': 'zap', '⚡': 'zap',
  '👔': 'briefcase', '💼': 'briefcase', '📚': 'book-open', '🎓': 'graduation-cap',
  '📱': 'smartphone', '🌐': 'globe', '🛡️': 'shield', '🏖️': 'palmtree', '🏝️': 'palmtree',
  '👶': 'baby', '👴': 'user', '👩‍💼': 'user-check', '📧': 'mail', '✉️': 'mail', '💸': 'banknote',
  '💱': 'japanese-yen', '🪙': 'coins', '💲': 'japanese-yen',
  '❓': 'help-circle'
};

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

export function renderIconHTML(iconStr, categoryId = '', options = {}) {
  const size = options.size || 20;
  const strokeWidth = options.strokeWidth || 2;
  const colorClass = CATEGORY_COLORS[categoryId] || 'color-other';
  
  let contentHtml = '';
  
  if (iconStr && iconStr.startsWith('lucide:')) {
    const iconName = iconStr.replace('lucide:', '').replace(/[^a-z0-9-]/g, '');
    contentHtml = `<i data-lucide="${iconName}" width="${size}" height="${size}" stroke-width="${strokeWidth}"></i>`;
  } else {
    // 絵文字、または未定義の形式の場合のフォールバック
    const iconName = EMOJI_TO_LUCIDE[iconStr] || 'help-circle';
    contentHtml = `<i data-lucide="${iconName}" width="${size}" height="${size}" stroke-width="${strokeWidth}"></i>`;
  }

  return `
    <div class="glass-icon-v3 ${colorClass}">
      <div class="glass-frame">
        ${contentHtml}
      </div>
    </div>
  `;
}

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
    'map-pin', 'navigation', 'ticket', 'umbrella', 'cloud',
    'hand-coins', 'mail', 'japanese-yen', 'trash-2', 'wrench', 'scale', 'receipt'
  ];
}
