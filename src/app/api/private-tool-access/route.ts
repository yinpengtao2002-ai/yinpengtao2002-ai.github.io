import { createPrivateToolAccessToken, getPrivateToolAccessTokenExpiry, isPrivateToolAccessConfigured, isPrivateToolAccessKeyValid } from "../../../lib/security/private-tool-access.ts";
import { enforceRateLimit } from "../../../lib/security/rate-limit.ts";

const PRIVATE_TOOL_ACCESS_RATE_LIMIT = { keyPrefix: "api-private-tool-access", limit: 8, windowMs: 5 * 60_000 };

function errorResponse(status: number, errorCode: string, message: string) {
  return Response.json({ error: message, errorCode }, { status });
}

export async function POST(req: Request) {
  const rateLimitError = enforceRateLimit(req, PRIVATE_TOOL_ACCESS_RATE_LIMIT);

  if (rateLimitError) {
    return rateLimitError;
  }

  if (!isPrivateToolAccessConfigured()) {
    return errorResponse(503, "access_not_configured", "访问码还没有在部署环境配置。");
  }

  let body: Record<string, unknown>;

  try {
    body = await req.json();
  } catch {
    return errorResponse(400, "invalid_json", "请求格式不正确。");
  }

  if (!isPrivateToolAccessKeyValid(body.key)) {
    return errorResponse(401, "access_denied", "访问码不正确。");
  }

  const token = createPrivateToolAccessToken();
  const expiresAt = getPrivateToolAccessTokenExpiry(token);

  return Response.json({
    token,
    expiresAt: expiresAt?.toISOString() ?? null,
  });
}

