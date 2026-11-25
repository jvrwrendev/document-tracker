import { NavLink, useLocation } from 'react-router-dom';
import { FileText, Ticket } from 'lucide-react';
import { navigation, iconMap } from './navigation';
import { useAuth } from '@/features/authentication/hooks/useAuth';
import { useUnreadNotifications } from '@/features/notifications/hooks/useUnreadNotifications';
import { ROLE_LABELS } from '@/constants';
import { Logo } from '@/components/ui/Logo';
import { useSystem } from '@/ticketing/hooks/useSystem';
import {
  ticketingIconMap,
  ticketingNavigation,
  ticketingSections,
} from '@/ticketing/layouts/navigation';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from '@/components/ui/sidebar';

const sections: Array<{ key: 'main' | 'workspace' | 'personal' | 'admin'; label: string }> = [
  { key: 'main', label: 'Overview' },
  { key: 'workspace', label: 'Workflow' },
  { key: 'personal', label: 'Personal' },
  { key: 'admin', label: 'Administration' },
];

export function LayoutSidebar() {
  const { user, hasPermission } = useAuth();
  const { unreadCount } = useUnreadNotifications(true);
  const location = useLocation();
  const { system, switchSystem } = useSystem();

  if (!user) return null;

  const isItemActive = (to: string) =>
    location.pathname === to || location.pathname.startsWith(`${to}/`);

  const filteredNav = navigation.filter(item => {
    if (item.roles && !item.roles.includes(user.role)) return false;
    // Honour the permission gate too: role and permission can be revoked
    // independently, and a nav entry must not advertise a page the user
    // cannot open.
    if (item.permission && !hasPermission(item.permission as never)) return false;
    return true;
  });

  const isTicketing = system === 'ticketing';
  const visibleSections = isTicketing ? ticketingSections : sections;
  const visibleNav = isTicketing ? ticketingNavigation : filteredNav;
  const switchLabel = isTicketing ? 'Go to Document Tracker' : 'Go to Ticketing System';
  const SwitchIcon = isTicketing ? FileText : Ticket;

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground">
              <div className="flex items-center gap-2 px-1">
                <Logo size="sm" alt="" />
                <div className="grid flex-1 text-left leading-tight">
                  <span className="truncate text-sm font-semibold text-sidebar-foreground">CityDocs DMS</span>
                  <span className="truncate text-[11px] text-muted-foreground">
                    {isTicketing ? 'Ticketing System' : 'Document Management'}
                  </span>
                </div>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton className="h-auto cursor-default hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground">
                  <div className="w-full min-w-0 rounded-md bg-slate-50 border border-slate-200 px-2.5 py-2">
                    <p className="text-[11px] uppercase tracking-wider text-slate-500 font-medium">Logged in as</p>
                    <p className="text-sm font-semibold text-sidebar-foreground truncate mt-0.5">{user.fullName}</p>
                    <p className="text-xs text-slate-600 truncate">{ROLE_LABELS[user.role]}</p>
                  </div>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  onClick={() => switchSystem(isTicketing ? 'documents' : 'ticketing')}
                  tooltip={switchLabel}
                  className="py-2 text-brand-700 hover:bg-brand-50 hover:text-brand-800"
                >
                  <SwitchIcon />
                  <span className="group-data-[collapsible=icon]:hidden">{switchLabel}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {visibleSections.map(section => {
          const items = visibleNav.filter(i => i.section === section.key);
          if (items.length === 0) return null;
          return (
            <SidebarGroup key={section.key}>
              <SidebarGroupLabel>{section.label}</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {items.map(item => {
                    const Icon = isTicketing
                      ? ticketingIconMap[item.icon as keyof typeof ticketingIconMap]
                      : iconMap[item.icon as keyof typeof iconMap];
                    const badge = !isTicketing && item.id === 'notifications' ? unreadCount : undefined;
                    return (
                      <SidebarMenuItem key={item.id}>
                        <SidebarMenuButton
                          asChild
                          isActive={isItemActive(item.to)}
                          tooltip={item.label}
                          className="py-2"
                        >
                          <NavLink to={item.to}>
                            {Icon && <Icon />}
                            <span>{item.label}</span>
                          </NavLink>
                        </SidebarMenuButton>
                        {typeof badge === 'number' && badge > 0 && (
                          <SidebarMenuBadge className="bg-rose-100 text-rose-700 data-[active=true]:bg-rose-100 data-[active=true]:text-rose-700">
                            {badge}
                          </SidebarMenuBadge>
                        )}
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          );
        })}
      </SidebarContent>

      <SidebarFooter>
        <div className="px-2 pb-1 text-[11px] leading-relaxed text-muted-foreground">
          <p>{isTicketing ? 'Ticketing v1.0.0' : 'DMS v1.0.0'} &middot; Build 2026.08</p>
          <p className="mt-0.5">For government use only</p>
        </div>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}
