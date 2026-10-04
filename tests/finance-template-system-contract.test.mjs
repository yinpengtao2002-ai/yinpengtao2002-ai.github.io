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
    ["business-analysis", "margin-analysis", "monthly-trend", "profit-structure", "finance-ai-assistant"]
  );
  assert.equal(getFinanceTemplateFamilyForModel("monthly-trend").slug, "operating-detail");
  assert.equal(getFinanceTemplateFamilyForModel("profit-structure").slug, "operating-detail");
  assert.equal(getFinanceTemplateFamilyForModel("finance-ai-assistant").slug, "operating-detail");
  assert.equal(getFinanceTemplateFamilyForModel("margin-analysis").slug, "operating-detail");
  assert.equal(getFinanceTemplateFamilyForModel("sensitivity-analysis").slug, "profit-sensitivity-assumptions");
});

test("operating detail models share one visible template header and canonical sample generator", async () => {
  const templates = await import("../src/lib/finance/templates.js");
  const {
    OPERATING_DETAIL_HEADERS,
    OPERATING_DETAIL_INTERNAL_HEADERS,
    OPERATING_DETAIL_FIELD_DICTIONARY_ROWS,
    OPERATING_DETAIL_TEMPLATE_NOTE,
    createOperatingDetailSampleRows,
    getOperatingDetailTemplateRowsForModel,
  } = templates.default;

  assert.deepEqual(
    OPERATING_DETAIL_HEADERS,
    ["月份", "大区", "国家", "品牌", "品牌市场", "经营模式", "业务单元", "车型", "燃油品类", "备注", "销量", "净收入", "成本", "边际"]
  );
  assert.deepEqual(
    OPERATING_DETAIL_INTERNAL_HEADERS,
    ["月份", "数据口径", "大区", "国家", "品牌", "品牌市场", "经营模式", "业务单元", "车型", "燃油品类", "备注", "销量", "净收入", "成本", "边际"]
  );
  assert.doesNotMatch(OPERATING_DETAIL_TEMPLATE_NOTE, /数据口径/);
  assert.match(OPERATING_DETAIL_TEMPLATE_NOTE, /请保留“月份”和“销量”/);
  assert.deepEqual(OPERATING_DETAIL_FIELD_DICTIONARY_ROWS[0], ["字段", "字段类型", "必填", "单位或格式", "正负号", "聚合方式", "指标角色", "说明"]);
  assert.ok(OPERATING_DETAIL_FIELD_DICTIONARY_ROWS.some((row) => row[0] === "成本" && row[4] === "负数"));
  assert.ok(OPERATING_DETAIL_FIELD_DICTIONARY_ROWS.some((row) => row[0] === "销量" && row[2] === "是" && row[6] === "分母"));

  const sampleRows = createOperatingDetailSampleRows();
  const months = new Set(sampleRows.map((row) => row.月份));
  const countryRegions = new Map();
  const brandCountries = new Map();

  assert.ok(sampleRows.length >= 1000, "shared sample should be rich enough for trend and BI demos");
  assert.ok(months.has("2025-01"), "shared sample should include a prior year for YoY views");
  assert.ok(months.has("2026-06"), "shared sample should include current-year months for demos");

  for (const row of sampleRows) {
    assert.deepEqual(Object.keys(row), OPERATING_DETAIL_HEADERS);
    assert.equal("数据口径" in row, false);
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

  const canonicalRows = new Set(sampleRows.map((row) => JSON.stringify(row)));
  const profileExpectations = {
    "monthly-trend": { minMonths: 18, minRegions: 4, pairedPeriods: false },
    "profit-structure": { minMonths: 4, minRegions: 4, pairedPeriods: false },
    "margin-analysis": { minMonths: 2, minRegions: 4, pairedPeriods: true },
    "business-analysis": { minMonths: 4, minRegions: 4, pairedPeriods: false },
    "finance-ai-assistant": { minMonths: 12, minRegions: 4, pairedPeriods: false },
  };

  for (const [modelSlug, expectation] of Object.entries(profileExpectations)) {
    const rows = getOperatingDetailTemplateRowsForModel(modelSlug);
    const rowMonths = new Set(rows.map((row) => row.月份));
    const rowRegions = new Set(rows.map((row) => row.大区));
    const rowCountries = new Set(rows.map((row) => row.国家));
    const rowBrands = new Set(rows.map((row) => row.品牌));
    assert.ok(rows.length > 0 && rows.length < sampleRows.length, `${modelSlug} should use a focused canonical subset`);
    assert.ok(rowMonths.size >= expectation.minMonths, `${modelSlug} should cover its required periods`);
    assert.ok(rowRegions.size >= expectation.minRegions, `${modelSlug} should cover every region`);
    assert.ok(rowCountries.size >= 8, `${modelSlug} should cover every sample country`);
    assert.ok(rowBrands.size >= 4, `${modelSlug} should cover every sample brand`);
    assert.ok(rows.every((row) => canonicalRows.has(JSON.stringify(row))), `${modelSlug} rows should come from the canonical story`);
    assert.ok(rows.every((row) => !("数据口径" in row)), `${modelSlug} should not expose a scenario field`);

    if (expectation.pairedPeriods) {
      const keys = new Map();
      rows.forEach((row) => {
        const key = [row.大区, row.国家, row.品牌, row.品牌市场, row.经营模式, row.业务单元, row.车型, row.燃油品类].join("|");
        if (!keys.has(key)) keys.set(key, new Set());
        keys.get(key).add(row.月份);
      });
      assert.ok([...keys.values()].every((periods) => periods.size === 2), "margin template keys should appear in both periods");
    }
  }
});

test("scenario sheets pair identical business keys and derive stable budget values", async () => {
  const templates = await import("../src/lib/finance/templates.js");
  const {
    createBudgetOperatingDetailRows,
    createOperatingDetailSampleRows,
    getBudgetScenarioSheetTemplateRows,
  } = templates.default;

  const keyFor = (row) => [
    row.月份,
    row.大区,
    row.国家,
    row.品牌,
    row.品牌市场,
    row.经营模式,
    row.业务单元,
    row.车型,
    row.燃油品类,
  ].join("|");

  const actualSheetRows = getBudgetScenarioSheetTemplateRows("actual", "business-analysis");
  const budgetSheetRows = getBudgetScenarioSheetTemplateRows("budget", "business-analysis");
  assert.deepEqual(actualSheetRows.map(keyFor), budgetSheetRows.map(keyFor));
  assert.ok(actualSheetRows.every((row) => !("数据口径" in row)));
  assert.ok(budgetSheetRows.every((row) => !("数据口径" in row)));
  assert.ok(budgetSheetRows.every((row) => row.备注 === ""), "scenario sheet name already explains the budget basis");

  const sourceRows = createOperatingDetailSampleRows().filter((_, index) => index % 97 === 0).slice(0, 8);
  const forwardBudgets = createBudgetOperatingDetailRows(sourceRows)
    .filter((row) => row.数据口径 === "预算")
    .sort((a, b) => keyFor(a).localeCompare(keyFor(b)));
  const reverseBudgets = createBudgetOperatingDetailRows(sourceRows.slice().reverse())
    .filter((row) => row.数据口径 === "预算")
    .sort((a, b) => keyFor(a).localeCompare(keyFor(b)));
  assert.deepEqual(forwardBudgets, reverseBudgets, "budget values must not depend on input order");
  assert.ok(forwardBudgets.every((row) => row.备注 === ""));
});

test("operating detail model engines use the shared template hub", async () => {
  const businessEngine = await readProjectFile("../src/app/finance/business-analysis/business-analysis-engine.js");
  const monthlyEngine = await readProjectFile("../src/app/finance/monthly-trend/monthly-trend-engine.js");
  const profitStructureEngine = await readProjectFile("../src/app/finance/profit-structure/profit-structure-engine.js");
  const financeAITool = await readProjectFile("../src/app/tools/finance-ai-assistant/FinanceAIAssistantTool.tsx");

  for (const [name, source] of [
    ["monthly-trend", monthlyEngine],
    ["profit-structure", profitStructureEngine],
  ]) {
    assert.match(source, /finance\/templates\.js/, `${name} should import the template hub`);
    assert.match(source, /OPERATING_DETAIL_HEADERS/, `${name} should use the shared operating detail headers`);
    assert.match(source, /getOperatingDetailTemplateRowsForModel/, `${name} should use a scenario-specific canonical subset`);
  }
  assert.match(businessEngine, /finance\/templates\.js/, "business-analysis should import the template hub");
  assert.match(businessEngine, /OPERATING_DETAIL_SCENARIO_SHEET_HEADERS/, "business-analysis should use scenario sheet headers for visible templates");
  assert.match(financeAITool, /finance\/templates\.js/, "finance-ai-assistant should import the template hub");
  assert.match(financeAITool, /OPERATING_DETAIL_SCENARIO_SHEET_HEADERS/, "finance-ai-assistant should use scenario sheet headers for visible templates");

  for (const [name, source] of [
    ["business-analysis", businessEngine],
    ["monthly-trend", monthlyEngine],
    ["profit-structure", profitStructureEngine],
  ]) {
    assert.match(source, /createOperatingDetailSampleRows/, `${name} should use the shared operating detail sample`);
  }
  assert.match(businessEngine, /parseOperatingDetailScenarioRows/, "business-analysis should pair actual and budget rows by 数据口径");
  assert.match(financeAITool, /getBudgetScenarioSheetTemplateRows\("actual",\s*"finance-ai-assistant"\)/, "finance AI template download should use its shared scenario profile");
});

test("scenario comparison templates use sheets instead of visible actual budget row fields", async () => {
  const templates = await import("../src/lib/finance/templates.js");
  const {
    OPERATING_DETAIL_HEADERS,
    OPERATING_DETAIL_INTERNAL_HEADERS,
    OPERATING_DETAIL_SCENARIO_SHEET_HEADERS,
  } = templates.default;
  const businessEngine = await readProjectFile("../src/app/finance/business-analysis/business-analysis-engine.js");
  const financeAITool = await readProjectFile("../src/app/tools/finance-ai-assistant/FinanceAIAssistantTool.tsx");
  const marginApp = await readProjectFile("../public/tools/margin-analysis/app.js");

  assert.deepEqual(
    OPERATING_DETAIL_SCENARIO_SHEET_HEADERS,
    OPERATING_DETAIL_HEADERS
  );
  assert.ok(OPERATING_DETAIL_INTERNAL_HEADERS.includes("数据口径"));
  assert.ok(!OPERATING_DETAIL_HEADERS.includes("数据口径"));
  assert.match(businessEngine, /SCENARIO_SHEET_HEADERS/);
  assert.match(financeAITool, /SCENARIO_SHEET_HEADERS/);
  assert.doesNotMatch(businessEngine, /CSV 用“数据口径”列区分实际、预算/);
  assert.doesNotMatch(financeAITool, /同一张表里用“数据口径”区分/);
  assert.match(marginApp, /单车归因不需要填写预算\/实际口径/);
});

test("monthly trend sample startup keeps its month label formatter available", async () => {
  const monthlyEngine = await readProjectFile("../src/app/finance/monthly-trend/monthly-trend-engine.js");

  assert.match(monthlyEngine, /loadRows\(createSampleRows\(\),\s*"示例数据"\)/);
  assert.match(monthlyEngine, /function makePeriod\(year,\s*month\)[\s\S]*label:\s*formatMonthKey\(key\)/);
  assert.match(monthlyEngine, /function formatMonthKey\(monthKey\)/);
});

test("static margin attribution tool mirrors the shared operating detail template", async () => {
  const marginApp = await readProjectFile("../public/tools/margin-analysis/app.js");
  const marginHtml = await readProjectFile("../public/tools/margin-analysis/index.html");

  assert.match(marginHtml, /operating-detail-templates\.js/);
  assert.match(marginApp, /FinanceOperatingDetailTemplates/);
  assert.match(marginApp, /getOperatingDetailTemplateRowsForModel\('margin-analysis'\)/);
  assert.doesNotMatch(marginApp, /TEMPLATE_HEADERS\s*=\s*\[[\s\S]*'数据口径'/);
  assert.doesNotMatch(marginApp, /'数据口径':\s*'实际'/);
});

test("budget actual model teaches one paired Excel workbook instead of a lossy CSV template", async () => {
  const businessTool = await readProjectFile("../src/app/finance/business-analysis/BusinessAnalysisTool.tsx");
  const businessEngine = await readProjectFile("../src/app/finance/business-analysis/business-analysis-engine.js");
  const businessPage = await readProjectFile("../src/app/finance/business-analysis/page.tsx");

  assert.doesNotMatch(businessTool, /id="btn-csv-template"/);
  assert.doesNotMatch(businessEngine, /downloadCsvTemplate/);
  assert.doesNotMatch(businessEngine, /btn-csv-template/);
  assert.match(businessTool, /id="btn-xlsx-template"/);
  assert.match(businessTool, /accept="\.csv,\.xlsx,\.xls"/);
  assert.doesNotMatch(businessPage, /科目在行上、金额在列上/);
  assert.match(businessPage, /“实际”和“预算”两张子表/);
});

test("finance template center is documented next to chart and interaction centers", async () => {
  const templateSystem = await readProjectFile("../docs/finance-template-system.md");
  const inventory = await readProjectFile("../docs/finance-model-inventory.md");
  const handoff = await readProjectFile("../agent.md");

  assert.match(templateSystem, /# 财务模板中枢/);
  assert.match(templateSystem, /src\/lib\/finance\/templates\.js/);
  assert.match(templateSystem, /\| monthly-trend \| operating-detail \|/);
  assert.match(templateSystem, /\| profit-structure \| operating-detail \|/);
  assert.doesNotMatch(templateSystem, /perspective-bi/);
  assert.match(templateSystem, /\| finance-ai-assistant \| operating-detail \|/);
  assert.match(templateSystem, /\| business-analysis \| operating-detail \|/);
  assert.match(templateSystem, /\| margin-analysis \| operating-detail \|/);
  assert.match(templateSystem, /\| sensitivity-analysis \| profit-sensitivity-assumptions \|/);
  assert.match(templateSystem, /除敏感性分析之外/);
  assert.match(inventory, /docs\/finance-template-system\.md/);
  assert.match(handoff, /docs\/finance-template-system\.md/);
  assert.match(handoff, /除敏感性分析之外/);
});
