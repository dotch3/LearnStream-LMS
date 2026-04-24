# Implementation Plan: Certificate Generation

**Branch**: `005-certificates` | **Date**: 2026-04-23 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/005-certificates/spec.md`

---

## Summary

Implement server-side PDF certificate generation for the VideosYT platform. When a viewer completes all active videos in a track, they can request a downloadable PDF certificate. The system verifies eligibility via `ProgressService`, generates a unique `CERT-YYYY-XXXXX` code, streams the PDF via PDFKit, and saves the record idempotently. A public verification endpoint exposes minimal data without authentication.

---

## Technical Context

**Language/Version**: TypeScript 5.x / Node.js 20 LTS  
**Primary Dependencies**: NestJS (existing), Prisma 7 + @prisma/adapter-pg (existing), class-validator, class-transformer, @nestjs/swagger (existing), **pdfkit** (new), @types/pdfkit (new dev)  
**Storage**: PostgreSQL via Prisma ORM — new `certificates` table  
**Testing**: Manual via quickstart.md curl scenarios  
**Target Platform**: Railway (backend server)  
**Project Type**: Web service (NestJS REST API + Next.js frontend)  
**Performance Goals**: Certificate generation < 5 seconds  
**Constraints**: One certificate per user+track (DB unique constraint + application-level idempotency); code globally unique (36^5 = 60M+ codes/year); no file storage — generate on demand  
**Scale/Scope**: ~50 users × ~7 tracks = max 350 certificates

---

## Constitution Check

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Security-First | ✅ PASS | JWT required on all endpoints except public verify; userId always from token, never from request body |
| II. Role-Based Access Control | ✅ PASS | Admin endpoints protected by `@Roles(Role.ADMIN)` + `RolesGuard`; `/api/certificates/admin/*` returns 403 for VIEWER |
| III. Data Integrity | ✅ PASS | Certificates are immutable after creation; `completedVideoCount` snapshot stored at issue time; records never deleted |
| IV. Modular Architecture | ✅ PASS | New `CertificatesModule` domain; cross-module dependency on `ProgressModule` via exported `ProgressService` only — no direct Prisma entity sharing |
| V. API-First with Swagger | ✅ PASS | All 5 endpoints documented via `@ApiOperation`, `@ApiResponse`, `@ApiBearerAuth`; DTOs validated with `class-validator` |

**Post-design re-check**: Route ordering (static before parameterized) is handled by declaring `my` and `admin` routes before `/:code` in the controller — required because NestJS matches routes in declaration order.

---

## Project Structure

### Documentation (this feature)

```text
specs/005-certificates/
├── plan.md              # This file
├── spec.md              # Feature specification
├── research.md          # Phase 0: 9 technical decisions
├── data-model.md        # Certificate entity, code algorithm, PDF layout
├── quickstart.md        # 12 manual test scenarios
├── contracts/
│   └── certificates-api.md   # 5 REST endpoint contracts
└── tasks.md             # Phase 2 output (/speckit-tasks)
```

### Source Code (backend)

```text
backend/
├── prisma/
│   ├── schema.prisma                    # Add Certificate model + relations
│   └── migrations/
│       └── [timestamp]_add_certificates/  # New Prisma migration
├── src/
│   ├── certificates/
│   │   ├── certificates.module.ts
│   │   ├── certificates.service.ts
│   │   ├── certificates.controller.ts
│   │   └── dto/
│   │       ├── certificate-response.dto.ts
│   │       ├── public-verify-response.dto.ts
│   │       └── admin-certificates-query.dto.ts
│   ├── progress/
│   │   └── progress.service.ts          # Already exported — used for eligibility check
│   └── app.module.ts                    # Register CertificatesModule
```

### Source Code (frontend)

```text
frontend/
└── src/
    └── app/
        └── dashboard/
            └── certificates/
                └── page.tsx             # Viewer: list own certificates
```

---

## Libraries & Packages

### New Dependencies (backend)

| Package | Version | Purpose |
|---------|---------|---------|
| `pdfkit` | latest | Server-side PDF generation (pure Node.js, no browser dependency) |
| `@types/pdfkit` | latest (dev) | TypeScript typings for pdfkit |

**Install command**:
```bash
cd backend && npm install pdfkit && npm install --save-dev @types/pdfkit
```

### Existing Dependencies Used

- `@prisma/client` — Certificate model queries
- `@nestjs/common` — Controller, Service, Module, Guards, decorators
- `@nestjs/swagger` — `@ApiOperation`, `@ApiResponse`, `@ApiBearerAuth`, `@ApiQuery`
- `class-validator` — DTO validation (`@IsUUID`, `@IsOptional`, `@IsInt`, `@Min`)
- `class-transformer` — DTO transformation

---

## Implementation Details

### 1. Prisma Schema Changes

Add to `schema.prisma`:

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

Add to `User` model: `certificates Certificate[]`  
Add to `Track` model: `certificates Certificate[]`

**Migration name**: `add-certificates`

### 2. Code Generation

```typescript
import { randomInt } from 'crypto';

const CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

function generateCode(): string {
  const year = new Date().getFullYear();
  const suffix = Array.from({ length: 5 }, () => CHARS[randomInt(CHARS.length)]).join('');
  return `CERT-${year}-${suffix}`;
}
```

Retry up to 5 times on Prisma `P2002` unique constraint violation. Throw `InternalServerErrorException` if all retries fail.

### 3. Eligibility Check

`CertificatesModule` imports `ProgressModule`. `CertificatesService` injects `ProgressService` and calls `getTrackProgress(userId, trackId)`. Eligible when `result.trackComplete === true`. Not eligible when `result.totalActive === 0`.

### 4. Idempotency Pattern

```typescript
const existing = await prisma.certificate.findUnique({
  where: { userId_trackId: { userId, trackId } },
  include: { user: true, track: true },
});
if (existing) {
  return streamPdf(buildPdfData(existing));  // Regenerate PDF from stored data
}
// else: create new record, then stream PDF
```

### 5. PDF Generation (PDFKit)

Stream PDF directly to `Response` object:

```typescript
@Res() res: Response
res.setHeader('Content-Type', 'application/pdf');
res.setHeader('Content-Disposition', `attachment; filename="certificate-${code}.pdf"`);
const doc = new PDFDocument({ size: 'A4', margin: 50 });
doc.pipe(res);
// ... draw certificate content ...
doc.end();
```

PDF content: title, user full name, track name, completedVideoCount, issuedAt (DD/MM/YYYY), code, verification URL.

### 6. Route Order (Critical)

In `CertificatesController`, declare routes in this exact order:
1. `@Get('my')` — viewer lists own
2. `@Get('admin')` — admin lists all
3. `@Post('tracks/:trackId')` — viewer generates
4. `@Post('admin/users/:userId/tracks/:trackId')` — admin generates
5. `@Get(':code')` — public verify (last, `@Public()`)

### 7. DTOs

- `CertificateResponseDto` — `id`, `code`, `completedVideoCount`, `issuedAt`, `trackId`, `trackName`
- `AdminCertificateResponseDto` — extends above + `userId`, `userName`
- `PublicVerifyResponseDto` — `recipientName`, `trackName`, `issuedAt`
- `AdminCertificatesQueryDto` — `userId?`, `trackId?`, `page?` (default 1), `perPage?` (default 20)

### 8. Frontend Page

`GET /api/certificates/my` → display list with trackName, issuedAt, code. Simple table, no download button (user can regenerate by calling POST).

---

## Complexity Tracking

No constitution violations. All complexity is within the certificate domain module.

---

## Phase Summary

| Phase | Output | Blocking? |
|-------|--------|-----------|
| Setup | Install pdfkit, Prisma migration, generate client | Yes |
| US4 (Public Verify) | GET /:code endpoint | No |
| US1 (Viewer Generate) | POST /tracks/:trackId, PDF streaming | Depends on Setup |
| US2 (Viewer List) | GET /my endpoint | No |
| US3 (Admin Generate) | POST /admin/users/:userId/tracks/:trackId | No |
| US5 (Admin List) | GET /admin endpoint | No |
| Frontend | Dashboard certificates page | No |
