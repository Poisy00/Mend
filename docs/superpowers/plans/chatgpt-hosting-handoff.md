I'm moving my app **Mend** off ChatGPT Sites. You helped me host it there: a vinext (Next.js on Vite) Cloudflare Worker, with Cloudflare D1 bound as `DB` through `.openai/hosting.json`. It's going to be deployed on Vercel, keeping Cloudflare D1 as the database. Please gather the facts below about the current setup.

**Security rule:** never paste secret *values* (keys, passwords, tokens) in this chat. For each secret, only tell me whether it exists, where it's stored, and whether I can retrieve the exact current value. I'll copy values into my password manager myself.

## 1. Hosting and ownership
1. Where does Mend run right now? Give the production URL and any custom domain.
2. Is the Cloudflare Worker deployed in **my own Cloudflare account**, or in an account that ChatGPT Sites or OpenAI manages for me?
3. If it's my account, give:
   - the Cloudflare account ID
   - the account name or email it's under
   - the Worker or script name
4. What does `project_id` in `.openai/hosting.json` refer to, and where can I see that project?
5. Is there anything else Sites created for Mend: KV, R2, Durable Objects, Queues, cron triggers, routes or DNS records? List each one with its name and ID.

## 2. The D1 database
1. The D1 database **name** and **database ID (UUID)**.
2. Which Cloudflare account owns it. Can I see it in my own Cloudflare dashboard under Workers & Pages → D1?
3. Its region or location, and its current size.
4. Which migrations from `drizzle/` have been applied, from `0000` up to the latest. Is the `d1_migrations` table, or an equivalent, present?
5. If the database is **not** in my own account: what's the supported way to export it? For example, `wrangler d1 export`, a dashboard export, or a Sites export tool. Can it be transferred into my account instead?
6. Are there backups, or Time Travel restore points, and who controls them?

## 3. Secrets and environment variables
For each of these, say whether it's set in production, where it's stored (Sites settings, Worker secrets, or elsewhere) and **whether I can retrieve the exact current value**:
- `AUTH_PEPPER`
- `DATA_ENCRYPTION_KEY`
- `AI_CREDENTIALS_ENCRYPTION_KEY`
- `BOOTSTRAP_ADMIN_USERNAME`
- `BOOTSTRAP_ADMIN_PASSWORD`
- `OWNER_RECOVERY_TOKEN`
- any other variable or secret the deployment has that isn't in this list

Important: `DATA_ENCRYPTION_KEY`, `AI_CREDENTIALS_ENCRYPTION_KEY` and `AUTH_PEPPER` must stay **exactly the same**. Otherwise the encrypted customer data becomes unreadable and existing passwords stop working. If any of them **can't** be retrieved, say so clearly.

## 4. Build and runtime
1. The exact build and deploy commands Sites runs, and the Node and Wrangler versions.
2. The `compatibility_date` and `compatibility_flags` of the deployed Worker.
3. Anything Sites-specific that the code depends on. For example: `scripts/sites-env.mjs`, `SITES_RUNTIME_ROOT`, `SITES_INSTALL_REPORT_PATH`, the `.openai/` folder, or special bindings. What would break if Sites stops providing them?
4. How the Worker reaches D1: only through the `DB` binding, or also through the Cloudflare REST API?

## 5. Ask Mend (ChatGPT connection)
1. Does Ask Mend's device authorization or Codex request depend on the app being hosted on ChatGPT Sites, for example through an allow-listed origin, client ID or callback? Or will it work from any domain?
2. Is any client ID or OAuth configuration tied to the current domain?

## 6. Moving out
1. What should I do in Sites to safely shut down the old deployment once the new one works? Will the D1 database be deleted when I do?
2. Is there a deadline, quota or cost I should know about?

**Reply format:** a numbered answer for every question above. Write "unknown" where you can't find something, and say how I could find it out.
