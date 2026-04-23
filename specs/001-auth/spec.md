# Feature Specification: Authentication

**Feature Branch**: `001-auth`
**Created**: 2026-04-22
**Status**: Draft
**Input**: User description: "Create the authentication feature for the VideosYT training platform"

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Secure Login (Priority: P1)

A user (Viewer or Admin) opens the platform and authenticates with their email and password.
On success they gain access to the platform with an access token valid for 15 minutes and a
refresh token valid for 7 days. On failure they see a generic error message that does not
reveal whether the email address is registered. A deactivated account cannot log in even with
correct credentials.

**Why this priority**: Login is the entry gate to the entire platform. Nothing else works
without it.

**Independent Test**: Can be fully tested by submitting valid and invalid credentials and
verifying correct token issuance, correct error messages, and blocked access for deactivated
accounts.

**Acceptance Scenarios**:

1. **Given** a registered, active user with correct credentials, **When** they submit the
   login form, **Then** they receive an access token (15 min) and a refresh token (7 days)
   along with their profile data (id, name, email, role).
2. **Given** a registered user submitting a wrong password, **When** they attempt to log in,
   **Then** they receive a generic "Invalid credentials" error with no indication that the
   email exists.
3. **Given** an email address not in the system, **When** a login attempt is made with it,
   **Then** the same generic "Invalid credentials" error is returned.
4. **Given** a deactivated user account, **When** the user submits correct credentials,
   **Then** login is denied with a generic error (account status is not revealed).
5. **Given** an IP address that has made 5 failed login attempts within one minute, **When**
   a 6th attempt is made, **Then** the system returns a "too many requests" error and blocks
   further attempts until the window resets.

---

### User Story 2 — Silent Token Refresh (Priority: P1)

While a logged-in user is actively using the platform, their access token is silently
refreshed in the background before it expires, so the session continues uninterrupted. Each
refresh consumes the current refresh token and issues a new pair (rotation). Reusing an
already-consumed refresh token (replay attack) triggers full session invalidation.

**Why this priority**: Without token refresh the user would be forcibly logged out every 15
minutes, making the platform unusable.

**Independent Test**: Can be verified by holding a valid refresh token, exchanging it for a
new token pair, then attempting to reuse the old refresh token and confirming full session
invalidation.

**Acceptance Scenarios**:

1. **Given** a valid refresh token, **When** the client exchanges it, **Then** a new access
   token and a new refresh token are returned and the old refresh token is invalidated.
2. **Given** a refresh token that has already been used once, **When** it is presented again,
   **Then** the system invalidates ALL active sessions for that user and returns an
   unauthorized error.
3. **Given** an expired or malformed refresh token, **When** an exchange is attempted,
   **Then** the request is rejected with an unauthorized error.

---

### User Story 3 — Explicit Logout (Priority: P2)

A logged-in user can log out. This immediately invalidates all of their server-side refresh
tokens so that no further silent refreshes can occur, even from other devices or sessions.
The client discards the access token from memory.

**Why this priority**: Security requires a reliable logout mechanism, but the platform
remains functional without it as a first deliverable.

**Independent Test**: Can be verified by logging out, then attempting to use the previously
held refresh token and confirming it is rejected.

**Acceptance Scenarios**:

1. **Given** an authenticated user, **When** they log out, **Then** all refresh tokens
   associated with their account are invalidated server-side.
2. **Given** a refresh token from before logout, **When** it is used after logout, **Then**
   the request is rejected as unauthorized.

---

### User Story 4 — Profile Retrieval (Priority: P2)

An authenticated user can fetch their own profile data (id, name, email, role) using their
access token. This is used to display the current user's information in the UI and to
determine which features and routes are accessible based on role.

**Why this priority**: Needed for the UI to personalise the experience and enforce client-side
role-based navigation, but the platform can function at a basic level without it.

**Independent Test**: Can be verified by providing a valid access token and confirming that
the correct user's data is returned, and that an expired or missing token is rejected.

**Acceptance Scenarios**:

1. **Given** a valid access token, **When** the profile endpoint is called, **Then** the
   user's id, name, email, and role are returned.
2. **Given** an expired or absent access token, **When** the profile endpoint is called,
   **Then** the request is rejected with an unauthorized error.

---

### Edge Cases

- What happens when a user submits an empty email or password? → Validation error with field-level feedback; login is not attempted.
- What if two refresh requests are made simultaneously with the same token (race condition)? → Only the first succeeds; the second is treated as a replay attack and triggers full session invalidation.
- What if the rate-limit window resets mid-session? → The counter resets and the user may attempt login again normally.
- What if a refresh token is valid but the linked user has since been deactivated? → The refresh is rejected and the session is terminated.

---

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST authenticate users via email and password.
- **FR-002**: The system MUST issue an access token (expires in 15 minutes) and a refresh token (expires in 7 days) upon successful login.
- **FR-003**: The system MUST return a generic error message for any failed login attempt, without revealing whether the email exists in the system.
- **FR-004**: The system MUST deny login to deactivated user accounts.
- **FR-005**: The system MUST enforce a rate limit of 5 login attempts per minute per IP address, returning a "too many requests" response on breach.
- **FR-006**: The system MUST support refresh token rotation: each exchange of a refresh token MUST produce a new token pair and invalidate the previous refresh token.
- **FR-007**: The system MUST detect refresh token replay: if a previously consumed refresh token is presented, all active sessions for the affected user MUST be invalidated immediately.
- **FR-008**: The system MUST allow authenticated users to log out, invalidating all their active refresh tokens.
- **FR-009**: The system MUST provide an endpoint for authenticated users to retrieve their own profile (id, name, email, role).
- **FR-010**: The system MUST embed the user's id, email, and role in the access token payload to enable role-based access control on protected endpoints.
- **FR-011**: The access token MUST be stored client-side in memory only — persistent browser storage is prohibited.
- **FR-012**: Passwords MUST meet a minimum length of 6 characters.
- **FR-013**: The system MUST reject refresh token exchanges when the token belongs to a deactivated user.

### Key Entities

- **User**: Represents an authenticated actor. Key attributes: id, name, email, hashed password, role (ADMIN or VIEWER), active status. Users are created by admins only — no self-registration.
- **Refresh Token**: A server-side record linking a token hash to a user with an expiry date and a consumed flag. Used to detect rotation and replay attacks.
- **Token Pair**: The combination of an access token and a refresh token issued together on login or refresh.

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A user with valid credentials can complete the login flow and reach the platform in under 2 seconds under normal load.
- **SC-002**: A user whose access token expires has it silently renewed with no interruption to their session (zero visible re-login prompts during normal use).
- **SC-003**: All failed login attempts — wrong password, unknown email, deactivated account — return the same generic error message with no distinguishing information.
- **SC-004**: A replay attack on a refresh token triggers full session invalidation within the same request cycle, leaving no active sessions for that user.
- **SC-005**: After 5 failed login attempts from the same IP within one minute, further attempts are blocked for the remainder of that minute.
- **SC-006**: Logout invalidates all sessions: a refresh token used after logout is rejected 100% of the time.

---

## Assumptions

- Users are created by admins through a separate user-management feature (out of scope here). This feature only handles authentication of existing accounts.
- The platform is a web application accessed via browser; the client-side memory storage requirement applies to browser contexts.
- Password reset, social login (OAuth), and two-factor authentication are explicitly out of scope for this feature.
- The refresh token is sent from the client to the server via the request body (not a cookie), consistent with the existing API contract documented in `docs/planning/03-backend.md`.
- Rate limiting is applied per originating IP address. Proxy or load-balancer IP forwarding configuration is handled at the infrastructure level and is out of scope here.
- A single user may have multiple concurrent sessions (e.g., desktop + tablet). Logout invalidates all sessions. Replay attack also invalidates all sessions.
