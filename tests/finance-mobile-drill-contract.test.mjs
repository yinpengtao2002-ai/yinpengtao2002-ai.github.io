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
  const templateRowsMatch = perspectiveEngine.match(/const TEMPLATE_ROWS = \[([\s\S]*?)\];/);
  assert.ok(templateRowsMatch, "template rows should be declared");
  assert.doesNotMatch(templateRowsMatch[1], /单车净收入|单车边际|预算达成率/);
  assert.match(templateRowsMatch[1], /销量/);
  assert.match(templateRowsMatch[1], /净收入/);
  assert.match(templateRowsMatch[1], /边际总额/);
  assert.doesNotMatch(perspectiveEngine, /const DERIVED_METRICS/);
  assert.doesNotMatch(perspectiveEngine, /function enrichDerivedMetrics\(rows\)/);
  assert.doesNotMatch(perspectiveEngine, /function isDerivedMetric\(column\)/);
  assert.match(perspectiveEngine, /const normalizedRows = normalizeRows\(rows\)/);
  assert.doesNotMatch(perspectiveEngine, /enrichDerivedMetrics\(normalizeRows\(rows\)\)/);
  assert.doesNotMatch(perspectiveEngine, /预算达成率/);
  assert.doesNotMatch(perspectivePage, /单车质量/);
});

test("Perspective BI adds calculated metrics as native workbench expression fields", () => {
  assert.match(perspectiveTool, /id="perspective-calculated-metric-toggle"/);
  assert.match(perspectiveTool, /id="perspective-calculated-metric-panel"/);
  assert.match(perspectiveTool, /id="perspective-calculated-metric-name"/);
  assert.match(perspectiveTool, /id="perspective-calculated-formula"/);
  assert.match(perspectiveTool, /id="perspective-calculated-metric-type"/);
  assert.match(perspectiveTool, /id="perspective-calculated-metric-status"/);
  assert.match(perspectiveTool, /作为字段加入下方 Perspective 工作台/);
  assert.match(perspectiveEngine, /function renderCalculatedMetricControls\(rows\)/);
  assert.match(perspectiveEngine, /function buildCalculatedExpressions\(\)/);
  assert.match(perspectiveEngine, /function toPerspectiveExpressionFormula\(formula\)/);
  assert.match(perspectiveEngine, /function inferCalculatedMetricAggregate\(\)/);
  assert.match(perspectiveEngine, /expressions:\s*buildCalculatedExpressions\(\)/);
  assert.match(perspectiveEngine, /\["weighted mean",\s*\[denominator\]\]/);
  assert.match(perspectiveEngine, /function getAnalysisRows\(rows\)[\s\S]*activeColumns/s);
  assert.doesNotMatch(perspectiveEngine, /getAnalysisRows\(rows\)[\s\S]*calculatedValue/s);
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
  assert.match(perspectiveEngine, /state\.calculatedMetric\.type === "additive"[\s\S]*return "sum"/);
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
  assert.match(monthlyEngine, /function initApp\(\)\s*\{\s*initSidebar\(\);\s*initResponsiveMonthAxis\(\);\s*bindControls\(\);\s*if \(state\.initialized\)/s);
  assert.doesNotMatch(monthlyEngine, /if \(state\.initialized\)\s*\{[\s\S]*?return;\s*\}[\s\S]*?bindControls\(\);/s);
});

test("monthly trend uses uploaded dimensions directly as filter cards", () => {
  assert.doesNotMatch(monthlyTool, /monthly-filter-summary|monthly-dimension-picker/);
  assert.doesNotMatch(monthlyEngine, /function renderFilterSummary\(\)/);
  assert.doesNotMatch(monthlyEngine, /check-pill/);
  assert.match(monthlyEngine, /excel-filter-shell/);
  assert.match(monthlyEngine, /function renderExcelFilterMenu\(/);
  assert.match(monthlyCss, /\.monthly-trend-tool \.excel-filter-trigger\s*\{/);
  assert.match(monthlyCss, /\.monthly-trend-tool \.excel-filter-footer-actions\s*\{/);
  assert.doesNotMatch(monthlyCss, /\.monthly-trend-tool \.(filter-summary|dimension-picker|check-pill)\b/);
});

test("monthly trend narrows filter candidates by the other active dimensions", () => {
  assert.match(monthlyEngine, /function candidateRowsForDimension\(dimension\)\s*\{[\s\S]*Object\.entries\(state\.filters\)[\s\S]*filterDimension !== dimension/s);
  assert.match(monthlyEngine, /function distinctDimensionValues\(dimension\)\s*\{[\s\S]*candidateRowsForDimension\(dimension\)/s);
  assert.match(monthlyEngine, /function pruneLinkedFilters\(changedDimension\)\s*\{[\s\S]*const changedIndex[\s\S]*index <= changedIndex[\s\S]*distinctDimensionValues\(dimension\)[\s\S]*delete state\.filters\[dimension\]/s);
  assert.match(monthlyEngine, /function applyExcelFilterSelection\(dimension,[\s\S]*pruneLinkedFilters\(dimension\)/s);
});

test("monthly trend keeps the base table schema business-facing", () => {
  assert.doesNotMatch(monthlyTool, /monthly-btn-demo|monthly-btn-export|monthly-month-column/);
  assert.doesNotMatch(monthlyEngine, /monthly-btn-demo|monthly-btn-export|function exportSummary/);
  assert.doesNotMatch(monthlyTool, /monthly-data-guide|数据底表说明|月份列不许动|销量是分母口径/);
  assert.match(monthlyEngine, /const TEMPLATE_HEADER_NOTE\s*=/);
  assert.match(monthlyEngine, /月份列不许动/);
  assert.match(monthlyEngine, /销量是分母口径/);
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
  assert.match(monthlyEngine, /const TEMPLATE_HEADERS\s*=\s*\[\s*"月份",\s*"大区",\s*"国家",\s*"车型",\s*"燃油品类",\s*"品牌",\s*"销量",\s*"净收入",\s*"成本",\s*"边际"\s*\]/);
  assert.match(monthlyEngine, /function analyzeMonthlyUploadHeaders\(/);
  assert.match(monthlyEngine, /const salesIndex\s*=[\s\S]*findIndex[\s\S]*isVolumeMetricName/);
  assert.match(monthlyEngine, /const dimensionColumns\s*=[\s\S]*index < salesIndex/);
  assert.match(monthlyEngine, /const metricColumns\s*=[\s\S]*index > salesIndex/);
  assert.match(monthlyEngine, /TEMPLATE_HEADER_NOTE[\s\S]*销量列之前[\s\S]*销量列之后/);
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
