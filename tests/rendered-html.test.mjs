import assert from "node:assert/strict";
import test from "node:test";

const baseUrl = process.env.MEND_BASE_URL ?? "http://localhost:5173";

test("Mend presents its sign-in page and guards the workbench", async () => {
  const response = await fetch(baseUrl);
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /<title>Mend<\/title>/);
  assert.match(html, /Sign in|sign in/);
  assert.doesNotMatch(html, /Starter Project|Sample customer|Lorem ipsum/);
  const api = await fetch(`${baseUrl}/api/follow-ups`);
  assert.equal(api.status, 401);
});

