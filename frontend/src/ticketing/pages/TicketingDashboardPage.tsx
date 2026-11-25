import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  ClipboardList,
  Clock,
  FileText,
  PackageOpen,
  Plus,
  Truck,
} from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader } from '@/components/ui/Card';
import { Table } from '@/components/ui/Table';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/skeleton';
import { useServiceRequests } from '@/ticketing/hooks/useServiceRequests';
import { useBorrowSlips } from '@/ticketing/hooks/useBorrowSlips';
import { useTicketingStats } from '@/ticketing/hooks/useTicketingStats';
import { ServiceRequestPriorityBadge, ServiceRequestStatusBadge, BorrowSlipStatusBadge } from '@/ticketing/components/StatusBadges';
import { StatsCard } from '@/ticketing/components/StatsCard';
import { StatusDistribution } from '@/ticketing/components/StatusDistribution';
import { formatDateOnly, effectiveBorrowStatus } from '@/ticketing/data/format';

export function TicketingDashboardPage() {
  const navigate = useNavigate();
  const requests = useServiceRequests();
  const slips = useBorrowSlips();
  const stats = useTicketingStats(requests.items, slips.items);
  const loading = requests.loading || slips.loading;

  const requestDistribution = useMemo(() => [
    { label: 'Pending', value: stats.pendingRequests, tone: 'amber' as const },
    { label: 'In Progress', value: stats.inProgressRequests, tone: 'blue' as const },
    { label: 'Completed', value: stats.completedRequests, tone: 'emerald' as const },
  ], [stats]);

  const borrowDistribution = useMemo(() => [
    { label: 'Pending', value: slips.items.filter(s => effectiveBorrowStatus(s) === 'pending').length, tone: 'amber' as const },
    { label: 'Borrowed', value: slips.items.filter(s => effectiveBorrowStatus(s) === 'borrowed').length, tone: 'blue' as const },
    { label: 'Overdue', value: stats.overdueBorrowSlips, tone: 'rose' as const },
    { label: 'Returned', value: stats.returnedBorrowSlips, tone: 'emerald' as const },
  ], [slips.items, stats]);

  const recentRequests = useMemo(
    () => [...requests.items].sort((a, b) => new Date(b.dateRequested).getTime() - new Date(a.dateRequested).getTime()).slice(0, 5),
    [requests.items],
  );

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-28" />)}
        </div>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <Skeleton className="h-80 lg:col-span-2" />
          <Skeleton className="h-80" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Ticketing Dashboard"
        description="Overview of service requests and equipment borrow slips"
        eyebrow="Ticketing System"
        actions={
          <>
            <Button variant="outline" onClick={() => navigate('/ticketing/borrow-slips')} leftIcon={<PackageOpen className="h-4 w-4" />}>
              Borrow Slips
            </Button>
            <Button onClick={() => navigate('/ticketing/service-requests')} leftIcon={<Plus className="h-4 w-4" />}>
              New Request
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5">
        <StatsCard label="Total Requests" value={stats.totalRequests} icon={<ClipboardList className="h-4 w-4" />} tone="brand" />
        <StatsCard label="Pending" value={stats.pendingRequests} icon={<Clock className="h-4 w-4" />} tone="amber" />
        <StatsCard label="In Progress" value={stats.inProgressRequests} icon={<Truck className="h-4 w-4" />} tone="blue" />
        <StatsCard label="Completed" value={stats.completedRequests} icon={<CheckCircle2 className="h-4 w-4" />} tone="emerald" />
        <StatsCard label="Active Borrow Slips" value={stats.activeBorrowSlips} icon={<PackageOpen className="h-4 w-4" />} tone="rose" hint={`${stats.overdueBorrowSlips} overdue`} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card padded={false} className="lg:col-span-2">
          <div className="flex items-center justify-between gap-3 px-5 py-4">
            <div>
              <h3 className="text-base font-semibold text-slate-900">Recent Service Requests</h3>
              <p className="mt-0.5 text-sm text-slate-500">Latest submitted requests</p>
            </div>
            <Button variant="ghost" size="sm" onClick={() => navigate('/ticketing/service-requests')} rightIcon={<ArrowRight className="h-4 w-4" />}>
              View all
            </Button>
          </div>
          <Table
            data={recentRequests}
            keyExtractor={item => item.id}
            columns={[
              {
                key: 'referenceNumber',
                header: 'Reference',
                width: '140px',
                cell: item => <span className="font-mono text-xs font-semibold text-brand-700">{item.referenceNumber}</span>,
              },
              {
                key: 'requester',
                header: 'Requester',
                cell: item => (
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-slate-900">{item.requesterName}</p>
                    <p className="truncate text-[11px] text-slate-500">{item.requesterOffice}</p>
                  </div>
                ),
              },
              {
                key: 'priority',
                header: 'Priority',
                width: '110px',
                cell: item => <ServiceRequestPriorityBadge priority={item.priority} />,
              },
              {
                key: 'status',
                header: 'Status',
                width: '130px',
                cell: item => <ServiceRequestStatusBadge status={item.status} />,
              },
              {
                key: 'date',
                header: 'Requested',
                width: '120px',
                cell: item => <span className="text-xs text-slate-600">{formatDateOnly(item.dateRequested)}</span>,
              },
            ]}
            emptyState={
              <EmptyState
                icon={<FileText className="h-6 w-6" />}
                title="No service requests"
                description="Service requests will appear here once created."
              />
            }
          />
        </Card>

        <div className="space-y-6">
          <StatusDistribution items={requestDistribution} title="Request Status" />
          <StatusDistribution items={borrowDistribution} title="Borrow Slip Status" />
        </div>
      </div>

      <Card padded={false}>
        <div className="flex items-center justify-between gap-3 px-5 py-4">
          <div>
            <h3 className="text-base font-semibold text-slate-900">Borrow Slip Watchlist</h3>
            <p className="mt-0.5 text-sm text-slate-500">Items due soon or already overdue</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => navigate('/ticketing/borrow-slips')}>Manage slips</Button>
        </div>
        <Table
          data={slips.items.filter(s => ['borrowed', 'overdue'].includes(effectiveBorrowStatus(s))).slice(0, 5)}
          keyExtractor={item => item.id}
          columns={[
            {
              key: 'reference',
              header: 'Reference',
              width: '140px',
              cell: item => <span className="font-mono text-xs font-semibold text-brand-700">{item.referenceNumber}</span>,
            },
            {
              key: 'item',
              header: 'Item',
              cell: item => (
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-slate-900">{item.itemName}</p>
                  <p className="truncate text-[11px] text-slate-500">{item.borrowerName} · {item.borrowerOffice}</p>
                </div>
              ),
            },
            {
              key: 'expected',
              header: 'Expected Return',
              width: '140px',
              cell: item => <span className="text-xs text-slate-600">{formatDateOnly(item.expectedReturnDate)}</span>,
            },
            {
              key: 'status',
              header: 'Status',
              width: '120px',
              cell: item => <BorrowSlipStatusBadge status={effectiveBorrowStatus(item)} />,
            },
          ]}
          emptyState={
            <EmptyState
              icon={<AlertCircle className="h-6 w-6" />}
              title="No active borrow slips"
              description="There are no borrowed items to monitor right now."
            />
          }
        />
      </Card>
    </div>
  );
}
