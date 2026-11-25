import { useCallback, useEffect, useState } from 'react';
import {
  DEFAULT_NOTIFICATION_PREFS,
  type NotificationPrefs,
} from '@/features/profile/types/profile';
import { settingsService } from '@/features/profile/services/settings.service';

export interface UseNotificationPrefsReturn {
  prefs: NotificationPrefs;
  loading: boolean;
  isSaving: boolean;
  isDirty: boolean;
  setPref: <K extends keyof NotificationPrefs>(key: K, value: NotificationPrefs[K]) => void;
  save: () => Promise<boolean>;
  reload: () => Promise<void>;
}

export function useNotificationPrefs(userId: string): UseNotificationPrefsReturn {
  const [prefs, setPrefs] = useState<NotificationPrefs>(DEFAULT_NOTIFICATION_PREFS);
  const [saved, setSaved] = useState<NotificationPrefs>(DEFAULT_NOTIFICATION_PREFS);
  const [loading, setLoading] = useState(true);
  const [isSaving, setSaving] = useState(false);

  const reload = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const data = await settingsService.getNotificationPreferences();
      const next: NotificationPrefs = {
        incomingDocuments: data.incomingDocuments,
        receiptAcknowledged: data.receiptAcknowledged,
        recipientNotes: data.recipientNotes,
        overdueDocuments: data.overdueDocuments,
        archivedDocuments: data.archivedDocuments,
        soundEffects: data.soundEffects,
        emailEnabled: data.emailEnabled,
      };
      setPrefs(next);
      setSaved(next);
    } catch {
      setPrefs(DEFAULT_NOTIFICATION_PREFS);
      setSaved(DEFAULT_NOTIFICATION_PREFS);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => { void reload(); }, [reload]);

  const setPref = useCallback<UseNotificationPrefsReturn['setPref']>((key, value) => {
    setPrefs(prev => ({ ...prev, [key]: value }));
  }, []);

  const save = useCallback(async (): Promise<boolean> => {
    setSaving(true);
    try {
      const data = await settingsService.updateNotificationPreferences(prefs);
      const next: NotificationPrefs = {
        incomingDocuments: data.incomingDocuments,
        receiptAcknowledged: data.receiptAcknowledged,
        recipientNotes: data.recipientNotes,
        overdueDocuments: data.overdueDocuments,
        archivedDocuments: data.archivedDocuments,
        soundEffects: data.soundEffects,
        emailEnabled: data.emailEnabled,
      };
      setPrefs(next);
      setSaved(next);
      return true;
    } catch {
      return false;
    } finally {
      setSaving(false);
    }
  }, [prefs]);

  const isDirty = JSON.stringify(prefs) !== JSON.stringify(saved);
  return { prefs, loading, isSaving, isDirty, setPref, save, reload };
}