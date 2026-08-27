# Smart Task & Analytics Manager

A production-shaped backend API for managing tasks — built as a portfolio piece to demonstrate a clean layered architecture, strict typing, thorough validation, and a real test pyramid, not just a working demo.

[![CI](https://github.com/p33cz/STAM/actions/workflows/ci.yml/badge.svg)](https://github.com/p33cz/STAM/actions/workflows/ci.yml)

## Tech stack

| Concern            | Choice                                                                                                          | Why                                                                                                                        |
| ------------------ | --------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| Runtime / language | Node.js 22, TypeScript (strict)                                                                                 | `exactOptionalPropertyTypes`, `noUncheckedIndexedAccess` and friends turned on — see [Design decisions](#design-decisions) |
| Framework          | [Fastify](https://fastify.dev/) 5                                                                               | schema-based validation/serialization pipeline, low overhead                                                               |
| Database / ORM     | PostgreSQL + [Prisma](https://www.prisma.io/)                                                                   | type-safe queries, versioned SQL migrations                                                                                |
| Validation         | [Zod](https://zod.dev/) 4 + [fastify-type-provider-zod](https://github.com/turkerdev/fastify-type-provider-zod) | one schema drives request validation, response serialization, and TS types                                                 |
| Testing            | [Vitest](https://vitest.dev/) + [vitest-mock-extended](https://github.com/eratio08/vitest-mock-extended)        | unit tests against mocked interfaces, integration tests against a real Postgres                                            |
| Tooling            | ESLint 9 (flat config, type-checked rules), Prettier, Husky + lint-staged                                       | quality gates enforced, not just suggested                                                                                 |

## Architecture

```
HTTP request
     │
     ▼
┌─────────┐     Zod schema validates body/query/params
│  Route  │◄──  before the handler ever runs
└────┬────┘
     ▼
┌────────────┐   parses request, calls service,
│ Controller │   maps result to an HTTP response —
└─────┬──────┘   no business logic lives here
      ▼
┌─────────┐   business rules: mock AI tag suggestion,
│ Service │   pagination math, partial-update semantics
└────┬────┘
     ▼
┌────────────┐   the only layer that imports PrismaClient
│ Repository │
└─────┬──────┘
      ▼
 PostgreSQL
```

Each arrow points one way. Controllers never touch Prisma; services never see `FastifyRequest`. Repositories and services are built with **factory functions that take an injectable dependency**, not classes:

```ts
export function createTaskService(
  repository: TaskRepository = createTaskRepository(),
): TaskService { ... }
```

The default wires the real Prisma-backed repository; tests pass a mock instead (via `vitest-mock-extended`). This is what makes it possible to unit-test business logic — pagination math, the mock "AI" tag suggestion, partial-update field filtering — without a database, while integration tests still exercise the real thing end-to-end.

Errors follow the same one-way flow: any layer can `throw`, and a single global handler (`src/middlewares/error-handler.ts`) is the only place that turns an error into an HTTP response — see [Error handling](#error-handling).

## Getting started

### Option A — Docker (recommended, one command)

```bash
docker compose up --build
```

This starts Postgres, applies migrations via a one-shot `migrate` service, and boots the API on `http://localhost:3000`. Nothing else to install.

### Option B — local Node.js

Requires Node 22 (see `.nvmrc`) and a running PostgreSQL instance.

```bash
npm install
cp .env.example .env        # adjust DATABASE_URL if needed
npx prisma migrate deploy   # apply migrations
npm run dev                 # http://localhost:3000, reloads on change
```

Verify it's alive:

```bash
curl http://localhost:3000/health
```

## Environment variables

See `.env.example`. All of them are validated at startup with Zod (`src/config/env.ts`) — a missing or malformed value fails the process immediately with a clear message instead of surfacing as a cryptic error on the first request.

| Variable       | Default       | Description                             |
| -------------- | ------------- | --------------------------------------- |
| `DATABASE_URL` | — (required)  | PostgreSQL connection string            |
| `PORT`         | `3000`        | HTTP port                               |
| `HOST`         | `0.0.0.0`     | Bind address                            |
| `NODE_ENV`     | `development` | `development` \| `test` \| `production` |
| `LOG_LEVEL`    | `info`        | Pino log level                          |

## API reference

All responses are JSON. Timestamps are ISO 8601.

### `POST /tasks` — create a task

```bash
curl -X POST http://localhost:3000/tasks \
  -H "Content-Type: application/json" \
  -d '{"title": "Fix login bug", "description": "Urgent bug in the API server", "priority": "HIGH"}'
```

`description` is run through a mock AI keyword matcher (`src/utils/tag-suggester.ts`) that suggests `tags` automatically — a stand-in for a future real classifier, same input/output shape.

<details>
<summary>Response — <code>201 Created</code></summary>

```json
{
  "id": "630b0308-58a2-48fe-ba9d-690d8391e69c",
  "title": "Fix login bug",
  "description": "Urgent bug in the API server",
  "status": "TODO",
  "priority": "HIGH",
  "tags": ["urgent", "bug", "backend"],
  "dueDate": null,
  "createdAt": "2026-08-27T19:00:15.937Z",
  "updatedAt": "2026-08-27T19:00:15.937Z"
}
```

</details>

| Field         | Type                        | Notes                          |
| ------------- | --------------------------- | ------------------------------ |
| `title`       | string                      | required, 1–200 chars          |
| `description` | string                      | optional, ≤ 2000 chars         |
| `priority`    | `LOW` \| `MEDIUM` \| `HIGH` | optional, defaults to `MEDIUM` |
| `dueDate`     | ISO date string             | optional                       |

`status` is not accepted here — every task starts as `TODO`. Transition it via `PATCH`.

### `GET /tasks` — list, filter, paginate

```bash
curl "http://localhost:3000/tasks?status=TODO&priority=HIGH&page=1&pageSize=20"
```

| Query param | Type                              | Notes                   |
| ----------- | --------------------------------- | ----------------------- |
| `page`      | number                            | default `1`             |
| `pageSize`  | number                            | default `20`, max `100` |
| `status`    | `TODO` \| `IN_PROGRESS` \| `DONE` | optional filter         |
| `priority`  | `LOW` \| `MEDIUM` \| `HIGH`       | optional filter         |

<details>
<summary>Response — <code>200 OK</code></summary>

```json
{
  "data": [{ "id": "...", "title": "...", "...": "..." }],
  "meta": { "page": 1, "pageSize": 20, "total": 5, "totalPages": 1 }
}
```

</details>

### `GET /tasks/:id` — fetch one task

Returns `404` if `:id` is a well-formed UUID that doesn't exist, `400` if it isn't a UUID at all — the two are kept deliberately distinct.

### `PATCH /tasks/:id` — partial update

```bash
curl -X PATCH http://localhost:3000/tasks/<id> \
  -H "Content-Type: application/json" \
  -d '{"status": "IN_PROGRESS"}'
```

Every field is optional, but the body can't be empty. `description`/`dueDate` accept an explicit `null` to clear them — distinct from omitting the key, which leaves the field untouched.

### `DELETE /tasks/:id` — delete a task

Returns `204 No Content`. `404` if the task doesn't exist.

### Error handling

Every error, from every layer, is mapped to the same shape by one global handler:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Request validation failed",
    "details": [
      { "path": "title", "message": "Invalid input: expected string, received undefined" }
    ]
  }
}
```

| Status | `code`                  | Cause                                                                |
| ------ | ----------------------- | -------------------------------------------------------------------- |
| 400    | `VALIDATION_ERROR`      | Zod request validation failed (body/query/params)                    |
| 404    | `NOT_FOUND`             | referenced task doesn't exist                                        |
| 404    | `ROUTE_NOT_FOUND`       | no route matches the request                                         |
| 500    | `INTERNAL_SERVER_ERROR` | anything unexpected — logged server-side, never leaked to the client |

## Testing

```bash
npm test              # run once
npm run test:watch    # watch mode
npm run test:coverage # with coverage report (coverage/)
```

Integration tests run against a **real, separate Postgres database** (`stam_test`, configured in `.env.test`, loaded by `tests/setup.ts`) — not an in-memory fake — so they catch the class of bugs unit tests structurally can't (query/schema mismatches, serialization edge cases). Before running tests locally, make sure that database exists and has migrations applied:

```bash
createdb stam_test
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/stam_test?schema=public" npx prisma migrate deploy
```

| Layer       | Location             | What it covers                                                                                                        |
| ----------- | -------------------- | --------------------------------------------------------------------------------------------------------------------- |
| Unit        | `tests/unit/`        | pure tag-matching function, service logic against a mocked repository, env validation, the error handler in isolation |
| Integration | `tests/integration/` | every route end-to-end through `app.inject()`, against the real test database                                         |

Current coverage: **98%+ statements/lines, 90%+ branches** (run `npm run test:coverage` for the current numbers — see `coverage/` after running).

## Project structure

```
src/
├── server.ts            # entrypoint: env, listen, graceful shutdown
├── app.ts                # builds the Fastify instance (testable via inject())
├── config/                # env validation, Prisma client singleton
├── routes/                # URL -> controller wiring + Zod schemas per route
├── controllers/           # HTTP adapters — no business logic
├── services/              # business rules (mock AI tagging, pagination, partial updates)
├── repositories/          # the only layer that imports PrismaClient
├── schemas/                # Zod request/response schemas, kept separate from the Prisma model
├── middlewares/            # global error handler
└── utils/                  # pure helpers (tag suggester, error classes)
prisma/
├── schema.prisma
└── migrations/
tests/
├── unit/
└── integration/
```

## Scripts

| Script                                      | Purpose                              |
| ------------------------------------------- | ------------------------------------ |
| `npm run dev`                               | dev server with reload (`tsx watch`) |
| `npm run build`                             | compile to `dist/`                   |
| `npm start`                                 | run the compiled build               |
| `npm run lint` / `lint:fix`                 | ESLint (type-checked rules)          |
| `npm run format` / `format:check`           | Prettier                             |
| `npm run typecheck`                         | `tsc --noEmit`                       |
| `npm test` / `test:watch` / `test:coverage` | Vitest                               |
| `npm run prisma:migrate`                    | create + apply a dev migration       |
| `npm run prisma:migrate:deploy`             | apply pending migrations (CI/prod)   |
| `npm run prisma:studio`                     | Prisma's DB browser GUI              |

A Husky pre-commit hook runs `lint-staged` (ESLint + Prettier on staged files), so style/lint issues can't land in a commit.

## Design decisions

A few choices worth being able to defend, condensed:

- **UUID primary keys, not auto-increment ints.** Doesn't leak row counts or let ids be enumerated in a public API.
- **`tags` as a native Postgres `text[]`, not a join table.** The MVP doesn't need cross-task tag queries or tag metadata; a join table would be speculative complexity (YAGNI). Straightforward to migrate to one later if that changes.
- **Prisma migrations (`migrate dev`/`deploy`), not `db push`.** `db push` has no migration history — fine for a prototype, wrong for anything meant to look like it could ship. Every schema change here is a reviewable SQL file.
- **Repository translates Prisma's `P2025` (record not found) into a domain `NotFoundError`.** `update`/`delete` need one DB round-trip instead of a separate existence check, and the service layer never has to know Prisma is involved.
- **`fastify-type-provider-zod` over manual `.parse()` calls in controllers.** Validation happens once, at the route boundary, with the same schema also driving response serialization and the inferred `request.body`/`request.query` types.
- **Factory functions + parameter injection over classes/DI containers.** `createTaskService(repository = createTaskRepository())` is enough to make business logic unit-testable in isolation; a DI framework would be solving a problem this project doesn't have.

## License

MIT
