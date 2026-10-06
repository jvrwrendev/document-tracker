import { useMemo, type ReactNode } from 'react';
import {
  Hash,
  Inbox,
  Archive as ArchiveIcon,
  Circle,
  Calendar,
  Clock,
  Building2,
  AlertCircle,
  User as UserIcon,
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Avatar } from '@/components/ui/Avatar';
import { useOfficeLookup } from '@/hooks/useLookups';
import { AVATAR_COLORS } from '@/constants';
import { formatDate, cn } from '@/lib/utils';
import type {
  DocumentDetail,
  DocumentPerson,
  DocumentStatus,
} from '@/features/documents/types/document';

export type TrackerState = 'completed' | 'current' | 'pending';

export interface TrackerStep {
  status: DocumentStatus;
  label: string;
  description: string;
  icon: ReactNode;
  timestamp: string | null;
  person: DocumentPerson | null;
  personLabel: string;
  officeId: string | null;
  remarks: string | null;
  state: TrackerState;
}

interface DocumentTrackerProps {
  document: DocumentDetail;
}

function colorForId(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) | 0;
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

const STEP_ICON: Record<string, ReactNode> = {
  registered: <Hash className="w-3.5 h-3.5" />,
  received: <Inbox className="w-3.5 h-3.5" />,
  archived: <ArchiveIcon className="w-3.5 h-3.5" />,
};

const stepStyle = (state: TrackerState): string => {
  switch (state) {
    case 'current':
      return 'bg-brand-600 text-white border-brand-600 ring-4 ring-brand-100';
    case 'completed':
      return 'bg-emerald-600 text-white border-emerald-600';
    default:
      return 'bg-white text-slate-300 border-slate-200 border-dashed';
  }
};

const stateBadge = (state: TrackerState): { label: string; className: string } => {
  switch (state) {
    case 'current':
      return { label: 'Current', className: 'bg-brand-50 text-brand-700 border-brand-200' };
    case 'completed':
      return { label: 'Completed', className: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
    default:
      return { label: 'Pending', className: 'bg-slate-100 text-slate-500 border-slate-200' };
  }
};

export function DocumentTracker({ document }: DocumentTrackerProps) {
  const officeById = useOfficeLookup();

  const steps = useMemo<TrackerStep[]>(() => {
    const builder: Array<{
      status: DocumentStatus;
      label: string;
      description: string;
      icon: ReactNode;
      timestamp: string | null;
      person: DocumentPerson | null;
      personLabel: string;
      officeId: string | null;
      remarks: string | null;
    }> = [
      {
        status: 'registered',
        label: 'Registered',
        description: 'Document was encoded and registered in the records system.',
        icon: STEP_ICON.registered,
        timestamp: document.createdAt,
        person: document.encodedBy,
        personLabel: 'Encoder',
        officeId: document.originatingOfficeId,
        remarks: null,
      },
      {
        status: 'received',
        label: 'Received',
        description: 'Document was received and acknowledged by at least one recipient office.',
        icon: STEP_ICON.received,
        timestamp: document.dateReceived,
        person: document.receivedBy,
        personLabel: 'Received by',
        officeId: document.currentOfficeId,
        remarks: null,
      },
      {
        status: 'archived',
        label: 'Archived',
        description: 'Document was automatically archived after the 7-day retention period.',
        icon: STEP_ICON.archived,
        timestamp: document.archives[0]?.archivedAt ?? null,
        person: null,
        personLabel: 'Archived by',
        officeId: document.currentOfficeId,
        remarks: null,
      },
    ];

    return builder.map((step) => {
      let state: TrackerState;
      if (document.status === step.status) {
        state = 'current';
      } else if (step.timestamp) {
        state = 'completed';
      } else {
        state = 'pending';
      }
      return { ...step, state };
    });
  }, [document]);

  const isArchived = document.status === 'archived';

  return (
    <Card padded={false}>
      <div className="px-5 py-4 border-b border-slate-200 flex items-center gap-3 flex-wrap">
        <div className="w-9 h-9 rounded-md bg-brand-50 text-brand-700 border border-brand-200 flex items-center justify-center">
          <AlertCircle className="w-4 h-4" />
        </div>
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-slate-900">Workflow Tracker</h2>
          <p className="text-xs text-slate-500">
            Fixed lifecycle: Registered → Received → Archived (automatic after 7 days).
          </p>
        </div>
        {!isArchived && (
          <span className="ml-auto inline-flex items-center gap-1.5 text-xs text-slate-600">
            <span className="inline-flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              Done
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-brand-600 animate-pulse" />
              Current
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-slate-300" />
              Pending
            </span>
          </span>
        )}
      </div>

      <div className="px-5 py-5">
        <ol className="relative">
          <span aria-hidden className="absolute left-[15px] top-3 bottom-3 w-px bg-slate-200" />
          {steps.map((step) => (
            <li key={step.status} className="relative pl-12 pb-5 last:pb-0">
              <span
                aria-hidden
                className={cn(
                  'absolute left-0 top-0.5 w-8 h-8 rounded-full flex items-center justify-center border-2 shrink-0',
                  stepStyle(step.state)
                )}
              >
                {step.state === 'current' ? (
                  <Circle className="w-3.5 h-3.5" />
                ) : (
                  step.icon
                )}
              </span>
              <div
                className={cn(
                  'rounded-md border p-3.5 sm:p-4',
                  step.state === 'current'
                    ? 'border-brand-300 ring-1 ring-brand-100'
                    : step.state === 'completed'
                      ? 'border-emerald-200 bg-emerald-50/40'
                      : 'border-slate-200'
                )}
              >
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-sm font-semibold text-slate-900">{step.label}</h3>
                      <span
                        className={cn(
                          'inline-flex items-center gap-0.5 rounded-md border px-1.5 py-0.5 text-[10px] font-semibold',
                          stateBadge(step.state).className
                        )}
                      >
                        {stateBadge(step.state).label}
                      </span>
                      {step.status === 'archived' && isArchived && (
                        <span className="inline-flex items-center gap-0.5 rounded-md border border-slate-200 bg-white px-1.5 py-0.5 text-[10px] font-semibold text-slate-600">
                          Terminal
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-600 mt-0.5">{step.description}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs text-slate-700 font-medium inline-flex items-center gap-1.5">
                      <Calendar className="w-3 h-3 text-slate-400" />
                      {formatDate(step.timestamp ?? undefined)}
                    </p>
                    <p className="text-[11px] text-slate-500 mt-0.5 inline-flex items-center gap-1.5">
                      <Clock className="w-3 h-3 text-slate-400" />
                      {step.timestamp ? formatTime(step.timestamp) : '—'}
                    </p>
                  </div>
                </div>

                {(step.person || step.officeId || step.remarks) && (
                  <div className="mt-3 pt-3 border-t border-slate-100 flex items-center gap-3 flex-wrap">
                    {step.person ? (
                      <span className="inline-flex items-center gap-2 rounded-md border border-slate-200 bg-white px-2 py-1 text-xs">
                        <Avatar name={step.person.fullName} color={colorForId(step.person.id)} size="xs" />
                        <span className="min-w-0">
                          <span className="block font-medium text-slate-900 truncate max-w-[180px]">
                            {step.person.fullName}
                          </span>
                          <span className="block text-[10px] text-slate-500 truncate max-w-[180px]">
                            {step.personLabel}
                            {step.person.position ? ` · ${step.person.position}` : ''}
                          </span>
                        </span>
                      </span>
                    ) : (
                      step.state !== 'pending' && (
                        <span className="inline-flex items-center gap-1.5 text-xs text-slate-500">
                          <UserIcon className="w-3 h-3 text-slate-400" />
                          {step.status === 'archived'
                            ? 'Archived automatically by the system'
                            : `${step.personLabel}: Unassigned`}
                        </span>
                      )
                    )}
                    {step.officeId && (
                      <span className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-2 py-1 text-xs text-slate-600">
                        <Building2 className="w-3 h-3 text-slate-400" />
                        <span className="font-medium text-slate-700">
                          {officeById(step.officeId)?.name ?? '—'}
                        </span>
                        <span className="font-mono text-[10px] text-slate-400">
                          {officeById(step.officeId)?.code ?? ''}
                        </span>
                      </span>
                    )}
                    {step.remarks && (
                      <span className="inline-flex items-start gap-1.5 text-xs text-slate-600 min-w-0 flex-1">
                        <AlertCircle className="w-3 h-3 text-brand-500 mt-0.5 shrink-0" />
                        <span className="truncate">{step.remarks}</span>
                      </span>
                    )}
                  </div>
                )}

                {step.state === 'current' && (
                  <div className="mt-3 inline-flex items-center gap-1.5 text-[11px] font-medium text-brand-700">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-brand-600" />
                    </span>
                    {step.status === 'received' ? 'Awaiting recipient offices' : 'Awaiting receiving'}
                  </div>
                )}
              </div>
            </li>
          ))}
        </ol>
      </div>
    </Card>
  );
}

function formatTime(iso: string | Date): string {
  const d = typeof iso === 'string' ? new Date(iso) : iso;
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
}