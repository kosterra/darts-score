---
name: whats-new
description: Keep Legmate's What's new page (About → What's new, app-ui/src/components/about/changelog.js) up to date — every new feature and every fix of something players already have gets a line in the "Next release" entry in the same commit, in British English for players, with its four translations; fixes of features not released yet fold into that feature's line instead. Use whenever implementing a feature, changing what players see or do, or fixing a bug, and before committing such work; also when the user asks to update What's new or the changelog.
---

# What's new for Legmate

What's new (About → What's new, also the public page `/whats-new`) tells players what
changed. It lives in `app-ui/src/components/about/changelog.js`, newest first. Keep it up
to date as part of the work, not afterwards: **the commit that adds a feature or fixes a
bug also adds or changes its line**.

## Which entry

- The top entry is `{ version: 'Next release', changes: [...] }`: everything on `develop`
  not released yet. The app marks it "Coming soon"; a release build hides it.
- If the top entry already has a version number (a release was just cut, see the
  versioning skill), add a new `{ version: 'Next release', changes: [] }` above it with
  the first change.
- **A release pull request is open but not merged** (the top numbered entry is the one in
  the PR): a change that goes into that release — the developer decides, ask when it is
  unclear — changes that entry; then the release branch is moved up to `develop` after its
  CI run passed, and the PR notes get the change.

## What gets a line

| Change | What's new |
|---|---|
| A new feature or something players see or do differently | a line, or extend the line of the area |
| A fix of something already **released** that players could notice | a line ("… no longer …", "… now …") |
| A fix of a feature **not released yet** (still in Next release or the open release) | no line of its own: correct that feature's line if what it says changed |
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

1. The line is in the right entry (above).
2. `npm run i18n check` passes; `npx eslint src/components/about`.
3. The commit message names the change as usual; the What's new line goes in the same
   commit as the change.
