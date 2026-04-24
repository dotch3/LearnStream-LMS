# Research: Progress Tracking

**Feature**: 004-progress
**Date**: 2026-04-23
**Status**: Complete

---

## Decision 1: VideoProgress Upsert via Prisma

**Decision**: Use `prisma.videoProgress.upsert` with `@@unique([userId, videoId])` to handle both create and update in a single query. The `update` side uses `Math.max` logic implemented at the application level: fetch existing record, compute new values, then upsert.

**Rationale**: `upsert` guarantees atomicity at the DB level for the unique constraint. Prisma's `upsert` does not natively support conditional-max update expressions, so the service fetches the existing record first, computes `Math.max(existing.percentage, newPercentage)`, then calls `prisma.videoProgress.upsert`. For MVP scale (~50 users), this two-step approach is safe. A raw SQL `INSERT ... ON CONFLICT DO UPDATE SET percentage = GREATEST(...)` is the production-optimal alternative but adds complexity not warranted at this scale.

**Alternatives considered**:
- Raw SQL `GREATEST()` upsert: optimal but bypasses Prisma type safety — deferred.
- Separate create/update paths: requires `findUnique` + conditional logic + two queries — equivalent overhead, less clarity.

---

## Decision 2: Track Progress Computed On-The-Fly

**Decision**: Track completion percentage is computed on every GET request by counting VideoProgress records for the user+track combination. No separate `TrackProgress` table is created.

**Rationale**: MVP has ~50 users and ~20 videos per track (≤1000 VideoProgress rows total). A single `prisma.videoProgress.findMany` filtered by userId + trackId returns in <10ms at this scale. The spec explicitly states this is computed, not persisted. A materialised TrackProgress table would require invalidation triggers (when video is deactivated, when new video added) — unnecessary complexity.

**Alternatives considered**:
- Persist TrackProgress: adds consistency complexity; would need invalidation on video add/deactivate — deferred to a future optimisation if scale demands it.
- Redis cache: overkill for MVP scale.

---

## Decision 3: Named Constant WATCH_COMPLETE_THRESHOLD

**Decision**: Define `export const WATCH_COMPLETE_THRESHOLD = 80;` in `backend/src/progress/progress.constants.ts`. The service imports and uses this constant exclusively — no inline `80` anywhere.

**Rationale**: Constitution Principle III explicitly mandates this. A dedicated constants file makes the threshold easy to find and change without searching for magic numbers. If the threshold needed to be track-level configurable in the future, this single file is the only change point.

**Alternatives considered**:
- NestJS ConfigService: overkill — this is a business constant, not an environment variable.
- Enum: single numeric value doesn't warrant an enum.

---

## Decision 4: Progress Report DTO — userId from JWT only

**Decision**: `ReportProgressDto` contains only `videoId`, `watchedSeconds`, `totalSeconds`. The `userId` is NEVER accepted from the request body — always extracted from `req.user.sub` (the JWT payload). The service signature is `report(userId: string, dto: ReportProgressDto)`.

**Rationale**: Constitution Principle I mandates that authenticated identity comes from the JWT, not client-supplied data. Accepting userId in the body would allow a user to report progress on behalf of another user.

---

## Decision 5: Admin Progress Endpoint — No Separate AdminProgress Module

**Decision**: Admin's ability to view any user's progress is implemented as an additional endpoint in `ProgressModule` (not a separate admin module), protected by `@Roles(Role.ADMIN)`. The endpoint is `GET /api/progress/users/:userId/tracks/:trackId`.

**Rationale**: Constitution Principle IV mandates one module per domain. Progress is the domain — admin oversight is just a different view of the same data. A separate admin module would duplicate service logic.

---

## Decision 6: Frontend Progress Reporting — setInterval with Cleanup

**Decision**: The video player page uses `setInterval(reportProgress, 30000)` that starts when the video plays and clears on pause, video end, or component unmount. `reportProgress` calls `POST /api/progress` silently (errors do not interrupt playback).

**Rationale**: The spec defines 30-second reporting during active playback only. setInterval is straightforward and sufficient. The interval MUST be cleared on unmount to avoid memory leaks and phantom requests after navigation.

**Pattern**:
```typescript
useEffect(() => {
  if (!isPlaying) return;
  const id = setInterval(reportProgress, 30_000);
  return () => clearInterval(id);
}, [isPlaying, currentTime]);
```

---

## Decision 7: No New npm Packages Required

**Decision**: All required functionality uses existing installed packages: `@nestjs/common`, `@prisma/client`, `class-validator`, `class-transformer`, `@nestjs/swagger`.

**Rationale**: Same pattern as 003-tracks-videos. YouTube IFrame API for the player is loaded via a `<Script>` tag (Next.js built-in) — no npm package needed.

---

## Decision 8: PrismaClientKnownRequestError Import Path

**Decision**: Import from `@prisma/client/runtime/client` (established in 002-users-management).

**Rationale**: Prisma 7 gotcha — same as prior features.

---

## Decision 9: Video Player Page Route

**Decision**: The video player page lives at `frontend/src/app/dashboard/tracks/[id]/videos/[videoId]/page.tsx`. It embeds the YouTube IFrame API via `@next/script` strategy `"afterInteractive"` and dispatches progress to `POST /api/progress` every 30 seconds during playback.

**Rationale**: Follows the established App Router path from 003-tracks-videos (`dashboard/tracks/[id]` already exists). The `[videoId]` segment was referenced in the track detail page as a future link — this feature fills it in.
