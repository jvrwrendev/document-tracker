import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Archive as ArchiveIcon,
  Download,
  Eye,
  Calendar,
  Building2,
  RotateCcw,
  CheckCircle2,
  SlidersHorizontal,
} from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { Table } from '@/components/ui/Table';
import { Badge } from '@/components/ui/Badge';
import { ClassificationBadge, PriorityBadge } from '@/components/ui/StatusBadge';
import { SearchInput } from '@/components/ui/SearchInput';
import { Select } from '@/components/ui/Select';
import { EmptyState } from '@/components/ui/EmptyState';
import { Button } from '@/components/ui/Button';
import { Pagination } from '@/components/ui/Pagination';
import { useToast } from '@/hooks/useToast';
import { usePagination } from '@/hooks/usePagination';
import { useDocuments } from '@/features/documents/hooks/useDocuments';
import { useOfficeLookup } from '@/hooks/useLookups';
import {
  ALL_DOCUMENT_TYPES,
  ALL_CLASSIFICATIONS,
  DOCUMENT_STATUS_LABELS,
  DOCUMENT_TYPE_LABELS,
  DOCUMENT_CLASSIFICATION_LABELS,
} from '@/constants';
import { formatDate, toCsv, downloadCsv } from '@/lib/utils';

// The Archive is read-only: it lists documents that the backend has
// automatically archived, so a status filter is no longer meaningful.
const DEFAULT_FILTERS = {
  search: '',
  type: 'all',
  classification: 'all',
  office: 'all',
  priority: 'all',
  source: 'all',
};

export function ArchivePage() {
  const toast = useToast();
  const { items: documents } = useDocuments({ pageSize: 100 });
  const officeById = useOfficeLookup();

  const [search, setSearch] = useState(DEFAULT_FILTERS.search);
  const [typeFilter, setTypeFilter] = useState(DEFAULT_FILTERS.type);
  const [classificationFilter, setClassificationFilter] = useState(DEFAULT_FILTERS.classification);
  const [officeFilter, setOfficeFilter] = useState(DEFAULT_FILTERS.office);
  const [priorityFilter, setPriorityFilter] = useState(DEFAULT_FILTERS.priority);
  const [sourceFilter, setSourceFilter] = useState(DEFAULT_FILTERS.source);

  const archivedDocs = useMemo(
    () => documents.filter(d => d.status === 'archived'),
    [documents]
  );

  const officeOptions = useMemo(
    () => Array.from(new Set(archivedDocs.map(d => d.currentOfficeId))).map(id => ({
      value: id,
      label: officeById(id)?.name ?? id,
    })),
    [archivedDocs]
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return archivedDocs.filter(d => {
      if (q) {
        const haystack = `${d.trackingNumber} ${d.title} ${d.senderName ?? ''} ${d.tags.join(' ')}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      if (typeFilter !== 'all' && d.type !== typeFilter) return false;
      if (classificationFilter !== 'all' && d.classification !== classificationFilter) return false;
      if (officeFilter !== 'all' && d.currentOfficeId !== officeFilter) return false;
      if (priorityFilter !== 'all' && d.priority !== priorityFilter) return false;
      if (sourceFilter !== 'all' && d.source !== sourceFilter) return false;
      return true;
    });
  }, [archivedDocs, search, typeFilter, classificationFilter, officeFilter, priorityFilter, sourceFilter]);

  const pagination = usePagination({ totalItems: filtered.length, initialPageSize: 10 });
  const paged = filtered.slice(pagination.start, pagination.end);

  const hasActiveFilters =
    search !== DEFAULT_FILTERS.search ||
    typeFilter !== DEFAULT_FILTERS.type ||
    classificationFilter !== DEFAULT_FILTERS.classification ||
    officeFilter !== DEFAULT_FILTERS.office ||
    priorityFilter !== DEFAULT_FILTERS.priority ||
    sourceFilter !== DEFAULT_FILTERS.source;

  const resetFilters = () => {
    setSearch(DEFAULT_FILTERS.search);
    setTypeFilter(DEFAULT_FILTERS.type);
    setClassificationFilter(DEFAULT_FILTERS.classification);
    setOfficeFilter(DEFAULT_FILTERS.office);
    setPriorityFilter(DEFAULT_FILTERS.priority);
    setSourceFilter(DEFAULT_FILTERS.source);
    pagination.reset();
    toast.info('Filters reset', 'Showing all archived documents.');
  };

  const handleExport = () => {
    if (filtered.length === 0) {
      toast.warning('Nothing to export', 'No archived documents match the current filters.');
      return;
    }
    const rows = filtered.map(d => ({
      trackingNumber: d.trackingNumber,
      title: d.title,
      type: DOCUMENT_TYPE_LABELS[d.type],
      classification: DOCUMENT_CLASSIFICATION_LABELS[d.classification],
      status: DOCUMENT_STATUS_LABELS[d.status],
      priority: d.priority,
      source: d.source,
      currentOffice: officeById(d.currentOfficeId)?.name ?? '',
      dateReceived: d.dateReceived ? formatDate(d.dateReceived) : '',
      dueDate: d.dueDate ? formatDate(d.dueDate) : '',
      archivedAt: formatDate(d.updatedAt),
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
      { key: 'dateReceived', header: 'Date Received' },
      { key: 'dueDate', header: 'Due Date' },
      { key: 'archivedAt', header: 'Archived Date' },
      { key: 'tags', header: 'Tags' },
    ]);
    const stamp = new Date().toISOString().slice(0, 10);
    downloadCsv(`archive_${stamp}.csv`, csv);
    toast.success('Export complete', `${filtered.length} archived document${filtered.length === 1 ? '' : 's'} exported.`);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Archive"
        description="Search and retrieve archived documents"
        actions={
          <Button
            variant="outline"
            leftIcon={<Download className="w-4 h-4" />}
            onClick={handleExport}
            disabled={filtered.length === 0}
          >
            Export Archive Index
          </Button>
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
                <span className="font-semibold text-slate-900">{filtered.length}</span>{' '}
                {filtered.length === 1 ? 'document' : 'documents'} found
              </span>
              {hasActiveFilters && (
                <span className="text-slate-400">· filtered from {archivedDocs.length}</span>
              )}
            </span>
          </div>

          <div className="mb-3">
            <SearchInput
              value={search}
              onChange={setSearch}
              placeholder="Search archive by tracking #, title, sender, or tags…"
              className="h-11"
              inputClassName="h-11 text-base"
            />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
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
              disabled={filtered.length === 0}
              size="sm"
            >
              Export Results
            </Button>
            {hasActiveFilters && (
              <span className="text-xs text-slate-500 ml-auto">
                Showing {filtered.length === 0 ? 0 : pagination.start + 1}–{pagination.end}
                {filtered.length !== archivedDocs.length && ` of ${filtered.length}`}
              </span>
            )}
          </div>
        </div>

        <Table
          data={paged}
          keyExtractor={d => d.id}
          emptyState={
            <EmptyState
              icon={<ArchiveIcon className="w-7 h-7" />}
              title="No archived documents"
              description={
                hasActiveFilters
                  ? 'No archived documents match your current search and filters.'
                  : 'There are no archived documents in the system yet.'
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
              cell: d => (
                <Link to={`/documents/${d.id}`} className="font-mono font-semibold text-brand-700 hover:underline">
                  {d.trackingNumber}
                </Link>
              ),
            },
            {
              key: 'title',
              header: 'Document',
              cell: d => (
                <div>
                  <Link to={`/documents/${d.id}`} className="font-medium text-slate-900 hover:text-brand-700">
                    {d.title}
                  </Link>
                  <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                    <Badge variant="slate" size="sm">{DOCUMENT_TYPE_LABELS[d.type]}</Badge>
                    <ClassificationBadge classification={d.classification} />
                  </div>
                </div>
              ),
            },
            {
              key: 'office',
              header: 'Office',
              width: '170px',
              cell: d => {
                const office = officeById(d.currentOfficeId);
                return (
                  <div className="flex items-center gap-1.5 text-xs">
                    <Building2 className="w-3.5 h-3.5 text-slate-400" />
                    <div>
                      <p className="text-slate-700">{office?.code}</p>
                      <p className="text-slate-400 text-[10px]">{office?.name}</p>
                    </div>
                  </div>
                );
              },
            },
            {
              key: 'date',
              header: 'Archived Date',
              width: '140px',
              cell: d => (
                <div className="text-xs">
                  <p className="text-slate-700 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    {formatDate(d.updatedAt)}
                  </p>
                </div>
              ),
            },
            {
              key: 'priority',
              header: 'Priority',
              width: '120px',
              cell: d => <PriorityBadge priority={d.priority} />,
            },
            {
              key: 'actions',
              header: '',
              width: '90px',
              align: 'right',
              cell: d => (
                <Link to={`/documents/${d.id}`}>
                  <Button size="sm" variant="outline" leftIcon={<Eye className="w-3.5 h-3.5" />}>
                    View
                  </Button>
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
