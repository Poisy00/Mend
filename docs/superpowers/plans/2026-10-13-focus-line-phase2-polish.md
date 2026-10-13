# Focus line Phase 2: polish pass, from the user's review (task brief for Sonnet)

**Base commit:** the current `HEAD` of `design-system-v2`. Record it in your report.
**Context:**
- Spec: `docs/superpowers/specs/2026-10-13-focus-line-phase2-design.md`.
- The user reviewed the live app and approved it overall. They asked for exactly the four fixes below, plus two copy leftovers.

## Hard rules
- **Allowed files only:**
  - `app/globals.css`
  - `components/ui/input.tsx`, `components/ui/textarea.tsx`, `components/ui/mend-select.tsx`, `components/ui/mend-date-picker.tsx`, `components/ui/sonner.tsx`
  - `components/rcc/expedite-form.tsx`, `components/rcc/readiness-checklist.tsx`, `components/rcc/route-card.tsx`
  - `components/mend-shell.tsx`, `components/ai/ask-mend.tsx`
  - `components/ui/sheet.tsx`, only if the `instant` prop needs removing there
- Never edit `lib/`, `app/api/`, `db/`, `drizzle/`, `tests/`, `scripts/`, `package*.json` or `prototypes/`.
- **No behaviour changes:** keep the same handlers, fetches, autosave and Outlook flow. No new dependencies.
- If something is ambiguous: stop and report. Don't guess, and don't add features.
- **Commits:** one per fix, with the exact messages below, plus the trailer `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`. Never amend, push or use `--no-verify`.
- **Checks at the end:** `npm test`, `npm run lint`, `npx tsc --noEmit` and `npm run build`. All must pass. Never edit tests.
- **Visual check:** a dev server is usually already running at `http://localhost:5173` and the user is signed in. If you have the built-in browser tools, verify each fix there at 1280px and 375px, in light and dark. Never sign in or type credentials. If the session is signed out, say "not verified".

## Fix 1: quiet inputs draw a box around the underline on focus
**What the user sees:** focusing Customer name, Account number, Callback number, Case summary or almost any input draws a full rectangle outline *and* the iris underline. They called it "looks so bad".

**Root cause:** `app/globals.css` line ~98 has an **unlayered** `:focus-visible { outline:2px solid var(--ring); outline-offset:2px; }`. Tailwind v4 utilities live in `@layer utilities`, and unlayered rules beat layered ones. So the `focus-visible:outline-none` on the quiet treatments never wins.

**Fix:**
- Move that global rule into `@layer base`. Check whether `textarea[data-treatment="document"]:focus-visible` needs the same move, so utilities can override it.
- Then confirm these quiet treatments show **only** the 2px iris underline on focus, with no rectangle:
  - Input, Textarea, MendSelect trigger, MendDatePicker trigger
  - the boxed fields in follow-up and RCC forms
- **Also:** on focus inside a field wrapper, the field's label turns `text-primary`, with a 120ms colour transition. Use `group`/`focus-within` on the existing `Field` and `label` wrappers in RCC and follow-up forms. **Edit only allowed files.** If label wrappers outside the allowed files need it, list them in the report instead.
- Buttons, links, tabs and chips must **still** show the global focus ring. Spot-check them.

Commit: `Fix doubled focus outline on quiet fields`.

## Fix 2: polish the toast (not a redesign)
**File:** `components/ui/sonner.tsx`. The Toaster is mounted in `app/layout.tsx` with `position="bottom-right"`. Keep that, and don't edit `layout.tsx`.

**Target:**
- **Surface:** `--popover`, a 1px `--border` hairline plus `var(--shadow-overlay)`, a 12px radius, `14px 16px` padding, a 360px width (the mobile width stays Sonner's default) and a 12px gap between stacked toasts.
- **Content:**
  - The title is 14px/500 in text-primary, and the description is 13px in text-secondary.
  - The icon is 16px, vertically aligned to the title's first line, with a 10px gap.
- **Icons**, matching the design system with no green:
  - Success uses the iris check: a static 16px `--accent` circle with a `--primary` check, the same mark as `.mend-check[data-state=met]`. Reuse that CSS class or an equivalent inline SVG.
  - Error uses `--destructive`, info and warning use text-secondary, and loading spins as now.
- **Action button** (Undo and similar):
  - quiet text style: a transparent background, `--primary` text, 13px/600, 28px tall, 8px horizontal padding, a 6px radius
  - `hover-fine` shows the `--accent` background
  - a visible focus ring
  - right-aligned
- **Dark mode** must read correctly through the tokens.
- **Motion:** Sonner's default entrance is fine. Reduced motion is respected through Sonner. Add no custom animation.
- Use Sonner's `classNames` slots (`toast`, `title`, `description`, `actionButton`, `cancelButton`, `icon`) and CSS variables. **Don't** fork Sonner.

Commit: `Polish toast styling`.

## Fix 3: RCC Appointment expedite right column, one scroll region
**What the user sees:** at 1100px and wider, the right column (`components/rcc/expedite-form.tsx` ~line 113: `sticky … max-h-[calc(100dvh-3rem)] overflow-auto`) scrolls on its own. To reach the "{n} of 8 ready" checklist and **Open in Outlook**, they have to scroll the column and then the page. "I need to know where I should look exactly."

**New composition, 1100px and wider:**
- The right column is `sticky top-6`, with a fixed height of `calc(100dvh - 3rem)` and `display:flex; flex-direction:column`. It has **no outer overflow**.
- From top to bottom:
  1. **Route card** (`shrink-0`), in a compact form: the route name and tag on line 1, then the clock and countdown with the recipient on line 2, then the warning if any.
  2. **Email document** (`flex-1 min-h-0 overflow-auto`). This is the **only** scroll region in the column. Keep the document styling. Its To and Subject header stays pinned at the top of the document while the body scrolls: `sticky top-0`, with the document background.
  3. **Action dock** (`shrink-0`), always visible at the bottom of the column, with a `--border` top rule and the sheet background:
     - **Row 1:** "{n} of 8 ready" (the existing heading, which stays the `aria-describedby` target), then a compact inline list of **unmet items only**. Use the existing `CheckMark` and its states. When all 8 are met, show "Ready to send" with a met mark instead.
       - A "Show all" text button expands the full 8-item checklist inside the dock, capped at about 40% of the column height with its own overflow. This is the only allowed exception to "one scroll region". It's collapsed by default.
     - Suggestions, as one line each in text-secondary with the due dot, sit under row 1. Show at most 2, then a "+n more" toggle.
     - **Row 2:** Open in Outlook (primary, Kbd Ctrl Enter), Copy formatted email, More options. Then the autosave status, right-aligned, in text-secondary.
     - The disclaimer line moves under the buttons as `t-caption`.
- The **page** must not need scrolling to reach Open in Outlook at 1100px wider and a height of 760px or more. The left form scrolls with the page as normal.
- **Below 1100px:** keep the current Compose/Preview tabs and normal page flow. There's no fixed height there and no nested scroll.
- Keep all the logic as it is: `prepare`, `attempted`, readiness, suggestions, the downloads and `restoreLast`.

Commit: `Give RCC preview a single scroll region and action dock`.

## Fix 4: Ctrl+J opens Ask Mend without its animation
**Root cause:** `components/mend-shell.tsx` ~line 147. The Ctrl/Cmd+J handler calls `setAskInstant(true)`, so the Sheet skips its entrance. Clicking the button uses `setAskInstant(false)`.

**The user wants the keyboard open animated, exactly like the click.**
- Make Ctrl/Cmd+J use the same path as the click: an animated open and an animated close.
- Remove the `askInstant` state and `AskMend`'s `instant` prop if nothing else uses them. Grep first.
- Leave `sheet.tsx`'s `instant` support in place if other callers use it.
- Keep the toggle behaviour (pressing Ctrl+J again closes the panel) and `preventDefault`.

Commit: `Animate Ask Mend on keyboard open`.

## Copy leftovers (one commit)
- `components/ui/mend-date-picker.tsx:~37` builds `${label} · ${timePart(value)}`. Replace the middle dot with a comma.
- `components/rcc/expedite-form.tsx` toast: "Formatted email copied — paste into Outlook" becomes "Formatted email copied. Paste it into Outlook."

Commit: `Clean up date picker and RCC copy`.

## Report (paste exactly this structure)
```
BASE: <sha>
COMMITS: <sha message> (one per line)
FILES: <git diff --stat BASE..HEAD>
CHECKS: test | lint | tsc | build  (pass/fail, errors if any)
FIX 1 root cause confirmed: <yes/no + what you changed>
VISUAL CHECK: <per fix: what you verified in the browser, widths/themes, or "not verified">
STOP-AND-REPORT ITEMS / DEVIATIONS / GUESSES: <list or "none">
```
