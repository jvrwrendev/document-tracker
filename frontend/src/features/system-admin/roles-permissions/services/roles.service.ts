import { apiFetch } from '@/lib/apiClient';
import type {
  RoleDefinition,
  RolePermissionCatalog,
  RoleSummary,
  RoleUser,
} from '@/features/system-admin/roles-permissions/types/role';

export class RolesApiError extends Error {
  readonly status: number;
  readonly details: unknown;

  constructor(status: number, message: string, details?: unknown) {
    super(message);
    this.name = 'RolesApiError';
    this.status = status;
    this.details = details;
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  return apiFetch<T>(path, init, {
    ErrorClass: RolesApiError,
    source: 'roles.service',
  });
}

export const rolesService = {
  list(): Promise<RoleSummary[]> {
    return request<RoleSummary[]>('/roles');
  },

  getCatalog(): Promise<RolePermissionCatalog> {
    return request<RolePermissionCatalog>('/roles/catalog');
  },

  getById(id: string): Promise<RoleDefinition> {
    return request<RoleDefinition>(`/roles/${id}`);
  },

  getRoleUsers(id: string): Promise<RoleUser[]> {
    return request<RoleUser[]>(`/roles/${id}/users`);
  },

  setPermissions(id: string, permissions: string[]): Promise<string[]> {
    return request<{ permissions: string[] }>(`/roles/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ permissions }),
    }).then(res => res.permissions);
  },
};