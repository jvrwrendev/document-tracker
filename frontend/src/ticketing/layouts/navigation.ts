import {
  LayoutDashboard,
  ClipboardList,
  PackageOpen,
  UserRound,
  Ticket,
} from 'lucide-react';

export type TicketingSection = 'overview' | 'operations' | 'personal';

export interface TicketingNavItem {
  id: string;
  label: string;
  to: string;
  icon: string;
  section: TicketingSection;
}

export const ticketingNavigation: TicketingNavItem[] = [
  { id: 'dashboard', label: 'Dashboard', to: '/ticketing/dashboard', icon: 'LayoutDashboard', section: 'overview' },
  { id: 'service-requests', label: 'Service Request', to: '/ticketing/service-requests', icon: 'ClipboardList', section: 'operations' },
  { id: 'borrow-slips', label: 'Borrow Slip', to: '/ticketing/borrow-slips', icon: 'PackageOpen', section: 'operations' },
  { id: 'account', label: 'Account', to: '/ticketing/account', icon: 'UserRound', section: 'personal' },
];

export const ticketingSections: Array<{ key: TicketingSection; label: string }> = [
  { key: 'overview', label: 'Overview' },
  { key: 'operations', label: 'Operations' },
  { key: 'personal', label: 'Personal' },
];

export const ticketingIconMap = {
  LayoutDashboard,
  ClipboardList,
  PackageOpen,
  UserRound,
  Ticket,
} as const;
