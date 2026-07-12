import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const testDir = dirname(fileURLToPath(import.meta.url));
const stylesPath = resolve(testDir, "../styles.css");
const indexPath = resolve(testDir, "../index.html");

describe("responsive layout css", () => {
  it("uses a clean portrait orientation gate instead of rotating the full game UI", () => {
    const css = readFileSync(stylesPath, "utf8");

    expect(css).toContain("portrait-orientation-gate");
    expect(css).toContain('.stage[data-mobile-landscape="prompt"]');
    expect(css).toContain("请横屏体验");
    expect(css).not.toContain("transform: rotate(90deg) translateY(-100%);");
  });

  it("reserves left edge space for bottom controls in mobile landscape", () => {
    const css = readFileSync(stylesPath, "utf8");

    expect(css).toContain("@media (max-height: 520px) and (orientation: landscape)");
    expect(css).toContain("left: max(64px, env(safe-area-inset-left));");
  });

  it("defines a polished match-flow HUD layer instead of a single temporary start button", () => {
    const css = readFileSync(stylesPath, "utf8");

    expect(css).toContain("match-hud-flow-polish");
    expect(css).toContain(".start-panel");
    expect(css).toContain(".start-rules");
    expect(css).toContain(".pause-overlay");
    expect(css).toContain(".result-grade");
    expect(css).toContain(".result-verdict");
  });

  it("keeps the result panel fully reachable on short mobile landscape screens", () => {
    const css = readFileSync(stylesPath, "utf8");

    expect(css).toContain("short-landscape-result-panel");
    expect(css).toContain(".end-overlay");
    expect(css).toContain("max-height: calc(100svh - 16px);");
    expect(css).toContain("round-result-review-cards");
    expect(css).toContain(".result-review");
    expect(css).toContain(".result-review span");
    expect(css).toContain(".result-review strong");
    expect(css).toContain("#restartButton");
    expect(css).toContain("height: 38px;");
  });

  it("keeps the match progress meter slim, safe-area aware, and away from the ball path", () => {
    const css = readFileSync(stylesPath, "utf8");

    expect(css).toContain("match-progress-hud");
    expect(css).toContain(".match-progress");
    expect(css).toContain(".match-progress-fill");
    expect(css).toContain(".match-progress.is-visible");
    expect(css).toContain("bottom: max(clamp(72px, 9svh, 106px), calc(env(safe-area-inset-bottom) + 76px));");
    expect(css).toContain("height: clamp(6px, 0.75vw, 10px);");
    expect(css).toContain("opacity: 0;");
    expect(css).toContain("transform: translate(-50%, 8px);");
    expect(css).toContain("transform: translate(-50%, 0);");
    expect(css).toContain(".match-progress.is-low-time");
    expect(css).toContain(".match-progress.is-match-point");
  });

  it("styles audio readiness and coach-note surfaces as compact HUD details", () => {
    const css = readFileSync(stylesPath, "utf8");

    expect(css).toContain("match-audio-status-chip");
    expect(css).toContain(".sound-status");
    expect(css).toContain(".utility-button.is-sound-ready");
    expect(css).toContain(".utility-button.is-sound-muted");
    expect(css).toContain("match-pause-coach-hint");
    expect(css).toContain(".pause-hint");
    expect(css).toContain("round-result-coach-note");
    expect(css).toContain(".result-coach");
    expect(css).toContain("@media (max-height: 520px) and (orientation: landscape)");
    expect(css).toContain(".sound-status");
    expect(css).toContain("max-width: min(260px, 42vw);");
  });

  it("adds a broadcast control rail HUD treatment that stays outside the main ball lane", () => {
    const css = readFileSync(stylesPath, "utf8");

    expect(css).toContain("broadcast-control-rail-hud");
    expect(css).toContain(".game-hud::before");
    expect(css).toContain(".bottom-controls::before");
    expect(css).toContain("pointer-events: none;");
    expect(css).toContain("max-width: min(760px, calc(100vw - 32px));");
    expect(css).toContain("bottom: max(clamp(14px, 2vw, 28px), env(safe-area-inset-bottom));");
    expect(css).toContain("@media (max-height: 520px) and (orientation: landscape)");
    expect(css).toContain("max-width: min(680px, calc(100vw - 96px));");
  });

  it("uses a compact broadcast scorebug instead of oversized temporary HUD capsules", () => {
    const css = readFileSync(stylesPath, "utf8");

    expect(css).toContain("broadcast-scorebug-compact-hud");
    expect(css).toContain(".broadcast-scorebug");
    expect(css).toContain(".hud-metric");
    expect(css).toContain(".hud-label");
    expect(css).toContain(".hud-value");
    expect(css).toContain("width: min(620px, calc(100vw - 28px));");
    expect(css).toContain("max-width: min(620px, calc(100vw - 28px));");
    expect(css).toContain("height: clamp(38px, 4.2svh, 50px);");
    expect(css).toContain("background: linear-gradient(180deg, rgba(10, 24, 22, 0.78), rgba(6, 16, 15, 0.58));");
    expect(css).toContain(".broadcast-scorebug .glass-panel");
    expect(css).toContain("min-height: clamp(30px, 3.3svh, 38px);");
    expect(css).toContain(".broadcast-scorebug .glass-button");
    expect(css).toContain("@media (max-height: 520px) and (orientation: landscape)");
    expect(css).toContain("width: min(520px, calc(100vw - 96px));");
    expect(css).toContain(".broadcast-scorebug .hud-label");
    expect(css).toContain("display: none;");
  });

  it("adds a lightweight match-state scorebug skin without creating a new shot-lane overlay", () => {
    const css = readFileSync(stylesPath, "utf8");

    expect(css).toContain("match-state-scorebug-skin");
    expect(css).toContain(".broadcast-scorebug[data-hud-skin-system=\"match-state-scorebug-skin\"]");
    expect(css).toContain(".broadcast-scorebug.is-save-tone");
    expect(css).toContain(".broadcast-scorebug.is-streak-tone");
    expect(css).toContain(".broadcast-scorebug.is-goal-tone");
    expect(css).toContain(".broadcast-scorebug.is-danger-tone");
    expect(css).toContain(".broadcast-scorebug.is-pressure-tone");
    expect(css).toContain("height: clamp(38px, 4.2svh, 50px);");
    expect(css).toContain("box-shadow: 0 12px 26px rgba(4, 14, 12, 0.18)");
    expect(css).not.toContain(".match-state-overlay");
    expect(css).not.toContain("position: fixed;");
  });

  it("adds an edge-anchored event ribbon and moves mobile controls away from the save lane", () => {
    const css = readFileSync(stylesPath, "utf8");
    const html = readFileSync(indexPath, "utf8");

    expect(css).toContain("single-match-event-feedback-layer");
    expect(css).toContain(".event-ribbon");
    expect(css).toContain(".event-ribbon.is-save");
    expect(css).toContain(".event-ribbon.is-streak");
    expect(css).toContain(".event-ribbon.is-danger");
    expect(css).toContain("left: max(clamp(14px, 2.1vw, 34px), env(safe-area-inset-left));");
    expect(css).toContain("top: max(clamp(68px, 9svh, 104px), calc(env(safe-area-inset-top) + 58px));");
    expect(css).toContain("match-mobile-corner-controls");
    expect(css).toContain("grid-template-columns: auto auto;");
    expect(css).toContain("justify-content: space-between;");
    expect(html).toContain('data-hud-system="single-match-event-feedback-layer"');
    expect(html).not.toContain('id="feedbackToast"');
    expect(html).not.toContain('id="matchAtmosphere"');
  });

  it("uses playfield-safe start and control docks instead of a center-blocking debug panel", () => {
    const css = readFileSync(stylesPath, "utf8");

    expect(css).toContain("playfield-safe-start-dock");
    expect(css).toContain("corner-control-clusters");
    expect(css).toContain("place-items: end start;");
    expect(css).toContain("width: min(360px, calc(100vw - 32px));");
    expect(css).toContain("grid-template-columns: auto minmax(0, 1fr) auto;");
    expect(css).toContain(".bottom-controls::before");
    expect(css).toContain("display: none;");
    expect(css).toContain(".sound-status");
    expect(css).toContain("clip-path: inset(50%);");
    expect(css).toContain("compact-match-start-ticket");
    expect(css).toContain("icon-only-match-controls");
  });

  it("uses compact icon controls and a simplified end card on short landscape screens", () => {
    const css = readFileSync(stylesPath, "utf8");
    const html = readFileSync(indexPath, "utf8");

    expect(css).toContain("icon-only-match-controls");
    expect(css).toContain(".utility-button::before");
    expect(css).toContain(".utility-button::after");
    expect(css).toContain(".hud-pause-button");
    expect(css).toContain('.bottom-controls[data-control-mode="result"]');
    expect(html).toContain('class="result-scoreblock"');
    expect(html).toContain('class="result-copyblock"');
    expect(html).not.toContain('id="resultReview"');
    expect(html).not.toContain('id="resultTags"');
  });

  it("compacts the live bottom control rail so setup controls do not sit in the shot lane", () => {
    const css = readFileSync(stylesPath, "utf8");

    expect(css).toContain("live-match-control-rail");
    expect(css).toContain('.bottom-controls[data-control-mode="live"]');
    expect(css).toContain(".bottom-controls.is-live-compact .difficulty-control");
    expect(css).toContain("visibility: hidden;");
    expect(css).toContain("pointer-events: none;");
    expect(css).toContain(".bottom-controls.is-live-compact .utility-button");
    expect(css).toContain("grid-template-columns: auto;");
    expect(css).toContain("justify-content: end;");
  });

  it("adds a slim match atmosphere rail for event feedback without blocking the play field", () => {
    const css = readFileSync(stylesPath, "utf8");

    expect(css).toContain("match-atmosphere-event-rail");
    expect(css).toContain(".match-atmosphere");
    expect(css).toContain(".match-atmosphere-fill");
    expect(css).toContain(".match-atmosphere-copy");
    expect(css).toContain("pointer-events: none;");
    expect(css).toContain(".match-atmosphere.is-save");
    expect(css).toContain(".match-atmosphere.is-streak");
    expect(css).toContain(".match-atmosphere.is-goal");
    expect(css).toContain(".match-atmosphere.is-danger");
    expect(css).toContain(".match-atmosphere.is-frame");
    expect(css).toContain(".match-atmosphere.is-pressure");
    expect(css).toContain("bottom: max(clamp(88px, 11svh, 126px), calc(env(safe-area-inset-bottom) + 96px));");
  });

  it("adds a compact penalty shootout score strip and mode selector outside the shot lane", () => {
    const css = readFileSync(stylesPath, "utf8");
    const html = readFileSync(indexPath, "utf8");

    expect(html).toContain('data-mode="timed"');
    expect(html).toContain('data-mode="penalty"');
    expect(html).toContain('data-difficulty="extreme"');
    expect(html).toContain('id="penaltyScoreboard"');
    expect(html).toContain('id="penaltyTeamKicks"');
    expect(html).toContain('id="penaltyOpponentKicks"');
    expect(css).toContain("penalty-shootout-score-strip");
    expect(css).toContain(".mode-control");
    expect(css).toContain(".penalty-scoreboard");
    expect(css).toContain(".penalty-kick-marks");
    expect(css).toContain('.stage[data-mode="penalty"]');
    expect(css).toContain("pointer-events: none;");
    expect(css).toContain("@media (max-height: 520px) and (orientation: landscape)");
  });

  it("adds a centered penalty round score break without nesting it in the top scoreboard", () => {
    const css = readFileSync(stylesPath, "utf8");
    const html = readFileSync(indexPath, "utf8");

    expect(html).toContain('id="penaltyRoundBreak"');
    expect(html).toContain('id="penaltyRoundBreakScore"');
    expect(html).toContain('id="penaltyRoundBreakDetail"');
    expect(css).toContain("penalty-round-score-break");
    expect(css).toContain(".penalty-round-break.is-visible");
    expect(css).toContain(".match-status.is-penalty-countdown");
  });

  it("gives the penalty start action its own wide icon-free button treatment", () => {
    const css = readFileSync(stylesPath, "utf8");

    expect(css).toMatch(/\.stage\[data-mode="penalty"\] \.start-panel\s*\{[^}]*width:\s*min\(450px, calc\(100vw - 32px\)\)/s);
    expect(css).toMatch(/\.stage\[data-mode="penalty"\] \.start-panel h1\s*\{[^}]*white-space:\s*nowrap/s);
    expect(css).toMatch(/\.stage\[data-mode="penalty"\] \.start-rules\s*\{[^}]*flex-wrap:\s*nowrap/s);
    expect(css).toContain('.stage[data-mode="penalty"] .start-disc');
    expect(css).toContain('.stage[data-mode="penalty"] .start-disc > span');
    expect(css).toMatch(/\.stage\[data-mode="penalty"\] \.start-disc > span\s*\{[^}]*display:\s*none/s);
    expect(css).toMatch(/\.stage\[data-mode="penalty"\] \.start-disc > strong\s*\{[^}]*white-space:\s*nowrap/s);
  });
});
