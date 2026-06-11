# LearnStream-LMS — Frontend

Next.js app for the LearnStream platform. Provides the viewer dashboard and admin panel, communicating with the backend API.

→ [Back to project overview](../README.md)

---

## Environment Variables

Create `frontend/.env.local` (copy from `.env.example`):

```env
# URL of the backend API — no trailing slash
NEXT_PUBLIC_API_URL=http://localhost:3000
```

> When running via Docker/Podman, this variable is set in `docker-compose.yml` and points to the host-mapped backend port (`http://localhost:3010`). Do not create `.env.local` when using Docker — the compose file takes precedence.

> In production (Vercel), set `NEXT_PUBLIC_API_URL` to your Railway backend URL in the Vercel dashboard.

---

## Local Development

Requires Node.js 20+ and the backend running (see [backend/README.md](../backend/README.md)).

```bash
npm install

# Development server
# Use --port 3001 if the backend is also running locally on 3000
npm run dev -- --port 3001
```

App available at http://localhost:3001

---

## Production Build

```bash
npm run build
npm run start
```

---

## Pages

### Public

| Route | Description |
|-------|-------------|
| `/login` | Email + password login |
| `/setup` | First-run admin setup wizard (redirects to login once complete) |
| `/invite/[token]` | Accept an email invitation and create an account |
| `/reset-password` | Password reset via email link |
| `/certificates/[code]` | Public certificate verification (no login required) |

### Viewer (authenticated — VIEWER or ADMIN)

| Route | Description |
|-------|-------------|
| `/dashboard/tracks` | List of available training tracks |
| `/dashboard/tracks/[id]` | Track detail with video list and progress |
| `/dashboard/tracks/[id]/videos/[videoId]` | Video player with automatic progress sync |
| `/dashboard/certificates` | List of earned certificates |
| `/dashboard/notifications` | In-app notification center |
| `/dashboard/profile` | Update name, password, and language preference |

### Admin (authenticated — ADMIN only)

| Route | Description |
|-------|-------------|
| `/admin/tracks` | Manage tracks (create, edit, reorder, activate) |
| `/admin/tracks/[id]` | Edit a track |
| `/admin/tracks/[id]/videos` | Manage videos within a track |
| `/admin/tracks/[id]/videos/[videoId]` | Edit a video |
| `/admin/tracks/[id]/enrollments` | Manage enrollment requests for a track |
| `/admin/users` | User list and management |
| `/admin/users/[id]` | Edit a user |
| `/admin/invites` | Send and manage email invites |

---

## Key Conventions

- **App Router**: All pages use the Next.js App Router (`app/` directory). Server components by default; `'use client'` only where interactivity is required
- **HTTP client**: All API calls use the named export `{ api }` from `@/lib/axios` — never a default import
- **Token storage**: Access tokens are kept in memory only — never in `localStorage` or `sessionStorage`
- **Theming**: CSS variables prefixed `--ls-*` for all colors; `dark` class on `<html>` toggled by `ThemeScript` on load
- **i18n**: `next-intl` with `en` and `pt` locales; locale stored in `NEXT_LOCALE` cookie; all user-facing strings in `messages/en.json` and `messages/pt.json`
- **Video player**: YouTube IFrame API loaded via `<Script strategy="afterInteractive">`. Progress reported every 30 seconds during playback
