# Quickstart: Progress Tracking — Manual Test Scenarios

**Feature**: 004-progress
**Date**: 2026-04-23
**Prerequisite**: Backend running, PostgreSQL with migration `add-video-progress` applied, valid JWT tokens for `viewer@test.com` (VIEWER) and `admin@videosyt.com` (ADMIN).

---

## Setup

```bash
VIEWER_TOKEN="<JWT from POST /auth/login as viewer>"
ADMIN_TOKEN="<JWT from POST /auth/login as admin>"
TRACK_ID="<UUID of a track with 3 active videos>"
VIDEO1="<UUID of video 1 in that track>"
VIDEO2="<UUID of video 2>"
VIDEO3="<UUID of video 3>"
```

---

## Scenario 1: Report progress below threshold

```bash
curl -X POST http://localhost:3000/api/progress \
  -H "Authorization: Bearer $VIEWER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"videoId":"'"$VIDEO1"'","watchedSeconds":150,"totalSeconds":300}'
```
**Expected**: `{ percentage: 50, completed: false }`

---

## Scenario 2: Report progress reaching threshold (≥80%)

```bash
curl -X POST http://localhost:3000/api/progress \
  -H "Authorization: Bearer $VIEWER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"videoId":"'"$VIDEO1"'","watchedSeconds":250,"totalSeconds":300}'
```
**Expected**: `{ percentage: 83.33, completed: true }`

---

## Scenario 3: Progress never decrements (rewind to 30%)

```bash
curl -X POST http://localhost:3000/api/progress \
  -H "Authorization: Bearer $VIEWER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"videoId":"'"$VIDEO1"'","watchedSeconds":90,"totalSeconds":300}'
```
**Expected**: `{ percentage: 83.33, completed: true }` — values unchanged

---

## Scenario 4: Get track progress (partial completion)

```bash
curl -X GET "http://localhost:3000/api/progress/tracks/$TRACK_ID" \
  -H "Authorization: Bearer $VIEWER_TOKEN"
```
**Expected**: `{ totalActive: 3, completedCount: 1, overallPercentage: 33, trackComplete: false }`

---

## Scenario 5: Complete all videos → track complete

```bash
# Complete video 2
curl -X POST http://localhost:3000/api/progress \
  -H "Authorization: Bearer $VIEWER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"videoId":"'"$VIDEO2"'","watchedSeconds":240,"totalSeconds":300}'

# Complete video 3
curl -X POST http://localhost:3000/api/progress \
  -H "Authorization: Bearer $VIEWER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"videoId":"'"$VIDEO3"'","watchedSeconds":480,"totalSeconds":600}'

# Check track progress
curl -X GET "http://localhost:3000/api/progress/tracks/$TRACK_ID" \
  -H "Authorization: Bearer $VIEWER_TOKEN"
```
**Expected**: `{ completedCount: 3, overallPercentage: 100, trackComplete: true }`

---

## Scenario 6: Invalid payload — totalSeconds = 0

```bash
curl -X POST http://localhost:3000/api/progress \
  -H "Authorization: Bearer $VIEWER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"videoId":"'"$VIDEO1"'","watchedSeconds":10,"totalSeconds":0}'
```
**Expected**: `400 Bad Request`

---

## Scenario 7: Report for non-existent video

```bash
curl -X POST http://localhost:3000/api/progress \
  -H "Authorization: Bearer $VIEWER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"videoId":"00000000-0000-0000-0000-000000000000","watchedSeconds":100,"totalSeconds":200}'
```
**Expected**: `404 Not Found`

---

## Scenario 8: Admin views another user's progress

```bash
VIEWER_USER_ID="<UUID of the viewer user>"
curl -X GET "http://localhost:3000/api/progress/users/$VIEWER_USER_ID/tracks/$TRACK_ID" \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```
**Expected**: `200 OK` with full track progress breakdown for the viewer user.

---

## Scenario 9: Viewer cannot access another user's progress

```bash
OTHER_USER_ID="<UUID of any other user>"
curl -X GET "http://localhost:3000/api/progress/users/$OTHER_USER_ID/tracks/$TRACK_ID" \
  -H "Authorization: Bearer $VIEWER_TOKEN"
```
**Expected**: `403 Forbidden`

---

## Scenario 10: Track progress excludes inactive video

```bash
# Deactivate video 3 via admin PATCH
curl -X PATCH "http://localhost:3000/api/videos/$VIDEO3" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"isActive": false}'

# Re-check track progress
curl -X GET "http://localhost:3000/api/progress/tracks/$TRACK_ID" \
  -H "Authorization: Bearer $VIEWER_TOKEN"
```
**Expected**: `{ totalActive: 2, completedCount: 2, overallPercentage: 100, trackComplete: true }` — inactive video excluded.

---

## Scenario 11: Unauthenticated request

```bash
curl -X POST http://localhost:3000/api/progress \
  -H "Content-Type: application/json" \
  -d '{"videoId":"'"$VIDEO1"'","watchedSeconds":100,"totalSeconds":200}'
```
**Expected**: `401 Unauthorized`
