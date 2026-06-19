import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const registry = JSON.parse(
  await readFile(new URL("../src/lib/finance/model-registry.json", import.meta.url), "utf8")
);

async function readProjectFile(path) {
  try {
    return await readFile(new URL(path, import.meta.url), "utf8");
  } catch {
    assert.fail(`${path} should exist`);
  }
}

test("finance chart system records central chart dependencies for every model", async () => {
  const chartSystem = await readProjectFile("../docs/finance-chart-system.md");
  const inventory = await readProjectFile("../docs/finance-model-inventory.md");
  const handoff = await readProjectFile("../agent.md");

  assert.match(chartSystem, /# 财务图表中枢/);
  assert.match(chartSystem, /## 模型依赖地图/);
  assert.match(chartSystem, /## 中枢改动同步规则/);
  assert.match(chartSystem, /src\/lib\/finance\/charts/);
  assert.match(chartSystem, /src\/lib\/finance\/core/);

  for (const model of registry.models) {
    assert.match(
      chartSystem,
      new RegExp(`\\|\\s*${model.slug}\\s*\\|`),
      `${model.slug} should be listed in the finance chart dependency map`
    );
  }

  assert.match(inventory, /docs\/finance-chart-system\.md/);
  assert.match(handoff, /docs\/finance-chart-system\.md/);
  assert.match(handoff, /图表中枢|中枢图表|财务图表中枢/);
});

test("finance chart builders live behind a central chart library", async () => {
  const chartIndex = await readProjectFile("../src/lib/finance/charts/index.ts");
  const chartTypes = await readProjectFile("../src/lib/finance/charts/types.ts");
  const financeAIChartShim = await readProjectFile("../src/lib/finance-ai/charts.ts");
  const financeAITypes = await readProjectFile("../src/lib/finance-ai/types.ts");

  assert.match(chartIndex, /export function buildChartSpec/);
  assert.match(chartIndex, /export function buildDirectChartSpec/);
  assert.match(chartTypes, /export type FinanceChartSpec/);
  assert.match(chartTypes, /export type FinanceTableVariant/);
  assert.match(financeAIChartShim, /from "\.\.\/finance\/charts"/);
  assert.doesNotMatch(financeAIChartShim, /function buildDirectWaterfallChartSpec/);
  assert.match(financeAITypes, /from "\.\.\/finance\/charts\/types"/);
  assert.doesNotMatch(financeAITypes, /export type FinanceChartSpec\s*=/);
});

test("central chart library builds reusable direct chart specs", async () => {
  const { buildDirectChartSpec } = await import("../src/lib/finance/charts/index.ts");
  const spec = buildDirectChartSpec({
    type: "waterfall",
    title: "利润变化桥",
    startLabel: "预算",
    startValue: 100,
    endLabel: "实际",
    endValue: 118,
    items: [
      { label: "销量", value: 12 },
      { label: "单车边际", value: 9 },
    ],
  });

  assert.equal(spec.kind, "waterfall_bridge");
  assert.equal(spec.title, "利润变化桥");
  assert.equal(spec.config.displayModeBar, false);
  assert.equal(spec.data[0].type, "waterfall");

  const paretoSpec = buildDirectChartSpec({
    type: "pareto_rank",
    title: "国家销量 Pareto",
    items: [
      { label: "巴西", value: 120, share: 0.6 },
      { label: "西班牙", value: 80, share: 0.4 },
    ],
  });
  const smallMultiplesSpec = buildDirectChartSpec({
    type: "small_multiples_trend",
    title: "国家销量小多图",
    series: [
      { name: "巴西", points: [{ label: "4月", value: 100 }, { label: "5月", value: 120 }] },
      { name: "西班牙", points: [{ label: "4月", value: 90 }, { label: "5月", value: 80 }] },
    ],
  });

  assert.equal(paretoSpec.kind, "pareto_rank");
  assert.equal(paretoSpec.data[1].name, "累计占比");
  assert.equal(smallMultiplesSpec.kind, "small_multiples_trend");
  assert.ok(smallMultiplesSpec.layout.xaxis2);
});
