// ─── Design tokens — nguồn sự thật duy nhất cho toàn app ─────────────────────
// Import vào mỗi screen: `import { COLORS, SP, R } from "@/constants/tokens"`
// Nếu cần R scale lớn hơn (add-transaction/settings/ai): `import { COLORS, SP, RL as R }`

export const COLORS = {
  // ── Page & card backgrounds
  pageBg:          "#F5F7F6",
  cardBg:          "#FFFFFF",

  // ── Hero / dark header
  heroBg:          "#1A2E2A",
  heroSub:         "#243D38",
  heroDeep:        "#162420",

  // ── Accent (mint green)
  accent:          "#2ECC9A",
  accentDeep:      "#1BAA7E",
  accentSoft:      "#E6FAF4",
  accentText:      "#15704F",

  // ── Income
  income:          "#2ECC9A",
  incomeText:      "#15704F",
  incomeBg:        "#E6FAF4",
  incomeBorder:    "#A8DFC9",

  // ── Expense
  expense:         "#FF6B6B",
  expenseText:     "#C0392B",
  expenseBg:       "#FFF0F0",
  expenseBorder:   "#FFBCBC",

  // ── Warning (orange)
  warning:         "#E67E22",
  warningBg:       "#FFF5E6",
  warningBorder:   "#F0C080",
  warn:            "#F5A623",
  warnBg:          "#FEF5E7",
  warnText:        "#B7751A",

  // ── Danger / destructive (red)
  danger:          "#E74C3C",
  dangerBg:        "#FFF0F0",
  dangerBorder:    "#FFBCBC",
  destructive:     "#FF6B6B",

  // ── Text
  textPrimary:     "#1A2422",
  textSecondary:   "#6B8076",
  textMuted:       "#9EB8B0",
  textOnDark:      "#FFFFFF",
  textOnDarkMuted: "#A8C4BC",
  textOnDarkDeep:  "#6A8E87",

  // ── Borders & inputs
  border:          "#E8EFED",
  inputBg:         "#F0F5F3",
  inputBorder:     "#DDE8E5",
  gridLine:        "#EEF3F1",
  rowHover:        "#F8FAFA",

  // ── Misc interactive
  shadow:          "#1A2422",
  catActiveBg:     "#1A2E2A",
  catInactiveBg:   "#F0F5F3",
  catInactiveText: "#5A7A72",
  langActive:      "#1A2E2A",
  langInactive:    "#F0F5F3",
} as const;

// ── Spacing scale (điểm chung cho mọi file)
export const SP = {
  xs:  4,
  sm:  8,
  md:  16,
  lg:  24,
  xl:  32,
  xxl: 48,
} as const;

// ── Border-radius scale nhỏ — index.tsx, charts.tsx
export const R = {
  sm:   8,
  md:   12,
  lg:   16,
  xl:   20,
  full: 999,
} as const;

// ── Border-radius scale lớn — add-transaction.tsx, settings.tsx, ai-assistant.tsx
export const RL = {
  sm:   10,
  md:   16,
  lg:   24,
  xl:   32,
  full: 999,
} as const;
