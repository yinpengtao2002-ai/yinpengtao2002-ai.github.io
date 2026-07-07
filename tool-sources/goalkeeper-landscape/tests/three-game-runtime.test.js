import { describe, expect, it } from "vitest";
import {
  DEBUG_FORCE_GLOVE_SETTLE_DT,
  DEBUG_FORCE_GLOVE_HOLD_SECONDS,
  applyForcedGloveTarget,
  advanceLingeringBalls,
  createDebugSavePlan,
  getLingeringBallDurationForOutcome,
  getNextShotDelayForOutcome,
  getReplayDurationForOutcome,
  resolveRuntimeDifficulty,
} from "../src/game/three-game-runtime.js";
import { createRapierGoalkeeperWorld } from "../src/physics/rapier-world.js";

describe("three game runtime timing", () => {
  it("keeps blocked saves visible without making the next shot wait five seconds", () => {
    expect(getLingeringBallDurationForOutcome("save")).toBe(5);
    expect(getNextShotDelayForOutcome("save")).toBeLessThan(1);
    expect(getNextShotDelayForOutcome("save")).toBeLessThan(getLingeringBallDurationForOutcome("save"));
    expect(getReplayDurationForOutcome("goal")).toBeCloseTo(1.08);
    expect(getReplayDurationForOutcome("miss")).toBeCloseTo(0.58);
  });

  it("continues simulating a deflected lingering ball instead of freezing it in the sky", () => {
    const airborne = {
      live: false,
      outcome: "saved",
      position: { x: 0.4, y: 2.2, z: 2.8 },
      velocity: { x: 1.2, y: 5.6, z: -4.2 },
      angularVelocity: { x: -6, y: 12, z: 0 },
      radius: 0.11,
      age: 0,
      duration: 5,
    };

    const halfSecond = advanceLingeringBalls([airborne], 0.5)[0];
    expect(halfSecond.age).toBeCloseTo(0.5);
    expect(halfSecond.position.y).not.toBeCloseTo(airborne.position.y);
    expect(halfSecond.position.y).toBeGreaterThan(airborne.position.y);

    const afterTwoSeconds = Array.from({ length: 4 }).reduce(
      (balls) => advanceLingeringBalls(balls, 0.5),
      [airborne],
    )[0];
    expect(afterTwoSeconds.position.y).toBeGreaterThanOrEqual(airborne.radius);
    expect(afterTwoSeconds.position.y).toBeLessThan(halfSecond.position.y);
    expect(afterTwoSeconds.velocity.y).toBeLessThan(0.5);
  });

  it("ignores old framing demo parameters and resolves only gameplay difficulty", async () => {
    const runtimeModule = await import("../src/game/three-game-runtime.js");

    expect(runtimeModule.resolveCompositionPreset).toBeUndefined();
    expect(resolveRuntimeDifficulty({ location: { search: "" } })).toBe("medium");
    expect(resolveRuntimeDifficulty({ location: { search: "?view=keeper" } })).toBe("medium");
    expect(resolveRuntimeDifficulty({ location: { search: "?difficulty=easy" } })).toBe("easy");
    expect(resolveRuntimeDifficulty({ location: { search: "?difficulty=hard" } })).toBe("hard");
    expect(resolveRuntimeDifficulty({ location: { search: "?difficulty=unknown" } })).toBe("medium");
  });

  it("keeps the forced-save debug path aligned with a catchable Rapier shot", async () => {
    const world = await createRapierGoalkeeperWorld();
    const plan = createDebugSavePlan();

    expect(DEBUG_FORCE_GLOVE_SETTLE_DT).toBeGreaterThanOrEqual(1 / 60);
    expect(DEBUG_FORCE_GLOVE_SETTLE_DT).toBeLessThanOrEqual(1 / 20);

    world.setGloveTarget({ x: 0, y: 1.25, z: 3.15 });
    world.step(DEBUG_FORCE_GLOVE_SETTLE_DT);
    world.launchShot(plan);

    for (let i = 0; i < 18; i += 1) {
      world.step(1 / 120);
    }

    const ball = world.getBallState();
    expect(ball.lastContact?.type).toBe("catch");
    expect(ball.outcome).toBe("saved");

    world.dispose();
  });

  it("pins the glove briefly for forced debug shots instead of letting pointer input overwrite it", () => {
    const controller = {
      center: { x: 2, y: 2, z: 3.15 },
      previousCenter: { x: 1, y: 1, z: 3.15 },
      velocity: { x: 4, y: 4, z: 0 },
      inputMode: "mouse",
    };
    const target = { x: 0, y: 1.25, z: 3.15 };

    const pinned = applyForcedGloveTarget(controller, target);

    expect(DEBUG_FORCE_GLOVE_HOLD_SECONDS).toBeGreaterThanOrEqual(0.3);
    expect(pinned.center).toEqual(target);
    expect(pinned.left.x).toBeLessThan(target.x);
    expect(pinned.right.x).toBeGreaterThan(target.x);
    expect(pinned.velocity).toEqual({ x: 0, y: 0, z: 0 });
    expect(pinned.inputMode).toBe("debug");
  });
});
