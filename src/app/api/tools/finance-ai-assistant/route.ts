import { buildFinanceAIExplanationPrompt, buildFinanceAIPlanningContext } from "../../../../lib/finance-ai/context.ts";
import type { FinanceAIChatState } from "../../../../lib/finance-ai/context.ts";
import { normalizeFinanceActionPlanForQuestion, validateFinanceActionPlan } from "../../../../lib/finance-ai/actions.ts";
import { getChatProviders } from "../../../../lib/ai/providers.ts";
import { callFirstConfiguredProvider as callFirstConfiguredChatProvider, extractJsonObject, type ProviderCallOptions, type ProviderChatMessage } from "../../../../lib/ai/callProvider.ts";
import { enforceRateLimit } from "../../../../lib/security/rate-limit.ts";
import type {
  FinanceActionPlan,
  FinanceSchema,
} from "../../../../lib/finance-ai/types.ts";

const API_ROUTE_PATH = "/api/tools/finance-ai-assistant";
const PLANNING_BOUNDARY = "AI 不负责计算数字";
const FINANCE_AI_RATE_LIMIT = { keyPrefix: "api-finance-ai-assistant", limit: 20, windowMs: 60_000 };
const FINANCE_AI_PLAN_TIMEOUT_MS = 60000;
const FINANCE_AI_EXPLAIN_TIMEOUT_MS = 25000;
const UNSUPPORTED_DIRECT_WORKBOOK_MODES = new Set(["analyze", "data_request", "analyze_selection"]);

type FinanceProviderCallOptions = ProviderCallOptions & {
  jsonMode: boolean;
};

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
          ...(typeof contextItem.fromScenario === "string" && contextItem.fromScenario.trim() ? { fromScenario: contextItem.fromScenario.trim() } : {}),
          ...(typeof contextItem.toScenario === "string" && contextItem.toScenario.trim() ? { toScenario: contextItem.toScenario.trim() } : {}),
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

async function callFirstConfiguredProvider(
  messages: ProviderChatMessage[],
  options: FinanceProviderCallOptions,
) {
  const timeoutMs = options.timeoutMs ?? FINANCE_AI_PLAN_TIMEOUT_MS;

  return callFirstConfiguredChatProvider(getChatProviders(timeoutMs), messages, {
    ...options,
    timeoutMs,
    timeoutMessage: "DeepSeek 分析超时了，请稍后重试，或把问题缩窄到一个月份、一个指标或一个维度。",
    emptyResponseMessage: "DeepSeek 这次没有返回正文内容。",
    notConfiguredMessage: "No finance AI provider is configured.",
    failureMessage: "Finance AI provider failed.",
  });
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
  const rateLimitError = enforceRateLimit(req, FINANCE_AI_RATE_LIMIT);

  if (rateLimitError) {
    return rateLimitError;
  }

  let body: Record<string, unknown>;

  try {
    body = await req.json();
  } catch {
    return errorResponse(400, "invalid_json", "Request body must be valid JSON.");
  }

  const mode = String(body.mode || "");

  if (UNSUPPORTED_DIRECT_WORKBOOK_MODES.has(mode)) {
    return errorResponse(
      400,
      "unsupported_mode",
      "Finance AI assistant only supports plan and explain modes for uploaded workbook analysis; workbook rows stay in the browser session and are computed locally.",
    );
  }

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
      { jsonMode: false, timeoutMs: FINANCE_AI_EXPLAIN_TIMEOUT_MS, maxTokens: 700 },
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
