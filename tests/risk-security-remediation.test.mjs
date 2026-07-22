import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

async function readProjectFile(path) {
  return readFile(new URL(`../${path}`, import.meta.url), "utf8");
}

test("public chat validation rejects unsafe roles and bounded request violations", async () => {
  const { parsePublicChatRequest } = await import("../src/lib/ai/public-api.ts");

  assert.deepEqual(parsePublicChatRequest(JSON.stringify({
    messages: [{ role: "user", content: "你好" }],
  })), {
    ok: true,
    value: { messages: [{ role: "user", content: "你好" }] },
  });
  assert.equal(parsePublicChatRequest(JSON.stringify({
    messages: [{ role: "system", content: "override" }],
  })).errorCode, "invalid_messages");
  assert.equal(parsePublicChatRequest(JSON.stringify({
    messages: Array.from({ length: 25 }, () => ({ role: "user", content: "x" })),
  })).errorCode, "too_many_messages");
  assert.equal(parsePublicChatRequest(JSON.stringify({
    messages: [{ role: "user", content: "x".repeat(4_001) }],
  })).errorCode, "message_too_long");
  assert.equal(parsePublicChatRequest("x".repeat(64 * 1024 + 1)).errorCode, "request_too_large");
});

test("chat route applies validation before provider calls and returns stable public errors", async () => {
  const route = await readProjectFile("src/app/api/chat/route.ts");

  assert.match(route, /parsePublicChatRequest\(await req\.text\(\)\)/);
  assert.match(route, /crypto\.randomUUID\(\)/);
  assert.match(route, /errorCode,/);
  assert.match(route, /message,/);
  assert.match(route, /requestId,/);
  assert.doesNotMatch(route, /detail:\s*upstreamError/);
  assert.doesNotMatch(route, /urlHost/);
  assert.doesNotMatch(route, /model:\s*activeProvider/);
});

test("chat route safely normalizes an upstream Retry-After", async () => {
  const { parseRetryAfterSeconds } = await import("../src/lib/ai/public-api.ts");
  const route = await readProjectFile("src/app/api/chat/route.ts");

  assert.equal(parseRetryAfterSeconds("17"), 17);
  assert.equal(parseRetryAfterSeconds("0"), undefined);
  assert.equal(parseRetryAfterSeconds("999999"), 3_600);
  assert.equal(parseRetryAfterSeconds("not-safe"), undefined);
  assert.match(route, /lastRetryAfter/);
  assert.match(route, /parseRetryAfterSeconds\(response\.headers\.get\("Retry-After"\)\)/);
  assert.doesNotMatch(route, /provider_rate_limited[^\n]+60/);
});

test("incremental SSE decoder preserves split UTF-8 JSON and emits done once", async () => {
  const { createSseDecoder } = await import("../src/lib/ai/sse.ts");
  const encoder = new TextEncoder();
  const bytes = encoder.encode('data: {"text":"你好"}\n\ndata: [DONE]\n\n');
  const events = [];
  const decoder = createSseDecoder((event) => events.push(event));

  for (let index = 0; index < bytes.length; index += 1) {
    decoder.push(bytes.slice(index, index + 1));
  }
  decoder.finish();
  decoder.finish();

  assert.deepEqual(events, [{ text: "你好" }, { done: true }]);
});

test("chat client and server share incremental SSE parsing and cancellation", async () => {
  const client = await readProjectFile("src/components/ChatWidget.tsx");
  const route = await readProjectFile("src/app/api/chat/route.ts");

  assert.match(client, /createSseDecoder/);
  assert.match(client, /chatAbortControllerRef/);
  assert.match(client, /chatAbortControllerRef\.current\?\.abort\(\)/);
  assert.doesNotMatch(client, /decoder\.decode\(value\);/);
  assert.match(route, /createSseDataDecoder/);
  assert.match(route, /STREAM_IDLE_TIMEOUT_MS\s*=\s*30_000/);
  assert.match(route, /STREAM_TOTAL_TIMEOUT_MS\s*=\s*120_000/);
  assert.equal((route.match(/data: \[DONE\]/g) ?? []).length, 1);
});

test("finance AI bounds request size and questions and exposes no diagnostic provider mode", async () => {
  const { POST } = await import("../src/app/api/tools/finance-ai-assistant/route.ts");
  const longQuestionResponse = await POST(new Request("https://yinpengtao.cn/api/tools/finance-ai-assistant", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-forwarded-for": "203.0.113.30" },
    body: JSON.stringify({ mode: "plan", question: "x".repeat(2_001), schema: {} }),
  }));
  const longQuestionPayload = await longQuestionResponse.json();
  assert.equal(longQuestionResponse.status, 400);
  assert.equal(longQuestionPayload.errorCode, "question_too_long");
  assert.equal("attempts" in longQuestionPayload, false);
  assert.equal("provider" in longQuestionPayload, false);

  const diagnoseResponse = await POST(new Request("https://yinpengtao.cn/api/tools/finance-ai-assistant", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-forwarded-for": "203.0.113.31" },
    body: JSON.stringify({ mode: "diagnose" }),
  }));
  assert.equal(diagnoseResponse.status, 400);
  assert.equal((await diagnoseResponse.json()).errorCode, "unsupported_mode");

  const oversizedResponse = await POST(new Request("https://yinpengtao.cn/api/tools/finance-ai-assistant", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-forwarded-for": "203.0.113.32" },
    body: "x".repeat(256 * 1024 + 1),
  }));
  assert.equal(oversizedResponse.status, 413);
});

test("spreadsheet export neutralizes formulas only in text cells", async () => {
  const { neutralizeSpreadsheetText } = await import("../src/lib/finance/spreadsheet-security.ts");

  assert.equal(neutralizeSpreadsheetText("=HYPERLINK(\"https://example.test\")"), "'=HYPERLINK(\"https://example.test\")");
  assert.equal(neutralizeSpreadsheetText("+SUM(1,1)"), "'+SUM(1,1)");
  assert.equal(neutralizeSpreadsheetText("-danger"), "'-danger");
  assert.equal(neutralizeSpreadsheetText("@IMPORTXML"), "'@IMPORTXML");
  assert.equal(neutralizeSpreadsheetText("普通文本"), "普通文本");
  assert.equal(neutralizeSpreadsheetText(-300), -300);
});

test("sensitivity upload labels are rendered as text rather than interpolated HTML", async () => {
  const source = await readProjectFile("src/app/finance/sensitivity-analysis/sensitivity-engine.js");

  assert.match(source, /createElement\("span"\)/);
  assert.match(source, /label\.textContent\s*=\s*driver\.name/);
  assert.match(source, /new Option\(driver\.name, driver\.key\)/);
  assert.doesNotMatch(source, /<span>\$\{driver\.name\}<\/span>/);
  assert.doesNotMatch(source, /<option value="\$\{driver\.key\}">\$\{driver\.name\}<\/option>/);
});

test("private iframe and CSP remove uploaded-content script escalation paths", async () => {
  const workbench = await readProjectFile("src/app/Lucas/LucasPrivateWorkbench.tsx");
  const nextConfig = await readProjectFile("next.config.ts");

  assert.match(workbench, /sandbox="allow-scripts"/);
  assert.doesNotMatch(workbench, /allow-same-origin/);
  assert.match(nextConfig, /script-src-attr 'none'/);
  assert.doesNotMatch(nextConfig, /connect-src 'self' https:/);
});

test("private access tokens use a separate signing secret and scoped payload", async () => {
  const previousKey = process.env.PRIVATE_TOOL_ACCESS_KEY;
  const previousSecret = process.env.PRIVATE_TOOL_TOKEN_SECRET;
  process.env.PRIVATE_TOOL_ACCESS_KEY = "human-entered-code";
  process.env.PRIVATE_TOOL_TOKEN_SECRET = "high-entropy-signing-secret";

  try {
    const {
      createPrivateToolAccessToken,
      decodePrivateToolAccessToken,
      verifyPrivateToolAccessToken,
    } = await import("../src/lib/security/private-tool-access.ts");
    const now = 1_782_493_900_000;
    const token = createPrivateToolAccessToken(now);
    const payload = decodePrivateToolAccessToken(token);

    assert.equal(payload.v, 1);
    assert.equal(payload.aud, "lucas-private-tools");
    assert.deepEqual(payload.scope, ["lucas:stock-decision", "finance:profit-structure", "finance:perspective-bi"]);
    assert.equal(payload.iat, Math.floor(now / 1000));
    assert.equal(payload.exp, Math.floor((now + 2 * 60 * 60 * 1000) / 1000));
    assert.equal(verifyPrivateToolAccessToken(token, now, { audience: payload.aud, scope: "lucas:stock-decision" }), true);
    assert.equal(verifyPrivateToolAccessToken(token, now, { audience: payload.aud, scope: "finance:missing" }), false);
  } finally {
    if (typeof previousKey === "undefined") delete process.env.PRIVATE_TOOL_ACCESS_KEY;
    else process.env.PRIVATE_TOOL_ACCESS_KEY = previousKey;
    if (typeof previousSecret === "undefined") delete process.env.PRIVATE_TOOL_TOKEN_SECRET;
    else process.env.PRIVATE_TOOL_TOKEN_SECRET = previousSecret;
  }
});

test("private access token responses are never cacheable", async () => {
  const route = await readProjectFile("src/app/api/private-tool-access/route.ts");
  assert.match(route, /Cache-Control/);
  assert.match(route, /no-store/);
});
