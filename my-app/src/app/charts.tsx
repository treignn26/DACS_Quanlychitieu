// src/app/charts.tsx — Tab 2: Biểu đồ / Charts
import { COLORS, SP, R } from "@/constants/tokens";

import React, { useState, useCallback, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  Platform,
  ActivityIndicator,
} from "react-native";
import { useFocusEffect } from "expo-router";
import { useLanguage } from "../context/LanguageContext";
import * as api from "../api/client";
import { BarChart, CatRow, type BarData, type CatData } from "@/components";

// ─── Design tokens ────────────────────────────────────────────────────────────

const CAT_PALETTE = ["#2ECC9A", "#3498DB", "#E67E22", "#9B59B6", "#F39C12", "#E74C3C"];

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmtVND = (n: number): string => n.toLocaleString("vi-VN") + " đ";

const fmtShort = (n: number): string => {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, "") + "M";
  if (n >= 1_000)     return Math.round(n / 1_000) + "K";
  return String(Math.round(n));
};

// ─── Types ────────────────────────────────────────────────────────────────────
type PeriodMode = "day" | "month" | "year";

// ─── Label arrays ─────────────────────────────────────────────────────────────
const DAY_VI = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];
const DAY_EN = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MON_VI = ["T1","T2","T3","T4","T5","T6","T7","T8","T9","T10","T11","T12"];
const MON_EN = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

// ─── Convert API bars → display labels ───────────────────────────────────────
function toBars(raw: api.BarItem[], mode: PeriodMode, lang: "vi" | "en"): BarData[] {
  if (mode === "day") {
    const labels = lang === "vi" ? DAY_VI : DAY_EN;
    return raw.map(b => {
      const parts = (b.key as string).split("-").map(Number);
      const date  = new Date(parts[0], parts[1] - 1, parts[2]);
      return { label: labels[date.getDay()], income: b.income, expense: b.expense };
    });
  }
  if (mode === "month") {
    const labels = lang === "vi" ? MON_VI : MON_EN;
    return raw.map(b => ({
      label:   labels[(b.key as number) - 1] ?? String(b.key),
      income:  b.income,
      expense: b.expense,
    }));
  }
  return raw.map(b => ({ label: String(b.key), income: b.income, expense: b.expense }));
}


// ─── Main screen ──────────────────────────────────────────────────────────────
export default function ChartsScreen() {
  const { lang } = useLanguage();
  const s = (vi: string, en: string) => lang === "vi" ? vi : en;

  const [mode,    setMode]    = useState<PeriodMode>("month");
  const [barData, setBarData] = useState<BarData[]>([]);
  const [cats,    setCats]    = useState<CatData[]>([]);
  const [summary, setSummary] = useState({ totalIncome: 0, totalExpense: 0 });
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);

  // Ref giữ mode hiện tại cho useFocusEffect — tránh double-fetch khi đổi mode
  const modeRef = useRef<PeriodMode>("month");

  const fetchData = useCallback(async (period: PeriodMode) => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.getChartData(period);

      setBarData(toBars(data.bars, period, lang));
      setCats(
        data.categories.map((c, i) => ({
          emoji:   c.emoji,
          labelVi: c.vi,
          labelEn: c.en,
          amount:  c.amount,
          pct:     c.pct,
          color:   CAT_PALETTE[i] ?? CAT_PALETTE[0],
        })),
      );
      setSummary(data.summary);
    } catch (e: any) {
      setError(e.message ?? (lang === "vi" ? "Không thể tải dữ liệu" : "Failed to load data"));
    } finally {
      setLoading(false);
    }
  }, [lang]);

  // Chỉ fetch khi tab được focus (không phụ thuộc mode để tránh double-fetch)
  useFocusEffect(
    useCallback(() => {
      fetchData(modeRef.current);
    }, [fetchData]),
  );

  // Đổi mode: cập nhật ref + state + fetch ngay
  const handleModeChange = (m: PeriodMode) => {
    if (m === modeRef.current) return; // bỏ qua nếu đã ở mode này
    modeRef.current = m;
    setMode(m);
    fetchData(m);
  };

  const total      = summary.totalIncome + summary.totalExpense;
  const incomePct  = total > 0 ? Math.round((summary.totalIncome  / total) * 100) : 0;
  const expensePct = total > 0 ? Math.round((summary.totalExpense / total) * 100) : 0;
  const balance    = summary.totalIncome - summary.totalExpense;

  const periodLabel = mode === "day"
    ? s("7 ngày qua", "Last 7 days")
    : mode === "month"
    ? `${s("Năm", "Year")} ${new Date().getFullYear()}`
    : s("5 năm gần đây", "Last 5 years");

  // ── Loading ────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <SafeAreaView style={[sc.safe, { justifyContent: "center", alignItems: "center" }]}>
        <ActivityIndicator size="large" color={COLORS.accent} />
      </SafeAreaView>
    );
  }

  // ── Error ──────────────────────────────────────────────────────────────────
  if (error) {
    return (
      <SafeAreaView style={[sc.safe, { justifyContent: "center", alignItems: "center", padding: SP.lg }]}>
        <Text style={{ fontSize: 36, marginBottom: SP.md }}>⚠️</Text>
        <Text style={{ fontSize: 15, fontWeight: "700", color: COLORS.textPrimary, textAlign: "center", marginBottom: SP.sm }}>
          {s("Không thể tải biểu đồ", "Failed to Load Chart")}
        </Text>
        <Text style={{ fontSize: 12, color: COLORS.textSecondary, textAlign: "center", marginBottom: SP.lg }}>
          {error}
        </Text>
        <TouchableOpacity
          style={{ backgroundColor: COLORS.heroBg, borderRadius: R.full, paddingHorizontal: SP.lg, paddingVertical: SP.sm + 2 }}
          onPress={() => fetchData(modeRef.current)}
          activeOpacity={0.8}
        >
          <Text style={{ color: COLORS.textOnDark, fontWeight: "700" }}>{s("Thử lại", "Retry")}</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  // ── Main render ────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={sc.safe}>
      <StatusBar barStyle="light-content" />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={sc.content}>

        {/* ── HERO ─────────────────────────────────────────────────────── */}
        <View style={sc.hero}>
          <Text style={sc.heroTitle}>{s("Biểu đồ chi tiêu", "Spending Charts")}</Text>
          <Text style={sc.heroSub}>{periodLabel}</Text>

          {/* Bộ chọn kỳ */}
          <View style={sc.modeRow}>
            {(["day", "month", "year"] as PeriodMode[]).map(m => {
              const label = m === "day" ? s("Ngày","Day") : m === "month" ? s("Tháng","Month") : s("Năm","Year");
              return (
                <TouchableOpacity
                  key={m}
                  style={[sc.modeChip, mode === m && sc.modeChipActive]}
                  onPress={() => handleModeChange(m)}
                  activeOpacity={0.75}
                >
                  <Text style={[sc.modeChipTxt, mode === m && sc.modeChipTxtActive]}>{label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Tổng thu / chi */}
          <View style={sc.summaryRow}>
            <View style={sc.summaryCard}>
              <Text style={sc.arrowUp}>↑</Text>
              <View>
                <Text style={sc.summaryLabel}>{s("Thu nhập", "Income")}</Text>
                <Text style={sc.summaryAmt}>{fmtVND(summary.totalIncome)}</Text>
              </View>
            </View>
            <View style={sc.summaryCard}>
              <Text style={sc.arrowDown}>↓</Text>
              <View>
                <Text style={sc.summaryLabel}>{s("Chi tiêu", "Expense")}</Text>
                <Text style={[sc.summaryAmt, { color: COLORS.expense }]}>
                  {fmtVND(summary.totalExpense)}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* ── CẢNH BÁO CHI VƯỢT THU NHẬP ─────────────────────────────── */}
        {balance < 0 && (
          <View style={sc.overBudgetBanner}>
            <Text style={sc.overBudgetTxt}>
              {s(
                `⛔ Chi tiêu vượt thu nhập ${Math.abs(Math.round((balance / Math.max(summary.totalIncome, 1)) * 100))}%! Bạn đang chi nhiều hơn thu nhập trong kỳ này.`,
                `⛔ Spending exceeded income by ${Math.abs(Math.round((balance / Math.max(summary.totalIncome, 1)) * 100))}%! You're spending more than you earn this period.`,
              )}
            </Text>
          </View>
        )}

        {/* ── BIỂU ĐỒ CỘT ─────────────────────────────────────────────── */}
        <View style={sc.card}>
          <View style={sc.cardHeader}>
            <Text style={sc.cardTitle}>{s("Tổng quan", "Overview")}</Text>
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <View style={[sc.legendDot, { backgroundColor: COLORS.income }]} />
              <Text style={sc.legendTxt}>{s("Thu", "Inc")}</Text>
              <View style={[sc.legendDot, { backgroundColor: COLORS.expense, marginLeft: SP.sm }]} />
              <Text style={sc.legendTxt}>{s("Chi", "Exp")}</Text>
            </View>
          </View>
          <BarChart data={barData} />
        </View>

        {/* ── DANH MỤC CHI TIÊU ───────────────────────────────────────── */}
        <View style={sc.card}>
          <Text style={[sc.cardTitle, { marginBottom: SP.md }]}>
            {s("Danh mục chi tiêu", "Expense Categories")}
          </Text>
          {cats.length === 0 ? (
            <View style={{ alignItems: "center", paddingVertical: SP.lg }}>
              <Text style={{ fontSize: 32, marginBottom: SP.sm }}>💸</Text>
              <Text style={{ fontSize: 14, color: COLORS.textMuted, textAlign: "center" }}>
                {s("Không có dữ liệu chi tiêu", "No expense data")}
              </Text>
            </View>
          ) : (
            cats.map((cat, i) => <CatRow key={i} cat={cat} lang={lang} />)
          )}
        </View>

        {/* ── CÂN ĐỐI ─────────────────────────────────────────────────── */}
        <View style={sc.card}>
          <Text style={[sc.cardTitle, { marginBottom: SP.md }]}>
            {s("Cân đối kỳ này", "Period Balance")}
          </Text>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: SP.md }}>
            <Text style={{ fontSize: 13, color: COLORS.textSecondary }}>{s("Số dư", "Balance")}</Text>
            <Text style={{ fontSize: 20, fontWeight: "800", color: balance >= 0 ? COLORS.incomeText : COLORS.expenseText }}>
              {balance >= 0 ? "+" : "−"}{fmtVND(Math.abs(balance))}
            </Text>
          </View>

          {total > 0 ? (
            <>
              <View style={{ flexDirection: "row", height: 12, borderRadius: R.full, overflow: "hidden" }}>
                <View style={{ flex: summary.totalIncome,  backgroundColor: COLORS.income  }} />
                <View style={{ flex: summary.totalExpense, backgroundColor: COLORS.expense }} />
              </View>
              <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: SP.xs }}>
                <Text style={{ fontSize: 11, color: COLORS.incomeText,  fontWeight: "600" }}>↑ {s("Thu","Inc")} {incomePct}%</Text>
                <Text style={{ fontSize: 11, color: COLORS.expenseText, fontWeight: "600" }}>↓ {s("Chi","Exp")} {expensePct}%</Text>
              </View>
            </>
          ) : (
            <View style={{ alignItems: "center", paddingVertical: SP.sm }}>
              <Text style={{ fontSize: 13, color: COLORS.textMuted }}>
                {s("Chưa có dữ liệu trong kỳ này", "No data for this period")}
              </Text>
            </View>
          )}
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const sc = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: COLORS.pageBg,
    paddingTop: Platform.OS === "android" ? StatusBar.currentHeight : 0,
  },
  content: { paddingBottom: 120 },

  hero: {
    backgroundColor: COLORS.heroBg,
    marginHorizontal: SP.md, marginTop: SP.md, marginBottom: SP.md,
    borderRadius: R.xl, padding: SP.lg,
    shadowColor: "#000", shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.22, shadowRadius: 16, elevation: 10,
  },
  heroTitle: { fontSize: 20, fontWeight: "800", color: COLORS.textOnDark, marginBottom: 2 },
  heroSub:   { fontSize: 13, color: COLORS.textOnDarkMuted, marginBottom: SP.md },

  modeRow:           { flexDirection: "row", gap: SP.sm, marginBottom: SP.md },
  modeChip:          { flex: 1, alignItems: "center", paddingVertical: SP.xs + 2, borderRadius: R.full, backgroundColor: "rgba(255,255,255,0.12)" },
  modeChipActive:    { backgroundColor: COLORS.accent },
  modeChipTxt:       { fontSize: 13, fontWeight: "600", color: COLORS.textOnDarkMuted },
  modeChipTxtActive: { color: COLORS.heroBg },

  summaryRow:  { flexDirection: "row", gap: SP.md },
  summaryCard: { flex: 1, flexDirection: "row", alignItems: "center", backgroundColor: "rgba(255,255,255,0.08)", borderRadius: R.md, padding: SP.sm + 2, gap: SP.sm },
  arrowUp:     { fontSize: 20, color: COLORS.income,  fontWeight: "700" },
  arrowDown:   { fontSize: 20, color: COLORS.expense, fontWeight: "700" },
  summaryLabel:{ fontSize: 11, color: COLORS.textOnDarkMuted, marginBottom: 2 },
  summaryAmt:  { fontSize: 13, fontWeight: "700", color: COLORS.textOnDark },

  card: {
    backgroundColor: COLORS.cardBg,
    marginHorizontal: SP.md, marginBottom: SP.md,
    borderRadius: R.lg, padding: SP.md,
    shadowColor: "#1A2422", shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06, shadowRadius: 4, elevation: 2,
  },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: SP.md },
  cardTitle:  { fontSize: 15, fontWeight: "700", color: COLORS.textPrimary },

  legendDot: { width: 10, height: 10, borderRadius: 5, marginRight: 4 },
  legendTxt: { fontSize: 11, color: COLORS.textSecondary, fontWeight: "600" },

  overBudgetBanner: { backgroundColor: "#FFF0F0", marginHorizontal: SP.md, marginBottom: SP.md, borderRadius: R.lg, padding: SP.md, borderWidth: 1, borderColor: "#FFBCBC" },
  overBudgetTxt:    { fontSize: 13, fontWeight: "600", color: COLORS.expenseText, lineHeight: 18 },
});
