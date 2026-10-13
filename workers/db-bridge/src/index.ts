// Mend D1 bridge. Server-to-server only: the Vercel app posts SQL here with a bearer token.
// Never log SQL params; they hold ciphertext and identifiers.

interface Env {
  DB: D1Database;
  DB_BRIDGE_TOKEN?: string;
}

type Param = string | number | boolean | null | { $b64: string };
type Statement = { sql: string; params?: Param[] };

const MAX_BODY_BYTES = 1_000_000;

const encoder = new TextEncoder();

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", "cache-control": "no-store" },
  });
}

const unauthorized = () => new Response(null, { status: 401 });

async function digest(value: string) {
  return new Uint8Array(await crypto.subtle.digest("SHA-256", encoder.encode(value)));
}

// Compare SHA-256 digests so the comparison is constant time and length-independent.
async function tokenMatches(header: string | null, secret: string | undefined) {
  if (!secret || !header?.startsWith("Bearer ")) return false;
  const [given, expected] = await Promise.all([digest(header.slice(7)), digest(secret)]);
  let diff = 0;
  for (let i = 0; i < expected.length; i += 1) diff |= given[i] ^ expected[i];
  return diff === 0;
}

function decodeParam(value: Param): string | number | boolean | null | ArrayBuffer {
  if (value !== null && typeof value === "object") {
    const binary = atob(value.$b64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
    return bytes.buffer;
  }
  return value;
}

function prepare(env: Env, statement: Statement) {
  if (typeof statement?.sql !== "string") throw new Error("Invalid statement");
  const params = statement.params ?? [];
  if (!Array.isArray(params)) throw new Error("Invalid params");
  return env.DB.prepare(statement.sql).bind(...params.map(decodeParam));
}

async function readBody(request: Request): Promise<unknown> {
  const declared = Number(request.headers.get("content-length") ?? 0);
  if (declared > MAX_BODY_BYTES) throw new PayloadTooLarge();
  const buffer = await request.arrayBuffer();
  if (buffer.byteLength > MAX_BODY_BYTES) throw new PayloadTooLarge();
  return JSON.parse(new TextDecoder().decode(buffer));
}

class PayloadTooLarge extends Error {}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method !== "POST") return unauthorized();
    if (!(await tokenMatches(request.headers.get("authorization"), env.DB_BRIDGE_TOKEN))) return unauthorized();

    const path = new URL(request.url).pathname;
    if (path !== "/query" && path !== "/batch") return json({ error: "Not found" }, 404);

    try {
      const body = (await readBody(request)) as Record<string, unknown>;

      if (path === "/batch") {
        const statements = body.statements as Statement[];
        if (!Array.isArray(statements)) throw new Error("Invalid statements");
        const results = await env.DB.batch(statements.map((statement) => prepare(env, statement)));
        return json(results.map(({ results, success, meta }) => ({ results, success, meta })));
      }

      const statement = prepare(env, body as Statement);
      switch (body.mode) {
        case "first": {
          const column = typeof body.column === "string" ? body.column : undefined;
          const result = column ? await statement.first(column) : await statement.first();
          return json({ result });
        }
        case "all":
        case "run": {
          const { results, success, meta } = body.mode === "all" ? await statement.all() : await statement.run();
          return json({ results, success, meta });
        }
        case "raw":
          return json({ results: await statement.raw() });
        default:
          throw new Error("Invalid mode");
      }
    } catch (error) {
      if (error instanceof PayloadTooLarge) return json({ error: "Payload too large" }, 413);
      return json({ error: error instanceof Error ? error.message : "Database error" }, 500);
    }
  },
} satisfies ExportedHandler<Env>;
