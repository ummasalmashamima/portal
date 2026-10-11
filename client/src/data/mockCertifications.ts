import type { CertificationRecord } from "@/types/certification";

// Certification cases reference canonical Technical Review records where the source audit is available.
export const mockCertifications: CertificationRecord[] = [
  {
    id: "cert-case-001", certificationNumber: "EC-CERT-000001", companyId: "company-001", applicationId: "app-002", auditId: "audit-004", technicalReviewId: "TR-000029",
    standard: "ISO 9001", scope: "Manufacture and finishing of knitted garments.",
    technicalReview: { reference: "TR-000029", status: "Completed", result: "Recommended for certification", reviewer: "Priya Sen", completedDate: "2026-09-26", summary: "Audit report and closed finding reviewed; certification decision is ready." },
    status: "Decision Pending", certificationManagerId: "user-cert-manager", certificationManagerName: "Daniel Wong", reviewDate: "2026-09-27",
    previousCertificateId: "cert-001", renewalId: "renewal-001", createdDate: "2026-09-26", lastUpdated: "2026-09-28",
  },
  {
    id: "cert-case-002", certificationNumber: "EC-CERT-000002", companyId: "company-005", applicationId: "app-005",
    standard: "ISO 14064", scope: "Textile yarn, fabric production and environmental management.",
    technicalReview: { reference: "TR-000028", status: "Completed", result: "Approved", reviewer: "Priya Sen", completedDate: "2026-08-28", summary: "Legacy certification review completed before certificate issue." },
    status: "Active", certificationManagerId: "user-cert-manager", certificationManagerName: "Daniel Wong", reviewDate: "2026-08-29",
    decision: "Approve", decisionDate: "2026-08-29", decisionMaker: "Daniel Wong", decisionRemarks: "Certification requirements met.", certificateId: "cert-005", createdDate: "2026-08-28", lastUpdated: "2026-08-30",
  },
  {
    id: "cert-case-003", certificationNumber: "EC-CERT-000003", companyId: "company-004", applicationId: "app-006",
    standard: "ISO 14064", scope: "Apparel assembly, packaging and carbon accounting.",
    technicalReview: { status: "Under Review", summary: "Scope-extension review is awaiting final upstream technical review." },
    status: "Conditional", certificationManagerId: "user-cert-manager", certificationManagerName: "Daniel Wong", reviewDate: "2026-09-20",
    decision: "Conditional Approval", decisionDate: "2026-09-21", decisionMaker: "Daniel Wong", decisionRemarks: "Approval is conditional on the defined emissions-boundary follow-up.",
    conditions: "Submit the revised production-line boundary statement and retain the first-quarter activity-data reconciliation.", certificateId: "cert-006", createdDate: "2026-09-18", lastUpdated: "2026-09-27",
  },
  {
    id: "cert-case-004", certificationNumber: "EC-CERT-000004", companyId: "company-001", applicationId: "app-001", auditId: "audit-001",
    standard: "ISO 14001", scope: "Manufacture and finishing of knitted garments and textile products.",
    technicalReview: { status: "Not Started", summary: "The audit is planned; technical review has not started." },
    status: "In Process", certificationManagerId: "user-cert-manager", certificationManagerName: "Daniel Wong", createdDate: "2026-09-28", lastUpdated: "2026-09-28",
  },
  {
    id: "cert-case-005", certificationNumber: "EC-CERT-000005", companyId: "company-002", applicationId: "app-003", auditId: "audit-002", technicalReviewId: "TR-000031",
    standard: "ISO 9001", scope: "Integrated textile manufacturing and finishing.",
    technicalReview: { reference: "TR-000031", status: "Pending", reviewer: "Priya Sen", summary: "Queued for upstream review after the linked audit report is submitted." },
    status: "Certification Review", certificationManagerId: "user-cert-manager", certificationManagerName: "Daniel Wong", reviewDate: "2026-09-28", createdDate: "2026-09-27", lastUpdated: "2026-09-28",
  },
  {
    id: "cert-case-006", certificationNumber: "EC-CERT-000006", companyId: "company-005", applicationId: "app-005", auditId: "audit-003",
    standard: "ISO 14064", scope: "Textile yarn, fabric production and environmental management.",
    technicalReview: { status: "Pending", summary: "Awaiting upstream review after audit report completion." },
    status: "In Process", certificationManagerId: "user-cert-manager", certificationManagerName: "Daniel Wong", createdDate: "2026-09-28", lastUpdated: "2026-09-28",
  },
];
