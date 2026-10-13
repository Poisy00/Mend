# Focus line Phase 2: Follow-ups and RCC prototypes (task brief)

**Base commit:** `c11329e`
**Output:** two standalone HTML prototypes the user opens in a browser and chooses between. **No app code changes.**

## Hard rules
- Create or edit **only**:
  - `prototypes/redesign/follow-ups.html`
  - `prototypes/redesign/rcc.html`
- Don't touch anything else: no `app/`, `components/`, `lib/` or `tests/`, and no `package.json`.
- Each file is self-contained: inline CSS and JS. The only allowed external resource is Google Fonts for Schibsted Grotesk. No frameworks.
- Use **fictional data only**: invented names, `5xxxx-xxxxxx-xx` accounts, `555-` phone numbers and `example.com` emails. Never use real customer data.
- **Visual language:** copy prototype D from `prototypes/redesign/today.html`. Read its `.A` / `.D` CSS, `renderD`, `rowD` and `detailD` first, and reuse them:
  - the same tokens, light and dark
  - the type scale
  - the time gutter, spine and nodes
  - the filter tabs with tinted count chips
  - the selected-row wash
  - the detail panel and the toast
  - the light/dark toggle

  Both new prototypes must look like siblings of Today D.
- **Copy rules:**
  - Sentence case everywhere; no all-caps labels.
  - No middle-dot metadata strings and no arrow suffixes.
  - Plain, calm wording.
- **Quality:**
  - The page works at 375px (no horizontal scroll) and at 1280px+.
  - Hover actions appear only on fine pointers.
  - Visible focus rings.
  - Hit targets of 40px or more.
  - Respect `prefers-reduced-motion`.
  - Motion is limited to Today's stitch-then-collapse on resolve and the panel entrance.
- Each file has a small fixed switcher (top right, like `today.html`) for **variant A/B** and **light/dark**.
- If something in this brief is unclear, or conflicts with `today.html`: **stop and report**. Don't guess, and don't add features beyond this brief.
- Make one commit at the end: `Add Follow-ups and RCC Focus line prototypes`, with the trailer `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`. Never amend, push or use `--no-verify`.

## 1. `follow-ups.html`
This is the full management page; Today is the glance view. It includes 14 fictional follow-ups:
- 3 late, 2 due now, 3 soon and 3 later (some tomorrow, one on a weekday)
- 3 completed
- one in a `voicemail_required` state, one `urgent`, one with an appointment window, and one with promise and "Complete when" text

**Shared by both variants**
- **Header:** the eyebrow "Callbacks", the title "Follow-ups", and a summary line in the Today style ("Three callbacks are late. 2 due now, 3 within the hour."). On the right are the "New follow-up" button and a quiet "Browser reminders" toggle.
- **Toolbar:**
  - A search field that filters by name, account or case.
  - Filter tabs All / Late / Due now / Soon / Later / Completed, with counts.
  - A result count.
- **The list** is Today's Focus line:
  - time gutter, spine nodes, a Now row (only under All with no search), and day dividers
  - completed items appear only under the Completed tab, with a done node and the name in secondary text
  - hover actions for Resolve and Snooze
  - the selected row is washed
  - J/K/E keys like Today
- **Below 1100px:** tapping a row opens the detail as a full-screen sheet with a back button. There's no side panel.
- **Empty states:** "Nothing in this filter." / "No matching follow-ups." with the line "Try a name, account or case number."

**Variant A · Outcome pad.** A 400px sticky panel, top to bottom:
1. The status pill, then the name as a 24px heading, then the reason. Urgent items get a small "Urgent" tag.
2. The callback-number callout with a copy button, as on Today.
3. **"How did the call go?"**
   - **Resolved** is the full-width primary button (key `E`).
   - Below it, a 2×3 grid of outcome buttons. Each shows a key number and its effect as secondary text:
     - `1` Busy, "Back in 10 min"
     - `2` No answer, "Asks about voicemail next"
     - `3` Follow up, "+30 min"
     - `4` Escalation, "+30 min"
     - `5` Wrong number, "Closes it"
     - `6` "Pick a time…", which expands an inline date-time field and a Reschedule button
   - For a `voicemail_required` item, the pad is replaced by "Did you leave a voicemail?" with **Yes, left one** and **No voicemail**.
   - For completed items, it's replaced by **Restore follow-up**.
4. **Facts list:**
   - Account and Case, each with copy
   - Due, with the zone written as "Cairo" or "New York"
   - Appointment, Promise and Complete when, shown only if set
5. **Context** (notes).
6. **History** as a mini spine of events with times, all events shown.
7. **Footer row:**
   - **Edit profile** turns the facts into inline inputs, with Save and Cancel.
   - **Save as Case.**
   - **Cancel follow-up** is a quiet destructive text button that asks for confirmation inline.
8. Every outcome shows a toast with Undo, like Today. Resolve plays the stitch-then-collapse.

**Variant B · Tabs.** Same list. The panel has a fixed header (status, name, reason, number callout) and three tabs below it:
- **Call:** outcomes as a vertical list of full-width rows (label left, effect right, key number), with Resolved first and primary.
- **Details:** the facts, always editable in place. Each field saves on blur, with a small "Saved" confirmation.
- **History.**

  Save as Case and Cancel sit at the bottom of the Call tab.

## 2. `rcc.html`
The domain rules must be reproduced exactly; they are the point of this page:
- **Route, automatic mode:** **RCC Long Island** if the New York time is before 3:00 PM *and* the appointment date is today in New York. Otherwise **Nassau Quota**. The user can override to Long Island or Nassau.
- **Warnings, shown as suggestions, not blockers:**
  - Long Island after the cutoff: "Long Island cutoff has passed; Nassau is recommended. Approved exceptions can still continue."
  - Long Island with a future date: "Long Island can expedite a currently scheduled appointment to today before 3:00 PM ET."
  - Nassau with today's or a past date: "Nassau appointments should start from the next available date."
- **Blockers:** account `ddddd-dddddd-dd`, callback `ddd-ddd-dddd`, date present and not past (Nassau needs a later date than today), window (or a custom window), reason, summary, action, and a recipient configured for the route.
- **Suggestion:** "Consider adding more case detail" when the summary is under 80 characters.
- Account and phone auto-format while typing.
- **Templates** set the reason and summary: No Internet, Area Outage, Service Degradation, Repeat Trouble Call (group "Connectivity"); Missed Appointment, Cancellation Risk ("Appointment and retention"); Business Customer, Property Damage ("Special cases"). Copy the summaries from `lib/rcc/expedite-templates.ts` (read only).
- **The email preview** stays a white "paper" document, **even in dark mode**: To, Subject, a rule, then the body. Typing updates it live.
- **Open in Outlook** is disabled until there are no blockers. Ctrl+Enter triggers it. In the prototype it only shows a toast, "Formatted email copied. Paste it into the Outlook message body." It then shows a "Previous prepared request" strip (account, reason, Restore, Open Outlook, Save as Case) and clears the form.
- A **demo clock control** (inside the switcher, clearly labelled "Demo: NY time") lets the user try 1:40 PM and 3:20 PM ET, so the route logic can be seen.
- **Tool switcher:** Appointment expedite / Technician review / Quick follow-up, styled as Today's filter tabs.
  - Only **Expedite** is fully interactive.
  - The other two show a static but realistic layout in the same pattern:
    - **Technician review:** situation checkboxes, a "Customer reports" and "Internal records" split, and one "Information to reconcile" card, with an editable document on the right.
    - **Quick follow-up:** a short form and the document.
- Under 1100px, there's a Compose / Preview segmented toggle and a single column.
- A "Recipients and signature" dialog edits the Long Island email, Nassau email, name and sign-off.

**Variant A · Side by side**
- Form on the left, with the sticky document on the right.
- The top of the form has a **"Start from a template"** row of grouped chips. The selected chip is washed.
- The form is grouped under quiet section labels: Customer, Appointment, Request.
- Above the document is a compact **route card**: the route name, "Automatic" or "Override", "1:40 PM ET, 1 h 20 min to Long Island cutoff" (or "after cutoff"), the recipient, and the warning if any.
- Under the document:
  - a **readiness checklist** that ticks items as they're satisfied (blockers in the overdue colour until met)
  - then Open in Outlook, Copy formatted email, and "More options" (Download HTML, Download .eml, New request)

**Variant B · Route first**
- A full-width **route strip** under the header: a large route decision ("Sending to Nassau Quota"), the NY clock with a countdown or "after cutoff", an Automatic/Long Island/Nassau segmented override, and the warning inline.
- Below it, three columns at 1280px+ (two columns from 1100px, where the rail becomes a top progress line):
  - a narrow **readiness rail** listing the sections, each with a tick and "n of 7 ready"; clicking jumps to the section
  - the form, with templates as a dropdown menu next to the Reason field
  - the document, with the actions under it

## Report (paste back exactly this structure)
```
COMMIT: <sha> <message>
FILES: <git diff --stat c11329e..HEAD>
VARIANTS BUILT: follow-ups A/B, rcc A/B. Anything missing: <list or "none">
CHECKED: 375px / 1280px / light / dark / keyboard: <what you actually checked, or "not verified">
STOP-AND-REPORT ITEMS / DEVIATIONS / GUESSES: <list or "none">
```
