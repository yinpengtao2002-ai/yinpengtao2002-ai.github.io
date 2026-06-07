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

test("finance registry is a direct model list without category metadata", () => {
  assert.equal("categories" in registry, false);
  for (const model of registry.models) {
    assert.equal("categoryId" in model, false, `${model.slug} should not carry category metadata`);
  }
});

test("finance registry contains the approved model routes", () => {
  assert.deepEqual(
    registry.models.map((model) => model.slug).sort(),
    ["business-analysis", "finance-ai-assistant", "margin-analysis", "monthly-trend", "perspective-bi", "profit-structure", "sensitivity-analysis"]
  );
  for (const model of registry.models) {
    assert.match(model.href, /^\/finance\/[a-z-]+$/);
    assert.equal(typeof model.summary, "string");
    assert.ok(model.summary.length >= 18, `${model.slug} summary should be visitor-facing`);
    assert.ok(Array.isArray(model.aiGuide.steps), `${model.slug} needs AI guide steps`);
    assert.ok(model.aiGuide.steps.length >= 3, `${model.slug} needs at least three usage steps`);
  }
});

test("finance AI assistant is registered as a finance model with its own assistant visual", () => {
  const model = registry.models.find((item) => item.slug === "finance-ai-assistant");

  assert.ok(model, "finance-ai-assistant should be present in the finance model registry");
  assert.equal(model.href, "/finance/finance-ai-assistant");
  assert.equal(model.title, "财务分析 AI 助手");
  assert.match(model.summary, /聊天|图表|经营明细/);
  assert.equal(model.previewImage, "/images/product-stage/finance-ai-assistant-preview.png");
  assert.match(model.previewAlt, /卡通 AI 助手/);
  assert.match(model.aiGuide.purpose, /上传经营明细/);
  assert.ok(model.aiGuide.steps.some((step) => /上传/.test(step)));
  assert.ok(model.aiGuide.steps.some((step) => /提问|聊天/.test(step)));
  assert.ok(model.aiGuide.fields.some((field) => /月份|销量|指标|维度/.test(field.name)));
});

test("Perspective BI is registered as a user-operable finance model", () => {
  const model = registry.models.find((item) => item.slug === "perspective-bi");

  assert.ok(model, "perspective-bi should be present in the finance model registry");
  assert.equal(model.href, "/finance/perspective-bi");
  assert.match(model.title, /BI/);
  assert.match(model.summary, /上传/);
  assert.match(model.summary, /透视|看板|分析/);
  assert.ok(model.aiGuide.fields.some((field) => /维度|指标/.test(field.name)));
  assert.ok(model.aiGuide.steps.some((step) => /上传|示例数据/.test(step)));
  assert.doesNotMatch(model.aiGuide.sampleData, /预算达成率/);
  assert.ok(model.aiGuide.fields.some((field) => /派生指标/.test(field.name)));
});

test("finance registry preserves model order as the only browsing structure", () => {
  assert.deepEqual(
    registry.models.map((model) => model.slug),
    ["business-analysis", "monthly-trend", "profit-structure", "sensitivity-analysis", "margin-analysis", "perspective-bi", "finance-ai-assistant"]
  );
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
  assert.doesNotMatch(library, /finance-model-card-category/);
  assert.match(library, /finance-model-card-title/);
  assert.match(library, /finance-model-card-summary/);
  assert.match(library, /finance-model-card-action/);
  assert.match(globals, /@media\s*\(max-width:\s*768px\)[\s\S]*\.finance-model-library-grid\.compact\s*\{[\s\S]*grid-template-columns:\s*1fr/s);
  assert.match(globals, /@media\s*\(max-width:\s*768px\)[\s\S]*\.finance-model-card\s*\{[\s\S]*display:\s*grid[\s\S]*grid-template-columns:\s*96px minmax\(0,\s*1fr\)/s);
  assert.match(globals, /@media\s*\(max-width:\s*768px\)[\s\S]*\.finance-model-card \.finance-model-preview\.compact\s*\{[\s\S]*aspect-ratio:\s*1\.28/s);
  assert.match(globals, /@media\s*\(max-width:\s*768px\)[\s\S]*\.finance-model-card-summary\s*\{[\s\S]*-webkit-line-clamp:\s*1/s);
});

test("finance model library presents models as one focused library without category filters", async () => {
  const library = await readFile(
    new URL("../src/components/finance/FinanceModelLibrary.tsx", import.meta.url),
    "utf8"
  );
  const globals = await readFile(new URL("../src/app/globals.css", import.meta.url), "utf8");

  assert.match(library, /finance-model-library-grid/);
  assert.doesNotMatch(library, /useState/);
  assert.doesNotMatch(library, /activeCategory/);
  assert.doesNotMatch(library, /financeModelCategories/);
  assert.doesNotMatch(library, /pillStyle/);
  assert.doesNotMatch(library, /finance-model-card-category/);
  assert.doesNotMatch(globals, /\.finance-model-library-grid\.filtered/);
  assert.doesNotMatch(globals, /\.finance-model-library-grid\.compact\.filtered/);
  assert.doesNotMatch(globals, /\.finance-model-card-category/);
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
  assert.match(page, /这里收录的是我自己搭建并持续打磨的财务模型和分析工具，欢迎大家使用。/);
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

test("site shell does not force pages wider than the visible viewport", async () => {
  const layout = await readFile(
    new URL("../src/app/layout.tsx", import.meta.url),
    "utf8"
  );

  assert.match(layout, /<main/);
  assert.doesNotMatch(layout, /minWidth:\s*"100vw"/);
});
