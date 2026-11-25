import { Badge } from '@/components/ui/Badge';
import { cn } from '@/lib/utils';
import type {
  DocumentReceiptProgress,
  DocumentReceiptState,
} from '@/features/documents/types/document';

const STATE_LABELS: Record<DocumentReceiptState, string> = {
  awaiting: 'Awaiting Receipt',
  partial: 'Partially Received',
  fully_received: 'Fully Received',
};

const STATE_VARIANTS = {
  awaiting: 'amber',
  partial: 'blue',
  fully_received: 'emerald',
} as const;

export function ReceiptStateBadge({
  state,
  className,
}: {
  state: DocumentReceiptState;
  className?: string;
}) {
  return (
    <Badge
      variant={STATE_VARIANTS[state]}
      size="sm"
      className={cn('!px-1.5 !py-0 !text-[10px] font-medium', className)}
    >
      {STATE_LABELS[state]}
    </Badge>
  );
}

export function ReceiptProgress({
  progress,
  showState = false,
}: {
  progress: DocumentReceiptProgress;
  showState?: boolean;
}) {
  const complete = progress.state === 'fully_received';

  return (
    <div className="min-w-[132px]">
      <div className="flex items-center justify-between gap-2 text-[11px] mb-1">
        <span
          className={cn(
            'tabular-nums',
            complete ? 'font-medium text-emerald-700' : 'text-slate-600',
          )}
        >
          {progress.received}/{progress.total} received
        </span>
        {showState ? (
          <ReceiptStateBadge state={progress.state} />
        ) : (
          <span className="text-slate-400 tabular-nums">{progress.percentage}%</span>
        )}
      </div>
      <div
        className="h-1 w-full overflow-hidden rounded-full bg-slate-100"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={Math.max(1, progress.total)}
        aria-valuenow={progress.received}
        aria-label="Recipient receipt progress"
      >
        <div
          className={cn(
            'h-full rounded-full transition-all',
            complete ? 'bg-emerald-500' : 'bg-brand-600',
          )}
          style={{ width: `${progress.percentage}%` }}
        />
      </div>
    </div>
  );
}
