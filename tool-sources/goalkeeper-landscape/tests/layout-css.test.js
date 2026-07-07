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
});
