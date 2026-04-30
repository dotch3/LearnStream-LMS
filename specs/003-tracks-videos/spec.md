# Feature Specification: Tracks and Videos Management

**Feature Branch**: `003-tracks-videos`
**Created**: 2026-04-23
**Status**: Draft
**Input**: User description: "Create the tracks and videos management feature for the VideosYT training platform."

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Admin Manages Tracks (Priority: P1)

An administrator can create, edit, reorder, toggle visibility, and delete training tracks. Tracks are the top-level containers that group related videos into a cohesive course. Any authenticated user can browse the list of active tracks.

**Why this priority**: Tracks are the fundamental content structure — without them, videos have no home and the platform has no content to display.

**Independent Test**: Can be tested by creating a track, verifying it appears in the list for all authenticated users, toggling it inactive and confirming Viewers no longer see it, then deleting it and verifying the deletion.

**Acceptance Scenarios**:

1. **Given** an authenticated admin, **When** they create a track with a name, description, and thumbnail URL, **Then** the track is saved and appears in the track list with the provided data and `isActive: true` by default.
2. **Given** an authenticated admin, **When** they attempt to create a track without a name, **Then** the system returns a validation error.
3. **Given** an authenticated admin, **When** they update a track's name and description, **Then** the changes are persisted and returned.
4. **Given** an authenticated admin, **When** they set a track's `isActive` to false, **Then** Viewer users no longer see the track in the list, but Admin users still do (marked as inactive).
5. **Given** an authenticated admin, **When** they update the `order` field of multiple tracks via the reorder endpoint, **Then** the tracks appear in the specified order for all users.
6. **Given** an authenticated admin, **When** they delete a track, **Then** the track, all its videos, all associated progress records, and all associated certificates are permanently removed.
7. **Given** an authenticated VIEWER, **When** they attempt to create, edit, or delete a track, **Then** the system returns a forbidden error.
8. **Given** any authenticated user, **When** they list tracks, **Then** they receive a list of tracks each showing name, description, thumbnail, video count, and active status.

---

### User Story 2 — Admin Manages Videos within a Track (Priority: P1)

An administrator can add, edit, reorder, toggle visibility, and delete videos within a track. Each video is backed by a YouTube URL; the system extracts the YouTube video ID automatically. Any authenticated user can view the ordered list of active videos for a track.

**Why this priority**: Videos are the actual learning content. Without video management, the platform has no playable content.

**Independent Test**: Can be tested by adding a video to a track, verifying the YouTube ID was extracted correctly, viewing the track detail to confirm the video appears, toggling it inactive to confirm Viewers cannot see it, then deleting it.

**Acceptance Scenarios**:

1. **Given** an authenticated admin and an existing track, **When** they add a video with a YouTube URL, title, and duration, **Then** the video is saved with the YouTube ID extracted from the URL and appears in the track's video list.
2. **Given** an authenticated admin, **When** they provide an invalid YouTube URL (not recognizable as a YouTube video link), **Then** the system returns a validation error.
3. **Given** an authenticated admin, **When** they update a video's title and description, **Then** the changes are persisted.
4. **Given** an authenticated admin, **When** they set a video's `isActive` to false, **Then** Viewer users no longer see the video in the track detail, but Admin users still see it (marked as inactive).
5. **Given** an authenticated admin, **When** they reorder videos within a track, **Then** the videos appear in the updated order when the track detail is fetched.
6. **Given** an authenticated admin, **When** they delete a video, **Then** the video and all its progress records are permanently removed.
7. **Given** any authenticated user, **When** they view a track's detail, **Then** they see the track's metadata and an ordered list of its active videos (title, duration, thumbnail, order number).

---

### User Story 3 — Users Browse Track Detail and Video Detail (Priority: P1)

Any authenticated user can view the full details of a track (including its ordered active video list) and the details of a specific video (including the YouTube video ID needed for embedding). This is the read-only viewing experience that powers the Viewer dashboard.

**Why this priority**: Without this, users cannot navigate to content — the core browsing experience is broken.

**Independent Test**: Can be tested by fetching a track's detail and verifying the video list is ordered, then fetching a specific video's detail and confirming the YouTube ID is present and accurate.

**Acceptance Scenarios**:

1. **Given** any authenticated user, **When** they request a track's detail, **Then** they receive the track metadata plus an ordered list of active videos sorted by `order` ascending.
2. **Given** any authenticated user, **When** they request a video's detail, **Then** they receive the video's title, YouTube video ID, description, duration, and parent track name.
3. **Given** a Viewer requesting a track that is inactive, **Then** the system returns a not-found error (inactive content is invisible to Viewers).
4. **Given** any authenticated user requesting a non-existent track or video ID, **Then** the system returns a not-found error.

---

### User Story 4 — Frontend Pages for Browsing and Admin Management (Priority: P2)

The platform provides a Viewer-facing dashboard page listing all active tracks with progress indicators, a track detail page showing ordered videos, and an Admin interface for managing tracks and their videos.

**Why this priority**: The backend API (US1–US3) is the MVP. Frontend pages are valuable but the API can be tested independently; the UI is built on top.

**Independent Test**: Can be tested by navigating the dashboard to confirm tracks appear in order, clicking through to a track detail, and verifying an Admin can use the management pages to add and edit tracks and videos.

**Acceptance Scenarios**:

1. **Given** an authenticated user on the dashboard, **When** they view the tracks list page, **Then** they see cards for each active track ordered by `order`, showing name, thumbnail, and video count.
2. **Given** an authenticated user, **When** they navigate to a track's detail page, **Then** they see the track info and an ordered list of active video cards (title, duration, thumbnail).
3. **Given** an authenticated admin on the admin panel, **When** they navigate to track management, **Then** they see all tracks (including inactive), can create a new track, and can edit or delete existing ones.
4. **Given** an authenticated admin, **When** they navigate to a track's video management page, **Then** they can add, edit, delete, and reorder videos within that track.

---

### Edge Cases

- What happens when an admin deletes a track that has active user progress? → All progress records are deleted (cascade). Users lose their progress data for that track.
- What happens when a YouTube URL format is not recognised (e.g., short links, embed URLs)? → The system rejects the URL with a validation error and the video is not created.
- What happens when two tracks have the same `order` value? → The system allows it; display order for equal values is undefined (insertion order by default).
- What happens when a Viewer requests an inactive track's detail directly by ID? → The system returns 404 (same as not found) — no information about existence is leaked.
- What happens when an admin tries to add a video to a non-existent track ID? → The system returns 404 for the track.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST allow ADMINs to create tracks with a required name and optional description, thumbnail URL, and display order.
- **FR-002**: System MUST allow ADMINs to update any field of a track (name, description, thumbnailUrl, order, isActive).
- **FR-003**: System MUST allow ADMINs to delete a track, permanently removing all associated videos, progress records, and certificates.
- **FR-004**: System MUST allow ADMINs to set a track's `isActive` flag; inactive tracks MUST NOT appear in Viewer-facing responses.
- **FR-005**: System MUST allow ADMINs to reorder tracks by updating the `order` field.
- **FR-006**: System MUST allow any authenticated user to list tracks; Viewers see only active tracks, Admins see all.
- **FR-007**: System MUST allow ADMINs to add a video to a track by providing a YouTube URL, title, duration, and optional description and thumbnail.
- **FR-008**: System MUST automatically extract the YouTube video ID from any standard YouTube URL (watch, short, embed formats) upon video creation.
- **FR-009**: System MUST reject video creation requests where the YouTube URL cannot be parsed to extract a valid video ID.
- **FR-010**: System MUST allow ADMINs to update any field of a video (title, description, thumbnailUrl, duration, order, isActive).
- **FR-011**: System MUST allow ADMINs to delete a video, permanently removing all associated progress records.
- **FR-012**: System MUST allow ADMINs to set a video's `isActive` flag; inactive videos MUST NOT appear in Viewer-facing track detail responses.
- **FR-013**: System MUST allow ADMINs to reorder videos within a track by updating the `order` field.
- **FR-014**: System MUST allow any authenticated user to view a track's detail: metadata plus ordered list of active videos.
- **FR-015**: System MUST allow any authenticated user to view a specific video's detail including the YouTube video ID.
- **FR-016**: System MUST restrict all write operations (create, update, delete, reorder, toggle) to ADMIN role; Viewers receive 403 Forbidden.
- **FR-017**: System MUST expose YouTube video IDs only to authenticated users — no public endpoints.

### Key Entities

- **Track**: Represents a training course. Key attributes: unique identifier, name, description (optional), thumbnail image URL (optional), active status, display order, video count, creation and update timestamps.
- **Video**: Represents a single lesson within a track. Key attributes: unique identifier, title, YouTube video ID (extracted), original YouTube URL, description (optional), thumbnail image URL (optional), duration in seconds, display order within the track, active status, parent track reference, creation and update timestamps.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: An admin can create a new track and have it appear in the public track list in under 30 seconds from form submission.
- **SC-002**: The track list loads within 2 seconds for up to 50 tracks.
- **SC-003**: Toggling a track or video inactive takes effect immediately — the item disappears from Viewer responses on the next request with no delay.
- **SC-004**: 100% of YouTube URL formats tested (watch, youtu.be short links, embed URLs) are correctly parsed to extract the video ID, verified by automated scan.
- **SC-005**: An admin can delete a track and verify within 5 seconds that all associated videos are also gone.
- **SC-006**: Viewer users have zero ability to access inactive track or video details — all such requests return a not-found response.

## Assumptions

- The authentication and user management features (001-auth, 002-users) are already in place; this feature builds on top of the existing JWT guard and RolesGuard infrastructure.
- YouTube URL formats to support: `https://www.youtube.com/watch?v=VIDEO_ID`, `https://youtu.be/VIDEO_ID`, `https://www.youtube.com/embed/VIDEO_ID`. Other formats are rejected.
- The `order` field is a simple integer; there is no automatic gap management — the admin provides the desired order values.
- Video `thumbnailUrl` is an optional field the admin can provide manually; automatic thumbnail fetching from YouTube is out of scope (handled by the import feature).
- Track deletion is a hard delete with cascade — there is no soft delete for tracks or videos (only Users use soft delete per the constitution).
- The track detail endpoint returns only `active` videos for all users when the caller is a Viewer; when the caller is an Admin, all videos (including inactive) are returned.
- Duration is entered manually by the admin in seconds; there is no automatic duration detection from YouTube in this feature.
- The `videoCount` field shown in track list responses is computed dynamically (count of active videos for Viewers, all videos for Admins).
