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
});
