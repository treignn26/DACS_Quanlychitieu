// src/app/index.tsx — Tab 1: Home / Dashboard
import { COLORS, SP, R } from "@/constants/tokens";
import React, { useState, useMemo, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  Platform,
  ActivityIndicator,
  ListRenderItemInfo,
  Modal,
  Animated,
} from "react-native";
import { useFocusEffect } from "expo-router";
import { useLanguage } from "../context/LanguageContext";
import { CalendarModal, SwipeableRow, TxRow, EmptyState, type Tx } from "@/components";
import * as api from "../api/client";

// ─── Design tokens ────────────────────────────────────────────────────────────

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmtVND = (n: number): string =>
  n.toLocaleString("vi-VN") + " đ";

const isSameDay = (a: Date, b: Date): boolean =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth()    === b.getMonth()    &&
  a.getDate()     === b.getDate();

// ─── Category metadata (for budget plan display) ──────────────────────────────
const CAT_META: Record<string, { vi: string; en: string; emoji: string }> = {
  food:      { vi: "Ăn uống",    en: "Food",       emoji: "🍜" },
  shopping:  { vi: "Mua sắm",    en: "Shopping",   emoji: "🛍️" },
  transport: { vi: "Di chuyển",  en: "Transport",  emoji: "🚌" },
  health:    { vi: "Sức khỏe",   en: "Health",     emoji: "💊" },
  bills:     { vi: "Hóa đơn",    en: "Bills",      emoji: "📑" },
  leisure:   { vi: "Giải trí",   en: "Leisure",    emoji: "🎮" },
  housing:   { vi: "Nhà ở",      en: "Housing",    emoji: "🏠" },
  travel:    { vi: "Du lịch",    en: "Travel",     emoji: "✈️" },
  other:     { vi: "Khác",       en: "Other",      emoji: "💡" },
  other_in:  { vi: "Khác",       en: "Other",      emoji: "💡" },
};

// ─── Types ────────────────────────────────────────────────────────────────────
type TxTypeFilter = "all" | "income" | "expense";

// Chuyển Transaction từ API sang Tx dùng trong UI
const toTx = (raw: api.Transaction): Tx => ({
  id:       raw._id,
  type:     raw.type,
  amount:   raw.amount,
  category: raw.category,
  catLabel: raw.catLabel,
  note:     raw.note,
  date:     new Date(raw.date),
});


// ─── Main screen ──────────────────────────────────────────────────────────────
export default function HomeScreen() {
  const { t, lang } = useLanguage();
  const today = new Date();

  // ── Data state từ API
  const [transactions, setTransactions] = useState<Tx[]>([]);
  const [summary, setSummary]           = useState<api.Summary>({
    totalIncome: 0, totalExpense: 0, balance: 0,
  });
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState<string | null>(null);

  // ── Filter state
  const [typeFilter,   setTypeFilter]   = useState<TxTypeFilter>("all");
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [showCal,      setShowCal]      = useState(false);

  // ── Budget plan state
  const [budgetData,      setBudgetData]      = useState<api.BudgetData | null>(null);
  const [showBudgetModal, setShowBudgetModal] = useState(false);

  // ── Delete state
  const [deletingTx,       setDeletingTx]       = useState<Tx | null>(null);
  const [showDeleteModal,  setShowDeleteModal]  = useState(false);
  const [isDeleting,       setIsDeleting]       = useState(false);
  const [deleteError,      setDeleteError]      = useState<string | null>(null);
  const deleteToastOpacity = React.useRef(new Animated.Value(0)).current;
  const [showDeleteToast,  setShowDeleteToast]  = useState(false);

  const triggerDeleteToast = () => {
    setShowDeleteToast(true);
    Animated.sequence([
      Animated.timing(deleteToastOpacity, { toValue: 1, duration: 220, useNativeDriver: true }),
      Animated.delay(1600),
      Animated.timing(deleteToastOpacity, { toValue: 0, duration: 300, useNativeDriver: true }),
    ]).start(() => setShowDeleteToast(false));
  };

  const requestDelete = (tx: Tx) => {
    setDeletingTx(tx);
    setDeleteError(null);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!deletingTx) return;
    try {
      setIsDeleting(true);
      setDeleteError(null);
      await api.deleteTransaction(deletingTx.id);
      setTransactions((prev) => prev.filter((t) => t.id !== deletingTx.id));
      const sum = await api.getSummary();
      setSummary(sum);
      setShowDeleteModal(false);
      setDeletingTx(null);
      triggerDeleteToast();
    } catch (e: any) {
      setDeleteError(e.message ?? "Xóa thất bại, thử lại.");
    } finally {
      setIsDeleting(false);
    }
  };

  // ── Fetch data — gọi lại mỗi lần tab được focus
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [rawTx, sum] = await Promise.all([
        api.getTransactions(),
        api.getSummary(),
      ]);
      setTransactions(rawTx.map(toTx));
      setSummary(sum);
      // budget plan — non-blocking, failure không ảnh hưởng màn hình chính
      const now = new Date();
      api.getBudgetData(now.getMonth() + 1, now.getFullYear())
        .then((data) => setBudgetData(data))
        .catch(() => {});
    } catch (e: any) {
      setError(e.message ?? "Không thể tải dữ liệu");
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [fetchData]),
  );

  // ── Derived values từ summary
  const { totalIncome, totalExpense, balance } = summary;
  const barPct     = totalIncome > 0 ? Math.round((totalExpense / totalIncome) * 100) : 0;
  const barWidth   = Math.min(barPct, 100);   // thanh không vượt quá track
  const budgetOver = barPct >= 100;

  // ── Budget plan categories for home display
  const budgetCatItems = useMemo(() => {
    if (!budgetData) return [];
    const { plan, categorySpending } = budgetData;
    const budgets = plan.categoryBudgets as Record<string, number>;
    if (!budgets) return [];

    // emoji → catId
    const emojiToId: Record<string, string> = {};
    Object.entries(CAT_META).forEach(([id, { emoji }]) => { emojiToId[emoji] = id; });
    (plan.customCategories ?? []).forEach((c) => { emojiToId[c.emoji] = c.id; });

    // catId → spent (via emoji key from API)
    const spentById: Record<string, number> = {};
    Object.entries(categorySpending ?? {}).forEach(([emoji, amt]) => {
      const id = emojiToId[emoji];
      if (id) spentById[id] = (spentById[id] ?? 0) + amt;
    });

    const items: { catId: string; emoji: string; name: string; spent: number; limit: number; pct: number }[] = [];
    for (const [catId, limit] of Object.entries(budgets)) {
      if (!limit || limit <= 0) continue;
      const meta: { vi: string; en: string; emoji: string } | undefined =
        CAT_META[catId] ?? (plan.customCategories ?? []).find((c) => c.id === catId);
      if (!meta) continue;
      const customName = (plan.categoryNames as Record<string, string>)?.[catId];
      const name  = customName || (lang === "vi" ? meta.vi : meta.en);
      const spent = spentById[catId] ?? 0;
      const pct   = (spent / limit) * 100;
      items.push({ catId, emoji: meta.emoji, name, spent, limit, pct });
    }
    return items.sort((a, b) => b.pct - a.pct);
  }, [budgetData, lang]);

  // ── Filtered list (client-side)
  const filteredTx = useMemo<Tx[]>(() => {
    return transactions.filter(tx => {
      const typeOk = typeFilter === "all" || tx.type === typeFilter;
      const dateOk = !selectedDate || isSameDay(tx.date, selectedDate);
      return typeOk && dateOk;
    });
  }, [transactions, typeFilter, selectedDate]);

  const txDates = useMemo(() => transactions.map(tx => tx.date), [transactions]);

  const periodLabel    = `${t.homeMonths[today.getMonth()]} ${today.getFullYear()}`;
  const dateChipLabel  = selectedDate
    ? selectedDate.toLocaleDateString(lang === "vi" ? "vi-VN" : "en-GB",
        { day: "2-digit", month: "2-digit", year: "numeric" })
    : lang === "vi" ? "📅 Lọc theo ngày" : "📅 Filter by date";

  const emptyTitle     = lang === "vi" ? "Không có giao dịch"                          : "No Transactions";
  const emptyBody      = lang === "vi" ? "Không tìm thấy giao dịch phù hợp với bộ lọc." : "No transactions match the current filter.";
  const clearFilterLbl = lang === "vi" ? "Xoá bộ lọc"                                  : "Clear filter";

  const clearFilters = () => { setTypeFilter("all"); setSelectedDate(null); };

  // ── Loading / Error states
  if (loading) {
    return (
      <SafeAreaView style={[s.safe, { justifyContent: "center", alignItems: "center" }]}>
        <ActivityIndicator size="large" color={COLORS.accent} />
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={[s.safe, { justifyContent: "center", alignItems: "center", padding: SP.lg }]}>
        <Text style={{ fontSize: 40, marginBottom: SP.md }}>⚠️</Text>
        <Text style={{ fontSize: 16, fontWeight: "700", color: COLORS.textPrimary, textAlign: "center", marginBottom: SP.sm }}>
          {lang === "vi" ? "Không thể kết nối" : "Connection Error"}
        </Text>
        <Text style={{ fontSize: 13, color: COLORS.textSecondary, textAlign: "center", marginBottom: SP.lg }}>
          {error}
        </Text>
        <TouchableOpacity
          style={{ backgroundColor: COLORS.heroBg, borderRadius: R.full, paddingHorizontal: SP.lg, paddingVertical: SP.sm + 2 }}
          onPress={fetchData}
          activeOpacity={0.8}
        >
          <Text style={{ color: COLORS.textOnDark, fontWeight: "700" }}>
            {lang === "vi" ? "Thử lại" : "Retry"}
          </Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  // ── FlatList header
  const ListHeader = () => (
    <>
      {/* HERO CARD */}
      <View style={s.hero}>
        <View style={s.heroPeriodRow}>
          <Text style={s.heroPeriod}>{periodLabel}</Text>
          <View style={s.dateChipWrap}>
            <TouchableOpacity
              style={[s.dateChip, selectedDate !== null && s.dateChipActive]}
              onPress={() => setShowCal(true)}
              activeOpacity={0.8}
            >
              <Text style={[s.dateChipTxt, selectedDate !== null && s.dateChipTxtActive]}>
                {dateChipLabel}
              </Text>
            </TouchableOpacity>
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

        <Text style={s.heroOverviewLabel}>{t.homeOverview}</Text>
        <Text style={s.heroBalance}>{fmtVND(balance)}</Text>

        <View style={s.heroSubRow}>
          <View style={s.heroSubCard}>
            <Text style={s.heroSubArrowUp}>↑</Text>
            <View>
              <Text style={s.heroSubLabel}>{t.homeIncome}</Text>
              <Text style={s.heroSubAmount}>{fmtVND(totalIncome)}</Text>
            </View>
          </View>
          <View style={s.heroSubCard}>
            <Text style={s.heroSubArrowDown}>↓</Text>
            <View>
              <Text style={s.heroSubLabel}>{t.homeExpenses}</Text>
              <Text style={[s.heroSubAmount, { color: COLORS.expense }]}>{fmtVND(totalExpense)}</Text>
            </View>
          </View>
        </View>
      </View>

      {/* BUDGET BAR — ấn để mở modal kế hoạch */}
      <TouchableOpacity
        style={s.budgetCard}
        onPress={() => budgetCatItems.length > 0 && setShowBudgetModal(true)}
        activeOpacity={budgetCatItems.length > 0 ? 0.82 : 1}
      >
        <View style={s.budgetHeaderRow}>
          <Text style={s.budgetLabel}>{t.homeBudgetTitle}</Text>
          <View style={{ flexDirection: "row", alignItems: "center", gap: SP.sm }}>
            <Text style={[s.budgetPct, { color: budgetOver ? COLORS.expenseText : COLORS.incomeText }]}>
              {barPct}%
            </Text>
            {budgetCatItems.length > 0 && (
              <Text style={s.budgetChevron}>›</Text>
            )}
          </View>
        </View>
        <View style={s.budgetTrack}>
          <View
            style={[
              s.budgetFill,
              { width: `${barWidth}%` as any, backgroundColor: budgetOver ? COLORS.expense : COLORS.accent },
            ]}
          />
        </View>
        <Text style={s.budgetSub}>
          {fmtVND(totalExpense)} / {fmtVND(totalIncome)}
        </Text>
      </TouchableOpacity>

      {/* OVER-BUDGET WARNING */}
      {barPct >= 100 && (
        <View style={s.overBudgetBanner}>
          <Text style={s.overBudgetTxt}>
            {lang === "vi"
              ? `⛔ Chi tiêu đã vượt thu nhập ${barPct}%! Hãy kiểm soát chi tiêu của bạn.`
              : `⛔ Spending at ${barPct}% of income! Time to rein in your expenses.`}
          </Text>
        </View>
      )}

      {/* TYPE FILTER CHIPS */}
      <View style={s.filterRow}>
        {(["all", "income", "expense"] as TxTypeFilter[]).map(f => {
          const label = f === "all" ? t.homeAll : f === "income" ? t.homeIncFilter : t.homeExpFilter;
          const active = typeFilter === f;
          return (
            <TouchableOpacity
              key={f}
              style={[s.filterChip, active && s.filterChipActive]}
              onPress={() => setTypeFilter(f)}
              activeOpacity={0.75}
            >
              <Text style={[s.filterChipTxt, active && s.filterChipTxtActive]}>{label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <Text style={s.sectionTitle}>{t.homeActivity}</Text>
    </>
  );

  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle="light-content" />
      <FlatList<Tx>
        data={filteredTx}
        keyExtractor={(item: Tx) => item.id}
        renderItem={({ item }: ListRenderItemInfo<Tx>) => (
          <SwipeableRow onDeleteRequest={() => requestDelete(item)}>
            <TxRow tx={item} lang={lang} />
          </SwipeableRow>
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
      <CalendarModal
        visible={showCal}
        selectedDate={selectedDate}
        onSelectDate={setSelectedDate}
        onClose={() => setShowCal(false)}
        txDates={txDates}
      />

      {/* ── Delete confirmation modal ── */}
      <Modal visible={showDeleteModal} transparent animationType="fade">
        <TouchableOpacity
          style={s.modalOverlay}
          activeOpacity={1}
          onPress={() => !isDeleting && setShowDeleteModal(false)}
        >
          <TouchableOpacity style={s.modalCard} activeOpacity={1}>
            <Text style={s.modalEmoji}>🗑️</Text>
            <Text style={s.modalTitle}>
              {lang === "vi" ? "Xóa giao dịch?" : "Delete Transaction?"}
            </Text>

            {deletingTx && (
              <View style={s.modalTxPreview}>
                <Text style={s.modalTxEmoji}>{deletingTx.category}</Text>
                <View>
                  <Text style={s.modalTxLabel}>{deletingTx.catLabel[lang]}</Text>
                  <Text style={[
                    s.modalTxAmount,
                    { color: deletingTx.type === "income" ? COLORS.incomeText : COLORS.expenseText },
                  ]}>
                    {deletingTx.type === "income" ? "+" : "−"}{fmtVND(deletingTx.amount)}
                  </Text>
                </View>
              </View>
            )}

            <Text style={s.modalBody}>
              {lang === "vi"
                ? "Hành động này không thể hoàn tác."
                : "This action cannot be undone."}
            </Text>

            {deleteError && (
              <Text style={s.modalError}>⚠️ {deleteError}</Text>
            )}

            <View style={s.modalBtnRow}>
              <TouchableOpacity
                style={s.modalCancel}
                onPress={() => setShowDeleteModal(false)}
                disabled={isDeleting}
                activeOpacity={0.8}
              >
                <Text style={s.modalCancelTxt}>
                  {lang === "vi" ? "Hủy" : "Cancel"}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.modalConfirm, isDeleting && { opacity: 0.7 }]}
                onPress={confirmDelete}
                disabled={isDeleting}
                activeOpacity={0.8}
              >
                {isDeleting
                  ? <ActivityIndicator color="#fff" size="small" />
                  : <Text style={s.modalConfirmTxt}>{lang === "vi" ? "Xóa" : "Delete"}</Text>}
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* ── Delete success toast ── */}
      {showDeleteToast && (
        <Animated.View style={[s.toast, { opacity: deleteToastOpacity }]}>
          <Text style={s.toastIcon}>✓</Text>
          <Text style={s.toastTxt}>
            {lang === "vi" ? "Đã xóa giao dịch" : "Transaction deleted"}
          </Text>
        </Animated.View>
      )}

      {/* ── Budget plan modal ── */}
      <BudgetPlanModal
        visible={showBudgetModal}
        onClose={() => setShowBudgetModal(false)}
        items={budgetCatItems}
        budgetData={budgetData}
        barPct={barPct}
        totalExpense={totalExpense}
        totalIncome={totalIncome}
        lang={lang}
      />
    </SafeAreaView>
  );
}

// ─── BudgetPlanModal ──────────────────────────────────────────────────────────

type BudgetItem = { catId: string; emoji: string; name: string; spent: number; limit: number; pct: number };

function BudgetPlanModal({
  visible, onClose, items, budgetData, barPct, totalExpense, totalIncome, lang,
}: {
  visible: boolean;
  onClose: () => void;
  items: BudgetItem[];
  budgetData: api.BudgetData | null;
  barPct: number;
  totalExpense: number;
  totalIncome: number;
  lang: "vi" | "en";
}) {
  const vi = lang === "vi";
  const budgetOver = barPct >= 100;
  const today = new Date();
  const monthLabel = today.toLocaleDateString(vi ? "vi-VN" : "en-US", { month: "long", year: "numeric" });

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={bm.root}>
        <StatusBar barStyle="light-content" backgroundColor={COLORS.heroBg} />

        {/* Header */}
        <View style={bm.header}>
          <TouchableOpacity style={bm.backBtn} onPress={onClose} activeOpacity={0.75}>
            <Text style={bm.backArrow}>‹</Text>
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={bm.title}>{vi ? "Ngân sách tháng" : "Monthly Budget"}</Text>
            <Text style={bm.subtitle}>{monthLabel}</Text>
          </View>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={bm.body}
        >
          {/* Tổng quan */}
          <View style={[bm.summaryCard, { borderColor: budgetOver ? COLORS.expenseBorder : COLORS.incomeBorder }]}>
            <View style={bm.summaryRow}>
              <View style={bm.summaryItem}>
                <Text style={bm.summaryLabel}>{vi ? "Đã chi" : "Spent"}</Text>
                <Text style={[bm.summaryValue, { color: COLORS.expenseText }]}>{fmtVND(totalExpense)}</Text>
              </View>
              <View style={bm.summaryDivider} />
              <View style={bm.summaryItem}>
                <Text style={bm.summaryLabel}>{vi ? "Thu nhập" : "Income"}</Text>
                <Text style={[bm.summaryValue, { color: COLORS.incomeText }]}>{fmtVND(totalIncome)}</Text>
              </View>
              <View style={bm.summaryDivider} />
              <View style={bm.summaryItem}>
                <Text style={bm.summaryLabel}>{vi ? "Tỷ lệ" : "Usage"}</Text>
                <Text style={[bm.summaryValue, { color: budgetOver ? COLORS.expenseText : COLORS.incomeText }]}>
                  {barPct}%
                </Text>
              </View>
            </View>
            <View style={bm.overallTrack}>
              <View style={[bm.overallFill, {
                width: `${Math.min(barPct, 100)}%` as any,
                backgroundColor: budgetOver ? COLORS.expense : COLORS.accent,
              }]} />
            </View>
          </View>

          {/* Cảnh báo vượt ngân sách */}
          {budgetOver && (
            <View style={bm.warnBanner}>
              <Text style={bm.warnText}>
                {vi
                  ? `⛔ Chi tiêu đã vượt thu nhập ${barPct}%! Hãy kiểm soát chi tiêu.`
                  : `⛔ Spending at ${barPct}% of income! Time to cut back.`}
              </Text>
            </View>
          )}

          {/* Danh sách danh mục */}
          <Text style={bm.sectionTitle}>
            {vi ? "Chi tiết theo danh mục" : "Category Breakdown"}
          </Text>

          {items.length === 0 ? (
            <View style={bm.emptyWrap}>
              <Text style={bm.emptyEmoji}>📋</Text>
              <Text style={bm.emptyText}>
                {vi ? "Chưa có kế hoạch danh mục nào." : "No category budgets set yet."}
              </Text>
            </View>
          ) : (
            <View style={bm.catList}>
              {items.map((item) => {
                const over = item.pct >= 100;
                const warn = item.pct >= 80 && !over;
                const fillColor = over ? COLORS.expense : warn ? "#E67E22" : COLORS.accent;
                return (
                  <View key={item.catId} style={bm.catRow}>
                    <View style={bm.catIconWrap}>
                      <Text style={bm.catEmoji}>{item.emoji}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <View style={bm.catHeaderRow}>
                        <Text style={bm.catName} numberOfLines={1}>{item.name}</Text>
                        <Text style={[bm.catPct, { color: over ? COLORS.expenseText : warn ? "#E67E22" : COLORS.incomeText }]}>
                          {Math.round(item.pct)}%
                        </Text>
                      </View>
                      <View style={bm.catTrack}>
                        <View style={[bm.catFill, { width: `${Math.min(item.pct, 100)}%` as any, backgroundColor: fillColor }]} />
                      </View>
                      <Text style={bm.catSub}>{fmtVND(item.spent)} / {fmtVND(item.limit)}</Text>
                    </View>
                  </View>
                );
              })}
            </View>
          )}

          {/* Thông tin kế hoạch tổng */}
          {budgetData?.plan && (budgetData.plan.monthlySavings > 0 || budgetData.plan.otherPlan) && (
            <View style={bm.planInfoCard}>
              {budgetData.plan.monthlySavings > 0 && (
                <View style={bm.planInfoRow}>
                  <Text style={bm.planInfoLabel}>💰 {vi ? "Mục tiêu tiết kiệm" : "Savings goal"}</Text>
                  <Text style={bm.planInfoValue}>{fmtVND(budgetData.plan.monthlySavings)}</Text>
                </View>
              )}
              {!!budgetData.plan.otherPlan && (
                <View style={[bm.planInfoRow, { borderBottomWidth: 0 }]}>
                  <Text style={bm.planInfoLabel}>📝 {vi ? "Ghi chú kế hoạch" : "Plan note"}</Text>
                  <Text style={[bm.planInfoValue, { flexShrink: 1 }]} numberOfLines={2}>{budgetData.plan.otherPlan}</Text>
                </View>
              )}
            </View>
          )}

          <View style={{ height: SP.xxl }} />
        </ScrollView>
      </View>
    </Modal>
  );
}

const bm = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.pageBg },

  header: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: COLORS.heroBg,
    paddingTop: Platform.OS === "ios" ? 56 : 40,
    paddingBottom: SP.md,
    paddingHorizontal: SP.md,
    gap: SP.sm,
  },
  backBtn:   { width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(255,255,255,0.1)", alignItems: "center", justifyContent: "center" },
  backArrow: { fontSize: 26, color: COLORS.textOnDark, lineHeight: 30, fontWeight: "300", marginTop: -2 },
  title:     { fontSize: 17, fontWeight: "800", color: COLORS.textOnDark, letterSpacing: -0.2 },
  subtitle:  { fontSize: 11, color: COLORS.textOnDarkMuted, marginTop: 1, fontWeight: "500" },

  body: { padding: SP.md, paddingTop: SP.lg },

  summaryCard: { backgroundColor: COLORS.cardBg, borderRadius: R.lg, padding: SP.md, marginBottom: SP.md, borderWidth: 1.5, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 3 },
  summaryRow:  { flexDirection: "row", marginBottom: SP.md },
  summaryItem: { flex: 1, alignItems: "center" },
  summaryLabel:{ fontSize: 11, color: COLORS.textMuted, fontWeight: "600", marginBottom: 3 },
  summaryValue:{ fontSize: 14, fontWeight: "800" },
  summaryDivider: { width: 1, backgroundColor: COLORS.border, marginVertical: SP.xs },
  overallTrack:{ height: 8, backgroundColor: COLORS.border, borderRadius: R.full, overflow: "hidden" },
  overallFill: { height: "100%", borderRadius: R.full },

  warnBanner: { backgroundColor: COLORS.expenseBg, borderRadius: R.lg, padding: SP.md, marginBottom: SP.md, borderWidth: 1, borderColor: COLORS.expenseBorder },
  warnText:   { fontSize: 13, fontWeight: "600", color: COLORS.expenseText, lineHeight: 18 },

  sectionTitle: { fontSize: 13, fontWeight: "800", color: COLORS.textMuted, letterSpacing: 0.6, textTransform: "uppercase", marginBottom: SP.sm, marginTop: SP.xs },

  emptyWrap:  { alignItems: "center", paddingVertical: SP.xl },
  emptyEmoji: { fontSize: 40, marginBottom: SP.md },
  emptyText:  { fontSize: 14, color: COLORS.textSecondary, textAlign: "center" },

  catList:     { backgroundColor: COLORS.cardBg, borderRadius: R.lg, paddingHorizontal: SP.md, paddingTop: SP.sm, paddingBottom: SP.xs, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  catRow:      { flexDirection: "row", alignItems: "center", paddingVertical: SP.sm + 2, borderBottomWidth: 1, borderBottomColor: COLORS.border, gap: SP.sm },
  catIconWrap: { width: 36, height: 36, borderRadius: 18, backgroundColor: COLORS.accentSoft, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  catEmoji:    { fontSize: 18 },
  catHeaderRow:{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 3 },
  catName:     { fontSize: 14, fontWeight: "600", color: COLORS.textPrimary, flex: 1, marginRight: SP.sm },
  catPct:      { fontSize: 13, fontWeight: "800" },
  catTrack:    { height: 6, backgroundColor: COLORS.border, borderRadius: R.full, overflow: "hidden", marginBottom: 3 },
  catFill:     { height: "100%", borderRadius: R.full },
  catSub:      { fontSize: 11, color: COLORS.textMuted },

  planInfoCard:    { backgroundColor: COLORS.cardBg, borderRadius: R.lg, marginTop: SP.md, paddingHorizontal: SP.md, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  planInfoRow:     { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: SP.md, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  planInfoLabel:   { fontSize: 13, fontWeight: "600", color: COLORS.textSecondary },
  planInfoValue:   { fontSize: 13, fontWeight: "700", color: COLORS.textPrimary, marginLeft: SP.md, textAlign: "right" },
});

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  safe: {
    flex: 1, backgroundColor: COLORS.pageBg,
    paddingTop: Platform.OS === "android" ? StatusBar.currentHeight : 0,
  },
  listContent: { paddingBottom: 120 },

  hero: {
    backgroundColor: COLORS.heroBg, marginHorizontal: SP.md, marginTop: SP.md,
    borderRadius: R.xl, padding: SP.lg, marginBottom: SP.md,
    shadowColor: "#000", shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.22, shadowRadius: 16, elevation: 10,
  },
  heroPeriodRow:     { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: SP.sm },
  heroPeriod:        { fontSize: 13, color: COLORS.textOnDarkMuted, fontWeight: "500" },
  dateChipWrap:      { flexDirection: "row", alignItems: "center" },
  dateChip:          { flexDirection: "row", alignItems: "center", backgroundColor: "rgba(255,255,255,0.12)", borderRadius: R.full, paddingHorizontal: SP.md, paddingVertical: SP.xs + 2 },
  dateChipActive:    { backgroundColor: COLORS.accent },
  dateChipTxt:       { fontSize: 12, color: COLORS.textOnDarkMuted, fontWeight: "500" },
  dateChipTxtActive: { color: COLORS.heroBg, fontWeight: "700" },
  clearDateBtn:      { marginLeft: SP.xs, backgroundColor: "rgba(255,255,255,0.18)", borderRadius: R.full, width: 22, height: 22, alignItems: "center", justifyContent: "center" },
  clearDateBtnTxt:   { fontSize: 11, color: COLORS.textOnDark, fontWeight: "700" },
  heroOverviewLabel: { fontSize: 13, color: COLORS.textOnDarkMuted, marginBottom: SP.xs, marginTop: SP.sm },
  heroBalance:       { fontSize: 32, fontWeight: "800", color: COLORS.textOnDark, marginBottom: SP.md, letterSpacing: -0.5 },
  heroSubRow:        { flexDirection: "row", gap: SP.md },
  heroSubCard:       { flex: 1, flexDirection: "row", alignItems: "center", backgroundColor: "rgba(255,255,255,0.08)", borderRadius: R.md, padding: SP.sm + 2, gap: SP.sm },
  heroSubArrowUp:    { fontSize: 20, color: COLORS.accent, fontWeight: "700" },
  heroSubArrowDown:  { fontSize: 20, color: COLORS.expense, fontWeight: "700" },
  heroSubLabel:      { fontSize: 11, color: COLORS.textOnDarkMuted, marginBottom: 2 },
  heroSubAmount:     { fontSize: 13, fontWeight: "700", color: COLORS.textOnDark },

  budgetCard:       { backgroundColor: COLORS.cardBg, marginHorizontal: SP.md, marginBottom: SP.md, borderRadius: R.lg, padding: SP.md, shadowColor: "#1A2422", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2 },
  budgetHeaderRow:  { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: SP.sm },
  budgetLabel:      { fontSize: 14, fontWeight: "600", color: COLORS.textPrimary },
  budgetPct:        { fontSize: 14, fontWeight: "700" },
  budgetTrack:      { height: 8, backgroundColor: COLORS.border, borderRadius: R.full, overflow: "hidden", marginBottom: SP.xs },
  budgetFill:       { height: "100%", borderRadius: R.full },
  budgetSub:        { fontSize: 12, color: COLORS.textMuted, marginTop: SP.xs },

  filterRow:         { flexDirection: "row", paddingHorizontal: SP.md, marginBottom: SP.md, gap: SP.sm },
  filterChip:        { paddingHorizontal: SP.md, paddingVertical: SP.xs + 2, borderRadius: R.full, backgroundColor: COLORS.cardBg, borderWidth: 1.5, borderColor: COLORS.border },
  filterChipActive:  { backgroundColor: COLORS.heroBg, borderColor: COLORS.heroBg },
  filterChipTxt:     { fontSize: 13, fontWeight: "600", color: COLORS.textSecondary },
  filterChipTxtActive: { color: COLORS.textOnDark },
  sectionTitle:      { fontSize: 16, fontWeight: "700", color: COLORS.textPrimary, marginHorizontal: SP.md, marginBottom: SP.sm },

  // ── Delete modal
  modalOverlay:    { flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "center", alignItems: "center", padding: SP.lg },
  modalCard:       { backgroundColor: COLORS.cardBg, borderRadius: R.xl, padding: SP.lg, width: "100%", alignItems: "center", shadowColor: "#000", shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.18, shadowRadius: 20, elevation: 12 },
  modalEmoji:      { fontSize: 36, marginBottom: SP.sm },
  modalTitle:      { fontSize: 18, fontWeight: "800", color: COLORS.textPrimary, marginBottom: SP.md, textAlign: "center" },
  modalTxPreview:  { flexDirection: "row", alignItems: "center", gap: SP.sm, backgroundColor: COLORS.inputBg, borderRadius: R.md, paddingHorizontal: SP.md, paddingVertical: SP.sm, marginBottom: SP.md, width: "100%" },
  modalTxEmoji:    { fontSize: 26 },
  modalTxLabel:    { fontSize: 14, fontWeight: "600", color: COLORS.textPrimary },
  modalTxAmount:   { fontSize: 13, fontWeight: "700", marginTop: 2 },
  modalBody:       { fontSize: 13, color: COLORS.textSecondary, textAlign: "center", marginBottom: SP.sm },
  modalError:      { fontSize: 13, color: COLORS.expenseText, textAlign: "center", marginBottom: SP.sm },
  modalBtnRow:     { flexDirection: "row", gap: SP.sm, marginTop: SP.md, width: "100%" },
  modalCancel:     { flex: 1, borderRadius: R.md, paddingVertical: SP.sm + 4, alignItems: "center", backgroundColor: COLORS.border },
  modalCancelTxt:  { fontSize: 15, fontWeight: "700", color: COLORS.textSecondary },
  modalConfirm:    { flex: 1, borderRadius: R.md, paddingVertical: SP.sm + 4, alignItems: "center", backgroundColor: "#E74C3C" },
  modalConfirmTxt: { fontSize: 15, fontWeight: "700", color: "#FFFFFF" },

  // ── Delete toast
  toast:    { position: "absolute", bottom: 100, left: SP.lg, right: SP.lg, backgroundColor: COLORS.heroBg, borderRadius: R.lg, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: SP.sm, paddingVertical: SP.sm + 4, shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.18, shadowRadius: 12, elevation: 8 },
  toastIcon: { fontSize: 16, color: COLORS.accent, fontWeight: "700" },
  toastTxt:  { fontSize: 14, fontWeight: "600", color: COLORS.textOnDark },

  // ── Over-budget warning banner
  overBudgetBanner: { backgroundColor: COLORS.expenseBg, marginHorizontal: SP.md, marginBottom: SP.sm, borderRadius: R.lg, padding: SP.md, borderWidth: 1, borderColor: "#FFBCBC" },
  overBudgetTxt:    { fontSize: 13, fontWeight: "600", color: COLORS.expenseText, lineHeight: 18 },

  // ── Budget plan categories card
  planCard:      { backgroundColor: COLORS.cardBg, marginHorizontal: SP.md, marginBottom: SP.md, borderRadius: R.lg, padding: SP.md, shadowColor: "#1A2422", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2 },
  planCardTitle: { fontSize: 14, fontWeight: "700", color: COLORS.textPrimary, marginBottom: SP.md },
  planCatRow:    { flexDirection: "row", alignItems: "center", marginBottom: SP.sm + 2 },
  planCatEmoji:  { fontSize: 20, width: 30, marginRight: SP.sm },
  planCatHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 3 },
  planCatName:   { fontSize: 13, fontWeight: "600", color: COLORS.textPrimary, flex: 1, marginRight: SP.sm },
  planCatPct:    { fontSize: 12, fontWeight: "700", color: COLORS.incomeText },
  planCatTrack:  { height: 6, backgroundColor: COLORS.border, borderRadius: R.full, overflow: "hidden", marginBottom: 3 },
  planCatFill:   { height: "100%", borderRadius: R.full },
  planCatSub:    { fontSize: 11, color: COLORS.textMuted },
  budgetChevron: { fontSize: 10, color: COLORS.textMuted, fontWeight: "700" },
});
