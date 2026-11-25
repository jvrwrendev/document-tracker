import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react';
import { UserFormModal } from '@/features/system-admin/users/components/UserFormModal';

interface OpenUserModalOptions {
  mode: 'create' | 'edit';
  userId?: string;
  onSaved?: () => void;
}

interface UserFormModalContextValue {
  openUserModal: (options: OpenUserModalOptions) => void;
  closeUserModal: () => void;
}

const UserFormModalContext = createContext<UserFormModalContextValue | null>(null);

export function UserFormModalProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<'create' | 'edit'>('create');
  const [userId, setUserId] = useState<string | undefined>(undefined);
  const onSavedRef = useRef<(() => void) | undefined>(undefined);

  const openUserModal = useCallback((options: OpenUserModalOptions) => {
    setMode(options.mode);
    setUserId(options.userId);
    onSavedRef.current = options.onSaved;
    setOpen(true);
  }, []);

  const closeUserModal = useCallback(() => setOpen(false), []);

  const handleSaved = useCallback(() => {
    onSavedRef.current?.();
  }, []);

  const value = useMemo(() => ({ openUserModal, closeUserModal }), [openUserModal, closeUserModal]);

  return (
    <UserFormModalContext.Provider value={value}>
      {children}
      <UserFormModal
        open={open}
        mode={mode}
        userId={userId}
        onClose={closeUserModal}
        onSaved={handleSaved}
      />
    </UserFormModalContext.Provider>
  );
}

export function useUserFormModal() {
  const ctx = useContext(UserFormModalContext);
  if (!ctx) throw new Error('useUserFormModal must be used within UserFormModalProvider');
  return ctx;
}
