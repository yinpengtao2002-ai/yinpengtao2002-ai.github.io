import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

async function readProjectFile(path) {
  return readFile(new URL(`../${path}`, import.meta.url), "utf8");
}

async function importProviderHelper() {
  return import("../src/lib/ai/callProvider.ts");
}

function makeProvider(overrides = {}) {
  return {
    model: "test-model",
    apiUrl: "https://example.test/v1/chat/completions",
    apiKey: "test-key",
    timeoutMs: 1000,
    ...overrides,
  };
}

test("shared AI provider helper parses JSON from fenced or narrated responses", async () => {
  const { extractJsonObject } = await importProviderHelper();

  assert.deepEqual(extractJsonObject("```json\n{\"ok\":true}\n```"), { ok: true });
  assert.deepEqual(extractJsonObject("前置说明 {\"answer\":\"可以\"} 后置说明"), { answer: "可以" });
  assert.throws(() => extractJsonObject("没有 JSON"), /AI response did not contain JSON/);
});

test("shared AI provider helper skips unconfigured providers and calls the first usable model", async () => {
  const { callFirstConfiguredProvider } = await importProviderHelper();
  const originalFetch = global.fetch;
  const calls = [];

  global.fetch = async (_url, init) => {
    calls.push(JSON.parse(String(init?.body ?? "{}")));
    return new Response(JSON.stringify({
      choices: [{ message: { content: "```json\n{\"cards\":[]}\n```" } }],
    }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  };

  try {
    const result = await callFirstConfiguredProvider(
      [
        makeProvider({ model: "missing-key", apiKey: "" }),
        makeProvider({ model: "usable-model" }),
      ],
      [{ role: "user", content: "生成单词卡" }],
      { jsonMode: true, maxTokens: 1234 },
    );

    assert.equal(result.ok, true);
    assert.equal(result.provider, "usable-model");
    assert.equal(result.content, "```json\n{\"cards\":[]}\n```");
    assert.equal(calls.length, 1);
    assert.equal(calls[0].model, "usable-model");
    assert.equal(calls[0].max_tokens, 1234);
    assert.deepEqual(calls[0].response_format, { type: "json_object" });
  } finally {
    global.fetch = originalFetch;
  }
});

test("shared AI provider helper reports empty provider content with finish reason", async () => {
  const { callFirstConfiguredProvider } = await importProviderHelper();
  const originalFetch = global.fetch;

  global.fetch = async () => new Response(JSON.stringify({
    choices: [{ finish_reason: "length", message: { content: "" } }],
  }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });

  try {
    const result = await callFirstConfiguredProvider(
      [makeProvider()],
      [{ role: "user", content: "分析销量" }],
      { jsonMode: false },
    );

    assert.equal(result.ok, false);
    assert.equal(result.status, 502);
    assert.equal(result.errorCode, "provider_empty_response");
    assert.equal(result.attempts[0].errorCode, "provider_empty_response");
    assert.equal(result.attempts[0].finishReason, "length");
  } finally {
    global.fetch = originalFetch;
  }
});

test("compatible JSON chat routes use the shared provider helper", async () => {
  const helper = await readProjectFile("src/lib/ai/callProvider.ts");
  const financeAIRoute = await readProjectFile("src/app/api/tools/finance-ai-assistant/route.ts");
  const studyCardsRoute = await readProjectFile("src/app/api/tools/study-cards/route.ts");
  const chatRoute = await readProjectFile("src/app/api/chat/route.ts");
  const pronunciationRoute = await readProjectFile("src/app/api/tools/study-cards/pronunciation/route.ts");

  assert.match(helper, /export async function callFirstConfiguredProvider/);
  assert.match(helper, /export function hasConfiguredProvider/);
  assert.match(helper, /export function extractJsonObject/);

  for (const route of [financeAIRoute, studyCardsRoute]) {
    assert.match(route, /callProvider\.ts|@\/lib\/ai\/callProvider/);
    assert.doesNotMatch(route, /async function callProvider\(/);
    assert.doesNotMatch(route, /function extractJsonObject\(/);
    assert.doesNotMatch(route, /function hasConfiguredProvider\(/);
  }

  assert.match(chatRoute, /stream:\s*true/);
  assert.doesNotMatch(chatRoute, /callProvider\.ts|@\/lib\/ai\/callProvider/);
  assert.match(pronunciationRoute, /response_format:\s*"mp3"/);
  assert.doesNotMatch(pronunciationRoute, /callProvider\.ts|@\/lib\/ai\/callProvider/);
});
