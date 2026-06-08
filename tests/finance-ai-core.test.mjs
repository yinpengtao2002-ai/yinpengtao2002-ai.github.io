import test from "node:test";
import assert from "node:assert/strict";
import {
  inferFinanceSchema,
  normalizePeriodValue,
  toFinanceNumber,
} from "../src/lib/finance-ai/schema.ts";
import {
  buildBarRank,
  buildMetricSnapshot,
  buildTrendSeries,
  buildWaterfallBridge,
} from "../src/lib/finance-ai/metrics.ts";
import {
  alignFinanceActionPlanWithQuestion,
  normalizeFinanceActionPlanForQuestion,
  validateFinanceActionPlan,
} from "../src/lib/finance-ai/actions.ts";
import { buildChartSpec, buildDirectChartSpec } from "../src/lib/finance-ai/charts.ts";
import { buildFinanceAIChartDemoSpecs } from "../src/lib/finance-ai/chart-demo.ts";
import { buildFinanceRawWorkbookSheetFromRows } from "../src/lib/finance-ai/workbook.ts";

const rows = [
  { "月份": "2025-03", "大区": "拉美", "国家": "巴西", "车型": "T1D", "销量": 100, "净收入": 9000, "成本": -7000, "边际": 2000 },
  { "月份": "2025-04", "大区": "拉美", "国家": "巴西", "车型": "T1D", "销量": 110, "净收入": 9900, "成本": -7600, "边际": 2300 },
];

const metricRows = [
  { "月份": "2025-03", "大区": "拉美", "国家": "巴西", "车型": "T1D", "销量": 100, "净收入": 9000, "成本": -7000, "边际": 3000 },
  { "月份": "2025-03", "大区": "拉美", "国家": "巴西", "车型": "T1D", "销量": 0, "净收入": 0, "成本": 0, "边际": 500 },
  { "月份": "2026-02", "大区": "拉美", "国家": "巴西", "车型": "T1D", "销量": 120, "净收入": 10800, "成本": -8400, "边际": 2400 },
  { "月份": "2026-03", "大区": "拉美", "国家": "巴西", "车型": "T1D", "销量": 100, "净收入": 10000, "成本": -7600, "边际": 3500 },
  { "月份": "2026-03", "大区": "拉美", "国家": "墨西哥", "车型": "T1E", "销量": 80, "净收入": 7200, "成本": -6100, "边际": 1100 },
];

function approx(actual, expected, message) {
  assert.ok(
    Math.abs(actual - expected) < 1e-9,
    `${message}: expected ${expected}, received ${actual}`,
  );
}

test("finance AI schema infers month, sales, dimensions, total metrics, and unit metrics", () => {
  const schema = inferFinanceSchema(rows);

  assert.equal(schema.monthColumn, "月份");
  assert.equal(schema.salesColumn, "销量");
  assert.deepEqual(schema.dimensionColumns, ["大区", "国家", "车型"]);
  assert.deepEqual(schema.totalMetrics.map((metric) => metric.column), ["销量", "净收入", "成本", "边际"]);
  assert.deepEqual(schema.unitMetrics.map((metric) => metric.name), ["单车净收入", "单车成本", "单车边际"]);
  assert.equal(schema.requiredIssues.length, 0);
  assert.equal(schema.profile.rowCount, 2);
  assert.deepEqual(schema.profile.periods.map((period) => period.key), ["2025-03", "2025-04"]);
});

test("finance AI schema treats rate-like columns as non-default metrics", () => {
  const schema = inferFinanceSchema([
    { "月份": "2025年3月", "国家": "巴西", "销量": 100, "边际": 2000, "边际率": 0.22 },
  ]);

  assert.deepEqual(schema.totalMetrics.map((metric) => metric.column), ["销量", "边际"]);
  assert.deepEqual(schema.excludedMetricColumns, ["边际率"]);
});

test("normalizePeriodValue supports common month formats", () => {
  assert.deepEqual(normalizePeriodValue("2025-03"), { key: "2025-03", label: "2025-03", sort: 24303 });
  assert.deepEqual(normalizePeriodValue("2025年4月"), { key: "2025-04", label: "2025年4月", sort: 24304 });
  assert.deepEqual(normalizePeriodValue("202505"), { key: "2025-05", label: "202505", sort: 24305 });
  assert.deepEqual(normalizePeriodValue("五月"), { key: "M05", label: "五月", sort: 5 });
});

test("finance AI schema keeps numeric dimension codes while excluding metadata columns", () => {
  const schema = inferFinanceSchema([
    { "月份": "2025-03", "版本": "v1", "备注": "内部口径", "国家代码": 76, "经销商编码": 1001, "渠道": "直营", "销量": 10, "净收入": 30000 },
    { "月份": "2025-04", "版本": "v1", "备注": "内部口径", "国家代码": 76, "经销商编码": 1002, "渠道": "经销", "销量": 12, "净收入": 36000 },
  ]);

  assert.deepEqual(schema.dimensionColumns, ["国家代码", "经销商编码", "渠道"]);
  assert.deepEqual(schema.profile.dimensionValueCounts, {
    "国家代码": 1,
    "经销商编码": 2,
    "渠道": 2,
  });
});

test("finance AI schema matches common month and sales header variants", () => {
  const schema = inferFinanceSchema([
    { "销售月份": "2025-03", "大区": "拉美", "销量(台)": 100, "净收入": 9000 },
  ]);

  assert.equal(schema.monthColumn, "销售月份");
  assert.equal(schema.salesColumn, "销量(台)");
});

test("normalizePeriodValue supports separated and date-like month formats", () => {
  assert.deepEqual(normalizePeriodValue("2025/03"), { key: "2025-03", label: "2025/03", sort: 24303 });
  assert.deepEqual(normalizePeriodValue("2025.03"), { key: "2025-03", label: "2025.03", sort: 24303 });
  assert.deepEqual(normalizePeriodValue("2025-03-01"), { key: "2025-03", label: "2025-03-01", sort: 24303 });
});

test("finance AI schema supports yearless month labels from margin templates", () => {
  const templateRows = [
    { "Month": "四月", "Dim_A": "非洲大区", "Dim_B": "摩洛哥", "Sales Volume": 2, "Total Margin": 426871.6248 },
    { "Month": "三月", "Dim_A": "非洲大区", "Dim_B": "摩洛哥", "Sales Volume": 3, "Total Margin": 300000 },
  ];
  const schema = inferFinanceSchema(templateRows);

  assert.equal(schema.monthColumn, "Month");
  assert.equal(schema.salesColumn, "Sales Volume");
  assert.deepEqual(schema.profile.periods.map((period) => period.key), ["M03", "M04"]);
  assert.deepEqual(schema.profile.periods.map((period) => period.label), ["三月", "四月"]);
  assert.deepEqual(schema.totalMetrics.map((metric) => metric.name), ["Sales Volume", "Total Margin"]);

  const snapshot = buildMetricSnapshot(templateRows, schema, {
    metric: "Sales Volume",
    period: "四月",
    comparisons: ["mom"],
  });
  assert.equal(snapshot.value, 2);
  assert.equal(snapshot.mom?.value, 3);
});

test("finance AI workbook parser detects margin template headers below preamble rows", () => {
  const sheet = buildFinanceRawWorkbookSheetFromRows("单车边际底稿", [
    ["单车边际分析底稿"],
    ["单位：元"],
    [],
    ["请从下方表格开始填写"],
    [],
    ["Month", "Dim_A", "Dim_B", "Sales Volume", "Total Margin"],
    ["4月", "非洲大区", "摩洛哥", 2, 426871.6248],
    ["3月", "非洲大区", "摩洛哥", 3, 300000],
  ]);

  assert.deepEqual(sheet.headers, ["Month", "Dim_A", "Dim_B", "Sales Volume", "Total Margin"]);
  assert.equal(sheet.rowCount, 2);
  assert.deepEqual(sheet.rows[0], {
    "Month": "4月",
    "Dim_A": "非洲大区",
    "Dim_B": "摩洛哥",
    "Sales Volume": 2,
    "Total Margin": 426871.6248,
  });

  const schema = inferFinanceSchema(sheet.rows);
  assert.equal(schema.monthColumn, "Month");
  assert.equal(schema.salesColumn, "Sales Volume");
  assert.deepEqual(schema.profile.periods.map((period) => period.key), ["M03", "M04"]);
});

test("toFinanceNumber preserves unit scale, parentheses negatives, and percentages", () => {
  assert.equal(toFinanceNumber("1.2亿元"), 120000000);
  assert.equal(toFinanceNumber("3万元"), 30000);
  assert.equal(toFinanceNumber("(2,500元)"), -2500);
  assert.equal(toFinanceNumber("12.5%"), 0.125);
});

test("finance AI schema maps margin total aliases to unit margin metrics", () => {
  for (const column of ["毛利", "边际总额", "贡献边际"]) {
    const schema = inferFinanceSchema([
      { "月份": "2025-03", "国家": "巴西", "销量": 100, [column]: 2000 },
    ]);

    const unitMargin = schema.unitMetrics.find((metric) => metric.name === "单车边际");
    assert.equal(unitMargin?.numeratorColumn, column);
  }
});

test("finance AI schema excludes after-sales numeric code and metadata fields from total metrics", () => {
  const schema = inferFinanceSchema([
    {
      "月份": "2025-03",
      "国家": "巴西",
      "销量": 100,
      "经销商编码": 1001,
      "国家代码": 76,
      "客户ID": 30001,
      "SKU编码": 9001001,
      "版本": 1,
      "净收入": 9000,
      "成本": -7000,
    },
  ]);

  assert.deepEqual(schema.totalMetrics.map((metric) => metric.column), ["销量", "净收入", "成本"]);
});

test("finance AI schema prefers specific unit metric numerator aliases over generic matches", () => {
  const schema = inferFinanceSchema([
    { "月份": "2025-03", "国家": "巴西", "销量": 100, "收入": 8800, "净收入": 9000 },
  ]);

  const unitRevenue = schema.unitMetrics.find((metric) => metric.name === "单车净收入");
  assert.equal(unitRevenue?.numeratorColumn, "净收入");
});

test("metric snapshot computes unit metrics after aggregating zero-volume amount rows", () => {
  const schema = inferFinanceSchema(metricRows);
  const snapshot = buildMetricSnapshot(metricRows, schema, {
    metric: "单车边际",
    period: "2026-03",
    filters: { "国家": ["巴西"] },
    comparisons: ["mom", "yoy"],
  });

  assert.equal(snapshot.value, 35);
  assert.equal(snapshot.base.totalValue, 3500);
  assert.equal(snapshot.base.salesValue, 100);
  assert.equal(snapshot.base.rowCount, 1);
  assert.equal(snapshot.mom?.value, 20);
  assert.equal(snapshot.yoy?.value, 35);
  assert.equal(snapshot.yoy?.changeRate, 0);
});

test("trend series computes monthly unit values by sum metric over sum sales", () => {
  const schema = inferFinanceSchema(metricRows);
  const trend = buildTrendSeries(metricRows, schema, { metric: "单车边际", filters: { "国家": ["巴西"] } });

  assert.deepEqual(trend.points.map((point) => point.period), ["2025-03", "2026-02", "2026-03"]);
  assert.deepEqual(trend.points.map((point) => point.value), [35, 20, 35]);
});

test("bar rank can rank dimensions by period contribution", () => {
  const schema = inferFinanceSchema(metricRows);
  const rank = buildBarRank(metricRows, schema, {
    metric: "边际",
    dimension: "国家",
    period: "2026-03",
    sort: "value_desc",
    limit: 10,
  });

  assert.deepEqual(rank.items.map((item) => item.label), ["巴西", "墨西哥"]);
  assert.deepEqual(rank.items.map((item) => item.value), [3500, 1100]);
  assert.equal(rank.totalItemCount, 2);
  assert.equal(rank.visibleItemCount, 2);
});

test("bar rank full scan captures biggest declines outside visible top items", () => {
  const rows = [
    { "Month": "3月", "Country": "巴西", "Sales Volume": 1000 },
    { "Month": "4月", "Country": "巴西", "Sales Volume": 1200 },
    { "Month": "3月", "Country": "英国", "Sales Volume": 900 },
    { "Month": "4月", "Country": "英国", "Sales Volume": 1100 },
    { "Month": "3月", "Country": "澳大利亚", "Sales Volume": 100 },
    { "Month": "4月", "Country": "澳大利亚", "Sales Volume": 50 },
    { "Month": "3月", "Country": "西班牙", "Sales Volume": 800 },
    { "Month": "4月", "Country": "西班牙", "Sales Volume": 40 },
  ];
  const schema = inferFinanceSchema(rows);
  const rank = buildBarRank(rows, schema, {
    metric: "Sales Volume",
    dimension: "Country",
    period: "M04",
    comparison: "mom",
    sort: "value_desc",
    limit: 2,
  });

  assert.deepEqual(rank.items.map((item) => item.label), ["巴西", "英国"]);
  assert.equal(rank.totalItemCount, 4);
  assert.equal(rank.visibleItemCount, 2);
  assert.equal(rank.fullScan?.basis, "all_dimension_members");
  assert.equal(rank.fullScan?.decreases[0]?.label, "西班牙");
  assert.equal(rank.fullScan?.decreases[0]?.changeValue, -760);
  assert.equal(rank.fullScan?.largestAbsoluteChanges[0]?.label, "西班牙");
});

test("waterfall bridge groups top dimensions and ties to period movement", () => {
  const schema = inferFinanceSchema(metricRows);
  const bridge = buildWaterfallBridge(metricRows, schema, {
    metric: "边际",
    dimension: "国家",
    fromPeriod: "2026-02",
    toPeriod: "2026-03",
    limit: 5,
  });

  assert.equal(bridge.startValue, 2400);
  assert.equal(bridge.endValue, 4600);
  assert.equal(bridge.changeValue, 2200);
  assert.deepEqual(bridge.items.map((item) => [item.label, item.value]), [["巴西", 1100], ["墨西哥", 1100]]);
});

test("waterfall bridge supports unit metrics through mix and rate attribution", () => {
  const schema = inferFinanceSchema(metricRows);
  const bridge = buildWaterfallBridge(metricRows, schema, {
    metric: "单车边际",
    dimension: "国家",
    fromPeriod: "2026-02",
    toPeriod: "2026-03",
  });

  assert.equal(bridge.basis, "unit_metric_mix_rate");
  assert.equal(bridge.startValue, 20);
  assert.equal(bridge.endValue, 4600 / 180);
  approx(bridge.changeValue, 4600 / 180 - 20, "unit bridge change ties to total movement");
  approx(
    bridge.items.reduce((sum, item) => sum + item.value, 0),
    bridge.changeValue,
    "unit bridge item sum reconciles",
  );
  assert.equal(bridge.items.some((item) => typeof item.mixEffect === "number" && typeof item.rateEffect === "number"), true);
});

test("metric snapshot treats missing periods as not computable instead of zero comparisons", () => {
  const schema = inferFinanceSchema(metricRows);
  const missingTotal = buildMetricSnapshot(metricRows, schema, {
    metric: "边际",
    period: "2024-03",
    filters: { "国家": ["巴西"] },
  });
  const missingUnit = buildMetricSnapshot(metricRows, schema, {
    metric: "单车边际",
    period: "2024-03",
    filters: { "国家": ["巴西"] },
  });
  const snapshot = buildMetricSnapshot(metricRows, schema, {
    metric: "边际",
    period: "2025-03",
    filters: { "国家": ["巴西"] },
    comparisons: ["mom", "yoy"],
  });

  assert.equal(missingTotal.value, null);
  assert.equal(missingTotal.base.isComputable, false);
  assert.equal(missingTotal.base.rowCount, 0);
  assert.equal(missingTotal.base.totalValue, 0);
  assert.equal(missingTotal.base.salesValue, 0);
  assert.equal(missingUnit.value, null);
  assert.equal(missingUnit.base.isComputable, false);
  assert.equal(snapshot.value, 3500);
  assert.equal(snapshot.mom?.value, null);
  assert.equal(snapshot.mom?.isComputable, false);
  assert.equal(snapshot.mom?.changeValue, null);
  assert.equal(snapshot.mom?.changeRate, null);
  assert.equal(snapshot.yoy?.value, null);
  assert.equal(snapshot.yoy?.isComputable, false);
  assert.equal(snapshot.yoy?.changeValue, null);
  assert.equal(snapshot.yoy?.changeRate, null);
});

test("waterfall bridge appends an other residual item when limit omits contributors", () => {
  const schema = inferFinanceSchema(metricRows);
  const bridge = buildWaterfallBridge(metricRows, schema, {
    metric: "边际",
    dimension: "国家",
    fromPeriod: "2026-02",
    toPeriod: "2026-03",
    limit: 1,
  });
  const itemSum = bridge.items.reduce((sum, item) => sum + item.value, 0);

  assert.equal(bridge.changeValue, 2200);
  assert.deepEqual(bridge.items.map((item) => [item.label, item.value]), [["巴西", 1100], ["其他", 1100]]);
  assert.equal(itemSum, bridge.changeValue);
});

test("waterfall chart sorts visible bridge items by sign and absolute contribution", () => {
  const spec = buildDirectChartSpec({
    type: "waterfall",
    title: "单车边际变化桥",
    startLabel: "3月",
    startValue: 100,
    endLabel: "4月",
    endValue: 103,
    items: [
      { label: "A", value: 2 },
      { label: "B", value: -12 },
      { label: "C", value: 9 },
      { label: "D", value: -4 },
      { label: "E", value: 7 },
      { label: "F", value: -3 },
      { label: "G", value: 6 },
      { label: "H", value: -2 },
      { label: "I", value: 5 },
      { label: "J", value: -1 },
      { label: "K", value: 4 },
      { label: "L", value: -8 },
    ],
  });

  assert.equal(spec.size, "large");
  assert.equal(spec.data[0].type, "waterfall");
  assert.deepEqual(spec.data[0].measure, [
    "absolute",
    "relative",
    "relative",
    "relative",
    "relative",
    "relative",
    "relative",
    "relative",
    "relative",
    "relative",
    "relative",
    "relative",
    "total",
  ]);
  assert.deepEqual(spec.data[0].x, ["3月", "B", "L", "D", "F", "其他", "C", "E", "G", "I", "K", "A", "4月"]);
  assert.deepEqual(spec.data[0].y, [100, -12, -8, -4, -3, -3, 9, 7, 6, 5, 4, 2, 0]);
});

test("waterfall chart merges explicit other buckets with grouped residuals", () => {
  const spec = buildDirectChartSpec({
    type: "waterfall",
    title: "单车边际变化桥",
    startLabel: "3月",
    startValue: 100,
    endLabel: "4月",
    endValue: 103,
    items: [
      { label: "A", value: 2 },
      { label: "B", value: -12 },
      { label: "C", value: 9 },
      { label: "D", value: -4 },
      { label: "E", value: 7 },
      { label: "F", value: -3 },
      { label: "G", value: 6 },
      { label: "H", value: -2 },
      { label: "I", value: 5 },
      { label: "J", value: -1 },
      { label: "K", value: 4 },
      { label: "L", value: -8 },
      { label: "其他", value: -3 },
    ],
  });
  const trace = spec.data[0];
  const otherCount = trace.x.filter((label) => label === "其他").length;
  const itemTotal = trace.y.slice(1, -1).reduce((sum, value) => sum + value, 0);

  assert.equal(otherCount, 1);
  approx(trace.y[0] + itemTotal, 103, "waterfall visible deltas tie to the final period");
});

test("bar rank comparison includes previous-only groups and exposes change values", () => {
  const rankRows = [
    { "月份": "2026-02", "国家": "巴西", "销量": 10, "边际": 200 },
    { "月份": "2026-02", "国家": "智利", "销量": 10, "边际": 500 },
    { "月份": "2026-03", "国家": "巴西", "销量": 10, "边际": 350 },
    { "月份": "2026-03", "国家": "墨西哥", "销量": 10, "边际": 100 },
  ];
  const schema = inferFinanceSchema(rankRows);
  const rank = buildBarRank(rankRows, schema, {
    metric: "边际",
    dimension: "国家",
    period: "2026-03",
    comparison: "mom",
    sort: "change_asc",
    limit: 10,
  });

  assert.deepEqual(rank.items.map((item) => item.label), ["智利", "墨西哥", "巴西"]);
  assert.deepEqual(rank.items.map((item) => item.value), [0, 100, 350]);
  assert.deepEqual(rank.items.map((item) => item.changeValue), [-500, 100, 150]);
  assert.deepEqual(rank.items.map((item) => item.valueShare), [0, 2 / 9, 7 / 9]);
  assert.deepEqual(rank.items.map((item) => item.changeShare), [-10 / -5, 2 / -5, 3 / -5]);
  assert.deepEqual(rank.items.map((item) => item.rowCount), [0, 1, 1]);
});

test("bar rank keeps all ranked items when detail table is requested", () => {
  const rankRows = Array.from({ length: 12 }, (_, index) => ({
    "月份": "2026-03",
    "国家": `国家${index + 1}`,
    "销量": 1,
    "边际": 1200 - index,
  }));
  const schema = inferFinanceSchema(rankRows);
  const rank = buildBarRank(rankRows, schema, {
    metric: "边际",
    dimension: "国家",
    period: "2026-03",
    sort: "value_desc",
    limit: 10,
    detailTable: true,
  });

  assert.equal(rank.items.length, 10);
  assert.equal(rank.allItems?.length, 12);
  assert.equal(rank.allItems?.[11]?.label, "国家12");
});

test("metric aggregation counts malformed numeric values without dropping valid rows", () => {
  const malformedRows = [
    { "月份": "2026-03", "国家": "巴西", "销量": 100, "边际": 3000 },
    { "月份": "2026-03", "国家": "巴西", "销量": 50, "边际": "bad-value" },
    { "月份": "2026-03", "国家": "巴西", "销量": "", "边际": 500 },
    { "月份": "2026-03", "国家": "巴西", "销量": 20, "边际": null },
    { "月份": "2026-03", "国家": "巴西", "销量": 10, "边际": 100 },
    { "月份": "2026-03", "国家": "巴西", "销量": 10, "边际": 200 },
  ];
  const schema = inferFinanceSchema(malformedRows);
  const snapshot = buildMetricSnapshot(malformedRows, schema, {
    metric: "边际",
    period: "2026-03",
    filters: { "国家": ["巴西"] },
  });

  assert.equal(snapshot.value, 3800);
  assert.equal(snapshot.base.totalValue, 3800);
  assert.equal(snapshot.base.salesValue, 190);
  assert.equal(snapshot.base.rowCount, 6);
  assert.equal(snapshot.base.blankValueCount, 2);
  assert.equal(snapshot.base.invalidValueCount, 1);
});

test("non-array filter values are ignored instead of crashing metric requests", () => {
  const schema = inferFinanceSchema(metricRows);
  const snapshot = buildMetricSnapshot(metricRows, schema, {
    metric: "边际",
    period: "2026-03",
    filters: { "国家": 76 },
  });

  assert.deepEqual(snapshot.filters, {});
  assert.equal(snapshot.value, 4600);
});

test("invalid filter array elements are ignored without becoming string filters", () => {
  const schema = inferFinanceSchema(metricRows);
  const snapshot = buildMetricSnapshot(metricRows, schema, {
    metric: "边际",
    period: "2026-03",
    filters: { "国家": [{}, "巴西", null] },
  });

  assert.deepEqual(snapshot.filters, { "国家": ["巴西"] });
  assert.equal(snapshot.value, 3500);
});

test("action validator accepts recognized modules and enforces module limit", () => {
  const schema = inferFinanceSchema(metricRows);
  const valid = validateFinanceActionPlan(schema, {
    modules: [
      { type: "metric_snapshot", metric: "单车边际", period: "2026-03", filters: { "国家": ["巴西"] }, comparisons: ["mom", "yoy"] },
      { type: "trend_chart", metric: "单车边际", filters: { "国家": ["巴西"] }, highlightPeriod: "2026-03" },
    ],
  });

  assert.equal(valid.ok, true);
  assert.equal(valid.errors.length, 0);
  assert.equal(valid.modules.length, 2);
  assert.deepEqual(valid.modules.map((module) => module.type), ["metric_snapshot", "trend_chart"]);

  const invalid = validateFinanceActionPlan(schema, {
    modules: [
      { type: "bar_rank", metric: "不存在指标", dimension: "国家", period: "2026-03" },
      { type: "trend_chart", metric: "边际" },
      { type: "trend_chart", metric: "净收入" },
      { type: "trend_chart", metric: "成本" },
    ],
  });

  assert.equal(invalid.ok, false);
  assert.equal(invalid.modules.length, 3);
  assert.match(invalid.errors.join("\n"), /最多生成 3 个模块/);
  assert.match(invalid.errors.join("\n"), /指标不存在：不存在指标/);
});

test("action validator rejects unsupported actions and invalid dimensions filters and periods", () => {
  const schema = inferFinanceSchema(metricRows);
  const invalid = validateFinanceActionPlan(schema, {
    modules: [
      { type: "pie_chart", metric: "边际", period: "2026-03" },
      { type: "bar_rank", metric: "边际", dimension: "不存在维度", period: "2027-01", filters: { "不存在筛选": ["x"] } },
      { type: "waterfall_bridge", metric: "边际", dimension: "国家", fromPeriod: "2026-02", toPeriod: "2027-02", filters: { "国家": ["巴西"] } },
    ],
  });

  assert.equal(invalid.ok, false);
  assert.deepEqual(invalid.modules.map((module) => module.type), ["bar_rank", "waterfall_bridge"]);
  assert.match(invalid.errors.join("\n"), /存在不支持的分析动作/);
  assert.match(invalid.errors.join("\n"), /维度不存在：不存在维度/);
  assert.match(invalid.errors.join("\n"), /筛选字段不存在：不存在筛选/);
  assert.match(invalid.errors.join("\n"), /期间不存在：2027-01/);
  assert.match(invalid.errors.join("\n"), /期间不存在：2027-02/);
});

test("action validator accepts unit-metric waterfall plans for mix-rate attribution", () => {
  const schema = inferFinanceSchema(metricRows);
  const valid = validateFinanceActionPlan(schema, {
    modules: [
      { type: "waterfall_bridge", metric: "单车边际", dimension: "国家", fromPeriod: "2026-02", toPeriod: "2026-03" },
    ],
  });

  assert.equal(valid.ok, true);
});

test("action validator rejects modules with missing required period fields", () => {
  const schema = inferFinanceSchema(metricRows);
  const invalid = validateFinanceActionPlan(schema, {
    modules: [
      { type: "metric_snapshot", metric: "边际" },
      { type: "waterfall_bridge", metric: "边际", dimension: "国家" },
    ],
  });

  assert.equal(invalid.ok, false);
  assert.match(invalid.errors.join("\n"), /指标快照需要指定期间/);
  assert.match(invalid.errors.join("\n"), /瀑布桥需要指定开始期间/);
  assert.match(invalid.errors.join("\n"), /瀑布桥需要指定结束期间/);
});

test("action validator rejects invalid rank options while oversized rank limits request detail tables", () => {
  const schema = inferFinanceSchema(metricRows);
  const invalid = validateFinanceActionPlan(schema, {
    modules: [
      {
        type: "bar_rank",
        metric: "边际",
        dimension: "国家",
        period: "2026-03",
        comparison: "yoy",
        sort: "not_sort",
        limit: 999,
      },
      {
        type: "bar_rank",
        metric: "边际",
        dimension: "国家",
        sort: "change_desc",
      },
    ],
  });

  assert.equal(invalid.ok, false);
  assert.equal(invalid.modules[0].limit, 10);
  assert.equal(invalid.modules[0].detailTable, true);
  assert.equal("comparison" in invalid.modules[0], false);
  assert.equal("sort" in invalid.modules[0], false);
  assert.match(invalid.errors.join("\n"), /排名对比只支持环比/);
  assert.match(invalid.errors.join("\n"), /排序方式不支持/);
  assert.doesNotMatch(invalid.errors.join("\n"), /排名数量最多 10 项/);
  assert.match(invalid.errors.join("\n"), /变化排序需要同时指定环比对比和期间/);
});

test("action validator accepts all-rank requests by capping chart items and adding a detail table flag", () => {
  const schema = inferFinanceSchema(metricRows);
  const valid = validateFinanceActionPlan(schema, {
    modules: [
      {
        type: "bar_rank",
        metric: "边际",
        dimension: "国家",
        period: "2026-03",
        sort: "value_desc",
        limit: 999,
      },
    ],
  });

  assert.equal(valid.ok, true);
  assert.equal(valid.modules[0].type, "bar_rank");
  assert.equal(valid.modules[0].limit, 10);
  assert.equal(valid.modules[0].detailTable, true);
});

test("action validator accepts expanded chart plan modules for deterministic frontend calculation", () => {
  const schema = inferFinanceSchema(metricRows);
  const valid = validateFinanceActionPlan(schema, {
    modules: [
      { type: "grouped_bar", metric: "边际", dimension: "国家", period: "2026-03", comparison: "mom", limit: 10 },
      { type: "heatmap", metric: "单车边际", xDimension: "车型", yDimension: "国家", period: "2026-03", limit: 8 },
      { type: "scatter_bubble", xMetric: "销量", yMetric: "单车边际", sizeMetric: "边际", dimension: "国家", period: "2026-03", limit: 12 },
    ],
  });
  const validStructure = validateFinanceActionPlan(schema, {
    modules: [
      { type: "stacked_bar", metric: "销量", dimension: "国家", seriesDimension: "车型", period: "2026-03", limit: 8, seriesLimit: 4 },
      { type: "percent_stacked_bar", metric: "销量", dimension: "国家", seriesDimension: "车型", period: "2026-03", limit: 8, seriesLimit: 4 },
      { type: "detail_table", metrics: ["销量", "边际", "单车边际"], dimension: "国家", period: "2026-03", comparison: "mom", limit: 20 },
    ],
  });

  assert.equal(valid.ok, true);
  assert.deepEqual(valid.modules.map((module) => module.type), ["grouped_bar", "heatmap", "scatter_bubble"]);
  assert.equal(validStructure.ok, true);
  assert.deepEqual(validStructure.modules.map((module) => module.type), ["stacked_bar", "percent_stacked_bar", "detail_table"]);
});

test("all-member grouped bar questions keep every compact dimension member visible", () => {
  const regionRows = Array.from({ length: 12 }, (_, index) => ({
    "月份": "2026-04",
    "大区": `大区${index + 1}`,
    "销量": 1,
    "净收入总额": 1200 - index,
  }));
  const schema = inferFinanceSchema(regionRows);
  const normalized = normalizeFinanceActionPlanForQuestion(schema, {
    modules: [
      {
        type: "grouped_bar",
        metric: "净收入总额",
        dimension: "大区",
        period: "2026-04",
        comparison: "mom",
        limit: 10,
      },
    ],
  }, "所有大区4月净收入总额环比情况怎么看？用上期和本期对比柱状图展示。");
  const validated = validateFinanceActionPlan(schema, normalized);

  assert.equal(validated.ok, true);
  assert.equal(validated.modules[0].type, "grouped_bar");
  assert.equal(validated.modules[0].limit, 12);
});

test("grouped bar plans become change-ranked bars when the question asks for biggest declines", () => {
  const schema = inferFinanceSchema(metricRows);
  const normalized = normalizeFinanceActionPlanForQuestion(schema, {
    modules: [
      {
        type: "grouped_bar",
        metric: "边际",
        dimension: "国家",
        period: "2026-03",
        comparison: "mom",
        limit: 10,
      },
    ],
  }, "4月净收入总额环比下降最多的国家有哪些？请用横向排名柱状图，并把完整明细表列出来。");

  assert.equal(normalized.modules[0].type, "bar_rank");
  assert.equal(normalized.modules[0].sort, "change_asc");
  assert.equal(normalized.modules[0].comparison, "mom");
  assert.equal(normalized.modules[0].detailTable, true);
});

test("bar rank plans use change sorting when the question asks for biggest declines", () => {
  const schema = inferFinanceSchema(metricRows);
  const normalized = normalizeFinanceActionPlanForQuestion(schema, {
    modules: [
      {
        type: "bar_rank",
        metric: "边际",
        dimension: "国家",
        period: "2026-03",
        comparison: "mom",
        sort: "value_desc",
        limit: 10,
      },
    ],
  }, "4月净收入总额环比下降最多的国家有哪些？请用横向排名柱状图，并把完整明细表列出来。");

  assert.equal(normalized.modules[0].type, "bar_rank");
  assert.equal(normalized.modules[0].sort, "change_asc");
  assert.equal(normalized.modules[0].comparison, "mom");
  assert.equal(normalized.modules[0].detailTable, true);
});

test("detail table plans expand compact full-detail requests to the dimension member count", () => {
  const detailRows = Array.from({ length: 25 }, (_, index) => ({
    "月份": "2026-03",
    "国家": `国家${index + 1}`,
    "销量": 1,
    "边际": 1000 + index,
  }));
  const schema = inferFinanceSchema(detailRows);
  const normalized = normalizeFinanceActionPlanForQuestion(schema, {
    modules: [
      {
        type: "detail_table",
        metrics: ["边际"],
        dimension: "国家",
        period: "2026-03",
      },
    ],
  }, "把国家净收入总额完整明细表列出来。");

  assert.equal(normalized.modules[0].type, "detail_table");
  assert.equal(normalized.modules[0].limit, 25);
});

test("action plan normalization fills missing primary dimensions from the question", () => {
  const detailRows = Array.from({ length: 25 }, (_, index) => ({
    "月份": "2026-03",
    "国家": `国家${index + 1}`,
    "销量": 1,
    "边际": 1000 + index,
  }));
  const schema = inferFinanceSchema(detailRows);
  const normalized = normalizeFinanceActionPlanForQuestion(schema, {
    modules: [
      {
        type: "bar_rank",
        metric: "边际",
        period: "2026-03",
        sort: "change_asc",
        comparison: "mom",
        limit: 10,
      },
      {
        type: "detail_table",
        metrics: ["边际"],
        period: "2026-03",
      },
    ],
  }, "3月边际环比下降最多的国家有哪些？请用横向排名柱状图，并把完整明细表列出来。");
  const validated = validateFinanceActionPlan(schema, normalized);

  assert.equal(normalized.modules[0].dimension, "国家");
  assert.equal(normalized.modules[1].dimension, "国家");
  assert.equal(normalized.modules[1].limit, 25);
  assert.equal(validated.ok, true);
});

test("action plan alignment corrects explicit lowest and top rank directions per metric", () => {
  const rows = [
    { "Month": "3月", "Country": "巴西", "Sales Volume": 100, "Total Margin": 3000 },
    { "Month": "4月", "Country": "巴西", "Sales Volume": 120, "Total Margin": 3900 },
    { "Month": "4月", "Country": "英国", "Sales Volume": 80, "Total Margin": 800 },
  ];
  const schema = inferFinanceSchema(rows);
  const aligned = alignFinanceActionPlanWithQuestion(schema, [
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
  ], "4月，列出Top 5的这个国家销量来，然后还有单车边际最低的5个国家也给我。");

  assert.equal(aligned[0].type, "bar_rank");
  assert.equal(aligned[0].sort, "value_desc");
  assert.equal(aligned[1].type, "bar_rank");
  assert.equal(aligned[1].sort, "value_asc");
});

test("action plan normalization keeps unit-metric waterfall requests for attribution bridges", () => {
  const schema = inferFinanceSchema([
    { "Month": "3月", "Country": "泰国", "Model": "T1D", "Sales Volume": 100, "Total Margin": 3000 },
    { "Month": "4月", "Country": "泰国", "Model": "T1D", "Sales Volume": 120, "Total Margin": 3900 },
  ]);
  const normalized = normalizeFinanceActionPlanForQuestion(schema, {
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
  }, "泰国单车边际多少呀？然后它环比的一个成绩如何？主要是哪些车型影响的?");
  const validated = validateFinanceActionPlan(schema, normalized);

  assert.equal(normalized.modules[0].type, "waterfall_bridge");
  assert.equal(normalized.modules[0].metric, "单车边际");
  assert.equal(normalized.modules[0].dimension, "Model");
  assert.equal(normalized.modules[0].fromPeriod, "M03");
  assert.equal(normalized.modules[0].toPeriod, "M04");
  assert.deepEqual(normalized.modules[0].filters, { Country: ["泰国"] });
  assert.equal(validated.ok, true);
});

test("action plan normalization drills into explicit dimension members from the question", () => {
  const schema = inferFinanceSchema([
    { "Month": "3月", "大区": "MBT", "国家": "泰国", "车型": "T1D", "Sales Volume": 100, "Net Revenue": 9000000 },
    { "Month": "4月", "大区": "MBT", "国家": "泰国", "车型": "T1D", "Sales Volume": 120, "Net Revenue": 11000000 },
    { "Month": "3月", "大区": "MBT", "国家": "越南", "车型": "T1E", "Sales Volume": 60, "Net Revenue": 5400000 },
    { "Month": "4月", "大区": "MBT", "国家": "越南", "车型": "T1E", "Sales Volume": 55, "Net Revenue": 4950000 },
    { "Month": "4月", "大区": "欧洲", "国家": "西班牙", "车型": "T1D", "Sales Volume": 80, "Net Revenue": 7200000 },
  ]);
  const normalized = normalizeFinanceActionPlanForQuestion(schema, {
    modules: [
      {
        type: "waterfall_bridge",
        metric: "单车净收入",
        dimension: "大区",
        fromPeriod: "M03",
        toPeriod: "M04",
        limit: 10,
      },
    ],
  }, "MBT大区的销量是最重要的，我想知道MBT中的单车净收入自身怎么变化，主要由哪些国家构成？");
  const validated = validateFinanceActionPlan(schema, normalized);

  assert.equal(normalized.modules[0].type, "waterfall_bridge");
  assert.equal(normalized.modules[0].dimension, "国家");
  assert.deepEqual(normalized.modules[0].filters, { "大区": ["MBT"] });
  assert.equal(validated.ok, true);
});

test("action plan normalization resolves follow-up pronouns from prior analysis context", () => {
  const schema = inferFinanceSchema([
    { "Month": "3月", "大区": "MBT", "国家": "泰国", "车型": "T1D", "Sales Volume": 100, "Net Revenue": 9000000 },
    { "Month": "4月", "大区": "MBT", "国家": "泰国", "车型": "T1D", "Sales Volume": 120, "Net Revenue": 11000000 },
    { "Month": "3月", "大区": "MBT", "国家": "越南", "车型": "T1E", "Sales Volume": 60, "Net Revenue": 5400000 },
    { "Month": "4月", "大区": "MBT", "国家": "越南", "车型": "T1E", "Sales Volume": 55, "Net Revenue": 4950000 },
    { "Month": "4月", "大区": "欧洲", "国家": "西班牙", "车型": "T1D", "Sales Volume": 80, "Net Revenue": 7200000 },
  ]);
  const normalized = normalizeFinanceActionPlanForQuestion(schema, {
    modules: [
      {
        type: "waterfall_bridge",
        metric: "单车净收入",
        dimension: "大区",
        fromPeriod: "M03",
        toPeriod: "M04",
        limit: 10,
      },
    ],
  }, "那它自身的单车净收入怎么变化，下面由哪些国家构成？", {
    analysisContext: [{
      type: "waterfall_bridge",
      title: "M03 至 M04 销量变化桥",
      metric: "销量",
      dimension: "大区",
      focusValues: [{ dimension: "大区", value: "MBT" }],
    }],
  });
  const validated = validateFinanceActionPlan(schema, normalized);

  assert.equal(normalized.modules[0].type, "waterfall_bridge");
  assert.equal(normalized.modules[0].dimension, "国家");
  assert.deepEqual(normalized.modules[0].filters, { "大区": ["MBT"] });
  assert.equal(validated.ok, true);
});

test("action plan normalization fills attribution dimension for reason follow-ups", () => {
  const schema = inferFinanceSchema([
    { "Month": "3月", "国家": "西班牙", "车型": "T1D", "Sales Volume": 100, "Total Margin": 3000 },
    { "Month": "4月", "国家": "西班牙", "车型": "T1D", "Sales Volume": 80, "Total Margin": 1200 },
    { "Month": "3月", "国家": "西班牙", "车型": "T1E", "Sales Volume": 50, "Total Margin": 2500 },
    { "Month": "4月", "国家": "西班牙", "车型": "T1E", "Sales Volume": 70, "Total Margin": 2100 },
  ]);
  const normalized = normalizeFinanceActionPlanForQuestion(schema, {
    modules: [
      {
        type: "waterfall_bridge",
        metric: "单车边际",
        fromPeriod: "M03",
        toPeriod: "M04",
        limit: 10,
      },
    ],
  }, "为啥下降这么多呢？", {
    analysisContext: [{
      type: "metric_snapshot",
      title: "M04 西班牙单车边际",
      metric: "单车边际",
      period: "M04",
      filters: { "国家": ["西班牙"] },
      focusValues: [{ dimension: "国家", value: "西班牙" }],
    }],
  });
  const validated = validateFinanceActionPlan(schema, normalized);

  assert.equal(normalized.modules[0].type, "waterfall_bridge");
  assert.equal(normalized.modules[0].dimension, "车型");
  assert.deepEqual(normalized.modules[0].filters, { "国家": ["西班牙"] });
  assert.equal(validated.ok, true);
});

test("action plan normalization infers periods for reason follow-ups from the last snapshot", () => {
  const schema = inferFinanceSchema([
    { "Month": "3月", "国家": "西班牙", "车型": "T1D", "Sales Volume": 100, "Total Margin": 3000 },
    { "Month": "4月", "国家": "西班牙", "车型": "T1D", "Sales Volume": 80, "Total Margin": 1200 },
    { "Month": "3月", "国家": "西班牙", "车型": "T1E", "Sales Volume": 50, "Total Margin": 2500 },
    { "Month": "4月", "国家": "西班牙", "车型": "T1E", "Sales Volume": 70, "Total Margin": 2100 },
  ]);
  const normalized = normalizeFinanceActionPlanForQuestion(schema, {
    modules: [
      {
        type: "waterfall_bridge",
        metric: "单车边际",
      },
    ],
  }, "为啥下降这么多呢？", {
    analysisContext: [{
      type: "metric_snapshot",
      title: "M04 西班牙单车边际",
      metric: "单车边际",
      period: "M04",
      filters: { "国家": ["西班牙"] },
      focusValues: [{ dimension: "国家", value: "西班牙" }],
    }],
  });
  const validated = validateFinanceActionPlan(schema, normalized);

  assert.equal(normalized.modules[0].type, "waterfall_bridge");
  assert.equal(normalized.modules[0].fromPeriod, "M03");
  assert.equal(normalized.modules[0].toPeriod, "M04");
  assert.equal(normalized.modules[0].dimension, "车型");
  assert.deepEqual(normalized.modules[0].filters, { "国家": ["西班牙"] });
  assert.equal(validated.ok, true);
});

test("chart specs are compact and identify supported chart types", () => {
  const schema = inferFinanceSchema(metricRows);
  const trend = buildTrendSeries(metricRows, schema, { metric: "单车边际", filters: { "国家": ["巴西"] }, highlightPeriod: "2026-03" });
  const spec = buildChartSpec({ type: "trend_chart", title: "巴西单车边际趋势", result: trend });

  assert.equal(spec.kind, "trend_chart");
  assert.equal(spec.size, "large");
  assert.equal(spec.title, "巴西单车边际趋势");
  assert.equal(spec.data.length >= 1, true);
  assert.equal(spec.layout.paper_bgcolor, "rgba(0,0,0,0)");
  assert.equal(spec.layout.plot_bgcolor, "rgba(0,0,0,0)");
  assert.equal(spec.data[0].mode, "lines+markers+text");
  assert.deepEqual(spec.data[0].text, ["35.00", "20.00", "35.00"]);
  assert.equal(spec.data[0].textposition, "top center");
  assert.equal(spec.data[0].cliponaxis, false);
  assert.equal(Array.isArray(spec.layout.yaxis.range), true);
  assert.notEqual(spec.layout.yaxis.range[0], 0);
  assert.equal(spec.layout.yaxis.fixedrange, true);
  assert.equal(spec.config.displayModeBar, false);
  assert.equal(typeof spec.note, "string");
});

test("metric snapshot chart spec renders as a compact KPI card", () => {
  const schema = inferFinanceSchema(metricRows);
  const snapshot = buildMetricSnapshot(metricRows, schema, {
    metric: "单车边际",
    period: "2026-03",
    filters: { "国家": ["巴西"] },
    comparisons: ["mom", "yoy"],
  });
  const spec = buildChartSpec({ type: "metric_snapshot", title: "2026-03 巴西单车边际", result: snapshot });

  assert.equal(spec.kind, "metric_card");
  assert.equal(spec.size, "small");
  assert.equal(spec.data[0].type, "indicator");
  assert.equal(spec.data[0].value, 35);
  assert.equal(spec.data[0].number.suffix, "");
  assert.equal(spec.data[0].delta.suffix, "");
  assert.equal(spec.layout.height, 104);
  assert.equal(spec.config.displayModeBar, false);
});

test("metric card chart uses Chinese units for value and absolute delta", () => {
  const spec = buildDirectChartSpec({
    type: "metric_card",
    title: "M04 边际总额",
    value: 13999900000,
    subtitle: "环比 +17.8%",
    deltaValue: 2112040548.34,
  });

  assert.equal(spec.size, "small");
  assert.equal(spec.data[0].value, 139.999);
  assert.equal(spec.data[0].number.suffix, "亿");
  assert.equal(spec.data[0].delta.reference, 118.8785945166);
  assert.equal(spec.data[0].delta.suffix, "亿");
});

test("waterfall chart uses compact Chinese magnitude units without assuming currency", () => {
  const spec = buildDirectChartSpec({
    type: "waterfall",
    title: "M03 至 M04 净收入总额变化桥",
    startLabel: "M03",
    startValue: 11887855118.59,
    endLabel: "M04",
    endValue: 13999895666.93,
    items: [
      { label: "巴西", value: 1726912254 },
      { label: "西班牙", value: -476067579 },
      { label: "澳大利亚", value: 536122289 },
    ],
  });

  approx(spec.data[0].y[0], 118.8785511859, "waterfall start value is scaled to yi");
  assert.equal(spec.data[0].text[0], "118.88亿");
  assert.deepEqual(spec.data[0].text.slice(1, 4), ["-4.76亿", "+17.27亿", "+5.36亿"]);
  assert.equal(spec.layout.yaxis.ticksuffix, "亿");
  assert.doesNotMatch(spec.data[0].text.join(" "), /11887855118|1,188,785,511|B/);
});

test("bar rank chart spec uses horizontal bars without a separate numeric table", () => {
  const schema = inferFinanceSchema(metricRows);
  const rank = buildBarRank(metricRows, schema, {
    metric: "边际",
    dimension: "国家",
    period: "2026-03",
  });
  const spec = buildChartSpec({ type: "bar_rank", title: "国家边际排名", result: rank });

  assert.equal(spec.kind, "bar_rank");
  assert.equal(spec.size, "medium");
  assert.equal(spec.data[0].type, "bar");
  assert.equal(spec.data[0].orientation, "h");
  assert.ok(Array.isArray(spec.data[0].text));
  assert.match(spec.data[0].text.at(-1), /76\.1%/);
  assert.equal(spec.data[0].textposition, "outside");
  assert.equal(spec.data[0].cliponaxis, false);
  assert.equal(spec.layout.xaxis.fixedrange, true);
  assert.equal("table" in spec, false);
  assert.equal(spec.config.displayModeBar, false);
});

test("change-ranked bar chart plots mom change values instead of current values", () => {
  const rankRows = [
    { "月份": "2026-02", "国家": "巴西", "销量": 10, "边际": 200 },
    { "月份": "2026-02", "国家": "智利", "销量": 10, "边际": 500 },
    { "月份": "2026-03", "国家": "巴西", "销量": 10, "边际": 350 },
    { "月份": "2026-03", "国家": "墨西哥", "销量": 10, "边际": 100 },
  ];
  const schema = inferFinanceSchema(rankRows);
  const rank = buildBarRank(rankRows, schema, {
    metric: "边际",
    dimension: "国家",
    period: "2026-03",
    comparison: "mom",
    sort: "change_asc",
    limit: 10,
  });
  const spec = buildChartSpec({ type: "bar_rank", title: "国家边际下降排名", result: rank });

  assert.deepEqual(spec.data[0].y, ["巴西", "墨西哥", "智利"]);
  assert.deepEqual(spec.data[0].x, [150, 100, -500]);
  assert.match(spec.data[0].text.at(-1), /环比 -500/);
  assert.match(spec.data[0].text.at(-1), /当前值 0/);
  assert.doesNotMatch(spec.data[0].text.join(" "), /元|美元|欧元|人民币/);
  assert.deepEqual(spec.layout.xaxis.range, [-604, 254]);
});

test("waterfall chart spec renders a continuous bridge for total-metric results", () => {
  const schema = inferFinanceSchema(metricRows);
  const bridge = buildWaterfallBridge(metricRows, schema, {
    metric: "边际",
    dimension: "国家",
    fromPeriod: "2026-02",
    toPeriod: "2026-03",
  });
  const spec = buildChartSpec({ type: "waterfall_bridge", title: "边际变化拆解", result: bridge });

  assert.equal(spec.kind, "waterfall_bridge");
  assert.equal(spec.size, "large");
  assert.equal(spec.data[0].type, "waterfall");
  assert.deepEqual(spec.data[0].measure, ["absolute", "relative", "relative", "total"]);
  assert.deepEqual(spec.data[0].y, [2400, 1100, 1100, 0]);
  assert.deepEqual(spec.data[0].text, ["2,400", "+1,100", "+1,100", "4,600"]);
  assert.equal(spec.data[0].textposition, "outside");
  assert.equal(spec.data[0].cliponaxis, false);
  assert.equal(Array.isArray(spec.layout.yaxis.range), true);
  assert.equal(spec.layout.yaxis.fixedrange, true);
  assert.equal(spec.config.displayModeBar, false);
});

test("waterfall chart spec uses uploaded period labels instead of internal period keys", () => {
  const rowsWithChineseMonthLabels = [
    { "Month": "三月", "Country": "西班牙", "Sales Volume": 100, "Total Margin": 3000 },
    { "Month": "四月", "Country": "西班牙", "Sales Volume": 80, "Total Margin": 1200 },
  ];
  const schema = inferFinanceSchema(rowsWithChineseMonthLabels);
  const bridge = buildWaterfallBridge(rowsWithChineseMonthLabels, schema, {
    metric: "Total Margin",
    dimension: "Country",
    fromPeriod: "M03",
    toPeriod: "M04",
  });
  const spec = buildChartSpec({ type: "waterfall_bridge", title: "边际变化拆解", result: bridge });

  assert.deepEqual(spec.data[0].x, ["三月", "西班牙", "四月"]);
});

test("waterfall chart spec labels unit-metric bridges as mix and rate attribution", () => {
  const schema = inferFinanceSchema(metricRows);
  const bridge = buildWaterfallBridge(metricRows, schema, {
    metric: "单车边际",
    dimension: "国家",
    fromPeriod: "2026-02",
    toPeriod: "2026-03",
  });
  const spec = buildChartSpec({ type: "waterfall_bridge", title: "单车边际变化拆解", result: bridge });

  assert.equal(spec.kind, "waterfall_bridge");
  assert.equal(spec.size, "large");
  assert.equal(spec.data[0].type, "waterfall");
  assert.match(spec.note, /结构效应/);
  assert.match(spec.note, /费率效应/);
  assert.doesNotMatch(spec.note, /仅用于可加总指标/);
  assert.ok(Array.isArray(spec.data[0].customdata));
  assert.match(spec.data[0].hovertemplate, /结构效应/);
});

test("finance AI chart demo specs cover every supported chart style", () => {
  const specs = buildFinanceAIChartDemoSpecs();
  const kinds = new Set(specs.map((spec) => spec.kind));

  assert.equal(specs.length, 11);
  assert.deepEqual([...kinds].sort(), [
    "bar_rank",
    "detail_table",
    "grouped_bar",
    "heatmap",
    "metric_card",
    "percent_stacked_bar",
    "scatter_bubble",
    "stacked_bar",
    "trend_chart",
    "waterfall_bridge",
  ]);
  assert.equal(specs.filter((spec) => spec.kind === "waterfall_bridge").length, 2);
  assert.equal(specs.every((spec) => spec.config.displayModeBar === false), true);
  assert.equal(specs.every((spec) => spec.data.length > 0), true);
  assert.equal(specs.every((spec) => typeof spec.note === "string" && spec.note.length > 0), true);
});

test("direct AI chart payloads render through the supported chart specs", () => {
  const trendSpec = buildDirectChartSpec({
    type: "trend",
    title: "巴西单车边际趋势",
    points: [
      { label: "3月", value: 30 },
      { label: "4月", value: 32.5 },
    ],
  });
  const rankSpec = buildDirectChartSpec({
    type: "bar_rank",
    title: "国家边际排名",
    items: [
      { label: "巴西", value: 3900, share: 0.7, changeValue: 900 },
      { label: "墨西哥", value: 1650, share: 0.3, changeValue: -150 },
    ],
  });
  const waterfallSpec = buildDirectChartSpec({
    type: "waterfall",
    title: "边际变化桥",
    startLabel: "3月",
    startValue: 4800,
    endLabel: "4月",
    endValue: 5550,
    items: [
      { label: "巴西", value: 900 },
      { label: "墨西哥", value: -150 },
    ],
  });

  assert.equal(trendSpec.kind, "trend_chart");
  assert.deepEqual(trendSpec.data[0].text, ["30.00", "32.50"]);
  assert.equal(Array.isArray(trendSpec.layout.yaxis.range), true);
  assert.equal(rankSpec.kind, "bar_rank");
  assert.equal(rankSpec.data[0].orientation, "h");
  assert.match(rankSpec.data[0].text.at(-1), /70\.0%/);
  assert.equal(rankSpec.layout.xaxis.fixedrange, true);
  assert.equal(waterfallSpec.kind, "waterfall_bridge");
  assert.deepEqual(waterfallSpec.data[0].measure, ["absolute", "relative", "relative", "total"]);
  assert.deepEqual(waterfallSpec.data[0].y, [4800, -150, 900, 0]);
  assert.deepEqual(waterfallSpec.data[0].text, ["4,800", "-150", "+900", "5,550"]);
  assert.equal(waterfallSpec.config.displayModeBar, false);
});

test("direct waterfall chart reconciles incomplete items and uses readable delta units", () => {
  const spec = buildDirectChartSpec({
    type: "waterfall",
    title: "单车净收入变化桥",
    startLabel: "M03",
    startValue: 98700,
    endLabel: "M04",
    endValue: 97900,
    items: [
      { label: "T1E", value: -1100 },
      { label: "M1A", value: 400 },
    ],
  });

  assert.equal(spec.kind, "waterfall_bridge");
  assert.deepEqual(spec.data[0].x, ["M03", "T1E", "未拆分差额", "M1A", "M04"]);
  assert.deepEqual(spec.data[0].measure, ["absolute", "relative", "relative", "relative", "total"]);
  assert.deepEqual(spec.data[0].y, [9.87, -0.11, -0.01, 0.04, 0]);
  assert.deepEqual(spec.data[0].text, ["9.87万", "-1,100", "-100", "+400", "9.79万"]);
});

test("waterfall axis keeps positive start and end bars visibly anchored", () => {
  const spec = buildDirectChartSpec({
    type: "waterfall",
    title: "销量变化桥",
    startLabel: "M03",
    startValue: 120500,
    endLabel: "M04",
    endValue: 143000,
    items: [
      { label: "中东大区", value: -3519 },
      { label: "埃及大区", value: -1716 },
      { label: "拉美地区部", value: -264 },
      { label: "KM地区部", value: -230 },
      { label: "MBT大区", value: 16200 },
      { label: "右舵地区部", value: 10300 },
      { label: "东欧/亚太大区", value: 867 },
      { label: "斯坦王国", value: 420 },
      { label: "欧盟地区部", value: 258 },
      { label: "非洲大区", value: 192 },
      { label: "其他", value: -8 },
    ],
  });
  const range = spec.layout.yaxis.range;
  const startValue = spec.data[0].y[0];
  const visibleShare = (startValue - range[0]) / (range[1] - range[0]);

  assert.equal(Array.isArray(range), true);
  assert.equal(range[0] > 0, true);
  assert.equal(visibleShare >= 0.3, true);
});

test("direct AI chart payloads support the approved expanded chart set", () => {
  const metricSpec = buildDirectChartSpec({
    type: "metric_card",
    title: "4月泰国单车边际",
    value: 32.5,
    subtitle: "环比 +9.1%",
  });
  const groupedSpec = buildDirectChartSpec({
    type: "grouped_bar",
    title: "车型单车边际对比",
    series: [
      { name: "3月", items: [{ label: "T1D", value: 29.8 }, { label: "T1E", value: 24.1 }] },
      { name: "4月", items: [{ label: "T1D", value: 33.1 }, { label: "T1E", value: 23.3 }] },
    ],
  });
  const stackedSpec = buildDirectChartSpec({
    type: "percent_stacked_bar",
    title: "车型销量占比",
    series: [
      { name: "T1D", items: [{ label: "泰国", value: 0.33 }, { label: "巴西", value: 0.32 }] },
      { name: "T1E", items: [{ label: "泰国", value: 0.67 }, { label: "巴西", value: 0.68 }] },
    ],
  });
  const heatmapSpec = buildDirectChartSpec({
    type: "heatmap",
    title: "国家车型单车边际",
    xLabels: ["T1D", "T1E"],
    yLabels: ["泰国", "巴西"],
    values: [[33.1, null], [31.2, 26.8]],
  });
  const bubbleSpec = buildDirectChartSpec({
    type: "scatter_bubble",
    title: "国家经营定位",
    xLabel: "销量",
    yLabel: "单车边际",
    items: [{ label: "泰国", x: 12450, y: 32.5, size: 22 }],
  });
  const tableSpec = buildDirectChartSpec({
    type: "detail_table",
    title: "低单车边际明细",
    columns: ["国家", "销量", "单车边际"],
    rows: [["英国", 13665, 24.6]],
  });
  const moneyTableSpec = buildDirectChartSpec({
    type: "detail_table",
    title: "4月大区净收入总额明细",
    columns: ["大区", "净收入总额", "占比", "环比变化"],
    rows: [["右舵地区部", 4817036664.26, 0.344, 1172553980.38]],
  });
  const zeroMoneyTableSpec = buildDirectChartSpec({
    type: "detail_table",
    title: "4月大区净收入总额明细",
    columns: ["大区", "净收入总额"],
    rows: [["右舵地区部", 4817036664.26], ["国际合作中心", 0]],
  });
  const rankTableSpec = buildDirectChartSpec({
    type: "detail_table",
    title: "M04 国家净收入总额排名完整明细",
    columns: ["排名", "国家", "净收入总额", "占比", "环比变化"],
    rows: [[1, "西班牙", 840977230.49, 0.0601, -476067578.85]],
  });

  assert.equal(metricSpec.kind, "metric_card");
  assert.equal(metricSpec.size, "small");
  assert.equal(groupedSpec.kind, "grouped_bar");
  assert.equal(groupedSpec.size, "medium");
  assert.equal(groupedSpec.layout.barmode, "group");
  assert.equal(stackedSpec.kind, "percent_stacked_bar");
  assert.equal(stackedSpec.size, "medium");
  assert.equal(stackedSpec.layout.barmode, "stack");
  assert.equal(heatmapSpec.kind, "heatmap");
  assert.equal(heatmapSpec.size, "large");
  assert.equal(heatmapSpec.data[0].type, "heatmap");
  assert.equal(heatmapSpec.data[0].z[0][1], null);
  assert.equal(heatmapSpec.data[0].text[0][1], "-");
  assert.equal(bubbleSpec.kind, "scatter_bubble");
  assert.equal(bubbleSpec.size, "large");
  assert.equal(bubbleSpec.data[0].mode, "markers+text");
  assert.equal(tableSpec.kind, "detail_table");
  assert.equal(tableSpec.size, "large");
  assert.equal(tableSpec.data[0].type, "table");
  assert.deepEqual(moneyTableSpec.data[0].cells.values, [
    ["右舵地区部"],
    ["48.17亿"],
    ["34.4%"],
    ["11.73亿"],
  ]);
  assert.deepEqual(zeroMoneyTableSpec.data[0].cells.values, [
    ["右舵地区部", "国际合作中心"],
    ["48.17亿", "0.00亿"],
  ]);
  assert.deepEqual(rankTableSpec.data[0].cells.values, [
    ["1"],
    ["西班牙"],
    ["8.41亿"],
    ["6.0%"],
    ["-4.76亿"],
  ]);
});

test("scatter bubble chart normalizes large size metrics instead of clamping every marker", () => {
  const spec = buildDirectChartSpec({
    type: "scatter_bubble",
    title: "国家经营定位",
    xLabel: "销量",
    yLabel: "单车净收入",
    items: [
      { label: "A", x: 100, y: 10, size: 1_000_000_000 },
      { label: "B", x: 120, y: 11, size: 2_500_000_000 },
      { label: "C", x: 140, y: 12, size: 6_000_000_000 },
    ],
  });
  const sizes = spec.data[0].marker.size;

  assert.equal(new Set(sizes).size, 3);
  assert.ok(sizes[0] < sizes[1]);
  assert.ok(sizes[1] < sizes[2]);
  assert.ok(Math.min(...sizes) >= 12);
  assert.ok(Math.max(...sizes) <= 48);
});
