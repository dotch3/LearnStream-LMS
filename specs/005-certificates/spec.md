# Feature Specification: Certificate Generation

**Feature Branch**: `005-certificates`
**Created**: 2026-04-23
**Status**: Draft

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Viewer Generates Their Own Certificate (Priority: P1)

A viewer who has completed all active videos in a track can request a certificate for that track. The system re-verifies eligibility on the backend, generates a unique verification code, creates a professionally styled PDF, saves the certificate record, and returns the file for immediate download. If the viewer already has a certificate for that track, the system returns the existing one (no duplicates).

**Why this priority**: Core value proposition of the feature — completing a track and getting a certificate is the primary motivator for learners.

**Independent Test**: Complete all active videos in a track. Request a certificate. Verify: a PDF is downloaded containing the user's name, track name, issue date, and a code matching `CERT-YYYY-XXXXX`. Request again — verify the same certificate (same code) is returned, not a new one.

**Acceptance Scenarios**:

1. **Given** a viewer has completed all active videos in a track, **When** they request a certificate for that track, **Then** the system returns a PDF file download with the correct content and a unique code.
2. **Given** a viewer already has a certificate for a track, **When** they request it again, **Then** the system returns the existing certificate PDF (same code, no new record created).
3. **Given** a viewer has NOT completed all active videos in a track, **When** they request a certificate, **Then** the system returns a 403 error indicating they are not eligible.
4. **Given** a track has 0 active videos, **When** a user requests a certificate, **Then** the system returns a 403 (cannot be eligible for an empty track).
5. **Given** the viewer is authenticated but the track does not exist, **When** they request a certificate, **Then** the system returns 404.

---

### User Story 2 — Viewer Lists Their Certificates (Priority: P2)

A viewer can see a list of all certificates they have earned, showing the track name, issue date, and verification code for each.

**Why this priority**: Secondary to generation — useful for reference but not blocking.

**Independent Test**: After earning certificates for 2 tracks, GET the certificate list. Verify: 2 entries returned, each with trackName, issuedAt, and code.

**Acceptance Scenarios**:

1. **Given** a viewer has earned 2 certificates, **When** they request their certificate list, **Then** the response contains 2 entries with trackName, issuedAt, and code.
2. **Given** a viewer has no certificates, **When** they request their list, **Then** the response is an empty array.

---

### User Story 3 — Admin Generates Certificate for Any Eligible User (Priority: P2)

An admin can generate a certificate on behalf of any user who has completed all active videos in a track. The generation flow is identical to the viewer self-generating. The admin specifies the target userId and trackId.

**Why this priority**: Admin override/delegation is important but the core certificate flow is already covered by US1.

**Independent Test**: As admin, POST generate certificate for userId X on trackId Y (where X is eligible). Verify: a PDF is returned and a certificate record exists for X+Y. Attempting again returns the same certificate.

**Acceptance Scenarios**:

1. **Given** user X is eligible for track Y, **When** an admin requests generation for X+Y, **Then** the system returns a PDF and saves the certificate record.
2. **Given** user X is NOT eligible for track Y, **When** an admin requests generation, **Then** the system returns 403.
3. **Given** a VIEWER tries to use the admin generate endpoint, **When** the request is made, **Then** the system returns 403.

---

### User Story 4 — Public Certificate Verification (Priority: P1)

Anyone — authenticated or not — can verify a certificate's authenticity by providing its code. The system returns the recipient's name, the track name, and the issue date. No additional personal data is exposed.

**Why this priority**: A certificate is only valuable if it can be independently verified. This is a public trust feature.

**Independent Test**: Using the code from a generated certificate, call the public verification endpoint without any auth header. Verify: response contains recipientName, trackName, issuedAt. Verify: using a fake code returns 404.

**Acceptance Scenarios**:

1. **Given** a valid certificate code, **When** anyone requests verification (no auth required), **Then** the system returns recipientName, trackName, and issuedAt.
2. **Given** an invalid or non-existent code, **When** verification is requested, **Then** the system returns 404.
3. **Given** a valid certificate code, **When** the response is inspected, **Then** it contains ONLY recipientName, trackName, and issuedAt — no email, userId, or other personal data.

---

### User Story 5 — Admin Views All Certificates (Priority: P3)

An admin can view a paginated list of all issued certificates across all users, optionally filtered by userId or trackId.

**Why this priority**: Administrative oversight — useful but not core to the certificate flow.

**Independent Test**: After generating 3 certificates for different users/tracks, admin GETs all certificates. Verify: 3 entries. Filter by userId → verify only that user's certificates returned.

**Acceptance Scenarios**:

1. **Given** 3 certificates exist for different users, **When** admin lists all certificates, **Then** all 3 are returned.
2. **Given** certificates exist for multiple users, **When** admin filters by userId, **Then** only that user's certificates are returned.
3. **Given** a VIEWER calls the admin list endpoint, **When** the request is made, **Then** 403 is returned.

---

### Edge Cases

- What if the PDF generation fails internally? → The system rolls back (no certificate record saved) and returns a 500 error with a user-friendly message.
- What if the randomly generated code collides with an existing one? → The system retries code generation up to 5 times before failing.
- What if a video is deactivated between eligibility check and generation? → The eligibility check at generation time is authoritative; if still eligible at that moment, the certificate is issued.
- What if all videos in a track are deactivated after a certificate was issued? → The certificate remains valid (certificates are permanent historical records).
- What if `totalVideos` in the PDF needs to reflect the count at time of issue? → The count of completed active videos at time of issue is captured and stored in the certificate record.

---

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST verify that a user has completed all active videos in a track before issuing a certificate. A track with 0 active videos cannot produce a certificate.
- **FR-002**: The system MUST generate a certificate code in the format `CERT-{4-digit year}-{5 uppercase alphanumeric characters}`, globally unique across all certificates.
- **FR-003**: Only one certificate may exist per user per track. Requesting a certificate when one already exists MUST return the existing certificate without creating a new record.
- **FR-004**: The generated PDF MUST include: the user's full name, the track name, the issue date, the verification code, and the number of videos completed.
- **FR-005**: Certificate records MUST be permanent — they are not deleted or invalidated when videos are removed or deactivated from a track.
- **FR-006**: The public verification endpoint MUST return recipientName, trackName, and issuedAt for a valid code, without requiring authentication.
- **FR-007**: The public verification endpoint MUST NOT expose any data beyond recipientName, trackName, and issuedAt.
- **FR-008**: The certificate generation endpoint for viewers MUST use the authenticated user's identity from their token — the userId is never accepted from the request body.
- **FR-009**: Admin users MUST be able to generate a certificate for any eligible user by specifying userId and trackId.
- **FR-010**: Admin users MUST be able to list all issued certificates, with optional filtering by userId or trackId.
- **FR-011**: Viewers MUST be able to list their own certificates (trackName, issuedAt, code).
- **FR-012**: Certificate generation MUST complete within 5 seconds under normal conditions.

### Key Entities

- **Certificate**: Represents a single earned credential. Key attributes: unique code, issuedAt date, completedVideoCount (count at time of issue), userId (who earned it), trackId (which track). Once created, immutable.

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A viewer who completes all active videos in a track can download a PDF certificate within 5 seconds of requesting it.
- **SC-002**: Every generated certificate has a globally unique code. Requesting a certificate a second time for the same user+track returns the same code — verified across 100% of test cases.
- **SC-003**: The public verification endpoint returns correct information for a valid code and 404 for any invalid code — no false positives or data leakage.
- **SC-004**: An ineligible user (missing one or more video completions) cannot obtain a certificate — blocked with a clear error in 100% of cases.
- **SC-005**: Certificates remain accessible and verifiable even after videos in the associated track are later deactivated or removed.

---

## Assumptions

- PDF generation is performed server-side and the file is streamed directly to the client — no persistent file storage is required for MVP.
- The `completedVideoCount` stored in the certificate record reflects the number of active videos at the time of issue.
- The verification endpoint is intentionally public (no login wall) to allow third parties (employers, auditors) to confirm a certificate's authenticity.
- A viewer can only list and download their own certificates; they cannot access another user's certificates directly.
- The admin generation endpoint targets any user by UUID — the admin is responsible for selecting the correct user.
- Certificate styling (borders, typography) is defined by the backend PDF generator; no admin customisation of the template is required in this feature.
