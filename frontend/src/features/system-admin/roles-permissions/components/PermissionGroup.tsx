import type { ReactNode } from 'react';
import {
  FileText,
  ShieldCheck,
  Users as UsersIcon,
  Check,
  Lock,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ROLE_SHORT_LABELS } from '@/constants';
import type { PermissionGroupMeta } from '@/features/system-admin/roles-permissions/types/role';
import type { Permission, UserRole } from '@/types';

const ICON_MAP: Record<string, LucideIcon> = {
  FileText,
  ShieldCheck,
  Users: UsersIcon,
};

interface PermissionGroupProps {
  group: PermissionGroupMeta;
  granted: Permission[];
  onToggle: (permission: Permission) => void;
  canEdit: boolean;
  disabled?: boolean;
  selectedRole?: UserRole;
}

export function PermissionGroup({
  group,
  granted,
  onToggle,
  canEdit,
  disabled,
  selectedRole,
}: PermissionGroupProps) {
  const Icon = ICON_MAP[group.iconName] ?? ShieldCheck;
  const grantedCount = group.permissions.filter(p => granted.includes(p.key)).length;

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      <div className="flex items-center justify-between gap-2 border-b border-border bg-muted/40 px-4 py-2.5">
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-md border border-border bg-background text-brand-700">
            <Icon className="h-3.5 w-3.5" />
          </span>
          <h4 className="text-sm font-semibold text-foreground">{group.label}</h4>
        </div>
        <span className="text-xs font-medium text-muted-foreground tabular-nums">
          {grantedCount} of {group.permissions.length}
        </span>
      </div>
      <ul className="divide-y divide-border">
        {group.permissions.map(perm => {
          const isGranted = granted.includes(perm.key);
          // Some permissions are reserved to specific roles and are rejected
          // by the API. Show that up front instead of letting the admin click
          // Grant and get a 403.
          const blockedHere =
            !!selectedRole &&
            !!perm.restrictedTo &&
            !perm.restrictedTo.includes(selectedRole);
          const restrictedToLabel = perm.restrictedTo
            ?.map(r => ROLE_SHORT_LABELS[r])
            .join(', ');
          return (
            <li
              key={perm.key}
              className="flex items-center justify-between gap-3 px-4 py-2.5 hover:bg-muted/50"
            >
              <div className="flex items-center gap-3 min-w-0">
                <span
                  className={cn(
                    'flex h-5 w-5 shrink-0 items-center justify-center rounded border',
                    isGranted
                      ? 'border-emerald-300 bg-emerald-50 text-emerald-700'
                      : 'border-border bg-muted text-muted-foreground/40',
                  )}
                >
                  {isGranted ? <Check className="h-3 w-3" /> : blockedHere ? (
                    <Lock className="h-3 w-3" />
                  ) : null}
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{perm.label}</p>
                  <p className="text-[11px] text-muted-foreground font-mono truncate">
                    {perm.key}
                  </p>
                  {blockedHere && (
                    <p className="mt-0.5 text-[11px] text-amber-700">
                      Restricted to {restrictedToLabel}
                    </p>
                  )}
                </div>
              </div>
              {canEdit && (
                <button
                  type="button"
                  onClick={() => onToggle(perm.key)}
                  disabled={disabled || blockedHere}
                  title={
                    blockedHere
                      ? `Recipient Tracking is restricted to ${restrictedToLabel}.`
                      : undefined
                  }
                  className={cn(
                    'shrink-0 text-xs font-semibold px-2.5 py-1 rounded-md border transition-colors',
                    disabled && 'opacity-50 cursor-not-allowed pointer-events-none',
                    blockedHere && 'opacity-40 cursor-not-allowed pointer-events-none',
                    isGranted
                      ? 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100'
                      : 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100',
                  )}
                >
                  {isGranted ? 'Revoke' : 'Grant'}
                </button>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}