---
name: dynamic-testing
description: Run dynamic security tests against a throwaway Legmate stack — an OWASP ZAP baseline scan (DAST), API fuzzing from the OpenAPI description with Schemathesis, and rate-limit/DoS probes of the credential and writing endpoints — and read their results. Use whenever the user asks for a DAST or ZAP scan, API fuzzing, a load or rate-limit test, "what does a scanner find", or before a release that touched routes, validators, limits or headers. Never against the dev stack or legmate.ch.
---

# Dynamic testing for Legmate

Static review and unit tests miss what only a running server shows: headers as
delivered, parsers on odd input, limits under load. These three tools cover that, against
a **throwaway stack built from the working tree** — never the dev containers
(`darts-score-*`, ports 3000/3001/27017/8025, real data) and never a public host.
Last run: **2026-10-31** (findings below, all fixed the same day).

## The throwaway stack

```bash
docker build --target production -t darts-score:throwaway .
docker network create ts-net
docker run -d --name ts-mongo --network ts-net -e MONGO_INITDB_ROOT_USERNAME=ts -e MONGO_INITDB_ROOT_PASSWORD=tspass \
  -e GLIBC_TUNABLES=glibc.pthread.rseq=1 mongo:8.0
docker run -d --name ts-api --network ts-net -p 127.0.0.1:3101:3001 -e NODE_ENV=production \
  -e DB_HOST=ts-mongo -e DB_PORT=27017 -e DB_NAME=ts -e DB_USER=ts -e DB_PASSWORD=tspass \
  -e SESSION_SECRET=throwaway-session-secret-0123456789 -e MFA_KEY=throwaway-mfa-key-0123456789abcdef \
  -e ADMIN_EMAIL=admin@example.test -e ADMIN_PASSWORD='Throwaway-Admin-Pass-1' \
  -e APP_URL=http://127.0.0.1:3101 -e BREACHED_PASSWORD_CHECK=off darts-score:throwaway
until curl -sf http://127.0.0.1:3101/api/health; do sleep 1; done
```
A private network, not `host.docker.internal` (Mongo is bound to loopback). The global
admin cannot own a club: register a user (`POST /api/auth/register`), log in with
`Origin: http://127.0.0.1:3101`, `POST /api/clubs {name}`, add guests
(`POST /api/players/guest` with `X-Club-Id`). The cookie is `ds_session` from the jar.
Clean up: `docker rm -f ts-api ts-mongo ts-schema; docker network rm ts-net`. The sandbox
refuses bind mounts: pass files with `docker cp`, read reports from stdout.

## 1. ZAP baseline (passive, headers and CSP)

```bash
docker run --rm --network host ghcr.io/zaproxy/zaproxy:stable zap-baseline.py -t http://127.0.0.1:3101 -I -j
# authenticated: replace the Cookie header
docker run --rm --network host ghcr.io/zaproxy/zaproxy:stable zap-baseline.py -t http://127.0.0.1:3101 -I \
  -z "-config replacer.full_list(0).description=auth -config replacer.full_list(0).enabled=true \
      -config replacer.full_list(0).matchtype=REQ_HEADER -config replacer.full_list(0).matchstr=Cookie \
      -config replacer.full_list(0).regex=false -config replacer.full_list(0).replacement=ds_session=$COOKIE"
```
The spider sees the SPA shell and assets, not the API, so ZAP is a header check. Expected
WARNs to accept: CSP `style-src 'unsafe-inline'` (React style attributes, by design),
COEP missing (deliberately off for avatars and fonts), "suspicious comments" in vendor
bundles. Anything about X-Frame-Options, HSTS, nosniff, Referrer-Policy,
Permissions-Policy, `x-powered-by` or cacheable JSON is real.

## 2. Schemathesis (fuzzing from `app-api/openapi.yaml`, 315 operations)

```bash
docker run -d --name ts-schema --network host --entrypoint sleep schemathesis/schemathesis:stable 3600
docker cp app-api/openapi.yaml ts-schema:/tmp/openapi.yaml
docker exec ts-schema schemathesis run /tmp/openapi.yaml -u http://127.0.0.1:3101 -c all -n 20 \
  --suppress-health-check all --request-timeout 30 --max-time 360 --report json --report-json-path /tmp/unauth.json --no-color
docker exec ts-schema schemathesis run /tmp/openapi.yaml -u http://127.0.0.1:3101 -c all -n 20 \
  --suppress-health-check all --request-timeout 30 --max-time 420 -H "Cookie: ds_session=$COOKIE" \
  -H "X-Club-Id: $CLUB" -H 'Origin: http://127.0.0.1:3101' \
  --exclude-path-regex '/api/auth/(logout|delete-account|password|me)$' --report json --report-json-path /tmp/auth.json --no-color
docker cp ts-schema:/tmp/auth.json .
```
(4.x flags: `-c all`, no `--hypothesis-deadline`.) Read the report by failure code: **ST101
server error** is the only one that is a bug by itself (reproduce with curl, fix, add a
case to `app-api/test/integration/api.shape.test.js`); ST108/ST103/ST202 are
contract gaps (response not matching the schema, undocumented status codes, valid request
rejected) — fix the spec when cheap (`security: []` on public ops, `pattern` on ids,
429/404/422 responses), otherwise list them; ST201 "missing auth" is a false positive when
the global `-H Cookie` re-adds the cookie; ST204 undeclared methods on `/api/*` should be
404 JSON. A cheap, complete 5xx sweep: call every write operation without a body,
authenticated, and count anything ≥ 500.

## 3. Rate limits and load (a Node fetch script with a worker pool)

Numbers to know (`routes/auth.routes.js`, `index.js`, `utils/spam.rules.js`): credential
limiter **30 / 15 min per IP**, one bucket shared by login, register, forgot/reset, MFA and
passkey routes; global **50 000 / 15 min**; spam guard 30 created players / 10 min per
account (blocks the account and alerts), 10 failed logins / 15 min per account, 5 reset
requests / h. Probes (≤ 60 s each): 60× wrong-password login → exactly 30×401 + 30×429
with `RateLimit-*` and `Retry-After`; 60× forgot-password → 30 answers + 30×429, fast and
uniform; 300× authenticated creates → the spam guard blocks the account after ~30
(overshoot under concurrency is fine), the global limiter is not meant to trigger;
300× `/api/health` → all 200, p99 well under 100 ms. `docker restart ts-api` between
credential probes (the limiter is in memory). Known trade-off: one mistyping person behind
a club's NAT exhausts resets and registration for that address for 15 minutes.

## Findings of 2026-10-31 and what changed

500 on `PUT /api/auth/onboarding`, `POST /api/leagues`, `PUT /api/calendar/nights/{day}/attendance`
without a body → `req.body ??= {}` on `/api`; authenticated JSON cacheable →
`Cache-Control: no-store` on `/api` (pictures and the public overview keep theirs);
Permissions-Policy missing → set; invalid JSON answered "Internal server error." →
400 with a plain message and no error log; missing avatar logged at ERROR → debug; unknown
`/api/*` paths returned the SPA → 404 JSON; spec: `ValidationError` is an array of
strings, `/api/public/support` is public. Open: undocumented 400/404/422/429 codes on
many operations, ids typed as plain strings.

## After a run

Fix bugs with a regression case in `test/integration/api.shape.test.js`, note accepted
findings here, and re-check production headers after the release (`infra-hardening`).
