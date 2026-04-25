# API Contract: Setup Wizard

**Feature**: 006-setup-wizard
**Date**: 2026-04-24
**Base URL**: `/api/setup`

> ⚠️ Both endpoints are @Public() (no JWT required) and return 404 once an ADMIN user exists.

---

## GET /api/setup/status

Check whether first-run setup has been completed.

**Auth**: None (`@Public()`)

**Response 200**:
```json
{ "isSetupComplete": false }
```
or
```json
{ "isSetupComplete": true }
```

---

## POST /api/setup/admin

Create the first admin account. Locked after first use.

**Auth**: None (`@Public()`)

**Request Body**:
```json
{
  "name": "Jorge Mercado",
  "email": "admin@learnstream.app",
  "password": "securepass123"
}
```

| Field | Type | Validation |
|-------|------|-----------|
| name | string | required, non-empty |
| email | string | required, valid email format |
| password | string | required, min 8 characters |

**Response 201**: Empty body — admin created successfully.

**Error Responses**:
| Status | Condition |
|--------|-----------|
| 400 | Validation failed (missing fields, invalid email, short password) |
| 404 | Setup already complete (an admin already exists) |
