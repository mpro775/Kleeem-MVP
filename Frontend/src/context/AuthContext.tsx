// src/context/AuthContext.tsx
import {
  createContext,
  useContext,
  useState,
  type ReactNode,
  useEffect,
} from "react";
import { useNavigate } from "react-router-dom";
import type { User, Role } from "./types";
// ⚠️ عدّل المسار حسب مشروعك
import axiosInstance from "@/shared/api/axios"; // أو import axiosInstance from "@/shared/lib/axios"

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (user: User, token: string) => void;
  setAuth: (user: User, token: string, opts?: { silent?: boolean }) => void;
  updateUser: (patch: Partial<User>) => void;
  logout: () => void;
  isAuthenticated: boolean;
  hasRole: (...roles: Role[]) => boolean;
  isAdmin: boolean;
  isLoading: boolean;
  hydrated: boolean; // 👈 لمنع التحويل قبل قراءة التخزين المحلي
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  token: null,
  login: () => {},
  setAuth: () => {},
  updateUser: () => {},
  logout: () => {},
  isAuthenticated: false,
  hasRole: () => false,
  isAdmin: false,
  isLoading: true,
  hydrated: false,
});

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const navigate = useNavigate();

  // — Hydration من التخزين المحلي —
  const [token, setToken] = useState<string | null>(() => {
    try {
      return localStorage.getItem("token");
    } catch {
      return null;
    }
  });

  const [user, setUser] = useState<User | null>(() => {
    try {
      const str = localStorage.getItem("user");
      return str ? (JSON.parse(str) as User) : null;
    } catch {
      return null;
    }
  });

  const [isLoading, setIsLoading] = useState(true);
  const [hydrated, setHydrated] = useState(false);

  // — عند الإقلاع: طبّق التوكن على Axios واضبط hydration —
  useEffect(() => {
    if (token) {
      axiosInstance.defaults.headers.common[
        "Authorization"
      ] = `Bearer ${token}`;
    } else {
      delete axiosInstance.defaults.headers.common["Authorization"];
    }
    setHydrated(true);
    setIsLoading(false);
    // sync عبر التبويبات (اختياري)
    const onStorage = (e: StorageEvent) => {
      if (e.key === "token") {
        const t = e.newValue;
        setToken(t);
        if (t) {
          axiosInstance.defaults.headers.common[
            "Authorization"
          ] = `Bearer ${t}`;
        } else {
          delete axiosInstance.defaults.headers.common["Authorization"];
        }
      }
      if (e.key === "user") {
        try {
          setUser(e.newValue ? (JSON.parse(e.newValue) as User) : null);
        } catch {
          setUser(null);
        }
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // مرة واحدة

  const hasRole = (...roles: Role[]) => !!user && roles.includes(user.role);
  const isAdmin = hasRole("ADMIN");

  // — الدالة الموحدة لضبط الحالة + التخزين + Header —
  const setAuth: AuthContextType["setAuth"] = (userData, tokenValue, opts) => {
    setIsLoading(true);

    // خزّن في الحالة
    setUser(userData);
    setToken(tokenValue);

    // خزّن محليًا
    try {
      localStorage.setItem("token", tokenValue);
      localStorage.setItem("user", JSON.stringify(userData));
    } catch {}

    // حقن الهيدر دائمًا حتى في الوضع الصامت
    if (tokenValue) {
      axiosInstance.defaults.headers.common[
        "Authorization"
      ] = `Bearer ${tokenValue}`;
    } else {
      delete axiosInstance.defaults.headers.common["Authorization"];
    }

    // إن كان صامتًا: لا تنقّل، لكن أبقِ كل شيء مخزّنًا ومحقونًا
    if (opts?.silent) {
      setIsLoading(false);
      return;
    }

    // — توجيه ذكي بعد المصادقة —
    // 1) إن وُجد redirect في URL استخدمه أولًا
    let redirectUrl: string | null = null;
    try {
      const qs = new URLSearchParams(window.location.search);
      redirectUrl = qs.get("redirect");
    } catch {
      redirectUrl = null;
    }

    // 2) لو أدمن → لوحة الأدمن
    if (userData.role === "ADMIN") {
      navigate(redirectUrl ? decodeURIComponent(redirectUrl) : "/admin/kleem", {
        replace: true,
      });
      setIsLoading(false);
      return;
    }

    // 3) تحقق تفعيل البريد
    const isEmailVerified = !!userData.emailVerified;
    if (!isEmailVerified) {
      navigate("/verify-email", { replace: true });
      setIsLoading(false);
      return;
    }

    // 4) Onboarding أول الدخول، وإلا Dashboard — مع احترام redirect إن وجد
    if (redirectUrl) {
      navigate(decodeURIComponent(redirectUrl), { replace: true });
    } else if (userData.firstLogin) {
      navigate("/onboarding", { replace: true });
    } else {
      navigate("/dashboard", { replace: true });
    }

    setIsLoading(false);
  };

  // — login يمر عبر setAuth (غير صامت) —
  const login = (userData: User, tokenValue: string) => {
    setAuth(userData, tokenValue, { silent: false });
  };

  // — تحديث جزئي لبيانات المستخدم مع حفظها —
  const updateUser: AuthContextType["updateUser"] = (patch) => {
    setUser((prev) => {
      const base =
        prev ??
        (() => {
          try {
            const fromLS = localStorage.getItem("user");
            return fromLS ? (JSON.parse(fromLS) as User) : ({} as User);
          } catch {
            return {} as User;
          }
        })();

      const next = { ...base, ...patch } as User;
      try {
        localStorage.setItem("user", JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  // — تسجيل الخروج —
  const logout = () => {
    setUser(null);
    setToken(null);
    try {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
    } catch {}
    delete axiosInstance.defaults.headers.common["Authorization"];
    navigate("/login", { replace: true });
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        login,
        setAuth,
        updateUser,
        logout,
        isAuthenticated: !!token,
        hasRole,
        isAdmin,
        isLoading,
        hydrated,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
