import { useEffect, useState } from 'react';
import {
  Bell,
  CheckCircle2,
  KeyRound,
  Lock,
  Mail,
  Phone,
  ShieldCheck,
  UserRound,
} from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { useToast } from '@/hooks/useToast';
import { useCurrentUser } from '@/features/authentication/hooks/useAuth';
import {
  PrefRow,
  SettingsHero,
  SettingsNav,
  SettingsSection,
  type SettingsNavItem,
} from '@/features/profile/components';

type Tab = 'profile' | 'password' | 'preferences';

export function TicketingAccountPage() {
  const user = useCurrentUser();
  const toast = useToast();
  const [tab, setTab] = useState<Tab>('profile');
  const [profile, setProfile] = useState({ email: user.email, phone: user.phone ?? '', position: user.position ?? '' });
  const [password, setPassword] = useState({ current: '', next: '', confirm: '' });
  const [prefs, setPrefs] = useState({ requestUpdates: true, borrowReminders: true, emailDigest: false });

  useEffect(() => {
    setProfile({ email: user.email, phone: user.phone ?? '', position: user.position ?? '' });
  }, [user.email, user.phone, user.position]);

  const navItems: SettingsNavItem[] = [
    { id: 'profile', label: 'Personal Information', description: 'Update mock profile details', icon: <UserRound className="h-4 w-4" /> },
    { id: 'password', label: 'Password', description: 'Mock password settings', icon: <Lock className="h-4 w-4" /> },
    { id: 'preferences', label: 'Preferences', description: 'Notification preferences', icon: <Bell className="h-4 w-4" /> },
  ];

  const saveProfile = () => {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(profile.email)) {
      toast.error('Invalid email', 'Please enter a valid email address.');
      return;
    }
    toast.success('Profile saved', 'Ticketing profile changes were saved locally.');
  };

  const savePassword = () => {
    if (password.next.length < 8) {
      toast.error('Weak password', 'New password must be at least 8 characters.');
      return;
    }
    if (password.next !== password.confirm) {
      toast.error('Passwords do not match', 'Confirm password must match the new password.');
      return;
    }
    setPassword({ current: '', next: '', confirm: '' });
    toast.success('Password updated', 'This is a mock update; your sign-in credentials were not changed.');
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Account"
        description="Manage your Ticketing System account preferences"
        eyebrow="Ticketing System"
      />

      <SettingsHero
        fullName={user.fullName}
        email={user.email}
        role={user.role}
        officeName={user.officeName}
        userId={user.id}
        avatarColor={user.avatarColor}
        createdAt={user.createdAt}
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[260px_minmax(0,1fr)]">
        <Card className="p-3">
          <SettingsNav items={navItems} value={tab} onChange={id => setTab(id as Tab)} />
        </Card>

        <div className="space-y-6">
          {tab === 'profile' && (
            <SettingsSection
              title="Personal Information"
              description="These changes are local mock interactions and do not affect your Document Tracker account."
              icon={<UserRound className="h-5 w-5" />}
              actions={<Button size="sm" onClick={saveProfile}>Save changes</Button>}
            >
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Input label="Full Name" value={user.fullName} disabled />
                <Input label="Username" value={user.username} disabled />
                <Input
                  label="Email"
                  type="email"
                  leftIcon={<Mail className="h-4 w-4" />}
                  value={profile.email}
                  onChange={e => setProfile(prev => ({ ...prev, email: e.target.value }))}
                />
                <Input
                  label="Phone"
                  leftIcon={<Phone className="h-4 w-4" />}
                  value={profile.phone}
                  onChange={e => setProfile(prev => ({ ...prev, phone: e.target.value }))}
                  placeholder="Optional"
                />
                <Input
                  label="Position"
                  value={profile.position}
                  onChange={e => setProfile(prev => ({ ...prev, position: e.target.value }))}
                  className="sm:col-span-2"
                />
                <Input label="Office" value={user.officeName ?? 'No office assigned'} disabled className="sm:col-span-2" />
              </div>
            </SettingsSection>
          )}

          {tab === 'password' && (
            <SettingsSection
              title="Password Settings"
              description="Mock password form for the Ticketing System interface."
              icon={<KeyRound className="h-5 w-5" />}
              actions={<Button size="sm" onClick={savePassword}>Update password</Button>}
            >
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Input
                  label="Current Password"
                  type="password"
                  value={password.current}
                  onChange={e => setPassword(prev => ({ ...prev, current: e.target.value }))}
                  autoComplete="current-password"
                />
                <div />
                <Input
                  label="New Password"
                  type="password"
                  value={password.next}
                  onChange={e => setPassword(prev => ({ ...prev, next: e.target.value }))}
                  hint="At least 8 characters"
                  autoComplete="new-password"
                />
                <Input
                  label="Confirm Password"
                  type="password"
                  value={password.confirm}
                  onChange={e => setPassword(prev => ({ ...prev, confirm: e.target.value }))}
                  autoComplete="new-password"
                />
              </div>
              <div className="mt-4 flex items-start gap-2 rounded-md border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" />
                <p>No backend request is made. Use the Document Tracker Settings page to change your real sign-in password.</p>
              </div>
            </SettingsSection>
          )}

          {tab === 'preferences' && (
            <SettingsSection
              title="Notification Preferences"
              description="Local preferences for Ticketing System mock interactions."
              icon={<Bell className="h-5 w-5" />}
            >
              <div className="space-y-3">
                <PrefRow
                  label="Service request updates"
                  description="Notify me when a service request status changes."
                  icon={<CheckCircle2 className="h-4 w-4" />}
                  checked={prefs.requestUpdates}
                  onChange={value => setPrefs(prev => ({ ...prev, requestUpdates: value }))}
                />
                <PrefRow
                  label="Borrow slip reminders"
                  description="Remind me about items due for return."
                  icon={<Bell className="h-4 w-4" />}
                  accent="amber"
                  checked={prefs.borrowReminders}
                  onChange={value => setPrefs(prev => ({ ...prev, borrowReminders: value }))}
                />
                <PrefRow
                  label="Daily email digest"
                  description="Receive a daily summary of ticketing activity."
                  icon={<Mail className="h-4 w-4" />}
                  accent="indigo"
                  checked={prefs.emailDigest}
                  onChange={value => setPrefs(prev => ({ ...prev, emailDigest: value }))}
                />
              </div>
              <div className="mt-4 flex justify-end">
                <Button size="sm" onClick={() => toast.success('Preferences saved', 'Ticketing preferences were saved locally.')}>
                  Save preferences
                </Button>
              </div>
            </SettingsSection>
          )}
        </div>
      </div>
    </div>
  );
}
