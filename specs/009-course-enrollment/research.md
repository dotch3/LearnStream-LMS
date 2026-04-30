# Research: Course Enrollment System

## Decision 1: Track Visibility Migration

- **Decision**: Replace `Track.isActive: Boolean` with `Track.visibility: TrackVisibility` enum (`PUBLIC | LINK_ONLY | DRAFT`).
- **Rationale**: Three distinct states — `DRAFT` replaces `isActive=false`; `PUBLIC` replaces `isActive=true`; `LINK_ONLY` is new. Migration: `isActive=true → PUBLIC`, `isActive=false → DRAFT`.
- **Migration**: Prisma `@default(PUBLIC)`, data migration SQL to backfill existing rows.

## Decision 2: Enrollment Uniqueness & Re-request

- **Decision**: `@@unique([userId, trackId])` on `Enrollment`. On re-request after DENIED: `upsert` resetting status to PENDING. On re-request when PENDING or APPROVED: 409 Conflict.
- **Rationale**: Spec allows re-submit after denial. DB constraint prevents duplicates at DB level.

## Decision 3: Enrollment Code Design

- **Decision**: Code is a standalone entity linked to tracks via `EnrollmentCodeTrack` junction. Redeeming creates one `Enrollment` per linked track (APPROVED status, skipping existing ones). Code uniqueness enforced at DB level.
- **Code generation**: Server generates a random 8-char alphanumeric string if admin doesn't provide one; admin may override with custom string.
- **Validation order**: active → not expired → under maxUses → then create enrollments.

## Decision 4: Notification Delivery

- **Decision**: In-platform notifications stored in `Notification` table. Polled on page load/navigation (no WebSocket). Email sent via existing MailService for approve/deny events. Admin notification is in-platform only (no email to admin for each request).
- **Rationale**: WebSocket is out of scope per spec assumptions. MailService already exists.

## Decision 5: Access Control Guard

- **Decision**: New `EnrollmentGuard` checks `Enrollment.status === APPROVED` for the requesting user + trackId. Applied to `GET /api/tracks/:id` (detail) and `GET /api/videos/:id`. ADMIN role bypasses. Track listing (`GET /api/tracks`) is NOT guarded — visibility filtering happens there instead.
- **Rationale**: Listing uses visibility to control appearance; content detail uses enrollment to control access.

## Decision 6: Notification Types

```
ENROLLMENT_APPROVED   → sent to user when admin approves
ENROLLMENT_DENIED     → sent to user when admin denies
NEW_ENROLLMENT_REQUEST → sent to all ADMIN users when a new request is submitted
```
