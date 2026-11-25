import { useEffect, useMemo, useState } from 'react';
import { ShieldCheck, Edit2, Lock, Save, X } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { Tabs } from '@/components/ui/Tabs';
import { useToast } from '@/hooks/useToast';
import { useAuth } from '@/features/authentication/hooks/useAuth';
import { authApi } from '@/features/authentication/api/authApi';
import { useRoles } from '@/features/system-admin/roles-permissions/hooks/useRoles';
import { buildPermissionGroups, roleCoveragePercent } from '@/features/system-admin/roles-permissions/types/role';
import { PermissionGroup, RoleList, RoleStat, UsersWithRole } from '@/features/system-admin/roles-permissions/components';
import type { Permission, UserRole } from '@/types';

export function RolesPermissionsPage() {
  const toast = useToast();
  const { hasPermission, user, updateCurrentUser } = useAuth();
  const canEdit = hasPermission('permissions.assign') && user?.role === 'system_admin';

  const {
    roles, catalog, loading, error, selectedRole, selectedLoading, selectedError,
    selectRole, roleUsers, usersLoading, usersError, refresh, refreshUsers, updatePermissions,
  } = useRoles();

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState<Permission[]>([]);
  const [activeModule, setActiveModule] = useState<string>('');

  useEffect(() => {
    if (!selectedId && roles.length > 0) {
      setSelectedId(roles[0].id);
      void selectRole(roles[0].id);
    }
  }, [roles, selectedId, selectRole]);

  useEffect(() => { if (error) toast.error('Failed to load roles', error); }, [error, toast]);
  useEffect(() => { if (selectedError) toast.error('Failed to load role', selectedError); }, [selectedError, toast]);
  useEffect(() => { if (usersError) toast.error('Failed to load users', usersError); }, [usersError, toast]);

  useEffect(() => {
    setEditing(false);
    setDraft((selectedRole?.permissions ?? []) as Permission[]);
  }, [selectedRole?.id, selectedRole?.permissions]);

  const groups = useMemo(
    () => buildPermissionGroups(catalog, selectedRole?.id),
    [catalog, selectedRole?.id],
  );
  const grantedPermissions = useMemo(
    () => (selectedRole?.permissions ?? []) as Permission[],
    [selectedRole],
  );
  const activePermissions = editing ? draft : grantedPermissions;
  const coverage = useMemo(() => roleCoveragePercent(selectedRole, catalog), [selectedRole, catalog]);

  useEffect(() => {
    if (groups.length === 0) return;
    if (!activeModule || !groups.some(g => g.module === activeModule)) {
      setActiveModule(groups[0].module);
    }
  }, [groups, activeModule]);

  const selectedGroup = groups.find(g => g.module === activeModule) ?? groups[0];

  const handleSelect = (id: string) => {
    if (editing) {
      toast.warning('Unsaved changes', 'Save or cancel your changes before switching roles.');
      return;
    }
    setSelectedId(id);
    void selectRole(id);
  };

  const handleEdit = () => {
    if (!canEdit || !selectedRole) return;
    setDraft(grantedPermissions);
    setEditing(true);
  };

  const handleCancel = () => {
    setDraft(grantedPermissions);
    setEditing(false);
  };

  const handleToggle = (perm: Permission) => {
    if (!editing) return;
    setDraft(prev => prev.includes(perm) ? prev.filter(p => p !== perm) : [...prev, perm]);
  };

  const handleSelectAll = (perms: Permission[]) => {
    if (!editing) return;
    setDraft(prev => Array.from(new Set([...prev, ...perms])));
  };

  const handleDeselectAll = (perms: Permission[]) => {
    if (!editing) return;
    const remove = new Set(perms);
    setDraft(prev => prev.filter(p => !remove.has(p)));
  };

  const handleSave = async () => {
    if (!selectedRole || !editing || saving) return;
    setSaving(true);
    try {
      await updatePermissions(draft);
      setEditing(false);
      window.dispatchEvent(new Event('permissions:invalidate'));
      toast.success('Permissions updated', `${selectedRole.name} permissions were saved.`);
      if (user && user.role === selectedRole.id) {
        const me = await authApi.me();
        updateCurrentUser(me);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not update permissions.';
      toast.error('Save failed', message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Roles & Permissions"
        description="Define and manage role-based access controls"
        actions={<Button variant="outline" size="sm" onClick={() => void refresh()}>Refresh</Button>}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        <Card>
          <CardHeader title="System Roles" description={`${roles.length} role${roles.length === 1 ? '' : 's'} defined`} />
          <RoleList roles={roles} selectedId={selectedId} onSelect={handleSelect} loading={loading} />
        </Card>

        <Card className="lg:col-span-2" padded={false}>
          {selectedRole ? (
            <>
              <div className="flex flex-col gap-3 border-b border-border bg-muted/40 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                <div className="flex items-start gap-3 min-w-0">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-background text-brand-700">
                    <ShieldCheck className="h-5 w-5" />
                  </span>
                  <div className="min-w-0">
                    <h3 className="text-base font-semibold text-foreground">{selectedRole.name}</h3>
                    <p className="text-sm text-muted-foreground mt-0.5">{selectedRole.description}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {editing ? (
                    <>
                      <Button variant="outline" size="sm" leftIcon={<X className="h-3.5 w-3.5" />} onClick={handleCancel} disabled={saving}>
                        Cancel
                      </Button>
                      <Button size="sm" leftIcon={<Save className="h-3.5 w-3.5" />} onClick={handleSave} disabled={saving}>
                        {saving ? 'Saving…' : 'Save Changes'}
                      </Button>
                    </>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      leftIcon={canEdit ? <Edit2 className="h-3.5 w-3.5" /> : <Lock className="h-3.5 w-3.5" />}
                      disabled={!canEdit}
                      onClick={handleEdit}
                      title={canEdit ? 'Edit role permissions' : 'Only SYSTEM_ADMIN with permissions.assign can edit'}
                    >
                      {canEdit ? 'Edit Role' : 'Read only'}
                    </Button>
                  )}
                </div>
              </div>

              <div className="px-4 py-4 sm:px-6">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
                  <RoleStat label="Granted Permissions" value={activePermissions.length} accent="brand" />
                  <RoleStat label="Users Assigned" value={roleUsers.length} accent="indigo" />
                  <RoleStat label="Coverage" value={`${coverage}%`} accent="emerald" />
                </div>

                {editing && (
                  <div className="mb-4 rounded-md border border-brand-200 bg-brand-50 px-3 py-2 text-xs text-brand-800">
                    Edit mode is active. Use checkboxes and module Select All/Deselect All controls, then save or cancel.
                  </div>
                )}

                <Tabs
                  items={groups.map(group => {
                    const active = editing ? draft : grantedPermissions;
                    const grantedCount = group.permissions.filter(p => active.includes(p.key)).length;
                    return {
                      id: group.module,
                      label: group.module,
                      count: grantedCount,
                    };
                  })}
                  value={activeModule}
                  onChange={setActiveModule}
                  variant="underline"
                  size="sm"
                  className="mb-4 overflow-x-auto"
                />

                {selectedGroup && (
                  <PermissionGroup
                    key={selectedGroup.module}
                    group={selectedGroup}
                    granted={grantedPermissions}
                    draftGranted={draft}
                    editing={editing}
                    canEdit={canEdit}
                    saving={saving}
                    selectedRole={selectedRole?.id as UserRole | undefined}
                    onToggle={handleToggle}
                    onSelectAll={handleSelectAll}
                    onDeselectAll={handleDeselectAll}
                  />
                )}
              </div>
            </>
          ) : selectedLoading ? (
            <div className="py-12 text-center text-sm text-muted-foreground">Loading role…</div>
          ) : (
            <div className="py-12">
              <EmptyState icon={<ShieldCheck className="h-7 w-7" />} title="Select a role" description="Pick a role from the list to view its permissions and members." />
            </div>
          )}
        </Card>
      </div>

      {selectedRole && (
        <Card padded={false}>
          <div className="px-4 py-4 border-b border-border sm:px-6">
            <CardHeader title={`Users with ${selectedRole.name} role`} description={`${roleUsers.length} user${roleUsers.length === 1 ? '' : 's'}`} />
          </div>
          <div className="px-4 py-5 sm:px-6">
            {usersLoading && roleUsers.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">Loading users…</p>
            ) : (
              <UsersWithRole users={roleUsers} roleName={selectedRole.name} />
            )}
          </div>
          {roleUsers.length > 0 && (
            <div className="border-t border-border px-4 py-3 sm:px-6">
              <Button variant="ghost" size="sm" onClick={() => void refreshUsers()}>Refresh users</Button>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}