import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  PlusCircle,
  Building2,
  Users as UsersIcon,
  Edit2,
  Trash2,
  MoreVertical,
  Filter as FilterIcon,
  X as XIcon,
} from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { Table } from '@/components/ui/Table';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { SearchInput } from '@/components/ui/SearchInput';
import { Select } from '@/components/ui/Select';
import { Pagination } from '@/components/ui/Pagination';
import { EmptyState } from '@/components/ui/EmptyState';
import { Dropdown } from '@/components/ui/Dropdown';
import { useToast } from '@/hooks/useToast';
import { useConfirm } from '@/components/ui/ConfirmDialog';
import { usePagination } from '@/hooks/usePagination';
import { useSearch } from '@/hooks/useSearch';
import { useAuth } from '@/features/authentication/hooks/useAuth';
import { useOffices } from '@/features/system-admin/offices/hooks/useOffices';
import { OfficeFormModal } from '@/features/system-admin/offices/components/OfficeFormModal';
import { OfficeStatCard } from '@/features/system-admin/offices/components/OfficeStatCard';
import type { Office, OfficeType } from '@/features/system-admin/offices/types/office';
import { ApiError } from '@/features/system-admin/offices/services/office.service';
import { formatDate } from '@/lib/utils';

type ModalState =
  | { kind: 'closed' }
  | { kind: 'create' }
  | { kind: 'edit'; office: Office };

const TYPE_OPTIONS: { value: OfficeType | 'all'; label: string }[] = [
  { value: 'all', label: 'All Types' },
  { value: 'main', label: 'Main' },
  { value: 'division', label: 'Division' },
  { value: 'unit', label: 'Unit' },
];

const TYPE_LABELS: Record<OfficeType, string> = {
  main: 'Main Office',
  division: 'Division',
  unit: 'Unit',
};

export function OfficesPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const confirm = useConfirm();
  const { hasPermission } = useAuth();

  const {
    offices,
    loading,
    error,
    create,
    update,
    remove,
    creating,
    updating,
    actionError,
    clearActionError,
  } = useOffices();

  const { query: search, setQuery: setSearch, debounced: debouncedSearch } = useSearch({
    debounceMs: 250,
  });
  const [typeFilter, setTypeFilter] = useState<OfficeType | 'all'>('all');
  const [modal, setModal] = useState<ModalState>({ kind: 'closed' });

  const hasActiveFilters =
    debouncedSearch.length > 0 || typeFilter !== 'all';

  const filtered = useMemo(() => {
    return offices.filter(o => {
      if (typeFilter !== 'all' && o.type !== typeFilter) return false;
      if (debouncedSearch) {
        const head = o.headName ?? '';
        const haystack = `${o.name} ${o.code} ${head}`.toLowerCase();
        if (!haystack.includes(debouncedSearch)) return false;
      }
      return true;
    });
  }, [offices, debouncedSearch, typeFilter]);

  const pagination = usePagination({
    totalItems: filtered.length,
    initialPageSize: 12,
  });
  const paged = filtered.slice(pagination.start, pagination.end);

  // Snap back to page 1 whenever the filter set changes so the user doesn't
  // land on a now-empty page after narrowing results.
  useEffect(() => {
    pagination.reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch, typeFilter]);

  const stats = useMemo(
    () => ({
      total: offices.length,
      main: offices.filter(o => o.type === 'main').length,
      division: offices.filter(o => o.type === 'division').length,
      unit: offices.filter(o => o.type === 'unit').length,
    }),
    [offices],
  );

  useEffect(() => {
    if (error) toast.error('Failed to load offices', error);
  }, [error, toast]);

  const clearFilters = () => {
    setSearch('');
    setTypeFilter('all');
  };

  const closeModal = () => {
    setModal({ kind: 'closed' });
    clearActionError();
  };

  const handleCreate = () => setModal({ kind: 'create' });
  const handleEdit = (office: Office) => setModal({ kind: 'edit', office });

  const handleSubmit = async (input: Parameters<typeof create>[0]) => {
    try {
      if (modal.kind === 'create') {
        await create(input);
        toast.success('Office created', `${input.code} — ${input.name} has been added.`);
      } else if (modal.kind === 'edit') {
        await update(modal.office.id, input);
        toast.success('Office updated', `${input.code} — ${input.name} has been saved.`);
      }
      closeModal();
    } catch (err) {
      if (!(err instanceof ApiError)) {
        toast.error('Unexpected error', 'Please try again.');
      }
    }
  };

  const handleDelete = async (office: Office) => {
    const ok = await confirm({
      title: 'Delete Office',
      description: `Permanently delete ${office.name}? This will affect user and document assignments.`,
      confirmText: 'Delete Office',
      variant: 'danger',
    });
    if (!ok) return;
    try {
      await remove(office.id);
      toast.success('Office deleted', `${office.name} has been removed.`);
    } catch (err) {
      const message =
        err instanceof ApiError ? err.message : 'Failed to delete office.';
      toast.error('Delete failed', message);
    }
  };

  const modalOffice = modal.kind === 'edit' ? modal.office : undefined;
const modalLoading = modal.kind === 'create' ? creating : updating;
const modalError = modal.kind === 'closed' ? null : actionError;

  const showEmptyState = filtered.length === 0 && !loading;
  const hasAnyOffices = offices.length > 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Offices"
        description="Manage the organizational structure"
        actions={
          hasPermission('offices.create') ? (
            <Button leftIcon={<PlusCircle className="w-4 h-4" />} onClick={handleCreate}>
              Add Office
            </Button>
          ) : null
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <OfficeStatCard label="Total Offices" value={stats.total} icon={<Building2 className="w-5 h-5" />} />
        <OfficeStatCard label="Main Offices" value={stats.main} accent="brand" icon={<Building2 className="w-5 h-5" />} />
        <OfficeStatCard label="Divisions" value={stats.division} accent="indigo" icon={<Building2 className="w-5 h-5" />} />
        <OfficeStatCard label="Units" value={stats.unit} accent="emerald" icon={<Building2 className="w-5 h-5" />} />
      </div>

      <div className="space-y-4 sm:space-y-6">
        <Card padded={false}>
          <div className="px-4 sm:px-6 py-4 border-b border-border bg-muted/40">
            <div className="flex items-center justify-between gap-3 mb-3">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-7 h-7 rounded-md bg-background border border-border text-muted-foreground flex items-center justify-center shrink-0">
                  <FilterIcon className="w-3.5 h-3.5" />
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
                {filtered.length === 1 ? 'office' : 'offices'}
              </span>
            </div>

            <div className="flex flex-col lg:flex-row gap-3">
              <SearchInput
                value={search}
                onChange={setSearch}
                placeholder="Search by name, code, or head…"
                className="flex-1 min-w-0"
                aria-label="Search offices"
              />
              <div className="flex items-center gap-2">
                <Select
                  aria-label="Filter by office type"
                  value={typeFilter}
                  onChange={e => setTypeFilter(e.target.value as OfficeType | 'all')}
                  options={TYPE_OPTIONS}
                  className="w-full lg:w-44"
                />
                {hasActiveFilters && (
                  <Button
                    variant="outline"
                    onClick={clearFilters}
                    leftIcon={<XIcon className="w-3.5 h-3.5" />}
                    className="h-10 shrink-0"
                  >
                    Clear
                  </Button>
                )}
              </div>
            </div>

            {hasActiveFilters && (
              <div className="flex flex-wrap items-center gap-1.5 mt-3 pt-3 border-t border-border">
                {debouncedSearch && (
                  <FilterChip
                    label={`"${debouncedSearch}"`}
                    onClear={() => setSearch('')}
                    ariaLabel="Clear search filter"
                  />
                )}
                {typeFilter !== 'all' && (
                  <FilterChip
                    label={`Type: ${TYPE_LABELS[typeFilter]}`}
                    onClear={() => setTypeFilter('all')}
                    ariaLabel="Clear type filter"
                  />
                )}
              </div>
            )}
          </div>

          <Table
            data={paged}
            keyExtractor={o => o.id}
            emptyState={
              showEmptyState ? (
                <EmptyState
                  icon={<Building2 className="w-7 h-7" />}
                  title={hasAnyOffices ? 'No offices match your filters' : 'No offices yet'}
                  description={
                    hasAnyOffices
                      ? 'Try adjusting or clearing your filters to see more results.'
                      : 'Get started by creating the first office.'
                  }
                  action={
                    hasAnyOffices ? (
                      <Button variant="outline" onClick={clearFilters}>
                        Clear filters
                      </Button>
                    ) : hasPermission('offices.create') ? (
                      <Button onClick={handleCreate}>Add Office</Button>
                    ) : null
                  }
                />
              ) : loading ? (
                <div className="py-12 text-center text-sm text-slate-500">
                  Loading offices…
                </div>
              ) : null
            }
            columns={[
              {
                key: 'name',
                header: 'Office',
                cell: o => {
                  return (
                    <div>
                      <button
                        onClick={() => navigate(`/offices/${o.id}`)}
                        className="font-semibold text-slate-900 hover:text-brand-700 text-left"
                      >
                        {o.name}
                      </button>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <Badge variant="slate" size="sm" className="!font-mono">{o.code}</Badge>
                        <Badge variant={o.type === 'main' ? 'brand' : o.type === 'division' ? 'indigo' : 'emerald'}>
                          {o.type}
                        </Badge>
                        {!o.isActive && (
                          <Badge variant="slate" size="sm">Inactive</Badge>
                        )}
                      </div>
                    </div>
                  );
                },
              },
              {
                key: 'head',
                header: 'Head',
                width: '200px',
                cell: o => (
                  <span className="text-sm text-slate-700">{o.headName ?? '—'}</span>
                ),
              },
              {
                key: 'employees',
                header: 'Employees',
                width: '110px',
                cell: o => (
                  <div className="flex items-center gap-1 text-xs text-slate-700">
                    <UsersIcon className="w-3.5 h-3.5 text-slate-400" />
                    <span className="tabular-nums">{o._count?.employees ?? 0}</span>
                  </div>
                ),
              },
              {
                key: 'created',
                header: 'Created',
                width: '130px',
                cell: o => (
                  <span className="text-xs text-slate-600">{formatDate(o.createdAt)}</span>
                ),
              },
              {
                key: 'actions',
                header: '',
                width: '60px',
                align: 'right',
                cell: o => (
                  <Dropdown
                    align="right"
                    trigger={
                      <button className="p-1.5 hover:bg-slate-100 rounded" aria-label="Office actions">
                        <MoreVertical className="w-4 h-4 text-slate-500" />
                      </button>
                    }
                    items={[
                      {
                        id: 'view',
                        label: 'View Details',
                        onClick: () => navigate(`/offices/${o.id}`),
                      },
                      {
                        id: 'edit',
                        label: 'Edit Office',
                        icon: <Edit2 className="w-4 h-4" />,
                        onClick: () => handleEdit(o),
                        disabled: !hasPermission('offices.edit'),
                      },
                      {
                        id: 'delete',
                        label: 'Delete Office',
                        icon: <Trash2 className="w-4 h-4" />,
                        destructive: true,
                        onClick: () => handleDelete(o),
                        disabled: !hasPermission('offices.delete'),
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
      </div>

      <OfficeFormModal
        open={modal.kind !== 'closed'}
        mode={modal.kind === 'edit' ? 'edit' : 'create'}
        initial={modalOffice}
        loading={modalLoading}
        errorMessage={modalError}
        onClose={closeModal}
        onSubmit={handleSubmit}
      />
    </div>
  );
}

function FilterChip({
  label,
  onClear,
  ariaLabel,
}: {
  label: string;
  onClear: () => void;
  ariaLabel: string;
}) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-brand-50 text-brand-700 border border-brand-200 px-2 py-0.5 text-xs font-medium">
      <span className="max-w-[160px] truncate">{label}</span>
      <button
        type="button"
        onClick={onClear}
        aria-label={ariaLabel}
        className="inline-flex items-center justify-center w-3.5 h-3.5 rounded-full hover:bg-brand-100 text-brand-600"
      >
        <XIcon className="w-2.5 h-2.5" />
      </button>
    </span>
  );
}
