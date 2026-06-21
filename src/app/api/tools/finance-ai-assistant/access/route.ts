// @ts-expect-error - Node's test runner imports this route with TypeScript extensions.
import { createFinanceAIAccessToken, getFinanceAIAccessTokenExpiry, isFinanceAIAccessConfigured, isFinanceAIAccessKeyValid } from "../../../../../lib/finance-ai/access.ts";
// @ts-expect-error - Node's test runner imports this route with TypeScript extensions.
import { enforceRateLimit } from "../../../../../lib/security/rate-limit.ts";

const FINANCE_AI_ACCESS_RATE_LIMIT = { keyPrefix: "api-finance-ai-access", limit: 8, windowMs: 5 * 60_000 };

function errorResponse(status: number, errorCode: string, message: string) {
  return Response.json({ error: message, errorCode }, { status });
}

export async function POST(req: Request) {
  const rateLimitError = enforceRateLimit(req, FINANCE_AI_ACCESS_RATE_LIMIT);

  if (rateLimitError) {
    return rateLimitError;
  }

  if (!isFinanceAIAccessConfigured()) {
    return errorResponse(503, "access_not_configured", "财务分析 AI 助手尚未配置内测密钥。");
  }

  let body: Record<string, unknown>;

  try {
    body = await req.json();
  } catch {
    return errorResponse(400, "invalid_json", "请求格式不正确。");
  }

  if (!isFinanceAIAccessKeyValid(body.key)) {
    return errorResponse(401, "access_denied", "内测密钥不正确。");
  }

  const token = createFinanceAIAccessToken();
  const expiresAt = getFinanceAIAccessTokenExpiry(token);

  return Response.json({
    token,
    expiresAt: expiresAt?.toISOString() ?? null,
  });
}
