import type { ReactNode } from 'react';
import { Mail, Building2, ShieldCheck, Hash, Calendar, Pencil } from 'lucide-react';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { ROLE_LABELS } from '@/constants';
import { formatDate } from '@/lib/utils';

interface SettingsHeroProps {
  fullName: string;
  email: string;
  role: string;
  officeName?: string | null;
  userId: string;
  avatarColor: string;
  createdAt: string;
  isDirty?: boolean;
  onEditClick?: () => void;
  extra?: ReactNode;
}

export function SettingsHero({
  fullName, email, role, officeName, userId, avatarColor, createdAt, isDirty = false, onEditClick, extra,
}: SettingsHeroProps) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white">
      <div className="flex flex-col gap-5 p-5 sm:flex-row sm:items-center sm:gap-6">
        <Avatar name={fullName} color={avatarColor} size="xl" className="shrink-0" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-xl font-semibold text-slate-900 truncate">{fullName}</h2>
            <Badge variant="brand" size="sm">{ROLE_LABELS[role as keyof typeof ROLE_LABELS] ?? role}</Badge>
            {isDirty && (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 border border-amber-200 px-2 py-0.5 text-[11px] font-medium text-amber-700">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                Unsaved changes
              </span>
            )}
          </div>
          <dl className="mt-3 grid grid-cols-1 gap-x-6 gap-y-1.5 text-sm sm:grid-cols-2">
            <div className="flex items-center gap-2 text-slate-600"><Mail className="h-3.5 w-3.5 text-slate-400 shrink-0" /><span className="truncate">{email}</span></div>
            <div className="flex items-center gap-2 text-slate-600"><Building2 className="h-3.5 w-3.5 text-slate-400 shrink-0" /><span className="truncate">{officeName ?? '— No office —'}</span></div>
            <div className="flex items-center gap-2 text-slate-600"><ShieldCheck className="h-3.5 w-3.5 text-slate-400 shrink-0" /><span className="truncate">{ROLE_LABELS[role as keyof typeof ROLE_LABELS] ?? role}</span></div>
            <div className="flex items-center gap-2 text-slate-600"><Calendar className="h-3.5 w-3.5 text-slate-400 shrink-0" /><span>Joined {formatDate(createdAt)}</span></div>
            <div className="flex items-center gap-2 text-slate-400 sm:col-span-2"><Hash className="h-3.5 w-3.5 shrink-0" /><span className="font-mono text-xs truncate">{userId}</span></div>
          </dl>
        </div>
        {(onEditClick || extra) && (
          <div className="flex items-center gap-2 sm:flex-col sm:items-end">
            {onEditClick && (
              <button type="button" onClick={onEditClick} className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:border-brand-300 hover:text-brand-700">
                <Pencil className="h-3.5 w-3.5" /> Edit profile
              </button>
            )}
            {extra}
          </div>
        )}
      </div>
    </div>
  );
}