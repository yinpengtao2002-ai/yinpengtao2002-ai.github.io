import test from "node:test";
import assert from "node:assert/strict";

let monthlyTrend = {};
try {
  monthlyTrend = await import("../src/app/finance/monthly-trend/monthly-trend-engine.js");
} catch {
  // The first TDD run intentionally targets exports that do not exist yet.
}

test("monthly trend exposes shared field inference and validation helpers", () => {
  assert.equal(typeof monthlyTrend.inferMonthlyUploadFields, "function");
  assert.equal(typeof monthlyTrend.validateMonthlyUploadRows, "function");
});

test("monthly field inference is independent from the sales column position", () => {
  const result = monthlyTrend.inferMonthlyUploadFields([
    { 月份: "2026-01", 净收入: 1000, 销量: 100, 渠道: "经销", 空列: "" },
    { 月份: "2026-02", 净收入: 1200, 销量: 120, 渠道: "直营", 空列: "" },
  ]);

  assert.equal(result.monthColumn, "月份");
  assert.deepEqual(result.dimensionColumns, ["渠道"]);
  assert.deepEqual(result.metricColumns, ["销量", "净收入"]);
  assert.deepEqual(result.ambiguousColumns, ["空列"]);
});

test("monthly upload validation scales units and reports invalid required cells", () => {
  const rows = [
    { 月份: "2026-01", 大区: "欧洲", 销量: 100, 净收入: "1.2亿" },
    { 月份: "2026-02", 大区: "欧洲", 销量: "#VALUE!", 净收入: "" },
  ];
  const inferred = monthlyTrend.inferMonthlyUploadFields(rows);
  const result = monthlyTrend.validateMonthlyUploadRows(rows, inferred, { sheet: "经营明细" });

  assert.equal(result.rows[0].净收入, 120_000_000);
  assert.deepEqual(result.issues.map((issue) => ({ row: issue.row, column: issue.column, status: issue.status })), [
    { row: 3, column: "销量", status: "invalid" },
    { row: 3, column: "净收入", status: "blank" },
  ]);
});
