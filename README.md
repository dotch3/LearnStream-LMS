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
| Frontend | Next.js + TypeScript + Tailwind CSS |
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
├── backend/          # NestJS REST API — auth, courses, progress, certificates
├── frontend/         # Next.js app — viewer dashboard and admin panel
├── docker-compose.yml
└── README.md
```

Sub-project details:
- [Backend — environment variables, API reference, Prisma](./backend/README.md)
- [Frontend — environment variables, pages, conventions](./frontend/README.md)

---

## Setup: Option A — Docker / Podman (recommended)

The easiest way to run the full stack locally. Requires [Docker Desktop](https://www.docker.com/products/docker-desktop/) or [Podman](https://podman.io/).

```bash
git clone https://github.com/dotch3/LearnStream-LMS.git
cd LearnStream-LMS

# Start all services (PostgreSQL + backend + frontend)
docker compose up --build
# or with Podman:
podman compose up --build
```

| Service  | URL                   |
|----------|-----------------------|
| Frontend | http://localhost:3011 |
| Backend  | http://localhost:3010 |
| Postgres | localhost:5433        |

On first run, migrations are applied automatically and the setup wizard will appear at http://localhost:3011.

**To reset everything (wipes DB data):**

```bash
docker compose down -v
```

### Email in Docker

The backend silently skips emails if SMTP is not configured. To enable it, fill in the SMTP variables in `docker-compose.yml` under the `backend` service:

```yaml
SMTP_HOST: smtp.gmail.com
SMTP_PORT: 587
SMTP_USER: your@email.com
SMTP_PASS: your_app_password    # Gmail: use an App Password
SMTP_FROM: LearnStream <your@email.com>
```

> Do not commit real credentials. Use `docker-compose.override.yml` or add `docker-compose.yml` to `.gitignore` if it contains secrets.

---

## Setup: Option B — Manual Local Development

Requires Node.js 20+ and a local PostgreSQL instance.

### 1. Database

```sql
CREATE USER learnstream WITH PASSWORD 'learnstream_dev';
CREATE DATABASE learnstream_db OWNER learnstream;
```

### 2. Backend

```bash
cd backend
cp .env.example .env
# Edit .env — fill in DATABASE_URL, JWT secrets, SMTP credentials
npm install
npx prisma migrate dev
npm run start:dev
```

Backend runs at http://localhost:3000. See [backend/README.md](./backend/README.md) for all environment variables.

### 3. Frontend

```bash
cd frontend
cp .env.example .env.local
# Edit .env.local — set NEXT_PUBLIC_API_URL=http://localhost:3000
npm install
npm run dev -- --port 3001
```

Frontend runs at http://localhost:3001. See [frontend/README.md](./frontend/README.md) for all environment variables.

---

## Deployment: Cloud (Vercel + Railway)

### Backend → Railway

1. Create a new Railway project
2. Add a **PostgreSQL** plugin — Railway sets `DATABASE_URL` automatically
3. Add a **NestJS service** pointing to the `/backend` directory
4. Set environment variables in the Railway dashboard (see [backend/README.md](./backend/README.md))
5. The backend runs `npx prisma migrate deploy` on startup — no manual migration needed

### Frontend → Vercel

1. Import the repository into Vercel
2. Set **Root Directory** to `frontend`
3. Set environment variables in the Vercel dashboard:
   - `NEXT_PUBLIC_API_URL` → your Railway backend URL (e.g. `https://your-app.railway.app`)
4. Deploy

---

## License

MIT
