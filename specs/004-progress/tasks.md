# Tasks: 004-progress (Progress Tracking)

**Input**: Design documents from `/specs/004-progress/`
**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, contracts/ ✅, quickstart.md ✅

**Organization**: Tasks are grouped by user story. US1 and US2 are P1 (backend + frontend MVP). US3 is P2 (admin endpoint — reuses US2 service logic). US4 is the frontend video player page.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to
- Exact file paths included in all descriptions

---

## Phase 1: Setup (Prisma Schema + Types)

**Purpose**: Add VideoProgress model to Prisma schema and generate TypeScript client. Must complete before any service code can compile.

- [x] T001 Add `VideoProgress` model to `backend/prisma/schema.prisma`; also add `progress VideoProgress[]` relation to `User` model and `progress VideoProgress[]` relation to `Video` model — paste schema from plan.md; mark migration `npx prisma migrate dev --name add-video-progress` as manual (requires live DB)
- [x] T002 Run `npx prisma generate` from `backend/` to generate TypeScript types for VideoProgress (including the `@@unique([userId, videoId])` compound key `userId_videoId`)

---

## Phase 2: Foundational (Constants + Module Skeleton)

**Purpose**: Named constant and module registration that all user stories depend on.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [x] T003 Create `backend/src/progress/progress.constants.ts` with `export const WATCH_COMPLETE_THRESHOLD = 80;` — no other content
- [x] T004 [P] Create `ProgressModule` skeleton in `backend/src/progress/progress.module.ts` — imports PrismaModule and AuthModule, declares ProgressService and ProgressController, exports ProgressService
- [x] T005 [P] Create `ProgressService` stub in `backend/src/progress/progress.service.ts` — constructor injects PrismaService, no methods yet
- [x] T006 [P] Create `ProgressController` stub in `backend/src/progress/progress.controller.ts` — `@Controller('api/progress')`, constructor injects ProgressService, no endpoints yet
- [x] T007 Register `ProgressModule` in `backend/src/app.module.ts` imports array (add import + add to array)

**Checkpoint**: `npx tsc --noEmit` from `backend/` must pass before proceeding.

---

## Phase 3: User Story 1 — Report Video Progress (Priority: P1) 🎯 MVP

**Goal**: Authenticated users can report watch progress for any video. Backend computes percentage, applies Math.max (no decrement), and marks video complete when ≥ WATCH_COMPLETE_THRESHOLD. Returns updated progress record.

**Independent Test**: POST progress at 50% → verify percentage=50, completed=false. POST again at 83% → verify completed=true. POST again at 30% → verify percentage still 83%, completed still true. See quickstart.md Scenarios 1–3.

### Implementation for User Story 1

- [x] T008 [P] [US1] Create `ReportProgressDto` in `backend/src/progress/dto/report-progress.dto.ts` — fields: `videoId` (IsUUID), `watchedSeconds` (IsInt, Min(0)), `totalSeconds` (IsInt, Min(1)); add Swagger `@ApiProperty` decorators
- [x] T009 [P] [US1] Create `VideoProgressResponseDto` in `backend/src/progress/dto/video-progress-response.dto.ts` — fields: id, videoId, watchedSeconds, totalSeconds, percentage, completed (boolean), lastWatchedAt, updatedAt; add Swagger `@ApiProperty` decorators
- [x] T010 [US1] Implement `ProgressService.report(userId: string, dto: ReportProgressDto)` in `backend/src/progress/progress.service.ts`:
  - Verify video exists via `prisma.video.findUnique({ where: { id: dto.videoId } })` → throw `NotFoundException` if not found
  - Compute `newPercentage = Math.min(100, (dto.watchedSeconds / dto.totalSeconds) * 100)`
  - Fetch existing record: `prisma.videoProgress.findUnique({ where: { userId_videoId: { userId, videoId: dto.videoId } } })`
  - Compute `maxPercentage = Math.max(existing?.percentage ?? 0, newPercentage)`
  - Compute `completed = (existing?.completed ?? false) || maxPercentage >= WATCH_COMPLETE_THRESHOLD`
  - Upsert: `prisma.videoProgress.upsert({ where: { userId_videoId: { userId, videoId: dto.videoId } }, create: { userId, videoId: dto.videoId, watchedSeconds: dto.watchedSeconds, totalSeconds: dto.totalSeconds, percentage: maxPercentage, completed, lastWatchedAt: new Date() }, update: { watchedSeconds: Math.max(existing?.watchedSeconds ?? 0, dto.watchedSeconds), totalSeconds: dto.totalSeconds, percentage: maxPercentage, completed, lastWatchedAt: new Date() } })`
  - Import `WATCH_COMPLETE_THRESHOLD` from `./progress.constants`
- [x] T011 [US1] Implement `POST /api/progress` in `backend/src/progress/progress.controller.ts`:
  - `@UseGuards(JwtAuthGuard, RolesGuard)` at class level
  - `@Post()` handler: extract `userId = req.user.sub`, call `progressService.report(userId, dto)`, return result
  - Add `@ApiTags('progress')`, `@ApiBearerAuth()`, `@ApiOperation` decorator

**Checkpoint**: POST /api/progress works. Non-decrement and completion threshold verified.

---

## Phase 4: User Story 2 — View Track Progress (Priority: P1)

**Goal**: Any authenticated user can GET their own track progress: overall percentage, completion count, track_complete flag, and per-video breakdown (ordered by video.order ASC). Inactive videos excluded from all calculations.

**Independent Test**: After completing 1 of 3 active videos, GET /api/progress/tracks/:id → overallPercentage=33, completedCount=1, totalActive=3, trackComplete=false. Complete all 3 → overallPercentage=100, trackComplete=true. See quickstart.md Scenarios 4–5.

### Implementation for User Story 2

- [x] T012 [US2] Create DTOs in `backend/src/progress/dto/track-progress-response.dto.ts`:
  - `VideoProgressSummaryDto` — fields: videoId, title, order, percentage, completed, lastWatchedAt (nullable)
  - `TrackProgressResponseDto` — fields: trackId, totalActive, completedCount, overallPercentage, trackComplete (boolean), videos: VideoProgressSummaryDto[]
  - Add Swagger `@ApiProperty` decorators on all fields
- [x] T013 [US2] Implement `ProgressService.getTrackProgress(userId: string, trackId: string)` in `backend/src/progress/progress.service.ts`:
  - Verify track exists via `prisma.track.findUnique({ where: { id: trackId } })` → throw `NotFoundException` if not found
  - Fetch active videos: `prisma.video.findMany({ where: { trackId, isActive: true }, orderBy: { order: 'asc' } })`
  - Guard against empty track: `if (activeVideos.length === 0)` → return `{ trackId, totalActive: 0, completedCount: 0, overallPercentage: 0, trackComplete: false, videos: [] }`
  - Fetch progress records: `prisma.videoProgress.findMany({ where: { userId, videoId: { in: activeVideos.map(v => v.id) } } })`
  - Build a Map: `progressMap = new Map(records.map(p => [p.videoId, p]))`
  - Compute `completedCount = records.filter(p => p.completed).length`
  - Compute `overallPercentage = Math.round((completedCount / activeVideos.length) * 100)`
  - Build `videos` array by mapping `activeVideos` to VideoProgressSummaryDto (merge from progressMap; use 0/false/null if no record)
  - Return `TrackProgressResponseDto`
- [x] T014 [US2] Add `GET /api/progress/tracks/:trackId` to `backend/src/progress/progress.controller.ts`:
  - No `@Roles` decorator — open to both VIEWER and ADMIN
  - Extract `userId = req.user.sub`; call `progressService.getTrackProgress(userId, trackId)`

**Checkpoint**: GET /api/progress/tracks/:id returns correct data. Inactive video excluded. Empty track returns zeros.

---

## Phase 5: User Story 3 — Admin Views User Progress (Priority: P2)

**Goal**: Admins can query any user's progress on any track using the same computation as US2. VIEWER access returns 403.

**Independent Test**: As admin, GET /api/progress/users/:userId/tracks/:trackId → same shape as US2 response for that user. As viewer targeting another user → 403. See quickstart.md Scenarios 8–9.

### Implementation for User Story 3

- [x] T015 [US3] Add `GET /api/progress/users/:userId/tracks/:trackId` to `backend/src/progress/progress.controller.ts`:
  - `@Roles(Role.ADMIN)` — enforces 403 for VIEWERs
  - Call `progressService.getTrackProgress(userId, trackId)` with the path param userId (not req.user.sub)
  - No new service method needed — reuses T013

**Checkpoint**: Admin endpoint returns correct data. VIEWER gets 403. Backend API fully complete; all 11 quickstart.md scenarios should pass against a running server.

---

## Phase 6: Frontend — Video Player Page (Priority: P1)

**Goal**: A video player page at `dashboard/tracks/[id]/videos/[videoId]` that embeds the YouTube IFrame, starts a 30-second interval during playback to call POST /api/progress, and stops the interval on pause/end/unmount.

**Independent Test**: Navigate to a video page → video loads. Play 30+ seconds → POST /api/progress called. Pause → interval stops. Seek backward → percentage does not decrease on backend. See quickstart.md Scenario 1.

### Implementation for User Story 4 (Frontend)

- [x] T016 [US1] Create video player page `frontend/src/app/dashboard/tracks/[id]/videos/[videoId]/page.tsx`:
  - Fetch video details via `GET /api/videos/:videoId` using `{ api }` from `@/lib/axios`
  - On 401 → redirect to `/auth/login`; on 404 → show "Video not found"
  - Load YouTube IFrame API: `<Script src="https://www.youtube.com/iframe_api" strategy="afterInteractive" />`
  - Initialize `window.YT.Player` in `useEffect` after script loads, with `onReady`, `onStateChange` callbacks
  - Track `isPlaying` state from `YT.PlayerState.PLAYING` / `YT.PlayerState.PAUSED`/`ENDED`
  - `useEffect` keyed on `isPlaying`: when true → `setInterval(reportProgress, 30_000)` → return `clearInterval`
  - `reportProgress` reads `player.getCurrentTime()` and `player.getDuration()`, calls `api.post('/api/progress', { videoId, watchedSeconds: Math.floor(currentTime), totalSeconds: Math.floor(duration) })` silently (errors do not interrupt playback)
  - Display: video title, embedded player (via `<div id="yt-player" />`), back button to `/dashboard/tracks/[id]`

**Checkpoint**: Video player page loads, plays video, and silently reports progress every 30 seconds.

---

## Phase 7: Polish

- [x] T017 [P] Verify `npx tsc --noEmit` passes from both `backend/` and `frontend/` directories
- [x] T018 Update `PROGRESSO.md` with feature 004-progress status

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies — start immediately
- **Phase 2 (Foundational)**: Depends on Phase 1 (Prisma types must exist for stub compilation)
- **Phase 3 (US1)**: Depends on Phase 2 — service and DTOs depend on Prisma types + constants
- **Phase 4 (US2)**: Depends on Phase 3 — getTrackProgress reads VideoProgress records created by report()
- **Phase 5 (US3)**: Depends on Phase 4 — admin endpoint reuses getTrackProgress
- **Phase 6 (Frontend)**: Depends on Phase 3 (POST /api/progress endpoint must exist)
- **Phase 7 (Polish)**: Depends on all previous phases

### User Story Dependencies

- **US1 (P1)**: Start after Phase 2 — no dependency on other stories
- **US2 (P1)**: Start after US1 — reads VideoProgress records created by US1
- **US3 (P2)**: Start after US2 — adds admin endpoint reusing US2 service method
- **Frontend (P1)**: Start after Phase 3 (US1) — posts to the endpoint created in T011

### Parallel Opportunities

- T004, T005, T006 (module skeleton files) — parallel
- T008, T009 (DTOs for US1) — parallel
- T017 (tsc check) — parallel with T018

---

## Parallel Example: Phase 2 Foundational

```
# Launch module skeleton tasks in parallel:
Task A: T004 ProgressModule in backend/src/progress/progress.module.ts
Task B: T005 ProgressService stub in backend/src/progress/progress.service.ts
Task C: T006 ProgressController stub in backend/src/progress/progress.controller.ts
# Then sequentially:
Task D: T007 Register in app.module.ts (depends on module existing)
```

---

## Implementation Strategy

### MVP First (Backend API — US1 + US2 + US3)

1. Complete Phase 1: Prisma schema + generate
2. Complete Phase 2: Constants + module registration
3. Complete Phase 3: US1 — POST /api/progress (report)
4. Complete Phase 4: US2 — GET /api/progress/tracks/:id
5. Complete Phase 5: US3 — admin GET endpoint
6. **VALIDATE**: Run quickstart.md Scenarios 1–11 against live server
7. Complete Phase 6: Frontend player page

### Incremental Delivery

1. Phase 1+2 → TypeScript ready, module registered
2. Phase 3 (US1) → Progress reporting works, test with curl
3. Phase 4 (US2) → Track progress view works, verify Math.max + threshold
4. Phase 5 (US3) → Admin view works
5. Phase 6 → Video player page with 30s interval

---

## Notes

- `npx prisma migrate dev` requires live PostgreSQL — mark T001 migration as manual step, only run `prisma generate` in T002
- Import `PrismaClientKnownRequestError` from `@prisma/client/runtime/client` (NOT `/runtime/library`)
- Import `{ api }` from `@/lib/axios` in frontend (named export, not default)
- `PartialType` / `OmitType` must be from `@nestjs/swagger` (not `@nestjs/mapped-types`)
- The Prisma compound unique key name for `@@unique([userId, videoId])` is `userId_videoId` — used in `where: { userId_videoId: { userId, videoId } }`
- YouTube IFrame API is loaded via `<Script src="..." strategy="afterInteractive" />` (Next.js built-in) — no npm package needed
- Progress errors in the frontend (POST /api/progress fails) MUST be swallowed silently — never interrupt video playback
- WATCH_COMPLETE_THRESHOLD must only appear in `progress.constants.ts` — never hardcode `80` in service logic
