import { useRef, useState } from "react";
import { Check, Circle, FileText, Paperclip, UploadCloud } from "lucide-react";
import { Badge, Button, EmptyState, StatusBadge } from "@/components/ui/Primitives";
import { ActivityTimeline } from "@/components/ui/ActivityTimeline";
import type { ActivityRecord } from "@/types/activity";
import type { FindingDocument, FindingDocumentType, FindingRecord, FindingStatus, FindingStatusView } from "@/types/finding";

const stages: FindingStatus[] = ["Open", "CAP Submitted", "Under Review", "Accepted", "Closed"];
export function FindingStatusBadge({ status }: { status: FindingStatusView }) { return <StatusBadge status={status} />; }
export function FindingWorkflowTimeline({ status }: { status: FindingStatus }) {
  const activeStatus = status === "Correction Required" ? "Under Review" : status === "CAP Resubmitted" ? "CAP Submitted" : status;
  const current = Math.max(0, stages.indexOf(activeStatus as FindingStatus));
  return <div>
    <ol className="space-y-0">{stages.map((stage, index) => {
      const complete = index < current || status === "Closed";
      const active = stage === activeStatus && status !== "Closed";
      return <li key={stage} className="relative flex min-h-11 gap-3 pb-2 last:min-h-0 last:pb-0">
        {index < stages.length - 1 && <span className={`absolute left-[11px] top-6 h-[calc(100%-7px)] w-px ${complete ? "bg-[var(--ea-secondary)]" : "bg-[var(--border)]"}`} />}
        <span className={`relative z-10 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 ${complete || active ? "border-[var(--ea-secondary)] bg-[var(--ea-secondary)] text-white" : "border-[var(--border)] bg-white text-[var(--ea-text-soft)]"}`}>{complete ? <Check className="h-3 w-3" /> : <Circle className="h-2 w-2" />}</span>
        <div className="pt-1"><p className={`text-[11px] font-bold ${active ? "text-[var(--ea-primary)]" : "text-[var(--ea-text-soft)]"}`}>{stage}</p>{active && <p className="mt-0.5 text-[9px] text-[var(--ea-text-soft)]">Current step</p>}</div>
      </li>;
    })}</ol>
    {(status === "Correction Required" || status === "CAP Resubmitted") && <div className="ml-9 mt-2 rounded-lg bg-[var(--ea-warning-soft)] p-3"><Badge tone="gold">{status}</Badge><p className="mt-1.5 text-[10px] leading-4 text-[var(--ea-text-soft)]">{status === "Correction Required" ? "Update the CAP and submit it again for review." : "The updated CAP is ready for the reviewer."}</p></div>}
  </div>;
}

const documentTypes: FindingDocumentType[] = ["Objective Evidence", "Correction Evidence", "Root Cause Evidence", "Corrective Action Evidence", "Closure Evidence"];
export function FindingDocumentUploader({ finding, readOnly = false, onUpload }: { finding: FindingRecord; readOnly?: boolean; onUpload?: (document: { fileName: string; documentType: FindingDocumentType; description: string }) => void | Promise<void> }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [documentType, setDocumentType] = useState<FindingDocumentType>("Objective Evidence");
  const [description, setDescription] = useState("");
  const addFiles = (files: FileList | null) => {
    if (!files || !onUpload) return;
    Array.from(files).forEach((file) => void onUpload({ fileName: file.name, documentType, description: description.trim() || `${documentType} for ${finding.findingNumber}` }));
    if (inputRef.current) inputRef.current.value = "";
    setDescription("");
  };
  return <div>
    {!readOnly && <div className="rounded-xl border border-dashed border-[var(--ea-accent)] bg-[var(--ea-surface-soft)] p-4 sm:p-5">
      <div className="grid gap-3 sm:grid-cols-2"><label className="block"><span className="mb-1.5 block text-[10px] font-bold text-[var(--ea-text-soft)]">Evidence category</span><select value={documentType} onChange={(event) => setDocumentType(event.target.value as FindingDocumentType)} className="h-10 w-full rounded-lg border border-[var(--border)] bg-white px-3 text-xs">{documentTypes.map((item) => <option key={item}>{item}</option>)}</select></label><label className="block"><span className="mb-1.5 block text-[10px] font-bold text-[var(--ea-text-soft)]">Description</span><input value={description} onChange={(event) => setDescription(event.target.value)} className="h-10 w-full rounded-lg border border-[var(--border)] bg-white px-3 text-xs" placeholder="What does this evidence demonstrate?" /></label></div>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3"><p className="text-[10px] leading-4 text-[var(--ea-text-soft)]">Demo upload metadata only; each upload is appended as a new version record.</p><Button type="button" size="sm" onClick={() => inputRef.current?.click()}><UploadCloud className="h-3.5 w-3.5" />Add evidence</Button><input ref={inputRef} type="file" multiple className="hidden" onChange={(event) => addFiles(event.target.files)} /></div>
    </div>}
    {finding.documents.length ? <div className="mt-4 space-y-2">{finding.documents.map((document) => <FindingDocumentRow key={document.id} document={document} />)}</div> : <EmptyState title="No evidence documents" description={readOnly ? "No evidence documents have been recorded." : "Add objective, correction, root-cause, corrective-action or closure evidence."} />}
  </div>;
}
function FindingDocumentRow({ document }: { document: FindingDocument }) { return <div className="flex min-w-0 flex-wrap items-center gap-3 rounded-lg border border-[var(--border)] px-3 py-3"><FileText className="h-4 w-4 shrink-0 text-[var(--ea-secondary)]" /><div className="min-w-0 flex-1"><p className="truncate text-xs font-bold text-[var(--ea-text)]">{document.fileName}</p><p className="mt-1 flex flex-wrap items-center gap-1 text-[10px] text-[var(--ea-text-soft)]"><Paperclip className="h-3 w-3" />{document.documentType} · {document.version} · {document.uploadedBy} · {document.uploadDate}</p>{document.description && <p className="mt-1 text-[10px] leading-4 text-[var(--ea-text-soft)]">{document.description}</p>}</div><Badge tone="blue">{document.version}</Badge></div>; }

function historyLabel(description: string) {
  const labels: Record<string, string> = {
    "Submitted for Review": "CAP Submitted",
    "Reviewer Decision Changed: Accepted": "CAP Accepted",
    "Reviewer Decision Changed: Rejected": "Correction Requested",
    "Correction Required": "Correction Requested",
    "Reviewer Decision Changed: Closed": "Finding Closed",
    "Status Changed: Closed": "Finding Closed",
  };
  return labels[description] ?? description;
}
export function FindingHistory({ items }: { items: ActivityRecord[] }) { return items.length ? <ActivityTimeline items={items.map((item) => ({ ...item, description: historyLabel(item.description) }))} /> : <EmptyState title="No CAP history yet" description="Finding, submission, correction, evidence, and review actions will be recorded here." />; }
export function FindingInfo({ label, value }: { label: string; value: string }) { return <div className="min-w-0 rounded-lg bg-[var(--ea-surface-soft)] p-3.5"><p className="text-[9px] font-bold uppercase tracking-[.1em] text-[var(--ea-text-soft)]">{label}</p><p className="mt-1.5 break-words text-xs font-semibold leading-5 text-[var(--ea-text)]">{value || "—"}</p></div>; }
