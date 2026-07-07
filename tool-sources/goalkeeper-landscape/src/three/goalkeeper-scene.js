import * as THREE from "three";
import {
  createFieldGroup,
  createFootballTexture,
  createGloveMesh,
  createGoalAndNet,
  createShooterModel,
  updateShooterModel,
} from "./procedural-assets.js";
import { SHOT_3D } from "../game/shot-3d-director.js";
import { RAPIER_GOAL } from "../physics/rapier-world.js";

export const SCENE_TUNING = {
  camera: {
    fov: 68,
    position: { x: 0, y: 1.42, z: 9.35 },
    lookAt: { x: 0, y: 1.16, z: -12 },
  },
  portraitCamera: {
    fov: 74,
    position: { x: 0, y: 1.34, z: 17.2 },
    lookAt: { x: 0, y: 1.12, z: -9 },
  },
  ball: {
    radius: 0.12,
    haloRadius: 0.24,
    shadowRadius: 0.14,
    baseScale: 0.72,
    nearScale: 1.32,
    goalScale: 1.12,
    deflectedScale: 1.06,
    showShotTrail: false,
    maxLingeringBalls: 6,
  },
  gloves: {
    scale: 0.64,
  },
  lighting: {
    assetSystem: "warm-stadium-three-point",
    hemisphereIntensity: 2.35,
    sunIntensity: 2.25,
    rimIntensity: 0.72,
    fillIntensity: 0.62,
  },
  feedback: {
    assetSystem: "matchday-feedback-kit",
    impactRingCount: 3,
    saveFlashColor: "#fff1a8",
    goalFlashColor: "#ff7846",
    streakFlashColor: "#61f0ff",
    frameFlashColor: "#f8fff2",
    frameImpactStrength: 0.82,
    maxCameraShake: 0.045,
    netPulseDecay: 0.032,
    groundSkidCount: 5,
    groundSkidColor: "#e7d5a7",
    groundSkidMaxOpacity: 0.34,
    saveSparkCount: 10,
    saveSparkColor: "#fff7ba",
    saveSparkMaxOpacity: 0.68,
    netRippleLineCount: 5,
    netRippleMaxOpacity: 0.34,
    goalWaveCount: 3,
    goalWaveMaxOpacity: 0.42,
    streakPulseCount: 2,
    streakPulseMaxOpacity: 0.62,
  },
  depth: {
    originZ: SHOT_3D.origin.z,
    netPlaneZ: SHOT_3D.netPlaneZ,
  },
};

function clamp01(value) {
  return Math.max(0, Math.min(1, value));
}

function lerpNumber(start, end, amount) {
  return start + (end - start) * amount;
}

function applyCameraTuning(camera, aspect, tuning) {
  var portraitMix = clamp01((1.25 - aspect) / 0.75);
  var base = tuning.camera;
  var portrait = tuning.portraitCamera;
  camera.fov = lerpNumber(base.fov, portrait.fov, portraitMix);
  camera.position.set(
    lerpNumber(base.position.x, portrait.position.x, portraitMix),
    lerpNumber(base.position.y, portrait.position.y, portraitMix),
    lerpNumber(base.position.z, portrait.position.z, portraitMix),
  );
  var lookAt = new THREE.Vector3(
    lerpNumber(base.lookAt.x, portrait.lookAt.x, portraitMix),
    lerpNumber(base.lookAt.y, portrait.lookAt.y, portraitMix),
    lerpNumber(base.lookAt.z, portrait.lookAt.z, portraitMix),
  );
  camera.lookAt(lookAt);
  return {
    position: camera.position.clone(),
    lookAt,
  };
}

export function createGoalkeeperScene(canvas) {
  var tuning = SCENE_TUNING;
  var renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
  renderer.setClearColor("#8ed7ff", 1);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.04;
  renderer.shadowMap.enabled = true;

  var scene = new THREE.Scene();
  scene.userData.feedbackAssetSystem = tuning.feedback.assetSystem;
  scene.fog = new THREE.Fog("#8ed7ff", 28, 58);

  var camera = new THREE.PerspectiveCamera(tuning.camera.fov, 16 / 9, 0.05, 90);
  var cameraFraming = applyCameraTuning(camera, 16 / 9, tuning);

  scene.userData.lightingAssetSystem = tuning.lighting.assetSystem;
  var hemi = new THREE.HemisphereLight("#fff7da", "#2d6b40", tuning.lighting.hemisphereIntensity);
  var sun = new THREE.DirectionalLight("#fff4cf", tuning.lighting.sunIntensity);
  sun.position.set(-3, 7, 5);
  var rim = new THREE.DirectionalLight("#dffcff", tuning.lighting.rimIntensity);
  rim.position.set(4.8, 3.1, -8.6);
  var fill = new THREE.DirectionalLight("#fff0dd", tuning.lighting.fillIntensity);
  fill.position.set(3.4, 2.2, 4.6);
  scene.add(hemi, sun, rim, fill);

  var field = createFieldGroup();
  var goal = createGoalAndNet();
  var shooter = createShooterModel();
  var ballTexture = createFootballTexture();
  var ballGeometry = new THREE.SphereGeometry(tuning.ball.radius, 32, 24);
  var haloGeometry = new THREE.CircleGeometry(tuning.ball.haloRadius, 32);
  var shadowGeometry = new THREE.CircleGeometry(tuning.ball.shadowRadius, 24);
  function createBallView(name) {
    var mesh = new THREE.Mesh(
      ballGeometry,
      new THREE.MeshStandardMaterial({ map: ballTexture, roughness: 0.42, metalness: 0.02 }),
    );
    var halo = new THREE.Mesh(
      haloGeometry,
      new THREE.MeshBasicMaterial({ color: "#fff0a6", transparent: true, opacity: 0.34, depthWrite: false }),
    );
    var shadow = new THREE.Mesh(
      shadowGeometry,
      new THREE.MeshBasicMaterial({ color: "#173720", transparent: true, opacity: 0.28, depthWrite: false }),
    );
    mesh.name = name + "-ball";
    halo.name = name + "-halo";
    shadow.name = name + "-shadow";
    shadow.rotation.x = -Math.PI / 2;
    mesh.visible = false;
    halo.visible = false;
    shadow.visible = false;
    return { mesh, halo, shadow };
  }
  var activeBall = createBallView("active");
  var lingeringBallViews = Array.from({ length: tuning.ball.maxLingeringBalls }, (_, index) =>
    createBallView("lingering-" + index),
  );
  var groundSkidGeometry = new THREE.CircleGeometry(0.22, 28);
  var groundSkids = Array.from({ length: tuning.feedback.groundSkidCount }, (_, index) => {
    var skid = new THREE.Mesh(
      groundSkidGeometry,
      new THREE.MeshBasicMaterial({
        color: tuning.feedback.groundSkidColor,
        transparent: true,
        opacity: 0,
        depthWrite: false,
      }),
    );
    skid.name = "feedback-ground-skid-" + index;
    skid.rotation.x = -Math.PI / 2;
    skid.visible = false;
    return skid;
  });
  var leftGlove = createGloveMesh("left");
  var rightGlove = createGloveMesh("right");
  leftGlove.scale.setScalar(tuning.gloves.scale);
  rightGlove.scale.setScalar(tuning.gloves.scale);
  var impactRings = Array.from({ length: tuning.feedback.impactRingCount }, (_, index) => {
    var ring = new THREE.Mesh(
      new THREE.TorusGeometry(0.2 + index * 0.06, 0.012, 8, 36),
      new THREE.MeshBasicMaterial({
        color: tuning.feedback.saveFlashColor,
        transparent: true,
        opacity: 0,
        depthWrite: false,
      }),
    );
    ring.name = "feedback-impact-ring-" + index;
    ring.rotation.x = Math.PI / 2;
    ring.userData.life = 0;
    return ring;
  });
  var saveSparks = Array.from({ length: tuning.feedback.saveSparkCount }, (_, index) => {
    var spark = new THREE.Mesh(
      new THREE.PlaneGeometry(0.035, 0.16),
      new THREE.MeshBasicMaterial({
        color: tuning.feedback.saveSparkColor,
        transparent: true,
        opacity: 0,
        depthWrite: false,
        side: THREE.DoubleSide,
      }),
    );
    spark.name = "feedback-save-spark-" + index;
    spark.userData.life = 0;
    spark.userData.velocity = { x: 0, y: 0, z: 0 };
    return spark;
  });
  var goalFlash = new THREE.Mesh(
    new THREE.CircleGeometry(0.42, 36),
    new THREE.MeshBasicMaterial({
      color: tuning.feedback.goalFlashColor,
      transparent: true,
      opacity: 0,
      depthWrite: false,
    }),
  );
  goalFlash.name = "feedback-goal-flash";
  goalFlash.rotation.x = Math.PI / 2;
  var streakFlash = new THREE.Mesh(
    new THREE.TorusGeometry(0.42, 0.018, 8, 40),
    new THREE.MeshBasicMaterial({
      color: tuning.feedback.streakFlashColor,
      transparent: true,
      opacity: 0,
      depthWrite: false,
    }),
  );
  streakFlash.name = "feedback-streak-ring";
  streakFlash.rotation.x = Math.PI / 2;
  streakFlash.userData.life = 0;
  var netRippleLines = Array.from({ length: tuning.feedback.netRippleLineCount }, (_, index) => {
    var line = new THREE.Mesh(
      new THREE.PlaneGeometry(RAPIER_GOAL.halfWidth * 1.82, 0.018),
      new THREE.MeshBasicMaterial({
        color: "#f8fff2",
        transparent: true,
        opacity: 0,
        depthWrite: false,
      }),
    );
    line.name = "feedback-net-ripple-line-" + index;
    line.position.set(0, 0.52 + index * 0.34, RAPIER_GOAL.netPlaneZ + 0.13);
    line.userData.life = 0;
    line.userData.baseY = line.position.y;
    return line;
  });
  var goalWaves = Array.from({ length: tuning.feedback.goalWaveCount }, (_, index) => {
    var wave = new THREE.Mesh(
      new THREE.TorusGeometry(0.28 + index * 0.08, 0.012, 8, 42),
      new THREE.MeshBasicMaterial({
        color: tuning.feedback.goalFlashColor,
        transparent: true,
        opacity: 0,
        depthWrite: false,
      }),
    );
    wave.name = "feedback-goal-wave-" + index;
    wave.userData.life = 0;
    return wave;
  });
  var streakPulses = Array.from({ length: tuning.feedback.streakPulseCount }, (_, index) => {
    var pulse = new THREE.Mesh(
      new THREE.TorusGeometry(0.5 + index * 0.11, 0.014, 8, 44),
      new THREE.MeshBasicMaterial({
        color: tuning.feedback.streakFlashColor,
        transparent: true,
        opacity: 0,
        depthWrite: false,
      }),
    );
    pulse.name = "feedback-streak-pulse-" + index;
    pulse.userData.life = 0;
    return pulse;
  });

  scene.add(
    field,
    goal.group,
    shooter.group,
    activeBall.halo,
    activeBall.mesh,
    activeBall.shadow,
    ...lingeringBallViews.flatMap((view) => [view.halo, view.mesh, view.shadow]),
    ...groundSkids,
    leftGlove,
    rightGlove,
    ...impactRings,
    ...saveSparks,
    goalFlash,
    streakFlash,
    ...netRippleLines,
    ...goalWaves,
    ...streakPulses,
  );

  var netPulse = 0;
  var lastContactSignature = "";
  var cameraShake = 0;
  var feedbackSignature = "";
  var feedbackFrame = 0;

  function resize(bounds) {
    var width = Math.max(1, Math.round(bounds.width || canvas.clientWidth || 1280));
    var height = Math.max(1, Math.round(bounds.height || canvas.clientHeight || 720));
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    cameraFraming = applyCameraTuning(camera, camera.aspect, tuning);
    camera.updateProjectionMatrix();
  }

  function setBallViewVisible(view, visible) {
    view.mesh.visible = visible;
    view.halo.visible = visible;
    view.shadow.visible = visible;
  }

  function updateBallView(view, ballState, shot) {
    var position = ballState?.position || shot?.origin;
    if (!position) {
      setBallViewVisible(view, false);
      return;
    }

    setBallViewVisible(view, true);
    view.mesh.position.set(position.x, position.y, position.z);
    var depthRange = tuning.depth.netPlaneZ - tuning.depth.originZ;
    var depth = clamp01((position.z - tuning.depth.originZ) / depthRange);
    var speedScale =
      ballState?.outcome === "goal"
        ? tuning.ball.goalScale
        : ballState?.outcome === "deflected"
          ? tuning.ball.deflectedScale
          : 1;
    var visualScale = lerpNumber(tuning.ball.baseScale, tuning.ball.nearScale, depth);
    view.mesh.scale.setScalar(speedScale * visualScale);
    var angular = ballState?.angularVelocity || shot?.ballPlan?.angularVelocity || { x: -8, y: 12, z: 0 };
    view.mesh.rotation.x += angular.x * 0.008;
    view.mesh.rotation.y += angular.y * 0.008;
    view.mesh.rotation.z += angular.z * 0.008;

    view.halo.position.set(position.x, position.y, position.z - 0.025);
    view.halo.lookAt(camera.position);
    view.halo.scale.setScalar(0.22 + depth * 0.64);
    view.halo.material.opacity = ballState?.outcome === "goal" ? 0.34 : ballState?.live ? 0.28 : 0.18;

    view.shadow.position.set(position.x, 0.012, position.z);
    var shadowScale = Math.max(0.12, 0.28 - position.y * 0.04);
    view.shadow.scale.set(shadowScale, shadowScale * 0.62, 1);
  }

  function updateLingeringBalls(snapshot) {
    var lingeringBalls = snapshot.lingeringBalls || [];
    lingeringBallViews.forEach((view, index) => {
      updateBallView(view, lingeringBalls[index], null);
    });
  }

  function updateGroundSkid(skid, ballState) {
    var feedback = ballState?.groundFeedback;
    if (!feedback?.active || !feedback.point) {
      skid.visible = false;
      skid.material.opacity = 0;
      return;
    }
    var direction = feedback.direction || { x: 0, y: 0, z: -1 };
    var angle = Math.atan2(direction.x || 0, direction.z || -1);
    var intensity = clamp01(feedback.intensity || 0);
    var length = feedback.skidLength || 0.32;
    skid.visible = true;
    skid.position.set(feedback.point.x, feedback.point.y, feedback.point.z);
    skid.rotation.set(-Math.PI / 2, 0, angle);
    skid.scale.set(Math.max(0.28, length), 0.22 + intensity * 0.32, 1);
    skid.material.opacity = tuning.feedback.groundSkidMaxOpacity * intensity;
  }

  function updateGroundSkids(snapshot) {
    var candidates = [snapshot.ball, ...(snapshot.lingeringBalls || [])].filter((ballState) => ballState?.groundFeedback?.active);
    groundSkids.forEach((skid, index) => {
      updateGroundSkid(skid, candidates[index]);
    });
  }

  function triggerImpact(type, position, strength) {
    var color =
      type === "goal"
        ? tuning.feedback.goalFlashColor
        : type === "streak"
          ? tuning.feedback.streakFlashColor
          : type === "frame"
            ? tuning.feedback.frameFlashColor
            : tuning.feedback.saveFlashColor;
    var pulseStrength = strength || 1;
    impactRings.forEach((ring, index) => {
      ring.position.set(position.x, position.y, position.z);
      ring.material.color.set(color);
      ring.material.opacity = Math.max(0.18, 0.72 - index * 0.16) * pulseStrength;
      ring.scale.setScalar(1 + index * 0.12);
      ring.userData.life = Math.max(0.35, 1 - index * 0.12);
    });
    cameraShake = Math.max(cameraShake, tuning.feedback.maxCameraShake * pulseStrength);
  }

  function triggerSaveFeedback(position, strength) {
    var pulseStrength = strength || 1;
    triggerImpact("save", position, pulseStrength);
    saveSparks.forEach((spark, index) => {
      var angle = (index / saveSparks.length) * Math.PI * 2 + (index % 2 ? 0.26 : -0.18);
      var radius = 0.08 + (index % 3) * 0.026;
      spark.position.set(
        position.x + Math.cos(angle) * radius,
        position.y + Math.sin(angle) * radius * 0.7,
        position.z - 0.025 + (index % 2) * 0.02,
      );
      spark.rotation.set(0, 0, angle);
      spark.scale.setScalar(0.8 + (index % 4) * 0.08);
      spark.material.opacity = tuning.feedback.saveSparkMaxOpacity * pulseStrength;
      spark.userData.life = Math.max(0.28, 0.58 - index * 0.018);
      spark.userData.velocity = {
        x: Math.cos(angle) * (0.009 + index * 0.0008),
        y: Math.sin(angle) * 0.006,
        z: -0.002,
      };
    });
  }

  function triggerGoalFeedback(position) {
    goalFlash.position.set(position.x, Math.max(0.08, position.y), position.z + 0.05);
    goalFlash.material.opacity = 0.38;
    goalFlash.scale.setScalar(1);
    triggerImpact("goal", position, 1);
    netPulse = 1;
    goalWaves.forEach((wave, index) => {
      wave.position.set(position.x, Math.max(0.16, position.y), position.z + 0.06 + index * 0.012);
      wave.scale.setScalar(1 + index * 0.12);
      wave.material.opacity = tuning.feedback.goalWaveMaxOpacity * (1 - index * 0.16);
      wave.userData.life = Math.max(0.42, 0.74 - index * 0.12);
    });
    netRippleLines.forEach((line, index) => {
      line.userData.life = Math.max(0.38, 0.7 - index * 0.055);
      line.material.opacity = tuning.feedback.netRippleMaxOpacity * (1 - index * 0.09);
      line.scale.set(0.72 + index * 0.06, 1, 1);
    });
  }

  function triggerStreakFeedback(gloves) {
    var center = gloves?.center || { x: 0, y: 1.35, z: 3.15 };
    streakFlash.position.set(center.x, center.y, center.z - 0.04);
    streakFlash.material.opacity = 0.72;
    streakFlash.scale.setScalar(1);
    streakFlash.userData.life = 1;
    triggerImpact("streak", center, 0.72);
    streakPulses.forEach((pulse, index) => {
      pulse.position.set(center.x, center.y, center.z - 0.045 - index * 0.018);
      pulse.material.opacity = tuning.feedback.streakPulseMaxOpacity * (1 - index * 0.18);
      pulse.scale.setScalar(1 + index * 0.16);
      pulse.userData.life = Math.max(0.48, 0.84 - index * 0.12);
    });
  }

  function updateBall(snapshot) {
    var ballState = snapshot.ball;
    var shot = snapshot.director?.currentShot;
    updateBallView(activeBall, ballState, shot);

    if (ballState?.lastContact?.type) {
      var contactPoint = ballState.lastContact.point || ballState.position || { x: 0, y: 0, z: 0 };
      var contactSignature = [
        shot?.shotId ?? "",
        ballState.lastContact.type,
        Math.round((contactPoint.x || 0) * 10),
        Math.round((contactPoint.y || 0) * 10),
        Math.round((contactPoint.z || 0) * 10),
      ].join(":");
      if (contactSignature === lastContactSignature) return;
      lastContactSignature = contactSignature;
      if (ballState.lastContact.type === "glove" || ballState.lastContact.type === "catch") {
        var position = contactPoint;
        triggerSaveFeedback(position, ballState.lastContact.type === "catch" ? 0.95 : 0.82);
      }
      if (ballState.lastContact.type === "net") {
        triggerGoalFeedback(contactPoint);
      }
      if (ballState.lastContact.type === "frame") {
        triggerImpact("frame", contactPoint, tuning.feedback.frameImpactStrength);
      }
    }
  }

  function updateStateFeedback(snapshot) {
    var state = snapshot.state || {};
    var signature = [state.message, state.score, state.conceded, state.saves, state.streak].join(":");
    if (signature === feedbackSignature) return;
    feedbackSignature = signature;
    if (state.message === "save" && state.streak >= 3) {
      triggerStreakFeedback(snapshot.gloves);
    }
    if (state.message === "goal" && snapshot.ball?.position) {
      triggerGoalFeedback(snapshot.ball.position);
    }
  }

  function updateGloves(gloves) {
    var left = gloves?.left || { x: -0.34, y: 1.2, z: 3.15 };
    var right = gloves?.right || { x: 0.34, y: 1.2, z: 3.15 };
    leftGlove.position.set(left.x, left.y, left.z);
    rightGlove.position.set(right.x, right.y, right.z);
    leftGlove.rotation.set(-0.12, 0.08, -0.1);
    rightGlove.rotation.set(-0.12, -0.08, 0.1);
  }

  function updateNetAndEffects() {
    if (netPulse > 0) {
      netPulse = Math.max(0, netPulse - tuning.feedback.netPulseDecay);
      goal.net.position.z = RAPIER_GOAL.netPlaneZ + 0.1 + Math.sin(netPulse * Math.PI) * 0.18;
      goal.net.material.opacity = 0.16 + netPulse * 0.24;
      goal.grid.position.z = Math.sin(netPulse * Math.PI) * 0.1;
    } else {
      goal.net.position.z = RAPIER_GOAL.netPlaneZ + 0.1;
      goal.net.material.opacity = 0.16;
      goal.grid.position.z = 0;
    }

    impactRings.forEach((ring, index) => {
      if (ring.userData.life <= 0) {
        ring.material.opacity = 0;
        return;
      }
      ring.userData.life = Math.max(0, ring.userData.life - 0.045 - index * 0.006);
      ring.material.opacity = Math.max(0, ring.userData.life * (0.54 - index * 0.08));
      ring.scale.multiplyScalar(1.045 + index * 0.01);
      ring.lookAt(camera.position);
    });

    saveSparks.forEach((spark, index) => {
      if (spark.userData.life <= 0) {
        spark.material.opacity = 0;
        return;
      }
      spark.userData.life = Math.max(0, spark.userData.life - 0.055 - index * 0.002);
      var velocity = spark.userData.velocity || { x: 0, y: 0, z: 0 };
      spark.position.x += velocity.x;
      spark.position.y += velocity.y;
      spark.position.z += velocity.z;
      spark.material.opacity = spark.userData.life * tuning.feedback.saveSparkMaxOpacity;
      spark.scale.multiplyScalar(0.992);
      spark.lookAt(camera.position);
    });

    if (goalFlash.material.opacity > 0) {
      goalFlash.material.opacity = Math.max(0, goalFlash.material.opacity - 0.028);
      goalFlash.scale.multiplyScalar(1.028);
      goalFlash.lookAt(camera.position);
    }

    if (streakFlash.userData.life > 0) {
      streakFlash.userData.life = Math.max(0, streakFlash.userData.life - 0.038);
      streakFlash.material.opacity = Math.max(0, streakFlash.userData.life * 0.68);
      streakFlash.scale.multiplyScalar(1.032);
      streakFlash.lookAt(camera.position);
    } else {
      streakFlash.material.opacity = 0;
    }

    netRippleLines.forEach((line, index) => {
      if (line.userData.life <= 0) {
        line.material.opacity = 0;
        return;
      }
      line.userData.life = Math.max(0, line.userData.life - 0.035 - index * 0.002);
      var wave = Math.sin(line.userData.life * Math.PI * 4 + index * 0.65);
      line.position.y = line.userData.baseY + wave * 0.018;
      line.position.z = RAPIER_GOAL.netPlaneZ + 0.14 + Math.sin(line.userData.life * Math.PI) * 0.08;
      line.material.opacity = line.userData.life * tuning.feedback.netRippleMaxOpacity;
      line.scale.x = 0.82 + (1 - line.userData.life) * 0.34 + index * 0.03;
    });

    goalWaves.forEach((wave, index) => {
      if (wave.userData.life <= 0) {
        wave.material.opacity = 0;
        return;
      }
      wave.userData.life = Math.max(0, wave.userData.life - 0.036 - index * 0.003);
      wave.material.opacity = wave.userData.life * tuning.feedback.goalWaveMaxOpacity;
      wave.scale.multiplyScalar(1.035 + index * 0.006);
      wave.lookAt(camera.position);
    });

    streakPulses.forEach((pulse, index) => {
      if (pulse.userData.life <= 0) {
        pulse.material.opacity = 0;
        return;
      }
      pulse.userData.life = Math.max(0, pulse.userData.life - 0.04 - index * 0.004);
      pulse.material.opacity = pulse.userData.life * tuning.feedback.streakPulseMaxOpacity;
      pulse.scale.multiplyScalar(1.025 + index * 0.006);
      pulse.lookAt(camera.position);
    });
  }

  function applyFeedbackCamera() {
    feedbackFrame += 1;
    if (cameraShake <= 0) {
      camera.position.copy(cameraFraming.position);
      camera.lookAt(cameraFraming.lookAt);
      return;
    }
    var amount = cameraShake;
    camera.position.set(
      cameraFraming.position.x + Math.sin(feedbackFrame * 1.7) * amount,
      cameraFraming.position.y + Math.cos(feedbackFrame * 1.13) * amount * 0.62,
      cameraFraming.position.z,
    );
    camera.lookAt(cameraFraming.lookAt);
    cameraShake = Math.max(0, cameraShake - 0.0048);
  }

  function updateVisuals(snapshot) {
    updateShooterModel(shooter, snapshot.director || { phase: "cue", phaseTime: 0, currentShot: null });
    updateStateFeedback(snapshot);
    updateBall(snapshot);
    updateLingeringBalls(snapshot);
    updateGroundSkids(snapshot);
    updateGloves(snapshot.gloves);
    updateNetAndEffects();
    applyFeedbackCamera();
    renderer.render(scene, camera);
  }

  function dispose() {
    renderer.dispose();
  }

  return {
    scene,
    camera,
    renderer,
    resize,
    updateVisuals,
    dispose,
  };
}
