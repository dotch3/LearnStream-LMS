# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**LearnStream LMS** is a web-based training platform for hosting unlisted YouTube videos with user authentication, progress tracking, course management, enrollment flows, comments, and certificate generation.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 16 (App Router) + TypeScript + Tailwind CSS v4 |
| Backend | NestJS 11 + TypeScript |
| Database | PostgreSQL via Prisma 7 (`@prisma/adapter-pg` native driver) |
| Auth | JWT (access 15min, in-memory) + refresh token 7d (localStorage, rotation) |
| i18n | `next-intl` — `en` and `pt` locales (`frontend/messages/`) |
| PDF | pdfkit (certificate generation) |
| Deployment | Render (backend + DB via `render.yaml`) + Vercel (frontend) |

## Development Commands

### Docker (recommended — runs all three services)
```bash
docker compose up         # postgres:5433, backend:3010, frontend:3011
docker compose up --build # rebuild after Dockerfile changes
```

### Backend (runs on port 3001 locally, 3010 in Docker)
```bash
cd backend
npm run start:dev         # watch mode
npm run build             # prisma generate + nest build
npm run lint              # eslint --fix
npm run test              # jest
npm run test:watch        # jest --watch
npm run test:e2e          # jest --config ./test/jest-e2e.json
```
Run a single test file: `npx jest src/auth/auth.service.spec.ts`

### Frontend (runs on port 3000 locally, 3011 in Docker)
```bash
cd frontend
npm run dev               # Next.js dev server
npm run build
npm run lint
```

### Database / Prisma
```bash
cd backend
npx prisma migrate dev --name <migration-name>   # create + apply migration
npx prisma migrate deploy                        # apply in production
npx prisma studio                                # GUI browser
npx prisma generate                              # regenerate client after schema changes
```

## Environment Variables

**Backend** (see `backend/.env.example`):
- `DATABASE_URL` — PostgreSQL connection string
- `JWT_SECRET`, `JWT_REFRESH_SECRET`
- `JWT_EXPIRES_IN` (15m), `JWT_REFRESH_EXPIRES_IN` (7d)
- `FRONTEND_URL` — CORS origin
- `PORT`
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM` — Nodemailer/Gmail

**Frontend** (see `frontend/.env.example`):
- `NEXT_PUBLIC_API_URL` — backend URL (used client-side)
- `INTERNAL_API_URL` — backend URL from Next.js middleware/server-side (Docker internal network)

## Architecture

### Backend (NestJS)

All routes are **JWT-protected by default** via a global `JwtAuthGuard`. Use `@Public()` decorator to opt out. Use `@Roles(Role.ADMIN)` + `RolesGuard` to restrict to admins.

**Modules:**
- `auth` — login, refresh token rotation, forgot/reset password, `/auth/me`
- `users` — CRUD, profile, password change, admin password reset
- `setup` — one-time wizard (`GET /setup/status` checks if any ADMIN exists); gated by middleware
- `tracks` / `videos` — course content; `TrackVideo` join table handles many-to-many with ordering
- `progress` — `POST /progress/report` upserts `VideoProgress`; completion at **80%** (`WATCH_COMPLETE_THRESHOLD`)
- `certificates` — generated on track completion; PDF via pdfkit; public verification endpoint
- `enrollments` — request/approve/deny flow; `EnrollmentGuard` enforces access on track routes
- `enrollment-codes` — admin-created codes that auto-approve enrollment on redeem
- `invites` — token-based invite links; create user on acceptance
- `comments` — threaded comments with emoji reactions on videos
- `notifications` — in-app notifications (enrollment approved/denied, new requests)
- `mail` — Nodemailer wrapper used by auth and invites
- `prisma` — global `PrismaService` using `@prisma/adapter-pg`

**Global guards (app.module.ts):** `ThrottlerGuard` (100 req/min) and `JwtAuthGuard` applied to every route.

**Swagger:** available at `GET /api` in development.

### Frontend (Next.js App Router)

**Route layout:**
- `/` — public landing / redirect
- `/login`, `/forgot-password`, `/reset-password` — unauthenticated
- `/setup` — first-run wizard (middleware redirects here if no admin exists)
- `/invite/[token]` — accept invite link
- `/dashboard/*` — viewer area (tracks, video player, certificates, progress, profile, notifications)
- `/admin/*` — admin area (tracks, videos, users, enrollment requests, codes, invites)

**Auth state:** `AuthContext` (`src/contexts/auth.context.tsx`) holds user + access token in React state. The `axios` instance (`src/lib/axios.ts`) silently refreshes the token 1 min before expiry and redirects to `/login` on 401/403. Refresh token is stored in `localStorage`.

**i18n:** `next-intl` with `src/i18n/request.ts` and message files at `frontend/messages/{en,pt}.json`. Locale preference is stored per-user in the DB (`User.preferredLocale`).

**Middleware** (`src/middleware.ts`): calls `GET /setup/status` on every request; redirects to `/setup` if setup is incomplete, or to `/login` if hitting `/setup` after completion. Uses `INTERNAL_API_URL` for server-side fetches in Docker.

### Database (Prisma)

Key schema relationships:
- `Track ↔ Video` — many-to-many via `TrackVideo` (with `order` field)
- `User → VideoProgress` — unique per `(userId, videoId)`
- `User → Certificate` — unique per `(userId, trackId)`; generated when track is fully watched
- `Enrollment` — `(userId, trackId)` unique; statuses: `PENDING`, `APPROVED`, `DENIED`
- `EnrollmentCode → Track` — many-to-many via `EnrollmentCodeTrack`
- `RefreshToken` — hashed, consumed on use (rotation); all tokens deleted on replay attack detected

**Track visibility:** `PUBLIC` (no enrollment needed), `LINK_ONLY`, `DRAFT`.

## Key Business Rules

- Video completion threshold: **80%** watched (`progress.constants.ts`)
- Certificate is issued automatically when all videos in a track are completed
- `EnrollmentGuard` allows ADMIN unconditionally; VIEWER needs `APPROVED` enrollment (except `PUBLIC` tracks)
- Setup wizard is only accessible before any ADMIN user exists; blocked afterwards
- Refresh token replay detection: consuming an already-consumed token deletes all tokens for that user
