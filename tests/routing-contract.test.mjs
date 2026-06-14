import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const nextConfig = await readFile(new URL("../next.config.ts", import.meta.url), "utf8");
const sitemap = await readFile(new URL("../src/app/sitemap.ts", import.meta.url), "utf8");
const globals = await readFile(new URL("../src/app/globals.css", import.meta.url), "utf8");
const clientShell = await readFile(new URL("../src/components/ClientShell.tsx", import.meta.url), "utf8");
const thinkingClient = await readFile(new URL("../src/components/thinking/ThinkingLabClient.tsx", import.meta.url), "utf8");
const thinkingLabContent = await readFile(new URL("../src/lib/data/thinkingLabContent.ts", import.meta.url), "utf8");
const subtitleWorkbenchPage = await readFile(
  new URL("../src/app/tools/subtitle-workbench/page.tsx", import.meta.url),
  "utf8"
);

test("next config contains permanent redirects for old thinking routes", () => {
  assert.match(nextConfig, /source:\s*"\/ai"/);
  assert.match(nextConfig, /destination:\s*"\/thinking-lab"/);
  assert.match(nextConfig, /source:\s*"\/essays"/);
  assert.match(nextConfig, /source:\s*"\/article\/ai\/:slug"/);
  assert.match(nextConfig, /source:\s*"\/article\/essays\/:slug"/);
  assert.match(nextConfig, /permanent:\s*true/);
});

test("sitemap uses thinking lab and no retired list pages", () => {
  assert.match(sitemap, /\/thinking-lab/);
  assert.doesNotMatch(sitemap, /\$\{BASE_URL\}\/ai/);
  assert.doesNotMatch(sitemap, /\$\{BASE_URL\}\/essays/);
  assert.doesNotMatch(sitemap, /\$\{BASE_URL\}\/explore/);
});

test("route transition shell keeps fixed finance tool pages full height", () => {
  assert.match(globals, /\.page-transition-shell\s*\{[^}]*min-height:\s*100vh[^}]*min-height:\s*100dvh/s);
});

test("route transition shell does not trap fixed finance tool controls", () => {
  assert.doesNotMatch(globals, /\.page-transition-shell\s*\{[^}]*will-change:\s*transform/s);
});

test("subtitle workbench is embedded as a seamless hosted tool", () => {
  assert.match(subtitleWorkbenchPage, /https:\/\/yptt-subtitle-workbench\.hf\.space\//);
  assert.match(subtitleWorkbenchPage, /<iframe/);
  assert.match(subtitleWorkbenchPage, /allow="clipboard-read; clipboard-write"/);
  assert.match(subtitleWorkbenchPage, /视频字幕与总结工作台/);
  assert.match(subtitleWorkbenchPage, /subtitle-workbench-back-link/);
  assert.match(subtitleWorkbenchPage, /href="\/thinking-lab"/);
  assert.doesNotMatch(subtitleWorkbenchPage, /subtitle-workbench-topbar/);
  assert.doesNotMatch(subtitleWorkbenchPage, /subtitle-workbench-open/);
  assert.doesNotMatch(subtitleWorkbenchPage, /新窗口打开/);
  assert.doesNotMatch(subtitleWorkbenchPage, /<h1>/);
  assert.match(globals, /\.subtitle-workbench-page\s*\{[^}]*padding:\s*0/s);
  assert.match(globals, /\.subtitle-workbench-back-link\s*\{[^}]*position:\s*fixed[^}]*z-index:\s*20/s);
  assert.match(globals, /\.subtitle-workbench-frame-shell\s*\{[^}]*width:\s*100%[^}]*border:\s*0[^}]*border-radius:\s*0[^}]*box-shadow:\s*none/s);
  assert.match(sitemap, /\$\{BASE_URL\}\/tools\/subtitle-workbench/);
  assert.match(thinkingLabContent, /href:\s*"\/tools\/subtitle-workbench"/);
  assert.match(thinkingLabContent, /title:\s*"视频字幕与总结工作台"/);
  assert.doesNotMatch(thinkingClient, /thinking-tool-entry/);
  assert.match(clientShell, /\/tools\/subtitle-workbench/);
});

test("thinking lab separates usable tools from reading content", () => {
  assert.match(thinkingClient, /thinking-main-grid/);
  assert.match(thinkingClient, /thinking-content-panel/);
  assert.match(thinkingClient, /thinking-tools-panel/);
  assert.match(thinkingClient, /toolItems/);
  assert.match(thinkingClient, /contentItems/);
  assert.match(thinkingClient, /打开工具/);
  assert.match(thinkingClient, /阅读/);
  assert.match(thinkingClient, /thinking-tool-card/);
  assert.match(thinkingClient, /thinking-article-card/);
  assert.doesNotMatch(thinkingClient, /style=\{\{/);
  assert.match(globals, /\.thinking-main-grid\s*\{/);
  assert.match(globals, /\.thinking-content-panel\s*\{/);
  assert.match(globals, /\.thinking-tools-panel\s*\{/);
  assert.match(globals, /\.thinking-tool-card\s*\{/);
  assert.match(globals, /\.thinking-article-card\s*\{/);
  assert.doesNotMatch(thinkingClient, /thinking-filters/);
  assert.doesNotMatch(thinkingClient, /thinking-mobile-filters/);
  assert.doesNotMatch(thinkingClient, /thinking-article-head/);
  assert.doesNotMatch(globals, /\.thinking-filters\s*\{/);
  assert.doesNotMatch(globals, /\.thinking-article-head/);
});

test("thinking lab is a compact two-column index with article chips and quick tools", () => {
  assert.match(thinkingClient, /TOOLS & THINKING/);
  assert.match(thinkingClient, /className="thinking-index-title"/);
  assert.match(thinkingClient, /可直接打开的 AI 工具、创作片段与思考记录。/);
  assert.match(thinkingClient, /thinking-index-shell/);
  assert.match(thinkingClient, /thinking-filter-chips/);
  assert.match(thinkingClient, /快捷工具/);
  assert.match(thinkingClient, /英文文章 → 单词卡/);
  assert.match(thinkingClient, /视频\/音频 → 字幕总结/);
  assert.doesNotMatch(thinkingClient, /thinking-tool-detail/);
  assert.doesNotMatch(thinkingClient, />适合</);
  assert.doesNotMatch(thinkingClient, />解决</);
  assert.match(
    globals,
    /\.thinking-index-shell\s*\{[^}]*width:\s*min\(100%\s*-\s*48px,\s*1160px\)/s
  );
  assert.match(
    globals,
    /\.thinking-main-grid\s*\{[^}]*grid-template-columns:\s*minmax\(0,\s*7fr\)\s*minmax\(280px,\s*3fr\)/s
  );
  assert.match(
    globals,
    /\.thinking-index-hero\s*\{[^}]*min-height:\s*clamp\(120px,\s*18vh,\s*160px\)/s
  );
  assert.doesNotMatch(globals, /\.thinking-tool-detail\s*\{/);
});
