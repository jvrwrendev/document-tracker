import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

export type SystemId = 'documents' | 'ticketing';

interface SystemContextValue {
  system: SystemId;
  switchSystem: (next: SystemId) => void;
}

const SystemContext = createContext<SystemContextValue | null>(null);

export function TicketingSystemProvider({ children }: { children: ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [system, setSystem] = useState<SystemId>(() =>
    location.pathname.startsWith('/ticketing') ? 'ticketing' : 'documents',
  );

  useEffect(() => {
    setSystem(location.pathname.startsWith('/ticketing') ? 'ticketing' : 'documents');
  }, [location.pathname]);

  const switchSystem = useCallback((next: SystemId) => {
    setSystem(next);
    navigate(next === 'ticketing' ? '/ticketing/dashboard' : '/dashboard');
  }, [navigate]);

  const value = useMemo(() => ({ system, switchSystem }), [system, switchSystem]);

  return <SystemContext.Provider value={value}>{children}</SystemContext.Provider>;
}

export function useSystem() {
  const ctx = useContext(SystemContext);
  if (!ctx) throw new Error('useSystem must be used within TicketingSystemProvider');
  return ctx;
}
