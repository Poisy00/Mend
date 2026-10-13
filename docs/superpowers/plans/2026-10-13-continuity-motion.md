# Continuity and motion: build brief for Sonnet

**Spec, the source of truth:** `docs/superpowers/specs/2026-10-13-continuity-motion-design.md`. Read it fully first.
**Base commit:** the current `HEAD` of `design-system-v2`. Record it.

## Hard rules
- **Allowed files:**
  - `components/ui/sliding-indicator.tsx` (new)
  - `components/focus-line/*`
  - `components/ui/segmented.tsx`
  - `components/mend-shell.tsx`
  - `components/mend-link.tsx`
  - `components/today/*`
  - `components/follow-ups/*`, including a new `new-follow-up-dialog.tsx`
  - `components/cases/queue.tsx`
  - `components/schedule/*` and `components/account/*`, only to adopt the shared indicator
  - `components/ui/dialog.tsx`, only to add the overlay and entrance styling, if it can't be done with classNames
  - `app/globals.css`
  - `app/(desk)/page.tsx`
  - `app/(desk)/follow-ups/page.tsx`
  - `app/(desk)/**/loading.tsx` (delete them, or apply the fallback as the spec says)
  - `components/workspace-skeleton.tsx`
  - `components/auth/login-form.module.css`, only if the view-transition naming needs adjusting
- **Never edit** `lib/`, `app/api/`, `db/`, `drizzle/`, `tests/`, `scripts/`, `package*.json`, `prototypes/` or `app/layout.tsx`. `app/layout.tsx` has the user's own uncommitted React Grab changes: never stage or commit it, and leave `package*.json` unstaged too.
- **No behaviour or data changes** beyond what the spec names. No new dependencies; don't use framer-motion. Use CSS transitions and a little React.
- **Ambiguity, or a spec/code conflict:** stop and report. Don't guess. **The spec §3 experiment has a defined stop point.** Respect it.
- **Commits:** one per step, with the exact messages and the trailer `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`. Never amend, push or use `--no-verify`. Never edit tests.
- **Checks at the end:** `npm test`, `npm run lint`, `npx tsc --noEmit` and `npm run build`. All must pass.
- **Browser verification:** use the built-in browser tools on `http://localhost:5173`, where the user is signed in.
  - Never type credentials or sign in or out yourself.
  - Never create real follow-ups by submitting the dialog. Verify up to the point of submit, and say so.
  - **For step 5** you can't sign in, so verify statically: there's exactly one named element per layout, and the CSS is present. Say "flight not run end to end".

## Steps
1. **Sliding indicator** (spec §1). Build the hook and component, then adopt them in FilterTabs, Segmented, the sidebar nav (desktop and mobile sheet), and any other custom single-select highlight you find. List each one in the report. Commit: `Add morphing selection indicator`.
2. **No flash on filter or selection** (spec §2). Commit: `Crossfade lists and panels instead of remounting`.
3. **Navigation continuity** (spec §3). Run the experiment and report what you observed. Commit: `Keep the current page during navigation`.
4. **New follow-up dialog** (spec §4). Commit: `Open New follow-up as a dialog`.
5. **Restore the sign-in logo flight** (spec §5). Commit: `Restore sign-in logo flight`.

## Report (paste exactly this structure)
```
BASE: <sha>
COMMITS: <sha message> (one per line)
FILES: <git diff --stat BASE..HEAD>
CHECKS: test | lint | tsc | build  (pass/fail, errors if any)
INDICATOR ADOPTED IN: <list of controls>
NAV EXPERIMENT: <what happened with startTransition + no loading.tsx; which path (a/b or fallback) shipped>
VISUAL CHECK: <per step: what you verified in the browser, widths/themes, reduced motion, or "not verified">
STOP-AND-REPORT ITEMS / DEVIATIONS / GUESSES: <list or "none">
```
