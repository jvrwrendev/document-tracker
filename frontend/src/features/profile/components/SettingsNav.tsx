import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export interface SettingsNavItem {
  id: string;
  label: string;
  icon: ReactNode;
  description?: string;
  badge?: number | string;
}

interface SettingsNavProps {
  items: SettingsNavItem[];
  value: string;
  onChange: (id: string) => void;
  className?: string;
}

export function SettingsNav({ items, value, onChange, className }: SettingsNavProps) {
  return (
    <nav
      role="tablist"
      aria-label="Settings sections"
      className={cn('flex flex-col gap-1', className)}
    >
      {items.map(item => {
        const active = item.id === value;
        return (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(item.id)}
            className={cn(
              'flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors',
              'focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500',
              active
                ? 'bg-brand-50 text-brand-800 border border-brand-200'
                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 border border-transparent',
            )}
          >
            <span className={cn('shrink-0', active ? 'text-brand-700' : 'text-slate-400')}>
              {item.icon}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium leading-tight truncate">{item.label}</p>
              {item.description && (
                <p className="text-[11px] text-slate-500 truncate">{item.description}</p>
              )}
            </div>
            {typeof item.badge === 'number' && item.badge > 0 && (
              <span className="inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-rose-100 px-1.5 text-[10px] font-semibold text-rose-700">
                {item.badge}
              </span>
            )}
          </button>
        );
      })}
    </nav>
  );
}