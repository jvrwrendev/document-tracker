import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  PlusCircle,
  Search,
  MoreVertical,
  Edit2,
  Trash2,
  FileText,
  Eye,
  RotateCcw,
  AlertCircle,
  CheckCircle2,
  XCircle,
  FileSpreadsheet,
} from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { Table } from '@/components/ui/Table';
import { SearchInput } from '@/components/ui/SearchInput';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { Pagination } from '@/components/ui/Pagination';
import { EmptyState } from '@/components/ui/EmptyState';
import { Dropdown } from '@/components/ui/Dropdown';
import { useToast } from '@/hooks/useToast';
import { useConfirm } from '@/components/ui/ConfirmDialog';
import { usePagination } from '@/hooks/usePagination';
import { useAuth } from '@/features/authentication/hooks/useAuth';
import { useDocumentTypes } from '@/features/system-admin/document-type/hooks/useDocumentTypes';
import { ApiError } from '@/features/system-admin/document-type/services/document-type.service';
import {
  DocumentTypeCodeBadge,
  DocumentTypeFormModal,
  DocumentTypeStatCard,
  DocumentTypeStatusBadge,
} from '@/features/system-admin/document-type/components';
import { formatDate } from '@/lib/utils';
import {
  DOCUMENT_TYPE_CODES,
  DOCUMENT_TYPE_CODE_LABELS,
  type CreateDocumentTypePayload,
  type DocumentTypeCode,
  type DocumentTypeRecord,
  type UpdateDocumentTypePayload,
} from '@/features/system-admin/document-type/types/document-type';

type CodeFilter = DocumentTypeCode | 'all';
type StatusFilter = 'all' | 'active' | 'inactive';

type ModalState =
  | { kind: 'closed' }
  | { kind: 'create' }
  | { kind: 'edit'; record: DocumentTypeRecord };

const CODE_FILTER_OPTIONS: { value: CodeFilter; label: string }[] = [
  { value: 'all', label: 'All Codes' },
  ...DOCUMENT_TYPE_CODES.map(c => ({
    value: c,
    label: `${DOCUMENT_TYPE_CODE_LABELS[c]} (${c})`,
  })),
];

const STATUS_FILTER_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: 'All Status' },
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
];

export function DocumentTypesPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const confirm = useConfirm();
  const { hasPermission } = useAuth();

  const {
    items,
    total,
    loading,
    error,
    refetch,
    create,
    update,
    remove,
    creating,
    updating,
    actionError,
    clearActionError,
  } = useDocumentTypes({ pageSize: 50 });

  const [search, setSearch] = useState('');
  const [codeFilter, setCodeFilter] = useState<CodeFilter>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [modal, setModal] = useState<ModalState>({ kind: 'closed' });

  useEffect(() => {
    if (error) toast.error('Failed to load document types', error);
  }, [error, toast]);

  const hasActiveFilters =
    search.trim().length > 0 || codeFilter !== 'all' || statusFilter !== 'all';

  const existingCodes = useMemo(
    () => new Map(items.flatMap(i => i.codes.map(c => [c as DocumentTypeCode, i.id]))),
    [items],
  );

  const existingNames = useMemo(
    () => new Map(items.map(i => [i.name.trim().toLowerCase(), i.id])),
    [items],
  );

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return items.filter(i => {
      if (codeFilter !== 'all' && !i.codes.includes(codeFilter)) return false;
      if (statusFilter === 'active' && !i.isActive) return false;
      if (statusFilter === 'inactive' && i.isActive) return false;
      if (q) {
        const haystack = `${i.name} ${i.codes.join(' ')} ${i.description ?? ''}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [items, search, codeFilter, statusFilter]);

  const pagination = usePagination({ totalItems: filtered.length, initialPageSize: 10 });
  const paged = filtered.slice(pagination.start, pagination.end);

  const stats = useMemo(() => {
    const active = items.filter(i => i.isActive).length;
    const inactive = items.length - active;
    const byCode = DOCUMENT_TYPE_CODES.map(code => ({
      code,
      count: items.filter(i => i.codes.includes(code)).length,
    }));
    const totalDocuments = items.reduce(
      (sum, i) => sum + (i._count?.documents ?? 0),
      0,
    );
    return { total: items.length, active, inactive, byCode, totalDocuments };
  }, [items]);

  const showEmptyState = filtered.length === 0 && !loading;
  const hasAnyTypes = items.length > 0;
  const showLoadingState = loading && items.length === 0;

  const closeModal = () => {
    setModal({ kind: 'closed' });
    clearActionError();
  };

  const handleCreate = () => {
    if (!hasPermission('documents.edit')) {
      toast.warning(
        'Permission needed',
        'You do not have permission to create document types.',
      );
      return;
    }
    setModal({ kind: 'create' });
  };

  const handleEdit = (record: DocumentTypeRecord) => {
    if (!hasPermission('documents.edit')) {
      toast.warning(
        'Permission needed',
        'You do not have permission to edit document types.',
      );
      return;
    }
    setModal({ kind: 'edit', record });
  };

  const handleSubmit = async (
    input: CreateDocumentTypePayload | UpdateDocumentTypePayload,
  ) => {
    try {
      if (modal.kind === 'create') {
        const created = await create(input as CreateDocumentTypePayload);
        toast.success(
          'Document type created',
          `${created.name} has been added to the registry.`,
        );
      } else if (modal.kind === 'edit') {
        const updated = await update(
          modal.record.id,
          input as UpdateDocumentTypePayload,
        );
        toast.success(
          'Document type updated',
          `${updated.name} has been saved.`,
        );
      }
      closeModal();
    } catch (err) {
      if (!(err instanceof ApiError)) {
        toast.error('Unexpected error', 'Please try again.');
      }
    }
  };

  const handleDelete = async (record: DocumentTypeRecord) => {
    if (!hasPermission('documents.delete')) {
      toast.warning(
        'Permission needed',
        'Only system administrators can delete document types.',
      );
      return;
    }
    const docCount = record._count?.documents ?? 0;
    const ok = await confirm({
      title: 'Delete Document Type',
      description:
        docCount > 0
          ? `Permanently delete "${record.name}"? It is currently used by ${docCount} document${docCount === 1 ? '' : 's'}. This action cannot be undone.`
          : `Permanently delete "${record.name}"? This action cannot be undone.`,
      confirmText: 'Delete Document Type',
      variant: 'danger',
    });
    if (!ok) return;
    try {
      await remove(record.id);
      toast.success(
        'Document type deleted',
        `${record.name} has been removed.`,
      );
    } catch (err) {
      const message =
        err instanceof ApiError ? err.message : 'Failed to delete document type.';
      toast.error('Delete failed', message);
    }
  };

  const modalRecord = modal.kind === 'edit' ? modal.record : undefined;
  const modalLoading = modal.kind === 'create' ? creating : updating;
  const modalError = modal.kind === 'closed' ? null : actionError;
  const topCodes = stats.byCode.slice(0, 2);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Document Types"
        description="Manage categories used when registering documents"
        actions={
          hasPermission('documents.edit') ? (
            <Button
              leftIcon={<PlusCircle className="w-4 h-4" />}
              onClick={handleCreate}
            >
              Add Document Type
            </Button>
          ) : null
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <DocumentTypeStatCard
          label="Total Types"
          value={total || items.length}
          icon={<FileText className="w-4 h-4" />}
        />
        <DocumentTypeStatCard
          label="Active"
          value={stats.active}
          icon={<CheckCircle2 className="w-4 h-4 text-emerald-500" />}
          accent="emerald"
        />
        <DocumentTypeStatCard
          label="Inactive"
          value={stats.inactive}
          icon={<XCircle className="w-4 h-4 text-slate-400" />}
          accent="slate"
        />
        <DocumentTypeStatCard
          label="Total Documents"
          value={stats.totalDocuments}
          icon={<FileSpreadsheet className="w-4 h-4 text-indigo-500" />}
          accent="indigo"
        />
      </div>

      {topCodes.some(c => c.count > 0) && (
        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
          <span className="font-medium">Top codes:</span>
          {topCodes.map(({ code, count }) =>
            count > 0 ? (
              <DocumentTypeCodeBadge key={code} code={code} />
            ) : null,
          )}
        </div>
      )}

      <Card padded={false}>
        <div className="px-4 sm:px-6 py-4 border-b border-border bg-muted/40">
          <div className="flex items-center justify-between gap-3 mb-3">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-7 h-7 rounded-md bg-background border border-border text-muted-foreground flex items-center justify-center shrink-0">
                <Search className="w-3.5 h-3.5" />
              </div>
              <h3 className="text-sm font-semibold text-foreground">Filters</h3>
              {hasActiveFilters && (
                <span className="text-[10px] font-semibold text-brand-700 bg-brand-50 border border-brand-200 px-1.5 py-0.5 rounded">
                  ACTIVE
                </span>
              )}
            </div>
            <span className="text-sm text-muted-foreground shrink-0">
              <span className="font-semibold text-foreground tabular-nums">{filtered.length}</span>{' '}
              {filtered.length === 1 ? 'document type' : 'document types'}
            </span>
          </div>

          <div className="flex flex-col lg:flex-row gap-3">
            <SearchInput
              value={search}
              onChange={setSearch}
              placeholder="Search by name, code, or description…"
              className="flex-1 min-w-0"
              aria-label="Search document types"
            />
            <div className="flex items-center gap-2">
              <Select
                value={codeFilter}
                onChange={e => setCodeFilter(e.target.value as CodeFilter)}
                options={CODE_FILTER_OPTIONS}
                className="w-full lg:w-56"
                aria-label="Filter by code"
              />
              <Select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value as StatusFilter)}
                options={STATUS_FILTER_OPTIONS}
                className="w-full sm:w-40"
                aria-label="Filter by status"
              />
              <Button
                variant="outline"
                onClick={() => {
                  setSearch('');
                  setCodeFilter('all');
                  setStatusFilter('all');
                }}
                leftIcon={<RotateCcw className="w-3.5 h-3.5" />}
                disabled={!hasActiveFilters}
                className="h-10 shrink-0"
              >
                Reset
              </Button>
            </div>
          </div>
        </div>

        <Table
          data={paged}
          keyExtractor={i => i.id}
          emptyState={
            showEmptyState ? (
              <EmptyState
                icon={<FileText className="w-7 h-7" />}
                title={hasAnyTypes ? 'No document types match your filters' : 'No document types yet'}
                description={
                  hasAnyTypes
                    ? 'Try adjusting or clearing your filters to see more results.'
                    : 'Get started by creating your first document type.'
                }
                action={
                  hasAnyTypes ? (
                    <Button
                      variant="outline"
                      onClick={() => {
                        setSearch('');
                        setCodeFilter('all');
                        setStatusFilter('all');
                      }}
                    >
                      Clear filters
                    </Button>
                  ) : hasPermission('documents.edit') ? (
                    <Button onClick={handleCreate}>Add Document Type</Button>
                  ) : null
                }
              />
            ) : showLoadingState ? (
              <div className="py-12 text-center text-sm text-slate-500">
                Loading document types…
              </div>
            ) : null
          }
          columns={[
            {
              key: 'name',
              header: 'Document Type',
              cell: i => (
                <div>
                  <button
                    onClick={() => navigate(`/document-types/${i.id}`)}
                    className="font-semibold text-slate-900 hover:text-brand-700 text-left"
                  >
                    {i.name}
                  </button>
                  <p className="text-xs text-slate-500 mt-0.5 line-clamp-1 max-w-md">
                    {i.description || '—'}
                  </p>
                </div>
              ),
            },
            {
              key: 'code',
              header: 'Codes',
              width: '220px',
              cell: i => (
                <div className="flex flex-wrap gap-1">
                  {i.codes.map(code => (
                    <DocumentTypeCodeBadge key={code} code={code as DocumentTypeCode} />
                  ))}
                </div>
              ),
            },
            {
              key: 'status',
              header: 'Status',
              width: '130px',
              cell: i => <DocumentTypeStatusBadge isActive={i.isActive} />,
            },
            {
              key: 'usage',
              header: 'Used By',
              width: '110px',
              cell: i => (
                <div className="inline-flex items-center gap-1 text-xs text-slate-700">
                  <FileText className="w-3.5 h-3.5 text-slate-400" />
                  <span className="tabular-nums">
                    {i._count?.documents ?? 0}
                  </span>
                </div>
              ),
            },
            {
              key: 'created',
              header: 'Created',
              width: '130px',
              cell: i => (
                <span className="text-xs text-slate-600">
                  {formatDate(i.createdAt)}
                </span>
              ),
            },
            {
              key: 'actions',
              header: '',
              width: '60px',
              align: 'right',
              cell: i => (
                <Dropdown
                  align="right"
                  trigger={
                    <button
                      type="button"
                      className="p-1.5 hover:bg-slate-100 rounded"
                      aria-label={`Actions for ${i.name}`}
                    >
                      <MoreVertical className="w-4 h-4 text-slate-500" />
                    </button>
                  }
                  items={[
                    {
                      id: 'view',
                      label: 'View Details',
                      icon: <Eye className="w-4 h-4" />,
                      onClick: () => navigate(`/document-types/${i.id}`),
                    },
                    { id: 'd-1', label: '', divider: true },
                    {
                      id: 'edit',
                      label: 'Edit',
                      icon: <Edit2 className="w-4 h-4" />,
                      onClick: () => handleEdit(i),
                      disabled: !hasPermission('documents.edit'),
                    },
                    { id: 'd-2', label: '', divider: true },
                    {
                      id: 'delete',
                      label: 'Delete',
                      icon: <Trash2 className="w-4 h-4" />,
                      destructive: true,
                      onClick: () => void handleDelete(i),
                      disabled: !hasPermission('documents.delete'),
                    },
                  ]}
                />
              ),
            },
          ]}
        />

        {filtered.length > 0 && (
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
        )}
      </Card>

      {error && !loading && items.length === 0 ? (
        <Card>
          <div className="flex items-start gap-2 text-sm text-rose-700">
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
            <div className="flex-1">
              <p className="font-medium">We couldn't load document types</p>
              <p className="text-xs text-rose-600 mt-0.5">{error}</p>
              <Button
                variant="outline"
                size="sm"
                className="mt-3"
                leftIcon={<RotateCcw className="w-3.5 h-3.5" />}
                onClick={() => void refetch()}
              >
                Try again
              </Button>
            </div>
          </div>
        </Card>
      ) : null}

      <DocumentTypeFormModal
        open={modal.kind !== 'closed'}
        mode={modal.kind === 'edit' ? 'edit' : 'create'}
        initial={modalRecord}
        loading={modalLoading}
        errorMessage={modalError}
        existingCodes={existingCodes}
        existingNames={existingNames}
        onClose={closeModal}
        onSubmit={handleSubmit}
      />
    </div>
  );
}
