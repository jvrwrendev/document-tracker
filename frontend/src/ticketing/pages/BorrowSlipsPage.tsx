import { useEffect, useMemo, useState } from 'react';
import {
  Edit2,
  Eye,
  MoreVertical,
  PackageOpen,
  Plus,
  RefreshCw,
  RotateCcw,
  Trash2,
} from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Table } from '@/components/ui/Table';
import { Pagination } from '@/components/ui/Pagination';
import { SearchInput } from '@/components/ui/SearchInput';
import { Select } from '@/components/ui/Select';
import { Dropdown } from '@/components/ui/Dropdown';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/skeleton';
import { useConfirm } from '@/components/ui/ConfirmDialog';
import { useToast } from '@/hooks/useToast';
import { useBorrowSlips } from '@/ticketing/hooks/useBorrowSlips';
import { BorrowSlipDetailModal } from '@/ticketing/components/BorrowSlipDetailModal';
import { BorrowSlipFormModal } from '@/ticketing/components/BorrowSlipFormModal';
import { BorrowSlipStatusBadge } from '@/ticketing/components/StatusBadges';
import { effectiveBorrowStatus, formatDateOnly } from '@/ticketing/data/format';
import type { BorrowSlip, BorrowSlipInput } from '@/ticketing/types';

type SortKey = 'referenceNumber' | 'borrowerName' | 'itemName' | 'status' | 'borrowingDate';

export function BorrowSlipsPage() {
  const { items, loading, nextReference, createSlip, updateSlip, returnSlip, deleteSlip } = useBorrowSlips();
  const toast = useToast();
  const confirm = useConfirm();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [sortKey, setSortKey] = useState<SortKey>('borrowingDate');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<BorrowSlip | null>(null);
  const [viewing, setViewing] = useState<BorrowSlip | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const rows = items.filter(item => {
      const status = effectiveBorrowStatus(item);
      if (q && ![
        item.referenceNumber,
        item.borrowerName,
        item.borrowerOffice,
        item.itemName,
        item.itemDetails,
        item.releasedBy,
      ].some(value => value.toLowerCase().includes(q))) return false;
      if (statusFilter !== 'all' && status !== statusFilter) return false;
      return true;
    });
    return rows.sort((a, b) => {
      let result = 0;
      if (sortKey === 'status') result = effectiveBorrowStatus(a).localeCompare(effectiveBorrowStatus(b));
      else if (sortKey === 'borrowingDate') result = new Date(a.borrowingDate).getTime() - new Date(b.borrowingDate).getTime();
      else result = String(a[sortKey]).localeCompare(String(b[sortKey]));
      return sortDirection === 'asc' ? result : -result;
    });
  }, [items, search, statusFilter, sortKey, sortDirection]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const start = (safePage - 1) * pageSize;
  const paged = filtered.slice(start, start + pageSize);

  useEffect(() => {
    if (page !== safePage) setPage(safePage);
  }, [page, safePage]);

  useEffect(() => {
    setPage(1);
  }, [search, statusFilter, pageSize]);

  const handleSort = (key: string) => {
    const nextKey = key as SortKey;
    if (sortKey === nextKey) setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    else {
      setSortKey(nextKey);
      setSortDirection('asc');
    }
  };

  const handleSave = (input: BorrowSlipInput, id?: string) => {
    if (id) {
      updateSlip(id, input);
      toast.success('Borrow slip updated', 'The borrow slip has been saved.');
    } else {
      const created = createSlip(input);
      toast.success('Borrow slip created', `${created.referenceNumber} has been recorded.`);
    }
    setFormOpen(false);
    setEditing(null);
  };

  const handleReturn = async (slip: BorrowSlip) => {
    const ok = await confirm({
      title: 'Mark item as returned?',
      description: `${slip.referenceNumber} · ${slip.itemName} will be marked as returned today.`,
      confirmText: 'Mark Returned',
    });
    if (!ok) return;
    returnSlip(slip.id);
    toast.success('Item returned', `${slip.itemName} has been marked as returned.`);
  };

  const handleDelete = async (slip: BorrowSlip) => {
    const ok = await confirm({
      title: 'Delete borrow slip?',
      description: `${slip.referenceNumber} will be permanently removed from mock data.`,
      confirmText: 'Delete',
      variant: 'danger',
    });
    if (!ok) return;
    deleteSlip(slip.id);
    toast.success('Borrow slip deleted', `${slip.referenceNumber} has been removed.`);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Borrow Slip"
        description="Manage equipment and item borrowing records"
        eyebrow="Ticketing System"
        actions={
          <Button leftIcon={<Plus className="h-4 w-4" />} onClick={() => { setEditing(null); setFormOpen(true); }}>
            Create Slip
          </Button>
        }
      />

      <Card padded={false}>
        <div className="flex flex-col gap-4 px-4 py-4 sm:px-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex w-full flex-col gap-3 sm:flex-row lg:max-w-2xl">
            <SearchInput
              value={search}
              onChange={setSearch}
              placeholder="Search reference, borrower, office, or item…"
              className="lg:w-80"
            />
            <Select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              options={[
                { value: 'all', label: 'All Status' },
                { value: 'pending', label: 'Pending' },
                { value: 'borrowed', label: 'Borrowed' },
                { value: 'returned', label: 'Returned' },
                { value: 'overdue', label: 'Overdue' },
              ]}
              className="lg:w-44"
            />
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => { setSearch(''); setStatusFilter('all'); }}
            leftIcon={<RefreshCw className="h-3.5 w-3.5" />}
          >
            Reset filters
          </Button>
        </div>

        {loading ? (
          <div className="space-y-2 p-5">
            {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
          </div>
        ) : (
          <Table
            data={paged}
            keyExtractor={item => item.id}
            sortKey={sortKey}
            sortDirection={sortDirection}
            onSort={handleSort}
            columns={[
              {
                key: 'referenceNumber',
                header: 'Reference',
                width: '145px',
                sortable: true,
                cell: item => <span className="font-mono text-[12px] font-semibold text-brand-700">{item.referenceNumber}</span>,
              },
              {
                key: 'borrowerName',
                header: 'Borrower / Office',
                sortable: true,
                cell: item => (
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-slate-900">{item.borrowerName}</p>
                    <p className="truncate text-[11px] text-slate-500">{item.borrowerOffice}</p>
                  </div>
                ),
              },
              {
                key: 'itemName',
                header: 'Item / Equipment',
                sortable: true,
                cell: item => (
                  <div className="min-w-0">
                    <p className="truncate text-sm text-slate-800">{item.itemName}</p>
                    <p className="truncate text-[11px] text-slate-500">{item.itemDetails}</p>
                  </div>
                ),
              },
              {
                key: 'quantity',
                header: 'Qty',
                width: '70px',
                cell: item => <span className="text-sm text-slate-700">{item.quantity}</span>,
              },
              {
                key: 'borrowingDate',
                header: 'Borrowed',
                width: '125px',
                sortable: true,
                cell: item => <span className="text-xs text-slate-600">{formatDateOnly(item.borrowingDate)}</span>,
              },
              {
                key: 'expectedReturnDate',
                header: 'Expected Return',
                width: '135px',
                cell: item => <span className="text-xs text-slate-600">{formatDateOnly(item.expectedReturnDate)}</span>,
              },
              {
                key: 'actualReturnDate',
                header: 'Actual Return',
                width: '125px',
                cell: item => <span className="text-xs text-slate-600">{formatDateOnly(item.actualReturnDate)}</span>,
              },
              {
                key: 'status',
                header: 'Status',
                width: '120px',
                sortable: true,
                cell: item => <BorrowSlipStatusBadge status={effectiveBorrowStatus(item)} />,
              },
              {
                key: 'actions',
                header: 'Actions',
                width: '70px',
                cell: item => (
                  <Dropdown
                    align="right"
                    trigger={<button type="button" className="inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100" aria-label="Borrow slip actions"><MoreVertical className="h-4 w-4" /></button>}
                    items={[
                      { id: 'view', label: 'View details', icon: <Eye className="h-4 w-4" />, onClick: () => setViewing(item) },
                      { id: 'edit', label: 'Edit slip', icon: <Edit2 className="h-4 w-4" />, onClick: () => { setEditing(item); setFormOpen(true); } },
                      {
                        id: 'return',
                        label: 'Mark as returned',
                        icon: <RotateCcw className="h-4 w-4" />,
                        disabled: effectiveBorrowStatus(item) === 'returned',
                        onClick: () => void handleReturn(item),
                      },
                      { id: 'danger', label: '', divider: true },
                      { id: 'delete', label: 'Delete slip', icon: <Trash2 className="h-4 w-4" />, destructive: true, onClick: () => void handleDelete(item) },
                    ]}
                  />
                ),
              },
            ]}
            emptyState={
              <EmptyState
                icon={<PackageOpen className="h-7 w-7" />}
                title={items.length === 0 ? 'No borrow slips yet' : 'No matching slips'}
                description={items.length === 0 ? 'Create the first borrow slip to get started.' : 'Try adjusting your search or filters.'}
                action={items.length === 0 ? <Button onClick={() => setFormOpen(true)}>Create Slip</Button> : undefined}
              />
            }
          />
        )}

        {filtered.length > 0 && (
          <div className="border-t border-slate-200 px-4 py-3">
            <Pagination
              page={safePage}
              totalPages={totalPages}
              totalItems={filtered.length}
              start={start}
              end={Math.min(start + pageSize, filtered.length)}
              pageSize={pageSize}
              onPageChange={setPage}
              onPageSizeChange={setPageSize}
            />
          </div>
        )}
      </Card>

      <BorrowSlipFormModal
        open={formOpen}
        onClose={() => { setFormOpen(false); setEditing(null); }}
        slip={editing}
        nextReference={nextReference}
        onSave={handleSave}
      />

      <BorrowSlipDetailModal
        slip={viewing}
        onClose={() => setViewing(null)}
        onReturn={id => {
          returnSlip(id);
          toast.success('Item returned', 'The borrow slip has been marked as returned.');
        }}
      />
    </div>
  );
}
