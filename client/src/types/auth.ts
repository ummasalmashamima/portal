export type UserRole =
  | "Super Admin"
  | "Director / Management"
  | "Application Officer"
  | "Audit Manager"
  | "Auditor"
  | "Technical Reviewer"
  | "Certification Manager"
  | "Customer";

export type Permission =
  | "dashboard.view"
  | "companies.view"
  | "companies.manage"
  | "applications.view"
  | "applications.create"
  | "applications.review"
  | "applications.approve"
  | "audits.view"
  | "audits.manage"
  | "audits.execute"
  | "audits.findings"
  | "audits.report"
  | "audits.review"
  | "activity.view"
  | "findings.view"
  | "findings.manage"
  | "findings.close"
  | "findings.review"
  | "technical-reviews.view"
  | "technicalReviews.view"
  | "technicalReviews.decide"
  | "certifications.view"
  | "certifications.manage"
  | "certifications.review"
  | "certifications.decide"
  | "certificates.view"
  | "certificates.manage"
  | "certificates.issue"
  | "certificates.renew"
  | "renewals.view"
  | "renewals.manage"
  | "documents.view"
  | "documents.upload"
  | "documents.approve"
  | "documents.archive"
  | "reports.view"
  | "reports.generate"
  | "reports.export"
  | "notifications.view"
  | "notifications.manage"
  | "settings.view"
  | "settings.manage"
  | "users.manage"
  | "profile.view"
  | "profile.manage";

export interface DemoUser {
  id: string;
  name: string;
  initials: string;
  email: string;
  role: UserRole;
  lastLogin: string;
}

export interface AuthSession { user: DemoUser; signedInAt: string; }
