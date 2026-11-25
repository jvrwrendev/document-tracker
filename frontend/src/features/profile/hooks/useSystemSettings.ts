import { useCallback, useEffect, useMemo, useState } from 'react';
import type { SystemSettings } from '@/features/profile/types/profile';
import { settingsService } from '@/features/profile/services/settings.service';

export function useSystemSettings(enabled: boolean) {
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [draft, setDraft] = useState<SystemSettings | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await settingsService.getSystemSettings();
      setSettings(data);
      setDraft(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load settings.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { if (enabled) void load(); }, [enabled, load]);

  const setField = useCallback(<K extends keyof SystemSettings>(key: K, value: SystemSettings[K]) => {
    setDraft(prev => (prev ? { ...prev, [key]: value } : prev));
  }, []);

  const isDirty = useMemo(() => JSON.stringify(settings) !== JSON.stringify(draft), [settings, draft]);

  const save = useCallback(async () => {
    if (!draft) return null;
    setSaving(true);
    setError(null);
    try {
      const payload: any = { ...draft };
      delete payload.id; delete payload.createdAt; delete payload.updatedAt; delete payload.hasSmtpPassword;
      // only send changed fields + smtpPass if present in draft as special field
      const updated = await settingsService.updateSystemSettings(payload);
      setSettings(updated);
      setDraft(updated);
      return updated;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save settings.');
      return null;
    } finally {
      setSaving(false);
    }
  }, [draft]);

  const reset = useCallback(() => { if (settings) setDraft(settings); }, [settings]);

  return { settings, draft, setDraft, setField, loading, saving, error, isDirty, save, reset, reload: load };
}