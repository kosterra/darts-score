# Legmate – the darts scoreboard

**Legmate** is a self-hosted darts scoreboard for clubs, pub teams, friends and flatshares. One image holds the whole app: the API (Express 5) and the web app (React), installable on phones as an app. All it needs next to it is MongoDB.

**Source and documentation:** [github.com/kosterra/darts-score](https://github.com/kosterra/darts-score) · **Licence:** AGPLv3

---

## What it does

- **Games:** X01 (101 to 1001, in/out modes, sets and legs, handicap), Cricket, Elimination, Around the Clock, and Shanghai, Killer, Halve-It, Golf and Tactics. Darts are tapped on the board or on a keypad, with checkout suggestions and a caller that calls the scores aloud.
- **Trainings:** X01 against a bot as strong as you, Around the Clock and more.
- **Statistics:** averages, checkout rates, form, records and head to head; badges, levels, flights and shirts to collect.
- **Clubs:** several admins, players with or without a login, tournaments (knockout, from 8 to 64 players), notifications by app and mail.
- **Without an account:** quick games and darts evenings with friends, shared by a link.
- **Accounts:** two-step login, passkeys (fingerprint, face or PIN), deleting the own account.
- **For the operator:**
  - an overview that checks the installation and names what to fix;
  - backups of the whole installation, by hand or on a schedule;
  - alerts for unusual activity, an error log, the usage per week;
  - a public start page that can be switched off.
- **Languages:** English, German, French, Italian and Spanish.

---

## Quick start

The repository has a ready-to-copy [`docker-compose.yml`](https://github.com/kosterra/darts-score/blob/main/docker-compose.yml) with MongoDB, and [`.env.sample`](https://github.com/kosterra/darts-score/blob/main/.env.sample) for the settings.

1. Copy both into a folder. Rename `.env.sample` to `.env` and fill in at least:
   - `DB_USER` and `DB_PASSWORD` (MongoDB is created with them);
   - `SESSION_SECRET` and `MFA_KEY` (two long random values);
   - `ADMIN_EMAIL` and `ADMIN_PASSWORD` (the first global admin);
   - `APP_URL` (the public address).
   - In Portainer, enter them as the stack's environment variables instead.
2. Start it: `docker compose up -d`.
3. Open `http://<server>:3001` and log in as the global admin. The overview says what is still missing, e.g. mail.

For HTTPS put a reverse proxy (or a Cloudflare Tunnel) in front of port 3001. The login cookie becomes secure by itself when the proxy sends `X-Forwarded-Proto: https`.

A minimal service, next to a MongoDB 7 or 8 that only it can reach:

```yaml
services:
  legmate:
    image: kosterra/darts-score:latest
    restart: unless-stopped
    ports:
      - "3001:3001"
    environment:
      DB_HOST: mongo
      DB_PORT: 27017
      DB_NAME: darts_score
      DB_USER: ${DB_USER}
      DB_PASSWORD: ${DB_PASSWORD}
      SESSION_SECRET: ${SESSION_SECRET}
      MFA_KEY: ${MFA_KEY}
      ADMIN_EMAIL: ${ADMIN_EMAIL}
      ADMIN_PASSWORD: ${ADMIN_PASSWORD}
      APP_URL: https://darts.example.com
    volumes:
      - legmate_data:/app/data
```

The full file in the repository adds MongoDB, the mail settings and the rest.

---

## Environment variables

| Variable | Required | Default | What it is for |
|----------|----------|---------|----------------|
| `DB_HOST`, `DB_PORT`, `DB_NAME` | yes | — | Where MongoDB is |
| `DB_USER`, `DB_PASSWORD` | yes | — | The MongoDB login |
| `SESSION_SECRET` | yes | — | Signs the login cookie. Changing it logs everyone out |
| `MFA_KEY` | recommended | from `SESSION_SECRET` | Encrypts the secrets of two-step login. Set it once and keep it: changing it ends every two-step login (recovery codes still let people in, to set it up again) |
| `APP_URL` | recommended | — | The public address: links in mails, link previews, the sitemap, and the domain passkeys belong to (HTTPS) |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD` | first start | — | The first global admin, created when there is none |
| `ADMIN_RESET_MFA` | no | — | Email of an account whose two-step login is turned off at the next start (a global admin without phone and recovery codes); remove it afterwards |
| `SMTP_HOST` | for mail | — | The mail server. Without it password reset, invitations and mail notifications are off |
| `SMTP_PORT` | no | `587` | `465` means TLS from the start |
| `SMTP_SECURE` | no | `true` on 465 | `true` for TLS from the start on another port |
| `SMTP_USER`, `SMTP_PASSWORD` | no | — | The login at the mail server |
| `SMTP_FROM` | recommended | `Legmate <no-reply@darts-score.local>` | The sender; many mail servers only send from the address of the login |
| `ENVIRONMENT_LABEL` | no | — | For a test server, e.g. `TEST`: in front of the subject and on a yellow strip on every mail it sends |
| `NODE_ENV` | no | `production` | Anything else (e.g. `test`) shows error details in the browser |
| `LOG_LEVEL` | no | `debug` | `error`, `warn`, `info` or `debug` |
| `IMG_DIR` | no | `data/img` | Where uploaded pictures go |
| `BACKUP_DIR` | no | `data/backups` | Where backups go |
| `PORT` | no | `3001` | The port inside the container |
| `UI_URL` | no | — | Only when the web app runs on an address of its own (development) |

---

## Data, backups and health

- **`/app/data`** holds the uploaded pictures (`data/img`) and the backups (`data/backups`). Keep it on a volume.
  - The app runs as user `node` (ID 1000). A named volume works as it is.
  - A folder of your own must belong to that user: `chown -R 1000:1000 /opt/legmate/data`.
- **Backups:** under *Administration → Backups*:
  - by hand, or daily or weekly at an hour, keeping the newest 1 to 60;
  - downloaded, uploaded again, and restored after a confirmation. A restore restarts the container, so keep `restart: unless-stopped`.
  - To keep them off the server's disk, mount another disk or a network share (e.g. NFS) at `/app/data/backups`, writable for user 1000.
- **Health:** the image has a `HEALTHCHECK` on `/api/health`.
  - It is healthy once the API reaches MongoDB; the endpoint answers `503` while it does not.
  - Docker and Portainer show the state.
- **Upgrading:** database migrations run by themselves at startup. Make a backup first, then pull the new image.

---

## Tags

| Tag | What it is |
|-----|------------|
| `latest` | The newest release |
| `YYYY.MM.N` | A release, e.g. `2026.10.18` |
| `develop` | The newest state of development, built after every change that passes all checks: for a test server, not for production |

---

## Licence

[AGPLv3](https://www.gnu.org/licenses/agpl-3.0.html): run it, change it and share it. Whoever offers a changed Legmate to others over the network shares its source code too. Forks are welcome; please give a changed version you offer to others a name and logo of its own, so nobody mistakes it for this project.
