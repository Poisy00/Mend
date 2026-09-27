import assert from "node:assert/strict";
import test from "node:test";

const baseUrl = process.env.MEND_BASE_URL ?? "http://localhost:5173";

test("Mend opens a useful empty desk instead of a starter or sample queue", async () => {
  const response = await fetch(baseUrl);
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /<title>Mend<\/title>/);
  assert.match(html, /Follow-ups/);
  assert.match(html, /RCC Dispatch/);
  assert.match(html, /New follow-up/);
  assert.doesNotMatch(html, /Starter Project|Sample customer|Lorem ipsum/);
});

