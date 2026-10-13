# Mend hosting: Vercel app plus Cloudflare D1 (spec)

**Date:** 2026-10-13
**Status:** Requested by the user; architecture chosen by Opus.

## Decisions (from the user)
- **Leave ChatGPT Sites.** There's no important data yet, so this is a **fresh start**: a new database and new secrets. Nothing is exported or migrated from Sites.
- **The site is hosted on Vercel**, which the user loves. The database stays on **Cloudflare D1**, in the user's own Cloudflare account.
- Netlify is off the table.

## Architecture
```
Browser ──> Vercel (Next.js 16, Node runtime, region fra1)
              │  every DB call: HTTPS POST + bearer token
              ▼
          Cloudflare Worker "mend-db" (own account) ──binding──> D1 "mend" (location hint: weur)
```
- **Why a bridge Worker, not the D1 REST API.** The REST API sits under Cloudflare's account-wide API rate limits (about 1,200 requests per 5 minutes) and is meant for admin use. A Worker with a D1 binding has no such limit. It keeps `batch()` atomic, and adds a single hop.
- **Why fra1 and weur.** The users are in Cairo. A Frankfurt Vercel region and a Western Europe D1 keep the Vercel-to-D1 hop short.

## 1. The bridge Worker (`workers/db-bridge/`)
- **Files:**
  - `src/index.ts`
  - `wrangler.jsonc`, with `name: "mend-db"`, a D1 binding `DB`, `database_name: "mend"`, a `database_id` placeholder to fill in at deploy time, `migrations_dir: "../../drizzle"` and a current `compatibility_date`
  - `tsconfig.json` and a short `README.md`
- **Auth:**
  - `Authorization: Bearer <DB_BRIDGE_TOKEN>`, a Worker secret, compared in constant time.
  - Requests are POST only. A missing or wrong token returns 401 with no detail.
  - The body is limited to 1 MB.
- **Endpoints:**
  - `POST /query` takes `{ sql, params, mode: "first" | "all" | "run" | "raw", column? }` and returns the D1 result. `first` returns `{ result }`; `all` and `run` return `{ results, success, meta }`; `raw` returns `{ results }`.
  - `POST /batch` takes `{ statements: [{ sql, params }] }`, runs `env.DB.batch(...)` (atomic) and returns an array of `{ results, success, meta }`.
  - **Errors** return 500 with `{ error: <the D1 error message> }`, so the client can rethrow the **same message**. App code may branch on messages such as UNIQUE constraint failures.
- **Constraints:** no logging of SQL params, since they hold ciphertext and identifiers. No CORS; server-to-server only.

## 2. The app's database client
- **`lib/server/d1-remote.ts`:** a minimal `D1Database`-compatible client over `fetch` to `DB_BRIDGE_URL` with `DB_BRIDGE_TOKEN`.
  - It covers exactly the surface Mend uses: `prepare(sql).bind(...params)` returning `.first(column?)`, `.all()`, `.run()` and `.raw()`, plus `db.batch(statements)`.
  - Params are serialised like D1 does: `undefined` is rejected, booleans become 1 or 0, and ArrayBuffer and Uint8Array are base64-tagged, if any are used. Check what the app actually binds.
  - Bridge errors are rethrown as `new Error(message)`.
- **`lib/server/runtime.ts`:**
  - Remove the `import { env } from "cloudflare:workers"`.
  - `bindings()` returns test bindings if set (tests unchanged). Otherwise it builds bindings from `process.env`: the secrets, plus `DB` as the remote client, created once and cached.
  - It throws a clear error if `DB_BRIDGE_URL` or `DB_BRIDGE_TOKEN` is missing.
- **Client IP:** replace `cf-connecting-ip` reads with a helper. It takes the first entry of `x-forwarded-for`, then `x-real-ip`, then `cf-connecting-ip`, so login throttling keeps working on Vercel.

## 3. Build on real Next.js (drop vinext for the app)
- **package.json scripts:**
  - `dev`: `next dev`
  - `build`: `next build`
  - `start`: `next start`
  - `dev:db`: run the bridge locally with `wrangler dev`, persisting local D1 to `.wrangler/state`, on port 8787
  - `db:migrate:local` and `db:migrate:remote`: `wrangler d1 migrations apply mend --local` or `--remote`, using the bridge config
  - Keep `test` and `lint` working.
- **Remove what only served vinext or Sites:**
  - `vite.config.ts`, `build/sites-vite-plugin*`, the `.openai/` folder
  - the Sites-only scripts (`scripts/run-framework.mjs`, `build-verified.sh`, `execution-profile.mjs`, `sites-env.*`, `install-*`), if nothing else needs them
  - the `vinext`, `vite` and `@cloudflare/vite-plugin` dependencies
  - Keep `wrangler` and `@cloudflare/workers-types` for the bridge.
  - Anything still used by tests stays.
- **`MendLink`:** keep it (it works on Next), and update its comment.
- **Keep `next.config.ts` minimal.** Add `vercel.json` with `{ "regions": ["fra1"] }`.
- **Every route uses the Node runtime.** No `runtime = "edge"`.
- **Local dev:**
  - Add `.env.example`, listing every variable with no values: `DB_BRIDGE_URL`, `DB_BRIDGE_TOKEN`, `AUTH_PEPPER`, `DATA_ENCRYPTION_KEY`, `AI_CREDENTIALS_ENCRYPTION_KEY`, `BOOTSTRAP_ADMIN_USERNAME`, `BOOTSTRAP_ADMIN_PASSWORD`, optional `OWNER_RECOVERY_TOKEN`.
  - Add `workers/db-bridge/.dev.vars.example` with `DB_BRIDGE_TOKEN`.
  - The real values live in `.env.local` and `workers/db-bridge/.dev.vars`, both gitignored.
- **Update the README "Run locally" and deploy sections.**

## 4. Deploy (needs the user's logins; runs after phase A)
1. **The user signs in themselves:** `npx wrangler login` and `vercel login`. Agents never handle passwords.
2. **Create the database:** `wrangler d1 create mend --location weur`, then put its id in the bridge config.
3. **Run migrations remotely:** `npm run db:migrate:remote`.
4. **Generate production secrets locally:**
   - 32-byte random values for `DB_BRIDGE_TOKEN`, `AUTH_PEPPER`, `DATA_ENCRYPTION_KEY` and `AI_CREDENTIALS_ENCRYPTION_KEY` (base64url)
   - a bootstrap admin username from the user, plus a generated temporary password
   - Write them **only** to `.secrets/mend-production.env`, which is gitignored. Never print them. The user moves them into KeePassXC.
5. **Set the bridge secret:** `wrangler secret put DB_BRIDGE_TOKEN`, piped from the file. Then `wrangler deploy` the bridge and note its `*.workers.dev` URL.
6. **Link and configure Vercel:** `vercel link`, creating the project "mend". Add every env var to Production and Preview with `vercel env add`, piped from the file, plus `DB_BRIDGE_URL`.
7. **Deploy:** `vercel deploy --prod`. The user signs in with the bootstrap admin and changes the password.
8. **Smoke test:** sign-in, create a follow-up, the RCC draft autosave, Cases, and the sign-in logo flight.
9. **Later, as the user's call:** a custom domain, and shutting down Sites (restrict sharing first).

## Out of scope
- Ask Mend model replies were already failing (403) on Sites. Track that separately after the move.
- Moving any data from Sites.
