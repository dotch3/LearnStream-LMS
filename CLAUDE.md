# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**VideosYT** is a web-based training platform for hosting unlisted YouTube videos with user authentication, progress tracking, course management, and certificate generation.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js + TypeScript + Tailwind CSS |
| Backend | NestJS + TypeScript |
| Database | PostgreSQL via Prisma ORM |
| Auth | JWT (access token 15min + refresh token 7 days with rotation) |
| Video | YouTube IFrame API |
| Certificates | PDF generation (backend) |
| Deployment | Vercel (frontend) + Railway (backend + DB) |

## Architecture

**Client-Server REST architecture:**

- `frontend/` — Next.js app (not yet scaffolded)
- `backend/` — NestJS modular app (not yet scaffolded)

**Planned NestJS modules:** `auth`, `users`, `tracks`, `videos`, `progress`, `certificates`, `import`, `reports`

**Auth flow:** JWT access token (15 min) + refresh token (7 days, rotation on use). Roles: `ADMIN` and `VIEWER`.

**Progress tracking:** A video is marked watched when the user reaches 80%+ playback. Track completion triggers certificate generation.

**Import modes:** Manual form, YouTube API metadata fetch, bulk JSON/CSV, YouTube playlist import.

## Development Workflow (SpecKit)

This project uses [Specify/SpecKit](https://speckit.dev) for structured feature development. Features follow a spec → plan → tasks → implement cycle.

**SpecKit skills (via `/` commands):**

| Skill | Purpose |
|-------|---------|
| `/speckit-specify` | Create or update feature spec from description |
| `/speckit-clarify` | Ask clarification questions and encode answers into spec |
| `/speckit-plan` | Generate design artifacts (plan.md) |
| `/speckit-tasks` | Generate dependency-ordered tasks.md |
| `/speckit-implement` | Execute all tasks in tasks.md |
| `/speckit-analyze` | Cross-artifact consistency analysis |
| `/speckit-checklist` | Generate feature-specific checklist |
| `/speckit-constitution` | Create/update project constitution |

**Git skills:**

| Skill | Purpose |
|-------|---------|
| `/speckit-git-feature` | Create feature branch (sequential numbering) |
| `/speckit-git-commit` | Auto-commit after a SpecKit command completes |
| `/speckit-git-initialize` | Initialize repo with initial commit |
| `/speckit-git-remote` | Detect Git remote for GitHub integration |
| `/speckit-git-validate` | Validate branch naming conventions |

**Feature branch naming:** `feature/NNN-short-description` (sequential numbering, e.g. `feature/001-auth`)

**Git hooks (via `.specify/extensions.yml`):** Auto-commit is configured before and after each SpecKit phase.

## Key Planning Docs

Located in `docs/planning/` (git-ignored, for internal reference only):

- `00-project-overview.md` — Goals and scope
- `01-architecture.md` — System design and decisions
- `02-database.md` — Prisma schema and entity relationships
- `03-backend.md` — NestJS module details
- `04-frontend.md` — Next.js pages and components
- `05-interface-ux.md` — UX flows
- `06-business-logic.md` — Rules (80% watch threshold, certificate triggers, rate limits)
- `07-testing.md` — Test strategy
- `08-prd.md` — Product requirements

## Non-Functional Requirements

- Page load < 3 seconds
- bcrypt password hashing (10 salt rounds)
- CORS restricted to frontend domain
- Rate limiting: 5 login attempts/minute
- MVP scope: ~50 users, ~20 videos, desktop + tablet focus

## Active Technologies
- TypeScript 5.x / Node.js 20 LTS (001-auth)
- PostgreSQL via Prisma ORM — `User` and `RefreshToken` tables (001-auth)

## Recent Changes
- 001-auth: Added TypeScript 5.x / Node.js 20 LTS
