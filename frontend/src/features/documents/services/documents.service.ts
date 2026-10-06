import { API_BASE_URL } from '@/lib/apiConfig';
import { apiFetch, readCookie } from '@/lib/apiClient';
import type {
  DocumentCreateInput,
  DocumentDetail,
  DocumentFilters,
  DocumentHistoryEntry,
  DocumentListItem,
  DocumentListResponse,
  DocumentNumberSuggestion,
  DocumentNumberAvailability,
  DocumentReceiveInput,
  DocumentReceiveResult,
  DocumentTimelineEntry,
  DocumentUpdateInput,
  DocumentAttachment,
  DocumentRecipient,
} from '@/features/documents/types/document';
import type { DocumentType } from '@/types';

export class DocumentsApiError extends Error {
  readonly status: number;
  readonly details: unknown;

  constructor(status: number, message: string, details?: unknown) {
    super(message);
    this.name = 'DocumentsApiError';
    this.status = status;
    this.details = details;
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  return apiFetch<T>(path, init, {
    ErrorClass: DocumentsApiError,
    source: 'documents.service',
  });
}

function normalizeDocument<T extends DocumentListItem | DocumentDetail>(document: T): T {
  const rawType = document.type as unknown as { codes?: string[]; code?: string } | string;
  const type = (typeof rawType === 'string'
    ? rawType
    : rawType?.codes?.[0] ?? rawType?.code) as DocumentType;
  return {
    ...document,
    type,
    attachments: 'attachments' in document ? (document.attachments ?? []) : undefined,
    ...(document._count
      ? {
          attachmentCount: document._count.attachments,
          counts: {
            reviews: document._count.reviews,
            releases: document._count.releases,
            archives: document._count.archives,
          },
        }
      : {}),
  } as T;
}

function normalizeList(response: DocumentListResponse): DocumentListResponse {
  return { ...response, items: response.items.map(normalizeDocument) };
}

function buildQuery(filters?: DocumentFilters): string {
  if (!filters) return '';
  const params = new URLSearchParams();
  if (filters.page) params.set('page', String(filters.page));
  if (filters.pageSize) params.set('pageSize', String(filters.pageSize));
  if (filters.search) params.set('search', filters.search);
  if (filters.status) params.set('status', filters.status);
  if (filters.statuses?.length) params.set('statuses', filters.statuses.join(','));
  if (filters.typeId) params.set('typeId', filters.typeId);
  if (filters.classification) params.set('classification', filters.classification);
  if (filters.priority) params.set('priority', filters.priority);
  if (filters.source) params.set('source', filters.source);
  if (filters.originatingOfficeId) params.set('originatingOfficeId', filters.originatingOfficeId);
  if (filters.currentOfficeId) params.set('currentOfficeId', filters.currentOfficeId);
  if (filters.currentHolderId) params.set('currentHolderId', filters.currentHolderId);
  if (filters.encodedById) params.set('encodedById', filters.encodedById);
  if (filters.receivedById) params.set('receivedById', filters.receivedById);
  if (filters.recipientOfficeId) params.set('recipientOfficeId', filters.recipientOfficeId);
  if (filters.recipientStatus) params.set('recipientStatus', filters.recipientStatus);
  if (filters.dateFrom) params.set('dateFrom', filters.dateFrom);
  if (filters.dateTo) params.set('dateTo', filters.dateTo);
  if (filters.sortBy) params.set('sortBy', filters.sortBy);
  if (filters.order) params.set('order', filters.order);
  const qs = params.toString();
  return qs ? `?${qs}` : '';
}

async function listAll(filters?: DocumentFilters): Promise<DocumentListResponse> {
  const pageSize = 200;
  const first = await request<DocumentListResponse>(
    `/documents${buildQuery({ ...filters, fetchAll: undefined, page: 1, pageSize })}`,
  ).then(normalizeList);
  if (first.items.length >= first.total) return first;

  const totalPages = Math.ceil(first.total / pageSize);
  const remaining = await Promise.all(
    Array.from({ length: totalPages - 1 }, (_, index) =>
      request<DocumentListResponse>(
        `/documents${buildQuery({ ...filters, fetchAll: undefined, page: index + 2, pageSize })}`,
      ).then(normalizeList),
    ),
  );
  return {
    ...first,
    items: [first, ...remaining].flatMap(response => response.items),
    page: 1,
    pageSize: first.total,
  };
}

export const documentsService = {
  list(filters?: DocumentFilters): Promise<DocumentListResponse> {
    if (filters?.fetchAll) return listAll(filters);
    return request<DocumentListResponse>(`/documents${buildQuery(filters)}`).then(normalizeList);
  },

  getById(id: string): Promise<DocumentDetail> {
    return request<DocumentDetail>(`/documents/${id}`).then(normalizeDocument);
  },

  getDocumentNumberSuggestion(officeId: string): Promise<DocumentNumberSuggestion> {
    return request<DocumentNumberSuggestion>(`/documents/document-number-suggestion/${officeId}`);
  },

  checkDocumentNumberAvailability(
    documentNumber: string,
    originatingOfficeId?: string,
    init?: RequestInit,
  ): Promise<DocumentNumberAvailability> {
    const officeQuery = originatingOfficeId
      ? `&originatingOfficeId=${encodeURIComponent(originatingOfficeId)}`
      : '';
    return request<DocumentNumberAvailability>(
      `/documents/check-document-number?documentNumber=${encodeURIComponent(documentNumber)}${officeQuery}`,
      init,
    );
  },

  register(payload: DocumentCreateInput): Promise<DocumentListItem> {
    return request<DocumentListItem>('/documents', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  update(id: string, payload: DocumentUpdateInput): Promise<DocumentListItem> {
    return request<DocumentListItem>(`/documents/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  },

  receive(id: string, payload: DocumentReceiveInput): Promise<DocumentReceiveResult> {
    return request<DocumentReceiveResult>(`/documents/${id}/receive`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  setRecipientNote(
    documentId: string,
    officeId: string,
    note: string,
  ): Promise<DocumentRecipient> {
    return request<DocumentRecipient>(
      `/documents/${documentId}/recipients/${officeId}/note`,
      {
        method: 'POST',
        body: JSON.stringify({ note }),
      },
    );
  },

  deleteRecipientNote(
    documentId: string,
    officeId: string,
  ): Promise<{ id: string; officeId: string; deleted: boolean }> {
    return request<{ id: string; officeId: string; deleted: boolean }>(
      `/documents/${documentId}/recipients/${officeId}/note`,
      { method: 'DELETE' },
    );
  },

  getHistory(id: string): Promise<DocumentHistoryEntry[]> {
    return request<DocumentHistoryEntry[]>(`/documents/${id}/history`);
  },

  getTimeline(id: string): Promise<DocumentTimelineEntry[]> {
    return request<DocumentTimelineEntry[]>(`/documents/${id}/timeline`);
  },
};

export const attachmentsService = {
  list(documentId: string): Promise<DocumentAttachment[]> {
    return request<DocumentAttachment[]>(`/document-attachments/document/${documentId}`);
  },

  async upload(documentId: string, file: File): Promise<DocumentAttachment> {
    const formData = new FormData();
    formData.append('file', file);
    const headers = new Headers();
    const csrfToken = readCookie('dms_csrf');
    if (csrfToken) headers.set('x-xsrf-token', csrfToken);

    const response = await fetch(`${API_BASE_URL}/document-attachments/document/${documentId}`, {
      method: 'POST',
      headers,
      credentials: 'include',
      body: formData,
    });
    if (!response.ok) {
      let message = `Failed to upload ${file.name}`;
      try {
        const body = (await response.json()) as { message?: string | string[] };
        if (Array.isArray(body.message)) message = body.message.join(', ');
        else if (body.message) message = body.message;
      } catch {
        // ignore parse errors, keep fallback message
      }
      throw new DocumentsApiError(response.status, message);
    }
    const payload = await response.json();
    return (
      payload && typeof payload === 'object' && 'data' in payload
        ? (payload as { data: DocumentAttachment }).data
        : payload
    ) as DocumentAttachment;
  },

  downloadUrl(id: string): string {
    return `${API_BASE_URL}/document-attachments/${id}/download`;
  },





  async head(id: string): Promise<{ available: boolean; status: number }> {
    const response = await fetch(`${API_BASE_URL}/document-attachments/${id}/download?inline=1`, {
      method: 'HEAD',
      credentials: 'include',
    });
    return { available: response.ok, status: response.status };
  },
};

