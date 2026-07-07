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
    shadowAssetSystem: "height-aware-ball-shadow",
    shadowGroundOpacity: 0.34,
    shadowAirOpacity: 0.08,
    shadowGroundScale: 0.34,
    shadowAirScale: 0.12,
    shadowHeightFade: 1.55,
    shadowStretch: 0.58,
    baseScale: 0.72,
    nearScale: 1.32,
    goalScale: 1.12,
    deflectedScale: 1.06,
    showShotTrail: false,
    maxLingeringBalls: 6,
  },
  gloves: {
    scale: 0.64,
    impactSystem: "glove-impact-compression-rebound",
    impactDecay: 0.055,
    impactCompression: 0.16,
    impactRebound: 0.075,
    impactTwist: 0.075,
    impactKickback: 0.035,
    impactStrengthScale: 0.035,
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
    turfContactAssetSystem: "rolling-turf-contact-flecks",
    turfFleckCount: 14,
    turfFleckMaxOpacity: 0.46,
    turfFleckTriggerAge: 0.12,
    turfFleckDecay: 0.052,
    turfFleckRise: 0.028,
    saveSparkCount: 10,
    saveSparkColor: "#fff7ba",
    saveSparkMaxOpacity: 0.68,
    netRippleLineCount: 5,
    netRippleMaxOpacity: 0.34,
    netRippleAssetSystem: "localized-net-ripple",
    netRippleContactRadius: 0.62,
    netRippleTravel: 0.075,
    netPocketAssetSystem: "localized-net-pocket-deformation",
    netPocketPatchCount: 3,
    netPocketMaxDepth: 0.28,
    netPocketMaxOpacity: 0.58,
    netPocketDecay: 0.042,
    frameReboundSystem: "post-crossbar-rebound-highlight",
    frameReboundMaxOpacity: 0.62,
    frameReboundDecay: 0.052,
    frameReboundShake: 0.72,
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

function createEmptyGloveImpact() {
  return {
    life: 0,
    strength: 0,
    point: null,
  };
}

function distanceSquared(a, b) {
  if (!a || !b) return Number.POSITIVE_INFINITY;
  var dx = (a.x || 0) - (b.x || 0);
  var dy = (a.y || 0) - (b.y || 0);
  var dz = (a.z || 0) - (b.z || 0);
  return dx * dx + dy * dy + dz * dz;
}

function normalizeGloveImpactStrength(contact, tuning) {
  var rawStrength = Number.isFinite(contact?.strength) ? contact.strength : contact?.type === "catch" ? 14 : 18;
  return clamp01(rawStrength * tuning.impactStrengthScale);
}

export function createGloveImpactState() {
  return {
    left: createEmptyGloveImpact(),
    right: createEmptyGloveImpact(),
  };
}

export function getGloveImpactForContact(contact, gloves, tuning = SCENE_TUNING.gloves) {
  if (!contact || (contact.type !== "glove" && contact.type !== "catch")) return null;

  var point = contact.point || gloves?.center || { x: 0, y: 1.2, z: 3.15 };
  var side = contact.type === "catch" || contact.side === "both" ? "both" : contact.side;
  if (side !== "left" && side !== "right" && side !== "both") {
    side = distanceSquared(point, gloves?.left) <= distanceSquared(point, gloves?.right) ? "left" : "right";
  }

  return {
    side,
    point,
    strength: Math.max(contact.type === "catch" ? 0.38 : 0.3, normalizeGloveImpactStrength(contact, tuning)),
  };
}

export function triggerGloveImpactState(state, contact, gloves, tuning = SCENE_TUNING.gloves) {
  var impact = getGloveImpactForContact(contact, gloves, tuning);
  if (!impact) return state;

  var sides = impact.side === "both" ? ["left", "right"] : [impact.side];
  sides.forEach((side) => {
    if (!state[side]) state[side] = createEmptyGloveImpact();
    state[side].life = 1;
    state[side].strength = Math.max(state[side].strength || 0, impact.strength);
    state[side].point = impact.point;
  });
  return state;
}

export function advanceGloveImpactState(state, tuning = SCENE_TUNING.gloves) {
  var decay = typeof tuning === "number" ? tuning : tuning.impactDecay;
  ["left", "right"].forEach((side) => {
    if (!state[side]) state[side] = createEmptyGloveImpact();
    state[side].life = Math.max(0, state[side].life - decay);
    if (state[side].life === 0) {
      state[side].strength = 0;
      state[side].point = null;
    }
  });
  return state;
}

export function getGloveVisualTransform(side, baseScale, impact, tuning = SCENE_TUNING.gloves) {
  var life = clamp01(impact?.life || 0);
  var strength = clamp01(impact?.strength || 0);
  var amount = life * strength;
  var compression = tuning.impactCompression * amount;
  var rebound = tuning.impactRebound * amount;
  var twistSign = side === "left" ? -1 : 1;

  return {
    scale: {
      x: baseScale * (1 + rebound),
      y: baseScale * (1 - compression),
      z: baseScale * (1 + rebound * 0.72),
    },
    rotation: {
      x: -compression * 0.18,
      y: twistSign * tuning.impactTwist * amount * 0.45,
      z: twistSign * tuning.impactTwist * amount,
    },
    offset: {
      x: 0,
      y: 0,
      z: tuning.impactKickback * amount,
    },
  };
}

export function getTurfContactFleckPlan(feedback, tuning = SCENE_TUNING.feedback) {
  if (!feedback?.active || !feedback.point) return [];
  if ((feedback.age || 0) > tuning.turfFleckTriggerAge) return [];

  var intensity = clamp01(feedback.intensity || 0);
  if (intensity <= 0.04) return [];

  var direction = feedback.direction || { x: 0, y: 0, z: -1 };
  var length = Math.hypot(direction.x || 0, direction.z || 0) || 1;
  var forward = {
    x: (direction.x || 0) / length,
    z: (direction.z || -1) / length,
  };
  var side = {
    x: -forward.z,
    z: forward.x,
  };
  var speedMix = clamp01((feedback.speed || 0) / 8);
  var count = tuning.turfFleckCount;

  return Array.from({ length: count }, (_, index) => {
    var t = count <= 1 ? 0 : index / (count - 1);
    var fan = (t - 0.5) * 2;
    var stagger = index % 3;
    var lateral = fan * (0.035 + intensity * 0.11);
    var forwardOffset = (0.018 + stagger * 0.008) * (0.35 + speedMix);
    var lift = tuning.turfFleckRise * (0.72 + intensity * 0.82 + stagger * 0.18);
    var fleckSpeed = (0.012 + index * 0.0007) * (0.7 + intensity + speedMix * 0.6);

    return {
      marker: "feedback-turf-fleck",
      position: {
        x: feedback.point.x + side.x * lateral + forward.x * forwardOffset,
        y: feedback.point.y + 0.018 + stagger * 0.006,
        z: feedback.point.z + side.z * lateral + forward.z * forwardOffset,
      },
      velocity: {
        x: forward.x * fleckSpeed + side.x * fan * fleckSpeed * 0.56,
        y: lift,
        z: forward.z * fleckSpeed + side.z * fan * fleckSpeed * 0.56,
      },
      scale: {
        x: 0.48 + stagger * 0.08,
        y: 0.86 + intensity * 0.44 + t * 0.18,
      },
      rotation: Math.atan2(forward.x, forward.z) + fan * 0.42,
      opacity: tuning.turfFleckMaxOpacity * intensity * (0.74 + (1 - Math.abs(fan)) * 0.26),
      life: Math.max(0.36, 0.72 - index * 0.012),
    };
  });
}

export function createNetPocketState() {
  return {
    life: 0,
    strength: 0,
    point: null,
    radius: 0,
    depth: 0,
  };
}

export function triggerNetPocketState(state, contact, tuning = SCENE_TUNING.feedback) {
  if (!state || !contact) return state;
  var strength = clamp01(Number.isFinite(contact.strength) ? contact.strength : 0.78);
  var point = {
    x: Math.max(-RAPIER_GOAL.halfWidth + 0.16, Math.min(RAPIER_GOAL.halfWidth - 0.16, contact.x || contact.point?.x || 0)),
    y: Math.max(0.16, Math.min(RAPIER_GOAL.height - 0.08, contact.y || contact.point?.y || 1.2)),
    z: contact.z || contact.point?.z || RAPIER_GOAL.netPlaneZ,
  };

  state.life = 1;
  state.strength = Math.max(state.strength || 0, strength);
  state.point = point;
  state.radius = tuning.netRippleContactRadius * (0.92 + strength * 0.34);
  state.depth = tuning.netPocketMaxDepth * (0.68 + strength * 0.32);
  return state;
}

export function advanceNetPocketState(state, tuning = SCENE_TUNING.feedback) {
  if (!state) return state;
  state.life = Math.max(0, (state.life || 0) - tuning.netPocketDecay);
  if (state.life <= 0) {
    state.strength = 0;
    state.point = null;
    state.radius = 0;
    state.depth = 0;
  }
  return state;
}

export function getNetPocketFeedbackPlan(state, tuning = SCENE_TUNING.feedback) {
  if (!state?.point || (state.life || 0) <= 0) return null;
  var life = clamp01(state.life);
  var strength = clamp01(state.strength || 0.72);
  var pulse = 0.78 + Math.sin((1 - life) * Math.PI) * 0.22;
  var depth = (state.depth || tuning.netPocketMaxDepth) * life * pulse;
  var radius = Math.max(tuning.netRippleContactRadius, state.radius || tuning.netRippleContactRadius);

  return {
    marker: "feedback-net-pocket-deformation",
    point: state.point,
    radius,
    depth,
    strength,
    patches: Array.from({ length: tuning.netPocketPatchCount }, (_, index) => {
      var t = tuning.netPocketPatchCount <= 1 ? 0 : index / (tuning.netPocketPatchCount - 1);
      return {
        marker: "feedback-net-pocket-patch",
        position: {
          x: state.point.x,
          y: state.point.y + (t - 0.5) * radius * 0.2,
          z: state.point.z + 0.13 + depth * (1 - index * 0.16),
        },
        scale: {
          x: radius * (1.12 + index * 0.26),
          y: radius * (0.18 + index * 0.075),
        },
        opacity: tuning.netPocketMaxOpacity * life * (0.92 - index * 0.16),
        rotation: (index - 1) * 0.06,
      };
    }),
  };
}

export function getFrameReboundFeedbackPlan(contact, tuning = SCENE_TUNING.feedback) {
  if (!contact || contact.type !== "frame") return null;
  var raw = contact.point || contact;
  var part = contact.part || (raw.y >= RAPIER_GOAL.height - 0.14 ? "crossbar" : raw.x < 0 ? "left-post" : "right-post");
  var strength = clamp01(Number.isFinite(contact.strength) ? contact.strength : tuning.frameImpactStrength);
  var position = {
    x:
      part === "left-post"
        ? -RAPIER_GOAL.halfWidth
        : part === "right-post"
          ? RAPIER_GOAL.halfWidth
          : Math.max(-RAPIER_GOAL.halfWidth + 0.2, Math.min(RAPIER_GOAL.halfWidth - 0.2, raw.x || 0)),
    y:
      part === "crossbar"
        ? RAPIER_GOAL.height
        : Math.max(0.18, Math.min(RAPIER_GOAL.height - 0.12, raw.y || 1.2)),
    z: raw.z || RAPIER_GOAL.netPlaneZ,
  };

  return {
    marker: "feedback-frame-rebound-highlight",
    part,
    position,
    strength,
    opacity: tuning.frameReboundMaxOpacity * strength,
    shake: tuning.maxCameraShake * tuning.frameReboundShake * strength,
  };
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
  scene.userData.netRippleAssetSystem = tuning.feedback.netRippleAssetSystem;
  scene.userData.netPocketAssetSystem = tuning.feedback.netPocketAssetSystem;
  scene.userData.frameReboundSystem = tuning.feedback.frameReboundSystem;
  scene.userData.ballShadowAssetSystem = tuning.ball.shadowAssetSystem;
  scene.userData.gloveImpactSystem = tuning.gloves.impactSystem;
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
  var netBasePositions = Array.from(goal.net.geometry.attributes.position.array);
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
  var turfFleckGeometry = new THREE.PlaneGeometry(0.035, 0.11);
  var turfFlecks = Array.from({ length: tuning.feedback.turfFleckCount }, (_, index) => {
    var fleck = new THREE.Mesh(
      turfFleckGeometry,
      new THREE.MeshBasicMaterial({
        color: index % 3 === 0 ? "#c8d36f" : index % 3 === 1 ? "#e2c779" : "#8fcf5d",
        transparent: true,
        opacity: 0,
        depthWrite: false,
        side: THREE.DoubleSide,
      }),
    );
    fleck.name = "feedback-turf-fleck-" + index;
    fleck.userData.life = 0;
    fleck.userData.velocity = { x: 0, y: 0, z: 0 };
    return fleck;
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
  var netPocketGeometry = new THREE.PlaneGeometry(1, 1, 1, 1);
  var netPocketPatches = Array.from({ length: tuning.feedback.netPocketPatchCount }, (_, index) => {
    var patch = new THREE.Mesh(
      netPocketGeometry,
      new THREE.MeshBasicMaterial({
        color: index === 0 ? "#ffffff" : "#dff8ff",
        transparent: true,
        opacity: 0,
        depthWrite: false,
        side: THREE.DoubleSide,
      }),
    );
    patch.name = "feedback-net-pocket-deformation-" + index;
    patch.userData.life = 0;
    return patch;
  });
  var frameReboundGeometry = new THREE.SphereGeometry(0.09, 16, 10);
  var frameReboundHighlights = Array.from({ length: 3 }, (_, index) => {
    var highlight = new THREE.Mesh(
      frameReboundGeometry,
      new THREE.MeshBasicMaterial({
        color: index === 0 ? "#fff8d6" : "#f8fff2",
        transparent: true,
        opacity: 0,
        depthWrite: false,
      }),
    );
    highlight.name = "feedback-frame-rebound-highlight-" + index;
    highlight.userData.life = 0;
    highlight.userData.part = "";
    highlight.userData.basePosition = { x: 0, y: 0, z: 0 };
    return highlight;
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
    ...turfFlecks,
    leftGlove,
    rightGlove,
    ...impactRings,
    ...saveSparks,
    goalFlash,
    streakFlash,
    ...netRippleLines,
    ...netPocketPatches,
    ...frameReboundHighlights,
    ...goalWaves,
    ...streakPulses,
  );

  var netPulse = 0;
  var lastContactSignature = "";
  var cameraShake = 0;
  var feedbackSignature = "";
  var feedbackFrame = 0;
  var gloveImpactState = createGloveImpactState();
  var netPocketState = createNetPocketState();
  var lastTurfContactSignature = "";

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
    var heightAboveTurf = Math.max(0, position.y - (ballState?.radius || tuning.ball.radius));
    var airMix = clamp01(heightAboveTurf / tuning.ball.shadowHeightFade);
    var shadowScale = lerpNumber(tuning.ball.shadowGroundScale, tuning.ball.shadowAirScale, airMix);
    var shadowOpacity = lerpNumber(tuning.ball.shadowGroundOpacity, tuning.ball.shadowAirOpacity, airMix);
    var depthBoost = 1 + depth * 0.14;
    view.shadow.scale.set(shadowScale * depthBoost, shadowScale * tuning.ball.shadowStretch * depthBoost, 1);
    view.shadow.material.opacity = shadowOpacity * (ballState?.live ? 1 : 0.9);
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
    candidates.forEach((ballState, index) => {
      triggerTurfContactFeedback(ballState, index);
    });
  }

  function triggerTurfContactFeedback(ballState, ballIndex) {
    var feedback = ballState?.groundFeedback;
    var fleckPlan = getTurfContactFleckPlan(feedback, tuning.feedback);
    if (!fleckPlan.length) return;

    var point = feedback.point;
    var signature = [
      ballIndex,
      Math.round((point.x || 0) * 14),
      Math.round((point.z || 0) * 14),
      Math.round((feedback.speed || 0) * 10),
    ].join(":");
    if (signature === lastTurfContactSignature) return;
    lastTurfContactSignature = signature;

    fleckPlan.forEach((plan, index) => {
      var fleck = turfFlecks[index % turfFlecks.length];
      fleck.visible = true;
      fleck.position.set(plan.position.x, plan.position.y, plan.position.z);
      fleck.rotation.set(-Math.PI / 2 + 0.22, 0, plan.rotation);
      fleck.scale.set(plan.scale.x, plan.scale.y, 1);
      fleck.material.opacity = plan.opacity;
      fleck.userData.life = plan.life;
      fleck.userData.baseOpacity = plan.opacity;
      fleck.userData.velocity = plan.velocity;
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

  function triggerGoalFeedback(position, contact = null) {
    var contactX = Math.max(-RAPIER_GOAL.halfWidth + 0.18, Math.min(RAPIER_GOAL.halfWidth - 0.18, position.x || 0));
    var contactY = Math.max(0.18, Math.min(RAPIER_GOAL.height - 0.08, position.y || 1));
    var contactZ = position.z || RAPIER_GOAL.netPlaneZ;
    triggerNetPocketState(
      netPocketState,
      {
        x: contactX,
        y: contactY,
        z: contactZ,
        strength: Number.isFinite(contact?.strength) ? contact.strength : 0.82,
      },
      tuning.feedback,
    );
    goalFlash.position.set(contactX, Math.max(0.08, contactY), contactZ + 0.05);
    goalFlash.material.opacity = 0.38;
    goalFlash.scale.setScalar(1);
    triggerImpact("goal", { ...position, x: contactX, y: contactY }, 1);
    netPulse = 1;
    goalWaves.forEach((wave, index) => {
      wave.position.set(contactX, Math.max(0.16, contactY), position.z + 0.06 + index * 0.012);
      wave.scale.setScalar(1 + index * 0.12);
      wave.material.opacity = tuning.feedback.goalWaveMaxOpacity * (1 - index * 0.16);
      wave.userData.life = Math.max(0.42, 0.74 - index * 0.12);
    });
    netRippleLines.forEach((line, index) => {
      var centeredIndex = index - (netRippleLines.length - 1) / 2;
      var localY = Math.max(0.28, Math.min(RAPIER_GOAL.height - 0.12, contactY + centeredIndex * 0.16));
      var rippleWidth = tuning.feedback.netRippleContactRadius * (1.35 + index * 0.16);
      line.userData.life = Math.max(0.38, 0.7 - index * 0.055);
      line.userData.originX = contactX;
      line.userData.baseY = localY;
      line.userData.baseScaleX = rippleWidth / (RAPIER_GOAL.halfWidth * 1.82);
      line.material.opacity = tuning.feedback.netRippleMaxOpacity * (1 - index * 0.09);
      line.position.x = contactX;
      line.position.y = localY;
      line.scale.set(line.userData.baseScaleX, 1, 1);
    });
  }

  function triggerFrameReboundFeedback(contact, fallbackPosition) {
    var plan = getFrameReboundFeedbackPlan(
      {
        ...(contact || {}),
        type: "frame",
        point: contact?.point || fallbackPosition,
      },
      tuning.feedback,
    );
    if (!plan) return;

    cameraShake = Math.max(cameraShake, plan.shake);
    frameReboundHighlights.forEach((highlight, index) => {
      var offset = (index - 1) * 0.045;
      var isCrossbar = plan.part === "crossbar";
      highlight.visible = true;
      highlight.position.set(
        plan.position.x + (isCrossbar ? offset : 0),
        plan.position.y + (isCrossbar ? 0 : offset),
        plan.position.z + 0.035 + index * 0.012,
      );
      highlight.scale.setScalar(1.08 + index * 0.22);
      highlight.material.opacity = plan.opacity * (1 - index * 0.2);
      highlight.userData.life = Math.max(0.42, 0.72 - index * 0.08);
      highlight.userData.part = plan.part;
      highlight.userData.basePosition = {
        x: highlight.position.x,
        y: highlight.position.y,
        z: highlight.position.z,
      };
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
        triggerGloveImpactState(gloveImpactState, ballState.lastContact, snapshot.gloves, tuning.gloves);
      }
      if (ballState.lastContact.type === "net") {
        triggerGoalFeedback(contactPoint, ballState.lastContact);
      }
      if (ballState.lastContact.type === "frame") {
        triggerImpact("frame", contactPoint, tuning.feedback.frameImpactStrength);
        triggerFrameReboundFeedback(ballState.lastContact, contactPoint);
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
    var leftTransform = getGloveVisualTransform("left", tuning.gloves.scale, gloveImpactState.left, tuning.gloves);
    var rightTransform = getGloveVisualTransform("right", tuning.gloves.scale, gloveImpactState.right, tuning.gloves);
    leftGlove.position.set(left.x + leftTransform.offset.x, left.y + leftTransform.offset.y, left.z + leftTransform.offset.z);
    rightGlove.position.set(
      right.x + rightTransform.offset.x,
      right.y + rightTransform.offset.y,
      right.z + rightTransform.offset.z,
    );
    leftGlove.rotation.set(-0.12 + leftTransform.rotation.x, 0.08 + leftTransform.rotation.y, -0.1 + leftTransform.rotation.z);
    rightGlove.rotation.set(
      -0.12 + rightTransform.rotation.x,
      -0.08 + rightTransform.rotation.y,
      0.1 + rightTransform.rotation.z,
    );
    leftGlove.scale.set(leftTransform.scale.x, leftTransform.scale.y, leftTransform.scale.z);
    rightGlove.scale.set(rightTransform.scale.x, rightTransform.scale.y, rightTransform.scale.z);
  }

  function applyNetPocketGeometry(plan) {
    var attribute = goal.net.geometry.attributes.position;
    var positions = attribute.array;
    var radius = plan?.radius || 1;
    var point = plan?.point;
    var depth = plan?.depth || 0;

    for (var index = 0; index < positions.length; index += 3) {
      var baseX = netBasePositions[index];
      var baseY = netBasePositions[index + 1];
      var worldY = baseY + RAPIER_GOAL.height / 2;
      var falloff = 0;
      if (point) {
        var dx = baseX - point.x;
        var dy = worldY - point.y;
        falloff = Math.max(0, 1 - Math.hypot(dx, dy) / radius);
        falloff *= falloff;
      }
      positions[index] = baseX;
      positions[index + 1] = baseY;
      positions[index + 2] = netBasePositions[index + 2] + depth * falloff;
    }
    attribute.needsUpdate = true;
  }

  function updateNetPocketVisuals() {
    var plan = getNetPocketFeedbackPlan(netPocketState, tuning.feedback);
    applyNetPocketGeometry(plan);

    netPocketPatches.forEach((patch, index) => {
      var patchPlan = plan?.patches?.[index];
      if (!patchPlan) {
        patch.visible = false;
        patch.material.opacity = 0;
        return;
      }
      patch.visible = true;
      patch.position.set(patchPlan.position.x, patchPlan.position.y, patchPlan.position.z);
      patch.rotation.set(0, 0, patchPlan.rotation);
      patch.scale.set(patchPlan.scale.x, patchPlan.scale.y, 1);
      patch.material.opacity = patchPlan.opacity;
      patch.userData.life = netPocketState.life;
    });

    advanceNetPocketState(netPocketState, tuning.feedback);
  }

  function updateFrameReboundHighlights() {
    frameReboundHighlights.forEach((highlight, index) => {
      if (highlight.userData.life <= 0) {
        highlight.visible = false;
        highlight.material.opacity = 0;
        return;
      }
      highlight.userData.life = Math.max(0, highlight.userData.life - tuning.feedback.frameReboundDecay - index * 0.002);
      var base = highlight.userData.basePosition || highlight.position;
      var tremor = Math.sin((1 - highlight.userData.life) * Math.PI * 8 + index) * 0.014 * highlight.userData.life;
      var isCrossbar = highlight.userData.part === "crossbar";
      highlight.position.set(
        base.x + (isCrossbar ? 0 : tremor),
        base.y + (isCrossbar ? tremor : 0),
        base.z + Math.sin(highlight.userData.life * Math.PI) * 0.025,
      );
      highlight.material.opacity = highlight.userData.life * tuning.feedback.frameReboundMaxOpacity * (1 - index * 0.16);
      highlight.scale.multiplyScalar(1.01 + index * 0.003);
      highlight.lookAt(camera.position);
    });
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
    updateNetPocketVisuals();

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

    turfFlecks.forEach((fleck, index) => {
      if (fleck.userData.life <= 0) {
        fleck.material.opacity = 0;
        fleck.visible = false;
        return;
      }
      fleck.userData.life = Math.max(0, fleck.userData.life - tuning.feedback.turfFleckDecay - index * 0.001);
      var velocity = fleck.userData.velocity || { x: 0, y: 0, z: 0 };
      fleck.position.x += velocity.x;
      fleck.position.y += velocity.y;
      fleck.position.z += velocity.z;
      fleck.userData.velocity = {
        x: velocity.x * 0.96,
        y: velocity.y * 0.82 - 0.0012,
        z: velocity.z * 0.96,
      };
      fleck.material.opacity = Math.max(0, fleck.userData.life * (fleck.userData.baseOpacity || tuning.feedback.turfFleckMaxOpacity));
      fleck.scale.multiplyScalar(0.994);
      fleck.lookAt(camera.position);
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
      var travelWave = Math.sin((1 - line.userData.life) * Math.PI * 2 + index) * tuning.feedback.netRippleTravel;
      line.position.x = (line.userData.originX || 0) + travelWave * (index % 2 ? -0.6 : 0.6);
      line.position.y = line.userData.baseY + wave * 0.018;
      line.position.z = RAPIER_GOAL.netPlaneZ + 0.14 + Math.sin(line.userData.life * Math.PI) * 0.08;
      line.material.opacity = line.userData.life * tuning.feedback.netRippleMaxOpacity;
      line.scale.x = (line.userData.baseScaleX || 0.18) + (1 - line.userData.life) * 0.1 + index * 0.006;
    });

    updateFrameReboundHighlights();

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

    advanceGloveImpactState(gloveImpactState, tuning.gloves);
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
