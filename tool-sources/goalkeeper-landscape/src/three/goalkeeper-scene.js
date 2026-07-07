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
  camera.lookAt(
    lerpNumber(base.lookAt.x, portrait.lookAt.x, portraitMix),
    lerpNumber(base.lookAt.y, portrait.lookAt.y, portraitMix),
    lerpNumber(base.lookAt.z, portrait.lookAt.z, portraitMix),
  );
}

export function createGoalkeeperScene(canvas) {
  var tuning = SCENE_TUNING;
  var renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
  renderer.setClearColor("#8ed7ff", 1);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = true;

  var scene = new THREE.Scene();
  scene.fog = new THREE.Fog("#8ed7ff", 28, 58);

  var camera = new THREE.PerspectiveCamera(tuning.camera.fov, 16 / 9, 0.05, 90);
  applyCameraTuning(camera, 16 / 9, tuning);

  var hemi = new THREE.HemisphereLight("#fff7da", "#2d6b40", 2.3);
  var sun = new THREE.DirectionalLight("#fff4cf", 2.1);
  sun.position.set(-3, 7, 5);
  scene.add(hemi, sun);

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
  var leftGlove = createGloveMesh("left");
  var rightGlove = createGloveMesh("right");
  leftGlove.scale.setScalar(tuning.gloves.scale);
  rightGlove.scale.setScalar(tuning.gloves.scale);
  var impact = new THREE.Mesh(
    new THREE.TorusGeometry(0.28, 0.014, 8, 32),
    new THREE.MeshBasicMaterial({ color: "#fff1a8", transparent: true, opacity: 0, depthWrite: false }),
  );
  impact.rotation.x = Math.PI / 2;

  scene.add(
    field,
    goal.group,
    shooter.group,
    activeBall.halo,
    activeBall.mesh,
    activeBall.shadow,
    ...lingeringBallViews.flatMap((view) => [view.halo, view.mesh, view.shadow]),
    leftGlove,
    rightGlove,
    impact,
  );

  var netPulse = 0;
  var lastContactType = null;

  function resize(bounds) {
    var width = Math.max(1, Math.round(bounds.width || canvas.clientWidth || 1280));
    var height = Math.max(1, Math.round(bounds.height || canvas.clientHeight || 720));
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    applyCameraTuning(camera, camera.aspect, tuning);
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

  function updateBall(snapshot) {
    var ballState = snapshot.ball;
    var shot = snapshot.director?.currentShot;
    updateBallView(activeBall, ballState, shot);

    if (ballState?.lastContact?.type && ballState.lastContact.type !== lastContactType) {
      lastContactType = ballState.lastContact.type;
      if (ballState.lastContact.type === "glove") {
        var position = ballState.position;
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
    updateLingeringBalls(snapshot);
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
