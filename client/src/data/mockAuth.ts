import type { AuthSession, DemoUser, UserRole } from "@/types/auth";

const sessionKey = "ecoassurance-session";

export const demoUsers: DemoUser[] = [
  { id: "user-jisan", name: "Jisan Khan", initials: "JK", email: "jisan.khan@ecoassurance.org", role: "Super Admin", lastLogin: "Today" },
  { id: "user-director", name: "Ayesha Karim", initials: "AK", email: "ayesha.karim@ecoassurance.org", role: "Director / Management", lastLogin: "Today" },
  { id: "user-ayesha", name: "Ayesha Karim", initials: "AK", email: "ayesha.karim@ecoassurance.org", role: "Application Officer", lastLogin: "Today" },
  { id: "user-audit-manager", name: "Tariq Mahmud", initials: "TM", email: "tariq.mahmud@ecoassurance.org", role: "Audit Manager", lastLogin: "Today" },
  { id: "user-auditor", name: "Marcus Lee", initials: "ML", email: "marcus.lee@ecoassurance.org", role: "Auditor", lastLogin: "Today" },
  { id: "user-reviewer", name: "Priya Sen", initials: "PS", email: "priya.sen@ecoassurance.org", role: "Technical Reviewer", lastLogin: "Today" },
  { id: "user-certification", name: "Daniel Wong", initials: "DW", email: "daniel.wong@ecoassurance.org", role: "Certification Manager", lastLogin: "Today" },
  { id: "user-customer", name: "Farzana Chowdhury", initials: "FC", email: "farzana@abctextiles.com", role: "Customer", lastLogin: "Today" },
];

export function getDemoUser(role: UserRole): DemoUser {
  return { ...(demoUsers.find((user) => user.role === role) ?? demoUsers[0]) };
}

export function getSession(): AuthSession | null {
  if (typeof window === "undefined") return null;
  for (const storage of [window.sessionStorage, window.localStorage]) {
    try {
      const value = storage.getItem(sessionKey);
      if (!value) continue;
      const session = JSON.parse(value) as AuthSession;
      if (session?.user?.role && session?.user?.id) return session;
      storage.removeItem(sessionKey);
    } catch {
      storage.removeItem(sessionKey);
    }
  }
  return null;
}

export function saveSession(user: DemoUser, remember = true): AuthSession {
  const session: AuthSession = { user: { ...user }, signedInAt: new Date().toISOString() };
  if (typeof window !== "undefined") {
    window.localStorage.removeItem(sessionKey);
    window.sessionStorage.removeItem(sessionKey);
    (remember ? window.localStorage : window.sessionStorage).setItem(sessionKey, JSON.stringify(session));
  }
  return session;
}

export function clearSession(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(sessionKey);
  window.sessionStorage.removeItem(sessionKey);
}
