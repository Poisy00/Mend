import assert from "node:assert/strict";
import test from "node:test";
import { freshDatabase } from "./helpers/mock-d1";
import { setRuntimeBindings } from "../lib/server/runtime";
import { hashPassword } from "../lib/server/crypto";
import { createAgent, disableAgent } from "../lib/server/admin";

test("only admins provision agents and disabling revokes access", async () => {
  const { db, dispose } = await freshDatabase();
  setRuntimeBindings({ DB: db, AUTH_PEPPER: "test-pepper", DATA_ENCRYPTION_KEY: "nKPhcCMGUx0OEUoVfC50LPCPbNGy7kdNQTpDqtwPpXU" });
  try {
    const adminId = crypto.randomUUID(), agentId = crypto.randomUUID();
    await db.prepare("INSERT INTO users (id,username,username_normalized,password_hash,display_name,role,status,must_change_password) VALUES (?,?,?,?,?,'admin','active',0)").bind(adminId,"admin","admin",await hashPassword("admin-password-123"),"Admin").run();
    await db.prepare("INSERT INTO users (id,username,username_normalized,password_hash,display_name,role,status,must_change_password) VALUES (?,?,?,?,?,'user','active',0)").bind(agentId,"agent","agent",await hashPassword("agent-password-123"),"Agent").run();
    await assert.rejects(() => createAgent(agentId,{username:"newagent",displayName:"New Agent",temporaryPassword:"temporary-password-123"}));
    await assert.rejects(() => createAgent(adminId,{username:"newagent",displayName:"New Agent",temporaryPassword:"short"}));
    const created = await createAgent(adminId,{username:"newagent",displayName:"New Agent",temporaryPassword:"temporary-password-123"});
    assert.equal(created.mustChangePassword,true);
    await disableAgent(adminId,created.id);
    const row = await db.prepare("SELECT status FROM users WHERE id = ?").bind(created.id).first<{status:string}>();
    assert.equal(row?.status,"disabled");
  } finally { setRuntimeBindings(undefined); await dispose(); }
});
