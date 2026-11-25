import { useCallback, useEffect, useRef, useState } from 'react';
import {
  documentsService,
  DocumentsApiError,
} from '@/features/documents/services/documents.service';
import type {
  DocumentListItem,
  DocumentListResponse,
  InboxFilters,
  InboxListResponse,
  InboxSummary,
  OutboxFilters,
  OutboxListResponse,
  OutboxSummary,
} from '@/features/documents/types/document';

interface OfficeListResponse<T> extends DocumentListResponse {
  summary: T;
}

function toMessage(error: unknown, fallback: string): string {
  if (error instanceof DocumentsApiError) return error.message;
  if (error instanceof Error) return error.message;
  return fallback;
}

function useOfficeDocumentList<F extends object, S>({
  fetcher,
  filters,
  initialSummary,
}: {
  fetcher: (filters: F) => Promise<OfficeListResponse<S>>;
  filters: F;
  initialSummary: S;
}): {
  items: DocumentListItem[];
  total: number;
  page: number;
  pageSize: number;
  summary: S;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
} {
  const [items, setItems] = useState<DocumentListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [summary, setSummary] = useState<S>(initialSummary);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const filtersRef = useRef(filters);
  const requestSequence = useRef(0);
  filtersRef.current = filters;

  const fetchList = useCallback(async () => {
    const requestId = ++requestSequence.current;
    setLoading(true);
    setError(null);
    try {
      const response = await fetcher(filtersRef.current);
      if (requestId !== requestSequence.current) return;
      setItems(response.items);
      setTotal(response.total);
      setPage(response.page);
      setPageSize(response.pageSize);
      setSummary(response.summary);
    } catch (err) {
      if (requestId === requestSequence.current) {
        setError(toMessage(err, 'Could not load documents.'));
      }
    } finally {
      if (requestId === requestSequence.current) setLoading(false);
    }
  }, [fetcher]);

  const queryKey = JSON.stringify(filters);
  useEffect(() => {
    void fetchList();
  }, [fetchList, queryKey]);

  useEffect(() => {
    const handleInvalidation = () => void fetchList();
    window.addEventListener('documents:invalidate', handleInvalidation);
    return () => window.removeEventListener('documents:invalidate', handleInvalidation);
  }, [fetchList]);

  return {
    items,
    total,
    page,
    pageSize,
    summary,
    loading,
    error,
    refresh: fetchList,
  };
}

const EMPTY_INBOX_SUMMARY: InboxSummary = {
  totalIncoming: 0,
  awaitingReceipt: 0,
  received: 0,
  overdue: 0,
};

const EMPTY_OUTBOX_SUMMARY: OutboxSummary = {
  totalOutgoing: 0,
  awaitingReceipt: 0,
  partiallyReceived: 0,
  fullyReceived: 0,
};

export function useInboxDocuments(filters: InboxFilters) {
  return useOfficeDocumentList<InboxFilters, InboxSummary>({
    fetcher: documentsService.inbox,
    filters,
    initialSummary: EMPTY_INBOX_SUMMARY,
  });
}

export function useOutboxDocuments(filters: OutboxFilters) {
  return useOfficeDocumentList<OutboxFilters, OutboxSummary>({
    fetcher: documentsService.outbox,
    filters,
    initialSummary: EMPTY_OUTBOX_SUMMARY,
  });
}

export type { InboxListResponse, OutboxListResponse };
