import { mockApplications } from "@/data/mockApplications";
import { mockAuditors } from "@/data/mockAuditors";
import { mockAudits } from "@/data/mockAudits";
import { mockCompanies } from "@/data/mockCompanies";
import type { AuditDocument, AuditFilters, AuditFinding, AuditRecord, AuditReport, AuditStatus } from "@/types/audit";
import type { ActivityRecord } from "@/types/activity";
import { activityRepository } from "./activityRepository";
import { dateWithinRange, nextReference, normalizedIncludes, paginate, parseDisplayDate } from "./repositoryUtils";
import { isWithinCurrentCompanyScope } from "./customerScope";

const store = mockAudits as AuditRecord[];
const applicationStore = mockApplications as import("@/types/application").ApplicationRecord[];
function resolve(id: string): AuditRecord | undefined {
  const direct = store.find((item) => item.id === id || item.auditNumber === id);
  if (direct) return direct;
  const alias = mockCompanies.flatMap((company) => company.audits.map((summary) => ({ company, summary }))).find(({ summary }) => summary.id === id);
  if (alias) return store.find((item) => item.auditNumber === alias.summary.referenceNo);
  return undefined;
}
function actor(record: AuditRecord) {
  const auditor = mockAuditors.find((item) => item.id === record.leadAuditorId);
  return { performedBy: record.leadAuditorId ?? "user-current", performedByName: auditor?.name ?? record.createdBy ?? "Current user", role: auditor?.role ?? "Audit Manager" };
}
type ActivityActor = Pick<ActivityRecord, "performedBy" | "performedByName" | "role">;
function save(record: AuditRecord): AuditRecord {
  const index = store.findIndex((item) => item.id === record.id);
  if (index >= 0) store[index] = record;
  const applicationIndex = applicationStore.findIndex((item) => item.id === record.applicationId);
  if (applicationIndex >= 0) applicationStore[applicationIndex] = { ...applicationStore[applicationIndex], relatedAudit: { auditNo: record.auditNumber, status: record.status }, lastUpdated: record.lastUpdated };
  return record;
}
async function event(record: AuditRecord, description: string, activityType: "created" | "updated" | "status_changed" | "document_uploaded" | "document_removed" | "review_action" = "status_changed", actorOverride?: ActivityActor) {
  await activityRepository.create({ entityType: "audit", entityId: record.id, activityType, description, ...actor(record), ...actorOverride, metadata: { reference: record.auditNumber, status: record.status } });
}

export const mockAuditRepository = {
  async list(filters: AuditFilters = {}) {
    const rows = store.filter((item) => {
      const company = mockCompanies.find((entry) => entry.id === item.companyId);
      const application = mockApplications.find((entry) => entry.id === item.applicationId);
      const auditor = mockAuditors.find((entry) => entry.id === item.leadAuditorId);
      const query = [item.auditNumber, company?.legalName, company?.companyId, application?.applicationNumber, auditor?.name, item.auditType, item.standard].join(" ");
      return isWithinCurrentCompanyScope(item.companyId)
        && normalizedIncludes(query, filters.search)
        && (!filters.status || filters.status === "All" || item.status === filters.status)
        && (!filters.auditType || filters.auditType === "All" || item.auditType === filters.auditType)
        && (!filters.standard || filters.standard === "All" || item.standard === filters.standard)
        && (!filters.country || filters.country === "All" || company?.country === filters.country)
        && (!filters.auditorId || filters.auditorId === "All" || item.leadAuditorId === filters.auditorId || item.supportingAuditorIds.includes(filters.auditorId))
        && (!filters.companyId || item.companyId === filters.companyId)
        && dateWithinRange(item.plannedStartDate, filters.dateRange);
    }).sort((a, b) => (parseDisplayDate(a.plannedStartDate) - parseDisplayDate(b.plannedStartDate)) * (filters.sort === "oldest" ? 1 : -1));
    return paginate(rows, filters.page, filters.pageSize);
  },
  async getById(id: string): Promise<AuditRecord | null> {
    const record = resolve(id);
    return record && isWithinCurrentCompanyScope(record.companyId) ? record : null;
  },
  async create(input: Omit<AuditRecord, "id" | "auditNumber" | "createdDate" | "lastUpdated">): Promise<AuditRecord> {
    const today = new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
    const record: AuditRecord = {
      ...input,
      id: `audit-${String(store.length + 1).padStart(3, "0")}`,
      auditNumber: nextReference("AUD", store.map((item) => item.auditNumber), 6),
      createdDate: today,
      lastUpdated: today,
      supportingAuditorIds: [...input.supportingAuditorIds],
      documents: [...input.documents],
      findings: [...input.findings],
      report: { ...input.report },
    };
    store.unshift(record);
    save(record);
    await event(record, "Audit created", "created");
    return record;
  },
  async update(id: string, changes: Partial<AuditRecord>): Promise<AuditRecord> {
    const old = resolve(id);
    if (!old) throw new Error("Audit not found");
    const record = save({ ...old, ...changes, id: old.id, auditNumber: old.auditNumber, lastUpdated: new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) });
    await event(record, "Audit plan updated", "updated");
    return record;
  },
  async transition(id: string, status: AuditStatus, description?: string, actorOverride?: ActivityActor): Promise<AuditRecord> {
    const old = resolve(id);
    if (!old) throw new Error("Audit not found");
    if (status === "Under Review" && (old.status !== "Submitted" || old.report.status !== "Submitted")) throw new Error("Only audits with a submitted report can be moved into review.");
    const record = save({ ...old, status, lastUpdated: new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) });
    await event(record, description ?? `Audit status changed to ${status}`, "status_changed", actorOverride);
    return record;
  },
  async assign(id: string, leadAuditorId: string, supportingAuditorIds: string[]): Promise<AuditRecord> {
    const old = resolve(id);
    if (!old) throw new Error("Audit not found");
    const record = save({ ...old, leadAuditorId, supportingAuditorIds: [...supportingAuditorIds], status: old.status === "Planned" ? "Assigned" : old.status, lastUpdated: new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) });
    await event(record, `Auditor assignment updated${mockAuditors.find((item) => item.id === leadAuditorId) ? `: ${mockAuditors.find((item) => item.id === leadAuditorId)?.name}` : ""}`);
    return record;
  },
  async addFinding(id: string, finding: AuditFinding): Promise<AuditRecord> {
    const old = resolve(id);
    if (!old) throw new Error("Audit not found");
    const record = save({ ...old, findings: [...old.findings, { ...finding }], lastUpdated: new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) });
    await event(record, `Finding ${finding.id} added`, "review_action");
    return record;
  },
  async addDocument(id: string, document: AuditDocument): Promise<AuditRecord> {
    const old = resolve(id);
    if (!old) throw new Error("Audit not found");
    const record = save({ ...old, documents: [...old.documents, { ...document }] });
    await event(record, `Audit document uploaded: ${document.fileName}`, "document_uploaded");
    return record;
  },
  async removeDocument(id: string, documentId: string): Promise<AuditRecord> {
    const old = resolve(id);
    if (!old) throw new Error("Audit not found");
    const removed = old.documents.find((item) => item.id === documentId);
    const record = save({ ...old, documents: old.documents.filter((item) => item.id !== documentId) });
    if (removed) await event(record, `Audit document removed: ${removed.fileName}`, "document_removed");
    return record;
  },
  async prepareReport(id: string, report: AuditReport): Promise<AuditRecord> {
    const old = resolve(id);
    if (!old) throw new Error("Audit not found");
    const record = save({ ...old, report: { ...report }, status: report.status === "Submitted" ? "Submitted" : old.status === "Completed" ? "Report Pending" : old.status, lastUpdated: new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) });
    await event(record, report.status === "Submitted" ? "Audit report submitted" : "Audit report saved as draft", "review_action");
    return record;
  },
};
