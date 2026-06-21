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
