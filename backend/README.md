# LearnStream-LMS — Backend

NestJS REST API. Handles authentication, course management, progress tracking, certificate generation, email invites, and all business logic.

→ [Back to project overview](../README.md)

---

## Environment Variables

Create `backend/.env` (copy from `.env.example`):

```env
# ── Database ────────────────────────────────────────────────────
DATABASE_URL="postgresql://learnstream:learnstream_dev@localhost:5432/learnstream_db"

# ── JWT ─────────────────────────────────────────────────────────
JWT_SECRET="your-access-token-secret"
JWT_REFRESH_SECRET="your-refresh-token-secret"
JWT_EXPIRES_IN="15m"
JWT_REFRESH_EXPIRES_IN="7d"

# ── App ─────────────────────────────────────────────────────────
PORT=3000
FRONTEND_URL="http://localhost:3001"   # used for CORS and email links

# ── Email (optional — skipped if not set) ───────────────────────
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your@email.com
SMTP_PASS=your_app_password            # Gmail: use an App Password
SMTP_FROM="LearnStream <your@email.com>"
```

> **Gmail App Password:** Google Account → Security → 2-Step Verification → App passwords. Generate one for "Mail".

> In production (Railway), set these via the dashboard. `DATABASE_URL` is provided automatically by the PostgreSQL plugin.

---

## Local Development

Requires Node.js 20+ and PostgreSQL running locally.

```bash
# Install dependencies
npm install

# Apply database migrations
npx prisma migrate dev

# Start in watch mode
npm run start:dev
```

API available at http://localhost:3000  
Swagger docs at http://localhost:3000/api/docs

---

## Production Build

```bash
npm run build
npm run start:prod
```

In production, the entrypoint runs `npx prisma migrate deploy` before starting to apply any pending migrations automatically.

---

## API Modules

| Module | Prefix | Description |
|--------|--------|-------------|
| `auth` | `/api/auth` | Login, token refresh, logout |
| `users` | `/api/users` | User CRUD, invite system (admin only) |
| `setup` | `/api/setup` | Initial admin setup wizard |
| `tracks` | `/api/tracks` | Course track CRUD |
| `videos` | `/api/videos` | Video CRUD within tracks |
| `progress` | `/api/progress` | Watch progress reporting and querying |
| `certificates` | `/api/certificates` | PDF generation and public verification |
| `enrollments` | `/api/enrollments` | Enrollment requests and approvals |
| `notifications` | `/api/notifications` | In-app notification management |
| `comments` | `/api/comments` | Video comments |

---

## Prisma

```bash
# Create and apply a new migration (development only)
npx prisma migrate dev --name description_of_change

# Apply pending migrations (production / CI)
npx prisma migrate deploy

# Regenerate the Prisma client after schema changes
npx prisma generate

# Open database browser UI
npx prisma studio
```

---

## Project Structure

```
src/
├── auth/           # JWT strategy, guards, refresh token rotation
├── users/          # User CRUD, invite tokens
├── setup/          # Setup wizard — checks if first admin exists
├── tracks/         # Track CRUD with visibility and enrollment filters
├── videos/         # Video CRUD, YouTube URL validation
├── progress/       # Watch progress (80% threshold, track completion)
├── certificates/   # PDF generation, code generation, public verification
├── enrollments/    # Enrollment requests, approval flow, notifications
├── notifications/  # In-app notifications
├── comments/       # Video comments
├── mail/           # Nodemailer email templates
└── prisma/         # PrismaService and PrismaModule
```

---

## Key Design Decisions

- **Prisma 7 + driver adapter**: `PrismaPg` adapter in `PrismaService`; datasource URL is set via `prisma.config.ts` (reads `DATABASE_URL` from environment)
- **Route ordering**: Static routes (`my`, `admin`) are declared before parameterized routes (`:code`) in controllers to prevent NestJS from shadowing them
- **PDF on demand**: Certificates are generated fresh on each request from DB data — no file storage required
- **Progress never decrements**: Watch percentage is stored as `Math.max(existing, incoming)`
- **Email is optional**: If `SMTP_USER` or `SMTP_PASS` are not set, email calls are no-ops with a warning log — the app remains fully functional
