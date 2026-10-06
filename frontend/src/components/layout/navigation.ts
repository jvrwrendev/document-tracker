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
  },
  {
    id: 'documents',
    label: 'Documents',
    to: '/documents',
    icon: 'FileText',
    section: 'main',
  },
  {
    id: 'inbox',
    label: 'Inbox',
    to: '/inbox',
    icon: 'Inbox',
    section: 'workspace',
    roles: ['system_admin', 'office_admin', 'document_officer'],
  },
  {
    id: 'outbox',
    label: 'Outbox',
    to: '/outbox',
    icon: 'Mail',
    section: 'workspace',
  },
  {
    id: 'tracking',
    label: 'Tracking',
    to: '/tracking',
    icon: 'Activity',
    section: 'workspace',
    // Recipient Tracking is role-restricted: an encoder registers documents and
    // an officer receives them, neither may monitor distribution.
    permission: 'documents.track',
    roles: RECIPIENT_TRACKING_ROLES,
  },
  {
    id: 'archive',
    label: 'Archive',
    to: '/archive',
    icon: 'Archive',
    section: 'workspace',
    roles: ['system_admin', 'office_admin'],
  },
  {
    id: 'users',
    label: 'Users',
    to: '/users',
    icon: 'Users',
    section: 'admin',
    roles: ['system_admin', 'office_admin'],
  },
  {
    id: 'offices',
    label: 'Offices',
    to: '/offices',
    icon: 'Building2',
    section: 'admin',
    roles: ['system_admin', 'office_admin'],
  },
  {
    id: 'document-types',
    label: 'Document Types',
    to: '/document-types',
    icon: 'Tag',
    section: 'admin',
    roles: ['system_admin', 'office_admin'],
  },
  {
    id: 'roles',
    label: 'Roles & Permissions',
    to: '/roles',
    icon: 'ShieldCheck',
    section: 'admin',
    roles: ['system_admin'],
  },
  {
    id: 'audit',
    label: 'Audit Logs',
    to: '/audit',
    icon: 'History',
    section: 'admin',
    roles: ['system_admin', 'office_admin'],
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
