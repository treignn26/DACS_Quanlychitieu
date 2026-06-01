// src/app/add-transaction.tsx — Tab 2: Thêm giao dịch
import React, { useRef, useState } from "react";
import {
  Animated,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ActivityIndicator,
} from "react-native";
import { useLanguage } from "../context/LanguageContext";
import * as api from "../api/client";

// ─── Design tokens ────────────────────────────────────────────────────────────
const COLORS = {
  pageBg: "#F5F7F6", cardBg: "#FFFFFF", heroBg: "#1A2E2A",
  accent: "#2ECC9A",
  income: "#2ECC9A", incomeText: "#15704F", incomeBg: "#E6FAF4", incomeBorder: "#A8DFC9",
  expense: "#FF6B6B", expenseText: "#C0392B", expenseBg: "#FFF0F0", expenseBorder: "#FFBCBC",
  textPrimary: "#1A2422", textSecondary: "#6B8076", textMuted: "#9EB8B0",
  textOnDark: "#FFFFFF", textOnDarkMuted: "#A8C4BC",
  border: "#E8EFED", inputBg: "#F0F5F3", shadow: "#1A2422",
  catActiveBg: "#1A2E2A", catInactiveBg: "#F0F5F3", catInactiveText: "#5A7A72",
};

const SP = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32, xxl: 48 };
const R  = { sm: 10, md: 16, lg: 24, xl: 32 };

// ─── VND formatter ────────────────────────────────────────────────────────────
const fmtVND = (raw: string): string => {
  const n = parseInt(raw.replace(/\D/g, ""), 10);
  if (isNaN(n)) return "";
  return n.toLocaleString("vi-VN");
};

// ─── Data ─────────────────────────────────────────────────────────────────────
type TxType = "expense" | "income";

const TYPE_OPTIONS: { id: TxType; vi: string; en: string; emoji: string }[] = [
  { id: "expense", vi: "Chi tiêu", en: "Expense", emoji: "💸" },
  { id: "income",  vi: "Thu nhập", en: "Income",  emoji: "💰" },
];

interface Category { id: string; vi: string; en: string; emoji: string; }

const EXPENSE_CATS: Category[] = [
  { id: "food",      vi: "Ăn uống",   en: "Food",          emoji: "🍜" },
  { id: "shopping",  vi: "Mua sắm",   en: "Shopping",      emoji: "🛍️" },
  { id: "transport", vi: "Di chuyển", en: "Transport",     emoji: "🚌" },
  { id: "health",    vi: "Sức khỏe",  en: "Health",        emoji: "💊" },
  { id: "bills",     vi: "Hóa đơn",   en: "Bills",         emoji: "📑" },
  { id: "leisure",   vi: "Giải trí",  en: "Leisure",       emoji: "🎮" },
  { id: "housing",   vi: "Nhà ở",     en: "Housing",       emoji: "🏠" },
  { id: "travel",    vi: "Du lịch",   en: "Travel",        emoji: "✈️" },
  { id: "other",     vi: "Khác",      en: "Other",         emoji: "💡" },
];

const INCOME_CATS: Category[] = [
  { id: "salary",    vi: "Lương",     en: "Salary",        emoji: "💼" },
  { id: "freelance", vi: "Freelance", en: "Freelance",     emoji: "🖥️" },
  { id: "invest",    vi: "Đầu tư",    en: "Investment",    emoji: "📈" },
  { id: "gift",      vi: "Quà tặng",  en: "Gift",          emoji: "🎁" },
  { id: "bonus",     vi: "Thưởng",    en: "Bonus",         emoji: "🏆" },
  { id: "other_in",  vi: "Khác",      en: "Other",         emoji: "💡" },
];

// ─── Screen ───────────────────────────────────────────────────────────────────
export default function AddTransactionScreen() {
  const { lang } = useLanguage();

  const [txType,      setTxType]      = useState<TxType>("expense");
  const [rawAmount,   setRawAmount]   = useState("");
  const [notes,       setNotes]       = useState("");
  const [selectedCat, setSelectedCat] = useState<string | null>(null);

  // ── UI states
  const [saving,      setSaving]      = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [errorMsg,    setErrorMsg]    = useState<string | null>(null);

  const toastOpacity = useRef(new Animated.Value(0)).current;

  const today = new Date();
  const dateStr = today.toLocaleDateString(
    lang === "vi" ? "vi-VN" : "en-US",
    lang === "vi"
      ? { weekday: "long", day: "2-digit", month: "2-digit", year: "numeric" }
      : { weekday: "long", month: "short", day: "numeric", year: "numeric" },
  );

  const cats         = txType === "expense" ? EXPENSE_CATS : INCOME_CATS;
  const displayAmount = fmtVND(rawAmount);
  const canSubmit     = rawAmount.replace(/\D/g, "").length > 0 && selectedCat !== null && !saving;

  const handleTypeSwitch = (t: TxType) => { setTxType(t); setSelectedCat(null); };

  const triggerToast = () => {
    setShowSuccess(true);
    Animated.sequence([
      Animated.timing(toastOpacity, { toValue: 1, duration: 250, useNativeDriver: true }),
      Animated.delay(1800),
      Animated.timing(toastOpacity, { toValue: 0, duration: 350, useNativeDriver: true }),
    ]).start(() => setShowSuccess(false));
  };

  const handleSubmit = async () => {
    if (!canSubmit || !selectedCat) return;
    setErrorMsg(null);

    const cat = cats.find((c) => c.id === selectedCat)!;

    try {
      setSaving(true);
      await api.createTransaction({
        type:     txType,
        amount:   Number(rawAmount.replace(/\D/g, "")),
        category: cat.emoji,
        catLabel: { vi: cat.vi, en: cat.en },
        note:     notes,
        date:     today.toISOString(),
      });
      triggerToast();
      setRawAmount("");
      setNotes("");
      setSelectedCat(null);
    } catch (e: any) {
      setErrorMsg(e.message ?? "Lưu thất bại, thử lại.");
    } finally {
      setSaving(false);
    }
  };

  const isExpense = txType === "expense";
  const typeColor  = isExpense ? COLORS.expense : COLORS.income;
  const typeBg     = isExpense ? COLORS.expenseBg : COLORS.incomeBg;
  const s          = (vi: string, en: string) => lang === "vi" ? vi : en;

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.heroBg} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.scrollContent}
      >
        {/* HEADER */}
        <View style={styles.header}>
          <Text style={styles.headerSup}>{s("Thêm giao dịch", "Add Transaction")}</Text>
          <Text style={styles.headerDate}>{dateStr}</Text>
        </View>

        {/* ERROR BANNER */}
        {errorMsg && (
          <View style={styles.errorBanner}>
            <Text style={styles.errorBannerText}>⚠️ {errorMsg}</Text>
          </View>
        )}

        {/* TYPE TOGGLE */}
        <View style={styles.card}>
          <Text style={styles.fieldLabel}>{s("Loại giao dịch", "Transaction Type")}</Text>
          <View style={styles.toggleRow}>
            {TYPE_OPTIONS.map((opt) => {
              const active   = txType === opt.id;
              const isIncome = opt.id === "income";
              return (
                <TouchableOpacity
                  key={opt.id}
                  style={[
                    styles.toggleBtn,
                    active && (isIncome ? styles.toggleBtnIncome : styles.toggleBtnExpense),
                  ]}
                  onPress={() => handleTypeSwitch(opt.id)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.toggleEmoji}>{opt.emoji}</Text>
                  <Text style={[styles.toggleLabel, active && styles.toggleLabelActive]}>
                    {lang === "vi" ? opt.vi : opt.en}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* AMOUNT INPUT */}
        <View style={[styles.card, styles.amountCard]}>
          <Text style={styles.fieldLabel}>{s("Số tiền", "Amount")}</Text>
          <View style={[styles.amountRow, { borderColor: typeColor + "55" }]}>
            <TextInput
              style={[styles.amountInput, { color: typeColor }]}
              placeholder="0"
              placeholderTextColor={COLORS.textMuted}
              keyboardType="numeric"
              value={displayAmount}
              onChangeText={(text) => setRawAmount(text.replace(/\D/g, ""))}
              maxLength={15}
            />
            <View style={[styles.suffixBadge, { backgroundColor: typeBg }]}>
              <Text style={[styles.suffixText, { color: typeColor }]}>đ</Text>
            </View>
          </View>

          <Text style={styles.quickLabel}>{s("Chọn nhanh", "Quick Select")}</Text>
          <View style={styles.quickRow}>
            {[50_000, 100_000, 200_000, 500_000].map((val) => (
              <TouchableOpacity
                key={val}
                style={styles.quickChip}
                onPress={() => setRawAmount(String(val))}
                activeOpacity={0.75}
              >
                <Text style={styles.quickChipText}>{val.toLocaleString("vi-VN")} đ</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* NOTES */}
        <View style={styles.card}>
          <Text style={styles.fieldLabel}>
            {s("Ghi chú", "Notes")}{" "}
            <Text style={styles.optionalTag}>{s("(không bắt buộc)", "(optional)")}</Text>
          </Text>
          <TextInput
            style={styles.notesInput}
            placeholder={s("VD: Ăn trưa với đồng nghiệp", "E.g. Lunch with colleagues")}
            placeholderTextColor={COLORS.textMuted}
            value={notes}
            onChangeText={setNotes}
            multiline
            numberOfLines={2}
          />
        </View>

        {/* CATEGORY GRID */}
        <View style={styles.card}>
          <Text style={styles.fieldLabel}>{s("Danh mục", "Category")}</Text>
          <View style={styles.catGrid}>
            {cats.map((cat) => {
              const active = selectedCat === cat.id;
              return (
                <TouchableOpacity
                  key={cat.id}
                  style={[styles.catCell, active && styles.catCellActive]}
                  onPress={() => setSelectedCat(active ? null : cat.id)}
                  activeOpacity={0.75}
                >
                  <Text style={styles.catEmoji}>{cat.emoji}</Text>
                  <Text style={[styles.catLabel, active && styles.catLabelActive]} numberOfLines={1}>
                    {lang === "vi" ? cat.vi : cat.en}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* SUBMIT */}
        <View style={styles.submitArea}>
          <TouchableOpacity
            style={[styles.submitBtn, { backgroundColor: canSubmit ? COLORS.heroBg : "#C8D8D4" }]}
            onPress={handleSubmit}
            activeOpacity={0.85}
            disabled={!canSubmit}
          >
            {saving ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.submitBtnText}>
                {isExpense ? s("＋ Lưu chi tiêu", "＋ Save Expense") : s("＋ Lưu thu nhập", "＋ Save Income")}
              </Text>
            )}
          </TouchableOpacity>

          <Text style={styles.submitHint}>
            {!rawAmount
              ? s("Vui lòng nhập số tiền", "Please enter an amount")
              : !selectedCat
                ? s("Vui lòng chọn danh mục", "Please select a category")
                : s("Sẵn sàng lưu ✓", "Ready to save ✓")}
          </Text>
        </View>

        <View style={{ height: SP.xxl }} />
      </ScrollView>

      {/* SUCCESS TOAST */}
      {showSuccess && (
        <Animated.View style={[styles.toast, { opacity: toastOpacity }]}>
          <Text style={styles.toastEmoji}>✓</Text>
          <View>
            <Text style={styles.toastTitle}>{s("Đã lưu!", "Saved!")}</Text>
            <Text style={styles.toastSub}>{s("Giao dịch đã được thêm", "Transaction added")}</Text>
          </View>
        </Animated.View>
      )}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root:          { flex: 1, backgroundColor: COLORS.pageBg },
  scrollContent: { paddingBottom: 120 },

  header: {
    backgroundColor: COLORS.heroBg,
    paddingTop: Platform.OS === "ios" ? 58 : 46,
    paddingHorizontal: SP.lg, paddingBottom: SP.xl,
    borderBottomLeftRadius: R.xl, borderBottomRightRadius: R.xl,
  },
  headerSup:  { fontSize: 13, color: COLORS.textOnDarkMuted, fontWeight: "500", letterSpacing: 0.3, marginBottom: SP.xs },
  headerDate: { fontSize: 18, fontWeight: "700", color: COLORS.textOnDark, marginTop: 2 },

  errorBanner: {
    backgroundColor: "#FFF0F0", marginHorizontal: SP.md, marginTop: SP.md,
    borderRadius: R.md, padding: SP.md, borderWidth: 1, borderColor: "#FFBCBC",
  },
  errorBannerText: { fontSize: 13, fontWeight: "600", color: COLORS.expenseText },

  card: {
    backgroundColor: COLORS.cardBg, marginHorizontal: SP.md, marginTop: SP.md,
    borderRadius: R.lg, padding: SP.lg,
    shadowColor: COLORS.shadow, shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 10, elevation: 3,
  },
  fieldLabel: { fontSize: 12, fontWeight: "700", color: COLORS.textSecondary, letterSpacing: 0.3, marginBottom: SP.md, lineHeight: 18 },
  optionalTag: { fontSize: 11, fontWeight: "400", color: COLORS.textMuted },

  toggleRow:         { flexDirection: "row", gap: SP.sm },
  toggleBtn:         { flex: 1, alignItems: "center", paddingVertical: SP.md, borderRadius: R.md, backgroundColor: "#F0F5F3", gap: SP.xs, borderWidth: 2, borderColor: "transparent" },
  toggleBtnExpense:  { backgroundColor: COLORS.expenseBg, borderColor: COLORS.expenseBorder },
  toggleBtnIncome:   { backgroundColor: COLORS.incomeBg, borderColor: COLORS.incomeBorder },
  toggleEmoji:       { fontSize: 22 },
  toggleLabel:       { fontSize: 14, fontWeight: "700", color: COLORS.textSecondary },
  toggleLabelActive: { color: COLORS.textPrimary },

  amountCard: { paddingBottom: SP.md },
  amountRow:  { flexDirection: "row", alignItems: "center", backgroundColor: COLORS.inputBg, borderRadius: R.md, paddingLeft: SP.md, paddingRight: SP.sm, marginBottom: SP.md, borderWidth: 2 },
  amountInput: { flex: 1, fontSize: 34, fontWeight: "800", paddingVertical: SP.md, letterSpacing: -0.5 },
  suffixBadge: { paddingHorizontal: SP.sm + 4, paddingVertical: SP.sm, borderRadius: R.sm, marginLeft: SP.sm },
  suffixText:  { fontSize: 20, fontWeight: "800" },
  quickLabel:  { fontSize: 11, fontWeight: "600", color: COLORS.textMuted, marginBottom: SP.sm, letterSpacing: 0.2 },
  quickRow:    { flexDirection: "row", flexWrap: "wrap", gap: SP.sm },
  quickChip:   { paddingHorizontal: SP.sm + 4, paddingVertical: SP.xs + 2, borderRadius: R.xl, backgroundColor: "#F0F5F3", borderWidth: 1, borderColor: COLORS.border },
  quickChipText: { fontSize: 12, fontWeight: "600", color: COLORS.textSecondary },

  notesInput: { backgroundColor: COLORS.inputBg, borderRadius: R.md, paddingHorizontal: SP.md, paddingTop: SP.md, paddingBottom: SP.md, fontSize: 14, color: COLORS.textPrimary, borderWidth: 1.5, borderColor: COLORS.border, minHeight: 72, textAlignVertical: "top" },

  catGrid:       { flexDirection: "row", flexWrap: "wrap", gap: SP.sm },
  catCell:       { width: "30.5%", alignItems: "center", paddingVertical: SP.md, paddingHorizontal: SP.xs, borderRadius: R.md, backgroundColor: COLORS.catInactiveBg, borderWidth: 2, borderColor: "transparent" },
  catCellActive: { backgroundColor: COLORS.catActiveBg, borderColor: COLORS.heroBg },
  catEmoji:      { fontSize: 22, marginBottom: SP.xs },
  catLabel:      { fontSize: 12, fontWeight: "700", color: COLORS.catInactiveText, textAlign: "center" },
  catLabelActive: { color: "#FFFFFF" },

  submitArea:    { paddingHorizontal: SP.md, marginTop: SP.md, alignItems: "center" },
  submitBtn:     { width: "100%", borderRadius: R.md, paddingVertical: SP.md + 2, alignItems: "center", shadowColor: COLORS.heroBg, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 10, elevation: 5 },
  submitBtnText: { color: "#FFFFFF", fontSize: 16, fontWeight: "800", letterSpacing: 0.2 },
  submitHint:    { marginTop: SP.sm, fontSize: 11, color: COLORS.textMuted, fontWeight: "500", textAlign: "center", lineHeight: 16 },

  toast: { position: "absolute", bottom: 100, left: SP.lg, right: SP.lg, backgroundColor: COLORS.heroBg, borderRadius: R.lg, paddingVertical: SP.md, paddingHorizontal: SP.lg, flexDirection: "row", alignItems: "center", gap: SP.md, shadowColor: COLORS.heroBg, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.35, shadowRadius: 16, elevation: 12, borderLeftWidth: 4, borderLeftColor: COLORS.accent },
  toastEmoji: { fontSize: 22, color: COLORS.accent, fontWeight: "800" },
  toastTitle: { fontSize: 15, fontWeight: "800", color: COLORS.textOnDark },
  toastSub:   { fontSize: 11, color: COLORS.textOnDarkMuted, marginTop: 1 },
});
