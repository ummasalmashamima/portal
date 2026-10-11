import { useCallback, useEffect, useState } from "react";
import { activityRepository } from "@/services/repositories/activityRepository";
import { mockApplicationRepository } from "@/services/repositories/applicationRepository";
import { mockAuditRepository } from "@/services/repositories/auditRepository";
import { certificateRepository } from "@/services/repositories/certificateRepository";
import { certificationRepository } from "@/services/repositories/certificationRepository";
import { mockCompanyRepository } from "@/services/repositories/companyRepository";
import { renewalRepository } from "@/services/repositories/renewalRepository";
import type { ActivityRecord } from "@/types/activity";
import type { ApplicationRecord } from "@/types/application";
import type { AuditRecord } from "@/types/audit";
import type { CertificateRecord } from "@/types/certificate";
import type { CertificationRecord } from "@/types/certification";
import type { Company, RelatedAudit } from "@/types/company";
import type { PaginatedRenewals, RenewalFilters, RenewalRecord } from "@/types/renewal";

const empty: PaginatedRenewals = { data: [], total: 0, page: 1, pageSize: 10, totalPages: 1 };
export function useRenewals(filters: RenewalFilters) {
  const [result, setResult] = useState<PaginatedRenewals>(empty); const [loading, setLoading] = useState(true); const [error, setError] = useState<string | null>(null);
  const reload = useCallback(async () => { setLoading(true); try { setResult(await renewalRepository.list(filters)); setError(null); } catch { setError("Unable to load renewals."); } finally { setLoading(false); } }, [filters.search, filters.companyId, filters.country, filters.standard, filters.status, filters.dueWindow, filters.dateFrom, filters.dateTo, filters.page, filters.pageSize, filters.sort]);
  useEffect(() => { void reload(); }, [reload]); return { ...result, loading, error, reload };
}
export function useRenewal(id?: string, companyId?: string) {
  const [renewal, setRenewal] = useState<RenewalRecord | null>(null); const [previousCertificate, setPreviousCertificate] = useState<CertificateRecord | null>(null); const [previousCertification, setPreviousCertification] = useState<CertificationRecord | null>(null); const [newCertificate, setNewCertificate] = useState<CertificateRecord | null>(null); const [certification, setCertification] = useState<CertificationRecord | null>(null); const [company, setCompany] = useState<Company | null>(null); const [application, setApplication] = useState<ApplicationRecord | null>(null); const [audit, setAudit] = useState<AuditRecord | null>(null); const [auditSummary, setAuditSummary] = useState<RelatedAudit | null>(null); const [history, setHistory] = useState<ActivityRecord[]>([]); const [loading, setLoading] = useState(true); const [error, setError] = useState<string | null>(null);
  const reload = useCallback(async () => {
    if (!id) { setLoading(false); return; }
    setLoading(true);
    try {
      const next = await renewalRepository.getById(id, companyId); setRenewal(next);
      if (!next) { setPreviousCertificate(null); setPreviousCertification(null); setNewCertificate(null); setCertification(null); setCompany(null); setApplication(null); setAudit(null); setAuditSummary(null); setHistory([]); setError("Renewal not found or not available to this account."); return; }
      const previous = await certificateRepository.getById(next.previousCertificateId, companyId ? { companyId } : {});
      const [nextCompany, priorCertification, nextCertification, replacement, events] = await Promise.all([
        mockCompanyRepository.getById(next.companyId), previous?.certificationId ? certificationRepository.getById(previous.certificationId, companyId ? { companyId } : {}) : Promise.resolve(null), next.newCertificationId ? certificationRepository.getById(next.newCertificationId, companyId ? { companyId } : {}) : Promise.resolve(null), next.newCertificateId ? certificateRepository.getById(next.newCertificateId, companyId ? { companyId } : {}) : next.newCertificationId ? certificateRepository.getByCertificationId(next.newCertificationId) : Promise.resolve(null), activityRepository.listByEntity("renewal", next.id),
      ]);
      setPreviousCertificate(previous); setPreviousCertification(priorCertification); setCompany(nextCompany); setCertification(nextCertification); setNewCertificate(replacement);
      const appId = nextCertification?.applicationId ?? previous?.applicationId ?? replacement?.applicationId;
      const auditId = nextCertification?.auditId ?? previous?.auditId ?? replacement?.auditId;
      const [nextApplication, nextAudit] = await Promise.all([appId ? mockApplicationRepository.getById(appId) : Promise.resolve(null), auditId ? mockAuditRepository.getById(auditId) : Promise.resolve(null)]);
      setApplication(nextApplication); setAudit(nextAudit); setAuditSummary(nextAudit ? { id: nextAudit.id, referenceNo: nextAudit.auditNumber, type: nextAudit.auditType, standard: nextAudit.standard, auditor: "Existing audit record", date: nextAudit.plannedStartDate, status: nextAudit.status } : nextCompany?.audits.find((item) => item.referenceNo === previous?.auditReference) ?? null);
      setHistory(events); setError(null);
    } catch { setError("Unable to load this renewal."); }
    finally { setLoading(false); }
  }, [id, companyId]);
  useEffect(() => { void reload(); }, [reload]); return { renewal, previousCertificate, previousCertification, newCertificate, certification, company, application, audit, auditSummary, history, loading, error, reload };
}
