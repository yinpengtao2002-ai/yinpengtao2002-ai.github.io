import { describe, expect, it } from "vitest";
import * as RuntimeModule from "../src/game/three-game-runtime.js";
import {
  DEBUG_FORCE_GLOVE_SETTLE_DT,
  DEBUG_FORCE_GLOVE_HOLD_SECONDS,
  ROUND_INTRO_SECONDS,
  applyForcedGloveTarget,
  advanceLingeringBalls,
  advanceRoundIntroTimer,
  createDebugSavePlan,
  createDebugFramePlan,
  getRoundIntroCue,
  getLingeringBallDurationForOutcome,
  getNextShotDelayForOutcome,
  getReplayDurationForOutcome,
  getAudioCueForContactType,
  getGroundContactAudioEvent,
  getMissMessageForBall,
  resolveRuntimeDifficulty,
} from "../src/game/three-game-runtime.js";
import { createRapierGoalkeeperWorld } from "../src/physics/rapier-world.js";

describe("three game runtime timing", () => {
  it("uses a short match countdown before live play begins", () => {
    expect(ROUND_INTRO_SECONDS).toBeGreaterThanOrEqual(1.2);
    expect(ROUND_INTRO_SECONDS).toBeLessThanOrEqual(2.4);
    expect(getRoundIntroCue(1.8)).toEqual({ visible: true, label: "2" });
    expect(getRoundIntroCue(0.42)).toEqual({ visible: true, label: "1" });
    expect(getRoundIntroCue(0)).toEqual({ visible: false, label: "" });
    expect(advanceRoundIntroTimer(1.8, 0.5)).toBeCloseTo(1.3);
    expect(advanceRoundIntroTimer(0.2, 0.5)).toBe(0);
  });

  it("keeps blocked saves visible without making the next shot wait five seconds", () => {
    expect(getLingeringBallDurationForOutcome("save")).toBe(5);
    expect(getNextShotDelayForOutcome("save")).toBeLessThan(1);
    expect(getNextShotDelayForOutcome("save")).toBeLessThan(getLingeringBallDurationForOutcome("save"));
    expect(getReplayDurationForOutcome("goal")).toBeCloseTo(1.08);
    expect(getReplayDurationForOutcome("miss")).toBeCloseTo(0.58);
  });

  it("maps frame contacts to a distinct restrained impact sound", () => {
    expect(getAudioCueForContactType("catch")).toBe("catch");
    expect(getAudioCueForContactType("glove")).toBe("save");
    expect(getAudioCueForContactType("net")).toBe("goal");
    expect(getAudioCueForContactType("frame")).toBe("frame");
    expect(getAudioCueForContactType("wide")).toBeNull();
  });

  it("maps meaningful outcome transitions to layered match audio events", () => {
    expect(RuntimeModule.getOutcomeAudioEvent).toBeTypeOf("function");
    expect(RuntimeModule.getOutcomeAudioEvent(
      { message: "save", streak: 3, ended: false },
      { message: "save", streak: 2, ended: false },
    )).toBe("save-streak");
    expect(RuntimeModule.getOutcomeAudioEvent(
      { message: "save", streak: 1, ended: false },
      { message: "miss", streak: 0, ended: false },
    )).toBe("clean-save");
    expect(RuntimeModule.getOutcomeAudioEvent(
      { message: "goal", conceded: 4, ended: false },
      { message: "goal", conceded: 3, ended: false },
    )).toBe("danger-goal");
    expect(RuntimeModule.getOutcomeAudioEvent(
      { message: "goal", conceded: 1, ended: false },
      { message: "miss", conceded: 0, ended: false },
    )).toBe("goal-net");
    expect(RuntimeModule.getOutcomeAudioEvent(
      { message: "frame", ended: false },
      { message: "save", ended: false },
    )).toBe("frame-rattle");
    expect(RuntimeModule.getOutcomeAudioEvent(
      { message: "ended", endReason: "time", ended: true },
      { message: "save", ended: false },
    )).toBe("round-end");
    expect(RuntimeModule.getOutcomeAudioEvent(
      { message: "miss", streak: 0, ended: false },
      { message: "miss", streak: 0, ended: false },
    )).toBeNull();
  });

  it("maps fresh grounded save skid feedback to a restrained turf audio event", () => {
    expect(RuntimeModule.getGroundContactAudioEvent).toBeTypeOf("function");
    expect(getGroundContactAudioEvent({
      active: true,
      age: 0.02,
      intensity: 0.52,
      speed: 4.2,
      point: { x: -0.4, y: 0.012, z: 2.9 },
    })).toBe("turf-skid");
    expect(getGroundContactAudioEvent({
      active: true,
      age: 0.24,
      intensity: 0.52,
      speed: 4.2,
      point: { x: -0.4, y: 0.012, z: 2.9 },
    })).toBeNull();
    expect(getGroundContactAudioEvent({
      active: true,
      age: 0.01,
      intensity: 0.08,
      speed: 0.8,
      point: { x: -0.4, y: 0.012, z: 2.9 },
    })).toBeNull();
  });

  it("turns frame misses into a distinct HUD message instead of a silent generic miss", () => {
    expect(getMissMessageForBall({ outcome: "missed", lastContact: { type: "frame" } })).toBe("frame");
    expect(getMissMessageForBall({ outcome: "missed", lastContact: { type: "ground" } })).toBe("miss");
    expect(getMissMessageForBall(null)).toBe("miss");
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

  it("marks lingering saves with grounded skid feedback after the first turf bounce", () => {
    const landingSave = {
      live: false,
      outcome: "saved",
      position: { x: -0.2, y: 0.18, z: 2.9 },
      velocity: { x: 4.4, y: -3.2, z: -2.1 },
      angularVelocity: { x: -8, y: 10, z: 2 },
      radius: 0.11,
      age: 0,
      duration: 5,
    };

    const landed = advanceLingeringBalls([landingSave], 0.08)[0];

    expect(landed.position.y).toBeGreaterThanOrEqual(landingSave.radius);
    expect(landed.groundFeedback).toMatchObject({
      active: true,
      age: 0,
    });
    expect(landed.groundFeedback.intensity).toBeGreaterThan(0.35);
    expect(landed.groundFeedback.speed).toBeGreaterThan(1.5);
    expect(landed.groundFeedback.point.y).toBeCloseTo(0.012);

    const rolling = advanceLingeringBalls([landed], 0.7)[0];
    expect(rolling.groundFeedback.active).toBe(true);
    expect(rolling.groundFeedback.intensity).toBeLessThan(landed.groundFeedback.intensity);
    expect(rolling.groundFeedback.speed).toBeLessThan(landed.groundFeedback.speed);

    const settled = advanceLingeringBalls([rolling], 2.2)[0];
    expect(settled.groundFeedback.active).toBe(false);
    expect(settled.groundFeedback.intensity).toBe(0);
  });

  it("lets deflected saves roll across the turf instead of stopping on the first grounded frame", () => {
    const rollingSave = {
      live: false,
      outcome: "saved",
      saveReplayStyle: "parried-save-deflection-replay",
      replayInitialized: true,
      position: { x: -0.35, y: 0.11, z: 2.95 },
      velocity: { x: 4.8, y: 0, z: -2.1 },
      angularVelocity: { x: -9.5, y: 6.4, z: 1.2 },
      radius: 0.11,
      age: 0,
      duration: 5,
      groundFeedback: {
        active: true,
        age: 0.08,
        duration: 0.62,
        intensity: 0.42,
        baseIntensity: 0.58,
        speed: 5.2,
        point: { x: -0.35, y: 0.012, z: 2.95 },
        direction: { x: 0.91, y: 0, z: -0.4 },
        impactSpeed: 1.1,
        skidLength: 0.68,
      },
    };

    const afterOneSecond = advanceLingeringBalls([rollingSave], 1)[0];
    const travel = Math.hypot(
      afterOneSecond.position.x - rollingSave.position.x,
      afterOneSecond.position.z - rollingSave.position.z,
    );
    const rollingSpeed = Math.hypot(afterOneSecond.velocity.x, afterOneSecond.velocity.z);

    expect(afterOneSecond.position.y).toBeCloseTo(rollingSave.radius, 3);
    expect(Math.abs(afterOneSecond.velocity.y)).toBeLessThan(0.08);
    expect(travel).toBeGreaterThan(1.4);
    expect(rollingSpeed).toBeGreaterThan(0.75);
    expect(rollingSpeed).toBeLessThan(Math.hypot(rollingSave.velocity.x, rollingSave.velocity.z));

    const afterThreeSeconds = Array.from({ length: 4 }).reduce(
      (balls) => advanceLingeringBalls(balls, 0.5),
      [afterOneSecond],
    )[0];
    expect(afterThreeSeconds.position.y).toBeCloseTo(rollingSave.radius, 3);
    expect(Math.abs(afterThreeSeconds.velocity.y)).toBeLessThan(0.08);
    expect(Math.hypot(afterThreeSeconds.velocity.x, afterThreeSeconds.velocity.z)).toBeLessThan(rollingSpeed);
  });

  it("turns caught saves into a soft drop replay instead of inheriting wild contact velocity", () => {
    const caughtSave = {
      live: false,
      outcome: "saved",
      position: { x: 0.35, y: 1.42, z: 3.08 },
      velocity: { x: 7.8, y: 4.6, z: -8.4 },
      angularVelocity: { x: -13, y: 16, z: 4 },
      radius: 0.11,
      age: 0,
      duration: 5,
      lastContact: {
        type: "catch",
        point: { x: 0.24, y: 1.32, z: 3.12 },
        catchQuality: 0.82,
      },
    };

    const replay = advanceLingeringBalls([caughtSave], 0.08)[0];

    expect(replay.saveReplayStyle).toBe("caught-save-drop-replay");
    expect(replay.replayInitialized).toBe(true);
    expect(Math.hypot(replay.velocity.x, replay.velocity.z)).toBeLessThan(1.9);
    expect(Math.hypot(replay.angularVelocity.x, replay.angularVelocity.y, replay.angularVelocity.z)).toBeLessThan(5);
    expect(replay.position.y).toBeLessThan(caughtSave.position.y);
  });

  it("turns glove saves into a visible parry replay with lateral deflection and spin", () => {
    const glovedSave = {
      live: false,
      outcome: "saved",
      position: { x: 0.18, y: 1.24, z: 3.04 },
      velocity: { x: 0.25, y: 0.1, z: 0.35 },
      angularVelocity: { x: 0.5, y: 0.2, z: 0 },
      radius: 0.11,
      age: 0,
      duration: 5,
      lastContact: {
        type: "glove",
        side: "right",
        point: { x: 0.18, y: 1.22, z: 3.14 },
        normal: { x: 0.42, y: 0.08, z: -0.72 },
        strength: 24,
      },
    };

    const replay = advanceLingeringBalls([glovedSave], 0.08)[0];

    expect(replay.saveReplayStyle).toBe("parried-save-deflection-replay");
    expect(replay.replayInitialized).toBe(true);
    expect(Math.abs(replay.velocity.x)).toBeGreaterThan(2.2);
    expect(replay.velocity.z).toBeLessThan(-1.4);
    expect(Math.hypot(replay.angularVelocity.x, replay.angularVelocity.y, replay.angularVelocity.z)).toBeGreaterThan(9);
    expect(replay.position.x).toBeGreaterThan(glovedSave.position.x);
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

  it("keeps the forced-frame debug path aligned with a post-hit Rapier shot", async () => {
    const world = await createRapierGoalkeeperWorld();
    const plan = createDebugFramePlan();

    world.setGloveTarget({ x: 0, y: 3, z: 3.15 });
    world.step(DEBUG_FORCE_GLOVE_SETTLE_DT);
    world.launchShot(plan);

    for (let i = 0; i < 22; i += 1) {
      world.step(1 / 120);
    }

    const ball = world.getBallState();
    expect(ball.lastContact?.type).toBe("frame");
    expect(ball.lastContact.part).toBe("left-post");
    expect(ball.outcome).toBe("missed");

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
