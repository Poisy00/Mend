import assert from "node:assert/strict";
import test from "node:test";
import { dueCaption, followUpDisplay } from "../../lib/follow-ups/display";
import { relativeTime } from "../../lib/display/relative";
import type { FollowUp } from "../../lib/follow-ups/types";

const now = new Date("2026-09-27T12:00:00Z").getTime();
const item: FollowUp = { id: "a", ownerUserId: "one", customerName: "", accountNumber: "", phoneNumber: "", caseNumber: "", reason: "Customer requested callback", priority: "normal", dueAt: "2026-09-27T12:30:00Z", sourceTimezone: "Africa/Cairo", status: "pending", attemptCount: 0, voicemailRequired: false, voicemailLeft: false, completedAt: null, revision: 1, notes: "", promise: "", completionCondition: "", appointmentStartUtc: null, appointmentEndUtc: null };
const plain = (text: string) => text.replace(/\s/g, " ");

test("status pill words are relative when close and never repeat the time caption", () => {
  assert.deepEqual(followUpDisplay(item, now), { tone: "due", label: "In 30 min", left: 0.25 });
  assert.equal(followUpDisplay({ ...item, dueAt: "2026-09-27T12:03:00Z" }, now).label, "Due now");
  assert.equal(followUpDisplay({ ...item, dueAt: "2026-09-27T11:13:00Z" }, now).label, "Overdue 47 min");
  assert.equal(followUpDisplay({ ...item, dueAt: "2026-09-27T10:00:00Z" }, now).label, "Overdue 2 h");
  assert.equal(followUpDisplay({ ...item, dueAt: "2026-09-24T12:00:00Z" }, now).label, "Overdue 3 d");
  assert.equal(followUpDisplay({ ...item, dueAt: "2026-09-27T15:00:00Z" }, now).label, "Today");
  assert.equal(followUpDisplay({ ...item, dueAt: "2026-09-29T15:00:00Z" }, now).label, "Scheduled");
});

test("time caption drops the date for today and the year for this year", () => {
  assert.equal(plain(dueCaption(item, now)), "3:30 PM");
  assert.equal(plain(dueCaption({ ...item, dueAt: "2026-09-28T09:00:00Z" }, now)), "Tomorrow 12:00 PM");
  assert.equal(plain(dueCaption({ ...item, dueAt: "2026-09-30T09:00:00Z" }, now)), "Wed 12:00 PM");
  assert.equal(plain(dueCaption({ ...item, dueAt: "2026-10-21T09:00:00Z" }, now)), "Oct 21, 12:00 PM");
  assert.equal(plain(dueCaption({ ...item, dueAt: "2027-01-05T09:00:00Z" }, now)), "Jan 5, 2027, 11:00 AM");
});

test("relative time accepts ISO and SQLite timestamps", () => {
  assert.equal(relativeTime("2026-09-27 11:58:00", now), "2 min ago");
  assert.equal(relativeTime("2026-09-27T09:00:00Z", now), "3 h ago");
  assert.equal(relativeTime("2026-09-24T12:00:00Z", now), "3 d ago");
});
