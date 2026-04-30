# Quickstart: Certificate Generation — Manual Test Scenarios

**Feature**: 005-certificates
**Date**: 2026-04-23
**Prerequisite**: Backend running, PostgreSQL with all migrations applied, viewer user has completed all active videos in a track.

---

## Setup

```bash
VIEWER_TOKEN="<JWT from POST /auth/login as viewer>"
ADMIN_TOKEN="<JWT from POST /auth/login as admin>"
TRACK_ID="<UUID of a track with all active videos completed by viewer>"
VIEWER_USER_ID="<UUID of the viewer user>"
```

---

## Scenario 1: Eligible viewer generates certificate (first time)

```bash
curl -X POST "http://localhost:3000/api/certificates/tracks/$TRACK_ID" \
  -H "Authorization: Bearer $VIEWER_TOKEN" \
  --output certificate.pdf
```
**Expected**: HTTP 200, PDF file saved as `certificate.pdf`. Open it and verify it contains viewer's name, track name, date, and a code like `CERT-2026-XXXXX`.

---

## Scenario 2: Idempotent — same request returns same certificate

```bash
curl -X POST "http://localhost:3000/api/certificates/tracks/$TRACK_ID" \
  -H "Authorization: Bearer $VIEWER_TOKEN" \
  --output certificate2.pdf
```
**Expected**: HTTP 200, PDF with the same code as Scenario 1. No new record in DB.

---

## Scenario 3: Ineligible viewer (incomplete track)

```bash
INCOMPLETE_TRACK_ID="<UUID of a track viewer has NOT finished>"
curl -X POST "http://localhost:3000/api/certificates/tracks/$INCOMPLETE_TRACK_ID" \
  -H "Authorization: Bearer $VIEWER_TOKEN"
```
**Expected**: `403 Forbidden` with message about eligibility.

---

## Scenario 4: List viewer's own certificates

```bash
curl -X GET "http://localhost:3000/api/certificates/my" \
  -H "Authorization: Bearer $VIEWER_TOKEN"
```
**Expected**: JSON array with 1 entry (from Scenario 1) containing code, trackName, issuedAt, completedVideoCount.

---

## Scenario 5: Public certificate verification (no auth)

```bash
CODE="CERT-2026-XXXXX"  # replace with actual code from Scenario 1
curl -X GET "http://localhost:3000/api/certificates/$CODE"
```
**Expected**: `{ recipientName, trackName, issuedAt }` — no email, no userId.

---

## Scenario 6: Invalid code — public verify

```bash
curl -X GET "http://localhost:3000/api/certificates/CERT-9999-ZZZZZ"
```
**Expected**: `404 Not Found`.

---

## Scenario 7: Admin generates certificate for eligible user

```bash
curl -X POST "http://localhost:3000/api/certificates/admin/users/$VIEWER_USER_ID/tracks/$TRACK_ID" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  --output admin-generated.pdf
```
**Expected**: HTTP 200, same PDF as viewer's certificate (same code, idempotent).

---

## Scenario 8: Admin generates for ineligible user

```bash
OTHER_USER_ID="<UUID of user with incomplete track>"
curl -X POST "http://localhost:3000/api/certificates/admin/users/$OTHER_USER_ID/tracks/$TRACK_ID" \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```
**Expected**: `403 Forbidden`.

---

## Scenario 9: Viewer cannot use admin endpoint

```bash
curl -X POST "http://localhost:3000/api/certificates/admin/users/$VIEWER_USER_ID/tracks/$TRACK_ID" \
  -H "Authorization: Bearer $VIEWER_TOKEN"
```
**Expected**: `403 Forbidden`.

---

## Scenario 10: Admin lists all certificates

```bash
curl -X GET "http://localhost:3000/api/certificates/admin" \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```
**Expected**: JSON with `data` array containing all certificates with userId, userName, trackName.

---

## Scenario 11: Admin filters by userId

```bash
curl -X GET "http://localhost:3000/api/certificates/admin?userId=$VIEWER_USER_ID" \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```
**Expected**: Only certificates belonging to viewer user.

---

## Scenario 12: Unauthenticated request to protected endpoint

```bash
curl -X POST "http://localhost:3000/api/certificates/tracks/$TRACK_ID"
```
**Expected**: `401 Unauthorized`.
