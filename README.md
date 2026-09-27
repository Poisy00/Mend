# Mend

Mend is a private agent workbench for follow-ups, a repeating Cairo schedule, RCC appointment expedite, technician visit review, quick replies, and optional Cases. Preparing an Outlook draft does not send an email. Each agent sees only their own work.

## Local development

Requires Node.js 22.13 or later. Install dependencies with `npm run install:ci`, then run `npm run build` to generate the local Worker configuration. Apply the SQL files in `drizzle/` in numeric order to the local D1 binding. For each file:

```sh
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0000_example.sql
```

Replace the example filename with each migration's actual name. Create an ignored `.dev.vars` with the variables below, then run `npm run dev`. Sign in with the bootstrap administrator account and change its temporary password before using the desk.

## Runtime configuration

Set these as **secrets** in the Sites environment; never commit their values:

| Variable | Purpose |
| --- | --- |
| `AUTH_PEPPER` | Password hashing secret, independent of the encryption key. |
| `DATA_ENCRYPTION_KEY` | AES-GCM key material for customer records, drafts, and history. Keep stable after launch. |
| `BOOTSTRAP_ADMIN_USERNAME` | Initial administrator username. |
| `BOOTSTRAP_ADMIN_PASSWORD` | Initial temporary administrator password, at least 12 characters. |

The Site binds D1 as `DB` through `.openai/hosting.json`. Optional recovery requires a separate `OWNER_RECOVERY_TOKEN` secret of at least 32 characters; it is intentionally unset for this deployment. Agent accounts are created by the administrator in Mend; `BOOTSTRAP_USER_*` is unused.

## Checks and release

Run `npm test`, `npm run lint`, `npx tsc --noEmit`, `npm run build`, and `node --test tests/rendered-html.test.mjs` while the local preview is running. The Sites plugin's workflow prepares and pushes the exact source revision before a saved version is deployed. Production D1 migrations and secrets must be applied before opening the public login page.

The approved product spec and implementation plan are in `docs/superpowers/`. The legacy FollowBack and RCC Sites are separate projects and are never migrated into Mend.
