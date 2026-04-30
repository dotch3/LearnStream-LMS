# Data Model: Certificate Generation

**Feature**: 005-certificates
**Date**: 2026-04-23

---

## New Entity (requires Prisma migration: `add-certificates`)

### Certificate

| Field | Type | Constraints | Notes |
|-------|------|-------------|-------|
| id | String (UUID) | PK, auto | `@default(uuid())` |
| code | String | unique | Format: `CERT-YYYY-XXXXX` |
| completedVideoCount | Int | required | Count of active completed videos at time of issue |
| issuedAt | DateTime | auto | `@default(now())` |
| createdAt | DateTime | auto | `@default(now())` |
| userId | String | FK → User | `onDelete: Cascade` |
| trackId | String | FK → Track | `onDelete: Cascade` |

**Unique constraints**:
- `@unique` on `code` — globally unique verification code
- `@@unique([userId, trackId])` — one certificate per user per track

**Prisma schema**:
```prisma
model Certificate {
  id                   String   @id @default(uuid())
  code                 String   @unique
  completedVideoCount  Int
  issuedAt             DateTime @default(now())
  createdAt            DateTime @default(now())

  userId               String
  user                 User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  trackId              String
  track                Track    @relation(fields: [trackId], references: [id], onDelete: Cascade)

  @@unique([userId, trackId])
  @@map("certificates")
}
```

**Note**: `User` model needs `certificates Certificate[]` relation added. `Track` model needs `certificates Certificate[]` relation added.

---

## State Machine

### Certificate lifecycle
```
NOT_EARNED (no record)
  → EARNED (record created, PDF generated)   [via POST /api/certificates/tracks/:trackId]

EARNED is a terminal state. Records are never deleted or invalidated.
If the same user+track requests again → existing record returned (idempotent).
```

---

## DTOs

### CertificateResponseDto (list + JSON response)
```
id                   : string
code                 : string
completedVideoCount  : number
issuedAt             : Date
trackId              : string
trackName            : string
userId               : string    (omitted from viewer-facing list; included in admin list)
userName             : string    (included for admin list)
```

### PublicVerifyResponseDto (public endpoint — minimal data)
```
recipientName   : string
trackName       : string
issuedAt        : Date
```

### AdminGenerateDto (body for admin generation endpoint)
```
userId   : string  @IsUUID()
trackId  : string  @IsUUID()
```

---

## PDF Content Structure

```
┌──────────────────────────────────────────┐
│         CERTIFICATE OF COMPLETION         │
│                                           │
│  This certifies that                     │
│                                           │
│      [USER FULL NAME]                     │
│                                           │
│  has successfully completed               │
│                                           │
│      [TRACK NAME]                         │
│                                           │
│  comprising [N] training videos           │
│                                           │
│  Issued: [DD/MM/YYYY]                     │
│  Verification Code: CERT-YYYY-XXXXX       │
│                                           │
│  Verify at: https://videosyt.com/verify   │
└──────────────────────────────────────────┘
```

Fields sourced from the Certificate record — no live DB query on PDF download.

---

## Code Generation Algorithm

```typescript
import { randomInt } from 'crypto';

const CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

function generateCode(): string {
  const year = new Date().getFullYear();
  const suffix = Array.from({ length: 5 }, () => CHARS[randomInt(CHARS.length)]).join('');
  return `CERT-${year}-${suffix}`;
}
```

Retry up to 5 times on DB unique constraint collision (P2002). Throw 500 if all retries fail.
