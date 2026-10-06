import type { DocumentType } from '@/types';

export type DocumentStatus =
  | 'registered'
  | 'received'
  | 'approved'
  | 'rejected'
  | 'released'
  | 'archived';

export type RecipientStatus = 'pending' | 'received';

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
  officeId: string;
  office: DocumentRecipientOffice;
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
  currentOfficeId: string;
  currentHolderId: string | null;
  encodedById: string;
  receivedById: string | null;
  dateReceived: string | null;
  approvedById: string | null;
  approvedAt: string | null;
  approvedRemarks: string | null;
  releasedById: string | null;
  releasedAt: string | null;
  releasedRemarks: string | null;
  dueDate: string | null;
  attachmentCount: number;
  attachments?: DocumentAttachment[];
  _count?: {
    reviews: number;
    releases: number;
    archives: number;
    attachments: number;
  };
  counts: {
    reviews: number;
    releases: number;
    archives: number;
  };
  createdAt: string;
  updatedAt: string;
}

export interface DocumentDetail extends Omit<DocumentListItem, 'attachmentCount'> {
  attachments: DocumentAttachment[];
  reviews: DocumentReview[];
  releases: DocumentRelease[];
  archives: DocumentArchive[];
  encodedBy: DocumentPerson | null;
  receivedBy: DocumentPerson | null;
  approvedBy: DocumentPerson | null;
  releasedBy: DocumentPerson | null;
  currentHolder: DocumentPerson | null;
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
  classification?: DocumentClassification;
  priority?: DocumentPriority;
  source?: DocumentSource;
  originatingOfficeId?: string;
  currentOfficeId?: string;
  currentHolderId?: string;
  encodedById?: string;
  receivedById?: string;
  recipientOfficeId?: string;
  recipientStatus?: RecipientStatus;
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
  currentOfficeId: string;
  currentHolderId?: string;
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
