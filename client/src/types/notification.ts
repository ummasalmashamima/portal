import type { UserRole } from "@/types/auth";
import type { ActivityEntityType } from "@/types/activity";

export type NotificationCategory = "Workflow" | "Document" | "Certificate" | "Renewal" | "CAP" | "System";
export type NotificationPriority = "High" | "Medium" | "Low";
export interface NotificationRecord {
  id: string;
  title: string;
  description: string;
  category: NotificationCategory;
  priority: NotificationPriority;
  relatedEntityType: ActivityEntityType;
  relatedEntityId: string;
  relatedRecord: string;
  route: string;
  companyId?: string;
  triggeredBy: string;
  createdAt: string;
  recipientRoles: UserRole[];
  recipientUserIds?: string[];
  isRead: boolean;
}
export interface NotificationFilters { category?: NotificationCategory | "All"; readState?: "All" | "Unread" | "Read"; search?: string; }
export interface NotificationActor { id?: string; name?: string; role?: UserRole; }
