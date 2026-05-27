// src/app/index.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Tab 1 — Home / Dashboard
//
// Changes from previous version:
//   • Removed inline calendar — now imports shared CalendarModal component
//   • Fixed TypeScript errors on t.homeEmptyTitle / t.homeEmptyBody:
//     those keys don't exist in AppStrings yet, so empty-state copy is
//     derived from `lang` directly (same pattern used in add-transaction.tsx)
// ─────────────────────────────────────────────────────────────────────────────

import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  Platform,
  ListRenderItemInfo,
} from "react-native";
import { useLanguage } from "../context/LanguageContext";
import CalendarModal from "../components/CalendarModal";

// ─── Design tokens ────────────────────────────────────────────────────────────
const COLORS = {
  pageBg:          "#F5F7F6",
  cardBg:          "#FFFFFF",
  heroBg:          "#1A2E2A",
  heroSub:         "#243D38",
  accent:          "#2ECC9A",
  accentDeep:      "#1BAA7E",
  accentSoft:      "#E6FAF4",
  income:          "#2ECC9A",
  incomeText:      "#15704F",
  incomeBg:        "#E6FAF4",
  expense:         "#FF6B6B",
  expenseText:     "#C0392B",
  expenseBg:       "#FFF0F0",
  textPrimary:     "#1A2422",
  textSecondary:   "#6B8076",
  textMuted:       "#9EB8B0",
  textOnDark:      "#FFFFFF",
  textOnDarkMuted: "#A8C4BC",
  border:          "#E8EFED",
  inputBg:         "#F0F5F3",
};

const SP = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 } as const;
const R  = { sm: 8, md: 12, lg: 16, xl: 20, full: 999 } as const;

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmtVND = (n: number): string =>
  n.toLocaleString("vi-VN") + "\u00A0đ";

const daysAgo = (n: number): Date => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(0, 0, 0, 0);
  return d;
};

const isSameDay = (a: Date, b: Date): boolean =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth()    === b.getMonth()    &&
  a.getDate()     === b.getDate();

// ─── Types ────────────────────────────────────────────────────────────────────
type TxType       = "income" | "expense";
type TxTypeFilter = "all" | "income" | "expense";

interface Tx {
  id:       string;
  type:     TxType;
  amount:   number;
  category: string;                     // emoji icon
  catLabel: { vi: string; en: string };
  note:     string;
  date:     Date;
}

// ─── Mock data ────────────────────────────────────────────────────────────────
const MOCK_TX: Tx[] = [
  {
    id: "1", type: "expense", amount: 125_000,
    category: "🍜", catLabel: { vi: "Ăn uống",   en: "Food"          },
    note: "Phở bò buổi sáng",            date: daysAgo(0),
  },
  {
    id: "2", type: "income", amount: 15_000_000,
    category: "💼", catLabel: { vi: "Lương",     en: "Salary"        },
    note: "Lương tháng 5",                date: daysAgo(0),
  },
  {
    id: "3", type: "expense", amount: 45_000,
    category: "🚗", catLabel: { vi: "Đi lại",    en: "Transport"     },
    note: "Grab về nhà",                  date: daysAgo(1),
  },
  {
    id: "4", type: "expense", amount: 320_000,
    category: "🛒", catLabel: { vi: "Mua sắm",   en: "Shopping"      },
    note: "Siêu thị BigC",               date: daysAgo(1),
  },
  {
    id: "5", type: "income", amount: 500_000,
    category: "🎁", catLabel: { vi: "Thưởng",    en: "Bonus"         },
    note: "Thưởng hoàn thành dự án",     date: daysAgo(3),
  },
  {
    id: "6", type: "expense", amount: 85_000,
    category: "🎮", catLabel: { vi: "Giải trí",  en: "Entertainment" },
    note: "Netflix tháng này",            date: daysAgo(8),
  },
  {
    id: "7", type: "expense", amount: 250_000,
    category: "💊", catLabel: { vi: "Sức khỏe", en: "Health"        },
    note: "Mua thuốc",                   date: daysAgo(8),
  },
  {
    id: "8", type: "expense", amount: 1_500_000,
    category: "🏠", catLabel: { vi: "Nhà ở",     en: "Housing"       },
    note: "Tiền điện nước",              date: daysAgo(12),
  },
  {
    id: "9", type: "income", amount: 2_000_000,
    category: "📈", catLabel: { vi: "Đầu tư",   en: "Investment"    },
    note: "Cổ tức quý 1",               date: daysAgo(15),
  },
];

// Monthly budget ceiling (demo value)
const MONTHLY_BUDGET = 10_000_000;

// ─── TxRow sub-component ──────────────────────────────────────────────────────
interface TxRowProps { tx: Tx; lang: "vi" | "en"; }

function TxRow({ tx, lang }: TxRowProps) {
  const isIncome = tx.type === "income";
  const dateStr  = tx.date.toLocaleDateString(
    lang === "vi" ? "vi-VN" : "en-GB",
    { day: "2-digit", month: "2-digit" },
  );

  return (
    <View style={row.wrap}>
      {/* Category icon circle */}
      <View
        style={[
          row.iconCircle,
          { backgroundColor: isIncome ? COLORS.incomeBg : COLORS.expenseBg },
        ]}
      >
        <Text style={row.icon}>{tx.category}</Text>
      </View>

      {/* Label + note */}
      <View style={row.info}>
        <Text style={row.catLabel}>{tx.catLabel[lang]}</Text>
        <Text style={row.note} numberOfLines={1}>{tx.note}</Text>
      </View>

      {/* Amount + date */}
      <View style={row.right}>
        <Text
          style={[
            row.amount,
            { color: isIncome ? COLORS.incomeText : COLORS.expenseText },
          ]}
        >
          {isIncome ? "+" : "−"}{fmtVND(tx.amount)}
        </Text>
        <Text style={row.date}>{dateStr}</Text>
      </View>
    </View>
  );
}

const row = StyleSheet.create({
  wrap: {
    flexDirection:   "row",
    alignItems:      "center",
    backgroundColor: COLORS.cardBg,
    marginHorizontal: SP.md,
    marginBottom:    SP.sm,
    borderRadius:    R.lg,
    padding:         SP.md,
    // Subtle card shadow
    shadowColor:     "#1A2422",
    shadowOffset:    { width: 0, height: 1 },
    shadowOpacity:   0.06,
    shadowRadius:    4,
    elevation:       2,
  },
  iconCircle: {
    width:          44,
    height:         44,
    borderRadius:   22,
    alignItems:     "center",
    justifyContent: "center",
    marginRight:    SP.md,
  },
  icon:     { fontSize: 22 },
  info:     { flex: 1 },
  catLabel: {
    fontSize:     14,
    fontWeight:   "600",
    color:        COLORS.textPrimary,
    marginBottom: 2,
  },
  note: {
    fontSize: 12,
    color:    COLORS.textSecondary,
  },
  right: { alignItems: "flex-end" },
  amount: {
    fontSize:     13,
    fontWeight:   "700",
    marginBottom: 2,
  },
  date: {
    fontSize: 11,
    color:    COLORS.textMuted,
  },
});

// ─── EmptyState sub-component ─────────────────────────────────────────────────
//
// Receives all strings as props — avoids referencing non-existent keys
// t.homeEmptyTitle / t.homeEmptyBody (which caused the red squiggly errors).
// The parent derives these strings from `lang` at runtime.
//
interface EmptyStateProps {
  title:      string;
  body:       string;
  clearLabel: string;
  onClear:    () => void;
}

function EmptyState({ title, body, clearLabel, onClear }: EmptyStateProps) {
  return (
    <View style={empty.wrap}>
      <Text style={empty.emoji}>🔍</Text>
      <Text style={empty.title}>{title}</Text>
      <Text style={empty.body}>{body}</Text>
      <TouchableOpacity style={empty.btn} onPress={onClear} activeOpacity={0.8}>
        <Text style={empty.btnTxt}>{clearLabel}</Text>
      </TouchableOpacity>
    </View>
  );
}

const empty = StyleSheet.create({
  wrap: {
    alignItems:      "center",
    paddingTop:      SP.xl + SP.md,
    paddingBottom:   SP.xl,
    paddingHorizontal: SP.xl,
  },
  emoji: { fontSize: 44, marginBottom: SP.md },
  title: {
    fontSize:    18,
    fontWeight:  "700",
    color:       COLORS.textPrimary,
    marginBottom: SP.sm,
    textAlign:   "center",
  },
  body: {
    fontSize:    14,
    color:       COLORS.textSecondary,
    textAlign:   "center",
    lineHeight:  21,
    marginBottom: SP.lg,
  },
  btn: {
    backgroundColor: COLORS.accentSoft,
    borderRadius:    R.full,
    paddingHorizontal: SP.lg,
    paddingVertical:   SP.sm + 2,
  },
  btnTxt: {
    fontSize:   14,
    fontWeight: "600",
    color:      COLORS.incomeText,
  },
});

// ─── Main screen ──────────────────────────────────────────────────────────────
export default function HomeScreen() {
  const { t, lang } = useLanguage();
  const today = new Date();

  // ── Filter state
  const [typeFilter,   setTypeFilter]   = useState<TxTypeFilter>("all");
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [showCal,      setShowCal]      = useState(false);

  // ── Aggregates (always full dataset — not affected by filters) ────────────
  const totalIncome  = MOCK_TX
    .filter(tx => tx.type === "income")
    .reduce((sum, tx) => sum + tx.amount, 0);

  const totalExpense = MOCK_TX
    .filter(tx => tx.type === "expense")
    .reduce((sum, tx) => sum + tx.amount, 0);

  const balance    = totalIncome - totalExpense;
  const budgetPct  = Math.min((totalExpense / MONTHLY_BUDGET) * 100, 100);
  const budgetOver = budgetPct >= 80;

  // ── Filtered transaction list (memoised) ─────────────────────────────────
  const filteredTx = useMemo<Tx[]>(() => {
    return MOCK_TX.filter(tx => {
      const typeOk = typeFilter === "all" || tx.type === typeFilter;
      const dateOk = !selectedDate || isSameDay(tx.date, selectedDate);
      return typeOk && dateOk;
    });
  }, [typeFilter, selectedDate]);

  // Dates that get a dot in the calendar
  const txDates = useMemo(() => MOCK_TX.map(tx => tx.date), []);

  // ── Period label in hero ─────────────────────────────────────────────────
  const periodLabel = `${t.homeMonths[today.getMonth()]} ${today.getFullYear()}`;

  // ── Date chip display text ───────────────────────────────────────────────
  const dateChipLabel = selectedDate
    ? selectedDate.toLocaleDateString(
        lang === "vi" ? "vi-VN" : "en-GB",
        { day: "2-digit", month: "2-digit", year: "numeric" },
      )
    : lang === "vi" ? "📅 Lọc theo ngày" : "📅 Filter by date";

  // ── Empty-state copy — derived from lang to avoid missing AppStrings keys ─
  // (t.homeEmptyTitle and t.homeEmptyBody are not yet in LanguageContext.tsx)
  const emptyTitle      = lang === "vi" ? "Không có giao dịch" : "No Transactions";
  const emptyBody       = lang === "vi"
    ? "Không tìm thấy giao dịch nào phù hợp với bộ lọc hiện tại."
    : "No transactions match the current filter.";
  const clearFilterLbl  = lang === "vi" ? "Xoá bộ lọc" : "Clear filter";

  const clearFilters = () => {
    setTypeFilter("all");
    setSelectedDate(null);
  };

  // ── FlatList header ───────────────────────────────────────────────────────
  const ListHeader = () => (
    <>
      {/* ════ HERO CARD ════ */}
      <View style={s.hero}>

        {/* Period row + date filter chip */}
        <View style={s.heroPeriodRow}>
          <Text style={s.heroPeriod}>{periodLabel}</Text>

          <View style={s.dateChipWrap}>
            {/* Main chip — tap to open calendar */}
            <TouchableOpacity
              style={[s.dateChip, selectedDate !== null && s.dateChipActive]}
              onPress={() => setShowCal(true)}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  s.dateChipTxt,
                  selectedDate !== null && s.dateChipTxtActive,
                ]}
              >
                {dateChipLabel}
              </Text>
            </TouchableOpacity>

            {/* ✕ badge — visible only when a date is selected */}
            {selectedDate !== null && (
              <TouchableOpacity
                style={s.clearDateBtn}
                onPress={() => setSelectedDate(null)}
                hitSlop={{ top: 8, bottom: 8, left: 4, right: 8 }}
              >
                <Text style={s.clearDateBtnTxt}>✕</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Overview label */}
        <Text style={s.heroOverviewLabel}>{t.homeOverview}</Text>

        {/* Balance */}
        <Text style={s.heroBalance}>{fmtVND(balance)}</Text>

        {/* Income / Expense sub-cards */}
        <View style={s.heroSubRow}>
          {/* Income */}
          <View style={s.heroSubCard}>
            <Text style={s.heroSubArrowUp}>↑</Text>
            <View>
              <Text style={s.heroSubLabel}>{t.homeIncome}</Text>
              <Text style={s.heroSubAmount}>{fmtVND(totalIncome)}</Text>
            </View>
          </View>

          {/* Expense */}
          <View style={s.heroSubCard}>
            <Text style={s.heroSubArrowDown}>↓</Text>
            <View>
              <Text style={s.heroSubLabel}>{t.homeExpenses}</Text>
              <Text style={[s.heroSubAmount, { color: COLORS.expense }]}>
                {fmtVND(totalExpense)}
              </Text>
            </View>
          </View>
        </View>
      </View>

      {/* ════ MONTHLY BUDGET BAR ════ */}
      <View style={s.budgetCard}>
        <View style={s.budgetHeaderRow}>
          <Text style={s.budgetLabel}>{t.homeBudgetTitle}</Text>
          <Text
            style={[
              s.budgetPct,
              { color: budgetOver ? COLORS.expenseText : COLORS.incomeText },
            ]}
          >
            {budgetPct.toFixed(0)}%
          </Text>
        </View>

        {/* Progress track */}
        <View style={s.budgetTrack}>
          <View
            style={[
              s.budgetFill,
              {
                width:           `${budgetPct}%` as any,
                backgroundColor: budgetOver ? COLORS.expense : COLORS.accent,
              },
            ]}
          />
        </View>

        <Text style={s.budgetSub}>
          {fmtVND(totalExpense)} / {fmtVND(MONTHLY_BUDGET)}
        </Text>
      </View>

      {/* ════ TYPE FILTER CHIPS ════ */}
      <View style={s.filterRow}>
        {(["all", "income", "expense"] as TxTypeFilter[]).map(f => {
          const label =
            f === "all"     ? t.homeAll      :
            f === "income"  ? t.homeIncFilter :
                              t.homeExpFilter;
          const active = typeFilter === f;

          return (
            <TouchableOpacity
              key={f}
              style={[s.filterChip, active && s.filterChipActive]}
              onPress={() => setTypeFilter(f)}
              activeOpacity={0.75}
            >
              <Text style={[s.filterChipTxt, active && s.filterChipTxtActive]}>
                {label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* ════ SECTION TITLE ════ */}
      <Text style={s.sectionTitle}>{t.homeActivity}</Text>
    </>
  );

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle="light-content" />

      <FlatList<Tx>
        data={filteredTx}
        keyExtractor={(item: Tx) => item.id}
        renderItem={({ item }: ListRenderItemInfo<Tx>) => (
          <TxRow tx={item} lang={lang} />
        )}
        ListHeaderComponent={ListHeader}
        ListEmptyComponent={
          <EmptyState
            title={emptyTitle}
            body={emptyBody}
            clearLabel={clearFilterLbl}
            onClear={clearFilters}
          />
        }
        contentContainerStyle={s.listContent}
        showsVerticalScrollIndicator={false}
      />

      {/* ── Shared calendar modal (no inline calendar here any more) ── */}
      <CalendarModal
        visible={showCal}
        selectedDate={selectedDate}
        onSelectDate={setSelectedDate}
        onClose={() => setShowCal(false)}
        txDates={txDates}
      />
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  safe: {
    flex:            1,
    backgroundColor: COLORS.pageBg,
    paddingTop:      Platform.OS === "android" ? StatusBar.currentHeight : 0,
  },

  listContent: {
    paddingBottom: 120, // clear the floating tab bar
  },

  // ── Hero ─────────────────────────────────────────────────────────────────
  hero: {
    backgroundColor: COLORS.heroBg,
    marginHorizontal: SP.md,
    marginTop:        SP.md,
    borderRadius:     R.xl,
    padding:          SP.lg,
    marginBottom:     SP.md,
    // Shadow
    shadowColor:      "#000",
    shadowOffset:     { width: 0, height: 6 },
    shadowOpacity:    0.22,
    shadowRadius:     16,
    elevation:        10,
  },

  heroPeriodRow: {
    flexDirection:  "row",
    justifyContent: "space-between",
    alignItems:     "center",
    marginBottom:   SP.sm,
  },
  heroPeriod: {
    fontSize:   13,
    color:      COLORS.textOnDarkMuted,
    fontWeight: "500",
  },

  // Date chip wrapper (chip + optional ✕ badge side by side)
  dateChipWrap: {
    flexDirection: "row",
    alignItems:    "center",
  },
  dateChip: {
    flexDirection:   "row",
    alignItems:      "center",
    backgroundColor: "rgba(255,255,255,0.12)",
    borderRadius:    R.full,
    paddingHorizontal: SP.md,
    paddingVertical:   SP.xs + 2,
  },
  dateChipActive: {
    backgroundColor: COLORS.accent,
  },
  dateChipTxt: {
    fontSize:   12,
    color:      COLORS.textOnDarkMuted,
    fontWeight: "500",
  },
  dateChipTxtActive: {
    color:      COLORS.heroBg,
    fontWeight: "700",
  },
  clearDateBtn: {
    marginLeft:      SP.xs,
    backgroundColor: "rgba(255,255,255,0.18)",
    borderRadius:    R.full,
    width:           22,
    height:          22,
    alignItems:      "center",
    justifyContent:  "center",
  },
  clearDateBtnTxt: {
    fontSize:   11,
    color:      COLORS.textOnDark,
    fontWeight: "700",
  },

  heroOverviewLabel: {
    fontSize:     13,
    color:        COLORS.textOnDarkMuted,
    marginBottom: SP.xs,
    marginTop:    SP.sm,
  },
  heroBalance: {
    fontSize:     32,
    fontWeight:   "800",
    color:        COLORS.textOnDark,
    marginBottom: SP.md,
    letterSpacing: -0.5,
  },

  heroSubRow: {
    flexDirection: "row",
    gap:           SP.md,
  },
  heroSubCard: {
    flex:            1,
    flexDirection:   "row",
    alignItems:      "center",
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius:    R.md,
    padding:         SP.sm + 2,
    gap:             SP.sm,
  },
  heroSubArrowUp: {
    fontSize:   20,
    color:      COLORS.accent,
    fontWeight: "700",
  },
  heroSubArrowDown: {
    fontSize:   20,
    color:      COLORS.expense,
    fontWeight: "700",
  },
  heroSubLabel: {
    fontSize:     11,
    color:        COLORS.textOnDarkMuted,
    marginBottom: 2,
  },
  heroSubAmount: {
    fontSize:   13,
    fontWeight: "700",
    color:      COLORS.textOnDark,
  },

  // ── Budget bar ───────────────────────────────────────────────────────────
  budgetCard: {
    backgroundColor:  COLORS.cardBg,
    marginHorizontal: SP.md,
    marginBottom:     SP.md,
    borderRadius:     R.lg,
    padding:          SP.md,
    shadowColor:      "#1A2422",
    shadowOffset:     { width: 0, height: 1 },
    shadowOpacity:    0.06,
    shadowRadius:     4,
    elevation:        2,
  },
  budgetHeaderRow: {
    flexDirection:  "row",
    justifyContent: "space-between",
    alignItems:     "center",
    marginBottom:   SP.sm,
  },
  budgetLabel: {
    fontSize:   14,
    fontWeight: "600",
    color:      COLORS.textPrimary,
  },
  budgetPct: {
    fontSize:   14,
    fontWeight: "700",
  },
  budgetTrack: {
    height:          8,
    backgroundColor: COLORS.border,
    borderRadius:    R.full,
    overflow:        "hidden",
    marginBottom:    SP.xs,
  },
  budgetFill: {
    height:       "100%",
    borderRadius: R.full,
  },
  budgetSub: {
    fontSize:  12,
    color:     COLORS.textMuted,
    marginTop: SP.xs,
  },

  // ── Filter chips ─────────────────────────────────────────────────────────
  filterRow: {
    flexDirection:    "row",
    paddingHorizontal: SP.md,
    marginBottom:     SP.md,
    gap:              SP.sm,
  },
  filterChip: {
    paddingHorizontal: SP.md,
    paddingVertical:   SP.xs + 2,
    borderRadius:      R.full,
    backgroundColor:   COLORS.cardBg,
    borderWidth:       1.5,
    borderColor:       COLORS.border,
  },
  filterChipActive: {
    backgroundColor: COLORS.heroBg,
    borderColor:     COLORS.heroBg,
  },
  filterChipTxt: {
    fontSize:   13,
    fontWeight: "600",
    color:      COLORS.textSecondary,
  },
  filterChipTxtActive: {
    color: COLORS.textOnDark,
  },

  // ── Section title ─────────────────────────────────────────────────────────
  sectionTitle: {
    fontSize:         16,
    fontWeight:       "700",
    color:            COLORS.textPrimary,
    marginHorizontal: SP.md,
    marginBottom:     SP.sm,
  },
});