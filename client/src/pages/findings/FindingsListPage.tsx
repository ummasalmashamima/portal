import { useMemo, useState } from "react";
import { ArrowUpRight, FileWarning, Plus, RefreshCw } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button, Card, EmptyState, ErrorState, KpiCard, LoadingState, StatusBadge } from "@/components/ui/Primitives";
import { EnterpriseTable, FilterBar, PageHeader, Pagination, TableCell, TableHead } from "@/components/ui/Enterprise";
import { useFindings } from "@/hooks/useFindings";
import { useCompanies } from "@/hooks/useCompanies";
import { useAudits } from "@/hooks/useAudits";
import { useAuth } from "@/contexts/AuthContext";
import { assignedAuditorId, customerCompanyId } from "@/features/findings/access";
import { effectiveFindingStatus } from "@/services/repositories/findingRepository";
import { findingTypes, type FindingFilters, type FindingStatusView } from "@/types/finding";

const controlClass = "ea-focus h-10 min-w-0 rounded-lg border border-[var(--border)] bg-white px-3 text-xs font-semibold text-[var(--ea-text)] outline-none focus:border-[var(--ea-accent)]";
const statusOptions: FindingStatusView[] = ["Open", "CAP Submitted", "Under Review", "Correction Required", "CAP Resubmitted", "Accepted", "Closed", "Overdue"];
const initialFilters = (companyId?: string): FindingFilters => ({ search: "", companyId: companyId ?? "", auditId: "", findingType: "All", status: "All", sort: "newest", page: 1, pageSize: 10 });
const dateLabel = (value: string) => {
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? value || "—" : date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
};

export function FindingsListPage() {
  const navigate = useNavigate();
  const { can, session } = useAuth();
  const auditorId = assignedAuditorId(session);
  const scopedCompanyId = customerCompanyId(session);
  const [filters, setFilters] = useState<FindingFilters>(() => initialFilters(scopedCompanyId));
  const scopedFilters: FindingFilters = { ...filters, companyId: scopedCompanyId ?? (filters.companyId || undefined), assignedAuditorId: auditorId };
  const result = useFindings(scopedFilters);
  const all = useFindings({ companyId: scopedCompanyId, assignedAuditorId: auditorId, page: 1, pageSize: 1000, sort: "newest" });
  const companies = useCompanies({ page: 1, pageSize: 100 });
  const audits = useAudits({ page: 1, pageSize: 100 });
  const companyMap = useMemo(() => Object.fromEntries(companies.data.map((company) => [company.id, company])), [companies.data]);
  const auditMap = useMemo(() => Object.fromEntries(audits.data.map((audit) => [audit.id, audit])), [audits.data]);
  const counts = useMemo(() => ({
    total: all.total,
    major: all.data.filter((finding) => finding.findingType === "Major Nonconformity").length,
    minor: all.data.filter((finding) => finding.findingType === "Minor Nonconformity").length,
    open: all.data.filter((finding) => finding.status === "Open").length,
    review: all.data.filter((finding) => finding.status === "Under Review").length,
    closed: all.data.filter((finding) => finding.status === "Closed").length,
  }), [all.data, all.total]);
  const update = (key: keyof FindingFilters, value: string | number) => setFilters((current) => ({ ...current, [key]: value, ...(key !== "page" ? { page: 1 } : {}) }));
  const clear = () => setFilters(initialFilters(scopedCompanyId));
  if (!can("findings.view")) return <div className="mx-auto max-w-2xl"><ErrorState message="Findings are not available for this demo role." /></div>;

  return <div className="mx-auto max-w-[1500px]">
    <PageHeader eyebrow="Audit follow-up" title="Findings & CAP" description="See what was found, how it will be corrected, and what still needs review." actions={can("findings.manage") && <Button onClick={() => navigate("/findings/new")}><Plus className="h-4 w-4" />New Finding</Button>} />
    <div className="mt-7 grid gap-3 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-6">
      <KpiCard label="Total Findings" value={String(counts.total).padStart(2, "0")} delta="Portfolio" note="all audit findings" icon={FileWarning} tone="green" />
      <KpiCard label="Major NC" value={String(counts.major).padStart(2, "0")} delta="Major" note="nonconformities" icon={FileWarning} tone="gold" />
      <KpiCard label="Minor NC" value={String(counts.minor).padStart(2, "0")} delta="Minor" note="nonconformities" icon={FileWarning} tone="slate" />
      <KpiCard label="Open" value={String(counts.open).padStart(2, "0")} delta="Awaiting CAP" note="not yet submitted" icon={FileWarning} tone="slate" />
      <KpiCard label="Under Review" value={String(counts.review).padStart(2, "0")} delta="Reviewer" note="CAP being checked" icon={FileWarning} tone="gold" />
      <KpiCard label="Closed" value={String(counts.closed).padStart(2, "0")} delta="Complete" note="evidence verified" icon={FileWarning} tone="green" />
    </div>
    <FilterBar search={filters.search ?? ""} onSearch={(value) => update("search", value)} placeholder="Search finding, company, audit, or description…" onClear={clear}>
      <div className="grid w-full grid-cols-2 gap-2 sm:grid-cols-4">
        <select aria-label="Finding type filter" value={filters.findingType ?? "All"} onChange={(event) => update("findingType", event.target.value)} className={controlClass}><option value="All">All finding types</option>{findingTypes.map((type) => <option key={type}>{type}</option>)}</select>
        <select aria-label="Finding status filter" value={filters.status ?? "All"} onChange={(event) => update("status", event.target.value)} className={controlClass}><option value="All">All statuses</option>{statusOptions.map((status) => <option key={status}>{status}</option>)}</select>
        <select aria-label="Audit filter" value={filters.auditId ?? ""} onChange={(event) => update("auditId", event.target.value)} className={controlClass}><option value="">All audits</option>{audits.data.map((audit) => <option key={audit.id} value={audit.id}>{audit.auditNumber}</option>)}</select>
        <select aria-label="Company filter" value={scopedCompanyId ?? (filters.companyId ?? "")} disabled={Boolean(scopedCompanyId)} onChange={(event) => update("companyId", event.target.value)} className={`${controlClass} disabled:bg-[var(--ea-surface-soft)]`}><option value="">All companies</option>{companies.data.map((company) => <option key={company.id} value={company.id}>{company.legalName}</option>)}</select>
      </div>
    </FilterBar>
    {result.loading || all.loading ? <LoadingState /> : result.error || all.error ? <div className="mt-6"><ErrorState message={result.error ?? all.error ?? "Unable to load findings."} /><Button className="mt-4" variant="outline" onClick={() => { void result.reload(); void all.reload(); }}>Try again</Button></div> : <Card className="mt-6 overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border)] px-5 py-4"><div><p className="text-xs font-bold text-[var(--ea-primary)]">Findings register</p><p className="mt-1 text-[10px] text-[var(--ea-text-soft)]">Every finding stays linked to its original audit and company.</p></div><button onClick={() => void result.reload()} className="text-xs font-bold text-[var(--ea-secondary)]"><RefreshCw className="mr-1 inline h-3.5 w-3.5" />Refresh</button></div>
      {result.data.length ? <EnterpriseTable><TableHead><th className="px-4 py-3">Finding No.</th><th className="px-4 py-3">Company</th><th className="px-4 py-3">Audit</th><th className="px-4 py-3">Finding Type</th><th className="px-4 py-3">Description</th><th className="px-4 py-3">CAP Status</th><th className="px-4 py-3">Due Date</th><th className="px-4 py-3">Action</th></TableHead><tbody>{result.data.map((finding) => {
        const status = effectiveFindingStatus(finding);
        return <tr key={finding.id} className="transition hover:bg-[var(--ea-surface-soft)]"><TableCell><button onClick={() => navigate(`/findings/${finding.id}`)} className="font-extrabold text-[var(--ea-secondary)] hover:text-[var(--ea-primary)]">{finding.findingNumber}</button></TableCell><TableCell><p className="max-w-[190px] truncate font-bold text-[var(--ea-text)]">{companyMap[finding.companyId]?.legalName ?? finding.companyId}</p></TableCell><TableCell><button onClick={() => navigate(`/audits/${finding.auditId}`)} className="font-semibold text-[var(--ea-secondary)]">{auditMap[finding.auditId]?.auditNumber ?? finding.auditNumber}</button></TableCell><TableCell>{finding.findingType}</TableCell><TableCell><p className="max-w-[260px] truncate text-[11px] text-[var(--ea-text-soft)]">{finding.description}</p></TableCell><TableCell><StatusBadge status={status} /></TableCell><TableCell className={status === "Overdue" ? "font-bold text-[var(--ea-danger)]" : ""}>{dateLabel(finding.targetDate)}</TableCell><TableCell><button aria-label={`View ${finding.findingNumber}`} onClick={() => navigate(`/findings/${finding.id}`)} className="inline-flex items-center gap-1 rounded-md px-2 py-1.5 text-[10px] font-bold text-[var(--ea-secondary)] hover:bg-[var(--ea-accent-soft)]">View <ArrowUpRight className="h-3.5 w-3.5" /></button></TableCell></tr>;
      })}</tbody></EnterpriseTable> : <EmptyState title="No findings found" description="Adjust the filters, or add a finding from an existing audit." action={<Button variant="outline" onClick={() => navigate("/audits")}>Open Audit Management</Button>} />}
      <Pagination page={result.page} totalPages={result.totalPages} total={result.total} pageSize={result.pageSize} onPageChange={(value) => update("page", value)} onPageSizeChange={(value) => update("pageSize", value)} itemLabel="findings" />
    </Card>}
  </div>;
}
