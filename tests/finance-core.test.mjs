import test from "node:test";
import assert from "node:assert/strict";

let financeCore = {};
try {
  financeCore = (await import("../public/tools/shared/finance-core.js")).default ?? {};
} catch {
  // The first TDD run intentionally exercises the not-yet-created shared core.
}

let typedFinanceCore = {};
try {
  typedFinanceCore = await import("../src/lib/finance/core.ts");
} catch {
  // The typed adapter is introduced after the browser-compatible core is green.
}

const {
  normalizeFinancePeriod,
  parseFinanceNumber,
  parseRfc4180Csv,
  inferMetricAggregation,
  aggregateMetricRows,
} = financeCore;

test("shared finance core exposes the required parsing and aggregation API", () => {
  assert.equal(typeof normalizeFinancePeriod, "function");
  assert.equal(typeof parseFinanceNumber, "function");
  assert.equal(typeof parseRfc4180Csv, "function");
  assert.equal(typeof inferMetricAggregation, "function");
  assert.equal(typeof aggregateMetricRows, "function");
});

test("typed finance core exposes the shared API to Next modules", () => {
  assert.equal(typeof typedFinanceCore.normalizeFinancePeriod, "function");
  assert.equal(typeof typedFinanceCore.parseFinanceNumber, "function");
  assert.equal(typeof typedFinanceCore.parseRfc4180Csv, "function");
  assert.equal(typeof typedFinanceCore.inferMetricAggregation, "function");
  assert.equal(typeof typedFinanceCore.aggregateMetricRows, "function");
  assert.equal(typeof typedFinanceCore.inferFinanceFieldRoles, "function");
});

test("field role inference prioritizes explicit roles then headers and sample types", () => {
  const result = typedFinanceCore.inferFinanceFieldRoles([
    { 月份: "2026-01", 净收入: 100, 销量: 10, 渠道: "经销", 空列: "", 手工口径: 1 },
    { 月份: "2026-02", 净收入: 120, 销量: 12, 渠道: "直营", 空列: "", 手工口径: 2 },
  ], {
    explicitRoles: { 手工口径: "dimension" },
  });

  assert.equal(result.periodColumn, "月份");
  assert.equal(result.denominatorColumn, "销量");
  assert.deepEqual(result.dimensionColumns, ["渠道", "手工口径"]);
  assert.deepEqual(result.metricColumns, ["净收入"]);
  assert.deepEqual(result.ambiguousColumns, ["空列"]);
});

test("period parser normalizes dates and common year-month formats", () => {
  const expected = { key: "2026-02", sort: 2026 * 12 + 2 };
  for (const value of [
    new Date(2026, 1, 15),
    "2026-2",
    "2026/02",
    "202602",
    "2026年2月",
  ]) {
    const period = normalizeFinancePeriod(value);
    assert.equal(period.key, expected.key);
    assert.equal(period.sort, expected.sort);
  }
});

test("period parser sorts October after February", () => {
  const periods = ["2026-10", "2026-1", "2026-2"]
    .map(normalizeFinancePeriod)
    .sort((a, b) => a.sort - b.sort);
  assert.deepEqual(periods.map((period) => period.key), ["2026-01", "2026-02", "2026-10"]);
});

test("numeric parser distinguishes valid blank and invalid values", () => {
  assert.deepEqual(parseFinanceNumber(""), { status: "blank", raw: "" });
  assert.deepEqual(parseFinanceNumber(null), { status: "blank", raw: null });
  assert.deepEqual(parseFinanceNumber("#VALUE!"), {
    status: "invalid",
    raw: "#VALUE!",
    reason: "not_numeric",
  });
  assert.deepEqual(parseFinanceNumber(Number.POSITIVE_INFINITY), {
    status: "invalid",
    raw: Number.POSITIVE_INFINITY,
    reason: "not_finite",
  });
});

test("numeric parser supports parentheses percentages and Chinese scales", () => {
  assert.equal(parseFinanceNumber("(300)").value, -300);
  assert.equal(parseFinanceNumber("12%").value, 0.12);
  assert.equal(parseFinanceNumber("500万").value, 5_000_000);
  assert.equal(parseFinanceNumber("1.2亿").value, 120_000_000);
});

test("RFC 4180 parser preserves multiline fields quotes BOM and trailing cells", () => {
  const csv = '\uFEFFname,note,value,\r\nA,"first\r\nsecond",1,\r\nB,"say ""hi""",-2,';
  assert.deepEqual(parseRfc4180Csv(csv), [
    ["name", "note", "value", ""],
    ["A", "first\r\nsecond", "1", ""],
    ["B", 'say "hi"', "-2", ""],
  ]);
});

test("RFC 4180 parser enforces resource limits", () => {
  assert.throws(
    () => parseRfc4180Csv("a,b\n1,2\n3,4", { maxRows: 2 }),
    (error) => error?.code === "csv_row_limit",
  );
  assert.throws(
    () => parseRfc4180Csv("a,b,c", { maxColumns: 2 }),
    (error) => error?.code === "csv_column_limit",
  );
});

test("metric aggregation inference does not sum ratios NPS or snapshots", () => {
  const headers = ["销量", "净收入", "边际", "边际率", "NPS", "期末库存"];
  assert.deepEqual(inferMetricAggregation("边际", headers), { mode: "sum" });
  assert.deepEqual(inferMetricAggregation("边际率", headers), {
    mode: "ratio",
    numeratorColumn: "边际",
    denominatorColumn: "净收入",
  });
  assert.deepEqual(inferMetricAggregation("NPS", headers), {
    mode: "non_aggregatable",
    reason: "rate_requires_source_counts",
  });
  assert.deepEqual(inferMetricAggregation("期末库存", headers), {
    mode: "snapshot",
    periodColumn: "月份",
  });
});

test("metric aggregation recomputes known ratios and omits non-aggregatable totals", () => {
  const rows = [
    { 月份: "2026-01", 净收入: 100, 边际: 20, 边际率: 0.2, NPS: 8 },
    { 月份: "2026-02", 净收入: 300, 边际: 90, 边际率: 0.3, NPS: 6 },
  ];
  assert.equal(aggregateMetricRows(rows, inferMetricAggregation("边际率", Object.keys(rows[0])), "边际率"), 0.275);
  assert.equal(aggregateMetricRows(rows, inferMetricAggregation("NPS", Object.keys(rows[0])), "NPS"), null);
});
