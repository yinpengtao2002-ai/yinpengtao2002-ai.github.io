import { createAudioEngine } from "../audio/audio-engine.js";
import { createGameState, recordGoal, recordSave, startRound, tickRound, togglePause } from "./game-state.js";
import { completeShot3D, createShot3DDirector, updateShot3DDirector } from "./shot-3d-director.js";
import { createPointerInput } from "../input/pointer-input.js";
import { GLOVE_3D, createGloveController, updateGloveController } from "../input/glove-controller.js";
import { createRapierGoalkeeperWorld } from "../physics/rapier-world.js";
import { createGoalkeeperScene } from "../three/goalkeeper-scene.js";
import { createHud } from "../ui/hud.js";
import { getStageRenderBounds, requestLandscapeOrientation, syncMobileLandscape } from "../ui/mobile-landscape.js";

function makeCloseSavePlan() {
  return {
    origin: { x: 0, y: 1.25, z: 2.25 },
    target: { x: 0, y: 1.25, z: 4.65 },
    velocity: { x: 0, y: 0, z: 26 },
    angularVelocity: { x: 0, y: 14, z: 0 },
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

export async function createThreeGameRuntime(options) {
  var canvas = options.canvas;
  var stage = options.stage;
  var documentRef = options.documentRef || document;
  var windowRef = options.windowRef || window;

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
  var director = createShot3DDirector({ seed: Date.now() % 100000 });
  var gloveController = createGloveController();
  var launchedShotId = null;
  var handledOutcome = null;
  var handledContactAudio = null;
  var outcomeTimer = 0;
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
    director = createShot3DDirector({ seed: Date.now() % 100000, elapsed: 0 });
    gloveController = createGloveController();
    physics.resetBall();
    launchedShotId = null;
    handledOutcome = null;
    handledContactAudio = null;
    outcomeTimer = 0;
    hud.update(state, audio.isEnabled());
  }

  function finishCurrentShotAfterReplay(dt) {
    if (!handledOutcome) return;
    outcomeTimer += dt;
    var replayDuration = handledOutcome === "goal" ? 1.08 : 0.58;
    if (outcomeTimer >= replayDuration && !state.ended) {
      director = completeShot3D(director);
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

    gloveController = updateGloveController(gloveController, input.getPointer(bounds), dt, {
      ...bounds,
      inputMode: input.getMode(),
    });
    physics.setGloveTarget(gloveController.center);

    director = updateShot3DDirector(director, dt, state.elapsed);
    launchCurrentShotIfNeeded();

    if (launchedShotId !== null) {
      physics.step(dt);
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
      gloves: physics.getGloveState(),
      gloveController,
    };
  }

  function syncDebugDataset() {
    var ball = physics.getBallState();
    stage.dataset.bootStatus = windowRef.goalkeeperBootStatus || "";
    stage.dataset.phase = director.phase;
    stage.dataset.shotId = String(director.currentShot?.shotId ?? "");
    stage.dataset.launchedShotId = String(launchedShotId ?? "");
    stage.dataset.ballOutcome = ball?.outcome || "";
    stage.dataset.ballZ = ball?.position ? String(Math.round(ball.position.z * 100) / 100) : "";
    stage.dataset.ballX = ball?.position ? String(Math.round(ball.position.x * 100) / 100) : "";
    stage.dataset.ballY = ball?.position ? String(Math.round(ball.position.y * 100) / 100) : "";
    stage.dataset.handledOutcome = handledOutcome || "";
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
  });

  function onDebugKey(event) {
    if (!debugKeysEnabled) return;
    if (event.key === "[") {
      forcePlan(makeCloseSavePlan(), { x: 0, y: 1.25, z: 3.15 });
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
      forcePlan(makeCloseSavePlan(), { x: 0, y: 1.25, z: 3.15 });
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
