import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("static Kelly module exposes the expected page containers", async () => {
  const html = await readFile(new URL("../index.html", import.meta.url), "utf8");

  assert.match(html, /id="kelly-app"/);
  assert.match(html, /id="result-grid"/);
  assert.match(html, /id="sensitivity-chart"/);
  assert.match(html, /id="chart-tooltip"/);
  assert.match(html, /id="kelly-matrix-head"/);
  assert.match(html, /id="kelly-matrix-body"/);
  assert.doesNotMatch(html, /id="ratio-inputs"/);
  assert.doesNotMatch(html, /name="input-mode"/);
  assert.doesNotMatch(html, /当前解读/);
  assert.doesNotMatch(html, /risk-note/);
  assert.match(html, /href="\.\/src\/styles\.css\?v=\d+"/);
  assert.match(html, /src="\.\/src\/kelly-module\.js\?v=\d+"/);
  assert.match(html, /window\.MathJax/);
  assert.match(html, /tex-chtml\.js/);
  assert.match(html, /id="probability-slider"/);
  assert.match(html, /id="custom-fraction-slider"/);
  assert.match(html, /id="range-slider"/);
  assert.match(html, /id="step-slider"/);
  assert.match(html, /id="range-slider"[^>]+value="15"/);
  assert.match(html, /id="step-slider"[^>]+value="5"/);
  assert.match(html, /class="field range-field adjustment-field"/);
  assert.doesNotMatch(html, /id="probability-input"/);
  assert.doesNotMatch(html, /id="range-input"/);
  assert.ok(
    html.indexOf("table-panel") < html.indexOf("chart-panel"),
    "Kelly leverage matrix should appear above the sensitivity chart",
  );
});

test("Kelly UI script wires the reusable calculator and rendering helpers", async () => {
  const script = await readFile(new URL("../src/kelly-module.js", import.meta.url), "utf8");

  assert.match(script, /calculateKellyMetrics/);
  assert.match(script, /buildKellyLeverageMatrix/);
  assert.match(script, /buildProbabilitySensitivity/);
  assert.match(script, /renderSensitivityChart/);
  assert.match(script, /renderKellyMatrix/);
  assert.match(script, /renderChartTooltip/);
  assert.match(script, /handleInputChange/);
  assert.match(script, /from "\.\/lib\/kelly\.js\?v=\d+"/);
  assert.match(
    script,
    /const resultOrder = \[\s*"win",\s*"loss",\s*"riskRewardRatio",\s*"expectedValue",\s*"breakevenProbability",\s*\];/,
  );
  assert.doesNotMatch(script, /"full",\s*"half",\s*"third",\s*"quarter",\s*"custom"/);
});

test("Kelly UI keeps range controls and current matrix row visually prominent", async () => {
  const css = await readFile(new URL("../src/styles.css", import.meta.url), "utf8");

  assert.match(css, /\.adjustment-field\s*\{/);
  assert.match(css, /\.adjustment-head/);
  assert.match(css, /\.slider::-webkit-slider-thumb\s*\{[\s\S]*background:\s*var\(--bg-card\)/);
  assert.match(css, /\.current-row\s*\{[\s\S]*box-shadow:\s*inset 4px 0 0 var\(--accent-blue\)/);
  assert.match(css, /\.current-row th,\s*\.current-row td\s*\{[\s\S]*font-weight:\s*900/);

  const mediumBreakpointStart = css.indexOf("@media (max-width: 1180px)");
  const mobileBreakpointStart = css.indexOf("@media (max-width: 860px)");
  const mediumBreakpointCss = css.slice(mediumBreakpointStart, mobileBreakpointStart);
  assert.match(mediumBreakpointCss, /\.kelly-matrix\s*\{[\s\S]*table-layout:\s*fixed/);
});

test("page includes a collapsible proof for old and new Kelly formulas", async () => {
  const html = await readFile(new URL("../index.html", import.meta.url), "utf8");
  const css = await readFile(new URL("../src/styles.css", import.meta.url), "utf8");

  assert.match(html, /<details class="panel formula-proof"/);
  assert.match(html, /<div class="formula-body">/);
  assert.match(html, /<h3>旧公式：赔率版凯利<\/h3>/);
  assert.match(html, /<h3>新公式：收益幅度版凯利<\/h3>/);
  assert.match(html, /\\begin\{aligned\}/);
  assert.match(html, /\\ln\\left\(1 \+ f b\\right\)/);
  assert.match(html, /\\frac\{p\}\{r_\{\\text\{loss\}\}\} - \\frac\{q\}\{r_\{\\text\{win\}\}\}/);
  assert.match(html, /旧公式是新公式在 \\\(r_\{\\text\{loss\}\} = 1\\\)、\\\(r_\{\\text\{win\}\} = b\\\) 时的特殊情况/);
  assert.doesNotMatch(html, /p win/);
  assert.match(html, /\\boxed\{/);
  assert.doesNotMatch(html, /```text/);
  assert.doesNotMatch(html, /markdown-source/);
  assert.doesNotMatch(html, /latex-source/);
  assert.match(css, /\.formula-proof\s*\{/);
  assert.match(css, /\.formula-body\s*\{/);
  assert.match(css, /\.formula-body mjx-container\[display="true"\]/);
});
