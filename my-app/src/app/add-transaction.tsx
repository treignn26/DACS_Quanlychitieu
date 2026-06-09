// src/app/add-transaction.tsx — Tab: Ngân sách
import { COLORS, SP, RL as R } from "@/constants/tokens";
import React, { useCallback, useMemo, useRef, useState } from "react";
import { useFocusEffect } from "expo-router";
import {
  ActivityIndicator,
  Animated,
  Modal,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useLanguage } from "../context/LanguageContext";
import CalendarModal from "../components/CalendarModal";
import * as api from "../api/client";


// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmtVND = (raw: string): string => {
  const n = parseInt(raw.replace(/\D/g, ""), 10);
  if (isNaN(n)) return "";
  return n.toLocaleString("vi-VN");
};
const fmtNum = (n: number) => n.toLocaleString("vi-VN") + " đ";

// ─── Types & data ─────────────────────────────────────────────────────────────
type TxType   = "expense" | "income";
type PageMode = "add" | "plan";
type PlanMode = "monthly" | "category";

const TYPE_OPTIONS: { id: TxType; vi: string; en: string; emoji: string }[] = [
  { id: "expense", vi: "Chi tiêu", en: "Expense", emoji: "💸" },
  { id: "income",  vi: "Thu nhập", en: "Income",  emoji: "💰" },
];

interface Category { id: string; vi: string; en: string; emoji: string }

const EXPENSE_CATS: Category[] = [
  { id: "food",      vi: "Ăn uống",   en: "Food",      emoji: "🍜" },
  { id: "shopping",  vi: "Mua sắm",   en: "Shopping",  emoji: "🛍️" },
  { id: "transport", vi: "Di chuyển", en: "Transport", emoji: "🚌" },
  { id: "health",    vi: "Sức khỏe",  en: "Health",    emoji: "💊" },
  { id: "bills",     vi: "Hóa đơn",   en: "Bills",     emoji: "📑" },
  { id: "leisure",   vi: "Giải trí",  en: "Leisure",   emoji: "🎮" },
  { id: "housing",   vi: "Nhà ở",     en: "Housing",   emoji: "🏠" },
  { id: "travel",    vi: "Du lịch",   en: "Travel",    emoji: "✈️" },
  { id: "other",     vi: "Khác",      en: "Other",     emoji: "💡" },
];

const INCOME_CATS: Category[] = [
  { id: "salary",    vi: "Lương",     en: "Salary",     emoji: "💼" },
  { id: "freelance", vi: "Freelance", en: "Freelance",  emoji: "🖥️" },
  { id: "invest",    vi: "Đầu tư",    en: "Investment", emoji: "📈" },
  { id: "gift",      vi: "Quà tặng",  en: "Gift",       emoji: "🎁" },
  { id: "bonus",     vi: "Thưởng",    en: "Bonus",      emoji: "🏆" },
  { id: "other_in",  vi: "Khác",      en: "Other",      emoji: "💡" },
];

// Mock spending per category — sẽ lấy từ API sau

const EMOJI_LIST = [
  "🍜","🍔","🍕","🍣","🍱","🥗","🍦","☕","🧃","🍺","🧁","🍎",
  "🛍️","👗","👟","💍","🧴","📦","🧸","👒","🎒","🛒",
  "🚗","🚕","🚌","🏍️","🚲","✈️","🚂","⛽","🛵","🚁",
  "💊","🏥","🧘","🏃","💉","🦷","🩺","🏋️","🧬","🩻",
  "📑","💡","🔌","💧","📱","🏠","📡","🔧","🔑","🛁",
  "🎮","🎬","🎵","📚","🎭","🎲","🎨","🎤","🎧","🎪",
  "🐕","🐈","🌱","🌸","🌊","🐾","🌿","🌻","🐠","🦜",
  "💼","💻","📊","📈","🏦","💳","💰","💵","🖥️","📋",
  "⭐","🔔","🎯","🏆","🎀","🌟","🔑","🎓","🚀","🌈","✨","📌","🎁","🎊",
];


// ─── Screen ───────────────────────────────────────────────────────────────────
export default function AddTransactionScreen() {
  const { lang } = useLanguage();
  const s = (vi: string, en: string) => lang === "vi" ? vi : en;
  // ── Page mode ──────────────────────────────────────────────────────────────
  const [pageMode, setPageMode] = useState<PageMode>("add");
  const [planMode, setPlanMode] = useState<PlanMode>("monthly");

  // ── Add-transaction states ─────────────────────────────────────────────────
  const [txType,      setTxType]      = useState<TxType>("expense");
  const [rawAmount,   setRawAmount]   = useState("");
  const [notes,       setNotes]       = useState("");
  const [selectedCat, setSelectedCat] = useState<string | null>(null);
  const [saving,      setSaving]      = useState(false);
  const [errorMsg,    setErrorMsg]    = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showCal,      setShowCal]      = useState(false);
  const [showOverModal, setShowOverModal] = useState(false);

  // ── Planning states ────────────────────────────────────────────────────────
  const [monthlyIncome,  setMonthlyIncome]  = useState("");
  const [monthlyBudget,  setMonthlyBudget]  = useState("");
  const [monthlySavings, setMonthlySavings] = useState("");
  const [otherPlan,      setOtherPlan]      = useState("");
  const [catBudgets,     setCatBudgets]     = useState<Record<string, string>>({});
  const [catNames,       setCatNames]       = useState<Record<string, string>>({});
  const [editingCatId,   setEditingCatId]   = useState<string | null>(null);
  const [renameCatId,    setRenameCatId]    = useState<string | null>(null);
  const [renameValue,    setRenameValue]    = useState("");
  const [customExpCats,  setCustomExpCats]  = useState<Category[]>([]);
  const [customIncCats,  setCustomIncCats]  = useState<Category[]>([]);
  const [showAddCat,     setShowAddCat]     = useState(false);
  const [showEmojiPicker,setShowEmojiPicker]= useState(false);
  const [addCatForType,  setAddCatForType]  = useState<TxType>("expense");
  const [newCatEmoji,    setNewCatEmoji]    = useState("");
  const [newCatName,     setNewCatName]     = useState("");
  const [planSaved,      setPlanSaved]      = useState(false);
  const [catSpent,       setCatSpent]       = useState<Record<string, number>>({});
  const [planLoading,    setPlanLoading]    = useState(false);
  const [planSaving,     setPlanSaving]     = useState(false);
  const [planError,      setPlanError]      = useState<string | null>(null);


  const planSavedAnim   = useRef(new Animated.Value(0)).current;
  const txSavedAnim     = useRef(new Animated.Value(0)).current;
  const [showTxSaved,   setShowTxSaved]   = useState(false);

  // ── Spending derived from real data ───────────────────────────────────────
  const emojiToCatId = useMemo(() => {
    const map: Record<string, string> = {};
    [...EXPENSE_CATS, ...customExpCats, ...INCOME_CATS, ...customIncCats]
      .forEach((c) => { map[c.emoji] = c.id; });
    return map;
  }, [customExpCats, customIncCats]);

  const catSpentById = useMemo(() => {
    const result: Record<string, number> = {};
    Object.entries(catSpent).forEach(([emoji, amount]) => {
      const id = emojiToCatId[emoji];
      if (id) result[id] = amount;
    });
    return result;
  }, [catSpent, emojiToCatId]);

  const totalSpent = useMemo(
    () => Object.values(catSpent).reduce((a, b) => a + b, 0),
    [catSpent],
  );

  // ── Derived budget info ────────────────────────────────────────────────────
  const budgetNum = parseInt(monthlyBudget.replace(/\D/g, ""), 10);
  const hasBudget = !isNaN(budgetNum) && budgetNum > 0;
  const budgetPct = hasBudget ? (totalSpent / budgetNum) * 100 : 0;
  const budgetStatus: "normal" | "warning" | "danger" =
    !hasBudget        ? "normal" :
    budgetPct >= 100  ? "danger" :
    budgetPct >= 80   ? "warning" : "normal";

  const statusColor = budgetStatus === "danger"  ? COLORS.danger  :
                      budgetStatus === "warning" ? COLORS.warning : COLORS.accent;

  // ── Date display ──────────────────────────────────────────────────────────
  const dateStr = selectedDate.toLocaleDateString(
    lang === "vi" ? "vi-VN" : "en-US",
    lang === "vi"
      ? { weekday: "long", day: "2-digit", month: "2-digit", year: "numeric" }
      : { weekday: "long", month: "short", day: "numeric", year: "numeric" },
  );
  const now = new Date();
  const monthLabel = s(
    `Tháng ${now.getMonth() + 1}, ${now.getFullYear()}`,
    now.toLocaleDateString("en-US", { month: "long", year: "numeric" }),
  );

  // ── Add transaction helpers ────────────────────────────────────────────────
  const cats          = txType === "expense" ? [...EXPENSE_CATS, ...customExpCats] : [...INCOME_CATS, ...customIncCats];
  const displayAmount = fmtVND(rawAmount);
  const canSubmit     = rawAmount.replace(/\D/g, "").length > 0 && selectedCat !== null && !saving;
  const isExpense     = txType === "expense";
  const typeColor     = isExpense ? COLORS.expense : COLORS.income;
  const typeBg        = isExpense ? COLORS.expenseBg : COLORS.incomeBg;

  const handleTypeSwitch = (t: TxType) => { setTxType(t); setSelectedCat(null); };

  const doSave = async () => {
    if (!selectedCat) return;
    const cat = cats.find((c) => c.id === selectedCat)!;
    try {
      setSaving(true);
      setShowOverModal(false);
      await api.createTransaction({
        type:     txType,
        amount:   Number(rawAmount.replace(/\D/g, "")),
        category: cat.emoji,
        catLabel: { vi: cat.vi, en: cat.en },
        note:     notes,
        date:     selectedDate.toISOString(),
      });
      setRawAmount("");
      setNotes("");
      setSelectedCat(null);
      setSelectedDate(new Date());
      triggerTxSaved();
    } catch (e: any) {
      setErrorMsg(e.message ?? "Lưu thất bại, thử lại.");
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = async () => {
    if (!canSubmit || !selectedCat) return;
    setErrorMsg(null);
    if (isExpense && hasBudget) {
      const newAmt = Number(rawAmount.replace(/\D/g, ""));
      if ((totalSpent + newAmt) / budgetNum >= 1) {
        setShowOverModal(true);
        return;
      }
    }
    await doSave();
  };

  const triggerPlanSaved = () => {
    setPlanSaved(true);
    Animated.sequence([
      Animated.timing(planSavedAnim, { toValue: 1, duration: 250, useNativeDriver: true }),
      Animated.delay(1800),
      Animated.timing(planSavedAnim, { toValue: 0, duration: 350, useNativeDriver: true }),
    ]).start(() => setPlanSaved(false));
  };

  const triggerTxSaved = () => {
    setShowTxSaved(true);
    Animated.sequence([
      Animated.timing(txSavedAnim, { toValue: 1, duration: 250, useNativeDriver: true }),
      Animated.delay(1800),
      Animated.timing(txSavedAnim, { toValue: 0, duration: 350, useNativeDriver: true }),
    ]).start(() => setShowTxSaved(false));
  };

  const fetchBudgetData = useCallback(async () => {
    try {
      setPlanLoading(true);
      setPlanError(null);
      const now  = new Date();
      const { plan, categorySpending } = await api.getBudgetData(
        now.getMonth() + 1, now.getFullYear(),
      );
      if (plan.monthlyIncome  > 0) setMonthlyIncome(String(plan.monthlyIncome));
      if (plan.monthlyBudget  > 0) setMonthlyBudget(String(plan.monthlyBudget));
      if (plan.monthlySavings > 0) setMonthlySavings(String(plan.monthlySavings));
      setOtherPlan(plan.otherPlan ?? "");
      const budgets: Record<string, string> = {};
      Object.entries(plan.categoryBudgets ?? {}).forEach(([k, v]) => {
        if (v > 0) budgets[k] = String(v);
      });
      setCatBudgets(budgets);
      setCatNames(plan.categoryNames ?? {});
      setCustomExpCats(
        (plan.customCategories ?? [])
          .filter((c) => c.type === "expense")
          .map(({ id, vi, en, emoji }) => ({ id, vi, en, emoji })),
      );
      setCustomIncCats(
        (plan.customCategories ?? [])
          .filter((c) => c.type === "income")
          .map(({ id, vi, en, emoji }) => ({ id, vi, en, emoji })),
      );
      setCatSpent(categorySpending ?? {});
    } catch (e: any) {
      setPlanError(e.message ?? s("Lỗi tải dữ liệu", "Failed to load data"));
    } finally {
      setPlanLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { fetchBudgetData(); }, [fetchBudgetData]));

  const doSavePlan = async () => {
    try {
      setPlanSaving(true);
      setPlanError(null);
      const now = new Date();
      await api.saveBudgetPlan({
        month: now.getMonth() + 1,
        year:  now.getFullYear(),
        monthlyIncome:  parseInt(monthlyIncome.replace(/\D/g, ""), 10)  || 0,
        monthlyBudget:  parseInt(monthlyBudget.replace(/\D/g, ""), 10)  || 0,
        monthlySavings: parseInt(monthlySavings.replace(/\D/g, ""), 10) || 0,
        otherPlan,
        categoryBudgets: Object.fromEntries(
          Object.entries(catBudgets).map(([k, v]) => [k, parseInt(v.replace(/\D/g, ""), 10) || 0]),
        ),
        categoryNames: catNames,
        customCategories: [
          ...customExpCats.map((c) => ({ ...c, type: "expense" as const })),
          ...customIncCats.map((c) => ({ ...c, type: "income"  as const })),
        ],
      });
      triggerPlanSaved();
    } catch (e: any) {
      setPlanError(e.message ?? s("Lưu thất bại", "Save failed"));
    } finally {
      setPlanSaving(false);
    }
  };

  // ── Category name helpers ─────────────────────────────────────────────────
  const getCatName = (cat: Category) => catNames[cat.id] || (lang === "vi" ? cat.vi : cat.en);

  const openRename = (cat: Category) => {
    setRenameValue(getCatName(cat));
    setRenameCatId(cat.id);
  };

  const saveRename = () => {
    if (renameCatId && renameValue.trim()) {
      setCatNames((p) => ({ ...p, [renameCatId]: renameValue.trim() }));
    }
    setRenameCatId(null);
  };

  const addCustomCat = () => {
    if (!newCatName.trim()) return;
    const emoji = newCatEmoji.trim() || "📌";
    const id    = `custom_${Date.now()}`;
    const cat: Category = { id, vi: newCatName.trim(), en: newCatName.trim(), emoji };
    if (addCatForType === "income") setCustomIncCats((p) => [...p, cat]);
    else                            setCustomExpCats((p) => [...p, cat]);
    setNewCatEmoji("");
    setNewCatName("");
    setShowAddCat(false);
  };

  // ── Category plan helpers ──────────────────────────────────────────────────
  const getCatPct = (id: string) => {
    const b = parseInt((catBudgets[id] ?? "").replace(/\D/g, ""), 10);
    if (isNaN(b) || b === 0) return -1;
    return (catSpentById[id] ?? 0) / b * 100;
  };
  const catBarColor = (pct: number) =>
    pct >= 100 ? COLORS.danger : pct >= 80 ? COLORS.warning : COLORS.accent;

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <View style={st.root}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.heroBg} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={st.scrollContent}
      >
        {/* ── HEADER ── */}
        <View style={st.header}>
          <View style={st.headerTop}>
            <Text style={st.headerSup}>
              {pageMode === "add" ? s("Thêm giao dịch", "Add Transaction") : s("Kế hoạch chi tiêu", "Spending Plan")}
            </Text>
            {/* Mode switcher */}
            <View style={st.modeSwitcher}>
              {(["add", "plan"] as PageMode[]).map((m) => (
                <TouchableOpacity
                  key={m}
                  style={[st.modeBtn, pageMode === m && st.modeBtnActive]}
                  onPress={() => setPageMode(m)}
                  activeOpacity={0.8}
                >
                  <Text style={[st.modeBtnTxt, pageMode === m && st.modeBtnTxtActive]}>
                    {m === "add" ? s("＋ Nhập", "+ Add") : s("📋 Kế hoạch", "📋 Plan")}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {pageMode === "add" ? (
            <TouchableOpacity style={st.headerDateBtn} onPress={() => setShowCal(true)} activeOpacity={0.75}>
              <Text style={st.headerDate}>{dateStr}</Text>
            </TouchableOpacity>
          ) : (
            <Text style={st.headerMonthTxt}>{monthLabel}</Text>
          )}
        </View>

        {/* ═══════════════════════ ADD MODE ═══════════════════════ */}
        {pageMode === "add" && (
          <>
            {errorMsg && (
              <View style={st.errorBanner}>
                <Text style={st.errorBannerText}>⚠️ {errorMsg}</Text>
              </View>
            )}

            {/* Type toggle */}
            <View style={st.card}>
              <Text style={st.fieldLabel}>{s("LOẠI GIAO DỊCH", "TRANSACTION TYPE")}</Text>
              <View style={st.toggleRow}>
                {TYPE_OPTIONS.map((opt) => {
                  const active = txType === opt.id;
                  return (
                    <TouchableOpacity
                      key={opt.id}
                      style={[st.toggleBtn, active && (opt.id === "income" ? st.toggleBtnIncome : st.toggleBtnExpense)]}
                      onPress={() => handleTypeSwitch(opt.id)}
                      activeOpacity={0.8}
                    >
                      <Text style={st.toggleEmoji}>{opt.emoji}</Text>
                      <Text style={[st.toggleLabel, active && st.toggleLabelActive]}>
                        {lang === "vi" ? opt.vi : opt.en}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Amount */}
            <View style={[st.card, st.amountCard]}>
              <Text style={st.fieldLabel}>{s("SỐ TIỀN", "AMOUNT")}</Text>
              <View style={[st.amountRow, { borderColor: typeColor + "55" }]}>
                <TextInput
                  style={[st.amountInput, { color: typeColor }]}
                  placeholder="0"
                  placeholderTextColor={COLORS.textMuted}
                  keyboardType="numeric"
                  value={displayAmount}
                  onChangeText={(t) => setRawAmount(t.replace(/\D/g, ""))}
                  maxLength={15}
                />
                <View style={[st.suffixBadge, { backgroundColor: typeBg }]}>
                  <Text style={[st.suffixText, { color: typeColor }]}>đ</Text>
                </View>
              </View>
              <Text style={st.quickLabel}>{s("Chọn nhanh", "Quick Select")}</Text>
              <View style={st.quickRow}>
                {[50_000, 100_000, 200_000, 500_000].map((val) => (
                  <TouchableOpacity key={val} style={st.quickChip} onPress={() => setRawAmount(String(val))} activeOpacity={0.75}>
                    <Text style={st.quickChipText}>{val.toLocaleString("vi-VN")} đ</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Notes */}
            <View style={st.card}>
              <Text style={st.fieldLabel}>
                {s("GHI CHÚ", "NOTES")}{" "}
                <Text style={st.optionalTag}>{s("(không bắt buộc)", "(optional)")}</Text>
              </Text>
              <TextInput
                style={st.notesInput}
                placeholder={s("VD: Ăn trưa với đồng nghiệp", "E.g. Lunch with colleagues")}
                placeholderTextColor={COLORS.textMuted}
                value={notes}
                onChangeText={setNotes}
                multiline
                numberOfLines={2}
              />
            </View>

            {/* Category grid */}
            <View style={st.card}>
              <Text style={st.fieldLabel}>{s("DANH MỤC", "CATEGORY")}</Text>
              <View style={st.catGrid}>
                {cats.map((cat) => {
                  const active = selectedCat === cat.id;
                  return (
                    <TouchableOpacity
                      key={cat.id}
                      style={[st.catCell, active && st.catCellActive]}
                      onPress={() => setSelectedCat(active ? null : cat.id)}
                      activeOpacity={0.75}
                    >
                      <Text style={st.catEmoji}>{cat.emoji}</Text>
                      <Text style={[st.catLabel, active && st.catLabelActive]} numberOfLines={1}>
                        {getCatName(cat)}
                      </Text>
                      {cat.id !== "other" && cat.id !== "other_in" && (
                        <TouchableOpacity
                          style={st.catRenameBtn}
                          onPress={() => openRename(cat)}
                          activeOpacity={0.8}
                          hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
                        >
                          <Text style={[st.catRenameIcon, active && { opacity: 0.6 }]}>✏️</Text>
                        </TouchableOpacity>
                      )}
                    </TouchableOpacity>
                  );
                })}
                {/* Add new category cell */}
                <TouchableOpacity
                  style={st.catAddCell}
                  onPress={() => { setAddCatForType(txType); setShowAddCat(true); }}
                  activeOpacity={0.75}
                >
                  <Text style={st.catAddIcon}>＋</Text>
                  <Text style={st.catAddLabel} numberOfLines={1}>
                    {s("Thêm mới", "Add New")}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Submit */}
            <View style={st.submitArea}>
              <TouchableOpacity
                style={[st.submitBtn, { backgroundColor: canSubmit ? COLORS.heroBg : "#C8D8D4" }]}
                onPress={handleSubmit}
                activeOpacity={0.85}
                disabled={!canSubmit}
              >
                {saving
                  ? <ActivityIndicator color="#FFFFFF" />
                  : <Text style={st.submitBtnText}>
                      {isExpense ? s("＋ Lưu chi tiêu", "＋ Save Expense") : s("＋ Lưu thu nhập", "＋ Save Income")}
                    </Text>}
              </TouchableOpacity>
              <Text style={st.submitHint}>
                {!rawAmount
                  ? s("Vui lòng nhập số tiền", "Please enter an amount")
                  : !selectedCat
                    ? s("Vui lòng chọn danh mục", "Please select a category")
                    : s("Sẵn sàng lưu ✓", "Ready to save ✓")}
              </Text>
            </View>
          </>
        )}

        {/* ═══════════════════════ PLAN MODE ═══════════════════════ */}
        {pageMode === "plan" && (
          <>
            {/* Loading overlay */}
            {planLoading && (
              <View style={{ alignItems: "center", paddingVertical: SP.xl }}>
                <ActivityIndicator color={COLORS.accent} size="large" />
                <Text style={[st.submitHint, { marginTop: SP.sm }]}>
                  {s("Đang tải...", "Loading...")}
                </Text>
              </View>
            )}

            {/* Plan error */}
            {planError && !planLoading && (
              <View style={st.errorBanner}>
                <Text style={st.errorBannerText}>⚠️ {planError}</Text>
              </View>
            )}

            {/* Plan sub-tabs */}
            <View style={st.planTabRow}>
              {(["monthly", "category"] as PlanMode[]).map((m) => (
                <TouchableOpacity
                  key={m}
                  style={[st.planTab, planMode === m && st.planTabActive]}
                  onPress={() => setPlanMode(m)}
                  activeOpacity={0.8}
                >
                  <Text style={[st.planTabTxt, planMode === m && st.planTabTxtActive]}>
                    {m === "monthly" ? s("🗓️  Cả tháng", "🗓️  Monthly") : s("🏷️  Theo hạng mục", "🏷️  By Category")}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* ── MONTHLY PLAN ── */}
            {planMode === "monthly" && (
              <>
                {/* Income */}
                <View style={st.card}>
                  <Text style={st.fieldLabel}>{s("THU NHẬP DỰ KIẾN", "EXPECTED INCOME")}</Text>
                  <View style={st.planInputRow}>
                    <TextInput
                      style={st.planInput}
                      placeholder="0"
                      placeholderTextColor={COLORS.textMuted}
                      keyboardType="numeric"
                      value={fmtVND(monthlyIncome)}
                      onChangeText={(t) => setMonthlyIncome(t.replace(/\D/g, ""))}
                    />
                    <Text style={st.planSuffix}>đ</Text>
                  </View>
                </View>

                {/* Expense budget */}
                <View style={st.card}>
                  <Text style={st.fieldLabel}>{s("HẠN MỨC CHI TIÊU", "EXPENSE BUDGET")}</Text>
                  <View style={st.planInputRow}>
                    <TextInput
                      style={st.planInput}
                      placeholder="0"
                      placeholderTextColor={COLORS.textMuted}
                      keyboardType="numeric"
                      value={fmtVND(monthlyBudget)}
                      onChangeText={(t) => setMonthlyBudget(t.replace(/\D/g, ""))}
                    />
                    <Text style={st.planSuffix}>đ</Text>
                  </View>

                  {hasBudget && (
                    <View style={{ marginTop: SP.md }}>
                      <View style={st.progressTrack}>
                        <View style={[st.progressFill, { width: `${Math.min(budgetPct, 100)}%` as any, backgroundColor: statusColor }]} />
                      </View>
                      <View style={st.progressRow}>
                        <Text style={st.progressLeft}>{s("Đã chi", "Spent")}: {fmtNum(totalSpent)}</Text>
                        <Text style={[st.progressRight, { color: statusColor }]}>{Math.round(budgetPct)}%</Text>
                      </View>

                    </View>
                  )}
                </View>

                {/* Savings */}
                <View style={st.card}>
                  <Text style={st.fieldLabel}>{s("MỤC TIÊU TIẾT KIỆM", "SAVINGS GOAL")}</Text>
                  <View style={st.planInputRow}>
                    <TextInput
                      style={st.planInput}
                      placeholder="0"
                      placeholderTextColor={COLORS.textMuted}
                      keyboardType="numeric"
                      value={fmtVND(monthlySavings)}
                      onChangeText={(t) => setMonthlySavings(t.replace(/\D/g, ""))}
                    />
                    <Text style={st.planSuffix}>đ</Text>
                  </View>
                </View>

                {/* Other */}
                <View style={st.card}>
                  <Text style={st.fieldLabel}>
                    {s("KẾ HOẠCH KHÁC", "OTHER PLANS")}{" "}
                    <Text style={st.optionalTag}>{s("(không bắt buộc)", "(optional)")}</Text>
                  </Text>
                  <TextInput
                    style={st.notesInput}
                    placeholder={s("VD: Mua xe cuối tháng, trả học phí...", "E.g. Buy car, pay tuition...")}
                    placeholderTextColor={COLORS.textMuted}
                    value={otherPlan}
                    onChangeText={setOtherPlan}
                    multiline
                    numberOfLines={3}
                  />
                </View>

                {/* Allocation visual — only when income + budget set */}
                {hasBudget && monthlyIncome.replace(/\D/g, "").length > 0 && (() => {
                  const inc  = parseInt(monthlyIncome.replace(/\D/g, ""), 10) || 1;
                  const bud  = budgetNum;
                  const sav  = parseInt(monthlySavings.replace(/\D/g, ""), 10) || 0;
                  const rest = Math.max(inc - bud - sav, 0);
                  const pB = Math.round(bud  / inc * 100);
                  const pS = Math.round(sav  / inc * 100);
                  const pR = Math.round(rest / inc * 100);
                  return (
                    <View style={st.card}>
                      <Text style={st.fieldLabel}>{s("PHÂN BỔ NGÂN SÁCH", "BUDGET ALLOCATION")}</Text>
                      <View style={st.allocBar}>
                        {pB > 0 && <View style={[st.allocSeg, { flex: pB, backgroundColor: COLORS.expense }]} />}
                        {pS > 0 && <View style={[st.allocSeg, { flex: pS, backgroundColor: COLORS.income }]} />}
                        {pR > 0 && <View style={[st.allocSeg, { flex: pR, backgroundColor: "#B0C4BE" }]} />}
                      </View>
                      <View style={st.allocLegend}>
                        {pB > 0 && (
                          <View style={st.allocItem}>
                            <View style={[st.allocDot, { backgroundColor: COLORS.expense }]} />
                            <Text style={st.allocTxt}>{s("Chi tiêu", "Spending")} {pB}%</Text>
                          </View>
                        )}
                        {pS > 0 && (
                          <View style={st.allocItem}>
                            <View style={[st.allocDot, { backgroundColor: COLORS.income }]} />
                            <Text style={st.allocTxt}>{s("Tiết kiệm", "Savings")} {pS}%</Text>
                          </View>
                        )}
                        {pR > 0 && (
                          <View style={st.allocItem}>
                            <View style={[st.allocDot, { backgroundColor: "#B0C4BE" }]} />
                            <Text style={st.allocTxt}>{s("Khác", "Other")} {pR}%</Text>
                          </View>
                        )}
                      </View>
                    </View>
                  );
                })()}

                <View style={st.submitArea}>
                  <TouchableOpacity
                    style={[st.submitBtn, { backgroundColor: COLORS.heroBg, opacity: planSaving ? 0.7 : 1 }]}
                    onPress={doSavePlan}
                    activeOpacity={0.85}
                    disabled={planSaving}
                  >
                    {planSaving
                      ? <ActivityIndicator color="#fff" />
                      : <Text style={st.submitBtnText}>{s("💾  Lưu kế hoạch", "💾  Save Plan")}</Text>}
                  </TouchableOpacity>
                </View>
              </>
            )}

            {/* ── CATEGORY PLAN ── */}
            {planMode === "category" && (
              <>
                <View style={[st.card, { paddingBottom: SP.sm }]}>
                  <Text style={st.fieldLabel}>{s("HẠN MỨC TỪNG HẠNG MỤC", "BUDGET PER CATEGORY")}</Text>
                  <Text style={[st.optionalTag, { marginBottom: SP.md }]}>
                    {s("Bỏ trống để không đặt hạn mức", "Leave blank to set no limit")}
                  </Text>

                  {[...EXPENSE_CATS, ...customExpCats].map((cat, idx, arr) => {
                    const pct      = getCatPct(cat.id);
                    const spent    = catSpentById[cat.id] ?? 0;
                    const hasLimit = pct >= 0;
                    const barClr   = catBarColor(pct);
                    const budNum2  = parseInt((catBudgets[cat.id] ?? "").replace(/\D/g, ""), 10) || 0;
                    const isLast   = idx === arr.length - 1;

                    return (
                      <View key={cat.id} style={[st.catPlanRow, isLast && { borderBottomWidth: 0 }]}>
                        <Text style={st.catPlanEmoji}>{cat.emoji}</Text>
                        <View style={{ flex: 1, marginRight: SP.sm }}>
                          <View style={st.catNameRow}>
                            {editingCatId === cat.id ? (
                              <>
                                <TextInput
                                  style={st.catNameInput}
                                  value={catNames[cat.id] ?? (lang === "vi" ? cat.vi : cat.en)}
                                  onChangeText={(t) => setCatNames((p) => ({ ...p, [cat.id]: t }))}
                                  onBlur={() => setEditingCatId(null)}
                                  autoFocus
                                />
                                <TouchableOpacity onPress={() => setEditingCatId(null)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                                  <Text style={st.catEditConfirm}>✓</Text>
                                </TouchableOpacity>
                              </>
                            ) : (
                              <>
                                <Text style={st.catPlanName} numberOfLines={1}>
                                  {catNames[cat.id] || (lang === "vi" ? cat.vi : cat.en)}
                                </Text>
                                {cat.id !== "other" && cat.id !== "other_in" && (
                                  <TouchableOpacity
                                    onPress={() => {
                                      setCatNames((p) => ({ ...p, [cat.id]: p[cat.id] ?? (lang === "vi" ? cat.vi : cat.en) }));
                                      setEditingCatId(cat.id);
                                    }}
                                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                                  >
                                    <Text style={st.catEditIcon}>✏️</Text>
                                  </TouchableOpacity>
                                )}
                              </>
                            )}
                          </View>
                          {hasLimit && (
                            <>
                              <View style={st.catTrack}>
                                <View style={[st.catFill, { width: `${Math.min(pct, 100)}%` as any, backgroundColor: barClr }]} />
                              </View>
                              <Text style={st.catProgressTxt}>
                                {fmtNum(spent)} / {fmtNum(budNum2)}
                              </Text>
                            </>
                          )}
                        </View>
                        <View style={st.catInputWrap}>
                          <TextInput
                            style={st.catInput}
                            placeholder="0"
                            placeholderTextColor={COLORS.textMuted}
                            keyboardType="numeric"
                            value={fmtVND(catBudgets[cat.id] ?? "")}
                            onChangeText={(t) => setCatBudgets((p) => ({ ...p, [cat.id]: t.replace(/\D/g, "") }))}
                          />
                          <Text style={st.catInputSuffix}>đ</Text>
                        </View>
                      </View>
                    );
                  })}

                  {/* Add new category row */}
                  <TouchableOpacity
                    style={st.addCatRow}
                    onPress={() => { setAddCatForType("expense"); setShowAddCat(true); }}
                    activeOpacity={0.75}
                  >
                    <Text style={st.addCatRowIcon}>＋</Text>
                    <Text style={st.addCatRowTxt}>{s("Thêm hạng mục mới", "Add New Category")}</Text>
                  </TouchableOpacity>
                </View>

                <View style={st.submitArea}>
                  <TouchableOpacity
                    style={[st.submitBtn, { backgroundColor: COLORS.heroBg, opacity: planSaving ? 0.7 : 1 }]}
                    onPress={doSavePlan}
                    activeOpacity={0.85}
                    disabled={planSaving}
                  >
                    {planSaving
                      ? <ActivityIndicator color="#fff" />
                      : <Text style={st.submitBtnText}>{s("💾  Lưu kế hoạch", "💾  Save Plan")}</Text>}
                  </TouchableOpacity>
                </View>
              </>
            )}
          </>
        )}

        <View style={{ height: SP.xxl }} />
      </ScrollView>

      {/* ── Calendar modal ── */}
      <CalendarModal
        visible={showCal}
        selectedDate={selectedDate}
        onSelectDate={(d) => { setSelectedDate(d); setShowCal(false); }}
        onClose={() => setShowCal(false)}
        txDates={[]}
      />

      {/* ── Rename category modal ── */}
      <Modal visible={renameCatId !== null} transparent animationType="fade">
        <TouchableOpacity style={st.modalOverlay} activeOpacity={1} onPress={() => setRenameCatId(null)}>
          <TouchableOpacity style={st.modalCard} activeOpacity={1}>
            <Text style={st.modalTitle}>{s("Đổi tên danh mục", "Rename Category")}</Text>
            <TextInput
              style={st.renameInput}
              value={renameValue}
              onChangeText={setRenameValue}
              autoFocus
              maxLength={20}
              selectTextOnFocus
            />
            <View style={st.renameModalRow}>
              <TouchableOpacity style={[st.modalCancel, { flex: 1 }]} onPress={() => setRenameCatId(null)} activeOpacity={0.8}>
                <Text style={st.modalCancelTxt}>{s("Hủy", "Cancel")}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[st.modalConfirm, { flex: 1, backgroundColor: COLORS.heroBg }]} onPress={saveRename} activeOpacity={0.8}>
                <Text style={st.modalConfirmTxt}>{s("Lưu", "Save")}</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* ── Add category modal ── */}
      <Modal visible={showAddCat} transparent animationType="fade">
        <TouchableOpacity style={st.modalOverlay} activeOpacity={1} onPress={() => setShowAddCat(false)}>
          <TouchableOpacity style={st.modalCard} activeOpacity={1}>
            <Text style={st.modalTitle}>{s("Thêm danh mục mới", "Add New Category")}</Text>
            <Text style={[st.fieldLabel, { alignSelf: "flex-start" }]}>{s("BIỂU TƯỢNG (EMOJI)", "EMOJI ICON")}</Text>
            <TouchableOpacity
              style={st.emojiPickerBtn}
              onPress={() => setShowEmojiPicker((v) => !v)}
              activeOpacity={0.8}
            >
              <Text style={st.emojiPickerBtnEmoji}>{newCatEmoji || "📌"}</Text>
              <Text style={st.emojiPickerBtnLabel}>
                {newCatEmoji ? s("Đổi biểu tượng", "Change icon") : s("Chọn biểu tượng", "Choose icon")}
              </Text>
              <Text style={st.emojiPickerChevron}>{showEmojiPicker ? "▲" : "▼"}</Text>
            </TouchableOpacity>
            {showEmojiPicker && (
              <ScrollView
                style={st.emojiGrid}
                contentContainerStyle={st.emojiGridContent}
                showsVerticalScrollIndicator={false}
              >
                {EMOJI_LIST.map((emoji) => (
                  <TouchableOpacity
                    key={emoji}
                    style={[st.emojiCell, newCatEmoji === emoji && st.emojiCellActive]}
                    onPress={() => { setNewCatEmoji(emoji); setShowEmojiPicker(false); }}
                    activeOpacity={0.7}
                  >
                    <Text style={st.emojiCellTxt}>{emoji}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}
            <Text style={[st.fieldLabel, { alignSelf: "flex-start" }]}>{s("TÊN DANH MỤC", "CATEGORY NAME")}</Text>
            <TextInput
              style={st.renameInput}
              value={newCatName}
              onChangeText={setNewCatName}
              placeholder={s("VD: Thú cưng", "E.g. Pets")}
              placeholderTextColor={COLORS.textMuted}
              autoFocus
              maxLength={20}
            />
            <View style={st.renameModalRow}>
              <TouchableOpacity style={[st.modalCancel, { flex: 1 }]} onPress={() => setShowAddCat(false)} activeOpacity={0.8}>
                <Text style={st.modalCancelTxt}>{s("Hủy", "Cancel")}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[st.modalConfirm, { flex: 1, backgroundColor: COLORS.heroBg }]} onPress={addCustomCat} activeOpacity={0.8}>
                <Text style={st.modalConfirmTxt}>{s("Thêm", "Add")}</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* ── Overbudget warning modal ── */}
      <Modal visible={showOverModal} transparent animationType="fade">
        <View style={st.modalOverlay}>
          <View style={st.modalCard}>
            <Text style={st.modalEmoji}>😱</Text>
            <Text style={st.modalTitle}>{s("Vượt kế hoạch!", "Over Budget!")}</Text>
            <Text style={st.modalBody}>
              {s(
                "Khoản chi này sẽ làm bạn 'vỡ kế hoạch' tháng này mất rồi! Bạn có chắc chắn vẫn muốn ghi lại không?",
                "This expense will blow your monthly budget! Are you sure you still want to record it?",
              )}
            </Text>
            <TouchableOpacity style={st.modalCancel} onPress={() => setShowOverModal(false)} activeOpacity={0.8}>
              <Text style={st.modalCancelTxt}>{s("Hủy khoản chi", "Cancel Expense")}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={st.modalConfirm} onPress={doSave} activeOpacity={0.8}>
              {saving
                ? <ActivityIndicator color="#fff" />
                : <Text style={st.modalConfirmTxt}>{s("Vẫn tiếp tục ghi", "Record Anyway")}</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ── Transaction saved toast ── */}
      {showTxSaved && (
        <Animated.View style={[st.toast, { opacity: txSavedAnim }]}>
          <Text style={st.toastEmoji}>✓</Text>
          <View>
            <Text style={st.toastTitle}>{s("Đã ghi thành công!", "Saved successfully!")}</Text>
            <Text style={st.toastSub}>{s("Giao dịch đã được lưu lại", "Your transaction has been recorded")}</Text>
          </View>
        </Animated.View>
      )}

      {/* ── Plan saved toast ── */}
      {planSaved && (
        <Animated.View style={[st.toast, { opacity: planSavedAnim }]}>
          <Text style={st.toastEmoji}>✓</Text>
          <View>
            <Text style={st.toastTitle}>{s("Đã lưu kế hoạch!", "Plan saved!")}</Text>
            <Text style={st.toastSub}>{s("Kế hoạch đã được cập nhật", "Your plan has been updated")}</Text>
          </View>
        </Animated.View>
      )}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const st = StyleSheet.create({
  root:          { flex: 1, backgroundColor: COLORS.pageBg },
  scrollContent: { paddingBottom: 120 },

  // Header
  header: {
    backgroundColor: COLORS.heroBg,
    paddingTop: Platform.OS === "ios" ? 58 : 46,
    paddingHorizontal: SP.lg, paddingBottom: SP.xl,
    borderBottomLeftRadius: R.xl, borderBottomRightRadius: R.xl,
  },
  headerTop:      { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: SP.sm },
  headerSup:      { fontSize: 13, color: COLORS.textOnDarkMuted, fontWeight: "500", letterSpacing: 0.3, flex: 1, marginRight: SP.sm },
  headerDateBtn:  { alignSelf: "flex-start", flexDirection: "row", alignItems: "center", backgroundColor: "rgba(255,255,255,0.12)", borderRadius: 999, paddingHorizontal: SP.md, paddingVertical: SP.xs + 2 },
  headerDate:     { fontSize: 12, fontWeight: "500", color: COLORS.textOnDarkMuted },
  headerMonthTxt: { fontSize: 14, fontWeight: "700", color: COLORS.textOnDark, marginTop: SP.xs },

  // Mode switcher
  modeSwitcher:    { flexDirection: "row", backgroundColor: "rgba(255,255,255,0.1)", borderRadius: 999, padding: 3 },
  modeBtn:         { paddingHorizontal: SP.md, paddingVertical: SP.xs + 2, borderRadius: 999 },
  modeBtnActive:   { backgroundColor: COLORS.accent },
  modeBtnTxt:      { fontSize: 11, fontWeight: "600", color: COLORS.textOnDarkMuted },
  modeBtnTxtActive:{ color: COLORS.heroBg },

  // Banners
  banner:        { marginHorizontal: SP.md, marginTop: SP.md, borderRadius: R.md, padding: SP.md, borderWidth: 1 },
  bannerWarning: { backgroundColor: COLORS.warningBg, borderColor: COLORS.warningBorder },
  bannerDanger:  { backgroundColor: COLORS.dangerBg,  borderColor: COLORS.dangerBorder },
  bannerTxt:     { fontSize: 13, fontWeight: "600", lineHeight: 18 },

  errorBanner:     { backgroundColor: "#FFF0F0", marginHorizontal: SP.md, marginTop: SP.md, borderRadius: R.md, padding: SP.md, borderWidth: 1, borderColor: "#FFBCBC" },
  errorBannerText: { fontSize: 13, fontWeight: "600", color: COLORS.expenseText },

  // Card
  card:       { backgroundColor: COLORS.cardBg, marginHorizontal: SP.md, marginTop: SP.md, borderRadius: R.lg, padding: SP.lg, shadowColor: COLORS.shadow, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 3 },
  fieldLabel: { fontSize: 12, fontWeight: "700", color: COLORS.textSecondary, letterSpacing: 0.3, marginBottom: SP.md, lineHeight: 18 },
  optionalTag:{ fontSize: 11, fontWeight: "400", color: COLORS.textMuted },

  // Type toggle
  toggleRow:         { flexDirection: "row", gap: SP.sm },
  toggleBtn:         { flex: 1, alignItems: "center", paddingVertical: SP.md, borderRadius: R.md, backgroundColor: "#F0F5F3", gap: SP.xs, borderWidth: 2, borderColor: "transparent" },
  toggleBtnExpense:  { backgroundColor: COLORS.expenseBg,  borderColor: COLORS.expenseBorder },
  toggleBtnIncome:   { backgroundColor: COLORS.incomeBg,   borderColor: COLORS.incomeBorder },
  toggleEmoji:       { fontSize: 22 },
  toggleLabel:       { fontSize: 14, fontWeight: "700", color: COLORS.textSecondary },
  toggleLabelActive: { color: COLORS.textPrimary },

  // Amount
  amountCard:    { paddingBottom: SP.md },
  amountRow:     { flexDirection: "row", alignItems: "center", backgroundColor: COLORS.inputBg, borderRadius: R.md, paddingLeft: SP.md, paddingRight: SP.sm, marginBottom: SP.md, borderWidth: 2 },
  amountInput:   { flex: 1, fontSize: 34, fontWeight: "800", paddingVertical: SP.md, letterSpacing: -0.5 },
  suffixBadge:   { paddingHorizontal: SP.sm + 4, paddingVertical: SP.sm, borderRadius: R.sm, marginLeft: SP.sm },
  suffixText:    { fontSize: 20, fontWeight: "800" },
  quickLabel:    { fontSize: 11, fontWeight: "600", color: COLORS.textMuted, marginBottom: SP.sm, letterSpacing: 0.2 },
  quickRow:      { flexDirection: "row", flexWrap: "wrap", gap: SP.sm },
  quickChip:     { paddingHorizontal: SP.sm + 4, paddingVertical: SP.xs + 2, borderRadius: R.xl, backgroundColor: "#F0F5F3", borderWidth: 1, borderColor: COLORS.border },
  quickChipText: { fontSize: 12, fontWeight: "600", color: COLORS.textSecondary },

  notesInput: { backgroundColor: COLORS.inputBg, borderRadius: R.md, paddingHorizontal: SP.md, paddingTop: SP.md, paddingBottom: SP.md, fontSize: 14, color: COLORS.textPrimary, borderWidth: 1.5, borderColor: COLORS.border, minHeight: 72, textAlignVertical: "top" },

  // Category grid (add mode)
  catGrid:        { flexDirection: "row", flexWrap: "wrap", gap: SP.sm },
  catCell:        { width: "30.5%", alignItems: "center", paddingVertical: SP.md, paddingHorizontal: SP.xs, borderRadius: R.md, backgroundColor: COLORS.catInactiveBg, borderWidth: 2, borderColor: "transparent" },
  catCellActive:  { backgroundColor: COLORS.catActiveBg, borderColor: COLORS.heroBg },
  catEmoji:       { fontSize: 22, marginBottom: SP.xs },
  catLabel:       { fontSize: 12, fontWeight: "700", color: COLORS.catInactiveText, textAlign: "center" },
  catLabelActive: { color: "#FFFFFF" },

  // Submit
  submitArea:    { paddingHorizontal: SP.md, marginTop: SP.md, alignItems: "center" },
  submitBtn:     { width: "100%", borderRadius: R.md, paddingVertical: SP.md + 2, alignItems: "center", shadowColor: COLORS.heroBg, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 10, elevation: 5 },
  submitBtnText: { color: "#FFFFFF", fontSize: 16, fontWeight: "800", letterSpacing: 0.2 },
  submitHint:    { marginTop: SP.sm, fontSize: 11, color: COLORS.textMuted, fontWeight: "500", textAlign: "center", lineHeight: 16 },

  // Plan tabs
  planTabRow:      { flexDirection: "row", gap: SP.sm, marginHorizontal: SP.md, marginTop: SP.md },
  planTab:         { flex: 1, alignItems: "center", paddingVertical: SP.sm + 2, borderRadius: R.md, backgroundColor: COLORS.cardBg, borderWidth: 1.5, borderColor: COLORS.border },
  planTabActive:   { backgroundColor: COLORS.heroBg, borderColor: COLORS.heroBg },
  planTabTxt:      { fontSize: 12, fontWeight: "600", color: COLORS.textSecondary },
  planTabTxtActive:{ color: COLORS.textOnDark },

  // Plan inputs
  planInputRow: { flexDirection: "row", alignItems: "center", backgroundColor: COLORS.inputBg, borderRadius: R.md, paddingLeft: SP.md, paddingRight: SP.sm, borderWidth: 1.5, borderColor: COLORS.border },
  planInput:    { flex: 1, fontSize: 26, fontWeight: "800", paddingVertical: SP.md, color: COLORS.textPrimary },
  planSuffix:   { fontSize: 16, fontWeight: "700", color: COLORS.textMuted, paddingRight: SP.sm },

  // Progress (monthly plan)
  progressTrack: { height: 8, backgroundColor: COLORS.border, borderRadius: 999, overflow: "hidden", marginTop: SP.sm },
  progressFill:  { height: "100%", borderRadius: 999 },
  progressRow:   { flexDirection: "row", justifyContent: "space-between", marginTop: SP.xs },
  progressLeft:  { fontSize: 12, color: COLORS.textSecondary, fontWeight: "500" },
  progressRight: { fontSize: 12, fontWeight: "700" },
  statusChip:    { marginTop: SP.sm, alignSelf: "flex-start", borderRadius: R.sm, paddingHorizontal: SP.sm, paddingVertical: SP.xs + 1 },
  statusChipTxt: { fontSize: 12, fontWeight: "700" },

  // Allocation bar
  allocBar:    { height: 14, flexDirection: "row", borderRadius: 999, overflow: "hidden", marginBottom: SP.sm },
  allocSeg:    { height: "100%" },
  allocLegend: { flexDirection: "row", flexWrap: "wrap", gap: SP.sm },
  allocItem:   { flexDirection: "row", alignItems: "center", gap: SP.xs },
  allocDot:    { width: 8, height: 8, borderRadius: 4 },
  allocTxt:    { fontSize: 12, color: COLORS.textSecondary, fontWeight: "500" },

  // Category plan rows
  catPlanRow:      { flexDirection: "row", alignItems: "center", paddingVertical: SP.sm + 2, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  catPlanEmoji:    { fontSize: 20, marginRight: SP.sm, marginTop: 2 },
  catNameRow:      { flexDirection: "row", alignItems: "center", gap: SP.xs, marginBottom: 4 },
  catPlanName:     { fontSize: 13, fontWeight: "600", color: COLORS.textPrimary, flexShrink: 1 },
  catNameInput:    { flex: 1, fontSize: 13, fontWeight: "600", color: COLORS.textPrimary, backgroundColor: COLORS.inputBg, borderRadius: R.sm, paddingHorizontal: SP.sm, paddingVertical: 2, borderWidth: 1.5, borderColor: COLORS.accent },
  catEditIcon:     { fontSize: 11 },
  catEditConfirm:  { fontSize: 14, color: COLORS.accent, fontWeight: "800", paddingLeft: SP.xs },
  catRenameBtn:    { marginTop: SP.xs - 2, padding: 2 },
  catRenameIcon:   { fontSize: 10 },
  catAddCell:      { width: "30.5%", alignItems: "center", paddingVertical: SP.md, paddingHorizontal: SP.xs, borderRadius: R.md, backgroundColor: COLORS.inputBg, borderWidth: 2, borderColor: COLORS.border, borderStyle: "dashed" },
  catAddIcon:      { fontSize: 20, color: COLORS.textMuted, marginBottom: SP.xs },
  catAddLabel:     { fontSize: 12, fontWeight: "600", color: COLORS.textMuted, textAlign: "center" },
  addCatRow:       { flexDirection: "row", alignItems: "center", paddingVertical: SP.md, gap: SP.sm, borderTopWidth: 1, borderTopColor: COLORS.border, marginTop: SP.xs },
  addCatRowIcon:   { fontSize: 16, color: COLORS.accent, fontWeight: "700" },
  addCatRowTxt:    { fontSize: 14, fontWeight: "600", color: COLORS.accent },
  renameInput:        { width: "100%", fontSize: 16, fontWeight: "600", color: COLORS.textPrimary, backgroundColor: COLORS.inputBg, borderRadius: R.md, paddingHorizontal: SP.md, paddingVertical: SP.sm + 2, borderWidth: 1.5, borderColor: COLORS.accent, marginBottom: SP.md, textAlign: "center" },
  renameModalRow:     { flexDirection: "row", gap: SP.sm, width: "100%" },
  emojiPickerBtn:     { flexDirection: "row", alignItems: "center", width: "100%", backgroundColor: COLORS.inputBg, borderRadius: R.md, paddingHorizontal: SP.md, paddingVertical: SP.sm + 2, borderWidth: 1.5, borderColor: COLORS.border, marginBottom: SP.sm, gap: SP.sm },
  emojiPickerBtnEmoji:{ fontSize: 26 },
  emojiPickerBtnLabel:{ flex: 1, fontSize: 13, fontWeight: "600", color: COLORS.textSecondary },
  emojiPickerChevron: { fontSize: 10, color: COLORS.textMuted },
  emojiGrid:          { width: "100%", maxHeight: 180, marginBottom: SP.md, borderRadius: R.md, backgroundColor: COLORS.inputBg, borderWidth: 1, borderColor: COLORS.border },
  emojiGridContent:   { flexDirection: "row", flexWrap: "wrap", padding: SP.sm, gap: 2 },
  emojiCell:          { width: 40, height: 40, alignItems: "center", justifyContent: "center", borderRadius: R.sm },
  emojiCellActive:    { backgroundColor: "#E6FAF4", borderWidth: 2, borderColor: COLORS.accent },
  emojiCellTxt:       { fontSize: 22 },
  catTrack:        { height: 4, backgroundColor: COLORS.border, borderRadius: 999, overflow: "hidden" },
  catFill:         { height: "100%", borderRadius: 999 },
  catProgressTxt:  { fontSize: 10, marginTop: 2, fontWeight: "500", color: COLORS.textMuted },
  catInputWrap:    { flexDirection: "row", alignItems: "center", gap: 4 },
  catInput:        { width: 90, fontSize: 13, fontWeight: "700", color: COLORS.textPrimary, backgroundColor: COLORS.inputBg, borderRadius: R.sm, paddingHorizontal: SP.sm, paddingVertical: SP.xs + 2, borderWidth: 1.5, borderColor: COLORS.border, textAlign: "right" },
  catInputSuffix:  { fontSize: 12, color: COLORS.textMuted, fontWeight: "600" },

  // Overbudget modal
  modalOverlay:   { flex: 1, backgroundColor: "rgba(0,0,0,0.55)", justifyContent: "center", alignItems: "center", padding: SP.lg },
  modalCard:      { backgroundColor: COLORS.cardBg, borderRadius: R.xl, padding: SP.xl, alignItems: "center", width: "100%", shadowColor: "#000", shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.25, shadowRadius: 20, elevation: 20 },
  modalEmoji:     { fontSize: 44, marginBottom: SP.md },
  modalTitle:     { fontSize: 20, fontWeight: "800", color: COLORS.textPrimary, marginBottom: SP.sm, textAlign: "center" },
  modalBody:      { fontSize: 14, color: COLORS.textSecondary, textAlign: "center", lineHeight: 22, marginBottom: SP.lg },
  modalCancel:    { width: "100%", paddingVertical: SP.md, borderRadius: R.md, backgroundColor: COLORS.inputBg, alignItems: "center", marginBottom: SP.sm },
  modalCancelTxt: { fontSize: 15, fontWeight: "700", color: COLORS.textSecondary },
  modalConfirm:   { width: "100%", paddingVertical: SP.md, borderRadius: R.md, backgroundColor: COLORS.danger, alignItems: "center" },
  modalConfirmTxt:{ fontSize: 15, fontWeight: "800", color: "#FFFFFF" },

  // Toast
  toast:      { position: "absolute", bottom: 100, left: SP.lg, right: SP.lg, backgroundColor: COLORS.heroBg, borderRadius: R.lg, paddingVertical: SP.md, paddingHorizontal: SP.lg, flexDirection: "row", alignItems: "center", gap: SP.md, shadowColor: COLORS.heroBg, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.35, shadowRadius: 16, elevation: 12, borderLeftWidth: 4, borderLeftColor: COLORS.accent },
  toastEmoji: { fontSize: 22, color: COLORS.accent, fontWeight: "800" },
  toastTitle: { fontSize: 15, fontWeight: "800", color: COLORS.textOnDark },
  toastSub:   { fontSize: 11, color: COLORS.textOnDarkMuted, marginTop: 1 },
});
