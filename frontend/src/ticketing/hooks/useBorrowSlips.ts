import { useCallback, useEffect, useMemo, useState } from 'react';
import { seedBorrowSlips, createBorrowSlipReference } from '@/ticketing/data/seed';
import { loadCollection, saveCollection, storageKeys } from '@/ticketing/data/storage';
import type { BorrowSlip, BorrowSlipInput } from '@/ticketing/types';

export function useBorrowSlips() {
  const [items, setItems] = useState<BorrowSlip[]>(() =>
    loadCollection(storageKeys.borrowSlips, seedBorrowSlips),
  );
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timer = window.setTimeout(() => setLoading(false), 350);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!loading) saveCollection(storageKeys.borrowSlips, items);
  }, [items, loading]);

  const nextReference = useMemo(() => {
    const max = items.reduce((acc, item) => {
      const match = item.referenceNumber.match(/(\d+)$/);
      return match ? Math.max(acc, Number(match[1])) : acc;
    }, 0);
    return createBorrowSlipReference(max + 1);
  }, [items]);

  const createSlip = useCallback((input: BorrowSlipInput): BorrowSlip => {
    const now = new Date().toISOString();
    const created: BorrowSlip = {
      ...input,
      id: `bs-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      referenceNumber: createBorrowSlipReference(
        Number(nextReference.match(/(\d+)$/)?.[1] ?? 1),
      ),
      createdAt: now,
      updatedAt: now,
    };
    setItems(prev => [created, ...prev]);
    return created;
  }, [nextReference]);

  const updateSlip = useCallback((id: string, patch: Partial<BorrowSlipInput>) => {
    setItems(prev => prev.map(item =>
      item.id === id ? { ...item, ...patch, updatedAt: new Date().toISOString() } : item,
    ));
  }, []);

  const returnSlip = useCallback((id: string) => {
    setItems(prev => prev.map(item =>
      item.id === id
        ? { ...item, status: 'returned', actualReturnDate: new Date().toISOString(), updatedAt: new Date().toISOString() }
        : item,
    ));
  }, []);

  const deleteSlip = useCallback((id: string) => {
    setItems(prev => prev.filter(item => item.id !== id));
  }, []);

  return {
    items,
    loading,
    nextReference,
    createSlip,
    updateSlip,
    returnSlip,
    deleteSlip,
  };
}
