# Development

Requirements: Node 24, npm 10, and either Docker (recommended) or a local
MongoDB 7/8.

## Running with Docker (recommended)

Three containers with hot reload — API (nodemon), UI (Vite HMR), MongoDB — plus
Mailpit for mail:

```bash
cp .env.sample .env          # fill in DB_* , SESSION_SECRET, ADMIN_EMAIL/PASSWORD
cp mongo.env.sample mongo.env  # user/password/db must match the .env DB_* values
docker compose -f docker-compose.dev.yml up --build
```

| Service | URL |
|---------|-----|
| Web app (Vite HMR) | http://localhost:3000 |
| API | http://localhost:3001 |
| Swagger UI | http://localhost:3001/api-docs |
| Mailpit inbox | http://localhost:8025 |

Source is bind-mounted, so changes reload automatically. The dev containers keep
their **own `node_modules`** (an anonymous volume), so after adding or changing
an npm dependency:

```bash
docker exec darts-score-api-1 npm install   # and/or darts-score-ui-1
touch app-api/index.js                        # nodemon restarts; for the UI, touch any src file
```

## Running without Docker

Needs a MongoDB reachable at the address in `app-api/.env` (`DB_HOST=localhost`).

```bash
# terminal 1
cd app-api && npm install && npm run dev      # nodemon on :3001

# terminal 2
cd app-ui && npm install && npm run dev        # Vite on :3000, proxies /api to :3001
```

## Looking at the app without a database

The mock API (`app-ui/e2e/mock/server.mjs`) serves a club with players, games,
badges and tournaments, computed with the API's **own** rules — so the UI runs in
the browser without MongoDB. Useful for trying a page (e.g. at phone width):

```bash
cd app-ui
node e2e/mock/server.mjs &                                    # on :3901
API_PROXY_TARGET=http://localhost:3901 npx vite --port 5199    # http://localhost:5199
```

By default the mock user is a global admin. Prefix the mock command with
`AS_PLAYER=1`, `CLUB_ADMIN=1`, `LOGGED_OUT=1` or `NEW_USER=1` to see the app as
someone else. The mock also has `/__test/*` switches used by the e2e tests (role,
calendar/league/tournament scenarios, feature flags). This is the setup used for
screenshot checks during UI work.

## Tests

| Command (dir) | What |
|---------------|------|
| `npm test` (`app-api`) | API unit tests — Vitest (~458) |
| `npm test` (`app-ui`) | UI unit tests — Vitest + jsdom (~372), incl. i18n completeness and the copied-rules check |
| `npm run e2e` (`app-ui`) | Playwright: the main pages as visitor/player/global-admin, desktop + phone, against the mock API. First run: `npx playwright install chromium`. |
| `npm run lint` | ESLint (both) |
| `npm run typecheck` (`app-ui`) | `tsc --noEmit` |

These are what CI runs (`checks.yml`). Run the full suite before a release; for a
styling-only change a screenshot against the mock is enough.

## Internationalisation workflow

Five languages (en/de/fr/it/es); English is the key itself. German uses Swiss
spelling (ss) and the informal "du"; darts terms stay English.

```bash
cd app-ui
npm run i18n check              # what is missing/wrong (also a unit test → fails CI)
npm run i18n missing out.json   # write untranslated strings to fill in
npm run i18n add out.json       # add them back; add --server for strings the API also sends
npm run copy-rules              # after --server: copy the shared rules/texts to the API
npm run i18n prune              # drop unused translations
```

Every new user-facing English string needs the four other translations before CI
passes.

## Shared domain rules

`app-api/src/rules` is the authoritative domain logic; `app-ui/src/rules` is a
copy kept in step by `npm run copy-rules`, so the UI, the mock and the server all
score identically. Change the rules in `app-api`, then copy up.

## Conventions

- **British English** in code comments and docs; darts usage throughout.
- **Atomic file writes in `app-ui`** when a tool edits files the running Vite
  server watches (write to a temp file, then rename), to avoid half-written reads.
- Match the surrounding code's style; see the `ui-components` and `style-guide`
  project skills for the component and visual conventions.
