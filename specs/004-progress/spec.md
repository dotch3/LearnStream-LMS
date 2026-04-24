# Feature Specification: Progress Tracking

**Feature Branch**: `004-progress-tracking`
**Created**: 2026-04-23
**Status**: Draft

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Report Video Progress (Priority: P1)

While a user watches a video, the player periodically reports how many seconds have been watched and the total duration. The system records the maximum position reached for that user and video combination, ensuring that rewinding never reduces the stored progress. When the watched percentage crosses 80%, the video is permanently marked as complete.

**Why this priority**: Core of the feature — without progress reporting, none of the other stories are possible.

**Independent Test**: Send a progress report for a video with 80%+ watched; verify the video is marked complete. Send a second report with lower percentage; verify progress did not decrease.

**Acceptance Scenarios**:

1. **Given** a user is watching a video at 50%, **When** the player sends `{ videoId, watchedSeconds, totalSeconds }` with 50% coverage, **Then** the system stores percentage=50, completed=false for that user+video.
2. **Given** a user's stored progress is 70%, **When** a new report arrives with 30% coverage, **Then** the stored progress remains 70% (no decrement).
3. **Given** a user's stored progress is 75%, **When** a new report arrives with 80%+ coverage, **Then** the video is marked completed=true and that status never reverts.
4. **Given** a video has no prior progress record for a user, **When** the first report arrives, **Then** a new record is created starting from the reported percentage.
5. **Given** a completed video (completed=true), **When** any new report arrives with any percentage, **Then** completed remains true and percentage is still Math.max(stored, new).

---

### User Story 2 — View Track Progress (Priority: P1)

A user can request their progress summary for any track: the overall completion percentage, how many videos are complete, and per-video status. Inactive videos are excluded from the calculation.

**Why this priority**: Directly tied to US1 — the data collected in US1 is surfaced here. Users need to see their progress to stay motivated.

**Independent Test**: After completing 2 of 3 active videos in a track, GET track progress and verify overall_percentage=66, completed_count=2, total_active=3.

**Acceptance Scenarios**:

1. **Given** a track with 4 active videos and a user who completed 2, **When** the user requests track progress, **Then** the response shows overall_percentage=50, completed_count=2, total_active=4.
2. **Given** a track has 1 inactive video and 3 active videos, **When** progress is calculated, **Then** the inactive video is not counted in total_active or the numerator.
3. **Given** a user has no progress records for a track, **When** they request track progress, **Then** overall_percentage=0, completed_count=0.
4. **Given** a user completed all active videos in a track, **When** they request track progress, **Then** overall_percentage=100 and track_complete=true.

---

### User Story 3 — Admin Views User Progress (Priority: P2)

An admin can view any user's progress on any track, including per-video breakdown. This gives admins visibility into learner engagement without modifying data.

**Why this priority**: Valuable for oversight but does not affect the core tracking data flow. Admins can still manage the platform without this view.

**Independent Test**: As admin, GET progress for user X on track Y; verify response matches the per-video records created by US1.

**Acceptance Scenarios**:

1. **Given** user X has watched 3 videos in track Y, **When** admin requests GET /api/progress/users/:userId/tracks/:trackId, **Then** the response includes per-video details (percentage, completed, lastWatchedAt) plus overall track percentage.
2. **Given** user X has no progress in track Y, **When** admin requests the same endpoint, **Then** response shows 0% with empty per-video list (or all at 0).
3. **Given** a viewer tries to access another user's progress, **When** the request is made, **Then** the system returns 403 Forbidden.

---

### Edge Cases

- What if `totalSeconds` sent by the client is 0 or negative? → The system rejects the report with a validation error (400).
- What if the same user+video report arrives multiple times (client retry)? → Idempotent: only the max is stored, no duplicates created.
- What if a video is deactivated after a user completed it? → The completed record remains; the video is excluded from future track-percentage calculations.
- What if a track has 0 active videos? → Track progress returns 0%, track_complete=false (divide-by-zero guard).
- What if a new active video is added to an already-100% track? → Track percentage drops below 100% for all users who hadn't watched the new video.

---

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST accept progress reports with `videoId`, `watchedSeconds`, and `totalSeconds` from authenticated users.
- **FR-002**: The system MUST compute `percentage = (watchedSeconds / totalSeconds) * 100` and store it, never allowing it to decrease below the previously stored value.
- **FR-003**: The system MUST mark a video as `completed = true` when the stored percentage first reaches or exceeds 80%. The 80% threshold MUST be a named constant, not a magic number.
- **FR-004**: Once a video is marked `completed = true`, it MUST remain complete regardless of future progress reports.
- **FR-005**: Each user's progress for a video MUST be stored as a unique record (one record per user+video pair). If a record does not exist, it is created on first report.
- **FR-006**: The system MUST expose an endpoint for a user to retrieve their own progress on a track, including: overall_percentage, completed_count, total_active_video_count, track_complete flag, and a per-video breakdown.
- **FR-007**: Track overall_percentage MUST equal `(count of completed active videos / count of total active videos) * 100`, rounded to the nearest integer.
- **FR-008**: Inactive videos MUST be excluded from track completion calculations.
- **FR-009**: An admin MUST be able to retrieve any user's progress on any track via a dedicated endpoint.
- **FR-010**: Non-admin users MUST NOT be able to access another user's progress data; such requests return 403.
- **FR-011**: The progress report endpoint MUST validate that `watchedSeconds` and `totalSeconds` are positive integers and that `totalSeconds > 0`.
- **FR-012**: The system MUST reject progress reports for videos that do not exist, returning 404.

### Key Entities

- **VideoProgress**: Tracks a single user's viewing state for a single video. Key attributes: userId, videoId, watchedSeconds (max ever seen), totalSeconds, percentage (0–100), completed (boolean), lastWatchedAt.
- **Track Progress (computed)**: Not persisted — derived on request from all VideoProgress records for a user across a track's active videos. Includes overall_percentage, completed_count, total_active, track_complete.

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A progress report submitted while a video plays is reflected in the user's track progress view immediately (within the same session).
- **SC-002**: A user who watches at least 80% of every active video in a track sees their track marked as 100% complete.
- **SC-003**: Rewinding a video and re-reporting a lower position does not reduce the previously recorded percentage — verified across 100% of test cases.
- **SC-004**: An admin can retrieve any user's full track progress breakdown without errors.
- **SC-005**: The system correctly excludes inactive videos from all track completion calculations — verified across all edge cases (deactivated mid-watch, added after completion, etc.).

---

## Assumptions

- The frontend video player is responsible for sending progress every 30 seconds during active playback; the backend does not enforce the interval.
- `totalSeconds` sent by the client matches the video's stored `duration` field; minor discrepancies are accepted (the stored percentage is authoritative).
- Progress data is retained indefinitely for active users; no expiry policy is required in this feature.
- The authenticated user's ID is available from the JWT access token on every request — the backend never trusts a userId sent in the request body for self-reporting.
- Track progress is computed on-the-fly from VideoProgress records; no separate "TrackProgress" table is needed for this feature's scope.
- Certificate eligibility (track_complete=true) is read by the future 005-certificates feature from the computed track progress; no event/queue mechanism is needed in this feature.
