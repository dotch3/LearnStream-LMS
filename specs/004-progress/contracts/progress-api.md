# API Contract: Progress Tracking

**Feature**: 004-progress
**Date**: 2026-04-23
**Base URL**: `/api/progress`
**Auth**: Bearer JWT required on all endpoints

---

## POST /api/progress

Report video watch progress. Authenticated user's ID comes from the JWT — never from the body.

**Auth**: Any authenticated user (VIEWER or ADMIN)

**Request Body**:
```json
{
  "videoId": "uuid",
  "watchedSeconds": 240,
  "totalSeconds": 300
}
```

| Field | Type | Validation |
|-------|------|------------|
| videoId | string (UUID) | required, must exist |
| watchedSeconds | integer | required, >= 0 |
| totalSeconds | integer | required, >= 1 |

**Response 200**:
```json
{
  "id": "uuid",
  "videoId": "uuid",
  "watchedSeconds": 240,
  "totalSeconds": 300,
  "percentage": 80,
  "completed": true,
  "lastWatchedAt": "2026-04-23T10:00:00.000Z",
  "updatedAt": "2026-04-23T10:00:00.000Z"
}
```

**Error Responses**:
| Status | Condition |
|--------|-----------|
| 400 | Validation failure (missing fields, totalSeconds < 1, etc.) |
| 404 | Video not found |
| 401 | Missing or invalid JWT |

---

## GET /api/progress/tracks/:trackId

Get the authenticated user's progress on a track. Includes overall percentage, completion status, and per-video breakdown.

**Auth**: Any authenticated user (VIEWER or ADMIN)

**Path Params**: `trackId` — UUID of the track

**Response 200**:
```json
{
  "trackId": "uuid",
  "totalActive": 4,
  "completedCount": 2,
  "overallPercentage": 50,
  "trackComplete": false,
  "videos": [
    {
      "videoId": "uuid",
      "title": "Introduction to Variables",
      "order": 1,
      "percentage": 100,
      "completed": true,
      "lastWatchedAt": "2026-04-23T09:00:00.000Z"
    },
    {
      "videoId": "uuid",
      "title": "Functions and Scope",
      "order": 2,
      "percentage": 45,
      "completed": false,
      "lastWatchedAt": "2026-04-23T09:30:00.000Z"
    },
    {
      "videoId": "uuid",
      "title": "Async/Await",
      "order": 3,
      "percentage": 0,
      "completed": false,
      "lastWatchedAt": null
    }
  ]
}
```

**Error Responses**:
| Status | Condition |
|--------|-----------|
| 404 | Track not found, or track is inactive and requester is VIEWER |
| 401 | Missing or invalid JWT |

---

## GET /api/progress/users/:userId/tracks/:trackId

Admin-only: get any user's progress on a track.

**Auth**: ADMIN role required

**Path Params**:
- `userId` — UUID of the target user
- `trackId` — UUID of the track

**Response 200**: Same shape as `GET /api/progress/tracks/:trackId`

**Error Responses**:
| Status | Condition |
|--------|-----------|
| 403 | Requester is not ADMIN |
| 404 | User not found or track not found |
| 401 | Missing or invalid JWT |

---

## Error Response Shape

All errors follow:
```json
{
  "statusCode": 404,
  "message": "Video not found",
  "error": "Not Found"
}
```
