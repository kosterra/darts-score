---
name: owasp-asvs
description: Verify the Legmate app against the OWASP Application Security Verification Standard (ASVS 5.0). A chapter-by-chapter map of where each control lives in this codebase, the target level, the verification method, and how to produce an ASVS-based assessment. Use whenever the user asks for a security review, an ASVS/compliance check, a gap analysis, or to verify a specific control area (auth, session, authz, crypto, uploads, headers, logging).
---

# OWASP ASVS verification for Legmate

The **Application Security Verification Standard** (ASVS) is OWASP's catalogue of
security requirements for web apps. This skill maps **ASVS 5.0** (released May
2025, 17 chapters, ~350 requirements) onto this codebase so a review is grounded
in real files, and says how to run one.

Three assurance levels: **L1** (baseline, black-box testable), **L2** (apps
handling sensitive data — the sensible target here), **L3** (high-value /
critical). **Target Legmate at L2.** It handles personal data (names, emails,
dates of birth) behind authentication but is not a banking/medical/critical
system, so L3 is not warranted.

Prior work to build on, not repeat: the penetration test, dependency audit and
cryptography inventory (three Artifact reports, see the `pentest-later` memory),
the SBOM/CBOM in [`sbom/`](../../sbom/), and the technical docs in
[`docs/`](../../docs/) — especially [`docs/security.md`](../../docs/security.md).

## How to run an ASVS verification

1. **Confirm scope and level** with the user (default L2, whole app). If they
   name an area, verify just that chapter.
2. **Never touch the dev MongoDB.** Spin up an isolated stack exactly as the
   pentest did — a throwaway mongo (tmpfs, loopback) + the API from the repo on a
   free port with a relative `IMG_DIR` — and seed accounts (global admin, two
   club admins, a club player, an outsider). See [`docs/development.md`](../../docs/development.md)
   and the pentest memory for the recipe.
3. **Verify, don't assert.** For each requirement, read the code *and* probe the
   running stack (the pentest's `lib.mjs`/probe scripts are the pattern).
   Distinguish confirmed from code-only findings.
4. **Record against requirement IDs.** Note each item as met / not met / N/A /
   not applicable-to-level, citing the file and the ASVS chapter (e.g. "V6.2 —
   met, `auth.utils.js`"). Mark out-of-app items (TLS at the proxy) as such.
5. **Report.** Publish an Artifact page in the same visual family as the existing
   three reports (same tokens/fonts) when the user wants a document; otherwise
   summarise in chat. Fixes follow the project's normal flow (push to develop;
   see the hardening already done for the pattern).

## ASVS 5.0 chapters → where they live here

Status reflects the 2026-10-30 hardening; re-verify, don't trust it blindly.

| # | Chapter | Where in the codebase | Target L2 status |
|---|---------|----------------------|------------------|
| **V1** | Encoding & Sanitization | React auto-escaping; server meta escaped in `app-api/src/utils/page.meta.js` (`escape`, `<`); no `dangerouslySetInnerHTML` anywhere in the UI | Met |
| **V2** | Validation & Business Logic | `express-validator` on every mutating route + shared `validate`; domain rules in `app-api/src/rules`; fair-play & integrity checks | Met |
| **V3** | Web Frontend Security | helmet CSP (nonce) in `index.js`; cookie flags `HttpOnly`/`SameSite=Lax`/`Secure`; browser storage holds only per-viewer prefs | Met (after headers fix) |
| **V4** | API & Web Service | REST, `openapi.yaml` contract (CI-validated); authz on every endpoint; rate limiting; strict CORS | Met |
| **V5** | File Handling | `app-api/src/controllers/file.controller.js` — magic-byte type check, forced `.png/.jpg`, 5 MB cap; serving uses `basename` + `dotfiles: deny` | Met (after upload fix) |
| **V6** | Authentication | `auth.utils.js` (scrypt), `mfa.js` (TOTP), `passkeys.js` (WebAuthn); credential rate limiter + sign-up spam guard; non-enumerable login/reset | Met (register 409 is a known, accepted L1-ish note) |
| **V7** | Session Management | `auth.utils.js` + `sessions.js` — signed cookie + server-side session records, `sessionVersion` invalidation, timeout, remote logout | Met |
| **V8** | Authorization | `middleware/auth.middleware.js` — per-request role resolution, club scope via `X-Club-Id`, `requireClubAdmin`/`requireGlobalAdmin`; IDOR & mass-assignment tested | Met (18/18 in the pentest) |
| **V9** | Self-contained Tokens | the signed session cookie (HMAC-SHA256 via cookie-parser); passkey challenge cookie `ds_pk`; share/reset/claim tokens stored only as SHA-256 hashes | Met |
| **V10** | OAuth & OIDC | **Not applicable** — no OAuth/OIDC (WebAuthn is not OAuth) | N/A |
| **V11** | Cryptography | `auth.utils.js`, `mfa.js`, `screens.js`, `auth.tokens.js`; full inventory in [`sbom/darts-score.cbom.json`](../../sbom/darts-score.cbom.json) | Met |
| **V12** | Secure Communication | TLS terminated at the reverse proxy / Cloudflare Tunnel (out of app); HSTS set; `Secure` cookie on HTTPS; MongoDB SCRAM-SHA-256 on the internal network | Met — **verify the proxy's TLS config** |
| **V13** | Configuration | env-based config ([`docs/configuration.md`](../../docs/configuration.md)); secrets `SESSION_SECRET`/`MFA_KEY`; `x-powered-by` off; prod image `npm ci --omit=dev`; SBOMs + `npm audit` | Met |
| **V14** | Data Protection | private by default, hidden players, deletion requests + anonymisation, PII kept off the public page; images on a volume, not in the DB | Met |
| **V15** | Secure Coding & Architecture | layered API, pure rules engine, startup migrations, generic error handling, no secrets in source, dependency hygiene ([`docs/`](../../docs/)) | Met |
| **V16** | Security Logging & Error Handling | pino logs; admin error log (`utils/error.log.js`); generic error responses (no stack traces); abuse logging (`blocked.ip`); no secrets in logs | Met |
| **V17** | WebRTC | **Not applicable** — no WebRTC | N/A |

Each ASVS 5.0 chapter opens with **documentation requirements** (record how a
control was applied and why). The `docs/` set and the three security reports
largely satisfy these; cite them.

## Verification notes per high-value chapter

- **V6 Authentication** — check: password length bounds (8–128), scrypt params
  (versioned, re-hash on login), constant-time verify; TOTP window & single-use
  recovery codes; passkey `userVerification`/`residentKey` required; the
  credential limiter (30/15 min); login & password-reset give identical answers
  for known/unknown accounts. Known note: registration returns 409 for an
  existing email (minor enumeration, rate-limited — accepted, not a defect).
- **V7 Session** — tamper a cookie byte (expect 401), forge an unsigned cookie
  (401), confirm `HttpOnly`/`SameSite`, confirm a logout/`sessionVersion` bump
  ends the session server-side.
- **V8 Authorization** — the decisive tests: club B admin cannot read/modify club
  A via `X-Club-Id`; a club player cannot do admin-only actions; a normal user
  cannot reach `/api/admin/*`; privileged fields (`role`, `admins`, `clubs`,
  `user`, `level`) are ignored on create/update.
- **V5 File Handling** — upload an SVG/HTML as `image/png` (expect 422), an
  oversized file (expect 422), a real PNG (stored as `<uuid>.png`, served
  `image/png`); try path traversal in the serve filename.
- **V11/V12 Crypto & Comms** — cross-check the CBOM; the one live action is
  confirming at the proxy that only TLS 1.2+/1.3 is offered and HSTS is sent.

## What not to do

- Do not run intrusive probes against the dev stack or the dev MongoDB — always
  the isolated throwaway stack.
- Do not aim for L3 unless the user asks; it adds requirements (e.g. formal
  threat modelling, HSM-backed keys) disproportionate to this app.
- Do not re-state ASVS requirement text verbatim at length; cite the chapter/ID
  and verify against the code. Confirm the current chapter list and counts from
  the OWASP ASVS GitHub repo if precise IDs are needed — the standard evolves.

## References

- OWASP ASVS project & requirements (authoritative): <https://owasp.org/www-project-application-security-verification-standard/>
- Prior Legmate assessments: the three Artifact reports (pentest, dependency audit, CBOM) in the `pentest-later` memory.
- [`docs/security.md`](../../docs/security.md), [`sbom/`](../../sbom/).

## Deep check of the second factor and passkeys (V6/V7, done 2026-10-31)

A report-only review found no high-severity issue and these properties, to re-check after
any change in `controllers/{auth,mfa,passkey}.controller.js`, `utils/{auth.utils,mfa,passkeys,sessions}.js`:

1. `requireAuth` reads only `ds_session`; the pending-MFA cookie `ds_mfa` never sets `req.user`.
2. Every login path (password+code, passkey, reset, register, enrol) mints a new session id (`login: true` → `recordSession` with `sid: null`).
3. `sessionVersion += 1` and `mfa.trustSalt` rotation sit together in changePassword, resetPassword and the admin setPassword.
4. Email change, passkey add/remove, MFA disable and account deletion each re-verify the password and, with MFA on, the code.
5. Passkeys: `expectedOrigin`/`expectedRPID` from `APP_URL`, `requireUserVerification: true`, no `allowCredentials`, challenge single-use server-side (`utils/passkeys.js`).
6. Recovery codes: 10, `randomBytes`, hashed, constant-time compare, consumed atomically (`$pull`, `modifiedCount`); TOTP step consumed atomically.
7. Blocked accounts are refused in login, pendingUser, passkey login, forgot/reset and `startSession`.
8. Limits: credential 30/15 min per IP, global 50 000/15 min, wrong codes 5/5 min per account, spam guard 10 failed logins/15 min.
9. Reset tokens: only hashes stored, `$gt: now`, nulled after use, 1 h (7 d for invitations).

Open recommendations: keyed hash and more entropy for recovery codes (~40 bits today), a per-account wrong-code counter on every code check (not only `/login/mfa`), a password to enable MFA from a session, `skipSuccessfulRequests` on the login limiter, a dummy scrypt on unknown emails. Related: [`threat-modeling`](../threat-modeling/SKILL.md), [`privacy-review`](../privacy-review/SKILL.md), [`infra-hardening`](../infra-hardening/SKILL.md), [`supply-chain`](../supply-chain/SKILL.md), [`secret-scanning`](../secret-scanning/SKILL.md).
