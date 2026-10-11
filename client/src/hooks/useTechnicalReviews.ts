import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { technicalReviewRepository } from "@/services/repositories/technicalReviewRepository";
import type { TechnicalReviewActor, TechnicalReviewBundle, TechnicalReviewOptions } from "@/services/repositories/technicalReviewRepository";
import type { TechnicalReviewDecision, TechnicalReviewFilters, TechnicalReviewRecord, PaginatedTechnicalReviews } from "@/types/technicalReview";

const empty: PaginatedTechnicalReviews = { data: [], total: 0, page: 1, pageSize: 10, totalPages: 1 };
const emptyOptions: TechnicalReviewOptions = { companies: [], applications: [], audits: [], auditors: [], reviewers: [], certifications: [], findings: [], documents: [] };
export function useTechnicalReviewActor() {
  const { session, can } = useAuth();
  const actor: TechnicalReviewActor = { id: session?.user.id, name: session?.user.name, role: session?.user.role };
  return { actor, can };
}
export function useTechnicalReviews(filters: TechnicalReviewFilters = {}, enabled = true) {
  const { actor, can } = useTechnicalReviewActor();
  const allowed = enabled && (can("technical-reviews.view") || can("technicalReviews.view"));
  const [result, setResult] = useState<PaginatedTechnicalReviews>(empty);
  const [loading, setLoading] = useState(allowed);
  const [error, setError] = useState("");
  const load = useCallback(async () => {
    if (!allowed) { setResult(empty); setLoading(false); setError(""); return; }
    setLoading(true); setError("");
    try { setResult(await technicalReviewRepository.list(filters, actor)); }
    catch (e) { setError(e instanceof Error ? e.message : "Unable to load Technical Reviews."); }
    finally { setLoading(false); }
  }, [allowed, JSON.stringify(filters), actor.id, actor.name, actor.role]);
  useEffect(() => { void load(); }, [load]);
  return { ...result, loading, error, reload: load };
}
export function useTechnicalReview(id?: string, enabled = true) {
  const { actor, can } = useTechnicalReviewActor();
  const allowed = Boolean(id && enabled && (can("technical-reviews.view") || can("technicalReviews.view")));
  const [bundle, setBundle] = useState<TechnicalReviewBundle | null>(null);
  const [loading, setLoading] = useState(allowed);
  const [error, setError] = useState("");
  const load = useCallback(async () => {
    if (!allowed || !id) { setBundle(null); setLoading(false); setError(""); return; }
    setLoading(true); setError("");
    try { const next = await technicalReviewRepository.getBundle(id, actor); setBundle(next); if (!next) setError("Technical Review not found or not available to this account."); }
    catch (e) { setBundle(null); setError(e instanceof Error ? e.message : "Unable to load Technical Review."); }
    finally { setLoading(false); }
  }, [allowed, id, actor.id, actor.name, actor.role]);
  useEffect(() => { void load(); }, [load]);
  return { bundle, loading, error, reload: load };
}
export function useTechnicalReviewOptions(enabled = true) {
  const { actor, can } = useTechnicalReviewActor();
  const allowed = enabled && (can("technical-reviews.view") || can("technicalReviews.view"));
  const [options, setOptions] = useState<TechnicalReviewOptions>(emptyOptions);
  const [loading, setLoading] = useState(allowed);
  const [error, setError] = useState("");
  const load = useCallback(() => {
    if (!allowed) { setOptions(emptyOptions); setLoading(false); setError(""); return; }
    setLoading(true); setError("");
    try { setOptions(technicalReviewRepository.options(actor)); }
    catch (e) { setOptions(emptyOptions); setError(e instanceof Error ? e.message : "Unable to load source records."); }
    finally { setLoading(false); }
  }, [allowed, actor.id, actor.name, actor.role]);
  useEffect(() => { load(); }, [load]);
  return { options, loading, error, reload: load };
}
export function useTechnicalReviewActions() {
  const { actor } = useTechnicalReviewActor();
  const create = useCallback((input: Parameters<typeof technicalReviewRepository.create>[0]) => technicalReviewRepository.create(input, actor), [actor.id, actor.name, actor.role]);
  const update = useCallback((id: string, changes: Parameters<typeof technicalReviewRepository.update>[1]) => technicalReviewRepository.update(id, changes, actor), [actor.id, actor.name, actor.role]);
  const start = useCallback((id: string) => technicalReviewRepository.start(id, actor), [actor.id, actor.name, actor.role]);
  const decide = useCallback((id: string, decision: TechnicalReviewDecision, comments: string) => technicalReviewRepository.decide(id, decision, comments, actor), [actor.id, actor.name, actor.role]);
  const complete = useCallback((id: string) => technicalReviewRepository.complete(id, actor), [actor.id, actor.name, actor.role]);
  return { create, update, start, decide, complete };
}
