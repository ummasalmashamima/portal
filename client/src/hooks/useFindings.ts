import { useCallback, useEffect, useState } from "react";
import { findingRepository } from "@/services/repositories/findingRepository";
import { mockAuditRepository } from "@/services/repositories/auditRepository";
import { mockApplicationRepository } from "@/services/repositories/applicationRepository";
import { mockCompanyRepository } from "@/services/repositories/companyRepository";
import { activityRepository } from "@/services/repositories/activityRepository";
import type { FindingFilters, FindingRecord, PaginatedFindings } from "@/types/finding";
import type { ActivityRecord } from "@/types/activity";
import type { AuditRecord } from "@/types/audit";
import type { ApplicationRecord } from "@/types/application";
import type { Company } from "@/types/company";

export function useFindings(filters: FindingFilters) {
  const [result, setResult] = useState<PaginatedFindings>({ data: [], total: 0, page: 1, pageSize: 10, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const reload = useCallback(async () => {
    setLoading(true);
    try { setResult(await findingRepository.list(filters)); setError(null); }
    catch { setError("Unable to load findings. Please try again."); }
    finally { setLoading(false); }
  }, [filters.search, filters.findingNo, filters.auditNo, filters.companyId, filters.findingType, filters.standard, filters.clause, filters.status, filters.responsiblePersonId, filters.targetDate, filters.sort, filters.auditId, filters.assignedAuditorId, filters.page, filters.pageSize]);
  useEffect(() => { void reload(); }, [reload]);
  return { ...result, loading, error, reload };
}

export function useFinding(id?: string, access: Pick<FindingFilters, "companyId" | "assignedAuditorId"> = {}) {
  const [finding, setFinding] = useState<FindingRecord | null>(null);
  const [audit, setAudit] = useState<AuditRecord | null>(null);
  const [application, setApplication] = useState<ApplicationRecord | null>(null);
  const [company, setCompany] = useState<Company | null>(null);
  const [history, setHistory] = useState<ActivityRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const reload = useCallback(async () => {
    if (!id) { setLoading(false); return; }
    setLoading(true);
    try {
      const next = await findingRepository.getById(id, access);
      setFinding(next);
      if (!next) { setAudit(null); setApplication(null); setCompany(null); setHistory([]); setError("Finding not found or not assigned to your audit queue."); return; }
      const [nextAudit, nextApplication, nextCompany, events] = await Promise.all([
        mockAuditRepository.getById(next.auditId),
        mockApplicationRepository.getById(next.applicationId),
        mockCompanyRepository.getById(next.companyId),
        activityRepository.listByEntity("finding", next.id),
      ]);
      setAudit(nextAudit); setApplication(nextApplication); setCompany(nextCompany); setHistory(events); setError(null);
    } catch { setError("Unable to load this finding."); }
    finally { setLoading(false); }
  }, [id, access.companyId, access.assignedAuditorId]);
  useEffect(() => { void reload(); }, [reload]);
  return { finding, audit, application, company, history, loading, error, reload };
}
