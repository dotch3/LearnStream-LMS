# Feature Specification: First-Run Setup Wizard

**Feature Branch**: `006-setup-wizard`
**Created**: 2026-04-24
**Status**: Draft

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Operator Creates First Admin Account (Priority: P1)

An operator who has just deployed LearnStream-LMS opens it in a browser for the first time. The platform has no admin users yet. The system detects this and sends the operator directly to the setup page, where they fill in a name, email address, and password to create the first admin account. Once submitted successfully, the operator is redirected to the login page with a confirmation that setup is complete.

**Why this priority**: The platform is unusable until an admin account exists. This is the only user story in this feature — everything else is a guard or edge case.

**Independent Test**: Deploy a fresh instance with an empty database. Open the app. Verify: the browser lands on `/setup` without prompting for login. Fill in the form and submit. Verify: the admin account is created, the operator lands on `/login`, and the `/setup` page now redirects to `/login` immediately on any future visit.

**Acceptance Scenarios**:

1. **Given** no admin user exists, **When** an operator navigates to any page of the platform, **Then** they are redirected to `/setup`.
2. **Given** no admin user exists, **When** the operator submits the setup form with a valid name, email, and password (≥ 8 characters), **Then** the admin account is created and the operator is redirected to `/login` with a success message.
3. **Given** no admin user exists, **When** the operator submits the form with a password shorter than 8 characters, **Then** the form shows a validation error and no account is created.
4. **Given** no admin user exists, **When** the operator submits the form with an invalid email format, **Then** the form shows a validation error and no account is created.
5. **Given** setup is already complete (an admin user exists), **When** anyone navigates to `/setup`, **Then** they are immediately redirected to `/login`.
6. **Given** setup is already complete, **When** anyone calls the setup API endpoint, **Then** the endpoint returns 404 (not 401 or 403).

---

### Edge Cases

- **Concurrent setup attempts**: If two operators submit the setup form simultaneously on a fresh instance, only the first submission should succeed. The second should receive an error indicating setup is already complete.
- **Invalid form data**: All fields (name, email, password) are required. Empty submissions are rejected with clear field-level errors.
- **Network failure during submission**: The form shows an error and allows the operator to retry without side effects.

---

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST redirect any unauthenticated user to `/setup` when no admin account exists, instead of `/login`.
- **FR-002**: The setup page MUST display a form with three fields: full name, email address, and password.
- **FR-003**: The system MUST validate that the password is at least 8 characters before accepting the submission.
- **FR-004**: The system MUST validate that the email field contains a valid email format before accepting the submission.
- **FR-005**: On successful submission, the system MUST create an admin account and redirect the operator to `/login`.
- **FR-006**: After setup is complete, the setup page MUST redirect immediately to `/login` without showing the form.
- **FR-007**: After setup is complete, the setup API endpoint MUST return 404 on any request — not 401 or 403.
- **FR-008**: The setup check (whether an admin exists) MUST be a single lightweight query — it must not scan or load full user records.
- **FR-009**: The created admin account MUST be identical in structure to any other admin account created through normal user management.

---

## Success Criteria *(mandatory)*

- **SC-001**: A new operator can create the first admin account and reach the login page in under 60 seconds from opening the platform.
- **SC-002**: After setup is complete, the setup page and API are permanently inaccessible — verified across 100% of test attempts.
- **SC-003**: All form validation errors (short password, invalid email, missing fields) are displayed clearly without submitting the form.
- **SC-004**: The platform correctly gates all non-public pages behind the setup redirect when no admin exists — no page is reachable without completing setup first.

---

## Assumptions

- The database is reachable and migrations are already applied before the wizard is accessed. The wizard does not configure the database connection.
- Only one admin account is created during setup. Additional admins can be added later through the normal user management flow.
- The platform has no "super admin" concept distinct from regular ADMIN — the setup admin has the same permissions as any other admin.
- The setup state is determined entirely by the presence of at least one ADMIN user in the database. No separate configuration flag or file is used.
- The success redirect lands on `/login` with a visible confirmation message so the operator knows to log in with the credentials they just created.
