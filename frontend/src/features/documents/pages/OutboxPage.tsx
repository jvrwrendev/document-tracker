import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Calendar,
  CheckCircle2,
  Clock,
  Eye,
  FileText,
  RotateCcw,
  Send,
  User as UserIcon,
} from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { Table } from '@/components/ui/Table';
import { PriorityBadge } from '@/components/ui/StatusBadge';
import { Badge } from '@/components/ui/Badge';
import { Tabs } from '@/components/ui/Tabs';
import { EmptyState } from '@/components/ui/EmptyState';
import { SearchInput } from '@/components/ui/SearchInput';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { Pagination } from '@/components/ui/Pagination';
import { useAuth, useCurrentUser } from '@/features/authentication/hooks/useAuth';
import { useOutboxDocuments } from '@/features/documents/hooks/useOfficeDocuments';
import { useUserLookup } from '@/hooks/useLookups';
import { useToast } from '@/hooks/useToast';
import { useSearch } from '@/hooks/useSearch';
import {
  ALL_DOCUMENT_STATUSES,
  ALL_DOCUMENT_TYPES,
  DOCUMENT_STATUS_LABELS,
  DOCUMENT_TYPE_LABELS,
} from '@/constants';
import { formatDate, formatRelative, cn } from '@/lib/utils';
import {
  ReceiptProgress,
  ReceiptStateBadge,
} from '@/features/documents/components/ReceiptProgress';
import { RecipientOfficeList } from '@/features/documents/components/RecipientOfficeList';
import { useDocumentRegistrationModal } from '@/features/documents/context/DocumentRegistrationModalContext';
import {
  calculateReceiptProgress,
  type DocumentPriority,
  type DocumentReceiptState,
  type DocumentStatus,
} from '@/features/documents/types/document';
import type { DocumentType } from '@/types';

type OutboxTab = 'all' | DocumentReceiptState;

export function OutboxPage() {
  const user = useCurrentUser();
  const { hasPermission } = useAuth();
  const toast = useToast();
  const { openRegistration } = useDocumentRegistrationModal();
  const userById = useUserLookup();
  const { query: search, setQuery: setSearch, debounced } = useSearch({
    debounceMs: 250,
  });
  const [tab, setTab] = useState<OutboxTab>('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const { items: documents, total, summary, loading, error } = useOutboxDocuments({
    page,
    pageSize,
    search: debounced || undefined,
    status: statusFilter === 'all' ? undefined : (statusFilter as DocumentStatus),
    typeCode: typeFilter === 'all' ? undefined : (typeFilter as DocumentType),
    priority: priorityFilter === 'all' ? undefined : (priorityFilter as DocumentPriority),
    receiptState: tab === 'all' ? undefined : tab,
    sortBy: 'createdAt',
    order: 'desc',
  });

  useEffect(() => {
    if (error) toast.error('Failed to load outbox', error);
  }, [error, toast]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const start = (safePage - 1) * pageSize;
  const end = Math.min(start + pageSize, total);

  useEffect(() => {
    if (page !== safePage) setPage(safePage);
  }, [page, safePage]);

  const hasFilters =
    search !== '' || statusFilter !== 'all' || typeFilter !== 'all' || priorityFilter !== 'all';

  const resetFilters = () => {
    setSearch('');
    setStatusFilter('all');
    setTypeFilter('all');
    setPriorityFilter('all');
    setTab('all');
    setPage(1);
  };

  const changeTab = (next: OutboxTab) => {
    setTab(next);
    setPage(1);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Outbox"
        description="Documents originating from your office or registered by you"
        actions={
          <div className="flex items-center gap-2">
            {hasPermission('documents.create') && (
              <Button leftIcon={<Send className="h-4 w-4" />} onClick={openRegistration}>
                Register Document
              </Button>
            )}
            <Link to="/documents">
              <Button variant="outline">All Documents</Button>
            </Link>
          </div>
        }
      />

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <OutboxStat icon={<FileText className="h-4 w-4" />} label="Total Outgoing" value={summary.totalOutgoing} accent="indigo" />
        <OutboxStat icon={<Clock className="h-4 w-4" />} label="Awaiting Receipt" value={summary.awaitingReceipt} accent="amber" />
        <OutboxStat icon={<RotateCcw className="h-4 w-4" />} label="Partially Received" value={summary.partiallyReceived} accent="blue" />
        <OutboxStat icon={<CheckCircle2 className="h-4 w-4" />} label="Fully Received" value={summary.fullyReceived} accent="emerald" />
      </div>

      <Card padded={false}>
        <div className="overflow-x-auto border-b border-slate-200 px-5 pt-4">
          <Tabs
            className="min-w-max"
            value={tab}
            onChange={value => changeTab(value as OutboxTab)}
            items={[
              { id: 'all', label: 'Total Outgoing', count: summary.totalOutgoing },
              { id: 'awaiting', label: 'Awaiting Receipt', count: summary.awaitingReceipt },
              { id: 'partial', label: 'Partially Received', count: summary.partiallyReceived },
              { id: 'fully_received', label: 'Fully Received', count: summary.fullyReceived },
            ]}
          />
        </div>

        <div className="grid grid-cols-1 gap-3 border-b border-slate-200 p-4 sm:grid-cols-2 lg:grid-cols-4">
          <SearchInput
            value={search}
            onChange={value => {
              setSearch(value);
              setPage(1);
            }}
            placeholder="Search by tracking #, title, sender, tags…"
            className="sm:col-span-2"
          />
          <Select
            value={statusFilter}
            onChange={event => {
              setStatusFilter(event.target.value);
              setPage(1);
            }}
            options={[
              { value: 'all', label: 'All Status' },
              ...ALL_DOCUMENT_STATUSES.map(status => ({ value: status, label: DOCUMENT_STATUS_LABELS[status] })),
            ]}
          />
          <Select
            value={typeFilter}
            onChange={event => {
              setTypeFilter(event.target.value);
              setPage(1);
            }}
            options={[
              { value: 'all', label: 'All Types' },
              ...ALL_DOCUMENT_TYPES.map(type => ({ value: type, label: DOCUMENT_TYPE_LABELS[type] })),
            ]}
          />
          <Select
            value={priorityFilter}
            onChange={event => {
              setPriorityFilter(event.target.value);
              setPage(1);
            }}
            options={[
              { value: 'all', label: 'All Priorities' },
              { value: 'urgent', label: 'Urgent' },
              { value: 'high', label: 'High' },
              { value: 'normal', label: 'Normal' },
              { value: 'low', label: 'Low' },
            ]}
          />
          {hasFilters && (
            <Button variant="ghost" size="sm" onClick={resetFilters} leftIcon={<RotateCcw className="h-3.5 w-3.5" />}>
              Reset filters
            </Button>
          )}
        </div>

        <Table
          data={documents}
          keyExtractor={document => document.id}
          emptyState={
            <EmptyState
              icon={<Send className="h-7 w-7" />}
              title={!user.officeId ? 'No office assigned' : loading ? 'Loading outbox…' : hasFilters ? 'No matching documents' : 'Outbox is empty'}
              description={
                hasFilters
                  ? 'No outgoing documents match the current filters.'
                  : 'Documents originating from your office or registered by you will appear here.'
              }
              action={
                hasFilters ? (
                  <Button variant="outline" onClick={resetFilters}>Reset filters</Button>
                ) : hasPermission('documents.create') ? (
                  <Button leftIcon={<Send className="h-4 w-4" />} onClick={openRegistration}>
                    Register Document
                  </Button>
                ) : null
              }
            />
          }
          columns={[
            {
              key: 'trackingNumber',
              header: 'Tracking #',
              width: '160px',
              cell: document => (
                <Link to={`/documents/${document.id}`} className="font-mono font-semibold text-brand-700 hover:underline">
                  {document.trackingNumber}
                </Link>
              ),
            },
            {
              key: 'title',
              header: 'Document',
              cell: document => (
                <div>
                  <Link to={`/documents/${document.id}`} className="line-clamp-1 font-medium text-slate-900 hover:text-brand-700">
                    {document.title}
                  </Link>
                  <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
                    <Badge variant="slate" size="sm">{DOCUMENT_TYPE_LABELS[document.type]}</Badge>
                    <PriorityBadge priority={document.priority} />
                  </div>
                </div>
              ),
            },
            {
              key: 'recipients',
              header: 'Recipient Offices',
              width: '250px',
              cell: document => (
                <RecipientOfficeList
                  recipients={document.recipients}
                  userById={userById}
                  progress={document.receiptProgress ?? calculateReceiptProgress(document.recipients)}
                  documentId={document.id}
                />
              ),
            },
            {
              key: 'sentBy',
              header: 'Sent By',
              width: '160px',
              cell: document => {
                const encoder = userById(document.encodedById);
                if (!encoder) return <span className="text-xs text-slate-400">—</span>;
                return (
                  <div className="flex items-center gap-1.5">
                    <UserIcon className="h-3.5 w-3.5 text-slate-400" />
                    <span className="truncate text-xs text-slate-700">{encoder.fullName}</span>
                  </div>
                );
              },
            },
            {
              key: 'dateSent',
              header: 'Date Sent',
              width: '130px',
              cell: document => (
                <div className="text-xs">
                  <p className="flex items-center gap-1.5 text-slate-700">
                    <Calendar className="h-3.5 w-3.5 text-slate-400" />
                    {formatDate(document.createdAt)}
                  </p>
                  <p className="mt-0.5 text-[10px] text-slate-400">{formatRelative(document.createdAt)}</p>
                </div>
              ),
            },
            {
              key: 'progress',
              header: 'Receipt Progress',
              width: '210px',
              cell: document => (
                <ReceiptProgress progress={document.receiptProgress ?? calculateReceiptProgress(document.recipients)} />
              ),
            },
            {
              key: 'status',
              header: 'Status',
              width: '170px',
              cell: document => {
                const progress = document.receiptProgress ?? calculateReceiptProgress(document.recipients);
                return (
                  <div className="flex flex-wrap items-center gap-1">
                    <ReceiptStateBadge state={progress.state} />
                    {document.status === 'archived' && <Badge variant="slate" size="sm">Archived</Badge>}
                  </div>
                );
              },
            },
            {
              key: 'actions',
              header: 'Actions',
              width: '70px',
              align: 'right',
              cell: document => (
                <Link
                  to={`/documents/${document.id}`}
                  className="inline-flex rounded p-1.5 text-slate-500 hover:bg-brand-50 hover:text-brand-700"
                  aria-label="View document"
                >
                  <Eye className="h-4 w-4" />
                </Link>
              ),
            },
          ]}
        />

        {total > 0 && (
          <div className="border-t border-slate-200 px-4 py-3">
            <Pagination
              page={safePage}
              totalPages={totalPages}
              totalItems={total}
              start={start}
              end={end}
              pageSize={pageSize}
              onPageChange={setPage}
              onPageSizeChange={setPageSize}
            />
          </div>
        )}
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
  accent: 'amber' | 'emerald' | 'blue' | 'indigo';
}) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white p-3">
      <div className={cn(
        'flex h-9 w-9 items-center justify-center rounded-md border',
        accent === 'amber' && 'border-amber-200 bg-amber-50 text-amber-700',
        accent === 'emerald' && 'border-emerald-200 bg-emerald-50 text-emerald-700',
        accent === 'blue' && 'border-blue-200 bg-blue-50 text-blue-700',
        accent === 'indigo' && 'border-indigo-200 bg-indigo-50 text-indigo-700',
      )}>
        {icon}
      </div>
      <div>
        <p className="text-xl font-semibold tabular-nums text-slate-900">{value}</p>
        <p className="text-xs text-slate-500">{label}</p>
      </div>
    </div>
  );
}
