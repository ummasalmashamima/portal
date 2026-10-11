import { useCallback, useEffect, useState } from "react";
import { activityRepository } from "@/services/repositories/activityRepository";
import { mockApplicationRepository } from "@/services/repositories/applicationRepository";
import { mockAuditRepository } from "@/services/repositories/auditRepository";
import { certificateRepository } from "@/services/repositories/certificateRepository";
import { certificationRepository } from "@/services/repositories/certificationRepository";
import { mockCompanyRepository } from "@/services/repositories/companyRepository";
import type { CertificationFilters, CertificationReadinessItem, CertificationRecord, PaginatedCertifications } from "@/types/certification";
import type { ActivityRecord } from "@/types/activity";
import type { ApplicationRecord } from "@/types/application";
import type { AuditRecord } from "@/types/audit";
import type { RelatedAudit, Company } from "@/types/company";
import type { CertificateRecord } from "@/types/certificate";

const empty: PaginatedCertifications = { data: [], total: 0, page: 1, pageSize: 10, totalPages: 1 };
export function useCertifications(filters: CertificationFilters) {
  const [result, setResult] = useState<PaginatedCertifications>(empty); const [loading, setLoading] = useState(true); const [error, setError] = useState<string | null>(null);
  const reload = useCallback(async () => { setLoading(true); try { setResult(await certificationRepository.list(filters)); setError(null); } catch { setError("Unable to load certification cases."); } finally { setLoading(false); } }, [filters.search, filters.companyId, filters.country, filters.applicationId, filters.auditId, filters.standard, filters.status, filters.technicalReviewStatus, filters.managerId, filters.dateFrom, filters.dateTo, filters.assignedAuditorId, filters.page, filters.pageSize, filters.sort]);
  useEffect(() => { void reload(); }, [reload]); return { ...result, loading, error, reload };
}
export function useCertification(id?: string, access: Pick<CertificationFilters, "companyId" | "assignedAuditorId"> = {}) {
  const [certification, setCertification] = useState<CertificationRecord | null>(null); const [company, setCompany] = useState<Company | null>(null); const [application, setApplication] = useState<ApplicationRecord | null>(null); const [audit, setAudit] = useState<AuditRecord | null>(null); const [auditSummary, setAuditSummary] = useState<RelatedAudit | null>(null); const [certificate, setCertificate] = useState<CertificateRecord | null>(null); const [history, setHistory] = useState<ActivityRecord[]>([]); const [readiness, setReadiness] = useState<CertificationReadinessItem[]>([]); const [loading, setLoading] = useState(true); const [error, setError] = useState<string | null>(null);
  const reload = useCallback(async () => {
    if (!id) { setLoading(false); return; }
    setLoading(true);
    try {
      const next = await certificationRepository.getById(id, access);
      setCertification(next);
      if (!next) { setCompany(null); setApplication(null); setAudit(null); setAuditSummary(null); setCertificate(null); setHistory([]); setReadiness([]); setError("Certification not found or not available to this account."); return; }
      const relatedCertificateId = next.certificateId ?? next.previousCertificateId;
      const [nextCompany, nextApplication, nextAudit, nextCertificate, events] = await Promise.all([
        mockCompanyRepository.getById(next.companyId), next.applicationId ? mockApplicationRepository.getById(next.applicationId) : Promise.resolve(null), next.auditId ? mockAuditRepository.getById(next.auditId) : Promise.resolve(null), relatedCertificateId ? certificateRepository.getById(relatedCertificateId, { companyId: access.companyId, assignedAuditorId: access.assignedAuditorId }) : Promise.resolve(null), activityRepository.listByEntity("certification", next.id),
      ]);
      setCompany(nextCompany); setApplication(nextApplication); setAudit(nextAudit); setCertificate(nextCertificate);
      setAuditSummary(nextAudit ? { id: nextAudit.id, referenceNo: nextAudit.auditNumber, type: nextAudit.auditType, standard: nextAudit.standard, auditor: "Existing audit record", date: nextAudit.plannedStartDate, status: nextAudit.status } : nextCompany?.audits.find((item) => item.referenceNo === next.auditReference) ?? null);
      try { setReadiness(certificationRepository.readiness(next)); } catch { setReadiness([]); }
      setHistory(events); setError(null);
    } catch { setError("Unable to load this certification case."); }
    finally { setLoading(false); }
  }, [id, access.companyId, access.assignedAuditorId]);
  useEffect(() => { void reload(); }, [reload]); return { certification, company, application, audit, auditSummary, certificate, history, readiness, loading, error, reload };
}
