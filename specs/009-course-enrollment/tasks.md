# Tasks: Course Enrollment System

**Input**: `specs/009-course-enrollment/`
**Branch**: `009-course-enrollment`

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: Which user story this task belongs to

---

## Phase 1: Setup — Prisma Schema & Migration

**Purpose**: Schema changes block all other work.

- [ ] T001 Add enums `TrackVisibility`, `EnrollmentStatus`, `NotificationType` to `backend/prisma/schema.prisma`
- [ ] T002 Replace `Track.isActive Boolean` with `Track.visibility TrackVisibility @default(PUBLIC)` in `backend/prisma/schema.prisma`; add `enrollments Enrollment[]` and `enrollmentCodeTracks EnrollmentCodeTrack[]` relations
- [ ] T003 Add `enrollments Enrollment[]` and `notifications Notification[]` relations to `User` in `backend/prisma/schema.prisma`
- [ ] T004 Add `Enrollment`, `EnrollmentCode`, `EnrollmentCodeTrack`, `Notification` models to `backend/prisma/schema.prisma` (per data-model.md)
- [ ] T005 Create migration file `backend/prisma/migrations/20260428_course_enrollment/migration.sql`: add enums, add `visibility` col, backfill `DRAFT` where `isActive=false`, drop `isActive`, create 4 new tables
- [ ] T006 Run `npx prisma migrate deploy` in `backend/` and verify DB; run `npx prisma generate`

---

## Phase 2: Foundational — Shared Backend Infrastructure

**Purpose**: Guard + notifications service used across all stories.

- [ ] T007 Create `backend/src/notifications/notifications.module.ts` — `@Global()` module exporting `NotificationsService`
- [ ] T008 Create `backend/src/notifications/notifications.service.ts` — methods: `create(userId, type, title, body, data?)`, `findAll(userId, page, perPage)`, `unreadCount(userId)`, `markRead(id, userId)`, `markAllRead(userId)`
- [ ] T009 Create `backend/src/notifications/notifications.controller.ts` — `GET /api/notifications`, `GET /api/notifications/unread-count`, `PATCH /api/notifications/:id/read`, `PATCH /api/notifications/read-all`; all routes require JWT
- [ ] T010 Create `backend/src/auth/guards/enrollment.guard.ts` — reads `trackId` from `req.params`; checks `Enrollment` where `userId=req.user.id AND trackId AND status=APPROVED`; bypasses if `req.user.role === ADMIN`; throws `ForbiddenException` if not enrolled
- [ ] T011 Register `NotificationsModule` in `backend/src/app.module.ts`
- [ ] T012 Add two email templates to `backend/src/mail/mail.service.ts`: `sendEnrollmentApproved(email, name, trackName)` and `sendEnrollmentDenied(email, name, trackName)`

---

## Phase 3: US1+US3 — Request Enrollment & Admin Approve/Deny

**Story goal**: User can request access; admin can approve or deny; both get notified.
**Independent test**: Create user + course → user requests → admin approves → user accesses content.

- [ ] T013 [US1] Create `backend/src/enrollments/dto/request-enrollment.dto.ts` — `@IsUUID() trackId`
- [ ] T014 [US1] Create `backend/src/enrollments/dto/enrollment-response.dto.ts`
- [ ] T015 [US1] Create `backend/src/enrollments/enrollments.service.ts`:
  - `request(userId, trackId)` — upsert: if APPROVED throw 409; if PENDING throw 409; if DENIED reset to PENDING; else create; notify all ADMINs with `NEW_ENROLLMENT_REQUEST`
  - `findAllAdmin(status?, trackId?, page, perPage)` — paginated list with user+track info
  - `findMyEnrollments(userId)` — list own enrollments
  - `approve(id, adminId)` — set APPROVED + resolvedAt; create `ENROLLMENT_APPROVED` notification for user; call `mail.sendEnrollmentApproved()`
  - `deny(id, adminId)` — set DENIED + resolvedAt; create `ENROLLMENT_DENIED` notification; call `mail.sendEnrollmentDenied()`
- [ ] T016 [US1] Create `backend/src/enrollments/enrollments.module.ts`
- [ ] T017 [US1] Create `backend/src/enrollments/enrollments.controller.ts` — `POST /api/enrollments/request` (VIEWER), `GET /api/enrollments/my` (VIEWER), `GET /api/enrollments` (ADMIN), `PATCH /api/enrollments/:id/approve` (ADMIN), `PATCH /api/enrollments/:id/deny` (ADMIN)
- [ ] T018 [US1] Register `EnrollmentsModule` in `backend/src/app.module.ts`
- [ ] T019 [US1] Apply `EnrollmentGuard` to `GET /api/tracks/:id` in `backend/src/tracks/tracks.controller.ts` (skip for ADMIN); apply same guard to `GET /api/videos/:id` in `backend/src/videos/videos.controller.ts`

---

## Phase 4: US2 — Redeem Enrollment Code

**Story goal**: User enters a code and gains immediate access to all linked courses.
**Independent test**: Admin creates code linked to 2 courses → user redeems → user enrolled in both.

- [ ] T020 [US2] Create `backend/src/enrollment-codes/dto/create-enrollment-code.dto.ts` — `code?`, `label?`, `@IsUUID('4', {each:true}) trackIds`, `maxUses?`, `expiresAt?`
- [ ] T021 [US2] Create `backend/src/enrollment-codes/dto/update-enrollment-code.dto.ts` — `PartialType` of create + `isActive?`
- [ ] T022 [US2] Create `backend/src/enrollment-codes/enrollment-codes.service.ts`:
  - `create(dto)` — generates random 8-char code if not provided; creates code + junction records
  - `findAll()` — list with tracks + usedCount
  - `update(id, dto)`
  - `delete(id)`
  - `redeem(userId, rawCode)` — validate active/expiry/maxUses; for each linked track create APPROVED `Enrollment` (skip existing APPROVED); increment `usedCount`; if usedCount >= maxUses set `isActive=false`; return `enrolledTrackIds`
- [ ] T023 [US2] Create `backend/src/enrollment-codes/enrollment-codes.module.ts`
- [ ] T024 [US2] Create `backend/src/enrollment-codes/enrollment-codes.controller.ts` — `POST /api/enrollment-codes` (ADMIN), `GET /api/enrollment-codes` (ADMIN), `PATCH /api/enrollment-codes/:id` (ADMIN), `DELETE /api/enrollment-codes/:id` (ADMIN); `POST /api/enrollments/redeem` (VIEWER) — add redeem endpoint to `EnrollmentsController` calling `EnrollmentCodesService.redeem()`
- [ ] T025 [US2] Register `EnrollmentCodesModule` in `backend/src/app.module.ts`; inject `EnrollmentCodesService` into `EnrollmentsController` for the redeem route

---

## Phase 5: US5 — Course Visibility

**Story goal**: Admin sets visibility per course; listing and detail respect it.
**Independent test**: Set course to LINK_ONLY → not in listing → direct URL works if enrolled.

- [ ] T026 [US5] Add `visibility` field to `backend/src/tracks/dto/create-track.dto.ts` — `@IsEnum(TrackVisibility) @IsOptional() visibility?: TrackVisibility`
- [ ] T027 [US5] Update `backend/src/tracks/tracks.service.ts` `findAll()`:
  - VIEWER: filter `visibility: PUBLIC` only
  - ADMIN: return all visibilities
  - Include `enrollmentStatus` per track for the requesting userId (join Enrollment where userId matches)
- [ ] T028 [US5] Update `backend/src/tracks/tracks.service.ts` `findOne()`: if VIEWER and track is DRAFT → throw `NotFoundException`

---

## Phase 6: US6 — Frontend Notifications Bell

**Story goal**: Both sidebars show a bell with unread count; clicking goes to `/notifications`.
**Independent test**: Approve an enrollment → user sees badge increment on next page load.

- [ ] T029 [P] [US6] Create `frontend/src/components/notifications-bell.tsx` — fetches `GET /api/notifications/unread-count` on mount; shows bell icon + badge if count > 0; links to `/dashboard/notifications`
- [ ] T030 [P] [US6] Create `frontend/src/app/dashboard/notifications/page.tsx` — paginated list of notifications; "Mark all read" button; each item shows title, body, time; clicking marks as read; uses CSS variables for dark mode
- [ ] T031 [US6] Add `<NotificationsBell />` to `frontend/src/app/dashboard/layout.tsx` sidebar header; add "Notifications" nav item
- [ ] T032 [US6] Add `<NotificationsBell />` to `frontend/src/app/admin/layout.tsx` sidebar header; add "Requests" and "Codes" nav items

---

## Phase 7: Frontend — Admin Enrollment Management

- [ ] T033 [P] [US3] Create `frontend/src/app/admin/requests/page.tsx` — table of enrollment requests (user, course, date, status); filter by status (default PENDING); Approve / Deny buttons with confirmation modal; on action reload list; uses CSS vars
- [ ] T034 [P] [US4] Create `frontend/src/app/admin/codes/page.tsx` — list of codes with linked courses, usage, expiry, active toggle; "New Code" button opens inline form (label, code?, trackIds multi-select, maxUses?, expiresAt?); delete button with confirmation

---

## Phase 8: Frontend — Admin Course Form (Visibility)

- [ ] T035 [US5] Update `frontend/src/app/admin/tracks/[id]/page.tsx` — replace active/inactive toggle with `visibility` select (`Public | Link Only | Draft`); update API payload

---

## Phase 9: Frontend — Dashboard Course Enrollment UX

- [ ] T036 [US1] Update `frontend/src/app/dashboard/tracks/page.tsx` — show enrollment status badge per course (`Enrolled` green / `Pending` amber / `Not Enrolled` gray / `Denied` red); badge data from `enrollmentStatus` field in list response
- [ ] T037 [US1] Update `frontend/src/app/dashboard/tracks/[id]/page.tsx`:
  - If `enrollmentStatus === APPROVED` → show video list (existing behaviour)
  - If `enrollmentStatus === PENDING` → show "Request pending — awaiting admin approval" card
  - If `enrollmentStatus === DENIED` → show "Request denied" card + "Request again" button
  - If `enrollmentStatus === NONE` → show enrollment prompt card with two options:
    - "Request Access" button → `POST /api/enrollments/request`
    - "Enter Code" input + "Redeem" button → `POST /api/enrollments/redeem`
  - After successful request: update card to PENDING state without reload

---

## Phase 10: Polish

- [ ] T038 TypeScript check: `cd frontend && npx tsc --noEmit` — fix all errors
- [ ] T039 TypeScript check: `cd backend && npx tsc --noEmit` — fix all errors
- [ ] T040 Verify `GET /api/tracks` VIEWER response no longer includes `isActive` field; response shape matches contracts/api.md
- [ ] T041 Verify EnrollmentGuard correctly returns 403 (not 401) for authenticated but non-enrolled users on `GET /api/tracks/:id` and `GET /api/videos/:id`

---

## Dependencies

```
T001-T006 (schema) → T007-T012 (shared infra) → T013-T019 (US1+US3 backend)
                                                → T020-T025 (US2 backend) [parallel with US1 after T006]
                                                → T026-T028 (US5 backend) [parallel with US1 after T006]
T007-T012 → T029-T032 (notifications bell FE) [parallel with backend work]
T013-T019 → T033 (admin requests FE)
T020-T025 → T034 (admin codes FE)
T026-T028 → T035 (admin course form FE)
T013-T019 → T036-T037 (dashboard FE)
All implementation → T038-T041 (polish)
```

## Parallel Execution Opportunities

After T006 (migration applied):
- **Stream A**: T013→T015→T016→T017→T018→T019 (enrollment request/approve backend)
- **Stream B**: T020→T022→T023→T024→T025 (enrollment codes backend)
- **Stream C**: T026→T027→T028 (visibility backend)
- **Stream D**: T029, T030 (frontend notifications components)

## Total

**41 tasks** | MVP (P1): T001–T019, T036–T037, T038–T041
