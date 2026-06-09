import React, { useState } from "react";
import {
  ActivityIndicator,
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
import { COLORS, SP, RL as R } from "@/constants/tokens";
import { useAuth } from "../context/AuthContext";
import { setApiToken, authLogin, authRegister } from "../api/client";

type Mode = "login" | "register";

export default function AuthScreen() {
  const { login } = useAuth();

  const [mode,     setMode]     = useState<Mode>("login");
  const [name,     setName]     = useState("");
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [loading,     setLoading]     = useState(false);
  const [error,       setError]       = useState<string | null>(null);
  const [successMsg,  setSuccessMsg]  = useState<string | null>(null);

  const switchMode = (m: Mode) => {
    setMode(m);
    setError(null);
    setName("");
    setEmail("");
    setPassword("");
  };

  const handleSubmit = async () => {
    setError(null);
    const trimEmail = email.trim().toLowerCase();
    const trimName  = name.trim();

    if (mode === "register" && !trimName) {
      setError("Vui lòng nhập họ tên");
      return;
    }
    if (!trimEmail) { setError("Vui lòng nhập email"); return; }
    if (!password)  { setError("Vui lòng nhập mật khẩu"); return; }
    if (mode === "register" && password.length < 6) {
      setError("Mật khẩu tối thiểu 6 ký tự");
      return;
    }

    setLoading(true);
    try {
      const result = mode === "register"
        ? await authRegister({ name: trimName, email: trimEmail, password })
        : await authLogin({ email: trimEmail, password });

      // Hiện thông báo ngay, vào app ngay — không delay
      if (mode === "register") setSuccessMsg("🎉 Đăng ký thành công!");

      setApiToken(result.token);
      await login(result.token, result.user);
      // AppGate tự chuyển sang app khi token được set trong AuthContext
    } catch (e: any) {
      setLoading(false);
      setSuccessMsg(null);
      setError(e.message ?? "Đã xảy ra lỗi, thử lại.");
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <StatusBar barStyle="light-content" backgroundColor={COLORS.heroBg} />

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* ── Hero ── */}
        <View style={styles.hero}>
          <View style={styles.logoWrap}>
            <Text style={styles.logoEmoji}>💰</Text>
          </View>
          <Text style={styles.appName}>Finance App</Text>
          <Text style={styles.appSub}>Quản lý tài chính cá nhân</Text>
        </View>

        {/* ── Tab toggle ── */}
        <View style={styles.tabRow}>
          <TouchableOpacity
            style={[styles.tab, mode === "login" && styles.tabActive]}
            onPress={() => switchMode("login")}
            activeOpacity={0.8}
          >
            <Text style={[styles.tabText, mode === "login" && styles.tabTextActive]}>
              Đăng nhập
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, mode === "register" && styles.tabActive]}
            onPress={() => switchMode("register")}
            activeOpacity={0.8}
          >
            <Text style={[styles.tabText, mode === "register" && styles.tabTextActive]}>
              Đăng ký
            </Text>
          </TouchableOpacity>
        </View>

        {/* ── Form ── */}
        <View style={styles.card}>
          {mode === "register" && (
            <View style={styles.field}>
              <Text style={styles.label}>Họ và tên</Text>
              <TextInput
                style={styles.input}
                placeholder="Nhập họ tên của bạn"
                placeholderTextColor={COLORS.textMuted}
                value={name}
                onChangeText={setName}
                autoCapitalize="words"
                returnKeyType="next"
              />
            </View>
          )}

          <View style={styles.field}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              placeholder="example@email.com"
              placeholderTextColor={COLORS.textMuted}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="next"
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Mật khẩu</Text>
            <TextInput
              style={styles.input}
              placeholder={mode === "register" ? "Tối thiểu 6 ký tự" : "Nhập mật khẩu"}
              placeholderTextColor={COLORS.textMuted}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              returnKeyType="done"
              onSubmitEditing={handleSubmit}
            />
          </View>

          {/* Success */}
          {successMsg && (
            <View style={styles.successBox}>
              <Text style={styles.successText}>{successMsg}</Text>
            </View>
          )}

          {/* Error */}
          {error && (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>⚠️  {error}</Text>
            </View>
          )}

          {/* Submit */}
          <TouchableOpacity
            style={[styles.btn, loading && styles.btnDisabled]}
            onPress={handleSubmit}
            activeOpacity={0.85}
            disabled={loading}
          >
            {loading
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.btnText}>
                  {mode === "login" ? "Đăng nhập" : "Tạo tài khoản"}
                </Text>
            }
          </TouchableOpacity>

          {/* Switch mode hint */}
          <View style={styles.switchRow}>
            <Text style={styles.switchText}>
              {mode === "login" ? "Chưa có tài khoản? " : "Đã có tài khoản? "}
            </Text>
            <TouchableOpacity onPress={() => switchMode(mode === "login" ? "register" : "login")}>
              <Text style={styles.switchLink}>
                {mode === "login" ? "Đăng ký ngay" : "Đăng nhập"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <Text style={styles.footer}>Được xây dựng với ♥ tại Việt Nam</Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root:   { flex: 1, backgroundColor: COLORS.pageBg },
  scroll: { flexGrow: 1, paddingBottom: SP.xxl },

  hero: {
    alignItems: "center",
    paddingTop: Platform.OS === "ios" ? 80 : 60,
    paddingBottom: SP.xl,
  },
  logoWrap: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: COLORS.accent,
    alignItems: "center", justifyContent: "center",
    marginBottom: SP.md,
    shadowColor: COLORS.accent,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35, shadowRadius: 16, elevation: 12,
  },
  logoEmoji: { fontSize: 38 },
  appName:   { fontSize: 28, fontWeight: "800", color: COLORS.textPrimary, letterSpacing: -0.5 },
  appSub:    { fontSize: 13, color: COLORS.textSecondary, marginTop: SP.xs, fontWeight: "400" },

  tabRow: {
    flexDirection: "row",
    marginHorizontal: SP.lg,
    backgroundColor: COLORS.inputBg,
    borderRadius: R.lg,
    padding: 4,
    marginBottom: SP.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  tab: {
    flex: 1, paddingVertical: SP.sm + 2,
    borderRadius: R.md, alignItems: "center",
  },
  tabActive:     { backgroundColor: COLORS.heroBg },
  tabText:       { fontSize: 14, fontWeight: "700", color: COLORS.textSecondary },
  tabTextActive: { color: COLORS.textOnDark },

  card: {
    backgroundColor: COLORS.cardBg,
    marginHorizontal: SP.lg,
    borderRadius: R.xl,
    padding: SP.lg,
    shadowColor: COLORS.heroBg,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08, shadowRadius: 16, elevation: 6,
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  field:     { marginBottom: SP.md },
  label:     { fontSize: 13, fontWeight: "700", color: COLORS.textPrimary, marginBottom: SP.xs },
  input: {
    backgroundColor: COLORS.inputBg,
    borderRadius: R.md,
    paddingHorizontal: SP.md,
    paddingVertical: SP.sm + 4,
    fontSize: 15,
    color: COLORS.textPrimary,
    borderWidth: 1.5,
    borderColor: COLORS.inputBorder,
  },

  successBox: {
    backgroundColor: COLORS.incomeBg,
    borderRadius: R.md,
    padding: SP.sm + 2,
    marginBottom: SP.md,
    borderWidth: 1,
    borderColor: COLORS.incomeBorder,
  },
  successText: { fontSize: 13, color: COLORS.incomeText, fontWeight: "700" },

  errorBox: {
    backgroundColor: COLORS.expenseBg,
    borderRadius: R.md,
    padding: SP.sm + 2,
    marginBottom: SP.md,
    borderWidth: 1,
    borderColor: COLORS.expenseBorder,
  },
  errorText: { fontSize: 13, color: COLORS.expenseText, fontWeight: "600" },

  btn: {
    backgroundColor: COLORS.accent,
    borderRadius: R.md,
    paddingVertical: SP.md,
    alignItems: "center",
    marginTop: SP.xs,
    shadowColor: COLORS.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 6,
  },
  btnDisabled: { opacity: 0.6 },
  btnText:     { fontSize: 16, fontWeight: "800", color: COLORS.heroBg },

  switchRow: { flexDirection: "row", justifyContent: "center", marginTop: SP.md },
  switchText: { fontSize: 13, color: COLORS.textSecondary },
  switchLink: { fontSize: 13, fontWeight: "700", color: COLORS.accent },

  footer: {
    color: COLORS.textMuted,
    textAlign: "center",
    marginTop: SP.xl,
    fontSize: 11,
    fontWeight: "400",
  },
});
