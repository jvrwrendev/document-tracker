import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, Mail, Phone, Briefcase, User as UserIcon } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card, CardHeader } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/hooks/useToast';
import { useAuth } from '@/features/authentication/hooks/useAuth';
import { authApi } from '@/features/authentication/api/authApi';
import { useUsers } from '@/features/system-admin/users/hooks/useUsers';
import { useOffices } from '@/features/system-admin/offices/hooks/useOffices';
import { ApiError } from '@/features/system-admin/users/services/user.service';
import {
  USER_ROLE_API,
  USER_ROLE_LABELS,
  type UserAccount,
  type UserRoleApi,
  type UserStatusApi,
} from '@/features/system-admin/users/types/user';
import {
  AddUserTipsCard,
  PasswordInputField,
  RoleInfoCard,
  UserPreviewCard,
} from '@/features/system-admin/users/components';

const ROLE_OPTIONS: { value: string; label: string }[] = USER_ROLE_API.map(r => ({
  value: r,
  label: USER_ROLE_LABELS[r],
}));

const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: 'ACTIVE', label: 'Active' },
  { value: 'INACTIVE', label: 'Inactive' },
  { value: 'SUSPENDED', label: 'Suspended' },
];

function generatePassword(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%';
  let result = '';
  for (let i = 0; i < 12; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

function toMessage(err: unknown, fallback: string): string {
  if (err instanceof ApiError) return err.message;
  if (err instanceof Error) return err.message;
  return fallback;
}

function fullNameOf(user: UserAccount): string {
  const e = user.employee;
  if (!e) return user.username ?? user.email ?? user.id;
  return [e.firstName, e.middleName, e.lastName].filter(Boolean).join(' ');
}

export function EditUserPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const toast = useToast();
  const { hasPermission, user: currentUser, updateCurrentUser } = useAuth();
  const { fetchById, update, updating, actionError, clearActionError } = useUsers();
  const { offices } = useOffices();

  const [user, setUser] = useState<UserAccount | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<UserRoleApi>('DOCUMENT_ENCODER');
  const [status, setStatus] = useState<UserStatusApi>('ACTIVE');
  const [officeId, setOfficeId] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    setLoading(true);
    setLoadError(null);
    fetchById(id)
      .then(u => {
        if (cancelled) return;
        setUser(u);
        setUsername(u.username ?? '');
        setEmail(u.email ?? '');
        setRole(u.role);
        setStatus(u.status);
        setOfficeId(u.employee?.officeId ?? '');
      })
      .catch(err => {
        if (cancelled) return;
        setLoadError(toMessage(err, 'Failed to load user.'));
        setUser(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id, fetchById]);

  const isSelf = !!user && !!currentUser && user.id === currentUser.id;

  const fullName = user ? fullNameOf(user) : '';
  const employee = user?.employee ?? null;
  const office = officeId
    ? offices.find(o => o.id === officeId) ?? employee?.office ?? null
    : null;
  const firstName = employee?.firstName ?? '';
  const lastName = employee?.lastName ?? '';

  const canEdit = hasPermission('users.edit');

  const regeneratePassword = () => setPassword(generatePassword());

  const handleSubmit = async () => {
    if (!user) return;
    clearActionError();

    if (!email.trim()) {
      toast.error('Email required', 'An email address is required.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      toast.error('Invalid email', 'Please enter a valid email address.');
      return;
    }
    if (username.trim().length > 0 && username.trim().length < 3) {
      toast.error('Invalid username', 'Username must be at least 3 characters.');
      return;
    }
    if (password) {
      if (password.length < 8) {
        toast.error('Weak password', 'New password must be at least 8 characters.');
        return;
      }
      if (password !== confirmPassword) {
        toast.error('Passwords do not match', 'Confirm password must match the new password.');
        return;
      }
    }

    try {
      await update(user.id, {
        username: username.trim() || undefined,
        email: email.trim().toLowerCase(),
        role: role as UserRoleApi,
        status: status as UserStatusApi,
        officeId: officeId || null,
        password: password || undefined,
      });
      if (isSelf) {
        try {
          updateCurrentUser(await authApi.me());
        } catch {
          // Ignore refresh failure.
        }
      }
      toast.success('User updated', 'The account has been saved.');
      navigate(`/users/${user.id}`);
    } catch (err) {
      toast.error('Update failed', toMessage(err, 'Could not update the user.'));
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Link to="/users" className="inline-flex items-center text-xs text-slate-500 hover:text-slate-900">
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
        <Link to="/users" className="inline-flex items-center text-xs text-slate-500 hover:text-slate-900">
          <ArrowLeft className="w-3 h-3 mr-1" />
          Back to Users
        </Link>
        <Card>
          <div className="py-8 text-center">
            <UserIcon className="w-10 h-10 text-slate-300 mx-auto" />
            <p className="text-slate-700 font-medium mt-3">User not found</p>
            <p className="text-xs text-slate-500 mt-1">{loadError ?? "The user may have been removed or doesn't exist."}</p>
            <Button variant="outline" className="mt-4" onClick={() => navigate('/users')}>
              Back to Users
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  if (!canEdit) {
    return (
      <div className="space-y-4">
        <Link to="/users" className="inline-flex items-center text-xs text-slate-500 hover:text-slate-900">
          <ArrowLeft className="w-3 h-3 mr-1" />
          Back to Users
        </Link>
        <Card>
          <p className="text-sm text-slate-700">You don't have permission to edit users.</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 w-full">
      <div>
        <Link
          to={`/users/${user.id}`}
          className="inline-flex items-center text-xs text-slate-500 hover:text-slate-900"
        >
          <ArrowLeft className="w-3 h-3 mr-1" />
          Back to User
        </Link>
      </div>

      <PageHeader
        title="Edit User"
        description="Update this user account."
        breadcrumbs={[
          { label: 'Admin' },
          { label: 'Users', to: '/users' },
          { label: fullName, to: `/users/${user.id}` },
          { label: 'Edit' },
        ]}
        actions={
          <>
            <Button variant="outline" onClick={() => navigate(`/users/${user.id}`)} disabled={updating}>
              Cancel
            </Button>
            <Button
              leftIcon={<CheckCircle2 className="w-4 h-4" />}
              onClick={() => void handleSubmit()}
              loading={updating}
              disabled={updating}
            >
              Save Changes
            </Button>
          </>
        }
      />

      {actionError && (
        <div role="alert" className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
          {actionError}
        </div>
      )}

      {isSelf && (
        <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
          You are editing your own account. Changing your role, status, or office assignment may affect your current access.
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 space-y-6">
          <Card>
            <CardHeader title="Employee Record" description="Personal and work details (read-only)" />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <Input label="First Name" name="firstName" value={employee?.firstName ?? ''} disabled />
              <Input label="Middle Name" name="middleName" value={employee?.middleName ?? ''} disabled />
              <Input label="Last Name" name="lastName" value={employee?.lastName ?? ''} disabled />
              <Input
                label="Email"
                name="employeeEmail"
                type="email"
                value={employee?.email ?? ''}
                leftIcon={<Mail className="w-4 h-4" />}
                disabled
              />
              <Input
                label="Phone"
                name="phone"
                value={employee?.phone ?? ''}
                leftIcon={<Phone className="w-4 h-4" />}
                disabled
              />
              <Input
                label="Position"
                name="position"
                value={employee?.position ?? ''}
                leftIcon={<Briefcase className="w-4 h-4" />}
                disabled
              />
              <Select
                label="Office"
                name="officeId"
                value={officeId}
                onChange={e => setOfficeId(e.target.value)}
                options={[
                  { value: '', label: 'Unassigned' },
                  ...offices.map(o => ({ value: o.id, label: `${o.code} — ${o.name}` })),
                ]}
                hint="Unassigned users cannot perform office-scoped actions."
                disabled={updating}
              />
            </div>
          </Card>

          <Card>
            <CardHeader
              title="Account"
              description="Access role, status, and sign-in details"
            />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Select
                label="Role"
                name="role"
                value={role}
                onChange={e => setRole(e.target.value as UserRoleApi)}
                options={ROLE_OPTIONS}
                disabled={updating}
              />
              <Select
                label="Status"
                name="status"
                value={status}
                onChange={e => setStatus(e.target.value as UserStatusApi)}
                options={STATUS_OPTIONS}
                disabled={updating}
              />
              <Input
                label="Username"
                name="username"
                value={username}
                onChange={e => setUsername(e.target.value)}
                hint={username.trim() ? undefined : 'Leave blank to keep current'}
                disabled={updating}
              />
              <Input
                label="Email"
                name="email"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                leftIcon={<Mail className="w-4 h-4" />}
                disabled={updating}
              />
            </div>
          </Card>

          <Card>
            <CardHeader
              title="Change Password"
              description="Optional — leave blank to keep the current password"
            />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <PasswordInputField
                value={password}
                onChange={setPassword}
                hint="Enter a new password to change it"
                showGenerate
                onGenerate={regeneratePassword}
                disabled={updating}
                name="newPassword"
              />
              <Input
                label="Confirm Password"
                name="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                disabled={updating}
                autoComplete="new-password"
              />
            </div>
          </Card>
        </div>

        <div className="xl:col-span-1 space-y-6">
          <UserPreviewCard
            firstName={firstName}
            lastName={lastName}
            email={email}
            username={username}
            position={employee?.position ?? ''}
            roleLabel={USER_ROLE_LABELS[role]}
            status={status}
            office={office}
          />
          <RoleInfoCard role={role} office={office} />
          <AddUserTipsCard
            tips={[
              'Personal employee details are managed separately; office assignment can be changed here.',
              'Leave the password blank to keep the current one.',
              'Changing a role updates what this user can access.',
            ]}
          />
        </div>
      </div>
    </div>
  );
}
