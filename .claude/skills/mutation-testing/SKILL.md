---
name: mutation-testing
description: Run and read mutation testing (Stryker) on Legmate's API to learn whether the unit tests catch faults or only cover lines — the config, which files are worth mutating, how long it takes, how to read survivors (missing test vs equivalent mutant) and turn them into tests. Use whenever the user asks about test quality or mutation testing, doubts that the tests "really test", or after adding logic to src/utils or src/rules that has unit tests beside it.
---

# Mutation testing for Legmate (Stryker)

A mutation test changes the code in one small place (a `<` to `<=`, a condition to `true`)
and runs the tests: if they still pass, the mutant **survived** and nothing checks that
spot. The **mutation score** is killed / (killed + survived + no coverage). It is set up
for `app-api` (`stryker.config.json`, `npm run test:mutation`,
`@stryker-mutator/core` + `vitest-runner`, dev-only). Reports: `app-api/reports/mutation/`
(`mutation.html` to browse, `mutation.json` to script; both git-ignored).

## Running

```bash
cd app-api
npm run test:mutation                                   # the configured set, ~12 min at concurrency 2
npx stryker run --concurrency 4                         # faster on an idle machine
npx stryker run --mutate 'src/utils/kpi.data.js,!src/**/*.test.js'   # one file: ONE --mutate, comma-separated (a repeated flag keeps only the last)
```
`ignoreStatic: true` skips module-level mutants (constants, regexes) that would need the
whole suite each — set it to `false` for a thorough, ~3× longer run. Thresholds are
informative (`break: null`); set `break` once the baseline is raised if it should fail CI.
Keep the sandbox out of a watched working copy with `--tempDirName /some/tmp/.stryker-tmp`.

## What to mutate

Only files with unit tests **beside them** — an untested file shows as "no coverage",
which is a coverage question, not a test-strength one. The configured set is the pure
logic with the most tests: `integrity.js`, `tournaments.js`, `game.utils.js`,
`auth.utils.js`, `kpi.data.js`. `src/rules/*.js` (x01, cricket, elimination, clock) have no
direct tests yet (they are reached through integrity/badges/kpi tests) — write rule tests
first, then add them. `badges.js` is left out for run time.

## Baseline (2026-10-31, before the follow-up tests)

| File | Score | On covered code |
|---|---|---|
| kpi.data.js | 82.6 | 83.2 |
| game.utils.js | 68.0 | 75.4 |
| auth.utils.js | 55.1 → 71.3 after the follow-up tests | 56.9 → 73.7 |
| tournaments.js | 49.9 | 66.6 |
| integrity.js | 45.6 → 48.5 after the follow-up tests | 55.9 → 58.2 |
| total (3 126 mutants) | 50.5 | 62.1 |

Pattern of the survivors: (a) security conditions whose **deny** side was never exercised
(trusted-device cookie of another user / rotated salt / expired; expired pending-MFA
cookie; cookie flags `httpOnly`/`signed`/`secure`; `needsRehash` for a weaker scrypt N),
(b) **mode branches never entered** (Master Out finishes and busts, set-based match
scoring, an admin answering entries after the draw), (c) **fixtures too small** to tell
min from max or first-nine from all visits. Each became a test the same day.
The remaining integrity.js survivors sit in functions without unit tests (`checkRulesGame`,
`checkClock`, `checkRulesTraining`, `x01Legs`, `checkElimination`, `checkCricket`).
Equivalent and left alone: the regex anchors `/^D/`→`/D/` and `/^[DT]/`→`/[DT]/` (the dart
notation always has the letter first), `<`/`<=` on millisecond expiries.

## Reading survivors

- Script it: `python3 -I summarise.py reports/mutation/mutation.json Survived` style — group
  by file:line, mutator, replacement, covering tests (`coveredBy` → `testFiles`).
- **Missing test** when a sane input would behave differently with the mutant: write the
  test with that input (the negative case, the other mode, a bigger fixture).
- **Equivalent mutant** when no input can tell them apart: `<` vs `<=` on millisecond
  timestamps, a guard made redundant by another, `> 0` vs `>= 0` where 0 is falsy to every
  caller, `/^D/` vs `/D/` when the notation only has D in first position. Ignore, or add a
  `// Stryker disable next-line` comment with the reason.
- **Noise**: StringLiteral mutants in messages and log texts. Exclude the mutator if they
  drown the signal (`"mutator": { "excludedMutations": ["StringLiteral"] }`).
- Prioritise security conditions, then game rules that decide results, then query
  builders; the rest when there is time.

## After a run

Write the tests next to the code (same style as the neighbours), re-run Stryker on the
touched files only to show the score move, and note the new baseline here. A survivor that
turns out to be a real bug gets a regression test and a line in the release notes.
