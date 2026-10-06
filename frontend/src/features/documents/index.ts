export {
  useDocuments,
  useDocumentDetail,
  useDocumentReceive,
  useRegisterDocument,
  useDocumentHistory,
  useDocumentTimeline,
} from '@/features/documents/hooks';

export {
  DocumentsApiError,
  documentsService,
} from '@/features/documents/services';

export type * from '@/features/documents/types';

export { DashboardPage } from '@/features/documents/pages/DashboardPage';
export { DocumentsListPage } from '@/features/documents/pages/DocumentsListPage';
export { DocumentDetailPage } from '@/features/documents/pages/DocumentDetailPage';
export { DocumentRegistrationPage } from '@/features/documents/pages/DocumentRegistrationPage';
export { InboxPage } from '@/features/documents/pages/InboxPage';
export { OutboxPage } from '@/features/documents/pages/OutboxPage';
export { TrackingPage } from '@/features/documents/pages/TrackingPage';
export { ArchivePage } from '@/features/documents/pages/ArchivePage';
