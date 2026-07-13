import { describe, expect, it } from "vitest";
import {
  DEFAULT_SHOT_DIFFICULTY,
  SHOT_3D,
  SHOT_DIFFICULTIES,
  SHOT_EASTER_EGG,
  createShot3D,
  createShot3DDirector,
  getAdaptivePenaltySide,
  predictShotPosition,
  resolveEasterEggShotVariant,
  resolveShotDifficulty,
  updateShot3DDirector,
} from "../src/game/shot-3d-director.js";

describe("3D shot director", () => {
  it("plans a fast shot from the launcher's visible muzzle toward the goal", () => {
    const director = createShot3DDirector({ seed: 14, elapsed: 8 });
    const shot = director.currentShot;

    expect(director.phase).toBe("cue");
    expect(shot.cue.lean).toMatch(/left|right|center/);
    expect(shot.cue.swing).toMatch(/drive|curl|dip/);
    expect(Math.sign(shot.origin.x)).toBe(shot.cue.side);
    expect(Math.abs(shot.origin.x)).toBeGreaterThanOrEqual(0.07);
    expect(Math.abs(shot.origin.x)).toBeLessThanOrEqual(0.1);
    expect(shot.origin.y).toBeGreaterThanOrEqual(1.9);
    expect(shot.origin.y).toBeLessThanOrEqual(1.98);
    expect(shot.origin.z).toBeGreaterThanOrEqual(-17.8);
    expect(shot.origin.z).toBeLessThanOrEqual(-17.72);
    expect(shot.ballPlan.origin).toEqual(shot.origin);
    expect(shot.flightTime).toBeLessThan(0.6);
    expect(shot.ballPlan.velocity.z).toBeGreaterThan(38);
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

  it("keeps frame and off-target easter eggs below one percent combined", () => {
    expect(SHOT_EASTER_EGG.frameChance).toBe(0.005);
    expect(SHOT_EASTER_EGG.wideChance).toBe(0.003);
    expect(SHOT_EASTER_EGG.totalChance).toBe(0.008);
    expect(resolveEasterEggShotVariant(0)).toBe("frame");
    expect(resolveEasterEggShotVariant(0.0049)).toBe("frame");
    expect(resolveEasterEggShotVariant(0.005)).toBe("wide");
    expect(resolveEasterEggShotVariant(0.0079)).toBe("wide");
    expect(resolveEasterEggShotVariant(0.008)).toBe("standard");
  });

  it("aims forced easter eggs at real frame geometry or clearly outside the goal", () => {
    const frameShot = createShot3D({
      random: () => 0.5,
      elapsed: 20,
      shotId: 91,
      difficulty: "medium",
      easterEggRoll: 0,
    });
    const wideShot = createShot3D({
      random: () => 0.5,
      elapsed: 20,
      shotId: 92,
      difficulty: "medium",
      easterEggRoll: 0.006,
    });

    expect(frameShot.shotVariant).toBe("frame");
    expect(frameShot.ballPlan.shotVariant).toBe("frame");
    expect(Math.abs(frameShot.target.x)).toBeCloseTo(SHOT_3D.goalHalfWidth + 0.06, 5);
    expect(frameShot.target.y).toBeGreaterThan(0.5);
    expect(frameShot.target.y).toBeLessThan(SHOT_3D.goalHeight);

    expect(wideShot.shotVariant).toBe("wide");
    expect(wideShot.ballPlan.shotVariant).toBe("wide");
    expect(Math.abs(wideShot.target.x)).toBeGreaterThan(SHOT_3D.goalHalfWidth + 0.5);
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

  it("keeps medium as the current baseline while easy and hard adjust shot pressure", () => {
    expect(DEFAULT_SHOT_DIFFICULTY).toBe("medium");
    expect(Object.keys(SHOT_DIFFICULTIES)).toEqual(["easy", "medium", "hard", "extreme"]);
    expect(resolveShotDifficulty("missing").id).toBe("medium");

    const easy = createShot3DDirector({ seed: 22, elapsed: 18, difficulty: "easy" }).currentShot;
    const medium = createShot3DDirector({ seed: 22, elapsed: 18, difficulty: "medium" }).currentShot;
    const hard = createShot3DDirector({ seed: 22, elapsed: 18, difficulty: "hard" }).currentShot;

    expect(easy.difficulty).toBe("easy");
    expect(medium.difficulty).toBe("medium");
    expect(hard.difficulty).toBe("hard");
    expect(medium.flightTime).toBeCloseTo(0.525, 3);
    expect(medium.cueDuration).toBeCloseTo(0.712, 3);
    expect(easy.flightTime).toBeGreaterThan(medium.flightTime);
    expect(easy.cueDuration).toBeGreaterThan(medium.cueDuration);
    expect(hard.flightTime).toBeLessThan(medium.flightTime);
    expect(hard.cueDuration).toBeLessThan(medium.cueDuration);
    expect(hard.ballPlan.velocity.z).toBeGreaterThan(medium.ballPlan.velocity.z);
    expect(easy.ballPlan.velocity.z).toBeLessThan(medium.ballPlan.velocity.z);
  });

  it("makes extreme penalty shots faster and more corner-focused than hard shots", () => {
    const hardShots = Array.from({ length: 100 }, (_, index) => createShot3DDirector({
      seed: index + 1,
      elapsed: 30,
      difficulty: "hard",
    }).currentShot);
    const extremeShots = Array.from({ length: 100 }, (_, index) => createShot3DDirector({
      seed: index + 1,
      elapsed: 30,
      difficulty: "extreme",
      keeperX: 0,
    }).currentShot);
    const hardAverageFlight = hardShots.reduce((sum, shot) => sum + shot.flightTime, 0) / hardShots.length;
    const extremeAverageFlight = extremeShots.reduce((sum, shot) => sum + shot.flightTime, 0) / extremeShots.length;
    const extremeCorners = extremeShots.filter((shot) => (
      Math.abs(shot.target.x) >= 2.7 && (shot.target.y <= 0.72 || shot.target.y >= 1.96)
    ));

    expect(resolveShotDifficulty("extreme").label).toBe("极难");
    expect(extremeAverageFlight).toBeLessThan(hardAverageFlight);
    expect(extremeCorners.length).toBeGreaterThanOrEqual(70);
  });

  it("reads the keeper position and attacks the opposite side most of the time on extreme", () => {
    const leftKeeperSides = Array.from({ length: 100 }, (_, index) => getAdaptivePenaltySide(
      () => (index + 0.5) / 100,
      -1.4,
      "extreme",
    ));
    const rightKeeperSides = Array.from({ length: 100 }, (_, index) => getAdaptivePenaltySide(
      () => (index + 0.5) / 100,
      1.4,
      "extreme",
    ));

    expect(leftKeeperSides.filter((side) => side === 1).length).toBeGreaterThanOrEqual(82);
    expect(rightKeeperSides.filter((side) => side === -1).length).toBeGreaterThanOrEqual(82);
  });
});
