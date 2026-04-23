# Tasks: User Management

**Input**: Design documents from `/specs/002-users-management/`
**Prerequisites**: plan.md ✅ · spec.md ✅ · data-model.md ✅ · contracts/users-api.md ✅ · research.md ✅

**Tests**: Not requested in spec — no test tasks generated.

**Organization**: Tasks grouped by user story (US1 → US4) to enable independent delivery.

## Format: `[ID] [P?] [Story?] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1–US4)

---

## Phase 1: Setup

**Purpose**: No new packages or Prisma migrations needed — all dependencies exist from 001-auth. Confirm environment, then proceed.

- [x] T001 Confirm backend compiles cleanly: `cd backend && npx tsc --noEmit` (baseline before changes)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Shared auth infrastructure (`@Roles()` decorator + `RolesGuard`) and the `UsersModule` scaffold that every user story depends on.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [x] T002 [P] Create `@Roles(...roles)` decorator using `SetMetadata('roles', roles)` in `backend/src/auth/decorators/roles.decorator.ts`
- [x] T003 Create `RolesGuard` implementing `CanActivate` with injected `Reflector`: reads `roles` metadata from handler/class, compares against `req.user.role`; passes all authenticated users when no `@Roles()` is set in `backend/src/auth/guards/roles.guard.ts`
- [x] T004 Update `AuthModule` to add `RolesGuard` to `providers` and `exports` arrays in `backend/src/auth/auth.module.ts`
- [x] T005 [P] Create `UserResponseDto` class with `@ApiProperty` on all fields: `id`, `name`, `email`, `role`, `isActive`, `createdAt`, `updatedAt` — no `password` field in `backend/src/users/dto/user-response.dto.ts`
- [x] T006 Create empty `UsersService` (`@Injectable()`) with injected `PrismaService` in `backend/src/users/users.service.ts`
- [x] T007 Create empty `UsersController` with `@ApiTags('users')`, `@Controller('api/users')`, `@UseGuards(JwtAuthGuard, RolesGuard)` at class level in `backend/src/users/users.controller.ts`
- [x] T008 Create `UsersModule` importing `PrismaModule` and `AuthModule`; declaring `UsersController` and `UsersService` in `backend/src/users/users.module.ts`
- [x] T009 Update `AppModule` to import `UsersModule` in `backend/src/app.module.ts`

**Checkpoint**: Backend boots, Swagger at `/api` shows a `users` tag (no endpoints yet). `RolesGuard` available for all stories.

---

## Phase 3: User Story 1 — Admin Creates and Lists Users (Priority: P1) 🎯 MVP

**Goal**: An ADMIN can create a new user account and list all users in a paginated response. Password is never returned.

**Independent Test**: Run Scenarios 1–4 from `specs/002-users-management/quickstart.md`.

- [x] T010 [P] [US1] Create `CreateUserDto` with `@ApiProperty` on: `email @IsEmail()`, `password @IsString() @MinLength(6)`, `name @IsString() @MinLength(2)`, `role? @IsEnum(Role) @IsOptional()` in `backend/src/users/dto/create-user.dto.ts`
- [x] T011 [US1] Add `create(dto: CreateUserDto): Promise<UserResponseDto>` to `UsersService`: `bcrypt.hash(dto.password, 10)`, `prisma.user.create(...)`, catch `PrismaClientKnownRequestError` code `P2002` → throw `ConflictException`; return `UserResponseDto` (no password) in `backend/src/users/users.service.ts`
- [x] T012 [US1] Add `findAll(page: number, perPage: number)` to `UsersService`: `prisma.user.findMany({ skip: (page-1)*perPage, take: perPage, orderBy: { createdAt: 'desc' }, select: { id, name, email, role, isActive, createdAt, updatedAt } })` + `prisma.user.count()`; return `{ data, meta: { total, page, perPage, totalPages } }` in `backend/src/users/users.service.ts`
- [x] T013 [US1] Add `POST /api/users` to `UsersController`: `@Roles(Role.ADMIN)`, `@ApiOperation`, `@ApiResponse(201)`, `@ApiResponse(400)`, `@ApiResponse(403)`, `@ApiResponse(409)`; calls `usersService.create(dto)` in `backend/src/users/users.controller.ts`
- [x] T014 [US1] Add `GET /api/users` to `UsersController`: `@Roles(Role.ADMIN)`, `@ApiOperation`, `@ApiResponse(200)`, `@ApiResponse(403)`; query params `@Query('page') page = 1`, `@Query('perPage') perPage = 20`; calls `usersService.findAll(page, perPage)` in `backend/src/users/users.controller.ts`

**Checkpoint**: `POST /api/users` creates users (201), rejects duplicates (409), rejects VIEWERs (403). `GET /api/users` returns paginated list, no password in responses.

---

## Phase 4: User Story 2 — Admin Views and Updates a User (Priority: P1)

**Goal**: An ADMIN can retrieve a single user's full details by ID and update their name, email, role, or active status.

**Independent Test**: Run Scenarios 5–6 from `specs/002-users-management/quickstart.md`.

- [x] T015 [P] [US2] Create `UpdateUserDto` extending `PartialType(CreateUserDto)` from `@nestjs/swagger` but excluding `password`; add `isActive? @IsBoolean() @IsOptional() @ApiPropertyOptional()` in `backend/src/users/dto/update-user.dto.ts`
- [x] T016 [US2] Add `findOne(id: string): Promise<UserResponseDto>` to `UsersService`: `prisma.user.findUnique({ where: { id }, select: { id, name, email, role, isActive, createdAt, updatedAt } })`; throw `NotFoundException` if null in `backend/src/users/users.service.ts`
- [x] T017 [US2] Add `update(id: string, dto: UpdateUserDto): Promise<UserResponseDto>` to `UsersService`: `prisma.user.update({ where: { id }, data: dto, select: safeFields })`; catch `P2002` → `ConflictException`; catch `P2025` (record not found) → `NotFoundException` in `backend/src/users/users.service.ts`
- [x] T018 [US2] Add `GET /api/users/:id` to `UsersController`: `@Roles(Role.ADMIN)`, `@ApiParam({ name: 'id' })`, `@ApiResponse(200)`, `@ApiResponse(403)`, `@ApiResponse(404)`; calls `usersService.findOne(id)` in `backend/src/users/users.controller.ts`
- [x] T019 [US2] Add `PATCH /api/users/:id` to `UsersController`: `@Roles(Role.ADMIN)`, `@ApiParam`, `@ApiResponse(200)`, `@ApiResponse(400)`, `@ApiResponse(403)`, `@ApiResponse(404)`, `@ApiResponse(409)`; calls `usersService.update(id, dto)` in `backend/src/users/users.controller.ts`

**Checkpoint**: `GET /api/users/:id` returns full user (404 for unknown), `PATCH /api/users/:id` updates fields, rejects duplicate email (409).

---

## Phase 5: User Story 3 — Admin Deactivates and Reactivates Users (Priority: P1)

**Goal**: An ADMIN can set a user's `isActive` to false (soft delete) or back to true. A deactivated user cannot log in. An ADMIN cannot deactivate themselves.

**Independent Test**: Run Scenarios 7–9 from `specs/002-users-management/quickstart.md`.

- [x] T020 [US3] Add `deactivate(adminId: string, targetId: string): Promise<{ message: string }>` to `UsersService`: throw `ForbiddenException('Admins cannot deactivate themselves')` if `adminId === targetId`; `prisma.user.update({ where: { id: targetId }, data: { isActive: false } })`; catch `P2025` → `NotFoundException`; return `{ message: 'User deactivated successfully' }` in `backend/src/users/users.service.ts`
- [x] T021 [US3] Add `reactivate(id: string): Promise<{ message: string }>` to `UsersService`: `prisma.user.update({ where: { id }, data: { isActive: true } })`; catch `P2025` → `NotFoundException`; return `{ message: 'User reactivated successfully' }` in `backend/src/users/users.service.ts`
- [x] T022 [US3] Add `PATCH /api/users/:id/deactivate` to `UsersController`: `@Roles(Role.ADMIN)`, `@ApiParam`, `@ApiResponse(200)`, `@ApiResponse(403)`, `@ApiResponse(404)`; extract `adminId` from `@Request() req.user.userId`; calls `usersService.deactivate(adminId, id)` in `backend/src/users/users.controller.ts`
- [x] T023 [US3] Add `PATCH /api/users/:id/reactivate` to `UsersController`: `@Roles(Role.ADMIN)`, `@ApiParam`, `@ApiResponse(200)`, `@ApiResponse(403)`, `@ApiResponse(404)`; calls `usersService.reactivate(id)` in `backend/src/users/users.controller.ts`

**Checkpoint**: `PATCH /api/users/:id/deactivate` returns 200, deactivated user gets 401 on login. Self-deactivation returns 403. Reactivation restores login access.

---

## Phase 6: User Story 4 — User Updates Own Profile and Password (Priority: P2)

**Goal**: Any authenticated user can update their own display name and change their own password (after verifying the current password). Frontend pages for admin user management and self-profile.

**Independent Test**: Run Scenarios 10–12 from `specs/002-users-management/quickstart.md`.

- [x] T024 [P] [US4] Create `UpdateProfileDto` with `name @IsString() @MinLength(2) @ApiProperty()` in `backend/src/users/dto/update-profile.dto.ts`
- [x] T025 [P] [US4] Create `ChangePasswordDto` with `currentPassword @IsString() @ApiProperty()` and `newPassword @IsString() @MinLength(6) @ApiProperty()` in `backend/src/users/dto/change-password.dto.ts`
- [x] T026 [US4] Add `updateProfile(userId: string, dto: UpdateProfileDto): Promise<UserResponseDto>` to `UsersService`: `prisma.user.update({ where: { id: userId }, data: { name: dto.name }, select: safeFields })` in `backend/src/users/users.service.ts`
- [x] T027 [US4] Add `changePassword(userId: string, dto: ChangePasswordDto): Promise<{ message: string }>` to `UsersService`: load user with `findUniqueOrThrow`; `bcrypt.compare(dto.currentPassword, user.password)` → throw `UnauthorizedException` if false; `bcrypt.hash(dto.newPassword, 10)`; `prisma.user.update({ where: { id }, data: { password: hash } })`; return `{ message: 'Password changed successfully' }` in `backend/src/users/users.service.ts`
- [x] T028 [US4] Add `PATCH /api/users/me/profile` to `UsersController` BEFORE `/:id` route: remove `@Roles()` from this method (any authenticated user); `@ApiBearerAuth()`, `@ApiOperation`, `@ApiResponse(200)`, `@ApiResponse(401)`; extract `userId` from `@Request() req.user.userId`; calls `usersService.updateProfile(userId, dto)` in `backend/src/users/users.controller.ts`
- [x] T029 [US4] Add `PATCH /api/users/me/password` to `UsersController` BEFORE `/:id` route: remove `@Roles()` from this method; `@ApiBearerAuth()`, `@ApiOperation`, `@ApiResponse(200)`, `@ApiResponse(401)`, `@ApiResponse(400)`; calls `usersService.changePassword(userId, dto)` in `backend/src/users/users.controller.ts`
- [x] T030 [P] [US4] Create admin user list page: table of users with columns (name, email, role, status), pagination controls, "Create User" button, "Deactivate/Reactivate" action per row in `frontend/src/app/admin/users/page.tsx`
- [x] T031 [P] [US4] Create admin create-user form: email, name, password, role select inputs; calls `POST /api/users`; redirects to `/admin/users` on success in `frontend/src/app/admin/users/new/page.tsx`
- [x] T032 [P] [US4] Create admin edit-user page: pre-filled form with user data (name, email, role, isActive toggle); calls `PATCH /api/users/:id`; shows conflict error on duplicate email in `frontend/src/app/admin/users/[id]/page.tsx`
- [x] T033 [P] [US4] Create self-profile page: name edit form + separate password change form (current + new password); calls `/api/users/me/profile` and `/api/users/me/password`; shows success/error toasts in `frontend/src/app/dashboard/profile/page.tsx`

**Checkpoint**: All 12 quickstart scenarios pass. Frontend admin pages load and save correctly.

---

## Phase 7: Polish & Cross-Cutting Concerns

- [x] T034 [P] Verify Swagger UI at `http://localhost:3000/api` shows all 8 users endpoints with correct request/response schemas and no `password` field visible in any response DTO
- [x] T035 [P] Verify `password` field is never present in any JSON response from any users endpoint (scan all endpoints manually)
- [x] T036 Run all 12 quickstart scenarios from `specs/002-users-management/quickstart.md` end-to-end against running local backend and confirm expected HTTP status codes
- [x] T037 [P] Verify VIEWER token receives 403 on all admin-only endpoints (`POST /api/users`, `GET /api/users`, `GET /api/users/:id`, `PATCH /api/users/:id`, deactivate, reactivate)
- [x] T038 Update `PROGRESSO.md` with 002-users-management completion summary

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on Phase 1 — BLOCKS all user stories
- **US1 Create/List (Phase 3)**: Depends on Phase 2; first user story
- **US2 View/Update (Phase 4)**: Depends on Phase 2; shares `UsersService` and `UsersController` with US1 — start after T012
- **US3 Deactivate/Reactivate (Phase 5)**: Depends on Phase 2; shares `UsersService` and `UsersController` — start after T012
- **US4 Self-Profile (Phase 6)**: Depends on Phase 2; shares `UsersService` and `UsersController` — start after T012; frontend pages depend on backend complete
- **Polish (Phase 7)**: Depends on all user stories complete

### Within Each User Story

- DTOs [P] → Service methods → Controller endpoints
- Frontend pages depend on backend endpoints being complete
- `UsersService` grows across US1–US4 (T011-T012 → T016-T017 → T020-T021 → T026-T027)
- `UsersController` grows similarly (T013-T014 → T018-T019 → T022-T023 → T028-T029)

### Parallel Opportunities

- T002, T005 — Phase 2 parallel setup
- T010 (DTO) — parallel within US1
- T015 (DTO) — parallel within US2
- T024, T025 (DTOs) — parallel within US4
- T030, T031, T032, T033 — frontend pages all parallel within US4
- T034, T035, T037, T038 — parallel polish tasks

### Critical Route Ordering Note

In `UsersController`, define `/me/profile` and `/me/password` routes BEFORE `/:id` routes. NestJS/Express matches routes in declaration order — if `/:id` is defined first, `me` is treated as a UUID, causing incorrect routing.

---

## Implementation Strategy

### MVP First (US1 + US2 + US3 — fully working admin CRUD)

1. Complete Phase 1: Setup (compile check)
2. Complete Phase 2: Foundational (guards + module scaffold)
3. Complete Phase 3: US1 Create/List → **test Scenarios 1–4**
4. Complete Phase 4: US2 View/Update → **test Scenarios 5–6**
5. Complete Phase 5: US3 Deactivate/Reactivate → **test Scenarios 7–9**
6. **STOP and validate**: Full admin CRUD works end-to-end

### Incremental Delivery

1. Setup + Foundational → app boots, users tag in Swagger
2. US1 → admins can create and list users (MVP users backend)
3. US2 → admins can view and edit users
4. US3 → admins can deactivate/reactivate users (security-complete)
5. US4 → self-service profile + password change + frontend pages
6. Polish → Swagger complete, all scenarios verified

---

## Notes

- `[P]` tasks operate on separate files — safe to run in parallel
- `UsersService` grows across US1–US4; complete each story's methods before the next
- `UsersController` similarly grows; the `/me/*` routes MUST be declared before `/:id` (T028, T029 before T018, T019 in source order — implement T028/T029 first even though they are US4)
- `UpdateUserDto` extends `PartialType` from `@nestjs/swagger` — import from correct package
- Prisma error codes: `P2002` = unique constraint, `P2025` = record not found
- `bcrypt` already installed in backend from 001-auth — no new installation needed
