import { mockFindings } from "@/data/mockFindings";
import { mockAuditors } from "@/data/mockAuditors";
import { mockAudits } from "@/data/mockAudits";
import { mockApplications } from "@/data/mockApplications";
import { mockCompanies } from "@/data/mockCompanies";
import type { AuditFinding, AuditRecord } from "@/types/audit";
import type { FindingDocument, FindingFilters, FindingRecord, FindingStatus, FindingStatusView, FindingUpdate, PaginatedFindings, ReviewerDecision } from "@/types/finding";
import { activityRepository } from "./activityRepository";
import { nextReference, normalizedIncludes, paginate, parseDisplayDate } from "./repositoryUtils";

export interface FindingActor { id?: string; name?: string; role?: string; }
export interface CreateFindingInput {
  auditId: string;
  findingType: FindingRecord["findingType"];
  clause: string;
  description: string;
  objectiveEvidence: string;
  responsiblePersonId?: string;
  responsiblePerson: string;
  correction?: string;
  rootCause?: string;
  correctiveAction?: string;
  targetDate: string;
  evidenceOfClosure?: string;
}

const store = mockFindings as FindingRecord[];
const auditStore = mockAudits as AuditRecord[];
const applicationStore = mockApplications;
const companyStore = mockCompanies;
const transitions: Record<FindingStatus, FindingStatus[]> = {
  Open: ["CAP Submitted"],
  "CAP Submitted": ["Under Review"],
  "Under Review": ["Accepted", "Correction Required"],
  "Correction Required": ["CAP Resubmitted"],
  "CAP Resubmitted": ["Under Review"],
  Accepted: ["Closed"],
  Closed: [],
};

function resolveAudit(id: string) {
  const direct = auditStore.find((item) => item.id === id || item.auditNumber === id);
  if (direct) return direct;
  const alias = companyStore.flatMap((company) => company.audits.map((summary) => ({ company, summary }))).find(({ summary }) => summary.id === id);
  return alias ? auditStore.find((item) => item.auditNumber === alias.summary.referenceNo) : undefined;
}
function actorInfo(actor: FindingActor = {}) {
  return { performedBy: actor.id ?? "user-system", performedByName: actor.name ?? "EcoAssurance user", role: actor.role ?? "System" };
}
function todayDisplay() { return new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }); }
function isoToday() { const date = new Date(); return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`; }
function dateLabel(value: string) { const date = new Date(value); return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }); }
export function effectiveFindingStatus(finding: FindingRecord): FindingStatusView {
  if (finding.status === "Closed" || !finding.targetDate) return finding.status;
  const due = new Date(`${finding.targetDate}T00:00:00`).getTime();
  const today = new Date(); today.setHours(0, 0, 0, 0);
  return !Number.isNaN(due) && due < today.getTime() ? "Overdue" : finding.status;
}
function auditSummary(finding: FindingRecord): AuditFinding {
  return {
    id: finding.id,
    findingType: finding.findingType,
    description: finding.description,
    clause: finding.clause,
    classification: finding.findingType.includes("Nonconformity") ? finding.findingType.split(" ")[0] : undefined,
    evidence: finding.objectiveEvidence,
    status: finding.status,
    correctiveAction: finding.correctiveAction,
    dueDate: dateLabel(finding.targetDate),
  };
}
function syncAudit(finding: FindingRecord) {
  const audit = auditStore.find((item) => item.id === finding.auditId);
  if (!audit) return;
  const index = audit.findings.findIndex((item) => item.id === finding.id || item.id === finding.findingNumber);
  const summary = auditSummary(finding);
  if (index >= 0) audit.findings[index] = summary;
  else audit.findings.push(summary);
}
function isVisibleToAuditor(finding: FindingRecord, auditorId?: string) {
  if (!auditorId) return true;
  const audit = auditStore.find((item) => item.id === finding.auditId);
  return Boolean(audit && (audit.leadAuditorId === auditorId || audit.supportingAuditorIds.includes(auditorId)));
}
async function emit(finding: FindingRecord, description: string, activityType: "created" | "updated" | "status_changed" | "submitted" | "document_uploaded" | "review_action", actor: FindingActor, extra: Record<string, string | number | boolean | undefined> = {}) {
  await activityRepository.create({
    entityType: "finding", entityId: finding.id, activityType, description,
    ...actorInfo(actor),
    metadata: {
      reference: finding.findingNumber, status: finding.status, auditId: finding.auditId,
      auditNumber: finding.auditNumber, applicationId: finding.applicationId, companyId: finding.companyId,
      standard: finding.standard, relatedEntity: `Audit ${finding.auditNumber}`, ...extra,
    },
  });
}
function matchesAuditAssignment(record: FindingRecord, auditorId?: string) {
  if (!auditorId) return true;
  const audit = auditStore.find((item) => item.id === record.auditId);
  return Boolean(audit && (audit.leadAuditorId === auditorId || audit.supportingAuditorIds.includes(auditorId)));
}

// Hydrate existing Audit Detail records from the single canonical CAP store.
for (const finding of store) syncAudit(finding);

export const findingRepository = {
  async list(filters: FindingFilters = {}): Promise<PaginatedFindings> {
    const rows = store.filter((finding) => {
      const company = companyStore.find((item) => item.id === finding.companyId);
      const status = effectiveFindingStatus(finding);
      const searchText = [finding.findingNumber, finding.auditNumber, company?.legalName, company?.companyId, finding.standard, finding.clause, finding.findingType, finding.description, finding.responsiblePerson, status].join(" ");
      return normalizedIncludes(searchText, filters.search)
        && normalizedIncludes(finding.findingNumber, filters.findingNo)
        && normalizedIncludes(finding.auditNumber, filters.auditNo)
        && (!filters.companyId || finding.companyId === filters.companyId)
        && (!filters.findingType || filters.findingType === "All" || finding.findingType === filters.findingType)
        && (!filters.standard || filters.standard === "All" || finding.standard === filters.standard)
        && normalizedIncludes(finding.clause, filters.clause)
        && (!filters.status || filters.status === "All" || status === filters.status)
        && (!filters.responsiblePersonId || filters.responsiblePersonId === "All" || finding.responsiblePersonId === filters.responsiblePersonId)
        && (!filters.targetDate || finding.targetDate === filters.targetDate)
        && (!filters.auditId || finding.auditId === filters.auditId || finding.auditNumber === filters.auditId)
        && matchesAuditAssignment(finding, filters.assignedAuditorId);
    }).sort((a, b) => {
      if (filters.sort === "oldest") return parseDisplayDate(a.createdDate) - parseDisplayDate(b.createdDate);
      if (filters.sort === "target-date") return parseDisplayDate(a.targetDate) - parseDisplayDate(b.targetDate);
      if (filters.sort === "status") return effectiveFindingStatus(a).localeCompare(effectiveFindingStatus(b));
      return parseDisplayDate(b.createdDate) - parseDisplayDate(a.createdDate);
    });
    return paginate(rows.map((item) => ({ ...item, documents: [...item.documents] })), filters.page, filters.pageSize);
  },
  async getById(id: string, filters: Pick<FindingFilters, "companyId" | "assignedAuditorId"> = {}): Promise<FindingRecord | null> {
    const finding = store.find((item) => item.id === id || item.findingNumber === id);
    if (!finding || (filters.companyId && finding.companyId !== filters.companyId) || !matchesAuditAssignment(finding, filters.assignedAuditorId)) return null;
    return { ...finding, documents: [...finding.documents] };
  },
  async listByAudit(auditId: string): Promise<FindingRecord[]> {
    const audit = resolveAudit(auditId);
    if (!audit) return [];
    return store.filter((item) => item.auditId === audit.id).sort((a, b) => parseDisplayDate(b.createdDate) - parseDisplayDate(a.createdDate)).map((item) => ({ ...item, documents: [...item.documents] }));
  },
  async create(input: CreateFindingInput, actor: FindingActor = {}): Promise<FindingRecord> {
    const audit = resolveAudit(input.auditId);
    if (!audit) throw new Error("Findings must be created from an existing audit.");
    const application = applicationStore.find((item) => item.id === audit.applicationId);
    const company = companyStore.find((item) => item.id === audit.companyId);
    if (!application || !company || application.companyId !== company.id) throw new Error("The audit's application and company relationship is invalid.");
    const now = todayDisplay();
    const findingNumber = nextReference("FIND", store.map((item) => item.findingNumber), 6);
    const who = actorInfo(actor);
    const finding: FindingRecord = {
      id: findingNumber, findingNumber, auditId: audit.id, auditNumber: audit.auditNumber,
      applicationId: application.id, companyId: company.id, standard: audit.standard,
      clause: input.clause, findingType: input.findingType, description: input.description,
      objectiveEvidence: input.objectiveEvidence, responsiblePersonId: input.responsiblePersonId,
      responsiblePerson: input.responsiblePerson || "Unassigned", correction: input.correction ?? "",
      rootCause: input.rootCause ?? "", correctiveAction: input.correctiveAction ?? "",
      targetDate: input.targetDate || isoToday(), evidenceOfClosure: input.evidenceOfClosure ?? "",
      status: "Open", reviewerDecision: "Open", reviewerComments: "", createdBy: who.performedByName,
      createdDate: now, lastUpdated: now, documents: [],
    };
    store.unshift(finding);
    syncAudit(finding);
    await emit(finding, "Finding Created", "created", actor);
    if (finding.responsiblePersonId || finding.responsiblePerson !== "Unassigned") await emit(finding, `Responsible Person Assigned: ${finding.responsiblePerson}`, "updated", actor);
    return { ...finding, documents: [...finding.documents] };
  },
  async update(id: string, changes: FindingUpdate, actor: FindingActor = {}): Promise<FindingRecord> {
    const index = store.findIndex((item) => item.id === id || item.findingNumber === id);
    if (index < 0) throw new Error("Finding not found.");
    const old = store[index];
    const updated: FindingRecord = { ...old, ...changes, id: old.id, findingNumber: old.findingNumber, auditId: old.auditId, auditNumber: old.auditNumber, applicationId: old.applicationId, companyId: old.companyId, standard: old.standard, status: old.status, reviewerDecision: old.reviewerDecision, reviewer: old.reviewer, reviewerComments: old.reviewerComments, decisionDate: old.decisionDate, documents: old.documents, lastUpdated: todayDisplay() };
    store[index] = updated;
    syncAudit(updated);
    const descriptions: string[] = [];
    if (changes.responsiblePerson !== undefined && changes.responsiblePerson !== old.responsiblePerson) descriptions.push(`Responsible Person Assigned: ${updated.responsiblePerson}`);
    if (changes.correction !== undefined && changes.correction !== old.correction) descriptions.push(updated.correction ? "Correction Added or Updated" : "Correction Cleared");
    if (changes.rootCause !== undefined && changes.rootCause !== old.rootCause) descriptions.push(updated.rootCause ? "Root Cause Added or Updated" : "Root Cause Cleared");
    if (changes.correctiveAction !== undefined && changes.correctiveAction !== old.correctiveAction) descriptions.push(updated.correctiveAction ? "Corrective Action Added or Updated" : "Corrective Action Cleared");
    if (changes.targetDate !== undefined && changes.targetDate !== old.targetDate) descriptions.push("Target Date Changed");
    if (changes.objectiveEvidence !== undefined && changes.objectiveEvidence !== old.objectiveEvidence) descriptions.push("Objective Evidence Updated");
    if (changes.evidenceOfClosure !== undefined && changes.evidenceOfClosure !== old.evidenceOfClosure) descriptions.push("Closure Evidence Added or Updated");
    if (changes.description !== undefined && changes.description !== old.description) descriptions.push("Finding Updated");
    if (changes.clause !== undefined && changes.clause !== old.clause) descriptions.push("Requirement / Clause Updated");
    if (changes.findingType !== undefined && changes.findingType !== old.findingType) descriptions.push("Finding Type Updated");
    if (changes.responsiblePersonId !== undefined && changes.responsiblePersonId !== old.responsiblePersonId && !descriptions.some((item) => item.startsWith("Responsible Person"))) descriptions.push(`Responsible Person Assigned: ${updated.responsiblePerson}`);
    for (const description of Array.from(new Set(descriptions))) await emit(updated, description, "updated", actor, { oldTargetDate: changes.targetDate !== old.targetDate ? old.targetDate : undefined, newTargetDate: changes.targetDate });
    return { ...updated, documents: [...updated.documents] };
  },
  canTransition(status: FindingStatus, next: FindingStatus): boolean { return transitions[status].includes(next); },
  availableTransitions(status: FindingStatus): FindingStatus[] { return [...transitions[status]]; },
  async transition(id: string, next: FindingStatus, actor: FindingActor = {}): Promise<FindingRecord> {
    const index = store.findIndex((item) => item.id === id || item.findingNumber === id);
    if (index < 0) throw new Error("Finding not found.");
    const old = store[index];
    if (!transitions[old.status].includes(next)) throw new Error(`Transition from ${old.status} to ${next} is not permitted.`);
    const updated: FindingRecord = {
      ...old,
      status: next,
      ...(next === "Under Review" ? { reviewer: actor.name ?? "EcoAssurance reviewer", decisionDate: todayDisplay() } : {}),
      lastUpdated: todayDisplay(),
    };
    store[index] = updated;
    syncAudit(updated);
    const action: Record<FindingStatus, string> = {
      Open: "Finding Created",
      "CAP Submitted": "CAP Submitted",
      "Under Review": "CAP Reviewed",
      "Correction Required": "Correction Requested",
      "CAP Resubmitted": "CAP Resubmitted",
      Accepted: "CAP Accepted",
      Closed: "Finding Closed",
    };
    const activityType = next === "CAP Submitted" || next === "CAP Resubmitted" ? "submitted" : next === "Under Review" || next === "Accepted" || next === "Correction Required" ? "review_action" : "status_changed";
    await emit(updated, action[next], activityType, actor, { previousStatus: old.status, status: next });
    return { ...updated, documents: [...updated.documents] };
  },
  async recordDecision(id: string, decision: "Accepted" | "Closed", comments: string, actor: FindingActor = {}): Promise<FindingRecord> {
    const index = store.findIndex((item) => item.id === id || item.findingNumber === id);
    if (index < 0) throw new Error("Finding not found.");
    const old = store[index];
    const nextStatus: FindingStatus = decision;
    if (!transitions[old.status].includes(nextStatus)) throw new Error(`Reviewer decision ${decision} is not available while the finding is ${old.status}.`);
    if (decision === "Closed" && !old.evidenceOfClosure.trim() && !old.documents.some((item) => item.documentType === "Closure Evidence")) throw new Error("Add closure evidence before closing this finding.");
    const updated: FindingRecord = { ...old, status: nextStatus, reviewerDecision: decision, reviewer: actor.name ?? "EcoAssurance reviewer", reviewerComments: comments, decisionDate: todayDisplay(), lastUpdated: todayDisplay() };
    store[index] = updated;
    syncAudit(updated);
    await emit(updated, decision === "Accepted" ? "CAP Accepted" : "Finding Closed", decision === "Accepted" ? "review_action" : "status_changed", actor, { decision, comment: comments, previousStatus: old.status });
    return { ...updated, documents: [...updated.documents] };
  },
  async requestCorrection(id: string, comments: string, actor: FindingActor = {}): Promise<FindingRecord> {
    const index = store.findIndex((item) => item.id === id || item.findingNumber === id);
    if (index < 0) throw new Error("Finding not found.");
    const old = store[index];
    if (!transitions[old.status].includes("Correction Required")) throw new Error(`Correction cannot be requested while the finding is ${old.status}.`);
    const updated: FindingRecord = { ...old, status: "Correction Required", reviewerDecision: "Correction Required", reviewer: actor.name ?? "EcoAssurance reviewer", reviewerComments: comments, decisionDate: todayDisplay(), lastUpdated: todayDisplay() };
    store[index] = updated;
    syncAudit(updated);
    await emit(updated, "Correction Requested", "review_action", actor, { decision: "Correction Required", comment: comments, previousStatus: old.status });
    return { ...updated, documents: [...updated.documents] };
  },
  async addDocument(id: string, input: Omit<FindingDocument, "id" | "version" | "uploadDate" | "uploadedBy" | "relatedFinding"> & { uploadedBy?: string }, actor: FindingActor = {}): Promise<FindingRecord> {
    const index = store.findIndex((item) => item.id === id || item.findingNumber === id);
    if (index < 0) throw new Error("Finding not found.");
    const finding = store[index];
    const versions = finding.documents.filter((item) => item.fileName.toLocaleLowerCase() === input.fileName.toLocaleLowerCase());
    const highest = versions.reduce((value, item) => Math.max(value, Number(item.version.match(/\d+/)?.[0] ?? 0)), 0);
    const document: FindingDocument = {
      id: `${finding.id}-doc-${Date.now()}-${finding.documents.length + 1}`, fileName: input.fileName, documentType: input.documentType,
      version: `v${(highest + 1).toFixed(1)}`, uploadedBy: input.uploadedBy ?? actor.name ?? "EcoAssurance user",
      uploadDate: todayDisplay(), relatedFinding: finding.findingNumber, description: input.description,
    };
    const updated = { ...finding, documents: [...finding.documents, document], lastUpdated: todayDisplay() };
    store[index] = updated;
    await emit(updated, `Evidence Uploaded: ${document.fileName} (${document.version})`, "document_uploaded", actor, { documentId: document.id, documentType: document.documentType, version: document.version });
    return { ...updated, documents: [...updated.documents] };
  },
};
