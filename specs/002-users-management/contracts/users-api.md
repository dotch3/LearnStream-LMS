# API Contract: Users Module

**Feature**: 002-users-management  
**Base Path**: `/api/users`  
**Auth**: All endpoints require JWT Bearer token (except where noted)

---

## Admin Endpoints (require ADMIN role)

### POST /api/users — Create User

**Auth**: JWT + ADMIN role  
**Request Body**:
```json
{
  "email": "alice@example.com",
  "password": "secret123",
  "name": "Alice Smith",
  "role": "VIEWER"
}
```
**Success** `201 Created`:
```json
{
  "id": "uuid",
  "name": "Alice Smith",
  "email": "alice@example.com",
  "role": "VIEWER",
  "isActive": true,
  "createdAt": "2026-04-23T10:00:00.000Z",
  "updatedAt": "2026-04-23T10:00:00.000Z"
}
```
**Errors**:
- `400` — Validation error (missing fields, invalid email, password too short)
- `403` — Caller does not have ADMIN role
- `409` — Email already in use

---

### GET /api/users — List Users (paginated)

**Auth**: JWT + ADMIN role  
**Query Params**: `page` (default 1), `perPage` (default 20, max 100)  
**Success** `200 OK`:
```json
{
  "data": [
    {
      "id": "uuid",
      "name": "Alice Smith",
      "email": "alice@example.com",
      "role": "VIEWER",
      "isActive": true,
      "createdAt": "2026-04-23T10:00:00.000Z",
      "updatedAt": "2026-04-23T10:00:00.000Z"
    }
  ],
  "meta": {
    "total": 1,
    "page": 1,
    "perPage": 20,
    "totalPages": 1
  }
}
```
**Errors**:
- `403` — Caller does not have ADMIN role

---

### GET /api/users/:id — Get User by ID

**Auth**: JWT + ADMIN role  
**Success** `200 OK`: UserResponseDto (same as POST response)  
**Errors**:
- `403` — Not ADMIN
- `404` — User not found

---

### PATCH /api/users/:id — Update User

**Auth**: JWT + ADMIN role  
**Request Body** (all fields optional):
```json
{
  "name": "Alice Updated",
  "email": "alice.new@example.com",
  "role": "ADMIN",
  "isActive": false
}
```
**Success** `200 OK`: Updated UserResponseDto  
**Errors**:
- `400` — Validation error
- `403` — Not ADMIN
- `404` — User not found
- `409` — Email already in use by another user

---

### PATCH /api/users/:id/deactivate — Deactivate User

**Auth**: JWT + ADMIN role  
**Success** `200 OK`:
```json
{ "message": "User deactivated successfully" }
```
**Errors**:
- `403` — Not ADMIN, or attempting to deactivate self
- `404` — User not found

---

### PATCH /api/users/:id/reactivate — Reactivate User

**Auth**: JWT + ADMIN role  
**Success** `200 OK`:
```json
{ "message": "User reactivated successfully" }
```
**Errors**:
- `403` — Not ADMIN
- `404` — User not found

---

## Self-Service Endpoints (any authenticated user)

### PATCH /api/users/me/profile — Update Own Profile

**Auth**: JWT (any role)  
**Request Body**:
```json
{ "name": "My New Name" }
```
**Success** `200 OK`: Updated UserResponseDto (own profile)  
**Errors**:
- `400` — Validation error (name too short)
- `401` — Not authenticated

---

### PATCH /api/users/me/password — Change Own Password

**Auth**: JWT (any role)  
**Request Body**:
```json
{
  "currentPassword": "old-secret",
  "newPassword": "new-secret123"
}
```
**Success** `200 OK`:
```json
{ "message": "Password changed successfully" }
```
**Errors**:
- `400` — New password too short
- `401` — Current password incorrect or not authenticated

---

## Notes

- `password` field is NEVER present in any response body.
- All `PATCH /api/users/*` admin endpoints (not `/me/*`) require ADMIN role.
- The `/me/profile` and `/me/password` endpoints are always scoped to the caller's own account (resolved from the access token `sub` claim) — the URL contains no user ID.
- Deactivating a user does NOT delete or invalidate their existing access tokens immediately; the tokens expire naturally (within 15 min). However, the user cannot refresh (401 on refresh).
