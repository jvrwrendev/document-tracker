import { Injectable, Logger, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { Prisma, Role } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

export interface RoleDefinition {
  id: string;
  name: string;
  description: string;
  permissions: string[];
  userCount: number;
}

export interface RoleSummary {
  id: string;
  name: string;
  description: string;
  userCount: number;
}

export interface RoleUser {
  id: string;
  fullName: string;
  email: string;
  username: string;
  role: string;
  status: string;
  officeName: string | null;
  position: string | null;
  createdAt: string;
}

// Single source of truth for the permission catalog and defaults. The DB stores
// the effective permission list per role; API guards and the Roles UI both read
// from this catalog/restriction metadata.
export const PERMISSION_CATALOG: string[] = [
  'dashboard.view',
  'documents.view', 'documents.create', 'documents.edit', 'documents.delete', 'documents.receive',
  'inbox.view', 'outbox.view', 'tracking.view', 'archive.view',
  'users.view', 'users.create', 'users.edit', 'users.delete',
  'employees.view', 'employees.create', 'employees.edit', 'employees.delete',
  'offices.view', 'offices.create', 'offices.edit', 'offices.delete',
  'roles.view', 'roles.create', 'roles.edit', 'roles.delete',
  'permissions.view', 'permissions.assign',
  'settings.view', 'settings.edit',
  'audit.view',
  'backup.view', 'backup.create', 'backup.restore',
];

// Present in catalog for forward compatibility, but not assignable/operational.
export const RESERVED_PERMISSIONS: string[] = [
  'roles.create', 'roles.delete',
  'backup.view', 'backup.create', 'backup.restore',
];

// Stored when an admin intentionally saves an empty permission set. It is never
// exposed as a real permission and prevents default-restoration on next read.
const EMPTY_PERMISSION_SENTINEL = '__empty__';

export interface PermissionCatalogItem {
  key: string;
  module: string;
  action: string;
}

export const PERMISSION_MODULES: Array<{ module: string; permissions: PermissionCatalogItem[] }> = (() => {
  const order = [
    'Dashboard', 'Documents', 'Inbox', 'Outbox', 'Tracking', 'Archive',
    'Users', 'Employees', 'Offices', 'Roles', 'Permissions', 'Settings',
    'Audit Logs', 'Backup',
  ];
  const labels: Record<string, string> = {
    dashboard: 'Dashboard', documents: 'Documents', inbox: 'Inbox', outbox: 'Outbox',
    tracking: 'Tracking', archive: 'Archive', users: 'Users', employees: 'Employees',
    offices: 'Offices', roles: 'Roles', permissions: 'Permissions', settings: 'Settings',
    audit: 'Audit Logs', backup: 'Backup',
  };
  const grouped = new Map<string, PermissionCatalogItem[]>();
  for (const key of PERMISSION_CATALOG) {
    const [moduleKey, action] = key.split('.');
    const module = labels[moduleKey] ?? moduleKey;
    const items = grouped.get(module) ?? [];
    items.push({ key, module, action });
    grouped.set(module, items);
  }
  return order
    .filter(m => grouped.has(m))
    .map(module => ({ module, permissions: grouped.get(module)! }));
})();

/**
 * Role-restricted permissions. Values are the roles allowed to hold the key.
 * Any role not in the allowlist is rejected on write and cannot be granted via UI.
 */
export const ROLE_RESTRICTED_PERMISSIONS: Record<string, Role[]> = {
  'tracking.view': [Role.SYSTEM_ADMIN, Role.OFFICE_ADMIN],
  'archive.view': [Role.SYSTEM_ADMIN, Role.OFFICE_ADMIN],
  'audit.view': [Role.SYSTEM_ADMIN, Role.OFFICE_ADMIN],
  'documents.delete': [Role.SYSTEM_ADMIN, Role.OFFICE_ADMIN],
  'documents.receive': [Role.SYSTEM_ADMIN, Role.DOCUMENT_OFFICER],
  'inbox.view': [Role.SYSTEM_ADMIN, Role.OFFICE_ADMIN, Role.DOCUMENT_OFFICER],
  'outbox.view': [Role.SYSTEM_ADMIN, Role.OFFICE_ADMIN, Role.DOCUMENT_ENCODER],
  'users.view': [Role.SYSTEM_ADMIN, Role.OFFICE_ADMIN],
  'users.create': [Role.SYSTEM_ADMIN, Role.OFFICE_ADMIN],
  'users.edit': [Role.SYSTEM_ADMIN, Role.OFFICE_ADMIN],
  'users.delete': [Role.SYSTEM_ADMIN],
  'employees.view': [Role.SYSTEM_ADMIN, Role.OFFICE_ADMIN],
  'employees.create': [Role.SYSTEM_ADMIN, Role.OFFICE_ADMIN],
  'employees.edit': [Role.SYSTEM_ADMIN, Role.OFFICE_ADMIN],
  'employees.delete': [Role.SYSTEM_ADMIN],
  'offices.view': [Role.SYSTEM_ADMIN, Role.OFFICE_ADMIN],
  'offices.create': [Role.SYSTEM_ADMIN, Role.OFFICE_ADMIN],
  'offices.edit': [Role.SYSTEM_ADMIN, Role.OFFICE_ADMIN],
  'offices.delete': [Role.SYSTEM_ADMIN],
  'roles.view': [Role.SYSTEM_ADMIN],
  'roles.create': [Role.SYSTEM_ADMIN],
  'roles.edit': [Role.SYSTEM_ADMIN],
  'roles.delete': [Role.SYSTEM_ADMIN],
  'permissions.view': [Role.SYSTEM_ADMIN],
  'permissions.assign': [Role.SYSTEM_ADMIN],
  'settings.view': [Role.SYSTEM_ADMIN],
  'settings.edit': [Role.SYSTEM_ADMIN],
  'backup.view': [Role.SYSTEM_ADMIN],
  'backup.create': [Role.SYSTEM_ADMIN],
  'backup.restore': [Role.SYSTEM_ADMIN],
};

export function allowedRolesForPermission(permission: string): Role[] {
  return ROLE_RESTRICTED_PERMISSIONS[permission] ?? (Object.keys(ROLE_DEFINITIONS) as Role[]);
}

export function isPermissionRestrictedForRole(permission: string, role: Role): boolean {
  const allowed = ROLE_RESTRICTED_PERMISSIONS[permission];
  return !!allowed && !allowed.includes(role);
}

export function restrictedPermissionsFor(role: Role): string[] {
  return Object.entries(ROLE_RESTRICTED_PERMISSIONS)
    .filter(([, roles]) => !roles.includes(role))
    .map(([permission]) => permission);
}

export const DEFAULT_ROLE_PERMISSIONS: Record<Role, string[]> = {
  SYSTEM_ADMIN: PERMISSION_CATALOG.filter(p => !RESERVED_PERMISSIONS.includes(p)),
  OFFICE_ADMIN: [
    'dashboard.view',
    'documents.view', 'documents.edit', 'documents.delete',
    'inbox.view', 'outbox.view', 'tracking.view', 'archive.view',
    'users.view', 'users.create', 'users.edit',
    'employees.view', 'employees.create', 'employees.edit',
    'offices.view', 'offices.create', 'offices.edit',
    'audit.view',
  ],
  DOCUMENT_ENCODER: [
    'dashboard.view',
    'documents.view', 'documents.create', 'documents.edit',
    'outbox.view',
  ],
  DOCUMENT_OFFICER: [
    'dashboard.view',
    'documents.view', 'documents.receive',
    'inbox.view',
  ],
};

const ROLE_DEFINITIONS: Record<Role, { name: string; description: string }> = {
  SYSTEM_ADMIN: {
    name: 'System Administrator',
    description: 'Full system access. Manages users, offices, roles, and system configuration.',
  },
  OFFICE_ADMIN: {
    name: 'Office Administrator',
    description:
      'Manages documents within their authorized office and monitors recipient status.',
  },
  DOCUMENT_ENCODER: {
    name: 'Document Encoder',
    description:
      'Registers documents, uploads attachments, and maintains document metadata. No access to Recipient Tracking.',
  },
  DOCUMENT_OFFICER: {
    name: 'Document Officer',
    description:
      'Receives documents routed to their office and acknowledges receipt with user, office, date, and time. No access to Recipient Tracking.',
  },
};

@Injectable()
export class RolesService {
  private readonly logger = new Logger(RolesService.name);

  constructor(private readonly prisma: PrismaService) {}

  toRoleId(value: string): Role {
    const normalized = value.toLowerCase();
    const match = (Object.keys(ROLE_DEFINITIONS) as Role[]).find(
      r => r.toLowerCase() === normalized,
    );
    if (!match) {
      throw new NotFoundException(`Unknown role: ${value}`);
    }
    return match;
  }

  /**
   * Returns the effective permission set for a role. Intentionally empty sets
   * are represented by EMPTY_PERMISSION_SENTINEL and must not be replaced by
   * defaults. Roles with no rows are seeded from defaults.
   */
  async effectivePermissions(roleId: string): Promise<string[]> {
    const role = this.toRoleId(roleId);
    const rows = await this.prisma.rolePermission.findMany({
      where: { role },
      select: { permission: true },
    });

    if (rows.length > 0) {
      const perms = rows.map(r => r.permission);
      if (perms.includes(EMPTY_PERMISSION_SENTINEL)) return [];
      // Drop obsolete keys, reserved keys, and keys restricted for this role.
      return perms.filter(
        p =>
          p !== EMPTY_PERMISSION_SENTINEL &&
          PERMISSION_CATALOG.includes(p) &&
          !RESERVED_PERMISSIONS.includes(p) &&
          !isPermissionRestrictedForRole(p, role),
      );
    }

    const defaults = (DEFAULT_ROLE_PERMISSIONS[role] ?? []).filter(
      p => !RESERVED_PERMISSIONS.includes(p) && !isPermissionRestrictedForRole(p, role),
    );
    if (defaults.length > 0) {
      await this.prisma.rolePermission.createMany({
        data: defaults.map(permission => ({ role, permission })),
        skipDuplicates: true,
      });
    }
    return defaults;
  }

  async findAll(): Promise<RoleSummary[]> {
    const counts = await this.prisma.user.groupBy({
      by: ['role'],
      _count: { _all: true },
    });
    const countByRole = new Map(counts.map(c => [c.role, c._count._all]));

    return (Object.keys(ROLE_DEFINITIONS) as Role[]).map(role => ({
      id: role.toLowerCase(),
      name: ROLE_DEFINITIONS[role].name,
      description: ROLE_DEFINITIONS[role].description,
      userCount: countByRole.get(role) ?? 0,
    }));
  }

  async findOne(id: string): Promise<RoleDefinition> {
    const role = this.toRoleId(id);
    const summary = ROLE_DEFINITIONS[role];
    const userCount = await this.prisma.user.count({ where: { role } });
    return {
      id: role.toLowerCase(),
      name: summary.name,
      description: summary.description,
      permissions: await this.effectivePermissions(id),
      userCount,
    };
  }

  getCatalog() {
    const normalizeRoleMap = <T,>(obj: Record<string, T>) =>
      Object.fromEntries(Object.entries(obj).map(([k, v]) => [k.toLowerCase(), v]));

    const restricted = Object.fromEntries(
      Object.entries(ROLE_RESTRICTED_PERMISSIONS).map(([perm, roles]) => [
        perm,
        roles.map(r => r.toLowerCase()),
      ]),
    );

    return {
      permissions: PERMISSION_CATALOG.map(key => {
        const [moduleKey, action] = key.split('.');
        return { key, module: moduleKey, action };
      }),
      modules: PERMISSION_MODULES,
      reserved: RESERVED_PERMISSIONS,
      restricted,
      defaults: normalizeRoleMap(DEFAULT_ROLE_PERMISSIONS),
    };
  }

  async setPermissions(
    id: string,
    permissions: string[],
    actor?: { id: string; role: string },
  ): Promise<string[]> {
    const role = this.toRoleId(id);
    const normalized = Array.from(new Set(permissions));

    const invalid = normalized.filter(p => !PERMISSION_CATALOG.includes(p));
    if (invalid.length > 0) {
      throw new BadRequestException(`Unknown permissions: ${invalid.join(', ')}`);
    }

    const reserved = normalized.filter(p => RESERVED_PERMISSIONS.includes(p));
    if (reserved.length > 0) {
      throw new BadRequestException(
        `Reserved permissions cannot be assigned: ${reserved.join(', ')}`,
      );
    }

    const forbidden = normalized.filter(p => isPermissionRestrictedForRole(p, role));
    if (forbidden.length > 0) {
      throw new ForbiddenException(
        `${ROLE_DEFINITIONS[role].name} cannot be granted: ${forbidden.join(', ')}`,
      );
    }

    if (role === Role.SYSTEM_ADMIN) {
      const missing = DEFAULT_ROLE_PERMISSIONS[role].filter(p => !normalized.includes(p));
      if (missing.length > 0) {
        throw new ForbiddenException(
          'Cannot remove mandatory permissions from the System Administrator role.',
        );
      }
    }

    const before = await this.prisma.rolePermission.findMany({
      where: { role },
      select: { permission: true },
    });
    const prev = before
      .map(r => r.permission)
      .filter(p => p !== EMPTY_PERMISSION_SENTINEL && PERMISSION_CATALOG.includes(p));

    const toStore = normalized.length > 0 ? normalized : [EMPTY_PERMISSION_SENTINEL];

    await this.prisma.$transaction([
      this.prisma.rolePermission.deleteMany({ where: { role } }),
      this.prisma.rolePermission.createMany({
        data: toStore.map(permission => ({ role, permission })),
        skipDuplicates: true,
      }),
    ]);

    this.recordPermissionChanges(role, prev, normalized, actor);
    return normalized;
  }

  /**
   * Fire-and-forget audit rows for each granted/revoked permission. Never
   * blocks or fails the permission update itself.
   */
  private recordPermissionChanges(
    role: Role,
    prev: string[],
    next: string[],
    actor?: { id: string; role: string },
  ): void {
    if (!actor) return;
    const granted = next.filter(p => !prev.includes(p));
    const revoked = prev.filter(p => !next.includes(p));
    if (granted.length === 0 && revoked.length === 0) return;

    const entries: Prisma.AuditLogCreateManyInput[] = [
      ...granted.map(permission => ({
        actorId: actor.id,
        action: 'roles.permission-granted',
        module: 'roles',
        description: `Granted ${permission} to ${role}`,
        targetId: role.toLowerCase(),
        targetType: 'Role',
        metadata: {
          role,
          permission,
          action: 'granted',
          actorRole: actor.role,
        } as Prisma.InputJsonValue,
      })),
      ...revoked.map(permission => ({
        actorId: actor.id,
        action: 'roles.permission-revoked',
        module: 'roles',
        description: `Revoked ${permission} from ${role}`,
        targetId: role.toLowerCase(),
        targetType: 'Role',
        metadata: {
          role,
          permission,
          action: 'revoked',
          actorRole: actor.role,
        } as Prisma.InputJsonValue,
      })),
    ];

    void this.prisma.auditLog
      .createMany({ data: entries })
      .catch((err: unknown) => {
        this.logger.error(
          `Permission-change audit write failed: ${(err as Error).message}`,
        );
      });
  }

  async getRoleUsers(roleId: string): Promise<RoleUser[]> {
    const role = this.toRoleId(roleId);
    const rows = await this.prisma.user.findMany({
      where: { role },
      include: {
        employee: {
          select: {
            firstName: true,
            middleName: true,
            lastName: true,
            position: true,
            office: { select: { name: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map(u => {
      const composed = [u.employee?.firstName, u.employee?.middleName, u.employee?.lastName]
        .filter(Boolean)
        .join(' ');
      const fullName = composed || u.username || u.email || u.id;
      return {
        id: u.id,
        fullName,
        email: u.email ?? '',
        username: u.username ?? u.email ?? '',
        role: u.role.toLowerCase(),
        status: u.status.toLowerCase(),
        officeName: u.employee?.office?.name ?? null,
        position: u.employee?.position ?? null,
        createdAt: u.createdAt.toISOString(),
      };
    });
  }
}
