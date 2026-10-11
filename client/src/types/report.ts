import type { UserRole } from "@/types/auth";

export type ReportId = "application-register" | "audit-register" | "certificate-register" | "expiry-report" | "auditor-workload" | "country-standard-analysis" | "management-dashboard";
export type ReportStatus = "Queued" | "Generating" | "Ready" | "Failed";
export type ExportFormat = "CSV" | "Excel" | "PDF";
export interface ReportDefinition { id: ReportId; name: string; description: string; category: "Operations" | "Assurance" | "Management"; parameters: string[]; }
export interface ReportParameters { dateFrom?: string; dateTo?: string; country?: string; standard?: string; status?: string; companyId?: string; auditorId?: string; expiryRange?: "All" | "90 Days" | "60 Days" | "30 Days" | "Expired"; period?: "Today" | "This Week" | "This Month" | "This Quarter"; }
export interface ReportResult { title: string; columns: string[]; rows: Array<Record<string, string | number>>; summary: Array<{ label: string; value: string | number }>; }
export interface GeneratedReportRecord { id: string; reportId: ReportId; reportName: string; parameters: ReportParameters; generatedBy: string; generatedById: string; generatedAt: string; format: ExportFormat; status: ReportStatus; result?: ReportResult; error?: string; }
export interface ReportActor { id?: string; name?: string; role?: UserRole; }
