import { Card, CardHeader } from '@/components/ui/Card';
import { cn } from '@/lib/utils';

export interface DistributionItem {
  label: string;
  value: number;
  tone: 'amber' | 'blue' | 'emerald' | 'rose';
}

const barTone: Record<DistributionItem['tone'], string> = {
  amber: 'bg-amber-500',
  blue: 'bg-blue-500',
  emerald: 'bg-emerald-500',
  rose: 'bg-rose-500',
};

export function StatusDistribution({ items, title = 'Status Distribution' }: { items: DistributionItem[]; title?: string }) {
  const total = items.reduce((sum, item) => sum + item.value, 0);
  return (
    <Card>
      <CardHeader title={title} description="Current breakdown of records" />
      <div className="space-y-4">
        {items.map(item => {
          const percent = total === 0 ? 0 : Math.round((item.value / total) * 100);
          return (
            <div key={item.label}>
              <div className="mb-1.5 flex items-center justify-between text-sm">
                <span className="font-medium text-slate-700">{item.label}</span>
                <span className="text-xs text-slate-500">{item.value} · {percent}%</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                <div
                  className={cn('h-full rounded-full transition-all duration-300', barTone[item.tone])}
                  style={{ width: `${percent}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
