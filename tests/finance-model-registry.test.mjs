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

function readCssBlockAt(css, blockStart, blockStartIndex) {
  assert.notEqual(blockStartIndex, -1, `${blockStart} block should exist`);

  const openBraceIndex = css.indexOf("{", blockStartIndex);
  assert.notEqual(openBraceIndex, -1, `${blockStart} block should open`);

  let depth = 0;
  for (let index = openBraceIndex; index < css.length; index += 1) {
    if (css[index] === "{") depth += 1;
    if (css[index] === "}") depth -= 1;
    if (depth === 0) {
      return css.slice(openBraceIndex + 1, index);
    }
  }

  assert.fail(`${blockStart} block should close`);
}

function readCssBlocks(css, blockStart) {
  const blocks = [];
  let searchIndex = 0;

  while (searchIndex < css.length) {
    const blockStartIndex = css.indexOf(blockStart, searchIndex);
    if (blockStartIndex === -1) break;
    blocks.push(readCssBlockAt(css, blockStart, blockStartIndex));
    searchIndex = blockStartIndex + blockStart.length;
  }

  assert.ok(blocks.length > 0, `${blockStart} block should exist`);
  return blocks;
}

function assertCssRuleInBlockHas(css, blockStart, selector, declarations) {
  const escapedSelector = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const block = readCssBlocks(css, blockStart).find((candidate) => {
    return new RegExp(`(^|\\n)\\s*${escapedSelector}\\s*\\{`).test(candidate);
  });

  assert.ok(block, `${selector} rule should exist inside ${blockStart}`);
  assertCssRuleHas(block, selector, declarations);
}

function readWebpDimensions(buffer) {
  assert.equal(buffer.toString("ascii", 0, 4), "RIFF", "asset should be a RIFF container");
  assert.equal(buffer.toString("ascii", 8, 12), "WEBP", "asset should be a WebP image");

  let offset = 12;
  while (offset + 8 <= buffer.length) {
    const chunkType = buffer.toString("ascii", offset, offset + 4);
    const chunkSize = buffer.readUInt32LE(offset + 4);
    const dataStart = offset + 8;

    if (chunkType === "VP8 ") {
      return {
        width: buffer.readUInt16LE(dataStart + 6) & 0x3fff,
        height: buffer.readUInt16LE(dataStart + 8) & 0x3fff,
      };
    }

    if (chunkType === "VP8L") {
      const packed = buffer.readUInt32LE(dataStart + 1);
      return {
        width: (packed & 0x3fff) + 1,
        height: ((packed >> 14) & 0x3fff) + 1,
      };
    }

    if (chunkType === "VP8X") {
      return {
        width: 1 + buffer.readUIntLE(dataStart + 4, 3),
        height: 1 + buffer.readUIntLE(dataStart + 7, 3),
      };
    }

    offset = dataStart + chunkSize + (chunkSize % 2);
  }

  assert.fail("asset should expose WebP dimensions");
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
  assert.equal("demoHref" in model, false, "demo entry should live inside the finance AI assistant page, not the model library");
  assert.equal(model.title, "财务分析 AI 助手");
  assert.match(model.summary, /聊天|图表|经营明细/);
  assert.equal(model.previewImage, "/images/product-stage/finance-ai-assistant-preview.webp");
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

test("finance registry marks only the active testing models", () => {
  assert.deepEqual(
    registry.models
      .filter((model) => model.status === "testing")
      .map((model) => model.slug)
      .sort(),
    ["perspective-bi", "profit-structure"]
  );

  for (const model of registry.models) {
    if (["perspective-bi", "profit-structure"].includes(model.slug)) {
      assert.equal(model.status, "testing", `${model.slug} should be labeled as testing`);
    } else {
      assert.equal("status" in model, false, `${model.slug} should not show a testing ribbon`);
    }
  }
});

test("finance registry preserves model order as the only browsing structure", () => {
  assert.deepEqual(
    registry.models.map((model) => model.slug),
    ["business-analysis", "margin-analysis", "finance-ai-assistant", "monthly-trend", "profit-structure", "sensitivity-analysis", "perspective-bi"]
  );
});

test("finance models include chart-stacked preview assets", async () => {
  const { access } = await import("node:fs/promises");

  for (const model of registry.models) {
    assert.match(
      model.previewImage,
      /^\/images\/product-stage\/[a-z-]+\.webp$/,
      `${model.slug} needs a product-stage preview image`
    );
    assert.equal(typeof model.previewAlt, "string", `${model.slug} needs preview alt text`);
    assert.ok(model.previewAlt.length >= 12, `${model.slug} preview alt text should be descriptive`);

    const assetPath = new URL(`../public${model.previewImage}`, import.meta.url);
    await access(assetPath);
  }
});

test("finance model previews use hero-compatible product assets for home and index cards", async () => {
  const { readFile } = await import("node:fs/promises");

  for (const model of registry.models) {
    const assetPath = new URL(`../public${model.previewImage}`, import.meta.url);
    const dimensions = readWebpDimensions(await readFile(assetPath));
    const ratio = dimensions.width / dimensions.height;

    assert.ok(
      ratio >= 1.2 && ratio <= 1.65,
      `${model.slug} preview should fit the home hero stage before reuse, got ${dimensions.width}x${dimensions.height}`
    );
    assert.ok(dimensions.width >= 1400, `${model.slug} preview should be wide enough for the homepage`);
    assert.ok(dimensions.height >= 850, `${model.slug} preview should have enough height for the hero stage`);
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
  const modelRegistry = await readFile(
    new URL("../src/lib/finance/modelRegistry.ts", import.meta.url),
    "utf8"
  );
  const globals = await readFile(new URL("../src/app/globals.css", import.meta.url), "utf8");

  assert.match(library, /FinanceModelPreview/);
  assert.match(library, /previewImage/);
  assert.match(library, /previewAlt/);
  assert.match(modelRegistry, /FinanceModelStatus/);
  assert.match(modelRegistry, /status\?: FinanceModelStatus/);
  assert.match(library, /model\.status === "testing"/);
  assert.match(library, /finance-model-status-ribbon/);
  assert.match(library, /测试中/);
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
  assertCssRuleHas(globals, ".finance-model-status-ribbon", [
    "position: absolute",
    "transform: rotate(45deg)",
    "background: linear-gradient",
    "pointer-events: none",
  ]);
});

test("finance model library uses the previous preview card grid instead of the table directory", async () => {
  const library = await readFile(
    new URL("../src/components/finance/FinanceModelLibrary.tsx", import.meta.url),
    "utf8"
  );
  const globals = await readFile(new URL("../src/app/globals.css", import.meta.url), "utf8");

  assert.match(library, /finance-model-library-grid/);
  assert.match(library, /finance-model-card/);
  assert.match(library, /FinanceModelPreview/);
  assert.match(library, /model\.summary/);
  assert.match(library, /finance-model-card-title/);
  assert.match(library, /finance-model-card-summary/);
  assert.match(library, /finance-model-card-action/);
  assert.doesNotMatch(library, /model\.demoHref/);
  assert.doesNotMatch(library, /查看示例效果/);
  assert.doesNotMatch(library, /finance-model-card-demo-link/);
  assert.doesNotMatch(library, /finance-model-directory/);
  assert.doesNotMatch(library, /finance-model-directory-head/);
  assert.doesNotMatch(library, /finance-model-row/);
  assert.doesNotMatch(library, /finance-model-scenario/);
  assert.doesNotMatch(library, /finance-model-problem/);
  assert.doesNotMatch(library, /适合场景/);
  assert.doesNotMatch(library, /解决问题/);
  assert.match(globals, /\.finance-model-library-grid\s*\{/);
  assert.match(globals, /\.finance-model-card\s*\{/);
  assert.doesNotMatch(globals, /\.finance-model-card-actions\s*\{/);
  assert.doesNotMatch(globals, /\.finance-model-card-demo-link\s*\{/);
  assert.doesNotMatch(globals, /\.finance-model-directory\s*\{/);
  assert.doesNotMatch(globals, /\.finance-model-directory-head\s*\{/);
  assert.doesNotMatch(globals, /\.finance-model-row\s*\{/);
});

test("finance compact library uses one-row three-up product cards on desktop", async () => {
  const globals = await readFile(new URL("../src/app/globals.css", import.meta.url), "utf8");

  assertCssRuleHas(globals, ".finance-model-library-grid.compact", [
    "grid-template-columns: repeat(3, minmax(0, 1fr))",
    "gap: 12px",
  ]);
  assertCssRuleHas(globals, ".finance-model-preview.compact", [
    "aspect-ratio: 1.85",
  ]);
  assertCssRuleHas(globals, ".finance-model-library-grid.compact .finance-model-card-summary", [
    "-webkit-line-clamp: 2",
  ]);
  assert.doesNotMatch(
    globals,
    /\.finance-model-library-grid\.compact\s*\{[^}]*auto-fit/s,
    "compact finance grid should not auto-fit into uneven desktop columns"
  );
});

test("finance testing ribbon stays pinned to the preview thumbnail corner on mobile", async () => {
  const library = await readFile(
    new URL("../src/components/finance/FinanceModelLibrary.tsx", import.meta.url),
    "utf8"
  );
  const globals = await readFile(new URL("../src/app/globals.css", import.meta.url), "utf8");

  assert.match(library, /finance-model-preview-frame/);
  assert.match(
    library,
    /<div className="finance-model-preview-frame">[\s\S]*<FinanceModelPreview[\s\S]*finance-model-status-ribbon[\s\S]*<\/div>/,
    "testing ribbon should be rendered inside the preview frame, not as a card-level sibling"
  );
  assertCssRuleHas(globals, ".finance-model-preview-frame", [
    "position: relative",
    "overflow: hidden",
  ]);
  assertCssRuleInBlockHas(globals, "@media (max-width: 768px)", ".finance-model-status-ribbon", [
    "top: 8px",
    "right: -26px",
    "left: auto",
    "width: 92px",
  ]);
  assert.doesNotMatch(
    readCssBlocks(globals, "@media (max-width: 768px)").join("\n"),
    /\.finance-model-status-ribbon\s*\{[^}]*left:\s*22px/s,
    "mobile testing ribbon should not be anchored from the left edge"
  );
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
  assert.match(page, /finance-index-hero/);
  assert.match(page, /finance-index-eyebrow/);
  assert.match(page, /finance-index-title/);
  assert.match(page, /finance-index-intro/);
  assert.match(page, /FINANCE MODELS/);
  assert.match(page, /财务模型/);
  assert.match(page, /这里收录的是我自己搭建并持续打磨的财务模型和分析工具，欢迎大家使用。/);
  assert.doesNotMatch(page, /home-finance-title-card/);
  assert.doesNotMatch(page, /home-finance-title/);
  assert.doesNotMatch(page, /目前共有 \{financeModels\.length\} 个模型/);
  assert.doesNotMatch(page, /Finance Model Library/);
  assert.doesNotMatch(page, /MODEL LIBRARY/);
  assert.doesNotMatch(page, /Finance Models/);
  assert.doesNotMatch(page, /按经营问题进入模型/);
  assert.doesNotMatch(page, /style=\{\{/);
  assert.match(globals, /\.finance-index-page\s*\{/);
  assert.match(globals, /\.finance-index-hero\s*\{/);
  assert.match(globals, /\.finance-index-eyebrow\s*\{/);
  assert.match(globals, /\.finance-index-title\s*\{/);
  assert.doesNotMatch(globals, /\.finance-index-hero-card::before/);
  assert.doesNotMatch(globals, /\.finance-index-hero-card::after/);
  assert.doesNotMatch(globals, /\.finance-index-title-meta\s*\{/);
  assert.doesNotMatch(globals, /\.finance-index-title-copy\s*\{/);
  assert.match(globals, /\.finance-index-intro\s*\{/);
  assert.doesNotMatch(globals, /\.finance-index-hero-card\s*\{/);
});

test("site shell does not force pages wider than the visible viewport", async () => {
  const layout = await readFile(
    new URL("../src/app/layout.tsx", import.meta.url),
    "utf8"
  );

  assert.match(layout, /<main/);
  assert.doesNotMatch(layout, /minWidth:\s*"100vw"/);
});
