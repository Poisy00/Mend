# Mend: Focus line design (Phase 1: foundation + Today)

**Date:** 2026-10-13
**Status:** Approved by user
**Visual reference:** `prototypes/redesign/today.html`. Open it in a browser and pick **D · Focus line**. The prototype is the source of truth for look and behavior. Where it differs from this spec, this spec wins.

## Why
The user compared four prototypes:
- **A · Shift line** looked best, but showing breaks and shift blocks on Today pulled focus away from follow-ups.
- **C · Console** had the right focus, but too little design.
- **D · Focus line** combines A's visual language with a timeline that shows **follow-ups only**.

The shift now appears only in the sidebar agent card.

## Scope
**Phase 1:** design tokens, UI font, type utilities, and the Today page.

**Not in Phase 1:** Follow-ups, RCC Dispatch, Cases, Schedule and Settings layouts. They pick up the new tokens and font automatically and get their own prototypes later.

## Design tokens
These map onto the existing token names in `app/globals.css`, so every page inherits them.

| Token | Light | Dark |
|---|---|---|
| `--desk` / `--sidebar` / `--canvas` | `#F1F2F4` | `#0E1014` |
| `--surface` / `--sheet` | `#FFFFFF` | `#161920` |
| `--popover` | `#FFFFFF` | `#1E222A` |
| `--surface-hover` | `#F4F5F7` | `#1E222A` |
| `--text-primary` | `#16181D` | `#E8EAEE` |
| `--text-secondary` | `#5A606C` | `#9BA1AD` |
| `--text-muted` | `#6B717D` | `#8A909C` |
| `--border` | `#E2E4E9` | `#262A33` |
| `--control-edge` | `#8B909B` | `#6E7480` |
| `--primary` (iris) | `#4E3D8F` | `#B4A6F3` |
| `--primary-hover` | `#5E4CA3` | `#C6BBF6` |
| `--primary-foreground` | `#FFFFFF` | `#191433` |
| `--accent` (selection wash) | `#EEEBF8` | `#241F3C` |
| `--accent-foreground` | `#3E2F78` | `#DCD4FB` |
| `--secondary` | `#EFF0F3` | `#22262E` |
| `--secondary-foreground` | `#2A2D35` | `#E8EAEE` |
| `--muted` | `#EEF0F2` | `#1E222A` |
| `--ring` | `#4E3D8F` | `#B4A6F3` |
| `--destructive` | `#AA343B` | `#ED858B` |
| `--status-overdue` / `-tint` | `#B4381F` / `#FBEAE4` | `#F29A85` / `#3A211B` |
| `--status-due` / `-tint` | `#8A5A00` / `#F7EED8` | `#E8C06E` / `#33291A` |
| `--status-done` / `-tint` | `#17714F` / `#E3F2EA` | `#7FD3AE` / `#18302A` |

`--document` and `--document-foreground` stay unchanged, because the email preview must look like a real email. Shadows, radii, easing and durations also stay unchanged.

## Type
- **UI font:** Schibsted Grotesk Variable, self-hosted via `@fontsource-variable/schibsted-grotesk`. Geist Mono stays loaded but is no longer used for IDs.
- **`t-title`:** 32px / 1.12 / 600 / -0.025em; 26px below 640px.
- **`t-eyebrow`:** 13px / 500, sentence case, no tracking. The original spec bans all-caps labels.
- **`t-id`:** sans, 12px / 500, tabular numerals.
- No middle-dot metadata strings and no arrow suffixes on new Today copy.

## Today page behavior
1. **Header**
   - The date reads plainly, for example "Monday, October 12" (Cairo).
   - The headline:
     - When anything is overdue, it reads "One/Two/…/Five callback(s) is/are late." in the overdue colour. Numerals are used above five.
     - Otherwise it reads "You're on time." when items are open, or "Queue clear." when nothing is.
   - The sub line reads "{n} due now, {n} due within the hour.", leaving out zero parts.
   - The "New follow-up" button stays.
2. **No right rail.** The Shift, RCC Dispatch and Cases blocks are removed from Today.
3. **Filter tabs:** All, Late, Due now, Soon and Later, with counts. Buckets come from `classifyFollowUp`: overdue → Late, now → Due now, soon → Soon, waiting → Later.
4. **The line (the queue)**
   - Each row shows the due clock time in a gutter, a spine with a node coloured by status, the name with case ID, the reason, and the status label.
   - A **Now** row (an iris rule) separates past from future for today's items. Items due on later days sit under a day divider.
   - Hovering a row (or focusing it) shows resolve and snooze buttons.
   - Filtering hides the Now row.
5. **Detail panel** (≥1100px), for the selected follow-up:
   - Status, name and reason.
   - A large callback number with a copy button.
   - Account, case, due time and attempts.
   - The last note.
   - Resolved, Snooze (30 min / 1 h / 2 h) and "Open full follow-up".
   - The last three history events.
6. **Keyboard** (≥1100px): J/K or the arrow keys move the selection, E resolves, S snoozes.
7. **Below 1100px:** there is no detail panel, and rows link to `/follow-ups?selected=id` as they do now.
8. **Motion:** only the existing stitch-then-collapse on resolve and the existing `.mend-pane` entrance. Keyboard actions don't animate.
