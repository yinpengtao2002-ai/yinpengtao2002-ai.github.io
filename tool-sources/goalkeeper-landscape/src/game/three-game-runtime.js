import { createAudioEngine } from "../audio/audio-engine.js";
import { MAX_CONCEDED } from "../config/game-config.js";
import { getContactEventSignature } from "./contact-event.js";
import {
  createGameState,
  recordGoal,
  recordMiss,
  recordPenaltyTeamKick,
  recordSave,
  resolveGameMode,
  simulatePenaltyTeamKick,
  startRound,
  tickRound,
  togglePause,
} from "./game-state.js";
import {
  DEFAULT_SHOT_DIFFICULTY,
  completeShot3D,
  createShot3DDirector,
  resolveShotDifficulty,
  updateShot3DDirector,
} from "./shot-3d-director.js";
import { createPointerInput } from "../input/pointer-input.js";
import { GLOVE_3D, createGloveController, updateGloveController } from "../input/glove-controller.js";
import { createRapierGoalkeeperWorld } from "../physics/rapier-world.js";
import { resolveGoalNetCollision } from "../physics/goal-net-geometry.js";
import { createGoalkeeperScene } from "../three/goalkeeper-scene.js";
import { createHud } from "../ui/hud.js";
import { getStageRenderBounds, requestLandscapeOrientation, syncMobileLandscape } from "../ui/mobile-landscape.js";

export const DEBUG_FORCE_GLOVE_SETTLE_DT = 1 / 30;
export const DEBUG_FORCE_GLOVE_HOLD_SECONDS = 0.45;
export const ROUND_INTRO_SECONDS = 1.8;
export const CAUGHT_SAVE_REPLAY_STYLE = "caught-save-drop-replay";
export const PARRIED_SAVE_REPLAY_STYLE = "parried-save-deflection-replay";
export const GROUND_CONTACT_AUDIO_COOLDOWN = 0.28;
export const OUTCOME_HUD_HOLD_SECONDS = 0.82;
export const PENALTY_TEAM_KICK_DELAY = 0.96;
export const PENALTY_NEXT_SHOT_DELAY = 2.05;
const GROUND_FEEDBACK_DURATION = 0.62;
const PARRIED_ROLLING_DAMPING_60HZ = 0.993;
const PARRIED_ROLLING_SPIN_DAMPING_60HZ = 0.996;
const PARRIED_GROUND_TANGENTIAL_RETENTION = 0.91;
const PARRIED_GROUND_SPIN_RETENTION = 0.9;
const PARRIED_MIN_BOUNCE_SPEED = 0.26;
const AIRBORNE_LINEAR_DAMPING_60HZ = 0.998;
const AIRBORNE_SPIN_DAMPING_60HZ = 0.997;

function clamp01(value) {
  return Math.max(0, Math.min(1, value || 0));
}

function clampNumber(value, min, max) {
  return Math.max(min, Math.min(max, value || 0));
}

export function advanceRoundIntroTimer(timer, dt) {
  return Math.max(0, (timer || 0) - Math.max(0, dt || 0));
}

export function getRoundIntroCue(timer) {
  var remaining = Math.max(0, timer || 0);
  if (remaining <= 0) return { visible: false, label: "" };
  return { visible: true, label: String(Math.max(1, Math.ceil(remaining))) };
}

export function applyForcedGloveTarget(controller, target) {
  return {
    ...controller,
    center: target,
    previousCenter: target,
    velocity: { x: 0, y: 0, z: 0 },
    inputMode: "debug",
    left: { x: target.x - GLOVE_3D.spread, y: target.y, z: target.z },
    right: { x: target.x + GLOVE_3D.spread, y: target.y, z: target.z },
    target: {
      center: target,
      left: { x: target.x - GLOVE_3D.spread, y: target.y, z: target.z },
      right: { x: target.x + GLOVE_3D.spread, y: target.y, z: target.z },
      spread: GLOVE_3D.spread,
      colliderRadius: GLOVE_3D.colliderRadius,
    },
  };
}

export function createDebugSavePlan() {
  return {
    origin: { x: 0, y: 1.25, z: 2.35 },
    target: { x: 0, y: 1.25, z: 4.65 },
    velocity: { x: 0, y: 0, z: 22 },
    angularVelocity: { x: 0, y: 10, z: 0 },
    curveForce: { x: 0, y: 0, z: 0 },
    radius: 0.11,
  };
}

export function createDebugFramePlan() {
  return {
    origin: { x: -2.85, y: 1.25, z: 2.2 },
    target: { x: -3.72, y: 1.25, z: 4.65 },
    velocity: { x: -7.4, y: 0, z: 20.5 },
    angularVelocity: { x: 0, y: 16, z: 0 },
    curveForce: { x: 0, y: 0, z: 0 },
    radius: 0.11,
  };
}

function makeCloseMissPlan() {
  return {
    origin: { x: 0, y: 1.2, z: 3.55 },
    target: { x: 0, y: 1.2, z: 4.65 },
    velocity: { x: 0, y: 0, z: 24 },
    angularVelocity: { x: 0, y: 12, z: 0 },
    curveForce: { x: 0, y: 0, z: 0 },
    radius: 0.11,
  };
}

export function getReplayDurationForOutcome(outcome) {
  return getLingeringBallDurationForOutcome(outcome) || getNextShotDelayForOutcome(outcome);
}

export function getLingeringBallDurationForOutcome(outcome) {
  if (outcome === "save") return 5;
  return 0;
}

export function getNextShotDelayForOutcome(outcome) {
  if (outcome === "goal") return 1.08;
  if (outcome === "save") return 1.32;
  return 0.58;
}

export function getHudStateForOutcomeHold(state, handledOutcome, outcomeTimer) {
  if (!state || state.ended || !handledOutcome) return state;
  if ((outcomeTimer || 0) <= OUTCOME_HUD_HOLD_SECONDS) return state;
  if (!["save", "goal", "miss", "frame"].includes(state.message)) return state;

  return {
    ...state,
    message: "play",
    lastSavePoints: state.message === "save" ? 0 : state.lastSavePoints,
  };
}

export function getAudioCueForContactType(type) {
  if (type === "catch") return "catch";
  if (type === "glove") return "save";
  if (type === "net") return "goal";
  if (type === "frame") return "frame";
  return null;
}

export function getOutcomeAudioEvent(state, previousState = null) {
  if (!state) return null;
  if (state.ended && !previousState?.ended) return "round-end";
  if (state.message === "save" && (state.streak || 0) >= 3) return "save-streak";
  if (state.message === "save") return "clean-save";
  if (state.mode !== "penalty" && state.message === "goal" && !state.ended && (state.conceded || 0) >= MAX_CONCEDED - 1) return "danger-goal";
  if (state.message === "goal") return "goal-net";
  if (state.message === "frame") return "frame-rattle";
  return null;
}

export function getModeDifficulty(mode, selectedDifficulty) {
  return mode === "penalty" ? "extreme" : resolveShotDifficulty(selectedDifficulty).id;
}

export function getPenaltySequenceAction(state, outcomeTimer, teamResolved) {
  if (state?.mode !== "penalty") return "standard";
  if (state.ended || state.shootout?.ended) return "complete";
  if (!teamResolved && state.shootout?.phase === "team-kick" && outcomeTimer >= PENALTY_TEAM_KICK_DELAY) {
    return "simulate-team";
  }
  if (teamResolved && outcomeTimer >= PENALTY_NEXT_SHOT_DELAY) return "next-shot";
  return "wait";
}

export function getPenaltyTeamAnnouncement(state) {
  var event = state?.shootout?.lastEvent;
  if (state?.mode !== "penalty" || event?.side !== "team") return "";
  var label = event.result === "goal" ? "我方罚进" : "我方未进";
  return label + " · " + String(state.shootout.teamGoals || 0) + ":" + String(state.shootout.opponentGoals || 0);
}

export function getGroundContactAudioEvent(feedback) {
  if (!feedback?.active || !feedback.point) return null;
  if ((feedback.age || 0) > 0.08) return null;
  if ((feedback.intensity || 0) < 0.18) return null;
  if ((feedback.speed || 0) < 1.2 && (feedback.impactSpeed || 0) < 0.8) return null;
  return "court-skid";
}

export function shouldPlayLingeringGroundAudio(director) {
  return director?.phase !== "live";
}

export function getMissMessageForBall(ball) {
  return ball?.lastContact?.type === "frame" ? "frame" : "miss";
}

function cloneVector(value) {
  if (!value) return null;
  return {
    x: value.x || 0,
    y: value.y || 0,
    z: value.z || 0,
  };
}

function advanceGroundFeedback(feedback, dt) {
  if (!feedback) return null;
  var duration = feedback.duration || GROUND_FEEDBACK_DURATION;
  var age = (feedback.age || 0) + Math.max(0, dt || 0);
  var fade = clamp01(1 - age / duration);
  var intensity = (feedback.baseIntensity || feedback.intensity || 0) * fade;
  return {
    ...feedback,
    age,
    duration,
    intensity,
    active: age < duration && intensity > 0.04,
  };
}

function createGroundFeedback(position, velocity, impactSpeed) {
  var horizontalSpeed = Math.hypot(velocity.x || 0, velocity.z || 0);
  var speed = Math.max(horizontalSpeed, impactSpeed || 0);
  var baseIntensity = clamp01(Math.abs(impactSpeed || 0) / 7 + horizontalSpeed / 16);
  return {
    active: true,
    age: 0,
    duration: GROUND_FEEDBACK_DURATION,
    intensity: baseIntensity,
    baseIntensity,
    speed: horizontalSpeed,
    point: {
      x: position.x || 0,
      y: 0.012,
      z: position.z || 0,
    },
    direction: {
      x: horizontalSpeed > 0.001 ? (velocity.x || 0) / horizontalSpeed : 0,
      y: 0,
      z: horizontalSpeed > 0.001 ? (velocity.z || 0) / horizontalSpeed : -1,
    },
    impactSpeed: Math.abs(impactSpeed || 0),
    skidLength: 0.28 + clamp01(speed / 10) * 0.62,
  };
}

function createRollingGroundFeedback(position, velocity, existingFeedback = null) {
  var horizontalSpeed = Math.hypot(velocity.x || 0, velocity.z || 0);
  if (horizontalSpeed < 0.42) return {
    ...(existingFeedback || {}),
    active: false,
    intensity: 0,
    speed: horizontalSpeed,
  };

  if (existingFeedback) {
    return {
      ...existingFeedback,
      speed: horizontalSpeed,
      point: {
        x: position.x || 0,
        y: 0.012,
        z: position.z || 0,
      },
      direction: {
        x: horizontalSpeed > 0.001 ? (velocity.x || 0) / horizontalSpeed : 0,
        y: 0,
        z: horizontalSpeed > 0.001 ? (velocity.z || 0) / horizontalSpeed : -1,
      },
    };
  }

  var baseIntensity = clamp01(horizontalSpeed / 10) * 0.42;
  return {
    active: true,
    age: 0.12,
    duration: GROUND_FEEDBACK_DURATION,
    intensity: Math.max(0.06, baseIntensity),
    baseIntensity: Math.max(0.08, baseIntensity),
    speed: horizontalSpeed,
    point: {
      x: position.x || 0,
      y: 0.012,
      z: position.z || 0,
    },
    direction: {
      x: horizontalSpeed > 0.001 ? (velocity.x || 0) / horizontalSpeed : 0,
      y: 0,
      z: horizontalSpeed > 0.001 ? (velocity.z || 0) / horizontalSpeed : -1,
    },
    impactSpeed: 0,
    skidLength: 0.28 + clamp01(horizontalSpeed / 9) * 0.52,
  };
}

function getSaveReplayStyle(ball) {
  if (ball?.saveReplayStyle) return ball.saveReplayStyle;
  var outcome = ball?.outcome;
  if (outcome !== "saved" && outcome !== "save") return null;
  if (ball?.lastContact?.type === "catch") return CAUGHT_SAVE_REPLAY_STYLE;
  if (ball?.lastContact?.type === "glove") return PARRIED_SAVE_REPLAY_STYLE;
  return null;
}

function initializeSaveReplay(ball) {
  var saveReplayStyle = getSaveReplayStyle(ball);
  if (!saveReplayStyle || ball.replayInitialized) return ball;

  var velocity = cloneVector(ball.velocity) || { x: 0, y: 0, z: 0 };
  var angularVelocity = cloneVector(ball.angularVelocity) || { x: 0, y: 0, z: 0 };
  var contact = ball.lastContact || {};

  if (saveReplayStyle === CAUGHT_SAVE_REPLAY_STYLE) {
    var sideDrift = Math.sign(ball.position?.x || contact.point?.x || 0) * 0.18;
    return {
      ...ball,
      saveReplayStyle,
      replayInitialized: true,
      velocity: {
        x: clampNumber(velocity.x * 0.08 + sideDrift, -0.72, 0.72),
        y: clampNumber(velocity.y * 0.06 - 0.64, -1.18, -0.34),
        z: clampNumber(velocity.z * 0.06 - 0.46, -0.94, -0.28),
      },
      angularVelocity: {
        x: clampNumber(angularVelocity.x * 0.12 - 1.4, -3.2, 2.2),
        y: clampNumber(angularVelocity.y * 0.1 + sideDrift * 5, -3.2, 3.2),
        z: clampNumber(angularVelocity.z * 0.08, -1.4, 1.4),
      },
    };
  }

  return {
    ...ball,
    saveReplayStyle,
    replayInitialized: true,
    velocity,
    angularVelocity,
    trajectoryContinuity: "physics-preserved",
  };
}

function advanceLingeringBall(ball, dt) {
  ball = initializeSaveReplay(ball);
  var radius = ball.radius || 0.11;
  var position = cloneVector(ball.position) || { x: 0, y: radius, z: 0 };
  var velocity = cloneVector(ball.velocity) || { x: 0, y: 0, z: 0 };
  var angularVelocity = cloneVector(ball.angularVelocity) || { x: 0, y: 0, z: 0 };
  var netContact = ball.netContact || null;
  var groundFeedback = advanceGroundFeedback(ball.groundFeedback, dt);
  var remaining = Math.max(0, Math.min(dt, 0.75));
  var step = 1 / 60;

  while (remaining > 0) {
    var h = Math.min(step, remaining);
    var previousPosition = cloneVector(position);
    var horizontalSpeed = Math.hypot(velocity.x || 0, velocity.z || 0);
    var rollingOnGround = position.y <= radius + 0.002 && Math.abs(velocity.y || 0) < 0.08;

    if (rollingOnGround) {
      position.y = radius;
      velocity.y = 0;
      position.x += velocity.x * h;
      position.z += velocity.z * h;

      var isCaughtReplay = ball.saveReplayStyle === CAUGHT_SAVE_REPLAY_STYLE;
      var rollingDamping = isCaughtReplay ? 0.946 : PARRIED_ROLLING_DAMPING_60HZ;
      var rollingSpinDamping = isCaughtReplay ? 0.962 : PARRIED_ROLLING_SPIN_DAMPING_60HZ;
      var dampingFactor = Math.pow(rollingDamping, h * 60);
      var spinDampingFactor = Math.pow(rollingSpinDamping, h * 60);
      velocity.x *= dampingFactor;
      velocity.z *= dampingFactor;
      angularVelocity.x *= spinDampingFactor;
      angularVelocity.y *= spinDampingFactor;
      angularVelocity.z *= spinDampingFactor;

      if (!isCaughtReplay && horizontalSpeed >= 0.12) {
        var rollingBlend = 1 - Math.pow(0.82, h * 60);
        var targetAngularX = -(velocity.z || 0) / radius;
        var targetAngularZ = (velocity.x || 0) / radius;
        angularVelocity.x += (targetAngularX - angularVelocity.x) * rollingBlend;
        angularVelocity.z += (targetAngularZ - angularVelocity.z) * rollingBlend;
      }

      if (horizontalSpeed < 0.12) {
        velocity.x = 0;
        velocity.z = 0;
        angularVelocity.x *= 0.82;
        angularVelocity.y *= 0.82;
        angularVelocity.z *= 0.82;
      }

      groundFeedback = createRollingGroundFeedback(position, velocity, groundFeedback);
      var rollingNetResult = resolveGoalNetCollision({
        previousPosition,
        position,
        velocity,
        angularVelocity,
        radius,
        netContact,
        sourceContact: ball.lastContact,
      }, h);
      position = rollingNetResult.position;
      velocity = rollingNetResult.velocity;
      angularVelocity = rollingNetResult.angularVelocity;
      netContact = rollingNetResult.netContact;
      remaining -= h;
      continue;
    }

    var verticalImpactSpeed = velocity.y < 0 ? Math.abs(velocity.y) : 0;
    velocity.y += -9.81 * h;
    position.x += velocity.x * h;
    position.y += velocity.y * h;
    position.z += velocity.z * h;

    if (position.y < radius) {
      position.y = radius;
      if (velocity.y < 0) {
        var caughtReplay = ball.saveReplayStyle === CAUGHT_SAVE_REPLAY_STYLE;
        var bounce = caughtReplay
          ? 0.12
          : clampNumber(0.32 + verticalImpactSpeed * 0.018, 0.34, 0.44);
        velocity.y = Math.abs(velocity.y) * bounce;
        if (velocity.y < (caughtReplay ? 0.45 : PARRIED_MIN_BOUNCE_SPEED)) velocity.y = 0;
      }
      var groundDamping = ball.saveReplayStyle === CAUGHT_SAVE_REPLAY_STYLE
        ? 0.58
        : PARRIED_GROUND_TANGENTIAL_RETENTION;
      var spinDamping = ball.saveReplayStyle === CAUGHT_SAVE_REPLAY_STYLE
        ? 0.66
        : PARRIED_GROUND_SPIN_RETENTION;
      velocity.x *= groundDamping;
      velocity.z *= groundDamping;
      angularVelocity.x *= spinDamping;
      angularVelocity.y *= spinDamping;
      angularVelocity.z *= spinDamping;
      if (verticalImpactSpeed > 0.65 || Math.hypot(velocity.x, velocity.z) > 1.3) {
        groundFeedback = createGroundFeedback(position, velocity, verticalImpactSpeed);
      }
    } else {
      var airborneDampingFactor = Math.pow(AIRBORNE_LINEAR_DAMPING_60HZ, h * 60);
      var airborneSpinDampingFactor = Math.pow(AIRBORNE_SPIN_DAMPING_60HZ, h * 60);
      velocity.x *= airborneDampingFactor;
      velocity.z *= airborneDampingFactor;
      angularVelocity.x *= airborneSpinDampingFactor;
      angularVelocity.y *= airborneSpinDampingFactor;
      angularVelocity.z *= airborneSpinDampingFactor;
    }

    var netResult = resolveGoalNetCollision({
      previousPosition,
      position,
      velocity,
      angularVelocity,
      radius,
      netContact,
      sourceContact: ball.lastContact,
    }, h);
    position = netResult.position;
    velocity = netResult.velocity;
    angularVelocity = netResult.angularVelocity;
    netContact = netResult.netContact;

    remaining -= h;
  }

  return {
    ...ball,
    age: (ball.age || 0) + dt,
    live: false,
    position,
    velocity,
    angularVelocity,
    groundFeedback,
    netContact,
  };
}

export function advanceLingeringBalls(balls, dt) {
  if (!balls?.length) return [];
  return balls.map((ball) => advanceLingeringBall(ball, dt)).filter((ball) => ball.age < ball.duration);
}

export function resolveRuntimeDifficulty(windowRef) {
  var search = windowRef?.location?.search || "";
  var value = DEFAULT_SHOT_DIFFICULTY;

  try {
    var params = new URLSearchParams(search);
    value = params.get("difficulty") || DEFAULT_SHOT_DIFFICULTY;
  } catch {
    value = DEFAULT_SHOT_DIFFICULTY;
  }

  return resolveShotDifficulty(value).id;
}

export function resolveRuntimeMode(windowRef) {
  var search = windowRef?.location?.search || "";
  var value = "timed";

  try {
    var params = new URLSearchParams(search);
    value = params.get("mode") || "timed";
  } catch {
    value = "timed";
  }

  return resolveGameMode(value).id;
}

export async function createThreeGameRuntime(options) {
  var canvas = options.canvas;
  var stage = options.stage;
  var documentRef = options.documentRef || document;
  var windowRef = options.windowRef || window;
  var selectedMode = resolveRuntimeMode(windowRef);
  var selectedTimedDifficulty = resolveRuntimeDifficulty(windowRef);
  var selectedDifficulty = getModeDifficulty(selectedMode, selectedTimedDifficulty);

  windowRef.goalkeeperBootStatus = "hud";
  var hud = createHud(documentRef);
  windowRef.goalkeeperBootStatus = "audio";
  var audio = createAudioEngine(windowRef);
  windowRef.goalkeeperBootStatus = "input";
  var input = createPointerInput(stage);
  windowRef.goalkeeperBootStatus = "three-scene";
  var scene = createGoalkeeperScene(canvas);
  windowRef.goalkeeperBootStatus = "rapier-world";
  var physics = await createRapierGoalkeeperWorld();
  windowRef.goalkeeperBootStatus = "runtime-ready";

  var bounds = { width: 1280, height: 720 };
  var state = createGameState({ mode: selectedMode });
  var director = createShot3DDirector({ seed: Date.now() % 100000, difficulty: selectedDifficulty });
  var gloveController = createGloveController();
  var launchedShotId = null;
  var handledOutcome = null;
  var handledContactAudio = null;
  var handledRoundEndAudio = false;
  var handledGroundContactAudio = "";
  var groundContactAudioCooldown = 0;
  var outcomeTimer = 0;
  var lingeringBalls = [];
  var forcedGloveTarget = null;
  var forcedGloveTimer = 0;
  var roundIntroTimer = 0;
  var penaltyTeamResolved = false;
  var penaltyAnnouncement = "";
  var musicStoppedForResult = false;
  var lastFrame = 0;
  var runningLoop = false;
  var debugKeysEnabled =
    windowRef.location &&
    (windowRef.location.hostname === "127.0.0.1" || windowRef.location.hostname === "localhost");

  function resize() {
    syncMobileLandscape(stage, windowRef);
    var rect = getStageRenderBounds(stage);
    bounds = {
      width: rect.width || 1280,
      height: rect.height || 720,
    };
    input.setDefault(bounds);
    scene.resize(bounds);
    render();
  }

  function resetRound() {
    selectedDifficulty = getModeDifficulty(selectedMode, selectedTimedDifficulty);
    audio.prime();
    audio.startMusic?.();
    audio.setMusicPaused?.(false);
    state = startRound(createGameState({ mode: selectedMode }), { mode: selectedMode });
    director = createShot3DDirector({ seed: Date.now() % 100000, elapsed: 0, difficulty: selectedDifficulty, keeperX: 0 });
    gloveController = createGloveController();
    physics.resetBall();
    launchedShotId = null;
    handledOutcome = null;
    handledContactAudio = null;
    handledRoundEndAudio = false;
    handledGroundContactAudio = "";
    groundContactAudioCooldown = 0;
    outcomeTimer = 0;
    lingeringBalls = [];
    forcedGloveTarget = null;
    forcedGloveTimer = 0;
    roundIntroTimer = ROUND_INTRO_SECONDS;
    penaltyTeamResolved = false;
    penaltyAnnouncement = "";
    musicStoppedForResult = false;
    updateHud();
  }

  function rememberLingeringBall(ball, outcome) {
    var duration = getLingeringBallDurationForOutcome(outcome);
    if (!duration || !ball?.position) return;
    var replayBall = initializeSaveReplay({
      live: false,
      outcome: ball.outcome || outcome,
      position: cloneVector(ball.position),
      velocity: cloneVector(ball.velocity),
      angularVelocity: cloneVector(ball.angularVelocity),
      radius: ball.radius,
      lastContact: ball.lastContact,
      netContact: ball.netContact,
      age: 0,
      duration: duration,
    });
    lingeringBalls = [
      ...lingeringBalls,
      replayBall,
    ].slice(-6);
  }

  function updateLingeringBalls(dt) {
    if (!lingeringBalls.length) return;
    lingeringBalls = advanceLingeringBalls(lingeringBalls, dt);
    playGroundContactAudio(dt);
  }

  function playGroundContactAudio(dt) {
    groundContactAudioCooldown = Math.max(0, groundContactAudioCooldown - Math.max(0, dt || 0));
    if (groundContactAudioCooldown > 0) return;
    if (!shouldPlayLingeringGroundAudio(director, physics.getBallState())) return;

    var candidate = lingeringBalls.find((ball) => getGroundContactAudioEvent(ball?.groundFeedback));
    var feedback = candidate?.groundFeedback;
    var eventName = getGroundContactAudioEvent(feedback);
    if (!eventName || !feedback?.point) return;

    var signature = [
      eventName,
      Math.round((feedback.point.x || 0) * 8),
      Math.round((feedback.point.z || 0) * 8),
      Math.round((feedback.speed || 0) * 2),
    ].join(":");
    if (signature === handledGroundContactAudio) return;

    handledGroundContactAudio = signature;
    groundContactAudioCooldown = GROUND_CONTACT_AUDIO_COOLDOWN;
    audio.playEvent(eventName);
  }

  function finishCurrentShotAfterReplay(dt) {
    if (!handledOutcome) return;
    outcomeTimer += dt;
    if (state.mode === "penalty") {
      var action = getPenaltySequenceAction(state, outcomeTimer, penaltyTeamResolved);
      if (action === "simulate-team") {
        var previousPenaltyState = state;
        state = simulatePenaltyTeamKick(state, Math.random());
        penaltyTeamResolved = true;
        penaltyAnnouncement = getPenaltyTeamAnnouncement(state);
        audio.playEvent(state.shootout?.lastEvent?.result === "goal" ? "penalty-team-goal" : "penalty-team-miss");
        if (state.ended) playOutcomeAudioEvent(previousPenaltyState);
        return;
      }
      if (action !== "next-shot") return;
    }
    var nextShotDelay = getNextShotDelayForOutcome(handledOutcome);
    if ((state.mode === "penalty" || outcomeTimer >= nextShotDelay) && !state.ended) {
      director = completeShot3D({ ...director, difficulty: selectedDifficulty });
      physics.resetBall();
      launchedShotId = null;
      handledOutcome = null;
      outcomeTimer = 0;
      penaltyTeamResolved = false;
      penaltyAnnouncement = "";
    }
  }

  function playOutcomeAudioEvent(previousState) {
    var eventName = getOutcomeAudioEvent(state, previousState);
    if (!eventName) return;
    if (eventName === "round-end") {
      if (handledRoundEndAudio) return;
      handledRoundEndAudio = true;
    }
    audio.playEvent(eventName);
  }

  function handleBallOutcome(ball) {
    if (!ball || handledOutcome) return;
    if (ball.outcome === "goal") {
      var previousState = state;
      state = recordGoal(state);
      playOutcomeAudioEvent(previousState);
      handledOutcome = "goal";
      outcomeTimer = 0;
      penaltyTeamResolved = false;
      return;
    }
    if (ball.outcome === "saved") {
      var previousStateForSave = state;
      state = recordSave(state);
      playOutcomeAudioEvent(previousStateForSave);
      rememberLingeringBall(ball, "save");
      handledOutcome = "save";
      outcomeTimer = 0;
      penaltyTeamResolved = false;
      return;
    }
    if (ball.outcome === "missed") {
      var previousStateForMiss = state;
      state = recordMiss(state, getMissMessageForBall(ball));
      playOutcomeAudioEvent(previousStateForMiss);
      handledOutcome = "miss";
      outcomeTimer = 0;
      penaltyTeamResolved = false;
    }
  }

  function launchCurrentShotIfNeeded() {
    if (director.phase !== "live") return;
    var shotId = director.currentShot.shotId;
    if (launchedShotId === shotId) return;
    physics.launchShot(director.currentShot.ballPlan);
    launchedShotId = shotId;
    handledOutcome = null;
    outcomeTimer = 0;
    audio.play("shot");
  }

  function playContactAudio(ball) {
    var contact = ball?.lastContact;
    if (!contact?.type) return;
    var signature = getContactEventSignature(contact, launchedShotId);
    if (signature === handledContactAudio) return;
    handledContactAudio = signature;
    var cue = getAudioCueForContactType(contact.type);
    if (cue) audio.play(cue);
  }

  function update(dt) {
    if (!state.running || state.paused || state.ended) return;

    if (roundIntroTimer > 0) {
      gloveController = updateGloveController(gloveController, input.getPointer(bounds), dt, {
        ...bounds,
        inputMode: input.getMode(),
      });
      physics.setGloveTarget(gloveController.center);
      var introBeforeTick = roundIntroTimer;
      roundIntroTimer = advanceRoundIntroTimer(roundIntroTimer, dt);
      if (introBeforeTick > 0 && roundIntroTimer <= 0) {
        director = createShot3DDirector({
          seed: director.seed,
          elapsed: state.elapsed,
          difficulty: selectedDifficulty,
          keeperX: gloveController.center.x,
        });
      }
      return;
    }

    var previousState = state;
    state = tickRound(state, dt);
    if (state.ended) {
      playOutcomeAudioEvent(previousState);
      if (!musicStoppedForResult) {
        audio.stopMusic?.();
        musicStoppedForResult = true;
      }
      return;
    }
    updateLingeringBalls(dt);

    if (forcedGloveTarget && forcedGloveTimer > 0) {
      forcedGloveTimer = Math.max(0, forcedGloveTimer - dt);
      gloveController = applyForcedGloveTarget(gloveController, forcedGloveTarget);
      if (forcedGloveTimer <= 0) forcedGloveTarget = null;
    } else {
      gloveController = updateGloveController(gloveController, input.getPointer(bounds), dt, {
        ...bounds,
        inputMode: input.getMode(),
      });
    }
    physics.setGloveTarget(gloveController.center);

    director = updateShot3DDirector(director, dt, state.elapsed, selectedDifficulty, {
      keeperX: gloveController.center.x,
    });
    launchCurrentShotIfNeeded();

    physics.step(dt);

    if (launchedShotId !== null) {
      var ball = physics.getBallState();
      playContactAudio(ball);
      handleBallOutcome(ball);
      finishCurrentShotAfterReplay(dt);
      if (state.ended && !musicStoppedForResult) {
        audio.stopMusic?.();
        musicStoppedForResult = true;
      }
    }
  }

  function getSnapshot() {
    var ball = physics.getBallState();
    return {
      bounds,
      state,
      director,
      ball,
      lingeringBalls,
      gloves: physics.getGloveState(),
      gloveController,
    };
  }

  function syncDebugDataset() {
    var ball = physics.getBallState();
    stage.dataset.difficulty = selectedDifficulty;
    stage.dataset.mode = selectedMode;
    stage.dataset.bootStatus = windowRef.goalkeeperBootStatus || "";
    stage.dataset.phase = director.phase;
    stage.dataset.shotId = String(director.currentShot?.shotId ?? "");
    stage.dataset.launchedShotId = String(launchedShotId ?? "");
    stage.dataset.ballOutcome = ball?.outcome || "";
    stage.dataset.ballZ = ball?.position ? String(Math.round(ball.position.z * 100) / 100) : "";
    stage.dataset.ballX = ball?.position ? String(Math.round(ball.position.x * 100) / 100) : "";
    stage.dataset.ballY = ball?.position ? String(Math.round(ball.position.y * 100) / 100) : "";
    stage.dataset.handledOutcome = handledOutcome || "";
    stage.dataset.lingeringBalls = String(lingeringBalls.length);
    stage.dataset.score = String(state.score);
    stage.dataset.conceded = String(state.conceded);
    stage.dataset.roundIntro = String(Math.round(roundIntroTimer * 100) / 100);
    stage.dataset.penaltyRound = String(state.shootout?.round || "");
    stage.dataset.penaltyPhase = state.shootout?.phase || "";
    stage.dataset.penaltyTeamScore = String(state.shootout?.teamGoals ?? "");
    stage.dataset.penaltyOpponentScore = String(state.shootout?.opponentGoals ?? "");
    stage.dataset.penaltySuddenDeath = state.shootout?.suddenDeath ? "true" : "false";
    stage.dataset.gloveX = String(Math.round((gloveController.center?.x || 0) * 100) / 100);
    stage.dataset.shotTargetX = String(Math.round((director.currentShot?.target?.x || 0) * 100) / 100);
    stage.dataset.musicStatus = audio.getMusicStatus?.() || "unavailable";
  }

  function getHudContext() {
    return {
      audioStatus: audio.getStatus?.() || (audio.isEnabled() ? "locked" : "muted"),
      roundIntroCue: getRoundIntroCue(roundIntroTimer),
      penaltyAnnouncement,
    };
  }

  function updateHud() {
    hud.update(getHudStateForOutcomeHold(state, handledOutcome, outcomeTimer), audio.isEnabled(), getHudContext());
  }

  function render() {
    syncDebugDataset();
    scene.updateVisuals(getSnapshot());
  }

  function frame(now) {
    var dt = lastFrame ? Math.min(0.04, (now - lastFrame) / 1000) : 0;
    lastFrame = now;
    update(dt);
    updateHud();
    render();
    if (runningLoop) windowRef.requestAnimationFrame(frame);
  }

  function forcePlan(plan, gloveTarget) {
    if (!state.running || state.ended) resetRound();
    physics.setGloveTarget(gloveTarget);
    physics.step(DEBUG_FORCE_GLOVE_SETTLE_DT);
    gloveController = {
      ...gloveController,
      center: gloveTarget,
      left: { x: gloveTarget.x - GLOVE_3D.spread, y: gloveTarget.y, z: gloveTarget.z },
      right: { x: gloveTarget.x + GLOVE_3D.spread, y: gloveTarget.y, z: gloveTarget.z },
    };
    director = {
      ...director,
      phase: "live",
      phaseTime: 0,
      currentShot: {
        ...director.currentShot,
        shotId: director.currentShot.shotId + 1000 + Math.floor(Math.random() * 1000),
        origin: plan.origin,
        target: plan.target,
        ballPlan: plan,
      },
    };
    launchedShotId = null;
    handledOutcome = null;
    handledContactAudio = null;
    handledGroundContactAudio = "";
    groundContactAudioCooldown = 0;
    outcomeTimer = 0;
    forcedGloveTarget = gloveTarget;
    forcedGloveTimer = DEBUG_FORCE_GLOVE_HOLD_SECONDS;
    roundIntroTimer = 0;
    launchCurrentShotIfNeeded();
  }

  hud.bind({
    onStart() {
      requestLandscapeOrientation(windowRef);
      resetRound();
    },
    onRestart() {
      requestLandscapeOrientation(windowRef);
      resetRound();
    },
    onPause() {
      state = togglePause(state);
      audio.setMusicPaused?.(state.paused);
      updateHud();
    },
    onSound() {
      audio.toggle();
      updateHud();
    },
    onDifficulty(value) {
      if (selectedMode === "penalty") return;
      selectedTimedDifficulty = resolveShotDifficulty(value).id;
      selectedDifficulty = selectedTimedDifficulty;
      director = { ...director, difficulty: selectedDifficulty };
      hud.updateDifficulty(selectedDifficulty);
    },
    onMode(value) {
      if (state.running && !state.ended) return;
      selectedMode = resolveGameMode(value).id;
      selectedDifficulty = getModeDifficulty(selectedMode, selectedTimedDifficulty);
      state = createGameState({ mode: selectedMode });
      director = createShot3DDirector({ seed: Date.now() % 100000, difficulty: selectedDifficulty });
      hud.updateMode(selectedMode);
      hud.updateDifficulty(selectedDifficulty);
      updateHud();
    },
  });
  hud.updateMode(selectedMode);
  hud.updateDifficulty(selectedDifficulty);

  function onDebugKey(event) {
    if (!debugKeysEnabled) return;
    if (event.key === "[") {
      forcePlan(createDebugSavePlan(), { x: 0, y: 1.25, z: 3.15 });
    }
    if (event.key === "]") {
      forcePlan(makeCloseMissPlan(), { x: 3.1, y: 2.55, z: 3.15 });
    }
  }

  var runtime = {
    start() {
      if (runningLoop) return;
      runningLoop = true;
      resize();
      windowRef.addEventListener("resize", resize);
      windowRef.addEventListener("keydown", onDebugKey);
      updateHud();
      windowRef.requestAnimationFrame(frame);
    },
    stop() {
      runningLoop = false;
      windowRef.removeEventListener("resize", resize);
      windowRef.removeEventListener("keydown", onDebugKey);
    },
    resize,
    resetRound,
    getState() {
      return { ...state };
    },
    getDirector() {
      return director;
    },
    getDifficulty() {
      return selectedDifficulty;
    },
    getMode() {
      return selectedMode;
    },
    getAudioState() {
      return {
        enabled: audio.isEnabled(),
        status: audio.getStatus?.() || "unavailable",
        musicStatus: audio.getMusicStatus?.() || "unavailable",
      };
    },
    getBall() {
      return physics.getBallState();
    },
    getGloves() {
      return physics.getGloveState();
    },
    forceEnd() {
      var previousState = state;
      while (!state.ended) {
        if (state.mode === "penalty" && state.shootout?.phase === "team-kick") {
          state = recordPenaltyTeamKick(state, "miss");
        } else {
          state = recordGoal(state);
        }
      }
      playOutcomeAudioEvent(previousState);
      audio.stopMusic?.();
      musicStoppedForResult = true;
      updateHud();
    },
    setMode(value) {
      if (state.running && !state.ended) return false;
      selectedMode = resolveGameMode(value).id;
      selectedDifficulty = getModeDifficulty(selectedMode, selectedTimedDifficulty);
      state = createGameState({ mode: selectedMode });
      director = createShot3DDirector({ seed: Date.now() % 100000, difficulty: selectedDifficulty });
      hud.updateMode(selectedMode);
      hud.updateDifficulty(selectedDifficulty);
      updateHud();
      return true;
    },
    forcePenaltyTeamResult(result) {
      if (state.mode !== "penalty" || state.shootout?.phase !== "team-kick") return false;
      state = recordPenaltyTeamKick(state, result);
      penaltyTeamResolved = true;
      penaltyAnnouncement = getPenaltyTeamAnnouncement(state);
      updateHud();
      return true;
    },
    forceSave() {
      forcePlan(createDebugSavePlan(), { x: 0, y: 1.25, z: 3.15 });
    },
    forceMiss() {
      forcePlan(makeCloseMissPlan(), { x: 3.1, y: 2.55, z: 3.15 });
    },
    forceFrame() {
      forcePlan(createDebugFramePlan(), { x: 0, y: 3, z: 3.15 });
    },
    dispose() {
      this.stop();
      physics.dispose();
      scene.dispose();
      audio.stopMusic?.();
    },
  };

  return runtime;
}
