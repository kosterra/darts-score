# Frontend (web app)

React 19 + Vite, in [`app-ui`](../app-ui). TypeScript at the edges (`App.tsx`,
`main.tsx`, config) with most components in JSX. Entry: `src/main.tsx` → `App.tsx`.

## Build & tooling

- **Vite** (`vite.config.ts`) — dev server on port 3000 (`host: true`,
  `strictPort`), proxying `/api` to `API_PROXY_TARGET` (default `localhost:3001`).
- **Version injection** — the app version comes from the root `package.json`
  (or `APP_VERSION`), exposed as `import.meta.env.VITE_APP_VERSION`; a dev plugin
  restarts the server when the root version changes. `VITE_APP_RELEASED` marks a
  released build vs. a develop/dev build (which shows upcoming features as "coming
  soon").
- **Chunking** — React/React-DOM/React-Router are a shared `vendor-react` chunk;
  PrimeReact and the charts are split per page so the landing page stays light.
- **Path alias** — `@` → `src`.
- **SCSS** — `loadPaths` includes `node_modules`; the theme lives in `src/theme`.
- **i18n text splitting** — `scripts/vite.split.texts.mjs` splits each language
  into a main bundle and a separate one for the About/legal/terms pages.

Scripts: `dev`, `build`, `preview`, `test` (Vitest + jsdom), `typecheck` (tsc
`--noEmit`), `lint`, `e2e` (Playwright), `i18n`, `copy-rules`.

## Structure

```
src/
  App.tsx            routes (all pages lazy-loaded), top-level providers, app chrome
  main.tsx           bootstrap
  components/        one folder per feature area (see below)
  services/          thin API clients, one per area (player, x01, club, stats, …)
  rules/             a copy of app-api/src/rules (kept in step by npm run copy-rules)
  utils/             ~87 helpers + the React contexts
  theme/             the SCSS design system (see security/style docs & _tokens.scss)
  locales/           en/de/fr/it/es message catalogues
  models/            shared type/shape helpers
```

Feature folders under `components/`: `dashboard`, `clubs`, `players`, `stats`,
`games` (x01/cricket/elimination/clock), `game_config`, `training`, `rules`
(the "more games"), `tournaments`, `leagues`, `calendar`, `evening`, `badges`,
`flights`, `shirts`, `year`, `fairplay`, `admin`, `administration`, `auth`,
`mfa`, `profile`, `notifications`, `navigation`, `banner`, `landing`, `legal`,
`terms`, `about`, `whats.new`, `onboarding`, `install`, `offline`, `screen`,
`session`, `quick`, and shared `elements`.

## Routing

`react-router-dom` with `BrowserRouter`. Every page is `React.lazy`-loaded and
wrapped in a `Suspense` with a `PageLoader`. Routes split into:

- **Public / standalone** — `/`, `/login`, `/register`, `/forgot-password`,
  `/quick`, `/evening/*`, `/screen/:token`, the legal/terms/about/`whats-new`,
  `darts-terms`.
- **In-app (logged in, a club selected)** — the dashboard (`/`), `/club`, the
  per-game config/play/stats routes (`/x01`, `/x01/:id`, `/play/:kind`, …),
  `/players`, `/stats`, `/games`, `/trainings`, `/tournaments`, `/leagues`,
  `/calendar`, `/badges`, `/profile`, `/notifications`, plus `/administration`
  and the admin lists for global admins.

App chrome around the routes: `AppNavigation`, `AppBanner`, offline note,
install hint, welcome tour, `SessionWatch`, the two-step-login due notice, and a
top-level `ErrorBoundary`.

## State

No Redux/Zustand — React Context plus local state and the service layer:

- `utils/auth.context.js` — the logged-in user, roles, the selected club, and
  `isClubAdmin`/`isGlobalAdmin` helpers.
- `utils/x01.context.js`, `cricket.context.js`, `elimination.context.js` —
  the live game state while a game is played.
- Game/user preferences come from the account and are read with hooks
  (`use.game.preferences.js`, …).

Services (`src/services/*.service.js`) are thin wrappers over `fetch` that attach
the session cookie (sent automatically, same-origin) and the `X-Club-Id` header,
and parse the JSON. Components call services, never `fetch` directly.

## UI, theme & accessibility

- **PrimeReact** provides the behavioural components (Dropdown, MultiSelect,
  DataTable, Dialog, Calendar, Toast, …). They are **wrapped** by the project's
  own thin components in `components/elements` and re-skinned by the SCSS theme,
  so PrimeReact supplies behaviour and the theme supplies the look. See the
  `ui-components` and `style-guide` project skills, and `theme/base/_tokens.scss`
  for the design tokens (type scale, spacing, radii, accent colours).
- **Bootstrap** is used for its grid/utility classes only.
- **Charts** use Recharts, coloured from the theme palette (`utils/palette.js`).
- **Themes** — dark (default), black (OLED), high-contrast and light, each with
  an accent colour, chosen in the profile (`utils/appearance.js`). An inline
  script in `index.html` sets the theme before first paint to avoid a flash.
- **Fonts** — Exo 2, self-hosted (no external request).

## Internationalisation

Five languages: English (the key itself), German, French, Italian, Spanish.
German uses Swiss spelling (ss, never ß) and the informal "du"; darts terms stay
English. Catalogues are in `src/locales`. The workflow:

- `npm run i18n check` — what is missing or wrong (also a unit test, so an
  untranslated string fails CI).
- `npm run i18n missing [file]` — writes the untranslated strings to fill in.
- `npm run i18n add <file> [--server]` — adds them; `--server` also marks them as
  API messages (then `npm run copy-rules` to copy the shared rules/text up).
- `npm run i18n prune` — drops unused translations.

## PWA & offline

Installable (`public/manifest.json`) with a service worker (`public/sw.js`,
registered via `utils/service.utils.js`). Logged in, the pages to set up, play
and finish a game are kept so a game can be scored without the club's Wi-Fi even
if those pages were never opened on the device. Games played offline are held and
flagged by `components/offline/unsent.games.note.jsx` until they sync. The logo
and icons carry a `?v=<version>` query so a new version is fetched at once rather
than served stale from a cache.

## Testing

- **Unit** — Vitest + jsdom (~372 tests). Includes the i18n completeness check
  and a check that the copied rules are up to date.
- **Browser** — Playwright (`npm run e2e`): the main pages as visitor, player and
  global admin, at desktop and phone width, against the mock API
  (`e2e/mock/server.mjs`) which uses the API's own rules. See
  [development.md](development.md) for running the app on the mock without a DB.
