import {
  exchangeDeviceAuthorization, parseUser, pollDeviceCode, requestDeviceCode,
  resolveConfig, ensureFreshTokens, type ChatGPTTokens, type DeviceCode,
} from "@opencoredev/loginwithchatgpt-core";
import { createChatGPT } from "@opencoredev/loginwithchatgpt-ai";
import { bindings } from "../runtime";
import { decryptAI, encryptAI } from "../ai-crypto";
import type { SessionUser } from "../auth";

const provider = resolveConfig();
type ConnectionRow = { credentials_encrypted: string; status: string; external_account_id: string | null; account_label: string | null; connected_at: string; last_used_at: string | null; token_expires_at: string | null };
type PendingRow = { session_id: string; device_encrypted: string; expires_at: string; next_poll_at: string };

function date(time: number) { return new Date(time).toISOString(); }
function publicConnection(row: ConnectionRow | null) {
  return row ? { status: row.status, accountId: row.external_account_id, accountLabel: row.account_label, connectedAt: row.connected_at, lastUsedAt: row.last_used_at } : { status: "not_connected" };
}

export async function getAIConnection(ownerUserId: string) {
  const row = await bindings().DB.prepare("SELECT status,external_account_id,account_label,connected_at,last_used_at FROM ai_connections WHERE owner_user_id=?")
    .bind(ownerUserId).first<ConnectionRow>();
  return publicConnection(row);
}

export async function startAIConnection(user: SessionUser) {
  const device = await requestDeviceCode(provider);
  const db = bindings().DB;
  const encrypted = await encryptAI(JSON.stringify(device), user.id, "device");
  await db.prepare(`INSERT INTO ai_pending_auth (owner_user_id,session_id,device_encrypted,expires_at,next_poll_at)
    VALUES (?,?,?,?,?) ON CONFLICT(owner_user_id) DO UPDATE SET session_id=excluded.session_id,
    device_encrypted=excluded.device_encrypted,expires_at=excluded.expires_at,next_poll_at=excluded.next_poll_at,
    poll_lease_until=NULL,created_at=CURRENT_TIMESTAMP`)
    .bind(user.id,user.sessionId,encrypted,date(device.expiresAt),date(Date.now() + device.interval * 1000)).run();
  return { status: "pending", userCode: device.userCode, verificationUrl: device.verificationUrl, expiresAt: date(device.expiresAt), interval: device.interval };
}

export async function pendingAIConnection(user: SessionUser) {
  const row = await bindings().DB.prepare("SELECT session_id,device_encrypted,expires_at,next_poll_at FROM ai_pending_auth WHERE owner_user_id=?")
    .bind(user.id).first<PendingRow>();
  if (!row || row.session_id !== user.sessionId) return null;
  if (Date.parse(row.expires_at) <= Date.now()) return { status: "expired" };
  const device = JSON.parse(await decryptAI(row.device_encrypted, user.id, "device")) as DeviceCode;
  return { status: "pending", userCode: device.userCode, verificationUrl: device.verificationUrl, expiresAt: row.expires_at, interval: device.interval };
}

export async function cancelAIConnection(user: SessionUser) {
  await bindings().DB.prepare("DELETE FROM ai_pending_auth WHERE owner_user_id=? AND session_id=?")
    .bind(user.id,user.sessionId).run();
}

export async function pollAIConnection(user: SessionUser) {
  const db = bindings().DB;
  const row = await db.prepare("SELECT session_id,device_encrypted,expires_at,next_poll_at FROM ai_pending_auth WHERE owner_user_id=?")
    .bind(user.id).first<PendingRow>();
  if (!row || row.session_id !== user.sessionId) return { status: "not_connected" };
  if (Date.parse(row.expires_at) <= Date.now()) {
    await cancelAIConnection(user);
    return { status: "expired" };
  }
  const device = JSON.parse(await decryptAI(row.device_encrypted,user.id,"device")) as DeviceCode;
  if (Date.parse(row.next_poll_at) > Date.now()) return { status: "pending", retryAfter: Math.max(1,Math.ceil((Date.parse(row.next_poll_at)-Date.now())/1000)) };
  const lease = await db.prepare(`UPDATE ai_pending_auth SET poll_lease_until=? WHERE owner_user_id=? AND session_id=?
    AND device_encrypted=? AND next_poll_at<=? AND (poll_lease_until IS NULL OR poll_lease_until<?)`)
    .bind(date(Date.now()+30_000),user.id,user.sessionId,row.device_encrypted,date(Date.now()),date(Date.now())).run();
  if (!lease.meta.changes) return { status: "pending", retryAfter: device.interval };
  try {
    const result = await pollDeviceCode(provider, device);
    if (result.status === "pending") {
      await db.prepare(`UPDATE ai_pending_auth SET next_poll_at=?,poll_lease_until=NULL
        WHERE owner_user_id=? AND session_id=? AND device_encrypted=?`)
        .bind(date(Date.now()+Math.max(device.interval,5)*1000),user.id,user.sessionId,row.device_encrypted).run();
      return { status: "pending", retryAfter: device.interval };
    }
    const tokens = await exchangeDeviceAuthorization(provider,result);
    const stillCurrent = await db.prepare("SELECT 1 AS valid FROM ai_pending_auth WHERE owner_user_id=? AND session_id=? AND device_encrypted=?")
      .bind(user.id,user.sessionId,row.device_encrypted).first();
    if (!stillCurrent) return { status: "cancelled" };
    const account = tokens.idToken ? parseUser(tokens.idToken) : null;
    await db.prepare(`INSERT INTO ai_connections
      (owner_user_id,provider,auth_type,credentials_encrypted,external_account_id,account_label,status,token_expires_at)
      VALUES (?,'openai','chatgpt_device_oauth',?,?,?,'connected',?)
      ON CONFLICT(owner_user_id) DO UPDATE SET credentials_encrypted=excluded.credentials_encrypted,
      external_account_id=excluded.external_account_id,account_label=excluded.account_label,
      token_expires_at=excluded.token_expires_at,status='connected',connected_at=CURRENT_TIMESTAMP,updated_at=CURRENT_TIMESTAMP`)
      .bind(user.id,await encryptAI(JSON.stringify(tokens),user.id,"credentials"),tokens.accountId??account?.accountId??null,account?.email??account?.name??null,tokens.expiresAt?date(tokens.expiresAt):null).run();
    await cancelAIConnection(user);
    return { status: "connected" };
  } catch {
    await db.prepare("UPDATE ai_pending_auth SET next_poll_at=?,poll_lease_until=NULL WHERE owner_user_id=? AND session_id=? AND device_encrypted=?")
      .bind(date(Date.now()+Math.max(device.interval,5)*1000),user.id,user.sessionId,row.device_encrypted).run();
    return { status: "error", message: "Authorization could not be completed. Try again." };
  }
}

export async function disconnectAI(ownerUserId: string) {
  await bindings().DB.batch([
    bindings().DB.prepare("DELETE FROM ai_connections WHERE owner_user_id=?").bind(ownerUserId),
    bindings().DB.prepare("DELETE FROM ai_pending_auth WHERE owner_user_id=?").bind(ownerUserId),
  ]);
}

async function readCredentials(ownerUserId: string) {
  const row = await bindings().DB.prepare("SELECT * FROM ai_connections WHERE owner_user_id=?")
    .bind(ownerUserId).first<ConnectionRow>();
  if (!row || row.status !== "connected") throw new Error("AI_NOT_CONNECTED");
  return { row, tokens: JSON.parse(await decryptAI(row.credentials_encrypted,ownerUserId,"credentials")) as ChatGPTTokens };
}

async function persistCredentials(ownerUserId: string, tokens: ChatGPTTokens, oldCiphertext: string) {
  await bindings().DB.prepare(`UPDATE ai_connections SET credentials_encrypted=?,token_expires_at=?,status='connected',updated_at=CURRENT_TIMESTAMP
    WHERE owner_user_id=? AND credentials_encrypted=?`)
    .bind(await encryptAI(JSON.stringify(tokens),ownerUserId,"credentials"),tokens.expiresAt?date(tokens.expiresAt):null,ownerUserId,oldCiphertext).run();
}

export async function aiProvider(ownerUserId: string) {
  const { row, tokens } = await readCredentials(ownerUserId);
  let fresh: ChatGPTTokens;
  try {
    fresh = await ensureFreshTokens(provider,tokens,{
      onRefresh: updated => persistCredentials(ownerUserId,updated,row.credentials_encrypted),
    });
  } catch {
    const latest = await bindings().DB.prepare("SELECT credentials_encrypted FROM ai_connections WHERE owner_user_id=?")
      .bind(ownerUserId).first<{credentials_encrypted:string}>();
    if (latest?.credentials_encrypted !== row.credentials_encrypted) return aiProvider(ownerUserId);
    await bindings().DB.prepare("UPDATE ai_connections SET status='reauth_required',updated_at=CURRENT_TIMESTAMP WHERE owner_user_id=? AND credentials_encrypted=?")
      .bind(ownerUserId,row.credentials_encrypted).run();
    throw new Error("AI_REAUTH_REQUIRED");
  }
  const current = await readCredentials(ownerUserId);
  const active = current.row.credentials_encrypted === row.credentials_encrypted ? fresh : current.tokens;
  return createChatGPT({ credentials: active,
    onRefresh: updated => persistCredentials(ownerUserId,updated,current.row.credentials_encrypted),
  });
}
