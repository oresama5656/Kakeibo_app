// ============================================
// 初期データ定義
// ============================================

export const DEFAULT_ACCOUNTS = [
  { name: '現金',           icon: '💴', order: 1,  pinned: true  },
  { name: '小遣い財布',     icon: '👛', order: 2,  pinned: true  },
  { name: '常陽銀行',       icon: '🏦', order: 3,  pinned: true  },
  { name: '七十七銀行',     icon: '🏦', order: 4,  pinned: false },
  { name: '水戸信用金庫',   icon: '🏦', order: 5,  pinned: false },
  { name: 'SBI新生',        icon: '🏦', order: 6,  pinned: false },
  { name: 'SBI住友',        icon: '🏦', order: 7,  pinned: false },
  { name: '楽天銀行',       icon: '💳', order: 8,  pinned: false },
  { name: 'セブン銀行',     icon: '🏪', order: 9,  pinned: false },
  { name: '積立NISA',       icon: '📈', order: 10, pinned: false },
  { name: '野村證券',       icon: '📊', order: 11, pinned: false },
  { name: 'FX',             icon: '💱', order: 12, pinned: false },
  { name: '確定拠出年金口座', icon: '👴', order: 13, pinned: false },
  { name: '税金用袋',       icon: '✉️', order: 14, pinned: false },
];

export const DEFAULT_CATEGORIES = [
  // 支出カテゴリー
  { name: '食料品',       icon: '🍚', type: 'expense', order: 1,  pinned: true  },
  { name: '日用品',       icon: '🛒', type: 'expense', order: 2,  pinned: true  },
  { name: '家賃',         icon: '🏠', type: 'expense', order: 3,  pinned: false },
  { name: '水道代',       icon: '🚰', type: 'expense', order: 4,  pinned: false },
  { name: '電気代',       icon: '⚡', type: 'expense', order: 5,  pinned: false },
  { name: 'ネット',       icon: '🌐', type: 'expense', order: 6,  pinned: false },
  { name: '通信費',       icon: '📱', type: 'expense', order: 7,  pinned: false },
  { name: '保険',         icon: '🛡️', type: 'expense', order: 8,  pinned: false },
  { name: '教育',         icon: '🎓', type: 'expense', order: 9,  pinned: false },
  { name: '奨学金',       icon: '🎓', type: 'expense', order: 10, pinned: false },
  { name: '車両費',       icon: '🚙', type: 'expense', order: 11, pinned: false },
  { name: '車検',         icon: '🚗', type: 'expense', order: 12, pinned: false },
  { name: '美容衣服',     icon: '👗', type: 'expense', order: 13, pinned: false },
  { name: '旅費',         icon: '✈️', type: 'expense', order: 14, pinned: false },
  { name: '季節休み費用', icon: '🏖️', type: 'expense', order: 15, pinned: false },
  { name: '交際費',       icon: '🍻', type: 'expense', order: 16, pinned: true  },
  { name: '小遣い',       icon: '💰', type: 'expense', order: 17, pinned: true  },
  { name: 'クレカ決済',   icon: '💳', type: 'expense', order: 18, pinned: false },
  { name: '税金',         icon: '📄', type: 'expense', order: 19, pinned: false },
  { name: '投資',         icon: '📈', type: 'expense', order: 20, pinned: false },
  { name: '手数料',       icon: '💸', type: 'expense', order: 21, pinned: false },
  { name: 'その他',       icon: '❓', type: 'expense', order: 22, pinned: false },

  // 収入カテゴリー
  { name: '給料',         icon: '💼', type: 'income', order: 1, pinned: true  },
  { name: '妻給与',       icon: '👩‍💼', type: 'income', order: 2, pinned: true  },
  { name: '副業',         icon: '💰', type: 'income', order: 3, pinned: false },
  { name: '投資収入',     icon: '📈', type: 'income', order: 4, pinned: false },
  { name: '利子',         icon: '💹', type: 'income', order: 5, pinned: false },
  { name: '児童手当',     icon: '👶', type: 'income', order: 6, pinned: false },
  { name: 'その他収入',   icon: '❓', type: 'income', order: 7, pinned: false },
];

export const DEFAULT_SHORTCUTS = [
  // ユーザーが後から自由に追加できる。初期は空。
];

export const RECOMMENDED_EMOJIS = [
  '💰', '💴', '🏦', '💳', '👛', '📉', '📈', '📊', '💸', '💼', '🧧', '💹', '👴', '👶', '❓',
  '🍚', '🛒', '🍎', '🍱', '🍣', '🍗', '🍜', '🍝', '🍔', '🍺', '🍻', '🥤', '☕', '🍰',
  '💄', '👗', '👜', '👟', '🚿', '🛁', '🧻', '💊', '💉', '💇', '🏥', '🏠', '🚰', '⚡', '🌐', '📱',
  '🚃', '🚕', '🚙', '🚗', '🛵', '✈️', '🏝️', '🏖️', '🏨', '🏫', '🎓', '🛡️', '📦', '✉️', '📄',
  '🎮', '🍿', '🎾', '⚽', '🏃', '🚲', '🎁', '🎀', '🐶', '🐱', '🐹', '🎍', '🎄'
];
