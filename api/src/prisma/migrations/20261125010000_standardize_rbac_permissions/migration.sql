-- Standardize RBAC permission keys to module.action catalog.
-- Preserve valid assignments, migrate renamed keys, remove obsolete keys.

-- 1) Rename/migrate known keys.
INSERT INTO "RolePermission" ("id", "role", "permission", "createdAt")
SELECT gen_random_uuid()::text, rp."role", 'tracking.view', NOW()
FROM "RolePermission" rp
WHERE rp."permission" = 'documents.track'
  AND rp."role" IN ('SYSTEM_ADMIN', 'OFFICE_ADMIN')
ON CONFLICT ("role", "permission") DO NOTHING;

INSERT INTO "RolePermission" ("id", "role", "permission", "createdAt")
SELECT gen_random_uuid()::text, rp."role", 'documents.create', NOW()
FROM "RolePermission" rp
WHERE rp."permission" = 'documents.register'
ON CONFLICT ("role", "permission") DO NOTHING;

-- 2) Remove obsolete/unsupported keys no longer in the catalog.
DELETE FROM "RolePermission"
WHERE "permission" NOT IN (
  '__empty__',
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
  'backup.view', 'backup.create', 'backup.restore'
);

-- 3) Remove reserved keys from all roles (not operational yet).
DELETE FROM "RolePermission"
WHERE "permission" IN ('roles.create', 'roles.delete', 'backup.view', 'backup.create', 'backup.restore');

-- 4) Remove role-restricted keys from roles not allowed to hold them.
DELETE FROM "RolePermission"
WHERE ("permission" = 'tracking.view' AND "role" NOT IN ('SYSTEM_ADMIN', 'OFFICE_ADMIN'))
   OR ("permission" = 'archive.view' AND "role" NOT IN ('SYSTEM_ADMIN', 'OFFICE_ADMIN'))
   OR ("permission" = 'audit.view' AND "role" NOT IN ('SYSTEM_ADMIN', 'OFFICE_ADMIN'))
   OR ("permission" = 'documents.delete' AND "role" NOT IN ('SYSTEM_ADMIN', 'OFFICE_ADMIN'))
   OR ("permission" = 'documents.receive' AND "role" NOT IN ('SYSTEM_ADMIN', 'DOCUMENT_OFFICER'))
   OR ("permission" = 'inbox.view' AND "role" NOT IN ('SYSTEM_ADMIN', 'OFFICE_ADMIN', 'DOCUMENT_OFFICER'))
   OR ("permission" = 'outbox.view' AND "role" NOT IN ('SYSTEM_ADMIN', 'OFFICE_ADMIN', 'DOCUMENT_ENCODER'))
   OR ("permission" = 'users.view' AND "role" NOT IN ('SYSTEM_ADMIN', 'OFFICE_ADMIN'))
   OR ("permission" = 'users.create' AND "role" NOT IN ('SYSTEM_ADMIN', 'OFFICE_ADMIN'))
   OR ("permission" = 'users.edit' AND "role" NOT IN ('SYSTEM_ADMIN', 'OFFICE_ADMIN'))
   OR ("permission" = 'users.delete' AND "role" NOT IN ('SYSTEM_ADMIN'))
   OR ("permission" = 'employees.view' AND "role" NOT IN ('SYSTEM_ADMIN', 'OFFICE_ADMIN'))
   OR ("permission" = 'employees.create' AND "role" NOT IN ('SYSTEM_ADMIN', 'OFFICE_ADMIN'))
   OR ("permission" = 'employees.edit' AND "role" NOT IN ('SYSTEM_ADMIN', 'OFFICE_ADMIN'))
   OR ("permission" = 'employees.delete' AND "role" NOT IN ('SYSTEM_ADMIN'))
   OR ("permission" = 'offices.view' AND "role" NOT IN ('SYSTEM_ADMIN', 'OFFICE_ADMIN'))
   OR ("permission" = 'offices.create' AND "role" NOT IN ('SYSTEM_ADMIN', 'OFFICE_ADMIN'))
   OR ("permission" = 'offices.edit' AND "role" NOT IN ('SYSTEM_ADMIN', 'OFFICE_ADMIN'))
   OR ("permission" = 'offices.delete' AND "role" NOT IN ('SYSTEM_ADMIN'))
   OR ("permission" = 'roles.view' AND "role" NOT IN ('SYSTEM_ADMIN'))
   OR ("permission" = 'roles.edit' AND "role" NOT IN ('SYSTEM_ADMIN'))
   OR ("permission" = 'permissions.view' AND "role" NOT IN ('SYSTEM_ADMIN'))
   OR ("permission" = 'permissions.assign' AND "role" NOT IN ('SYSTEM_ADMIN'))
   OR ("permission" = 'settings.view' AND "role" NOT IN ('SYSTEM_ADMIN'))
   OR ("permission" = 'settings.edit' AND "role" NOT IN ('SYSTEM_ADMIN'));

-- 5) Seed full defaults for roles with no rows (never configured).
INSERT INTO "RolePermission" ("id", "role", "permission", "createdAt")
SELECT gen_random_uuid()::text, seed.role, seed.permission, NOW()
FROM (VALUES
  ('SYSTEM_ADMIN'::"Role", 'dashboard.view'),
  ('SYSTEM_ADMIN'::"Role", 'documents.view'),
  ('SYSTEM_ADMIN'::"Role", 'documents.create'),
  ('SYSTEM_ADMIN'::"Role", 'documents.edit'),
  ('SYSTEM_ADMIN'::"Role", 'documents.delete'),
  ('SYSTEM_ADMIN'::"Role", 'documents.receive'),
  ('SYSTEM_ADMIN'::"Role", 'inbox.view'),
  ('SYSTEM_ADMIN'::"Role", 'outbox.view'),
  ('SYSTEM_ADMIN'::"Role", 'tracking.view'),
  ('SYSTEM_ADMIN'::"Role", 'archive.view'),
  ('SYSTEM_ADMIN'::"Role", 'users.view'),
  ('SYSTEM_ADMIN'::"Role", 'users.create'),
  ('SYSTEM_ADMIN'::"Role", 'users.edit'),
  ('SYSTEM_ADMIN'::"Role", 'users.delete'),
  ('SYSTEM_ADMIN'::"Role", 'employees.view'),
  ('SYSTEM_ADMIN'::"Role", 'employees.create'),
  ('SYSTEM_ADMIN'::"Role", 'employees.edit'),
  ('SYSTEM_ADMIN'::"Role", 'employees.delete'),
  ('SYSTEM_ADMIN'::"Role", 'offices.view'),
  ('SYSTEM_ADMIN'::"Role", 'offices.create'),
  ('SYSTEM_ADMIN'::"Role", 'offices.edit'),
  ('SYSTEM_ADMIN'::"Role", 'offices.delete'),
  ('SYSTEM_ADMIN'::"Role", 'roles.view'),
  ('SYSTEM_ADMIN'::"Role", 'roles.edit'),
  ('SYSTEM_ADMIN'::"Role", 'permissions.view'),
  ('SYSTEM_ADMIN'::"Role", 'permissions.assign'),
  ('SYSTEM_ADMIN'::"Role", 'settings.view'),
  ('SYSTEM_ADMIN'::"Role", 'settings.edit'),
  ('SYSTEM_ADMIN'::"Role", 'audit.view'),
  ('OFFICE_ADMIN'::"Role", 'dashboard.view'),
  ('OFFICE_ADMIN'::"Role", 'documents.view'),
  ('OFFICE_ADMIN'::"Role", 'documents.edit'),
  ('OFFICE_ADMIN'::"Role", 'documents.delete'),
  ('OFFICE_ADMIN'::"Role", 'inbox.view'),
  ('OFFICE_ADMIN'::"Role", 'outbox.view'),
  ('OFFICE_ADMIN'::"Role", 'tracking.view'),
  ('OFFICE_ADMIN'::"Role", 'archive.view'),
  ('OFFICE_ADMIN'::"Role", 'users.view'),
  ('OFFICE_ADMIN'::"Role", 'users.create'),
  ('OFFICE_ADMIN'::"Role", 'users.edit'),
  ('OFFICE_ADMIN'::"Role", 'employees.view'),
  ('OFFICE_ADMIN'::"Role", 'employees.create'),
  ('OFFICE_ADMIN'::"Role", 'employees.edit'),
  ('OFFICE_ADMIN'::"Role", 'offices.view'),
  ('OFFICE_ADMIN'::"Role", 'offices.create'),
  ('OFFICE_ADMIN'::"Role", 'offices.edit'),
  ('OFFICE_ADMIN'::"Role", 'audit.view'),
  ('DOCUMENT_ENCODER'::"Role", 'dashboard.view'),
  ('DOCUMENT_ENCODER'::"Role", 'documents.view'),
  ('DOCUMENT_ENCODER'::"Role", 'documents.create'),
  ('DOCUMENT_ENCODER'::"Role", 'documents.edit'),
  ('DOCUMENT_ENCODER'::"Role", 'outbox.view'),
  ('DOCUMENT_OFFICER'::"Role", 'dashboard.view'),
  ('DOCUMENT_OFFICER'::"Role", 'documents.view'),
  ('DOCUMENT_OFFICER'::"Role", 'documents.receive'),
  ('DOCUMENT_OFFICER'::"Role", 'inbox.view')
) AS seed(role, permission)
WHERE NOT EXISTS (
  SELECT 1 FROM "RolePermission" rp WHERE rp."role" = seed.role
)
ON CONFLICT ("role", "permission") DO NOTHING;

-- 6) For configured roles, ensure newly introduced module keys are present where
-- the role default allows them and the module had no prior representation.
-- This preserves custom revocations of existing keys.
INSERT INTO "RolePermission" ("id", "role", "permission", "createdAt")
SELECT gen_random_uuid()::text, r.role, r.permission, NOW()
FROM (VALUES
  ('SYSTEM_ADMIN'::"Role", 'inbox.view'),
  ('SYSTEM_ADMIN'::"Role", 'outbox.view'),
  ('SYSTEM_ADMIN'::"Role", 'tracking.view'),
  ('SYSTEM_ADMIN'::"Role", 'archive.view'),
  ('SYSTEM_ADMIN'::"Role", 'employees.view'),
  ('SYSTEM_ADMIN'::"Role", 'employees.create'),
  ('SYSTEM_ADMIN'::"Role", 'employees.edit'),
  ('SYSTEM_ADMIN'::"Role", 'employees.delete'),
  ('SYSTEM_ADMIN'::"Role", 'permissions.view'),
  ('SYSTEM_ADMIN'::"Role", 'permissions.assign'),
  ('OFFICE_ADMIN'::"Role", 'inbox.view'),
  ('OFFICE_ADMIN'::"Role", 'outbox.view'),
  ('OFFICE_ADMIN'::"Role", 'tracking.view'),
  ('OFFICE_ADMIN'::"Role", 'archive.view'),
  ('OFFICE_ADMIN'::"Role", 'employees.view'),
  ('OFFICE_ADMIN'::"Role", 'employees.create'),
  ('OFFICE_ADMIN'::"Role", 'employees.edit'),
  ('DOCUMENT_ENCODER'::"Role", 'outbox.view'),
  ('DOCUMENT_OFFICER'::"Role", 'inbox.view')
) AS r(role, permission)
WHERE EXISTS (SELECT 1 FROM "RolePermission" rp WHERE rp."role" = r.role AND rp."permission" <> '__empty__')
  AND NOT EXISTS (SELECT 1 FROM "RolePermission" rp2 WHERE rp2."role" = r.role AND rp2."permission" = r.permission)
ON CONFLICT ("role", "permission") DO NOTHING;

-- 7) SYSTEM_ADMIN must retain all non-reserved defaults.
INSERT INTO "RolePermission" ("id", "role", "permission", "createdAt")
SELECT gen_random_uuid()::text, 'SYSTEM_ADMIN'::"Role", p.permission, NOW()
FROM (VALUES
  ('dashboard.view'), ('documents.view'), ('documents.create'), ('documents.edit'), ('documents.delete'), ('documents.receive'),
  ('inbox.view'), ('outbox.view'), ('tracking.view'), ('archive.view'),
  ('users.view'), ('users.create'), ('users.edit'), ('users.delete'),
  ('employees.view'), ('employees.create'), ('employees.edit'), ('employees.delete'),
  ('offices.view'), ('offices.create'), ('offices.edit'), ('offices.delete'),
  ('roles.view'), ('roles.edit'), ('permissions.view'), ('permissions.assign'),
  ('settings.view'), ('settings.edit'), ('audit.view')
) AS p(permission)
WHERE NOT EXISTS (
  SELECT 1 FROM "RolePermission" rp WHERE rp."role" = 'SYSTEM_ADMIN' AND rp."permission" = '__empty__'
)
ON CONFLICT ("role", "permission") DO NOTHING;
