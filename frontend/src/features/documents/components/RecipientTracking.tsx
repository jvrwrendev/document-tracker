import { useEffect, useMemo, useState } from 'react';
import {
  Building2,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  Pencil,
  Plus,
  StickyNote,
  User,
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Table } from '@/components/ui/Table';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Textarea } from '@/components/ui/Input';
import { EmptyState } from '@/components/ui/EmptyState';
import { useConfirm } from '@/components/ui/ConfirmDialog';
import { formatDate, cn } from '@/lib/utils';
import type {
  DocumentDetail,
  DocumentRecipient,
} from '@/features/documents/types/document';
import {
  recipientOfficeCode,
  recipientOfficeName,
} from '@/features/documents/types/document';
import type { LookupUser } from '@/hooks/useLookups';

interface RecipientTrackingProps {
  document: DocumentDetail;
  userById: (id: string | null | undefined) => LookupUser | undefined;
  canManageNotes: boolean;
  currentOfficeId?: string | null;
  noteError: string | null;
  onSetNote: (officeId: string, note: string) => Promise<boolean>;
  onDeleteNote: (officeId: string) => Promise<boolean>;
}

export function RecipientTracking({
  document: doc,
  userById,
  canManageNotes,
  currentOfficeId,
  noteError,
  onSetNote,
  onDeleteNote,
}: RecipientTrackingProps) {
  const recipients = doc.recipients;
  const confirm = useConfirm();

  const [noteTarget, setNoteTarget] = useState<DocumentRecipient | null>(null);
  const [noteDraft, setNoteDraft] = useState('');
  const [noteBusy, setNoteBusy] = useState(false);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    setShowAll(false);
  }, [doc.id]);

  const summary = useMemo(() => {
    const total = recipients.length;
    const received = recipients.filter(r => r.status === 'received').length;
    const pending = total - received;
    const progress = total > 0 ? Math.round((received / total) * 100) : 0;
    return { total, received, pending, progress };
  }, [recipients]);

  const hasMore = recipients.length > 3;
  const visibleRecipients = showAll ? recipients : recipients.slice(0, 3);

  const canManageNote = (recipient: DocumentRecipient): boolean =>
    !!recipient.officeId &&
    (canManageNotes ||
      (recipient.status === 'received' && currentOfficeId === recipient.officeId));

  const openNoteModal = (recipient: DocumentRecipient) => {
    setNoteTarget(recipient);
    setNoteDraft(recipient.note ?? '');
  };

  const closeNoteModal = () => {
    setNoteTarget(null);
    setNoteDraft('');
    setNoteBusy(false);
  };

  const handleSaveNote = async () => {
    if (!noteTarget || !noteTarget.officeId || noteDraft.trim().length === 0) return;
    setNoteBusy(true);
    const success = await onSetNote(noteTarget.officeId, noteDraft);
    setNoteBusy(false);
    if (success) closeNoteModal();
  };

  const handleDeleteNote = async () => {
    if (!noteTarget || !noteTarget.officeId) return;
    const ok = await confirm({
      title: 'Delete Office Note',
      description: `Remove the note for ${recipientOfficeName(noteTarget)}? This action cannot be undone.`,
      confirmText: 'Delete',
      variant: 'danger',
    });
    if (!ok) return;
    setNoteBusy(true);
    const success = await onDeleteNote(noteTarget.officeId);
    setNoteBusy(false);
    if (success) closeNoteModal();
  };

  return (
    <Card padded={false}>
      <div className="px-5 py-4 border-b border-slate-200 flex items-center gap-3">
        <div className="w-9 h-9 rounded-md bg-brand-50 text-brand-700 border border-brand-200 flex items-center justify-center">
          <Building2 className="w-4 h-4" />
        </div>
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-slate-900">Recipient Tracking</h2>
          <p className="text-xs text-slate-500">
            Per-office receiving status — each office acknowledges receipt independently.
          </p>
        </div>
      </div>

      {summary.total === 0 ? (
        <div className="px-5 py-6">
          <EmptyState
            icon={<Building2 className="w-6 h-6" />}
            title="No recipients"
            description="No receiving office has been designated for this document."
          />
        </div>
      ) : (
        <div className="px-5 py-4 space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <SummaryTile
              icon={<Building2 className="w-4 h-4" />}
              label="Offices"
              value={summary.total}
              tone="indigo"
            />
            <SummaryTile
              icon={<CheckCircle2 className="w-4 h-4" />}
              label="Received"
              value={summary.received}
              tone="emerald"
            />
            <SummaryTile
              icon={<Clock className="w-4 h-4" />}
              label="Not Received"
              value={summary.pending}
              tone="amber"
            />
            <SummaryTile
              icon={null}
              label="Progress"
              value={`${summary.progress}%`}
              tone="slate"
            />
          </div>

          <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
            <div
              className="h-full bg-emerald-500 rounded-full transition-all duration-300"
              style={{ width: `${summary.progress}%` }}
            />
          </div>

          <Table
            data={visibleRecipients}
            keyExtractor={r => r.id}
            columns={[
              {
                key: 'office',
                header: 'Destination Office',
                cell: r => (
                  <div>
                    <p className="font-medium text-slate-900">{recipientOfficeName(r)}</p>
                    <p className="text-[11px] text-slate-400 font-mono">
                      {recipientOfficeCode(r) || 'Office deleted'}
                    </p>
                  </div>
                ),
              },
              {
                key: 'status',
                header: 'Receiving Status',
                width: '130px',
                cell: r =>
                  r.status === 'received' ? (
                    <Badge variant="emerald" size="sm">Received</Badge>
                  ) : (
                    <Badge variant="amber" size="sm">Not Received</Badge>
                  ),
              },
              {
                key: 'receivedBy',
                header: 'Received By',
                width: '170px',
                cell: r => {
                  if (r.status !== 'received' || !r.receivedById) {
                    return <span className="text-xs text-slate-400">—</span>;
                  }
                  const person = userById(r.receivedById);
                  return (
                    <span className="inline-flex items-center gap-1.5 text-xs text-slate-700">
                      <User className="w-3.5 h-3.5 text-slate-400" />
                      {person?.fullName ?? 'Unknown'}
                    </span>
                  );
                },
              },
              {
                key: 'receivedAt',
                header: 'Received Date & Time',
                width: '180px',
                cell: r =>
                  r.status === 'received' && r.receivedAt ? (
                    <span className="text-xs text-slate-700">
                      {formatDate(r.receivedAt, true)}
                    </span>
                  ) : (
                    <span className="text-xs text-slate-400">—</span>
                  ),
              },
              {
                key: 'remarks',
                header: 'Remarks',
                cell: r =>
                  r.remarks ? (
                    <span className="text-xs text-slate-600 line-clamp-2">{r.remarks}</span>
                  ) : (
                    <span className="text-xs text-slate-400">—</span>
                  ),
              },
              {
                key: 'note',
                header: 'Office Note',
                width: '240px',
                cell: r => (
                  <NoteCell
                    recipient={r}
                    canManage={canManageNote(r)}
                    userById={userById}
                    onEdit={() => openNoteModal(r)}
                  />
                ),
              },
            ]}
          />
          {hasMore && (
            <div className="pt-1">
              <Button
                variant="outline"
                size="sm"
                fullWidth
                rightIcon={showAll ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                onClick={() => setShowAll(s => !s)}
              >
                {showAll ? 'Show Less' : `Show All Offices (${recipients.length - 3} more)`}
              </Button>
            </div>
          )}
        </div>
      )}

      <Modal
        open={noteTarget !== null}
        onClose={closeNoteModal}
        title={noteTarget?.note ? 'Edit Office Note' : 'Add Office Note'}
        description={
          noteTarget
            ? `${recipientOfficeCode(noteTarget)} — ${recipientOfficeName(noteTarget)} · ${doc.trackingNumber}`
            : undefined
        }
        footer={
          <>
            <Button variant="outline" onClick={closeNoteModal} disabled={noteBusy}>
              Cancel
            </Button>
            {noteTarget?.note && (
              <Button variant="danger" onClick={handleDeleteNote} loading={noteBusy}>
                Delete note
              </Button>
            )}
            <Button
              onClick={handleSaveNote}
              loading={noteBusy}
              disabled={noteDraft.trim().length === 0}
            >
              Save note
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <Textarea
            label="Office Note"
            rows={4}
            maxLength={2000}
            value={noteDraft}
            onChange={e => setNoteDraft(e.target.value)}
            placeholder="Context for why this office has not yet received the document…"
          />
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs text-slate-400">{noteDraft.length}/2000</p>
            {noteError && <p className="text-xs text-rose-600 text-right">{noteError}</p>}
          </div>
        </div>
      </Modal>
    </Card>
  );
}

function NoteCell({
  recipient,
  canManage,
  userById,
  onEdit,
}: {
  recipient: DocumentRecipient;
  canManage: boolean;
  userById: (id: string | null | undefined) => LookupUser | undefined;
  onEdit: () => void;
}) {
  if (!recipient.note) {
    if (canManage) {
      return (
        <Button variant="outline" size="sm" leftIcon={<Plus className="w-3 h-3" />} onClick={onEdit}>
          Add note
        </Button>
      );
    }
    return <span className="text-xs text-slate-400">—</span>;
  }

  const author = userById(recipient.noteById);
  return (
    <div className="min-w-0">
      <p className="text-xs text-slate-600 line-clamp-2">{recipient.note}</p>
      <div className="flex items-center gap-2 mt-1 flex-wrap">
        <span className="text-[11px] text-slate-400 inline-flex items-center gap-1">
          <StickyNote className="w-3 h-3" />
          {author?.fullName ?? 'Unknown'}
          {recipient.noteAt ? ` · ${formatDate(recipient.noteAt, true)}` : ''}
        </span>
        {canManage && (
          <button
            type="button"
            onClick={onEdit}
            className="inline-flex items-center gap-1 text-[11px] font-medium text-brand-700 hover:text-brand-800 transition-colors"
            aria-label="Edit note"
          >
            <Pencil className="w-3 h-3" />
            Edit
          </button>
        )}
      </div>
    </div>
  );
}

function SummaryTile({
  icon,
  label,
  value,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  tone: 'indigo' | 'emerald' | 'amber' | 'slate';
}) {
  const tones: Record<typeof tone, string> = {
    indigo: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    amber: 'bg-amber-50 text-amber-700 border-amber-200',
    slate: 'bg-slate-50 text-slate-700 border-slate-200',
  };
  return (
    <div className={cn('rounded-md border p-3 flex items-center gap-2.5', tones[tone])}>
      {icon && <div className="shrink-0">{icon}</div>}
      <div className="min-w-0">
        <p className="text-lg font-semibold leading-tight">{value}</p>
        <p className="text-[11px] text-slate-500 truncate">{label}</p>
      </div>
    </div>
  );
}