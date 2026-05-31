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
  classifyProfitStructureItem,
  buildSummaryCards,
  buildChartBlueprints,
} = profitStructure.default;

test("profit structure model is registered as a multidimensional finance model", () => {
  const model = registry.models.find((item) => item.slug === "profit-structure");

  assert.ok(model, "profit-structure should be present in the finance model registry");
  assert.equal(model.title, "多维度结构分析模型");
  assert.equal(model.href, "/finance/profit-structure");
  assert.equal("categoryId" in model, false);
  assert.match(model.summary, /任意维度/);
  assert.match(model.summary, /上传指标|任意指标/);
  assert.match(model.aiGuide.purpose, /多维度/);
  assert.doesNotMatch(model.title, /车型|产品/);
  assert.doesNotMatch(model.summary, /默认车型/);
  assert.doesNotMatch(JSON.stringify(model.aiGuide), /边际率|如果未填写边际|净收入\/成本\/边际/);
});

test("template keeps the shared month-dimension-volume-metric shape", () => {
  assert.deepEqual(
    TEMPLATE_HEADERS,
    ["月份", "大区", "国家", "品牌市场", "经营模式", "业务单元", "车型", "燃油品类", "品牌", "销量", "净收入", "成本", "边际"]
  );
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

test("summarizes uploaded metrics by any selected dimension or dimension combination without synthesizing missing metrics", () => {
  const { rows, schema } = normalizeUploadedRows([
    { 月份: "2026-01", 大区: "欧洲", 国家: "德国", 车型: "A", 销量: 100, 净收入: 1000, 成本: -700, 边际: 300 },
    { 月份: "2026-01", 大区: "欧洲", 国家: "法国", 车型: "A", 销量: 20, 净收入: 220, 成本: -120, 边际: 100 },
    { 月份: "2026-01", 大区: "拉美", 国家: "墨西哥", 车型: "B", 销量: 180, 净收入: 1440, 成本: -1380, 边际: 60 },
    { 月份: "2026-01", 大区: "拉美", 国家: "巴西", 车型: "C", 销量: 70, 净收入: 420, 成本: -520, 边际: -100 },
  ]);

  const byRegion = summarizeProfitStructure(rows, schema, { dimensions: ["大区"] });
  assert.equal(byRegion.items.length, 2);
  assert.equal(byRegion.items[0].name, "欧洲");
  assert.equal(byRegion.items[0].classification.key, "high-value-core");
  assert.equal(byRegion.items[1].name, "拉美");
  assert.equal(byRegion.items[1].classification.key, "low-value-drag");
  assert.equal(byRegion.totals.metrics.净收入, 3080);
  assert.equal(byRegion.totals.metrics.成本, -2720);
  assert.equal(byRegion.totals.metrics.边际, 360);
  assert.equal("边际率" in byRegion.totals.metrics, false);

  const byCountryModel = summarizeProfitStructure(rows, schema, { dimensions: ["国家", "车型"] });
  assert.deepEqual(
    byCountryModel.items.map((item) => item.name),
    ["德国 / A", "法国 / A", "墨西哥 / B", "巴西 / C"]
  );
  assert.ok(byCountryModel.items.some((item) => item.classification.key === "high-value-niche"));
});

test("matrix defaults to unit primary metric versus unit comparator metric for the template metrics", () => {
  const { rows, schema } = normalizeUploadedRows([
    { 月份: "2026-01", 大区: "欧洲", 国家: "德国", 销量: 100, 净收入: 1000, 成本: -700, 边际: 300 },
    { 月份: "2026-01", 大区: "拉美", 国家: "巴西", 销量: 70, 净收入: 420, 成本: -520, 边际: -100 },
  ]);
  const summary = summarizeProfitStructure(rows, schema, { dimensions: ["大区"] });

  assert.equal(summary.analysis.primaryMetric, "边际");
  assert.equal(summary.analysis.secondaryMetric, "净收入");
  assert.equal(summary.analysis.matrix.xTitle, "单车边际");
  assert.equal(summary.analysis.matrix.yTitle, "单车净收入");
  assert.doesNotMatch(summary.analysis.matrix.xTitle, /边际率|销量占比/);
});

test("summary cards and chart blueprints follow uploaded metric names instead of fixed finance metrics", () => {
  const { rows, schema } = normalizeUploadedRows([
    { 月份: "2026-01", 大区: "欧洲", 国家: "德国", 销量: 100, GMV: 1000, 服务成本: -700, NPS: 8 },
    { 月份: "2026-02", 大区: "欧洲", 国家: "德国", 销量: 120, GMV: 1100, 服务成本: -760, NPS: 9 },
    { 月份: "2026-01", 大区: "拉美", 国家: "巴西", 销量: 70, GMV: 420, 服务成本: -520, NPS: 7 },
    { 月份: "2026-02", 大区: "拉美", 国家: "巴西", 销量: 90, GMV: 500, 服务成本: -560, NPS: 6 },
  ]);
  const summary = summarizeProfitStructure(rows, schema, { dimensions: ["大区"] });
  const cards = buildSummaryCards(summary, schema);
  const charts = buildChartBlueprints(summary, schema);
  const combinedText = JSON.stringify({ cards, charts, summary });

  assert.deepEqual(cards.map((card) => card.label), ["销量", "GMV", "服务成本", "NPS"]);
  assert.ok(charts.length >= 5 && charts.length <= 8, `expected a compact review set of 5-8 charts, got ${charts.length}`);
  assert.ok(charts.every((chart) => chart.title && chart.description));
  assert.ok(charts.some((chart) => /分层/.test(chart.title) && /服务成本|GMV|NPS/.test(chart.description)));
  assert.doesNotMatch(combinedText, /边际率|净收入|单车边际/);
});

test("classification uses the selected uploaded metric and scale, not a fixed business dimension", () => {
  assert.equal(
    classifyProfitStructureItem({
      volumeShare: 0.36,
      primaryShare: 0.52,
      primaryUnitValue: 3.2,
      primaryValue: 320,
    }, { averageVolumeShare: 0.2, averagePrimaryUnit: 1.4 }).key,
    "high-value-core"
  );

  assert.equal(
    classifyProfitStructureItem({
      volumeShare: 0.48,
      primaryShare: 0.08,
      primaryUnitValue: 0.2,
      primaryValue: 40,
    }, { averageVolumeShare: 0.2, averagePrimaryUnit: 1.4 }).key,
    "scale-driver"
  );

  assert.equal(
    classifyProfitStructureItem({
      volumeShare: 0.08,
      primaryShare: 0.28,
      primaryUnitValue: 4.8,
      primaryValue: 140,
    }, { averageVolumeShare: 0.2, averagePrimaryUnit: 1.4 }).key,
    "high-value-niche"
  );

  assert.equal(
    classifyProfitStructureItem({
      volumeShare: 0.12,
      primaryShare: -0.1,
      primaryUnitValue: -1.1,
      primaryValue: -70,
    }, { averageVolumeShare: 0.2, averagePrimaryUnit: 1.4 }).key,
    "low-value-drag"
  );
});
