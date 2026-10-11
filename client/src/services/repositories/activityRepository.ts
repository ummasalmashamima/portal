import { mockActivities } from "@/data/mockActivities";
import { mockAuditors } from "@/data/mockAuditors";
import { mockApplications } from "@/data/mockApplications";
import { mockAudits } from "@/data/mockAudits";
import { mockCompanies } from "@/data/mockCompanies";
import { mockFindings } from "@/data/mockFindings";
import { mockCertifications } from "@/data/mockCertifications";
import { mockCertificates } from "@/data/mockCertificates";
import { mockRenewals } from "@/data/mockRenewals";
import { mockTechnicalReviews } from "@/data/mockTechnicalReviews";
import type { ActivityEntityType, ActivityFilters, ActivityRecord, ActivityType } from "@/types/activity";

const companyEvents: ActivityRecord[] = mockCompanies.flatMap((company) => company.activity.map((item) => ({
  id: item.id,
  entityType: "company" as const,
  entityId: company.id,
  activityType: (item.action.toLowerCase().includes("created") ? "created" : item.action.toLowerCase().includes("uploaded") ? "document_uploaded" : item.action.toLowerCase().includes("approved") ? "approved" : "status_changed") as ActivityType,
  description: item.action,
  performedBy: item.user.toLowerCase().replaceAll(" ", "-"),
  performedByName: item.user,
  role: "Company relationship",
  timestamp: item.date,
  metadata: { reference: item.reference, seeded: true },
})));
const auditEvents: ActivityRecord[] = mockAudits.flatMap((audit) => {
  const auditor = mockAuditors.find((item) => item.id === audit.leadAuditorId);
  const created: ActivityRecord = {
    id: `seed-${audit.id}-created`, entityType: "audit", entityId: audit.id, activityType: "created",
    description: `Audit ${audit.auditNumber} created`, performedBy: "user-system", performedByName: audit.createdBy,
    role: "Audit Manager", timestamp: audit.createdDate, metadata: { reference: audit.auditNumber, seeded: true },
  };
  if (audit.status === "Planned") return [created];
  return [created, {
    id: `seed-${audit.id}-status`, entityType: "audit", entityId: audit.id, activityType: "status_changed",
    description: `Audit status is ${audit.status}`, performedBy: audit.leadAuditorId ?? "user-system",
    performedByName: auditor?.name ?? audit.createdBy, role: auditor?.role ?? "Audit Manager",
    timestamp: audit.lastUpdated, metadata: { reference: audit.auditNumber, status: audit.status, seeded: true },
  }];
});
const technicalReviewEvents: ActivityRecord[] = mockTechnicalReviews.flatMap((review) => {
  const metadata = { reference: review.reference, companyId: review.companyId, applicationId: review.applicationId, auditId: review.auditId, status: review.status, reviewerId: review.reviewerId, seeded: true };
  const assigned: ActivityRecord = { id: `seed-${review.id}-assigned`, entityType: "technical_review", entityId: review.id, activityType: "updated", description: `Technical Reviewer Assigned: ${review.reviewerName}`, performedBy: "user-system", performedByName: "EcoAssurance workflow", role: "System", timestamp: review.createdAt, metadata: { ...metadata, assignment: "reviewer" } };
  const created: ActivityRecord = { id: `seed-${review.id}-created`, entityType: "technical_review", entityId: review.id, activityType: "created", description: `Technical Review Created: ${review.reference}`, performedBy: "user-system", performedByName: "EcoAssurance workflow", role: "System", timestamp: review.createdAt, metadata };
  const events = [created, assigned];
  if (review.startedAt) events.push({ id: `seed-${review.id}-started`, entityType: "technical_review", entityId: review.id, activityType: "moved_to_review", description: "Technical Review Started", performedBy: review.reviewerId, performedByName: review.reviewerName, role: "Technical Reviewer", timestamp: review.startedAt, metadata: { ...metadata, status: "In Review" } });
  if (review.auditReportReview) events.push({ id: `seed-${review.id}-audit-reviewed`, entityType: "technical_review", entityId: review.id, activityType: "review_action", description: "Audit Package Reviewed", performedBy: review.reviewerId, performedByName: review.reviewerName, role: "Technical Reviewer", timestamp: review.lastUpdated, metadata: { ...metadata, section: "audit report" } });
  if (review.findingsReview) events.push({ id: `seed-${review.id}-findings-reviewed`, entityType: "technical_review", entityId: review.id, activityType: "review_action", description: "Findings Reviewed", performedBy: review.reviewerId, performedByName: review.reviewerName, role: "Technical Reviewer", timestamp: review.lastUpdated, metadata: { ...metadata, section: "findings" } });
  if (review.capReview) events.push({ id: `seed-${review.id}-cap-reviewed`, entityType: "technical_review", entityId: review.id, activityType: "review_action", description: "CAP Reviewed", performedBy: review.reviewerId, performedByName: review.reviewerName, role: "Technical Reviewer", timestamp: review.lastUpdated, metadata: { ...metadata, section: "corrective action" } });
  if (review.decision === "Approve") events.push({ id: `seed-${review.id}-approved`, entityType: "technical_review", entityId: review.id, activityType: "approved", description: "Technical Review Approved", performedBy: review.reviewerId, performedByName: review.reviewerName, role: "Technical Reviewer", timestamp: review.decisionDate ?? review.lastUpdated, metadata: { ...metadata, decision: review.decision, decisionComments: review.decisionComments } });
  if (review.status === "Completed") events.push({ id: `seed-${review.id}-completed`, entityType: "technical_review", entityId: review.id, activityType: "status_changed", description: "Technical Review Completed", performedBy: review.reviewerId, performedByName: review.reviewerName, role: "Technical Reviewer", timestamp: review.completedAt ?? review.lastUpdated, metadata: { ...metadata, status: "Completed" } });
  return events;
});
const activityStore: ActivityRecord[] = [...mockActivities, ...companyEvents, ...auditEvents, ...technicalReviewEvents];
let nextId = 1;

function parseTime(value: string): number {
  const normalized = value.replace(" · ", " ");
  const date = new Date(normalized);
  return Number.isNaN(date.getTime()) ? 0 : date.getTime();
}

function matchesDate(timestamp: string, from?: string, to?: string): boolean {
  const at = parseTime(timestamp);
  if (from) {
    const start = new Date(from).getTime();
    if (!Number.isNaN(start) && at < start) return false;
  }
  if (to) {
    const end = new Date(to).getTime() + 24 * 60 * 60 * 1000 - 1;
    if (!Number.isNaN(end) && at > end) return false;
  }
  return true;
}

function relatedCompanyId(item: ActivityRecord): string | undefined {
  const explicit = item.metadata.companyId;
  if (typeof explicit === "string") return explicit;
  if (item.entityType === "company") return item.entityId;
  if (item.entityType === "application") {
    return mockApplications.find((application) => application.id === item.entityId || application.applicationNumber === item.metadata.reference)?.companyId;
  }
  if (item.entityType === "audit") {
    return mockAudits.find((audit) => audit.id === item.entityId || audit.auditNumber === item.metadata.reference)?.companyId;
  }
  if (item.entityType === "finding") {
    const finding = mockFindings.find((record) => record.id === item.entityId || record.findingNumber === item.metadata.reference);
    if (finding) return finding.companyId;
    const auditId = item.metadata.auditId;
    if (typeof auditId === "string") return mockAudits.find((audit) => audit.id === auditId || audit.auditNumber === auditId)?.companyId;
  }
  if (item.entityType === "technical_review") return mockTechnicalReviews.find((record) => record.id === item.entityId || record.reference === item.metadata.reference)?.companyId;
  if (item.entityType === "certification") return mockCertifications.find((record) => record.id === item.entityId || record.certificationNumber === item.metadata.reference)?.companyId;
  if (item.entityType === "certificate") return mockCertificates.find((record) => record.id === item.entityId || record.certificateNumber === item.metadata.reference)?.companyId;
  if (item.entityType === "renewal") return mockRenewals.find((record) => record.id === item.entityId || record.renewalNumber === item.metadata.reference)?.companyId;
  return undefined;
}

export interface CreateActivityInput {
  entityType: ActivityEntityType;
  entityId: string;
  activityType: ActivityType;
  description: string;
  performedBy?: string;
  performedByName?: string;
  role?: string;
  timestamp?: string;
  metadata?: ActivityRecord["metadata"];
}

export const activityRepository = {
  async list(filters: ActivityFilters = {}): Promise<ActivityRecord[]> {
    return activityStore
      .filter((item) => (!filters.entityType || item.entityType === filters.entityType)
        && (!filters.entityId || item.entityId === filters.entityId)
        && (!filters.activityType || item.activityType === filters.activityType)
        && (!filters.performedBy || item.performedBy === filters.performedBy)
        && (!filters.role || item.role === filters.role)
        && (!filters.companyId || relatedCompanyId(item) === filters.companyId)
        && matchesDate(item.timestamp, filters.from, filters.to))
      .sort((a, b) => parseTime(b.timestamp) - parseTime(a.timestamp))
      .map((item) => ({ ...item, metadata: { ...item.metadata } }));
  },
  async listByEntity(entityType: ActivityEntityType, entityId: string): Promise<ActivityRecord[]> {
    const all = await this.list();
    return all.filter((item) => (item.entityType === entityType && item.entityId === entityId)
      || (entityType === "audit" && item.entityType === "finding" && item.metadata.auditId === entityId)
      || (entityType === "audit" && ["certification", "certificate", "renewal"].includes(item.entityType) && (item.metadata.auditId === entityId || item.metadata.auditNumber === entityId))
      || (entityType === "technical_review" && item.entityType === "document" && item.metadata.relatedEntityType === "technical_review" && item.metadata.relatedEntityId === entityId)
      || (entityType === "certification" && item.entityType === "certificate" && item.metadata.certificationId === entityId)
      || (entityType === "certification" && item.entityType === "renewal" && item.metadata.newCertificationId === entityId)
      || (entityType === "certificate" && item.entityType === "renewal" && (item.metadata.certificateId === entityId || item.metadata.previousCertificateId === entityId))
      || (entityType === "renewal" && ["certification", "certificate"].includes(item.entityType) && item.metadata.renewalId === entityId));
  },
  async create(input: CreateActivityInput): Promise<ActivityRecord> {
    const event: ActivityRecord = {
      id: `activity-${Date.now()}-${nextId++}`,
      entityType: input.entityType,
      entityId: input.entityId,
      activityType: input.activityType,
      description: input.description,
      performedBy: input.performedBy ?? "user-system",
      performedByName: input.performedByName ?? "EcoAssurance user",
      role: input.role ?? "System",
      timestamp: input.timestamp ?? new Date().toLocaleString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: false }).replace(",", " ·"),
      metadata: { ...(input.metadata ?? {}) },
    };
    activityStore.unshift(event);
    return { ...event, metadata: { ...event.metadata } };
  },
};
