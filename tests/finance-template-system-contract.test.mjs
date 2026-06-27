import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

async function readProjectFile(path) {
  try {
    return await readFile(new URL(path, import.meta.url), "utf8");
  } catch {
    assert.fail(`${path} should exist`);
  }
}

test("finance template hub records the template families used by the model suite", async () => {
  const templates = await import("../src/lib/finance/templates.js");
  const {
    getFinanceTemplateFamilies,
    getFinanceTemplateFamilyForModel,
  } = templates.default;

  const families = getFinanceTemplateFamilies();
  assert.deepEqual(
    families.map((family) => family.slug),
    ["operating-detail", "profit-sensitivity-assumptions"]
  );

  assert.deepEqual(
    getFinanceTemplateFamilyForModel("business-analysis").modelSlugs,
    ["business-analysis", "margin-analysis", "monthly-trend", "profit-structure", "perspective-bi", "finance-ai-assistant"]
  );
  assert.equal(getFinanceTemplateFamilyForModel("monthly-trend").slug, "operating-detail");
  assert.equal(getFinanceTemplateFamilyForModel("profit-structure").slug, "operating-detail");
  assert.equal(getFinanceTemplateFamilyForModel("perspective-bi").slug, "operating-detail");
  assert.equal(getFinanceTemplateFamilyForModel("finance-ai-assistant").slug, "operating-detail");
  assert.equal(getFinanceTemplateFamilyForModel("margin-analysis").slug, "operating-detail");
  assert.equal(getFinanceTemplateFamilyForModel("sensitivity-analysis").slug, "profit-sensitivity-assumptions");
});

test("operating detail models share one template header and example data generator", async () => {
  const templates = await import("../src/lib/finance/templates.js");
  const {
    OPERATING_DETAIL_HEADERS,
    OPERATING_DETAIL_TEMPLATE_NOTE,
    createOperatingDetailSampleRows,
    getOperatingDetailTemplateRows,
  } = templates.default;

  assert.deepEqual(
    OPERATING_DETAIL_HEADERS,
    ["月份", "数据口径", "大区", "国家", "品牌", "品牌市场", "经营模式", "业务单元", "车型", "燃油品类", "备注", "销量", "净收入", "成本", "边际"]
  );
  assert.match(OPERATING_DETAIL_TEMPLATE_NOTE, /数据口径/);
  assert.match(OPERATING_DETAIL_TEMPLATE_NOTE, /请保留“月份”和“销量”/);

  const sampleRows = createOperatingDetailSampleRows();
  const templateRows = getOperatingDetailTemplateRows();
  const months = new Set(sampleRows.map((row) => row.月份));
  const countryRegions = new Map();
  const brandCountries = new Map();

  assert.ok(sampleRows.length >= 1000, "shared sample should be rich enough for trend and BI demos");
  assert.ok(months.has("2025-01"), "shared sample should include a prior year for YoY views");
  assert.ok(months.has("2026-06"), "shared sample should include current-year months for demos");
  assert.ok(templateRows.length > 0 && templateRows.length < sampleRows.length);

  for (const row of sampleRows) {
    assert.deepEqual(Object.keys(row), OPERATING_DETAIL_HEADERS);
    assert.equal(row.数据口径, "实际");
    assert.equal(typeof row.备注, "string");
    assert.ok(row.销量 > 0, "volume should stay positive");
    assert.equal(row.边际, Math.round((row.净收入 + row.成本) * 1000) / 1000);

    const currentRegion = countryRegions.get(row.国家);
    assert.ok(!currentRegion || currentRegion === row.大区, `${row.国家} should stay in one region`);
    countryRegions.set(row.国家, row.大区);

    if (!brandCountries.has(row.品牌)) brandCountries.set(row.品牌, new Set());
    brandCountries.get(row.品牌).add(row.国家);
  }

  assert.ok(countryRegions.size >= 8, "sample should cover enough countries");
  assert.ok([...brandCountries.values()].every((countries) => countries.size >= 6), "each brand should cross most countries");
});

test("operating detail model engines use the shared template hub", async () => {
  const businessEngine = await readProjectFile("../src/app/finance/business-analysis/business-analysis-engine.js");
  const monthlyEngine = await readProjectFile("../src/app/finance/monthly-trend/monthly-trend-engine.js");
  const profitStructureEngine = await readProjectFile("../src/app/finance/profit-structure/profit-structure-engine.js");
  const perspectiveBIEngine = await readProjectFile("../src/app/finance/perspective-bi/perspective-bi-engine.js");
  const financeAITool = await readProjectFile("../src/app/tools/finance-ai-assistant/FinanceAIAssistantTool.tsx");

  for (const [name, source] of [
    ["business-analysis", businessEngine],
    ["monthly-trend", monthlyEngine],
    ["profit-structure", profitStructureEngine],
    ["perspective-bi", perspectiveBIEngine],
    ["finance-ai-assistant", financeAITool],
  ]) {
    assert.match(source, /finance\/templates\.js/, `${name} should import the template hub`);
    assert.match(source, /OPERATING_DETAIL_HEADERS/, `${name} should use the shared operating detail headers`);
  }

  for (const [name, source] of [
    ["business-analysis", businessEngine],
    ["monthly-trend", monthlyEngine],
    ["profit-structure", profitStructureEngine],
    ["perspective-bi", perspectiveBIEngine],
  ]) {
    assert.match(source, /createOperatingDetailSampleRows/, `${name} should use the shared operating detail sample`);
  }
  assert.match(businessEngine, /parseOperatingDetailScenarioRows/, "business-analysis should pair actual and budget rows by 数据口径");
  assert.match(financeAITool, /getBudgetOperatingDetailTemplateRows/, "finance AI template download should use shared budget operating detail rows");
});

test("monthly trend sample startup keeps its month label formatter available", async () => {
  const monthlyEngine = await readProjectFile("../src/app/finance/monthly-trend/monthly-trend-engine.js");

  assert.match(monthlyEngine, /loadRows\(createSampleRows\(\),\s*"示例数据"\)/);
  assert.match(monthlyEngine, /function makePeriod\(year,\s*month\)[\s\S]*label:\s*formatMonthKey\(key\)/);
  assert.match(monthlyEngine, /function formatMonthKey\(monthKey\)/);
});

test("static margin attribution tool mirrors the shared operating detail template", async () => {
  const marginApp = await readProjectFile("../public/tools/margin-analysis/app.js");

  assert.match(marginApp, /TEMPLATE_HEADERS\s*=\s*\[[\s\S]*'数据口径'[\s\S]*'备注'[\s\S]*'销量'[\s\S]*'净收入'[\s\S]*'成本'[\s\S]*'边际'/);
  assert.match(marginApp, /TEMPLATE_HEADER_NOTE[\s\S]*数据口径/);
  assert.match(marginApp, /'数据口径':\s*'实际'/);
  assert.match(marginApp, /'备注':\s*''/);
});

test("finance template center is documented next to chart and interaction centers", async () => {
  const templateSystem = await readProjectFile("../docs/finance-template-system.md");
  const inventory = await readProjectFile("../docs/finance-model-inventory.md");
  const handoff = await readProjectFile("../agent.md");

  assert.match(templateSystem, /# 财务模板中枢/);
  assert.match(templateSystem, /src\/lib\/finance\/templates\.js/);
  assert.match(templateSystem, /\| monthly-trend \| operating-detail \|/);
  assert.match(templateSystem, /\| profit-structure \| operating-detail \|/);
  assert.match(templateSystem, /\| perspective-bi \| operating-detail \|/);
  assert.match(templateSystem, /\| finance-ai-assistant \| operating-detail \|/);
  assert.match(templateSystem, /\| business-analysis \| operating-detail \|/);
  assert.match(templateSystem, /\| margin-analysis \| operating-detail \|/);
  assert.match(templateSystem, /\| sensitivity-analysis \| profit-sensitivity-assumptions \|/);
  assert.match(templateSystem, /除敏感性分析之外/);
  assert.match(inventory, /docs\/finance-template-system\.md/);
  assert.match(handoff, /docs\/finance-template-system\.md/);
  assert.match(handoff, /除敏感性分析之外/);
});
