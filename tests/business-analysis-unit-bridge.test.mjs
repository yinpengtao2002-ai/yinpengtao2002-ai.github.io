import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const engine = await readFile(
  new URL("../src/app/finance/business-analysis/business-analysis-engine.js", import.meta.url),
  "utf8"
);

test("business analysis profit variance bridge explains margin above fixed costs through volume and unit economics", () => {
  const bridgeRows = engine.match(/function profitVarianceBridgeRows\(summary,[\s\S]*?\n    \}/);
  assert.ok(bridgeRows, "profit variance bridge row builder should exist");

  ["销量影响", "单车净收入影响", "单车材料成本影响", "单车变动制造费用影响", "单车变动销售费用影响"].forEach((label) => {
    assert.match(bridgeRows[0], new RegExp(label), `${label} should be part of the variance bridge`);
  });

  assert.doesNotMatch(bridgeRows[0], /净收入差异/);
  assert.match(engine, /unitNetRevenueImpact/);
  assert.match(engine, /volumeImpact/);
});

test("business analysis unit margin bubble hover exposes volume and unit economics details", () => {
  const chartRenderer = engine.match(/function renderUnitMarginChart\(rows\)[\s\S]*?\n    \}/);
  assert.ok(chartRenderer, "unit margin bubble chart renderer should exist");

  [
    "实际销量",
    "预算销量",
    "销量差异",
    "实际单车净收入",
    "预算单车净收入",
    "单车净收入差异",
    "实际单车边际",
    "预算单车边际",
    "单车边际差异"
  ].forEach((label) => {
    assert.match(chartRenderer[0], new RegExp(label), `${label} should be visible in the bubble hover`);
  });

  assert.match(chartRenderer[0], /customdata:\s*dimRows\.map/);
  assert.match(chartRenderer[0], /formatVolume\(item\.actual\.salesVolume\)/);
  assert.match(chartRenderer[0], /formatVolume\(item\.budget\.salesVolume\)/);
  assert.match(chartRenderer[0], /formatUnitAmount\(item\.actual\.unitNetRevenue\)/);
  assert.match(chartRenderer[0], /formatUnitAmount\(item\.budget\.unitNetRevenue\)/);
  assert.match(chartRenderer[0], /formatUnitAmount\(item\.actual\.unitContributionMargin\)/);
  assert.match(chartRenderer[0], /formatUnitAmount\(item\.budget\.unitContributionMargin\)/);
});

test("business analysis uses shared numeric parsing and sample-aware field roles", () => {
  assert.match(engine, /inferFinanceFieldRoles/);
  assert.match(engine, /parseFinanceNumber/);
  assert.match(engine, /function toNumber\(value\)\s*\{[\s\S]*parseFinanceNumber\(value\)/);
  assert.match(engine, /function inferWideDimensionColumns\(rows\)\s*\{[\s\S]*inferFinanceFieldRoles\(rows/);
  assert.doesNotMatch(engine, /\.replace\(\/\[万亿\]\//);
  assert.doesNotMatch(engine, /headers\.slice\(0, salesIndex\)/);
});

test("business analysis blocks non-empty invalid numeric cells before calculation", () => {
  assert.match(engine, /function validateBusinessSourceRows\(rows\)/);
  assert.match(engine, /const validation = validateBusinessSourceRows\(rows\)/);
  assert.match(engine, /if \(validation\.issues\.length\)[\s\S]*数据质量校验未通过[\s\S]*return;/);
  assert.match(engine, /__sourceLocation/);
});
