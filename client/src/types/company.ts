export type Country = "Bangladesh" | "Myanmar" | "China";
export type CompanyStatus = "Active" | "Pending" | "Suspended" | "Inactive";
export type Standard = "ISO 9001" | "ISO 14001" | "ISO 45001" | "ISO 14064" | "HIGG FEM";

export interface CompanyContact { id: string; name: string; designation: string; email: string; phone: string; primary?: boolean; }
export interface CompanySite { id: string; name: string; type: "Factory" | "Office" | "Warehouse"; address: string; city: string; country: Country; contact: string; status: "Active" | "Inactive"; }
export interface RelatedApplication { id: string; referenceNo: string; standard: Standard; type: "Initial Certification" | "Renewal" | "Surveillance" | "Scope Extension"; status: "Draft" | "Submitted" | "Under Review" | "Pending Customer" | "Approved" | "Rejected"; date: string; }
export interface RelatedAudit { id: string; referenceNo: string; type: "Stage 1" | "Stage 2" | "Surveillance" | "Recertification" | "Scope Extension"; standard: Standard; auditor: string; date: string; status: "Planned" | "Assigned" | "Scheduled" | "In Progress" | "Completed" | "Report Pending" | "Submitted" | "Under Review" | "Report Submitted"; }
export interface RelatedFinding { id: string; referenceNo: string; auditNo: string; severity: "Critical" | "Major" | "Minor" | "Observation"; description: string; dueDate: string; status: "Open" | "Under Verification" | "Closed" | "Overdue"; }
export interface RelatedCertificate { id: string; referenceNo: string; standard: Standard; issueDate: string; expiryDate: string; status: "In Process" | "Conditional" | "Active" | "Expiring Soon" | "Expired" | "Suspended" | "Withdrawn" | "Renewed"; }
export interface RelatedDocument { id: string; name: string; type: "Registration" | "Scope" | "Certificate" | "Audit Evidence"; version: string; uploadedBy: string; date: string; }
export interface CompanyActivity { id: string; date: string; user: string; action: string; reference: string; }

export interface Company {
  id: string;
  companyId: string;
  legalName: string;
  tradeName: string;
  businessType: string;
  industry: string;
  country: Country;
  city: string;
  address: string;
  postalCode: string;
  contacts: CompanyContact[];
  sites: CompanySite[];
  standards: Standard[];
  scope: string;
  previousCertification: "Yes" | "No";
  previousCertificateNumber?: string;
  previousCertificateExpiryDate?: string;
  remarks: string;
  internalNotes: string;
  status: CompanyStatus;
  dateAdded: string;
  lastActivity: string;
  applications: RelatedApplication[];
  audits: RelatedAudit[];
  findings: RelatedFinding[];
  certificates: RelatedCertificate[];
  documents: RelatedDocument[];
  activity: CompanyActivity[];
}

export interface CompanyFilters { search?: string; country?: Country | "All"; businessType?: string | "All"; standard?: Standard | "All"; status?: CompanyStatus | "All"; page?: number; pageSize?: number; }
export interface PaginatedCompanies { data: Company[]; total: number; page: number; pageSize: number; totalPages: number; }
