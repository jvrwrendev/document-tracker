# DMS Backend

NestJS 10 + Prisma 5 + PostgreSQL backend for the Document Management System.

## Stack

- **Framework**: NestJS 10 (Express)
- **ORM**: Prisma 5 (PostgreSQL, database `dms-city`)
- **Auth**: Passport JWT (access 10 min, refresh 7 d) + HttpOnly cookies + double-submit CSRF
- **Hashing**: argon2id
- **Security**: helmet, throttler, class-validator, role-based guards
- **Storage**: S3-compatible (AWS S3, MinIO, Cloudflare R2)
- **Notifications**: DB + Server-Sent Events

## Quick Start

```bash
# 1. Install
npm install

# 2. Configure environment
cp .env.example .env
# Edit .env (DATABASE_URL, JWT_*, S3_*, etc.)

# 3. Generate Prisma client + run migrations
npm run prisma:generate
npm run prisma:migrate -- --name init

# 4. Seed (optional)
npm run seed

# 5. Run
npm run start:dev
```

The API is served on `http://localhost:3000`.

## Scripts

| Script | Purpose |
|---|---|
| `npm run start:dev` | Dev server with watch |
| `npm run build` | Compile to `dist/` |
| `npm run start:prod` | Run compiled output |
| `npm run lint` | ESLint with auto-fix |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run prisma:generate` | Generate Prisma client |
| `npm run prisma:migrate` | Create + apply migration in dev |
| `npm run prisma:deploy` | Apply migrations in CI/prod |
| `npm run prisma:studio` | Open Prisma Studio |
| `npm run prisma:validate` | Validate `schema.prisma` |

## Auth Flow

1. `POST /auth/login` → sets `dms_at` (10 m), `dms_rt` (7 d, Path=/auth), `dms_csrf` cookies.
2. Subsequent requests: browser sends `dms_at` automatically; protected routes also require `X-XSRF-TOKEN` header matching `dms_csrf` cookie value.
3. `POST /auth/refresh` reissues the access token and extends the current session without rotating its ID or refresh token, so other tabs and in-flight requests remain valid.
4. `POST /auth/logout` revokes the current refresh session and clears cookies.

## Modules

```
auth, users, roles, offices, employees,
documents, document-types, document-attachments,
document-routing, document-review, document-release,
document-tracking, document-archive,
notifications, audit-logs
```

See `src/modules/<name>/` for module/controller/service + `dto/` per module.

## Document Workflow

```
REGISTERED → RECEIVED → ROUTED → UNDER_REVIEW →
  RECOMMENDED → APPROVED → RELEASED → ARCHIVED
```

Side branches: `RETURNED`, `REJECTED` from any review stage.

> **Frontend note**: the API uses `routed` for the "In Routing" status. Frontend
> should remap `in_routing` ↔ `routed` at the integration boundary.
>
> **Roles note**: API uses `system_admin` for the "Admin" role to match the existing
> frontend type. See `src/common/constants/roles.constants.ts`.
