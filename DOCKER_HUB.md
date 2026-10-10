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
