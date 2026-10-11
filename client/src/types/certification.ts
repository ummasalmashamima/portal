import type { Country, Standard } from "@/types/company";

export type CertificationStatus =
  | "In Process"
  | "Certification Review"
  | "Decision Pending"
  | "Approved"
  | "Conditional"
  | "Certificate Generation"
  | "Active"
  | "Suspended"
  | "Withdrawn"
  | "Expired"
  | "Renewed"
  | "Returned for Correction"
  | "Rejected";
export type CertificationDecision = "Approve" | "Conditional Approval" | "Return for Correction" | "Reject";
export type TechnicalReviewStatus = "Not Started" | "Pending" | "Under Review" | "Completed" | "Returned";
export interface TechnicalReviewSummary {
  reference?: string;
  status: TechnicalReviewStatus;
  result?: string;
  reviewer?: string;
  completedDate?: string;
  summary?: string;
}
export interface CertificationRecord {
  id: string;
  certificationNumber: string;
  companyId: string;
  applicationId?: string;
  auditId?: string;
  technicalReviewId?: string;
  auditReference?: string;
  standard: Standard;
  scope: string;
  technicalReview: TechnicalReviewSummary;
  status: CertificationStatus;
  certificationManagerId: string;
  certificationManagerName: string;
  reviewDate?: string;
  decision?: CertificationDecision;
  decisionDate?: string;
  decisionMaker?: string;
  decisionRemarks?: string;
  conditions?: string;
  certificateId?: string;
  previousCertificateId?: string;
  renewalId?: string;
  createdDate: string;
  lastUpdated: string;
}
export interface CertificationReadinessItem { key: "audit" | "technicalReview" | "findings" | "documents" | "scope"; label: string; complete: boolean; detail: string; }
export interface CertificationFilters {
  search?: string;
  country?: Country | "All";
  companyId?: string;
  applicationId?: string;
  auditId?: string;
  standard?: Standard | "All";
  status?: CertificationStatus | "All";
  technicalReviewStatus?: TechnicalReviewStatus | "All";
  managerId?: string | "All";
  dateFrom?: string;
  dateTo?: string;
  assignedAuditorId?: string;
  page?: number;
  pageSize?: number;
  sort?: "newest" | "oldest" | "decision-date" | "expiry-date" | "status";
}
export interface PaginatedCertifications { data: CertificationRecord[]; total: number; page: number; pageSize: number; totalPages: number; }
