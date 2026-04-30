# Data Model: Authentication (001-auth)

**Date**: 2026-04-22
**Branch**: `001-auth`

---

## Entities

### User

Represents an authenticated actor in the system. Created only by admins — no self-registration.

| Field | Type | Constraints | Notes |
|-------|------|-------------|-------|
| `id` | `String` (UUID) | PK, auto-generated | `@default(uuid())` |
| `name` | `String` | Required, non-empty | Display name |
| `email` | `String` | Required, unique, valid email | Used as login identifier |
| `password` | `String` | Required, bcrypt hash | Never returned in API responses |
| `role` | `Role` (enum) | Required, default `VIEWER` | `ADMIN` or `VIEWER` |
| `isActive` | `Boolean` | Required, default `true` | Soft-delete flag |
| `createdAt` | `DateTime` | Auto, `@default(now())` | Creation timestamp |
| `updatedAt` | `DateTime` | Auto, `@updatedAt` | Last update timestamp |

**Relations**:
- `User` has many `RefreshToken` records (one per active session/device)

**Validation rules**:
- `email` must pass standard email format validation
- `password` minimum 6 characters (enforced at DTO level before hashing)
- `role` must be one of `ADMIN`, `VIEWER`
- `isActive = false` blocks login and refresh — no hard deletes permitted

**State transitions**:
```
isActive: true  ──(admin deactivates)──▶  isActive: false
isActive: false ──(admin reactivates)──▶  isActive: true  [future feature]
```

---

### RefreshToken

Server-side record of an issued refresh token. Used to enforce rotation and detect replay attacks.

| Field | Type | Constraints | Notes |
|-------|------|-------------|-------|
| `id` | `String` (UUID) | PK, auto-generated | `@default(uuid())` |
| `tokenHash` | `String` | Required, unique | SHA-256 hash of the raw token |
| `userId` | `String` | FK → `User.id`, required | Owning user |
| `isConsumed` | `Boolean` | Required, default `false` | `true` after first use |
| `expiresAt` | `DateTime` | Required | 7 days after issuance |
| `createdAt` | `DateTime` | Auto, `@default(now())` | Issuance timestamp |

**Relations**:
- `RefreshToken` belongs to one `User`
- `User` has many `RefreshToken` records

**Validation rules**:
- `tokenHash` must be unique (prevents duplicate token records)
- `expiresAt` must be in the future to be considered valid
- Once `isConsumed = true`, the token can never be used again

**State transitions**:
```
isConsumed: false ──(token exchanged)──▶  isConsumed: true  [terminal state]
```

**Cascade behaviour**:
- On `User` delete (if ever permitted): cascade delete all `RefreshToken` records
- On logout: all `RefreshToken` records for the user are deleted (not just marked)
- On replay attack: all `RefreshToken` records for the user are deleted

---

### Role (Enum)

```
ADMIN   — Full access: create users, manage tracks/videos, view reports
VIEWER  — Read-only access: watch videos, track progress, download own certificates
```

---

## Prisma Schema (this feature)

```prisma
enum Role {
  ADMIN
  VIEWER
}

model User {
  id            String         @id @default(uuid())
  name          String
  email         String         @unique
  password      String
  role          Role           @default(VIEWER)
  isActive      Boolean        @default(true)
  createdAt     DateTime       @default(now())
  updatedAt     DateTime       @updatedAt
  refreshTokens RefreshToken[]
}

model RefreshToken {
  id          String   @id @default(uuid())
  tokenHash   String   @unique
  userId      String
  isConsumed  Boolean  @default(false)
  expiresAt   DateTime
  createdAt   DateTime @default(now())
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)
}
```

---

## Access Token Payload (JWT — not persisted)

The access token is a signed JWT. Its payload is not stored in the database.

```typescript
interface JwtPayload {
  sub: string;    // User.id
  email: string;  // User.email
  role: Role;     // User.role
  iat: number;    // Issued at (auto by JWT library)
  exp: number;    // Expiry: iat + 15 minutes (auto by JWT library)
}
```

---

## Entity Relationship

```
User (1) ──────────────── (N) RefreshToken
  id ◄───────────────────── userId
  isActive (blocks refresh if false)
  role (embedded in access token JWT)
```
