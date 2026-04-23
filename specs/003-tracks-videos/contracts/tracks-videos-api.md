# API Contract: Tracks & Videos Module

**Feature**: 003-tracks-videos
**Auth**: All endpoints require JWT Bearer token

---

## Tracks Endpoints

### GET /api/tracks — List Tracks

**Auth**: Any authenticated user
**Query**: `page` (default 1), `perPage` (default 20)
**Behaviour**: Viewers see only `isActive: true` tracks. Admins see all.

**Success** `200 OK`:
```json
{
  "data": [
    {
      "id": "uuid",
      "name": "JavaScript Fundamentals",
      "description": "Learn JS from scratch",
      "thumbnailUrl": "https://...",
      "isActive": true,
      "order": 1,
      "videoCount": 8,
      "createdAt": "2026-04-23T10:00:00.000Z",
      "updatedAt": "2026-04-23T10:00:00.000Z"
    }
  ],
  "meta": { "total": 3, "page": 1, "perPage": 20, "totalPages": 1 }
}
```

---

### GET /api/tracks/:id — Get Track Detail

**Auth**: Any authenticated user
**Behaviour**: Viewers get 404 for inactive tracks. Videos list: active only for Viewers, all for Admins. Videos ordered by `order` ASC.

**Success** `200 OK`:
```json
{
  "id": "uuid",
  "name": "JavaScript Fundamentals",
  "description": "...",
  "thumbnailUrl": "...",
  "isActive": true,
  "order": 1,
  "videoCount": 8,
  "createdAt": "...",
  "updatedAt": "...",
  "videos": [
    { "id": "uuid", "title": "Intro to JS", "youtubeId": "dQw4w9WgXcQ", "thumbnailUrl": "...", "duration": 300, "order": 1, "isActive": true }
  ]
}
```

**Errors**: `404` Not found (or inactive for Viewers)

---

### POST /api/tracks — Create Track

**Auth**: ADMIN only
**Request Body**:
```json
{ "name": "New Track", "description": "...", "thumbnailUrl": "...", "order": 1 }
```
**Success** `201 Created`: TrackResponseDto (without videos array)
**Errors**: `400` Validation, `403` Not ADMIN

---

### PATCH /api/tracks/:id — Update Track

**Auth**: ADMIN only
**Request Body** (all optional):
```json
{ "name": "Updated", "isActive": false, "order": 2 }
```
**Success** `200 OK`: Updated TrackResponseDto
**Errors**: `400`, `403`, `404`

---

### DELETE /api/tracks/:id — Delete Track

**Auth**: ADMIN only
**Success** `200 OK`: `{ "message": "Track deleted successfully" }`
**Errors**: `403`, `404`

---

## Videos Endpoints

### GET /api/videos/:id — Get Video Detail

**Auth**: Any authenticated user
**Behaviour**: Viewers get 404 for inactive videos or videos in inactive tracks.

**Success** `200 OK`: VideoResponseDto (includes `youtubeId`)
**Errors**: `404`

---

### POST /api/videos — Create Video

**Auth**: ADMIN only
**Request Body**:
```json
{
  "title": "Lesson 1",
  "youtubeUrl": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
  "description": "Introduction",
  "duration": 300,
  "trackId": "uuid",
  "order": 1
}
```
**Success** `201 Created`: VideoResponseDto (includes extracted `youtubeId`)
**Errors**:
- `400` Invalid YouTube URL or validation error
- `403` Not ADMIN
- `404` Track not found

---

### PATCH /api/videos/:id — Update Video

**Auth**: ADMIN only
**Request Body** (all optional): title, description, thumbnailUrl, duration, order, isActive
**Note**: `trackId` cannot be changed (video stays in its original track)
**Success** `200 OK`: Updated VideoResponseDto
**Errors**: `400`, `403`, `404`

---

### DELETE /api/videos/:id — Delete Video

**Auth**: ADMIN only
**Success** `200 OK`: `{ "message": "Video deleted successfully" }`
**Errors**: `403`, `404`

---

## Notes

- `youtubeId` is always present in VideoResponseDto — it is extracted server-side from `youtubeUrl`.
- All YouTube data (video IDs) is exposed only to authenticated users — no public endpoint.
- Inactive tracks/videos return `404` to Viewer requests (not `403`) to avoid leaking existence information.
- `videoCount` in track responses reflects active videos for Viewers, all videos for Admins.
