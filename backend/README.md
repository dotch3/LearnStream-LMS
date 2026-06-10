# LearnStream-LMS — Backend

NestJS REST API for the LearnStream platform. Handles authentication, course management, progress tracking, certificate generation, and all business logic.

→ [Back to project overview](../README.md)

---

## API Modules

| Module | Prefix | Description |
|--------|--------|-------------|
| `auth` | `/api/auth` | Login, refresh token, logout |
| `users` | `/api/users` | User management (admin only) |
| `tracks` | `/api/tracks` | Course tracks CRUD |
| `videos` | `/api/videos` | Videos within tracks |
| `progress` | `/api/progress` | Watch progress reporting and querying |
| `certificates` | `/api/certificates` | PDF certificate generation and verification |

Full API documentation is available at `http://localhost:3000/api/docs` (Swagger UI) when the server is running.

---

## Local Development

### Option 1 — Docker (recommended)

Requires Docker Desktop. From the project root:

```bash
docker compose up
```

The backend will be available at `http://localhost:3000`. No manual database setup needed — PostgreSQL runs as a container and migrations apply automatically.

### Option 2 — Manual setup

Requires a local PostgreSQL instance. Create the database and user:

```sql
CREATE USER learnstream WITH PASSWORD 'learnstream_dev';
CREATE DATABASE learnstream_db OWNER learnstream;
```

Then create `backend/.env`:

```env
# Database
DATABASE_URL="postgresql://learnstream:learnstream_dev@localhost:5432/learnstream_db"

# JWT
JWT_SECRET="your-access-token-secret"
JWT_REFRESH_SECRET="your-refresh-token-secret"
JWT_EXPIRES_IN="15m"
JWT_REFRESH_EXPIRES_IN="7d"

# App
PORT=3000
FRONTEND_URL="http://localhost:3001"
```

Apply migrations and start:

```bash
npm install
npx prisma migrate dev
npm run start:dev
```

### Prisma utilities

```bash
# Apply migrations
npx prisma migrate dev

# Regenerate the Prisma client after schema changes
npx prisma generate

# Inspect the DB in a browser UI
npx prisma studio
```

---

## Running the Server

```bash
npm install

# Development (watch mode)
npm run start:dev

# Production build
npm run build
npm run start:prod
```

---

## Project Structure

```
src/
├── auth/           # JWT strategy, guards, refresh token rotation
├── users/          # User CRUD, role assignment
├── tracks/         # Track CRUD with role-aware filtering
├── videos/         # Video CRUD, YouTube URL validation
├── progress/       # Watch progress reporting and track completion checks
├── certificates/   # PDF generation, code generation, public verification
└── prisma/         # PrismaService and PrismaModule
```

---

## Key Design Decisions

- **Prisma 7 + driver adapter**: `PrismaPg` adapter in `PrismaService`; `datasource.url` set via `prisma.config.ts` (with dotenv) for migrations
- **Route ordering**: In `CertificatesController`, static routes (`my`, `admin`) are declared before the parameterized route (`:code`) to prevent NestJS from shadowing them
- **PDF on demand**: Certificates are generated fresh on each request from DB data — no file storage required
- **Progress never decrements**: Watch percentage is stored as `Math.max(existing, incoming)`
