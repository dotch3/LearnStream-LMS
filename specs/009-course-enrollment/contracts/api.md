# API Contracts: Course Enrollment System

## Enrollments

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | /api/enrollments/request | VIEWER | Request enrollment in a track |
| POST | /api/enrollments/redeem | VIEWER | Redeem a code |
| GET | /api/enrollments/my | VIEWER | List own enrollments |
| GET | /api/enrollments | ADMIN | List all requests (filter by status/trackId) |
| PATCH | /api/enrollments/:id/approve | ADMIN | Approve request |
| PATCH | /api/enrollments/:id/deny | ADMIN | Deny request |

### POST /api/enrollments/request
```json
// request
{ "trackId": "uuid" }

// 201 Created
{ "id": "uuid", "trackId": "uuid", "status": "PENDING", "requestedAt": "iso" }

// 409 Conflict — already PENDING or APPROVED
{ "message": "Enrollment request already exists" }
```

### POST /api/enrollments/redeem
```json
// request
{ "code": "ABC12345" }

// 201 Created
{ "enrolledTrackIds": ["uuid", "uuid"] }

// 400 — expired / max uses reached / inactive
{ "message": "Invalid or expired code" }
```

### GET /api/enrollments/my
```json
// 200 OK
[{ "id": "uuid", "trackId": "uuid", "trackName": "string", "status": "APPROVED", "requestedAt": "iso" }]
```

### GET /api/enrollments?status=PENDING&trackId=
```json
// 200 OK
{
  "data": [{ "id":"uuid","userId":"uuid","userName":"string","userEmail":"string","trackId":"uuid","trackName":"string","status":"PENDING","requestedAt":"iso" }],
  "meta": { "total": 0, "page": 1, "perPage": 20, "totalPages": 1 }
}
```

### PATCH /api/enrollments/:id/approve | /deny
```json
// 200 OK
{ "id": "uuid", "status": "APPROVED" }
```

---

## Enrollment Codes

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | /api/enrollment-codes | ADMIN | Create code |
| GET | /api/enrollment-codes | ADMIN | List codes |
| PATCH | /api/enrollment-codes/:id | ADMIN | Update (activate/deactivate/edit) |
| DELETE | /api/enrollment-codes/:id | ADMIN | Delete code |

### POST /api/enrollment-codes
```json
// request
{ "code": "OPTIONAL", "label": "string", "trackIds": ["uuid"], "maxUses": null, "expiresAt": null }

// 201 Created
{ "id":"uuid","code":"ABC12345","label":"string","trackIds":["uuid"],"maxUses":null,"usedCount":0,"expiresAt":null,"isActive":true }
```

### GET /api/enrollment-codes
```json
// 200 OK
[{ "id":"uuid","code":"string","label":"string","tracks":[{"id":"uuid","name":"string"}],"maxUses":5,"usedCount":2,"expiresAt":"iso","isActive":true }]
```

---

## Notifications

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | /api/notifications | any | Own notifications (paginated) |
| GET | /api/notifications/unread-count | any | Unread badge count |
| PATCH | /api/notifications/:id/read | any | Mark one as read |
| PATCH | /api/notifications/read-all | any | Mark all as read |

### GET /api/notifications
```json
// 200 OK
{
  "data": [{ "id":"uuid","type":"ENROLLMENT_APPROVED","title":"string","body":"string","read":false,"data":{},"createdAt":"iso" }],
  "meta": { "total": 0, "page": 1, "perPage": 20, "totalPages": 1 }
}
```

### GET /api/notifications/unread-count
```json
{ "count": 3 }
```

---

## Track Changes

- `GET /api/tracks` — no longer returns `isActive`; returns `visibility: PUBLIC|LINK_ONLY|DRAFT`
- `POST/PATCH /api/tracks` — accepts `visibility` instead of `isActive`
- `GET /api/tracks` (VIEWER) — only returns `PUBLIC` tracks (LINK_ONLY/DRAFT hidden from list)
- `GET /api/tracks/:id` — VIEWER sees it only if enrolled (APPROVED) or admin; LINK_ONLY shown if enrolled
- Each track in listing returns `enrollmentStatus: "NONE"|"PENDING"|"APPROVED"|"DENIED"` for the requesting user
