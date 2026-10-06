import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Building2,
  CheckCircle2,
  AlertCircle,
  RotateCcw,
  SlidersHorizontal,
  FileText,
  Activity,
  Inbox,
  User as UserIcon,
  Calendar,
} from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { Table } from '@/components/ui/Table';
import { Select } from '@/components/ui/Select';
import { SearchInput } from '@/components/ui/SearchInput';
import { EmptyState } from '@/components/ui/EmptyState';
import { Button } from '@/components/ui/Button';
import { Pagination } from '@/components/ui/Pagination';
import { StatusBadge, PriorityBadge, ClassificationBadge } from '@/components/ui/StatusBadge';
import { useDocuments } from '@/features/documents/hooks/useDocuments';
import { useOfficeLookup, useUserLookup } from '@/hooks/useLookups';
import {
  ALL_DOCUMENT_STATUSES,
  DOCUMENT_STATUS_LABELS,
  DOCUMENT_TYPE_LABELS,
} from '@/constants';
import { formatRelative, cn, formatDate } from '@/lib/utils';
import { useToast } from '@/hooks/useToast';
import { usePagination } from '@/hooks/usePagination';
import { useTableSort } from '@/hooks/useTableSort';
import type { DocumentListItem } from '@/features/documents/types/document';

const DEFAULT_FILTERS = {
  search: '',
  status: 'all',
};

const TERMINAL_STATUSES = ['archived'];

function isTerminal(status: string): boolean {
  return TERMINAL_STATUSES.includes(status);
}

function isOverdueDoc(doc: DocumentListItem): boolean {
  if (!doc.dueDate) return false;
  if (isTerminal(doc.status)) return false;
  return new Date(doc.dueDate).getTime() < Date.now();
}

export function TrackingPage() {
  const toast = useToast();
  const { items: documents } = useDocuments({ fetchAll: true });
  const officeById = useOfficeLookup();
  const userById = useUserLookup();
  const [search, setSearch] = useState(DEFAULT_FILTERS.search);
  const [statusFilter, setStatusFilter] = useState(DEFAULT_FILTERS.status);

  const { sortKey, sortDirection, toggleSort, sortFn } = useTableSort<DocumentListItem>({
    initialKey: 'updatedAt',
    initialDirection: 'desc',
  });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return documents.filter(d => {
      if (statusFilter !== 'all' && d.status !== statusFilter) return false;
      if (q) {
        const haystack = `${d.trackingNumber} ${d.title} ${d.senderName ?? ''} ${d.tags.join(' ')}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [documents, search, statusFilter]);

  const sorted = useMemo(() => sortFn(filtered), [sortFn, filtered]);

  const pagination = usePagination({ totalItems: sorted.length, initialPageSize: 10 });
  const paged = useMemo(
    () => sorted.slice(pagination.start, pagination.end),
    [sorted, pagination.start, pagination.end],
  );

  const stats = useMemo(() => {
    const active = documents.filter(d =>
      ['registered', 'received'].includes(d.status)
    ).length;
    const completed = documents.filter(d => d.status === 'archived').length;
    const overdue = documents.filter(isOverdueDoc).length;
    const awaitingReceipt = documents.filter(
      d => d.status === 'registered' && d.recipients.some(r => r.status === 'pending')
    ).length;
    return { active, completed, overdue, awaitingReceipt };
  }, [documents]);

  const hasActiveFilters =
    search !== DEFAULT_FILTERS.search || statusFilter !== DEFAULT_FILTERS.status;

  const resetFilters = () => {
    setSearch(DEFAULT_FILTERS.search);
    setStatusFilter(DEFAULT_FILTERS.status);
    pagination.reset();
    toast.info('Filters reset', 'Showing all tracked documents.');
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Document Tracking"
        description="Follow every document through Registered, Received, and Archived"
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatCard
          label="In Transit"
          value={stats.active}
          icon={<Activity className="w-4 h-4" />}
        />
        <StatCard
          label="Awaiting Receipt"
          value={stats.awaitingReceipt}
          icon={<Inbox className="w-4 h-4" />}
          hint={stats.awaitingReceipt > 0 ? 'Offices have not received' : undefined}
        />
        <StatCard
          label="Archived"
          value={stats.completed}
          icon={<CheckCircle2 className="w-4 h-4" />}
          tone="success"
        />
        <StatCard
          label="Overdue"
          value={stats.overdue}
          icon={<AlertCircle className="w-4 h-4" />}
          tone="danger"
          hint={stats.overdue > 0 ? 'Needs attention' : undefined}
        />
      </div>

      <Card padded={false} className="overflow-hidden">
        <div className="px-4 sm:px-6 py-4 border-b border-border bg-muted/40">
          <div className="flex items-center justify-between gap-3 mb-3">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-7 h-7 rounded-md bg-background border border-border text-muted-foreground flex items-center justify-center shrink-0">
                <SlidersHorizontal className="w-3.5 h-3.5" />
              </div>
              <h3 className="text-sm font-semibold text-foreground">Filters</h3>
              {hasActiveFilters && (
                <span className="text-[10px] font-semibold text-brand-700 bg-brand-50 border border-brand-200 px-1.5 py-0.5 rounded">
                  ACTIVE
                </span>
              )}
            </div>
            <span className="text-sm text-muted-foreground shrink-0">
              <span className="font-semibold text-foreground tabular-nums">{sorted.length}</span>{' '}
              {sorted.length === 1 ? 'result' : 'results'}
            </span>
          </div>

          <div className="flex flex-col lg:flex-row gap-3">
            <SearchInput
              value={search}
              onChange={v => {
                setSearch(v);
                pagination.reset();
              }}
              placeholder="Search by tracking #, title, sender, or tags…"
              className="flex-1 min-w-0"
            />
            <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-3 lg:w-auto">
              <Select
                aria-label="Filter by status"
                value={statusFilter}
                onChange={e => {
                  setStatusFilter(e.target.value);
                  pagination.reset();
                }}
                className="h-10 w-full sm:w-44"
                options={[
                  { value: 'all', label: 'All Status' },
                  ...ALL_DOCUMENT_STATUSES.map(s => ({ value: s, label: DOCUMENT_STATUS_LABELS[s] })),
                ]}
              />
              <Button
                variant="outline"
                onClick={resetFilters}
                leftIcon={<RotateCcw className="w-3.5 h-3.5" />}
                disabled={!hasActiveFilters}
                className="h-10"
              >
                Reset
              </Button>
            </div>
          </div>
        </div>

        <div className="p-3 sm:p-4">
          <Table
            data={paged}
            keyExtractor={d => d.id}
            sortKey={String(sortKey ?? '')}
            sortDirection={sortDirection}
            onSort={k => toggleSort(k as keyof DocumentListItem)}
            rowClassName={d => (isOverdueDoc(d) ? 'bg-rose-50/40' : '')}
            emptyState={
              <EmptyState
                icon={<FileText className="w-7 h-7" />}
                title="No documents to track"
                description={
                  hasActiveFilters
                    ? 'No documents match your current search and filters.'
                    : 'There are no documents in the system yet.'
                }
                action={
                  hasActiveFilters ? (
                    <Button variant="outline" onClick={resetFilters}>
                      Reset Filters
                    </Button>
                  ) : null
                }
              />
            }
            columns={[
              {
                key: 'trackingNumber',
                header: 'Tracking #',
                width: '150px',
                sortable: true,
                cell: d => (
                  <Link
                    to={`/documents/${d.id}`}
                    className="font-mono font-semibold text-brand-700 hover:underline"
                  >
                    {d.trackingNumber}
                  </Link>
                ),
              },
              {
                key: 'title',
                header: 'Document',
                sortable: true,
                cell: d => (
                  <div className="min-w-0">
                    <Link
                      to={`/documents/${d.id}`}
                      className="font-medium text-slate-900 hover:text-brand-700 line-clamp-1"
                    >
                      {d.title}
                    </Link>
                    <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                      <span className="text-[11px] text-slate-500">
                        {DOCUMENT_TYPE_LABELS[d.type]}
                      </span>
                      <span className="text-slate-300">·</span>
                      <ClassificationBadge classification={d.classification} />
                      <PriorityBadge priority={d.priority} />
                    </div>
                  </div>
                ),
              },
              {
                key: 'status',
                header: 'Status',
                width: '130px',
                sortable: true,
                cell: d => <StatusBadge status={d.status} />,
              },
              {
                key: 'recipients',
                header: 'Receiving',
                width: '175px',
                cell: d => <RecipientProgress doc={d} />,
              },
              {
                key: 'currentOfficeId',
                header: 'Current Office',
                width: '170px',
                cell: d => {
                  const office = officeById(d.currentOfficeId);
                  return (
                    <div className="flex items-center gap-1.5 text-xs min-w-0">
                      <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <div className="min-w-0">
                        <p className="text-slate-700 truncate">{office?.name ?? d.currentOfficeId}</p>
                        <p className="text-slate-400 font-mono text-[10px]">
                          {office?.code ?? d.currentOfficeId}
                        </p>
                      </div>
                    </div>
                  );
                },
              },
              {
                key: 'currentHolderId',
                header: 'Holder',
                width: '160px',
                cell: d => {
                  const holder = d.currentHolderId ? userById(d.currentHolderId) : null;
                  if (!holder) return <span className="text-xs text-slate-400">Unassigned</span>;
                  return (
                    <div className="flex items-center gap-1.5 min-w-0">
                      <UserIcon className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="text-xs text-slate-700 truncate">{holder.fullName}</span>
                    </div>
                  );
                },
              },
              {
                key: 'dueDate',
                header: 'Due',
                width: '120px',
                sortable: true,
                cell: d => {
                  const overdue = isOverdueDoc(d);
                  if (!d.dueDate) {
                    return <span className="text-xs text-slate-400">No deadline</span>;
                  }
                  return (
                    <div className="text-xs">
                      <p className={cn('whitespace-nowrap', overdue ? 'text-rose-600 font-medium' : 'text-slate-700')}>
                        {formatDate(d.dueDate, true)}
                      </p>
                      {overdue && (
                        <p className="text-[11px] text-rose-600 mt-0.5">Overdue</p>
                      )}
                    </div>
                  );
                },
              },
              {
                key: 'updatedAt',
                header: 'Updated',
                width: '150px',
                sortable: true,
                cell: d => (
                  <div className="text-xs">
                    <p className="text-slate-700 flex items-center gap-1.5 whitespace-nowrap">
                      <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      {formatDate(d.updatedAt, true)}
                    </p>
                    <p className="text-[11px] text-slate-400 mt-0.5">{formatRelative(d.updatedAt)}</p>
                  </div>
                ),
              },
            ]}
          />
        </div>

        {sorted.length > 0 && (
          <div className="px-4 py-3 border-t border-border">
            <Pagination
              page={pagination.page}
              totalPages={pagination.totalPages}
              totalItems={sorted.length}
              start={pagination.start}
              end={pagination.end}
              pageSize={pagination.pageSize}
              onPageChange={pagination.setPage}
              onPageSizeChange={pagination.setPageSize}
            />
          </div>
        )}
      </Card>
    </div>
  );
}

/**
 * Per-office receiving progress. Each recipient office is tracked
 * independently, so this is the meaningful "where is it now" signal.
 */
function RecipientProgress({ doc }: { doc: DocumentListItem }) {
  const total = doc.recipients.length;
  if (total === 0) {
    return <span className="text-xs text-slate-400">No recipients</span>;
  }
  const received = doc.recipients.filter(r => r.status === 'received').length;
  const complete = received === total;

  return (
    <div className="min-w-0">
      <div className="flex items-center justify-between text-[11px] mb-1">
        <span
          className={cn(
            'font-semibold tabular-nums',
            complete ? 'text-emerald-700' : 'text-slate-700',
          )}
        >
          {received}/{total}
        </span>
        <span className="text-slate-400">{complete ? 'All received' : 'offices'}</span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200">
        <div
          className={cn('h-full rounded-full transition-all', complete ? 'bg-emerald-500' : 'bg-brand-500')}
          style={{ width: `${Math.round((received / total) * 100)}%` }}
        />
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon,
  tone = 'default',
  hint,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  tone?: 'default' | 'success' | 'danger';
  hint?: string;
}) {
  const iconTone =
    tone === 'success'
      ? 'bg-emerald-50 text-emerald-600 border-emerald-200'
      : tone === 'danger'
        ? 'bg-rose-50 text-rose-600 border-rose-200'
        : 'bg-brand-50 text-brand-600 border-brand-200';

  return (
    <div className="group relative rounded-xl border border-border bg-card p-4 flex items-center gap-3 transition-shadow hover:shadow-sm focus-within:ring-2 focus-within:ring-ring">
      <div className={cn('w-9 h-9 rounded-lg border flex items-center justify-center shrink-0', iconTone)}>
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-2xl font-semibold text-foreground tabular-nums leading-none">{value}</p>
        <p className="text-xs text-muted-foreground mt-1 truncate">{label}</p>
        {hint && (
          <p
            className={cn(
              'text-[10px] font-medium mt-0.5',
              tone === 'danger' ? 'text-rose-600' : 'text-amber-600',
            )}
          >
            {hint}
          </p>
        )}
      </div>
    </div>
  );
}

