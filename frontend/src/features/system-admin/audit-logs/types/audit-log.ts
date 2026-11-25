export interface AuditLogActor {
  id: string;
  email: string | null;
  username: string | null;
  role: string;
  fullName: string;
  position: string | null;
  avatarColor: string;
}

export interface AuditLogItem {
  id: string;
  action: string;
  module: string;
  description: string;
  targetId: string | null;
  targetType: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  metadata: unknown;
  actorId: string | null;
  actor: AuditLogActor | null;
  createdAt: string;
}

export interface AuditLogListFilters {
  page?: number;
  pageSize?: number;
  actorId?: string;
  module?: string;
  action?: string;
  targetType?: string;
  dateFrom?: string;
  dateTo?: string;
  order?: 'asc' | 'desc';
}

export interface AuditLogListResponse {
  items: AuditLogItem[];
  total: number;
  page: number;
  pageSize: number;
}

export interface AuditLogStats {
  total: number;
  today: number;
  uniqueActors: number;
  registrations: number;
}