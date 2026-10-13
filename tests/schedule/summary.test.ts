import assert from "node:assert/strict";
import test from "node:test";
import { emptyWeek, shiftSummary } from "../../lib/schedule/rules";

const week = emptyWeek();
week[0] = { off: false, start: "09:00", end: "17:00", breaks: [{ start: "14:50", end: "15:05" }], lunch: null };
const plain = (text: string) => text.replace(/\s/g, " ");

test("shift summary reports on shift, on a break, and the next shift", () => {
  const on = shiftSummary(week, [], new Date("2026-09-27T10:00:00Z"));
  assert.equal(on.state, "on");
  assert.equal(plain(on.detail), "Until 5:00 PM · 4h 0m left");
  const pause = shiftSummary(week, [], new Date("2026-09-27T12:00:00Z"));
  assert.equal(pause.state, "break");
  assert.equal(plain(pause.line), "On a break · back 3:05 PM");
  const off = shiftSummary(week, [], new Date("2026-09-27T15:00:00Z"));
  assert.equal(off.state, "off");
  assert.equal(plain(off.line), "Off shift · next Sun 9:00 AM");
  assert.equal(plain(shiftSummary(week, [], new Date("2026-09-27T01:00:00Z")).detail), "Next shift today 9:00 AM");
  assert.equal(shiftSummary(emptyWeek(), [], new Date("2026-09-27T01:00:00Z")).detail, "No upcoming shifts");
});
