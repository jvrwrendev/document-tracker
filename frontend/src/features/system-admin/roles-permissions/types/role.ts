import type { Permission, UserRole } from '@/types';

export interface RoleSummary {
  id: string;
  name: string;
  description: string;
  userCount: number;
}

export interface RoleDefinition extends RoleSummary {
  permissions: string[];
}

export interface RoleUser {
  id: string;
  fullName: string;
  email: string;
  username: string;
  role: string;
  status: string;
  officeName: string | null;
  position: string | null;
  createdAt: string;
}

export interface PermissionCatalogEntry {
  key: Permission;
  module: string;
  action: string;
}

export interface RolePermissionCatalog {
  permissions: PermissionCatalogEntry[];
  modules: Array<{ module: string; permissions: PermissionCatalogEntry[] }>;
  reserved: Permission[];
  restricted: Record<string, UserRole[] | string[]>;
  defaults: Record<string, Permission[]>;
}

export interface PermissionGroupMeta {
  module: string;
  iconName: string;
  permissions: Array<{
    key: Permission;
    label: string;
    restrictedTo?: string[];
    reserved?: boolean;
    mandatory?: boolean;
  }>;
}

export const PERMISSION_LABELS: Record<string, string> = {
  'dashboard.view': 'View dashboard',
  'documents.view': 'View documents',
  'documents.create': 'Create documents',
  'documents.edit': 'Edit documents',
  'documents.delete': 'Delete documents',
  'documents.receive': 'Receive documents',
  'inbox.view': 'View inbox',
  'outbox.view': 'View outbox',
  'tracking.view': 'View tracking',
  'archive.view': 'View archive',
  'users.view': 'View users',
  'users.create': 'Create users',
  'users.edit': 'Edit users',
  'users.delete': 'Delete users',
  'employees.view': 'View employees',
  'employees.create': 'Create employees',
  'employees.edit': 'Edit employees',
  'employees.delete': 'Delete employees',
  'offices.view': 'View offices',
  'offices.create': 'Create offices',
  'offices.edit': 'Edit offices',
  'offices.delete': 'Delete offices',
  'roles.view': 'View roles',
  'roles.create': 'Create roles',
  'roles.edit': 'Edit roles',
  'roles.delete': 'Delete roles',
  'permissions.view': 'View permissions',
  'permissions.assign': 'Assign permissions',
  'settings.view': 'View settings',
  'settings.edit': 'Edit settings',
  'audit.view': 'View audit logs',
  'backup.view': 'View backups',
  'backup.create': 'Create backups',
  'backup.restore': 'Restore backups',
};

export const MODULE_ICONS: Record<string, string> = {
  Dashboard: 'LayoutDashboard',
  Documents: 'FileText',
  Inbox: 'Inbox',
  Outbox: 'Mail',
  Tracking: 'Activity',
  Archive: 'Archive',
  Users: 'Users',
  Employees: 'UserCog',
  Offices: 'Building2',
  Roles: 'ShieldCheck',
  Permissions: 'KeyRound',
  Settings: 'Settings',
  'Audit Logs': 'History',
  Backup: 'Database',
};

export function buildPermissionGroups(
  catalog: RolePermissionCatalog | null,
  selectedRole?: string,
): PermissionGroupMeta[] {
  const modules = catalog?.modules ?? [];
  const reserved = new Set(catalog?.reserved ?? []);
  const defaults = new Set(catalog?.defaults?.[selectedRole ?? ''] ?? []);
  return modules.map(group => ({
    module: group.module,
    iconName: MODULE_ICONS[group.module] ?? 'ShieldCheck',
    permissions: group.permissions.map(p => ({
      key: p.key as Permission,
      label: PERMISSION_LABELS[p.key] ?? p.key,
      restrictedTo: (catalog?.restricted?.[p.key] as string[] | undefined) ?? undefined,
      reserved: reserved.has(p.key as Permission),
      mandatory: selectedRole === 'system_admin' && defaults.has(p.key as Permission),
    })),
  }));
}

export function roleCoveragePercent(role: RoleDefinition | null | undefined, catalog: RolePermissionCatalog | null): number {
  const total = (catalog?.permissions ?? []).filter(p => !(catalog?.reserved ?? []).includes(p.key)).length;
  if (!role || total === 0) return 0;
  const granted = role.permissions.filter(p => (catalog?.permissions ?? []).some(c => c.key === p)).length;
  return Math.round((granted / total) * 100);
}