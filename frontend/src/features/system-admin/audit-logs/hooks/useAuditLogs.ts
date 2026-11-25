import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { auditLogsService, AuditLogsApiError } from '@/features/system-admin/audit-logs/services/audit-logs.service';
import type {
  AuditLogItem,
  AuditLogListFilters,
  AuditLogListResponse,
  AuditLogStats,
} from '@/features/system-admin/audit-logs/types/audit-log';

function toMessage(err: unknown, fallback: string): string {
  if (err instanceof AuditLogsApiError) return err.message;
  if (err instanceof Error) return err.message;
  return fallback;
}

export interface UseAuditLogsReturn {
  items: AuditLogItem[];
  total: number;
  page: number;
  pageSize: number;
  loading: boolean;
  error: string | null;

  fetchList: (filters?: AuditLogListFilters) => Promise<AuditLogListResponse | null>;
  refresh: () => Promise<void>;

  filters: AuditLogListFilters;
  setFilters: (filters: AuditLogListFilters) => void;
}

export function useAuditLogs(initial?: AuditLogListFilters): UseAuditLogsReturn {
  const [items, setItems] = useState<AuditLogItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(initial?.pageSize ?? 25);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFiltersState] = useState<AuditLogListFilters>({
    pageSize: initial?.pageSize ?? 25,
    ...initial,
  });

  const initialRef = useRef<AuditLogListFilters | undefined>(initial);
  const didInitRef = useRef(false);

  const fetchList = useCallback(async (next?: AuditLogListFilters): Promise<AuditLogListResponse | null> => {
    setLoading(true);
    setError(null);
    try {
      const res = await auditLogsService.list(next);
      setItems(res.items);
      setTotal(res.total);
      setPage(res.page);
      setPageSize(res.pageSize);
      return res;
    } catch (err) {
      setError(toMessage(err, 'Could not load audit logs.'));
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (didInitRef.current) return;
    didInitRef.current = true;
    void fetchList(initialRef.current);
  }, [fetchList]);

  const refresh = useCallback(async () => {
    await fetchList(filters);
  }, [fetchList, filters]);

  const setFilters = useCallback((next: AuditLogListFilters) => {
    setFiltersState(next);
    void fetchList(next);
  }, [fetchList]);

  return useMemo(
    () => ({
      items,
      total,
      page,
      pageSize,
      loading,
      error,
      fetchList,
      refresh,
      filters,
      setFilters,
    }),
    [items, total, page, pageSize, loading, error, fetchList, refresh, filters, setFilters],
  );
}

export function computeStats(items: AuditLogItem[]): AuditLogStats {
  const today = new Date().toDateString();
  const unique = new Set<string>();
  let registrations = 0;
  for (const item of items) {
    if (item.actor?.id) unique.add(item.actor.id);
    if (item.action === 'document.register') registrations += 1;
    if (new Date(item.createdAt).toDateString() === today) {
      // counted below via .filter
    }
  }
  const todayCount = items.filter(i => new Date(i.createdAt).toDateString() === today).length;
  return {
    total: items.length,
    today: todayCount,
    uniqueActors: unique.size,
    registrations,
  };
}