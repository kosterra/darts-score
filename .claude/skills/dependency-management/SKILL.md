---
name: dependency-management
description: How to keep Legmate's npm dependencies (app-ui and app-api) and the Docker base image current without taking on supply-chain risk — the conservative update policy (age over newness; only jump versions for a High/Critical vulnerability in a version actually in use), how to check what is installed and what is vulnerable, the Docker base-image pin and when to bump it, the PrimeReact v10 hold, and how to apply and verify an update. Use whenever adding, updating, auditing, pinning or removing a dependency, reviewing `npm audit`/`npm outdated`, checking or bumping the Docker base image, responding to a CVE or advisory, or deciding whether to bump a package.
---

# Dependency management for Legmate

Two npm projects: **`app-ui`** (React 19, PrimeReact, Vite, Vitest) and
**`app-api`** (Node 24, Express 5, Mongoose 9, helmet). Both pin with caret
(`^`) ranges in `package.json` and exact versions in `package-lock.json`;
`npm ci` installs the locked versions. A CycloneDX **SBOM/CBOM** lives in
[`sbom/`](../../sbom/). There is **no** Renovate/Dependabot — updates are
deliberate and reviewed, which is the point.

## The policy: current, but not bleeding-edge

Newer is not safer. A brand-new release is the most likely to carry a
compromised maintainer account, a typosquat in a new transitive dep, or a
regression. So **do not chase `latest`.** Prefer versions that have been out
long enough to be trusted, and move in the smallest step that solves the need.

Decide a bump by *why*, not by *what's newest*:

| Situation | What to do |
|---|---|
| **High or Critical vulnerability in a version actually in use** (and it ships — see prod vs dev) | Update **now**, to the **lowest** version that fixes it (a patch or minor inside the range if possible). This is the only reason to move fast. |
| Moderate/Low advisory, or an advisory only in a **dev** dependency | No rush. Note it; fold the fix into the next routine pass. Never break prod for a dev-only advisory. |
| Package is simply behind `latest`, no advisory | Leave it, or bump conservatively (patch/minor) on a routine pass. **Never** jump a major just because it exists. |
| A major upgrade (new features, breaking changes) | A planned task of its own, with its own testing — not a routine bump. See the PrimeReact note. |
| Adding a **new** package | Vet it first: is it maintained, widely used, and has the version you'd pin been out a while? Prefer a small, well-known dep (or none) over a fresh or niche one. |

Favour an **aged** target over the newest patch: when several fixed versions
exist, pick one that has been published for a few weeks, not one from this
week. `npm view <pkg> time` shows release dates; `npm view <pkg> version`
shows `latest`.

## Prod vs dev — only prod ships

The production image builds with `npm ci --omit=dev`, so **dev dependencies
never ship**. A critical advisory in `vitest`/`tinypool`/`esbuild`/`nodemon`
is not a production exposure. Audit the two scopes separately and act on the
production one:

```bash
# in app-ui, and again in app-api
npm audit --omit=dev     # what actually ships — this is the one that matters
npm audit                # everything, incl. dev tooling (context only)
npm outdated             # how far behind each dep is
```

**Never run `npm audit fix --force`** — it pulls in breaking majors and can
*downgrade* a package to satisfy a resolver, which is how you'd silently drop
off a known-good version. Apply fixes explicitly instead (below).

Today's baseline (keep it this way): `npm audit --omit=dev` is **0
vulnerabilities** in both projects.

## Check on every change, keep a deeper pass for releases

As part of normal work — before a commit that touches dependencies, and
periodically otherwise — confirm what is installed and whether anything that
ships is vulnerable:

1. `npm audit --omit=dev` in **both** `app-ui` and `app-api` → must stay clean.
2. If it flags **High/Critical** in a shipped dep, fix it in that same change
   (lowest fixing version) before committing.
3. **Check the Docker base image** (see the next section) — a High/Critical in the
   pinned Node/Debian base is fixed the same way, in the same change.
4. On a quieter cadence (and before a release), run `npm outdated` and bump the
   safe ones (patches/minors inside range) in a dedicated "dependency bump"
   commit, then re-run the checks below.
5. After any dependency change, **regenerate the SBOM/CBOM** in [`sbom/`](../../sbom/)
   so it reflects what is installed (see [`sbom/README.md`](../../sbom/README.md)).

(If you want this enforced rather than remembered, a CI step running
`npm audit --omit=dev` that fails on High/Critical is the clean way — offer it,
don't assume it.)

## The Docker base image (pinned by digest, checked every commit)

The [`Dockerfile`](../../Dockerfile) builds every stage `FROM ${NODE_IMAGE}`, a
single global ARG pinned to an exact tag **and digest** (e.g.
`node:24.22.2-slim@sha256:…`). The pin is deliberate: a floating `node:24-slim`
makes each build — and each Snyk/scanner pass — hit whatever the tag resolves to
that day, so results drift and a scan of the registry tag need not match what
shipped. A digest is one known, scannable image. `apt-get upgrade` in each stage
still patches the Debian OS packages (perl, pcre2, …) at build time; the pin only
fixes the Node binary and the base layer.

**The same policy as npm applies: age over newness, and only move fast for a
High/Critical.** Check the base image as part of the per-commit pass:

```bash
# what the floating tag resolves to now (compare against the pinned digest)
docker buildx imagetools inspect node:24-slim | grep -i digest

# scan the pinned base for High/Critical (use whichever is to hand)
docker scout cves node:24.22.2-slim --only-severity critical,high
# or: trivy image --severity HIGH,CRITICAL node:24.22.2-slim
# or: snyk container test node:24.22.2-slim --severity-threshold=high
```

- **High/Critical in the Node binary or the Debian base** → bump the pin now, to
  the **lowest** current patched release (prefer one aged a few days, not hours
  old). Node security releases are the trigger; a new minor with no advisory is
  not. Check Node's security releases (<https://nodejs.org/en/blog/vulnerability>)
  and the image's own CVE list, not just the tag number.
- **Moderate/Low, or only in a dev-stage layer** → note it; fold into the next
  routine bump. Don't churn the pin for Low noise.
- **To bump:** resolve the new digest with `docker buildx imagetools inspect
  node:<new-tag>-slim`, then update **both** the tag and the digest in the
  `NODE_IMAGE` ARG together (never the tag alone — the digest is the real pin),
  with its comment date. Rebuild and sanity-check (`docker buildx build --check`;
  a `--target production` build), then regenerate the SBOM.
- **Shipping the fix:** a base bump reaches users at the next release
  (`main` → `release.yml`). To refresh the **current** `:latest` with a patched
  base between releases — without a version bump — run the **release workflow
  manually** (`workflow_dispatch`); it builds with `pull: true`, so a rebuild
  picks up the newest base and Debian packages. Follow the project's branch flow
  (push to `develop`; `develop` → `main` PR) — don't push to `main` to force it.

## The PrimeReact hold (deliberate)

`app-ui` stays on **PrimeReact `^10`** even though **`11.x` is `latest`**. This
is intentional and **fine for now** — do **not** flag it as outdated or bump it
on a routine pass. PrimeReact 11 is a major with breaking theming/design-system
changes; moving to it is a planned migration (restyle + re-test the whole UI,
see the [`style-guide`](../style-guide/SKILL.md) and [`ui-components`](../ui-components/SKILL.md)
skills), not a dependency chore. Treat `primereact` and `primeicons` as pinned
to their current major until the user asks to migrate.

## New packages: slopsquatting and typosquatting

AI tools (this one included) sometimes name packages that do not exist; attackers
register those names and wait ("slopsquatting"), next to the classic typo variants
of popular packages. So before any `npm install <new-package>`, in this order:

1. **Does it exist, and since when?** `npm view <pkg> time --json` — the `created`
   date and how many versions there are. Anything younger than about three months,
   or with a single version, is out unless the user named it themselves.
2. **Is anyone using it?** `curl -s https://api.npmjs.org/downloads/point/last-month/<pkg>`
   — a handful of downloads for a supposedly well-known package means a look-alike.
3. **Where does it come from?** `npm view <pkg> repository.url maintainers` and open
   the repository: same name, the maintainer you expect, a README that matches the
   package. `npm view <pkg> dist.attestations` shows npm provenance when present.
4. **Is the spelling the one you meant?** Compare with the canonical name
   (`lodash` vs `lodahs`, `cross-env` vs `crossenv`); `npm search <name>` when unsure.
5. **What runs at install?** `npm view <pkg> scripts` — a `preinstall`/`postinstall`
   on a small utility is a red flag. Take a first look with `npm install --ignore-scripts`.

Prefer, in this order: what Node itself does, a package already in the tree, then a
widely used one. Never let a tool pick a name you did not verify. The same applies
to GitHub Actions (`uses:`): only well-known publishers, pinned to a commit SHA.

## Applying an update

1. `cd` into the right project (`app-ui` or `app-api`).
2. Install the exact chosen version: `npm install <pkg>@<version>` (a patch/minor
   inside the existing range keeps `package.json` the same and only moves the
   lockfile; a new range updates both). Commit `package.json` **and**
   `package-lock.json` together.
3. New or changed packages need installing **inside the dev containers** too
   (`darts-score-api-1`, `darts-score-ui-1`) — they keep their own
   `node_modules`; `npm install` in each, then `touch` a watched file to
   restart. (Pure test-only devDeps the running app never imports don't need
   this.)
4. Verify in the affected project: `npm run lint`, `npm test` (app-api also
   `npm run test:integration`), `npm run build`; for UI changes also
   `npm run typecheck`. For the API, re-check `npm audit --omit=dev` is clean.
5. Regenerate the SBOM/CBOM in [`sbom/`](../../sbom/).

## What not to do

- Don't bump to `latest` reflexively, and don't bump majors on a routine pass.
- Don't `npm audit fix --force`.
- Don't act on a dev-only advisory by breaking production tooling.
- Don't add a dependency for something small the platform/Node already does.
- Don't install a package name an AI tool suggested without the checks under slopsquatting above.
- Don't `uses:` an action by tag; pin the commit SHA and let Dependabot move it.
- Don't move PrimeReact off `^10` without the user asking for the migration.
- Don't leave the Docker base image on a floating tag, and don't bump its tag
  without updating the digest alongside it.

## References

- Prior dependency audit, SBOM/CBOM and the "prod uses `--omit=dev`" finding: the `pentest-later` memory and the three Artifact reports.
- [`sbom/`](../../sbom/) — CycloneDX SBOMs (per project) + CBOM, and how they were generated.
- Advisory sources: `npm audit`, the GitHub Advisory Database, and the package's own changelog/releases (check the release date, not just the number).
