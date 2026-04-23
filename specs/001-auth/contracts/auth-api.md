# API Contracts: Authentication (001-auth)

**Date**: 2026-04-22
**Branch**: `001-auth`
**Base URL**: `/auth`

All responses follow a consistent JSON structure. Error responses use NestJS default format.
All protected endpoints require `Authorization: Bearer <accessToken>` header.

---

## POST /auth/login

Authenticate a user with email and password. Issues an access token and a refresh token.

**Auth required**: No
**Rate limit**: 5 requests/minute per IP (429 on breach)

### Request

```json
{
  "email": "string",    // required, valid email format
  "password": "string"  // required, min 6 characters
}
```

### Response 200 — Success

```json
{
  "accessToken": "string",   // JWT, expires in 15 minutes
  "refreshToken": "string",  // opaque token, expires in 7 days
  "user": {
    "id": "string",
    "name": "string",
    "email": "string",
    "role": "ADMIN | VIEWER"
  }
}
```

### Response 400 — Validation Error

```json
{
  "statusCode": 400,
  "message": ["email must be an email", "password must be longer than or equal to 6 characters"],
  "error": "Bad Request"
}
```

### Response 401 — Invalid Credentials (wrong password, unknown email, deactivated account)

```json
{
  "statusCode": 401,
  "message": "Invalid credentials",
  "error": "Unauthorized"
}
```

### Response 429 — Rate Limit Exceeded

```json
{
  "statusCode": 429,
  "message": "Too Many Requests",
  "error": "Too Many Requests"
}
```

---

## POST /auth/refresh

Exchange a valid refresh token for a new access token and refresh token pair (rotation).

**Auth required**: No (uses refresh token in body)

### Request

```json
{
  "refreshToken": "string"  // required, the current refresh token
}
```

### Response 200 — Success

```json
{
  "accessToken": "string",   // new JWT, expires in 15 minutes
  "refreshToken": "string"   // new refresh token, expires in 7 days (old one invalidated)
}
```

### Response 401 — Invalid / Expired / Consumed Token

```json
{
  "statusCode": 401,
  "message": "Unauthorized",
  "error": "Unauthorized"
}
```

**Note**: A consumed (replayed) token returns the same 401 but also triggers full session
invalidation for the owning user. The response body does not reveal this detail.

---

## POST /auth/logout

Invalidate all refresh tokens for the authenticated user. Client should discard the access
token from memory.

**Auth required**: Yes (Bearer access token)

### Request

No body required.

### Response 200 — Success

```json
{
  "message": "Logged out successfully"
}
```

### Response 401 — Missing or Expired Access Token

```json
{
  "statusCode": 401,
  "message": "Unauthorized",
  "error": "Unauthorized"
}
```

---

## GET /auth/me

Retrieve the authenticated user's profile.

**Auth required**: Yes (Bearer access token)

### Request

No body. Access token in `Authorization` header.

### Response 200 — Success

```json
{
  "id": "string",
  "name": "string",
  "email": "string",
  "role": "ADMIN | VIEWER"
}
```

### Response 401 — Missing or Expired Access Token

```json
{
  "statusCode": 401,
  "message": "Unauthorized",
  "error": "Unauthorized"
}
```

---

## Error Behaviour Summary

| Scenario | HTTP Status | Message | Reveals account existence? |
|----------|-------------|---------|---------------------------|
| Wrong password | 401 | "Invalid credentials" | No |
| Unknown email | 401 | "Invalid credentials" | No |
| Deactivated account | 401 | "Invalid credentials" | No |
| Rate limit exceeded | 429 | "Too Many Requests" | No |
| Expired access token | 401 | "Unauthorized" | N/A |
| Used/expired refresh | 401 | "Unauthorized" | No |
| Replay attack | 401 | "Unauthorized" | No (silent invalidation) |
| Invalid DTO format | 400 | field-level messages | N/A |
