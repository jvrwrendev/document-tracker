import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { DocumentRegistrationModal } from '@/features/documents/components/DocumentRegistrationModal';

interface DocumentRegistrationModalContextValue {
  openRegistration: () => void;
  closeRegistration: () => void;
}

const DocumentRegistrationModalContext = createContext<DocumentRegistrationModalContextValue | null>(null);

export function DocumentRegistrationModalProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);

  const openRegistration = useCallback(() => setOpen(true), []);
  const closeRegistration = useCallback(() => setOpen(false), []);

  const value = useMemo(() => ({ openRegistration, closeRegistration }), [openRegistration, closeRegistration]);

  return (
    <DocumentRegistrationModalContext.Provider value={value}>
      {children}
      <DocumentRegistrationModal open={open} onClose={closeRegistration} />
    </DocumentRegistrationModalContext.Provider>
  );
}

export function useDocumentRegistrationModal() {
  const ctx = useContext(DocumentRegistrationModalContext);
  if (!ctx) {
    throw new Error('useDocumentRegistrationModal must be used within DocumentRegistrationModalProvider');
  }
  return ctx;
}
