import { DocumentStatus } from '@prisma/client';

/**
 * Document workflow: REGISTERED -> RECEIVED -> ARCHIVED.
 *
 * No user ever performs a status transition manually:
 *  - 'received' is set by the per-office receiving action.
 *  - 'archived' is set by DocumentsAutoArchiveService after the retention
 *    window (7 days).
 *
 * The legacy 'approved' / 'rejected' / 'released' values are still part of the
 * Prisma enum so historical documents keep rendering correctly, but they are
 * excluded from the active workflow and can never be entered again.
 */
export const DOCUMENT_WORKFLOW: DocumentStatus[] = ['registered', 'received'];

export const DOCUMENT_ACTIVE_STATUSES: DocumentStatus[] = ['registered', 'received'];

export const DOCUMENT_TERMINAL_STATUSES: DocumentStatus[] = ['archived'];

export const DOCUMENT_STATUS_LABELS: Record<DocumentStatus, string> = {
  registered: 'Registered',
  received: 'Received',
  approved: 'Approved',
  rejected: 'Rejected',
  released: 'Released',
  archived: 'Archived',
};

export function isValidDocumentStatus(value: string): value is DocumentStatus {
  return (DOCUMENT_ACTIVE_STATUSES as string[]).includes(value) ||
    (DOCUMENT_TERMINAL_STATUSES as string[]).includes(value);
}