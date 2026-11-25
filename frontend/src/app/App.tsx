import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from '@/features/authentication/hooks/useAuth';
import { ToastProvider } from '@/hooks/useToast';
import { ConfirmDialogProvider } from '@/components/ui/ConfirmDialog';
import { AppLayout } from '@/components/layout/AppLayout';
import { ProtectedRoute } from '@/components/layout/ProtectedRoute';

import { LoginPage } from '@/features/authentication/pages/LoginPage';
import { VerifyEmailPage } from '@/features/authentication/pages/VerifyEmailPage';
import { ForgotPasswordPage } from '@/features/authentication/pages/ForgotPasswordPage';
import { ResetPasswordPage } from '@/features/authentication/pages/ResetPasswordPage';
import { ChangePasswordPage } from '@/features/authentication/pages/ChangePasswordPage';
import { DashboardPage } from '@/features/documents/pages/DashboardPage';
import { DocumentsListPage } from '@/features/documents/pages/DocumentsListPage';
import { DocumentDetailPage } from '@/features/documents/pages/DocumentDetailPage';
import { AttachmentViewerPage } from '@/features/documents/pages/AttachmentViewerPage';
import { InboxPage } from '@/features/documents/pages/InboxPage';
import { OutboxPage } from '@/features/documents/pages/OutboxPage';
import { ArchivePage } from '@/features/documents/pages/ArchivePage';
import { TrackingPage } from '@/features/documents/pages/TrackingPage';
import { UsersPage } from '@/features/system-admin/users/pages/UsersPage';
import { EditUserPage } from '@/features/system-admin/users/pages/EditUserPage';
import { UserDetailPage } from '@/features/system-admin/users/pages/UserDetailPage';
import { DocumentTypesPage } from '@/features/system-admin/document-type/pages/DocumentTypesPage';
import { DocumentTypeDetailPage } from '@/features/system-admin/document-type/pages/DocumentTypeDetailPage';
import { OfficesPage } from '@/features/system-admin/offices/pages/OfficesPage';
import { OfficeDetailPage } from '@/features/system-admin/offices/pages/OfficeDetailPage';
import { RolesPermissionsPage } from '@/features/system-admin/roles-permissions/pages/RolesPermissionsPage';
import { AuditLogsPage } from '@/features/system-admin/audit-logs/pages/AuditLogsPage';
import { SettingsPage } from '@/features/profile/pages/SettingsPage';
import { NotificationsPage } from '@/features/notifications/pages/NotificationsPage';
import { RECIPIENT_TRACKING_ROLES } from '@/constants';

export function App() {
  return (
    <BrowserRouter
future={{
        v7_relativeSplatPath: true,
        v7_startTransition: true,
      }}
    >
      <AuthProvider>
        <ToastProvider>
          <ConfirmDialogProvider>
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/verify-email" element={<VerifyEmailPage />} />

              <Route
                path="/attachments/:id/view"
                element={
                  <ProtectedRoute>
                    <AttachmentViewerPage />
                  </ProtectedRoute>
                }
              />

              <Route path="/forgot-password" element={<ForgotPasswordPage />} />
              <Route path="/reset-password" element={<ResetPasswordPage />} />

              <Route
                element={
                  <ProtectedRoute>
                    <AppLayout />
                  </ProtectedRoute>
                }
              >
                <Route path="/" element={<Navigate to="/dashboard" replace />} />
                <Route path="/dashboard" element={<ProtectedRoute permission="dashboard.view"><DashboardPage /></ProtectedRoute>} />
                <Route path="/change-password" element={<ChangePasswordPage />} />
                <Route path="/documents" element={<ProtectedRoute permission="documents.view"><DocumentsListPage /></ProtectedRoute>} />
                <Route path="/documents/:id" element={<ProtectedRoute permission="documents.view"><DocumentDetailPage /></ProtectedRoute>} />

                <Route
                  path="/inbox"
                  element={
                    <ProtectedRoute roles={['system_admin', 'office_admin', 'document_officer']}>
                      <InboxPage />
                    </ProtectedRoute>
                  }
                />
                <Route path="/outbox" element={<ProtectedRoute permission="outbox.view"><OutboxPage /></ProtectedRoute>} />
                <Route
                  path="/tracking"
                  element={
                    <ProtectedRoute roles={RECIPIENT_TRACKING_ROLES} permission="tracking.view">
                      <TrackingPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/archive"
                  element={
                    <ProtectedRoute permission="archive.view">
                      <ArchivePage />
                    </ProtectedRoute>
                  }
                />

                <Route
                  path="/users"
                  element={
                    <ProtectedRoute permission="users.view">
                      <UsersPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/users/:id"
                  element={
                    <ProtectedRoute permission="users.view">
                      <UserDetailPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/users/:id/edit"
                  element={
                    <ProtectedRoute permission="users.edit">
                      <EditUserPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/offices"
                  element={
                    <ProtectedRoute permission="offices.view">
                      <OfficesPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/offices/:id"
                  element={
                    <ProtectedRoute permission="offices.view">
                      <OfficeDetailPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/document-types"
                  element={
                    <ProtectedRoute permission="documents.view">
                      <DocumentTypesPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/document-types/:id"
                  element={
                    <ProtectedRoute permission="documents.view">
                      <DocumentTypeDetailPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/roles"
                  element={
                    <ProtectedRoute permission="roles.view">
                      <RolesPermissionsPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/audit"
                  element={
                    <ProtectedRoute permission="audit.view">
                      <AuditLogsPage />
                    </ProtectedRoute>
                  }
                />
                <Route path="/notifications" element={<NotificationsPage />} />
                <Route path="/settings" element={<SettingsPage />} />
              </Route>

              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </ConfirmDialogProvider>
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}


