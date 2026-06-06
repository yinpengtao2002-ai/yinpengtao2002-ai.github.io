import { NextRequest } from "next/server";
import {
  buildFinanceAIExplanationPrompt,
  buildFinanceAIPlanningContext,
  type FinanceAIChatState,
} from "@/lib/finance-ai/context";
import type { FinanceActionPlan, FinanceSchema } from "@/lib/finance-ai/types";

const API_ROUTE_PATH = "/api/tools/finance-ai-assistant";
const PLANNING_BOUNDARY = "AI 不负责计算数字";
const CHAT_PRIMARY_TIMEOUT_MS = 60000;
const CHAT_FALLBACK_TIMEOUT_MS = 60000;
const DEEPSEEK_API_URL = "https://api.deepseek.com/chat/completions";
const CHAT_FALLBACK_API_URL = "https://api.884819.xyz/v1/chat/completions";

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
  error: string;
};

function readEnv(value?: string) {
  return value?.trim() || "";
}

function getChatProviders(): ChatProvider[] {
  const deepseekApiUrl = readEnv(process.env.DEEPSEEK_API_URL) || DEEPSEEK_API_URL;
  const fallbackApiUrl = readEnv(process.env.CHAT_API_URL) || CHAT_FALLBACK_API_URL;
  const deepseekApiKey = readEnv(process.env.DEEPSEEK_API_KEY);
  const fallbackApiKey = readEnv(process.env.CHAT_API_KEY);
  const fallbackModel = readEnv(process.env.CHAT_MODEL) || "gpt-5.2";
  const secondFallbackModel = readEnv(process.env.CHAT_MODEL_FALLBACK) || "gpt-5.4";

  return [
    {
      model: "deepseek-v4-pro",
      apiUrl: deepseekApiUrl,
      apiKey: deepseekApiKey,
      timeoutMs: CHAT_PRIMARY_TIMEOUT_MS,
    },
    {
      model: fallbackModel,
      apiUrl: fallbackApiUrl,
      apiKey: fallbackApiKey,
      timeoutMs: CHAT_FALLBACK_TIMEOUT_MS,
    },
    {
      model: secondFallbackModel,
      apiUrl: fallbackApiUrl,
      apiKey: fallbackApiKey,
      timeoutMs: CHAT_FALLBACK_TIMEOUT_MS,
    },
  ];
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

function getUpstreamStatus(error: unknown) {
  if (error instanceof DOMException && error.name === "AbortError") {
    return 504;
  }

  return 502;
}

async function callProvider(
  provider: ChatProvider,
  messages: ChatMessage[],
  jsonMode: boolean,
) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), provider.timeoutMs);

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
        max_tokens: jsonMode ? 1800 : 1200,
        stream: false,
        ...(jsonMode ? { response_format: { type: "json_object" } } : {}),
        messages,
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      throw new Error(detail.slice(0, 500) || `Upstream responded with ${response.status}`);
    }

    const payload = await response.json();
    const content = payload?.choices?.[0]?.message?.content;

    if (typeof content !== "string" || !content.trim()) {
      throw new Error("AI response was empty");
    }

    return content;
  } finally {
    clearTimeout(timeoutId);
  }
}

async function callFirstConfiguredProvider(messages: ChatMessage[], jsonMode: boolean) {
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
      const content = await callProvider(provider, messages, jsonMode);
      return { ok: true as const, content, provider: provider.model };
    } catch (error) {
      attempts.push({
        model: provider.model,
        status: getUpstreamStatus(error),
        error: error instanceof Error ? error.message : "Upstream request failed",
      });
    }
  }

  const timeoutAttempt = attempts.find((attempt) => attempt.status === 504);
  return {
    ok: false as const,
    status: timeoutAttempt ? 504 : 502,
    errorCode: timeoutAttempt ? "provider_timeout" : "provider_failed",
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

export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;

  try {
    body = await req.json();
  } catch {
    return errorResponse(400, "invalid_json", "Request body must be valid JSON.");
  }

  const mode = String(body.mode || "");

  if (mode === "plan") {
    const schema = body.schema as FinanceSchema | undefined;
    const question = typeof body.question === "string" ? body.question.trim() : "";

    if (!schema || typeof schema !== "object") {
      return errorResponse(400, "missing_schema", "Plan mode requires a finance schema.");
    }

    if (!question) {
      return errorResponse(400, "missing_question", "Plan mode requires a question.");
    }

    const planningContext = buildFinanceAIPlanningContext(
      schema,
      (body.state ?? {}) as FinanceAIChatState,
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
      true,
    );

    if (!providerResult.ok) {
      return errorResponse(providerResult.status, providerResult.errorCode, providerResult.error, {
        attempts: providerResult.attempts,
      });
    }

    try {
      return Response.json(normalizePlan(extractJsonObject(providerResult.content)));
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
      false,
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
