---
name: privacy-review
description: Review and maintain Legmate's data-protection posture under the Swiss revDSG and the GDPR — the record of processing activities, retention periods and where they live in code, the deletion and anonymisation concept, data subject rights, the privacy page, consent for pictures and juniors, and what connected clubs see (docs/privacy-review.md). Use whenever the user asks about privacy, DSG/DSGVO/GDPR, retention, deletion, data export, a privacy policy or imprint, consent, or adds a field, log, export or integration that holds personal data.
---

# Privacy review for Legmate

The review lives in [`docs/privacy-review.md`](../../docs/privacy-review.md): roles
(the operator of an installation is the controller; the project is software, not a
processor), the record of processing activities, the retention and deletion concept, data
subject rights, transparency, minors and pictures, connected clubs, and a prioritised gap
list. It is not legal advice; it tells an operator what the software does so they can
write their own notice (System settings → Privacy and imprint).

## Where the facts come from (check these when something changes)

| Fact | Where |
|---|---|
| Personal data stored | `app-api/src/models/*.model.js` (user, player, session, alert, log.entry, usage.day, notification, …) |
| Session lifetime, trusted devices, pending MFA | `utils/session.settings.js` (SESSION_HOURS, default 5 h), `auth.utils.js` (`ds_trust` 30 d, `ds_mfa` 5/15 min) |
| Error logs | `models/log.entry.model.js` LOG_RETENTION_DAYS (30) |
| Usage statistics | `models/usage.day.model.js` USAGE_KEEP_DAYS (190) |
| Quick games | `utils/quick.games.js` QUICK_KEEP_DAYS (30), QUICK_UNFINISHED_DAYS (3) |
| Notifications | 365 d; sent notices 90 d; fair-play hits 31 d; claim links 30 d |
| Backups | `utils/backups.js` keep 1–60 (default 7), plaintext gzip incl. pictures |
| Account deletion | `controllers/auth.controller.js deletionSteps/deleteMe`, the anonymisation util (grep `anonymis`) |
| Legal page and operator | `utils/legal.settings.js`, `app-ui/src/components/legal/_privacy.page.jsx` |
| Cross-club visibility | `utils/tournaments.js` (entrant name, picture, country, shirt, level), `utils/club.links.js` |
| Public surface | `routes/public.routes.js`, screen/TV routes, shared evening links |

## When to update the review

A new model field with personal data; a new log or export; a new external recipient
(mail provider, Cloudflare, analytics, push); a new public or shared page; a change to a
retention constant; a change to what deletion removes; a new role that sees more.

## Checks to run

1. **Retention**: every constant above still matches the table in §3; a new collection has
   a TTL index or a cleanup job (grep `expireAfterSeconds` and the scheduled jobs).
2. **Deletion**: `deleteMe` still anonymises games rather than orphaning them; club-admin
   player deletion (hard delete) leaves no dangling ids — or is documented; deletions are
   not undone by a restore (document that they must be replayed).
3. **Transparency**: the privacy page states what club admins, connected clubs and global
   admins can see, how long backups keep data, and that deleted accounts stay
   pseudonymised in game history.
4. **Rights**: access/export is answerable (today by hand — a "download my data" export is
   the top gap), rectification via profile, erasure via delete-account, objection via
   notification settings.
5. **Pictures and juniors**: uploads by admins need the player's consent recorded;
   `player.contact` has `consentBy/consentAt` — use it, and consider an age gate.
6. **Logs**: alerts, blocked IPs, join and deletion requests, integrity reviews need a
   retention limit; `utils/error.log.js` context should be scrubbed of emails/tokens;
   compose should set Docker log rotation (`logging: options: max-size`).

## Gap list (2026-10-31, by priority)

1. No data export (self-service or per club). 2. Connected-club visibility without telling
the player. 3. Privacy page silent on admin/visit access, backup survival, pseudonymised
history. 4. Alerts and requests without retention; alert messages keep emails. 5. No Docker
log rotation; unscrubbed error context. 6. No consent record for pictures or juniors.
7. Plaintext backups up to ~14 months of survival; no inactive-account expiry; no breach
procedure written down. Close one, move the list.

## Output

Edit `docs/privacy-review.md` in place (British English, tables, cite files), keep it
under ~300 lines, and say what changed and which operator-facing text needs updating.
