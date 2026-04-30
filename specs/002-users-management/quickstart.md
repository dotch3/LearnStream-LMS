# Quickstart: User Management — Manual Test Scenarios

**Prerequisites**:
- Backend running at `http://localhost:3000`
- Admin user exists (from seed: `admin@videosyt.com` / `admin123`)
- Obtain admin access token via `POST /auth/login`

```bash
ADMIN_TOKEN=$(curl -s -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@videosyt.com","password":"admin123"}' \
  | jq -r '.accessToken')
```

---

## Scenario 1 — Create User (Happy Path)

```bash
curl -s -X POST http://localhost:3000/api/users \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"email":"viewer@test.com","password":"pass123","name":"Test Viewer"}' \
  | jq .
```

**Expected**: `201` — User object with `role: "VIEWER"`, no `password` field.

---

## Scenario 2 — Create User with Duplicate Email

```bash
curl -s -X POST http://localhost:3000/api/users \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"email":"viewer@test.com","password":"pass123","name":"Duplicate"}' \
  | jq .
```

**Expected**: `409 Conflict` — email already in use.

---

## Scenario 3 — Create User Without ADMIN Role

```bash
# First get a viewer token
VIEWER_TOKEN=$(curl -s -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"viewer@test.com","password":"pass123"}' | jq -r '.accessToken')

curl -s -X POST http://localhost:3000/api/users \
  -H "Authorization: Bearer $VIEWER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"email":"new@test.com","password":"pass123","name":"New User"}' \
  | jq .
```

**Expected**: `403 Forbidden`.

---

## Scenario 4 — List Users (Paginated)

```bash
curl -s "http://localhost:3000/api/users?page=1&perPage=10" \
  -H "Authorization: Bearer $ADMIN_TOKEN" | jq .
```

**Expected**: `200` — `{ data: [...], meta: { total, page, perPage, totalPages } }`. No `password` in any user object.

---

## Scenario 5 — Get User by ID

```bash
USER_ID=$(curl -s "http://localhost:3000/api/users?page=1&perPage=1" \
  -H "Authorization: Bearer $ADMIN_TOKEN" | jq -r '.data[0].id')

curl -s "http://localhost:3000/api/users/$USER_ID" \
  -H "Authorization: Bearer $ADMIN_TOKEN" | jq .
```

**Expected**: `200` — Full user object, no `password`.

---

## Scenario 6 — Update User (Name + Role)

```bash
curl -s -X PATCH "http://localhost:3000/api/users/$USER_ID" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Updated Name","role":"ADMIN"}' | jq .
```

**Expected**: `200` — Updated user with new name and role.

---

## Scenario 7 — Deactivate User

```bash
curl -s -X PATCH "http://localhost:3000/api/users/$USER_ID/deactivate" \
  -H "Authorization: Bearer $ADMIN_TOKEN" | jq .
```

**Expected**: `200 { message: "User deactivated successfully" }`.

Then verify deactivated user cannot login:
```bash
curl -s -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"viewer@test.com","password":"pass123"}' | jq .
```
**Expected**: `401 Unauthorized`.

---

## Scenario 8 — Admin Cannot Deactivate Themselves

```bash
ADMIN_ID=$(curl -s http://localhost:3000/auth/me \
  -H "Authorization: Bearer $ADMIN_TOKEN" | jq -r '.id')

curl -s -X PATCH "http://localhost:3000/api/users/$ADMIN_ID/deactivate" \
  -H "Authorization: Bearer $ADMIN_TOKEN" | jq .
```

**Expected**: `403 Forbidden` with descriptive message.

---

## Scenario 9 — Reactivate User

```bash
curl -s -X PATCH "http://localhost:3000/api/users/$USER_ID/reactivate" \
  -H "Authorization: Bearer $ADMIN_TOKEN" | jq .
```

**Expected**: `200 { message: "User reactivated successfully" }`.

Then verify user can login again (Scenario 1 viewer credentials).

---

## Scenario 10 — Update Own Profile (Viewer)

```bash
VIEWER_TOKEN=$(curl -s -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"viewer@test.com","password":"pass123"}' | jq -r '.accessToken')

curl -s -X PATCH http://localhost:3000/api/users/me/profile \
  -H "Authorization: Bearer $VIEWER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"My New Display Name"}' | jq .
```

**Expected**: `200` — Updated user object with new name.

---

## Scenario 11 — Change Own Password

```bash
curl -s -X PATCH http://localhost:3000/api/users/me/password \
  -H "Authorization: Bearer $VIEWER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"currentPassword":"pass123","newPassword":"newpass456"}' | jq .
```

**Expected**: `200 { message: "Password changed successfully" }`.

Then verify old password no longer works and new password works:
```bash
curl -s -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"viewer@test.com","password":"pass123"}' | jq '.statusCode'
# Expected: 401

curl -s -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"viewer@test.com","password":"newpass456"}' | jq '.accessToken'
# Expected: a JWT string
```

---

## Scenario 12 — Change Password with Wrong Current Password

```bash
curl -s -X PATCH http://localhost:3000/api/users/me/password \
  -H "Authorization: Bearer $VIEWER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"currentPassword":"wrong-password","newPassword":"newpass456"}' | jq .
```

**Expected**: `401 Unauthorized`.
