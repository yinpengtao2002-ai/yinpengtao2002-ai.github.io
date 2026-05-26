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
  assert.match(perspectiveTool, /id="perspective-btn-demo"/);
  assert.match(perspectiveTool, /id="perspective-btn-csv-template"/);
  assert.match(perspectiveTool, /id="perspective-btn-xlsx-template"/);
  assert.match(perspectiveTool, /createElement\("perspective-viewer"/);
  assert.match(perspectiveEngine, /@perspective-dev\/client/);
  assert.match(perspectiveEngine, /@perspective-dev\/viewer-datagrid/);
  assert.match(perspectiveEngine, /@perspective-dev\/viewer-d3fc/);
  assert.match(perspectiveEngine, /viewer\.load\(table\)/);
  assert.match(perspectiveEngine, /viewer\.restore/);
  assert.match(perspectiveEngine, /XLSX\.read/);
  assert.match(perspectiveCss, /\.perspective-bi-tool \.sidebar\s*\{/);
  assert.match(perspectiveCss, /\.perspective-bi-tool \.sidebar-backdrop\.visible\s*\{/);
  assert.match(perspectiveCss, /@media\s*\(max-width:\s*860px\)/);
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
  assert.match(monthlyEngine, /class="field filter-card"/);
  assert.match(monthlyCss, /\.monthly-trend-tool \.filter-card\s*\{/);
  assert.doesNotMatch(monthlyCss, /\.monthly-trend-tool \.(filter-summary|dimension-picker|check-pill)\b/);
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
