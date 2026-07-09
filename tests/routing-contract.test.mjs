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
  const goalkeeperRuntime = await readFile(
    new URL("../src/app/tools/goalkeeper-landscape/GoalkeeperLandscapeRuntime.tsx", import.meta.url),
    "utf8"
  );
  const gameIndex = await readFile(
    new URL("../public/tools/goalkeeper-landscape/index.html", import.meta.url),
    "utf8"
  );
  const gameScriptPath = new URL("../public/tools/goalkeeper-landscape/assets/index-D0NwwzVb.js", import.meta.url);
  const gameScript = await stat(gameScriptPath);
  const gameScriptSource = await readFile(gameScriptPath, "utf8");
  const gameStylePath = new URL("../public/tools/goalkeeper-landscape/assets/index-Bbig4_qq.css", import.meta.url);
  const gameStyles = await stat(gameStylePath);
  const gameStyleSource = await readFile(gameStylePath, "utf8");
  const gameWasm = await stat(new URL("../public/tools/goalkeeper-landscape/vendor/rapier_wasm3d_bg.wasm", import.meta.url));

  assert.doesNotMatch(goalkeeperPage, /redirect\(/);
  assert.match(goalkeeperPage, /import GoalkeeperLandscapeRuntime/);
  assert.match(goalkeeperPage, /GOALKEEPER_SCRIPT_SRC/);
  assert.match(goalkeeperPage, /GOALKEEPER_STYLESHEET_HREF/);
  assert.match(goalkeeperRuntime, /index-D0NwwzVb\.js/);
  assert.match(goalkeeperPage, /index-Bbig4_qq\.css/);
  assert.match(goalkeeperPage, /<GoalkeeperLandscapeRuntime \/>/);
  assert.match(goalkeeperPage, /弹力手套守门挑战/);
  assert.match(goalkeeperPage, /id="gameCanvas"/);
  assert.match(goalkeeperPage, /id="startButton"/);
  assert.match(goalkeeperPage, /id="feedbackToast"/);
  assert.match(goalkeeperPage, /broadcast-scorebug/);
  assert.match(goalkeeperPage, /broadcast-scorebug-compact-hud/);
  assert.match(goalkeeperPage, /hud-metric/);
  assert.match(goalkeeperPage, /hud-label/);
  assert.match(goalkeeperPage, /hud-value/);
  assert.match(goalkeeperPage, /id="eventRibbon"/);
  assert.match(goalkeeperPage, /broadcast-event-ribbon-hud/);
  assert.match(goalkeeperPage, /id="matchStatus"/);
  assert.match(goalkeeperPage, /id="pressureCue"/);
  assert.match(goalkeeperPage, /id="matchAtmosphere"/);
  assert.match(goalkeeperPage, /id="matchAtmosphereFill"/);
  assert.match(goalkeeperPage, /id="matchAtmosphereCopy"/);
  assert.match(goalkeeperPage, /match-atmosphere-event-rail/);
  assert.match(goalkeeperPage, /id="bottomControls"/);
  assert.match(goalkeeperPage, /id="matchProgress"/);
  assert.match(goalkeeperPage, /id="matchProgressFill"/);
  assert.match(goalkeeperPage, /match-progress-hud/);
  assert.match(goalkeeperPage, /id="soundStatus"/);
  assert.match(goalkeeperPage, /match-audio-status-chip/);
  assert.match(goalkeeperPage, /data-ui-system="match-hud-flow-polish"/);
  assert.match(goalkeeperPage, /id="pauseOverlay"/);
  assert.match(goalkeeperPage, /id="pauseResumeButton"/);
  assert.match(goalkeeperPage, /id="pauseHint"/);
  assert.match(goalkeeperPage, /match-pause-coach-hint/);
  assert.match(goalkeeperPage, /id="resultGrade"/);
  assert.match(goalkeeperPage, /id="resultVerdict"/);
  assert.match(goalkeeperPage, /id="resultCoach"/);
  assert.match(goalkeeperPage, /round-result-coach-note/);
  assert.match(goalkeeperPage, /id="finalSaves"/);
  assert.match(goalkeeperPage, /id="finalBestStreak"/);
  assert.match(goalkeeperPage, /id="finalConceded"/);
  assert.match(goalkeeperPage, /id="resultSummary"/);
  assert.match(goalkeeperPage, /id="resultReview"/);
  assert.match(goalkeeperPage, /id="finalHighlight"/);
  assert.match(goalkeeperPage, /id="finalWeakness"/);
  assert.match(goalkeeperPage, /id="finalNextTarget"/);
  assert.match(goalkeeperPage, /round-result-review-cards/);
  assert.match(goalkeeperPage, /id="resultTags"/);
  assert.match(goalkeeperPage, /id="finalSaveRate"/);
  assert.match(goalkeeperPage, /id="finalRhythmTag"/);
  assert.match(goalkeeperPage, /id="finalControlTag"/);
  assert.match(goalkeeperPage, /round-result-performance-tags/);
  assert.match(goalkeeperPage, /data-difficulty="easy"/);
  assert.match(goalkeeperPage, /data-difficulty="medium"/);
  assert.match(goalkeeperPage, /data-difficulty="hard"/);
  assert.match(thinkingLabContent, /href:\s*"\/tools\/goalkeeper-landscape"/);
  assert.match(thinkingLabContent, /title:\s*"守门小游戏"/);
  assert.match(thinkingClient, /\"goalkeeper-landscape\":\s*Gamepad2/);
  assert.match(thinkingClient, /横屏守门挑战/);
  assert.match(clientShell, /\/tools\/goalkeeper-landscape/);
  assert.match(sitemap, /\$\{BASE_URL\}\/tools\/goalkeeper-landscape/);
  assert.match(gameIndex, /\/tools\/goalkeeper-landscape\/assets\/index-D0NwwzVb\.js/);
  assert.match(gameIndex, /\/tools\/goalkeeper-landscape\/assets\/index-Bbig4_qq\.css/);
  assert.match(gameIndex, /id="feedbackToast"/);
  assert.match(gameIndex, /id="eventRibbon"/);
  assert.match(gameIndex, /broadcast-event-ribbon-hud/);
  assert.match(gameIndex, /id="matchStatus"/);
  assert.match(gameIndex, /id="pressureCue"/);
  assert.match(gameIndex, /id="matchAtmosphere"/);
  assert.match(gameIndex, /id="matchAtmosphereFill"/);
  assert.match(gameIndex, /id="matchAtmosphereCopy"/);
  assert.match(gameIndex, /match-atmosphere-event-rail/);
  assert.match(gameIndex, /id="matchProgress"/);
  assert.match(gameIndex, /id="matchProgressFill"/);
  assert.match(gameIndex, /match-progress-hud/);
  assert.match(gameIndex, /id="soundStatus"/);
  assert.match(gameIndex, /match-audio-status-chip/);
  assert.match(gameIndex, /data-ui-system="match-hud-flow-polish"/);
  assert.match(gameIndex, /id="pauseOverlay"/);
  assert.match(gameIndex, /id="pauseResumeButton"/);
  assert.match(gameIndex, /id="pauseHint"/);
  assert.match(gameIndex, /match-pause-coach-hint/);
  assert.match(gameIndex, /id="resultGrade"/);
  assert.match(gameIndex, /id="resultVerdict"/);
  assert.match(gameIndex, /id="resultCoach"/);
  assert.match(gameIndex, /round-result-coach-note/);
  assert.match(gameIndex, /id="finalSaves"/);
  assert.match(gameIndex, /id="resultSummary"/);
  assert.match(gameIndex, /id="resultReview"/);
  assert.match(gameIndex, /id="finalHighlight"/);
  assert.match(gameIndex, /id="finalWeakness"/);
  assert.match(gameIndex, /id="finalNextTarget"/);
  assert.match(gameIndex, /round-result-review-cards/);
  assert.match(gameIndex, /id="resultTags"/);
  assert.match(gameIndex, /id="finalSaveRate"/);
  assert.match(gameIndex, /id="finalRhythmTag"/);
  assert.match(gameIndex, /id="finalControlTag"/);
  assert.match(gameIndex, /round-result-performance-tags/);
  assert.match(gameScriptSource, /difficulty/);
  assert.match(gameScriptSource, /medium/);
  assert.match(gameScriptSource, /stylized-reusable-matchday-kit/);
  assert.match(gameScriptSource, /professional-keeper-training-court/);
  assert.match(gameScriptSource, /plain-neutral-training-floor-goalmouth-shadows/);
  assert.match(gameScriptSource, /clean-matte-training-surface-material/);
  assert.match(gameScriptSource, /neutral-concrete-court-no-grass/);
  assert.match(gameScriptSource, /minimal-keeper-training-floor/);
  assert.match(gameScriptSource, /field-training-surface/);
  assert.match(gameScriptSource, /modern-panel-match-ball-texture/);
  assert.match(gameScriptSource, /crowd-scoreboard-flags-matchday-dressing/);
  assert.match(gameScriptSource, /broadcast-matchday-polish-kit/);
  assert.match(gameScriptSource, /three-rounded-box-beveled-prop-kit/);
  assert.match(gameScriptSource, /three\/addons\/geometries\/RoundedBoxGeometry/);
  assert.match(gameScriptSource, /sideline-camera-light-and-safety-pad-kit/);
  assert.match(gameScriptSource, /broadcast-camera-pod/);
  assert.match(gameScriptSource, /broadcast-sideline-safety-pad/);
  assert.match(gameScriptSource, /stadium-light-cone/);
  assert.match(gameScriptSource, /stadium-depth-vignette/);
  assert.match(gameScriptSource, /professional-keeper-training-ground-kit/);
  assert.match(gameScriptSource, /training-ground-equipment-cart/);
  assert.match(gameScriptSource, /training-ground-spare-ball/);
  assert.match(gameScriptSource, /training-ground-coach-bench/);
  assert.match(gameScriptSource, /training-ground-tactic-board/);
  assert.match(gameScriptSource, /rounded-posts-with-tensioned-net/);
  assert.match(gameScriptSource, /warm-stadium-three-point/);
  assert.match(gameScriptSource, /three-sky-atmospheric-training-ground/);
  assert.match(gameScriptSource, /three-official-sky-shader/);
  assert.match(gameScriptSource, /three\/addons\/objects\/Sky/);
  assert.match(gameScriptSource, /training-ground-atmospheric-sky/);
  assert.match(gameScriptSource, /environmentSystem/);
  assert.match(gameScriptSource, /neutral-concrete-court-no-grass/);
  assert.match(gameScriptSource, /#8e9295/);
  assert.match(gameScriptSource, /gray-concrete-floor-not-turf/);
  assert.match(gameScriptSource, /#68737b/);
  assert.match(gameScriptSource, /three-spotlight-broadcast-rig/);
  assert.match(gameScriptSource, /stadium-spotlight-rig/);
  assert.match(gameScriptSource, /matchday-feedback-kit/);
  assert.match(gameScriptSource, /match-progress-hud/);
  assert.match(gameScriptSource, /matchProgressFill/);
  assert.match(gameScriptSource, /aria-hidden/);
  assert.match(gameStyleSource, /\.match-progress\{[^}]*opacity:0;[^}]*transform:translate\(-50%,8px\)/);
  assert.match(gameStyleSource, /\.match-progress\.is-visible\{opacity:1;transform:translate\(-50%\)/);
  assert.match(gameScriptSource, /match-atmosphere-event-rail/);
  assert.match(gameScriptSource, /matchAtmosphereFill/);
  assert.match(gameScriptSource, /matchAtmosphereCopy/);
  assert.match(gameScriptSource, /match-audio-status-chip/);
  assert.match(gameScriptSource, /match-pause-coach-hint/);
  assert.match(gameScriptSource, /round-result-coach-note/);
  assert.match(gameScriptSource, /round-result-review-cards/);
  assert.match(gameScriptSource, /caught-save-drop-replay/);
  assert.match(gameScriptSource, /parried-save-deflection-replay/);
  assert.match(gameScriptSource, /height-aware-ball-shadow/);
  assert.match(gameScriptSource, /attached-ball-spin-glint-kit/);
  assert.match(gameScriptSource, /feedback-ball-spin-glint/);
  assert.match(gameScriptSource, /attached-ball-speed-ribbon-kit/);
  assert.match(gameScriptSource, /feedback-ball-speed-ribbon/);
  assert.doesNotMatch(gameScriptSource, /aiming-guide|shot-helper|trajectory-helper/);
  assert.match(gameScriptSource, /localized-net-ripple/);
  assert.match(gameScriptSource, /localized-net-pocket-deformation/);
  assert.match(gameScriptSource, /localized-net-cord-tension-shimmer/);
  assert.match(gameScriptSource, /glove-impact-compression-rebound/);
  assert.match(gameScriptSource, /post-crossbar-rebound-highlight/);
  assert.match(gameScriptSource, /rolling-court-dust-skid-flecks/);
  assert.match(gameScriptSource, /directional-glove-save-afterimage/);
  assert.match(gameScriptSource, /feedback-impact-ring/);
  assert.match(gameScriptSource, /feedback-ground-skid/);
  assert.match(gameScriptSource, /feedback-court-dust-fleck/);
  assert.match(gameScriptSource, /event-weighted-camera-impulse/);
  assert.doesNotMatch(gameScriptSource, /feedback-turf-fleck/);
  assert.doesNotMatch(gameScriptSource, /rolling-turf-contact-flecks/);
  assert.match(gameScriptSource, /feedback-save-spark/);
  assert.match(gameScriptSource, /feedback-save-afterimage/);
  assert.match(gameScriptSource, /feedback-net-ripple-line/);
  assert.match(gameScriptSource, /feedback-net-pocket-deformation/);
  assert.match(gameScriptSource, /feedback-net-cord-tension-shimmer/);
  assert.match(gameScriptSource, /feedback-frame-rebound-highlight/);
  assert.match(gameScriptSource, /feedback-goal-wave/);
  assert.match(gameScriptSource, /feedback-streak-pulse/);
  assert.match(gameScriptSource, /keeper-event-feedback-orchestrator/);
  assert.doesNotMatch(gameScriptSource, /field-foreground-blade-cluster/);
  assert.doesNotMatch(gameScriptSource, /instanced-turf-and-layered-material-kit/);
  assert.doesNotMatch(gameScriptSource, /field-instanced-turf-blades-/);
  assert.doesNotMatch(gameScriptSource, /field-turf(?=["'])/);
  assert.doesNotMatch(gameScriptSource, /field-turf-color-variation-patch/);
  assert.doesNotMatch(gameScriptSource, /field-mowing-stripe/);
  assert.doesNotMatch(gameScriptSource, /field-surface-panel/);
  assert.doesNotMatch(gameScriptSource, /field-depth-band/);
  assert.doesNotMatch(gameScriptSource, /field-turf-maintenance-brush/);
  assert.doesNotMatch(gameScriptSource, /standard-football-pitch/);
  assert.doesNotMatch(gameScriptSource, /field-standard-/);
  assert.doesNotMatch(gameScriptSource, /field-penalty-spot/);
  assert.doesNotMatch(gameScriptSource, /field-touchline-shadow/);
  assert.match(gameScriptSource, /plain-training-floor-no-grass-or-pitch-stripes/);
  assert.match(gameScriptSource, /plain-field-no-grass-clutter/);
  assert.match(gameScriptSource, /plain-matte-training-floor-kit/);
  assert.doesNotMatch(gameScriptSource, /clean-non-grass-training-floor-depth-shadows/);
  assert.doesNotMatch(gameScriptSource, /clean-training-floor-no-grass-clutter/);
  assert.doesNotMatch(gameScriptSource, /clean-field-no-grass-clutter/);
  assert.doesNotMatch(gameScriptSource, /#28b856|#35c961|#22b953|#8fd64f|#73c941/i);
  assert.doesNotMatch(gameScriptSource, /field-edge-tuft-cluster/);
  assert.doesNotMatch(gameScriptSource, /field-goalmouth-wear/);
  assert.doesNotMatch(gameScriptSource, /field-floor-scuff/);
  assert.doesNotMatch(gameScriptSource, /field-shot-lane-compression/);
  assert.doesNotMatch(gameScriptSource, /field-keeper-stance-scuff/);
  assert.doesNotMatch(gameScriptSource, /field-boot-scuff/);
  assert.doesNotMatch(gameScriptSource, /field-line-chalk-dust/);
  assert.match(gameScriptSource, /stadium-crowd-row/);
  assert.match(gameScriptSource, /stadium-scoreboard/);
  assert.match(gameScriptSource, /stadium-corner-flag/);
  assert.match(gameScriptSource, /goal-net-tension-cord/);
  assert.match(gameScriptSource, /manufactured-goal-frame-hardware/);
  assert.match(gameScriptSource, /goal-frame-corner-collar/);
  assert.match(gameScriptSource, /goal-frame-ground-foot-pad/);
  assert.match(gameScriptSource, /goal-net-tie-strap/);
  assert.match(gameScriptSource, /goal-depth-hinge-bracket/);
  assert.match(gameScriptSource, /goal-frame-fastener-bolt/);
  assert.match(gameScriptSource, /weighted-pro-goal-equipment-kit/);
  assert.match(gameScriptSource, /goal-frame-crossbar-sleeve/);
  assert.match(gameScriptSource, /goal-net-rope-tensioner/);
  assert.match(gameScriptSource, /goal-frame-ground-shadow-pad/);
  assert.match(gameScriptSource, /knotted-diagonal-net-weave/);
  assert.match(gameScriptSource, /raised-rope-net-cord-layer/);
  assert.match(gameScriptSource, /three-tube-geometry-raised-net-rope/);
  assert.match(gameScriptSource, /open-diamond-rope-net-ball-first/);
  assert.match(gameScriptSource, /goal-net-open-diamond-rope/);
  assert.match(gameScriptSource, /procedural-braided-cord-net-material/);
  assert.match(gameScriptSource, /braided-nylon-cord-pbr/);
  assert.match(gameScriptSource, /central-shot-lane-low-occlusion-net/);
  assert.match(gameScriptSource, /rear-draped-side-net-volume/);
  assert.match(gameScriptSource, /slack-knotted-pro-goal-net/);
  assert.match(gameScriptSource, /keeper-view-low-opacity-center-window/);
  assert.match(gameScriptSource, /true-open-center-shot-window/);
  assert.match(gameScriptSource, /layered-rear-pocket-braided-net/);
  assert.match(gameScriptSource, /goal-net-rear-pocket-diamond-rope/);
  assert.match(gameScriptSource, /goal-net-rear-depth-row-cord/);
  assert.match(gameScriptSource, /goal-net-top-sag-cord/);
  assert.match(gameScriptSource, /goal-net-rear-pocket-sag-cord/);
  assert.match(gameScriptSource, /goal-net-side-return-cord/);
  assert.match(gameScriptSource, /goal-net-slack-knot/);
  assert.match(gameScriptSource, /goal-net-rear-drape-cord/);
  assert.match(gameScriptSource, /goal-net-side-depth-cord/);
  assert.match(gameScriptSource, /goal-net-raised-vertical-cord/);
  assert.match(gameScriptSource, /goal-net-raised-horizontal-cord/);
  assert.match(gameScriptSource, /goal-net-raised-border-rope/);
  assert.match(gameScriptSource, /goal-net-diagonal-weave/);
  assert.match(gameScriptSource, /goal-net-corner-sleeve/);
  assert.match(gameScriptSource, /goal-net-weave-knot/);
  assert.match(gameScriptSource, /reactive-woven-net-detail-kit/);
  assert.match(gameScriptSource, /reactive-woven-net-recoil/);
  assert.match(gameScriptSource, /feedback-dynamic-net-detail-recoil/);
  assert.match(gameScriptSource, /weighted-net-label-and-clip-kit/);
  assert.match(gameScriptSource, /goal-net-bottom-weight/);
  assert.match(gameScriptSource, /goal-frame-net-clip/);
  assert.match(gameScriptSource, /stitched-padded-match-glove/);
  assert.match(gameScriptSource, /latex-ridge-and-stitched-fingerback/);
  assert.match(gameScriptSource, /glove-fingerback-protection-ridge/);
  assert.match(gameScriptSource, /glove-latex-grip-ridge/);
  assert.match(gameScriptSource, /glove-stitch-bead/);
  assert.match(gameScriptSource, /glove-ball-contact-pressure-kit/);
  assert.match(gameScriptSource, /feedback-save-pressure-arc/);
  assert.match(gameScriptSource, /close-contact-glove-ball-shockwave/);
  assert.match(gameScriptSource, /feedback-save-contact-shockwave/);
  assert.match(gameScriptSource, /localized-glove-palm-deformation/);
  assert.match(gameScriptSource, /feedback-glove-contact-dimple/);
  assert.match(gameScriptSource, /feedback-glove-latex-rebound-highlight/);
  assert.match(gameScriptSource, /feedback-glove-palm-crease/);
  assert.match(gameScriptSource, /glove-vent-perforation/);
  assert.match(gameScriptSource, /raised-seam-accent-match-ball/);
  assert.match(gameScriptSource, /micro-scuffs-valve-and-panel-depth/);
  assert.match(gameScriptSource, /painted-rubber-air-valve/);
  assert.match(gameScriptSource, /matchday-audio-event-layer/);
  assert.match(gameScriptSource, /clean-save-audio-cue/);
  assert.match(gameScriptSource, /frame-rattle-audio-cue/);
  assert.match(gameScriptSource, /goal-net-audio-cue/);
  assert.match(gameScriptSource, /court-skid-audio-cue/);
  assert.doesNotMatch(gameScriptSource, /turf-skid-audio-cue/);
  assert.match(gameScriptSource, /vibrate/);
  assert.match(gameScriptSource, /save-streak-audio-cue/);
  assert.match(gameScriptSource, /danger-goal-audio-cue/);
  assert.match(gameScriptSource, /round-end-audio-cue/);
  assert.match(gameScriptSource, /round-result-summary/);
  assert.match(gameScriptSource, /round-result-performance-tags/);
  assert.match(gameScriptSource, /animated-launch-bay-with-ball-feed/);
  assert.match(gameScriptSource, /hydraulic-recoil-aiming-cradle/);
  assert.match(gameScriptSource, /launcher-recoil-sled/);
  assert.match(gameScriptSource, /launcher-hydraulic-piston/);
  assert.match(gameScriptSource, /launcher-muzzle-flash/);
  assert.match(gameScriptSource, /match-hud-flow-polish/);
  assert.match(gameScriptSource, /match-pressure-hud/);
  assert.match(gameScriptSource, /live-match-control-rail/);
  assert.match(gameScriptSource, /bottomControls/);
  assert.match(gameScriptSource, /broadcast-event-feedback-presentation/);
  assert.match(gameScriptSource, /camera-attached-broadcast-presentation-layer/);
  assert.match(gameScriptSource, /three-camera-transparent-overlay-kit/);
  assert.match(gameScriptSource, /presentation-screen-wash/);
  assert.match(gameScriptSource, /presentation-vignette/);
  assert.match(gameScriptSource, /presentation-event-focus-ring/);
  assert.match(gameScriptSource, /three-effectcomposer-unreal-bloom-event-pipeline/);
  assert.match(gameScriptSource, /three-official-postprocessing-addons/);
  assert.match(gameScriptSource, /postprocessingSystem/);
  assert.match(gameScriptSource, /postprocessingBloom/);
  assert.match(gameScriptSource, /broadcast-event-ribbon-hud/);
  assert.match(gameStyleSource, /broadcast-control-rail-hud/);
  assert.match(gameStyleSource, /live-match-control-rail/);
  assert.match(gameStyleSource, /bottom-controls\[data-control-mode=live\]/);
  assert.match(gameStyleSource, /bottom-controls\.is-live-compact/);
  assert.match(gameStyleSource, /broadcast-event-ribbon-hud/);
  assert.match(gameStyleSource, /match-mobile-corner-controls/);
  assert.match(gameStyleSource, /game-hud:{1,2}before/);
  assert.match(gameStyleSource, /bottom-controls:{1,2}before/);
  assert.match(gameScriptSource, /forceFrame/);
  assert.match(gameScriptSource, /frameFlashColor/);
  assert.match(gameScriptSource, /\/tools\/goalkeeper-landscape\/audio\/mixkit-soccer-ball-kick-2099\.wav/);
  assert.doesNotMatch(gameScriptSource, /url:\s*"\/audio\//);
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
