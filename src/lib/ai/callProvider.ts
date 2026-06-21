import type { ChatProvider } from "./providers.ts";

export type ProviderChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export type ProviderAttempt = {
  model: string;
  status: number;
  errorCode?: string;
  error: string;
  finishReason?: string;
};

export type ProviderCallOptions = {
  jsonMode: boolean;
  responseFormat?: boolean;
  timeoutMs?: number;
  maxTokens?: number;
  timeoutMessage?: string;
  emptyResponseMessage?: string;
  notConfiguredMessage?: string;
  failureMessage?: string;
  contentValidator?: (content: string) => void;
};

type ProviderSuccess = {
  ok: true;
  content: string;
  provider: string;
};

type ProviderFailure = {
  ok: false;
  status: number;
  errorCode: string;
  error: string;
  attempts: ProviderAttempt[];
};

export type ProviderResult = ProviderSuccess | ProviderFailure;

export class ProviderEmptyResponseError extends Error {
  finishReason?: string;

  constructor(finishReason?: string) {
    super("AI response was empty.");
    this.name = "ProviderEmptyResponseError";
    this.finishReason = finishReason;
  }
}

export function hasConfiguredProvider(providers: ChatProvider[]) {
  return providers.some((provider) => Boolean(provider.apiKey && provider.apiUrl));
}

export function extractJsonObject(text: string) {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1]?.trim();
  const candidate = fenced || text.trim();
  const firstBrace = candidate.indexOf("{");
  const lastBrace = candidate.lastIndexOf("}");

  if (firstBrace < 0 || lastBrace <= firstBrace) {
    throw new Error("AI response did not contain JSON");
  }

  return JSON.parse(candidate.slice(firstBrace, lastBrace + 1));
}

function isAbortError(error: unknown) {
  return error instanceof DOMException && error.name === "AbortError";
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function getFirstChoice(payload: unknown) {
  const choices = asRecord(payload).choices;
  return Array.isArray(choices) ? asRecord(choices[0]) : {};
}

function getUpstreamStatus(error: unknown) {
  if (isAbortError(error)) {
    return 504;
  }

  return 502;
}

function getUpstreamErrorCode(error: unknown) {
  if (isAbortError(error)) {
    return "provider_timeout";
  }

  if (error instanceof ProviderEmptyResponseError) {
    return "provider_empty_response";
  }

  return "provider_failed";
}

function getUpstreamErrorMessage(error: unknown, options: ProviderCallOptions) {
  if (isAbortError(error)) {
    return options.timeoutMessage ?? "AI generation timed out";
  }

  if (error instanceof ProviderEmptyResponseError) {
    return options.emptyResponseMessage ?? "AI response was empty";
  }

  return error instanceof Error ? error.message : "Upstream request failed";
}

export async function callProvider(
  provider: ChatProvider,
  messages: ProviderChatMessage[],
  options: ProviderCallOptions,
) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), options.timeoutMs ?? provider.timeoutMs);
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
        max_tokens: options.maxTokens ?? (options.jsonMode ? 1800 : 1200),
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
    const choice = getFirstChoice(payload);
    const content = asRecord(choice.message).content;

    if (typeof content !== "string" || !content.trim()) {
      const finishReason = typeof choice.finish_reason === "string" ? choice.finish_reason : undefined;
      throw new ProviderEmptyResponseError(finishReason);
    }

    return content;
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function callFirstConfiguredProvider(
  providers: ChatProvider[],
  messages: ProviderChatMessage[],
  options: ProviderCallOptions,
): Promise<ProviderResult> {
  const attempts: ProviderAttempt[] = [];
  let calledConfiguredProvider = false;

  for (const provider of providers) {
    if (!provider.apiKey || !provider.apiUrl) {
      attempts.push({
        model: provider.model,
        status: 503,
        errorCode: "provider_not_configured",
        error: "Provider missing apiKey or apiUrl",
      });
      continue;
    }

    calledConfiguredProvider = true;

    try {
      const content = await callProvider(provider, messages, options);
      options.contentValidator?.(content);
      return { ok: true, content, provider: provider.model };
    } catch (error) {
      attempts.push({
        model: provider.model,
        status: getUpstreamStatus(error),
        errorCode: getUpstreamErrorCode(error),
        error: getUpstreamErrorMessage(error, options),
        ...(error instanceof ProviderEmptyResponseError && error.finishReason
          ? { finishReason: error.finishReason }
          : {}),
      });
    }
  }

  if (!calledConfiguredProvider) {
    return {
      ok: false,
      status: 503,
      errorCode: "provider_not_configured",
      error: options.notConfiguredMessage ?? "No AI provider is configured.",
      attempts,
    };
  }

  const timeoutAttempt = attempts.find((attempt) => attempt.errorCode === "provider_timeout");
  const emptyAttempt = attempts.find((attempt) => attempt.errorCode === "provider_empty_response");

  return {
    ok: false,
    status: timeoutAttempt ? 504 : 502,
    errorCode: timeoutAttempt ? "provider_timeout" : emptyAttempt ? "provider_empty_response" : "provider_failed",
    error: attempts.at(-1)?.error || options.failureMessage || "AI provider failed.",
    attempts,
  };
}
