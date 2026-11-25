import {
  Archive,
  Activity,
  Building2,
  Check,
  Database,
  FileText,
  History,
  Inbox,
  KeyRound,
  LayoutDashboard,
  Lock,
  Mail,
  Settings,
  ShieldCheck,
  Users as UsersIcon,
  UserCog,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ROLE_SHORT_LABELS } from '@/constants';
import type { PermissionGroupMeta } from '@/features/system-admin/roles-permissions/types/role';
import type { Permission, UserRole } from '@/types';

const ICON_MAP: Record<string, LucideIcon> = {
  LayoutDashboard, FileText, Inbox, Mail, Activity, Archive,
  Users: UsersIcon, UserCog, Building2, ShieldCheck, KeyRound, Settings, History, Database,
};

interface PermissionGroupProps {
  group: PermissionGroupMeta;
  granted: Permission[];
  draftGranted: Permission[];
  editing: boolean;
  canEdit: boolean;
  saving: boolean;
  selectedRole?: UserRole;
  onToggle: (permission: Permission) => void;
  onSelectAll: (permissions: Permission[]) => void;
  onDeselectAll: (permissions: Permission[]) => void;
}

export function PermissionGroup({
  group, granted, draftGranted, editing, canEdit, saving, selectedRole,
  onToggle, onSelectAll, onDeselectAll,
}: PermissionGroupProps) {
  const Icon = ICON_MAP[group.iconName] ?? ShieldCheck;
  const active = editing ? draftGranted : granted;
  const grantedCount = group.permissions.filter(p => active.includes(p.key)).length;
  const editablePerms = group.permissions.filter(p => !p.reserved && !p.mandatory && !(p.restrictedTo && selectedRole && !p.restrictedTo.includes(selectedRole)));
  const allSelected = editablePerms.length > 0 && editablePerms.every(p => active.includes(p.key));

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      <div className="flex items-center justify-between gap-2 border-b border-border bg-muted/40 px-4 py-2.5">
        <div className="flex items-center gap-2 min-w-0">
          <span className="flex h-7 w-7 items-center justify-center rounded-md border border-border bg-background text-brand-700 shrink-0">
            <Icon className="h-3.5 w-3.5" />
          </span>
          <h4 className="text-sm font-semibold text-foreground truncate">{group.module}</h4>
          <span className="text-xs font-medium text-muted-foreground tabular-nums shrink-0">
            {grantedCount}/{group.permissions.length}
          </span>
        </div>
        {editing && canEdit && (
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              disabled={saving || editablePerms.length === 0}
              onClick={() => onSelectAll(editablePerms.map(p => p.key))}
              className="text-[11px] font-medium text-brand-700 hover:text-brand-800 disabled:opacity-40"
            >
              Select All
            </button>
            <span className="text-slate-300">|</span>
            <button
              type="button"
              disabled={saving || editablePerms.length === 0}
              onClick={() => onDeselectAll(editablePerms.map(p => p.key))}
              className="text-[11px] font-medium text-slate-500 hover:text-slate-700 disabled:opacity-40"
            >
              Deselect All
            </button>
          </div>
        )}
      </div>
      <ul className="divide-y divide-border">
        {group.permissions.map(perm => {
          const isGranted = active.includes(perm.key);
          const blockedByRole = !!selectedRole && !!perm.restrictedTo && !perm.restrictedTo.includes(selectedRole);
          const isDisabled = perm.reserved || perm.mandatory || blockedByRole;
          const disabledReason = perm.reserved
            ? 'Reserved until this feature is implemented'
            : perm.mandatory
              ? 'Mandatory for System Administrator'
              : blockedByRole
                ? `Restricted to ${(perm.restrictedTo ?? []).map(r => ROLE_SHORT_LABELS[r as UserRole] ?? r).join(', ')}`
                : undefined;
          const canToggle = editing && canEdit && !saving && !isDisabled;

          return (
            <li key={perm.key} className="flex items-center justify-between gap-3 px-4 py-2.5 hover:bg-muted/30">
              <label className={cn('flex items-center gap-3 min-w-0 flex-1', canToggle ? 'cursor-pointer' : 'cursor-default')}>
                <input
                  type="checkbox"
                  checked={isGranted}
                  disabled={!canToggle}
                  onChange={() => canToggle && onToggle(perm.key)}
                  className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500 disabled:opacity-50"
                  aria-label={perm.label}
                />
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-foreground truncate">{perm.label}</p>
                    {isDisabled && <Lock className="h-3 w-3 text-slate-400 shrink-0" />}
                  </div>
                  <p className="text-[11px] text-muted-foreground font-mono truncate">{perm.key}</p>
                  {disabledReason && <p className="mt-0.5 text-[11px] text-amber-700">{disabledReason}</p>}
                </div>
              </label>
              <span className={cn(
                'shrink-0 text-[11px] font-semibold px-2 py-0.5 rounded border',
                isGranted ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-50 text-slate-500 border-slate-200',
              )}>
                {isGranted ? 'Granted' : 'Not granted'}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}