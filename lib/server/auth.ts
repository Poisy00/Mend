import { bindings, requiredSecret } from "./runtime";
import { hashPassword, randomToken, sha256, verifyPassword } from "./crypto";
import { readCookie, safeUserAgent, SESSION_COOKIE } from "./http";

const SESSION_ABSOLUTE_SECONDS = 12 * 60 * 60;
const SESSION_IDLE_SECONDS = 30 * 60;
const LOCKOUT_MINUTES = 15;
const DUMMY_PASSWORD_HASH = "pbkdf2-sha256$600000$AAAAAAAAAAAAAAAAAAAAAA$AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA";

export type SessionUser = {
  id: string;
  username: string;
  displayName: string;
  role: "user" | "admin";
  mustChangePassword: boolean;
  sessionId: string;
  expiresAt: string;
};

type UserRow = {
  id: string;
  username: string;
  username_normalized: string;
  password_hash: string;
  display_name: string;
  role: "user" | "admin";
  status: "active" | "disabled";
  must_change_password: number;
  failed_login_count: number;
  locked_until: string | null;
};

function normalizeUsername(value: string) {
  return value.trim().normalize("NFKC").toLocaleLowerCase("en-US");
}

function isoAfter(seconds: number) {
  return new Date(Date.now() + seconds * 1000).toISOString();
}

function parseStoredTimestamp(value: string) {
  const normalized = value.includes("T") || /(?:Z|[+-]\d{2}:?\d{2})$/u.test(value)
    ? value
    : `${value.replace(" ", "T")}Z`;
  return Date.parse(normalized);
}

async function originFingerprint(request: Request) {
  const address = request.headers.get("cf-connecting-ip") ?? "unknown";
  const agent = safeUserAgent(request.headers.get("user-agent"));
  return sha256(`${address}\u0000${agent}\u0000${requiredSecret("AUTH_PEPPER")}`);
}

async function audit(
  db: D1Database,
  request: Request,
  eventType: string,
  outcome: string,
  actorUserId: string | null,
  targetUserId: string | null,
  metadata: Record<string, string | number | boolean> = {},
) {
  await db.prepare(
    `INSERT INTO auth_audit_log
      (id, actor_user_id, target_user_id, event_type, outcome, origin_fingerprint, metadata_json)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
  ).bind(
    crypto.randomUUID(), actorUserId, targetUserId, eventType, outcome,
    await originFingerprint(request), JSON.stringify(metadata),
  ).run();
}

export async function ensureBootstrapAdmin(request: Request) {
  const runtime = bindings();
  const existing = await runtime.DB.prepare("SELECT id FROM users WHERE role = 'admin' LIMIT 1").first<{ id: string }>();
  requiredSecret("AUTH_PEPPER");
  requiredSecret("DATA_ENCRYPTION_KEY");

  if (!existing) {
    const username = runtime.BOOTSTRAP_ADMIN_USERNAME?.trim();
    const password = runtime.BOOTSTRAP_ADMIN_PASSWORD ?? "";
    if (!username || password.length < 12) throw new Error("BOOTSTRAP_CONFIGURATION_REQUIRED");

    const normalized = normalizeUsername(username);
    if (!/^[a-z0-9][a-z0-9._-]{2,63}$/u.test(normalized)) throw new Error("BOOTSTRAP_CONFIGURATION_INVALID");
    const id = crypto.randomUUID();
    const passwordHash = await hashPassword(password);
    try {
      await runtime.DB.batch([
        runtime.DB.prepare(
          `INSERT INTO users
            (id, username, username_normalized, password_hash, display_name, role, status, must_change_password)
           VALUES (?, ?, ?, ?, ?, 'admin', 'active', 1)`,
        ).bind(id, username, normalized, passwordHash, username),
        runtime.DB.prepare(
          `INSERT INTO user_preferences
            (user_id, primary_timezone, customer_timezone, time_display_preference)
           VALUES (?, 'Africa/Cairo', 'America/New_York', '12h')`,
        ).bind(id),
        runtime.DB.prepare(
          "INSERT INTO system_markers (key, value) VALUES ('bootstrap_completed', ?)",
        ).bind(new Date().toISOString()),
        runtime.DB.prepare(
          `INSERT INTO auth_audit_log
            (id, actor_user_id, target_user_id, event_type, outcome, origin_fingerprint, metadata_json)
           VALUES (?, ?, ?, 'bootstrap_admin_created', 'success', ?, '{}')`,
        ).bind(crypto.randomUUID(), id, id, await originFingerprint(request)),
      ]);
    } catch (error) {
      const wonRace = await runtime.DB.prepare("SELECT id FROM users WHERE role = 'admin' LIMIT 1").first();
      if (!wonRace) throw error;
    }
  }

  const userUsername = runtime.BOOTSTRAP_USER_USERNAME?.trim();
  const userPassword = runtime.BOOTSTRAP_USER_PASSWORD ?? "";
  if (!userUsername && !userPassword) return;
  if (!userUsername || userPassword.length < 12) throw new Error("BOOTSTRAP_CONFIGURATION_REQUIRED");
  const userNormalized = normalizeUsername(userUsername);
  if (!/^[a-z0-9][a-z0-9._-]{2,63}$/u.test(userNormalized)) throw new Error("BOOTSTRAP_CONFIGURATION_INVALID");
  const existingUser = await runtime.DB.prepare("SELECT id FROM users WHERE username_normalized = ? LIMIT 1")
    .bind(userNormalized).first<{ id: string }>();
  if (existingUser) return;

  const userId = crypto.randomUUID();
  try {
    await runtime.DB.batch([
      runtime.DB.prepare(
        `INSERT INTO users
          (id, username, username_normalized, password_hash, display_name, role, status, must_change_password)
         VALUES (?, ?, ?, ?, ?, 'user', 'active', 1)`,
      ).bind(userId, userUsername, userNormalized, await hashPassword(userPassword), userUsername),
      runtime.DB.prepare(
        `INSERT INTO user_preferences
          (user_id, primary_timezone, customer_timezone, time_display_preference)
         VALUES (?, 'Africa/Cairo', 'America/New_York', '12h')`,
      ).bind(userId),
      runtime.DB.prepare(
        `INSERT INTO auth_audit_log
          (id, actor_user_id, target_user_id, event_type, outcome, origin_fingerprint, metadata_json)
         VALUES (?, NULL, ?, 'bootstrap_user_created', 'success', ?, '{}')`,
      ).bind(crypto.randomUUID(), userId, await originFingerprint(request)),
    ]);
  } catch (error) {
    const wonRace = await runtime.DB.prepare("SELECT id FROM users WHERE username_normalized = ? LIMIT 1")
      .bind(userNormalized).first();
    if (!wonRace) throw error;
  }
}

async function throttleKey(request: Request, normalized: string) {
  return sha256(`${await originFingerprint(request)}\u0000${normalized}`);
}

async function isThrottled(db: D1Database, keyHash: string) {
  const row = await db.prepare("SELECT blocked_until FROM login_throttles WHERE key_hash = ?").bind(keyHash).first<{ blocked_until: string | null }>();
  return Boolean(row?.blocked_until && Date.parse(row.blocked_until) > Date.now());
}

async function recordThrottleFailure(db: D1Database, keyHash: string) {
  const now = new Date();
  const windowStart = new Date(now.getTime() - LOCKOUT_MINUTES * 60_000).toISOString();
  const row = await db.prepare(
    "SELECT failed_count, window_started_at FROM login_throttles WHERE key_hash = ?",
  ).bind(keyHash).first<{ failed_count: number; window_started_at: string }>();
  const count = row && row.window_started_at >= windowStart ? row.failed_count + 1 : 1;
  const blockedUntil = count >= 10 ? new Date(now.getTime() + LOCKOUT_MINUTES * 60_000).toISOString() : null;
  await db.prepare(
    `INSERT INTO login_throttles (key_hash, failed_count, window_started_at, blocked_until)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(key_hash) DO UPDATE SET
       failed_count = excluded.failed_count,
       window_started_at = excluded.window_started_at,
       blocked_until = excluded.blocked_until`,
  ).bind(keyHash, count, row && row.window_started_at >= windowStart ? row.window_started_at : now.toISOString(), blockedUntil).run();
}

async function createSession(db: D1Database, userId: string, request: Request) {
  const rawToken = randomToken(32);
  const tokenHash = await sha256(rawToken);
  const id = crypto.randomUUID();
  const expiresAt = isoAfter(SESSION_ABSOLUTE_SECONDS);
  await db.prepare(
    `INSERT INTO sessions (id, user_id, token_hash, user_agent_summary, expires_at)
     VALUES (?, ?, ?, ?, ?)`,
  ).bind(id, userId, tokenHash, safeUserAgent(request.headers.get("user-agent")), expiresAt).run();
  return { rawToken, id, expiresAt, maxAge: SESSION_ABSOLUTE_SECONDS };
}

export async function login(username: string, password: string, request: Request) {
  await ensureBootstrapAdmin(request);
  const db = bindings().DB;
  const normalized = normalizeUsername(username);
  const keyHash = await throttleKey(request, normalized);
  if (await isThrottled(db, keyHash)) {
    await audit(db, request, "login_failed", "throttled", null, null);
    return null;
  }

  const user = await db.prepare(
    `SELECT id, username, username_normalized, password_hash, display_name, role, status,
            must_change_password, failed_login_count, locked_until
     FROM users WHERE username_normalized = ? LIMIT 1`,
  ).bind(normalized).first<UserRow>();
  const validPassword = await verifyPassword(password, user?.password_hash ?? DUMMY_PASSWORD_HASH);
  const locked = Boolean(user?.locked_until && Date.parse(user.locked_until) > Date.now());
  if (!user || !validPassword || locked || user.status !== "active") {
    await recordThrottleFailure(db, keyHash);
    if (user) {
      const failures = user.failed_login_count + 1;
      const lockedUntil = failures >= 5 ? isoAfter(LOCKOUT_MINUTES * 60) : user.locked_until;
      await db.prepare(
        "UPDATE users SET failed_login_count = ?, locked_until = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
      ).bind(failures >= 5 ? 0 : failures, lockedUntil, user.id).run();
      await audit(db, request, failures >= 5 ? "account_locked" : "login_failed", "failure", null, user.id);
    } else {
      await audit(db, request, "login_failed", "failure", null, null);
    }
    return null;
  }

  const existingToken = readCookie(request, SESSION_COOKIE);
  if (existingToken) {
    await db.prepare("UPDATE sessions SET revoked_at = CURRENT_TIMESTAMP WHERE token_hash = ? AND revoked_at IS NULL")
      .bind(await sha256(existingToken)).run();
  }
  const session = await createSession(db, user.id, request);
  await db.batch([
    db.prepare("UPDATE users SET failed_login_count = 0, locked_until = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = ?").bind(user.id),
    db.prepare("DELETE FROM login_throttles WHERE key_hash = ?").bind(keyHash),
  ]);
  await audit(db, request, "login_success", "success", user.id, user.id);
  return { session, user };
}

export async function recoverAdministrator(nextPassword: string, request: Request) {
  const runtime = bindings();
  const expectedEmail = runtime.OWNER_RECOVERY_EMAIL?.trim().toLocaleLowerCase("en-US");
  const signedInEmail = request.headers.get("oai-authenticated-user-email")?.trim().toLocaleLowerCase("en-US");
  if (!expectedEmail || !signedInEmail || signedInEmail !== expectedEmail) return null;

  const admin = await runtime.DB.prepare(
    "SELECT id FROM users WHERE role = 'admin' LIMIT 1",
  ).first<{ id: string }>();
  if (!admin) return null;

  const nextSession = await createSession(runtime.DB, admin.id, request);
  await runtime.DB.batch([
    runtime.DB.prepare(
      `UPDATE users SET password_hash = ?, status = 'active', must_change_password = 0,
       failed_login_count = 0, locked_until = NULL, password_changed_at = CURRENT_TIMESTAMP,
       updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
    ).bind(await hashPassword(nextPassword), admin.id),
    runtime.DB.prepare(
      "UPDATE sessions SET revoked_at = CURRENT_TIMESTAMP WHERE user_id = ? AND id <> ? AND revoked_at IS NULL",
    ).bind(admin.id, nextSession.id),
  ]);
  await audit(runtime.DB, request, "owner_password_recovery", "success", admin.id, admin.id);
  return nextSession;
}

export async function getSession(request: Request): Promise<SessionUser | null> {
  const rawToken = readCookie(request, SESSION_COOKIE);
  return getSessionByToken(rawToken);
}

export async function getSessionByToken(rawToken: string | null | undefined): Promise<SessionUser | null> {
  if (!rawToken) return null;
  const tokenHash = await sha256(rawToken);
  const row = await bindings().DB.prepare(
    `SELECT s.id AS session_id, s.last_seen_at, s.expires_at,
            u.id, u.username, u.display_name, u.role, u.status, u.must_change_password
     FROM sessions s JOIN users u ON u.id = s.user_id
     WHERE s.token_hash = ? AND s.revoked_at IS NULL LIMIT 1`,
  ).bind(tokenHash).first<{
    session_id: string; last_seen_at: string; expires_at: string;
    id: string; username: string; display_name: string; role: "user" | "admin";
    status: "active" | "disabled"; must_change_password: number;
  }>();
  if (!row || row.status !== "active" || Date.parse(row.expires_at) <= Date.now()) return null;
  if (parseStoredTimestamp(row.last_seen_at) + SESSION_IDLE_SECONDS * 1000 <= Date.now()) {
    await bindings().DB.prepare("UPDATE sessions SET revoked_at = CURRENT_TIMESTAMP WHERE id = ?").bind(row.session_id).run();
    return null;
  }
  if (parseStoredTimestamp(row.last_seen_at) + 5 * 60_000 <= Date.now()) {
    await bindings().DB.prepare("UPDATE sessions SET last_seen_at = CURRENT_TIMESTAMP WHERE id = ?").bind(row.session_id).run();
  }
  return {
    id: row.id,
    username: row.username,
    displayName: row.display_name,
    role: row.role,
    mustChangePassword: Boolean(row.must_change_password),
    sessionId: row.session_id,
    expiresAt: row.expires_at,
  };
}

export async function requireSession(request: Request, role?: "admin") {
  const session = await getSession(request);
  if (!session || (role && session.role !== role)) return null;
  return session;
}

export async function revokeCurrentSession(request: Request) {
  const token = readCookie(request, SESSION_COOKIE);
  if (!token) return;
  await bindings().DB.prepare("UPDATE sessions SET revoked_at = CURRENT_TIMESTAMP WHERE token_hash = ? AND revoked_at IS NULL")
    .bind(await sha256(token)).run();
}

export async function changeOwnPassword(session: SessionUser, currentPassword: string, nextPassword: string, request: Request) {
  const db = bindings().DB;
  const row = await db.prepare("SELECT password_hash FROM users WHERE id = ? AND status = 'active'").bind(session.id).first<{ password_hash: string }>();
  if (!row || !(await verifyPassword(currentPassword, row.password_hash))) return null;
  const nextHash = await hashPassword(nextPassword);
  const nextSession = await createSession(db, session.id, request);
  await db.batch([
    db.prepare(
      `UPDATE users SET password_hash = ?, must_change_password = 0,
       password_changed_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
    ).bind(nextHash, session.id),
    db.prepare("UPDATE sessions SET revoked_at = CURRENT_TIMESTAMP WHERE user_id = ? AND id <> ? AND revoked_at IS NULL").bind(session.id, nextSession.id),
  ]);
  await audit(db, request, "password_changed", "success", session.id, session.id);
  return nextSession;
}

export async function writeAuditEvent(
  request: Request,
  eventType: string,
  outcome: string,
  actorUserId: string,
  targetUserId: string,
  metadata: Record<string, string | number | boolean> = {},
) {
  return audit(bindings().DB, request, eventType, outcome, actorUserId, targetUserId, metadata);
}

export { normalizeUsername, SESSION_ABSOLUTE_SECONDS };
