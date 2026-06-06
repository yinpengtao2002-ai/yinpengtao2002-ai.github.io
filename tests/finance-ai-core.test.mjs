import test from "node:test";
import assert from "node:assert/strict";
import {
  inferFinanceSchema,
  normalizePeriodValue,
} from "../src/lib/finance-ai/schema.ts";

const rows = [
  { "月份": "2025-03", "大区": "拉美", "国家": "巴西", "车型": "T1D", "销量": 100, "净收入": 9000, "成本": -7000, "边际": 2000 },
  { "月份": "2025-04", "大区": "拉美", "国家": "巴西", "车型": "T1D", "销量": 110, "净收入": 9900, "成本": -7600, "边际": 2300 },
];

test("finance AI schema infers month, sales, dimensions, total metrics, and unit metrics", () => {
  const schema = inferFinanceSchema(rows);

  assert.equal(schema.monthColumn, "月份");
  assert.equal(schema.salesColumn, "销量");
  assert.deepEqual(schema.dimensionColumns, ["大区", "国家", "车型"]);
  assert.deepEqual(schema.totalMetrics.map((metric) => metric.column), ["净收入", "成本", "边际"]);
  assert.deepEqual(schema.unitMetrics.map((metric) => metric.name), ["单车净收入", "单车成本", "单车边际"]);
  assert.equal(schema.requiredIssues.length, 0);
  assert.equal(schema.profile.rowCount, 2);
  assert.deepEqual(schema.profile.periods.map((period) => period.key), ["2025-03", "2025-04"]);
});

test("finance AI schema treats rate-like columns as non-default metrics", () => {
  const schema = inferFinanceSchema([
    { "月份": "2025年3月", "国家": "巴西", "销量": 100, "边际": 2000, "边际率": 0.22 },
  ]);

  assert.deepEqual(schema.totalMetrics.map((metric) => metric.column), ["边际"]);
  assert.deepEqual(schema.excludedMetricColumns, ["边际率"]);
});

test("normalizePeriodValue supports common month formats", () => {
  assert.deepEqual(normalizePeriodValue("2025-03"), { key: "2025-03", label: "2025年3月", sort: 24303 });
  assert.deepEqual(normalizePeriodValue("2025年4月"), { key: "2025-04", label: "2025年4月", sort: 24304 });
  assert.deepEqual(normalizePeriodValue("202505"), { key: "2025-05", label: "2025年5月", sort: 24305 });
});
