// src/app/settings.tsx — Tab 4: Cài đặt / Settings
import { COLORS, SP, RL as R } from "@/constants/tokens";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useLanguage } from "../context/LanguageContext";
import * as api from "../api/client";
import { ProfileField, InfoRow, LanguageToggle, Section } from "@/components";

// ─── Design tokens ────────────────────────────────────────────────────────────


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
              <View style={[styles.emojiWrap, { marginRight: SP.sm }]}>
                <Text style={styles.emoji}>🌐</Text>
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

  emojiWrap: { width: 34, height: 34, borderRadius: R.sm, backgroundColor: COLORS.accentSoft, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  emoji:     { fontSize: 16 },
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
