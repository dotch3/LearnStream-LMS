# Data Model: Tracks and Videos

**Feature**: 003-tracks-videos
**Date**: 2026-04-23

---

## New Entities (require Prisma migration: `add-tracks-videos`)

### Track

| Field | Type | Constraints | Notes |
|-------|------|-------------|-------|
| id | String (UUID) | PK, auto | `@default(uuid())` |
| name | String | required | min 1 char |
| description | String? | optional | |
| thumbnailUrl | String? | optional | URL |
| isActive | Boolean | default true | false = hidden from Viewers |
| order | Int | default 0 | display order, ascending |
| createdAt | DateTime | auto | `@default(now())` |
| updatedAt | DateTime | auto | `@updatedAt` |

**Relations**: `videos Video[]` (cascade delete)

---

### Video

| Field | Type | Constraints | Notes |
|-------|------|-------------|-------|
| id | String (UUID) | PK, auto | `@default(uuid())` |
| title | String | required | min 1 char |
| youtubeId | String | required | extracted from URL, 11 chars |
| youtubeUrl | String | required | original URL provided by admin |
| description | String? | optional | |
| thumbnailUrl | String? | optional | URL, provided manually |
| duration | Int | required, min 1 | seconds |
| order | Int | default 0 | display order within track |
| isActive | Boolean | default true | false = hidden from Viewers |
| createdAt | DateTime | auto | |
| updatedAt | DateTime | auto | |
| trackId | String | FK → Track | `onDelete: Cascade` |

---

## State Transitions

### Track Visibility
```
ACTIVE (isActive=true) — visible to all authenticated users
  ↕ [Admin toggles via PATCH /api/tracks/:id]
INACTIVE (isActive=false) — visible only to Admins
```

### Video Visibility
```
ACTIVE (isActive=true) — visible in track detail for all users
  ↕ [Admin toggles via PATCH /api/videos/:id]
INACTIVE (isActive=false) — visible in track detail only for Admins
```

---

## Cascade Behavior

```
DELETE Track
  → cascades to: Video (all in track)
  → cascades via Video to: VideoProgress (future — 004-progress)
  → cascades to: Certificate (future — 005-certificates)

DELETE Video
  → cascades to: VideoProgress (future — 004-progress)
```

Note: `VideoProgress` and `Certificate` models will be added in features 004 and 005. The Prisma `onDelete: Cascade` on those future models will automatically handle cascade from Track/Video deletion.

---

## DTOs

### CreateTrackDto
```
name         : string  @IsString() @MinLength(1)
description? : string  @IsString() @IsOptional()
thumbnailUrl?: string  @IsUrl() @IsOptional()
order?       : number  @IsInt() @IsOptional()
```

### UpdateTrackDto — PartialType(CreateTrackDto) + isActive
```
name?        : string  @IsOptional()
description? : string  @IsOptional()
thumbnailUrl?: string  @IsOptional()
order?       : number  @IsOptional()
isActive?    : boolean @IsBoolean() @IsOptional()
```

### TrackResponseDto
```
id           : string
name         : string
description  : string | null
thumbnailUrl : string | null
isActive     : boolean
order        : number
videoCount   : number   (computed: active count for Viewers, all for Admins)
createdAt    : Date
updatedAt    : Date
```

### TrackDetailDto extends TrackResponseDto
```
+ videos: VideoSummaryDto[]   (ordered by order ASC)
```

### CreateVideoDto
```
title        : string  @IsString() @MinLength(1)
youtubeUrl   : string  @IsString() (parsed to extract youtubeId)
description? : string  @IsString() @IsOptional()
thumbnailUrl?: string  @IsUrl() @IsOptional()
duration     : number  @IsInt() @Min(1)
trackId      : string  @IsUUID()
order?       : number  @IsInt() @IsOptional()
```

### UpdateVideoDto — PartialType of CreateVideoDto (minus trackId)
```
All fields optional. trackId not updatable (video stays in its original track).
isActive added: @IsBoolean() @IsOptional()
```

### VideoResponseDto
```
id           : string
title        : string
youtubeId    : string
youtubeUrl   : string
description  : string | null
thumbnailUrl : string | null
duration     : number
order        : number
isActive     : boolean
trackId      : string
createdAt    : Date
updatedAt    : Date
```

### VideoSummaryDto (used in track detail video list)
```
id           : string
title        : string
youtubeId    : string
thumbnailUrl : string | null
duration     : number
order        : number
isActive     : boolean
```
