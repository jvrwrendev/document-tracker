import { Building2, ShieldCheck } from 'lucide-react';
import { Card, CardHeader } from '@/components/ui/Card';
import { ROLE_DESCRIPTIONS } from '@/constants';
import type { UserRole } from '@/types';
import {
  ROLE_FROM_API,
  ROLE_TO_API,
  USER_ROLE_API,
  USER_ROLE_LABELS,
  type OfficeSummary,
  type UserRoleApi,
} from '@/features/system-admin/users/types/user';

interface RoleInfoCardProps {
  role: UserRole | UserRoleApi;
  office: OfficeSummary | null;
}

const API_ROLE_SET = new Set<UserRoleApi>(USER_ROLE_API);

function isApiRole(value: UserRole | UserRoleApi): value is UserRoleApi {
  return typeof value === 'string' && API_ROLE_SET.has(value as UserRoleApi);
}

function toUiRole(role: UserRole | UserRoleApi): UserRole {
  return isApiRole(role) ? ROLE_FROM_API[role] : role;
}

function roleLabel(role: UserRole | UserRoleApi): string {
  return isApiRole(role) ? USER_ROLE_LABELS[role] : USER_ROLE_LABELS[ROLE_TO_API[role]];
}

export function RoleInfoCard({ role, office }: RoleInfoCardProps) {
  const uiRole = toUiRole(role);
  const label = roleLabel(role);
  const description = ROLE_DESCRIPTIONS[uiRole];

  return (
    <Card>
      <CardHeader title="Permissions" description="Granted by the selected role" />
      <div className="space-y-2 text-sm">
        <div className="flex items-start gap-2">
          <ShieldCheck className="w-4 h-4 text-brand-600 mt-0.5 shrink-0" />
          <div>
            <p className="font-medium text-slate-900">{label}</p>
            <p className="text-xs text-slate-500">
              {description ??
                'Permissions are inherited from this role and can be adjusted per user if needed.'}
            </p>
          </div>
        </div>
        <div className="pt-3 mt-2 border-t border-slate-100 space-y-1.5">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
            Office assignment
          </p>
          <div className="flex items-center gap-2 text-xs text-slate-700">
            <Building2 className="w-3.5 h-3.5 text-slate-400" />
            {office?.name ?? 'Unassigned'}
            {office?.code ? (
              <span className="font-mono text-[10px] text-slate-500">· {office.code}</span>
            ) : null}
          </div>
        </div>
      </div>
    </Card>
  );
}
