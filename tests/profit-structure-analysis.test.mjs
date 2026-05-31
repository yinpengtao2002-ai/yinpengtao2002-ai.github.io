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
} = profitStructure.default;

test("profit structure model is registered as a multidimensional finance model", () => {
  const model = registry.models.find((item) => item.slug === "profit-structure");

  assert.ok(model, "profit-structure should be present in the finance model registry");
  assert.equal(model.title, "多维盈利结构分析模型");
  assert.equal(model.href, "/finance/profit-structure");
  assert.equal(model.categoryId, "profit-structure");
  assert.match(model.summary, /任意维度/);
  assert.match(model.aiGuide.purpose, /多维度/);
  assert.doesNotMatch(model.title, /车型|产品/);
  assert.doesNotMatch(model.summary, /默认车型/);
});

test("template keeps the shared month-dimension-volume-metric shape", () => {
  assert.deepEqual(
    TEMPLATE_HEADERS,
    ["月份", "大区", "国家", "品牌市场", "经营模式", "业务单元", "车型", "燃油品类", "品牌", "销量", "净收入", "成本", "边际"]
  );
});

test("uploaded rows treat every column before volume as a selectable dimension", () => {
  const { rows, schema } = normalizeUploadedRows([
    {
      月份: "2026-01",
      大区: "欧洲",
      国家: "德国",
      渠道: "经销",
      客户: "客户A",
      销量: 100,
      净收入: 1000,
      成本: -760,
    },
  ]);

  assert.deepEqual(schema.dimensions, ["大区", "国家", "渠道", "客户"]);
  assert.deepEqual(buildDimensionOptions(schema), ["大区", "国家", "渠道", "客户"]);
  assert.equal(rows[0].margin, 240);
  assert.equal(rows[0].dimensionValues.客户, "客户A");
});

test("summarizes profit structure by any selected dimension or dimension combination", () => {
  const { rows, schema } = normalizeUploadedRows([
    { 月份: "2026-01", 大区: "欧洲", 国家: "德国", 车型: "A", 销量: 100, 净收入: 1000, 成本: -700, 边际: 300 },
    { 月份: "2026-01", 大区: "欧洲", 国家: "法国", 车型: "A", 销量: 20, 净收入: 220, 成本: -120, 边际: 100 },
    { 月份: "2026-01", 大区: "拉美", 国家: "墨西哥", 车型: "B", 销量: 180, 净收入: 1440, 成本: -1380, 边际: 60 },
    { 月份: "2026-01", 大区: "拉美", 国家: "巴西", 车型: "C", 销量: 70, 净收入: 420, 成本: -520, 边际: -100 },
  ]);

  const byRegion = summarizeProfitStructure(rows, schema, { dimensions: ["大区"] });
  assert.equal(byRegion.items.length, 2);
  assert.equal(byRegion.items[0].name, "欧洲");
  assert.equal(byRegion.items[0].classification.key, "core-profit");
  assert.equal(byRegion.items[1].name, "拉美");
  assert.equal(byRegion.items[1].classification.key, "profit-drag");

  const byCountryModel = summarizeProfitStructure(rows, schema, { dimensions: ["国家", "车型"] });
  assert.deepEqual(
    byCountryModel.items.map((item) => item.name),
    ["德国 / A", "法国 / A", "墨西哥 / B", "巴西 / C"]
  );
  assert.ok(byCountryModel.items.some((item) => item.classification.key === "high-value-niche"));
});

test("classification uses profitability and scale, not a fixed business dimension", () => {
  assert.equal(
    classifyProfitStructureItem({
      volumeShare: 0.36,
      marginShare: 0.52,
      unitMargin: 3.2,
      marginRate: 0.24,
      margin: 320,
    }, { averageVolumeShare: 0.2, averageUnitMargin: 1.4 }).key,
    "core-profit"
  );

  assert.equal(
    classifyProfitStructureItem({
      volumeShare: 0.48,
      marginShare: 0.08,
      unitMargin: 0.2,
      marginRate: 0.03,
      margin: 40,
    }, { averageVolumeShare: 0.2, averageUnitMargin: 1.4 }).key,
    "scale-driver"
  );

  assert.equal(
    classifyProfitStructureItem({
      volumeShare: 0.08,
      marginShare: 0.28,
      unitMargin: 4.8,
      marginRate: 0.3,
      margin: 140,
    }, { averageVolumeShare: 0.2, averageUnitMargin: 1.4 }).key,
    "high-value-niche"
  );

  assert.equal(
    classifyProfitStructureItem({
      volumeShare: 0.12,
      marginShare: -0.1,
      unitMargin: -1.1,
      marginRate: -0.18,
      margin: -70,
    }, { averageVolumeShare: 0.2, averageUnitMargin: 1.4 }).key,
    "profit-drag"
  );
});
