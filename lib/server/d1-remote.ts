// Minimal D1Database-compatible client that talks to the Cloudflare D1 bridge Worker
// (workers/db-bridge) over HTTPS. Covers only the surface Mend uses.

type WireParam = string | number | null | { $b64: string };
type Meta = Record<string, unknown>;
type WireResult = { results: unknown[]; success: boolean; meta: Meta };

function toBase64(bytes: Uint8Array) {
  let binary = "";
  for (let i = 0; i < bytes.length; i += 1) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

function serialize(value: unknown): WireParam {
  if (value === undefined) throw new Error("D1 cannot bind undefined; use null");
  if (value === null) return null;
  if (typeof value === "boolean") return value ? 1 : 0;
  if (typeof value === "string" || typeof value === "number") return value;
  if (value instanceof ArrayBuffer) return { $b64: toBase64(new Uint8Array(value)) };
  if (ArrayBuffer.isView(value)) return { $b64: toBase64(new Uint8Array(value.buffer, value.byteOffset, value.byteLength)) };
  throw new Error("Unsupported D1 parameter type");
}

export type RemoteD1Options = { url: string; token: string; fetch?: typeof fetch };

export function createRemoteD1(options: RemoteD1Options): D1Database {
  const base = options.url.replace(/\/+$/u, "");
  const doFetch = options.fetch ?? fetch;

  async function post<T>(path: string, body: unknown): Promise<T> {
    const response = await doFetch(`${base}${path}`, {
      method: "POST",
      headers: { authorization: `Bearer ${options.token}`, "content-type": "application/json" },
      body: JSON.stringify(body),
      cache: "no-store",
    });
    if (!response.ok) {
      let message = `Database bridge error (${response.status})`;
      if (response.status !== 401) {
        try {
          const payload = (await response.json()) as { error?: string };
          if (payload.error) message = payload.error;
        } catch {
          // keep the generic message
        }
      }
      throw new Error(message);
    }
    return (await response.json()) as T;
  }

  class Statement {
    constructor(readonly sql: string, readonly params: WireParam[] = []) {}

    bind(...values: unknown[]) {
      return new Statement(this.sql, values.map(serialize));
    }

    private wire() {
      return { sql: this.sql, params: this.params };
    }

    async first<T = unknown>(column?: string): Promise<T | null> {
      const { result } = await post<{ result: T | null }>("/query", { ...this.wire(), mode: "first", column });
      return result ?? null;
    }

    async all<T = unknown>() {
      return post<WireResult>("/query", { ...this.wire(), mode: "all" }) as Promise<D1Result<T>>;
    }

    async run<T = unknown>() {
      return post<WireResult>("/query", { ...this.wire(), mode: "run" }) as Promise<D1Result<T>>;
    }

    async raw<T = unknown[]>() {
      const { results } = await post<{ results: T[] }>("/query", { ...this.wire(), mode: "raw" });
      return results;
    }

    toWire() {
      return this.wire();
    }
  }

  const db = {
    prepare: (sql: string) => new Statement(sql),
    batch: async (statements: Statement[]) =>
      post<WireResult[]>("/batch", { statements: statements.map((statement) => statement.toWire()) }),
  };

  return db as unknown as D1Database;
}
