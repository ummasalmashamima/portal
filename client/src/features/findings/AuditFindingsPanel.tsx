import { useMemo, useState } from "react";
import { ArrowUpRight, FileWarning, Plus, RefreshCw } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Badge, Button, Card, EmptyState, ErrorState, Field, Input, LoadingState } from "@/components/ui/Primitives";
import { FindingStatusBadge } from "@/features/findings/FindingComponents";
import { useFindings } from "@/hooks/useFindings";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import { findingRepository, effectiveFindingStatus } from "@/services/repositories/findingRepository";
import { findingTypes, type FindingType } from "@/types/finding";
import type { AuditRecord } from "@/types/audit";
import { mockAuditors } from "@/data/mockAuditors";

function dateInThirtyDays() { const date = new Date(); date.setDate(date.getDate() + 30); return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`; }
export function AuditFindingsPanel({ audit, canView = true, canCreate: canCreateAccess = false }: { audit: AuditRecord; canView?: boolean; canCreate?: boolean }) {
  const navigate = useNavigate();
  const { session } = useAuth();
  const canCreate = canCreateAccess && session?.user.role !== "Technical Reviewer";
  const { showToast } = useToast();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [draft, setDraft] = useState({ findingType: "Observation" as FindingType, clause: "", description: "", evidence: "", correctiveAction: "", targetDate: dateInThirtyDays() });
  const { data, total, loading, error, reload } = useFindings({ auditId: audit.id, page: 1, pageSize: 100, sort: "newest" });
  const counts = useMemo(() => ({ open: data.filter((item) => ["Open", "Correction Required"].includes(item.status)).length, submitted: data.filter((item) => ["CAP Submitted", "CAP Resubmitted"].includes(item.status)).length, review: data.filter((item) => item.status === "Under Review").length, closed: data.filter((item) => item.status === "Closed").length }), [data]);
  const add = async () => {
    if (!draft.description.trim() || !draft.targetDate) return;
    setBusy(true);
    try {
      const assigneeId = audit.leadAuditorId ?? audit.supportingAuditorIds[0];
      const assigneeName = assigneeId ? mockAuditors.find((person) => person.id === assigneeId)?.name ?? "Unassigned" : "Unassigned";
      const result = await findingRepository.create({ auditId: audit.id, findingType: draft.findingType, clause: draft.clause, description: draft.description.trim(), objectiveEvidence: draft.evidence.trim(), responsiblePersonId: assigneeId, responsiblePerson: assigneeName, correctiveAction: draft.correctiveAction.trim(), targetDate: draft.targetDate }, { id: session?.user.id, name: session?.user.name, role: session?.user.role });
      setDraft({ findingType: "Observation", clause: "", description: "", evidence: "", correctiveAction: "", targetDate: dateInThirtyDays() });
      setOpen(false); await reload(); showToast("Finding added to the audit and CAP register.");
      if (!data.length) navigate(`/findings/${result.id}`);
    } catch (reason) { showToast(reason instanceof Error ? reason.message : "Unable to create finding."); }
    finally { setBusy(false); }
  };
  if (!canView) return <EmptyState title="Findings access is restricted" description="This role can view the audit but does not have access to its CAP records." />;
  return <div>
    <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="font-display text-sm font-extrabold text-[var(--ea-primary)]">Audit findings</h2><p className="mt-1 text-xs text-[var(--ea-text-soft)]">CAP records stay linked to this audit and are available in the shared Findings register.</p></div><div className="flex flex-wrap gap-2">{canCreate && <Button size="sm" onClick={() => setOpen(!open)}><Plus className="h-3.5 w-3.5" />Add finding</Button>}<Button variant="outline" size="sm" onClick={() => navigate("/findings")}>View All <ArrowUpRight className="h-3.5 w-3.5" /></Button></div></div>
    <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-5"><Kpi label="Total" value={total} tone="blue" /><Kpi label="Open" value={counts.open} tone="gold" /><Kpi label="CAP Submitted" value={counts.submitted} tone="blue" /><Kpi label="Under Review" value={counts.review} tone="gold" /><Kpi label="Closed" value={counts.closed} tone="green" /></div>
    {open && canCreate && <Card className="mt-5 bg-[var(--ea-surface-soft)] p-4"><div className="mb-4"><p className="text-xs font-bold text-[var(--ea-primary)]">Add audit finding</p><p className="mt-1 text-[10px] text-[var(--ea-text-soft)]">The parent audit, application, company and standard are linked automatically.</p></div><div className="grid gap-4 md:grid-cols-2"><Field label="Finding type"><select value={draft.findingType} onChange={(event) => setDraft({ ...draft, findingType: event.target.value as FindingType })} className="h-10 w-full rounded-lg border border-[var(--border)] bg-white px-3 text-xs">{findingTypes.map((item) => <option key={item}>{item}</option>)}</select></Field><Field label="Clause / requirement"><Input value={draft.clause} onChange={(event) => setDraft({ ...draft, clause: event.target.value })} placeholder="e.g. 6.1.2" /></Field><Field label="Finding description" required><textarea className="w-full resize-y rounded-lg border border-[var(--border)] bg-white px-3.5 py-3 text-sm" value={draft.description} onChange={(event) => setDraft({ ...draft, description: event.target.value })} rows={3} /></Field><Field label="Objective evidence"><textarea className="w-full resize-y rounded-lg border border-[var(--border)] bg-white px-3.5 py-3 text-sm" value={draft.evidence} onChange={(event) => setDraft({ ...draft, evidence: event.target.value })} rows={3} /></Field><Field label="Initial corrective action"><textarea className="w-full resize-y rounded-lg border border-[var(--border)] bg-white px-3.5 py-3 text-sm" value={draft.correctiveAction} onChange={(event) => setDraft({ ...draft, correctiveAction: event.target.value })} rows={3} /></Field><Field label="Target date" required><Input type="date" value={draft.targetDate} onChange={(event) => setDraft({ ...draft, targetDate: event.target.value })} /></Field></div><div className="mt-4 flex justify-end gap-2"><Button variant="outline" size="sm" onClick={() => setOpen(false)}>Cancel</Button><Button size="sm" loading={busy} onClick={() => void add()}>Save finding</Button></div></Card>}
    {loading ? <LoadingState /> : error ? <div className="mt-5"><ErrorState message={error} /><Button className="mt-3" size="sm" variant="outline" onClick={() => void reload()}><RefreshCw className="h-3 w-3" />Try again</Button></div> : data.length ? <div className="mt-5 space-y-3">{data.map((item) => <Card key={item.id} className="p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><button onClick={() => navigate(`/findings/${item.id}`)} className="text-xs font-extrabold text-[var(--ea-secondary)] hover:text-[var(--ea-primary)]">{item.findingNumber}</button><Badge tone={item.findingType.includes("Nonconformity") ? "gold" : "blue"}>{item.findingType}</Badge><FindingStatusBadge status={effectiveFindingStatus(item)} /></div><p className="mt-2 text-xs font-bold leading-5 text-[var(--ea-text)]">{item.description}</p><p className="mt-1 text-[10px] text-[var(--ea-text-soft)]">Clause {item.clause || "—"} · Responsible: {item.responsiblePerson} · Target: {item.targetDate}</p></div><Button variant="ghost" size="sm" onClick={() => navigate(`/findings/${item.id}`)}>View Finding <ArrowUpRight className="h-3.5 w-3.5" /></Button></div></Card>)}</div> : <EmptyState title="No findings recorded" description="Add a finding here or from the existing Findings & CAP register." action={canCreate ? <Button size="sm" onClick={() => setOpen(true)}><Plus className="h-3.5 w-3.5" />Add finding</Button> : undefined} />}
  </div>;
}
function Kpi({ label, value, tone }: { label: string; value: number; tone: "blue" | "gold" | "green" }) { const colors = { blue: "bg-[var(--ea-accent-soft)] text-[var(--ea-primary)]", gold: "bg-[var(--ea-warning-soft)] text-[var(--ea-warning)]", green: "bg-[var(--ea-success-soft)] text-[var(--ea-success)]" }; return <div className="flex items-center justify-between rounded-lg bg-[var(--ea-surface-soft)] px-4 py-3"><span className="text-[10px] font-bold text-[var(--ea-text-soft)]">{label}</span><span className={`rounded-full px-2.5 py-1 text-xs font-extrabold ${colors[tone]}`}>{value}</span></div>; }
