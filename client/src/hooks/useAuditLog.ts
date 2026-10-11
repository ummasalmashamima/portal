import { useCallback, useEffect, useState } from "react";
import { activityRepository } from "@/services/repositories/activityRepository";
import type { ActivityRecord } from "@/types/activity";

export function useAuditLog(enabled = true) {
  const [data, setData] = useState<ActivityRecord[]>([]); const [loading, setLoading] = useState(true); const [error, setError] = useState("");
  const reload = useCallback(async () => { if (!enabled) { setData([]); setLoading(false); return; } setLoading(true); setError(""); try { setData(await activityRepository.list()); } catch (e) { setError(e instanceof Error ? e.message : "Unable to load activity audit history."); } finally { setLoading(false); } }, [enabled]);
  useEffect(() => { void reload(); }, [reload]);
  return { data, loading, error, reload };
}
