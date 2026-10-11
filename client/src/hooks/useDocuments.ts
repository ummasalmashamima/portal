import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { documentRepository } from "@/services/repositories/documentRepository";
import { activityRepository } from "@/services/repositories/activityRepository";
import type { DocumentActor, DocumentFilters, DocumentRecord, DocumentUploadInput, PaginatedDocuments } from "@/types/document";

const empty: PaginatedDocuments = { data: [], total: 0, page: 1, pageSize: 10, totalPages: 0 };
export function useDocuments(filters: DocumentFilters = {}) {
  const { session } = useAuth(); const actor: DocumentActor = { id: session?.user.id, name: session?.user.name, role: session?.user.role };
  const [result, setResult] = useState<PaginatedDocuments>(empty); const [loading, setLoading] = useState(true); const [error, setError] = useState("");
  const load = useCallback(async () => { setLoading(true); setError(""); try { setResult(await documentRepository.list(filters, actor)); } catch (e) { setError(e instanceof Error ? e.message : "Unable to load documents."); } finally { setLoading(false); } }, [JSON.stringify(filters), actor.id, actor.role, actor.name]);
  useEffect(() => { void load(); }, [load]);
  return { ...result, loading, error, reload: load };
}
export function useDocument(id?: string) {
  const { session } = useAuth(); const actor: DocumentActor = { id: session?.user.id, name: session?.user.name, role: session?.user.role };
  const [document, setDocument] = useState<DocumentRecord | null>(null); const [loading, setLoading] = useState(Boolean(id)); const [error, setError] = useState("");
  const [history, setHistory] = useState<import("@/types/activity").ActivityRecord[]>([]);
  const load = useCallback(async () => { if (!id) { setDocument(null); setLoading(false); return; } setLoading(true); setError(""); try { const [item, events] = await Promise.all([documentRepository.getById(id, actor), activityRepository.listByEntity("document", id)]); setDocument(item); setHistory(events); } catch (e) { setError(e instanceof Error ? e.message : "Unable to load document."); } finally { setLoading(false); } }, [id, actor.id, actor.role, actor.name]);
  useEffect(() => { void load(); }, [load]);
  const upload = useCallback((input: DocumentUploadInput) => documentRepository.upload(input, actor), [actor.id, actor.role, actor.name]);
  const uploadVersion = useCallback((input: Parameters<typeof documentRepository.uploadVersion>[1]) => id ? documentRepository.uploadVersion(id, input, actor) : Promise.reject(new Error("Document ID is required.")), [id, actor.id, actor.role, actor.name]);
  const approve = useCallback(() => id ? documentRepository.approve(id, actor) : Promise.reject(new Error("Document ID is required.")), [id, actor.id, actor.role]);
  const download = useCallback(() => id ? documentRepository.download(id, actor) : Promise.reject(new Error("Document ID is required.")), [id, actor.id, actor.role, actor.name]);
  const archive = useCallback(() => id ? documentRepository.archive(id, actor) : Promise.reject(new Error("Document ID is required.")), [id, actor.id, actor.role, actor.name]);
  return { document, history, loading, error, reload: load, upload, uploadVersion, approve, download, archive, actor };
}
export function useDocumentOptions(type: import("@/types/document").DocumentEntityType) {
  const { session } = useAuth(); const actor: DocumentActor = { id: session?.user.id, name: session?.user.name, role: session?.user.role };
  const [options, setOptions] = useState<import("@/services/repositories/documentRepository").DocumentRelatedOption[]>([]); const [loading, setLoading] = useState(true);
  useEffect(() => { let active = true; setLoading(true); void documentRepository.relatedOptions(type, actor).then((items) => { if (active) setOptions(items); }).catch(() => { if (active) setOptions([]); }).finally(() => { if (active) setLoading(false); }); return () => { active = false; }; }, [type, actor.id, actor.role, actor.name]);
  return { options, loading };
}
