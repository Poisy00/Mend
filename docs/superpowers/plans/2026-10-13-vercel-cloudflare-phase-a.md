# Hosting phase A: code changes for Vercel plus a D1 bridge (brief for Sonnet)

**Spec:** `docs/superpowers/specs/2026-10-13-vercel-cloudflare-hosting.md`, sections 1–3. Section 4, deploy, is **not** this phase.
**Base:** branch `hosting-vercel`, created from `main` (`c6c5202`).

## Hard rules
- **Branch setup.** Start with `git switch -c hosting-vercel main`. The working tree has the user's uncommitted React Grab changes (`app/layout.tsx`, `package*.json`) and untracked tool folders. Carry them along untouched. **Never stage, commit, stash or discard them.** When you must edit `package.json` or `package-lock.json` for this task, stage only your own hunks (`git add -p`) and leave the React Grab hunk unstaged. If that's impossible, stop and report.
- **Allowed:**
  - `workers/db-bridge/**` (new)
  - `lib/server/runtime.ts`
  - `lib/server/d1-remote.ts` (new)
  - the client-IP helper in `lib/server/`
  - only the `cf-connecting-ip` call sites
  - `package.json` and `package-lock.json` (own hunks only)
  - `next.config.ts`, `vercel.json` (new), `.env.example` (new), `.gitignore`, `README.md`, `tsconfig.json`
  - `components/mend-link.tsx` (comment only)
  - deleting the vinext and Sites-only files listed in spec §3
- **No other app or feature changes.** SQL, schema, migrations, tests and UI are untouched. The remote client must make the existing code work unchanged.
- **Never edit `tests/`.** If a test relies on vinext or Sites tooling you removed, stop and report.
- **No accounts:** no `wrangler login`, `vercel login`, `vercel link`, deploys or anything that contacts Cloudflare or Vercel accounts.
- **Secrets.** Local-only test secrets for the smoke test go in `.env.local` and `workers/db-bridge/.dev.vars`, both gitignored. Generate them randomly and never print them. Those local test credentials may be used to sign in **only** on `localhost`.
- **Commits:** one per step, with the exact messages below and the trailer `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`. Never amend, push or use `--no-verify`.
- **Ambiguity, or anything vinext-only that blocks `next build`:** stop and report.

## Steps
1. **Bridge Worker** (spec §1). Typecheck it. Commit: `Add Cloudflare D1 bridge worker`.
2. **Remote D1 client, `runtime.ts` and the client-IP helper** (spec §2). Commit: `Talk to D1 through the bridge`.
3. **Real Next.js build** (spec §3): the scripts, removing vinext and Sites, `vercel.json`, `.env.example`, README. Commit: `Build Mend on Next.js for Vercel`.
4. **Checks:** `npm test`, `npm run lint`, `npx tsc --noEmit` and `npm run build` (now `next build`). All must pass.
5. **Local smoke test:**
   - Run `npm run db:migrate:local`, then `npm run dev:db` and `npm run dev` in the background.
   - Use the local `.env.local` bootstrap admin (test values you generated) to sign in at `http://localhost:3000` in the built-in browser. Change the temporary password to another generated test value, and record it in `.env.local` as a comment.
   - Check that Today loads, that you can create one test follow-up through the dialog, resolve it, and open RCC and Cases.
   - Report the results, then stop the servers.

## Report
```
BRANCH/BASE: <branch> from <sha>
COMMITS: <sha message>
FILES: <git diff --stat main..HEAD>
CHECKS: test | lint | tsc | build
REMOVED: <files/deps removed>
SMOKE TEST: <each step pass/fail with notes>
UNCOMMITTED USER CHANGES INTACT: <git status --short>
STOP-AND-REPORT ITEMS / DEVIATIONS: <list or none>
```
