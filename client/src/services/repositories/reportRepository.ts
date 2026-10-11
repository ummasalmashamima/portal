import { reportCatalog, mockGeneratedReports } from "@/data/mockReports";
import { mockApplications } from "@/data/mockApplications";
import { mockAudits } from "@/data/mockAudits";
import { mockCompanies } from "@/data/mockCompanies";
import { mockAuditors } from "@/data/mockAuditors";
import { mockFindings } from "@/data/mockFindings";
import { mockCertifications } from "@/data/mockCertifications";
import { mockCertificates } from "@/data/mockCertificates";
import { mockRenewals } from "@/data/mockRenewals";
import { daysUntilExpiry, effectiveCertificateStatus } from "@/services/repositories/certificateRepository";
import { rolePermissions } from "@/data/navigation";
import { activityRepository } from "@/services/repositories/activityRepository";
import type { ExportFormat, GeneratedReportRecord, ReportActor, ReportDefinition, ReportId, ReportParameters, ReportResult } from "@/types/report";

const history = mockGeneratedReports as GeneratedReportRecord[];
let sequence = 1;
function requirePermission(actor: ReportActor, permission: "reports.view" | "reports.generate" | "reports.export") { if (!actor.role || !rolePermissions[actor.role].includes(permission)) throw new Error(`Permission required: ${permission}`); }
function company(id: string) { return mockCompanies.find((item) => item.id === id); }
function withinDate(value: string, p: ReportParameters) { const date = new Date(value); if (!Number.isFinite(date.getTime())) return true; return (!p.dateFrom || date >= new Date(`${p.dateFrom}T00:00:00`)) && (!p.dateTo || date <= new Date(`${p.dateTo}T23:59:59`)); }
function dashboardPeriod(p: ReportParameters): ReportParameters { if (!p.period) return p; const now = new Date(); const start = new Date(now.getFullYear(), now.getMonth(), now.getDate()); if (p.period === "This Week") start.setDate(start.getDate() - ((start.getDay() + 6) % 7)); else if (p.period === "This Month") start.setDate(1); else if (p.period === "This Quarter") start.setMonth(Math.floor(start.getMonth() / 3) * 3, 1); return { ...p, dateFrom: start.toISOString().slice(0, 10), dateTo: now.toISOString().slice(0, 10) }; }
function baseMatch(country: string | undefined, standard: string, status: string, date: string, p: ReportParameters) { return (!p.country || p.country === "All" || country === p.country) && (!p.standard || p.standard === "All" || standard === p.standard) && (!p.status || p.status === "All" || status === p.status) && withinDate(date, p); }
function resultFor(reportId: ReportId, p: ReportParameters): ReportResult {
  const cols: string[] = [];
  let rows: Array<Record<string, string | number>> = [];
  if (reportId === "application-register") {
    cols.push("Application", "Company", "Country", "Standard", "Type", "Application Date", "Status");
    rows = mockApplications.filter((x) => baseMatch(x.country, x.standard, x.status, x.applicationDate, p)).filter((x) => !p.companyId || p.companyId === "All" || x.companyId === p.companyId).map((x) => ({ Application: x.applicationNumber, Company: company(x.companyId)?.legalName ?? x.companyId, Country: x.country, Standard: x.standard, Type: x.applicationType, "Application Date": x.applicationDate, Status: x.status }));
  } else if (reportId === "audit-register") {
    cols.push("Audit", "Company", "Country", "Standard", "Auditor", "Planned Start", "Status");
    rows = mockAudits.filter((x) => { const c = company(x.companyId); const auditor = mockAuditors.find((a) => a.id === x.leadAuditorId); return baseMatch(c?.country, x.standard, x.status, x.plannedStartDate, p) && (!p.auditorId || p.auditorId === "All" || x.leadAuditorId === p.auditorId || x.supportingAuditorIds.includes(p.auditorId)) && (!p.companyId || p.companyId === "All" || x.companyId === p.companyId) && Boolean(auditor || !p.auditorId || p.auditorId === "All"); }).map((x) => ({ Audit: x.auditNumber, Company: company(x.companyId)?.legalName ?? x.companyId, Country: company(x.companyId)?.country ?? "—", Standard: x.standard, Auditor: mockAuditors.find((a) => a.id === x.leadAuditorId)?.name ?? "Unassigned", "Planned Start": x.plannedStartDate, Status: x.status }));
  } else if (reportId === "certificate-register" || reportId === "expiry-report") {
    const limit = p.expiryRange === "30 Days" ? 30 : p.expiryRange === "60 Days" ? 60 : 90;
    rows = mockCertificates.filter((x) => { const c = company(x.companyId); const effective = effectiveCertificateStatus(x); const days = daysUntilExpiry(x.expiryDate); const expiryMatch = !["expiry-report", "certificate-register"].includes(reportId) || !p.expiryRange || p.expiryRange === "All" || (p.expiryRange === "Expired" ? days < 0 : days >= 0 && days <= limit); return baseMatch(c?.country, x.standard, effective, x.expiryDate, { ...p, status: p.status }) && (!p.companyId || p.companyId === "All" || x.companyId === p.companyId) && expiryMatch; }).map((x) => ({ Certificate: x.certificateNumber, Company: company(x.companyId)?.legalName ?? x.companyId, Country: company(x.companyId)?.country ?? "—", Standard: x.standard, Expiry: x.expiryDate, "Days Remaining": daysUntilExpiry(x.expiryDate), Status: effectiveCertificateStatus(x) }));
    cols.push("Certificate", "Company", "Country", "Standard", "Expiry", "Days Remaining", "Status");
  } else if (reportId === "auditor-workload") {
    const audits = mockAudits.filter((x) => baseMatch(company(x.companyId)?.country, x.standard, x.status, x.plannedStartDate, p));
    cols.push("Auditor", "Assigned Audits", "In Progress", "Completed", "Other Statuses");
    rows = mockAuditors.filter((a) => !p.auditorId || p.auditorId === "All" || a.id === p.auditorId).map((a) => { const assigned = audits.filter((x) => x.leadAuditorId === a.id || x.supportingAuditorIds.includes(a.id)); return { Auditor: a.name, "Assigned Audits": assigned.length, "In Progress": assigned.filter((x) => x.status === "In Progress").length, Completed: assigned.filter((x) => x.status === "Completed").length, "Other Statuses": assigned.filter((x) => !["In Progress", "Completed"].includes(x.status)).length }; });
  } else if (reportId === "country-standard-analysis") {
    cols.push("Country", "Standard", "Companies", "Applications", "Audits", "Certificates");
    const pairs = new Set<string>();
    mockCompanies.filter((c) => !p.country || p.country === "All" || c.country === p.country).forEach((c) => c.standards.filter((s) => !p.standard || p.standard === "All" || s === p.standard).forEach((s) => pairs.add(`${c.country}|||${s}`)));
    rows = Array.from(pairs).map((pair) => { const [countryName, standardValue] = pair.split("|||"); const standard = standardValue as (typeof mockCompanies)[number]["standards"][number]; const cs = mockCompanies.filter((c) => c.country === countryName && c.standards.includes(standard)); const ids = new Set(cs.map((c) => c.id)); return { Country: countryName, Standard: standard, Companies: cs.length, Applications: mockApplications.filter((x) => ids.has(x.companyId) && x.standard === standard && withinDate(x.applicationDate, p)).length, Audits: mockAudits.filter((x) => ids.has(x.companyId) && x.standard === standard && withinDate(x.plannedStartDate, p)).length, Certificates: mockCertificates.filter((x) => ids.has(x.companyId) && x.standard === standard && withinDate(x.issueDate, p)).length }; });
  } else {
    cols.push("Metric", "Value", "Country Filter", "Standard Filter");
    const scopedParameters = reportId === "management-dashboard" ? dashboardPeriod(p) : p;
    const apps = mockApplications.filter((x) => baseMatch(x.country, x.standard, x.status, x.applicationDate, scopedParameters));
    const audits = mockAudits.filter((x) => baseMatch(company(x.companyId)?.country, x.standard, x.status, x.plannedStartDate, scopedParameters));
    const certs = mockCertificates.filter((x) => baseMatch(company(x.companyId)?.country, x.standard, effectiveCertificateStatus(x), x.issueDate, scopedParameters));
    const active = certs.filter((x) => effectiveCertificateStatus(x) === "Active").length;
    rows = [["Companies", mockCompanies.filter((x) => !p.country || p.country === "All" || x.country === p.country).length], ["Applications", apps.length], ["Audits", audits.length], ["Open CAP findings", mockFindings.filter((x) => x.status !== "Closed").length], ["Certification cases", mockCertifications.length], ["Active certificates", active], ["Renewal follow-ups", mockRenewals.filter((x) => ["Renewal Due", "In Progress", "Upcoming"].includes(x.status)).length]].map(([Metric, Value]) => ({ Metric: String(Metric), Value: Number(Value), "Country Filter": p.country ?? "All", "Standard Filter": p.standard ?? "All" }));
  }
  return { title: reportCatalog.find((x) => x.id === reportId)?.name ?? "Report", columns: cols, rows, summary: [{ label: "Rows", value: rows.length }, { label: "Generated from", value: "EcoAssurance mock repositories" }] };
}
const actorMeta = (actor: ReportActor) => ({ performedBy: actor.id, performedByName: actor.name, role: actor.role });
export const reportRepository = {
  async catalog(actor: ReportActor): Promise<ReportDefinition[]> { requirePermission(actor, "reports.view"); return reportCatalog.map((x) => ({ ...x, parameters: [...x.parameters] })); },
  async listHistory(actor: ReportActor): Promise<GeneratedReportRecord[]> { requirePermission(actor, "reports.view"); return history.map((x) => ({ ...x, parameters: { ...x.parameters }, result: x.result ? { ...x.result, columns: [...x.result.columns], rows: x.result.rows.map((row) => ({ ...row })), summary: [...x.result.summary] } : undefined })); },
  async getRun(id: string, actor: ReportActor): Promise<GeneratedReportRecord | null> { requirePermission(actor, "reports.view"); const x = history.find((item) => item.id === id); return x ? { ...x, parameters: { ...x.parameters }, result: x.result ? { ...x.result, rows: x.result.rows.map((r) => ({ ...r })) } : undefined } : null; },
  async run(reportId: ReportId, parameters: ReportParameters, actor: ReportActor): Promise<GeneratedReportRecord> {
    requirePermission(actor, "reports.generate");
    const def = reportCatalog.find((item) => item.id === reportId); if (!def) throw new Error("Report definition not found.");
    const now = new Date().toISOString();
    const run: GeneratedReportRecord = { id: `report-run-${Date.now()}-${sequence++}`, reportId, reportName: def.name, parameters: { ...parameters }, generatedBy: actor.name ?? "Demo user", generatedById: actor.id ?? "user-unknown", generatedAt: now, format: "CSV", status: "Queued" };
    history.unshift(run);
    await new Promise((resolve) => setTimeout(resolve, 120)); run.status = "Generating";
    await new Promise((resolve) => setTimeout(resolve, 120));
    try { if (parameters.dateFrom && parameters.dateTo && parameters.dateFrom > parameters.dateTo) throw new Error("Start date must be before end date."); run.result = resultFor(reportId, parameters); run.status = "Ready"; }
    catch (error) { run.status = "Failed"; run.error = error instanceof Error ? error.message : "Mock generation failed."; }
    await activityRepository.create({ entityType: "report", entityId: run.id, activityType: "report_generated", description: `Report ${run.reportName} ${run.status.toLowerCase()}`, ...actorMeta(actor), metadata: { reference: run.reportName, status: run.status, format: run.format } });
    return { ...run, parameters: { ...run.parameters }, result: run.result ? { ...run.result, rows: run.result.rows.map((r) => ({ ...r })) } : undefined };
  },
  async export(id: string, format: ExportFormat, actor: ReportActor): Promise<GeneratedReportRecord> {
    requirePermission(actor, "reports.export"); const run = history.find((item) => item.id === id); if (!run || run.status !== "Ready") throw new Error("Only a ready report can be exported.");
    run.format = format; await activityRepository.create({ entityType: "report", entityId: run.id, activityType: "exported", description: `${run.reportName} export requested (${format})`, ...actorMeta(actor), metadata: { reference: run.reportName, format, status: run.status } });
    return { ...run, parameters: { ...run.parameters }, result: run.result ? { ...run.result, rows: run.result.rows.map((r) => ({ ...r })) } : undefined };
  },
};
