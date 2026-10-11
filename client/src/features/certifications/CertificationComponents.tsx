import type { ReactNode } from "react";
import { Check, Circle, Clock3 } from "lucide-react";
import { Link } from "react-router-dom";
import { Card, StatusBadge } from "@/components/ui/Primitives";
import type { CertificationStatus } from "@/types/certification";

export const lifecycleSelectClass = "h-10 rounded-lg border border-[var(--border)] bg-white px-3 text-xs font-semibold text-[var(--ea-text)]";
export function SectionHeading({ title, description, action }: { title: string; description?: string; action?: ReactNode }) { return <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="font-display text-sm font-extrabold text-[var(--ea-primary)]">{title}</h2>{description && <p className="mt-1 text-xs text-[var(--ea-text-soft)]">{description}</p>}</div>{action}</div>; }
export function LinkedRecord({ to, children }: { to?: string; children: ReactNode }) { return to ? <Link to={to} className="font-bold text-[var(--ea-secondary)] hover:text-[var(--ea-primary)] hover:underline">{children}</Link> : <span className="font-semibold text-[var(--ea-text)]">{children}</span>; }
export function LifecycleStepper({ status }: { status: CertificationStatus }) {
  const steps = ["Application & Audit", "Technical Review", "Certification Review", "Decision", "Certificate", "Active Portfolio"];
  const progress: Record<CertificationStatus, number> = { "In Process": 1, "Certification Review": 2, "Decision Pending": 3, Approved: 4, Conditional: 4, "Certificate Generation": 4, Active: 5, Suspended: 5, Withdrawn: 5, Expired: 5, Renewed: 5, "Returned for Correction": 2, Rejected: 3 };
  const current = progress[status];
  return <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-6">{steps.map((label, index) => { const done = index < current; const active = index === current; return <div key={label} className={`flex items-start gap-2 rounded-lg border p-3 ${active ? "border-[var(--ea-accent)] bg-[var(--ea-accent-soft)]" : done ? "border-[var(--ea-success-soft)] bg-[var(--ea-success-soft)]/40" : "border-[var(--border)] bg-white"}`}><span className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${done ? "bg-[var(--ea-success)] text-white" : active ? "bg-[var(--ea-primary)] text-white" : "bg-[var(--ea-surface-soft)] text-[var(--ea-text-soft)]"}`}>{done ? <Check className="h-3 w-3" /> : active ? <Clock3 className="h-3 w-3" /> : <Circle className="h-2.5 w-2.5" />}</span><span className={`text-[10px] font-bold leading-4 ${active || done ? "text-[var(--ea-primary)]" : "text-[var(--ea-text-soft)]"}`}>{label}</span></div>; })}</div>;
}
export function StatusCard({ label, status, value }: { label: string; status: string; value?: string }) { return <Card className="p-4"><p className="text-[10px] font-bold uppercase tracking-[.12em] text-[var(--ea-text-soft)]">{label}</p><div className="mt-2 flex flex-wrap items-center justify-between gap-2"><StatusBadge status={status} />{value && <span className="text-[10px] text-[var(--ea-text-soft)]">{value}</span>}</div></Card>; }
