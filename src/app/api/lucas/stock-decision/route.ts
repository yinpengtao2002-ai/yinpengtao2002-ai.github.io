import { stockDecisionHtml } from "@/lib/lucas/stock-decision/stockDecisionHtml";
import { FINANCE_AI_ACCESS_HEADER, verifyFinanceAIAccessToken } from "@/lib/finance-ai/access";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const accessToken = request.headers.get(FINANCE_AI_ACCESS_HEADER);

  if (!verifyFinanceAIAccessToken(accessToken)) {
    return Response.json({ error: "access_denied" }, { status: 401 });
  }

  return new Response(stockDecisionHtml, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
