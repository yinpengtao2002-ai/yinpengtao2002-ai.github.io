// @ts-expect-error - Node's test runner imports this TypeScript module by extension.
import { normalizePeriodValue } from "./schema.ts";
// @ts-expect-error - Node's test runner imports this TypeScript module by extension.
import { findMetric } from "./metrics.ts";
import type {
  FinanceActionPlan,
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
  "grouped_bar",
  "stacked_bar",
  "percent_stacked_bar",
  "heatmap",
  "scatter_bubble",
  "detail_table",
]);

const PERIOD_FIELDS = ["period", "fromPeriod", "toPeriod", "highlightPeriod"] as const;
const BAR_RANK_SORTS = new Set(["value_desc", "value_asc", "change_desc", "change_asc"]);
const MAX_CHART_ITEMS = 10;
const MAX_GROUPED_BAR_ITEMS = 16;
const MAX_DETAIL_TABLE_ITEMS = 120;
const LOW_RANK_TOKENS = ["最低", "最少", "倒数", "bottom", "后五", "后5", "低的5", "低5"];
const HIGH_RANK_TOKENS = ["最高", "最多", "top", "前五", "前5", "高的5", "高5"];
const ALL_MEMBER_TOKENS = ["所有", "全部", "全量", "完整", "每个", "各个", "各大", "各国家", "各地区"];
const LOW_CHANGE_RANK_TOKENS = ["下降最多", "减少最多", "下滑最多", "降幅最大", "负贡献", "拖累", "下降", "减少"];
const HIGH_CHANGE_RANK_TOKENS = ["增长最多", "上涨最多", "增加最多", "增幅最大", "正贡献", "拉动", "增长", "上涨", "增加"];
const DETAIL_TABLE_TOKENS = ["完整明细", "明细表", "全部列出", "全量列出", "完整列出", "剩下也列出"];

type ActionType = FinanceActionModule["type"];
type MutableModule = Record<string, unknown> & { type: ActionType; metric?: string };

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
  copyOptionalString(record, actionModule, "seriesDimension");
  copyOptionalString(record, actionModule, "xDimension");
  copyOptionalString(record, actionModule, "yDimension");
  copyOptionalString(record, actionModule, "xMetric");
  copyOptionalString(record, actionModule, "yMetric");
  copyOptionalString(record, actionModule, "sizeMetric");
  copyOptionalString(record, actionModule, "sort");
  copyOptionalString(record, actionModule, "comparison");
  copyOptionalNumber(record, actionModule, "limit");
  copyOptionalNumber(record, actionModule, "seriesLimit");
  copyMetrics(record, actionModule);
  copyFilters(record, actionModule);
  copyComparisons(record, actionModule);
  copyChart(record, actionModule);

  return actionModule as FinanceActionModule;
}

function copyMetrics(source: Record<string, unknown>, target: MutableModule) {
  if (!Array.isArray(source.metrics)) {
    return;
  }

  const metrics = source.metrics
    .filter((metric): metric is string => typeof metric === "string")
    .map((metric) => metric.trim())
    .filter(Boolean);

  if (metrics.length) {
    target.metrics = metrics.slice(0, 6);
  }
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

  if (chart.type !== "trend_chart" && chart.type !== "metric_card") {
    return;
  }

  target.chart = {
    type: chart.type,
    ...(chart.type === "trend_chart" && typeof chart.highlightPeriod === "string" && chart.highlightPeriod.trim()
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
    validateMetric(schema, module, errors);
    validateRequiredFields(module, errors);
    validateActionOptions(module, errors);
    validateFilters(schema, module, errors);
    validatePeriods(schema, module, errors);

    if (module.type === "bar_rank" || module.type === "waterfall_bridge" || module.type === "grouped_bar" || module.type === "scatter_bubble" || module.type === "detail_table") {
      validateDimension(schema, module.dimension, errors, "维度字段");
    }

    if (module.type === "stacked_bar" || module.type === "percent_stacked_bar") {
      validateDimension(schema, module.dimension, errors, "主维度字段");
      validateDimension(schema, module.seriesDimension, errors, "系列维度字段");
    }

    if (module.type === "heatmap") {
      validateDimension(schema, module.xDimension, errors, "横轴维度字段");
      validateDimension(schema, module.yDimension, errors, "纵轴维度字段");
    }

  });

  return errors.length
    ? { ok: false, modules, errors }
    : { ok: true, modules, errors: [] };
}

export function normalizeFinanceActionPlanForQuestion(
  schema: FinanceSchema,
  plan: FinanceActionPlan,
  userQuestion: string,
): FinanceActionPlan {
  return {
    modules: alignFinanceActionPlanWithQuestion(
      schema,
      plan.modules,
      userQuestion,
    ),
  };
}

export function alignFinanceActionPlanWithQuestion(
  schema: FinanceSchema,
  modules: FinanceActionModule[],
  userQuestion: string,
): FinanceActionModule[] {
  return modules.map((module) => {
    if (module.type === "grouped_bar") {
      const changeRankSort = getChangeRankSortIntent(userQuestion);
      if (changeRankSort) {
        return {
          type: "bar_rank",
          metric: module.metric,
          dimension: module.dimension,
          period: module.period,
          filters: module.filters,
          comparison: "mom",
          sort: changeRankSort,
          limit: module.limit,
          ...(hasDetailTableIntent(userQuestion) ? { detailTable: true } : {}),
        };
      }

      return alignGroupedBarLimitWithQuestion(schema, module, userQuestion);
    }

    if (module.type === "detail_table") {
      return alignDetailTableLimitWithQuestion(schema, module, userQuestion);
    }

    if (module.type !== "bar_rank") {
      return module;
    }

    const changeRankSort = getChangeRankSortIntent(userQuestion);
    if (changeRankSort) {
      return {
        ...module,
        comparison: "mom",
        sort: changeRankSort,
        ...(hasDetailTableIntent(userQuestion) ? { detailTable: true } : {}),
      };
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

function getChangeRankSortIntent(question: string): "change_asc" | "change_desc" | null {
  const normalizedQuestion = normalizeIntentText(question);
  const asksForRanking = /排名|排行|哪些|哪[个些]|最多|最大|top|前\d+|前五|前十|倒数|lowest|highest/i.test(question) ||
    normalizedQuestion.includes("横向排名柱状图");

  if (!asksForRanking) {
    return null;
  }

  if (LOW_CHANGE_RANK_TOKENS.map(normalizeIntentText).some((token) => normalizedQuestion.includes(token))) {
    return "change_asc";
  }

  if (HIGH_CHANGE_RANK_TOKENS.map(normalizeIntentText).some((token) => normalizedQuestion.includes(token))) {
    return "change_desc";
  }

  return null;
}

function hasDetailTableIntent(question: string) {
  const normalizedQuestion = normalizeIntentText(question);

  return DETAIL_TABLE_TOKENS
    .map(normalizeIntentText)
    .some((token) => normalizedQuestion.includes(token));
}

function alignGroupedBarLimitWithQuestion(
  schema: FinanceSchema,
  module: Extract<FinanceActionModule, { type: "grouped_bar" }>,
  userQuestion: string,
): FinanceActionModule {
  if (!hasAllMemberIntent(userQuestion)) {
    return module;
  }

  const memberCount = schema.profile.dimensionValueCounts[module.dimension] ?? 0;
  if (memberCount <= 0 || memberCount > MAX_GROUPED_BAR_ITEMS) {
    return module;
  }

  const currentLimit = typeof module.limit === "number" && Number.isFinite(module.limit)
    ? Math.floor(module.limit)
    : 0;

  if (currentLimit >= memberCount) {
    return module;
  }

  return {
    ...module,
    limit: memberCount,
  };
}

function alignDetailTableLimitWithQuestion(
  schema: FinanceSchema,
  module: Extract<FinanceActionModule, { type: "detail_table" }>,
  userQuestion: string,
): FinanceActionModule {
  if (!hasAllMemberIntent(userQuestion) && !hasDetailTableIntent(userQuestion)) {
    return module;
  }

  const memberCount = schema.profile.dimensionValueCounts[module.dimension] ?? 0;
  if (memberCount <= 0) {
    return module;
  }

  const targetLimit = Math.min(memberCount, MAX_DETAIL_TABLE_ITEMS);
  const currentLimit = typeof module.limit === "number" && Number.isFinite(module.limit)
    ? Math.floor(module.limit)
    : 0;

  if (currentLimit >= targetLimit) {
    return module;
  }

  return {
    ...module,
    limit: targetLimit,
  };
}

function hasAllMemberIntent(question: string) {
  const normalizedQuestion = normalizeIntentText(question);

  return ALL_MEMBER_TOKENS
    .map(normalizeIntentText)
    .some((token) => normalizedQuestion.includes(token));
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
  if (module.type === "scatter_bubble") {
    validateMetricName(schema, module.xMetric, errors, "横轴指标");
    validateMetricName(schema, module.yMetric, errors, "纵轴指标");
    if (module.sizeMetric) {
      validateMetricName(schema, module.sizeMetric, errors, "气泡大小指标");
    }
    return undefined;
  }

  if (module.type === "detail_table") {
    if (!module.metrics.length) {
      errors.push("明细表需要至少 1 个指标。");
      return undefined;
    }

    module.metrics.forEach((metricName) => validateMetricName(schema, metricName, errors, "明细指标"));
    return undefined;
  }

  const metric = findMetric(schema, module.metric);

  if (!metric) {
    errors.push(`指标不存在：${module.metric || "未填写"}`);
  }

  return metric;
}

function validateMetricName(schema: FinanceSchema, metricName: string | undefined, errors: string[], label: string) {
  if (!metricName || !findMetric(schema, metricName)) {
    errors.push(`${label}不存在：${metricName || "未填写"}`);
  }
}

function validateRequiredFields(module: FinanceActionModule, errors: string[]) {
  const record = module as Record<string, unknown>;

  if (module.type === "metric_snapshot" && !hasStringValue(record.period)) {
    errors.push("指标快照需要指定期间。");
  }

  if (
    (module.type === "grouped_bar" ||
      module.type === "stacked_bar" ||
      module.type === "percent_stacked_bar" ||
      module.type === "heatmap" ||
      module.type === "scatter_bubble" ||
      module.type === "detail_table") &&
    !hasStringValue(record.period)
  ) {
    errors.push("图表需要指定期间。");
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

  if (module.type === "grouped_bar") {
    const record = module as Record<string, unknown>;
    if (typeof record.comparison === "string" && record.comparison !== "mom") {
      errors.push("分组柱状图对比只支持环比。");
      delete record.comparison;
    }
  }

  if (module.type === "bar_rank" || module.type === "waterfall_bridge") {
    validateLimit(
      module,
      errors,
      module.type === "bar_rank"
        ? "排名数量"
        : "瀑布桥维度项",
    );
  }

  if (
    module.type === "stacked_bar" ||
    module.type === "percent_stacked_bar" ||
    module.type === "heatmap"
  ) {
    normalizeChartLimit(module, MAX_CHART_ITEMS);
  }

  if (module.type === "grouped_bar") {
    normalizeChartLimit(module, MAX_GROUPED_BAR_ITEMS);
  }

  if (module.type === "scatter_bubble") {
    normalizeChartLimit(module, 15);
  }

  if (module.type === "detail_table") {
    normalizeChartLimit(module, 120);
  }

  if (module.type === "stacked_bar" || module.type === "percent_stacked_bar") {
    validateSeriesLimit(module, errors);
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
    record.limit = MAX_CHART_ITEMS;
    if (label === "排名数量") {
      record.detailTable = true;
    } else {
      errors.push(`${label}最多 ${MAX_CHART_ITEMS} 项。`);
    }
    return;
  }

  record.limit = normalizedLimit;
}

function normalizeChartLimit(module: FinanceActionModule, max: number) {
  const record = module as Record<string, unknown>;

  if (typeof record.limit !== "number") {
    return;
  }

  if (record.limit <= 0) {
    delete record.limit;
    return;
  }

  record.limit = Math.min(Math.floor(record.limit), max);
}

function hasStringValue(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function validateSeriesLimit(module: FinanceActionModule, errors: string[]) {
  const record = module as Record<string, unknown>;

  if (typeof record.seriesLimit !== "number") {
    return;
  }

  if (record.seriesLimit <= 0) {
    errors.push("系列数量需要大于 0。");
    delete record.seriesLimit;
    return;
  }

  record.seriesLimit = Math.min(Math.floor(record.seriesLimit), 6);
}

function validateDimension(schema: FinanceSchema, dimension: unknown, errors: string[], label: string) {
  if (typeof dimension !== "string" || !dimension.trim()) {
    errors.push(`需要${label}。`);
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
