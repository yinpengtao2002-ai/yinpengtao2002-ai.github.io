# Finance AI Assistant Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build `/tools/finance-ai-assistant`, an independent chat-style finance analysis tool that reads one uploaded operating-detail table in browser memory, computes trusted metrics locally, and embeds 1-3 chart modules inside AI chat replies.

**Architecture:** The browser owns the full uploaded dataset and all deterministic calculations. A shared `src/lib/finance-ai` core handles schema inference, metric math, action validation, chart specs, and AI context packages; `/api/tools/finance-ai-assistant` only plans actions and explains calculated summaries from bounded context. The UI renders upload state, continuous chat, and Plotly chart cards inside assistant messages while remaining isolated from the global site assistant.

**Tech Stack:** Next.js App Router, React 19, TypeScript, SheetJS `xlsx`, Plotly via `plotly.js-dist-min`, Node `node:test`, existing DeepSeek/OpenAI-compatible provider configuration.

---

## File Structure

- Create `src/lib/finance-ai/types.ts`: shared TypeScript types for schema, metrics, actions, chart specs, summaries, and chat messages.
- Create `src/lib/finance-ai/schema.ts`: parse periods, normalize headers, infer month/sales/dimension/metric fields, build data profile.
- Create `src/lib/finance-ai/metrics.ts`: apply filters, aggregate totals, compute unit metrics, MoM/YoY snapshots, rankings, and period bridges.
- Create `src/lib/finance-ai/actions.ts`: validate AI action modules against inferred schema and enforce the 1-3 module limit.
- Create `src/lib/finance-ai/charts.ts`: convert computed results into compact Plotly specs for trend, horizontal bar, and waterfall charts.
- Create `src/lib/finance-ai/context.ts`: build stable AI planning context and bounded explanation summaries.
- Create `src/app/api/tools/finance-ai-assistant/route.ts`: provider-backed `plan` and `explain` endpoint.
- Create `src/app/tools/finance-ai-assistant/page.tsx`: route metadata and client tool mount.
- Create `src/app/tools/finance-ai-assistant/FinanceAIAssistantTool.tsx`: upload parsing, chat state, AI plan/explain calls, embedded chart-card rendering.
- Modify `src/components/ClientShell.tsx`: hide decorative extras and global assistant for this immersive tool page.
- Modify `src/app/globals.css`: add restrained tool styles matching existing finance surfaces.
- Modify `src/app/sitemap.ts`: include `/tools/finance-ai-assistant`.
- Modify `src/lib/data/thinkingLabContent.ts`: add a hosted-tool content item beside `studyCardsContent` and include it in `thinkingLabContent`.
- Create `tests/finance-ai-assistant-contract.test.mjs`: source-level route/UI/API contract tests.
- Create `tests/finance-ai-core.test.mjs`: executable tests for schema inference, metric math, snapshots, rankings, bridges, and action validation.

## Task 1: Shared Types And Schema Inference

**Files:**
- Create: `src/lib/finance-ai/types.ts`
- Create: `src/lib/finance-ai/schema.ts`
- Test: `tests/finance-ai-core.test.mjs`

- [ ] **Step 1: Write failing schema tests**

Create `tests/finance-ai-core.test.mjs` with this initial content:

```js
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
```

- [ ] **Step 2: Run schema tests and verify failure**

Run: `node --test tests/finance-ai-core.test.mjs`

Expected: FAIL because `src/lib/finance-ai/schema.ts` does not exist.

- [ ] **Step 3: Create shared types**

Create `src/lib/finance-ai/types.ts`:

```ts
export type FinancePeriod = {
  key: string;
  label: string;
  sort: number;
};

export type FinanceMetricKind = "total" | "unit";

export type FinanceTotalMetric = {
  kind: "total";
  name: string;
  column: string;
};

export type FinanceUnitMetric = {
  kind: "unit";
  name: string;
  numeratorColumn: string;
  denominatorColumn: string;
};

export type FinanceMetric = FinanceTotalMetric | FinanceUnitMetric;

export type FinanceSchemaIssueCode = "missing_month" | "missing_sales" | "missing_metric";

export type FinanceSchemaIssue = {
  code: FinanceSchemaIssueCode;
  message: string;
};

export type FinanceDataProfile = {
  rowCount: number;
  periods: FinancePeriod[];
  dimensionValueCounts: Record<string, number>;
};

export type FinanceSchema = {
  headers: string[];
  monthColumn: string;
  salesColumn: string;
  dimensionColumns: string[];
  totalMetrics: FinanceTotalMetric[];
  unitMetrics: FinanceUnitMetric[];
  excludedMetricColumns: string[];
  requiredIssues: FinanceSchemaIssue[];
  profile: FinanceDataProfile;
};

export type FinanceRow = Record<string, unknown>;

export type FinanceFilter = Record<string, string[]>;
```

- [ ] **Step 4: Create schema inference implementation**

Create `src/lib/finance-ai/schema.ts`:

```ts
import type {
  FinanceDataProfile,
  FinancePeriod,
  FinanceRow,
  FinanceSchema,
  FinanceSchemaIssue,
  FinanceTotalMetric,
  FinanceUnitMetric,
} from "./types";

const MONTH_ALIASES = ["月份", "月度", "月", "期间", "年月", "会计期间", "month", "date", "period"];
const SALES_ALIASES = ["销量", "销售量", "发车量", "台数", "数量", "volume", "qty", "quantity", "units"];
const NON_DIMENSION_COLUMNS = ["备注", "说明", "单位", "口径", "版本", "数据类型", "类型", "scenario"];
const RATE_TOKENS = ["率", "占比", "%", "单车", "单位", "平均", "均价", "单价", "rate", "ratio", "perunit", "unit"];

const UNIT_METRIC_BLUEPRINTS = [
  { name: "单车净收入", numerators: ["净收入", "收入", "营业收入", "销售收入", "Revenue", "revenue"] },
  { name: "单车成本", numerators: ["成本", "总成本", "变动成本", "Cost", "cost"] },
  { name: "单车边际", numerators: ["边际总额", "边际", "贡献边际", "毛利", "Margin", "margin"] },
  { name: "单车利润", numerators: ["利润", "利润总额", "Profit", "profit"] },
];

export function normalizeHeaderToken(value: unknown) {
  return String(value ?? "")
    .replace(/^\uFEFF/, "")
    .replace(/[\s_\-（）()%]/g, "")
    .trim()
    .toLowerCase();
}

function compactHeader(value: unknown) {
  return String(value ?? "").replace(/^\uFEFF/, "").trim();
}

function hasAlias(header: string, aliases: string[]) {
  const normalized = normalizeHeaderToken(header);
  return aliases.some((alias) => {
    const candidate = normalizeHeaderToken(alias);
    return normalized === candidate || normalized.includes(candidate) || candidate.includes(normalized);
  });
}

export function normalizePeriodValue(value: unknown): FinancePeriod | null {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return makePeriod(value.getFullYear(), value.getMonth() + 1);
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    const compact = Math.round(value);
    if (compact >= 190001 && compact <= 299912) {
      return makePeriod(Math.floor(compact / 100), compact % 100);
    }
  }

  const raw = String(value ?? "").trim();
  if (!raw) return null;

  let match = raw.match(/^(\d{4})(\d{2})$/);
  if (match) return makePeriod(Number(match[1]), Number(match[2]));

  match = raw.match(/(\d{4})\s*年\s*(\d{1,2})\s*月/);
  if (match) return makePeriod(Number(match[1]), Number(match[2]));

  match = raw.match(/(\d{4})[-/.](\d{1,2})/);
  if (match) return makePeriod(Number(match[1]), Number(match[2]));

  return null;
}

function makePeriod(year: number, month: number): FinancePeriod | null {
  if (!Number.isFinite(year) || !Number.isFinite(month) || month < 1 || month > 12) return null;
  return {
    key: `${year}-${String(month).padStart(2, "0")}`,
    label: `${year}年${month}月`,
    sort: year * 12 + month,
  };
}

export function toFinanceNumber(value: unknown) {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  if (value === null || value === undefined || value instanceof Date) return 0;
  const raw = String(value).trim();
  if (!raw) return 0;
  const isPercent = raw.includes("%");
  const isNegative = raw.includes("(") && raw.includes(")");
  const cleaned = raw
    .replace(/[,，\s￥¥$元台辆个件]/g, "")
    .replace(/[万亿]/g, "")
    .replace(/%/g, "")
    .replace(/[()]/g, "")
    .trim();
  const numeric = Number(cleaned);
  if (!Number.isFinite(numeric)) return 0;
  const signed = isNegative ? -numeric : numeric;
  return isPercent ? signed / 100 : signed;
}

function isNumericColumn(rows: FinanceRow[], column: string) {
  const values = rows
    .slice(0, 80)
    .map((row) => row[column])
    .filter((value) => value !== null && value !== undefined && String(value).trim() !== "");
  if (!values.length) return false;
  const numericCount = values.filter((value) => Number.isFinite(toFinanceNumber(value))).length;
  return numericCount / values.length >= 0.7;
}

function isRateLikeColumn(column: string) {
  const normalized = normalizeHeaderToken(column);
  return RATE_TOKENS.some((token) => normalized.includes(normalizeHeaderToken(token)) || column.includes(token));
}

function pickColumn(candidates: string[], columns: string[]) {
  return columns.find((column) => candidates.some((candidate) => normalizeHeaderToken(column) === normalizeHeaderToken(candidate)))
    || columns.find((column) => candidates.some((candidate) => normalizeHeaderToken(column).includes(normalizeHeaderToken(candidate))))
    || "";
}

function buildUnitMetrics(totalMetrics: FinanceTotalMetric[], salesColumn: string): FinanceUnitMetric[] {
  const metricColumns = totalMetrics.map((metric) => metric.column);
  return UNIT_METRIC_BLUEPRINTS.flatMap((blueprint) => {
    const numeratorColumn = pickColumn(blueprint.numerators, metricColumns);
    if (!numeratorColumn || !salesColumn || numeratorColumn === salesColumn) return [];
    return [{
      kind: "unit" as const,
      name: blueprint.name,
      numeratorColumn,
      denominatorColumn: salesColumn,
    }];
  });
}

function buildProfile(rows: FinanceRow[], monthColumn: string, dimensionColumns: string[]): FinanceDataProfile {
  const periodMap = new Map<string, FinancePeriod>();
  rows.forEach((row) => {
    const period = monthColumn ? normalizePeriodValue(row[monthColumn]) : null;
    if (period) periodMap.set(period.key, period);
  });

  const dimensionValueCounts = Object.fromEntries(dimensionColumns.map((dimension) => {
    const values = new Set(rows.map((row) => String(row[dimension] ?? "").trim() || "未分类"));
    return [dimension, values.size];
  }));

  return {
    rowCount: rows.length,
    periods: Array.from(periodMap.values()).sort((a, b) => a.sort - b.sort),
    dimensionValueCounts,
  };
}

export function inferFinanceSchema(inputRows: FinanceRow[]): FinanceSchema {
  const rows = inputRows.map((row) => Object.fromEntries(Object.entries(row).map(([key, value]) => [compactHeader(key), value])));
  const headers = Object.keys(rows.find((row) => Object.keys(row).length > 0) ?? {}).filter(Boolean);
  const monthColumn = headers.find((header) => hasAlias(header, MONTH_ALIASES)) ?? "";
  const salesColumn = headers.find((header) => hasAlias(header, SALES_ALIASES)) ?? "";
  const salesIndex = salesColumn ? headers.indexOf(salesColumn) : -1;
  const nonDimensionSet = new Set(NON_DIMENSION_COLUMNS.map(normalizeHeaderToken));

  const dimensionColumns = headers.filter((header, index) => {
    if (header === monthColumn || header === salesColumn) return false;
    if (salesIndex < 0 || index >= salesIndex) return false;
    return !nonDimensionSet.has(normalizeHeaderToken(header));
  });

  const metricCandidates = headers.filter((header, index) => {
    if (header === monthColumn || header === salesColumn) return false;
    return salesIndex >= 0 && index > salesIndex;
  });
  const excludedMetricColumns = metricCandidates.filter((column) => isRateLikeColumn(column));
  const totalMetrics = metricCandidates
    .filter((column) => !excludedMetricColumns.includes(column) && isNumericColumn(rows, column))
    .map<FinanceTotalMetric>((column) => ({ kind: "total", name: column.replace(/总额$/u, "").replace(/金额$/u, "").trim() || column, column }));
  const unitMetrics = buildUnitMetrics(totalMetrics, salesColumn);
  const requiredIssues: FinanceSchemaIssue[] = [];

  if (!monthColumn) requiredIssues.push({ code: "missing_month", message: "需要月份、年月或期间列。" });
  if (!salesColumn) requiredIssues.push({ code: "missing_sales", message: "需要销量列，用于单车指标和经营口径。" });
  if (totalMetrics.length === 0) requiredIssues.push({ code: "missing_metric", message: "销量列之后需要至少一个数值指标。" });

  return {
    headers,
    monthColumn,
    salesColumn,
    dimensionColumns,
    totalMetrics,
    unitMetrics,
    excludedMetricColumns,
    requiredIssues,
    profile: buildProfile(rows, monthColumn, dimensionColumns),
  };
}
```

- [ ] **Step 5: Run schema tests**

Run: `node --test tests/finance-ai-core.test.mjs`

Expected: PASS for the three schema tests.

- [ ] **Step 6: Commit schema core**

```bash
git add src/lib/finance-ai/types.ts src/lib/finance-ai/schema.ts tests/finance-ai-core.test.mjs
git commit -m "Add finance AI schema inference"
```

## Task 2: Deterministic Metric Engine

**Files:**
- Modify: `src/lib/finance-ai/types.ts`
- Create: `src/lib/finance-ai/metrics.ts`
- Modify: `tests/finance-ai-core.test.mjs`

- [ ] **Step 1: Add failing metric tests**

Append to `tests/finance-ai-core.test.mjs`:

```js
import {
  buildBarRank,
  buildMetricSnapshot,
  buildTrendSeries,
  buildWaterfallBridge,
} from "../src/lib/finance-ai/metrics.ts";

const metricRows = [
  { "月份": "2025-03", "大区": "拉美", "国家": "巴西", "车型": "T1D", "销量": 100, "净收入": 9000, "成本": -7000, "边际": 3000 },
  { "月份": "2025-03", "大区": "拉美", "国家": "巴西", "车型": "T1D", "销量": 0, "净收入": 0, "成本": 0, "边际": 500 },
  { "月份": "2026-02", "大区": "拉美", "国家": "巴西", "车型": "T1D", "销量": 120, "净收入": 10800, "成本": -8400, "边际": 2400 },
  { "月份": "2026-03", "大区": "拉美", "国家": "巴西", "车型": "T1D", "销量": 100, "净收入": 10000, "成本": -7600, "边际": 3500 },
  { "月份": "2026-03", "大区": "拉美", "国家": "墨西哥", "车型": "T1E", "销量": 80, "净收入": 7200, "成本": -6100, "边际": 1100 },
];

test("metric snapshot computes unit metrics after aggregating zero-volume amount rows", () => {
  const schema = inferFinanceSchema(metricRows);
  const snapshot = buildMetricSnapshot(metricRows, schema, {
    metric: "单车边际",
    period: "2026-03",
    filters: { "国家": ["巴西"] },
    comparisons: ["mom", "yoy"],
  });

  assert.equal(snapshot.value, 35);
  assert.equal(snapshot.base.totalValue, 3500);
  assert.equal(snapshot.base.salesValue, 100);
  assert.equal(snapshot.base.rowCount, 1);
  assert.equal(snapshot.mom?.value, 20);
  assert.equal(snapshot.yoy?.value, 35);
  assert.equal(snapshot.yoy?.changeRate, 0);
});

test("trend series computes monthly unit values by sum metric over sum sales", () => {
  const schema = inferFinanceSchema(metricRows);
  const trend = buildTrendSeries(metricRows, schema, { metric: "单车边际", filters: { "国家": ["巴西"] } });

  assert.deepEqual(trend.points.map((point) => point.period), ["2025-03", "2026-02", "2026-03"]);
  assert.deepEqual(trend.points.map((point) => point.value), [35, 20, 35]);
});

test("bar rank can rank dimensions by period contribution", () => {
  const schema = inferFinanceSchema(metricRows);
  const rank = buildBarRank(metricRows, schema, {
    metric: "边际",
    dimension: "国家",
    period: "2026-03",
    sort: "value_desc",
    limit: 10,
  });

  assert.deepEqual(rank.items.map((item) => item.label), ["巴西", "墨西哥"]);
  assert.deepEqual(rank.items.map((item) => item.value), [3500, 1100]);
});

test("waterfall bridge groups top dimensions and ties to period movement", () => {
  const schema = inferFinanceSchema(metricRows);
  const bridge = buildWaterfallBridge(metricRows, schema, {
    metric: "边际",
    dimension: "国家",
    fromPeriod: "2026-02",
    toPeriod: "2026-03",
    limit: 5,
  });

  assert.equal(bridge.startValue, 2400);
  assert.equal(bridge.endValue, 4600);
  assert.equal(bridge.changeValue, 2200);
  assert.deepEqual(bridge.items.map((item) => [item.label, item.value]), [["巴西", 1100], ["墨西哥", 1100]]);
});
```

- [ ] **Step 2: Run metric tests and verify failure**

Run: `node --test tests/finance-ai-core.test.mjs`

Expected: FAIL because `src/lib/finance-ai/metrics.ts` does not exist.

- [ ] **Step 3: Extend shared types**

Add these exports to `src/lib/finance-ai/types.ts`:

```ts
export type FinanceComparisonKind = "mom" | "yoy";

export type MetricSnapshotRequest = {
  metric: string;
  period: string;
  filters?: FinanceFilter;
  comparisons?: FinanceComparisonKind[];
};

export type MetricValueBase = {
  period: string;
  value: number | null;
  totalValue: number;
  salesValue: number;
  rowCount: number;
  isComputable: boolean;
};

export type MetricComparison = MetricValueBase & {
  changeValue: number | null;
  changeRate: number | null;
};

export type MetricSnapshotResult = {
  metric: string;
  filters: FinanceFilter;
  base: MetricValueBase;
  value: number | null;
  mom?: MetricComparison;
  yoy?: MetricComparison;
};

export type TrendRequest = {
  metric: string;
  filters?: FinanceFilter;
  highlightPeriod?: string;
};

export type TrendPoint = MetricValueBase & {
  periodLabel: string;
};

export type TrendResult = {
  metric: string;
  filters: FinanceFilter;
  points: TrendPoint[];
  highlightPeriod?: string;
};

export type BarRankRequest = {
  metric: string;
  dimension: string;
  period?: string;
  filters?: FinanceFilter;
  comparison?: "mom";
  sort?: "value_desc" | "value_asc" | "change_desc" | "change_asc";
  limit?: number;
};

export type BarRankItem = {
  label: string;
  value: number | null;
  rowCount: number;
};

export type BarRankResult = {
  metric: string;
  dimension: string;
  items: BarRankItem[];
  filters: FinanceFilter;
  period?: string;
};

export type WaterfallBridgeRequest = {
  metric: string;
  dimension: string;
  fromPeriod: string;
  toPeriod: string;
  filters?: FinanceFilter;
  limit?: number;
};

export type WaterfallBridgeItem = {
  label: string;
  value: number;
};

export type WaterfallBridgeResult = {
  metric: string;
  dimension: string;
  fromPeriod: string;
  toPeriod: string;
  startValue: number;
  endValue: number;
  changeValue: number;
  items: WaterfallBridgeItem[];
  filters: FinanceFilter;
};
```

- [ ] **Step 4: Create metric engine**

Create `src/lib/finance-ai/metrics.ts`:

```ts
import { normalizePeriodValue, toFinanceNumber } from "./schema";
import type {
  BarRankRequest,
  BarRankResult,
  FinanceFilter,
  FinanceMetric,
  FinanceRow,
  FinanceSchema,
  MetricSnapshotRequest,
  MetricSnapshotResult,
  MetricValueBase,
  TrendRequest,
  TrendResult,
  WaterfallBridgeRequest,
  WaterfallBridgeResult,
} from "./types";

function normalizedRows(rows: FinanceRow[]) {
  return rows.map((row) => Object.fromEntries(Object.entries(row).map(([key, value]) => [String(key).replace(/^\uFEFF/, "").trim(), value])));
}

export function findMetric(schema: FinanceSchema, metricName: string): FinanceMetric | null {
  return [...schema.totalMetrics, ...schema.unitMetrics].find((metric) => metric.name === metricName || ("column" in metric && metric.column === metricName)) ?? null;
}

function previousMonthKey(periodKey: string) {
  const [year, month] = periodKey.split("-").map(Number);
  if (!Number.isFinite(year) || !Number.isFinite(month)) return "";
  const previousYear = month === 1 ? year - 1 : year;
  const previousMonth = month === 1 ? 12 : month - 1;
  return `${previousYear}-${String(previousMonth).padStart(2, "0")}`;
}

function previousYearKey(periodKey: string) {
  const [year, month] = periodKey.split("-");
  const numericYear = Number(year);
  if (!Number.isFinite(numericYear) || !month) return "";
  return `${numericYear - 1}-${month}`;
}

function rowPeriodKey(row: FinanceRow, schema: FinanceSchema) {
  return normalizePeriodValue(row[schema.monthColumn])?.key ?? "";
}

function matchesFilters(row: FinanceRow, filters: FinanceFilter = {}) {
  return Object.entries(filters).every(([column, selected]) => {
    if (!selected.length) return true;
    const value = String(row[column] ?? "").trim() || "未分类";
    return selected.includes(value);
  });
}

function rowsFor(rows: FinanceRow[], schema: FinanceSchema, filters: FinanceFilter = {}, period?: string) {
  return normalizedRows(rows).filter((row) => {
    if (period && rowPeriodKey(row, schema) !== period) return false;
    return matchesFilters(row, filters);
  });
}

function metricBase(rows: FinanceRow[], schema: FinanceSchema, metricName: string, period: string, filters: FinanceFilter = {}): MetricValueBase {
  const metric = findMetric(schema, metricName);
  const matchedRows = rowsFor(rows, schema, filters, period);
  if (!metric) {
    return { period, value: null, totalValue: 0, salesValue: 0, rowCount: matchedRows.length, isComputable: false };
  }

  const salesValue = matchedRows.reduce((sum, row) => sum + toFinanceNumber(row[schema.salesColumn]), 0);

  if (metric.kind === "unit") {
    const totalValue = matchedRows.reduce((sum, row) => sum + toFinanceNumber(row[metric.numeratorColumn]), 0);
    return {
      period,
      value: salesValue === 0 ? null : totalValue / salesValue,
      totalValue,
      salesValue,
      rowCount: matchedRows.length,
      isComputable: salesValue !== 0,
    };
  }

  const totalValue = matchedRows.reduce((sum, row) => sum + toFinanceNumber(row[metric.column]), 0);
  return {
    period,
    value: totalValue,
    totalValue,
    salesValue,
    rowCount: matchedRows.length,
    isComputable: true,
  };
}

function comparison(base: MetricValueBase, other: MetricValueBase) {
  const changeValue = base.value !== null && other.value !== null ? base.value - other.value : null;
  const changeRate = changeValue !== null && other.value !== null && other.value !== 0 ? changeValue / Math.abs(other.value) : null;
  return { ...other, changeValue, changeRate };
}

export function buildMetricSnapshot(
  rows: FinanceRow[],
  schema: FinanceSchema,
  request: MetricSnapshotRequest,
): MetricSnapshotResult {
  const filters = request.filters ?? {};
  const base = metricBase(rows, schema, request.metric, request.period, filters);
  const result: MetricSnapshotResult = { metric: request.metric, filters, base, value: base.value };
  if (request.comparisons?.includes("mom")) {
    result.mom = comparison(base, metricBase(rows, schema, request.metric, previousMonthKey(request.period), filters));
  }
  if (request.comparisons?.includes("yoy")) {
    result.yoy = comparison(base, metricBase(rows, schema, request.metric, previousYearKey(request.period), filters));
  }
  return result;
}

export function buildTrendSeries(rows: FinanceRow[], schema: FinanceSchema, request: TrendRequest): TrendResult {
  const filters = request.filters ?? {};
  const periodMap = new Map(schema.profile.periods.map((period) => [period.key, period]));
  const points = Array.from(periodMap.values()).map((period) => ({
    ...metricBase(rows, schema, request.metric, period.key, filters),
    periodLabel: period.label,
  }));
  return { metric: request.metric, filters, points, highlightPeriod: request.highlightPeriod };
}

export function buildBarRank(rows: FinanceRow[], schema: FinanceSchema, request: BarRankRequest): BarRankResult {
  const filters = request.filters ?? {};
  const matchedRows = rowsFor(rows, schema, filters, request.period);
  const labels = Array.from(new Set(matchedRows.map((row) => String(row[request.dimension] ?? "").trim() || "未分类")));
  const items = labels.map((label) => {
    const scopedFilters = { ...filters, [request.dimension]: [label] };
    const base = request.period
      ? metricBase(rows, schema, request.metric, request.period, scopedFilters)
      : buildTrendSeries(rows, schema, { metric: request.metric, filters: scopedFilters }).points.at(-1) ?? null;
    return { label, value: base?.value ?? null, rowCount: base?.rowCount ?? 0 };
  });
  const sort = request.sort ?? "value_desc";
  const multiplier = sort.endsWith("_asc") ? 1 : -1;
  const sorted = items.sort((a, b) => ((a.value ?? Number.NEGATIVE_INFINITY) - (b.value ?? Number.NEGATIVE_INFINITY)) * multiplier);
  return { metric: request.metric, dimension: request.dimension, items: sorted.slice(0, request.limit ?? 10), filters, period: request.period };
}

export function buildWaterfallBridge(
  rows: FinanceRow[],
  schema: FinanceSchema,
  request: WaterfallBridgeRequest,
): WaterfallBridgeResult {
  const filters = request.filters ?? {};
  const start = metricBase(rows, schema, request.metric, request.fromPeriod, filters).value ?? 0;
  const end = metricBase(rows, schema, request.metric, request.toPeriod, filters).value ?? 0;
  const matchedRows = rowsFor(rows, schema, filters);
  const labels = Array.from(new Set(matchedRows.map((row) => String(row[request.dimension] ?? "").trim() || "未分类")));
  const changes = labels.map((label) => {
    const scopedFilters = { ...filters, [request.dimension]: [label] };
    const fromValue = metricBase(rows, schema, request.metric, request.fromPeriod, scopedFilters).value ?? 0;
    const toValue = metricBase(rows, schema, request.metric, request.toPeriod, scopedFilters).value ?? 0;
    return { label, value: toValue - fromValue };
  }).sort((a, b) => Math.abs(b.value) - Math.abs(a.value));

  const limit = request.limit ?? 8;
  const topItems = changes.slice(0, limit);
  const otherValue = changes.slice(limit).reduce((sum, item) => sum + item.value, 0);
  const items = otherValue === 0 ? topItems : [...topItems, { label: "其他", value: otherValue }];

  return {
    metric: request.metric,
    dimension: request.dimension,
    fromPeriod: request.fromPeriod,
    toPeriod: request.toPeriod,
    startValue: start,
    endValue: end,
    changeValue: end - start,
    items,
    filters,
  };
}
```

- [ ] **Step 5: Run metric tests**

Run: `node --test tests/finance-ai-core.test.mjs`

Expected: PASS for schema and metric tests.

- [ ] **Step 6: Commit metric engine**

```bash
git add src/lib/finance-ai/types.ts src/lib/finance-ai/metrics.ts tests/finance-ai-core.test.mjs
git commit -m "Add finance AI metric engine"
```

## Task 3: Action Validation And Chart Specs

**Files:**
- Modify: `src/lib/finance-ai/types.ts`
- Create: `src/lib/finance-ai/actions.ts`
- Create: `src/lib/finance-ai/charts.ts`
- Modify: `tests/finance-ai-core.test.mjs`

- [ ] **Step 1: Add failing action and chart tests**

Append to `tests/finance-ai-core.test.mjs`:

```js
import { validateFinanceActionPlan } from "../src/lib/finance-ai/actions.ts";
import { buildChartSpec } from "../src/lib/finance-ai/charts.ts";

test("action validator enforces module limit and real schema fields", () => {
  const schema = inferFinanceSchema(metricRows);
  const valid = validateFinanceActionPlan(schema, {
    modules: [
      { type: "metric_snapshot", metric: "单车边际", period: "2026-03", filters: { "国家": ["巴西"] }, comparisons: ["mom", "yoy"] },
      { type: "trend_chart", metric: "单车边际", filters: { "国家": ["巴西"] }, highlightPeriod: "2026-03" },
    ],
  });

  assert.equal(valid.ok, true);
  assert.equal(valid.modules.length, 2);

  const invalid = validateFinanceActionPlan(schema, {
    modules: [
      { type: "bar_rank", metric: "不存在指标", dimension: "国家", period: "2026-03" },
      { type: "trend_chart", metric: "边际" },
      { type: "trend_chart", metric: "净收入" },
      { type: "trend_chart", metric: "成本" },
    ],
  });

  assert.equal(invalid.ok, false);
  assert.match(invalid.errors.join("\n"), /最多生成 3 个模块/);
  assert.match(invalid.errors.join("\n"), /不存在指标/);
});

test("chart specs are compact and identify supported chart types", () => {
  const schema = inferFinanceSchema(metricRows);
  const trend = buildTrendSeries(metricRows, schema, { metric: "单车边际", filters: { "国家": ["巴西"] }, highlightPeriod: "2026-03" });
  const spec = buildChartSpec({ type: "trend_chart", title: "巴西单车边际趋势", result: trend });

  assert.equal(spec.kind, "trend_chart");
  assert.equal(spec.title, "巴西单车边际趋势");
  assert.equal(spec.data.length >= 1, true);
  assert.equal(spec.layout.paper_bgcolor, "rgba(0,0,0,0)");
  assert.equal(spec.config.displayModeBar, false);
});
```

- [ ] **Step 2: Run tests and verify failure**

Run: `node --test tests/finance-ai-core.test.mjs`

Expected: FAIL because `actions.ts` and `charts.ts` do not exist.

- [ ] **Step 3: Extend shared types for actions and charts**

Add these exports to `src/lib/finance-ai/types.ts`:

```ts
export type FinanceActionModule =
  | ({ type: "metric_snapshot"; chart?: { type: "trend_chart"; highlightPeriod?: string } } & MetricSnapshotRequest)
  | ({ type: "trend_chart" } & TrendRequest)
  | ({ type: "bar_rank" } & BarRankRequest)
  | ({ type: "waterfall_bridge" } & WaterfallBridgeRequest);

export type FinanceActionPlan = {
  modules: FinanceActionModule[];
};

export type FinanceActionValidationResult =
  | { ok: true; modules: FinanceActionModule[]; errors: [] }
  | { ok: false; modules: FinanceActionModule[]; errors: string[] };

export type FinanceChartKind = "trend_chart" | "bar_rank" | "waterfall_bridge";

export type FinanceChartSpec = {
  kind: FinanceChartKind;
  title: string;
  data: Array<Record<string, unknown>>;
  layout: Record<string, unknown>;
  config: Record<string, unknown>;
  note: string;
};
```

- [ ] **Step 4: Create action validation implementation**

Create `src/lib/finance-ai/actions.ts`:

```ts
import { findMetric } from "./metrics";
import type {
  FinanceActionModule,
  FinanceActionPlan,
  FinanceActionValidationResult,
  FinanceSchema,
} from "./types";

const ACTION_TYPES = new Set(["metric_snapshot", "trend_chart", "bar_rank", "waterfall_bridge"]);

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function normalizeModule(value: unknown): FinanceActionModule | null {
  const record = asRecord(value);
  if (!ACTION_TYPES.has(String(record.type))) return null;
  return record as FinanceActionModule;
}

function validateMetric(schema: FinanceSchema, module: FinanceActionModule, errors: string[]) {
  if (!findMetric(schema, module.metric)) errors.push(`指标不存在：${module.metric}`);
}

function validateDimension(schema: FinanceSchema, dimension: unknown, errors: string[]) {
  if (typeof dimension !== "string") {
    errors.push("排名或瀑布桥需要维度字段。");
    return;
  }
  if (!schema.dimensionColumns.includes(dimension)) errors.push(`维度不存在：${dimension}`);
}

function validateFilters(schema: FinanceSchema, module: FinanceActionModule, errors: string[]) {
  const filters = "filters" in module ? module.filters ?? {} : {};
  Object.keys(filters).forEach((field) => {
    if (!schema.dimensionColumns.includes(field)) errors.push(`筛选字段不存在：${field}`);
  });
}

export function validateFinanceActionPlan(schema: FinanceSchema, plan: unknown): FinanceActionValidationResult {
  const rawModules = Array.isArray(asRecord(plan).modules) ? asRecord(plan).modules as unknown[] : [];
  const modules = rawModules.map(normalizeModule).filter(Boolean) as FinanceActionModule[];
  const errors: string[] = [];

  if (modules.length === 0) errors.push("需要至少 1 个分析模块。");
  if (rawModules.length > 3 || modules.length > 3) errors.push("每轮最多生成 3 个模块。");
  if (modules.length !== rawModules.length) errors.push("存在不支持的分析动作。");

  modules.forEach((module) => {
    validateMetric(schema, module, errors);
    validateFilters(schema, module, errors);
    if (module.type === "bar_rank") validateDimension(schema, module.dimension, errors);
    if (module.type === "waterfall_bridge") validateDimension(schema, module.dimension, errors);
  });

  return errors.length ? { ok: false, modules: modules.slice(0, 3), errors } : { ok: true, modules, errors: [] };
}
```

- [ ] **Step 5: Create chart spec implementation**

Create `src/lib/finance-ai/charts.ts`:

```ts
import type {
  BarRankResult,
  FinanceChartSpec,
  TrendResult,
  WaterfallBridgeResult,
} from "./types";

const COLORS = {
  orange: "#d97757",
  blue: "#5c8fba",
  green: "#788c5d",
  red: "#b65f55",
  text: "#141413",
  muted: "#747168",
  grid: "#e8e6dc",
};

const baseLayout = {
  paper_bgcolor: "rgba(0,0,0,0)",
  plot_bgcolor: "rgba(0,0,0,0)",
  font: { family: "PingFang SC, Microsoft YaHei, Helvetica Neue, Arial, sans-serif", color: COLORS.text },
  margin: { t: 30, r: 28, b: 42, l: 52 },
};

const baseConfig = { displayModeBar: false, responsive: true };

type ChartInput =
  | { type: "trend_chart"; title: string; result: TrendResult }
  | { type: "bar_rank"; title: string; result: BarRankResult }
  | { type: "waterfall_bridge"; title: string; result: WaterfallBridgeResult };

export function buildChartSpec(input: ChartInput): FinanceChartSpec {
  if (input.type === "trend_chart") {
    return {
      kind: "trend_chart",
      title: input.title,
      data: [{
        type: "scatter",
        mode: "lines+markers",
        x: input.result.points.map((point) => point.periodLabel),
        y: input.result.points.map((point) => point.value),
        line: { color: COLORS.blue, width: 2.5 },
        marker: { size: input.result.points.map((point) => point.period === input.result.highlightPeriod ? 10 : 6), color: COLORS.blue },
        hovertemplate: "%{x}<br>%{y:,.2f}<extra></extra>",
      }],
      layout: {
        ...baseLayout,
        xaxis: { gridcolor: COLORS.grid, zeroline: false },
        yaxis: { gridcolor: COLORS.grid, zeroline: false },
      },
      config: baseConfig,
      note: "按月份聚合后展示趋势；单车指标使用总额除以销量。",
    };
  }

  if (input.type === "bar_rank") {
    return {
      kind: "bar_rank",
      title: input.title,
      data: [{
        type: "bar",
        orientation: "h",
        x: input.result.items.map((item) => item.value),
        y: input.result.items.map((item) => item.label),
        marker: { color: COLORS.green },
        text: input.result.items.map((item) => item.value === null ? "不可计算" : String(Math.round(item.value))),
        textposition: "outside",
        hovertemplate: "%{y}<br>%{x:,.2f}<extra></extra>",
      }],
      layout: {
        ...baseLayout,
        margin: { t: 30, r: 56, b: 34, l: 82 },
        xaxis: { gridcolor: COLORS.grid, zeroline: false },
        yaxis: { automargin: true },
      },
      config: baseConfig,
      note: "横向柱状图展示维度排名，不额外展示数字表。",
    };
  }

  return {
    kind: "waterfall_bridge",
    title: input.title,
    data: [{
      type: "waterfall",
      orientation: "v",
      measure: ["absolute", ...input.result.items.map(() => "relative"), "total"],
      x: [input.result.fromPeriod, ...input.result.items.map((item) => item.label), input.result.toPeriod],
      y: [input.result.startValue, ...input.result.items.map((item) => item.value), input.result.endValue],
      connector: { line: { color: COLORS.grid } },
      increasing: { marker: { color: COLORS.green } },
      decreasing: { marker: { color: COLORS.red } },
      totals: { marker: { color: COLORS.blue } },
      hovertemplate: "%{x}<br>%{y:,.2f}<extra></extra>",
    }],
    layout: {
      ...baseLayout,
      margin: { t: 30, r: 28, b: 52, l: 58 },
      yaxis: { gridcolor: COLORS.grid, zeroline: true, zerolinecolor: COLORS.grid },
    },
    config: baseConfig,
    note: "瀑布桥按维度拆解两个期间的变化贡献。",
  };
}
```

- [ ] **Step 6: Run core tests**

Run: `node --test tests/finance-ai-core.test.mjs`

Expected: PASS.

- [ ] **Step 7: Commit actions and charts**

```bash
git add src/lib/finance-ai/types.ts src/lib/finance-ai/actions.ts src/lib/finance-ai/charts.ts tests/finance-ai-core.test.mjs
git commit -m "Add finance AI actions and chart specs"
```

## Task 4: AI Context And API Route

**Files:**
- Create: `src/lib/finance-ai/context.ts`
- Create: `src/app/api/tools/finance-ai-assistant/route.ts`
- Create: `tests/finance-ai-assistant-contract.test.mjs`

- [ ] **Step 1: Write failing API contract tests**

Create `tests/finance-ai-assistant-contract.test.mjs`:

```js
import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

async function readProjectFile(path) {
  return readFile(new URL(`../${path}`, import.meta.url), "utf8");
}

test("finance AI assistant API exposes planning and explanation responsibilities", async () => {
  const route = await readProjectFile("src/app/api/tools/finance-ai-assistant/route.ts");
  const context = await readProjectFile("src/lib/finance-ai/context.ts");

  assert.match(route, /\/api\/tools\/finance-ai-assistant/);
  assert.match(route, /mode/);
  assert.match(route, /plan/);
  assert.match(route, /explain/);
  assert.match(route, /DEEPSEEK_API_KEY/);
  assert.match(route, /CHAT_API_KEY/);
  assert.match(route, /response_format/);
  assert.match(route, /modules/);
  assert.match(route, /AI 不负责计算数字/);
  assert.doesNotMatch(route, /完整底稿/);
  assert.match(context, /buildFinanceAIPlanningContext/);
  assert.match(context, /buildFinanceAIExplanationPrompt/);
  assert.match(context, /最多生成 3 个模块/);
  assert.match(context, /metric_snapshot/);
  assert.match(context, /trend_chart/);
  assert.match(context, /bar_rank/);
  assert.match(context, /waterfall_bridge/);
});
```

- [ ] **Step 2: Run API contract test and verify failure**

Run: `node --test tests/finance-ai-assistant-contract.test.mjs`

Expected: FAIL because API and context files do not exist.

- [ ] **Step 3: Create AI context builders**

Create `src/lib/finance-ai/context.ts`:

```ts
import type { FinanceSchema } from "./types";

export type FinanceAIChatState = {
  recentQuestions: string[];
  currentMetric?: string;
  currentFilters?: Record<string, string[]>;
  chartHistory?: Array<{ type: string; title: string }>;
};

export function buildFinanceAIPlanningContext(schema: FinanceSchema, state: FinanceAIChatState = {}) {
  return [
    "你是财务分析 AI 助手，只负责把用户问题转成结构化分析动作。",
    "AI 不负责计算数字；所有数值、环比、同比、排名和图表数据都由前端确定性计算。",
    "每轮最少 1 个模块，最多生成 3 个模块。",
    "只允许这些动作：metric_snapshot、trend_chart、bar_rank、waterfall_bridge。",
    "图表会嵌入 AI 聊天消息，所以模块标题要像对话回复的一部分。",
    "可用字段：",
    `月份列：${schema.monthColumn || "未识别"}`,
    `销量列：${schema.salesColumn || "未识别"}`,
    `维度列：${schema.dimensionColumns.join(" / ") || "无"}`,
    `总额指标：${schema.totalMetrics.map((metric) => metric.name).join(" / ") || "无"}`,
    `单车指标：${schema.unitMetrics.map((metric) => metric.name).join(" / ") || "无"}`,
    `可用月份：${schema.profile.periods.map((period) => period.key).join(" / ") || "无"}`,
    `最近问题：${state.recentQuestions.slice(-4).join(" / ") || "无"}`,
    `当前指标：${state.currentMetric || "无"}`,
    `当前筛选：${JSON.stringify(state.currentFilters ?? {})}`,
    "只输出 JSON，不输出 Markdown。JSON 结构：",
    '{"modules":[{"type":"metric_snapshot","metric":"单车边际","period":"2026-03","filters":{"国家":["巴西"]},"comparisons":["mom","yoy"]}]}',
  ].join("\n");
}

export function buildFinanceAIExplanationPrompt(input: {
  userQuestion: string;
  computedSummary: unknown;
}) {
  return [
    "你是财务分析 AI 助手。请基于前端已经计算好的结果，用中文给出简短解释。",
    "不要重新计算数字，不要编造字段，不要引入计算结果之外的数据。",
    "如果结果里出现不可计算、缺少上月或缺少年同期，需要直接说明。",
    "回复应像聊天消息，先给结论，再补一句口径。",
    `用户问题：${input.userQuestion}`,
    "计算结果：",
    JSON.stringify(input.computedSummary),
  ].join("\n");
}
```

- [ ] **Step 4: Create API route**

Create `src/app/api/tools/finance-ai-assistant/route.ts`:

```ts
import { NextRequest } from "next/server";
import {
  buildFinanceAIExplanationPrompt,
  buildFinanceAIPlanningContext,
  type FinanceAIChatState,
} from "@/lib/finance-ai/context";
import type { FinanceSchema } from "@/lib/finance-ai/types";

const CHAT_PRIMARY_TIMEOUT_MS = 60000;
const CHAT_FALLBACK_TIMEOUT_MS = 60000;
const DEEPSEEK_API_URL = "https://api.deepseek.com/chat/completions";
const CHAT_FALLBACK_API_URL = "https://api.884819.xyz/v1/chat/completions";

type ChatProvider = {
  model: string;
  apiUrl: string;
  apiKey?: string;
  timeoutMs: number;
};

function readEnv(value?: string) {
  return value?.trim() || "";
}

function getChatProviders(): ChatProvider[] {
  const deepseekApiUrl = readEnv(process.env.DEEPSEEK_API_URL) || DEEPSEEK_API_URL;
  const fallbackApiUrl = readEnv(process.env.CHAT_API_URL) || CHAT_FALLBACK_API_URL;
  const deepseekApiKey = readEnv(process.env.DEEPSEEK_API_KEY);
  const fallbackApiKey = readEnv(process.env.CHAT_API_KEY);
  const fallbackModel = readEnv(process.env.CHAT_MODEL) || "gpt-5.2";
  const secondFallbackModel = readEnv(process.env.CHAT_MODEL_FALLBACK) || "gpt-5.4";

  return [
    { model: "deepseek-v4-pro", apiUrl: deepseekApiUrl, apiKey: deepseekApiKey, timeoutMs: CHAT_PRIMARY_TIMEOUT_MS },
    { model: fallbackModel, apiUrl: fallbackApiUrl, apiKey: fallbackApiKey, timeoutMs: CHAT_FALLBACK_TIMEOUT_MS },
    { model: secondFallbackModel, apiUrl: fallbackApiUrl, apiKey: fallbackApiKey, timeoutMs: CHAT_FALLBACK_TIMEOUT_MS },
  ];
}

function extractJsonObject(text: string) {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1]?.trim();
  const candidate = fenced || text.trim();
  const firstBrace = candidate.indexOf("{");
  const lastBrace = candidate.lastIndexOf("}");
  if (firstBrace < 0 || lastBrace <= firstBrace) throw new Error("AI response did not contain JSON");
  return JSON.parse(candidate.slice(firstBrace, lastBrace + 1));
}

async function callProvider(provider: ChatProvider, messages: Array<{ role: "system" | "user"; content: string }>, jsonMode: boolean) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), provider.timeoutMs);
  try {
    const response = await fetch(provider.apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${provider.apiKey}`,
        "User-Agent": "Mozilla/5.0 (compatible; YinPengtaoWebsite/1.0)",
        Accept: "application/json",
      },
      body: JSON.stringify({
        model: provider.model,
        max_tokens: 1800,
        stream: false,
        ...(jsonMode ? { response_format: { type: "json_object" } } : {}),
        messages,
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      throw new Error(detail || `Upstream error ${response.status}`);
    }

    const payload = await response.json();
    return String(payload.choices?.[0]?.message?.content ?? "");
  } finally {
    clearTimeout(timeoutId);
  }
}

async function callFirstConfiguredProvider(messages: Array<{ role: "system" | "user"; content: string }>, jsonMode: boolean) {
  let lastError = "API not configured";
  for (const provider of getChatProviders()) {
    if (!provider.apiKey || !provider.apiUrl) continue;
    try {
      return await callProvider(provider, messages, jsonMode);
    } catch (error) {
      lastError = error instanceof Error ? error.message : "Upstream request failed";
    }
  }
  throw new Error(lastError);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const mode = String(body.mode || "");

    if (mode === "plan") {
      const schema = body.schema as FinanceSchema;
      const state = (body.state ?? {}) as FinanceAIChatState;
      const question = String(body.question || "").trim();
      const system = buildFinanceAIPlanningContext(schema, state);
      const content = await callFirstConfiguredProvider([
        { role: "system", content: system },
        { role: "user", content: question },
      ], true);
      return Response.json(extractJsonObject(content));
    }

    if (mode === "explain") {
      const prompt = buildFinanceAIExplanationPrompt({
        userQuestion: String(body.question || ""),
        computedSummary: body.computedSummary,
      });
      const content = await callFirstConfiguredProvider([
        { role: "system", content: "你是 Lucas 网站里的财务分析 AI 助手，回复简洁、具体、可信。" },
        { role: "user", content: prompt },
      ], false);
      return Response.json({ message: content.trim() });
    }

    return Response.json({ error: "Unsupported mode" }, { status: 400 });
  } catch (error) {
    return Response.json({
      error: error instanceof Error ? error.message : "Finance AI assistant failed",
    }, { status: 500 });
  }
}
```

- [ ] **Step 5: Run API contract test**

Run: `node --test tests/finance-ai-assistant-contract.test.mjs`

Expected: PASS for API context coverage.

- [ ] **Step 6: Commit API route**

```bash
git add src/lib/finance-ai/context.ts src/app/api/tools/finance-ai-assistant/route.ts tests/finance-ai-assistant-contract.test.mjs
git commit -m "Add finance AI assistant API"
```

## Task 5: Tool Route, Chat UI, And Upload Flow

**Files:**
- Create: `src/app/tools/finance-ai-assistant/page.tsx`
- Create: `src/app/tools/finance-ai-assistant/FinanceAIAssistantTool.tsx`
- Modify: `tests/finance-ai-assistant-contract.test.mjs`

- [ ] **Step 1: Add failing UI route tests**

Append to `tests/finance-ai-assistant-contract.test.mjs`:

```js
test("finance AI assistant page is an independent chat workbench", async () => {
  const page = await readProjectFile("src/app/tools/finance-ai-assistant/page.tsx");
  const client = await readProjectFile("src/app/tools/finance-ai-assistant/FinanceAIAssistantTool.tsx");

  assert.match(page, /财务分析 AI 助手/);
  assert.match(page, /FinanceAIAssistantTool/);
  assert.match(client, /\/api\/tools\/finance-ai-assistant/);
  assert.match(client, /type ChatMessage/);
  assert.match(client, /chartCards/);
  assert.match(client, /PlotlyChart/);
  assert.match(client, /数据仅保留在当前页面会话中，刷新后清空/);
  assert.match(client, /已识别/);
  assert.match(client, /inferFinanceSchema/);
  assert.match(client, /buildMetricSnapshot/);
  assert.match(client, /buildTrendSeries/);
  assert.match(client, /buildBarRank/);
  assert.match(client, /buildWaterfallBridge/);
  assert.match(client, /validateFinanceActionPlan/);
  assert.match(client, /buildChartSpec/);
  assert.doesNotMatch(client, /localStorage/);
  assert.doesNotMatch(client, /sessionStorage/);
});
```

- [ ] **Step 2: Run UI contract test and verify failure**

Run: `node --test tests/finance-ai-assistant-contract.test.mjs`

Expected: FAIL because page and client files do not exist.

- [ ] **Step 3: Create page route**

Create `src/app/tools/finance-ai-assistant/page.tsx`:

```tsx
import type { Metadata } from "next";
import FinanceAIAssistantTool from "./FinanceAIAssistantTool";

export const metadata: Metadata = {
  title: "财务分析 AI 助手｜Lucas Yin",
  description: "上传经营明细后，通过持续聊天生成趋势图、横向排名和瀑布桥分析。",
};

export default function FinanceAIAssistantPage() {
  return <FinanceAIAssistantTool />;
}
```

- [ ] **Step 4: Create client workbench**

Create `src/app/tools/finance-ai-assistant/FinanceAIAssistantTool.tsx`:

```tsx
"use client";

import { useMemo, useRef, useState } from "react";
import { ArrowUp, FileSpreadsheet, Loader2, RotateCcw, UploadCloud } from "lucide-react";
import * as XLSX from "xlsx";
import { inferFinanceSchema } from "@/lib/finance-ai/schema";
import { validateFinanceActionPlan } from "@/lib/finance-ai/actions";
import { buildChartSpec } from "@/lib/finance-ai/charts";
import {
  buildBarRank,
  buildMetricSnapshot,
  buildTrendSeries,
  buildWaterfallBridge,
} from "@/lib/finance-ai/metrics";
import type {
  FinanceActionModule,
  FinanceChartSpec,
  FinanceRow,
  FinanceSchema,
} from "@/lib/finance-ai/types";

type ChatRole = "user" | "assistant";

type ChartCard = {
  id: string;
  title: string;
  spec: FinanceChartSpec;
  note: string;
};

type ChatMessage = {
  id: string;
  role: ChatRole;
  text: string;
  chartCards?: ChartCard[];
  meta?: string;
};

function summarizeSchema(schema: FinanceSchema | null) {
  if (!schema) return "等待上传经营明细";
  return `已识别：${schema.profile.rowCount.toLocaleString("zh-CN")} 行 / ${schema.profile.periods.length} 个月 / ${schema.dimensionColumns.length} 个维度 / ${schema.totalMetrics.length} 个总额指标 / ${schema.unitMetrics.length} 个单车指标`;
}

async function parseFile(file: File): Promise<FinanceRow[]> {
  const name = file.name.toLowerCase();
  if (name.endsWith(".csv")) {
    const text = await file.text();
    const workbook = XLSX.read(text, { type: "string" });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    return XLSX.utils.sheet_to_json(sheet, { defval: "" }) as FinanceRow[];
  }
  const data = new Uint8Array(await file.arrayBuffer());
  const workbook = XLSX.read(data, { type: "array", cellDates: true });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  return XLSX.utils.sheet_to_json(sheet, { defval: "" }) as FinanceRow[];
}

function getDefaultQuestion(schema: FinanceSchema | null) {
  const metric = schema?.unitMetrics[0]?.name || schema?.totalMetrics[0]?.name || "单车边际";
  const period = schema?.profile.periods.at(-1)?.key || "2026-03";
  const dimension = schema?.dimensionColumns.includes("国家") ? "国家" : schema?.dimensionColumns[0] || "国家";
  return `${period} ${dimension}表现怎么看？${metric}环比同比如何？`;
}

function resultForModule(rows: FinanceRow[], schema: FinanceSchema, module: FinanceActionModule) {
  if (module.type === "metric_snapshot") {
    const snapshot = buildMetricSnapshot(rows, schema, module);
    const trend = module.chart?.type === "trend_chart"
      ? buildTrendSeries(rows, schema, { metric: module.metric, filters: module.filters, highlightPeriod: module.chart.highlightPeriod ?? module.period })
      : null;
    return {
      computed: snapshot,
      chartResult: trend,
      chartType: trend ? "trend_chart" as const : null,
      title: `${module.period} ${module.metric}`,
    };
  }

  if (module.type === "trend_chart") {
    return {
      computed: buildTrendSeries(rows, schema, module),
      chartResult: buildTrendSeries(rows, schema, module),
      chartType: "trend_chart" as const,
      title: `${module.metric}趋势`,
    };
  }

  if (module.type === "bar_rank") {
    const result = buildBarRank(rows, schema, module);
    return { computed: result, chartResult: result, chartType: "bar_rank" as const, title: `${module.dimension}${module.metric}排名` };
  }

  const result = buildWaterfallBridge(rows, schema, module);
  return { computed: result, chartResult: result, chartType: "waterfall_bridge" as const, title: `${module.fromPeriod} 到 ${module.toPeriod} ${module.metric}变化桥` };
}

function chartForModule(moduleId: string, value: ReturnType<typeof resultForModule>): ChartCard | null {
  if (!value.chartResult || !value.chartType) return null;
  const spec = buildChartSpec({ type: value.chartType, title: value.title, result: value.chartResult } as Parameters<typeof buildChartSpec>[0]);
  return { id: moduleId, title: value.title, spec, note: spec.note };
}

function PlotlyChart({ spec }: { spec: FinanceChartSpec }) {
  const nodeRef = useRef<HTMLDivElement | null>(null);

  useMemo(() => {
    let cancelled = false;
    void import("plotly.js-dist-min").then((Plotly) => {
      if (!nodeRef.current || cancelled) return;
      void Plotly.default.react(nodeRef.current, spec.data, spec.layout, spec.config);
    });
    return () => {
      cancelled = true;
    };
  }, [spec]);

  return <div ref={nodeRef} className="finance-ai-chart-host" aria-label={spec.title} />;
}

export default function FinanceAIAssistantTool() {
  const [rows, setRows] = useState<FinanceRow[]>([]);
  const [schema, setSchema] = useState<FinanceSchema | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      role: "assistant",
      text: "上传一张经营明细后，你可以直接问我单车边际、环比同比、利润变化来源或维度排名。",
      meta: "数据仅保留在当前页面会话中，刷新后清空。",
    },
  ]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const dataSummary = useMemo(() => summarizeSchema(schema), [schema]);
  const canAsk = rows.length > 0 && schema !== null && schema.requiredIssues.length === 0 && !busy;

  async function handleFile(file: File) {
    setError("");
    const parsedRows = await parseFile(file);
    const nextSchema = inferFinanceSchema(parsedRows);
    setRows(parsedRows);
    setSchema(nextSchema);
    setMessages((current) => [
      ...current,
      {
        id: `assistant-${Date.now()}`,
        role: "assistant",
        text: nextSchema.requiredIssues.length
          ? nextSchema.requiredIssues.map((issue) => issue.message).join(" ")
          : `${file.name} 已上传。${summarizeSchema(nextSchema)}。现在可以直接提问。`,
        meta: "数据仅保留在当前页面会话中，刷新后清空。",
      },
    ]);
  }

  async function callAI(mode: "plan" | "explain", body: Record<string, unknown>) {
    const response = await fetch("/api/tools/finance-ai-assistant", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode, ...body }),
    });
    if (!response.ok) throw new Error("AI 请求失败，请稍后再试。");
    return response.json();
  }

  async function handleSubmit() {
    const question = input.trim();
    if (!question || !schema || !canAsk) return;

    setBusy(true);
    setError("");
    setInput("");
    setMessages((current) => [...current, { id: `user-${Date.now()}`, role: "user", text: question }]);

    try {
      const plan = await callAI("plan", {
        question,
        schema,
        state: {
          recentQuestions: messages.filter((message) => message.role === "user").slice(-4).map((message) => message.text),
        },
      });
      const validated = validateFinanceActionPlan(schema, plan);
      if (!validated.ok) throw new Error(validated.errors.join(" "));

      const computedModules = validated.modules.map((module, index) => resultForModule(rows, schema, module));
      const chartCards = computedModules
        .map((result, index) => chartForModule(`chart-${Date.now()}-${index}`, result))
        .filter(Boolean) as ChartCard[];
      const computedSummary = computedModules.map((result) => result.computed);
      const explanation = await callAI("explain", { question, computedSummary });

      setMessages((current) => [
        ...current,
        {
          id: `assistant-${Date.now()}`,
          role: "assistant",
          text: String(explanation.message || "我已经根据当前底稿生成分析结果。"),
          chartCards,
          meta: "口径：单车指标按筛选范围先汇总总额和销量，再相除。",
        },
      ]);
    } catch (submitError) {
      setMessages((current) => [
        ...current,
        {
          id: `assistant-${Date.now()}`,
          role: "assistant",
          text: submitError instanceof Error ? submitError.message : "分析失败，请换一种问法。",
        },
      ]);
    } finally {
      setBusy(false);
    }
  }

  function resetData() {
    setRows([]);
    setSchema(null);
    setMessages([{
      id: `assistant-reset-${Date.now()}`,
      role: "assistant",
      text: "当前数据已清空。重新上传经营明细后可以继续分析。",
      meta: "数据仅保留在当前页面会话中，刷新后清空。",
    }]);
  }

  return (
    <main className="finance-ai-page">
      <section className="finance-ai-shell">
        <header className="finance-ai-header">
          <div>
            <p className="finance-ai-eyebrow">Financial Modeling</p>
            <h1>财务分析 AI 助手</h1>
            <p>上传经营明细后，直接用自然语言生成精确问答、趋势图、横向排名和瀑布桥。</p>
          </div>
          <button type="button" className="finance-ai-icon-button" onClick={resetData} aria-label="清空当前数据">
            <RotateCcw aria-hidden="true" />
          </button>
        </header>

        <section className="finance-ai-data-bar">
          <label className="finance-ai-upload">
            <input
              type="file"
              accept=".csv,.xlsx,.xls"
              hidden
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void handleFile(file);
                event.currentTarget.value = "";
              }}
            />
            <UploadCloud aria-hidden="true" />
            <span>上传经营明细</span>
          </label>
          <div className="finance-ai-data-status">
            <FileSpreadsheet aria-hidden="true" />
            <span>{dataSummary}</span>
          </div>
        </section>

        {error && <p className="finance-ai-error">{error}</p>}

        <section className="finance-ai-chat" aria-label="财务分析聊天流">
          {messages.map((message) => (
            <article key={message.id} className={`finance-ai-message is-${message.role}`}>
              <div className="finance-ai-message-bubble">
                <p>{message.text}</p>
                {message.chartCards?.map((card) => (
                  <div className="finance-ai-chart-card" key={card.id}>
                    <h2>{card.title}</h2>
                    <PlotlyChart spec={card.spec} />
                    <p>{card.note}</p>
                  </div>
                ))}
                {message.meta && <small>{message.meta}</small>}
              </div>
            </article>
          ))}
        </section>

        <form
          className="finance-ai-composer"
          onSubmit={(event) => {
            event.preventDefault();
            void handleSubmit();
          }}
        >
          <input
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder={schema ? getDefaultQuestion(schema) : "先上传经营明细，再开始提问"}
            disabled={!schema || busy}
          />
          <button type="submit" disabled={!input.trim() || !canAsk} aria-label="发送问题">
            {busy ? <Loader2 className="finance-ai-spin" aria-hidden="true" /> : <ArrowUp aria-hidden="true" />}
          </button>
        </form>
      </section>
    </main>
  );
}
```

- [ ] **Step 5: Fix Plotly effect implementation**

In `FinanceAIAssistantTool.tsx`, replace the `PlotlyChart` function from Step 4 with this effect-safe version:

```tsx
function PlotlyChart({ spec }: { spec: FinanceChartSpec }) {
  const nodeRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let cancelled = false;
    void import("plotly.js-dist-min").then((Plotly) => {
      if (!nodeRef.current || cancelled) return;
      void Plotly.default.react(nodeRef.current, spec.data, spec.layout, spec.config);
    });
    return () => {
      cancelled = true;
    };
  }, [spec]);

  return <div ref={nodeRef} className="finance-ai-chart-host" aria-label={spec.title} />;
}
```

Also update the first import line to include `useEffect`:

```tsx
import { useEffect, useMemo, useRef, useState } from "react";
```

- [ ] **Step 6: Run UI contract test**

Run: `node --test tests/finance-ai-assistant-contract.test.mjs`

Expected: PASS for API and UI route contract tests.

- [ ] **Step 7: Commit tool route and client UI**

```bash
git add src/app/tools/finance-ai-assistant/page.tsx src/app/tools/finance-ai-assistant/FinanceAIAssistantTool.tsx tests/finance-ai-assistant-contract.test.mjs
git commit -m "Add finance AI assistant workbench"
```

## Task 6: Styling, Shell Isolation, Sitemap, And Tool Listing

**Files:**
- Modify: `src/app/globals.css`
- Modify: `src/components/ClientShell.tsx`
- Modify: `src/app/sitemap.ts`
- Modify: `src/lib/data/thinkingLabContent.ts`
- Modify: `tests/finance-ai-assistant-contract.test.mjs`

- [ ] **Step 1: Add failing shell and style tests**

Append to `tests/finance-ai-assistant-contract.test.mjs`:

```js
test("finance AI assistant is styled and isolated from global assistant", async () => {
  const styles = await readProjectFile("src/app/globals.css");
  const shell = await readProjectFile("src/components/ClientShell.tsx");
  const sitemap = await readProjectFile("src/app/sitemap.ts");
  const content = await readProjectFile("src/lib/data/thinkingLabContent.ts");

  assert.match(styles, /\.finance-ai-page/);
  assert.match(styles, /\.finance-ai-chat/);
  assert.match(styles, /\.finance-ai-message\.is-assistant/);
  assert.match(styles, /\.finance-ai-chart-card/);
  assert.match(styles, /\.finance-ai-chart-host/);
  assert.match(styles, /@media \(max-width: 760px\)/);
  assert.match(shell, /\/tools\/finance-ai-assistant/);
  assert.match(shell.match(/function shouldHideAssistant[\s\S]*?\n}/)?.[0] ?? "", /finance-ai-assistant/);
  assert.match(sitemap, /\$\{BASE_URL\}\/tools\/finance-ai-assistant/);
  assert.match(content, /finance-ai-assistant/);
  assert.match(content, /财务分析 AI 助手/);
});
```

- [ ] **Step 2: Run shell/style test and verify failure**

Run: `node --test tests/finance-ai-assistant-contract.test.mjs`

Expected: FAIL because shell, sitemap, content, and styles are not wired yet.

- [ ] **Step 3: Isolate the route from decorative extras and global assistant**

Modify `src/components/ClientShell.tsx`:

```tsx
function shouldHideDecorativeExtras(pathname: string) {
    return (
        pathname.startsWith("/finance/business-analysis") ||
        pathname.startsWith("/finance/profit-structure") ||
        pathname.startsWith("/finance/perspective-bi") ||
        pathname.startsWith("/tools/study-cards") ||
        pathname.startsWith("/tools/subtitle-workbench") ||
        pathname.startsWith("/tools/finance-ai-assistant")
    );
}

function shouldHideAssistant(pathname: string) {
    return (
        pathname.startsWith("/tools/subtitle-workbench") ||
        pathname.startsWith("/tools/finance-ai-assistant")
    );
}
```

- [ ] **Step 4: Add sitemap entry**

In `src/app/sitemap.ts`, add the tool URL beside existing standalone tool URLs:

```ts
{
  url: `${BASE_URL}/tools/finance-ai-assistant`,
  lastModified: new Date(),
  changeFrequency: "monthly",
  priority: 0.7,
},
```

- [ ] **Step 5: Add thinking-lab content entry**

In `src/lib/data/thinkingLabContent.ts`, add this content item after `studyCardsContent`:

```ts
export const financeAIAssistantContent: ContentItem = {
  id: 9003,
  slug: "finance-ai-assistant",
  title: "财务分析 AI 助手",
  description: "上传经营明细后，用持续聊天生成趋势图、横向排名和瀑布桥分析。",
  date: "2026-06-06",
  category: "工具",
  href: "/tools/finance-ai-assistant",
  content: "",
  source: "hosted-tool",
};
```

Then update the exported array:

```ts
export const thinkingLabContent: ContentItem[] = [
  financeAIAssistantContent,
  studyCardsContent,
  subtitleWorkbenchContent,
  ...thinkingContent,
];
```

- [ ] **Step 6: Add styles**

Append to `src/app/globals.css`:

```css
.finance-ai-page {
  min-height: 100dvh;
  background: #faf9f5;
  color: #141413;
  padding: 28px;
}

.finance-ai-shell {
  width: min(1180px, 100%);
  margin: 0 auto;
  display: grid;
  gap: 16px;
}

.finance-ai-header,
.finance-ai-data-bar,
.finance-ai-composer {
  background: rgba(255, 255, 255, 0.9);
  border: 1px solid #e8e6dc;
  border-radius: 8px;
  box-shadow: 0 14px 40px rgba(20, 20, 19, 0.06);
}

.finance-ai-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  padding: 22px;
}

.finance-ai-eyebrow {
  margin: 0 0 8px;
  color: #d97757;
  font-size: 0.76rem;
  letter-spacing: 0;
  text-transform: uppercase;
}

.finance-ai-header h1 {
  margin: 0;
  font-size: clamp(1.8rem, 3vw, 2.7rem);
  letter-spacing: 0;
}

.finance-ai-header p:last-child {
  margin: 10px 0 0;
  max-width: 680px;
  color: #747168;
  line-height: 1.7;
}

.finance-ai-icon-button,
.finance-ai-composer button {
  width: 42px;
  height: 42px;
  border: 1px solid #dedbd0;
  border-radius: 8px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: #fff;
  color: #141413;
  cursor: pointer;
}

.finance-ai-icon-button svg,
.finance-ai-composer button svg {
  width: 18px;
  height: 18px;
}

.finance-ai-data-bar {
  display: grid;
  grid-template-columns: minmax(180px, 240px) minmax(0, 1fr);
  gap: 12px;
  padding: 12px;
}

.finance-ai-upload,
.finance-ai-data-status {
  min-height: 54px;
  border: 1px dashed #d8d3c7;
  border-radius: 8px;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 0 14px;
  color: #514f49;
}

.finance-ai-upload {
  cursor: pointer;
  background: #fffaf4;
  color: #8b4e33;
}

.finance-ai-upload svg,
.finance-ai-data-status svg {
  width: 18px;
  height: 18px;
}

.finance-ai-chat {
  min-height: 520px;
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 4px 0;
}

.finance-ai-message {
  display: flex;
}

.finance-ai-message.is-user {
  justify-content: flex-end;
}

.finance-ai-message.is-assistant {
  justify-content: flex-start;
}

.finance-ai-message-bubble {
  width: min(860px, 100%);
  background: #fff;
  border: 1px solid #e8e6dc;
  border-radius: 8px;
  padding: 16px;
  box-shadow: 0 12px 30px rgba(20, 20, 19, 0.05);
}

.finance-ai-message.is-user .finance-ai-message-bubble {
  width: min(680px, 88%);
  background: #1f2933;
  color: #fff;
  border-color: #1f2933;
}

.finance-ai-message-bubble p {
  margin: 0;
  line-height: 1.75;
}

.finance-ai-message-bubble small {
  display: block;
  margin-top: 12px;
  color: #747168;
  line-height: 1.6;
}

.finance-ai-chart-card {
  margin-top: 14px;
  border: 1px solid #ebe7dc;
  border-radius: 8px;
  background: #fffdfa;
  padding: 14px;
}

.finance-ai-chart-card h2 {
  margin: 0 0 10px;
  font-size: 1rem;
  letter-spacing: 0;
}

.finance-ai-chart-host {
  width: 100%;
  min-height: 320px;
}

.finance-ai-chart-card p {
  margin-top: 10px;
  color: #747168;
  font-size: 0.9rem;
}

.finance-ai-composer {
  position: sticky;
  bottom: 16px;
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 10px;
  padding: 10px;
}

.finance-ai-composer input {
  min-width: 0;
  border: 0;
  background: transparent;
  padding: 0 8px;
  font: inherit;
  color: #141413;
  outline: none;
}

.finance-ai-composer button {
  background: #d97757;
  color: #fff;
  border-color: #d97757;
}

.finance-ai-composer button:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.finance-ai-spin {
  animation: finance-ai-spin 0.9s linear infinite;
}

@keyframes finance-ai-spin {
  to {
    transform: rotate(360deg);
  }
}

@media (max-width: 760px) {
  .finance-ai-page {
    padding: 12px;
  }

  .finance-ai-header {
    padding: 18px;
  }

  .finance-ai-data-bar {
    grid-template-columns: 1fr;
  }

  .finance-ai-message-bubble,
  .finance-ai-message.is-user .finance-ai-message-bubble {
    width: 100%;
  }

  .finance-ai-chart-host {
    min-height: 280px;
  }

  .finance-ai-composer {
    bottom: 10px;
  }
}
```

- [ ] **Step 7: Run shell/style contract test**

Run: `node --test tests/finance-ai-assistant-contract.test.mjs`

Expected: PASS.

- [ ] **Step 8: Commit route integration and styles**

```bash
git add src/app/globals.css src/components/ClientShell.tsx src/app/sitemap.ts src/lib/data/thinkingLabContent.ts tests/finance-ai-assistant-contract.test.mjs
git commit -m "Wire finance AI assistant into site"
```

## Task 7: End-To-End Verification And Build

**Files:**
- Modify only if verification finds a defect in files from Tasks 1-6.

- [ ] **Step 1: Run focused finance AI tests**

Run:

```bash
node --test tests/finance-ai-core.test.mjs tests/finance-ai-assistant-contract.test.mjs
```

Expected: PASS.

- [ ] **Step 2: Run site contract tests that may be affected**

Run:

```bash
npm run test:site
```

Expected: PASS. If a generated content test fails because `thinkingLabContent.ts` shape differs from the plan, update the content entry to match the actual file shape and rerun `npm run test:site`.

- [ ] **Step 3: Run lint**

Run:

```bash
npm run lint
```

Expected: PASS.

- [ ] **Step 4: Run TypeScript check**

Run:

```bash
npx tsc --noEmit
```

Expected: PASS.

- [ ] **Step 5: Run production build**

Run:

```bash
npm run build:vercel
```

Expected: PASS.

- [ ] **Step 6: Start local dev server**

Run:

```bash
npm run dev
```

Expected: dev server starts and prints a localhost URL. Keep the session open for browser verification.

- [ ] **Step 7: Browser-verify desktop**

Open `/tools/finance-ai-assistant` in the in-app Browser at desktop width. Verify:

- The page title is `财务分析 AI 助手`.
- The global floating `AI 助手` is hidden.
- Upload controls are visible.
- The chat stream contains the assistant welcome message.
- The composer is disabled before upload.
- No text overlaps the header, upload area, chat, or composer.

- [ ] **Step 8: Browser-verify mobile**

Open `/tools/finance-ai-assistant` at roughly `390x844`. Verify:

- The upload area stacks into one column.
- The chat bubbles fit the viewport.
- Chart-card containers have stable width.
- The composer remains reachable and does not cover message text.
- The global floating `AI 助手` remains hidden.

- [ ] **Step 9: Commit verification fixes**

If Steps 1-8 required fixes:

```bash
git add <fixed-files>
git commit -m "Fix finance AI assistant verification issues"
```

If no fixes were needed, do not create an empty commit.

## Task 8: Final Review And Delivery

**Files:**
- No planned file edits.

- [ ] **Step 1: Confirm git status**

Run:

```bash
git status --short
```

Expected: no output.

- [ ] **Step 2: Summarize shipped scope**

Prepare a short delivery note with:

- Route: `/tools/finance-ai-assistant`
- API: `/api/tools/finance-ai-assistant`
- Deterministic local computation: schema, metrics, actions, chart specs
- Chat-embedded chart cards
- Tests and build commands run

- [ ] **Step 3: Ask for deployment direction**

Ask whether to push `main` and monitor deployment. If the user says yes, follow the repo deployment workflow: push, check GitHub/Vercel status, and report only after deployment is confirmed or clearly pending.

## Self-Review Checklist

- Spec coverage: the plan covers browser-memory upload, independent route, API isolation, continuous chat, 1-3 modules, trend/bar/waterfall charts, precise metric snapshots, zero-volume amount rows, no default ratio metrics, route shell isolation, tests, and build/browser verification.
- Red-flag scan: this plan contains no open-ended implementation markers and no unbounded test-writing instruction.
- Type consistency: `FinanceSchema`, `FinanceActionModule`, `FinanceChartSpec`, `MetricSnapshotResult`, `TrendResult`, `BarRankResult`, and `WaterfallBridgeResult` are introduced before use in later tasks.
