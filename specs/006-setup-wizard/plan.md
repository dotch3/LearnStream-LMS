# Implementation Plan: First-Run Setup Wizard

**Branch**: `006-setup-wizard` | **Date**: 2026-04-24 | **Spec**: [spec.md](./spec.md)

---

## Summary

Add a one-time first-run setup wizard that detects when no ADMIN user exists and gates the entire platform behind a `/setup` page. A `SetupModule` exposes two public endpoints (`GET /api/setup/status` and `POST /api/setup/admin`), both locked to 404 once setup is complete. A Next.js middleware redirects all traffic to `/setup` when setup is incomplete, and to `/login` when it is done. The `/setup` page renders the admin creation form.

---

## Technical Context

**Language/Version**: TypeScript 5.x / Node.js 20 LTS
**Primary Dependencies**: NestJS (existing), Prisma 7 (existing), bcrypt (existing in auth module), class-validator, @nestjs/swagger (existing)
**Storage**: PostgreSQL — no new tables; setup state derived from `User.role = ADMIN` count
**Testing**: Manual via quickstart.md
**Target Platform**: Railway (backend) + Vercel (frontend)
**Project Type**: Web service (NestJS REST API + Next.js frontend)
**Performance Goals**: Setup status check < 100ms (single COUNT query)
**Constraints**: Endpoints return 404 once admin exists; no new DB migration required
**Scale/Scope**: One-time operation per deployment

---

## Constitution Check

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Security-First | ✅ PASS | Setup endpoints are @Public() but return 404 once admin exists; password hashed with bcrypt 10 rounds before storage |
| II. Role-Based Access Control | ✅ PASS | Created account gets role=ADMIN; endpoints locked immediately after first admin is created |
| III. Data Integrity | ✅ PASS | No progress or certificate data involved; user record identical to normal admin creation |
| IV. Modular Architecture | ✅ PASS | New `SetupModule` domain; uses PrismaService directly — no cross-module service imports |
| V. API-First with Swagger | ✅ PASS | Both endpoints documented with @ApiOperation, @ApiResponse; DTOs validated with class-validator |

---

## Project Structure

### Documentation (this feature)

```text
specs/006-setup-wizard/
├── plan.md
├── spec.md
├── contracts/
│   └── setup-api.md
├── quickstart.md
└── tasks.md
```

### Source Code

```text
backend/
└── src/
    ├── setup/
    │   ├── setup.module.ts
    │   ├── setup.service.ts
    │   ├── setup.controller.ts
    │   └── dto/
    │       └── create-admin.dto.ts
    └── app.module.ts               # Register SetupModule

frontend/
└── src/
    ├── middleware.ts               # NEW: Next.js Edge middleware for setup/auth redirect
    └── app/
        └── setup/
            └── page.tsx            # NEW: Setup wizard UI (admin creation form)
```

---

## Implementation Details

### 1. Backend — SetupService

```typescript
async isSetupComplete(): Promise<boolean> {
  const count = await this.prisma.user.count({ where: { role: Role.ADMIN } });
  return count > 0;
}

async createAdmin(dto: CreateAdminDto): Promise<void> {
  if (await this.isSetupComplete()) throw new NotFoundException();
  const hashed = await bcrypt.hash(dto.password, 10);
  await this.prisma.user.create({
    data: { name: dto.name, email: dto.email, password: hashed, role: Role.ADMIN },
  });
}
```

### 2. Backend — SetupController

| Method | Path | Auth | Response |
|--------|------|------|----------|
| GET | `/api/setup/status` | @Public() | `{ isSetupComplete: boolean }` |
| POST | `/api/setup/admin` | @Public() | 201 Created / 404 if already done |

Both endpoints are decorated with `@Public()` to bypass `JwtAuthGuard`. On POST, if `isSetupComplete()` is true, throw `NotFoundException` immediately.

### 3. Frontend — Next.js Middleware (`src/middleware.ts`)

Runs at the Edge on every navigation request. Calls `GET /api/setup/status` (backend URL from env). Logic:

- If `!isSetupComplete` and pathname ≠ `/setup` → redirect to `/setup`
- If `isSetupComplete` and pathname === `/setup` → redirect to `/login`
- Otherwise → pass through (existing auth guards handle the rest)

```typescript
export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api).*)'],
};
```

### 4. Frontend — `/setup/page.tsx`

Client component. Form fields: Full Name, Email, Password (min 8 chars), Confirm Password. On submit → `POST /api/setup/admin`. On success → `router.push('/login?setup=done')`. Login page reads `?setup=done` and shows a success banner: "Setup complete — please log in with your admin account."

### 5. CreateAdminDto

```typescript
class CreateAdminDto {
  @IsString() @IsNotEmpty() name: string;
  @IsEmail()                email: string;
  @IsString() @MinLength(8) password: string;
}
```

---

## No New Migration Required

The `User` table already exists with the `role` field. Setup is purely an application-layer check on existing data — no schema changes needed.
