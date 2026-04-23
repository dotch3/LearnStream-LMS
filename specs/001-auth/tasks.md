# Tasks: Authentication

**Input**: Design documents from `/specs/001-auth/`
**Prerequisites**: plan.md ✅ · spec.md ✅ · data-model.md ✅ · contracts/auth-api.md ✅ · research.md ✅

**Tests**: Not requested in spec — no test tasks generated.

**Organization**: Tasks grouped by user story (US1 → US4) to enable independent delivery.

## Format: `[ID] [P?] [Story?] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1–US4)

---

## Phase 1: Setup

**Purpose**: Scaffold backend and frontend projects with all dependencies.

- [x] T001 Initialize NestJS backend project with TypeScript strict mode in `backend/`
- [x] T002 Initialize Next.js 14 frontend project with TypeScript and App Router in `frontend/`
- [x] T003 [P] Install backend dependencies: `@nestjs/jwt @nestjs/passport passport passport-jwt bcrypt @nestjs/throttler @nestjs/swagger class-validator class-transformer @prisma/client prisma` in `backend/`
- [x] T004 [P] Install frontend dependencies: `axios` in `frontend/`
- [x] T005 [P] Create `backend/.env` with `DATABASE_URL`, `JWT_SECRET`, `JWT_ACCESS_EXPIRES_IN=15m`, `JWT_REFRESH_EXPIRES_IN=7d`
- [x] T006 [P] Configure ESLint and Prettier for backend in `backend/.eslintrc.js` and `backend/.prettierrc`
- [x] T007 [P] Configure ESLint and Prettier for frontend in `frontend/.eslintrc.js` and `frontend/.prettierrc`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Database schema, Prisma setup, and core NestJS infrastructure that every user story depends on.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [x] T008 Create Prisma schema with `Role` enum, `User` model, and `RefreshToken` model in `backend/prisma/schema.prisma`
- [x] T009 Run initial Prisma migration to create `User` and `RefreshToken` tables: `prisma migrate dev --name init-auth` in `backend/`
- [x] T010 Create `PrismaService` (extends `PrismaClient`, handles `onModuleInit`) in `backend/src/prisma/prisma.service.ts`
- [x] T011 Create `PrismaModule` (exports `PrismaService` as global) in `backend/src/prisma/prisma.module.ts`
- [x] T012 [P] Configure `main.ts` with global `ValidationPipe`, `ThrottlerModule.forRoot` registration, CORS restricted to frontend domain, and Swagger setup at `/api` in `backend/src/main.ts`
- [x] T013 [P] Create `JwtPayload` interface (`sub`, `email`, `role`, `iat`, `exp`) in `backend/src/auth/types/jwt-payload.interface.ts`
- [x] T014 [P] Create `AppModule` importing `PrismaModule`, `ThrottlerModule`, and `AuthModule` in `backend/src/app.module.ts`

**Checkpoint**: Prisma connected, `PrismaService` injectable, NestJS app boots with Swagger at `/api`.

---

## Phase 3: User Story 1 — Secure Login (Priority: P1) 🎯 MVP

**Goal**: A user can authenticate with email/password and receive a JWT access token + refresh token. Rate limiting, deactivated account blocking, and generic error messages are enforced.

**Independent Test**: Run Scenarios 1–4 from `specs/001-auth/quickstart.md` manually.

- [x] T015 [P] [US1] Create `LoginDto` (`email: @IsEmail()`, `password: @IsString() @MinLength(6)`) with `@ApiProperty` decorators in `backend/src/auth/dto/login.dto.ts`
- [x] T016 [P] [US1] Create `LoginResponseDto` (`accessToken`, `refreshToken`, `user: { id, name, email, role }`) with `@ApiProperty` decorators in `backend/src/auth/dto/login-response.dto.ts`
- [x] T017 [US1] Create `AuthService` with `login(dto: LoginDto)` method: find user by email, `bcrypt.compare`, check `isActive`, generate JWT access token (15 min), generate raw refresh token (UUID), hash with SHA-256, persist `RefreshToken` record with `expiresAt = now + 7d`, return `LoginResponseDto` in `backend/src/auth/auth.service.ts`
- [x] T018 [US1] Create `JwtStrategy` extending `PassportStrategy(Strategy)` with `secretOrKey` from env, `jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken()`, `validate(payload: JwtPayload)` returning `{ userId, email, role }` in `backend/src/auth/strategies/jwt.strategy.ts`
- [x] T019 [P] [US1] Create `JwtAuthGuard` extending `AuthGuard('jwt')` in `backend/src/auth/guards/jwt-auth.guard.ts`
- [x] T020 [P] [US1] Create `@Public()` decorator using `SetMetadata('isPublic', true)` in `backend/src/auth/decorators/public.decorator.ts`
- [x] T021 [US1] Create `AuthController` with `POST /auth/login` decorated with `@Public()`, `@Throttle({ default: { limit: 5, ttl: 60000 } })`, `@ApiTags('auth')`, `@ApiOperation`, `@ApiResponse(201)`, `@ApiResponse(401)`, `@ApiResponse(429)` in `backend/src/auth/auth.controller.ts`
- [x] T022 [US1] Create `AuthModule` importing `JwtModule.registerAsync` (secret + signOptions from ConfigService), `PassportModule`, `PrismaModule`; declaring `AuthController`, `AuthService`, `JwtStrategy`; exporting `JwtStrategy` and `JwtAuthGuard` in `backend/src/auth/auth.module.ts`

**Checkpoint**: `POST /auth/login` returns tokens for valid credentials, 401 for wrong/unknown/deactivated, 429 after 5 attempts.

---

## Phase 4: User Story 2 — Silent Token Refresh (Priority: P1)

**Goal**: Client can exchange a valid refresh token for a new token pair. Replay attack triggers full session invalidation. Deactivated user refresh is rejected.

**Independent Test**: Run Scenarios 5 and 6 from `specs/001-auth/quickstart.md` manually.

- [x] T023 [P] [US2] Create `RefreshTokenDto` (`refreshToken: @IsString()`) with `@ApiProperty` in `backend/src/auth/dto/refresh-token.dto.ts`
- [x] T024 [P] [US2] Create `RefreshResponseDto` (`accessToken`, `refreshToken`) with `@ApiProperty` in `backend/src/auth/dto/refresh-response.dto.ts`
- [x] T025 [US2] Add `refresh(dto: RefreshTokenDto)` to `AuthService`: hash incoming token with SHA-256, query DB for `RefreshToken` by hash; if not found → 401; if `isConsumed = true` → delete ALL user's RefreshTokens → 401; if expired → 401; if user `isActive = false` → delete token → 401; mark token consumed, issue new token pair, persist new RefreshToken in `backend/src/auth/auth.service.ts`
- [x] T026 [US2] Create `RefreshStrategy` extending `PassportStrategy(Strategy, 'refresh')` that extracts token from request body field `refreshToken` and calls `AuthService.validateRefreshToken()` returning user entity in `backend/src/auth/strategies/refresh.strategy.ts`
- [x] T027 [P] [US2] Create `RefreshAuthGuard` extending `AuthGuard('refresh')` in `backend/src/auth/guards/refresh-auth.guard.ts`
- [x] T028 [US2] Add `POST /auth/refresh` to `AuthController` decorated with `@Public()`, `@UseGuards(RefreshAuthGuard)`, `@ApiOperation`, `@ApiResponse(200)`, `@ApiResponse(401)` in `backend/src/auth/auth.controller.ts`
- [x] T029 [US2] Create `AuthContext` with React Context API: state `{ accessToken: string | null, expiresAt: number | null, user: User | null }`, actions `login()`, `logout()`, `setTokens()`; persist `refreshToken` to `localStorage` on login in `frontend/src/contexts/auth.context.tsx`
- [x] T030 [US2] Create axios instance with request interceptor: before each request check if `accessToken` expires in < 60s, if so call `POST /auth/refresh` to get new pair and update `AuthContext`; attach `Authorization: Bearer` header in `frontend/src/lib/axios.ts`

**Checkpoint**: Exchanging a valid refresh token returns a new pair. Reusing the old token returns 401 and invalidates all sessions.

---

## Phase 5: User Story 3 — Explicit Logout (Priority: P2)

**Goal**: Authenticated user can log out, invalidating all server-side refresh tokens. Post-logout refresh attempts are rejected.

**Independent Test**: Run Scenario 8 from `specs/001-auth/quickstart.md` manually.

- [x] T031 [US3] Add `logout(userId: string)` to `AuthService`: `prisma.refreshToken.deleteMany({ where: { userId } })` in `backend/src/auth/auth.service.ts`
- [x] T032 [US3] Add `POST /auth/logout` to `AuthController` decorated with `@UseGuards(JwtAuthGuard)`, `@ApiBearerAuth()`, `@ApiOperation`, `@ApiResponse(200)`, `@ApiResponse(401)`; extract `userId` from `@Request()` user; return `{ message: 'Logged out successfully' }` in `backend/src/auth/auth.controller.ts`
- [x] T033 [US3] Add `logout()` action to `AuthContext`: call `POST /auth/logout`, clear in-memory `accessToken` and `expiresAt`, remove `refreshToken` from `localStorage` in `frontend/src/contexts/auth.context.tsx`

**Checkpoint**: `POST /auth/logout` returns 200. Using the pre-logout refresh token returns 401.

---

## Phase 6: User Story 4 — Profile Retrieval (Priority: P2)

**Goal**: Authenticated user can fetch their own profile data (id, name, email, role) via access token.

**Independent Test**: Run Scenario 7 from `specs/001-auth/quickstart.md` manually.

- [x] T034 [US4] Add `getProfile(userId: string)` to `AuthService`: `prisma.user.findUnique({ where: { id: userId }, select: { id, name, email, role } })` in `backend/src/auth/auth.service.ts`
- [x] T035 [US4] Add `GET /auth/me` to `AuthController` decorated with `@UseGuards(JwtAuthGuard)`, `@ApiBearerAuth()`, `@ApiOperation`, `@ApiResponse(200)`, `@ApiResponse(401)`; extract `userId` from `@Request()` in `backend/src/auth/auth.controller.ts`
- [x] T036 [P] [US4] Expose `user` object from `AuthContext` (populated after login or profile fetch) to all children components in `frontend/src/contexts/auth.context.tsx`
- [x] T037 [P] [US4] Create login page form (`email` + `password` inputs, submit calls `AuthContext.login()`, redirect on success, show error on 401) in `frontend/src/app/login/page.tsx`

**Checkpoint**: `GET /auth/me` with valid Bearer token returns `{ id, name, email, role }`. Expired token returns 401.

---

## Phase 7: Polish & Cross-Cutting Concerns

- [x] T038 [P] Add missing `@ApiProperty` decorators to any DTO fields not yet annotated; verify Swagger UI at `http://localhost:3000/api` shows all 4 endpoints with correct request/response schemas in `backend/src/auth/dto/`
- [x] T039 Add admin seed user script (`bcrypt.hash` for password, `role: ADMIN`) for local dev and testing in `backend/prisma/seed.ts`
- [x] T040 Run all 8 quickstart scenarios from `specs/001-auth/quickstart.md` end-to-end against running local backend and confirm expected HTTP status codes
- [x] T041 [P] Verify `password` field is never present in any JSON response from any auth endpoint
- [x] T042 [P] Verify CORS rejects requests from origins other than the configured frontend domain

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on Phase 1 completion — BLOCKS all user stories
- **US1 Login (Phase 3)**: Depends on Phase 2 — first user story; no story dependencies
- **US2 Refresh (Phase 4)**: Depends on Phase 2; shares `AuthService` and `AuthController` with US1 — start after T017 is complete
- **US3 Logout (Phase 5)**: Depends on Phase 2; shares `AuthService` and `AuthController` — can start after T017
- **US4 Profile (Phase 6)**: Depends on Phase 2; shares `AuthService` and `AuthController` — can start after T017
- **Polish (Phase 7)**: Depends on all user stories complete

### Within Each User Story

- DTOs [P] → Service method → Strategy → Guard [P] → Controller endpoint
- Frontend Context → Axios interceptor (US2) → Login page (US4)
- Each story's backend endpoint MUST be complete before frontend integration

### Parallel Opportunities

- T003, T004, T005, T006, T007 — all Phase 1 setup runs in parallel
- T012, T013, T014 — Phase 2 config tasks run in parallel after T010–T011
- T015, T016 (DTOs), T019, T020 — parallel within US1
- T023, T024, T027 — parallel within US2
- T036, T037 — parallel within US4
- T038, T041, T042 — parallel polish tasks

---

## Implementation Strategy

### MVP First (US1 + US2 only — fully working auth)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational
3. Complete Phase 3: US1 Login → **test Scenarios 1–4**
4. Complete Phase 4: US2 Refresh → **test Scenarios 5–6**
5. **STOP and validate**: sessions work end-to-end with silent refresh

### Incremental Delivery

1. Setup + Foundational → app boots, DB connected
2. US1 Login → users can authenticate (MVP auth backend)
3. US2 Refresh → sessions stay alive (platform usable)
4. US3 Logout → explicit session termination
5. US4 Profile → UI personalisation + role-based routing
6. Polish → Swagger complete, seed data, CORS verified

---

## Notes

- `[P]` tasks operate on separate files — safe to run in parallel
- `AuthService` grows across US1–US4 (T017 → T025 → T031 → T034); complete each story's method before moving to the next
- `AuthController` grows similarly (T021 → T028 → T032 → T035)
- `AuthContext` grows on the frontend (T029 → T033 → T036); keep story methods isolated within the same file
- The `RefreshToken` in `localStorage` is an accepted trade-off per `research.md` section 5 — access token remains memory-only
