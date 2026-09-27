import { z } from "zod";

export const SESSION_COOKIE = "mend_session";

export function json(data: unknown, init: ResponseInit = {}) {
  const headers = new Headers(init.headers);
  headers.set("content-type", "application/json; charset=utf-8");
  headers.set("cache-control", "no-store");
  headers.set("x-content-type-options", "nosniff");
  return new Response(JSON.stringify(data), { ...init, headers });
}

export function errorJson(status: number, message: string) {
  return json({ error: message }, { status });
}

export async function parseJson<T>(request: Request, schema: z.ZodType<T>): Promise<T> {
  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().includes("application/json")) throw new Error("INVALID_REQUEST");
  const result = schema.safeParse(await request.json());
  if (!result.success) throw new Error("INVALID_REQUEST");
  return result.data;
}

export function requireSameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  const expected = new URL(request.url).origin;
  if (!origin || origin !== expected) throw new Error("INVALID_ORIGIN");
}

export function readCookie(request: Request, name: string) {
  const cookie = request.headers.get("cookie") ?? "";
  for (const entry of cookie.split(";")) {
    const [key, ...rest] = entry.trim().split("=");
    if (key === name) return decodeURIComponent(rest.join("="));
  }
  return null;
}

export function sessionCookie(token: string, maxAgeSeconds: number) {
  return `${SESSION_COOKIE}=${encodeURIComponent(token)}; Path=/; Max-Age=${maxAgeSeconds}; Secure; HttpOnly; SameSite=Strict; Priority=High`;
}

export function clearSessionCookie() {
  return `${SESSION_COOKIE}=; Path=/; Max-Age=0; Secure; HttpOnly; SameSite=Strict; Priority=High`;
}

export function safeUserAgent(value: string | null) {
  return (value ?? "Unknown browser").replace(/[\u0000-\u001f\u007f]/gu, " ").slice(0, 160);
}

