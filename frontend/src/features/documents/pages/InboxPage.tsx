import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Inbox,
  Building2,
  AlertCircle,
  CheckCircle2,
  Clock,
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
import { Modal } from '@/components/ui/Modal';
import { Textarea } from '@/components/ui/Input';
import { useAuth, useCurrentUser } from '@/features/authentication/hooks/useAuth';
import { useDocuments } from '@/features/documents/hooks/useDocuments';
import { useDocumentReceive } from '@/features/documents/hooks/useDocumentReceive';
import { useOfficeLookup } from '@/hooks/useLookups';
import { useToast } from '@/hooks/useToast';
import {
  DOCUMENT_TYPE_LABELS,
} from '@/constants';
import { usePagination } from '@/hooks/usePagination';
import { Pagination } from '@/components/ui/Pagination';
import { formatDate, formatRelative, cn } from '@/lib/utils';
import type { DocumentListItem } from '@/features/documents/types/document';

type InboxTab = 'pending' | 'received' | 'all';

// Only the automatic archival status is finalized; an archived document can no
// longer be received.
const FINALIZED_STATUSES = ['archived'];

export function InboxPage() {
  const user = useCurrentUser();
  const { hasPermission } = useAuth();
  const toast = useToast();
  const receiveAction = useDocumentReceive();
  const { items: documents } = useDocuments({
    ...(user.officeId ? { recipientOfficeId: user.officeId } : {}),
    pageSize: 100,
  });
  const [tab, setTabState] = useState<InboxTab>('pending');
  const [search, setSearch] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [receivingDoc, setReceivingDoc] = useState<DocumentListItem | null>(null);
  const [remarks, setRemarks] = useState('');
  const officeById = useOfficeLookup();

  const canReceive =
    hasPermission('documents.receive') && !!user.officeId;

  const recipientOf = (d: DocumentListItem) =>
    d.recipients.find(r => r.officeId === user.officeId);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return documents.filter(d => {
      const status = recipientOf(d)?.status;
      if (tab === 'pending' && status !== 'pending') return false;
      if (tab === 'received' && status !== 'received') return false;
      if (priorityFilter !== 'all' && d.priority !== priorityFilter) return false;
      if (q) {
        const haystack = `${d.trackingNumber} ${d.title} ${d.senderName ?? ''}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [documents, tab, search, priorityFilter, user.officeId]);

  const pagination = usePagination({ totalItems: filtered.length, initialPageSize: 10 });
  const paged = useMemo(
    () => filtered.slice(pagination.start, pagination.end),
    [filtered, pagination.start, pagination.end]
  );

  const setTab = (next: InboxTab) => {
    setTabState(next);
    pagination.reset();
  };

  const counts = useMemo(() => {
    const pending = documents.filter(
      d => recipientOf(d)?.status === 'pending' && !FINALIZED_STATUSES.includes(d.status)
    ).length;
    const received = documents.filter(d => recipientOf(d)?.status === 'received').length;
    return { pending, received, all: documents.length };
  }, [documents, user.officeId]);

  const overdueCount = useMemo(() => {
    return documents.filter(d =>
      recipientOf(d)?.status === 'pending' &&
      !FINALIZED_STATUSES.includes(d.status) &&
      d.dueDate &&
      new Date(d.dueDate).getTime() < new Date().getTime()
    ).length;
  }, [documents, user.officeId]);

  const confirmReceive = async () => {
    if (!receivingDoc) return;
    const result = await receiveAction.receive(receivingDoc.id, {
      remarks: remarks.trim() || undefined,
    });
    if (!result) {
      toast.error('Action failed', receiveAction.error ?? 'Please retry.');
      return;
    }
    toast.success('Document received', `Receipt recorded for your office.`);
    setReceivingDoc(null);
    setRemarks('');
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Inbox"
        description="Documents routed to your office for receiving"
        actions={
          <Link to="/documents">
            <Button variant="outline">All Documents</Button>
          </Link>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <SmallStat icon={<Clock className="w-4 h-4" />} label="Awaiting Receipt" value={counts.pending} accent="amber" />
        <SmallStat icon={<CheckCircle2 className="w-4 h-4" />} label="Received" value={counts.received} accent="emerald" />
        <SmallStat icon={<Inbox className="w-4 h-4" />} label="All" value={counts.all} accent="indigo" />
        <SmallStat icon={<AlertCircle className="w-4 h-4" />} label="Overdue" value={overdueCount} accent="rose" />
      </div>

      <Card padded={false}>
        <div className="px-5 pt-4 border-b border-slate-200">
          <Tabs
            value={tab}
            onChange={v => setTab(v as InboxTab)}
            items={[
              { id: 'pending', label: 'Awaiting Receipt', count: counts.pending },
              { id: 'received', label: 'Received', count: counts.received },
              { id: 'all', label: 'All', count: counts.all },
            ]}
          />
        </div>

        <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row gap-3">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Search inbox…"
            className="flex-1"
          />
          <Select
            value={priorityFilter}
            onChange={e => { setPriorityFilter(e.target.value); pagination.reset(); }}
            options={[
              { value: 'all', label: 'All Priorities' },
              { value: 'urgent', label: 'Urgent' },
              { value: 'high', label: 'High' },
              { value: 'normal', label: 'Normal' },
              { value: 'low', label: 'Low' },
            ]}
            className="!w-44"
          />
        </div>

        <Table
          data={paged}
          keyExtractor={d => d.id}
          emptyState={
            <EmptyState
              icon={<Inbox className="w-7 h-7" />}
              title="Your inbox is empty"
              description="No documents match the current filter."
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
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <Badge variant="slate" size="sm">{DOCUMENT_TYPE_LABELS[d.type]}</Badge>
                    <PriorityBadge priority={d.priority} />
                  </div>
                </div>
              ),
            },
            {
              key: 'from',
              header: 'From',
              width: '180px',
              cell: d => {
                const fromOffice = d.originatingOfficeId ? officeById(d.originatingOfficeId) : null;
                const internalFrom = fromOffice?.name ?? d.originatingOfficeName;
                const internalFromCode = fromOffice?.code ?? 'Manual';
                return (
                  <div className="flex items-center gap-1.5 text-xs">
                    <Building2 className="w-3.5 h-3.5 text-slate-400" />
                    <div>
                      <p className="text-slate-700">{d.source === 'external' ? d.senderName : internalFrom}</p>
                      <p className="text-slate-400 text-[10px]">{d.source === 'external' ? 'External' : internalFromCode}</p>
                    </div>
                  </div>
                );
              },
            },
            {
              key: 'received',
              header: 'Received by My Office',
              width: '150px',
              cell: d => {
                const rec = recipientOf(d);
                if (!rec || rec.status !== 'received') {
                  return <Badge variant="amber" size="sm">Not yet received</Badge>;
                }
                return (
                  <div className="text-xs">
                    <p className="text-slate-700">{rec.receivedAt ? formatDate(rec.receivedAt) : '—'}</p>
                    <p className="text-slate-400 text-[10px]">{rec.receivedAt ? formatRelative(rec.receivedAt) : ''}</p>
                  </div>
                );
              },
            },
            {
              key: 'due',
              header: 'Due',
              width: '130px',
              cell: d => {
                if (!d.dueDate) return <span className="text-xs text-slate-400">—</span>;
                const overdue = new Date(d.dueDate).getTime() < new Date().getTime() && !FINALIZED_STATUSES.includes(d.status);
                return (
                  <div className="text-xs">
                    <p className={cn('font-medium', overdue ? 'text-rose-700' : 'text-slate-700')}>
                      {formatDate(d.dueDate)}
                    </p>
                    <p className={cn('text-[10px]', overdue ? 'text-rose-500' : 'text-slate-400')}>
                      {overdue ? 'Overdue' : formatRelative(d.dueDate)}
                    </p>
                  </div>
                );
              },
            },
            {
              key: 'status',
              header: 'Status',
              width: '150px',
              cell: d => <StatusBadge status={d.status} />,
            },
            {
              key: 'action',
              header: '',
              width: '140px',
              cell: d => {
                const rec = recipientOf(d);
                const canAct =
                  canReceive &&
                  rec?.status === 'pending' &&
                  !FINALIZED_STATUSES.includes(d.status) &&
                  d.encodedById !== user.id;
                if (!canAct) return null;
                return (
                  <Button
                    size="sm"
                    variant="primary"
                    leftIcon={<Inbox className="w-3.5 h-3.5" />}
                    onClick={() => { setRemarks(''); setReceivingDoc(d); }}
                  >
                    Receive
                  </Button>
                );
              },
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

      <Modal
        open={!!receivingDoc}
        onClose={() => setReceivingDoc(null)}
        title="Receive Document"
        description="Acknowledge receipt for your office. Other recipient offices remain unaffected."
        size="md"
        footer={
          <>
            <Button variant="outline" onClick={() => setReceivingDoc(null)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={confirmReceive}
              disabled={receiveAction.saving}
            >
              {receiveAction.saving ? 'Receiving…' : 'Confirm Receive'}
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <div className="p-3 rounded-md bg-slate-50 border border-slate-200">
            <p className="text-xs text-slate-500">Document</p>
            <p className="text-sm font-semibold text-slate-900">
              {receivingDoc?.trackingNumber} · {receivingDoc?.title}
            </p>
            <p className="text-xs text-slate-500 mt-1">
              {user.officeName ?? 'Your office'} · {user.officeCode ?? ''}
            </p>
          </div>
          <Textarea
            label="Remarks (optional)"
            rows={4}
            value={remarks}
            onChange={e => setRemarks(e.target.value)}
            placeholder="Optional note about this receipt…"
          />
        </div>
      </Modal>
    </div>
  );
}

function SmallStat({ icon, label, value, accent }: { icon: React.ReactNode; label: string; value: number; accent: string }) {
  return (
    <div className="bg-white border border-slate-200 rounded-lg p-3 flex items-center gap-3">
      <div className={cn(
        'w-9 h-9 rounded-md border flex items-center justify-center',
        accent === 'amber' ? 'bg-amber-50 text-amber-700 border-amber-200' :
        accent === 'indigo' ? 'bg-indigo-50 text-indigo-700 border-indigo-200' :
        accent === 'emerald' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
        'bg-rose-50 text-rose-700 border-rose-200'
      )}>
        {icon}
      </div>
      <div>
        <p className="text-xl font-semibold text-slate-900">{value}</p>
        <p className="text-xs text-slate-500">{label}</p>
      </div>
    </div>
  );
}