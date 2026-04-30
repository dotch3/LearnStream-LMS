# Research: Tracks and Videos Management

**Feature**: 003-tracks-videos
**Date**: 2026-04-23
**Status**: Complete

---

## Decision 1: Separate TracksModule and VideosModule

**Decision**: Implement two distinct NestJS modules — `TracksModule` and `VideosModule` — following the constitution's modular architecture principle (Principle IV).

**Rationale**: The constitution mandates exactly these domain modules: `tracks` and `videos`. They are separate domains that happen to have a parent-child relationship (one Track has many Videos). Each module manages its own controller, service, and DTOs. `VideosModule` imports `TracksModule` (or `PrismaModule`) to validate that a target `trackId` exists when creating a video.

**Alternatives considered**:
- Single `ContentModule` handling both: Rejected — violates constitution's one-module-per-domain rule.

---

## Decision 2: New Prisma Migration Required

**Decision**: Add `Track` and `Video` models to `backend/prisma/schema.prisma` and run a new migration `add-tracks-videos`. This migration depends on the DB being available.

**Schema additions**:
```prisma
model Track {
  id           String   @id @default(uuid())
  name         String
  description  String?
  thumbnailUrl String?
  isActive     Boolean  @default(true)
  order        Int      @default(0)
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
  videos       Video[]

  @@map("tracks")
}

model Video {
  id           String   @id @default(uuid())
  title        String
  youtubeId    String
  youtubeUrl   String
  description  String?
  thumbnailUrl String?
  duration     Int
  order        Int      @default(0)
  isActive     Boolean  @default(true)
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
  trackId      String
  track        Track    @relation(fields: [trackId], references: [id], onDelete: Cascade)

  @@map("videos")
}
```

**Gotcha (Prisma 7)**: No `url` in `datasource db` — already handled by `prisma.config.ts` + `@prisma/adapter-pg`. Migration command: `npx prisma migrate dev --name add-tracks-videos` (requires live PostgreSQL — mark as manual step).

After adding schema: run `npx prisma generate` to make `Track` and `Video` types available in TypeScript.

**Alternatives considered**: Adding VideoProgress and Certificate models now. Rejected — keep each feature's migration scoped. VideoProgress in 004-progress, Certificate in 005-certificates.

---

## Decision 3: YouTube URL Parsing — Utility Function

**Decision**: Implement a pure utility function `extractYoutubeId(url: string): string | null` that handles three URL formats with regex. No external library.

**Patterns**:
- Watch: `https://www.youtube.com/watch?v=VIDEO_ID` → `/[?&]v=([^&\s]{11})/`
- Short: `https://youtu.be/VIDEO_ID` → `/youtu\.be\/([^?&\s]{11})/`
- Embed: `https://www.youtube.com/embed/VIDEO_ID` → `/embed\/([^?&\s]{11})/`

Returns `null` if no match → service throws `BadRequestException('Invalid YouTube URL')`.

**Rationale**: YouTube video IDs are always 11 characters. A targeted regex per format is reliable and requires no npm dependency. Placed in `backend/src/videos/videos.utils.ts`.

**Alternatives considered**: `youtube-url` npm package. Rejected — lightweight regex is sufficient and avoids dependency.

---

## Decision 4: Role-Based Filtering in Service Layer

**Decision**: Read operations (list tracks, track detail, video list) check `req.user.role` in the controller and pass an `isAdmin: boolean` flag to the service. The service adds `where: { isActive: true }` for Viewers and omits the filter for Admins.

**Pattern**:
```typescript
// controller
const isAdmin = req.user.role === Role.ADMIN;
return this.tracksService.findAll(isAdmin, page, perPage);

// service
async findAll(isAdmin: boolean, page: number, perPage: number) {
  const where = isAdmin ? {} : { isActive: true };
  // ...
}
```

**Rationale**: The route is accessible to both roles (no `@Roles()` on read endpoints), so role filtering must happen in the service. Passing a boolean is simpler than re-reading the role in the service.

**Alternatives considered**: Separate endpoints per role. Rejected — duplicates routing.

---

## Decision 5: Video Count in Track List

**Decision**: Use Prisma's `_count` aggregate with a conditional `where` clause:
- Viewers: `_count: { select: { videos: { where: { isActive: true } } } }`
- Admins: `_count: { select: { videos: true } }`

**Rationale**: Single query, no N+1. Returns `_count.videos` as `videoCount` in the response DTO.

---

## Decision 6: Reordering via Standard Update Endpoint

**Decision**: No separate `/reorder` endpoint. Reordering is done by calling `PATCH /api/tracks/:id` or `PATCH /api/videos/:id` with the `order` field in the body. This is simpler and already covered by `UpdateTrackDto` and `UpdateVideoDto`.

**Rationale**: A dedicated bulk-reorder endpoint adds complexity (needs an array of `{ id, order }` pairs and multiple DB updates). For MVP scope (~20 videos), individual updates via the standard PATCH endpoint are sufficient.

**Alternatives considered**: Bulk `PATCH /api/tracks/reorder` with array payload. Deferred to future enhancement if drag-and-drop UI is implemented.

---

## Decision 7: Track Detail Returns Videos Ordered by `order` ASC

**Decision**: `GET /api/tracks/:id` returns the track with `videos: { orderBy: { order: 'asc' }, where: { isActive: isAdmin ? undefined : true } }`.

**Rationale**: The `order` field defines the intended viewing sequence. Consistent with the spec requirement.

---

## Decision 8: PrismaClientKnownRequestError Import Path

**Decision**: Import from `@prisma/client/runtime/client` (not `/library`).

**Rationale**: Prisma 7 gotcha discovered in 002-users-management. The correct path is `@prisma/client/runtime/client`.

---

## Decision 9: No New npm Packages

**Decision**: No new packages required. All needed: `class-validator`, `class-transformer`, `@nestjs/swagger`, `bcrypt`, `@prisma/client`, `@prisma/adapter-pg` are already installed from 001-auth and 002-users.

---

## TypeScript/NestJS Gotchas (from prior features)

1. `PrismaClientKnownRequestError` → import from `@prisma/client/runtime/client`
2. Axios in frontend → named export `{ api }`, not default
3. `/me/*` ordering pattern — for videos, define specific routes before `/:id`
4. `prisma.config.ts` excluded from `tsconfig.json` — already set
5. After editing `schema.prisma`, run `npx prisma generate` before TypeScript compile
