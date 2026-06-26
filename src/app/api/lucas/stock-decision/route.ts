import { stockDecisionHtml } from "@/lib/lucas/stock-decision/stockDecisionHtml";
import {
  readPrivateToolAccessToken,
  verifyPrivateToolAccessToken,
} from "@/lib/security/private-tool-access";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const accessToken = readPrivateToolAccessToken(request.headers);

  if (!verifyPrivateToolAccessToken(accessToken)) {
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
