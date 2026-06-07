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
  buildSankeyData,
  buildScatterPlotItems,
  defaultDimensionPath,
  createSampleRows,
} = profitStructure.default;

test("profit structure model is registered as a multidimensional finance model", () => {
  const model = registry.models.find((item) => item.slug === "profit-structure");

  assert.ok(model, "profit-structure should be present in the finance model registry");
  assert.equal(model.title, "多维结构关系分析模型");
  assert.equal(model.href, "/finance/profit-structure");
  assert.equal("categoryId" in model, false);
  assert.match(model.summary, /任意维度/);
  assert.match(model.summary, /上传指标|任意指标/);
  assert.match(model.aiGuide.purpose, /结构关系|多维/);
  assert.doesNotMatch(model.title, /车型|产品/);
  assert.doesNotMatch(model.summary, /默认车型/);
  assert.doesNotMatch(JSON.stringify(model.aiGuide), /边际率|如果未填写边际|净收入\/成本\/边际|候选图表|明细表|排行榜|分层/);
});

test("template keeps the shared month-dimension-volume-metric shape", () => {
  assert.deepEqual(
    TEMPLATE_HEADERS,
    ["月份", "大区", "国家", "品牌", "品牌市场", "经营模式", "业务单元", "车型", "燃油品类", "销量", "净收入", "成本", "边际"]
  );
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

test("uploaded rows treat every column before volume as a selectable dimension and every column after volume as an uploaded metric", () => {
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

test("summarizes uploaded metrics by any selected dimension path without synthesizing missing metrics or insight layers", () => {
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
  assert.equal("边际率" in byRegion.totals.metrics, false);
  assert.equal("layerSummary" in byRegion, false);
  assert.ok(byRegion.items.every((item) => !("classification" in item)));

  const byCountryModel = summarizeProfitStructure(rows, schema, { dimensions: ["国家", "车型"] });
  assert.deepEqual(
    byCountryModel.items.map((item) => item.name),
    ["德国 / A", "法国 / A", "墨西哥 / B", "巴西 / C"]
  );
  assert.deepEqual(byCountryModel.selectedDimensions, ["国家", "车型"]);
});

test("structure positioning uses generic unit labels instead of vehicle-specific labels", () => {
  const { rows, schema } = normalizeUploadedRows([
    { 月份: "2026-01", 大区: "欧洲", 国家: "德国", 销量: 100, 净收入: 1000, 成本: -700, 边际: 300 },
    { 月份: "2026-01", 大区: "拉美", 国家: "巴西", 销量: 70, 净收入: 420, 成本: -520, 边际: -100 },
  ]);
  const summary = summarizeProfitStructure(rows, schema, { dimensions: ["大区"] });

  assert.equal(summary.analysis.primaryMetric, "边际");
  assert.equal(summary.analysis.secondaryMetric, "净收入");
  assert.equal(summary.analysis.matrix.xTitle, "边际 / 销量");
  assert.equal(summary.analysis.matrix.yTitle, "净收入 / 销量");
  assert.doesNotMatch(summary.analysis.matrix.xTitle, /边际率|销量占比/);
  assert.doesNotMatch(JSON.stringify(summary.analysis), /单车|车型|产品/);
});

test("summary cards and structure blueprints follow uploaded metric names and reject dashboard-style chart candidates", () => {
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
  assert.deepEqual(charts.map((chart) => chart.kind), [
    "dimension-flow",
    "structure-scatter",
  ]);
  assert.ok(charts.every((chart) => chart.title && chart.description));
  assert.ok(charts.some((chart) => /维度路径/.test(chart.title) && /GMV|服务成本|NPS/.test(chart.description)));
  assert.doesNotMatch(combinedText, /边际率|净收入|单车边际|结构提示|候选图表|排行|热力图|明细|分层贡献|销量结构占比|交叉结构切分|维度组合气泡矩阵|主路径结构条|正负结构拆解/);
});

test("sankey data collapses high-cardinality long tails instead of rendering every node", () => {
  const rows = Array.from({ length: 100 }, (_, index) => ({
    月份: "2026-01",
    大区: `大区${index % 10}`,
    国家: `国家${index}`,
    品牌: `品牌${index % 5}`,
    销量: 10 + index,
    GMV: 100 + index,
  }));
  const { rows: normalizedRows, schema } = normalizeUploadedRows(rows);
  const summary = summarizeProfitStructure(normalizedRows, schema, {
    dimensions: ["大区", "国家", "品牌"],
    primaryMetric: "GMV",
  });
  const sankey = buildSankeyData(summary, { maxValuesPerLevel: [10, 12, 8] });
  const countryNodes = sankey.nodes.filter((node) => node.dimension === "国家");

  assert.ok(countryNodes.length <= 13, "country level should be capped plus one tail bucket");
  assert.ok(countryNodes.some((node) => node.value === "其他国家"));
});

test("scatter data is capped for high-cardinality dimension combinations", () => {
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
  const scatter = buildScatterPlotItems(summary, { limit: 50 });

  assert.ok(scatter.hasMore);
  assert.equal(scatter.items.length, 50);
  assert.ok(scatter.items.every((item) => item.name.includes(" / ")));
});

test("profit structure tool requires the existing finance access key before booting charts", async () => {
  const tool = await readFile(new URL("../src/app/finance/profit-structure/ProfitStructureTool.tsx", import.meta.url), "utf8");

  assert.match(tool, /\/api\/tools\/finance-ai-assistant\/access/);
  assert.match(tool, /多维结构关系分析模型内测访问/);
  assert.match(tool, /type="password"/);
  assert.match(tool, /if \(!accessToken\) {\s+return;\s+}/);
  assert.match(tool, /\}, \[accessToken\]\);/);
});

test("source files for the tool do not expose rejected panels or rejected chart names", async () => {
  const [tool, page, engine] = await Promise.all([
    readFile(new URL("../src/app/finance/profit-structure/ProfitStructureTool.tsx", import.meta.url), "utf8"),
    readFile(new URL("../src/app/finance/profit-structure/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../src/app/finance/profit-structure/profit-structure-engine.js", import.meta.url), "utf8"),
  ]);
  const surfaceText = `${tool}\n${page}\n${engine}`;

  assert.doesNotMatch(surfaceText, /结构提示|候选图表|经营对象盈利明细|边际分层贡献|销量结构占比|合计排行|单车边际排行|分月趋势|对象 x 月份热力图|明细表/);
  assert.match(surfaceText, /维度路径流向/);
  assert.match(surfaceText, /结构定位散点/);
  assert.doesNotMatch(surfaceText, /交叉结构切分|维度组合气泡矩阵|主路径结构条|正负结构拆解|markers\+text|textposition/);
});
