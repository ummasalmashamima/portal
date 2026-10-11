import { mockManagedUsers, mockConfigValues } from "@/data/mockSettings";
import { mockCompanies } from "@/data/mockCompanies";
import { rolePermissions, permissionCatalog } from "@/data/navigation";
import { activityRepository } from "@/services/repositories/activityRepository";
import type { DemoUser, Permission, UserRole } from "@/types/auth";
import type { ConfigSection, ConfigValue, ManagedUser, NotificationPreferences, ProfileDetails } from "@/types/settings";

const users = mockManagedUsers as ManagedUser[];
const config = mockConfigValues as ConfigValue[];
const profileStore = new Map<string, { details: ProfileDetails; preferences: NotificationPreferences }>();
let userSequence = 1, configSequence = 1;
function allowed(role: UserRole | undefined, permission: Permission) { return Boolean(role && rolePermissions[role].includes(permission)); }
function require(role: UserRole | undefined, permission: Permission) { if (!allowed(role, permission)) throw new Error(`Permission required: ${permission}`); }
function actorMeta(actor: { id?: string; name?: string; role?: UserRole }) { return { performedBy: actor.id, performedByName: actor.name, role: actor.role }; }
const defaultPreferences = (): NotificationPreferences => ({ inApp: true, email: false, categories: { Workflow: true, Document: true, Certificate: true, Renewal: true, CAP: true, System: true } });
function profileState(user: DemoUser) {
  let state = profileStore.get(user.id);
  if (!state) {
    const email = user.email.trim().toLocaleLowerCase();
    const customerContact = user.role === "Customer" ? mockCompanies.flatMap((company) => company.contacts).find((contact) => contact.email.trim().toLocaleLowerCase() === email) : undefined;
    const phone = customerContact?.phone ?? "Not provided";
    state = { details: { name: user.name, email: user.email, phone }, preferences: defaultPreferences() }; profileStore.set(user.id, state);
  }
  return state;
}
export const settingsRepository = {
  async listUsers(filters: { role?: UserRole | "All"; status?: ManagedUser["status"] | "All"; search?: string } = {}, actor: { id?: string; name?: string; role?: UserRole }): Promise<ManagedUser[]> {
    require(actor.role, "settings.view"); return users.filter((u) => (!filters.role || filters.role === "All" || u.role === filters.role) && (!filters.status || filters.status === "All" || u.status === filters.status) && (!filters.search || `${u.name} ${u.email} ${u.role}`.toLowerCase().includes(filters.search.toLowerCase()))).map((u) => ({ ...u }));
  },
  async getUser(id: string, actor: { role?: UserRole }): Promise<ManagedUser | null> { require(actor.role, "settings.view"); const u = users.find((x) => x.id === id); return u ? { ...u } : null; },
  async inviteUser(input: { name: string; email: string; role: UserRole; phone?: string }, actor: { id?: string; name?: string; role?: UserRole }): Promise<ManagedUser> {
    require(actor.role, "users.manage"); if (!input.name.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email)) throw new Error("Enter a name and a valid email address.");
    if (users.some((u) => u.email.toLowerCase() === input.email.toLowerCase())) throw new Error("A user with this email already exists.");
    const initials = input.name.trim().split(/\s+/).map((p) => p[0]).join("").slice(0, 2).toUpperCase();
    const user: ManagedUser = { id: `user-mock-${String(userSequence++).padStart(3, "0")}`, name: input.name.trim(), initials, email: input.email.trim(), role: input.role, lastLogin: "Never", status: "Invited", phone: input.phone?.trim() || "Not provided", createdAt: new Date().toISOString().slice(0, 10) };
    users.unshift(user); await activityRepository.create({ entityType: "user", entityId: user.id, activityType: "created", description: `User Created: ${user.name}`, ...actorMeta(actor), metadata: { reference: user.email, role: user.role, status: user.status } }); return { ...user };
  },
  async updateUser(id: string, changes: Partial<Pick<ManagedUser, "name" | "email" | "role" | "status" | "phone">>, actor: { id?: string; name?: string; role?: UserRole }): Promise<ManagedUser> {
    require(actor.role, "users.manage"); const index = users.findIndex((u) => u.id === id); if (index < 0) throw new Error("User not found.");
    const old = users[index]; const updated = { ...old, ...changes, id: old.id, initials: changes.name ? changes.name.trim().split(/\s+/).map((p) => p[0]).join("").slice(0, 2).toUpperCase() : old.initials };
    if (updated.email !== old.email && users.some((u) => u.id !== id && u.email.toLowerCase() === updated.email.toLowerCase())) throw new Error("A user with this email already exists.");
    users[index] = updated;
    const changedRole = Boolean(changes.role && changes.role !== old.role);
    await activityRepository.create({ entityType: "user", entityId: id, activityType: changedRole ? "permission_changed" : "updated", description: changedRole ? `Role Changed: ${old.name} · ${old.role} → ${updated.role}` : `User Updated: ${updated.name}`, ...actorMeta(actor), metadata: { reference: updated.email, oldRole: old.role, role: updated.role, status: updated.status } }); return { ...updated };
  },
  async deactivateUser(id: string, actor: { id?: string; name?: string; role?: UserRole }): Promise<ManagedUser> { return this.updateUser(id, { status: "Inactive" }, actor); },
  async configuration(actor: { role?: UserRole }): Promise<ConfigValue[]> { require(actor.role, "settings.view"); return config.map((x) => ({ ...x })); },
  async addConfiguration(input: { section: ConfigSection; label: string; value: string; description?: string }, actor: { id?: string; name?: string; role?: UserRole }): Promise<ConfigValue> {
    require(actor.role, "settings.manage"); if (!input.label.trim() || !input.value.trim()) throw new Error("A label and value are required.");
    const entry: ConfigValue = { id: `config-custom-${String(configSequence++).padStart(3, "0")}`, section: input.section, label: input.label.trim(), value: input.value.trim(), description: input.description?.trim() || "Added in the frontend mock configuration." };
    config.push(entry); await activityRepository.create({ entityType: "setting", entityId: entry.id, activityType: "setting_updated", description: `Setting Updated: ${entry.label}`, ...actorMeta(actor), metadata: { reference: entry.section, value: entry.value } }); return { ...entry };
  },
  async updateConfiguration(id: string, changes: { section: ConfigSection; label: string; value: string; description?: string }, actor: { id?: string; name?: string; role?: UserRole }): Promise<ConfigValue> {
    require(actor.role, "settings.manage"); const index = config.findIndex((item) => item.id === id); if (index < 0) throw new Error("Configuration entry not found.");
    if (!changes.label.trim() || !changes.value.trim()) throw new Error("A label and value are required.");
    const old = config[index]; if (config.some((item) => item.id !== id && item.section === changes.section && item.label.toLowerCase() === changes.label.trim().toLowerCase())) throw new Error("A configuration entry with this label already exists in the section.");
    const updated = { ...old, section: changes.section, label: changes.label.trim(), value: changes.value.trim(), description: changes.description?.trim() || old.description }; config[index] = updated;
    await activityRepository.create({ entityType: "setting", entityId: id, activityType: "setting_updated", description: `Setting Updated: ${old.label} → ${updated.label}`, ...actorMeta(actor), metadata: { reference: old.section, section: updated.section, oldValue: old.value, value: updated.value } }); return { ...updated };
  },
  async setPermission(role: UserRole, permission: Permission, enabled: boolean, actor: { id?: string; name?: string; role?: UserRole }): Promise<void> {
    require(actor.role, "settings.manage"); const current = rolePermissions[role]; const next = enabled ? Array.from(new Set([...current, permission])) : current.filter((p) => p !== permission); rolePermissions[role] = next;
    await activityRepository.create({ entityType: "setting", entityId: `role-${role}`, activityType: "permission_changed", description: `Permission Changed: ${role} · ${permission} ${enabled ? "granted" : "revoked"}`, ...actorMeta(actor), metadata: { reference: role, permission, enabled } });
  },
  async roleMatrix(actor: { role?: UserRole }) { require(actor.role, "settings.view"); return { roles: Object.keys(rolePermissions) as UserRole[], permissions: permissionCatalog.map((x) => ({ ...x })), grants: Object.fromEntries(Object.entries(rolePermissions).map(([role, p]) => [role, [...p]])) as Record<UserRole, Permission[]> }; },
  async getProfile(user: DemoUser, actor: { role?: UserRole }) { require(actor.role, "profile.view"); const state = profileState(user); return { details: { ...state.details }, preferences: { ...state.preferences, categories: { ...state.preferences.categories } } }; },
  async saveProfile(user: DemoUser, changes: Partial<ProfileDetails>, actor: { id?: string; name?: string; role?: UserRole }) {
    require(actor.role, "profile.manage"); const state = profileState(user); const next = { ...state.details, ...changes };
    if (!next.name.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(next.email)) throw new Error("Enter a name and valid email address.");
    state.details = next; await activityRepository.create({ entityType: "user", entityId: user.id, activityType: "updated", description: "Profile contact information updated", ...actorMeta(actor), metadata: { reference: next.email } }); return { ...next };
  },
  async savePreferences(user: DemoUser, preferences: NotificationPreferences, actor: { id?: string; name?: string; role?: UserRole }) {
    require(actor.role, "profile.manage"); const state = profileState(user); state.preferences = { ...preferences, categories: { ...preferences.categories } };
    await activityRepository.create({ entityType: "user", entityId: user.id, activityType: "updated", description: "Notification preferences updated", ...actorMeta(actor), metadata: { reference: user.email } }); window.dispatchEvent(new Event("ea-notifications-updated")); return { ...state.preferences, categories: { ...state.preferences.categories } };
  },
};
