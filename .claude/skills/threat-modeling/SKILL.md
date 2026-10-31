---
name: threat-modeling
description: Maintain Legmate's STRIDE threat model (docs/threat-model.md) — the trust boundaries, actors and data flows, how to add or re-rate a threat when a feature crosses a boundary, and how the model feeds the OWASP ASVS verification. Use whenever the user asks for a threat model or STRIDE analysis, adds a new external service, actor, public page, cross-club feature or integration, or asks "what could go wrong" about a design.
---

# Threat modelling for Legmate

The model lives in [`docs/threat-model.md`](../../docs/threat-model.md): assets, actors, data
flows (one ASCII diagram), eight trust boundaries, one STRIDE table per boundary (threat →
example on this app → existing control with file → residual risk → priority), a top-10
and a maintenance note. ASVS L3 asks for a threat model; this is it, and the
[`owasp-asvs`](../owasp-asvs/SKILL.md) skill points at it for V1.

## The boundaries (keep these ids)

(a) Internet ↔ proxy/Cloudflare Tunnel · (b) proxy ↔ API container · (c) API ↔ MongoDB ·
(d) API ↔ mail provider (and HIBP range API) · (e) API ↔ file system (uploads, backups,
data volume) · (f) browser ↔ API on a shared or public link (evening links, TV screen,
public club page, quick games) · (g) club ↔ connected club (shared tournaments) ·
(h) developer/CI ↔ registry ↔ production.

## When to update

- A **new actor** (a role, an integration user, a webhook sender) → actors table + every
  boundary it touches.
- A **new external service** (payment, analytics, push, a second mail path) → new flow in
  the diagram, new or extended boundary, its STRIDE table.
- A **new public or shared surface** (a link without login, a widget, an export) → (f).
- **Anything that widens access across clubs** → (g): the only cross-club widening today
  is `utils/tournaments.js participatesInTournament` + `game.controller.js loadForRequest`;
  every new one is listed there and gets a regression test in `test/integration/`.
- A **changed control** (rate-limit numbers, cookie flags, CSP, helmet, compose
  hardening) → re-rate the rows that cite it; keep the file references current.
- After a **pentest or scan** → fold confirmed findings in as residual risk, and close
  rows the fix retired.

## How to add a threat (five minutes, not a workshop)

For the boundary, walk STRIDE: **S**poofing (who can pretend to be whom?), **T**ampering
(what data crosses, can it be altered in transit or at rest?), **R**epudiation (is the
action logged with who/when?), **I**nformation disclosure (what leaks if this hop is
read?), **D**enial of service (what breaks under a flood or a big payload?), **E**levation
(can a lower actor reach a higher one's rights?). For each real one write the row with the
concrete attack on *this* app, the control **as a file reference**, and a priority
H/M/L by impact × likelihood. Say "accepted" explicitly when nothing will be done and why.

## Reading the code for controls

- Sessions, cookies, MFA, passkeys: `app-api/src/utils/auth.utils.js`,
  `middleware/auth.middleware.js`, `controllers/{auth,mfa,passkey}.controller.js`.
- Authorisation: `middleware/auth.middleware.js getClubRole`, `utils/tournaments.js`,
  `utils/club.links.js`, every route file's middleware chain.
- Input and uploads: `utils/validation.js`, `validators/*.js`, the sanitiser middleware,
  `routes/player.img.routes.js`, multer limits in `admin.routes.js`.
- Headers, limits, proxy trust: `app-api/index.js` (helmet, `trust proxy`, body limits,
  global limiter), `routes/auth.routes.js` (`credentialLimiter`).
- Storage and files: `utils/backups.js`, `IMG_DIR`, `docker-compose.yml` volumes.
- Pipeline: `.github/workflows/*.yml`, `Dockerfile`, `.github/dependabot.yml`.

## Top risks as of 2026-10-31 (keep this list in sync with the document)

Port 3001 reachable from the private network with `trust proxy` on private ranges (now
`APP_BIND`) · backups unencrypted on the volume · the app logs into MongoDB as root ·
opportunistic STARTTLS (now `SMTP_REQUIRE_TLS`) · mail quota exhaustion blocks resets ·
30 MB JSON bodies (now 2 MB) · floating `mongo`/`cloudflared` tags · the single
cross-club widening · standing `ADMIN_*` credentials in the stack env · Swagger UI public.

## Output

Edit the document, not a new one; keep it under ~350 lines; British English; cite files.
Then tell the user which rows changed and whether a test or an ASVS row should follow.
