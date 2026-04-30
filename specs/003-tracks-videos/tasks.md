# Tasks: 003-tracks-videos (Tracks & Videos Management)

**Input**: Design documents from `/specs/003-tracks-videos/`
**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, contracts/ ✅, quickstart.md ✅

**Organization**: Tasks are grouped by user story. US1 and US2 are P1 (backend MVP). US3 is P1 (read detail endpoints). US4 is P2 (frontend pages).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to
- Exact file paths included in all descriptions

---

## Phase 1: Setup (Prisma Schema + Types)

**Purpose**: Add Track and Video models to Prisma schema and regenerate TypeScript client. Must be done before any module can compile.

- [x] T001 Add Track and Video models to `backend/prisma/schema.prisma` (paste models from plan.md; migration `npx prisma migrate dev --name add-tracks-videos` requires live DB — mark as manual)
- [x] T002 Run `npx prisma generate` from `backend/` to generate TypeScript types for Track and Video

---

## Phase 2: Foundational (Utilities + Module Skeletons)

**Purpose**: Core utilities and module registration that all user stories depend on.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [x] T003 Create YouTube URL parser utility `extractYoutubeId(url: string): string | null` in `backend/src/videos/videos.utils.ts` — supports watch, youtu.be short, and embed URL formats using regex (patterns from research.md)
- [x] T004 [P] Create `TracksModule` skeleton (module + empty service + empty controller stubs) in `backend/src/tracks/tracks.module.ts`, `backend/src/tracks/tracks.service.ts`, `backend/src/tracks/tracks.controller.ts`
- [x] T005 [P] Create `VideosModule` skeleton (module + empty service + empty controller stubs) in `backend/src/videos/videos.module.ts`, `backend/src/videos/videos.service.ts`, `backend/src/videos/videos.controller.ts`
- [x] T006 Register `TracksModule` and `VideosModule` in `backend/src/app.module.ts` imports array

**Checkpoint**: `npx tsc --noEmit` from `backend/` must pass before proceeding.

---

## Phase 3: User Story 1 — Admin Manages Tracks (Priority: P1) 🎯 MVP

**Goal**: Full CRUD for tracks + role-based list endpoint. Admins can create, edit, delete, and toggle tracks. Any authenticated user can list tracks (viewers see only active).

**Independent Test**: POST a track → GET list (appears) → PATCH isActive:false → GET list as viewer (disappears) → DELETE → GET list (gone). See quickstart.md Scenarios 1–3.

### Implementation for User Story 1

- [x] T007 [P] [US1] Create `CreateTrackDto` in `backend/src/tracks/dto/create-track.dto.ts` — fields: `name` (IsString, MinLength(1)), `description?` (IsString, IsOptional), `thumbnailUrl?` (IsUrl, IsOptional), `order?` (IsInt, IsOptional); add Swagger `@ApiProperty` decorators
- [x] T008 [P] [US1] Create `UpdateTrackDto` in `backend/src/tracks/dto/update-track.dto.ts` — `PartialType(CreateTrackDto)` plus `isActive?: boolean` (`@IsBoolean() @IsOptional()`); import `PartialType` from `@nestjs/swagger`
- [x] T009 [US1] Implement `TracksService` in `backend/src/tracks/tracks.service.ts` with these methods:
  - `findAll(isAdmin, page, perPage)` — paginated list, `where: isAdmin ? {} : { isActive: true }`, `_count` for videoCount (active-only for viewers via `{ where: { isActive: true } }`, all for admins), ordered by `order ASC`; returns `{ data, meta }`
  - `create(dto)` — `prisma.track.create`
  - `update(id, dto)` — `prisma.track.update`, catch `P2025` → `NotFoundException`
  - `remove(id)` — `prisma.track.delete`, catch `P2025` → `NotFoundException`
  - Import `PrismaClientKnownRequestError` from `@prisma/client/runtime/client`
- [x] T010 [US1] Implement `TracksController` in `backend/src/tracks/tracks.controller.ts`:
  - `@UseGuards(JwtAuthGuard, RolesGuard)` at class level
  - `GET /api/tracks` — no `@Roles`, pass `isAdmin = req.user.role === Role.ADMIN` to service, accept `page` and `perPage` query params
  - `POST /api/tracks` — `@Roles(Role.ADMIN)`
  - `PATCH /api/tracks/:id` — `@Roles(Role.ADMIN)`
  - `DELETE /api/tracks/:id` — `@Roles(Role.ADMIN)`, returns `{ message: 'Track deleted successfully' }`
  - Controller prefix: `api/tracks`

**Checkpoint**: Track CRUD works. `GET /api/tracks` with viewer token returns only active tracks.

---

## Phase 4: User Story 2 — Admin Manages Videos (Priority: P1)

**Goal**: Full CRUD for videos with YouTube URL parsing. Admins add videos to tracks; YouTube ID extracted automatically. Invalid URLs rejected with 400.

**Independent Test**: POST video with youtube.com/watch URL → verify `youtubeId` extracted → POST with youtu.be URL → verify → POST with invalid URL → expect 400 → DELETE video → verify gone. See quickstart.md Scenarios 4–6, 11.

### Implementation for User Story 2

- [x] T011 [P] [US2] Create `CreateVideoDto` in `backend/src/videos/dto/create-video.dto.ts` — fields: `title` (IsString, MinLength(1)), `youtubeUrl` (IsString — not IsUrl, will be validated in service), `description?` (IsString, IsOptional), `thumbnailUrl?` (IsUrl, IsOptional), `duration` (IsInt, Min(1)), `trackId` (IsUUID), `order?` (IsInt, IsOptional); add Swagger `@ApiProperty` decorators
- [x] T012 [P] [US2] Create `UpdateVideoDto` in `backend/src/videos/dto/update-video.dto.ts` — `OmitType(CreateVideoDto, ['trackId'])` then `PartialType`, plus `isActive?: boolean` (`@IsBoolean() @IsOptional()`); `trackId` must NOT be updatable; import `PartialType`, `OmitType` from `@nestjs/swagger`
- [x] T013 [US2] Implement `VideosService` in `backend/src/videos/videos.service.ts` with these methods:
  - `create(dto)` — call `extractYoutubeId(dto.youtubeUrl)`; throw `BadRequestException('Invalid YouTube URL')` if null; verify `trackId` exists via `prisma.track.findUnique` → `NotFoundException` if not found; `prisma.video.create` with extracted `youtubeId`
  - `update(id, dto)` — `prisma.video.update`, catch `P2025` → `NotFoundException`; if `youtubeUrl` in dto, re-extract `youtubeId`
  - `remove(id)` — `prisma.video.delete`, catch `P2025` → `NotFoundException`, returns `{ message: 'Video deleted successfully' }`
  - Import `PrismaClientKnownRequestError` from `@prisma/client/runtime/client`
- [x] T014 [US2] Implement `VideosController` in `backend/src/videos/videos.controller.ts`:
  - `@UseGuards(JwtAuthGuard, RolesGuard)` at class level
  - `POST /api/videos` — `@Roles(Role.ADMIN)`
  - `PATCH /api/videos/:id` — `@Roles(Role.ADMIN)`
  - `DELETE /api/videos/:id` — `@Roles(Role.ADMIN)`
  - Controller prefix: `api/videos`

**Checkpoint**: `POST /api/videos` with valid YouTube URL creates video with `youtubeId`. Invalid URL returns 400.

---

## Phase 5: User Story 3 — Browse Track Detail and Video Detail (Priority: P1)

**Goal**: GET /:id endpoints for tracks (with ordered video list, role filtering) and videos (with youtubeId). Viewers get 404 for inactive items.

**Independent Test**: GET /api/tracks/:id → verify `videos` array ordered by `order` ASC → set video inactive → GET as viewer → video absent → GET as admin → video present. See quickstart.md Scenarios 7–9.

### Implementation for User Story 3

- [x] T015 [US3] Add `findOne(id, isAdmin)` to `TracksService` in `backend/src/tracks/tracks.service.ts`:
  - For viewers (`!isAdmin`): throw `NotFoundException` if track not found OR `!track.isActive`
  - Include `videos` ordered by `order ASC`, filtered by `isActive: true` for viewers, unfiltered for admins
  - Compute `videoCount` same as in `findAll`
  - Add `GET /api/tracks/:id` to `TracksController` — no `@Roles`, pass `isAdmin` flag, returns `TrackDetailDto`
- [x] T016 [US3] Add `findOne(id, isAdmin)` to `VideosService` in `backend/src/videos/videos.service.ts`:
  - `prisma.video.findUnique({ where: { id }, include: { track: true } })`
  - For viewers: throw `NotFoundException` if not found OR `!video.isActive` OR `!video.track.isActive`
  - For admins: throw `NotFoundException` only if not found
  - Add `GET /api/videos/:id` to `VideosController` — no `@Roles`, pass `isAdmin` flag, returns `VideoResponseDto`

**Checkpoint**: Backend API complete. All 11 quickstart.md scenarios should pass against a running server.

---

## Phase 6: User Story 4 — Frontend Pages (Priority: P2)

**Goal**: Four Next.js pages: viewer track list, track detail (with video cards), admin track management, admin video management.

**Independent Test**: Navigate to `/dashboard/tracks` — see active track cards. Click a track → see ordered videos. Navigate to `/admin/tracks` → see all tracks including inactive → create/edit/delete. Navigate to `/admin/tracks/[id]/videos` → add/edit/delete videos.

### Implementation for User Story 4

- [x] T017 [P] [US4] Create viewer track list page `frontend/src/app/dashboard/tracks/page.tsx` — fetch `GET /api/tracks` (paginated), display cards with name, description, thumbnail, videoCount; redirect to `/auth/login` if unauthenticated; import `{ api }` from `@/lib/axios`
- [x] T018 [P] [US4] Create viewer track detail page `frontend/src/app/dashboard/tracks/[id]/page.tsx` — fetch `GET /api/tracks/:id`, display track metadata and ordered video cards (title, duration, thumbnail, order); each video card links to `/dashboard/tracks/[id]/videos/[videoId]` (future); 404 redirect if track not found
- [x] T019 [US4] Create admin track list/management page `frontend/src/app/admin/tracks/page.tsx` — fetch all tracks (admin sees inactive too), display table with name, isActive badge, videoCount; buttons to create, edit, delete; inline toggle for isActive via PATCH
- [x] T020 [US4] Create admin track create/edit page `frontend/src/app/admin/tracks/[id]/page.tsx` — form with name, description, thumbnailUrl, order fields; `id === 'new'` → POST create, else → GET prefill + PATCH update; validation errors displayed inline
- [x] T021 [US4] Create admin video management page `frontend/src/app/admin/tracks/[id]/videos/page.tsx` — list videos for a track (all, including inactive), show order/title/isActive; buttons to add video (opens form), edit, delete, toggle active
- [x] T022 [US4] Create admin video create/edit form `frontend/src/app/admin/tracks/[id]/videos/[videoId]/page.tsx` — form with title, youtubeUrl, description, thumbnailUrl, duration, order fields; `videoId === 'new'` → POST create (trackId from URL param), else → GET prefill + PATCH update; display extracted `youtubeId` as read-only after creation

**Checkpoint**: Viewer can browse tracks and details. Admin can fully manage tracks and videos from the UI.

---

## Phase 7: Polish

- [x] T023 [P] Verify `npx tsc --noEmit` passes from both `backend/` and `frontend/` directories
- [x] T024 Update `PROGRESSO.md` with feature 003-tracks-videos status, marking backend complete and migration as pending (requires live DB)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies — start immediately
- **Phase 2 (Foundational)**: Depends on Phase 1 (Prisma types must exist)
- **Phase 3 (US1)**: Depends on Phase 2 — TracksModule depends on Prisma types
- **Phase 4 (US2)**: Depends on Phase 2 — VideosModule depends on `extractYoutubeId` from T003
- **Phase 5 (US3)**: Depends on Phase 3 (TracksService) and Phase 4 (VideosService) — extends both
- **Phase 6 (US4)**: Depends on Phase 5 — frontend consumes the complete API
- **Phase 7 (Polish)**: Depends on all previous phases

### User Story Dependencies

- **US1 (P1)**: Start after Phase 2 — no dependency on US2
- **US2 (P1)**: Start after Phase 2 — no dependency on US1 (service validates trackId via Prisma directly)
- **US3 (P1)**: Start after US1 and US2 — extends both services with findOne methods
- **US4 (P2)**: Start after US3 — consumes complete API

### Parallel Opportunities

- T004 and T005 (module skeletons) — parallel
- T007 and T008 (track DTOs) — parallel
- T011 and T012 (video DTOs) — parallel
- T017 and T018 (viewer frontend pages) — parallel
- T023 (tsc check) — parallel with T024

---

## Parallel Example: US1 DTOs

```
# Launch both DTO tasks in parallel:
Task A: T007 CreateTrackDto in backend/src/tracks/dto/create-track.dto.ts
Task B: T008 UpdateTrackDto in backend/src/tracks/dto/update-track.dto.ts
# Then sequentially:
Task C: T009 TracksService (depends on both DTOs)
Task D: T010 TracksController (depends on TracksService)
```

---

## Implementation Strategy

### MVP First (Backend API — US1 + US2 + US3)

1. Complete Phase 1: Prisma schema + generate
2. Complete Phase 2: Utilities + module skeletons
3. Complete Phase 3: US1 (Admin Manages Tracks)
4. Complete Phase 4: US2 (Admin Manages Videos)
5. Complete Phase 5: US3 (Track + Video detail endpoints)
6. **VALIDATE**: Run quickstart.md Scenarios 1–11 against live server

### Incremental Delivery

1. Phase 1 + 2 → Prisma types ready, modules registered
2. Phase 3 (US1) → Track CRUD working, test with curl
3. Phase 4 (US2) → Video CRUD working, YouTube URL parsing verified
4. Phase 5 (US3) → Full read experience, role filtering verified
5. Phase 6 (US4) → Frontend pages
6. Phase 7 → Polish + PROGRESSO.md update

---

## Notes

- `npx prisma migrate dev` requires live PostgreSQL — mark T001 migration as manual step, only run `prisma generate` in T002
- Import `PrismaClientKnownRequestError` from `@prisma/client/runtime/client` (NOT `/runtime/library`)
- Import `{ api }` from `@/lib/axios` (named export, not default)
- `PartialType` / `OmitType` must be imported from `@nestjs/swagger` (not `@nestjs/mapped-types`) to preserve Swagger decorators
- Route ordering: define GET /api/tracks before GET /api/tracks/:id if there is any specific static segment risk (NestJS resolves this correctly for different routes, but keep in mind for controller methods)
- Role filtering pattern: controller extracts `isAdmin = req.user.role === Role.ADMIN` and passes to service
