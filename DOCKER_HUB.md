# darts-score

A self-hosted darts scoring application. The image bundles an **Express 5** REST API together with the **React** frontend — a single container is all you need to run the full application.

**Source:** [github.com/kosterra/darts-score](https://github.com/kosterra/darts-score)

---

## Features

- Clickable dartboard for score input
- Game types: **X01** (101 / 301 / 501 / 701 / 1001), **Cricket**, **Elimination**, **Around the Clock**
- Configurable in/out modes, sets and legs for X01
- Real-time best-finish suggestions
- Player statistics with charts (averages, score ranges, checkout rates)
- Player vs player comparison
- Player profile image upload
- Admin panel for managing players and game history
- OpenAPI / Swagger UI at `/api-docs`

---

## Quick start

Requires a running **MongoDB 7 / 8** instance.

```bash
docker run -d \
  -p 3001:3001 \
  -e DB_HOST=your-mongo-host \
  -e DB_PORT=27017 \
  -e DB_USER=admin \
  -e DB_PASSWORD=yourpassword \
  -e DB_NAME=darts_score \
  -v darts_score_data:/app/data \
  kosterra/darts-score:latest
```

Open `http://localhost:3001` in your browser.

---

## Docker Compose

A ready-to-copy setup is [`docker-compose.yml`](https://github.com/kosterra/darts-score/blob/main/docker-compose.yml) in the repository, with [`.env.sample`](https://github.com/kosterra/darts-score/blob/main/.env.sample) for the settings. Put them in a `.env` file next to it, or in Portainer as the stack's environment variables. In short:

```yaml
services:

  # ---------------------------------------------------------------------------
  # Darts Score: the API and the app in one container
  # ---------------------------------------------------------------------------
  darts_score:
    image: kosterra/darts-score:latest
    container_name: darts_score
    restart: unless-stopped
    ports:
      - "3001:3001"
    # The settings come from the variables of the stack (Portainer) or a .env
    # file next to this file (docker compose). Settings marked "?" are required:
    # without them the stack is not started and says which one is missing.
    environment:
      NODE_ENV: ${NODE_ENV:-production}
      DB_HOST: ${DB_HOST:-mongo}
      DB_PORT: ${DB_PORT:-27017}
      DB_NAME: ${DB_NAME:-darts_score}
      DB_USER: ${DB_USER:?set DB_USER, the database user}
      DB_PASSWORD: ${DB_PASSWORD:?set DB_PASSWORD, the database password}
      SESSION_SECRET: ${SESSION_SECRET:?set SESSION_SECRET to a long random value}
      ADMIN_EMAIL: ${ADMIN_EMAIL:-}
      ADMIN_PASSWORD: ${ADMIN_PASSWORD:-}
      APP_URL: ${APP_URL:-}
      UI_URL: ${UI_URL:-}
      SMTP_HOST: ${SMTP_HOST:-}
      SMTP_PORT: ${SMTP_PORT:-587}
      SMTP_SECURE: ${SMTP_SECURE:-}
      SMTP_USER: ${SMTP_USER:-}
      SMTP_PASSWORD: ${SMTP_PASSWORD:-}
      SMTP_FROM: ${SMTP_FROM:-}
      IMG_DIR: ${IMG_DIR:-data/img}
      LOG_LEVEL: ${LOG_LEVEL:-info}
    volumes:
      # uploaded player pictures and club logos, in a Docker volume the app may
      # write to. To keep them in a folder of your own instead, use e.g.
      # "/opt/darts-score/data:/app/data" and give that folder to user 1000
      # ("chown -R 1000:1000 /opt/darts-score/data"), the user the app runs as.
      - darts_score_data:/app/data
    depends_on:
      mongo:
        condition: service_healthy
    healthcheck:
      # the image has no curl or wget, so Node itself asks the health endpoint
      test: ["CMD", "node", "-e", "fetch('http://localhost:3001/api/health').then(r => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"]
      interval: 30s
      timeout: 5s
      retries: 3
      start_period: 20s

  # ---------------------------------------------------------------------------
  # MongoDB: only reachable by Darts Score, through the internal network
  # ---------------------------------------------------------------------------
  mongo:
    image: mongo:8.0
    container_name: darts_score_db
    restart: unless-stopped
    environment:
      # the database's administrator is the user Darts Score logs in with;
      # it is created on the database's very first start
      MONGO_INITDB_ROOT_USERNAME: ${DB_USER:?set DB_USER, the database user}
      MONGO_INITDB_ROOT_PASSWORD: ${DB_PASSWORD:?set DB_PASSWORD, the database password}
      MONGO_INITDB_DATABASE: ${DB_NAME:-darts_score}
      # mongod < 8.0.35 refuses to start on Ubuntu 7.0.0-x kernels (SERVER-131779).
      # Letting glibc own rseq makes TCMalloc skip per-CPU caches, which passes the check.
      # Remove once mongo:8.0 resolves to >= 8.0.35.
      GLIBC_TUNABLES: glibc.pthread.rseq=1
    volumes:
      - darts_score_db:/data/db
    # no "ports": the database stays private. To reach it from the server
    # itself (e.g. with MongoDB Compass), add: ports: ["127.0.0.1:27017:27017"]
    healthcheck:
      test: ["CMD", "mongosh", "--quiet", "--eval", "db.adminCommand('ping')"]
      interval: 15s
      timeout: 5s
      retries: 5
      start_period: 20s

volumes:
  darts_score_db:
    name: darts_score_db
  darts_score_data:
    name: darts_score_data
```

MongoDB has no published port: only Darts Score reaches it, through the internal network. For HTTPS put a reverse proxy in front of port 3001; the login cookie becomes secure automatically when the proxy sends `X-Forwarded-Proto: https`.

**.env** (or the stack's environment variables in Portainer; MongoDB is created with `DB_USER` and `DB_PASSWORD`)

```dotenv
DB_USER=admin
DB_PASSWORD=yourpassword
SESSION_SECRET=long-random-string
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=at-least-8-chars
APP_URL=https://darts.example.com
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=darts@example.com
SMTP_PASSWORD=yourmailpassword
SMTP_FROM=Oche <darts@example.com>
IMG_DIR=data/img
LOG_LEVEL=info
```

---

## Environment variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `DB_HOST` | yes | — | MongoDB hostname or IP |
| `DB_PORT` | yes | — | MongoDB port |
| `DB_USER` | yes | — | MongoDB username |
| `DB_PASSWORD` | yes | — | MongoDB password |
| `DB_NAME` | yes | — | MongoDB database name |
| `IMG_DIR` | no | `data/img` | Path for uploaded player images |
| `PORT` | no | `3001` | HTTP port the server listens on |
| `NODE_ENV` | no | `production` | `production` hides error details from the browser; anything else (e.g. `test`) shows them and appears as the environment on the administration page |
| `UI_URL` | no | — | Allowed CORS origin (only needed when the UI is served separately) |
| `SESSION_SECRET` | recommended | random per start | Signs the login cookie. Without it every restart logs all users out |
| `MFA_KEY` | recommended | from `SESSION_SECRET` | Encrypts the secrets of two-step login. Without it they depend on `SESSION_SECRET`: changing that turns two-step login off for everyone |
| `ADMIN_RESET_MFA` | no | — | Email of an account whose two-step login is turned off at the next start (a global admin who lost phone and recovery codes); remove it afterwards |
| `ADMIN_EMAIL` | first start | — | Email of the first global admin, created on startup when no global admin exists |
| `ADMIN_PASSWORD` | first start | — | Password of that account (at least 8 characters) |
| `APP_URL` | for email | — | Public address of the app, used for links in mails |
| `SMTP_HOST` | for email | — | SMTP server. Without it password reset and invitations by mail are off |
| `SMTP_PORT` | no | `587` | SMTP port (`465` implies TLS) |
| `SMTP_USER` / `SMTP_PASSWORD` | no | — | SMTP login, if the server needs one |
| `SMTP_FROM` | no | `Oche <no-reply@darts-score.local>` | Sender of the mails |
| `SMTP_SECURE` | no | `true` on port 465 | `true` for TLS from the start on another port |
| `LOG_LEVEL` | no | `debug` | `error`, `warn`, `info` or `debug` |

The app requires a login. Anyone can register and create clubs with their own players and games. A club can have several admins, and an admin can give players a login so they can play and train on their own. The global admin looks after all clubs and users on the *Administration* page and is meant for that only; play with a normal account.

**Upgrading:** database migrations run automatically on startup. Back up the database first, set `SESSION_SECRET`, `ADMIN_EMAIL` and `ADMIN_PASSWORD`, then start the new version: existing players and games are moved into a "Default Club" looked after by the global admin. Then hand it over: give your own player a login with your personal email (*Club → Players*) and add that email as admin (*Admin → Administration*, Admins button of the club). From then on the club is run by your own account and the global admin is no longer one of its admins.

---

## Persistent data

Player pictures and club logos are written to `/app/data` (`IMG_DIR`, default `data/img`). The app runs as user `node` (ID 1000), so `/app/data` must be writable for that user:

- **A named volume** (as in the compose file above) works out of the box: Docker creates it with the right owner.
- **A folder of your own** must belong to user 1000, otherwise uploads fail and the log says "Pictures cannot be saved":

```bash
mkdir -p /opt/darts-score/data && chown -R 1000:1000 /opt/darts-score/data
```

```yaml
volumes:
  - /opt/darts-score/data:/app/data
```

---

## Tags

| Tag | Description |
|-----|-------------|
| `latest` | Most recent release |
| `YYYY.MM.PATCH` | Specific release (e.g. `2026.10.0`) |

---

## License

[AGPLv3](https://www.gnu.org/licenses/agpl-3.0.html): run it, change it and share it; whoever offers a changed Oche to others over the network shares its source code too.
