import type { CertificateRecord } from "@/types/certificate";

function version(version: string, scope: string, issueDate: string, effectiveDate: string, expiryDate: string, status: CertificateRecord["status"], changedAt: string, changedBy: string, changeReason: string) {
  return { version, scope, issueDate, effectiveDate, expiryDate, status, changedAt, changedBy, changeReason };
}
function seeded(id: string, certificateNumber: string, companyId: string, standard: CertificateRecord["standard"], scope: string, issueDate: string, effectiveDate: string, expiryDate: string, status: CertificateRecord["status"], links: Partial<CertificateRecord> = {}): CertificateRecord {
  return {
    id, certificateNumber, companyId, standard, scope, issueDate, effectiveDate, expiryDate, status,
    certificateManagerId: "user-cert-manager", certificateManagerName: "Daniel Wong", version: "1.0",
    versionHistory: [version("1.0", scope, issueDate, effectiveDate, expiryDate, status, issueDate, "Daniel Wong", "Initial certificate record / legacy portfolio import.")],
    documents: [{ id: `${id}-doc-v1`, fileName: `${certificateNumber}-v1.0.pdf`, version: "1.0", generatedDate: issueDate, status: "Current", downloadCount: 0 }],
    createdDate: issueDate, lastUpdated: issueDate, ...links,
  };
}

// The first five IDs/references correspond to existing Company Master certificate summaries.
// Two additional legacy certificate samples expose the requested 60- and 90-day expiry states.
export const mockCertificates: CertificateRecord[] = [
  seeded("cert-001", "CERT-000112", "company-001", "ISO 9001", "Manufacture and finishing of knitted garments.", "2023-10-28", "2023-10-28", "2026-10-28", "Active", { applicationId: "app-002", auditId: "audit-004", renewalId: "renewal-001" }),
  seeded("cert-002", "CERT-000106", "company-001", "ISO 45001", "Occupational health and safety management at Greenfield Jutex.", "2024-06-12", "2024-06-12", "2027-06-12", "Active"),
  seeded("cert-003", "CERT-000081", "company-003", "ISO 14001", "Knitted apparel manufacturing for export markets.", "2023-07-10", "2023-07-10", "2026-07-10", "Expired", { applicationId: "app-004" }),
  seeded("cert-004", "CERT-000065", "company-004", "ISO 9001", "Apparel assembly and packaging at the Guangzhou facility.", "2024-02-01", "2024-02-01", "2027-02-01", "Active", { applicationId: "app-007", previousCertificateId: "cert-008", renewalId: "renewal-008" }),
  seeded("cert-005", "CERT-000098", "company-005", "ISO 14064", "Textile yarn, fabric production and environmental management.", "2026-08-30", "2026-08-30", "2029-08-30", "Active", { applicationId: "app-005", certificationId: "cert-case-002" }),
  seeded("cert-006", "CERT-000113", "company-004", "ISO 14064", "Apparel assembly, packaging and carbon accounting.", "2023-11-27", "2023-11-27", "2026-11-27", "Conditional", { applicationId: "app-006", certificationId: "cert-case-003", conditions: "Submit the revised production-line boundary statement and retain the first-quarter activity-data reconciliation.", conditionsSatisfied: false }),
  seeded("cert-007", "CERT-000114", "company-005", "HIGG FEM", "Environmental performance at the Daylight main site.", "2023-12-27", "2023-12-27", "2026-12-27", "Active"),
  seeded("cert-008", "CERT-000054", "company-004", "ISO 9001", "Apparel assembly and packaging at the Guangzhou facility.", "2021-02-01", "2021-02-01", "2024-02-01", "Renewed", { renewalId: "renewal-008", documents: [{ id: "cert-008-doc-v1", fileName: "CERT-000054-v1.0.pdf", version: "1.0", generatedDate: "2021-02-01", status: "Superseded", downloadCount: 2 }] }),
  seeded("cert-009", "CERT-000115", "company-002", "ISO 45001", "Occupational health and safety management for integrated textile manufacturing.", "2024-03-01", "2024-03-01", "2027-03-01", "Suspended", { suspendedReason: "Surveillance follow-up evidence was not accepted; certificate access is suspended pending resolution." }),
  seeded("cert-010", "CERT-000116", "company-003", "ISO 9001", "Garment manufacturing and export operations.", "2023-05-15", "2023-05-15", "2026-05-15", "Withdrawn", { withdrawnReason: "The certificate holder requested withdrawal following cessation of the certified scope." }),
];
