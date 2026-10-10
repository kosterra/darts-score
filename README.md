# darts-score-api

REST API **and** React UI for the [darts-score](https://github.com/kosterra/darts-score-sample) application. Built with **Express 5**, **Mongoose 9**, and **Node.js 24**. Serves the React frontend, player management, game data (X01, Cricket, Elimination, Around-the-Clock), player images, and statistics — all from a single container.

---

## Table of Contents

- [Requirements](#requirements)
- [Project Structure](#project-structure)
- [Configuration](#configuration)
- [Getting Started](#getting-started)
  - [Local development (no Docker)](#local-development-no-docker)
  - [Docker Compose (recommended)](#docker-compose-recommended)
  - [Production](#production)
- [Available Scripts](#available-scripts)
- [API Endpoints](#api-endpoints)
- [Image Upload](#image-upload)
- [Environment Variables](#environment-variables)

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
├── app-api/                 # Express API source
│   ├── src/
│   │   ├── config/      # Database connection config
│   │   ├── controllers/ # Route handlers (player, game, stats, file)
│   │   ├── models/      # Mongoose schemas + logger
│   │   ├── routes/      # Express router definitions
│   │   ├── utils/       # Filter query helpers, validation middleware
│   │   └── validators/  # express-validator rule sets
│   ├── public/          # API static assets (favicon)
│   ├── openapi.yaml     # OpenAPI 3.1 specification
│   ├── index.js         # Application entry point
│   ├── build.js         # esbuild production bundler
│   └── package.json
├── app-ui/                  # React UI source (Vite + React)
│   ├── src/             # UI components, services, utils
│   ├── public/          # UI static assets
│   ├── index.html
│   ├── vite.config.ts
│   └── package.json
├── data/                # Runtime image storage (created on first upload)
├── Dockerfile
└── docker-compose.yml
```

---

## Configuration

Copy the sample environment files and adjust the values:

```bash
cp .env.sample .env
cp mongo.env.sample mongo.env
```

**.env**

```dotenv
DB_HOST=darts_score_mongo   # MongoDB hostname or IP
DB_USER=admin
DB_PASSWORD=yourpassword
DB_NAME=darts_score
DB_PORT=27017

UI_URL=http://localhost:3000  # CORS origin for the Vite dev server (development only)

IMG_DIR=data/img              # Directory where uploaded images are stored

NODE_ENV=development          # development | production
PORT=3001                     # Optional, defaults to 3001
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

Requires a running MongoDB instance reachable at the address configured in `.env`.

```bash
cd app-api
npm install
npm run dev        # starts with nodemon (hot-reload)
```

For the UI with hot-reload, run in a second terminal:

```bash
cd app-ui
npm install
npm run dev        # Vite dev server on http://localhost:3000
                   # /api requests are proxied to localhost:3001
```

The API is available at `http://localhost:3001`. The React UI is served by Vite at `http://localhost:3000` during development. In production (Docker), both are served from `http://localhost:3001`. The Swagger UI is at `http://localhost:3001/api-docs`.

### Docker Compose (recommended)

Starts the API + UI server and a MongoDB instance together (2 containers total). The `development` target mounts the source directory so code changes trigger an automatic reload via nodemon.

```bash
cp .env.sample .env
cp mongo.env.sample mongo.env
# edit both files with your passwords

docker compose up
```

The React UI and API are both served from `http://localhost:3001`. The Swagger UI is at `http://localhost:3001/api-docs`.

To rebuild after dependency changes:

```bash
docker compose up --build
```

### Production

See the [darts-score-sample](https://github.com/kosterra/darts-score-sample) repository for the full production Docker Compose setup.

To build and run the production image manually:

```bash
docker build --target production -t darts-score-api .
docker run -p 3001:3001 --env-file .env darts-score-api
```

---

## Available Scripts

Run from the `app-api/` directory:

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

## License

[GPLv3](LICENSE)
