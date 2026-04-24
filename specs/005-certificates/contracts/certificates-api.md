# API Contract: Certificate Generation

**Feature**: 005-certificates
**Date**: 2026-04-23
**Base URL**: `/api/certificates`

> ⚠️ Route order in controller is critical: declare `my`, `admin` before `/:code`.

---

## POST /api/certificates/tracks/:trackId

Viewer generates their own certificate for a completed track. Idempotent — returns existing certificate if already issued.

**Auth**: Bearer JWT (any authenticated user). userId taken from JWT.

**Path Params**: `trackId` — UUID of the track

**Response 200** (application/pdf):
- Body: PDF binary stream
- Headers: `Content-Type: application/pdf`, `Content-Disposition: attachment; filename="certificate-{code}.pdf"`

**Response 409** (if ineligible):
```json
{ "statusCode": 403, "message": "Not eligible: not all active videos are completed" }
```

**Error Responses**:
| Status | Condition |
|--------|-----------|
| 403 | Track has 0 active videos, or user hasn't completed all active videos |
| 404 | Track not found |
| 401 | Missing or invalid JWT |

---

## GET /api/certificates/my

List the authenticated viewer's own certificates.

**Auth**: Bearer JWT (any authenticated user)

**Response 200**:
```json
[
  {
    "id": "uuid",
    "code": "CERT-2026-A3K9Z",
    "completedVideoCount": 5,
    "issuedAt": "2026-04-23T10:00:00.000Z",
    "trackId": "uuid",
    "trackName": "JavaScript Fundamentals"
  }
]
```

---

## GET /api/certificates/:code

**Public** — no authentication required. Verify a certificate by its code.

**Auth**: None (`@Public()`)

**Path Params**: `code` — the certificate code (e.g. `CERT-2026-A3K9Z`)

**Response 200**:
```json
{
  "recipientName": "João Silva",
  "trackName": "JavaScript Fundamentals",
  "issuedAt": "2026-04-23T10:00:00.000Z"
}
```

**Error Responses**:
| Status | Condition |
|--------|-----------|
| 404 | Code does not exist |

---

## POST /api/certificates/admin/users/:userId/tracks/:trackId

Admin generates a certificate on behalf of an eligible user.

**Auth**: Bearer JWT, ADMIN role required

**Path Params**:
- `userId` — UUID of the target user
- `trackId` — UUID of the track

**Response 200** (application/pdf): Same as viewer POST endpoint.

**Error Responses**:
| Status | Condition |
|--------|-----------|
| 403 | Requester is not ADMIN, or target user is not eligible |
| 404 | User or track not found |

---

## GET /api/certificates/admin

Admin lists all issued certificates with optional filtering.

**Auth**: Bearer JWT, ADMIN role required

**Query Params**:
- `userId` (optional) — filter by user UUID
- `trackId` (optional) — filter by track UUID
- `page` (optional, default 1)
- `perPage` (optional, default 20)

**Response 200**:
```json
{
  "data": [
    {
      "id": "uuid",
      "code": "CERT-2026-A3K9Z",
      "completedVideoCount": 5,
      "issuedAt": "2026-04-23T10:00:00.000Z",
      "userId": "uuid",
      "userName": "João Silva",
      "trackId": "uuid",
      "trackName": "JavaScript Fundamentals"
    }
  ],
  "meta": { "total": 12, "page": 1, "perPage": 20, "totalPages": 1 }
}
```

**Error Responses**:
| Status | Condition |
|--------|-----------|
| 403 | Requester is not ADMIN |
| 401 | Missing or invalid JWT |
