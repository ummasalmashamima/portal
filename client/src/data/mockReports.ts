import type { GeneratedReportRecord, ReportDefinition } from "@/types/report";
export const reportCatalog: ReportDefinition[] = [
  { id: "application-register", name: "Application Register", description: "Applications by status, country, standard and application date.", category: "Operations", parameters: ["Country", "Standard", "Application Status", "Date Range"] },
  { id: "audit-register", name: "Audit Register", description: "Audit plan, delivery status, assigned auditor and planned dates.", category: "Assurance", parameters: ["Country", "Standard", "Auditor", "Audit Status", "Date Range"] },
  { id: "certificate-register", name: "Certificate Register", description: "Issued certificate portfolio with linked scope and validity status.", category: "Assurance", parameters: ["Country", "Standard", "Certificate Status", "Expiry Range"] },
  { id: "expiry-report", name: "Expiry Report", description: "Certificates due for renewal or already expired, ordered by urgency.", category: "Assurance", parameters: ["90 Days", "60 Days", "30 Days", "Expired"] },
  { id: "auditor-workload", name: "Auditor Workload", description: "Assigned and completed audit workload by auditor and status.", category: "Operations", parameters: ["Auditor", "Date Range", "Audit Status"] },
  { id: "country-standard-analysis", name: "Country / Standard Analysis", description: "Company, application, audit and certificate counts across the selected footprint.", category: "Management", parameters: ["Country", "Standard", "Date Range"] },
  { id: "management-dashboard", name: "Management Dashboard", description: "Portfolio KPIs for applications, audits, CAP, certification and certificates.", category: "Management", parameters: ["Period", "Country", "Standard"] },
];
export const mockGeneratedReports: GeneratedReportRecord[] = [
  { id: "report-run-001", reportId: "certificate-register", reportName: "Certificate Register", parameters: { country: "All", standard: "All", status: "All" }, generatedBy: "Jisan Khan", generatedById: "user-jisan", generatedAt: "2026-09-27T09:30:00.000Z", format: "CSV", status: "Ready", result: { title: "Certificate Register", columns: ["Certificate", "Company", "Standard", "Expiry", "Status"], rows: [{ Certificate: "CERT-000112", Company: "Greenfield Jutex Ltd.", Standard: "ISO 9001", Expiry: "2026-10-28", Status: "Active" }], summary: [{ label: "Portfolio", value: 10 }] } },
  { id: "report-run-002", reportId: "expiry-report", reportName: "Expiry Report", parameters: { expiryRange: "30 Days" }, generatedBy: "Daniel Wong", generatedById: "user-certification", generatedAt: "2026-09-26T15:10:00.000Z", format: "PDF", status: "Failed", error: "Mock export preview only; no PDF rendering service is configured." },
];
