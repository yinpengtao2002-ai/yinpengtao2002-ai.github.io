export const PUBLIC_CHAT_MAX_BODY_BYTES = 64 * 1024;
export const PUBLIC_CHAT_MAX_MESSAGES = 24;
export const PUBLIC_CHAT_MAX_MESSAGE_CHARS = 4_000;
export const PUBLIC_CHAT_MAX_TOTAL_CHARS = 24_000;

export type PublicChatMessage = {
  role: "user" | "assistant";
  content: string;
};

export type PublicChatRequest = {
  messages: PublicChatMessage[];
  currentFinanceModelSlug?: string | null;
  currentThinkingArticleHref?: string | null;
};

export type PublicAiError = {
  errorCode: string;
  message: string;
  requestId: string;
  retryAfter?: number;
};

type ParseSuccess = { ok: true; value: PublicChatRequest };
type ParseFailure = {
  ok: false;
  errorCode: string;
  message: string;
  status: number;
};

export type PublicChatParseResult = ParseSuccess | ParseFailure;

function failure(errorCode: string, message: string, status = 400): ParseFailure {
  return { ok: false, errorCode, message, status };
}

function getUtf8ByteLength(value: string) {
  return new TextEncoder().encode(value).byteLength;
}

export function parseRetryAfterSeconds(value: string | null | undefined) {
  const normalized = value?.trim() ?? "";
  if (!/^\d+$/.test(normalized)) return undefined;
  const seconds = Number(normalized);
  if (!Number.isSafeInteger(seconds) || seconds < 1) return undefined;
  return Math.min(seconds, 3_600);
}

export function parsePublicChatRequest(rawBody: string): PublicChatParseResult {
  if (getUtf8ByteLength(rawBody) > PUBLIC_CHAT_MAX_BODY_BYTES) {
    return failure("request_too_large", "请求内容过长。", 413);
  }

  let payload: unknown;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return failure("invalid_json", "请求格式不正确。");
  }

  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return failure("invalid_request", "请求格式不正确。");
  }

  const record = payload as Record<string, unknown>;
  if (!Array.isArray(record.messages)) {
    return failure("invalid_messages", "消息列表格式不正确。");
  }
  if (record.messages.length > PUBLIC_CHAT_MAX_MESSAGES) {
    return failure("too_many_messages", "消息数量过多。");
  }

  const messages: PublicChatMessage[] = [];
  let totalChars = 0;
  for (const item of record.messages) {
    if (!item || typeof item !== "object" || Array.isArray(item)) {
      return failure("invalid_messages", "消息列表格式不正确。");
    }
    const message = item as Record<string, unknown>;
    if ((message.role !== "user" && message.role !== "assistant") || typeof message.content !== "string") {
      return failure("invalid_messages", "消息角色或内容格式不正确。");
    }
    if (message.content.length > PUBLIC_CHAT_MAX_MESSAGE_CHARS) {
      return failure("message_too_long", "单条消息过长。");
    }
    totalChars += message.content.length;
    if (totalChars > PUBLIC_CHAT_MAX_TOTAL_CHARS) {
      return failure("messages_too_large", "消息总长度过长。");
    }
    messages.push({ role: message.role, content: message.content });
  }

  return {
    ok: true,
    value: {
      messages,
      ...(typeof record.currentFinanceModelSlug === "string" || record.currentFinanceModelSlug === null
        ? { currentFinanceModelSlug: record.currentFinanceModelSlug }
        : {}),
      ...(typeof record.currentThinkingArticleHref === "string" || record.currentThinkingArticleHref === null
        ? { currentThinkingArticleHref: record.currentThinkingArticleHref }
        : {}),
    },
  };
}
