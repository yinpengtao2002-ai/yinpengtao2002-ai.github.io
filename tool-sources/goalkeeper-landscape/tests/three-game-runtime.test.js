import { describe, expect, it } from "vitest";
import * as RuntimeModule from "../src/game/three-game-runtime.js";
import {
  DEBUG_FORCE_GLOVE_SETTLE_DT,
  DEBUG_FORCE_GLOVE_HOLD_SECONDS,
  ROUND_INTRO_SECONDS,
  PENALTY_KICK_COUNTDOWN_SECONDS,
  PENALTY_ROUND_SCORE_HOLD_SECONDS,
  applyForcedGloveTarget,
  advanceLingeringBalls,
  advanceRoundIntroTimer,
  createDebugSavePlan,
  createDebugFramePlan,
  getRoundIntroCue,
  getLingeringBallDurationForOutcome,
  getNextShotDelayForOutcome,
  getReplayDurationForOutcome,
  getHudStateForOutcomeHold,
  getAudioCueForContactType,
  getGroundContactAudioEvent,
  getMissMessageForBall,
  OUTCOME_HUD_HOLD_SECONDS,
  resolveRuntimeDifficulty,
  resolveRuntimeMode,
  getModeDifficulty,
  getPenaltySequenceAction,
  getPenaltyCountdownCue,
  getPenaltyRoundBreak,
  getPenaltyTeamAnnouncement,
  prepareNextPenaltyShot,
  shouldPlayLingeringGroundAudio,
} from "../src/game/three-game-runtime.js";
import { createShot3DDirector } from "../src/game/shot-3d-director.js";
import { RAPIER_GOAL, createRapierGoalkeeperWorld } from "../src/physics/rapier-world.js";

describe("three game runtime timing", () => {
  it("resolves penalty mode from the URL and locks it to extreme difficulty", () => {
    expect(resolveRuntimeMode({ location: { search: "?mode=penalty&difficulty=easy" } })).toBe("penalty");
    expect(resolveRuntimeMode({ location: { search: "?mode=unknown" } })).toBe("timed");
    expect(getModeDifficulty("penalty", "easy")).toBe("extreme");
    expect(getModeDifficulty("timed", "hard")).toBe("hard");
  });

  it("retires the local glove demo switch after selecting the production model", () => {
    expect(RuntimeModule.resolveGloveDemoStyle).toBeUndefined();
  });

  it("waits for the unseen team kick result before launching the next penalty", () => {
    const state = {
      mode: "penalty",
      ended: false,
      shootout: { phase: "team-kick" },
    };

    expect(getPenaltySequenceAction(state, 0.5, false)).toBe("wait");
    expect(getPenaltySequenceAction(state, 1.05, false)).toBe("simulate-team");
    expect(getPenaltySequenceAction({ ...state, shootout: { phase: "defend" } }, 1.4, true)).toBe("wait");
    expect(getPenaltySequenceAction({ ...state, shootout: { phase: "defend" } }, 2.2, true)).toBe("wait");
    expect(getPenaltySequenceAction(
      { ...state, shootout: { phase: "defend" } },
      1.05 + PENALTY_ROUND_SCORE_HOLD_SECONDS,
      true,
    )).toBe("next-shot");
    expect(getPenaltySequenceAction({ ...state, ended: true }, 4, true)).toBe("complete");
  });

  it("counts down every penalty round before the opponent shoots", () => {
    const state = {
      mode: "penalty",
      shootout: { round: 3, suddenDeath: false },
    };

    expect(PENALTY_KICK_COUNTDOWN_SECONDS).toBe(3);
    expect(getPenaltyCountdownCue(2.95, state)).toEqual({
      visible: true,
      label: "3",
      kicker: "第 3 轮",
      ariaLabel: "第 3 轮点球，3 秒后射门",
    });
    expect(getPenaltyCountdownCue(0.4, state).label).toBe("1");
    expect(getPenaltyCountdownCue(0, state).visible).toBe(false);
  });

  it("builds a centered score break after both sides complete a penalty round", () => {
    const breakPlan = getPenaltyRoundBreak({
      mode: "penalty",
      ended: false,
      shootout: {
        teamGoals: 2,
        opponentGoals: 1,
        suddenDeath: false,
        lastEvent: { side: "team", result: "goal", round: 3 },
      },
    });

    expect(PENALTY_ROUND_SCORE_HOLD_SECONDS).toBeGreaterThanOrEqual(1.6);
    expect(breakPlan).toEqual({
      visible: true,
      round: 3,
      roundLabel: "第 3 轮结束",
      scoreText: "2 : 1",
      teamResultLabel: "我方罚进",
      teamGoals: 2,
      opponentGoals: 1,
    });
  });

  it("prepares the next extreme shot before its new-round countdown begins", () => {
    const current = createShot3DDirector({ seed: 91, difficulty: "extreme", keeperX: 0 });
    const next = prepareNextPenaltyShot(current, 0, "extreme", 2.4);

    expect(next.phase).toBe("cue");
    expect(next.shotIndex).toBe(1);
    expect(next.currentShot.shotId).toBe(1);
    expect(next.currentShot.difficulty).toBe("extreme");
    expect(Math.abs(next.currentShot.target.x)).toBeGreaterThanOrEqual(2.7);
  });

  it("announces the automatic team penalty result and current score", () => {
    expect(getPenaltyTeamAnnouncement({
      mode: "penalty",
      shootout: {
        teamGoals: 2,
        opponentGoals: 1,
        lastEvent: { side: "team", result: "goal", round: 3 },
      },
    })).toBe("我方罚进 · 2:1");
    expect(getPenaltyTeamAnnouncement({
      mode: "penalty",
      shootout: {
        teamGoals: 2,
        opponentGoals: 2,
        lastEvent: { side: "team", result: "miss", round: 3 },
      },
    })).toBe("我方未进 · 2:2");
  });

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
    expect(getNextShotDelayForOutcome("save")).toBeGreaterThanOrEqual(1.25);
    expect(getNextShotDelayForOutcome("save")).toBeLessThanOrEqual(1.55);
    expect(getNextShotDelayForOutcome("save")).toBeLessThan(getLingeringBallDurationForOutcome("save"));
    expect(getReplayDurationForOutcome("goal")).toBeCloseTo(1.08);
    expect(getReplayDurationForOutcome("miss")).toBeCloseTo(0.58);
  });

  it("lets outcome HUD feedback retire before the next shot without changing the real score", () => {
    const saveState = {
      message: "save",
      score: 225,
      saves: 2,
      conceded: 0,
      streak: 2,
      bestStreak: 2,
      lastSavePoints: 125,
      ended: false,
    };
    const goalState = {
      ...saveState,
      message: "goal",
      score: 225,
      saves: 2,
      conceded: 1,
      streak: 0,
      lastSavePoints: 0,
    };

    expect(OUTCOME_HUD_HOLD_SECONDS).toBeGreaterThanOrEqual(0.7);
    expect(OUTCOME_HUD_HOLD_SECONDS).toBeLessThan(getNextShotDelayForOutcome("save"));
    expect(getHudStateForOutcomeHold(saveState, "save", OUTCOME_HUD_HOLD_SECONDS - 0.05).message).toBe("save");

    const settledSaveHudState = getHudStateForOutcomeHold(saveState, "save", OUTCOME_HUD_HOLD_SECONDS + 0.08);
    expect(settledSaveHudState).toMatchObject({
      message: "play",
      score: 225,
      saves: 2,
      conceded: 0,
      streak: 2,
      bestStreak: 2,
    });
    expect(settledSaveHudState.lastSavePoints).toBe(0);

    const settledGoalHudState = getHudStateForOutcomeHold(goalState, "goal", OUTCOME_HUD_HOLD_SECONDS + 0.08);
    expect(settledGoalHudState).toMatchObject({
      message: "play",
      score: 225,
      saves: 2,
      conceded: 1,
      streak: 0,
    });
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

  it("maps fresh grounded save skid feedback to a restrained court audio event", () => {
    expect(RuntimeModule.getGroundContactAudioEvent).toBeTypeOf("function");
    expect(getGroundContactAudioEvent({
      active: true,
      age: 0.02,
      intensity: 0.52,
      speed: 4.2,
      point: { x: -0.4, y: 0.012, z: 2.9 },
    })).toBe("court-skid");
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

  it("keeps retired replay court-skid audio quiet while the next live shot is in flight", () => {
    expect(RuntimeModule.shouldPlayLingeringGroundAudio).toBeTypeOf("function");
    expect(shouldPlayLingeringGroundAudio({ phase: "live" }, { live: true, outcome: "live" })).toBe(false);
    expect(shouldPlayLingeringGroundAudio({ phase: "live" }, { live: true, outcome: "deflected" })).toBe(false);
    expect(shouldPlayLingeringGroundAudio({ phase: "live" }, { live: false, outcome: "goal", position: { x: 0, y: 1.1, z: 4.65 } })).toBe(false);
    expect(shouldPlayLingeringGroundAudio({ phase: "live" }, { live: false, outcome: "saved", position: { x: 0.4, y: 0.11, z: 2.4 } })).toBe(false);
    expect(shouldPlayLingeringGroundAudio({ phase: "cue" }, { live: false, outcome: "idle" })).toBe(true);
    expect(shouldPlayLingeringGroundAudio({ phase: "cooldown" }, { live: false, outcome: "idle" })).toBe(true);
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

  it("marks lingering saves with grounded skid feedback after the first floor bounce", () => {
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

  it("lets deflected saves roll across the floor instead of stopping on the first grounded frame", () => {
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

  it("keeps a firmly parried football rolling for several seconds", () => {
    const rollingSave = {
      live: false,
      outcome: "saved",
      saveReplayStyle: "parried-save-deflection-replay",
      replayInitialized: true,
      position: { x: 0.15, y: 0.11, z: 2.9 },
      velocity: { x: 0.8, y: 0, z: -5.2 },
      angularVelocity: { x: -12, y: 1.4, z: 0.8 },
      radius: 0.11,
      age: 0,
      duration: 5,
    };

    const afterTwoAndHalfSeconds = Array.from({ length: 300 }).reduce(
      (balls) => advanceLingeringBalls(balls, 1 / 120),
      [rollingSave],
    )[0];
    const travel = Math.hypot(
      afterTwoAndHalfSeconds.position.x - rollingSave.position.x,
      afterTwoAndHalfSeconds.position.z - rollingSave.position.z,
    );
    const rollingSpeed = Math.hypot(
      afterTwoAndHalfSeconds.velocity.x,
      afterTwoAndHalfSeconds.velocity.z,
    );

    expect(travel).toBeGreaterThan(6);
    expect(rollingSpeed).toBeGreaterThan(1.2);
    expect(afterTwoAndHalfSeconds.position.y).toBeCloseTo(rollingSave.radius, 3);
  });

  it("lets a downward parry make two visible football bounces before rolling", () => {
    const bouncingSave = {
      live: false,
      outcome: "saved",
      saveReplayStyle: "parried-save-deflection-replay",
      replayInitialized: true,
      position: { x: -0.2, y: 0.72, z: 2.9 },
      velocity: { x: 0.7, y: -3.8, z: -5.2 },
      angularVelocity: { x: -12, y: 1.2, z: 0.6 },
      radius: 0.11,
      age: 0,
      duration: 5,
    };
    let balls = [bouncingSave];
    let previousVerticalSpeed = bouncingSave.velocity.y;
    let bounceCount = 0;

    for (let frame = 0; frame < 240; frame += 1) {
      balls = advanceLingeringBalls(balls, 1 / 120);
      const ball = balls[0];
      if (
        previousVerticalSpeed < 0 &&
        ball.velocity.y > 0 &&
        ball.position.y <= ball.radius + 0.001
      ) {
        bounceCount += 1;
      }
      previousVerticalSpeed = ball.velocity.y;
    }

    expect(bounceCount).toBeGreaterThanOrEqual(2);
    expect(bounceCount).toBeLessThanOrEqual(3);
    expect(Math.hypot(balls[0].velocity.x, balls[0].velocity.z)).toBeGreaterThan(1.2);
  });

  it("keeps the lingering football trajectory stable across common frame rates", () => {
    const bouncingSave = {
      live: false,
      outcome: "saved",
      saveReplayStyle: "parried-save-deflection-replay",
      replayInitialized: true,
      position: { x: -0.2, y: 0.72, z: 2.9 },
      velocity: { x: 0.7, y: -3.8, z: -5.2 },
      angularVelocity: { x: -12, y: 1.2, z: 0.6 },
      radius: 0.11,
      age: 0,
      duration: 5,
    };
    const simulate = (fps) => Array.from({ length: fps }).reduce(
      (balls) => advanceLingeringBalls(balls, 1 / fps),
      [{ ...bouncingSave, position: { ...bouncingSave.position }, velocity: { ...bouncingSave.velocity } }],
    )[0];

    const at60Fps = simulate(60);
    const at120Fps = simulate(120);
    const speed60 = Math.hypot(at60Fps.velocity.x, at60Fps.velocity.z);
    const speed120 = Math.hypot(at120Fps.velocity.x, at120Fps.velocity.z);

    expect(Math.abs(at60Fps.position.z - at120Fps.position.z)).toBeLessThan(0.08);
    expect(Math.abs(speed60 - speed120)).toBeLessThan(0.12);
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

  it("continues the real parry trajectory instead of introducing a replay air-wall turn", () => {
    const glovedSave = {
      live: false,
      outcome: "saved",
      position: { x: 0.18, y: 1.24, z: 3.04 },
      velocity: { x: -4.2, y: 1.8, z: -3.6 },
      angularVelocity: { x: -9.5, y: 8.2, z: -1.4 },
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

    const replay = advanceLingeringBalls([glovedSave], 1 / 120)[0];

    expect(replay.saveReplayStyle).toBe("parried-save-deflection-replay");
    expect(replay.replayInitialized).toBe(true);
    expect(replay.velocity.x).toBeLessThan(0);
    expect(replay.velocity.z).toBeLessThan(0);
    expect(Math.abs(replay.velocity.x - glovedSave.velocity.x)).toBeLessThan(0.2);
    expect(Math.abs(replay.velocity.z - glovedSave.velocity.z)).toBeLessThan(0.2);
    expect(replay.position.x).toBeLessThan(glovedSave.position.x);
  });

  it("catches a credited lingering save in the visible net without changing the save contact", () => {
    const gloveContact = {
      eventId: 41,
      type: "glove",
      side: "right",
      point: { x: 0.08, y: 1.2, z: 3.14 },
      normal: { x: 0.08, y: 0, z: -0.92 },
      strength: 22,
    };
    const savedBall = {
      live: false,
      outcome: "saved",
      saveReplayStyle: "parried-save-deflection-replay",
      replayInitialized: true,
      position: { x: 0.08, y: 1.2, z: RAPIER_GOAL.netPlaneZ + 0.04 },
      velocity: { x: 0.2, y: 0.1, z: 8 },
      angularVelocity: { x: -7, y: 9, z: 1 },
      radius: 0.11,
      age: 0,
      duration: 5,
      lastContact: gloveContact,
    };

    const caught = advanceLingeringBalls([savedBall], 0.3)[0];

    expect(caught.outcome).toBe("saved");
    expect(caught.lastContact).toEqual(gloveContact);
    expect(caught.position.z).toBeLessThan(RAPIER_GOAL.backNetZ);
    expect(caught.velocity.z).toBeLessThanOrEqual(0);
    expect(caught.netContact).toMatchObject({
      type: "net",
      sourceContactEventId: 41,
    });

    const settled = advanceLingeringBalls([caught], 0.1)[0];
    expect(settled.netContact.eventId).toBe(caught.netContact.eventId);
    expect(settled.netContact.age).toBeGreaterThan(caught.netContact.age);
    expect(settled.lastContact.eventId).toBe(41);
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
