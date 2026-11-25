export type UserRole =
  | 'system_admin'
  | 'office_admin'
  | 'document_encoder'
  | 'document_officer';

export interface User {
  id: string;
  fullName: string;
  firstName?: string;
  middleName?: string;
  lastName?: string;
  email: string;
  phone?: string;
  username: string;
  role: UserRole;
  permissions?: Permission[];
  officeId: string;
  officeName?: string;
  officeCode?: string;
  position: string;
  status: 'active' | 'inactive';
  mustChangePassword?: boolean;
  avatarColor: string;
  createdAt: string;
}

export interface Role {
  id: UserRole;
  name: string;
  description: string;
  permissions: Permission[];
}

export type Permission =
  | 'dashboard.view'
  | 'documents.view'
  | 'documents.create'
  | 'documents.edit'
  | 'documents.delete'
  | 'documents.receive'
  | 'inbox.view'
  | 'outbox.view'
  | 'tracking.view'
  | 'archive.view'
  | 'users.view'
  | 'users.create'
  | 'users.edit'
  | 'users.delete'
  | 'employees.view'
  | 'employees.create'
  | 'employees.edit'
  | 'employees.delete'
  | 'offices.view'
  | 'offices.create'
  | 'offices.edit'
  | 'offices.delete'
  | 'roles.view'
  | 'roles.create'
  | 'roles.edit'
  | 'roles.delete'
  | 'permissions.view'
  | 'permissions.assign'
  | 'settings.view'
  | 'settings.edit'
  | 'audit.view'
  | 'backup.view'
  | 'backup.create'
  | 'backup.restore';

export interface Office {
  id: string;
  name: string;
  code: string;
  type: 'main' | 'division' | 'unit';
  head: string;
  description: string;
  createdAt: string;
}

export type DocumentStatus =
  | 'registered'
  | 'received'
  | 'approved'
  | 'rejected'
  | 'released'
  | 'archived';

export type DocumentClassification =
  | 'public'
  | 'internal'
  | 'confidential'
  | 'restricted';

export type DocumentType =
  | 'memo'
  | 'letter'
  | 'ordinance'
  | 'resolution'
  | 'report'
  | 'contract'
  | 'circular'
  | 'others';

export interface Document {
  id: string;
  documentNumber?: string;
  trackingNumber: string;
  title: string;
  type: DocumentType;
  classification: DocumentClassification;
  status: DocumentStatus;
  originatingOfficeId: string | null;
  originatingOfficeName?: string | null;
  destinationsAllOffices?: boolean;
  encodedById: string;
  receivedById?: string;
  source: 'internal' | 'external';
  senderName?: string;
  description: string;
  tags: string[];
  attachments: DocumentAttachment[];
  priority: 'low' | 'normal' | 'high' | 'urgent';
  dateReceived?: string;
  dueDate?: string;
  createdAt: string;
  updatedAt: string;
}

export interface DocumentAttachment {
  id: string;
  name: string;
  size: number;
  type: string;
  uploadedAt: string;
}

export interface RoutingStep {
  id: string;
  documentId: string;
  fromOfficeId: string;
  fromUserId?: string;
  toOfficeId: string;
  toUserId?: string;
  instructions: string;
  status: 'pending' | 'received' | 'in_progress' | 'completed' | 'returned';
  receivedAt?: string;
  completedAt?: string;
  sequence: number;
  remarks?: string;
}

export interface ReviewAction {
  id: string;
  documentId: string;
  reviewerId: string;
  action: 'recommended' | 'approved' | 'rejected' | 'returned' | 'commented';
  remarks: string;
  createdAt: string;
}

export interface AuditLog {
  id: string;
  actorId: string;
  actorName: string;
  action: string;
  module: string;
  description: string;
  targetId?: string;
  targetType?: string;
  ipAddress: string;
  userAgent: string;
  createdAt: string;
}

export interface Notification {
  id: string;
  userId: string;
  type: 'document' | 'system' | 'reminder';
  title: string;
  message: string;
  read: boolean;
  link?: string;
  createdAt: string;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  loading: boolean;
}
