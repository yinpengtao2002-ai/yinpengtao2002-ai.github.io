import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const profitStructure = await import("../src/app/finance/profit-structure/profit-structure-engine.js");
const registry = JSON.parse(
  await readFile(new URL("../src/lib/finance/model-registry.json", import.meta.url), "utf8")
);

const {
  TEMPLATE_HEADERS,
  normalizeUploadedRows,
  summarizeProfitStructure,
  buildDimensionOptions,
  buildSummaryCards,
  buildStructureBlueprints,
  buildDimensionDiagnostics,
  buildQualityMapItems,
  buildDragContributionItems,
  defaultDimensionPath,
  createSampleRows,
} = profitStructure.default;

test("profit structure model is registered as a profit quality diagnostic model", () => {
  const model = registry.models.find((item) => item.slug === "profit-structure");

  assert.ok(model, "profit-structure should be present in the finance model registry");
  assert.equal(model.title, "多维利润质量诊断模型");
  assert.equal(model.href, "/finance/profit-structure");
  assert.equal("categoryId" in model, false);
  assert.match(model.summary, /拖累|质量|先看哪个维度/);
  assert.match(model.aiGuide.purpose, /利润质量|拖累|优先下钻/);
  assert.doesNotMatch(model.title, /车型|产品/);
  assert.doesNotMatch(model.summary, /默认车型/);
  assert.doesNotMatch(JSON.stringify(model.aiGuide), /结构关系|维度路径流向|Sankey|候选图表|明细表/);
});

test("template keeps the shared month-dimension-volume-metric shape", () => {
  assert.deepEqual(
    TEMPLATE_HEADERS,
    ["月份", "数据口径", "大区", "国家", "品牌", "品牌市场", "经营模式", "业务单元", "车型", "燃油品类", "备注", "销量", "净收入", "成本", "边际"]
  );
});

test("profit structure keeps scenario as a selectable dimension and ignores remark metadata", () => {
  const { rows, schema } = normalizeUploadedRows([
    {
      月份: "2026-01",
      数据口径: "实际",
      大区: "欧洲",
      国家: "德国",
      备注: "只填实际，用于趋势和利润质量诊断",
      销量: 100,
      净收入: 1000,
      边际: 300,
    },
  ]);

  assert.deepEqual(schema.dimensions, ["数据口径", "大区", "国家"]);
  assert.ok(!schema.dimensions.includes("备注"));
  assert.equal(rows[0].dimensionValues.数据口径, "实际");
  assert.equal(rows[0].raw.备注, "只填实际，用于趋势和利润质量诊断");
});

test("sample data keeps countries in one region while brands cross most countries", () => {
  const sampleRows = createSampleRows();
  const countryRegions = new Map();
  const countryBrands = new Map();
  const brandCountries = new Map();
  const modelFuels = new Map();

  for (const row of sampleRows) {
    const currentRegion = countryRegions.get(row.国家);
    assert.ok(!currentRegion || currentRegion === row.大区, `${row.国家} should not move across regions`);
    countryRegions.set(row.国家, row.大区);

    if (!countryBrands.has(row.国家)) countryBrands.set(row.国家, new Set());
    countryBrands.get(row.国家).add(row.品牌);

    if (!brandCountries.has(row.品牌)) brandCountries.set(row.品牌, new Set());
    brandCountries.get(row.品牌).add(row.国家);

    if (!modelFuels.has(row.车型)) modelFuels.set(row.车型, new Set());
    modelFuels.get(row.车型).add(row.燃油品类);
  }

  assert.ok(countryRegions.size >= 8, "sample should include enough countries to make the flow meaningful");
  assert.ok([...countryBrands.values()].every((brands) => brands.size >= 3), "each country should carry several brands");
  assert.ok([...brandCountries.values()].every((countries) => countries.size >= 6), "each brand should appear across most countries");
  assert.ok([...modelFuels.values()].some((fuels) => fuels.size >= 2), "at least one model should map to multiple fuel categories");
});

test("default dimension path starts with the stable geography tree and then crosses into brand", () => {
  const { schema } = normalizeUploadedRows(createSampleRows());

  assert.deepEqual(defaultDimensionPath(schema), ["大区", "国家", "品牌", "车型", "燃油品类"]);
});

test("uploaded rows infer dimensions and metrics from headers and sample types", () => {
  const { rows, schema } = normalizeUploadedRows([
    {
      月份: "2026-01",
      大区: "欧洲",
      国家: "德国",
      渠道: "经销",
      客户: "客户A",
      销量: 100,
      GMV: 1000,
      服务成本: -760,
      NPS: 8.5,
    },
  ]);

  assert.deepEqual(schema.dimensions, ["大区", "国家", "渠道", "客户"]);
  assert.deepEqual(schema.metricColumns, ["GMV", "服务成本", "NPS"]);
  assert.deepEqual(buildDimensionOptions(schema), ["大区", "国家", "渠道", "客户"]);
  assert.deepEqual(rows[0].metrics, { GMV: 1000, 服务成本: -760, NPS: 8.5 });
  assert.equal("margin" in rows[0], false);
  assert.equal("marginRate" in rows[0], false);
  assert.equal(rows[0].dimensionValues.客户, "客户A");
});

test("field inference keeps a text dimension after volume and a numeric metric before volume", () => {
  const { rows, schema } = normalizeUploadedRows([
    { 月份: "2026-01", 净收入: 1000, 销量: 100, 渠道: "经销", 边际: 200 },
    { 月份: "2026-02", 净收入: 1200, 销量: 120, 渠道: "直营", 边际: 300 },
  ]);

  assert.deepEqual(schema.dimensions, ["渠道"]);
  assert.deepEqual(schema.metricColumns, ["净收入", "边际"]);
  assert.equal(rows[0].dimensionValues.渠道, "经销");
  assert.deepEqual(rows[0].metrics, { 净收入: 1000, 边际: 200 });
});

test("ambiguous empty fields are reported instead of silently classified", () => {
  const { schema } = normalizeUploadedRows([
    { 月份: "2026-01", 大区: "欧洲", 待确认字段: "", 销量: 100, 边际: 20 },
    { 月份: "2026-02", 大区: "欧洲", 待确认字段: "", 销量: 120, 边际: 30 },
  ]);
  assert.deepEqual(schema.ambiguousColumns, ["待确认字段"]);
});

test("profit structure validates numeric cells and applies Chinese unit scales", () => {
  const { rows, schema } = normalizeUploadedRows([
    { 月份: "2026-01", 大区: "欧洲", 销量: 100, 净收入: "1.2亿", 边际: "500万" },
    { 月份: "2026-02", 大区: "欧洲", 销量: "#VALUE!", 净收入: 100, 边际: "" },
  ]);
  assert.equal(rows[0].metrics.净收入, 120_000_000);
  assert.equal(rows[0].metrics.边际, 5_000_000);
  assert.deepEqual(schema.dataIssues.map((issue) => ({ row: issue.row, column: issue.column, status: issue.status })), [
    { row: 3, column: "销量", status: "invalid" },
    { row: 3, column: "边际", status: "blank" },
  ]);
});

test("profit structure recomputes known ratios and does not sum NPS", () => {
  const { rows, schema } = normalizeUploadedRows([
    { 月份: "2026-01", 大区: "欧洲", 销量: 100, 净收入: 100, 边际: 20, 边际率: 0.2, NPS: 8 },
    { 月份: "2026-02", 大区: "欧洲", 销量: 300, 净收入: 300, 边际: 90, 边际率: 0.3, NPS: 6 },
  ]);
  const summary = summarizeProfitStructure(rows, schema, { dimensions: ["大区"] });

  assert.deepEqual(schema.metricAggregations.边际率, {
    mode: "ratio",
    numeratorColumn: "边际",
    denominatorColumn: "净收入",
  });
  assert.deepEqual(schema.metricAggregations.NPS, {
    mode: "non_aggregatable",
    reason: "rate_requires_source_counts",
  });
  assert.equal(summary.totals.metrics.边际率, 0.275);
  assert.equal(summary.totals.metrics.NPS, null);
  assert.match(summary.aggregationWarnings.join(" "), /NPS/);
  const npsCard = buildSummaryCards(summary, schema).find((card) => card.label === "NPS");
  assert.deepEqual(npsCard, { label: "NPS", value: "—", note: "缺少重算所需的底层计数，不提供伪合计" });
});

test("snapshot metrics use the latest period value", () => {
  const { rows, schema } = normalizeUploadedRows([
    { 月份: "2026-01", 大区: "欧洲", 销量: 100, 期末库存: 50 },
    { 月份: "2026-02", 大区: "欧洲", 销量: 100, 期末库存: 40 },
  ]);
  const summary = summarizeProfitStructure(rows, schema, { dimensions: ["大区"] });
  assert.equal(schema.metricAggregations.期末库存.mode, "snapshot");
  assert.equal(summary.totals.metrics.期末库存, 40);
});

test("summarizes uploaded metrics by selected dimensions and computes quality gap", () => {
  const { rows, schema } = normalizeUploadedRows([
    { 月份: "2026-01", 大区: "欧洲", 国家: "德国", 车型: "A", 销量: 100, 净收入: 1000, 成本: -700, 边际: 300 },
    { 月份: "2026-01", 大区: "欧洲", 国家: "法国", 车型: "A", 销量: 20, 净收入: 220, 成本: -120, 边际: 100 },
    { 月份: "2026-01", 大区: "拉美", 国家: "墨西哥", 车型: "B", 销量: 180, 净收入: 1440, 成本: -1380, 边际: 60 },
    { 月份: "2026-01", 大区: "拉美", 国家: "巴西", 车型: "C", 销量: 70, 净收入: 420, 成本: -520, 边际: -100 },
  ]);

  const byRegion = summarizeProfitStructure(rows, schema, { dimensions: ["大区"] });
  assert.equal(byRegion.items.length, 2);
  assert.equal(byRegion.items[0].name, "欧洲");
  assert.equal(byRegion.items[1].name, "拉美");
  assert.equal(byRegion.totals.metrics.净收入, 3080);
  assert.equal(byRegion.totals.metrics.成本, -2720);
  assert.equal(byRegion.totals.metrics.边际, 360);
  assert.equal(byRegion.totals.unitMetrics.边际, 360 / 370);
  assert.equal("边际率" in byRegion.totals.metrics, false);
  assert.equal("layerSummary" in byRegion, false);
  assert.ok(byRegion.items.every((item) => !("classification" in item)));

  const byCountryModel = summarizeProfitStructure(rows, schema, { dimensions: ["国家", "车型"] });
  assert.deepEqual(
    byCountryModel.items.map((item) => item.name),
    ["德国 / A", "法国 / A", "墨西哥 / B", "巴西 / C"]
  );
  assert.deepEqual(byCountryModel.selectedDimensions, ["国家", "车型"]);
  const brazil = byCountryModel.items.find((item) => item.name === "巴西 / C");
  assert.ok(brazil);
  assert.equal(brazil.qualityGap, brazil.primaryUnitValue - byCountryModel.totals.unitMetrics.边际);
  assert.equal(brazil.dragContribution, brazil.volume * brazil.qualityGap);
});

test("quality positioning uses scale, unit quality and drag labels instead of vehicle-specific labels", () => {
  const { rows, schema } = normalizeUploadedRows([
    { 月份: "2026-01", 大区: "欧洲", 国家: "德国", 销量: 100, 净收入: 1000, 成本: -700, 边际: 300 },
    { 月份: "2026-01", 大区: "拉美", 国家: "巴西", 销量: 70, 净收入: 420, 成本: -520, 边际: -100 },
  ]);
  const summary = summarizeProfitStructure(rows, schema, { dimensions: ["大区"] });

  assert.equal(summary.analysis.primaryMetric, "边际");
  assert.equal(summary.analysis.secondaryMetric, "净收入");
  assert.equal(summary.analysis.quality.xTitle, "销量占比");
  assert.equal(summary.analysis.quality.yTitle, "边际 / 销量 vs 整体");
  assert.equal(summary.analysis.quality.dragTitle, "拖累贡献");
  assert.doesNotMatch(summary.analysis.quality.yTitle, /边际率|车型/);
  assert.doesNotMatch(JSON.stringify(summary.analysis), /单车|车型|产品/);
});

test("summary cards and diagnostic blueprints follow uploaded metric names and reject old structure charts", () => {
  const { rows, schema } = normalizeUploadedRows([
    { 月份: "2026-01", 大区: "欧洲", 国家: "德国", 销量: 100, GMV: 1000, 服务成本: -700, NPS: 8 },
    { 月份: "2026-02", 大区: "欧洲", 国家: "德国", 销量: 120, GMV: 1100, 服务成本: -760, NPS: 9 },
    { 月份: "2026-01", 大区: "拉美", 国家: "巴西", 销量: 70, GMV: 420, 服务成本: -520, NPS: 7 },
    { 月份: "2026-02", 大区: "拉美", 国家: "巴西", 销量: 90, GMV: 500, 服务成本: -560, NPS: 6 },
  ]);
  const summary = summarizeProfitStructure(rows, schema, { dimensions: ["大区"] });
  const cards = buildSummaryCards(summary, schema);
  const charts = buildStructureBlueprints(summary, schema);
  const combinedText = JSON.stringify({ cards, charts, summary });

  assert.deepEqual(cards.map((card) => card.label), ["销量", "GMV", "服务成本", "NPS"]);
  assert.equal(cards.at(-1).value, "—");
  assert.deepEqual(charts.map((chart) => chart.kind), [
    "dimension-diagnostics",
    "quality-map",
    "drag-contribution",
  ]);
  assert.ok(charts.every((chart) => chart.title && chart.description));
  assert.ok(charts.some((chart) => /维度解释力/.test(chart.title) && /GMV|服务成本|NPS/.test(chart.description)));
  assert.doesNotMatch(combinedText, /边际率|净收入|单车边际|结构提示|候选图表|热力图|明细|分层贡献|销量结构占比|维度路径流向|Sankey|交叉结构切分|维度组合气泡矩阵|主路径结构条|正负结构拆解/);
});

test("dimension diagnostics ranks dimensions by quality dispersion and drag concentration", () => {
  const { rows, schema } = normalizeUploadedRows([
    { 月份: "2026-01", 大区: "欧洲", 国家: "德国", 品牌: "A", 销量: 100, 边际: 300 },
    { 月份: "2026-01", 大区: "欧洲", 国家: "法国", 品牌: "B", 销量: 100, 边际: 290 },
    { 月份: "2026-01", 大区: "拉美", 国家: "巴西", 品牌: "A", 销量: 100, 边际: -80 },
    { 月份: "2026-01", 大区: "拉美", 国家: "墨西哥", 品牌: "B", 销量: 100, 边际: -70 },
  ]);
  const summary = summarizeProfitStructure(rows, schema, {
    dimensions: ["大区"],
    primaryMetric: "边际",
  });
  const diagnostics = buildDimensionDiagnostics(summary);

  assert.equal(diagnostics[0].dimension, "大区");
  assert.ok(diagnostics[0].qualitySpread > diagnostics[1].qualitySpread);
  assert.ok(diagnostics[0].score > diagnostics[1].score);
  assert.match(diagnostics[0].reason, /质量差异|拖累/);
});

test("quality map and drag contribution cap high-cardinality combinations for readable diagnosis", () => {
  const rows = Array.from({ length: 180 }, (_, index) => ({
    月份: "2026-01",
    大区: `大区${index % 8}`,
    国家: `国家${index % 60}`,
    品牌: `品牌${index % 12}`,
    车型: `车型${index}`,
    销量: 10 + (index % 30),
    净收入: 120 + index,
    边际: 40 - (index % 19),
  }));
  const { rows: normalizedRows, schema } = normalizeUploadedRows(rows);
  const summary = summarizeProfitStructure(normalizedRows, schema, {
    dimensions: ["大区", "国家", "品牌", "车型"],
    primaryMetric: "边际",
    secondaryMetric: "净收入",
  });
  const qualityMap = buildQualityMapItems(summary, { limit: 50 });
  const dragItems = buildDragContributionItems(summary, { limit: 20 });

  assert.ok(qualityMap.hasMore);
  assert.equal(qualityMap.items.length, 50);
  assert.ok(qualityMap.items.every((item) => item.name.includes(" / ")));
  assert.ok(qualityMap.items.every((item) => ["高规模高质量", "高规模低质量", "低规模高质量", "低规模低质量"].includes(item.quadrant)));
  assert.equal(dragItems.items.length, 20);
  assert.ok(dragItems.items.every((item) => item.dragContribution <= 0));
});

test("profit structure tool requires the private tool access key before booting charts", async () => {
  const tool = await readFile(new URL("../src/app/finance/profit-structure/ProfitStructureTool.tsx", import.meta.url), "utf8");

  assert.match(tool, /PRIVATE_TOOL_ACCESS_ENDPOINT/);
  assert.doesNotMatch(tool, /\/api\/tools\/finance-ai-assistant\/access/);
  assert.match(tool, /多维利润质量诊断模型内测访问/);
  assert.match(tool, /type="password"/);
  assert.match(tool, /if \(!accessToken\) {\s+return;\s+}/);
  assert.match(tool, /\}, \[accessToken, bootAttempt\]\);/);
});

test("source files for the tool do not expose rejected panels or rejected chart names", async () => {
  const [tool, page, engine] = await Promise.all([
    readFile(new URL("../src/app/finance/profit-structure/ProfitStructureTool.tsx", import.meta.url), "utf8"),
    readFile(new URL("../src/app/finance/profit-structure/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../src/app/finance/profit-structure/profit-structure-engine.js", import.meta.url), "utf8"),
  ]);
  const surfaceText = `${tool}\n${page}\n${engine}`;

  assert.doesNotMatch(surfaceText, /结构提示|候选图表|经营对象盈利明细|边际分层贡献|销量结构占比|合计排行|单车边际排行|分月趋势|对象 x 月份热力图|明细表|维度路径流向|Sankey|结构定位散点/);
  assert.match(surfaceText, /维度解释力/);
  assert.match(surfaceText, /结构质量地图/);
  assert.match(surfaceText, /拖累贡献/);
  assert.doesNotMatch(surfaceText, /交叉结构切分|维度组合气泡矩阵|主路径结构条|正负结构拆解|markers\+text|textposition/);
});
