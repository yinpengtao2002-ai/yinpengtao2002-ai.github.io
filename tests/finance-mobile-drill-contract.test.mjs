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
  new URL("../src/lib/finance/templates.js", import.meta.url),
  "utf8"
);
const profitStructureEngine = await readFile(
  new URL("../src/app/finance/profit-structure/profit-structure-engine.js", import.meta.url),
  "utf8"
);
const perspectiveTool = await readFile(
  new URL("../src/app/finance/perspective-bi/PerspectiveBITool.tsx", import.meta.url),
  "utf8"
).catch(() => "");
const perspectivePage = await readFile(
  new URL("../src/app/finance/perspective-bi/page.tsx", import.meta.url),
  "utf8"
).catch(() => "");
const perspectiveEngine = await readFile(
  new URL("../src/app/finance/perspective-bi/perspective-bi-engine.js", import.meta.url),
  "utf8"
).catch(() => "");
const perspectiveCss = await readFile(
  new URL("../src/app/finance/perspective-bi/tool.css", import.meta.url),
  "utf8"
).catch(() => "");

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
    assert.match(source, /function schedulePlotResize\(\)\s*\{[\s\S]*requestAnimationFrame\(resizePlotlyCharts\)[\s\S]*setTimeout\(resizePlotlyCharts,\s*\d+\)/, `${label} should schedule an immediate and delayed resize`);
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

test("Perspective BI follows the finance workbench shell and upload controls", () => {
  assert.match(perspectiveTool, /id="perspective-bi-root"/);
  assert.match(perspectiveTool, /Perspective BI 分析台/);
  assert.match(perspectiveTool, /id="perspective-file-input"/);
  assert.match(perspectiveTool, /id="perspective-btn-csv-template"/);
  assert.match(perspectiveTool, /id="perspective-btn-xlsx-template"/);
  assert.match(perspectiveTool, /id="perspective-field-roles"/);
  assert.match(perspectiveTool, /createElement\("perspective-viewer"/);
  assert.match(perspectiveEngine, /@perspective-dev\/client/);
  assert.match(perspectiveEngine, /@perspective-dev\/viewer-datagrid/);
  assert.match(perspectiveEngine, /@perspective-dev\/viewer-d3fc/);
  assert.match(perspectiveEngine, /viewer\.load\(table\)/);
  assert.match(perspectiveEngine, /viewer\.restore/);
  assert.match(perspectiveEngine, /XLSX\.read/);
  assert.match(perspectiveCss, /\.perspective-bi-tool \.data-toolbar\s*\{/);
  assert.match(perspectiveCss, /\.perspective-bi-tool \.field-role-row\s*\{/);
  assert.doesNotMatch(perspectiveTool, /id="perspective-btn-demo"/);
  assert.doesNotMatch(perspectiveTool, /id="perspective-btn-export-csv"/);
  assert.doesNotMatch(perspectiveEngine, /function exportCurrentCsv/);
  assert.doesNotMatch(perspectiveTool, /id="perspective-sidebar"/);
  assert.doesNotMatch(perspectiveCss, /\.perspective-bi-tool \.sidebar\s*\{/);
  assert.doesNotMatch(perspectiveCss, /\.perspective-bi-tool \.sidebar-backdrop/);
});

test("Perspective BI templates only ask for base business fields without automatic derived metrics", () => {
  assert.match(perspectiveEngine, /getOperatingDetailTemplateRows\(\)\.map\(orderOperatingDetailRow\)/);
  assert.match(perspectiveEngine, /OPERATING_DETAIL_HEADERS/);
  assert.match(perspectiveEngine, /销量/);
  assert.match(perspectiveEngine, /净收入/);
  assert.match(perspectiveEngine, /边际/);
  assert.doesNotMatch(perspectiveEngine, /const DERIVED_METRICS/);
  assert.doesNotMatch(perspectiveEngine, /function enrichDerivedMetrics\(rows\)/);
  assert.doesNotMatch(perspectiveEngine, /function isDerivedMetric\(column\)/);
  assert.match(perspectiveEngine, /const normalizedRows = normalizeRows\(rows\)/);
  assert.doesNotMatch(perspectiveEngine, /enrichDerivedMetrics\(normalizeRows\(rows\)\)/);
  assert.doesNotMatch(perspectiveEngine, /预算达成率/);
  assert.doesNotMatch(perspectivePage, /单车质量/);
});

test("Perspective BI default demo data is rich enough to exercise chart exploration", () => {
  assert.match(perspectiveEngine, /createOperatingDetailSampleRows\(\)\.map\(orderOperatingDetailRow\)/);
  assert.match(perspectiveEngine, /function orderOperatingDetailRow\(row\)/);
  assert.match(perspectiveEngine, /OPERATING_DETAIL_HEADERS\.reduce/);
  assert.match(financeTemplatesSource, /"品牌"/);
  assert.match(financeTemplatesSource, /"品牌市场"/);
  assert.match(financeTemplatesSource, /"经营模式"/);
  assert.match(financeTemplatesSource, /"业务单元"/);
  assert.match(financeTemplatesSource, /"车型"/);
  assert.match(financeTemplatesSource, /"燃油品类"/);
  assert.match(financeTemplatesSource, /"销量"/);
  assert.match(financeTemplatesSource, /"净收入"/);
  assert.match(financeTemplatesSource, /"成本"/);
  assert.match(financeTemplatesSource, /"边际"/);
  assert.doesNotMatch(perspectiveEngine, /预算达成率/);
});

test("Perspective BI adds calculated metrics as native workbench expression fields", () => {
  assert.match(perspectiveTool, /id="perspective-calculated-metric-toggle"/);
  assert.match(perspectiveTool, /id="perspective-calculated-metric-panel"/);
  assert.match(perspectiveTool, /id="perspective-calculated-field-count"/);
  assert.match(perspectiveTool, /id="perspective-calculated-field-list"/);
  assert.match(perspectiveTool, /id="perspective-calculated-metric-name"/);
  assert.match(perspectiveTool, /id="perspective-calculated-formula"/);
  assert.match(perspectiveTool, /id="perspective-calculated-metric-type"/);
  assert.match(perspectiveTool, /id="perspective-calculated-metric-status"/);
  assert.match(perspectiveTool, /作为字段加入下方 Perspective 工作台/);
  assert.match(perspectiveEngine, /function renderCalculatedMetricControls\(rows\)/);
  assert.match(perspectiveEngine, /function renderCalculatedFieldList/);
  assert.match(perspectiveEngine, /function buildCalculatedExpressions\(\)/);
  assert.match(perspectiveEngine, /function toPerspectiveExpressionFormula\(formula\)/);
  assert.match(perspectiveEngine, /function inferCalculatedMetricAggregate\(field\)/);
  assert.match(perspectiveEngine, /function handleCalculatedFieldRemove/);
  assert.match(perspectiveEngine, /const expressions = buildCalculatedExpressions\(\)/);
  assert.match(perspectiveEngine, /expressions,\s*sort:/);
  assert.match(perspectiveEngine, /\["weighted mean",\s*\[denominator\]\]/);
  assert.match(perspectiveEngine, /function getAnalysisRows\(rows\)[\s\S]*activeColumns/s);
  assert.doesNotMatch(perspectiveEngine, /getAnalysisRows\(rows\)[\s\S]*calculatedValue/s);
  assert.doesNotMatch(perspectiveEngine, /state\.calculatedMetric\.generated/);
  assert.doesNotMatch(perspectiveTool, /id="perspective-calculated-dimensions"/);
  assert.doesNotMatch(perspectiveTool, /分组维度/);
  assert.doesNotMatch(perspectiveTool, /id="perspective-calculated-numerator"/);
  assert.doesNotMatch(perspectiveTool, /id="perspective-calculated-denominator"/);
  assert.doesNotMatch(perspectiveTool, /id="perspective-calculated-metric-table"/);
  assert.doesNotMatch(perspectiveEngine, /function calculateMetricRows\(rows\)/);
  assert.doesNotMatch(perspectiveEngine, /function buildCalculatedFormulaContext/);
  assert.doesNotMatch(perspectiveEngine, /function buildCalculatedWorkbenchRows\(rows\)/);
  assert.doesNotMatch(perspectiveEngine, /function renderCalculatedMetricTable/);
  assert.doesNotMatch(perspectiveEngine, /function appendTableCell/);
  assert.doesNotMatch(perspectiveCss, /\.perspective-bi-tool \.calculated-metric-table/);
  assert.doesNotMatch(perspectiveCss, /\.perspective-bi-tool \.calculated-dimensions/);
  assert.doesNotMatch(perspectiveCss, /\.perspective-bi-tool \.dimension-chip/);
});

test("Perspective BI manages calculated fields as a deletable field list", () => {
  assert.match(perspectiveTool, /字段管理/);
  assert.match(perspectiveTool, /系统自动补充单车指标/);
  assert.match(perspectiveEngine, /calculatedFields:\s*\[\]/);
  assert.match(perspectiveEngine, /data-calculated-field-remove/);
  assert.match(perspectiveEngine, /function handleCalculatedFieldRemove\(event\)/);
  assert.match(perspectiveEngine, /state\.calculatedFields = state\.calculatedFields\.filter/);
  assert.match(perspectiveEngine, /await reloadViewer\("计算字段移除"\)/);
  assert.match(perspectiveEngine, /已从下方 BI 工作台移除/);
  assert.match(perspectiveCss, /\.perspective-bi-tool \.calculated-actions\s*\{/);
  assert.match(perspectiveCss, /\.perspective-bi-tool \.calculated-field-list\s*\{/);
  assert.match(perspectiveCss, /\.perspective-bi-tool \.calculated-delete-btn\s*\{/);
  assert.doesNotMatch(perspectiveTool, /id="perspective-calculated-remove"/);
  assert.doesNotMatch(perspectiveEngine, /handleCalculatedMetricRemove/);
});

test("Perspective BI keeps calculated field management compact for large field sets", () => {
  assert.match(perspectiveCss, /\.perspective-bi-tool \.calculated-field-list\s*\{[^}]*minmax\(min\(100%,\s*220px\),\s*1fr\)/s);
  assert.match(perspectiveCss, /\.perspective-bi-tool \.calculated-field-card\s*\{[^}]*min-height:\s*38px/s);
  assert.match(perspectiveCss, /\.perspective-bi-tool \.calculated-field-card\s*\{[^}]*padding:\s*0\.36rem\s*0\.42rem/s);
  assert.match(perspectiveCss, /\.perspective-bi-tool \.calculated-field-meta\s*\{[^}]*display:\s*none/s);
  assert.match(perspectiveCss, /\.perspective-bi-tool \.calculated-delete-btn\s*\{[^}]*min-height:\s*28px/s);
  assert.doesNotMatch(perspectiveCss, /\.perspective-bi-tool \.calculated-field-list\s*\{[^}]*260px/s);
});

test("Perspective BI supports Excel-like calculated formulas with metric classifications", () => {
  assert.match(perspectiveTool, /placeholder="例如：\[净收入\] \/ \[销量\]"/);
  assert.match(perspectiveTool, /累计指标/);
  assert.match(perspectiveTool, /单位\/比率指标/);
  assert.match(perspectiveTool, /公式写法/);
  assert.match(perspectiveEngine, /calculatedFormulaOperators/);
  assert.match(perspectiveEngine, /function tokenizeCalculatedFormula/);
  assert.match(perspectiveEngine, /function toReversePolishNotation/);
  assert.match(perspectiveEngine, /type:\s*"unit"/);
  assert.match(perspectiveEngine, /formula:\s*"\[净收入\] \/ \[销量\]"/);
  assert.match(perspectiveEngine, /field\.type === "additive"[\s\S]*return "sum"/);
});

test("Perspective BI automatically creates useful unit metrics from uploaded business data", () => {
  assert.match(perspectiveEngine, /function buildAutoCalculatedFields\(rows\)/);
  assert.match(perspectiveEngine, /const unitMetricBlueprints/);
  assert.match(perspectiveEngine, /单车净收入/);
  assert.match(perspectiveEngine, /单车边际/);
  assert.match(perspectiveEngine, /单车成本/);
  assert.match(perspectiveEngine, /if \(numerator === denominator\) return/);
  assert.match(perspectiveEngine, /if \(getColumns\(rows\)\.includes\(blueprint\.name\)\) return/);
  assert.match(perspectiveEngine, /state\.calculatedFields = buildAutoCalculatedFields\(normalizedRows\)/);
  assert.doesNotMatch(perspectiveEngine, /单车销量/);
});

test("Perspective BI keeps one workbench and removes calculated metric dataset switching", () => {
  assert.doesNotMatch(perspectiveTool, /id="perspective-workbench-dataset-select"/);
  assert.doesNotMatch(perspectiveTool, /工作台数据/);
  assert.doesNotMatch(perspectiveTool, /value="raw"/);
  assert.doesNotMatch(perspectiveTool, /value="calculated"/);
  assert.doesNotMatch(perspectiveEngine, /workbenchDataset:\s*"raw"/);
  assert.doesNotMatch(perspectiveEngine, /calculatedRows:\s*\[\]/);
  assert.doesNotMatch(perspectiveEngine, /function invalidateCalculatedWorkbenchRows\(\)/);
  assert.doesNotMatch(perspectiveEngine, /function buildCalculatedWorkbenchRows\(rows\)/);
  assert.doesNotMatch(perspectiveEngine, /function getWorkbenchRows\(\)/);
  assert.doesNotMatch(perspectiveEngine, /state\.workbenchDataset = "calculated"/);
  assert.match(perspectiveEngine, /await reloadViewer\("计算指标"\)/);
  assert.match(perspectiveEngine, /state\.worker\.table\(analysisRows\)/);
  assert.match(perspectiveEngine, /const analysisRows = getAnalysisRows\(state\.rows\)/);
  assert.doesNotMatch(perspectiveEngine, /function buildCalculatedConfig\(rows\)/);
  assert.doesNotMatch(perspectiveEngine, /function handleWorkbenchDatasetChange/);
  assert.doesNotMatch(perspectiveEngine, /perspective-workbench-dataset-select/);
  assert.doesNotMatch(perspectiveEngine, /const shouldReloadRawWorkbench = state\.workbenchDataset === "calculated"/);
});

test("Perspective BI lets users confirm field roles and aggregations before analysis", () => {
  assert.match(perspectiveEngine, /const FIELD_ROLE_OPTIONS = \["dimension", "metric", "ignore"\]/);
  assert.match(perspectiveEngine, /function inferFieldRoles\(rows\)/);
  assert.match(perspectiveEngine, /function renderFieldRoles\(rows\)/);
  assert.match(perspectiveEngine, /function handleFieldRoleChange/);
  assert.match(perspectiveEngine, /function handleAggregationChange/);
  assert.match(perspectiveEngine, /data-role-select/);
  assert.match(perspectiveEngine, /data-aggregate-select/);
});

test("Perspective BI turns automatic field management into grouped field governance", () => {
  assert.match(perspectiveTool, /字段治理/);
  assert.match(perspectiveTool, /id="perspective-field-governance-toolbar"/);
  assert.match(perspectiveTool, /data-field-governance-action="use-suggestion"/);
  assert.match(perspectiveTool, /data-field-governance-action="unit-average"/);
  assert.match(perspectiveTool, /data-field-governance-action="amount-sum"/);
  assert.match(perspectiveEngine, /const FIELD_GOVERNANCE_GROUPS = \[/);
  assert.match(perspectiveEngine, /function getFieldGovernanceProfile\(rows,\s*column\)/);
  assert.match(perspectiveEngine, /function buildFieldRoleInsights\(rows\)/);
  assert.match(perspectiveEngine, /function applyFieldGovernanceAction\(action\)/);
  assert.match(perspectiveEngine, /function renderFieldRoleGroup/);
  assert.match(perspectiveEngine, /data-governance-group/);
  assert.match(perspectiveEngine, /data-field-reason/);
  assert.match(perspectiveEngine, /识别依据/);
  assert.match(perspectiveEngine, /时间维度/);
  assert.match(perspectiveEngine, /业务维度/);
  assert.match(perspectiveEngine, /金额指标/);
  assert.doesNotMatch(perspectiveEngine, /label:\s*"单位\/比率"/);
  assert.doesNotMatch(perspectiveEngine, /label:\s*"库存区间"/);
  assert.doesNotMatch(perspectiveEngine, /label:\s*"其他字段"/);
  assert.match(perspectiveCss, /\.perspective-bi-tool \.field-governance-toolbar\s*\{/);
  assert.match(perspectiveCss, /\.perspective-bi-tool \.field-governance-group\s*\{/);
  assert.match(perspectiveCss, /\.perspective-bi-tool \.field-role-reason\s*\{/);
  assert.match(perspectiveCss, /\.perspective-bi-tool \.governance-action-btn\s*\{/);
});

test("Perspective BI lets users collapse field confirmation after roles are set", () => {
  assert.match(perspectiveTool, /id="perspective-field-roles-toggle"/);
  assert.match(perspectiveTool, /id="perspective-field-role-summary"/);
  assert.match(perspectiveTool, /className="btn btn-primary important-action-btn"/);
  assert.match(perspectiveEngine, /function renderFieldRoleSummary\(rows\)/);
  assert.match(perspectiveEngine, /function toggleFieldRoles\(\)/);
  assert.match(perspectiveEngine, /fieldRolesCollapsed/);
  assert.match(perspectiveCss, /\.perspective-bi-tool \.field-role-panel\.collapsed\s+\.(field-role-list|field-role-help)/s);
  assert.match(perspectiveCss, /\.perspective-bi-tool \.field-role-summary\s*\{/);
});

test("Perspective BI keeps external preset controls out of the native workbench", () => {
  assert.doesNotMatch(perspectiveTool, /className="field toolbar-preset"/);
  assert.match(perspectiveTool, /className="workbench-controls"/);
  assert.doesNotMatch(perspectiveTool, /id="perspective-workbench-dataset-select"/);
  assert.match(perspectiveTool, /id="perspective-btn-focus-workbench"/);
  assert.match(perspectiveTool, /className="btn focus-action-btn"/);
  assert.match(perspectiveCss, /\.perspective-bi-tool \.workbench-controls\s*\{/);
  assert.match(perspectiveCss, /\.perspective-bi-tool \.important-action-btn\s*\{/);
  assert.match(perspectiveCss, /\.perspective-bi-tool \.focus-action-btn\s*\{/);
  assert.doesNotMatch(perspectiveTool, /id="perspective-preset-select"/);
  assert.doesNotMatch(perspectiveTool, /id="perspective-btn-reset-view"/);
  assert.doesNotMatch(perspectiveTool, /当前视图|收入按区域|边际按区域|月份热力图|恢复预设/);
  assert.doesNotMatch(perspectivePage, /预置收入|收入按区域|边际按区域|月份热力图/);
  assert.doesNotMatch(perspectiveEngine, /preset:\s*"revenue-by-region"/);
  assert.doesNotMatch(perspectiveEngine, /perspective-preset-select/);
  assert.doesNotMatch(perspectiveCss, /\.perspective-bi-tool \.workbench-preset\s*\{/);
  assert.doesNotMatch(perspectiveCss, /\.perspective-bi-tool \.preset-reset-btn\s*\{/);
});

test("Perspective BI explains the active native chart drop zones inside the workbench", () => {
  assert.match(perspectiveTool, /id="perspective-workbench-guide"/);
  assert.match(perspectiveEngine, /const WORKBENCH_GUIDES = \{/);
  assert.match(perspectiveEngine, /Datagrid:[\s\S]*数据表/s);
  assert.match(perspectiveEngine, /"Y Bar":[\s\S]*纵轴/s);
  assert.match(perspectiveEngine, /Heatmap:[\s\S]*热力图/s);
  assert.match(perspectiveEngine, /OHLC:[\s\S]*价格图[\s\S]*开盘[\s\S]*收盘[\s\S]*最高[\s\S]*最低/s);
  assert.match(perspectiveEngine, /Candlestick:[\s\S]*蜡烛图[\s\S]*开盘[\s\S]*收盘[\s\S]*最高[\s\S]*最低/s);
  assert.match(perspectiveEngine, /function renderWorkbenchGuide/);
  assert.match(perspectiveEngine, /function updateWorkbenchGuideFromViewer/);
  assert.match(perspectiveEngine, /function getActiveWorkbenchPluginFromDom/);
  assert.match(perspectiveEngine, /function syncWorkbenchGuideFromViewer/);
  assert.match(perspectiveEngine, /function scheduleWorkbenchGuideSync/);
  assert.match(perspectiveEngine, /MutationObserver[\s\S]*scheduleWorkbenchGuideSync\(root\)/s);
  assert.match(perspectiveEngine, /#plugin_selector_container\s*>\s*\.plugin-select-item\[data-plugin\]/);
  assert.match(perspectiveEngine, /viewer\.addEventListener\("click", syncGuide, true\)/);
  assert.match(perspectiveEngine, /viewer\.addEventListener\("keyup", syncGuide, true\)/);
  assert.match(perspectiveEngine, /attributeFilter: \[[^\]]*"data-plugin"[^\]]*\]/);
  assert.match(perspectiveEngine, /\.column-selector-column\[data-label="Open"\]::before \{ content: "开盘"/);
  assert.match(perspectiveEngine, /\.column-selector-column\[data-label="Close"\]::before \{ content: "收盘"/);
  assert.match(perspectiveEngine, /\.column-selector-column\[data-label="High"\]::before \{ content: "最高"/);
  assert.match(perspectiveEngine, /\.column-selector-column\[data-label="Low"\]::before \{ content: "最低"/);
  assert.match(perspectiveEngine, /perspective-config-update/);
  assert.match(perspectiveEngine, /perspective-plugin-update/);
  assert.match(perspectiveEngine, /viewer\.save\(\)/);
  assert.match(perspectiveCss, /\.perspective-bi-tool \.workbench-guide\s*\{/);
  assert.match(perspectiveCss, /\.perspective-bi-tool \.workbench-guide-item\s*\{/);
  assert.match(perspectiveEngine, /分组/);
  assert.match(perspectiveEngine, /拆分/);
  assert.match(perspectiveEngine, /筛选/);
});

test("Perspective BI localizes the native workbench UI labels to Chinese", () => {
  assert.match(perspectiveCss, /--psp-label--column-columns--content:\s*"字段"/);
  assert.match(perspectiveCss, /--psp-label--column-x-axis--content:\s*"横轴"/);
  assert.match(perspectiveCss, /--psp-label--column-y-axis--content:\s*"纵轴"/);
  assert.match(perspectiveCss, /--psp-label--column-color--content:\s*"颜色"/);
  assert.match(perspectiveCss, /--psp-label--column-size--content:\s*"大小"/);
  assert.match(perspectiveCss, /--psp-label--column-tooltip--content:\s*"提示"/);
  assert.match(perspectiveCss, /--psp-plugin-name--x-y-line--content:\s*"双轴折线图"/);
  assert.match(perspectiveCss, /--psp-plugin-name--y-scatter--content:\s*"纵轴散点图"/);
  assert.match(perspectiveCss, /--psp-label--edit-mode-read-only--content:\s*"只读"/);
  assert.match(perspectiveCss, /--psp-label--debug-tab--content:\s*"调试配置"/);
  assert.match(perspectiveCss, /--column-selector-column-columns--content:\s*"字段"/);
  assert.match(perspectiveEngine, /const PERSPECTIVE_WORKBENCH_TEXT/);
  assert.match(perspectiveEngine, /Rollup/);
  assert.match(perspectiveEngine, /折叠汇总/);
  assert.match(perspectiveEngine, /PERSPECTIVE_SHADOW_LOCALIZATION_CSS[\s\S]*group_rollup_wrapper\[data-value="Rollup"\][\s\S]*折叠汇总/s);
  assert.match(perspectiveEngine, /PERSPECTIVE_SHADOW_LOCALIZATION_CSS[\s\S]*column-selector-column\[data-label="Columns"\][\s\S]*字段/s);
  assert.match(perspectiveEngine, /function ensurePerspectiveShadowLocalizationStyle/);
  assert.match(perspectiveEngine, /applyPerspectiveLocalizationVariables\(viewer\)/);
  assert.match(perspectiveEngine, /function localizePerspectiveWorkbench/);
  assert.match(perspectiveEngine, /function observePerspectiveWorkbenchLocalization/);
  assert.match(perspectiveEngine, /MutationObserver/);
  assert.match(perspectiveEngine, /localizePerspectiveWorkbench\(viewer\)/);
  assert.doesNotMatch(perspectiveCss, /--psp-plugin-name--x-y-line--content:\s*"[^"]*[XY][^"]*"/);
  assert.doesNotMatch(perspectiveCss, /--psp-plugin-name--y-scatter--content:\s*"[^"]*Y[^"]*"/);
});

test("Perspective BI skins the native Perspective operation panel to match finance tools", () => {
  assert.match(perspectiveEngine, /PERSPECTIVE_SHADOW_LOCALIZATION_CSS[\s\S]*--lucas-psp-panel-bg:\s*#fff/s);
  assert.match(perspectiveEngine, /PERSPECTIVE_SHADOW_LOCALIZATION_CSS[\s\S]*#settings_panel[\s\S]*var\(--lucas-psp-panel-bg\)/s);
  assert.match(perspectiveEngine, /PERSPECTIVE_SHADOW_LOCALIZATION_CSS[\s\S]*#plugin_selector_container[\s\S]*border-radius:\s*8px/s);
  assert.match(perspectiveEngine, /PERSPECTIVE_SHADOW_LOCALIZATION_CSS[\s\S]*\.plugin-select-item[\s\S]*rgba\(92,\s*143,\s*186,\s*0\.1\)/s);
  assert.match(perspectiveEngine, /PERSPECTIVE_SHADOW_LOCALIZATION_CSS[\s\S]*\.column-selector-column[\s\S]*border:\s*1px solid rgba\(232,\s*230,\s*220,\s*0\.95\)/s);
  assert.match(perspectiveEngine, /PERSPECTIVE_SHADOW_LOCALIZATION_CSS[\s\S]*regular-table[\s\S]*--rt-hover--background-color:\s*rgba\(92,\s*143,\s*186,\s*0\.08\)/s);
  assert.match(perspectiveCss, /\.perspective-bi-tool perspective-viewer\s*\{[^}]*--psp-sidebar--background:\s*#fbfaf7/s);
  assert.match(perspectiveCss, /\.perspective-bi-tool perspective-viewer\s*\{[^}]*--psp-active--background:\s*rgba\(92,\s*143,\s*186,\s*0\.12\)/s);
  assert.match(perspectiveCss, /\.perspective-bi-tool \.viewer-frame\s*\{[^}]*background:\s*linear-gradient\(180deg,\s*#fff,\s*#fbfaf7\)/s);
});

test("Perspective BI workbench supports a page-level focus mode", () => {
  assert.match(perspectivePage, /id="perspective-tool-back-button"/);
  assert.match(perspectiveEngine, /function toggleWorkbenchFocus\(\)/);
  assert.match(perspectiveEngine, /workbenchFocusMode/);
  assert.match(perspectiveEngine, /workspace-focus-mode/);
  assert.match(perspectiveEngine, /document\.body\.classList\.toggle\("perspective-bi-workspace-focus",\s*state\.workbenchFocusMode\)/);
  assert.match(perspectiveCss, /\.perspective-bi-tool\.workspace-focus-mode\s+\.(model-header|data-toolbar|field-role-panel)\s*\{/);
  assert.match(perspectiveCss, /body\.perspective-bi-workspace-focus\s+#perspective-tool-back-button\s*\{/);
  assert.match(perspectiveCss, /\.perspective-bi-tool\.workspace-focus-mode\s+\.main-content\s*\{/);
  assert.match(perspectiveCss, /\.perspective-bi-tool\.workspace-focus-mode\s+\.perspective-panel\s*\{/);
  assert.match(perspectiveCss, /\.perspective-bi-tool\.workspace-focus-mode\s+\.viewer-frame\s*\{/);
});

test("Perspective BI control rows prevent toolbar and field role overlap", () => {
  assert.match(perspectiveCss, /\.perspective-bi-tool \.data-toolbar > \*\s*\{[^}]*min-width:\s*0/s);
  assert.match(perspectiveCss, /\.perspective-bi-tool \.toolbar-upload\s*\{[^}]*min-width:\s*0/s);
  assert.match(perspectiveCss, /\.perspective-bi-tool \.toolbar-upload\s*\{[^}]*grid-template-columns:\s*minmax\(220px,\s*0\.8fr\)\s*minmax\(180px,\s*0\.55fr\)/s);
  assert.match(perspectiveCss, /\.perspective-bi-tool \.button-grid\s*\{[^}]*min-width:\s*0/s);
  assert.match(perspectiveCss, /\.perspective-bi-tool \.field-role-list\s*\{[^}]*minmax\(min\(100%,\s*260px\),\s*1fr\)/s);
  assert.match(perspectiveCss, /\.perspective-bi-tool \.field-role-row\s*\{[^}]*grid-template-columns:\s*minmax\(0,\s*1fr\)\s*88px\s*88px/s);
  assert.match(perspectiveCss, /\.perspective-bi-tool \.field-role-name\s*\{[^}]*overflow-wrap:\s*anywhere/s);
  assert.doesNotMatch(perspectiveCss, /\.perspective-bi-tool \.field-role-note\s*\{/);
});

test("Perspective BI opens the native workbench without external preset configuration", () => {
  assert.match(perspectiveEngine, /function buildConfig\(rows\)[\s\S]*title:\s*"BI 工作台"[\s\S]*plugin:\s*"Datagrid"[\s\S]*group_by:\s*\[\][\s\S]*columns:\s*visibleColumns/s);
  assert.doesNotMatch(perspectiveEngine, /title:\s*"收入按区域"|title:\s*"边际按区域"|title:\s*"月份热力图"|title:\s*"明细透视表"/);
});

test("Perspective BI keeps uploaded file and field text out of HTML injection paths", () => {
  assert.doesNotMatch(perspectiveEngine, /innerHTML/);
});

test("Perspective BI swaps the viewer to a new upload before deleting the previous table", () => {
  assert.match(perspectiveEngine, /const previousTable = state\.table/);
  assert.match(perspectiveEngine, /await viewer\.load\(table\)[\s\S]*await previousTable\?\.delete\(\)/);
});

test("Perspective BI keeps month and period columns as dimensions after upload parsing", () => {
  assert.match(perspectiveEngine, /function isTimeDimensionColumn/);
  assert.match(perspectiveEngine, /function normalizeValue\(value,\s*key = ""\)/);
  assert.match(perspectiveEngine, /isTimeDimensionColumn\(key\)/);
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
  assert.match(monthlyEngine, /function initApp\(\)\s*\{\s*initSidebar\(\);\s*initResponsiveMonthAxis\(\);\s*initChartResizeObserver\(\);\s*bindControls\(\);\s*if \(state\.initialized\)/s);
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
  assert.match(monthlyEngine, /window\.XLSX\.utils\.aoa_to_sheet/);
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

test("monthly trend uses the same sales-split base table logic as margin analysis", () => {
  assert.match(monthlyEngine, /const TEMPLATE_HEADERS\s*=\s*OPERATING_DETAIL_HEADERS/);
  assert.match(monthlyEngine, /createOperatingDetailSampleRows/);
  assert.match(monthlyEngine, /function analyzeMonthlyUploadHeaders\(/);
  assert.match(monthlyEngine, /const salesIndex\s*=[\s\S]*findIndex[\s\S]*isVolumeMetricName/);
  assert.match(monthlyEngine, /const dimensionColumns\s*=[\s\S]*index < salesIndex/);
  assert.match(monthlyEngine, /const metricColumns\s*=[\s\S]*index > salesIndex/);
  assert.match(financeTemplatesSource, /OPERATING_DETAIL_TEMPLATE_NOTE[\s\S]*销量列之前[\s\S]*销量列之后/);
  assert.doesNotMatch(monthlyEngine, /const TEMPLATE_HEADERS\s*=\s*Object\.keys/);
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
