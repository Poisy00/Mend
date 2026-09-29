import { env } from "cloudflare:workers";

export type RuntimeBindings = {
  DB: D1Database;
  AUTH_PEPPER?: string;
  DATA_ENCRYPTION_KEY?: string;
  AI_CREDENTIALS_ENCRYPTION_KEY?: string;
  BOOTSTRAP_ADMIN_USERNAME?: string;
  BOOTSTRAP_ADMIN_PASSWORD?: string;
  BOOTSTRAP_USER_USERNAME?: string;
  BOOTSTRAP_USER_PASSWORD?: string;
  OWNER_RECOVERY_TOKEN?: string;
};

let testBindings: RuntimeBindings | undefined;

export function setRuntimeBindings(value: RuntimeBindings | undefined) {
  testBindings = value;
}

export function bindings(): RuntimeBindings {
  const value = testBindings ?? (env as unknown as RuntimeBindings);
  if (!value?.DB) throw new Error("Database binding unavailable");
  return value;
}

export function requiredSecret(name: "AUTH_PEPPER" | "DATA_ENCRYPTION_KEY" | "AI_CREDENTIALS_ENCRYPTION_KEY") {
  const value = bindings()[name]?.trim();
  if (!value) throw new Error(`Required runtime secret ${name} is unavailable`);
  return value;
}
