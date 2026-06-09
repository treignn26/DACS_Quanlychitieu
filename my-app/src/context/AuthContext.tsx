import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { setApiToken, authMe } from "../api/client";

export interface AuthUser {
  _id: string;
  name: string;
  email: string;
}

interface AuthContextType {
  token: string | null;
  user: AuthUser | null;
  loading: boolean;
  login: (token: string, user: AuthUser) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (updated: Partial<AuthUser>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  token: null, user: null, loading: true,
  login: async () => {}, logout: async () => {}, updateUser: async () => {},
});

const TOKEN_KEY = "@finance_token";
const USER_KEY  = "@finance_user";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token,   setToken]   = useState<string | null>(null);
  const [user,    setUser]    = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  // Khởi động: đọc token từ storage rồi verify với server
  useEffect(() => {
    (async () => {
      try {
        const [storedToken, storedUser] = await Promise.all([
          AsyncStorage.getItem(TOKEN_KEY),
          AsyncStorage.getItem(USER_KEY),
        ]);

        if (storedToken && storedUser) {
          // Gắn token vào API client trước khi gọi /me
          setApiToken(storedToken);

          try {
            // Xác thực token với server — nếu hết hạn sẽ throw lỗi 401
            const result = await authMe();
            setToken(storedToken);
            setUser(result.user);
          } catch {
            // Token hết hạn hoặc không hợp lệ → xóa và yêu cầu đăng nhập lại
            await Promise.all([
              AsyncStorage.removeItem(TOKEN_KEY),
              AsyncStorage.removeItem(USER_KEY),
            ]);
            setApiToken(null);
          }
        }
      } catch {
        // silent fail
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const login = useCallback(async (newToken: string, newUser: AuthUser) => {
    await Promise.all([
      AsyncStorage.setItem(TOKEN_KEY, newToken),
      AsyncStorage.setItem(USER_KEY, JSON.stringify(newUser)),
    ]);
    setApiToken(newToken);
    setToken(newToken);
    setUser(newUser);
  }, []);

  const logout = useCallback(async () => {
    await Promise.all([
      AsyncStorage.removeItem(TOKEN_KEY),
      AsyncStorage.removeItem(USER_KEY),
    ]);
    setApiToken(null);
    setToken(null);
    setUser(null);
  }, []);

  const updateUser = useCallback(async (updated: Partial<AuthUser>) => {
    setUser((prev) => (prev ? { ...prev, ...updated } : prev));
    const stored = await AsyncStorage.getItem(USER_KEY);
    if (stored) {
      await AsyncStorage.setItem(USER_KEY, JSON.stringify({ ...JSON.parse(stored), ...updated }));
    }
  }, []);

  return (
    <AuthContext.Provider value={{ token, user, loading, login, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
