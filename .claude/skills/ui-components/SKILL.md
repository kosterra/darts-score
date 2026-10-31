---
name: ui-components
description: How to choose between a PrimeReact component, a thin wrapper of one, and a component of our own when building or changing UI in app-ui; the catalogue of wrappers that already exist. Use whenever adding a form field, list, picker, dialog, tag or other control, or when a PrimeReact default fights the app.
---

# UI components in app-ui

The app uses PrimeReact 10 for *behaviour* (overlays, keyboard navigation, focus traps, filtering, ARIA) and its own SCSS theme for *looks* (`app-ui/src/theme`, a copied theme we own). Every PrimeReact default is a suggestion; the style guide of the app wins.

## The three-way decision

Before reaching for `import { X } from 'primereact/x'` in a page, decide:

1. **Use PrimeReact directly** — only for a component that is used once or twice and fits as it is. Keep: `Dropdown`, `MultiSelect`, `Calendar` (the date part), `DataTable`/`Column`, `Dialog`, `ConfirmDialog`, `Toast`, `InputNumber`, `Password`, `InputText`, `InputTextarea`, `Button`. These carry real behaviour that is weeks to rewrite correctly; never replace them.
2. **Wrap it** — whenever the same PrimeReact component is configured the same way in more than a handful of places (same `itemTemplate`, same `className`, same options list, same aria-label pattern). Write a thin component in `app-ui/src/components/elements/` that owns the configuration and exposes a small, app-specific API (`value`, `onChange`, `ariaLabel`, `placeholder`, `disabled`, `className`). The page then never touches PrimeReact props for that control. This is what makes a later swap of the library a one-file change instead of a 130-file change.
3. **Own it** — when PrimeReact's component does the wrong thing for this app, or needs more than roughly 30 lines of `.p-*` override SCSS to look right. Write it in plain JSX + theme SCSS. Cheap, worthwhile candidates when you touch them anyway: `Tag`, `Message`, `ProgressBar`, `Skeleton`, a `Panel` header. Do **not** start a migration project: replace only what you are already working on.

Signals that you are in case 3: a locale-dependent default we cannot turn off (the 12-hour time picker was one), fighting the component's internal flex/width (the dropdown item label not stretching was one), or a visual that the style guide defines differently from the theme and needs overrides in several files.

## Wrappers that already exist (`app-ui/src/components/elements/`)

Reuse these; do not rebuild them inline.

| Component | File | Wraps | Use for |
|---|---|---|---|
| `PlayerOption` | `player.option.jsx` | Avatar + LevelBadge | the row of a player in any dropdown/multiselect: picture, nickname over full name, level at the right. Pass `level={levels[id]}` from `usePlayerLevels()` |
| `TimeField` | `time.field.jsx` | Dropdown | a time of day, 24h, quarter hours, `"HH:MM"` or `''`; `clearable` for "open end" |
| `DateTimeField` | `date.time.field.jsx` | Calendar + TimeField | a date with a time; `minDate` opens the month view there |
| `SetupBox` | `setup.box.jsx` | SettingTitle | one setting of a configuration form (title, field, faint hint) — the X01/tournament/league setup look |
| `UpLink` | `up.link.jsx` | — | the "back to the list" link under a page header |
| `FilterPills` | `filter.pills.jsx` | SelectButton, Dropdown on a phone | pill filters above lists (`FilterPillsField` with a label) |
| `TypeFilter` / `TypePill` | `type.filter.jsx`, `type.pill.jsx` | Dropdown, MultiSelect | choosing game types, grouped (`type.groups.js`) |
| `GameStatusTag` / `GameTypeTag` | `game.status.tag.jsx`, `game.type.tag.jsx` | Tag | status colours (running orange, finished blue, …) — reuse these colours for tournaments/leagues too |
| `SettingSwitch` | `setting.switch.jsx` | InputSwitch | a labelled on/off setting |
| `DeletePopup` | `delete.popup.jsx` | Dialog + Button | confirming a delete |
| `CountryPicker`, `LanguageSwitch`, `ClubLogo`, `PlayerCard`, `Skeletons` | … | | |

Hooks that belong with them: `usePlayerLevels()` in `app-ui/src/utils/use.player.levels.js` (call at the top of the component, never after an early return).

Missing and worth adding the next time a page needs one: `PlayerSelect` (Dropdown + PlayerOption + levels + filter, today repeated in ~8 places), `PlayerMultiSelect` (the same for MultiSelect with chips), `StatusTag` for tournaments/leagues.

## How to write a wrapper or an own component

- One file per component in `app-ui/src/components/elements/`, default export, named like `thing.field.jsx` / `thing.option.jsx`.
- A JSDoc block above it in the house style: what it is, in prose, with the props' meanings in the sentence (see `time.field.jsx`). No prop-types tables.
- Only components exported from a `.jsx` file (Fast Refresh) — constants stay unexported or go to a `.js` file.
- Every user-visible text through `t()` and then `npm run i18n missing` → add the four translations (de/fr/it/es, informal, Swiss ss, darts terms in English, British English).
- Styles in the theme, not inline: component rules go to `app-ui/src/theme/base/custom/components/_<area>.scss`; sizes from `_tokens.scss` (`$text-xs … $text-base`, weights), colours from the theme variables (`var(--c-…)`), never hard-coded hex.
- PrimeReact overrides, when unavoidable, go next to the component they fix in `src/theme/base/components/<group>/_<component>.scss` and stay few; if they grow past ~30 lines, that is the signal for case 3.
- Dark and light theme both: check `src/theme/dark/_extensions.scss` if the colour differs.
- Verify with a Playwright screenshot against the mock API at desktop and phone width (see the memory on verifying UI in a browser); the pair of times in the club nights editor is a reminder that a row that fits on desktop must wrap sensibly on a phone.

## What not to do

- Do not add a second UI library, a headless library, or Tailwind for one component.
- Do not swap PrimeReact wholesale; the bundle gain is small (the big components would stay) and the theme is already ours.
- Do not pass raw PrimeReact components around pages for a control that has a wrapper — if a wrapper lacks a prop you need, add the prop to the wrapper.
