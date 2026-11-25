import { useCallback, useEffect, useState } from 'react';
import {
  ApiError,
  employeeService,
  userService,
} from '@/features/system-admin/users/services/user.service';
import type {
  CreateEmployeePayload,
  CreateUserPayload,
  CreateUserResponse,
  EmployeeSummary,
  ResendCredentialsResult,
  ResetPasswordResult,
  UpdateUserPayload,
  UserAccount,
  UserListFilters,
  UserListResponse,
  UserRoleApi,
} from '@/features/system-admin/users/types/user';

export interface CreateUserWithEmployeeInput {
  employee: Omit<CreateEmployeePayload, 'employeeNo'>;
  user: Omit<CreateUserPayload, 'employeeId'>;
}

interface UseUsersReturn {
  users: UserAccount[];
  total: number;
  page: number;
  pageSize: number;
  loading: boolean;
  error: string | null;

  refetch: () => Promise<void>;

  fetchById: (id: string) => Promise<UserAccount>;
  createUser: (input: CreateUserWithEmployeeInput) => Promise<CreateUserResponse>;
  update: (id: string, input: UpdateUserPayload) => Promise<UserAccount>;
  remove: (id: string) => Promise<void>;
  resetPassword: (
    id: string,
    newPassword?: string,
  ) => Promise<ResetPasswordResult>;
  resendCredentials: (id: string) => Promise<ResendCredentialsResult>;

  creating: boolean;
  updating: boolean;
  deleting: boolean;
  resettingPassword: boolean;
  resendingCredentials: boolean;
  actionError: string | null;
  clearActionError: () => void;
}

function toMessage(err: unknown, fallback: string): string {
  if (err instanceof ApiError) return err.message;
  if (err instanceof Error) return err.message;
  return fallback;
}

function generateEmployeeNo(): string {
  const stamp = Date.now().toString(36).toUpperCase().slice(-6);
  const rand = Math.random().toString(36).toUpperCase().slice(2, 5);
  return `EMP-${stamp}${rand}`;
}

function buildRoleQuery(role?: UserRoleApi | 'all'): string {
  if (!role || role === 'all') return '';
  return role;
}

export function useUsers(initialFilters: UserListFilters = {}): UseUsersReturn {
  const [filters, setFilters] = useState<UserListFilters>(initialFilters);
  const [response, setResponse] = useState<UserListResponse>({
    items: [],
    total: 0,
    page: 1,
    pageSize: 20,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [creating, setCreating] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [resettingPassword, setResettingPassword] = useState(false);
  const [resendingCredentials, setResendingCredentials] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const clearActionError = useCallback(() => setActionError(null), []);

  const refetch = useCallback(
    async (override?: UserListFilters) => {
      setLoading(true);
      setError(null);
      const effective = override ?? filters;
      try {
        const res = await userService.list(effective);
        setResponse(res);
      } catch (err) {
        setError(toMessage(err, 'Failed to load users.'));
        setResponse({ items: [], total: 0, page: 1, pageSize: effective.pageSize ?? 20 });
      } finally {
        setLoading(false);
      }
    },
    [filters],
  );

  useEffect(() => {
    void refetch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchById = useCallback(async (id: string) => {
    return userService.getById(id);
  }, []);

  const createUser = useCallback(
    async (input: CreateUserWithEmployeeInput) => {
      setCreating(true);
      setActionError(null);
      try {
        const employeePayload: CreateEmployeePayload = {
          ...input.employee,
          employeeNo: generateEmployeeNo(),
        };
        const employee: EmployeeSummary = await employeeService.create(employeePayload);
        const userPayload: CreateUserPayload = {
          ...input.user,
          employeeId: employee.id,
        };
        const created = await userService.create(userPayload);
        await refetch();
        return created;
      } catch (err) {
        setActionError(toMessage(err, 'Failed to create user.'));
        throw err;
      } finally {
        setCreating(false);
      }
    },
    [refetch],
  );

  const update = useCallback(
    async (id: string, input: UpdateUserPayload) => {
      setUpdating(true);
      setActionError(null);
      try {
        const updated = await userService.update(id, input);
        await refetch();
        return updated;
      } catch (err) {
        setActionError(toMessage(err, 'Failed to update user.'));
        throw err;
      } finally {
        setUpdating(false);
      }
    },
    [refetch],
  );

  const remove = useCallback(
    async (id: string) => {
      setDeleting(true);
      setActionError(null);
      try {
        await userService.remove(id);
        await refetch();
        window.dispatchEvent(new Event('users:invalidate'));
        window.dispatchEvent(new Event('employees:invalidate'));
      } catch (err) {
        setActionError(toMessage(err, 'Failed to delete user.'));
        throw err;
      } finally {
        setDeleting(false);
      }
    },
    [refetch],
  );

  const resetPassword = useCallback(
    async (id: string, newPassword?: string) => {
      setResettingPassword(true);
      setActionError(null);
      try {
        return await userService.resetPassword(
          id,
          newPassword ? { newPassword } : undefined,
        );
      } catch (err) {
        setActionError(toMessage(err, 'Failed to reset password.'));
        throw err;
      } finally {
        setResettingPassword(false);
      }
    },
    [],
  );

  const resendCredentials = useCallback(
    async (id: string) => {
      setResendingCredentials(true);
      setActionError(null);
      try {
        return await userService.resendCredentials(id);
      } catch (err) {
        setActionError(toMessage(err, 'Failed to resend credentials.'));
        throw err;
      } finally {
        setResendingCredentials(false);
      }
    },
    [],
  );

  return {
    users: response.items,
    total: response.total,
    page: response.page,
    pageSize: response.pageSize,
    loading,
    error,
    refetch: (override?: UserListFilters) => {
      if (override) setFilters(override);
      return refetch(override);
    },
    fetchById,
    createUser,
    update,
    remove,
    resetPassword,
    resendCredentials,
    creating,
    updating,
    deleting,
    resettingPassword,
    resendingCredentials,
    actionError,
    clearActionError,
  };
}

export { buildRoleQuery };
