import type { LucideIcon } from "lucide-react";
import { Activity, BarChart3, Bell, Building2, CalendarClock, ClipboardCheck, FileCheck2, FileText, LayoutDashboard, Medal, Settings2, ShieldCheck, UserRound } from "lucide-react";
import type { Permission, UserRole } from "@/types/auth";

export interface NavItem { label: string; path: string; icon: LucideIcon; permission: Permission; soon?: boolean; }
export const navigationItems: NavItem[] = [
  { label: "Dashboard", path: "/dashboard", icon: LayoutDashboard, permission: "dashboard.view" },
  { label: "Company Master", path: "/companies", icon: Building2, permission: "companies.view" },
  { label: "Application", path: "/applications", icon: FileText, permission: "applications.view" },
  { label: "Audit Management", path: "/audits", icon: ClipboardCheck, permission: "audits.view" },
  { label: "Findings & CAP", path: "/findings", icon: FileCheck2, permission: "findings.view" },
  { label: "Technical Review", path: "/technical-reviews", icon: ShieldCheck, permission: "technical-reviews.view" },
  { label: "Certification", path: "/certifications", icon: Medal, permission: "certifications.view" },
  { label: "Certificates", path: "/certificates", icon: ShieldCheck, permission: "certificates.view" },
  { label: "Expiry & Renewal", path: "/renewals", icon: CalendarClock, permission: "renewals.view" },
  { label: "Documents", path: "/documents", icon: FileText, permission: "documents.view" },
  { label: "Activity History", path: "/activity", icon: Activity, permission: "activity.view" },
  { label: "Reports", path: "/reports", icon: BarChart3, permission: "reports.view" },
  { label: "Notifications", path: "/notifications", icon: Bell, permission: "notifications.view" },
  { label: "Settings", path: "/settings", icon: Settings2, permission: "settings.view" },
  { label: "Profile", path: "/profile", icon: UserRound, permission: "profile.view" },
];

export const permissionCatalog: { permission: Permission; area: string; label: string }[] = [
  ...(["dashboard.view"] as Permission[]).map((permission) => ({ permission, area: "Workspace", label: "View dashboard" })),
  ...(["companies.view", "companies.manage"] as Permission[]).map((permission) => ({ permission, area: "Company", label: permission === "companies.view" ? "View companies" : "Manage companies" })),
  ...(["applications.view", "applications.create", "applications.review", "applications.approve"] as Permission[]).map((permission) => ({ permission, area: "Applications", label: permission.replace("applications.", "").replaceAll(".", " ") })),
  ...(["audits.view", "audits.manage", "audits.execute", "audits.findings", "audits.report", "audits.review"] as Permission[]).map((permission) => ({ permission, area: "Audits", label: permission.replace("audits.", "") })),
  ...(["findings.view", "findings.manage", "findings.close", "findings.review"] as Permission[]).map((permission) => ({ permission, area: "Findings & CAP", label: permission.replace("findings.", "") })),
  ...(["technical-reviews.view", "technicalReviews.view", "technicalReviews.decide"] as Permission[]).map((permission) => ({ permission, area: "Technical Review", label: permission.replace("technicalReviews.", "").replace("technical-reviews.", "") })),
  ...(["certifications.view", "certifications.manage", "certifications.review", "certifications.decide"] as Permission[]).map((permission) => ({ permission, area: "Certification", label: permission.replace("certifications.", "") })),
  ...(["certificates.view", "certificates.manage", "certificates.issue", "certificates.renew", "renewals.view", "renewals.manage"] as Permission[]).map((permission) => ({ permission, area: "Certificates & Renewal", label: permission.replace("certificates.", "").replace("renewals.", "renewal ") })),
  ...(["documents.view", "documents.upload", "documents.approve", "documents.archive"] as Permission[]).map((permission) => ({ permission, area: "Documents", label: permission.replace("documents.", "") })),
  ...(["reports.view", "reports.generate", "reports.export"] as Permission[]).map((permission) => ({ permission, area: "Reports", label: permission.replace("reports.", "") })),
  ...(["notifications.view", "notifications.manage"] as Permission[]).map((permission) => ({ permission, area: "Notifications", label: permission.replace("notifications.", "") })),
  ...(["users.manage", "settings.view", "settings.manage", "profile.view", "profile.manage", "activity.view"] as Permission[]).map((permission) => ({ permission, area: permission.startsWith("profile") ? "Profile" : permission.startsWith("activity") ? "Activity" : "Settings", label: permission.split(".").slice(1).join(" ") })),
];
const allPermissions: Permission[] = Array.from(new Set(permissionCatalog.map((item) => item.permission)));
const set = (...permissions: Permission[]) => permissions;
export const rolePermissions: Record<UserRole, Permission[]> = {
  "Super Admin": allPermissions,
  "Director / Management": set("dashboard.view", "companies.view", "applications.view", "applications.approve", "audits.view", "audits.manage", "audits.execute", "audits.findings", "audits.report", "audits.review", "findings.view", "findings.close", "technical-reviews.view", "technicalReviews.view", "certifications.view", "certificates.view", "certificates.issue", "certificates.renew", "renewals.view", "documents.view", "documents.approve", "documents.archive", "reports.view", "reports.generate", "reports.export", "notifications.view", "notifications.manage", "settings.view", "profile.view", "profile.manage", "activity.view"),
  "Application Officer": set("dashboard.view", "companies.view", "companies.manage", "applications.view", "applications.create", "applications.review", "audits.view", "audits.manage", "audits.findings", "audits.report", "audits.review", "documents.view", "documents.upload", "notifications.view", "profile.view", "profile.manage", "activity.view"),
  "Audit Manager": set("dashboard.view", "applications.view", "audits.view", "audits.manage", "audits.execute", "audits.findings", "audits.report", "audits.review", "findings.view", "findings.manage", "findings.close", "findings.review", "certifications.view", "certificates.view", "renewals.view", "documents.view", "documents.upload", "documents.approve", "reports.view", "reports.generate", "reports.export", "notifications.view", "profile.view", "profile.manage", "activity.view"),
  "Auditor": set("dashboard.view", "audits.view", "audits.execute", "audits.findings", "audits.report", "findings.view", "findings.manage", "documents.view", "documents.upload", "notifications.view", "profile.view", "profile.manage", "activity.view"),
  "Technical Reviewer": set("dashboard.view", "audits.view", "audits.review", "audits.report", "findings.view", "findings.review", "technical-reviews.view", "technicalReviews.view", "technicalReviews.decide", "certifications.view", "certificates.view", "documents.view", "documents.upload", "documents.approve", "notifications.view", "profile.view", "profile.manage", "activity.view"),
  "Certification Manager": set("dashboard.view", "companies.view", "applications.view", "audits.view", "findings.view", "activity.view", "technical-reviews.view", "technicalReviews.view", "certifications.view", "certifications.manage", "certifications.review", "certifications.decide", "certificates.view", "certificates.manage", "certificates.issue", "certificates.renew", "renewals.view", "renewals.manage", "reports.view", "reports.generate", "reports.export", "documents.view", "documents.approve", "notifications.view", "notifications.manage", "profile.view", "profile.manage"),
  "Customer": set("dashboard.view", "companies.view", "applications.view", "applications.create", "audits.view", "findings.view", "certificates.view", "documents.view", "documents.upload", "notifications.view", "profile.view", "profile.manage", "activity.view"),
};
