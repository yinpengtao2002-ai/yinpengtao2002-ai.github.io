import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  buildFinanceAIExplanationPrompt,
  buildFinanceAIPlanningContext,
} from "../src/lib/finance-ai/context.ts";
import { POST } from "../src/app/api/tools/finance-ai-assistant/route.ts";
import { POST as POSTAccess } from "../src/app/api/tools/finance-ai-assistant/access/route.ts";
import { createFinanceAIAccessToken } from "../src/lib/finance-ai/access.ts";

process.env.FINANCE_AI_ACCESS_KEY = "test-finance-ai-access-key";

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

function makeRequest(body, token = createFinanceAIAccessToken()) {
  return new Request("https://yinpengtao.cn/api/tools/finance-ai-assistant", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { "X-Finance-AI-Access": token } : {}),
    },
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
  assert.match(explanationPrompt, /聚合结果足够回答/);
  assert.match(explanationPrompt, /排名、占比、变化贡献/);
  assert.match(explanationPrompt, /不要说看不到明细/);
  assert.doesNotMatch(explanationPrompt, /已省略完整明细数组/);
  assert.doesNotMatch(explanationPrompt, /未展开/);
  assert.doesNotMatch(explanationPrompt, /截断/);
  assert.doesNotMatch(explanationPrompt, /raw-secret-79/);
});

test("finance AI explanation prompt keeps ranked contribution details visible", () => {
  const explanationPrompt = buildFinanceAIExplanationPrompt({
    userQuestion: "4 月和 3 月环比情况，哪些国家占主要比例？",
    computedSummary: {
      modules: [
        {
          type: "bar_rank",
          metric: "Sales Volume",
          dimension: "Dim_A",
          period: "M04",
          comparison: "mom",
          items: [
            {
              label: "巴西",
              value: 143047,
              valueShare: 0.62,
              changeValue: 22547,
              changeShare: 0.48,
              rowCount: 38,
            },
            {
              label: "墨西哥",
              value: 65000,
              valueShare: 0.28,
              changeValue: 12000,
              changeShare: 0.26,
              rowCount: 19,
            },
          ],
        },
      ],
    },
  });

  assert.match(explanationPrompt, /巴西/);
  assert.match(explanationPrompt, /143047/);
  assert.match(explanationPrompt, /0\.62/);
  assert.match(explanationPrompt, /22547/);
  assert.match(explanationPrompt, /0\.48/);
  assert.match(explanationPrompt, /墨西哥/);
  assert.doesNotMatch(explanationPrompt, /未展开/);
  assert.doesNotMatch(explanationPrompt, /截断/);
  assert.doesNotMatch(explanationPrompt, /__truncated/);
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

test("finance AI assistant requires an internal access token", async () => {
  const lockedResponse = await POST(makeRequest({
    mode: "plan",
    question: "巴西 3 月边际怎么看？",
    schema: makeSchema(),
  }, ""));
  const lockedPayload = await lockedResponse.json();

  assert.equal(lockedResponse.status, 401);
  assert.equal(lockedPayload.errorCode, "access_denied");

  const accessResponse = await POSTAccess(makeRequest({
    key: "test-finance-ai-access-key",
  }));
  const accessPayload = await accessResponse.json();

  assert.equal(accessResponse.status, 200);
  assert.equal(typeof accessPayload.token, "string");
  assert.equal(accessPayload.token.length > 20, true);
  assert.equal(typeof accessPayload.expiresAt, "string");

  const rejectedResponse = await POSTAccess(makeRequest({
    key: "wrong-key",
  }));
  const rejectedPayload = await rejectedResponse.json();

  assert.equal(rejectedResponse.status, 401);
  assert.equal(rejectedPayload.errorCode, "access_denied");
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
    assert.match(providerBody, /聚合结果足够回答/);
    assert.match(providerBody, /排名、占比、变化贡献/);
    assert.match(providerBody, /不要说看不到明细/);
    assert.doesNotMatch(providerBody, /已省略完整明细数组/);
    assert.doesNotMatch(providerBody, /未展开/);
    assert.doesNotMatch(providerBody, /截断/);
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

test("finance AI assistant API rejects malformed nested schema and state without crashing", async () => {
  const malformedSchema = {
    ...makeSchema(),
    totalMetrics: [null],
    profile: {
      ...makeSchema().profile,
      periods: [null],
    },
  };
  const response = await POST(makeRequest({
    mode: "plan",
    question: "巴西 3 月边际怎么看？",
    schema: malformedSchema,
    state: {
      recentQuestions: [1],
      chartHistory: [null],
    },
  }));
  const payload = await response.json();

  assert.equal(response.status, 400);
  assert.equal(payload.errorCode, "invalid_schema");
});

test("finance AI assistant page is an independent chat workbench", async () => {
  const page = await readProjectFile("src/app/finance/finance-ai-assistant/page.tsx");
  const client = await readProjectFile("src/app/tools/finance-ai-assistant/FinanceAIAssistantTool.tsx");

  assert.match(page, /财务分析 AI 助手/);
  assert.match(page, /FinanceAIAssistantTool/);
  assert.match(client, /\/api\/tools\/finance-ai-assistant/);
  assert.match(client, /type ChatMessage/);
  assert.match(client, /chartCards/);
  assert.match(client, /PlotlyChart/);
  assert.match(client, /FinanceAIMessageContent/);
  assert.match(client, /ReactMarkdown/);
  assert.match(client, /remarkMath/);
  assert.match(client, /rehypeKatex/);
  assert.match(client, /normalizeChatMathMarkdown/);
  assert.match(client, /normalizeMarkdownStrongEmphasis/);
  assert.match(client, /数据仅保留在当前页面会话中，刷新后清空/);
  assert.match(client, /已识别/);
  assert.match(client, /inferFinanceSchema/);
  assert.match(client, /buildMetricSnapshot/);
  assert.match(client, /buildTrendSeries/);
  assert.match(client, /buildBarRank/);
  assert.match(client, /buildWaterfallBridge/);
  assert.match(client, /validateFinanceActionPlan/);
  assert.match(client, /buildChartSpec/);
  assert.match(client, /useEffect/);
  assert.match(client, /newDatasetMessages/);
  assert.doesNotMatch(client, /localStorage/);
  assert.doesNotMatch(client, /sessionStorage/);
  assert.doesNotMatch(client, /IndexedDB/);
});

test("finance AI assistant chat styles size embedded chart cards", async () => {
  const styles = await readProjectFile("src/app/globals.css");

  assert.match(styles, /\.finance-ai-page/);
  assert.match(styles, /\.finance-ai-chat/);
  assert.match(styles, /\.finance-ai-message\.is-assistant/);
  assert.match(styles, /\.finance-ai-chart-card/);
  assert.match(styles, /\.finance-ai-chart-host\s*\{[\s\S]*min-height:\s*320px/s);
  assert.match(styles, /\.finance-ai-markdown/);
  assert.match(styles, /\.finance-ai-markdown\s+\.katex-display/);
});

test("finance AI assistant is styled and isolated from global assistant", async () => {
  const styles = await readProjectFile("src/app/globals.css");
  const shell = await readProjectFile("src/components/ClientShell.tsx");
  const sitemap = await readProjectFile("src/app/sitemap.ts");
  const content = await readProjectFile("src/lib/data/thinkingLabContent.ts");

  assert.match(styles, /\.finance-ai-page/);
  assert.match(styles, /\.finance-ai-chat/);
  assert.match(styles, /\.finance-ai-message\.is-assistant/);
  assert.match(styles, /\.finance-ai-chart-card/);
  assert.match(styles, /\.finance-ai-chart-host/);
  assert.match(styles, /@media \(max-width: 760px\)/);
  assert.match(shell, /\/finance\/finance-ai-assistant/);
  assert.match(shell.match(/function shouldHideAssistant[\s\S]*?\n}/)?.[0] ?? "", /finance-ai-assistant/);
  assert.match(sitemap, /\$\{BASE_URL\}\/finance\/finance-ai-assistant/);
  assert.doesNotMatch(sitemap, /\$\{BASE_URL\}\/tools\/finance-ai-assistant/);
  assert.doesNotMatch(content, /finance-ai-assistant/);
});

test("finance AI assistant page follows the site chat assistant interaction style", async () => {
  const client = await readProjectFile("src/app/tools/finance-ai-assistant/FinanceAIAssistantTool.tsx");
  const styles = await readProjectFile("src/app/globals.css");

  assert.match(client, /finance-ai-avatar/);
  assert.match(client, /finance-ai-access-gate/);
  assert.match(client, /finance-ai-upload-chip/);
  assert.match(client, /downloadSampleTemplate/);
  assert.match(client, /finance-ai-empty-state/);
  assert.match(client, /X-Finance-AI-Access/);
  assert.doesNotMatch(client, /next\/image/);
  assert.match(client, /finance-ai-assistant-preview\.(png|webp)/);
  assert.match(client, /charts:\s*chartCards\.map/);
  assert.doesNotMatch(client, /<p>\{message\.text\}<\/p>/);
  assert.match(styles, /\.finance-ai-page\s*\{[\s\S]*background:\s*#f7f5ef/s);
  assert.match(styles, /\.finance-ai-access-gate/);
  assert.match(styles, /\.finance-ai-assistant-panel/);
  assert.match(styles, /\.finance-ai-avatar-mini/);
  assert.match(styles, /\.finance-ai-thinking/);
  assert.match(styles, /\.finance-ai-message\.is-user\s+\.finance-ai-message-bubble/);
  assert.match(styles, /\.finance-ai-composer\s*\{[\s\S]*border-radius:\s*26px/s);
});
