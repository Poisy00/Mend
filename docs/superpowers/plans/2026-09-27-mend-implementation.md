# Mend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build and publish Mend as one private-by-agent, full Sites web app for FollowBack, RCC Dispatch, Schedule, and optional Cases.

**Architecture:** Start from the Sites Vinext starter in an isolated Git worktree. Keep authentication and owner-scoped persistence in server modules; keep callback, schedule, RCC routing, validation, and email logic in pure modules; compose the installed accessible UI primitives around those services. D1 stores encrypted customer data and draft/case records. Outlook actions prepare drafts and hand off to the user's compose window; Mend does not send mail.

**Tech Stack:** Sites Vinext starter, React 19, Next 16, TypeScript, Cloudflare Workers and D1, Drizzle, Zod, installed Shadcn/Radix primitives, Sonner, next-themes, Geist Sans, Node test runner with `tsx`.

**Spec:** `docs/superpowers/specs/2026-09-26-tier2-operations-workbench-design.md`

## Global Constraints

- Product name is **Mend**; GitHub repository is `https://github.com/Poisy00/Mend`. Work on a `codex/` branch from `main` and preserve the two untracked legacy HTML files in the original checkout.
- Create a new Sites project from the Vinext starter. Do not modify or migrate either existing Site. The final product is a multi-route site, with fresh data and no seeded customer records.
- Direct FollowBack and RCC workflows work without a Case. Case creation is an optional separate command after the supported actions. Cases, callbacks, drafts, schedules, preferences, and their events are private to the authenticated agent.
- Cross-owner detail and mutation requests return 404 without revealing that a record exists; owner-scoped lists and searches omit other agents' records. Unauthenticated API requests return 401.
- Use the approved light canvas `#F8F7F5`, dark canvas `#17181B`, light iris `#5B456F`, dark iris `#CBAEE0`, and the full palette in the spec. Use one bundled Geist Sans family, 16px main text, at least 14px routine labels, and the 1100px list/detail breakpoint.
- Use the starter's matching Shadcn/Radix primitives and one root Sonner toaster. Keep keyboard focus, 200% zoom, reduced motion, no row stagger, no pulsing urgency, and no fake submit delays.
- Apply the named UI skills as craft checks: Geist typography and grid discipline from GPT Taste, predictable controls from Apple Design, Emil's frequency gate for motion, the animation-opportunity audit, and Sonner for real feedback. Do not introduce a marketing hero or scroll effects into the agent workspace.
- FollowBack's working week repeats Sunday–Saturday in `Africa/Cairo`; callback instants are UTC with an explicit Cairo/New York source zone. RCC uses `America/New_York`, with its 3:00 PM local cutoff and daylight-saving changes.
- An Outlook draft being prepared is never reported as sent or as an appointment confirmed. The NOC writing helper, automatic mail sending, example cases, migration, and separate WhiteGlove skin are outside this release.
- The GitHub repository is public. Never commit secrets, passwords, customer data, generated drafts, local D1 files, or Sites credentials. Keep the Site owner-private during build and enable public access only for the completed login-gated release.

## Review Focus

1. **Time-zone edges:** New York DST gap/fold and Cairo midnight preserve the intended UTC callback instant; tests belong to Task 4 and Task 5.
2. **Owner isolation:** An agent cannot fetch, search, mutate, or infer another agent's callback, draft, Case, history, or schedule; integration tests belong to Tasks 3–9.
3. **Concurrent writes:** Repeated form submits and stale revisions cannot duplicate an event or overwrite newer work; tests belong to Tasks 4, 6, and 9.
4. **Outlook fallback:** Blocked popup or clipboard failure leaves the prepared text visible and never claims sending; tests belong to Tasks 6 and 8.
5. **Draft recovery:** Session expiry and reauthentication restore only the same agent's encrypted autosave and preserve manual Technician Review edits; tests belong to Tasks 6 and 7.

## File Map

| Area | Files and responsibility |
| --- | --- |
| Starter and shell | `app/layout.tsx`, `app/globals.css`, `app/(desk)/layout.tsx`, `app/(desk)/page.tsx`, `app/login/page.tsx`, `components/mend-shell.tsx`, `components/theme-toggle.tsx`, `public/favicon.svg`, `.openai/hosting.json`: metadata, theme, navigation, first useful viewport, D1 binding |
| Database and security | `db/schema.ts`, `db/index.ts`, `drizzle/*.sql`, `lib/server/{runtime,crypto,http,auth}.ts`, `app/api/auth/**`, `app/(desk)/admin/users/page.tsx`: one account/session system, encryption, owner checks and admin provisioning |
| FollowBack | `lib/follow-ups/{types,rules,time}.ts`, `lib/server/follow-ups.ts`, `app/api/follow-ups/**`, `app/(desk)/follow-ups/page.tsx`, `components/follow-ups/**`: callback rules, storage, encrypted creation draft, queue/detail, history and form |
| Schedule | `lib/schedule/rules.ts`, `lib/server/schedule.ts`, `app/api/schedule/**`, `app/(desk)/schedule/page.tsx`, `components/schedule/**`: repeating Cairo pattern and dated exceptions |
| RCC | `lib/rcc/{types,expedite-routing,expedite-readiness,expedite-email,quick-follow-up}.ts`, `lib/rcc/technician-review/**`, `lib/server/rcc.ts`, `app/api/rcc/**`, `app/outlook-handoff/route.ts`, `app/(desk)/rcc/page.tsx`, `components/rcc/**`: three direct tools, private drafts, live preview and Outlook preparation |
| Cases | `lib/cases/{types,rules}.ts`, `lib/server/cases.ts`, `app/api/cases/**`, `app/(desk)/cases/page.tsx`, `components/cases/**`: optional linked records, truthful statuses, private search and history |
| Verification | `tests/helpers/mock-d1.ts`, focused `tests/**/*.test.ts`, `tests/rendered-html.test.mjs`: real rules, privacy, route behavior and render checks |

The protected `app/(desk)/layout.tsx` redirects unauthenticated users to `/login`. The starter's ChatGPT-auth helper is not Mend's account system. Client components receive only authorized data from server pages or authenticated API responses.

---

### Task 1: New Sites Starter and Visual Shell

**Files:** Create the starter files in a clean `codex/mend-build` worktree; delete starter `app/page.tsx`; modify `.openai/hosting.json`, `package.json`, `package-lock.json`, `app/layout.tsx`, `app/globals.css`, `app/(desk)/layout.tsx`, `app/(desk)/page.tsx`, `components/mend-shell.tsx`, `components/theme-toggle.tsx`, `public/favicon.svg`; create `tests/rendered-html.test.mjs`.

**Interfaces:** Produces `MendShell({children, currentArea})` and a root theme provider/toaster for every later route. `currentArea` is one of `today | follow-ups | rcc | cases | schedule`.

- [ ] Create an isolated worktree from `main`. Run the Sites `project-setup.mjs` in a separate empty staging directory, then copy the resulting starter into the worktree root while preserving `.git` and `docs`; the setup script refuses a nonempty directory. Leave the legacy HTML files in the original checkout. Set `d1: "DB"`, `r2: null` in `.openai/hosting.json`.
- [ ] Add `geist` as the sole new runtime dependency and `tsx` as the sole new dev dependency, then install once through Sites `install-dependencies.mjs`. Set `package.json`'s `test` script to the command below, without shell globs. Import `GeistSans` from `geist/font/sans` in `app/layout.tsx`.

  ```text
  node --import tsx --test tests/auth.integration.test.ts tests/admin.integration.test.ts tests/follow-ups/rules.test.ts tests/follow-ups/time.test.ts tests/follow-ups/privacy.test.ts tests/schedule/rules.test.ts tests/schedule/privacy.test.ts tests/rcc/expedite.test.ts tests/rcc/drafts.test.ts tests/rcc/handoff.test.ts tests/rcc/technician-review.test.ts tests/rcc/quick-follow-up.test.ts tests/cases/rules.test.ts tests/cases/privacy.test.ts tests/cases/integration.test.ts
  ```
- [ ] Remove the starter `/` page before adding `app/(desk)/page.tsx` so the routes do not collide. Replace starter theme tokens with the exact light/dark spec values. Build the sidebar, context bar, empty Today queue, direct Follow-up and RCC actions, theme toggle, one `Toaster`, grouped queue skeleton, and the Mend favicon/metadata. Use installed sidebar, button, sheet, and sonner primitives. No invented customer records.
- [ ] Register a new Site named Mend and save its project ID in the worktree's hosting manifest. Keep audience private. Start the local preview only when the first viewport shows the real shell and actions; check 1440px and 390px, light/dark, keyboard focus, and reduced motion.
- [ ] Run `npm run build` and the rendered-page smoke check `node --test tests/rendered-html.test.mjs` (assert title `Mend`, real navigation/actions, no starter copy or seeded Cases). Commit the shell, theme, package lock, and Site manifest without runtime files.

### Task 2: Shared Database, Encryption, and Session Guard

**Files:** Modify `db/schema.ts`, `db/index.ts`, `app/(desk)/layout.tsx`; create `lib/server/runtime.ts`, `lib/server/crypto.ts`, `lib/server/http.ts`, `lib/server/auth.ts`, `tests/helpers/mock-d1.ts`, `tests/auth.integration.test.ts`, and auth API routes under `app/api/auth/`.

**Interfaces:** `encryptCustomerValue(value: string): Promise<string>`, `decryptCustomerValue(value: string): Promise<string>`, `requireSession(request: Request): Promise<SessionUser | null>`, `requireAdmin(request: Request): Promise<SessionUser | null>`, `getPageSession(): Promise<SessionUser | null>` for server-rendered layouts. Later services take `ownerUserId: string` from the checked session, never the client body.

- [ ] Write `tests/auth.integration.test.ts` using a fresh in-memory D1 adapter: successful login sets `Secure`, `HttpOnly`, `SameSite=Strict`; a wrong password returns 401; repeated failures lock the origin/account; expired or revoked sessions return 401; wrong-origin writes return 403; `decryptCustomerValue(await encryptCustomerValue(name)) === name` while ciphertext does not contain `name`.
- [ ] Run `node --import tsx --test tests/auth.integration.test.ts`; confirm the new tests fail because the exported service and routes are absent.
- [ ] Port the stricter source password/session pattern from FollowBack `lib/server/{crypto,auth,http}.ts`: PBKDF2-SHA256 with per-user salt and secret pepper, random hashed session tokens, 30-minute idle and 12-hour absolute expiry, login throttling, audit log, bootstrap admin secrets, same-origin writes, and owner-aware helpers. Define D1 tables for users, sessions, login throttles, audit, preferences, callbacks/events and creation drafts, weekly patterns/exceptions, RCC drafts/handoffs, Cases/events; encrypt all customer and event payload fields with AES-GCM and a deployment secret. Generate Drizzle SQL and inspect it before applying locally.
- [ ] Add public `/login`, forced password change, logout, session check and recovery routes; the desk layout checks the Mend session on each request. Never call the starter's `requireChatGPTUser` for product access.
- [ ] Run the auth test and `npm run build`; verify both pass and a public visitor reaches Mend's login locally. Commit security and schema changes.

### Task 3: Admin Provisioning and Account Controls

**Files:** Create `app/(desk)/admin/users/page.tsx`, `components/admin/users.tsx`, `app/api/admin/users/**`, `app/(desk)/settings/page.tsx`, `app/api/account/data/route.ts`, `tests/admin.integration.test.ts`; extend `lib/server/auth.ts` and `db/schema.ts` only for fields the tests require.

**Interfaces:** `createAgent(adminId: string, input: {username: string; displayName: string; temporaryPassword: string}): Promise<User>` requires a 12+ character temporary password and forced first change. `disableAgent(adminId: string, userId: string): Promise<void>` revokes sessions. Account data controls operate on the current session owner.

- [ ] Write tests that an agent gets 403 from admin routes; admin-created agents must change a 12+ character temporary password before workspace access; a disabled agent's active session stops working; account-data cleanup deletes only that owner's closed callbacks and related history.
- [ ] Run `node --import tsx --test tests/admin.integration.test.ts` and confirm these cases fail.
- [ ] Build admin user list/create/disable/reset actions and account settings with retention choices 30/90/180/365/730 days, typed-confirmation cleanup, and own-session management. Preserve the source's audit trail and rate limits. Use installed dialog, alert-dialog, form, and Sonner components.
- [ ] Run the admin test and `npm run build`; verify passed checks and manually inspect the public login/forced-change/admin flow. Commit.

### Task 4: FollowBack Rules, Persistence, and Queue

**Files:** Create `lib/follow-ups/types.ts`, `lib/follow-ups/rules.ts`, `lib/follow-ups/time.ts`, `lib/server/follow-ups.ts`, `app/api/follow-ups/route.ts`, `app/api/follow-ups/[id]/route.ts`, `app/api/follow-ups/draft/route.ts`, `app/(desk)/follow-ups/page.tsx`, `components/follow-ups/{queue,detail,form}.tsx`, `tests/follow-ups/{rules,time,privacy}.test.ts`.

**Interfaces:** `classifyFollowUp(item: FollowUp, nowMs: number): FollowUpBucket`, `rankFollowUp(item: FollowUp, nowMs: number): number`, `transitionFollowUp(current: FollowUp, command: FollowUpCommand, now: Date): {next: FollowUp; event: FollowUpEvent}`, `wallTimeToUtc(local: string, zone: "Africa/Cairo" | "America/New_York", disambiguation?: "earlier" | "later"): string`; server functions `createFollowUp(ownerUserId, input)`, `listFollowUps(ownerUserId, query)`, `applyFollowUpCommand(ownerUserId, id, command, expectedRevision)`, `saveFollowUpDraft(ownerUserId, input, expectedRevision)`.

- [ ] Write tests for overdue/now/soon/waiting buckets, reason/urgency ordering, +30m follow-up, +10m busy, +15m first no-answer, explicit voicemail before second abandonment, cancel/restore and history. Reject a nonexistent DST wall time; require `earlier` or `later` for an ambiguous one; Cairo midnight and source-zone display changes must preserve the UTC instant. Test that owner B cannot see, search, update, or read owner A history or creation draft; a stale revision returns 409 without a duplicate event.
- [ ] Run `node --import tsx --test tests/follow-ups/rules.test.ts tests/follow-ups/time.test.ts tests/follow-ups/privacy.test.ts` and confirm failure before implementing.
- [ ] Port the rules from FollowBack `app/followback-app.tsx:497–660` and `lib/server/callback-data.ts:299–456` into pure modules, with server-side validation of required fields, appointment interval and future due. Implement owner-scoped D1 storage, encrypted fields, encrypted event payloads and encrypted creation-draft autosave; filter search only after owner-scoped decryption and return at most 100 matches per cursor. Update row and history atomically and reject stale revisions.
- [ ] Build dense queue/detail UI, search and live counts, direct create/edit form, action buttons and a readable history. At least 1100px keep list/detail visible; below it use a focus-managed detail sheet. Add optional generic browser reminders with an in-page fallback. Keep Case saving separate.
- [ ] Run focused tests and `npm run build`, then perform create/retry/resolve and mobile keyboard checks in the local preview. Commit.

### Task 5: Repeating Cairo Schedule

**Files:** Create `lib/schedule/rules.ts`, `lib/server/schedule.ts`, `app/api/schedule/route.ts`, `app/api/schedule/exceptions/[date]/route.ts`, `app/(desk)/schedule/page.tsx`, `components/schedule/weekly-grid.tsx`, `tests/schedule/{rules,privacy}.test.ts`.

**Interfaces:** `validateWeeklyPattern(week: WeekPattern): ValidationResult`, `effectiveDay(pattern: WeekPattern, exception: DayException | null, cairoDate: string): DayPlan`, `activeShift(pattern: WeekPattern, exceptions: DayException[], instant: Date): ShiftState`; `getSchedule(ownerUserId)` and `saveWeeklyPattern(ownerUserId, week)`.

- [ ] Write tests: a saved Sunday–Saturday pattern appears in the following week; a dated break/lunch exception affects only its date; off days reject pauses; breaks are 15 minutes and lunch 30 minutes within ordered shifts; an overnight shift crosses the Cairo calendar boundary; owner B cannot fetch or edit owner A schedule.
- [ ] Run `node --import tsx --test tests/schedule/rules.test.ts tests/schedule/privacy.test.ts` and confirm failure.
- [ ] Implement one owner-keyed weekly pattern plus Cairo-local dated exceptions, using FollowBack `lib/server/schedule-data.ts:17–127` validation while changing its current-week key. Calculate overnight boundaries by local calendar day, including Cairo daylight-saving changes. Add the weekly editor, quick pause controls, and current-shift display to Today.
- [ ] Run focused tests and `npm run build`; check the editor at desktop/mobile widths and confirm the next-week view reflects the same pattern. Commit.

### Task 6: RCC Appointment Expedite and Private Drafts

**Files:** Create `lib/rcc/types.ts`, `lib/rcc/expedite-routing.ts`, `lib/rcc/expedite-readiness.ts`, `lib/rcc/expedite-email.ts`, `lib/server/rcc.ts`, `app/api/rcc/drafts/[workflow]/route.ts`, `app/api/rcc/handoffs/route.ts`, `app/api/rcc/preferences/route.ts`, `app/(desk)/rcc/page.tsx`, `components/rcc/{expedite-form,email-preview,readiness,preferences}.tsx`, `app/outlook-handoff/route.ts`, `tests/rcc/{expedite,drafts,handoff}.test.ts`.

**Interfaces:** `resolveExpediteRoute(input: ExpediteInput, now: Date): RouteDecision`, `assessExpedite(input: ExpediteInput, prefs: RccPreferences, route: RouteDecision): Readiness`, `buildExpediteEmail(input: ExpediteInput, prefs: RccPreferences, route: RouteDecision): EmailDraft`; `saveRccDraft(ownerUserId, workflow, payload, expectedRevision)` and `prepareRccHandoff(ownerUserId, workflow, draftRevision): PreparedHandoff`.

- [ ] Write tests for 2:59 PM versus 3:00 PM New York time, winter/summer dates, automatic Long Island only for today's appointment before cutoff, Nassau same-day block, forced Long Island advisory, missing recipient/required fields, HTML escaping, and truthful `prepared` status. Assert a blocked popup or rejected clipboard copy yields visible selectable draft text without a sent claim. Test encrypted per-agent draft recovery after session renewal, cross-owner denial, and stale revision 409.
- [ ] Run `node --import tsx --test tests/rcc/expedite.test.ts tests/rcc/drafts.test.ts tests/rcc/handoff.test.ts` and confirm failure.
- [ ] Extract routing, validation, and plain/rich email builders from RCC `app/rcc-app.jsx:286–375` into pure modules. Save recipient/signature preferences, autosaved drafts and prepared handoff snapshots per owner in D1 with encrypted customer text. Port handoff behavior from `app/rcc-app.jsx:477–554` and `app/outlook-handoff/route.ts`: ClipboardItem rich/plain copy, `.eml` and HTML-email export, quick plain draft, and popup/clipboard fallbacks. The response and toast say “draft prepared,” never “sent.”
- [ ] Compose the form and sticky live preview at wide widths, labelled form/preview tabs on small widths, inline route/cutoff/readiness feedback, and a fixed-width pending button. Handoff blockers prevent prepare; advisory text does not.
- [ ] Run focused tests and `npm run build`; manually verify a blocked popup and one clipboard failure without losing the draft. Commit.

### Task 7: Technician Visit Review

**Files:** Create `lib/rcc/technician-review/{schema,model,incident,contradictions,narrative,email,draft}.ts`, `components/rcc/technician-review.tsx`, `tests/rcc/technician-review.test.ts`; extend `lib/server/rcc.ts` and the RCC page from Task 6.

**Interfaces:** `assessTechnicianReview(review: TechnicianReview, prefs: RccPreferences, now: Date): ReviewReadiness`, `buildTechnicianReviewEmail(review: TechnicianReview, prefs: RccPreferences): EmailDraft`, `reviseReviewDraft(current: ReviewDraft, change: ReviewChange): ReviewDraft` preserving up to ten explicit versions. Uses Task 6's `saveRccDraft` and `prepareRccHandoff` with workflow `technician-review`.

- [ ] Write tests for selected situation, reported versus internal facts, contradiction actions, invalid account and missing Long Island recipient blockers, after-cutoff advisory, escaping, and changed facts marking a manually edited draft stale without erasing text. Restore an earlier version and cap history at ten. Test draft isolation across two agents.
- [ ] Run `node --import tsx --test tests/rcc/technician-review.test.ts` and confirm failure.
- [ ] Port RCC `app/technician-review/{schema,model,incident,contradictions,narrative,email,draft}.js` and its editable draft behavior, omitting old localStorage migration. Build the question flow, readiness summary, editable preview, explicit Refresh and Restore, and the shared Outlook preparation action.
- [ ] Run focused tests and `npm run build`; manually verify keyboard use and that changing a fact never silently replaces edited copy. Commit.

### Task 8: Quick Follow-up Reply

**Files:** Create `lib/rcc/quick-follow-up.ts`, `components/rcc/quick-follow-up.tsx`, `tests/rcc/quick-follow-up.test.ts`; extend the RCC page and handoff route from Task 6.

**Interfaces:** `buildQuickFollowUp(input: QuickFollowUpInput, now: Date): EmailDraft`; Task 6's `prepareRccHandoff` accepts workflow `quick-follow-up` with optional ET callback date/time and no required customer field.

- [ ] Write tests that an empty quick reply is allowed; an optional callback date/time renders in New York local time; generated rich/plain copy escapes user text; clipboard denial leaves selectable text; no Case is created by preparing the reply; agents cannot read each other's draft.
- [ ] Run `node --import tsx --test tests/rcc/quick-follow-up.test.ts` and confirm failure.
- [ ] Port RCC `app/quick-follow-up.js:47–93`, put the tool in an accessible dialog/sheet launched from RCC, reuse encrypted autosave and the Outlook copy fallback, and offer optional Save as Case only after successful preparation.
- [ ] Run focused tests and `npm run build`; manually verify desktop/mobile focus return and Sonner feedback. Commit.

### Task 9: Private Optional Cases

**Files:** Create `lib/cases/types.ts`, `lib/cases/rules.ts`, `lib/server/cases.ts`, `app/api/cases/route.ts`, `app/api/cases/[id]/route.ts`, `app/(desk)/cases/page.tsx`, `components/cases/{queue,detail,save-dialog}.tsx`, `tests/cases/{rules,privacy,integration}.test.ts`; connect Save as Case actions in FollowBack and RCC components.

**Interfaces:** `statusForSource(source: CaseSource): CaseStatus`, `createCaseFromWorkflow(ownerUserId: string, input: SaveCaseInput): Promise<CaseRecord>`, `listCases(ownerUserId, query): Promise<CasePage>`, `setCaseStatus(ownerUserId, caseId, status, expectedRevision): Promise<CaseRecord>`. Human ID format is `MND-` plus eight uppercase base32 characters, with collision retry.

- [ ] Write tests for required customer name or account plus summary, five issue categories, High/Medium/Low priority, callback-to-Follow-up scheduled, completed callback-to-Closed, RCC-to-Handoff prepared, reopen-to-Open, and never claiming sent/confirmed. Test two agents cannot read/search/update each other's Cases or source snapshots, a failed Case save leaves the completed workflow intact, encrypted event payloads, pagination, and stale revision 409.
- [ ] Run `node --import tsx --test tests/cases/rules.test.ts tests/cases/privacy.test.ts tests/cases/integration.test.ts` and confirm failure.
- [ ] Implement owner-checked source linking, encrypted Case fields/events, server-side owner-first search, at most 100 results per cursor, delete with typed confirmation, and history. Build the dense queue, live-count filters, search, detail panel and Save as Case dialog. Leave direct workflows usable when the Case dialog is skipped.
- [ ] Run focused tests and `npm run build`; manually check new empty accounts, long names, dense lists, and both split/drawer layouts. Commit.

### Task 10: Integration, Visual Review, and Sites Release

**Files:** Modify only the focused source files required by findings; update `README.md` with setup and non-secret environment variable names; keep `.openai/hosting.json`, generated migration, and metadata consistent. No new product feature is introduced in this task.

**Interfaces:** All routes and services from Tasks 1–9 work together. The production Site is public at the Sites access layer but Mend's work routes remain guarded by app-owned sessions.

- [ ] Run the complete explicit test list via `npm test`, `npm run lint`, and `npm run build`; apply pending D1 migrations in the local Worker, then exercise login, callback lifecycle, repeating schedule, all three RCC tools, Case save/reopen, owner isolation, and session expiry against the built preview.
- [ ] Review UI at 1440, 1100, 768, and 390px; light/dark; empty and dense queues; long names; errors; 200% text zoom; keyboard and reduced motion. Fix only observed issues. Check one grouped skeleton resolution, Sonner stacking/swipe, focus return and fixed-width pending buttons. Repeat only the checks affected by fixes.
- [ ] Review the diff for default starter copy, accidental mock records, raw customer data, secrets, runtime D1 files, old HTML prototypes, and claims that an Outlook draft was sent. Confirm `.gitignore` excludes runtime state. Commit the release fixes.
- [ ] Set fresh deployment secrets and D1 binding through Sites, build with the Sites helper, and publish a private QA revision of the exact tested Git commit. Verify deployment status and Mend's login page, switch Sites access to public for agent login, redeploy the same commit if Sites requires it, and verify the public login plus guarded work routes. Keep existing RCC and FollowBack Sites untouched.
- [ ] Push the `codex/` branch to `Poisy00/Mend` and open a reviewable PR against `main` when the working Site is verified. Attach the PR to the Codex task and report the live Site URL, PR URL, checks, and any remaining limitation.
