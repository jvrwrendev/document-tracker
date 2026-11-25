import type { DocumentType } from '@/types';

export type DocumentStatus =
  | 'registered'
  | 'received'
  | 'approved'
  | 'rejected'
  | 'released'
  | 'archived';

export type RecipientStatus = 'pending' | 'received';

export type DocumentReceiptState = 'awaiting' | 'partial' | 'fully_received';

export interface DocumentReceiptProgress {
  total: number;
  received: number;
  pending: number;
  percentage: number;
  state: DocumentReceiptState;
}

export type DocumentPriority = 'low' | 'normal' | 'high' | 'urgent';
export type DocumentSource = 'internal' | 'external';
export type DocumentClassification = 'public' | 'internal' | 'confidential' | 'restricted';

export interface DocumentTypeMeta {
  id: string;
  codes: string[];
  name: string;
  description: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface DocumentAttachment {
  id: string;
  documentId: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  storageKey: string;
  status: 'uploaded' | 'deleted';
  uploadedById: string;
  uploadedAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface DocumentRoutingStep {
  id: string;
  documentId: string;
  sequence: number;
  fromOfficeId: string;
  fromUserId: string | null;
  toOfficeId: string;
  toUserId: string | null;
  instructions: string | null;
  status: 'pending' | 'received' | 'in_progress' | 'completed' | 'returned';
  receivedAt: string | null;
  completedAt: string | null;
  remarks: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface DocumentReview {
  id: string;
  documentId: string;
  reviewerId: string;
  action: 'recommended' | 'approved' | 'rejected' | 'returned' | 'commented';
  remarks: string | null;
  createdAt: string;
}

export interface DocumentRelease {
  id: string;
  documentId: string;
  releasedById: string;
  releasedToId: string | null;
  method: 'pickup' | 'email' | 'courier' | 'hand_delivery';
  recipientName: string | null;
  notes: string | null;
  releasedAt: string;
  createdAt: string;
}

export interface DocumentArchive {
  id: string;
  documentId: string;
  archivedById: string;
  location: string | null;
  retentionUntil: string | null;
  archivedAt: string;
}

export interface DocumentRecipientOffice {
  id: string;
  name: string;
  code: string;
}

export interface DocumentRecipient {
  id: string;
  officeId: string | null;
  office: DocumentRecipientOffice | null;
  officeName: string | null;
  officeCode: string | null;
  status: RecipientStatus;
  receivedById: string | null;
  receivedAt: string | null;
  remarks: string | null;
  note: string | null;
  noteById: string | null;
  noteAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export function recipientOfficeName(recipient: DocumentRecipient): string {
  return recipient.office?.name ?? recipient.officeName ?? 'Deleted office';
}

export function recipientOfficeCode(recipient: DocumentRecipient): string {
  return recipient.office?.code ?? recipient.officeCode ?? '';
}

export function calculateReceiptProgress(
  recipients: DocumentRecipient[],
): DocumentReceiptProgress {
  const active = recipients.filter(recipient => recipient.officeId !== null);
  const total = active.length;
  const received = active.filter(recipient => recipient.status === 'received').length;
  const pending = total - received;
  const state: DocumentReceiptState =
    total === 0 || received === 0
      ? 'awaiting'
      : received === total
        ? 'fully_received'
        : 'partial';

  return {
    total,
    received,
    pending,
    percentage: total === 0 ? 0 : Math.round((received / total) * 100),
    state,
  };
}

export interface DocumentListItem {
  id: string;
  trackingNumber: string;
  documentNumber: string;
  title: string;
  description: string | null;
  type: DocumentType;
  typeId?: string;
  classification: DocumentClassification;
  priority: DocumentPriority;
  source: DocumentSource;
  status: DocumentStatus;
  senderName: string | null;
  tags: string[];
  originatingOfficeId: string | null;
  originatingOfficeName: string | null;
  destinationsAllOffices: boolean;
  recipients: DocumentRecipient[];
  receiptProgress?: DocumentReceiptProgress;
  encodedById: string;
  receivedById: string | null;
  dateReceived: string | null;
  dueDate: string | null;
  attachmentCount: number;
  attachments?: DocumentAttachment[];
  _count?: {
    reviews: number;
    archives: number;
    attachments: number;
  };
  counts: {
    reviews: number;
    archives: number;
  };
  createdAt: string;
  updatedAt: string;
}

export interface DocumentDetail extends Omit<DocumentListItem, 'attachmentCount'> {
  attachments: DocumentAttachment[];
  reviews: DocumentReview[];
  archives: DocumentArchive[];
  encodedBy: DocumentPerson | null;
  receivedBy: DocumentPerson | null;
}

export interface DocumentPerson {
  id: string;
  fullName: string;
  email: string | null;
  position: string | null;
  officeId: string | null;
}

export interface DocumentHistoryEntry {
  id: string;
  documentId: string;
  fromStatus: DocumentStatus | null;
  toStatus: DocumentStatus;
  actorId: string | null;
  remarks: string | null;
  occurredAt: string;
}

export interface DocumentTimelineEntry {
  id: string;
  documentId: string;
  actorId: string | null;
  event: string;
  payload: unknown;
  occurredAt: string;
}

export type DocumentSortBy =
  | 'createdAt'
  | 'updatedAt'
  | 'trackingNumber'
  | 'title'
  | 'dateReceived'
  | 'dueDate';

export interface DocumentFilters {
  fetchAll?: boolean;
  page?: number;
  pageSize?: number;
  search?: string;
  status?: DocumentStatus;
  statuses?: DocumentStatus[];
  typeId?: string;
  typeCode?: DocumentType;
  classification?: DocumentClassification;
  priority?: DocumentPriority;
  source?: DocumentSource;
  originatingOfficeId?: string;
  encodedById?: string;
  receivedById?: string;
  recipientOfficeId?: string;
  recipientStatus?: RecipientStatus;
  receiptState?: DocumentReceiptState;
  dateFrom?: string;
  dateTo?: string;
  sortBy?: DocumentSortBy;
  order?: 'asc' | 'desc';
}

export interface DocumentListResponse {
  items: DocumentListItem[];
  total: number;
  page: number;
  pageSize: number;
}

export interface InboxSummary {
  totalIncoming: number;
  awaitingReceipt: number;
  received: number;
  overdue: number;
}

export interface OutboxSummary {
  totalOutgoing: number;
  awaitingReceipt: number;
  partiallyReceived: number;
  fullyReceived: number;
}

export interface InboxFilters {
  page?: number;
  pageSize?: number;
  search?: string;
  priority?: DocumentPriority;
  recipientStatus?: RecipientStatus;
  status?: DocumentStatus;
  sortBy?: DocumentSortBy;
  order?: 'asc' | 'desc';
}

export interface OutboxFilters {
  page?: number;
  pageSize?: number;
  search?: string;
  priority?: DocumentPriority;
  status?: DocumentStatus;
  typeCode?: DocumentType;
  receiptState?: DocumentReceiptState;
  sortBy?: DocumentSortBy;
  order?: 'asc' | 'desc';
}

export interface InboxListResponse extends DocumentListResponse {
  summary: InboxSummary;
}

export interface OutboxListResponse extends DocumentListResponse {
  summary: OutboxSummary;
}

export interface DocumentCreateInput {
  documentNumber?: string;
  title: string;
  typeId: string;
  classification: DocumentClassification;
  priority?: DocumentPriority;
  source: DocumentSource;
  senderName?: string;
  description?: string;
  originatingOfficeId?: string;
  originatingOfficeName?: string;
  destinationsAllOffices?: boolean;
  recipientOfficeIds?: string[];
  dueDate?: string;
  tags?: string[];
}

export type DocumentUpdateInput = Partial<DocumentCreateInput>;

export interface DocumentReceiveInput {
  remarks?: string;
}

export interface DocumentReceiveResult {
  recipient: DocumentRecipient;
  documentStatus: DocumentStatus;
  receiptProgress: DocumentReceiptProgress;
}



export interface DocumentNumberSuggestion {
  suggestion: string;
}

export interface DocumentNumberAvailabilityExisting {
  id: string;
  trackingNumber: string;
  originatingOfficeCode: string | null;
  originatingOfficeName: string | null;
}

export interface DocumentNumberAvailability {
  available: boolean;
  existing: DocumentNumberAvailabilityExisting | null;
}
