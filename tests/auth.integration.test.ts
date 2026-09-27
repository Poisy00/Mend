import assert from "node:assert/strict";
import test from "node:test";
import { freshDatabase } from "./helpers/mock-d1";
import { setRuntimeBindings } from "../lib/server/runtime";
import { encryptCustomerValue, decryptCustomerValue } from "../lib/server/crypto";
import { login, getSessionByToken, revokeCurrentSession } from "../lib/server/auth";
import { POST as loginRoute } from "../app/api/auth/login/route";

test("Mend sign-in issues a protected session and revocation ends it", async () => {
  const { db, dispose } = await freshDatabase();
  setRuntimeBindings({ DB: db, AUTH_PEPPER: "a-long-test-only-pepper", DATA_ENCRYPTION_KEY: "nKPhcCMGUx0OEUoVfC50LPCPbNGy7kdNQTpDqtwPpXU", BOOTSTRAP_ADMIN_USERNAME: "admin", BOOTSTRAP_ADMIN_PASSWORD: "initial-password-123" });
  try {
    const wrong = await login("admin", "wrong", new Request("https://mend.test/api/auth/login"));
    assert.equal(wrong, null);
    const request = new Request("https://mend.test/api/auth/login", { method: "POST", headers: { origin: "https://mend.test", "content-type": "application/json" }, body: JSON.stringify({ username: "admin", password: "initial-password-123" }) });
    const response = await loginRoute(request);
    assert.equal(response.status, 200);
    const cookie = response.headers.get("set-cookie") ?? "";
    assert.match(cookie, /Secure/); assert.match(cookie, /HttpOnly/); assert.match(cookie, /SameSite=Strict/);
    const token = cookie.match(/mend_session=([^;]+)/)?.[1];
    assert.ok(token);
    assert.equal((await getSessionByToken(token))?.username, "admin");
    await revokeCurrentSession(new Request("https://mend.test", { headers: { cookie: `mend_session=${token}` } }));
    assert.equal(await getSessionByToken(token), null);
    const ciphertext = await encryptCustomerValue("Confidential Customer");
    assert.ok(!ciphertext.includes("Confidential Customer"));
    assert.equal(await decryptCustomerValue(ciphertext), "Confidential Customer");
  } finally { setRuntimeBindings(undefined); await dispose(); }
});

test("cross-origin sign-in is rejected", async () => {
  const response = await loginRoute(new Request("https://mend.test/api/auth/login", { method: "POST", headers: { origin: "https://other.test", "content-type": "application/json" }, body: JSON.stringify({ username: "admin", password: "anything" }) }));
  assert.equal(response.status, 400);
});
