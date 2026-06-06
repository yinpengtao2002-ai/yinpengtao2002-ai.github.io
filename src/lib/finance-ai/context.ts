import type { FinanceSchema } from "./types";

export type FinanceAIChatState = {
  recentQuestions?: string[];
  currentMetric?: string;
  currentFilters?: Record<string, string[]>;
  chartHistory?: Array<{ type: string; title: string }>;
};

type ExplanationPromptInput = {
  userQuestion: string;
  computedSummary: unknown;
};

const MAX_LIST_ITEMS = 24;
const MAX_RECENT_QUESTIONS = 4;
const MAX_CHART_HISTORY = 4;

function compactList(values: string[], emptyLabel = "无") {
  const normalized = values.map((value) => value.trim()).filter(Boolean);

  if (normalized.length === 0) {
    return emptyLabel;
  }

  const visible = normalized.slice(0, MAX_LIST_ITEMS).join(" / ");
  const hiddenCount = normalized.length - MAX_LIST_ITEMS;
  return hiddenCount > 0 ? `${visible} / 另有 ${hiddenCount} 项` : visible;
}

function safeJson(value: unknown) {
  return JSON.stringify(value ?? {});
}

export function buildFinanceAIPlanningContext(
  schema: FinanceSchema,
  state: FinanceAIChatState = {},
) {
  const recentQuestions = (state.recentQuestions ?? [])
    .slice(-MAX_RECENT_QUESTIONS)
    .map((question) => question.trim())
    .filter(Boolean);
  const chartHistory = (state.chartHistory ?? [])
    .slice(-MAX_CHART_HISTORY)
    .map((chart) => `${chart.type}:${chart.title}`)
    .filter(Boolean);

  return [
    "你是财务分析 AI 助手，只负责把用户问题转成结构化分析动作。",
    "AI 不负责计算数字；所有数值、环比、同比、排名和图表数据都由前端确定性计算。",
    "不要要求用户发送上传数据明细，也不要在计划里引用未出现在 schema/state 里的字段。",
    "每轮最少 1 个模块，最多生成 3 个模块。",
    "只允许这些动作：metric_snapshot、trend_chart、bar_rank、waterfall_bridge。",
    "图表模块会渲染在聊天消息内部，所以模块标题要像对话回复的一部分。",
    "可用字段：",
    `月份列：${schema.monthColumn || "未识别"}`,
    `销量列：${schema.salesColumn || "未识别"}`,
    `维度字段：${compactList(schema.dimensionColumns)}`,
    `总额指标：${compactList(schema.totalMetrics.map((metric) => metric.name))}`,
    `单车指标：${compactList(schema.unitMetrics.map((metric) => metric.name))}`,
    `可用期间：${compactList(schema.profile.periods.map((period) => period.key))}`,
    `最近问题：${compactList(recentQuestions)}`,
    `当前指标：${state.currentMetric || "无"}`,
    `当前筛选：${safeJson(state.currentFilters)}`,
    `最近图表：${compactList(chartHistory)}`,
    "输出规则：",
    "- 只输出 JSON，不输出 Markdown。",
    "- modules 数组必须有 1 到 3 项。",
    "- metric 只能使用总额指标或单车指标里的名称。",
    "- dimension 只能使用维度字段里的名称。",
    "- period/fromPeriod/toPeriod/highlightPeriod 只能使用可用期间里的 key。",
    "- filters 只能使用维度字段和值数组。",
    "JSON 结构示例：",
    '{"modules":[{"type":"metric_snapshot","metric":"单车边际","period":"2026-03","filters":{"国家":["巴西"]},"comparisons":["mom","yoy"]}]}',
  ].join("\n");
}

export function buildFinanceAIExplanationPrompt(input: ExplanationPromptInput) {
  return [
    "你是财务分析 AI 助手。请基于前端已经计算好的结果，用中文给出简短解释。",
    "不要重新计算数字，不要编造字段，不要引入计算结果之外的数据。",
    "如果结果里出现不可计算、缺少上月或缺少年同期，需要直接说明。",
    "回复应像聊天消息，先给结论，再补一句口径。",
    `用户问题：${input.userQuestion.trim() || "无"}`,
    "计算结果：",
    JSON.stringify(input.computedSummary ?? {}),
  ].join("\n");
}
