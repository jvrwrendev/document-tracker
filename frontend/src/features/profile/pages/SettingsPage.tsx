import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Activity, Archive, Bell, Database, Download, HardDrive, KeyRound, Lock, Mail,
  RefreshCw, RotateCcw, Save, Server, Settings2, ShieldCheck, Trash2, Upload, User as UserIcon, Building2, FileText, Clock, AlertTriangle,
} from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import { Input, Textarea } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { useAuth, useCurrentUser } from '@/features/authentication/hooks/useAuth';
import { useToast } from '@/hooks/useToast';
import { useConfirm } from '@/components/ui/ConfirmDialog';
import { useProfileForm } from '@/features/profile/hooks/useProfileForm';
import { usePasswordForm } from '@/features/profile/hooks/usePasswordForm';
import { useNotificationPrefs } from '@/features/profile/hooks/useNotificationPrefs';
import { useSessions } from '@/features/profile/hooks/useSessions';
import { useSystemSettings } from '@/features/profile/hooks/useSystemSettings';
import { settingsService } from '@/features/profile/services/settings.service';
import type { BackupRecord, SystemHealth } from '@/features/profile/types/profile';
import {
  DangerItem, HealthItem, PrefRow, SessionItem, SettingsHero, SettingsNav, SettingsSection,
  type SettingsNavItem,
} from '@/features/profile/components';
import { formatDate } from '@/lib/utils';

function FieldGroup({ label, required, hint, children }: { label: string; required?: boolean; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between gap-2">
        <label className="text-xs font-semibold uppercase tracking-wider text-slate-600">
          {label}{required && <span className="ml-0.5 text-rose-500">*</span>}
        </label>
        {hint && <span className="text-[11px] text-slate-400">{hint}</span>}
      </div>
      {children}
    </div>
  );
}

export function SettingsPage() {
  const user = useCurrentUser();
  const { hasPermission, updateCurrentUser, logout } = useAuth();
  const toast = useToast();
  const confirm = useConfirm();
  const navigate = useNavigate();
  const isAdmin = hasPermission('settings.view');
  const canEdit = hasPermission('settings.edit');

  const [tab, setTab] = useState('profile');
  const profile = useProfileForm(user);
  const password = usePasswordForm();
  const prefs = useNotificationPrefs(user.id);
  const sessions = useSessions(tab === 'security');
  const sys = useSystemSettings(isAdmin && ['general', 'documents', 'archive', 'email', 'health', 'backup'].includes(tab));

  const [health, setHealth] = useState<SystemHealth | null>(null);
  const [healthLoading, setHealthLoading] = useState(false);
  const [backups, setBackups] = useState<BackupRecord[]>([]);
  const [backupsLoading, setBackupsLoading] = useState(false);
  const [testEmailTo, setTestEmailTo] = useState(user.email || '');
  const [testingEmail, setTestingEmail] = useState(false);
  const [restoringId, setRestoringId] = useState<string | null>(null);

  const loadHealth = async () => {
    setHealthLoading(true);
    try { setHealth(await settingsService.getHealth()); }
    catch (e) { toast.error('Health check failed', e instanceof Error ? e.message : 'Please retry.'); }
    finally { setHealthLoading(false); }
  };
  const loadBackups = async () => {
    setBackupsLoading(true);
    try { setBackups(await settingsService.listBackups()); }
    catch (e) { toast.error('Failed to load backups', e instanceof Error ? e.message : 'Please retry.'); }
    finally { setBackupsLoading(false); }
  };

  useEffect(() => { if (isAdmin && tab === 'health') void loadHealth(); }, [isAdmin, tab]);
  useEffect(() => { if (isAdmin && tab === 'backup') void loadBackups(); }, [isAdmin, tab]);

  const navItems: SettingsNavItem[] = [
    { id: 'profile', label: 'Profile', icon: <UserIcon className="h-4 w-4" />, description: 'Personal information' },
    { id: 'notifications', label: 'Notifications', icon: <Bell className="h-4 w-4" />, description: 'Preferences' },
    { id: 'security', label: 'Security', icon: <Lock className="h-4 w-4" />, description: 'Password & sessions' },
    ...(isAdmin ? [
      { id: 'general', label: 'General', icon: <Settings2 className="h-4 w-4" />, description: 'Organization & locale' },
      { id: 'documents', label: 'Documents', icon: <FileText className="h-4 w-4" />, description: 'Registration & attachments' },
      { id: 'archive', label: 'Archive', icon: <Archive className="h-4 w-4" />, description: 'Retention & archival' },
      { id: 'email', label: 'Email', icon: <Mail className="h-4 w-4" />, description: 'SMTP & delivery' },
      { id: 'health', label: 'System Health', icon: <Activity className="h-4 w-4" />, description: 'Live status' },
      { id: 'backup', label: 'Backup & Restore', icon: <Database className="h-4 w-4" />, description: 'Data protection' },
    ] : []),
  ];

  const handleSaveProfile = async () => {
    if (profile.emailChanged) {
      const ok = await confirm({ title: 'Change email & sign out?', description: "We'll save your new email, then sign you out so you can sign back in with it.", confirmText: 'Save & Sign Out', variant: 'primary' });
      if (!ok) return;
    }
    const updated = await profile.save();
    if (!updated) { if (profile.errorMessage) toast.error('Update failed', profile.errorMessage); return; }
    updateCurrentUser(updated);
    toast.success('Profile updated', 'Your profile has been saved.');
    if (profile.emailChanged) { await logout(); navigate('/login'); }
  };

  const handleChangePassword = async () => {
    const ok = await password.submit();
    if (!ok) { toast.error('Could not change password', password.errorMessage ?? 'Please retry.'); return; }
    toast.success('Password changed', 'Your password was updated.');
  };

  const handleSavePrefs = async () => {
    const ok = await prefs.save();
    if (ok) toast.success('Preferences saved', 'Your notification preferences have been updated.');
    else toast.error('Save failed', 'Could not save notification preferences.');
  };

  const handleRevokeSession = async (sessionId: string) => {
    const ok = await confirm({ title: 'Revoke session', description: 'That device will be signed out immediately.', confirmText: 'Revoke', variant: 'danger' });
    if (!ok) return;
    const revoked = await sessions.revoke(sessionId);
    if (revoked) toast.success('Session revoked');
    else toast.error('Revoke failed', sessions.errorMessage ?? 'Please retry.');
  };

  const handleRevokeOtherSessions = async () => {
    const ok = await confirm({ title: 'Revoke other sessions', description: 'All other devices will be signed out. Your current session will remain active.', confirmText: 'Revoke Other Sessions', variant: 'danger' });
    if (!ok) return;
    const revoked = await sessions.revokeAllOthers();
    if (revoked) toast.success('Other sessions revoked');
    else toast.error('Revoke failed', sessions.errorMessage ?? 'Please retry.');
  };

  const saveSystem = async (label: string) => {
    if (!canEdit) { toast.error('Permission denied', 'You do not have settings.edit permission.'); return; }
    const updated = await sys.save();
    if (updated) toast.success(`${label} saved`, 'System settings were updated.');
    else toast.error('Save failed', sys.error ?? 'Please retry.');
  };

  const handleTestEmail = async () => {
    if (!testEmailTo) { toast.error('Email required', 'Enter a recipient email address.'); return; }
    setTestingEmail(true);
    try {
      await settingsService.testEmail(testEmailTo);
      toast.success('Test email sent', `A test email was sent to ${testEmailTo}.`);
    } catch (e) { toast.error('Test failed', e instanceof Error ? e.message : 'Could not send test email.'); }
    finally { setTestingEmail(false); }
  };

  const handleCreateBackup = async () => {
    const ok = await confirm({ title: 'Create backup', description: 'Create a new database backup now?', confirmText: 'Create Backup' });
    if (!ok) return;
    try {
      await settingsService.createBackup();
      toast.success('Backup created', 'Database backup was created successfully.');
      await loadBackups();
    } catch (e) { toast.error('Backup failed', e instanceof Error ? e.message : 'Could not create backup.'); }
  };

  const handleDownloadBackup = async (backup: BackupRecord) => {
    try {
      const token = localStorage.getItem('dms_token'); // fallback; api uses cookies usually
      const base = import.meta.env.VITE_API_URL || '/api/v2';
      const res = await fetch(`${base}/settings/backups/${backup.id}/download`, { credentials: 'include', headers: token ? { Authorization: `Bearer ${token}` } : {} });
      if (!res.ok) throw new Error('Download failed');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = backup.filename; a.click();
      URL.revokeObjectURL(url);
    } catch (e) { toast.error('Download failed', e instanceof Error ? e.message : 'Could not download backup.'); }
  };

  const handleRestoreBackup = async (backup: BackupRecord) => {
    const ok = await confirm({
      title: 'Restore backup',
      description: `Restore "${backup.filename}"? This will overwrite current database data. This action is dangerous and should be used only when necessary.`,
      confirmText: 'Restore',
      variant: 'danger',
    });
    if (!ok) return;
    const typed = window.prompt('Type RESTORE to confirm database restore:');
    if (typed !== 'RESTORE') { toast.error('Restore cancelled', 'Confirmation text did not match.'); return; }
    setRestoringId(backup.id);
    try {
      await settingsService.restoreBackup(backup.id, 'RESTORE');
      toast.success('Backup restored', 'Database restore completed. Verify system data immediately.');
    } catch (e) { toast.error('Restore failed', e instanceof Error ? e.message : 'Could not restore backup.'); }
    finally { setRestoringId(null); }
  };

  const d = sys.draft;

  return (
    <div className="space-y-6">
      <PageHeader title="Settings" description="Manage your account and system configuration" eyebrow="Settings" />
      <SettingsHero fullName={user.fullName} email={user.email} role={user.role} officeName={user.officeName ?? null} userId={user.id} avatarColor={user.avatarColor} createdAt={user.createdAt} isDirty={profile.isDirty || sys.isDirty || prefs.isDirty} />

      <div className="grid grid-cols-1 lg:grid-cols-[260px_minmax(0,1fr)] gap-6">
        <aside className="lg:sticky lg:top-4 self-start">
          <div className="rounded-xl border border-slate-200 bg-white p-3">
            <SettingsNav items={navItems} value={tab} onChange={setTab} />
          </div>
        </aside>

        <div className="space-y-6 min-w-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {tab === 'profile' && (
            <SettingsSection title="Personal information" description="Keep your name, contact, and role details up to date." icon={<UserIcon className="h-5 w-5" />}
              actions={<>{<Button variant="outline" size="sm" leftIcon={<RotateCcw className="h-3.5 w-3.5" />} onClick={profile.reset} disabled={!profile.isDirty || profile.isSaving}>Reset</Button>}<Button size="sm" leftIcon={<Save className="h-3.5 w-3.5" />} onClick={handleSaveProfile} disabled={!profile.isDirty || profile.isSaving}>{profile.isSaving ? 'Saving…' : 'Save changes'}</Button></>}>
              <div className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
                <FieldGroup label="First name" required><Input value={profile.form.firstName} onChange={e => profile.setField('firstName', e.target.value)} /></FieldGroup>
                <FieldGroup label="Middle name"><Input value={profile.form.middleName} onChange={e => profile.setField('middleName', e.target.value)} /></FieldGroup>
                <FieldGroup label="Last name" required><Input value={profile.form.lastName} onChange={e => profile.setField('lastName', e.target.value)} /></FieldGroup>
                <FieldGroup label="Email" required hint={profile.emailChanged ? 'You will be signed out.' : 'Used for sign-in.'}><Input type="email" value={profile.form.email} onChange={e => profile.setField('email', e.target.value)} /></FieldGroup>
                <FieldGroup label="Position" required><Input value={profile.form.position} onChange={e => profile.setField('position', e.target.value)} /></FieldGroup>
                <FieldGroup label="Phone number"><Input value={profile.form.phone} onChange={e => profile.setField('phone', e.target.value)} placeholder="+63 ..." /></FieldGroup>
              </div>
              {profile.errorMessage && !profile.validationError && <p className="mt-4 rounded-md bg-rose-50 px-3 py-2 text-xs text-rose-700 border border-rose-200">{profile.errorMessage}</p>}
            </SettingsSection>
          )}

          {tab === 'notifications' && (
            <SettingsSection title="Notification preferences" description="Choose which notifications you receive. Saved to your account." icon={<Bell className="h-5 w-5" />}
              actions={<Button size="sm" leftIcon={<Save className="h-3.5 w-3.5" />} onClick={handleSavePrefs} disabled={!prefs.isDirty || prefs.isSaving}>{prefs.isSaving ? 'Saving…' : 'Save preferences'}</Button>}>
              <div className="space-y-2.5">
                <PrefRow label="Email notifications" description="Allow email delivery for enabled notification types" checked={prefs.prefs.emailEnabled} onChange={v => prefs.setPref('emailEnabled', v)} icon={<Mail className="h-4 w-4" />} accent="brand" />
                <PrefRow label="Incoming documents" description="Notify when a document is addressed to your office" checked={prefs.prefs.incomingDocuments} onChange={v => prefs.setPref('incomingDocuments', v)} icon={<FileText className="h-4 w-4" />} accent="indigo" />
                <PrefRow label="Receipt acknowledgment" description="Notify when a recipient office acknowledges receipt" checked={prefs.prefs.receiptAcknowledged} onChange={v => prefs.setPref('receiptAcknowledged', v)} icon={<ShieldCheck className="h-4 w-4" />} accent="emerald" />
                <PrefRow label="Recipient notes & remarks" description="Notify when notes or remarks are added" checked={prefs.prefs.recipientNotes} onChange={v => prefs.setPref('recipientNotes', v)} icon={<Mail className="h-4 w-4" />} accent="amber" />
                <PrefRow label="Overdue documents" description="Notify when documents become overdue" checked={prefs.prefs.overdueDocuments} onChange={v => prefs.setPref('overdueDocuments', v)} icon={<AlertTriangle className="h-4 w-4" />} accent="amber" />
                <PrefRow label="Archived documents" description="Notify when documents are archived" checked={prefs.prefs.archivedDocuments} onChange={v => prefs.setPref('archivedDocuments', v)} icon={<Archive className="h-4 w-4" />} accent="slate" />
                <PrefRow label="Sound effects" description="Play sound for in-app notifications" checked={prefs.prefs.soundEffects} onChange={v => prefs.setPref('soundEffects', v)} icon={<Bell className="h-4 w-4" />} accent="brand" />
              </div>
            </SettingsSection>
          )}

          {tab === 'security' && (
            <>
              <SettingsSection title="Change password" description="Use a strong password you don't use elsewhere." icon={<KeyRound className="h-5 w-5" />}
                actions={<Button size="sm" leftIcon={<Save className="h-3.5 w-3.5" />} onClick={handleChangePassword} disabled={password.isSaving || !password.isDirty}>{password.isSaving ? 'Updating…' : 'Update password'}</Button>}>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                  <FieldGroup label="Current password"><Input type="password" value={password.form.current} onChange={e => password.setField('current', e.target.value)} autoComplete="current-password" /></FieldGroup>
                  <FieldGroup label="New password" hint="8+ chars, letter + number"><Input type="password" value={password.form.next} onChange={e => password.setField('next', e.target.value)} autoComplete="new-password" /></FieldGroup>
                  <FieldGroup label="Confirm new password"><Input type="password" value={password.form.confirm} onChange={e => password.setField('confirm', e.target.value)} autoComplete="new-password" /></FieldGroup>
                </div>
                {password.errorMessage && <p className="mt-4 rounded-md bg-rose-50 px-3 py-2 text-xs text-rose-700 border border-rose-200">{password.errorMessage}</p>}
              </SettingsSection>

              <SettingsSection title="Active sessions" description="Devices currently signed in to your account." icon={<Activity className="h-5 w-5" />}
                actions={sessions.sessions.filter(s => !s.current).length > 0 ? <Button variant="outline" size="sm" leftIcon={<Trash2 className="h-3.5 w-3.5" />} onClick={handleRevokeOtherSessions}>Revoke other sessions</Button> : undefined}>
                {sessions.loading ? <p className="text-sm text-slate-500 py-6 text-center">Loading sessions…</p> : sessions.sessions.length === 0 ? <p className="text-sm text-slate-500 py-6 text-center">No active sessions found.</p> : (
                  <div className="space-y-2.5">{sessions.sessions.map(s => <SessionItem key={s.id} session={s} onRevoke={() => handleRevokeSession(s.id)} />)}</div>
                )}
              </SettingsSection>

              {isAdmin && d && (
                <SettingsSection title="Security policies" description="System-wide password and session policies." icon={<ShieldCheck className="h-5 w-5" />}
                  actions={<Button size="sm" leftIcon={<Save className="h-3.5 w-3.5" />} onClick={() => saveSystem('Security policies')} disabled={!canEdit || !sys.isDirty || sys.saving}>{sys.saving ? 'Saving…' : 'Save changes'}</Button>}>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <FieldGroup label="Minimum password length"><Input type="number" min={8} max={128} value={d.passwordMinLength} onChange={e => sys.setField('passwordMinLength', Number(e.target.value))} /></FieldGroup>
                    <FieldGroup label="Session timeout (minutes)"><Input type="number" min={5} max={43200} value={d.sessionTimeoutMinutes} onChange={e => sys.setField('sessionTimeoutMinutes', Number(e.target.value))} /></FieldGroup>
                    <FieldGroup label="Login attempt limit"><Input type="number" min={3} max={20} value={d.loginAttemptLimit} onChange={e => sys.setField('loginAttemptLimit', Number(e.target.value))} /></FieldGroup>
                    <FieldGroup label="Lockout duration (minutes)"><Input type="number" min={1} max={1440} value={d.loginLockoutMinutes} onChange={e => sys.setField('loginLockoutMinutes', Number(e.target.value))} /></FieldGroup>
                  </div>
                  <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {[['passwordRequireUppercase','Require uppercase'],['passwordRequireLowercase','Require lowercase'],['passwordRequireNumber','Require number'],['passwordRequireSymbol','Require symbol']].map(([key,label]) => (
                      <label key={key} className="flex items-center gap-2 text-sm text-slate-700">
                        <input type="checkbox" checked={(d as any)[key]} onChange={e => sys.setField(key as any, e.target.checked)} className="h-4 w-4 rounded border-slate-300 text-brand-600" />
                        {label}
                      </label>
                    ))}
                  </div>
                </SettingsSection>
              )}
            </>
          )}

          {isAdmin && tab === 'general' && d && (
            <SettingsSection title="General settings" description="Organization identity and locale defaults." icon={<Building2 className="h-5 w-5" />}
              actions={<Button size="sm" leftIcon={<Save className="h-3.5 w-3.5" />} onClick={() => saveSystem('General settings')} disabled={!canEdit || !sys.isDirty || sys.saving}>{sys.saving ? 'Saving…' : 'Save changes'}</Button>}>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <FieldGroup label="System name" required><Input value={d.systemName} onChange={e => sys.setField('systemName', e.target.value)} /></FieldGroup>
                <FieldGroup label="Organization name"><Input value={d.organizationName} onChange={e => sys.setField('organizationName', e.target.value)} /></FieldGroup>
                <FieldGroup label="Organization logo URL"><Input value={d.organizationLogoUrl ?? ''} onChange={e => sys.setField('organizationLogoUrl', e.target.value || null)} placeholder="https://..." /></FieldGroup>
                <FieldGroup label="Contact email"><Input type="email" value={d.contactEmail ?? ''} onChange={e => sys.setField('contactEmail', e.target.value || null)} /></FieldGroup>
                <FieldGroup label="Contact phone"><Input value={d.contactPhone ?? ''} onChange={e => sys.setField('contactPhone', e.target.value || null)} /></FieldGroup>
                <FieldGroup label="Contact address"><Input value={d.contactAddress ?? ''} onChange={e => sys.setField('contactAddress', e.target.value || null)} /></FieldGroup>
                <FieldGroup label="Language"><Select value={d.language} onChange={e => sys.setField('language', e.target.value)} options={[{value:'en',label:'English'},{value:'fil',label:'Filipino'}]} /></FieldGroup>
                <FieldGroup label="Date format"><Select value={d.dateFormat} onChange={e => sys.setField('dateFormat', e.target.value)} options={[{value:'MMM DD, YYYY',label:'MMM DD, YYYY'},{value:'DD MMM YYYY',label:'DD MMM YYYY'},{value:'YYYY-MM-DD',label:'YYYY-MM-DD'}]} /></FieldGroup>
                <FieldGroup label="Timezone"><Select value={d.timezone} onChange={e => sys.setField('timezone', e.target.value)} options={[{value:'Asia/Manila',label:'Asia/Manila (UTC+8)'},{value:'UTC',label:'UTC'}]} /></FieldGroup>
              </div>
            </SettingsSection>
          )}

          {isAdmin && tab === 'documents' && d && (
            <SettingsSection title="Document configuration" description="Defaults and attachment rules for document registration." icon={<FileText className="h-5 w-5" />}
              actions={<Button size="sm" leftIcon={<Save className="h-3.5 w-3.5" />} onClick={() => saveSystem('Document configuration')} disabled={!canEdit || !sys.isDirty || sys.saving}>{sys.saving ? 'Saving…' : 'Save changes'}</Button>}>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <FieldGroup label="Tracking prefix"><Input value={d.trackingPrefix} onChange={e => sys.setField('trackingPrefix', e.target.value)} /></FieldGroup>
                <FieldGroup label="Year format"><Select value={d.trackingYearFormat} onChange={e => sys.setField('trackingYearFormat', e.target.value)} options={[{value:'YYYY',label:'YYYY'},{value:'YY',label:'YY'}]} /></FieldGroup>
                <FieldGroup label="Number padding"><Input type="number" min={3} max={8} value={d.trackingNumberPadding} onChange={e => sys.setField('trackingNumberPadding', Number(e.target.value))} /></FieldGroup>
                <FieldGroup label="Default priority"><Select value={d.defaultDocumentPriority} onChange={e => sys.setField('defaultDocumentPriority', e.target.value as any)} options={[{value:'low',label:'Low'},{value:'normal',label:'Normal'},{value:'high',label:'High'},{value:'urgent',label:'Urgent'}]} /></FieldGroup>
                <FieldGroup label="Max attachment size (MB)"><Input type="number" min={1} max={100} value={d.maxAttachmentSizeMb} onChange={e => sys.setField('maxAttachmentSizeMb', Number(e.target.value))} /></FieldGroup>
                <FieldGroup label="Allowed file types" hint="Comma-separated extensions"><Input value={d.allowedAttachmentTypes.join(', ')} onChange={e => sys.setField('allowedAttachmentTypes', e.target.value.split(',').map(x => x.trim().toLowerCase().replace(/^\./,'')).filter(Boolean))} /></FieldGroup>
              </div>
            </SettingsSection>
          )}

          {isAdmin && tab === 'archive' && d && (
            <SettingsSection title="Archive configuration" description="Control automatic archival and retention behavior." icon={<Archive className="h-5 w-5" />}
              actions={<Button size="sm" leftIcon={<Save className="h-3.5 w-3.5" />} onClick={() => saveSystem('Archive configuration')} disabled={!canEdit || !sys.isDirty || sys.saving}>{sys.saving ? 'Saving…' : 'Save changes'}</Button>}>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <FieldGroup label="Automatic archival">
                  <label className="flex items-center gap-2 text-sm text-slate-700 mt-2">
                    <input type="checkbox" checked={d.autoArchiveEnabled} onChange={e => sys.setField('autoArchiveEnabled', e.target.checked)} className="h-4 w-4 rounded border-slate-300 text-brand-600" />
                    Enable automatic archival
                  </label>
                </FieldGroup>
                <FieldGroup label="Archive after (days)" hint="Default 7 days"><Input type="number" min={1} max={3650} value={d.autoArchiveDays} onChange={e => sys.setField('autoArchiveDays', Number(e.target.value))} /></FieldGroup>
                <FieldGroup label="Retention policy (days)"><Input type="number" min={1} max={36500} value={d.retentionPolicyDays} onChange={e => sys.setField('retentionPolicyDays', Number(e.target.value))} /></FieldGroup>
              </div>
              <p className="mt-4 text-xs text-slate-500">The auto-archive service uses these settings on its next run. Archived documents retain metadata, recipients, attachments, and tracking history.</p>
            </SettingsSection>
          )}

          {isAdmin && tab === 'email' && d && (
            <SettingsSection title="Email configuration" description="SMTP delivery settings for system emails." icon={<Mail className="h-5 w-5" />}
              actions={<Button size="sm" leftIcon={<Save className="h-3.5 w-3.5" />} onClick={() => saveSystem('Email configuration')} disabled={!canEdit || !sys.isDirty || sys.saving}>{sys.saving ? 'Saving…' : 'Save changes'}</Button>}>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <FieldGroup label="SMTP host"><Input value={d.smtpHost ?? ''} onChange={e => sys.setField('smtpHost', e.target.value || null)} /></FieldGroup>
                <FieldGroup label="SMTP port"><Input type="number" min={1} max={65535} value={d.smtpPort ?? 587} onChange={e => sys.setField('smtpPort', Number(e.target.value))} /></FieldGroup>
                <FieldGroup label="SMTP user"><Input value={d.smtpUser ?? ''} onChange={e => sys.setField('smtpUser', e.target.value || null)} /></FieldGroup>
                <FieldGroup label="SMTP password" hint={d.hasSmtpPassword ? 'Password configured; enter new value to replace' : 'Not configured'}>
                  <Input type="password" value={(d as any).smtpPass ?? ''} onChange={e => sys.setField('smtpPass' as any, e.target.value)} placeholder={d.hasSmtpPassword ? '••••••••' : ''} />
                </FieldGroup>
                <FieldGroup label="Sender email"><Input type="email" value={d.smtpFromEmail ?? ''} onChange={e => sys.setField('smtpFromEmail', e.target.value || null)} /></FieldGroup>
                <FieldGroup label="Sender name"><Input value={d.smtpFromName ?? ''} onChange={e => sys.setField('smtpFromName', e.target.value || null)} /></FieldGroup>
              </div>
              <div className="mt-4 flex flex-wrap items-center gap-4">
                <label className="flex items-center gap-2 text-sm text-slate-700">
                  <input type="checkbox" checked={d.smtpSecure} onChange={e => sys.setField('smtpSecure', e.target.checked)} className="h-4 w-4 rounded border-slate-300 text-brand-600" />
                  Use secure SMTP (SSL/TLS)
                </label>
                <label className="flex items-center gap-2 text-sm text-slate-700">
                  <input type="checkbox" checked={d.emailNotificationsEnabled} onChange={e => sys.setField('emailNotificationsEnabled', e.target.checked)} className="h-4 w-4 rounded border-slate-300 text-brand-600" />
                  Enable email notifications
                </label>
              </div>
              <div className="mt-5 border-t border-slate-200 pt-4 flex flex-col sm:flex-row gap-3 sm:items-end">
                <FieldGroup label="Test recipient"><Input type="email" value={testEmailTo} onChange={e => setTestEmailTo(e.target.value)} placeholder="you@example.com" /></FieldGroup>
                <Button variant="outline" leftIcon={<Mail className="h-4 w-4" />} onClick={handleTestEmail} disabled={testingEmail || !canEdit}>{testingEmail ? 'Sending…' : 'Send test email'}</Button>
              </div>
            </SettingsSection>
          )}

          {isAdmin && tab === 'health' && (
            <SettingsSection title="System health" description="Live backend and infrastructure status." icon={<Activity className="h-5 w-5" />}
              actions={<Button variant="outline" size="sm" leftIcon={<RefreshCw className="h-3.5 w-3.5" />} onClick={loadHealth} disabled={healthLoading}>{healthLoading ? 'Refreshing…' : 'Refresh'}</Button>}>
              {!health && healthLoading ? <p className="text-sm text-slate-500 py-6 text-center">Loading health…</p> : health ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                  <HealthItem label="Database" status={health.database.status === 'healthy' ? 'healthy' : 'unavailable'} value={health.database.size ?? 'Unavailable'} icon={<HardDrive className="h-4 w-4" />} />
                  <HealthItem label="API response" status="healthy" value={`${health.api.responseMs} ms`} icon={<Activity className="h-4 w-4" />} />
                  <HealthItem label="Active sessions" status={health.activeSessions === null ? 'unavailable' : 'healthy'} value={health.activeSessions === null ? 'Unavailable' : String(health.activeSessions)} icon={<ShieldCheck className="h-4 w-4" />} />
                  <HealthItem label="Server uptime" status="healthy" value={`${Math.floor(health.server.uptimeSeconds / 3600)}h ${Math.floor((health.server.uptimeSeconds % 3600) / 60)}m`} icon={<Clock className="h-4 w-4" />} />
                  <HealthItem label="Memory (RSS)" status="healthy" value={`${health.server.memoryMb} MB`} icon={<Server className="h-4 w-4" />} />
                  <HealthItem label="Last backup" status={health.lastBackup ? 'healthy' : 'unavailable'} value={health.lastBackup ? formatDate(health.lastBackup.createdAt, true) : 'Unavailable'} icon={<Database className="h-4 w-4" />} />
                </div>
              ) : <p className="text-sm text-slate-500 py-6 text-center">Health data unavailable.</p>}
            </SettingsSection>
          )}

          {isAdmin && tab === 'backup' && (
            <SettingsSection title="Backup & Restore" description="Create backups, review history, and restore when authorized." icon={<Database className="h-5 w-5" />}
              actions={<Button size="sm" leftIcon={<Download className="h-3.5 w-3.5" />} onClick={handleCreateBackup} disabled={!canEdit}>Create backup</Button>}>
              {backupsLoading ? <p className="text-sm text-slate-500 py-6 text-center">Loading backups…</p> : backups.length === 0 ? (
                <p className="text-sm text-slate-500 py-6 text-center">No backups found.</p>
              ) : (
                <div className="overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                  <table className="w-full text-sm">
                    <thead><tr className="text-left text-xs text-slate-500 border-b border-slate-200"><th className="py-2 pr-3">File</th><th className="py-2 pr-3">Created</th><th className="py-2 pr-3">Size</th><th className="py-2 pr-3">Status</th><th className="py-2 text-right">Actions</th></tr></thead>
                    <tbody className="divide-y divide-slate-100">
                      {backups.map(b => (
                        <tr key={b.id}>
                          <td className="py-2 pr-3 font-medium text-slate-800">{b.filename}</td>
                          <td className="py-2 pr-3 text-slate-600">{formatDate(b.createdAt, true)}</td>
                          <td className="py-2 pr-3 text-slate-600">{(b.sizeBytes / 1024 / 1024).toFixed(2)} MB</td>
                          <td className="py-2 pr-3"><span className="inline-flex px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">{b.status}</span></td>
                          <td className="py-2 text-right">
                            <div className="inline-flex gap-2">
                              <Button variant="outline" size="sm" onClick={() => handleDownloadBackup(b)}>Download</Button>
                              <Button variant="danger" size="sm" disabled={!canEdit || restoringId === b.id} onClick={() => handleRestoreBackup(b)}>{restoringId === b.id ? 'Restoring…' : 'Restore'}</Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              <p className="mt-4 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">Restore operations overwrite database data. Only authorized system administrators should perform restores, and a fresh backup should be created first.</p>
            </SettingsSection>
          )}
        </div>
      </div>
    </div>
  );
}
