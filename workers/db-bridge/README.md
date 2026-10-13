# mend-db: D1 bridge Worker

Thin HTTPS front for the Cloudflare D1 database `mend`. The Next.js app on Vercel posts SQL here
(`POST /query`, `POST /batch`) with `Authorization: Bearer <DB_BRIDGE_TOKEN>`. It is server-to-server
only: no CORS, no SQL or params logged, 1 MB body limit.

## Local

```
cp .dev.vars.example .dev.vars   # set DB_BRIDGE_TOKEN to a random value; same value goes in ../../.env.local
npm run db:migrate:local         # from the repo root
npm run dev:db                   # http://127.0.0.1:8787, local D1 under .wrangler/state
```

## Deploy (needs your Cloudflare login)

1. `npx wrangler d1 create mend --location weur`, then put the printed id in `wrangler.jsonc`.
2. `npm run db:migrate:remote`
3. `npx wrangler secret put DB_BRIDGE_TOKEN --config workers/db-bridge/wrangler.jsonc`
4. `npx wrangler deploy --config workers/db-bridge/wrangler.jsonc`, then use the `*.workers.dev` URL as `DB_BRIDGE_URL`.
