import { apiFetch } from '@/lib/apiClient';


export interface AuthUser {
  id: string;
  email: string | null;
  username: string | null;
  role: string;
  status: string;
  mustChangePassword: boolean;
  permissions: string[];
  officeId: string | null;
  office?: { id: string; name: string; code: string; type: string } | null;
  position: string | null;
  employeeId?: string | null;
  firstName?: string | null;
  middleName?: string | null;
  lastName?: string | null;
  phone?: string | null;
  avatarColor?: string | null;
  createdAt: string;
}

export interface AuthResponse {
  user: AuthUser;
}

export interface Session {
  id: string;
  createdAt: string;
  lastUsedAt: string | null;
  expiresAt: string;
  revokedAt: string | null;
  current: boolean;
}

export interface LoginRequest {
  emailOrUsername: string;
  password: string;
}

export interface RegisterRequest {
  employeeNo: string;
  username?: string;
  email?: string;
  password: string;
}

export interface RegisterResponse {
  requiresEmailVerification: true;
  email: string;
  expiresInSeconds: number;
  resendAvailableInSeconds: number;
}

export interface VerifyEmailRequest {
  email: string;
  code: string;
}

export interface ResendVerificationRequest {
  email: string;
}

export interface ResendVerificationResponse {
  success: true;
  sent: boolean;
  expiresInSeconds: number;
  resendAvailableInSeconds: number;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

export interface FirstLoginChangePasswordRequest {
  newPassword: string;
  confirmPassword: string;
}

export interface ForgotPasswordRequest {
  emailOrUsername: string;
}

export interface ForgotPasswordResponse {
  resetToken: string;
  resetUrl: string;
}

export interface ResetPasswordRequest {
  token: string;
  newPassword: string;
}

export interface UpdateMyProfileRequest {
  firstName: string;
  middleName?: string;
  lastName: string;
  email: string;
  phone?: string;
  position: string;
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  return apiFetch<T>(path, init);
}

export const authApi = {
  
  login: (payload: LoginRequest) =>
    request<AuthResponse>('/auth/login', { method: 'POST', body: JSON.stringify(payload) }),

  register: (payload: RegisterRequest) =>
    request<RegisterResponse>('/auth/register', { method: 'POST', body: JSON.stringify(payload) }),

  verifyEmail: (payload: VerifyEmailRequest) =>
    request<AuthResponse>('/auth/verify-email', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  resendVerification: (payload: ResendVerificationRequest) =>
    request<ResendVerificationResponse>('/auth/resend-verification', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  refresh: () => request<AuthResponse>('/auth/refresh', { method: 'POST' }),

  logout: (sessionId?: string) =>
    request<void>('/auth/logout', {
      method: 'POST',
      body: JSON.stringify(sessionId ? { sessionId } : {}),
    }),

  me: () => request<AuthUser>('/auth/me'),

  updateMe: (payload: UpdateMyProfileRequest) =>
    request<AuthUser>('/auth/me', {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),

  changePassword: (payload: ChangePasswordRequest) =>
    request<{ success: true }>('/auth/change-password', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  firstLoginChangePassword: (payload: FirstLoginChangePasswordRequest) =>
    request<AuthResponse>('/auth/first-login-change-password', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  forgotPassword: (payload: ForgotPasswordRequest) =>
    request<ForgotPasswordResponse>('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  resetPassword: (payload: ResetPasswordRequest) =>
    request<{ success: true }>('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  sessions: () => request<Session[]>('/auth/sessions'),
  
  revokeSession: (sessionId: string) =>
    request<{ success: true }>(`/auth/sessions/${sessionId}`, { method: 'DELETE' }),
  revokeAllSessions: () => request<{ revoked: number }>('/auth/sessions', { method: 'DELETE' }),
};


export { API_BASE_URL } from '@/lib/apiConfig';