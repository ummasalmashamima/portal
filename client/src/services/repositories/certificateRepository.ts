import { mockCertificates } from "@/data/mockCertificates";
import { mockCompanies } from "@/data/mockCompanies";
import { mockApplications } from "@/data/mockApplications";
import { mockAudits } from "@/data/mockAudits";
import type { CertificateFilters, CertificateRecord, CertificateStatus, CertificateVersion, PaginatedCertificates } from "@/types/certificate";
import { activityRepository } from "./activityRepository";
import { certificationRepository, type CertificationActor } from "./certificationRepository";
import { nextReference, normalizedIncludes, paginate, parseDisplayDate } from "./repositoryUtils";

const store = mockCertificates as CertificateRecord[];
const managerRoles = new Set(["Super Admin", "Certification Manager"]);
function assertManager(actor: CertificationActor) { if (!managerRoles.has(actor.role ?? "")) throw new Error("Certificate management permission is required."); }
function todayISO() { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; }
function actorInfo(actor: CertificationActor = {}) { return { performedBy: actor.id ?? "user-system", performedByName: actor.name ?? "EcoAssurance user", role: actor.role ?? "System" }; }
export function daysUntilExpiry(expiryDate: string, referenceDate = new Date()): number {
  const target = new Date(`${expiryDate}T00:00:00`);
  const today = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), referenceDate.getDate());
  if (Number.isNaN(target.getTime())) return Number.POSITIVE_INFINITY;
  target.setHours(0, 0, 0, 0);
  return Math.ceil((target.getTime() - today.getTime()) / 86400000);
}
export function effectiveCertificateStatus(certificate: CertificateRecord, referenceDate = new Date()): CertificateStatus | "Expiring Soon" {
  if (["Renewed", "Withdrawn", "In Process", "Expired"].includes(certificate.status)) return certificate.status;
  const days = daysUntilExpiry(certificate.expiryDate, referenceDate);
  if (days <= 0) return "Expired";
  if (certificate.status === "Active" && days <= 30) return "Expiring Soon";
  return certificate.status;
}
function addYears(date: string, years: number) { const parsed = new Date(`${date}T00:00:00`); parsed.setFullYear(parsed.getFullYear() + years); return `${parsed.getFullYear()}-${String(parsed.getMonth() + 1).padStart(2, "0")}-${String(parsed.getDate()).padStart(2, "0")}`; }
function addMinor(version: string) { const [major, minor] = version.split(".").map(Number); return `${Number.isFinite(major) ? major : 1}.${(Number.isFinite(minor) ? minor : 0) + 1}`; }
function latestDoc(record: CertificateRecord) { return record.documents[record.documents.length - 1]; }
function linkedCompanyName(record: CertificateRecord) { return mockCompanies.find((item) => item.id === record.companyId)?.legalName ?? "Unknown company"; }
async function emit(record: CertificateRecord, description: string, activityType: "created" | "updated" | "document_uploaded" | "status_changed" | "approved" | "review_action", actor: CertificationActor, extra: Record<string, string | number | boolean | undefined> = {}) {
  const audit = record.auditId ? mockAudits.find((item) => item.id === record.auditId || item.auditNumber === record.auditId) : undefined;
  await activityRepository.create({ entityType: "certificate", entityId: record.id, activityType, description, ...actorInfo(actor), metadata: { reference: record.certificateNumber, companyId: record.companyId, applicationId: record.applicationId, auditId: audit?.id ?? record.auditId, auditNumber: audit?.auditNumber ?? record.auditReference, certificationId: record.certificationId, previousCertificateId: record.previousCertificateId, renewalId: record.renewalId, standard: record.standard, status: record.status, relatedEntity: `${linkedCompanyName(record)} · ${record.standard}`, ...extra } });
}
async function reconcileExpired() {
  const today = todayISO();
  for (const record of store) {
    if (["Active", "Conditional", "Suspended"].includes(record.status) && record.expiryDate <= today) {
      const updated = { ...record, status: "Expired" as const, lastUpdated: today };
      store[store.indexOf(record)] = updated;
      await emit(updated, `Certificate ${record.certificateNumber} expired; renewal was not completed before the expiry date`, "status_changed", {});
      if (record.certificationId) await certificationRepository.markCertificateExpired(record.certificationId, {});
    }
  }
}
function expiryWindowMatches(record: CertificateRecord, window: CertificateFilters["expiryWindow"]): boolean {
  if (!window || window === "All") return true;
  const days = daysUntilExpiry(record.expiryDate);
  if (window === "Expired") return days <= 0 || record.status === "Expired";
  if (window === "30 days") return days >= 0 && days <= 30;
  if (window === "60 days") return days >= 0 && days <= 60;
  if (window === "90 days") return days >= 0 && days <= 90;
  return days >= 0 && days <= 365;
}
function matchesAssignment(record: CertificateRecord, auditorId?: string) {
  if (!auditorId) return true;
  const audit = record.auditId ? mockAudits.find((item) => item.id === record.auditId || item.auditNumber === record.auditId) : undefined;
  return Boolean(audit && (audit.leadAuditorId === auditorId || audit.supportingAuditorIds.includes(auditorId)));
}

export const certificateRepository = {
  async list(filters: CertificateFilters = {}): Promise<PaginatedCertificates> {
    await reconcileExpired();
    const rows = store.filter((record) => {
      const company = mockCompanies.find((item) => item.id === record.companyId);
      const app = mockApplications.find((item) => item.id === record.applicationId);
      const status = effectiveCertificateStatus(record);
      const certification = record.certificationId ? certificationRepository.getByIdSync(record.certificationId) : undefined;
      const text = [record.certificateNumber, company?.legalName, company?.companyId, record.standard, record.scope, record.status, status, app?.applicationNumber, record.auditReference, record.certificateManagerName, record.version, certification?.certificationNumber].join(" ");
      const issueFrom = filters.issueDateFrom ?? filters.dateFrom; const issueTo = filters.issueDateTo ?? filters.dateTo;
      const inRange = (!issueFrom || new Date(`${issueFrom}T00:00:00`).getTime() <= new Date(`${record.issueDate}T23:59:59`).getTime()) && (!issueTo || new Date(`${issueTo}T23:59:59`).getTime() >= new Date(`${record.issueDate}T00:00:00`).getTime())
        && (!filters.expiryDateFrom || new Date(`${filters.expiryDateFrom}T00:00:00`).getTime() <= new Date(`${record.expiryDate}T23:59:59`).getTime())
        && (!filters.expiryDateTo || new Date(`${filters.expiryDateTo}T23:59:59`).getTime() >= new Date(`${record.expiryDate}T00:00:00`).getTime());
      return normalizedIncludes(text, filters.search)
        && (!filters.companyId || record.companyId === filters.companyId)
        && (!filters.country || filters.country === "All" || company?.country === filters.country)
        && (!filters.applicationId || record.applicationId === filters.applicationId)
        && (!filters.auditId || record.auditId === filters.auditId || record.auditReference === filters.auditId)
        && (!filters.standard || filters.standard === "All" || record.standard === filters.standard)
        && (!filters.status || filters.status === "All" || (filters.status === "Expiring Soon" ? status === "Expiring Soon" : record.status === filters.status))
        && expiryWindowMatches(record, filters.expiryWindow) && inRange && matchesAssignment(record, filters.assignedAuditorId);
    }).sort((a, b) => filters.sort === "oldest" ? parseDisplayDate(a.issueDate) - parseDisplayDate(b.issueDate) : filters.sort === "expiry" ? parseDisplayDate(a.expiryDate) - parseDisplayDate(b.expiryDate) : filters.sort === "company" ? linkedCompanyName(a).localeCompare(linkedCompanyName(b)) : parseDisplayDate(b.issueDate) - parseDisplayDate(a.issueDate));
    return paginate(rows.map((item) => ({ ...item, documents: item.documents.map((doc) => ({ ...doc })), versionHistory: item.versionHistory.map((entry) => ({ ...entry })) })), filters.page, filters.pageSize);
  },
  async getById(id: string, filters: Pick<CertificateFilters, "companyId" | "assignedAuditorId"> = {}): Promise<CertificateRecord | null> {
    await reconcileExpired();
    const record = store.find((item) => item.id === id || item.certificateNumber === id);
    if (!record || (filters.companyId && record.companyId !== filters.companyId) || !matchesAssignment(record, filters.assignedAuditorId)) return null;
    return { ...record, documents: record.documents.map((doc) => ({ ...doc })), versionHistory: record.versionHistory.map((entry) => ({ ...entry })) };
  },
  async getByCertificationId(certificationId: string): Promise<CertificateRecord | null> {
    await reconcileExpired();
    const record = store.find((item) => item.certificationId === certificationId);
    return record ? { ...record, documents: record.documents.map((doc) => ({ ...doc })), versionHistory: record.versionHistory.map((entry) => ({ ...entry })) } : null;
  },
  async generateFromCertification(certificationId: string, actor: CertificationActor = {}): Promise<CertificateRecord> {
    assertManager(actor);
    const certification = certificationRepository.getByIdSync(certificationId);
    if (!certification) throw new Error("Certification case not found.");
    if (!["Approved", "Conditional", "Certificate Generation"].includes(certification.status) || !certification.decision || !["Approve", "Conditional Approval"].includes(certification.decision)) throw new Error("A certificate can only be generated after an approval or conditional-approval decision.");
    const existing = store.find((item) => item.certificationId === certification.id);
    if (existing) return { ...existing, documents: [...existing.documents], versionHistory: [...existing.versionHistory] };
    const issueDate = todayISO();
    const expiryDate = addYears(issueDate, 3);
    const certificateNumber = nextReference("CERT", store.map((item) => item.certificateNumber));
    const certificateId = `cert-${certificateNumber.slice(-6)}`;
    const status = "In Process" as const;
    const version: CertificateVersion = { version: "1.0", scope: certification.scope, issueDate, effectiveDate: issueDate, expiryDate, status, changedAt: issueDate, changedBy: actor.name ?? "Certification Manager", changeReason: `Generated from ${certification.certificationNumber}.` };
    const record: CertificateRecord = {
      id: certificateId, certificateNumber, companyId: certification.companyId, applicationId: certification.applicationId, auditId: certification.auditId, auditReference: certification.auditReference,
      certificationId: certification.id, previousCertificateId: certification.previousCertificateId, renewalId: certification.renewalId,
      standard: certification.standard, scope: certification.scope, issueDate, effectiveDate: issueDate, expiryDate, status,
      approvalStatus: "Pending",
      certificateManagerId: actor.id ?? "user-cert-manager", certificateManagerName: actor.name ?? certification.certificationManagerName,
      version: "1.0", versionHistory: [version], documents: [{ id: `${certificateId}-doc-v1`, fileName: `${certificateNumber}-v1.0.pdf`, version: "1.0", generatedDate: issueDate, status: "Generated", downloadCount: 0 }],
      conditions: certification.conditions, conditionsSatisfied: certification.decision === "Approve", createdDate: issueDate, lastUpdated: issueDate,
    };
    store.unshift(record);
    await certificationRepository.markCertificateGenerated(certification.id, record.id, actor);
    await emit(record, `Certificate ${certificateNumber} generated as version 1.0`, "created", actor, { document: latestDoc(record)?.fileName, sourceCertification: certification.certificationNumber });
    return { ...record, documents: [...record.documents], versionHistory: [...record.versionHistory] };
  },
  async update(id: string, changes: { scope?: string; issueDate?: string; effectiveDate?: string; expiryDate?: string }, reason: string, actor: CertificationActor = {}): Promise<CertificateRecord> {
    assertManager(actor);
    const record = store.find((item) => item.id === id || item.certificateNumber === id);
    if (!record) throw new Error("Certificate not found.");
    if (["Expired", "Renewed", "Withdrawn"].includes(record.status)) throw new Error("An expired, renewed, or withdrawn certificate cannot be edited.");
    if (!reason.trim()) throw new Error("A change reason is required so certificate history is preserved.");
    const updatedFields = { ...record, ...changes };
    if (!(updatedFields.issueDate <= updatedFields.effectiveDate && updatedFields.effectiveDate < updatedFields.expiryDate)) throw new Error("Dates must be ordered: issue date, effective date, then expiry date.");
    const newVersion = addMinor(record.version);
    const newHistory: CertificateVersion = { version: newVersion, scope: updatedFields.scope, issueDate: updatedFields.issueDate, effectiveDate: updatedFields.effectiveDate, expiryDate: updatedFields.expiryDate, status: record.status, changedAt: todayISO(), changedBy: actor.name ?? "Certification Manager", changeReason: reason.trim() };
    const updated: CertificateRecord = { ...updatedFields, version: newVersion, versionHistory: [...record.versionHistory.map((entry) => ({ ...entry })), newHistory], documents: [...record.documents.map((doc) => ({ ...doc, status: "Superseded" as const })), { id: `${record.id}-doc-v${newVersion.replace(".", "-")}`, fileName: `${record.certificateNumber}-v${newVersion}.pdf`, version: newVersion, generatedDate: todayISO(), status: ["Active", "Conditional", "Suspended", "Renewed"].includes(record.status) ? "Current" : "Generated", downloadCount: 0 }], lastUpdated: todayISO() };
    store[store.indexOf(record)] = updated;
    await emit(updated, `Certificate Version Created: ${record.certificateNumber} v${newVersion} — ${reason.trim()}`, "updated", actor, { version: newVersion, reason: reason.trim(), previousVersion: record.version });
    return { ...updated, documents: [...updated.documents], versionHistory: [...updated.versionHistory] };
  },
  async approve(id: string, actor: CertificationActor = {}): Promise<CertificateRecord> {
    assertManager(actor);
    const record = store.find((item) => item.id === id || item.certificateNumber === id);
    if (!record) throw new Error("Certificate not found.");
    if (record.status !== "In Process" || record.approvalStatus === "Approved") throw new Error("Only a generated certificate awaiting approval can be approved.");
    const certification = record.certificationId ? certificationRepository.getByIdSync(record.certificationId) : null;
    if (!certification || !["Approve", "Conditional Approval"].includes(certification.decision ?? "")) throw new Error("An approved certification decision is required before certificate approval.");
    if (!latestDoc(record)) throw new Error("A certificate document must be generated before approval.");
    const approvedAt = todayISO();
    const docs = record.documents.map((doc) => ({ ...doc, status: doc.id === latestDoc(record).id ? "Approved" as const : doc.status }));
    const updated = { ...record, approvalStatus: "Approved" as const, approvedAt, approvedBy: actor.name ?? "Certification Manager", documents: docs, lastUpdated: approvedAt };
    store[store.indexOf(record)] = updated;
    await emit(updated, `Certificate ${record.certificateNumber} approved for issue`, "approved", actor, { approvedAt, approvedBy: actor.name ?? "Certification Manager" });
    return { ...updated, documents: [...updated.documents], versionHistory: [...updated.versionHistory] };
  },
  async issue(id: string, actor: CertificationActor = {}): Promise<CertificateRecord> {
    assertManager(actor);
    const record = store.find((item) => item.id === id || item.certificateNumber === id);
    if (!record) throw new Error("Certificate not found.");
    if (record.status !== "In Process" || record.approvalStatus !== "Approved") throw new Error("The certificate must be explicitly approved before it can be issued.");
    const certification = record.certificationId ? certificationRepository.getByIdSync(record.certificationId) : null;
    if (!certification || !["Approve", "Conditional Approval"].includes(certification.decision ?? "")) throw new Error("An approved certification decision is required before certificate activation.");
    if (!latestDoc(record)) throw new Error("A certificate document must be generated before issue.");
    const status: CertificateStatus = certification.decision === "Approve" ? "Active" : "Conditional";
    const docs = record.documents.map((doc) => ({ ...doc, status: doc.id === latestDoc(record).id ? "Current" as const : doc.status }));
    const updated = { ...record, status, approvalStatus: "Approved" as const, conditions: certification.conditions, conditionsSatisfied: status === "Active", documents: docs, lastUpdated: todayISO() };
    store[store.indexOf(record)] = updated;
    await certificationRepository.markCertificateActive(certification.id, record.id, status, actor);
    await emit(updated, status === "Active" ? `Certificate ${record.certificateNumber} issued and activated` : `Conditional certificate ${record.certificateNumber} issued`, "status_changed", actor, { decision: certification.decision });
    if (status === "Active" && record.previousCertificateId) await this.markPreviousRenewed(record.previousCertificateId, record.id, actor);
    if (status === "Active" && record.renewalId) await activityRepository.create({ entityType: "renewal", entityId: record.renewalId, activityType: "approved", description: `Renewal completed; replacement certificate ${record.certificateNumber} is active`, ...actorInfo(actor), metadata: { reference: record.renewalId, companyId: record.companyId, previousCertificateId: record.previousCertificateId, newCertificateId: record.id, certificateId: record.previousCertificateId, renewalId: record.renewalId, standard: record.standard, status: "Renewed", relatedEntity: `${linkedCompanyName(record)} · ${record.certificateNumber}` } });
    return { ...updated, documents: [...updated.documents], versionHistory: [...updated.versionHistory] };
  },
  async resolveConditionsAndActivate(id: string, reason: string, actor: CertificationActor = {}): Promise<CertificateRecord> {
    assertManager(actor);
    const record = store.find((item) => item.id === id || item.certificateNumber === id);
    if (!record || record.status !== "Conditional") throw new Error("Only a conditional certificate can be activated after conditions are resolved.");
    if (!reason.trim()) throw new Error("Record how the certificate conditions were resolved.");
    if (daysUntilExpiry(record.expiryDate) < 0) throw new Error("An expired certificate cannot be activated.");
    const updated: CertificateRecord = { ...record, status: "Active", conditionsSatisfied: true, conditions: `${record.conditions ?? ""}${record.conditions ? "\n" : ""}Resolved: ${reason.trim()}`, lastUpdated: todayISO() };
    store[store.indexOf(record)] = updated;
    if (record.certificationId) await certificationRepository.markCertificateActive(record.certificationId, record.id, "Active", actor);
    await emit(updated, `Conditional requirements resolved; certificate activated: ${reason.trim()}`, "status_changed", actor, { reason: reason.trim() });
    if (record.previousCertificateId) await this.markPreviousRenewed(record.previousCertificateId, record.id, actor);
    return { ...updated, documents: [...updated.documents], versionHistory: [...updated.versionHistory] };
  },
  async transition(id: string, next: "Suspended" | "Withdrawn" | "Active", reason: string, actor: CertificationActor = {}): Promise<CertificateRecord> {
    assertManager(actor);
    const record = store.find((item) => item.id === id || item.certificateNumber === id);
    if (!record) throw new Error("Certificate not found.");
    const allowed = (record.status === "Active" || record.status === "Conditional") ? ["Suspended", "Withdrawn"] : record.status === "Suspended" ? ["Active", "Withdrawn"] : [];
    if (!allowed.includes(next)) throw new Error(`The certificate cannot transition from ${record.status} to ${next}.`);
    if (!reason.trim()) throw new Error("A reason is required for this certificate status change.");
    if (next === "Active" && daysUntilExpiry(record.expiryDate) < 0) throw new Error("An expired certificate cannot be reactivated.");
    const updated: CertificateRecord = { ...record, status: next, suspendedReason: next === "Suspended" ? reason.trim() : record.suspendedReason, withdrawnReason: next === "Withdrawn" ? reason.trim() : record.withdrawnReason, lastUpdated: todayISO() };
    store[store.indexOf(record)] = updated;
    await emit(updated, next === "Suspended" ? `Certificate Suspended: ${reason.trim()}` : next === "Withdrawn" ? `Certificate Withdrawn: ${reason.trim()}` : `Certificate status changed to ${next}: ${reason.trim()}`, "status_changed", actor, { reason: reason.trim() });
    return { ...updated, documents: [...updated.documents], versionHistory: [...updated.versionHistory] };
  },
  async markPreviousRenewed(previousId: string, newCertificateId: string, actor: CertificationActor = {}): Promise<void> {
    const previous = store.find((item) => item.id === previousId || item.certificateNumber === previousId);
    if (!previous || ["Renewed", "Withdrawn"].includes(previous.status)) return;
    const updated = { ...previous, status: "Renewed" as const, lastUpdated: todayISO() };
    store[store.indexOf(previous)] = updated;
    await emit(updated, `Certificate ${previous.certificateNumber} marked Renewed by replacement certificate`, "status_changed", actor, { newCertificateId });
  },
  async recordDownload(id: string, actor: CertificationActor = {}): Promise<CertificateRecord> {
    const record = store.find((item) => item.id === id || item.certificateNumber === id);
    if (!record) throw new Error("Certificate not found.");
    if (record.status === "In Process") throw new Error("The certificate is not issued yet.");
    const docs = record.documents.map((doc) => ({ ...doc }));
    const current = docs.find((doc) => doc.status === "Current") ?? docs[docs.length - 1];
    if (current) current.downloadCount += 1;
    const updated = { ...record, documents: docs };
    store[store.indexOf(record)] = updated;
    await emit(updated, `Certificate download recorded for version ${current?.version ?? record.version}`, "review_action", actor, { version: current?.version ?? record.version, fileName: current?.fileName });
    return { ...updated, documents: [...updated.documents], versionHistory: [...updated.versionHistory] };
  },
  getByIdSync(id: string) { return store.find((item) => item.id === id || item.certificateNumber === id) ?? null; },
  statuses: ["All", "In Process", "Conditional", "Active", "Expiring Soon", "Suspended", "Withdrawn", "Expired", "Renewed"] as const,
};
