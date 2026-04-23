# Quickstart: Authentication (001-auth)

**Date**: 2026-04-22
**Purpose**: Manual test scenarios to validate the auth feature end-to-end

Assumes backend running at `http://localhost:3000`.

---

## Scenario 1: Successful Login

```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "viewer@example.com", "password": "secret123"}'
```

**Expected**: HTTP 200
```json
{
  "accessToken": "<jwt>",
  "refreshToken": "<token>",
  "user": { "id": "...", "name": "João Viewer", "email": "viewer@example.com", "role": "VIEWER" }
}
```

---

## Scenario 2: Wrong Password

```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "viewer@example.com", "password": "wrongpass"}'
```

**Expected**: HTTP 401
```json
{ "statusCode": 401, "message": "Invalid credentials", "error": "Unauthorized" }
```

---

## Scenario 3: Unknown Email (same error as wrong password)

```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "nobody@example.com", "password": "anything"}'
```

**Expected**: HTTP 401 — same body as Scenario 2.

---

## Scenario 4: Rate Limit (6th attempt within 1 minute)

```bash
# Run 6 times in quick succession:
for i in {1..6}; do
  curl -s -o /dev/null -w "%{http_code}\n" -X POST http://localhost:3000/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email": "viewer@example.com", "password": "wrong"}'
done
```

**Expected**: First 5 return `401`, 6th returns `429`.

---

## Scenario 5: Silent Refresh

```bash
# 1. Login to get refresh token
REFRESH=$(curl -s -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "viewer@example.com", "password": "secret123"}' | jq -r '.refreshToken')

# 2. Exchange for new token pair
curl -X POST http://localhost:3000/auth/refresh \
  -H "Content-Type: application/json" \
  -d "{\"refreshToken\": \"$REFRESH\"}"
```

**Expected**: HTTP 200 with new `accessToken` and new `refreshToken`.

---

## Scenario 6: Replay Attack Detection

```bash
# 1. Get a refresh token
REFRESH=$(curl -s -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "viewer@example.com", "password": "secret123"}' | jq -r '.refreshToken')

# 2. Use it once (legitimate)
curl -s -X POST http://localhost:3000/auth/refresh \
  -H "Content-Type: application/json" \
  -d "{\"refreshToken\": \"$REFRESH\"}"

# 3. Use the SAME token again (replay)
curl -X POST http://localhost:3000/auth/refresh \
  -H "Content-Type: application/json" \
  -d "{\"refreshToken\": \"$REFRESH\"}"
```

**Expected**: Step 2 returns HTTP 200. Step 3 returns HTTP 401. All sessions for the user
are now invalidated — a fresh login is required.

---

## Scenario 7: Get Profile

```bash
ACCESS=$(curl -s -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "viewer@example.com", "password": "secret123"}' | jq -r '.accessToken')

curl http://localhost:3000/auth/me \
  -H "Authorization: Bearer $ACCESS"
```

**Expected**: HTTP 200
```json
{ "id": "...", "name": "João Viewer", "email": "viewer@example.com", "role": "VIEWER" }
```

---

## Scenario 8: Logout then Refresh Rejected

```bash
ACCESS=$(curl -s -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "viewer@example.com", "password": "secret123"}' | jq -r '.accessToken')

REFRESH=$(curl -s -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "viewer@example.com", "password": "secret123"}' | jq -r '.refreshToken')

# Logout
curl -X POST http://localhost:3000/auth/logout \
  -H "Authorization: Bearer $ACCESS"

# Try to use refresh token after logout
curl -X POST http://localhost:3000/auth/refresh \
  -H "Content-Type: application/json" \
  -d "{\"refreshToken\": \"$REFRESH\"}"
```

**Expected**: Logout returns HTTP 200. Refresh attempt returns HTTP 401.
