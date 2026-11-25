import { useEffect, useMemo, useState } from 'react';
import {
  History,
  Download,
  Calendar,
  Monitor,
  Activity,
  Users,
  ShieldCheck,
} from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { Pagination } from '@/components/ui/Pagination';
import { EmptyState } from '@/components/ui/EmptyState';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/hooks/useToast';
import { usePagination } from '@/hooks/usePagination';
import { computeStats, useAuditLogs } from '@/features/system-admin/audit-logs/hooks/useAuditLogs';
import {
  AuditFilters,
  AuditRow,
  AuditStatCard,
} from '@/features/system-admin/audit-logs/components';

export function AuditLogsPage() {
  const toast = useToast();
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('all');
  const [moduleFilter, setModuleFilter] = useState('all');

  const { items, total, loading, error } = useAuditLogs({ pageSize: 25 });

  const hasActiveFilters =
    search.length > 0 || actionFilter !== 'all' || moduleFilter !== 'all';

  const actions = useMemo(() => Array.from(new Set(items.map(l => l.action))), [items]);
  const modules = useMemo(() => Array.from(new Set(items.map(l => l.module))), [items]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items
      .filter(l => {
        if (actionFilter !== 'all' && l.action !== actionFilter) return false;
        if (moduleFilter !== 'all' && l.module !== moduleFilter) return false;
        if (!q) return true;
        const haystack = [
          l.actor?.fullName,
          l.description,
          l.ipAddress,
          l.actor?.email,
          l.targetId,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        return haystack.includes(q);
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [items, actionFilter, moduleFilter, search]);

  const stats = useMemo(() => computeStats(items), [items]);

  const pagination = usePagination({
    totalItems: filtered.length,
    initialPageSize: 15,
  });
  const paged = filtered.slice(pagination.start, pagination.end);

  useEffect(() => {
    if (error) toast.error('Failed to load audit logs', error);
  }, [error, toast]);

  const clearFilters = () => {
    setSearch('');
    setActionFilter('all');
    setModuleFilter('all');
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Audit Logs"
        description="Complete history of all system actions for accountability and transparency"
        actions={
          <Button variant="outline" leftIcon={<Download className="h-4 w-4" />} disabled>
            Export CSV
          </Button>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <AuditStatCard
          label="Total events"
          value={stats.total}
          icon={<History className="h-5 w-5" />}
        />
        <AuditStatCard
          label="Today"
          value={stats.today}
          icon={<Calendar className="h-5 w-5" />}
          accent="brand"
        />
        <AuditStatCard
          label="Unique actors"
          value={stats.uniqueActors}
          icon={<Users className="h-5 w-5" />}
          accent="indigo"
        />
        <AuditStatCard
          label="Registrations"
          value={stats.registrations}
          icon={<ShieldCheck className="h-5 w-5" />}
          accent="emerald"
        />
      </div>

      <Card padded={false}>
        <div className="px-4 sm:px-6 py-4 border-b border-border bg-muted/40">
          <AuditFilters
            search={search}
            onSearchChange={setSearch}
            actionFilter={actionFilter}
            onActionChange={setActionFilter}
            moduleFilter={moduleFilter}
            onModuleChange={setModuleFilter}
            actions={actions}
            modules={modules}
            resultCount={filtered.length}
            hasActiveFilters={hasActiveFilters}
            onClear={clearFilters}
          />
        </div>

        <div className="divide-y divide-slate-100">
          {loading && items.length === 0 ? (
            <p className="text-sm text-slate-500 py-12 text-center">Loading audit logs…</p>
          ) : filtered.length === 0 ? (
            <EmptyState
              icon={<History className="h-7 w-7" />}
              title="No audit entries"
              description={
                hasActiveFilters
                  ? 'No entries match your filters. Try clearing them.'
                  : 'No actions have been logged yet.'
              }
              className="py-16"
            />
          ) : (
            paged.map(log => <AuditRow key={log.id} log={log} />)
          )}
        </div>

        {filtered.length > 0 && (
          <div className="border-t border-slate-200 px-4 py-3">
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

      <div className="rounded-xl bg-amber-50 border border-amber-200 p-4">
        <div className="flex items-start gap-2.5">
          <Monitor className="h-4 w-4 text-amber-700 mt-0.5 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-amber-900">Audit Retention Policy</p>
            <p className="text-xs text-amber-800 mt-0.5">
              All system actions are logged and retained for a minimum of 3 years in compliance with
              government record-keeping requirements. Logs cannot be modified or deleted by any user,
              including administrators.
            </p>
            <p className="text-[11px] text-amber-700 mt-1.5 inline-flex items-center gap-1">
              <Activity className="h-3 w-3" />
              Loaded {total} event{total === 1 ? '' : 's'} from server. Showing {filtered.length} after filters.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}