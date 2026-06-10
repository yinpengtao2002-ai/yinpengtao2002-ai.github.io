// @ts-expect-error - Node's test runner imports this route with TypeScript extensions.
import { buildFinanceAIDirectAnalyzePrompt, buildFinanceAIDataRequestPrompt, buildFinanceAIExplanationPrompt, buildFinanceAIPlanningContext, buildFinanceAISelectedRowsAnalyzePrompt } from "../../../../lib/finance-ai/context.ts";
import type { FinanceAIChatState } from "../../../../lib/finance-ai/context.ts";
// @ts-expect-error - Node's test runner imports this route with TypeScript extensions.
import { normalizeFinanceActionPlanForQuestion, validateFinanceActionPlan } from "../../../../lib/finance-ai/actions.ts";
// @ts-expect-error - Node's test runner imports this route with TypeScript extensions.
import { FINANCE_AI_ACCESS_HEADER, isFinanceAIAccessConfigured, verifyFinanceAIAccessToken } from "../../../../lib/finance-ai/access.ts";
// @ts-expect-error - Node's test runner imports this route with TypeScript extensions.
import { getChatProviders, type ChatProvider } from "../../../../lib/ai/providers.ts";
import type {
  FinanceAIDirectAnalysis,
  FinanceAIDirectBarRankChart,
  FinanceAIDirectChart,
  FinanceAIDirectDetailTableChart,
  FinanceAIDirectHeatmapChart,
  FinanceAIDirectScatterBubbleChart,
  FinanceAIDirectSeriesChart,
  FinanceAIDirectTrendChart,
  FinanceAIDirectWaterfallChart,
  FinanceActionPlan,
  FinanceAIDataRequest,
  FinanceAIDataSelection,
  FinanceFilter,
  FinanceRawWorkbook,
  FinanceSchema,
  FinanceTableMeta,
  FinanceTableVariant,
} from "../../../../lib/finance-ai/types.ts";

const API_ROUTE_PATH = "/api/tools/finance-ai-assistant";
const PLANNING_BOUNDARY = "AI 不负责计算数字";
const CHAT_PRIMARY_TIMEOUT_MS = 60000;
const MAX_DIRECT_CHARTS = 3;
const MAX_DIRECT_TREND_POINTS = 48;
const MAX_DIRECT_RANK_ITEMS = 15;
const MAX_DIRECT_WATERFALL_ITEMS = 12;
const MAX_DIRECT_SERIES = 6;
const MAX_DIRECT_SERIES_ITEMS = 16;
const MAX_DIRECT_HEATMAP_AXIS = 14;
const MAX_DIRECT_TABLE_ROWS = 120;
const MAX_DIRECT_TABLE_COLUMNS = 10;
const DIRECT_TABLE_VARIANTS = new Set<FinanceTableVariant>([
  "rank",
  "comparison",
  "budget_actual",
  "attribution_detail",
  "exception_list",
  "generic",
]);
const DIRECT_SCENARIO_COMPARE_TOKENS = ["预算", "目标", "实际", "预测", "计划", "达成", "对比", "比一下", "比一比", "比较", "target", "budget", "actual", "forecast", "plan"];
const DIRECT_SCENARIO_SERIES_TOKENS = ["实际", "预算", "目标", "预测", "计划", "actual", "budget", "target", "forecast", "plan"];

type ChatMessage = {
  role: "system" | "user";
  content: string;
};

type ProviderAttempt = {
  model: string;
  status: number;
  errorCode?: string;
  error: string;
  finishReason?: string;
};

type ProviderCallOptions = {
  jsonMode: boolean;
  responseFormat?: boolean;
};

class ProviderEmptyResponseError extends Error {
  finishReason?: string;

  constructor(finishReason?: string) {
    super("DeepSeek returned empty message content.");
    this.name = "ProviderEmptyResponseError";
    this.finishReason = finishReason;
  }
}

function hasConfiguredProvider(providers: ChatProvider[]) {
  return providers.some((provider) => Boolean(provider.apiKey && provider.apiUrl));
}

function extractJsonObject(text: string) {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1]?.trim();
  const candidate = fenced || text.trim();
  const firstBrace = candidate.indexOf("{");
  const lastBrace = candidate.lastIndexOf("}");

  if (firstBrace < 0 || lastBrace <= firstBrace) {
    throw new Error("AI response did not contain JSON");
  }

  return JSON.parse(candidate.slice(firstBrace, lastBrace + 1));
}

function normalizePlan(value: unknown): FinanceActionPlan {
  const record = value && typeof value === "object" && !Array.isArray(value)
    ? value as Partial<FinanceActionPlan>
    : {};
  const modules = Array.isArray(record.modules) ? record.modules.slice(0, 3) : [];

  if (modules.length === 0) {
    throw new Error("AI response missed required modules");
  }

  return { ...record, modules } as FinanceActionPlan;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function isMetricList(value: unknown, kind: "total" | "unit") {
  return Array.isArray(value) && value.every((item) => {
    const metric = asRecord(item);
    if (metric.kind !== kind || typeof metric.name !== "string") {
      return false;
    }

    return kind === "total"
      ? typeof metric.column === "string"
      : typeof metric.numeratorColumn === "string" && typeof metric.denominatorColumn === "string";
  });
}

function isPeriodList(value: unknown) {
  return Array.isArray(value) && value.every((item) => {
    const period = asRecord(item);
    return typeof period.key === "string" &&
      typeof period.label === "string" &&
      typeof period.sort === "number";
  });
}

function isRowRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function isRawWorkbook(value: unknown): value is FinanceRawWorkbook {
  const record = asRecord(value);
  if (typeof record.fileName !== "string" || !Array.isArray(record.sheets)) {
    return false;
  }

  return record.sheets.every((item) => {
    const sheet = asRecord(item);
    return typeof sheet.name === "string" &&
      isStringArray(sheet.headers) &&
      typeof sheet.rowCount === "number" &&
      Array.isArray(sheet.rows) &&
      sheet.rows.every(isRowRecord);
  });
}

function isFinanceSchema(value: unknown): value is FinanceSchema {
  const record = asRecord(value);
  const profile = asRecord(record.profile);

  return typeof record.monthColumn === "string" &&
    typeof record.salesColumn === "string" &&
    isStringArray(record.headers) &&
    isStringArray(record.dimensionColumns) &&
    isMetricList(record.totalMetrics, "total") &&
    isMetricList(record.unitMetrics, "unit") &&
    Array.isArray(record.excludedMetricColumns) &&
    Array.isArray(record.requiredIssues) &&
    typeof profile.rowCount === "number" &&
    isPeriodList(profile.periods);
}

function normalizeFilterState(value: unknown): Record<string, string[]> {
  return Object.fromEntries(
    Object.entries(asRecord(value)).flatMap(([field, values]) => {
      if (!Array.isArray(values)) {
        return [];
      }

      const normalizedValues = values
        .filter((item): item is string => typeof item === "string")
        .map((item) => item.trim())
        .filter(Boolean);

      return normalizedValues.length > 0 ? [[field, normalizedValues]] : [];
    }),
  );
}

function normalizeStringList(value: unknown, maxItems = 12): string[] {
  return Array.isArray(value)
    ? value
        .filter((item): item is string => typeof item === "string")
        .map((item) => item.trim())
        .filter(Boolean)
        .slice(0, maxItems)
    : [];
}

function normalizeFocusValues(value: unknown) {
  return Array.isArray(value)
    ? value.flatMap((focus) => {
        const focusRecord = asRecord(focus);
        return typeof focusRecord.dimension === "string" && typeof focusRecord.value === "string"
          ? [{ dimension: focusRecord.dimension.trim(), value: focusRecord.value.trim() }]
          : [];
      }).filter((focus) => focus.dimension && focus.value).slice(0, 12)
    : [];
}

function normalizeChatState(value: unknown): FinanceAIChatState {
  const state = asRecord(value);
  const recentQuestions = Array.isArray(state.recentQuestions)
    ? state.recentQuestions
        .filter((item): item is string => typeof item === "string")
        .map((item) => item.trim())
        .filter(Boolean)
    : [];
  const recentAssistantMessages = Array.isArray(state.recentAssistantMessages)
    ? state.recentAssistantMessages
        .filter((item): item is string => typeof item === "string")
        .map((item) => item.trim())
        .filter(Boolean)
    : [];
  const chartHistory = Array.isArray(state.chartHistory)
    ? state.chartHistory.flatMap((item) => {
        const chart = asRecord(item);
        return typeof chart.type === "string" && typeof chart.title === "string"
          ? [{ type: chart.type.trim(), title: chart.title.trim() }]
          : [];
      })
    : [];
  const analysisContext = Array.isArray(state.analysisContext)
    ? state.analysisContext.flatMap((item) => {
        const contextItem = asRecord(item);
        if (typeof contextItem.type !== "string" || typeof contextItem.title !== "string") {
          return [];
        }

        const focusValues = normalizeFocusValues(contextItem.focusValues);
        const metrics = normalizeStringList(contextItem.metrics);
        const periods = normalizeStringList(contextItem.periods);

        return [{
          type: contextItem.type.trim(),
          title: contextItem.title.trim(),
          ...(typeof contextItem.chartKind === "string" && contextItem.chartKind.trim() ? { chartKind: contextItem.chartKind.trim() } : {}),
          ...(typeof contextItem.tableVariant === "string" && contextItem.tableVariant.trim() ? { tableVariant: contextItem.tableVariant.trim() } : {}),
          ...(typeof contextItem.metric === "string" && contextItem.metric.trim() ? { metric: contextItem.metric.trim() } : {}),
          ...(metrics.length > 0 ? { metrics } : {}),
          ...(typeof contextItem.dimension === "string" && contextItem.dimension.trim() ? { dimension: contextItem.dimension.trim() } : {}),
          ...(typeof contextItem.period === "string" && contextItem.period.trim() ? { period: contextItem.period.trim() } : {}),
          ...(periods.length > 0 ? { periods } : {}),
          ...(typeof contextItem.fromPeriod === "string" && contextItem.fromPeriod.trim() ? { fromPeriod: contextItem.fromPeriod.trim() } : {}),
          ...(typeof contextItem.toPeriod === "string" && contextItem.toPeriod.trim() ? { toPeriod: contextItem.toPeriod.trim() } : {}),
          ...(typeof contextItem.comparison === "string" && contextItem.comparison.trim() ? { comparison: contextItem.comparison.trim() } : {}),
          filters: normalizeFilterState(contextItem.filters),
          ...(focusValues.length > 0 ? { focusValues } : {}),
        }];
      })
    : [];

  return {
    ...(recentQuestions.length > 0 ? { recentQuestions } : {}),
    ...(recentAssistantMessages.length > 0 ? { recentAssistantMessages } : {}),
    ...(typeof state.currentMetric === "string" && state.currentMetric.trim()
      ? { currentMetric: state.currentMetric.trim() }
      : {}),
    currentFilters: normalizeFilterState(state.currentFilters),
    ...(chartHistory.length > 0 ? { chartHistory } : {}),
    ...(analysisContext.length > 0 ? { analysisContext } : {}),
  };
}

function finiteNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function normalizeDirectTrendChart(record: Record<string, unknown>): FinanceAIDirectTrendChart | null {
  const title = typeof record.title === "string" ? record.title.trim() : "";
  const points = Array.isArray(record.points)
    ? record.points.flatMap((item) => {
        const point = asRecord(item);
        const label = typeof point.label === "string" ? point.label.trim() : "";
        const value = finiteNumber(point.value);
        return label && value !== null ? [{ label, value }] : [];
      }).slice(0, MAX_DIRECT_TREND_POINTS)
    : [];

  if (!title || points.length === 0) {
    return null;
  }

  return {
    type: "trend",
    title,
    ...(typeof record.xLabel === "string" && record.xLabel.trim() ? { xLabel: record.xLabel.trim() } : {}),
    ...(typeof record.yLabel === "string" && record.yLabel.trim() ? { yLabel: record.yLabel.trim() } : {}),
    points,
    ...(typeof record.note === "string" && record.note.trim() ? { note: record.note.trim() } : {}),
  };
}

function normalizeDirectBarRankChart(record: Record<string, unknown>): FinanceAIDirectBarRankChart | null {
  const title = typeof record.title === "string" ? record.title.trim() : "";
  const items = Array.isArray(record.items)
    ? record.items.flatMap((item) => {
        const rankItem = asRecord(item);
        const label = typeof rankItem.label === "string" ? rankItem.label.trim() : "";
        const value = finiteNumber(rankItem.value);
        if (!label || value === null) {
          return [];
        }

        return [{
          label,
          value,
          ...(finiteNumber(rankItem.share) !== null ? { share: finiteNumber(rankItem.share) } : {}),
          ...(finiteNumber(rankItem.changeValue) !== null ? { changeValue: finiteNumber(rankItem.changeValue) } : {}),
          ...(typeof rankItem.detail === "string" && rankItem.detail.trim() ? { detail: rankItem.detail.trim() } : {}),
        }];
      }).slice(0, MAX_DIRECT_RANK_ITEMS)
    : [];

  if (!title || items.length === 0) {
    return null;
  }

  return {
    type: "bar_rank",
    title,
    ...(typeof record.xLabel === "string" && record.xLabel.trim() ? { xLabel: record.xLabel.trim() } : {}),
    ...(typeof record.yLabel === "string" && record.yLabel.trim() ? { yLabel: record.yLabel.trim() } : {}),
    items,
    ...(typeof record.note === "string" && record.note.trim() ? { note: record.note.trim() } : {}),
  };
}

function normalizeDirectWaterfallChart(record: Record<string, unknown>): FinanceAIDirectWaterfallChart | null {
  const title = typeof record.title === "string" ? record.title.trim() : "";
  const startLabel = typeof record.startLabel === "string" ? record.startLabel.trim() : "";
  const endLabel = typeof record.endLabel === "string" ? record.endLabel.trim() : "";
  const startValue = finiteNumber(record.startValue);
  const endValue = finiteNumber(record.endValue);
  const items = Array.isArray(record.items)
    ? record.items.flatMap((item) => {
        const bridgeItem = asRecord(item);
        const label = typeof bridgeItem.label === "string" ? bridgeItem.label.trim() : "";
        const value = finiteNumber(bridgeItem.value);
        return label && value !== null ? [{ label, value }] : [];
      }).slice(0, MAX_DIRECT_WATERFALL_ITEMS)
    : [];

  if (!title || !startLabel || !endLabel || startValue === null || endValue === null || items.length === 0) {
    return null;
  }

  return {
    type: "waterfall",
    title,
    startLabel,
    startValue,
    endLabel,
    endValue,
    items,
    ...(typeof record.note === "string" && record.note.trim() ? { note: record.note.trim() } : {}),
  };
}

function normalizeDirectSeriesChart(record: Record<string, unknown>): FinanceAIDirectSeriesChart | null {
  const type = record.type === "grouped_bar" || record.type === "stacked_bar" || record.type === "percent_stacked_bar"
    ? record.type
    : null;
  const title = typeof record.title === "string" ? record.title.trim() : "";
  const series = Array.isArray(record.series)
    ? record.series.flatMap((item) => {
        const seriesRecord = asRecord(item);
        const name = typeof seriesRecord.name === "string" ? seriesRecord.name.trim() : "";
        const items = Array.isArray(seriesRecord.items)
          ? seriesRecord.items.flatMap((seriesItem) => {
              const point = asRecord(seriesItem);
              const label = typeof point.label === "string" ? point.label.trim() : "";
              const value = finiteNumber(point.value);
              return label && value !== null ? [{ label, value }] : [];
            }).slice(0, MAX_DIRECT_SERIES_ITEMS)
          : [];

        return name && items.length > 0 ? [{ name, items }] : [];
      }).slice(0, MAX_DIRECT_SERIES)
    : [];

  if (!type || !title || series.length === 0) {
    return null;
  }

  return {
    type,
    title,
    ...(typeof record.xLabel === "string" && record.xLabel.trim() ? { xLabel: record.xLabel.trim() } : {}),
    ...(typeof record.yLabel === "string" && record.yLabel.trim() ? { yLabel: record.yLabel.trim() } : {}),
    series,
    ...(typeof record.note === "string" && record.note.trim() ? { note: record.note.trim() } : {}),
  };
}

function normalizeDirectHeatmapChart(record: Record<string, unknown>): FinanceAIDirectHeatmapChart | null {
  const title = typeof record.title === "string" ? record.title.trim() : "";
  const xLabels = Array.isArray(record.xLabels)
    ? record.xLabels.filter((item): item is string => typeof item === "string" && item.trim().length > 0).map((item) => item.trim()).slice(0, MAX_DIRECT_HEATMAP_AXIS)
    : [];
  const yLabels = Array.isArray(record.yLabels)
    ? record.yLabels.filter((item): item is string => typeof item === "string" && item.trim().length > 0).map((item) => item.trim()).slice(0, MAX_DIRECT_HEATMAP_AXIS)
    : [];
  const values = Array.isArray(record.values)
    ? record.values.slice(0, yLabels.length).flatMap((row) => {
        if (!Array.isArray(row)) {
          return [];
        }

        const rawRow = row.slice(0, xLabels.length);
        const normalizedRow = rawRow.map((value) => value === null ? null : finiteNumber(value));
        const hasOnlyNumbersOrNulls = rawRow.every((value, index) => (
          value === null || normalizedRow[index] !== null
        ));

        return hasOnlyNumbersOrNulls && normalizedRow.length === xLabels.length
          ? [normalizedRow as Array<number | null>]
          : [];
      })
    : [];

  if (!title || xLabels.length === 0 || yLabels.length === 0 || values.length !== yLabels.length) {
    return null;
  }

  return {
    type: "heatmap",
    title,
    xLabels,
    yLabels,
    values,
    ...(typeof record.note === "string" && record.note.trim() ? { note: record.note.trim() } : {}),
  };
}

function normalizeDirectScatterBubbleChart(record: Record<string, unknown>): FinanceAIDirectScatterBubbleChart | null {
  const title = typeof record.title === "string" ? record.title.trim() : "";
  const items = Array.isArray(record.items)
    ? record.items.flatMap((item) => {
        const point = asRecord(item);
        const label = typeof point.label === "string" ? point.label.trim() : "";
        const x = finiteNumber(point.x);
        const y = finiteNumber(point.y);
        if (!label || x === null || y === null) {
          return [];
        }

        return [{
          label,
          x,
          y,
          ...(finiteNumber(point.size) !== null ? { size: finiteNumber(point.size) } : {}),
        }];
      }).slice(0, MAX_DIRECT_RANK_ITEMS)
    : [];

  if (!title || items.length === 0) {
    return null;
  }

  return {
    type: "scatter_bubble",
    title,
    ...(typeof record.xLabel === "string" && record.xLabel.trim() ? { xLabel: record.xLabel.trim() } : {}),
    ...(typeof record.yLabel === "string" && record.yLabel.trim() ? { yLabel: record.yLabel.trim() } : {}),
    items,
    ...(typeof record.note === "string" && record.note.trim() ? { note: record.note.trim() } : {}),
  };
}

function normalizeTableCell(value: unknown): string | number | null {
  if (typeof value === "string" || typeof value === "number" || value === null) {
    return value;
  }

  if (typeof value === "boolean") {
    return value ? "是" : "否";
  }

  return String(value ?? "");
}

function normalizeTableVariant(value: unknown): FinanceTableVariant | undefined {
  return typeof value === "string" && DIRECT_TABLE_VARIANTS.has(value as FinanceTableVariant)
    ? value as FinanceTableVariant
    : undefined;
}

function normalizeTableMeta(value: unknown): FinanceTableMeta | undefined {
  const record = asRecord(value);
  const metrics = normalizeStringList(record.metrics, 8);
  const periods = normalizeStringList(record.periods, 8);
  const focusValues = normalizeFocusValues(record.focusValues);
  const filters = normalizeFilterState(record.filters) as FinanceFilter;
  const meta: FinanceTableMeta = {
    ...(typeof record.primaryDimension === "string" && record.primaryDimension.trim() ? { primaryDimension: record.primaryDimension.trim() } : {}),
    ...(metrics.length > 0 ? { metrics } : {}),
    ...(typeof record.period === "string" && record.period.trim() ? { period: record.period.trim() } : {}),
    ...(periods.length > 0 ? { periods } : {}),
    ...(typeof record.comparison === "string" && record.comparison.trim() ? { comparison: record.comparison.trim() } : {}),
    ...(Object.keys(filters).length > 0 ? { filters } : {}),
    ...(focusValues.length > 0 ? { focusValues } : {}),
  };

  return Object.keys(meta).length > 0 ? meta : undefined;
}

function normalizeDirectDetailTableChart(record: Record<string, unknown>): FinanceAIDirectDetailTableChart | null {
  const title = typeof record.title === "string" ? record.title.trim() : "";
  const columns = Array.isArray(record.columns)
    ? record.columns.filter((item): item is string => typeof item === "string" && item.trim().length > 0).map((item) => item.trim()).slice(0, MAX_DIRECT_TABLE_COLUMNS)
    : [];
  const rows = Array.isArray(record.rows)
    ? record.rows.flatMap((row) => (
        Array.isArray(row)
          ? [row.slice(0, columns.length).map(normalizeTableCell)]
          : []
      )).filter((row) => row.length === columns.length).slice(0, MAX_DIRECT_TABLE_ROWS)
    : [];

  if (!title || columns.length === 0 || rows.length === 0) {
    return null;
  }

  return {
    type: "detail_table",
    title,
    ...(normalizeTableVariant(record.variant) ? { variant: normalizeTableVariant(record.variant) } : {}),
    ...(normalizeTableMeta(record.meta) ? { meta: normalizeTableMeta(record.meta) } : {}),
    columns,
    rows,
    ...(typeof record.note === "string" && record.note.trim() ? { note: record.note.trim() } : {}),
  };
}

function normalizeDirectChart(value: unknown): FinanceAIDirectChart | null {
  const record = asRecord(value);

  if (record.type === "trend") {
    return normalizeDirectTrendChart(record);
  }

  if (record.type === "bar_rank") {
    return normalizeDirectBarRankChart(record);
  }

  if (record.type === "waterfall") {
    return normalizeDirectWaterfallChart(record);
  }

  if (record.type === "grouped_bar" || record.type === "stacked_bar" || record.type === "percent_stacked_bar") {
    return normalizeDirectSeriesChart(record);
  }

  if (record.type === "heatmap") {
    return normalizeDirectHeatmapChart(record);
  }

  if (record.type === "scatter_bubble") {
    return normalizeDirectScatterBubbleChart(record);
  }

  if (record.type === "detail_table") {
    return normalizeDirectDetailTableChart(record);
  }

  return null;
}

function normalizeDirectIntentText(value: string) {
  return value.toLowerCase().replace(/[\s_\-./,，。:：;；、"'“”‘’()（）]/g, "");
}

function hasDirectScenarioCompareIntent(question: string) {
  const normalizedQuestion = normalizeDirectIntentText(question);

  return DIRECT_SCENARIO_COMPARE_TOKENS
    .map(normalizeDirectIntentText)
    .some((token) => normalizedQuestion.includes(token));
}

function directSeriesLooksLikeScenario(series: FinanceAIDirectSeriesChart["series"]) {
  const tokens = DIRECT_SCENARIO_SERIES_TOKENS.map(normalizeDirectIntentText);

  return series.some((item) => {
    const name = normalizeDirectIntentText(item.name);
    return tokens.some((token) => name.includes(token));
  });
}

function alignDirectChartWithQuestion(chart: FinanceAIDirectChart, question: string): FinanceAIDirectChart {
  if (
    (chart.type === "stacked_bar" || chart.type === "percent_stacked_bar") &&
    hasDirectScenarioCompareIntent(question) &&
    directSeriesLooksLikeScenario(chart.series)
  ) {
    return {
      ...chart,
      type: "grouped_bar",
      note: chart.note || "实际、预算、目标等口径不能相加，因此用并列柱对比。",
    };
  }

  return chart;
}

function normalizeDirectAnalysis(value: unknown, question = ""): FinanceAIDirectAnalysis {
  const record = asRecord(value);
  const answer = typeof record.answer === "string" && record.answer.trim()
    ? record.answer.trim()
    : "我已经读取底稿，但这次没有生成可展示的分析结论。";
  const assumptions = Array.isArray(record.assumptions)
    ? record.assumptions
        .filter((item): item is string => typeof item === "string")
        .map((item) => item.trim())
        .filter(Boolean)
        .slice(0, 8)
    : [];
  const charts = Array.isArray(record.charts)
    ? record.charts
        .map(normalizeDirectChart)
        .filter((chart): chart is FinanceAIDirectChart => chart !== null)
        .map((chart) => alignDirectChartWithQuestion(chart, question))
        .slice(0, MAX_DIRECT_CHARTS)
    : [];

  return { answer, assumptions, charts };
}

function normalizeDataRequest(value: unknown): FinanceAIDataRequest {
  const record = asRecord(value);
  const columns = Array.isArray(record.columns)
    ? record.columns
        .filter((item): item is string => typeof item === "string")
        .map((item) => item.trim())
        .filter(Boolean)
        .slice(0, 40)
    : [];
  const filters = Object.fromEntries(
    Object.entries(asRecord(record.filters)).flatMap(([field, values]) => {
      if (!Array.isArray(values)) {
        return [];
      }

      const normalizedValues = values
        .filter((item): item is string | number | boolean => (
          typeof item === "string" ||
          typeof item === "number" ||
          typeof item === "boolean"
        ))
        .map((item) => String(item).trim())
        .filter(Boolean)
        .slice(0, 40);

      return field.trim() && normalizedValues.length > 0 ? [[field.trim(), normalizedValues]] : [];
    }),
  );
  const rowLimit = finiteNumber(record.rowLimit);

  if (columns.length === 0) {
    throw new Error("AI data request missed required columns");
  }

  return {
    ...(typeof record.sheetName === "string" && record.sheetName.trim() ? { sheetName: record.sheetName.trim() } : {}),
    columns,
    ...(Object.keys(filters).length > 0 ? { filters } : {}),
    rowLimit: rowLimit !== null ? Math.min(Math.max(Math.floor(rowLimit), 1), 20000) : 10000,
    ...(typeof record.reason === "string" && record.reason.trim() ? { reason: record.reason.trim() } : {}),
  };
}

function isDataSelection(value: unknown): value is FinanceAIDataSelection {
  const record = asRecord(value);
  const request = asRecord(record.request);

  return typeof record.sheetName === "string" &&
    isStringArray(record.headers) &&
    Array.isArray(record.rows) &&
    record.rows.every(isRowRecord) &&
    typeof record.rowCount === "number" &&
    typeof record.totalMatchedRowCount === "number" &&
    typeof record.omittedRowCount === "number" &&
    isStringArray(request.columns);
}

function getUpstreamStatus(error: unknown) {
  if (error instanceof DOMException && error.name === "AbortError") {
    return 504;
  }

  return 502;
}

function getUpstreamErrorMessage(error: unknown) {
  if (error instanceof DOMException && error.name === "AbortError") {
    return "DeepSeek 分析超时了，请稍后重试，或把问题缩窄到一个月份、一个指标或一个维度。";
  }

  if (error instanceof ProviderEmptyResponseError) {
    return "DeepSeek 这次没有返回正文内容。";
  }

  return error instanceof Error ? error.message : "Upstream request failed";
}

function getUpstreamErrorCode(error: unknown) {
  if (error instanceof DOMException && error.name === "AbortError") {
    return "provider_timeout";
  }

  if (error instanceof ProviderEmptyResponseError) {
    return "provider_empty_response";
  }

  return "provider_failed";
}

async function callProvider(
  provider: ChatProvider,
  messages: ChatMessage[],
  options: ProviderCallOptions,
) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), provider.timeoutMs);
  const shouldUseProviderJsonMode = options.jsonMode && options.responseFormat !== false;

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
        max_tokens: options.jsonMode ? 1800 : 1200,
        stream: false,
        ...(shouldUseProviderJsonMode ? { response_format: { type: "json_object" } } : {}),
        messages,
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      throw new Error(detail.slice(0, 500) || `Upstream responded with ${response.status}`);
    }

    const payload = await response.json();
    const choice = payload?.choices?.[0];
    const content = choice?.message?.content;

    if (typeof content !== "string" || !content.trim()) {
      throw new ProviderEmptyResponseError(
        typeof choice?.finish_reason === "string" ? choice.finish_reason : undefined,
      );
    }

    return content;
  } finally {
    clearTimeout(timeoutId);
  }
}

async function callFirstConfiguredProvider(messages: ChatMessage[], options: ProviderCallOptions) {
  const providers = getChatProviders(CHAT_PRIMARY_TIMEOUT_MS);
  const attempts: ProviderAttempt[] = [];

  if (!hasConfiguredProvider(providers)) {
    return {
      ok: false as const,
      status: 503,
      errorCode: "provider_not_configured",
      error: "No finance AI provider is configured.",
      attempts,
    };
  }

  for (const provider of providers) {
    if (!provider.apiKey || !provider.apiUrl) {
      attempts.push({
        model: provider.model,
        status: 503,
        error: "Provider missing apiKey or apiUrl",
      });
      continue;
    }

    try {
      const content = await callProvider(provider, messages, options);
      return { ok: true as const, content, provider: provider.model };
    } catch (error) {
      attempts.push({
        model: provider.model,
        status: getUpstreamStatus(error),
        errorCode: getUpstreamErrorCode(error),
        error: getUpstreamErrorMessage(error),
        ...(error instanceof ProviderEmptyResponseError && error.finishReason
          ? { finishReason: error.finishReason }
          : {}),
      });
    }
  }

  const timeoutAttempt = attempts.find((attempt) => attempt.status === 504);
  const emptyAttempt = attempts.find((attempt) => attempt.errorCode === "provider_empty_response");
  return {
    ok: false as const,
    status: timeoutAttempt ? 504 : 502,
    errorCode: timeoutAttempt ? "provider_timeout" : emptyAttempt ? "provider_empty_response" : "provider_failed",
    error: attempts.at(-1)?.error || "Finance AI provider failed.",
    attempts,
  };
}

function errorResponse(
  status: number,
  errorCode: string,
  message: string,
  details?: Record<string, unknown>,
) {
  return Response.json(
    {
      error: message,
      errorCode,
      route: API_ROUTE_PATH,
      ...details,
    },
    { status },
  );
}

export async function POST(req: Request) {
  if (!isFinanceAIAccessConfigured()) {
    return errorResponse(503, "access_not_configured", "财务分析 AI 助手尚未配置内测密钥。");
  }

  if (!verifyFinanceAIAccessToken(req.headers.get(FINANCE_AI_ACCESS_HEADER))) {
    return errorResponse(401, "access_denied", "请先输入内测密钥。");
  }

  let body: Record<string, unknown>;

  try {
    body = await req.json();
  } catch {
    return errorResponse(400, "invalid_json", "Request body must be valid JSON.");
  }

  const mode = String(body.mode || "");

  if (mode === "diagnose") {
    const providerResult = await callFirstConfiguredProvider(
      [
        {
          role: "system",
          content: "You are a connection diagnostic endpoint. Reply with exactly OK.",
        },
        { role: "user", content: "ping" },
      ],
      { jsonMode: false },
    );

    if (!providerResult.ok) {
      return errorResponse(providerResult.status, providerResult.errorCode, providerResult.error, {
        attempts: providerResult.attempts,
      });
    }

    return Response.json({
      ok: true,
      provider: providerResult.provider,
      contentLength: providerResult.content.trim().length,
    });
  }

  if (mode === "data_request") {
    const question = typeof body.question === "string" ? body.question.trim() : "";
    const workbook = body.workbook;

    if (!question) {
      return errorResponse(400, "missing_question", "Data request mode requires a question.");
    }

    if (!isRawWorkbook(workbook)) {
      return errorResponse(400, "invalid_workbook", "Data request mode requires a valid uploaded workbook.");
    }

    const prompt = buildFinanceAIDataRequestPrompt({
      userQuestion: question,
      workbook,
      state: normalizeChatState(body.state),
    });
    const providerResult = await callFirstConfiguredProvider(
      [
        {
          role: "system",
          content: "你是 Lucas 网站里的财务分析 AI 助手。你先决定要读取哪些上传底稿原始明细行，只返回严格 JSON 取数请求。",
        },
        { role: "user", content: prompt },
      ],
      { jsonMode: true, responseFormat: false },
    );

    if (!providerResult.ok) {
      return errorResponse(providerResult.status, providerResult.errorCode, providerResult.error, {
        attempts: providerResult.attempts,
      });
    }

    try {
      return Response.json({ dataRequest: normalizeDataRequest(extractJsonObject(providerResult.content)) });
    } catch (error) {
      return errorResponse(
        502,
        "provider_invalid_json",
        error instanceof Error ? error.message : "AI response was not valid JSON.",
        { provider: providerResult.provider },
      );
    }
  }

  if (mode === "analyze_selection") {
    const question = typeof body.question === "string" ? body.question.trim() : "";
    const workbook = body.workbook;
    const selection = body.selection;

    if (!question) {
      return errorResponse(400, "missing_question", "Analyze selection mode requires a question.");
    }

    if (!isRawWorkbook(workbook)) {
      return errorResponse(400, "invalid_workbook", "Analyze selection mode requires a valid uploaded workbook.");
    }

    if (!isDataSelection(selection)) {
      return errorResponse(400, "invalid_selection", "Analyze selection mode requires selected raw rows.");
    }

    const prompt = buildFinanceAISelectedRowsAnalyzePrompt({
      userQuestion: question,
      workbook,
      selection,
      state: normalizeChatState(body.state),
    });
    const providerResult = await callFirstConfiguredProvider(
      [
        {
          role: "system",
          content: "你是 Lucas 网站里的财务分析 AI 助手。你基于用户上传底稿的原始明细切片完成计算和图表，只返回严格 JSON。",
        },
        { role: "user", content: prompt },
      ],
      { jsonMode: true, responseFormat: false },
    );

    if (!providerResult.ok) {
      return errorResponse(providerResult.status, providerResult.errorCode, providerResult.error, {
        attempts: providerResult.attempts,
      });
    }

    try {
      const analysis = normalizeDirectAnalysis(extractJsonObject(providerResult.content), question);
      return Response.json({
        message: analysis.answer,
        assumptions: analysis.assumptions,
        charts: analysis.charts,
      });
    } catch (error) {
      return errorResponse(
        502,
        "provider_invalid_json",
        error instanceof Error ? error.message : "AI response was not valid JSON.",
        { provider: providerResult.provider },
      );
    }
  }

  if (mode === "analyze") {
    const question = typeof body.question === "string" ? body.question.trim() : "";
    const workbook = body.workbook;

    if (!question) {
      return errorResponse(400, "missing_question", "Analyze mode requires a question.");
    }

    if (!isRawWorkbook(workbook)) {
      return errorResponse(400, "invalid_workbook", "Analyze mode requires a valid uploaded workbook.");
    }

    const prompt = buildFinanceAIDirectAnalyzePrompt({
      userQuestion: question,
      workbook,
      state: normalizeChatState(body.state),
    });
    const providerResult = await callFirstConfiguredProvider(
      [
        {
          role: "system",
          content: "你是 Lucas 网站里的财务分析 AI 助手。你直接读取用户上传底稿，并只返回严格 JSON。",
        },
        { role: "user", content: prompt },
      ],
      { jsonMode: true, responseFormat: false },
    );

    if (!providerResult.ok) {
      return errorResponse(providerResult.status, providerResult.errorCode, providerResult.error, {
        attempts: providerResult.attempts,
      });
    }

    try {
      const analysis = normalizeDirectAnalysis(extractJsonObject(providerResult.content), question);
      return Response.json({
        message: analysis.answer,
        assumptions: analysis.assumptions,
        charts: analysis.charts,
      });
    } catch (error) {
      return errorResponse(
        502,
        "provider_invalid_json",
        error instanceof Error ? error.message : "AI response was not valid JSON.",
        { provider: providerResult.provider },
      );
    }
  }

  if (mode === "plan") {
    const schema = body.schema as FinanceSchema | undefined;
    const question = typeof body.question === "string" ? body.question.trim() : "";

    if (!schema) {
      return errorResponse(400, "missing_schema", "Plan mode requires a finance schema.");
    }

    if (!isFinanceSchema(schema)) {
      return errorResponse(400, "invalid_schema", "Plan mode requires a valid finance schema.");
    }

    if (!question) {
      return errorResponse(400, "missing_question", "Plan mode requires a question.");
    }

    const chatState = normalizeChatState(body.state);
    const planningContext = buildFinanceAIPlanningContext(
      schema,
      chatState,
    );
    const providerResult = await callFirstConfiguredProvider(
      [
        {
          role: "system",
          content: `${PLANNING_BOUNDARY}。你只输出严格 JSON。`,
        },
        {
          role: "user",
          content: `${planningContext}\n\n用户问题：${question}`,
        },
      ],
      { jsonMode: true },
    );

    if (!providerResult.ok) {
      return errorResponse(providerResult.status, providerResult.errorCode, providerResult.error, {
        attempts: providerResult.attempts,
      });
    }

    try {
      const plan = normalizeFinanceActionPlanForQuestion(
        schema,
        normalizePlan(extractJsonObject(providerResult.content)),
        question,
        chatState,
      );
      const validated = validateFinanceActionPlan(schema, plan);

      if (!validated.ok) {
        return errorResponse(502, "provider_invalid_plan", "AI plan failed validation.", {
          provider: providerResult.provider,
          errors: validated.errors,
          modules: validated.modules,
        });
      }

      return Response.json({ modules: validated.modules });
    } catch (error) {
      return errorResponse(
        502,
        "provider_invalid_json",
        error instanceof Error ? error.message : "AI response was not valid JSON.",
        { provider: providerResult.provider },
      );
    }
  }

  if (mode === "explain") {
    const prompt = buildFinanceAIExplanationPrompt({
      userQuestion: typeof body.question === "string" ? body.question : "",
      computedSummary: body.computedSummary,
    });
    const providerResult = await callFirstConfiguredProvider(
      [
        {
          role: "system",
          content: "你是 Lucas 网站里的财务分析 AI 助手，回复简洁、具体、可信。",
        },
        { role: "user", content: prompt },
      ],
      { jsonMode: false },
    );

    if (!providerResult.ok) {
      return errorResponse(providerResult.status, providerResult.errorCode, providerResult.error, {
        attempts: providerResult.attempts,
      });
    }

    return Response.json({ message: providerResult.content.trim() });
  }

  return errorResponse(400, "unsupported_mode", "Unsupported finance AI assistant mode.");
}
