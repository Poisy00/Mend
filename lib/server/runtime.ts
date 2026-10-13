import { createRemoteD1 } from "./d1-remote";

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
let cached: RuntimeBindings | undefined;

export function setRuntimeBindings(value: RuntimeBindings | undefined) {
  testBindings = value;
}

function fromEnvironment(): RuntimeBindings {
  const url = process.env.DB_BRIDGE_URL?.trim();
  const token = process.env.DB_BRIDGE_TOKEN?.trim();
  if (!url || !token) throw new Error("Database bridge is not configured: set DB_BRIDGE_URL and DB_BRIDGE_TOKEN");
  const { env } = process;
  return {
    DB: createRemoteD1({ url, token }),
    AUTH_PEPPER: env.AUTH_PEPPER,
    DATA_ENCRYPTION_KEY: env.DATA_ENCRYPTION_KEY,
    AI_CREDENTIALS_ENCRYPTION_KEY: env.AI_CREDENTIALS_ENCRYPTION_KEY,
    BOOTSTRAP_ADMIN_USERNAME: env.BOOTSTRAP_ADMIN_USERNAME,
    BOOTSTRAP_ADMIN_PASSWORD: env.BOOTSTRAP_ADMIN_PASSWORD,
    BOOTSTRAP_USER_USERNAME: env.BOOTSTRAP_USER_USERNAME,
    BOOTSTRAP_USER_PASSWORD: env.BOOTSTRAP_USER_PASSWORD,
    OWNER_RECOVERY_TOKEN: env.OWNER_RECOVERY_TOKEN,
  };
}

export function bindings(): RuntimeBindings {
  if (testBindings) return testBindings;
  cached ??= fromEnvironment();
  return cached;
}

export function requiredSecret(name: "AUTH_PEPPER" | "DATA_ENCRYPTION_KEY" | "AI_CREDENTIALS_ENCRYPTION_KEY") {
  const value = bindings()[name]?.trim();
  if (!value) throw new Error(`Required runtime secret ${name} is unavailable`);
  return value;
}
