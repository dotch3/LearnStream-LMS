# Research: User Management

**Feature**: 002-users-management  
**Date**: 2026-04-23  
**Status**: Complete — all decisions resolved

---

## Decision 1: RolesGuard Strategy

**Decision**: Implement a `RolesGuard` in `backend/src/auth/guards/roles.guard.ts` that reads a `@Roles()` decorator metadata and compares against `req.user.role`. Export it from `AuthModule`. `UsersModule` imports `AuthModule` to consume both `JwtAuthGuard` and `RolesGuard`.

**Rationale**: NestJS guard composition is the idiomatic pattern for RBAC. Having both guards in `AuthModule` keeps auth infrastructure centralised and avoids duplicating guard logic across modules. The `@Roles()` decorator uses `SetMetadata('roles', roles)`.

**Pattern**:
```
@UseGuards(JwtAuthGuard, RolesGuard)  // on controller class
@Roles(Role.ADMIN)                     // on admin-only methods
```
When no `@Roles()` is applied, `RolesGuard` passes all authenticated users through.

**Alternatives considered**:
- Global `APP_GUARD`: Rejected — would require every endpoint to explicitly opt out. The current `JwtAuthGuard` is per-controller, so `RolesGuard` must match.
- Custom `AdminGuard` extending `AuthGuard`: Rejected — a decorator-driven `RolesGuard` is more flexible and composable for future roles.

---

## Decision 2: Self-Profile vs Admin Endpoints

**Decision**: Split the `UsersController` into two endpoint groups:
1. Admin endpoints: `GET/POST/PATCH /api/users`, `PATCH /api/users/:id`, `PATCH /api/users/:id/deactivate`, `PATCH /api/users/:id/reactivate` — protected by `@UseGuards(JwtAuthGuard, RolesGuard)` + `@Roles(Role.ADMIN)`.
2. Self-service endpoints: `PATCH /api/users/me/profile`, `PATCH /api/users/me/password` — protected by `@UseGuards(JwtAuthGuard)` only (any authenticated user).

**Rationale**: Keeping all user-related endpoints in one controller keeps the module cohesive. The `/me/*` path clearly signals "own account only" and the implementation reads `userId` from the JWT payload (not from the URL), preventing impersonation.

**Alternatives considered**:
- Separate `ProfileController`: Rejected — adds module complexity for only 2 endpoints.
- Using `PATCH /api/users/:id` for self-profile with ownership check: Rejected — conflates admin update (by ID) with self-service (by token), making permission logic complex.

---

## Decision 3: No New Prisma Migration

**Decision**: The `User` model already exists in `backend/prisma/schema.prisma` from feature 001-auth. No new migration is required for this feature.

**Rationale**: All fields required by user management (`id`, `name`, `email`, `password`, `role`, `isActive`, `createdAt`, `updatedAt`) are already present. The `Role` enum is already defined.

**Impact**: T008 in this feature's tasks skips Prisma schema changes. The migration from 001-auth (once applied to a live DB) already supports this feature.

---

## Decision 4: UpdateUserDto using PartialType

**Decision**: Use `PartialType` from `@nestjs/swagger` (not `@nestjs/mapped-types`) to create `UpdateUserDto extends PartialType(CreateUserDto)`. This makes all fields optional while preserving Swagger documentation.

**Rationale**: `@nestjs/swagger`'s `PartialType` re-applies `@ApiPropertyOptional` automatically, keeping the Swagger UI accurate. Using `@nestjs/mapped-types` would lose the Swagger decorators.

---

## Decision 5: Pagination Pattern

**Decision**: Offset pagination with `page` (default 1) and `perPage` (default 20, max 100) query params. Response shape:
```json
{
  "data": [...],
  "meta": { "total": 50, "page": 1, "perPage": 20, "totalPages": 3 }
}
```
Prisma query: `findMany({ skip: (page-1)*perPage, take: perPage, orderBy: { createdAt: 'desc' } })`.

**Rationale**: Simple offset pagination is sufficient for ~50 users (MVP scope). Cursor-based pagination is not needed at this scale.

---

## Decision 6: Email Uniqueness — Conflict Handling

**Decision**: Catch `PrismaClientKnownRequestError` with code `P2002` (unique constraint violation) in the service layer and re-throw as `ConflictException` (HTTP 409).

**Rationale**: Prisma 7 with the adapter pattern throws the same `PrismaClientKnownRequestError` errors as before. Catching `P2002` is the standard pattern. The guard handles it before it reaches the global exception filter.

**Gotcha (from 001-auth)**: Prisma 7 uses `@prisma/adapter-pg` — `PrismaClient` is instantiated with an adapter in the constructor. The `User` model is already available from `@prisma/client` after `prisma generate`.

---

## Decision 7: Self-Deactivation Prevention

**Decision**: Service-layer check: `if (adminId === targetUserId) throw new ForbiddenException('Admins cannot deactivate themselves')`. No separate guard needed.

**Rationale**: This is a single-condition business rule, not a reusable cross-cutting concern. A service check is simpler, more readable, and easier to test.

---

## Decision 8: Password Change Flow

**Decision**: `ChangePasswordDto` with `currentPassword: string` and `newPassword: string @MinLength(6)`. Service:
1. Load user with `prisma.user.findUniqueOrThrow({ where: { id: userId } })`
2. `bcrypt.compare(currentPassword, user.password)` — if false, throw `UnauthorizedException`
3. `bcrypt.hash(newPassword, 10)` (10 salt rounds per constitution)
4. `prisma.user.update({ where: { id: userId }, data: { password: hash } })`

**Rationale**: bcrypt with 10 salt rounds is mandated by the constitution (Principle I). The current password verification step prevents account takeover via session hijacking.

---

## Decision 9: UserResponseDto — Password Exclusion

**Decision**: Define a `UserResponseDto` that explicitly lists safe fields: `id`, `name`, `email`, `role`, `isActive`, `createdAt`, `updatedAt`. Never include `password` or `refreshTokens`. Use this DTO as the return type for all user endpoints.

**Rationale**: Constitution Principle I mandates passwords are never returned. Using an explicit DTO (rather than `Omit`) makes this verifiable at code review. Swagger docs will also correctly exclude the password field.

---

## TypeScript / NestJS Gotchas (from 001-auth)

1. **Module resolution**: `"module": "nodenext"` in tsconfig — use `.js` extensions or let NestJS handle it.
2. **`RolesGuard` needs `Reflector`**: Inject in constructor — same pattern as `JwtAuthGuard`.
3. **`@nestjs/swagger` `PartialType`**: Import from `@nestjs/swagger`, not `@nestjs/mapped-types`, to keep Swagger decorators.
4. **Prisma 7**: No `url` in `schema.prisma`. `PrismaService` uses `PrismaPg` adapter. Already in place.
5. **`prisma.config.ts` excluded from tsconfig**: Already configured in `backend/tsconfig.json`.
