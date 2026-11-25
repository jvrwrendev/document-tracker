import { useCallback, useEffect, useState } from 'react';
import { officeService } from '@/features/system-admin/offices/services/office.service';
import { ApiError } from '@/features/system-admin/offices/services/office.service';
import type {
  CreateOfficeInput,
  Office,
  UpdateOfficeInput,
} from '@/features/system-admin/offices/types/office';

interface UseOfficesReturn {
  offices: Office[];
  loading: boolean;
  error: string | null;

  refetch: () => Promise<void>;

  fetchById: (id: string) => Promise<Office>;
  create: (input: CreateOfficeInput) => Promise<Office>;
  update: (id: string, input: UpdateOfficeInput) => Promise<Office>;
  remove: (id: string) => Promise<void>;

  creating: boolean;
  updating: boolean;
  deleting: boolean;
  actionError: string | null;
  clearActionError: () => void;
}

function toMessage(err: unknown, fallback: string): string {
  if (err instanceof ApiError) return err.message;
  if (err instanceof Error) return err.message;
  return fallback;
}

export function useOffices(): UseOfficesReturn {
  const [offices, setOffices] = useState<Office[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [creating, setCreating] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const clearActionError = useCallback(() => setActionError(null), []);

  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setOffices(await officeService.listAll());
    } catch (err) {
      if (err instanceof ApiError && err.status === 429) {
        await new Promise(resolve => setTimeout(resolve, 2000));
        try {
          setOffices(await officeService.listAll());
          return;
        } catch (retryErr) {
          setError(toMessage(retryErr, 'Failed to load offices.'));
          setOffices([]);
          return;
        }
      }
      setError(toMessage(err, 'Failed to load offices.'));
      setOffices([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  useEffect(() => {
    const handleInvalidation = () => {
      void refetch();
    };
    window.addEventListener('employees:invalidate', handleInvalidation);
    window.addEventListener('users:invalidate', handleInvalidation);
    return () => {
      window.removeEventListener('employees:invalidate', handleInvalidation);
      window.removeEventListener('users:invalidate', handleInvalidation);
    };
  }, [refetch]);

  const fetchById = useCallback(async (id: string) => {
    return officeService.getById(id);
  }, []);

  const create = useCallback(
    async (input: CreateOfficeInput) => {
      setCreating(true);
      setActionError(null);
      try {
        const created = await officeService.create(input);
        await refetch();
        return created;
      } catch (err) {
        setActionError(toMessage(err, 'Failed to create office.'));
        throw err;
      } finally {
        setCreating(false);
      }
    },
    [refetch],
  );

  const update = useCallback(
    async (id: string, input: UpdateOfficeInput) => {
      setUpdating(true);
      setActionError(null);
      try {
        const updated = await officeService.update(id, input);
        await refetch();
        return updated;
      } catch (err) {
        setActionError(toMessage(err, 'Failed to update office.'));
        throw err;
      } finally {
        setUpdating(false);
      }
    },
    [refetch],
  );

  const remove = useCallback(
    async (id: string) => {
      setDeleting(true);
      setActionError(null);
      try {
        await officeService.remove(id);
        await refetch();
      } catch (err) {
        setActionError(toMessage(err, 'Failed to delete office.'));
        throw err;
      } finally {
        setDeleting(false);
      }
    },
    [refetch],
  );

  return {
    offices,
    loading,
    error,
    refetch,
    fetchById,
    create,
    update,
    remove,
    creating,
    updating,
    deleting,
    actionError,
    clearActionError,
  };
}

export function useOfficeDirectory(): {
  offices: Office[];
  loading: boolean;
  error: string | null;
} {
  const [offices, setOffices] = useState<Office[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    officeService.listAll()
      .then(list => {
        if (active) setOffices(list);
      })
      .catch(err => {
        if (active) setError(toMessage(err, 'Failed to load offices.'));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, []);

  return { offices, loading, error };
}
