---
name: infra-hardening
description: Check and harden Legmate's infrastructure and configuration — the Dockerfile (hadolint), docker-compose (read-only root, dropped capabilities, no-new-privileges, port binding, Trivy/Checkov), the host (Docker Bench, disk encryption), TLS at the proxy or Cloudflare (testssl.sh), the delivered HTTP security headers and CSP, and the mail domain's SPF/DKIM/DMARC. Use whenever the user asks about container or compose security, IaC scanning, TLS, HSTS, CSP or security headers, mail deliverability or spoofing, or a server checklist.
---

# Infrastructure hardening for Legmate

The app ships as one image run by `docker-compose.yml` next to MongoDB and, optionally,
cloudflared. legmate.ch sits behind Cloudflare (TLS terminates there). What follows are
the checks and the state they found on **2026-10-31**.

## Dockerfile

```bash
docker run --rm -i hadolint/hadolint < Dockerfile        # stdin, no mount needed
```
Clean but for `DL3066` (info: `USER node` is a name, not a uid — the node image maps it to
1000; accepted). Keep: base pinned by digest, `apt-get upgrade` in every stage, non-root
`USER`, JSON-form `HEALTHCHECK CMD`, multi-stage build, `npm ci --omit=dev` in production.

## Compose

`docker-compose.yml` runs the app with `read_only: true` (writable: the data volume and a
`/tmp` tmpfs), `cap_drop: [ALL]`, `security_opt: [no-new-privileges:true]`; MongoDB keeps
only `CHOWN`, `SETGID`, `SETUID` (entrypoint owns `/data/db` and switches user);
cloudflared is read-only without capabilities. Port 3001 binds to `${APP_BIND:-0.0.0.0}`:
behind a proxy on the same host set `APP_BIND=127.0.0.1` — any private-network client
counts as a trusted proxy for the per-IP rate limits (`TRUST_PROXY`), so the port must not
be reachable from other machines on that network.

Test a change with the production image, never the dev stack:
```bash
docker build --target production -t darts-score:throwaway .
docker compose -f docker-compose.yml config -q          # syntax
# then run the throwaway image with the same flags and hit /api/health, upload a picture,
# make a backup: everything the app writes must land in /app/data or /tmp
```
Scanners: `trivy config .` (Dockerfile, compose, workflows) or `checkov -d .` — both need
the repo mounted into their container or a local binary, which the sandbox refused; the
user runs them. Expected findings to accept: published port (by design), floating
`mongo:8.0`/`cloudflared:latest` tags (see supply-chain).

## Host

Not checkable from the repository; ask the operator to run **Docker Bench for Security**
(CIS) on the server, keep Docker and the kernel patched, encrypt the disk or the volume
that holds `darts_score_db` and `darts_score_data` (MongoDB Community has no encryption at
rest; backups are plaintext gzip), and restrict SSH. Record the answers in
`docs/operations.md`.

## TLS

```bash
docker run --rm drwetter/testssl.sh:3.2 --quiet --severity LOW --color 0 legmate.ch
```
2026-10-31: **A+** (TLS 1.2/1.3 only, ECDSA P-256, Let's Encrypt, forward secrecy, HTTP/2
and HTTP/3). Notes: CBC suites still offered to old clients (LUCKY13 "potentially", a
Cloudflare default), no CAA record, no OCSP stapling. CAA is cheap: `legmate.ch CAA 0 issue
"letsencrypt.org"` (and `pki.goog`/`digicert.com` if Cloudflare's universal certificate
needs them — check the current issuer first with `openssl s_client`).

## HTTP security headers and CSP

```bash
curl -sI https://legmate.ch/ | sed 's/\r$//'
```
Expected after a release with helmet (`app-api/index.js`): `content-security-policy` with a
per-request nonce for the one inline script, `strict-transport-security`,
`x-frame-options: DENY` (or CSP `frame-ancestors`), `x-content-type-options: nosniff`,
`referrer-policy`, no `x-powered-by`. **2026-10-31 production still ran 2026.10.22 and
showed none of them** (PR #22 brings helmet) — re-check after the release, then paste the
CSP into https://csp-evaluator.withgoogle.com/ and the host into
https://securityheaders.com/. Things to keep in mind: `'unsafe-inline'` only in the
Swagger page's policy; HSTS `max-age` ≥ 1 year with `includeSubDomains` before thinking
about `preload`; Cloudflare can add HSTS itself (SSL/TLS → Edge Certificates) as a belt
and braces.

## Mail domain (SPF, DKIM, DMARC)

```bash
dig +short TXT legmate.ch; dig +short TXT _dmarc.legmate.ch; dig +short MX legmate.ch
for s in brevo1 brevo2; do dig +short CNAME $s._domainkey.legmate.ch; done
```
2026-10-31: SPF `v=spf1 include:_spf.mx.cloudflare.net ~all` (inbound routing via
Cloudflare), DKIM for Brevo via `brevo1`/`brevo2` CNAMEs, DMARC `p=reject`. Outgoing mail
through Brevo passes DMARC by DKIM alignment, so reset mails are not spoofable and should
not land in spam. Improve: add `rua=mailto:…` to the DMARC record to receive reports, and
include Brevo in SPF (`include:spf.brevo.com`) if the envelope sender is ever the domain
itself. The API now insists on STARTTLS (`SMTP_REQUIRE_TLS`, default `true`) so a stripped
upgrade fails loudly instead of sending credentials in clear.

## Checklist

1. hadolint clean (info only) · 2. compose `config -q` ok and hardening lines present ·
3. `APP_BIND` set where a proxy fronts the app · 4. testssl A/A+ · 5. headers present after
the release, CSP evaluator without high findings · 6. SPF/DKIM/DMARC as above ·
7. operator confirms Docker Bench, patching, disk encryption, encrypted off-host backups.
