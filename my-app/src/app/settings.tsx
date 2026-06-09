// src/app/settings.tsx — Tab 4: Cài đặt / Settings
import { COLORS, SP, RL as R } from "@/constants/tokens";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Keyboard,
  KeyboardAvoidingView,
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
import * as api from "../api/client";
import { InfoRow, LanguageToggle, Section } from "@/components";
import { useAuth } from "../context/AuthContext";

// ─── Main screen ──────────────────────────────────────────────────────────────
export default function SettingsScreen() {
  const { lang, setLang, t } = useLanguage();
  const { user, updateUser, logout } = useAuth();

  // ── Profile state
  const [name,      setName]      = useState(user?.name ?? "");
  const [editing,   setEditing]   = useState(false);
  const [saving,    setSaving]    = useState(false);
  const [justSaved, setJustSaved] = useState(false);

  // ── Password modal
  const [pwdModal, setPwdModal] = useState(false);

  // ── Danger zone
  const [clearLoading,  setClearLoading]  = useState(false);
  const [logoutLoading, setLogoutLoading] = useState(false);

  // ── Toast animation
  const toastAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (user) setName(user.name);
  }, [user]);

  const showToast = () => {
    toastAnim.setValue(0);
    Animated.sequence([
      Animated.timing(toastAnim, { toValue: 1, duration: 220, useNativeDriver: true }),
      Animated.delay(1600),
      Animated.timing(toastAnim, { toValue: 0, duration: 300, useNativeDriver: true }),
    ]).start();
  };

  const handleSaveName = async () => {
    if (!name.trim()) return;
    Keyboard.dismiss();
    setSaving(true);
    try {
      const result = await api.authUpdateMe({ name: name.trim() });
      await updateUser({ name: result.user.name });
      setEditing(false);
      setJustSaved(true);
      showToast();
      setTimeout(() => setJustSaved(false), 2000);
    } catch { /* keep editing open */ } finally {
      setSaving(false);
    }
  };

  const handleCancelEdit = () => {
    setEditing(false);
    setName(user?.name ?? "");
  };

  const handleClearData = async () => {
    setClearLoading(true);
    try { await api.clearAllData(); } catch { /* silent */ } finally { setClearLoading(false); }
  };

  const handleLogout = async () => {
    setLogoutLoading(true);
    await logout();
  };

  const vi = lang === "vi";

  return (
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.heroBg} />

      {/* Toast */}
      <Animated.View
        pointerEvents="none"
        style={[styles.toast, {
          opacity: toastAnim,
          transform: [{ translateY: toastAnim.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) }],
        }]}
      >
        <Text style={styles.toastText}>✓  {vi ? "Đã lưu thành công" : "Saved successfully"}</Text>
      </Animated.View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.scrollContent}
      >
        {/* HERO */}
        <View style={styles.hero}>
          <Text style={styles.heroSup}>{vi ? "Cài đặt ứng dụng" : "App Settings"}</Text>
          <Text style={styles.heroTitle}>{t.settTitle}</Text>
          <View style={styles.profileRow}>
            <View style={styles.avatarLarge}>
              <Text style={styles.avatarText}>
                {name.split(" ").filter(Boolean).map((w) => w[0]).slice(-2).join("").toUpperCase() || "JD"}
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.heroName}>{name || user?.name}</Text>
              <Text style={styles.heroEmail}>{user?.email}</Text>
            </View>
            {!editing && (
              <TouchableOpacity style={styles.editBtn} onPress={() => setEditing(true)}>
                <Text style={styles.editBtnText}>{vi ? "Sửa" : "Edit"}</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* SECTION: HỒ SƠ */}
        <Section title={t.settProfile}>
          <View style={styles.fieldWrap}>
            <Text style={styles.fieldLabel}>{t.settName}</Text>
            {editing ? (
              <TextInput
                style={styles.fieldInput}
                value={name}
                onChangeText={setName}
                placeholder={t.settNamePH}
                placeholderTextColor={COLORS.textMuted}
                autoCapitalize="words"
                returnKeyType="done"
                onSubmitEditing={handleSaveName}
              />
            ) : (
              <Text style={styles.fieldValue}>{name || t.settNamePH}</Text>
            )}
          </View>

          <View style={[styles.fieldWrap, { marginBottom: SP.xs }]}>
            <Text style={styles.fieldLabel}>{t.settEmail}</Text>
            <Text style={styles.fieldValue}>{user?.email}</Text>
          </View>

          {editing && (
            <View style={styles.editActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={handleCancelEdit} activeOpacity={0.8}>
                <Text style={styles.cancelBtnText}>{vi ? "Hủy" : "Cancel"}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={handleSaveName} activeOpacity={0.85} disabled={saving}>
                {saving
                  ? <ActivityIndicator color="#fff" size="small" />
                  : <Text style={styles.saveBtnText}>{justSaved ? (vi ? "Đã lưu ✓" : "Saved ✓") : t.settSave}</Text>
                }
              </TouchableOpacity>
            </View>
          )}
        </Section>

        {/* SECTION: BẢO MẬT */}
        <Section title={vi ? "Bảo mật" : "Security"}>
          <TouchableOpacity
            style={styles.secRow}
            onPress={() => setPwdModal(true)}
            activeOpacity={0.75}
          >
            <View style={styles.emojiWrap}><Text style={styles.emoji}>🔑</Text></View>
            <Text style={styles.secRowLabel}>{vi ? "Đổi mật khẩu" : "Change Password"}</Text>
            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>
        </Section>

        {/* SECTION: NGÔN NGỮ & TIỀN TỆ */}
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
                {vi ? "✓ Đang dùng: Tiếng Việt" : "✓ Active: English"}
              </Text>
            </View>
          </View>
          <InfoRow emoji="💱" label={t.settCurrency} value={t.settCurrencyVal} last />
        </Section>

        {/* ĐĂNG XUẤT + XÓA DỮ LIỆU */}
        <View style={styles.actionZone}>
          <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.8} disabled={logoutLoading}>
            {logoutLoading
              ? <ActivityIndicator color={COLORS.accent} />
              : <Text style={styles.logoutBtnText}>{vi ? "↩  Đăng xuất" : "↩  Log Out"}</Text>
            }
          </TouchableOpacity>
          <TouchableOpacity style={styles.dangerBtn} onPress={handleClearData} activeOpacity={0.8} disabled={clearLoading}>
            {clearLoading
              ? <ActivityIndicator color={COLORS.destructive} />
              : <Text style={styles.dangerBtnText}>{vi ? "🗑️  Xóa tất cả dữ liệu" : "🗑️  Clear All Data"}</Text>
            }
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>{vi ? "Quản lý Tài chính Cá nhân • Phiên bản 1.0.0" : "Personal Finance Manager • Version 1.0.0"}</Text>
          <Text style={styles.footerSub}>{vi ? "Được xây dựng với ♥ tại Việt Nam" : "Made with ♥ in Vietnam"}</Text>
        </View>
        <View style={{ height: SP.xxl }} />
      </ScrollView>

      {/* ── MODAL: ĐỔI MẬT KHẨU ── */}
      <ChangePasswordModal
        visible={pwdModal}
        lang={lang}
        onClose={() => setPwdModal(false)}
      />
    </KeyboardAvoidingView>
  );
}

// ─── ChangePasswordModal ──────────────────────────────────────────────────────
function ChangePasswordModal({
  visible, lang, onClose,
}: {
  visible: boolean; lang: "vi" | "en"; onClose: () => void;
}) {
  const vi = lang === "vi";

  const [oldPwd,     setOldPwd]     = useState("");
  const [newPwd,     setNewPwd]     = useState("");
  const [confirmPwd, setConfirmPwd] = useState("");
  const [saving,     setSaving]     = useState(false);
  const [error,      setError]      = useState<string | null>(null);
  const [success,    setSuccess]    = useState(false);

  const reset = () => {
    setOldPwd(""); setNewPwd(""); setConfirmPwd("");
    setError(null); setSuccess(false); setSaving(false);
  };

  const handleClose = () => { reset(); onClose(); };

  const handleSubmit = async () => {
    setError(null);
    if (!oldPwd || !newPwd || !confirmPwd) {
      setError(vi ? "Vui lòng điền đầy đủ" : "Please fill in all fields");
      return;
    }
    if (newPwd.length < 6) {
      setError(vi ? "Mật khẩu mới tối thiểu 6 ký tự" : "New password must be at least 6 characters");
      return;
    }
    if (newPwd !== confirmPwd) {
      setError(vi ? "Mật khẩu mới không khớp" : "New passwords do not match");
      return;
    }
    Keyboard.dismiss();
    setSaving(true);
    try {
      await api.authChangePassword({ oldPassword: oldPwd, newPassword: newPwd });
      // Xóa form, hiện thành công rồi đóng modal
      setOldPwd(""); setNewPwd(""); setConfirmPwd("");
      setError(null);
      setSuccess(true);
      setTimeout(() => { setSuccess(false); onClose(); }, 2000);
    } catch (e: any) {
      setError(e.message ?? (vi ? "Đã xảy ra lỗi" : "An error occurred"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView style={modal.root} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <StatusBar barStyle="light-content" backgroundColor={COLORS.heroBg} />

        {/* Header */}
        <View style={modal.header}>
          <TouchableOpacity style={modal.backBtn} onPress={handleClose} activeOpacity={0.75}>
            <Text style={modal.backArrow}>‹</Text>
          </TouchableOpacity>
          <Text style={modal.title}>{vi ? "Đổi mật khẩu" : "Change Password"}</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView
          contentContainerStyle={modal.body}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Text style={modal.hint}>
            {vi
              ? "Nhập mật khẩu hiện tại để xác nhận, sau đó đặt mật khẩu mới."
              : "Enter your current password to confirm, then set a new one."}
          </Text>

          <PwdField
            label={vi ? "Mật khẩu hiện tại" : "Current password"}
            value={oldPwd}
            onChange={setOldPwd}
            placeholder={vi ? "Nhập mật khẩu hiện tại" : "Enter current password"}
          />
          <PwdField
            label={vi ? "Mật khẩu mới" : "New password"}
            value={newPwd}
            onChange={setNewPwd}
            placeholder={vi ? "Tối thiểu 6 ký tự" : "At least 6 characters"}
          />
          <PwdField
            label={vi ? "Nhập lại mật khẩu mới" : "Confirm new password"}
            value={confirmPwd}
            onChange={setConfirmPwd}
            placeholder={vi ? "Nhập lại để xác nhận" : "Re-enter to confirm"}
          />

          {error && (
            <View style={modal.errorBox}>
              <Text style={modal.errorText}>⚠️  {error}</Text>
            </View>
          )}
          {success && (
            <View style={modal.successBox}>
              <Text style={modal.successText}>✓  {vi ? "Đổi mật khẩu thành công!" : "Password changed!"}</Text>
            </View>
          )}

          <TouchableOpacity
            style={[modal.confirmBtn, saving && { opacity: 0.6 }]}
            onPress={handleSubmit}
            activeOpacity={0.85}
            disabled={saving}
          >
            {saving
              ? <ActivityIndicator color="#fff" />
              : <Text style={modal.confirmBtnText}>{vi ? "Xác nhận đổi mật khẩu" : "Confirm Change"}</Text>
            }
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── PwdField — input mật khẩu trong modal ────────────────────────────────────
function PwdField({
  label, value, onChange, placeholder,
}: {
  label: string; value: string; onChange: (v: string) => void; placeholder: string;
}) {
  return (
    <View style={modal.field}>
      <Text style={modal.fieldLabel}>{label}</Text>
      <TextInput
        style={modal.fieldInput}
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={COLORS.textMuted}
        secureTextEntry
        autoCapitalize="none"
        autoCorrect={false}
        returnKeyType="next"
      />
    </View>
  );
}

// ─── Styles: settings screen ──────────────────────────────────────────────────
const styles = StyleSheet.create({
  root:          { flex: 1, backgroundColor: COLORS.pageBg },
  scrollContent: { paddingBottom: SP.lg },

  toast: {
    position: "absolute", top: Platform.OS === "ios" ? 56 : 36,
    alignSelf: "center", zIndex: 99,
    backgroundColor: COLORS.heroBg, borderRadius: R.xl,
    paddingHorizontal: SP.lg, paddingVertical: SP.sm + 2,
    shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.18, shadowRadius: 12, elevation: 8,
  },
  toastText: { fontSize: 13, fontWeight: "700", color: COLORS.accent },

  hero: { backgroundColor: COLORS.heroBg, paddingTop: Platform.OS === "ios" ? 58 : 46, paddingHorizontal: SP.lg, paddingBottom: SP.xl, borderBottomLeftRadius: R.xl, borderBottomRightRadius: R.xl },
  heroSup:   { fontSize: 11, color: COLORS.textOnDarkMuted, fontWeight: "500", letterSpacing: 0.3, marginBottom: SP.xs },
  heroTitle: { fontSize: 22, fontWeight: "800", color: COLORS.textOnDark, marginBottom: SP.xl, letterSpacing: -0.3 },

  profileRow:  { flexDirection: "row", alignItems: "center", gap: SP.md, backgroundColor: COLORS.heroSub, borderRadius: R.lg, padding: SP.md },
  avatarLarge: { width: 52, height: 52, borderRadius: 26, backgroundColor: COLORS.accent, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  avatarText:  { fontSize: 18, fontWeight: "800", color: COLORS.textOnDark },
  heroName:    { fontSize: 16, fontWeight: "700", color: COLORS.textOnDark },
  heroEmail:   { fontSize: 12, color: COLORS.textOnDarkMuted, marginTop: 2 },
  editBtn:     { paddingHorizontal: SP.md, paddingVertical: SP.xs + 2, borderRadius: R.xl, backgroundColor: "#2E4A44", borderWidth: 1, borderColor: "#3A5A54", flexShrink: 0 },
  editBtnText: { fontSize: 12, fontWeight: "700", color: COLORS.textOnDarkMuted },

  fieldWrap:  { marginBottom: SP.md },
  fieldLabel: { fontSize: 11, fontWeight: "700", color: COLORS.textMuted, letterSpacing: 0.4, marginBottom: SP.xs + 2, textTransform: "uppercase" },
  fieldValue: { fontSize: 15, fontWeight: "600", color: COLORS.textPrimary, paddingVertical: SP.sm },
  fieldInput: { fontSize: 15, fontWeight: "600", color: COLORS.textPrimary, backgroundColor: COLORS.inputBg, borderRadius: R.md, borderWidth: 1.5, borderColor: COLORS.inputBorder, paddingHorizontal: SP.md, paddingVertical: SP.sm + 4 },

  editActions:   { flexDirection: "row", gap: SP.sm, marginTop: SP.xs, marginBottom: SP.sm },
  cancelBtn:     { flex: 1, borderRadius: R.md, paddingVertical: SP.sm + 4, alignItems: "center", backgroundColor: COLORS.inputBg, borderWidth: 1.5, borderColor: COLORS.border },
  cancelBtnText: { fontSize: 14, fontWeight: "700", color: COLORS.textSecondary },
  saveBtn:       { flex: 1, backgroundColor: COLORS.heroBg, borderRadius: R.md, paddingVertical: SP.sm + 4, alignItems: "center", shadowColor: COLORS.heroBg, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 4 },
  saveBtnText:   { fontSize: 14, fontWeight: "800", color: COLORS.textOnDark, letterSpacing: 0.1 },

  secRow:      { flexDirection: "row", alignItems: "center", gap: SP.sm, paddingVertical: SP.xs },
  secRowLabel: { flex: 1, fontSize: 14, fontWeight: "600", color: COLORS.textPrimary },
  chevron:     { fontSize: 20, color: COLORS.textMuted },

  emojiWrap: { width: 34, height: 34, borderRadius: R.sm, backgroundColor: COLORS.accentSoft, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  emoji:     { fontSize: 16 },
  langBlock:      { paddingBottom: SP.md, borderBottomWidth: 1, borderBottomColor: COLORS.border, marginBottom: SP.xs },
  langLabelRow:   { flexDirection: "row", alignItems: "center", marginBottom: SP.md },
  prefLabel:      { fontSize: 14, fontWeight: "700", color: COLORS.textPrimary },
  prefSub:        { fontSize: 11, color: COLORS.textMuted, marginTop: 1 },
  langActiveBadge:     { alignSelf: "flex-start", backgroundColor: COLORS.accentSoft, paddingHorizontal: SP.sm + 4, paddingVertical: SP.xs, borderRadius: R.xl, marginTop: SP.sm, marginBottom: SP.xs },
  langActiveBadgeText: { fontSize: 11, fontWeight: "700", color: COLORS.accentText },

  actionZone:    { marginHorizontal: SP.md, marginTop: SP.lg, gap: SP.sm },
  logoutBtn:     { backgroundColor: COLORS.cardBg, borderRadius: R.lg, paddingVertical: SP.md, alignItems: "center", borderWidth: 1.5, borderColor: COLORS.accent },
  logoutBtnText: { fontSize: 14, fontWeight: "700", color: COLORS.accent },
  dangerBtn:     { backgroundColor: "#FFF0F0", borderRadius: R.lg, paddingVertical: SP.md, alignItems: "center", borderWidth: 1, borderColor: "#FFBCBC" },
  dangerBtnText: { fontSize: 14, fontWeight: "700", color: COLORS.destructive },

  footer:     { alignItems: "center", paddingTop: SP.xl, paddingBottom: SP.md, gap: SP.xs },
  footerText: { fontSize: 12, color: COLORS.textMuted, fontWeight: "500" },
  footerSub:  { fontSize: 11, color: COLORS.border, fontWeight: "400" },
});

// ─── Styles: modal ─────────────────────────────────────────────────────────────
const modal = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.pageBg },

  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    backgroundColor: COLORS.heroBg,
    paddingTop: Platform.OS === "ios" ? 56 : 40,
    paddingBottom: SP.md,
    paddingHorizontal: SP.md,
  },
  backBtn:   { width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(255,255,255,0.1)", alignItems: "center", justifyContent: "center" },
  backArrow: { fontSize: 26, color: COLORS.textOnDark, lineHeight: 30, fontWeight: "300", marginTop: -2 },
  title:     { fontSize: 17, fontWeight: "800", color: COLORS.textOnDark, letterSpacing: -0.2 },

  body: { padding: SP.lg, paddingTop: SP.xl },
  hint: { fontSize: 13, color: COLORS.textSecondary, lineHeight: 20, marginBottom: SP.lg },

  field:      { marginBottom: SP.md },
  fieldLabel: { fontSize: 11, fontWeight: "700", color: COLORS.textMuted, letterSpacing: 0.4, marginBottom: SP.xs + 2, textTransform: "uppercase" },
  fieldInput: { fontSize: 15, fontWeight: "600", color: COLORS.textPrimary, backgroundColor: COLORS.inputBg, borderRadius: R.md, borderWidth: 1.5, borderColor: COLORS.inputBorder, paddingHorizontal: SP.md, paddingVertical: SP.sm + 4 },

  errorBox:   { backgroundColor: COLORS.expenseBg, borderRadius: R.md, padding: SP.sm + 2, marginTop: SP.xs, marginBottom: SP.sm, borderWidth: 1, borderColor: COLORS.expenseBorder },
  errorText:  { fontSize: 13, color: COLORS.expenseText, fontWeight: "600" },
  successBox: { backgroundColor: COLORS.incomeBg, borderRadius: R.md, padding: SP.sm + 2, marginTop: SP.xs, marginBottom: SP.sm, borderWidth: 1, borderColor: COLORS.incomeBorder },
  successText:{ fontSize: 13, color: COLORS.incomeText, fontWeight: "700" },

  confirmBtn:     { backgroundColor: COLORS.heroBg, borderRadius: R.md, paddingVertical: SP.md, alignItems: "center", marginTop: SP.md, shadowColor: COLORS.heroBg, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 10, elevation: 5 },
  confirmBtnText: { fontSize: 15, fontWeight: "800", color: COLORS.textOnDark, letterSpacing: 0.2 },
});
