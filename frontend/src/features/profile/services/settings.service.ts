import { apiFetch } from '@/lib/apiClient';
import type {
  BackupRecord,
  NotificationPrefs,
  SystemHealth,
  SystemSettings,
} from '@/features/profile/types/profile';

export class SettingsApiError extends Error {
  readonly status: number;
  readonly details: unknown;
  constructor(status: number, message: string, details?: unknown) {
    super(message);
    this.name = 'SettingsApiError';
    this.status = status;
    this.details = details;
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  return apiFetch<T>(path, init, { ErrorClass: SettingsApiError, source: 'settings.service' });
}

export const settingsService = {
  getSystemSettings(): Promise<SystemSettings> {
    return request<SystemSettings>('/settings');
  },
  updateSystemSettings(payload: Partial<SystemSettings> & { smtpPass?: string | null }): Promise<SystemSettings> {
    return request<SystemSettings>('/settings', { method: 'PATCH', body: JSON.stringify(payload) });
  },
  getHealth(): Promise<SystemHealth> {
    return request<SystemHealth>('/settings/health');
  },
  getNotificationPreferences(): Promise<NotificationPrefs & { id: string; userId: string }> {
    return request('/settings/notification-preferences');
  },
  updateNotificationPreferences(payload: Partial<NotificationPrefs>): Promise<NotificationPrefs & { id: string; userId: string }> {
    return request('/settings/notification-preferences', { method: 'PATCH', body: JSON.stringify(payload) });
  },
  testEmail(to: string): Promise<{ ok: boolean }> {
    return request('/settings/email/test', { method: 'POST', body: JSON.stringify({ to }) });
  },
  listBackups(): Promise<BackupRecord[]> {
    return request('/settings/backups');
  },
  createBackup(notes?: string): Promise<BackupRecord> {
    return request('/settings/backups', { method: 'POST', body: JSON.stringify({ notes }) });
  },
  restoreBackup(id: string, confirmation: string): Promise<{ ok: boolean }> {
    return request(`/settings/backups/${id}/restore`, { method: 'POST', body: JSON.stringify({ confirmation }) });
  },
  getBackupDownloadUrl(id: string): string {
    const base = import.meta.env.VITE_API_URL || '/api/v2';
    return `${base}/settings/backups/${id}/download`;
  },
};