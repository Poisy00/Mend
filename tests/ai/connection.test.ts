import assert from "node:assert/strict";
import test from "node:test";
import { freshDatabase } from "../helpers/mock-d1";
import { setRuntimeBindings } from "../../lib/server/runtime";
import { login, getSessionByToken } from "../../lib/server/auth";

test("device authorization binds pending state to the user's session and encrypts it",async()=>{
  const originalFetch=globalThis.fetch;
  let calls=0;
  globalThis.fetch=async input=>{
    const url=String(input);
    if(url.endsWith("/deviceauth/usercode")){calls++;return Response.json({device_auth_id:"device-secret",user_code:"TEST-CODE",interval:1});}
    if(url.endsWith("/deviceauth/token")){calls++;return new Response(null,{status:403});}
    throw new Error(`Unexpected endpoint: ${url}`);
  };
  const {db,dispose}=await freshDatabase();
  setRuntimeBindings({DB:db,AUTH_PEPPER:"test-pepper",DATA_ENCRYPTION_KEY:"nKPhcCMGUx0OEUoVfC50LPCPbNGy7kdNQTpDqtwPpXU",AI_CREDENTIALS_ENCRYPTION_KEY:"nKPhcCMGUx0OEUoVfC50LPCPbNGy7kdNQTpDqtwPpXU",BOOTSTRAP_ADMIN_USERNAME:"admin",BOOTSTRAP_ADMIN_PASSWORD:"initial-password-123"});
  try {
    const {startAIConnection,pendingAIConnection,pollAIConnection,cancelAIConnection}=await import("../../lib/server/ai/connection");
    const signedIn=await login("admin","initial-password-123",new Request("https://mend.test"));assert.ok(signedIn);
    const user=await getSessionByToken(signedIn.session.rawToken);assert.ok(user);
    const pending=await startAIConnection(user);
    assert.equal(pending.userCode,"TEST-CODE");assert.equal(calls,1);
    const row=await db.prepare("SELECT device_encrypted FROM ai_pending_auth WHERE owner_user_id=?").bind(user.id).first<{device_encrypted:string}>();
    assert.ok(row?.device_encrypted.startsWith("v1."));assert.ok(!row?.device_encrypted.includes("device-secret"));
    assert.equal((await pendingAIConnection(user))?.status,"pending");
    assert.equal(await pendingAIConnection({...user,sessionId:crypto.randomUUID()}),null);
    assert.equal((await pollAIConnection(user)).status,"pending");assert.equal(calls,1);
    await db.prepare("UPDATE ai_pending_auth SET next_poll_at=? WHERE owner_user_id=?").bind(new Date(0).toISOString(),user.id).run();
    assert.equal((await pollAIConnection(user)).status,"pending");assert.equal(calls,2);
    await cancelAIConnection(user);assert.equal(await pendingAIConnection(user),null);
  } finally {setRuntimeBindings(undefined);await dispose();globalThis.fetch=originalFetch;}
});
