import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const marginApp = await readFile(new URL("../public/tools/margin-analysis/app.js", import.meta.url), "utf8");
const marginCss = await readFile(new URL("../public/tools/margin-analysis/styles.css", import.meta.url), "utf8");
const businessEngine = await readFile(
  new URL("../src/app/finance/business-analysis/business-analysis-engine.js", import.meta.url),
  "utf8"
);
const businessCss = await readFile(new URL("../src/app/finance/business-analysis/tool.css", import.meta.url), "utf8");
const sensitivityCss = await readFile(new URL("../src/app/finance/sensitivity-analysis/tool.css", import.meta.url), "utf8");
const sensitivityEngine = await readFile(
  new URL("../src/app/finance/sensitivity-analysis/sensitivity-engine.js", import.meta.url),
  "utf8"
);
const sensitivityTool = await readFile(
  new URL("../src/app/finance/sensitivity-analysis/SensitivityTool.tsx", import.meta.url),
  "utf8"
);
const monthlyCss = await readFile(new URL("../src/app/finance/monthly-trend/tool.css", import.meta.url), "utf8");
const monthlyEngine = await readFile(
  new URL("../src/app/finance/monthly-trend/monthly-trend-engine.js", import.meta.url),
  "utf8"
);
const monthlyTool = await readFile(
  new URL("../src/app/finance/monthly-trend/MonthlyTrendTool.tsx", import.meta.url),
  "utf8"
);
const monthlyPage = await readFile(
  new URL("../src/app/finance/monthly-trend/page.tsx", import.meta.url),
  "utf8"
);
const financeModelInventory = await readFile(
  new URL("../docs/finance-model-inventory.md", import.meta.url),
  "utf8"
);
const financeChartSystem = await readFile(
  new URL("../docs/finance-chart-system.md", import.meta.url),
  "utf8"
);
const financeTemplatesSource = await readFile(
  new URL("../public/tools/shared/operating-detail-templates.js", import.meta.url),
  "utf8"
);
const profitStructureEngine = await readFile(
  new URL("../src/app/finance/profit-structure/profit-structure-engine.js", import.meta.url),
  "utf8"
);

test("margin analysis mobile waterfall detail overlays the chart with a return action", () => {
  assert.match(marginApp, /waterfall-touch-return/);
  assert.match(marginApp, /返回图表/);
  assert.match(marginCss, /\.waterfall-chart-container\s*\{[^}]*position:\s*relative/s);
  assert.match(marginCss, /\.waterfall-touch-host\.visible\s*\{[^}]*position:\s*absolute/s);
});

test("business analysis mobile waterfall detail overlays the chart with a return action", () => {
  assert.match(businessEngine, /waterfall-touch-return/);
  assert.match(businessEngine, /返回图表/);
  assert.match(businessCss, /\.business-tool \.dimension-waterfall\s*\{[^}]*position:\s*relative/s);
  assert.match(businessCss, /\.business-tool \.waterfall-touch-host:not\(:empty\)\s*\{[^}]*position:\s*absolute/s);
});

test("finance tool workbench titles share the generous margin-analysis title rhythm", () => {
  assert.match(marginCss, /\.title-decoration\s*\{[^}]*display:\s*flex/s);
  assert.match(marginCss, /\.main-header\s*\{[^}]*font-size:\s*clamp\(1\.55rem,\s*2\.1vw,\s*2\.15rem\)/s);
  assert.match(marginCss, /\.main-header\s*\{[^}]*background:\s*linear-gradient\(135deg,\s*var\(--accent-orange\)/s);
  assert.match(businessCss, /\.business-tool \.model-header h1\s*\{[^}]*font-size:\s*clamp\(1\.55rem,\s*2\.1vw,\s*2\.15rem\)/s);
  assert.match(businessCss, /\.business-tool \.model-header h1\s*\{[^}]*background:\s*linear-gradient\(135deg,\s*var\(--accent-orange\)/s);
  assert.match(businessCss, /\.business-tool \.model-header\s*\{[^}]*margin:\s*0 auto 1\.25rem/s);
  assert.match(businessCss, /\.business-tool \.model-subtitle\s*\{[^}]*margin-top:\s*0\.65rem[\s\S]*font-size:\s*0\.95rem[\s\S]*line-height:\s*1\.7/s);
  assert.match(sensitivityCss, /\.sensitivity-tool \.model-header h1\s*\{[^}]*font-size:\s*clamp\(1\.55rem,\s*2\.1vw,\s*2\.15rem\)/s);
  assert.match(sensitivityCss, /\.sensitivity-tool \.model-header h1\s*\{[^}]*background:\s*linear-gradient\(135deg,\s*var\(--accent-orange\)/s);
  assert.match(sensitivityCss, /\.sensitivity-tool \.model-header\s*\{[^}]*margin:\s*0 auto 1\.25rem/s);
  assert.match(sensitivityCss, /\.sensitivity-tool \.model-subtitle\s*\{[^}]*margin-top:\s*0\.65rem[\s\S]*font-size:\s*0\.95rem[\s\S]*line-height:\s*1\.7/s);
  assert.match(monthlyCss, /\.monthly-trend-tool \.model-header h1\s*\{[^}]*font-size:\s*clamp\(1\.55rem,\s*2\.1vw,\s*2\.15rem\)/s);
  assert.match(monthlyCss, /\.monthly-trend-tool \.model-header h1\s*\{[^}]*background:\s*linear-gradient\(135deg,\s*var\(--accent-orange\)/s);
  assert.match(monthlyCss, /\.monthly-trend-tool \.model-header\s*\{[^}]*margin-bottom:\s*1rem/s);
  assert.match(monthlyCss, /\.monthly-trend-tool \.model-subtitle\s*\{[^}]*margin-top:\s*0\.55rem[\s\S]*font-size:\s*0\.92rem[\s\S]*line-height:\s*1\.7/s);
  assert.match(marginCss, /\.main-header\s*\{[^}]*font-size:\s*1\.4rem/s);
  assert.match(monthlyCss, /\.monthly-trend-tool \.model-header h1\s*\{[^}]*font-size:\s*1\.4rem/s);
});

test("Plotly finance workbenches resize charts after the control console changes width", () => {
  [
    ["margin analysis", marginApp],
    ["business analysis", businessEngine],
    ["sensitivity analysis", sensitivityEngine],
    ["monthly trend", monthlyEngine],
    ["profit structure", profitStructureEngine],
  ].forEach(([label, source]) => {
    assert.match(source, /function resizePlotlyCharts\(\)\s*\{[\s\S]*Plotly\.Plots\.resize\(plot\)/, `${label} should resize rendered Plotly charts`);
    assert.match(source, /function schedulePlotResize\(\)\s*\{[\s\S]*(?:window\.requestAnimationFrame|requestAnimationFrame|lifecycle\.frame)\(resizePlotlyCharts\)[\s\S]*(?:window\.setTimeout|setTimeout|lifecycle\.timeout)\(resizePlotlyCharts,\s*\d+\)/, `${label} should schedule an immediate and delayed resize`);
  });

  const businessToggle = businessEngine.match(/function setSidebarOpen\(open\)\s*\{([\s\S]*?)\n    \}/);
  assert.ok(businessToggle, "business sidebar toggle should be declared");
  assert.match(businessToggle[1], /schedulePlotResize\(\)/);

  const sensitivityToggle = sensitivityEngine.match(/function toggleSidebar\(open\)\s*\{([\s\S]*?)\n\}/);
  assert.ok(sensitivityToggle, "sensitivity sidebar toggle should be declared");
  assert.match(sensitivityToggle[1], /schedulePlotResize\(\)/);

  const marginToggle = marginApp.match(/const setSidebarOpen = \(open\) => \{([\s\S]*?)\n    \};/);
  assert.ok(marginToggle, "margin sidebar toggle should be declared");
  assert.match(marginToggle[1], /schedulePlotResize\(\)/);

  const monthlyCollapse = monthlyEngine.match(/function collapse\(\)\s*\{([\s\S]*?)\n        \}/);
  const monthlyExpand = monthlyEngine.match(/function expandSidebar\(\)\s*\{([\s\S]*?)\n        \}/);
  assert.ok(monthlyCollapse, "monthly sidebar collapse should be declared");
  assert.ok(monthlyExpand, "monthly sidebar expand should be declared");
  assert.match(monthlyCollapse[1], /schedulePlotResize\(\)/);
  assert.match(monthlyExpand[1], /schedulePlotResize\(\)/);

  const profitCollapse = profitStructureEngine.match(/function collapse\(\)\s*\{([\s\S]*?)\n    \}/);
  const profitExpand = profitStructureEngine.match(/function expandSidebar\(\)\s*\{([\s\S]*?)\n    \}/);
  assert.ok(profitCollapse, "profit structure sidebar collapse should be declared");
  assert.ok(profitExpand, "profit structure sidebar expand should be declared");
  assert.match(profitCollapse[1], /schedulePlotResize\(\)/);
  assert.match(profitExpand[1], /schedulePlotResize\(\)/);
});

test("Plotly finance workbenches share one control-console mobile breakpoint", async () => {
  const breakpointSource = await readFile(
    new URL("../src/lib/finance/workbench-breakpoints.ts", import.meta.url),
    "utf8"
  );

  assert.match(breakpointSource, /FINANCE_WORKBENCH_MOBILE_BREAKPOINT_PX\s*=\s*900/);
  assert.match(breakpointSource, /FINANCE_WORKBENCH_MOBILE_QUERY/);
  assert.match(breakpointSource, /isFinanceWorkbenchMobileViewport/);

  for (const [label, source] of [
    ["business analysis", businessEngine],
    ["sensitivity analysis", sensitivityEngine],
    ["monthly trend", monthlyEngine],
    ["profit structure", profitStructureEngine],
  ]) {
    assert.match(source, /FINANCE_WORKBENCH_MOBILE_QUERY/, `${label} should use the shared workbench mobile query`);
  }

  for (const [label, css] of [
    ["business analysis", businessCss],
    ["sensitivity analysis", sensitivityCss],
    ["monthly trend", monthlyCss],
    ["profit structure", await readFile(new URL("../src/app/finance/profit-structure/tool.css", import.meta.url), "utf8")],
  ]) {
    assert.match(css, /@media \(max-width:\s*900px\)/, `${label} should switch the control console at 900px`);
  }

  assert.doesNotMatch(businessEngine, /max-width:\s*820px/);
  assert.doesNotMatch(sensitivityEngine, /max-width:\s*820px/);
  assert.doesNotMatch(businessCss, /@media \(max-width:\s*820px\)/);
  assert.doesNotMatch(sensitivityCss, /@media \(max-width:\s*820px\)/);
});

test("finance model charts are locked against accidental zoom and drag by default", () => {
  assert.match(monthlyEngine, /function chartConfig\(\)\s*\{[\s\S]*displayModeBar:\s*false[\s\S]*scrollZoom:\s*false[\s\S]*doubleClick:\s*false[\s\S]*editable:\s*false/s);
  assert.match(monthlyEngine, /function chartLayout\(extra = \{\}\)\s*\{[\s\S]*dragmode:\s*false/s);
  assert.match(monthlyEngine, /\/\^\[xy\]axis\\d\*\$\/\.test\(key\)[\s\S]*fixedrange:\s*true/s);
  assert.match(monthlyEngine, /legend:\s*\{[\s\S]*itemclick:\s*false[\s\S]*itemdoubleclick:\s*false/s);

  assert.match(sensitivityEngine, /function getPlotConfig\(\)\s*\{[\s\S]*displayModeBar:\s*false[\s\S]*scrollZoom:\s*false[\s\S]*doubleClick:\s*false[\s\S]*editable:\s*false/s);
  assert.match(sensitivityEngine, /function getLockedPlotLayout\(layout\)\s*\{[\s\S]*dragmode:\s*false[\s\S]*clickmode:\s*"none"/s);
  assert.match(businessEngine, /function plotConfig\(\)\s*\{[\s\S]*staticPlot:\s*true/s);
  assert.match(businessEngine, /function plotLayout\(extra = \{\}\)\s*\{[\s\S]*\/\^\[xy\]axis\\d\*\$\/\.test\(key\)[\s\S]*fixedrange:\s*true/s);
  assert.match(businessEngine, /function drillPlotConfig\(\)\s*\{[\s\S]*staticPlot:\s*false/s);
  assert.match(marginApp, /const config = \{[\s\S]*displayModeBar:\s*false[\s\S]*scrollZoom:\s*false[\s\S]*doubleClick:\s*false[\s\S]*editable:\s*false/s);
  assert.match(marginApp, /dragmode:\s*false[\s\S]*clickmode:\s*'event'/s);
});

test("monthly trend rebinds sidebar controls when the route remounts", () => {
  assert.match(monthlyEngine, /function initApp\(\)\s*\{[\s\S]*lifecycle\.start\(\);\s*initSidebar\(\);\s*initResponsiveMonthAxis\(\);\s*initChartResizeObserver\(\);\s*bindControls\(\);\s*if \(state\.initialized\)/s);
  assert.doesNotMatch(monthlyEngine, /if \(state\.initialized\)\s*\{[\s\S]*?return;\s*\}[\s\S]*?bindControls\(\);/s);
});

test("monthly trend uses uploaded dimensions as a drill path with upper-level filters", () => {
  assert.doesNotMatch(monthlyTool, /monthly-filter-summary|monthly-dimension-picker/);
  assert.doesNotMatch(monthlyEngine, /function renderFilterSummary\(\)/);
  assert.doesNotMatch(monthlyEngine, /check-pill/);
  assert.match(monthlyEngine, /excel-filter-shell/);
  assert.match(monthlyEngine, /function renderExcelFilterMenu\(/);
  assert.match(monthlyEngine, /function renderDrillPathControls\(/);
  assert.match(monthlyEngine, /class="dimension-train monthly-dimension-train"/);
  assert.match(monthlyEngine, /function drillFilterDimensions\(\)[\s\S]*slice\(0,\s*-1\)/);
  assert.match(monthlyCss, /\.monthly-trend-tool \.excel-filter-trigger\s*\{/);
  assert.match(monthlyCss, /\.monthly-trend-tool \.excel-filter-footer-actions\s*\{/);
  assert.match(monthlyCss, /\.monthly-trend-tool \.monthly-dimension-train\s*\{/);
  assert.doesNotMatch(monthlyCss, /\.monthly-trend-tool \.(filter-summary|dimension-picker|check-pill)\b/);
});

test("monthly trend narrows filter candidates by earlier drill levels", () => {
  assert.match(monthlyEngine, /function candidateRowsForDimension\(dimension\)\s*\{[\s\S]*const dimensions = drillDimensions\(\)[\s\S]*const dimensionIndex = dimensions\.indexOf\(dimension\)[\s\S]*filterIndex < dimensionIndex/s);
  assert.match(monthlyEngine, /function distinctDimensionValues\(dimension\)\s*\{[\s\S]*candidateRowsForDimension\(dimension\)/s);
  assert.match(monthlyEngine, /function pruneLinkedFilters\(changedDimension\)\s*\{[\s\S]*const changedIndex[\s\S]*index <= changedIndex[\s\S]*distinctDimensionValues\(dimension\)[\s\S]*delete state\.filters\[dimension\]/s);
  assert.match(monthlyEngine, /function applyExcelFilterSelection\(dimension,[\s\S]*pruneLinkedFilters\(dimension\)/s);
  assert.doesNotMatch(monthlyEngine, /filterDimension !== dimension/);
});

test("monthly trend removes the concentration chart from the workbench", () => {
  const monthlyTrendInventorySection = financeModelInventory.match(/### 分月指标趋势分析模型[\s\S]*?(?=\n### |\n## |$)/)?.[0] || "";

  assert.doesNotMatch(monthlyTool, /monthly-concentration|结构集中度|头部占比/);
  assert.doesNotMatch(monthlyPage, /结构集中度|集中度/);
  assert.doesNotMatch(monthlyEngine, /renderConcentrationChart|categoryShares|monthly-concentration|集中度指数|头部占比/);
  assert.doesNotMatch(monthlyTrendInventorySection, /结构集中度|集中度/);
  assert.doesNotMatch(financeChartSystem, /monthly-trend \|[^\n]*结构集中度/);
});

test("monthly trend keeps the base table schema business-facing", () => {
  assert.doesNotMatch(monthlyTool, /monthly-btn-demo|monthly-btn-export|monthly-month-column/);
  assert.doesNotMatch(monthlyEngine, /monthly-btn-demo|monthly-btn-export|function exportSummary/);
  assert.doesNotMatch(monthlyTool, /monthly-data-guide|数据底表说明|月份列不许动|销量是分母口径/);
  assert.match(monthlyEngine, /const TEMPLATE_HEADER_NOTE\s*=\s*OPERATING_DETAIL_TEMPLATE_NOTE/);
  assert.match(monthlyEngine, /OPERATING_DETAIL_TEMPLATE_NOTE/);
  assert.match(monthlyEngine, /getOperatingDetailTemplateRows/);
  assert.match(monthlyEngine, /createTemplateDataSheet\(window\.XLSX,\s*rows,\s*headers\)/);
  assert.match(monthlyEngine, /createTemplateInfoSheet/);
  assert.match(monthlyEngine, /function findTemplateHeaderRowIndex/);
  assert.match(monthlyEngine, /sheet_to_json\(sheet,\s*\{\s*header:\s*1/);
  assert.match(monthlyEngine, /const LOCKED_MONTH_COLUMN\s*=\s*"月份"/);
  assert.match(monthlyEngine, /function volumeMetricColumn\(/);
  assert.match(monthlyEngine, /function buildTrendMetricDefinitions\(/);
  assert.doesNotMatch(monthlyEngine, /"边际率":/);
  assert.doesNotMatch(monthlyEngine, /"单车净收入":/);
  assert.doesNotMatch(monthlyEngine, /"单车边际":/);
  assert.doesNotMatch(monthlyEngine, /coreTrendMetrics\(\)\.slice\(0,\s*3\)/);
});

test("monthly trend shares the operating-detail template without relying on sales-column position", () => {
  assert.match(monthlyEngine, /const TEMPLATE_HEADERS\s*=\s*OPERATING_DETAIL_HEADERS/);
  assert.match(monthlyEngine, /createOperatingDetailSampleRows/);
  assert.match(monthlyEngine, /function analyzeMonthlyUploadHeaders\(/);
  assert.match(monthlyEngine, /function inferMonthlyUploadFields\(/);
  assert.match(monthlyEngine, /inferFinanceFieldRoles\(rows/);
  assert.match(monthlyEngine, /dimensionColumns:\s*inference\.dimensionColumns/);
  assert.match(monthlyEngine, /metricColumns:\s*\[inference\.denominatorColumn,\s*\.\.\.inference\.metricColumns\]/);
  assert.doesNotMatch(monthlyEngine, /index < salesIndex|index > salesIndex/);
  assert.doesNotMatch(monthlyEngine, /const TEMPLATE_HEADERS\s*=\s*Object\.keys/);
});

test("sensitivity analysis makes its current model assumptions visible", () => {
  assert.match(sensitivityTool, /所有 Driver 均按非负值计算/);
  assert.match(sensitivityTool, /所得税按固定金额处理/);
  assert.match(sensitivityTool, /利润总额 = 销量 × 单位收入 - 销量 × 单位变动成本 - 固定扣减项 \+ 利润贡献项/);
});

test("monthly trend names each multi metric trend line by business meaning", () => {
  assert.match(monthlyEngine, /function trendMetricIdentityText\(/);
  assert.match(monthlyEngine, /第一段是销量原值/);
  assert.match(monthlyEngine, /总额指标除以销量后的单车趋势/);
  assert.match(monthlyEngine, /原始指标/);
  assert.match(monthlyEngine, /sourceLabel\)} ÷ \$\{escapeHtml\(volumeMetric\)\}/);
  assert.match(monthlyEngine, /text:\s*trendMetricIdentityText\(item\)/);
});

test("sensitivity metric cards use the refined finance dashboard card treatment", () => {
  assert.match(sensitivityEngine, /function metricComparisonMeta\(currentValue,\s*baseValue\)/);
  assert.match(sensitivityEngine, /<article class="metric-card metric-\$\{card\.tone\}">/);
  assert.match(sensitivityEngine, /metric-topline/);
  assert.match(sensitivityEngine, /metric-status \$\{card\.deltaClass\}/);
  assert.match(sensitivityEngine, /metric-sub-label/);
  assert.match(sensitivityCss, /\.sensitivity-tool \.metric-card::before/s);
  assert.match(sensitivityCss, /\.sensitivity-tool \.metric-card\.metric-green/s);
  assert.match(sensitivityCss, /\.sensitivity-tool \.metric-status\.positive/s);
  assert.match(sensitivityCss, /\.sensitivity-tool \.metric-sub strong/s);
});
