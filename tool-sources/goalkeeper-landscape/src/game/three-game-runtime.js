import { createAudioEngine } from "../audio/audio-engine.js";
import { createGameState, recordGoal, recordSave, startRound, tickRound, togglePause } from "./game-state.js";
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
import { createGoalkeeperScene } from "../three/goalkeeper-scene.js";
import { createHud } from "../ui/hud.js";
import { getStageRenderBounds, requestLandscapeOrientation, syncMobileLandscape } from "../ui/mobile-landscape.js";

export const DEBUG_FORCE_GLOVE_SETTLE_DT = 1 / 30;
export const DEBUG_FORCE_GLOVE_HOLD_SECONDS = 0.45;

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
  if (outcome === "save") return 0.38;
  return 0.58;
}

function cloneVector(value) {
  if (!value) return null;
  return {
    x: value.x || 0,
    y: value.y || 0,
    z: value.z || 0,
  };
}

function advanceLingeringBall(ball, dt) {
  var radius = ball.radius || 0.11;
  var position = cloneVector(ball.position) || { x: 0, y: radius, z: 0 };
  var velocity = cloneVector(ball.velocity) || { x: 0, y: 0, z: 0 };
  var angularVelocity = cloneVector(ball.angularVelocity) || { x: 0, y: 0, z: 0 };
  var remaining = Math.max(0, Math.min(dt, 0.75));
  var step = 1 / 60;

  while (remaining > 0) {
    var h = Math.min(step, remaining);
    velocity.y += -9.81 * h;
    position.x += velocity.x * h;
    position.y += velocity.y * h;
    position.z += velocity.z * h;

    if (position.y < radius) {
      position.y = radius;
      if (velocity.y < 0) {
        velocity.y = Math.abs(velocity.y) * 0.22;
        if (velocity.y < 0.45) velocity.y = 0;
      }
      velocity.x *= 0.72;
      velocity.z *= 0.72;
      angularVelocity.x *= 0.82;
      angularVelocity.y *= 0.82;
      angularVelocity.z *= 0.82;
    } else {
      velocity.x *= 0.998;
      velocity.z *= 0.998;
      angularVelocity.x *= 0.997;
      angularVelocity.y *= 0.997;
      angularVelocity.z *= 0.997;
    }

    remaining -= h;
  }

  return {
    ...ball,
    age: (ball.age || 0) + dt,
    live: false,
    position,
    velocity,
    angularVelocity,
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

export async function createThreeGameRuntime(options) {
  var canvas = options.canvas;
  var stage = options.stage;
  var documentRef = options.documentRef || document;
  var windowRef = options.windowRef || window;
  var selectedDifficulty = resolveRuntimeDifficulty(windowRef);

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
  var state = createGameState();
  var director = createShot3DDirector({ seed: Date.now() % 100000, difficulty: selectedDifficulty });
  var gloveController = createGloveController();
  var launchedShotId = null;
  var handledOutcome = null;
  var handledContactAudio = null;
  var outcomeTimer = 0;
  var lingeringBalls = [];
  var forcedGloveTarget = null;
  var forcedGloveTimer = 0;
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
    audio.prime();
    state = startRound(createGameState());
    director = createShot3DDirector({ seed: Date.now() % 100000, elapsed: 0, difficulty: selectedDifficulty });
    gloveController = createGloveController();
    physics.resetBall();
    launchedShotId = null;
    handledOutcome = null;
    handledContactAudio = null;
    outcomeTimer = 0;
    lingeringBalls = [];
    forcedGloveTarget = null;
    forcedGloveTimer = 0;
    hud.update(state, audio.isEnabled());
  }

  function rememberLingeringBall(ball, outcome) {
    var duration = getLingeringBallDurationForOutcome(outcome);
    if (!duration || !ball?.position) return;
    lingeringBalls = [
      ...lingeringBalls,
      {
        live: false,
        outcome: ball.outcome || outcome,
        position: cloneVector(ball.position),
        velocity: cloneVector(ball.velocity),
        angularVelocity: cloneVector(ball.angularVelocity),
        radius: ball.radius,
        lastContact: ball.lastContact,
        age: 0,
        duration: duration,
      },
    ].slice(-6);
  }

  function updateLingeringBalls(dt) {
    if (!lingeringBalls.length) return;
    lingeringBalls = advanceLingeringBalls(lingeringBalls, dt);
  }

  function finishCurrentShotAfterReplay(dt) {
    if (!handledOutcome) return;
    outcomeTimer += dt;
    var nextShotDelay = getNextShotDelayForOutcome(handledOutcome);
    if (outcomeTimer >= nextShotDelay && !state.ended) {
      director = completeShot3D({ ...director, difficulty: selectedDifficulty });
      physics.resetBall();
      launchedShotId = null;
      handledOutcome = null;
      outcomeTimer = 0;
    }
  }

  function handleBallOutcome(ball) {
    if (!ball || handledOutcome) return;
    if (ball.outcome === "goal") {
      state = recordGoal(state);
      handledOutcome = "goal";
      outcomeTimer = 0;
      return;
    }
    if (ball.outcome === "saved") {
      state = recordSave(state);
      rememberLingeringBall(ball, "save");
      handledOutcome = "save";
      outcomeTimer = 0;
      return;
    }
    if (ball.outcome === "missed") {
      handledOutcome = "miss";
      outcomeTimer = 0;
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
    var point = contact.point || ball.position || { x: 0, y: 0, z: 0 };
    var signature = [
      launchedShotId,
      contact.type,
      Math.round((point.x || 0) * 10),
      Math.round((point.y || 0) * 10),
      Math.round((point.z || 0) * 10),
    ].join(":");
    if (signature === handledContactAudio) return;
    handledContactAudio = signature;
    if (contact.type === "catch") {
      audio.play("catch");
    } else if (contact.type === "glove") {
      audio.play("save");
    } else if (contact.type === "net") {
      audio.play("goal");
    }
  }

  function update(dt) {
    if (!state.running || state.paused || state.ended) return;

    state = tickRound(state, dt);
    if (state.ended) return;
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

    director = updateShot3DDirector(director, dt, state.elapsed, selectedDifficulty);
    launchCurrentShotIfNeeded();

    physics.step(dt);

    if (launchedShotId !== null) {
      var ball = physics.getBallState();
      playContactAudio(ball);
      handleBallOutcome(ball);
      finishCurrentShotAfterReplay(dt);
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
  }

  function render() {
    syncDebugDataset();
    scene.updateVisuals(getSnapshot());
  }

  function frame(now) {
    var dt = lastFrame ? Math.min(0.04, (now - lastFrame) / 1000) : 0;
    lastFrame = now;
    update(dt);
    hud.update(state, audio.isEnabled());
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
    outcomeTimer = 0;
    forcedGloveTarget = gloveTarget;
    forcedGloveTimer = DEBUG_FORCE_GLOVE_HOLD_SECONDS;
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
      hud.update(state, audio.isEnabled());
    },
    onSound() {
      audio.toggle();
      hud.update(state, audio.isEnabled());
    },
    onDifficulty(value) {
      selectedDifficulty = resolveShotDifficulty(value).id;
      director = { ...director, difficulty: selectedDifficulty };
      hud.updateDifficulty(selectedDifficulty);
    },
  });
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
      hud.update(state, audio.isEnabled());
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
    getBall() {
      return physics.getBallState();
    },
    getGloves() {
      return physics.getGloveState();
    },
    forceEnd() {
      while (!state.ended) {
        state = recordGoal(state);
      }
      hud.update(state, audio.isEnabled());
    },
    forceSave() {
      forcePlan(createDebugSavePlan(), { x: 0, y: 1.25, z: 3.15 });
    },
    forceMiss() {
      forcePlan(makeCloseMissPlan(), { x: 3.1, y: 2.55, z: 3.15 });
    },
    dispose() {
      this.stop();
      physics.dispose();
      scene.dispose();
    },
  };

  return runtime;
}
