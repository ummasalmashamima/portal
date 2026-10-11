import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { notificationRepository } from "@/services/repositories/notificationRepository";
import { settingsRepository } from "@/services/repositories/settingsRepository";
import type { NotificationActor, NotificationFilters, NotificationRecord } from "@/types/notification";
export function useNotifications(filters: NotificationFilters = {}) {
  const { session } = useAuth(); const actor: NotificationActor = { id: session?.user.id, name: session?.user.name, role: session?.user.role };
  const [data, setData] = useState<NotificationRecord[]>([]); const [unread, setUnread] = useState(0); const [loading, setLoading] = useState(true); const [error, setError] = useState("");
  const load = useCallback(async () => { setLoading(true); setError(""); try { const [records, allRecords, profile] = await Promise.all([notificationRepository.list(filters, actor), notificationRepository.list({}, actor), session?.user ? settingsRepository.getProfile(session.user, actor) : Promise.resolve(null)]); const eligible = profile?.preferences.inApp ? records.filter((item) => profile.preferences.categories[item.category]) : []; const allEligible = profile?.preferences.inApp ? allRecords.filter((item) => profile.preferences.categories[item.category]) : []; setData(eligible); setUnread(allEligible.filter((item) => !item.isRead).length); } catch (e) { setError(e instanceof Error ? e.message : "Unable to load notifications."); } finally { setLoading(false); } }, [JSON.stringify(filters), actor.id, actor.role, actor.name, session?.user.id]);
  useEffect(() => { void load(); }, [load]);
  useEffect(() => { const refresh = () => { void load(); }; window.addEventListener("ea-notifications-updated", refresh); return () => window.removeEventListener("ea-notifications-updated", refresh); }, [load]);
  const markRead = useCallback(async (id: string, read = true) => { await notificationRepository.markRead(id, read, actor); await load(); }, [actor.id, actor.role, actor.name, load]);
  const markAllRead = useCallback(async () => { await notificationRepository.markAllRead(actor, filters); await load(); }, [actor.id, actor.role, actor.name, load]);
  return { data, unread, loading, error, reload: load, markRead, markAllRead };
}
