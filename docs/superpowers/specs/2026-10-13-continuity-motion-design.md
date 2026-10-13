# Mend: continuity and motion (spec)

**Date:** 2026-10-13
**Status:** Requested by the user and written by Opus. Sonnet implements and Opus reviews.

**The user's goal, in their words:** "I need to feel like I'm in the same application… navigating, not getting into a new embedded HTML." Nothing should flash, pop in or pop out. A selected highlight should **morph** to the newly selected item, everywhere in Mend.

**Principles** (from the emil-design-eng, make-interfaces-feel-better and better-ui skills):
- Motion explains spatial change and continuity. It's never decoration.
- Keep it short: 120–260ms, `var(--ease-out)` for movement and opacity for content swaps.
- Animate `transform` and `opacity` only. A sliding indicator may animate `width` and `height` on its own small element.
- Nothing animates on first paint. Motion responds to change.
- Under `prefers-reduced-motion`, positional motion becomes instant and only short opacity fades remain.
- Movement must be interruptible. Rapid clicks retarget from the current position. Use CSS transitions, not keyframes, for anything that can be interrupted.

## 1. Morphing selection indicator (everywhere)
**Problem:** today the active state is a background on the selected element itself. Changing the selection makes it vanish from one item and appear on another.

**Behaviour:**
- Every single-select control draws **one** indicator element, absolutely positioned behind its items.
- On change, the indicator slides and resizes from the old item to the new one: `transform` plus `width`/`height`, 240ms, `var(--ease-out)`.
- Item text colour crossfades over 150ms.
- **First render:** no transition. The indicator is placed instantly.
- **Resize, font load or content change:** reposition without a transition (ResizeObserver).
- **Reduced motion:** no slide. The indicator jumps and the text colour fades.
- The indicator's look matches each control's current active style:
  - **FilterTabs:** `bg-sheet shadow-chip`, a 9px radius.
  - **Segmented:** its current active background.
  - **Sidebar nav:** its current active row style, the white raised row in light mode and the dark-mode equivalent.

**Where it applies:**
- `components/focus-line/filter-tabs.tsx`, which covers every FilterTabs use: Today, Follow-ups and Cases filters, the RCC tool tabs, the RCC Route, Compose and Preview, the Schedule day picker, and any others.
- `components/ui/segmented.tsx`.
- The sidebar nav in `components/mend-shell.tsx`, both the desktop aside and the mobile sheet. The aside persists across navigation, so on a pathname change the indicator slides vertically from the old row to the new one.
  - The count chip stays on its row.
  - The **Ask Mend** item and the agent card are not part of the nav selection.
  - When the current area matches no nav item, the indicator fades out over 150ms rather than jumping.
- Any other single-select highlight found in Mend, such as the Cases status filter or the Settings and Ask Mend model pickers, **if** it's a custom pressed or selected background. Leave Radix menus and selects alone.

**Implementation shape:**
- One shared hook and element: `components/ui/sliding-indicator.tsx`, exporting `useSlidingIndicator(containerRef, activeKey)` and `<SlidingIndicator />`.
- Items mark themselves with `data-indicator-key`.
- Only the indicator element is given a transition.
- The active item keeps `aria-selected` / `aria-pressed` / `aria-current` exactly as now.

## 2. No flash when filtering or selecting
- **Filter change** (Today, Follow-ups, Cases): the list doesn't hard-swap. The list container fades in over 140ms (opacity 0.4 to 1), keyed by the filter, with no translate. The Now row and day dividers follow the same fade.
- **The empty state** fades in the same way.
- **Detail panels** (Today `FocusDetail`, Follow-ups detail, Cases detail):
  - The `.mend-pane` entrance plays **only** when the panel goes from closed to open.
  - When the selection moves to another item (click, J or K), the panel stays mounted. Its content crossfades over 120ms with no slide. Remove the `key={item.id}` remount, or move it to an inner content wrapper that only fades.
  - Local panel state, such as edit mode or cancel confirmation, must still reset per item. Reset it explicitly on id change, using the existing render-time adjust pattern.
- **Counts** in chips change instantly; don't animate the numbers.

## 3. Navigation feels like one app
**Problem:**
- Every route under `app/(desk)/` has a `loading.tsx`. Clicking a nav item swaps the whole main area to a skeleton immediately, then the page pops in.
- `components/mend-link.tsx` calls `router.push` directly. Native `next/link` is avoided on purpose, because Vinext prefetch fails in production, so leave that alone.

**Target behaviour:**
1. When you click a nav link, the **current page stays on screen**.
   - The sidebar indicator slides to the new item **immediately**: it reflects the pending destination, so set an optimistic active area on click.
   - After 120ms of waiting, a 2px iris progress line appears at the top edge of the sheet and the main content dims to `opacity: .6`. If the page arrives sooner, neither appears.
2. When the new page arrives, it **enters** over 200ms (opacity 0 to 1, `translateY(6px)` to 0). This plays only on a pathname change, not on `?tool=` or `?selected=` changes.
3. **No skeleton flash** on normal in-app navigation.
4. Browser back and forward behave the same.

**Mechanism.** This is the implementer's experiment, and must be verified in the browser:
- **a)** Wrap `router.push` / `router.replace` in `MendLink` (and the shell's nav) in React `startTransition`. Expose `isPending` through a small context from `MendShell`, and drive the progress line and dim from it.
- **b)** Remove the `app/(desk)/**/loading.tsx` files, so that no Suspense fallback replaces the current page.
  - Verify in the running dev app (`http://localhost:5173`, signed in) that the old page really stays visible until the new one is ready.
  - **If Vinext still blanks or flashes the page, stop and report** with what you observed. Don't invent a workaround.
  - The fallback is to keep `loading.tsx` but make the skeleton wrapper invisible for its first 300ms (`animation: fade-in 200ms 300ms both`).
- **c)** Implement the page entrance in `MendShell` as a wrapper around `children`, keyed by `usePathname()`. Don't key on search params.
- `WorkspaceSkeleton` is kept for the fallback path and for any remaining Suspense boundaries.

## 4. New follow-up opens as a dialog
- **Triggers:** every "New follow-up" button or link inside the desk (Today header, Follow-ups header, and any other found by grepping `/follow-ups/new`) opens a **dialog** instead of navigating.
- The `/follow-ups/new` route keeps working for direct visits and refreshes, rendering the same form as a page.
- **Dialog:**
  - Uses `components/ui/dialog.tsx`, 680px wide, with a 16px gutter on mobile. Below 640px it becomes a full-height sheet.
  - **Overlay:** `rgba(0,0,0,.40)` in light mode, `.60` in dark.
  - **Entrance:** overlay fade, 200ms. Content: opacity 0 to 1, scale .96 to 1 and `translateY(8px)` to 0, over 220ms with `var(--ease-out)`, transform-origin at the centre.
  - **Exit:** 160ms, reversed.
  - **Reduced motion:** fades only.
- **Structure:**
  - **Header:** the title "New follow-up", the description "Capture what to call about and when.", and a close button.
  - **Body:** the scrollable form. This is the **only** scroll region.
  - **Footer:** sticky, with Cancel (ghost) and Create follow-up (primary), and a Kbd Ctrl Enter submit hint.
  - At the top of the body, a compact **"In your line" preview row**, the same component as the page preview.
- **Data:**
  - On open, fetch `GET /api/follow-ups/draft` for the initial draft, and show field skeletons until it arrives.
  - Autosave works exactly as on the page. Closing keeps the draft.
- **Focus:** the first empty field gets focus on open. On close, focus returns to the trigger. Esc closes.
- **On successful create:**
  - The dialog closes and the existing success toast shows.
  - **Today** calls `router.refresh()`.
  - **Follow-ups** refetches its list and selects the new item, if the create response returns it. Otherwise it just refetches.
  - No route change.
- **Form component:** `FollowUpForm` gets optional props `variant: "page" | "dialog"` and `onCreated?: (item?) => void`.
  - The page variant behaves exactly as now.
  - The dialog variant renders no `PageHeader` and no side preview column, since the preview moves to the top.
  - Submit logic, validation and payload are unchanged. The only change is what happens after success.

## 5. Sign-in logo flight (restore)
**History:**
- Commit `631c335` added a cross-document View Transition: `@view-transition { navigation: auto }`, with a `view-transition-name: mend-wordmark` on both the login logo and the sidebar logo.
- Commit `1cfa1f6` deleted `app/(desk)/today-transition.css` and the sidebar's name during a navigation refactor, so the logo stopped flying.
- The login logo still has `view-transition-name: mend-wordmark` (`components/auth/login-form.module.css`).
- Login finishes with `window.location.replace("/" or "/change-password")`, a real document navigation.

**Restore:**
- In `app/globals.css`, add `@view-transition { navigation: auto; }`. It applies only to same-origin document navigations: sign-in to app, and sign-out to login. Client-side navigation is unaffected.
- Give the shell logo `view-transition-name: mend-wordmark` through a CSS class:
  - the **desktop sidebar logo** at 768px and wider
  - the **mobile top-bar logo** below 768px

  Exactly one visible element may carry the name. The mobile sheet logo never does.
- **Choreography:**
  - `::view-transition-group(mend-wordmark)`: 620ms `cubic-bezier(.2,.8,.2,1)`. The logo flies and scales from the card's centre-top into the sidebar's top-left.
  - `::view-transition-old(mend-wordmark)` and `::view-transition-new(mend-wordmark)`: crossfade over the same 620ms, `height:100%; object-fit:contain`, so the different filters (login versus `.mend-logo` brightness and invert) blend.
  - `::view-transition-old(root)`: fade out over 220ms. `::view-transition-new(root)`: fade in over 320ms with an 80ms delay.

  The desk appears around the flying logo.
- **Sign-out:** the reverse happens automatically, with the sidebar logo flying back into the card. Accept that as is.
- **`/change-password`:** it has no shell logo, so the logo just crossfades. Accept that.
- **Reduced motion:** `@media (prefers-reduced-motion: reduce) { @view-transition { navigation: none; } }`.
- **Browser support:** Chromium 126+. Other browsers simply navigate, with no polyfill.
- The login success phase and its timings must stay exactly as they are. Navigation still happens where it does now.
