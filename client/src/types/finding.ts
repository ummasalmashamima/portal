import type { Standard } from "@/types/company";

export const findingTypes = ["Major Nonconformity", "Minor Nonconformity", "Observation", "Opportunity for Improvement"] as const;
export type FindingType = (typeof findingTypes)[number];
export type FindingStatus = "Open" | "CAP Submitted" | "Under Review" | "Correction Required" | "CAP Resubmitted" | "Accepted" | "Closed";
export type FindingStatusView = FindingStatus | "Overdue";
export type ReviewerDecision = "Open" | "Correction Required" | "Accepted" | "Closed";
export type FindingDocumentType = "Objective Evidence" | "Correction Evidence" | "Root Cause Evidence" | "Corrective Action Evidence" | "Closure Evidence";

export interface FindingDocument {
  id: string;
  fileName: string;
  documentType: FindingDocumentType;
  version: string;
  uploadedBy: string;
  uploadDate: string;
  relatedFinding: string;
  description: string;
}

export interface FindingRecord {
  id: string;
  findingNumber: string;
  auditId: string;
  auditNumber: string;
  applicationId: string;
  companyId: string;
  standard: Standard;
  clause: string;
  findingType: FindingType;
  description: string;
  objectiveEvidence: string;
  responsiblePersonId?: string;
  responsiblePerson: string;
  correction: string;
  rootCause: string;
  correctiveAction: string;
  targetDate: string;
  evidenceOfClosure: string;
  status: FindingStatus;
  reviewerDecision?: ReviewerDecision;
  reviewer?: string;
  reviewerComments: string;
  decisionDate?: string;
  createdBy: string;
  createdDate: string;
  lastUpdated: string;
  documents: FindingDocument[];
}

export interface FindingFilters {
  search?: string;
  findingNo?: string;
  auditNo?: string;
  companyId?: string;
  findingType?: FindingType | "All";
  standard?: Standard | "All";
  clause?: string;
  status?: FindingStatusView | "All";
  responsiblePersonId?: string | "All";
  targetDate?: string;
  sort?: "newest" | "oldest" | "target-date" | "status";
  auditId?: string;
  assignedAuditorId?: string;
  page?: number;
  pageSize?: number;
}

export interface PaginatedFindings {
  data: FindingRecord[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export type FindingUpdate = Partial<Pick<FindingRecord,
  | "findingType" | "clause" | "description" | "objectiveEvidence" | "responsiblePersonId"
  | "responsiblePerson" | "correction" | "rootCause" | "correctiveAction" | "targetDate" | "evidenceOfClosure"
>>;
