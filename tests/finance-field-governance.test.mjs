import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const governance = await import(new URL("../src/lib/finance/field-governance.ts", import.meta.url));
const monthly = await import(new URL("../src/app/finance/monthly-trend/monthly-trend-engine.js", import.meta.url));
const profitStructure = (await import(new URL("../src/app/finance/profit-structure/profit-structure-engine.js", import.meta.url))).default;

test("field governance accepts only explicit dimension, metric, and ignore choices", () => {
  assert.deepEqual(
    governance.normalizeFinanceFieldRoleOverrides(
      ["待确认 A", "待确认 B", "待确认 C", "不在底表"],
      {
        "待确认 A": "dimension",
        "待确认 B": "metric",
        "待确认 C": "ignore",
        "不在底表": "period",
        "额外字段": "dimension",
      },
    ),
    {
      "待确认 A": "dimension",
      "待确认 B": "metric",
      "待确认 C": "ignore",
    },
  );
});

test("monthly and profit uploads can resume after ambiguous fields are confirmed", () => {
  const rows = [
    { 月份: "2026-01", 国家: "中国", 销量: 10, 净收入: 100, 待确认字段: "" },
    { 月份: "2026-02", 国家: "中国", 销量: 12, 净收入: 130, 待确认字段: "" },
  ];

  const unresolvedMonthly = monthly.inferMonthlyUploadFields(rows);
  assert.deepEqual(unresolvedMonthly.ambiguousColumns, ["待确认字段"]);
  const resolvedMonthly = monthly.inferMonthlyUploadFields(rows, {
    fieldRoleOverrides: { 待确认字段: "dimension" },
  });
  assert.deepEqual(resolvedMonthly.ambiguousColumns, []);
  assert.ok(resolvedMonthly.dimensionColumns.includes("待确认字段"));

  const unresolvedProfit = profitStructure.normalizeUploadedRows(rows).schema;
  assert.deepEqual(unresolvedProfit.ambiguousColumns, ["待确认字段"]);
  const resolvedProfit = profitStructure.normalizeUploadedRows(rows, {
    待确认字段: "ignore",
  }).schema;
  assert.deepEqual(resolvedProfit.ambiguousColumns, []);
  assert.ok(!resolvedProfit.dimensions.includes("待确认字段"));
  assert.ok(!resolvedProfit.metricColumns.includes("待确认字段"));
});

test("finance workbenches render a shared field mapping confirmation surface", async () => {
  const paths = [
    "../src/app/finance/business-analysis/BusinessAnalysisTool.tsx",
    "../src/app/finance/monthly-trend/MonthlyTrendTool.tsx",
    "../src/app/finance/profit-structure/ProfitStructureTool.tsx",
  ];
  for (const path of paths) {
    const source = await readFile(new URL(path, import.meta.url), "utf8");
    assert.match(source, /data-finance-field-governance/);
  }

  const engines = [
    "../src/app/finance/business-analysis/business-analysis-engine.js",
    "../src/app/finance/monthly-trend/monthly-trend-engine.js",
    "../src/app/finance/profit-structure/profit-structure-engine.js",
  ];
  for (const path of engines) {
    const source = await readFile(new URL(path, import.meta.url), "utf8");
    assert.match(source, /showFinanceFieldGovernance/);
    assert.match(source, /fieldRoleOverrides/);
  }
});

test("margin upload inference does not classify metrics by sales-column position and offers mapping confirmation", async () => {
  const source = await readFile(new URL("../public/tools/margin-analysis/app.js", import.meta.url), "utf8");
  const html = await readFile(new URL("../public/tools/margin-analysis/index.html", import.meta.url), "utf8");
  assert.doesNotMatch(source, /isMetricAfterSales/);
  assert.match(source, /showMarginFieldGovernance/);
  assert.match(source, /ambiguousColumns/);
  assert.match(source, /const sourceRows = rows;[\s\S]*showMarginFieldGovernance\(sourceRows,/);
  assert.match(html, /data-margin-field-governance/);
});
