import * as THREE from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import { Sky } from "three/addons/objects/Sky.js";
import {
  REUSABLE_ENVIRONMENT_ASSET_SYSTEM,
  createReusableEnvironmentAssetPipeline,
} from "./reusable-environment-assets.js";
import {
  createFieldGroup,
  createFootballMaterial,
  createGloveMesh,
  createGoalAndNet,
  createShooterModel,
  getStadiumScoreboardPlan,
  updateStadiumScoreboardTexture,
  updateShooterModel,
} from "./procedural-assets.js";
import { MAX_CONCEDED } from "../config/game-config.js";
import { getContactEventSignature } from "../game/contact-event.js";
import { SHOT_3D } from "../game/shot-3d-director.js";
import {
  GOAL_NET_GEOMETRY,
  getGoalRoofHeightAtZ,
  getGoalSideHalfWidthAtZ,
} from "../physics/goal-net-geometry.js";
import { RAPIER_GOAL } from "../physics/rapier-world.js";

export const POSTPROCESSING_ADDON_SOURCES = [
  "three/addons/postprocessing/EffectComposer",
  "three/addons/postprocessing/RenderPass",
  "three/addons/postprocessing/UnrealBloomPass",
  "three/addons/postprocessing/OutputPass",
];

export const SKY_ENVIRONMENT_ADDON_SOURCE = "three/addons/objects/Sky";

export function getSaveContactFeedbackState(state = {}) {
  if (state.message === "save") return state;
  return {
    ...state,
    streak: (state.streak || 0) + 1,
  };
}

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
    netReadabilitySystem: "near-net-ball-priority-halo",
    renderOrder: 12,
    haloRenderOrder: 13,
    haloColor: "#ffffff",
    liveHaloOpacity: 0.1,
    goalHaloOpacity: 0,
    settledHaloOpacity: 0,
    nearNetHaloBoost: 0.06,
    nearNetHaloMaxOpacity: 0.16,
    showShotTrail: false,
    flightSpinGlintSystem: "attached-ball-spin-glint-kit",
    flightSpinGlintCount: 2,
    flightSpinGlintMinSpeed: 8,
    flightSpinGlintFullSpeed: 22,
    flightSpinGlintMaxOpacity: 0.24,
    flightSpeedRibbonSystem: "attached-ball-speed-ribbon-kit",
    flightSpeedRibbonCount: 3,
    flightSpeedRibbonMinSpeed: 11,
    flightSpeedRibbonFullSpeed: 28,
    flightSpeedRibbonMaxOpacity: 0.26,
    flightSpeedRibbonMaxLength: 0.4,
    maxLingeringBalls: 6,
    retiredReplayAirHideHeight: 0.24,
  },
  gloves: {
    scale: 0.64,
    impactSystem: "glove-impact-compression-rebound",
    contactDeformationSystem: "localized-glove-palm-deformation",
    impactDecay: 0.055,
    impactCompression: 0.16,
    impactRebound: 0.075,
    impactTwist: 0.075,
    impactKickback: 0.035,
    impactStrengthScale: 0.035,
    contactDeformationDecay: 0.058,
    contactDimpleMaxOpacity: 0.44,
    contactHighlightMaxOpacity: 0.42,
    contactCreaseCount: 3,
    contactCreaseMaxOpacity: 0.36,
  },
  lighting: {
    assetSystem: "warm-stadium-three-point",
    stadiumRigSystem: "three-spotlight-broadcast-rig",
    hemisphereIntensity: 2.35,
    hemisphereSkyColor: "#fff7da",
    hemisphereGroundColor: "#68737b",
    sunIntensity: 2.25,
    rimIntensity: 0.72,
    fillIntensity: 0.62,
    spotlightIntensity: 0.58,
    spotlightAngle: 0.62,
    spotlightPenumbra: 0.58,
  },
  environment: {
    system: "three-sky-atmospheric-training-ground",
    technique: "three-official-sky-shader",
    addonSource: SKY_ENVIRONMENT_ADDON_SOURCE,
    reusableAssetSystem: REUSABLE_ENVIRONMENT_ASSET_SYSTEM,
    backgroundReplacement: false,
    enabled: true,
    scale: 80,
    turbidity: 2.2,
    rayleigh: 0.26,
    mieCoefficient: 0.0012,
    mieDirectionalG: 0.52,
    showSunDisc: false,
    sunPosition: { x: -0.58, y: 0.2, z: -0.79 },
    fogColor: "#dfe6e8",
    fogNear: 30,
    fogFar: 64,
  },
  presentation: {
    system: "camera-attached-broadcast-presentation-layer",
    technique: "three-camera-transparent-overlay-kit",
    overlayDistance: 0.18,
    maxScreenWashOpacity: 0.09,
    vignetteBaseOpacity: 0.13,
    maxVignetteBoost: 0.08,
    focusRingMaxOpacity: 0.05,
    decay: 0.058,
    focusRingBaseScale: 0.28,
  },
  postprocessing: {
    system: "three-effectcomposer-unreal-bloom-event-pipeline",
    technique: "three-official-postprocessing-addons",
    addonSources: POSTPROCESSING_ADDON_SOURCES,
    enabled: true,
    baseStrength: 0.006,
    maxStrength: 0.06,
    threshold: 0.9,
    baseRadius: 0.08,
    maxRadius: 0.22,
    eventDecay: 0.04,
    pixelRatioCap: 1.45,
  },
  feedback: {
    assetSystem: "matchday-feedback-kit",
    eventOrchestratorSystem: "keeper-event-feedback-orchestrator",
    impactRingCount: 4,
    saveFlashColor: "#fff1a8",
    goalFlashColor: "#ff7846",
    goalContactDiscOpacity: 0,
    dangerGoalFlashColor: "#ff3f2f",
    streakFlashColor: "#61f0ff",
    frameFlashColor: "#f8fff2",
    catchSaveStrength: 0.95,
    parrySaveStrength: 0.82,
    saveImpactStrength: 0.86,
    goalImpactStrength: 1,
    dangerGoalImpactStrength: 1.18,
    frameImpactStrength: 0.82,
    maxCameraShake: 0.045,
    cameraShakeFalloff: 0.0048,
    netPulseDecay: 0.032,
    netBaseOpacity: 0,
    netPulseOpacityBoost: 0,
    netRecoilOpacityBoost: 0,
    groundSkidCount: 5,
    groundSkidColor: "#e7d5a7",
    groundSkidMaxOpacity: 0.34,
    courtContactAssetSystem: "rolling-court-dust-skid-flecks",
    courtDustFleckCount: 12,
    courtDustFleckMaxOpacity: 0.32,
    courtDustFleckTriggerAge: 0.12,
    courtDustFleckDecay: 0.048,
    courtDustFleckRise: 0.014,
    saveSparkCount: 8,
    saveSparkColor: "#fff7ba",
    saveSparkMaxOpacity: 0.68,
    saveAfterimageSystem: "directional-glove-save-afterimage",
    saveAfterimageCount: 3,
    saveAfterimageMaxOpacity: 0.34,
    saveAfterimageDecay: 0.052,
    saveAfterimageSpacing: 0.072,
    saveContactPressureSystem: "glove-ball-contact-pressure-kit",
    savePressureArcCount: 3,
    savePressureMaxOpacity: 0.48,
    savePressureDecay: 0.064,
    saveContactShockwaveSystem: "close-contact-glove-ball-shockwave",
    saveContactShockwaveCount: 3,
    saveContactShockwaveMaxOpacity: 0.3,
    saveContactShockwaveMaxRadius: 0.42,
    saveContactShockwaveDecay: 0.07,
    netRippleLineCount: 0,
    netRippleMaxOpacity: 0,
    netRippleAssetSystem: "localized-net-ripple",
    netRippleContactRadius: 0.62,
    netRippleTravel: 0.075,
    netPocketAssetSystem: "localized-net-pocket-deformation",
    netSurfaceDeformationSystem: "panel-aware-vertex-spring-net",
    netImpactTriggerSystem: "physical-panel-contact-only",
    netPocketPatchCount: 0,
    netPocketMaxDepth: 0.32,
    netPocketMaxOpacity: 0,
    netPocketDecay: 0.012,
    netPocketRippleAmplitude: 0.075,
    netPocketRippleWidth: 0.34,
    netCordTensionAssetSystem: "localized-net-cord-tension-shimmer",
    netCordTensionCount: 0,
    netCordTensionMaxOpacity: 0,
    netCordTensionTravel: 0.065,
    netCordTensionDecay: 0.044,
    netRecoilSystem: "damped-net-spring-rebound",
    netRecoilMaxTravel: 0.19,
    netRecoilStiffness: 58,
    netRecoilDamping: 0.962,
    netRecoilSettleThreshold: 0.006,
    frameReboundSystem: "post-crossbar-rebound-highlight",
    frameReboundMaxOpacity: 0.62,
    frameReboundDecay: 0.052,
    frameReboundShake: 0.72,
    goalWaveCount: 0,
    goalWaveMaxOpacity: 0,
    streakPulseCount: 2,
    streakPulseMaxOpacity: 0.62,
    dynamicNetDetailSystem: "reactive-woven-net-recoil",
    dynamicNetDetailMaxTravel: 0.12,
    dynamicNetDetailOpacityBoost: 0.07,
  },
  depth: {
    originZ: SHOT_3D.origin.z,
    netPlaneZ: SHOT_3D.netPlaneZ,
  },
};

function clamp01(value) {
  return Math.max(0, Math.min(1, value));
}

function clampNumber(value, min, max) {
  return Math.max(min, Math.min(max, value));
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

export function getGloveContactDeformationPlan(contact, gloves, tuning = SCENE_TUNING.gloves) {
  var system = tuning.contactDeformationSystem || "localized-glove-palm-deformation";
  var empty = { system, side: null, dimple: null, highlight: null, creases: [] };
  if (!contact || (contact.type !== "glove" && contact.type !== "catch")) return empty;

  var impact = getGloveImpactForContact(contact, gloves, tuning);
  if (!impact) return empty;

  var point = impact.point || gloves?.center || { x: 0, y: 1.2, z: 3.15 };
  var side = impact.side;
  var sideSign = side === "left" ? -1 : side === "right" ? 1 : Math.sign(point.x || 1);
  var normal = contact.normal || { x: sideSign * 0.46, y: 0.08, z: -0.72 };
  var velocity = gloves?.velocity || {};
  var compression = clamp01(Number.isFinite(contact.compression) ? contact.compression : impact.strength * 0.74);
  var rebound = clamp01((Number.isFinite(contact.reboundSpeed) ? contact.reboundSpeed : contact.strength || 0) / 36);
  var strength = clamp01(Math.max(impact.strength, compression * 0.82, rebound * 0.62));
  var sweep = Math.atan2(
    Number.isFinite(velocity.y) && Math.abs(velocity.y) > 0.04 ? velocity.y : normal.y || 0.08,
    Number.isFinite(velocity.x) && Math.abs(velocity.x) > 0.08 ? velocity.x : normal.x || sideSign * 0.45,
  );
  var count = tuning.contactCreaseCount || 0;

  return {
    system,
    side,
    dimple: {
      marker: "feedback-glove-contact-dimple",
      position: {
        x: point.x,
        y: point.y,
        z: point.z - 0.024,
      },
      scale: {
        x: 0.18 + compression * 0.12 + strength * 0.05,
        y: 0.062 + compression * 0.05 + strength * 0.018,
      },
      rotation: sweep + sideSign * 0.12,
      opacity: tuning.contactDimpleMaxOpacity * (0.68 + strength * 0.32),
      life: 0.62,
    },
    highlight: {
      marker: "feedback-glove-latex-rebound-highlight",
      position: {
        x: point.x - (normal.x || 0) * 0.035 + sideSign * 0.012,
        y: point.y + 0.018 + (normal.y || 0) * 0.028,
        z: point.z - 0.038,
      },
      scale: {
        x: 0.16 + rebound * 0.1 + strength * 0.04,
        y: 0.034 + compression * 0.022,
      },
      rotation: sweep - sideSign * 0.18,
      opacity: tuning.contactHighlightMaxOpacity * (0.62 + rebound * 0.38),
      life: 0.52,
    },
    creases: Array.from({ length: count }, (_, index) => {
      var t = count <= 1 ? 0 : index / (count - 1);
      var fan = index - (count - 1) / 2;
      return {
        marker: "feedback-glove-palm-crease",
        position: {
          x: point.x + sideSign * fan * 0.026,
          y: point.y + (t - 0.5) * 0.046,
          z: point.z - 0.032 - index * 0.004,
        },
        scale: {
          x: 0.11 + strength * 0.06 + index * 0.012,
          y: 0.026 + compression * 0.014,
        },
        rotation: sweep + sideSign * fan * 0.34,
        opacity: tuning.contactCreaseMaxOpacity * (0.88 - index * 0.12) * (0.72 + strength * 0.28),
        life: Math.max(0.38, 0.58 - index * 0.045),
      };
    }),
  };
}

export function getCourtDustFleckPlan(feedback, tuning = SCENE_TUNING.feedback) {
  if (!feedback?.active || !feedback.point) return [];
  if ((feedback.age || 0) > tuning.courtDustFleckTriggerAge) return [];

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
  var count = tuning.courtDustFleckCount;

  return Array.from({ length: count }, (_, index) => {
    var t = count <= 1 ? 0 : index / (count - 1);
    var fan = (t - 0.5) * 2;
    var stagger = index % 3;
    var lateral = fan * (0.045 + intensity * 0.08);
    var forwardOffset = (0.018 + stagger * 0.008) * (0.35 + speedMix);
    var lift = tuning.courtDustFleckRise * (0.62 + intensity * 0.56 + stagger * 0.12);
    var fleckSpeed = (0.008 + index * 0.00045) * (0.62 + intensity + speedMix * 0.42);

    return {
      marker: "feedback-court-dust-fleck",
      position: {
        x: feedback.point.x + side.x * lateral + forward.x * forwardOffset,
        y: feedback.point.y + 0.012 + stagger * 0.004,
        z: feedback.point.z + side.z * lateral + forward.z * forwardOffset,
      },
      velocity: {
        x: forward.x * fleckSpeed + side.x * fan * fleckSpeed * 0.56,
        y: lift,
        z: forward.z * fleckSpeed + side.z * fan * fleckSpeed * 0.56,
      },
      scale: {
        x: 0.62 + stagger * 0.1 + intensity * 0.16,
        y: 0.22 + intensity * 0.18 + t * 0.08,
      },
      rotation: Math.atan2(forward.x, forward.z) + fan * 0.42,
      opacity: tuning.courtDustFleckMaxOpacity * intensity * (0.68 + (1 - Math.abs(fan)) * 0.22),
      life: Math.max(0.28, 0.58 - index * 0.01),
    };
  });
}

export function getBallSpinGlintPlan(ballState, shot = null, tuning = SCENE_TUNING.ball) {
  var system = tuning.flightSpinGlintSystem || "attached-ball-spin-glint-kit";
  if (!ballState?.live || !ballState.position) return { system, glints: [] };

  var velocity = ballState.velocity || shot?.ballPlan?.velocity || {};
  var speed = Math.hypot(velocity.x || 0, velocity.y || 0, velocity.z || 0);
  var minSpeed = tuning.flightSpinGlintMinSpeed || 8;
  if (speed < minSpeed) return { system, glints: [] };

  var radius = ballState.radius || tuning.radius || 0.12;
  var heightAboveFloor = (ballState.position.y || 0) - radius;
  if (heightAboveFloor < radius * 1.25) return { system, glints: [] };

  var fullSpeed = Math.max(minSpeed + 0.1, tuning.flightSpinGlintFullSpeed || 22);
  var intensity = clamp01((speed - minSpeed) / (fullSpeed - minSpeed));
  var length = speed || 1;
  var direction = {
    x: (velocity.x || 0) / length,
    y: (velocity.y || 0) / length,
    z: (velocity.z || 0) / length,
  };
  var angular = ballState.angularVelocity || shot?.ballPlan?.angularVelocity || {};
  var spinAngle = Math.atan2(angular.y || velocity.y || 0.1, angular.x || velocity.x || 0.1);
  var count = tuning.flightSpinGlintCount || 0;

  return {
    system,
    glints: Array.from({ length: count }, (_, index) => {
      var t = count <= 1 ? 0 : index / (count - 1);
      var side = index - (count - 1) / 2;
      var trailOffset = radius * (0.18 + index * 0.04);
      var liftOffset = side * radius * 0.18;
      var scaleX = Math.min(0.18, radius * (0.78 + intensity * 0.24) + index * 0.012);
      return {
        marker: "feedback-ball-spin-glint",
        position: {
          x: ballState.position.x - direction.x * trailOffset + side * radius * 0.045,
          y: ballState.position.y - direction.y * trailOffset + liftOffset,
          z: ballState.position.z - direction.z * trailOffset,
        },
        scale: {
          x: scaleX,
          y: Math.max(0.028, scaleX * (0.18 + t * 0.04)),
        },
        rotation: spinAngle + side * 0.58 + intensity * 0.18,
        opacity: tuning.flightSpinGlintMaxOpacity * (0.62 + intensity * 0.38) * (1 - index * 0.16),
      };
    }),
  };
}

export function getBallSpeedRibbonPlan(ballState, shot = null, tuning = SCENE_TUNING.ball) {
  var system = tuning.flightSpeedRibbonSystem || "attached-ball-speed-ribbon-kit";
  if (!ballState?.live || !ballState.position) return { system, ribbons: [] };

  var velocity = ballState.velocity || shot?.ballPlan?.velocity || {};
  var speed = Math.hypot(velocity.x || 0, velocity.y || 0, velocity.z || 0);
  var minSpeed = tuning.flightSpeedRibbonMinSpeed || 11;
  if (speed < minSpeed) return { system, ribbons: [] };

  var radius = ballState.radius || tuning.radius || 0.12;
  var heightAboveFloor = (ballState.position.y || 0) - radius;
  if (heightAboveFloor < radius * 1.1) return { system, ribbons: [] };

  var fullSpeed = Math.max(minSpeed + 0.1, tuning.flightSpeedRibbonFullSpeed || 28);
  var intensity = clamp01((speed - minSpeed) / (fullSpeed - minSpeed));
  var length = Math.max(speed, 0.001);
  var direction = {
    x: (velocity.x || 0) / length,
    y: (velocity.y || 0) / length,
    z: (velocity.z || 0) / length,
  };
  var count = tuning.flightSpeedRibbonCount || 0;
  var maxLength = tuning.flightSpeedRibbonMaxLength || 0.34;

  return {
    system,
    ribbons: Array.from({ length: count }, (_, index) => {
      var t = count <= 1 ? 0 : index / (count - 1);
      var side = index - (count - 1) / 2;
      var offset = radius * (0.54 + index * 0.2);
      var sideOffset = side * radius * 0.42;
      var liftOffset = side * radius * 0.18;
      var ribbonLength = Math.min(maxLength, radius * (2.1 + intensity * 1.25 - t * 0.2));
      return {
        marker: "feedback-ball-speed-ribbon",
        position: {
          x: ballState.position.x - direction.x * offset + sideOffset,
          y: ballState.position.y - direction.y * offset + liftOffset,
          z: ballState.position.z - direction.z * offset,
        },
        scale: {
          x: ribbonLength,
          y: Math.max(0.022, radius * (0.22 - t * 0.028)),
        },
        rotation: Math.atan2(direction.y, direction.x || 0.001) + side * 0.08,
        opacity: tuning.flightSpeedRibbonMaxOpacity * (0.58 + intensity * 0.42) * (1 - index * 0.18),
      };
    }),
  };
}

export function getSceneBallRenderPlan(snapshot = {}) {
  var ball = snapshot.ball || null;
  var allLingeringBalls = Array.isArray(snapshot.lingeringBalls) ? snapshot.lingeringBalls.filter(Boolean) : [];
  var liveFrameHasCurrentBall = Boolean(snapshot.director?.phase === "live" && ball?.position);
  var currentSavedReplay = Boolean(liveFrameHasCurrentBall && ball.outcome === "saved" && !ball.live);
  var candidateLingeringBalls = currentSavedReplay ? allLingeringBalls.slice(-1) : allLingeringBalls;
  var lingeringBalls = candidateLingeringBalls.filter((lingeringBall) => shouldRenderLingeringBall(lingeringBall, snapshot));
  var visibleLingeringSet = new Set(lingeringBalls);
  var hiddenLingeringBalls = allLingeringBalls.filter((lingeringBall) => !visibleLingeringSet.has(lingeringBall));
  var contactType = ball?.lastContact?.type;
  var replaySourceOutcome = ball?.outcome === "saved" || ball?.outcome === "deflected";
  var replaySourceContact = contactType === "glove" || contactType === "catch";
  var currentShotId = snapshot.director?.currentShot?.shotId;
  var hasCurrentShotReplay = lingeringBalls.some((lingeringBall) =>
    lingeringBall?.replaySourceShotId !== undefined &&
    lingeringBall.replaySourceShotId !== null &&
    lingeringBall.replaySourceShotId === currentShotId,
  );
  var hideActiveBallForReplay = Boolean(
    ball &&
    !ball.live &&
    (hasCurrentShotReplay || (replaySourceOutcome && replaySourceContact)) &&
    lingeringBalls.length > 0,
  );
  var activeBall = hideActiveBallForReplay
    ? {
        ...ball,
        live: false,
        position: null,
        velocity: null,
        angularVelocity: null,
        hiddenByReplay: true,
      }
    : ball;
  var groundSkidBalls = [
    ...(hideActiveBallForReplay || !ball ? [] : [ball]),
    ...lingeringBalls,
  ].filter(Boolean);
  var visibleBallCount = (activeBall?.position ? 1 : 0) + lingeringBalls.filter((lingeringBall) => lingeringBall?.position).length;

  return {
    activeBall,
    contactBall: ball,
    lingeringBalls,
    hiddenLingeringBalls,
    groundSkidBalls,
    visibleBallCount,
    hideActiveBallForReplay,
  };
}

export function getPhysicalNetContactEvents(snapshot = {}) {
  var candidates = [snapshot.ball, ...(Array.isArray(snapshot.lingeringBalls) ? snapshot.lingeringBalls : [])];
  var seen = new Set();
  return candidates.reduce((events, ball) => {
    var contact = ball?.netContact;
    if (!contact?.point || contact.type !== "net") return events;
    var signature = contact.eventId || [
      "net",
      Math.round((contact.point.x || 0) * 20),
      Math.round((contact.point.y || 0) * 20),
      Math.round((contact.point.z || 0) * 20),
    ].join(":");
    if (seen.has(signature)) return events;
    seen.add(signature);
    events.push(contact);
    return events;
  }, []);
}

export function getPhysicalNetAnimationContact(contact) {
  var supportedPanels = new Set(["rear", "left", "right", "top"]);
  if (!contact?.point || contact.type !== "net" || !supportedPanels.has(contact.panel)) return null;
  var rawStrength = Number.isFinite(contact.strength) ? contact.strength : 12;
  return {
    panel: contact.panel,
    point: {
      x: contact.point.x || 0,
      y: contact.point.y || 0,
      z: contact.point.z || RAPIER_GOAL.netPlaneZ,
    },
    strength: clampNumber(0.3 + (rawStrength / 24) * 0.7, 0.3, 1),
  };
}

export function getBallHaloAppearancePlan(ballState = {}, position = {}, tuning = SCENE_TUNING.ball) {
  var isLiveBall = Boolean(ballState.live) && ballState.outcome !== "goal";
  var baseOpacity = ballState.outcome === "goal"
    ? tuning.goalHaloOpacity
    : isLiveBall
      ? tuning.liveHaloOpacity
      : tuning.settledHaloOpacity;
  var nearNetMix = isLiveBall
    ? clamp01(((position.z || 0) - (SCENE_TUNING.depth.netPlaneZ - 1.35)) / 1.35)
    : 0;
  var opacity = Math.min(
    tuning.nearNetHaloMaxOpacity,
    Math.max(0, (baseOpacity || 0) + nearNetMix * tuning.nearNetHaloBoost),
  );

  return {
    color: tuning.haloColor,
    opacity,
    visible: opacity > 0.002,
  };
}

export function getGoalContactFlashPlan(profile = {}, tuning = SCENE_TUNING.feedback) {
  var opacity = clampNumber(
    (tuning.goalContactDiscOpacity || 0) * (profile.impactStrength || 1),
    0,
    0.16,
  );
  return {
    system: "ring-only-goal-feedback",
    opacity,
    visible: opacity > 0.002,
  };
}

export function shouldRenderLingeringBall(lingeringBall, snapshot = {}, tuning = SCENE_TUNING.ball) {
  if (!lingeringBall?.position) return false;
  var activeBall = snapshot.ball;
  var liveFrameHasCurrentBall = Boolean(snapshot.director?.phase === "live" && activeBall?.position);
  if (liveFrameHasCurrentBall) {
    return Boolean(activeBall.outcome === "saved" && !activeBall.live);
  }

  var radius = lingeringBall.radius || tuning.radius || 0.12;
  var heightAboveFloor = (lingeringBall.position.y || 0) - radius;
  return heightAboveFloor <= (tuning.retiredReplayAirHideHeight || 0.24) || snapshot.director?.phase !== "live";
}

export function getSaveAfterimagePlan(contact, gloves, tuning = SCENE_TUNING.feedback) {
  if (!contact || (contact.type !== "glove" && contact.type !== "catch")) return [];

  var count = tuning.saveAfterimageCount || 0;
  if (count <= 0) return [];

  var point = contact.point || gloves?.center || { x: 0, y: 1.2, z: 3.15 };
  var velocity = gloves?.velocity || {};
  var sideSign = contact.side === "left" ? -1 : contact.side === "right" ? 1 : Math.sign(point.x || 1);
  var rawX = Number.isFinite(velocity.x) && Math.abs(velocity.x) > 0.08 ? velocity.x : sideSign * 0.72;
  var rawY = Number.isFinite(velocity.y) && Math.abs(velocity.y) > 0.04 ? velocity.y : contact.normal?.y || 0.08;
  var length = Math.hypot(rawX, rawY) || 1;
  var direction = {
    x: rawX / length,
    y: rawY / length,
  };
  var strength = clamp01((Number.isFinite(contact.strength) ? contact.strength : contact.type === "catch" ? 14 : 20) / 30);

  return Array.from({ length: count }, (_, index) => {
    var t = count <= 1 ? 0 : index / (count - 1);
    var offset = tuning.saveAfterimageSpacing * (index + 0.35) * (0.82 + strength * 0.36);
    var opacity = tuning.saveAfterimageMaxOpacity * (0.92 - t * 0.58) * (0.78 + strength * 0.22);

    return {
      marker: "feedback-save-afterimage",
      position: {
        x: point.x - direction.x * offset,
        y: point.y - direction.y * offset * 0.42 + t * 0.012,
        z: point.z - index * 0.014,
      },
      scale: {
        x: 0.12 + strength * 0.045 + t * 0.018,
        y: 0.42 + strength * 0.12 - t * 0.04,
      },
      opacity,
      life: Math.max(0.42, 0.72 - index * 0.08),
      rotation: Math.atan2(direction.y, direction.x) - Math.PI / 2,
    };
  });
}

export function getSaveContactPressurePlan(contact, gloves, tuning = SCENE_TUNING.feedback) {
  var system = tuning.saveContactPressureSystem || "glove-ball-contact-pressure-kit";
  if (!contact || (contact.type !== "glove" && contact.type !== "catch")) return { system, arcs: [] };

  var point = contact.point || gloves?.center || { x: 0, y: 1.2, z: 3.15 };
  var normal = contact.normal || { x: contact.side === "left" ? -0.54 : 0.54, y: 0.06, z: -0.72 };
  var velocity = gloves?.velocity || {};
  var strength = clamp01((Number.isFinite(contact.strength) ? contact.strength : contact.type === "catch" ? 14 : 22) / 30);
  var sideSign = contact.side === "left" ? -1 : contact.side === "right" ? 1 : Math.sign(point.x || normal.x || 1);
  var sweep = Math.atan2(
    Number.isFinite(velocity.y) && Math.abs(velocity.y) > 0.04 ? velocity.y : normal.y || 0.08,
    Number.isFinite(velocity.x) && Math.abs(velocity.x) > 0.08 ? velocity.x : normal.x || sideSign * 0.4,
  );
  var count = tuning.savePressureArcCount || 0;

  return {
    system,
    arcs: Array.from({ length: count }, (_, index) => {
      var t = count <= 1 ? 0 : index / (count - 1);
      var sideOffset = (index - (count - 1) / 2) * 0.034;
      var scaleX = 0.22 + strength * 0.1 + index * 0.025;
      return {
        marker: "feedback-save-pressure-arc",
        position: {
          x: point.x + sideOffset * sideSign,
          y: point.y + (t - 0.5) * 0.035,
          z: point.z - 0.018 - index * 0.006,
        },
        scale: {
          x: scaleX,
          y: 0.075 + strength * 0.035 + index * 0.006,
        },
        rotation: sweep + sideSign * (index - 1) * 0.32,
        opacity: tuning.savePressureMaxOpacity * (0.74 + strength * 0.26) * (1 - index * 0.13),
        life: Math.max(0.38, 0.66 - index * 0.07),
      };
    }),
  };
}

export function getSaveContactShockwavePlan(contact, gloves, tuning = SCENE_TUNING.feedback) {
  var system = tuning.saveContactShockwaveSystem || "close-contact-glove-ball-shockwave";
  if (!contact || (contact.type !== "glove" && contact.type !== "catch")) return { system, rings: [] };

  var count = tuning.saveContactShockwaveCount || 0;
  if (count <= 0) return { system, rings: [] };

  var point = contact.point || gloves?.center || { x: 0, y: 1.2, z: 3.15 };
  var normal = contact.normal || { x: contact.side === "left" ? -0.48 : 0.48, y: 0.06, z: -0.74 };
  var velocity = gloves?.velocity || {};
  var sideSign = contact.side === "left" ? -1 : contact.side === "right" ? 1 : Math.sign(point.x || normal.x || 1);
  var strength = clamp01((Number.isFinite(contact.strength) ? contact.strength : contact.type === "catch" ? 14 : 22) / 30);
  var pushX = Number.isFinite(velocity.x) && Math.abs(velocity.x) > 0.08 ? velocity.x * 0.01 : (normal.x || sideSign) * 0.018;
  var pushY = Number.isFinite(velocity.y) && Math.abs(velocity.y) > 0.04 ? velocity.y * 0.012 : (normal.y || 0.06) * 0.04;
  var sweep = Math.atan2(
    Number.isFinite(velocity.y) && Math.abs(velocity.y) > 0.04 ? velocity.y : normal.y || 0.06,
    Number.isFinite(velocity.x) && Math.abs(velocity.x) > 0.08 ? velocity.x : normal.x || sideSign * 0.42,
  );
  var maxRadius = tuning.saveContactShockwaveMaxRadius || 0.42;

  return {
    system,
    rings: Array.from({ length: count }, (_, index) => {
      var t = count <= 1 ? 0 : index / (count - 1);
      var radius = Math.min(maxRadius, 0.2 + strength * 0.07 + index * 0.07);
      return {
        marker: "feedback-save-contact-shockwave",
        position: {
          x: point.x + pushX * (index + 0.45),
          y: point.y + pushY * (index + 0.45),
          z: point.z - 0.026 - index * 0.008,
        },
        scale: {
          x: radius,
          y: 0.06 + strength * 0.026 + t * 0.018,
        },
        rotation: sweep + sideSign * (0.18 + index * 0.12),
        opacity: tuning.saveContactShockwaveMaxOpacity * (0.96 - t * 0.38) * (0.7 + strength * 0.3),
        life: Math.max(0.32, 0.62 - index * 0.075),
      };
    }),
  };
}

export function createNetPocketState() {
  return {
    life: 0,
    strength: 0,
    panel: null,
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
  state.panel = contact.panel || contact.point?.panel || "rear";
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
    state.panel = null;
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
    system: tuning.netSurfaceDeformationSystem,
    panel: state.panel || "rear",
    point: state.point,
    radius,
    depth,
    life,
    rippleAmplitude: tuning.netPocketRippleAmplitude * life * strength,
    rippleWidth: tuning.netPocketRippleWidth,
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

export function getNetCordTensionFeedbackPlan(state, tuning = SCENE_TUNING.feedback) {
  if (!state?.point || (state.life || 0) <= 0) return null;
  var life = clamp01(state.life);
  var strength = clamp01(state.strength || 0.72);
  var count = Math.max(0, Math.floor(tuning.netCordTensionCount || 0));
  var radius = Math.max(0.28, (tuning.netRippleContactRadius || 0.62) * (0.82 + strength * 0.28));
  var travel = (tuning.netCordTensionTravel || 0.055) * life * (0.72 + strength * 0.28);
  var shimmer = 0.74 + Math.sin((1 - life) * Math.PI) * 0.26;
  var point = {
    x: Math.max(-RAPIER_GOAL.halfWidth + 0.18, Math.min(RAPIER_GOAL.halfWidth - 0.18, state.point.x || 0)),
    y: Math.max(0.18, Math.min(RAPIER_GOAL.height - 0.12, state.point.y || 1.2)),
    z: state.point.z || RAPIER_GOAL.netPlaneZ,
  };

  return {
    marker: "feedback-net-cord-tension-shimmer",
    system: tuning.netCordTensionAssetSystem || "localized-net-cord-tension-shimmer",
    point,
    radius,
    life,
    strength,
    segments: Array.from({ length: count }, (_, index) => {
      var horizontal = index % 2 === 0;
      var pairIndex = Math.floor(index / 2);
      var pairCount = Math.max(1, Math.ceil(count / 2));
      var t = pairCount <= 1 ? 0.5 : pairIndex / (pairCount - 1);
      var offset = (t - 0.5) * radius * 1.12;
      var wave = Math.sin((1 - life) * Math.PI * 2.4 + index * 0.72);
      var falloff = 1 - Math.min(0.82, Math.abs(offset) / Math.max(0.001, radius));
      var length = radius * (0.72 + falloff * 0.56) * (horizontal ? 1 : 0.82);
      var opacity = (tuning.netCordTensionMaxOpacity || 0.34) * life * shimmer * (0.56 + falloff * 0.44);
      return {
        marker: "feedback-net-cord-tension-segment",
        orientation: horizontal ? "horizontal" : "vertical",
        position: {
          x: horizontal ? point.x + wave * travel * 0.28 : point.x + offset,
          y: horizontal ? point.y + offset : point.y + wave * travel * 0.24,
          z: point.z + 0.16 + travel * (0.8 + falloff * 0.72),
        },
        scale: {
          x: length,
          y: 0.018 + strength * 0.006,
        },
        rotation: horizontal ? wave * 0.045 : Math.PI / 2 + wave * 0.045,
        opacity,
        life: Math.max(0.28, life - index * 0.018),
      };
    }),
  };
}

export function createNetRecoilState() {
  return {
    active: false,
    displacement: 0,
    velocity: 0,
    strength: 0,
    point: null,
  };
}

export function triggerNetRecoilState(state, contact, tuning = SCENE_TUNING.feedback) {
  if (!state || !contact) return state;
  var strength = clamp01(Number.isFinite(contact.strength) ? contact.strength : 0.78);
  var point = contact.point || contact;
  state.active = true;
  state.strength = Math.max(state.strength || 0, strength);
  state.point = {
    x: Math.max(-RAPIER_GOAL.halfWidth + 0.16, Math.min(RAPIER_GOAL.halfWidth - 0.16, point.x || 0)),
    y: Math.max(0.16, Math.min(RAPIER_GOAL.height - 0.08, point.y || 1.2)),
    z: point.z || RAPIER_GOAL.netPlaneZ,
  };
  state.displacement = Math.max(
    state.displacement || 0,
    tuning.netRecoilMaxTravel * (0.58 + strength * 0.42),
  );
  state.velocity = Math.max(state.velocity || 0, tuning.netRecoilMaxTravel * (0.9 + strength * 0.56));
  return state;
}

export function advanceNetRecoilState(state, dt, tuning = SCENE_TUNING.feedback) {
  if (!state) return state;
  var remaining = Math.max(0, Math.min(dt || 0, 0.25));
  var step = 1 / 60;
  while (remaining > 0) {
    var h = Math.min(step, remaining);
    var acceleration = -(state.displacement || 0) * tuning.netRecoilStiffness;
    state.velocity = ((state.velocity || 0) + acceleration * h) * Math.pow(tuning.netRecoilDamping, h * 60);
    state.displacement = (state.displacement || 0) + state.velocity * h;
    remaining -= h;
  }

  var threshold = tuning.netRecoilSettleThreshold || 0.006;
  if (Math.abs(state.displacement || 0) < threshold && Math.abs(state.velocity || 0) < threshold * 8) {
    state.active = false;
    state.displacement = 0;
    state.velocity = 0;
    state.strength = 0;
  } else {
    state.active = true;
  }
  return state;
}

export function getNetRecoilMotionPlan(state, tuning = SCENE_TUNING.feedback) {
  var displacement = clampNumber(
    state?.displacement || 0,
    -tuning.netRecoilMaxTravel * 0.48,
    tuning.netRecoilMaxTravel,
  );
  var detailPulse = clamp01(Math.abs(displacement) / Math.max(0.001, tuning.netRecoilMaxTravel));
  return {
    marker: "feedback-net-spring-rebound",
    system: tuning.netRecoilSystem,
    active: Boolean(state?.active && (Math.abs(displacement) > 0 || Math.abs(state.velocity || 0) > 0)),
    point: state?.point || { x: 0, y: RAPIER_GOAL.height * 0.5, z: RAPIER_GOAL.netPlaneZ },
    netZOffset: displacement,
    detailPulse,
    opacityBoost: tuning.dynamicNetDetailOpacityBoost * detailPulse,
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

export function getMatchFeedbackProfile(event = {}, tuning = SCENE_TUNING.feedback) {
  var type = event.type || event.contact?.type || "save";
  var contact = event.contact || {};
  var state = event.state || {};
  var contactStrength = Number.isFinite(contact.strength) ? contact.strength : null;

  if (type === "save" || type === "glove" || type === "catch") {
    var isCatch = contact.type === "catch" || type === "catch";
    var baseStrength = isCatch ? tuning.catchSaveStrength : tuning.parrySaveStrength;
    var scaledContact = contactStrength === null ? baseStrength : clampNumber(contactStrength / 36, 0.42, 1.02);
    var impactStrength = clampNumber(Math.max(baseStrength, scaledContact), 0.58, 1.06);
    return {
      kind: isCatch ? "catch-save" : "parry-save",
      flashColor: tuning.saveFlashColor,
      impactStrength,
      cameraShake: tuning.maxCameraShake * impactStrength * 0.68,
      netPocketStrength: 0,
      netPulse: 0,
    };
  }

  if (type === "goal" || type === "net") {
    var isDanger = Boolean(event.danger) || (state.conceded || 0) >= MAX_CONCEDED - 1;
    var baseGoalStrength = isDanger ? tuning.dangerGoalImpactStrength : tuning.goalImpactStrength;
    var goalContactStrength = contactStrength === null ? 0.78 : clampNumber(contactStrength, 0.58, 1.08);
    var impactStrengthForGoal = clampNumber(baseGoalStrength * (0.9 + goalContactStrength * 0.16), 0.82, 1.24);
    return {
      kind: isDanger ? "danger-goal" : "goal",
      flashColor: isDanger ? tuning.dangerGoalFlashColor : tuning.goalFlashColor,
      impactStrength: impactStrengthForGoal,
      cameraShake: tuning.maxCameraShake * impactStrengthForGoal * (isDanger ? 1 : 0.86),
      netPocketStrength: clampNumber(goalContactStrength + (isDanger ? 0.18 : 0), 0.72, 1.12),
      netPulse: clampNumber(0.82 + goalContactStrength * 0.16 + (isDanger ? 0.12 : 0), 0.82, 1.12),
    };
  }

  if (type === "frame") {
    var frameStrength = clampNumber(contactStrength ?? tuning.frameImpactStrength, 0.45, tuning.frameImpactStrength);
    return {
      kind: "frame-rebound",
      flashColor: tuning.frameFlashColor,
      impactStrength: frameStrength,
      cameraShake: tuning.maxCameraShake * frameStrength,
      netPocketStrength: 0,
      netPulse: 0,
    };
  }

  return {
    kind: "ambient",
    flashColor: tuning.saveFlashColor,
    impactStrength: tuning.saveImpactStrength,
    cameraShake: tuning.maxCameraShake * 0.42,
    netPocketStrength: 0,
    netPulse: 0,
  };
}

export function getBroadcastEventPresentationPlan(event = {}, plan = {}) {
  var type = event.type || event.contact?.type || "ambient";
  var tier = plan.priority === "critical" ? "critical" : plan.priority === "high" ? "highlight" : plan.priority === "core" ? "core" : "ambient";
  var intensity = clamp01(plan.effectIntensity || 0);
  var base = {
    system: "broadcast-event-feedback-presentation",
    tier,
    cameraShakeMode: "none",
    screenWashOpacity: 0,
    hudBurst: null,
    slowMoMs: 0,
  };

  if (type === "save" || type === "glove" || type === "catch") {
    var streak = (event.state?.streak || 0) >= 3;
    return {
      ...base,
      tier: streak ? "highlight" : "core",
      cameraShakeMode: "micro",
      screenWashOpacity: streak ? Math.min(0.06, 0.032 + intensity * 0.025) : Math.min(0.032, 0.012 + intensity * 0.02),
      hudBurst: streak ? "streak-ribbon" : "save-chip",
      slowMoMs: streak ? 60 : 0,
    };
  }

  if (type === "goal" || type === "net") {
    var danger = plan.priority === "critical" || plan.kind === "danger-goal";
    return {
      ...base,
      tier: danger ? "critical" : "highlight",
      cameraShakeMode: danger ? "recoil" : "push",
      screenWashOpacity: danger ? Math.min(0.09, 0.065 + intensity * 0.022) : Math.min(0.07, 0.04 + intensity * 0.022),
      hudBurst: danger ? "danger-loss-ribbon" : "goal-chip",
      slowMoMs: danger ? 90 : 70,
    };
  }

  if (type === "frame") {
    return {
      ...base,
      tier: "core",
      cameraShakeMode: "micro",
      screenWashOpacity: Math.min(0.065, 0.025 + intensity * 0.03),
      hudBurst: "frame-chip",
      slowMoMs: 40,
    };
  }

  if (type === "ground" || type === "court") {
    return {
      ...base,
      tier: "ambient",
      cameraShakeMode: "none",
      screenWashOpacity: 0,
      hudBurst: null,
      slowMoMs: 0,
    };
  }

  return base;
}

function getEmptyCameraPresentationPlan(tuning = SCENE_TUNING.presentation) {
  return {
    system: tuning.system,
    technique: tuning.technique,
    active: false,
    tier: "ambient",
    cameraShakeMode: "none",
    color: SCENE_TUNING.feedback.saveFlashColor,
    life: 0,
    screenWashOpacity: 0,
    vignetteOpacity: tuning.vignetteBaseOpacity,
    vignetteBoost: 0,
    focusRingOpacity: 0,
    focusRingScale: tuning.focusRingBaseScale,
  };
}

export function getCameraPresentationOverlayPlan(eventPlan = {}, tuning = SCENE_TUNING.presentation) {
  var presentation = eventPlan?.presentation || {};
  var sourceOpacity = clamp01(presentation.screenWashOpacity || 0);
  if (sourceOpacity <= 0) return getEmptyCameraPresentationPlan(tuning);

  var tier = presentation.tier || "ambient";
  var tierWeight = tier === "critical" ? 1 : tier === "highlight" ? 0.78 : tier === "core" ? 0.56 : 0;
  var screenWashOpacity = Math.min(tuning.maxScreenWashOpacity, sourceOpacity);
  var vignetteBoost = Math.min(tuning.maxVignetteBoost, screenWashOpacity * 0.45 + tierWeight * 0.018);
  var focusRingOpacity = Math.min(tuning.focusRingMaxOpacity, screenWashOpacity * 0.58 + tierWeight * 0.036);

  return {
    system: tuning.system,
    technique: tuning.technique,
    active: true,
    tier,
    cameraShakeMode: presentation.cameraShakeMode || "none",
    color: eventPlan.flashColor || SCENE_TUNING.feedback.saveFlashColor,
    life: 1,
    screenWashOpacity,
    vignetteOpacity: tuning.vignetteBaseOpacity + vignetteBoost,
    vignetteBoost,
    focusRingOpacity,
    focusRingScale: tuning.focusRingBaseScale + tierWeight * 0.08,
  };
}

export function createCameraPresentationState() {
  return {
    life: 0,
    tier: "ambient",
    cameraShakeMode: "none",
    color: SCENE_TUNING.feedback.saveFlashColor,
    screenWashOpacity: 0,
    vignetteBoost: 0,
    focusRingOpacity: 0,
    focusRingScale: SCENE_TUNING.presentation.focusRingBaseScale,
  };
}

export function triggerCameraPresentationState(state, eventPlan, tuning = SCENE_TUNING.presentation) {
  if (!state) return state;
  var plan = getCameraPresentationOverlayPlan(eventPlan, tuning);
  if (!plan.active) return state;

  state.life = 1;
  state.tier = plan.tier;
  state.cameraShakeMode = plan.cameraShakeMode;
  state.color = plan.color;
  state.screenWashOpacity = Math.max(state.screenWashOpacity || 0, plan.screenWashOpacity);
  state.vignetteBoost = Math.max(state.vignetteBoost || 0, plan.vignetteBoost);
  state.focusRingOpacity = Math.max(state.focusRingOpacity || 0, plan.focusRingOpacity);
  state.focusRingScale = Math.max(state.focusRingScale || tuning.focusRingBaseScale, plan.focusRingScale);
  return state;
}

export function advanceCameraPresentationState(state, tuning = SCENE_TUNING.presentation) {
  if (!state) return state;
  state.life = Math.max(0, (state.life || 0) - tuning.decay);
  if (state.life <= 0) {
    state.tier = "ambient";
    state.cameraShakeMode = "none";
    state.screenWashOpacity = 0;
    state.vignetteBoost = 0;
    state.focusRingOpacity = 0;
    state.focusRingScale = tuning.focusRingBaseScale;
  }
  return state;
}

export function getCameraPresentationStatePlan(state, tuning = SCENE_TUNING.presentation) {
  if (!state || (state.life || 0) <= 0) return getEmptyCameraPresentationPlan(tuning);
  var life = clamp01(state.life);
  var eased = life * life * (3 - 2 * life);
  return {
    system: tuning.system,
    technique: tuning.technique,
    active: life > 0,
    tier: state.tier || "ambient",
    cameraShakeMode: state.cameraShakeMode || "none",
    color: state.color || SCENE_TUNING.feedback.saveFlashColor,
    life,
    screenWashOpacity: Math.min(tuning.maxScreenWashOpacity, (state.screenWashOpacity || 0) * eased),
    vignetteOpacity: tuning.vignetteBaseOpacity + Math.min(tuning.maxVignetteBoost, (state.vignetteBoost || 0) * eased),
    vignetteBoost: Math.min(tuning.maxVignetteBoost, (state.vignetteBoost || 0) * eased),
    focusRingOpacity: Math.min(tuning.focusRingMaxOpacity, (state.focusRingOpacity || 0) * eased),
    focusRingScale: (state.focusRingScale || tuning.focusRingBaseScale) + (1 - life) * 0.08,
  };
}

export function createCameraImpulseState() {
  return {
    system: "event-weighted-camera-impulse",
    life: 0,
    amount: 0,
    mode: "none",
    phase: 0,
  };
}

export function triggerCameraImpulseState(state, eventPlan = {}, tuning = SCENE_TUNING.feedback) {
  if (!state) return state;
  var mode = eventPlan?.presentation?.cameraShakeMode || "none";
  var requestedAmount = Number.isFinite(eventPlan?.cameraShake) ? eventPlan.cameraShake : 0;
  if (mode === "none" || requestedAmount <= 0) return state;

  var maxShake = tuning.maxCameraShake || 0.045;
  var modeCeiling = mode === "recoil" ? maxShake * 1.24 : mode === "push" ? maxShake * 1.08 : maxShake;
  state.system = "event-weighted-camera-impulse";
  state.life = 1;
  state.mode = mode;
  state.amount = Math.max(state.amount || 0, Math.min(modeCeiling, requestedAmount));
  state.phase = ((state.phase || 0) + 0.73) % (Math.PI * 2);
  return state;
}

export function advanceCameraImpulseState(state, tuning = SCENE_TUNING.feedback) {
  if (!state) return state;
  var maxShake = Math.max(0.001, tuning.maxCameraShake || 0.045);
  var decay = Math.max(0.045, (tuning.cameraShakeFalloff || 0.0048) / maxShake);
  state.life = Math.max(0, (state.life || 0) - decay);
  if (state.life <= 0) {
    state.amount = 0;
    state.mode = "none";
  }
  return state;
}

export function getCameraImpulseOffsetPlan(state, frame = 0, tuning = SCENE_TUNING.feedback) {
  var system = "event-weighted-camera-impulse";
  var life = clamp01(state?.life || 0);
  var mode = state?.mode || "none";
  if (life <= 0 || mode === "none" || (state?.amount || 0) <= 0) {
    return {
      system,
      active: false,
      mode: "none",
      life: 0,
      amount: 0,
      offset: { x: 0, y: 0, z: 0 },
      roll: 0,
    };
  }

  var maxShake = tuning.maxCameraShake || 0.045;
  var amount = Math.min(maxShake * 1.24, (state.amount || 0) * life * life * (3 - 2 * life));
  var phase = state.phase || 0;
  var xWave = Math.sin(frame * 1.7 + phase);
  var yWave = Math.cos(frame * 1.13 + phase * 0.7);
  var zWave = Math.sin(frame * 0.92 + phase * 1.3);
  var rollWave = Math.sin(frame * 1.29 + phase * 0.5);
  var offset = { x: 0, y: 0, z: 0 };
  var roll = 0;

  if (mode === "micro") {
    offset.x = xWave * amount;
    offset.y = yWave * amount * 0.62;
    offset.z = zWave * amount * 0.12;
    roll = rollWave * amount * 0.1;
  } else if (mode === "push") {
    offset.x = xWave * amount * 0.34;
    offset.y = yWave * amount * 0.18;
    offset.z = amount * 0.48 + zWave * amount * 0.08;
    roll = rollWave * amount * 0.13;
  } else if (mode === "recoil") {
    offset.x = xWave * amount * 0.5;
    offset.y = yWave * amount * 0.28;
    offset.z = amount * 0.82 + Math.abs(zWave) * amount * 0.12;
    roll = rollWave * amount * 0.24;
  }

  return {
    system,
    active: true,
    mode,
    life,
    amount,
    offset,
    roll,
  };
}

export function getEventBloomPlan(eventPlan = {}, tuning = SCENE_TUNING.postprocessing) {
  eventPlan = eventPlan || {};
  var baseStrength = tuning.baseStrength || 0;
  var priority = eventPlan.priority || "ambient";
  var isAmbient = priority === "ambient" || !eventPlan.kind || eventPlan.kind === "ambient" || eventPlan.kind === "ground-skid";
  if (isAmbient) {
    return {
      system: tuning.system,
      active: false,
      strength: baseStrength,
      radius: tuning.baseRadius,
      threshold: tuning.threshold,
      life: 0,
      tier: "ambient",
    };
  }

  var tier = eventPlan.presentation?.tier || (priority === "critical" ? "critical" : priority === "high" ? "highlight" : "core");
  if (tier === "core") {
    return {
      system: tuning.system,
      active: false,
      strength: baseStrength,
      radius: tuning.baseRadius,
      threshold: tuning.threshold,
      life: 0,
      tier,
    };
  }
  var tierWeight = tier === "critical" ? 1 : tier === "highlight" ? 0.78 : 0.56;
  var intensity = clamp01(eventPlan.effectIntensity || eventPlan.profile?.impactStrength || 0);
  var kindBoost = eventPlan.kind === "danger-goal" ? 0.12 : eventPlan.kind === "streak-save" ? 0.08 : eventPlan.kind === "goal" ? 0.06 : 0;
  var eventMix = clamp01(tierWeight * 0.48 + intensity * 0.46 + kindBoost);
  var strength = Math.min(tuning.maxStrength, baseStrength + (tuning.maxStrength - baseStrength) * eventMix);
  var radius = Math.min(tuning.maxRadius, tuning.baseRadius + (tuning.maxRadius - tuning.baseRadius) * (0.42 + eventMix * 0.58));

  return {
    system: tuning.system,
    active: true,
    strength,
    radius,
    threshold: tuning.threshold,
    life: 1,
    tier,
  };
}

export function createPostprocessingBloomState(tuning = SCENE_TUNING.postprocessing) {
  return {
    life: 0,
    strength: tuning.baseStrength,
    radius: tuning.baseRadius,
    threshold: tuning.threshold,
    tier: "ambient",
  };
}

export function triggerPostprocessingBloomState(state, eventPlan, tuning = SCENE_TUNING.postprocessing) {
  if (!state || !tuning?.enabled) return state;
  var plan = eventPlan?.system === tuning.system ? eventPlan : getEventBloomPlan(eventPlan || {}, tuning);
  if (!plan.active) return state;

  state.life = 1;
  state.strength = Math.max(state.strength || tuning.baseStrength, plan.strength);
  state.radius = Math.max(state.radius || tuning.baseRadius, plan.radius);
  state.threshold = plan.threshold;
  state.tier = plan.tier;
  return state;
}

export function advancePostprocessingBloomState(state, tuning = SCENE_TUNING.postprocessing) {
  if (!state) return state;
  state.life = Math.max(0, (state.life || 0) - tuning.eventDecay);
  if (state.life <= 0) {
    state.strength = tuning.baseStrength;
    state.radius = tuning.baseRadius;
    state.threshold = tuning.threshold;
    state.tier = "ambient";
  }
  return state;
}

export function getPostprocessingBloomStatePlan(state, tuning = SCENE_TUNING.postprocessing) {
  if (!state || (state.life || 0) <= 0) {
    return {
      system: tuning.system,
      active: false,
      strength: tuning.baseStrength,
      radius: tuning.baseRadius,
      threshold: tuning.threshold,
      tier: "ambient",
    };
  }
  var life = clamp01(state.life);
  var eased = life * life * (3 - 2 * life);
  return {
    system: tuning.system,
    active: true,
    strength: lerpNumber(tuning.baseStrength, state.strength || tuning.baseStrength, eased),
    radius: lerpNumber(tuning.baseRadius, state.radius || tuning.baseRadius, eased),
    threshold: state.threshold || tuning.threshold,
    tier: state.tier || "core",
  };
}

function createPostprocessingPipeline(renderer, scene, camera, tuning = SCENE_TUNING.postprocessing) {
  if (!tuning.enabled) return null;

  var composer = new EffectComposer(renderer);
  var renderPass = new RenderPass(scene, camera);
  var bloomPass = new UnrealBloomPass(
    new THREE.Vector2(1, 1),
    tuning.baseStrength,
    tuning.baseRadius,
    tuning.threshold,
  );
  var outputPass = new OutputPass();

  composer.addPass(renderPass);
  composer.addPass(bloomPass);
  composer.addPass(outputPass);

  return {
    system: tuning.system,
    technique: tuning.technique,
    composer,
    renderPass,
    bloomPass,
    outputPass,
    resize(width, height, pixelRatio) {
      composer.setPixelRatio(Math.min(Math.max(1, pixelRatio || 1), tuning.pixelRatioCap));
      composer.setSize(width, height);
    },
    apply(plan) {
      bloomPass.strength = plan.strength;
      bloomPass.radius = plan.radius;
      bloomPass.threshold = plan.threshold;
    },
    render() {
      composer.render();
    },
    dispose() {
      composer.dispose();
    },
  };
}

export function getMatchEventFeedbackPlan(event = {}, tuning = SCENE_TUNING.feedback) {
  var system = tuning.eventOrchestratorSystem || "keeper-event-feedback-orchestrator";
  var type = event.type || event.contact?.type || "ambient";
  var state = event.state || {};
  var profile = getMatchFeedbackProfile(event, tuning);
  var defaultRingCount = Math.max(3, Math.min(tuning.impactRingCount || 3, 4));

  if (type === "save" || type === "glove" || type === "catch") {
    var streak = state.streak || 0;
    var isStreak = streak >= 3;
    var impactStrength = clampNumber(profile.impactStrength || tuning.saveImpactStrength, 0.58, 1.12);
    var savePlan = {
      system,
      kind: profile.kind,
      profile,
      priority: isStreak ? "high" : "core",
      hudTone: isStreak ? "streak" : "save",
      audioEvent: isStreak ? "save-streak" : "clean-save",
      visualEffects: [
        "feedback-impact-ring",
        "feedback-save-spark",
        "feedback-save-contact-shockwave",
        "feedback-save-pressure-arc",
        "feedback-save-afterimage",
        ...(isStreak ? ["feedback-streak-pulse"] : []),
      ],
      flashColor: profile.flashColor,
      effectIntensity: impactStrength * (isStreak ? 1.08 : 1),
      cameraShake: Math.min(tuning.maxCameraShake * 0.86, (profile.cameraShake || 0) * (isStreak ? 1.14 : 1)),
      ringCount: Math.min(tuning.impactRingCount || defaultRingCount, isStreak ? 4 : 3),
      durationMs: isStreak ? 760 : 620,
      net: {
        recoilStrength: 0,
        pocketStrength: 0,
        pulse: 0,
      },
    };
    savePlan.presentation = getBroadcastEventPresentationPlan(event, savePlan);
    return savePlan;
  }

  if (type === "goal" || type === "net") {
    var isDanger = profile.kind === "danger-goal";
    var goalIntensity = clampNumber(profile.impactStrength || tuning.goalImpactStrength, 0.82, 1.24);
    var goalPlan = {
      system,
      kind: profile.kind,
      profile,
      priority: isDanger ? "critical" : "high",
      hudTone: isDanger ? "danger" : "goal",
      audioEvent: isDanger ? "danger-goal" : "goal-net",
      visualEffects: ["feedback-goal-state-awaiting-physical-net-contact"],
      flashColor: profile.flashColor,
      effectIntensity: goalIntensity,
      cameraShake: Math.min(tuning.maxCameraShake * 1.24, profile.cameraShake || tuning.maxCameraShake * goalIntensity),
      ringCount: 0,
      durationMs: isDanger ? 900 : 780,
      net: {
        recoilStrength: clampNumber(profile.netPulse || 0, 0.78, isDanger ? 1.14 : 1.02),
        pocketStrength: clampNumber(profile.netPocketStrength || 0, 0.72, isDanger ? 1.14 : 1.04),
        pulse: clampNumber(profile.netPulse || 0, 0.82, isDanger ? 1.14 : 1.04),
      },
    };
    goalPlan.presentation = getBroadcastEventPresentationPlan(event, goalPlan);
    return goalPlan;
  }

  if (type === "frame") {
    var frameIntensity = clampNumber(profile.impactStrength || tuning.frameImpactStrength, 0.42, 0.86);
    var framePlan = {
      system,
      kind: profile.kind,
      profile,
      priority: "core",
      hudTone: "frame",
      audioEvent: "frame-rattle",
      visualEffects: [
        "feedback-impact-ring",
        "feedback-frame-rebound-highlight",
      ],
      flashColor: profile.flashColor,
      effectIntensity: frameIntensity,
      cameraShake: Math.min(tuning.maxCameraShake * 0.82, profile.cameraShake || tuning.maxCameraShake * frameIntensity),
      ringCount: Math.min(tuning.impactRingCount || defaultRingCount, 3),
      durationMs: 620,
      net: {
        recoilStrength: 0,
        pocketStrength: 0,
        pulse: 0,
      },
    };
    framePlan.presentation = getBroadcastEventPresentationPlan(event, framePlan);
    return framePlan;
  }

  if (type === "ground" || type === "court") {
    var feedback = event.groundFeedback || {};
    var intensity = clamp01(Math.max(feedback.intensity || 0, (feedback.speed || 0) / 10));
    var groundPlan = {
      system,
      kind: "ground-skid",
      profile,
      priority: "ambient",
      hudTone: "ambient",
      audioEvent: intensity >= 0.18 && feedback.active ? "court-skid" : null,
      visualEffects: [
        "feedback-ground-skid",
        "feedback-court-dust-fleck",
      ],
      flashColor: tuning.groundSkidColor,
      effectIntensity: intensity,
      cameraShake: 0,
      ringCount: 0,
      durationMs: 520,
      net: {
        recoilStrength: 0,
        pocketStrength: 0,
        pulse: 0,
      },
    };
    groundPlan.presentation = getBroadcastEventPresentationPlan(event, groundPlan);
    return groundPlan;
  }

  var ambientPlan = {
    system,
    kind: "ambient",
    profile,
    priority: "ambient",
    hudTone: "ambient",
    audioEvent: null,
    visualEffects: [],
    flashColor: profile.flashColor,
    effectIntensity: profile.impactStrength || tuning.saveImpactStrength,
    cameraShake: profile.cameraShake || 0,
    ringCount: 0,
    durationMs: 420,
    net: {
      recoilStrength: 0,
      pocketStrength: 0,
      pulse: 0,
    },
  };
  ambientPlan.presentation = getBroadcastEventPresentationPlan(event, ambientPlan);
  return ambientPlan;
}

export function getDynamicNetDetailMotionPlan(detail, pulse, contactPoint, tuning = SCENE_TUNING.feedback) {
  var base = detail?.basePosition || detail?.object?.position || { x: 0, y: 0, z: 0 };
  var life = clamp01(pulse || 0);
  var contact = contactPoint || { x: 0, y: RAPIER_GOAL.height * 0.5, z: RAPIER_GOAL.netPlaneZ };
  var motionScale = Number.isFinite(detail?.motionScale) ? detail.motionScale : detail?.object?.userData?.dynamicNetMotionScale || 1;
  var dx = (base.x || 0) - (contact.x || 0);
  var dy = (base.y || 0) - (contact.y || 0);
  var distance = Math.hypot(dx, dy);
  var falloff = Math.max(0.22, 1 - distance / (RAPIER_GOAL.halfWidth * 1.08));
  var wave = life > 0 ? Math.sin(life * Math.PI) : 0;
  var recoil = tuning.dynamicNetDetailMaxTravel * wave * falloff * motionScale;
  var lateral = wave * falloff * 0.024 * motionScale;
  var lift = wave * falloff * 0.018 * motionScale;
  var anchoredPanel = Boolean(detail?.anchoredPanel || detail?.object?.userData?.anchoredPanel);

  return {
    marker: "feedback-dynamic-net-detail-recoil",
    name: detail?.name || detail?.object?.name || "",
    anchoredPanel,
    position: {
      x: (base.x || 0) + (anchoredPanel ? 0 : (dx >= 0 ? lateral : -lateral)),
      y: (base.y || 0) + (anchoredPanel ? 0 : (dy >= 0 ? lift : -lift * 0.5)),
      z: (base.z || 0) + (anchoredPanel ? 0 : recoil),
    },
    opacityBoost: tuning.dynamicNetDetailOpacityBoost * life * falloff * (detail?.opacityScale ?? 1),
  };
}

export function getNetPocketVertexDepthOffset(baseX, baseY, plan) {
  var boundaryEpsilon = 0.0001;
  var onSideEdge = Math.abs(baseX) >= GOAL_NET_GEOMETRY.rearHalfWidth - boundaryEpsilon;
  var onHorizontalEdge = Math.abs(baseY) >= GOAL_NET_GEOMETRY.rearHeight * 0.5 - boundaryEpsilon;
  if (onSideEdge || onHorizontalEdge || !plan?.point) return 0;

  var radius = plan.radius || 1;
  var worldY = baseY + GOAL_NET_GEOMETRY.rearHeight * 0.5;
  var dx = baseX - plan.point.x;
  var dy = worldY - plan.point.y;
  var falloff = Math.max(0, 1 - Math.hypot(dx, dy) / radius);
  return (plan.depth || 0) * falloff * falloff;
}

function isNetPanelAnchor(panel, vertex) {
  var epsilon = 0.035;
  if (panel === "rear") {
    return (
      Math.abs(vertex.x) >= GOAL_NET_GEOMETRY.rearHalfWidth - epsilon ||
      vertex.y <= epsilon ||
      vertex.y >= GOAL_NET_GEOMETRY.rearHeight - epsilon
    );
  }

  var atFrontOrRear =
    vertex.z <= GOAL_NET_GEOMETRY.netPlaneZ + epsilon ||
    vertex.z >= GOAL_NET_GEOMETRY.netPlaneZ + GOAL_NET_GEOMETRY.cageDepth - epsilon;
  if (panel === "left" || panel === "right") {
    return atFrontOrRear || vertex.y <= epsilon || vertex.y >= getGoalRoofHeightAtZ(vertex.z) - epsilon;
  }
  if (panel === "top") {
    return atFrontOrRear || Math.abs(vertex.x) >= getGoalSideHalfWidthAtZ(vertex.z) - epsilon;
  }
  return true;
}

export function getNetPanelVertexDisplacement(panel, vertex, plan) {
  var zero = { x: 0, y: 0, z: 0 };
  if (!plan?.point || plan.panel !== panel || isNetPanelAnchor(panel, vertex)) return zero;

  var dx = (vertex.x || 0) - (plan.point.x || 0);
  var dy = (vertex.y || 0) - (plan.point.y || 0);
  var dz = (vertex.z || 0) - (plan.point.z || 0);
  var surfaceDistance = panel === "rear"
    ? Math.hypot(dx, dy)
    : panel === "top"
      ? Math.hypot(dx, dz)
      : Math.hypot(dy, dz);
  var radius = Math.max(0.16, plan.radius || 0.9);
  var coreFalloff = Math.max(0, 1 - surfaceDistance / radius);
  var life = clamp01(Number.isFinite(plan.life) ? plan.life : 1);
  var progress = 1 - life;
  var waveCenter = radius * (0.18 + progress * 1.28);
  var waveWidth = radius * (plan.rippleWidth || 0.34);
  var waveBand = Math.max(0, 1 - Math.abs(surfaceDistance - waveCenter) / Math.max(0.001, waveWidth));
  var wave = Math.sin(progress * Math.PI * 4.6) * (plan.rippleAmplitude || 0) * waveBand;
  var coreDepth = Number.isFinite(plan.springDisplacement)
    ? (plan.depth || 0) * 0.45 + plan.springDisplacement * 0.9
    : plan.depth || 0;
  var displacement = clampNumber(
    coreDepth * coreFalloff * coreFalloff + wave,
    -GOAL_NET_GEOMETRY.netSlack * 0.72,
    GOAL_NET_GEOMETRY.netSlack + 0.22,
  );

  if (panel === "rear") return { x: 0, y: 0, z: displacement };
  if (panel === "left") return { x: -displacement, y: 0, z: 0 };
  if (panel === "right") return { x: displacement, y: 0, z: 0 };
  if (panel === "top") return { x: 0, y: displacement, z: 0 };
  return zero;
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

export function createStadiumLightingRig(tuning = SCENE_TUNING.lighting) {
  var system = tuning.stadiumRigSystem || "three-spotlight-broadcast-rig";
  var group = new THREE.Group();
  group.name = "stadium-spotlight-rig";
  group.userData.lightingSystem = system;

  var lights = [];
  var targets = [];
  [
    ["left-back", -6.4, 5.25, -18.4, -1.05, 1.26, 1.55, "#fff4cc"],
    ["right-back", 6.4, 5.25, -18.4, 1.05, 1.26, 1.55, "#fff4cc"],
    ["left-mid", -6.15, 4.15, -8.2, -0.62, 1.18, 2.55, "#e7ffff"],
    ["right-mid", 6.15, 4.15, -8.2, 0.62, 1.18, 2.55, "#e7ffff"],
  ].forEach(function addSpotlight(item) {
    var target = new THREE.Object3D();
    target.name = "stadium-spotlight-target-" + item[0];
    target.position.set(item[4], item[5], item[6]);
    target.userData.lightingSystem = system;

    var light = new THREE.SpotLight(
      item[7],
      tuning.spotlightIntensity || 0.58,
      42,
      tuning.spotlightAngle || 0.62,
      tuning.spotlightPenumbra || 0.58,
      1.1,
    );
    light.name = "stadium-spotlight-" + item[0];
    light.position.set(item[1], item[2], item[3]);
    light.target = target;
    light.castShadow = false;
    light.userData.lightingSystem = system;
    light.userData.sourcePropName = "stadium-floodlight-head-" + item[0];

    lights.push(light);
    targets.push(target);
    group.add(target, light);
  });

  return {
    system,
    group,
    lights,
    targets,
  };
}

export function createSkyEnvironment(tuning = SCENE_TUNING.environment) {
  var system = tuning.system || "three-sky-atmospheric-training-ground";
  var sky = new Sky();
  sky.name = "training-ground-atmospheric-sky";
  sky.scale.setScalar(tuning.scale || 80);
  sky.frustumCulled = false;
  sky.userData.environmentSystem = system;
  sky.userData.environmentTechnique = tuning.technique;
  sky.userData.addonSource = tuning.addonSource || SKY_ENVIRONMENT_ADDON_SOURCE;

  var sunVector = new THREE.Vector3(
    tuning.sunPosition?.x ?? -0.28,
    tuning.sunPosition?.y ?? 0.42,
    tuning.sunPosition?.z ?? -0.86,
  ).normalize();
  var uniforms = sky.material.uniforms;
  uniforms.turbidity.value = tuning.turbidity;
  uniforms.rayleigh.value = tuning.rayleigh;
  uniforms.mieCoefficient.value = tuning.mieCoefficient;
  uniforms.mieDirectionalG.value = tuning.mieDirectionalG;
  uniforms.sunPosition.value.copy(sunVector);
  if (uniforms.showSunDisc) uniforms.showSunDisc.value = tuning.showSunDisc === false ? 0 : 1;
  if (uniforms.up) uniforms.up.value.set(0, 1, 0);

  return {
    system,
    sky,
    sunVector,
  };
}

export function createGoalkeeperScene(canvas) {
  var tuning = SCENE_TUNING;
  var renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
  renderer.setClearColor(tuning.environment.fogColor, 1);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.04;
  renderer.shadowMap.enabled = true;

  var scene = new THREE.Scene();
  scene.userData.feedbackAssetSystem = tuning.feedback.assetSystem;
  scene.userData.feedbackOrchestratorSystem = tuning.feedback.eventOrchestratorSystem;
  scene.userData.netRippleAssetSystem = tuning.feedback.netRippleAssetSystem;
  scene.userData.netPocketAssetSystem = tuning.feedback.netPocketAssetSystem;
  scene.userData.netCordTensionAssetSystem = tuning.feedback.netCordTensionAssetSystem;
  scene.userData.netRecoilSystem = tuning.feedback.netRecoilSystem;
  scene.userData.frameReboundSystem = tuning.feedback.frameReboundSystem;
  scene.userData.saveAfterimageSystem = tuning.feedback.saveAfterimageSystem;
  scene.userData.dynamicNetDetailSystem = tuning.feedback.dynamicNetDetailSystem;
  scene.userData.ballShadowAssetSystem = tuning.ball.shadowAssetSystem;
  scene.userData.ballSpinGlintSystem = tuning.ball.flightSpinGlintSystem;
  scene.userData.ballSpeedRibbonSystem = tuning.ball.flightSpeedRibbonSystem;
  scene.userData.gloveImpactSystem = tuning.gloves.impactSystem;
  scene.userData.gloveContactDeformationSystem = tuning.gloves.contactDeformationSystem;
  scene.userData.presentationLayerSystem = tuning.presentation.system;
  scene.userData.presentationLayerTechnique = tuning.presentation.technique;
  scene.userData.postprocessingSystem = tuning.postprocessing.system;
  scene.userData.postprocessingTechnique = tuning.postprocessing.technique;
  var skyEnvironment = createSkyEnvironment(tuning.environment);
  scene.userData.environmentSystem = skyEnvironment.system;
  scene.userData.environmentTechnique = tuning.environment.technique;
  scene.userData.environmentAddonSource = tuning.environment.addonSource;
  scene.fog = new THREE.Fog(tuning.environment.fogColor, tuning.environment.fogNear, tuning.environment.fogFar);

  var camera = new THREE.PerspectiveCamera(tuning.camera.fov, 16 / 9, 0.05, 90);
  var cameraFraming = applyCameraTuning(camera, 16 / 9, tuning);
  var postprocessingPipeline = createPostprocessingPipeline(renderer, scene, camera, tuning.postprocessing);
  scene.add(skyEnvironment.sky, camera);

  scene.userData.lightingAssetSystem = tuning.lighting.assetSystem;
  var hemi = new THREE.HemisphereLight(
    tuning.lighting.hemisphereSkyColor || "#fff7da",
    tuning.lighting.hemisphereGroundColor || "#68737b",
    tuning.lighting.hemisphereIntensity,
  );
  var sun = new THREE.DirectionalLight("#fff4cf", tuning.lighting.sunIntensity);
  sun.position.set(-3, 7, 5);
  var rim = new THREE.DirectionalLight("#dffcff", tuning.lighting.rimIntensity);
  rim.position.set(4.8, 3.1, -8.6);
  var fill = new THREE.DirectionalLight("#fff0dd", tuning.lighting.fillIntensity);
  fill.position.set(3.4, 2.2, 4.6);
  var stadiumLighting = createStadiumLightingRig(tuning.lighting);
  scene.userData.stadiumLightingSystem = stadiumLighting.system;
  scene.add(hemi, sun, rim, fill, stadiumLighting.group);

  var presentationWash = new THREE.Mesh(
    new THREE.PlaneGeometry(1, 1),
    new THREE.MeshBasicMaterial({
      color: tuning.feedback.saveFlashColor,
      transparent: true,
      opacity: 0,
      depthTest: false,
      depthWrite: false,
    }),
  );
  presentationWash.name = "presentation-screen-wash";
  presentationWash.userData.presentationSystem = tuning.presentation.system;
  presentationWash.position.z = -tuning.presentation.overlayDistance;
  presentationWash.renderOrder = 1000;

  var presentationVignette = new THREE.Mesh(
    new THREE.RingGeometry(0.62, 1.05, 96),
    new THREE.MeshBasicMaterial({
      color: "#0b1f20",
      transparent: true,
      opacity: tuning.presentation.vignetteBaseOpacity,
      depthTest: false,
      depthWrite: false,
      side: THREE.DoubleSide,
    }),
  );
  presentationVignette.name = "presentation-vignette";
  presentationVignette.userData.presentationSystem = tuning.presentation.system;
  presentationVignette.position.z = -tuning.presentation.overlayDistance + 0.002;
  presentationVignette.renderOrder = 1001;

  var presentationFocusRing = new THREE.Mesh(
    new THREE.TorusGeometry(0.5, 0.006, 8, 72),
    new THREE.MeshBasicMaterial({
      color: tuning.feedback.saveFlashColor,
      transparent: true,
      opacity: 0,
      depthTest: false,
      depthWrite: false,
    }),
  );
  presentationFocusRing.name = "presentation-event-focus-ring";
  presentationFocusRing.userData.presentationSystem = tuning.presentation.system;
  presentationFocusRing.position.z = -tuning.presentation.overlayDistance + 0.004;
  presentationFocusRing.renderOrder = 1002;
  camera.add(presentationWash, presentationVignette, presentationFocusRing);

  var field = createFieldGroup();
  var stadiumScoreboardDisplay = field.getObjectByName("stadium-scoreboard-display");
  var goal = createGoalAndNet();
  var dynamicNetDetails = goal.dynamicNetDetails || [];
  var reactiveNetPanels = dynamicNetDetails.reduce((panels, detail) => {
    var panel = detail.object?.userData?.goalNetPanel;
    var positionAttribute = detail.object?.geometry?.attributes?.position;
    if (!panel || !positionAttribute) return panels;
    panels.push({
      panel,
      object: detail.object,
      baseObjectPosition: detail.basePosition.clone(),
      basePositions: Array.from(positionAttribute.array),
    });
    return panels;
  }, []);
  var netLayerBasePosition = goal.net.position.clone();
  var gridLayerBasePosition = goal.grid.position.clone();
  var shooter = createShooterModel();
  var ballMaterial = createFootballMaterial();
  var ballGeometry = new THREE.SphereGeometry(tuning.ball.radius, 32, 24);
  var haloGeometry = new THREE.CircleGeometry(tuning.ball.haloRadius, 32);
  var shadowGeometry = new THREE.CircleGeometry(tuning.ball.shadowRadius, 24);
  function createBallView(name) {
    var mesh = new THREE.Mesh(
      ballGeometry,
      ballMaterial.clone(),
    );
    var halo = new THREE.Mesh(
      haloGeometry,
      new THREE.MeshBasicMaterial({
        color: tuning.ball.haloColor,
        transparent: true,
        opacity: 0,
        depthWrite: false,
      }),
    );
    var shadow = new THREE.Mesh(
      shadowGeometry,
      new THREE.MeshBasicMaterial({ color: "#1b2930", transparent: true, opacity: 0.28, depthWrite: false }),
    );
    mesh.name = name + "-ball";
    halo.name = name + "-halo";
    shadow.name = name + "-shadow";
    mesh.renderOrder = tuning.ball.renderOrder;
    halo.renderOrder = tuning.ball.haloRenderOrder;
    halo.material.depthTest = false;
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
  var ballSpinGlintGeometry = new THREE.TorusGeometry(0.5, 0.012, 8, 24, Math.PI * 0.42);
  var ballSpinGlints = Array.from({ length: tuning.ball.flightSpinGlintCount }, (_, index) => {
    var glint = new THREE.Mesh(
      ballSpinGlintGeometry,
      new THREE.MeshBasicMaterial({
        color: index === 0 ? "#ffffff" : "#fff1a8",
        transparent: true,
        opacity: 0,
        depthWrite: false,
      }),
    );
    glint.name = "feedback-ball-spin-glint-" + index;
    glint.visible = false;
    return glint;
  });
  var ballSpeedRibbonGeometry = new THREE.PlaneGeometry(1, 1);
  var ballSpeedRibbons = Array.from({ length: tuning.ball.flightSpeedRibbonCount }, (_, index) => {
    var ribbon = new THREE.Mesh(
      ballSpeedRibbonGeometry,
      new THREE.MeshBasicMaterial({
        color: index === 0 ? "#61f0ff" : index === 1 ? "#fff1a8" : "#ff8b3d",
        transparent: true,
        opacity: 0,
        depthTest: false,
        depthWrite: false,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
      }),
    );
    ribbon.name = "feedback-ball-speed-ribbon-" + index;
    ribbon.renderOrder = 6;
    ribbon.visible = false;
    return ribbon;
  });
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
  var courtDustFleckGeometry = new THREE.CircleGeometry(0.038, 14);
  var courtDustFlecks = Array.from({ length: tuning.feedback.courtDustFleckCount }, (_, index) => {
    var fleck = new THREE.Mesh(
      courtDustFleckGeometry,
      new THREE.MeshBasicMaterial({
        color: index % 3 === 0 ? "#f2ead8" : index % 3 === 1 ? "#d8c8aa" : "#bfc1b5",
        transparent: true,
        opacity: 0,
        depthWrite: false,
        side: THREE.DoubleSide,
      }),
    );
    fleck.name = "feedback-court-dust-fleck-" + index;
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
  var saveAfterimageGeometry = new THREE.PlaneGeometry(0.16, 0.5);
  var saveAfterimages = Array.from({ length: tuning.feedback.saveAfterimageCount }, (_, index) => {
    var afterimage = new THREE.Mesh(
      saveAfterimageGeometry,
      new THREE.MeshBasicMaterial({
        color: index % 2 === 0 ? "#fff5bd" : "#ffffff",
        transparent: true,
        opacity: 0,
        depthWrite: false,
        side: THREE.DoubleSide,
      }),
    );
    afterimage.name = "feedback-save-afterimage-" + index;
    afterimage.userData.life = 0;
    afterimage.userData.baseOpacity = 0;
    return afterimage;
  });
  var savePressureArcGeometry = new THREE.TorusGeometry(0.5, 0.018, 8, 34, Math.PI * 1.1);
  var savePressureArcs = Array.from({ length: tuning.feedback.savePressureArcCount }, (_, index) => {
    var arc = new THREE.Mesh(
      savePressureArcGeometry,
      new THREE.MeshBasicMaterial({
        color: index === 0 ? "#fffdf0" : "#ffe89b",
        transparent: true,
        opacity: 0,
        depthWrite: false,
      }),
    );
    arc.name = "feedback-save-pressure-arc-" + index;
    arc.userData.life = 0;
    arc.userData.baseOpacity = 0;
    arc.userData.rotation = 0;
    return arc;
  });
  var saveContactShockwaveGeometry = new THREE.TorusGeometry(0.5, 0.012, 8, 40, Math.PI * 1.86);
  var saveContactShockwaves = Array.from({ length: tuning.feedback.saveContactShockwaveCount }, (_, index) => {
    var shockwave = new THREE.Mesh(
      saveContactShockwaveGeometry,
      new THREE.MeshBasicMaterial({
        color: index === 0 ? "#ffffff" : "#fff2a8",
        transparent: true,
        opacity: 0,
        depthWrite: false,
      }),
    );
    shockwave.name = "feedback-save-contact-shockwave-" + index;
    shockwave.visible = false;
    shockwave.userData.life = 0;
    shockwave.userData.baseOpacity = 0;
    shockwave.userData.rotation = 0;
    return shockwave;
  });
  var gloveContactDimple = new THREE.Mesh(
    new THREE.CircleGeometry(0.5, 34),
    new THREE.MeshBasicMaterial({
      color: "#ffb46e",
      transparent: true,
      opacity: 0,
      depthWrite: false,
      side: THREE.DoubleSide,
    }),
  );
  gloveContactDimple.name = "feedback-glove-contact-dimple";
  gloveContactDimple.visible = false;
  gloveContactDimple.userData.life = 0;
  gloveContactDimple.userData.baseOpacity = 0;
  gloveContactDimple.userData.rotation = 0;
  var gloveContactHighlight = new THREE.Mesh(
    new THREE.CircleGeometry(0.5, 34),
    new THREE.MeshBasicMaterial({
      color: "#fff8cf",
      transparent: true,
      opacity: 0,
      depthWrite: false,
      side: THREE.DoubleSide,
    }),
  );
  gloveContactHighlight.name = "feedback-glove-latex-rebound-highlight";
  gloveContactHighlight.visible = false;
  gloveContactHighlight.userData.life = 0;
  gloveContactHighlight.userData.baseOpacity = 0;
  gloveContactHighlight.userData.rotation = 0;
  var glovePalmCreaseGeometry = new THREE.TorusGeometry(0.5, 0.012, 8, 28, Math.PI * 0.62);
  var glovePalmCreases = Array.from({ length: tuning.gloves.contactCreaseCount }, (_, index) => {
    var crease = new THREE.Mesh(
      glovePalmCreaseGeometry,
      new THREE.MeshBasicMaterial({
        color: index === 0 ? "#fffdf0" : "#ffe7a2",
        transparent: true,
        opacity: 0,
        depthWrite: false,
      }),
    );
    crease.name = "feedback-glove-palm-crease-" + index;
    crease.visible = false;
    crease.userData.life = 0;
    crease.userData.baseOpacity = 0;
    crease.userData.rotation = 0;
    return crease;
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
  var netCordTensionGeometry = new THREE.PlaneGeometry(1, 1, 1, 1);
  var netCordTensionSegments = Array.from({ length: tuning.feedback.netCordTensionCount }, (_, index) => {
    var segment = new THREE.Mesh(
      netCordTensionGeometry,
      new THREE.MeshBasicMaterial({
        color: index % 2 === 0 ? "#fff8d6" : "#dff8ff",
        transparent: true,
        opacity: 0,
        depthWrite: false,
        side: THREE.DoubleSide,
      }),
    );
    segment.name = "feedback-net-cord-tension-shimmer-" + index;
    segment.userData.life = 0;
    return segment;
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
    ...ballSpinGlints,
    ...ballSpeedRibbons,
    ...lingeringBallViews.flatMap((view) => [view.halo, view.mesh, view.shadow]),
    ...groundSkids,
    ...courtDustFlecks,
    leftGlove,
    rightGlove,
    ...impactRings,
    ...saveSparks,
    ...saveAfterimages,
    ...savePressureArcs,
    ...saveContactShockwaves,
    gloveContactDimple,
    gloveContactHighlight,
    ...glovePalmCreases,
    goalFlash,
    streakFlash,
    ...netRippleLines,
    ...netPocketPatches,
    ...netCordTensionSegments,
    ...frameReboundHighlights,
    ...goalWaves,
    ...streakPulses,
  );
  var environmentAssetPipeline = createReusableEnvironmentAssetPipeline({
    renderer,
    scene,
    fieldGroup: field,
  });

  var netPulse = 0;
  var netPulseContactPoint = null;
  var lastContactSignature = "";
  var handledPhysicalNetContacts = new Set();
  var cameraImpulseState = createCameraImpulseState();
  var feedbackSignature = "";
  var feedbackFrame = 0;
  var gloveImpactState = createGloveImpactState();
  var netPocketState = createNetPocketState();
  var netRecoilState = createNetRecoilState();
  var cameraPresentationState = createCameraPresentationState();
  var postprocessingBloomState = createPostprocessingBloomState(tuning.postprocessing);
  var lastCourtContactSignature = "";
  var lastScoreboardSignature = "";

  function resizePresentationLayer() {
    var distance = tuning.presentation.overlayDistance;
    var heightAtDepth = 2 * Math.tan(THREE.MathUtils.degToRad(camera.fov * 0.5)) * distance;
    var widthAtDepth = heightAtDepth * camera.aspect;
    presentationWash.position.z = -distance;
    presentationVignette.position.z = -distance + 0.002;
    presentationFocusRing.position.z = -distance + 0.004;
    presentationWash.scale.set(widthAtDepth, heightAtDepth, 1);
    presentationVignette.scale.set(widthAtDepth * 0.98, heightAtDepth * 0.98, 1);
    presentationFocusRing.scale.setScalar(Math.min(widthAtDepth, heightAtDepth));
  }

  function resize(bounds) {
    var width = Math.max(1, Math.round(bounds.width || canvas.clientWidth || 1280));
    var height = Math.max(1, Math.round(bounds.height || canvas.clientHeight || 720));
    var pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
    renderer.setPixelRatio(pixelRatio);
    renderer.setSize(width, height, false);
    postprocessingPipeline?.resize(width, height, pixelRatio);
    camera.aspect = width / height;
    cameraFraming = applyCameraTuning(camera, camera.aspect, tuning);
    camera.updateProjectionMatrix();
    resizePresentationLayer();
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
    var haloPlan = getBallHaloAppearancePlan(ballState, position, tuning.ball);
    view.halo.material.color.set(haloPlan.color);
    view.halo.material.opacity = haloPlan.opacity;
    view.halo.visible = haloPlan.visible;

    view.shadow.position.set(position.x, 0.012, position.z);
    var heightAboveFloor = Math.max(0, position.y - (ballState?.radius || tuning.ball.radius));
    var airMix = clamp01(heightAboveFloor / tuning.ball.shadowHeightFade);
    var shadowScale = lerpNumber(tuning.ball.shadowGroundScale, tuning.ball.shadowAirScale, airMix);
    var shadowOpacity = lerpNumber(tuning.ball.shadowGroundOpacity, tuning.ball.shadowAirOpacity, airMix);
    var depthBoost = 1 + depth * 0.14;
    view.shadow.scale.set(shadowScale * depthBoost, shadowScale * tuning.ball.shadowStretch * depthBoost, 1);
    view.shadow.material.opacity = shadowOpacity * (ballState?.live ? 1 : 0.9);
  }

  function updateLingeringBalls(snapshot) {
    var lingeringBalls = getSceneBallRenderPlan(snapshot).lingeringBalls;
    lingeringBallViews.forEach((view, index) => {
      updateBallView(view, lingeringBalls[index], null);
    });
  }

  function updatePhysicalNetContacts(snapshot) {
    getPhysicalNetContactEvents(snapshot).forEach((contact) => {
      var signature = contact.eventId || [
        "net",
        Math.round((contact.point.x || 0) * 20),
        Math.round((contact.point.y || 0) * 20),
        Math.round((contact.point.z || 0) * 20),
      ].join(":");
      if (handledPhysicalNetContacts.has(signature)) return;
      handledPhysicalNetContacts.add(signature);
      if (handledPhysicalNetContacts.size > 24) {
        handledPhysicalNetContacts.delete(handledPhysicalNetContacts.values().next().value);
      }

      var animationContact = getPhysicalNetAnimationContact(contact);
      if (!animationContact) return;
      var point = { ...animationContact.point, panel: animationContact.panel };
      triggerNetPocketState(
        netPocketState,
        { ...point, strength: animationContact.strength },
        tuning.feedback,
      );
      triggerNetRecoilState(
        netRecoilState,
        { point, strength: animationContact.strength },
        tuning.feedback,
      );
      netPulse = Math.max(netPulse, 0.18 + animationContact.strength * 0.2);
      netPulseContactPoint = point;
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
    var eventPlan = getMatchEventFeedbackPlan({ type: "ground", groundFeedback: feedback }, tuning.feedback);
    var intensity = clamp01(eventPlan.effectIntensity || feedback.intensity || 0);
    var length = feedback.skidLength || 0.32;
    skid.visible = true;
    skid.position.set(feedback.point.x, feedback.point.y, feedback.point.z);
    skid.rotation.set(-Math.PI / 2, 0, angle);
    skid.scale.set(Math.max(0.28, length), 0.22 + intensity * 0.32, 1);
    skid.material.opacity = tuning.feedback.groundSkidMaxOpacity * intensity;
  }

  function updateGroundSkids(snapshot) {
    var candidates = getSceneBallRenderPlan(snapshot).groundSkidBalls.filter((ballState) => ballState?.groundFeedback?.active);
    groundSkids.forEach((skid, index) => {
      updateGroundSkid(skid, candidates[index]);
    });
    candidates.forEach((ballState, index) => {
      triggerCourtDustContactFeedback(ballState, index);
    });
  }

  function triggerCourtDustContactFeedback(ballState, ballIndex) {
    var feedback = ballState?.groundFeedback;
    var fleckPlan = getCourtDustFleckPlan(feedback, tuning.feedback);
    if (!fleckPlan.length) return;

    var point = feedback.point;
    var signature = [
      ballIndex,
      Math.round((point.x || 0) * 14),
      Math.round((point.z || 0) * 14),
      Math.round((feedback.speed || 0) * 10),
    ].join(":");
    if (signature === lastCourtContactSignature) return;
    lastCourtContactSignature = signature;

    fleckPlan.forEach((plan, index) => {
      var fleck = courtDustFlecks[index % courtDustFlecks.length];
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

  function triggerImpact(type, position, strength, profile = null, eventPlan = null) {
    var color =
      eventPlan?.flashColor ||
      profile?.flashColor ||
      (type === "goal"
        ? tuning.feedback.goalFlashColor
        : type === "streak"
          ? tuning.feedback.streakFlashColor
          : type === "frame"
            ? tuning.feedback.frameFlashColor
            : tuning.feedback.saveFlashColor);
    var pulseStrength = eventPlan?.effectIntensity || strength || 1;
    var ringCount = Math.max(0, Math.min(impactRings.length, eventPlan?.ringCount ?? impactRings.length));
    impactRings.forEach((ring, index) => {
      if (index >= ringCount) {
        ring.material.opacity = 0;
        ring.userData.life = 0;
        return;
      }
      ring.position.set(position.x, position.y, position.z);
      ring.material.color.set(color);
      ring.material.opacity = Math.max(0.18, 0.72 - index * 0.16) * pulseStrength;
      ring.scale.setScalar(1 + index * 0.12);
      ring.userData.life = Math.max(0.35, 1 - index * 0.12);
    });
    triggerCameraImpulseState(
      cameraImpulseState,
      eventPlan || {
        cameraShake: profile?.cameraShake ?? tuning.feedback.maxCameraShake * pulseStrength,
        presentation: { cameraShakeMode: type === "goal" ? "push" : "micro" },
      },
      tuning.feedback,
    );
    triggerCameraPresentationState(cameraPresentationState, eventPlan, tuning.presentation);
    triggerPostprocessingBloomState(postprocessingBloomState, eventPlan, tuning.postprocessing);
  }

  function triggerSaveFeedback(position, strength, contact = null, gloves = null, state = null) {
    var feedbackState = getSaveContactFeedbackState(state || {});
    var eventPlan = getMatchEventFeedbackPlan({ type: "save", contact, state: feedbackState }, tuning.feedback);
    var profile = eventPlan.profile || getMatchFeedbackProfile({ type: "save", contact, state: feedbackState }, tuning.feedback);
    var pulseStrength = strength || eventPlan.effectIntensity || profile.impactStrength || 1;
    triggerImpact("save", position, profile.impactStrength || pulseStrength, profile, eventPlan);
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
      spark.material.opacity = tuning.feedback.saveSparkMaxOpacity * Math.min(1.16, pulseStrength);
      spark.userData.life = Math.max(0.28, 0.58 - index * 0.018);
      spark.userData.velocity = {
        x: Math.cos(angle) * (0.009 + index * 0.0008),
        y: Math.sin(angle) * 0.006,
        z: -0.002,
      };
    });
    getSaveAfterimagePlan(contact, gloves, tuning.feedback).forEach((plan, index) => {
      var afterimage = saveAfterimages[index % saveAfterimages.length];
      afterimage.visible = true;
      afterimage.position.set(plan.position.x, plan.position.y, plan.position.z);
      afterimage.rotation.set(0, 0, plan.rotation);
      afterimage.scale.set(plan.scale.x, plan.scale.y, 1);
      afterimage.material.opacity = plan.opacity;
      afterimage.userData.life = plan.life;
      afterimage.userData.baseOpacity = plan.opacity;
    });
    getSaveContactPressurePlan(contact, gloves, tuning.feedback).arcs.forEach((plan, index) => {
      var arc = savePressureArcs[index % savePressureArcs.length];
      arc.visible = true;
      arc.position.set(plan.position.x, plan.position.y, plan.position.z);
      arc.scale.set(plan.scale.x, plan.scale.y, 1);
      arc.material.opacity = plan.opacity;
      arc.userData.life = plan.life;
      arc.userData.baseOpacity = plan.opacity;
      arc.userData.rotation = plan.rotation;
    });
    getSaveContactShockwavePlan(contact, gloves, tuning.feedback).rings.forEach((plan, index) => {
      var shockwave = saveContactShockwaves[index % saveContactShockwaves.length];
      shockwave.visible = true;
      shockwave.position.set(plan.position.x, plan.position.y, plan.position.z);
      shockwave.scale.set(plan.scale.x, plan.scale.y, 1);
      shockwave.material.opacity = plan.opacity;
      shockwave.userData.life = plan.life;
      shockwave.userData.baseOpacity = plan.opacity;
      shockwave.userData.rotation = plan.rotation;
    });
    var deformation = getGloveContactDeformationPlan(contact, gloves, tuning.gloves);
    if (deformation.dimple) {
      gloveContactDimple.visible = true;
      gloveContactDimple.position.set(
        deformation.dimple.position.x,
        deformation.dimple.position.y,
        deformation.dimple.position.z,
      );
      gloveContactDimple.scale.set(deformation.dimple.scale.x, deformation.dimple.scale.y, 1);
      gloveContactDimple.material.opacity = deformation.dimple.opacity;
      gloveContactDimple.userData.life = deformation.dimple.life;
      gloveContactDimple.userData.baseOpacity = deformation.dimple.opacity;
      gloveContactDimple.userData.rotation = deformation.dimple.rotation;
    }
    if (deformation.highlight) {
      gloveContactHighlight.visible = true;
      gloveContactHighlight.position.set(
        deformation.highlight.position.x,
        deformation.highlight.position.y,
        deformation.highlight.position.z,
      );
      gloveContactHighlight.scale.set(deformation.highlight.scale.x, deformation.highlight.scale.y, 1);
      gloveContactHighlight.material.opacity = deformation.highlight.opacity;
      gloveContactHighlight.userData.life = deformation.highlight.life;
      gloveContactHighlight.userData.baseOpacity = deformation.highlight.opacity;
      gloveContactHighlight.userData.rotation = deformation.highlight.rotation;
    }
    deformation.creases.forEach((plan, index) => {
      var crease = glovePalmCreases[index % glovePalmCreases.length];
      crease.visible = true;
      crease.position.set(plan.position.x, plan.position.y, plan.position.z);
      crease.scale.set(plan.scale.x, plan.scale.y, 1);
      crease.material.opacity = plan.opacity;
      crease.userData.life = plan.life;
      crease.userData.baseOpacity = plan.opacity;
      crease.userData.rotation = plan.rotation;
    });
    if ((feedbackState.streak || 0) >= 3) triggerStreakFeedback(gloves, false);
  }

  function triggerGoalFeedback(position, contact = null, state = null) {
    var eventPlan = getMatchEventFeedbackPlan({ type: "goal", contact, state }, tuning.feedback);
    var profile = eventPlan.profile || getMatchFeedbackProfile({ type: "goal", contact, state }, tuning.feedback);
    var contactX = Math.max(-RAPIER_GOAL.halfWidth + 0.18, Math.min(RAPIER_GOAL.halfWidth - 0.18, position.x || 0));
    var contactY = Math.max(0.18, Math.min(RAPIER_GOAL.height - 0.08, position.y || 1));
    var contactZ = position.z || RAPIER_GOAL.netPlaneZ;
    var contactFlashPlan = getGoalContactFlashPlan(profile, tuning.feedback);
    goalFlash.material.color.set(profile.flashColor);
    goalFlash.position.set(contactX, Math.max(0.08, contactY), contactZ + 0.05);
    goalFlash.material.opacity = contactFlashPlan.opacity;
    goalFlash.visible = contactFlashPlan.visible;
    goalFlash.scale.setScalar(1);
    triggerImpact("goal", { ...position, x: contactX, y: contactY }, profile.impactStrength, profile, eventPlan);
    goalWaves.forEach((wave, index) => {
      wave.material.color.set(profile.flashColor);
      wave.position.set(contactX, Math.max(0.16, contactY), position.z + 0.06 + index * 0.012);
      wave.scale.setScalar(1 + index * 0.12);
      wave.material.opacity = tuning.feedback.goalWaveMaxOpacity * eventPlan.effectIntensity * (1 - index * 0.16);
      wave.userData.life = Math.max(0.42, 0.74 - index * 0.12);
    });
  }

  function triggerFrameReboundFeedback(contact, fallbackPosition) {
    var eventPlan = getMatchEventFeedbackPlan(
      {
        type: "frame",
        contact,
      },
      tuning.feedback,
    );
    var feedbackProfile = eventPlan.profile || getMatchFeedbackProfile(
      {
        type: "frame",
        contact,
      },
      tuning.feedback,
    );
    var plan = getFrameReboundFeedbackPlan(
      {
        ...(contact || {}),
        type: "frame",
        point: contact?.point || fallbackPosition,
      },
      tuning.feedback,
    );
    if (!plan) return;

    triggerCameraImpulseState(
      cameraImpulseState,
      {
        ...eventPlan,
        cameraShake: Math.max(eventPlan.cameraShake || 0, feedbackProfile.cameraShake || 0, plan.shake || 0),
      },
      tuning.feedback,
    );
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

  function triggerStreakFeedback(gloves, includeImpact = true) {
    var center = gloves?.center || { x: 0, y: 1.35, z: 3.15 };
    streakFlash.position.set(center.x, center.y, center.z - 0.04);
    streakFlash.material.opacity = 0.72;
    streakFlash.scale.setScalar(1);
    streakFlash.userData.life = 1;
    if (includeImpact) triggerImpact("streak", center, 0.72);
    streakPulses.forEach((pulse, index) => {
      pulse.position.set(center.x, center.y, center.z - 0.045 - index * 0.018);
      pulse.material.opacity = tuning.feedback.streakPulseMaxOpacity * (1 - index * 0.18);
      pulse.scale.setScalar(1 + index * 0.16);
      pulse.userData.life = Math.max(0.48, 0.84 - index * 0.12);
    });
  }

  function updateBall(snapshot) {
    var renderPlan = getSceneBallRenderPlan(snapshot);
    var ballState = renderPlan.activeBall;
    var contactBall = renderPlan.contactBall;
    var shot = snapshot.director?.currentShot;
    updateBallView(activeBall, ballState, shot);
    updateBallSpinGlints(ballState, shot);
    updateBallSpeedRibbons(ballState, shot);

    if (contactBall?.lastContact?.type) {
      var contactPoint = contactBall.lastContact.point || contactBall.position || { x: 0, y: 0, z: 0 };
      var contactSignature = getContactEventSignature(contactBall.lastContact, shot?.shotId ?? "");
      if (contactSignature === lastContactSignature) return;
      lastContactSignature = contactSignature;
      if (contactBall.lastContact.type === "glove" || contactBall.lastContact.type === "catch") {
        var position = contactPoint;
        triggerSaveFeedback(position, null, contactBall.lastContact, snapshot.gloves, snapshot.state);
        triggerGloveImpactState(gloveImpactState, contactBall.lastContact, snapshot.gloves, tuning.gloves);
      }
      if (contactBall.lastContact.type === "net") {
        triggerGoalFeedback(contactPoint, contactBall.lastContact, snapshot.state);
      }
      if (contactBall.lastContact.type === "frame") {
        var framePlan = getMatchEventFeedbackPlan({ type: "frame", contact: contactBall.lastContact, state: snapshot.state }, tuning.feedback);
        var frameProfile = framePlan.profile || getMatchFeedbackProfile({ type: "frame", contact: contactBall.lastContact }, tuning.feedback);
        triggerImpact("frame", contactPoint, frameProfile.impactStrength, frameProfile, framePlan);
        triggerFrameReboundFeedback(contactBall.lastContact, contactPoint);
      }
    }
  }

  function updateBallSpinGlints(ballState, shot) {
    var plan = getBallSpinGlintPlan(ballState, shot, tuning.ball);
    ballSpinGlints.forEach((glint, index) => {
      var glintPlan = plan.glints[index];
      if (!glintPlan) {
        glint.visible = false;
        glint.material.opacity = 0;
        return;
      }
      glint.visible = true;
      glint.position.set(glintPlan.position.x, glintPlan.position.y, glintPlan.position.z);
      glint.scale.set(glintPlan.scale.x, glintPlan.scale.y, 1);
      glint.material.opacity = glintPlan.opacity;
      glint.lookAt(camera.position);
      glint.rotateZ(glintPlan.rotation);
    });
  }

  function updateBallSpeedRibbons(ballState, shot) {
    var plan = getBallSpeedRibbonPlan(ballState, shot, tuning.ball);
    ballSpeedRibbons.forEach((ribbon, index) => {
      var ribbonPlan = plan.ribbons[index];
      if (!ribbonPlan) {
        ribbon.visible = false;
        ribbon.material.opacity = 0;
        return;
      }
      ribbon.visible = true;
      ribbon.position.set(ribbonPlan.position.x, ribbonPlan.position.y, ribbonPlan.position.z);
      ribbon.scale.set(ribbonPlan.scale.x, ribbonPlan.scale.y, 1);
      ribbon.material.opacity = ribbonPlan.opacity;
      ribbon.lookAt(camera.position);
      ribbon.rotateZ(ribbonPlan.rotation);
    });
  }

  function updateStateFeedback(snapshot) {
    var state = snapshot.state || {};
    var signature = [state.message, state.score, state.conceded, state.saves, state.streak].join(":");
    if (signature === feedbackSignature) return;
    feedbackSignature = signature;
    if (state.message === "goal" && snapshot.ball?.position) {
      triggerGoalFeedback(snapshot.ball.position, snapshot.ball.lastContact, state);
    }
  }

  function updateStadiumScoreboard(snapshot) {
    var texture = stadiumScoreboardDisplay?.material?.map;
    if (!texture) return;
    var plan = getStadiumScoreboardPlan(snapshot.state || {}, {
      difficulty: snapshot.director?.difficulty || snapshot.director?.currentShot?.difficulty || "medium",
    });
    if (plan.signature === lastScoreboardSignature) return;
    lastScoreboardSignature = plan.signature;
    updateStadiumScoreboardTexture(texture, plan);
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

  function applyReactiveNetPanelGeometry(plan) {
    reactiveNetPanels.forEach((panel) => {
      var attribute = panel.object.geometry.attributes.position;
      var positions = attribute.array;
      for (var index = 0; index < positions.length; index += 3) {
        var baseX = panel.basePositions[index];
        var baseY = panel.basePositions[index + 1];
        var baseZ = panel.basePositions[index + 2];
        var displacement = getNetPanelVertexDisplacement(
          panel.panel,
          {
            x: baseX + panel.baseObjectPosition.x,
            y: baseY + panel.baseObjectPosition.y,
            z: baseZ + panel.baseObjectPosition.z,
          },
          plan,
        );
        positions[index] = baseX + displacement.x;
        positions[index + 1] = baseY + displacement.y;
        positions[index + 2] = baseZ + displacement.z;
      }
      attribute.needsUpdate = true;
    });
  }

  function updateNetPocketVisuals(recoilPlan = null) {
    var plan = getNetPocketFeedbackPlan(netPocketState, tuning.feedback);
    if (plan && recoilPlan) plan.springDisplacement = recoilPlan.netZOffset || 0;
    var cordPlan = getNetCordTensionFeedbackPlan(netPocketState, tuning.feedback);
    applyReactiveNetPanelGeometry(plan);

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

    netCordTensionSegments.forEach((segment, index) => {
      var segmentPlan = cordPlan?.segments?.[index];
      if (!segmentPlan) {
        segment.visible = false;
        segment.material.opacity = 0;
        return;
      }
      segment.visible = true;
      segment.position.set(segmentPlan.position.x, segmentPlan.position.y, segmentPlan.position.z);
      segment.rotation.set(0, 0, segmentPlan.rotation);
      segment.scale.set(segmentPlan.scale.x, segmentPlan.scale.y, 1);
      segment.material.opacity = segmentPlan.opacity;
      segment.userData.life = segmentPlan.life;
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
    var recoilPlan = getNetRecoilMotionPlan(netRecoilState, tuning.feedback);
    var recoilOffset = recoilPlan.netZOffset || 0;
    var recoilPulse = recoilPlan.detailPulse || 0;
    var recoilContactPoint = recoilPlan.point;
    if (netPulse > 0) {
      netPulse = Math.max(0, netPulse - tuning.feedback.netPulseDecay);
    } else {
      netPulseContactPoint = null;
    }
    goal.net.position.copy(netLayerBasePosition);
    goal.net.material.opacity = tuning.feedback.netBaseOpacity;
    goal.grid.position.copy(gridLayerBasePosition);
    dynamicNetDetails.forEach((detail) => {
      var plan = getDynamicNetDetailMotionPlan(
        detail,
        Math.max(netPulse, recoilPulse),
        netPulseContactPoint || recoilContactPoint,
        tuning.feedback,
      );
      detail.object.position.set(
        plan.position.x,
        plan.position.y,
        plan.position.z + (plan.anchoredPanel ? 0 : recoilOffset * 0.34 * (detail.motionScale || 1)),
      );
      if (Number.isFinite(detail.baseOpacity) && detail.object.material) {
        detail.object.material.opacity = detail.baseOpacity + plan.opacityBoost + recoilPlan.opacityBoost * 0.45;
      }
    });
    updateNetPocketVisuals(recoilPlan);
    advanceNetRecoilState(netRecoilState, 1 / 60, tuning.feedback);

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

    saveAfterimages.forEach((afterimage, index) => {
      if (afterimage.userData.life <= 0) {
        afterimage.material.opacity = 0;
        afterimage.visible = false;
        return;
      }
      afterimage.userData.life = Math.max(0, afterimage.userData.life - tuning.feedback.saveAfterimageDecay - index * 0.003);
      afterimage.material.opacity = Math.max(0, afterimage.userData.life * (afterimage.userData.baseOpacity || 0));
      afterimage.scale.multiplyScalar(1.006 + index * 0.002);
      afterimage.lookAt(camera.position);
    });

    savePressureArcs.forEach((arc, index) => {
      if (arc.userData.life <= 0) {
        arc.material.opacity = 0;
        arc.visible = false;
        return;
      }
      arc.userData.life = Math.max(0, arc.userData.life - tuning.feedback.savePressureDecay - index * 0.004);
      arc.material.opacity = Math.max(0, arc.userData.life * (arc.userData.baseOpacity || 0));
      arc.scale.multiplyScalar(1.012 + index * 0.004);
      arc.lookAt(camera.position);
      arc.rotateZ(arc.userData.rotation || 0);
    });

    saveContactShockwaves.forEach((shockwave, index) => {
      if (shockwave.userData.life <= 0) {
        shockwave.material.opacity = 0;
        shockwave.visible = false;
        return;
      }
      shockwave.userData.life = Math.max(0, shockwave.userData.life - tuning.feedback.saveContactShockwaveDecay - index * 0.005);
      shockwave.material.opacity = Math.max(0, shockwave.userData.life * (shockwave.userData.baseOpacity || 0));
      shockwave.scale.multiplyScalar(1.018 + index * 0.004);
      shockwave.lookAt(camera.position);
      shockwave.rotateZ(shockwave.userData.rotation || 0);
    });

    [
      { object: gloveContactDimple, decayOffset: 0, growth: 1.004 },
      { object: gloveContactHighlight, decayOffset: 0.004, growth: 1.012 },
      ...glovePalmCreases.map((object, index) => ({ object, decayOffset: 0.004 + index * 0.003, growth: 1.006 + index * 0.002 })),
    ].forEach(({ object, decayOffset, growth }) => {
      if (object.userData.life <= 0) {
        object.material.opacity = 0;
        object.visible = false;
        return;
      }
      object.userData.life = Math.max(0, object.userData.life - tuning.gloves.contactDeformationDecay - decayOffset);
      object.material.opacity = Math.max(0, object.userData.life * (object.userData.baseOpacity || 0));
      object.scale.multiplyScalar(growth);
      object.lookAt(camera.position);
      object.rotateZ(object.userData.rotation || 0);
    });

    courtDustFlecks.forEach((fleck, index) => {
      if (fleck.userData.life <= 0) {
        fleck.material.opacity = 0;
        fleck.visible = false;
        return;
      }
      fleck.userData.life = Math.max(0, fleck.userData.life - tuning.feedback.courtDustFleckDecay - index * 0.001);
      var velocity = fleck.userData.velocity || { x: 0, y: 0, z: 0 };
      fleck.position.x += velocity.x;
      fleck.position.y += velocity.y;
      fleck.position.z += velocity.z;
      fleck.userData.velocity = {
        x: velocity.x * 0.96,
        y: velocity.y * 0.78 - 0.001,
        z: velocity.z * 0.96,
      };
      fleck.material.opacity = Math.max(0, fleck.userData.life * (fleck.userData.baseOpacity || tuning.feedback.courtDustFleckMaxOpacity));
      fleck.scale.multiplyScalar(1.002);
      fleck.lookAt(camera.position);
    });

    if (goalFlash.material.opacity > 0) {
      goalFlash.material.opacity = Math.max(0, goalFlash.material.opacity - 0.028);
      goalFlash.scale.multiplyScalar(1.028);
      goalFlash.lookAt(camera.position);
    } else {
      goalFlash.visible = false;
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
    var impulse = getCameraImpulseOffsetPlan(cameraImpulseState, feedbackFrame, tuning.feedback);
    if (!impulse.active) {
      camera.position.copy(cameraFraming.position);
      camera.lookAt(cameraFraming.lookAt);
      return;
    }
    camera.position.set(
      cameraFraming.position.x + impulse.offset.x,
      cameraFraming.position.y + impulse.offset.y,
      cameraFraming.position.z + impulse.offset.z,
    );
    camera.lookAt(cameraFraming.lookAt);
    camera.rotation.z += impulse.roll;
    advanceCameraImpulseState(cameraImpulseState, tuning.feedback);
  }

  function updatePresentationLayer() {
    var plan = getCameraPresentationStatePlan(cameraPresentationState, tuning.presentation);
    presentationWash.material.color.set(plan.color);
    presentationWash.material.opacity = plan.screenWashOpacity;
    presentationWash.visible = plan.screenWashOpacity > 0.002;

    presentationVignette.material.opacity = plan.vignetteOpacity;
    presentationVignette.visible = plan.vignetteOpacity > 0.002;

    presentationFocusRing.material.color.set(plan.color);
    presentationFocusRing.material.opacity = plan.focusRingOpacity;
    presentationFocusRing.visible = plan.focusRingOpacity > 0.002;
    presentationFocusRing.scale.setScalar(Math.min(presentationWash.scale.x, presentationWash.scale.y) * plan.focusRingScale);

    if (canvas.dataset) {
      canvas.dataset.presentationLayerSystem = plan.system;
      canvas.dataset.presentationTier = plan.active ? plan.tier : "ambient";
      canvas.dataset.presentationWash = String(Math.round(plan.screenWashOpacity * 1000) / 1000);
    }

    advanceCameraPresentationState(cameraPresentationState, tuning.presentation);
  }

  function updatePostprocessingLayer() {
    var plan = getPostprocessingBloomStatePlan(postprocessingBloomState, tuning.postprocessing);
    postprocessingPipeline?.apply(plan);

    if (canvas.dataset) {
      canvas.dataset.postprocessingSystem = plan.system;
      canvas.dataset.postprocessingTier = plan.active ? plan.tier : "ambient";
      canvas.dataset.postprocessingBloom = String(Math.round(plan.strength * 1000) / 1000);
    }

    advancePostprocessingBloomState(postprocessingBloomState, tuning.postprocessing);
  }

  function updateVisuals(snapshot) {
    var ballRenderPlan = getSceneBallRenderPlan(snapshot);
    if (canvas.dataset) {
      canvas.dataset.renderVisibleBalls = String(ballRenderPlan.visibleBallCount);
      canvas.dataset.hideActiveBallForReplay = ballRenderPlan.hideActiveBallForReplay ? "true" : "false";
      canvas.dataset.environmentSystem = tuning.environment.system;
      canvas.dataset.environmentTechnique = tuning.environment.technique;
      canvas.dataset.reusableEnvironmentAssetSystem = tuning.environment.reusableAssetSystem;
      canvas.dataset.reusableEnvironmentAssetStatus = scene.userData.reusableEnvironmentAssetStatus || "loading";
    }
    updateShooterModel(shooter, snapshot.director || { phase: "cue", phaseTime: 0, currentShot: null });
    updateStadiumScoreboard(snapshot);
    updateStateFeedback(snapshot);
    updateBall(snapshot);
    updateLingeringBalls(snapshot);
    updatePhysicalNetContacts(snapshot);
    updateGroundSkids(snapshot);
    updateGloves(snapshot.gloves);
    updateNetAndEffects();
    applyFeedbackCamera();
    updatePresentationLayer();
    updatePostprocessingLayer();
    if (postprocessingPipeline) {
      postprocessingPipeline.render();
    } else {
      renderer.render(scene, camera);
    }
  }

  function dispose() {
    environmentAssetPipeline.dispose();
    postprocessingPipeline?.dispose();
    renderer.dispose();
  }

  return {
    scene,
    camera,
    renderer,
    environmentAssetPipeline,
    postprocessingPipeline,
    resize,
    updateVisuals,
    dispose,
  };
}
