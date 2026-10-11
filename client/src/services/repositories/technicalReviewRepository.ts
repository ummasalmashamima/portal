import { mockApplications } from "@/data/mockApplications";
import { mockAudits } from "@/data/mockAudits";
import { mockAuditors } from "@/data/mockAuditors";
import { mockCertifications } from "@/data/mockCertifications";
import { mockCompanies } from "@/data/mockCompanies";
import { mockDocuments } from "@/data/mockDocuments";
import { mockFindings } from "@/data/mockFindings";
import { demoUsers } from "@/data/mockAuth";
import { mockTechnicalReviews } from "@/data/mockTechnicalReviews";
import { rolePermissions } from "@/data/navigation";
import { activityRepository } from "@/services/repositories/activityRepository";
import { documentRepository } from "@/services/repositories/documentRepository";
import type { Permission, UserRole } from "@/types/auth";
import type { ActivityFilters } from "@/types/activity";
import type { TechnicalReviewDecision, TechnicalReviewFilters, TechnicalReviewRecord, TechnicalReviewStatus } from "@/types/technicalReview";
import { nextReference, normalizedIncludes, paginate } from "./repositoryUtils";

export interface TechnicalReviewActor { id?: string; name?: string; role?: UserRole; }
export interface TechnicalReviewOptions {
  companies: typeof mockCompanies;
  applications: typeof mockApplications;
  audits: typeof mockAudits;
  auditors: typeof mockAuditors;
  reviewers: typeof demoUsers;
  certifications: typeof mockCertifications;
  findings: typeof mockFindings;
  documents: typeof mockDocuments;
}
export interface TechnicalReviewBundle {
  review: TechnicalReviewRecord;
  company: (typeof mockCompanies)[number];
  application: (typeof mockApplications)[number];
  audit: (typeof mockAudits)[number];
  leadAuditor?: (typeof mockAuditors)[number];
  supportingAuditors: (typeof mockAuditors)[number][];
  findings: typeof mockFindings;
  documents: typeof mockDocuments;
  certifications: typeof mockCertifications;
  history: Awaited<ReturnType<typeof activityRepository.listByEntity>>;
}

const store = mockTechnicalReviews as TechnicalReviewRecord[];
const can = (actor: TechnicalReviewActor, permission: Permission) => Boolean(actor.role && rolePermissions[actor.role]?.includes(permission));
function canView(actor: TechnicalReviewActor) { return can(actor, "technical-reviews.view") || can(actor, "technicalReviews.view"); }
function assertView(actor: TechnicalReviewActor) { if (!canView(actor)) throw new Error("Technical Review access is not available to this account."); }
function assertManage(actor: TechnicalReviewActor) { if (!can(actor, "technicalReviews.decide")) throw new Error("Technical Review workflow permission is required."); }
function visible(record: TechnicalReviewRecord, actor: TechnicalReviewActor) {
  if (actor.role === "Technical Reviewer") return Boolean(actor.id && record.reviewerId === actor.id);
  return canView(actor);
}
function clone(record: TechnicalReviewRecord): TechnicalReviewRecord { return { ...record }; }
function timestamp() { return new Date().toISOString(); }
function dateOnly() { const now = new Date(); return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`; }
function actorFields(actor: TechnicalReviewActor) { return { performedBy: actor.id ?? "user-system", performedByName: actor.name ?? "EcoAssurance user", role: actor.role ?? "System" }; }
function dateValue(value?: string) { const result = value ? new Date(`${value.slice(0, 10)}T00:00:00`).getTime() : 0; return Number.isNaN(result) ? 0 : result; }
function related(record: TechnicalReviewRecord) {
  const company = mockCompanies.find((item) => item.id === record.companyId);
  const application = mockApplications.find((item) => item.id === record.applicationId);
  const audit = mockAudits.find((item) => item.id === record.auditId || item.auditNumber === record.auditId);
  if (!company || !application || !audit || application.companyId !== company.id || audit.companyId !== company.id || audit.applicationId !== application.id || audit.standard !== record.standard) {
    throw new Error("Technical Review must use matching existing Company, Application, and Audit records.");
  }
  return { company, application, audit };
}
function ensureSource(input: Pick<TechnicalReviewRecord, "companyId" | "applicationId" | "auditId">) {
  const company = mockCompanies.find((item) => item.id === input.companyId);
  const application = mockApplications.find((item) => item.id === input.applicationId);
  const audit = mockAudits.find((item) => item.id === input.auditId || item.auditNumber === input.auditId);
  if (!company || !application || !audit) throw new Error("Select existing Company, Application, and Audit records.");
  if (application.companyId !== company.id || audit.companyId !== company.id || audit.applicationId !== application.id) throw new Error("The selected Company, Application, and Audit must belong to the same workflow.");
  if (application.standard !== audit.standard) throw new Error("The selected Application and Audit standards must match.");
  return { company, application, audit };
}
function fromTechnicalReviewStatus(status: TechnicalReviewStatus) {
  if (status === "Completed") return "Completed" as const;
  if (status === "Returned for Correction" || status === "Rejected") return "Returned" as const;
  if (status === "In Review" || status === "Approved") return "Under Review" as const;
  return "Pending" as const;
}
function syncCertification(review: TechnicalReviewRecord) {
  const linked = mockCertifications.filter((item) => item.technicalReviewId === review.id);
  for (const certification of linked) {
    certification.technicalReview = {
      reference: review.reference,
      status: fromTechnicalReviewStatus(review.status),
      result: review.status === "Completed" && review.decision === "Approve" ? "Recommended for certification" : review.status === "Rejected" ? "Not recommended" : review.status === "Returned for Correction" ? "Returned for correction" : undefined,
      reviewer: review.reviewerName,
      completedDate: review.completedAt?.slice(0, 10),
      summary: review.reviewSummary || review.reviewerComments || "Technical Review is linked as an upstream certification input.",
    };
    certification.lastUpdated = review.lastUpdated;
  }
}
async function emit(review: TechnicalReviewRecord, description: string, activityType: "created" | "updated" | "submitted" | "moved_to_review" | "status_changed" | "approved" | "rejected" | "review_action", actor: TechnicalReviewActor, extra: Record<string, string | number | boolean | undefined> = {}) {
  await activityRepository.create({
    entityType: "technical_review", entityId: review.id, activityType, description, ...actorFields(actor),
    metadata: { reference: review.reference, companyId: review.companyId, applicationId: review.applicationId, auditId: review.auditId, standard: review.standard, status: review.status, reviewerId: review.reviewerId, reviewerName: review.reviewerName, reviewDate: review.reviewDate, ...extra },
  });
}
function toBundleDocs(review: TechnicalReviewRecord, actor: TechnicalReviewActor) {
  if (!can(actor, "documents.view")) return [] as typeof mockDocuments;
  const allowed = new Set([review.auditId, ...mockFindings.filter((item) => item.auditId === review.auditId).map((item) => item.id), ...mockFindings.filter((item) => item.auditId === review.auditId).map((item) => item.findingNumber)]);
  return mockDocuments.filter((document) => document.companyId === review.companyId && (
    (document.relatedEntityType === "technical_review" && [review.id, review.reference].includes(document.relatedEntityId))
    || (document.relatedEntityType === "audit" && allowed.has(document.relatedEntityId))
    || (document.relatedEntityType === "finding" && allowed.has(document.relatedEntityId))
  ));
}
function seedOrCurrentCertificationMatches(review: TechnicalReviewRecord) {
  return mockCertifications.filter((record) => record.technicalReviewId === review.id || (record.technicalReview.reference === review.reference && record.companyId === review.companyId && record.applicationId === review.applicationId && record.auditId === review.auditId));
}

export const technicalReviewRepository = {
  async list(filters: TechnicalReviewFilters = {}, actor: TechnicalReviewActor = {}) {
    assertView(actor);
    const rows = store.filter((record) => {
      const company = mockCompanies.find((item) => item.id === record.companyId);
      const app = mockApplications.find((item) => item.id === record.applicationId);
      const audit = mockAudits.find((item) => item.id === record.auditId);
      const auditor = mockAuditors.find((item) => item.id === audit?.leadAuditorId);
      const text = [record.reference, company?.legalName, company?.companyId, app?.applicationNumber, audit?.auditNumber, record.standard, record.reviewType, record.status, auditor?.name, record.reviewerName, record.priority].join(" ");
      return visible(record, actor)
        && normalizedIncludes(text, filters.search)
        && (!filters.status || filters.status === "All" || record.status === filters.status)
        && (!filters.companyId || record.companyId === filters.companyId)
        && (!filters.standard || filters.standard === "All" || record.standard === filters.standard)
        && (!filters.reviewerId || filters.reviewerId === "All" || record.reviewerId === filters.reviewerId)
        && (!filters.assignedReviewerId || record.reviewerId === filters.assignedReviewerId)
        && (!filters.reviewDateFrom || dateValue(record.reviewDate) >= dateValue(filters.reviewDateFrom))
        && (!filters.reviewDateTo || dateValue(record.reviewDate) <= dateValue(filters.reviewDateTo));
    }).sort((left, right) => {
      if (filters.sort === "oldest") return dateValue(left.reviewDate) - dateValue(right.reviewDate);
      if (filters.sort === "status") return left.status.localeCompare(right.status);
      if (filters.sort === "priority") return ["Normal", "High", "Urgent"].indexOf(right.priority) - ["Normal", "High", "Urgent"].indexOf(left.priority);
      return dateValue(right.reviewDate) - dateValue(left.reviewDate);
    });
    return paginate(rows.map(clone), filters.page, filters.pageSize);
  },
  async getById(id: string, actor: TechnicalReviewActor = {}) {
    assertView(actor);
    const record = store.find((item) => item.id === id || item.reference === id);
    return record && visible(record, actor) ? clone(record) : null;
  },
  async getBundle(id: string, actor: TechnicalReviewActor = {}): Promise<TechnicalReviewBundle | null> {
    assertView(actor);
    const review = store.find((item) => item.id === id || item.reference === id);
    if (!review || !visible(review, actor)) return null;
    const { company, application, audit } = related(review);
    const findings = mockFindings.filter((item) => item.auditId === audit.id).map((item) => ({ ...item, documents: item.documents.map((doc) => ({ ...doc })) }));
    const history = await activityRepository.listByEntity("technical_review", review.id);
    return {
      review: clone(review), company, application, audit,
      leadAuditor: mockAuditors.find((item) => item.id === audit.leadAuditorId),
      supportingAuditors: audit.supportingAuditorIds.map((id) => mockAuditors.find((item) => item.id === id)).filter((item): item is (typeof mockAuditors)[number] => Boolean(item)),
      findings, documents: toBundleDocs(review, actor), certifications: seedOrCurrentCertificationMatches(review), history,
    };
  },
  async listActivity(filters: ActivityFilters = {}, actor: TechnicalReviewActor = {}) {
    assertView(actor);
    const records = await activityRepository.list(filters);
    if (actor.role !== "Technical Reviewer") return records;
    const assigned = store.filter((review) => review.reviewerId === actor.id);
    const reviewIds = new Set(assigned.flatMap((review) => [review.id, review.reference]));
    const auditIds = new Set(assigned.flatMap((review) => { const audit = mockAudits.find((item) => item.id === review.auditId || item.auditNumber === review.auditId); return audit ? [audit.id, audit.auditNumber] : [review.auditId]; }));
    const findingIds = new Set(mockFindings.filter((finding) => auditIds.has(finding.auditId)).flatMap((finding) => [finding.id, finding.findingNumber]));
    return records.filter((item) => {
      if (item.entityType === "technical_review") return reviewIds.has(item.entityId);
      if (item.entityType === "audit") return auditIds.has(item.entityId);
      if (item.entityType === "finding") return findingIds.has(item.entityId) || auditIds.has(String(item.metadata.auditId ?? ""));
      if (item.entityType === "document") {
        const type = item.metadata.relatedEntityType;
        const id = String(item.metadata.relatedEntityId ?? "");
        return (type === "technical_review" && reviewIds.has(id)) || (type === "audit" && auditIds.has(id)) || (type === "finding" && findingIds.has(id));
      }
      return false;
    });
  },
  options(actor: TechnicalReviewActor = {}): TechnicalReviewOptions {
    assertView(actor);
    if (actor.role !== "Technical Reviewer") return { companies: mockCompanies, applications: mockApplications, audits: mockAudits, auditors: mockAuditors, reviewers: demoUsers.filter((user) => user.role === "Technical Reviewer"), certifications: mockCertifications, findings: mockFindings, documents: mockDocuments };
    const assigned = store.filter((review) => review.reviewerId === actor.id);
    const companyIds = new Set(assigned.map((review) => review.companyId)); const applicationIds = new Set(assigned.map((review) => review.applicationId)); const auditIds = new Set(assigned.map((review) => review.auditId));
    const auditors = new Set(assigned.flatMap((review) => { const audit = mockAudits.find((item) => item.id === review.auditId || item.auditNumber === review.auditId); return audit ? [audit.leadAuditorId, ...audit.supportingAuditorIds] : []; }));
    const certificationIds = new Set(assigned.flatMap((review) => seedOrCurrentCertificationMatches(review).map((item) => item.id)));
    const assignedFindings = mockFindings.filter((item) => auditIds.has(item.auditId));
    const assignedDocuments = Array.from(new Map(assigned.flatMap((review) => toBundleDocs(review, actor)).map((item) => [item.id, item])).values());
    return { companies: mockCompanies.filter((item) => companyIds.has(item.id)), applications: mockApplications.filter((item) => applicationIds.has(item.id)), audits: mockAudits.filter((item) => auditIds.has(item.id) || auditIds.has(item.auditNumber)), auditors: mockAuditors.filter((item) => auditors.has(item.id)), reviewers: demoUsers.filter((user) => user.role === "Technical Reviewer" && user.id === actor.id), certifications: mockCertifications.filter((item) => certificationIds.has(item.id)), findings: assignedFindings, documents: assignedDocuments };
  },
  async create(input: Pick<TechnicalReviewRecord, "reviewType" | "companyId" | "applicationId" | "auditId" | "reviewDate" | "reviewerId" | "priority"> & Partial<Pick<TechnicalReviewRecord, "reviewSummary" | "technicalAssessment" | "auditReportReview" | "findingsReview" | "capReview" | "evidenceReview" | "complianceAssessment" | "reviewerComments">>, actor: TechnicalReviewActor = {}) {
    assertManage(actor);
    if (!input.reviewDate || !input.reviewerId) throw new Error("Review date and reviewer are required.");
    const reviewer = demoUsers.find((user) => user.id === input.reviewerId && user.role === "Technical Reviewer");
    if (!reviewer) throw new Error("Select an existing Technical Reviewer.");
    if (actor.role === "Technical Reviewer" && reviewer.id !== actor.id) throw new Error("A Technical Reviewer can assign a case only to their own queue.");
    const source = ensureSource(input);
    if (store.some((item) => item.auditId === source.audit.id && !["Completed", "Rejected"].includes(item.status))) throw new Error("An active Technical Review already exists for this audit.");
    const now = timestamp();
    const reference = nextReference("TR", store.map((item) => item.reference), 6);
    const record: TechnicalReviewRecord = {
      id: reference, reference, reviewType: input.reviewType, companyId: source.company.id, applicationId: source.application.id, auditId: source.audit.id, standard: source.audit.standard,
      reviewDate: input.reviewDate, reviewerId: reviewer.id, reviewerName: reviewer.name, priority: input.priority, status: "Pending Review",
      reviewSummary: input.reviewSummary?.trim() ?? "", technicalAssessment: input.technicalAssessment?.trim() ?? "", auditReportReview: input.auditReportReview?.trim() ?? "", findingsReview: input.findingsReview?.trim() ?? "", capReview: input.capReview?.trim() ?? "", evidenceReview: input.evidenceReview?.trim() ?? "", complianceAssessment: input.complianceAssessment?.trim() ?? "", reviewerComments: input.reviewerComments?.trim() ?? "",
      createdAt: now, lastUpdated: now,
    };
    store.unshift(record);
    await emit(record, `Technical Review Created: ${record.reference}`, "created", actor);
    await emit(record, `Technical Reviewer Assigned: ${record.reviewerName}`, "updated", actor, { assignment: "reviewer" });
    return clone(record);
  },
  async update(id: string, changes: Partial<Pick<TechnicalReviewRecord, "reviewType" | "reviewDate" | "reviewerId" | "priority" | "reviewSummary" | "technicalAssessment" | "auditReportReview" | "findingsReview" | "capReview" | "evidenceReview" | "complianceAssessment" | "reviewerComments">>, actor: TechnicalReviewActor = {}) {
    assertManage(actor);
    const record = store.find((item) => item.id === id || item.reference === id);
    if (!record || !visible(record, actor)) throw new Error("Technical Review not found or not assigned to your queue.");
    if (["Completed", "Rejected"].includes(record.status)) throw new Error("A completed or rejected Technical Review is read-only.");
    const reviewerId = changes.reviewerId ?? record.reviewerId;
    const reviewer = demoUsers.find((user) => user.id === reviewerId && user.role === "Technical Reviewer");
    if (!reviewer) throw new Error("Select an existing Technical Reviewer.");
    if (actor.role === "Technical Reviewer" && reviewer.id !== actor.id) throw new Error("A Technical Reviewer can assign a case only to their own queue.");
    const updated: TechnicalReviewRecord = { ...record, ...changes, reviewerId: reviewer.id, reviewerName: reviewer.name, lastUpdated: timestamp() };
    store[store.indexOf(record)] = updated;
    const actorInfo = actorFields(actor);
    await emit(updated, "Technical Review Updated", "updated", actor);
    if (changes.reviewerId && changes.reviewerId !== record.reviewerId) await emit(updated, `Technical Reviewer Assigned: ${reviewer.name}`, "updated", actor, { assignment: "reviewer" });
    if (changes.auditReportReview !== undefined && changes.auditReportReview !== record.auditReportReview) await emit(updated, "Audit Package Reviewed", "review_action", actor, { section: "audit report" });
    if (changes.findingsReview !== undefined && changes.findingsReview !== record.findingsReview) await emit(updated, "Findings Reviewed", "review_action", actor, { section: "findings" });
    if (changes.capReview !== undefined && changes.capReview !== record.capReview) await emit(updated, "CAP Reviewed", "review_action", actor, { section: "corrective action" });
    if (changes.reviewerComments?.trim() && changes.reviewerComments !== record.reviewerComments) await activityRepository.create({ entityType: "technical_review", entityId: updated.id, activityType: "review_action", description: "Comment Added", ...actorInfo, metadata: { reference: updated.reference, companyId: updated.companyId, applicationId: updated.applicationId, auditId: updated.auditId, status: updated.status, comment: updated.reviewerComments } });
    syncCertification(updated);
    return clone(updated);
  },
  async start(id: string, actor: TechnicalReviewActor = {}) {
    assertManage(actor);
    const record = store.find((item) => item.id === id || item.reference === id);
    if (!record || !visible(record, actor)) throw new Error("Technical Review not found or not assigned to your queue.");
    if (!["Pending Review", "Returned for Correction"].includes(record.status)) throw new Error("A review can start only from Pending Review or Returned for Correction.");
    const { audit } = related(record);
    if (audit.status !== "Completed" || audit.report.status !== "Submitted") throw new Error("Review cannot start until the linked audit is completed and its report is submitted.");
    const updated = { ...record, status: "In Review" as const, startedAt: timestamp(), lastUpdated: timestamp() };
    store[store.indexOf(record)] = updated;
    await emit(updated, "Technical Review Started", "moved_to_review", actor, { previousStatus: record.status });
    syncCertification(updated);
    return clone(updated);
  },
  async decide(id: string, decision: TechnicalReviewDecision, comments: string, actor: TechnicalReviewActor = {}) {
    assertManage(actor);
    const record = store.find((item) => item.id === id || item.reference === id);
    if (!record || !visible(record, actor)) throw new Error("Technical Review not found or not assigned to your queue.");
    if (record.status !== "In Review") throw new Error("A decision can be recorded only while the Technical Review is In Review.");
    if (!comments.trim()) throw new Error("Decision comments are required.");
    const { audit } = related(record);
    if (decision === "Approve") {
      const findings = mockFindings.filter((item) => item.auditId === audit.id);
      const required = [record.reviewSummary, record.technicalAssessment, record.auditReportReview, record.findingsReview, record.capReview, record.evidenceReview, record.complianceAssessment, record.reviewerComments];
      if (audit.status !== "Completed" || audit.report.status !== "Submitted") throw new Error("Approval requires a completed audit and submitted report.");
      if (required.some((value) => !value.trim())) throw new Error("Complete the Technical Assessment sections before approval.");
      if (findings.some((finding) => finding.status !== "Closed")) throw new Error("Open Findings/CAP items must be returned for correction before Technical Review approval.");
    }
    const status: TechnicalReviewStatus = decision === "Approve" ? "Approved" : decision === "Return for Correction" ? "Returned for Correction" : "Rejected";
    const now = timestamp();
    const updated: TechnicalReviewRecord = { ...record, status, decision, decisionComments: comments.trim(), decisionDate: dateOnly(), lastUpdated: now };
    store[store.indexOf(record)] = updated;
    const description = decision === "Approve" ? "Technical Review Approved" : decision === "Return for Correction" ? "Technical Review Returned for Correction" : "Technical Review Rejected";
    await emit(updated, description, decision === "Approve" ? "approved" : decision === "Reject" ? "rejected" : "review_action", actor, { decision, decisionComments: comments.trim() });
    syncCertification(updated);
    return clone(updated);
  },
  async complete(id: string, actor: TechnicalReviewActor = {}) {
    assertManage(actor);
    const record = store.find((item) => item.id === id || item.reference === id);
    if (!record || !visible(record, actor)) throw new Error("Technical Review not found or not assigned to your queue.");
    if (record.status !== "Approved" || record.decision !== "Approve") throw new Error("Only an approved Technical Review can be completed.");
    const updated = { ...record, status: "Completed" as const, completedAt: timestamp(), lastUpdated: timestamp() };
    store[store.indexOf(record)] = updated;
    await emit(updated, "Technical Review Completed", "status_changed", actor, { previousStatus: record.status });
    syncCertification(updated);
    return clone(updated);
  },
  canView,
  canManage: (actor: TechnicalReviewActor) => can(actor, "technicalReviews.decide"),
  statuses: ["All", "Pending Review", "In Review", "Approved", "Returned for Correction", "Rejected", "Completed"] as const,
  reviewTypes: ["Initial Certification", "Surveillance", "Recertification", "Scope Extension", "CAP Follow-up"] as const,
  priorities: ["Normal", "High", "Urgent"] as const,
};
