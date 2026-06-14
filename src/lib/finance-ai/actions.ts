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
const DRILLDOWN_TOKENS = ["构成", "组成", "内部", "下面", "下级", "下钻", "细分", "拆开", "拆成", "自身", "自己", "哪些国家", "哪些车型", "由哪些"];
const REASON_FOLLOWUP_TOKENS = ["为什么", "为啥", "原因", "怎么会", "怎么", "咋", "下降这么多", "降这么多", "减少这么多", "变化这么多", "差这么多", "坏这么多", "坏的", "拖累这么多", "影响这么多"];
const CONJUNCTIVE_CHANGE_TOKENS = ["都增长", "均增长", "同时增长", "一起增长", "都增加", "均增加", "同时增加", "都上涨", "均上涨", "同时上涨", "都上升", "均上升", "双增长", "双升", "都下降", "均下降", "同时下降", "都减少", "均减少", "同时减少"];
const SCENARIO_COMPARE_TOKENS = ["预算", "目标", "实际", "预测", "计划", "达成", "target", "budget", "actual", "forecast", "plan"];
const WATERFALL_ATTRIBUTION_TOKENS = ["变化来源", "差异来源", "贡献拆解", "归因", "瀑布", "桥", "贡献", "拆解", "影响", "原因"];
const UNIT_COMPOSITION_SUPPORT_TOKENS = ["构成分析", "构成", "组成", "结构", "量比较", "销量比较", "收入比较", "收入对比", "影响", "原因"];
const SCENARIO_DIMENSION_ALIASES = ["数据口径", "口径", "场景", "scenario", "scenarios"];
const PRIMARY_DIMENSION_MODULE_TYPES = new Set<ActionType>([
  "bar_rank",
  "waterfall_bridge",
  "grouped_bar",
  "scatter_bubble",
  "detail_table",
]);
const PERIOD_DEFAULTABLE_MODULE_TYPES = new Set<ActionType>([
  "metric_snapshot",
  "bar_rank",
  "grouped_bar",
  "stacked_bar",
  "percent_stacked_bar",
  "heatmap",
  "scatter_bubble",
  "detail_table",
]);

type ActionType = FinanceActionModule["type"];
type MutableModule = Record<string, unknown> & { type: ActionType; metric?: string };
type FinanceActionQuestionContext = {
  currentMetric?: string;
  currentFilters?: FinanceFilter;
  analysisContext?: Array<{
    metric?: string;
    period?: string;
    fromPeriod?: string;
    toPeriod?: string;
    comparison?: string;
    fromScenario?: string;
    toScenario?: string;
    filters?: FinanceFilter;
    focusValues?: Array<{ dimension: string; value: string }>;
  }>;
};

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
  copyOptionalString(record, actionModule, "fromScenario");
  copyOptionalString(record, actionModule, "toScenario");
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
    validateActionOptions(schema, module, errors);
    validateFilters(schema, module, errors);
    validatePeriods(schema, module, errors);

    if (module.type === "bar_rank" || module.type === "waterfall_bridge" || module.type === "grouped_bar" || module.type === "scatter_bubble" || module.type === "detail_table") {
      validateDimension(schema, module.dimension, errors, "维度字段");
    }

    if (module.type === "grouped_bar" && module.seriesDimension) {
      validateDimension(schema, module.seriesDimension, errors, "系列维度字段");
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
  context: FinanceActionQuestionContext = {},
): FinanceActionPlan {
  return {
    modules: alignFinanceActionPlanWithQuestion(
      schema,
      plan.modules,
      userQuestion,
      context,
    ),
  };
}

export function alignFinanceActionPlanWithQuestion(
  schema: FinanceSchema,
  modules: FinanceActionModule[],
  userQuestion: string,
  context: FinanceActionQuestionContext = {},
): FinanceActionModule[] {
  const alignedModules: FinanceActionModule[] = modules.map((module) => {
    module = alignReasonFollowupWithContext(schema, module, userQuestion, context);
    module = alignPrimaryDimensionWithQuestion(schema, module, userQuestion);
    module = alignExplicitDimensionMemberWithQuestion(schema, module, userQuestion, context);
    module = alignScenarioComparisonChartWithQuestion(schema, module, userQuestion);
    module = alignDefaultPeriodWithQuestion(schema, module, userQuestion, context);

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
        } satisfies FinanceActionModule;
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

  const conjunctiveModules = alignConjunctiveChangePlanWithQuestion(schema, alignedModules, userQuestion);
  const expandedModules = expandUnitCompositionSupportModules(schema, conjunctiveModules, userQuestion);
  return applyDefaultScenarioFilters(schema, expandedModules, userQuestion);
}

function alignConjunctiveChangePlanWithQuestion(
  schema: FinanceSchema,
  modules: FinanceActionModule[],
  userQuestion: string,
): FinanceActionModule[] {
  const intent = getConjunctiveChangeIntent(schema, modules, userQuestion);
  if (!intent) {
    return modules;
  }

  const existingIndex = modules.findIndex((module) => module.type === "detail_table");
  const baseDetailTable = existingIndex >= 0 ? modules[existingIndex] : undefined;
  const detailTable = {
    type: "detail_table",
    ...(baseDetailTable && "filters" in baseDetailTable ? { filters: baseDetailTable.filters } : {}),
    metrics: intent.metrics,
    dimension: intent.dimension,
    period: intent.period,
    comparison: "mom",
    limit: intent.limit,
  } satisfies FinanceActionModule;

  if (existingIndex >= 0) {
    return modules.map((module, index) => index === existingIndex ? detailTable : module);
  }

  if (modules.length < 3) {
    return [...modules, detailTable];
  }

  return [...modules.slice(0, 2), detailTable];
}

function alignScenarioComparisonChartWithQuestion(
  schema: FinanceSchema,
  module: FinanceActionModule,
  userQuestion: string,
): FinanceActionModule {
  const scenarioDimension = getScenarioDimension(schema);
  if (!scenarioDimension || !hasScenarioComparisonIntent(userQuestion)) {
    return module;
  }

  if (module.type === "waterfall_bridge") {
    const scenarioBridge = buildScenarioWaterfallModule(schema, module, userQuestion);
    return scenarioBridge ?? module;
  }

  if (
    (module.type === "stacked_bar" || module.type === "percent_stacked_bar") &&
    module.seriesDimension === scenarioDimension
  ) {
    return {
      type: "grouped_bar",
      metric: module.metric,
      dimension: module.dimension,
      seriesDimension: module.seriesDimension,
      period: module.period,
      filters: module.filters,
      limit: module.limit,
      seriesLimit: module.seriesLimit,
    } satisfies FinanceActionModule;
  }

  if (module.type !== "grouped_bar") {
    return module;
  }

  if (module.seriesDimension === scenarioDimension) {
    return withoutGroupedComparison(module);
  }

  if (module.comparison === "mom") {
    return {
      ...withoutGroupedComparison(module),
      seriesDimension: scenarioDimension,
    };
  }

  return module;
}

function buildScenarioWaterfallModule(
  schema: FinanceSchema,
  module: Extract<FinanceActionModule, { type: "waterfall_bridge" }>,
  userQuestion: string,
): FinanceActionModule | null {
  if (!hasWaterfallAttributionIntent(userQuestion)) {
    return null;
  }

  const period = module.period || module.toPeriod || getQuestionPeriod(schema, userQuestion) || schema.profile.periods.at(-1)?.key;
  if (!period) {
    return null;
  }

  const scenarios = getScenarioComparisonSides(userQuestion);
  const nextModule = { ...module };
  delete nextModule.fromPeriod;
  delete nextModule.toPeriod;

  return {
    ...nextModule,
    period,
    comparison: "scenario",
    fromScenario: module.fromScenario || scenarios.fromScenario,
    toScenario: module.toScenario || scenarios.toScenario,
  } satisfies FinanceActionModule;
}

function expandUnitCompositionSupportModules(
  schema: FinanceSchema,
  modules: FinanceActionModule[],
  userQuestion: string,
): FinanceActionModule[] {
  if (!hasUnitCompositionSupportIntent(userQuestion) || modules.length >= 3) {
    return modules;
  }

  const waterfall = modules.find((module): module is Extract<FinanceActionModule, { type: "waterfall_bridge" }> => (
    module.type === "waterfall_bridge" &&
    findMetric(schema, module.metric)?.kind === "unit"
  ));
  if (!waterfall) {
    return modules;
  }

  const supportMetrics = [getSalesMetricName(schema), getRevenueMetricName(schema)]
    .filter((metric): metric is string => Boolean(metric))
    .filter((metric, index, array) => array.indexOf(metric) === index);
  if (!supportMetrics.length) {
    return modules;
  }

  const existingKeys = new Set(modules.map((module) => {
    const record = module as Record<string, unknown>;
    return `${module.type}:${record.metric ?? ""}:${record.dimension ?? ""}:${record.period ?? ""}:${record.comparison ?? ""}:${record.seriesDimension ?? ""}`;
  }));
  const scenarioDimension = getScenarioDimension(schema);
  const supportModules: FinanceActionModule[] = [];

  for (const metric of supportMetrics) {
    if (modules.length + supportModules.length >= 3) {
      break;
    }

    const supportModule = buildSupportGroupedBarModule(waterfall, metric, scenarioDimension);
    if (!supportModule) {
      continue;
    }

    const supportRecord = supportModule as Record<string, unknown>;
    const key = `${supportModule.type}:${supportRecord.metric ?? ""}:${supportRecord.dimension ?? ""}:${supportRecord.period ?? ""}:${supportRecord.comparison ?? ""}:${supportRecord.seriesDimension ?? ""}`;
    if (existingKeys.has(key)) {
      continue;
    }

    existingKeys.add(key);
    supportModules.push(supportModule);
  }

  return supportModules.length ? [...modules, ...supportModules] : modules;
}

function buildSupportGroupedBarModule(
  waterfall: Extract<FinanceActionModule, { type: "waterfall_bridge" }>,
  metric: string,
  scenarioDimension: string | undefined,
): FinanceActionModule | null {
  if (waterfall.comparison === "scenario") {
    if (!waterfall.period || !scenarioDimension) {
      return null;
    }

    return {
      type: "grouped_bar",
      metric,
      dimension: waterfall.dimension,
      period: waterfall.period,
      seriesDimension: scenarioDimension,
      filters: waterfall.filters,
      limit: waterfall.limit,
    } satisfies FinanceActionModule;
  }

  const period = waterfall.toPeriod || waterfall.period;
  if (!period) {
    return null;
  }

  return {
    type: "grouped_bar",
    metric,
    dimension: waterfall.dimension,
    period,
    comparison: "mom",
    filters: waterfall.filters,
    limit: waterfall.limit,
  } satisfies FinanceActionModule;
}

function getSalesMetricName(schema: FinanceSchema) {
  return schema.totalMetrics.find((metric) => metric.column === schema.salesColumn || metric.name === schema.salesColumn)?.name ??
    schema.totalMetrics.find((metric) => /销量|销售量|volume|qty|quantity|units/i.test(`${metric.name}${metric.column}`))?.name;
}

function getRevenueMetricName(schema: FinanceSchema) {
  const revenuePatterns = [/净收入|net\s*revenue|netrevenue/i, /收入|revenue|income/i];

  for (const pattern of revenuePatterns) {
    const metric = schema.totalMetrics.find((candidate) => (
      candidate.column !== schema.salesColumn &&
      pattern.test(`${candidate.name}${candidate.column}`)
    ));
    if (metric) {
      return metric.name;
    }
  }

  return undefined;
}

function applyDefaultScenarioFilters(
  schema: FinanceSchema,
  modules: FinanceActionModule[],
  userQuestion: string,
): FinanceActionModule[] {
  const scenarioDimension = getScenarioDimension(schema);
  if (!scenarioDimension || hasNonActualScenarioIntent(userQuestion)) {
    return modules;
  }

  return modules.map((module) => {
    if (!canApplyDefaultScenarioFilter(module, scenarioDimension)) {
      return module;
    }

    return {
      ...module,
      filters: mergeQuestionFilters("filters" in module ? module.filters : undefined, {
        [scenarioDimension]: ["实际"],
      }),
    } as FinanceActionModule;
  });
}

function canApplyDefaultScenarioFilter(module: FinanceActionModule, scenarioDimension: string) {
  const record = module as Record<string, unknown>;
  const filters = "filters" in module ? module.filters : undefined;

  if (filters?.[scenarioDimension]?.length) {
    return false;
  }

  if (module.type === "waterfall_bridge" && record.comparison === "scenario") {
    return false;
  }

  if (
    (module.type === "grouped_bar" || module.type === "stacked_bar" || module.type === "percent_stacked_bar") &&
    record.seriesDimension === scenarioDimension
  ) {
    return false;
  }

  return true;
}

function withoutGroupedComparison(module: Extract<FinanceActionModule, { type: "grouped_bar" }>) {
  const nextModule = { ...module };
  delete nextModule.comparison;
  return nextModule;
}

function getConjunctiveChangeIntent(
  schema: FinanceSchema,
  modules: FinanceActionModule[],
  question: string,
): { metrics: string[]; dimension: string; period: string; limit: number } | null {
  if (!hasConjunctiveChangeIntent(question)) {
    return null;
  }

  const metrics = getMentionedMetrics(schema, question).slice(0, 6);
  if (metrics.length < 2) {
    return null;
  }

  const dimension = getDimensionIntent(schema, question) ||
    (schema.dimensionColumns.includes("国家") ? "国家" : schema.dimensionColumns[0]);
  const period = getModulePeriod(schema, modules) || getQuestionPeriod(schema, question) || schema.profile.periods.at(-1)?.key;
  if (!dimension || !period) {
    return null;
  }

  const memberCount = schema.profile.dimensionValueCounts[dimension] ?? MAX_DETAIL_TABLE_ITEMS;
  return {
    metrics,
    dimension,
    period,
    limit: Math.min(Math.max(memberCount, 1), MAX_DETAIL_TABLE_ITEMS),
  };
}

function alignReasonFollowupWithContext(
  schema: FinanceSchema,
  module: FinanceActionModule,
  userQuestion: string,
  context: FinanceActionQuestionContext,
): FinanceActionModule {
  if (module.type !== "waterfall_bridge" || !hasReasonFollowupIntent(userQuestion)) {
    return module;
  }

  const record = module as Record<string, unknown>;
  const latestContext = getLatestAnalysisContext(context);
  const updates: Record<string, unknown> = {};
  const contextMetric = getContextMetric(schema, context);

  if (!hasStringValue(record.metric) && contextMetric) {
    updates.metric = contextMetric;
  }

  if (
    latestContext?.comparison === "scenario" &&
    !hasPeriodBridgeFollowupIntent(userQuestion)
  ) {
    const period = hasStringValue(record.period)
      ? String(record.period)
      : latestContext.period || "";
    const fromScenario = hasStringValue(record.fromScenario)
      ? String(record.fromScenario)
      : latestContext.fromScenario || "";
    const toScenario = hasStringValue(record.toScenario)
      ? String(record.toScenario)
      : latestContext.toScenario || "";

    if (period && fromScenario && toScenario) {
      const scenarioModule = {
        ...module,
        ...updates,
        period,
        comparison: "scenario",
        fromScenario,
        toScenario,
      } as FinanceActionModule;
      delete (scenarioModule as Record<string, unknown>).fromPeriod;
      delete (scenarioModule as Record<string, unknown>).toPeriod;
      return scenarioModule;
    }
  }

  const toPeriod = hasStringValue(record.toPeriod)
    ? String(record.toPeriod)
    : latestContext?.toPeriod || latestContext?.period || "";
  const fromPeriod = hasStringValue(record.fromPeriod)
    ? String(record.fromPeriod)
    : latestContext?.fromPeriod || getPreviousPeriodKey(schema, toPeriod);

  if (!hasStringValue(record.toPeriod) && toPeriod) {
    updates.toPeriod = toPeriod;
  }

  if (!hasStringValue(record.fromPeriod) && fromPeriod) {
    updates.fromPeriod = fromPeriod;
  }

  return Object.keys(updates).length
    ? { ...module, ...updates } as FinanceActionModule
    : module;
}

function alignDefaultPeriodWithQuestion(
  schema: FinanceSchema,
  module: FinanceActionModule,
  userQuestion: string,
  context: FinanceActionQuestionContext,
): FinanceActionModule {
  if (!PERIOD_DEFAULTABLE_MODULE_TYPES.has(module.type)) {
    return module;
  }

  const record = module as Record<string, unknown>;
  if (hasStringValue(record.period)) {
    return module;
  }

  const defaultPeriod = getQuestionPeriod(schema, userQuestion) ||
    getLatestContextPeriod(schema, context) ||
    schema.profile.periods.at(-1)?.key ||
    "";

  if (!defaultPeriod) {
    return module;
  }

  return {
    ...module,
    period: defaultPeriod,
  } as FinanceActionModule;
}

function alignPrimaryDimensionWithQuestion(
  schema: FinanceSchema,
  module: FinanceActionModule,
  userQuestion: string,
): FinanceActionModule {
  if (!PRIMARY_DIMENSION_MODULE_TYPES.has(module.type)) {
    return module;
  }

  const record = module as Record<string, unknown>;
  if (typeof record.dimension === "string" && schema.dimensionColumns.includes(record.dimension)) {
    return module;
  }

  const dimension = getDimensionIntent(schema, userQuestion);
  if (dimension) {
    return {
      ...module,
      dimension,
    } as FinanceActionModule;
  }

  const fallbackDimension = getDefaultPrimaryDimension(schema);
  if (!fallbackDimension) {
    return module;
  }

  return {
    ...module,
    dimension: fallbackDimension,
  } as FinanceActionModule;
}

function getDefaultPrimaryDimension(schema: FinanceSchema) {
  const scenarioDimension = getScenarioDimension(schema);
  return schema.dimensionColumns.find((dimension) => dimension === "国家" && dimension !== scenarioDimension) ??
    schema.dimensionColumns.find((dimension) => dimension !== scenarioDimension) ??
    "";
}

function alignExplicitDimensionMemberWithQuestion(
  schema: FinanceSchema,
  module: FinanceActionModule,
  userQuestion: string,
  context: FinanceActionQuestionContext,
): FinanceActionModule {
  const memberIntent = getExplicitDimensionMemberIntent(schema, module, userQuestion) ??
    getContextualDimensionMemberIntent(schema, userQuestion, context);

  if (!memberIntent) {
    return module;
  }

  const record = module as Record<string, unknown>;
  const currentDimension = typeof record.dimension === "string" ? record.dimension : "";
  const asksForDrilldown = hasDrilldownIntent(userQuestion) ||
    (module.type === "waterfall_bridge" && hasReasonFollowupIntent(userQuestion));

  if (
    PRIMARY_DIMENSION_MODULE_TYPES.has(module.type) &&
    currentDimension === memberIntent.dimension &&
    !asksForDrilldown
  ) {
    return module;
  }

  const withFilters = {
    ...module,
    filters: mergeQuestionFilters("filters" in module ? module.filters : undefined, {
      [memberIntent.dimension]: [memberIntent.value],
    }),
  } as FinanceActionModule;

  if (!PRIMARY_DIMENSION_MODULE_TYPES.has(module.type) || !asksForDrilldown) {
    return withFilters;
  }

  const drillDimension = getDrilldownDimension(schema, userQuestion, memberIntent.dimension);
  if (!drillDimension) {
    return withFilters;
  }

  return {
    ...withFilters,
    dimension: drillDimension,
  } as FinanceActionModule;
}

function mergeQuestionFilters(base: FinanceFilter | undefined, extra: FinanceFilter): FinanceFilter {
  const merged: FinanceFilter = { ...(base ?? {}) };

  Object.entries(extra).forEach(([field, values]) => {
    const currentValues = merged[field] ?? [];
    merged[field] = Array.from(new Set([...currentValues, ...values]));
  });

  return merged;
}

function getExplicitDimensionMemberIntent(
  schema: FinanceSchema,
  module: FinanceActionModule,
  question: string,
): { dimension: string; value: string } | null {
  for (const dimension of schema.dimensionColumns) {
    const fromDimensionPhrase = getDimensionMemberNearLabel(question, dimension);
    if (fromDimensionPhrase) {
      return { dimension, value: fromDimensionPhrase };
    }
  }

  const record = module as Record<string, unknown>;
  const currentDimension = typeof record.dimension === "string" ? record.dimension : "";
  if (!currentDimension || !schema.dimensionColumns.includes(currentDimension) || !hasDrilldownIntent(question)) {
    return null;
  }

  const standaloneToken = question.match(/([A-Za-z][A-Za-z0-9_-]{1,30})(?=\s*(?:中|内|里|自身|自己|的))/)?.[1]?.trim();
  return standaloneToken ? { dimension: currentDimension, value: standaloneToken } : null;
}

function getContextualDimensionMemberIntent(
  schema: FinanceSchema,
  question: string,
  context: FinanceActionQuestionContext,
): { dimension: string; value: string } | null {
  if (!hasFollowupReferenceIntent(question)) {
    return null;
  }

  const currentFilterIntent = Object.entries(context.currentFilters ?? {})
    .find(([dimension, values]) => schema.dimensionColumns.includes(dimension) && values.length === 1);
  if (currentFilterIntent) {
    return { dimension: currentFilterIntent[0], value: currentFilterIntent[1][0] };
  }

  const contextFocusValues = (context.analysisContext ?? [])
    .slice()
    .reverse()
    .flatMap((item) => item.focusValues ?? []);
  const focusValue = contextFocusValues.find((item) => (
    schema.dimensionColumns.includes(item.dimension) &&
    typeof item.value === "string" &&
    item.value.trim()
  ));

  return focusValue ? { dimension: focusValue.dimension, value: focusValue.value.trim() } : null;
}

function getLatestAnalysisContext(context: FinanceActionQuestionContext) {
  return (context.analysisContext ?? [])
    .slice()
    .reverse()
    .find((item) => (
      item.metric ||
      item.period ||
      item.fromPeriod ||
      item.toPeriod ||
      item.comparison ||
      item.fromScenario ||
      item.toScenario ||
      item.filters ||
      item.focusValues?.length
    ));
}

function getContextMetric(schema: FinanceSchema, context: FinanceActionQuestionContext) {
  const candidates = [
    context.currentMetric,
    ...(context.analysisContext ?? []).slice().reverse().map((item) => item.metric),
  ];

  return candidates.find((metric): metric is string => Boolean(metric && findMetric(schema, metric)));
}

function getLatestContextPeriod(schema: FinanceSchema, context: FinanceActionQuestionContext) {
  const validPeriods = new Set(schema.profile.periods.map((period) => period.key));
  const candidates = (context.analysisContext ?? [])
    .slice()
    .reverse()
    .flatMap((item) => [item.period, item.toPeriod, item.fromPeriod])
    .flatMap((period) => {
      if (!period) {
        return [];
      }

      const normalized = normalizePeriodValue(period)?.key ?? period;
      return validPeriods.has(normalized) ? [normalized] : [];
    });

  return candidates[0] ?? "";
}

function getPreviousPeriodKey(schema: FinanceSchema, periodKey: string) {
  if (!periodKey) {
    return "";
  }

  const periodIndex = schema.profile.periods.findIndex((period) => period.key === periodKey);
  return periodIndex > 0 ? schema.profile.periods[periodIndex - 1]?.key ?? "" : "";
}

function getDimensionMemberNearLabel(question: string, dimension: string): string {
  const lowerQuestion = question.toLowerCase();
  const lowerDimension = dimension.toLowerCase();
  const dimensionIndex = lowerQuestion.indexOf(lowerDimension);

  if (dimensionIndex < 0) {
    return "";
  }

  const prefix = question.slice(0, dimensionIndex).trim();
  const prefixAsciiToken = prefix.match(/([A-Za-z][A-Za-z0-9_-]{1,30})\s*$/)?.[1]?.trim();
  if (prefixAsciiToken && !isQuestionToken(prefixAsciiToken)) {
    return prefixAsciiToken;
  }

  const suffix = question.slice(dimensionIndex + dimension.length);
  const suffixToken = suffix.match(/^\s*(?:=|是|为|:|：)\s*([A-Za-z][A-Za-z0-9_-]{1,30}|[\u4e00-\u9fa5]{1,16})/)?.[1]?.trim();
  if (suffixToken && !isQuestionToken(suffixToken)) {
    return suffixToken;
  }

  return "";
}

function isQuestionToken(value: string) {
  return /^(哪些|哪个|这个|那个|所有|全部|各个|每个|主要|什么)$/.test(value);
}

function hasDrilldownIntent(question: string) {
  const normalizedQuestion = normalizeIntentText(question);

  return DRILLDOWN_TOKENS
    .map(normalizeIntentText)
    .some((token) => normalizedQuestion.includes(token));
}

function hasFollowupReferenceIntent(question: string) {
  const normalizedQuestion = normalizeIntentText(question);

  return ["它", "这个", "那个", "其中", "上面", "刚才", "前面", "该项", "自身", "自己"]
    .map(normalizeIntentText)
    .some((token) => normalizedQuestion.includes(token)) ||
    hasReasonFollowupIntent(question);
}

function hasReasonFollowupIntent(question: string) {
  const normalizedQuestion = normalizeIntentText(question);

  return REASON_FOLLOWUP_TOKENS
    .map(normalizeIntentText)
    .some((token) => normalizedQuestion.includes(token));
}

function hasPeriodBridgeFollowupIntent(question: string) {
  const normalizedQuestion = normalizeIntentText(question);

  return [
    "环比",
    "同比",
    "上月",
    "上个月",
    "上期",
    "上一期",
    "去年",
    "上年",
    "较上月",
    "较上期",
    "比上月",
    "比上期",
  ]
    .map(normalizeIntentText)
    .some((token) => normalizedQuestion.includes(token));
}

function hasConjunctiveChangeIntent(question: string) {
  const normalizedQuestion = normalizeIntentText(question);

  return CONJUNCTIVE_CHANGE_TOKENS
    .map(normalizeIntentText)
    .some((token) => normalizedQuestion.includes(token));
}

function hasScenarioComparisonIntent(question: string) {
  const normalizedQuestion = normalizeIntentText(question);

  return SCENARIO_COMPARE_TOKENS
    .map(normalizeIntentText)
    .some((token) => normalizedQuestion.includes(token));
}

function hasNonActualScenarioIntent(question: string) {
  const normalizedQuestion = normalizeIntentText(question);

  return ["预算", "目标", "预测", "计划", "达成", "budget", "target", "forecast", "plan"]
    .map(normalizeIntentText)
    .some((token) => normalizedQuestion.includes(token));
}

function hasWaterfallAttributionIntent(question: string) {
  const normalizedQuestion = normalizeIntentText(question);

  return WATERFALL_ATTRIBUTION_TOKENS
    .map(normalizeIntentText)
    .some((token) => normalizedQuestion.includes(token));
}

function hasUnitCompositionSupportIntent(question: string) {
  const normalizedQuestion = normalizeIntentText(question);

  return UNIT_COMPOSITION_SUPPORT_TOKENS
    .map(normalizeIntentText)
    .some((token) => normalizedQuestion.includes(token));
}

function getScenarioComparisonSides(question: string) {
  const normalizedQuestion = normalizeIntentText(question);
  const toScenario = normalizedQuestion.includes(normalizeIntentText("目标")) ||
    normalizedQuestion.includes("target")
    ? "目标"
    : normalizedQuestion.includes(normalizeIntentText("预测")) || normalizedQuestion.includes("forecast")
      ? "预测"
      : normalizedQuestion.includes(normalizeIntentText("计划")) || normalizedQuestion.includes("plan")
        ? "计划"
        : "实际";
  const fromScenario = normalizedQuestion.includes(normalizeIntentText("目标")) ||
    normalizedQuestion.includes("target")
    ? "目标"
    : normalizedQuestion.includes(normalizeIntentText("预算")) || normalizedQuestion.includes("budget")
      ? "预算"
      : normalizedQuestion.includes(normalizeIntentText("预测")) || normalizedQuestion.includes("forecast")
        ? "预测"
        : "预算";

  return fromScenario === toScenario
    ? { fromScenario, toScenario: "实际" }
    : { fromScenario, toScenario };
}

function getScenarioDimension(schema: FinanceSchema) {
  const aliases = SCENARIO_DIMENSION_ALIASES.map(normalizeIntentText);

  return schema.dimensionColumns.find((dimension) => (
    aliases.includes(normalizeIntentText(dimension))
  ));
}

function getMentionedMetrics(schema: FinanceSchema, question: string) {
  const normalizedQuestion = normalizeIntentText(question);
  const metrics = [...schema.totalMetrics, ...schema.unitMetrics];

  const mentionedMetrics = metrics
    .map((metric) => {
      const aliases = getMetricIntentAliases(schema, metric.name);
      const firstIndex = aliases.reduce((bestIndex, alias) => {
        const index = normalizedQuestion.indexOf(alias);
        return index >= 0 && (bestIndex < 0 || index < bestIndex) ? index : bestIndex;
      }, -1);

      return { name: metric.name, kind: metric.kind, normalizedName: normalizeIntentText(metric.name), firstIndex };
    })
    .filter((metric) => metric.firstIndex >= 0);

  return mentionedMetrics
    .filter((metric) => !mentionedMetrics.some((other) => (
      other.name !== metric.name &&
      other.normalizedName.length > metric.normalizedName.length &&
      other.normalizedName.includes(metric.normalizedName) &&
      other.firstIndex <= metric.firstIndex &&
      metric.kind === "total"
    )))
    .sort((a, b) => a.firstIndex - b.firstIndex)
    .map((metric) => metric.name);
}

function getModulePeriod(schema: FinanceSchema, modules: FinanceActionModule[]) {
  const periodKeys = new Set(schema.profile.periods.map((period) => period.key));

  for (const actionModule of modules) {
    const record = actionModule as Record<string, unknown>;
    const period = typeof record.period === "string"
      ? record.period
      : typeof record.toPeriod === "string"
        ? record.toPeriod
        : "";

    if (periodKeys.has(period)) {
      return period;
    }
  }

  return "";
}

function getQuestionPeriod(schema: FinanceSchema, question: string) {
  const normalizedQuestion = normalizeIntentText(question);

  return schema.profile.periods.find((period) => (
    normalizedQuestion.includes(normalizeIntentText(period.key)) ||
    normalizedQuestion.includes(normalizeIntentText(period.label))
  ))?.key ?? "";
}

function getDrilldownDimension(schema: FinanceSchema, question: string, filteredDimension: string) {
  const normalizedQuestion = normalizeIntentText(question);
  const explicitTarget = schema.dimensionColumns.find((dimension) => (
    dimension !== filteredDimension &&
    normalizedQuestion.includes(normalizeIntentText(dimension))
  ));

  if (explicitTarget) {
    return explicitTarget;
  }

  const filteredIndex = schema.dimensionColumns.indexOf(filteredDimension);
  return schema.dimensionColumns[filteredIndex + 1] ??
    schema.dimensionColumns.find((dimension) => dimension !== filteredDimension) ??
    "";
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

function getDimensionIntent(schema: FinanceSchema, question: string) {
  const normalizedQuestion = normalizeIntentText(question);

  return schema.dimensionColumns.find((dimension) => (
    normalizedQuestion.includes(normalizeIntentText(dimension))
  ));
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
    if (record.comparison === "scenario") {
      if (!hasStringValue(record.period)) {
        errors.push("口径瀑布桥需要指定期间。");
      }

      if (!hasStringValue(record.fromScenario)) {
        errors.push("口径瀑布桥需要指定基准口径。");
      }

      if (!hasStringValue(record.toScenario)) {
        errors.push("口径瀑布桥需要指定对比口径。");
      }

      return;
    }

    if (!hasStringValue(record.fromPeriod)) {
      errors.push("瀑布桥需要指定开始期间。");
    }

    if (!hasStringValue(record.toPeriod)) {
      errors.push("瀑布桥需要指定结束期间。");
    }
  }
}

function validateActionOptions(schema: FinanceSchema, module: FinanceActionModule, errors: string[]) {
  if (module.type === "bar_rank") {
    validateBarRankOptions(module, errors);
  }

  if (module.type === "grouped_bar") {
    const record = module as Record<string, unknown>;
    const hasSeriesDimension = hasStringValue(record.seriesDimension);
    if (typeof record.comparison === "string" && record.comparison !== "mom") {
      errors.push("分组柱状图对比只支持环比。");
      delete record.comparison;
    }

    if (hasSeriesDimension && typeof record.comparison === "string") {
      delete record.comparison;
    }

    if (!hasSeriesDimension && record.comparison !== "mom") {
      errors.push("分组柱状图需要指定环比对比或系列维度。");
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

  if (module.type === "grouped_bar" || module.type === "stacked_bar" || module.type === "percent_stacked_bar") {
    validateSeriesLimit(module, errors);
  }

  if (module.type === "waterfall_bridge") {
    const record = module as Record<string, unknown>;
    if (typeof record.comparison === "string" && record.comparison !== "scenario") {
      errors.push("瀑布桥对比只支持期间桥或口径桥。");
      delete record.comparison;
    }

    if (record.comparison === "scenario" && !getScenarioDimension(schema)) {
      errors.push("口径瀑布桥需要数据口径维度。");
    }
  }

  if (
    (module.type === "stacked_bar" || module.type === "percent_stacked_bar") &&
    findMetric(schema, module.metric)?.kind === "unit"
  ) {
    errors.push("堆叠结构图不支持单车指标，请改用分组柱状图、瀑布桥或明细表。");
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
