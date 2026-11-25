import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  PlusCircle,
  Search,
  MoreVertical,
  Edit2,
  Trash2,
  Mail,
  RotateCcw,
  KeyRound,
  AlertCircle,
  Eye,
} from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { Table } from '@/components/ui/Table';
import { Badge } from '@/components/ui/Badge';
import { SearchInput } from '@/components/ui/SearchInput';
import { Select } from '@/components/ui/Select';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { Pagination } from '@/components/ui/Pagination';
import { EmptyState } from '@/components/ui/EmptyState';
import { Dropdown } from '@/components/ui/Dropdown';
import { useToast } from '@/hooks/useToast';
import { useConfirm } from '@/components/ui/ConfirmDialog';
import { usePagination } from '@/hooks/usePagination';
import { useAuth } from '@/features/authentication/hooks/useAuth';
import { useUsers } from '@/features/system-admin/users/hooks/useUsers';
import { useOffices } from '@/features/system-admin/offices/hooks/useOffices';
import { ApiError } from '@/features/system-admin/users/services/user.service';
import { UserStatCard } from '@/features/system-admin/users/components/UserStatCard';
import { UserStatusBadge } from '@/features/system-admin/users/components/UserStatusBadge';
import { ROLE_LABELS, ROLE_SHORT_LABELS } from '@/constants';
import { formatDate } from '@/lib/utils';
import {
  ROLE_FROM_API,
  STATUS_FROM_API,
  USER_ROLE_API,
  USER_STATUS_API,
  USER_ROLE_LABELS,
  USER_STATUS_LABELS,
  type UserAccount,
  type UserRoleApi,
  type UserStatusApi,
  type UserStatusUi,
} from '@/features/system-admin/users/types/user';
import type { UserRole } from '@/types';

type RoleFilter = UserRoleApi | 'all';
type StatusFilter = UserStatusApi | 'all';

function fullNameOf(user: UserAccount): string {
  const e = user.employee;
  if (!e) return user.username ?? user.email ?? user.id;
  return [e.firstName, e.middleName, e.lastName].filter(Boolean).join(' ');
}

function emailOf(user: UserAccount): string {
  return user.email ?? user.employee?.email ?? '';
}

function usernameOf(user: UserAccount): string {
  return user.username ?? '';
}

function positionOf(user: UserAccount): string {
  return user.employee?.position ?? '—';
}

function officeNameOf(user: UserAccount): string {
  const office = user.employee?.office;
  if (!office) return 'Unassigned';
  return `${office.code} · ${office.name}`;
}

function officeIdOf(user: UserAccount): string | null {
  return user.employee?.officeId ?? null;
}

function statusToUi(status: UserStatusApi): UserStatusUi {
  return STATUS_FROM_API[status];
}

function roleToUi(role: UserRoleApi): UserRole {
  return ROLE_FROM_API[role];
}

const ROLE_FILTER_OPTIONS: { value: RoleFilter; label: string }[] = [
  { value: 'all', label: 'All Roles' },
  ...USER_ROLE_API.map(r => ({ value: r, label: USER_ROLE_LABELS[r] })),
];

const STATUS_FILTER_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: 'All Status' },
  ...USER_STATUS_API.map(s => ({ value: s, label: USER_STATUS_LABELS[s] })),
];

export function UsersPage() {
  const toast = useToast();
  const confirm = useConfirm();
  const navigate = useNavigate();
  const { hasPermission } = useAuth();

  const { offices } = useOffices();
  const {
    users,
    loading,
    error,
    total,
    refetch,
    remove,
    resetPassword,
    deleting,
    resettingPassword,
  } = useUsers({ fetchAll: true });

  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('all');
  const [officeFilter, setOfficeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

  useEffect(() => {
    if (error) toast.error('Failed to load users', error);
  }, [error, toast]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return users.filter(u => {
      if (roleFilter !== 'all' && u.role !== roleFilter) return false;
      if (statusFilter !== 'all' && u.status !== statusFilter) return false;
      if (officeFilter === 'unassigned' && officeIdOf(u) !== null) return false;
      if (officeFilter !== 'all' && officeFilter !== 'unassigned' && officeIdOf(u) !== officeFilter) return false;
      if (q) {
        const haystack = [
          fullNameOf(u),
          emailOf(u),
          usernameOf(u),
          positionOf(u),
        ]
          .join(' ')
          .toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [users, search, roleFilter, statusFilter, officeFilter]);

  const pagination = usePagination({ totalItems: filtered.length, initialPageSize: 10 });
  const paged = filtered.slice(pagination.start, pagination.end);

  const stats = useMemo(() => {
    const byRole: Record<UserRoleApi, number> = {
      SYSTEM_ADMIN: 0,
      OFFICE_ADMIN: 0,
      DOCUMENT_ENCODER: 0,
      DOCUMENT_OFFICER: 0,
    };
    let active = 0;
    let inactive = 0;
    for (const u of users) {
      byRole[u.role] = (byRole[u.role] ?? 0) + 1;
      if (u.status === 'ACTIVE') active += 1;
      else if (u.status === 'INACTIVE') inactive += 1;
    }
    return { total: users.length, active, inactive, byRole };
  }, [users]);

  const showEmptyState = !loading && users.length === 0;
  const showFilteredEmpty = !loading && users.length > 0 && filtered.length === 0;

  const handleDelete = async (user: UserAccount) => {
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
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Failed to delete user.';
      toast.error('Delete failed', message);
    }
  };

  const handleResetPassword = async (user: UserAccount) => {
    const name = fullNameOf(user);
    const ok = await confirm({
      title: 'Reset Password',
      description: `Reset the password for ${name}? A new temporary password will be generated.`,
      confirmText: 'Reset Password',
    });
    if (!ok) return;
    try {
      await resetPassword(user.id);
      toast.success('Password reset', `A new temporary password was generated for ${name}.`);
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Failed to reset password.';
      toast.error('Reset failed', message);
    }
  };

  const showLoading = loading && users.length === 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Users"
        description="Manage system users, roles, and office assignments"
        actions={
          hasPermission('users.create') ? (
            <Link to="/users/new">
              <Button leftIcon={<PlusCircle className="w-4 h-4" />}>
                Add User
              </Button>
            </Link>
          ) : null
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
        <UserStatCard label="Total Users" value={total || users.length} />
        <UserStatCard label="Active" value={stats.active} accent="emerald" />
        <UserStatCard label="Inactive" value={stats.inactive} accent="slate" />
        {(['SYSTEM_ADMIN', 'OFFICE_ADMIN'] as UserRoleApi[]).map(role => (
          <UserStatCard
            key={role}
            label={ROLE_SHORT_LABELS[roleToUi(role)]}
            value={stats.byRole[role] ?? 0}
            accent="brand"
          />
        ))}
      </div>

      <Card padded={false}>
        <div className="px-4 sm:px-6 py-4 border-b border-border bg-muted/40">
          <div className="flex items-center justify-between gap-3 mb-3">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-7 h-7 rounded-md bg-background border border-border text-muted-foreground flex items-center justify-center shrink-0">
                <Search className="w-3.5 h-3.5" />
              </div>
              <h3 className="text-sm font-semibold text-foreground">Filters</h3>
              {(roleFilter !== 'all' || officeFilter !== 'all' || statusFilter !== 'all' || search !== '') && (
                <span className="text-[10px] font-semibold text-brand-700 bg-brand-50 border border-brand-200 px-1.5 py-0.5 rounded">
                  ACTIVE
                </span>
              )}
            </div>
            <span className="text-sm text-muted-foreground shrink-0">
              <span className="font-semibold text-foreground tabular-nums">{filtered.length}</span>{' '}
              {filtered.length === 1 ? 'user' : 'users'}
            </span>
          </div>

          <div className="flex flex-col xl:flex-row gap-3">
            <SearchInput
              value={search}
              onChange={setSearch}
              placeholder="Search by name, email, username…"
              className="flex-1 min-w-0"
              aria-label="Search users"
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <Select
                value={roleFilter}
                onChange={e => setRoleFilter(e.target.value as RoleFilter)}
                options={ROLE_FILTER_OPTIONS}
                className="w-full sm:w-52"
                aria-label="Filter by role"
              />
              <Select
                value={officeFilter}
                onChange={e => setOfficeFilter(e.target.value)}
                options={[
                  { value: 'all', label: 'All Offices' },
                  { value: 'unassigned', label: 'Unassigned' },
                  ...offices.map(o => ({ value: o.id, label: `${o.code} — ${o.name}` })),
                ]}
                className="w-full sm:w-60"
                aria-label="Filter by office"
              />
              <Select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value as StatusFilter)}
                options={STATUS_FILTER_OPTIONS}
                className="w-full sm:w-36"
                aria-label="Filter by status"
              />
            </div>
          </div>
        </div>

        <Table
          data={paged}
          keyExtractor={u => u.id}
          emptyState={
            showEmptyState ? (
              <EmptyState
                icon={<Search className="w-7 h-7" />}
                title="No users yet"
                description="Get started by creating the first user account."
                action={
                  hasPermission('users.create') ? (
                    <Button onClick={() => navigate('/users/new')}>Add User</Button>
                  ) : null
                }
              />
            ) : showFilteredEmpty ? (
              <EmptyState
                icon={<Search className="w-7 h-7" />}
                title="No users found"
                description="Try adjusting your search filters."
                action={
                  <Button
                    variant="outline"
                    onClick={() => {
                      setSearch('');
                      setRoleFilter('all');
                      setOfficeFilter('all');
                      setStatusFilter('all');
                    }}
                  >
                    Clear filters
                  </Button>
                }
              />
            ) : showLoading ? (
              <div className="py-12 text-center text-sm text-slate-500">
                Loading users…
              </div>
            ) : null
          }
          columns={[
            {
              key: 'fullName',
              header: 'User',
              cell: u => {
                const name = fullNameOf(u);
                return (
                  <div className="flex items-center gap-3">
                    <Avatar name={name} color="bg-slate-600" size="md" />
                    <div className="min-w-0">
                      <Link
                        to={`/users/${u.id}`}
                        className="font-semibold text-slate-900 hover:text-brand-700 truncate block"
                      >
                        {name}
                      </Link>
                      <p className="text-xs text-slate-500 truncate flex items-center gap-1.5">
                        <Mail className="w-3 h-3" />
                        {emailOf(u) || '—'}
                      </p>
                    </div>
                  </div>
                );
              },
            },
            {
              key: 'username',
              header: 'Username',
              width: '150px',
              cell: u => (
                <span className="font-mono text-xs text-slate-700">
                  {usernameOf(u) || '—'}
                </span>
              ),
            },
            {
              key: 'role',
              header: 'Role',
              width: '200px',
              cell: u => (
                <div>
                  <p className="text-sm font-semibold text-slate-900">
                    {USER_ROLE_LABELS[u.role] ?? ROLE_LABELS[roleToUi(u.role)]}
                  </p>
                  <p className="text-xs text-slate-500">{positionOf(u)}</p>
                </div>
              ),
            },
            {
              key: 'office',
              header: 'Office',
              width: '200px',
              cell: u => <Badge variant="slate">{officeNameOf(u)}</Badge>,
            },
            {
              key: 'status',
              header: 'Status',
              width: '130px',
              cell: u => <UserStatusBadge status={u.status} />,
            },
            {
              key: 'created',
              header: 'Created',
              width: '130px',
              cell: u => (
                <span className="text-xs text-slate-600">{formatDate(u.createdAt)}</span>
              ),
            },
            {
              key: 'actions',
              header: '',
              width: '60px',
              align: 'right',
              cell: u => (
                <Dropdown
                  align="right"
                  trigger={
                    <button
                      type="button"
                      className="p-1.5 hover:bg-slate-100 rounded"
                      aria-label={`Actions for ${fullNameOf(u)}`}
                    >
                      <MoreVertical className="w-4 h-4 text-slate-500" />
                    </button>
                  }
                  items={[
                    {
                      id: 'view',
                      label: 'View Details',
                      icon: <Eye className="w-4 h-4" />,
                      onClick: () => navigate(`/users/${u.id}`),
                    },
                    { id: 'd-actions', label: '', divider: true },
                    {
                      id: 'reset',
                      label: resettingPassword ? 'Resetting…' : 'Reset Password',
                      icon: <KeyRound className="w-4 h-4" />,
                      onClick: () => void handleResetPassword(u),
                      disabled: !hasPermission('users.edit') || resettingPassword,
                    },
                    {
                      id: 'edit',
                      label: 'Edit User',
                      icon: <Edit2 className="w-4 h-4" />,
                      onClick: () => navigate(`/users/${u.id}/edit`),
                      disabled: !hasPermission('users.edit'),
                    },
                    { id: 'd-danger', label: '', divider: true },
                    {
                      id: 'delete',
                      label: deleting ? 'Deleting…' : 'Delete User',
                      icon: <Trash2 className="w-4 h-4" />,
                      destructive: true,
                      onClick: () => void handleDelete(u),
                      disabled: !hasPermission('users.delete') || deleting,
                    },
                  ]}
                />
              ),
            },
          ]}
        />

        {filtered.length > 0 && (
          <div className="px-4 py-3 border-t border-slate-200">
            <Pagination
              page={pagination.page}
              totalPages={pagination.totalPages}
              totalItems={filtered.length}
              start={pagination.start}
              end={pagination.end}
              pageSize={pagination.pageSize}
              onPageChange={pagination.setPage}
              onPageSizeChange={pagination.setPageSize}
            />
          </div>
        )}
      </Card>

      {error && !loading && users.length === 0 ? (
        <Card>
          <div className="flex items-start gap-2 text-sm text-rose-700">
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
            <div className="flex-1">
              <p className="font-medium">We couldn't load users</p>
              <p className="text-xs text-rose-600 mt-0.5">{error}</p>
              <Button
                variant="outline"
                size="sm"
                className="mt-3"
                leftIcon={<RotateCcw className="w-3.5 h-3.5" />}
                onClick={() => void refetch()}
              >
                Try again
              </Button>
            </div>
          </div>
        </Card>
      ) : null}
    </div>
  );
}
