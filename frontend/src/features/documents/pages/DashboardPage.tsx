import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  ArrowRight,
  FilePlus,
  ChevronRight,
  Bell,
  TrendingUp,
  ListChecks,
  Calendar as CalendarIcon,
  FileText,
} from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card, CardHeader } from '@/components/ui/Card';
import { StatusBadge, PriorityBadge } from '@/components/ui/StatusBadge';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { useAuth, useCurrentUser } from '@/features/authentication/hooks/useAuth';
import { useDocuments } from '@/features/documents/hooks/useDocuments';
import { useRecentNotifications } from '@/features/notifications/hooks/useRecentNotifications';
import { useToast } from '@/hooks/useToast';
import { useOfficeLookup } from '@/hooks/useLookups';
import {
  DOCUMENT_STATUS_LABELS,
  ROLE_LABELS,
} from '@/constants';
import { formatRelative, cn } from '@/lib/utils';
import type { DocumentStatus } from '@/types';
import type { NotificationItem } from '@/features/notifications/types/notification';

const PENDING_STATUSES = new Set<DocumentStatus>(['registered', 'received']);

function getActionForStatus(status: DocumentStatus): string | null {
  switch (status) {
    case 'registered': return 'Receive & log';
    default: return null;
  }
}

function getActionToneForStatus(_status: DocumentStatus): 'slate' | 'amber' {
  return 'slate';
}

export function DashboardPage() {
  const user = useCurrentUser();
  const { hasPermission } = useAuth();
  const toast = useToast();
  const { items: documents, error } = useDocuments({ fetchAll: true });
  const officeById = useOfficeLookup();
  const {
    items: recentNotifications,
    loading: notificationsLoading,
    markRead: markReadNotification,
  } = useRecentNotifications(true, 6, true);

  const [selectedNotification, setSelectedNotification] = useState<NotificationItem | null>(null);

  useEffect(() => {
    if (error) toast.error('Failed to load dashboard data', error);
  }, [error, toast]);

  const stats = useMemo(() => {
    const total = documents.length;
    const inProgress = documents.filter(d =>
      ['registered', 'received'].includes(d.status)
    ).length;
    const completed = documents.filter(d => d.status === 'archived').length;
    const overdue = documents.filter(d => {
      if (!d.dueDate) return false;
      if (d.status === 'archived') return false;
      return new Date(d.dueDate).getTime() < new Date().getTime();
    }).length;
    const myDocuments = documents.filter(d =>
      d.encodedById === user.id ||
      d.currentHolderId === user.id ||
      d.receivedById === user.id
    ).length;
    return { total, inProgress, completed, overdue, myDocuments };
  }, [documents, user.id]);

  const pendingForUser = useMemo(() => {
    return documents
      .filter(d =>
        d.currentHolderId === user.id ||
        d.receivedById === user.id ||
        d.currentOfficeId === user.officeId ||
        d.recipients.some(r => r.officeId === user.officeId && r.status === 'received')
      )
      .filter(d => PENDING_STATUSES.has(d.status))
      .sort((a, b) => {
        const overdueA = a.dueDate && new Date(a.dueDate).getTime() < Date.now() ? 0 : 1;
        const overdueB = b.dueDate && new Date(b.dueDate).getTime() < Date.now() ? 0 : 1;
        if (overdueA !== overdueB) return overdueA - overdueB;
        const aTime = a.dueDate ? new Date(a.dueDate).getTime() : Infinity;
        const bTime = b.dueDate ? new Date(b.dueDate).getTime() : Infinity;
        if (aTime !== bTime) return aTime - bTime;
        return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      });
  }, [documents, user.id]);

  const pendingTotal = pendingForUser.length;

  const statusDistribution = useMemo(() => {
    const counts: Record<DocumentStatus, number> = {
      registered: 0, received: 0,
      approved: 0, rejected: 0, released: 0, archived: 0,
    };
    documents.forEach(d => { counts[d.status as DocumentStatus]++; });
    return counts;
  }, [documents]);

  const activeStatuses = useMemo(() => {
    const active: DocumentStatus[] = ['registered', 'received', 'archived'];
    return active.map(s => ({ status: s, count: statusDistribution[s] }));
  }, [statusDistribution]);

  const completedCount = statusDistribution.archived;

  const completionRate = stats.total === 0 ? 0 : Math.round((completedCount / stats.total) * 100);

  const workflowSteps = ['registered', 'received', 'archived'] as const;

  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Welcome back, ${user.fullName.split(' ')[0]}`}
        description={`${today} · ${ROLE_LABELS[user.role]}`}
        actions={
          <>
            <Link to="/documents">
              <Button variant="outline" leftIcon={<FileText className="w-4 h-4" />}>
                View All Documents
              </Button>
            </Link>
            {hasPermission('documents.register') && (
              <Link to="/documents/register">
                <Button variant="primary" leftIcon={<FilePlus className="w-4 h-4" />}>
                  Register Document
                </Button>
              </Link>
            )}
          </>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
        <StatCard
          label="Total Documents"
          value={stats.total}
          icon={<FileText className="w-4 h-4" />}
        />
        <StatCard
          label="In Progress"
          value={stats.inProgress}
          icon={<Clock className="w-4 h-4" />}
        />
        <StatCard
          label="Awaiting My Action"
          value={pendingTotal}
          icon={<ListChecks className="w-4 h-4" />}
          footer={
            pendingTotal > 0 ? (
              <Link
                to="#pending-actions"
                className="inline-flex items-center gap-1 text-[10px] font-medium text-slate-700 hover:text-slate-900"
              >
                Review queue below
                <ArrowRight className="w-3 h-3" />
              </Link>
            ) : (
              <div className="flex items-center gap-1.5 text-[10px] text-slate-500">
                <CheckCircle2 className="w-3 h-3" />
                <span>All clear</span>
              </div>
            )
          }
        />
        <StatCard
          label="Completed"
          value={stats.completed}
          icon={<CheckCircle2 className="w-4 h-4" />}
          footer={
            <div className="flex items-center gap-1.5 text-[10px] text-slate-500">
              <TrendingUp className="w-3 h-3" />
              <span>{completionRate}% completion rate</span>
            </div>
          }
        />
        <StatCard
          label="Overdue"
          value={stats.overdue}
          icon={<AlertTriangle className="w-4 h-4" />}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        <Card className="lg:col-span-2">
          <CardHeader
            title="Document Status Overview"
            description="Distribution of documents across workflow stages"
            action={
              <Link to="/documents">
                <Button variant="ghost" size="sm" rightIcon={<ArrowRight className="w-3.5 h-3.5" />}>
                  View all
                </Button>
              </Link>
            }
          />
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {activeStatuses.map(({ status, count }) => (
              <Link
                to={`/documents?status=${status}`}
                key={status}
                className="group p-3.5 rounded-md border border-slate-200 hover:border-brand-300 hover:bg-brand-50/30 transition-colors"
              >
                <div className="flex items-center justify-between mb-2">
                  <StatusBadge status={status} className="!text-[10px] !px-1.5 !py-0" />
                  <ChevronRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-brand-600 transition-colors" />
                </div>
                <p className="text-2xl font-semibold text-slate-900 tabular-nums">{count}</p>
                <p className="text-xs text-slate-500 mt-0.5">{DOCUMENT_STATUS_LABELS[status]}</p>
              </Link>
            ))}
          </div>
        </Card>

        <Card padded={false}>
          <div className="px-5 pt-5 pb-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <h3 className="text-base font-semibold text-slate-900">Notifications</h3>
              {recentNotifications.some(n => !n.read) && (
                <span
                  className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-[10px] font-semibold tabular-nums bg-brand-500 text-white"
                >
                  {recentNotifications.filter(n => !n.read).length}
                </span>
              )}
            </div>
            <Link to="/notifications">
              <Button variant="ghost" size="sm" rightIcon={<ArrowRight className="w-3.5 h-3.5" />}>
                View all
              </Button>
            </Link>
          </div>
          <div className="px-5 pb-5 space-y-1 max-h-[280px] overflow-y-auto scrollbar-thin">
            {notificationsLoading ? (
              <div className="py-8 text-center">
                <Bell className="w-6 h-6 text-slate-300 mx-auto mb-2" />
                <p className="text-sm text-slate-500">Loading notifications…</p>
              </div>
            ) : recentNotifications.length === 0 ? (
              <div className="py-8 text-center">
                <Bell className="w-6 h-6 text-slate-300 mx-auto mb-2" />
                <p className="text-sm text-slate-500">No notifications yet</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100 -mx-5 px-5">
                {recentNotifications.map(n => (
                  <button
                    key={n.id}
                    type="button"
                    onClick={() => {
                      setSelectedNotification(n);
                      markReadNotification(n.id);
                    }}
                    className="w-full text-left flex items-start gap-3 py-3 group hover:bg-slate-50 rounded-md -mx-2 px-2 transition-colors"
                  >
                    <span className="w-2 h-2 mt-1.5 rounded-full shrink-0 bg-brand-500" />
                    <span className="flex-1 min-w-0">
                      <span className="block text-sm font-medium text-slate-900 truncate group-hover:text-brand-700">
                        {n.title}
                      </span>
                      <span className="block text-xs text-slate-600 mt-0.5 line-clamp-2">
                        {n.message}
                      </span>
                      <span className="block text-[11px] text-slate-400 mt-1">
                        {formatRelative(n.createdAt)}
                      </span>
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </Card>
      </div>

      <Card>
        <CardHeader
          title="Workflow Pipeline"
          description="End-to-end document flow from registration to archive"
        />
        <div className="overflow-x-auto pb-1 -mx-2 px-2 scrollbar-thin">
          <ol className="flex items-stretch gap-0 min-w-[820px]">
            {workflowSteps.map((step, idx) => {
              const count = statusDistribution[step];
              const isLast = idx === workflowSteps.length - 1;
              return (
                <li key={step} className="flex items-stretch flex-1">
                  <Link
                    to={`/documents?status=${step}`}
                    className="group flex-1 min-w-0 px-3 py-2.5 rounded-md border border-slate-200 hover:border-brand-300 hover:bg-slate-50/60 transition-colors"
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                        Step {idx + 1}
                      </span>
                      <span
                        className={cn(
                          'text-sm font-semibold tabular-nums',
                          count > 0 ? 'text-slate-900' : 'text-slate-300'
                        )}
                      >
                        {count}
                      </span>
                    </div>
                    <StatusBadge status={step} className="!text-[10px] !px-1.5 !py-0" />
                    <p className="text-[11px] text-slate-500 mt-1.5 truncate">
                      {DOCUMENT_STATUS_LABELS[step]}
                    </p>
                  </Link>
                  {!isLast && (
                    <div className="flex items-center justify-center px-1.5 text-slate-300 shrink-0">
                      <ArrowRight className="w-4 h-4" />
                    </div>
                  )}
                </li>
              );
            })}
          </ol>
        </div>
      </Card>

      <div id="pending-actions">
        <Card padded={false}>
        <div className="px-5 pt-5 pb-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <h3 className="text-base font-semibold text-slate-900">Pending Actions</h3>
            <span
              className={cn(
                'inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-[10px] font-semibold tabular-nums',
                pendingTotal > 0
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-500'
              )}
            >
              {pendingTotal}
            </span>
            <p className="text-xs text-slate-500 ml-2 truncate">
              {pendingTotal === 0
                ? 'You have no items waiting on your action.'
                : 'Documents currently with you that still need an action.'}
            </p>
          </div>
          <Link to="/documents">
            <Button variant="ghost" size="sm" rightIcon={<ArrowRight className="w-3.5 h-3.5" />}>
              View all
            </Button>
          </Link>
        </div>
        {pendingForUser.length === 0 ? (
          <div className="px-5 pb-8 pt-2 text-center">
            <div className="inline-flex items-center gap-2 text-sm text-slate-500">
              <CheckCircle2 className="w-4 h-4 text-slate-400" />
              Nothing in your queue right now.
            </div>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {pendingForUser.map(doc => {
              const office = officeById(doc.currentOfficeId);
              const action = getActionForStatus(doc.status as DocumentStatus);
              const isOverdue =
                !!doc.dueDate &&
                new Date(doc.dueDate).getTime() < Date.now() &&
                doc.status !== 'archived';
              return (
                <Link
                  key={doc.id}
                  to={`/documents/${doc.id}`}
                  className="flex items-start gap-3 px-5 py-3.5 hover:bg-slate-50 transition-colors group"
                >
                  <div className="w-9 h-9 rounded-md bg-slate-100 text-slate-500 flex items-center justify-center shrink-0">
                    <FileText className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="text-[11px] font-mono font-semibold text-slate-500">
                        {doc.trackingNumber}
                      </span>
                      <StatusBadge status={doc.status as DocumentStatus} className="!text-[10px] !px-1.5 !py-0" />
                      <PriorityBadge priority={doc.priority} className="!text-[10px] !px-1.5 !py-0" />
                      {action && (
                        <span
                          className={cn(
                            'inline-flex items-center rounded-md border px-1.5 py-0.5 text-[10px] font-semibold',
                            getActionToneForStatus(doc.status as DocumentStatus) === 'amber'
                              ? 'bg-amber-50 text-amber-700 border-amber-200'
                              : 'bg-slate-50 text-slate-700 border-slate-200'
                          )}
                        >
                          {action}
                        </span>
                      )}
                      {isOverdue && (
                        <span className="inline-flex items-center gap-1 rounded-md border border-rose-200 bg-rose-50 text-rose-700 px-1.5 py-0.5 text-[10px] font-semibold">
                          <AlertTriangle className="w-3 h-3" />
                          Overdue
                        </span>
                      )}
                    </div>
                    <p className="text-sm font-medium text-slate-900 truncate group-hover:text-brand-700">
                      {doc.title}
                    </p>
                    <div className="flex items-center gap-2 text-xs text-slate-500 mt-1 flex-wrap">
                      {office && <span>{office.code}</span>}
                      {doc.dueDate && (
                        <>
                          <span className="text-slate-300">·</span>
                          <span
                            className={cn(
                              'inline-flex items-center gap-1',
                              isOverdue && 'text-rose-700 font-medium'
                            )}
                          >
                            <CalendarIcon className="w-3 h-3" />
                            Due {formatRelative(doc.dueDate)}
                          </span>
                        </>
                      )}
                      <span className="text-slate-300">·</span>
                      <span>Updated {formatRelative(doc.updatedAt)}</span>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-brand-600 transition-colors shrink-0 mt-2" />
                </Link>
              );
            })}
          </div>
        )}
        </Card>
      </div>

      <Modal
        open={!!selectedNotification}
        onClose={() => setSelectedNotification(null)}
        title={selectedNotification?.title}
        description={
          selectedNotification
            ? `${selectedNotification.type.charAt(0).toUpperCase()}${selectedNotification.type.slice(1)} notification · ${formatRelative(selectedNotification.createdAt)}`
            : undefined
        }
        footer={
          selectedNotification && (
            <>
              {selectedNotification.link && (
                <Link
                  to={selectedNotification.link}
                  onClick={() => setSelectedNotification(null)}
                >
                  <Button size="sm">Open</Button>
                </Link>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedNotification(null)}
              >
                Close
              </Button>
            </>
          )
        }
      >
        <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
          {selectedNotification?.message}
        </p>
      </Modal>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon,
  footer,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <div className="bg-white border border-slate-200 rounded-lg p-4 hover:border-slate-300 transition-colors">
      <div className="flex items-center justify-between mb-3">
        <div className="w-8 h-8 rounded-md border border-slate-200 bg-slate-50 text-slate-500 flex items-center justify-center">
          {icon}
        </div>
      </div>
      <p className="text-2xl font-semibold text-slate-900 tabular-nums leading-none">{value}</p>
      <p className="text-xs text-slate-500 mt-1.5">{label}</p>
      {footer && <div className="mt-2 pt-2 border-t border-slate-100">{footer}</div>}
    </div>
  );
}