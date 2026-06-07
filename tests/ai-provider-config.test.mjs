import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

async function readProjectFile(path) {
  return readFile(new URL(`../${path}`, import.meta.url), "utf8");
}

async function readProjectFileIfExists(path) {
  try {
    return await readProjectFile(path);
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "ENOENT") {
      return "";
    }

    throw error;
  }
}

test("AI endpoints share GPT primary and DeepSeek fallback provider config", async () => {
  const sharedConfig = await readProjectFileIfExists("src/lib/ai/providers.ts");
  const siteChatRoute = await readProjectFile("src/app/api/chat/route.ts");
  const financeAIRoute = await readProjectFile("src/app/api/tools/finance-ai-assistant/route.ts");
  const studyCardsRoute = await readProjectFile("src/app/api/tools/study-cards/route.ts");
  const envExample = await readProjectFile(".env.example");

  assert.match(sharedConfig, /AI_PRIMARY_API_KEY/);
  assert.match(sharedConfig, /AI_PRIMARY_API_URL/);
  assert.match(sharedConfig, /AI_PRIMARY_MODEL/);
  assert.match(sharedConfig, /gpt-5\.5/);
  assert.match(sharedConfig, /https:\/\/api\.dstopology\.com/);
  assert.match(sharedConfig, /deepseek-v4-pro/);
  assert.match(sharedConfig, /getChatProviders/);

  for (const route of [siteChatRoute, financeAIRoute, studyCardsRoute]) {
    assert.match(route, /getChatProviders/);
    assert.doesNotMatch(route, /function getChatProviders/);
    assert.doesNotMatch(route, /const DEEPSEEK_API_URL/);
  }

  assert.match(envExample, /AI_PRIMARY_API_KEY=/);
  assert.match(envExample, /AI_PRIMARY_API_URL=https:\/\/api\.dstopology\.com/);
  assert.match(envExample, /AI_PRIMARY_MODEL=gpt-5\.5/);
  assert.match(envExample, /DEEPSEEK_API_KEY=/);
  assert.match(envExample, /DEEPSEEK_API_URL=https:\/\/api\.deepseek\.com\/chat\/completions/);
});

test("AI provider config orders GPT primary before DeepSeek fallback", async () => {
  const originalEnv = {
    AI_PRIMARY_API_KEY: process.env.AI_PRIMARY_API_KEY,
    AI_PRIMARY_API_URL: process.env.AI_PRIMARY_API_URL,
    AI_PRIMARY_MODEL: process.env.AI_PRIMARY_MODEL,
    DEEPSEEK_API_KEY: process.env.DEEPSEEK_API_KEY,
    DEEPSEEK_API_URL: process.env.DEEPSEEK_API_URL,
  };

  process.env.AI_PRIMARY_API_KEY = "test-primary-key";
  process.env.AI_PRIMARY_API_URL = "https://api.dstopology.com";
  process.env.AI_PRIMARY_MODEL = "";
  process.env.DEEPSEEK_API_KEY = "test-deepseek-key";
  process.env.DEEPSEEK_API_URL = "";

  try {
    const { getChatProviders } = await import("../src/lib/ai/providers.ts");
    const providers = getChatProviders(18000);

    assert.equal(providers.length, 2);
    assert.equal(providers[0].model, "gpt-5.5");
    assert.equal(providers[0].apiUrl, "https://api.dstopology.com/v1/chat/completions");
    assert.equal(providers[0].apiKey, "test-primary-key");
    assert.equal(providers[1].model, "deepseek-v4-pro");
    assert.equal(providers[1].apiUrl, "https://api.deepseek.com/chat/completions");
    assert.equal(providers[1].apiKey, "test-deepseek-key");
  } finally {
    Object.entries(originalEnv).forEach(([key, value]) => {
      if (typeof value === "undefined") {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    });
  }
});

test("AI provider config can use the primary NewAPI key for DeepSeek fallback", async () => {
  const originalEnv = {
    AI_PRIMARY_API_KEY: process.env.AI_PRIMARY_API_KEY,
    AI_PRIMARY_API_URL: process.env.AI_PRIMARY_API_URL,
    AI_PRIMARY_MODEL: process.env.AI_PRIMARY_MODEL,
    DEEPSEEK_API_KEY: process.env.DEEPSEEK_API_KEY,
    DEEPSEEK_API_URL: process.env.DEEPSEEK_API_URL,
  };

  process.env.AI_PRIMARY_API_KEY = "test-newapi-key";
  process.env.AI_PRIMARY_API_URL = "https://api.dstopology.com";
  process.env.AI_PRIMARY_MODEL = "";
  delete process.env.DEEPSEEK_API_KEY;
  process.env.DEEPSEEK_API_URL = "https://api.deepseek.com/chat/completions";

  try {
    const { getChatProviders } = await import("../src/lib/ai/providers.ts");
    const providers = getChatProviders(18000);

    assert.equal(providers[0].model, "gpt-5.5");
    assert.equal(providers[0].apiKey, "test-newapi-key");
    assert.equal(providers[0].apiUrl, "https://api.dstopology.com/v1/chat/completions");
    assert.equal(providers[1].model, "deepseek-v4-pro");
    assert.equal(providers[1].apiKey, "test-newapi-key");
    assert.equal(providers[1].apiUrl, "https://api.dstopology.com/v1/chat/completions");
  } finally {
    Object.entries(originalEnv).forEach(([key, value]) => {
      if (typeof value === "undefined") {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    });
  }
});
