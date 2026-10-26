# darts-score

**Legmate** (called Oche until version 2026.10.16): the darts scoreboard for clubs, friends and flatshares.

REST API **and** React UI for the [darts-score](https://github.com/kosterra/darts-score-sample) application. Built with **Express 5**, **Mongoose 9**, and **Node.js 24**. Serves the React frontend, player management, game data (X01, Cricket, Elimination, Around-the-Clock), player images, and statistics — all from a single container.

---

## Table of Contents

- [Requirements](#requirements)
- [Project Structure](#project-structure)
- [Configuration](#configuration)
- [Getting Started](#getting-started)
  - [Local development (no Docker)](#local-development-no-docker)
  - [Docker Compose — development (recommended)](#docker-compose--development-recommended)
  - [Docker Compose — production](#docker-compose--production)
  - [Production](#production)
- [Versioning](#versioning)
- [Available Scripts](#available-scripts)
- [API Endpoints](#api-endpoints)
- [Image Upload](#image-upload)
- [Environment Variables](#environment-variables)
- [Support Legmate](#support-oche)

---

## Requirements

| Tool | Minimum version |
|------|----------------|
| Node.js | 24 |
| npm | 10 |
| MongoDB | 7 / 8 |
| Docker | 24 *(optional)* |

---

## Project Structure

```
darts-score/
├── package.json             # Canonical app version (private, not published)
├── app-api/                 # Express API source
│   ├── src/
│   │   ├── config/          # Database connection config
│   │   ├── controllers/     # Route handlers (player, game, stats, file)
│   │   ├── models/          # Mongoose schemas + logger
│   │   ├── routes/          # Express router definitions
│   │   ├── utils/           # Filter query helpers, validation middleware
│   │   └── validators/      # express-validator rule sets
│   ├── public/              # API static assets (favicon)
│   ├── openapi.yaml         # OpenAPI 3.1 specification
│   ├── index.js             # Application entry point
│   ├── build.js             # esbuild production bundler
│   └── package.json
├── app-ui/                  # React UI source (Vite + React)
│   ├── src/                 # UI components, services, utils
│   ├── public/              # UI static assets
│   ├── index.html
│   ├── vite.config.ts
│   └── package.json
├── data/                    # Runtime image storage (created on first upload)
├── Dockerfile
├── docker-compose.yml       # Production: Darts Score + MongoDB, ready to copy (settings: .env.sample)
└── docker-compose.dev.yml   # Development: API + UI + MongoDB, all with hot-reload
```

---

## Configuration

Copy the sample environment files and adjust the values:

```bash
# For Docker Compose (both compose files read these)
cp .env.sample .env
cp mongo.env.sample mongo.env

# For running the API locally (outside Docker)
cp .env.sample app-api/.env   # then change DB_HOST to localhost

# For running the UI locally (outside Docker)
cp app-ui/.env.sample app-ui/.env
```

**.env** *(used by Docker Compose — `DB_HOST` must match the MongoDB service name)*

```dotenv
DB_HOST=darts_score_mongo   # MongoDB service name in Docker network
DB_USER=admin
DB_PASSWORD=yourpassword
DB_NAME=darts_score
DB_PORT=27017

UI_URL=http://localhost:3000  # CORS origin for the Vite dev server (development only)

IMG_DIR=data/img              # Directory where uploaded images are stored

NODE_ENV=development          # development | production
PORT=3001                     # Optional, defaults to 3001

SESSION_SECRET=long-random-string   # Signs the login cookie; changing it logs everybody out
MFA_KEY=another-long-random-string  # Encrypts the secrets of two-step login; changing it turns it off for everyone
# ADMIN_RESET_MFA=admin@example.com # Turns off two-step login of that account at the next start; remove afterwards
ADMIN_EMAIL=admin@example.com       # First global admin, created on startup if none exists
ADMIN_PASSWORD=at-least-8-chars

# Email: password reset and club admin invitations (off without SMTP_HOST)
APP_URL=https://darts.example.com   # Public address of the app, used for links in mails
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=
SMTP_PASSWORD=
SMTP_FROM=Legmate <no-reply@example.com>
```

### Accounts, clubs and roles

The app requires a login. Every person has one account; players, games, training entries and statistics belong to a **club**. What an account may do is decided per club, so the same person can be a player in one club and an admin of another:

- **Club admin** — manages the club: its name, description and logo, its players, games and other admins. Anyone can register on the login page and create their own clubs; a club can have several admins (*Clubs → Admins*). An admin can add themselves as a player on the profile page.
- **Player** — a club's players exist without an account. A club admin can give a player a login (*Club → Players → key button*); the player can then start games and trainings in that club on their own, edit their own player entry and see everything under *Club* (players, statistics, games, trainings, badges), but not manage other players or delete anything.
- **Guest** — anyone in a club can add a guest while setting up a game. A guest plays in that game only: they are not a club member, are not offered for later games and do not appear in the players list for picking. Club admins see guests under *Club → Players* and can turn one into a regular player.
- **Global admin** — looks after the whole installation on the *Administration* page (in the *Admin* section of the menu): every club with its admins, players, games and last activity, all accounts with their clubs and last login, and the state of the system (version, mail, database size, migrations). A global admin can add or replace the admins of any club, delete clubs and accounts, and promote further global admins. Under *Admin → Players / Games / Trainings* a global admin sees these lists across clubs, after choosing one or more clubs, with the club of each entry, and can inspect and delete entries there. It is meant as an administration account, not for playing: use a separate, normal account to play and run your club. The first global admin is created on startup from `ADMIN_EMAIL` / `ADMIN_PASSWORD` when no global admin exists yet; changing these variables later does not touch existing accounts.

### Club dashboard

After login the start page is the dashboard of the selected club: the club's name and key facts, followed by widgets. Available widgets are the club's numbers, running games, a timeline of recent games, and leaderboards (most wins, win rate, highest X01 average, most 180s, highest checkout, most games, wins per game type, most darts thrown). Club admins choose which widgets are shown and in which order with *Customize*; the choice is stored per club and applies to everyone in it.

### Badges and celebrations

Players collect badges for what they achieve, shown in five categories: *Milestones* (games played, weeks played in a row, darts thrown), *Winning* (wins, streaks, whitewashes, comebacks from two legs down, Cricket and Elimination wins, all-rounder), *Scoring* (180s, three 180s in one game, game average, bed and breakfast), *Finishing* (high finishes, bull finishes, the 170 big fish, the Shanghai finish, the nine-darter, the madhouse finish on double 1) and *Training* (Around the Clock sessions and personal records). Most come in several tiers (bronze, silver, gold and beyond). The badge pages also show each player's current and best weekly streak.

Game status is shown the same way everywhere: orange for running games, blue for finished ones. Game types have their own colours: X01 green, Cricket gold, Elimination purple.

- Badges are worked out automatically whenever a game is finished or a training is saved, from the player's whole history in the club. Guests and solo-game "wins" do not count.
- *Statistics → Badges* shows every player's collection, with the progress towards the badges still open.
- When a game is won, the winner is celebrated with an animation and the badges earned in that game; the game's statistics page keeps listing them. A new Around the Clock record is celebrated the same way.
- On upgrade, badges already earned in past games are awarded by a migration, each dated to the game it was reached in.

### Public start page and privacy

Visitors who are not logged in see a public start page: what the app offers, overall numbers (clubs, players, games played), and the running games and latest results of public clubs. It refreshes every 15 seconds.

Nothing is public by default:

- **Clubs are private** until an admin switches *Public club* on in the club settings. A public club is listed by name; its admins also choose whether running games and results are shown.
- **Players are shown without their name** ("Hidden player") unless their nickname is set to public: by a club admin on the players page (eye button), or by players with a login on their profile page. Guests are never shown by name.
- Player pictures, real names and email addresses are never part of the public page.

With SMTP configured, users can reset a forgotten password from the login page, and new admins and players are invited by mail to choose their own password. Without it, the inviting admin sets an initial password. The dev Docker Compose setup includes [Mailpit](https://mailpit.axllent.org/), which catches all mails at `http://localhost:8025`.

### Upgrading and database migrations

Database changes are applied automatically when the server starts. Each migration runs once, in order, and is recorded in the `migrations` collection; a migration that was interrupted is simply run again on the next start.

Upgrading from a version without accounts and clubs:

1. Back up the database first, e.g. `docker exec <mongo-container> mongodump --archive --gzip -u <user> -p <password> --authenticationDatabase admin > backup.gz`.
2. Set `SESSION_SECRET`, `ADMIN_EMAIL` and `ADMIN_PASSWORD` in `.env`.
3. Start the new version. Existing players, games and training entries are moved into a "Default Club", looked after by the global admin until it has an admin of its own. The club is dated from the first game ever played, so the dashboard shows how long the club has really existed.
4. Hand the club over, in each environment once:
   - Log in as the global admin. Rename the club under *Clubs → Edit* (the global admin is still its admin, so it shows in the club switcher).
   - Under *Club → Players*, give your own player a login with your personal email address (key button).
   - Under *Admin → Administration*, add that email as admin with the Admins button of the club. As soon as a club has an admin of its own, the global admin is no longer one of its admins.
   - Log in with your personal account: you play and run the club with it, and keep the global admin for the administration.

If `ADMIN_EMAIL` / `ADMIN_PASSWORD` are missing, the server still starts but logs an error and the existing data stays hidden; set them and restart to complete the migration.

API requests are authenticated by a signed, HTTP-only session cookie. Requests for players, games, training entries and statistics name the club in an `X-Club-Id` header.

**app-api/.env** *(used when running `npm run dev` directly — `DB_HOST` must be `localhost`)*

```dotenv
DB_HOST=localhost
DB_USER=admin
DB_PASSWORD=yourpassword
DB_NAME=darts_score
DB_PORT=27017

UI_URL=http://localhost:3000

IMG_DIR=data/img

NODE_ENV=development
```

**app-ui/.env** *(used by the Vite dev server)*

```dotenv
VITE_API_URL=http://localhost:3001
```

**mongo.env** *(only needed when running MongoDB via Docker Compose)*

```dotenv
MONGO_INITDB_ROOT_USERNAME=admin
MONGO_INITDB_ROOT_PASSWORD=yourpassword
MONGO_INITDB_DATABASE=darts_score
```

---

## Getting Started

### Local development (no Docker)

Requires a running MongoDB instance reachable at the address configured in `app-api/.env`.

```bash
cd app-api
npm install
npm run dev        # starts with nodemon (hot-reload) on http://localhost:3001
```

For the UI with hot-reload, run in a second terminal:

```bash
cd app-ui
npm install
npm run dev        # Vite dev server on http://localhost:3000
                   # /api requests are proxied to localhost:3001
```

### Docker Compose — development (recommended)

Starts **MongoDB + API + UI** in three containers. All three reload automatically when you change any source file — nodemon for the API, Vite HMR for the UI.

```bash
cp .env.sample .env
cp mongo.env.sample mongo.env
# edit both files with your passwords

docker compose -f docker-compose.dev.yml up --build
```

| Service | URL |
|---------|-----|
| React UI (Vite HMR) | `http://localhost:3000` |
| API | `http://localhost:3001` |
| Swagger UI | `http://localhost:3001/api-docs` |

To rebuild after dependency changes:

```bash
docker compose -f docker-compose.dev.yml up --build
```

### Docker Compose — production

`docker-compose.yml` is a ready-to-copy production setup: the published image `kosterra/darts-score:latest` (app and API in one container) and MongoDB, which is only reachable through the internal Docker network.

1. Copy `docker-compose.yml` and `.env.sample` to the server.
2. Rename `.env.sample` to `.env` and fill it in: database user and password (MongoDB is created with them), `SESSION_SECRET`, the first global admin, `APP_URL` and the SMTP settings for password reset and invitation mails. In Portainer, enter the same settings as the stack's environment variables instead.
3. Start it:

```bash
docker compose up -d
```

The app runs on `http://<server>:3001`, the Swagger UI at `/api-docs`. For HTTPS put a reverse proxy (Caddy, Traefik, nginx …) in front of port 3001; the login cookie becomes secure automatically when the proxy sends `X-Forwarded-Proto: https`. Uploaded pictures and logos are kept in the Docker volume `darts_score_data`, the database in `darts_score_db`. To keep the pictures in a folder of your own, mount it at `/app/data` and give it to user 1000, the user the app runs as (`chown -R 1000:1000 <folder>`).

#### Public access with a Cloudflare Tunnel

To make the app public from a server at home, `docker-compose.yml` includes an optional [Cloudflare Tunnel](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/). The tunnel connects out to Cloudflare, so no port has to be opened on the router, the address of your home connection stays hidden, and Cloudflare provides https. You need a domain whose DNS is managed by Cloudflare; the tunnel itself is free.

1. In the Cloudflare dashboard go to **Zero Trust → Networks → Tunnels**, create a tunnel (type *Cloudflared*) and copy its token.
2. Add a **public hostname** to the tunnel, e.g. `darts.example.com`, with the service `http://darts_score:3001`.
3. In `.env` (or the stack's variables in Portainer) set `COMPOSE_PROFILES=tunnel`, `TUNNEL_TOKEN=<the token>` and `APP_URL=https://darts.example.com`, then run `docker compose up -d` again.

Cloudflare sends `X-Forwarded-Proto: https`, so the login cookie is marked secure. Once the app is reached through the tunnel only, you can remove `ports` from the `darts_score` service so port 3001 is no longer open on the server's network.

To build and run the production image from the source instead:

```bash
docker build --target production -t darts-score .
docker run -p 3001:3001 --env-file .env darts-score
```

---

## Versioning

The application version is maintained in the **root `package.json`** and is the single source of truth for Docker image tags. Both `app-api/package.json` and `app-ui/package.json` carry `"version": "0.0.0"` to signal they are not independently published.

To release a new version, bump the version in the root `package.json` and push to `main`. The CI workflow reads the version from there and tags the Docker image accordingly.

The workflows (`.github/workflows`):

| Workflow | When | What |
|----------|------|------|
| `checks.yml` | every pull request, and called by the two below | API: lint, tests, the OpenAPI description, the bundle · UI: lint, types, tests (also complete translations), the build |
| `develop.yml` | every push to `develop` | the checks, then the image `:develop` for a test server with the newest state |
| `release.yml` | every push to `main` | the checks, then the tag and the images `:<version>` and `:latest` |

---

## Available Scripts

**API** — run from `app-api/`:

| Command | Description |
|---------|-------------|
| `npm run dev` | Start with nodemon (hot-reload) |
| `npm start` | Start without hot-reload |
| `npm run build` | Bundle with esbuild → `dist/bundle.js` |
| `npm run start:prod` | Run the production bundle |
| `npm test` | Run unit tests (Vitest) |
| `npm run test:watch` | Run tests in watch mode |
| `npm run lint` | Check code style (ESLint) |
| `npm run lint:fix` | Auto-fix lint issues |

**UI** — run from `app-ui/`:

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Vite dev server with HMR on port 3000 |
| `npm run build` | Build production bundle → `dist/` |
| `npm run preview` | Preview production build on port 3000 |
| `npm test` | Run unit tests (Vitest) |
| `npm run test:watch` | Run tests in watch mode |
| `npm run lint` | Check code style (ESLint) |
| `npm run typecheck` | TypeScript type check (no emit) |
| `npm run i18n check` | What is missing or wrong in the translations (also a test) |
| `npm run i18n missing [file]` | Writes the texts without translations to a file to fill in: `{ "text": ["de", "fr", "it", "es"] }` |
| `npm run i18n add <file> [--server]` | Adds a filled-in file; `--server` marks them as texts of the API too (then `npm run copy-rules`) |
| `npm run i18n prune` | Removes translations no text uses any more |

Translations: German in Swiss spelling (ss, never ß) with the informal "du", darts terms in English; English is the key itself.

---

## API Endpoints

### Players

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/players` | List all players |
| `GET` | `/api/players/search?searchTerm=` | Search by name / nickname |
| `GET` | `/api/players/:id` | Get a single player |
| `POST` | `/api/players` | Create a player *(multipart/form-data)* |
| `POST` | `/api/players/find` | Find players by IDs `{ playerIds: [] }` |
| `PUT` | `/api/players/:id` | Update a player *(multipart/form-data)* |
| `DELETE` | `/api/players/:id` | Delete a player |

### Player Images

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/images/players/:filename` | Serve a player profile image |

### Games — X01

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/games/x01` | List all X01 games |
| `GET` | `/api/games/x01/:id` | Get a single X01 game |
| `POST` | `/api/games/x01` | Create an X01 game |
| `POST` | `/api/games/x01/find` | Filter X01 games |
| `PUT` | `/api/games/x01/:id` | Update an X01 game |
| `DELETE` | `/api/games/x01/:id` | Delete an X01 game |

### Games — Cricket

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/games/cricket` | List all Cricket games |
| `GET` | `/api/games/cricket/:id` | Get a single Cricket game |
| `POST` | `/api/games/cricket` | Create a Cricket game |
| `PUT` | `/api/games/cricket/:id` | Update a Cricket game |
| `DELETE` | `/api/games/cricket/:id` | Delete a Cricket game |

### Games — Elimination

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/games/elimination` | List all Elimination games |
| `GET` | `/api/games/elimination/:id` | Get a single Elimination game |
| `POST` | `/api/games/elimination` | Create an Elimination game |
| `POST` | `/api/games/elimination/find` | Filter Elimination games |
| `PUT` | `/api/games/elimination/:id` | Update an Elimination game |
| `DELETE` | `/api/games/elimination/:id` | Delete an Elimination game |

### Training — Around the Clock (ATC)

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/training/atc` | List ATC entries *(query params for filtering)* |
| `POST` | `/api/training/atc` | Create an ATC entry |
| `DELETE` | `/api/training/atc/:id` | Delete an ATC entry |

### Statistics

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/stats/player/:id` | Overall stats for a player |
| `GET` | `/api/stats/games/x01/:id` | Stats for a single X01 game |
| `POST` | `/api/stats/players/x01` | Comparative X01 stats for multiple players |

---

## Image Upload

Player profile images are uploaded as `multipart/form-data` under the field name `profileImg`. Accepted formats: `image/png`, `image/jpg`, `image/jpeg`.

The API stores only the **filename** in the database. The UI constructs the image URL using the relative path:

```
GET /api/images/players/<filename>
```

Images are saved to the path configured in `IMG_DIR` (default: `data/img/players/`). Mount this directory as a Docker volume to persist images across container restarts.

---

## Support Legmate

Legmate is free for everyone, without ads and without tracking — and it stays that way. It is built in spare time; sponsoring pays for the server, the domain and the mails, and for time to build what comes next (group stages and leagues, tournaments between clubs, more games and statistics).

[![Sponsor on GitHub](https://img.shields.io/badge/Sponsor-%E2%99%A5-db61a2?logo=githubsponsors&logoColor=white)](https://github.com/sponsors/kosterra)

Every sponsor helps every installation of Legmate. Each installation can also show its own ways to give (e.g. TWINT) on its page **Support Legmate** (`/support`), set by its global admins under System settings.

### Sponsors

Clubs and people who keep Legmate going (Bullseye tier and up):

<!-- sponsors: add new names below, newest last -->
*Be the first: [become a sponsor](https://github.com/sponsors/kosterra).*

---

## License

Copyright (C) 2023–2026 kosterra

Legmate is free software under the [GNU Affero General Public License v3](LICENSE) (AGPL-3.0-only): you may run it, study it, change it and share it. Whoever offers a **changed** Legmate to others over a network, e.g. as a hosted service, must offer them its source code as well (section 13 of the licence).

Running Legmate for your club, unchanged or changed, is welcome. If you change it and others use it, point the **Source code** link to your own code: it is set once in `app-ui/src/utils/project.js`.

Versions up to 2026.10.15 were published under the GPLv3; they stay under it.

### The name and the logo

The name "Legmate" and its logo stand for this project. Forks are welcome under the AGPL, but please give a changed version that you offer to others a name and logo of its own, so nobody mistakes it for this project.
