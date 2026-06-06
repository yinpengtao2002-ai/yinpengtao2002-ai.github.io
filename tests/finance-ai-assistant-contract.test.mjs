import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  buildFinanceAIExplanationPrompt,
  buildFinanceAIPlanningContext,
} from "../src/lib/finance-ai/context.ts";
import { POST } from "../src/app/api/tools/finance-ai-assistant/route.ts";

async function readProjectFile(path) {
  return readFile(new URL(`../${path}`, import.meta.url), "utf8");
}

function makeSchema() {
  return {
    headers: ["月份", "国家", "销量", "边际"],
    monthColumn: "月份",
    salesColumn: "销量",
    dimensionColumns: ["国家"],
    totalMetrics: [{ kind: "total", name: "边际", column: "边际" }],
    unitMetrics: [{ kind: "unit", name: "单车边际", numeratorColumn: "边际", denominatorColumn: "销量" }],
    excludedMetricColumns: [],
    requiredIssues: [],
    profile: {
      rowCount: 3,
      periods: [
        { key: "2026-02", label: "2026年2月", sort: 24314 },
        { key: "2026-03", label: "2026年3月", sort: 24315 },
      ],
      dimensionValueCounts: { "国家": 2 },
    },
  };
}

function makeRequest(body) {
  return new Request("https://yinpengtao.cn/api/tools/finance-ai-assistant", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

async function withMockedProvider(handler, content) {
  const originalFetch = global.fetch;
  const originalEnv = {
    DEEPSEEK_API_KEY: process.env.DEEPSEEK_API_KEY,
    CHAT_API_KEY: process.env.CHAT_API_KEY,
    CHAT_API_URL: process.env.CHAT_API_URL,
  };
  const calls = [];

  process.env.DEEPSEEK_API_KEY = "";
  process.env.CHAT_API_KEY = "test-key";
  process.env.CHAT_API_URL = "https://example.test/v1/chat/completions";
  global.fetch = async (_url, init) => {
    calls.push(JSON.parse(String(init?.body ?? "{}")));
    return new Response(JSON.stringify({
      choices: [{ message: { content: typeof content === "function" ? content(calls) : content } }],
    }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  };

  try {
    return await handler(calls);
  } finally {
    global.fetch = originalFetch;
    process.env.DEEPSEEK_API_KEY = originalEnv.DEEPSEEK_API_KEY;
    process.env.CHAT_API_KEY = originalEnv.CHAT_API_KEY;
    process.env.CHAT_API_URL = originalEnv.CHAT_API_URL;
  }
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

test("finance AI context bounds filters and computed summaries before provider calls", () => {
  const schema = {
    headers: ["月份", "国家", "销量", "边际"],
    monthColumn: "月份",
    salesColumn: "销量",
    dimensionColumns: Array.from({ length: 40 }, (_, index) => `维度${index}`),
    totalMetrics: Array.from({ length: 40 }, (_, index) => ({ kind: "total", name: `总额指标${index}`, column: `总额指标${index}` })),
    unitMetrics: Array.from({ length: 40 }, (_, index) => ({ kind: "unit", name: `单车指标${index}`, numeratorColumn: `总额指标${index}`, denominatorColumn: "销量" })),
    excludedMetricColumns: [],
    requiredIssues: [],
    profile: {
      rowCount: 50000,
      periods: Array.from({ length: 48 }, (_, index) => ({
        key: `2026-${String((index % 12) + 1).padStart(2, "0")}`,
        label: `2026年${(index % 12) + 1}月`,
        sort: 2026 * 12 + index + 1,
      })),
      dimensionValueCounts: {},
    },
  };
  const planningPrompt = buildFinanceAIPlanningContext(schema, {
    recentQuestions: Array.from({ length: 20 }, (_, index) => `最近问题${index}`),
    currentFilters: Object.fromEntries(
      Array.from({ length: 40 }, (_, fieldIndex) => [
        `维度${fieldIndex}`,
        Array.from({ length: 40 }, (_, valueIndex) => `筛选值${fieldIndex}-${valueIndex}`),
      ]),
    ),
    chartHistory: Array.from({ length: 20 }, (_, index) => ({ type: "trend_chart", title: `图表${index}` })),
  });
  const explanationPrompt = buildFinanceAIExplanationPrompt({
    userQuestion: "今年 3 月巴西单车边际是多少？",
    computedSummary: {
      modules: [{ metric: "单车边际", value: 35 }],
      rawRows: Array.from({ length: 80 }, (_, index) => ({ country: `raw-secret-${index}`, amount: index })),
    },
  });

  assert.equal(planningPrompt.length < 12000, true);
  assert.match(planningPrompt, /当前筛选/);
  assert.match(planningPrompt, /另有/);
  assert.doesNotMatch(planningPrompt, /筛选值39-39/);
  assert.equal(explanationPrompt.length < 8000, true);
  assert.match(explanationPrompt, /已省略完整明细数组/);
  assert.doesNotMatch(explanationPrompt, /raw-secret-79/);
});

test("finance AI assistant API validates provider action plans before returning them", async () => {
  await withMockedProvider(async () => {
    const response = await POST(makeRequest({
      mode: "plan",
      question: "巴西 3 月边际怎么看？",
      schema: makeSchema(),
    }));
    const payload = await response.json();

    assert.equal(response.status, 502);
    assert.equal(payload.errorCode, "provider_invalid_plan");
    assert.match(payload.errors.join("\n"), /指标不存在/);
  }, JSON.stringify({
    modules: [{ type: "bar_rank", metric: "不存在指标", dimension: "国家", period: "2026-03" }],
  }));
});

test("finance AI assistant API strips raw-row-like summaries before explain provider calls", async () => {
  await withMockedProvider(async (calls) => {
    const response = await POST(makeRequest({
      mode: "explain",
      question: "今年 3 月巴西单车边际是多少？",
      computedSummary: {
        modules: [{ metric: "单车边际", value: 35 }],
        rawRows: Array.from({ length: 80 }, (_, index) => ({ country: `raw-secret-${index}`, amount: index })),
      },
    }));
    const payload = await response.json();
    const providerBody = JSON.stringify(calls[0]);

    assert.equal(response.status, 200);
    assert.equal(payload.message, "解释完成");
    assert.match(providerBody, /已省略完整明细数组/);
    assert.doesNotMatch(providerBody, /raw-secret-79/);
    assert.doesNotMatch(providerBody, /raw-secret-0/);
  }, "解释完成");
});

test("finance AI assistant API rejects malformed schemas before planning context build", async () => {
  const response = await POST(makeRequest({
    mode: "plan",
    question: "巴西 3 月边际怎么看？",
    schema: {},
  }));
  const payload = await response.json();

  assert.equal(response.status, 400);
  assert.equal(payload.errorCode, "invalid_schema");
});
