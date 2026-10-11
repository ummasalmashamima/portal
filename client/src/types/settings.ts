import type { DemoUser, Permission, UserRole } from "@/types/auth";
export interface ManagedUser extends DemoUser { status: "Active" | "Inactive" | "Invited"; phone: string; createdAt: string; }
export type ConfigSection = "Organization" | "Countries" | "Standards" | "Application Types" | "Statuses" | "Templates" | "Reference Number Formats" | "System Configuration";
export interface ConfigValue { id: string; section: ConfigSection; label: string; value: string; description: string; systemProtected?: boolean; }
export interface RolePermissionChange { role: UserRole; permission: Permission; allowed: boolean; }
export interface NotificationPreferences { inApp: boolean; email: boolean; categories: Record<"Workflow" | "Document" | "Certificate" | "Renewal" | "CAP" | "System", boolean>; }
export interface ProfileDetails { name: string; email: string; phone: string; }
