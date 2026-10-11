import type { UserRole } from "@/types/auth";

export type DocumentEntityType = "company" | "application" | "audit" | "finding" | "technical_review" | "certification" | "certificate";
export type DocumentCategory = "Application" | "Audit Plan" | "Checklist" | "Evidence" | "CAP" | "Audit Report" | "Technical Review" | "Certificate";
export type DocumentStatus = "Uploaded" | "In Review" | "Accepted" | "Rejected" | "Archived";

export interface DocumentVersionRecord {
  id: string;
  version: string;
  fileName: string;
  uploadedBy: string;
  uploadedById: string;
  uploadedAt: string;
  changeDescription: string;
  fileSizeBytes: number;
  fileType: string;
  status: Exclude<DocumentStatus, "Archived">;
  downloadCount: number;
}

export interface DocumentRecord {
  id: string;
  documentNumber: string;
  name: string;
  category: DocumentCategory;
  documentType: string;
  relatedEntityType: DocumentEntityType;
  relatedEntityId: string;
  relatedRecord: string;
  companyId?: string;
  description: string;
  status: DocumentStatus;
  versions: DocumentVersionRecord[];
  createdAt: string;
  updatedAt: string;
}

export interface DocumentFilters {
  search?: string;
  category?: DocumentCategory | "All";
  documentType?: string | "All";
  relatedEntityType?: DocumentEntityType | "All";
  relatedEntityId?: string;
  companyId?: string;
  status?: DocumentStatus | "All";
  uploadedBy?: string | "All";
  dateFrom?: string;
  dateTo?: string;
  sort?: "newest" | "oldest" | "name";
  page?: number;
  pageSize?: number;
}

export interface PaginatedDocuments { data: DocumentRecord[]; total: number; page: number; pageSize: number; totalPages: number; }
export interface DocumentActor { id?: string; name?: string; role?: UserRole; }
export interface DocumentUploadInput {
  name: string;
  category: DocumentCategory;
  documentType: string;
  relatedEntityType: DocumentEntityType;
  relatedEntityId: string;
  companyId?: string;
  description: string;
  fileName: string;
  fileSizeBytes: number;
  fileType: string;
  changeDescription: string;
}
