---
name: whats-new
description: Keep Legmate's What's new page (About → What's new, app-ui/src/components/about/changelog.js) up to date — every new feature and every fix of something players already have gets a line in the "Next release" (Coming soon) entry in the same commit, in British English for players, with its four translations; that entry gets its version number only when the version is set before a release PR, and numbered entries are never changed; fixes of features still in Next release fold into that feature's line. Use whenever implementing a feature, changing what players see or do, or fixing a bug, and before committing such work; also when the user asks to update What's new or the changelog.
---

# What's new for Legmate

What's new (About → What's new, also the public page `/whats-new`) tells players what
changed. It lives in `app-ui/src/components/about/changelog.js`, newest first. Keep it up
to date as part of the work, not afterwards: **the commit that adds a feature or fixes a
bug also adds or changes its line**.

## Which entry

**Changes always go into the "Next release" entry**, the top one:
`{ version: 'Next release', changes: [...] }`. The app shows it as "Coming soon"; a
release build hides it.

- If the top entry has a version number, create the "Next release" entry above it with
  the first change. This also applies while a release PR is open, or right after it was
  merged: that version is done.
- **An entry with a version number is never changed**, not even to fix its wording or add
  a forgotten change. Its version was released as it stands, or is in an open PR. A
  change that is late for it goes into "Next release".
- **The number comes only before the PR.** When the version is set right before a
  release pull request (see the versioning skill), "Next release" gets that version in
  the release preparation commit. The next change after that starts a new "Next release"
  entry.
- Whether a version is released: `git fetch --tags` and `git tag`, or
  `gh pr list --state merged --base main`.

## What gets a line

| Change | What's new |
|---|---|
| A new feature or something players see or do differently | a line, or extend the line of the area |
| A fix of something already **released** that players could notice | a line ("… no longer …", "… now …") |
| A fix of a feature **still in Next release** (not released yet) | no line of its own: correct that feature's line in Next release if what it says changed |
| Admin features | a line when club admins use it; installation admins only when it matters to them |
| Refactoring, tests, CI, dependencies, internal tools | nothing (they go into the PR notes under Development) |
| Security fixes | a short line without the details of the weakness |

Several small changes of one area are one line ("Bob's 27 easier to follow: …, …, …").
Keep about three to eight lines per release; merge lines of an area rather than adding
a ninth.

## How a line reads

- For players: what they can do or see now, not how it was built. No component, file or
  endpoint names.
- One sentence, or two short ones; starts with the thing ("Boards: …", "Bob's 27 …",
  "A second and a third favourite double …"); where to find it when it is not obvious
  ("under Profile → Playing").
- British English and darts usage (see the memories), informal "you", sentence case, the
  app's own words for its buttons and screens ("Enter score", "Personal bests").
- An example in quotes helps: "Your match: board 2, against Ben".
- Through `t()`: `t('…')` with the English text as the key.

## Translations

Every line needs its German, French, Italian and Spanish text (German: Swiss spelling
with ss, informal du; darts terms in English as the app uses them elsewhere). Use the
words the app already uses — look them up in `app-ui/src/locales/*.json` (e.g. German
"Rangliste" for Scoreboard, "Punkte eintragen" for Enter score).

```sh
cd app-ui
# a file { "the English line": ["de", "fr", "it", "es"] }
npm run i18n add <file>
npm run i18n prune     # drops the translation of a line that was replaced
npm run i18n check     # must say: Every text is translated.
```

## Before committing

1. The line is in "Next release", and no numbered entry changed (`git diff` shows only the top entry).
2. `npm run i18n check` passes; `npx eslint src/components/about`.
3. The commit message names the change as usual; the What's new line goes in the same
   commit as the change.
