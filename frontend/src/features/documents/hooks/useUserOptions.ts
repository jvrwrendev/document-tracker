import { useEffect, useState } from 'react';
import { userService } from '@/features/system-admin/users/services/user.service';
import type { UserOption } from '@/features/system-admin/users/types/user';

export function useUserOptions() {
  const [users, setUsers] = useState<UserOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    userService.userOptions()
      .then(items => {
        if (active) setUsers(items);
      })
      .catch(err => {
        if (active) setError(err instanceof Error ? err.message : 'Failed to load users.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, []);

  return { users, loading, error };
}
