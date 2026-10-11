import type { Standard } from "@/types/company";

export type ApplicationStatus = "Draft" | "Submitted" | "Under Review" | "Pending Customer" | "Approved" | "Rejected";
export type ApplicationType = "Initial Certification" | "Renewal" | "Surveillance" | "Scope Extension";
export interface ApplicationDocument { id: string; fileName: string; fileType: string; fileSize: string; uploadDate: string; uploadedBy: string; status: "Uploaded" | "Processing" | "Accepted"; }
export interface ApplicationRecord { id: string; applicationNumber: string; companyId: string; siteId?: string; applicationType: ApplicationType; standard: Standard; country: string; applicationDate: string; status: ApplicationStatus; scope: string; previousCertification: "Yes" | "No"; previousCertificateNumber?: string; previousCertificateExpiry?: string; relevantInformation: string; remarks: string; createdBy: string; createdDate: string; lastUpdated: string; documents: ApplicationDocument[]; relatedAudit?: { auditNo: string; status: string }; }
export interface ApplicationFilters { search?: string; status?: ApplicationStatus | "All"; applicationType?: ApplicationType | "All"; country?: string | "All"; standard?: Standard | "All"; dateRange?: "All" | "Last 30 days" | "Last 90 days" | "This year"; companyId?: string; sort?: "newest" | "oldest"; page?: number; pageSize?: number; }
export interface PaginatedApplications { data: ApplicationRecord[]; total: number; page: number; pageSize: number; totalPages: number; }
