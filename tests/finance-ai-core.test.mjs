import test from "node:test";
import assert from "node:assert/strict";
import {
  inferFinanceSchema,
  normalizePeriodValue,
  toFinanceNumber,
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

test("finance AI schema keeps numeric dimension codes while excluding metadata columns", () => {
  const schema = inferFinanceSchema([
    { "月份": "2025-03", "版本": "v1", "备注": "内部口径", "国家代码": 76, "经销商编码": 1001, "渠道": "直营", "销量": 10, "净收入": 30000 },
    { "月份": "2025-04", "版本": "v1", "备注": "内部口径", "国家代码": 76, "经销商编码": 1002, "渠道": "经销", "销量": 12, "净收入": 36000 },
  ]);

  assert.deepEqual(schema.dimensionColumns, ["国家代码", "经销商编码", "渠道"]);
  assert.deepEqual(schema.profile.dimensionValueCounts, {
    "国家代码": 1,
    "经销商编码": 2,
    "渠道": 2,
  });
});

test("finance AI schema matches common month and sales header variants", () => {
  const schema = inferFinanceSchema([
    { "销售月份": "2025-03", "大区": "拉美", "销量(台)": 100, "净收入": 9000 },
  ]);

  assert.equal(schema.monthColumn, "销售月份");
  assert.equal(schema.salesColumn, "销量(台)");
});

test("normalizePeriodValue supports separated and date-like month formats", () => {
  assert.deepEqual(normalizePeriodValue("2025/03"), { key: "2025-03", label: "2025年3月", sort: 24303 });
  assert.deepEqual(normalizePeriodValue("2025.03"), { key: "2025-03", label: "2025年3月", sort: 24303 });
  assert.deepEqual(normalizePeriodValue("2025-03-01"), { key: "2025-03", label: "2025年3月", sort: 24303 });
});

test("toFinanceNumber preserves unit scale, parentheses negatives, and percentages", () => {
  assert.equal(toFinanceNumber("1.2亿元"), 120000000);
  assert.equal(toFinanceNumber("3万元"), 30000);
  assert.equal(toFinanceNumber("(2,500元)"), -2500);
  assert.equal(toFinanceNumber("12.5%"), 0.125);
});

test("finance AI schema maps margin total aliases to unit margin metrics", () => {
  for (const column of ["毛利", "边际总额", "贡献边际"]) {
    const schema = inferFinanceSchema([
      { "月份": "2025-03", "国家": "巴西", "销量": 100, [column]: 2000 },
    ]);

    const unitMargin = schema.unitMetrics.find((metric) => metric.name === "单车边际");
    assert.equal(unitMargin?.numeratorColumn, column);
  }
});
