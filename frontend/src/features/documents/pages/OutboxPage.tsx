import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Send,
  ArrowRight,
  Building2,
  User as UserIcon,
  Calendar,
  CheckCircle2,
  Clock,
  Eye,
  PlusCircle,
  FileText,
  RotateCcw,
} from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { Table } from '@/components/ui/Table';
import { StatusBadge, PriorityBadge } from '@/components/ui/StatusBadge';
import { Badge } from '@/components/ui/Badge';
import { Tabs } from '@/components/ui/Tabs';
import { EmptyState } from '@/components/ui/EmptyState';
import { SearchInput } from '@/components/ui/SearchInput';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { useAuth, useCurrentUser } from '@/features/authentication/hooks/useAuth';
import { useDocuments } from '@/features/documents/hooks/useDocuments';
import { useOfficeLookup, useUserLookup } from '@/hooks/useLookups';
import {
  ALL_DOCUMENT_STATUSES,
  ALL_DOCUMENT_TYPES,
  DOCUMENT_STATUS_LABELS,
  DOCUMENT_TYPE_LABELS,
} from '@/constants';
import { usePagination } from '@/hooks/usePagination';
import { Pagination } from '@/components/ui/Pagination';
import { useToast } from '@/hooks/useToast';
import { formatDate, formatRelative, cn } from '@/lib/utils';

type OutboxScope = 'originated' | 'encoded' | 'all';

const DEFAULT_FILTERS = {
  search: '',
  status: 'all',
  type: 'all',
  scope: 'originated' as OutboxScope,
};

export function OutboxPage() {
  const user = useCurrentUser();
  const { hasPermission } = useAuth();
  const toast = useToast();
  const { items: documents } = useDocuments({ pageSize: 100 });
  const officeById = useOfficeLookup();
  const userById = useUserLookup();
  const [search, setSearch] = useState(DEFAULT_FILTERS.search);
  const [statusFilter, setStatusFilter] = useState(DEFAULT_FILTERS.status);
  const [typeFilter, setTypeFilter] = useState(DEFAULT_FILTERS.type);
  const [scope, setScope] = useState<OutboxScope>(DEFAULT_FILTERS.scope);
  const [tab, setTab] = useState('active');

  const myOutbox = useMemo(() => {
    return documents.filter(d => {
      if (scope === 'originated') {
        return d.originatingOfficeId === user.officeId;
      }
      if (scope === 'encoded') {
        return d.encodedById === user.id;
      }
      return (
        d.originatingOfficeId === user.officeId ||
        d.encodedById === user.id ||
        d.destinationsAllOffices ||
        d.recipients.some(r => r.officeId === user.officeId) ||
        d.currentOfficeId === user.officeId
      );
    });
  }, [documents, user.officeId, user.id, scope]);

  const counts = useMemo(() => {
    const inProgress = myOutbox.filter(d =>
      ['registered', 'received'].includes(d.status)
    ).length;
    const completed = myOutbox.filter(d => d.status === 'archived').length;
    // Still awaiting a recipient office to receive it.
    const actionRequired = myOutbox.filter(
      d => d.status === 'registered' && d.recipients.some(r => r.status === 'pending')
    ).length;
    return {
      all: myOutbox.length,
      active: inProgress,
      completed,
      action: actionRequired,
    };
  }, [myOutbox]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return myOutbox.filter(d => {
      if (tab === 'active' && !['registered', 'received'].includes(d.status))
        return false;
      if (tab === 'completed' && d.status !== 'archived')
        return false;
      if (tab === 'action' && !(d.status === 'registered' && d.recipients.some(r => r.status === 'pending')))
        return false;
      if (statusFilter !== 'all' && d.status !== statusFilter) return false;
      if (typeFilter !== 'all' && d.type !== typeFilter) return false;
      if (q) {
        const haystack = `${d.trackingNumber} ${d.title} ${d.senderName ?? ''} ${d.tags.join(' ')}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [myOutbox, tab, search, statusFilter, typeFilter]);

  const pagination = usePagination({ totalItems: filtered.length, initialPageSize: 10 });
  const paged = useMemo(
    () => filtered.slice(pagination.start, pagination.end),
    [filtered, pagination.start, pagination.end]
  );

  const reset = () => {
    setSearch(DEFAULT_FILTERS.search);
    setStatusFilter(DEFAULT_FILTERS.status);
    setTypeFilter(DEFAULT_FILTERS.type);
    setScope(DEFAULT_FILTERS.scope);
    setTab('active');
    pagination.reset();
    toast.info('Filters reset', 'Showing all sent documents.');
  };

  const hasFilters =
    search !== DEFAULT_FILTERS.search ||
    statusFilter !== DEFAULT_FILTERS.status ||
    typeFilter !== DEFAULT_FILTERS.type ||
    scope !== DEFAULT_FILTERS.scope;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Outbox"
        description="Documents originated, encoded, or forwarded by your office"
        actions={
          <div className="flex items-center gap-2">
            {hasPermission('documents.register') && (
              <Link to="/documents/register">
                <Button leftIcon={<PlusCircle className="w-4 h-4" />}>Register Document</Button>
              </Link>
            )}
            <Link to="/documents">
              <Button variant="outline">All Documents</Button>
            </Link>
          </div>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <OutboxStat
          icon={<Clock className="w-4 h-4" />}
          label="In Progress"
          value={counts.active}
          accent="amber"
        />
        <OutboxStat
          icon={<CheckCircle2 className="w-4 h-4" />}
          label="Completed"
          value={counts.completed}
          accent="emerald"
        />
        <OutboxStat
          icon={<RotateCcw className="w-4 h-4" />}
          label="Action Required"
          value={counts.action}
          accent="rose"
        />
        <OutboxStat
          icon={<FileText className="w-4 h-4" />}
          label="Total Outgoing"
          value={counts.all}
          accent="indigo"
        />
      </div>

      <Card padded={false}>
        <div className="px-5 pt-4 border-b border-slate-200">
          <Tabs
            value={tab}
            onChange={setTab}
            items={[
              { id: 'active', label: 'In Progress', count: counts.active },
              { id: 'action', label: 'Awaiting Receipt', count: counts.action },
              { id: 'completed', label: 'Completed', count: counts.completed },
              { id: 'all', label: 'All', count: counts.all },
            ]}
          />
        </div>

        <div className="p-4 border-b border-slate-200 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Search by tracking #, title, sender, tags…"
            className="sm:col-span-2"
          />
          <Select
            value={statusFilter}
            onChange={e => { setStatusFilter(e.target.value); pagination.reset(); }}
            options={[
              { value: 'all', label: 'All Status' },
              ...ALL_DOCUMENT_STATUSES.map(s => ({ value: s, label: DOCUMENT_STATUS_LABELS[s] })),
            ]}
          />
          <Select
            value={typeFilter}
            onChange={e => { setTypeFilter(e.target.value); pagination.reset(); }}
            options={[
              { value: 'all', label: 'All Types' },
              ...ALL_DOCUMENT_TYPES.map(t => ({ value: t, label: DOCUMENT_TYPE_LABELS[t] })),
            ]}
          />
        </div>

        <div className="px-4 py-3 border-b border-slate-200 flex items-center gap-3 flex-wrap bg-slate-50/50">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Scope</span>
          <div className="flex items-center gap-1.5 flex-wrap">
            <ScopeButton active={scope === 'originated'} onClick={() => setScope('originated')}>
              My office originated
            </ScopeButton>
            <ScopeButton active={scope === 'encoded'} onClick={() => setScope('encoded')}>
              I encoded
            </ScopeButton>
            <ScopeButton active={scope === 'all'} onClick={() => setScope('all')}>
              All accessible
            </ScopeButton>
          </div>
          {hasFilters && (
            <Button variant="ghost" size="sm" onClick={reset} className="ml-auto">
              Reset filters
            </Button>
          )}
          <span className="ml-auto text-xs text-slate-500">
            <span className="font-semibold text-slate-900">{filtered.length}</span>{' '}
            {filtered.length === 1 ? 'document' : 'documents'}
          </span>
        </div>

        <Table
          data={paged}
          keyExtractor={d => d.id}
          emptyState={
            <EmptyState
              icon={<Send className="w-7 h-7" />}
              title={hasFilters ? 'No matching documents' : 'Outbox is empty'}
              description={
                hasFilters
                  ? 'No documents match the current filters.'
                  : 'Documents originated or encoded by your office will appear here.'
              }
              action={
                hasFilters ? (
                  <Button variant="outline" onClick={reset}>
                    Reset filters
                  </Button>
                ) : hasPermission('documents.register') ? (
                  <Link to="/documents/register">
                    <Button leftIcon={<PlusCircle className="w-4 h-4" />}>Register Document</Button>
                  </Link>
                ) : null
              }
            />
          }
          columns={[
            {
              key: 'trackingNumber',
              header: 'Tracking #',
              width: '160px',
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
              cell: d => (
                <div>
                  <Link
                    to={`/documents/${d.id}`}
                    className="font-medium text-slate-900 hover:text-brand-700 line-clamp-1"
                  >
                    {d.title}
                  </Link>
                  <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                    <Badge variant="slate" size="sm">{DOCUMENT_TYPE_LABELS[d.type]}</Badge>
                    <PriorityBadge priority={d.priority} />
                  </div>
                </div>
              ),
            },
            {
              key: 'route',
              header: 'Route',
              cell: d => {
                const fromOffice = d.originatingOfficeId ? officeById(d.originatingOfficeId) : null;
                const fromLabel = fromOffice?.code ?? d.originatingOfficeName;
                const toLabel = d.destinationsAllOffices
                  ? 'All Offices'
                  : d.recipients.map(r => r.office.code).join(', ');
                return (
                  <div className="flex items-center gap-1.5 text-xs">
                    <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="font-mono text-slate-700 truncate max-w-[110px]">
                      {fromLabel || '—'}
                    </span>
                    <ArrowRight className="w-3 h-3 text-slate-400" />
                    <span className="font-mono text-slate-900 font-semibold truncate max-w-[110px]">
                      {toLabel || '—'}
                    </span>
                  </div>
                );
              },
            },
            {
              key: 'destination',
              header: 'Destination',
              cell: d => {
                if (d.destinationsAllOffices)
                  return (
                    <span className="inline-flex text-xs font-medium text-slate-700">
                      All Offices
                    </span>
                  );
                if (d.recipients.length === 0)
                  return <span className="text-xs text-slate-400">Not assigned</span>;
                return (
                  <div className="flex flex-col gap-0.5">
                    {d.recipients.map(r => (
                      <p key={r.officeId} className="text-xs text-slate-700 truncate max-w-[200px]">
                        {r.office.code} — {r.office.name}
                      </p>
                    ))}
                  </div>
                );
              },
            },
            {
              key: 'encodedBy',
              header: 'Encoded By',
              width: '160px',
              cell: d => {
                const encoder = userById(d.encodedById);
                if (!encoder) return <span className="text-xs text-slate-400">—</span>;
                return (
                  <div className="flex items-center gap-1.5">
                    <UserIcon className="w-3.5 h-3.5 text-slate-400" />
                    <span className="text-xs text-slate-700 truncate">{encoder.fullName}</span>
                  </div>
                );
              },
            },
            {
              key: 'date',
              header: 'Date',
              width: '130px',
              cell: d => (
                <div className="text-xs">
                  <p className="text-slate-700 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    {formatDate(d.dateReceived ?? d.createdAt)}
                  </p>
                  <p className="text-slate-400 text-[10px] mt-0.5">
                    {formatRelative(d.updatedAt)}
                  </p>
                </div>
              ),
            },
            {
              key: 'status',
              header: 'Status',
              width: '150px',
              cell: d => <StatusBadge status={d.status} />,
            },
            {
              key: 'actions',
              header: '',
              width: '60px',
              align: 'right',
              cell: d => (
                <Link
                  to={`/documents/${d.id}`}
                  className="p-1.5 inline-flex text-slate-500 hover:text-brand-700 hover:bg-brand-50 rounded"
                  aria-label="View"
                >
                  <Eye className="w-4 h-4" />
                </Link>
              ),
            },
          ]}
        />

        <div className="px-4 py-3 border-t border-slate-200">
          <Pagination
            page={pagination.page}
            totalPages={pagination.totalPages}
            totalItems={filtered.length}
            start={pagination.start}
            end={pagination.end}
            pageSize={pagination.pageSize}
            onPageChange={pagination.setPage}
            onPageSizeChange={pagination.setPageSize}
          />
        </div>
      </Card>
    </div>
  );
}

function OutboxStat({
  icon,
  label,
  value,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  accent: 'amber' | 'emerald' | 'rose' | 'indigo';
}) {
  return (
    <div className="bg-white border border-slate-200 rounded-lg p-3 flex items-center gap-3">
      <div
        className={cn(
          'w-9 h-9 rounded-md border flex items-center justify-center',
          accent === 'amber' && 'bg-amber-50 text-amber-700 border-amber-200',
          accent === 'emerald' && 'bg-emerald-50 text-emerald-700 border-emerald-200',
          accent === 'rose' && 'bg-rose-50 text-rose-700 border-rose-200',
          accent === 'indigo' && 'bg-indigo-50 text-indigo-700 border-indigo-200'
        )}
      >
        {icon}
      </div>
      <div>
        <p className="text-xl font-semibold text-slate-900 tabular-nums">{value}</p>
        <p className="text-xs text-slate-500">{label}</p>
      </div>
    </div>
  );
}

function ScopeButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'px-2.5 h-7 text-xs font-medium rounded-md border transition-colors',
        active
          ? 'bg-brand-50 text-brand-700 border-brand-200'
          : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
      )}
    >
      {children}
    </button>
  );
}
