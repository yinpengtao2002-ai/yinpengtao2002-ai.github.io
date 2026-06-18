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
