import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { getBallTrailStyle, getCanvasFallbackSurfacePalette, getNetPocketStyle, getShooterPose } from "../src/render/renderer.js";

describe("renderer helpers", () => {
  it("keeps deflected saves visually traceable after glove contact", () => {
    expect(getBallTrailStyle({ outcome: "live" }).visible).toBe(true);
    expect(getBallTrailStyle({ outcome: "deflected" }).visible).toBe(true);
    expect(getBallTrailStyle({ outcome: "saved" }).visible).toBe(true);
    expect(getBallTrailStyle({ outcome: "conceded" }).visible).toBe(true);
    expect(getBallTrailStyle({ outcome: "deflected" }).strokeStyle).toContain("154,255,190");
    expect(getBallTrailStyle({ outcome: "saved" }).strokeStyle).toContain("154,255,190");
  });

  it("animates the shooter through windup, strike, follow-through, and recovery", () => {
    const currentShot = {
      cueDuration: 1,
      cue: { lean: "left", side: -1, swing: "drive" },
    };
    const windup = getShooterPose({ phase: "cue", phaseTime: 0.12, currentShot });
    const strike = getShooterPose({ phase: "cue", phaseTime: 0.82, currentShot });
    const followThrough = getShooterPose({ phase: "live", phaseTime: 0.08, currentShot });
    const recovery = getShooterPose({ phase: "live", phaseTime: 0.62, currentShot });

    expect(Math.abs(strike.kickFoot.x)).toBeLessThan(Math.abs(windup.kickFoot.x));
    expect(strike.kickFoot.y).toBeLessThan(windup.kickFoot.y);
    expect(Math.abs(followThrough.bodyTilt)).toBeGreaterThan(Math.abs(recovery.bodyTilt));
    expect(recovery.kickFoot.y).toBeGreaterThan(followThrough.kickFoot.y);
    expect(followThrough.motion).toBe("follow-through");
    expect(recovery.motion).toBe("recovery");
  });

  it("exposes a visible net pocket when a failed save is trapped in the goal", () => {
    const livePocket = getNetPocketStyle(
      { outcome: "live", position: { x: 0, y: 1.2, z: 1 } },
      { width: 1280, height: 720 }
    );
    const trappedPocket = getNetPocketStyle(
      {
        outcome: "conceded",
        goalAge: 0.42,
        position: { x: 1.1, y: 0.9, z: -2.45 },
        velocity: { x: 0.2, y: -0.4, z: 0.3 },
      },
      { width: 1280, height: 720 }
    );

    expect(livePocket.visible).toBe(false);
    expect(trappedPocket.visible).toBe(true);
    expect(trappedPocket.tension).toBeGreaterThan(0.4);
    expect(trappedPocket.x).toBeGreaterThan(640);
    expect(trappedPocket.y).toBeLessThan(720 * 0.7);
  });

  it("keeps canvas fallback fields free of green turf fills and blade strokes", () => {
    const rendererSource = readFileSync(new URL("../src/render/renderer.js", import.meta.url), "utf8");
    const legacyGameSource = readFileSync(new URL("../game-core.js", import.meta.url), "utf8");
    const combinedSource = rendererSource + "\n" + legacyGameSource;

    expect(combinedSource).not.toMatch(/#28b856|#35c961|#22b953|#8fd64f|#73c941/i);
    expect(combinedSource).not.toMatch(/for \(var blade/);
  });

  it("uses a neutral concrete fallback palette instead of grass-like wall and floor tones", () => {
    const palette = getCanvasFallbackSurfacePalette();
    const serialized = JSON.stringify(palette);

    expect(palette.system).toBe("canvas-fallback-neutral-concrete-no-grass");
    expect(palette.wallStops).toEqual(["#d7d6cf", "#aaaeb1", "#5c646a", "#232a30"]);
    expect(palette.sideWall).toBe("#1d252b");
    expect(palette.fieldFill).toBe("#626f75");
    expect(serialized).not.toMatch(/#cbd5c7|#879384|#39433a|#17211a|#121917/i);
  });
});
