# LearnStream-LMS — Frontend

Next.js 15 app for the LearnStream platform. Provides the viewer dashboard and admin panel, communicating with the backend API.

→ [Back to project overview](../README.md)

---

## Pages

### Viewer (authenticated, role: VIEWER or ADMIN)

| Route | Description |
|-------|-------------|
| `/dashboard/tracks` | List of available training tracks |
| `/dashboard/tracks/[id]` | Track detail with video list and progress |
| `/dashboard/tracks/[id]/videos/[videoId]` | Video player with automatic progress sync |
| `/dashboard/certificates` | List of earned certificates |

### Admin (authenticated, role: ADMIN)

| Route | Description |
|-------|-------------|
| `/admin/tracks` | Manage tracks (create, edit, reorder, activate) |
| `/admin/tracks/[id]/videos` | Manage videos within a track |

### Public

| Route | Description |
|-------|-------------|
| `/login` | Email + password login |

---

## Environment Variables

Create a `.env.local` file in this directory:

```env
NEXT_PUBLIC_API_URL="http://localhost:3000"
```

---

## Running the App

```bash
npm install

# Development (defaults to http://localhost:3000; use --port 3001 if the backend is also running locally)
npm run dev

# Production build
npm run build
npm run start
```

---

## Key Conventions

- **App Router**: All pages use the Next.js App Router (`app/` directory). SSR for authenticated pages, client components only where interactivity is required (video player, forms)
- **HTTP client**: All API calls use the named export `{ api }` from `@/lib/axios` — never a default import
- **Token storage**: Access tokens are kept in memory only — never in `localStorage` or `sessionStorage`
- **Video player**: YouTube IFrame API loaded via `<Script strategy="afterInteractive">`. Progress reported every 30 seconds during playback
