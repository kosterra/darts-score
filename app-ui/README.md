# Darts Score UI

Web frontend for the [darts-score](https://github.com/kosterra/darts-score-sample) application.

## Stack

| Layer | Technology |
|---|---|
| Framework | React 19 |
| Bundler | Vite 8 |
| UI components | PrimeReact 10 |
| Charts | Recharts |
| Routing | React Router v7 |
| Styling | Bootstrap 5 + Sass |
| Forms | Formik |
| Testing | Vitest |
| Runtime (prod) | nginx (Docker) |
| Backend | Node.js / Express |
| Database | MongoDB |

## Features

- Clickable dartboard for score input
- Supported game types:
  - **X01** — 101, 301, 501, 701, 1001 with configurable in/out modes and sets/legs
  - **Cricket** — standard cricket scoring
  - **Elimination** — multi-player elimination game
- Real-time best-finish suggestions after each throw
- Player statistics with charts (averages, score ranges, checkout rates)
- Player vs player comparison
- Admin panel for managing players and game history
- Around the Clock training mode

## Prerequisites

- Node.js 24+
- npm 10+
- A running [darts-score API](https://github.com/kosterra/darts-score-sample)

## Environment variables

Create a `.env` file in the project root:

```env
VITE_API_URL=http://localhost:3001
VITE_CF_CLIENT_ID=your_client_id
VITE_CF_CLIENT_SECRET=your_client_secret
```

`VITE_API_URL` is the base URL of the backend API. All `VITE_*` variables are embedded into the build at compile time by Vite.

## Local development

```bash
npm install
npm run dev
```

The dev server starts at [http://localhost:3000](http://localhost:3000) with hot-reload.

## Available scripts

| Script | Description |
|---|---|
| `npm run dev` | Start Vite dev server with HMR |
| `npm run build` | Production build to `dist/` |
| `npm run preview` | Preview the production build locally |
| `npm run lint` | Run ESLint |
| `npm test` | Run Vitest (single run) |
| `npm run test:watch` | Run Vitest in watch mode |

## Docker

The project uses a multi-stage Dockerfile with three targets:

| Target | Purpose |
|---|---|
| `builder` | Installs deps and compiles the Vite bundle |
| `development` | Vite dev server with source mounted for hot-reload |
| `production` | nginx serving the compiled static bundle |

### Development with Docker Compose

```bash
docker compose up
```

The app is available at [http://localhost:3000](http://localhost:3000). Source changes in `src/` and `public/` are reflected immediately via the mounted volumes.

### Production build

```bash
docker build --target production -t darts-score-ui .
docker run -p 80:80 \
  -e VITE_API_URL=https://your-api-host \
  darts-score-ui
```

> **Runtime environment variables:** The container entrypoint (`env.sh`) rewrites any `DARTS_SCORE_*` placeholders in the built JS/CSS files at startup, allowing environment-specific configuration without rebuilding the image.

## Project structure

```
src/
  components/
    admin/          # Game list and player management pages
    dashboard/      # Home page
    elements/       # Shared UI components (forms, dialogs, timeline)
    game_config/    # Game setup/configuration screens
    games/          # In-game views (dartboard, scoreboard, statistics)
    navigation/     # Sidebar navigation
    stats/          # Statistics and charts
    training/       # Around the Clock training mode
  hooks/            # Custom React hooks
  models/           # Data models
  services/         # API client functions
  theme/            # Sass/PrimeReact theme overrides
  utils/            # Reducers, context providers, helpers
```

## CI/CD

Pushing to `main` triggers the GitHub Actions workflow which:

1. Runs ESLint
2. Creates a git tag from `package.json` version
3. Builds and pushes a Docker image to Docker Hub (`latest` + version tag)

Requires the following repository secrets: `DOCKERHUB_USER`, `DOCKERHUB_PASSWORD`.

## Related repositories

- [darts-score-api](https://github.com/kosterra/darts-score-sample) — backend API
- [darts-score-sample](https://github.com/kosterra/darts-score-sample) — full stack Docker Compose example
