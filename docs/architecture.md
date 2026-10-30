# Architecture

## Overview

Legmate is a two-part application — an Express REST API and a React single-page
app — that ships as **one artefact**. In production the API process serves both
the JSON API and the compiled frontend, so there is a single origin and a single
container to run. MongoDB holds all data; uploaded images live on a mounted
volume, not in the database.

```
app-api/   Express 5 + Mongoose 9 — the API, and in production the web server for the SPA
app-ui/    React 19 + Vite — the single-page app, built to static files
package.json (root)  the single source of truth for the application version
Dockerfile           multi-stage build producing the production image
docker-compose*.yml  dev (3 containers + Mailpit) and prod (app + MongoDB [+ tunnel])
sbom/                dependency SBOMs and the cryptography BOM
```

## Components

### API (`app-api`)

Express 5 on Node 24, talking to MongoDB through Mongoose 9. `index.js` is the
entry point: it builds the Express app, connects to MongoDB, runs startup
`bootstrap()` (first global admin, migrations), starts background jobs, and
mounts the routes. Internals are in [backend.md](backend.md).

Responsibilities:

- the REST API under `/api/*`;
- serving the built SPA (`public/ui`) with a server-side-rendered `index.html`
  (per-page `<title>`/meta, a CSP nonce) and a catch-all SPA fallback;
- serving uploaded images under `/api/images/*` with per-club access control;
- Swagger UI at `/api-docs` from `openapi.yaml`;
- an unauthenticated health probe at `/api/health`.

### Web app (`app-ui`)

A React 19 SPA built by Vite. Pages are code-split with `React.lazy`; UI is built
on PrimeReact components wrapped by the project's own SCSS theme. It is a PWA
(installable, with an offline service worker for scoring). Internals are in
[frontend.md](frontend.md).

In **development** the UI runs on the Vite dev server (port 3000) and proxies
`/api` to the API (port 3001). In **production** it is compiled to static files
that the API serves; there is no separate web server.

### Database (MongoDB)

One database (default `darts_score`). Collections map to Mongoose models; schema
changes are applied by code migrations at startup. See [data-model.md](data-model.md).

### Mail (SMTP)

Optional. Nodemailer sends password-reset and invitation mails and the
notification digests. Without `SMTP_HOST` the app runs fully; admins then set
initial passwords by hand. The dev stack ships [Mailpit](https://mailpit.axllent.org/)
to catch mail at `http://localhost:8025`.

## Request flow

A typical authenticated API request:

```
Browser ─► reverse proxy (TLS) ─► Express
   │
   ├─ helmet sets the security headers (CSP with a per-request nonce, HSTS, …)
   ├─ a generous global rate limit (credential routes have their own stricter one)
   ├─ CORS check on /api (same-origin in production; the Vite origin in dev)
   ├─ cookie-parser reads the signed session cookie
   ├─ express.json / urlencoded parse the body
   │
   ├─ requireAuth          → loads req.user from the session, checks it is live
   ├─ requireClub          → resolves the club from the X-Club-Id header, checks the role
   ├─ (requireClubAdmin / requireGlobalAdmin where needed)
   ├─ express-validator    → validates and sanitises the input
   ├─ controller           → business logic, via the models and the rules engine
   └─ JSON response
```

Non-API GET requests fall through to the **SPA fallback**, which returns
`index.html` rendered with that page's meta tags and the CSP nonce, so the React
router then takes over on the client.

### Authentication & the club context

Two headers drive access:

- the **session cookie** (`ds_session`, signed, HTTP-only) identifies the user;
- the **`X-Club-Id` header** names the club a request works in.

Players, games, trainings, statistics, tournaments, leagues and the calendar are
always scoped to a club and require both. A user can be an admin of one club and
a player of another; the role is resolved per request. Full detail in
[security.md](security.md).

## Deployment topology

### Production (single container)

```
            ┌─────────────────────────────────────────────┐
  Internet  │  reverse proxy / Cloudflare Tunnel (TLS)     │
     │      └───────────────────────┬─────────────────────┘
     ▼                              │  X-Forwarded-Proto: https
                      ┌─────────────▼──────────────┐
                      │ darts_score container :3001 │
                      │  Express API + built SPA    │─────┐
                      │  /app/data  (images volume) │     │  internal Docker network
                      └─────────────────────────────┘     ▼
                                                  ┌──────────────────┐
                                                  │ MongoDB container │
                                                  │  (not published)  │
                                                  └──────────────────┘
```

TLS is terminated by the reverse proxy (Caddy, Traefik, nginx) or a Cloudflare
Tunnel; the app marks the session cookie `Secure` when it sees
`X-Forwarded-Proto: https`. MongoDB is reachable only on the internal network.
Images persist in the `darts_score_data` volume (or a host folder mounted at
`/app/data`, owned by UID 1000), the database in `darts_score_db`.

### Development (three containers + Mailpit)

```
  localhost:3000  Vite dev server (HMR)  ──/api──►  localhost:3001  API (nodemon)
                                                          │
  localhost:8025  Mailpit inbox            MongoDB ◄──────┘
```

All source is bind-mounted so nodemon and Vite reload on change. See
[development.md](development.md).

### Installations

Two deployed environments are maintained (see [deployment.md](deployment.md)):

- **production** — `legmate.ch`, image `:latest`, built when a release is merged to `main`;
- **TEST** — image `:develop`, built on every push to `develop`, with
  `ENVIRONMENT_LABEL=TEST` so its mails are marked. New features land there first.

## Key design decisions

- **One container in production.** The API serves the SPA, so there is one
  origin (no CORS in production), one TLS endpoint and one thing to deploy.
- **Club-scoped data via a header.** `X-Club-Id` keeps every query inside one
  club and makes the same account usable across clubs with different roles.
- **The rules live in `app-api/src/rules`** and a copy is used by the frontend
  and the test mock, so scoring, levels, badges and fair-play are computed the
  same way on the server, in the browser preview and in tests.
- **Version in the root `package.json`.** It drives the Docker tag and is shown
  in the app; the sub-packages stay at `0.0.0` to signal they are not published.
- **Migrations at startup.** Schema/data changes run once, in order, recorded in
  the `migrations` collection, so an upgrade is just a new image.
