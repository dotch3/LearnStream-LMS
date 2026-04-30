# Tasks: First-Run Setup Wizard

**Input**: Design documents from `/specs/006-setup-wizard/`
**Prerequisites**: plan.md ✅ spec.md ✅ contracts/ ✅ quickstart.md ✅

**Organization**: Single user story — all tasks implement US1 end-to-end.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: [US1] — Operator Creates First Admin Account

---

## Phase 1: Setup

**Purpose**: Create the module directory structure.

- [X] T001 Create directories `backend/src/setup/` and `backend/src/setup/dto/`

---

## Phase 2: Foundational

No foundational tasks — no new DB migrations required. The `User` table and `bcrypt` are already in place.

---

## Phase 3: User Story 1 — Operator Creates First Admin Account (Priority: P1) 🎯

**Goal**: Backend endpoints lock after first admin is created. Frontend middleware gates all pages. `/setup` form creates the first admin.

**Independent Test**: Delete all admin users from DB. Open `http://localhost:3001` → redirected to `/setup`. Submit form → admin created → redirected to `/login?setup=done` with success banner. Open `/setup` again → redirected to `/login`. Call `POST /api/setup/admin` again → 404.

### Backend

- [X] T002 [P] [US1] Create `backend/src/setup/dto/create-admin.dto.ts`: export `CreateAdminDto` with `@IsString() @IsNotEmpty() name: string`, `@IsEmail() email: string`, `@IsString() @MinLength(8) password: string` — all decorated with `@ApiProperty()`
- [X] T003 [P] [US1] Create `backend/src/setup/setup.service.ts`: inject `PrismaService`; implement `async isSetupComplete(): Promise<boolean>` — `return (await this.prisma.user.count({ where: { role: Role.ADMIN } })) > 0`; implement `async createAdmin(dto: CreateAdminDto): Promise<void>` — call `isSetupComplete()` first, throw `NotFoundException()` if true, then `bcrypt.hash(dto.password, 10)` (import as `import * as bcrypt from 'bcrypt'`), then `prisma.user.create({ data: { name, email, password: hashed, role: Role.ADMIN } })`
- [X] T004 [US1] Create `backend/src/setup/setup.controller.ts`: `@Controller('setup')`, inject `SetupService`; implement `@Get('status') @Public() @ApiOperation getStatus()` — returns `{ isSetupComplete: await this.setupService.isSetupComplete() }`; implement `@Post('admin') @Public() @HttpCode(201) @ApiOperation createAdmin(@Body() dto: CreateAdminDto)` — calls `this.setupService.createAdmin(dto)` — import `@Public()` from `'../auth/decorators/public.decorator'`
- [X] T005 [US1] Create `backend/src/setup/setup.module.ts`: `@Module({ imports: [PrismaModule], controllers: [SetupController], providers: [SetupService] })`
- [X] T006 [US1] Register `SetupModule` in `backend/src/app.module.ts` imports array

### Frontend

- [X] T007 [US1] Create `frontend/src/middleware.ts`: Next.js Edge middleware that calls `GET ${process.env.NEXT_PUBLIC_API_URL}/api/setup/status`; if `!isSetupComplete` and `pathname !== '/setup'` → `NextResponse.redirect(new URL('/setup', request.url))`; if `isSetupComplete` and `pathname === '/setup'` → `NextResponse.redirect(new URL('/login', request.url))`; otherwise → `NextResponse.next()`; export `config = { matcher: ['/((?!_next/static|_next/image|favicon.ico|api).*)'] }`; wrap fetch in try/catch — on error, pass through (don't block the app if backend is unreachable)
- [X] T008 [US1] Create `frontend/src/app/setup/page.tsx`: `'use client'` component with controlled form fields: Full Name (text), Email (email), Password (password, min 8), Confirm Password (password); client-side validation: passwords must match, password min 8 chars, email format; on submit → `POST /api/setup/admin` via `fetch` (not `{ api }` from axios — this page has no auth token); on success → `router.push('/login?setup=done')`; on 404 response → show "Setup already complete. Redirecting..." and redirect to `/login`; on 400 → show field-level error from response; styled with Tailwind: centered card, LearnStream-LMS title, subtitle "Create your admin account to get started"
- [X] T009 [US1] Update `frontend/src/app/login/page.tsx`: read `useSearchParams()` for `setup` param; if `setup === 'done'`, display a green success banner above the login form: "Setup complete — please log in with your admin account."

**Checkpoint**: All 10 quickstart.md scenarios pass.

---

## Phase 4: Polish & Cross-Cutting Concerns

- [X] T010 Verify `npm run build` passes in `backend/` with no TypeScript errors
- [ ] T011 Run quickstart.md scenarios 1–10 manually to validate end-to-end

---

## Dependencies & Execution Order

- T001 (mkdir) → unblocks T002, T003 in parallel
- T002, T003 → unblock T004 (controller uses both DTO and service)
- T004, T005 → unblock T006 (module and controller must exist before registering)
- T006 (backend complete) → unblock T007, T008, T009 in parallel
- T009 depends on reading current login page first
- T010, T011 → after all tasks complete

### Parallel Opportunities

```
T001 (mkdir)
  → T002 (DTO) in parallel with T003 (service)
  → T004 (controller) — after T002 + T003
  → T005 (module) — can run in parallel with T004
  → T006 (register module)
  → T007, T008, T009 — all in parallel (different files)
  → T010, T011 (polish)
```

---

## Implementation Strategy

### MVP (all tasks — single story)

1. T001: mkdir
2. T002 + T003 in parallel
3. T004 + T005 in parallel
4. T006
5. T007 + T008 + T009 in parallel
6. T010 + T011

All 11 tasks form the complete, testable feature.

---

## Notes

- **bcrypt import**: `import * as bcrypt from 'bcrypt'` — same pattern as `auth.service.ts`
- **@Public() path**: `'../auth/decorators/public.decorator'`
- **Middleware fetch**: use native `fetch` (available in Next.js Edge Runtime) — no axios
- **NEXT_PUBLIC_API_URL**: must be set in `frontend/.env.local` — middleware runs server-side so it can access this env var
- **Login page**: read `useSearchParams()` — requires wrapping in `<Suspense>` if the login page is a server component; check current login page pattern before editing
- **No role guard on setup endpoints**: they use `@Public()` only — the 404-after-setup logic is in the service, not a guard
