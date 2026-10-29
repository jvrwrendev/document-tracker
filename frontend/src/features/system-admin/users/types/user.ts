import type { UserRole } from '@/types';

export type UserRoleApi =
  | 'SYSTEM_ADMIN'
  | 'OFFICE_ADMIN'
  | 'DOCUMENT_ENCODER'
  | 'DOCUMENT_OFFICER';

export type UserStatusApi = 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';

export interface OfficeSummary {
  id: string;
  name: string;
  code: string;
  type: 'main' | 'division' | 'unit';
  isActive: boolean;
}

export interface EmployeeSummary {
  id: string;
  employeeNo: string;
  firstName: string;
  middleName: string | null;
  lastName: string;
  position: string;
  email: string;
  phone: string | null;
  officeId: string;
  office: OfficeSummary | null;
  isActive: boolean;
  hiredAt: string;
  createdAt: string;
  updatedAt: string;
  user: { id: string; username: string | null; role: UserRoleApi; status: UserStatusApi } | null;
}

export interface UserAccount {
  id: string;
  username: string | null;
  email: string | null;
  role: UserRoleApi;
  status: UserStatusApi;
  employeeId: string;
  employee: EmployeeSummary | null;
  createdAt: string;
  updatedAt: string;
}

export interface RoutingUserOption {
  id: string;
  fullName: string;
  email: string | null;
  role: string;
  officeId: string | null;
  officeName: string | null;
  position: string | null;
}

export interface UserListResponse {
  items: UserAccount[];
  total: number;
  page: number;
  pageSize: number;
}

export interface UserListFilters {
  page?: number;
  pageSize?: number;
  search?: string;
  role?: UserRoleApi;
  status?: UserStatusApi;
  officeId?: string;
  order?: 'asc' | 'desc';
  fetchAll?: boolean;
}

export interface CreateEmployeePayload {
  employeeNo: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  position: string;
  email: string;
  phone?: string;
  officeId: string;
  isActive?: boolean;
}

export interface CreateUserPayload {
  username?: string;
  email?: string;
  role?: UserRoleApi;
  status?: UserStatusApi;
  employeeId: string;
}

export type CredentialsEmailStatus = 'sent' | 'skipped' | 'failed';

export interface CredentialsDelivery {
  credentialsEmailStatus: CredentialsEmailStatus;
  credentialsEmailReason?: string;
}

export interface CreateUserResponse extends CredentialsDelivery {
  user: UserAccount;
}

export interface ResendCredentialsResult extends CredentialsDelivery {}

export interface ResetPasswordResult extends CredentialsDelivery {
  success: true;
}

export interface MailTestResult {
  status: 'sent' | 'skipped' | 'failed';
  recipient: string;
}

export interface UpdateUserPayload {
  username?: string;
  email?: string;
  password?: string;
  role?: UserRoleApi;
  status?: UserStatusApi;
}

export interface ResetUserPasswordPayload {
  newPassword?: string;
}

export const USER_ROLE_API: UserRoleApi[] = [
  'SYSTEM_ADMIN',
  'OFFICE_ADMIN',
  'DOCUMENT_ENCODER',
  'DOCUMENT_OFFICER',
];

export const USER_STATUS_API: UserStatusApi[] = ['ACTIVE', 'INACTIVE', 'SUSPENDED'];

export const USER_ROLE_LABELS: Record<UserRoleApi, string> = {
  SYSTEM_ADMIN: 'System Administrator',
  OFFICE_ADMIN: 'Office Administrator',
  DOCUMENT_ENCODER: 'Document Encoder',
  DOCUMENT_OFFICER: 'Document Officer',
};

export const USER_STATUS_LABELS: Record<UserStatusApi, string> = {
  ACTIVE: 'Active',
  INACTIVE: 'Inactive',
  SUSPENDED: 'Suspended',
};

export const ROLE_TO_API: Record<UserRole, UserRoleApi> = {
  system_admin: 'SYSTEM_ADMIN',
  office_admin: 'OFFICE_ADMIN',
  document_encoder: 'DOCUMENT_ENCODER',
  document_officer: 'DOCUMENT_OFFICER',
};

export const ROLE_FROM_API: Record<UserRoleApi, UserRole> = {
  SYSTEM_ADMIN: 'system_admin',
  OFFICE_ADMIN: 'office_admin',
  DOCUMENT_ENCODER: 'document_encoder',
  DOCUMENT_OFFICER: 'document_officer',
};

export type UserStatusUi = 'active' | 'inactive' | 'suspended';

export const STATUS_TO_API: Record<UserStatusUi, UserStatusApi> = {
  active: 'ACTIVE',
  inactive: 'INACTIVE',
  suspended: 'SUSPENDED',
};

export const STATUS_FROM_API: Record<UserStatusApi, UserStatusUi> = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  SUSPENDED: 'suspended',
};

export const POSITION_OPTIONS: string[] = [
  'City Mayor',
  'City Vice Mayor',
  'Department Head',
  'Office Head',
  'Division Chief',
  'Section Chief',
  'Administrative Officer V',
  'Administrative Officer IV',
  'Administrative Officer III',
  'Administrative Officer II',
  'Administrative Officer I',
  'Records Officer II',
  'Records Officer I',
  'Document Officer',
  'Administrative Aide VI',
  'Administrative Aide IV',
  'Administrative Aide III',
  'Administrative Aide I',
  'Clerk IV',
  'Clerk III',
  'Clerk II',
  'Clerk I',
  'Data Encoder',
  'ICT Officer',
  'Executive Assistant',
];
