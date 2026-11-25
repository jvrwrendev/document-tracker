import { useMemo } from 'react';
import { useOfficeDirectory } from '@/features/system-admin/offices/hooks/useOffices';
import { useUserOptions } from '@/features/documents/hooks/useUserOptions';
import { AVATAR_COLORS } from '@/constants';

export interface LookupUser {
  id: string;
  fullName: string;
  email: string | null;
  role: string;
  officeId: string | null;
  officeName: string | null;
  position: string | null;
  avatarColor: string;
}

function colorForId(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) | 0;
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

export function useOfficeLookup() {
  const { offices } = useOfficeDirectory();
  const map = useMemo(() => new Map(offices.map(o => [o.id, o])), [offices]);
  return (id: string | null | undefined) => (id ? map.get(id) : undefined);
}

export function useUserLookup() {
  const { users } = useUserOptions();
  const map = useMemo(
    () => new Map(users.map(u => [u.id, { ...u, avatarColor: colorForId(u.id) } as LookupUser])),
    [users],
  );
  return (id: string | null | undefined) => (id ? map.get(id) : undefined);
}
