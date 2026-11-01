---
name: versioning
description: Legmate's version numbers and when they change — the format {year}.{month}.{sequence} (sequence from 0 in each month, e.g. 2026.11.0, 2026.11.1, 2026.12.0), where the version lives (root package.json, app-api/openapi.yaml), the script that bumps it, and the rule that a new version is set on develop right after every pull request (which is only opened when the developer asks). Use whenever creating a pull request, cutting a release, bumping, setting or checking the version, naming a release branch or What's new entry, or when the user asks about versions.
---

# Versioning for Legmate

## The format

**`{year}.{month}.{sequence}`** — the year, the calendar month, and a sequence
number that starts at **0** in every month:

`2026.11.0` → `2026.11.1` → `2026.11.2` → (December) `2026.12.0` → (January) `2027.1.0`

- No leading zeros (`2027.1.0`, never `2027.01.0` or `2026.11.01`): the version
  must stay valid semver for npm, the git tag and the Docker image tag.
- The month is the month **when the version is set**, not when it ships. A
  version set on 30 November keeps `2026.11.x` even if it is released in
  December.
- The sequence only goes up within a month; a new month (or year) starts at 0.

## Where it lives

| File | Field | Used by |
|---|---|---|
| `package.json` (root) | `version` | `release.yml` reads it for the git tag, the Docker image tag and the GitHub release; the app shows it in About / What's new |
| `app-api/openapi.yaml` | `info.version` | the API description |

`app-ui/package.json` and `app-api/package.json` stay `0.0.0` — do not touch them.

## The script

```sh
node scripts/version.mjs              # current version and the next one
node scripts/version.mjs next         # write the next version into both files
node scripts/version.mjs 2026.11.3    # write a given version (corrections only)
```

The script works out the next version from the current one and today's date,
refuses anything that is not the format, and replaces the files as a whole
(temp file + rename, as the dev servers watch the working copy). Do not edit
the two files by hand.

## When the version changes

**Pull requests are opened only when the developer asks for one.** Never open
a PR on your own initiative — not for a finished feature, not for a release,
not "to be ready". Work goes straight to `develop` (see the project memory);
`main` changes only through a PR the developer asked for and merges themself.

**Right after every pull request you create, set the next version on
`develop`.** The PR carries the version it was created with; `develop` moves
on at once so the next work has its own number:

1. Create the PR as the developer asked (for a release: the `release/<version>`
   branch from `develop`, then the PR `release/<version>` → `main` with the
   deploy notes — see the release flow below).
2. Check the PR exists (`gh pr view <number>`), and note its URL.
3. On `develop`: `git pull`, then `node scripts/version.mjs next`.
4. Commit only those two files with the message `Version <new version>` (and the
   attribution lines), and push to `develop`.
5. Tell the developer both: the PR (with its version) and the new develop version.

If creating the PR failed, do not bump. If the developer says a PR does not
count as a release (e.g. a PR they asked for that is not a release), still
bump unless they say otherwise — the rule is "after every PR".

## A release, in order

1. **Before the PR**, on `develop`: the top What's new entry in
   `app-ui/src/components/about/changelog.js` gets the current version instead
   of `'Next release'` (the version in package.json is the one being
   released); SBOMs regenerated (`node scripts/sbom.mjs`), full test suites run.
2. Push `develop`, then `git push origin develop:release/<version>` and open the
   PR `release/<version>` → `main` — only when the developer asked for it.
3. **After the PR**: `node scripts/version.mjs next` on `develop`, commit
   `Version <next>`, push. A new `{ version: 'Next release', changes: [] }`
   entry is added to What's new with the first change that goes into it.

## Checks

- `node scripts/version.mjs` prints a warning when the version is not in the format.
- The version in package.json and openapi.yaml must be the same.
- A version number is never reused: if `git tag` already has it, it was released.
