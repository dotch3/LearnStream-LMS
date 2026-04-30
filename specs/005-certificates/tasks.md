# Tasks: Certificate Generation

**Input**: Design documents from `/specs/005-certificates/`
**Prerequisites**: plan.md ✅ spec.md ✅ research.md ✅ data-model.md ✅ contracts/ ✅ quickstart.md ✅

**Organization**: Tasks grouped by user story to enable independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to
- Exact file paths included in all descriptions

---

## Phase 1: Setup

**Purpose**: Install new dependency, create module directory.

- [x] T001 Install pdfkit and @types/pdfkit in `backend/` (`npm install pdfkit && npm install --save-dev @types/pdfkit`)
- [x] T002 Create directory `backend/src/certificates/dto/` (mkdir -p, no files yet)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: DB schema, Prisma migration, module skeleton. MUST complete before any user story.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [x] T003 Add `Certificate` model to `backend/prisma/schema.prisma`: fields `id` (UUID PK), `code` (String @unique), `completedVideoCount` (Int), `issuedAt` (DateTime @default(now())), `createdAt` (DateTime @default(now())), `userId` (String FK → User onDelete: Cascade), `trackId` (String FK → Track onDelete: Cascade), `@@unique([userId, trackId])`, `@@map("certificates")`; also add `certificates Certificate[]` relation to the `User` model and `certificates Certificate[]` relation to the `Track` model
- [x] T004 Run Prisma migration in `backend/`: `npx prisma migrate dev --name add-certificates`
- [x] T005 Run `npx prisma generate` in `backend/` to regenerate the Prisma client
- [x] T006 [P] Create `backend/src/certificates/certificates.module.ts`: `@Module({ imports: [PrismaModule, ProgressModule], controllers: [CertificatesController], providers: [CertificatesService] })` — imports ProgressModule so ProgressService is available
- [x] T007 [P] Create `backend/src/certificates/certificates.service.ts`: inject `PrismaService` and `ProgressService` in constructor; add private `generateCode(): string` using `crypto.randomInt` with `CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'`, format `CERT-${year}-${5-char suffix}`; leave all public methods as stubs returning `null`
- [x] T008 [P] Create `backend/src/certificates/certificates.controller.ts`: prefix `'certificates'`, declare all 5 route method stubs in this exact order (CRITICAL for NestJS route matching): (1) `@Get('my')` getMyCertificates, (2) `@Get('admin')` adminListCertificates, (3) `@Post('tracks/:trackId')` generateCertificate, (4) `@Post('admin/users/:userId/tracks/:trackId')` adminGenerateCertificate, (5) `@Get(':code')` verifyByCode with `@Public()` decorator — all return `null` placeholder for now
- [x] T009 Register `CertificatesModule` in `backend/src/app.module.ts` imports array

**Checkpoint**: `npm run build` must pass with no errors before proceeding.

---

## Phase 3: User Story 1 — Viewer Generates Certificate (Priority: P1) 🎯 MVP

**Goal**: A viewer who completed all active videos in a track downloads a PDF certificate. Idempotent — same request returns the same PDF.

**Independent Test**: Complete all videos in a track as viewer. `POST /api/certificates/tracks/:trackId` → HTTP 200 + PDF download. Call again → same PDF with same code. Call for incomplete track → 403.

- [x] T010 [P] [US1] Create `backend/src/certificates/dto/certificate-response.dto.ts`: export `CertificateResponseDto` with `@ApiProperty()` on fields `id`, `code`, `completedVideoCount`, `issuedAt`, `trackId`, `trackName`
- [x] T011 [P] [US1] Create `backend/src/certificates/dto/public-verify-response.dto.ts`: export `PublicVerifyResponseDto` with fields `recipientName`, `trackName`, `issuedAt` (only these three — no userId, no email)
- [x] T012 [US1] Implement private `buildPdfBuffer(data: { recipientName: string; trackName: string; completedVideoCount: number; issuedAt: Date; code: string }): Promise<Buffer>` in `backend/src/certificates/certificates.service.ts` using PDFKit: A4 page, 50pt margin, draw outer border rectangle, title "CERTIFICATE OF COMPLETION" centered bold, "This certifies that" text, recipient name large bold, "has successfully completed" text, track name bold, `comprising N training videos` text, issue date formatted DD/MM/YYYY, verification code, "Verify at: https://videosyt.com/verify" — collect chunks into Buffer and resolve promise
- [x] T013 [US1] Implement `generate(userId: string, trackId: string): Promise<Buffer>` in `backend/src/certificates/certificates.service.ts`: (1) verify track exists (findUnique on Track, throw NotFoundException if not found); (2) check eligibility via `this.progressService.getTrackProgress(userId, trackId)` — throw `ForbiddenException('Not eligible: not all active videos are completed')` if `!result.trackComplete` or `result.totalActive === 0`; (3) `findUnique` on `certificate` where `userId_trackId: { userId, trackId }` including `user` and `track` — if found, call `buildPdfBuffer` with existing record data and return buffer; (4) generate code with retry loop (up to 5 attempts on P2002 PrismaClientKnownRequestError from `@prisma/client/runtime/client`); (5) create certificate record in DB with `completedVideoCount: result.completedCount`; (6) return `buildPdfBuffer` result
- [x] T014 [US1] Implement `POST /tracks/:trackId` endpoint in `backend/src/certificates/certificates.controller.ts`: extract `userId` from `req.user.sub`, call `this.certificatesService.generate(userId, trackId)`, set `res.setHeader('Content-Type', 'application/pdf')`, `res.setHeader('Content-Disposition', \`attachment; filename="certificate-${code}.pdf"\`)` — note: to get code from buffer, the service should return `{ buffer: Buffer; code: string }` or the controller should retrieve it; refactor service `generate` to return `{ buffer: Buffer; code: string }` and update T013 accordingly; call `res.send(buffer)` using `@Res() res: Response` from `express`

**Checkpoint**: US1 fully functional — viewer can download certificate PDF.

---

## Phase 4: User Story 4 — Public Certificate Verification (Priority: P1)

**Goal**: Anyone (unauthenticated) can verify a certificate code and get back only recipientName, trackName, issuedAt.

**Independent Test**: `GET /api/certificates/CERT-2026-XXXXX` with NO Authorization header → 200 with `{ recipientName, trackName, issuedAt }`. Invalid code → 404.

- [x] T015 [US4] Implement `verifyByCode(code: string): Promise<PublicVerifyResponseDto>` in `backend/src/certificates/certificates.service.ts`: `findUnique({ where: { code }, include: { user: true, track: true } })`, throw `NotFoundException` if null, return `{ recipientName: cert.user.name, trackName: cert.track.name, issuedAt: cert.issuedAt }`
- [x] T016 [US4] Implement `GET /:code` endpoint in `backend/src/certificates/certificates.controller.ts`: already decorated `@Public()` from T008 stub — fill implementation to call `this.certificatesService.verifyByCode(code)` and return the result; confirm this is the LAST method in the class file

**Checkpoint**: US4 fully functional — public verify works without auth.

---

## Phase 5: User Story 2 — Viewer Lists Their Certificates (Priority: P2)

**Goal**: An authenticated viewer sees all their earned certificates with trackName, issuedAt, code.

**Independent Test**: Earn 2 certificates. `GET /api/certificates/my` → array of 2 items each with `code`, `trackName`, `issuedAt`, `completedVideoCount`. No certificates → empty array.

- [x] T017 [US2] Implement `getMyCertificates(userId: string): Promise<CertificateResponseDto[]>` in `backend/src/certificates/certificates.service.ts`: `findMany({ where: { userId }, include: { track: true }, orderBy: { issuedAt: 'desc' } })`, map to `CertificateResponseDto` shape
- [x] T018 [US2] Implement `GET /my` endpoint in `backend/src/certificates/certificates.controller.ts`: extract `userId` from `req.user.sub`, call `getMyCertificates(userId)`, return array
- [x] T019 [US2] Create `frontend/src/app/dashboard/certificates/page.tsx`: server component, fetch `GET /api/certificates/my` using `{ api }` from `@/lib/axios` with auth header from cookies, render a table with columns: Track, Issue Date, Code; empty state message if no certificates; page title "My Certificates"

**Checkpoint**: US2 fully functional — viewer sees their certificate list.

---

## Phase 6: User Story 3 — Admin Generates Certificate for Any Eligible User (Priority: P2)

**Goal**: Admin can generate a certificate for any user who is eligible, by specifying userId + trackId.

**Independent Test**: As admin, `POST /api/certificates/admin/users/:userId/tracks/:trackId` for eligible user → 200 PDF. Ineligible user → 403. As viewer, same endpoint → 403.

- [x] T020 [US3] Implement `generateForUser(userId: string, trackId: string): Promise<{ buffer: Buffer; code: string }>` in `backend/src/certificates/certificates.service.ts`: verify userId exists (`findUnique` on User, throw `NotFoundException` if not found), then call the same logic as `generate(userId, trackId)` — extract shared logic into a private `_generate(userId, trackId)` method used by both `generate` and `generateForUser`
- [x] T021 [US3] Implement `POST /admin/users/:userId/tracks/:trackId` endpoint in `backend/src/certificates/certificates.controller.ts`: add `@Roles(Role.ADMIN)` + `@UseGuards(RolesGuard)` decorators, call `generateForUser(userId, trackId)`, stream PDF response same as T014

**Checkpoint**: US3 fully functional — admin can generate on behalf of eligible users.

---

## Phase 7: User Story 5 — Admin Views All Certificates (Priority: P3)

**Goal**: Admin lists all issued certificates with optional userId/trackId filters and pagination.

**Independent Test**: 3 certificates for different users. `GET /api/certificates/admin` → all 3 in `data` array with `meta`. Filter `?userId=X` → only X's certificates. As viewer → 403.

- [x] T022 [P] [US5] Create `backend/src/certificates/dto/admin-certificates-query.dto.ts`: export `AdminCertificatesQueryDto` with `@IsOptional() @IsUUID() userId?`, `@IsOptional() @IsUUID() trackId?`, `@IsOptional() @IsInt() @Min(1) @Type(() => Number) page = 1`, `@IsOptional() @IsInt() @Min(1) @Type(() => Number) perPage = 20`
- [x] T023 [US5] Implement `getAllCertificates(query: AdminCertificatesQueryDto): Promise<{ data: AdminCertificateResponseDto[]; meta: {...} }>` in `backend/src/certificates/certificates.service.ts`: build `where` from optional `userId`/`trackId`, use `findMany` + `count` with `skip`/`take` for pagination, include `user` and `track`, return `{ data, meta: { total, page, perPage, totalPages } }`; also define inline `AdminCertificateResponseDto` type or class with `id`, `code`, `completedVideoCount`, `issuedAt`, `userId`, `userName`, `trackId`, `trackName`
- [x] T024 [US5] Implement `GET /admin` endpoint in `backend/src/certificates/certificates.controller.ts`: add `@Roles(Role.ADMIN)` + `@UseGuards(RolesGuard)`, accept `@Query() query: AdminCertificatesQueryDto`, call `getAllCertificates(query)`, return paginated result

**Checkpoint**: US5 fully functional — admin has full oversight of all certificates.

---

## Phase 8: Polish & Cross-Cutting Concerns

- [x] T025 Add Swagger decorators to all 5 endpoints in `backend/src/certificates/certificates.controller.ts`: `@ApiOperation({ summary: '...' })`, `@ApiResponse({ status: 200, ... })`, `@ApiBearerAuth()` on auth-required routes, `@ApiQuery()` on admin list, `@ApiProduces('application/pdf')` on PDF endpoints
- [x] T026 Update `CLAUDE.md` Active Technologies section: add `pdfkit` to the technology list for 005-certificates; update Recent Changes section
- [x] T027 Update `PROGRESSO.md` to record 005-certificates completion
- [ ] T028 Run quickstart.md scenarios 1–12 manually to validate the feature end-to-end

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies — start immediately
- **Phase 2 (Foundational)**: Depends on Phase 1 (pdfkit must be installed before T007/T008 reference it) — **BLOCKS all user stories**
- **Phase 3 (US1)**: Depends on Phase 2 completion
- **Phase 4 (US4)**: Depends on Phase 2 completion (can run in parallel with US1)
- **Phase 5 (US2)**: Depends on Phase 2 completion (can run in parallel with US1, US4)
- **Phase 6 (US3)**: Depends on Phase 3 (US1) — reuses `_generate` private method
- **Phase 7 (US5)**: Depends on Phase 2 completion
- **Phase 8 (Polish)**: Depends on all user story phases

### User Story Dependencies

- **US1 (P1)**: Needs ProgressModule (already exists), pdfkit (Phase 1), DB migration (Phase 2)
- **US4 (P1)**: Needs only DB migration (Phase 2) — no PDF generation, no ProgressService call
- **US2 (P2)**: Needs US1's `CertificateResponseDto`; otherwise independent
- **US3 (P2)**: Refactors US1's `generate` into shared `_generate` — implement after US1
- **US5 (P3)**: Independent of US1–US4 logic; needs DB migration (Phase 2)

### Parallel Opportunities

- T006, T007, T008 are all [P] — can run in parallel once T005 completes
- T010, T011 are [P] — can run in parallel (different DTO files)
- T022 is [P] — DTO file, no dependencies

---

## Parallel Example: Phase 2 Foundational

```
After T005 (prisma generate):
  Parallel: T006 (module), T007 (service stub), T008 (controller stub)
  Then: T009 (register module)
```

## Parallel Example: US1 Phase

```
After Foundational phase:
  Parallel: T010 (CertificateResponseDto), T011 (PublicVerifyResponseDto)
  Then: T012 (buildPdfBuffer) — can use T011 type
  Then: T013 (generate method)
  Then: T014 (POST endpoint)
```

---

## Implementation Strategy

### MVP First (US1 + US4)

1. Phase 1: Setup (pdfkit)
2. Phase 2: Foundational (DB + module skeleton)
3. Phase 3: US1 — viewer generates certificate ← **Core feature**
4. Phase 4: US4 — public verify ← **Trust feature**
5. **STOP and VALIDATE**: Test scenarios 1–6 from quickstart.md

### Incremental Delivery

1. Setup + Foundational → skeleton ready
2. US1 → viewer can earn and download certificates (MVP!)
3. US4 → anyone can verify certificates
4. US2 → viewer can see their certificate history
5. US3 → admin can generate on behalf of users
6. US5 → admin has full list/filter view

---

## Notes

- **Route order is CRITICAL**: The controller stub in T008 declares all 5 routes in the correct order. All subsequent tasks edit existing stubs — never reorder them.
- **PDF streaming**: Use `@Res() res: Response` from `express` in the endpoint; `doc.pipe(res)` streams directly.
- **userId always from token**: `req.user.sub` — never from body or query params.
- **Idempotency check**: `findUnique` on `@@unique([userId, trackId])` before any code generation or DB write.
- **Code retry**: Catch `PrismaClientKnownRequestError` with `code === 'P2002'` — retry up to 5 times; throw `InternalServerErrorException` after all retries fail.
- **ProgressService import**: Already exported from ProgressModule; just import ProgressModule in CertificatesModule.
- **PartialType/OmitType**: Always from `@nestjs/swagger`, never from `@nestjs/mapped-types`.
