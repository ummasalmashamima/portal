import { useRef } from "react";
import { Check, Circle, FileText, Paperclip, Trash2, UploadCloud } from "lucide-react";
import { Badge, Button, Card, EmptyState, StatusBadge } from "@/components/ui/Primitives";
import { ActivityTimeline } from "@/components/ui/ActivityTimeline";
import type { ActivityRecord } from "@/types/activity";
import type { AuditDocument, AuditFinding, AuditStatus } from "@/types/audit";

const auditStages: AuditStatus[] = ["Planned", "Assigned", "Scheduled", "In Progress", "Completed", "Report Pending", "Submitted", "Under Review"];
const stageTitle: Record<AuditStatus, string> = {
  Planned: "Planned", Assigned: "Assigned", Scheduled: "Scheduled", "In Progress": "Fieldwork in progress",
  Completed: "Fieldwork completed", "Report Pending": "Report pending", Submitted: "Report submitted", "Under Review": "Under review",
};

export function AuditStatusBadge({ status }: { status: string }) {
  return <StatusBadge status={status} />;
}

export function AuditStatusTimeline({ status }: { status: AuditStatus }) {
  const current = Math.max(0, auditStages.indexOf(status));
  return <ol className="space-y-0">
    {auditStages.map((stage, index) => {
      const complete = index <= current;
      const active = index === current;
      return <li key={stage} className="relative flex min-h-12 gap-3 pb-3 last:min-h-0 last:pb-0">
        {index < auditStages.length - 1 && <span className={`absolute left-[13px] top-7 h-[calc(100%-8px)] w-px ${index < current ? "bg-[var(--ea-secondary)]" : "bg-[var(--border)]"}`} />}
        <span className={`relative z-10 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 ${complete ? "border-[var(--ea-secondary)] bg-[var(--ea-secondary)] text-white" : "border-[var(--border)] bg-white text-[var(--ea-text-soft)]"}`}>{complete ? <Check className="h-3.5 w-3.5" /> : <Circle className="h-2.5 w-2.5" />}</span>
        <div className="pt-1"><p className={`text-xs font-bold ${active ? "text-[var(--ea-primary)]" : "text-[var(--ea-text-soft)]"}`}>{stageTitle[stage]}</p>{active && <p className="mt-1 text-[10px] text-[var(--ea-text-soft)]">Current status</p>}</div>
      </li>;
    })}
  </ol>;
}

export function AuditActivityTimeline({ items }: { items: ActivityRecord[] }) {
  return items.length ? <ActivityTimeline items={items} /> : <EmptyState title="No audit activity yet" description="Status changes, assignments, findings, document changes and report actions will appear here." />;
}

export function AuditDocumentUploader({ documents, readOnly = false, onAdd, onRemove }: { documents: AuditDocument[]; readOnly?: boolean; onAdd?: (document: AuditDocument) => void | Promise<void>; onRemove?: (id: string) => void | Promise<void> }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const addFiles = (files: FileList | null) => {
    if (!files || !onAdd) return;
    Array.from(files).forEach((file) => void onAdd({
      id: `audit-doc-${Date.now()}-${file.name}`,
      fileName: file.name,
      fileType: file.name.split(".").pop()?.toUpperCase() ?? "FILE",
      fileSize: `${Math.max(1, Math.round(file.size / 1024))} KB`,
      uploadDate: "Just now",
      uploadedBy: "Current user",
      category: "Audit Evidence",
      status: "Uploaded",
    }));
    if (inputRef.current) inputRef.current.value = "";
  };
  return <div>
    {!readOnly && <button type="button" onClick={() => inputRef.current?.click()} className="w-full rounded-xl border border-dashed border-[var(--ea-accent)] bg-[var(--ea-surface-soft)] p-5 text-center transition hover:bg-[var(--ea-accent-soft)]">
      <input ref={inputRef} type="file" multiple className="hidden" onChange={(event) => addFiles(event.target.files)} />
      <UploadCloud className="mx-auto h-6 w-6 text-[var(--ea-secondary)]" /><span className="mt-2 block text-xs font-bold text-[var(--ea-primary)]">Add audit document</span><span className="mt-1 block text-[10px] text-[var(--ea-text-soft)]">Mock upload metadata; storage integration can replace this repository operation.</span>
    </button>}
    {documents.length ? <div className="mt-4 space-y-2">{documents.map((document) => <div key={document.id} className="flex items-center gap-3 rounded-lg border border-[var(--border)] px-3 py-2.5"><FileText className="h-4 w-4 shrink-0 text-[var(--ea-secondary)]" /><div className="min-w-0 flex-1"><p className="truncate text-xs font-bold text-[var(--ea-text)]">{document.fileName}</p><p className="mt-1 flex items-center gap-1 text-[10px] text-[var(--ea-text-soft)]"><Paperclip className="h-3 w-3" />{document.category} · {document.fileType} · {document.fileSize} · {document.uploadDate}</p></div><Badge tone={document.status === "Accepted" ? "green" : "blue"}>{document.status}</Badge>{!readOnly && onRemove && <button type="button" onClick={() => void onRemove(document.id)} aria-label={`Remove ${document.fileName}`} className="rounded p-1 text-[var(--ea-text-soft)] hover:text-[var(--ea-danger)]"><Trash2 className="h-3.5 w-3.5" /></button>}</div>)}</div> : <EmptyState title="No audit documents" description={readOnly ? "No audit documents are attached yet." : "Add an audit plan, evidence file or supporting document."} />}
  </div>;
}

export function FindingCard({ finding, onView }: { finding: AuditFinding; onView?: () => void }) {
  const tone = finding.status === "Closed" ? "green" : finding.findingType.includes("Nonconformity") ? "gold" : "blue";
  return <Card className="p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div><div className="flex flex-wrap items-center gap-2"><Badge tone={tone}>{finding.findingType}</Badge><StatusBadge status={finding.status} />{finding.clause && <span className="text-[10px] font-bold text-[var(--ea-text-soft)]">Clause {finding.clause}</span>}</div><p className="mt-3 text-sm font-bold leading-6 text-[var(--ea-primary)]">{finding.description}</p></div><div className="flex items-center gap-3">{finding.dueDate && <span className="text-[10px] text-[var(--ea-text-soft)]">Due {finding.dueDate}</span>}{onView && <Button variant="ghost" size="sm" onClick={onView}>View CAP</Button>}</div></div>{finding.evidence && <p className="mt-3 text-xs leading-5 text-[var(--ea-text-soft)]"><strong className="text-[var(--ea-text)]">Evidence:</strong> {finding.evidence}</p>}{finding.correctiveAction && <p className="mt-2 text-xs leading-5 text-[var(--ea-text-soft)]"><strong className="text-[var(--ea-text)]">Corrective action:</strong> {finding.correctiveAction}</p>}</Card>;
}
