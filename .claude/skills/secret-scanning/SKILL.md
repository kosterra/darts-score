---
name: secret-scanning
description: Scan Legmate's git history and working tree for leaked secrets (passwords, tokens, keys, committed .env files) and decide what to do with a hit — the repository is public, so every commit ever pushed counts. Use whenever the user asks for a secret scan, before publishing or forking, after a suspected leak, when a credential appears in a diff or log, or when adding a new env variable, sample file or test fixture that looks like a secret.
---

# Secret scanning for Legmate

The repository is **public**: anything ever committed is readable forever, even after a
later commit removes it. A scan therefore covers **the whole history**, not the working
tree alone. Last full scan: **2026-10-31**, 855 commits, no real credential found (see
"What is known to be benign").

## What must never be committed

`.env`, `mongo.env`, `.env.test`, `app-api/.env`, `app-ui/.env*` (all in `.gitignore`;
`.env.sample`, `mongo.env.sample`, `app-ui/.env.sample` and `.env.production` are the
committed templates and hold placeholders only). Also: backup files (`data/backups`),
uploaded pictures, `playwright-report/`, anything under `sbom/` that embeds a token.

## Scan with git alone (always available)

Run from the repository root. These are what the 2026-10-31 scan used; the sandbox may
refuse to download scanner binaries, and these need none.

```bash
# 1. secret-like file names ever added
git log --all --diff-filter=A --name-only --format= \
  | grep -iE '(^|/)(\.env[^/]*|mongo\.env|[^/]*\.(pem|p12|pfx|key|jks)|id_(rsa|ed25519)[^/]*|[^/]*secret[^/]*)$' | sort -u

# 2. high-confidence token shapes in every diff of every branch
git log --all -p --format='commit %h %s' | grep -nE \
  -e 'AKIA[0-9A-Z]{16}' -e '-----BEGIN [A-Z ]*PRIVATE KEY' -e 'ghp_[A-Za-z0-9]{36}' \
  -e 'github_pat_[A-Za-z0-9_]{20,}' -e 'xox[baprs]-[A-Za-z0-9-]{10,}' -e 'sk_(live|test)_[A-Za-z0-9]{16,}' \
  -e 'AIza[0-9A-Za-z_-]{35}' -e 'eyJ[A-Za-z0-9_-]{20,}\.eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{10,}' \
  -e 'mongodb(\+srv)?://[^:/@ ]+:[^@ ]{4,}@' -e '(smtp|SMTP)_PASSWORD\s*[=:]\s*[^$ "'"'"'{][^ ]{5,}'

# 3. generic "password|secret|token|key = literal" lines, grouped by file
git log --all -p --format= --name-only | awk '/^diff --git/{f=$3} /^\+/{print f"\t"$0}' \
  | grep -iE '\+.*(password|passwd|secret|api[_-]?key|token)\s*[:=]\s*["'"'"'`]?[A-Za-z0-9/+_-]{12,}' \
  | grep -vE 'process\.env|\$\{|t\(|import|require|describe|it\(|expect|example|placeholder' \
  | cut -f1 | sort | uniq -c | sort -rn

# 4. is a specific live value anywhere in history? (prints commits, never the value)
git log --all --oneline -S"$THE_VALUE" --name-only
```

Step 4 against every value in the local `.env`/`mongo.env` is the decisive check: loop
over the `*SECRET*|*PASSWORD*|*KEY*|*TOKEN*` lines and print **key names only**.

## Scan with the dedicated tools (when they can run)

```bash
gitleaks git . --redact --report-format json --report-path gitleaks.json --exit-code 0
trufflehog git file://. --results=verified,unknown --json --no-update > trufflehog.json
```

Install them as release binaries from GitHub or run their Docker images with the repo
mounted; both were refused by the auto-mode sandbox on 2026-10-31, so the user runs them
when wanted. Redact (`--redact`) so the report itself is not a leak. Trufflehog's
"verified" results are live credentials: treat as an incident.

## What is known to be benign (2026-10-31)

- `SMTP_PASSWORD=change-me` / `yourmailpassword` in the sample files (placeholders).
- The Mongo URL template with `${DB_USER}:${DB_PASSWORD}` (variables, not values).
- The **local dev database password** (`.env` `DB_PASSWORD`, `mongo.env`
  `MONGO_INITDB_ROOT_PASSWORD`) is a short common word that sat in `.env.sample` and
  `mongo.env.sample` in 2023 and is a fixture string in `auth.utils.test.js` and
  `test/integration/cross.club.test.js`. The dev database is local and unexposed, so no
  leak — but it is weak: recommend rotating it (edit both env files, restart the dev
  containers). Never reuse a sample value for a real installation.
- Test TOTP secret `JBSWY3DPEHPK3PXP…` in `app-ui/e2e/mock/server.mjs` (a documented
  test vector).

## When a scan hits something real

1. **Rotate first**, before anything else: the credential is public the moment it is
   pushed; rewriting history does not un-leak it. Then check logs for use.
2. Remove it from the working tree and the sample files; move it to `.env`.
3. History rewrite only if the user wants it (public forks and clones keep the old
   objects anyway): `git filter-repo --replace-text`, force-push every branch and tag,
   re-tag releases, tell collaborators to re-clone. Note it in the release notes.
4. Add a test or lint rule if a code path produced the value (e.g. logging a token).

## Prevention

- Keep secrets in env variables read in one place (`docs/configuration.md` lists them).
- New sample files: placeholders such as `change-me`, never a value that ever worked.
- Test fixtures: obviously fake values (`test-password-123`), never a real one.
- Before publishing a fork or a screenshot, run step 1–3 above.
- `gitleaks protect --staged` as a pre-commit hook is an option if the user wants one.
