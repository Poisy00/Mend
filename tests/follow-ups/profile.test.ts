import assert from "node:assert/strict";
import test from "node:test";
import { freshDatabase } from "../helpers/mock-d1";
import { setRuntimeBindings } from "../../lib/server/runtime";
import { hashPassword } from "../../lib/server/crypto";
import { createFollowUp, editFollowUpProfile, followUpHistory } from "../../lib/server/follow-ups";

test("follow-up profile edits keep optional details private and create history",async()=>{
  const {db,dispose}=await freshDatabase();
  setRuntimeBindings({DB:db,AUTH_PEPPER:"test-pepper",DATA_ENCRYPTION_KEY:"nKPhcCMGUx0OEUoVfC50LPCPbNGy7kdNQTpDqtwPpXU"});
  try{
    const owner=crypto.randomUUID(),other=crypto.randomUUID();
    for(const id of [owner,other])await db.prepare("INSERT INTO users (id,username,username_normalized,password_hash,display_name) VALUES (?,?,?,?,?)").bind(id,id,id,await hashPassword("agent-password-123"),"Agent").run();
    const input={customerName:"",accountNumber:"123",phoneNumber:"555",caseNumber:"CASE-19",reason:"Customer requested callback",priority:"normal" as const,dueAt:"2099-01-01T00:00:00Z",sourceTimezone:"Africa/Cairo" as const,promise:"Call after visit",completionCondition:"Service stable",appointmentStartUtc:"2098-12-31T10:00:00Z",appointmentEndUtc:"2098-12-31T12:00:00Z"};
    const item=await createFollowUp(owner,input);
    assert.equal(item.caseNumber,"CASE-19");
    assert.equal(await editFollowUpProfile(other,item.id,{...input,promise:"Forged"},1),null);
    const edited=await editFollowUpProfile(owner,item.id,{...input,promise:"Check connectivity"},1);
    assert.equal(edited?.promise,"Check connectivity");
    assert.equal((await followUpHistory(owner,item.id))?.length,2);
    const raw=await db.prepare("SELECT case_number,promise FROM callbacks WHERE id=?").bind(item.id).first<{case_number:string;promise:string}>();
    assert.ok(!raw?.case_number.includes("CASE-19"));
    assert.ok(!raw?.promise.includes("Check connectivity"));
  }finally{setRuntimeBindings(undefined);await dispose();}
});
