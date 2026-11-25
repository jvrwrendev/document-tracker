import { useEffect, useMemo, useState } from 'react';
import {
  ClipboardList,
  Edit2,
  Eye,
  MoreVertical,
  Plus,
  RefreshCw,
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
import { Modal } from '@/components/ui/Modal';
import { Skeleton } from '@/components/ui/skeleton';
import { useConfirm } from '@/components/ui/ConfirmDialog';
import { useToast } from '@/hooks/useToast';
import { useServiceRequests } from '@/ticketing/hooks/useServiceRequests';
import { ServiceRequestDetailModal } from '@/ticketing/components/ServiceRequestDetailModal';
import { ServiceRequestFormModal } from '@/ticketing/components/ServiceRequestFormModal';
import { ServiceRequestPriorityBadge, ServiceRequestStatusBadge } from '@/ticketing/components/StatusBadges';
import { formatDateOnly } from '@/ticketing/data/format';
import {
  SERVICE_CATEGORIES,
  type ServiceRequest,
  type ServiceRequestInput,
  type ServiceRequestPriority,
  type ServiceRequestStatus,
} from '@/ticketing/types';

type SortKey = 'referenceNumber' | 'requesterName' | 'priority' | 'status' | 'dateRequested';

export function ServiceRequestsPage() {
  const { items, loading, nextReference, createRequest, updateRequest, updateStatus, deleteRequest } = useServiceRequests();
  const toast = useToast();
  const confirm = useConfirm();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [sortKey, setSortKey] = useState<SortKey>('dateRequested');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<ServiceRequest | null>(null);
  const [viewing, setViewing] = useState<ServiceRequest | null>(null);
  const [statusTarget, setStatusTarget] = useState<ServiceRequest | null>(null);
  const [statusDraft, setStatusDraft] = useState<ServiceRequestStatus>('pending');

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const rows = items.filter(item => {
      if (q && ![
        item.referenceNumber,
        item.requesterName,
        item.requesterOffice,
        item.category,
        item.description,
        item.assignedPersonnel,
      ].some(value => value.toLowerCase().includes(q))) return false;
      if (statusFilter !== 'all' && item.status !== statusFilter) return false;
      if (priorityFilter !== 'all' && item.priority !== priorityFilter) return false;
      if (categoryFilter !== 'all' && item.category !== categoryFilter) return false;
      return true;
    });
    const priorityRank: Record<ServiceRequestPriority, number> = { low: 0, medium: 1, high: 2, urgent: 3 };
    return rows.sort((a, b) => {
      let result = 0;
      if (sortKey === 'priority') result = priorityRank[a.priority] - priorityRank[b.priority];
      else if (sortKey === 'dateRequested') result = new Date(a.dateRequested).getTime() - new Date(b.dateRequested).getTime();
      else result = String(a[sortKey]).localeCompare(String(b[sortKey]));
      return sortDirection === 'asc' ? result : -result;
    });
  }, [items, search, statusFilter, priorityFilter, categoryFilter, sortKey, sortDirection]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const start = (safePage - 1) * pageSize;
  const paged = filtered.slice(start, start + pageSize);

  useEffect(() => {
    if (page !== safePage) setPage(safePage);
  }, [page, safePage]);

  useEffect(() => {
    setPage(1);
  }, [search, statusFilter, priorityFilter, categoryFilter, pageSize]);

  const resetFilters = () => {
    setSearch('');
    setStatusFilter('all');
    setPriorityFilter('all');
    setCategoryFilter('all');
  };

  const handleSort = (key: string) => {
    const nextKey = key as SortKey;
    if (sortKey === nextKey) setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    else {
      setSortKey(nextKey);
      setSortDirection('asc');
    }
  };

  const handleSave = (input: ServiceRequestInput, id?: string) => {
    if (id) {
      updateRequest(id, input);
      toast.success('Request updated', 'The service request has been saved.');
    } else {
      const created = createRequest(input);
      toast.success('Request created', `${created.referenceNumber} has been submitted.`);
    }
    setFormOpen(false);
    setEditing(null);
  };

  const handleDelete = async (request: ServiceRequest) => {
    const ok = await confirm({
      title: 'Delete service request?',
      description: `${request.referenceNumber} will be permanently removed from mock data.`,
      confirmText: 'Delete',
      variant: 'danger',
    });
    if (!ok) return;
    deleteRequest(request.id);
    toast.success('Request deleted', `${request.referenceNumber} has been removed.`);
  };

  const handleStatusSave = () => {
    if (!statusTarget) return;
    updateStatus(statusTarget.id, statusDraft);
    toast.success('Status updated', `${statusTarget.referenceNumber} is now ${statusDraft.replace('_', ' ')}.`);
    setStatusTarget(null);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Service Request"
        description="Track and manage service requests submitted by offices"
        eyebrow="Ticketing System"
        actions={
          <Button leftIcon={<Plus className="h-4 w-4" />} onClick={() => { setEditing(null); setFormOpen(true); }}>
            Create Request
          </Button>
        }
      />

      <Card padded={false}>
        <div className="flex flex-col gap-4 px-4 py-4 sm:px-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="grid w-full grid-cols-1 gap-3 sm:grid-cols-2 lg:flex lg:max-w-3xl">
            <SearchInput
              value={search}
              onChange={setSearch}
              placeholder="Search reference, requester, office, or description…"
              className="lg:w-80"
            />
            <Select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              options={[
                { value: 'all', label: 'All Status' },
                { value: 'pending', label: 'Pending' },
                { value: 'in_progress', label: 'In Progress' },
                { value: 'completed', label: 'Completed' },
              ]}
              className="lg:w-40"
            />
            <Select
              value={priorityFilter}
              onChange={e => setPriorityFilter(e.target.value)}
              options={[
                { value: 'all', label: 'All Priorities' },
                { value: 'low', label: 'Low' },
                { value: 'medium', label: 'Medium' },
                { value: 'high', label: 'High' },
                { value: 'urgent', label: 'Urgent' },
              ]}
              className="lg:w-40"
            />
            <Select
              value={categoryFilter}
              onChange={e => setCategoryFilter(e.target.value)}
              options={[
                { value: 'all', label: 'All Categories' },
                ...SERVICE_CATEGORIES.map(category => ({ value: category, label: category })),
              ]}
              className="lg:w-48"
            />
          </div>
          <Button variant="outline" size="sm" onClick={resetFilters} leftIcon={<RefreshCw className="h-3.5 w-3.5" />}>
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
                width: '150px',
                sortable: true,
                cell: item => <span className="font-mono text-[12px] font-semibold text-brand-700">{item.referenceNumber}</span>,
              },
              {
                key: 'requesterName',
                header: 'Requester / Office',
                sortable: true,
                cell: item => (
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-slate-900">{item.requesterName}</p>
                    <p className="truncate text-[11px] text-slate-500">{item.requesterOffice}</p>
                  </div>
                ),
              },
              {
                key: 'category',
                header: 'Service / Description',
                cell: item => (
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-slate-700">{item.category}</p>
                    <p className="line-clamp-1 text-[11px] text-slate-500">{item.description}</p>
                  </div>
                ),
              },
              {
                key: 'priority',
                header: 'Priority',
                width: '110px',
                sortable: true,
                cell: item => <ServiceRequestPriorityBadge priority={item.priority} />,
              },
              {
                key: 'status',
                header: 'Status',
                width: '130px',
                sortable: true,
                cell: item => <ServiceRequestStatusBadge status={item.status} />,
              },
              {
                key: 'assigned',
                header: 'Assigned To',
                width: '150px',
                cell: item => <span className="text-xs text-slate-600">{item.assignedPersonnel}</span>,
              },
              {
                key: 'dateRequested',
                header: 'Date Requested',
                width: '130px',
                sortable: true,
                cell: item => <span className="text-xs text-slate-600">{formatDateOnly(item.dateRequested)}</span>,
              },
              {
                key: 'actions',
                header: 'Actions',
                width: '70px',
                cell: item => (
                  <Dropdown
                    align="right"
                    trigger={<button type="button" className="inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100" aria-label="Request actions"><MoreVertical className="h-4 w-4" /></button>}
                    items={[
                      { id: 'view', label: 'View details', icon: <Eye className="h-4 w-4" />, onClick: () => setViewing(item) },
                      { id: 'edit', label: 'Edit request', icon: <Edit2 className="h-4 w-4" />, onClick: () => { setEditing(item); setFormOpen(true); } },
                      { id: 'status', label: 'Update status', icon: <RefreshCw className="h-4 w-4" />, onClick: () => { setStatusTarget(item); setStatusDraft(item.status); } },
                      { id: 'danger', label: '', divider: true },
                      { id: 'delete', label: 'Delete request', icon: <Trash2 className="h-4 w-4" />, destructive: true, onClick: () => void handleDelete(item) },
                    ]}
                  />
                ),
              },
            ]}
            emptyState={
              <EmptyState
                icon={<ClipboardList className="h-7 w-7" />}
                title={items.length === 0 ? 'No service requests yet' : 'No matching requests'}
                description={items.length === 0 ? 'Create the first service request to get started.' : 'Try adjusting your search or filters.'}
                action={items.length === 0 ? <Button onClick={() => setFormOpen(true)}>Create Request</Button> : undefined}
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

      <ServiceRequestFormModal
        open={formOpen}
        onClose={() => { setFormOpen(false); setEditing(null); }}
        request={editing}
        nextReference={nextReference}
        onSave={handleSave}
      />

      <ServiceRequestDetailModal
        request={viewing}
        onClose={() => setViewing(null)}
        onStatusChange={(id, status) => {
          updateStatus(id, status);
          toast.success('Status updated', 'The service request status has been changed.');
        }}
      />

      <Modal
        open={!!statusTarget}
        onClose={() => setStatusTarget(null)}
        title="Update Status"
        description={statusTarget ? `${statusTarget.referenceNumber} · ${statusTarget.requesterName}` : undefined}
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => setStatusTarget(null)}>Cancel</Button>
            <Button onClick={handleStatusSave}>Save Status</Button>
          </>
        }
      >
        <Select
          label="New Status"
          value={statusDraft}
          onChange={e => setStatusDraft(e.target.value as ServiceRequestStatus)}
          options={[
            { value: 'pending', label: 'Pending' },
            { value: 'in_progress', label: 'In Progress' },
            { value: 'completed', label: 'Completed' },
          ]}
        />
      </Modal>
    </div>
  );
}
