import { useEffect, useState } from "react";
import { Activity, RefreshCw } from "lucide-react";
import { Button, Card, EmptyState, ErrorState, LoadingState } from "@/components/ui/Primitives";
import { PageHeader } from "@/components/ui/Enterprise";
import { ActivityTimeline } from "@/components/ui/ActivityTimeline";
import { useAuth } from "@/contexts/AuthContext";
import { customerCompanyId } from "@/features/findings/access";
import { activityRepository } from "@/services/repositories/activityRepository";
import { technicalReviewRepository } from "@/services/repositories/technicalReviewRepository";
import type { ActivityEntityType, ActivityRecord } from "@/types/activity";

const entityFilters: (ActivityEntityType | "all")[] = ["all", "company", "application", "audit", "finding", "technical_review", "certification", "certificate", "renewal", "document", "report", "notification", "setting", "user"];

export function ActivityHistoryPage() {
  const { session } = useAuth();
  const companyId = customerCompanyId(session);
  const isCustomer = session?.user.role === "Customer";
  const isTechnicalReviewer = session?.user.role === "Technical Reviewer";
  const hiddenCustomerEntities: ActivityEntityType[] = ["technical_review", "certification", "renewal", "report", "notification", "setting", "user"];
  const visibleEntityFilters = isCustomer ? entityFilters.filter((type) => type === "all" || !hiddenCustomerEntities.includes(type)) : entityFilters;
  const [items, setItems] = useState<ActivityRecord[]>([]);
  const [entityType, setEntityType] = useState<ActivityEntityType | "all">("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const load = async () => {
    setLoading(true); setError("");
    try {
      const filters = { ...(entityType === "all" ? {} : { entityType }), ...(isCustomer ? { companyId } : {}) };
      const records = isTechnicalReviewer
        ? await technicalReviewRepository.listActivity(filters, { id: session?.user.id, name: session?.user.name, role: session?.user.role })
        : await activityRepository.list(filters);
      setItems(isCustomer ? records.filter((item) => !hiddenCustomerEntities.includes(item.entityType) && !(item.entityType === "document" && item.metadata.relatedEntityType === "technical_review")) : records);
    }
    catch { setError("Unable to load activity history. Please try again."); }
    finally { setLoading(false); }
  };
  useEffect(() => { void load(); }, [entityType, companyId, isCustomer, isTechnicalReviewer, session?.user.id, session?.user.name, session?.user.role]);
  return <div className="mx-auto max-w-[1200px]">
    <PageHeader eyebrow="Workspace history" title="Activity History" description="A chronological, entity-scoped log. Customer activity is limited to records linked to their company." actions={<Button variant="outline" size="sm" onClick={() => void load()} loading={loading}><RefreshCw className="h-3.5 w-3.5" />Refresh</Button>} />
      <Card className="mt-6 p-4 sm:p-6"><div className="flex flex-wrap items-center justify-between gap-3"><div className="flex items-center gap-2"><Activity className="h-4 w-4 text-[var(--ea-secondary)]" /><p className="text-xs font-bold text-[var(--ea-primary)]">Central activity log</p><span className="rounded-full bg-[var(--ea-surface-soft)] px-2 py-1 text-[10px] font-bold text-[var(--ea-text-soft)]">{items.length} events</span></div><label className="flex items-center gap-2 text-[10px] font-bold text-[var(--ea-text-soft)]">Entity <select value={entityType} onChange={(event) => setEntityType(event.target.value as ActivityEntityType | "all")} className="h-9 rounded-lg border border-[var(--border)] bg-white px-2.5 text-xs text-[var(--ea-text)]">{visibleEntityFilters.map((type) => <option key={type} value={type}>{type === "all" ? "All activity" : type.replaceAll("_", " ").replace(/^./, (letter) => letter.toUpperCase())}</option>)}</select></label></div>
      <div className="mt-5 border-t border-[var(--border)] pt-5">{loading ? <LoadingState /> : error ? <><ErrorState message={error} /><Button className="mt-4" size="sm" onClick={() => void load()}>Try again</Button></> : items.length ? <ActivityTimeline items={items} /> : <EmptyState title="No activity found" description="Events will appear here as records are created and workflow actions are completed." />}</div>
    </Card>
  </div>;
}
