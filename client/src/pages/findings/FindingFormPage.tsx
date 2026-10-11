import { useEffect, useState } from "react";
import { ArrowLeft, Save } from "lucide-react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { Button, Card, ErrorState, Field, Input, LoadingState } from "@/components/ui/Primitives";
import { PageHeader } from "@/components/ui/Enterprise";
import { useAudit, useAudits } from "@/hooks/useAudits";
import { useFinding } from "@/hooks/useFindings";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import { assignedAuditorId, auditorAssignedToAudit, customerCompanyId } from "@/features/findings/access";
import { findingRepository } from "@/services/repositories/findingRepository";
import { findingTypes, type FindingType, type FindingUpdate } from "@/types/finding";
import { mockAuditors } from "@/data/mockAuditors";

function initialDate() { const date = new Date(); date.setDate(date.getDate() + 30); return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`; }
function actor(session: ReturnType<typeof useAuth>["session"]) { return { id: session?.user.id, name: session?.user.name, role: session?.user.role }; }
type Draft = FindingUpdate & { findingType: FindingType; clause: string; description: string; objectiveEvidence: string; responsiblePersonId: string; responsiblePerson: string; targetDate: string };
const emptyDraft = (): Draft => ({ findingType: "Major Nonconformity", clause: "", description: "", objectiveEvidence: "", responsiblePersonId: "", responsiblePerson: "Unassigned", targetDate: initialDate() });
const inputClass = "ea-focus h-11 w-full rounded-lg border border-[var(--border)] bg-white px-3.5 text-sm text-[var(--ea-text)] focus:border-[var(--ea-accent)]";

export function FindingFormPage({ mode = "create" }: { mode?: "create" | "edit" }) {
  const isEdit = mode === "edit";
  const { findingId } = useParams();
  const [search] = useSearchParams();
  const navigate = useNavigate();
  const { can, session } = useAuth();
  const { showToast } = useToast();
  const access = { companyId: customerCompanyId(session), assignedAuditorId: assignedAuditorId(session) };
  const existing = useFinding(isEdit ? findingId : undefined, access);
  const audits = useAudits({ page: 1, pageSize: 100, companyId: customerCompanyId(session) });
  const [selectedAuditId, setSelectedAuditId] = useState(search.get("auditId") ?? "");
  const parent = useAudit(isEdit ? "__unused_finding_edit__" : selectedAuditId || "__no_audit_selected__");
  const audit = isEdit ? existing.audit : parent.audit;
  const application = isEdit ? existing.application : parent.application;
  const company = isEdit ? existing.company : parent.company;
  const site = company?.sites.find((item) => item.id === audit?.siteId);
  const [draft, setDraft] = useState<Draft>(emptyDraft());
  const [busy, setBusy] = useState(false);
  const canManage = can("findings.manage");
  const canUseAudit = auditorAssignedToAudit(session, audit);

  useEffect(() => {
    if (isEdit && existing.finding) {
      const record = existing.finding;
      setDraft({ findingType: record.findingType, clause: record.clause, description: record.description, objectiveEvidence: record.objectiveEvidence, responsiblePersonId: record.responsiblePersonId ?? "", responsiblePerson: record.responsiblePerson, targetDate: record.targetDate });
    }
  }, [isEdit, existing.finding]);
  useEffect(() => {
    if (!isEdit && audit) {
      const responsibleId = audit.leadAuditorId ?? audit.supportingAuditorIds[0] ?? "";
      setDraft((current) => ({ ...current, responsiblePersonId: responsibleId, responsiblePerson: mockAuditors.find((person) => person.id === responsibleId)?.name ?? "Unassigned" }));
    }
  }, [isEdit, audit?.id]);

  const loading = isEdit ? existing.loading : audits.loading || (Boolean(selectedAuditId) && parent.loading);
  const loadError = isEdit ? existing.error : audits.error ?? (selectedAuditId ? parent.error : null);
  if (!canManage) return <div className="mx-auto max-w-2xl"><ErrorState message="Your role does not have permission to create or edit findings." /><Button className="mt-4" variant="outline" onClick={() => navigate("/findings")}>Back to Findings & CAP</Button></div>;
  if (loading) return <LoadingState />;
  if (loadError) return <div className="mx-auto max-w-2xl"><ErrorState message={loadError} /><Button className="mt-4" variant="outline" onClick={() => navigate("/findings")}>Back to Findings & CAP</Button></div>;
  if (isEdit && (!existing.finding || !audit || !application || !company || !canUseAudit)) return <div className="mx-auto max-w-2xl"><ErrorState message="This finding or its linked audit is not available to your account." /><Button className="mt-4" variant="outline" onClick={() => navigate(findingId ? `/findings/${findingId}` : "/findings")}>Back to finding</Button></div>;
  if (!isEdit && audit && (!application || !company || !canUseAudit)) return <div className="mx-auto max-w-2xl"><ErrorState message="This audit is not available for finding entry." /><Button className="mt-4" variant="outline" onClick={() => navigate("/audits")}>Open audits</Button></div>;

  const setField = <K extends keyof Draft>(key: K, value: Draft[K]) => setDraft((current) => ({ ...current, [key]: value }));
  const save = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!audit) { showToast("Select an existing audit before creating a finding."); return; }
    setBusy(true);
    try {
      if (isEdit && findingId) {
        const changes: FindingUpdate = { findingType: draft.findingType, clause: draft.clause, description: draft.description.trim(), objectiveEvidence: draft.objectiveEvidence.trim(), responsiblePersonId: draft.responsiblePersonId || undefined, responsiblePerson: draft.responsiblePerson, targetDate: draft.targetDate };
        await findingRepository.update(findingId, changes, actor(session));
        showToast("Finding details saved. The change is recorded in history.");
        navigate(`/findings/${findingId}`);
      } else {
        const result = await findingRepository.create({ auditId: audit.id, findingType: draft.findingType, clause: draft.clause, description: draft.description.trim(), objectiveEvidence: draft.objectiveEvidence.trim(), responsiblePersonId: draft.responsiblePersonId || undefined, responsiblePerson: draft.responsiblePerson || "Unassigned", targetDate: draft.targetDate }, actor(session));
        showToast("Finding created and linked to its existing audit, application, and company.");
        navigate(`/findings/${result.id}`);
      }
    } catch (reason) { showToast(reason instanceof Error ? reason.message : "Unable to save this finding."); }
    finally { setBusy(false); }
  };

  const linkedInfo = audit && company ? <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
    <Field label="Audit"><Input readOnly value={`${audit.auditNumber} · ${audit.auditType}`} className={inputClass} /></Field>
    <Field label="Company"><Input readOnly value={company.legalName} className={inputClass} /></Field>
    <Field label="Site"><Input readOnly value={site?.name ?? audit.location ?? "Not recorded"} className={inputClass} /></Field>
    <Field label="Standard"><Input readOnly value={audit.standard} className={inputClass} /></Field>
  </div> : null;

  return <div className="mx-auto max-w-[1100px]">
    <button onClick={() => navigate(isEdit && findingId ? `/findings/${findingId}` : selectedAuditId ? `/audits/${selectedAuditId}` : "/findings")} className="mb-5 inline-flex items-center gap-2 text-xs font-bold text-[var(--ea-secondary)]"><ArrowLeft className="h-3.5 w-3.5" />{isEdit ? "Back to finding" : "Back"}</button>
    <PageHeader eyebrow={isEdit ? "Finding details" : "Audit finding"} title={isEdit ? `Edit ${existing.finding?.findingNumber ?? "finding"}` : "New Finding"} description="Record the issue against an existing audit. Company, site, and standard are linked from that audit." />
    <form onSubmit={(event) => void save(event)}>
      <Card className="mt-6 p-5 sm:p-7">
        <section>
          <div className="mb-4"><h2 className="font-display text-sm font-extrabold text-[var(--ea-primary)]">Audit Information</h2><p className="mt-1 text-xs text-[var(--ea-text-soft)]">Select an existing audit. Related records are filled automatically and cannot be duplicated here.</p></div>
          {!isEdit && <div className="mb-4"><Field label="Audit" required><select required value={selectedAuditId} onChange={(event) => setSelectedAuditId(event.target.value)} className={inputClass}><option value="">Select an audit</option>{audits.data.map((item) => <option key={item.id} value={item.id}>{item.auditNumber} · {item.status} · {item.standard}</option>)}</select></Field></div>}
          {linkedInfo ?? <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"><Field label="Company"><Input readOnly value="Selected from Audit" className={inputClass} /></Field><Field label="Site"><Input readOnly value="Selected from Audit" className={inputClass} /></Field><Field label="Standard"><Input readOnly value="Selected from Audit" className={inputClass} /></Field></div>}
        </section>
        <section className="mt-8 border-t border-[var(--border)] pt-6">
          <div className="mb-4"><h2 className="font-display text-sm font-extrabold text-[var(--ea-primary)]">Finding</h2><p className="mt-1 text-xs text-[var(--ea-text-soft)]">Describe what the auditor identified and the evidence that supports it.</p></div>
          <div className="grid gap-5 md:grid-cols-2">
            <Field label="Finding Type" required><select required value={draft.findingType} onChange={(event) => setField("findingType", event.target.value as FindingType)} className={inputClass}>{findingTypes.map((item) => <option key={item}>{item}</option>)}</select></Field>
            <Field label="Clause"><Input value={draft.clause} onChange={(event) => setField("clause", event.target.value)} placeholder="e.g. 6.1.2" className={inputClass} /></Field>
            <div className="md:col-span-2"><Field label="Description" hint="What problem did the auditor identify?" required><textarea required rows={4} value={draft.description} onChange={(event) => setField("description", event.target.value)} className="ea-focus w-full rounded-lg border border-[var(--border)] bg-white px-3.5 py-3 text-sm text-[var(--ea-text)] focus:border-[var(--ea-accent)]" placeholder="Describe the issue found during the audit." /></Field></div>
            <div className="md:col-span-2"><Field label="Objective Evidence" hint="What evidence supports this finding?"><textarea rows={4} value={draft.objectiveEvidence} onChange={(event) => setField("objectiveEvidence", event.target.value)} className="ea-focus w-full rounded-lg border border-[var(--border)] bg-white px-3.5 py-3 text-sm text-[var(--ea-text)] focus:border-[var(--ea-accent)]" placeholder="Record the documents, observations, or samples that support the finding." /></Field></div>
            <Field label="Target / Due Date" required><Input required type="date" value={draft.targetDate} onChange={(event) => setField("targetDate", event.target.value)} /></Field>
          </div>
        </section>
        <div className="mt-7 flex flex-wrap justify-end gap-2 border-t border-[var(--border)] pt-5"><Button type="button" variant="outline" onClick={() => navigate(isEdit && findingId ? `/findings/${findingId}` : selectedAuditId ? `/audits/${selectedAuditId}` : "/findings")}>Cancel</Button><Button type="submit" loading={busy} disabled={!audit}><Save className="h-4 w-4" />{isEdit ? "Save finding" : "Create finding"}</Button></div>
      </Card>
    </form>
  </div>;
}
