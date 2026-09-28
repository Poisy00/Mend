import assert from "node:assert/strict";
import test from "node:test";
import { FOLLOW_UP_REASONS,FOLLOW_UP_WINDOWS,followUpRecipe,needsTechnicianWindow } from "../../lib/follow-ups/templates";

test("FollowBack recipes scope technician appointments and provide editable defaults",()=>{
  assert.ok(FOLLOW_UP_REASONS.includes("Service restoration"));
  assert.deepEqual(FOLLOW_UP_WINDOWS.map(item=>item.value),["8-11","9-12","11-2","2-5","3-6"]);
  for(const reason of ["Make sure technician arrived","Technician missed appointment window","Technician go-back request"])assert.equal(needsTechnicianWindow(reason),true);
  assert.equal(needsTechnicianWindow("Call disconnected"),false);
  assert.equal(followUpRecipe("Call disconnected").priority,"urgent");
  assert.equal(followUpRecipe("Check escalation/update").minutes,60);
  assert.match(followUpRecipe("Make sure technician arrived","2:00 PM").context,/2:00 PM/);
  assert.match(followUpRecipe("Technician go-back request","5:00 PM","Technician forgot tools").context,/forgot tools/);
});
