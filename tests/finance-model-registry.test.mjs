import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const registry = JSON.parse(
  await readFile(new URL("../src/lib/finance/model-registry.json", import.meta.url), "utf8")
);

function assertCssRuleHas(css, selector, declarations) {
  const escapedSelector = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = css.match(new RegExp(`(^|\\n)\\s*${escapedSelector}\\s*\\{([^}]*)\\}`));
  assert.ok(match, `${selector} rule should exist`);
  for (const declaration of declarations) {
    assert.match(match[2], new RegExp(declaration.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
}

test("finance registry contains the approved categories in order", () => {
  assert.deepEqual(
    registry.categories.map((category) => category.id),
    ["budget-review", "trend-monitoring", "profit-simulation", "unit-attribution"]
  );
});

test("finance registry contains the complete LucasNewAttempt model routes", () => {
  assert.deepEqual(
    registry.models.map((model) => model.slug).sort(),
    [
      "business-analysis",
      "fx-exposure",
      "margin-analysis",
      "monthly-trend",
      "price-volume-mix",
      "sensitivity-analysis",
      "working-capital",
    ]
  );
  for (const model of registry.models) {
    assert.match(model.href, /^\/finance\/[a-z-]+$/);
    assert.equal(typeof model.summary, "string");
    assert.ok(model.summary.length >= 18, `${model.slug} summary should be visitor-facing`);
    assert.ok(Array.isArray(model.aiGuide.steps), `${model.slug} needs AI guide steps`);
    assert.ok(model.aiGuide.steps.length >= 3, `${model.slug} needs at least three usage steps`);
  }
});

test("new LucasNewAttempt finance models have usable route shells", async () => {
  const { access, readFile } = await import("node:fs/promises");
  const newModelSlugs = ["price-volume-mix", "fx-exposure", "working-capital"];
  const workbench = await readFile(
    new URL("../src/components/finance/ScenarioModelTool.tsx", import.meta.url),
    "utf8"
  );
  const definitions = await readFile(
    new URL("../src/lib/finance/scenarioModels.ts", import.meta.url),
    "utf8"
  );

  assert.match(workbench, /ScenarioModelTool/);
  assert.match(workbench, /scenario-model-console/);
  assert.match(workbench, /scenario-preset-grid/);
  assert.match(workbench, /scenario-operations-ribbon/);
  assert.match(workbench, /scenario-model-bridge/);
  assert.match(workbench, /scenario-waterfall-chart/);
  assert.match(workbench, /scenario-comparison-table/);
  assert.match(workbench, /scenario-assumption-matrix/);
  assert.match(workbench, /scenario-sensitivity-grid/);
  assert.match(workbench, /scenario-timeline/);
  assert.match(workbench, /scenario-model-insight/);
  assert.match(definitions, /scenarioPresets/);
  assert.match(definitions, /assumptions/);
  assert.match(definitions, /sensitivity/);
  assert.match(definitions, /comparisonRows/);
  assert.match(definitions, /timeline/);

  for (const slug of newModelSlugs) {
    const model = registry.models.find((item) => item.slug === slug);
    assert.ok(model, `${slug} should be registered`);
    assert.ok(model.summary.length >= 24, `${slug} should have a visitor-facing summary`);
    assert.ok(model.aiGuide.scenarios.length >= 3, `${slug} should list real scenarios`);
    assert.match(definitions, new RegExp(`slug:\\s*"${slug}"`));
    assert.match(definitions, new RegExp(`slug:\\s*"${slug}"[\\s\\S]*scenarioPresets:\\s*\\[[\\s\\S]*label:`));
    assert.match(definitions, new RegExp(`slug:\\s*"${slug}"[\\s\\S]*assumptions:\\s*\\[[\\s\\S]*owner:`));
    assert.match(definitions, new RegExp(`slug:\\s*"${slug}"[\\s\\S]*sensitivity:\\s*\\[[\\s\\S]*high:`));

    await access(new URL(`../src/app/finance/${slug}/page.tsx`, import.meta.url));
    await access(new URL(`../src/app/finance/${slug}/layout.tsx`, import.meta.url));
    const page = await readFile(
      new URL(`../src/app/finance/${slug}/page.tsx`, import.meta.url),
      "utf8"
    );
    assert.match(page, /ToolBackButton/);
    assert.match(page, /ScenarioModelTool/);
    assert.match(page, /ProjectDescription/);
    assert.match(page, /<noscript>/);
  }
});

test("finance registry maps every model to an existing category", () => {
  const categories = new Set(registry.categories.map((category) => category.id));
  for (const model of registry.models) {
    assert.ok(categories.has(model.categoryId), `${model.slug} has unknown category ${model.categoryId}`);
  }
});

test("finance models include chart-stacked preview assets", async () => {
  const { access } = await import("node:fs/promises");

  for (const model of registry.models) {
    assert.match(
      model.previewImage,
      /^\/images\/product-stage\/[a-z-]+\.png$/,
      `${model.slug} needs a product-stage preview image`
    );
    assert.equal(typeof model.previewAlt, "string", `${model.slug} needs preview alt text`);
    assert.ok(model.previewAlt.length >= 12, `${model.slug} preview alt text should be descriptive`);

    const assetPath = new URL(`../public${model.previewImage}`, import.meta.url);
    await access(assetPath);
  }
});

test("finance model library renders the preview component", async () => {
  const library = await readFile(
    new URL("../src/components/finance/FinanceModelLibrary.tsx", import.meta.url),
    "utf8"
  );
  const preview = await readFile(
    new URL("../src/components/finance/FinanceModelPreview.tsx", import.meta.url),
    "utf8"
  );
  const productStage = await readFile(
    new URL("../src/components/home/ProductStageVisual.tsx", import.meta.url),
    "utf8"
  );
  const globals = await readFile(new URL("../src/app/globals.css", import.meta.url), "utf8");

  assert.match(library, /FinanceModelPreview/);
  assert.match(library, /previewImage/);
  assert.match(library, /previewAlt/);
  assert.match(preview, /draggable=\{false\}/);
  assert.match(productStage, /draggable=\{false\}/);
  assertCssRuleHas(globals, ".finance-model-preview-image", [
    "pointer-events: none",
    "user-select: none",
    "-webkit-user-drag: none",
  ]);
  assertCssRuleHas(globals, ".product-stage-image", [
    "pointer-events: none",
    "user-select: none",
    "-webkit-user-drag: none",
  ]);
});

test("finance model library uses a compact mobile list layout", async () => {
  const library = await readFile(
    new URL("../src/components/finance/FinanceModelLibrary.tsx", import.meta.url),
    "utf8"
  );
  const globals = await readFile(new URL("../src/app/globals.css", import.meta.url), "utf8");

  assert.match(library, /finance-model-card-link/);
  assert.match(library, /finance-model-card-category/);
  assert.match(library, /finance-model-card-title/);
  assert.match(library, /finance-model-card-summary/);
  assert.match(library, /finance-model-card-action/);
  assert.match(globals, /@media\s*\(max-width:\s*768px\)[\s\S]*\.finance-model-library-grid\.compact\s*\{[\s\S]*grid-template-columns:\s*1fr/s);
  assert.match(globals, /@media\s*\(max-width:\s*768px\)[\s\S]*\.finance-model-card\s*\{[\s\S]*display:\s*grid[\s\S]*grid-template-columns:\s*96px minmax\(0,\s*1fr\)/s);
  assert.match(globals, /@media\s*\(max-width:\s*768px\)[\s\S]*\.finance-model-card \.finance-model-preview\.compact\s*\{[\s\S]*aspect-ratio:\s*1\.28/s);
  assert.match(globals, /@media\s*\(max-width:\s*768px\)[\s\S]*\.finance-model-card-summary\s*\{[\s\S]*-webkit-line-clamp:\s*1/s);
});

test("finance model library keeps filtered cards aligned with the all-model grid", async () => {
  const library = await readFile(
    new URL("../src/components/finance/FinanceModelLibrary.tsx", import.meta.url),
    "utf8"
  );
  const globals = await readFile(new URL("../src/app/globals.css", import.meta.url), "utf8");

  assert.match(library, /finance-model-library-grid/);
  assert.match(library, /isFiltered/);
  assert.match(globals, /\.finance-model-library-grid\.filtered/);
  assert.match(globals, /\.finance-model-library-grid\.filtered\s*\{[^}]*grid-template-columns:\s*repeat\(auto-fill,\s*minmax\(260px,\s*1fr\)\)/s);
  assert.match(globals, /\.finance-model-library-grid\.compact\.filtered\s*\{[^}]*grid-template-columns:\s*repeat\(auto-fill,\s*minmax\(220px,\s*1fr\)\)/s);
  assert.doesNotMatch(globals, /min\(360px,\s*100%\)/);
  assert.doesNotMatch(globals, /minmax\(240px,\s*320px\)/);
});

test("finance index page keeps the model library high and readable", async () => {
  const page = await readFile(
    new URL("../src/app/finance/page.tsx", import.meta.url),
    "utf8"
  );
  const globals = await readFile(new URL("../src/app/globals.css", import.meta.url), "utf8");

  assert.match(page, /finance-index-page/);
  assert.match(page, /finance-index-shell/);
  assert.match(page, /finance-index-hero-card/);
  assert.match(page, /home-finance-title-card finance-index-hero-card/);
  assert.match(page, /className="home-finance-title"/);
  assert.match(page, /finance-index-intro/);
  assert.match(page, /问题驱动的财务模型/);
  assert.match(page, /从复盘、归因、趋势、收入桥、汇率到现金占用，按真实经营问题选择模型。/);
  assert.doesNotMatch(page, /目前共有 \{financeModels\.length\} 个模型/);
  assert.doesNotMatch(page, /Finance Model Library/);
  assert.doesNotMatch(page, /MODEL LIBRARY/);
  assert.doesNotMatch(page, /Finance Models/);
  assert.doesNotMatch(page, /按经营问题进入模型/);
  assert.doesNotMatch(page, /style=\{\{/);
  assert.match(globals, /\.finance-index-page\s*\{/);
  assert.match(globals, /\.finance-index-hero-card\s*\{/);
  assert.doesNotMatch(globals, /\.finance-index-hero-card::before/);
  assert.doesNotMatch(globals, /\.finance-index-hero-card::after/);
  assert.doesNotMatch(globals, /\.finance-index-title-meta\s*\{/);
  assert.doesNotMatch(globals, /\.finance-index-title-copy\s*\{/);
  assert.doesNotMatch(globals, /\.finance-index-title\s*\{/);
  assert.match(globals, /\.home-finance-title\s*\{[^}]*font-family:\s*var\(--font-hero-display\)/s);
  assert.match(globals, /\.finance-index-intro\s*\{/);
  assert.match(globals, /color-mix\(in srgb,\s*var\(--foreground\)\s*62%,\s*var\(--muted\)\)/);
});
