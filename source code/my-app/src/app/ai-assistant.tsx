// src/app/ai-assistant.tsx — Tab 3: AI Assistant
import { COLORS, SP, RL as R } from "@/constants/tokens";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
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
import * as api from "../api/client";
import { InsightCardView, SpendRow } from "@/components";

// ─── Design tokens ────────────────────────────────────────────────────────────

const fmtVND = (n: number) => n.toLocaleString("vi-VN") + " đ";

// ─── Types ────────────────────────────────────────────────────────────────────
interface ChatMessage { role: "user" | "ai"; text: string; }

// ─── Helpers ──────────────────────────────────────────────────────────────────
function scoreBand(score: number, lang: "vi" | "en") {
  if (score >= 80) return { label: lang === "vi" ? "Xuất sắc"       : "Excellent",   color: COLORS.income };
  if (score >= 60) return { label: lang === "vi" ? "Tốt"            : "Good",        color: COLORS.warn };
  return               { label: lang === "vi" ? "Cần cải thiện"  : "Needs Work",  color: COLORS.expense };
}


const PRESETS = [
  { vi: "Tôi đang chi tiêu như thế nào?", en: "How am I spending?" },
  { vi: "Tôi có thể tiết kiệm thêm không?", en: "Can I save more?" },
  { vi: "Đề xuất ngân sách tháng tới",     en: "Suggest next month's budget" },
];

// ─── Screen ───────────────────────────────────────────────────────────────────
export default function AIAssistantScreen() {
  const { lang } = useLanguage();
  const s = (vi: string, en: string) => lang === "vi" ? vi : en;

  // ── Data state
  const [overview, setOverview]   = useState<api.AIOverview | null>(null);
  const [loading,  setLoading]    = useState(true);
  const [error,    setError]      = useState<string | null>(null);

  // ── Chat state
  const [query,       setQuery]       = useState("");
  const [messages,    setMessages]    = useState<ChatMessage[]>([]);
  const [aiLoading,   setAiLoading]   = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    (async () => {
      try {
        const data = await api.getAIOverview();
        setOverview(data);
      } catch (e: any) {
        setError(e.message ?? "Không thể tải dữ liệu AI");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleSend = async () => {
    const trimmed = query.trim();
    if (!trimmed || aiLoading) return;

    const userMsg: ChatMessage = { role: "user", text: trimmed };
    setMessages((prev) => [...prev, userMsg]);
    setQuery("");
    setAiLoading(true);

    try {
      const res = await api.chatWithAI(trimmed, lang);
      setMessages((prev) => [...prev, { role: "ai", text: res.reply }]);
    } catch (e: any) {
      setMessages((prev) => [
        ...prev,
        { role: "ai", text: s("Xảy ra lỗi, thử lại nhé.", "Something went wrong, please try again.") },
      ]);
    } finally {
      setAiLoading(false);
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
    }
  };

  // ── Loading screen
  if (loading) {
    return (
      <View style={[styles.root, { justifyContent: "center", alignItems: "center" }]}>
        <ActivityIndicator size="large" color={COLORS.accent} />
      </View>
    );
  }

  // ── Error screen
  if (error || !overview) {
    return (
      <View style={[styles.root, { justifyContent: "center", alignItems: "center", padding: SP.lg }]}>
        <Text style={{ fontSize: 40, marginBottom: SP.md }}>⚠️</Text>
        <Text style={{ fontSize: 15, fontWeight: "700", color: COLORS.textPrimary, textAlign: "center" }}>
          {s("Không thể tải dữ liệu", "Failed to load data")}
        </Text>
        <Text style={{ fontSize: 12, color: COLORS.textSecondary, marginTop: SP.sm, textAlign: "center" }}>
          {error}
        </Text>
      </View>
    );
  }

  const band       = scoreBand(overview.healthScore, lang);
  const totalSpend = overview.spendingBreakdown.reduce((s, c) => s + c.amount, 0);
  const now        = new Date();
  const monthLabel = s(`Tháng ${now.getMonth() + 1}, ${now.getFullYear()}`, `${now.toLocaleString("en", { month: "long" })} ${now.getFullYear()}`);

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.heroBg} />

      <ScrollView
        ref={scrollRef}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.scrollContent}
      >
        {/* HERO */}
        <View style={styles.hero}>
          <View style={styles.aiBadge}>
            <Text style={styles.aiBadgeText}>✦ {s("Trợ lý AI", "AI Advisor")}</Text>
          </View>
          <Text style={styles.heroTitle}>{s("Tổng quan Tài chính", "Financial Snapshot")}</Text>

          {/* Health score */}
          <View style={styles.scoreRow}>
            <View style={styles.scoreLeft}>
              <Text style={[styles.scoreNumber, { color: band.color }]}>{overview.healthScore}</Text>
              <Text style={styles.scoreOutOf}>/100</Text>
            </View>
            <View style={styles.scoreRight}>
              <Text style={[styles.scoreBandText, { color: band.color }]}>{band.label}</Text>
              <Text style={styles.scoreDesc}>{s("Điểm sức khoẻ tài chính", "Financial health score")}</Text>
              <View style={styles.scoreBarRow}>
                {Array.from({ length: 10 }).map((_, i) => (
                  <View
                    key={i}
                    style={[
                      styles.scoreBarSeg,
                      i < Math.round(overview.healthScore / 10)
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
              <Text style={styles.heroStatVal}>{overview.savingsRate}%</Text>
              <Text style={styles.heroStatLbl}>{s("Tiết kiệm", "Savings rate")}</Text>
            </View>
            <View style={styles.heroStatDivider} />
            <View style={styles.heroStat}>
              <Text style={styles.heroStatVal}>{fmtVND(overview.totalIncome)}</Text>
              <Text style={styles.heroStatLbl}>{s("Thu nhập", "Income")}</Text>
            </View>
            <View style={styles.heroStatDivider} />
            <View style={styles.heroStat}>
              <Text style={[styles.heroStatVal, { color: COLORS.expense }]}>{fmtVND(overview.totalExpense)}</Text>
              <Text style={styles.heroStatLbl}>{s("Chi tiêu", "Expense")}</Text>
            </View>
          </View>
        </View>

        {/* INSIGHT CARDS */}
        {overview.insights.length > 0 && (
          <View style={styles.sectionOuter}>
            <Text style={styles.sectionTitle}>{s("Phân tích AI", "AI Insights")}</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.insightScrollContent}
            >
              {overview.insights.map((card) => (
                <InsightCardView key={card.id} card={card} lang={lang} />
              ))}
            </ScrollView>
          </View>
        )}

        {/* SPENDING BREAKDOWN */}
        {overview.spendingBreakdown.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>{s("Phân bổ chi tiêu", "Spending Breakdown")}</Text>
            <Text style={styles.cardSub}>{monthLabel} — {s("Tổng:", "Total:")} {fmtVND(totalSpend)}</Text>
            {overview.spendingBreakdown.map((cat, i) => (
              <SpendRow key={cat.en} cat={cat} last={i === overview.spendingBreakdown.length - 1} lang={lang} />
            ))}
          </View>
        )}

        {/* AI CHAT */}
        <View style={styles.consultCard}>
          <View style={styles.consultHeader}>
            <View style={styles.consultAIIcon}>
              <Text style={styles.consultAIIconText}>✦</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.consultTitle}>{s("Tư vấn AI", "Ask AI Advisor")}</Text>
              <Text style={styles.consultSub}>{s("Đặt câu hỏi về tài chính của bạn", "Ask anything about your finances")}</Text>
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

          {/* Conversation messages */}
          {messages.length > 0 && (
            <View style={styles.messagesWrap}>
              {messages.map((msg, i) => (
                <View
                  key={i}
                  style={[
                    styles.msgBubble,
                    msg.role === "user" ? styles.msgBubbleUser : styles.msgBubbleAI,
                  ]}
                >
                  <Text style={msg.role === "user" ? styles.msgTextUser : styles.msgTextAI}>
                    {msg.text}
                  </Text>
                </View>
              ))}
              {aiLoading && (
                <View style={[styles.msgBubble, styles.msgBubbleAI]}>
                  <ActivityIndicator size="small" color={COLORS.accent} />
                </View>
              )}
            </View>
          )}

          {/* Input row */}
          <View style={styles.inputRow}>
            <TextInput
              style={styles.consultInput}
              placeholder={s("Nhập câu hỏi của bạn...", "Type your question...")}
              placeholderTextColor={COLORS.textOnDarkMuted}
              value={query}
              onChangeText={setQuery}
              onSubmitEditing={handleSend}
              returnKeyType="send"
            />
            <TouchableOpacity
              style={[styles.sendBtn, (!query.trim() || aiLoading) && styles.sendBtnDisabled]}
              onPress={handleSend}
              activeOpacity={0.8}
              disabled={!query.trim() || aiLoading}
            >
              {aiLoading
                ? <ActivityIndicator size="small" color={COLORS.heroBg} />
                : <Text style={styles.sendBtnText}>↑</Text>
              }
            </TouchableOpacity>
          </View>

          <Text style={styles.disclaimer}>
            ✦ Powered by Gemini AI · Google{"\n"}
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
  root:          { flex: 1, backgroundColor: COLORS.pageBg },
  scrollContent: { paddingBottom: 120 },

  hero: {
    backgroundColor: COLORS.heroBg,
    paddingTop: Platform.OS === "ios" ? 58 : 46,
    paddingHorizontal: SP.lg, paddingBottom: SP.xl,
    borderBottomLeftRadius: R.xl, borderBottomRightRadius: R.xl,
  },
  aiBadge:     { alignSelf: "flex-start", backgroundColor: COLORS.accent, paddingHorizontal: SP.sm + 4, paddingVertical: SP.xs + 1, borderRadius: R.xl, marginBottom: SP.md },
  aiBadgeText: { color: COLORS.heroBg, fontSize: 11, fontWeight: "800", letterSpacing: 0.4 },
  heroTitle:   { fontSize: 22, fontWeight: "800", color: COLORS.textOnDark, marginBottom: SP.lg, letterSpacing: -0.3 },

  scoreRow:      { flexDirection: "row", alignItems: "center", backgroundColor: COLORS.heroSub, borderRadius: R.md, padding: SP.md, marginBottom: SP.md, gap: SP.md },
  scoreLeft:     { flexDirection: "row", alignItems: "flex-end", flexShrink: 0 },
  scoreNumber:   { fontSize: 52, fontWeight: "800", lineHeight: 58, letterSpacing: -2 },
  scoreOutOf:    { fontSize: 16, color: COLORS.textOnDarkMuted, fontWeight: "600", marginBottom: 8 },
  scoreRight:    { flex: 1, gap: SP.xs },
  scoreBandText: { fontSize: 14, fontWeight: "800", lineHeight: 20 },
  scoreDesc:     { fontSize: 10, color: COLORS.textOnDarkMuted, lineHeight: 15, fontWeight: "400" },
  scoreBarRow:   { flexDirection: "row", gap: 3, marginTop: SP.xs },
  scoreBarSeg:   { flex: 1, height: 6, borderRadius: 3 },

  heroStats:       { flexDirection: "row", backgroundColor: COLORS.heroSub, borderRadius: R.md, paddingVertical: SP.md },
  heroStat:        { flex: 1, alignItems: "center" },
  heroStatVal:     { fontSize: 14, fontWeight: "800", color: COLORS.textOnDark },
  heroStatLbl:     { fontSize: 9, color: COLORS.textOnDarkMuted, fontWeight: "500", textAlign: "center", marginTop: 3 },
  heroStatDivider: { width: 1, height: 34, alignSelf: "center", backgroundColor: "#2E4A44" },

  card:      { backgroundColor: COLORS.cardBg, marginHorizontal: SP.md, marginTop: SP.md, borderRadius: R.lg, padding: SP.lg, shadowColor: COLORS.shadow, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 3 },
  cardTitle: { fontSize: 14, fontWeight: "700", color: COLORS.textPrimary, marginBottom: SP.xs },
  cardSub:   { fontSize: 11, color: COLORS.textMuted, fontWeight: "500", marginBottom: SP.md },

  sectionOuter:        { marginTop: SP.md },
  sectionTitle:        { fontSize: 14, fontWeight: "700", color: COLORS.textPrimary, marginBottom: SP.sm, paddingHorizontal: SP.md },
  insightScrollContent: { paddingHorizontal: SP.md, gap: SP.sm, flexDirection: "row", paddingBottom: SP.sm },

  consultCard: {
    backgroundColor: COLORS.heroBg, marginHorizontal: SP.md, marginTop: SP.md,
    borderRadius: R.lg, padding: SP.lg,
    shadowColor: COLORS.heroBg, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.25, shadowRadius: 16, elevation: 8,
  },
  consultHeader:      { flexDirection: "row", alignItems: "flex-start", gap: SP.md, marginBottom: SP.lg },
  consultAIIcon:      { width: 44, height: 44, borderRadius: 22, backgroundColor: COLORS.accent, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  consultAIIconText:  { fontSize: 20, color: COLORS.heroBg, fontWeight: "800" },
  consultTitle:       { fontSize: 16, fontWeight: "800", color: COLORS.textOnDark, marginBottom: 2 },
  consultSub:         { fontSize: 11, color: COLORS.textOnDarkMuted, lineHeight: 16, fontWeight: "400" },

  presetRow:  { gap: SP.sm, marginBottom: SP.md },
  presetChip: { backgroundColor: COLORS.heroSub, borderRadius: R.md, paddingHorizontal: SP.md, paddingVertical: SP.sm, borderWidth: 1, borderColor: "#2E4A44" },
  presetText: { fontSize: 12, fontWeight: "600", color: COLORS.textOnDark },

  messagesWrap: { marginBottom: SP.md, gap: SP.sm },
  msgBubble:    { maxWidth: "85%", paddingHorizontal: SP.md, paddingVertical: SP.sm + 2, borderRadius: R.md },
  msgBubbleUser: { alignSelf: "flex-end", backgroundColor: COLORS.accent },
  msgBubbleAI:   { alignSelf: "flex-start", backgroundColor: COLORS.heroSub, borderWidth: 1, borderColor: "#2E4A44" },
  msgTextUser:   { fontSize: 13, fontWeight: "600", color: COLORS.heroBg },
  msgTextAI:     { fontSize: 13, fontWeight: "500", color: COLORS.textOnDark, lineHeight: 19 },

  inputRow:      { flexDirection: "row", alignItems: "center", gap: SP.sm, marginBottom: SP.md },
  consultInput:  { flex: 1, backgroundColor: COLORS.heroSub, borderRadius: R.md, paddingHorizontal: SP.md, paddingVertical: SP.sm + 4, fontSize: 14, color: COLORS.textOnDark, borderWidth: 1, borderColor: "#2E4A44" },
  sendBtn:        { width: 46, height: 46, borderRadius: 23, backgroundColor: COLORS.accent, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  sendBtnDisabled: { opacity: 0.4 },
  sendBtnText:    { fontSize: 20, color: COLORS.heroBg, fontWeight: "800" },

  disclaimer: { fontSize: 9, color: COLORS.textOnDarkDeep, lineHeight: 14, textAlign: "center", fontWeight: "400", letterSpacing: 0.1 },
});
