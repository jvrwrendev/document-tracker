import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Bell,
  ChevronDown,
  LogOut,
  RefreshCw,
  Search,
  Settings as SettingsIcon,
  User as UserIcon,
  X,
} from 'lucide-react';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { useAuth, useCurrentUser } from '@/features/authentication/hooks/useAuth';
import { Avatar } from '@/components/ui/Avatar';
import { Dropdown } from '@/components/ui/Dropdown';
import { ROLE_LABELS, ALL_ROLES, ROLE_SHORT_LABELS } from '@/constants';
import { useOfficeLookup } from '@/hooks/useLookups';
import { useRecentNotifications } from '@/features/notifications/hooks/useRecentNotifications';
import { useUnreadNotifications } from '@/features/notifications/hooks/useUnreadNotifications';
import { formatRelative, cn } from '@/lib/utils';
import type { UserRole } from '@/types';

interface HeaderProps {
  onMenuClick?: () => void;
}

export function Header({ onMenuClick }: HeaderProps) {
  const user = useCurrentUser();
  const { logout, switchRole, switchUser, allSwitchableUsers } = useAuth();
  const officeById = useOfficeLookup();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [switcherOpen, setSwitcherOpen] = useState(false);
  const { items: notifications, markRead } = useRecentNotifications(notifOpen);
  const { unreadCount, setUnreadCount } = useUnreadNotifications(true);

  const roleItems = ALL_ROLES.map((role) => ({
    id: role,
    label: <span className="font-medium">{ROLE_SHORT_LABELS[role]}</span>,
    description: ROLE_LABELS[role],
    role,
  }));

  const handleRoleSwitch = (role: UserRole) => {
    switchRole(role);
    setSwitcherOpen(false);
    navigate('/dashboard');
  };

  const handleSearchSubmit = (e?: FormEvent) => {
    e?.preventDefault();
    const term = searchTerm.trim();
    setMobileSearchOpen(false);
    if (term) {
      navigate(`/documents?search=${encodeURIComponent(term)}`);
    } else {
      navigate('/documents');
    }
  };

  const iconButtonClass =
    'inline-flex h-9 w-9 items-center justify-center rounded-lg border border-transparent text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/30';

  return (
    <header className="sticky top-0 z-20 flex h-16 w-full items-center justify-between gap-3 border-b border-slate-200/80 bg-white/95 px-3 backdrop-blur supports-[backdrop-filter]:bg-white/90 sm:px-6">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <SidebarTrigger
          className="lg:hidden -ml-1 h-9 w-9 rounded-lg text-slate-600 hover:bg-slate-100 hover:text-slate-900"
          aria-label="Open menu"
        />

        <form onSubmit={handleSearchSubmit} className="hidden min-w-0 max-w-xl flex-1 md:flex">
          <div className="relative w-full">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search documents, tracking numbers, or senders"
              className="h-10 w-full rounded-lg border border-slate-200 bg-slate-50/70 pl-9 pr-3 text-sm text-slate-900 placeholder:text-slate-400 transition-colors focus:border-brand-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/15"
            />
          </div>
        </form>

        {mobileSearchOpen && (
          <form onSubmit={handleSearchSubmit} className="flex min-w-0 flex-1 items-center gap-2 md:hidden">
            <div className="relative min-w-0 flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search documents…"
                autoFocus
                className="h-10 w-full rounded-lg border border-slate-200 bg-slate-50/70 pl-9 pr-3 text-sm text-slate-900 placeholder:text-slate-400 transition-colors focus:border-brand-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/15"
              />
            </div>
            <button
              type="button"
              onClick={() => setMobileSearchOpen(false)}
              className={iconButtonClass}
              aria-label="Close search"
            >
              <X className="h-4 w-4" />
            </button>
          </form>
        )}
      </div>

      <div className={cn('items-center gap-1.5 sm:gap-2 shrink-0', mobileSearchOpen ? 'hidden md:flex' : 'flex')}>
        <button
          type="button"
          onClick={() => setMobileSearchOpen(true)}
          className={cn(iconButtonClass, 'md:hidden')}
          aria-label="Search"
        >
          <Search className="h-5 w-5" />
        </button>

        <button
          type="button"
          onClick={() => setSwitcherOpen((s) => !s)}
          className="xl:hidden inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/30"
          aria-label="Switch user role"
          title={`Switch role (current: ${ROLE_SHORT_LABELS[user.role]})`}
        >
          <RefreshCw className="h-4 w-4" />
        </button>

        <div className="relative">
          <button
            type="button"
            onClick={() => setNotifOpen((o) => !o)}
            className={cn(iconButtonClass, 'relative')}
            aria-label="Notifications"
          >
            <Bell className="h-5 w-5" />
            {unreadCount > 0 && (
              <span className="absolute -right-0.5 -top-0.5 inline-flex min-w-[18px] h-[18px] items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-semibold leading-none text-white ring-2 ring-white">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </button>

          {notifOpen && (
            <>
              <div className="fixed inset-0 z-30" onClick={() => setNotifOpen(false)} />
              <div className="absolute right-0 z-40 mt-2 w-[360px] max-w-[calc(100vw-2rem)] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg shadow-slate-200/50">
                <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">Notifications</p>
                    <p className="text-xs text-slate-500">{unreadCount > 0 ? `${unreadCount} unread` : 'All caught up'}</p>
                  </div>
                  <Link
                    to="/notifications"
                    onClick={() => setNotifOpen(false)}
                    className="text-xs font-medium text-brand-700 hover:text-brand-800 hover:underline"
                  >
                    View all
                  </Link>
                </div>
                <div className="max-h-[400px] overflow-y-auto scrollbar-thin">
                  {notifications.length === 0 ? (
                    <div className="px-4 py-10 text-center">
                      <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                        <Bell className="h-5 w-5" />
                      </div>
                      <p className="text-sm font-medium text-slate-700">No notifications</p>
                      <p className="mt-1 text-xs text-slate-500">You’re all caught up for now.</p>
                    </div>
                  ) : (
                    notifications.map((n) => (
                      <Link
                        key={n.id}
                        to={n.link || '/notifications'}
                        onClick={() => {
                          setNotifOpen(false);
                          if (!n.read) {
                            markRead(n.id);
                            setUnreadCount((c) => Math.max(0, c - 1));
                          }
                        }}
                        className={cn(
                          'flex items-start gap-3 border-b border-slate-100 px-4 py-3 transition-colors hover:bg-slate-50',
                          !n.read && 'bg-brand-50/20'
                        )}
                      >
                        <div
                          className={cn(
                            'mt-1.5 h-2 w-2 shrink-0 rounded-full',
                            n.read ? 'bg-slate-300' : 'bg-brand-500'
                          )}
                        />
                        <div className="min-w-0 flex-1">
                          <p className={cn('truncate text-sm text-slate-900', !n.read ? 'font-semibold' : 'font-medium')}>
                            {n.title}
                          </p>
                          <p className="mt-0.5 line-clamp-2 text-xs text-slate-600">{n.message}</p>
                          <p className="mt-1 text-[11px] text-slate-400">{formatRelative(n.createdAt)}</p>
                        </div>
                      </Link>
                    ))
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        <Dropdown
          align="right"
          trigger={
            <button
              type="button"
              className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-1.5 py-1.5 transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/30 sm:pl-2 sm:pr-2.5"
              aria-label="User menu"
            >
              <Avatar name={user.fullName} color={user.avatarColor} size="sm" />
              <div className="hidden min-w-0 text-left sm:block">
                <p className="max-w-[140px] truncate text-xs font-semibold leading-tight text-slate-900">{user.fullName}</p>
                <p className="max-w-[140px] truncate text-[11px] leading-tight text-slate-500">{ROLE_SHORT_LABELS[user.role]}</p>
              </div>
              <ChevronDown className="hidden h-3.5 w-3.5 text-slate-400 sm:block" />
            </button>
          }
          items={[
            {
              id: 'profile',
              label: 'My Profile',
              icon: <UserIcon className="w-4 h-4" />,
              onClick: () => navigate('/settings'),
            },
            {
              id: 'settings',
              label: 'Settings',
              icon: <SettingsIcon className="w-4 h-4" />,
              onClick: () => navigate('/settings'),
            },
            { id: 'd-1', label: '', divider: true },
            {
              id: 'office',
              label: (
                <div className="flex flex-col">
                  <span className="text-xs text-slate-500">Office</span>
                  <span className="font-semibold text-slate-900">{user.officeName ?? 'Unassigned'}</span>
                </div>
              ),
              onClick: () => {},
            },
            { id: 'd-2', label: '', divider: true },
            {
              id: 'logout',
              label: 'Sign Out',
              icon: <LogOut className="w-4 h-4" />,
              destructive: true,
              onClick: () => {
                logout();
                navigate('/login');
              },
            },
          ]}
        />
      </div>

      {switcherOpen && (
        <>
          <div className="fixed inset-0 z-40 bg-slate-900/20 backdrop-blur-[1px]" onClick={() => setSwitcherOpen(false)} />
          <div className="fixed top-16 right-4 z-50 w-[420px] max-w-[calc(100vw-2rem)] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg shadow-slate-200/50">
            <div className="border-b border-slate-100 px-4 py-3">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
                  <RefreshCw className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-900">Development User Switcher</p>
                  <p className="text-xs text-slate-500">Switch roles or users to test RBAC.</p>
                </div>
              </div>
            </div>

            <div className="px-4 py-3">
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500">By Role</p>
              <div className="grid grid-cols-1 gap-1.5">
                {roleItems.map((item) => {
                  const sampleUser = allSwitchableUsers.find((u) => u.role === item.role);
                  if (!sampleUser) return null;
                  const active = sampleUser.role === user.role;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => handleRoleSwitch(item.role)}
                      className={cn(
                        'flex w-full items-center gap-3 rounded-lg border p-2.5 text-left transition-colors',
                        active
                          ? 'border-brand-200 bg-brand-50/60'
                          : 'border-slate-200 bg-white hover:bg-slate-50'
                      )}
                    >
                      <Avatar name={sampleUser.fullName} color={sampleUser.avatarColor} size="sm" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-slate-900">{item.label}</p>
                        <p className="truncate text-xs text-slate-500">{item.description}</p>
                      </div>
                      {active && (
                        <span className="rounded-full bg-brand-100 px-2 py-0.5 text-[10px] font-semibold text-brand-700">
                          Active
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              <p className="mb-2 mt-4 text-[11px] font-semibold uppercase tracking-wider text-slate-500">By User</p>
              <div className="max-h-[240px] overflow-y-auto rounded-lg border border-slate-200 scrollbar-thin">
                {allSwitchableUsers.map((u) => {
                  const active = u.id === user.id;
                  return (
                    <button
                      key={u.id}
                      type="button"
                      onClick={() => {
                        switchUser(u.id);
                        setSwitcherOpen(false);
                        navigate('/dashboard');
                      }}
                      className={cn(
                        'flex w-full items-center gap-3 border-b border-slate-100 px-3 py-2.5 text-left transition-colors last:border-0',
                        active ? 'bg-brand-50/50' : 'hover:bg-slate-50'
                      )}
                    >
                      <Avatar name={u.fullName} color={u.avatarColor} size="sm" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-slate-900">{u.fullName}</p>
                        <p className="truncate text-[11px] text-slate-500">
                          {ROLE_LABELS[u.role]} · {officeById(u.officeId)?.code ?? 'No office'}
                        </p>
                      </div>
                      {active && <span className="text-[10px] font-semibold text-brand-700">Active</span>}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </>
      )}
    </header>
  );
}
