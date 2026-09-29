import assert from "node:assert/strict";
import test from "node:test";
import { freshDatabase } from "../helpers/mock-d1";
import { setRuntimeBindings } from "../../lib/server/runtime";
import { encryptAI, decryptAI } from "../../lib/server/ai-crypto";
import { appendAIMessage, createAIThread, deleteAIThread, getAIThread, listAIThreads } from "../../lib/server/ai/threads";
import { hashPassword } from "../../lib/server/crypto";

const key="nKPhcCMGUx0OEUoVfC50LPCPbNGy7kdNQTpDqtwPpXU";
test("Ask Mend encrypts content and scopes threads to their owner",async()=>{
  const {db,dispose}=await freshDatabase();
  setRuntimeBindings({DB:db,AUTH_PEPPER:"test-pepper",DATA_ENCRYPTION_KEY:key,AI_CREDENTIALS_ENCRYPTION_KEY:key});
  try {
    const owners=[crypto.randomUUID(),crypto.randomUUID()];
    for(const [index,id] of owners.entries())await db.prepare("INSERT INTO users (id,username,username_normalized,password_hash,display_name) VALUES (?,?,?,?,?)")
      .bind(id,`ai${index}`,`ai${index}`,await hashPassword("agent-password-123"),`Agent ${index}`).run();
    const thread=await createAIThread(owners[0],"Question about work");
    await appendAIMessage(owners[0],thread,"user","Private customer detail");
    assert.equal((await getAIThread(owners[0],thread))?.messages[0].content,"Private customer detail");
    assert.equal(await getAIThread(owners[1],thread),null);
    assert.deepEqual(await listAIThreads(owners[1]),[]);
    await assert.rejects(()=>appendAIMessage(owners[1],thread,"assistant","Intrusion"),/THREAD_NOT_FOUND/);
    assert.equal(await deleteAIThread(owners[1],thread),false);
    const row=await db.prepare("SELECT content_encrypted FROM ai_messages WHERE thread_id=?").bind(thread).first<{content_encrypted:string}>();
    assert.ok(row?.content_encrypted.startsWith("v1."));
    assert.ok(!row?.content_encrypted.includes("Private customer detail"));
    assert.equal(await decryptAI(row!.content_encrypted,owners[0],`message:${thread}`),"Private customer detail");
    await assert.rejects(()=>decryptAI(row!.content_encrypted,owners[1],`message:${thread}`),/could not be opened/);
    assert.equal(await deleteAIThread(owners[0],thread),true);
    assert.equal(await getAIThread(owners[0],thread),null);
  } finally {setRuntimeBindings(undefined);await dispose();}
});

test("AI ciphertext is bound to its purpose",async()=>{
  const {db,dispose}=await freshDatabase();setRuntimeBindings({DB:db,AI_CREDENTIALS_ENCRYPTION_KEY:key});
  try {const cipher=await encryptAI("token","user-1","credentials");
    assert.equal(await decryptAI(cipher,"user-1","credentials"),"token");
    await assert.rejects(()=>decryptAI(cipher,"user-1","message"),/could not be opened/);
  } finally {setRuntimeBindings(undefined);await dispose();}
});
