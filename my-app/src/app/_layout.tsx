/**
 * src/app/_layout.tsx
 *
 * Root layout — Bottom Tab Navigator with 4 tabs.
 * Wraps the entire app in <LanguageProvider> so every screen
 * can call useLanguage() to get/set the current language.
 *
 * Tabs:
 *   1. index            → Trang chủ / Home
 *   2. add-transaction  → Nhập liệu / Add
 *   3. ai-assistant     → Trợ lý AI / AI Advisor
 *   4. settings         → Cài đặt / Settings
 *
 * The "Add" tab uses a floating mint circle that rises above the bar.
 * All tab labels are driven by the language context — they update
 * instantly when the user switches language in Settings.
 *
 * Uses ONLY default React Native components — no third-party libraries.
 */

import { Tabs } from "expo-router";
import { ActivityIndicator, Platform, StyleSheet, Text, View } from "react-native";
import { useEffect } from "react";
import { LanguageProvider, useLanguage } from "../context/LanguageContext";
import { AuthProvider, useAuth } from "../context/AuthContext";
import { setApiToken } from "../api/client";
import AuthScreen from "../components/AuthScreen";

// ─── Design tokens (keep in sync with screen files) ──────────────────────────
const C = {
  accent: "#2ECC9A",
  accentDeep: "#1BAA7E",
  heroBg: "#1A2E2A",
  tabBg: "#FFFFFF",
  active: "#1A2E2A",
  inactive: "#9EB8B0",
  activePill: "#E6FAF4",
};

// ─── Icon components ──────────────────────────────────────────────────────────

/** Standard icon — pill highlight when active */
function NavIcon({ emoji, focused }: { emoji: string; focused: boolean }) {
  return (
    <View style={[styles.iconPill, focused && styles.iconPillActive]}>
      <Text style={styles.iconEmoji}>{emoji}</Text>
    </View>
  );
}

/**
 * Center "Add" tab — floating mint circle with a glowing shadow.
 * Negative marginTop lifts it above the tab bar surface.
 */
function AddIcon({ focused }: { focused: boolean }) {
  return (
    <View style={[styles.addCircle, focused && styles.addCircleActive]}>
      <Text style={styles.addPlus}>＋</Text>
    </View>
  );
}

/** Language-aware single-line tab label */
function NavLabel({ label, color }: { label: string; color: string }) {
  return (
    <Text style={[styles.tabLabel, { color }]} numberOfLines={1}>
      {label}
    </Text>
  );
}

// ─── Inner component (needs to be inside the provider to call useLanguage) ───
function AppTabs() {
  const { t } = useLanguage();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarActiveTintColor: C.active,
        tabBarInactiveTintColor: C.inactive,
      }}
    >
      {/* ── Tab 1: Trang chủ / Home ── */}
      <Tabs.Screen
        name="index"
        options={{
          tabBarIcon: ({ focused }) => <NavIcon emoji="🏠" focused={focused} />,
          tabBarLabel: ({ color }) => (
            <NavLabel label={t.navHome} color={color} />
          ),
        }}
      />

      {/* ── Tab 2: Biểu đồ / Charts ── */}
      <Tabs.Screen
        name="charts"
        options={{
          tabBarIcon: ({ focused }) => <NavIcon emoji="📊" focused={focused} />,
          tabBarLabel: ({ color }) => (
            <NavLabel label={t.navChart} color={color} />
          ),
        }}
      />

      {/* ── Tab 3: Nhập liệu / Add ── */}
      <Tabs.Screen
        name="add-transaction"
        options={{
          tabBarIcon: ({ focused }) => <AddIcon focused={focused} />,
          // No text under the floating circle — shape is self-explanatory
          tabBarLabel: ({ color }) => (
            <NavLabel label={t.navAdd} color={color} />
          ),
        }}
      />

      {/* ── Tab 4: Trợ lý AI / AI Advisor ── */}
      <Tabs.Screen
        name="ai-assistant"
        options={{
          tabBarIcon: ({ focused }) => <NavIcon emoji="✦" focused={focused} />,
          tabBarLabel: ({ color }) => (
            <NavLabel label={t.navAI} color={color} />
          ),
        }}
      />

      {/* ── Tab 5: Cài đặt / Settings ── */}
      <Tabs.Screen
        name="settings"
        options={{
          tabBarIcon: ({ focused }) => <NavIcon emoji="⚙️" focused={focused} />,
          tabBarLabel: ({ color }) => (
            <NavLabel label={t.navSettings} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}

// ─── Gate: chỉ vào app sau khi đăng nhập ─────────────────────────────────────
function AppGate() {
  const { token, loading } = useAuth();

  // Đồng bộ token vào API client mỗi khi token thay đổi (không được gọi trong render)
  useEffect(() => { setApiToken(token); }, [token]);

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: "#1A2E2A", alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator size="large" color="#2ECC9A" />
      </View>
    );
  }

  if (!token) return <AuthScreen />;

  return (
    <LanguageProvider>
      <AppTabs />
    </LanguageProvider>
  );
}

// ─── Root layout ──────────────────────────────────────────────────────────────
export default function RootLayout() {
  return (
    <AuthProvider>
      <AppGate />
    </AuthProvider>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  // Tab bar container
  tabBar: {
    backgroundColor: C.tabBg,
    borderTopWidth: 0,
    // Slightly taller to give the floating Add button breathing room
    height: Platform.OS === "ios" ? 88 : 68,
    paddingBottom: Platform.OS === "ios" ? 26 : 8,
    paddingTop: 6,
    // Soft upward shadow
    shadowColor: C.heroBg,
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 16,
  },

  // Standard nav icon pill
  iconPill: {
    width: 38,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
  },
  iconPillActive: {
    backgroundColor: C.activePill,
  },
  iconEmoji: {
    fontSize: 18,
  },

  // Floating "Add" circle button (–20% from original 54px)
  addCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: C.accent,
    alignItems: "center",
    justifyContent: "center",
    marginTop: -18,
    borderWidth: 3,
    borderColor: "#FFFFFF",
    shadowColor: C.accent,
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.45,
    shadowRadius: 12,
    elevation: 10,
  },
  addCircleActive: {
    backgroundColor: C.accentDeep,
  },
  addPlus: {
    fontSize: 19,
    color: "#FFFFFF",
    fontWeight: "300",
    lineHeight: 23,
    marginTop: -2,
  },

  // Tab label
  tabLabel: {
    fontSize: 10,
    fontWeight: "700",
    textAlign: "center",
    letterSpacing: 0.1,
    marginTop: 1,
  },
});
