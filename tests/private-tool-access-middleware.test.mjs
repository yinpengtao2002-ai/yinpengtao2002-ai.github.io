import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createPrivateToolAccessToken } from "../src/lib/security/private-tool-access.ts";
import {
  readPrivateToolAccessTokenFromHeaders,
  verifyPrivateToolAccessTokenForMiddleware,
} from "../src/lib/security/private-tool-access-edge.ts";

process.env.PRIVATE_TOOL_ACCESS_KEY = "edge-compatible-private-tool-key";
process.env.PRIVATE_TOOL_TOKEN_SECRET = "edge-compatible-private-tool-signing-secret";

test("middleware private tool verifier accepts tokens from the server signer", async () => {
  const now = 1_782_493_900_000;
  const token = createPrivateToolAccessToken(now);

  assert.equal(await verifyPrivateToolAccessTokenForMiddleware(token, now + 1_000), true);
});

test("middleware private tool verifier rejects expired or malformed tokens", async () => {
  const now = 1_782_493_900_000;
  const expiredToken = createPrivateToolAccessToken(now - 2 * 60 * 60 * 1000 - 1);

  assert.equal(await verifyPrivateToolAccessTokenForMiddleware(expiredToken, now), false);
  assert.equal(await verifyPrivateToolAccessTokenForMiddleware("not-a-token", now), false);
  assert.equal(await verifyPrivateToolAccessTokenForMiddleware(null, now), false);
});

test("middleware accepts only the private tool access header", () => {
  const headers = new Headers({
    "X-Private-Tool-Access": "new-token",
    "X-Finance-AI-Access": "legacy-token",
  });

  assert.equal(readPrivateToolAccessTokenFromHeaders(headers), "new-token");
  assert.equal(readPrivateToolAccessTokenFromHeaders(new Headers({
    "X-Finance-AI-Access": "legacy-token",
  })), null);
});

test("middleware protects the private stock decision API", async () => {
  const middleware = await readFile(new URL("../middleware.ts", import.meta.url), "utf8");
  const route = await readFile(new URL("../src/app/api/lucas/stock-decision/route.ts", import.meta.url), "utf8");

  assert.match(middleware, /matcher:\s*\[\s*"\/api\/lucas\/stock-decision\/:path\*"\s*\]/);
  assert.match(middleware, /readPrivateToolAccessTokenFromHeaders/);
  assert.match(middleware, /verifyPrivateToolAccessTokenForMiddleware/);
  assert.match(middleware, /access_denied/);
  assert.doesNotMatch(route, /readPrivateToolAccessToken/);
  assert.doesNotMatch(route, /verifyPrivateToolAccessToken/);
});
