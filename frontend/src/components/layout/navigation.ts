import type { UserRole } from '@/types';
import { RECIPIENT_TRACKING_ROLES } from '@/constants';

export interface NavItem {
  id: string;
  label: string;
  to: string;
  icon: string;
  permission?: string;
  roles?: UserRole[];
  section?: 'main' | 'workspace' | 'personal' | 'admin';
  badge?: number;
}

import {
  LayoutDashboard,
  FileText,
  Inbox,
  Activity,
  Archive,
  Users as UsersIcon,
  Building2,
  ShieldCheck,
  History,
  Bell,
  Settings,
  Mail,
  Tag,
} from 'lucide-react';

export const navigation: NavItem[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    to: '/dashboard',
    icon: 'LayoutDashboard',
    section: 'main',
    permission: 'dashboard.view',
  },
  {
    id: 'documents',
    label: 'Documents',
    to: '/documents',
    icon: 'FileText',
    section: 'main',
    permission: 'documents.view',
  },
  {
    id: 'inbox',
    label: 'Inbox',
    to: '/inbox',
    icon: 'Inbox',
    section: 'workspace',
    permission: 'inbox.view',
  },
  {
    id: 'outbox',
    label: 'Outbox',
    to: '/outbox',
    icon: 'Mail',
    section: 'workspace',
    permission: 'outbox.view',
  },
  {
    id: 'tracking',
    label: 'Tracking',
    to: '/tracking',
    icon: 'Activity',
    section: 'workspace',
    permission: 'tracking.view',
    roles: RECIPIENT_TRACKING_ROLES,
  },
  {
    id: 'archive',
    label: 'Archive',
    to: '/archive',
    icon: 'Archive',
    section: 'workspace',
    permission: 'archive.view',
  },
  {
    id: 'users',
    label: 'Users',
    to: '/users',
    icon: 'Users',
    section: 'admin',
    permission: 'users.view',
  },
  {
    id: 'offices',
    label: 'Offices',
    to: '/offices',
    icon: 'Building2',
    section: 'admin',
    permission: 'offices.view',
  },
  {
    id: 'document-types',
    label: 'Document Types',
    to: '/document-types',
    icon: 'Tag',
    section: 'admin',
    permission: 'documents.view',
  },
  {
    id: 'roles',
    label: 'Roles & Permissions',
    to: '/roles',
    icon: 'ShieldCheck',
    section: 'admin',
    permission: 'roles.view',
  },
  {
    id: 'audit',
    label: 'Audit Logs',
    to: '/audit',
    icon: 'History',
    section: 'admin',
    permission: 'audit.view',
  },
  {
    id: 'notifications',
    label: 'Notifications',
    to: '/notifications',
    icon: 'Bell',
    section: 'admin',
  },
  {
    id: 'settings',
    label: 'Settings',
    to: '/settings',
    icon: 'Settings',
    section: 'personal',
  },
];

export const iconMap = {
  LayoutDashboard,
  FileText,
  Inbox,
  Activity,
  Archive,
  Users: UsersIcon,
  Building2,
  ShieldCheck,
  History,
  Bell,
  Settings,
  Mail,
  Tag,
} as const;

export type IconName = keyof typeof iconMap;
