import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const tool = await readFile(
  new URL("../src/app/finance/business-analysis/BusinessAnalysisTool.tsx", import.meta.url),
  "utf8"
);
const engine = await readFile(
  new URL("../src/app/finance/business-analysis/business-analysis-engine.js", import.meta.url),
  "utf8"
);
const css = await readFile(
  new URL("../src/app/finance/business-analysis/tool.css", import.meta.url),
  "utf8"
);

test("business analysis dimension drill UI uses a path rail with Excel-style current-layer filtering", () => {
  assert.match(tool, /data-ranking-drill-path/);
  assert.match(tool, /ranking-current-filter-trigger/);
  assert.match(tool, /ranking-current-filter-menu/);
  assert.match(tool, /sidebar-dimension-stack/);
  assert.match(tool, /sidebar-dimension-train/);
  assert.match(tool, /data-current-layer-filter="sidebar"/);
  assert.doesNotMatch(tool, /dimension-order-disclosure/);
  assert.doesNotMatch(tool, /<summary>调整顺序<\/summary>/);
  assert.doesNotMatch(tool, /id="btn-sidebar-ranking-clear"/);
  assert.doesNotMatch(tool, /id="btn-sidebar-ranking-reset"/);
  assert.doesNotMatch(tool, /进入当前维度/);
  assert.doesNotMatch(tool, /id="drill-path"/);

  assert.match(engine, /function renderRankingPathControls\(/);
  assert.match(engine, /function renderCurrentLayerFilter\(/);
  assert.match(engine, /function currentLayerFilterInstanceKey\(/);
  assert.match(engine, /function applyCurrentLayerFilterSelection\(/);
  assert.match(engine, /data-filter-action="invert"/);
  assert.match(engine, /data-filter-action="apply"/);
  assert.match(engine, /function clearAllDimensionFilters\(/);

  assert.match(css, /\.business-tool \.drill-path-rail/);
  assert.match(css, /\.business-tool \.business-excel-filter-menu/);
  assert.match(css, /\.business-tool \.sidebar-details/);
  assert.match(css, /\.business-tool \.sidebar-dimension-stack/);
  assert.match(css, /\.business-tool \.sidebar-layer-filter/);
  assert.doesNotMatch(css, /\.business-tool \.sidebar-filter-actions/);
  assert.doesNotMatch(css, /\.business-tool \.dimension-order-disclosure/);
});
