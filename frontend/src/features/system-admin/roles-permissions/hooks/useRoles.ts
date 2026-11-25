import { useCallback, useEffect, useState } from 'react';
import { rolesService, RolesApiError } from '@/features/system-admin/roles-permissions/services/roles.service';
import type {
  RoleDefinition,
  RolePermissionCatalog,
  RoleSummary,
  RoleUser,
} from '@/features/system-admin/roles-permissions/types/role';

function toMessage(err: unknown, fallback: string): string {
  if (err instanceof RolesApiError) return err.message;
  if (err instanceof Error) return err.message;
  return fallback;
}

export interface UseRolesReturn {
  roles: RoleSummary[];
  catalog: RolePermissionCatalog | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;

  selectedRole: RoleDefinition | null;
  selectedLoading: boolean;
  selectedError: string | null;
  selectRole: (id: string) => Promise<void>;

  roleUsers: RoleUser[];
  usersLoading: boolean;
  usersError: string | null;
  refreshUsers: () => Promise<void>;
  updatePermissions: (permissions: string[]) => Promise<string[]>;
}

export function useRoles(): UseRolesReturn {
  const [roles, setRoles] = useState<RoleSummary[]>([]);
  const [catalog, setCatalog] = useState<RolePermissionCatalog | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedRole, setSelectedRole] = useState<RoleDefinition | null>(null);
  const [selectedLoading, setSelectedLoading] = useState(false);
  const [selectedError, setSelectedError] = useState<string | null>(null);

  const [roleUsers, setRoleUsers] = useState<RoleUser[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [usersError, setUsersError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [roleList, catalogData] = await Promise.all([
        rolesService.list(),
        rolesService.getCatalog(),
      ]);
      setRoles(roleList);
      setCatalog(catalogData);
    } catch (err) {
      setError(toMessage(err, 'Failed to load roles.'));
      setRoles([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const selectRole = useCallback(async (id: string) => {
    setSelectedLoading(true);
    setSelectedError(null);
    setUsersError(null);
    try {
      const [def, users] = await Promise.all([
        rolesService.getById(id),
        rolesService.getRoleUsers(id),
      ]);
      setSelectedRole(def);
      setRoleUsers(users);
    } catch (err) {
      setSelectedError(toMessage(err, 'Failed to load role.'));
    } finally {
      setSelectedLoading(false);
      setUsersLoading(false);
    }
  }, []);

  const refreshUsers = useCallback(async () => {
    if (!selectedRole) return;
    setUsersLoading(true);
    setUsersError(null);
    try {
      setRoleUsers(await rolesService.getRoleUsers(selectedRole.id));
    } catch (err) {
      setUsersError(toMessage(err, 'Failed to load users with this role.'));
    } finally {
      setUsersLoading(false);
    }
  }, [selectedRole]);

  const updatePermissions = useCallback(
    async (permissions: string[]): Promise<string[]> => {
      if (!selectedRole) throw new Error('No role selected.');
      const updated = await rolesService.setPermissions(selectedRole.id, permissions);
      await selectRole(selectedRole.id);
      return updated;
    },
    [selectedRole, selectRole],
  );

  return {
    roles,
    catalog,
    loading,
    error,
    refresh,
    selectedRole,
    selectedLoading,
    selectedError,
    selectRole,
    roleUsers,
    usersLoading,
    usersError,
    refreshUsers,
    updatePermissions,
  };
}