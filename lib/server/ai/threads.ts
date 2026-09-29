import { bindings } from "../runtime";
import { encryptAI, decryptAI } from "../ai-crypto";

type ThreadRow = { id: string; title: string; model: string | null; created_at: string; updated_at: string };
type MessageRow = { id: string; role: "user" | "assistant"; content_encrypted: string; created_at: string };

export async function listAIThreads(ownerUserId: string) {
  const rows = await bindings().DB.prepare("SELECT id,title,model,created_at,updated_at FROM ai_threads WHERE owner_user_id=? ORDER BY updated_at DESC,id DESC LIMIT 20")
    .bind(ownerUserId).all<ThreadRow>();
  return rows.results.map(row => ({ id: row.id, title: row.title, model: row.model, createdAt: row.created_at, updatedAt: row.updated_at }));
}

export async function getAIThread(ownerUserId: string, threadId: string) {
  const db = bindings().DB;
  const thread = await db.prepare("SELECT id,title,model,created_at,updated_at FROM ai_threads WHERE owner_user_id=? AND id=?")
    .bind(ownerUserId,threadId).first<ThreadRow>();
  if (!thread) return null;
  const rows = await db.prepare("SELECT id,role,content_encrypted,created_at FROM ai_messages WHERE owner_user_id=? AND thread_id=? ORDER BY created_at,id LIMIT 100")
    .bind(ownerUserId,threadId).all<MessageRow>();
  const messages = await Promise.all(rows.results.map(async row => ({ id: row.id, role: row.role,
    content: await decryptAI(row.content_encrypted,ownerUserId,`message:${threadId}`), createdAt: row.created_at })));
  return { id: thread.id, title: thread.title, model: thread.model, messages };
}

export async function createAIThread(ownerUserId: string, title: string) {
  const id = crypto.randomUUID();
  await bindings().DB.prepare("INSERT INTO ai_threads (id,owner_user_id,title) VALUES (?,?,?)")
    .bind(id,ownerUserId,title.slice(0,80)).run();
  return id;
}

export async function appendAIMessage(ownerUserId: string, threadId: string, role: "user" | "assistant", content: string) {
  const encrypted = await encryptAI(content,ownerUserId,`message:${threadId}`);
  const db = bindings().DB;
  const result = await db.prepare(`INSERT INTO ai_messages (id,thread_id,owner_user_id,role,content_encrypted)
    SELECT ?,id,owner_user_id,?,? FROM ai_threads WHERE id=? AND owner_user_id=?`)
    .bind(crypto.randomUUID(),role,encrypted,threadId,ownerUserId).run();
  if (!result.meta.changes) throw new Error("THREAD_NOT_FOUND");
  await db.prepare("UPDATE ai_threads SET updated_at=CURRENT_TIMESTAMP WHERE id=? AND owner_user_id=?")
    .bind(threadId,ownerUserId).run();
}

export async function deleteAIThread(ownerUserId: string, threadId: string) {
  const result = await bindings().DB.prepare("DELETE FROM ai_threads WHERE owner_user_id=? AND id=?")
    .bind(ownerUserId,threadId).run();
  return Boolean(result.meta.changes);
}

export async function setAIThreadModel(ownerUserId: string, threadId: string, model: string) {
  await bindings().DB.prepare("UPDATE ai_threads SET model=?,updated_at=CURRENT_TIMESTAMP WHERE owner_user_id=? AND id=?")
    .bind(model,ownerUserId,threadId).run();
}
