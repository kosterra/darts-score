# Deployment & CI/CD

## The Docker image

One multi-stage [`Dockerfile`](../Dockerfile) (Node 24) builds everything; the
**production** target is a single image that runs the API and serves the built
SPA and uploaded images.

| Stage | Purpose |
|-------|---------|
| `ui-builder` | `npm ci` + `vite build` → the SPA in `/ui/dist` |
| `builder` | `npm ci` + esbuild bundle of the API → `/app/dist` |
| `ui-development` | the UI dev image (Vite HMR) for `docker-compose.dev.yml` |
| `development` | the API dev image (nodemon) for `docker-compose.dev.yml`; also copies the UI build |
| `production` | **`npm ci --omit=dev`** + the API bundle + the UI build under `public/ui`; runs as UID 1000 with a `HEALTHCHECK` |

Because production installs with `--omit=dev`, dev/test tooling (vitest, vite,
nodemon, eslint) never ships — only the API's runtime dependencies are in the
image. The image serves on port 3001.

## Production stack

`docker-compose.yml` is a ready-to-copy production setup: the published image and
MongoDB (reachable only on the internal network), with an optional Cloudflare
Tunnel. See the repository [`README.md`](../README.md) for the step-by-step
(env file, HTTPS via a reverse proxy or tunnel, volumes, the Cloudflare Tunnel
profile). Key points:

- data persists in the `darts_score_data` (images) and `darts_score_db`
  (database) volumes;
- put a reverse proxy (Caddy/Traefik/nginx) or a Cloudflare Tunnel in front for
  TLS — the session cookie becomes `Secure` automatically on `X-Forwarded-Proto: https`;
- the app runs as UID 1000, so a host folder mounted at `/app/data` must be owned
  by 1000.

## Versioning

The app version lives in the **root `package.json`** and is the single source of
truth for the Docker tag; `app-api` and `app-ui` stay at `0.0.0` (not published
independently). The scheme is date-based (`YYYY.MM.DD`).

## CI/CD (GitHub Actions)

Three workflows in `.github/workflows`:

| Workflow | Trigger | Does |
|----------|---------|------|
| `checks.yml` | every pull request; called by the other two | **API:** lint, tests, `redocly lint openapi.yaml`, esbuild build. **UI:** lint, typecheck, tests (incl. complete translations + copied rules), build. **e2e:** Playwright on the main pages, desktop + phone, against the mock API. |
| `develop.yml` | push to `develop` | runs the checks, then builds and pushes the image `:develop` (the **TEST** stack picks it up). |
| `release.yml` | push to `main` | runs the checks, creates the version git tag, then builds and pushes `:<version>` **and** `:latest` (production). |

Secrets: `DOCKERHUB_USER`, `DOCKERHUB_PASSWORD`. Buildx registry cache speeds up
the develop builds.

## Environments

| Environment | Image | Built by | Notes |
|-------------|-------|----------|-------|
| **TEST** | `:develop` | `develop.yml`, every push to `develop` | `ENVIRONMENT_LABEL=TEST` marks it (and its mails). New features land here first. |
| **production** (legmate.ch) | `:latest` | `release.yml`, on merge to `main` | the released version only. |

## Release flow

The repository convention (branches): work and push go to **`develop`**; `main`
is only updated through a reviewed pull request.

1. On `develop`, bump the version in the root `package.json` for the release.
2. Open a **`develop` → `main`** pull request; CI (`checks.yml`) runs on it.
3. Review and merge. The merge to `main` triggers `release.yml`: it tags the
   version and pushes `:<version>` and `:latest`.
4. Production pulls `:latest`; the TEST stack has already been running `:develop`.

> Never push or merge directly to `main` — always via the pull request, so the
> release is reviewed before it reaches production.

## Upgrades & migrations

An upgrade is just a newer image. Database schema/data changes are applied by
**startup migrations** (recorded in the `migrations` collection, each run once, in
order; an interrupted one re-runs). Back up the database before a major upgrade
(see [operations.md](operations.md)). The first-run migration from a pre-accounts
version is described in the repository `README.md`.

## Docker Hub

`DOCKER_HUB.md` is the image's Docker Hub description; it is pasted on Docker Hub
by hand, so if it changes it must be re-pasted there.
