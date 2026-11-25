import { Card, CardHeader } from '@/components/ui/Card';
import { UserStatusBadge } from '@/features/system-admin/users/components/UserStatusBadge';
import type {
  OfficeSummary,
  UserStatusApi,
} from '@/features/system-admin/users/types/user';
import { AVATAR_COLORS } from '@/constants';

interface UserPreviewCardProps {
  firstName: string;
  lastName: string;
  email: string;
  username: string;
  position: string;
  roleLabel: string;
  status: UserStatusApi;
  office: OfficeSummary | null;
}

export function UserPreviewCard({
  firstName,
  lastName,
  email,
  username,
  position,
  roleLabel,
  status,
  office,
}: UserPreviewCardProps) {
  const fullName = [firstName, lastName].filter(Boolean).join(' ').trim() || '—';
  const initials = `${firstName[0] ?? '?'}${lastName[0] ?? ''}`.toUpperCase();
  const colorIndex = Math.abs(
    (firstName + lastName).split('').reduce((acc, ch) => acc + ch.charCodeAt(0), 0),
  ) % AVATAR_COLORS.length;

  return (
    <Card>
      <CardHeader title="Preview" description="How the user will appear" />
      <div className="flex items-center gap-3">
        <div
          className={`w-14 h-14 rounded-full ${AVATAR_COLORS[colorIndex]} text-white flex items-center justify-center text-base font-semibold shrink-0`}
        >
          {initials}
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-slate-900 truncate">{fullName}</p>
          <p className="text-xs text-slate-500 truncate">{email || '—'}</p>
          <p className="text-xs text-slate-500 truncate mt-0.5">{roleLabel}</p>
        </div>
      </div>
      <dl className="mt-4 space-y-2 text-xs">
        <PreviewRow label="Username" value={username || '—'} mono />
        <PreviewRow label="Position" value={position || '—'} />
        <PreviewRow label="Office" value={office?.name ?? 'Unassigned'} />
        <div className="flex items-center justify-between">
          <dt className="text-slate-500">Status</dt>
          <dd>
            <UserStatusBadge status={status} />
          </dd>
        </div>
      </dl>
    </Card>
  );
}

function PreviewRow({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex items-center justify-between">
      <dt className="text-slate-500">{label}</dt>
      <dd
        className={`font-medium text-slate-900 truncate ml-2 ${mono ? 'font-mono' : ''}`}
      >
        {value}
      </dd>
    </div>
  );
}
