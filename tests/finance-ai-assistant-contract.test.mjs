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
  assert.match(context, /metric_card/);
  assert.match(context, /percent_stacked_bar/);
  assert.match(context, /scatter_bubble/);
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
  assert.match(prompt, /\["2026-03","巴西",100,3000\]/);
  assert.doesNotMatch(prompt, /\{"月份":"2026-03","国家":"巴西","销量":100,"边际":3000\}/);
  assert.match(prompt, /charts 最多 3 个/);
  assert.doesNotMatch(prompt, /只允许以下三种类型/);
  assert.match(prompt, /metric_card/);
  assert.match(prompt, /trend/);
  assert.match(prompt, /bar_rank/);
  assert.match(prompt, /waterfall/);
  assert.match(prompt, /grouped_bar/);
  assert.match(prompt, /stacked_bar/);
  assert.match(prompt, /percent_stacked_bar/);
  assert.match(prompt, /heatmap/);
  assert.match(prompt, /scatter_bubble/);
  assert.match(prompt, /detail_table/);
  assert.doesNotMatch(prompt, /已省略完整明细数组/);
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
    assert.equal(payload.charts.length, 3);
    assert.equal(payload.charts[0].type, "metric_card");
    assert.equal(payload.charts[1].type, "heatmap");
    assert.equal(payload.charts[2].type, "detail_table");
    assert.equal(payload.charts[0].value, 35);
    assert.equal(payload.charts[0].subtitle, "环比 +40%");
    assert.equal(payload.charts[1].values.length, 2);
    assert.equal(payload.charts[2].rows.length, 2);
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
        values: [[35, 22], [18, 16]],
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

test("finance AI assistant API can run a tiny provider diagnostic without workbook data", async () => {
  await withMockedProvider(async (calls) => {
    const response = await POST(makeRequest({
      mode: "diagnose",
    }));
    const payload = await response.json();
    const providerBody = JSON.stringify(calls[0]);

    assert.equal(response.status, 200);
    assert.equal(payload.ok, true);
    assert.equal(payload.provider, "gpt-5.5");
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
  assert.match(client, /provider_timeout/);
  assert.match(client, /DeepSeek 分析超时/);
  assert.doesNotMatch(client, /buildLocalFinanceAnalysis/);
  assert.doesNotMatch(client, /applyFinanceAIDataRequest/);
  assert.doesNotMatch(client, /callAI\("data_request"/);
  assert.doesNotMatch(client, /callAI\("analyze_selection"/);
  assert.match(client, /useEffect/);
  assert.match(client, /newDatasetMessages/);
  assert.doesNotMatch(client, /localStorage/);
  assert.doesNotMatch(client, /sessionStorage/);
  assert.doesNotMatch(client, /IndexedDB/);
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
  assert.match(styles, /\.finance-ai-chart-host\s*\{[\s\S]*min-height:\s*220px/s);
  assert.match(styles, /\.finance-ai-chart-zoom/);
  assert.match(styles, /\.finance-ai-chart-modal/);
  assert.match(client, /Maximize2/);
  assert.match(client, /expandedChart/);
  assert.match(styles, /\.finance-ai-markdown/);
  assert.match(styles, /\.finance-ai-markdown\s+\.katex-display/);
});

test("finance AI chart demo page renders all demo chart styles", async () => {
  const page = await readProjectFile("src/app/finance/finance-ai-assistant/chart-demo/page.tsx");
  const client = await readProjectFile("src/app/finance/finance-ai-assistant/chart-demo/FinanceAIChartDemo.tsx");
  const demoSpecs = await readProjectFile("src/lib/finance-ai/chart-demo.ts");
  const styles = await readProjectFile("src/app/globals.css");

  assert.match(page, /FinanceAIChartDemo/);
  assert.match(client, /buildFinanceAIChartDemoSpecs/);
  assert.match(client, /plotly\.js-dist-min/);
  assert.match(client, /finance-ai-demo-grid/);
  assert.match(demoSpecs, /percent_stacked_bar/);
  assert.match(demoSpecs, /scatter_bubble/);
  assert.match(demoSpecs, /detail_table/);
  assert.match(styles, /\.finance-ai-demo-page/);
  assert.match(styles, /\.finance-ai-demo-grid/);
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
  assert.match(client, /finance-ai-composer-dock/);
  assert.match(client, /computedModules/);
  assert.match(client, /chartCards/);
  assert.doesNotMatch(client, /<p>\{message\.text\}<\/p>/);
  assert.match(styles, /\.finance-ai-page\s*\{[\s\S]*background:\s*#f7f5ef/s);
  assert.match(styles, /\.finance-ai-access-gate/);
  assert.match(styles, /\.finance-ai-assistant-panel/);
  assert.match(styles, /\.finance-ai-assistant-panel\s*\{[\s\S]*border:\s*0/s);
  assert.match(styles, /\.finance-ai-chat\s*\{[\s\S]*overflow-y:\s*auto/s);
  assert.match(styles, /\.finance-ai-composer-dock\s*\{[\s\S]*flex:\s*0 0 auto/s);
  assert.match(styles, /\.finance-ai-avatar-mini/);
  assert.match(styles, /\.finance-ai-thinking/);
  assert.match(styles, /\.finance-ai-message\.is-user\s+\.finance-ai-message-bubble/);
  assert.match(styles, /\.finance-ai-composer\s*\{[\s\S]*border-radius:\s*26px/s);
});
