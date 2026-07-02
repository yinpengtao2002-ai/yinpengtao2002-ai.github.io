import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

async function readProjectFile(path) {
  return readFile(new URL(`../${path}`, import.meta.url), "utf8");
}

function readCssRule(source, selector) {
  const escapedSelector = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = source.match(new RegExp(`(^|\\n)\\s*${escapedSelector}\\s*\\{[\\s\\S]*?\\n\\}`));
  assert.ok(match, `${selector} rule should exist`);
  return match[0];
}

function readLastCssRule(source, selector) {
  const escapedSelector = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const matches = [...source.matchAll(new RegExp(`(^|\\n)\\s*${escapedSelector}\\s*\\{[\\s\\S]*?\\n\\}`, "g"))];
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

  const selectionBlock = globals.match(/::selection\s*\{[\s\S]*?\n\}/)?.[0] ?? "";
  assert.match(selectionBlock, /background:\s*var\(--accent\)/);
  assert.match(selectionBlock, /color:\s*var\(--card\)/);
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
  const scopedSource = [
    chromeDotBlock,
    chromeDotSecondBlock,
    chromeDotThirdBlock,
    barBlock,
    barSecondBlock,
    barThirdBlock,
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

  assert.match(chromeDotBlock, /background:\s*var\(--home-mini-widget-accent-primary\)/);
  assert.match(chromeDotSecondBlock, /background:\s*var\(--home-mini-widget-accent-warm\)/);
  assert.match(chromeDotThirdBlock, /background:\s*var\(--home-mini-widget-accent-tertiary\)/);
  assert.match(barBlock, /background:\s*var\(--home-mini-widget-accent-primary\)/);
  assert.match(barSecondBlock, /background:\s*var\(--home-mini-widget-accent-secondary\)/);
  assert.match(barThirdBlock, /background:\s*var\(--home-mini-widget-accent-tertiary\)/);
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
