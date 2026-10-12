# Task brief: Focus line, Phase 1 (for the implementing agent)

You are implementing a scoped UI change in the Mend repo (`C:\mend\Mend`, branch `design-system-v2`). A reviewer will check your diff against this brief line by line. **Do exactly what is written here and nothing more.** When this brief and your own judgment disagree, follow the brief. When the brief doesn't cover something, **stop and report it**; don't guess.

- **Base commit:** `17bd254`. Every change you make must be reviewable as `git diff 17bd254..HEAD`.
- **Read first:** `docs/superpowers/specs/2026-10-13-focus-line-design.md`, which has the token table and the behavior.
- **Visual reference:** `prototypes/redesign/today.html`. Open it in a browser and choose **D · Focus line**. Its CSS (`.A` and `.D` rules) and its `renderD` / `rowD` / `detailD` functions show the intended markup and spacing. Translate them into the project's Tailwind and components. Don't copy the prototype's vanilla JS or its global CSS.

## Hard rules
1. **Allowed files only.** You may edit or create only these:
   - `app/globals.css`
   - `app/layout.tsx`
   - `package.json`, `package-lock.json`: only to add `@fontsource-variable/schibsted-grotesk`
   - `app/(desk)/page.tsx`
   - `components/today/queue.tsx`
   - `components/today/focus-detail.tsx` (new)
   - `components/today/shift-block.tsx`: delete it, and only once nothing imports it

   If you think another file must change, stop and report why. Don't edit it.
2. **No behavior or data changes.** Don't edit anything under `lib/`, `app/api/`, `db/`, `drizzle/`, `tests/`, `scripts/` or `vendor/`. Use the existing endpoints (`PATCH /api/follow-ups/{id}`, `GET /api/follow-ups/{id}`) and the existing `FollowUpCommand` types exactly as `components/today/queue.tsx` uses them today.
3. **No other dependencies.** Don't remove `geist`. Don't add a motion library.
4. **No hand restyling of other pages.** Follow-ups, RCC, Cases, Schedule, Settings and the shell change only through tokens and type utilities.
5. **Move, don't rewrite.** The existing `send`, `undo`, `resolve`, `finish` and `snooze` functions and the `mendedId` / `leavingId` stitch-then-collapse sequence in `components/today/queue.tsx` must keep the same logic. You may restructure the JSX around them.
6. **Reuse what exists:**
   - `classifyFollowUp`, `rankFollowUp` (`lib/follow-ups/rules.ts`)
   - `followUpDisplay`, `dueCaption`, `queueGroupLabel` (`lib/follow-ups/display.ts`)
   - `formatPhone`, `formatAccountIfComplete`, `displayName` (`lib/display/format.ts`)
   - `StatusPill` (`components/ui/status.tsx`), `CopyButton`, `Kbd`, `Button`, `DropdownMenu*`, `Tooltip*` (`components/ui/`)
   - `useMobileDetail` (`components/use-mobile-detail.ts`, true below 1100px)
   - `refreshQueueCounts`, `MendLink`
   - `hover-fine:` variant, `num`, `t-*` utilities, `.mend-stitch`, `.mend-pane`
7. **No extras.** That means:
   - no shift or break UI on Today
   - no RCC or Cases blocks
   - no new animations, toasts or settings
   - no copy changes outside Today
   - no refactors
   - no comments explaining the brief
8. **Commits.** Make one commit per step, using the exact message given, each ending with a blank line and `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`. Never amend, rebase, force-push, use `--no-verify` or push.
9. **Failing checks.** If a check fails, fix your own code. Never edit tests or lint config to make a check pass. If you can't fix it, stop and report.

## Steps

### Step 1: Tokens
- In `app/globals.css`, replace the colour values in `:root` and `.dark` with the token table in the spec.
- Change only colour values and the tokens the table names. Keep every token name, every alias, the `@theme inline` block, shadows, radii, easing and durations.
- `--document` and `--document-foreground` stay unchanged.

Commit: `Apply Focus line palette`

### Step 2: Font
- `npm install @fontsource-variable/schibsted-grotesk@5.3.0`.
- In `app/layout.tsx`, `import "@fontsource-variable/schibsted-grotesk";` and remove `GeistSans` from the `<html>` className. Keep `GeistMono.variable`.
- In `globals.css`, set `--font-sans` (inside `@theme inline`) and the `body` `font-family` to `"Schibsted Grotesk Variable", system-ui, sans-serif`.

Commit: `Switch UI font to Schibsted Grotesk`

### Step 3: Type utilities (`globals.css`)
- `t-title`: `font-size:32px; line-height:1.12; font-weight:600; letter-spacing:-.025em;`, and below 639px `font-size:26px; line-height:1.15`.
- `t-eyebrow`: `font-size:13px; line-height:18px; font-weight:500; letter-spacing:0; text-transform:none;`
- `t-id`: `font-family:inherit; font-size:12px; line-height:16px; font-weight:500; font-variant-numeric:tabular-nums;`, with no letter-spacing.

Commit: `Retune type scale for Focus line`

### Step 4: Today page
Commit: `Rebuild Today as the Focus line`

**`app/(desk)/page.tsx` (server):**
- **Keep:** the `requirePageSession`, `listFollowUps(session.id, { limit: 100 })` and open-item filter/sort.
- **Remove:** the `getSchedule` and `listCases` calls (no longer used on Today), `RailBlock`, `rccTools`, `ShiftBlock`, and the `<aside>`.
- **Header:**
  - Use `PageHeader` with `eyebrow` = the plain date. Build it from the same `Intl` parts as now: `${weekday}, ${month} ${day}`, with no "·".
  - `title` = the headline. The title prop is a string, so the overdue colour can't be applied through it. If you need it, render the header inline with the same classes as `PageHeader` (`t-title`, the eyebrow `<p>`, the description `<p>`). Don't edit `components/ui/page-header.tsx`.
  - Headline rules:
    - With N overdue: `${word} callback${N === 1 ? " is" : "s are"} late.` (word = One…Five, else the numeral), in `text-status-overdue`.
    - Otherwise "You're on time." when open > 0, else "Queue clear.".
  - Description: join the non-zero parts of `[`${now} due now`, `${soon} due within the hour`]` with ", ", capitalise the first letter, and end with "."; omit it if both are zero.
  - Actions: keep the existing "New follow-up" button.
- **Queue:** render `<TodayQueue items={open} now={nowMs} total={followUps.items.length} />` with all open items, keeping the existing `key` prop pattern.
  - Keep a link "View all in Follow-ups" (to `/follow-ups`) only when `followUps.nextCursor` is set.
  - If `TodayQueue`'s props need to change, change them; it's in your allowed files.

**`components/today/queue.tsx` (client, `TodayQueue`):**
- **Layout:** at ≥1100px (`!useMobileDetail()`), a grid `grid-cols-[minmax(0,1fr)_380px] gap-10 items-start`: the line on the left, `<FocusDetail>` on the right in a `sticky top-6` wrapper. Below 1100px, only the line, and rows are `MendLink`s to `/follow-ups?selected=${id}`, as now.
- **Selection state** (`selectedId`):
  - Initially the first item whose bucket is overdue or now, otherwise the first item.
  - Clicking a row (≥1100px) selects it; there's no navigation.
  - When the selected item is removed, select the item that took its index, or the previous one.
- **Filter tabs** above the line, in a `role="group"` with `aria-label="Filter follow-ups"`:
  - Tabs `all | overdue | now | soon | waiting`, labelled All / Late / Due now / Soon / Later. Each is a `<button aria-pressed>` with a count chip.
  - Container: `rounded-[12px] bg-desk p-1 flex gap-1 w-max max-w-full overflow-x-auto`.
  - Active tab: `bg-sheet shadow-chip text-foreground`; inactive: `text-text-secondary`.
  - Count chip colours: Late `bg-status-overdue-tint text-status-overdue`, Due now `bg-status-due-tint text-status-due`, Soon `bg-accent text-primary`, all others `bg-surface-hover text-text-secondary`.
- **The line:** a list where each entry is a 4-column grid, `grid-cols-[68px_22px_minmax(0,1fr)_auto]`, with a min-height of 68px.
  - **Gutter:** the due clock time (`Intl.DateTimeFormat("en-US",{timeZone:item.sourceTimezone,hour:"numeric",minute:"2-digit"})`), right-aligned, `t-meta num text-text-secondary`.
  - **Spine:** a 2px `bg-border` vertical line through the 22px column. It starts at the middle of the first entry and ends at the middle of the last. The node is a 10px circle:
    - overdue: `bg-status-overdue` with a 3px `status-overdue-tint` ring
    - now: `bg-status-due` with a `status-due-tint` ring
    - soon: `bg-sheet` with a 2px `primary` ring
    - waiting: `bg-sheet` with a 2px `text-muted` ring
  - **Body:** the name (`t-label` 15px semibold, truncate; keep the `mend-stitch` class and the `onAnimationEnd` handler exactly as `WorkRow` does now), then the case number or formatted account (`t-id text-text-muted`), then the reason (`t-meta text-text-secondary`, truncate).
  - **End column:** `followUpDisplay(item, now).label` as `t-meta num` (overdue: `text-status-overdue font-semibold`; now: `text-status-due font-semibold`).
    - The existing resolve (Check) and snooze (AlarmClock dropdown) icon buttons replace the label while the row is hovered or focused (`hover-fine` / `focus-within`). On `(hover:none)` both show at all times, as now.
    - Keep their aria-labels, the Tooltip and the snooze options.
  - **Row states:** the selected row has `bg-accent`; hover is `hover-fine:bg-surface-hover`; the row radius is `rounded-[10px]`. Rows are `<button>` elements at ≥1100px, so the action buttons must sit outside the row button: an absolute overlay, as the current `WorkRow` does.
  - **Now row** (only when the filter is "all" and at least one item is due today in Cairo): placed between the last item due before now and the first item due after. Gutter: the current time (`text-primary font-semibold`). Node: a 12px `bg-primary` circle with a 4px `accent` ring. Body: a 2px `bg-primary` rule with a small "Now" label at its end. Height 28px.
  - **Day dividers:** for items not due today, add a divider entry before each new day, labelled "Tomorrow", a short weekday, or "Mon D", matching `dueCaption`'s day wording. Style: `t-meta font-semibold text-text-secondary`, height 44px, with a 2px-tall node bar.
  - **Collapse animation:** keep the existing grid-rows collapse wrapper (`data-leaving`), unchanged, around each item entry.
- **Footer hint** (≥1100px and `hover-fine` only): `Kbd` J, K "Move", E "Resolve", S "Snooze", as `t-caption text-text-muted`, spaced with gap. Don't use "·".
- **Keyboard** (≥1100px only): on `keydown` on `window`:
  - **Ignore** the event if `metaKey`, `ctrlKey` or `altKey` is held; if the target is an input, textarea, select or `[contenteditable]`; or if `document.querySelector('[role="dialog"],[role="menu"]')` exists.
  - `j` / `ArrowDown` and `k` / `ArrowUp` move the selection through the **filtered** list and call `scrollIntoView({block:"nearest"})` on the row.
  - `e` calls the existing `resolve` on the selected item.
  - `s` opens the snooze menu in the detail panel (a controlled `open` state on that `DropdownMenu`).
  - Moving the selection never animates.
- **Empty states:**
  - No items at all: the existing empty block, with the heading "Queue clear." and the line "New follow-ups show up here at the time they're due." Keep the "New follow-up" button.
  - An empty filter: "Nothing in this filter." as `t-meta text-text-secondary`, centered, `py-12`.

**`components/today/focus-detail.tsx` (new, client):**
Props: the item, `now`, `onResolve`, `onSnooze(minutes)`, `snoozeOpen`, `onSnoozeOpenChange`, `mended`. The resolve and snooze handlers come from `TodayQueue`; the detail panel never calls the API for commands.
- **Wrapper:** `<aside aria-label="Selected follow-up" className="mend-pane rounded-[14px] bg-sheet p-6 shadow-[0_0_0_1px_var(--border),0_12px_32px_-20px_rgb(0_0_0/.18)]">`. Give it `key={item.id}` from the parent only if `.mend-pane` doesn't replay on re-render; it must not replay while the same item stays selected.
- **Content, top to bottom:**
  - `<StatusPill tone label>` from `followUpDisplay`.
  - h2: `displayName(customerName)`, 24px / 1.2 / 600 / -0.02em, `mt-3`, with the `mend-stitch` class when `mended`.
  - The reason: `t-body-lg text-text-secondary mt-1.5`.
  - **Callback callout:** `mt-5 rounded-[12px] bg-desk px-4 py-3.5 flex items-center justify-between`. Inside: a small "Callback number" label (`t-caption text-text-secondary`), then the number in 24px semibold `num`. Use `formatPhone` when the number has 10 digits; otherwise show it raw, as `detail.tsx` does. Add a `CopyButton label="phone number"`.
  - **2×2 `<dl>`** (`mt-4 grid grid-cols-2 gap-x-4 gap-y-3.5`):
    - Account: `formatAccountIfComplete`, plus a `CopyButton`.
    - Case: `caseNumber`, or "Not saved".
    - Due: `dueCaption`.
    - Attempts: `attemptCount`, in `num`.
    - Each `<dt>` is `t-caption text-text-secondary`; each `<dd>` is `t-label`.
  - **"Last note":** only if `item.notes`. A `mt-4 border-t border-border pt-4 t-meta text-text-secondary` block, with "Last note." in `font-semibold text-foreground` before it. Clamp to 3 lines.
  - **Actions** (`mt-5 grid grid-cols-[1fr_auto_auto] gap-2`):
    - A `Button` "Resolved" with a Check icon and `<Kbd keys={["E"]}/>`.
    - A `DropdownMenu`, controlled via `snoozeOpen`, with an outline/secondary `Button` "Snooze" with an AlarmClock icon and `<Kbd keys={["S"]}/>`. It has the same three options as the row menu, each also showing the resulting clock time in `text-text-muted num`.
    - An icon `Button asChild` wrapping a `MendLink` to `/follow-ups?selected=${id}`, with `aria-label="Open full follow-up"` and a lucide `PanelRightOpen` icon in a Tooltip.
    - Hide the `Kbd`s on touch (`[@media(hover:none)]:hidden`).
  - **History:** `mt-6`, a `t-caption font-semibold text-text-secondary` heading "History", then the last 3 events.
    - Fetch them with exactly the pattern in `components/follow-ups/detail.tsx` (`useEffect` on `[item.id, item.revision]`, with an `active` flag).
    - Each event is a row: time (`toLocaleTimeString` short, `num text-text-muted`, 64px column), then `event.type.replaceAll("_"," ")` with the first letter capitalised.
    - Empty: "No history yet."

**Delete** `components/today/shift-block.tsx` if nothing imports it any more. Check with a grep.

### Step 5: Checks
Run each of these and capture the result: `npm test`, `npm run lint`, `npx tsc --noEmit`, `npm run build`. If a check fails because of your change, fix your code and add a commit `Fix <what>`. If it fails at base `17bd254` too, don't fix it; report it.

## Your report (paste it back to the reviewer exactly in this shape)
```
## Focus line Phase 1 report
Commits: <sha> <message> (one line each)
Diff stat: <output of git diff --stat 17bd254..HEAD>
Checks: test <pass/fail> | lint <pass/fail> | tsc <pass/fail> | build <pass/fail>
<paste errors for any failure>
Stopped / deviated: <each item, or "none">
Guesses made: <each item, or "none">
Screens: <what you visually verified, or "not verified">
```
