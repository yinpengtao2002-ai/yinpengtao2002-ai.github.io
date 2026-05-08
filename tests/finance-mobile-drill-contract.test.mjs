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
const monthlyCss = await readFile(new URL("../src/app/finance/monthly-trend/tool.css", import.meta.url), "utf8");

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

test("finance tool workbench titles keep their original title rhythm", () => {
  assert.match(marginCss, /\.title-container\s*\{[^}]*padding:\s*1\.5rem 0/s);
  assert.match(marginCss, /\.title-decoration\s*\{[^}]*display:\s*flex/s);
  assert.match(marginCss, /\.sub-header\s*\{[^}]*font-size:\s*0\.9rem[\s\S]*margin-top:\s*0\.5rem[\s\S]*margin-bottom:\s*1rem/s);
  assert.match(businessCss, /\.business-tool \.model-header h1\s*\{[^}]*font-size:\s*clamp\(1\.22rem,\s*1\.45vw,\s*1\.62rem\)/s);
  assert.match(businessCss, /\.business-tool \.model-header\s*\{[^}]*margin:\s*0 auto 1\.25rem/s);
  assert.match(businessCss, /\.business-tool \.model-subtitle\s*\{[^}]*margin-top:\s*0\.65rem[\s\S]*font-size:\s*0\.95rem[\s\S]*line-height:\s*1\.7/s);
  assert.doesNotMatch(businessCss, /\.business-tool \.model-subtitle\s*\{[^}]*-webkit-line-clamp:\s*1/s);
  assert.match(sensitivityCss, /\.sensitivity-tool \.model-header h1\s*\{[^}]*font-size:\s*clamp\(1\.22rem,\s*1\.45vw,\s*1\.62rem\)/s);
  assert.match(sensitivityCss, /\.sensitivity-tool \.model-header\s*\{[^}]*margin:\s*0 auto 1\.25rem/s);
  assert.match(sensitivityCss, /\.sensitivity-tool \.model-subtitle\s*\{[^}]*margin-top:\s*0\.65rem[\s\S]*font-size:\s*0\.95rem[\s\S]*line-height:\s*1\.7/s);
  assert.doesNotMatch(sensitivityCss, /\.sensitivity-tool \.model-subtitle\s*\{[^}]*-webkit-line-clamp:\s*1/s);
  assert.match(monthlyCss, /\.monthly-trend-tool \.model-header h1\s*\{[^}]*font-size:\s*clamp\(1\.22rem,\s*1\.45vw,\s*1\.62rem\)/s);
  assert.match(monthlyCss, /\.monthly-trend-tool \.model-header\s*\{[^}]*margin-bottom:\s*1rem/s);
  assert.match(monthlyCss, /\.monthly-trend-tool \.model-subtitle\s*\{[^}]*margin-top:\s*0\.55rem[\s\S]*font-size:\s*0\.92rem[\s\S]*line-height:\s*1\.7/s);
  assert.doesNotMatch(monthlyCss, /\.monthly-trend-tool \.model-subtitle\s*\{[^}]*-webkit-line-clamp:\s*1/s);
  assert.match(marginCss, /\.main-header\s*\{[^}]*font-size:\s*1\.22rem/s);
  assert.match(monthlyCss, /\.monthly-trend-tool \.model-header h1\s*\{[^}]*font-size:\s*1\.22rem/s);
});
