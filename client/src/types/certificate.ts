import type { Country, Standard } from "@/types/company";

export type CertificateStatus = "In Process" | "Conditional" | "Active" | "Suspended" | "Withdrawn" | "Expired" | "Renewed";
export interface CertificateDocument { id: string; fileName: string; version: string; generatedDate: string; status: "Generated" | "Approved" | "Current" | "Superseded"; downloadCount: number; }
export interface CertificateVersion { version: string; scope: string; issueDate: string; effectiveDate: string; expiryDate: string; status: CertificateStatus; changedAt: string; changedBy: string; changeReason: string; }
export interface CertificateRecord {
  id: string;
  certificateNumber: string;
  companyId: string;
  applicationId?: string;
  auditId?: string;
  auditReference?: string;
  certificationId?: string;
  previousCertificateId?: string;
  renewalId?: string;
  standard: Standard;
  scope: string;
  issueDate: string;
  effectiveDate: string;
  expiryDate: string;
  status: CertificateStatus;
  approvalStatus?: "Pending" | "Approved";
  approvedAt?: string;
  approvedBy?: string;
  certificateManagerId: string;
  certificateManagerName: string;
  version: string;
  versionHistory: CertificateVersion[];
  documents: CertificateDocument[];
  conditions?: string;
  conditionsSatisfied?: boolean;
  suspendedReason?: string;
  withdrawnReason?: string;
  createdDate: string;
  lastUpdated: string;
}
export interface CertificateFilters {
  search?: string;
  country?: Country | "All";
  companyId?: string;
  applicationId?: string;
  auditId?: string;
  standard?: Standard | "All";
  status?: CertificateStatus | "Expiring Soon" | "All";
  expiryWindow?: "All" | "Expired" | "30 days" | "60 days" | "90 days" | "Upcoming";
  dateFrom?: string;
  dateTo?: string;
  issueDateFrom?: string;
  issueDateTo?: string;
  expiryDateFrom?: string;
  expiryDateTo?: string;
  assignedAuditorId?: string;
  page?: number;
  pageSize?: number;
  sort?: "newest" | "oldest" | "expiry" | "company";
}
export interface PaginatedCertificates { data: CertificateRecord[]; total: number; page: number; pageSize: number; totalPages: number; }
