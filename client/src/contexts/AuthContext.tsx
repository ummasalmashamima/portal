import { createContext, useContext, useMemo, useState } from "react";
import { clearSession, getDemoUser, getSession, saveSession } from "@/data/mockAuth";
import { rolePermissions } from "@/data/navigation";
import type { AuthSession, DemoUser, Permission, UserRole } from "@/types/auth";

interface AuthContextValue {
  session: AuthSession | null;
  isAuthenticated: boolean;
  login: (role: UserRole, remember: boolean) => Promise<void>;
  logout: () => void;
  can: (permission: Permission) => boolean;
  switchRole: (role: UserRole) => void;
  updateProfile: (changes: Partial<Pick<DemoUser, "name" | "email">>) => void;
  refreshPermissions: () => void;
}
const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<AuthSession | null>(() => getSession());
  const value = useMemo<AuthContextValue>(() => ({
    session,
    isAuthenticated: Boolean(session),
    login: async (role, remember) => setSession(saveSession(getDemoUser(role), remember)),
    logout: () => { clearSession(); setSession(null); },
    can: (permission) => Boolean(session && rolePermissions[session.user.role].includes(permission)),
    switchRole: (role) => { if (session) setSession(saveSession(getDemoUser(role), true)); },
    updateProfile: (changes) => setSession((current) => current ? { ...current, user: { ...current.user, ...changes } } : current),
    refreshPermissions: () => setSession((current) => current ? { ...current } : current),
  }), [session]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider");
  return context;
}
