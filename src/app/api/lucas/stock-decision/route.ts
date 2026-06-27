import { getStockDecisionHtml } from "@/lib/lucas/stock-decision/stockDecisionHtml";

export const dynamic = "force-dynamic";

export async function GET() {
  const stockDecisionHtml = await getStockDecisionHtml();

  return new Response(stockDecisionHtml, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
