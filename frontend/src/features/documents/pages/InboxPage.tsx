import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertCircle,
  Building2,
  CheckCircle2,
  Clock,
  Eye,
  Inbox,
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
import { Modal } from '@/components/ui/Modal';
import { Textarea } from '@/components/ui/Input';
import { useAuth, useCurrentUser } from '@/features/authentication/hooks/useAuth';
import { useInboxDocuments } from '@/features/documents/hooks/useOfficeDocuments';
import { useDocumentReceive } from '@/features/documents/hooks/useDocumentReceive';
import { useOfficeLookup, useUserLookup } from '@/hooks/useLookups';
import { useToast } from '@/hooks/useToast';
import { DOCUMENT_TYPE_LABELS } from '@/constants';
import { Pagination } from '@/components/ui/Pagination';
import { useSearch } from '@/hooks/useSearch';
import { formatDate, formatRelative, cn } from '@/lib/utils';
import type {
  DocumentListItem,
  DocumentPriority,
  RecipientStatus,
} from '@/features/documents/types/document';

type InboxTab = 'pending' | 'received' | 'all';

export function InboxPage() {
  const user = useCurrentUser();
  const { hasPermission } = useAuth();
  const toast = useToast();
  const receiveAction = useDocumentReceive();
  const officeById = useOfficeLookup();
  const userById = useUserLookup();
  const { query: search, setQuery: setSearch, debounced } = useSearch({
    debounceMs: 250,
  });
  const [tab, setTab] = useState<InboxTab>('pending');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [receivingDoc, setReceivingDoc] = useState<DocumentListItem | null>(null);
  const [remarks, setRemarks] = useState('');

  const { items: documents, total, summary, loading, error } = useInboxDocuments({
    page,
    pageSize,
    search: debounced || undefined,
    priority: priorityFilter === 'all' ? undefined : (priorityFilter as DocumentPriority),
    recipientStatus: tab === 'all' ? undefined : (tab as RecipientStatus),
    sortBy: 'createdAt',
    order: 'desc',
  });

  useEffect(() => {
    if (error) toast.error('Failed to load inbox', error);
  }, [error, toast]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const start = (safePage - 1) * pageSize;
  const end = Math.min(start + pageSize, total);

  useEffect(() => {
    if (page !== safePage) setPage(safePage);
  }, [page, safePage]);

  const canReceive = hasPermission('documents.receive') && !!user.officeId;
  const recipientOf = (document: DocumentListItem) => document.recipients[0];

  const changeTab = (next: InboxTab) => {
    setTab(next);
    setPage(1);
  };

  const confirmReceive = async () => {
    if (!receivingDoc) return;
    const result = await receiveAction.receive(receivingDoc.id, {
      remarks: remarks.trim() || undefined,
    });
    if (!result) {
      toast.error('Action failed', receiveAction.error ?? 'Please retry.');
      return;
    }
    toast.success('Document received', 'Receipt recorded for your office.');
    setReceivingDoc(null);
    setRemarks('');
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Inbox"
        description="Documents addressed to your assigned office"
        actions={
          <Link to="/documents">
            <Button variant="outline">All Documents</Button>
          </Link>
        }
      />

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <SmallStat icon={<Inbox className="h-4 w-4" />} label="Total Incoming" value={summary.totalIncoming} accent="indigo" />
        <SmallStat icon={<Clock className="h-4 w-4" />} label="Awaiting Receipt" value={summary.awaitingReceipt} accent="amber" />
        <SmallStat icon={<CheckCircle2 className="h-4 w-4" />} label="Received" value={summary.received} accent="emerald" />
        <SmallStat icon={<AlertCircle className="h-4 w-4" />} label="Overdue" value={summary.overdue} accent="rose" />
      </div>

      <Card padded={false}>
        <div className="overflow-x-auto border-b border-slate-200 px-5 pt-4">
          <Tabs
            className="min-w-max"
            value={tab}
            onChange={value => changeTab(value as InboxTab)}
            items={[
              { id: 'pending', label: 'Awaiting Receipt', count: summary.awaitingReceipt },
              { id: 'received', label: 'Received', count: summary.received },
              { id: 'all', label: 'All', count: summary.totalIncoming },
            ]}
          />
        </div>

        <div className="flex flex-col gap-3 border-b border-slate-200 p-4 sm:flex-row">
          <SearchInput
            value={search}
            onChange={value => {
              setSearch(value);
              setPage(1);
            }}
            placeholder="Search by tracking #, title, or sender…"
            className="flex-1"
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
            className="!w-44"
          />
        </div>

        <Table
          data={documents}
          keyExtractor={document => document.id}
          emptyState={
            <EmptyState
              icon={<Inbox className="h-7 w-7" />}
              title={!user.officeId ? 'No office assigned' : loading ? 'Loading inbox…' : 'Your inbox is empty'}
              description={
                !user.officeId
                  ? 'Ask an administrator to assign your account to an office.'
                  : 'No incoming documents match the current filter.'
              }
            />
          }
          columns={[
            {
              key: 'trackingNumber',
              header: 'Tracking #',
              width: '150px',
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
                  <Link to={`/documents/${document.id}`} className="font-medium text-slate-900 hover:text-brand-700">
                    {document.title}
                  </Link>
                  <div className="mt-0.5 flex items-center gap-1.5">
                    <Badge variant="slate" size="sm">{DOCUMENT_TYPE_LABELS[document.type]}</Badge>
                    <PriorityBadge priority={document.priority} />
                  </div>
                </div>
              ),
            },
            {
              key: 'from',
              header: 'From',
              width: '180px',
              cell: document => {
                const fromOffice = document.originatingOfficeId
                  ? officeById(document.originatingOfficeId)
                  : null;
                const internalFrom = fromOffice?.name ?? document.originatingOfficeName;
                const internalFromCode = fromOffice?.code ?? 'Manual';
                return (
                  <div className="flex items-center gap-1.5 text-xs">
                    <Building2 className="h-3.5 w-3.5 text-slate-400" />
                    <div>
                      <p className="text-slate-700">{document.source === 'external' ? document.senderName : internalFrom}</p>
                      <p className="text-[10px] text-slate-400">{document.source === 'external' ? 'External' : internalFromCode}</p>
                    </div>
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
                  <p className="text-slate-700">{formatDate(document.createdAt)}</p>
                  <p className="text-[10px] text-slate-400">{formatRelative(document.createdAt)}</p>
                </div>
              ),
            },
            {
              key: 'received',
              header: 'Received by My Office',
              width: '180px',
              cell: document => {
                const recipient = recipientOf(document);
                if (!recipient || recipient.status !== 'received') {
                  return <span className="text-xs text-slate-400">—</span>;
                }
                const receiver = recipient.receivedById
                  ? userById(recipient.receivedById)
                  : undefined;
                return (
                  <div className="text-xs">
                    <p className="text-slate-700">{receiver?.fullName ?? 'Unknown user'}</p>
                    <p className="text-[10px] text-slate-400">
                      {recipient.receivedAt ? formatDate(recipient.receivedAt, true) : '—'}
                    </p>
                  </div>
                );
              },
            },
            {
              key: 'due',
              header: 'Due Date',
              width: '130px',
              cell: document => {
                if (!document.dueDate) return <span className="text-xs text-slate-400">—</span>;
                const recipient = recipientOf(document);
                const overdue =
                  recipient?.status === 'pending' &&
                  document.status !== 'archived' &&
                  new Date(document.dueDate).getTime() < Date.now();
                return (
                  <div className="text-xs">
                    <p className={cn('font-medium', overdue ? 'text-rose-700' : 'text-slate-700')}>
                      {formatDate(document.dueDate)}
                    </p>
                    <p className={cn('text-[10px]', overdue ? 'text-rose-500' : 'text-slate-400')}>
                      {overdue ? 'Overdue' : formatRelative(document.dueDate)}
                    </p>
                  </div>
                );
              },
            },
            {
              key: 'status',
              header: 'Status',
              width: '150px',
              cell: document => {
                const recipient = recipientOf(document);
                const received = recipient?.status === 'received';
                return (
                  <div className="flex flex-wrap items-center gap-1">
                    <Badge variant={received ? 'emerald' : 'amber'} size="sm">
                      {received ? 'Received' : 'Awaiting Receipt'}
                    </Badge>
                    {document.status === 'archived' && <Badge variant="slate" size="sm">Archived</Badge>}
                  </div>
                );
              },
            },
            {
              key: 'actions',
              header: 'Actions',
              width: '120px',
              align: 'right',
              cell: document => {
                const recipient = recipientOf(document);
                const canAct =
                  canReceive &&
                  recipient?.status === 'pending' &&
                  document.status !== 'archived' &&
                  document.encodedById !== user.id;
                return (
                  <div className="flex items-center justify-end gap-1">
                    <Link
                      to={`/documents/${document.id}`}
                      className="inline-flex rounded p-1.5 text-slate-500 hover:bg-brand-50 hover:text-brand-700"
                      aria-label="View document"
                    >
                      <Eye className="h-4 w-4" />
                    </Link>
                    {canAct && (
                      <Button
                        size="sm"
                        variant="primary"
                        leftIcon={<Inbox className="h-3.5 w-3.5" />}
                        onClick={() => {
                          setRemarks('');
                          setReceivingDoc(document);
                        }}
                      >
                        Receive
                      </Button>
                    )}
                  </div>
                );
              },
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

      <Modal
        open={receivingDoc !== null}
        onClose={() => setReceivingDoc(null)}
        title="Receive Document"
        description="Acknowledge receipt for your office. Other recipient offices remain unaffected."
        size="md"
        footer={
          <>
            <Button variant="outline" onClick={() => setReceivingDoc(null)}>Cancel</Button>
            <Button variant="primary" onClick={confirmReceive} disabled={receiveAction.saving}>
              {receiveAction.saving ? 'Receiving…' : 'Confirm Receive'}
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
            <p className="text-xs text-slate-500">Document</p>
            <p className="text-sm font-semibold text-slate-900">
              {receivingDoc?.trackingNumber} · {receivingDoc?.title}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              {user.officeName ?? 'Your office'} · {user.officeCode ?? ''}
            </p>
          </div>
          <Textarea
            label="Remarks (optional)"
            rows={4}
            value={remarks}
            onChange={event => setRemarks(event.target.value)}
            placeholder="Optional note about this receipt…"
          />
        </div>
      </Modal>
    </div>
  );
}

function SmallStat({
  icon,
  label,
  value,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  accent: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white p-3">
      <div className={cn(
        'flex h-9 w-9 items-center justify-center rounded-md border',
        accent === 'amber' ? 'border-amber-200 bg-amber-50 text-amber-700' :
          accent === 'indigo' ? 'border-indigo-200 bg-indigo-50 text-indigo-700' :
            accent === 'emerald' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' :
              'border-rose-200 bg-rose-50 text-rose-700',
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
