import React, { useState } from "react";
import {
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

// ─── Design tokens ────────────────────────────────────────────────────────────
const COLORS = {
  pageBg: "#F5F7F6",
  cardBg: "#FFFFFF",
  heroBg: "#1A2E2A",
  heroSub: "#243D38",
  heroDeep: "#162420",

  accent: "#2ECC9A",
  accentDeep: "#1BAA7E",
  accentSoft: "#E6FAF4",

  income: "#2ECC9A",
  incomeText: "#15704F",
  incomeBg: "#E6FAF4",
  expense: "#FF6B6B",
  expenseText: "#C0392B",
  expenseBg: "#FFF0F0",

  warn: "#F5A623",
  warnBg: "#FEF5E7",
  warnText: "#B7751A",

  textPrimary: "#1A2422",
  textSecondary: "#6B8076",
  textMuted: "#9EB8B0",
  textOnDark: "#FFFFFF",
  textOnDarkMuted: "#A8C4BC",
  textOnDarkDeep: "#6A8E87",

  border: "#E8EFED",
  inputBg: "#F0F5F3",
  shadow: "#1A2422",
};

const SP = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32, xxl: 48 };
const R = { sm: 10, md: 16, lg: 24, xl: 32 };

const fmtVND = (n: number) => n.toLocaleString("vi-VN") + " đ";

// ─── Mock data ────────────────────────────────────────────────────────────────
const HEALTH_SCORE = 72;

function scoreBand(score: number, lang: "vi" | "en") {
  if (score >= 80) return { label: lang === "vi" ? "Xuất sắc" : "Excellent", color: COLORS.income };
  if (score >= 60) return { label: lang === "vi" ? "Tốt"      : "Good",      color: COLORS.warn };
  return              { label: lang === "vi" ? "Cần cải thiện" : "Needs Work", color: COLORS.expense };
}

interface InsightCard {
  id: string;
  emoji: string;
  titleVi: string; titleEn: string;
  bodyVi:  string; bodyEn:  string;
  tag: "positive" | "warning" | "neutral";
}

const INSIGHTS: InsightCard[] = [
  {
    id: "1", emoji: "📊",
    titleVi: "Chi tiêu tháng này",     titleEn: "This Month's Spending",
    bodyVi:  "Bạn đã chi 1.840.000 đ — ít hơn 12% so với tháng trước. Tiếp tục như vậy!",
    bodyEn:  "You've spent 1,840,000 đ — 12% less than last month. Keep it up!",
    tag: "positive",
  },
  {
    id: "2", emoji: "⚠️",
    titleVi: "Ăn uống tăng mạnh",      titleEn: "Food Spending Up",
    bodyVi:  "Chi phí ăn uống tăng 35% so với T4. Hãy thử nấu ăn ở nhà nhiều hơn.",
    bodyEn:  "Food costs are up 35% vs April. Try cooking at home more often.",
    tag: "warning",
  },
  {
    id: "3", emoji: "🎯",
    titleVi: "Gần đạt mục tiêu",       titleEn: "Goal Within Reach",
    bodyVi:  "Quỹ khẩn cấp của bạn đạt 68%. Chỉ cần thêm 960.000 đ/tháng.",
    bodyEn:  "Your emergency fund is at 68%. Just 960,000 đ/month more to finish.",
    tag: "neutral",
  },
];

interface SpendCat {
  emoji: string; vi: string; en: string;
  amount: number; pct: number; color: string;
}

const SPEND_CATS: SpendCat[] = [
  { emoji: "🍜", vi: "Ăn uống",   en: "Food",      amount: 650_000, pct: 35, color: "#FF6B6B" },
  { emoji: "🛍️", vi: "Mua sắm",   en: "Shopping",  amount: 520_000, pct: 28, color: "#F5A623" },
  { emoji: "📑", vi: "Hóa đơn",   en: "Bills",     amount: 370_000, pct: 20, color: "#4ECDC4" },
  { emoji: "🚌", vi: "Di chuyển", en: "Transport", amount: 185_000, pct: 10, color: "#A78BFA" },
  { emoji: "💊", vi: "Sức khỏe",  en: "Health",    amount: 115_000, pct:  6, color: "#2ECC9A" },
];

interface Tip { id: string; emoji: string; vi: string; en: string; }

const TIPS: Tip[] = [
  {
    id: "t1", emoji: "🥗",
    vi: "Chuẩn bị bữa ăn vào Chủ nhật có thể tiết kiệm tới 800.000 đ/tháng.",
    en: "Meal-prepping on Sundays could save you up to 800,000 đ/month.",
  },
  {
    id: "t2", emoji: "📱",
    vi: "Hủy các đăng ký không dùng — bạn có 3 ứng dụng chưa mở trong 60 ngày.",
    en: "Cancel unused subscriptions — you have 3 apps unopened in 60 days.",
  },
  {
    id: "t3", emoji: "💰",
    vi: "Chuyển 10% lương mỗi tháng sang tài khoản tiết kiệm ngay khi nhận lương.",
    en: "Transfer 10% of your salary to savings the day you receive it.",
  },
];

const PRESETS = [
  { vi: "Tôi đang chi tiêu như thế nào?", en: "How am I spending?" },
  { vi: "Tôi có thể tiết kiệm thêm không?", en: "Can I save more?" },
  { vi: "Đề xuất ngân sách tháng tới",     en: "Suggest next month's budget" },
];

// ─── Sub-components ───────────────────────────────────────────────────────────
function InsightCardView({ card, lang }: { card: InsightCard; lang: "vi" | "en" }) {
  const bg     = card.tag === "positive" ? COLORS.incomeBg : card.tag === "warning" ? COLORS.warnBg : "#F0F5F3";
  const border = card.tag === "positive" ? COLORS.income   : card.tag === "warning" ? COLORS.warn   : COLORS.border;

  return (
    <View style={[styles.insightCard, { backgroundColor: bg, borderColor: border }]}>
      <Text style={styles.insightEmoji}>{card.emoji}</Text>
      <Text style={styles.insightTitle}>{lang === "vi" ? card.titleVi : card.titleEn}</Text>
      <Text style={styles.insightBody}>{lang === "vi" ? card.bodyVi  : card.bodyEn}</Text>
    </View>
  );
}

function SpendRow({ cat, last, lang }: { cat: SpendCat; last: boolean; lang: "vi" | "en" }) {
  return (
    <View style={[styles.spendRow, !last && styles.spendRowBorder]}>
      <Text style={styles.spendEmoji}>{cat.emoji}</Text>
      <View style={styles.spendInfo}>
        <Text style={styles.spendName}>{lang === "vi" ? cat.vi : cat.en}</Text>
        <View style={styles.spendBarTrack}>
          <View style={[styles.spendBarFill, { width: `${cat.pct}%` as any, backgroundColor: cat.color }]} />
        </View>
      </View>
      <View style={styles.spendRight}>
        <Text style={styles.spendAmt}>{fmtVND(cat.amount)}</Text>
        <Text style={styles.spendPct}>{cat.pct}%</Text>
      </View>
    </View>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────
export default function AIAssistantScreen() {
  const { lang } = useLanguage();
  const [query, setQuery] = useState("");
  const band = scoreBand(HEALTH_SCORE, lang);

  const s = (vi: string, en: string) => lang === "vi" ? vi : en;

  const handleSend = () => setQuery("");

  const totalSpend = SPEND_CATS.reduce((sum, c) => sum + c.amount, 0);

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.heroBg} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.scrollContent}
      >
        {/* ════ HERO ════ */}
        <View style={styles.hero}>
          <View style={styles.aiBadge}>
            <Text style={styles.aiBadgeText}>
              ✦ {s("Trợ lý AI", "AI Advisor")}
            </Text>
          </View>

          <Text style={styles.heroTitle}>
            {s("Tổng quan Tài chính", "Financial Snapshot")}
          </Text>

          {/* Health score */}
          <View style={styles.scoreRow}>
            <View style={styles.scoreLeft}>
              <Text style={[styles.scoreNumber, { color: band.color }]}>{HEALTH_SCORE}</Text>
              <Text style={styles.scoreOutOf}>/100</Text>
            </View>
            <View style={styles.scoreRight}>
              <Text style={[styles.scoreBandText, { color: band.color }]}>{band.label}</Text>
              <Text style={styles.scoreDesc}>
                {s("Điểm sức khỏe tài chính", "Financial health score")}
              </Text>
              <View style={styles.scoreBarRow}>
                {Array.from({ length: 10 }).map((_, i) => (
                  <View
                    key={i}
                    style={[
                      styles.scoreBarSeg,
                      i < Math.round(HEALTH_SCORE / 10)
                        ? { backgroundColor: band.color }
                        : { backgroundColor: COLORS.heroDeep },
                    ]}
                  />
                ))}
              </View>
            </View>
          </View>

          {/* Key stats */}
          <View style={styles.heroStats}>
            <View style={styles.heroStat}>
              <Text style={styles.heroStatVal}>18%</Text>
              <Text style={styles.heroStatLbl}>{s("Tiết kiệm", "Savings rate")}</Text>
            </View>
            <View style={styles.heroStatDivider} />
            <View style={styles.heroStat}>
              <Text style={[styles.heroStatVal, { color: COLORS.expense }]}>+35%</Text>
              <Text style={styles.heroStatLbl}>{s("Ăn uống", "Food vs last mo.")}</Text>
            </View>
            <View style={styles.heroStatDivider} />
            <View style={styles.heroStat}>
              <Text style={styles.heroStatVal}>{s("T8/25", "Aug/25")}</Text>
              <Text style={styles.heroStatLbl}>{s("Mục tiêu", "Goal ETA")}</Text>
            </View>
          </View>
        </View>

        {/* ════ INSIGHT CARDS (horizontal scroll) ════ */}
        <View style={styles.sectionOuter}>
          <Text style={styles.sectionTitle}>
            {s("Phân tích AI", "AI Insights")}
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.insightScrollContent}
          >
            {INSIGHTS.map((card) => (
              <InsightCardView key={card.id} card={card} lang={lang} />
            ))}
          </ScrollView>
        </View>

        {/* ════ SPENDING BREAKDOWN ════ */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>
            {s("Phân bổ chi tiêu", "Spending Breakdown")}
          </Text>
          <Text style={styles.cardSub}>
            {s("Tháng 5, 2025", "May 2025")} — {s("Tổng:", "Total:")} {fmtVND(totalSpend)}
          </Text>
          {SPEND_CATS.map((cat, i) => (
            <SpendRow key={cat.en} cat={cat} last={i === SPEND_CATS.length - 1} lang={lang} />
          ))}
        </View>

        {/* ════ AI TIPS ════ */}
        <View style={styles.card}>
          <View style={styles.tipsHeader}>
            <Text style={styles.cardTitle}>
              {s("Gợi ý từ AI", "AI Recommendations")}
            </Text>
            <View style={styles.tipsBadge}>
              <Text style={styles.tipsBadgeText}>{TIPS.length} tips</Text>
            </View>
          </View>

          {TIPS.map((tip, i) => (
            <View key={tip.id} style={[styles.tipRow, i < TIPS.length - 1 && styles.tipRowBorder]}>
              <View style={styles.tipEmojiWrap}>
                <Text style={styles.tipEmoji}>{tip.emoji}</Text>
              </View>
              <Text style={styles.tipText}>{lang === "vi" ? tip.vi : tip.en}</Text>
            </View>
          ))}
        </View>

        {/* ════ CONSULT AI ════ */}
        <View style={styles.consultCard}>
          <View style={styles.consultHeader}>
            <View style={styles.consultAIIcon}>
              <Text style={styles.consultAIIconText}>✦</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.consultTitle}>
                {s("Tư vấn AI", "Ask AI Advisor")}
              </Text>
              <Text style={styles.consultSub}>
                {s(
                  "Đặt câu hỏi về tài chính của bạn",
                  "Ask anything about your finances",
                )}
              </Text>
            </View>
          </View>

          {/* Preset chips */}
          <View style={styles.presetRow}>
            {PRESETS.map((p, i) => (
              <TouchableOpacity
                key={i}
                style={styles.presetChip}
                onPress={() => setQuery(lang === "vi" ? p.vi : p.en)}
                activeOpacity={0.75}
              >
                <Text style={styles.presetText}>{lang === "vi" ? p.vi : p.en}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Input */}
          <View style={styles.inputRow}>
            <TextInput
              style={styles.consultInput}
              placeholder={s(
                "Nhập câu hỏi của bạn...",
                "Type your question...",
              )}
              placeholderTextColor={COLORS.textOnDarkMuted}
              value={query}
              onChangeText={setQuery}
            />
            <TouchableOpacity
              style={[styles.sendBtn, !query.trim() && styles.sendBtnDisabled]}
              onPress={handleSend}
              activeOpacity={0.8}
              disabled={!query.trim()}
            >
              <Text style={styles.sendBtnText}>↑</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.disclaimer}>
            ✦ Powered by Claude AI · Anthropic{"\n"}
            {s(
              "Chỉ mang tính tham khảo — không phải tư vấn tài chính chuyên nghiệp.",
              "For reference only — not professional financial advice.",
            )}
          </Text>
        </View>

        <View style={{ height: SP.xxl }} />
      </ScrollView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.pageBg },
  scrollContent: { paddingBottom: 120 },

  // ── Hero ────────────────────────────────────────────────────────────────────
  hero: {
    backgroundColor: COLORS.heroBg,
    paddingTop: Platform.OS === "ios" ? 58 : 46,
    paddingHorizontal: SP.lg,
    paddingBottom: SP.xl,
    borderBottomLeftRadius: R.xl,
    borderBottomRightRadius: R.xl,
  },
  aiBadge: {
    alignSelf: "flex-start",
    backgroundColor: COLORS.accent,
    paddingHorizontal: SP.sm + 4,
    paddingVertical: SP.xs + 1,
    borderRadius: R.xl,
    marginBottom: SP.md,
  },
  aiBadgeText: {
    color: COLORS.heroBg,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.4,
  },
  heroTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: COLORS.textOnDark,
    marginBottom: SP.lg,
    letterSpacing: -0.3,
  },

  scoreRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.heroSub,
    borderRadius: R.md,
    padding: SP.md,
    marginBottom: SP.md,
    gap: SP.md,
  },
  scoreLeft: {
    flexDirection: "row",
    alignItems: "flex-end",
    flexShrink: 0,
  },
  scoreNumber: {
    fontSize: 52,
    fontWeight: "800",
    lineHeight: 58,
    letterSpacing: -2,
  },
  scoreOutOf: {
    fontSize: 16,
    color: COLORS.textOnDarkMuted,
    fontWeight: "600",
    marginBottom: 8,
  },
  scoreRight: { flex: 1, gap: SP.xs },
  scoreBandText: { fontSize: 14, fontWeight: "800", lineHeight: 20 },
  scoreDesc: {
    fontSize: 10,
    color: COLORS.textOnDarkMuted,
    lineHeight: 15,
    fontWeight: "400",
  },
  scoreBarRow: { flexDirection: "row", gap: 3, marginTop: SP.xs },
  scoreBarSeg: { flex: 1, height: 6, borderRadius: 3 },

  heroStats: {
    flexDirection: "row",
    backgroundColor: COLORS.heroSub,
    borderRadius: R.md,
    paddingVertical: SP.md,
  },
  heroStat: { flex: 1, alignItems: "center" },
  heroStatVal: {
    fontSize: 18,
    fontWeight: "800",
    color: COLORS.textOnDark,
  },
  heroStatLbl: {
    fontSize: 9,
    color: COLORS.textOnDarkMuted,
    fontWeight: "500",
    textAlign: "center",
    marginTop: 3,
  },
  heroStatDivider: {
    width: 1,
    height: 34,
    alignSelf: "center",
    backgroundColor: "#2E4A44",
  },

  // ── Shared card ──────────────────────────────────────────────────────────────
  card: {
    backgroundColor: COLORS.cardBg,
    marginHorizontal: SP.md,
    marginTop: SP.md,
    borderRadius: R.lg,
    padding: SP.lg,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.textPrimary,
    marginBottom: SP.xs,
  },
  cardSub: {
    fontSize: 11,
    color: COLORS.textMuted,
    fontWeight: "500",
    marginBottom: SP.md,
  },

  // ── Insight cards ────────────────────────────────────────────────────────────
  sectionOuter: { marginTop: SP.md },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.textPrimary,
    marginBottom: SP.sm,
    paddingHorizontal: SP.md,
  },
  insightScrollContent: {
    paddingHorizontal: SP.md,
    gap: SP.sm,
    flexDirection: "row",
    paddingBottom: SP.sm,
  },
  insightCard: {
    width: 220,
    borderRadius: R.lg,
    padding: SP.md,
    borderWidth: 1.5,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  insightEmoji: { fontSize: 24, marginBottom: SP.sm },
  insightTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: COLORS.textPrimary,
    marginBottom: SP.xs,
  },
  insightBody: {
    fontSize: 12,
    color: COLORS.textSecondary,
    lineHeight: 18,
  },

  // ── Spending rows ────────────────────────────────────────────────────────────
  spendRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: SP.sm + 4,
    gap: SP.sm,
  },
  spendRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  spendEmoji: { fontSize: 20, flexShrink: 0 },
  spendInfo: { flex: 1 },
  spendName: {
    fontSize: 12,
    fontWeight: "700",
    color: COLORS.textPrimary,
    marginBottom: SP.xs,
  },
  spendBarTrack: {
    height: 5,
    backgroundColor: COLORS.border,
    borderRadius: 3,
    overflow: "hidden",
  },
  spendBarFill: { height: "100%", borderRadius: 3 },
  spendRight: { alignItems: "flex-end", flexShrink: 0 },
  spendAmt: { fontSize: 11, fontWeight: "700", color: COLORS.textPrimary },
  spendPct: {
    fontSize: 10,
    color: COLORS.textMuted,
    fontWeight: "500",
    marginTop: 1,
  },

  // ── Tips ─────────────────────────────────────────────────────────────────────
  tipsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: SP.xs,
  },
  tipsBadge: {
    backgroundColor: COLORS.accentSoft,
    paddingHorizontal: SP.sm,
    paddingVertical: 2,
    borderRadius: R.xl,
  },
  tipsBadgeText: { fontSize: 11, fontWeight: "700", color: COLORS.incomeText },
  tipRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingVertical: SP.md,
    gap: SP.sm,
  },
  tipRowBorder: { borderBottomWidth: 1, borderBottomColor: COLORS.border },
  tipEmojiWrap: {
    width: 36,
    height: 36,
    borderRadius: R.sm,
    backgroundColor: COLORS.accentSoft,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  tipEmoji: { fontSize: 18 },
  tipText: {
    flex: 1,
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.textPrimary,
    lineHeight: 19,
  },

  // ── Consult AI ───────────────────────────────────────────────────────────────
  consultCard: {
    backgroundColor: COLORS.heroBg,
    marginHorizontal: SP.md,
    marginTop: SP.md,
    borderRadius: R.lg,
    padding: SP.lg,
    shadowColor: COLORS.heroBg,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 8,
  },
  consultHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: SP.md,
    marginBottom: SP.lg,
  },
  consultAIIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.accent,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  consultAIIconText: { fontSize: 20, color: COLORS.heroBg, fontWeight: "800" },
  consultTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: COLORS.textOnDark,
    marginBottom: 2,
  },
  consultSub: {
    fontSize: 11,
    color: COLORS.textOnDarkMuted,
    lineHeight: 16,
    fontWeight: "400",
  },

  presetRow: { gap: SP.sm, marginBottom: SP.md },
  presetChip: {
    backgroundColor: COLORS.heroSub,
    borderRadius: R.md,
    paddingHorizontal: SP.md,
    paddingVertical: SP.sm,
    borderWidth: 1,
    borderColor: "#2E4A44",
  },
  presetText: { fontSize: 12, fontWeight: "600", color: COLORS.textOnDark },

  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: SP.sm,
    marginBottom: SP.md,
  },
  consultInput: {
    flex: 1,
    backgroundColor: COLORS.heroSub,
    borderRadius: R.md,
    paddingHorizontal: SP.md,
    paddingVertical: SP.sm + 4,
    fontSize: 14,
    color: COLORS.textOnDark,
    borderWidth: 1,
    borderColor: "#2E4A44",
  },
  sendBtn: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: COLORS.accent,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  sendBtnDisabled: { opacity: 0.4 },
  sendBtnText: { fontSize: 20, color: COLORS.heroBg, fontWeight: "800" },

  disclaimer: {
    fontSize: 9,
    color: COLORS.textOnDarkDeep,
    lineHeight: 14,
    textAlign: "center",
    fontWeight: "400",
    letterSpacing: 0.1,
  },
});
