import { mockNotifications } from "@/data/mockNotifications";
import { rolePermissions } from "@/data/navigation";
import { activityRepository } from "@/services/repositories/activityRepository";
import type { NotificationActor, NotificationFilters, NotificationRecord } from "@/types/notification";
import type { UserRole } from "@/types/auth";
import { getCurrentCustomerCompanyId } from "./customerScope";

const store = mockNotifications as NotificationRecord[];
const readOverrides = new Map<string, boolean>();
let sequence = 1;
function hasView(actor: NotificationActor) { return Boolean(actor.role && rolePermissions[actor.role].includes("notifications.view")); }
function assertView(actor: NotificationActor) { if (!hasView(actor)) throw new Error("Notification visibility permission is required."); }
function key(userId: string | undefined, id: string) { return `${userId ?? "anonymous"}:${id}`; }
function actorEvent(actor: NotificationActor) { return { performedBy: actor.id, performedByName: actor.name, role: actor.role }; }
function accessible(item: NotificationRecord, actor: NotificationActor) {
  if (actor.role === "Super Admin") return true;
  if (!actor.role || !item.recipientRoles.includes(actor.role)) return false;
  if (item.recipientUserIds?.length && actor.id && !item.recipientUserIds.includes(actor.id) && actor.role !== "Director / Management") return false;
  if (actor.role === "Customer") {
    const companyId = getCurrentCustomerCompanyId();
    if (!companyId || item.companyId !== companyId) return false;
  }
  return true;
}
function withRead(item: NotificationRecord, actor: NotificationActor): NotificationRecord { return { ...item, recipientRoles: [...item.recipientRoles], recipientUserIds: item.recipientUserIds ? [...item.recipientUserIds] : undefined, isRead: readOverrides.get(key(actor.id, item.id)) ?? item.isRead }; }
export const notificationRepository = {
  async list(filters: NotificationFilters = {}, actor: NotificationActor): Promise<NotificationRecord[]> {
    assertView(actor);
    return store.filter((item) => accessible(item, actor)).map((item) => withRead(item, actor)).filter((item) => {
      const text = [item.title, item.description, item.relatedRecord, item.triggeredBy].join(" ");
      return (!filters.category || filters.category === "All" || item.category === filters.category)
        && (!filters.readState || filters.readState === "All" || (filters.readState === "Unread" ? !item.isRead : item.isRead))
        && (!filters.search || text.toLowerCase().includes(filters.search.toLowerCase()));
    }).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  },
  async unreadCount(actor: NotificationActor): Promise<number> { return (await this.list({ readState: "Unread" }, actor)).length; },
  async markRead(id: string, read: boolean, actor: NotificationActor): Promise<void> {
    assertView(actor);
    const item = store.find((notification) => notification.id === id && accessible(notification, actor));
    if (!item) throw new Error("Notification not found or not available to this role.");
    readOverrides.set(key(actor.id, id), read);
    await activityRepository.create({ entityType: "notification", entityId: id, activityType: "notification_read", description: `Notification marked ${read ? "read" : "unread"}: ${item.title}`, ...actorEvent(actor), metadata: { reference: item.relatedRecord, companyId: item.companyId, read } });
    window.dispatchEvent(new Event("ea-notifications-updated"));
  },
  async markAllRead(actor: NotificationActor, filters: NotificationFilters = {}): Promise<void> {
    assertView(actor);
    const items = await this.list({ ...filters, readState: "Unread" }, actor);
    items.forEach((item) => readOverrides.set(key(actor.id, item.id), true));
    if (items.length) await activityRepository.create({ entityType: "notification", entityId: "notification-center", activityType: "notification_read", description: `Marked ${items.length} notifications as read`, ...actorEvent(actor), metadata: { count: items.length } });
    window.dispatchEvent(new Event("ea-notifications-updated"));
  },
  async create(input: Omit<NotificationRecord, "id" | "isRead"> & { id?: string }, actor?: NotificationActor): Promise<NotificationRecord> {
    const id = input.id ?? `notification-new-${String(sequence++).padStart(3, "0")}`;
    const record: NotificationRecord = { ...input, id, isRead: false, recipientRoles: [...input.recipientRoles], recipientUserIds: input.recipientUserIds ? [...input.recipientUserIds] : undefined };
    store.unshift(record);
    if (actor) await activityRepository.create({ entityType: "notification", entityId: id, activityType: "created", description: `Notification created: ${record.title}`, ...actorEvent(actor), metadata: { reference: record.relatedRecord, companyId: record.companyId, category: record.category } });
    window.dispatchEvent(new Event("ea-notifications-updated"));
    return { ...record, recipientRoles: [...record.recipientRoles] };
  },
  roles(): UserRole[] { return Array.from(new Set(store.flatMap((item) => item.recipientRoles))); },
};
