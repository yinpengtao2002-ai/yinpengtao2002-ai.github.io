import test from "node:test";
import assert from "node:assert/strict";
import { readFile, stat } from "node:fs/promises";

const nextConfig = await readFile(new URL("../next.config.ts", import.meta.url), "utf8");
const packageJson = await readFile(new URL("../package.json", import.meta.url), "utf8");
const sitemap = await readFile(new URL("../src/app/sitemap.ts", import.meta.url), "utf8");
const globals = await readFile(new URL("../src/app/globals.css", import.meta.url), "utf8");
const clientShell = await readFile(new URL("../src/components/ClientShell.tsx", import.meta.url), "utf8");
const navigation = await readFile(new URL("../src/components/layout/SiteNavigation.tsx", import.meta.url), "utf8");
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

test("subtitle workbench route opens the hosted app directly instead of embedding it", () => {
  assert.match(subtitleWorkbenchPage, /https:\/\/yptt-subtitle-workbench\.hf\.space\//);
  assert.match(subtitleWorkbenchPage, /redirect\(SUBTITLE_WORKBENCH_URL\)/);
  assert.match(subtitleWorkbenchPage, /视频字幕与总结工作台/);
  assert.doesNotMatch(subtitleWorkbenchPage, /<iframe/);
  assert.doesNotMatch(subtitleWorkbenchPage, /allow="clipboard-read; clipboard-write"/);
  assert.doesNotMatch(subtitleWorkbenchPage, /subtitle-workbench-back-link/);
  assert.doesNotMatch(subtitleWorkbenchPage, /subtitle-workbench-open-link/);
  assert.doesNotMatch(subtitleWorkbenchPage, /target="_blank"/);
  assert.doesNotMatch(subtitleWorkbenchPage, /直接打开工作台/);
  assert.doesNotMatch(subtitleWorkbenchPage, /subtitle-workbench-topbar/);
  assert.doesNotMatch(subtitleWorkbenchPage, /<h1>/);
  assert.doesNotMatch(globals, /\.subtitle-workbench-page\s*\{/);
  assert.doesNotMatch(globals, /\.subtitle-workbench-back-link\s*\{/);
  assert.doesNotMatch(globals, /\.subtitle-workbench-open-link\s*\{/);
  assert.doesNotMatch(globals, /\.subtitle-workbench-frame-shell\s*\{/);
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

test("goalkeeper landscape game is exposed as a thinking lab tool", async () => {
  const goalkeeperPage = await readFile(
    new URL("../src/app/tools/goalkeeper-landscape/page.tsx", import.meta.url),
    "utf8"
  );
  const gameIndex = await readFile(
    new URL("../public/tools/goalkeeper-landscape/index.html", import.meta.url),
    "utf8"
  );
  const gameScriptPath = new URL("../public/tools/goalkeeper-landscape/assets/index-CBV-qCmv.js", import.meta.url);
  const gameScript = await stat(gameScriptPath);
  const gameScriptSource = await readFile(gameScriptPath, "utf8");
  const gameStyles = await stat(new URL("../public/tools/goalkeeper-landscape/assets/index-hTxdIy6z.css", import.meta.url));
  const gameWasm = await stat(new URL("../public/tools/goalkeeper-landscape/vendor/rapier_wasm3d_bg.wasm", import.meta.url));

  assert.doesNotMatch(goalkeeperPage, /redirect\(/);
  assert.match(goalkeeperPage, /import GoalkeeperLandscapeRuntime/);
  assert.match(goalkeeperPage, /GOALKEEPER_SCRIPT_SRC/);
  assert.match(goalkeeperPage, /GOALKEEPER_STYLESHEET_HREF/);
  assert.match(goalkeeperPage, /<GoalkeeperLandscapeRuntime \/>/);
  assert.match(goalkeeperPage, /弹力手套守门挑战/);
  assert.match(goalkeeperPage, /id="gameCanvas"/);
  assert.match(goalkeeperPage, /id="startButton"/);
  assert.match(goalkeeperPage, /data-difficulty="easy"/);
  assert.match(goalkeeperPage, /data-difficulty="medium"/);
  assert.match(goalkeeperPage, /data-difficulty="hard"/);
  assert.match(thinkingLabContent, /href:\s*"\/tools\/goalkeeper-landscape"/);
  assert.match(thinkingLabContent, /title:\s*"守门小游戏"/);
  assert.match(thinkingClient, /\"goalkeeper-landscape\":\s*Gamepad2/);
  assert.match(thinkingClient, /横屏守门挑战/);
  assert.match(clientShell, /\/tools\/goalkeeper-landscape/);
  assert.match(sitemap, /\$\{BASE_URL\}\/tools\/goalkeeper-landscape/);
  assert.match(gameIndex, /\/tools\/goalkeeper-landscape\/assets\/index-CBV-qCmv\.js/);
  assert.match(gameIndex, /\/tools\/goalkeeper-landscape\/assets\/index-hTxdIy6z\.css/);
  assert.match(gameScriptSource, /difficulty/);
  assert.match(gameScriptSource, /medium/);
  assert.match(gameScriptSource, /\/tools\/goalkeeper-landscape\/audio\/mixkit-soccer-ball-kick-2099\.wav/);
  assert.doesNotMatch(gameScriptSource, /url:\s*"\/audio\//);
  assert.doesNotMatch(gameScriptSource, /training/);
  assert.doesNotMatch(gameScriptSource, /arcade/);
  assert.doesNotMatch(gameScriptSource, /compositionPreset/);
  assert.ok(gameScript.size > 1024, "game script should be copied from the Vite dist output");
  assert.ok(gameStyles.size > 1024, "game styles should be copied from the Vite dist output");
  assert.ok(gameWasm.size > 1024, "Rapier wasm should be available to the game runtime");
});

test("goalkeeper landscape lab is a hidden internal workbench route", async () => {
  const labPage = await readFile(
    new URL("../src/app/tools/goalkeeper-landscape-lab/page.tsx", import.meta.url),
    "utf8"
  );
  const labReplay = await readFile(
    new URL("../src/app/tools/goalkeeper-landscape-lab/LowRollingBallReplay.tsx", import.meta.url),
    "utf8"
  );
  const labApi = await readFile(
    new URL("../src/app/api/tools/goalkeeper-landscape-lab/low-rolling-ball/route.ts", import.meta.url),
    "utf8"
  );

  assert.doesNotMatch(labPage, /redirect\(/);
  assert.match(labPage, /Goalkeeper Landscape Lab/);
  assert.match(labPage, /Physics Lab/);
  assert.match(labPage, /Asset Lab/);
  assert.match(labPage, /低平滚动球/);
  assert.match(labPage, /中路抱球/);
  assert.match(labPage, /侧身拨挡/);
  assert.match(labPage, /上升掌托/);
  assert.match(labPage, /擦碰漏防/);
  assert.match(labPage, /Khronos glTF Sample Assets/);
  assert.match(labPage, /Kenney official assets/);
  assert.match(labPage, /license/);
  assert.match(labPage, /performance/);
  assert.match(labPage, /prefetch=\{false\}/);
  assert.match(labPage, /LowRollingBallReplay/);
  assert.match(labReplay, /"use client"/);
  assert.match(labReplay, /\/api\/tools\/goalkeeper-landscape-lab\/low-rolling-ball/);
  assert.match(labReplay, /data-live-telemetry/);
  assert.match(labReplay, /Replay selected scenario/);
  assert.match(labApi, /runLowRollingBallLabScenario/);
  assert.match(labApi, /NextResponse\.json/);
  assert.match(packageJson, /"@dimforge\/rapier3d-compat"/);
  assert.doesNotMatch(sitemap, /goalkeeper-landscape-lab/);
  assert.doesNotMatch(thinkingLabContent, /goalkeeper-landscape-lab/);
  assert.doesNotMatch(thinkingClient, /goalkeeper-landscape-lab/);
  assert.doesNotMatch(clientShell, /goalkeeper-landscape-lab/);
  assert.doesNotMatch(navigation, /goalkeeper-landscape-lab/);
});
