import { mockApplications } from "@/data/mockApplications";
import { mockCompanies } from "@/data/mockCompanies";
import type { ApplicationFilters, ApplicationRecord, ApplicationStatus } from "@/types/application";
import type { ActivityRecord } from "@/types/activity";
import { activityRepository } from "./activityRepository";
import { dateWithinRange, nextReference, normalizedIncludes, paginate, parseDisplayDate } from "./repositoryUtils";
import { isWithinCurrentCompanyScope } from "./customerScope";

const store = mockApplications as ApplicationRecord[];
export const applicationFilterOptions = {
  statuses: ["All", "Draft", "Submitted", "Under Review", "Pending Customer", "Approved", "Rejected"],
  types: ["All", "Initial Certification", "Renewal", "Surveillance", "Scope Extension"],
  countries: ["All", "Bangladesh", "Myanmar", "China"],
  standards: ["All", "ISO 9001", "ISO 14001", "ISO 45001", "ISO 14064", "HIGG FEM"],
  dates: ["All", "Last 30 days", "Last 90 days", "This year"],
} as const;

function actor(record?: ApplicationRecord) {
  return { performedBy: "user-current", performedByName: record?.createdBy ?? "Current user", role: "Application Officer" };
}
type ActivityActor = Pick<ActivityRecord, "performedBy" | "performedByName" | "role">;

export const mockApplicationRepository = {
  async list(filters: ApplicationFilters = {}) {
    const rows = store.filter((item) => {
      const company = mockCompanies.find((entry) => entry.id === item.companyId);
      const query = [item.applicationNumber, company?.legalName, company?.companyId, item.applicationType, item.standard, item.country].join(" ");
      return isWithinCurrentCompanyScope(item.companyId)
        && normalizedIncludes(query, filters.search)
        && (!filters.status || filters.status === "All" || item.status === filters.status)
        && (!filters.applicationType || filters.applicationType === "All" || item.applicationType === filters.applicationType)
        && (!filters.country || filters.country === "All" || item.country === filters.country)
        && (!filters.standard || filters.standard === "All" || item.standard === filters.standard)
        && (!filters.companyId || item.companyId === filters.companyId)
        && dateWithinRange(item.applicationDate, filters.dateRange);
    }).sort((a, b) => (parseDisplayDate(a.applicationDate) - parseDisplayDate(b.applicationDate)) * (filters.sort === "oldest" ? 1 : -1));
    return paginate(rows, filters.page, filters.pageSize);
  },
  async getById(id: string): Promise<ApplicationRecord | null> {
    const record = store.find((item) => item.id === id || item.applicationNumber === id);
    return record && isWithinCurrentCompanyScope(record.companyId) ? record : null;
  },
  async create(input: Omit<ApplicationRecord, "id" | "applicationNumber" | "createdDate" | "lastUpdated">): Promise<ApplicationRecord> {
    const today = new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
    const record: ApplicationRecord = {
      ...input,
      id: `app-${String(store.length + 1).padStart(3, "0")}`,
      applicationNumber: nextReference("APP", store.map((item) => item.applicationNumber), 6),
      createdDate: today,
      lastUpdated: today,
      documents: [...input.documents],
    };
    store.unshift(record);
    await activityRepository.create({ entityType: "application", entityId: record.id, activityType: record.status === "Draft" ? "saved_as_draft" : "submitted", description: record.status === "Draft" ? "Application saved as draft" : "Application submitted", ...actor(record), metadata: { reference: record.applicationNumber } });
    return record;
  },
  async update(id: string, changes: Partial<ApplicationRecord>): Promise<ApplicationRecord> {
    const index = store.findIndex((item) => item.id === id);
    if (index < 0) throw new Error("Application not found");
    const old = store[index];
    const record = { ...old, ...changes, id: old.id, applicationNumber: old.applicationNumber, lastUpdated: new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) };
    store[index] = record;
    await activityRepository.create({ entityType: "application", entityId: id, activityType: "updated", description: "Application record updated", ...actor(record), metadata: { reference: record.applicationNumber } });
    return record;
  },
  async transition(id: string, status: ApplicationStatus, description?: string, actorOverride?: ActivityActor): Promise<ApplicationRecord> {
    const index = store.findIndex((item) => item.id === id);
    if (index < 0) throw new Error("Application not found");
    if (status === "Under Review" && store[index].status !== "Submitted") throw new Error("Only submitted applications can be moved into review.");
    const record = { ...store[index], status, lastUpdated: new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) };
    store[index] = record;
    const activityType = status === "Submitted" ? "submitted" : status === "Under Review" ? "moved_to_review" : status === "Pending Customer" ? "information_requested" : status === "Approved" ? "approved" : status === "Rejected" ? "rejected" : "status_changed";
    await activityRepository.create({ entityType: "application", entityId: id, activityType, description: description ?? `Application status changed to ${status}`, ...actor(record), ...actorOverride, metadata: { reference: record.applicationNumber, status } });
    return record;
  },
};
