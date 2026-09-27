import { readFile, readdir } from "node:fs/promises";
import { Miniflare } from "miniflare";

export async function freshDatabase() {
  const mf = new Miniflare({
    modules: true,
    script: 'export default { fetch() { return new Response("ok") } }',
    d1Databases: { DB: "mend-test" },
  });
  const db = await mf.getD1Database("DB");
  const directory = new URL("../../drizzle/", import.meta.url);
  for (const file of (await readdir(directory)).filter(name => /^\d{4}_.+\.sql$/.test(name)).sort()) {
    const migration = await readFile(new URL(file, directory), "utf8");
    for (const statement of migration.split("--> statement-breakpoint").map(part => part.trim()).filter(Boolean)) {
      await db.prepare(statement).run();
    }
  }
  return { db, dispose: () => mf.dispose() };
}
