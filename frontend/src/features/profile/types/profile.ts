import type { AuthUser, Session, UpdateMyProfileRequest } from '@/features/authentication/api/authApi';

export type { AuthUser, Session, UpdateMyProfileRequest };

export interface ProfileForm {
  firstName: string;
  middleName: string;
  lastName: string;
  email: string;
  position: string;
  phone: string;
}

interface ProfileSource {
  firstName?: string | null;
  middleName?: string | null;
  lastName?: string | null;
  email: string | null;
  position: string | null;
  phone?: string | null;
}

export interface PasswordForm {
  current: string;
  next: string;
  confirm: string;
}

export interface NotificationPrefs {
  incomingDocuments: boolean;
  receiptAcknowledged: boolean;
  recipientNotes: boolean;
  overdueDocuments: boolean;
  archivedDocuments: boolean;
  soundEffects: boolean;
  emailEnabled: boolean;
}

export const DEFAULT_NOTIFICATION_PREFS: NotificationPrefs = {
  incomingDocuments: true,
  receiptAcknowledged: true,
  recipientNotes: true,
  overdueDocuments: true,
  archivedDocuments: true,
  soundEffects: true,
  emailEnabled: true,
};

export interface SystemSettings {
  id: string;
  systemName: string;
  organizationName: string;
  organizationLogoUrl: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  contactAddress: string | null;
  language: string;
  dateFormat: string;
  timezone: string;
  trackingPrefix: string;
  trackingYearFormat: string;
  trackingNumberPadding: number;
  defaultDocumentPriority: 'low' | 'normal' | 'high' | 'urgent';
  maxAttachmentSizeMb: number;
  allowedAttachmentTypes: string[];
  documentRegistrationPrefs: Record<string, unknown> | null;
  autoArchiveEnabled: boolean;
  autoArchiveDays: number;
  retentionPolicyDays: number;
  smtpHost: string | null;
  smtpPort: number | null;
  smtpSecure: boolean;
  smtpUser: string | null;
  smtpFromEmail: string | null;
  smtpFromName: string | null;
  emailNotificationsEnabled: boolean;
  hasSmtpPassword: boolean;
  passwordMinLength: number;
  passwordRequireUppercase: boolean;
  passwordRequireLowercase: boolean;
  passwordRequireNumber: boolean;
  passwordRequireSymbol: boolean;
  sessionTimeoutMinutes: number;
  loginAttemptLimit: number;
  loginLockoutMinutes: number;
  updatedById: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SystemHealth {
  database: { status: 'healthy' | 'unavailable'; size: string | null };
  api: { status: 'healthy'; responseMs: number };
  activeSessions: number | null;
  server: { uptimeSeconds: number; memoryMb: number; nodeVersion: string; platform: string };
  lastBackup: { filename: string; createdAt: string; status: string } | null;
}

export interface BackupRecord {
  id: string;
  filename: string;
  path?: string;
  sizeBytes: number;
  status: string;
  notes: string | null;
  createdById: string | null;
  createdAt: string;
}

export function profileFormFromUser(user: ProfileSource): ProfileForm {
  return {
    firstName: user.firstName ?? '',
    middleName: user.middleName ?? '',
    lastName: user.lastName ?? '',
    email: user.email ?? '',
    position: user.position ?? '',
    phone: user.phone ?? '',
  };
}