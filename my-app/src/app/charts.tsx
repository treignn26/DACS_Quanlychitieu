// src/app/charts.tsx — Tab 2: Biểu đồ / Charts

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

// ─── Design tokens ────────────────────────────────────────────────────────────
const COLORS = {
  pageBg:          "#F5F7F6",
  cardBg:          "#FFFFFF",
  heroBg:          "#1A2E2A",
  accent:          "#2ECC9A",
  income:          "#2ECC9A",
  incomeText:      "#15704F",
  expense:         "#FF6B6B",
  expenseText:     "#C0392B",
  textPrimary:     "#1A2422",
  textSecondary:   "#6B8076",
  textMuted:       "#9EB8B0",
  textOnDark:      "#FFFFFF",
  textOnDarkMuted: "#A8C4BC",
  border:          "#E8EFED",
  gridLine:        "#EEF3F1",
};

const SP = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 } as const;
const R  = { sm: 8, md: 12, lg: 16, xl: 20, full: 999 } as const;

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

interface BarData {
  label:   string;
  income:  number;
  expense: number;
}

interface CatData {
  emoji:   string;
  labelVi: string;
  labelEn: string;
  amount:  number;
  pct:     number;
  color:   string;
}

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

// ─── BarChart ─────────────────────────────────────────────────────────────────
// CHART_H = bars area height (fixed, used for grid alignment)
// LABEL_H = x-axis label area below bars
// TOTAL_H = CHART_H + LABEL_H = total chart component height
const CHART_H = 130;
const LABEL_H = 18;
const TOTAL_H = CHART_H + LABEL_H;
const BAR_W   = 13;
const BAR_GAP = 4;

function BarChart({ data }: { data: BarData[] }) {
  const maxVal = Math.max(...data.flatMap(d => [d.income, d.expense]), 1);
  const midTop = CHART_H / 2; // 65

  return (
    // Outer row: explicit TOTAL_H so both children have a defined parent height
    <View style={{ flexDirection: "row", height: TOTAL_H }}>

      {/* ── Y-axis: CHART_H tall, labels absolutely positioned ── */}
      <View style={{ width: 42, height: CHART_H, position: "relative" }}>
        {/* 100% → top of CHART_H zone */}
        <Text style={[bc.yLabel, { top: 0 }]}>{fmtShort(maxVal)}</Text>
        {/* 50% → mid of CHART_H zone */}
        <Text style={[bc.yLabel, { top: midTop - 5 }]}>{fmtShort(maxVal / 2)}</Text>
        {/* 0%  → bottom of CHART_H zone */}
        <Text style={[bc.yLabel, { bottom: 0 }]}>0</Text>
      </View>

      {/* ── Chart area: TOTAL_H tall so labels aren't clipped ── */}
      <View style={{ flex: 1, height: TOTAL_H, position: "relative" }}>

        {/* Grid lines: cover CHART_H zone only, pointer-events disabled */}
        <View
          pointerEvents="none"
          style={{ position: "absolute", top: 0, left: 0, right: 0, height: CHART_H }}
        >
          <View style={[bc.gridLine, { top: 0 }]} />
          <View style={[bc.gridLine, { top: midTop }]} />
          {/* Baseline is slightly darker */}
          <View style={[bc.baseline, { top: CHART_H - 1 }]} />
        </View>

        {/* Horizontal scroll: fills full TOTAL_H so labels show below bars */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flex: 1 }}>
          <View style={{ flexDirection: "row", alignItems: "flex-end", height: TOTAL_H, paddingHorizontal: SP.xs }}>
            {data.map((d, i) => {
              const incH = d.income  > 0 ? Math.max((d.income  / maxVal) * CHART_H, 4) : 0;
              const expH = d.expense > 0 ? Math.max((d.expense / maxVal) * CHART_H, 4) : 0;
              return (
                <View key={i} style={{ alignItems: "center", marginHorizontal: 5 }}>
                  {/* Bars grow from the bottom of CHART_H zone */}
                  <View style={{ flexDirection: "row", alignItems: "flex-end", height: CHART_H }}>
                    <View style={[bc.bar, { height: incH,  backgroundColor: COLORS.income  }]} />
                    <View style={[bc.bar, { height: expH,  backgroundColor: COLORS.expense, marginLeft: BAR_GAP }]} />
                  </View>
                  {/* X-axis label sits below bars, inside LABEL_H zone */}
                  <Text style={bc.barLabel}>{d.label}</Text>
                </View>
              );
            })}
          </View>
        </ScrollView>
      </View>
    </View>
  );
}

const bc = StyleSheet.create({
  yLabel:  { position: "absolute", right: 6, fontSize: 9, color: COLORS.textMuted },
  gridLine:{ position: "absolute", left: 0, right: 0, height: 1, backgroundColor: COLORS.gridLine },
  baseline:{ position: "absolute", left: 0, right: 0, height: 1, backgroundColor: COLORS.border  },
  bar:     { width: BAR_W, borderTopLeftRadius: 4, borderTopRightRadius: 4 },
  barLabel:{ fontSize: 9, color: COLORS.textMuted, marginTop: SP.xs, textAlign: "center", height: LABEL_H - SP.xs },
});

// ─── CategoryRow ──────────────────────────────────────────────────────────────
function CatRow({ cat, lang }: { cat: CatData; lang: "vi" | "en" }) {
  return (
    <View style={cr.wrap}>
      <View style={cr.left}>
        <Text style={cr.emoji}>{cat.emoji}</Text>
        <Text style={cr.name} numberOfLines={1}>
          {lang === "vi" ? cat.labelVi : cat.labelEn}
        </Text>
      </View>
      <View style={cr.trackWrap}>
        <View style={cr.track}>
          <View style={[cr.fill, { width: `${Math.max(cat.pct, 3)}%` as any, backgroundColor: cat.color }]} />
        </View>
      </View>
      <View style={cr.right}>
        <Text style={cr.pct}>{cat.pct}%</Text>
        <Text style={cr.amount}>{fmtVND(cat.amount)}</Text>
      </View>
    </View>
  );
}

const cr = StyleSheet.create({
  wrap:     { flexDirection: "row", alignItems: "center", marginBottom: SP.sm + 2 },
  left:     { flexDirection: "row", alignItems: "center", width: 112 },
  emoji:    { fontSize: 18, marginRight: SP.sm },
  name:     { fontSize: 12, color: COLORS.textPrimary, fontWeight: "600", flexShrink: 1 },
  trackWrap:{ flex: 1, marginHorizontal: SP.sm },
  track:    { height: 8, backgroundColor: COLORS.border, borderRadius: R.full, overflow: "hidden" },
  fill:     { height: "100%", borderRadius: R.full },
  right:    { width: 84, alignItems: "flex-end" },
  pct:      { fontSize: 12, fontWeight: "700", color: COLORS.textPrimary },
  amount:   { fontSize: 10, color: COLORS.textMuted },
});

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
});
