# Research: Certificate Generation

**Feature**: 005-certificates
**Date**: 2026-04-23
**Status**: Complete

---

## Decision 1: PDF Generation Library — PDFKit

**Decision**: Use `pdfkit` (npm: `pdfkit`, types: `@types/pdfkit`). Generate the PDF server-side and stream it directly to the HTTP response.

**Rationale**: PDFKit is a pure Node.js PDF generation library with no browser dependency, making it ideal for Railway server deployment. It supports programmatic drawing of text, lines, rectangles, and custom fonts — sufficient to produce a professional certificate with borders and styled typography. The bundle is ~2 MB vs ~150 MB for Puppeteer.

**Alternatives considered**:
- **Puppeteer**: Renders an HTML template to PDF via headless Chrome. Produces beautiful results but requires a full Chromium binary (~150 MB), complicates Railway deployment, and adds significant startup overhead. Overkill for MVP.
- **@react-pdf/renderer**: React-based PDF generation. Adds React as a backend dependency; more complex setup. Better for template-heavy documents, but adds unnecessary complexity here.
- **html-pdf / wkhtmltopdf**: Requires external binaries — not suitable for Railway's managed environment.

**Installation**:
```bash
npm install pdfkit
npm install --save-dev @types/pdfkit
```

---

## Decision 2: PDF Storage — Generate On-Demand, Stream to Client

**Decision**: The PDF is generated fresh on every download request, using data stored in the `Certificate` database record (user name, track name, issuedAt, code, completedVideoCount). No PDF file is stored on disk or in any blob storage.

**Rationale**: MVP storage simplicity. At ~50 users × ~7 tracks = 350 max certificates, generating a ~30KB PDF on demand takes <500ms. No S3 bucket, no Railway volume, no cleanup required. The `pdfUrl` field from the original schema design is omitted — not needed.

**Alternatives considered**:
- Store PDF in Railway persistent volume: requires volume configuration and management — unnecessary at MVP scale.
- Store PDF as base64 in the database: impractical — bloats the DB.
- Store in AWS S3 / Cloudflare R2: adds external dependency — deferred.

---

## Decision 3: Certificate Code Generation — Crypto Random with Retry

**Decision**: Generate the code as `CERT-{year}-{5 chars}` where the 5 chars are drawn from `ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789` using Node.js `crypto.randomInt`. If a collision occurs (P2025 on unique constraint), retry up to 5 times before throwing a 500.

**Rationale**: The alphabet has 36 characters → 36^5 = 60,466,176 unique codes per year. At MVP scale (350 certificates total), the collision probability per generation is ~0.0006%. The retry loop handles the astronomically rare collision without complex external coordination.

```typescript
function generateCode(): string {
  const year = new Date().getFullYear();
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const suffix = Array.from({ length: 5 }, () =>
    chars[crypto.randomInt(chars.length)]
  ).join('');
  return `CERT-${year}-${suffix}`;
}
```

**Alternatives considered**:
- UUID-based code: not human-readable; doesn't match the required format.
- Sequential counter: requires a sequence table; fragile.

---

## Decision 4: Idempotent Generation — Find Before Create

**Decision**: Before creating a new certificate, query `prisma.certificate.findUnique({ where: { userId_trackId: { userId, trackId } } })`. If found, regenerate the PDF from stored data and return it — no new record. Only if not found does the service create a new record and generate the first PDF.

**Rationale**: FR-003 mandates idempotency. The `@@unique([userId, trackId])` constraint would catch duplicates at the DB level too, but checking first allows the service to return the existing certificate's PDF cleanly rather than throwing a constraint error.

---

## Decision 5: Eligibility Check — Import ProgressService

**Decision**: `CertificatesModule` imports `ProgressModule` and calls `ProgressService.getTrackProgress(userId, trackId)`. If `trackComplete === true`, the user is eligible. If `totalActive === 0`, they are not eligible.

**Rationale**: Constitution Principle IV mandates cross-module communication through exported services only. `ProgressModule` already exports `ProgressService`. Reusing the existing service avoids duplicating the eligibility logic and ensures consistency with the progress feature.

**Alternatives considered**:
- Direct Prisma query in CertificatesService to count completions: duplicates logic from ProgressService; violates DRY.

---

## Decision 6: Public Verification Endpoint — @Public() Decorator

**Decision**: `GET /api/certificates/:code` uses the `@Public()` decorator (already in the codebase from 001-auth) to bypass `JwtAuthGuard`. The route is declared as the last method in the controller to avoid shadowing static-segment routes (`my`, `admin`).

**Rationale**: Constitution Principle V mandates this specific endpoint format. The `@Public()` pattern is already established. Declaring it last in the controller ensures `GET /api/certificates/my` and `GET /api/certificates/admin` are matched first.

---

## Decision 7: Route Structure — Static Segments Before Parameterised

**Decision**: Controller prefix `api/certificates`. Route order in controller:
1. `GET /api/certificates/my` — viewer lists own
2. `GET /api/certificates/admin` — admin lists all (ADMIN only)
3. `POST /api/certificates/tracks/:trackId` — viewer generates
4. `POST /api/certificates/admin/users/:userId/tracks/:trackId` — admin generates
5. `GET /api/certificates/:code` — public verify (declared LAST, @Public())

**Rationale**: In NestJS, routes are matched in the order they are declared. `my` and `admin` are static segments that must come before `:code` to avoid being captured by the parameterised route.

---

## Decision 8: completedVideoCount Stored in Certificate Record

**Decision**: When generating a certificate, snapshot the `completedCount` from `getTrackProgress` and store it in the `Certificate.completedVideoCount` field. The PDF displays this value.

**Rationale**: Certificates are immutable historical records (FR-005). If videos are later deactivated, the original "12 videos completed" count must remain accurate on the PDF — not recalculated dynamically.

---

## Decision 9: New Package — pdfkit Only

**Decision**: The only new npm dependency is `pdfkit` + its `@types/pdfkit` dev dependency.

**Rationale**: All other needed packages (NestJS, Prisma, class-validator, @nestjs/swagger) are already installed. No additional infrastructure.
