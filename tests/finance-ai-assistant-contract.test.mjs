import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  buildFinanceAIDirectAnalyzePrompt,
  buildFinanceAIDataRequestPrompt,
  buildFinanceAISelectedRowsAnalyzePrompt,
  buildFinanceAIExplanationPrompt,
  buildFinanceAIPlanningContext,
} from "../src/lib/finance-ai/context.ts";
import { applyFinanceAIDataRequest } from "../src/lib/finance-ai/data-selection.ts";
import { buildDirectChartSpec } from "../src/lib/finance/charts/index.ts";
import { filterTableValueBySearchText } from "../src/components/finance/financeAIDetailTableFilters.ts";
import { POST } from "../src/app/api/tools/finance-ai-assistant/route.ts";
import { POST as POSTAccess } from "../src/app/api/tools/finance-ai-assistant/access/route.ts";

process.env.FINANCE_AI_ACCESS_KEY = "test-finance-ai-access-key";

async function readProjectFile(path) {
  return readFile(new URL(`../${path}`, import.meta.url), "utf8");
}

function makeSchema(overrides = {}) {
  const base = {
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

  return {
    ...base,
    ...overrides,
    profile: {
      ...base.profile,
      ...(overrides.profile ?? {}),
    },
  };
}

function makeRequest(body) {
  return new Request("https://yinpengtao.cn/api/tools/finance-ai-assistant", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
}

async function withMockedProvider(handler, content) {
  const originalFetch = global.fetch;
  const originalEnv = {
    AI_PRIMARY_API_KEY: process.env.AI_PRIMARY_API_KEY,
    AI_PRIMARY_API_URL: process.env.AI_PRIMARY_API_URL,
    AI_PRIMARY_MODEL: process.env.AI_PRIMARY_MODEL,
    DEEPSEEK_API_KEY: process.env.DEEPSEEK_API_KEY,
    DEEPSEEK_API_URL: process.env.DEEPSEEK_API_URL,
  };
  const calls = [];

  process.env.AI_PRIMARY_API_KEY = "test-primary-key";
  process.env.AI_PRIMARY_API_URL = "https://api.dstopology.com";
  process.env.AI_PRIMARY_MODEL = "";
  process.env.DEEPSEEK_API_KEY = "test-key";
  process.env.DEEPSEEK_API_URL = "";
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
    Object.entries(originalEnv).forEach(([key, value]) => {
      if (typeof value === "undefined") {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    });
  }
}

test("finance AI assistant API exposes planning and explanation responsibilities", async () => {
  const route = await readProjectFile("src/app/api/tools/finance-ai-assistant/route.ts");
  const context = await readProjectFile("src/lib/finance-ai/context.ts");
  const packageJson = await readProjectFile("package.json");

  assert.match(route, /\/api\/tools\/finance-ai-assistant/);
  assert.match(route, /mode/);
  assert.match(route, /analyze/);
  assert.match(route, /plan/);
  assert.match(route, /explain/);
  assert.match(route, /getChatProviders/);
  assert.doesNotMatch(route, /CHAT_API_KEY/);
  assert.doesNotMatch(route, /CHAT_API_URL/);
  assert.doesNotMatch(route, /CHAT_MODEL/);
  assert.doesNotMatch(route, /CHAT_MODEL_FALLBACK/);
  assert.doesNotMatch(route, /gpt-5\.2/);
  assert.doesNotMatch(route, /gpt-5\.4/);
  assert.doesNotMatch(route, /884819/);
  assert.match(route, /response_format/);
  assert.match(route, /workbook/);
  assert.match(route, /normalizeDirectAnalysis/);
  assert.match(route, /recentAssistantMessages/);
  assert.match(route, /analysisContext/);
  assert.match(route, /modules/);
  assert.match(route, /errorCode/);
  assert.match(route, /503/);
  assert.match(route, /400/);
  assert.match(route, /AI 不负责计算数字/);

  assert.match(context, /buildFinanceAIDirectAnalyzePrompt/);
  assert.match(context, /buildFinanceAIPlanningContext/);
  assert.match(context, /buildFinanceAIExplanationPrompt/);
  assert.match(context, /上传底稿/);
  assert.match(context, /safeWorkbookJson/);
  assert.doesNotMatch(context, /metric_card/);
  assert.match(context, /percent_stacked_bar/);
  assert.match(context, /scatter_bubble/);
  assert.match(context, /AI 不负责计算数字/);
  assert.match(context, /图表模块会渲染在聊天消息内部/);
  assert.match(context, /最多生成 3 个模块/);
  assert.match(context, /默认使用可用期间里的最新 key/);
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
  assert.match(context, /grouped_bar/);
  assert.match(context, /stacked_bar/);
  assert.match(context, /percent_stacked_bar/);
  assert.match(context, /预算.*目标.*grouped_bar|grouped_bar.*预算.*目标/);
  assert.match(context, /不要.*stacked_bar.*预算|预算.*不要.*stacked_bar/);
  assert.match(context, /heatmap/);
  assert.match(context, /scatter_bubble/);
  assert.match(context, /detail_table/);
  assert.match(context, /完整明细表/);
  assert.match(context, /超过 10 的 limit/);
  assert.match(context, /waterfall_bridge/);
  assert.match(context, /维度成员 \+ 维度字段/);

  assert.match(packageJson, /tests\/finance-ai-assistant-contract\.test\.mjs/);
});

test("finance AI direct prompt includes uploaded workbook rows for provider analysis", () => {
  const prompt = buildFinanceAIDirectAnalyzePrompt({
    userQuestion: "今年 3 月巴西单车边际是多少？环比多少？",
    workbook: {
      fileName: "底稿.xlsx",
      totalRowCount: 2,
      sheets: [
        {
          name: "明细",
          headers: ["月份", "国家", "销量", "边际"],
          rowCount: 2,
          rows: [
            { "月份": "2026-03", "国家": "巴西", "销量": 100, "边际": 3000 },
            { "月份": "2026-04", "国家": "巴西", "销量": 120, "边际": 3900 },
          ],
        },
      ],
    },
  });

  assert.match(prompt, /上传底稿/);
  assert.match(prompt, /底稿\.xlsx/);
  assert.match(prompt, /2026-03/);
  assert.match(prompt, /巴西/);
  assert.match(prompt, /3000/);
  assert.match(prompt, /compact_workbook_v1/);
  assert.match(prompt, /Each sheet\.rows item is an array/);
  assert.match(prompt, /sheet 名为实际、预算、目标、预测/);
  assert.match(prompt, /\["2026-03","巴西",100,3000\]/);
  assert.doesNotMatch(prompt, /\{"月份":"2026-03","国家":"巴西","销量":100,"边际":3000\}/);
  assert.match(prompt, /charts 最多 3 个/);
  assert.doesNotMatch(prompt, /只允许以下三种类型/);
  assert.doesNotMatch(prompt, /metric_card/);
  assert.match(prompt, /trend/);
  assert.match(prompt, /bar_rank/);
  assert.match(prompt, /waterfall/);
  assert.match(prompt, /grouped_bar/);
  assert.match(prompt, /stacked_bar/);
  assert.match(prompt, /percent_stacked_bar/);
  assert.match(prompt, /预算.*目标.*grouped_bar|grouped_bar.*预算.*目标/);
  assert.match(prompt, /不要.*stacked_bar.*预算|预算.*不要.*stacked_bar/);
  assert.match(prompt, /heatmap/);
  assert.match(prompt, /scatter_bubble/);
  assert.match(prompt, /detail_table/);
  assert.doesNotMatch(prompt, /已省略完整明细数组/);
});

test("finance AI prompts forbid inferred currency units when workbook has no explicit unit", () => {
  const schema = makeSchema();
  const workbook = {
    fileName: "margin.xlsx",
    totalRowCount: 1,
    sheets: [{
      name: "Sheet1",
      headers: ["月份", "国家", "销量", "边际"],
      rowCount: 1,
      rows: [{ "月份": "2026-03", "国家": "西班牙", "销量": 1, "边际": 100 }],
    }],
  };
  const state = { recentQuestions: ["西班牙边际变化如何？"], chartHistory: [] };
  const planningPrompt = buildFinanceAIPlanningContext(schema, state);
  const directPrompt = buildFinanceAIDirectAnalyzePrompt({
    workbook,
    userQuestion: "西班牙边际变化如何？",
    state,
  });

  assert.match(planningPrompt, /不要根据国家、市场或地区推断币种/);
  assert.match(planningPrompt, /原始单位/);
  assert.match(directPrompt, /不要根据国家、市场或地区推断币种/);
  assert.match(directPrompt, /没有明确单位时/);
});

test("finance AI prompts and client keep internal period keys out of user-facing copy", async () => {
  const schema = makeSchema({
    profile: {
      rowCount: 2,
      periods: [
        { key: "M04", label: "四月", sort: 4 },
        { key: "M05", label: "五月", sort: 5 },
      ],
      dimensionValueCounts: { "国家": 1 },
    },
  });
  const prompt = buildFinanceAIExplanationPrompt({
    userQuestion: "五月西班牙单车边际为什么下降这么多？",
    computedSummary: {
      modules: [{
        type: "waterfall_bridge",
        request: { fromPeriod: "M04", toPeriod: "M05" },
      }],
      schema: { periods: schema.profile.periods },
    },
  });
  const client = await readProjectFile("src/app/tools/finance-ai-assistant/FinanceAIAssistantTool.tsx");

  assert.match(prompt, /用户可见月份/);
  assert.match(prompt, /不要把 M04\/M05/);
  assert.match(client, /function getPeriodDisplayLabel/);
  assert.match(client, /function getModuleTitle\(module: FinanceActionModule, schema: FinanceSchema\)/);
  assert.match(client, /getPeriodDisplayLabel\(schema, module\.fromPeriod\)/);
  assert.match(client, /getModuleTitle\(module, schema\)/);
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
    recentAssistantMessages: Array.from({ length: 10 }, (_, index) => `最近助手结论${index}`),
    currentFilters: Object.fromEntries(
      Array.from({ length: 40 }, (_, fieldIndex) => [
        `维度${fieldIndex}`,
        Array.from({ length: 40 }, (_, valueIndex) => `筛选值${fieldIndex}-${valueIndex}`),
      ]),
    ),
    chartHistory: Array.from({ length: 20 }, (_, index) => ({ type: "trend_chart", title: `图表${index}` })),
    analysisContext: Array.from({ length: 20 }, (_, index) => ({
      type: "waterfall_bridge",
      title: `计算模块${index}`,
      metric: "单车边际",
      dimension: "大区",
      filters: { "大区": ["MBT"] },
      focusValues: [{ dimension: "大区", value: "MBT" }],
    })),
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
  assert.match(planningPrompt, /最近助手结论/);
  assert.match(planningPrompt, /最近计算模块/);
  assert.match(planningPrompt, /当前上传底稿重新规划/);
  assert.match(planningPrompt, /不要因为上一轮结果没包含某个切片/);
  assert.match(planningPrompt, /另有/);
  assert.doesNotMatch(planningPrompt, /最近助手结论0/);
  assert.doesNotMatch(planningPrompt, /计算模块0/);
  assert.doesNotMatch(planningPrompt, /筛选值39-39/);
  assert.equal(explanationPrompt.length < 8000, true);
  assert.match(explanationPrompt, /聚合结果足够回答/);
  assert.match(explanationPrompt, /排名、占比、变化贡献/);
  assert.match(explanationPrompt, /不要说看不到明细/);
  assert.match(explanationPrompt, /answerItems/);
  assert.match(explanationPrompt, /不要说“只返回了前 N”/);
  assert.match(explanationPrompt, /不要把本轮没有覆盖的切片说成“看不到底稿”/);
  assert.match(explanationPrompt, /不要再手写完整 Markdown 表格/);
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
          totalItemCount: 12,
          visibleItemCount: 2,
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
          fullScan: {
            basis: "all_dimension_members",
            totalItemCount: 12,
            visibleItemCount: 2,
            increases: [
              { label: "巴西", value: 143047, valueShare: 0.62, changeValue: 22547, changeShare: 0.48, rowCount: 38 },
            ],
            decreases: [
              { label: "西班牙", value: 7533, valueShare: 0.053, changeValue: -3188, changeShare: -0.14, rowCount: 12 },
            ],
            largestAbsoluteChanges: [
              { label: "巴西", value: 143047, valueShare: 0.62, changeValue: 22547, changeShare: 0.48, rowCount: 38 },
              { label: "西班牙", value: 7533, valueShare: 0.053, changeValue: -3188, changeShare: -0.14, rowCount: 12 },
            ],
          },
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
  assert.match(explanationPrompt, /fullScan/);
  assert.match(explanationPrompt, /all_dimension_members/);
  assert.match(explanationPrompt, /西班牙/);
  assert.match(explanationPrompt, /-3188/);
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

test("finance AI assistant plan mode repairs missing dimensions before surfacing validation errors", async () => {
  await withMockedProvider(async () => {
    const response = await POST(makeRequest({
      mode: "plan",
      question: "巴西销量和单车边际怎么样？",
      schema: makeSchema(),
    }));
    const payload = await response.json();

    assert.equal(response.status, 200);
    assert.equal(payload.modules[0].dimension, "国家");
    assert.equal(payload.modules[0].period, "2026-03");
  }, JSON.stringify({
    modules: [{ type: "bar_rank", metric: "边际", limit: 10 }],
  }));
});

test("finance AI assistant plan mode aligns explicit rank directions before returning modules", async () => {
  const schema = {
    headers: ["Month", "Country", "Sales Volume", "Total Margin"],
    monthColumn: "Month",
    salesColumn: "Sales Volume",
    dimensionColumns: ["Country"],
    totalMetrics: [
      { kind: "total", name: "Sales Volume", column: "Sales Volume" },
      { kind: "total", name: "Total Margin", column: "Total Margin" },
    ],
    unitMetrics: [{ kind: "unit", name: "单车边际", numeratorColumn: "Total Margin", denominatorColumn: "Sales Volume" }],
    excludedMetricColumns: [],
    requiredIssues: [],
    profile: {
      rowCount: 20,
      periods: [
        { key: "M03", label: "3月", sort: 3 },
        { key: "M04", label: "4月", sort: 4 },
      ],
      dimensionValueCounts: { Country: 12 },
    },
  };

  await withMockedProvider(async () => {
    const response = await POST(makeRequest({
      mode: "plan",
      question: "4月，列出Top 5的这个国家销量来，然后还有单车边际最低的5个国家也给我。",
      schema,
    }));
    const payload = await response.json();

    assert.equal(response.status, 200);
    assert.equal(payload.modules[0].sort, "value_desc");
    assert.equal(payload.modules[1].sort, "value_asc");
  }, JSON.stringify({
    modules: [
      {
        type: "bar_rank",
        metric: "Sales Volume",
        dimension: "Country",
        period: "M04",
        sort: "value_asc",
        limit: 5,
      },
      {
        type: "bar_rank",
        metric: "单车边际",
        dimension: "Country",
        period: "M04",
        sort: "value_desc",
        limit: 5,
      },
    ],
  }));
});

test("finance AI assistant plan mode converts budget target stacks into grouped comparison bars", async () => {
  const schema = {
    headers: ["Month", "Country", "数据口径", "Sales Volume"],
    monthColumn: "Month",
    salesColumn: "Sales Volume",
    dimensionColumns: ["Country", "数据口径"],
    totalMetrics: [
      { kind: "total", name: "Sales Volume", column: "Sales Volume" },
    ],
    unitMetrics: [],
    excludedMetricColumns: [],
    requiredIssues: [],
    profile: {
      rowCount: 40,
      periods: [
        { key: "M05", label: "5月", sort: 5 },
      ],
      dimensionValueCounts: { Country: 8, "数据口径": 2 },
    },
  };

  await withMockedProvider(async () => {
    const response = await POST(makeRequest({
      mode: "plan",
      question: "这个和预算目标比一下销量，分国家的。",
      schema,
    }));
    const payload = await response.json();

    assert.equal(response.status, 200);
    assert.equal(payload.modules[0].type, "grouped_bar");
    assert.equal(payload.modules[0].metric, "Sales Volume");
    assert.equal(payload.modules[0].dimension, "Country");
    assert.equal(payload.modules[0].seriesDimension, "数据口径");
    assert.equal(payload.modules[0].period, "M05");
    assert.equal(payload.modules[0].comparison, undefined);
  }, JSON.stringify({
    modules: [
      {
        type: "stacked_bar",
        metric: "Sales Volume",
        dimension: "Country",
        seriesDimension: "数据口径",
        period: "M05",
        limit: 8,
      },
    ],
  }));
});

test("finance AI assistant plan mode converts budget actual attribution into scenario waterfall bridges", async () => {
  const schema = {
    headers: ["Month", "Country", "数据口径", "Sales Volume", "Net Revenue"],
    monthColumn: "Month",
    salesColumn: "Sales Volume",
    dimensionColumns: ["Country", "数据口径"],
    totalMetrics: [
      { kind: "total", name: "Sales Volume", column: "Sales Volume" },
      { kind: "total", name: "Net Revenue", column: "Net Revenue" },
    ],
    unitMetrics: [],
    excludedMetricColumns: [],
    requiredIssues: [],
    profile: {
      rowCount: 40,
      periods: [
        { key: "M05", label: "5月", sort: 5 },
      ],
      dimensionValueCounts: { Country: 8, "数据口径": 2 },
    },
  };

  await withMockedProvider(async () => {
    const response = await POST(makeRequest({
      mode: "plan",
      question: "5月实际和预算比，销量差异来源是什么？按国家做瀑布桥。",
      schema,
    }));
    const payload = await response.json();

    assert.equal(response.status, 200);
    assert.equal(payload.modules[0].type, "waterfall_bridge");
    assert.equal(payload.modules[0].metric, "Sales Volume");
    assert.equal(payload.modules[0].dimension, "Country");
    assert.equal(payload.modules[0].period, "M05");
    assert.equal(payload.modules[0].comparison, "scenario");
    assert.equal(payload.modules[0].fromScenario, "预算");
    assert.equal(payload.modules[0].toScenario, "实际");
    assert.equal("fromPeriod" in payload.modules[0], false);
    assert.equal("toPeriod" in payload.modules[0], false);
  }, JSON.stringify({
    modules: [
      {
        type: "waterfall_bridge",
        metric: "Sales Volume",
        dimension: "Country",
        period: "M05",
        limit: 8,
      },
    ],
  }));
});

test("finance AI assistant plan mode accepts unit-metric waterfall plans", async () => {
  const schema = {
    headers: ["Month", "Country", "Model", "Sales Volume", "Total Margin"],
    monthColumn: "Month",
    salesColumn: "Sales Volume",
    dimensionColumns: ["Country", "Model"],
    totalMetrics: [
      { kind: "total", name: "Sales Volume", column: "Sales Volume" },
      { kind: "total", name: "Total Margin", column: "Total Margin" },
    ],
    unitMetrics: [{ kind: "unit", name: "单车边际", numeratorColumn: "Total Margin", denominatorColumn: "Sales Volume" }],
    excludedMetricColumns: [],
    requiredIssues: [],
    profile: {
      rowCount: 5341,
      periods: [
        { key: "M03", label: "3月", sort: 3 },
        { key: "M04", label: "4月", sort: 4 },
      ],
      dimensionValueCounts: { Country: 20, Model: 12 },
    },
  };

  await withMockedProvider(async () => {
    const response = await POST(makeRequest({
      mode: "plan",
      question: "泰国单车边际多少呀？然后它环比的一个成绩如何？主要是哪些车型影响的?",
      schema,
    }));
    const payload = await response.json();

    assert.equal(response.status, 200);
    assert.equal(payload.modules[0].type, "waterfall_bridge");
    assert.equal(payload.modules[0].metric, "单车边际");
    assert.equal(payload.modules[0].dimension, "Model");
    assert.equal(payload.modules[0].fromPeriod, "M03");
    assert.equal(payload.modules[0].toPeriod, "M04");
  }, JSON.stringify({
    modules: [
      {
        type: "waterfall_bridge",
        metric: "单车边际",
        dimension: "Model",
        fromPeriod: "M03",
        toPeriod: "M04",
        filters: { Country: ["泰国"] },
        limit: 5,
      },
    ],
  }));
});

test("finance AI assistant plan mode keeps supporting volume and revenue charts for unit composition analysis", async () => {
  const schema = {
    headers: ["Month", "Country", "Model", "Sales Volume", "Net Revenue", "Total Margin"],
    monthColumn: "Month",
    salesColumn: "Sales Volume",
    dimensionColumns: ["Country", "Model"],
    totalMetrics: [
      { kind: "total", name: "Sales Volume", column: "Sales Volume" },
      { kind: "total", name: "Net Revenue", column: "Net Revenue" },
      { kind: "total", name: "Total Margin", column: "Total Margin" },
    ],
    unitMetrics: [{ kind: "unit", name: "单车边际", numeratorColumn: "Total Margin", denominatorColumn: "Sales Volume" }],
    excludedMetricColumns: [],
    requiredIssues: [],
    profile: {
      rowCount: 5341,
      periods: [
        { key: "M04", label: "4月", sort: 4 },
        { key: "M05", label: "5月", sort: 5 },
      ],
      dimensionValueCounts: { Country: 20, Model: 12 },
    },
  };

  await withMockedProvider(async () => {
    const response = await POST(makeRequest({
      mode: "plan",
      question: "巴西单车边际构成分析，除了瀑布图，也看一下量比较和收入比较。",
      schema,
    }));
    const payload = await response.json();

    assert.equal(response.status, 200);
    assert.deepEqual(payload.modules.map((module) => module.type), ["waterfall_bridge", "grouped_bar", "grouped_bar"]);
    assert.equal(payload.modules[0].metric, "单车边际");
    assert.equal(payload.modules[0].dimension, "Model");
    assert.equal(payload.modules[1].metric, "Sales Volume");
    assert.equal(payload.modules[1].comparison, "mom");
    assert.equal(payload.modules[2].metric, "Net Revenue");
    assert.equal(payload.modules[2].comparison, "mom");
  }, JSON.stringify({
    modules: [
      {
        type: "waterfall_bridge",
        metric: "单车边际",
        dimension: "Model",
        fromPeriod: "M04",
        toPeriod: "M05",
        filters: { Country: ["巴西"] },
        limit: 8,
      },
      {
        type: "grouped_bar",
        metric: "Sales Volume",
        dimension: "Model",
        period: "M05",
        comparison: "mom",
        filters: { Country: ["巴西"] },
        limit: 8,
      },
      {
        type: "grouped_bar",
        metric: "Net Revenue",
        dimension: "Model",
        period: "M05",
        comparison: "mom",
        filters: { Country: ["巴西"] },
        limit: 8,
      },
    ],
  }));
});

test("finance AI assistant analyze mode sends workbook rows and normalizes direct charts", async () => {
  await withMockedProvider(async (calls) => {
    const response = await POST(makeRequest({
      mode: "analyze",
      question: "今年 3 月巴西单车边际是多少？",
      workbook: {
        fileName: "source.xlsx",
        totalRowCount: 3,
        sheets: [
          {
            name: "明细",
            headers: ["月份", "国家", "销量", "边际"],
            rowCount: 3,
            rows: [
              { "月份": "2026-02", "国家": "巴西", "销量": 80, "边际": 2000 },
              { "月份": "2026-03", "国家": "巴西", "销量": 100, "边际": 3500 },
              { "月份": "2026-03", "国家": "西班牙", "销量": 50, "边际": 900 },
            ],
          },
        ],
      },
    }));
    const payload = await response.json();
    const providerBody = JSON.stringify(calls[0]);

    assert.equal(response.status, 200);
    assert.match(providerBody, /source\.xlsx/);
    assert.match(providerBody, /2026-02/);
    assert.match(providerBody, /西班牙/);
    assert.equal(payload.message, "3 月巴西单车边际为 35。");
    assert.deepEqual(payload.assumptions, ["单车边际=边际/销量"]);
    assert.equal(payload.charts.length, 2);
    assert.equal(payload.charts[0].type, "heatmap");
    assert.equal(payload.charts[1].type, "detail_table");
    assert.equal(payload.charts[0].values.length, 2);
    assert.equal(payload.charts[0].values[0][1], null);
    assert.equal(payload.charts[1].rows.length, 2);
  }, JSON.stringify({
    answer: "3 月巴西单车边际为 35。",
    assumptions: ["单车边际=边际/销量"],
    charts: [
      {
        type: "metric_card",
        title: "巴西单车边际趋势",
        value: 35,
        subtitle: "环比 +40%",
        points: [
          { label: "兼容旧字段", value: 1 },
          { label: "兼容旧字段2", value: 2 },
        ],
      },
      {
        type: "heatmap",
        title: "国家车型单车边际",
        xLabels: ["T1D", "T1E"],
        yLabels: ["巴西", "西班牙"],
        values: [[35, null], [18, 16]],
      },
      {
        type: "detail_table",
        title: "低单车边际明细",
        columns: ["国家", "销量", "单车边际"],
        rows: [
          ["巴西", 100, 35],
          ["西班牙", 50, 18],
        ],
      },
      { type: "pie", title: "不支持图", items: [{ label: "x", value: 1 }] },
      { type: "trend", title: "坏图", points: [{ label: "x", value: "bad" }] },
    ],
  }));
});

test("finance AI analyze mode converts budget target stacked charts into grouped bars", async () => {
  await withMockedProvider(async () => {
    const response = await POST(makeRequest({
      mode: "analyze",
      question: "这个和预算目标比一下销量，分国家的。",
      workbook: {
        fileName: "source.xlsx",
        totalRowCount: 4,
        sheets: [
          {
            name: "实际",
            headers: ["月份", "国家", "销量"],
            rowCount: 2,
            rows: [
              { "月份": "5月", "国家": "巴西", "销量": 120 },
              { "月份": "5月", "国家": "西班牙", "销量": 80 },
            ],
          },
          {
            name: "预算",
            headers: ["月份", "国家", "销量"],
            rowCount: 2,
            rows: [
              { "月份": "5月", "国家": "巴西", "销量": 100 },
              { "月份": "5月", "国家": "西班牙", "销量": 90 },
            ],
          },
        ],
      },
    }));
    const payload = await response.json();

    assert.equal(response.status, 200);
    assert.equal(payload.charts.length, 1);
    assert.equal(payload.charts[0].type, "grouped_bar");
    assert.deepEqual(payload.charts[0].series.map((item) => item.name), ["实际", "预算"]);
  }, JSON.stringify({
    answer: "5月销量按国家对比，巴西实际高于预算，西班牙低于预算。",
    assumptions: [],
    charts: [
      {
        type: "stacked_bar",
        title: "5月国家销量实际 vs 预算",
        series: [
          { name: "实际", items: [{ label: "巴西", value: 120 }, { label: "西班牙", value: 80 }] },
          { name: "预算", items: [{ label: "巴西", value: 100 }, { label: "西班牙", value: 90 }] },
        ],
      },
    ],
  }));
});

test("finance AI data request prompt sends catalog instead of full workbook rows", () => {
  const prompt = buildFinanceAIDataRequestPrompt({
    userQuestion: "4月份的销量环比3月如何？哪些是Top 5国家？",
    workbook: {
      fileName: "source.xlsx",
      totalRowCount: 4,
      sheets: [
        {
          name: "明细",
          headers: ["Month", "Dim_B", "Sales Volume"],
          rowCount: 4,
          rows: [
            { "Month": "3月", "Dim_B": "巴西", "Sales Volume": 100 },
            { "Month": "4月", "Dim_B": "巴西", "Sales Volume": 120 },
            { "Month": "3月", "Dim_B": "西班牙", "Sales Volume": 90 },
            { "Month": "4月", "Dim_B": "secret-outside-sample", "Sales Volume": 10 },
          ],
        },
      ],
    },
  });

  assert.match(prompt, /数据目录/);
  assert.match(prompt, /filters/);
  assert.match(prompt, /columns/);
  assert.match(prompt, /Month/);
  assert.match(prompt, /Dim_B/);
  assert.doesNotMatch(prompt, /secret-outside-sample/);
  assert.doesNotMatch(prompt, /\["4月","secret-outside-sample",10\]/);
});

test("finance AI selected rows prompt sends only AI-requested raw rows", () => {
  const workbook = {
    fileName: "source.xlsx",
    totalRowCount: 4,
    sheets: [
      {
        name: "明细",
        headers: ["Month", "Dim_A", "Dim_B", "Sales Volume", "Total Margin"],
        rowCount: 4,
        rows: [
          { "Month": "3月", "Dim_A": "欧洲", "Dim_B": "西班牙", "Sales Volume": 100, "Total Margin": 10 },
          { "Month": "4月", "Dim_A": "欧洲", "Dim_B": "西班牙", "Sales Volume": 80, "Total Margin": 12 },
          { "Month": "3月", "Dim_A": "拉美", "Dim_B": "巴西", "Sales Volume": 90, "Total Margin": 9 },
          { "Month": "4月", "Dim_A": "拉美", "Dim_B": "巴西", "Sales Volume": 140, "Total Margin": 15 },
        ],
      },
    ],
  };
  const selection = applyFinanceAIDataRequest(workbook, {
    sheetName: "明细",
    columns: ["Month", "Dim_B", "Sales Volume"],
    filters: { Month: ["3月", "4月"] },
    rowLimit: 10,
  });
  const prompt = buildFinanceAISelectedRowsAnalyzePrompt({
    userQuestion: "4月份的销量环比3月如何？哪些是Top 5国家？",
    workbook,
    selection,
  });

  assert.equal(selection.rows.length, 4);
  assert.deepEqual(selection.headers, ["Month", "Dim_B", "Sales Volume"]);
  assert.match(prompt, /AI 请求的数据切片/);
  assert.match(prompt, /\["4月","巴西",140\]/);
  assert.doesNotMatch(prompt, /Total Margin/);
  assert.doesNotMatch(prompt, /欧洲/);
});

test("finance AI assistant API lets AI request raw data slices before final analysis", async () => {
  await withMockedProvider(async (calls) => {
    const dataRequestResponse = await POST(makeRequest({
      mode: "data_request",
      question: "4月份的销量环比3月如何？哪些是Top 5国家？",
      workbook: {
        fileName: "source.xlsx",
        totalRowCount: 2,
        sheets: [
          {
            name: "明细",
            headers: ["Month", "Dim_B", "Sales Volume"],
            rowCount: 2,
            rows: [
              { "Month": "3月", "Dim_B": "巴西", "Sales Volume": 100 },
              { "Month": "4月", "Dim_B": "巴西", "Sales Volume": 120 },
            ],
          },
        ],
      },
    }));
    const dataRequestPayload = await dataRequestResponse.json();

    assert.equal(dataRequestResponse.status, 200);
    assert.deepEqual(dataRequestPayload.dataRequest.columns, ["Month", "Dim_B", "Sales Volume"]);
    assert.equal(calls[0].response_format, undefined);

    const analyzeResponse = await POST(makeRequest({
      mode: "analyze_selection",
      question: "4月份的销量环比3月如何？哪些是Top 5国家？",
      workbook: {
        fileName: "source.xlsx",
        totalRowCount: 2,
        sheets: [
          {
            name: "明细",
            headers: ["Month", "Dim_B", "Sales Volume"],
            rowCount: 2,
            rows: [
              { "Month": "3月", "Dim_B": "巴西", "Sales Volume": 100 },
              { "Month": "4月", "Dim_B": "巴西", "Sales Volume": 120 },
            ],
          },
        ],
      },
      selection: {
        request: dataRequestPayload.dataRequest,
        sheetName: "明细",
        headers: ["Month", "Dim_B", "Sales Volume"],
        rowCount: 2,
        totalMatchedRowCount: 2,
        omittedRowCount: 0,
        rows: [
          { "Month": "3月", "Dim_B": "巴西", "Sales Volume": 100 },
          { "Month": "4月", "Dim_B": "巴西", "Sales Volume": 120 },
        ],
      },
    }));
    const analyzePayload = await analyzeResponse.json();

    assert.equal(analyzeResponse.status, 200);
    assert.equal(analyzePayload.message, "4月销量环比增长 20%。");
    assert.equal(calls.length, 2);
    assert.match(JSON.stringify(calls[1]), /AI 请求的数据切片/);
  }, (calls) => calls.length === 1
    ? JSON.stringify({
      columns: ["Month", "Dim_B", "Sales Volume"],
      filters: { Month: ["3月", "4月"] },
      rowLimit: 10000,
      reason: "需要比较两个月份并按国家排名。",
    })
    : JSON.stringify({
      answer: "4月销量环比增长 20%。",
      assumptions: ["AI 基于请求切片中的原始明细行计算。"],
      charts: [
        {
          type: "bar_rank",
          title: "4月国家销量Top 1",
          items: [{ label: "巴西", value: 120, changeValue: 20 }],
        },
      ],
    }));
});

test("finance AI assistant analyze mode avoids provider JSON mode for raw workbook prompts", async () => {
  await withMockedProvider(async (calls) => {
    const response = await POST(makeRequest({
      mode: "analyze",
      question: "销量环比如何？",
      workbook: {
        fileName: "source.xlsx",
        totalRowCount: 2,
        sheets: [
          {
            name: "明细",
            headers: ["月份", "国家", "销量"],
            rowCount: 2,
            rows: [
              { "月份": "2026-03", "国家": "巴西", "销量": 100 },
              { "月份": "2026-04", "国家": "巴西", "销量": 120 },
            ],
          },
        ],
      },
    }));
    const payload = await response.json();

    assert.equal(response.status, 200);
    assert.equal("response_format" in calls[0], false);
    assert.equal(payload.message, "4 月销量环比增长 20%。");
  }, "```json\n{\"answer\":\"4 月销量环比增长 20%。\",\"charts\":[]}\n```");
});

test("finance AI assistant reports empty provider content as a distinct diagnosis", async () => {
  await withMockedProvider(async () => {
    const response = await POST(makeRequest({
      mode: "analyze",
      question: "销量环比如何？",
      workbook: {
        fileName: "source.xlsx",
        totalRowCount: 1,
        sheets: [
          {
            name: "明细",
            headers: ["月份", "销量"],
            rowCount: 1,
            rows: [{ "月份": "2026-04", "销量": 120 }],
          },
        ],
      },
    }));
    const payload = await response.json();

    assert.equal(response.status, 502);
    assert.equal(payload.errorCode, "provider_empty_response");
    assert.equal(payload.attempts[0].errorCode, "provider_empty_response");
  }, "");
});

test("finance AI assistant is public while the shared access endpoint remains for private finance tools", async () => {
  const publicResponse = await POST(makeRequest({
    mode: "plan",
    question: "巴西 3 月边际怎么看？",
    schema: {},
  }));
  const publicPayload = await publicResponse.json();

  assert.equal(publicResponse.status, 400);
  assert.equal(publicPayload.errorCode, "invalid_schema");

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

test("finance AI assistant uses lighter provider settings for explanation calls", async () => {
  const route = await readProjectFile("src/app/api/tools/finance-ai-assistant/route.ts");

  assert.match(route, /const FINANCE_AI_PLAN_TIMEOUT_MS = 60000/);
  assert.match(route, /const FINANCE_AI_EXPLAIN_TIMEOUT_MS = 25000/);
  assert.match(route, /maxTokens\?: number/);
  assert.match(route, /timeoutMs: options\.timeoutMs \?\? FINANCE_AI_PLAN_TIMEOUT_MS/);
  assert.match(route, /max_tokens: options\.maxTokens \?\? \(options\.jsonMode \? 1800 : 1200\)/);
  assert.match(route, /callFirstConfiguredProvider\([\s\S]*\{ jsonMode: false, timeoutMs: FINANCE_AI_EXPLAIN_TIMEOUT_MS, maxTokens: 700 \}/s);
});

test("finance AI assistant API can run a tiny provider diagnostic without workbook data", async () => {
  await withMockedProvider(async (calls) => {
    const response = await POST(makeRequest({
      mode: "diagnose",
    }));
    const payload = await response.json();
    const providerBody = JSON.stringify(calls[0]);

    assert.equal(response.status, 200);
    assert.equal(payload.ok, true);
    assert.equal(payload.provider, "deepseek-v4-pro");
    assert.equal(payload.contentLength, 2);
    assert.match(providerBody, /ping/);
    assert.doesNotMatch(providerBody, /workbook/);
    assert.doesNotMatch(providerBody, /底稿/);
  }, "OK");
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
  assert.match(page, /min-h-screen/);
  assert.doesNotMatch(page, /fixed inset-0 overflow-hidden/);
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
  assert.match(client, /FinanceRawWorkbook/);
  assert.match(client, /buildChartSpec/);
  assert.match(client, /buildMetricSnapshot/);
  assert.match(client, /buildTrendSeries/);
  assert.match(client, /buildBarRank/);
  assert.match(client, /buildWaterfallBridge/);
  assert.match(client, /callAI\("plan"/);
  assert.match(client, /callAI\("explain"/);
  assert.match(client, /workbook/);
  assert.match(client, /getRequestedRankLimit/);
  assert.match(client, /recentAssistantMessages/);
  assert.match(client, /analysisContext/);
  assert.match(client, /buildAnalysisContext/);
  assert.match(client, /answerItems/);
  assert.match(client, /visibleItemCount 只是图表可见项限制/);
  assert.match(client, /provider_timeout/);
  assert.match(client, /DeepSeek 分析超时/);
  assert.match(client, /const provisionalAssistantId = `assistant-\$\{Date\.now\(\)\}`/);
  assert.match(client, /正在补充解读/);
  assert.match(client, /setMessages\(\(current\) => \[\s*\.\.\.current,\s*\{\s*id: provisionalAssistantId/s);
  assert.match(client, /setMessages\(\(current\) => current\.map\(\(message\) =>/);
  assert.doesNotMatch(client, /buildLocalFinanceAnalysis/);
  assert.doesNotMatch(client, /applyFinanceAIDataRequest/);
  assert.doesNotMatch(client, /callAI\("data_request"/);
  assert.doesNotMatch(client, /callAI\("analyze_selection"/);
  assert.match(client, /useEffect/);
  assert.doesNotMatch(client, /newDatasetMessages/);
  assert.doesNotMatch(client, /assistant-upload/);
  assert.match(client, /finance-ai-assistant-panel \$\{workbook \? "is-ready" : ""\}/);
  assert.match(client, /\{workbook \? \(\s*<div className="finance-ai-header-actions">/);
  assert.match(client, /!\s*workbook\s*\?/);
  assert.doesNotMatch(client, /finance-ai-empty-state \$\{workbook \? "is-loaded" : ""\}/);
  assert.doesNotMatch(client, /localStorage/);
  assert.doesNotMatch(client, /sessionStorage/);
  assert.doesNotMatch(client, /IndexedDB/);
});

test("finance AI assistant collapses non-chat chrome after data is loaded", async () => {
  const styles = await readProjectFile("src/app/globals.css");

  assert.match(styles, /\.finance-ai-assistant-panel\.is-ready\s+\.finance-ai-chat-header\s*\{[\s\S]*padding:\s*6px\s+0\s+4px/s);
  assert.match(styles, /\.finance-ai-assistant-panel\.is-ready\s+\.finance-ai-chat-header\s+\.finance-ai-avatar/s);
  assert.doesNotMatch(styles, /\.finance-ai-empty-state\.is-loaded/);
  assert.match(styles, /\.finance-ai-assistant-panel\.is-ready\s+\.finance-ai-chat\s*\{[\s\S]*padding-top:\s*10px/s);
});

test("finance AI assistant chat styles size embedded chart cards", async () => {
  const styles = await readProjectFile("src/app/globals.css");
  const client = await readProjectFile("src/app/tools/finance-ai-assistant/FinanceAIAssistantTool.tsx");

  assert.match(styles, /\.finance-ai-page/);
  assert.match(styles, /\.finance-ai-chat/);
  assert.match(styles, /\.finance-ai-message\.is-assistant/);
  assert.match(styles, /\.finance-ai-chart-grid/);
  assert.match(styles, /\.finance-ai-chart-grid\s*\{[\s\S]*grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\)/s);
  assert.match(styles, /\.finance-ai-chart-card/);
  assert.match(styles, /\.finance-ai-message\.is-assistant\s+\.finance-ai-message-bubble\s*\{[\s\S]*width:\s*100%/s);
  assert.match(styles, /\.finance-ai-chart-grid\s+\.finance-ai-chart-card:only-child:not\(\.is-large\)\s*\{[^}]*grid-column:\s*1\s*\/\s*-1/s);
  assert.match(styles, /\.finance-ai-chart-card\.is-large\s*\{[\s\S]*grid-column:\s*1\s*\/\s*-1/s);
  assert.doesNotMatch(styles, /\.finance-ai-chart-card\.is-small/);
  assert.match(styles, /\.finance-ai-chart-host\s*\{[\s\S]*min-height:\s*210px/s);
  assert.doesNotMatch(styles, /\.finance-ai-chart-zoom/);
  assert.doesNotMatch(styles, /\.finance-ai-chart-modal/);
  assert.doesNotMatch(client, /Maximize2/);
  assert.doesNotMatch(client, /expandedChart/);
  assert.doesNotMatch(client, /<p>\{card\.note\}<\/p>/);
  assert.match(styles, /\.finance-ai-markdown/);
  assert.match(styles, /\.finance-ai-markdown\s+\.katex-display/);
});

test("finance AI assistant chart surfaces blend with the warm page background", async () => {
  const styles = await readProjectFile("src/app/globals.css");

  assert.match(styles, /--finance-ai-page-surface:\s*#f7f5ef/);
  assert.match(styles, /--finance-ai-chart-surface:\s*color-mix\(in srgb,\s*var\(--finance-ai-page-surface\)\s*88%,\s*var\(--card\)\)/);
  assert.match(styles, /--finance-ai-chart-border:\s*color-mix\(in srgb,\s*var\(--border\)\s*78%,\s*#d7cdbc\)/);
  assert.match(styles, /\.finance-ai-page\s*\{[\s\S]*background:\s*var\(--finance-ai-page-surface\)/s);
  assert.match(styles, /\.finance-ai-chart-card\s*\{[\s\S]*background:\s*var\(--finance-ai-chart-surface\)/s);
  assert.match(styles, /\.finance-ai-demo-card\s*\{[\s\S]*background:\s*var\(--finance-ai-chart-surface\)/s);
  assert.match(styles, /\.finance-ai-chart-host\s*\{[\s\S]*background:\s*transparent/s);
  assert.doesNotMatch(styles, /\.finance-ai-chart-card\s*\{[^}]*background:\s*rgba\(255,\s*255,\s*255/s);
  assert.doesNotMatch(styles, /\.finance-ai-demo-card\s*\{[^}]*background:\s*rgba\(255,\s*255,\s*255/s);
});

test("finance AI assistant does not interleave pure metric cards into narrative text", async () => {
  const client = await readProjectFile("src/app/tools/finance-ai-assistant/FinanceAIAssistantTool.tsx");

  assert.match(client, /buildAssistantMessageSections/);
  assert.doesNotMatch(client, /splitAssistantTextForMetricCards/);
  assert.doesNotMatch(client, /metricCards/);
  assert.doesNotMatch(client, /finance-ai-inline-chart-grid/);
  assert.match(client, /messageSections\.map/);
});

test("finance AI assistant rank detail tables keep numeric cells for shared unit scaling", async () => {
  const client = await readProjectFile("src/app/tools/finance-ai-assistant/FinanceAIAssistantTool.tsx");

  assert.doesNotMatch(client, /formatTableNumber\(item\.value/);
  assert.doesNotMatch(client, /formatTableNumber\(item\.changeValue/);
  assert.match(client, /item\.value,/);
  assert.match(client, /item\.changeValue,/);
});

test("finance AI assistant detail tables use Excel-style header filter menus", async () => {
  const client = await readProjectFile("src/app/tools/finance-ai-assistant/FinanceAIAssistantTool.tsx");
  const chartDemo = await readProjectFile("src/app/finance/finance-ai-assistant/chart-demo/FinanceAIChartDemo.tsx");
  const detailTable = await readProjectFile("src/components/finance/FinanceAIDetailTable.tsx");
  const styles = await readProjectFile("src/app/globals.css");

  assert.match(client, /FinanceAIDetailTable/);
  assert.match(chartDemo, /FinanceAIDetailTable/);
  assert.match(detailTable, /function FinanceAIDetailTable/);
  assert.match(detailTable, /appliedFilters/);
  assert.match(detailTable, /appliedNumericFilters/);
  assert.match(detailTable, /openFilterMenu/);
  assert.match(detailTable, /createPortal/);
  assert.match(detailTable, /filteredRows/);
  assert.match(detailTable, /parseTableNumber/);
  assert.match(detailTable, /numericFilterMatches/);
  assert.match(detailTable, /NumericFilterOperator/);
  assert.match(detailTable, /finance-ai-detail-filter-trigger/);
  assert.match(detailTable, /finance-ai-detail-filter-menu/);
  assert.match(detailTable, /finance-ai-detail-number-filter/);
  assert.match(detailTable, /大于/);
  assert.match(detailTable, /小于/);
  assert.match(detailTable, /介于/);
  assert.match(detailTable, /全选/);
  assert.match(detailTable, /清空/);
  assert.match(detailTable, /应用/);
  assert.match(client, /spec\.kind === "detail_table"/);
  assert.match(detailTable, /finance-ai-detail-table-count/);
  assert.match(styles, /\.finance-ai-detail-table-wrap/);
  assert.match(styles, /\.finance-ai-detail-filter-trigger/);
  assert.match(styles, /\.finance-ai-detail-filter-menu/);
  assert.match(styles, /\.finance-ai-detail-number-filter/);
  assert.match(styles, /\.finance-ai-detail-number-inputs/);
  assert.match(styles, /\.finance-ai-detail-table th/);
  assert.doesNotMatch(detailTable, /className="finance-ai-detail-table-filter"/);
  assert.doesNotMatch(detailTable, /finance-ai-detail-table-filters/);
});

test("finance AI detail table search matches formatted numeric values without separators", () => {
  assert.equal(filterTableValueBySearchText("123,456", "45"), true);
  assert.equal(filterTableValueBySearchText("123,456", "3456"), true);
  assert.equal(filterTableValueBySearchText("123,456", "123456"), true);
  assert.equal(filterTableValueBySearchText("12,345.67万", "2345.67"), true);
  assert.equal(filterTableValueBySearchText("106.2%", "6.2"), true);
  assert.equal(filterTableValueBySearchText("巴西", "西"), true);
  assert.equal(filterTableValueBySearchText("123,456", "789"), false);
});

test("finance AI detail tables carry business table variants and metadata", async () => {
  const types = await readProjectFile("src/lib/finance/charts/types.ts");
  const detailTable = await readProjectFile("src/components/finance/FinanceAIDetailTable.tsx");
  const client = await readProjectFile("src/app/tools/finance-ai-assistant/FinanceAIAssistantTool.tsx");
  const spec = buildDirectChartSpec({
    type: "detail_table",
    title: "国家销量与单车边际环比对比表",
    variant: "comparison",
    meta: {
      primaryDimension: "国家",
      metrics: ["销量", "单车边际"],
      period: "2026-03",
      periods: ["2026-02", "2026-03"],
      comparison: "mom",
      filters: { "数据口径": ["实际"] },
      focusValues: [{ dimension: "国家", value: "巴西" }],
    },
    columns: ["国家", "销量上期", "销量本期", "销量环比变化", "单车边际上期", "单车边际本期", "单车边际环比变化"],
    rows: [["巴西", 80, 100, 20, 25, 35, 10]],
  });

  assert.match(types, /FinanceTableVariant/);
  assert.match(types, /tableVariant\?/);
  assert.match(types, /tableMeta\?/);
  assert.equal(spec.tableVariant, "comparison");
  assert.deepEqual(spec.tableMeta.metrics, ["销量", "单车边际"]);
  assert.deepEqual(spec.tableMeta.periods, ["2026-02", "2026-03"]);
  assert.equal(spec.tableMeta.comparison, "mom");
  assert.match(detailTable, /getTableVariantLabel/);
  assert.match(detailTable, /finance-ai-detail-table-kind/);
  assert.match(detailTable, /spec\.tableVariant/);
  assert.match(client, /tableVariant/);
  assert.match(client, /tableMeta/);
});

test("finance AI follow-up planning context preserves table metrics, periods, comparison and focus values", () => {
  const prompt = buildFinanceAIPlanningContext(makeSchema(), {
    recentQuestions: ["哪些国家销量和单车边际都增长？", "为什么巴西下降这么多？"],
    chartHistory: [{ type: "detail_table", title: "国家销量与单车边际环比对比表" }],
    analysisContext: [{
      type: "detail_table",
      chartKind: "detail_table",
      title: "国家销量与单车边际环比对比表",
      tableVariant: "comparison",
      metrics: ["销量", "单车边际"],
      dimension: "国家",
      period: "2026-03",
      periods: ["2026-02", "2026-03"],
      comparison: "mom",
      filters: { "数据口径": ["实际"] },
      focusValues: [
        { dimension: "国家", value: "巴西" },
        { dimension: "国家", value: "西班牙" },
      ],
    }],
  });

  assert.match(prompt, /tableVariant/);
  assert.match(prompt, /comparison/);
  assert.match(prompt, /metrics/);
  assert.match(prompt, /periods/);
  assert.match(prompt, /focusValues/);
  assert.match(prompt, /巴西/);
  assert.match(prompt, /西班牙/);
  assert.match(prompt, /这张表|这个表|上张表/);
  assert.match(prompt, /刚才.*指标|metrics/);
  assert.match(prompt, /仍然.*当前上传底稿重新规划/);
  assert.match(prompt, /不要只围绕上一轮可见表格/);
});

test("finance AI prompts ask detail tables to include useful comparison columns", () => {
  const context = buildFinanceAIPlanningContext(makeSchema(), {
    recentQuestions: ["把国家销量和单车边际都增长的列出来"],
    chartHistory: [],
  });
  const directPrompt = buildFinanceAIDirectAnalyzePrompt({
    userQuestion: "把国家销量和单车边际都增长的列出来",
    workbook: {
      fileName: "底稿.xlsx",
      totalRowCount: 2,
      sheets: [{
        name: "明细",
        headers: ["月份", "国家", "销量", "边际"],
        rowCount: 2,
        rows: [
          { "月份": "2026-02", "国家": "巴西", "销量": 80, "边际": 2000 },
          { "月份": "2026-03", "国家": "巴西", "销量": 100, "边际": 3500 },
        ],
      }],
    },
  });

  assert.match(context, /detail_table.*上期.*本期.*变化.*变化率|上期.*本期.*变化.*变化率.*detail_table/);
  assert.match(context, /表格.*至少.*4.*列|至少.*4.*列.*表格/);
  assert.match(directPrompt, /detail_table.*关键维度.*当前值.*对比值.*变化|关键维度.*当前值.*对比值.*变化.*detail_table/);
  assert.match(directPrompt, /不要只返回一两列/);
});

test("finance AI assistant pivots multi-metric mom detail tables into compact project rows", async () => {
  const client = await readProjectFile("src/app/tools/finance-ai-assistant/FinanceAIAssistantTool.tsx");
  const detailTable = await readProjectFile("src/lib/finance-ai/detail-table.ts");

  assert.match(client, /buildMomComparisonDetailRows/);
  assert.match(client, /module\.comparison === "mom"/);
  assert.match(client, /module\.metrics\.length > 1/);
  assert.match(detailTable, /项目/);
  assert.match(detailTable, /上期/);
  assert.match(detailTable, /本期/);
  assert.match(detailTable, /变化率/);
});

test("finance AI assistant supports conjunctive multi-metric growth questions", async () => {
  const schema = makeSchema({
    totalMetrics: [
      { kind: "total", name: "销量", column: "销量" },
      { kind: "total", name: "边际", column: "边际" },
    ],
    unitMetrics: [{ kind: "unit", name: "单车边际", numeratorColumn: "边际", denominatorColumn: "销量" }],
  });
  const context = buildFinanceAIPlanningContext(schema, {
    recentQuestions: ["哪些国家销量和单车边际都增长的？"],
    chartHistory: [],
  });
  const client = await readProjectFile("src/app/tools/finance-ai-assistant/FinanceAIAssistantTool.tsx");

  assert.match(context, /多个指标.*都增长|都增长.*多个指标/);
  assert.match(context, /detail_table/);
  assert.match(context, /comparison:"mom"/);
  assert.match(client, /module\.metrics\.forEach/);
  assert.match(client, /\`\$\{metric\}环比变化\`/);
  assert.doesNotMatch(client, /columns\.push\(\`\$\{primaryMetric\}环比变化\`\)/);
});

test("finance AI chart demo page renders all demo chart styles", async () => {
  const page = await readProjectFile("src/app/finance/finance-ai-assistant/chart-demo/page.tsx");
  const client = await readProjectFile("src/app/finance/finance-ai-assistant/chart-demo/FinanceAIChartDemo.tsx");
  const demoSpecs = await readProjectFile("src/lib/finance-ai/chart-demo.ts");
  const styles = await readProjectFile("src/app/globals.css");

  assert.match(page, /FinanceAIChartDemo/);
  assert.match(client, /buildFinanceAIChartDemoSpecs/);
  assert.match(client, /plotly\.js-dist-min/);
  assert.match(client, /FinanceAIDetailTable/);
  assert.match(client, /finance-ai-demo-grid/);
  assert.match(demoSpecs, /percent_stacked_bar/);
  assert.match(demoSpecs, /scatter_bubble/);
  assert.match(demoSpecs, /detail_table/);
  assert.match(demoSpecs, /13665/);
  assert.match(styles, /\.finance-ai-demo-page/);
  assert.match(styles, /\.finance-ai-demo-grid/);
});

test("finance AI chart demos are generated by the central chart builder", async () => {
  const demoSpecs = await readProjectFile("src/lib/finance-ai/chart-demo.ts");

  assert.match(demoSpecs, /buildDirectChartSpec/);
  assert.match(demoSpecs, /FinanceAIDirectChart/);
  assert.match(demoSpecs, /\.map\(\(chart\) => buildDirectChartSpec\(chart\)\)/);
  assert.doesNotMatch(demoSpecs, /function spec\(/);
  assert.doesNotMatch(demoSpecs, /const COLORS/);
  assert.doesNotMatch(demoSpecs, /const baseLayout/);
  assert.doesNotMatch(demoSpecs, /const baseConfig/);
});

test("finance AI assistant public demo is a read-only simulated chat", async () => {
  const page = await readProjectFile("src/app/finance/finance-ai-assistant/demo/page.tsx");
  const client = await readProjectFile("src/app/finance/finance-ai-assistant/demo/FinanceAIConversationDemo.tsx");
  const styles = await readProjectFile("src/app/globals.css");

  assert.match(page, /FinanceAIConversationDemo/);
  assert.match(page, /只读示例/);
  assert.match(client, /"use client"/);
  assert.match(client, /SIMULATED_MESSAGES/);
  assert.match(client, /finance-ai-page/);
  assert.match(client, /finance-ai-message is-user/);
  assert.match(client, /finance-ai-message is-assistant/);
  assert.match(client, /FinanceAIMessageContent/);
  assert.match(client, /FinanceAIChartGrid/);
  assert.match(client, /FinanceAIDetailTable/);
  assert.match(client, /plotly\.js-dist-min/);
  assert.match(client, /buildDirectChartSpec/);
  assert.match(client, /BUSINESS_DEMO_CHARTS/);
  assert.match(client, /整体 KPI 表现怎么样/);
  assert.match(client, /巴西 5月分指标完成情况怎么样/);
  assert.match(client, /巴西单车边际为什么比上月下降/);
  assert.match(client, /5月各大区销量和单车边际环比情况怎么样/);
  assert.match(client, /5月边际总额环比增加的原因是什么/);
  assert.match(client, /5月各大区销量预算实际对比/);
  assert.match(client, /巴西5月分指标预算实际表/);
  assert.match(client, /30680/);
  assert.match(client, /1025700000/);
  assert.match(client, /巴西单车边际变化归因桥/);
  assert.match(client, /5月各大区销量环比对比/);
  assert.match(client, /5月边际总额环比变化桥/);
  assert.match(client, /S56 EV/);
  assert.match(client, /Tiggo 8/);
  assert.match(client, /西班牙/);
  assert.match(client, /墨西哥/);
  assert.doesNotMatch(client, /这类问题/);
  assert.doesNotMatch(client, /这个问题用/);
  assert.doesNotMatch(client, /不能只列环比百分比/);
  assert.doesNotMatch(client, /最好用/);
  assert.doesNotMatch(client, /下一步应该/);
  assert.doesNotMatch(client, /应该先/);
  assert.doesNotMatch(client, /车型结构/);
  assert.doesNotMatch(client, /单车净收入走弱/);
  assert.doesNotMatch(client, /销量增长贡献/);
  assert.doesNotMatch(client, /结构及其他/);
  assert.doesNotMatch(client, /3月 vs 4月车型单车边际/);
  assert.doesNotMatch(client, /国家经营定位气泡图/);
  assert.match(client, /finance-ai-composer/);
  assert.match(client, /disabled/);
  assert.match(client, /只读示例，不能追问或编辑/);
  assert.match(client, /进入正式助手/);
  assert.doesNotMatch(client, /fetch\(/);
  assert.doesNotMatch(client, /\/api\/tools\/finance-ai-assistant/);
  assert.doesNotMatch(client, /type="file"/);
  assert.doesNotMatch(client, /onSubmit/);
  assert.doesNotMatch(client, /onChange/);
  assert.match(styles, /\.finance-ai-conversation-demo/);
  assert.match(styles, /\.finance-ai-readonly-pill/);
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
  assert.match(sitemap, /\$\{BASE_URL\}\/finance\/finance-ai-assistant\/demo/);
  assert.doesNotMatch(sitemap, /\$\{BASE_URL\}\/tools\/finance-ai-assistant/);
  assert.doesNotMatch(content, /finance-ai-assistant/);
});

test("finance AI assistant page follows the site chat assistant interaction style", async () => {
  const client = await readProjectFile("src/app/tools/finance-ai-assistant/FinanceAIAssistantTool.tsx");
  const styles = await readProjectFile("src/app/globals.css");
  const financeAIPageBlock = styles.match(/(?:^|\n)\.finance-ai-page\s*\{(?<block>[^}]*)\}/)?.groups?.block ?? "";
  const financeAIChatBlock = styles.match(/(?:^|\n)\.finance-ai-chat\s*\{(?<block>[^}]*)\}/)?.groups?.block ?? "";
  const financeAIComposerDockBlock = styles.match(/(?:^|\n)\.finance-ai-composer-dock\s*\{(?<block>[^}]*)\}/)?.groups?.block ?? "";

  assert.match(client, /finance-ai-avatar/);
  assert.doesNotMatch(client, /finance-ai-access-gate/);
  assert.match(client, /finance-ai-upload-chip/);
  assert.match(client, /finance-ai-demo-effect-button/);
  assert.match(client, /查看示例效果/);
  assert.match(client, /href="\/finance\/finance-ai-assistant\/demo"/);
  assert.match(client, /finance-ai-empty-card/);
  assert.doesNotMatch(client, /EXAMPLE_CONVERSATION/);
  assert.doesNotMatch(client, /finance-ai-example-dialogue/);
  assert.doesNotMatch(client, /泰国有没有卖 S56EV/);
  assert.match(client, /if \(!workbook\) \{[\s\S]*window\.scrollTo\(\{ top: 0, left: 0, behavior: "auto" \}\)/);
  assert.match(client, /downloadSampleTemplate/);
  assert.match(client, /"Sales Volume": 123456/);
  assert.match(client, /"Total Margin": 3703680/);
  assert.match(client, /book_append_sheet\(workbook,\s*actualWorksheet,\s*"实际"\)/);
  assert.match(client, /book_append_sheet\(workbook,\s*budgetWorksheet,\s*"预算"\)/);
  assert.match(client, /book_append_sheet\(workbook,\s*readmeWorksheet,\s*"填表说明"\)/);
  assert.match(client, /finance-ai-empty-state/);
  assert.doesNotMatch(client, /X-Finance-AI-Access/);
  assert.doesNotMatch(client, /next\/image/);
  assert.match(client, /finance-ai-assistant-avatar\.webp/);
  assert.doesNotMatch(
    client,
    /<img src=\{ASSISTANT_PREVIEW_IMAGE\}/,
    "the chat avatar should not crop the finance model preview image"
  );
  assert.match(client, /finance-ai-composer-dock/);
  assert.match(client, /computedModules/);
  assert.match(client, /chartCards/);
  assert.match(client, /resolveFinanceActionFilterMembers/);
  assert.match(client, /resolveFinanceActionFilterMembers\(rows, schema, plan\.modules, question\)/);
  assert.match(client, /filterResolution\.ok/);
  assert.doesNotMatch(client, /AI 计划没有通过校验/);
  assert.match(client, /我还需要确认一个口径/);
  assert.doesNotMatch(client, /<p>\{message\.text\}<\/p>/);
  assert.match(styles, /\.finance-ai-page\s*\{[\s\S]*background:\s*var\(--finance-ai-page-surface\)/s);
  assert.doesNotMatch(styles, /\.finance-ai-access-gate/);
  assert.doesNotMatch(styles, /\.finance-ai-example-dialogue/);
  assert.doesNotMatch(styles, /\.finance-ai-example-list/);
  assert.match(styles, /\.finance-ai-assistant-panel/);
  assert.match(styles, /\.finance-ai-assistant-panel\s*\{[\s\S]*border:\s*0/s);
  assert.doesNotMatch(financeAIPageBlock, /(^|\n)\s*height:\s*100dvh/);
  assert.match(financeAIPageBlock, /overflow:\s*visible/);
  assert.match(financeAIChatBlock, /overflow-y:\s*visible/);
  assert.match(financeAIChatBlock, /overflow-x:\s*clip/);
  assert.match(financeAIComposerDockBlock, /position:\s*sticky/);
  assert.match(financeAIComposerDockBlock, /bottom:\s*0/);
  assert.match(styles, /\.finance-ai-composer-dock\s*\{[\s\S]*flex:\s*0 0 auto/s);
  assert.match(styles, /\.finance-ai-avatar-mini/);
  assert.match(styles, /\.finance-ai-thinking/);
  assert.match(styles, /\.finance-ai-message\.is-user\s+\.finance-ai-message-bubble/);
  assert.match(styles, /\.finance-ai-message\.is-user\s+\.finance-ai-message-bubble\s*\{[\s\S]*margin-left:\s*auto/s);
  assert.match(styles, /\.finance-ai-message\.is-user\s+\.finance-ai-message-bubble\s*\{[\s\S]*width:\s*fit-content/s);
  assert.match(styles, /\.finance-ai-message\.is-user\s+\.finance-ai-message-bubble\s*\{[\s\S]*max-width:\s*min\(620px,\s*82%\)/s);
  assert.doesNotMatch(styles, /\.finance-ai-message\.is-user\s+\.finance-ai-message-bubble\s*\{[^}]*\n\s*width:\s*min\(620px,\s*82%\)/s);
  assert.match(styles, /@media \(max-width:\s*760px\)[\s\S]*\.finance-ai-message\.is-user\s+\.finance-ai-message-bubble\s*\{[\s\S]*max-width:\s*calc\(100%\s*-\s*38px\)/s);
  assert.match(styles, /\.finance-ai-empty-state\s*\{[\s\S]*place-items:\s*center/s);
  assert.match(styles, /\.finance-ai-empty-card/);
  assert.match(styles, /\.finance-ai-composer\s*\{[\s\S]*border-radius:\s*26px/s);
});
