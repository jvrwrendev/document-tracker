import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface HealthItemProps {
  label: string;
  status: 'healthy' | 'warning' | 'error' | 'unavailable';
  value: string;
  icon?: ReactNode;
}

const STATUS_STYLES = {
  healthy: { dot: 'bg-emerald-500', glow: 'bg-emerald-500/10 text-emerald-700', label: 'Operational' },
  warning: { dot: 'bg-amber-500', glow: 'bg-amber-500/10 text-amber-700', label: 'Attention' },
  error: { dot: 'bg-rose-500', glow: 'bg-rose-500/10 text-rose-700', label: 'Degraded' },
  unavailable: { dot: 'bg-slate-400', glow: 'bg-slate-100 text-slate-600', label: 'Unavailable' },
} as const;

export function HealthItem({ label, status, value, icon }: HealthItemProps) {
  const tone = STATUS_STYLES[status];
  return (
    <div className="group relative overflow-hidden rounded-xl border border-slate-200 bg-white p-4 transition-all hover:border-slate-300 hover:shadow-sm">
      <div className="flex items-start justify-between">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
            {label}
          </p>
          <p className="mt-2 text-lg font-semibold text-slate-900 tabular-nums">
            {value}
          </p>
        </div>
        {icon && (
          <span className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-lg', tone.glow)}>
            {icon}
          </span>
        )}
      </div>
      <div className="mt-3 flex items-center gap-1.5">
        <span className={cn('h-1.5 w-1.5 rounded-full', tone.dot)} />
        <span className="text-[11px] font-medium text-slate-500">{tone.label}</span>
      </div>
    </div>
  );
}