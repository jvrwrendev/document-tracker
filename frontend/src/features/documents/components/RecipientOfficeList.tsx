import { useMemo, useState } from 'react';
import { Pencil, Plus, StickyNote, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { SearchInput } from '@/components/ui/SearchInput';
import { Textarea } from '@/components/ui/Input';
import { useConfirm } from '@/components/ui/ConfirmDialog';
import { useAuth, useCurrentUser } from '@/features/authentication/hooks/useAuth';
import { useRecipientNote } from '@/features/documents/hooks/useRecipientNote';
import { canTrackRecipients as canTrackRecipientsByRole } from '@/constants';
import { formatDate } from '@/lib/utils';
import type { LookupUser } from '@/hooks/useLookups';
import {
  calculateReceiptProgress,
  recipientOfficeCode,
  recipientOfficeName,
  type DocumentRecipient,
  type DocumentReceiptProgress,
} from '@/features/documents/types/document';
import { ReceiptProgress } from '@/features/documents/components/ReceiptProgress';

export function RecipientOfficeList({
  recipients,
  userById,
  progress,
  documentId,
}: {
  recipients: DocumentRecipient[];
  userById: (id: string | null | undefined) => LookupUser | undefined;
  progress?: DocumentReceiptProgress;
  documentId?: string;
}) {
  const { hasPermission } = useAuth();
  const user = useCurrentUser();
  const confirm = useConfirm();
  const noteAction = useRecipientNote();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [editingRecipientId, setEditingRecipientId] = useState<string | null>(null);
  const [noteDraft, setNoteDraft] = useState('');
  const [noteError, setNoteError] = useState<string | null>(null);

  const receiptProgress = progress ?? calculateReceiptProgress(recipients);
  const canManageAny = canTrackRecipientsByRole(user.role);

  const canManageRecipientNote = (recipient: DocumentRecipient): boolean => {
    if (!documentId || !recipient.officeId) return false;
    if (canManageAny) return true;
    return recipient.status === 'received' && !!user.officeId && user.officeId === recipient.officeId;
  };

  const filteredRecipients = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return recipients;
    return recipients.filter(recipient => {
      const receiver = recipient.receivedById ? userById(recipient.receivedById) : undefined;
      const noteAuthor = recipient.noteById ? userById(recipient.noteById) : undefined;
      const haystack = [
        recipientOfficeName(recipient),
        recipientOfficeCode(recipient),
        recipient.status,
        receiver?.fullName ?? '',
        recipient.remarks ?? '',
        recipient.note ?? '',
        noteAuthor?.fullName ?? '',
      ].join(' ').toLowerCase();
      return haystack.includes(q);
    });
  }, [recipients, search, userById]);

  const closeModal = () => {
    setOpen(false);
    setSearch('');
    setEditingRecipientId(null);
    setNoteDraft('');
    setNoteError(null);
    noteAction.reset();
  };

  const startEditing = (recipient: DocumentRecipient) => {
    setEditingRecipientId(recipient.id);
    setNoteDraft(recipient.note ?? '');
    setNoteError(null);
    noteAction.reset();
  };

  const cancelEditing = () => {
    setEditingRecipientId(null);
    setNoteDraft('');
    setNoteError(null);
    noteAction.reset();
  };

  const saveNote = async (recipient: DocumentRecipient) => {
    if (!documentId || !recipient.officeId) return;
    const trimmed = noteDraft.trim();
    if (!trimmed) {
      setNoteError('Note cannot be empty.');
      return;
    }
    const updated = await noteAction.setNote(documentId, recipient.officeId, trimmed);
    if (!updated) {
      setNoteError(noteAction.error ?? 'Could not save the note.');
      return;
    }
    setEditingRecipientId(null);
    setNoteDraft('');
    setNoteError(null);
  };

  const removeNote = async (recipient: DocumentRecipient) => {
    if (!documentId || !recipient.officeId) return;
    const ok = await confirm({
      title: 'Delete Office Note',
      description: `Remove the note for ${recipientOfficeName(recipient)}? This action cannot be undone.`,
      confirmText: 'Delete',
      variant: 'danger',
    });
    if (!ok) return;
    const deleted = await noteAction.deleteNote(documentId, recipient.officeId);
    if (!deleted) {
      setNoteError(noteAction.error ?? 'Could not delete the note.');
      return;
    }
    setEditingRecipientId(null);
    setNoteDraft('');
    setNoteError(null);
  };

  if (recipients.length === 0) {
    return <span className="text-xs text-slate-400">No recipients</span>;
  }

  const first = recipients[0];
  const firstReceived = first.status === 'received';

  return (
    <>
      <div className="min-w-0">
        <div className="flex items-center gap-2 min-w-0">
          <span className="truncate text-xs font-medium text-slate-700">
            {recipientOfficeName(first)}
          </span>
          <Badge
            variant={firstReceived ? 'emerald' : 'amber'}
            size="sm"
            className="shrink-0 !px-1.5 !py-0 !text-[10px]"
          >
            {firstReceived ? 'Received' : 'Pending'}
          </Badge>
        </div>
        {recipients.length > 1 && (
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="mt-0.5 text-[11px] font-medium text-brand-700 hover:text-brand-800 transition-colors"
          >
            View All ({recipients.length})
          </button>
        )}
        {recipients.length === 1 && documentId && canManageRecipientNote(first) && (
          <button
            type="button"
            onClick={() => {
              setOpen(true);
              startEditing(first);
            }}
            className="mt-0.5 text-[11px] font-medium text-brand-700 hover:text-brand-800 transition-colors"
          >
            {first.note ? 'View / Edit note' : 'Add note'}
          </button>
        )}
      </div>

      <Modal
        open={open}
        onClose={closeModal}
        title="Recipient Offices"
        description={`${receiptProgress.received} of ${receiptProgress.total} offices received`}
        size="lg"
        bodyClassName="[scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
      >
        <div className="space-y-4">
          <ReceiptProgress progress={receiptProgress} />

          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Search office, status, receiver, or remarks…"
          />

          <div className="border border-slate-200 rounded-lg overflow-hidden">
            <div className="divide-y divide-slate-100">
              {filteredRecipients.length === 0 ? (
                <div className="px-4 py-8 text-center text-sm text-slate-500">
                  No recipient offices match your search.
                </div>
              ) : (
                filteredRecipients.map(recipient => {
                  const received = recipient.status === 'received';
                  const receiver = recipient.receivedById ? userById(recipient.receivedById) : undefined;
                  const noteAuthor = recipient.noteById ? userById(recipient.noteById) : undefined;
                  const canManage = canManageRecipientNote(recipient);
                  const isEditing = editingRecipientId === recipient.id;

                  return (
                    <div key={recipient.id} className="px-4 py-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 min-w-0">
                            <p className="text-sm font-medium text-slate-900 truncate">
                              {recipientOfficeName(recipient)}
                            </p>
                            <Badge
                              variant={received ? 'emerald' : 'amber'}
                              size="sm"
                              className="shrink-0 !px-1.5 !py-0 !text-[10px]"
                            >
                              {received ? 'Received' : 'Pending'}
                            </Badge>
                          </div>
                          <p className="text-[11px] font-mono text-slate-400 mt-0.5">
                            {recipientOfficeCode(recipient) || 'Office deleted'}
                          </p>
                        </div>
                      </div>

                      <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
                        <div>
                          <span className="text-slate-400">Received by</span>
                          <p className="text-slate-700 mt-0.5">
                            {received ? (receiver?.fullName ?? 'Unknown user') : '—'}
                          </p>
                        </div>
                        <div>
                          <span className="text-slate-400">Received date &amp; time</span>
                          <p className="text-slate-700 mt-0.5">
                            {received && recipient.receivedAt ? formatDate(recipient.receivedAt, true) : '—'}
                          </p>
                        </div>
                      </div>

                      {recipient.remarks && (
                        <div className="mt-2 text-xs">
                          <span className="text-slate-400">Remarks</span>
                          <p className="text-slate-700 mt-0.5 whitespace-pre-wrap">{recipient.remarks}</p>
                        </div>
                      )}

                      <div className="mt-3 border-t border-slate-100 pt-3">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-medium text-slate-500 inline-flex items-center gap-1.5">
                            <StickyNote className="w-3.5 h-3.5" />
                            Office note
                          </span>
                          {canManage && !isEditing && (
                            <button
                              type="button"
                              onClick={() => startEditing(recipient)}
                              className="inline-flex items-center gap-1 text-[11px] font-medium text-brand-700 hover:text-brand-800 transition-colors"
                            >
                              {recipient.note ? <Pencil className="w-3 h-3" /> : <Plus className="w-3 h-3" />}
                              {recipient.note ? 'Edit note' : 'Add note'}
                            </button>
                          )}
                        </div>

                        {isEditing ? (
                          <div className="mt-2 space-y-2">
                            <Textarea
                              rows={3}
                              maxLength={2000}
                              value={noteDraft}
                              onChange={e => {
                                setNoteDraft(e.target.value);
                                if (noteError) setNoteError(null);
                              }}
                              placeholder="Add context for this office…"
                              className="text-sm"
                            />
                            <div className="flex items-center justify-between gap-3">
                              <p className="text-[11px] text-slate-400">{noteDraft.length}/2000</p>
                              {noteError && <p className="text-[11px] text-rose-600">{noteError}</p>}
                            </div>
                            <div className="flex items-center justify-end gap-2">
                              {recipient.note && (
                                <Button
                                  variant="danger"
                                  size="sm"
                                  leftIcon={<Trash2 className="w-3.5 h-3.5" />}
                                  onClick={() => void removeNote(recipient)}
                                  disabled={noteAction.saving}
                                >
                                  Delete
                                </Button>
                              )}
                              <Button variant="outline" size="sm" onClick={cancelEditing} disabled={noteAction.saving}>
                                Cancel
                              </Button>
                              <Button
                                size="sm"
                                onClick={() => void saveNote(recipient)}
                                loading={noteAction.saving}
                                disabled={noteDraft.trim().length === 0}
                              >
                                Save
                              </Button>
                            </div>
                          </div>
                        ) : recipient.note ? (
                          <div className="mt-2">
                            <p className="text-xs text-slate-700 whitespace-pre-wrap">{recipient.note}</p>
                            <p className="mt-1 text-[11px] text-slate-400">
                              {noteAuthor?.fullName ?? 'Unknown'}
                              {recipient.noteAt ? ` · ${formatDate(recipient.noteAt, true)}` : ''}
                            </p>
                          </div>
                        ) : (
                          <p className="mt-2 text-xs text-slate-400">No office note.</p>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </Modal>
    </>
  );
}
