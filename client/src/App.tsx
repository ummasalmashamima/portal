import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { ToastProvider } from "@/contexts/ToastContext";
import { AuthLayout } from "@/layouts/AuthLayout";
import { AppShell } from "@/layouts/AppShell";
import { ProtectedRoute } from "@/routes/ProtectedRoute";
import { LoginPage } from "@/pages/auth/LoginPage";
import { ForgotPasswordPage } from "@/pages/auth/ForgotPasswordPage";
import { ResetPasswordPage } from "@/pages/auth/ResetPasswordPage";
import { DashboardPage } from "@/pages/DashboardPage";
import { ComingSoonPage } from "@/pages/ComingSoonPage";
import { CompanyListPage } from "@/pages/companies/CompanyListPage";
import { CompanyFormPage } from "@/pages/companies/CompanyFormPage";
import { CompanyDetailPage } from "@/pages/companies/CompanyDetailPage";
import { ApplicationListPage } from "@/pages/applications/ApplicationListPage";
import { ApplicationFormPage } from "@/pages/applications/ApplicationFormPage";
import { ApplicationDetailPage } from "@/pages/applications/ApplicationDetailPage";
import { ApplicationReviewPage } from "@/pages/applications/ApplicationReviewPage";
import { AuditListPage } from "@/pages/audits/AuditListPage";
import { AuditFormPage } from "@/pages/audits/AuditFormPage";
import { AuditDetailPage } from "@/pages/audits/AuditDetailPage";
import { ActivityHistoryPage } from "@/pages/activity/ActivityHistoryPage";
import { FindingsListPage } from "@/pages/findings/FindingsListPage";
import { FindingDetailPage } from "@/pages/findings/FindingDetailPage";
import { FindingFormPage } from "@/pages/findings/FindingFormPage";
import { CertificationDetailPage, CertificationFormPage } from "@/pages/certifications/CertificationPages";
import { CertificationListPage } from "@/pages/certifications/CertificationListPage";
import { CertificateDetailPage, CertificateFormPage, CertificateListPage } from "@/pages/certificates/CertificatePages";
import { RenewalDetailPage, RenewalListPage } from "@/pages/renewals/RenewalPages";
import { DocumentDetailPage, DocumentListPage, DocumentUploadPage } from "@/pages/documents/DocumentPages";
import { GeneratedReportDetailPage, ReportCenterPage } from "@/pages/reports/ReportPages";
import { NotificationCenterPage } from "@/pages/notifications/NotificationPages";
import { ProfilePage, SettingsAuditLogPage, SettingsPage } from "@/pages/settings/SettingsPages";
import { TechnicalReviewDetailPage, TechnicalReviewFormPage, TechnicalReviewListPage } from "@/pages/technical-reviews/TechnicalReviewPages";

function RootRedirect() {
  const { isAuthenticated } = useAuth();
  return <Navigate to={isAuthenticated ? "/dashboard" : "/login"} replace />;
}

function AppRoutes() {
  return <Routes>
    <Route element={<AuthLayout />}>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
    </Route>
    <Route element={<ProtectedRoute />}>
      <Route element={<AppShell />}>
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/companies" element={<CompanyListPage />} />
        <Route path="/companies/new" element={<CompanyFormPage />} />
        <Route path="/companies/:companyId" element={<CompanyDetailPage />} />
        <Route path="/companies/:companyId/edit" element={<CompanyFormPage mode="edit" />} />
        <Route path="/applications" element={<ApplicationListPage />} />
        <Route path="/applications/new" element={<ApplicationFormPage />} />
        <Route path="/applications/:applicationId" element={<ApplicationDetailPage />} />
        <Route path="/applications/:applicationId/edit" element={<ApplicationFormPage mode="edit" />} />
        <Route path="/applications/:applicationId/review" element={<ApplicationReviewPage />} />
        <Route path="/audits" element={<AuditListPage />} />
        <Route path="/audits/new" element={<AuditFormPage />} />
        <Route path="/audits/:auditId" element={<AuditDetailPage />} />
        <Route path="/audits/:auditId/edit" element={<AuditFormPage mode="edit" />} />
        <Route path="/activity" element={<ActivityHistoryPage />} />
        <Route path="/findings" element={<FindingsListPage />} />
        <Route path="/findings/new" element={<FindingFormPage />} />
        <Route path="/findings/:findingId/edit" element={<FindingFormPage mode="edit" />} />
        <Route path="/findings/:findingId" element={<FindingDetailPage />} />
        <Route path="/certifications" element={<CertificationListPage />} />
        <Route path="/certifications/new" element={<CertificationFormPage />} />
        <Route path="/certifications/:certificationId/edit" element={<CertificationFormPage mode="edit" />} />
        <Route path="/certifications/:certificationId" element={<CertificationDetailPage />} />
        <Route path="/certificates" element={<CertificateListPage />} />
        <Route path="/certificates/:certificateId/edit" element={<CertificateFormPage />} />
        <Route path="/certificates/:certificateId" element={<CertificateDetailPage />} />
        <Route path="/renewals" element={<RenewalListPage />} />
        <Route path="/renewals/:renewalId" element={<RenewalDetailPage />} />
        <Route path="/technical-reviews" element={<TechnicalReviewListPage />} />
        <Route path="/technical-reviews/new" element={<TechnicalReviewFormPage />} />
        <Route path="/technical-reviews/:reviewId/edit" element={<TechnicalReviewFormPage mode="edit" />} />
        <Route path="/technical-reviews/:reviewId" element={<TechnicalReviewDetailPage />} />
        <Route path="/documents" element={<DocumentListPage />} />
        <Route path="/documents/new" element={<DocumentUploadPage />} />
        <Route path="/documents/:documentId" element={<DocumentDetailPage />} />
        <Route path="/reports" element={<ReportCenterPage />} />
        <Route path="/reports/run/:runId" element={<GeneratedReportDetailPage />} />
        <Route path="/notifications" element={<NotificationCenterPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/settings/users" element={<SettingsPage />} />
        <Route path="/settings/roles" element={<SettingsPage />} />
        <Route path="/settings/configuration" element={<SettingsPage />} />
        <Route path="/settings/audit-log" element={<SettingsAuditLogPage />} />
        <Route path="/profile" element={<ProfilePage />} />
      </Route>
    </Route>
    <Route path="/" element={<RootRedirect />} />
    <Route path="*" element={<RootRedirect />} />
  </Routes>;
}

export default function App() {
  return <AuthProvider><ToastProvider><BrowserRouter><AppRoutes /></BrowserRouter></ToastProvider></AuthProvider>;
}
