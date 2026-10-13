# Focus line Phase 2: build brief for Sonnet

**Spec, the source of truth:** `docs/superpowers/specs/2026-10-13-focus-line-phase2-design.md`. Read it fully before starting.
**Visual references:**
- `prototypes/redesign/follow-ups.html`, variant A
- `prototypes/redesign/rcc.html`, variant A
- `prototypes/redesign/today.html`, variant D

The work runs in **four stages**. You will be told which stage to do. Do **only that stage**, then stop and report. The reviewer (Opus) checks each stage before the next starts.

## Hard rules (all stages)
- **Edit only that stage's allowed files.** If you need another file, stop and report why. Don't edit it.
- **Never edit** `lib/`, `app/api/`, `db/`, `drizzle/`, `tests/`, `scripts/`, `package.json`, `package-lock.json` or `prototypes/`. Importing from `lib/` is fine.
- **No behaviour or data changes.** Use the same fetch endpoints, payloads, `FollowUpCommand`s, autosave, handoff and Outlook flows, validation and toasts (unless the spec changes a toast). Move logic; don't rewrite it.
- **No new dependencies.** Use the existing `components/ui/*` (Button, Input, Textarea, MendSelect, MendDatePicker, Dialog, DropdownMenu, Sheet, Kbd, CopyButton, StatusPill, Checkbox, Switch).
- Follow spec §1 (global rules) in every file you touch, especially the **tabular numerals** rule and the **copy** rule.
- **Ambiguity, or a conflict between the spec and the code:** stop and report. Don't guess, and don't add features the spec doesn't name.
- **Commits:** one per step, with the exact message given, plus the trailer line `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`. Never amend, push, force or use `--no-verify`.
- **Checks at the end of every stage:** `npm test`, `npm run lint`, `npx tsc --noEmit` and `npm run build`. All must pass. Never edit tests to make them pass; report the failure instead.

## Stage 1: shared pieces, Follow-ups and the tabular-numerals fix
**Allowed:**
- `components/focus-line/*` (new)
- `components/today/queue.tsx`
- `components/today/focus-detail.tsx`
- `app/(desk)/page.tsx`
- `components/follow-ups/queue.tsx`
- `components/follow-ups/detail.tsx`
- `components/follow-ups/queue-summary.tsx`
- `app/(desk)/follow-ups/page.tsx`
- `components/mend-shell.tsx` (only the `num` fix)

**Steps:**
1. **Extract shared Focus line pieces** from `components/today/queue.tsx` into `components/focus-line/`. Suggested split:
   - `filter-tabs.tsx`: the segmented strip, with optional tinted count chips and `role=tablist`
   - `line.tsx`: the row, node, Now row and day divider
   - `actions.ts`: the shared `send`, `undo`, `resolve` and `snooze` plus the toast and Undo logic, as a hook such as `useFollowUpActions`
   - `headline.ts`: the Today headline and sub line

   Today must look and behave **exactly** as before. Commit: `Extract shared Focus line components`.
2. **Tabular-numerals fix.** In the allowed files, remove `num` and `tabular-nums` from prose (spec §1): Today's due caption, status labels, history times, the snooze menu time, and the agent card caption in `mend-shell.tsx`. Commit: `Keep tabular numerals off prose`.
3. **Rebuild Follow-ups** per spec §2: header, toolbar, the list (using the shared pieces) and the outcome-pad detail.
   - Keep the search debounce, pagination, notifications, the 30-second clock, `?selected=`, `saveProfile`, the Sheet below 1100px, and `refreshQueueCounts`.
   - `FollowUpDetail` may be rewritten into the outcome-pad layout, but it must send exactly the same commands and profile payload as today.

   Commit: `Rebuild Follow-ups as the Focus line`.

## Stage 2: RCC Dispatch
**Allowed:**
- `components/rcc/workbench.tsx`
- `components/rcc/expedite-form.tsx`
- `components/rcc/technician-review.tsx`
- `components/rcc/quick-follow-up.tsx`
- `components/rcc/readiness-checklist.tsx` (new)
- `components/rcc/route-card.tsx` (new)
- `app/globals.css` (only to add `.mend-check` and to remove the now-unused `.rcc-template-reveal`)
- `components/focus-line/filter-tabs.tsx` (only if a small prop is needed)

**Steps:**
1. **Workbench switcher and the `.mend-check` checklist component** (spec §3.1 and §3.4). Commit: `Add RCC readiness checklist and tool tabs`.
2. **Appointment expedite** per spec §3.2. Keep every handler as it is: `prepare`, `save`, `copyFormatted`, the downloads, `restoreLast`, `newRequest`, `savePrefs` and Ctrl+Enter. Commit: `Rebuild Appointment expedite side by side`.
3. **Technician review and Quick follow-up** per spec §3.3. Commit: `Align Technician review and Quick follow-up`.

## Stage 3: Cases and New follow-up
**Allowed:**
- `components/cases/queue.tsx`
- `app/(desk)/cases/page.tsx`
- `components/follow-ups/form.tsx`
- `app/(desk)/follow-ups/new/page.tsx`
- `components/focus-line/*` (small additive props only)

**Steps:**
1. Cases per spec §4. Commit: `Rebuild Cases in the Focus line style`.
2. New follow-up per spec §5. Commit: `Restyle New follow-up with line preview`.

## Stage 4: Schedule, Settings, Ask Mend, auth, admin, skeletons
**Allowed:**
- `components/schedule/*`
- `components/account/*`
- `components/ai/*`
- `components/auth/*`
- `components/admin/*`
- `components/workspace-skeleton.tsx`
- `app/(desk)/*/loading.tsx`
- `app/(desk)/loading.tsx`
- `app/login/page.tsx`
- `app/change-password/page.tsx`
- `app/(desk)/schedule/page.tsx`
- `app/(desk)/settings/page.tsx`
- `app/(desk)/admin/users/page.tsx`
- `components/mend-shell.tsx` (copy and `num` only)

**Steps:**
1. Schedule. Commit: `Restyle Schedule for Focus line`.
2. Settings and admin users. Commit: `Restyle Settings and admin`.
3. Ask Mend. Commit: `Restyle Ask Mend`.
4. Sign-in and change password. Commit: `Restyle sign-in`.
5. Skeletons, plus a final sweep of all files edited in Phase 2 for `·` metadata strings, all-caps labels and `num` on prose. Commit: `Match skeletons and sweep copy`.

## Report (end of every stage; paste exactly this structure)
```
STAGE: <n>
COMMITS: <sha message> (one per line)
FILES: <git diff --stat <stage base>..HEAD>
CHECKS: test <pass/fail> | lint <pass/fail> | tsc <pass/fail> | build <pass/fail>  (paste errors if any)
BEHAVIOUR KEPT: <list the handlers/flows you moved and confirm they are unchanged>
STOP-AND-REPORT ITEMS / DEVIATIONS / GUESSES: <list or "none">
VISUAL CHECK: <what you verified in a browser, or "not verified">
```
