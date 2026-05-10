// ============================================
// 初期データ定義 (v8.5 - モダンアイコン移行版)
// ============================================

export const DEFAULT_ACCOUNTS = [
  { name: '現金',           icon: 'lucide:banknote', order: 1,  pinned: true  },
  { name: '小遣い財布',     icon: 'lucide:wallet', order: 2,  pinned: true  },
  { name: '常陽銀行',       icon: 'lucide:landmark', order: 3,  pinned: true  },
  { name: '七十七銀行',     icon: 'lucide:landmark', order: 4,  pinned: false },
  { name: '水戸信用金庫',   icon: 'lucide:landmark', order: 5,  pinned: false },
  { name: 'SBI新生',        icon: 'lucide:landmark', order: 6,  pinned: false },
  { name: 'SBI住友',        icon: 'lucide:landmark', order: 7,  pinned: false },
  { name: '楽天銀行',       icon: 'lucide:credit-card', order: 8,  pinned: false },
  { name: 'セブン銀行',     icon: 'lucide:landmark', order: 9,  pinned: false },
  { name: '積立NISA',       icon: 'lucide:trending-up', order: 10, pinned: false },
  { name: '野村證券',       icon: 'lucide:bar-chart', order: 11, pinned: false },
  { name: 'FX',             icon: 'lucide:repeat', order: 12, pinned: false },
  { name: '確定拠出年金口座', icon: 'lucide:user', order: 13, pinned: false },
  { name: '税金用袋',       icon: 'lucide:mail', order: 14, pinned: false },
];

export const DEFAULT_CATEGORIES = [
  // 支出カテゴリー
  { name: '食料品',       icon: 'lucide:utensils', type: 'expense', order: 1,  pinned: true  },
  { name: '日用品',       icon: 'lucide:shopping-cart', type: 'expense', order: 2,  pinned: true  },
  { name: '家賃',         icon: 'lucide:home', type: 'expense', order: 3,  pinned: false },
  { name: '水道代',       icon: 'lucide:droplets', type: 'expense', order: 4,  pinned: false },
  { name: '電気代',       icon: 'lucide:zap', type: 'expense', order: 5,  pinned: false },
  { name: 'ネット',       icon: 'lucide:globe', type: 'expense', order: 6,  pinned: false },
  { name: '通信費',       icon: 'lucide:smartphone', type: 'expense', order: 7,  pinned: false },
  { name: '保険',         icon: 'lucide:shield', type: 'expense', order: 8,  pinned: false },
  { name: '教育',         icon: 'lucide:graduation-cap', type: 'expense', order: 9,  pinned: false },
  { name: '奨学金',       icon: 'lucide:graduation-cap', type: 'expense', order: 10, pinned: false },
  { name: '車両費',       icon: 'lucide:car', type: 'expense', order: 11, pinned: false },
  { name: '車検',         icon: 'lucide:car', type: 'expense', order: 12, pinned: false },
  { name: '美容衣服',     icon: 'lucide:shirt', type: 'expense', order: 13, pinned: false },
  { name: '旅費',         icon: 'lucide:plane', type: 'expense', order: 14, pinned: false },
  { name: '季節休み費用', icon: 'lucide:palmtree', type: 'expense', order: 15, pinned: false },
  { name: '交際費',       icon: 'lucide:users', type: 'expense', order: 16, pinned: true  },
  { name: '小遣い',       icon: 'lucide:banknote', type: 'expense', order: 17, pinned: true  },
  { name: 'クレカ決済',   icon: 'lucide:credit-card', type: 'expense', order: 18, pinned: false },
  { name: '税金',         icon: 'lucide:receipt', type: 'expense', order: 19, pinned: false },
  { name: '投資',         icon: 'lucide:trending-up', type: 'expense', order: 20, pinned: false },
  { name: '手数料',       icon: 'lucide:banknote', type: 'expense', order: 21, pinned: false },
  { name: 'その他',       icon: 'lucide:help-circle', type: 'expense', order: 22, pinned: false },

  // 収入カテゴリー
  { name: '給料',         icon: 'lucide:briefcase', type: 'income', order: 1, pinned: true  },
  { name: '妻給与',       icon: 'lucide:user-check', type: 'income', order: 2, pinned: true  },
  { name: '副業',         icon: 'lucide:banknote', type: 'income', order: 3, pinned: false },
  { name: '投資収入',     icon: 'lucide:trending-up', type: 'income', order: 4, pinned: false },
  { name: '利子',         icon: 'lucide:trending-up', type: 'income', order: 5, pinned: false },
  { name: '児童手当',     icon: 'lucide:baby', type: 'income', order: 6, pinned: false },
  { name: 'その他収入',   icon: 'lucide:help-circle', type: 'income', order: 7, pinned: false },
];

export const DEFAULT_SHORTCUTS = [];

export const RECOMMENDED_EMOJIS = []; // 選択肢から一掃
