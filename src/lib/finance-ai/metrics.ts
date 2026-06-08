// @ts-expect-error - Node's test runner imports this TypeScript module by extension.
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
const OTHER_LABEL = "其他";
const DEFAULT_LIMIT = 10;

type CompiledFilter = {
  column: string;
  values: Set<string>;
};

type Accumulator = {
  totalValue: number;
  salesValue: number;
  rowCount: number;
  blankValueCount: number;
  invalidValueCount: number;
  order: number;
};

type NumericRead = {
  value: number;
  blankValueCount: number;
  invalidValueCount: number;
};

type RankedItem = {
  label: string;
  value: number | null;
  valueShare: number | null;
  rowCount: number;
  blankValueCount: number;
  invalidValueCount: number;
  changeValue: number | null;
  changeShare: number | null;
  order: number;
};

type ResultRankItem = Omit<RankedItem, "order">;

type BridgeItem = {
  label: string;
  value: number;
  mixEffect?: number;
  rateEffect?: number;
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
  const labels = request.comparison === "mom" && period
    ? mergeGroupLabels(groups, previousGroups)
    : Array.from(groups.keys());
  const valueShareBase = getShareBase(metric, groups);
  const previousShareBase = getShareBase(metric, previousGroups);
  const changeShareBase = request.comparison === "mom" && period
    ? valueShareBase - previousShareBase
    : null;
  const items = labels.map((label) => {
    const accumulator = groups.get(label);
    const previousAccumulator = previousGroups.get(label);
    const value = getRankValue(metric, accumulator);
    const comparisonValue = getComparisonValue(metric, accumulator);
    const previousValue = getComparisonValue(metric, previousAccumulator);
    const changeValue = request.comparison === "mom" && period && comparisonValue !== null && previousValue !== null
      ? comparisonValue - previousValue
      : null;

    return {
      label,
      value,
      valueShare: metric.kind === "total" && value !== null && valueShareBase !== 0
        ? value / valueShareBase
        : null,
      rowCount: accumulator?.rowCount ?? 0,
      blankValueCount: accumulator?.blankValueCount ?? 0,
      invalidValueCount: accumulator?.invalidValueCount ?? 0,
      changeValue,
      changeShare: metric.kind === "total" && changeValue !== null && changeShareBase !== null && changeShareBase !== 0
        ? changeValue / changeShareBase
        : null,
      order: accumulator?.order ?? groups.size + (previousAccumulator?.order ?? 0),
    };
  });

  const sort = request.sort ?? "value_desc";
  const rankedItems = sortRankedItems(items, sort);
  const visibleItems = rankedItems.slice(0, getLimit(request.limit)).map(toResultRankItem);
  const allItems = request.detailTable ? rankedItems.map(toResultRankItem) : undefined;

  return {
    metric: request.metric,
    dimension: request.dimension,
    items: visibleItems,
    ...(allItems ? { allItems } : {}),
    totalItemCount: items.length,
    visibleItemCount: visibleItems.length,
    sort,
    ...(request.comparison === "mom" && period ? { fullScan: buildBarRankFullScan(items, visibleItems.length) } : {}),
    filters,
    ...(period ? { period } : {}),
    ...(request.comparison ? { comparison: request.comparison } : {}),
  };
}

export function buildWaterfallBridge(
  rows: FinanceRow[],
  schema: FinanceSchema,
  request: WaterfallBridgeRequest,
): WaterfallBridgeResult {
  const metric = requireMetric(schema, request.metric);
  if (metric.kind === "unit") {
    return buildUnitMetricWaterfallBridge(rows, schema, metric, request);
  }

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
  const limitedItems = limitBridgeItems(sortBridgeItems(items), endValue - startValue, getLimit(request.limit));

  return {
    metric: request.metric,
    dimension: request.dimension,
    fromPeriod,
    toPeriod,
    fromPeriodLabel: getPeriodLabel(schema, fromPeriod),
    toPeriodLabel: getPeriodLabel(schema, toPeriod),
    startValue,
    endValue,
    changeValue: endValue - startValue,
    basis: "total_metric",
    items: limitedItems.map(({ label, value }) => ({ label, value })),
    filters,
  };
}

function buildUnitMetricWaterfallBridge(
  rows: FinanceRow[],
  schema: FinanceSchema,
  metric: FinanceMetric,
  request: WaterfallBridgeRequest,
): WaterfallBridgeResult {
  const filters = cloneFilters(request.filters);
  const compiledFilters = compileFilters(filters);
  const fromPeriod = normalizePeriodKey(request.fromPeriod);
  const toPeriod = normalizePeriodKey(request.toPeriod);
  const base = aggregateMetric(rows, schema, metric, fromPeriod, compiledFilters);
  const current = aggregateMetric(rows, schema, metric, toPeriod, compiledFilters);
  const startValue = valueOrZero(base.value);
  const endValue = valueOrZero(current.value);
  const fromGroups = aggregateByDimension(rows, schema, metric, request.dimension, fromPeriod, compiledFilters);
  const toGroups = aggregateByDimension(rows, schema, metric, request.dimension, toPeriod, compiledFilters);
  const labels = mergeGroupLabels(toGroups, fromGroups);
  const items = labels
    .map((label) => {
      const baseAccumulator = fromGroups.get(label);
      const currentAccumulator = toGroups.get(label);
      const baseUnit = baseAccumulator ? getMetricValue(metric, baseAccumulator) : null;
      const currentUnit = currentAccumulator ? getMetricValue(metric, currentAccumulator) : null;
      const baseShare = base.salesValue !== 0 ? (baseAccumulator?.salesValue ?? 0) / base.salesValue : 0;
      const currentShare = current.salesValue !== 0 ? (currentAccumulator?.salesValue ?? 0) / current.salesValue : 0;
      const { mixEffect, rateEffect } = calculateUnitMetricEffects({
        baseUnit,
        currentUnit,
        baseShare,
        currentShare,
        baseAverage: startValue,
      });

      return {
        label,
        value: mixEffect + rateEffect,
        mixEffect,
        rateEffect,
        order: currentAccumulator?.order ?? baseAccumulator?.order ?? 0,
      };
    })
    .filter((item) => item.value !== 0 || item.mixEffect !== 0 || item.rateEffect !== 0);
  const limitedItems = limitBridgeItems(sortBridgeItems(items), endValue - startValue, getLimit(request.limit));

  return {
    metric: request.metric,
    dimension: request.dimension,
    fromPeriod,
    toPeriod,
    fromPeriodLabel: getPeriodLabel(schema, fromPeriod),
    toPeriodLabel: getPeriodLabel(schema, toPeriod),
    startValue,
    endValue,
    changeValue: endValue - startValue,
    basis: "unit_metric_mix_rate",
    items: limitedItems.map(({ label, value, mixEffect, rateEffect }) => ({ label, value, mixEffect, rateEffect })),
    filters,
  };
}

function calculateUnitMetricEffects({
  baseUnit,
  currentUnit,
  baseShare,
  currentShare,
  baseAverage,
}: {
  baseUnit: number | null;
  currentUnit: number | null;
  baseShare: number;
  currentShare: number;
  baseAverage: number;
}) {
  if (baseUnit !== null && currentUnit !== null) {
    return {
      mixEffect: (currentShare - baseShare) * (baseUnit - baseAverage),
      rateEffect: currentShare * (currentUnit - baseUnit),
    };
  }

  if (currentUnit !== null) {
    return {
      mixEffect: currentShare * (currentUnit - baseAverage),
      rateEffect: 0,
    };
  }

  if (baseUnit !== null) {
    return {
      mixEffect: -baseShare * (baseUnit - baseAverage),
      rateEffect: 0,
    };
  }

  return { mixEffect: 0, rateEffect: 0 };
}

function requireMetric(schema: FinanceSchema, metricName: string): FinanceMetric {
  const metric = findMetric(schema, metricName);

  if (!metric) {
    throw new Error(`Unknown finance metric: ${metricName}`);
  }

  return metric;
}

function cloneFilters(filters: FinanceFilter | undefined): FinanceFilter {
  if (!filters || typeof filters !== "object") {
    return {};
  }

  return Object.fromEntries(
    Object.entries(filters as Record<string, unknown>)
      .flatMap(([column, values]) => {
        if (!Array.isArray(values)) {
          return [];
        }

        const normalizedValues = values.flatMap(normalizeFilterValue);
        return normalizedValues.length > 0 ? [[column, normalizedValues]] : [];
      }),
  );
}

function normalizeFilterValue(value: unknown): string[] {
  if (
    typeof value !== "string" &&
    typeof value !== "number" &&
    typeof value !== "boolean"
  ) {
    return [];
  }

  return [normalizeDimensionValue(value)];
}

function compileFilters(filters: FinanceFilter): CompiledFilter[] {
  return Object.entries(filters as Record<string, unknown>)
    .flatMap(([column, values]) => (
      Array.isArray(values) && values.length > 0
        ? [{
          column,
          values: new Set(values.map(normalizeDimensionValue)),
        }]
        : []
    ));
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

function getPeriodLabel(schema: FinanceSchema, periodKey: string) {
  return schema.profile.periods.find((period) => period.key === periodKey)?.label ?? periodKey;
}

function shiftPeriodKey(periodKey: string, monthOffset: number): string {
  const period = normalizePeriodValue(periodKey);

  if (!period) {
    return periodKey;
  }

  const yearlessMatch = period.key.match(/^M(\d{2})$/);
  if (yearlessMatch) {
    const shiftedMonth = Number(yearlessMatch[1]) + monthOffset;
    return shiftedMonth >= 1 && shiftedMonth <= 12
      ? `M${String(shiftedMonth).padStart(2, "0")}`
      : `MISSING_${period.key}_${monthOffset}`;
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
    blankValueCount: accumulator.blankValueCount,
    invalidValueCount: accumulator.invalidValueCount,
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
    blankValueCount: 0,
    invalidValueCount: 0,
    order,
  };
}

function addRow(accumulator: Accumulator, row: FinanceRow, schema: FinanceSchema, metric: FinanceMetric): void {
  const totalValue = readFinanceNumber(row[metric.kind === "unit" ? metric.numeratorColumn : metric.column]);
  const salesValue = readFinanceNumber(row[metric.kind === "unit" ? metric.denominatorColumn : schema.salesColumn]);

  accumulator.totalValue += totalValue.value;
  accumulator.salesValue += salesValue.value;
  accumulator.blankValueCount += totalValue.blankValueCount + salesValue.blankValueCount;
  accumulator.invalidValueCount += totalValue.invalidValueCount + salesValue.invalidValueCount;
  accumulator.rowCount += 1;
}

function readFinanceNumber(value: unknown): NumericRead {
  const numericValue = toFinanceNumber(value);

  if (numericValue !== null) {
    return {
      value: numericValue,
      blankValueCount: 0,
      invalidValueCount: 0,
    };
  }

  if (isBlankNumericValue(value)) {
    return {
      value: 0,
      blankValueCount: 1,
      invalidValueCount: 0,
    };
  }

  return {
    value: 0,
    blankValueCount: 0,
    invalidValueCount: 1,
  };
}

function isBlankNumericValue(value: unknown): boolean {
  return value === null ||
    value === undefined ||
    (typeof value === "string" && (value.trim() === "" || /^[-—–]$/.test(value.trim())));
}

function matchesPeriod(row: FinanceRow, schema: FinanceSchema, period: string): boolean {
  return normalizePeriodValue(row[schema.monthColumn])?.key === period;
}

function matchesFilters(row: FinanceRow, filters: CompiledFilter[]): boolean {
  return filters.every((filter) => filter.values.has(normalizeDimensionValue(row[filter.column])));
}

function getMetricValue(metric: FinanceMetric, accumulator: Accumulator): number | null {
  if (accumulator.rowCount === 0) {
    return null;
  }

  if (metric.kind === "unit") {
    return accumulator.salesValue === 0 ? null : accumulator.totalValue / accumulator.salesValue;
  }

  return accumulator.totalValue;
}

function isComputable(metric: FinanceMetric, accumulator: Accumulator): boolean {
  if (accumulator.rowCount === 0) {
    return false;
  }

  return metric.kind === "unit" ? accumulator.salesValue !== 0 : true;
}

function getRankValue(metric: FinanceMetric, accumulator: Accumulator | undefined): number | null {
  if (accumulator) {
    return getMetricValue(metric, accumulator);
  }

  return metric.kind === "total" ? 0 : null;
}

function getComparisonValue(metric: FinanceMetric, accumulator: Accumulator | undefined): number | null {
  if (accumulator) {
    return getMetricValue(metric, accumulator);
  }

  return metric.kind === "total" ? 0 : null;
}

function getShareBase(metric: FinanceMetric, groups: Map<string, Accumulator>): number {
  if (metric.kind !== "total") {
    return 0;
  }

  return Array.from(groups.values()).reduce((sum, accumulator) => (
    sum + valueOrZero(getMetricValue(metric, accumulator))
  ), 0);
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

function toResultRankItem({
  label,
  value,
  valueShare,
  changeValue,
  changeShare,
  rowCount,
  blankValueCount,
  invalidValueCount,
}: RankedItem): ResultRankItem {
  return {
    label,
    value,
    valueShare,
    changeValue,
    changeShare,
    rowCount,
    blankValueCount,
    invalidValueCount,
  };
}

function buildBarRankFullScan(items: RankedItem[], visibleItemCount: number) {
  const changedItems = items.filter((item) => item.changeValue !== null);
  const increases = changedItems
    .filter((item) => (item.changeValue ?? 0) > 0)
    .sort((a, b) => compareNullableNumber(a.changeValue, b.changeValue, "desc") || a.order - b.order)
    .slice(0, 5)
    .map(toResultRankItem);
  const decreases = changedItems
    .filter((item) => (item.changeValue ?? 0) < 0)
    .sort((a, b) => compareNullableNumber(a.changeValue, b.changeValue, "asc") || a.order - b.order)
    .slice(0, 5)
    .map(toResultRankItem);
  const largestAbsoluteChanges = [...changedItems]
    .sort((a, b) => (
      Math.abs(b.changeValue ?? 0) - Math.abs(a.changeValue ?? 0) ||
      a.order - b.order
    ))
    .slice(0, 5)
    .map(toResultRankItem);

  return {
    basis: "all_dimension_members" as const,
    totalItemCount: items.length,
    visibleItemCount,
    increases,
    decreases,
    largestAbsoluteChanges,
  };
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

function limitBridgeItems(items: BridgeItem[], changeValue: number, limit: number): BridgeItem[] {
  if (items.length <= limit) {
    return items;
  }

  const visibleItems = items.slice(0, limit);
  const visibleValue = visibleItems.reduce((sum, item) => sum + item.value, 0);
  const residualValue = changeValue - visibleValue;

  if (residualValue === 0) {
    return visibleItems;
  }

  const hasUnitEffects = items.some((item) => (
    typeof item.mixEffect === "number" || typeof item.rateEffect === "number"
  ));
  const residualMixEffect = hasUnitEffects
    ? items.reduce((sum, item) => sum + (item.mixEffect ?? 0), 0) -
      visibleItems.reduce((sum, item) => sum + (item.mixEffect ?? 0), 0)
    : undefined;
  const residualRateEffect = hasUnitEffects
    ? items.reduce((sum, item) => sum + (item.rateEffect ?? 0), 0) -
      visibleItems.reduce((sum, item) => sum + (item.rateEffect ?? 0), 0)
    : undefined;

  return [
    ...visibleItems,
    {
      label: OTHER_LABEL,
      value: residualValue,
      ...(residualMixEffect !== undefined ? { mixEffect: residualMixEffect } : {}),
      ...(residualRateEffect !== undefined ? { rateEffect: residualRateEffect } : {}),
      order: items.length,
    },
  ];
}

function getLimit(limit: number | undefined): number {
  if (limit === undefined || !Number.isFinite(limit)) {
    return DEFAULT_LIMIT;
  }

  return Math.max(0, Math.floor(limit));
}
