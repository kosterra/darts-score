# Data model

One MongoDB database (default `darts_score`). Models live in
[`app-api/src/models`](../app-api/src/models); each exports a Mongoose model and
is registered on the `db` singleton (`models/db.model.js`). Schema and data
changes are applied by startup migrations (see [backend.md](backend.md)).

## The core entities

```
 user ──────────────┐ (admins)        ┌────────── player
   │ role            │                 │  nickname, names, dateOfBirth
   │ passwordHash    ▼                 │  profileImg, level, bestLevel
   │ mfa, passkeys  club ◄── clubs ────┤  preferences (flights, shirt)
   │ defaultClub     │  name, isPublic │  guest flag
   └─ user ◄─ (link) │  joinPolicy     └─ user  (optional login link)
                     │  admins[]
                     │  calendar.nights / cancelled
                     │  dashboardLayout / widgets
                     │  badges[], goals[]
                     ▼
         games, trainings, tournaments, leagues, attendance
         (each references club + player ids)
```

### `user` — an account

A person who logs in. One account can play and administer across several clubs.

| Field | Meaning |
|-------|---------|
| `email` (unique) | login identity |
| `passwordHash` | scrypt hash, versioned format (see [security.md](security.md)) |
| `firstname`, `lastname` | the person's name |
| `role` | `user` or `globalAdmin` (installation-wide admin) |
| `defaultClub` | the club selected after login |
| `sessionVersion` | bumped to invalidate all existing sessions |
| `mfa` | two-step login: encrypted secret, recovery-code hashes, trust salt |
| `passkeyUserId`, `passkeys[]` | WebAuthn credentials (public keys only) |
| `blockedAt`, `blockedReason` | a blocked account cannot log in |
| `calendarToken` | token for the personal iCal feed |
| `gamePreferences` | how the person likes to play; drives the personal dashboard |

A user's **role in a club** is not stored on the user — it is derived per
request: a global admin or a member of the club's `admins[]` is an admin; a
`player` whose `user` field links to this account is a player; otherwise no
access. See `getClubRole` in the auth middleware.

### `club` — a club, team, or group

The container for players, games and everything scoped to it.

| Field | Meaning |
|-------|---------|
| `name` | the club's name |
| `admins[]` → `user` | who administers it (several allowed) |
| `adminSince[]` | when each admin was added |
| `isPublic`, `publicLiveGames`, `publicResults` | what shows on the public start page |
| `joinPolicy` | `open` / `approval` / `closed` |
| `calendar.nights`, `calendar.cancelled` | recurring club nights and cancellations |
| `dashboardLayout`, `dashboardWidgets` | the club dashboard arrangement (per club, for everyone) |
| `badges[]`, `goals[]` | club-wide badges earned together, and goals |

### `player` — someone who plays in a club

Players exist **without** an account; a club admin may link one via `user`.

| Field | Meaning |
|-------|---------|
| `firstname`, `lastname`, `nickname` | identity (nickname shown; names private) |
| `dateOfBirth` | required for members (fair-play age handling) |
| `profileImg` | stored image filename (served via `/api/images/players/...`) |
| `clubs[]` → `club`, `formerClubs[]` | the clubs this player belongs to / has left |
| `user` → `user` | the linked login account, if any |
| `guest` | a guest added for a single game; not a member |
| `level`, `bestLevel` | the player's current and best level |
| `preferences` | flight colour/shape/design, barrel, favourite double, main treble, shirt |
| `publicProfile` | whether the nickname is shown publicly |

## Games & training

Each game type has its own collection and its own scoring model, all scoped to a
club and referencing player ids:

| Model | Game |
|-------|------|
| `x01` | X01 (101–1001, sets/legs, in/out modes) — also reused for the X01 training (`x01training`) |
| `cricket` | Cricket |
| `elimination` | Elimination |
| `clock` | Around the Clock |
| `atc` | Around-the-Clock training entries |
| `rules.game`, `rules.training` | the "more games" (Shanghai, Killer, Halve-It, Golf, Tactics) and their trainings |
| `quick.game` | an account-less quick game (kept ~30 days) |
| `quick.evening` | an account-less darts evening (several games, a table, awards) |

Scoring and win logic are computed by the matching file in `src/rules` (see
[backend.md](backend.md)). Statistics are derived (not stored twice) from the
games via the stats models and `utils` helpers.

## Competitions & calendar

| Model | Purpose |
|-------|---------|
| `tournament` | knockout tournaments (8–64 players): entries, draw, bracket, per-round rules |
| `league` | round-robin leagues: players, meetings, matchdays, per-match rules |
| `attendance` | who attends club nights / league matchdays |
| `club.tally` | per-game roll-up added to a club (winner, friendly flag, 180s) for ratings and head-to-head |

A tournament match is itself an X01 game; the calendar
(`rules/calendar.js`) combines club nights, league matchdays and tournament
rounds into events, also exposed as an iCal feed.

## Accounts, membership & lifecycle

| Model | Purpose |
|-------|---------|
| `session` | server-side session records (so a session can be ended remotely) |
| `join.request` | a request to join a club with `approval` policy |
| `player.claim` | a token link to claim an existing player as your account |
| `player.contact` | a player's contact details (admin-only), for invitations |
| `deletion.request` | a member's request to have their data removed |
| `notice.sent` | which notifications/digests were already sent (dedup) |
| `notification` | the in-app notifications |

## Fair play, moderation & operations

| Model | Purpose |
|-------|---------|
| `fair.play.hit` | a flagged, impossible-to-throw score caught during a game |
| `integrity.review` | a game under review (entered by mistake, disputed) |
| `blocked.ip` | IPs blocked by the spam/abuse guard |
| `alert` | operational alerts surfaced to global admins |
| `log.entry` | the global-admin error log |
| `usage.day` | per-day usage counters for the admin insights |
| `setting` | installation-wide settings (start page, privacy, support, backups, …) |
| `screen.pairing` | pairing tokens for the Caller/Big-screen companion views |

## Notes

- **Soft references.** Games store player ids; a player is never hard-deleted in
  a way that corrupts history — removing a login anonymises rather than erases.
- **Indexes.** `user.email` is unique; `club.admins`, `user.calendarToken` and
  others are indexed for the per-club and feed lookups.
- **The database is the source of truth; images are not in it** — they live on
  the `/app/data` volume and are referenced by filename.
