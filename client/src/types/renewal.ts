import type { Country, Standard } from "@/types/company";

export type RenewalStatus = "Not Due" | "Upcoming" | "Renewal Due" | "In Progress" | "Submitted" | "Under Review" | "Approved" | "Renewed" | "Expired";
export interface RenewalRecord {
  id: string;
  renewalNumber: string;
  previousCertificateId: string;
  companyId: string;
  standard: Standard;
  scope: string;
  certificateExpiryDate: string;
  renewalDueDate: string;
  status: RenewalStatus;
  newCertificationId?: string;
  newCertificateId?: string;
  createdDate: string;
  lastUpdated: string;
}
export interface RenewalFilters {
  search?: string;
  country?: Country | "All";
  companyId?: string;
  standard?: Standard | "All";
  status?: RenewalStatus | "All";
  dueWindow?: "All" | "Expired" | "30 days" | "60 days" | "90 days";
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  pageSize?: number;
  sort?: "due-date" | "newest" | "oldest" | "company";
}
export interface PaginatedRenewals { data: RenewalRecord[]; total: number; page: number; pageSize: number; totalPages: number; }
