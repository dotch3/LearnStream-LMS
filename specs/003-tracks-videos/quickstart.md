# Quickstart: Tracks & Videos — Manual Test Scenarios

**Prerequisites**:
- Backend running at `http://localhost:3000`
- Migration applied: `npx prisma migrate dev --name add-tracks-videos`
- Admin token obtained:

```bash
ADMIN_TOKEN=$(curl -s -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@videosyt.com","password":"admin123"}' | jq -r '.accessToken')
```

---

## Scenario 1 — Create Track (Happy Path)

```bash
curl -s -X POST http://localhost:3000/api/tracks \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"JavaScript Basics","description":"Learn JS","order":1}' | jq .
```
**Expected**: `201` — track with `isActive: true`, `videoCount: 0`.

---

## Scenario 2 — List Tracks (Admin sees all, Viewer sees only active)

```bash
curl -s http://localhost:3000/api/tracks -H "Authorization: Bearer $ADMIN_TOKEN" | jq .
```
**Expected**: `200` — paginated list with `videoCount`.

---

## Scenario 3 — Toggle Track Inactive

```bash
TRACK_ID=$(curl -s http://localhost:3000/api/tracks -H "Authorization: Bearer $ADMIN_TOKEN" | jq -r '.data[0].id')

curl -s -X PATCH "http://localhost:3000/api/tracks/$TRACK_ID" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"isActive":false}' | jq '.isActive'
# Expected: false

# Get viewer token and verify track is hidden
VIEWER_TOKEN=$(curl -s -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"viewer@test.com","password":"pass123"}' | jq -r '.accessToken')

curl -s "http://localhost:3000/api/tracks/$TRACK_ID" -H "Authorization: Bearer $VIEWER_TOKEN" | jq '.statusCode'
# Expected: 404

# Re-activate
curl -s -X PATCH "http://localhost:3000/api/tracks/$TRACK_ID" \
  -H "Authorization: Bearer $ADMIN_TOKEN" -H "Content-Type: application/json" \
  -d '{"isActive":true}' | jq '.isActive'
# Expected: true
```

---

## Scenario 4 — Create Video (youtube.com/watch URL)

```bash
curl -s -X POST http://localhost:3000/api/videos \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"title\":\"Intro to JS\",\"youtubeUrl\":\"https://www.youtube.com/watch?v=dQw4w9WgXcQ\",\"duration\":300,\"trackId\":\"$TRACK_ID\",\"order\":1}" | jq .
```
**Expected**: `201` — video with `youtubeId: "dQw4w9WgXcQ"`.

---

## Scenario 5 — Create Video (youtu.be short URL)

```bash
curl -s -X POST http://localhost:3000/api/videos \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"title\":\"Lesson 2\",\"youtubeUrl\":\"https://youtu.be/abc1234XYZa\",\"duration\":600,\"trackId\":\"$TRACK_ID\",\"order\":2}" | jq '.youtubeId'
```
**Expected**: `"abc1234XYZa"`.

---

## Scenario 6 — Create Video with Invalid URL

```bash
curl -s -X POST http://localhost:3000/api/videos \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"title\":\"Bad\",\"youtubeUrl\":\"https://vimeo.com/123456\",\"duration\":300,\"trackId\":\"$TRACK_ID\"}" | jq .
```
**Expected**: `400 Bad Request` — invalid YouTube URL message.

---

## Scenario 7 — Get Track Detail (videos ordered by `order`)

```bash
curl -s "http://localhost:3000/api/tracks/$TRACK_ID" \
  -H "Authorization: Bearer $ADMIN_TOKEN" | jq '.videos | map(.order)'
```
**Expected**: `[1, 2]` (ascending order).

---

## Scenario 8 — Get Video Detail

```bash
VIDEO_ID=$(curl -s "http://localhost:3000/api/tracks/$TRACK_ID" \
  -H "Authorization: Bearer $ADMIN_TOKEN" | jq -r '.videos[0].id')

curl -s "http://localhost:3000/api/videos/$VIDEO_ID" \
  -H "Authorization: Bearer $ADMIN_TOKEN" | jq '{title,youtubeId,duration}'
```
**Expected**: Object with `youtubeId` populated.

---

## Scenario 9 — Viewer Cannot See Inactive Video

```bash
# Toggle video inactive
curl -s -X PATCH "http://localhost:3000/api/videos/$VIDEO_ID" \
  -H "Authorization: Bearer $ADMIN_TOKEN" -H "Content-Type: application/json" \
  -d '{"isActive":false}' | jq '.isActive'
# Expected: false

# Viewer cannot access
curl -s "http://localhost:3000/api/videos/$VIDEO_ID" \
  -H "Authorization: Bearer $VIEWER_TOKEN" | jq '.statusCode'
# Expected: 404

# Admin still sees it in track detail
curl -s "http://localhost:3000/api/tracks/$TRACK_ID" \
  -H "Authorization: Bearer $ADMIN_TOKEN" | jq '.videos | map(.isActive)'
# Expected: [false, true] (inactive video still visible to admin)
```

---

## Scenario 10 — Viewer Cannot Write (403 on all write ops)

```bash
curl -s -X POST http://localhost:3000/api/tracks \
  -H "Authorization: Bearer $VIEWER_TOKEN" -H "Content-Type: application/json" \
  -d '{"name":"Hack"}' | jq '.statusCode'
# Expected: 403
```

---

## Scenario 11 — Delete Track Cascades to Videos

```bash
# Create a temporary track with a video, then delete
TEMP_TRACK=$(curl -s -X POST http://localhost:3000/api/tracks \
  -H "Authorization: Bearer $ADMIN_TOKEN" -H "Content-Type: application/json" \
  -d '{"name":"Temp Track"}' | jq -r '.id')

TEMP_VIDEO=$(curl -s -X POST http://localhost:3000/api/videos \
  -H "Authorization: Bearer $ADMIN_TOKEN" -H "Content-Type: application/json" \
  -d "{\"title\":\"Temp Video\",\"youtubeUrl\":\"https://youtu.be/dQw4w9WgXcQ\",\"duration\":60,\"trackId\":\"$TEMP_TRACK\"}" | jq -r '.id')

curl -s -X DELETE "http://localhost:3000/api/tracks/$TEMP_TRACK" \
  -H "Authorization: Bearer $ADMIN_TOKEN" | jq '.message'
# Expected: "Track deleted successfully"

curl -s "http://localhost:3000/api/videos/$TEMP_VIDEO" \
  -H "Authorization: Bearer $ADMIN_TOKEN" | jq '.statusCode'
# Expected: 404 (video deleted with track)
```
