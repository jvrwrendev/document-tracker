import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  FileText,
  PlusCircle,
  Download,
  Eye,
  MoreVertical,
  Building2,
  User as UserIcon,
  RotateCcw,
  Calendar,
  CheckCircle2,
  SlidersHorizontal,
} from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Table } from '@/components/ui/Table';
import { StatusBadge, PriorityBadge, ClassificationBadge } from '@/components/ui/StatusBadge';
import { SearchInput } from '@/components/ui/SearchInput';
import { Select } from '@/components/ui/Select';
import { Pagination } from '@/components/ui/Pagination';
import { EmptyState } from '@/components/ui/EmptyState';
import { Dropdown } from '@/components/ui/Dropdown';
import { useAuth, useCurrentUser } from '@/features/authentication/hooks/useAuth';
import { useToast } from '@/hooks/useToast';
import { useDocuments } from '@/features/documents/hooks/useDocuments';
import { useConfirm } from '@/components/ui/ConfirmDialog';
import { useOfficeDirectory } from '@/features/system-admin/offices/hooks/useOffices';
import { useRoutingOptions } from '@/features/documents/hooks/useRoutingOptions';
import {
  ALL_DOCUMENT_STATUSES,
  ALL_DOCUMENT_TYPES,
  ALL_CLASSIFICATIONS,
  DOCUMENT_STATUS_LABELS,
  DOCUMENT_TYPE_LABELS,
  DOCUMENT_CLASSIFICATION_LABELS,
} from '@/constants';
import { usePagination } from '@/hooks/usePagination';
import { useTableSort } from '@/hooks/useTableSort';
import type { DocumentListItem } from '@/features/documents/types/document';
import { formatDate, formatRelative, toCsv, downloadCsv, cn } from '@/lib/utils';

const DEFAULT_FILTERS = {
  search: '',
  status: 'all',
  type: 'all',
  classification: 'all',
  office: 'all',
  priority: 'all',
  source: 'all',
};

// Archived documents move to the Archive module; the main documents table
// only shows active workflow statuses.
const ACTIVE_STATUSES: DocumentListItem['status'][] = ALL_DOCUMENT_STATUSES.filter(s => s !== 'archived');

export function DocumentsListPage() {
  const user = useCurrentUser();
  const { hasPermission } = useAuth();
  const toast = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedStatus = searchParams.get('status');
  const initialStatus = ACTIVE_STATUSES.includes(requestedStatus as DocumentListItem['status'])
    ? requestedStatus!
    : DEFAULT_FILTERS.status;
  const { items: allDocs, total, loading, error, setFilters } = useDocuments({ fetchAll: true });
  const { offices: officeDirectory } = useOfficeDirectory();
  const { users: routingUsers } = useRoutingOptions();
  const confirm = useConfirm();
  const holderNameById = useMemo(
    () => new Map(routingUsers.map(u => [u.id, u.fullName])),
    [routingUsers],
  );

  const [search, setSearch] = useState(DEFAULT_FILTERS.search);
  const [statusFilter, setStatusFilter] = useState(initialStatus);
  const [typeFilter, setTypeFilter] = useState(DEFAULT_FILTERS.type);
  const [classificationFilter, setClassificationFilter] = useState(DEFAULT_FILTERS.classification);
  const [officeFilter, setOfficeFilter] = useState(DEFAULT_FILTERS.office);
  const [priorityFilter, setPriorityFilter] = useState(DEFAULT_FILTERS.priority);
  const [sourceFilter, setSourceFilter] = useState(DEFAULT_FILTERS.source);
  const filterInitialized = useRef(false);

  const { sortKey, sortDirection, toggleSort, sortFn } = useTableSort<DocumentListItem>({
    initialKey: 'updatedAt',
    initialDirection: 'desc',
  });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return allDocs.filter(d => {
      if (d.status === 'archived') return false;
      if (q) {
        const haystack = [
          d.trackingNumber,
          d.title,
          d.senderName ?? '',
          d.tags.join(' '),
        ].join(' ').toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      if (statusFilter !== 'all' && d.status !== statusFilter) return false;
      if (typeFilter !== 'all' && d.type !== typeFilter) return false;
      if (classificationFilter !== 'all' && d.classification !== classificationFilter) return false;
      if (officeFilter !== 'all' && d.currentOfficeId !== officeFilter) return false;
      if (priorityFilter !== 'all' && d.priority !== priorityFilter) return false;
      if (sourceFilter !== 'all' && d.source !== sourceFilter) return false;
      return true;
    });
  }, [allDocs, search, statusFilter, typeFilter, classificationFilter, officeFilter, priorityFilter, sourceFilter]);

  const sorted = useMemo(() => sortFn(filtered), [sortFn, filtered]);

  const pagination = usePagination({
    totalItems: sorted.length,
    initialPageSize: 10,
  });

  useEffect(() => {
    if (!filterInitialized.current) {
      filterInitialized.current = true;
      return;
    }
    pagination.reset();
    setFilters({
      fetchAll: true,
      ...(statusFilter !== 'all' ? { status: statusFilter as DocumentListItem['status'] } : {}),
      ...(classificationFilter !== 'all' ? { classification: classificationFilter as DocumentListItem['classification'] } : {}),
      ...(officeFilter !== 'all' ? { currentOfficeId: officeFilter } : {}),
      ...(priorityFilter !== 'all' ? { priority: priorityFilter as DocumentListItem['priority'] } : {}),
      ...(sourceFilter !== 'all' ? { source: sourceFilter as DocumentListItem['source'] } : {}),
    });
    const nextParams = new URLSearchParams(searchParams);
    if (statusFilter === 'all') nextParams.delete('status');
    else nextParams.set('status', statusFilter);
    setSearchParams(nextParams, { replace: true });
  }, [statusFilter, classificationFilter, officeFilter, priorityFilter, sourceFilter, setFilters]);

  const paged = useMemo(
    () => sorted.slice(pagination.start, pagination.end),
    [sorted, pagination.start, pagination.end]
  );

  const officeOptions = useMemo(
    () => officeDirectory.map(office => ({
      value: office.id,
      label: `${office.code} — ${office.name}`,
    })),
    [officeDirectory]
  );

  const hasActiveFilters =
    search !== DEFAULT_FILTERS.search ||
    statusFilter !== DEFAULT_FILTERS.status ||
    typeFilter !== DEFAULT_FILTERS.type ||
    classificationFilter !== DEFAULT_FILTERS.classification ||
    officeFilter !== DEFAULT_FILTERS.office ||
    priorityFilter !== DEFAULT_FILTERS.priority ||
    sourceFilter !== DEFAULT_FILTERS.source;

  const resetFilters = () => {
    setSearch(DEFAULT_FILTERS.search);
    setStatusFilter(DEFAULT_FILTERS.status);
    setTypeFilter(DEFAULT_FILTERS.type);
    setClassificationFilter(DEFAULT_FILTERS.classification);
    setOfficeFilter(DEFAULT_FILTERS.office);
    setPriorityFilter(DEFAULT_FILTERS.priority);
    setSourceFilter(DEFAULT_FILTERS.source);
    pagination.reset();
    toast.info('Filters reset', 'Showing all documents.');
  };

  const handleExport = () => {
    if (sorted.length === 0) {
      toast.warning('Nothing to export', 'No documents match the current filters.');
      return;
    }
    const rows = sorted.map(d => ({
      trackingNumber: d.trackingNumber,
      title: d.title,
      type: DOCUMENT_TYPE_LABELS[d.type],
      classification: DOCUMENT_CLASSIFICATION_LABELS[d.classification],
      status: DOCUMENT_STATUS_LABELS[d.status],
      priority: d.priority,
      source: d.source,
       currentOffice: officeDirectory.find(o => o.id === d.currentOfficeId)?.name
         ?? (d.currentOfficeId === user.officeId ? user.officeName : undefined)
         ?? d.currentOfficeId,
      currentHolder: d.currentHolderId ? holderNameById.get(d.currentHolderId) ?? '' : '',
      dateReceived: d.dateReceived ? formatDate(d.dateReceived) : '',
      dueDate: d.dueDate ? formatDate(d.dueDate) : '',
      tags: d.tags.join('; '),
    }));
    const csv = toCsv(rows, [
      { key: 'trackingNumber', header: 'Tracking Number' },
      { key: 'title', header: 'Title' },
      { key: 'type', header: 'Type' },
      { key: 'classification', header: 'Classification' },
      { key: 'status', header: 'Status' },
      { key: 'priority', header: 'Priority' },
      { key: 'source', header: 'Source' },
      { key: 'currentOffice', header: 'Current Office' },
      { key: 'currentHolder', header: 'Current Holder' },
      { key: 'dateReceived', header: 'Date Received' },
      { key: 'dueDate', header: 'Due Date' },
      { key: 'tags', header: 'Tags' },
    ]);
    const stamp = new Date().toISOString().slice(0, 10);
    downloadCsv(`documents_${stamp}.csv`, csv);
    toast.success('Export complete', `${sorted.length} document${sorted.length === 1 ? '' : 's'} exported.`);
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
            <h3 className="text-sm font-semibold text-slate-900">Filters & Search</h3>
            {hasActiveFilters && (
              <span className="text-[10px] font-semibold text-brand-700 bg-brand-50 border border-brand-200 px-1.5 py-0.5 rounded">
                ACTIVE
              </span>
            )}
            <span className="ml-auto inline-flex items-center gap-1.5 text-xs text-slate-600">
              <CheckCircle2 className="w-3.5 h-3.5 text-brand-600" />
              <span>
                <span className="font-semibold text-slate-900">{sorted.length}</span>{' '}
                {sorted.length === 1 ? 'document' : 'documents'} found
              </span>
              {hasActiveFilters && (
                <span className="text-slate-400">
                  · filtered from {allDocs.length}
                </span>
              )}
            </span>
          </div>

          <div className="mb-3">
            <SearchInput
              value={search}
              onChange={setSearch}
              placeholder="Search by tracking number, title, sender, or tags…"
              className="h-11"
              inputClassName="h-11 text-base"
            />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <Select
              label="Status"
              value={statusFilter}
              onChange={e => { setStatusFilter(e.target.value); pagination.reset(); }}
              options={[
                { value: 'all', label: 'All Status' },
                ...ACTIVE_STATUSES.map(s => ({ value: s, label: DOCUMENT_STATUS_LABELS[s] })),
              ]}
            />
            <Select
              label="Type"
              value={typeFilter}
              onChange={e => { setTypeFilter(e.target.value); pagination.reset(); }}
              options={[
                { value: 'all', label: 'All Types' },
                ...ALL_DOCUMENT_TYPES.map(t => ({ value: t, label: DOCUMENT_TYPE_LABELS[t] })),
              ]}
            />
            <Select
              label="Classification"
              value={classificationFilter}
              onChange={e => { setClassificationFilter(e.target.value); pagination.reset(); }}
              options={[
                { value: 'all', label: 'All Classifications' },
                ...ALL_CLASSIFICATIONS.map(c => ({ value: c, label: DOCUMENT_CLASSIFICATION_LABELS[c] })),
              ]}
            />
            <Select
              label="Office"
              value={officeFilter}
              onChange={e => { setOfficeFilter(e.target.value); pagination.reset(); }}
              options={[{ value: 'all', label: 'All Offices' }, ...officeOptions]}
            />
            <Select
              label="Priority"
              value={priorityFilter}
              onChange={e => { setPriorityFilter(e.target.value); pagination.reset(); }}
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
              onChange={e => { setSourceFilter(e.target.value); pagination.reset(); }}
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
              onClick={handleExport}
              leftIcon={<Download className="w-3.5 h-3.5" />}
              disabled={sorted.length === 0}
              size="sm"
            >
              Export Results
            </Button>
            {hasActiveFilters && (
              <span className="text-xs text-slate-500 ml-auto">
                Showing {sorted.length === 0 ? 0 : pagination.start + 1}–{pagination.end}
                {sorted.length !== allDocs.length && ` of ${sorted.length}`}
              </span>
            )}
          </div>
        </div>

        <Table
          data={paged}
          keyExtractor={d => d.id}
          sortKey={String(sortKey)}
          sortDirection={sortDirection}
          onSort={(k) => toggleSort(k as keyof DocumentListItem)}
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
                hasActiveFilters && (
                  <Button variant="outline" onClick={resetFilters}>
                    Reset Filters
                  </Button>
                )
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
                <Link to={`/documents/${d.id}`} className="font-mono font-semibold text-brand-700 hover:underline">
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
                  <Link to={`/documents/${d.id}`} className="font-medium text-slate-900 hover:text-brand-700 line-clamp-1">
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
                  {d.tags.length > 0 && (
                    <div className="flex items-center gap-1 mt-1">
                      {d.tags.slice(0, 3).map(t => (
                        <span key={t} className="text-[10px] text-slate-500 font-mono">
                          #{t}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ),
            },
            {
              key: 'status',
              header: 'Status',
              width: '160px',
              sortable: true,
              cell: d => <StatusBadge status={d.status} />,
            },
            {
              key: 'currentOfficeId',
              header: 'Current Office',
              width: '180px',
              cell: d => {
                 const office = officeDirectory.find(o => o.id === d.currentOfficeId)
                   ?? (d.currentOfficeId === user.officeId
                     ? { name: user.officeName ?? 'Current office', code: user.officeCode ?? d.currentOfficeId }
                     : null);
                return (
                  <div className="flex items-center gap-1.5 text-xs">
                    <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <div className="min-w-0">
                       <p className="text-slate-700 truncate">{office?.name ?? d.currentOfficeId}</p>
                       <p className="text-slate-400 font-mono text-[10px]">{office?.code ?? d.currentOfficeId}</p>
                    </div>
                  </div>
                );
              },
            },
            {
              key: 'currentHolderId',
              header: 'Current Holder',
              width: '180px',
              cell: d => {
                const holderName = d.currentHolderId ? holderNameById.get(d.currentHolderId) : null;
                if (!holderName) return <span className="text-xs text-slate-400">Unassigned</span>;
                return (
                  <div className="flex items-center gap-1.5">
                    <UserIcon className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="text-xs text-slate-700 truncate">{holderName}</span>
                  </div>
                );
              },
            },
            {
              key: 'updatedAt',
              header: 'Updated',
              width: '165px',
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
            {
              key: 'actions',
              header: '',
              width: '60px',
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
      </Card>
    </div>
  );
}
