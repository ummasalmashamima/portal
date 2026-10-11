import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { reportRepository } from "@/services/repositories/reportRepository";
import type { ExportFormat, GeneratedReportRecord, ReportActor, ReportDefinition, ReportId, ReportParameters } from "@/types/report";
export function useReports() {
  const { session } = useAuth(); const actor: ReportActor = { id: session?.user.id, name: session?.user.name, role: session?.user.role };
  const [catalog, setCatalog] = useState<ReportDefinition[]>([]); const [history, setHistory] = useState<GeneratedReportRecord[]>([]); const [loading, setLoading] = useState(true); const [error, setError] = useState("");
  const load = useCallback(async () => { setLoading(true); setError(""); try { const [reports, runs] = await Promise.all([reportRepository.catalog(actor), reportRepository.listHistory(actor)]); setCatalog(reports); setHistory(runs); } catch (e) { setError(e instanceof Error ? e.message : "Unable to load reports."); } finally { setLoading(false); } }, [actor.id, actor.role, actor.name]);
  useEffect(() => { void load(); }, [load]);
  const run = useCallback(async (id: ReportId, params: ReportParameters) => { const result = await reportRepository.run(id, params, actor); await load(); return result; }, [actor.id, actor.role, actor.name, load]);
  const exportRun = useCallback(async (id: string, format: ExportFormat) => { const result = await reportRepository.export(id, format, actor); await load(); return result; }, [actor.id, actor.role, actor.name, load]);
  return { catalog, history, loading, error, reload: load, run, exportRun };
}
export function useReportRun(id?: string) {
  const { session } = useAuth(); const actor: ReportActor = { id: session?.user.id, name: session?.user.name, role: session?.user.role };
  const [run, setRun] = useState<GeneratedReportRecord | null>(null); const [loading, setLoading] = useState(Boolean(id)); const [error, setError] = useState("");
  const load = useCallback(async () => { if (!id) { setRun(null); setLoading(false); return; } setLoading(true); setError(""); try { setRun(await reportRepository.getRun(id, actor)); } catch (e) { setError(e instanceof Error ? e.message : "Unable to load generated report."); } finally { setLoading(false); } }, [id, actor.id, actor.role, actor.name]);
  useEffect(() => { void load(); }, [load]); return { run, loading, error, reload: load };
}
