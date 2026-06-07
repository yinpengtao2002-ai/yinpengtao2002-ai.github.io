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
import { validateFinanceActionPlan } from "../src/lib/finance-ai/actions.ts";
import { buildChartSpec } from "../src/lib/finance-ai/charts.ts";

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
  assert.deepEqual(normalizePeriodValue("2025-03"), { key: "2025-03", label: "2025年3月", sort: 24303 });
  assert.deepEqual(normalizePeriodValue("2025年4月"), { key: "2025-04", label: "2025年4月", sort: 24304 });
  assert.deepEqual(normalizePeriodValue("202505"), { key: "2025-05", label: "2025年5月", sort: 24305 });
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
  assert.deepEqual(normalizePeriodValue("2025/03"), { key: "2025-03", label: "2025年3月", sort: 24303 });
  assert.deepEqual(normalizePeriodValue("2025.03"), { key: "2025-03", label: "2025年3月", sort: 24303 });
  assert.deepEqual(normalizePeriodValue("2025-03-01"), { key: "2025-03", label: "2025年3月", sort: 24303 });
});

test("finance AI schema supports yearless month labels from margin templates", () => {
  const templateRows = [
    { "Month": "4月", "Dim_A": "非洲大区", "Dim_B": "摩洛哥", "Sales Volume": 2, "Total Margin": 426871.6248 },
    { "Month": "3月", "Dim_A": "非洲大区", "Dim_B": "摩洛哥", "Sales Volume": 3, "Total Margin": 300000 },
  ];
  const schema = inferFinanceSchema(templateRows);

  assert.equal(schema.monthColumn, "Month");
  assert.equal(schema.salesColumn, "Sales Volume");
  assert.deepEqual(schema.profile.periods.map((period) => period.key), ["M03", "M04"]);
  assert.deepEqual(schema.profile.periods.map((period) => period.label), ["3月", "4月"]);
  assert.deepEqual(schema.totalMetrics.map((metric) => metric.name), ["Sales Volume", "Total Margin"]);

  const snapshot = buildMetricSnapshot(templateRows, schema, {
    metric: "Sales Volume",
    period: "4月",
    comparisons: ["mom"],
  });
  assert.equal(snapshot.value, 2);
  assert.equal(snapshot.mom?.value, 3);
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

test("waterfall bridge rejects unit metrics because v1 only supports additive totals", () => {
  const schema = inferFinanceSchema(metricRows);

  assert.throws(
    () => buildWaterfallBridge(metricRows, schema, {
      metric: "单车边际",
      dimension: "国家",
      fromPeriod: "2026-02",
      toPeriod: "2026-03",
    }),
    /Waterfall bridge only supports total metrics/,
  );
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

test("action validator rejects unit-metric waterfall plans before metric execution", () => {
  const schema = inferFinanceSchema(metricRows);
  const invalid = validateFinanceActionPlan(schema, {
    modules: [
      { type: "waterfall_bridge", metric: "单车边际", dimension: "国家", fromPeriod: "2026-02", toPeriod: "2026-03" },
    ],
  });

  assert.equal(invalid.ok, false);
  assert.match(invalid.errors.join("\n"), /瀑布桥暂只支持可加总指标/);
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

test("action validator rejects invalid rank options and caps oversized limits", () => {
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
  assert.equal("comparison" in invalid.modules[0], false);
  assert.equal("sort" in invalid.modules[0], false);
  assert.match(invalid.errors.join("\n"), /排名对比只支持环比/);
  assert.match(invalid.errors.join("\n"), /排序方式不支持/);
  assert.match(invalid.errors.join("\n"), /排名数量最多 10 项/);
  assert.match(invalid.errors.join("\n"), /变化排序需要同时指定环比对比和期间/);
});

test("chart specs are compact and identify supported chart types", () => {
  const schema = inferFinanceSchema(metricRows);
  const trend = buildTrendSeries(metricRows, schema, { metric: "单车边际", filters: { "国家": ["巴西"] }, highlightPeriod: "2026-03" });
  const spec = buildChartSpec({ type: "trend_chart", title: "巴西单车边际趋势", result: trend });

  assert.equal(spec.kind, "trend_chart");
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

test("bar rank chart spec uses horizontal bars without a separate numeric table", () => {
  const schema = inferFinanceSchema(metricRows);
  const rank = buildBarRank(metricRows, schema, {
    metric: "边际",
    dimension: "国家",
    period: "2026-03",
  });
  const spec = buildChartSpec({ type: "bar_rank", title: "国家边际排名", result: rank });

  assert.equal(spec.kind, "bar_rank");
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

test("waterfall chart spec uses Plotly waterfall for total-metric bridge results", () => {
  const schema = inferFinanceSchema(metricRows);
  const bridge = buildWaterfallBridge(metricRows, schema, {
    metric: "边际",
    dimension: "国家",
    fromPeriod: "2026-02",
    toPeriod: "2026-03",
  });
  const spec = buildChartSpec({ type: "waterfall_bridge", title: "边际变化拆解", result: bridge });

  assert.equal(spec.kind, "waterfall_bridge");
  assert.equal(spec.data[0].type, "waterfall");
  assert.deepEqual(spec.data[0].measure, ["absolute", "relative", "relative", "total"]);
  assert.deepEqual(spec.data[0].text, ["2,400", "+1,100", "+1,100", "4,600"]);
  assert.equal(spec.data[0].textposition, "outside");
  assert.equal(spec.data[0].cliponaxis, false);
  assert.equal(Array.isArray(spec.layout.yaxis.range), true);
  assert.equal(spec.layout.yaxis.fixedrange, true);
  assert.equal(spec.config.displayModeBar, false);
});
