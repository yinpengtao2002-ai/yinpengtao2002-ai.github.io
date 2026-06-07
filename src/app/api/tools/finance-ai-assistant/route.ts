// @ts-expect-error - Node's test runner imports this route with TypeScript extensions.
import { buildFinanceAIDirectAnalyzePrompt, buildFinanceAIDataRequestPrompt, buildFinanceAIExplanationPrompt, buildFinanceAIPlanningContext, buildFinanceAISelectedRowsAnalyzePrompt } from "../../../../lib/finance-ai/context.ts";
import type { FinanceAIChatState } from "../../../../lib/finance-ai/context.ts";
// @ts-expect-error - Node's test runner imports this route with TypeScript extensions.
import { alignFinanceActionPlanWithQuestion, validateFinanceActionPlan } from "../../../../lib/finance-ai/actions.ts";
// @ts-expect-error - Node's test runner imports this route with TypeScript extensions.
import { FINANCE_AI_ACCESS_HEADER, isFinanceAIAccessConfigured, verifyFinanceAIAccessToken } from "../../../../lib/finance-ai/access.ts";
import type {
  FinanceAIDirectAnalysis,
  FinanceAIDirectBarRankChart,
  FinanceAIDirectChart,
  FinanceAIDirectTrendChart,
  FinanceAIDirectWaterfallChart,
  FinanceActionPlan,
  FinanceAIDataRequest,
  FinanceAIDataSelection,
  FinanceRawWorkbook,
  FinanceSchema,
} from "../../../../lib/finance-ai/types.ts";

const API_ROUTE_PATH = "/api/tools/finance-ai-assistant";
const PLANNING_BOUNDARY = "AI 不负责计算数字";
const CHAT_PRIMARY_TIMEOUT_MS = 60000;
const MAX_DIRECT_CHARTS = 3;
const MAX_DIRECT_TREND_POINTS = 48;
const MAX_DIRECT_RANK_ITEMS = 15;
const MAX_DIRECT_WATERFALL_ITEMS = 12;
const DEEPSEEK_API_URL = "https://api.deepseek.com/chat/completions";

type ChatProvider = {
  model: string;
  apiUrl: string;
  apiKey?: string;
  timeoutMs: number;
};

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

function readEnv(value?: string) {
  return value?.trim() || "";
}

function getChatProviders(): ChatProvider[] {
  const deepseekApiUrl = readEnv(process.env.DEEPSEEK_API_URL) || DEEPSEEK_API_URL;
  const deepseekApiKey = readEnv(process.env.DEEPSEEK_API_KEY);

  return [{
    model: "deepseek-v4-pro",
    apiUrl: deepseekApiUrl,
    apiKey: deepseekApiKey,
    timeoutMs: CHAT_PRIMARY_TIMEOUT_MS,
  }];
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

function normalizeChatState(value: unknown): FinanceAIChatState {
  const state = asRecord(value);
  const recentQuestions = Array.isArray(state.recentQuestions)
    ? state.recentQuestions
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

  return {
    ...(recentQuestions.length > 0 ? { recentQuestions } : {}),
    ...(typeof state.currentMetric === "string" && state.currentMetric.trim()
      ? { currentMetric: state.currentMetric.trim() }
      : {}),
    currentFilters: normalizeFilterState(state.currentFilters),
    ...(chartHistory.length > 0 ? { chartHistory } : {}),
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

  return null;
}

function normalizeDirectAnalysis(value: unknown): FinanceAIDirectAnalysis {
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
  const providers = getChatProviders();
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
      const analysis = normalizeDirectAnalysis(extractJsonObject(providerResult.content));
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
      const analysis = normalizeDirectAnalysis(extractJsonObject(providerResult.content));
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

    const planningContext = buildFinanceAIPlanningContext(
      schema,
      normalizeChatState(body.state),
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
      const plan = normalizePlan(extractJsonObject(providerResult.content));
      const validated = validateFinanceActionPlan(schema, plan);

      if (!validated.ok) {
        return errorResponse(502, "provider_invalid_plan", "AI plan failed validation.", {
          provider: providerResult.provider,
          errors: validated.errors,
          modules: validated.modules,
        });
      }

      return Response.json({ modules: alignFinanceActionPlanWithQuestion(schema, validated.modules, question) });
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
