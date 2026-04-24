# Data Model: Progress Tracking

**Feature**: 004-progress
**Date**: 2026-04-23

---

## New Entity (requires Prisma migration: `add-video-progress`)

### VideoProgress

| Field | Type | Constraints | Notes |
|-------|------|-------------|-------|
| id | String (UUID) | PK, auto | `@default(uuid())` |
| watchedSeconds | Int | default 0 | Max ever reported |
| totalSeconds | Int | required, > 0 | Duration of the video |
| percentage | Float | default 0 | 0–100, computed from watched/total |
| completed | Boolean | default false | true when percentage >= 80 (WATCH_COMPLETE_THRESHOLD) |
| lastWatchedAt | DateTime | auto-update | Set on every report |
| createdAt | DateTime | auto | `@default(now())` |
| updatedAt | DateTime | auto | `@updatedAt` |
| userId | String | FK → User | `onDelete: Cascade` |
| videoId | String | FK → Video | `onDelete: Cascade` |

**Unique constraint**: `@@unique([userId, videoId])` — one record per user per video.

**Prisma schema**:
```prisma
model VideoProgress {
  id             String   @id @default(uuid())
  watchedSeconds Int      @default(0)
  totalSeconds   Int
  percentage     Float    @default(0)
  completed      Boolean  @default(false)
  lastWatchedAt  DateTime @default(now())
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  userId         String
  user           User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  videoId        String
  video          Video    @relation(fields: [videoId], references: [id], onDelete: Cascade)

  @@unique([userId, videoId])
  @@map("video_progress")
}
```

**Note**: `User` and `Video` models need `progress VideoProgress[]` relation fields added.

---

## No New Tables for Track Progress

Track progress is **computed on-the-fly** from VideoProgress records. See Decision 2 in research.md.

Computation:
```
totalActive = count of active videos in track
completedForUser = count of VideoProgress where userId=X, videoId ∈ activeVideoIds, completed=true
overallPercentage = Math.round((completedForUser / totalActive) * 100)
trackComplete = completedForUser === totalActive && totalActive > 0
```

---

## Named Constant

```typescript
// backend/src/progress/progress.constants.ts
export const WATCH_COMPLETE_THRESHOLD = 80; // percent
```

---

## DTOs

### ReportProgressDto
```
videoId        : string  @IsUUID()
watchedSeconds : number  @IsInt() @Min(0)
totalSeconds   : number  @IsInt() @Min(1)
```

### VideoProgressResponseDto
```
id             : string
videoId        : string
watchedSeconds : number
totalSeconds   : number
percentage     : number
completed      : boolean
lastWatchedAt  : Date
updatedAt      : Date
```

### TrackProgressResponseDto
```
trackId           : string
totalActive       : number
completedCount    : number
overallPercentage : number    (0–100, integer)
trackComplete     : boolean
videos            : VideoProgressSummaryDto[]
```

### VideoProgressSummaryDto (used inside TrackProgressResponseDto)
```
videoId        : string
title          : string
order          : number
percentage     : number
completed      : boolean
lastWatchedAt  : Date | null   (null if no progress record)
```

---

## State Transitions

### VideoProgress.completed
```
NOT_STARTED (no record)
  → IN_PROGRESS (percentage 0–79, completed=false)  [first report < 80%]
  → COMPLETED (percentage ≥ 80, completed=true)      [report ≥ 80% or direct jump]

COMPLETED is a terminal state — no transition back.
```

### Track completion
```
0% (no progress)
  → N% (some videos completed)
  → 100% (all active videos completed) = trackComplete=true
  → N% (if new video added, denominator grows)   ← percentage can decrease
```
