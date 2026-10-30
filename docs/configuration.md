# Configuration

All runtime configuration is through environment variables. The repository
[`README.md`](../README.md) has copy-paste `.env` samples and the exact file to
put each in; this page is the complete reference with effects and defaults.

## Where the variables are read

| Context | File that reads them |
|---------|----------------------|
| Docker (both compose files) | project-root `.env`, plus `mongo.env` for the MongoDB container |
| API run directly (`npm run dev`) | `app-api/.env` (with `DB_HOST=localhost`) |
| UI dev server | `app-ui/.env` (Vite `VITE_*`) and process env (`API_PROXY_TARGET`) |
| Portainer / orchestrator | the stack's environment variables instead of `.env` |

## API environment variables

### Database (required)

| Variable | Default | Effect |
|----------|---------|--------|
| `DB_HOST` | — | MongoDB host. In Docker the service name (`darts_score_mongo`/`mongo`); locally `localhost`. |
| `DB_PORT` | — | MongoDB port (usually `27017`). |
| `DB_NAME` | — | database name (e.g. `darts_score`). |
| `DB_USER` | — | MongoDB user (authenticates against `admin`). |
| `DB_PASSWORD` | — | MongoDB password. |

The connection URL is built in `config/db.config.js`:
`mongodb://<user>:<pass>@<host>:<port>/<name>?authSource=admin`. If any of the
five are missing the API logs exactly which and exits.

### Security (required in production)

| Variable | Default | Effect |
|----------|---------|--------|
| `SESSION_SECRET` | random per start | signs the session cookie. **Set it** — without it, logins do not survive a restart. |
| `MFA_KEY` | derived from `SESSION_SECRET` | encrypts two-step-login secrets at rest. Set it so that changing `SESSION_SECRET` does not turn off everyone's two-step login. |
| `ADMIN_EMAIL` | — | the first global admin, created on startup if no global admin exists. |
| `ADMIN_PASSWORD` | — | that admin's initial password (min 8 chars). |
| `ADMIN_RESET_MFA` | — | set to an email to turn off that account's two-step login at the next start; **remove it afterwards**. |

Changing `ADMIN_EMAIL`/`ADMIN_PASSWORD` later does **not** touch existing
accounts — they only seed the very first global admin.

### App & proxy

| Variable | Default | Effect |
|----------|---------|--------|
| `APP_URL` | request host | the public address: links in mails, social previews, and the domain passkeys belong to. Set it (HTTPS) in production. |
| `UI_URL` | — | an extra allowed CORS origin (the Vite dev server in development). Not needed when the API serves the SPA. |
| `PORT` | `3001` | the port the API listens on. |
| `NODE_ENV` | — | `development` or `production`. |
| `TRUST_PROXY` | `loopback, linklocal, uniquelocal` | which proxies to trust for `X-Forwarded-For`/`-Proto` (so the client IP and HTTPS are read correctly behind a reverse proxy). |
| `ENVIRONMENT_LABEL` | — | a label shown in the app and on mails (e.g. `TEST`) to mark a non-production stack. |
| `LOG_LEVEL` | pino default | the log verbosity. |

### Storage

| Variable | Default | Effect |
|----------|---------|--------|
| `IMG_DIR` | `data/img` | where uploaded images are stored (relative to the API working dir, or absolute). In Docker this is the `darts_score_data` volume mounted at `/app/data`. |
| `BACKUP_DIR` | — | where scheduled database backups are written. |

> **Note:** `IMG_DIR` is joined as `path.join('./', IMG_DIR, subdir)`, so a
> **relative** path is expected (the production default `data/img` is). An
> absolute path works for serving but behaves differently for writing — keep it
> relative unless you know why.

### Mail (optional — the app runs without it)

| Variable | Default | Effect |
|----------|---------|--------|
| `SMTP_HOST` | — | the SMTP server. With it unset, mail is disabled (admins set passwords by hand). |
| `SMTP_PORT` | — | SMTP port (e.g. `587`). |
| `SMTP_SECURE` | — | `true` for implicit TLS (port 465). |
| `SMTP_USER`, `SMTP_PASSWORD` | — | SMTP credentials. |
| `SMTP_FROM` | — | the `From` header, e.g. `Legmate <no-reply@example.com>`. |

## UI / build variables

| Variable | Where | Effect |
|----------|-------|--------|
| `VITE_API_URL` | `app-ui/.env` | the API base for the dev server. |
| `API_PROXY_TARGET` | process env | where Vite proxies `/api` (default `http://localhost:3001`; the mock server uses this). |
| `APP_VERSION` | process env | overrides the version baked into the build (otherwise from the root `package.json`). |
| `ROOT_PACKAGE` | process env | path to the root `package.json` (set in the dev container where the repo is mounted elsewhere). |
| `APP_RELEASED` | process env | `true` marks a released build; otherwise upcoming features show as "coming soon". Exposed as `VITE_APP_RELEASED`. |

## Docker Compose variables

| Variable | Effect |
|----------|--------|
| `COMPOSE_PROFILES` | set to `tunnel` to enable the optional Cloudflare Tunnel service. |
| `TUNNEL_TOKEN` | the Cloudflare Tunnel token (with `COMPOSE_PROFILES=tunnel`). |
| `MONGO_INITDB_ROOT_USERNAME` / `_PASSWORD` / `_DATABASE` | `mongo.env`; must match `DB_USER` / `DB_PASSWORD` / `DB_NAME`. |

## Config files

| File | Purpose |
|------|---------|
| root `package.json` | the single source of truth for the app version (drives the Docker tag). |
| `app-api/openapi.yaml` | the OpenAPI 3.1 contract (validated in CI, served at `/api-docs`). |
| `app-ui/vite.config.ts` | the UI build (proxy, chunking, version injection, i18n splitting). |
| `docker-compose.yml` | production stack (app + MongoDB [+ tunnel]). |
| `docker-compose.dev.yml` | development stack (API + UI + MongoDB + Mailpit). |
| `Dockerfile` | the multi-stage build (see [deployment.md](deployment.md)). |
| `.github/workflows/*` | CI: `checks.yml`, `develop.yml`, `release.yml`. |
