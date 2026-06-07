// @ts-expect-error - Node's test runner imports this route with TypeScript extensions.
import { createFinanceAIAccessToken, getFinanceAIAccessTokenExpiry, isFinanceAIAccessConfigured, isFinanceAIAccessKeyValid } from "../../../../../lib/finance-ai/access.ts";

function errorResponse(status: number, errorCode: string, message: string) {
  return Response.json({ error: message, errorCode }, { status });
}

export async function POST(req: Request) {
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
