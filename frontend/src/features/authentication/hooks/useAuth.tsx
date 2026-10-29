import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import type { Permission, User, UserRole } from '@/types';
import { ROLE_PERMISSIONS } from '@/constants';
import { authService } from '@/features/authentication/services/authService';
import type { AuthUser } from '@/features/authentication/api/authApi';
import { ApiError } from '@/lib/apiClient';

interface LoginResult {
  ok: boolean;
  error?: string;
  mustChangePassword?: boolean;
  code?: string;
  email?: string;
}

interface AuthContextValue {
  user: User | null;
  isAuthenticated: boolean;
  loading: boolean;
  mustChangePassword: boolean;
  login: (emailOrUsername: string, password: string) => Promise<LoginResult>;
  logout: () => Promise<void>;
  hasPermission: (permission: Permission) => boolean;
  allSwitchableUsers: User[];
  switchUser: (userId: string) => void;
  switchRole: (role: UserRole) => void;
  updateCurrentUser: (next: AuthUser) => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function composeFullName(firstName?: string | null, middleName?: string | null, lastName?: string | null): string {
  const parts = [firstName, middleName, lastName]
    .map(p => (p ?? '').trim())
    .filter(Boolean);
  return parts.join(' ');
}

function mapUser(user: AuthUser): User {
  const composed = composeFullName(user.firstName, user.middleName, user.lastName);
  const fullName = composed || user.username || user.email || user.id;
  return {
    id: user.id,
    fullName,
    firstName: user.firstName ?? undefined,
    middleName: user.middleName ?? undefined,
    lastName: user.lastName ?? undefined,
    email: user.email ?? '',
    phone: user.phone ?? undefined,
    username: user.username ?? user.email ?? '',
    role: user.role.toLowerCase() as UserRole,
    permissions: user.permissions as Permission[] | undefined,
    officeId: user.officeId ?? '',
    officeName: user.office?.name ?? undefined,
    officeCode: user.office?.code ?? undefined,
    position: user.position ?? '',
    status: user.status.toLowerCase() as User['status'],
    mustChangePassword: user.mustChangePassword,
    avatarColor: user.avatarColor ?? 'bg-brand-600',
    createdAt: user.createdAt,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    authService.restoreSession().then(restoredUser => {
      if (active) {
        setUser(restoredUser ? mapUser(restoredUser) : null);
        setLoading(false);
      }
    });
    return () => { active = false; };
  }, []);

  const login = async (emailOrUsername: string, password: string) => {
    setLoading(true);
    try {
      const authenticated = await authService.login({ emailOrUsername, password });
      const mapped = mapUser(authenticated);
      setUser(mapped);
      return { ok: true, mustChangePassword: authenticated.mustChangePassword };
    } catch (error) {
      const details =
        error instanceof ApiError
          ? (error.details as { code?: string; email?: string } | undefined)
          : undefined;
      return {
        ok: false,
        error: error instanceof Error ? error.message : 'Sign in failed',
        code: details?.code,
        email: details?.email,
      };
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try { await authService.logout(); } finally { setUser(null); }
  };

  const updateCurrentUser = (next: AuthUser) => {
    setUser(mapUser(next));
  };

  const hasPermission = (permission: Permission) => {
    if (!user) return false;
    const perms =
      user.permissions && user.permissions.length > 0
        ? user.permissions
        : (ROLE_PERMISSIONS[user.role] ?? []);
    return perms.includes(permission);
  };

  const value = useMemo<AuthContextValue>(() => ({
    user,
    isAuthenticated: !!user,
    loading,
    mustChangePassword: !!user?.mustChangePassword,
    login,
    logout,
    hasPermission,
    allSwitchableUsers: [],
    switchUser: () => undefined,
    switchRole: () => undefined,
    updateCurrentUser,
  }), [user, loading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider');
  return context;
}

export function useCurrentUser(): User {
  const { user, loading } = useAuth();
  if (loading) {
    throw new Error('useCurrentUser called while authentication is still loading');
  }
  if (!user) {
    throw new Error('useCurrentUser requires an authenticated user');
  }
  return user;
}