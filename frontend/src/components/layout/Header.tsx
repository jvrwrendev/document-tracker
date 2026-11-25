import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search, Bell, LogOut, RefreshCw, User as UserIcon, Settings as SettingsIcon, X } from 'lucide-react';
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

  const roleItems = ALL_ROLES.map(role => ({
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

  return (
    <header className="sticky top-0 z-20 bg-white border-b border-slate-200 h-16 px-3 sm:px-6 flex items-center gap-2 sm:gap-3 w-full justify-between">
      <SidebarTrigger className="lg:hidden h-9 w-9 -ml-1 text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground" aria-label="Open menu" />

      {/* Search Bar Container */}
      <form onSubmit={handleSearchSubmit} className="hidden md:flex flex-1 min-w-0 max-w-xl">
        <div className="relative w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          <input
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Search documents, tracking numbers, senders…"
            className="w-full h-10 pl-9 pr-3 rounded-md border border-slate-300 bg-white text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500"
          />
        </div>
      </form>

      {mobileSearchOpen && (
        <form onSubmit={handleSearchSubmit} className="flex md:hidden flex-1 min-w-0 items-center gap-2">
          <div className="relative flex-1 min-w-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Search documents…"
              autoFocus
              className="w-full h-10 pl-9 pr-3 rounded-md border border-slate-300 bg-white text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500"
            />
          </div>
          <button
            type="button"
            onClick={() => setMobileSearchOpen(false)}
            className="inline-flex items-center justify-center w-9 h-9 rounded-md hover:bg-slate-100 text-slate-600 shrink-0"
            aria-label="Close search"
          >
            <X className="w-4 h-4" />
          </button>
        </form>
      )}

      {/* Far Right Action Icons (ml-auto pushes everything to the extreme right) */}
      <div className={cn('items-center gap-1 sm:gap-2 shrink-0 ml-auto', mobileSearchOpen ? 'hidden md:flex' : 'flex')}>

        <button
          type="button"
          onClick={() => setMobileSearchOpen(true)}
          className="md:hidden inline-flex items-center justify-center w-9 h-9 rounded-md hover:bg-slate-100 text-slate-600"
          aria-label="Search"
        >
          <Search className="w-5 h-5" />
        </button>

        <button
          type="button"
          onClick={() => setSwitcherOpen(s => !s)}
          className="xl:hidden inline-flex items-center justify-center w-9 h-9 rounded-md bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-700"
          aria-label="Switch user role"
          title={`Switch role (current: ${ROLE_SHORT_LABELS[user.role]})`}
        >
          <RefreshCw className="w-4 h-4" />
        </button>

        <div className="relative">
          <button
            type="button"
            onClick={() => setNotifOpen(o => !o)}
            className="relative w-9 h-9 rounded-md hover:bg-slate-100 flex items-center justify-center text-slate-600"
            aria-label="Notifications"
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 rounded-full bg-rose-500 text-white text-[10px] font-semibold leading-none inline-flex items-center justify-center border border-white">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </button>

          {notifOpen && (
            <>
              <div className="fixed inset-0 z-30" onClick={() => setNotifOpen(false)} />
              <div className="absolute right-0 mt-2 w-[360px] max-w-[calc(100vw-2rem)] bg-white border border-slate-200 rounded-lg z-40 overflow-hidden">
                <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
                  <p className="text-sm font-semibold text-slate-900">Notifications</p>
                  <Link
                    to="/notifications"
                    onClick={() => setNotifOpen(false)}
                    className="text-xs text-brand-600 hover:underline"
                  >
                    View all
                  </Link>
                </div>
                <div className="max-h-[400px] overflow-y-auto scrollbar-thin">
                  {notifications.length === 0 ? (
                    <p className="px-4 py-8 text-sm text-slate-500 text-center">No notifications</p>
                  ) : (
                    notifications.map(n => (
                      <Link
                        key={n.id}
                        to={n.link || '/notifications'}
                        onClick={() => {
                          setNotifOpen(false);
                          if (!n.read) {
                            markRead(n.id);
                            setUnreadCount(c => Math.max(0, c - 1));
                          }
                        }}
                        className="flex items-start gap-3 px-4 py-3 border-b border-slate-100 hover:bg-slate-50 transition-colors"
                      >
                        <div
                          className={cn(
                            'w-2 h-2 mt-1.5 rounded-full shrink-0',
                            n.read ? 'bg-slate-300' : 'bg-brand-500',
                          )}
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-900 truncate">{n.title}</p>
                          <p className="text-xs text-slate-600 mt-0.5 line-clamp-2">{n.message}</p>
                          <p className="text-[11px] text-slate-400 mt-1">{formatRelative(n.createdAt)}</p>
                        </div>
                      </Link>
                    ))
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        {/* User Avatar Dropdown on Full Right */}
        <Dropdown
          align="right"
          trigger={
            <button
              type="button"
              className="flex items-center justify-center w-9 h-9 rounded-md hover:bg-slate-100 transition-colors"
              aria-label="User menu"
            >
              <Avatar name={user.fullName} color={user.avatarColor} size="md" />
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
          <div className="fixed inset-0 z-40 bg-slate-900/30" onClick={() => setSwitcherOpen(false)} />
          <div className="fixed top-16 right-4 z-50 w-[420px] max-w-[calc(100vw-2rem)] bg-white border border-slate-200 rounded-lg overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-200 bg-amber-50 border-amber-200">
              <div className="flex items-center gap-2">
                <RefreshCw className="w-4 h-4 text-amber-700" />
                <p className="text-sm font-semibold text-amber-900">Development User Switcher</p>
              </div>
              <p className="text-xs text-amber-800 mt-1">Switch between roles to test RBAC and features.</p>
            </div>

            <div className="px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">By Role</p>
              <div className="grid grid-cols-1 gap-1.5">
                {roleItems.map(item => {
                  const sampleUser = allSwitchableUsers.find(u => u.role === item.role);
                  if (!sampleUser) return null;
                  const active = sampleUser.role === user.role;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => handleRoleSwitch(item.role)}
                      className={`flex items-center gap-3 w-full p-2.5 rounded-md border text-left transition-colors ${
                        active
                          ? 'bg-brand-50 border-brand-300'
                          : 'bg-white border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <Avatar name={sampleUser.fullName} color={sampleUser.avatarColor} size="sm" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-slate-900 truncate">{item.label}</p>
                        <p className="text-xs text-slate-500 truncate">{item.description}</p>
                      </div>
                      {active && (
                        <span className="text-[10px] font-semibold text-brand-700 bg-brand-100 px-2 py-0.5 rounded">
                          ACTIVE
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mt-4 mb-2">By User</p>
              <div className="max-h-[240px] overflow-y-auto scrollbar-thin border border-slate-200 rounded-md">
                {allSwitchableUsers.map(u => {
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
                      className={`flex items-center gap-3 w-full px-3 py-2 text-left border-b border-slate-100 last:border-0 transition-colors ${
                        active ? 'bg-brand-50' : 'hover:bg-slate-50'
                      }`}
                    >
                      <Avatar name={u.fullName} color={u.avatarColor} size="sm" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-900 truncate">{u.fullName}</p>
                        <p className="text-[11px] text-slate-500 truncate">{ROLE_LABELS[u.role]} · {officeById(u.officeId)?.code}</p>
                      </div>
                      {active && <span className="text-[10px] font-semibold text-brand-700">ACTIVE</span>}
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
