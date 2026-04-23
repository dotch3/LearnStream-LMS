# Implementation Plan: User Management

**Branch**: `002-users-management` | **Date**: 2026-04-23 | **Spec**: [spec.md](spec.md)  
**Input**: Feature specification from `/specs/002-users-management/spec.md`

## Summary

Add a `UsersModule` to the NestJS backend that allows ADMINs to create, list, view, update, deactivate, and reactivate user accounts, plus self-service endpoints for any authenticated user to update their own name and change their own password. A new `RolesGuard` and `@Roles()` decorator are introduced to enforce ADMIN-only access. No Prisma migration is needed — the `User` model already exists from feature 001-auth.

## Technical Context

**Language/Version**: TypeScript 5.x / Node.js 20 LTS  
**Primary Dependencies**: NestJS (existing), `bcrypt` (existing), `class-validator` + `class-transformer` (existing), `@nestjs/swagger` (existing), Prisma 7 + `@prisma/adapter-pg` (existing)  
**Storage**: PostgreSQL via Prisma ORM — `User` table already exists  
**Testing**: Not requested  
**Target Platform**: Linux server (Railway)  
**Project Type**: NestJS module (`users`) within existing monorepo  
**Performance Goals**: User list loads in < 2s for up to 200 users  
**Constraints**: bcrypt 10 salt rounds (constitution), password never in response, soft delete only, ADMIN cannot deactivate self  
**Scale/Scope**: ~50 users (MVP), ~8 endpoints

## Constitution Check

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Security-First | ✅ PASS | bcrypt 10 rounds on create/password-change; password excluded from all responses; `currentPassword` verified before change |
| II. RBAC | ✅ PASS | `RolesGuard` + `@Roles(Role.ADMIN)` on all admin endpoints; 403 for VIEWER; self-deactivation blocked server-side |
| III. Data Integrity | ✅ PASS | No progress logic in this module |
| IV. Modular Architecture | ✅ PASS | New `users` module communicates with `PrismaModule` only (already global); no direct cross-module imports |
| V. API-First + Swagger | ✅ PASS | All DTOs with `@ApiProperty`, all endpoints with `@ApiTags`, `@ApiOperation`, `@ApiResponse` |

**No violations — proceed to implementation.**

## Project Structure

### Documentation (this feature)

```text
specs/002-users-management/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── users-api.md
└── tasks.md
```

### Source Code

```text
backend/src/
├── auth/
│   ├── decorators/
│   │   ├── public.decorator.ts       (existing)
│   │   └── roles.decorator.ts        (NEW)
│   └── guards/
│       ├── jwt-auth.guard.ts         (existing)
│       ├── refresh-auth.guard.ts     (existing)
│       └── roles.guard.ts            (NEW)
├── users/
│   ├── users.module.ts               (NEW)
│   ├── users.controller.ts           (NEW)
│   ├── users.service.ts              (NEW)
│   └── dto/
│       ├── create-user.dto.ts        (NEW)
│       ├── update-user.dto.ts        (NEW)
│       ├── update-profile.dto.ts     (NEW)
│       ├── change-password.dto.ts    (NEW)
│       └── user-response.dto.ts      (NEW)
└── app.module.ts                     (UPDATE — import UsersModule)

frontend/src/
├── app/
│   └── admin/
│       └── users/
│           ├── page.tsx              (NEW — user list)
│           ├── new/
│           │   └── page.tsx          (NEW — create user form)
│           └── [id]/
│               └── page.tsx          (NEW — edit user)
└── app/
    └── dashboard/
        └── profile/
            └── page.tsx              (NEW — self profile + password)
```

**Structure Decision**: Web application (backend + frontend). Backend adds a `users/` module. Frontend adds admin user management pages and a self-profile page. Auth infrastructure (guards/decorators) stays in the `auth/` directory per modular architecture principle.

## Key Implementation Notes

1. **RolesGuard placement**: `backend/src/auth/guards/roles.guard.ts` — exported from `AuthModule`. `UsersModule` imports `AuthModule` to get both `JwtAuthGuard` and `RolesGuard`.

2. **No Prisma migration**: `User` model + `Role` enum already in schema from 001-auth. Skip migration step.

3. **PartialType import**: Use `PartialType` from `@nestjs/swagger` (not `@nestjs/mapped-types`) to preserve Swagger decorators on `UpdateUserDto`.

4. **Conflict (P2002) handling**: Catch `PrismaClientKnownRequestError` with `code === 'P2002'` in service, re-throw as `ConflictException`.

5. **Self-deactivation check**: Service layer only — `if (requestingUserId === targetUserId) throw new ForbiddenException(...)`.

6. **`/me/*` route ordering**: Define `/me/profile` and `/me/password` routes BEFORE `/:id` to prevent Express matching `me` as an ID parameter.

7. **Password exclusion**: `UserResponseDto` is an explicit class with only safe fields — never use Prisma result directly as response.

8. **Frontend note**: The frontend pages depend on the backend being fully implemented first. They are P2 compared to the backend endpoints (P1).
