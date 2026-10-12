# Mend: Focus line design, Phase 2 (all remaining pages)

**Date:** 2026-10-13
**Status:** Approved by user. The direction is final: "UI is decided".
**Builds on:** `docs/superpowers/specs/2026-10-13-focus-line-design.md` (Phase 1: tokens, font, type and Today).

**Visual references.** Open these in a browser. The prototype is the reference for look and behaviour; where it and this spec disagree, this spec wins.
- `prototypes/redesign/follow-ups.html`, **variant A · Outcome pad**.
- `prototypes/redesign/rcc.html`, **variant A · Side by side**, with the checklist change in §3.4.
- `prototypes/redesign/today.html` D, for the shared line and row anatomy.

## Decisions
1. **Follow-ups** uses variant **A · Outcome pad**. The user liked both A and B and didn't pick. A is the default because it matches Today's panel and works best with the keyboard.
2. **RCC Dispatch** uses variant **A · Side by side**.
3. The readiness checklist's **green tick is out of the design system.** It gets iris colours and a subtle animation (§3.4).
4. Every other page (Cases, New follow-up, Schedule, Settings, Ask Mend, sign-in, change password, admin users, loading skeletons) adopts the Focus line language. None of them gets a new prototype.
5. Behaviour, data, routes and API calls stay unchanged everywhere. This is a visual and interaction-layer redesign only.

## 1. Rules that apply everywhere
- **Tabular numerals.** Schibsted Grotesk renders `. , :` at tabular width under `tabular-nums`, so prose wrapped in it shows gaps ("late . 2 due now ,").
  - Use `num` or tabular-nums **only** on standalone numerals that need column alignment: time gutters, count chips, IDs, phone and account values, and key-number badges.
  - **Never** use them on sentences, captions such as `dueCaption`, status labels, history times, date and time strings with commas, or the agent card caption.
- **Copy.**
  - Sentence case everywhere; no all-caps labels. This includes the RCC template groups, which become "Connectivity", "Appointment and retention" and "Special cases".
  - No middle-dot (`·`) metadata strings in UI copy; use commas or separate elements.
  - No arrow suffixes in labels. An `ArrowUpRight` icon on links that open a new tab is fine.
  - Email templates under `lib/` are out of scope and stay unchanged.
- **Page header.** The eyebrow (`t-eyebrow`, sentence case), then `t-title`, then a `t-body` description in text-secondary. Actions sit top right. This is the existing `PageHeader`; keep using it.
- **Filter tabs.** A shared component extracted from Today: a segmented strip on `--secondary`. The active tab is a raised `--sheet` segment, and optional count chips are tinted overdue, due, accent or done. Use it for every tab or filter strip: Today, Follow-ups, Cases, RCC tools, and the RCC Route control.
- **Rows.** The Focus line anatomy:
  - a time or date gutter, a spine with a node, then title and ID, subtitle, and a right-hand label
  - hover actions only under `hover-fine`
  - the selected row uses `bg-accent`
- **Detail panel.** A sticky 380–400px column at 1100px or wider, using the `.mend-pane` entrance:
  - status pill, then a 24px heading, then the subtitle
  - a callout for the primary value
  - a 2-column `dl` of facts with copy buttons
  - actions, then history as a `grid-cols-[80px_1fr]` list

  Below 1100px, the existing Sheet is used, full width.
- **Motion.** Only the existing motifs (stitch-then-collapse, `.mend-pane`), the shared iris check (§3.4) and the existing durations and easing. Respect `prefers-reduced-motion`.
- **Accessibility.** Keep every existing ARIA role, label and live region. Hit targets are at least 40px. Focus rings stay visible.

## 2. Follow-ups (`/follow-ups`), variant A
- **Header**
  - The eyebrow "Callbacks" and the title "Follow-ups".
  - The summary line uses the same wording as the Today headline. Late items render in the overdue colour, then "{n} due now, {n} within the hour." Thresholds come from `classifyFollowUp`, unchanged.
  - Actions: "New follow-up" (primary) and a quiet "Browser reminders" switch (the existing `enableNotifications` logic).
- **Toolbar**
  - The search field (existing debounce and API).
  - Filter tabs: All, Late, Due now, Soon, Later and Completed, with counts.
  - The result count.
- **List**
  - The Focus line, sharing components with Today: time gutter, nodes, a Now row (only under All with no search), day dividers, and hover Resolve and Snooze.
  - Completed items appear only under Completed, with a done node and the name in secondary text.
  - "Load more follow-ups" is kept.
- **Detail panel (outcome pad)**
  1. Status pill, plus an "Urgent" tag when `priority === "urgent"`. Then the name (24px) and the reason.
  2. The callback-number callout with copy, as on Today.
  3. "How did the call go?"
     - **Resolved** is full width and primary, with Kbd `E`.
     - A 2×3 grid of outcome buttons, each with a key badge and secondary text:
       - `1` Busy, "Back in 10 min" (`busy`)
       - `2` No answer, "Asks about voicemail next" (`no_answer`)
       - `3` Follow up, "+30 min" (`follow_up`)
       - `4` Escalation, "+30 min" (`escalation_required`)
       - `5` Wrong number, "Closes it" (`wrong_number`)
       - `6` "Pick a time…", which expands the existing datetime picker and Reschedule (`reschedule`)
     - When `voicemail_required`, the pad becomes "Did you leave a voicemail?" with **Yes, left one** and **No voicemail** (`confirm_voicemail`).
     - When closed, the pad becomes **Restore follow-up** (`restore`).
  4. Facts: Account and Case with copy; Due, with the zone written as "Cairo" or "New York"; then Appointment, Promise and Complete when, each only if set.
  5. Context (notes), then History (all events, newest first).
  6. Footer:
     - **Edit profile** toggles the existing profile form, inline, with the same fields and submit.
     - **Save as Case** is the existing `SaveCaseDialog`.
     - **Cancel follow-up** is a quiet destructive text button with inline confirmation ("Cancel this follow-up?", then Yes or Keep), sending `cancel`.
- **Keyboard** (1100px or wider, with the same guards as Today): J/K and ↑/↓ move, `E` resolves, `S` snoozes, `1`–`6` run the outcomes, and `Esc` clears the selection.
- **Undo**
  - Resolve: a toast with Undo, sending `restore`. This is the same logic as Today, so share it.
  - Snooze: the same Undo as Today.
  - Other outcomes keep their current toasts.
- Resolve plays stitch-then-collapse.

## 3. RCC Dispatch (`/rcc`), variant A
### 3.1 Workbench
- The tool switcher (Appointment expedite, Technician review, Quick follow-up) uses the shared filter tabs, with no counts.
- Keep the `?tool=` URL sync and the tab ARIA wiring (`role=tab`, `tabpanel`, ids).

### 3.2 Appointment expedite
- **Header.** "Appointment expedite", "Prepare a clear request.", the existing description. An outline "Recipients and signature" button opens the existing dialog, with the same fields and save.
- **Previous prepared request** strip:
  - a quiet `--secondary` card showing the account and reason as separate elements, with no middle dot
  - Restore draft, Open Outlook and Save as Case
- **Notice.** A status message styled as an accent-wash callout.
- **Left column**
  - **"Start from a template":** grouped chips (three sentence-case groups). The selected chip uses an accent wash and the primary text colour. Clicking one applies `applyExpediteTemplate` and toasts, as now. This replaces the disclosure browser.
  - **Customer:** Account number, Callback number, Customer name.
  - **Appointment:** date, window, the custom window when needed, and **Route** as filter tabs (Automatic, Long Island, Nassau). The old select is replaced, and its values stay the same.
  - **Request:** Reason (select), Case summary, Action requested.
- **Right column** (sticky)
  1. The **route card**: `route.name`, a small tag "Automatic" or "Override", then "{NY clock} ET, {countdown} to Long Island cutoff" (or "after cutoff"), then the recipient, then `route.warning` if any. Compute the clock and countdown in the component from `newYorkClock(new Date())` (imported from `lib/rcc/expedite-routing.ts`, not modified), refreshed every 30 seconds. The cutoff is 15:00 NY.
  2. The live document preview, unchanged in content and `--document` colours.
  3. The readiness checklist (§3.4).
  4. Suggestions, excluding the route warning (already in the card), as text-secondary lines with a small due-colour dot.
  5. Actions:
     - **Open in Outlook** (primary, Kbd Ctrl Enter)
     - **Copy formatted email**
     - **More options** as a dropdown: Download HTML, Download .eml, Restore last prepared, New request
     - The existing "Edit manually" moves into More options
  6. The existing autosave status and the disclaimer line.
- **Below 1100px:** Compose and Preview as filter tabs, as now.
- **Logic unchanged:** `prepare`, `save`, autosave, handoffs, popup handling, copy, downloads, Ctrl+Enter.

### 3.3 Technician review and Quick follow-up
- The same two-column pattern and section labels, and the same document-paper styling. Actions sit under the document.
- **Technician review**
  - Situations become checkbox rows, with the checked row washed.
  - Customer reports and Internal records are two labelled sections.
  - "Information to reconcile" is a `--secondary` card with outline action buttons.
  - Blockers render with the §3.4 checklist item style, unmet.
  - The stale-draft notice is an accent callout.
- **Quick follow-up:** the short form plus the document.
- Logic is unchanged in both.

### 3.4 Readiness checklist (replaces the green tick)
- **Items**, in a two-column grid: Account number, Callback number, Appointment date, Appointment window, Reason, Case summary, Action requested, and "{Long Island|Nassau} recipient".
- **Met or unmet.** An item is met when `assessExpedite(...).blockers` holds no message for it. Map each blocker message string from `lib/rcc/expedite-readiness.ts` to its item in the component, without editing `lib`. When an item is unmet *and* its field has a value, show the specific blocker text as a caption, for example "Enter a 13-digit account number".
- **Unmet:** a 16px hollow ring (1.5px `--control-edge`), with the label in text-primary.
- **Attempted:** after a failed Open in Outlook or Ctrl+Enter, unmet rings and labels switch to `--status-overdue`. They go back to neutral once met. Keep the current toast.
- **Met:** a 16px circle filled with `--accent`, holding a 2px `--primary` check, with the label in text-secondary. **No green.**
- **Animation, unmet to met only:**
  - The circle scales from 0.6 to 1 and the check stroke draws in (`stroke-dashoffset`) over 220ms with `var(--ease-out)`. There's no animation on first render or when going from met to unmet.
  - Under reduced motion, the colour crossfades over 120ms, with no scale or draw.
  - The CSS lives in `app/globals.css` as `.mend-check` and is shared by RCC and anywhere else a checklist appears.
- A heading above the list reads "{n} of 8 ready", using `num` only on the numbers.

## 4. Cases (`/cases`)
- **Header:** "Saved work", "Cases" and the existing description.
- **Toolbar:** search, filter tabs (All, Open, Follow-up scheduled, Handoff prepared, Closed; no counts, since filtering is server side), and the result count.
- **List rows** use Focus line anatomy. The gutter shows the last-updated date ("Today", "Yesterday", or "Oct 9"; times for today). The node colour follows the status:
  - Open: hollow iris
  - Follow-up scheduled: filled due
  - Handoff prepared: filled iris
  - Closed: done, with secondary text

  There's no Now row and no day dividers.
- **Detail panel** follows the shared anatomy: pill, name, summary, facts with copy, then the existing actions (Reopen or Close Case, Delete Case with its existing confirm), then history. Keep every existing action and behaviour.

## 5. New follow-up (`/follow-ups/new`)
- The form uses RCC's section pattern: Customer, Callback, Context.
- Same fields, validation and submit.
- At 1100px or wider, a right column shows a live **"In your line"** preview. It's a single Focus line row (time gutter, node, name, reason) built from the typed values. It's purely presentational.

## 6. Schedule, Settings, Ask Mend, auth, admin and skeletons
- **Schedule**
  - Keep the layout and logic. Apply the header, filter tabs and section labels.
  - The shift timeline uses tokens: the shift in `--accent` with a `--primary` edge, and breaks in `--secondary`.
  - No all-caps or middle dots; times use `num` only in time columns.
- **Settings:** sections become rows on the sheet, with a 240px label and description column on the left and controls on the right, separated by `--border` rules. Same controls and logic.
- **Ask Mend:** the panel and composer use tokens and type. Assistant messages sit on the sheet, user messages on `--secondary`. The empty and disconnected states use the shared empty-state style. Logic unchanged.
- **Sign-in and change password:** centered on `--desk`, with a `--sheet` card, the logo, a `t-title` heading, and a primary iris button. Same fields and logic.
- **Admin users:** header plus rows in the shared style.
- **Loading skeletons** (`components/workspace-skeleton.tsx`, the `loading.tsx` files) mirror the new row and panel shapes.
- **Shell:** the sidebar already matches. Only fix `num` on prose in the agent card and the middle dots, if any.
