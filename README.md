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
| **Ask Mend** | Connects a user's ChatGPT account from Settings, then opens a workspace drawer for conversations, case lookup, and scoped RCC and follow-up actions. |

The email preview gives the escalation team a clear hierarchy: customer and account details, callback number, appointment window, reason, and relevant context. Long Island and Nassau Quota have distinct color cues. The Outlook handoff copies formatted HTML to the clipboard and opens a draft; the completed RCC draft moves into history so the form is ready for the next request.

### Privacy and session behavior

Agent records are scoped to their owner. Customer details, drafts, and history are encrypted at rest with AES-GCM. Administrators provision agents and can disable access. Sessions have both an idle limit and an absolute limit; an open desk returns to login when either expires or a protected request is rejected.

## Run locally

Requires Node.js 22.13 or later. Mend is a Next.js app that stores data in Cloudflare D1 through a small bridge Worker (`workers/db-bridge`); locally the bridge runs with `wrangler dev` on a local D1 file, so no Cloudflare account is needed.

1. Run `npm install`.
2. Copy `.env.example` to `.env.local` and fill it in (table below). Use `DB_BRIDGE_URL=http://127.0.0.1:8787` and any random `DB_BRIDGE_TOKEN`.
3. Copy `workers/db-bridge/.dev.vars.example` to `workers/db-bridge/.dev.vars` and set `DB_BRIDGE_TOKEN` to the same value.
4. Run `npm run db:migrate:local` to apply the SQL in `drizzle/` to the local D1 database.
5. Run `npm run dev:db` (bridge on port 8787) and, in another terminal, `npm run dev` (app on http://localhost:3000).
6. Sign in as the bootstrap administrator and change the temporary password.

| Variable | Purpose |
| --- | --- |
| `DB_BRIDGE_URL` / `DB_BRIDGE_TOKEN` | Address and bearer token of the D1 bridge Worker. |
| `AUTH_PEPPER` | Password hashing secret, independent of the encryption key. |
| `DATA_ENCRYPTION_KEY` | Stable AES-GCM key material for customer records, drafts, and history. |
| `AI_CREDENTIALS_ENCRYPTION_KEY` | Separate stable 32-byte base64url AES-GCM key for ChatGPT OAuth credentials, authorization state, and Ask Mend messages. Generate with `openssl rand -base64 32 | tr '+/' '-_' | tr -d '='`. |
| `BOOTSTRAP_ADMIN_USERNAME` | Initial administrator username. |
| `BOOTSTRAP_ADMIN_PASSWORD` | Initial temporary password, at least 12 characters. |

Optional owner recovery uses a separate `OWNER_RECOVERY_TOKEN` of at least 32 characters. Agent accounts are created by the administrator in Mend; `BOOTSTRAP_USER_*` is unused.

## Deploy

The app runs on Vercel (Node runtime, region `fra1`, see `vercel.json`); the database is a Cloudflare D1 database `mend` behind the `mend-db` Worker.

1. Sign in yourself with `npx wrangler login` and `vercel login`.
2. Create the database and bridge as described in `workers/db-bridge/README.md` (`wrangler d1 create mend --location weur`, `npm run db:migrate:remote`, set the `DB_BRIDGE_TOKEN` secret, `wrangler deploy`).
3. In the Vercel project, add every variable from `.env.example` (Production and Preview), with `DB_BRIDGE_URL` set to the Worker's `*.workers.dev` URL.
4. Run `vercel deploy --prod`, sign in with the bootstrap administrator, and change the temporary password.

### Ask Mend setup

Make sure all migrations are applied to D1 (`npm run db:migrate:local` or `db:migrate:remote`) and set `AI_CREDENTIALS_ENCRYPTION_KEY` as a deployment secret before using Ask Mend. The key must remain stable: changing it makes existing credentials and conversations unreadable. Each agent connects in **Settings → Ask Mend · ChatGPT**, opens the authorization page, enters the displayed device code, and returns to the drawer. No extension, API key entry, Mend backend proxy, or redirect callback is needed. The server makes the authenticated Codex request using that agent's connection; Mend still handles its own session, encrypted storage, and scoped tools. A live authorization and model response require a ChatGPT account and must be checked in the deployed environment.

## Quality checks

Run `npm test`, `npm run lint`, `npx tsc --noEmit`, and `npm run build`. The integration tests cover owner scoping, encrypted records, RCC handoffs, appointment windows, schedule rules, and session expiry. The approved product spec and implementation plan live in `docs/superpowers/`.
