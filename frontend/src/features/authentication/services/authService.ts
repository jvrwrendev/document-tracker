import { authApi } from '@/features/authentication/api/authApi';
import type {
  AuthUser,
  ChangePasswordRequest,
  FirstLoginChangePasswordRequest,
  ForgotPasswordRequest,
  ForgotPasswordResponse,
  LoginRequest,
  RegisterRequest,
  RegisterResponse,
  ResendVerificationRequest,
  ResendVerificationResponse,
  ResetPasswordRequest,
  UpdateMyProfileRequest,
  VerifyEmailRequest,
} from '@/features/authentication/api/authApi';

export const authService = {

  async login(credentials: LoginRequest): Promise<AuthUser> {
    const response = await authApi.login(credentials);
    return response.user;
  },

  async register(payload: RegisterRequest): Promise<RegisterResponse> {
    return authApi.register(payload);
  },

  async verifyEmail(payload: VerifyEmailRequest): Promise<AuthUser> {
    const response = await authApi.verifyEmail(payload);
    return response.user;
  },

  resendVerification(payload: ResendVerificationRequest): Promise<ResendVerificationResponse> {
    return authApi.resendVerification(payload);
  },

  async restoreSession(): Promise<AuthUser | null> {
    try {
      return (await authApi.me());
    } catch {
      try {
        return (await authApi.refresh()).user;
      } catch {
        return null;
      }
    }
  },

  logout: () => authApi.logout(),
  changePassword: (payload: ChangePasswordRequest) => authApi.changePassword(payload),

  async firstLoginChangePassword(
    payload: FirstLoginChangePasswordRequest,
  ): Promise<AuthUser> {
    const response = await authApi.firstLoginChangePassword(payload);
    return response.user;
  },

  updateMe: (payload: UpdateMyProfileRequest) => authApi.updateMe(payload),
  listSessions: () => authApi.sessions(),
  revokeSession: (sessionId: string) => authApi.revokeSession(sessionId),
  revokeAllSessions: () => authApi.revokeAllSessions(),
  forgotPassword: (payload: ForgotPasswordRequest): Promise<ForgotPasswordResponse> =>
    authApi.forgotPassword(payload),
  resetPassword: (payload: ResetPasswordRequest) => authApi.resetPassword(payload),
};
