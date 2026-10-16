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
  -v ./data:/app/data \
  kosterra/darts-score:latest
```

Open `http://localhost:3001` in your browser.

---

## Docker Compose

```yaml
services:

  darts_score:
    image: kosterra/darts-score:latest
    ports:
      - "3001:3001"
    env_file:
      - .env
    volumes:
      - ./data:/app/data
    restart: unless-stopped
    depends_on:
      mongo:
        condition: service_healthy

  mongo:
    image: mongo:8.0
    restart: unless-stopped
    env_file:
      - mongo.env
    environment:
      # mongod < 8.0.35 refuses to start on Ubuntu 7.0.0-x kernels (SERVER-131779).
      # Remove once mongo:8.0 resolves to >= 8.0.35.
      GLIBC_TUNABLES: glibc.pthread.rseq=1
    volumes:
      - darts_score_db:/data/db
    healthcheck:
      test: ["CMD", "mongosh", "--eval", "db.adminCommand('ping')"]
      interval: 15s
      timeout: 5s
      retries: 5
      start_period: 10s

volumes:
  darts_score_db:
```

**.env**

```dotenv
DB_HOST=mongo
DB_USER=admin
DB_PASSWORD=yourpassword
DB_NAME=darts_score
DB_PORT=27017
IMG_DIR=data/img
NODE_ENV=production
SESSION_SECRET=long-random-string
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=at-least-8-chars
```

**mongo.env**

```dotenv
MONGO_INITDB_ROOT_USERNAME=admin
MONGO_INITDB_ROOT_PASSWORD=yourpassword
MONGO_INITDB_DATABASE=darts_score
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
| `NODE_ENV` | no | `production` | `development` or `production` |
| `UI_URL` | no | — | Allowed CORS origin (only needed when the UI is served separately) |
| `SESSION_SECRET` | recommended | random per start | Signs the login cookie. Without it every restart logs all users out |
| `ADMIN_EMAIL` | first start | — | Email of the first global admin, created on startup when no global admin exists |
| `ADMIN_PASSWORD` | first start | — | Password of that account (at least 8 characters) |
| `APP_URL` | for email | — | Public address of the app, used for links in mails |
| `SMTP_HOST` | for email | — | SMTP server. Without it password reset and invitations by mail are off |
| `SMTP_PORT` | no | `587` | SMTP port (`465` implies TLS) |
| `SMTP_USER` / `SMTP_PASSWORD` | no | — | SMTP login, if the server needs one |
| `SMTP_FROM` | no | `Darts Score <no-reply@darts-score.local>` | Sender of the mails |

The app requires a login. Anyone can register and create clubs with their own players and games. A club can have several admins, and an admin can give players a login so they can play and train on their own. The global admin looks after all clubs and users on the *Administration* page and is meant for that only; play with a normal account.

**Upgrading:** database migrations run automatically on startup. Back up the database first, set `SESSION_SECRET`, `ADMIN_EMAIL` and `ADMIN_PASSWORD`, then start the new version: existing players and games are moved into a "Default Club" looked after by the global admin. Then hand it over: give your own player a login with your personal email (*Club → Players*) and add that email as admin (*Admin → Administration*, Admins button of the club). From then on the club is run by your own account and the global admin is no longer one of its admins.

---

## Persistent data

Player profile images are written to `IMG_DIR` (default `data/img`). Mount this path as a volume to persist images across container restarts and upgrades:

```yaml
volumes:
  - ./data:/app/data
```

---

## Tags

| Tag | Description |
|-----|-------------|
| `latest` | Most recent release |
| `YYYY.MM.PATCH` | Specific release (e.g. `2026.10.0`) |

---

## License

[GPLv3](https://www.gnu.org/licenses/gpl-3.0.html)
