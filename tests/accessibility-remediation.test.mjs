import test from "node:test";
import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

const root = path.resolve(new URL("..", import.meta.url).pathname);

async function collectSourceFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await collectSourceFiles(absolute));
    else if (/\.(?:tsx|jsx)$/.test(entry.name)) files.push(absolute);
  }
  return files;
}

test("the root layout owns the only main landmark in the Next application", async () => {
  const layoutPath = path.join(root, "src/app/layout.tsx");
  const layout = await readFile(layoutPath, "utf8");
  assert.match(layout, /<main id="main-content"/);

  const files = await collectSourceFiles(path.join(root, "src"));
  for (const file of files.filter((file) => file !== layoutPath)) {
    const source = await readFile(file, "utf8");
    assert.doesNotMatch(source, /<\/?main(?:\s|>)/, path.relative(root, file));
  }
});

test("mobile site navigation manages focus, Escape, dynamic labels, and current page state", async () => {
  const source = await readFile(path.join(root, "src/components/layout/SiteNavigation.tsx"), "utf8");
  assert.match(source, /aria-label=\{open \? "关闭网站导航" : "打开网站导航"\}/);
  assert.match(source, /event\.key === "Escape"/);
  assert.match(source, /firstMobileLinkRef\.current\?\.focus/);
  assert.match(source, /mobileToggleRef\.current\?\.focus/);
  assert.match(source, /aria-current=\{active \? "page" : undefined\}/);
});

test("chat streaming text is silent until one completion announcement", async () => {
  const source = await readFile(path.join(root, "src/components/ChatWidget.tsx"), "utf8");
  const messagesRegion = source.match(/ref=\{messagesContainerRef\}([\s\S]*?)<AnimatePresence/);
  assert.ok(messagesRegion);
  assert.doesNotMatch(messagesRegion[1], /aria-live=/);
  assert.match(source, /setCompletionAnnouncement\("回复已完成"\)/);
  assert.match(source, /aria-live="polite"[\s\S]*\{completionAnnouncement\}/);
});

test("finance dimension order exposes keyboard moves and polite status updates", async () => {
  const businessTool = await readFile(path.join(root, "src/app/finance/business-analysis/BusinessAnalysisTool.tsx"), "utf8");
  const businessEngine = await readFile(path.join(root, "src/app/finance/business-analysis/business-analysis-engine.js"), "utf8");
  const marginHtml = await readFile(path.join(root, "public/tools/margin-analysis/index.html"), "utf8");
  const marginEngine = await readFile(path.join(root, "public/tools/margin-analysis/app.js"), "utf8");

  assert.match(businessTool, /business-dimension-order-status[\s\S]*aria-live="polite"/);
  assert.match(businessEngine, /data-dimension-move="up"/);
  assert.match(businessEngine, /data-dimension-move="down"/);
  assert.match(businessEngine, /data-dimension-move="first"/);
  assert.match(businessEngine, /data-dimension-move="last"/);
  assert.match(businessEngine, /announceDimensionOrder/);

  assert.match(marginHtml, /margin-dimension-order-status[\s\S]*aria-live="polite"/);
  assert.match(marginEngine, /data-margin-dimension-move="up"/);
  assert.match(marginEngine, /data-margin-dimension-move="down"/);
  assert.match(marginEngine, /data-margin-dimension-move="first"/);
  assert.match(marginEngine, /data-margin-dimension-move="last"/);
  assert.match(marginEngine, /announceDrillOrder/);
});
