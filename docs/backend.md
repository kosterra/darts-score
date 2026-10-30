# Backend (API)

Express 5 + Mongoose 9 on Node 24. Entry point: [`app-api/index.js`](../app-api/index.js).

## Layering

```
routes/        Express routers — path, HTTP method, middleware chain, validators
  └─ controllers/   request handlers: read req, call the domain, send the response
       └─ rules/      pure domain logic (scoring, levels, badges, tournaments, …)
       └─ utils/      services and helpers (auth, mail, sessions, backups, stats, …)
            └─ models/   Mongoose schemas + the db singleton
```

A route names its validators and middleware and points at a controller. The
controller reads the request, calls into `rules/` (pure functions) and `utils/`
(services), and returns JSON. The domain logic in `rules/` has no Express or
Mongoose dependency, which is why the same code runs in the browser and in the
test mock.

Directories under `app-api/src`:

| Dir | Contents |
|-----|----------|
| `config/` | `db.config.js` — the MongoDB connection URL from the `DB_*` env vars |
| `routes/` | one file per area (`player`, `x01`, `cricket`, `club`, `auth`, `admin`, `tournament`, `league`, `calendar`, …) |
| `controllers/` | ~48 request handlers |
| `rules/` | pure domain logic (see below) |
| `utils/` | ~83 services/helpers (auth, sessions, mfa, passkeys, mail, backups, stats, notifications, …) |
| `models/` | Mongoose models + the `db` singleton + the pino logger |
| `middleware/` | `auth.middleware.js` (the auth/club/role guards) |
| `validators/` | shared express-validator rule sets |
| `locales/` | server-side message translations (mirrors the UI's) |

## Startup sequence (`index.js`)

1. Build the Express app; `app.disable('x-powered-by')`.
2. Per-request CSP nonce middleware, then **helmet** (CSP, HSTS, `X-Frame-Options`,
   `nosniff`, `Referrer-Policy`). See [security.md](security.md).
3. `trust proxy` (so `X-Forwarded-For`/`-Proto` from the reverse proxy are honoured).
4. CORS on `/api` (allows `APP_URL`/`UI_URL`; same-origin needs no entry).
5. A global rate limit (a generous backstop; credential endpoints are stricter).
6. favicon, `cookie-parser` (signed with `SESSION_SECRET`), body parsers (30 MB).
7. Static SPA assets from `public/ui` (when a build is present).
8. Connect to MongoDB, then: start notification jobs, start backup jobs, start
   mail-server checks, run `bootstrap()`.
9. Mount Swagger at `/api-docs`, the health route, then all API routers.
10. The SPA fallback (renders `index.html` with meta + CSP nonce) and listen.

`bootstrap()` (`utils/bootstrap.js`): create the first global admin from
`ADMIN_EMAIL`/`ADMIN_PASSWORD` if none exists, honour `ADMIN_RESET_MFA`, warn if
`MFA_KEY` can no longer read stored two-step secrets, then run migrations.

## Routing & access control

Routers are mounted in `index.js` in three bands:

```js
// public — no login required
authRoutes, publicRoutes, unsubscribeRoutes, claimInfoRoutes,
tournamentReplyRoutes, calendarFeedRoutes, eveningRoutes, screenRoutes, clubLogoRoutes

app.use('/api', requireAuth);          // everything below needs a logged-in user
clubRoutes, userRoutes, adminRoutes, badgeRoutes, integrityRoutes,
notificationRoutes, claimRoutes, eveningClubRoutes

app.use(['/api/players','/api/games','/api/training','/api/stats',
         '/api/tournaments','/api/leagues','/api/calendar'], requireClub);  // + a selected club
playerRoutes, statsRoutes, x01Routes, cricketRoutes, elimRoutes, clockRoutes, …
```

The middleware (`src/middleware/auth.middleware.js`):

| Guard | Does |
|-------|------|
| `optionalAuth` | sets `req.user` if a valid session exists, else continues |
| `requireAuth` | 401 unless a live session; sets `req.user` |
| `requireGlobalAdmin` | 403 unless `req.user.role === 'globalAdmin'` |
| `requireClub` | reads `X-Club-Id`, loads the club, resolves the caller's role (`admin`/`player`), sets `req.club`/`req.clubRole`; 400/404/403 otherwise |
| `requireClubAdmin` | 403 unless `req.clubRole === 'admin'` (after `requireClub`) |

Validation is per route with **express-validator**; the shared `validate`
middleware turns any violations into a `422 { errors: [...] }`.

## The rules engine (`src/rules`)

Pure functions, no I/O, the heart of the domain. These are the files the
frontend and the test mock reuse:

| File | Responsibility |
|------|----------------|
| `engine.js` | the shared game engine primitives |
| `x01.js`, `cricket.js`, `elimination.js`, `clock.js` | per-game scoring and win logic |
| `stored.js`, `games.js` | the stored "more games" (Shanghai, Killer, Halve-It, Golf, Tactics) and shared game helpers |
| `darts.js` | dartboard geometry and dart maths |
| `trainings.js` | training formats (ATC, the bot, Bob's 27, Catch 40, …) |
| `tournaments.js`, `leagues.js` | brackets, group stages, schedules, seeding |
| `calendar.js` | club nights and league matchdays as calendar events |
| `club.rules.js` | club settings, game preferences, defaults |
| `notifications.js` | which notices an event produces |

Because these are pure, scoring/levels/badges/fair-play are identical on the
server, in the live browser preview and in the Playwright mock (`app-ui/e2e/mock`).
The UI keeps a copy under `app-ui/src/rules`, kept in step by `npm run copy-rules`.

## Background jobs

Both are `setInterval`-based, `.unref()`'d so they never hold the process open:

- **Notifications** (`utils/notification.jobs.js`) — hourly. Club-night
  reminders, weekly digests, and the queued in-app/mail notices.
- **Backups** (`utils/backups.js`) — every 10 minutes it checks whether a
  scheduled database backup is due (global admins configure the schedule).

## Migrations

`utils/migrations.js`, run from `bootstrap()`. Each migration runs **once**, in
order, and is recorded in the `migrations` collection; an interrupted one simply
runs again next start. This is how an upgrade applies schema/data changes — there
is no separate migration command, just a newer image. The global-admin overview
lists the applied migrations.

## Errors, logging, health

- **Logging:** pino (`models/logger.model.js`). Warnings and errors are also
  kept for the global-admin error log (`utils/error.log.js`).
- **Errors:** controllers return typed JSON (`{ message }` or `{ errors: [] }`);
  unexpected errors become a generic `500 { message: 'Internal server error.' }`
  with no stack trace leaked. `unhandledRejection`/`uncaughtException` are logged;
  a fatal uncaught exception exits after flushing the log.
- **Health:** `GET /api/health` → `200 { status, database, version, uptime }`
  while MongoDB answers, else `503`. The Docker image has a `HEALTHCHECK` on it.

## Building the API

- `npm run dev` — nodemon, hot reload.
- `npm run build` — esbuild bundles to `dist/bundle.js` (`build.js`); the
  production image runs `dist/bundle.js` with production-only dependencies.
- `npm test` — Vitest unit tests (≈458 across ~70 files).
- `npm run lint` — ESLint.

The OpenAPI description (`openapi.yaml`) is validated in CI (`redocly lint`) and
a unit test checks every route is present in it.
