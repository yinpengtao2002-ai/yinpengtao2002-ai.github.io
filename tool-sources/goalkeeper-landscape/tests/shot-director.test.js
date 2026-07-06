import { describe, expect, it } from "vitest";
import { createShotDirector, updateShotDirector } from "../src/game/shot-director.js";

describe("shot director", () => {
  it("starts each shot with a readable cue phase before launch", () => {
    const director = createShotDirector({ seed: 7 });

    expect(director.phase).toBe("cue");
    expect(director.currentShot.cue.lean).toMatch(/left|right|center/);
    expect(director.currentShot.cue.swing).toMatch(/drive|curl|dip/);
    expect(director.currentShot.ball).toBe(null);
  });

  it("launches a ball after the cue duration", () => {
    let director = createShotDirector({ seed: 7 });

    director = updateShotDirector(director, 1.2, 0.5);

    expect(director.phase).toBe("live");
    expect(director.currentShot.ball).not.toBe(null);
    expect(director.currentShot.ball.velocity.z).toBeLessThan(0);
  });

  it("increases difficulty over the round", () => {
    const early = createShotDirector({ seed: 4, elapsed: 2 });
    const late = createShotDirector({ seed: 4, elapsed: 52 });

    expect(Math.abs(late.currentShot.ballPlan.velocity.z)).toBeGreaterThan(Math.abs(early.currentShot.ballPlan.velocity.z));
    expect(late.currentShot.cueDuration).toBeLessThan(early.currentShot.cueDuration);
  });

  it("generates powerful mostly straight shots from a distant small ball", () => {
    const director = createShotDirector({ seed: 11, elapsed: 18 });
    const plan = director.currentShot.ballPlan;

    expect(plan.position.z).toBeGreaterThanOrEqual(32);
    expect(Math.abs(plan.velocity.z)).toBeGreaterThanOrEqual(36);
    expect(Math.abs(plan.curve)).toBeLessThanOrEqual(0.08);
    expect(plan.velocity.y).toBeLessThanOrEqual(3.6);
    expect(Math.abs(plan.spin)).toBeLessThanOrEqual(5.5);
  });

  it("keeps opening shots in a reachable learning window without making them slow", () => {
    for (let seed = 1; seed <= 12; seed += 1) {
      const director = createShotDirector({ seed, elapsed: 0 });
      const plan = director.currentShot.ballPlan;

      expect(Math.abs(plan.target.x)).toBeLessThanOrEqual(1.35);
      expect(plan.target.y).toBeGreaterThanOrEqual(0.55);
      expect(plan.target.y).toBeLessThanOrEqual(1.9);
      expect(Math.abs(plan.velocity.z)).toBeGreaterThanOrEqual(38);
    }
  });
});
