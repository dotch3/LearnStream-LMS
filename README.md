# LearnStream-LMS

**LearnStream: The open source infrastructure for your own course platform.**

> Host your own videos, monitor progress, and issue certificates automatically.

[![GitHub](https://img.shields.io/badge/GitHub-dotch3%2FLearnStream--LMS-181717?logo=github)](https://github.com/dotch3/LearnStream-LMS)

---

## What is LearnStream-LMS?

LearnStream-LMS is a self-hosted training platform built for organizations that want full control over their learning content. Connect your unlisted YouTube videos, deliver structured courses to your team, track how far each learner has gone, and automatically issue verifiable PDF certificates when they finish a track — all from your own infrastructure.

No third-party LMS. No per-seat pricing. No lock-in.

---

## Built with AI Agents

This project is developed as a **hands-on practice environment for AI-assisted software development**. Every feature follows a structured cycle — specification → planning → task breakdown → implementation — executed with the help of AI coding agents (Claude Code + SpecKit). The goal is to explore how far AI agents can take a real-world product from zero to production.

---

## Core Features

| Feature | Description |
|---------|-------------|
| Authentication | JWT access tokens (15 min) + refresh tokens (7 days, rotation) |
| Role-based access | `ADMIN` and `VIEWER` roles — admins manage, viewers learn |
| Track & video management | Organize videos into tracks with ordering and activation |
| Progress tracking | 80% watch threshold marks a video complete; real-time sync every 30 seconds |
| Certificate generation | PDF certificates issued automatically when a track is fully completed |
| Public verification | Anyone can verify a certificate's authenticity by its unique code — no login required |

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 15 + TypeScript + Tailwind CSS |
| Backend | NestJS + TypeScript |
| Database | PostgreSQL via Prisma ORM |
| Auth | JWT (access + refresh with rotation) |
| Video | YouTube IFrame API (unlisted videos) |
| PDF | PDFKit (server-side, streamed on demand) |
| Deployment | Vercel (frontend) + Railway (backend + DB) |

---

## Repository Structure

```
LearnStream-LMS/
├── backend/     # NestJS REST API — modules, DB, PDF generation
├── frontend/    # Next.js app — viewer dashboard and admin panel
└── specs/       # SpecKit feature specifications and implementation plans
```

Detailed setup instructions live in each sub-project:

- [Backend — API setup and environment](./backend/README.md)
- [Frontend — UI setup and environment](./frontend/README.md)

---

## Quick Start

```bash
# 1. Clone the repository
git clone https://github.com/dotch3/LearnStream-LMS.git
cd LearnStream-LMS

# 2. Set up the backend (API + database)
cd backend
cp .env.example .env   # fill in DATABASE_URL, JWT secrets
npm install
npx prisma migrate dev
npm run start:dev

# 3. Set up the frontend (separate terminal)
cd ../frontend
cp .env.example .env.local  # fill in NEXT_PUBLIC_API_URL
npm install
npm run dev
```

See [backend/README.md](./backend/README.md) and [frontend/README.md](./frontend/README.md) for all environment variables and configuration options.

---

## Deployment

- **Frontend** → Deploy to [Vercel](https://vercel.com) (connect the `/frontend` directory)
- **Backend + DB** → Deploy to [Railway](https://railway.app) (NestJS service + PostgreSQL plugin)

Set the required environment variables in each platform's dashboard. The backend runs `npx prisma migrate deploy` on startup in production.

---

## License

MIT
