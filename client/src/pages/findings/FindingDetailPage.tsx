import { useEffect, useState } from "react";
import { ArrowLeft, ArrowUpRight, CheckCircle2, Send, ShieldCheck } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { Button, Card, ErrorState, Field, Input, LoadingState, StatusBadge } from "@/components/ui/Primitives";
import { PageHeader, Tabs } from "@/components/ui/Enterprise";
import { FindingDocumentUploader, FindingHistory, FindingInfo, FindingStatusBadge, FindingWorkflowTimeline } from "@/features/findings/FindingComponents";
import { assignedAuditorId, auditorAssignedToAudit, customerCompanyId } from "@/features/findings/access";
import { useFinding } from "@/hooks/useFindings";
import { findingRepository, effectiveFindingStatus } from "@/services/repositories/findingRepository";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import type { FindingUpdate } from "@/types/finding";

function actor(session: ReturnType<typeof useAuth>["session"]) { return { id: session?.user.id, name: session?.user.name, role: session?.user.role }; }
function dateLabel(value?: string) { if (!value) return "Not recorded"; const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/); const date = match ? new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3])) : new Date(value); return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }); }
type CapDraft = Pick<FindingUpdate, "correction" | "rootCause" | "correctiveAction" | "responsiblePerson" | "responsiblePersonId" | "targetDate" | "evidenceOfClosure">;
const emptyCapDraft: CapDraft = { correction: "", rootCause: "", correctiveAction: "", responsiblePerson: "", responsiblePersonId: undefined, targetDate: "", evidenceOfClosure: "" };
const textAreaClass = "ea-focus w-full rounded-lg border border-[var(--border)] bg-white px-3.5 py-3 text-sm leading-5 text-[var(--ea-text)] focus:border-[var(--ea-accent)]";

export function FindingDetailPage() {
  const { findingId } = useParams();
  const navigate = useNavigate();
  const { can, session } = useAuth();
  const { showToast } = useToast();
  const access = { companyId: customerCompanyId(session), assignedAuditorId: assignedAuditorId(session) };
  const { finding, audit, application, company, history, loading, error, reload } = useFinding(findingId, access);
  const [activeTab, setActiveTab] = useState("finding");
  const [capDraft, setCapDraft] = useState<CapDraft>(emptyCapDraft);
  const [reviewComments, setReviewComments] = useState("");
  const [busy, setBusy] = useState(false);
  const canManageFinding = can("findings.manage") && auditorAssignedToAudit(session, audit);
  const isCustomer = session?.user.role === "Customer" && can("findings.view");
  const canSubmitCAP = canManageFinding || isCustomer;
  const canReview = can("findings.review");
  const canClose = can("findings.close") || canReview;

  useEffect(() => {
    if (!finding) return;
    setCapDraft({ correction: finding.correction, rootCause: finding.rootCause, correctiveAction: finding.correctiveAction, responsiblePerson: finding.responsiblePerson, responsiblePersonId: finding.responsiblePersonId, targetDate: finding.targetDate, evidenceOfClosure: finding.evidenceOfClosure });
    setReviewComments(finding.reviewerComments);
  }, [finding]);

  if (!can("findings.view")) return <div className="mx-auto max-w-2xl"><ErrorState message="Findings are not available for this demo role." /><Button className="mt-4" variant="outline" onClick={() => navigate("/dashboard")}>Return to dashboard</Button></div>;
  if (loading) return <LoadingState />;
  if (error || !finding || !audit || !application || !company) return <div className="mx-auto max-w-2xl"><ErrorState message={error ?? "Finding or a linked record could not be loaded."} /><Button className="mt-4" variant="outline" onClick={() => navigate("/findings")}>Back to Findings & CAP</Button></div>;

  const currentStatus = effectiveFindingStatus(finding);
  const canEditCAP = canSubmitCAP && ["Open", "Correction Required"].includes(finding.status);
  const canEditClosureEvidence = canSubmitCAP && finding.status === "Accepted";
  const canUploadEvidence = can("documents.upload") && finding.status !== "Closed";
  const reviewTabs = [{ key: "finding", label: "Finding" }, { key: "cap", label: "Corrective Action Plan" }, { key: "review", label: "Review" }];
  const setCapField = <K extends keyof CapDraft>(key: K, value: CapDraft[K]) => setCapDraft((current) => ({ ...current, [key]: value }));
  const updatesForCAP = (): FindingUpdate => ({
    ...(canEditCAP ? { correction: capDraft.correction, rootCause: capDraft.rootCause, correctiveAction: capDraft.correctiveAction, responsiblePerson: capDraft.responsiblePerson, responsiblePersonId: capDraft.responsiblePersonId, targetDate: capDraft.targetDate } : {}),
    ...(canEditClosureEvidence ? { evidenceOfClosure: capDraft.evidenceOfClosure } : {}),
  });
  const saveCAP = async () => {
    setBusy(true);
    try { await findingRepository.update(finding.id, updatesForCAP(), actor(session)); showToast("CAP details saved. Changes are recorded in history."); await reload(); }
    catch (reason) { showToast(reason instanceof Error ? reason.message : "Unable to save CAP details."); }
    finally { setBusy(false); }
  };
  const submitCAP = async () => {
    if (!(capDraft.correction ?? "").trim() || !(capDraft.rootCause ?? "").trim() || !(capDraft.correctiveAction ?? "").trim() || !capDraft.targetDate) { showToast("Complete the correction, root cause, corrective action, and target date before submitting."); return; }
    const nextStatus = finding.status === "Correction Required" ? "CAP Resubmitted" : "CAP Submitted";
    setBusy(true);
    try {
      await findingRepository.update(finding.id, updatesForCAP(), actor(session));
      await findingRepository.transition(finding.id, nextStatus, actor(session));
      showToast(nextStatus === "CAP Resubmitted" ? "CAP resubmitted for review." : "CAP submitted for review.");
      await reload();
    } catch (reason) { showToast(reason instanceof Error ? reason.message : "Unable to submit this CAP."); }
    finally { setBusy(false); }
  };
  const startReview = async () => {
    setBusy(true);
    try { await findingRepository.transition(finding.id, "Under Review", actor(session)); showToast("CAP moved to review."); await reload(); }
    catch (reason) { showToast(reason instanceof Error ? reason.message : "Unable to start the CAP review."); }
    finally { setBusy(false); }
  };
  const acceptCAP = async () => {
    setBusy(true);
    try { await findingRepository.recordDecision(finding.id, "Accepted", reviewComments, actor(session)); showToast("CAP accepted."); await reload(); }
    catch (reason) { showToast(reason instanceof Error ? reason.message : "Unable to accept this CAP."); }
    finally { setBusy(false); }
  };
  const requestCorrection = async () => {
    if (!reviewComments.trim()) { showToast("Add a reviewer comment explaining what needs correction."); return; }
    setBusy(true);
    try { await findingRepository.requestCorrection(finding.id, reviewComments, actor(session)); showToast("Correction requested. The previous history is retained."); await reload(); }
    catch (reason) { showToast(reason instanceof Error ? reason.message : "Unable to request a correction."); }
    finally { setBusy(false); }
  };
  const closeFinding = async () => {
    setBusy(true);
    try { await findingRepository.recordDecision(finding.id, "Closed", reviewComments, actor(session)); showToast("Finding closed."); await reload(); }
    catch (reason) { showToast(reason instanceof Error ? reason.message : "Add closure evidence before closing this finding."); }
    finally { setBusy(false); }
  };
  const addEvidence = async (document: { fileName: string; documentType: import("@/types/finding").FindingDocumentType; description: string }) => {
    setBusy(true);
    try { await findingRepository.addDocument(finding.id, document, actor(session)); showToast("Evidence added to the finding history."); await reload(); }
    catch (reason) { showToast(reason instanceof Error ? reason.message : "Unable to add evidence."); }
    finally { setBusy(false); }
  };
  const closureEvidenceExists = Boolean(finding.evidenceOfClosure.trim() || finding.documents.some((document) => document.documentType === "Closure Evidence"));

  return <div className="mx-auto max-w-[1300px]">
    <button onClick={() => navigate("/findings")} className="mb-5 inline-flex items-center gap-2 text-xs font-bold text-[var(--ea-secondary)] hover:text-[var(--ea-primary)]"><ArrowLeft className="h-3.5 w-3.5" />Back to Findings & CAP</button>
    <PageHeader eyebrow="Finding & corrective action" title={finding.findingNumber} description={`${company.legalName} · ${audit.auditNumber} · ${finding.standard}`} actions={<>{canManageFinding && <Button variant="outline" size="sm" onClick={() => navigate(`/findings/${finding.id}/edit`)}>Edit Finding</Button>}<Button variant="outline" size="sm" onClick={() => navigate(`/audits/${audit.id}`)}>Open Audit <ArrowUpRight className="h-3.5 w-3.5" /></Button></>} />
    <Card className="mt-6 p-4 sm:p-5"><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <FindingInfo label="Finding Number" value={finding.findingNumber} />
      <FindingInfo label="Finding Type" value={finding.findingType} />
      <FindingInfo label="Company" value={company.legalName} />
      <FindingInfo label="Audit" value={audit.auditNumber} />
      <FindingInfo label="Standard" value={finding.standard} />
      <div className="min-w-0 rounded-lg bg-[var(--ea-surface-soft)] p-3.5"><p className="text-[9px] font-bold uppercase tracking-[.1em] text-[var(--ea-text-soft)]">Current CAP Status</p><div className="mt-2 flex flex-wrap gap-1.5"><FindingStatusBadge status={finding.status} />{currentStatus === "Overdue" && <StatusBadge status="Overdue" />}</div></div>
      <FindingInfo label="Due Date" value={dateLabel(finding.targetDate)} />
    </div></Card>
    <Card className="mt-5 overflow-hidden"><div className="px-3 sm:px-5"><Tabs active={activeTab} onChange={setActiveTab} tabs={reviewTabs} /></div><div className="p-5 sm:p-7">
      {activeTab === "finding" && <section><div className="mb-5"><h2 className="font-display text-sm font-extrabold text-[var(--ea-primary)]">Finding</h2><p className="mt-1 text-xs text-[var(--ea-text-soft)]">What problem or issue was found during the audit?</p></div><div className="grid gap-4 sm:grid-cols-2"><FindingInfo label="Finding Type" value={finding.findingType} /><FindingInfo label="Clause" value={finding.clause || "Not recorded"} /><div className="sm:col-span-2"><FindingInfo label="Description" value={finding.description} /></div><div className="sm:col-span-2"><FindingInfo label="Objective Evidence" value={finding.objectiveEvidence || "No evidence description recorded."} /></div></div></section>}
      {activeTab === "cap" && <section><div className="mb-5"><h2 className="font-display text-sm font-extrabold text-[var(--ea-primary)]">Corrective Action Plan</h2><p className="mt-1 text-xs text-[var(--ea-text-soft)]">Explain the immediate correction, the cause, and how the problem will be prevented from happening again.</p></div>
        <div className="grid gap-5 md:grid-cols-2">
          <div><Field label="Correction" hint="What immediate action was taken?"><textarea disabled={!canEditCAP} rows={3} value={capDraft.correction ?? ""} onChange={(event) => setCapField("correction", event.target.value)} className={`${textAreaClass} disabled:bg-[var(--ea-surface-soft)]`} placeholder="Describe the immediate fix." /></Field></div>
          <div><Field label="Root Cause" hint="Why did this problem happen?"><textarea disabled={!canEditCAP} rows={3} value={capDraft.rootCause ?? ""} onChange={(event) => setCapField("rootCause", event.target.value)} className={`${textAreaClass} disabled:bg-[var(--ea-surface-soft)]`} placeholder="Explain the underlying cause." /></Field></div>
          <div className="md:col-span-2"><Field label="Corrective Action" hint="What will be done to prevent it from happening again?"><textarea disabled={!canEditCAP} rows={4} value={capDraft.correctiveAction ?? ""} onChange={(event) => setCapField("correctiveAction", event.target.value)} className={`${textAreaClass} disabled:bg-[var(--ea-surface-soft)]`} placeholder="Describe the action and how it will prevent recurrence." /></Field></div>
          <Field label="Responsible Person"><Input disabled={!canEditCAP} value={capDraft.responsiblePerson ?? ""} onChange={(event) => setCapDraft((current) => ({ ...current, responsiblePerson: event.target.value, responsiblePersonId: event.target.value === finding.responsiblePerson ? finding.responsiblePersonId : undefined }))} placeholder="Name of the person responsible" /></Field>
          <Field label="Target Date" required><Input disabled={!canEditCAP} type="date" value={capDraft.targetDate ?? ""} onChange={(event) => setCapField("targetDate", event.target.value)} /></Field>
          <div className="md:col-span-2"><Field label="Closure Evidence" hint="Upload or describe evidence that the corrective action was completed."><textarea disabled={!canEditCAP && !canEditClosureEvidence} rows={3} value={capDraft.evidenceOfClosure ?? ""} onChange={(event) => setCapField("evidenceOfClosure", event.target.value)} className={`${textAreaClass} disabled:bg-[var(--ea-surface-soft)]`} placeholder="Describe the evidence that confirms the action is complete." /></Field></div>
        </div>
        {(canEditCAP || canEditClosureEvidence) && <div className="mt-5 flex flex-wrap justify-end gap-2 border-t border-[var(--border)] pt-5"><Button variant="outline" loading={busy} onClick={() => void saveCAP()}>Save CAP</Button>{canEditCAP && <Button loading={busy} onClick={() => void submitCAP()}><Send className="h-4 w-4" />{finding.status === "Correction Required" ? "Resubmit CAP" : "Submit CAP"}</Button>}</div>}
        <div className="mt-6 border-t border-[var(--border)] pt-5"><h3 className="text-xs font-bold text-[var(--ea-primary)]">Evidence</h3><p className="mt-1 mb-4 text-[10px] leading-4 text-[var(--ea-text-soft)]">Upload supporting evidence for the finding or corrective action. Uploads are appended to the shared record.</p><FindingDocumentUploader finding={finding} readOnly={!canUploadEvidence} onUpload={canUploadEvidence ? addEvidence : undefined} /></div>
      </section>}
      {activeTab === "review" && <section><div className="mb-5"><h2 className="font-display text-sm font-extrabold text-[var(--ea-primary)]">Review</h2><p className="mt-1 text-xs text-[var(--ea-text-soft)]">A reviewer checks the CAP, requests corrections if needed, and closes the finding after evidence is accepted.</p></div>
        <div className="grid gap-3 sm:grid-cols-2"><FindingInfo label="CAP Status" value={finding.status} /><FindingInfo label="Reviewer" value={finding.reviewer ?? "Not assigned"} /><FindingInfo label="Review Date" value={dateLabel(finding.decisionDate)} /><div className="sm:col-span-2"><FindingInfo label="Reviewer Comments" value={finding.reviewerComments || "No reviewer comments recorded."} /></div></div>
        <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px]"><div>
          {canReview && finding.status === "Under Review" && <div className="mb-5"><Field label="Reviewer Comments" hint="Explain the decision or what needs to change."><textarea value={reviewComments} onChange={(event) => setReviewComments(event.target.value)} rows={3} className={textAreaClass} placeholder="Add clear comments for the company." /></Field><div className="mt-3 flex flex-wrap justify-end gap-2"><Button variant="outline" loading={busy} onClick={() => void requestCorrection()}>Request Correction</Button><Button loading={busy} onClick={() => void acceptCAP()}><ShieldCheck className="h-4 w-4" />Accept CAP</Button></div></div>}
          {canReview && ["CAP Submitted", "CAP Resubmitted"].includes(finding.status) && <Button loading={busy} onClick={() => void startReview()}><CheckCircle2 className="h-4 w-4" />Start CAP Review</Button>}
          {canClose && finding.status === "Accepted" && <div className="rounded-lg bg-[var(--ea-surface-soft)] p-4"><p className="text-xs font-bold text-[var(--ea-primary)]">Ready to close</p><p className="mt-1 text-[10px] leading-4 text-[var(--ea-text-soft)]">Closure evidence must be recorded before the finding can be closed.</p>{!closureEvidenceExists && <p className="mt-2 text-[10px] font-bold text-[var(--ea-warning)]">Add closure evidence in the Corrective Action Plan section first.</p>}<div className="mt-3 flex justify-end"><Button disabled={!closureEvidenceExists} loading={busy} onClick={() => void closeFinding()}><CheckCircle2 className="h-4 w-4" />Close Finding</Button></div></div>}
          <div className="mt-6"><p className="mb-3 text-xs font-bold text-[var(--ea-primary)]">Finding History</p><p className="mb-4 text-[10px] text-[var(--ea-text-soft)]">History is append-only. Each submission, review, correction, and closure remains recorded.</p><FindingHistory items={history} /></div>
        </div><div className="rounded-xl border border-[var(--border)] bg-[var(--ea-surface-soft)] p-4"><p className="mb-3 text-[10px] font-bold uppercase tracking-[.14em] text-[var(--ea-secondary)]">Simple workflow</p><FindingWorkflowTimeline status={finding.status} /></div></div>
      </section>}
    </div></Card>
  </div>;
}
