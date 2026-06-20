import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const lucasPage = await readFile(new URL("../src/app/Lucas/page.tsx", import.meta.url), "utf8");
const lucasAccessGate = await readFile(new URL("../src/app/Lucas/LucasAccessGate.tsx", import.meta.url), "utf8");
const lucasWorkbench = await readFile(new URL("../src/app/Lucas/LucasPrivateWorkbench.tsx", import.meta.url), "utf8");
const sitemap = await readFile(new URL("../src/app/sitemap.ts", import.meta.url), "utf8");
const siteNavigation = await readFile(new URL("../src/components/layout/SiteNavigation.tsx", import.meta.url), "utf8");
const clientShell = await readFile(new URL("../src/components/ClientShell.tsx", import.meta.url), "utf8");
const modelRegistry = await readFile(new URL("../src/lib/finance/model-registry.json", import.meta.url), "utf8");

test("Lucas private route is top-level, gated, and excluded from discovery surfaces", () => {
  assert.match(lucasPage, /title:\s*"Lucas"/);
  assert.match(lucasPage, /index:\s*false/);
  assert.match(lucasPage, /follow:\s*false/);
  assert.match(lucasPage, /noimageindex:\s*true/);

  assert.match(lucasAccessGate, /\/api\/tools\/finance-ai-assistant\/access/);
  assert.match(lucasAccessGate, /type="password"/);
  assert.match(lucasAccessGate, /lazy\(\(\)\s*=>\s*import\("\.\/LucasPrivateWorkbench"\)\)/);

  assert.doesNotMatch(sitemap, /\/Lucas/);
  assert.doesNotMatch(siteNavigation, /\/Lucas/);
  assert.doesNotMatch(clientShell, /\/Lucas/);
  assert.doesNotMatch(modelRegistry, /\/Lucas/);
});

test("Lucas route hosts the private stock position module without entering the public finance registry", () => {
  assert.match(lucasWorkbench, /股票决策与仓位分析/);
  assert.match(lucasWorkbench, /凯利仓位分析/);
  assert.match(lucasWorkbench, /rawKelly/);
  assert.match(lucasWorkbench, /kellyScale/);
  assert.doesNotMatch(modelRegistry, /股票决策|凯利|仓位/);
});
