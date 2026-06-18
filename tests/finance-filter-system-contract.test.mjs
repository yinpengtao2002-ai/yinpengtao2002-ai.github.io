import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

async function readProjectFile(path) {
  try {
    return await readFile(new URL(path, import.meta.url), "utf8");
  } catch {
    assert.fail(`${path} should exist`);
  }
}

test("finance filter system exposes shared filter state helpers", async () => {
  const filters = await import("../src/lib/finance/filters/index.ts");
  const docs = await readProjectFile("../docs/finance-interaction-system.md");

  assert.deepEqual(filters.normalizeFilterValues([" 巴西 ", "泰国", "", "巴西", null]), ["巴西", "泰国"]);
  assert.deepEqual(filters.searchFilterOptions(["巴西", "泰国", "英国"], "英"), ["英国"]);
  assert.deepEqual(filters.invertFilterSelection(["巴西", "泰国", "英国"], ["巴西", "英国"]), ["泰国"]);
  assert.deepEqual(filters.resolveAppliedFilterValues(["巴西", "泰国"], new Set(["泰国", "不存在"])), ["泰国"]);

  assert.deepEqual(
    filters.buildExcludeSelection(["巴西", "泰国", "英国"], ["巴西", "英国"]),
    ["泰国"]
  );

  assert.equal(
    filters.matchesIncludeExcludeFilter("巴西", { includeValues: ["巴西"], excludeValues: [] }),
    true
  );
  assert.equal(
    filters.matchesIncludeExcludeFilter("巴西", { includeValues: [], excludeValues: ["巴西"] }),
    false
  );

  assert.match(docs, /# 财务交互中枢/);
  assert.match(docs, /src\/lib\/finance\/filters/);
  assert.match(docs, /单车指标变动归因模型/);
  assert.match(docs, /预算实际对比模型/);
});

test("shared cascading filter pruning keeps downstream selections valid", async () => {
  const { pruneCascadingSelections } = await import("../src/lib/finance/filters/index.ts");
  const rows = [
    { dimensions: { 大区: "拉美", 国家: "巴西", 车型: "T1D" } },
    { dimensions: { 大区: "拉美", 国家: "墨西哥", 车型: "T1E" } },
    { dimensions: { 大区: "欧洲", 国家: "英国", 车型: "T19" } },
  ];

  const result = pruneCascadingSelections({
    dimensions: ["大区", "国家", "车型"],
    changedDimension: "大区",
    rows,
    includeSelections: {
      大区: ["拉美"],
      国家: ["巴西", "英国"],
      车型: ["T1D", "T19"],
    },
    excludeSelections: {
      国家: ["墨西哥", "不存在"],
    },
    getRowValue: (row, dimension) => row.dimensions[dimension],
  });

  assert.deepEqual(result.includeSelections, {
    大区: ["拉美"],
    国家: ["巴西"],
    车型: ["T1D"],
  });
  assert.deepEqual(result.excludeSelections, {
    国家: ["墨西哥"],
  });
});

test("business analysis and margin analysis are tracked as shared filter consumers", async () => {
  const businessEngine = await readProjectFile("../src/app/finance/business-analysis/business-analysis-engine.js");
  const marginEngine = await readProjectFile("../public/tools/margin-analysis/app.js");
  const inventory = await readProjectFile("../docs/finance-model-inventory.md");
  const handoff = await readProjectFile("../agent.md");

  assert.match(businessEngine, /@\/lib\/finance\/filters|finance\/filters/);
  assert.match(marginEngine, /FinanceFilters|finance filter system|finance-filter/);
  assert.match(inventory, /docs\/finance-interaction-system\.md/);
  assert.match(handoff, /docs\/finance-interaction-system\.md/);
});
