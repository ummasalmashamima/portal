import { mockApplications } from "@/data/mockApplications";
import { mockAudits } from "@/data/mockAudits";
import { mockCertifications } from "@/data/mockCertifications";
import { mockCertificates } from "@/data/mockCertificates";
import { mockCompanies } from "@/data/mockCompanies";
import { mockFindings } from "@/data/mockFindings";
import { mockTechnicalReviews } from "@/data/mockTechnicalReviews";
import type { CertificationDecision, CertificationFilters, CertificationReadinessItem, CertificationRecord, CertificationStatus, PaginatedCertifications, TechnicalReviewSummary } from "@/types/certification";
import type { Standard } from "@/types/company";
import type { TechnicalReviewRecord } from "@/types/technicalReview";
import { activityRepository } from "./activityRepository";
import { nextReference, normalizedIncludes, paginate, parseDisplayDate } from "./repositoryUtils";

export interface CertificationActor { id?: string; name?: string; role?: string; }
const store = mockCertifications as CertificationRecord[];
const managerRoles = new Set(["Super Admin", "Certification Manager"]);
function assertManager(actor: CertificationActor) { if (!managerRoles.has(actor.role ?? "")) throw new Error("Certification management permission is required."); }
function todayISO() { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; }
function todayLabel() { return new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }); }
function actorInfo(actor: CertificationActor = {}) { return { performedBy: actor.id ?? "user-system", performedByName: actor.name ?? "EcoAssurance user", role: actor.role ?? "System" }; }
function resolveAudit(record: CertificationRecord) { return record.auditId ? mockAudits.find((audit) => audit.id === record.auditId || audit.auditNumber === record.auditId) : undefined; }
function canonicalRefs(record: CertificationRecord) {
  const audit = resolveAudit(record);
  const technicalReview = canonicalTechnicalReview(record);
  return { companyId: record.companyId, applicationId: record.applicationId, auditId: audit?.id ?? record.auditId, auditNumber: audit?.auditNumber ?? record.auditReference, technicalReviewId: technicalReview?.id ?? record.technicalReviewId, technicalReviewReference: technicalReview?.reference ?? record.technicalReview.reference, certificationNumber: record.certificationNumber, previousCertificateId: record.previousCertificateId, certificateId: record.certificateId, renewalId: record.renewalId, relatedEntity: [audit?.auditNumber ?? record.auditReference, record.applicationId ? mockApplications.find((item) => item.id === record.applicationId)?.applicationNumber : undefined].filter(Boolean).join(" · ") };
}
function validateLinks(companyId: string, applicationId?: string, auditId?: string, standard?: Standard) {
  const company = mockCompanies.find((item) => item.id === companyId);
  if (!company) throw new Error("Select an existing company.");
  const application = applicationId ? mockApplications.find((item) => item.id === applicationId) : undefined;
  if (applicationId && (!application || application.companyId !== companyId)) throw new Error("The selected application does not belong to this company.");
  if (standard && application && application.standard !== standard) throw new Error("The certification standard must match the linked application.");
  const audit = auditId ? mockAudits.find((item) => item.id === auditId || item.auditNumber === auditId) : undefined;
  if (auditId && !audit) throw new Error("Select an existing audit.");
  if (audit && (audit.companyId !== companyId || (application && audit.applicationId !== application.id))) throw new Error("The selected audit must belong to the selected application and company.");
  if (standard && audit && audit.standard !== standard) throw new Error("The certification standard must match the linked audit.");
  if (application?.status === "Rejected") throw new Error("A rejected application cannot enter certification.");
  return { company, application, audit };
}
function canonicalTechnicalReview(record: CertificationRecord) {
  return record.technicalReviewId
    ? mockTechnicalReviews.find((item) => item.id === record.technicalReviewId || item.reference === record.technicalReviewId)
    : mockTechnicalReviews.find((item) => item.reference === record.technicalReview.reference && item.companyId === record.companyId && item.applicationId === record.applicationId && item.auditId === resolveAudit(record)?.id);
}
function legacyReviewStatus(review: TechnicalReviewRecord["status"]): TechnicalReviewSummary["status"] {
  if (review === "Completed") return "Completed";
  if (review === "Returned for Correction" || review === "Rejected") return "Returned";
  if (review === "In Review" || review === "Approved") return "Under Review";
  return "Pending";
}
function summaryFromReview(review: TechnicalReviewRecord): TechnicalReviewSummary {
  return {
    reference: review.reference,
    status: legacyReviewStatus(review.status),
    result: review.status === "Completed" && review.decision === "Approve" ? "Recommended for certification" : review.status === "Rejected" ? "Not recommended" : review.status === "Returned for Correction" ? "Returned for correction" : undefined,
    reviewer: review.reviewerName,
    completedDate: review.completedAt?.slice(0, 10),
    summary: review.reviewSummary || review.reviewerComments || "Technical Review is linked as an upstream certification input.",
  };
}
function validateTechnicalReviewLink(id: string | undefined, companyId: string, applicationId: string | undefined, auditId: string | undefined, standard: Standard) {
  if (!id) return undefined;
  const review = mockTechnicalReviews.find((item) => item.id === id || item.reference === id);
  if (!review) throw new Error("Select an existing Technical Review.");
  const audit = auditId ? mockAudits.find((item) => item.id === auditId || item.auditNumber === auditId) : undefined;
  if (!audit || review.companyId !== companyId || review.applicationId !== applicationId || review.auditId !== audit.id || review.standard !== standard) throw new Error("The Technical Review must belong to the selected company, application, audit, and standard.");
  return review;
}
function cloneCertification(record: CertificationRecord): CertificationRecord {
  const review = canonicalTechnicalReview(record);
  return { ...record, technicalReview: review ? summaryFromReview(review) : { ...record.technicalReview } };
}
function assertAuditAccepted(auditId?: string) {
  const audit = auditId ? mockAudits.find((item) => item.id === auditId || item.auditNumber === auditId) : undefined;
  if (!audit || audit.status !== "Completed" || audit.report.status !== "Submitted") throw new Error("Certification review can only proceed after a linked audit is completed and its report is submitted.");
}
function buildReadiness(record: CertificationRecord): CertificationReadinessItem[] {
  const { company, application, audit } = validateLinks(record.companyId, record.applicationId, record.auditId, record.standard);
  const auditComplete = Boolean(audit && audit.status === "Completed" && audit.report.status === "Submitted");
  const canonicalReview = canonicalTechnicalReview(record);
  const validCanonicalLink = Boolean(canonicalReview && audit && canonicalReview.companyId === company.id && canonicalReview.applicationId === application?.id && canonicalReview.auditId === audit.id && canonicalReview.standard === record.standard);
  const reviewComplete = Boolean(validCanonicalLink && canonicalReview?.status === "Completed" && canonicalReview.decision === "Approve");
  const findings = audit ? mockFindings.filter((finding) => finding.auditId === audit.id) : [];
  const findingsAddressed = Boolean(audit && findings.every((finding) => finding.status === "Closed"));
  const documentsAvailable = Boolean(application?.documents.some((doc) => doc.status === "Accepted") || audit?.documents.some((doc) => doc.status === "Accepted") || (audit && audit.report.status === "Submitted"));
  const scopeConfirmed = Boolean(company && application && application.companyId === company.id && application.standard === record.standard && application.scope.trim() && record.scope.trim());
  return [
    { key: "audit", label: "Audit completed and report accepted", complete: auditComplete, detail: audit ? `${audit.auditNumber} · ${audit.status} · report ${audit.report.status}` : "A canonical audit record is not linked." },
    { key: "technicalReview", label: "Technical review completed and approved", complete: reviewComplete, detail: record.technicalReviewId && !validCanonicalLink ? "The linked Technical Review does not match this Company, Application, Audit, and standard." : canonicalReview ? `${canonicalReview.reference} · ${canonicalReview.status}${canonicalReview.decision ? ` · ${canonicalReview.decision}` : ""}` : record.technicalReview.reference ? `${record.technicalReview.reference} · ${record.technicalReview.status}${record.technicalReview.result ? ` · ${record.technicalReview.result}` : ""}` : `Upstream review status: ${record.technicalReview.status}` },
    { key: "findings", label: "Required findings addressed", complete: findingsAddressed, detail: audit ? (findings.length ? `${findings.filter((item) => item.status === "Closed").length} of ${findings.length} linked findings closed` : "No linked findings are open.") : "A canonical audit is required to verify linked findings." },
    { key: "documents", label: "Required application/audit documents available", complete: documentsAvailable, detail: documentsAvailable ? "Accepted application or audit evidence / submitted report is available." : "No accepted application/audit evidence or submitted audit report is available." },
    { key: "scope", label: "Company, application, standard and scope confirmed", complete: scopeConfirmed, detail: scopeConfirmed ? `${company?.legalName} · ${record.standard}` : "The scope or company/application/standard relationship needs confirmation." },
  ];
}
async function emit(record: CertificationRecord, description: string, activityType: "created" | "updated" | "submitted" | "status_changed" | "approved" | "rejected" | "review_action", actor: CertificationActor, extra: Record<string, string | number | boolean | undefined> = {}) {
  await activityRepository.create({ entityType: "certification", entityId: record.id, activityType, description, ...actorInfo(actor), metadata: { ...canonicalRefs(record), status: record.status, standard: record.standard, ...extra } });
}
function assigned(record: CertificationRecord, auditorId?: string) {
  if (!auditorId) return true;
  const audit = resolveAudit(record);
  return Boolean(audit && (audit.leadAuditorId === auditorId || audit.supportingAuditorIds.includes(auditorId)));
}
function canMoveToDecision(status: CertificationStatus) { return status === "Certification Review"; }

export const certificationRepository = {
  async list(filters: CertificationFilters = {}): Promise<PaginatedCertifications> {
    const rows = store.filter((record) => {
      const company = mockCompanies.find((item) => item.id === record.companyId);
      const app = mockApplications.find((item) => item.id === record.applicationId);
      const audit = resolveAudit(record);
      const certificate = mockCertificates.find((item) => item.id === record.certificateId || item.certificationId === record.id || item.id === record.previousCertificateId);
      const upstream = canonicalTechnicalReview(record);
      const upstreamSummary = upstream ? summaryFromReview(upstream) : record.technicalReview;
      const text = [record.certificationNumber, certificate?.certificateNumber, company?.legalName, company?.companyId, app?.applicationNumber, audit?.auditNumber ?? record.auditReference, record.standard, record.scope, record.status, upstreamSummary.reference, upstreamSummary.status, record.certificationManagerName, record.decision].join(" ");
      const inRange = (!filters.dateFrom || parseDisplayDate(record.createdDate) >= new Date(filters.dateFrom).getTime()) && (!filters.dateTo || parseDisplayDate(record.createdDate) <= new Date(`${filters.dateTo}T23:59:59`).getTime());
      return normalizedIncludes(text, filters.search)
        && (!filters.companyId || record.companyId === filters.companyId)
        && (!filters.country || filters.country === "All" || company?.country === filters.country)
        && (!filters.applicationId || record.applicationId === filters.applicationId)
        && (!filters.auditId || record.auditId === filters.auditId || record.auditReference === filters.auditId || audit?.auditNumber === filters.auditId)
        && (!filters.standard || filters.standard === "All" || record.standard === filters.standard)
        && (!filters.status || filters.status === "All" || record.status === filters.status)
        && (!filters.technicalReviewStatus || filters.technicalReviewStatus === "All" || upstreamSummary.status === filters.technicalReviewStatus)
        && (!filters.managerId || filters.managerId === "All" || record.certificationManagerId === filters.managerId)
        && assigned(record, filters.assignedAuditorId) && inRange;
    }).sort((a, b) => {
      if (filters.sort === "oldest") return parseDisplayDate(a.createdDate) - parseDisplayDate(b.createdDate);
      if (filters.sort === "status") return a.status.localeCompare(b.status);
      if (filters.sort === "decision-date") return parseDisplayDate(b.decisionDate ?? "") - parseDisplayDate(a.decisionDate ?? "");
      if (filters.sort === "expiry-date") {
        const left = mockCertificates.find((item) => item.id === a.certificateId || item.certificationId === a.id || item.id === a.previousCertificateId);
        const right = mockCertificates.find((item) => item.id === b.certificateId || item.certificationId === b.id || item.id === b.previousCertificateId);
        return parseDisplayDate(left?.expiryDate ?? "") - parseDisplayDate(right?.expiryDate ?? "");
      }
      return parseDisplayDate(b.createdDate) - parseDisplayDate(a.createdDate);
    });
    return paginate(rows.map(cloneCertification), filters.page, filters.pageSize);
  },
  async getById(id: string, filters: Pick<CertificationFilters, "companyId" | "assignedAuditorId"> = {}): Promise<CertificationRecord | null> {
    const record = store.find((item) => item.id === id || item.certificationNumber === id);
    if (!record || (filters.companyId && record.companyId !== filters.companyId) || !assigned(record, filters.assignedAuditorId)) return null;
    return cloneCertification(record);
  },
  readiness(recordOrId: CertificationRecord | string): CertificationReadinessItem[] {
    const record = typeof recordOrId === "string" ? store.find((item) => item.id === recordOrId || item.certificationNumber === recordOrId) : recordOrId;
    if (!record) throw new Error("Certification record not found.");
    return buildReadiness(record);
  },
  async create(input: { companyId: string; applicationId: string; auditId?: string; technicalReviewId?: string; technicalReview?: TechnicalReviewSummary; certificationManagerId?: string; certificationManagerName?: string; previousCertificateId?: string; renewalId?: string }, actor: CertificationActor = {}): Promise<CertificationRecord> {
    assertManager(actor);
    const application = mockApplications.find((item) => item.id === input.applicationId);
    const standard = application?.standard as Standard | undefined;
    validateLinks(input.companyId, input.applicationId, input.auditId, standard);
    assertAuditAccepted(input.auditId);
    const linkedReview = validateTechnicalReviewLink(input.technicalReviewId, input.companyId, input.applicationId, input.auditId, standard!);
    if (store.some((record) => record.applicationId === input.applicationId && record.auditId === input.auditId && record.status !== "Rejected" && record.status !== "Renewed" && record.renewalId === input.renewalId)) throw new Error("A certification cycle already exists for this application and audit.");
    const now = todayISO();
    const certificationNumber = nextReference("EC-CERT", store.map((item) => item.certificationNumber));
    const record: CertificationRecord = {
      id: certificationNumber.toLowerCase(), certificationNumber, companyId: input.companyId, applicationId: input.applicationId, auditId: input.auditId,
      standard: standard!, scope: application!.scope, technicalReviewId: linkedReview?.id, technicalReview: linkedReview ? summaryFromReview(linkedReview) : input.technicalReview ?? { status: "Not Started" }, status: "In Process",
      certificationManagerId: input.certificationManagerId ?? actor.id ?? "user-cert-manager", certificationManagerName: input.certificationManagerName ?? actor.name ?? "Certification Manager",
      previousCertificateId: input.previousCertificateId, renewalId: input.renewalId, createdDate: now, lastUpdated: now,
    };
    store.unshift(record); await emit(record, "Certification case created from existing workflow records", "created", actor);
    if (record.technicalReview.reference) await emit(record, `Technical Review ${record.technicalReview.reference} linked to certification`, "updated", actor, { technicalReviewReference: record.technicalReview.reference, technicalReviewStatus: record.technicalReview.status });
    return cloneCertification(record);
  },
  async createFromRenewal(input: { companyId: string; applicationId?: string; auditId?: string; previousCertificateId: string; renewalId: string; standard: Standard; scope: string }, actor: CertificationActor = {}): Promise<CertificationRecord> {
    assertManager(actor);
    validateLinks(input.companyId, input.applicationId, input.auditId, input.standard);
    const existing = store.find((item) => item.renewalId === input.renewalId);
    if (existing) return { ...existing, technicalReview: { ...existing.technicalReview } };
    const now = todayISO();
    const certificationNumber = nextReference("EC-CERT", store.map((item) => item.certificationNumber));
    const record: CertificationRecord = {
      id: certificationNumber.toLowerCase(), certificationNumber, companyId: input.companyId, applicationId: input.applicationId, auditId: input.auditId,
      standard: input.standard, scope: input.scope, technicalReview: { status: "Not Started" }, status: "In Process",
      certificationManagerId: actor.id ?? "user-cert-manager", certificationManagerName: actor.name ?? "Certification Manager",
      previousCertificateId: input.previousCertificateId, renewalId: input.renewalId, createdDate: now, lastUpdated: now,
    };
    store.unshift(record); await emit(record, "Renewal certification cycle started", "created", actor, { previousCertificateId: input.previousCertificateId });
    if (record.technicalReview.reference) await emit(record, `Technical Review ${record.technicalReview.reference} linked to renewal certification`, "updated", actor, { technicalReviewReference: record.technicalReview.reference, technicalReviewStatus: record.technicalReview.status });
    return { ...record, technicalReview: { ...record.technicalReview } };
  },
  async update(id: string, changes: { applicationId?: string; auditId?: string; technicalReviewId?: string; certificationManagerId?: string; certificationManagerName?: string; technicalReview?: TechnicalReviewSummary; scope?: string }, actor: CertificationActor = {}): Promise<CertificationRecord> {
    assertManager(actor);
    const index = store.findIndex((item) => item.id === id || item.certificationNumber === id);
    if (index < 0) throw new Error("Certification record not found.");
    const old = store[index];
    if (["Active", "Suspended", "Withdrawn", "Expired", "Renewed", "Rejected"].includes(old.status)) throw new Error("A closed or historical certification cycle cannot be edited.");
    const applicationId = changes.applicationId ?? old.applicationId;
    const auditId = changes.auditId ?? old.auditId;
    validateLinks(old.companyId, applicationId, auditId, old.standard);
    const hasTechnicalReviewId = Object.prototype.hasOwnProperty.call(changes, "technicalReviewId");
    const technicalReviewId = hasTechnicalReviewId ? changes.technicalReviewId : old.technicalReviewId;
    const linkedReview = validateTechnicalReviewLink(technicalReviewId, old.companyId, applicationId, auditId, old.standard);
    const technicalReview = linkedReview ? summaryFromReview(linkedReview) : hasTechnicalReviewId ? { status: "Not Started" as const } : changes.technicalReview ? { ...changes.technicalReview } : { ...old.technicalReview };
    const updated = { ...old, ...changes, applicationId, auditId, technicalReviewId: linkedReview?.id, lastUpdated: todayISO(), technicalReview };
    store[index] = updated;
    await emit(updated, "Certification case updated", "updated", actor);
    return cloneCertification(updated);
  },
  async startReview(id: string, actor: CertificationActor = {}): Promise<CertificationRecord> {
    assertManager(actor);
    const record = store.find((item) => item.id === id || item.certificationNumber === id);
    if (!record || !["In Process", "Returned for Correction"].includes(record.status)) throw new Error("Certification review cannot start from the current status.");
    assertAuditAccepted(record.auditId);
    const updated = { ...record, status: "Certification Review" as const, reviewDate: todayISO(), lastUpdated: todayISO() };
    store[store.indexOf(record)] = updated;
    await emit(updated, "Certification review started", "status_changed", actor);
    return { ...updated, technicalReview: { ...updated.technicalReview } };
  },
  async submitForDecision(id: string, actor: CertificationActor = {}): Promise<CertificationRecord> {
    assertManager(actor);
    const record = store.find((item) => item.id === id || item.certificationNumber === id);
    if (!record || !canMoveToDecision(record.status)) throw new Error("Only a certification under review can be submitted for decision.");
    const blockers = buildReadiness(record).filter((item) => !item.complete);
    if (blockers.length) throw new Error(`Decision is blocked: ${blockers.map((item) => item.label).join(", ")}.`);
    const updated = { ...record, status: "Decision Pending" as const, lastUpdated: todayISO() };
    store[store.indexOf(record)] = updated;
    await emit(updated, "Certification submitted for independent decision", "submitted", actor);
    if (updated.renewalId) await activityRepository.create({ entityType: "renewal", entityId: updated.renewalId, activityType: "submitted", description: "Renewal certification case submitted for independent decision", ...actorInfo(actor), metadata: { reference: updated.renewalId, companyId: updated.companyId, renewalId: updated.renewalId, newCertificationId: updated.id, previousCertificateId: updated.previousCertificateId, auditId: updated.auditId, applicationId: updated.applicationId, standard: updated.standard, status: updated.status, relatedEntity: `${mockCompanies.find((company) => company.id === updated.companyId)?.legalName ?? updated.companyId} · ${updated.standard}` } });
    return { ...updated, technicalReview: { ...updated.technicalReview } };
  },
  async recordDecision(id: string, input: { decision: CertificationDecision; decisionDate: string; decisionMaker: string; remarks: string; conditions?: string }, actor: CertificationActor = {}): Promise<CertificationRecord> {
    assertManager(actor);
    const record = store.find((item) => item.id === id || item.certificationNumber === id);
    if (!record || record.status !== "Decision Pending") throw new Error("A decision can only be recorded for a pending certification.");
    if (!input.decisionDate || !input.decisionMaker.trim() || !input.remarks.trim()) throw new Error("Decision date, decision maker, and remarks are required.");
    if (input.decision === "Conditional Approval" && !input.conditions?.trim()) throw new Error("Conditions are required for a conditional approval.");
    const blockers = buildReadiness(record).filter((item) => !item.complete);
    if (blockers.length) throw new Error(`Decision is blocked: ${blockers.map((item) => item.label).join(", ")}.`);
    const status: CertificationStatus = input.decision === "Approve" ? "Approved" : input.decision === "Conditional Approval" ? "Conditional" : input.decision === "Return for Correction" ? "Returned for Correction" : "Rejected";
    const updated = { ...record, status, decision: input.decision, decisionDate: input.decisionDate, decisionMaker: input.decisionMaker.trim(), decisionRemarks: input.remarks.trim(), conditions: input.decision === "Conditional Approval" ? input.conditions?.trim() : undefined, lastUpdated: todayISO() };
    store[store.indexOf(record)] = updated;
    const activityType = input.decision === "Approve" || input.decision === "Conditional Approval" ? "approved" : input.decision === "Reject" ? "rejected" : "review_action";
    const decisionDescription = input.decision === "Approve" ? "Certification Approved" : input.decision === "Conditional Approval" ? "Certification Conditionally Approved" : input.decision === "Return for Correction" ? "Certification Returned for Correction" : "Certification Rejected";
    await emit(updated, decisionDescription, activityType, actor, { decision: input.decision, decisionDate: input.decisionDate, decisionMaker: input.decisionMaker, comment: input.remarks, conditions: input.conditions });
    if (updated.renewalId) await activityRepository.create({ entityType: "renewal", entityId: updated.renewalId, activityType: input.decision === "Approve" || input.decision === "Conditional Approval" ? "approved" : input.decision === "Reject" ? "rejected" : "review_action", description: `Renewal certification decision: ${input.decision}`, ...actorInfo(actor), metadata: { reference: updated.renewalId, companyId: updated.companyId, renewalId: updated.renewalId, newCertificationId: updated.id, previousCertificateId: updated.previousCertificateId, auditId: updated.auditId, applicationId: updated.applicationId, standard: updated.standard, status: updated.status, decision: input.decision, comment: input.remarks, relatedEntity: `${mockCompanies.find((company) => company.id === updated.companyId)?.legalName ?? updated.companyId} · ${updated.standard}` } });
    return { ...updated, technicalReview: { ...updated.technicalReview } };
  },
  async markCertificateGenerated(id: string, certificateId: string, actor: CertificationActor = {}): Promise<CertificationRecord> {
    assertManager(actor);
    const record = store.find((item) => item.id === id || item.certificationNumber === id);
    if (!record || !["Approved", "Conditional"].includes(record.status)) throw new Error("A certificate can only be generated after an approval decision.");
    const status: CertificationStatus = record.status === "Approved" ? "Certificate Generation" : "Conditional";
    const updated = { ...record, certificateId, status, lastUpdated: todayISO() };
    store[store.indexOf(record)] = updated;
    await emit(updated, "Certificate generated from the approved certification case", "status_changed", actor, { certificateId });
    if (updated.renewalId) await activityRepository.create({ entityType: "renewal", entityId: updated.renewalId, activityType: "created", description: "New Certificate Created for the renewal cycle", ...actorInfo(actor), metadata: { reference: updated.renewalId, companyId: updated.companyId, renewalId: updated.renewalId, newCertificationId: updated.id, newCertificateId: certificateId, previousCertificateId: updated.previousCertificateId, certificateId: updated.previousCertificateId, auditId: updated.auditId, applicationId: updated.applicationId, standard: updated.standard, status: "Certificate Generation", relatedEntity: `${mockCompanies.find((company) => company.id === updated.companyId)?.legalName ?? updated.companyId} · ${updated.standard}` } });
    return { ...updated, technicalReview: { ...updated.technicalReview } };
  },
  async markCertificateActive(id: string, certificateId: string, status: "Active" | "Conditional", actor: CertificationActor = {}): Promise<CertificationRecord> {
    assertManager(actor);
    const record = store.find((item) => item.id === id || item.certificationNumber === id);
    if (!record) throw new Error("Certification record not found.");
    const updated = { ...record, certificateId, status, lastUpdated: todayISO() };
    store[store.indexOf(record)] = updated;
    await emit(updated, status === "Active" ? "Certification cycle activated after certificate approval" : "Conditional certificate issued", status === "Active" ? "approved" : "status_changed", actor, { certificateId });
    return { ...updated, technicalReview: { ...updated.technicalReview } };
  },
  async markCertificateExpired(id: string, actor: CertificationActor = {}): Promise<void> {
    const record = store.find((item) => item.id === id || item.certificationNumber === id);
    if (!record || ["Expired", "Renewed", "Withdrawn", "Rejected"].includes(record.status)) return;
    const updated = { ...record, status: "Expired" as const, lastUpdated: todayISO() };
    store[store.indexOf(record)] = updated;
    await emit(updated, "Certification status changed to Expired after certificate expiry", "status_changed", actor);
  },
  getByIdSync(id: string) { return store.find((item) => item.id === id || item.certificationNumber === id) ?? null; },
  statuses: ["All", "In Process", "Certification Review", "Decision Pending", "Approved", "Conditional", "Certificate Generation", "Active", "Suspended", "Withdrawn", "Expired", "Renewed", "Returned for Correction", "Rejected"] as const,
  technicalReviewStatuses: ["All", "Not Started", "Pending", "Under Review", "Completed", "Returned"] as const,
};
