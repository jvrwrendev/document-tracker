export interface RegisterResponseDto {
  requiresEmailVerification: true;
  email: string;
  expiresInSeconds: number;
  resendAvailableInSeconds: number;
}

export interface ResendVerificationResponseDto {
  success: true;
  sent: boolean;
  expiresInSeconds: number;
  resendAvailableInSeconds: number;
}
