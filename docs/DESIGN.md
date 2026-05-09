# Kakeibo App Design System

> **Concept**: Minimal Professional (v3)
> **Goal**: 線の細い、知的なビジネスツールのような美しさと直感的な操作性の両立。

---

## 1. Color Palette

既存の CSS カスタムプロパティを活用し、意味のある色使いを徹底します。

### ベースカラー
- `--bg-primary`: 画面全体の背景色。清潔感のある薄いグレー（ライト）または深いネイビー（ダーク）。
- `--bg-card`: コンテンツを保持するカードの背景色。
- `--text-primary`: メインのテキスト。視認性の高い濃色。
- `--text-secondary`: 補助的なテキスト。情報の階層化に使用。

### アクション・ステータス
- `--color-income`: 収入・増加。ポジティブなグリーン。
- `--color-expense`: 支出・減少。注意を促すレッド。
- `--color-transfer`: 資金移動。中立的なブルー。
- `--color-accent`: アプリのテーマカラー。ブランドアイデンティティ（インディゴ）。

---

## 2. Typography

- **Font Family**: `Inter` をベースに、数字の読みやすさを重視。
- **Modular Scale**:
    - `3xl (2.4rem)`: ダッシュボード等の重要な金額表示。
    - `lg (1.15rem)`: ボタンや見出し。
    - `sm (0.8rem)`: 補助情報、チップ内のテキスト。
- **Tabular Nums**: 金額表示には必ず `font-variant-numeric: tabular-nums` を適用し、桁を揃える。

---

## 3. Core Components (v3)

### Segmented Control (`.analysis-segmented-control`)
タブ内での表示切り替えや、入力画面の種別選択に使用。
- 滑らかな背景の切り替えアニメーション。
- 直感的なフィードバック（アクティブ状態の視覚強調）。

### Premium Card v3 (`.premium-card-v3`)
情報をグループ化するための標準コンテナ。
- 控えめなボーダー (`--border-color`)。
- 現代的な角丸 (`--radius-lg`)。
- 浮き上がりすぎないシャドウ (`--shadow-sm`)。

### List Item v3 (`.category-item-v3`)
履歴、分析、選択リスト等で使用される標準的な行レイアウト。
- 左側にアイコンフレーム、中央にタイトルとサブテキスト、右側に数値。
- 均一なパディング (`14px 16px`)。

---

## 4. Iconography

- **Library**: `Lucide Icons` を全面的に採用。
- **Line Width**: `1.5px` に固定。
- **Sizing**: 
    - 標準 UI: `18px` ~ `20px`
    - チップ・補助: `14px` ~ `16px`
- **Inline Alignment**: テキストと並べる際は、`display: flex; align-items: center; gap: 4px;` 等で垂直中央揃えを徹底。

---

## 5. Spacing & Radius

- **Radius**: `16px` (`--radius-lg`) を標準的な角丸として使用。
- **Space**: `16px` (`--space-md`) を標準的なパディングとして使用。
