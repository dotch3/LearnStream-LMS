# Research: Authentication (001-auth)

**Date**: 2026-04-22
**Branch**: `001-auth`
**Purpose**: Resolve all technical unknowns before design begins

---

## 1. JWT Strategy: Library Choice

**Decision**: `@nestjs/jwt` + `@nestjs/passport` + `passport-jwt`

**Rationale**: This is the official NestJS auth stack. `@nestjs/jwt` wraps `jsonwebtoken`
with DI integration. `passport-jwt` provides the strategy for validating Bearer tokens on
protected routes with minimal boilerplate. It is battle-tested and maintained by the NestJS
core team.

**Alternatives considered**:
- `jsonwebtoken` directly (no Passport): More manual guard setup; no standard strategy
  pattern for NestJS — rejected because it duplicates work the official stack handles.
- `jose` (modern JOSE library): More modern API but no NestJS integration package — adds
  manual wiring overhead. Overkill for this scope.

**Key implementation notes**:
- Two strategies needed: `JwtStrategy` (validates access token on protected routes) and
  a `RefreshStrategy` (validates refresh token on the `/auth/refresh` endpoint only).
- `JwtAuthGuard` extends `AuthGuard('jwt')` and is applied globally with a `@Public()`
  decorator for routes that don't require authentication.
- Access token payload: `{ sub: userId, email, role, iat, exp }`.

---

## 2. Refresh Token Storage: DB Hash Pattern

**Decision**: Store the SHA-256 hash of the refresh token in a `RefreshToken` table in
PostgreSQL, linked to the user. Mark tokens as consumed on use. Check for consumed tokens
to detect replay attacks.

**Rationale**: Storing the raw token in the DB is a security risk (DB breach = all sessions
compromised). Hashing with SHA-256 (fast, deterministic, sufficient for this use case)
means the DB holds only a hash — the raw token lives only in the client and in transit.

**Alternatives considered**:
- HTTP-only cookie for refresh token: Stronger CSRF protection, but requires same-domain
  setup or CORS cookie config. Adds complexity for the API-first architecture and the
  mobile/tablet scope. Rejected in favour of explicit body-based refresh matching the
  existing API contract in `docs/planning/03-backend.md`.
- Redis for token storage: Better performance for invalidation but adds an infrastructure
  dependency. Overkill for ~50 users MVP on Railway. Rejected.
- bcrypt hash for the refresh token: bcrypt is slow by design — suitable for passwords,
  not for tokens verified on every API call. SHA-256 is appropriate here.

**Replay detection flow**:
1. Client sends refresh token.
2. Server hashes it with SHA-256, queries DB for matching hash.
3. If `isConsumed = true` → replay detected → delete ALL tokens for this user → return 401.
4. If not found or expired → return 401.
5. If valid → mark as consumed, create new token pair, persist new refresh token hash.

---

## 3. Rate Limiting: `@nestjs/throttler`

**Decision**: `@nestjs/throttler` v5+ with `ThrottlerGuard` applied only to `POST /auth/login`.

**Rationale**: Official NestJS throttling package with DI integration. Supports per-route
configuration via `@Throttle()` decorator. Uses in-memory storage by default (sufficient
for single-instance MVP on Railway).

**Alternatives considered**:
- `express-rate-limit` middleware: Works but bypasses NestJS interceptor chain — not
  idiomatic for NestJS. Rejected.
- Redis-backed throttler: Required for multi-instance deployments. Not needed at MVP scale
  (~50 users, single Railway instance). Can be added later without changing the API.

**Configuration**:
```
ttl: 60 seconds (1 minute window)
limit: 5 attempts per IP per window
```
NestJS Throttler uses `X-Forwarded-For` by default; Railway sets this header correctly.

---

## 4. Password Hashing: `bcrypt`

**Decision**: `bcrypt` npm package, salt rounds = 10 (as per Constitution Principle I).

**Rationale**: Mandated by the project constitution. 10 salt rounds provides ~100ms hash
time on modern hardware — sufficient security, acceptable UX latency for login.

**Alternatives considered**: None — constitution mandates bcrypt with 10 rounds explicitly.

**Usage**:
- On user creation: `bcrypt.hash(plainPassword, 10)`
- On login: `bcrypt.compare(plainPassword, storedHash)`

---

## 5. Access Token Client Storage: In-Memory Pattern for Next.js

**Decision**: Store access token in a React Context / module-level variable (JavaScript
memory). Use an Axios interceptor (or `fetch` wrapper) to attach the token to requests and
silently refresh it before expiry.

**Rationale**: Constitution Principle I prohibits localStorage and sessionStorage. In-memory
storage means the token is lost on page refresh — acceptable because the refresh token
(sent in request body) allows seamless re-authentication.

**Pattern**:
- On login: store `{ accessToken, expiresAt }` in a React Context (`AuthContext`).
- An `axiosInstance` interceptor checks token expiry before each request. If <60s to
  expiry, calls `POST /auth/refresh` to get a new pair.
- Refresh token is stored in localStorage with short-lived persistence
  (`refreshToken` key) so it survives page refresh. **The refresh token in localStorage
  is an accepted trade-off** — it is not an access token and has server-side invalidation.
- On logout: clear AuthContext + remove `refreshToken` from localStorage.

**Alternatives considered**:
- HTTP-only cookie for both tokens: Most secure, but requires backend cookie config and
  same-domain setup. Rejected (see section 2 rationale).
- Silent refresh via hidden iframe: Legacy pattern, not needed with interceptor approach.

---

## 6. NestJS Module Structure

**Decision**: Standalone `AuthModule` with:
- `AuthController` — exposes `/auth/*` endpoints
- `AuthService` — login, refresh, logout, getProfile logic
- `JwtStrategy` — validates access tokens (Passport)
- `RefreshTokenRepository` — wraps Prisma calls for refresh token CRUD
- `AuthModule` imports `JwtModule`, `PassportModule`, `PrismaModule`, `ThrottlerModule`
- `AuthModule` exports `JwtStrategy` so other modules can use `JwtAuthGuard`

**Rationale**: Follows Constitution Principle IV — one module per domain, cross-module
communication via exported services only. `UsersModule` is NOT imported by `AuthModule`
directly; instead, `AuthService` uses `PrismaService` to look up users (since User is a
shared entity accessed via Prisma, not via a UsersService that doesn't exist yet).

---

## 7. Swagger / OpenAPI Documentation

**Decision**: Use `@nestjs/swagger` decorators on all DTOs and controller methods.

**Key decorators**:
- `@ApiTags('auth')` on `AuthController`
- `@ApiOperation`, `@ApiResponse` on each endpoint
- `@ApiProperty` on all DTO fields
- `@ApiBearerAuth()` on protected endpoints

**Setup**: `SwaggerModule.setup('api', app, document)` in `main.ts` — the Swagger UI
will be available at `/api` in development.

---

## 8. Deactivated User Check

**Decision**: Check `isActive` field on the User record during login and during refresh
token validation.

**Implementation**:
- `AuthService.login()`: After verifying password, check `user.isActive`. If false, throw
  `UnauthorizedException` (same generic message as wrong password — Constitution Principle II).
- `RefreshStrategy.validate()`: After finding the refresh token, load the linked user and
  check `isActive`. If false, invalidate the token and throw `UnauthorizedException`.

---

## 9. Testing Strategy

**Decision**: Jest + `@nestjs/testing` for unit and integration tests.

**Scope for this feature**:
- Unit tests: `AuthService` methods (mock Prisma, mock JwtService)
- Integration/E2E tests: `AuthController` endpoints with a real test DB (SQLite in-memory
  via Prisma or a dedicated test PostgreSQL instance)

**Key test cases** (mapped from spec acceptance scenarios):
- Login success → tokens issued
- Login wrong password → 401, generic message
- Login unknown email → 401, same generic message
- Login deactivated → 401, same generic message
- Login rate limit → 429 after 5 attempts
- Refresh valid → new token pair, old invalidated
- Refresh replay → all sessions invalidated, 401
- Refresh expired → 401
- Logout → all refresh tokens invalidated
- Refresh after logout → 401
- Profile with valid token → user data returned
- Profile with expired token → 401
