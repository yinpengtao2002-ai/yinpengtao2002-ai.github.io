import { describe, expect, it } from "vitest";
import { getBallTrailStyle, getNetPocketStyle, getShooterPose } from "../src/render/renderer.js";

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
});
