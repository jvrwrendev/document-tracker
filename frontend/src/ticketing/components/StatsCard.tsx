import type { ReactNode } from 'react';
import { Card } from '@/components/ui/Card';

interface StatsCardProps {
  label: string;
  value: number | string;
  icon: ReactNode;
  tone?: 'brand' | 'amber' | 'blue' | 'emerald' | 'rose' | 'slate';
  hint?: string;
}

const tones: Record<NonNullable<StatsCardProps['tone']>, string> = {
  brand: 'bg-brand-50 text-brand-700 border-brand-100',
  amber: 'bg-amber-50 text-amber-700 border-amber-100',
  blue: 'bg-blue-50 text-blue-700 border-blue-100',
  emerald: 'bg-emerald-50 text-emerald-700 border-emerald-100',
  rose: 'bg-rose-50 text-rose-700 border-rose-100',
  slate: 'bg-slate-100 text-slate-700 border-slate-200',
};

export function StatsCard({ label, value, icon, tone = 'brand', hint }: StatsCardProps) {
  return (
    <Card className="p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium text-slate-500 truncate">{label}</p>
          <p className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">{value}</p>
          {hint && <p className="mt-1 text-[11px] text-slate-400 truncate">{hint}</p>}
        </div>
        <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border ${tones[tone]}`}>
          {icon}
        </div>
      </div>
    </Card>
  );
}
