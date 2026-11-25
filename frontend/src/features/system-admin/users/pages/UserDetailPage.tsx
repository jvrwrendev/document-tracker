import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Building2,
  KeyRound,
  Mail,
  Phone,
  Briefcase,
  Calendar,
  Clock,
  Hash,
  ShieldCheck,
  User as UserIcon,
  Edit2,
  Trash2,
  RefreshCw,
  Send,
  AlertCircle,
} from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { useToast } from '@/hooks/useToast';
import { useConfirm } from '@/components/ui/ConfirmDialog';
import { useAuth } from '@/features/authentication/hooks/useAuth';
import { useUsers } from '@/features/system-admin/users/hooks/useUsers';
import { ApiError, mailService } from '@/features/system-admin/users/services/user.service';
import { UserStatusBadge } from '@/features/system-admin/users/components/UserStatusBadge';
import {
  ROLE_FROM_API,
  USER_ROLE_LABELS,
  type UserAccount,
} from '@/features/system-admin/users/types/user';
import { ROLE_DESCRIPTIONS } from '@/constants';
import { formatDate } from '@/lib/utils';

function fullNameOf(user: UserAccount): string {
  const e = user.employee;
  if (!e) return user.username ?? user.email ?? user.id;
  return [e.firstName, e.middleName, e.lastName].filter(Boolean).join(' ');
}

function initialsOf(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(p => p[0])
    .join('')
    .toUpperCase();
}

export function UserDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const toast = useToast();
  const confirm = useConfirm();
  const { hasPermission, user: authUser } = useAuth();

  const { fetchById, remove, resetPassword, resendCredentials, deleting, resettingPassword, resendingCredentials } =
    useUsers();

  const [user, setUser] = useState<UserAccount | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [testingEmail, setTestingEmail] = useState(false);

  const load = async (userId: string) => {
    setLoading(true);
    setLoadError(null);
    try {
      setUser(await fetchById(userId));
    } catch (err) {
      const message =
        err instanceof ApiError ? err.message : 'Failed to load user.';
      setLoadError(message);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!id) return;
    void load(id);
  }, [id]);

  const handleDelete = async () => {
    if (!user) return;
    const name = fullNameOf(user);
    const ok = await confirm({
      title: 'Delete User',
      description: `Permanently delete ${name}? This action cannot be undone.`,
      confirmText: 'Delete User',
      variant: 'danger',
    });
    if (!ok) return;
    try {
      await remove(user.id);
      toast.success('User deleted', `${name} has been removed from the system.`);
      navigate('/users');
    } catch (err) {
      const message =
        err instanceof ApiError ? err.message : 'Failed to delete user.';
      toast.error('Delete failed', message);
    }
  };

  const handleResetPassword = async () => {
    if (!user) return;
    const name = fullNameOf(user);
    const ok = await confirm({
      title: 'Reset Password',
      description: `Reset the password for ${name}? A new temporary password will be generated and emailed to them.`,
      confirmText: 'Reset Password',
    });
    if (!ok) return;
    try {
      const result = await resetPassword(user.id);
      if (result.credentialsEmailStatus === 'sent') {
        toast.success(
          'Password reset',
          `A new temporary password was generated and emailed to ${name}.`,
        );
      } else {
        toast.warning(
          'Password reset',
          `A new temporary password was generated for ${name}, but the email could not be sent yet. ${result.credentialsEmailReason ? `Reason: ${result.credentialsEmailReason}. ` : ''}Use Resend Credentials to deliver it.`,
        );
      }
    } catch (err) {
      const message =
        err instanceof ApiError ? err.message : 'Failed to reset password.';
      toast.error('Reset failed', message);
    }
  };

  const handleTestEmail = async () => {
    setTestingEmail(true);
    try {
      const result = await mailService.test();
      if (result.status === 'sent') {
        toast.success(
          'Test email sent',
          `Delivered to ${result.recipient}. Check the inbox for the DMS Test Email.`,
        );
      } else if (result.status === 'skipped') {
        toast.warning(
          'Email not configured',
          'SMTP is not configured, so no email was sent. Set the MAIL_* values in the API .env to enable delivery.',
        );
      } else {
        toast.error(
          'Test email failed',
          `Sending to ${result.recipient} failed. Check the server logs.`,
        );
      }
    } catch (err) {
      const message =
        err instanceof ApiError ? err.message : 'Failed to send test email.';
      toast.error('Test email failed', message);
    } finally {
      setTestingEmail(false);
    }
  };

  const handleResendCredentials = async () => {
    if (!user) return;
    const name = fullNameOf(user);
    const ok = await confirm({
      title: 'Resend Credentials',
      description: `Send a new temporary password to ${name}? Their current sessions will be signed out and they will need to change this password on next login.`,
      confirmText: 'Resend Credentials',
    });
    if (!ok) return;
    try {
      const result = await resendCredentials(user.id);
      if (result.credentialsEmailStatus === 'sent') {
        toast.success(
          'Credentials sent',
          `A new temporary password has been emailed to ${name}.`,
        );
      } else {
        toast.warning(
          'Email not delivered',
          `The account credentials could not be emailed to ${name}.${result.credentialsEmailReason ? ` Reason: ${result.credentialsEmailReason}.` : ''} Check the email configuration and try again.`,
        );
      }
    } catch (err) {
      const message =
        err instanceof ApiError ? err.message : 'Failed to resend credentials.';
      toast.error('Resend failed', message);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Link
          to="/users"
          className="inline-flex items-center text-xs text-slate-500 hover:text-slate-900"
        >
          <ArrowLeft className="w-3 h-3 mr-1" />
          Back to Users
        </Link>
        <Card>
          <div className="py-12 text-center text-sm text-slate-500">Loading user…</div>
        </Card>
      </div>
    );
  }

  if (loadError || !user) {
    return (
      <div className="space-y-4">
        <Link
          to="/users"
          className="inline-flex items-center text-xs text-slate-500 hover:text-slate-900"
        >
          <ArrowLeft className="w-3 h-3 mr-1" />
          Back to Users
        </Link>
        <Card>
          <div className="py-8 text-center">
            <UserIcon className="w-10 h-10 text-slate-300 mx-auto" />
            <p className="text-slate-700 font-medium mt-3">User not found</p>
            <p className="text-xs text-slate-500 mt-1">
              {loadError ??
                "The user you're looking for may have been removed or doesn't exist."}
            </p>
            <Button
              variant="outline"
              className="mt-4"
              onClick={() => navigate('/users')}
            >
              Back to Users
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  const employee = user.employee;
  const office = employee?.office ?? null;
  const fullName = fullNameOf(user);
  const uiRole = ROLE_FROM_API[user.role];
  const roleLabel = USER_ROLE_LABELS[user.role];
  const roleDescription = ROLE_DESCRIPTIONS[uiRole];

  return (
    <div className="space-y-6">
      <div>
        <Link
          to="/users"
          className="inline-flex items-center text-xs text-slate-500 hover:text-slate-900"
        >
          <ArrowLeft className="w-3 h-3 mr-1" />
          Back to Users
        </Link>
      </div>

      <PageHeader
        title={fullName}
        breadcrumbs={[
          { label: 'Admin' },
          { label: 'Users', to: '/users' },
          { label: fullName },
        ]}
        actions={
          <>
            {authUser?.role === 'system_admin' && (
              <Button
                variant="outline"
                leftIcon={<Send className="w-4 h-4" />}
                onClick={handleTestEmail}
                disabled={testingEmail || resettingPassword || resendingCredentials || deleting}
              >
                {testingEmail ? 'Sending…' : 'Test Email'}
              </Button>
            )}
            {hasPermission('users.edit') && (
              <Button
                variant="outline"
                leftIcon={<Mail className="w-4 h-4" />}
                onClick={handleResendCredentials}
                disabled={resendingCredentials || resettingPassword || deleting}
              >
                {resendingCredentials ? 'Sending…' : 'Resend Credentials'}
              </Button>
            )}
            {hasPermission('users.edit') && (
              <Button
                variant="outline"
                leftIcon={<KeyRound className="w-4 h-4" />}
                onClick={handleResetPassword}
                disabled={resettingPassword || deleting}
              >
                {resettingPassword ? 'Resetting…' : 'Reset Password'}
              </Button>
            )}
            {hasPermission('users.edit') && (
              <Button
                variant="outline"
                leftIcon={<Edit2 className="w-4 h-4" />}
                onClick={() => navigate(`/users/${user.id}/edit`)}
                disabled={deleting}
              >
                Edit User
              </Button>
            )}
            {hasPermission('users.delete') && (
              <Button
                variant="outline"
                leftIcon={<Trash2 className="w-4 h-4" />}
                onClick={handleDelete}
                disabled={deleting || resettingPassword}
                className="!text-rose-600 !border-rose-200 hover:!bg-rose-50"
              >
                {deleting ? 'Deleting…' : 'Delete'}
              </Button>
            )}
          </>
        }
      />

      <Card padded={false}>
        <div className="p-5 flex items-start gap-4">
          <Avatar
            name={fullName}
            initials={initialsOf(fullName)}
            color="bg-brand-600"
            size="xl"
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-base font-semibold text-slate-900 truncate">
                {fullName}
              </h2>
              <UserStatusBadge status={user.status} />
            </div>
            <p className="text-sm text-slate-600 mt-1 truncate">
              {roleLabel} · {employee?.position ?? '—'}
            </p>
            <dl className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-xs">
              <MetaLine icon={<Mail className="w-3.5 h-3.5" />} label="Email" value={user.email ?? employee?.email ?? '—'} />
              <MetaLine
                icon={<Hash className="w-3.5 h-3.5" />}
                label="Username"
                value={
                  <span className="font-mono text-[11px]">
                    {user.username ?? '—'}
                  </span>
                }
              />
            </dl>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8 space-y-6">
          <Card padded={false}>
            <div className="px-5 py-3.5 border-b border-slate-200 flex items-baseline justify-between">
              <h3 className="text-sm font-semibold text-slate-900">Account</h3>
              <span className="text-xs text-slate-500">
                Created {formatDate(user.createdAt, true)}
              </span>
            </div>
            <dl className="px-5 py-4 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
              <Row label="Role" value={roleLabel} />
              <Row
                label="Status"
                value={<UserStatusBadge status={user.status} />}
              />
              <Row
                label="Username"
                value={
                  <span className="font-mono text-[11px] text-slate-700">
                    {user.username ?? '—'}
                  </span>
                }
              />
              <Row label="Email" value={user.email ?? '—'} />
              <Row
                label="Created"
                value={
                  <span className="text-xs text-slate-600">
                    {formatDate(user.createdAt, true)}
                  </span>
                }
              />
              <Row
                label="Updated"
                value={
                  <span className="text-xs text-slate-600">
                    {formatDate(user.updatedAt, true)}
                  </span>
                }
              />
            </dl>
          </Card>

          {employee ? (
            <Card padded={false}>
              <div className="px-5 py-3.5 border-b border-slate-200">
                <h3 className="text-sm font-semibold text-slate-900">
                  Employee Record
                </h3>
              </div>
              <dl className="px-5 py-4 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
                <Row label="Employee No" value={<span className="font-mono text-xs">{employee.employeeNo}</span>} />
                <Row
                  label="Full Name"
                  value={[employee.firstName, employee.middleName, employee.lastName]
                    .filter(Boolean)
                    .join(' ')}
                />
                <Row label="Position" value={employee.position} />
                <Row
                  label="Email"
                  value={
                    <span className="inline-flex items-center gap-1.5">
                      <Mail className="w-3.5 h-3.5 text-slate-400" />
                      {employee.email}
                    </span>
                  }
                />
                {employee.phone ? (
                  <Row
                    label="Phone"
                    value={
                      <span className="inline-flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5 text-slate-400" />
                        {employee.phone}
                      </span>
                    }
                  />
                ) : null}
                <Row
                  label="Hired"
                  value={
                    <span className="text-xs text-slate-600">
                      {formatDate(employee.hiredAt)}
                    </span>
                  }
                />
                <Row
                  label="Status"
                  value={
                    <Badge variant={employee.isActive ? 'emerald' : 'slate'}>
                      {employee.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  }
                />
              </dl>
            </Card>
          ) : (
            <Card>
              <div className="flex items-start gap-2 text-sm text-slate-600">
                <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
                <p>
                  No employee record is linked to this user account. Contact a
                  system administrator if this seems wrong.
                </p>
              </div>
            </Card>
          )}
        </div>

        <aside className="lg:col-span-4 space-y-6">
          <Card padded={false}>
            <div className="px-5 py-3.5 border-b border-slate-200">
              <h3 className="text-sm font-semibold text-slate-900">Role</h3>
            </div>
            <div className="px-5 py-4 flex items-start gap-2">
              <ShieldCheck className="w-4 h-4 text-brand-600 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-semibold text-slate-900">{roleLabel}</p>
                <p className="text-xs text-slate-500 mt-0.5">
                  {roleDescription ??
                    'Permissions are inherited from this role.'}
                </p>
              </div>
            </div>
          </Card>

          <Card padded={false}>
            <div className="px-5 py-3.5 border-b border-slate-200">
              <h3 className="text-sm font-semibold text-slate-900">Office</h3>
            </div>
            {office ? (
              <Link
                to={`/offices/${office.id}`}
                className="group flex items-center gap-3 px-5 py-4 hover:bg-slate-50"
              >
                <div className="w-9 h-9 rounded-md border border-slate-200 bg-slate-50 flex items-center justify-center text-slate-500 shrink-0">
                  <Building2 className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-900 truncate">
                    {office.name}
                  </p>
                  <p className="text-xs text-slate-500 font-mono">
                    {office.code} · {office.type}
                  </p>
                </div>
              </Link>
            ) : (
              <p className="px-5 py-4 text-xs text-slate-500">
                Unassigned — this user cannot perform office-scoped actions until reassigned.
              </p>
            )}
          </Card>

          <Card padded={false}>
            <div className="px-5 py-3.5 border-b border-slate-200">
              <h3 className="text-sm font-semibold text-slate-900">Snapshot</h3>
            </div>
            <ul className="px-5 py-4 space-y-2 text-xs">
              <SnapshotRow
                icon={<Briefcase className="w-3.5 h-3.5" />}
                label="Position"
                value={employee?.position ?? '—'}
              />
              <SnapshotRow
                icon={<Calendar className="w-3.5 h-3.5" />}
                label="Created"
                value={formatDate(user.createdAt)}
              />
              <SnapshotRow
                icon={<Clock className="w-3.5 h-3.5" />}
                label="Last Update"
                value={formatDate(user.updatedAt)}
              />
              <SnapshotRow
                icon={<RefreshCw className="w-3.5 h-3.5" />}
                label="Reset Password"
                value={
                  hasPermission('users.edit') ? (
                    <button
                      type="button"
                      onClick={handleResetPassword}
                      disabled={resettingPassword}
                      className="font-medium text-brand-700 hover:underline disabled:opacity-50"
                    >
                      {resettingPassword ? 'Resetting…' : 'Generate new password'}
                    </button>
                  ) : (
                    '—'
                  )
                }
              />
            </ul>
          </Card>
        </aside>
      </div>
    </div>
  );
}

function MetaLine({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-2 min-w-0">
      <span className="text-slate-400 shrink-0">{icon}</span>
      <span className="text-slate-500 shrink-0">{label}:</span>
      <span className="text-slate-700 truncate">{value}</span>
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <dt className="text-[11px] uppercase tracking-wider font-semibold text-slate-500">
        {label}
      </dt>
      <dd className="text-sm font-medium text-slate-900 truncate text-right">
        {value}
      </dd>
    </div>
  );
}

function SnapshotRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <li className="flex items-center gap-2 text-slate-600">
      <span className="text-slate-400">{icon}</span>
      <span className="uppercase tracking-wider text-[10px] font-semibold text-slate-500">
        {label}
      </span>
      <span className="ml-auto font-semibold text-slate-900 truncate text-right">
        {value}
      </span>
    </li>
  );
}
