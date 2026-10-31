# Threat model

A STRIDE threat model of Legmate per trust boundary, as OWASP ASVS Level 3
asks for (V1 documentation requirements; see
[`.claude/skills/owasp-asvs/SKILL.md`](../.claude/skills/owasp-asvs/SKILL.md)).
It names the assets, the actors, the data flows, the eight trust boundaries
and, for each boundary, the threats, the control that exists in this code and
what is left. Status as of release 2026.10.31; the companion documents are
[architecture.md](architecture.md), [security.md](security.md),
[deployment.md](deployment.md), [data-model.md](data-model.md) and
[backend.md](backend.md).

STRIDE: **S**poofing, **T**ampering, **R**epudiation, **I**nformation
disclosure, **D**enial of service, **E**levation of privilege. Priority:
**H**igh (fix in the next release), **M**edium (plan it), **L**ow (accepted or
monitor).

## 1. Scope and assets

In scope: the Express API and the React SPA in the one production image, the
MongoDB it uses, outgoing mail, uploaded files, backups, the CI pipeline that
builds and publishes the image, and the proxy/tunnel in front. Out of scope:
the operating system of the server, the Cloudflare or proxy product itself,
the mail provider's own infrastructure, GitHub and Docker Hub as services.

| Asset | Where | Why it matters |
|-------|-------|----------------|
| Accounts | `user` collection: email, scrypt hash, role, MFA secret (AES-256-GCM), passkey public keys | Takeover gives the person's clubs; a global admin gives the installation |
| Sessions | `ds_session` signed cookie + `session` collection | A stolen cookie is a logged-in user until the timeout (1–24 h, default 5) |
| Player data and statistics | `player` (names, date of birth, picture), game collections, stats | Personal data of club members, many of them minors' dates of birth; fair-play history |
| Club data | `club`, tournaments, leagues, calendar, `club.link` | Membership lists, admins, what is public |
| Uploaded pictures | `/app/data/img/{players,clubs}` on the data volume | Faces of members; served from the app's own origin |
| Mail | SMTP credentials, mail content (reset/invite/claim links) | A reset link is a credential; the SMTP account can be abused for spam |
| Backups | `/app/data/backups/*.json.gz` | Every collection but sessions, plus pictures, in one file — the whole installation |
| Admin settings | `setting` collection: session timeout, MFA policy, mail limit, backup schedule, legal pages, start page | Change them and you change the security posture |
| The image and the pipeline | `Dockerfile`, `.github/workflows`, Docker Hub `kosterra/darts-score` | Whoever controls the image controls every installation that pulls it |
| Secrets | `SESSION_SECRET`, `MFA_KEY`, `DB_PASSWORD`, `SMTP_PASSWORD`, `TUNNEL_TOKEN`, `DOCKERHUB_*` | In `.env`/the Portainer stack and GitHub secrets |

## 2. Actors

| Actor | Trust | Can reach |
|-------|-------|-----------|
| Anonymous visitor | none | Public pages, quick games and darts evenings, registration, login, public club pages, `/api-docs`, `/api/health` |
| Player (member) | authenticated, `clubRole = player` | Own clubs' games, stats, calendar; own account |
| Club admin | `club.admins[]` | Everything in the club: players, settings, logo, deletes, tournaments, connections |
| Global admin | `user.role = globalAdmin` | `/api/admin/*`, `/api/users/*`: all users, sessions, settings, backups and restore, error log |
| Connected-club admin | admin of another club with an accepted `club.link` | Shared tournaments of the host club: enters own players, plays the match games |
| TV / big screen | holds a 12-hour HMAC token or a pairing secret | Read-only live view of one game or evening |
| Shared-link viewer | holds an evening share token, a calendar token, a claim/reply/unsubscribe link | The one resource the link is for |
| Operator | root on the server, the stack's environment | Everything: volumes, `.env`, MongoDB, logs |
| CI pipeline | GitHub Actions with `DOCKERHUB_*` secrets | Builds and pushes the image that production pulls |

## 3. System and data flows

```
                 Internet
                    │ https
   ┌────────────────▼─────────────────┐
   │ reverse proxy  /  Cloudflare     │  (a)  TLS ends here; adds X-Forwarded-*
   │ Tunnel (cloudflared container)   │
   └────────────────┬─────────────────┘
                    │ http :3001                              (h) CI → Docker Hub → pull
   ┌────────────────▼─────────────────┐     ┌──────────────┐        ┌─────────────┐
   │ darts_score container            │ (c) │ MongoDB      │        │ GitHub      │
   │  Express API + built SPA         ├────►│ (no ports)   │        │ Actions     │
   │  helmet, limits, sessions, authz │     └──────────────┘        └──────┬──────┘
   │                                  │ (d) ┌──────────────┐               ▼
   │                                  ├────►│ SMTP provider│        ┌─────────────┐
   │                                  │     └──────────────┘        │ Docker Hub  │
   │                                  │ (d') https                  └─────────────┘
   │                                  ├────►api.pwnedpasswords.com/range/<5 hex>
   │  /app/data (e)                   │
   │   img/  backups/                 │
   └──────────────────────────────────┘
      ▲ (f) share/TV/calendar links        (g) club ↔ connected club, inside the API
```

- **Browser ↔ API.** One origin in production; the SPA calls `/api/*` with the
  `ds_session` cookie and the `X-Club-Id` header (`app-api/index.js`,
  `src/middleware/auth.middleware.js`).
- **API ↔ MongoDB.** `mongodb://user:pass@mongo:27017/db?authSource=admin`
  over the internal Docker network, no TLS (`src/config/db.config.js`).
- **API ↔ SMTP.** Nodemailer, STARTTLS on 587 or implicit TLS on 465
  (`src/utils/mail.utils.js`); links in mails are built from `APP_URL`.
- **API ↔ HIBP.** New in this release: the Pwned Passwords range API
  (`src/utils/breached.password.js`). Only the first five hex characters of the
  SHA-1 of the password are sent (`Add-Padding: true`), the suffixes are
  compared locally; 3 s timeout, **fails open** and logs once;
  `BREACHED_PASSWORD_CHECK=off` disables it. The first outbound call the API
  makes to a third party other than SMTP.
- **Proxy/Cloudflare ↔ API.** Plain HTTP on 3001; the app trusts
  `X-Forwarded-For`/`-Proto` from loopback, link-local and private addresses
  (`TRUST_PROXY`, `index.js`).
- **CI ↔ Docker Hub ↔ server.** `release.yml` builds from `main`, pushes
  `:<version>` and `:latest`; the server pulls `:latest` (`docker-compose.yml`).
- **Admin ↔ backups.** Global admins create, download, upload and restore
  gzipped JSON-lines backups under `BACKUP_DIR` (`src/utils/backups.js`,
  `src/routes/admin.routes.js`).

## 4. Trust boundaries

| # | Boundary | What crosses it |
|---|----------|-----------------|
| (a) | Internet ↔ proxy/tunnel | Every request; TLS terminated; forwarded headers added |
| (b) | Proxy ↔ API container | Plain HTTP; `X-Forwarded-*` trusted; port 3001 |
| (c) | API ↔ MongoDB | Every query; one over-privileged database user |
| (d) | API ↔ mail provider | Reset/invite/claim links, digests; SMTP credentials |
| (e) | API ↔ file system | Uploaded images, backups, the data volume |
| (f) | Browser ↔ API for a shared/public link | Bearer-style tokens in URLs; no session |
| (g) | Club ↔ connected club | Shared tournaments across the single-club authorisation model |
| (h) | Developer/CI ↔ registry ↔ production | Source, Actions, the image, the pull |

## 5. STRIDE per boundary

### (a) Internet ↔ proxy/tunnel

| STRIDE | Threat / example | Existing control | Residual risk / gap | Pri |
|--------|------------------|------------------|---------------------|-----|
| S | Phishing site imitating legmate.ch; passkey replay to a look-alike host | Passkeys bound to the `APP_URL` origin (`src/utils/passkeys.js`); reset links built from `APP_URL`, never from `Host` | Password + TOTP are still phishable; passkeys are optional | M |
| T | Downgrade to HTTP, cookie injection over HTTP | HSTS 180 days `includeSubDomains` (`index.js`); cookie `Secure` on `X-Forwarded-Proto: https` | No HSTS preload; TLS version policy lives at the proxy, not verified by the app (ASVS V12 open item) | M |
| R | Attacker hides behind shared IP; a finder has nowhere to report | `clientIp()` from the trusted forwarded chain; error log keeps method, URL, user, IP (`src/utils/error.log.js`); `/.well-known/security.txt` (RFC 9116) names the operator's contact (`index.js`, `src/utils/security.txt.js`, new this release) | Logs are not shipped off the host; a root operator can edit them | L |
| I | TLS misconfiguration at the proxy exposes traffic | Out of app; documented in deployment.md | Confirm TLS 1.2+/1.3 and the cipher list at Caddy/Traefik/Cloudflare | M |
| D | Flood of requests | Global limiter 50 000/15 min per IP; per-route limiters (credentials 30/15 min, contact 5/h, quick game start 10/h, evening start 5/h, screen 2 000/15 min); Cloudflare absorbs volumetric floods when the tunnel is used | A reverse-proxy install without Cloudflare has no volumetric protection; 50 000/15 min is a backstop, not a shield | M |
| E | Credential stuffing | Login 10 failures/15 min per account and per IP (`spam.rules.js` `LOGIN_LIMIT`), credential limiter, identical answers for known/unknown accounts, breached passwords refused (`breached.password.js`), TOTP/passkeys, admin-enforced MFA policy | Registration still answers 409 for an existing email (accepted) | M |

### (b) Proxy ↔ API container

| STRIDE | Threat / example | Existing control | Residual risk / gap | Pri |
|--------|------------------|------------------|---------------------|-----|
| S | Spoofed `X-Forwarded-For` to dodge per-IP limits and the sign-up spam guard, or to get a `Secure` cookie flag oddly set | `trust proxy` = `loopback, linklocal, uniquelocal` only; `TRUST_PROXY` overridable (`index.js`) | `docker-compose.yml` publishes `${APP_BIND:-0.0.0.0}:3001:3001`: by default on all interfaces, so anyone who reaches 3001 from a private network (LAN, another container, a host on the same VPC) is a "trusted proxy" and can forge the client IP. Operators behind a proxy set `APP_BIND=127.0.0.1`; with the tunnel profile the port need not be published at all (`docs/deployment.md`) | M (H when `APP_BIND` is left open behind a proxy) |
| S | Host header / `X-Forwarded-Host` tricks against CORS or links | CORS allows `APP_URL`, `UI_URL`, the request `Host` or the first `X-Forwarded-Host` (`src/utils/origin.utils.js`); mail and sitemap links prefer `APP_URL` | When `APP_URL` is unset `baseOf()` falls back to the request host (robots/sitemap/SSR meta); set `APP_URL` in production (the self-check warns) | L |
| T | Request smuggling / oversized bodies | Express 5 parsers; JSON and urlencoded bodies capped at 2 MB (`index.js`); image uploads 5 MB in memory (`file.controller.js`); backup uploads via multer with their own limit | A game, the largest JSON body, stays well under 1 MB; the global limiter (50 000/15 min) bounds the rest | L |
| I | Swagger UI and the OpenAPI document are reachable without login at `/api-docs` with a looser CSP (`unsafe-inline`) | Separate CSP for that path; the API contract is public by design | Discloses the full route list to an attacker; acceptable for an open-source app, but consider gating behind `requireGlobalAdmin` in production | L |
| D | Health probe hammering | `/api/health` pings MongoDB on every call | Inside the global limiter only; cheap, acceptable | L |
| E | Headers that only the proxy should set are accepted from the client when the proxy does not strip them | Only `X-Forwarded-*` are honoured, and only from trusted addresses | Depends on the proxy stripping client-supplied `X-Forwarded-*`; Cloudflare and Caddy do, nginx needs `proxy_set_header` | L |

### (c) API ↔ MongoDB

| STRIDE | Threat / example | Existing control | Residual risk / gap | Pri |
|--------|------------------|------------------|---------------------|-----|
| S | Another container on the Docker network logs in as the app | SCRAM auth with `DB_USER`/`DB_PASSWORD`; no published port (`docker-compose.yml`) | The app logs in as the **MongoDB root user** (`MONGO_INITDB_ROOT_USERNAME = DB_USER`): a compromised API can drop every database, create users, read the admin DB. A dedicated `readWrite` user on `darts_score` would contain it | M |
| T | NoSQL injection (`{$ne: null}` in a login body) | express-validator constrains every field to strings/ids; `isValidObjectId` on ids; Mongoose casting; `sanitizeBody` strips control chars and `<>` from free text (`src/utils/sanitize.body.js`) | Pentest found none; keep validators on every new route | L |
| T | Migration bug corrupts data at startup | Migrations run once, recorded, re-run if interrupted (`src/utils/migrations.js`); backup before upgrade documented | A `before-restore` backup is automatic for restores but **not** for upgrades | L |
| R | A global admin or operator edits data directly | Admin actions log the actor's email (`backup.controller.js`, `admin.routes.js`) | No audit collection for ordinary data changes; direct `mongosh` edits leave no trace in the app | L |
| I | Traffic sniffed on the Docker bridge; a volume copied | No TLS to MongoDB (internal network only); `user.toJSON` strips `passwordHash`, MFA, passkeys, `calendarToken` | The database volume is **not encrypted at rest**; the `calendarToken` is stored in clear (a hash would do, as reset/claim tokens already are) | M |
| D | Unbounded queries from a busy club | Lean queries, indexes on the per-club lookups; creation limits (30 players/games/trainings per 10 min per account) | Large aggregations (stats, admin insights) have no timeout; MongoDB on the same host competes for RAM | L |
| E | Mass assignment of `role`, `admins`, `clubs`, `user`, `level` | Validators ignore privileged fields; roles resolved per request (`getClubRole`), never from the client | Tested 18/18 in the pentest; regression-test on new routes | L |

### (d) API ↔ mail provider

| STRIDE | Threat / example | Existing control | Residual risk / gap | Pri |
|--------|------------------|------------------|---------------------|-----|
| S | Forged "from Legmate" mails to members | `SMTP_FROM` fixed; `ENVIRONMENT_LABEL` marks TEST mails (`mail.utils.js` `markEnvironment`) | SPF/DKIM/DMARC are the operator's DNS job, not checked by the app | M |
| T | Link injection into a mail body; HTML injection via a club name | Templates escape every variable (`mail.templates.js` `escapeHtml`); links built from `APP_URL` + a token | None known | L |
| T | Downgraded SMTP session | `secure: true` on 465; on other ports `requireTLS: true` unless `SMTP_REQUIRE_TLS=false` (`mail.utils.js`), so a stripped STARTTLS offer fails the send instead of exposing credentials and reset links | Only an operator who sets `SMTP_REQUIRE_TLS=false` for a relay without TLS (the dev mailpit) is exposed | L |
| R | "I never got the reset mail" | Mail errors explained and logged (`explainMailError`); daily counter (`mail.limit.js`) | No per-recipient send log visible to admins | L |
| I | Reset/invite/claim links in a mailbox | Reset token 32 random bytes, SHA-256 hashed at rest, 1 h; invite 7 days; claim 24 bytes hashed (`auth.tokens.js`, `player.claims.js`); tournament reply token is an HMAC of ids | The reply token has **no expiry** and answers in/out for the player for ever; the mailbox is the weakest link, outside the app | L |
| D | Mail bomb from registration or notifications; provider lockout | Reset requests 5/h per account (`RESET_LIMIT`), sign-up 3/h per IP + honeypot + 3 s form timer, daily mail limit stops sending near the provider's cap | Attacker can still exhaust the daily limit so legitimate resets wait a day | M |
| E | SMTP credentials leak from the stack config | Env only, never logged; `mailSetup()` reports only whether a password is set | Operator hygiene | L |

The HIBP range API shares this boundary's character (an outbound call to a
third party) and is covered here rather than in a ninth table:

| STRIDE | Threat / example | Existing control | Residual risk / gap | Pri |
|--------|------------------|------------------|---------------------|-----|
| I | A password or its hash leaves the server; the response size reveals the prefix's bucket | k-anonymity: five hex characters of SHA-1 only; `Add-Padding: true`; HTTPS; no password in logs (`breached.password.js`) | HIBP learns the installation's egress IP and that a password was set at that moment; acceptable | L |
| S/T | A MITM or a DNS answer points `api.pwnedpasswords.com` elsewhere and returns "clean" for everything | HTTPS with Node's default CA store; a forged "breached" answer only blocks a password | A forged "clean" answer is indistinguishable from the fail-open path; the control is best-effort by design | L |
| D | HIBP slow or down blocks sign-ups and password changes | 3 s timeout, **fails open**, one warning per process start; `BREACHED_PASSWORD_CHECK=off` as a kill switch | Fail-open means an outage silently lowers V6 assurance until the API answers again; the warning lands in the admin error log | L |

### (e) API ↔ file system (uploads, backups, data volume)

| STRIDE | Threat / example | Existing control | Residual risk / gap | Pri |
|--------|------------------|------------------|---------------------|-----|
| T | Stored XSS via a script dressed as an image (pentest F-1) | Type decided by the file's **magic bytes** (PNG `89 50 4E 47…`, JPEG `FF D8 FF`), fresh UUID name, forced `.png`/`.jpg`, 5 MB cap, one file (`src/controllers/file.controller.js`); served with `basename` + `dotfiles: deny` (`player.img.routes.js`); CSP `object-src 'none'` | A polyglot JPEG is still served as `image/jpeg`, which browsers do not execute; no re-encoding (sharp) — acceptable | L |
| T | Path traversal in a backup name or a restored file | Backup names validated by regex both in the route and `backupPath()`; restore writes only below `IMG_DIR` (`startsWith(IMG_DIR + sep)`) | None known | L |
| T | A **malicious backup upload** replaces every collection | `requireGlobalAdmin` on `/api/admin/backups/*`; `readHeader()` checks the format; a `before-restore` backup is taken first; one backup/restore at a time | A compromised global admin account is a full data-replacement vector; restore is logged with the actor; MFA for admins is the control that matters (policy setting) | M |
| R | Who restored what | `logger.warn` with name and email on restore, `logger.info` on create/upload/delete | Log lines only; the error log keeps warnings, so restores are visible to admins | L |
| I | Backups readable on disk | Files live under `/app/data/backups` on the same volume as the images, owned by UID 1000, `chmod 770` on `/app` | Backups are **unencrypted** gzipped JSON with password hashes, encrypted MFA secrets (key not included), emails, dates of birth and all pictures. Anyone with the volume or a server snapshot has the installation. Encrypt at rest (age/GPG with an operator key) or at least keep the schedule's `keep` small and move them off-host | **H** |
| I | A logged-in user fetches another club's player picture | Player pictures require a login; filenames are UUID v4 (unguessable) | `/api/images/players/:filename` checks the session but **not** club membership — any logged-in user who learns a filename can view the picture (security.md says otherwise). Low because filenames are random and only shown to club members | L |
| D | Disk filled by uploads or backups | 5 MB per image; backup upload limit 4 GB (admin only); `pruneBackups(keep)` 1–60; self-check warns on disk space | Scheduled backups include all images base64-encoded, so a club with many pictures multiplies disk use daily | L |
| E | Container escape via the volume | Non-root (UID 1000), slim image, no shell tools needed at runtime | Standard container hardening (read-only root FS, `no-new-privileges`) is not in the compose file | L |

### (f) Browser ↔ API for a shared/public link

| STRIDE | Threat / example | Existing control | Residual risk / gap | Pri |
|--------|------------------|------------------|---------------------|-----|
| S | Forged TV token or pairing | Screen tokens are HMAC-SHA256 with a key derived from `SESSION_SECRET`, 12 h, kind + game id (`src/utils/screens.js`); pairing secret 24 random bytes stored as SHA-256; six-digit codes unique among live pairings, send attempts 20/15 min | A six-digit code with 20 tries/15 min per IP is fine; a botnet could reach a code but only pushes a game onto a stranger's TV | L |
| T | Anyone with a quick-game or evening id writes scores | Quick games and evenings are driven by their MongoDB ObjectId; writes limited to 900/15 min and 60/h; games kept ~30 days (`quick.game`), evenings end after 12 h idle | ObjectIds are not random secrets (timestamp + per-process random + counter). An attacker who learns an id (shared screen, URL in a chat) can tamper with that evening. Low value data; an owner secret would close it | L |
| I | Share links in the open | Evening share token 12 random bytes (`newShareToken`), read-only view; calendar token 24 bytes, personal iCal feed; public club pages show only what the admin set (`isPublic`, `publicLiveGames`, `publicResults`), hidden players as "Hidden player", never pictures, names or emails | The calendar feed exposes club nights and attendance to anyone with the URL; it is stored unhashed and only rotated on request. The TV token shows nicknames and live scores for 12 h — by design for a pub screen | L |
| I | Search engines index private pages | `robots.txt`/`sitemap.xml` list only public pages (`page.meta.js`); SSR meta only for public evenings and public site | None known | L |
| D | Scraping public overview and live games | Public read limiters (`public.routes.js`, evening reading 600/15 min, screen 2 000/15 min) | Fine | L |
| E | Claim link turns an outsider into a member | Claim token hashed, expires after `CLAIM_DAYS`, created only by a club admin; claiming requires a login | A forwarded claim mail lets the wrong account claim the player; admins can revoke (`DELETE /players/:id/claim`) | L |

### (g) Club ↔ connected club

| STRIDE | Threat / example | Existing control | Residual risk / gap | Pri |
|--------|------------------|------------------|---------------------|-----|
| S | A club poses as connected | `club.link` must be **mutual and admin-approved** (`club.link.controller.js` `decide`: only the other club accepts); `areConnected`/`connectedClubIds` check `status: 'accepted'` (`src/utils/club.links.js`) | None known | L |
| T | Guest admin edits the host's bracket or enters host players | Only host admins run the tournament (`requireClubAdmin` + `isHost`); `answerEntry` checks the player belongs to the entering club; `resolveInvitedClubs` accepts connected clubs only (`tournament.controller.js`) | A guest admin can start and score **match games** of the shared tournament (`game.controller.js` `loadForRequest` → `participatesInTournament`, `src/utils/tournaments.js`): that is the intended "play the match" access, but it also lets them alter a host-owned game record; the integrity review tools apply | L |
| R | Disputed cross-club result | Fair-play hits and `integrity.review` exist; game `createdBy`/`updatedBy` | No explicit "entered by club X" on a shared game's throws | L |
| I | Host sees the guest's roster; guest sees the host's players | Guest admin enters its own players, so rosters are not listed across clubs; the bracket shows nicknames of entrants only (by design) | Deep per-game analytics of shared games stay host-owned (documented follow-up); a guest cannot query them, which is the safe side | L |
| D | Connection spam | Unique `pair` key (11000 → 409); admin-only requests | No limiter on connection requests; low value | L |
| E | Cross-club IDOR via `X-Club-Id` | `requireClub` resolves the role per request; `participatesInTournament` is the **only** widening and only for games with `tournament.id`; every other route is single-club. Pentest + 27 cross-club probes on the isolated stack | Every new "shared" feature must be reviewed against this table; the single-club model is the app's core authorisation guarantee | M |

### (h) Developer/CI ↔ registry ↔ production

| STRIDE | Threat / example | Existing control | Residual risk / gap | Pri |
|--------|------------------|------------------|---------------------|-----|
| S | Compromised Docker Hub account pushes a bad `:latest` | `DOCKERHUB_*` as GitHub secrets; `release.yml` only on `main`, `main` only via reviewed PR; `permissions: contents: read` on develop/checks, `write` only for the tag | The server pulls by **tag**, not by digest, and the image is **not signed** (no cosign/Notation). An account takeover or registry compromise reaches every installation on the next pull | **H** |
| T | Malicious dependency or base image | Base image pinned by **digest** (`Dockerfile` `node:24.22.2-slim@sha256:…`); `npm ci` from lockfiles; `--omit=dev` in production; SBOM/CBOM in `sbom/`; conservative update policy (dependency-management skill) | `cloudflare/cloudflared:latest` and `mongo:8.0` float; `npm` postinstall scripts run at build (`--ignore-scripts` not set); no automated SBOM diff per release | M |
| T | Compromised third-party Action | Actions **SHA-pinned** as of this release (`checks.yml`, `develop.yml`, `release.yml`); minimal `permissions` | `rickstaa/action-create-tag` is a small third-party action with `contents: write` — replace with `git tag` + `git push` to drop the dependency | M |
| R | Who shipped what | Git tag per version, date-based version in root `package.json`, `APP_RELEASED` build arg, Buildx cache | No provenance attestation (SLSA) attached to the image | L |
| I | Secrets in logs or the image | Env-only configuration; `.env.sample` placeholders; no secrets in source (pentest) | Build logs on GitHub are public for a public repo: keep secret-handling out of `run:` echo lines | L |
| D | A broken release | `checks.yml` runs lint, unit, integration (mongodb-memory-server), OpenAPI lint, Playwright before any push; TEST stack runs `:develop` first | Rollback is "pin the previous `:<version>` tag" by hand | L |
| E | Developer laptop / dev DB with real accounts | Dev stack separate; the dev MongoDB holds real accounts and clubs (team memory) | Treat the dev DB as production data: no dumps in chat, no sharing of the volume | M |

## 6. Top risks and maintenance

The risks that matter, in order:

1. **Port 3001 reachable from the private network** (b): anyone on that path is a trusted proxy and can spoof `X-Forwarded-For`, defeating the per-IP limits and the sign-up guard. `APP_BIND=127.0.0.1` behind a proxy (added 2026-10-31); the default stays open for the plain `http://<server>:3001` setup.
2. **Backups unencrypted on the data volume** (e): one file holds the whole installation, including password hashes and pictures. Encrypt at rest and move them off-host.
3. **Image pulled by tag** (h): a registry or Docker Hub account compromise reaches every installation. Releases are signed with cosign and carry SBOM and provenance attestations since 2026-10-31 (`release.yml`); operators who want the guarantee verify before `pull` (`docs/deployment.md`) — most will not.
4. **MongoDB root user as the application user** (c): limit the blast radius of an API compromise with a `readWrite` user on the app database.
5. **STARTTLS to the mail provider** (d): now required by default (`SMTP_REQUIRE_TLS`, 2026-10-31); the residual risk is an operator turning it off.
6. **Mail-limit exhaustion** (d): an attacker can spend the day's mail budget so legitimate resets and invitations stop; reserve a share for credential mails.
7. **TLS policy unverified at the proxy** (a): the one open ASVS V12 item; check TLS 1.2+/1.3 and consider HSTS preload once stable.
8. **Oversized bodies** (b): JSON capped at 2 MB since 2026-10-31; multipart keeps its own limits.
9. **Floating `cloudflared:latest` and `mongo:8.0`, third-party tag action, npm install scripts** (h): the remaining supply-chain softness around an otherwise digest-pinned, SHA-pinned and signed build (Dependabot keeps the pins moving).
10. **The single-club authorisation model is the crown jewel** (g): `participatesInTournament` is the only cross-club widening; every future shared feature needs a line in table (g) and a regression probe on the isolated stack.

Secondary notes: `calendarToken` stored in clear; player pictures served to any logged-in user who knows the random filename; tournament reply tokens never expire; `ADMIN_EMAIL`/`ADMIN_PASSWORD` and `ADMIN_RESET_MFA` in the stack environment are standing credentials — remove them after first start (`src/utils/bootstrap.js` warns); `SESSION_SECRET` unset falls back to a per-start random secret (login survives no restart, but nothing is weakened).

### Maintaining this model

Update this document, in the same release, whenever:

- a **new trust boundary** appears (a new external service such as the HIBP range API, a push gateway, an object store for backups, a second container);
- a **new actor** appears (a new role, a new kind of link or token, a device that talks to the API);
- a **new external service** or protocol is used, or an existing one changes (mail provider, tunnel, registry);
- a boundary's **controls change** (new limiter numbers, new cookie flags, new middleware order in `app-api/index.js`), so the "existing control" column stays true;
- the pentest or an ASVS re-verification finds something this model missed — add the row, not just the fix.

This model is part of the ASVS verification: the owasp-asvs skill's
documentation requirements (each chapter's "record how a control was applied
and why") point here, and a re-verification starts by re-reading the tables
above against the code they cite. The pentest, dependency audit, CBOM and the
2026-10-30 ASVS L2 assessment are the prior evidence; this document lifts the
documentation to what L3 asks for.
