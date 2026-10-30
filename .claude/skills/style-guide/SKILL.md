---
name: style-guide
description: Legmate's visual style guide for app-ui — page structure, heading tiers, type scale, colours and their meanings, buttons, labels, forms as setup boxes, lists of players, hover and focus, phone layout, and the words. Use whenever building or restyling a page, panel, form, list, card, chart or mail, or when checking that a page "follows the style guide of the other pages".
---

# Legmate style guide

The guide lives in the code: `app-ui/src/theme/base/_tokens.scss` (sizes, weights, spacing, radii, accents), `_theme-vars.scss` (the themes' colours as `--c-*` variables), `custom/components/_layout.scss` (widths, heading tiers), `_buttons.scss` (one look per kind of button), `_labels.scss` (tags), `_kpi.scss` (big figures). Read the header comment of each before changing it; keep this skill in step when a rule changes.

## Page structure

- A page is `<div className="container-fluid p-4">` holding PrimeReact `Panel`s, each with a `header` that is the panel's title (white, a short green line under it — `accent-title`). Lists, statistics and dashboards take the full width; setups and forms are `className="page-narrow"` (48rem); pages to read are `page-reading` (62rem).
- An identity page (a club, a player, a tournament, a league) starts with a **hero header**: `<header className="dashboard-header hero-header rounded-2 p-4 d-flex flex-column gap-3">` — `h1.fs-2.fw-semibold.text-default` with the name, a `text-subtle` description under it, status `Tag`s in the top right corner, then the facts as a `dl.hero-facts` (`dt.text-faint.fs-8` label over `dd.text-default.fw-semibold` value, flex-wrap, `column-gap-5 row-gap-2`), then the actions. Two columns of facts on a phone.
- Above a detail page, the way up: `<UpLink to="/tournaments" label={t('Tournaments')} />` ("‹ Tournaments"), never a back button in the header.
- Headings from the top: **hero** (the name, `h1.fs-2`) → **page** (a Panel title with the green line) → **section** (`.game-setup-section-title` / `.stats-section-title`: `$text-sm`, bold, upper case, letter-spaced, a thin line running to the right) → **setting** (`.setting-title`: the name of one setting above its choices, `$text-sm` semibold on a raised surface).
- Panels in a row are the same height; nothing is sized per widget. Several of one kind (past tournaments, finished leagues) go in **one** panel, not one panel each.

## Type scale (nothing smaller than 12px)

| Token | Size | Class | Use |
|---|---|---|---|
| `$text-xs` | 12px | `fs-9` | tags, chart labels, the smallest captions |
| `$text-sm` | 13px | `fs-8` | secondary lines under a title, hints, button labels |
| `$text-md` | 14px | `fs-7` | small text, controls, table cells, list rows |
| `$text-base` | 16px | — | body |
| `$text-lg` / `$text-xl` | 18 / 20px | `fs-6`-ish / `fs-5` | emphasised lines, big names |
| `$text-2xl` | 24px | `fs-4` | headings |
| `$text-3xl` | 32px | `fs-2` | the name in a hero header |
| `$text-display` | clamp 2.2–2.9rem | | the big number of a KPI or a score |

(`fs-7/8/9` are Legmate's own classes from the tokens; `fs-1`–`fs-6` are Bootstrap's: 2.5, 2, 1.75, 1.5, 1.25, 1rem.)

Weights: regular text, **semibold** titles and values, **bold** emphasis and button/pill labels, **heavy** only for big numbers. Font: Exo 2, served by the app (tabular figures: `.tabular-nums` for numbers that change in place). A title has its date or secondary fact on a line of its own under it in `text-subtle`/`text-faint fs-8`, never beside it in the same size.

Text colours: `text-default` (the text), `text-subtle` (descriptions, labels of facts), `text-faint` (hints, captions). Never hex, never `text-muted`/`text-white`.

## Colours and what they mean

Colours come from the theme variables so they follow the chosen theme (dark default, black, contrast, light) and accent: in SCSS through the tokens/`$…Color` variables and the functions `ink(α)` (a tint of the text colour on top of any surface), `soft($color, α)`, `with-alpha($color, α)`; in JavaScript (charts, inline) through `utils/palette.js` (`ACCENT`, `GAME_COLORS`, `PODIUM`, `readable()` for the light theme). A test keeps the two in step.

- **Green** (`--c-positive`, the accent) — the main action, positive figures, bars, KPI numbers, the chosen pill. Not a hover colour, not a border to say "selected" on a card.
- **Gold** `--c-accent-gold` — winners, records, big moments; podium gold/silver/bronze are fixed hexes the same in every theme. The thin lines of a bracket are the muted gold of the Share button: `color-mix(in srgb, var(--c-game-cricket) 32%, transparent)`.
- **Amber** — flight points, what can be bought. **Pink** — the newer games. **Blue** — information, links in charts. **Red** — losses, a bust, the Hall of Shame, destructive buttons.
- **Status**: running = soft orange (`Tag severity="warning"`), finished = soft blue (`info`), registration open = green (`success`), draft/closed/drawn = neutral (`secondary`), cancelled = red (`danger`). Games, tournaments and leagues all use these same five; the words live in `game.status.tag.jsx`, `tournament.words.js`, `league.words.js`.
- **Game types**: X01 green, Cricket `--c-game-cricket`, Elimination `--c-game-elimination`, Around the Clock `--c-game-clock`, the newer games pink — the icon, the tag and the chart line of a game in its colour.
- Surfaces: `$surfaceColor` panels, `var(--surface-raised)` a box inside a panel, `$surfaceHighColor` lines and tracks. Hover on a card or row is `background: ink(0.08)` (a lighter card, maybe a small lift with `box-shadow`), never a coloured edge. Focus is one light grey ring for the whole app (`focus-ring` mixin), never green.

## Buttons (`_buttons.scss`)

One look per kind, in `size="small"` on pages:
- the **main action** of an area: filled green (default `Button`) — one per area;
- **secondary actions** beside it: `outlined` (soft green, same light text);
- **tools and the way back** (Change, Settings, Cancel, Close, Share): `severity="secondary"` grey — so not everything is green;
- **destructive and undo**: `severity="danger"` soft red, always behind a confirm;
- **small options** inline: `text` or `link` (green text);
- a **choice** is a `SelectButton` of pills (`p-selectbutton-pills pills-inline`): the chosen one soft green, the others grey, bold labels. Odd values only where the rule demands (Best of).
- Icons are PrimeIcons, left of the label (`icon="pi pi-save"`); the house set: check, play, times, save, arrow-right, users, trash, plus, user-plus, replay, search, chart-bar, calendar, flag, ban, send, pencil, share-alt. A link that looks like a button: `className="p-button p-button-sm p-button-secondary text-decoration-none"`.

Buttons on a phone are the same small size; no full-width buttons unless it is the one action of a screen (Enter score sits above the keypad).

## Labels and badges (`_labels.scss`)

A `Tag` is a word that is never clicked: a soft tint of its colour with the text in that colour, small corners, `$text-sm` semibold. Member/Private and status tags sit in the top-right corner of a header or card. Chosen entries of a MultiSelect are the same label shape with a small cross. Levels are the `LevelBadge` (sizes `xs` in lists, larger on profiles).

## Forms and setups

Every configuration (X01 setup, tournament, league, club nights) is a `page-narrow` panel of **setup boxes**: `<SetupBox title hint>` — the setting's name on a raised strip, the field centred under it, a faint hint below; boxes in a `row g-3` with `col-12 col-md-6`, equal heights. Fields take the box's width, text starting left. Related fields of one setting go side by side in one box (a day and its two times) and wrap on a phone as a sensible pair, not one orphaned dash. Times are 24-hour quarter hours (`TimeField`), dates in the user's format (`formatDate`, `formatDateTime`), never the browser locale's. The actions at the bottom right: Cancel as a text link, secondary save, the main action last; a faint line under them says what the main action does. Errors as `Message severity="error"` above the actions.

Filters above lists are pills (`FilterPills`), one row, the label inside the dropdown on a phone. Players to pick from are always `PlayerOption` rows (picture, nickname over full name, level at the right edge); chips show the nickname alone.

## Lists, cards and figures

- A list row is `$text-md`; the primary fact bold-ish, the secondary in `text-faint fs-8` under it. Player avatars in every list (`avatar-sm`), the podium colours for the first three.
- Cards of a kind (tournaments, leagues, games) share one tile style: a surface box, title, secondary line, tags in the corner, hover as above. A "way to the final" is tiles with arrows between them; a winner is named once, with a filled cup.
- KPIs: `.kpi-headline` grid of rings/big numbers (`$text-display`, heavy), label `$text-sm` subtle, detail `$text-xs` faint; three of them stay in one row on a phone at a smaller size.
- Charts use `GAME_COLORS`/`ACCENT` from the palette (`readable()` darkens the pastels on the light theme); the form chart is per quarter so it stays readable on a phone.
- Records show the number only ("24", the "× 180" is the label), never both.

## Phone first

Check every change at 390px as well as desktop. Rules: 16px gutter, no horizontal scroll, one column for setup boxes, facts in two columns, KPIs three in a row, header actions wrap under the facts, dropdown labels inside the field. Fonts never go below `$text-xs`.

## Words

British English and darts usage (see the memories): "Best of", "legs", "sets", "checkout", "club night", "matchday"; informal "you". Title case only for the first word. A secondary line says when/where; a hint says what happens ("Starting makes the schedule and tells every player their first match."). Every text through `t()` with the four translations (de/fr/it/es).

## Mails

Mails use the **light** theme: Exo 2 (with a fallback), the app's green for the title line and the button, light surfaces, the logo from `${appUrl}/icons/icon-192.png`, a quiet 12px footer with the "manage"/"unsubscribe" link when there is one. One layout in `app-api/src/utils/mail.templates.js` (`renderMail`), every template fills the same slots; the TEST stack gets the environment strip.

## Checking a page against the guide

Walk down the page in this order and compare with a page that already follows it (tournament page, league editor, X01 setup, calendar):
1. width class and Panel/hero header, UpLink;
2. heading tiers and whether a secondary fact is on its own line;
3. sizes and weights on the scale, colours from variables;
4. buttons: one filled green per area, tools grey, destructive red + confirm;
5. tags for statuses in the five colours; badges in the corner;
6. setup boxes for every setting, equal heights, hints faint;
7. hover/focus rules, no green borders;
8. a phone screenshot (Playwright + mock) next to the desktop one.
