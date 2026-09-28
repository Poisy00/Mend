# Mend

<img src="public/mend-logo.svg" alt="Mend" width="176" />

**A calmer operations desk for callbacks, appointment escalations, and cases.** Mend brings the FollowBack and RCC workflows into one private workspace, with a repeating Cairo schedule and Outlook-ready email preparation.

[Open Mend](https://mend-desk.poisy.chatgpt.site) · [Explore a sample workflow](docs/demo.md)

> Mend is an agent tool. Preparing an Outlook draft records a handoff; it does not send an email or claim that an appointment was confirmed.

## The desk

| Area | What it does |
| --- | --- |
| **Today** | Prioritizes callbacks and upcoming work in one view. |
| **Follow-ups** | Tracks outcomes, callback times, technician visits, history, and reusable case recipes. Quick callback presets are 30 minutes, 1 hour, and 2 hours. |
| **RCC Dispatch** | Builds appointment expedite and technician review requests from saved facts. It formats identifiers, offers standard or custom appointment windows, and creates a rich email for Outlook. |
| **Cases** | Keeps longer-running work and its history alongside the desk. An RCC handoff can also become a Case. |
| **Schedule** | Repeats a weekly Cairo pattern with dated exceptions. A completed day can be applied across the week. |

The email preview gives the escalation team a clear hierarchy: customer and account details, callback number, appointment window, reason, and relevant context. Long Island and Nassau Quota have distinct color cues. The Outlook handoff copies formatted HTML to the clipboard and opens a draft; the completed RCC draft moves into history so the form is ready for the next request.

### Privacy and session behavior

Agent records are scoped to their owner. Customer details, drafts, and history are encrypted at rest with AES-GCM. Administrators provision agents and can disable access. Sessions have both an idle limit and an absolute limit; an open desk returns to login when either expires or a protected request is rejected.

## Run locally

Requires Node.js 22.13 or later.

1. Run `npm run install:ci`, then `npm run build` to generate the local Worker configuration.
2. Apply the SQL files in `drizzle/` in numeric order to the local D1 binding. For each file, use the command below with that file's name.
3. Create an ignored `.dev.vars` with the required values in the table below.
4. Run `npm run dev`, sign in as the bootstrap administrator, and change the temporary password.

```sh
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0000_example.sql
```

| Secret | Purpose |
| --- | --- |
| `AUTH_PEPPER` | Password hashing secret, independent of the encryption key. |
| `DATA_ENCRYPTION_KEY` | Stable AES-GCM key material for customer records, drafts, and history. |
| `BOOTSTRAP_ADMIN_USERNAME` | Initial administrator username. |
| `BOOTSTRAP_ADMIN_PASSWORD` | Initial temporary password, at least 12 characters. |

The Site binds D1 as `DB` through `.openai/hosting.json`. Optional owner recovery uses a separate `OWNER_RECOVERY_TOKEN` of at least 32 characters. Agent accounts are created by the administrator in Mend; `BOOTSTRAP_USER_*` is unused.

## Quality checks

Run `npm test`, `npm run lint`, `npx tsc --noEmit`, and `npm run build`. The integration tests cover owner scoping, encrypted records, RCC handoffs, appointment windows, schedule rules, and session expiry. The approved product spec and implementation plan live in `docs/superpowers/`.
