// src/app/settings.tsx — Tab 4: Cài đặt / Settings
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Lang, useLanguage } from "../context/LanguageContext";
import * as api from "../api/client";

// ─── Design tokens ────────────────────────────────────────────────────────────
const COLORS = {
  pageBg: "#F5F7F6", cardBg: "#FFFFFF", heroBg: "#1A2E2A", heroSub: "#243D38",
  accent: "#2ECC9A", accentDeep: "#1BAA7E", accentSoft: "#E6FAF4", accentText: "#15704F",
  textPrimary: "#1A2422", textSecondary: "#6B8076", textMuted: "#9EB8B0",
  textOnDark: "#FFFFFF", textOnDarkMuted: "#A8C4BC",
  border: "#E8EFED", inputBg: "#F0F5F3", inputBorder: "#DDE8E5", shadow: "#1A2422",
  langActive: "#1A2E2A", langInactive: "#F0F5F3",
  destructive: "#FF6B6B", rowHover: "#F8FAFA",
};

const SP = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32, xxl: 48 };
const R  = { sm: 10, md: 16, lg: 24, xl: 32 };

// ─── Sub-components ───────────────────────────────────────────────────────────
function ProfileField({
  label, value, placeholder, onChange, editing,
  keyboardType = "default",
}: {
  label: string; value: string; placeholder: string;
  onChange: (v: string) => void; editing: boolean;
  keyboardType?: "default" | "email-address" | "numeric";
}) {
  return (
    <View style={pStyles.fieldWrap}>
      <Text style={pStyles.fieldLabel}>{label}</Text>
      {editing ? (
        <TextInput
          style={pStyles.fieldInput}
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
        <Text style={pStyles.fieldValue} numberOfLines={1}>{value || placeholder}</Text>
      )}
    </View>
  );
}

const pStyles = StyleSheet.create({
  fieldWrap:  { marginBottom: SP.md },
  fieldLabel: { fontSize: 11, fontWeight: "700", color: COLORS.textMuted, letterSpacing: 0.4, marginBottom: SP.xs + 2, textTransform: "uppercase" },
  fieldValue: { fontSize: 15, fontWeight: "600", color: COLORS.textPrimary, paddingVertical: SP.sm },
  fieldInput: { fontSize: 15, fontWeight: "600", color: COLORS.textPrimary, backgroundColor: COLORS.inputBg, borderRadius: R.sm, borderWidth: 1.5, borderColor: COLORS.inputBorder, paddingHorizontal: SP.md, paddingVertical: SP.sm + 4 },
});

function InfoRow({ emoji, label, value, last, onPress }: {
  emoji: string; label: string; value?: string; last?: boolean; onPress?: () => void;
}) {
  return (
    <TouchableOpacity
      style={[iStyles.row, !last && iStyles.rowBorder]}
      onPress={onPress}
      activeOpacity={onPress ? 0.7 : 1}
    >
      <View style={iStyles.emojiWrap}><Text style={iStyles.emoji}>{emoji}</Text></View>
      <Text style={iStyles.label}>{label}</Text>
      {value && <Text style={iStyles.value}>{value}</Text>}
      {onPress && <Text style={iStyles.chevron}>›</Text>}
    </TouchableOpacity>
  );
}

const iStyles = StyleSheet.create({
  row:       { flexDirection: "row", alignItems: "center", paddingVertical: SP.md, gap: SP.sm },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: COLORS.border },
  emojiWrap: { width: 34, height: 34, borderRadius: R.sm, backgroundColor: COLORS.accentSoft, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  emoji:     { fontSize: 16 },
  label:     { flex: 1, fontSize: 14, fontWeight: "600", color: COLORS.textPrimary },
  value:     { fontSize: 12, color: COLORS.textMuted, fontWeight: "500", maxWidth: 180, textAlign: "right" },
  chevron:   { fontSize: 18, color: COLORS.textMuted, marginLeft: SP.xs },
});

function LanguageToggle({ current, onChange, viLabel, enLabel }: {
  current: Lang; onChange: (l: Lang) => void; viLabel: string; enLabel: string;
}) {
  const anim = useRef(new Animated.Value(current === "vi" ? 0 : 1)).current;

  const select = (lang: Lang) => {
    onChange(lang);
    Animated.spring(anim, { toValue: lang === "vi" ? 0 : 1, useNativeDriver: false, friction: 8, tension: 80 }).start();
  };

  const TOGGLE_W = 280;
  const PILL_W   = TOGGLE_W / 2 - 4;
  const pillLeft  = anim.interpolate({ inputRange: [0, 1], outputRange: [4, TOGGLE_W / 2] });

  return (
    <View style={[ltStyles.track, { width: TOGGLE_W }]}>
      <Animated.View style={[ltStyles.pill, { left: pillLeft, width: PILL_W }]} />
      <TouchableOpacity style={[ltStyles.option, { width: TOGGLE_W / 2 }]} onPress={() => select("vi")} activeOpacity={0.8}>
        <Text style={[ltStyles.optText, current === "vi" && ltStyles.optTextActive]}>{viLabel}</Text>
      </TouchableOpacity>
      <TouchableOpacity style={[ltStyles.option, { width: TOGGLE_W / 2 }]} onPress={() => select("en")} activeOpacity={0.8}>
        <Text style={[ltStyles.optText, current === "en" && ltStyles.optTextActive]}>{enLabel}</Text>
      </TouchableOpacity>
    </View>
  );
}

const ltStyles = StyleSheet.create({
  track:        { height: 46, backgroundColor: "#EBF2F0", borderRadius: R.xl, flexDirection: "row", alignItems: "center", position: "relative", overflow: "hidden" },
  pill:         { position: "absolute", top: 4, height: 38, backgroundColor: COLORS.langActive, borderRadius: R.xl - 2, zIndex: 0 },
  option:       { height: "100%" as any, alignItems: "center", justifyContent: "center", zIndex: 1 },
  optText:      { fontSize: 13, fontWeight: "700", color: COLORS.textSecondary, letterSpacing: 0.1 },
  optTextActive: { color: "#FFFFFF" },
});

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={secStyles.wrapper}>
      <Text style={secStyles.title}>{title}</Text>
      <View style={secStyles.card}>{children}</View>
    </View>
  );
}

const secStyles = StyleSheet.create({
  wrapper: { marginHorizontal: SP.md, marginTop: SP.lg },
  title:   { fontSize: 12, fontWeight: "800", color: COLORS.textMuted, letterSpacing: 0.8, textTransform: "uppercase", marginBottom: SP.sm, paddingLeft: SP.xs },
  card:    { backgroundColor: COLORS.cardBg, borderRadius: R.lg, paddingHorizontal: SP.lg, paddingTop: SP.md, paddingBottom: SP.xs, shadowColor: COLORS.shadow, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 3 },
});

// ─── Main screen ──────────────────────────────────────────────────────────────
export default function SettingsScreen() {
  const { lang, setLang, t } = useLanguage();

  // ── Profile state từ API
  const [name,    setName]    = useState("");
  const [email,   setEmail]   = useState("");
  const [editing, setEditing] = useState(false);

  // ── UI states
  const [loading,    setLoading]    = useState(true);
  const [saving,     setSaving]     = useState(false);
  const [justSaved,  setJustSaved]  = useState(false);
  const [clearLoading, setClearLoading] = useState(false);

  // ── Load profile on mount
  useEffect(() => {
    (async () => {
      try {
        const profile = await api.getProfile();
        setName(profile.name);
        setEmail(profile.email);
      } catch {
        // Keep defaults
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleSave = async () => {
    Keyboard.dismiss();
    setSaving(true);
    try {
      await api.updateProfile({ name, email });
      setEditing(false);
      setJustSaved(true);
      setTimeout(() => setJustSaved(false), 2000);
    } catch {
      // Silent fail — keep editing open
    } finally {
      setSaving(false);
    }
  };

  const handleClearData = async () => {
    setClearLoading(true);
    try {
      await api.clearAllData();
    } catch {
      // Silent fail
    } finally {
      setClearLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.root, { justifyContent: "center", alignItems: "center" }]}>
        <ActivityIndicator size="large" color={COLORS.accent} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.heroBg} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.scrollContent}
      >
        {/* HERO HEADER */}
        <View style={styles.hero}>
          <Text style={styles.heroSup}>
            {lang === "vi" ? "Cài đặt ứng dụng" : "App Settings"}
          </Text>
          <Text style={styles.heroTitle}>{t.settTitle}</Text>

          <View style={styles.profileRow}>
            <View style={styles.avatarLarge}>
              <Text style={styles.avatarText}>
                {name.split(" ").filter(Boolean).map((w) => w[0]).slice(-2).join("").toUpperCase() || "JD"}
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.heroName}>{name}</Text>
              <Text style={styles.heroEmail}>{email}</Text>
            </View>
            <TouchableOpacity
              style={[styles.editBtn, editing && styles.editBtnActive]}
              onPress={() => setEditing((e) => !e)}
            >
              <Text style={[styles.editBtnText, editing && styles.editBtnTextActive]}>
                {editing ? (lang === "vi" ? "Hủy" : "Cancel") : (lang === "vi" ? "Sửa" : "Edit")}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* SECTION: PROFILE */}
        <Section title={t.settProfile}>
          <ProfileField label={t.settName}  value={name}  placeholder={t.settNamePH}  onChange={setName}  editing={editing} />
          <ProfileField label={t.settEmail} value={email} placeholder={t.settEmailPH} onChange={setEmail} editing={editing} keyboardType="email-address" />
          {editing && (
            <TouchableOpacity style={styles.saveBtn} onPress={handleSave} activeOpacity={0.85} disabled={saving}>
              {saving
                ? <ActivityIndicator color="#FFFFFF" />
                : <Text style={styles.saveBtnText}>{justSaved ? t.settSaved : t.settSave}</Text>
              }
            </TouchableOpacity>
          )}
        </Section>

        {/* SECTION: PREFERENCES */}
        <Section title={t.settPrefs}>
          <View style={styles.langBlock}>
            <View style={styles.langLabelRow}>
              <View style={[iStyles.emojiWrap, { marginRight: SP.sm }]}>
                <Text style={iStyles.emoji}>🌐</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.prefLabel}>{t.settLang}</Text>
                <Text style={styles.prefSub}>{t.settLangSub}</Text>
              </View>
            </View>
            <LanguageToggle current={lang} onChange={setLang} viLabel={t.settViOpt} enLabel={t.settEnOpt} />
            <View style={styles.langActiveBadge}>
              <Text style={styles.langActiveBadgeText}>
                {lang === "vi" ? "✓ Đang dùng: Tiếng Việt" : "✓ Active: English"}
              </Text>
            </View>
          </View>
          <InfoRow emoji="💱" label={t.settCurrency} value={t.settCurrencyVal} last />
        </Section>

        {/* SECTION: APP INFO */}
        <Section title={t.settAppInfo}>
          <InfoRow emoji="📱" label={t.settVersion} value="1.0.0" />
          <InfoRow emoji="🔧" label={t.settBuild}   value="2026.05.28" />
          <InfoRow emoji="🔒" label={t.settPrivacy} onPress={() => {}} />
          <InfoRow emoji="📄" label={t.settTerms}   onPress={() => {}} last />
        </Section>

        {/* DANGER ZONE */}
        <View style={styles.dangerZone}>
          <TouchableOpacity style={styles.dangerBtn} onPress={handleClearData} activeOpacity={0.8} disabled={clearLoading}>
            {clearLoading
              ? <ActivityIndicator color={COLORS.destructive} />
              : <Text style={styles.dangerBtnText}>
                  {lang === "vi" ? "🗑️  Xóa tất cả dữ liệu" : "🗑️  Clear All Data"}
                </Text>
            }
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>{lang === "vi" ? "Quản lý Tài chính Cá nhân • Phiên bản 1.0.0" : "Personal Finance Manager • Version 1.0.0"}</Text>
          <Text style={styles.footerSub}>{lang === "vi" ? "Được xây dựng với ♥ tại Việt Nam" : "Made with ♥ in Vietnam"}</Text>
        </View>

        <View style={{ height: SP.xxl }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root:          { flex: 1, backgroundColor: COLORS.pageBg },
  scrollContent: { paddingBottom: SP.lg },

  hero: { backgroundColor: COLORS.heroBg, paddingTop: Platform.OS === "ios" ? 58 : 46, paddingHorizontal: SP.lg, paddingBottom: SP.xl, borderBottomLeftRadius: R.xl, borderBottomRightRadius: R.xl },
  heroSup:   { fontSize: 11, color: COLORS.textOnDarkMuted, fontWeight: "500", letterSpacing: 0.3, marginBottom: SP.xs },
  heroTitle: { fontSize: 22, fontWeight: "800", color: COLORS.textOnDark, marginBottom: SP.xl, letterSpacing: -0.3 },

  profileRow:  { flexDirection: "row", alignItems: "center", gap: SP.md, backgroundColor: COLORS.heroSub, borderRadius: R.lg, padding: SP.md },
  avatarLarge: { width: 52, height: 52, borderRadius: 26, backgroundColor: COLORS.accent, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  avatarText:  { fontSize: 18, fontWeight: "800", color: COLORS.textOnDark },
  heroName:    { fontSize: 16, fontWeight: "700", color: COLORS.textOnDark },
  heroEmail:   { fontSize: 12, color: COLORS.textOnDarkMuted, marginTop: 2 },
  editBtn:     { paddingHorizontal: SP.md, paddingVertical: SP.xs + 2, borderRadius: R.xl, backgroundColor: "#2E4A44", borderWidth: 1, borderColor: "#3A5A54", flexShrink: 0 },
  editBtnActive:    { backgroundColor: COLORS.accent, borderColor: COLORS.accent },
  editBtnText:      { fontSize: 12, fontWeight: "700", color: COLORS.textOnDarkMuted },
  editBtnTextActive: { color: COLORS.heroBg },

  saveBtn:     { backgroundColor: COLORS.heroBg, borderRadius: R.md, paddingVertical: SP.sm + 4, alignItems: "center", marginTop: SP.sm, marginBottom: SP.sm, shadowColor: COLORS.heroBg, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 10, elevation: 4 },
  saveBtnText: { fontSize: 15, fontWeight: "800", color: COLORS.textOnDark, letterSpacing: 0.2 },

  langBlock:      { paddingBottom: SP.md, borderBottomWidth: 1, borderBottomColor: COLORS.border, marginBottom: SP.xs },
  langLabelRow:   { flexDirection: "row", alignItems: "center", marginBottom: SP.md },
  prefLabel:      { fontSize: 14, fontWeight: "700", color: COLORS.textPrimary },
  prefSub:        { fontSize: 11, color: COLORS.textMuted, marginTop: 1 },
  langActiveBadge: { alignSelf: "flex-start", backgroundColor: COLORS.accentSoft, paddingHorizontal: SP.sm + 4, paddingVertical: SP.xs, borderRadius: R.xl, marginTop: SP.sm, marginBottom: SP.xs },
  langActiveBadgeText: { fontSize: 11, fontWeight: "700", color: COLORS.accentText },

  dangerZone: { marginHorizontal: SP.md, marginTop: SP.lg },
  dangerBtn:  { backgroundColor: "#FFF0F0", borderRadius: R.lg, paddingVertical: SP.md, alignItems: "center", borderWidth: 1, borderColor: "#FFBCBC" },
  dangerBtnText: { fontSize: 14, fontWeight: "700", color: COLORS.destructive },

  footer:     { alignItems: "center", paddingTop: SP.xl, paddingBottom: SP.md, gap: SP.xs },
  footerText: { fontSize: 12, color: COLORS.textMuted, fontWeight: "500" },
  footerSub:  { fontSize: 11, color: COLORS.border, fontWeight: "400" },
});
