# Feature Specification: Course Enrollment System

**Feature Branch**: `009-course-enrollment`
**Created**: 2026-04-28
**Status**: Draft

## User Scenarios & Testing

### User Story 1 - Request Course Access (Priority: P1)

A logged-in user browses available courses and requests access to one they are not yet enrolled in. The request is queued for admin review. The user cannot access course content until approved.

**Why this priority**: Core access-control gate — without this, all content is open.

**Independent Test**: Create a user, create a course, attempt to access content → blocked. Submit request → status shows "Pending". Admin approves → user can access content.

**Acceptance Scenarios**:

1. **Given** user is not enrolled, **When** they open a course, **Then** they see "Request Access" and "Enter Code" options instead of the video list.
2. **Given** user submits a request, **When** they open the same course again, **Then** status shows "Pending — awaiting approval" and the button is disabled.
3. **Given** user already has a pending request, **When** they try to submit another, **Then** API returns 409 and UI shows pending state.
4. **Given** admin approves the request, **When** user opens the course, **Then** they see the full video list.
5. **Given** admin denies the request, **When** user opens the course, **Then** they see a "Request denied" message and can submit a new request.

---

### User Story 2 - Redeem Enrollment Code (Priority: P1)

A user enters a code to gain immediate access to all courses linked to that code.

**Why this priority**: Provides self-service enrollment without waiting for admin action.

**Independent Test**: Create a code linked to two courses, redeem it as a user → both courses become accessible immediately.

**Acceptance Scenarios**:

1. **Given** a valid active code, **When** user enters it, **Then** they are enrolled in all courses linked to the code instantly.
2. **Given** an expired code, **When** user enters it, **Then** error: "This code has expired."
3. **Given** a code that has reached max uses, **When** user enters it, **Then** error: "This code is no longer valid."
4. **Given** an inactive code, **When** user enters it, **Then** error: "Invalid code."
5. **Given** user is already enrolled in a course linked to the code, **When** they redeem it, **Then** their existing enrollment is preserved and additional courses are added.

---

### User Story 3 - Admin Manages Enrollment Requests (Priority: P2)

Admin views all pending enrollment requests across all courses, approves or denies them individually.

**Why this priority**: Admin must control who accesses what.

**Independent Test**: Submit a request as a user → admin sees it in Requests panel → approves it → user gains access.

**Acceptance Scenarios**:

1. **Given** pending requests exist, **When** admin opens Requests section, **Then** they see a list with user name, course name, date requested.
2. **Given** admin clicks Approve, **When** confirmed, **Then** enrollment status becomes APPROVED, user receives in-platform notification and email.
3. **Given** admin clicks Deny, **When** confirmed, **Then** enrollment status becomes DENIED, user receives notification and email.
4. **Given** no pending requests, **When** admin opens Requests section, **Then** empty state is shown.

---

### User Story 4 - Admin Creates Enrollment Codes (Priority: P2)

Admin creates codes that can be shared externally to grant access to one or more courses.

**Why this priority**: Enables self-service onboarding without manual per-user approval.

**Independent Test**: Admin creates a code, links it to two courses, sets max uses to 5 — code appears in list with 0/5 used.

**Acceptance Scenarios**:

1. **Given** admin fills code form (label, optional max uses, optional expiry, selected courses), **When** saved, **Then** code appears in list.
2. **Given** a code with max uses, **When** that limit is reached, **Then** code auto-deactivates and further redemptions are rejected.
3. **Given** admin deactivates a code, **When** a user tries to redeem it, **Then** redemption is rejected immediately.
4. **Given** codes exist, **When** admin views list, **Then** they see code, label, linked courses, uses (used/max), expiry, active status.

---

### User Story 5 - Course Visibility Settings (Priority: P2)

Admin sets per-course visibility: PUBLIC (listed for all), LINK_ONLY (not listed, accessible via direct link), DRAFT (admin only).

**Why this priority**: Controls discovery without changing enrollment requirements.

**Acceptance Scenarios**:

1. **Given** course is PUBLIC, **When** any user opens the courses list, **Then** the course appears.
2. **Given** course is LINK_ONLY, **When** user opens courses list, **Then** the course is not shown; navigating directly to the course URL works if enrolled.
3. **Given** course is DRAFT, **When** a non-admin user navigates to the course URL, **Then** they receive "not found."

---

### User Story 6 - In-Platform Notifications (Priority: P3)

Users and admins see a notification bell in the sidebar showing unread count. Clicking opens a notifications page.

**Why this priority**: Closes the feedback loop without requiring email.

**Acceptance Scenarios**:

1. **Given** admin approves an enrollment, **When** user logs in, **Then** bell shows unread badge and notification reads "Your request for [Course] was approved."
2. **Given** a new enrollment request arrives, **When** admin logs in, **Then** bell shows unread badge and notification reads "[User] requested access to [Course]."
3. **Given** user clicks notification, **When** on notifications page, **Then** notification is marked read and badge decrements.

---

### Edge Cases

- User redeems a code that grants access to a course they already have pending/approved — no duplicate enrollment, existing status preserved.
- Admin approves an enrollment where the user account is inactive — approval proceeds; access is denied at login, not enrollment level.
- Code with no max uses limit — unlimited redemptions until manually deactivated.
- DRAFT course — does not appear in admin's public-facing list either (only in admin panel).
- Admin always has access to all course content regardless of enrollment state.

## Requirements

### Functional Requirements

- **FR-001**: System MUST prevent non-enrolled users from accessing course video content.
- **FR-002**: System MUST allow users to request enrollment in a course (one pending request per course at a time).
- **FR-003**: System MUST allow users to redeem an enrollment code and gain immediate access to all courses linked to it.
- **FR-004**: System MUST allow admins to approve or deny enrollment requests.
- **FR-005**: System MUST notify users via in-platform notification and email when their request is approved or denied.
- **FR-006**: System MUST notify admins via in-platform notification when a new enrollment request is submitted.
- **FR-007**: System MUST allow admins to create enrollment codes with optional max-uses and expiry date, linked to one or more courses.
- **FR-008**: System MUST track code usage count and reject redemptions when max uses is reached or code is expired/inactive.
- **FR-009**: System MUST support three course visibility states: PUBLIC, LINK_ONLY, DRAFT.
- **FR-010**: Admins MUST bypass all enrollment checks and access all course content freely.
- **FR-011**: System MUST display unread notification count in sidebar for both user and admin roles.
- **FR-012**: Users MUST be able to mark notifications as read individually or all at once.

### Key Entities

- **Enrollment**: Links a user to a course; has status (PENDING, APPROVED, DENIED); unique per user+course pair.
- **EnrollmentCode**: A reusable code with optional max-uses and expiry; linked to one or more courses via junction.
- **EnrollmentCodeTrack**: Junction linking a code to a course.
- **Notification**: A message for a specific user with type, title, body, read flag, and optional metadata.
- **Track (updated)**: Replaces boolean `isActive` with `visibility` enum (PUBLIC, LINK_ONLY, DRAFT).

## Success Criteria

- **SC-001**: A non-enrolled user attempting to access video content is blocked and redirected to the enrollment prompt within one page load.
- **SC-002**: A user can submit an enrollment request in under 30 seconds.
- **SC-003**: Redeeming a valid code grants access to all linked courses instantly (no page reload required beyond confirmation).
- **SC-004**: Admin can approve or deny a request from the Requests panel in under 3 clicks.
- **SC-005**: Notification bell updates in real time (or on next page navigation) after an enrollment decision is made.
- **SC-006**: Enrollment codes correctly enforce max-uses and expiry — zero false acceptances of invalid codes.

## Assumptions

- Admins have full access to all content; no enrollment check applies to the ADMIN role.
- Email notifications reuse the existing MailService (Nodemailer/Gmail).
- Notifications are polled on page load / navigation, not via WebSocket (real-time push is out of scope for MVP).
- A denied request can be re-submitted by the user (status resets to PENDING on new submission).
- Code generation (random string) is handled server-side; admin can also provide a custom code string.
- LINK_ONLY courses still require enrollment to access content — visibility only controls listing appearance.
- The `isActive` boolean on Track is migrated: `true` → PUBLIC, `false` → DRAFT.
