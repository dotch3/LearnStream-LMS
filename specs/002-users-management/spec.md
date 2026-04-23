# Feature Specification: User Management

**Feature Branch**: `002-users-management`  
**Created**: 2026-04-22  
**Status**: Draft  
**Input**: User description: "Create the user management feature for the VideosYT training platform."

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Admin Creates and Lists Users (Priority: P1)

An administrator needs to create new user accounts and view all existing users. Since there is no public self-registration, every user on the platform is created by an admin. The admin provides the new user's email, full name, and password, and optionally assigns a role (defaulting to Viewer). Admins can also list all users in a paginated view showing each user's status and role.

**Why this priority**: Core admin capability — without user creation, no one can use the platform. This is the foundational operation the entire platform depends on.

**Independent Test**: Can be tested by creating a user via the admin endpoint and verifying the user appears in the list with correct data and that the password is not exposed in any response.

**Acceptance Scenarios**:

1. **Given** an authenticated admin, **When** they submit a valid email, name, and password, **Then** the user is created with VIEWER role by default and a success response includes the new user's id, name, email, role, and isActive — but never the password.
2. **Given** an authenticated admin, **When** they submit an email that already exists, **Then** the system returns a conflict error indicating the email is already in use.
3. **Given** an authenticated admin, **When** they list all users, **Then** they receive a paginated list of users with id, name, email, role, isActive, and createdAt — no passwords.
4. **Given** an authenticated VIEWER, **When** they attempt to create a user or list users, **Then** the system returns a forbidden error.

---

### User Story 2 — Admin Views and Updates a User (Priority: P1)

An administrator needs to inspect and modify individual user accounts — correcting a name, changing a role, updating an email, or toggling active status. This is essential for day-to-day user administration.

**Why this priority**: Without the ability to update users, an admin cannot correct mistakes or manage role assignments after creation.

**Independent Test**: Can be tested by retrieving a user by ID, updating their name/role, and verifying the changes are persisted correctly.

**Acceptance Scenarios**:

1. **Given** an authenticated admin and a valid user ID, **When** they request the user's details, **Then** they receive the full user profile (id, name, email, role, isActive, createdAt, updatedAt) without the password.
2. **Given** an authenticated admin, **When** they update a user's name and role with valid data, **Then** the changes are persisted and the updated user is returned.
3. **Given** an authenticated admin, **When** they update a user's email to one already used by another user, **Then** the system returns a conflict error.
4. **Given** an authenticated admin, **When** they request a non-existent user ID, **Then** the system returns a not-found error.

---

### User Story 3 — Admin Deactivates and Reactivates Users (Priority: P1)

An administrator can disable a user's access by deactivating their account. The user's data, progress, and certificates are preserved. A deactivated user cannot log in. The admin can also reactivate the user later to restore access.

**Why this priority**: Essential for security and compliance — revoking access immediately when an employee leaves is a critical operational need.

**Independent Test**: Can be tested by deactivating a user and verifying they cannot log in, then reactivating them and verifying login works again.

**Acceptance Scenarios**:

1. **Given** an authenticated admin and an active user, **When** the admin deactivates the user, **Then** the user's isActive becomes false, their data is preserved, and subsequent login attempts are rejected.
2. **Given** an authenticated admin and an inactive user, **When** the admin reactivates the user, **Then** the user's isActive becomes true and they can log in again.
3. **Given** an authenticated admin, **When** they attempt to deactivate themselves, **Then** the system returns a forbidden error with a descriptive message.
4. **Given** an authenticated VIEWER, **When** they attempt to deactivate any user, **Then** the system returns a forbidden error.

---

### User Story 4 — User Updates Own Profile and Password (Priority: P2)

Any authenticated user (ADMIN or VIEWER) can update their own display name and change their own password. Changing a password requires providing the current password for verification. This allows users to maintain accurate profile information and secure their accounts.

**Why this priority**: Lower priority because users can function without this feature (login and consume content still works), but it is important for long-term usability and account security hygiene.

**Independent Test**: Can be tested by a Viewer updating their own name and changing their password, verifying the changes take effect and the old password no longer works.

**Acceptance Scenarios**:

1. **Given** an authenticated user, **When** they submit a new display name, **Then** the name is updated and the updated profile is returned.
2. **Given** an authenticated user, **When** they submit a correct current password and a valid new password, **Then** the password is changed and subsequent logins using the new password succeed.
3. **Given** an authenticated user, **When** they submit an incorrect current password for a password change, **Then** the system returns an unauthorized error.
4. **Given** an authenticated user A, **When** they attempt to update user B's profile via the self-profile endpoint, **Then** the system only updates user A's own profile (endpoint is always scoped to the requester's identity).

---

### Edge Cases

- What happens when an admin tries to create a user with a password shorter than 6 characters? → The system returns a validation error listing the password requirement.
- What happens when a deactivated user attempts to change their own password? → The system rejects the request (deactivated users cannot authenticate).
- What happens when a role change is applied to a user who is currently logged in? → Their existing access token retains the old role until it expires (15 min). The new role takes effect on next login.
- What happens when an admin updates a user's email to the same email (no change)? → The update succeeds without a conflict error.
- What happens when pagination parameters are out of range (e.g., page 999 with no data)? → The system returns an empty data array with correct pagination metadata.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST allow authenticated ADMINs to create new user accounts with email, password, name, and optional role.
- **FR-002**: System MUST enforce email uniqueness across all users; duplicate email on creation or update returns a conflict error.
- **FR-003**: System MUST store passwords as secure one-way hashes; plaintext passwords MUST never appear in any response.
- **FR-004**: System MUST default new users to the VIEWER role if no role is specified.
- **FR-005**: System MUST allow authenticated ADMINs to list all users in a paginated format, showing id, name, email, role, isActive, and createdAt.
- **FR-006**: System MUST allow authenticated ADMINs to retrieve a single user's full details by their unique identifier.
- **FR-007**: System MUST allow authenticated ADMINs to update a user's name, email, role, or active status.
- **FR-008**: System MUST allow authenticated ADMINs to deactivate a user (set isActive = false), preserving all their data, progress, and certificates.
- **FR-009**: System MUST prevent an admin from deactivating themselves, returning a descriptive forbidden error.
- **FR-010**: System MUST allow authenticated ADMINs to reactivate a previously deactivated user.
- **FR-011**: System MUST restrict all user administration endpoints to ADMIN role; non-ADMINs receive a forbidden error.
- **FR-012**: System MUST allow any authenticated user to update their own display name via a self-profile endpoint.
- **FR-013**: System MUST allow any authenticated user to change their own password after verifying their current password.
- **FR-014**: System MUST reject password change attempts where the provided current password does not match the stored credential.
- **FR-015**: System MUST enforce a minimum password length of 6 characters on creation and on password change.

### Key Entities

- **User**: Represents a platform account. Key attributes: unique identifier, email address (unique), display name, role (Admin or Viewer), active status, account creation and update timestamps. Password is stored internally but never exposed externally.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: An admin can create a new user account in under 30 seconds from navigating to the user management screen to receiving a success confirmation.
- **SC-002**: The user list loads within 2 seconds for up to 200 users, with correct pagination controls.
- **SC-003**: A deactivated user is unable to log in immediately after deactivation — no grace period or delay.
- **SC-004**: 100% of user-facing responses are verified to contain no password data (automated scan of API responses).
- **SC-005**: An admin cannot deactivate themselves under any circumstances — the restriction is enforced server-side and cannot be bypassed by the client.
- **SC-006**: Password changes take effect immediately — the previous password is rejected on the next authentication attempt after a change.

## Assumptions

- The platform currently has an authenticated admin user (created by the seed script from feature 001-auth) who will perform all user management operations.
- The auth feature (001-auth) is already in place; user management builds on top of the existing authentication and role enforcement infrastructure.
- Pagination defaults: 20 users per page unless the client specifies otherwise; maximum page size is 100.
- Role changes for an already-logged-in user take effect on their next login (after their current access token expires in 15 minutes) — this is acceptable behavior and does not require forced token revocation.
- "Soft delete only" means there is no hard-delete endpoint; once created, user records are never permanently removed via this feature.
- Email addresses are treated case-insensitively for uniqueness checks (e.g., `Admin@example.com` and `admin@example.com` are the same address).
- The self-profile update endpoint is always scoped to the requester's own identity via the access token — it cannot be used to update another user's profile.
