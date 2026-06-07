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
  assert.match(thinkingClient, /thinking-tools-section/);
  assert.match(thinkingClient, /thinking-content-section/);
  assert.match(thinkingClient, /toolItems/);
  assert.match(thinkingClient, /contentItems/);
  assert.match(thinkingClient, /打开工具/);
  assert.match(thinkingClient, /阅读/);
  assert.match(thinkingClient, /thinking-tool-card/);
  assert.match(thinkingClient, /thinking-article-row/);
  assert.doesNotMatch(thinkingClient, /style=\{\{/);
  assert.match(globals, /\.thinking-tools-section\s*\{/);
  assert.match(globals, /\.thinking-tool-card\s*\{/);
  assert.match(globals, /\.thinking-content-section\s*\{/);
  assert.match(globals, /\.thinking-article-row\s*\{/);
});

test("thinking lab keeps the header compact and removes explanatory subtitles from the tool hub", () => {
  assert.match(thinkingClient, /className="thinking-index-title"/);
  assert.doesNotMatch(thinkingClient, /thinking-index-intro/);
  assert.doesNotMatch(thinkingClient, /这些是可以直接使用的小工具/);
  assert.doesNotMatch(thinkingClient, /保留一些观察和复盘/);
  assert.doesNotMatch(thinkingClient, /TOOL_DETAILS/);
  assert.doesNotMatch(thinkingClient, /thinking-tool-detail/);
  assert.doesNotMatch(thinkingClient, />适合</);
  assert.doesNotMatch(thinkingClient, />解决</);
  assert.match(
    globals,
    /\.thinking-index-title\s*\{[^}]*font-size:\s*clamp\(1\.95rem,\s*4\.6vw,\s*3\.15rem\)/s
  );
  assert.doesNotMatch(globals, /\.thinking-index-intro\s*\{/);
  assert.doesNotMatch(globals, /\.thinking-section-head p\s*\{/);
  assert.doesNotMatch(globals, /\.thinking-tool-detail\s*\{/);
});
