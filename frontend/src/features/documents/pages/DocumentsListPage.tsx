import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  FileText,
  PlusCircle,
  Download,
  Eye,
  MoreVertical,
  RotateCcw,
  CheckCircle2,
  SlidersHorizontal,
} from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Table } from '@/components/ui/Table';
import { PriorityBadge, ClassificationBadge } from '@/components/ui/StatusBadge';
import { Badge } from '@/components/ui/Badge';
import { SearchInput } from '@/components/ui/SearchInput';
import { Select } from '@/components/ui/Select';
import { Pagination } from '@/components/ui/Pagination';
import { EmptyState } from '@/components/ui/EmptyState';
import { Dropdown } from '@/components/ui/Dropdown';
import { useAuth } from '@/features/authentication/hooks/useAuth';
import { useToast } from '@/hooks/useToast';
import { useDocuments } from '@/features/documents/hooks/useDocuments';
import { documentsService } from '@/features/documents/services/documents.service';
import { useOfficeDirectory } from '@/features/system-admin/offices/hooks/useOffices';
import { useOfficeLookup, useUserLookup } from '@/hooks/useLookups';
import { useSearch } from '@/hooks/useSearch';
import { ReceiptProgress, ReceiptStateBadge } from '@/features/documents/components/ReceiptProgress';
import { RecipientOfficeList } from '@/features/documents/components/RecipientOfficeList';
import {
  ALL_DOCUMENT_TYPES,
  ALL_CLASSIFICATIONS,
  DOCUMENT_TYPE_LABELS,
  DOCUMENT_CLASSIFICATION_LABELS,
} from '@/constants';
import { formatDate, formatRelative, toCsv, downloadCsv } from '@/lib/utils';
import {
  calculateReceiptProgress,
  type DocumentListItem,
  type DocumentReceiptState,
  type DocumentSortBy,
} from '@/features/documents/types/document';

const STATUS_FILTER_OPTIONS = [
  { value: 'all', label: 'All Status' },
  { value: 'awaiting', label: 'Awaiting Receipt' },
  { value: 'partial', label: 'Partially Received' },
  { value: 'fully_received', label: 'Fully Received' },
  { value: 'archived', label: 'Archived' },
];

const DEFAULT_FILTERS = {
  status: 'all',
  type: 'all',
  classification: 'all',
  office: 'all',
  priority: 'all',
  source: 'all',
};

export function DocumentsListPage() {
  const { hasPermission } = useAuth();
  const toast = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const { offices: officeDirectory } = useOfficeDirectory();
  const officeById = useOfficeLookup();
  const userById = useUserLookup();

  const requestedStatus = searchParams.get('status') ?? DEFAULT_FILTERS.status;
  const initialStatus = STATUS_FILTER_OPTIONS.some(option => option.value === requestedStatus)
    ? requestedStatus
    : DEFAULT_FILTERS.status;

  const { query: search, setQuery: setSearch, debounced } = useSearch({ debounceMs: 250 });
  const [statusFilter, setStatusFilter] = useState(initialStatus);
  const [typeFilter, setTypeFilter] = useState(DEFAULT_FILTERS.type);
  const [classificationFilter, setClassificationFilter] = useState(DEFAULT_FILTERS.classification);
  const [officeFilter, setOfficeFilter] = useState(DEFAULT_FILTERS.office);
  const [priorityFilter, setPriorityFilter] = useState(DEFAULT_FILTERS.priority);
  const [sourceFilter, setSourceFilter] = useState(DEFAULT_FILTERS.source);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [sortKey, setSortKey] = useState<DocumentSortBy>('createdAt');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const filterInitialized = useRef(false);

  const buildFilters = (
    next: {
      page: number;
      pageSize: number;
      search: string;
      statusFilter: string;
      typeFilter: string;
      classificationFilter: string;
      officeFilter: string;
      priorityFilter: string;
      sourceFilter: string;
      sortKey: DocumentSortBy;
      sortDirection: 'asc' | 'desc';
    },
  ) => {
    const receiptState =
      next.statusFilter === 'awaiting' || next.statusFilter === 'partial' || next.statusFilter === 'fully_received'
        ? (next.statusFilter as DocumentReceiptState)
        : undefined;
    const activeStatuses = ['registered', 'received', 'approved', 'rejected', 'released'] as const;
    return {
      page: next.page,
      pageSize: next.pageSize,
      search: next.search || undefined,
      status: next.statusFilter === 'archived' ? ('archived' as const) : undefined,
      statuses: receiptState ? [...activeStatuses] : undefined,
      receiptState,
      typeCode: next.typeFilter === 'all' ? undefined : (next.typeFilter as never),
      classification: next.classificationFilter === 'all' ? undefined : (next.classificationFilter as never),
      currentOfficeId: next.officeFilter === 'all' ? undefined : next.officeFilter,
      priority: next.priorityFilter === 'all' ? undefined : (next.priorityFilter as never),
      source: next.sourceFilter === 'all' ? undefined : (next.sourceFilter as never),
      sortBy: next.sortKey,
      order: next.sortDirection,
    };
  };

  const initialFilters = useMemo(
    () =>
      buildFilters({
        page: 1,
        pageSize: 10,
        search: '',
        statusFilter: initialStatus,
        typeFilter: DEFAULT_FILTERS.type,
        classificationFilter: DEFAULT_FILTERS.classification,
        officeFilter: DEFAULT_FILTERS.office,
        priorityFilter: DEFAULT_FILTERS.priority,
        sourceFilter: DEFAULT_FILTERS.source,
        sortKey: 'createdAt',
        sortDirection: 'desc',
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const { items: documents, total, loading, error, setFilters } = useDocuments(initialFilters);

  useEffect(() => {
    if (error) toast.error('Failed to load documents', error);
  }, [error, toast]);

  useEffect(() => {
    if (!filterInitialized.current) return;
    setFilters(
      buildFilters({
        page,
        pageSize,
        search: debounced,
        statusFilter,
        typeFilter,
        classificationFilter,
        officeFilter,
        priorityFilter,
        sourceFilter,
        sortKey,
        sortDirection,
      }),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, pageSize, debounced, statusFilter, typeFilter, classificationFilter, officeFilter, priorityFilter, sourceFilter, sortKey, sortDirection, setFilters]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const start = (safePage - 1) * pageSize;
  const end = Math.min(start + pageSize, total);

  useEffect(() => {
    if (page !== safePage) setPage(safePage);
  }, [page, safePage]);

  useEffect(() => {
    if (!filterInitialized.current) {
      filterInitialized.current = true;
      return;
    }
    setSearchParams(prev => {
      const nextParams = new URLSearchParams(prev);
      if (statusFilter === 'all') nextParams.delete('status');
      else nextParams.set('status', statusFilter);
      return nextParams;
    }, { replace: true });
  }, [statusFilter, setSearchParams]);

  const officeOptions = useMemo(
    () =>
      officeDirectory.map(office => ({
        value: office.id,
        label: `${office.code} — ${office.name}`,
      })),
    [officeDirectory],
  );

  const hasActiveFilters =
    search !== '' ||
    statusFilter !== DEFAULT_FILTERS.status ||
    typeFilter !== DEFAULT_FILTERS.type ||
    classificationFilter !== DEFAULT_FILTERS.classification ||
    officeFilter !== DEFAULT_FILTERS.office ||
    priorityFilter !== DEFAULT_FILTERS.priority ||
    sourceFilter !== DEFAULT_FILTERS.source;

  const resetFilters = () => {
    setSearch('');
    setStatusFilter(DEFAULT_FILTERS.status);
    setTypeFilter(DEFAULT_FILTERS.type);
    setClassificationFilter(DEFAULT_FILTERS.classification);
    setOfficeFilter(DEFAULT_FILTERS.office);
    setPriorityFilter(DEFAULT_FILTERS.priority);
    setSourceFilter(DEFAULT_FILTERS.source);
    setPage(1);
    toast.info('Filters reset', 'Showing all documents.');
  };

  const onSort = (key: string) => {
    const sortableKeys: DocumentSortBy[] = ['trackingNumber', 'title', 'createdAt'];
    if (!sortableKeys.includes(key as DocumentSortBy)) return;
    const nextKey = key as DocumentSortBy;
    if (sortKey === nextKey) {
      setSortDirection(dir => (dir === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(nextKey);
      setSortDirection(nextKey === 'createdAt' ? 'desc' : 'asc');
    }
    setPage(1);
  };

  const handleExport = async () => {
    if (total === 0) {
      toast.warning('Nothing to export', 'No documents match the current filters.');
      return;
    }
    try {
      const exportFilters = buildFilters({
        page: 1,
        pageSize: total,
        search: debounced,
        statusFilter,
        typeFilter,
        classificationFilter,
        officeFilter,
        priorityFilter,
        sourceFilter,
        sortKey,
        sortDirection,
      });
      const response = await documentsService.list({ ...exportFilters, fetchAll: true });
      const rows = response.items.map(d => {
        const progress = d.receiptProgress ?? calculateReceiptProgress(d.recipients);
        const from = d.source === 'external'
          ? d.senderName ?? 'External'
          : officeById(d.originatingOfficeId)?.name ?? d.originatingOfficeName ?? '—';
        const recipients = d.recipients
          .map(r => `${r.office?.name ?? r.officeName ?? 'Deleted office'} (${r.status})`)
          .join('; ');
        const receiptStateLabel =
          progress.state === 'awaiting' ? 'Awaiting Receipt'
            : progress.state === 'partial' ? 'Partially Received'
              : 'Fully Received';
        return {
          trackingNumber: d.trackingNumber,
          title: d.title,
          type: DOCUMENT_TYPE_LABELS[d.type],
          classification: DOCUMENT_CLASSIFICATION_LABELS[d.classification],
          originatingOffice: from,
          recipientOffices: recipients,
          dateRegistered: formatDate(d.createdAt),
          receiptProgress: `${progress.received}/${progress.total}`,
          status: d.status === 'archived' ? 'Archived' : receiptStateLabel,
        };
      });
      const csv = toCsv(rows, [
        { key: 'trackingNumber', header: 'Tracking Number' },
        { key: 'title', header: 'Title' },
        { key: 'type', header: 'Type' },
        { key: 'classification', header: 'Classification' },
        { key: 'originatingOffice', header: 'Originating Office' },
        { key: 'recipientOffices', header: 'Recipient Offices' },
        { key: 'dateRegistered', header: 'Date Registered' },
        { key: 'receiptProgress', header: 'Receipt Progress' },
        { key: 'status', header: 'Status' },
      ]);
      const stamp = new Date().toISOString().slice(0, 10);
      downloadCsv(`documents_${stamp}.csv`, csv);
      toast.success('Export complete', `${rows.length} document${rows.length === 1 ? '' : 's'} exported.`);
    } catch {
      toast.error('Export failed', 'Could not export documents.');
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Documents"
        description="Manage and track all documents in the system"
        actions={
          <div className="flex items-center gap-2">
            {hasPermission('documents.register') ? (
              <Link to="/documents/register">
                <Button leftIcon={<PlusCircle className="w-4 h-4" />}>Register Document</Button>
              </Link>
            ) : null}
          </div>
        }
      />

      <Card padded={false}>
        <div className="px-4 sm:px-5 py-4 border-b border-slate-200">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-7 h-7 rounded-md bg-brand-50 text-brand-700 border border-brand-200 flex items-center justify-center">
              <SlidersHorizontal className="w-3.5 h-3.5" />
            </div>
            <h3 className="text-sm font-semibold text-slate-900">Filters &amp; Search</h3>
            {hasActiveFilters && (
              <span className="text-[10px] font-semibold text-brand-700 bg-brand-50 border border-brand-200 px-1.5 py-0.5 rounded">
                ACTIVE
              </span>
            )}
            <span className="ml-auto inline-flex items-center gap-1.5 text-xs text-slate-600">
              <CheckCircle2 className="w-3.5 h-3.5 text-brand-600" />
              <span>
                <span className="font-semibold text-slate-900">{total}</span>{' '}
                {total === 1 ? 'document' : 'documents'} found
              </span>
            </span>
          </div>

          <div className="mb-3">
            <SearchInput
              value={search}
              onChange={value => {
                setSearch(value);
                setPage(1);
              }}
              placeholder="Search by tracking number, title, sender, or tags…"
              className="h-11"
              inputClassName="h-11 text-base"
            />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <Select
              label="Status"
              value={statusFilter}
              onChange={e => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              options={STATUS_FILTER_OPTIONS}
            />
            <Select
              label="Type"
              value={typeFilter}
              onChange={e => {
                setTypeFilter(e.target.value);
                setPage(1);
              }}
              options={[
                { value: 'all', label: 'All Types' },
                ...ALL_DOCUMENT_TYPES.map(t => ({ value: t, label: DOCUMENT_TYPE_LABELS[t] })),
              ]}
            />
            <Select
              label="Classification"
              value={classificationFilter}
              onChange={e => {
                setClassificationFilter(e.target.value);
                setPage(1);
              }}
              options={[
                { value: 'all', label: 'All Classifications' },
                ...ALL_CLASSIFICATIONS.map(c => ({ value: c, label: DOCUMENT_CLASSIFICATION_LABELS[c] })),
              ]}
            />
            <Select
              label="Office"
              value={officeFilter}
              onChange={e => {
                setOfficeFilter(e.target.value);
                setPage(1);
              }}
              options={[{ value: 'all', label: 'All Offices' }, ...officeOptions]}
            />
            <Select
              label="Priority"
              value={priorityFilter}
              onChange={e => {
                setPriorityFilter(e.target.value);
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
            <Select
              label="Source"
              value={sourceFilter}
              onChange={e => {
                setSourceFilter(e.target.value);
                setPage(1);
              }}
              options={[
                { value: 'all', label: 'All Sources' },
                { value: 'internal', label: 'Internal' },
                { value: 'external', label: 'External' },
              ]}
            />
          </div>

          <div className="mt-4 flex items-center gap-2 flex-wrap">
            <Button
              variant="outline"
              onClick={resetFilters}
              leftIcon={<RotateCcw className="w-3.5 h-3.5" />}
              disabled={!hasActiveFilters}
              size="sm"
            >
              Reset
            </Button>
            <Button
              variant="primary"
              onClick={() => void handleExport()}
              leftIcon={<Download className="w-3.5 h-3.5" />}
              disabled={total === 0}
              size="sm"
            >
              Export Results
            </Button>
            {hasActiveFilters && (
              <span className="text-xs text-slate-500 ml-auto">
                Showing {total === 0 ? 0 : start + 1}–{end}
              </span>
            )}
          </div>
        </div>

        <Table
          data={documents}
          keyExtractor={d => d.id}
          sortKey={sortKey}
          sortDirection={sortDirection}
          onSort={onSort}
          compact
          emptyState={
            <EmptyState
              icon={<FileText className="w-7 h-7" />}
              title="No documents found"
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
              width: '140px',
              sortable: true,
              cell: d => (
                <Link to={`/documents/${d.id}`} className="font-mono text-[12px] font-semibold text-brand-700 hover:underline">
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
                  <Link to={`/documents/${d.id}`} className="block truncate text-[13px] font-medium text-slate-900 hover:text-brand-700">
                    {d.title}
                  </Link>
                  <div className="mt-1 flex flex-wrap items-center gap-1">
                    <span className="text-[11px] text-slate-500">{DOCUMENT_TYPE_LABELS[d.type]}</span>
                    <span className="text-slate-300">·</span>
                    <ClassificationBadge classification={d.classification} />
                    <PriorityBadge priority={d.priority} />
                  </div>
                  {d.tags.length > 0 && (
                    <div className="mt-1 flex items-center gap-1.5">
                      {d.tags.slice(0, 3).map(t => (
                        <span key={t} className="text-[10px] text-slate-400 font-mono">#{t}</span>
                      ))}
                    </div>
                  )}
                </div>
              ),
            },
            {
              key: 'originatingOffice',
              header: 'Originating Office',
              width: '170px',
              cell: d => {
                const fromOffice = d.originatingOfficeId ? officeById(d.originatingOfficeId) : null;
                const internalFrom = fromOffice?.name ?? d.originatingOfficeName;
                const internalFromCode = fromOffice?.code ?? 'Manual';
                return (
                  <div className="min-w-0">
                    <p className="truncate text-xs text-slate-700">{d.source === 'external' ? d.senderName : internalFrom}</p>
                    <p className="truncate text-[10px] font-mono text-slate-400">{d.source === 'external' ? 'External' : internalFromCode}</p>
                  </div>
                );
              },
            },
            {
              key: 'recipients',
              header: 'Recipient Offices',
              width: '220px',
              cell: d => (
                <RecipientOfficeList
                  recipients={d.recipients}
                  userById={userById}
                  progress={d.receiptProgress ?? calculateReceiptProgress(d.recipients)}
                  documentId={d.id}
                />
              ),
            },
            {
              key: 'createdAt',
              header: 'Date Registered',
              width: '150px',
              sortable: true,
              cell: d => (
                <div className="text-xs">
                  <p className="whitespace-nowrap text-slate-700">{formatDate(d.createdAt, true)}</p>
                  <p className="mt-0.5 text-[11px] text-slate-400">{formatRelative(d.createdAt)}</p>
                </div>
              ),
            },
            {
              key: 'receiptProgress',
              header: 'Receipt Progress',
              width: '170px',
              cell: d => (
                <ReceiptProgress progress={d.receiptProgress ?? calculateReceiptProgress(d.recipients)} />
              ),
            },
            {
              key: 'status',
              header: 'Status',
              width: '150px',
              cell: d => {
                const progress = d.receiptProgress ?? calculateReceiptProgress(d.recipients);
                return (
                  <div className="flex flex-wrap items-center gap-1">
                    <ReceiptStateBadge state={progress.state} />
                    {d.status === 'archived' && <Badge variant="slate" size="sm" className="!px-1.5 !py-0 !text-[10px]">Archived</Badge>}
                  </div>
                );
              },
            },
            {
              key: 'actions',
              header: '',
              width: '52px',
              align: 'right',
              cell: d => (
                <Dropdown
                  align="right"
                  trigger={
                    <button className="p-1.5 hover:bg-slate-100 rounded" aria-label="Actions">
                      <MoreVertical className="w-4 h-4 text-slate-500" />
                    </button>
                  }
                  items={[
                    {
                      id: 'view',
                      label: 'View Details',
                      icon: <Eye className="w-4 h-4" />,
                      onClick: () => window.location.assign(`/documents/${d.id}`),
                    },
                    {
                      id: 'download',
                      label: 'Download Attachments',
                      icon: <Download className="w-4 h-4" />,
                      onClick: () => toast.info('Download started'),
                    },
                  ]}
                />
              ),
            },
          ]}
        />

        <div className="px-4 py-3 border-t border-slate-200">
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
      </Card>
    </div>
  );
}
