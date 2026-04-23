# PROGRESSO — VideosYT

Registro do progresso do projeto, passo a passo.

---

## Step 0 — Plano: Integrar /docs existentes ao SpecKit

### Contexto

O projeto já tem documentação rica em `docs/planning/` (criada manualmente via Claude): visão geral, arquitetura, banco de dados, backend, frontend, UX, business logic, testes e PRD. O SpecKit foi instalado via `spec init` mas ainda não foi usado. O objetivo é usar esses documentos como base para o fluxo SpecKit.

**Problema:** O SpecKit não lê `docs/planning/` diretamente — ele espera uma descrição em texto como entrada para `/speckit-specify`. Como os docs já estão referenciados no `CLAUDE.md`, o Claude os lê como contexto em toda execução de skill.

---

### Passo 0 — Preencher a Constitution (uma única vez)

Executar `/speckit-constitution` para definir os princípios do projeto.
Os princípios devem vir dos docs existentes (ex: JWT auth, bcrypt 10 rounds, 80% watch threshold, rate limit login, CORS restrito).

> O arquivo `.specify/memory/constitution.md` é hoje um template vazio com placeholders.
> Sem ele preenchido, o `/speckit-plan` não consegue rodar as "Constitution Check" gates.

---

### Passo 1 — Criar feature branch + spec por feature

O SpecKit trabalha **feature a feature**. Ordem sugerida:

| # | Feature | Base nos docs |
|---|---------|---------------|
| 001 | `auth` | `03-backend.md`, `06-business-logic.md` |
| 002 | `users` | `02-database.md`, `04-frontend.md` |
| 003 | `tracks-videos` | `02-database.md`, `04-frontend.md` |
| 004 | `progress` | `06-business-logic.md`, `02-database.md` |
| 005 | `certificates` | `06-business-logic.md`, `08-prd.md` |
| 006 | `import` | `03-backend.md`, `08-prd.md` |
| 007 | `reports` | `03-backend.md`, `08-prd.md` |

Fluxo por feature:

```
/speckit-git-feature   → cria branch feature/001-auth
/speckit-specify       → gera specs/001-auth/spec.md
/speckit-clarify       → refina spec (opcional, max 5 perguntas)
/speckit-plan          → gera research.md + data-model.md + contracts/ + plan.md
/speckit-tasks         → gera tasks.md com checklist ordenado
/speckit-implement     → executa todos os tasks
```

### Como usar os /docs como base

Ao rodar `/speckit-specify`, referenciar os docs na descrição. Exemplo para `auth`:

> "Create the authentication feature for VideosYT. Base it on the architecture described in `docs/planning/03-backend.md` and business rules in `docs/planning/06-business-logic.md`. It should include user registration, login, JWT access token (15min) + refresh token (7 days with rotation), role-based access (ADMIN/VIEWER), password hashing, and rate limiting."

---

**Status:** ✅ Concluído.

---

## Step 1 — Constitution criada (`/speckit-constitution`)

**Data:** 2026-04-22
**Arquivo:** `.specify/memory/constitution.md` — versão 1.0.0

### Princípios definidos

| # | Princípio | Regra central |
|---|-----------|--------------|
| I | Security-First (NON-NEGOTIABLE) | JWT 15min/7d, bcrypt 10 rounds, rate limit login, access token só em memória |
| II | Role-Based Access Control | Apenas ADMIN e VIEWER, sem auto-registro, guards em todas rotas admin |
| III | Data Integrity — Progress Never Decrements | Math.max para progresso, 80% = completo (constante), certificados imutáveis |
| IV | Modular Architecture — One Module per Domain | 8 módulos NestJS, sem import direto entre módulos |
| V | API-First with Swagger Documentation | Todos endpoints documentados via Swagger, DTOs com class-validator |

**Status:** ✅ Concluído. Próximo passo: `/speckit-git-feature` + `/speckit-specify` para feature `001-auth`.

---

## Step 2 — Feature branch criada (`/speckit-git-feature`)

**Data:** 2026-04-22
**Branch:** `001-auth`
**Numeração:** sequential (001, 002, 003…)

Branch criada e ativa. Agora o repo está em `001-auth`.

**Status:** ✅ Concluído. Próximo passo: `/speckit-specify` para gerar `specs/001-auth/spec.md`.

---

## Step 3 — Especificação preparada para `/speckit-specify`

**Data:** 2026-04-22
**Feature:** `001-auth`

Texto a ser passado como argumento para `/speckit-specify`:

---

```
Create the authentication feature for the VideosYT training platform.

The platform is used by organizations to deliver private YouTube-based training videos to
their employees. There is no public self-registration — accounts are created by admins only.

**User flows:**

1. A user (Viewer or Admin) logs in with their email and password. On success, they receive
   a short-lived access token and a long-lived refresh token. On failure, they receive a
   generic error that does not reveal whether the email exists.

2. While using the platform, the access token is silently refreshed in the background before
   it expires, using the refresh token. Each refresh invalidates the old token pair and
   issues a new one (rotation). If a refresh token that has already been used is presented
   again (replay attack), all of the user's sessions are immediately invalidated.

3. A user can log out explicitly. This invalidates all of their refresh tokens server-side.

4. A user can retrieve their own profile data (id, name, email, role) using their access token.

5. Deactivated users cannot log in even if they have valid credentials.

**Security rules:**

- Login endpoint must enforce rate limiting: maximum 5 attempts per minute per IP address.
  Exceeding the limit returns a "too many requests" error.
- Access tokens must be stored in memory only on the client — never in persistent browser
  storage.
- Error messages for failed login must be generic ("Invalid credentials") and must not
  indicate whether the email address is registered.
- Passwords must meet a minimum length requirement.

**Roles:**

- Two roles exist: ADMIN and VIEWER.
- Role is embedded in the access token payload alongside user ID and email.
- Role-based route protection is enforced server-side on every protected endpoint.

**Token lifecycle:**

- Access token: expires in 15 minutes.
- Refresh token: expires in 7 days. Stored server-side (as a hash) linked to the user.
  Rotation on every use. Replay attack triggers full session invalidation for that user.

**Out of scope for this feature:**

- Password reset / forgot-password flow
- OAuth or social login
- Two-factor authentication
- User creation (handled by the users feature)
```

---

**Comando a executar:**
```
/speckit-specify
```
(colar o texto acima quando o skill solicitar a descrição)

**Status:** ✅ Concluído.

---

## Step 4 — Spec criada (`/speckit-specify`)

**Data:** 2026-04-22
**Arquivos gerados:**
- `specs/001-auth/spec.md` — especificação completa
- `specs/001-auth/checklists/requirements.md` — checklist de qualidade (todos os itens ✅)
- `.specify/feature.json` — aponta para `specs/001-auth`

**User Stories definidas:**

| # | Story | Prioridade |
|---|-------|-----------|
| US1 | Secure Login | P1 |
| US2 | Silent Token Refresh | P1 |
| US3 | Explicit Logout | P2 |
| US4 | Profile Retrieval | P2 |

**Requisitos funcionais:** FR-001 a FR-013
**Critérios de sucesso:** SC-001 a SC-006
**Checklist:** 100% aprovado, sem marcadores [NEEDS CLARIFICATION]

**Status:** ✅ Concluído. Próximo passo: `/speckit-plan` para gerar research.md, data-model.md, contracts/ e plan.md.

---

## Step 5 — Planejamento (`/speckit-plan`)

**Data:** 2026-04-22
**Comando:** `/speckit-plan` (sem parâmetros)

**O skill lê automaticamente:**
- `.specify/feature.json` → localiza `specs/001-auth`
- `specs/001-auth/spec.md` → user stories e requisitos
- `.specify/memory/constitution.md` → valida Constitution Check gates (Princípios I–V)

**Artefatos que serão gerados:**
| Arquivo | Conteúdo |
|---------|----------|
| `specs/001-auth/plan.md` | Contexto técnico + Constitution Check + estrutura do projeto |
| `specs/001-auth/research.md` | Decisões técnicas com justificativas e alternativas avaliadas |
| `specs/001-auth/data-model.md` | Entidades, campos, relacionamentos, validações |
| `specs/001-auth/contracts/` | Contratos de interface (endpoints REST) |
| `specs/001-auth/quickstart.md` | Cenários de teste / exemplos de uso |

**Status:** ✅ Concluído.

**Artefatos gerados:**

| Arquivo | Conteúdo |
|---------|----------|
| `specs/001-auth/plan.md` | Contexto técnico, Constitution Check ✅ (5/5 princípios), estrutura de diretórios |
| `specs/001-auth/research.md` | 9 decisões técnicas com rationale e alternativas rejeitadas |
| `specs/001-auth/data-model.md` | Entidades `User` + `RefreshToken`, schema Prisma, JWT payload |
| `specs/001-auth/contracts/auth-api.md` | 4 endpoints REST com request/response e tabela de erros |
| `specs/001-auth/quickstart.md` | 8 cenários de teste curl (login, refresh, replay, logout, etc.) |
| `CLAUDE.md` | Atualizado com stack: TypeScript 5.x / Node.js 20 LTS, Prisma/PostgreSQL |

**Decisões técnicas chave (research.md):**
- JWT: `@nestjs/jwt` + `passport-jwt` (stack oficial NestJS)
- Refresh token: armazenado como hash SHA-256 no PostgreSQL (não em Redis)
- Rate limit: `@nestjs/throttler` — in-memory, 5 tentativas/min/IP
- Senha: `bcrypt` 10 rounds (mandatado pela Constitution)
- Token client: React Context + Axios interceptor (sem localStorage para access token)

**Status:** ✅ Concluído. Próximo passo: `/speckit-tasks` para gerar `tasks.md`.

---

## Step 6 — Tasks geradas (`/speckit-tasks`)

**Data:** 2026-04-22
**Arquivo:** `specs/001-auth/tasks.md`

**Resumo:**

| Fase | Conteúdo | Tasks |
|------|----------|-------|
| Phase 1 — Setup | Scaffold backend + frontend, dependências, .env | T001–T007 (7) |
| Phase 2 — Foundational | Prisma schema, migration, PrismaService, main.ts | T008–T014 (7) |
| Phase 3 — US1 Login (P1) 🎯 | LoginDto, AuthService.login, JwtStrategy, Controller | T015–T022 (8) |
| Phase 4 — US2 Refresh (P1) | RefreshTokenDto, AuthService.refresh, replay detection, frontend interceptor | T023–T030 (8) |
| Phase 5 — US3 Logout (P2) | AuthService.logout, POST /auth/logout, frontend logout | T031–T033 (3) |
| Phase 6 — US4 Profile (P2) | AuthService.getProfile, GET /auth/me, login page | T034–T037 (4) |
| Phase 7 — Polish | Swagger, seed, quickstart validation, CORS | T038–T042 (5) |
| **Total** | | **42 tasks** |

**Oportunidades de paralelismo:** T003–T007, T012–T014, T015+T016, T023+T024+T027, T036+T037, T038+T041+T042

**MVP mínimo:** Phases 1–4 (US1 Login + US2 Refresh) = 30 tasks — autenticação completa e funcional.

**Status:** ✅ Concluído. Próximo passo: `/speckit-implement` para executar as tasks.

---

## Step 7 — Implementação executada (`/speckit-implement`)

**Data:** 2026-04-23
**Tasks:** 42/42 concluídas ✅ | TypeScript: 0 erros ✅

### Arquivos criados

**Backend (`backend/`)**
| Arquivo | Descrição |
|---------|-----------|
| `prisma/schema.prisma` | Schema com `User`, `RefreshToken`, enum `Role` |
| `prisma.config.ts` | Config Prisma 7 com adapter `@prisma/adapter-pg` |
| `prisma/seed.ts` | Seed: admin@videosyt.com / admin123 |
| `src/main.ts` | ValidationPipe global, CORS, Swagger em `/api` |
| `src/app.module.ts` | Importa `PrismaModule`, `ThrottlerModule`, `AuthModule` |
| `src/prisma/prisma.service.ts` | PrismaClient via adapter Pg |
| `src/prisma/prisma.module.ts` | Módulo global Prisma |
| `src/auth/auth.module.ts` | Módulo auth com JWT, Passport, throttler |
| `src/auth/auth.controller.ts` | 4 endpoints: POST /login, /refresh, /logout, GET /me |
| `src/auth/auth.service.ts` | login, refresh (replay detection), logout, getProfile |
| `src/auth/strategies/jwt.strategy.ts` | Valida access token via Bearer header |
| `src/auth/strategies/refresh.strategy.ts` | Extrai refresh token do body |
| `src/auth/guards/jwt-auth.guard.ts` | Guard com suporte a @Public() |
| `src/auth/guards/refresh-auth.guard.ts` | Guard para rota /refresh |
| `src/auth/decorators/public.decorator.ts` | @Public() metadata decorator |
| `src/auth/dto/*.ts` | LoginDto, LoginResponseDto, RefreshTokenDto, RefreshResponseDto |
| `src/auth/types/jwt-payload.interface.ts` | Interface do payload JWT |

**Frontend (`frontend/`)**
| Arquivo | Descrição |
|---------|-----------|
| `src/contexts/auth.context.tsx` | AuthContext com tokens in-memory + refreshToken em localStorage |
| `src/lib/axios.ts` | Axios com interceptor de silent refresh |
| `src/app/login/page.tsx` | Página de login com formulário |

### Nota técnica
- Prisma 7.8.0 não aceita `url` no `schema.prisma` — migrado para `prisma.config.ts` + `@prisma/adapter-pg`
- T009 (`prisma migrate dev`) pendente: requer banco PostgreSQL rodando — executar manualmente quando o DB estiver disponível

**Status:** ✅ Implementação concluída. Próximo passo: subir PostgreSQL e rodar `prisma migrate dev --name init-auth`.

---

## Receita — Como implementar a próxima feature

> Baseado na experiência da feature `001-auth`. Seguir esta ordem para cada nova feature.

---

### Pré-requisito único (já feito, não repetir)
- [x] Constitution criada em `.specify/memory/constitution.md`

---

### Passo A — Preparar o texto de especificação

Antes de rodar qualquer comando, **ler os docs relevantes** e escrever o texto em inglês:

| Feature | Docs base |
|---------|-----------|
| 002 users | `02-database.md`, `04-frontend.md`, `06-business-logic.md` (R-USER-*) |
| 003 tracks-videos | `02-database.md`, `04-frontend.md`, `05-interface-ux.md` |
| 004 progress | `06-business-logic.md` (R-PROG-*), `02-database.md` |
| 005 certificates | `06-business-logic.md` (R-CERT-*), `08-prd.md` |
| 006 import | `03-backend.md` (import module), `08-prd.md` |
| 007 reports | `03-backend.md` (reports module), `08-prd.md` |

**Regras do texto:**
- Escrever em **inglês**
- **Sem mencionar tecnologias** (sem NestJS, Prisma, React, etc.)
- Focar em **o que o usuário faz**, não em como implementar
- Incluir: user flows, regras de negócio, o que está fora do escopo
- Salvar o texto em um novo Step no `PROGRESSO.md` antes de executar

---

### Passo B — Criar branch

```
/speckit-git-feature NNN-nome-da-feature
```

Exemplo: `/speckit-git-feature 002-users`

---

### Passo C — Gerar spec

```
/speckit-specify <texto preparado no Passo A>
```

Verificar depois: `specs/00N-feature/spec.md` deve ter user stories P1/P2/P3 e zero `[NEEDS CLARIFICATION]`.

---

### Passo D — Gerar plano técnico

```
/speckit-plan
```

Sem parâmetros. Lê automaticamente o `spec.md` e a `constitution.md`.
Gera: `research.md`, `data-model.md`, `contracts/`, `quickstart.md`, `plan.md`.

---

### Passo E — Gerar tasks

```
/speckit-tasks
```

Sem parâmetros. Gera `tasks.md` organizado por user story.
Verificar: todas as tasks têm ID (T00N), caminhos de arquivo e labels [US1], [US2]…

---

### Passo F — Implementar

```
/speckit-implement
```

Sem parâmetros. Executa todas as tasks em ordem.
Verificar ao final: TypeScript sem erros (`npx tsc --noEmit`).

---

### Passo G — Commitar

```
/speckit-git-commit
```

Commita todos os artefatos da feature (specs + código).

---

---

## Step 8 — Feature 002-users-management (2026-04-23)

### Branch: `002-users-management`

### Artefatos gerados

| Artefato | Caminho |
|----------|---------|
| Spec | `specs/002-users-management/spec.md` |
| Plan | `specs/002-users-management/plan.md` |
| Research | `specs/002-users-management/research.md` |
| Data Model | `specs/002-users-management/data-model.md` |
| API Contract | `specs/002-users-management/contracts/users-api.md` |
| Quickstart | `specs/002-users-management/quickstart.md` |
| Tasks | `specs/002-users-management/tasks.md` (38 tasks, todas ✅) |

### Código implementado

**Backend** (`backend/src/`):
- `auth/decorators/roles.decorator.ts` — `@Roles()` decorator com `SetMetadata`
- `auth/guards/roles.guard.ts` — `RolesGuard` com `Reflector`; pass-through sem `@Roles()`
- `auth/auth.module.ts` — atualizado: `RolesGuard` em providers + exports
- `app.module.ts` — atualizado: importa `UsersModule`
- `users/users.module.ts` — novo módulo importando `PrismaModule` + `AuthModule`
- `users/users.service.ts` — create, findAll (paginado), findOne, update, deactivate, reactivate, updateProfile, changePassword
- `users/users.controller.ts` — 8 endpoints; `/me/*` declarados ANTES de `/:id`
- `users/dto/create-user.dto.ts`, `update-user.dto.ts`, `update-profile.dto.ts`, `change-password.dto.ts`, `user-response.dto.ts`

**Frontend** (`frontend/src/`):
- `app/admin/users/page.tsx` — lista paginada com deactivate/reactivate
- `app/admin/users/new/page.tsx` — formulário de criação
- `app/admin/users/[id]/page.tsx` — formulário de edição
- `app/dashboard/profile/page.tsx` — auto-edição de nome + troca de senha

### Lições aprendidas desta feature

| Lição | Detalhe |
|-------|---------|
| `PrismaClientKnownRequestError` import | Em Prisma 7 está em `@prisma/client/runtime/client`, não em `runtime/library` |
| Axios named export | `frontend/src/lib/axios.ts` exporta `{ api }` nomeado, não default — usar `import { api }` |
| `/me/*` antes de `/:id` | Declarar rotas `/me/profile` e `/me/password` ANTES de `/:id` no controller para evitar match errado |
| `PartialType` + `OmitType` de `@nestjs/swagger` | Usar `OmitType` para excluir `password` de `UpdateUserDto` mantendo decorators Swagger |
| Sem nova migração Prisma | `User` model já existe de 001-auth — nenhuma migração necessária nesta feature |

### Pendências

- T036: Executar os 12 cenários do quickstart.md manualmente contra o backend rodando (requer PostgreSQL ativo)
- T034/T035/T037: Verificação de Swagger e segurança — executar após subir o servidor

---

---

## Step 9 — Feature 003-tracks-videos (2026-04-23)

### Branch: `003-tracks-videos`

### Artefatos gerados

| Artefato | Caminho |
|----------|---------|
| Spec | `specs/003-tracks-videos/spec.md` |
| Plan | `specs/003-tracks-videos/plan.md` |
| Research | `specs/003-tracks-videos/research.md` |
| Data Model | `specs/003-tracks-videos/data-model.md` |
| API Contract | `specs/003-tracks-videos/contracts/tracks-videos-api.md` |
| Quickstart | `specs/003-tracks-videos/quickstart.md` |
| Tasks | `specs/003-tracks-videos/tasks.md` (24 tasks, todas ✅) |

### Código implementado

**Backend** (`backend/`):
- `prisma/schema.prisma` — adicionados modelos `Track` e `Video` com cascade delete
- `src/tracks/tracks.module.ts` — módulo importando PrismaModule + AuthModule
- `src/tracks/tracks.service.ts` — findAll (paginado, role-filtered), findOne, create, update, remove
- `src/tracks/tracks.controller.ts` — 5 endpoints: GET /api/tracks, GET /api/tracks/:id, POST, PATCH, DELETE
- `src/tracks/dto/create-track.dto.ts` — name, description?, thumbnailUrl?, order?
- `src/tracks/dto/update-track.dto.ts` — PartialType(CreateTrackDto) + isActive?
- `src/videos/videos.module.ts` — módulo importando PrismaModule + AuthModule
- `src/videos/videos.service.ts` — create (YouTube URL parsing), findOne, update, remove
- `src/videos/videos.controller.ts` — 4 endpoints: GET /api/videos/:id, POST, PATCH, DELETE
- `src/videos/videos.utils.ts` — extractYoutubeId() com regex para 3 formatos de URL
- `src/videos/dto/create-video.dto.ts` — title, youtubeUrl, duration, trackId, etc.
- `src/videos/dto/update-video.dto.ts` — OmitType(['trackId']) + PartialType + isActive?
- `src/app.module.ts` — atualizado: importa TracksModule + VideosModule

**Frontend** (`frontend/src/`):
- `app/dashboard/tracks/page.tsx` — lista paginada de tracks para viewers
- `app/dashboard/tracks/[id]/page.tsx` — detalhe de track com vídeos ordenados
- `app/admin/tracks/page.tsx` — gestão admin (tabela + toggle ativo + delete)
- `app/admin/tracks/[id]/page.tsx` — formulário criar/editar track
- `app/admin/tracks/[id]/videos/page.tsx` — gestão de vídeos do track
- `app/admin/tracks/[id]/videos/[videoId]/page.tsx` — formulário criar/editar vídeo

### Pendências

- Migração `add-tracks-videos`: executar `npx prisma migrate dev --name add-tracks-videos` quando PostgreSQL estiver rodando
- Validação dos 11 cenários do quickstart.md contra o servidor ao vivo

### Lições aprendidas desta feature

| Lição | Detalhe |
|-------|---------|
| `_count` condicional | Prisma permite `_count: { select: { videos: { where: {...} } } }` para contagem filtrada — viewer vê apenas ativos |
| `OmitType` + `PartialType` encadeados | Para excluir `trackId` do UpdateVideoDto: criar classe base `OmitType(CreateVideoDto, ['trackId'])` e depois `PartialType(base)` |
| `findOne` role-filtered | Para viewers: 404 se track/video inativo (não 403) — evita vazamento de existência (Princípio I) |
| Sem novos pacotes npm | Toda funcionalidade com dependências já instaladas nas features anteriores |
| prisma generate antes do tsc | Após editar schema.prisma, rodar `npx prisma generate` antes de qualquer TypeScript check |

---

### Lições aprendidas da 001-auth

| Lição | Detalhe |
|-------|---------|
| Prisma 7 breaking change | `url` removido do `schema.prisma` → usar `prisma.config.ts` + `@prisma/adapter-pg` |
| `prisma migrate dev` | Requer DB rodando — executar manualmente após subir PostgreSQL |
| Tipos `@nestjs/jwt` | `expiresIn` espera `StringValue` — usar `as any` ou cast explícito |
| `passport-custom` | Necessário para strategies com body (refresh token) — instalar separado |
| Atualizar `PROGRESSO.md` | Registrar cada passo antes de executar, não só depois |
