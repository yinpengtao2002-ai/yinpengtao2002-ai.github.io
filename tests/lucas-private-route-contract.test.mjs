import test from "node:test";
import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";

const lucasPage = await readFile(new URL("../src/app/Lucas/page.tsx", import.meta.url), "utf8");
const lucasAccessGate = await readFile(new URL("../src/app/Lucas/LucasAccessGate.tsx", import.meta.url), "utf8");
const lucasWorkbench = await readFile(new URL("../src/app/Lucas/LucasPrivateWorkbench.tsx", import.meta.url), "utf8");
const sitemap = await readFile(new URL("../src/app/sitemap.ts", import.meta.url), "utf8");
const siteNavigation = await readFile(new URL("../src/components/layout/SiteNavigation.tsx", import.meta.url), "utf8");
const clientShell = await readFile(new URL("../src/components/ClientShell.tsx", import.meta.url), "utf8");
const modelRegistry = await readFile(new URL("../src/lib/finance/model-registry.json", import.meta.url), "utf8");
const middleware = await readFile(new URL("../middleware.ts", import.meta.url), "utf8");

test("Lucas private route is top-level, gated, and excluded from discovery surfaces", () => {
  assert.match(lucasPage, /title:\s*"Lucas"/);
  assert.match(lucasPage, /index:\s*false/);
  assert.match(lucasPage, /follow:\s*false/);
  assert.match(lucasPage, /noimageindex:\s*true/);

  assert.match(lucasAccessGate, /PRIVATE_TOOL_ACCESS_ENDPOINT/);
  assert.doesNotMatch(lucasAccessGate, /\/api\/tools\/finance-ai-assistant\/access/);
  assert.match(lucasAccessGate, /type="password"/);
  assert.match(lucasAccessGate, /lazy\(\(\)\s*=>\s*import\("\.\/LucasPrivateWorkbench"\)\)/);
  assert.match(lucasAccessGate, /accessToken=\{accessToken\}/);

  assert.doesNotMatch(sitemap, /\/Lucas/);
  assert.doesNotMatch(siteNavigation, /\/Lucas/);
  assert.doesNotMatch(clientShell, /\/Lucas/);
  assert.doesNotMatch(modelRegistry, /\/Lucas/);
});

test("Lucas route loads the copied stock decision system after access instead of the placeholder calculator", async () => {
  const apiRoute = await readFile(new URL("../src/app/api/lucas/stock-decision/route.ts", import.meta.url), "utf8");

  assert.match(lucasWorkbench, /\/api\/lucas\/stock-decision/);
  assert.match(lucasWorkbench, /PRIVATE_TOOL_ACCESS_HEADER/);
  assert.doesNotMatch(lucasWorkbench, /FINANCE_AI_ACCESS_HEADER/);
  assert.match(lucasWorkbench, /srcDoc/);
  assert.doesNotMatch(lucasWorkbench, /type NumericState/);
  assert.doesNotMatch(lucasWorkbench, /rawKelly/);
  assert.doesNotMatch(lucasWorkbench, /suggestedShares/);

  assert.match(middleware, /\/api\/lucas\/stock-decision\/:path\*/);
  assert.match(middleware, /verifyPrivateToolAccessTokenForMiddleware/);
  assert.doesNotMatch(apiRoute, /verifyPrivateToolAccessToken/);
  assert.doesNotMatch(apiRoute, /readPrivateToolAccessToken/);
  assert.doesNotMatch(apiRoute, /verifyFinanceAIAccessToken/);
  assert.doesNotMatch(apiRoute, /FINANCE_AI_ACCESS_HEADER/);
  assert.match(apiRoute, /stockDecisionHtml/);
  assert.doesNotMatch(apiRoute, /status:\s*401/);
});

test("local stock decision app is bundled for the private Lucas route", async () => {
  const sourceIndex = await readFile(
    new URL("../src/lib/lucas/stock-decision/app/index.html", import.meta.url),
    "utf8",
  );
  const sourceScript = await readFile(
    new URL("../src/lib/lucas/stock-decision/app/src/kelly-module.js", import.meta.url),
    "utf8",
  );
  const sourceKelly = await readFile(
    new URL("../src/lib/lucas/stock-decision/app/src/lib/kelly.js", import.meta.url),
    "utf8",
  );
  const sourcePackage = await readFile(
    new URL("../src/lib/lucas/stock-decision/app/package.json", import.meta.url),
    "utf8",
  );
  const bundledHtml = await readFile(
    new URL("../src/lib/lucas/stock-decision/stockDecisionHtml.ts", import.meta.url),
    "utf8",
  );

  assert.match(sourceIndex, /凯利仓位分析｜股票分析模型/);
  assert.match(sourceIndex, /id="kelly-app"/);
  assert.match(sourceIndex, /id="kelly-matrix-body"/);
  assert.match(sourceIndex, /股票分析模型 · 凯利仓位/);
  assert.match(sourceScript, /renderKellyMatrix/);
  assert.match(sourceScript, /from "\.\/lib\/kelly\.js\?v=\d+"/);
  assert.match(sourceKelly, /calculateKellyMetrics/);
  assert.match(sourceKelly, /deriveWinLossFromPrices/);
  assert.match(sourcePackage, /stock-kelly-position-analysis/);
  assert.match(bundledHtml, /kelly-app/);
  assert.match(bundledHtml, /凯利杠杆矩阵/);
  assert.match(bundledHtml, /胜率敏感性图/);
  assert.doesNotMatch(bundledHtml, /ORICO|\/Volumes/);
});

test("private stock decision system does not get a public discovery route", async () => {
  await assert.rejects(
    access(new URL("../public/tools/stock-decision/index.html", import.meta.url)),
    /ENOENT/,
  );

  assert.doesNotMatch(modelRegistry, /股票决策|凯利|仓位/);
  assert.doesNotMatch(sitemap, /stock-decision|股票决策|凯利|仓位/);
  assert.doesNotMatch(siteNavigation, /stock-decision|股票决策|凯利|仓位/);
});
