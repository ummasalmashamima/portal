import { mockAuditors } from "@/data/mockAuditors";
import { mockApplications } from "@/data/mockApplications";
import { mockAudits } from "@/data/mockAudits";
import { mockCompanies } from "@/data/mockCompanies";
import { mockFindings } from "@/data/mockFindings";
import { mockCertificates } from "@/data/mockCertificates";
import { effectiveCertificateStatus } from "@/services/repositories/certificateRepository";
import type { ApplicationRecord } from "@/types/application";
import type { AuditRecord } from "@/types/audit";
import type { Company, CompanyFilters } from "@/types/company";
import { activityRepository } from "./activityRepository";
import { dateWithinRange, nextReference, normalizedIncludes, paginate } from "./repositoryUtils";
import { isWithinCurrentCompanyScope } from "./customerScope";

const store = mockCompanies as Company[];
const applicationStore = mockApplications as ApplicationRecord[];
const auditStore = mockAudits as AuditRecord[];

function withRelationships(company: Company): Company {
  const applications = applicationStore.filter((item) => item.companyId === company.id).map((item) => ({
    id: item.id,
    referenceNo: item.applicationNumber,
    standard: item.standard,
    type: item.applicationType,
    status: item.status,
    date: item.applicationDate,
  }));
  const audits = auditStore.filter((item) => item.companyId === company.id).map((item) => ({
    id: item.id,
    referenceNo: item.auditNumber,
    type: item.auditType,
    standard: item.standard,
    auditor: mockAuditors.find((person) => person.id === item.leadAuditorId)?.name ?? "Unassigned",
    date: item.plannedStartDate,
    status: item.status,
  }));
  const canonicalFindings = mockFindings.filter((item) => item.companyId === company.id).map((item) => ({
    id: item.id,
    referenceNo: item.findingNumber,
    auditNo: item.auditNumber,
    severity: item.findingType.includes("Major") ? "Major" as const : item.findingType.includes("Minor") ? "Minor" as const : "Observation" as const,
    description: item.description,
    dueDate: item.targetDate,
    status: item.status === "Closed" ? "Closed" as const : ["CAP Submitted", "Under Review", "Correction Required", "CAP Resubmitted", "Accepted"].includes(item.status) ? "Under Verification" as const : "Open" as const,
  }));
  const findings = [...canonicalFindings, ...company.findings.filter((item) => !canonicalFindings.some((canonical) => canonical.referenceNo === item.referenceNo))];
  const canonicalCertificates = mockCertificates.filter((item) => item.companyId === company.id).map((item) => ({
    id: item.id,
    referenceNo: item.certificateNumber,
    standard: item.standard,
    issueDate: new Date(`${item.issueDate}T00:00:00`).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }),
    expiryDate: new Date(`${item.expiryDate}T00:00:00`).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }),
    status: effectiveCertificateStatus(item),
  }));
  const certificates = [...canonicalCertificates, ...company.certificates.filter((item) => !canonicalCertificates.some((canonical) => canonical.referenceNo === item.referenceNo))];
  return { ...company, applications, audits, findings, certificates };
}

export const mockCompanyRepository = {
  async list(filters: CompanyFilters = {}) {
    let rows = store.filter((company) => {
      const query = [company.legalName, company.tradeName, company.companyId, company.industry, company.city, company.country, ...company.contacts.map((contact) => contact.name)].join(" ");
      return isWithinCurrentCompanyScope(company.id)
        && normalizedIncludes(query, filters.search)
        && (!filters.country || filters.country === "All" || company.country === filters.country)
        && (!filters.businessType || filters.businessType === "All" || company.businessType === filters.businessType)
        && (!filters.standard || filters.standard === "All" || company.standards.includes(filters.standard))
        && (!filters.status || filters.status === "All" || company.status === filters.status);
    });
    rows = rows.map(withRelationships);
    return paginate(rows, filters.page, filters.pageSize);
  },
  async getById(id: string): Promise<Company | null> {
    const company = store.find((item) => item.id === id || item.companyId === id);
    return company && isWithinCurrentCompanyScope(company.id) ? withRelationships(company) : null;
  },
  async create(input: Omit<Company, "id" | "companyId" | "dateAdded" | "lastActivity" | "applications" | "audits" | "findings" | "certificates" | "documents" | "activity"> & Partial<Pick<Company, "findings" | "certificates" | "documents" | "activity">>): Promise<Company> {
    const now = new Date();
    const company: Company = {
      ...input,
      id: `company-${String(store.length + 1).padStart(3, "0")}`,
      companyId: nextReference("ECO", store.map((item) => item.companyId), 6),
      dateAdded: now.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }),
      lastActivity: "Just now",
      applications: [],
      audits: [],
      findings: input.findings ?? [],
      certificates: input.certificates ?? [],
      documents: input.documents ?? [],
      activity: input.activity ?? [],
    };
    store.push(company);
    await activityRepository.create({ entityType: "company", entityId: company.id, activityType: "created", description: "Company created", performedByName: "Current user", role: "Application Officer", metadata: { reference: company.companyId } });
    return withRelationships(company);
  },
  async update(id: string, changes: Partial<Company>): Promise<Company> {
    const index = store.findIndex((item) => item.id === id);
    if (index < 0) throw new Error("Company not found");
    const old = store[index];
    const updated: Company = { ...old, ...changes, id: old.id, companyId: old.companyId, applications: old.applications, audits: old.audits, lastActivity: "Just now" };
    store[index] = updated;
    updated.activity = [{ id: `company-act-${Date.now()}`, date: "Just now", user: "Current user", action: "Company record updated", reference: updated.companyId }, ...old.activity];
    await activityRepository.create({ entityType: "company", entityId: updated.id, activityType: "updated", description: "Company record updated", performedByName: "Current user", role: "Application Officer", metadata: { reference: updated.companyId } });
    return withRelationships(updated);
  },
};

export const companyFilterOptions = {
  countries: ["All", "Bangladesh", "Myanmar", "China"],
  businessTypes: ["All", ...Array.from(new Set(store.map((company) => company.businessType)))],
  standards: ["All", "ISO 9001", "ISO 14001", "ISO 45001", "ISO 14064", "HIGG FEM"],
  statuses: ["All", "Active", "Pending", "Suspended", "Inactive"],
} as const;

export { dateWithinRange };
