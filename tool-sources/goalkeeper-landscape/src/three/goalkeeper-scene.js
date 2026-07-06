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
  },
  gloves: {
    scale: 0.64,
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

function applyCameraTuning(camera, aspect) {
  var portraitMix = clamp01((1.25 - aspect) / 0.75);
  var base = SCENE_TUNING.camera;
  var portrait = SCENE_TUNING.portraitCamera;
  camera.fov = lerpNumber(base.fov, portrait.fov, portraitMix);
  camera.position.set(
    lerpNumber(base.position.x, portrait.position.x, portraitMix),
    lerpNumber(base.position.y, portrait.position.y, portraitMix),
    lerpNumber(base.position.z, portrait.position.z, portraitMix),
  );
  camera.lookAt(
    lerpNumber(base.lookAt.x, portrait.lookAt.x, portraitMix),
    lerpNumber(base.lookAt.y, portrait.lookAt.y, portraitMix),
    lerpNumber(base.lookAt.z, portrait.lookAt.z, portraitMix),
  );
}

export function createGoalkeeperScene(canvas) {
  var renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
  renderer.setClearColor("#8ed7ff", 1);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = true;

  var scene = new THREE.Scene();
  scene.fog = new THREE.Fog("#8ed7ff", 28, 58);

  var camera = new THREE.PerspectiveCamera(SCENE_TUNING.camera.fov, 16 / 9, 0.05, 90);
  applyCameraTuning(camera, 16 / 9);

  var hemi = new THREE.HemisphereLight("#fff7da", "#2d6b40", 2.3);
  var sun = new THREE.DirectionalLight("#fff4cf", 2.1);
  sun.position.set(-3, 7, 5);
  scene.add(hemi, sun);

  var field = createFieldGroup();
  var goal = createGoalAndNet();
  var shooter = createShooterModel();
  var ball = new THREE.Mesh(
    new THREE.SphereGeometry(SCENE_TUNING.ball.radius, 32, 24),
    new THREE.MeshStandardMaterial({ map: createFootballTexture(), roughness: 0.42, metalness: 0.02 }),
  );
  var ballHalo = new THREE.Mesh(
    new THREE.CircleGeometry(SCENE_TUNING.ball.haloRadius, 32),
    new THREE.MeshBasicMaterial({ color: "#fff0a6", transparent: true, opacity: 0.34, depthWrite: false }),
  );
  var ballShadow = new THREE.Mesh(
    new THREE.CircleGeometry(SCENE_TUNING.ball.shadowRadius, 24),
    new THREE.MeshBasicMaterial({ color: "#173720", transparent: true, opacity: 0.28, depthWrite: false }),
  );
  ballShadow.rotation.x = -Math.PI / 2;
  var leftGlove = createGloveMesh("left");
  var rightGlove = createGloveMesh("right");
  leftGlove.scale.setScalar(SCENE_TUNING.gloves.scale);
  rightGlove.scale.setScalar(SCENE_TUNING.gloves.scale);
  var trailMaterial = new THREE.LineBasicMaterial({ color: "#f9fff7", transparent: true, opacity: 0.72 });
  var trail = new THREE.Line(new THREE.BufferGeometry(), trailMaterial);
  var impact = new THREE.Mesh(
    new THREE.TorusGeometry(0.28, 0.014, 8, 32),
    new THREE.MeshBasicMaterial({ color: "#fff1a8", transparent: true, opacity: 0, depthWrite: false }),
  );
  impact.rotation.x = Math.PI / 2;

  scene.add(field, goal.group, shooter.group, ballHalo, ball, ballShadow, leftGlove, rightGlove, trail, impact);

  var ballTrail = [];
  var netPulse = 0;
  var lastContactType = null;

  function resize(bounds) {
    var width = Math.max(1, Math.round(bounds.width || canvas.clientWidth || 1280));
    var height = Math.max(1, Math.round(bounds.height || canvas.clientHeight || 720));
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    applyCameraTuning(camera, camera.aspect);
    camera.updateProjectionMatrix();
  }

  function updateBall(snapshot) {
    var ballState = snapshot.ball;
    var shot = snapshot.director?.currentShot;
    var position = ballState?.position || shot?.origin;
    if (!position) {
      ball.visible = false;
      ballHalo.visible = false;
      ballShadow.visible = false;
      trail.visible = false;
      return;
    }

    ball.visible = true;
    ball.position.set(position.x, position.y, position.z);
    var depthRange = SCENE_TUNING.depth.netPlaneZ - SCENE_TUNING.depth.originZ;
    var depth = clamp01((position.z - SCENE_TUNING.depth.originZ) / depthRange);
    var speedScale =
      ballState?.outcome === "goal"
        ? SCENE_TUNING.ball.goalScale
        : ballState?.outcome === "deflected"
          ? SCENE_TUNING.ball.deflectedScale
          : 1;
    var visualScale = lerpNumber(SCENE_TUNING.ball.baseScale, SCENE_TUNING.ball.nearScale, depth);
    ball.scale.setScalar(speedScale * visualScale);
    var angular = ballState?.angularVelocity || shot?.ballPlan?.angularVelocity || { x: -8, y: 12, z: 0 };
    ball.rotation.x += angular.x * 0.008;
    ball.rotation.y += angular.y * 0.008;
    ball.rotation.z += angular.z * 0.008;

    ballHalo.visible = true;
    ballHalo.position.set(position.x, position.y, position.z - 0.025);
    ballHalo.lookAt(camera.position);
    ballHalo.scale.setScalar(0.22 + depth * 0.64);
    ballHalo.material.opacity = ballState?.outcome === "goal" ? 0.34 : ballState?.live ? 0.28 : 0.18;

    ballShadow.visible = true;
    ballShadow.position.set(position.x, 0.012, position.z);
    var shadowScale = Math.max(0.12, 0.28 - position.y * 0.04);
    ballShadow.scale.set(shadowScale, shadowScale * 0.62, 1);

    if (ballState?.live || ballState?.outcome === "goal" || ballState?.outcome === "saved") {
      ballTrail.push(new THREE.Vector3(position.x, position.y, position.z));
      if (ballTrail.length > 14) ballTrail.shift();
    } else if (!ballState) {
      ballTrail = [];
    }
    trail.visible = ballTrail.length > 1;
    trail.geometry.dispose();
    trail.geometry = new THREE.BufferGeometry().setFromPoints(ballTrail);

    if (ballState?.lastContact?.type && ballState.lastContact.type !== lastContactType) {
      lastContactType = ballState.lastContact.type;
      if (ballState.lastContact.type === "glove") {
        impact.position.set(position.x, position.y, position.z);
        impact.material.opacity = 0.86;
        impact.scale.setScalar(1);
      }
      if (ballState.lastContact.type === "net") {
        netPulse = 1;
      }
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
      netPulse = Math.max(0, netPulse - 0.035);
      goal.net.position.z = RAPIER_GOAL.netPlaneZ + 0.1 + Math.sin(netPulse * Math.PI) * 0.18;
      goal.net.material.opacity = 0.16 + netPulse * 0.24;
      goal.grid.position.z = Math.sin(netPulse * Math.PI) * 0.1;
    } else {
      goal.net.position.z = RAPIER_GOAL.netPlaneZ + 0.1;
      goal.net.material.opacity = 0.16;
      goal.grid.position.z = 0;
    }

    if (impact.material.opacity > 0) {
      impact.material.opacity = Math.max(0, impact.material.opacity - 0.055);
      impact.scale.multiplyScalar(1.035);
      impact.lookAt(camera.position);
    }
  }

  function updateVisuals(snapshot) {
    updateShooterModel(shooter, snapshot.director || { phase: "cue", phaseTime: 0, currentShot: null });
    updateBall(snapshot);
    updateGloves(snapshot.gloves);
    updateNetAndEffects();
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
