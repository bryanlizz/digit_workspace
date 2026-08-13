// ─────────────────────────────────────────────────────────
// 数智企业 · 认证 Store
// V2: 基于 NextAuth.js Session，保留兼容的 useAuth() API
// ─────────────────────────────────────────────────────────

import { createContext, useContext, useEffect, useCallback, type ReactNode } from "react";
import { useSession, signIn, signOut } from "next-auth/react";

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: string;
  tenantId: string;
  permissionBm: number;
}

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  login: async () => false,
  logout: () => {},
});

function AuthBridge({ children }: { children: ReactNode }) {
  const { data: session, status } = useSession();
  const loading = status === "loading";

  const user: AuthUser | null = session?.user
    ? {
        id: (session.user as Record<string, unknown>).id as string ?? "",
        name: session.user.name ?? "",
        email: session.user.email ?? "",
        role: (session.user as Record<string, unknown>).role as string ?? "STAFF",
        tenantId: (session.user as Record<string, unknown>).tenantId as string ?? "tenant-default",
        permissionBm: (session.user as Record<string, unknown>).permissionBm as number ?? 1,
      }
    : null;

  const login = useCallback(async (email: string, password: string): Promise<boolean> => {
    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
      callbackUrl: "/",
    });
    if (result?.error) {
      console.error("[Auth] Login error:", result.error);
    }
    return result?.ok ?? false;
  }, []);

  const logout = useCallback(() => {
    signOut({ callbackUrl: "/login" });
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function AuthProvider({ children }: { children: ReactNode }) {
  return <AuthBridge>{children}</AuthBridge>;
}

export const useAuth = () => useContext(AuthContext);
