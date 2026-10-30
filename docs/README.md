# Legmate — Technical Documentation

Legmate (the darts-score application) is a darts scoreboard and club-management
web app for clubs, pub teams, friends and flatshares. It keeps the score of
nine games, works out statistics, levels and badges, runs tournaments and
leagues, and manages clubs, players and a shared calendar — all from a single
container.

This folder is the **deep technical reference** for developers and operators.
The repository [`README.md`](../README.md) is the quick-start and self-hosting
guide; it is not repeated here. Where the two overlap (configuration, scripts),
the README is the short version and these pages are the detail.

## Contents

| Page | What it covers |
|------|----------------|
| [architecture.md](architecture.md) | The system shape: components, how a request flows, deployment topology, the single-container model |
| [backend.md](backend.md) | The API internals: layering, routing, middleware, the rules engine, background jobs, migrations |
| [frontend.md](frontend.md) | The React app: Vite build, routing, state (contexts), PrimeReact + the SCSS theme, i18n, PWA/offline |
| [data-model.md](data-model.md) | MongoDB collections, the Mongoose models and how they relate |
| [security.md](security.md) | Authentication, sessions, two-step login, passkeys, cryptography, HTTP headers, uploads, privacy |
| [configuration.md](configuration.md) | Every environment variable and config file, with defaults and effects |
| [development.md](development.md) | Running locally, the dev containers, tests, the mock API, i18n workflow |
| [deployment.md](deployment.md) | The production image, CI/CD, the TEST and production stacks, releasing |
| [operations.md](operations.md) | Health, backups, monitoring, mail, logging, the installation self-check |

Machine-readable inventories live in [`../sbom/`](../sbom/): dependency SBOMs
(CycloneDX 1.5) and a cryptography BOM (CycloneDX 1.6). The API contract is
[`../app-api/openapi.yaml`](../app-api/openapi.yaml) (OpenAPI 3.1), served live
at `/api-docs`.

## The stack at a glance

| Layer | Technology |
|-------|-----------|
| Runtime | Node.js 24 |
| API | Express 5, Mongoose 9 on MongoDB 7/8 |
| Frontend | React 19, Vite, PrimeReact, Bootstrap grid, SCSS theme, Recharts |
| Auth | Signed HTTP-only session cookies, scrypt passwords, TOTP two-step login, WebAuthn passkeys |
| Build/deploy | Multi-stage Docker image (one container serves API + built UI), GitHub Actions, Docker Hub |
| i18n | English, German, French, Italian, Spanish |

## How the pieces fit

In **production** one container runs the Express API, which also serves the
built React app and the uploaded images; MongoDB runs beside it on the internal
Docker network. In **development** three containers run with hot reload: the API
(nodemon), the UI (Vite HMR) and MongoDB, plus Mailpit for mail.

```
                 ┌──────────────────────────────────────────┐
  Browser  ──►   │  Express API (port 3001)                 │
  (PWA)          │   • serves the built React SPA           │
                 │   • /api/* REST endpoints                │  ──►  MongoDB
                 │   • /api/images/* uploaded pictures      │
                 │   • /api-docs Swagger                    │  ──►  SMTP (mail)
                 └──────────────────────────────────────────┘
                 (HTTPS is terminated by a reverse proxy in front)
```

Start with [architecture.md](architecture.md).
