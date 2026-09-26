# Mend — Tier 2 Operations Desk Design Spec

**Date:** 2026-09-26

**Status:** Written for user review

**Repository:** [Poisy00/Mend](https://github.com/Poisy00/Mend)

## Intent

Build **Mend**, one real, Sites-hosted workspace for Tier 2 cable and internet support agents. An agent should be able to see the next useful item immediately, finish a FollowBack or RCC task during a call, and trust that saved work is private and recoverable. The interface should feel calm and carefully made over an eight-hour shift. Success means both existing workflows work in the new site, with a coherent visual system and no mock data or fake interactions.

The new site starts from a fresh **Sites Vinext starter**. The two existing Sites are read-only references for rules and tests, and remain live and unchanged. The new site has fresh accounts and data; there is no import from either old Site. The output is a full multi-route web application, not a standalone HTML file. An agent can work directly in either workflow; saving a result as a Case is optional afterward.

This spec incorporates the approved UI direction and the requested replacement of orange with the **iris ink** palette. It defines one launch experience, not separate Tier II and WhiteGlove appearances. A NOC writing helper is a later feature.

## Source authority and implementation approach

The latest user decisions in this spec override the original single-file prototype brief. Verified business rules come from these source snapshots:

- FollowBack source checkout, commit `74a2a8faddf1eca31284fcc05f420e32ccfa7dd1`.
- RCC Dispatch source checkout, commit `67a3b28c4f1c4d9e0548b1a946e2a7bf9636d494`.

Rebuild the interface in the starter and port the proven calculation, validation, email-generation, privacy, and authentication behavior into focused modules. Do not copy either old visual system wholesale. Keep workflow rules independently testable, with the page components responsible for presentation and interaction rather than date or routing decisions.

The new app has five product areas: **Today**, **Follow-ups**, **RCC Dispatch**, **Cases**, and **Schedule**. Account settings and administrator user management live under the account menu. Public visitors see the sign-in page; signed-in agents see Today.

The product is one release with four independently verifiable milestones: (1) starter, account system, shared shell and visual system; (2) FollowBack and Schedule; (3) the three RCC tools; (4) optional Cases and cross-workflow integration. Each milestone can be previewed and tested, while the release is complete only when all four meet the criteria below. The implementation plan may split these milestones into separate plans with explicit interfaces.

## Architecture and state ownership

| Unit | Responsibility | State and boundary |
| --- | --- | --- |
| Account service | Login, sessions, account administration, recovery and audit | D1; server-only authentication and authorization |
| FollowBack service | Callback transitions, history, priority and schedule calculations | D1 records owned by one agent; pure time rules tested separately |
| RCC rules and drafts | ET routing, readiness, email generation and Outlook handoff | Pure rules plus private encrypted drafts; Outlook send remains outside the app |
| Case service | Optional saved record and event history linking a finished workflow | D1 records owned by one agent; no Case is created by autosave |
| Shared UI | Navigation, queue/detail layout, forms, theme, feedback and motion | React components consume the services; they do not decide routing or security |

For a write, the form validates locally, sends one authenticated command, the server checks ownership and the workflow rule, and the response updates both list and detail. The server is authoritative; client feedback cannot claim completion before it confirms the write. Outlook preparation is a separate client handoff after the server-side readiness result.

## Visual system

The visual thesis is a **calm operations desk**: warm paper, deep ink, fine dividers, compact but readable rows, and a restrained iris accent for selection and primary action. The distinctive motif is a narrow iris rule that connects the selected queue row to its detail header. There is no card wall, marketing hero, decorative illustration, or ornamental motion on the work surface.

| Token | Light | Dark | Use |
| --- | --- | --- | --- |
| Canvas | `#F8F7F5` | `#17181B` | Main workspace |
| Raised surface | `#FFFFFF` | `#1F2024` | Forms, menus, detail surfaces |
| Text | `#1B1B18` | `#EDEBE6` | Primary copy |
| Muted text | `#5A5955` | `#B8B6B0` | Secondary metadata |
| Divider | `#E7E4DD` | `#2B2C30` | Rows and panel boundaries |
| Iris accent | `#5B456F` | `#CBAEE0` | Primary actions, selected row, links, focus |
| Accent foreground | `#FFFFFF` | `#17181B` | Text on iris buttons |
| Selection wash | `#F2EDF5` | `#2E2935` | Selected row and quiet emphasis |
| Focus ring | `#5B456F` | `#CBAEE0` | 2px ring with canvas offset |
| Success text | `#146C48` | `#83D4A5` | Completed or ready |
| Warning text | `#835A10` | `#F2C77B` | Due soon or advisory |
| Danger text | `#B13A31` | `#F39A91` | Overdue or blocking |

White on light iris is about 8.3:1; dark ink on dark iris is about 9.0:1. Status text colors exceed 4.5:1 on the canvas. Every status also has a word or icon, so color is never the only signal. Use status colors for status meaning; do not turn entire panels into broad color fills.

Use one locally bundled **Geist Sans Variable** family across the app, with a system sans fallback while the font loads. Main text is 16px or larger, routine labels and navigation are at least 14px, and secondary metadata may be 12–13px. Headings use a small deliberate scale, roughly 22–28px for page titles. Apply tabular numerals only to times, counts, and identifiers. Controls should have modest corners, about 8px, and visible focus rings. Avoid all-caps eyebrow labels, middle-dot metadata strings, decorative section numbers, and arrow suffixes on buttons.

Light and dark modes share the same hierarchy and iris identity. The site follows the system theme initially and lets the agent set a preference. There is no WhiteGlove skin or workflow switch.

## Layout and interaction model

- **Desktop, at least 1100px:** a roughly 224px navigation rail and a 60px context bar. Today exposes the next callback and direct actions in the first viewport. Follow-ups and Cases use a dense list/detail split: a roughly 400px queue beside the selected detail. Selecting another row updates the detail without discarding queue position.
- **Below 1100px:** list and detail use one reading column. Opening an item shows its full detail with a clear Back action and returns focus to the originating row when closed. The navigation rail becomes a compact accessible menu on narrow screens.
- **RCC Dispatch:** the active form occupies the left side and a sticky live email preview the right side on wide screens. On smaller screens the same form and preview are available through plainly labelled tabs. Route, cutoff, readiness, and blocking guidance sit beside the fields that cause them.
- **Cases:** private saved records appear as rows with customer, one-line summary, workflow, status, priority, and last activity. Filters for All, Open, Follow-ups due, Handoff prepared, and Closed show live counts; search matches customer name or case ID. Empty accounts get a useful empty state with direct actions, never seeded customer data.
- **Schedule:** a Sunday–Saturday Cairo-time weekly view displays shift, break, lunch, and days off. **Product assumption for user review:** the new app treats this as a repeating weekly pattern rather than the source Site's current-week-only record. A dated exception can override break or lunch without silently changing the pattern.
- **Sign-in:** a focused single-screen composition using the same palette and type. It gives the form priority and avoids promotional copy.

The UI uses the starter's installed Shadcn/Radix primitives for sidebar, tabs, dialogs, sheets, selects, and other matching controls. It uses one root Sonner toaster for transient confirmations and errors. Toasts use active language, stack correctly, dismiss by swipe, and follow the current theme; they do not replace inline validation. `next-themes`, `clsx`, and component variants are used where they reduce UI inconsistency. No new motion library is needed for the planned transitions.

## Motion rules

Use one settle curve for entering and expanding elements: `cubic-bezier(0.32, 0.72, 0, 1)`. Pointer press feedback is 100–160ms with about `scale(0.97)` and a slight brightness change. Optional field reveals take about 180ms; menus and dialogs enter in 180–240ms; narrow-screen detail sheets enter in at most 280ms. Exits take 150–180ms. Animate only opacity and transform for these changes. Reduced-motion mode removes translation and scale and keeps a brief opacity change. Keyboard-triggered actions remain visually stable.

The single deliberate load moment is a queue-shaped skeleton that resolves as one group when real data arrives. No row-by-row entrance, pulsing urgency marker, repeated section entrance, or scroll-pinned effect. Do not insert artificial submit delays: a real pending state keeps the button width fixed and shows an inline spinner only while the request is in flight.

## FollowBack workflow

An agent can create a callback directly with account and phone, optional customer/case/notes, a reason, due time, source time zone (Cairo or New York), context, promise, completion condition, priority, and optional appointment interval. Store the due instant in UTC and show the source zone clearly. The queue distinguishes completed, overdue, now (within five minutes), soon (within sixty minutes), and waiting; it can search customer/account/phone/case/reason/context and recommend the next item using the existing urgency and reason rules.

From a callback detail, the agent can resolve; follow up or escalate with a new due time (default +30 minutes); close a wrong number; mark busy (+10 minutes); record a first no-answer retry (+15 minutes); confirm voicemail explicitly before abandoning a second no-answer; cancel; restore; and edit the profile. Each mutation creates a visible history event. Browser reminders are optional and generic, with an in-page fallback when permission is unavailable. The callback itself persists independently of whether the agent also saves a Case.

## RCC Dispatch workflow

### Appointment expedite

The form captures account, phone, optional customer, appointment date and window, already-scheduled state, reason, case summary, and requested action. It shows the selected recipient and a live plain/rich email preview. Use the **America/New_York** clock, including daylight-saving changes, for the 3:00 PM ET cutoff. Automatic routing selects Long Island only before cutoff for an appointment dated today; otherwise it selects Nassau. Manual force remains available. Long Island after cutoff shows an approved-exception advisory; Nassau on the same day is blocked. Missing required customer, appointment, reason, action, window, or valid recipient data blocks handoff; the source's shorter-content warnings remain advisory.

The agent can prepare a rich Outlook draft, choose a plain draft fallback, or download an `.eml` draft; keep the existing rich-copy and HTML-email export options in an overflow menu. These are email formats inside the full web app, not standalone site deliverables. The generated emails use the shared neutral/iris identity and spell out the receiving team. The app prepares and opens Outlook compose but does not claim an email was sent. If a popup is blocked, the copied draft and clear paste instructions remain available. User-provided text is escaped in generated HTML. After a successful handoff preparation the agent may save the result as a Case, restore the last completed draft, or start a fresh request.

### Technician Visit Review and quick follow-up

Technician Visit Review retains situation selection, customer-reported versus internal-record facts, impact, requested outcomes, contradiction handling, readiness checks, and the editable email draft. Changing facts marks a manually edited draft stale without erasing it; refresh and restore are explicit, with up to ten versions. Invalid account format or missing Long Island recipient blocks handoff; incomplete operational facts and after-cutoff timing are advisory as in the source.

Quick follow-up remains a small reply tool for an existing Outlook thread. It has no required field, supports an optional callback date/time in ET, and copies a rich reply for Outlook. Neither tool forces Case creation.

## Cases, accounts, and persistence

Saving a Case is a separate, optional action offered after callback creation or update, appointment-expedite or Technician Visit Review handoff preparation, or copying a quick follow-up reply. The save form requires a customer name or account number and a one-line summary. The agent chooses an issue category from Video Streaming, Internet, Equipment, Phone, or Other, and a High, Medium, or Low priority; Medium is the default, except an urgent callback suggests High. A saved Case records owner, generated case ID, these fields, status, source workflow, last activity, and linked workflow snapshot or callback ID.

Case states are **Open**, **Follow-up scheduled**, **Handoff prepared**, and **Closed**. A saved pending callback starts as Follow-up scheduled; a saved completed callback starts Closed; an RCC email or quick reply that is merely ready to use starts Handoff prepared. Reopening a closed Case sets it to Open. A prepared Outlook draft is never labelled **Sent**, **Escalated**, or **Appointment scheduled** without a later explicit confirmation flow. No invented NOC ticket is generated at launch.

The new app uses one app-owned account and session system in D1. An administrator is bootstrapped through deployment secrets and creates agent accounts; temporary passwords must have at least 12 characters and require change on first sign-in. Public login, password change and recovery, disabled-account handling, session expiry, same-origin write checks, secure HttpOnly cookies, login throttling, and audit events carry over from the stricter verified source behavior. Administrators manage accounts, but the product does not give them an agent's private Cases by default.

The GitHub repository contains source, tests, and design documents. Deployment credentials, encryption keys, account passwords, and customer data stay out of Git and are provided through Sites secrets and D1 at runtime.

Every callback, schedule, draft, Case, Case event, and user preference is scoped by the authenticated owner on the server. Customer identifiers, phone, names, notes, event payloads, and free-text case or draft content are encrypted before D1 storage with authenticated encryption; decryption happens only after authorization. Search first limits rows to the authenticated owner, then decrypts that owner's candidate rows on the server and matches the query; it never tries to search randomized ciphertext or scans across owners. Result pages contain at most 100 matches and provide a cursor for further matches. Session tokens are stored hashed.

**New unified-product decisions:** RCC recipient addresses and agent signature become private per-agent server preferences so they work across devices; both callback-creation and RCC form drafts autosave as private encrypted records so an agent can recover work after reload or reauthentication. Neither behavior existed in exactly this form in the old Sites. Autosaving a draft never creates a Case, and signing into a different account never exposes the previous account's draft. The old Sites' databases and accounts are not migrated.

Account data controls preserve FollowBack's 30, 90, 180, 365, and 730-day options for cleanup of closed callbacks, along with manual cleanup and typed-confirmation deletion. Deleting callback data removes its event history and sensitive snapshots from linked Cases; independently saved Case metadata remains until the agent deletes that Case. Case deletion has its own typed confirmation so the two actions cannot be confused.

## Feedback, errors, and recovery

Validate fields beside the relevant control and show a compact readiness summary near each handoff action. A blocking error preserves entered data, identifies the field or service that failed, and offers a retry. A failed optional Case save must not undo the callback action or Outlook draft preparation that already succeeded. Use Sonner for confirmations such as “Follow-up scheduled” or “Outlook draft prepared,” and for request failures that need attention. Avoid success language that claims an external team received a message before Outlook sends it.

The app loads real data after sign-in and updates list and detail without a full page reload after a successful mutation. Prevent duplicate submits while a request is pending. If the session expires, require sign-in before another write; after reauthentication, reload only that agent's latest encrypted autosaved form draft. Never expose another agent's data. An empty account is useful and honest rather than filled with example cases.

## Verification and release criteria

The release is complete when a fresh agent can sign in, manage a callback and schedule, complete each RCC draft/handoff, optionally save and reopen a private Case, and return after reload to the same persisted work. Direct workflows remain available without creating a Case. Automated tests cover callback retry transitions, time-zone and cutoff calculations, RCC blockers/advisories, generated email escaping, authentication and owner isolation, and saving a Case after each supported workflow. Browser review covers 1440px, 1100px, 768px, and 390px widths; both themes; empty and dense queues; long customer names; errors; keyboard navigation and focus return; reduced motion; and 200% text zoom.

Ship through Sites only after a real first preview, build verification, and end-to-end checks of the primary flows. Keep the old Sites unchanged. The NOC writing helper, automatic email sending, data migration, demo customer records, and a second visual skin are outside this launch scope.
