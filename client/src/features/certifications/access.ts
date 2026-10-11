import { assignedAuditorId, customerCompanyId } from "@/features/findings/access";
import type { AuthSession } from "@/types/auth";

export function certificationAccessFilters(session: AuthSession | null) {
  return {
    companyId: customerCompanyId(session),
    assignedAuditorId: session?.user.role === "Auditor" ? assignedAuditorId(session) : undefined,
  };
}
