import type { Standard } from "@/types/company";

export type TechnicalReviewStatus = "Pending Review" | "In Review" | "Approved" | "Returned for Correction" | "Rejected" | "Completed";
export type TechnicalReviewDecision = "Approve" | "Return for Correction" | "Reject";
export type TechnicalReviewPriority = "Normal" | "High" | "Urgent";
export type TechnicalReviewType = "Initial Certification" | "Surveillance" | "Recertification" | "Scope Extension" | "CAP Follow-up";

export interface TechnicalReviewRecord {
  id: string;
  reference: string;
  reviewType: TechnicalReviewType;
  companyId: string;
  applicationId: string;
  auditId: string;
  standard: Standard;
  reviewDate: string;
  reviewerId: string;
  reviewerName: string;
  priority: TechnicalReviewPriority;
  status: TechnicalReviewStatus;
  reviewSummary: string;
  technicalAssessment: string;
  auditReportReview: string;
  findingsReview: string;
  capReview: string;
  evidenceReview: string;
  complianceAssessment: string;
  reviewerComments: string;
  decision?: TechnicalReviewDecision;
  decisionComments?: string;
  decisionDate?: string;
  startedAt?: string;
  completedAt?: string;
  createdAt: string;
  lastUpdated: string;
}

export interface TechnicalReviewFilters {
  search?: string;
  status?: TechnicalReviewStatus | "All";
  companyId?: string;
  standard?: Standard | "All";
  reviewDateFrom?: string;
  reviewDateTo?: string;
  reviewerId?: string | "All";
  sort?: "newest" | "oldest" | "status" | "priority";
  assignedReviewerId?: string;
  page?: number;
  pageSize?: number;
}

export interface PaginatedTechnicalReviews {
  data: TechnicalReviewRecord[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
