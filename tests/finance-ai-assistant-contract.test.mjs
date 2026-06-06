import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

async function readProjectFile(path) {
  return readFile(new URL(`../${path}`, import.meta.url), "utf8");
}

test("finance AI assistant API exposes planning and explanation responsibilities", async () => {
  const route = await readProjectFile("src/app/api/tools/finance-ai-assistant/route.ts");
  const context = await readProjectFile("src/lib/finance-ai/context.ts");
  const packageJson = await readProjectFile("package.json");

  assert.match(route, /\/api\/tools\/finance-ai-assistant/);
  assert.match(route, /mode/);
  assert.match(route, /plan/);
  assert.match(route, /explain/);
  assert.match(route, /DEEPSEEK_API_KEY/);
  assert.match(route, /DEEPSEEK_API_URL/);
  assert.match(route, /CHAT_API_KEY/);
  assert.match(route, /CHAT_API_URL/);
  assert.match(route, /CHAT_MODEL/);
  assert.match(route, /CHAT_MODEL_FALLBACK/);
  assert.match(route, /deepseek-v4-pro/);
  assert.match(route, /gpt-5\.2/);
  assert.match(route, /gpt-5\.4/);
  assert.match(route, /response_format/);
  assert.match(route, /modules/);
  assert.match(route, /errorCode/);
  assert.match(route, /503/);
  assert.match(route, /400/);
  assert.match(route, /AI 不负责计算数字/);
  assert.doesNotMatch(route, /完整底稿/);

  assert.match(context, /buildFinanceAIPlanningContext/);
  assert.match(context, /buildFinanceAIExplanationPrompt/);
  assert.match(context, /AI 不负责计算数字/);
  assert.match(context, /图表模块会渲染在聊天消息内部/);
  assert.match(context, /最多生成 3 个模块/);
  assert.match(context, /月份列/);
  assert.match(context, /销量列/);
  assert.match(context, /维度字段/);
  assert.match(context, /总额指标/);
  assert.match(context, /单车指标/);
  assert.match(context, /可用期间/);
  assert.match(context, /最近问题/);
  assert.match(context, /metric_snapshot/);
  assert.match(context, /trend_chart/);
  assert.match(context, /bar_rank/);
  assert.match(context, /waterfall_bridge/);
  assert.doesNotMatch(context, /完整底稿/);

  assert.match(packageJson, /tests\/finance-ai-assistant-contract\.test\.mjs/);
});
