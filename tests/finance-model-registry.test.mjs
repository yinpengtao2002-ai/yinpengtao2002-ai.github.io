import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const registry = JSON.parse(
  await readFile(new URL("../src/lib/finance/model-registry.json", import.meta.url), "utf8")
);

test("finance registry contains the approved categories in order", () => {
  assert.deepEqual(
    registry.categories.map((category) => category.id),
    ["budget-review", "trend-monitoring", "profit-simulation", "unit-attribution"]
  );
});

test("finance registry contains the four existing model routes", () => {
  assert.deepEqual(
    registry.models.map((model) => model.slug).sort(),
    ["business-analysis", "margin-analysis", "monthly-trend", "sensitivity-analysis"]
  );
  for (const model of registry.models) {
    assert.match(model.href, /^\/finance\/[a-z-]+$/);
    assert.equal(typeof model.summary, "string");
    assert.ok(model.summary.length >= 18, `${model.slug} summary should be visitor-facing`);
    assert.ok(Array.isArray(model.aiGuide.steps), `${model.slug} needs AI guide steps`);
    assert.ok(model.aiGuide.steps.length >= 3, `${model.slug} needs at least three usage steps`);
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

  assert.match(library, /FinanceModelPreview/);
  assert.match(library, /previewImage/);
  assert.match(library, /previewAlt/);
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
  assert.match(page, /finance-index-intro/);
  assert.doesNotMatch(page, /style=\{\{/);
  assert.match(globals, /\.finance-index-page\s*\{/);
  assert.match(globals, /padding:\s*clamp\(4\.4rem,\s*7vh,\s*5\.2rem\)\s*0\s*2rem/);
  assert.match(globals, /\.finance-index-intro\s*\{/);
  assert.match(globals, /color-mix\(in srgb,\s*var\(--foreground\)\s*62%,\s*var\(--muted\)\)/);
});
