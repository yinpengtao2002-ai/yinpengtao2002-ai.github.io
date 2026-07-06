import { describe, expect, it } from "vitest";
import {
  createShot3DDirector,
  predictShotPosition,
  updateShot3DDirector,
} from "../src/game/shot-3d-director.js";

describe("3D shot director", () => {
  it("plans a fast shot from the shooter's foot toward the goal", () => {
    const director = createShot3DDirector({ seed: 14, elapsed: 8 });
    const shot = director.currentShot;

    expect(director.phase).toBe("cue");
    expect(shot.cue.lean).toMatch(/left|right|center/);
    expect(shot.cue.swing).toMatch(/drive|curl|dip/);
    expect(shot.origin.x).toBeCloseTo(0, 1);
    expect(shot.origin.y).toBeGreaterThanOrEqual(0.22);
    expect(shot.origin.y).toBeLessThanOrEqual(0.34);
    expect(shot.origin.z).toBeGreaterThanOrEqual(-20);
    expect(shot.origin.z).toBeLessThanOrEqual(-18);
    expect(shot.flightTime).toBeLessThan(0.6);
    expect(shot.ballPlan.velocity.z).toBeGreaterThan(40);
    expect(Math.abs(shot.ballPlan.velocity.x)).toBeLessThan(6);
    expect(Math.abs(shot.curveForce.x)).toBeLessThanOrEqual(4.2);
  });

  it("ballistic velocity reaches the intended goal-mouth target", () => {
    const director = createShot3DDirector({ seed: 3, elapsed: 20 });
    const shot = director.currentShot;
    const predicted = predictShotPosition(shot.ballPlan, shot.flightTime);

    expect(predicted.x).toBeCloseTo(shot.target.x, 1);
    expect(predicted.y).toBeCloseTo(shot.target.y, 1);
    expect(predicted.z).toBeCloseTo(shot.target.z, 1);
  });

  it("late shots arrive faster with shorter cues", () => {
    const early = createShot3DDirector({ seed: 22, elapsed: 2 }).currentShot;
    const late = createShot3DDirector({ seed: 22, elapsed: 54 }).currentShot;

    expect(late.flightTime).toBeLessThan(early.flightTime);
    expect(late.cueDuration).toBeLessThan(early.cueDuration);
    expect(late.ballPlan.velocity.z).toBeGreaterThan(early.ballPlan.velocity.z);
  });

  it("biases mature shots toward far corners and awkward edge targets", () => {
    const shots = Array.from({ length: 80 }, (_, index) => createShot3DDirector({ seed: index + 1, elapsed: 42 }).currentShot);
    const edgeShots = shots.filter((shot) => Math.abs(shot.target.x) >= 2.25);
    const centralShots = shots.filter((shot) => Math.abs(shot.target.x) < 1.25);
    const verticalEdgeShots = shots.filter((shot) => shot.target.y <= 0.78 || shot.target.y >= 1.9);
    const cornerShots = shots.filter((shot) => Math.abs(shot.target.x) >= 2.25 && (shot.target.y <= 0.78 || shot.target.y >= 1.9));

    expect(edgeShots.length).toBeGreaterThanOrEqual(28);
    expect(centralShots.length).toBeLessThanOrEqual(24);
    expect(verticalEdgeShots.length).toBeGreaterThanOrEqual(36);
    expect(cornerShots.length).toBeGreaterThanOrEqual(14);
  });

  it("transitions from cue to live launch after the kick window", () => {
    let director = createShot3DDirector({ seed: 7 });

    director = updateShot3DDirector(director, 0.55, 0);
    expect(director.phase).toBe("cue");

    director = updateShot3DDirector(director, 0.45, 1);
    expect(director.phase).toBe("live");
    expect(director.currentShot.shotId).toBe(0);
  });
});
