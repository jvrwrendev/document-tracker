import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from '@/features/authentication/hooks/useAuth';
import { ToastProvider } from '@/hooks/useToast';
import { ConfirmDialogProvider } from '@/components/ui/ConfirmDialog';
import { AppLayout } from '@/components/layout/AppLayout';
import { ProtectedRoute } from '@/components/layout/ProtectedRoute';

import { LoginPage } from '@/features/authentication/pages/LoginPage';
import { ForgotPasswordPage } from '@/features/authentication/pages/ForgotPasswordPage';
import { ResetPasswordPage } from '@/features/authentication/pages/ResetPasswordPage';
import { ChangePasswordPage } from '@/features/authentication/pages/ChangePasswordPage';
import { DashboardPage } from '@/features/documents/pages/DashboardPage';
import { DocumentsListPage } from '@/features/documents/pages/DocumentsListPage';
import { DocumentDetailPage } from '@/features/documents/pages/DocumentDetailPage';
import { DocumentRegistrationPage } from '@/features/documents/pages/DocumentRegistrationPage';
import { InboxPage } from '@/features/documents/pages/InboxPage';
import { OutboxPage } from '@/features/documents/pages/OutboxPage';
import { ArchivePage } from '@/features/documents/pages/ArchivePage';
import { TrackingPage } from '@/features/documents/pages/TrackingPage';
import { UsersPage } from '@/features/system-admin/users/pages/UsersPage';
import { AddUserPage } from '@/features/system-admin/users/pages/AddUserPage';
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
                <Route path="/dashboard" element={<DashboardPage />} />
                <Route path="/change-password" element={<ChangePasswordPage />} />
                <Route path="/documents" element={<DocumentsListPage />} />
                <Route
                  path="/documents/register"
                  element={
                    <ProtectedRoute permission="documents.register">
                      <DocumentRegistrationPage />
                    </ProtectedRoute>
                  }
                />
                <Route path="/documents/:id" element={<DocumentDetailPage />} />

                <Route
                  path="/inbox"
                  element={
                    <ProtectedRoute roles={['system_admin', 'office_admin', 'document_officer']}>
                      <InboxPage />
                    </ProtectedRoute>
                  }
                />
                <Route path="/outbox" element={<OutboxPage />} />
                <Route path="/tracking" element={<TrackingPage />} />
                <Route
                  path="/archive"
                  element={
                    <ProtectedRoute roles={['system_admin', 'office_admin']}>
                      <ArchivePage />
                    </ProtectedRoute>
                  }
                />

                <Route
                  path="/users"
                  element={
                    <ProtectedRoute roles={['system_admin', 'office_admin']}>
                      <UsersPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/users/:id"
                  element={
                    <ProtectedRoute roles={['system_admin', 'office_admin']}>
                      <UserDetailPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/users/:id/edit"
                  element={
                    <ProtectedRoute roles={['system_admin', 'office_admin']}>
                      <EditUserPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/users/new"
                  element={
                    <ProtectedRoute roles={['system_admin', 'office_admin']}>
                      <AddUserPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/offices"
                  element={
                    <ProtectedRoute roles={['system_admin', 'office_admin']}>
                      <OfficesPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/offices/:id"
                  element={
                    <ProtectedRoute roles={['system_admin', 'office_admin']}>
                      <OfficeDetailPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/document-types"
                  element={
                    <ProtectedRoute roles={['system_admin', 'office_admin']}>
                      <DocumentTypesPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/document-types/:id"
                  element={
                    <ProtectedRoute roles={['system_admin', 'office_admin']}>
                      <DocumentTypeDetailPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/roles"
                  element={
                    <ProtectedRoute roles={['system_admin']}>
                      <RolesPermissionsPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/audit"
                  element={
                    <ProtectedRoute roles={['system_admin', 'office_admin']}>
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


