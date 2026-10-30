# Operations

Running and looking after a Legmate installation.

## Health

`GET /api/health` (unauthenticated) returns, while MongoDB answers:

```json
{ "status": "ok", "database": "ok", "version": "YYYY.MM.DD", "uptime": 1234 }
```

and `503` when the database is unreachable. The production image has a Docker
`HEALTHCHECK` on it (every 30 s, after a 1-minute start period), so Docker and
Portainer show the container healthy/unhealthy. Plain Docker does not restart an
unhealthy container on its own — point a monitor (e.g. Uptime Kuma) at
`/api/health`.

## The installation self-check

The global-admin **Administration** overview checks the installation and says
what to fix: `APP_URL`, mail configuration, `MFA_KEY`, `SESSION_SECRET`, backup
state, disk space, and whether a privacy page is set. It also shows every club
(admins, players, games, last activity), all accounts (clubs, last login), and
the system state (version, mail, database size, applied migrations).

## Backups

A backup job runs every 10 minutes and takes a database backup when one is due
on the schedule global admins configure; backups are written to `BACKUP_DIR`
(`utils/backups.js`). For a manual backup of the Dockerised MongoDB:

```bash
docker exec <mongo-container> mongodump --archive --gzip \
  -u <user> -p <password> --authenticationDatabase admin > backup.gz
```

Restore with `mongorestore --archive --gzip` against the same credentials. Take a
backup before a major upgrade. Uploaded images are **not** in the database — back
up the `darts_score_data` volume (or the host folder mounted at `/app/data`)
separately.

## Mail

Optional (Nodemailer, `utils/mail.utils.js` + `mail.templates.js`). With SMTP
configured: password resets, admin/player invitations, notification digests and
reminders. Without it the app runs fully and admins set initial passwords by
hand. The dev stack catches all mail in Mailpit (`http://localhost:8025`). Mail
templates render in the app's light theme; a non-production stack
(`ENVIRONMENT_LABEL`) marks its mails.

## Background jobs

Both are interval timers in-process (`.unref()`'d):

- **Notifications** — hourly: club-night reminders, weekly digests, queued
  in-app/mail notices (`utils/notification.jobs.js`).
- **Backups** — every 10 minutes: run a scheduled backup if due.

Restarting the container restarts the timers; no external scheduler is needed.

## Logging & errors

- **pino** structured logs to stdout (`LOG_LEVEL` sets verbosity) — collected by
  Docker.
- Warnings and errors are also kept for the global-admin **error log**
  (`utils/error.log.js`), visible in the app.
- A fatal uncaught exception is logged and the process exits (Docker restarts it
  per the compose `restart` policy).

## Two-step login recovery

If a global admin loses both their authenticator and recovery codes, set
`ADMIN_RESET_MFA=<their-email>` and restart; two-step login for that account is
turned off on the next start. **Remove the variable afterwards.** A warning is
logged at startup if stored two-step secrets can no longer be read with the
current `MFA_KEY` (it was changed or removed) — put the old key back, or affected
users recover with a code and set it up again.

## Secrets management

- Keep `SESSION_SECRET` and `MFA_KEY` set and backed up. Rotating
  `SESSION_SECRET` logs everyone out; rotating `MFA_KEY` invalidates stored
  two-step secrets except for the fallback decryption paths (see
  [security.md](security.md)). Plan rotation during a quiet window if ever needed.
- The database password is in `.env`/`mongo.env` (or the orchestrator's stack
  variables) and must match on both sides.

## Monitoring checklist

- `/api/health` watched by an uptime monitor.
- Container healthy in Docker/Portainer.
- Disk space for the database and the images volume (the self-check warns).
- Backups running and restorable (test a restore occasionally).
- TLS valid at the proxy / tunnel.
- Dependency advisories — regenerate and review the SBOMs in
  [`../sbom/`](../sbom/) on each release (`npm audit --omit=dev` for the shipped set).
