# Data Model: Course Enrollment System

## Prisma Schema Changes

### New Enum: TrackVisibility

```prisma
enum TrackVisibility {
  PUBLIC     // visible in listing to all authenticated users
  LINK_ONLY  // not in listing; accessible via direct URL if enrolled
  DRAFT      // invisible to non-admins; replaces isActive=false
}
```

### New Enum: EnrollmentStatus

```prisma
enum EnrollmentStatus {
  PENDING
  APPROVED
  DENIED
}
```

### New Enum: NotificationType

```prisma
enum NotificationType {
  ENROLLMENT_APPROVED
  ENROLLMENT_DENIED
  NEW_ENROLLMENT_REQUEST
}
```

### Modified: Track

```prisma
model Track {
  // remove: isActive Boolean
  // add:
  visibility   TrackVisibility @default(PUBLIC)
  enrollments  Enrollment[]
  enrollmentCodeTracks EnrollmentCodeTrack[]
}
```

### Modified: User

```prisma
model User {
  // add:
  enrollments   Enrollment[]
  notifications Notification[]
}
```

### New: Enrollment

```prisma
model Enrollment {
  id          String           @id @default(uuid())
  status      EnrollmentStatus @default(PENDING)
  requestedAt DateTime         @default(now())
  resolvedAt  DateTime?

  userId  String
  user    User   @relation(fields: [userId], references: [id], onDelete: Cascade)

  trackId String
  track   Track  @relation(fields: [trackId], references: [id], onDelete: Cascade)

  @@unique([userId, trackId])
  @@map("enrollments")
}
```

### New: EnrollmentCode

```prisma
model EnrollmentCode {
  id        String    @id @default(uuid())
  code      String    @unique
  label     String?
  maxUses   Int?
  usedCount Int       @default(0)
  expiresAt DateTime?
  isActive  Boolean   @default(true)
  createdAt DateTime  @default(now())

  tracks EnrollmentCodeTrack[]

  @@map("enrollment_codes")
}
```

### New: EnrollmentCodeTrack (junction)

```prisma
model EnrollmentCodeTrack {
  codeId  String
  trackId String

  code  EnrollmentCode @relation(fields: [codeId], references: [id], onDelete: Cascade)
  track Track          @relation(fields: [trackId], references: [id], onDelete: Cascade)

  @@id([codeId, trackId])
  @@map("enrollment_code_tracks")
}
```

### New: Notification

```prisma
model Notification {
  id        String           @id @default(uuid())
  type      NotificationType
  title     String
  body      String
  read      Boolean          @default(false)
  data      Json?
  createdAt DateTime         @default(now())

  userId String
  user   User   @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@map("notifications")
}
```

## Migration Plan

1. Migration `009-course-enrollment`:
   - Add enums: `TrackVisibility`, `EnrollmentStatus`, `NotificationType`
   - Add `visibility` column to `tracks` with default `PUBLIC`
   - Backfill: `UPDATE tracks SET visibility = 'DRAFT' WHERE "isActive" = false`
   - Drop `isActive` from `tracks`
   - Create `enrollments`, `enrollment_codes`, `enrollment_code_tracks`, `notifications` tables

## State Transitions

### Enrollment Status

```
(none) → PENDING   [user submits request or redeems code creates APPROVED directly]
PENDING → APPROVED [admin approves]
PENDING → DENIED   [admin denies]
DENIED  → PENDING  [user re-submits after denial]
```

### Track Visibility

```
DRAFT → PUBLIC     [admin publishes]
DRAFT → LINK_ONLY  [admin publishes as private]
PUBLIC → DRAFT     [admin unpublishes]
PUBLIC → LINK_ONLY [admin changes to private]
LINK_ONLY → PUBLIC
LINK_ONLY → DRAFT
```
