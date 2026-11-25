import { useEffect, type ReactNode } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { LayoutSidebar } from './Sidebar';
import { Header } from './Header';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import { useAuth } from '@/features/authentication/hooks/useAuth';
import { DocumentRegistrationModalProvider } from '@/features/documents/context/DocumentRegistrationModalContext';
import { UserFormModalProvider } from '@/features/system-admin/users/context/UserFormModalContext';

interface AppLayoutProps {
  children?: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { mustChangePassword, isAuthenticated, loading } = useAuth();

  useEffect(() => {
    if (loading || !isAuthenticated) return;
    if (mustChangePassword && location.pathname !== '/change-password') {
      navigate('/change-password', { replace: true });
    }
  }, [loading, isAuthenticated, mustChangePassword, location.pathname, navigate]);

  return (
    <SidebarProvider>
      <DocumentRegistrationModalProvider>
        <UserFormModalProvider>
          <LayoutSidebar />
          <SidebarInset>
            <Header />
            <main className="min-w-0 flex-1 overflow-y-auto px-4 sm:px-6 py-6 max-w-[1600px] w-full mx-auto">
              {children ?? <Outlet />}
            </main>
          </SidebarInset>
        </UserFormModalProvider>
      </DocumentRegistrationModalProvider>
    </SidebarProvider>
  );
}
