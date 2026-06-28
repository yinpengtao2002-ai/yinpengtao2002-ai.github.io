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
