import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";

const root = path.resolve(new URL("..", import.meta.url).pathname);

test("Plotly alternatives summarize ranked and heatmap data without losing table rows", async () => {
  const { buildPlotlyAccessibleData } = await import("../src/lib/finance/chart-accessibility.ts");

  const ranked = buildPlotlyAccessibleData([
    { name: "实际", x: [12, -3, 8], y: ["中国", "德国", "法国"], orientation: "h" },
  ], { title: "国家边际" });
  assert.deepEqual(ranked.columns, ["系列", "项目", "数值"]);
  assert.deepEqual(ranked.rows[0], ["实际", "中国", 12]);
  assert.match(ranked.summary, /最高为实际 · 中国 12/);
  assert.match(ranked.summary, /最低为实际 · 德国 -3/);

  const waterfall = buildPlotlyAccessibleData([
    { type: "waterfall", name: "利润桥", x: ["预算利润", "销量影响", "实际利润"], y: [100, 12, 112], text: ["100 亿元", "+12 亿元", "112 亿元"] },
  ], { title: "利润桥" });
  assert.deepEqual(waterfall.rows[0], ["利润桥", "预算利润", 100]);
  assert.match(waterfall.summary, /最高为利润桥 · 实际利润 112/);

  const monthly = buildPlotlyAccessibleData([
    { type: "scatter", mode: "lines+markers", name: "边际", x: [0, 1], y: [4.1, 4.3], customdata: ["2026年1月", "2026年2月"] },
  ], { title: "月度趋势" });
  assert.deepEqual(monthly.rows[1], ["边际", "2026年2月", 4.3]);

  const heatmap = buildPlotlyAccessibleData([
    { type: "heatmap", name: "同比", x: [0, 1], y: ["中国", "德国"], z: [[0.1, 0.2], [-0.1, 0.05]], customdata: [["2026年1月", "2026年2月"], ["2026年1月", "2026年2月"]] },
  ], { title: "同比热力图" });
  assert.deepEqual(heatmap.columns, ["系列", "行", "列", "数值"]);
  assert.deepEqual(heatmap.rows.at(-1), ["同比", "德国", "2026年2月", 0.05]);
  assert.equal(heatmap.totalRowCount, 4);

  const driverMatrix = buildPlotlyAccessibleData([
    {
      type: "heatmap",
      x: [0, 1],
      y: [0, 1],
      z: [[120, 130], [140, 150]],
      customdata: [
        [["销量 -10%", "单车收入 -10%", "120 亿元"], ["销量 +10%", "单车收入 -10%", "130 亿元"]],
        [["销量 -10%", "单车收入 +10%", "140 亿元"], ["销量 +10%", "单车收入 +10%", "150 亿元"]],
      ],
    },
  ], { title: "双变量影响矩阵" });
  assert.deepEqual(driverMatrix.rows.at(-1), ["系列 1", "单车收入 +10%", "销量 +10%", 150]);
  assert.match(driverMatrix.summary, /单车收入 \+10% · 销量 \+10% 150/);
});

test("all key finance Plotly engines publish synchronized summaries and data tables", async () => {
  const enginePaths = [
    "src/app/finance/business-analysis/business-analysis-engine.js",
    "src/app/finance/monthly-trend/monthly-trend-engine.js",
    "src/app/finance/profit-structure/profit-structure-engine.js",
    "src/app/finance/sensitivity-analysis/sensitivity-engine.js",
  ];

  for (const relativePath of enginePaths) {
    const source = await readFile(path.join(root, relativePath), "utf8");
    assert.match(source, /renderPlotlyAccessibleData/);
    assert.match(source, /renderAccessiblePlot/);
  }

  const financeAI = await readFile(path.join(root, "src/app/tools/finance-ai-assistant/FinanceAIAssistantTool.tsx"), "utf8");
  assert.match(financeAI, /buildPlotlyAccessibleData/);
  assert.match(financeAI, /finance-chart-accessibility/);
  assert.match(financeAI, /aria-describedby=/);

  const margin = await readFile(path.join(root, "public/tools/margin-analysis/app.js"), "utf8");
  assert.match(margin, /waterfall-chart-summary-/);
  assert.match(margin, /aria-describedby/);
  assert.match(margin, /buildWaterfallAccessibleSummary/);
});
