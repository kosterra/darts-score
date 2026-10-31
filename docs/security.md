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
- **Breached passwords are refused** (ASVS V6) at registration, password change,
  password reset and when an admin sets or gives an initial password
  (`utils/breached.password.js`). The check asks Have I Been Pwned's Pwned
  Passwords range API with only the first five hex characters of the password's
  SHA-1 (k-anonymity) and with padding, so neither the password nor its full hash
  leaves the server. It fails open: when the API is slow (3 s), unreachable or
  errors, the password is accepted and a warning is logged once.
  `BREACHED_PASSWORD_CHECK=off` turns it off.

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
  recovery codes (8 characters from a 31-letter alphabet, about 40 bits), stored
  only as SHA-256 hashes and compared in constant time. A code is used up in
  **one database step** (`claimStep`, `takeRecoveryCode` in `utils/mfa.js`:
  a conditional `updateOne`), so the same code sent twice at the same time
  counts once. Using a recovery code mails the owner how many are left.
- **Pending state**: after the password, a signed cookie `ds_mfa`
  `{ uid, v, step, exp }` (5 minutes; 15 while setting it up as part of a login)
  marks the login as waiting for its code. It is a cookie of its own: `requireAuth`
  reads only `ds_session`, so nothing of the API can be used half logged in. Wrong
  codes are counted per account (5 in 5 minutes, then a wait).
- **Trusted devices**: with "do not ask again on this device" the second step is
  skipped for 30 days by a signed cookie `ds_trust` `{ uid, t, exp }`, where `t` is
  a random value of the account (`mfa.trustSalt`). A new value forgets every
  trusted device at once: "Forget trusted devices" on the profile, turning two-step
  login off, an admin reset — and **every new password** (changed, reset by link,
  or set by an admin), so a password alone never keeps a device trusted.
- **What needs the second factor besides logging in** (a code of the app or a
  recovery code, after the password): turning two-step login off, new recovery
  codes, deleting the account, **changing the email address** (the address a new
  password would be sent to) and **adding a passkey** (which would skip the code
  from then on). Removing a passkey needs the password.
- The authenticator **secret is encrypted at rest** with **AES-256-GCM**
  (random 96-bit IV, 128-bit tag). The AES key is derived from `MFA_KEY` with
  **HKDF-SHA-256**; secrets sealed with the earlier SHA-256(`MFA_KEY`) key, or
  (from before `MFA_KEY` was set) a key from `SESSION_SECRET`, still decrypt.
- Global admins can require two-step login (for admins, or for everyone after
  some days). `ADMIN_RESET_MFA=<email>` turns it off for one account at the next
  start (remove the variable afterwards).

### Passkeys (WebAuthn)

- `@simplewebauthn/server`; accepted algorithms ES256, EdDSA, RS256. Registration
  requires the password (and the code when two-step login is on); `residentKey`
  and `userVerification` are **required**; attestation `none`. Only the **public
  key** is stored, with the signature counter (a counter that does not grow is
  refused). The challenge waits in a short signed cookie (`ds_pk`, 5 minutes) and
  is **single-use on the server** too (`takeChallenge` in `utils/passkeys.js`
  remembers the challenges answered until they would have run out), so a kept
  cookie and answer cannot be sent again. Passkeys belong to the `APP_URL` domain
  (RP ID and origin come from the configuration, never from the request).
- A passkey login **skips the TOTP step by design**: the passkey is two factors by
  itself (the device, and its fingerprint, face or PIN), and it is phishing-resistant,
  which the password plus TOTP is not. That is why adding one is guarded like
  turning two-step login off.
- A blocked account gets no session by any way in (`startSession`), no reset link,
  and no new password by a link it already has.

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
  clubs, player pictures need a login (their names are random UUIDs, handed out only
  with the players one may see; there is no per-club check on the file itself).

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

## Reporting, and the pipeline

- `/.well-known/security.txt` (RFC 9116) is generated by the API: the operator's address
  from the legal settings when set, always the project's private advisory form, the policy
  in `SECURITY.md`, a rolling `Expires` of 90 days (`src/utils/security.txt.js`).
- The release image is signed (Sigstore, keyless) and carries SBOM and provenance
  attestations; the Actions are SHA-pinned and kept by Dependabot; the base image is
  pinned by digest. See [deployment](deployment.md).
- The containers run read-only, without capabilities and with `no-new-privileges`
  (`docker-compose.yml`); `APP_BIND=127.0.0.1` keeps the port off the network behind a
  proxy. JSON bodies are capped at 2 MB; mail insists on STARTTLS (`SMTP_REQUIRE_TLS`).
- The git history was scanned for secrets (2026-10-31): no credential of a real system was
  ever committed; the only hits were the sample `.env` placeholders and test fixtures. The
  `.env`, `mongo.env` and `.env.test` files are ignored by git. Re-run the scan with the
  `secret-scanning` skill before publishing a fork.
