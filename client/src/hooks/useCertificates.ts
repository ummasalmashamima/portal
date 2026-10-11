import { useCallback, useEffect, useState } from "react";
import { activityRepository } from "@/services/repositories/activityRepository";
import { mockApplicationRepository } from "@/services/repositories/applicationRepository";
import { mockAuditRepository } from "@/services/repositories/auditRepository";
import { certificateRepository } from "@/services/repositories/certificateRepository";
import { certificationRepository } from "@/services/repositories/certificationRepository";
import { mockCompanyRepository } from "@/services/repositories/companyRepository";
import { renewalRepository } from "@/services/repositories/renewalRepository";
import type { CertificateFilters, CertificateRecord, PaginatedCertificates } from "@/types/certificate";
import type { ActivityRecord } from "@/types/activity";
import type { ApplicationRecord } from "@/types/application";
import type { AuditRecord } from "@/types/audit";
import type { Company, RelatedAudit } from "@/types/company";
import type { CertificationRecord } from "@/types/certification";
import type { RenewalRecord } from "@/types/renewal";

const empty: PaginatedCertificates = { data: [], total: 0, page: 1, pageSize: 10, totalPages: 1 };
export function useCertificates(filters: CertificateFilters) {
  const [result, setResult] = useState<PaginatedCertificates>(empty); const [loading, setLoading] = useState(true); const [error, setError] = useState<string | null>(null);
  const reload = useCallback(async () => { setLoading(true); try { setResult(await certificateRepository.list(filters)); setError(null); } catch { setError("Unable to load certificates."); } finally { setLoading(false); } }, [filters.search, filters.companyId, filters.country, filters.applicationId, filters.auditId, filters.standard, filters.status, filters.expiryWindow, filters.dateFrom, filters.dateTo, filters.issueDateFrom, filters.issueDateTo, filters.expiryDateFrom, filters.expiryDateTo, filters.assignedAuditorId, filters.page, filters.pageSize, filters.sort]);
  useEffect(() => { void reload(); }, [reload]); return { ...result, loading, error, reload };
}
export function useCertificate(id?: string, access: Pick<CertificateFilters, "companyId" | "assignedAuditorId"> = {}) {
  const [certificate, setCertificate] = useState<CertificateRecord | null>(null); const [company, setCompany] = useState<Company | null>(null); const [application, setApplication] = useState<ApplicationRecord | null>(null); const [audit, setAudit] = useState<AuditRecord | null>(null); const [auditSummary, setAuditSummary] = useState<RelatedAudit | null>(null); const [certification, setCertification] = useState<CertificationRecord | null>(null); const [previousCertificate, setPreviousCertificate] = useState<CertificateRecord | null>(null); const [renewal, setRenewal] = useState<RenewalRecord | null>(null); const [history, setHistory] = useState<ActivityRecord[]>([]); const [loading, setLoading] = useState(true); const [error, setError] = useState<string | null>(null);
  const reload = useCallback(async () => {
    if (!id) { setLoading(false); return; }
    setLoading(true);
    try {
      const next = await certificateRepository.getById(id, access); setCertificate(next);
      if (!next) { setCompany(null); setApplication(null); setAudit(null); setAuditSummary(null); setCertification(null); setPreviousCertificate(null); setRenewal(null); setHistory([]); setError("Certificate not found or not available to this account."); return; }
      const [nextCompany, nextApplication, nextAudit, nextCertification, previous, renewalRecord, events] = await Promise.all([
        mockCompanyRepository.getById(next.companyId), next.applicationId ? mockApplicationRepository.getById(next.applicationId) : Promise.resolve(null), next.auditId ? mockAuditRepository.getById(next.auditId) : Promise.resolve(null), next.certificationId ? certificationRepository.getById(next.certificationId, { companyId: access.companyId, assignedAuditorId: access.assignedAuditorId }) : Promise.resolve(null), next.previousCertificateId ? certificateRepository.getById(next.previousCertificateId) : Promise.resolve(null), next.renewalId ? renewalRepository.getById(next.renewalId, access.companyId) : Promise.resolve(null), activityRepository.listByEntity("certificate", next.id),
      ]);
      setCompany(nextCompany); setApplication(nextApplication); setAudit(nextAudit); setCertification(nextCertification); setPreviousCertificate(previous); setRenewal(renewalRecord);
      setAuditSummary(nextAudit ? { id: nextAudit.id, referenceNo: nextAudit.auditNumber, type: nextAudit.auditType, standard: nextAudit.standard, auditor: "Existing audit record", date: nextAudit.plannedStartDate, status: nextAudit.status } : nextCompany?.audits.find((item) => item.referenceNo === next.auditReference) ?? null);
      setHistory(events); setError(null);
    } catch { setError("Unable to load this certificate."); }
    finally { setLoading(false); }
  }, [id, access.companyId, access.assignedAuditorId]);
  useEffect(() => { void reload(); }, [reload]); return { certificate, company, application, audit, auditSummary, certification, previousCertificate, renewal, history, loading, error, reload };
}
