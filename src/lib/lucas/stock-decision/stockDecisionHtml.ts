import { readFile } from "node:fs/promises";

const stockDecisionHtmlUrl = new URL("./stockDecision.html", import.meta.url);
let stockDecisionHtmlCache: string | undefined;

export async function getStockDecisionHtml() {
  stockDecisionHtmlCache ??= await readFile(stockDecisionHtmlUrl, "utf8");
  return stockDecisionHtmlCache;
}
