import React, { createContext, useContext, useEffect, useState } from "react";
import {
  adminLoginApi,
  getMeApi,
  loginApi,
  logoutApi,
  registerApi,
  TokenResponse,
  UserType,
} from "../lib/api";

type AuthContextType = {
  user: UserType | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  theme: "light" | "dark";
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, fullName?: string) => Promise<void>;
  adminLogin: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  toggleTheme: () => void;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserType | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(localStorage.getItem("bureaubot_access_token"));
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    const saved = localStorage.getItem("bureaubot_theme");
    return saved === "dark" ? "dark" : "light";
  });

  // Apply theme class to document element
  useEffect(() => {
    const root = document.documentElement;
    if (theme === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
    localStorage.setItem("bureaubot_theme", theme);
  }, [theme]);

  // Restore authenticated session on mount
  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem("bureaubot_access_token");
      if (token) {
        try {
          const userData = await getMeApi();
          setUser(userData);
          setAccessToken(token);
        } catch {
          localStorage.removeItem("bureaubot_access_token");
          localStorage.removeItem("bureaubot_refresh_token");
          setUser(null);
          setAccessToken(null);
        }
      }
      setIsLoading(false);
    };
    initAuth();
  }, []);

  const handleTokenResponse = (data: TokenResponse) => {
    localStorage.setItem("bureaubot_access_token", data.access_token);
    localStorage.setItem("bureaubot_refresh_token", data.refresh_token);
    setAccessToken(data.access_token);
    setUser(data.user);
  };

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const data = await loginApi({ email, password });
      handleTokenResponse(data);
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (email: string, password: string, fullName?: string) => {
    setIsLoading(true);
    try {
      const data = await registerApi({ email, password, full_name: fullName });
      handleTokenResponse(data);
    } finally {
      setIsLoading(false);
    }
  };

  const adminLogin = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const data = await adminLoginApi({ email, password });
      handleTokenResponse(data);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    setIsLoading(true);
    try {
      await logoutApi();
    } finally {
      localStorage.removeItem("bureaubot_access_token");
      localStorage.removeItem("bureaubot_refresh_token");
      setUser(null);
      setAccessToken(null);
      setIsLoading(false);
    }
  };

  const refreshUser = async () => {
    if (!accessToken) return;
    try {
      const userData = await getMeApi();
      setUser(userData);
    } catch {
      // ignore
    }
  };

  const toggleTheme = () => {
    setTheme((prev) => (prev === "light" ? "dark" : "light"));
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        accessToken,
        isAuthenticated: !!user,
        isLoading,
        theme,
        login,
        register,
        adminLogin,
        logout,
        refreshUser,
        toggleTheme,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
