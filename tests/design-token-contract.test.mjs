import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

async function readProjectFile(path) {
  return readFile(new URL(`../${path}`, import.meta.url), "utf8");
}

test("private Lucas and chart candidate modules stay within the site accent palette", async () => {
  const checkedFiles = [
    "src/app/Lucas/Lucas.module.css",
    "src/app/finance/chart-candidates-demo/ChartCandidatesDemo.module.css",
    "src/app/finance/chart-candidates-demo/ChartCandidatesDemo.tsx",
  ];
  const offPaletteBlues = ["#2f76b7", "#315f85", "#174d7a"];

  for (const path of checkedFiles) {
    const source = await readProjectFile(path);
    for (const color of offPaletteBlues) {
      assert.doesNotMatch(source.toLowerCase(), new RegExp(color), `${path} should not use off-palette cold blue ${color}`);
    }
  }

  const lucasStyles = await readProjectFile("src/app/Lucas/Lucas.module.css");
  assert.match(lucasStyles, /border-color:\s*var\(--accent\)/);
  assert.match(lucasStyles, /color-mix\(in srgb,\s*var\(--accent-secondary\)/);

  const chartStyles = await readProjectFile("src/app/finance/chart-candidates-demo/ChartCandidatesDemo.module.css");
  assert.match(chartStyles, /\.paretoLine\s*\{[\s\S]*stroke:\s*color-mix\(in srgb,\s*var\(--accent-secondary\)/);
  assert.match(chartStyles, /\.paretoDot\s*\{[\s\S]*fill:\s*color-mix\(in srgb,\s*var\(--accent-secondary\)/);

  const chartDemo = await readProjectFile("src/app/finance/chart-candidates-demo/ChartCandidatesDemo.tsx");
  assert.match(chartDemo, /const financeBlue = "color-mix\(in srgb, var\(--accent-secondary\)/);
});

test("shared finance tool back button uses site tokens instead of hardcoded colors", async () => {
  const button = await readProjectFile("src/components/finance/ToolBackButton.tsx");
  const globals = await readProjectFile("src/app/globals.css");

  assert.match(button, /finance-tool-back-button/);
  assert.match(button, /finance-tool-back-icon/);
  assert.doesNotMatch(button, /#[0-9a-fA-F]{3,8}/);
  assert.doesNotMatch(button, /(?:border|bg|text|ring|shadow)-\[#/);
  assert.doesNotMatch(button, /rgba\(/);

  const styleBlock = globals.match(/\.finance-tool-back-button\s*\{[\s\S]*?\n\}/)?.[0] ?? "";
  const iconBlock = globals.match(/\.finance-tool-back-icon\s*\{[\s\S]*?\n\}/)?.[0] ?? "";

  assert.match(styleBlock, /var\(--border\)/);
  assert.match(styleBlock, /var\(--card\)/);
  assert.match(styleBlock, /var\(--foreground\)/);
  assert.match(styleBlock, /var\(--accent\)/);
  assert.match(iconBlock, /var\(--accent\)/);
});
