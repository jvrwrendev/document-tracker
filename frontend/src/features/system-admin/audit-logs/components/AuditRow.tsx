import { Calendar, Globe } from 'lucide-react';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { cn, formatDate } from '@/lib/utils';
import { ROLE_LABELS } from '@/constants';
import type { AuditLogItem } from '@/features/system-admin/audit-logs/types/audit-log';

interface AuditRowProps {
  log: AuditLogItem;
}

const ACTION_TONE: Record<string, 'emerald' | 'rose' | 'orange' | 'indigo' | 'blue' | 'teal' | 'brand' | 'slate'> = {
  RECEIVE: 'blue',
  LOGIN: 'teal',
  CREATE: 'brand',
} as const;

export function AuditRow({ log }: AuditRowProps) {
  const actionTone = ACTION_TONE[log.action] ?? 'slate';
  const actorName = log.actor?.fullName ?? log.actorId ?? 'System';
  const actorRole = log.actor?.role ?? '';
  const actorPosition = log.actor?.position ?? 'System process';
  const avatarColor = log.actor?.avatarColor ?? 'bg-slate-600';

  const time = new Date(log.createdAt);
  const timeStr = time.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

  return (
    <div className="flex items-start gap-3 px-5 py-3 hover:bg-slate-50/60 transition-colors">
      <Avatar name={actorName} color={avatarColor} size="md" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-sm font-semibold text-slate-900 truncate">{actorName}</p>
          <Badge variant="slate" size="sm">
            {ROLE_LABELS[actorRole as keyof typeof ROLE_LABELS] ?? actorRole}
          </Badge>
          <Badge variant={actionTone} size="sm">
            {log.action}
          </Badge>
          <Badge variant="slate" size="sm">
            {log.module}
          </Badge>
        </div>
        <p className="text-sm text-slate-700 mt-0.5">{log.description}</p>
        <p className="text-[11px] text-slate-400 mt-0.5">
          {actorPosition}
          {log.targetType && log.targetId ? ` · ${log.targetType}: ${log.targetId.slice(0, 8)}…` : ''}
        </p>
      </div>
      <div className="shrink-0 text-right text-[11px] text-slate-400">
        <p className="flex items-center justify-end gap-1">
          <Calendar className="h-3 w-3" />
          {formatDate(log.createdAt)}
        </p>
        <p className={cn('tabular-nums')}>{timeStr}</p>
        {log.ipAddress && (
          <p className="mt-0.5 flex items-center justify-end gap-1">
            <Globe className="h-3 w-3" />
            <span className="font-mono">{log.ipAddress}</span>
          </p>
        )}
      </div>
    </div>
  );
}