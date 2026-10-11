import { mockCertificates } from "@/data/mockCertificates";
import { mockRenewals } from "@/data/mockRenewals";
import { mockCompanies } from "@/data/mockCompanies";
import { mockApplications } from "@/data/mockApplications";
import { mockAudits } from "@/data/mockAudits";
import type { CertificateRecord } from "@/types/certificate";
import type { PaginatedRenewals, RenewalFilters, RenewalRecord, RenewalStatus } from "@/types/renewal";
import { activityRepository } from "./activityRepository";
import { certificationRepository, type CertificationActor } from "./certificationRepository";
import { certificateRepository, daysUntilExpiry } from "./certificateRepository";
import { nextReference, normalizedIncludes, paginate, parseDisplayDate } from "./repositoryUtils";

const store = mockRenewals as RenewalRecord[];
const certificates = mockCertificates as CertificateRecord[];
const reminderLedger = new Set<string>();
const creationLedger = new Set<string>();
const managerRoles = new Set(["Super Admin", "Certification Manager"]);
function assertManager(actor: CertificationActor) { if (!managerRoles.has(actor.role ?? "")) throw new Error("Renewal management permission is required."); }
function todayISO() { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; }
function addDays(date: string, days: number) { const d = new Date(`${date}T00:00:00`); d.setDate(d.getDate() + days); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; }
function actorInfo(actor: CertificationActor = {}) { return { performedBy: actor.id ?? "user-system", performedByName: actor.name ?? "EcoAssurance user", role: actor.role ?? "System" }; }
function certificateFor(renewal: RenewalRecord) { return certificates.find((item) => item.id === renewal.previousCertificateId || item.certificateNumber === renewal.previousCertificateId); }
function deriveStatus(record: RenewalRecord, previous: CertificateRecord | undefined): RenewalStatus {
  if (record.status === "Renewed") return record.status;
  const cycle = record.newCertificationId ? certificationRepository.getByIdSync(record.newCertificationId) : null;
  if (cycle) {
    if (cycle.status === "Certification Review") return "Under Review";
    if (cycle.status === "Decision Pending") return "Submitted";
    if (["Approved", "Conditional", "Certificate Generation", "Active"].includes(cycle.status)) return "Approved";
  }
  if (["In Progress", "Submitted", "Under Review", "Approved"].includes(record.status)) return record.status;
  if (record.status === "Expired") return record.status;
  if (!previous) return record.status;
  if (previous.status === "Expired" || daysUntilExpiry(previous.expiryDate) < 0) return "Expired";
  const daysToDue = daysUntilExpiry(record.renewalDueDate);
  return daysToDue <= 0 ? "Renewal Due" : daysToDue <= 90 ? "Upcoming" : "Not Due";
}
function hydrate(record: RenewalRecord): RenewalRecord {
  const previous = certificateFor(record);
  const replacement = record.newCertificationId ? certificates.find((certificate) => certificate.certificationId === record.newCertificationId) : undefined;
  const status: RenewalStatus = replacement?.status === "Active" ? "Renewed" : replacement?.status === "Conditional" ? "Approved" : deriveStatus(record, previous);
  return { ...record, status };
}
function companyName(companyId: string) { return mockCompanies.find((company) => company.id === companyId)?.legalName ?? "Unknown company"; }
async function emit(record: RenewalRecord, description: string, activityType: "created" | "updated" | "status_changed" | "submitted" | "approved", actor: CertificationActor, extra: Record<string, string | number | boolean | undefined> = {}) {
  const previous = certificateFor(record);
  const app = previous?.applicationId ? mockApplications.find((item) => item.id === previous.applicationId) : undefined;
  const audit = previous?.auditId ? mockAudits.find((item) => item.id === previous.auditId) : undefined;
  await activityRepository.create({ entityType: "renewal", entityId: record.id, activityType, description, ...actorInfo(actor), metadata: { reference: record.renewalNumber, companyId: record.companyId, certificateId: record.previousCertificateId, previousCertificateId: record.previousCertificateId, newCertificationId: record.newCertificationId, newCertificateId: record.newCertificateId, applicationId: app?.id, auditId: audit?.id ?? previous?.auditId, auditNumber: audit?.auditNumber ?? previous?.auditReference, standard: record.standard, status: record.status, relatedEntity: `${companyName(record.companyId)} · ${previous?.certificateNumber ?? "certificate"}`, ...extra } });
}
function makeRenewal(certificate: CertificateRecord): RenewalRecord {
  return { id: `renewal-${certificate.id}`, renewalNumber: nextReference("REN", store.map((item) => item.renewalNumber)), previousCertificateId: certificate.id, companyId: certificate.companyId, standard: certificate.standard, scope: certificate.scope, certificateExpiryDate: certificate.expiryDate, renewalDueDate: addDays(certificate.expiryDate, -90), status: "Not Due", createdDate: todayISO(), lastUpdated: todayISO() };
}
function expiryMatches(record: RenewalRecord, window: RenewalFilters["dueWindow"]) {
  if (!window || window === "All") return true;
  if (record.status === "Renewed") return false;
  const days = daysUntilExpiry(record.certificateExpiryDate);
  if (window === "Expired") return days <= 0;
  if (window === "30 days") return days >= 0 && days <= 30;
  if (window === "60 days") return days >= 0 && days <= 60;
  return days >= 0 && days <= 90;
}

export const renewalRepository = {
  async list(filters: RenewalFilters = {}): Promise<PaginatedRenewals> {
    await certificateRepository.list({ page: 1, pageSize: 100 }); // Reconcile expired certificate status on app load; no background job is used.
    const known = new Set(store.map((item) => item.previousCertificateId));
    for (const certificate of certificates) if (!known.has(certificate.id) && !["Withdrawn", "Suspended", "Renewed"].includes(certificate.status)) store.push(makeRenewal(certificate));
    for (const record of store) {
      if (creationLedger.has(record.id)) continue;
      creationLedger.add(record.id);
      const events = await activityRepository.listByEntity("renewal", record.id);
      if (!events.some((event) => event.activityType === "created" && /renewal/i.test(event.description))) await emit(record, `Renewal Created for certificate ${certificateFor(record)?.certificateNumber ?? record.previousCertificateId}`, "created", { id: "user-system", name: "EcoAssurance lifecycle service", role: "System" });
    }
    for (const record of store) {
      if (filters.companyId && record.companyId !== filters.companyId) continue;
      const days = daysUntilExpiry(record.certificateExpiryDate);
      if (days <= 0 || ["Renewed", "Expired"].includes(record.status)) continue;
      for (const window of [90, 60, 30]) {
        if (days > window) continue;
        const key = `${record.id}:${window}`;
        if (reminderLedger.has(key)) continue;
        reminderLedger.add(key);
        const existing = await activityRepository.listByEntity("renewal", record.id);
        if (existing.some((event) => event.metadata.reminderWindow === window)) { reminderLedger.add(key); continue; }
        await activityRepository.create({ entityType: "renewal", entityId: record.id, activityType: "review_action", description: `${window}-day in-app renewal reminder: certificate ${record.previousCertificateId} expires in ${days} days`, performedBy: "user-system", performedByName: "EcoAssurance lifecycle service", role: "System reminder (in-app only)", metadata: { reference: record.renewalNumber, companyId: record.companyId, certificateId: record.previousCertificateId, previousCertificateId: record.previousCertificateId, standard: record.standard, status: record.status, reminderWindow: window, daysToExpiry: days, inAppOnly: true, relatedEntity: `${companyName(record.companyId)} · ${record.previousCertificateId}` } });
        reminderLedger.add(key);
      }
    }
    for (const record of store) {
      if (record.status === "Renewed" || !record.newCertificationId) continue;
      const replacement = certificates.find((item) => item.certificationId === record.newCertificationId);
      if (replacement?.status !== "Active") continue;
      const renewed = { ...record, newCertificateId: replacement.id, status: "Renewed" as const, lastUpdated: todayISO() };
      store[store.indexOf(record)] = renewed;
      await emit(renewed, `Renewal completed with ${replacement.certificateNumber}`, "status_changed", { id: "user-system", name: "EcoAssurance lifecycle service", role: "System" }, { newCertificateId: replacement.id });
    }
    const rows = store.map(hydrate).filter((record) => {
      const previous = certificateFor(record);
      const company = mockCompanies.find((item) => item.id === record.companyId);
      const searchText = [record.renewalNumber, previous?.certificateNumber, company?.legalName, company?.companyId, record.standard, record.scope, record.status].join(" ");
      const dates = (!filters.dateFrom || parseDisplayDate(record.renewalDueDate) >= new Date(filters.dateFrom).getTime()) && (!filters.dateTo || parseDisplayDate(record.renewalDueDate) <= new Date(`${filters.dateTo}T23:59:59`).getTime());
      return normalizedIncludes(searchText, filters.search)
        && (!filters.companyId || record.companyId === filters.companyId)
        && (!filters.country || filters.country === "All" || company?.country === filters.country)
        && (!filters.standard || filters.standard === "All" || record.standard === filters.standard)
        && (!filters.status || filters.status === "All" || record.status === filters.status)
        && expiryMatches(record, filters.dueWindow) && dates;
    }).sort((a, b) => filters.sort === "oldest" ? parseDisplayDate(a.createdDate) - parseDisplayDate(b.createdDate) : filters.sort === "company" ? companyName(a.companyId).localeCompare(companyName(b.companyId)) : filters.sort === "newest" ? parseDisplayDate(b.createdDate) - parseDisplayDate(a.createdDate) : parseDisplayDate(a.renewalDueDate) - parseDisplayDate(b.renewalDueDate));
    return paginate(rows, filters.page, filters.pageSize);
  },
  async getById(id: string, companyId?: string): Promise<RenewalRecord | null> {
    const record = store.find((item) => item.id === id || item.renewalNumber === id);
    if (!record || (companyId && record.companyId !== companyId)) return null;
    return hydrate(record);
  },
  async start(id: string, actor: CertificationActor = {}): Promise<{ renewal: RenewalRecord; certificationId: string }> {
    assertManager(actor);
    await certificateRepository.list({ page: 1, pageSize: 100 });
    let record = store.find((item) => item.id === id || item.renewalNumber === id);
    if (!record) {
      const previous = certificates.find((item) => item.id === id || item.certificateNumber === id);
      if (!previous) throw new Error("Select an existing certificate to renew.");
      record = makeRenewal(previous); store.unshift(record);
    }
    const previous = certificateFor(record);
    if (!previous) throw new Error("The previous certificate record is unavailable.");
    if (["Withdrawn", "Suspended", "Renewed"].includes(previous.status)) throw new Error("This certificate is not eligible to start another renewal cycle in its current status.");
    let certificationId = record.newCertificationId;
    if (!certificationId) {
      let applicationId = previous.applicationId;
      let auditId = previous.auditId;
      if (!applicationId) applicationId = mockApplications.find((item) => item.companyId === previous.companyId && item.standard === previous.standard && item.status !== "Rejected")?.id;
      if (!auditId) auditId = mockAudits.find((item) => item.companyId === previous.companyId && item.standard === previous.standard && item.status === "Completed")?.id;
      const cycle = await certificationRepository.createFromRenewal({ companyId: previous.companyId, applicationId, auditId, previousCertificateId: previous.id, renewalId: record.id, standard: previous.standard, scope: previous.scope }, actor);
      certificationId = cycle.id;
    }
    record = { ...record, newCertificationId: certificationId, status: "In Progress", lastUpdated: todayISO() };
    const index = store.findIndex((item) => item.id === record!.id); store[index] = record;
    await emit(record, `Renewal Started for ${previous.certificateNumber}; new certification cycle linked`, "status_changed", actor, { newCertificationId: certificationId });
    return { renewal: hydrate(record), certificationId };
  },
  async linkNewCertificate(id: string, certificateId: string, actor: CertificationActor = {}): Promise<RenewalRecord> {
    assertManager(actor);
    const record = store.find((item) => item.id === id || item.renewalNumber === id);
    if (!record) throw new Error("Renewal record not found.");
    const next = { ...record, newCertificateId: certificateId, status: "Approved" as const, lastUpdated: todayISO() };
    store[store.indexOf(record)] = next;
    await emit(next, "Replacement certificate generated for renewal", "approved", actor, { newCertificateId: certificateId });
    return hydrate(next);
  },
  async markRenewedByCertificate(certificateId: string, actor: CertificationActor = {}): Promise<void> {
    const replacement = certificates.find((item) => item.id === certificateId);
    const record = store.find((item) => item.newCertificationId && replacement?.certificationId === item.newCertificationId);
    if (!record) return;
    const updated = { ...record, newCertificateId: certificateId, status: "Renewed" as const, lastUpdated: todayISO() };
    store[store.indexOf(record)] = updated;
    await emit(updated, `Renewal completed with ${replacement?.certificateNumber ?? "replacement certificate"}`, "status_changed", actor, { newCertificateId: certificateId });
  },
  statuses: ["All", "Not Due", "Upcoming", "Renewal Due", "In Progress", "Submitted", "Under Review", "Approved", "Renewed", "Expired"] as const,
};
