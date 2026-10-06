import type { Permission, UserRole } from '@/types';
import { RECIPIENT_TRACKING_ROLES, ROLE_SHORT_LABELS } from '@/constants';

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

export interface PermissionGroupMeta {
  label: string;
  iconName: string;
  permissions: Array<{ key: Permission; label: string; restrictedTo?: UserRole[] }>;
}

export const PERMISSION_GROUPS: PermissionGroupMeta[] = [
  {
    label: 'Documents',
    iconName: 'FileText',
    permissions: [
      { key: 'documents.view', label: 'View documents' },
      { key: 'documents.create', label: 'Create documents' },
      { key: 'documents.edit', label: 'Edit documents' },
      { key: 'documents.delete', label: 'Delete documents' },
      { key: 'documents.register', label: 'Register documents' },
      { key: 'documents.receive', label: 'Receive documents' },
      { key: 'documents.route', label: 'Route documents' },
      { key: 'documents.review', label: 'Review documents' },
      { key: 'documents.recommend', label: 'Recommend documents' },
      { key: 'documents.approve', label: 'Approve documents' },
      { key: 'documents.reject', label: 'Reject documents' },
      { key: 'documents.return', label: 'Return documents' },
      { key: 'documents.release', label: 'Release documents' },
      { key: 'documents.archive', label: 'Archive documents' },
      { key: 'documents.track', label: 'Track documents (Recipient Tracking)', restrictedTo: RECIPIENT_TRACKING_ROLES },
    ],
  },
  {
    label: 'Users & Offices',
    iconName: 'Users',
    permissions: [
      { key: 'users.view', label: 'View users' },
      { key: 'users.create', label: 'Create users' },
      { key: 'users.edit', label: 'Edit users' },
      { key: 'users.delete', label: 'Delete users' },
      { key: 'offices.view', label: 'View offices' },
      { key: 'offices.create', label: 'Create offices' },
      { key: 'offices.edit', label: 'Edit offices' },
      { key: 'offices.delete', label: 'Delete offices' },
    ],
  },
  {
    label: 'System & Audit',
    iconName: 'ShieldCheck',
    permissions: [
      { key: 'roles.view', label: 'View roles' },
      { key: 'roles.edit', label: 'Edit roles' },
      { key: 'audit.view', label: 'View audit logs' },
      { key: 'notifications.view', label: 'View notifications' },
      { key: 'settings.view', label: 'View settings' },
      { key: 'settings.edit', label: 'Edit settings' },
      { key: 'dashboard.view', label: 'View dashboard' },
    ],
  },
];

export const ALL_PERMISSIONS: Permission[] = PERMISSION_GROUPS.flatMap(g =>
  g.permissions.map(p => p.key),
);

export function roleCoveragePercent(role: RoleDefinition | null | undefined): number {
  if (!role || ALL_PERMISSIONS.length === 0) return 0;
  return Math.round((role.permissions.length / ALL_PERMISSIONS.length) * 100);
}