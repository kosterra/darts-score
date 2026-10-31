# Security

This page describes how authentication, authorisation, cryptography and the
HTTP hardening work. A point-in-time penetration test and its remediation are
recorded separately; the cryptographic inventory is the CBOM in
[`../sbom/darts-score.cbom.json`](../sbom/darts-score.cbom.json).

## Authentication

Credentials and sessions are handled in `app-api/src/utils/auth.utils.js`,
`sessions.js`, `mfa.js` and `passkeys.js`.

### Passwords

- Hashed with **scrypt** (Node's `crypto`). The stored format is versioned
  (`scrypt$N$r$p$salt$hash`, N = 2¹⁵, explicit `maxmem`); the earlier `salt:hash`
  format still verifies and is re-hashed to the current strength on the next
  successful login.
- Verified in constant time (`timingSafeEqual`); a 16-byte random salt per hash.
- Validation: 8–128 characters.

### Sessions

- A **signed, HTTP-only cookie** `ds_session` holds `{ uid, v, exp, sid }`,
  signed with `SESSION_SECRET` via cookie-parser. `SameSite=Lax`; `Secure` is set
  automatically when the request arrives over HTTPS (`X-Forwarded-Proto: https`).
- A matching **server-side session record** (`session` collection) lets a session
  be ended remotely (logout everywhere, or by a global admin). `requireAuth`
  checks the cookie signature, that the user is live and not blocked, that
  `sessionVersion` matches, and that the server record still exists.
- Bumping `user.sessionVersion` invalidates every existing session at once.
- Session timeout is configurable by global admins; a cookie is never honoured
  past the current timeout.

### Two-step login (TOTP)

- RFC 6238 TOTP via `otplib` (6 digits, 30 s step, ±1 window). Ten single-use
  recovery codes, stored only as SHA-256 hashes and compared in constant time.
- The authenticator **secret is encrypted at rest** with **AES-256-GCM**
  (random 96-bit IV, 128-bit tag). The AES key is derived from `MFA_KEY` with
  **HKDF-SHA-256**; secrets sealed with the earlier SHA-256(`MFA_KEY`) key, or
  (from before `MFA_KEY` was set) a key from `SESSION_SECRET`, still decrypt.
- Global admins can require two-step login (for admins, or for everyone after
  some days). `ADMIN_RESET_MFA=<email>` turns it off for one account at the next
  start (remove the variable afterwards).

### Passkeys (WebAuthn)

- `@simplewebauthn/server`; accepted algorithms ES256, EdDSA, RS256. Registration
  requires the password; `residentKey` and `userVerification` are **required**;
  attestation `none`. Only the **public key** is stored; the challenge waits in a
  short signed cookie (`ds_pk`). Passkeys belong to the `APP_URL` domain.

## Authorisation

Two things gate every scoped request: the session (who) and the `X-Club-Id`
header (which club). Roles are resolved per request, never trusted from the
client:

- **Global admin** — `user.role === 'globalAdmin'`; the only role for `/api/admin/*`.
- **Club admin** — in the club's `admins[]` (or a global admin); required for
  managing players, settings, deletes (`requireClubAdmin`).
- **Club player** — a `player` whose `user` links to the account; can play and
  read within the club, but not administer.

The guards and their failure codes are in [backend.md](backend.md). Cross-club
access, privilege escalation and the global-admin routes were explicitly tested
and are correctly denied; mass-assignment of privileged fields (`role`,
`admins`, `clubs`, `user`, `level`) is ignored.

## Input handling & injection

- Every mutating endpoint validates with **express-validator**; violations →
  `422 { errors: [] }`. This also blocks object-shaped input (NoSQL-injection
  attempts like `{$ne:null}`) because fields are constrained to strings/ids.
- Error responses are generic (`{ message }` / `{ errors }`); no stack traces or
  internal detail are leaked.

## File uploads

Profile pictures (`profileImg`) and club logos (`logo`), `multipart/form-data`:

- The image type is decided from the file's **own first bytes** (PNG/JPEG magic
  numbers), not the browser-supplied content-type.
- Stored under a **fresh random name with a forced `.png`/`.jpg` extension** —
  the uploaded filename and extension are discarded, so a script dressed as an
  image (e.g. an SVG sent as `image/png`) is refused and nothing is ever served
  back as anything but an image.
- Size is capped (5 MB). Serving (`player.img.routes.js`) uses `path.basename` +
  `dotfiles: deny` (no path traversal); club logos are public only for public
  clubs, player pictures need access to the club.

## HTTP hardening (helmet)

Set in `index.js`:

- **Content-Security-Policy** — `default-src 'self'`; `script-src 'self'` plus a
  **per-request nonce** (the one inline script in `index.html`, the no-flash
  theme, gets the nonce from the server renderer); `style-src 'self' 'unsafe-inline'`
  (React inline styles); `img-src 'self' data: blob:`; `object-src 'none'`;
  `frame-ancestors 'self'`; `base-uri`/`form-action 'self'`. Swagger (`/api-docs`)
  gets a looser CSP for its own inline scripts.
- `Strict-Transport-Security` (180 days), `X-Frame-Options: SAMEORIGIN`,
  `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`.
- `X-Powered-By` is removed.

TLS itself is terminated by the reverse proxy / Cloudflare Tunnel, not in the
app; confirm there that only TLS 1.2+/1.3 is offered.

## Rate limiting & abuse

- A generous global per-IP backstop (so a club on shared Wi-Fi is never caught).
- **Credential endpoints** (login, register, password reset, MFA, passkey) have a
  far stricter limiter (30 / 15 min).
- A per-network **sign-up spam guard** gates registration; abusive IPs are
  recorded in `blocked.ip`.

## Privacy

Nothing is public by default. Clubs are private until an admin makes them public;
players appear without their name ("Hidden player") unless their nickname is set
public; pictures, real names and email addresses are never on the public page.
Members can request deletion (`deletion.request`); removing a login anonymises
the player rather than erasing game history.

## Secrets & operational notes

- `SESSION_SECRET` and `MFA_KEY` are long-lived environment secrets. Rotating
  `SESSION_SECRET` logs everyone out; rotating `MFA_KEY` would invalidate stored
  two-step secrets except for the fallback decryption paths above. Keep them set
  and backed up.
- The installation self-check (global-admin overview) flags a missing `APP_URL`,
  `MFA_KEY` or `SESSION_SECRET`, mail problems, backup state, disk space and a
  missing privacy page.
- Dependency advisories are tracked via the SBOMs in [`../sbom/`](../sbom/);
  production ships no known-vulnerable packages at the time of writing.
