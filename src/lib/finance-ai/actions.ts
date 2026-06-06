// @ts-expect-error - Node's test runner imports this TypeScript module by extension.
import { normalizePeriodValue } from "./schema.ts";
// @ts-expect-error - Node's test runner imports this TypeScript module by extension.
import { findMetric } from "./metrics.ts";
import type {
  FinanceActionModule,
  FinanceActionValidationResult,
  FinanceFilter,
  FinanceMetric,
  FinanceSchema,
} from "./types.ts";

const ACTION_TYPES = new Set([
  "metric_snapshot",
  "trend_chart",
  "bar_rank",
  "waterfall_bridge",
]);

const PERIOD_FIELDS = ["period", "fromPeriod", "toPeriod", "highlightPeriod"] as const;

type ActionType = FinanceActionModule["type"];
type MutableModule = Record<string, unknown> & { type: ActionType; metric: string };

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function normalizeActionType(value: unknown): ActionType | null {
  const type = String(value ?? "");
  return ACTION_TYPES.has(type) ? type as ActionType : null;
}

function normalizeModule(value: unknown): FinanceActionModule | null {
  const record = asRecord(value);
  const type = normalizeActionType(record.type);

  if (!type) {
    return null;
  }

  const actionModule: MutableModule = {
    type,
    metric: typeof record.metric === "string" ? record.metric.trim() : String(record.metric ?? "").trim(),
  };

  copyOptionalString(record, actionModule, "period");
  copyOptionalString(record, actionModule, "fromPeriod");
  copyOptionalString(record, actionModule, "toPeriod");
  copyOptionalString(record, actionModule, "highlightPeriod");
  copyOptionalString(record, actionModule, "dimension");
  copyOptionalString(record, actionModule, "sort");
  copyOptionalString(record, actionModule, "comparison");
  copyOptionalNumber(record, actionModule, "limit");
  copyFilters(record, actionModule);
  copyComparisons(record, actionModule);
  copyChart(record, actionModule);

  return actionModule as FinanceActionModule;
}

function copyOptionalString(source: Record<string, unknown>, target: MutableModule, field: string) {
  if (typeof source[field] === "string" && source[field].trim()) {
    target[field] = source[field].trim();
  }
}

function copyOptionalNumber(source: Record<string, unknown>, target: MutableModule, field: string) {
  if (typeof source[field] === "number" && Number.isFinite(source[field])) {
    target[field] = source[field];
  }
}

function copyFilters(source: Record<string, unknown>, target: MutableModule) {
  const rawFilters = asRecord(source.filters);
  const filters = Object.fromEntries(
    Object.entries(rawFilters).flatMap(([field, values]) => {
      if (!Array.isArray(values)) {
        return [];
      }

      const normalizedValues = values
        .filter((value) => (
          typeof value === "string" ||
          typeof value === "number" ||
          typeof value === "boolean"
        ))
        .map((value) => String(value).trim())
        .filter(Boolean);

      return normalizedValues.length ? [[field, normalizedValues]] : [];
    }),
  );

  if (Object.keys(filters).length) {
    target.filters = filters satisfies FinanceFilter;
  }
}

function copyComparisons(source: Record<string, unknown>, target: MutableModule) {
  if (!Array.isArray(source.comparisons)) {
    return;
  }

  const comparisons = source.comparisons.filter((comparison): comparison is "mom" | "yoy" => (
    comparison === "mom" || comparison === "yoy"
  ));

  if (comparisons.length) {
    target.comparisons = comparisons;
  }
}

function copyChart(source: Record<string, unknown>, target: MutableModule) {
  const chart = asRecord(source.chart);

  if (chart.type !== "trend_chart") {
    return;
  }

  target.chart = {
    type: "trend_chart",
    ...(typeof chart.highlightPeriod === "string" && chart.highlightPeriod.trim()
      ? { highlightPeriod: chart.highlightPeriod.trim() }
      : {}),
  };
}

export function validateFinanceActionPlan(
  schema: FinanceSchema,
  plan: unknown,
): FinanceActionValidationResult {
  const rawModules = Array.isArray(asRecord(plan).modules)
    ? asRecord(plan).modules as unknown[]
    : [];
  const recognizedModules = rawModules
    .map(normalizeModule)
    .filter((module): module is FinanceActionModule => module !== null);
  const modules = recognizedModules.slice(0, 3);
  const errors: string[] = [];

  if (rawModules.length === 0) {
    errors.push("需要至少 1 个分析模块。");
  }

  if (rawModules.length > 3) {
    errors.push("每轮最多生成 3 个模块。");
  }

  if (recognizedModules.length !== rawModules.length) {
    errors.push("存在不支持的分析动作。");
  }

  modules.forEach((module) => {
    const metric = validateMetric(schema, module, errors);
    validateFilters(schema, module, errors);
    validatePeriods(schema, module, errors);

    if (module.type === "bar_rank" || module.type === "waterfall_bridge") {
      validateDimension(schema, module.dimension, errors);
    }

    if (module.type === "waterfall_bridge" && metric?.kind === "unit") {
      errors.push(`瀑布桥暂只支持可加总指标：${module.metric}`);
    }
  });

  return errors.length
    ? { ok: false, modules, errors }
    : { ok: true, modules, errors: [] };
}

function validateMetric(
  schema: FinanceSchema,
  module: FinanceActionModule,
  errors: string[],
): FinanceMetric | undefined {
  const metric = findMetric(schema, module.metric);

  if (!metric) {
    errors.push(`指标不存在：${module.metric || "未填写"}`);
  }

  return metric;
}

function validateDimension(schema: FinanceSchema, dimension: unknown, errors: string[]) {
  if (typeof dimension !== "string" || !dimension.trim()) {
    errors.push("排名或瀑布桥需要维度字段。");
    return;
  }

  if (!schema.dimensionColumns.includes(dimension)) {
    errors.push(`维度不存在：${dimension}`);
  }
}

function validateFilters(schema: FinanceSchema, module: FinanceActionModule, errors: string[]) {
  const filters = "filters" in module ? module.filters ?? {} : {};

  Object.keys(filters).forEach((field) => {
    if (!schema.dimensionColumns.includes(field)) {
      errors.push(`筛选字段不存在：${field}`);
    }
  });
}

function validatePeriods(schema: FinanceSchema, module: FinanceActionModule, errors: string[]) {
  const validPeriods = new Set(schema.profile.periods.map((period) => period.key));
  const record = module as Record<string, unknown>;

  PERIOD_FIELDS.forEach((field) => {
    const value = record[field];

    if (typeof value !== "string" || !value.trim()) {
      return;
    }

    const period = normalizePeriodValue(value)?.key ?? value.trim();
    if (!validPeriods.has(period)) {
      errors.push(`期间不存在：${value}`);
    }
  });

  const chart = asRecord(record.chart);
  if (typeof chart.highlightPeriod === "string" && chart.highlightPeriod.trim()) {
    const period = normalizePeriodValue(chart.highlightPeriod)?.key ?? chart.highlightPeriod.trim();
    if (!validPeriods.has(period)) {
      errors.push(`期间不存在：${chart.highlightPeriod}`);
    }
  }
}
