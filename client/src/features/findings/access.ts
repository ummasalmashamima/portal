import { mockAuditors } from "@/data/mockAuditors";
import type { AuthSession } from "@/types/auth";
import type { AuditRecord } from "@/types/audit";
import { getCustomerCompanyIdForEmail } from "@/services/repositories/customerScope";

export function assignedAuditorId(session: AuthSession | null): string | undefined {
  if (session?.user.role !== "Auditor") return undefined;
  return mockAuditors.find((item) => item.name === session.user.name)?.id ?? "__no_assigned_auditor__";
}
export function auditorAssignedToAudit(session: AuthSession | null, audit: AuditRecord | null): boolean {
  if (session?.user.role !== "Auditor") return true;
  const id = assignedAuditorId(session);
  return Boolean(audit && id && id !== "__no_assigned_auditor__" && (audit.leadAuditorId === id || audit.supportingAuditorIds.includes(id)));
}
export function customerCompanyId(session: AuthSession | null): string | undefined {
  if (session?.user.role !== "Customer") return undefined;
  return getCustomerCompanyIdForEmail(session.user.email) ?? "__unmapped_customer_company__";
}
