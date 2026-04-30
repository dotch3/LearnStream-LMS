# Data Model: User Management

**Feature**: 002-users-management  
**Date**: 2026-04-23

---

## Entities

### User *(already exists — no migration required)*

The `User` model was created in feature 001-auth. No schema changes are needed.

| Field | Type | Constraints | Notes |
|-------|------|-------------|-------|
| id | String (UUID) | PK, auto-generated | `@default(uuid())` |
| name | String | required | Display name, min 2 chars |
| email | String | unique, required | Case-insensitive uniqueness |
| password | String | required | bcrypt hash, never returned in responses |
| role | Role enum | required, default VIEWER | `ADMIN` or `VIEWER` |
| isActive | Boolean | required, default true | `false` = soft-deleted, cannot login |
| createdAt | DateTime | auto-set | `@default(now())` |
| updatedAt | DateTime | auto-updated | `@updatedAt` |

**Prisma schema location**: `backend/prisma/schema.prisma` (already defined)

---

## State Transitions

### User Active Status

```
ACTIVE (isActive=true)
  │
  ├── [Admin deactivates] ──→ INACTIVE (isActive=false)
  │                              │
  │                              ├── [Admin reactivates] ──→ ACTIVE
  │                              └── [Login attempt] ──→ 401 Unauthorized
  │
  └── [Cannot deactivate self] ──→ 403 Forbidden
```

### User Role

```
VIEWER (default on creation)
  ↕ [Admin updates role]
ADMIN
```

Role change takes effect on next login (current access token retains old role until expiry).

---

## DTOs (not persisted — transfer layer)

### CreateUserDto
```
email      : string  @IsEmail()
password   : string  @IsString() @MinLength(6)
name       : string  @IsString() @MinLength(2)
role?      : Role    @IsEnum(Role) @IsOptional() — default VIEWER
```

### UpdateUserDto (PartialType of CreateUserDto, no password)
```
name?      : string  @IsString() @MinLength(2) @IsOptional()
email?     : string  @IsEmail() @IsOptional()
role?      : Role    @IsEnum(Role) @IsOptional()
isActive?  : boolean @IsBoolean() @IsOptional()
```

### UpdateProfileDto (self-service, name only)
```
name       : string  @IsString() @MinLength(2)
```

### ChangePasswordDto
```
currentPassword : string  @IsString()
newPassword     : string  @IsString() @MinLength(6)
```

### UserResponseDto (safe fields — never includes password)
```
id         : string
name       : string
email      : string
role       : Role
isActive   : boolean
createdAt  : Date
updatedAt  : Date
```

### UsersListResponseDto
```
data       : UserResponseDto[]
meta       : { total: number, page: number, perPage: number, totalPages: number }
```

---

## No New Relations

This feature does not introduce new entity relationships. The `User` model's existing relations (`refreshTokens`, `progress`, `certificates`) are unchanged and not exposed by the users module.
