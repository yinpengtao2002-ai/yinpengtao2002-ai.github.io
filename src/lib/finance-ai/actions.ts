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
const BAR_RANK_SORTS = new Set(["value_desc", "value_asc", "change_desc", "change_asc"]);
const MAX_CHART_ITEMS = 10;
const LOW_RANK_TOKENS = ["最低", "最少", "倒数", "bottom", "后五", "后5", "低的5", "低5"];
const HIGH_RANK_TOKENS = ["最高", "最多", "top", "前五", "前5", "高的5", "高5"];

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
    validateRequiredFields(module, errors);
    validateActionOptions(module, errors);
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

export function alignFinanceActionPlanWithQuestion(
  schema: FinanceSchema,
  modules: FinanceActionModule[],
  userQuestion: string,
): FinanceActionModule[] {
  return modules.map((module) => {
    if (module.type !== "bar_rank") {
      return module;
    }

    const metricAliases = getMetricIntentAliases(schema, module.metric);
    const lowScore = getDirectionalIntentScore(userQuestion, metricAliases, LOW_RANK_TOKENS);
    const highScore = getDirectionalIntentScore(userQuestion, metricAliases, HIGH_RANK_TOKENS);

    if (lowScore === 0 && highScore === 0) {
      return module;
    }

    return {
      ...module,
      sort: lowScore > highScore ? "value_asc" : "value_desc",
    };
  });
}

function normalizeIntentText(value: string) {
  return value.toLowerCase().replace(/[\s_\-./,，。:：;；、"'“”‘’()（）]/g, "");
}

function getMetricIntentAliases(schema: FinanceSchema, metricName: string) {
  const metric = findMetric(schema, metricName);
  const rawAliases = new Set<string>([metricName]);

  if (metric?.kind === "total") {
    rawAliases.add(metric.name);
    rawAliases.add(metric.column);

    if (metric.column === schema.salesColumn || /sales|volume|qty|quantity|units/i.test(metric.column)) {
      rawAliases.add("销量");
      rawAliases.add("销售量");
      rawAliases.add("volume");
    }
  }

  if (metric?.kind === "unit") {
    rawAliases.add(metric.name);
    rawAliases.add(metric.numeratorColumn);
    rawAliases.add("单车");
    if (metric.name.includes("边际") || metric.numeratorColumn.includes("边际") || /margin/i.test(metric.numeratorColumn)) {
      rawAliases.add("单车边际");
      rawAliases.add("边际");
      rawAliases.add("margin");
    }
  }

  return Array.from(rawAliases)
    .map(normalizeIntentText)
    .filter((alias) => alias.length >= 2);
}

function getDirectionalIntentScore(question: string, metricAliases: string[], directionTokens: string[]) {
  const normalizedQuestion = normalizeIntentText(question);
  const normalizedTokens = directionTokens.map(normalizeIntentText);
  let score = 0;

  for (const alias of metricAliases) {
    const aliasIndex = normalizedQuestion.indexOf(alias);
    if (aliasIndex < 0) {
      continue;
    }

    for (const token of normalizedTokens) {
      const tokenIndex = normalizedQuestion.indexOf(token);
      if (tokenIndex < 0) {
        continue;
      }

      const distance = Math.abs(tokenIndex - aliasIndex);
      if (distance <= 24) {
        score = Math.max(score, 100 - distance);
      }
    }
  }

  return score;
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

function validateRequiredFields(module: FinanceActionModule, errors: string[]) {
  const record = module as Record<string, unknown>;

  if (module.type === "metric_snapshot" && !hasStringValue(record.period)) {
    errors.push("指标快照需要指定期间。");
  }

  if (module.type === "waterfall_bridge") {
    if (!hasStringValue(record.fromPeriod)) {
      errors.push("瀑布桥需要指定开始期间。");
    }

    if (!hasStringValue(record.toPeriod)) {
      errors.push("瀑布桥需要指定结束期间。");
    }
  }
}

function validateActionOptions(module: FinanceActionModule, errors: string[]) {
  if (module.type === "bar_rank") {
    validateBarRankOptions(module, errors);
  }

  if (module.type === "bar_rank" || module.type === "waterfall_bridge") {
    validateLimit(module, errors, module.type === "bar_rank" ? "排名数量" : "瀑布桥维度项");
  }
}

function validateBarRankOptions(module: FinanceActionModule, errors: string[]) {
  const record = module as Record<string, unknown>;

  if (typeof record.comparison === "string" && record.comparison !== "mom") {
    errors.push("排名对比只支持环比。");
    delete record.comparison;
  }

  if (typeof record.sort === "string" && !BAR_RANK_SORTS.has(record.sort)) {
    errors.push(`排序方式不支持：${record.sort}`);
    delete record.sort;
  }

  const sort = typeof record.sort === "string" ? record.sort : "";
  const comparison = typeof record.comparison === "string" ? record.comparison : "";

  if (sort.startsWith("change") && (comparison !== "mom" || !hasStringValue(record.period))) {
    errors.push("变化排序需要同时指定环比对比和期间。");
  }

  if (comparison === "mom" && !hasStringValue(record.period)) {
    errors.push("排名环比需要指定期间。");
  }
}

function validateLimit(module: FinanceActionModule, errors: string[], label: string) {
  const record = module as Record<string, unknown>;

  if (typeof record.limit !== "number") {
    return;
  }

  if (record.limit <= 0) {
    errors.push(`${label}需要大于 0。`);
    delete record.limit;
    return;
  }

  const normalizedLimit = Math.floor(record.limit);
  if (normalizedLimit > MAX_CHART_ITEMS) {
    errors.push(`${label}最多 ${MAX_CHART_ITEMS} 项。`);
    record.limit = MAX_CHART_ITEMS;
    return;
  }

  record.limit = normalizedLimit;
}

function hasStringValue(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
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
