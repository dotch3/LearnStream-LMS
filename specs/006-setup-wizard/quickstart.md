# Quickstart: Setup Wizard — Manual Test Scenarios

**Feature**: 006-setup-wizard
**Date**: 2026-04-24
**Prerequisite**: Backend running, PostgreSQL connected, NO admin user in the database.

---

## Scenario 1: Fresh instance — status check

```bash
curl -X GET "http://localhost:3000/api/setup/status"
```
**Expected**: `{ "isSetupComplete": false }`

---

## Scenario 2: Open the platform — redirected to /setup

Open `http://localhost:3001` in a browser.
**Expected**: Browser redirects to `http://localhost:3001/setup`. The setup form is displayed.

---

## Scenario 3: Create first admin

```bash
curl -X POST "http://localhost:3000/api/setup/admin" \
  -H "Content-Type: application/json" \
  -d '{"name":"Admin User","email":"admin@test.com","password":"admin1234"}'
```
**Expected**: HTTP 201. No body.

---

## Scenario 4: Setup now complete — status check

```bash
curl -X GET "http://localhost:3000/api/setup/status"
```
**Expected**: `{ "isSetupComplete": true }`

---

## Scenario 5: Setup endpoint locked after completion

```bash
curl -X POST "http://localhost:3000/api/setup/admin" \
  -H "Content-Type: application/json" \
  -d '{"name":"Second Admin","email":"admin2@test.com","password":"admin1234"}'
```
**Expected**: HTTP 404.

---

## Scenario 6: /setup page redirects to /login when complete

Open `http://localhost:3001/setup` in a browser (with admin already created).
**Expected**: Browser redirects to `http://localhost:3001/login`.

---

## Scenario 7: Login page shows success banner after setup

After Scenario 3 via the UI form, the browser should land on `/login?setup=done`.
**Expected**: A success banner appears: "Setup complete — please log in with your admin account."

---

## Scenario 8: Validation — short password

```bash
curl -X POST "http://localhost:3000/api/setup/admin" \
  -H "Content-Type: application/json" \
  -d '{"name":"Admin","email":"admin@test.com","password":"short"}'
```
**Expected**: HTTP 400 with validation error on `password`.

---

## Scenario 9: Validation — invalid email

```bash
curl -X POST "http://localhost:3000/api/setup/admin" \
  -H "Content-Type: application/json" \
  -d '{"name":"Admin","email":"not-an-email","password":"admin1234"}'
```
**Expected**: HTTP 400 with validation error on `email`.

---

## Scenario 10: Any page redirects to /setup when not set up

With no admin in the DB, open `http://localhost:3001/dashboard/tracks`.
**Expected**: Browser redirects to `http://localhost:3001/setup`.
