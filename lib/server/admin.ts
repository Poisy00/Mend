import { bindings } from "./runtime";
import { hashPassword } from "./crypto";
import { normalizeUsername } from "./auth";

export type AgentSummary = { id:string; username:string; displayName:string; role:"user"|"admin"; status:"active"|"disabled"; mustChangePassword:boolean; createdAt:string };

async function assertAdmin(adminId:string) {
  const row=await bindings().DB.prepare("SELECT id FROM users WHERE id = ? AND role = 'admin' AND status = 'active'").bind(adminId).first();
  if(!row) throw new Error("FORBIDDEN");
}
export async function listAgents(adminId:string):Promise<AgentSummary[]> {
  await assertAdmin(adminId);
  const rows=await bindings().DB.prepare("SELECT id, username, display_name, role, status, must_change_password, created_at FROM users ORDER BY created_at DESC").all<{id:string;username:string;display_name:string;role:"user"|"admin";status:"active"|"disabled";must_change_password:number;created_at:string}>();
  return rows.results.map(row=>({id:row.id,username:row.username,displayName:row.display_name,role:row.role,status:row.status,mustChangePassword:Boolean(row.must_change_password),createdAt:row.created_at}));
}
export async function createAgent(adminId:string,input:{username:string;displayName:string;temporaryPassword:string}):Promise<AgentSummary> {
  await assertAdmin(adminId);
  const username=input.username.trim(), normalized=normalizeUsername(username), displayName=input.displayName.trim();
  if(!/^[a-z0-9][a-z0-9._-]{2,63}$/u.test(normalized)) throw new Error("Username must be 3–64 letters, numbers, dots, underscores, or hyphens");
  if(!displayName || displayName.length>100) throw new Error("Display name is required");
  if(input.temporaryPassword.length<12) throw new Error("Temporary password must be at least 12 characters");
  const id=crypto.randomUUID();
  await bindings().DB.batch([
    bindings().DB.prepare("INSERT INTO users (id,username,username_normalized,password_hash,display_name,role,status,must_change_password,created_by_user_id) VALUES (?,?,?,?,?,'user','active',1,?)").bind(id,username,normalized,await hashPassword(input.temporaryPassword),displayName,adminId),
    bindings().DB.prepare("INSERT INTO user_preferences (user_id) VALUES (?)").bind(id),
  ]);
  return {id,username,displayName,role:"user",status:"active",mustChangePassword:true,createdAt:new Date().toISOString()};
}
export async function disableAgent(adminId:string,userId:string):Promise<void> {
  await assertAdmin(adminId);
  if(adminId===userId) throw new Error("Cannot disable your own administrator account");
  const row=await bindings().DB.prepare("SELECT role FROM users WHERE id = ?").bind(userId).first<{role:string}>();
  if(!row) throw new Error("NOT_FOUND");
  if(row.role==="admin") throw new Error("Cannot disable another administrator");
  await bindings().DB.batch([
    bindings().DB.prepare("UPDATE users SET status = 'disabled', updated_at = CURRENT_TIMESTAMP WHERE id = ?").bind(userId),
    bindings().DB.prepare("UPDATE sessions SET revoked_at = CURRENT_TIMESTAMP WHERE user_id = ? AND revoked_at IS NULL").bind(userId),
  ]);
}
export async function resetAgentPassword(adminId:string,userId:string,temporaryPassword:string):Promise<void> {
  await assertAdmin(adminId);
  if(temporaryPassword.length<12) throw new Error("Temporary password must be at least 12 characters");
  const row=await bindings().DB.prepare("SELECT role FROM users WHERE id = ?").bind(userId).first<{role:string}>();
  if(!row || row.role==="admin") throw new Error("NOT_FOUND");
  await bindings().DB.batch([
    bindings().DB.prepare("UPDATE users SET password_hash = ?, must_change_password = 1, failed_login_count = 0, locked_until = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = ?").bind(await hashPassword(temporaryPassword),userId),
    bindings().DB.prepare("UPDATE sessions SET revoked_at = CURRENT_TIMESTAMP WHERE user_id = ? AND revoked_at IS NULL").bind(userId),
  ]);
}
