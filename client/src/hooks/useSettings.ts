import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { settingsRepository } from "@/services/repositories/settingsRepository";
import type { DemoUser, Permission, UserRole } from "@/types/auth";
import type { ConfigSection, ConfigValue, ManagedUser, NotificationPreferences, ProfileDetails } from "@/types/settings";

export function useSettings(filters: { role?: UserRole | "All"; status?: ManagedUser["status"] | "All"; search?: string } = {}) {
  const { session } = useAuth(); const actor = { id: session?.user.id, name: session?.user.name, role: session?.user.role };
  const [users, setUsers] = useState<ManagedUser[]>([]); const [configuration, setConfiguration] = useState<ConfigValue[]>([]); const [matrix, setMatrix] = useState<Awaited<ReturnType<typeof settingsRepository.roleMatrix>> | null>(null); const [loading, setLoading] = useState(true); const [error, setError] = useState("");
  const load = useCallback(async () => { setLoading(true); setError(""); try { const [userRows, configRows, roles] = await Promise.all([settingsRepository.listUsers(filters, actor), settingsRepository.configuration(actor), settingsRepository.roleMatrix(actor)]); setUsers(userRows); setConfiguration(configRows); setMatrix(roles); } catch (e) { setError(e instanceof Error ? e.message : "Unable to load settings."); } finally { setLoading(false); } }, [JSON.stringify(filters), actor.id, actor.name, actor.role]);
  useEffect(() => { void load(); }, [load]);
  const invite = useCallback(async (input: { name: string; email: string; role: UserRole; phone?: string }) => { const result = await settingsRepository.inviteUser(input, actor); await load(); return result; }, [actor.id, actor.name, actor.role, load]);
  const update = useCallback(async (id: string, changes: Partial<Pick<ManagedUser, "name" | "email" | "role" | "status" | "phone">>) => { const result = await settingsRepository.updateUser(id, changes, actor); await load(); return result; }, [actor.id, actor.name, actor.role, load]);
  const deactivate = useCallback(async (id: string) => { const result = await settingsRepository.deactivateUser(id, actor); await load(); return result; }, [actor.id, actor.name, actor.role, load]);
  const addConfiguration = useCallback(async (input: { section: ConfigSection; label: string; value: string; description?: string }) => { const result = await settingsRepository.addConfiguration(input, actor); await load(); return result; }, [actor.id, actor.name, actor.role, load]);
  const updateConfiguration = useCallback(async (id: string, changes: { section: ConfigSection; label: string; value: string; description?: string }) => { const result = await settingsRepository.updateConfiguration(id, changes, actor); await load(); return result; }, [actor.id, actor.name, actor.role, load]);
  const setPermission = useCallback(async (role: UserRole, permission: Permission, enabled: boolean) => { await settingsRepository.setPermission(role, permission, enabled, actor); await load(); }, [actor.id, actor.name, actor.role, load]);
  return { users, configuration, matrix, loading, error, reload: load, invite, update, deactivate, addConfiguration, updateConfiguration, setPermission };
}

export function useProfile() {
  const { session, updateProfile } = useAuth(); const user = session?.user; const actor = { id: user?.id, name: user?.name, role: user?.role };
  const [details, setDetails] = useState<ProfileDetails | null>(null); const [preferences, setPreferences] = useState<NotificationPreferences | null>(null); const [loading, setLoading] = useState(Boolean(user)); const [error, setError] = useState("");
  const load = useCallback(async () => { if (!user) { setLoading(false); return; } setLoading(true); setError(""); try { const state = await settingsRepository.getProfile(user, actor); setDetails(state.details); setPreferences(state.preferences); } catch (e) { setError(e instanceof Error ? e.message : "Unable to load profile."); } finally { setLoading(false); } }, [user?.id, actor.role]);
  useEffect(() => { void load(); }, [load]);
  const saveDetails = useCallback(async (changes: Partial<ProfileDetails>) => { if (!user) throw new Error("Sign in to update your profile."); const next = await settingsRepository.saveProfile(user, changes, actor); setDetails(next); updateProfile({ name: next.name, email: next.email }); return next; }, [user?.id, actor.id, actor.name, actor.role]);
  const savePreferences = useCallback(async (next: NotificationPreferences) => { if (!user) throw new Error("Sign in to update preferences."); const saved = await settingsRepository.savePreferences(user, next, actor); setPreferences(saved); return saved; }, [user?.id, actor.id, actor.name, actor.role]);
  return { user: user as DemoUser | undefined, details, preferences, loading, error, reload: load, saveDetails, savePreferences };
}
