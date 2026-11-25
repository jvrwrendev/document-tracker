import { Badge, type BadgeVariant } from '@/components/ui/Badge';
import type {
  BorrowSlipStatus,
  ServiceRequestPriority,
  ServiceRequestStatus,
} from '@/ticketing/types';

const SERVICE_STATUS: Record<ServiceRequestStatus, { label: string; variant: BadgeVariant }> = {
  pending: { label: 'Pending', variant: 'amber' },
  in_progress: { label: 'In Progress', variant: 'blue' },
  completed: { label: 'Completed', variant: 'emerald' },
};

const PRIORITY: Record<ServiceRequestPriority, { label: string; variant: BadgeVariant }> = {
  low: { label: 'Low', variant: 'slate' },
  medium: { label: 'Medium', variant: 'blue' },
  high: { label: 'High', variant: 'orange' },
  urgent: { label: 'Urgent', variant: 'rose' },
};

const BORROW_STATUS: Record<BorrowSlipStatus, { label: string; variant: BadgeVariant }> = {
  pending: { label: 'Pending', variant: 'amber' },
  borrowed: { label: 'Borrowed', variant: 'blue' },
  returned: { label: 'Returned', variant: 'emerald' },
  overdue: { label: 'Overdue', variant: 'rose' },
};

export function ServiceRequestStatusBadge({ status }: { status: ServiceRequestStatus }) {
  const config = SERVICE_STATUS[status] ?? SERVICE_STATUS.pending;
  return <Badge variant={config.variant}>{config.label}</Badge>;
}

export function ServiceRequestPriorityBadge({ priority }: { priority: ServiceRequestPriority }) {
  const config = PRIORITY[priority] ?? PRIORITY.medium;
  return <Badge variant={config.variant}>{config.label}</Badge>;
}

export function BorrowSlipStatusBadge({ status }: { status: BorrowSlipStatus }) {
  const config = BORROW_STATUS[status] ?? BORROW_STATUS.pending;
  return <Badge variant={config.variant}>{config.label}</Badge>;
}
