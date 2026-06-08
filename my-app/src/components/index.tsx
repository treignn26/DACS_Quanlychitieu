// src/components/index.tsx — Toàn bộ sub-components của app
import React, { useState, useEffect, useRef } from "react";
import {
  Animated,
  Dimensions,
  Keyboard,
  Modal,
  PanResponder,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useLanguage } from "@/context/LanguageContext";
import type { Lang } from "@/context/LanguageContext";
import type { InsightCard, SpendCategory } from "@/api/client";
import { COLORS, SP, R, RL } from "@/constants/tokens";

// ─── Types (export để screens dùng) ──────────────────────────────────────────

export type TxType = "income" | "expense";

export interface Tx {
  id:       string;
  type:     TxType;
  amount:   number;
  category: string;
  catLabel: { vi: string; en: string };
  note:     string;
  date:     Date;
}

export interface BarData {
  label:   string;
  income:  number;
  expense: number;
}

export interface CatData {
  emoji:   string;
  labelVi: string;
  labelEn: string;
  amount:  number;
  pct:     number;
  color:   string;
}

export interface CalendarModalProps {
  visible:      boolean;
  selectedDate: Date | null;
  onSelectDate: (date: Date) => void;
  onClose:      () => void;
  txDates?:     Date[];
}

// ─── Helpers (nội bộ) ────────────────────────────────────────────────────────

const fmtVND = (n: number): string => n.toLocaleString("vi-VN") + " đ";

const fmtShort = (n: number): string => {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, "") + "M";
  if (n >= 1_000)     return Math.round(n / 1_000) + "K";
  return String(Math.round(n));
};

const isSameDay = (a: Date, b: Date): boolean =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth()    === b.getMonth()    &&
  a.getDate()     === b.getDate();

// ═══════════════════════════════════════════════════════════════════════════════
// TxRow — một dòng giao dịch trong danh sách (Home)
// ═══════════════════════════════════════════════════════════════════════════════

interface TxRowProps { tx: Tx; lang: "vi" | "en"; }

export function TxRow({ tx, lang }: TxRowProps) {
  const isIncome = tx.type === "income";
  const dateStr  = tx.date.toLocaleDateString(
    lang === "vi" ? "vi-VN" : "en-GB",
    { day: "2-digit", month: "2-digit" },
  );
  return (
    <View style={txRow.wrap}>
      <View style={[txRow.iconCircle, { backgroundColor: isIncome ? COLORS.incomeBg : COLORS.expenseBg }]}>
        <Text style={txRow.icon}>{tx.category}</Text>
      </View>
      <View style={txRow.info}>
        <Text style={txRow.catLabel}>{tx.catLabel[lang]}</Text>
        <Text style={txRow.note} numberOfLines={1}>{tx.note}</Text>
      </View>
      <View style={txRow.right}>
        <Text style={[txRow.amount, { color: isIncome ? COLORS.incomeText : COLORS.expenseText }]}>
          {isIncome ? "+" : "−"}{fmtVND(tx.amount)}
        </Text>
        <Text style={txRow.date}>{dateStr}</Text>
      </View>
    </View>
  );
}

const txRow = StyleSheet.create({
  wrap:      { flexDirection: "row", alignItems: "center", backgroundColor: COLORS.cardBg, padding: SP.md },
  iconCircle:{ width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center", marginRight: SP.md },
  icon:      { fontSize: 22 },
  info:      { flex: 1 },
  catLabel:  { fontSize: 14, fontWeight: "600", color: COLORS.textPrimary, marginBottom: 2 },
  note:      { fontSize: 12, color: COLORS.textSecondary },
  right:     { alignItems: "flex-end" },
  amount:    { fontSize: 13, fontWeight: "700", marginBottom: 2 },
  date:      { fontSize: 11, color: COLORS.textMuted },
});

// ═══════════════════════════════════════════════════════════════════════════════
// EmptyState — màn hình trống khi không có giao dịch (Home)
// ═══════════════════════════════════════════════════════════════════════════════

interface EmptyStateProps {
  title: string; body: string; clearLabel: string; onClear: () => void;
}

export function EmptyState({ title, body, clearLabel, onClear }: EmptyStateProps) {
  return (
    <View style={emptyS.wrap}>
      <Text style={emptyS.emoji}>🔍</Text>
      <Text style={emptyS.title}>{title}</Text>
      <Text style={emptyS.body}>{body}</Text>
      <TouchableOpacity style={emptyS.btn} onPress={onClear} activeOpacity={0.8}>
        <Text style={emptyS.btnTxt}>{clearLabel}</Text>
      </TouchableOpacity>
    </View>
  );
}

const emptyS = StyleSheet.create({
  wrap:   { alignItems: "center", paddingTop: SP.xl + SP.md, paddingBottom: SP.xl, paddingHorizontal: SP.xl },
  emoji:  { fontSize: 44, marginBottom: SP.md },
  title:  { fontSize: 18, fontWeight: "700", color: COLORS.textPrimary, marginBottom: SP.sm, textAlign: "center" },
  body:   { fontSize: 14, color: COLORS.textSecondary, textAlign: "center", lineHeight: 21, marginBottom: SP.lg },
  btn:    { backgroundColor: COLORS.accentSoft, borderRadius: R.full, paddingHorizontal: SP.lg, paddingVertical: SP.sm + 2 },
  btnTxt: { fontSize: 14, fontWeight: "600", color: COLORS.incomeText },
});

// ═══════════════════════════════════════════════════════════════════════════════
// BarChart — biểu đồ cột thu nhập / chi tiêu (Charts)
// ═══════════════════════════════════════════════════════════════════════════════

const CHART_H = 130;
const LABEL_H = 18;
const TOTAL_H = CHART_H + LABEL_H;
const BAR_W   = 13;
const BAR_GAP = 4;

export function BarChart({ data }: { data: BarData[] }) {
  const maxVal = Math.max(...data.flatMap(d => [d.income, d.expense]), 1);
  const midTop = CHART_H / 2;

  return (
    <View style={{ flexDirection: "row", height: TOTAL_H }}>
      <View style={{ width: 42, height: CHART_H, position: "relative" }}>
        <Text style={[bc.yLabel, { top: 0 }]}>{fmtShort(maxVal)}</Text>
        <Text style={[bc.yLabel, { top: midTop - 5 }]}>{fmtShort(maxVal / 2)}</Text>
        <Text style={[bc.yLabel, { bottom: 0 }]}>0</Text>
      </View>
      <View style={{ flex: 1, height: TOTAL_H, position: "relative" }}>
        <View pointerEvents="none" style={{ position: "absolute", top: 0, left: 0, right: 0, height: CHART_H }}>
          <View style={[bc.gridLine, { top: 0 }]} />
          <View style={[bc.gridLine, { top: midTop }]} />
          <View style={[bc.baseline, { top: CHART_H - 1 }]} />
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flex: 1 }}>
          <View style={{ flexDirection: "row", alignItems: "flex-end", height: TOTAL_H, paddingHorizontal: SP.xs }}>
            {data.map((d, i) => {
              const incH = d.income  > 0 ? Math.max((d.income  / maxVal) * CHART_H, 4) : 0;
              const expH = d.expense > 0 ? Math.max((d.expense / maxVal) * CHART_H, 4) : 0;
              return (
                <View key={i} style={{ alignItems: "center", marginHorizontal: 5 }}>
                  <View style={{ flexDirection: "row", alignItems: "flex-end", height: CHART_H }}>
                    <View style={[bc.bar, { height: incH,  backgroundColor: COLORS.income  }]} />
                    <View style={[bc.bar, { height: expH,  backgroundColor: COLORS.expense, marginLeft: BAR_GAP }]} />
                  </View>
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
  baseline:{ position: "absolute", left: 0, right: 0, height: 1, backgroundColor: COLORS.border },
  bar:     { width: BAR_W, borderTopLeftRadius: 4, borderTopRightRadius: 4 },
  barLabel:{ fontSize: 9, color: COLORS.textMuted, marginTop: SP.xs, textAlign: "center", height: LABEL_H - SP.xs },
});

// ═══════════════════════════════════════════════════════════════════════════════
// CatRow — một dòng danh mục trong bảng phân tích (Charts)
// ═══════════════════════════════════════════════════════════════════════════════

export function CatRow({ cat, lang }: { cat: CatData; lang: "vi" | "en" }) {
  return (
    <View style={cr.wrap}>
      <View style={cr.left}>
        <Text style={cr.emoji}>{cat.emoji}</Text>
        <Text style={cr.name} numberOfLines={1}>{lang === "vi" ? cat.labelVi : cat.labelEn}</Text>
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

// ═══════════════════════════════════════════════════════════════════════════════
// InsightCardView — card nhận xét từ AI (AI Assistant)
// ═══════════════════════════════════════════════════════════════════════════════

export function InsightCardView({ card, lang }: { card: InsightCard; lang: "vi" | "en" }) {
  const bg     = card.tag === "positive" ? COLORS.incomeBg : card.tag === "warning" ? COLORS.warnBg  : "#F0F5F3";
  const border = card.tag === "positive" ? COLORS.income   : card.tag === "warning" ? COLORS.warn    : COLORS.border;
  return (
    <View style={[aiS.insightCard, { backgroundColor: bg, borderColor: border }]}>
      <Text style={aiS.insightEmoji}>{card.emoji}</Text>
      <Text style={aiS.insightTitle}>{lang === "vi" ? card.titleVi : card.titleEn}</Text>
      <Text style={aiS.insightBody}>{lang === "vi"  ? card.bodyVi  : card.bodyEn}</Text>
    </View>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// SpendRow — một dòng chi tiêu trong breakdown AI (AI Assistant)
// ═══════════════════════════════════════════════════════════════════════════════

export function SpendRow({ cat, last, lang }: { cat: SpendCategory; last: boolean; lang: "vi" | "en" }) {
  return (
    <View style={[aiS.spendRow, !last && aiS.spendRowBorder]}>
      <Text style={aiS.spendEmoji}>{cat.emoji}</Text>
      <View style={aiS.spendInfo}>
        <Text style={aiS.spendName}>{lang === "vi" ? cat.vi : cat.en}</Text>
        <View style={aiS.spendBarTrack}>
          <View style={[aiS.spendBarFill, { width: `${cat.pct}%` as any, backgroundColor: cat.color }]} />
        </View>
      </View>
      <View style={aiS.spendRight}>
        <Text style={aiS.spendAmt}>{fmtVND(cat.amount)}</Text>
        <Text style={aiS.spendPct}>{cat.pct}%</Text>
      </View>
    </View>
  );
}

const aiS = StyleSheet.create({
  insightCard:  { width: 220, borderRadius: RL.lg, padding: SP.md, borderWidth: 1.5, shadowColor: COLORS.shadow, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 },
  insightEmoji: { fontSize: 24, marginBottom: SP.sm },
  insightTitle: { fontSize: 13, fontWeight: "700", color: COLORS.textPrimary, marginBottom: SP.xs },
  insightBody:  { fontSize: 12, color: COLORS.textSecondary, lineHeight: 18 },
  spendRow:       { flexDirection: "row", alignItems: "center", paddingVertical: SP.sm + 4, gap: SP.sm },
  spendRowBorder: { borderBottomWidth: 1, borderBottomColor: COLORS.border },
  spendEmoji:     { fontSize: 20, flexShrink: 0 },
  spendInfo:      { flex: 1 },
  spendName:      { fontSize: 12, fontWeight: "700", color: COLORS.textPrimary, marginBottom: SP.xs },
  spendBarTrack:  { height: 5, backgroundColor: COLORS.border, borderRadius: 3, overflow: "hidden" },
  spendBarFill:   { height: "100%", borderRadius: 3 },
  spendRight:     { alignItems: "flex-end", flexShrink: 0 },
  spendAmt:       { fontSize: 11, fontWeight: "700", color: COLORS.textPrimary },
  spendPct:       { fontSize: 10, color: COLORS.textMuted, fontWeight: "500", marginTop: 1 },
});

// ═══════════════════════════════════════════════════════════════════════════════
// ProfileField — input field trong form hồ sơ (Settings)
// ═══════════════════════════════════════════════════════════════════════════════

interface ProfileFieldProps {
  label: string; value: string; placeholder: string;
  onChange: (v: string) => void; editing: boolean;
  keyboardType?: "default" | "email-address" | "numeric";
}

export function ProfileField({ label, value, placeholder, onChange, editing, keyboardType = "default" }: ProfileFieldProps) {
  return (
    <View style={pS.fieldWrap}>
      <Text style={pS.fieldLabel}>{label}</Text>
      {editing ? (
        <TextInput
          style={pS.fieldInput}
          value={value}
          onChangeText={onChange}
          placeholder={placeholder}
          placeholderTextColor={COLORS.textMuted}
          keyboardType={keyboardType}
          autoCapitalize={keyboardType === "email-address" ? "none" : "words"}
          returnKeyType="done"
          onSubmitEditing={() => Keyboard.dismiss()}
        />
      ) : (
        <Text style={pS.fieldValue} numberOfLines={1}>{value || placeholder}</Text>
      )}
    </View>
  );
}

const pS = StyleSheet.create({
  fieldWrap:  { marginBottom: SP.md },
  fieldLabel: { fontSize: 11, fontWeight: "700", color: COLORS.textMuted, letterSpacing: 0.4, marginBottom: SP.xs + 2, textTransform: "uppercase" },
  fieldValue: { fontSize: 15, fontWeight: "600", color: COLORS.textPrimary, paddingVertical: SP.sm },
  fieldInput: { fontSize: 15, fontWeight: "600", color: COLORS.textPrimary, backgroundColor: COLORS.inputBg, borderRadius: RL.sm, borderWidth: 1.5, borderColor: COLORS.inputBorder, paddingHorizontal: SP.md, paddingVertical: SP.sm + 4 },
});

// ═══════════════════════════════════════════════════════════════════════════════
// InfoRow — dòng thông tin tĩnh (Settings)
// ═══════════════════════════════════════════════════════════════════════════════

interface InfoRowProps {
  emoji: string; label: string; value?: string; last?: boolean; onPress?: () => void;
}

export function InfoRow({ emoji, label, value, last, onPress }: InfoRowProps) {
  return (
    <TouchableOpacity
      style={[iS.row, !last && iS.rowBorder]}
      onPress={onPress}
      activeOpacity={onPress ? 0.7 : 1}
    >
      <View style={iS.emojiWrap}><Text style={iS.emoji}>{emoji}</Text></View>
      <Text style={iS.label}>{label}</Text>
      {value && <Text style={iS.value}>{value}</Text>}
      {onPress && <Text style={iS.chevron}>›</Text>}
    </TouchableOpacity>
  );
}

const iS = StyleSheet.create({
  row:       { flexDirection: "row", alignItems: "center", paddingVertical: SP.md, gap: SP.sm },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: COLORS.border },
  emojiWrap: { width: 34, height: 34, borderRadius: RL.sm, backgroundColor: COLORS.accentSoft, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  emoji:     { fontSize: 16 },
  label:     { flex: 1, fontSize: 14, fontWeight: "600", color: COLORS.textPrimary },
  value:     { fontSize: 12, color: COLORS.textMuted, fontWeight: "500", maxWidth: 180, textAlign: "right" },
  chevron:   { fontSize: 18, color: COLORS.textMuted, marginLeft: SP.xs },
});

// ═══════════════════════════════════════════════════════════════════════════════
// LanguageToggle — nút chuyển ngôn ngữ VI/EN (Settings)
// ═══════════════════════════════════════════════════════════════════════════════

interface LanguageToggleProps {
  current: Lang; onChange: (l: Lang) => void; viLabel: string; enLabel: string;
}

export function LanguageToggle({ current, onChange, viLabel, enLabel }: LanguageToggleProps) {
  const anim = useRef(new Animated.Value(current === "vi" ? 0 : 1)).current;

  const select = (lang: Lang) => {
    onChange(lang);
    Animated.spring(anim, { toValue: lang === "vi" ? 0 : 1, useNativeDriver: false, friction: 8, tension: 80 }).start();
  };

  const TOGGLE_W = 280;
  const PILL_W   = TOGGLE_W / 2 - 4;
  const pillLeft  = anim.interpolate({ inputRange: [0, 1], outputRange: [4, TOGGLE_W / 2] });

  return (
    <View style={[ltS.track, { width: TOGGLE_W }]}>
      <Animated.View style={[ltS.pill, { left: pillLeft, width: PILL_W }]} />
      <TouchableOpacity style={[ltS.option, { width: TOGGLE_W / 2 }]} onPress={() => select("vi")} activeOpacity={0.8}>
        <Text style={[ltS.optText, current === "vi" && ltS.optTextActive]}>{viLabel}</Text>
      </TouchableOpacity>
      <TouchableOpacity style={[ltS.option, { width: TOGGLE_W / 2 }]} onPress={() => select("en")} activeOpacity={0.8}>
        <Text style={[ltS.optText, current === "en" && ltS.optTextActive]}>{enLabel}</Text>
      </TouchableOpacity>
    </View>
  );
}

const ltS = StyleSheet.create({
  track:        { height: 46, backgroundColor: "#EBF2F0", borderRadius: RL.xl, flexDirection: "row", alignItems: "center", position: "relative", overflow: "hidden" },
  pill:         { position: "absolute", top: 4, height: 38, backgroundColor: COLORS.langActive, borderRadius: RL.xl - 2, zIndex: 0 },
  option:       { height: "100%" as any, alignItems: "center", justifyContent: "center", zIndex: 1 },
  optText:      { fontSize: 13, fontWeight: "700", color: COLORS.textSecondary, letterSpacing: 0.1 },
  optTextActive: { color: "#FFFFFF" },
});

// ═══════════════════════════════════════════════════════════════════════════════
// Section — wrapper tiêu đề nhóm (Settings)
// ═══════════════════════════════════════════════════════════════════════════════

interface SectionProps { title: string; children: React.ReactNode; }

export function Section({ title, children }: SectionProps) {
  return (
    <View style={secS.wrapper}>
      <Text style={secS.title}>{title}</Text>
      <View style={secS.card}>{children}</View>
    </View>
  );
}

const secS = StyleSheet.create({
  wrapper: { marginHorizontal: SP.md, marginTop: SP.lg },
  title:   { fontSize: 12, fontWeight: "800", color: COLORS.textMuted, letterSpacing: 0.8, textTransform: "uppercase", marginBottom: SP.sm, paddingLeft: SP.xs },
  card:    { backgroundColor: COLORS.cardBg, borderRadius: RL.lg, paddingHorizontal: SP.lg, paddingTop: SP.md, paddingBottom: SP.xs, shadowColor: COLORS.shadow, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 3 },
});

// ═══════════════════════════════════════════════════════════════════════════════
// SwipeableRow — swipe trái để xóa giao dịch (Home)
// ═══════════════════════════════════════════════════════════════════════════════

const DELETE_W  = 72;
const THRESHOLD = 48;

interface SwipeableRowProps { onDeleteRequest: () => void; children: React.ReactNode; }

export function SwipeableRow({ onDeleteRequest, children }: SwipeableRowProps) {
  const translateX = useRef(new Animated.Value(0)).current;
  const openRef    = useRef(false);

  const snapClose = () => {
    openRef.current = false;
    Animated.spring(translateX, { toValue: 0, useNativeDriver: true, bounciness: 4 }).start();
  };

  const snapOpen = () => {
    openRef.current = true;
    Animated.spring(translateX, { toValue: -DELETE_W, useNativeDriver: true, bounciness: 4 }).start();
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gs) => {
        const dx = Math.abs(gs.dx);
        const dy = Math.abs(gs.dy);
        return dx > 6 && dx > dy * 1.5;
      },
      onPanResponderGrant: () => { translateX.stopAnimation(); },
      onPanResponderMove: (_, gs) => {
        const base = openRef.current ? -DELETE_W : 0;
        const next = Math.min(0, Math.max(-DELETE_W - 16, base + gs.dx));
        translateX.setValue(next);
      },
      onPanResponderRelease: (_, gs) => {
        const base = openRef.current ? -DELETE_W : 0;
        const cur  = base + gs.dx;
        if (cur < -THRESHOLD) snapOpen(); else snapClose();
      },
      onPanResponderTerminate: () => snapClose(),
    })
  ).current;

  const handleDelete = () => { snapClose(); setTimeout(onDeleteRequest, 180); };

  return (
    <View style={sw.container}>
      <View style={sw.deleteZone}>
        <TouchableOpacity style={sw.deleteBtn} onPress={handleDelete} activeOpacity={0.8}>
          <Text style={sw.deleteIcon}>🗑️</Text>
          <Text style={sw.deleteLabel}>Xóa</Text>
        </TouchableOpacity>
      </View>
      <Animated.View style={{ transform: [{ translateX }] }} {...panResponder.panHandlers}>
        {children}
      </Animated.View>
    </View>
  );
}

const sw = StyleSheet.create({
  container: { overflow: "hidden", borderRadius: 16, marginHorizontal: 16, marginBottom: 8, shadowColor: COLORS.shadow, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2 },
  deleteZone:{ ...StyleSheet.absoluteFillObject, backgroundColor: COLORS.danger, flexDirection: "row", justifyContent: "flex-end", alignItems: "center", borderRadius: 16 },
  deleteBtn: { width: DELETE_W, height: "100%", justifyContent: "center", alignItems: "center", gap: 4 },
  deleteIcon:  { fontSize: 20 },
  deleteLabel: { fontSize: 10, fontWeight: "700", color: "#FFFFFF" },
});

// ═══════════════════════════════════════════════════════════════════════════════
// CalendarModal — modal chọn ngày có dot giao dịch (Home)
// ═══════════════════════════════════════════════════════════════════════════════

const { width: SCREEN_W } = Dimensions.get("window");
const CARD_W    = Math.min(SCREEN_W - 48, 360);
const CELL_SIZE = Math.floor((CARD_W - 40) / 7);

export function CalendarModal({ visible, selectedDate, onSelectDate, onClose, txDates = [] }: CalendarModalProps) {
  const { t, lang } = useLanguage();
  const today = new Date();

  const [viewYear,  setViewYear]  = useState(selectedDate?.getFullYear() ?? today.getFullYear());
  const [viewMonth, setViewMonth] = useState(selectedDate?.getMonth()    ?? today.getMonth());

  useEffect(() => {
    if (selectedDate) {
      setViewYear(selectedDate.getFullYear());
      setViewMonth(selectedDate.getMonth());
    }
  }, [selectedDate]);

  const goToPrev = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
    else setViewMonth(m => m - 1);
  };
  const goToNext = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
    else setViewMonth(m => m + 1);
  };

  const firstDayOfMonth = new Date(viewYear, viewMonth, 1);
  const startOffset     = (firstDayOfMonth.getDay() + 6) % 7;
  const daysInMonth     = new Date(viewYear, viewMonth + 1, 0).getDate();
  const cells: (number | null)[] = [
    ...Array(startOffset).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const handleDayPress = (day: number) => {
    onSelectDate(new Date(viewYear, viewMonth, day, 0, 0, 0, 0));
    onClose();
  };

  const closeLabel = lang === "vi" ? "✕ Đóng lịch" : "✕ Close calendar";

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <TouchableOpacity style={calS.backdrop} activeOpacity={1} onPress={onClose}>
        <TouchableOpacity activeOpacity={1} onPress={() => {}}>
          <View style={calS.card}>
            <View style={calS.header}>
              <TouchableOpacity style={calS.navBtn} onPress={goToPrev} activeOpacity={0.75}>
                <Text style={calS.navArrow}>‹</Text>
              </TouchableOpacity>
              <Text style={calS.monthTitle}>{t.homeMonths[viewMonth]}{"  "}{viewYear}</Text>
              <TouchableOpacity style={calS.navBtn} onPress={goToNext} activeOpacity={0.75}>
                <Text style={calS.navArrow}>›</Text>
              </TouchableOpacity>
            </View>

            <View style={calS.weekdayRow}>
              {t.homeWeekdays.map((wd: string, i: number) => (
                <View key={i} style={[calS.cell, { height: 28 }]}>
                  <Text style={calS.wdLabel}>{wd}</Text>
                </View>
              ))}
            </View>

            <View style={calS.grid}>
              {cells.map((day, idx) => {
                if (day === null) return <View key={`blank-${idx}`} style={[calS.cell, { height: CELL_SIZE }]} />;
                const cellDate  = new Date(viewYear, viewMonth, day);
                const isToday   = isSameDay(cellDate, today);
                const isSelected= selectedDate ? isSameDay(cellDate, selectedDate) : false;
                const hasTx     = txDates.some(d => isSameDay(d, cellDate));
                return (
                  <TouchableOpacity
                    key={`day-${idx}`}
                    style={[calS.cell, { height: CELL_SIZE }, isSelected && calS.cellSelected, !isSelected && isToday && calS.cellToday]}
                    onPress={() => handleDayPress(day)}
                    activeOpacity={0.7}
                  >
                    <Text style={[calS.dayNum, isSelected && calS.dayNumSelected, !isSelected && isToday && calS.dayNumToday]}>
                      {day}
                    </Text>
                    {hasTx && <View style={[calS.dot, isSelected && calS.dotSelected]} />}
                  </TouchableOpacity>
                );
              })}
            </View>

            <TouchableOpacity style={calS.closeBtn} onPress={onClose} activeOpacity={0.85}>
              <Text style={calS.closeBtnTxt}>{closeLabel}</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

const calS = StyleSheet.create({
  backdrop:      { flex: 1, backgroundColor: "rgba(8,22,18,0.60)", justifyContent: "center", alignItems: "center" },
  card:          { width: CARD_W, backgroundColor: COLORS.cardBg, borderRadius: 20, padding: 20, paddingBottom: 16, shadowColor: "#000", shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.18, shadowRadius: 22, elevation: 14 },
  header:        { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 14 },
  navBtn:        { width: 36, height: 36, borderRadius: 18, backgroundColor: COLORS.accentSoft, alignItems: "center", justifyContent: "center" },
  navArrow:      { fontSize: 22, lineHeight: 27, fontWeight: "700", color: COLORS.heroBg },
  monthTitle:    { fontSize: 16, fontWeight: "700", color: COLORS.textPrimary },
  weekdayRow:    { flexDirection: "row", marginBottom: 4 },
  grid:          { flexDirection: "row", flexWrap: "wrap" },
  cell:          { width: CELL_SIZE, alignItems: "center", justifyContent: "center" },
  wdLabel:       { fontSize: 11, fontWeight: "600", color: COLORS.textMuted },
  dayNum:        { fontSize: 13, fontWeight: "500", color: COLORS.textPrimary },
  cellSelected:  { backgroundColor: COLORS.heroBg, borderRadius: CELL_SIZE / 2 },
  dayNumSelected:{ color: COLORS.textOnDark, fontWeight: "700" },
  cellToday:     { borderRadius: CELL_SIZE / 2, borderWidth: 2, borderColor: COLORS.accent },
  dayNumToday:   { color: COLORS.heroBg, fontWeight: "700" },
  dot:           { width: 4, height: 4, borderRadius: 2, backgroundColor: COLORS.accent, marginTop: 2 },
  dotSelected:   { backgroundColor: "rgba(255,255,255,0.55)" },
  closeBtn:      { marginTop: 16, backgroundColor: COLORS.heroBg, borderRadius: 12, paddingVertical: 13, alignItems: "center" },
  closeBtnTxt:   { color: COLORS.textOnDark, fontSize: 15, fontWeight: "700", letterSpacing: 0.3 },
});
