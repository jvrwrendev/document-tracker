import { apiFetch } from '@/lib/apiClient';
import type {
  CreateEmployeePayload,
  CreateUserPayload,
  CreateUserResponse,
  EmployeeSummary,
  MailTestResult,
  ResendCredentialsResult,
  ResetPasswordResult,
  ResetUserPasswordPayload,
  UpdateUserPayload,
  UserAccount,
  UserListFilters,
  UserListResponse,
  UserOption,
} from '@/features/system-admin/users/types/user';

export class ApiError extends Error {
  readonly status: number;
  readonly details: unknown;

  constructor(status: number, message: string, details?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.details = details;
  }
}

async function request<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  return apiFetch<T>(path, init, {
    ErrorClass: ApiError,
    source: 'user.service',
  });
}

function buildQuery(filters?: UserListFilters): string {
  if (!filters) return '';
  const params = new URLSearchParams();
  if (filters.page) params.set('page', String(filters.page));
  if (filters.pageSize) params.set('pageSize', String(filters.pageSize));
  if (filters.search) params.set('search', filters.search);
  if (filters.role) params.set('role', filters.role);
  if (filters.status) params.set('status', filters.status);
  if (filters.officeId) params.set('officeId', filters.officeId);
  if (filters.order) params.set('order', filters.order);
  const qs = params.toString();
  return qs ? `?${qs}` : '';
}

async function listAll(filters?: UserListFilters): Promise<UserListResponse> {
  const pageSize = 200;
  const first = await request<UserListResponse>(
    `/users${buildQuery({ ...filters, fetchAll: undefined, page: 1, pageSize })}`,
  );
  if (first.items.length >= first.total) return first;

  const totalPages = Math.ceil(first.total / pageSize);
  const remaining = await Promise.all(
    Array.from({ length: totalPages - 1 }, (_, index) =>
      request<UserListResponse>(
        `/users${buildQuery({ ...filters, fetchAll: undefined, page: index + 2, pageSize })}`,
      ),
    ),
  );
  return {
    ...first,
    items: [first, ...remaining].flatMap(response => response.items),
    page: 1,
    pageSize: first.total,
  };
}

export interface EmployeeListFilters {
  page?: number;
  pageSize?: number;
  search?: string;
  officeId?: string;
  isActive?: boolean;
  position?: string;
  sortBy?: 'firstName' | 'lastName' | 'employeeNo' | 'createdAt';
  order?: 'asc' | 'desc';
}

export interface EmployeeListResponse {
  items: EmployeeSummary[];
  total: number;
  page: number;
  pageSize: number;
}

function buildEmployeeQuery(filters?: EmployeeListFilters): string {
  if (!filters) return '';
  const params = new URLSearchParams();
  if (filters.page) params.set('page', String(filters.page));
  if (filters.pageSize) params.set('pageSize', String(filters.pageSize));
  if (filters.search) params.set('search', filters.search);
  if (filters.officeId) params.set('officeId', filters.officeId);
  if (typeof filters.isActive === 'boolean') {
    params.set('isActive', String(filters.isActive));
  }
  if (filters.position) params.set('position', filters.position);
  if (filters.sortBy) params.set('sortBy', filters.sortBy);
  if (filters.order) params.set('order', filters.order);
  const qs = params.toString();
  return qs ? `?${qs}` : '';
}

export const userService = {
  list(filters?: UserListFilters): Promise<UserListResponse> {
    if (filters?.fetchAll) return listAll(filters);
    return request<UserListResponse>(`/users${buildQuery(filters)}`);
  },

  userOptions(): Promise<UserOption[]> {
    return request<UserOption[]>('/users/options');
  },

  getById(id: string): Promise<UserAccount> {
    return request<UserAccount>(`/users/${id}`);
  },

  create(payload: CreateUserPayload): Promise<CreateUserResponse> {
    return request<CreateUserResponse>('/users', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  update(id: string, payload: UpdateUserPayload): Promise<UserAccount> {
    return request<UserAccount>(`/users/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  },

  remove(id: string): Promise<UserAccount> {
    return request<UserAccount>(`/users/${id}`, { method: 'DELETE' });
  },

  resetPassword(id: string, payload?: ResetUserPasswordPayload): Promise<ResetPasswordResult> {
    return request<ResetPasswordResult>(`/users/${id}/reset-password`, {
      method: 'POST',
      body: JSON.stringify(payload ?? {}),
    });
  },

  resendCredentials(id: string): Promise<ResendCredentialsResult> {
    return request<ResendCredentialsResult>(`/users/${id}/resend-credentials`, {
      method: 'POST',
      body: JSON.stringify({}),
    });
  },
};

export const mailService = {
  test(): Promise<MailTestResult> {
    return request<MailTestResult>('/mail/test', {
      method: 'POST',
      body: JSON.stringify({}),
    });
  },
};

export const employeeService = {
  list(filters?: EmployeeListFilters): Promise<EmployeeListResponse> {
    return request<EmployeeListResponse>(`/employees${buildEmployeeQuery(filters)}`);
  },

  getById(id: string): Promise<EmployeeSummary> {
    return request<EmployeeSummary>(`/employees/${id}`);
  },

  create(payload: CreateEmployeePayload): Promise<EmployeeSummary> {
    return request<EmployeeSummary>('/employees', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
};
