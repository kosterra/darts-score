# Privacy review (revDSG / GDPR)

A data-protection review of Legmate as shipped on `develop` (31 October 2026),
against the Swiss **revDSG** (in force since 1 September 2023) and, where an
installation has members in the EU/EEA, the **GDPR**. It describes what the
software does today, which duties fall on whoever runs an installation, and what
is still missing. It is not legal advice; an operator with doubts (a large club,
EU members, pictures of juniors) should have a lawyer read it.

Related: [data-model.md](data-model.md), [security.md](security.md) (Privacy
section), [operations.md](operations.md).

## 1. Roles

| Role | Who | Notes |
|------|-----|-------|
| **Controller** (Verantwortlicher) | The **operator of an installation** — the club, association or person whose global admins run it | Decides purposes and means: makes clubs public, enters legal settings, configures mail and backups, holds the database. Several clubs on one installation share one controller; a club admin acts for the controller. |
| **The Legmate project** | The software and its maintainers | Not a processor: it receives no data from any installation (no telemetry, no update check, no central service). It only has duties as a software supplier: privacy by design/default (revDSG Art. 7, GDPR Art. 25), which this document reviews. |
| **Processors** (Auftragsbearbeiter, GDPR Art. 28) an operator typically has | SMTP provider (`SMTP_*`), hosting/VPS or home server provider, **Cloudflare** when the Tunnel profile of [`docker-compose.yml`](../docker-compose.yml) is used (Cloudflare terminates TLS and sees request contents), optionally Portainer/backup storage | Each needs a processing agreement (Cloudflare and the large mail providers offer standard DPAs). Disclosure abroad (revDSG Art. 16 f., GDPR Ch. V): Cloudflare and US mail providers are covered by the Swiss–US/EU–US Data Privacy Framework if certified; otherwise standard contractual clauses. |
| **Data subjects** | Account holders, players with and without a login (including juniors), club admins, guests typed into a game, quick-game players, contact-form senders, global admins | |

A **club admin of another, connected club** who sees entrants of a shared
tournament is a separate controller only if the two clubs are separate legal
entities on the same installation; see §6.

## 2. Record of processing activities

A record (Verzeichnis der Bearbeitungstätigkeiten, revDSG Art. 12; GDPR Art.
30) is mandatory in Switzerland only for companies with 250+ employees (VDSG
Art. 24) and under the GDPR for most controllers that process regularly. The
rows below are a ready template for an operator to copy and complete.

Legal basis: the revDSG needs **no legal basis** for private controllers — the
processing principles (Art. 6: lawfulness, good faith, proportionality, purpose
limitation, accuracy) and the information duty (Art. 19) apply; a justification
(Art. 31) is only needed when a processing violates personality rights, e.g.
against the express wish of the person. The GDPR column gives the Art. 6 basis.

| # | Activity | Purpose | Data categories | Data subjects | Recipients | Retention | GDPR basis | Code |
|---|----------|---------|-----------------|---------------|------------|-----------|------------|------|
| 1 | **Account management** | Login, security, personal settings | Email, name, password hash (scrypt), language, start page, game and notification preferences, onboarding flags, last login, blocked flag/reason, MFA secret (encrypted) and recovery-code hashes, passkey public keys, reset-token hash, calendar token | Account holders | Global admins (all accounts, last login, open sessions); club admins see the email of linked players | Until the account is deleted (§3) | 6(1)(b) contract | [`models/user.model.js`](../app-api/src/models/user.model.js), [`models/session.model.js`](../app-api/src/models/session.model.js), `utils/auth.utils.js` |
| 2 | **Playing and statistics** | Keeping score, statistics, levels, badges, Hall of Shame, handicaps by age | Player nickname, first/last name, picture, country, **date of birth** (and its change history), club memberships, games/trainings with every dart thrown, attendance, badges, shame entries, preferences, private-trainings flag | Players (members, juniors, guests), linked accounts | Members of the same club (trainings only if not private); club and global admins; connected clubs for shared tournaments (§6) | Until the player is deleted by a club admin or the club is deleted; anonymised when the linked account goes | 6(1)(b) for the member, 6(1)(f) legitimate interest of the club for players added by admins | [`models/player.model.js`](../app-api/src/models/player.model.js), game models, [`utils/training.privacy.js`](../app-api/src/utils/training.privacy.js), [`utils/birth.rules.js`](../app-api/src/utils/birth.rules.js) |
| 3 | **Club administration** | Membership, join requests, player invitations and claims, game-deletion requests, integrity reviews, club connections | Names, nicknames, free-text messages (join request, deletion reason, review reason), who decided what and when; email of a player without login **with recorded consent** (`consentBy`, `consentAt`) | Members, applicants, admins | Club admins; the two clubs of a connection (admin names) | Join requests go with the account; deletion requests/reviews stay with names replaced by "Former member"; player contacts go with the player | 6(1)(b), 6(1)(a) consent for `player.contact` | [`models/join.request.model.js`](../app-api/src/models/join.request.model.js), [`models/player.contact.model.js`](../app-api/src/models/player.contact.model.js), [`models/deletion.request.model.js`](../app-api/src/models/deletion.request.model.js), [`models/club.link.model.js`](../app-api/src/models/club.link.model.js) |
| 4 | **Notifications and mail** | Telling people what happened; security notices; summaries | Notification title/body (names), read state, mail choice; 18 mail templates: password reset, admin/player added or invited, notification, daily digest, weekly summary, tournament invite/reminder, usage report, club summary, password/email changed, account blocked, security notice, news for a player without login, contact message | Account holders, players without login (only the five `CONTACT_TOPICS`), global admins | SMTP provider | In-app notifications **365 days** (TTL); dedup keys 90 days | 6(1)(b); security topic is locked (cannot be turned off) — 6(1)(f) | [`models/notification.model.js`](../app-api/src/models/notification.model.js), [`utils/mail.templates.js`](../app-api/src/utils/mail.templates.js), [`rules/notifications.js`](../app-api/src/rules/notifications.js) |
| 5 | **Public pages and shared links** | Public start page of clubs that opt in; links to follow a game, a darts evening or a calendar | Club name/logo; live games and results with the **nickname only when `publicProfile` is set**, otherwise "Hidden player"; never names, pictures, emails. Evening share link: names typed in and games. Screen token: one game. iCal feed: calendar of the person's clubs | Players of public clubs, quick-game/evening players | Anyone on the internet (public page); anyone with the link (tokens) | As the underlying data; quick games/evenings **30 days** | 6(1)(f) with the opt-in of the club and the player; 6(1)(a) for the nickname | [`controllers/public.controller.js`](../app-api/src/controllers/public.controller.js), [`routes/evening.routes.js`](../app-api/src/routes/evening.routes.js), [`routes/screen.routes.js`](../app-api/src/routes/screen.routes.js), [`controllers/calendar.controller.js`](../app-api/src/controllers/calendar.controller.js) |
| 6 | **Contact form** | A message to the operator | Name, email, message | Anyone | The operator's mailbox via SMTP | **Nothing is stored**; only the mail exists | 6(1)(b)/(f) | [`utils/contact.js`](../app-api/src/utils/contact.js) |
| 7 | **Security and abuse protection** | Rate limits, sign-up spam guard, alerts, blocked IPs, error log | IP address, email in alert messages, user/club references, rule, action; error log entries with message, stack and free `context` | Anyone sending requests; registrants | Global admins | Alerts: **no expiry**, until resolved/removed; blocked IPs: until `until` (or forever when none); error log **30 days** (`LOG_RETENTION_DAYS`); rate-limit counters in memory only | 6(1)(f) | [`utils/spam.guard.js`](../app-api/src/utils/spam.guard.js), [`models/alert.model.js`](../app-api/src/models/alert.model.js), [`models/blocked.ip.model.js`](../app-api/src/models/blocked.ip.model.js), [`models/log.entry.model.js`](../app-api/src/models/log.entry.model.js), [`utils/error.log.js`](../app-api/src/utils/error.log.js) |
| 8 | **Usage statistics** | Admin insights, weekly usage report | Per day: the ids of accounts that used the app, login count, mail counts | Account holders | Global admins (numbers only in the report) | **190 days** (`USAGE_KEEP_DAYS`) | 6(1)(f) | [`models/usage.day.model.js`](../app-api/src/models/usage.day.model.js), [`utils/usage.stats.js`](../app-api/src/utils/usage.stats.js) |
| 9 | **Backups** | Restoring after loss | The whole database **and the uploaded pictures**, gzipped JSON lines, unencrypted | Everyone in the database | Global admins (download, upload, restore); the host's disk | Newest `keep` automatic backups (1–60, default 7, daily or weekly) | 6(1)(c)/(f) | [`utils/backups.js`](../app-api/src/utils/backups.js) |
| 10 | **Support / admin access** | Looking after the installation | Global admins list all accounts (email, last login), sessions (device string), players, games and trainings of all clubs, quick games with names, and can "visit" any club with admin rights | Everyone | Global admins | — | 6(1)(f) | [`routes/admin.routes.js`](../app-api/src/routes/admin.routes.js), `controllers/admin.controller.js` (`visitClub`), [`utils/sessions.js`](../app-api/src/utils/sessions.js) |

## 3. Retention and deletion concept

### Retention periods found in code

| What | Period | Mechanism | Constant / file |
|------|--------|-----------|-----------------|
| Login session (`ds_session`, server record) | 1–24 h, default **5 h**, set by global admins; cookie never honoured beyond the timeout | Mongo TTL on `expiresAt`; signed cookie `maxAge` | `SESSION_HOURS` in [`utils/session.settings.js`](../app-api/src/utils/session.settings.js) |
| Pending two-step login cookie `ds_mfa` | 5 min | cookie `maxAge` | `utils/auth.utils.js` |
| Trusted device cookie `ds_trust` | 30 days, only if chosen | cookie `maxAge` | `utils/auth.utils.js` |
| Passkey challenge cookie `ds_pk` | minutes | cookie `maxAge` | `utils/passkeys.js` |
| Error log entries | **30 days** | TTL | `LOG_RETENTION_DAYS`, [`models/log.entry.model.js`](../app-api/src/models/log.entry.model.js) |
| Usage days | **190 days** | TTL | `USAGE_KEEP_DAYS`, [`models/usage.day.model.js`](../app-api/src/models/usage.day.model.js) |
| In-app notifications | **365 days** | TTL | [`models/notification.model.js`](../app-api/src/models/notification.model.js) |
| Notice-sent dedup keys | 90 days | TTL | [`models/notice.sent.model.js`](../app-api/src/models/notice.sent.model.js) |
| Quick games and darts evenings | **30 days**; an unfinished quick game 3 days after its last visit | TTL | `QUICK_KEEP_DAYS`, `QUICK_UNFINISHED_DAYS`, [`utils/quick.games.js`](../app-api/src/utils/quick.games.js) |
| Fair-play hits | 31 days | TTL | [`models/fair.play.hit.model.js`](../app-api/src/models/fair.play.hit.model.js) |
| Player claim links | until `expiresAt` (30 days) | TTL | [`models/player.claim.model.js`](../app-api/src/models/player.claim.model.js) |
| Screen pairings | until `expiresAt` | TTL | [`models/screen.pairing.model.js`](../app-api/src/models/screen.pairing.model.js) |
| Blocked IPs | until `until`; **indefinitely** when blocked without an end | TTL on `until` | [`models/blocked.ip.model.js`](../app-api/src/models/blocked.ip.model.js) |
| Alerts, join/deletion requests, integrity reviews, club links | **no expiry** | manual | respective models |
| Accounts, players, clubs, games | **no expiry**; until deleted by the person or an admin | manual | — |
| Backups | newest `keep` (default 7) automatic backups; manual ones are not pruned | `pruneBackups` | `SCHEDULE_DEFAULTS`, `KEEP_RANGE` in [`utils/backups.js`](../app-api/src/utils/backups.js) |
| Container stdout logs (pino) | Docker default `json-file` without rotation: **unbounded** | none in `docker-compose.yml` | — |

### What deleting an account does (`deleteMe` → `deleteAccount`)

[`controllers/auth.controller.js`](../app-api/src/controllers/auth.controller.js)
re-checks the password (and a two-step code), refuses while the person is the
only global admin, and requires every club of which they are the sole admin to
be handed over or deleted first (`soleAdminClubs`, `carryOutSteps`). Then
[`utils/account.deletion.js`](../app-api/src/utils/account.deletion.js):

| Step | Data | Result |
|------|------|--------|
| 1 | Each linked player | **Anonymised**, not deleted: nickname → `Anon XXXX`, names → that, picture file removed if unused, date of birth, country, birth-change history cleared, `user` unlinked, becomes a `guest` (not listed, not pickable), `publicProfile` off, `anonymizedAt` set |
| 2 | Copies of the player's nickname | Replaced in ATC and rules trainings, club badges and goals, deletion-request entries; the name and nickname replaced in the text of notifications of the player's clubs |
| 3 | `player.contact`, `player.claim` of the player | Deleted |
| 4 | Admin memberships, notifications for the user, sessions, open join requests | Removed/deleted |
| 5 | Deletion requests, join requests, integrity reviews, notifications *by* the user | Kept with `byName` → "Former member" |
| 6 | Alerts about the user | Kept, `userEmail` cleared |
| 7 | The `user` document | Deleted; a last security mail confirms it |

**What stays, and why:** every game, training, tournament and league the
player took part in, referenced by the anonymised player id, so the opponents'
statistics, records and head-to-heads stay whole. This is a legitimate interest
of the other members (GDPR Art. 17(3) does not apply directly; Art. 6(1)(f)
plus anonymisation does); the game data of an anonymised player is still
personal data for whoever can re-identify them (teammates remember who
"Anon 3F2A" was), so it should be described as pseudonymised, not anonymous.
Also staying: free texts the person wrote (join-request message is deleted,
but a deletion reason or review reason is kept), alert *messages* that quote
an email (`Registration of x@y …`), usage-day arrays with the user id (up to
190 days), and the `by` ObjectId in requests and notifications.

An **admin-initiated** deletion (`UserController.remove`) uses the same routine.
A club admin deleting a **player** hard-deletes the player document (its games
then reference an id that no longer resolves). Deleting a **club**
([`utils/club.deletion.js`](../app-api/src/utils/club.deletion.js)) deletes the
players who were only in that club, their contacts, and every game and
competition of the club.

### Backups

A backup contains everything, including pictures. A deleted record therefore
survives for up to `keep × frequency` (default 7 days; worst case 60 weekly
backups ≈ 14 months). Backups are not encrypted and are downloadable by global
admins. This is acceptable under both laws if the retention is documented and a
restore re-applies deletions — there is no mechanism for the latter today.

### Missing

- No **inactive-account expiry** (`lastLoginAt` is only shown to global admins).
- No **data export** for a person or a club (§4).
- Alerts, blocked IPs without end date, and admin-side requests have **no
  retention limit**; alert messages keep email addresses of rejected sign-ups.
- Error-log `context` is stored as logged, without scrubbing; whatever a
  `logger.warn/error` call passes (occasionally emails, tokens in URLs) is kept
  30 days and shown to global admins.
- Container stdout logs have no rotation in `docker-compose.yml`.
- Backups: no encryption, no note of a deletion to replay after a restore.

## 4. Data subject rights

| Right | revDSG / GDPR | Today | Gap |
|-------|---------------|-------|-----|
| **Access / export** | Art. 25 revDSG; Art. 15 and 20 GDPR (portability) | The person sees their profile, statistics and games in the app. **No export** (no "download my data", no club export). An operator answers a request by hand (database query). | Add a JSON export of the account, its players and their games; a club export for admins. 30-day deadline in both laws. |
| **Rectification** | Art. 32 revDSG; Art. 16 GDPR | Name, email, language, preferences editable by the person; nickname, picture, country by the person or club admin; **date of birth** of a minor only by a club admin (`birth.rules.js`), of an adult by themselves with history kept | Fine. Mention in the privacy page that admins correct a junior's date of birth. |
| **Erasure** | Art. 32 revDSG; Art. 17 GDPR | Self-service under Profile → Account, with password and two-step code; admin deletion; game deletion by request with the agreement of all players; player deletion by club admin | Residual data in §3; backups. Document the backup survival time on the privacy page. |
| **Objection / restriction** | Art. 30 f. revDSG; Art. 18, 21 GDPR | Per-topic notification settings (in-app and mail), every mail carries an unsubscribe link (`notify.js`), players without login unsubscribe with one click and `unsubscribedAt` is kept; `privateTrainings` hides trainings; `publicProfile` controls the public nickname; security notices cannot be turned off (justified) | Players cannot object to appearing in the public results of a public club other than by staying "Hidden player" — fine, but state it. No way for a player to refuse being entered into a shared tournament other than answering "out". |
| **Complaint** | FDPIC; EU authorities | Named on the privacy page | — |

## 5. Transparency

**The privacy page** ([`app-ui/src/components/legal/_privacy.page.jsx`](../app-ui/src/components/legal/_privacy.page.jsx),
data from `GET /api/public/legal` via [`utils/legal.settings.js`](../app-api/src/utils/legal.settings.js))
is public, linked from the footer of the public pages and About, and in the
five languages. It states: who is responsible (operator), what is stored and
why (account, players incl. date of birth and children, clubs, calendar and
secret feed link, players without login, quick games, contact form, IP for
protection), cookies and local storage, recipients (mail server, hosting,
donation links), how long (with the live constants `keep.*`), and the rights
(profile, delete account, write to the operator, FDPIC/EU authority). The
imprint shows the same operator block.

**What the operator must fill in** (System settings → Privacy and imprint):
`operator` (200 chars), `address` (500), `email` (254), `notes` per language
(2000). The installation self-check warns while the page is empty. The notes
are the only place for operator-specific recipients (hosting provider,
Cloudflare, mail provider) and for a DPO/representative.

**Cookies:** only functional, first-party, signed `HttpOnly` cookies
(`ds_session`, `ds_mfa`, `ds_trust`, `ds_pk`), `SameSite=Lax`, `Secure` behind
HTTPS. No analytics, no third-party scripts, fonts and icons self-hosted; the
only external URLs in the UI are outbound links (donation pages, Google
Calendar help, AGPL licence). Local storage holds language, theme, chosen club,
list filters, the quick-game key and unsent games. No consent banner is needed
under either law for this set.

**Still to state on the page:** that club admins see the email of linked
players and that global admins can open any club; what a connected club sees in
a shared tournament (§6); that deleted data survives in backups for the
configured period; that the game history of a deleted account stays
pseudonymised; that alerts keep IP addresses until resolved; the retention of
container logs; contact details of a DPO/EU representative where required
(GDPR Art. 27 for a Swiss operator with EU members — usually not, as clubs are
occasional and small).

## 6. Minors, pictures, club connections

**Minors.** Darts clubs have juniors; the data model is built for it: the date
of birth is required for members, set by club admins, and used for age
handicaps and to keep children (under `shameMinAge`, default 16, range 6–21)
out of the Hall of Shame. Under 18 a player cannot change their own date of
birth. There is **no minimum age for creating an account** and no parental
consent record. Under the revDSG the test is capacity of judgement
(Urteilsfähigkeit), usually assumed from about 12–14 for such a service; under
the GDPR Art. 8 the age of digital consent is 16 (13–16 by member state) for
services offered to a child on the basis of consent. Recommendation: the club,
not the software, obtains parental consent when it enters a junior and their
picture; the operator should say so in the notes; an optional "junior" flag
that hides the picture and real name from other members would be a stronger
default.

**Pictures of players.** PNG/JPEG only, magic-byte checked, size-limited
([`controllers/file.controller.js`](../app-api/src/controllers/file.controller.js));
never on the public page; removed on account deletion when unused; included in
backups. A picture is a personal datum, not a sensitive one, but uploading it
needs the player's agreement (and a parent's for a junior). The upload by a
club admin records **no consent**; the pictures are visible to members of all
the player's clubs and to connected clubs in shared tournaments.

**Club connections** ([`utils/club.links.js`](../app-api/src/utils/club.links.js)):
a connection grants no access to the other club's players, games or
statistics. In a **shared tournament** the view
([`utils/tournaments.js`](../app-api/src/utils/tournaments.js), the view builder)
exposes to every participating club's members each entrant's nickname,
**first and last name, picture**, country, shirt and best level, plus club
names and logos. That is a disclosure to another controller when the clubs are
separate bodies. The player is invited by their own club's admin and can answer
"out"; they are not told beforehand that their name and picture travel to the
other club, and there is no per-player opt-out of the disclosure. Recommendation:
show nickname and picture only to the other club (names only to the player's own
club admins), say so in the invitation, and mention it on the privacy page.

## 7. Gaps and recommendations (prioritised)

| Prio | Gap | Recommendation |
|------|-----|----------------|
| 1 | No data export (access/portability, 30-day deadline) | `GET /api/users/me/export`: account, players, games, trainings, badges, notifications as JSON; a club export for admins (players, games) later. |
| 1 | Shared tournaments disclose real names and pictures to connected clubs | Strip `firstname`/`lastname` for viewers of another club; add one sentence to the tournament invitation and to the privacy page. |
| 1 | Privacy page silent on admin visibility, backups, pseudonymised history, log retention | Extend the fixed text (five languages) with §5 "still to state". |
| 2 | Alerts, blocked IPs and alert messages with emails never expire | TTL of e.g. 180 days on resolved alerts; `until` default (e.g. 30 days) for rule blocks; drop the email from the alert message once `userEmail` is cleared. |
| 2 | Container logs unbounded | `logging: { driver: json-file, options: { max-size: 10m, max-file: "5" } }` in `docker-compose.yml`; a line in operations.md. |
| 2 | Error-log `context` unscrubbed | Redact `email`, `token`, `password`, `authorization` keys in `toLogEntry`; cap context size. |
| 2 | No consent record for pictures and for juniors | Store `consentBy/consentAt` on picture upload by an admin (as `player.contact` already does); a "parental consent confirmed" checkbox when adding a player under 16. |
| 3 | Backups unencrypted, deletions not replayed after a restore | Document the survival time on the privacy page; optionally encrypt backups with a key in the environment; keep a 90-day list of deleted account ids and anonymise them again after a restore. |
| 3 | No inactive-account handling | Optional policy: warn after 24 months without login, delete after 30 months; defaults off, set by global admins. |
| 3 | Free texts and `by` ids of a deleted user linger | Clear `reason`/`note` fields authored by the user or replace with "Former member" like the names. |
| 3 | Player hard-deleted by a club admin leaves dangling ids in games | Anonymise instead of deleting when the player has games (reuse `anonymisePlayer`). |
| 3 | No breach procedure | A short section in operations.md: what counts, who tells the FDPIC (revDSG Art. 24, only if high risk) or the EU authority within 72 h (GDPR Art. 33), what to tell members. |
| 3 | Processor list lives only in the operator's free-text notes | Structured fields for hosting provider and mail provider on the legal settings, rendered under "Who else receives data". |
