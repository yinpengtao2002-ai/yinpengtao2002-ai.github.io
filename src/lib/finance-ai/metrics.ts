// @ts-ignore - Node's test runner imports this TypeScript module by extension.
import { normalizePeriodValue, toFinanceNumber } from "./schema.ts";
import type {
  BarRankRequest,
  BarRankResult,
  FinanceFilter,
  FinanceMetric,
  FinanceRow,
  FinanceSchema,
  MetricComparison,
  MetricSnapshotRequest,
  MetricSnapshotResult,
  MetricValueBase,
  TrendRequest,
  TrendResult,
  WaterfallBridgeRequest,
  WaterfallBridgeResult,
} from "./types.ts";

const UNCATEGORIZED_LABEL = "未分类";
const DEFAULT_LIMIT = 10;

type CompiledFilter = {
  column: string;
  values: Set<string>;
};

type Accumulator = {
  totalValue: number;
  salesValue: number;
  rowCount: number;
  order: number;
};

type RankedItem = {
  label: string;
  value: number | null;
  rowCount: number;
  changeValue: number | null;
  order: number;
};

type BridgeItem = {
  label: string;
  value: number;
  order: number;
};

export function findMetric(schema: FinanceSchema, metricName: string): FinanceMetric | undefined {
  const normalizedMetricName = metricName.trim();

  return schema.totalMetrics.find((metric) => (
    metric.name === normalizedMetricName ||
    metric.column === normalizedMetricName
  )) ?? schema.unitMetrics.find((metric) => metric.name === normalizedMetricName);
}

export function buildMetricSnapshot(
  rows: FinanceRow[],
  schema: FinanceSchema,
  request: MetricSnapshotRequest,
): MetricSnapshotResult {
  const metric = requireMetric(schema, request.metric);
  const filters = cloneFilters(request.filters);
  const compiledFilters = compileFilters(filters);
  const period = normalizePeriodKey(request.period);
  const base = aggregateMetric(rows, schema, metric, period, compiledFilters);
  const result: MetricSnapshotResult = {
    metric: request.metric,
    filters,
    base,
    value: base.value,
  };

  if (request.comparisons?.includes("mom")) {
    const comparison = aggregateMetric(rows, schema, metric, shiftPeriodKey(period, -1), compiledFilters);
    result.mom = buildComparison(base, comparison);
  }

  if (request.comparisons?.includes("yoy")) {
    const comparison = aggregateMetric(rows, schema, metric, shiftPeriodKey(period, -12), compiledFilters);
    result.yoy = buildComparison(base, comparison);
  }

  return result;
}

export function buildTrendSeries(
  rows: FinanceRow[],
  schema: FinanceSchema,
  request: TrendRequest,
): TrendResult {
  const metric = requireMetric(schema, request.metric);
  const filters = cloneFilters(request.filters);
  const compiledFilters = compileFilters(filters);
  const highlightPeriod = request.highlightPeriod ? normalizePeriodKey(request.highlightPeriod) : undefined;

  return {
    metric: request.metric,
    filters,
    points: schema.profile.periods.map((period) => ({
      ...aggregateMetric(rows, schema, metric, period.key, compiledFilters),
      periodLabel: period.label,
    })),
    ...(highlightPeriod ? { highlightPeriod } : {}),
  };
}

export function buildBarRank(
  rows: FinanceRow[],
  schema: FinanceSchema,
  request: BarRankRequest,
): BarRankResult {
  const metric = requireMetric(schema, request.metric);
  const filters = cloneFilters(request.filters);
  const compiledFilters = compileFilters(filters);
  const period = request.period ? normalizePeriodKey(request.period) : undefined;
  const groups = aggregateByDimension(rows, schema, metric, request.dimension, period, compiledFilters);
  const previousGroups = request.comparison === "mom" && period
    ? aggregateByDimension(rows, schema, metric, request.dimension, shiftPeriodKey(period, -1), compiledFilters)
    : new Map<string, Accumulator>();
  const items = Array.from(groups.entries()).map(([label, accumulator]) => {
    const value = getMetricValue(metric, accumulator);
    const previousValue = getMetricValue(metric, previousGroups.get(label) ?? makeAccumulator(accumulator.order));

    return {
      label,
      value,
      rowCount: accumulator.rowCount,
      changeValue: value !== null && previousValue !== null ? value - previousValue : null,
      order: accumulator.order,
    };
  });

  return {
    metric: request.metric,
    dimension: request.dimension,
    items: sortRankedItems(items, request.sort ?? "value_desc")
      .slice(0, getLimit(request.limit))
      .map(({ label, value, rowCount }) => ({ label, value, rowCount })),
    filters,
    ...(period ? { period } : {}),
  };
}

export function buildWaterfallBridge(
  rows: FinanceRow[],
  schema: FinanceSchema,
  request: WaterfallBridgeRequest,
): WaterfallBridgeResult {
  const metric = requireMetric(schema, request.metric);
  const filters = cloneFilters(request.filters);
  const compiledFilters = compileFilters(filters);
  const fromPeriod = normalizePeriodKey(request.fromPeriod);
  const toPeriod = normalizePeriodKey(request.toPeriod);
  const startValue = valueOrZero(aggregateMetric(rows, schema, metric, fromPeriod, compiledFilters).value);
  const endValue = valueOrZero(aggregateMetric(rows, schema, metric, toPeriod, compiledFilters).value);
  const fromGroups = aggregateByDimension(rows, schema, metric, request.dimension, fromPeriod, compiledFilters);
  const toGroups = aggregateByDimension(rows, schema, metric, request.dimension, toPeriod, compiledFilters);
  const labels = mergeGroupLabels(toGroups, fromGroups);
  const items = labels
    .map((label) => {
      const toValue = valueOrZero(getMetricValue(metric, toGroups.get(label) ?? makeAccumulator(0)));
      const fromValue = valueOrZero(getMetricValue(metric, fromGroups.get(label) ?? makeAccumulator(0)));

      return {
        label,
        value: toValue - fromValue,
        order: toGroups.get(label)?.order ?? fromGroups.get(label)?.order ?? 0,
      };
    })
    .filter((item) => item.value !== 0);

  return {
    metric: request.metric,
    dimension: request.dimension,
    fromPeriod,
    toPeriod,
    startValue,
    endValue,
    changeValue: endValue - startValue,
    items: sortBridgeItems(items)
      .slice(0, getLimit(request.limit))
      .map(({ label, value }) => ({ label, value })),
    filters,
  };
}

function requireMetric(schema: FinanceSchema, metricName: string): FinanceMetric {
  const metric = findMetric(schema, metricName);

  if (!metric) {
    throw new Error(`Unknown finance metric: ${metricName}`);
  }

  return metric;
}

function cloneFilters(filters: FinanceFilter | undefined): FinanceFilter {
  return Object.fromEntries(
    Object.entries(filters ?? {}).map(([column, values]) => [column, [...values]]),
  );
}

function compileFilters(filters: FinanceFilter): CompiledFilter[] {
  return Object.entries(filters)
    .filter(([, values]) => values.length > 0)
    .map(([column, values]) => ({
      column,
      values: new Set(values.map(normalizeDimensionValue)),
    }));
}

function normalizeDimensionValue(value: unknown): string {
  if (value === null || value === undefined) {
    return UNCATEGORIZED_LABEL;
  }

  const text = String(value).trim();
  return text ? text : UNCATEGORIZED_LABEL;
}

function normalizePeriodKey(value: unknown): string {
  return normalizePeriodValue(value)?.key ?? String(value ?? "").trim();
}

function shiftPeriodKey(periodKey: string, monthOffset: number): string {
  const period = normalizePeriodValue(periodKey);

  if (!period) {
    return periodKey;
  }

  const shiftedSort = period.sort + monthOffset;
  const year = Math.floor((shiftedSort - 1) / 12);
  const month = ((shiftedSort - 1) % 12) + 1;

  return `${year}-${String(month).padStart(2, "0")}`;
}

function aggregateMetric(
  rows: FinanceRow[],
  schema: FinanceSchema,
  metric: FinanceMetric,
  period: string,
  filters: CompiledFilter[],
): MetricValueBase {
  const accumulator = makeAccumulator(0);

  for (const row of rows) {
    if (!matchesPeriod(row, schema, period) || !matchesFilters(row, filters)) {
      continue;
    }

    addRow(accumulator, row, schema, metric);
  }

  return {
    period,
    value: getMetricValue(metric, accumulator),
    totalValue: accumulator.totalValue,
    salesValue: accumulator.salesValue,
    rowCount: accumulator.rowCount,
    isComputable: isComputable(metric, accumulator),
  };
}

function aggregateByDimension(
  rows: FinanceRow[],
  schema: FinanceSchema,
  metric: FinanceMetric,
  dimension: string,
  period: string | undefined,
  filters: CompiledFilter[],
): Map<string, Accumulator> {
  const groups = new Map<string, Accumulator>();

  for (const row of rows) {
    if ((period && !matchesPeriod(row, schema, period)) || !matchesFilters(row, filters)) {
      continue;
    }

    const label = normalizeDimensionValue(row[dimension]);
    let accumulator = groups.get(label);
    if (!accumulator) {
      accumulator = makeAccumulator(groups.size);
      groups.set(label, accumulator);
    }

    addRow(accumulator, row, schema, metric);
  }

  return groups;
}

function makeAccumulator(order: number): Accumulator {
  return {
    totalValue: 0,
    salesValue: 0,
    rowCount: 0,
    order,
  };
}

function addRow(accumulator: Accumulator, row: FinanceRow, schema: FinanceSchema, metric: FinanceMetric): void {
  accumulator.totalValue += getFinanceNumber(row[metric.kind === "unit" ? metric.numeratorColumn : metric.column]);
  accumulator.salesValue += getFinanceNumber(row[metric.kind === "unit" ? metric.denominatorColumn : schema.salesColumn]);
  accumulator.rowCount += 1;
}

function getFinanceNumber(value: unknown): number {
  return toFinanceNumber(value) ?? 0;
}

function matchesPeriod(row: FinanceRow, schema: FinanceSchema, period: string): boolean {
  return normalizePeriodValue(row[schema.monthColumn])?.key === period;
}

function matchesFilters(row: FinanceRow, filters: CompiledFilter[]): boolean {
  return filters.every((filter) => filter.values.has(normalizeDimensionValue(row[filter.column])));
}

function getMetricValue(metric: FinanceMetric, accumulator: Accumulator): number | null {
  if (metric.kind === "unit") {
    return accumulator.salesValue === 0 ? null : accumulator.totalValue / accumulator.salesValue;
  }

  return accumulator.totalValue;
}

function isComputable(metric: FinanceMetric, accumulator: Accumulator): boolean {
  return metric.kind === "unit" ? accumulator.salesValue !== 0 : true;
}

function buildComparison(base: MetricValueBase, comparison: MetricValueBase): MetricComparison {
  const changeValue = base.value !== null && comparison.value !== null
    ? base.value - comparison.value
    : null;
  const changeRate = changeValue !== null && comparison.value !== null && comparison.value !== 0
    ? changeValue / comparison.value
    : null;

  return {
    ...comparison,
    changeValue,
    changeRate,
  };
}

function sortRankedItems(items: RankedItem[], sort: NonNullable<BarRankRequest["sort"]>): RankedItem[] {
  const valueKey = sort.startsWith("change") ? "changeValue" : "value";
  const direction = sort.endsWith("asc") ? "asc" : "desc";

  return [...items].sort((a, b) => {
    const valueCompare = compareNullableNumber(a[valueKey], b[valueKey], direction);
    return valueCompare || a.order - b.order;
  });
}

function compareNullableNumber(a: number | null, b: number | null, direction: "asc" | "desc"): number {
  if (a === null && b === null) {
    return 0;
  }

  if (a === null) {
    return 1;
  }

  if (b === null) {
    return -1;
  }

  return direction === "asc" ? a - b : b - a;
}

function mergeGroupLabels(
  primaryGroups: Map<string, Accumulator>,
  secondaryGroups: Map<string, Accumulator>,
): string[] {
  return [
    ...primaryGroups.keys(),
    ...Array.from(secondaryGroups.keys()).filter((label) => !primaryGroups.has(label)),
  ];
}

function valueOrZero(value: number | null): number {
  return value ?? 0;
}

function sortBridgeItems(items: BridgeItem[]): BridgeItem[] {
  return [...items].sort((a, b) => (
    Math.abs(b.value) - Math.abs(a.value) ||
    a.order - b.order
  ));
}

function getLimit(limit: number | undefined): number {
  if (limit === undefined || !Number.isFinite(limit)) {
    return DEFAULT_LIMIT;
  }

  return Math.max(0, Math.floor(limit));
}
