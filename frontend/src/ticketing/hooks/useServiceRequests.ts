import { useCallback, useEffect, useMemo, useState } from 'react';
import { seedServiceRequests, createServiceRequestReference } from '@/ticketing/data/seed';
import { loadCollection, saveCollection, storageKeys } from '@/ticketing/data/storage';
import type {
  ServiceRequest,
  ServiceRequestInput,
  ServiceRequestStatus,
} from '@/ticketing/types';

export function useServiceRequests() {
  const [items, setItems] = useState<ServiceRequest[]>(() =>
    loadCollection(storageKeys.serviceRequests, seedServiceRequests),
  );
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timer = window.setTimeout(() => setLoading(false), 350);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!loading) saveCollection(storageKeys.serviceRequests, items);
  }, [items, loading]);

  const nextReference = useMemo(() => {
    const max = items.reduce((acc, item) => {
      const match = item.referenceNumber.match(/(\d+)$/);
      return match ? Math.max(acc, Number(match[1])) : acc;
    }, 0);
    return createServiceRequestReference(max + 1);
  }, [items]);

  const createRequest = useCallback((input: ServiceRequestInput): ServiceRequest => {
    const now = new Date().toISOString();
    const created: ServiceRequest = {
      ...input,
      id: `sr-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      referenceNumber: createServiceRequestReference(
        Number(nextReference.match(/(\d+)$/)?.[1] ?? 1),
      ),
      dateRequested: now,
      updatedAt: now,
    };
    setItems(prev => [created, ...prev]);
    return created;
  }, [nextReference]);

  const updateRequest = useCallback((id: string, patch: Partial<ServiceRequestInput>) => {
    setItems(prev => prev.map(item =>
      item.id === id ? { ...item, ...patch, updatedAt: new Date().toISOString() } : item,
    ));
  }, []);

  const updateStatus = useCallback((id: string, status: ServiceRequestStatus) => {
    updateRequest(id, { status });
  }, [updateRequest]);

  const deleteRequest = useCallback((id: string) => {
    setItems(prev => prev.filter(item => item.id !== id));
  }, []);

  return {
    items,
    loading,
    nextReference,
    createRequest,
    updateRequest,
    updateStatus,
    deleteRequest,
  };
}
