import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

async function readProjectFile(path) {
  return readFile(new URL(`../${path}`, import.meta.url), "utf8");
}

function readCssRule(source, selector) {
  const escapedSelector = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = source.match(new RegExp(`(^|\\n)\\s*${escapedSelector}\\s*\\{[\\s\\S]*?\\n\\s*\\}`));
  assert.ok(match, `${selector} rule should exist`);
  return match[0];
}

function readLastCssRule(source, selector) {
  const escapedSelector = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const matches = [...source.matchAll(new RegExp(`(^|\\n)\\s*${escapedSelector}\\s*\\{[\\s\\S]*?\\n\\s*\\}`, "g"))];
  assert.ok(matches.length, `${selector} rule should exist`);
  return matches.at(-1)[0];
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

test("finance tool page wrappers use shared tokenized shell classes", async () => {
  const pageFiles = [
    "src/app/finance/business-analysis/page.tsx",
    "src/app/finance/monthly-trend/page.tsx",
    "src/app/finance/margin-analysis/page.tsx",
    "src/app/finance/sensitivity-analysis/page.tsx",
    "src/app/finance/profit-structure/page.tsx",
    "src/app/finance/perspective-bi/page.tsx",
    "src/app/finance/finance-ai-assistant/page.tsx",
    "src/app/finance/finance-ai-assistant/demo/page.tsx",
  ];

  for (const path of pageFiles) {
    const source = await readProjectFile(path);
    assert.match(source, /finance-tool-page-shell/, `${path} should use the shared finance tool page shell`);
    assert.doesNotMatch(source, /bg-\[#faf9f5\]/, `${path} should not hardcode the page background`);
    assert.doesNotMatch(source, /text-\[#141413\]/, `${path} should not hardcode the foreground color`);
  }

  const globals = await readProjectFile("src/app/globals.css");
  const shellBlock = globals.match(/\.finance-tool-page-shell\s*\{[\s\S]*?\n\}/)?.[0] ?? "";
  const fallbackBlock = globals.match(/\.finance-tool-page-fallback\s*\{[\s\S]*?\n\}/)?.[0] ?? "";

  assert.match(shellBlock, /background:\s*var\(--background\)/);
  assert.match(shellBlock, /color:\s*var\(--foreground\)/);
  assert.match(fallbackBlock, /background:\s*var\(--background\)/);
  assert.match(fallbackBlock, /color:\s*var\(--foreground\)/);
});

test("global text selection colors use site tokens", async () => {
  const layout = await readProjectFile("src/app/layout.tsx");
  const globals = await readProjectFile("src/app/globals.css");

  assert.doesNotMatch(layout, /selection:[a-z-]+-\[#/);
  assert.doesNotMatch(layout, /selection:text-white/);

  const selectionBlocks = globals.match(/::selection\s*\{[\s\S]*?\n\}/g) ?? [];
  assert.ok(selectionBlocks.length > 0, "globals.css should define text selection styles");

  for (const selectionBlock of selectionBlocks) {
    assert.doesNotMatch(selectionBlock, /rgba\(/);
    assert.match(selectionBlock, /background:\s*var\(--accent\)/);
    assert.match(selectionBlock, /color:\s*var\(--card\)/);
  }
});

test("site navigation shadows use shared design tokens", async () => {
  const navigation = await readProjectFile("src/components/layout/SiteNavigation.tsx");
  const globals = await readProjectFile("src/app/globals.css");

  assert.doesNotMatch(navigation, /boxShadow:\s*"[^"]*rgba\(/);
  assert.match(navigation, /boxShadow:\s*"var\(--site-nav-button-shadow\)"/);
  assert.match(navigation, /boxShadow:\s*"var\(--site-nav-menu-shadow\)"/);
  assert.match(navigation, /boxShadow:\s*"var\(--site-nav-shell-shadow\)"/);

  const rootBlocks = globals.match(/:root\s*\{[\s\S]*?\n\}/g) ?? [];
  const rootSource = rootBlocks.join("\n");
  assert.match(rootSource, /--site-nav-button-shadow:\s*0 8px 24px color-mix\(in srgb,\s*var\(--foreground\) 8%,\s*transparent\)/);
  assert.match(rootSource, /--site-nav-menu-shadow:\s*0 18px 44px color-mix\(in srgb,\s*var\(--foreground\) 12%,\s*transparent\)/);
  assert.match(rootSource, /--site-nav-shell-shadow:\s*0 12px 32px color-mix\(in srgb,\s*var\(--foreground\) 8%,\s*transparent\)/);
});

test("home hero model stage accents use site color tokens", async () => {
  const heroModelStage = await readProjectFile("src/components/home/HeroModelStage.tsx");

  assert.doesNotMatch(heroModelStage, /accent:\s*"#[0-9a-fA-F]{3,8}"/);
  assert.match(heroModelStage, /accent:\s*"var\(--accent-secondary\)"/);
  assert.match(heroModelStage, /accent:\s*"var\(--accent\)"/);
  assert.match(heroModelStage, /accent:\s*"var\(--accent-tertiary\)"/);
  assert.match(heroModelStage, /"--hero-stage-accent":\s*activeStage\.accent/);
});

test("home hero intro card shadows derive from shared design tokens", async () => {
  const globals = await readProjectFile("src/app/globals.css");
  const rootBlocks = globals.match(/:root\s*\{[\s\S]*?\n\}/g) ?? [];
  const rootSource = rootBlocks.join("\n");
  const copyCardBlock = readCssRule(globals, ".home-hero-copy-card");
  const modelEntryBlock = readCssRule(globals, ".home-model-library-entry");
  const scopedSource = [copyCardBlock, modelEntryBlock].join("\n");

  for (const literal of [
    "0 14px 38px rgba(20, 20, 19, 0.055)",
    "0 12px 30px rgba(20, 20, 19, 0.055)",
  ]) {
    assert.doesNotMatch(scopedSource, new RegExp(literal.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }

  assert.match(rootSource, /--home-hero-copy-card-shadow:\s*0 14px 38px color-mix\(in srgb,\s*var\(--foreground\) 5\.5%,\s*transparent\)/);
  assert.match(rootSource, /--home-model-library-entry-shadow:\s*0 12px 30px color-mix\(in srgb,\s*var\(--foreground\) 5\.5%,\s*transparent\)/);
  assert.match(copyCardBlock, /box-shadow:\s*var\(--home-hero-copy-card-shadow\)/);
  assert.match(modelEntryBlock, /box-shadow:\s*var\(--home-model-library-entry-shadow\)/);
});

test("home model library entry active details derive from shared design tokens", async () => {
  const globals = await readProjectFile("src/app/globals.css");
  const rootBlocks = globals.match(/:root\s*\{[\s\S]*?\n\}/g) ?? [];
  const rootSource = rootBlocks.join("\n");
  const dotBlock = readCssRule(globals, ".home-model-library-entry::after");
  const activeBlock =
    globals.match(/\.home-model-library-entry:hover,\n\.home-model-library-entry:focus-visible\s*\{[\s\S]*?\n\}/)?.[0] ?? "";

  assert.ok(activeBlock, "home model library hover/focus rule should exist");

  for (const literal of [
    "background: color-mix(in srgb, var(--accent-secondary) 82%, #fff)",
    "box-shadow: 0 0 14px color-mix(in srgb, var(--accent-secondary) 58%, transparent)",
    "border-color: color-mix(in srgb, var(--accent) 44%, var(--accent-secondary))",
    "box-shadow: 0 16px 38px rgba(20, 20, 19, 0.085)",
  ]) {
    const scopedSource = `${dotBlock}\n${activeBlock}`;
    assert.doesNotMatch(scopedSource, new RegExp(literal.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }

  assert.match(
    rootSource,
    /--home-model-library-entry-dot-bg:\s*color-mix\(in srgb,\s*var\(--accent-secondary\) 82%,\s*var\(--card\)\)/
  );
  assert.match(
    rootSource,
    /--home-model-library-entry-dot-shadow:\s*0 0 14px color-mix\(in srgb,\s*var\(--accent-secondary\) 58%,\s*transparent\)/
  );
  assert.match(
    rootSource,
    /--home-model-library-entry-active-border:\s*color-mix\(in srgb,\s*var\(--accent\) 44%,\s*var\(--accent-secondary\)\)/
  );
  assert.match(
    rootSource,
    /--home-model-library-entry-active-shadow:\s*0 16px 38px color-mix\(in srgb,\s*var\(--foreground\) 8\.5%,\s*transparent\)/
  );
  assert.match(dotBlock, /background:\s*var\(--home-model-library-entry-dot-bg\)/);
  assert.match(dotBlock, /box-shadow:\s*var\(--home-model-library-entry-dot-shadow\)/);
  assert.match(activeBlock, /border-color:\s*var\(--home-model-library-entry-active-border\)/);
  assert.match(activeBlock, /box-shadow:\s*var\(--home-model-library-entry-active-shadow\)/);
});

test("home hero model stage shadows derive from shared design tokens", async () => {
  const globals = await readProjectFile("src/app/globals.css");
  const rootBlocks = globals.match(/:root\s*\{[\s\S]*?\n\}/g) ?? [];
  const rootSource = rootBlocks.join("\n");
  const stagePanelBlock = readCssRule(globals, ".home-hero-stage-panel");
  const stagePreviewBlock = readCssRule(globals, ".home-hero-stage-preview");
  const skeletonWindowBlock = readCssRule(globals, ".home-hero-stage-skeleton-window");
  const scopedSource = [stagePanelBlock, stagePreviewBlock, skeletonWindowBlock].join("\n");

  for (const literal of [
    "0 24px 64px rgba(20, 20, 19, 0.09)",
    "0 20px 50px rgba(20, 20, 19, 0.08)",
    "0 18px 42px rgba(20, 20, 19, 0.06)",
  ]) {
    assert.doesNotMatch(scopedSource, new RegExp(literal.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }

  assert.match(rootSource, /--home-hero-stage-panel-shadow:\s*0 24px 64px color-mix\(in srgb,\s*var\(--foreground\) 9%,\s*transparent\)/);
  assert.match(rootSource, /--home-hero-stage-preview-shadow:\s*0 20px 50px color-mix\(in srgb,\s*var\(--foreground\) 8%,\s*transparent\)/);
  assert.match(rootSource, /--home-hero-stage-skeleton-window-shadow:\s*0 18px 42px color-mix\(in srgb,\s*var\(--foreground\) 6%,\s*transparent\)/);
  assert.match(stagePanelBlock, /box-shadow:\s*var\(--home-hero-stage-panel-shadow\)/);
  assert.match(stagePreviewBlock, /box-shadow:\s*var\(--home-hero-stage-preview-shadow\)/);
  assert.match(skeletonWindowBlock, /box-shadow:\s*var\(--home-hero-stage-skeleton-window-shadow\)/);
});

test("home hero model stage controls derive shadows from shared design tokens", async () => {
  const globals = await readProjectFile("src/app/globals.css");
  const rootBlocks = globals.match(/:root\s*\{[\s\S]*?\n\}/g) ?? [];
  const rootSource = rootBlocks.join("\n");
  const stageFloatBlock = readCssRule(globals, ".home-hero-stage-float");
  const stageTabBlock = readCssRule(globals, ".home-hero-stage-tab");
  const stageTabActiveBlock = globals.match(/\.home-hero-stage-tab:hover,\n\.home-hero-stage-tab:focus-visible,\n\.home-hero-stage-tab\.is-active\s*\{[\s\S]*?\n\}/)?.[0] ?? "";
  assert.ok(stageTabActiveBlock, "home hero stage active tab rule should exist");
  const scopedSource = [stageFloatBlock, stageTabBlock, stageTabActiveBlock].join("\n");

  for (const literal of [
    "0 16px 34px rgba(20, 20, 19, 0.08)",
    "0 12px 28px rgba(20, 20, 19, 0.045)",
    "0 14px 34px rgba(20, 20, 19, 0.07)",
  ]) {
    assert.doesNotMatch(scopedSource, new RegExp(literal.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }

  assert.match(rootSource, /--home-hero-stage-float-shadow:\s*0 16px 34px color-mix\(in srgb,\s*var\(--foreground\) 8%,\s*transparent\)/);
  assert.match(rootSource, /--home-hero-stage-tab-shadow:\s*0 12px 28px color-mix\(in srgb,\s*var\(--foreground\) 4\.5%,\s*transparent\)/);
  assert.match(rootSource, /--home-hero-stage-tab-active-shadow:\s*0 14px 34px color-mix\(in srgb,\s*var\(--foreground\) 7%,\s*transparent\)/);
  assert.match(stageFloatBlock, /box-shadow:\s*var\(--home-hero-stage-float-shadow\)/);
  assert.match(stageTabBlock, /box-shadow:\s*var\(--home-hero-stage-tab-shadow\)/);
  assert.match(stageTabActiveBlock, /box-shadow:\s*var\(--home-hero-stage-tab-active-shadow\)/);
});

test("home hero floating mini widgets derive shadows from shared design tokens", async () => {
  const globals = await readProjectFile("src/app/globals.css");
  const rootBlocks = globals.match(/:root\s*\{[\s\S]*?\n\}/g) ?? [];
  const rootSource = rootBlocks.join("\n");
  const miniWidgetBlock = readCssRule(globals, ".home-mini-widget");

  assert.doesNotMatch(miniWidgetBlock, /0 16px 34px rgba\(20,\s*20,\s*19,\s*0\.07\)/);
  assert.match(rootSource, /--home-mini-widget-shadow:\s*0 16px 34px color-mix\(in srgb,\s*var\(--foreground\) 7%,\s*transparent\)/);
  assert.match(miniWidgetBlock, /box-shadow:\s*var\(--home-mini-widget-shadow\)/);
});

test("home hero floating mini widget accents derive from shared site tokens", async () => {
  const globals = await readProjectFile("src/app/globals.css");
  const rootBlocks = globals.match(/:root\s*\{[\s\S]*?\n\}/g) ?? [];
  const rootSource = rootBlocks.join("\n");
  const chromeDotBlock = readCssRule(globals, ".home-mini-widget-chrome span");
  const chromeDotSecondBlock = readCssRule(globals, ".home-mini-widget-chrome span:nth-child(2)");
  const chromeDotThirdBlock = readCssRule(globals, ".home-mini-widget-chrome span:nth-child(3)");
  const barBlock = readCssRule(globals, ".home-mini-widget-bars span");
  const barSecondBlock = readCssRule(globals, ".home-mini-widget-bars span:nth-child(2)");
  const barThirdBlock = readCssRule(globals, ".home-mini-widget-bars span:nth-child(3)");
  const barFourthBlock = readCssRule(globals, ".home-mini-widget-bars span:nth-child(4)");
  const lineBlock = readCssRule(globals, ".home-mini-widget-lines span");
  const lineLastBlock = readCssRule(globals, ".home-mini-widget-lines span:last-child");
  const scopedSource = [
    chromeDotBlock,
    chromeDotSecondBlock,
    chromeDotThirdBlock,
    barBlock,
    barSecondBlock,
    barThirdBlock,
    barFourthBlock,
    lineBlock,
    lineLastBlock,
  ].join("\n").toLowerCase();

  for (const literal of ["#dc7f5f", "#e8c66d", "#7ebc9a", "#d9785c", "#6f9eb8", "#90a675"]) {
    assert.doesNotMatch(scopedSource, new RegExp(literal));
  }

  for (const token of [
    "--home-mini-widget-accent-primary",
    "--home-mini-widget-accent-secondary",
    "--home-mini-widget-accent-tertiary",
    "--home-mini-widget-accent-warm",
  ]) {
    assert.match(rootSource, new RegExp(`${token}:\\s*color-mix\\(in srgb,\\s*var\\(--accent`), `${token} should derive from site accent tokens`);
  }

  for (const token of [
    "--home-mini-widget-line-primary",
    "--home-mini-widget-line-secondary",
    "--home-mini-widget-bar-muted",
  ]) {
    assert.match(rootSource, new RegExp(`${token}:\\s*`), `${token} should be declared in :root`);
  }

  assert.match(chromeDotBlock, /background:\s*var\(--home-mini-widget-accent-primary\)/);
  assert.match(chromeDotSecondBlock, /background:\s*var\(--home-mini-widget-accent-warm\)/);
  assert.match(chromeDotThirdBlock, /background:\s*var\(--home-mini-widget-accent-tertiary\)/);
  assert.match(barBlock, /background:\s*var\(--home-mini-widget-accent-primary\)/);
  assert.match(barSecondBlock, /background:\s*var\(--home-mini-widget-accent-secondary\)/);
  assert.match(barThirdBlock, /background:\s*var\(--home-mini-widget-accent-tertiary\)/);
  assert.match(barFourthBlock, /background:\s*var\(--home-mini-widget-bar-muted\)/);
  assert.match(lineBlock, /background:\s*var\(--home-mini-widget-line-primary\)/);
  assert.match(lineLastBlock, /background:\s*var\(--home-mini-widget-line-secondary\)/);
});

test("home hero does not keep unused mini widget dot or status color styles", async () => {
  const globals = await readProjectFile("src/app/globals.css");
  const hero = await readProjectFile("src/components/home/CapabilityHero.tsx");

  assert.doesNotMatch(hero, /home-mini-widget-dots/);
  assert.doesNotMatch(hero, /home-mini-widget-status/);
  assert.doesNotMatch(globals, /\.home-mini-widget-dots\b/);
  assert.doesNotMatch(globals, /\.home-mini-widget-status\b/);
});

test("home hero does not keep unused question card styles", async () => {
  const globals = await readProjectFile("src/app/globals.css");
  const hero = await readProjectFile("src/components/home/CapabilityHero.tsx");

  for (const className of [
    "home-hero-question-strip",
    "home-hero-question-card",
    "home-hero-question-meta",
    "home-hero-question-model",
  ]) {
    assert.doesNotMatch(hero, new RegExp(className), `CapabilityHero should not render ${className}`);
    assert.doesNotMatch(globals, new RegExp(`\\.${className}\\b`), `globals.css should not retain ${className} dead styles`);
  }
});

test("home finance mobile carousel surface derives from shared design tokens", async () => {
  const globals = await readProjectFile("src/app/globals.css");
  const rootBlocks = globals.match(/:root\s*\{[\s\S]*?\n\}/g) ?? [];
  const rootSource = rootBlocks.join("\n");
  const carouselBlock = readLastCssRule(globals, ".home-finance-mobile-carousel");

  for (const literal of [
    "border: 1px solid color-mix(in srgb, var(--border) 84%, transparent)",
    "background: color-mix(in srgb, var(--card) 94%, transparent)",
    "box-shadow: 0 18px 46px rgba(20, 20, 19, 0.08)",
  ]) {
    assert.doesNotMatch(carouselBlock, new RegExp(literal.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }

  assert.match(
    rootSource,
    /--home-finance-mobile-carousel-border:\s*color-mix\(in srgb,\s*var\(--border\) 84%,\s*transparent\)/
  );
  assert.match(
    rootSource,
    /--home-finance-mobile-carousel-bg:\s*color-mix\(in srgb,\s*var\(--card\) 94%,\s*transparent\)/
  );
  assert.match(
    rootSource,
    /--home-finance-mobile-carousel-shadow:\s*0 18px 46px color-mix\(in srgb,\s*var\(--foreground\) 8%,\s*transparent\)/
  );
  assert.match(carouselBlock, /border:\s*1px solid var\(--home-finance-mobile-carousel-border\)/);
  assert.match(carouselBlock, /background:\s*var\(--home-finance-mobile-carousel-bg\)/);
  assert.match(carouselBlock, /box-shadow:\s*var\(--home-finance-mobile-carousel-shadow\)/);
});

test("home finance mobile guide colors derive from shared design tokens", async () => {
  const globals = await readProjectFile("src/app/globals.css");
  const rootBlocks = globals.match(/:root\s*\{[\s\S]*?\n\}/g) ?? [];
  const rootSource = rootBlocks.join("\n");
  const guideBlock = readLastCssRule(globals, ".home-finance-mobile-guide");
  const guideLabelBlock = readLastCssRule(globals, ".home-finance-mobile-guide span");
  const guideBodyBlock = readLastCssRule(globals, ".home-finance-mobile-guide p");
  const scopedSource = [guideBlock, guideLabelBlock, guideBodyBlock].join("\n");

  for (const literal of [
    "border: 1px solid color-mix(in srgb, var(--accent-secondary) 18%, var(--border))",
    "background: color-mix(in srgb, var(--card) 74%, transparent)",
    "color: color-mix(in srgb, var(--accent-secondary) 78%, var(--foreground))",
    "color: color-mix(in srgb, var(--foreground) 74%, var(--muted))",
  ]) {
    assert.doesNotMatch(scopedSource, new RegExp(literal.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }

  assert.match(
    rootSource,
    /--home-finance-mobile-guide-border:\s*color-mix\(in srgb,\s*var\(--accent-secondary\) 18%,\s*var\(--border\)\)/
  );
  assert.match(
    rootSource,
    /--home-finance-mobile-guide-bg:\s*color-mix\(in srgb,\s*var\(--card\) 74%,\s*transparent\)/
  );
  assert.match(
    rootSource,
    /--home-finance-mobile-guide-label-text:\s*color-mix\(in srgb,\s*var\(--accent-secondary\) 78%,\s*var\(--foreground\)\)/
  );
  assert.match(
    rootSource,
    /--home-finance-mobile-guide-body-text:\s*color-mix\(in srgb,\s*var\(--foreground\) 74%,\s*var\(--muted\)\)/
  );
  assert.match(guideBlock, /border:\s*1px solid var\(--home-finance-mobile-guide-border\)/);
  assert.match(guideBlock, /background:\s*var\(--home-finance-mobile-guide-bg\)/);
  assert.match(guideLabelBlock, /color:\s*var\(--home-finance-mobile-guide-label-text\)/);
  assert.match(guideBodyBlock, /color:\s*var\(--home-finance-mobile-guide-body-text\)/);
});

test("home finance mobile carousel dots derive from shared design tokens", async () => {
  const globals = await readProjectFile("src/app/globals.css");
  const rootBlocks = globals.match(/:root\s*\{[\s\S]*?\n\}/g) ?? [];
  const rootSource = rootBlocks.join("\n");
  const dotBlock = readLastCssRule(globals, ".home-finance-mobile-dots button");
  const currentDotBlock = readLastCssRule(globals, ".home-finance-mobile-dots button.is-current");
  const scopedSource = [dotBlock, currentDotBlock].join("\n");

  for (const literal of [
    "background: color-mix(in srgb, var(--muted) 42%, transparent)",
    "background: var(--accent)",
  ]) {
    assert.doesNotMatch(scopedSource, new RegExp(literal.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }

  assert.match(
    rootSource,
    /--home-finance-mobile-dot-bg:\s*color-mix\(in srgb,\s*var\(--muted\) 42%,\s*transparent\)/
  );
  assert.match(rootSource, /--home-finance-mobile-dot-current-bg:\s*var\(--accent\)/);
  assert.match(dotBlock, /background:\s*var\(--home-finance-mobile-dot-bg\)/);
  assert.match(currentDotBlock, /background:\s*var\(--home-finance-mobile-dot-current-bg\)/);
});

test("home finance mobile current switch card derives from shared design tokens", async () => {
  const globals = await readProjectFile("src/app/globals.css");
  const rootBlocks = globals.match(/:root\s*\{[\s\S]*?\n\}/g) ?? [];
  const rootSource = rootBlocks.join("\n");
  const currentCardBlock = readLastCssRule(globals, ".home-finance-switch-card.is-mobile-current");

  for (const literal of [
    "border-color: color-mix(in srgb, var(--accent) 42%, var(--border))",
    "box-shadow: 0 14px 34px rgba(217, 120, 92, 0.14)",
  ]) {
    assert.doesNotMatch(currentCardBlock, new RegExp(literal.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }

  assert.match(
    rootSource,
    /--home-finance-switch-card-mobile-current-border:\s*color-mix\(in srgb,\s*var\(--accent\) 42%,\s*var\(--border\)\)/
  );
  assert.match(
    rootSource,
    /--home-finance-switch-card-mobile-current-shadow:\s*0 14px 34px color-mix\(in srgb,\s*var\(--accent\) 14%,\s*transparent\)/
  );
  assert.match(currentCardBlock, /border-color:\s*var\(--home-finance-switch-card-mobile-current-border\)/);
  assert.match(currentCardBlock, /box-shadow:\s*var\(--home-finance-switch-card-mobile-current-shadow\)/);
});

test("home finance stage and switch card active state derives from shared design tokens", async () => {
  const globals = await readProjectFile("src/app/globals.css");
  const rootBlocks = globals.match(/:root\s*\{[\s\S]*?\n\}/g) ?? [];
  const rootSource = rootBlocks.join("\n");
  const activeBlock =
    globals.match(
      /\.home-finance-stage:hover,\s*\.home-finance-switch-card:hover,\s*\.home-finance-switch-card\[aria-current="true"\]\s*\{[\s\S]*?\n\}/
    )?.[0] ?? "";

  assert.ok(activeBlock, "home finance active stage/switch-card rule should exist");

  for (const literal of [
    "border-color: color-mix(in srgb, var(--accent) 34%, var(--border))",
    "box-shadow: 0 18px 44px rgba(20, 20, 19, 0.08)",
  ]) {
    assert.doesNotMatch(activeBlock, new RegExp(literal.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }

  assert.match(
    rootSource,
    /--home-finance-card-active-border:\s*color-mix\(in srgb,\s*var\(--accent\) 34%,\s*var\(--border\)\)/
  );
  assert.match(
    rootSource,
    /--home-finance-card-active-shadow:\s*0 18px 44px color-mix\(in srgb,\s*var\(--foreground\) 8%,\s*transparent\)/
  );
  assert.match(activeBlock, /border-color:\s*var\(--home-finance-card-active-border\)/);
  assert.match(activeBlock, /box-shadow:\s*var\(--home-finance-card-active-shadow\)/);
});

test("finance model library hover card state derives from shared design tokens", async () => {
  const globals = await readProjectFile("src/app/globals.css");
  const rootBlocks = globals.match(/:root\s*\{[\s\S]*?\n\}/g) ?? [];
  const rootSource = rootBlocks.join("\n");
  const hoverBlock = readLastCssRule(globals, ".finance-model-card:hover");

  for (const literal of [
    "border-color: color-mix(in srgb, var(--accent) 36%, var(--border))",
    "box-shadow: 0 18px 44px rgba(20, 20, 19, 0.08)",
  ]) {
    assert.doesNotMatch(hoverBlock, new RegExp(literal.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }

  assert.match(
    rootSource,
    /--finance-model-card-hover-border:\s*color-mix\(in srgb,\s*var\(--accent\) 36%,\s*var\(--border\)\)/
  );
  assert.match(
    rootSource,
    /--finance-model-card-hover-shadow:\s*0 18px 44px color-mix\(in srgb,\s*var\(--foreground\) 8%,\s*transparent\)/
  );
  assert.match(hoverBlock, /border-color:\s*var\(--finance-model-card-hover-border\)/);
  assert.match(hoverBlock, /box-shadow:\s*var\(--finance-model-card-hover-shadow\)/);
});

test("home thinking track accents use site color tokens", async () => {
  const homeThinkingSection = await readProjectFile("src/components/home/HomeThinkingSection.tsx");

  assert.doesNotMatch(homeThinkingSection, /accent:\s*"#[0-9a-fA-F]{3,8}"/);
  assert.doesNotMatch(homeThinkingSection, /soft:\s*"rgba\(/);
  assert.match(homeThinkingSection, /accent:\s*"var\(--accent-secondary\)"/);
  assert.match(homeThinkingSection, /accent:\s*"var\(--accent\)"/);
  assert.match(homeThinkingSection, /accent:\s*"var\(--accent-tertiary\)"/);
  assert.match(homeThinkingSection, /soft:\s*"color-mix\(in srgb,\s*var\(--accent-secondary\)\s+13%,\s*transparent\)"/);
  assert.match(homeThinkingSection, /soft:\s*"color-mix\(in srgb,\s*var\(--accent\)\s+14%,\s*transparent\)"/);
  assert.match(homeThinkingSection, /soft:\s*"color-mix\(in srgb,\s*var\(--accent-tertiary\)\s+14%,\s*transparent\)"/);
});

test("home thinking visual card shadow derives from a shared design token", async () => {
  const globals = await readProjectFile("src/app/globals.css");
  const rootBlocks = globals.match(/:root\s*\{[\s\S]*?\n\}/g) ?? [];
  const rootSource = rootBlocks.join("\n");
  const visualCardBlock = readCssRule(globals, ".home-thinking-visual-card");

  assert.doesNotMatch(visualCardBlock, /0 22px 58px rgba\(20,\s*20,\s*19,\s*0\.08\)/);
  assert.match(rootSource, /--home-thinking-visual-card-shadow:\s*0 22px 58px color-mix\(in srgb,\s*var\(--foreground\) 8%,\s*transparent\)/);
  assert.match(visualCardBlock, /box-shadow:\s*var\(--home-thinking-visual-card-shadow\)/);
});

test("home thinking visual shade gradients derive from shared design tokens", async () => {
  const globals = await readProjectFile("src/app/globals.css");
  const rootBlocks = globals.match(/:root\s*\{[\s\S]*?\n\}/g) ?? [];
  const rootSource = rootBlocks.join("\n");
  const visualShadeBlock = readCssRule(globals, ".home-thinking-visual-shade");
  const scopedSource = visualShadeBlock.toLowerCase();

  for (const literal of ["rgba(20, 20, 19", "rgba(250, 249, 245"]) {
    assert.doesNotMatch(scopedSource, new RegExp(literal.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }

  assert.match(rootSource, /--home-thinking-visual-shade-vertical-start:\s*color-mix\(in srgb,\s*var\(--foreground\) 8%,\s*transparent\)/);
  assert.match(rootSource, /--home-thinking-visual-shade-vertical-end:\s*color-mix\(in srgb,\s*var\(--foreground\) 58%,\s*transparent\)/);
  assert.match(rootSource, /--home-thinking-visual-shade-horizontal-start:\s*color-mix\(in srgb,\s*var\(--background\) 6%,\s*transparent\)/);
  assert.match(rootSource, /--home-thinking-visual-shade-horizontal-end:\s*color-mix\(in srgb,\s*var\(--foreground\) 18%,\s*transparent\)/);
  assert.match(visualShadeBlock, /linear-gradient\(180deg,\s*var\(--home-thinking-visual-shade-vertical-start\),\s*var\(--home-thinking-visual-shade-vertical-end\)\)/);
  assert.match(visualShadeBlock, /linear-gradient\(90deg,\s*var\(--home-thinking-visual-shade-horizontal-start\),\s*var\(--home-thinking-visual-shade-horizontal-end\)\)/);
});

test("home thinking visual copy colors derive from shared design tokens", async () => {
  const globals = await readProjectFile("src/app/globals.css");
  const rootBlocks = globals.match(/:root\s*\{[\s\S]*?\n\}/g) ?? [];
  const rootSource = rootBlocks.join("\n");
  const kickerBlock = readCssRule(globals, ".home-thinking-visual-copy .home-thinking-kicker");
  const titleBlock = readCssRule(globals, ".home-thinking-visual-copy h2");
  const introBlock = readCssRule(globals, ".home-thinking-featured-intro");
  const previewLabelBlock = readCssRule(globals, ".home-thinking-preview-label");
  const previewSummaryBlock = readCssRule(globals, ".home-thinking-preview-summary");
  const previewActionBlock = readCssRule(globals, ".home-thinking-preview-action");
  const scopedSource = [
    kickerBlock,
    titleBlock,
    introBlock,
    previewLabelBlock,
    previewSummaryBlock,
    previewActionBlock,
  ].join("\n").toLowerCase();

  for (const literal of ["#fffaf0", "rgba(255, 250, 240"]) {
    assert.doesNotMatch(scopedSource, new RegExp(literal.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }

  assert.match(rootSource, /--home-thinking-visual-copy-title-text:\s*var\(--background\)/);
  assert.match(rootSource, /--home-thinking-visual-copy-muted-text:\s*color-mix\(in srgb,\s*var\(--background\) 82%,\s*transparent\)/);
  assert.match(rootSource, /--home-thinking-preview-label-text:\s*var\(--background\)/);
  assert.match(rootSource, /--home-thinking-preview-summary-text:\s*color-mix\(in srgb,\s*var\(--background\) 78%,\s*transparent\)/);
  assert.match(rootSource, /--home-thinking-preview-action-text:\s*var\(--background\)/);
  assert.match(kickerBlock, /color:\s*var\(--home-thinking-visual-copy-title-text\)/);
  assert.match(titleBlock, /color:\s*var\(--home-thinking-visual-copy-title-text\)/);
  assert.match(introBlock, /color:\s*var\(--home-thinking-visual-copy-muted-text\)/);
  assert.match(previewLabelBlock, /color:\s*var\(--home-thinking-preview-label-text\)/);
  assert.match(previewSummaryBlock, /color:\s*var\(--home-thinking-preview-summary-text\)/);
  assert.match(previewActionBlock, /color:\s*var\(--home-thinking-preview-action-text\)/);
});

test("home thinking preview controls derive surface colors from shared design tokens", async () => {
  const globals = await readProjectFile("src/app/globals.css");
  const rootBlocks = globals.match(/:root\s*\{[\s\S]*?\n\}/g) ?? [];
  const rootSource = rootBlocks.join("\n");
  const metaBlock = readCssRule(globals, ".home-thinking-featured-meta span");
  const metaActiveBlock = readCssRule(globals, ".home-thinking-featured-meta span.is-active");
  const panelBlock = readCssRule(globals, ".home-thinking-preview-panel");
  const allLinkBlock = readCssRule(globals, ".home-thinking-all-link");
  const allLinkHoverBlock = readCssRule(globals, ".home-thinking-all-link:hover");
  const previewPillBlock = readCssRule(globals, ".home-thinking-preview-panel .home-thinking-count-pill");
  const scopedSource = [
    metaBlock,
    metaActiveBlock,
    panelBlock,
    allLinkBlock,
    allLinkHoverBlock,
    previewPillBlock,
  ].join("\n").toLowerCase();

  for (const literal of ["#fffaf0", "rgba(255, 250, 240", "rgba(20, 20, 19"]) {
    assert.doesNotMatch(scopedSource, new RegExp(literal.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }

  for (const token of [
    "--home-thinking-featured-meta-border",
    "--home-thinking-featured-meta-bg",
    "--home-thinking-featured-meta-text",
    "--home-thinking-featured-meta-active-border",
    "--home-thinking-featured-meta-active-bg",
    "--home-thinking-featured-meta-active-text",
    "--home-thinking-preview-panel-border",
    "--home-thinking-preview-panel-bg",
    "--home-thinking-all-link-border",
    "--home-thinking-all-link-bg",
    "--home-thinking-all-link-text",
    "--home-thinking-all-link-hover-bg",
    "--home-thinking-preview-count-pill-border",
    "--home-thinking-preview-count-pill-bg",
    "--home-thinking-preview-count-pill-text",
  ]) {
    assert.match(rootSource, new RegExp(`${token}:\\s*`), `${token} should be declared in :root`);
  }

  assert.match(metaBlock, /border:\s*1px solid var\(--home-thinking-featured-meta-border\)/);
  assert.match(metaBlock, /background:\s*var\(--home-thinking-featured-meta-bg\)/);
  assert.match(metaBlock, /color:\s*var\(--home-thinking-featured-meta-text\)/);
  assert.match(metaActiveBlock, /border-color:\s*var\(--home-thinking-featured-meta-active-border\)/);
  assert.match(metaActiveBlock, /background:\s*var\(--home-thinking-featured-meta-active-bg\)/);
  assert.match(metaActiveBlock, /color:\s*var\(--home-thinking-featured-meta-active-text\)/);
  assert.match(panelBlock, /border:\s*1px solid var\(--home-thinking-preview-panel-border\)/);
  assert.match(panelBlock, /background:\s*var\(--home-thinking-preview-panel-bg\)/);
  assert.match(allLinkBlock, /border:\s*1px solid var\(--home-thinking-all-link-border\)/);
  assert.match(allLinkBlock, /background:\s*var\(--home-thinking-all-link-bg\)/);
  assert.match(allLinkBlock, /color:\s*var\(--home-thinking-all-link-text\)/);
  assert.match(allLinkHoverBlock, /background:\s*var\(--home-thinking-all-link-hover-bg\)/);
  assert.match(previewPillBlock, /border-color:\s*var\(--home-thinking-preview-count-pill-border\)/);
  assert.match(previewPillBlock, /background:\s*var\(--home-thinking-preview-count-pill-bg\)/);
  assert.match(previewPillBlock, /color:\s*var\(--home-thinking-preview-count-pill-text\)/);
});

test("home thinking track cards derive decorative colors from shared design tokens", async () => {
  const globals = await readProjectFile("src/app/globals.css");
  const rootBlocks = globals.match(/:root\s*\{[\s\S]*?\n\}/g) ?? [];
  const rootSource = rootBlocks.join("\n");
  const basePillBlock = readCssRule(globals, ".home-thinking-count-pill");
  const trackPillBlock = readCssRule(globals, ".home-thinking-track-head .home-thinking-count-pill");
  const baseCardBlock = readCssRule(globals, ".home-thinking-track-card");
  const trackCardMatches = [...globals.matchAll(/(^|\n)\s*\.home-thinking-track-card\s*\{[\s\S]*?\n\s*\}/g)];
  const trackCardBlock = trackCardMatches.map((match) => match[0]).find((block) => block.includes("radial-gradient")) ?? "";
  assert.ok(trackCardBlock, "home thinking track card decorative background rule should exist");
  const stripeBlock = readCssRule(globals, ".home-thinking-track-card::before");
  const orbitBlock = readCssRule(globals, ".home-thinking-track-orbit");
  const orbitDotBlock = readCssRule(globals, ".home-thinking-track-orbit::after");
  const activeBlock = globals.match(/\.home-thinking-track-card:hover,\n\.home-thinking-track-card:focus-visible,\n\.home-thinking-track-card\.is-active\s*\{[\s\S]*?\n\}/)?.[0] ?? "";
  assert.ok(activeBlock, "home thinking track active rule should exist");
  const scopedSource = [
    basePillBlock,
    trackPillBlock,
    baseCardBlock,
    trackCardBlock,
    stripeBlock,
    orbitBlock,
    orbitDotBlock,
    activeBlock,
  ].join("\n").toLowerCase();

  for (const literal of ["#fff", "rgba(216, 119, 87"]) {
    assert.doesNotMatch(scopedSource, new RegExp(literal.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }

  for (const token of [
    "--home-thinking-count-pill-border",
    "--home-thinking-count-pill-bg",
    "--home-thinking-count-pill-text",
    "--home-thinking-track-count-pill-bg",
    "--home-thinking-track-count-pill-text",
    "--home-thinking-track-card-border",
    "--home-thinking-track-card-surface-bg",
    "--home-thinking-track-card-glow",
    "--home-thinking-track-card-bg",
    "--home-thinking-track-stripe-start",
    "--home-thinking-track-stripe-end",
    "--home-thinking-track-orbit-border",
    "--home-thinking-track-orbit-dot-bg",
    "--home-thinking-track-orbit-dot-shadow",
    "--home-thinking-track-card-active-border",
  ]) {
    assert.match(rootSource, new RegExp(`${token}:\\s*`), `${token} should be declared in :root`);
  }

  assert.match(basePillBlock, /border:\s*1px solid var\(--home-thinking-count-pill-border\)/);
  assert.match(basePillBlock, /background:\s*var\(--home-thinking-count-pill-bg\)/);
  assert.match(basePillBlock, /color:\s*var\(--home-thinking-count-pill-text\)/);
  assert.match(trackPillBlock, /background:\s*var\(--home-thinking-track-count-pill-bg\)/);
  assert.match(trackPillBlock, /color:\s*var\(--home-thinking-track-count-pill-text\)/);
  assert.match(baseCardBlock, /border:\s*1px solid var\(--home-thinking-track-card-border\)/);
  assert.match(baseCardBlock, /background:\s*var\(--home-thinking-track-card-surface-bg\)/);
  assert.match(trackCardBlock, /radial-gradient\(circle at 96% 8%,\s*var\(--home-thinking-track-card-glow\),\s*transparent 34%\)/);
  assert.match(trackCardBlock, /var\(--home-thinking-track-card-bg\)/);
  assert.match(stripeBlock, /var\(--home-thinking-track-stripe-start\)/);
  assert.match(stripeBlock, /var\(--home-thinking-track-stripe-end\)/);
  assert.match(orbitBlock, /border:\s*1px solid var\(--home-thinking-track-orbit-border\)/);
  assert.match(orbitDotBlock, /background:\s*var\(--home-thinking-track-orbit-dot-bg\)/);
  assert.match(orbitDotBlock, /box-shadow:\s*var\(--home-thinking-track-orbit-dot-shadow\)/);
  assert.match(activeBlock, /border-color:\s*var\(--home-thinking-track-card-active-border\)/);
});

test("home thinking count pill shadows derive from shared design tokens", async () => {
  const globals = await readProjectFile("src/app/globals.css");
  const rootBlocks = globals.match(/:root\s*\{[\s\S]*?\n\}/g) ?? [];
  const rootSource = rootBlocks.join("\n");
  const previewPillBlock = readCssRule(globals, ".home-thinking-preview-panel .home-thinking-count-pill");
  const trackPillBlock = readCssRule(globals, ".home-thinking-track-head .home-thinking-count-pill");
  const scopedSource = [previewPillBlock, trackPillBlock].join("\n");

  assert.doesNotMatch(scopedSource, /0 8px 18px rgba\(20,\s*20,\s*19,\s*0\.2\)/);
  assert.doesNotMatch(scopedSource, /0 6px 16px rgba\(20,\s*20,\s*19,\s*0\.055\)/);
  assert.match(rootSource, /--home-thinking-preview-count-pill-shadow:\s*0 8px 18px color-mix\(in srgb,\s*var\(--foreground\) 20%,\s*transparent\)/);
  assert.match(rootSource, /--home-thinking-track-count-pill-shadow:\s*0 6px 16px color-mix\(in srgb,\s*var\(--foreground\) 5\.5%,\s*transparent\)/);
  assert.match(previewPillBlock, /box-shadow:\s*var\(--home-thinking-preview-count-pill-shadow\)/);
  assert.match(trackPillBlock, /box-shadow:\s*var\(--home-thinking-track-count-pill-shadow\)/);
});

test("home thinking preview list item colors derive from shared design tokens", async () => {
  const globals = await readProjectFile("src/app/globals.css");
  const rootBlocks = globals.match(/:root\s*\{[\s\S]*?\n\}/g) ?? [];
  const rootSource = rootBlocks.join("\n");
  const previewItemBlock = readCssRule(globals, ".home-thinking-preview-item");
  const previewItemHoverBlock = readCssRule(globals, ".home-thinking-preview-item:hover");
  const previewItemIndexBlock = readCssRule(globals, ".home-thinking-preview-item span");
  const scopedSource = [previewItemBlock, previewItemHoverBlock, previewItemIndexBlock].join("\n").toLowerCase();

  for (const literal of ["#fffaf0", "rgba(255, 250, 240"]) {
    assert.doesNotMatch(scopedSource, new RegExp(literal.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }

  assert.match(rootSource, /--home-thinking-preview-item-border:\s*color-mix\(in srgb,\s*var\(--thinking-track-accent,\s*var\(--card\)\) 20%,/);
  assert.match(rootSource, /--home-thinking-preview-item-bg:\s*color-mix\(in srgb,\s*var\(--thinking-track-accent,\s*var\(--card\)\) 12%,/);
  assert.match(rootSource, /--home-thinking-preview-item-hover-bg:\s*color-mix\(in srgb,\s*var\(--thinking-track-accent,\s*var\(--card\)\) 20%,/);
  assert.match(rootSource, /--home-thinking-preview-item-text:\s*color-mix\(in srgb,\s*var\(--card\) 90%,\s*transparent\)/);
  assert.match(rootSource, /--home-thinking-preview-item-index-text:\s*color-mix\(in srgb,\s*var\(--thinking-track-accent,\s*var\(--card\)\) 74%,\s*var\(--card\)\)/);
  assert.match(previewItemBlock, /border:\s*1px solid var\(--home-thinking-preview-item-border\)/);
  assert.match(previewItemBlock, /background:\s*var\(--home-thinking-preview-item-bg\)/);
  assert.match(previewItemBlock, /color:\s*var\(--home-thinking-preview-item-text\)/);
  assert.match(previewItemHoverBlock, /background:\s*var\(--home-thinking-preview-item-hover-bg\)/);
  assert.match(previewItemIndexBlock, /color:\s*var\(--home-thinking-preview-item-index-text\)/);
});

test("home thinking track card active shadow derives from a shared design token", async () => {
  const globals = await readProjectFile("src/app/globals.css");
  const rootBlocks = globals.match(/:root\s*\{[\s\S]*?\n\}/g) ?? [];
  const rootSource = rootBlocks.join("\n");
  const activeCardBlock = globals.match(/\.home-thinking-track-card:hover,\n\.home-thinking-track-card:focus-visible,\n\.home-thinking-track-card\.is-active\s*\{[\s\S]*?\n\}/)?.[0] ?? "";
  assert.ok(activeCardBlock, "home thinking active track card rule should exist");

  assert.doesNotMatch(activeCardBlock, /0 16px 42px rgba\(20,\s*20,\s*19,\s*0\.07\)/);
  assert.match(rootSource, /--home-thinking-track-card-active-shadow:\s*0 16px 42px color-mix\(in srgb,\s*var\(--foreground\) 7%,\s*transparent\)/);
  assert.match(activeCardBlock, /box-shadow:\s*var\(--home-thinking-track-card-active-shadow\)/);
});

test("thinking lab card and panel shadows derive from shared design tokens", async () => {
  const globals = await readProjectFile("src/app/globals.css");
  const rootBlocks = globals.match(/:root\s*\{[\s\S]*?\n\}/g) ?? [];
  const rootSource = rootBlocks.join("\n");
  const panelBlock = globals.match(/\.thinking-content-panel,\n\.thinking-tools-panel\s*\{[\s\S]*?\n\}/)?.[0] ?? "";
  const articleCardBlock = readCssRule(globals, ".thinking-article-card");
  const articleHoverBlock = readCssRule(globals, ".thinking-article-card:hover");
  const toolHoverBlock = readCssRule(globals, ".thinking-tool-card:hover");
  const scopedSource = [panelBlock, articleCardBlock, articleHoverBlock, toolHoverBlock].join("\n");

  assert.ok(panelBlock, "thinking lab panel rule should exist");
  for (const literal of [
    "0 18px 42px rgba(33, 29, 22, 0.055)",
    "0 10px 26px rgba(33, 29, 22, 0.04)",
    "0 14px 32px rgba(33, 29, 22, 0.06)",
    "0 12px 28px rgba(33, 29, 22, 0.055)",
  ]) {
    assert.doesNotMatch(scopedSource, new RegExp(literal.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }

  assert.match(rootSource, /--thinking-panel-shadow:\s*0 18px 42px color-mix\(in srgb,\s*var\(--foreground\) 5\.5%,\s*transparent\)/);
  assert.match(rootSource, /--thinking-article-card-shadow:\s*0 10px 26px color-mix\(in srgb,\s*var\(--foreground\) 4%,\s*transparent\)/);
  assert.match(rootSource, /--thinking-article-card-hover-shadow:\s*0 14px 32px color-mix\(in srgb,\s*var\(--foreground\) 6%,\s*transparent\)/);
  assert.match(rootSource, /--thinking-tool-card-hover-shadow:\s*0 12px 28px color-mix\(in srgb,\s*var\(--foreground\) 5\.5%,\s*transparent\)/);
  assert.match(panelBlock, /box-shadow:\s*var\(--thinking-panel-shadow\)/);
  assert.match(articleCardBlock, /box-shadow:\s*var\(--thinking-article-card-shadow\)/);
  assert.match(articleHoverBlock, /box-shadow:\s*var\(--thinking-article-card-hover-shadow\)/);
  assert.match(toolHoverBlock, /box-shadow:\s*var\(--thinking-tool-card-hover-shadow\)/);
});

test("thinking lab panel and card backgrounds derive from shared design tokens", async () => {
  const globals = await readProjectFile("src/app/globals.css");
  const rootBlocks = globals.match(/:root\s*\{[\s\S]*?\n\}/g) ?? [];
  const rootSource = rootBlocks.join("\n");
  const panelBlock = globals.match(/\.thinking-content-panel,\n\.thinking-tools-panel\s*\{[\s\S]*?\n\}/)?.[0] ?? "";
  const articleCardBlock = readCssRule(globals, ".thinking-article-card");
  const toolCardBlock = readCssRule(globals, ".thinking-tool-card");
  const articleHoverBlock = readCssRule(globals, ".thinking-article-card:hover");
  const toolHoverBlock = readCssRule(globals, ".thinking-tool-card:hover");

  assert.ok(panelBlock, "thinking lab panel rule should exist");
  assert.match(rootSource, /--thinking-panel-bg:\s*color-mix\(in srgb,\s*var\(--card\) 90%,\s*transparent\)/);
  assert.match(rootSource, /--thinking-article-card-bg:\s*color-mix\(in srgb,\s*var\(--card\) 92%,\s*transparent\)/);
  assert.match(rootSource, /--thinking-tool-card-bg:\s*color-mix\(in srgb,\s*var\(--card\) 88%,\s*transparent\)/);
  assert.match(rootSource, /--thinking-card-hover-bg:\s*color-mix\(in srgb,\s*var\(--accent\) 7%,\s*var\(--card\)\)/);
  assert.match(panelBlock, /background:\s*var\(--thinking-panel-bg\)/);
  assert.match(articleCardBlock, /background:\s*var\(--thinking-article-card-bg\)/);
  assert.match(toolCardBlock, /background:\s*var\(--thinking-tool-card-bg\)/);
  assert.match(articleHoverBlock, /background:\s*var\(--thinking-card-hover-bg\)/);
  assert.match(toolHoverBlock, /background:\s*var\(--thinking-card-hover-bg\)/);
});

test("thinking lab filter chip backgrounds derive from shared design tokens", async () => {
  const globals = await readProjectFile("src/app/globals.css");
  const rootBlocks = globals.match(/:root\s*\{[\s\S]*?\n\}/g) ?? [];
  const rootSource = rootBlocks.join("\n");
  const filterChipBlock = readCssRule(globals, ".thinking-filter-chip");
  const activeFilterChipBlock = readCssRule(globals, ".thinking-filter-chip.active");
  const filterChipCountBlock = readCssRule(globals, ".thinking-filter-chip span:last-child");

  assert.match(rootSource, /--thinking-filter-chip-bg:\s*color-mix\(in srgb,\s*var\(--card\) 88%,\s*var\(--background\)\)/);
  assert.match(rootSource, /--thinking-filter-chip-active-bg:\s*color-mix\(in srgb,\s*var\(--accent\) 9%,\s*var\(--card\)\)/);
  assert.match(rootSource, /--thinking-filter-chip-count-text:\s*color-mix\(in srgb,\s*var\(--muted\) 68%,\s*var\(--card\)\)/);
  assert.match(filterChipBlock, /background:\s*var\(--thinking-filter-chip-bg\)/);
  assert.match(activeFilterChipBlock, /background:\s*var\(--thinking-filter-chip-active-bg\)/);
  assert.match(filterChipCountBlock, /color:\s*var\(--thinking-filter-chip-count-text\)/);
});

test("thinking lab panels chips and cards derive border colors from shared design tokens", async () => {
  const globals = await readProjectFile("src/app/globals.css");
  const rootBlocks = globals.match(/:root\s*\{[\s\S]*?\n\}/g) ?? [];
  const rootSource = rootBlocks.join("\n");
  const panelBlock = globals.match(/\.thinking-content-panel,\n\.thinking-tools-panel\s*\{[\s\S]*?\n\}/)?.[0] ?? "";
  const filterChipBlock = readCssRule(globals, ".thinking-filter-chip");
  const activeFilterChipBlock = readCssRule(globals, ".thinking-filter-chip.active");
  const articleCardBlock = readCssRule(globals, ".thinking-article-card");
  const toolCardBlock = readCssRule(globals, ".thinking-tool-card");
  const articleHoverBlock = readCssRule(globals, ".thinking-article-card:hover");
  const toolHoverBlock = readCssRule(globals, ".thinking-tool-card:hover");

  assert.ok(panelBlock, "thinking lab panel rule should exist");
  assert.match(rootSource, /--thinking-panel-border:\s*color-mix\(in srgb,\s*var\(--foreground\) 9%,\s*var\(--border\)\)/);
  assert.match(rootSource, /--thinking-filter-chip-border:\s*color-mix\(in srgb,\s*var\(--foreground\) 8%,\s*var\(--border\)\)/);
  assert.match(rootSource, /--thinking-filter-chip-active-border:\s*color-mix\(in srgb,\s*var\(--accent\) 34%,\s*var\(--border\)\)/);
  assert.match(rootSource, /--thinking-article-card-border:\s*color-mix\(in srgb,\s*var\(--foreground\) 10%,\s*var\(--border\)\)/);
  assert.match(rootSource, /--thinking-tool-card-border:\s*color-mix\(in srgb,\s*var\(--foreground\) 9%,\s*var\(--border\)\)/);
  assert.match(rootSource, /--thinking-article-card-hover-border:\s*color-mix\(in srgb,\s*var\(--accent\) 28%,\s*var\(--border\)\)/);
  assert.match(rootSource, /--thinking-tool-card-hover-border:\s*color-mix\(in srgb,\s*var\(--accent\) 30%,\s*var\(--border\)\)/);
  assert.match(panelBlock, /border:\s*1px solid var\(--thinking-panel-border\)/);
  assert.match(filterChipBlock, /border:\s*1px solid var\(--thinking-filter-chip-border\)/);
  assert.match(activeFilterChipBlock, /border-color:\s*var\(--thinking-filter-chip-active-border\)/);
  assert.match(articleCardBlock, /border:\s*1px solid var\(--thinking-article-card-border\)/);
  assert.match(toolCardBlock, /border:\s*1px solid var\(--thinking-tool-card-border\)/);
  assert.match(articleHoverBlock, /border-color:\s*var\(--thinking-article-card-hover-border\)/);
  assert.match(toolHoverBlock, /border-color:\s*var\(--thinking-tool-card-hover-border\)/);
});

test("thinking lab index copy derives text colors from shared design tokens", async () => {
  const globals = await readProjectFile("src/app/globals.css");
  const rootBlocks = globals.match(/:root\s*\{[\s\S]*?\n\}/g) ?? [];
  const rootSource = rootBlocks.join("\n");
  const eyebrowBlock = readCssRule(globals, ".thinking-index-eyebrow");
  const titleBlock = readCssRule(globals, ".thinking-index-title");
  const introBlock = readCssRule(globals, ".thinking-index-intro");
  const panelHeadingBlock = readCssRule(globals, ".thinking-panel-head h2");
  const filterChipBlock = readCssRule(globals, ".thinking-filter-chip");
  const activeFilterChipBlock = readCssRule(globals, ".thinking-filter-chip.active");
  const articleTitleBlock = readCssRule(globals, ".thinking-article-title");
  const articleDescBlock = readCssRule(globals, ".thinking-article-desc");
  const toolNameBlock = readCssRule(globals, ".thinking-tool-name");
  const toolDescBlock = readCssRule(globals, ".thinking-tool-desc");

  assert.match(rootSource, /--thinking-eyebrow-text:\s*var\(--accent\)/);
  assert.match(rootSource, /--thinking-title-text:\s*var\(--foreground\)/);
  assert.match(rootSource, /--thinking-intro-text:\s*color-mix\(in srgb,\s*var\(--foreground\) 56%,\s*var\(--muted\)\)/);
  assert.match(rootSource, /--thinking-panel-heading-text:\s*var\(--foreground\)/);
  assert.match(rootSource, /--thinking-filter-chip-text:\s*color-mix\(in srgb,\s*var\(--foreground\) 58%,\s*var\(--muted\)\)/);
  assert.match(rootSource, /--thinking-filter-chip-active-text:\s*color-mix\(in srgb,\s*var\(--foreground\) 86%,\s*var\(--accent\)\)/);
  assert.match(rootSource, /--thinking-article-title-text:\s*var\(--foreground\)/);
  assert.match(rootSource, /--thinking-article-desc-text:\s*color-mix\(in srgb,\s*var\(--foreground\) 52%,\s*var\(--muted\)\)/);
  assert.match(rootSource, /--thinking-tool-name-text:\s*var\(--foreground\)/);
  assert.match(rootSource, /--thinking-tool-desc-text:\s*color-mix\(in srgb,\s*var\(--foreground\) 52%,\s*var\(--muted\)\)/);
  assert.match(eyebrowBlock, /color:\s*var\(--thinking-eyebrow-text\)/);
  assert.match(titleBlock, /color:\s*var\(--thinking-title-text\)/);
  assert.match(introBlock, /color:\s*var\(--thinking-intro-text\)/);
  assert.match(panelHeadingBlock, /color:\s*var\(--thinking-panel-heading-text\)/);
  assert.match(filterChipBlock, /color:\s*var\(--thinking-filter-chip-text\)/);
  assert.match(activeFilterChipBlock, /color:\s*var\(--thinking-filter-chip-active-text\)/);
  assert.match(articleTitleBlock, /color:\s*var\(--thinking-article-title-text\)/);
  assert.match(articleDescBlock, /color:\s*var\(--thinking-article-desc-text\)/);
  assert.match(toolNameBlock, /color:\s*var\(--thinking-tool-name-text\)/);
  assert.match(toolDescBlock, /color:\s*var\(--thinking-tool-desc-text\)/);
});

test("thinking lab page background texture derives from shared design tokens", async () => {
  const globals = await readProjectFile("src/app/globals.css");
  const rootBlocks = globals.match(/:root\s*\{[\s\S]*?\n\}/g) ?? [];
  const rootSource = rootBlocks.join("\n");
  const pageBlock = readCssRule(globals, ".thinking-index-page");

  for (const literal of [
    "repeating-linear-gradient(90deg, color-mix(in srgb, var(--foreground) 2%, transparent)",
    "repeating-linear-gradient(0deg, color-mix(in srgb, var(--foreground) 1.5%, transparent)",
    "linear-gradient(180deg, color-mix(in srgb, var(--card) 78%, var(--background)), var(--background) 52%)",
  ]) {
    assert.doesNotMatch(pageBlock, new RegExp(literal.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }

  assert.match(rootSource, /--thinking-page-grid-line-x:\s*color-mix\(in srgb,\s*var\(--foreground\) 2%,\s*transparent\)/);
  assert.match(rootSource, /--thinking-page-grid-line-y:\s*color-mix\(in srgb,\s*var\(--foreground\) 1\.5%,\s*transparent\)/);
  assert.match(rootSource, /--thinking-page-gradient-start:\s*color-mix\(in srgb,\s*var\(--card\) 78%,\s*var\(--background\)\)/);
  assert.match(rootSource, /--thinking-page-gradient-end:\s*var\(--background\)/);
  assert.match(pageBlock, /repeating-linear-gradient\(90deg,\s*var\(--thinking-page-grid-line-x\) 0 1px,\s*transparent 1px 64px\)/);
  assert.match(pageBlock, /repeating-linear-gradient\(0deg,\s*var\(--thinking-page-grid-line-y\) 0 1px,\s*transparent 1px 64px\)/);
  assert.match(pageBlock, /linear-gradient\(180deg,\s*var\(--thinking-page-gradient-start\),\s*var\(--thinking-page-gradient-end\) 52%\)/);
});

test("thinking lab tool icons derive colors from shared design tokens", async () => {
  const globals = await readProjectFile("src/app/globals.css");
  const rootBlocks = globals.match(/:root\s*\{[\s\S]*?\n\}/g) ?? [];
  const rootSource = rootBlocks.join("\n");
  const toolIconBlock = readCssRule(globals, ".thinking-tool-icon");
  const alternateToolIconBlock = readCssRule(globals, ".thinking-tool-list article:nth-child(2) .thinking-tool-icon");

  assert.match(rootSource, /--thinking-tool-icon-bg:\s*var\(--accent-secondary\)/);
  assert.match(rootSource, /--thinking-tool-icon-alt-bg:\s*var\(--accent-tertiary\)/);
  assert.match(rootSource, /--thinking-tool-icon-text:\s*var\(--card\)/);
  assert.match(toolIconBlock, /color:\s*var\(--thinking-tool-icon-text\)/);
  assert.match(toolIconBlock, /background:\s*var\(--thinking-tool-icon-bg\)/);
  assert.match(alternateToolIconBlock, /background:\s*var\(--thinking-tool-icon-alt-bg\)/);
});

test("thinking lab article labels and action links derive colors from shared design tokens", async () => {
  const globals = await readProjectFile("src/app/globals.css");
  const rootBlocks = globals.match(/:root\s*\{[\s\S]*?\n\}/g) ?? [];
  const rootSource = rootBlocks.join("\n");
  const articleTypeBlock = readCssRule(globals, ".thinking-article-type");
  const actionBlock = globals.match(/\.thinking-tool-action,\n\.thinking-article-action\s*\{[\s\S]*?\n\}/)?.[0] ?? "";

  assert.ok(actionBlock, "thinking lab shared action rule should exist");
  assert.match(rootSource, /--thinking-article-type-border:\s*color-mix\(in srgb,\s*var\(--foreground\) 8%,\s*var\(--border\)\)/);
  assert.match(rootSource, /--thinking-article-type-text:\s*color-mix\(in srgb,\s*var\(--foreground\) 56%,\s*var\(--muted\)\)/);
  assert.match(rootSource, /--thinking-article-type-bg:\s*color-mix\(in srgb,\s*var\(--background\) 74%,\s*var\(--card\)\)/);
  assert.match(rootSource, /--thinking-action-text:\s*var\(--foreground\)/);
  assert.match(articleTypeBlock, /border:\s*1px solid var\(--thinking-article-type-border\)/);
  assert.match(articleTypeBlock, /color:\s*var\(--thinking-article-type-text\)/);
  assert.match(articleTypeBlock, /background:\s*var\(--thinking-article-type-bg\)/);
  assert.match(actionBlock, /color:\s*var\(--thinking-action-text\)/);
});

test("study cards page shell shadows derive from shared design tokens", async () => {
  const globals = await readProjectFile("src/app/globals.css");
  const rootBlocks = globals.match(/:root\s*\{[\s\S]*?\n\}/g) ?? [];
  const rootSource = rootBlocks.join("\n");
  const backLinkBlock = readCssRule(globals, ".study-cards-back-link");
  const panelBlock = globals.match(/\.study-cards-input-panel,\n\.study-cards-output-panel\s*\{[\s\S]*?\n\}/)?.[0] ?? "";
  const scopedSource = [backLinkBlock, panelBlock].join("\n");

  assert.ok(panelBlock, "study cards input/output panel rule should exist");
  assert.doesNotMatch(scopedSource, /0 12px 30px rgba\(20,\s*20,\s*19,\s*0\.1\)/);
  assert.doesNotMatch(scopedSource, /0 18px 48px rgba\(20,\s*20,\s*19,\s*0\.08\)/);
  assert.match(rootSource, /--study-cards-back-link-shadow:\s*0 12px 30px color-mix\(in srgb,\s*var\(--foreground\) 10%,\s*transparent\)/);
  assert.match(rootSource, /--study-cards-panel-shadow:\s*0 18px 48px color-mix\(in srgb,\s*var\(--foreground\) 8%,\s*transparent\)/);
  assert.match(backLinkBlock, /box-shadow:\s*var\(--study-cards-back-link-shadow\)/);
  assert.match(panelBlock, /box-shadow:\s*var\(--study-cards-panel-shadow\)/);
});

test("study cards empty preview shadows derive from shared design tokens", async () => {
  const globals = await readProjectFile("src/app/globals.css");
  const rootBlocks = globals.match(/:root\s*\{[\s\S]*?\n\}/g) ?? [];
  const rootSource = rootBlocks.join("\n");
  const previewLayerBlock = globals.match(/\.study-cards-empty-preview::before,\n\.study-cards-empty-preview::after\s*\{[\s\S]*?\n\}/)?.[0] ?? "";
  const emptyCardBlock = readCssRule(globals, ".study-cards-empty-card");
  const scopedSource = [previewLayerBlock, emptyCardBlock].join("\n");

  assert.ok(previewLayerBlock, "study cards empty preview layer rule should exist");
  assert.doesNotMatch(scopedSource, /0 14px 34px rgba\(20,\s*20,\s*19,\s*0\.08\)/);
  assert.doesNotMatch(scopedSource, /0 24px 58px rgba\(20,\s*20,\s*19,\s*0\.13\)/);
  assert.doesNotMatch(scopedSource, /inset 0 1px 0 rgba\(255,\s*255,\s*255,\s*0\.82\)/);
  assert.match(rootSource, /--study-cards-empty-preview-shadow:\s*0 14px 34px color-mix\(in srgb,\s*var\(--foreground\) 8%,\s*transparent\)/);
  assert.match(rootSource, /--study-cards-empty-card-shadow:\s*0 24px 58px color-mix\(in srgb,\s*var\(--foreground\) 13%,\s*transparent\),\s*inset 0 1px 0 color-mix\(in srgb,\s*var\(--card\) 82%,\s*transparent\)/);
  assert.match(previewLayerBlock, /box-shadow:\s*var\(--study-cards-empty-preview-shadow\)/);
  assert.match(emptyCardBlock, /box-shadow:\s*var\(--study-cards-empty-card-shadow\)/);
});

test("study cards practice deck shadows derive from shared design tokens", async () => {
  const globals = await readProjectFile("src/app/globals.css");
  const rootBlocks = globals.match(/:root\s*\{[\s\S]*?\n\}/g) ?? [];
  const rootSource = rootBlocks.join("\n");
  const deckLayerBlock = globals.match(/\.study-cards-deck::before,\n\.study-cards-deck::after\s*\{[\s\S]*?\n\}/)?.[0] ?? "";
  const dragNextBlock = readCssRule(globals, ".study-cards-card-stage.is-drag-next");
  const dragPrevBlock = readCssRule(globals, ".study-cards-card-stage.is-drag-prev");
  const practiceCardBlock = readCssRule(globals, ".study-cards-practice-card");
  const scopedSource = [deckLayerBlock, dragNextBlock, dragPrevBlock, practiceCardBlock].join("\n");

  assert.ok(deckLayerBlock, "study cards deck layer rule should exist");
  assert.doesNotMatch(scopedSource, /0 18px 44px rgba\(20,\s*20,\s*19,\s*0\.08\)/);
  assert.doesNotMatch(scopedSource, /drop-shadow\(16px 20px 24px rgba\(20,\s*20,\s*19,\s*0\.12\)\)/);
  assert.doesNotMatch(scopedSource, /drop-shadow\(-16px 20px 24px rgba\(20,\s*20,\s*19,\s*0\.12\)\)/);
  assert.doesNotMatch(scopedSource, /0 34px 86px rgba\(20,\s*20,\s*19,\s*0\.18\)/);
  assert.doesNotMatch(scopedSource, /0 8px 22px rgba\(20,\s*20,\s*19,\s*0\.1\)/);
  assert.doesNotMatch(scopedSource, /inset 0 1px 0 rgba\(255,\s*255,\s*255,\s*0\.92\)/);
  assert.match(rootSource, /--study-cards-deck-layer-shadow:\s*0 18px 44px color-mix\(in srgb,\s*var\(--foreground\) 8%,\s*transparent\),\s*inset 0 1px 0 color-mix\(in srgb,\s*var\(--card\) 72%,\s*transparent\)/);
  assert.match(rootSource, /--study-cards-drag-next-shadow:\s*drop-shadow\(16px 20px 24px color-mix\(in srgb,\s*var\(--foreground\) 12%,\s*transparent\)\)/);
  assert.match(rootSource, /--study-cards-drag-prev-shadow:\s*drop-shadow\(-16px 20px 24px color-mix\(in srgb,\s*var\(--foreground\) 12%,\s*transparent\)\)/);
  assert.match(rootSource, /--study-cards-practice-card-shadow:\s*0 34px 86px color-mix\(in srgb,\s*var\(--foreground\) 18%,\s*transparent\),\s*0 8px 22px color-mix\(in srgb,\s*var\(--foreground\) 10%,\s*transparent\),\s*inset 0 1px 0 color-mix\(in srgb,\s*var\(--card\) 92%,\s*transparent\)/);
  assert.match(deckLayerBlock, /box-shadow:\s*var\(--study-cards-deck-layer-shadow\)/);
  assert.match(dragNextBlock, /filter:\s*var\(--study-cards-drag-next-shadow\)/);
  assert.match(dragPrevBlock, /filter:\s*var\(--study-cards-drag-prev-shadow\)/);
  assert.match(practiceCardBlock, /box-shadow:\s*var\(--study-cards-practice-card-shadow\)/);
});

test("study cards answer and nav shadows derive from shared design tokens", async () => {
  const globals = await readProjectFile("src/app/globals.css");
  const rootBlocks = globals.match(/:root\s*\{[\s\S]*?\n\}/g) ?? [];
  const rootSource = rootBlocks.join("\n");
  const answerHoverBlock = readCssRule(globals, ".study-cards-answer-panel:hover");
  const answerRevealedBlock = readCssRule(globals, ".study-cards-answer-panel.is-revealed");
  const navArrowBlock = readCssRule(globals, ".study-cards-nav-arrow");
  const scopedSource = [answerHoverBlock, answerRevealedBlock, navArrowBlock].join("\n");

  assert.doesNotMatch(scopedSource, /0 16px 36px rgba\(69,\s*113,\s*157,\s*0\.12\)/);
  assert.doesNotMatch(scopedSource, /inset 0 1px 0 rgba\(255,\s*255,\s*255,\s*0\.78\)/);
  assert.doesNotMatch(scopedSource, /inset 0 1px 0 rgba\(255,\s*255,\s*255,\s*0\.82\)/);
  assert.doesNotMatch(scopedSource, /0 14px 30px rgba\(20,\s*20,\s*19,\s*0\.12\)/);
  assert.doesNotMatch(scopedSource, /inset 0 1px 0 rgba\(255,\s*255,\s*255,\s*0\.86\)/);
  assert.match(rootSource, /--study-cards-answer-panel-hover-shadow:\s*0 16px 36px color-mix\(in srgb,\s*var\(--accent-secondary\) 12%,\s*transparent\),\s*inset 0 1px 0 color-mix\(in srgb,\s*var\(--card\) 78%,\s*transparent\)/);
  assert.match(rootSource, /--study-cards-answer-panel-revealed-shadow:\s*inset 0 1px 0 color-mix\(in srgb,\s*var\(--card\) 82%,\s*transparent\)/);
  assert.match(rootSource, /--study-cards-nav-arrow-shadow:\s*0 14px 30px color-mix\(in srgb,\s*var\(--foreground\) 12%,\s*transparent\),\s*inset 0 1px 0 color-mix\(in srgb,\s*var\(--card\) 86%,\s*transparent\)/);
  assert.match(answerHoverBlock, /box-shadow:\s*var\(--study-cards-answer-panel-hover-shadow\)/);
  assert.match(answerRevealedBlock, /box-shadow:\s*var\(--study-cards-answer-panel-revealed-shadow\)/);
  assert.match(navArrowBlock, /box-shadow:\s*var\(--study-cards-nav-arrow-shadow\)/);
});

test("study cards nav arrow colors derive from shared design tokens", async () => {
  const globals = await readProjectFile("src/app/globals.css");
  const rootBlocks = globals.match(/:root\s*\{[\s\S]*?\n\}/g) ?? [];
  const rootSource = rootBlocks.join("\n");
  const navArrowBlock = readCssRule(globals, ".study-cards-nav-arrow");
  const navArrowHoverBlock = readCssRule(globals, ".study-cards-nav-arrow:hover");

  assert.match(rootSource, /--study-cards-nav-arrow-border:\s*color-mix\(in srgb,\s*var\(--border\) 84%,\s*transparent\)/);
  assert.match(rootSource, /--study-cards-nav-arrow-bg:\s*color-mix\(in srgb,\s*var\(--card\) 90%,\s*transparent\)/);
  assert.match(rootSource, /--study-cards-nav-arrow-text:\s*color-mix\(in srgb,\s*var\(--foreground\) 72%,\s*var\(--muted\)\)/);
  assert.match(rootSource, /--study-cards-nav-arrow-hover-border:\s*color-mix\(in srgb,\s*var\(--accent-secondary\) 42%,\s*var\(--border\)\)/);
  assert.match(rootSource, /--study-cards-nav-arrow-hover-bg:\s*var\(--card\)/);
  assert.match(rootSource, /--study-cards-nav-arrow-hover-text:\s*var\(--foreground\)/);
  assert.match(navArrowBlock, /border:\s*1px solid var\(--study-cards-nav-arrow-border\)/);
  assert.match(navArrowBlock, /background:\s*var\(--study-cards-nav-arrow-bg\)/);
  assert.match(navArrowBlock, /color:\s*var\(--study-cards-nav-arrow-text\)/);
  assert.match(navArrowHoverBlock, /border-color:\s*var\(--study-cards-nav-arrow-hover-border\)/);
  assert.match(navArrowHoverBlock, /background:\s*var\(--study-cards-nav-arrow-hover-bg\)/);
  assert.match(navArrowHoverBlock, /color:\s*var\(--study-cards-nav-arrow-hover-text\)/);
});

test("study cards completion shadows derive from shared design tokens", async () => {
  const globals = await readProjectFile("src/app/globals.css");
  const rootBlocks = globals.match(/:root\s*\{[\s\S]*?\n\}/g) ?? [];
  const rootSource = rootBlocks.join("\n");
  const bingoBlock = readCssRule(globals, ".study-cards-bingo");
  const bingoIconBlock = readCssRule(globals, ".study-cards-bingo-icon");
  const scopedSource = [bingoBlock, bingoIconBlock].join("\n");

  assert.doesNotMatch(scopedSource, /0 30px 70px rgba\(20,\s*20,\s*19,\s*0\.12\)/);
  assert.doesNotMatch(scopedSource, /inset 0 1px 0 rgba\(255,\s*255,\s*255,\s*0\.84\)/);
  assert.doesNotMatch(scopedSource, /0 18px 36px rgba\(20,\s*20,\s*19,\s*0\.1\)/);
  assert.match(rootSource, /--study-cards-bingo-shadow:\s*0 30px 70px color-mix\(in srgb,\s*var\(--foreground\) 12%,\s*transparent\),\s*inset 0 1px 0 color-mix\(in srgb,\s*var\(--card\) 84%,\s*transparent\)/);
  assert.match(rootSource, /--study-cards-bingo-icon-shadow:\s*0 18px 36px color-mix\(in srgb,\s*var\(--foreground\) 10%,\s*transparent\)/);
  assert.match(bingoBlock, /box-shadow:\s*var\(--study-cards-bingo-shadow\)/);
  assert.match(bingoIconBlock, /box-shadow:\s*var\(--study-cards-bingo-icon-shadow\)/);
});

test("study cards completion surface colors derive from shared design tokens", async () => {
  const globals = await readProjectFile("src/app/globals.css");
  const rootBlocks = globals.match(/:root\s*\{[\s\S]*?\n\}/g) ?? [];
  const rootSource = rootBlocks.join("\n");
  const bingoBlock = readCssRule(globals, ".study-cards-bingo");
  const bingoIconBlock = readCssRule(globals, ".study-cards-bingo-icon");
  const bingoKickerBlock = readCssRule(globals, ".study-cards-bingo p");
  const bingoCopyBlock = readCssRule(globals, ".study-cards-bingo > span:not(.study-cards-bingo-icon)");

  assert.match(rootSource, /--study-cards-bingo-border:\s*color-mix\(in srgb,\s*var\(--accent-tertiary\) 28%,\s*var\(--border\)\)/);
  assert.match(rootSource, /--study-cards-bingo-bg:\s*radial-gradient\(circle at 50% 20%,\s*color-mix\(in srgb,\s*var\(--accent-tertiary\) 20%,\s*transparent\),\s*transparent 34%\),\s*linear-gradient\(135deg,\s*color-mix\(in srgb,\s*var\(--accent-secondary\) 9%,\s*var\(--card\)\),\s*color-mix\(in srgb,\s*var\(--background\) 62%,\s*var\(--card\)\)\),\s*var\(--card\)/);
  assert.match(rootSource, /--study-cards-bingo-text:\s*var\(--foreground\)/);
  assert.match(rootSource, /--study-cards-bingo-icon-border:\s*color-mix\(in srgb,\s*var\(--accent-tertiary\) 36%,\s*var\(--border\)\)/);
  assert.match(rootSource, /--study-cards-bingo-icon-bg:\s*color-mix\(in srgb,\s*var\(--accent-tertiary\) 14%,\s*var\(--card\)\)/);
  assert.match(rootSource, /--study-cards-bingo-icon-text:\s*color-mix\(in srgb,\s*var\(--accent-tertiary\) 78%,\s*var\(--foreground\)\)/);
  assert.match(rootSource, /--study-cards-bingo-kicker-text:\s*color-mix\(in srgb,\s*var\(--accent-tertiary\) 76%,\s*var\(--foreground\)\)/);
  assert.match(rootSource, /--study-cards-bingo-copy-text:\s*color-mix\(in srgb,\s*var\(--foreground\) 58%,\s*var\(--muted\)\)/);
  assert.match(bingoBlock, /border:\s*1px solid var\(--study-cards-bingo-border\)/);
  assert.match(bingoBlock, /background:\s*var\(--study-cards-bingo-bg\)/);
  assert.match(bingoBlock, /color:\s*var\(--study-cards-bingo-text\)/);
  assert.match(bingoIconBlock, /border:\s*1px solid var\(--study-cards-bingo-icon-border\)/);
  assert.match(bingoIconBlock, /background:\s*var\(--study-cards-bingo-icon-bg\)/);
  assert.match(bingoIconBlock, /color:\s*var\(--study-cards-bingo-icon-text\)/);
  assert.match(bingoKickerBlock, /color:\s*var\(--study-cards-bingo-kicker-text\)/);
  assert.match(bingoCopyBlock, /color:\s*var\(--study-cards-bingo-copy-text\)/);
});

test("study cards mobile practice deck layer shadow derives from shared design tokens", async () => {
  const globals = await readProjectFile("src/app/globals.css");
  const rootBlocks = globals.match(/:root\s*\{[\s\S]*?\n\}/g) ?? [];
  const rootSource = rootBlocks.join("\n");
  const mobileDeckLayerBlock = readLastCssRule(
    globals,
    ".study-cards-page.is-mobile-practice .study-cards-deck::before,\n  .study-cards-page.is-mobile-practice .study-cards-deck::after",
  );

  for (const literal of [
    "0 14px 28px rgba(20, 20, 19, 0.08)",
    "inset 0 1px 0 rgba(255, 255, 255, 0.7)",
  ]) {
    assert.doesNotMatch(mobileDeckLayerBlock, new RegExp(literal.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }

  assert.match(rootSource, /--study-cards-mobile-deck-layer-shadow:\s*0 14px 28px color-mix\(in srgb,\s*var\(--foreground\) 8%,\s*transparent\),\s*inset 0 1px 0 color-mix\(in srgb,\s*var\(--card\) 70%,\s*transparent\)/);
  assert.match(mobileDeckLayerBlock, /box-shadow:\s*var\(--study-cards-mobile-deck-layer-shadow\)/);
});

test("study cards loaded input panel shadow derives from shared design tokens", async () => {
  const globals = await readProjectFile("src/app/globals.css");
  const rootBlocks = globals.match(/:root\s*\{[\s\S]*?\n\}/g) ?? [];
  const rootSource = rootBlocks.join("\n");
  const loadedInputPanelBlock = readCssRule(globals, ".study-cards-page.has-result .study-cards-input-panel");

  assert.doesNotMatch(loadedInputPanelBlock, /0 14px 34px rgba\(20,\s*20,\s*19,\s*0\.06\)/);
  assert.match(rootSource, /--study-cards-loaded-input-panel-shadow:\s*0 14px 34px color-mix\(in srgb,\s*var\(--foreground\) 6%,\s*transparent\)/);
  assert.match(loadedInputPanelBlock, /box-shadow:\s*var\(--study-cards-loaded-input-panel-shadow\)/);
});

test("study cards error alert colors derive from shared design tokens", async () => {
  const globals = await readProjectFile("src/app/globals.css");
  const rootBlocks = globals.match(/:root\s*\{[\s\S]*?\n\}/g) ?? [];
  const rootSource = rootBlocks.join("\n");
  const errorBlock = readCssRule(globals, ".study-cards-error");

  for (const literal of ["#c2410c", "#9a3412"]) {
    assert.doesNotMatch(errorBlock.toLowerCase(), new RegExp(literal));
  }

  assert.match(rootSource, /--study-cards-error-border:\s*color-mix\(in srgb,\s*var\(--accent\) 24%,\s*var\(--border\)\)/);
  assert.match(rootSource, /--study-cards-error-bg:\s*color-mix\(in srgb,\s*var\(--accent\) 8%,\s*var\(--card\)\)/);
  assert.match(rootSource, /--study-cards-error-text:\s*color-mix\(in srgb,\s*var\(--accent\) 86%,\s*var\(--foreground\)\)/);
  assert.match(errorBlock, /border:\s*1px solid var\(--study-cards-error-border\)/);
  assert.match(errorBlock, /background:\s*var\(--study-cards-error-bg\)/);
  assert.match(errorBlock, /color:\s*var\(--study-cards-error-text\)/);
});

test("study cards progress colors derive from shared design tokens", async () => {
  const globals = await readProjectFile("src/app/globals.css");
  const rootBlocks = globals.match(/:root\s*\{[\s\S]*?\n\}/g) ?? [];
  const rootSource = rootBlocks.join("\n");
  const progressBlock = readCssRule(globals, ".study-cards-progress");
  const progressTopBlock = readCssRule(globals, ".study-cards-progress-top");
  const progressTrackBlock = readCssRule(globals, ".study-cards-progress-track");
  const progressTrackFillBlock = readCssRule(globals, ".study-cards-progress-track span");

  assert.match(rootSource, /--study-cards-progress-border:\s*color-mix\(in srgb,\s*var\(--accent-secondary\) 24%,\s*var\(--border\)\)/);
  assert.match(rootSource, /--study-cards-progress-bg:\s*color-mix\(in srgb,\s*var\(--accent-secondary\) 7%,\s*var\(--card\)\)/);
  assert.match(rootSource, /--study-cards-progress-text:\s*color-mix\(in srgb,\s*var\(--foreground\) 76%,\s*var\(--muted\)\)/);
  assert.match(rootSource, /--study-cards-progress-track-bg:\s*color-mix\(in srgb,\s*var\(--border\) 78%,\s*var\(--card\)\)/);
  assert.match(rootSource, /--study-cards-progress-track-fill:\s*linear-gradient\(90deg,\s*var\(--accent\),\s*var\(--accent-secondary\),\s*var\(--accent-tertiary\)\)/);
  assert.match(progressBlock, /border:\s*1px solid var\(--study-cards-progress-border\)/);
  assert.match(progressBlock, /background:\s*var\(--study-cards-progress-bg\)/);
  assert.match(progressTopBlock, /color:\s*var\(--study-cards-progress-text\)/);
  assert.match(progressTrackBlock, /background:\s*var\(--study-cards-progress-track-bg\)/);
  assert.match(progressTrackFillBlock, /background:\s*var\(--study-cards-progress-track-fill\)/);
});

test("study cards input action button colors derive from shared design tokens", async () => {
  const globals = await readProjectFile("src/app/globals.css");
  const rootBlocks = globals.match(/:root\s*\{[\s\S]*?\n\}/g) ?? [];
  const rootSource = rootBlocks.join("\n");
  const actionButtonBlock = readCssRule(globals, ".study-cards-actions button");
  const actionButtonHoverBlock = readCssRule(globals, ".study-cards-actions button:hover");
  const primaryButtonBlock = readCssRule(globals, ".study-cards-actions .study-cards-primary");

  assert.match(rootSource, /--study-cards-action-button-border:\s*color-mix\(in srgb,\s*var\(--border\) 86%,\s*transparent\)/);
  assert.match(rootSource, /--study-cards-action-button-bg:\s*var\(--card\)/);
  assert.match(rootSource, /--study-cards-action-button-text:\s*var\(--foreground\)/);
  assert.match(rootSource, /--study-cards-action-button-hover-border:\s*color-mix\(in srgb,\s*var\(--accent-secondary\) 36%,\s*var\(--border\)\)/);
  assert.match(rootSource, /--study-cards-primary-action-border:\s*color-mix\(in srgb,\s*var\(--foreground\) 12%,\s*var\(--accent\)\)/);
  assert.match(rootSource, /--study-cards-primary-action-bg:\s*var\(--foreground\)/);
  assert.match(rootSource, /--study-cards-primary-action-text:\s*var\(--background\)/);
  assert.match(actionButtonBlock, /border:\s*1px solid var\(--study-cards-action-button-border\)/);
  assert.match(actionButtonBlock, /background:\s*var\(--study-cards-action-button-bg\)/);
  assert.match(actionButtonBlock, /color:\s*var\(--study-cards-action-button-text\)/);
  assert.match(actionButtonHoverBlock, /border-color:\s*var\(--study-cards-action-button-hover-border\)/);
  assert.match(primaryButtonBlock, /border-color:\s*var\(--study-cards-primary-action-border\)/);
  assert.match(primaryButtonBlock, /background:\s*var\(--study-cards-primary-action-bg\)/);
  assert.match(primaryButtonBlock, /color:\s*var\(--study-cards-primary-action-text\)/);
});

test("study cards result action button colors derive from shared design tokens", async () => {
  const globals = await readProjectFile("src/app/globals.css");
  const rootBlocks = globals.match(/:root\s*\{[\s\S]*?\n\}/g) ?? [];
  const rootSource = rootBlocks.join("\n");
  const resultActionButtonBlock = readCssRule(globals, ".study-cards-result-actions button");
  const resultActionButtonHoverBlock = readCssRule(globals, ".study-cards-result-actions button:hover");

  assert.match(rootSource, /--study-cards-result-action-button-border:\s*color-mix\(in srgb,\s*var\(--border\) 82%,\s*transparent\)/);
  assert.match(rootSource, /--study-cards-result-action-button-bg:\s*color-mix\(in srgb,\s*var\(--card\) 90%,\s*var\(--background\)\)/);
  assert.match(rootSource, /--study-cards-result-action-button-text:\s*color-mix\(in srgb,\s*var\(--foreground\) 68%,\s*var\(--muted\)\)/);
  assert.match(rootSource, /--study-cards-result-action-button-hover-border:\s*color-mix\(in srgb,\s*var\(--accent-secondary\) 36%,\s*var\(--border\)\)/);
  assert.match(rootSource, /--study-cards-result-action-button-hover-bg:\s*var\(--card\)/);
  assert.match(rootSource, /--study-cards-result-action-button-hover-text:\s*var\(--foreground\)/);
  assert.match(resultActionButtonBlock, /border:\s*1px solid var\(--study-cards-result-action-button-border\)/);
  assert.match(resultActionButtonBlock, /background:\s*var\(--study-cards-result-action-button-bg\)/);
  assert.match(resultActionButtonBlock, /color:\s*var\(--study-cards-result-action-button-text\)/);
  assert.match(resultActionButtonHoverBlock, /border-color:\s*var\(--study-cards-result-action-button-hover-border\)/);
  assert.match(resultActionButtonHoverBlock, /background:\s*var\(--study-cards-result-action-button-hover-bg\)/);
  assert.match(resultActionButtonHoverBlock, /color:\s*var\(--study-cards-result-action-button-hover-text\)/);
});

test("study cards result count colors derive from shared design tokens", async () => {
  const globals = await readProjectFile("src/app/globals.css");
  const rootBlocks = globals.match(/:root\s*\{[\s\S]*?\n\}/g) ?? [];
  const rootSource = rootBlocks.join("\n");
  const resultCountBlock = readCssRule(globals, ".study-cards-result-count");

  assert.match(rootSource, /--study-cards-result-count-border:\s*color-mix\(in srgb,\s*var\(--accent-secondary\) 24%,\s*var\(--border\)\)/);
  assert.match(rootSource, /--study-cards-result-count-bg:\s*color-mix\(in srgb,\s*var\(--accent-secondary\) 9%,\s*var\(--card\)\)/);
  assert.match(rootSource, /--study-cards-result-count-text:\s*color-mix\(in srgb,\s*var\(--foreground\) 74%,\s*var\(--accent-secondary\)\)/);
  assert.match(resultCountBlock, /border:\s*1px solid var\(--study-cards-result-count-border\)/);
  assert.match(resultCountBlock, /background:\s*var\(--study-cards-result-count-bg\)/);
  assert.match(resultCountBlock, /color:\s*var\(--study-cards-result-count-text\)/);
});

test("study cards mobile edit button colors derive from shared design tokens", async () => {
  const globals = await readProjectFile("src/app/globals.css");
  const rootBlocks = globals.match(/:root\s*\{[\s\S]*?\n\}/g) ?? [];
  const rootSource = rootBlocks.join("\n");
  const mobileEditButtonBlock = readLastCssRule(globals, ".study-cards-page.is-mobile-practice .study-cards-mobile-edit-button");

  assert.match(rootSource, /--study-cards-mobile-edit-button-border:\s*color-mix\(in srgb,\s*var\(--border\) 80%,\s*transparent\)/);
  assert.match(rootSource, /--study-cards-mobile-edit-button-bg:\s*color-mix\(in srgb,\s*var\(--card\) 84%,\s*transparent\)/);
  assert.match(rootSource, /--study-cards-mobile-edit-button-text:\s*color-mix\(in srgb,\s*var\(--foreground\) 70%,\s*var\(--muted\)\)/);
  assert.match(mobileEditButtonBlock, /border:\s*1px solid var\(--study-cards-mobile-edit-button-border\)/);
  assert.match(mobileEditButtonBlock, /background:\s*var\(--study-cards-mobile-edit-button-bg\)/);
  assert.match(mobileEditButtonBlock, /color:\s*var\(--study-cards-mobile-edit-button-text\)/);
});

test("study cards memory feedback button colors derive from shared design tokens", async () => {
  const globals = await readProjectFile("src/app/globals.css");
  const rootBlocks = globals.match(/:root\s*\{[\s\S]*?\n\}/g) ?? [];
  const rootSource = rootBlocks.join("\n");
  const memoryActionButtonBlock = readCssRule(globals, ".study-cards-memory-actions button");
  const shakyButtonBlock = readCssRule(globals, ".study-cards-memory-actions .is-shaky");

  assert.match(rootSource, /--study-cards-memory-action-button-border:\s*color-mix\(in srgb,\s*var\(--border\) 84%,\s*transparent\)/);
  assert.match(rootSource, /--study-cards-memory-action-button-bg:\s*color-mix\(in srgb,\s*var\(--card\) 90%,\s*var\(--background\)\)/);
  assert.match(rootSource, /--study-cards-memory-action-button-text:\s*color-mix\(in srgb,\s*var\(--foreground\) 78%,\s*var\(--muted\)\)/);
  assert.match(rootSource, /--study-cards-memory-action-shaky-border:\s*color-mix\(in srgb,\s*var\(--accent\) 24%,\s*var\(--border\)\)/);
  assert.match(rootSource, /--study-cards-memory-action-shaky-bg:\s*color-mix\(in srgb,\s*var\(--accent\) 7%,\s*var\(--card\)\)/);
  assert.match(rootSource, /--study-cards-memory-action-shaky-text:\s*color-mix\(in srgb,\s*var\(--accent\) 84%,\s*var\(--foreground\)\)/);
  assert.match(memoryActionButtonBlock, /border:\s*1px solid var\(--study-cards-memory-action-button-border\)/);
  assert.match(memoryActionButtonBlock, /background:\s*var\(--study-cards-memory-action-button-bg\)/);
  assert.match(memoryActionButtonBlock, /color:\s*var\(--study-cards-memory-action-button-text\)/);
  assert.match(shakyButtonBlock, /border-color:\s*var\(--study-cards-memory-action-shaky-border\)/);
  assert.match(shakyButtonBlock, /background:\s*var\(--study-cards-memory-action-shaky-bg\)/);
  assert.match(shakyButtonBlock, /color:\s*var\(--study-cards-memory-action-shaky-text\)/);
});

test("study cards memory feedback helper text derives from shared design tokens", async () => {
  const globals = await readProjectFile("src/app/globals.css");
  const rootBlocks = globals.match(/:root\s*\{[\s\S]*?\n\}/g) ?? [];
  const rootSource = rootBlocks.join("\n");
  const memoryHelperBlock = readCssRule(globals, ".study-cards-memory-actions small");

  assert.match(rootSource, /--study-cards-memory-helper-text:\s*color-mix\(in srgb,\s*var\(--foreground\) 48%,\s*var\(--muted\)\)/);
  assert.match(memoryHelperBlock, /color:\s*var\(--study-cards-memory-helper-text\)/);
});

test("study cards pronunciation button colors derive from shared design tokens", async () => {
  const globals = await readProjectFile("src/app/globals.css");
  const rootBlocks = globals.match(/:root\s*\{[\s\S]*?\n\}/g) ?? [];
  const rootSource = rootBlocks.join("\n");
  const emptySpeakBlock = readCssRule(globals, ".study-cards-empty-speak");
  const speakButtonBlock = readCssRule(globals, ".study-cards-speak-button");
  const speakButtonHoverBlock = readCssRule(globals, ".study-cards-speak-button:hover");

  assert.match(rootSource, /--study-cards-speak-button-border:\s*color-mix\(in srgb,\s*var\(--accent-secondary\) 28%,\s*var\(--border\)\)/);
  assert.match(rootSource, /--study-cards-speak-button-bg:\s*color-mix\(in srgb,\s*var\(--accent-secondary\) 8%,\s*var\(--card\)\)/);
  assert.match(rootSource, /--study-cards-speak-button-text:\s*color-mix\(in srgb,\s*var\(--accent-secondary\) 82%,\s*var\(--foreground\)\)/);
  assert.match(rootSource, /--study-cards-speak-button-hover-border:\s*color-mix\(in srgb,\s*var\(--accent-secondary\) 52%,\s*var\(--border\)\)/);
  assert.match(rootSource, /--study-cards-speak-button-hover-bg:\s*color-mix\(in srgb,\s*var\(--accent-secondary\) 14%,\s*var\(--card\)\)/);
  assert.match(rootSource, /--study-cards-speak-button-hover-text:\s*var\(--foreground\)/);
  assert.match(emptySpeakBlock, /border:\s*1px solid var\(--study-cards-speak-button-border\)/);
  assert.match(emptySpeakBlock, /background:\s*var\(--study-cards-speak-button-bg\)/);
  assert.match(emptySpeakBlock, /color:\s*var\(--study-cards-speak-button-text\)/);
  assert.match(speakButtonBlock, /border:\s*1px solid var\(--study-cards-speak-button-border\)/);
  assert.match(speakButtonBlock, /background:\s*var\(--study-cards-speak-button-bg\)/);
  assert.match(speakButtonBlock, /color:\s*var\(--study-cards-speak-button-text\)/);
  assert.match(speakButtonHoverBlock, /border-color:\s*var\(--study-cards-speak-button-hover-border\)/);
  assert.match(speakButtonHoverBlock, /background:\s*var\(--study-cards-speak-button-hover-bg\)/);
  assert.match(speakButtonHoverBlock, /color:\s*var\(--study-cards-speak-button-hover-text\)/);
});

test("study cards recall hint colors derive from shared design tokens", async () => {
  const globals = await readProjectFile("src/app/globals.css");
  const rootBlocks = globals.match(/:root\s*\{[\s\S]*?\n\}/g) ?? [];
  const rootSource = rootBlocks.join("\n");
  const recallHintBlock = readCssRule(globals, ".study-cards-recall-hint");
  const recallHintLabelBlock = readCssRule(globals, ".study-cards-recall-hint span");

  assert.match(rootSource, /--study-cards-recall-hint-border:\s*color-mix\(in srgb,\s*var\(--accent\) 18%,\s*var\(--border\)\)/);
  assert.match(rootSource, /--study-cards-recall-hint-bg:\s*color-mix\(in srgb,\s*var\(--accent\) 7%,\s*var\(--card\)\)/);
  assert.match(rootSource, /--study-cards-recall-hint-text:\s*color-mix\(in srgb,\s*var\(--foreground\) 62%,\s*var\(--muted\)\)/);
  assert.match(rootSource, /--study-cards-recall-hint-label-text:\s*color-mix\(in srgb,\s*var\(--accent\) 84%,\s*var\(--foreground\)\)/);
  assert.match(recallHintBlock, /border:\s*1px solid var\(--study-cards-recall-hint-border\)/);
  assert.match(recallHintBlock, /background:\s*var\(--study-cards-recall-hint-bg\)/);
  assert.match(recallHintBlock, /color:\s*var\(--study-cards-recall-hint-text\)/);
  assert.match(recallHintLabelBlock, /color:\s*var\(--study-cards-recall-hint-label-text\)/);
});

test("study cards answer panel colors derive from shared design tokens", async () => {
  const globals = await readProjectFile("src/app/globals.css");
  const rootBlocks = globals.match(/:root\s*\{[\s\S]*?\n\}/g) ?? [];
  const rootSource = rootBlocks.join("\n");
  const answerPanelBlock = readCssRule(globals, ".study-cards-answer-panel");
  const hiddenPanelBlock = readCssRule(globals, ".study-cards-answer-panel.is-hidden");
  const hiddenFrameBlock = readCssRule(globals, ".study-cards-answer-panel.is-hidden::before");
  const hoverPanelBlock = readCssRule(globals, ".study-cards-answer-panel:hover");
  const focusPanelBlock = readCssRule(globals, ".study-cards-answer-panel:focus-visible");
  const revealedPanelBlock = readCssRule(globals, ".study-cards-answer-panel.is-revealed");

  assert.match(rootSource, /--study-cards-answer-panel-border:\s*color-mix\(in srgb,\s*var\(--accent-secondary\) 24%,\s*var\(--border\)\)/);
  assert.match(rootSource, /--study-cards-answer-panel-bg:\s*linear-gradient\(180deg,\s*color-mix\(in srgb,\s*var\(--background\) 70%,\s*var\(--card\)\),\s*color-mix\(in srgb,\s*var\(--card\) 94%,\s*var\(--background\)\)\),\s*var\(--card\)/);
  assert.match(rootSource, /--study-cards-answer-panel-text:\s*color-mix\(in srgb,\s*var\(--foreground\) 74%,\s*var\(--muted\)\)/);
  assert.match(rootSource, /--study-cards-answer-panel-hidden-border:\s*color-mix\(in srgb,\s*var\(--accent-secondary\) 34%,\s*var\(--border\)\)/);
  assert.match(rootSource, /--study-cards-answer-panel-hidden-frame-border:\s*color-mix\(in srgb,\s*var\(--accent-secondary\) 12%,\s*transparent\)/);
  assert.match(rootSource, /--study-cards-answer-panel-hover-border:\s*color-mix\(in srgb,\s*var\(--accent-secondary\) 52%,\s*var\(--border\)\)/);
  assert.match(rootSource, /--study-cards-answer-panel-focus-outline:\s*color-mix\(in srgb,\s*var\(--accent-secondary\) 54%,\s*transparent\)/);
  assert.match(rootSource, /--study-cards-answer-panel-revealed-border:\s*color-mix\(in srgb,\s*var\(--accent-tertiary\) 28%,\s*var\(--border\)\)/);
  assert.match(answerPanelBlock, /border:\s*1px solid var\(--study-cards-answer-panel-border\)/);
  assert.match(answerPanelBlock, /background:\s*var\(--study-cards-answer-panel-bg\)/);
  assert.match(answerPanelBlock, /color:\s*var\(--study-cards-answer-panel-text\)/);
  assert.match(hiddenPanelBlock, /border-color:\s*var\(--study-cards-answer-panel-hidden-border\)/);
  assert.match(hiddenPanelBlock, /background:\s*var\(--study-cards-answer-panel-hidden-bg\)/);
  assert.match(hiddenFrameBlock, /border:\s*1px solid var\(--study-cards-answer-panel-hidden-frame-border\)/);
  assert.match(hoverPanelBlock, /border-color:\s*var\(--study-cards-answer-panel-hover-border\)/);
  assert.match(hoverPanelBlock, /background:\s*var\(--study-cards-answer-panel-hover-bg\)/);
  assert.match(focusPanelBlock, /outline:\s*2px solid var\(--study-cards-answer-panel-focus-outline\)/);
  assert.match(revealedPanelBlock, /border-color:\s*var\(--study-cards-answer-panel-revealed-border\)/);
  assert.match(revealedPanelBlock, /background:\s*var\(--study-cards-answer-panel-revealed-bg\)/);
});

test("study cards answer content colors derive from shared design tokens", async () => {
  const globals = await readProjectFile("src/app/globals.css");
  const rootBlocks = globals.match(/:root\s*\{[\s\S]*?\n\}/g) ?? [];
  const rootSource = rootBlocks.join("\n");
  const placeholderBlock = readCssRule(globals, ".study-cards-answer-placeholder");
  const placeholderIconBlock = readCssRule(globals, ".study-cards-answer-placeholder-icon");
  const placeholderNoteBlock = readCssRule(globals, ".study-cards-answer-placeholder small");
  const answerTitleBlock = readCssRule(globals, ".study-cards-answer-copy strong");
  const exampleLineBlock = readCssRule(globals, ".study-cards-example-line");
  const exampleHighlightBlock = readCssRule(globals, ".study-cards-example-highlight");
  const exampleTranslationBlock = readCssRule(globals, ".study-cards-example-translation");
  const answerMetaBlock = readCssRule(globals, ".study-cards-answer-meta small");
  const answerMetaLabelBlock = readCssRule(globals, ".study-cards-answer-meta b");

  assert.match(rootSource, /--study-cards-answer-content-placeholder-text:\s*color-mix\(in srgb,\s*var\(--foreground\) 56%,\s*var\(--muted\)\)/);
  assert.match(rootSource, /--study-cards-answer-content-placeholder-icon-bg:\s*color-mix\(in srgb,\s*var\(--accent-secondary\) 11%,\s*var\(--card\)\)/);
  assert.match(rootSource, /--study-cards-answer-content-placeholder-icon-text:\s*var\(--accent-secondary\)/);
  assert.match(rootSource, /--study-cards-answer-content-placeholder-note-text:\s*color-mix\(in srgb,\s*var\(--foreground\) 44%,\s*var\(--muted\)\)/);
  assert.match(rootSource, /--study-cards-answer-content-title-text:\s*color-mix\(in srgb,\s*var\(--accent-secondary\) 84%,\s*var\(--foreground\)\)/);
  assert.match(rootSource, /--study-cards-answer-content-example-text:\s*color-mix\(in srgb,\s*var\(--foreground\) 78%,\s*var\(--muted\)\)/);
  assert.match(rootSource, /--study-cards-answer-content-example-highlight-text:\s*color-mix\(in srgb,\s*var\(--accent-secondary\) 78%,\s*var\(--foreground\)\)/);
  assert.match(rootSource, /--study-cards-answer-content-translation-text:\s*color-mix\(in srgb,\s*var\(--foreground\) 66%,\s*var\(--muted\)\)/);
  assert.match(rootSource, /--study-cards-answer-content-meta-border:\s*color-mix\(in srgb,\s*var\(--border\) 76%,\s*transparent\)/);
  assert.match(rootSource, /--study-cards-answer-content-meta-bg:\s*color-mix\(in srgb,\s*var\(--background\) 62%,\s*var\(--card\)\)/);
  assert.match(rootSource, /--study-cards-answer-content-meta-text:\s*color-mix\(in srgb,\s*var\(--foreground\) 52%,\s*var\(--muted\)\)/);
  assert.match(rootSource, /--study-cards-answer-content-meta-label-text:\s*color-mix\(in srgb,\s*var\(--foreground\) 70%,\s*var\(--muted\)\)/);
  assert.match(placeholderBlock, /color:\s*var\(--study-cards-answer-content-placeholder-text\)/);
  assert.match(placeholderIconBlock, /background:\s*var\(--study-cards-answer-content-placeholder-icon-bg\)/);
  assert.match(placeholderIconBlock, /color:\s*var\(--study-cards-answer-content-placeholder-icon-text\)/);
  assert.match(placeholderNoteBlock, /color:\s*var\(--study-cards-answer-content-placeholder-note-text\)/);
  assert.match(answerTitleBlock, /color:\s*var\(--study-cards-answer-content-title-text\)/);
  assert.match(exampleLineBlock, /color:\s*var\(--study-cards-answer-content-example-text\)/);
  assert.match(exampleHighlightBlock, /color:\s*var\(--study-cards-answer-content-example-highlight-text\)/);
  assert.match(exampleTranslationBlock, /color:\s*var\(--study-cards-answer-content-translation-text\)/);
  assert.match(answerMetaBlock, /border:\s*1px solid var\(--study-cards-answer-content-meta-border\)/);
  assert.match(answerMetaBlock, /background:\s*var\(--study-cards-answer-content-meta-bg\)/);
  assert.match(answerMetaBlock, /color:\s*var\(--study-cards-answer-content-meta-text\)/);
  assert.match(answerMetaLabelBlock, /color:\s*var\(--study-cards-answer-content-meta-label-text\)/);
});

test("study cards completion action button colors derive from shared design tokens", async () => {
  const globals = await readProjectFile("src/app/globals.css");
  const rootBlocks = globals.match(/:root\s*\{[\s\S]*?\n\}/g) ?? [];
  const rootSource = rootBlocks.join("\n");
  const completionActionButtonBlock = readCssRule(globals, ".study-cards-bingo-actions button");
  const completionActionButtonHoverBlock = readCssRule(globals, ".study-cards-bingo-actions button:hover");

  assert.match(rootSource, /--study-cards-bingo-action-button-border:\s*color-mix\(in srgb,\s*var\(--border\) 78%,\s*transparent\)/);
  assert.match(rootSource, /--study-cards-bingo-action-button-bg:\s*color-mix\(in srgb,\s*var\(--card\) 92%,\s*var\(--background\)\)/);
  assert.match(rootSource, /--study-cards-bingo-action-button-text:\s*color-mix\(in srgb,\s*var\(--foreground\) 74%,\s*var\(--muted\)\)/);
  assert.match(rootSource, /--study-cards-bingo-action-button-hover-border:\s*color-mix\(in srgb,\s*var\(--accent-secondary\) 40%,\s*var\(--border\)\)/);
  assert.match(rootSource, /--study-cards-bingo-action-button-hover-bg:\s*var\(--card\)/);
  assert.match(rootSource, /--study-cards-bingo-action-button-hover-text:\s*var\(--foreground\)/);
  assert.match(completionActionButtonBlock, /border:\s*1px solid var\(--study-cards-bingo-action-button-border\)/);
  assert.match(completionActionButtonBlock, /background:\s*var\(--study-cards-bingo-action-button-bg\)/);
  assert.match(completionActionButtonBlock, /color:\s*var\(--study-cards-bingo-action-button-text\)/);
  assert.match(completionActionButtonHoverBlock, /border-color:\s*var\(--study-cards-bingo-action-button-hover-border\)/);
  assert.match(completionActionButtonHoverBlock, /background:\s*var\(--study-cards-bingo-action-button-hover-bg\)/);
  assert.match(completionActionButtonHoverBlock, /color:\s*var\(--study-cards-bingo-action-button-hover-text\)/);
});

test("chat assistant shell visuals use shared design tokens", async () => {
  const chatWidget = await readProjectFile("src/components/ChatWidget.tsx");
  const globals = await readProjectFile("src/app/globals.css");

  for (const literal of [
    "rgba(20,20,19,0.22)",
    "rgba(20,20,19,0.12)",
    "rgba(20,20,19,0.18)",
    "0 4px 20px rgba(0,0,0,0.15)",
    "0 24px 60px rgba(20,20,19,0.18)",
    "0 8px 40px rgba(0,0,0,0.12)",
    "0 10px 24px rgba(20,20,19,0.05)",
    "0 4px 14px rgba(20,20,19,0.04)",
    "#10B981",
    "rgba(16,185,129,0.4)",
  ]) {
    assert.doesNotMatch(chatWidget, new RegExp(literal.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }

  for (const token of [
    "--chat-mobile-backdrop-keyboard",
    "--chat-mobile-backdrop-fullscreen",
    "--chat-mobile-backdrop-sheet",
    "--chat-launcher-shadow",
    "--chat-panel-mobile-shadow",
    "--chat-panel-desktop-shadow",
    "--chat-status-online",
    "--chat-status-online-shadow",
    "--chat-greeting-mobile-shadow",
    "--chat-input-mobile-shadow",
  ]) {
    assert.match(chatWidget, new RegExp(`var\\(${token}\\)`), `ChatWidget should read ${token}`);
    assert.match(globals, new RegExp(`${token}:`), `globals.css should define ${token}`);
  }

  const rootBlocks = globals.match(/:root\s*\{[\s\S]*?\n\}/g) ?? [];
  const rootSource = rootBlocks.join("\n");
  assert.match(rootSource, /--chat-status-online:\s*var\(--accent-tertiary\)/);
  assert.match(rootSource, /--chat-launcher-shadow:\s*0 4px 20px color-mix\(in srgb,\s*var\(--foreground\) 15%,\s*transparent\)/);
  assert.match(rootSource, /--chat-panel-mobile-shadow:\s*0 24px 60px color-mix\(in srgb,\s*var\(--foreground\) 18%,\s*transparent\)/);
});

test("chat route card hover state derives from shared design tokens", async () => {
  const globals = await readProjectFile("src/app/globals.css");
  const rootBlocks = globals.match(/:root\s*\{[\s\S]*?\n\}/g) ?? [];
  const rootSource = rootBlocks.join("\n");
  const hoverBlock = readCssRule(globals, ".chat-route-card:hover");

  for (const literal of [
    "border-color: color-mix(in srgb, var(--route-card-accent, var(--accent)) 42%, var(--border))",
    "box-shadow: 0 12px 26px rgba(20, 20, 19, 0.06)",
  ]) {
    assert.doesNotMatch(hoverBlock, new RegExp(literal.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }

  assert.match(
    rootSource,
    /--chat-route-card-hover-border:\s*color-mix\(in srgb,\s*var\(--route-card-accent,\s*var\(--accent\)\) 42%,\s*var\(--border\)\)/
  );
  assert.match(
    rootSource,
    /--chat-route-card-hover-shadow:\s*0 12px 26px color-mix\(in srgb,\s*var\(--foreground\) 6%,\s*transparent\)/
  );
  assert.match(hoverBlock, /border-color:\s*var\(--chat-route-card-hover-border\)/);
  assert.match(hoverBlock, /box-shadow:\s*var\(--chat-route-card-hover-shadow\)/);
});

test("finance model testing ribbon visuals use shared design tokens", async () => {
  const globals = await readProjectFile("src/app/globals.css");
  const rootBlocks = globals.match(/:root\s*\{[\s\S]*?\n\}/g) ?? [];
  const rootSource = rootBlocks.join("\n");
  const ribbonBlock = globals.match(/\.finance-model-status-ribbon\s*\{[\s\S]*?\n\}/)?.[0] ?? "";

  for (const literal of [
    "#ffad57",
    "#f47b35",
    "#e85f24",
    "rgba(217, 119, 87, 0.22)",
    "#fff",
    "rgba(98, 48, 20, 0.18)",
  ]) {
    assert.doesNotMatch(ribbonBlock.toLowerCase(), new RegExp(literal.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }

  assert.match(rootSource, /--finance-ribbon-bg:\s*linear-gradient\(135deg,\s*color-mix\(in srgb,\s*var\(--accent\)/);
  assert.match(rootSource, /--finance-ribbon-text:\s*var\(--card\)/);
  assert.match(rootSource, /--finance-ribbon-shadow:\s*0 8px 18px color-mix\(in srgb,\s*var\(--accent\) 22%,\s*transparent\)/);
  assert.match(rootSource, /--finance-ribbon-text-shadow:\s*0 1px 2px color-mix\(in srgb,\s*var\(--foreground\) 18%,\s*transparent\)/);
  assert.match(ribbonBlock, /background:\s*var\(--finance-ribbon-bg\)/);
  assert.match(ribbonBlock, /box-shadow:\s*var\(--finance-ribbon-shadow\)/);
  assert.match(ribbonBlock, /color:\s*var\(--finance-ribbon-text\)/);
  assert.match(ribbonBlock, /text-shadow:\s*var\(--finance-ribbon-text-shadow\)/);
});

test("finance AI assistant surfaces derive from shared site tokens", async () => {
  const globals = await readProjectFile("src/app/globals.css");
  const rootBlocks = globals.match(/:root\s*\{[\s\S]*?\n\}/g) ?? [];
  const rootSource = rootBlocks.join("\n");
  const markdownCodeBlock = globals.match(/\.finance-ai-markdown code\s*\{[\s\S]*?\n\}/)?.[0] ?? "";

  for (const literal of [
    "#f7f5ef",
    "#d7cdbc",
    "rgba(64, 52, 36, 0.045)",
  ]) {
    assert.doesNotMatch(globals.toLowerCase(), new RegExp(literal.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }

  assert.match(rootSource, /--finance-ai-page-surface:\s*color-mix\(in srgb,\s*var\(--background\) 86%,\s*var\(--border\)\)/);
  assert.match(rootSource, /--finance-ai-chart-border:\s*color-mix\(in srgb,\s*var\(--border\) 86%,\s*var\(--accent\)\)/);
  assert.match(rootSource, /--finance-ai-chart-shadow:\s*0 12px 28px color-mix\(in srgb,\s*var\(--foreground\) 5%,\s*transparent\)/);
  assert.match(rootSource, /--finance-ai-inline-code-bg:\s*color-mix\(in srgb,\s*var\(--card\) 72%,\s*transparent\)/);
  assert.match(markdownCodeBlock, /background:\s*var\(--finance-ai-inline-code-bg\)/);
  assert.doesNotMatch(markdownCodeBlock, /rgba\(255,\s*255,\s*255,\s*0\.72\)/);
});

test("finance AI upload workbench surfaces derive from shared site tokens", async () => {
  const globals = await readProjectFile("src/app/globals.css");
  const rootBlocks = globals.match(/:root\s*\{[\s\S]*?\n\}/g) ?? [];
  const rootSource = rootBlocks.join("\n");
  const workbenchBlock = readCssRule(globals, ".finance-ai-upload-workbench");
  const dropzoneBlock = readCssRule(globals, ".finance-ai-upload-dropzone");
  const activeDropzoneBlock = readCssRule(globals, ".finance-ai-upload-dropzone.is-dragging");
  const previewBlock = readCssRule(globals, ".finance-ai-empty-preview-card");
  const scopedSource = [workbenchBlock, dropzoneBlock, activeDropzoneBlock, previewBlock].join("\n");

  for (const literal of [
    "rgba(255, 255, 255, 0.9)",
    "rgba(255, 255, 255, 0.72)",
    "rgba(70, 48, 30, 0.08)",
    "rgba(217, 119, 87, 0.08)",
    "rgba(255, 255, 255, 0.48)",
    "rgba(217, 119, 87, 0.14)",
    "rgba(255, 250, 244, 0.68)",
    "rgba(255, 255, 255, 0.86)",
    "rgba(255, 250, 243, 0.7)",
  ]) {
    assert.doesNotMatch(scopedSource, new RegExp(literal.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }

  assert.match(rootSource, /--finance-ai-upload-workbench-bg:\s*linear-gradient\(180deg,\s*color-mix\(in srgb,\s*var\(--card\) 90%,\s*transparent\),\s*color-mix\(in srgb,\s*var\(--card\) 72%,\s*transparent\)\)/);
  assert.match(rootSource, /--finance-ai-upload-workbench-shadow:\s*0 26px 78px color-mix\(in srgb,\s*var\(--foreground\) 8%,\s*transparent\)/);
  assert.match(rootSource, /--finance-ai-upload-dropzone-bg:\s*radial-gradient\(circle at 50% 8%,\s*color-mix\(in srgb,\s*var\(--accent\) 8%,\s*transparent\)/);
  assert.match(rootSource, /--finance-ai-upload-dropzone-active-bg:\s*radial-gradient\(circle at 50% 8%,\s*color-mix\(in srgb,\s*var\(--accent\) 14%,\s*transparent\)/);
  assert.match(rootSource, /--finance-ai-empty-preview-bg:\s*linear-gradient\(135deg,\s*color-mix\(in srgb,\s*var\(--card\) 86%,\s*transparent\)/);
  assert.match(workbenchBlock, /background:\s*var\(--finance-ai-upload-workbench-bg\)/);
  assert.match(workbenchBlock, /box-shadow:\s*var\(--finance-ai-upload-workbench-shadow\)/);
  assert.match(dropzoneBlock, /background:\s*var\(--finance-ai-upload-dropzone-bg\)/);
  assert.match(activeDropzoneBlock, /background:\s*var\(--finance-ai-upload-dropzone-active-bg\)/);
  assert.match(previewBlock, /background:\s*var\(--finance-ai-empty-preview-bg\)/);
});

test("finance AI upload action buttons derive from shared site tokens", async () => {
  const globals = await readProjectFile("src/app/globals.css");
  const rootBlocks = globals.match(/:root\s*\{[\s\S]*?\n\}/g) ?? [];
  const rootSource = rootBlocks.join("\n");
  const uploadChipBlock = readCssRule(globals, ".finance-ai-upload-chip");
  const templateButtonBlock = readLastCssRule(globals, ".finance-ai-template-button");
  const scopedSource = [uploadChipBlock, templateButtonBlock].join("\n").toLowerCase();

  for (const literal of [
    "#e9b7a6",
    "#f05c35",
    "#df4a24",
    "rgba(220, 82, 40, 0.2)",
    "#fff",
    "rgba(255, 255, 255, 0.82)",
  ]) {
    assert.doesNotMatch(scopedSource, new RegExp(literal.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }

  assert.match(rootSource, /--finance-ai-upload-chip-border:\s*color-mix\(in srgb,\s*var\(--accent\) 72%,\s*var\(--card\)\)/);
  assert.match(rootSource, /--finance-ai-upload-chip-bg:\s*linear-gradient\(180deg,\s*color-mix\(in srgb,\s*var\(--accent\) 82%,\s*var\(--card\)\),\s*color-mix\(in srgb,\s*var\(--accent\) 92%,\s*var\(--foreground\)\)\)/);
  assert.match(rootSource, /--finance-ai-upload-chip-shadow:\s*0 10px 22px color-mix\(in srgb,\s*var\(--accent\) 20%,\s*transparent\)/);
  assert.match(rootSource, /--finance-ai-upload-chip-text:\s*var\(--card\)/);
  assert.match(rootSource, /--finance-ai-template-button-bg:\s*color-mix\(in srgb,\s*var\(--card\) 82%,\s*transparent\)/);
  assert.match(uploadChipBlock, /border-color:\s*var\(--finance-ai-upload-chip-border\)/);
  assert.match(uploadChipBlock, /background:\s*var\(--finance-ai-upload-chip-bg\)/);
  assert.match(uploadChipBlock, /box-shadow:\s*var\(--finance-ai-upload-chip-shadow\)/);
  assert.match(uploadChipBlock, /color:\s*var\(--finance-ai-upload-chip-text\)/);
  assert.match(templateButtonBlock, /background:\s*var\(--finance-ai-template-button-bg\)/);
});

test("finance AI avatar surfaces derive from shared site tokens", async () => {
  const globals = await readProjectFile("src/app/globals.css");
  const rootBlocks = globals.match(/:root\s*\{[\s\S]*?\n\}/g) ?? [];
  const rootSource = rootBlocks.join("\n");
  const avatarBlock = readCssRule(globals, ".finance-ai-avatar");
  const miniAvatarBlock = readCssRule(globals, ".finance-ai-avatar-mini");
  const scopedSource = [avatarBlock, miniAvatarBlock].join("\n").toLowerCase();

  for (const literal of [
    "rgba(255, 255, 255, 0.82)",
    "rgba(255, 255, 255, 0.8)",
    "rgba(54, 72, 92, 0.14)",
    "#fff",
  ]) {
    assert.doesNotMatch(scopedSource, new RegExp(literal.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }

  assert.match(rootSource, /--finance-ai-avatar-border:\s*color-mix\(in srgb,\s*var\(--card\) 82%,\s*transparent\)/);
  assert.match(rootSource, /--finance-ai-avatar-bg:\s*var\(--card\)/);
  assert.match(rootSource, /--finance-ai-avatar-shadow:\s*0 12px 28px color-mix\(in srgb,\s*var\(--accent-secondary\) 14%,\s*transparent\)/);
  assert.match(rootSource, /--finance-ai-avatar-mini-border:\s*color-mix\(in srgb,\s*var\(--card\) 80%,\s*transparent\)/);
  assert.match(rootSource, /--finance-ai-avatar-mini-bg:\s*var\(--card\)/);
  assert.match(rootSource, /--finance-ai-avatar-mini-shadow:\s*0 8px 18px color-mix\(in srgb,\s*var\(--accent-secondary\) 14%,\s*transparent\)/);
  assert.match(avatarBlock, /border:\s*1px solid var\(--finance-ai-avatar-border\)/);
  assert.match(avatarBlock, /background:\s*var\(--finance-ai-avatar-bg\)/);
  assert.match(avatarBlock, /box-shadow:\s*var\(--finance-ai-avatar-shadow\)/);
  assert.match(miniAvatarBlock, /border:\s*1px solid var\(--finance-ai-avatar-mini-border\)/);
  assert.match(miniAvatarBlock, /background:\s*var\(--finance-ai-avatar-mini-bg\)/);
  assert.match(miniAvatarBlock, /box-shadow:\s*var\(--finance-ai-avatar-mini-shadow\)/);
});

test("finance AI empty state labels derive from shared site tokens", async () => {
  const globals = await readProjectFile("src/app/globals.css");
  const rootBlocks = globals.match(/:root\s*\{[\s\S]*?\n\}/g) ?? [];
  const rootSource = rootBlocks.join("\n");
  const emptyCardBlock = readCssRule(globals, ".finance-ai-empty-card");
  const emptyPreviewLabelBlock = readCssRule(globals, ".finance-ai-empty-preview-copy span");
  const scopedSource = [emptyCardBlock, emptyPreviewLabelBlock].join("\n").toLowerCase();

  for (const literal of [
    "rgba(255, 255, 255, 0.88)",
    "rgba(255, 255, 255, 0.68)",
    "#fff",
    "rgba(20, 20, 19, 0.08)",
  ]) {
    assert.doesNotMatch(scopedSource, new RegExp(literal.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }

  assert.match(rootSource, /--finance-ai-empty-card-bg:\s*linear-gradient\(180deg,\s*color-mix\(in srgb,\s*var\(--card\) 88%,\s*transparent\),\s*color-mix\(in srgb,\s*var\(--card\) 68%,\s*transparent\)\),\s*color-mix\(in srgb,\s*var\(--accent-secondary\) 7%,\s*var\(--card\)\)/);
  assert.match(rootSource, /--finance-ai-empty-card-shadow:\s*0 24px 70px color-mix\(in srgb,\s*var\(--foreground\) 8%,\s*transparent\)/);
  assert.match(rootSource, /--finance-ai-empty-preview-label-bg:\s*color-mix\(in srgb,\s*var\(--accent\) 10%,\s*var\(--card\)\)/);
  assert.match(emptyCardBlock, /background:\s*var\(--finance-ai-empty-card-bg\)/);
  assert.match(emptyCardBlock, /box-shadow:\s*var\(--finance-ai-empty-card-shadow\)/);
  assert.match(emptyPreviewLabelBlock, /background:\s*var\(--finance-ai-empty-preview-label-bg\)/);
});

test("finance AI error text derives from shared site tokens", async () => {
  const globals = await readProjectFile("src/app/globals.css");
  const rootBlocks = globals.match(/:root\s*\{[\s\S]*?\n\}/g) ?? [];
  const rootSource = rootBlocks.join("\n");
  const errorBlock = readCssRule(globals, ".finance-ai-error");

  assert.doesNotMatch(errorBlock.toLowerCase(), /#a84232/);
  assert.match(rootSource, /--finance-ai-error-text:\s*color-mix\(in srgb,\s*var\(--accent\) 72%,\s*var\(--foreground\)\)/);
  assert.match(errorBlock, /color:\s*var\(--finance-ai-error-text\)/);
});

test("finance AI composer controls derive from shared site tokens", async () => {
  const globals = await readProjectFile("src/app/globals.css");
  const rootBlocks = globals.match(/:root\s*\{[\s\S]*?\n\}/g) ?? [];
  const rootSource = rootBlocks.join("\n");
  const composerBlock = readCssRule(globals, ".finance-ai-composer");
  const statusBlock = readCssRule(globals, ".finance-ai-composer-status");
  const sendButtonBlock = readCssRule(globals, ".finance-ai-composer button");
  const scopedSource = [composerBlock, statusBlock, sendButtonBlock].join("\n").toLowerCase();

  for (const literal of [
    "rgba(255, 255, 255, 0.9)",
    "rgba(20, 20, 19, 0.07)",
    "#fff",
  ]) {
    assert.doesNotMatch(scopedSource, new RegExp(literal.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }

  assert.match(rootSource, /--finance-ai-composer-bg:\s*color-mix\(in srgb,\s*var\(--card\) 90%,\s*transparent\)/);
  assert.match(rootSource, /--finance-ai-composer-shadow:\s*0 16px 38px color-mix\(in srgb,\s*var\(--foreground\) 7%,\s*transparent\)/);
  assert.match(rootSource, /--finance-ai-composer-status-bg:\s*color-mix\(in srgb,\s*var\(--accent\) 10%,\s*var\(--card\)\)/);
  assert.match(rootSource, /--finance-ai-composer-button-border:\s*color-mix\(in srgb,\s*var\(--accent\) 60%,\s*var\(--card\)\)/);
  assert.match(rootSource, /--finance-ai-composer-button-bg:\s*color-mix\(in srgb,\s*var\(--accent\) 76%,\s*var\(--card\)\)/);
  assert.match(rootSource, /--finance-ai-composer-button-text:\s*var\(--card\)/);
  assert.match(composerBlock, /background:\s*var\(--finance-ai-composer-bg\)/);
  assert.match(composerBlock, /box-shadow:\s*var\(--finance-ai-composer-shadow\)/);
  assert.match(statusBlock, /background:\s*var\(--finance-ai-composer-status-bg\)/);
  assert.match(sendButtonBlock, /border-color:\s*var\(--finance-ai-composer-button-border\)/);
  assert.match(sendButtonBlock, /background:\s*var\(--finance-ai-composer-button-bg\)/);
  assert.match(sendButtonBlock, /color:\s*var\(--finance-ai-composer-button-text\)/);
});

test("finance AI thinking chips derive from shared site tokens", async () => {
  const globals = await readProjectFile("src/app/globals.css");
  const rootBlocks = globals.match(/:root\s*\{[\s\S]*?\n\}/g) ?? [];
  const rootSource = rootBlocks.join("\n");
  const thinkingChipBlock = readCssRule(globals, ".finance-ai-thinking span");

  assert.doesNotMatch(thinkingChipBlock, /rgba\(255,\s*255,\s*255,\s*0\.72\)/);
  assert.match(rootSource, /--finance-ai-thinking-chip-bg:\s*color-mix\(in srgb,\s*var\(--card\) 72%,\s*transparent\)/);
  assert.match(thinkingChipBlock, /background:\s*var\(--finance-ai-thinking-chip-bg\)/);
});

test("finance AI detail filter triggers derive from shared site tokens", async () => {
  const globals = await readProjectFile("src/app/globals.css");
  const rootBlocks = globals.match(/:root\s*\{[\s\S]*?\n\}/g) ?? [];
  const rootSource = rootBlocks.join("\n");
  const triggerBlock = readCssRule(globals, ".finance-ai-detail-filter-trigger");
  const activeTriggerBlock = globals.match(/\.finance-ai-detail-filter-trigger:hover,[\s\S]*?\n\}/)?.[0] ?? "";
  assert.ok(activeTriggerBlock, "detail filter active trigger rule should exist");
  const scopedSource = [triggerBlock, activeTriggerBlock].join("\n");

  for (const literal of [
    "rgba(255, 255, 255, 0.58)",
    "rgba(255, 255, 255, 0.72)",
  ]) {
    assert.doesNotMatch(scopedSource, new RegExp(literal.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }

  assert.match(rootSource, /--finance-ai-detail-filter-trigger-bg:\s*color-mix\(in srgb,\s*var\(--card\) 58%,\s*transparent\)/);
  assert.match(rootSource, /--finance-ai-detail-filter-trigger-active-bg:\s*color-mix\(in srgb,\s*var\(--accent\) 12%,\s*var\(--card\)\)/);
  assert.match(triggerBlock, /background:\s*var\(--finance-ai-detail-filter-trigger-bg\)/);
  assert.match(activeTriggerBlock, /background:\s*var\(--finance-ai-detail-filter-trigger-active-bg\)/);
});

test("finance AI detail filter menu surfaces derive from shared site tokens", async () => {
  const globals = await readProjectFile("src/app/globals.css");
  const rootBlocks = globals.match(/:root\s*\{[\s\S]*?\n\}/g) ?? [];
  const rootSource = rootBlocks.join("\n");
  const menuBlock = readCssRule(globals, ".finance-ai-detail-filter-menu");
  const numberFilterBlock = readCssRule(globals, ".finance-ai-detail-number-filter");
  const fieldBlock = globals.match(/\.finance-ai-detail-number-filter select,[\s\S]*?\.finance-ai-detail-number-inputs input\s*\{[\s\S]*?\n\}/)?.[0] ?? "";
  const searchBlock = readCssRule(globals, ".finance-ai-detail-filter-search");
  const buttonBlock = globals.match(/\.finance-ai-detail-filter-actions button,[\s\S]*?\.finance-ai-detail-filter-footer button\s*\{[\s\S]*?\n\}/)?.[0] ?? "";
  const primaryButtonBlock = readCssRule(globals, ".finance-ai-detail-filter-footer button.primary");
  const listBlock = readCssRule(globals, ".finance-ai-detail-filter-list");
  assert.ok(fieldBlock, "detail filter field rule should exist");
  assert.ok(buttonBlock, "detail filter button rule should exist");
  const scopedSource = [
    menuBlock,
    numberFilterBlock,
    fieldBlock,
    searchBlock,
    buttonBlock,
    primaryButtonBlock,
    listBlock,
  ].join("\n");

  for (const literal of [
    "white",
    "rgba(40, 35, 25, 0.14)",
    "rgba(255, 255, 255, 0.78)",
    "rgba(255, 255, 255, 0.72)",
    "rgba(255, 255, 255, 0.62)",
  ]) {
    assert.doesNotMatch(scopedSource, new RegExp(literal.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }

  assert.match(rootSource, /--finance-ai-detail-filter-menu-bg:\s*color-mix\(in srgb,\s*var\(--finance-ai-chart-surface\) 94%,\s*var\(--card\)\)/);
  assert.match(rootSource, /--finance-ai-detail-filter-menu-shadow:\s*0 18px 38px color-mix\(in srgb,\s*var\(--foreground\) 14%,\s*transparent\)/);
  assert.match(rootSource, /--finance-ai-detail-number-filter-bg:\s*color-mix\(in srgb,\s*var\(--finance-ai-page-surface\) 72%,\s*var\(--card\)\)/);
  assert.match(rootSource, /--finance-ai-detail-filter-field-bg:\s*color-mix\(in srgb,\s*var\(--card\) 78%,\s*transparent\)/);
  assert.match(rootSource, /--finance-ai-detail-filter-button-bg:\s*color-mix\(in srgb,\s*var\(--card\) 62%,\s*transparent\)/);
  assert.match(rootSource, /--finance-ai-detail-filter-primary-button-bg:\s*color-mix\(in srgb,\s*var\(--accent\) 74%,\s*var\(--card\)\)/);
  assert.match(rootSource, /--finance-ai-detail-filter-primary-button-text:\s*var\(--card\)/);
  assert.match(rootSource, /--finance-ai-detail-filter-list-bg:\s*color-mix\(in srgb,\s*var\(--finance-ai-page-surface\) 76%,\s*var\(--card\)\)/);
  assert.match(menuBlock, /background:\s*var\(--finance-ai-detail-filter-menu-bg\)/);
  assert.match(menuBlock, /box-shadow:\s*var\(--finance-ai-detail-filter-menu-shadow\)/);
  assert.match(numberFilterBlock, /background:\s*var\(--finance-ai-detail-number-filter-bg\)/);
  assert.match(fieldBlock, /background:\s*var\(--finance-ai-detail-filter-field-bg\)/);
  assert.match(searchBlock, /background:\s*var\(--finance-ai-detail-filter-field-bg\)/);
  assert.match(buttonBlock, /background:\s*var\(--finance-ai-detail-filter-button-bg\)/);
  assert.match(primaryButtonBlock, /background:\s*var\(--finance-ai-detail-filter-primary-button-bg\)/);
  assert.match(primaryButtonBlock, /color:\s*var\(--finance-ai-detail-filter-primary-button-text\)/);
  assert.match(listBlock, /background:\s*var\(--finance-ai-detail-filter-list-bg\)/);
});

test("finance AI detail filter checkmarks derive from shared site tokens", async () => {
  const globals = await readProjectFile("src/app/globals.css");
  const rootBlocks = globals.match(/:root\s*\{[\s\S]*?\n\}/g) ?? [];
  const rootSource = rootBlocks.join("\n");
  const checkmarkBlock = readCssRule(globals, ".finance-ai-detail-filter-checkmark");

  assert.doesNotMatch(checkmarkBlock, /rgba\(255,\s*255,\s*255,\s*0\.76\)/);
  assert.match(rootSource, /--finance-ai-detail-filter-checkmark-bg:\s*color-mix\(in srgb,\s*var\(--card\) 76%,\s*transparent\)/);
  assert.match(checkmarkBlock, /background:\s*var\(--finance-ai-detail-filter-checkmark-bg\)/);
});

test("finance AI detail table zebra rows derive from shared site tokens", async () => {
  const globals = await readProjectFile("src/app/globals.css");
  const rootBlocks = globals.match(/:root\s*\{[\s\S]*?\n\}/g) ?? [];
  const rootSource = rootBlocks.join("\n");
  const zebraBlock = readCssRule(globals, ".finance-ai-detail-table tbody tr:nth-child(even)");

  assert.doesNotMatch(zebraBlock, /rgba\(255,\s*255,\s*255,\s*0\.58\)/);
  assert.match(rootSource, /--finance-ai-detail-table-zebra-bg:\s*color-mix\(in srgb,\s*var\(--finance-ai-page-surface\) 76%,\s*var\(--card\)\)/);
  assert.match(zebraBlock, /background:\s*var\(--finance-ai-detail-table-zebra-bg\)/);
});

test("finance AI detail table headers derive from shared site tokens", async () => {
  const globals = await readProjectFile("src/app/globals.css");
  const rootBlocks = globals.match(/:root\s*\{[\s\S]*?\n\}/g) ?? [];
  const rootSource = rootBlocks.join("\n");
  const headerBlock = readCssRule(globals, ".finance-ai-detail-table th");

  assert.doesNotMatch(headerBlock.toLowerCase(), /#ebe3d5/);
  assert.match(rootSource, /--finance-ai-detail-table-header-bg:\s*color-mix\(in srgb,\s*var\(--finance-ai-chart-surface\) 82%,\s*var\(--border\)\)/);
  assert.match(headerBlock, /background:\s*var\(--finance-ai-detail-table-header-bg\)/);
});

test("finance AI user message bubbles derive from shared site tokens", async () => {
  const globals = await readProjectFile("src/app/globals.css");
  const rootBlocks = globals.match(/:root\s*\{[\s\S]*?\n\}/g) ?? [];
  const rootSource = rootBlocks.join("\n");
  const userBubbleBlock = readCssRule(globals, ".finance-ai-message.is-user .finance-ai-message-bubble");

  assert.doesNotMatch(userBubbleBlock.toLowerCase(), /#eee8df/);
  assert.match(rootSource, /--finance-ai-user-message-bg:\s*color-mix\(in srgb,\s*var\(--accent\) 8%,\s*var\(--finance-ai-page-surface\)\)/);
  assert.match(userBubbleBlock, /background:\s*var\(--finance-ai-user-message-bg\)/);
});

test("finance AI empty preview waterfall connectors derive from shared site tokens", async () => {
  const globals = await readProjectFile("src/app/globals.css");
  const tool = await readProjectFile("src/app/tools/finance-ai-assistant/FinanceAIAssistantTool.tsx");
  const rootBlocks = globals.match(/:root\s*\{[\s\S]*?\n\}/g) ?? [];
  const rootSource = rootBlocks.join("\n");

  assert.doesNotMatch(tool, /rgba\(172,\s*158,\s*132,\s*0\.62\)/);
  assert.match(tool, /EMPTY_STATE_PREVIEW_WATERFALL_CONNECTOR_LINE/);
  assert.match(tool, /var\(--finance-ai-empty-preview-waterfall-connector-line\)/);
  assert.match(tool, /resolveFinanceAIChartSpecTokens/);
  assert.match(rootSource, /--finance-ai-empty-preview-waterfall-connector-line:\s*color-mix\(in srgb,\s*var\(--muted\) 62%,\s*transparent\)/);
});
