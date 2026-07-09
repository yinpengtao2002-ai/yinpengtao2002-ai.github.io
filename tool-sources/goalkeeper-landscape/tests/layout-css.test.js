import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const testDir = dirname(fileURLToPath(import.meta.url));
const stylesPath = resolve(testDir, "../styles.css");

describe("responsive layout css", () => {
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
    expect(css).toContain("#restartButton");
    expect(css).toContain("height: 38px;");
  });

  it("keeps the match progress meter slim, safe-area aware, and away from the ball path", () => {
    const css = readFileSync(stylesPath, "utf8");

    expect(css).toContain("match-progress-hud");
    expect(css).toContain(".match-progress");
    expect(css).toContain(".match-progress-fill");
    expect(css).toContain("bottom: max(clamp(72px, 9svh, 106px), calc(env(safe-area-inset-bottom) + 76px));");
    expect(css).toContain("height: clamp(6px, 0.75vw, 10px);");
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

  it("adds an edge-anchored event ribbon and moves mobile controls away from the save lane", () => {
    const css = readFileSync(stylesPath, "utf8");

    expect(css).toContain("broadcast-event-ribbon-hud");
    expect(css).toContain(".event-ribbon");
    expect(css).toContain(".event-ribbon.is-save");
    expect(css).toContain(".event-ribbon.is-streak");
    expect(css).toContain(".event-ribbon.is-danger");
    expect(css).toContain("left: max(clamp(14px, 2.1vw, 34px), env(safe-area-inset-left));");
    expect(css).toContain("top: max(clamp(68px, 9svh, 104px), calc(env(safe-area-inset-top) + 58px));");
    expect(css).toContain("match-mobile-corner-controls");
    expect(css).toContain("grid-template-columns: auto auto;");
    expect(css).toContain("justify-content: space-between;");
  });

  it("uses playfield-safe start and control docks instead of a center-blocking debug panel", () => {
    const css = readFileSync(stylesPath, "utf8");

    expect(css).toContain("playfield-safe-start-dock");
    expect(css).toContain("corner-control-clusters");
    expect(css).toContain("place-items: end start;");
    expect(css).toContain("width: min(450px, calc(100vw - 44px));");
    expect(css).toContain("grid-template-columns: auto minmax(0, 1fr) auto;");
    expect(css).toContain(".bottom-controls::before");
    expect(css).toContain("display: none;");
    expect(css).toContain(".sound-status");
    expect(css).toContain("clip-path: inset(50%);");
  });
});
