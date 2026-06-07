// src/app/index.tsx — Tab 1: Home / Dashboard
import React, { useState, useMemo, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
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
import CalendarModal from "../components/CalendarModal";
import SwipeableRow from "../components/SwipeableRow";
import * as api from "../api/client";

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
  n.toLocaleString("vi-VN") + " đ";

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
  category: string;
  catLabel: { vi: string; en: string };
  note:     string;
  date:     Date;
}

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
      <View
        style={[
          row.iconCircle,
          { backgroundColor: isIncome ? COLORS.incomeBg : COLORS.expenseBg },
        ]}
      >
        <Text style={row.icon}>{tx.category}</Text>
      </View>

      <View style={row.info}>
        <Text style={row.catLabel}>{tx.catLabel[lang]}</Text>
        <Text style={row.note} numberOfLines={1}>{tx.note}</Text>
      </View>

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
    padding:         SP.md,
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
  catLabel: { fontSize: 14, fontWeight: "600", color: COLORS.textPrimary, marginBottom: 2 },
  note:     { fontSize: 12, color: COLORS.textSecondary },
  right:    { alignItems: "flex-end" },
  amount:   { fontSize: 13, fontWeight: "700", marginBottom: 2 },
  date:     { fontSize: 11, color: COLORS.textMuted },
});

// ─── EmptyState sub-component ─────────────────────────────────────────────────
interface EmptyStateProps {
  title: string; body: string; clearLabel: string; onClear: () => void;
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
  wrap:   { alignItems: "center", paddingTop: SP.xl + SP.md, paddingBottom: SP.xl, paddingHorizontal: SP.xl },
  emoji:  { fontSize: 44, marginBottom: SP.md },
  title:  { fontSize: 18, fontWeight: "700", color: COLORS.textPrimary, marginBottom: SP.sm, textAlign: "center" },
  body:   { fontSize: 14, color: COLORS.textSecondary, textAlign: "center", lineHeight: 21, marginBottom: SP.lg },
  btn:    { backgroundColor: COLORS.accentSoft, borderRadius: R.full, paddingHorizontal: SP.lg, paddingVertical: SP.sm + 2 },
  btnTxt: { fontSize: 14, fontWeight: "600", color: COLORS.incomeText },
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

      {/* BUDGET BAR */}
      <View style={s.budgetCard}>
        <View style={s.budgetHeaderRow}>
          <Text style={s.budgetLabel}>{t.homeBudgetTitle}</Text>
          <Text style={[s.budgetPct, { color: budgetOver ? COLORS.expenseText : COLORS.incomeText }]}>
            {barPct}%
          </Text>
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
      </View>

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
    </SafeAreaView>
  );
}

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
});
