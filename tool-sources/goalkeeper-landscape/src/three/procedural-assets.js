import * as THREE from "three";
import { DecalGeometry } from "three/addons/geometries/DecalGeometry.js";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { MAX_CONCEDED, ROUND_SECONDS } from "../config/game-config.js";
import { LAUNCHER_GEOMETRY } from "../game/launcher-geometry.js";
import {
  GOAL_CAGE_POINTS,
  GOAL_FRAME_SEGMENTS,
  GOAL_RETURN_FRAME_SEGMENTS,
  GOAL_NET_GRID,
  GOAL_NET_GEOMETRY,
  getGoalNetPocketVertex,
  getGoalRoofHeightAtZ,
  getGoalSideHalfWidthAtZ,
} from "../physics/goal-net-geometry.js";
import { RAPIER_GOAL } from "../physics/rapier-world.js";

export const STADIUM_SCOREBOARD_DISPLAY_SYSTEM = "live-stadium-scoreboard-display";
export const MATCHDAY_ASSET_POLISH_SYSTEM = "broadcast-matchday-polish-kit";
export const ROUNDED_BOX_BEVELED_PROP_SYSTEM = "three-rounded-box-beveled-prop-kit";
export const ROUNDED_BOX_GEOMETRY_SOURCE = "three/addons/geometries/RoundedBoxGeometry";
const NET_CORD_TEXTURE_SYSTEM = "procedural-braided-cord-net-material";
const NET_CORD_MATERIAL_SYSTEM = "braided-nylon-cord-pbr";
const NET_SIGHTLINE_SYSTEM = "central-shot-lane-low-occlusion-net";
const NET_DEPTH_SYSTEM = "rear-draped-side-net-volume";
const NET_PROFESSIONAL_SYSTEM = "slack-knotted-pro-goal-net";
const NET_OCCLUSION_BUDGET_SYSTEM = "keeper-view-low-opacity-center-window";
const NET_CENTER_WINDOW_SYSTEM = "true-open-center-shot-window";
const NET_REALISM_UPGRADE_SYSTEM = "layered-rear-pocket-braided-net";
const NET_MATCHDAY_LACING_SYSTEM = "edge-laced-rear-pocket-net-clear-lane";
const NET_LANE_GUARD_SYSTEM = "peripheral-net-detail-open-shot-lane";
const NET_MATCH_GRADE_TEXTURE_SYSTEM = "match-grade-woven-net-texture-clear-sightline";
const NET_SHOT_LANE_VISIBILITY_SYSTEM = "center-lane-ball-first-net-budget";
const NET_PHOTOREAL_TEXTURE_SYSTEM = "braided-hex-rear-pocket-net-clear-lane";
const NET_LANDSCAPE_SIGHTLINE_SYSTEM = "landscape-keeper-view-real-net-clear-shot-lane";
const NET_VISUAL_UPGRADE_SYSTEM = "procedural-match-net-alpha-weave-clear-lane";
const NET_ALPHA_TEXTURE_SYSTEM = "procedural-real-match-net-alpha-texture";
const NET_BROADCAST_SIGHTLINE_SYSTEM = "broadcast-safe-rear-mesh-net-clear-mobile-landscape";
const NET_LANE_CUTOUT_SYSTEM = "split-rear-net-around-mobile-shot-window";
const NET_CONTINUITY_SYSTEM = "continuous-ball-priority-pocket-shell";
const NET_FRAME_ATTACHMENT_SYSTEM = "frame-bound-continuous-net-seam";
const BUILD_RETIRED_NET_LAYERS = false;
const GLOVE_PBR_MATERIAL_SYSTEM = "pbr-latex-textile-match-glove-materials";
const GLOVE_LATEX_TEXTURE_SYSTEM = "procedural-latex-micrograin-glove-texture";
const GLOVE_TEXTILE_TEXTURE_SYSTEM = "procedural-woven-cuff-glove-texture";
const GLOVE_WEAR_DETAIL_SYSTEM = "subtle-match-use-glove-wear";
const LAUNCHER_PBR_MATERIAL_SYSTEM = "pbr-painted-metal-rubber-launcher-materials";
const LAUNCHER_DECAL_SYSTEM = "three-decalgeometry-launcher-label-wear-kit";
const LAUNCHER_PAINT_TEXTURE_SYSTEM = "procedural-painted-metal-launcher-texture";
const LAUNCHER_GUNMETAL_TEXTURE_SYSTEM = "procedural-gunmetal-launcher-texture";
const LAUNCHER_RUBBER_TEXTURE_SYSTEM = "procedural-rubber-tire-launcher-texture";
const LAUNCHER_DISTANCE_CLARITY_SYSTEM = "distance-clarity-silhouette-kit";

export function getMatchdayAssetPolishProfile() {
  return {
    system: MATCHDAY_ASSET_POLISH_SYSTEM,
    reusableTechnique: "procedural-threejs-matchday-assets",
    assetFamilies: [
      "training-floor",
      "goal-net",
      "ball",
      "gloves",
      "launcher",
      "lighting",
      "broadcast-dressing",
    ],
    renderingBudget: "mobile-safe-transparent-mesh-layers",
  };
}

function pad2(value) {
  return String(Math.max(0, Math.floor(value))).padStart(2, "0");
}

function formatScoreboardTime(seconds) {
  var safeSeconds = Math.max(0, Math.ceil(Number.isFinite(seconds) ? seconds : ROUND_SECONDS));
  return pad2(safeSeconds / 60) + ":" + pad2(safeSeconds % 60);
}

export function getStadiumScoreboardPlan(state = {}, context = {}) {
  var secondsLeft = Math.max(0, Math.ceil(Number.isFinite(state.timeLeft) ? state.timeLeft : ROUND_SECONDS));
  var running = Boolean(state.running);
  var paused = Boolean(state.paused);
  var ended = Boolean(state.ended);
  var conceded = Math.max(0, state.conceded || 0);
  var saves = Math.max(0, state.saves || 0);
  var streak = Math.max(0, state.streak || 0);
  var scoreText = String(Math.max(0, state.score || 0));
  var lowTime = running && !paused && !ended && secondsLeft <= 10;
  var matchPoint = running && !paused && !ended && conceded >= MAX_CONCEDED - 1;
  var pressure = lowTime || matchPoint;
  var status = ended ? "FULL TIME" : paused ? "PAUSED" : running ? (pressure ? "HOLD" : "LIVE") : "READY";
  var difficulty = String(context.difficulty || "medium").toUpperCase();
  var detailText = streak >= 3 ? "STREAK " + String(streak) + "  LOST " + String(conceded) : "SAVES " + String(saves) + "  LOST " + String(conceded);
  var accentColor =
    ended
      ? "#f6f1df"
      : pressure || state.message === "goal"
        ? "#ff7846"
        : state.message === "save" || streak > 0
          ? "#61f0ff"
          : "#fff1a8";

  return {
    system: STADIUM_SCOREBOARD_DISPLAY_SYSTEM,
    status,
    scoreText,
    timeText: formatScoreboardTime(secondsLeft),
    detailText,
    difficultyText: difficulty,
    accentColor,
    pressure,
    signature: [status, scoreText, formatScoreboardTime(secondsLeft), detailText, difficulty, accentColor].join("|"),
  };
}

function createSurfaceDetailTexture(size, sample, repeatX = 1, repeatY = 1) {
  var data = new Uint8Array(size * size * 4);
  for (var y = 0; y < size; y += 1) {
    for (var x = 0; x < size; x += 1) {
      var value = Math.max(0, Math.min(255, Math.round(sample(x, y, size))));
      var index = (y * size + x) * 4;
      data[index] = value;
      data[index + 1] = value;
      data[index + 2] = value;
      data[index + 3] = 255;
    }
  }
  var texture = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(repeatX, repeatY);
  texture.magFilter = THREE.LinearFilter;
  texture.minFilter = THREE.LinearFilter;
  texture.needsUpdate = true;
  return texture;
}

function createAcademyCourtSurfaceMap(kind) {
  var size = 256;
  if (kind !== "albedo") {
    var detailTexture = createSurfaceDetailTexture(size, (x, y) => {
      var aggregate = Math.sin(x * 1.91 + y * 0.73) * 0.5 + 0.5;
      var crossAggregate = Math.sin(x * 0.37 - y * 2.17) * 0.5 + 0.5;
      var fineSpeckle = Math.sin((x + y) * 3.83) * 0.5 + 0.5;
      if (kind === "bump") return 112 + aggregate * 74 + crossAggregate * 34 + fineSpeckle * 18;
      return 184 + (1 - aggregate) * 36 + crossAggregate * 18 + fineSpeckle * 10;
    }, 5.4, 14.2);
    detailTexture.userData.assetSystem = "micro-speckled-academy-polymer-surface";
    detailTexture.userData.surfaceKind = kind;
    return detailTexture;
  }

  var data = new Uint8Array(size * size * 4);
  for (var y = 0; y < size; y += 1) {
    for (var x = 0; x < size; x += 1) {
      var aggregate = Math.sin(x * 1.91 + y * 0.73) * 0.5 + 0.5;
      var crossAggregate = Math.sin(x * 0.37 - y * 2.17) * 0.5 + 0.5;
      var scuff = Math.max(0, Math.sin(x * 0.12 + y * 0.19) - 0.78);
      var base = 226 + aggregate * 18 + crossAggregate * 8 - scuff * 38;
      var index = (y * size + x) * 4;
      data[index] = Math.max(0, Math.min(255, Math.round(base - 9)));
      data[index + 1] = Math.max(0, Math.min(255, Math.round(base - 2)));
      data[index + 2] = Math.max(0, Math.min(255, Math.round(base + 3)));
      data[index + 3] = 255;
    }
  }
  var texture = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(5.4, 14.2);
  texture.magFilter = THREE.LinearFilter;
  texture.minFilter = THREE.LinearFilter;
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  texture.needsUpdate = true;
  texture.userData.assetSystem = "micro-speckled-academy-polymer-surface";
  texture.userData.surfaceKind = kind;
  return texture;
}

function createNetCordSurfaceMap(kind) {
  var texture = createSurfaceDetailTexture(128, (x, y, size) => {
    var nx = x / size;
    var ny = y / size;
    var braidA = Math.sin((nx * 16 + ny * 4.5) * Math.PI * 2);
    var braidB = Math.sin((nx * 16 - ny * 4.5) * Math.PI * 2);
    var braid = Math.max(0, Math.max(braidA, braidB));
    var fiber = Math.sin(x * 1.73 + y * 0.47) * 0.5 + 0.5;
    var crossFiber = Math.sin(x * 0.34 - y * 2.15) * 0.5 + 0.5;
    if (kind === "bump") return 104 + braid * 118 + fiber * 18;
    if (kind === "roughness") return 166 + (1 - braid) * 52 + crossFiber * 22;
    return 206 + braid * 30 + fiber * 10;
  }, 5.5, 1.35);
  texture.userData.assetSystem = NET_CORD_TEXTURE_SYSTEM;
  texture.userData.surfaceKind = kind;
  return texture;
}

function createMatchNetAlphaTexture(variant = "edge") {
  var size = 256;
  var data = new Uint8Array(size * size * 4);
  var lineGain = variant === "center" ? 46 : 136;
  var knotGain = variant === "center" ? 18 : 72;
  var cellX = variant === "center" ? 4.7 : 6.6;
  var cellY = variant === "center" ? 3.2 : 4.45;
  var cordWidth = variant === "center" ? 0.021 : 0.027;

  for (var y = 0; y < size; y += 1) {
    for (var x = 0; x < size; x += 1) {
      var nx = x / size;
      var ny = y / size;
      var diagonalA = Math.abs(((nx * cellX + ny * cellY + 0.08) % 1) - 0.5);
      var diagonalB = Math.abs(((nx * cellX - ny * cellY + 0.38) % 1) - 0.5);
      var cord = Math.exp(-Math.pow(Math.min(diagonalA, diagonalB) / cordWidth, 2));
      var fiber = (Math.sin(x * 0.63 + y * 1.97) * 0.5 + 0.5) * 0.18;
      var knotGridX = Math.abs(((nx * cellX + 0.08) % 1) - 0.5);
      var knotGridY = Math.abs(((ny * cellY + 0.38) % 1) - 0.5);
      var knot = Math.exp(-((knotGridX * knotGridX + knotGridY * knotGridY) / (variant === "center" ? 0.0068 : 0.0048)));
      var alpha = Math.min(235, Math.round(cord * lineGain + knot * knotGain));
      var shade = 232 + Math.round((cord + fiber) * 18);
      var index = (y * size + x) * 4;
      data[index] = shade;
      data[index + 1] = Math.min(255, shade + 4);
      data[index + 2] = Math.min(255, shade + 8);
      data[index + 3] = alpha;
    }
  }

  var texture = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(variant === "center" ? 0.86 : 1.08, variant === "center" ? 0.74 : 0.94);
  texture.magFilter = THREE.LinearFilter;
  texture.minFilter = THREE.LinearFilter;
  texture.needsUpdate = true;
  texture.userData.assetSystem = NET_ALPHA_TEXTURE_SYSTEM;
  texture.userData.netVisualUpgradeSystem = NET_VISUAL_UPGRADE_SYSTEM;
  texture.userData.alphaMeshPattern = "wide-open-diamond-cord-alpha";
  texture.userData.visibilityBudget = variant === "center" ? "mobile-landscape-center-window" : "peripheral-rear-pocket-window";
  texture.userData.variant = variant;
  return texture;
}

function createSquareGoalNetAlphaTexture() {
  var size = 1024;
  var cellsAcross = GOAL_NET_GRID.widthDivisions;
  var cellsHigh = GOAL_NET_GRID.rearHeightDivisions;
  var data = new Uint8Array(size * size * 4);

  for (var y = 0; y < size; y += 1) {
    for (var x = 0; x < size; x += 1) {
      var nx = x / size;
      var ny = y / size;
      var warpedX = nx + Math.sin(ny * Math.PI * 4.0) * 0.0014;
      var warpedY = ny + Math.sin(nx * Math.PI * 5.0) * 0.0018;
      var cellX = warpedX * cellsAcross;
      var cellY = warpedY * cellsHigh;
      var fractionX = cellX - Math.floor(cellX);
      var fractionY = cellY - Math.floor(cellY);
      var distanceX = Math.min(fractionX, 1 - fractionX);
      var distanceY = Math.min(fractionY, 1 - fractionY);
      var cordDistance = Math.min(distanceX, distanceY);
      var cord = Math.exp(-Math.pow(cordDistance / 0.09, 2));
      var knot = Math.exp(-((distanceX * distanceX + distanceY * distanceY) / 0.0038));
      var fiber = Math.sin(x * 1.37 + y * 0.61) * 0.5 + 0.5;
      var alpha = Math.min(238, Math.round(cord * 202 + knot * 34));
      var shade = Math.min(255, Math.round(232 + cord * 18 + fiber * 4));
      var index = (y * size + x) * 4;
      data[index] = shade;
      data[index + 1] = Math.min(255, shade + 3);
      data[index + 2] = Math.min(255, shade + 5);
      data[index + 3] = alpha;
    }
  }

  var texture = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.magFilter = THREE.LinearFilter;
  texture.minFilter = THREE.LinearFilter;
  texture.needsUpdate = true;
  texture.userData.assetSystem = NET_ALPHA_TEXTURE_SYSTEM;
  texture.userData.netVisualUpgradeSystem = NET_VISUAL_UPGRADE_SYSTEM;
  texture.userData.alphaMeshPattern = "professional-square-120mm-knotted-net";
  texture.userData.visibilityBudget = "ball-priority-continuous-center";
  texture.userData.cellsAcross = cellsAcross;
  texture.userData.cellsHigh = cellsHigh;
  return texture;
}

function createContinuousNetPocketGeometry() {
  var width = GOAL_NET_GEOMETRY.rearHalfWidth * 2;
  var height = GOAL_NET_GEOMETRY.rearHeight;
  var geometry = new THREE.PlaneGeometry(
    width,
    height,
    GOAL_NET_GRID.widthDivisions,
    GOAL_NET_GRID.rearHeightDivisions,
  );
  var positions = geometry.getAttribute("position");

  for (var index = 0; index < positions.count; index += 1) {
    var vertex = getGoalNetPocketVertex(positions.getX(index), positions.getY(index));
    positions.setXYZ(index, vertex.x, vertex.y, vertex.z);
  }

  positions.needsUpdate = true;
  geometry.computeVertexNormals();
  geometry.userData.netContinuitySystem = NET_CONTINUITY_SYSTEM;
  geometry.userData.pocketDepth = GOAL_NET_GEOMETRY.netSlack;
  geometry.userData.cageDepth = GOAL_NET_GEOMETRY.cageDepth;
  geometry.userData.geometryContract = "shared-render-physics-goal-net";
  geometry.userData.anchorLayout = "four-edge-tensioned-center-pocket";
  return geometry;
}

function createContinuousNetPocketMaterial() {
  var netTexture = createSquareGoalNetAlphaTexture();
  var material = new THREE.ShaderMaterial({
    uniforms: {
      netMap: { value: netTexture },
      netOpacity: { value: 0.13 },
      netTint: { value: new THREE.Color("#eef4f1") },
      centerVisibilityFloor: { value: 0.075 },
    },
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform sampler2D netMap;
      uniform float netOpacity;
      uniform vec3 netTint;
      uniform float centerVisibilityFloor;
      varying vec2 vUv;

      void main() {
        vec4 weave = texture2D(netMap, vUv);
        float horizontalEdge = abs(vUv.x - 0.5) * 2.0;
        float verticalEdge = abs(vUv.y - 0.5) * 2.0;
        float edgePresence = smoothstep(0.12, 0.92, max(horizontalEdge, verticalEdge * 0.78));
        float topTensionBand = smoothstep(0.74, 1.0, vUv.y);
        float visibility = max(
          mix(centerVisibilityFloor, 1.0, edgePresence),
          mix(centerVisibilityFloor, 0.82, topTensionBand)
        );
        float alpha = weave.a * netOpacity * visibility;
        if (alpha < 0.0035) discard;
        vec3 fiber = mix(netTint * 0.9, vec3(1.0), weave.r * 0.18);
        gl_FragColor = vec4(fiber, alpha);
      }
    `,
    transparent: true,
    depthWrite: false,
    depthTest: true,
    side: THREE.DoubleSide,
  });
  material.opacity = 0.13;
  material.toneMapped = false;
  material.forceSinglePass = true;
  material.userData.netContinuitySystem = NET_CONTINUITY_SYSTEM;
  material.userData.netAlphaTextureSystem = NET_ALPHA_TEXTURE_SYSTEM;
  material.userData.meshPattern = "professional-square-120mm-knotted-net";
  material.userData.centerVisibilityFloor = 0.075;
  material.userData.visibilityProfile = "soft-center-fade-no-cutout";
  material.userData.ballPriorityCompositing = true;
  material.onBeforeRender = function syncNetOpacity() {
    material.uniforms.netOpacity.value = Math.min(0.24, Math.max(0, material.opacity));
  };
  return material;
}

function createDetailedCageNetPanelGeometry(panel) {
  var isTop = panel === "top";
  var widthSegments = isTop ? GOAL_NET_GRID.widthDivisions : GOAL_NET_GRID.depthDivisions;
  var heightSegments = isTop ? GOAL_NET_GRID.depthDivisions : GOAL_NET_GRID.frontHeightDivisions;
  var positions = [];
  var uvs = [];
  var indices = [];
  var sideSign = panel === "left" ? -1 : 1;

  for (var row = 0; row <= heightSegments; row += 1) {
    var v = row / heightSegments;
    for (var column = 0; column <= widthSegments; column += 1) {
      var u = column / widthSegments;
      var z;
      var x;
      var y;
      if (isTop) {
        z = GOAL_NET_GEOMETRY.netPlaneZ + v * GOAL_NET_GEOMETRY.cageDepth;
        var topHalfWidth = getGoalSideHalfWidthAtZ(z);
        x = -topHalfWidth + u * topHalfWidth * 2;
        var edgeTension = Math.sin(Math.PI * u) * Math.sin(Math.PI * v);
        y = getGoalRoofHeightAtZ(z) - edgeTension * 0.065;
      } else {
        z = GOAL_NET_GEOMETRY.netPlaneZ + u * GOAL_NET_GEOMETRY.cageDepth;
        x = sideSign * getGoalSideHalfWidthAtZ(z);
        var roofHeight = getGoalRoofHeightAtZ(z);
        var sideSlack = Math.sin(Math.PI * u) * Math.sin(Math.PI * v) * 0.028;
        y = Math.max(0, v * roofHeight - sideSlack);
      }
      positions.push(x, y, z);
      uvs.push(u, v);
    }
  }

  var stride = widthSegments + 1;
  for (var gridY = 0; gridY < heightSegments; gridY += 1) {
    for (var gridX = 0; gridX < widthSegments; gridX += 1) {
      var a = gridY * stride + gridX;
      var b = a + 1;
      var c = a + stride + 1;
      var d = a + stride;
      indices.push(a, b, c, a, c, d);
    }
  }

  var geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  geometry.userData.naturalSag = isTop ? 0.065 : 0.028;
  geometry.userData.panel = panel;
  return geometry;
}

function createBraidedNetCordMaterial(options = {}) {
  var material = new THREE.MeshStandardMaterial({
    color: options.color || "#f4fff8",
    transparent: true,
    opacity: options.opacity ?? 0.18,
    roughness: options.roughness ?? 0.72,
    metalness: 0,
    depthWrite: false,
  });
  material.map = createNetCordSurfaceMap("albedo");
  material.bumpMap = createNetCordSurfaceMap("bump");
  material.roughnessMap = createNetCordSurfaceMap("roughness");
  material.bumpScale = options.bumpScale ?? 0.0055;
  material.userData.netMaterialSystem = NET_CORD_MATERIAL_SYSTEM;
  material.userData.netTextureSystem = NET_CORD_TEXTURE_SYSTEM;
  material.userData.sightlineSystem = NET_SIGHTLINE_SYSTEM;
  return material;
}

function createLauncherSurfaceMap(kind, surface) {
  var textureSystem = surface === "rubber"
    ? LAUNCHER_RUBBER_TEXTURE_SYSTEM
    : surface === "gunmetal"
      ? LAUNCHER_GUNMETAL_TEXTURE_SYSTEM
      : LAUNCHER_PAINT_TEXTURE_SYSTEM;
  var repeat = surface === "rubber" ? 2.8 : surface === "gunmetal" ? 4.2 : 3.4;
  var texture = createSurfaceDetailTexture(256, (x, y, size) => {
    var nx = x / size;
    var ny = y / size;
    var grain = Math.sin(x * 17.17 + y * 37.31) * 0.5 + 0.5;
    var brushed = Math.sin((nx * repeat * 8 + Math.sin(ny * 18) * 0.16) * Math.PI * 2) * 0.5 + 0.5;
    var speckle = Math.sin(x * 91.7 + y * 43.3) * 0.5 + 0.5;
    var tread = Math.sin((nx * 18 + ny * 2.4) * Math.PI * 2) * 0.5 + 0.5;

    if (surface === "rubber") {
      if (kind === "roughness") return 194 + tread * 36 + grain * 18;
      if (kind === "bump") return 104 + tread * 84 + speckle * 18;
      return 44 + grain * 26;
    }

    if (surface === "gunmetal") {
      if (kind === "roughness") return 150 + brushed * 54 + grain * 20;
      if (kind === "bump") return 118 + brushed * 48 + speckle * 22;
      return 72 + brushed * 22 + grain * 12;
    }

    if (kind === "roughness") return 148 + (1 - brushed) * 44 + grain * 28;
    if (kind === "bump") return 116 + brushed * 42 + speckle * 24;
    return 154 + brushed * 20 + grain * 10;
  }, repeat, surface === "rubber" ? 1.2 : 2.1);
  texture.userData.assetSystem = textureSystem;
  texture.userData.surfaceKind = kind;
  texture.userData.launcherMaterialSystem = LAUNCHER_PBR_MATERIAL_SYSTEM;
  texture.anisotropy = 4;
  return texture;
}

function applyLauncherMaterialMaps(material, surface, bumpScale) {
  material.bumpMap = createLauncherSurfaceMap("bump", surface);
  material.roughnessMap = createLauncherSurfaceMap("roughness", surface);
  material.bumpScale = bumpScale;
  material.userData.launcherMaterialSystem = LAUNCHER_PBR_MATERIAL_SYSTEM;
  material.userData.launcherSurfaceTextureSystem = surface === "rubber"
    ? LAUNCHER_RUBBER_TEXTURE_SYSTEM
    : surface === "gunmetal"
      ? LAUNCHER_GUNMETAL_TEXTURE_SYSTEM
      : LAUNCHER_PAINT_TEXTURE_SYSTEM;
  return material;
}

function createFootballSurfaceMap(kind) {
  return createSurfaceDetailTexture(512, (x, y, size) => {
    var nx = (x - size / 2) / (size / 2);
    var ny = (y - size / 2) / (size / 2);
    var radius = Math.hypot(nx, ny);
    var angle = Math.atan2(ny, nx);
    var seam = Math.abs(Math.sin(angle * 6 + radius * 7.5)) < 0.045 || Math.abs((radius * 5.2) % 1 - 0.5) < 0.03;
    var panel = Math.sin(angle * 3 - radius * 5.4) * 0.5 + 0.5;
    var grain = Math.sin(x * 43.17 + y * 19.31) * 31415.9;
    var noise = grain - Math.floor(grain);
    if (kind === "roughness") return seam ? 238 : 158 + panel * 44 + noise * 22;
    return seam ? 228 : 118 + panel * 46 + noise * 32;
  });
}

function createGloveLatexSurfaceMap(kind) {
  var texture = createSurfaceDetailTexture(128, (x, y, size) => {
    var nx = x / size;
    var ny = y / size;
    var grain = Math.sin(x * 17.13 + y * 31.71) * 0.5 + 0.5;
    var pore = Math.sin((nx * 42 + Math.sin(ny * 8) * 0.35) * Math.PI * 2) * 0.5 + 0.5;
    var gripWave = Math.sin((ny * 18 + Math.sin(nx * 6) * 0.28) * Math.PI * 2) * 0.5 + 0.5;
    if (kind === "roughness") return 156 + grain * 34 + pore * 28;
    if (kind === "bump") return 118 + gripWave * 72 + grain * 24;
    return 208 + grain * 22 + pore * 18;
  }, 3.2, 3.2);
  texture.userData.assetSystem = GLOVE_LATEX_TEXTURE_SYSTEM;
  texture.userData.surfaceKind = kind;
  return texture;
}

function createGloveTextileSurfaceMap(kind) {
  var texture = createSurfaceDetailTexture(128, (x, y, size) => {
    var nx = x / size;
    var ny = y / size;
    var warp = Math.sin(nx * Math.PI * 2 * 20) * 0.5 + 0.5;
    var weft = Math.sin(ny * Math.PI * 2 * 14) * 0.5 + 0.5;
    var twill = Math.sin((nx * 10 + ny * 10) * Math.PI * 2) * 0.5 + 0.5;
    if (kind === "roughness") return 182 + (1 - twill) * 38 + weft * 22;
    if (kind === "bump") return 104 + Math.max(warp, weft) * 86 + twill * 20;
    return 178 + warp * 18 + weft * 16;
  }, 2.4, 1.8);
  texture.userData.assetSystem = GLOVE_TEXTILE_TEXTURE_SYSTEM;
  texture.userData.surfaceKind = kind;
  return texture;
}

function applyGloveMaterialMaps(material, surface, bumpScale) {
  var latex = surface === "latex";
  material.bumpMap = latex ? createGloveLatexSurfaceMap("bump") : createGloveTextileSurfaceMap("bump");
  material.roughnessMap = latex ? createGloveLatexSurfaceMap("roughness") : createGloveTextileSurfaceMap("roughness");
  material.bumpScale = bumpScale;
  material.userData.gloveMaterialSystem = GLOVE_PBR_MATERIAL_SYSTEM;
  material.userData.gloveSurfaceTextureSystem = latex ? GLOVE_LATEX_TEXTURE_SYSTEM : GLOVE_TEXTILE_TEXTURE_SYSTEM;
  return material;
}

function createFallbackScoreboardTexture(plan) {
  var data = new Uint8Array([
    18, 30, 31, 255,
    28, 53, 50, 255,
    255, 241, 168, 255,
    17, 25, 24, 255,
  ]);
  var texture = new THREE.DataTexture(data, 2, 2, THREE.RGBAFormat);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.magFilter = THREE.LinearFilter;
  texture.minFilter = THREE.LinearFilter;
  texture.needsUpdate = true;
  texture.userData.scoreboardSystem = STADIUM_SCOREBOARD_DISPLAY_SYSTEM;
  texture.userData.signature = plan.signature;
  texture.userData.plan = plan;
  return texture;
}

function drawScoreboardTexture(canvas, plan) {
  var ctx = canvas.getContext("2d");
  if (!ctx) return;

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#111d1e";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  var gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
  gradient.addColorStop(0, "rgba(31, 67, 62, 0.96)");
  gradient.addColorStop(0.56, "rgba(18, 35, 34, 0.98)");
  gradient.addColorStop(1, "rgba(10, 18, 18, 1)");
  ctx.fillStyle = gradient;
  ctx.fillRect(10, 10, canvas.width - 20, canvas.height - 20);

  ctx.fillStyle = plan.accentColor;
  ctx.fillRect(10, 10, canvas.width - 20, 10);
  ctx.globalAlpha = plan.pressure ? 0.34 : 0.18;
  ctx.fillRect(26, 34, canvas.width - 52, canvas.height - 66);
  ctx.globalAlpha = 1;

  ctx.fillStyle = "#f8fff0";
  ctx.font = "900 34px Inter, Arial, sans-serif";
  ctx.textBaseline = "top";
  ctx.fillText(plan.status, 28, 32);

  ctx.fillStyle = plan.accentColor;
  ctx.font = "950 76px Inter, Arial, sans-serif";
  ctx.fillText(plan.scoreText, 28, 78);

  ctx.fillStyle = "#f8fff0";
  ctx.textAlign = "right";
  ctx.font = "900 40px Inter, Arial, sans-serif";
  ctx.fillText(plan.timeText, canvas.width - 28, 44);

  ctx.fillStyle = "rgba(248,255,240,0.82)";
  ctx.font = "800 22px Inter, Arial, sans-serif";
  ctx.fillText(plan.difficultyText, canvas.width - 30, 92);

  ctx.textAlign = "left";
  ctx.fillStyle = "rgba(248,255,240,0.86)";
  ctx.font = "850 24px Inter, Arial, sans-serif";
  ctx.fillText(plan.detailText, 30, 154);
}

export function createStadiumScoreboardTexture(plan = getStadiumScoreboardPlan()) {
  var scoreboardPlan = plan?.system === STADIUM_SCOREBOARD_DISPLAY_SYSTEM ? plan : getStadiumScoreboardPlan(plan);
  if (typeof document === "undefined" || !document.createElement) {
    return createFallbackScoreboardTexture(scoreboardPlan);
  }

  var canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 192;
  var texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  texture.userData.scoreboardSystem = STADIUM_SCOREBOARD_DISPLAY_SYSTEM;
  updateStadiumScoreboardTexture(texture, scoreboardPlan);
  return texture;
}

export function updateStadiumScoreboardTexture(texture, plan = getStadiumScoreboardPlan()) {
  var scoreboardPlan = plan?.system === STADIUM_SCOREBOARD_DISPLAY_SYSTEM ? plan : getStadiumScoreboardPlan(plan);
  if (!texture) return scoreboardPlan;
  if (texture.userData.signature === scoreboardPlan.signature) return scoreboardPlan;

  texture.userData.scoreboardSystem = STADIUM_SCOREBOARD_DISPLAY_SYSTEM;
  texture.userData.signature = scoreboardPlan.signature;
  texture.userData.plan = scoreboardPlan;

  if (texture.image?.getContext) {
    drawScoreboardTexture(texture.image, scoreboardPlan);
  }
  texture.needsUpdate = true;
  return scoreboardPlan;
}

function createTrainingSurfaceMaterial() {
  var material = new THREE.MeshStandardMaterial({
    color: "#466a6d",
    map: createAcademyCourtSurfaceMap("albedo"),
    bumpMap: createAcademyCourtSurfaceMap("bump"),
    bumpScale: 0.009,
    roughnessMap: createAcademyCourtSurfaceMap("roughness"),
    roughness: 0.88,
    metalness: 0,
  });
  material.userData.materialPipelineSystem = "academy-polymer-training-surface-pbr";
  material.userData.surfacePaletteSystem = "blue-green-academy-court-no-grass";
  material.userData.grassReadabilityGuard = "synthetic-polymer-floor-no-turf-blades";
  return material;
}

function createBeveledBoxGeometry(width, height, depth, radius = 0.04, segments = 3) {
  var safeRadius = Math.max(0.001, Math.min(radius, width * 0.48, height * 0.48, depth * 0.48));
  var geometry = new RoundedBoxGeometry(width, height, depth, segments, safeRadius);
  geometry.userData.beveledAssetSystem = ROUNDED_BOX_BEVELED_PROP_SYSTEM;
  geometry.userData.geometrySource = ROUNDED_BOX_GEOMETRY_SOURCE;
  return geometry;
}

function markBeveledProp(mesh) {
  mesh.userData.beveledAssetSystem = ROUNDED_BOX_BEVELED_PROP_SYSTEM;
  mesh.userData.geometrySource = ROUNDED_BOX_GEOMETRY_SOURCE;
  return mesh;
}

function makeBeveledBox(name, width, height, depth, radius, material, x, y, z, segments = 3) {
  var mesh = new THREE.Mesh(createBeveledBoxGeometry(width, height, depth, radius, segments), material);
  mesh.name = name;
  mesh.position.set(x || 0, y || 0, z || 0);
  return markBeveledProp(mesh);
}

function makeRoundedPart(name, width, height, radius, depth, material, x, y, z) {
  return makeBeveledBox(name, width, height, depth, radius, material, x, y, z, 4);
}

export function createFootballTexture() {
  if (typeof document === "undefined" || !document.createElement) {
    return createFallbackFootballTexture();
  }

  var canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 512;
  var ctx = canvas.getContext("2d");
  var baseGradient = ctx.createRadialGradient(204, 156, 20, 256, 256, 384);
  baseGradient.addColorStop(0, "#ffffff");
  baseGradient.addColorStop(0.58, "#f3f5f4");
  baseGradient.addColorStop(1, "#cfd4d2");
  ctx.fillStyle = baseGradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.strokeStyle = "rgba(20, 25, 27, 0.52)";
  ctx.lineWidth = 4;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  for (var panel = 0; panel < 12; panel += 1) {
    var angle = (panel / 12) * Math.PI * 2;
    var nextAngle = angle + Math.PI / 6;
    var innerX = 256 + Math.cos(angle) * 42;
    var innerY = 256 + Math.sin(angle) * 42;
    var outerX = 256 + Math.cos(angle) * 252;
    var outerY = 256 + Math.sin(angle) * 252;
    var controlX = 256 + Math.cos(nextAngle) * 138;
    var controlY = 256 + Math.sin(nextAngle) * 138;
    ctx.beginPath();
    ctx.moveTo(innerX, innerY);
    ctx.quadraticCurveTo(controlX, controlY, outerX, outerY);
    ctx.stroke();
  }

  [
    [256, 256, 58, "#171d20", -Math.PI / 2],
    [118, 120, 46, "#22292c", -0.2],
    [392, 130, 46, "#171d20", 0.52],
    [145, 392, 44, "#22292c", 0.2],
    [378, 378, 44, "#171d20", -0.7],
  ].forEach(function drawPatch(patch) {
    ctx.beginPath();
    for (var i = 0; i < 5; i += 1) {
      var angle = patch[4] + (i / 5) * Math.PI * 2;
      var px = patch[0] + Math.cos(angle) * patch[2];
      var py = patch[1] + Math.sin(angle) * patch[2];
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fillStyle = patch[3];
    ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,0.34)";
    ctx.lineWidth = 3;
    ctx.stroke();
  });

  ctx.globalAlpha = 0.34;
  ["#20272a", "#4d5659", "#20272a"].forEach(function drawPanelLink(color, index) {
    ctx.strokeStyle = color;
    ctx.lineWidth = 6 - index;
    ctx.beginPath();
    ctx.arc(256, 256, 132 + index * 28, Math.PI * (0.12 + index * 0.16), Math.PI * (0.62 + index * 0.16));
    ctx.stroke();
  });
  ctx.globalAlpha = 1;

  ctx.globalAlpha = 0.28;
  ctx.strokeStyle = "#697174";
  ctx.lineWidth = 2;
  for (var scuff = 0; scuff < 18; scuff += 1) {
    var sx = 92 + ((scuff * 61) % 330);
    var sy = 86 + ((scuff * 97) % 322);
    var length = 16 + (scuff % 5) * 7;
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.quadraticCurveTo(sx + length * 0.38, sy - 6 + (scuff % 4) * 4, sx + length, sy + (scuff % 3) * 3);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;

  ctx.beginPath();
  ctx.arc(337, 236, 15, 0, Math.PI * 2);
  ctx.fillStyle = "#182226";
  ctx.fill();
  ctx.beginPath();
  ctx.arc(337, 236, 7, 0, Math.PI * 2);
  ctx.fillStyle = "#4f5d5e";
  ctx.fill();
  ctx.strokeStyle = "rgba(255,255,255,0.55)";
  ctx.lineWidth = 2;
  ctx.stroke();

  var texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  texture.userData.assetSystem = "classic-neutral-match-ball-texture";
  texture.userData.panelSystem = "classic-dark-pentagon-panel-layout";
  texture.userData.paletteSystem = "neutral-white-charcoal-no-yellow-cast";
  texture.userData.materialSystem = "stitched-classic-match-ball";
  texture.userData.finishSystem = "micro-scuffed-satin-panels";
  texture.userData.surfaceDetailSystem = "micro-scuffs-valve-and-panel-depth";
  texture.userData.valveSystem = "painted-rubber-air-valve";
  texture.userData.polishSystem = MATCHDAY_ASSET_POLISH_SYSTEM;
  return texture;
}

export function createFootballMaterial() {
  var material = new THREE.MeshStandardMaterial({
    color: "#ffffff",
    map: createFootballTexture(),
    bumpMap: createFootballSurfaceMap("bump"),
    bumpScale: 0.018,
    roughnessMap: createFootballSurfaceMap("roughness"),
    roughness: 0.44,
    metalness: 0.015,
  });
  material.userData.materialPipelineSystem = "procedural-match-ball-pbr";
  material.userData.paletteSystem = "neutral-white-charcoal-no-yellow-cast";
  material.userData.surfaceDetailSystem = "raised-seam-and-scuffed-panel-relief";
  material.userData.polishSystem = MATCHDAY_ASSET_POLISH_SYSTEM;
  return material;
}

function createFallbackFootballTexture() {
  var size = 512;
  var data = new Uint8Array(size * size * 4);
  for (var y = 0; y < size; y += 1) {
    for (var x = 0; x < size; x += 1) {
      var index = (y * size + x) * 4;
      var nx = (x - size / 2) / (size / 2);
      var ny = (y - size / 2) / (size / 2);
      var radius = Math.hypot(nx, ny);
      var angle = Math.atan2(ny, nx);
      var seam = Math.abs(Math.sin(angle * 6 + radius * 8)) < 0.055 || Math.abs((radius * 5) % 1 - 0.5) < 0.025;
      var accent = Math.abs(Math.sin(angle * 3 - radius * 5)) < 0.08 && radius > 0.28 && radius < 0.78;
      var neutralPanel = accent ? 28 : 246 - Math.floor(radius * 22);
      data[index] = seam ? 34 : neutralPanel;
      data[index + 1] = seam ? 39 : accent ? 34 : neutralPanel;
      data[index + 2] = seam ? 42 : accent ? 37 : neutralPanel;
      data[index + 3] = 255;
    }
  }
  var texture = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  texture.needsUpdate = true;
  texture.userData.assetSystem = "classic-neutral-match-ball-texture";
  texture.userData.panelSystem = "classic-dark-pentagon-panel-layout";
  texture.userData.paletteSystem = "neutral-white-charcoal-no-yellow-cast";
  texture.userData.materialSystem = "stitched-classic-match-ball";
  texture.userData.finishSystem = "micro-scuffed-satin-panels";
  texture.userData.surfaceDetailSystem = "micro-scuffs-valve-and-panel-depth";
  texture.userData.valveSystem = "painted-rubber-air-valve";
  texture.userData.polishSystem = MATCHDAY_ASSET_POLISH_SYSTEM;
  return texture;
}

export function createFieldGroup() {
  var group = new THREE.Group();
  group.userData.visualStyle = "professional-goalkeeper-academy-court";
  group.userData.polishSystem = MATCHDAY_ASSET_POLISH_SYSTEM;
  group.userData.geometryPolishSystem = ROUNDED_BOX_BEVELED_PROP_SYSTEM;
  group.userData.assetSystem = "stylized-reusable-matchday-kit";
  group.userData.materialPipelineSystem = "procedural-pbr-material-stack";
  group.userData.markingSystem = "clear-academy-court-no-pitch-stripes";
  group.userData.surfaceDetailSystem = "micro-speckled-polymer-floor-goalmouth-shadows";
  group.userData.surfaceFinishSystem = "micro-speckled-polymer-court-no-grass";
  group.userData.stadiumDressingSystem = "quiet-crowd-scoreboard-training-backdrop";
  group.userData.broadcastDressingSystem = "purpose-built-training-lane-safety-system";
  group.userData.stadiumScoreboardSystem = STADIUM_SCOREBOARD_DISPLAY_SYSTEM;
  group.userData.stadiumLightingFinishSystem = "floodlight-lens-and-glare-halo-kit";
  group.userData.reusableAssetTechnique = "procedural-pbr-academy-court-kit";
  group.userData.matchUseDetailSystem = "plain-field-no-grass-clutter";
  group.userData.trainingFacilitySystem = "purpose-built-launcher-service-zone";
  group.userData.trainingLaneSystem = "cohesive-goalkeeper-training-lane";
  group.userData.sideSafetySystem = "stray-ball-containment-padded-rails";
  var surface = new THREE.Mesh(
    new THREE.PlaneGeometry(18, 52, 1, 1),
    createTrainingSurfaceMaterial(),
  );
  surface.name = "field-training-surface";
  surface.rotation.x = -Math.PI / 2;
  surface.position.set(0, -0.025, -14);
  group.add(surface);

  var mouthShadowMaterial = new THREE.MeshBasicMaterial({
    color: "#283b40",
    transparent: true,
    opacity: 0.18,
    depthWrite: false,
  });
  [
    ["left", -RAPIER_GOAL.halfWidth - 0.28],
    ["right", RAPIER_GOAL.halfWidth + 0.28],
  ].forEach(function addGoalmouthShadow(item) {
    var shadow = new THREE.Mesh(new THREE.CircleGeometry(1, 32), mouthShadowMaterial);
    shadow.name = "field-goalmouth-depth-shadow-" + item[0];
    shadow.rotation.x = -Math.PI / 2;
    shadow.scale.set(0.28, 1.55, 1);
    shadow.position.set(item[1], 0.006, RAPIER_GOAL.netPlaneZ - 0.8);
    group.add(shadow);
  });

  var standMatA = new THREE.MeshStandardMaterial({ color: "#264c54", roughness: 0.64, metalness: 0.02 });
  var standMatB = new THREE.MeshStandardMaterial({ color: "#f2f0df", roughness: 0.7, metalness: 0.01 });
  var crowdColors = ["#f0782f", "#f5f0df", "#2d5963", "#7d8b91", "#23383d"];
  for (var s = 0; s < 5; s += 1) {
    var stand = new THREE.Mesh(new THREE.BoxGeometry(2.35, 0.64, 0.62), s % 2 ? standMatB : standMatA);
    stand.name = "stadium-stand-back-" + s;
    stand.position.set(-5.25 + s * 2.65, 0.38, -24.6);
    stand.rotation.x = -0.08;
    group.add(stand);

    var upperStand = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.32, 0.42), s % 2 ? standMatA : standMatB);
    upperStand.name = "stadium-stand-upper-" + s;
    upperStand.position.set(-5.25 + s * 2.65, 0.88, -24.92);
    upperStand.rotation.x = -0.08;
    group.add(upperStand);

    var crowdRow = new THREE.Group();
    crowdRow.name = "stadium-crowd-row-" + s;
    crowdRow.position.set(-5.98 + s * 2.65, 0.72, -24.18);
    for (var person = 0; person < 10; person += 1) {
      var crowdDot = new THREE.Mesh(
        new THREE.BoxGeometry(0.11, 0.12 + (person % 3) * 0.025, 0.055),
        new THREE.MeshStandardMaterial({ color: crowdColors[(s + person) % crowdColors.length], roughness: 0.58 }),
      );
      crowdDot.name = "stadium-crowd-seat-" + s + "-" + person;
      crowdDot.position.set(person * 0.19, (person % 2) * 0.02, 0);
      crowdRow.add(crowdDot);
    }
    group.add(crowdRow);
  }

  var scoreboardMat = new THREE.MeshStandardMaterial({ color: "#172326", roughness: 0.38, metalness: 0.04 });
  var scoreboardGlow = new THREE.MeshBasicMaterial({ color: "#fff1a8", transparent: true, opacity: 0.78 });
  var scoreboard = new THREE.Mesh(new THREE.BoxGeometry(1.65, 0.62, 0.08), scoreboardMat);
  scoreboard.name = "stadium-scoreboard-panel";
  scoreboard.position.set(0, 1.78, -24.72);
  group.add(scoreboard);
  var scoreboardDisplayTexture = createStadiumScoreboardTexture();
  var scoreboardDisplay = new THREE.Mesh(
    new THREE.PlaneGeometry(1.46, 0.48),
    new THREE.MeshBasicMaterial({
      map: scoreboardDisplayTexture,
      toneMapped: false,
    }),
  );
  scoreboardDisplay.name = "stadium-scoreboard-display";
  scoreboardDisplay.userData.scoreboardSystem = STADIUM_SCOREBOARD_DISPLAY_SYSTEM;
  scoreboardDisplay.position.set(0, 1.78, -24.655);
  group.add(scoreboardDisplay);
  for (var digit = 0; digit < 6; digit += 1) {
    var tile = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.08, 0.012), scoreboardGlow.clone());
    tile.name = "stadium-scoreboard-light-tile-" + digit;
    tile.position.set(-0.55 + digit * 0.22, 1.82 + (digit % 2) * 0.12, -24.66);
    group.add(tile);
  }

  var flagPoleMat = new THREE.MeshStandardMaterial({ color: "#f9fff3", roughness: 0.42, metalness: 0.03 });
  var flagMat = new THREE.MeshBasicMaterial({ color: "#f0782f", side: THREE.DoubleSide });
  [
    ["left", -7.28, RAPIER_GOAL.netPlaneZ - 0.18, 1],
    ["right", 7.28, RAPIER_GOAL.netPlaneZ - 0.18, -1],
    ["far-left", -7.28, -21.9, 1],
    ["far-right", 7.28, -21.9, -1],
  ].forEach(function addCornerFlag(item) {
    var pole = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.022, 0.62, 10), flagPoleMat);
    pole.name = "stadium-corner-flag-pole-" + item[0];
    pole.position.set(item[1], 0.31, item[2]);
    group.add(pole);

    var flagShape = new THREE.Shape();
    flagShape.moveTo(0, 0);
    flagShape.lineTo(0.34 * item[3], 0.08);
    flagShape.lineTo(0, 0.18);
    flagShape.lineTo(0, 0);
    var flag = new THREE.Mesh(new THREE.ShapeGeometry(flagShape), flagMat.clone());
    flag.name = "stadium-corner-flag-banner-" + item[0];
    flag.position.set(item[1], 0.58, item[2]);
    flag.rotation.y = item[3] > 0 ? -0.32 : 0.32;
    group.add(flag);
  });

  var boardMaterials = ["#f0782f", "#203f52", "#f6f1df", "#6d7478"].map(
    (color) => new THREE.MeshStandardMaterial({ color, roughness: 0.5, metalness: 0.02 }),
  );
  for (var b = 0; b < 8; b += 1) {
    var board = makeBeveledBox("stadium-ad-board-" + b, 1.25, 0.34, 0.055, 0.035, boardMaterials[b % boardMaterials.length]);
    var side = b % 2 === 0 ? -1 : 1;
    board.position.set(side * 7.08, 0.22, -8.8 + Math.floor(b / 2) * 3.6);
    board.rotation.y = side > 0 ? -Math.PI / 2 + 0.04 : Math.PI / 2 - 0.04;
    group.add(board);
  }

  var poleMat = new THREE.MeshStandardMaterial({ color: "#263538", roughness: 0.42, metalness: 0.12 });
  var lampMat = new THREE.MeshBasicMaterial({ color: "#fff4c8", transparent: true, opacity: 0.84 });
  var lensCellMaterial = new THREE.MeshBasicMaterial({
    color: "#fff8d6",
    transparent: true,
    opacity: 0.88,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  var glareCoreMaterial = new THREE.MeshBasicMaterial({
    color: "#fff1a8",
    transparent: true,
    opacity: 0.28,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
  });
  var glareRingMaterial = new THREE.MeshBasicMaterial({
    color: "#e7ffff",
    transparent: true,
    opacity: 0.14,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
  });
  [
    ["left-back", -7.2, -22.0],
    ["right-back", 7.2, -22.0],
    ["left-mid", -7.4, -8.0],
    ["right-mid", 7.4, -8.0],
  ].forEach(function addFloodlight(item, floodlightIndex) {
    var mast = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.052, 2.6, 10), poleMat);
    mast.name = "stadium-floodlight-mast-" + item[0];
    mast.position.set(item[1], 1.28, item[2]);
    group.add(mast);

    var head = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.2, 0.07), lampMat);
    head.name = "stadium-floodlight-head-" + item[0];
    head.position.set(item[1], 2.62, item[2] + 0.08);
    head.rotation.y = item[1] < 0 ? -0.32 : 0.32;
    group.add(head);

    [-0.13, 0.13].forEach(function addLensColumn(offsetX, columnIndex) {
      [-0.045, 0.045].forEach(function addLensRow(offsetY, rowIndex) {
        var cell = new THREE.Mesh(new THREE.CircleGeometry(0.046, 16), lensCellMaterial.clone());
        cell.name = "stadium-floodlight-lens-cell-" + item[0] + "-" + columnIndex + "-" + rowIndex;
        cell.position.set(item[1] + offsetX, 2.62 + offsetY, item[2] + 0.121);
        cell.rotation.y = head.rotation.y;
        cell.userData.lightingFinishSystem = "floodlight-lens-and-glare-halo-kit";
        group.add(cell);
      });
    });

    var glareCore = new THREE.Mesh(new THREE.CircleGeometry(0.34, 28), glareCoreMaterial.clone());
    glareCore.name = "stadium-floodlight-glare-core-" + item[0];
    glareCore.position.set(item[1], 2.62, item[2] + 0.136);
    glareCore.rotation.y = head.rotation.y;
    glareCore.renderOrder = 2 + floodlightIndex;
    glareCore.userData.lightingFinishSystem = "floodlight-lens-and-glare-halo-kit";
    group.add(glareCore);

    var glareRing = new THREE.Mesh(new THREE.RingGeometry(0.26, 0.48, 36), glareRingMaterial.clone());
    glareRing.name = "stadium-floodlight-glare-ring-" + item[0];
    glareRing.position.set(item[1], 2.62, item[2] + 0.142);
    glareRing.rotation.y = head.rotation.y;
    glareRing.renderOrder = 6 + floodlightIndex;
    glareRing.userData.lightingFinishSystem = "floodlight-lens-and-glare-halo-kit";
    group.add(glareRing);
  });

  var broadcastPadMaterial = new THREE.MeshStandardMaterial({ color: "#1f3435", roughness: 0.58, metalness: 0.02 });
  for (var padIndex = 0; padIndex < 4; padIndex += 1) {
    var padSide = padIndex % 2 === 0 ? -1 : 1;
    var pad = makeBeveledBox("broadcast-sideline-safety-pad-" + padIndex, 0.22, 0.18, 1.35, 0.045, broadcastPadMaterial.clone());
    pad.position.set(padSide * 7.52, 0.11, -4.8 - Math.floor(padIndex / 2) * 4.2);
    pad.rotation.y = padSide > 0 ? -0.05 : 0.05;
    group.add(pad);
  }

  ["left", "right"].forEach(function addBroadcastCameraPod(side, index) {
    var sign = side === "left" ? -1 : 1;
    var pod = new THREE.Group();
    pod.name = "broadcast-camera-pod-" + side;
    pod.position.set(sign * 7.62, 0.18, -1.4 - index * 1.8);
    pod.rotation.y = sign > 0 ? -Math.PI / 2 + 0.16 : Math.PI / 2 - 0.16;

    var base = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.12, 0.28), new THREE.MeshStandardMaterial({ color: "#18262a", roughness: 0.5, metalness: 0.08 }));
    base.name = "broadcast-camera-pod-base-" + side;
    var lens = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.062, 0.18, 14), new THREE.MeshStandardMaterial({ color: "#0e171a", roughness: 0.32, metalness: 0.16 }));
    lens.name = "broadcast-camera-pod-lens-" + side;
    lens.rotation.x = Math.PI / 2;
    lens.position.set(0, 0.02, 0.18);
    var tally = new THREE.Mesh(new THREE.CircleGeometry(0.018, 12), new THREE.MeshBasicMaterial({ color: "#ff7846", transparent: true, opacity: 0.8 }));
    tally.name = "broadcast-camera-pod-tally-" + side;
    tally.position.set(0.07 * sign, 0.055, 0.145);
    pod.add(base, lens, tally);
    group.add(pod);
  });

  var lightConeMaterial = new THREE.MeshBasicMaterial({
    color: "#fff1a8",
    transparent: true,
    opacity: 0.004,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  [
    ["left-back", -5.9, 1.46, -20.2, -0.22],
    ["right-back", 5.9, 1.46, -20.2, 0.22],
    ["left-mid", -5.8, 1.18, -9.8, -0.16],
    ["right-mid", 5.8, 1.18, -9.8, 0.16],
  ].forEach(function addLightCone(item) {
    var cone = new THREE.Mesh(new THREE.ConeGeometry(1.6, 3.4, 4, 1, true), lightConeMaterial.clone());
    cone.name = "stadium-light-cone-" + item[0];
    cone.position.set(item[1], item[2], item[3]);
    cone.rotation.set(Math.PI / 2.9, item[4], Math.PI / 4);
    group.add(cone);
  });

  var vignetteMaterial = new THREE.MeshBasicMaterial({
    color: "#111b21",
    transparent: true,
    opacity: 0.018,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  ["left", "right"].forEach(function addDepthVignette(side) {
    var sign = side === "left" ? -1 : 1;
    var vignette = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 13.4), vignetteMaterial.clone());
    vignette.name = "stadium-depth-vignette-" + side;
    vignette.position.set(sign * 8.05, 0.62, -11.8);
    vignette.rotation.y = sign > 0 ? -Math.PI / 2 : Math.PI / 2;
    group.add(vignette);
  });

  var facilityMat = new THREE.MeshStandardMaterial({ color: "#22343b", roughness: 0.58, metalness: 0.04 });
  var facilityPanelMat = new THREE.MeshStandardMaterial({ color: "#f4f1dc", roughness: 0.62, metalness: 0.01 });
  var facilityAccentMat = new THREE.MeshBasicMaterial({ color: "#ff8b3d", transparent: true, opacity: 0.88 });
  var facilityGlowMat = new THREE.MeshBasicMaterial({ color: "#61f0ff", transparent: true, opacity: 0.28, depthWrite: false });
  [
    ["left", -1.05, 0.72, -24.36, 0.12, 1.42, 0.12],
    ["right", 1.05, 0.72, -24.36, 0.12, 1.42, 0.12],
    ["header", 0, 1.46, -24.36, 2.32, 0.18, 0.12],
  ].forEach(function addTunnelPart(item) {
    var part = new THREE.Mesh(new THREE.BoxGeometry(item[4], item[5], item[6]), facilityMat);
    part.name = "training-ground-tunnel-" + item[0];
    part.position.set(item[1], item[2], item[3]);
    group.add(part);
  });
  var tunnelGlow = new THREE.Mesh(new THREE.PlaneGeometry(1.82, 1.08), facilityGlowMat);
  tunnelGlow.name = "training-ground-tunnel-glow";
  tunnelGlow.position.set(0, 0.86, -24.28);
  group.add(tunnelGlow);

  var equipmentCart = new THREE.Group();
  equipmentCart.name = "training-ground-equipment-cart";
  equipmentCart.position.set(-6.28, 0.12, -5.6);
  equipmentCart.rotation.y = 0.18;
  var cartBase = makeBeveledBox("training-ground-equipment-cart-base", 0.74, 0.16, 0.44, 0.055, facilityMat);
  cartBase.position.set(0, 0.18, 0);
  var cartBasket = new THREE.Mesh(new THREE.BoxGeometry(0.66, 0.32, 0.36), new THREE.MeshBasicMaterial({
    color: "#f8fff0",
    transparent: true,
    opacity: 0.22,
    wireframe: true,
  }));
  cartBasket.name = "training-ground-equipment-cart-basket";
  cartBasket.position.set(0, 0.43, 0);
  equipmentCart.add(cartBase, cartBasket);
  [-0.28, 0.28].forEach(function addCartWheel(x, index) {
    var wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.045, 14), new THREE.MeshStandardMaterial({ color: "#11191e", roughness: 0.52 }));
    wheel.name = "training-ground-equipment-cart-wheel-" + index;
    wheel.rotation.z = Math.PI / 2;
    wheel.position.set(x, 0.05, 0.22);
    equipmentCart.add(wheel);
  });
  group.add(equipmentCart);

  var spareBallMat = new THREE.MeshStandardMaterial({ color: "#f8f4e7", roughness: 0.42, metalness: 0.01 });
  for (var spareBallIndex = 0; spareBallIndex < 5; spareBallIndex += 1) {
    var spareBall = new THREE.Mesh(new THREE.SphereGeometry(0.095, 20, 14), spareBallMat.clone());
    spareBall.name = "training-ground-spare-ball-" + spareBallIndex;
    spareBall.position.set(-6.55 + (spareBallIndex % 3) * 0.24, 0.28 + Math.floor(spareBallIndex / 3) * 0.13, -5.72 + (spareBallIndex % 2) * 0.18);
    group.add(spareBall);
  }

  var benchSeat = makeBeveledBox("training-ground-coach-bench-seat", 1.18, 0.08, 0.24, 0.035, facilityPanelMat);
  benchSeat.position.set(6.1, 0.32, -4.35);
  var benchBack = makeBeveledBox("training-ground-coach-bench-back", 1.18, 0.32, 0.07, 0.032, facilityMat);
  benchBack.position.set(6.1, 0.56, -4.48);
  var benchShadow = new THREE.Mesh(new THREE.CircleGeometry(1, 28), new THREE.MeshBasicMaterial({
    color: "#182226",
    transparent: true,
    opacity: 0.18,
    depthWrite: false,
  }));
  benchShadow.name = "training-ground-coach-bench-shadow";
  benchShadow.rotation.x = -Math.PI / 2;
  benchShadow.scale.set(0.78, 0.18, 1);
  benchShadow.position.set(6.1, 0.01, -4.28);
  group.add(benchSeat, benchBack, benchShadow);

  var cooler = makeBeveledBox("training-ground-hydration-cooler", 0.32, 0.34, 0.28, 0.052, new THREE.MeshStandardMaterial({ color: "#61f0ff", roughness: 0.46, metalness: 0.01 }));
  cooler.position.set(5.32, 0.22, -3.82);
  var coolerLid = makeBeveledBox("training-ground-hydration-cooler-lid", 0.34, 0.055, 0.3, 0.026, facilityPanelMat);
  coolerLid.position.set(5.32, 0.42, -3.82);
  group.add(cooler, coolerLid);

  var tacticBoard = new THREE.Mesh(new THREE.PlaneGeometry(0.78, 0.46), new THREE.MeshBasicMaterial({
    color: "#f8fff0",
    transparent: true,
    opacity: 0.76,
    side: THREE.DoubleSide,
  }));
  tacticBoard.name = "training-ground-tactic-board";
  tacticBoard.position.set(6.6, 0.76, -3.72);
  tacticBoard.rotation.y = -0.62;
  group.add(tacticBoard);
  for (var tacticDot = 0; tacticDot < 5; tacticDot += 1) {
    var dot = new THREE.Mesh(new THREE.CircleGeometry(0.025, 12), tacticDot % 2 ? facilityAccentMat.clone() : new THREE.MeshBasicMaterial({ color: "#203f52" }));
    dot.name = "training-ground-tactic-board-marker-" + tacticDot;
    dot.position.set(6.6 - 0.23 + tacticDot * 0.095, 0.77 + (tacticDot % 2 ? 0.07 : -0.06), -3.715);
    dot.rotation.y = -0.62;
    group.add(dot);
  }

  [
    ["left", -4.4],
    ["right", 4.4],
  ].forEach(function addIdentityBanner(item) {
    var banner = new THREE.Mesh(new THREE.PlaneGeometry(1.34, 0.28), facilityAccentMat.clone());
    banner.name = "training-ground-identity-banner-" + item[0];
    banner.position.set(item[1], 1.36, -24.18);
    banner.material.opacity = 0.66;
    group.add(banner);
  });

  var retiredDecorationPatterns = [
    /^stadium-corner-flag-/,
    /^stadium-ad-board-/,
    /^broadcast-camera-pod-/,
    /^broadcast-sideline-safety-pad-/,
    /^stadium-light-cone-/,
    /^stadium-depth-vignette-/,
    /^training-ground-tunnel-/,
    /^training-ground-equipment-cart/,
    /^training-ground-spare-ball-/,
    /^training-ground-coach-bench-/,
    /^training-ground-hydration-cooler/,
    /^training-ground-tactic-board/,
    /^training-ground-identity-banner-/,
    /^stadium-floodlight-(mast|head|glare-core|glare-ring)-(left|right)-mid$/,
    /^stadium-floodlight-lens-cell-(left|right)-mid-/,
  ];
  var retiredDecorations = [];
  group.traverse(function collectRetiredDecoration(node) {
    if (retiredDecorationPatterns.some((pattern) => pattern.test(node.name || ""))) {
      retiredDecorations.push(node);
    }
  });
  retiredDecorations.forEach(function removeRetiredDecoration(node) {
    node.parent?.remove(node);
  });
  group.userData.retiredDecorationCount = retiredDecorations.length;

  var laneFrameMaterial = new THREE.MeshStandardMaterial({
    color: "#21383d",
    roughness: 0.58,
    metalness: 0.06,
  });
  var lanePadMaterial = new THREE.MeshStandardMaterial({
    color: "#edf2ed",
    roughness: 0.72,
    metalness: 0.01,
  });
  var laneAccentMaterial = new THREE.MeshStandardMaterial({
    color: "#e77932",
    roughness: 0.54,
    metalness: 0.02,
  });
  ["left", "right"].forEach(function addTrainingLaneBarrier(side) {
    var sign = side === "left" ? -1 : 1;
    [-1.8, -6.2, -10.6, -15].forEach(function addBarrierSegment(z, index) {
      var barrier = makeBeveledBox(
        "training-lane-safety-barrier-" + side + "-segment-" + index,
        0.22,
        0.42,
        3.72,
        0.075,
        laneFrameMaterial.clone(),
      );
      barrier.position.set(sign * 7.02, 0.22, z);
      barrier.userData.visualPurpose = "contain-stray-balls-and-protect-equipment";

      var pad = makeBeveledBox(
        "training-lane-impact-pad-" + side + "-segment-" + index,
        0.12,
        0.25,
        2.86,
        0.055,
        lanePadMaterial.clone(),
      );
      pad.position.set(sign * 6.88, 0.27, z);
      pad.userData.visualPurpose = "soften-ball-impact-and-unify-sideline";

      var topRail = makeBeveledBox(
        "training-lane-top-rail-" + side + "-segment-" + index,
        0.25,
        0.075,
        3.78,
        0.032,
        lanePadMaterial.clone(),
      );
      topRail.position.set(sign * 7.02, 0.47, z);

      var marker = makeBeveledBox(
        "training-lane-safety-marker-" + side + "-segment-" + index,
        0.14,
        0.28,
        0.18,
        0.035,
        laneAccentMaterial.clone(),
      );
      marker.position.set(sign * 6.86, 0.28, z + 1.36);
      group.add(barrier, pad, topRail, marker);
    });
  });

  var servicePad = makeBeveledBox(
    "training-lane-launcher-service-pad",
    5.4,
    0.08,
    2.9,
    0.16,
    laneFrameMaterial.clone(),
    0,
    0.015,
    -19.1,
  );
  servicePad.userData.visualPurpose = "stabilize-launcher-and-organize-service-zone";
  group.add(servicePad);

  [-2.48, 2.48].forEach(function addServicePadEdge(x, index) {
    var edge = makeBeveledBox(
      "training-lane-service-pad-edge-" + index,
      0.16,
      0.035,
      2.42,
      0.03,
      laneAccentMaterial.clone(),
      x,
      0.072,
      -19.1,
    );
    group.add(edge);
  });

  var ballRack = new THREE.Group();
  ballRack.name = "training-lane-ball-rack";
  ballRack.position.set(-2.05, 0.16, -19.05);
  ballRack.userData.visualPurpose = "store-ready-balls-for-continuous-drills";
  var rackBase = makeBeveledBox(
    "training-lane-ball-rack-base",
    1.05,
    0.18,
    0.58,
    0.075,
    laneFrameMaterial.clone(),
  );
  rackBase.position.y = 0.12;
  ballRack.add(rackBase);
  [-0.46, 0.46].forEach(function addRackUpright(x, index) {
    var upright = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.045, 0.72, 12), lanePadMaterial.clone());
    upright.name = "training-lane-ball-rack-upright-" + index;
    upright.position.set(x, 0.48, 0);
    ballRack.add(upright);
  });
  var rackBallMaterial = createFootballMaterial();
  [
    [-0.3, 0.37, 0],
    [0, 0.37, 0],
    [0.3, 0.37, 0],
    [0, 0.64, 0],
  ].forEach(function addRackBall(position, index) {
    var ball = new THREE.Mesh(new THREE.SphereGeometry(0.125, 24, 18), rackBallMaterial.clone());
    ball.name = "training-lane-rack-ball-" + index;
    ball.position.set(position[0], position[1], position[2]);
    ball.rotation.set(index * 0.42, index * 0.68, 0);
    ballRack.add(ball);
  });
  group.add(ballRack);

  var controlCabinet = makeBeveledBox(
    "training-lane-control-cabinet",
    0.86,
    1.08,
    0.58,
    0.11,
    laneFrameMaterial.clone(),
    2.02,
    0.58,
    -19.18,
  );
  controlCabinet.userData.visualPurpose = "control-shot-speed-spin-and-drill-mode";
  var controlDisplay = makeBeveledBox(
    "training-lane-control-display",
    0.58,
    0.35,
    0.035,
    0.045,
    new THREE.MeshBasicMaterial({ color: "#a8d6cf", toneMapped: false }),
    2.02,
    0.72,
    -18.87,
  );
  controlDisplay.userData.visualPurpose = "show-launcher-status-and-current-drill";
  group.add(controlCabinet, controlDisplay);

  [-2.86, 2.86].forEach(function addSafetyBollard(x, index) {
    var bollard = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.09, 0.64, 14), lanePadMaterial.clone());
    bollard.name = "training-lane-safety-bollard-" + index;
    bollard.position.set(x, 0.33, -17.78);
    bollard.userData.visualPurpose = "mark-no-entry-zone-around-launcher";
    var band = new THREE.Mesh(new THREE.CylinderGeometry(0.076, 0.076, 0.12, 14), laneAccentMaterial.clone());
    band.name = "training-lane-safety-bollard-band-" + index;
    band.position.y = 0.12;
    bollard.add(band);
    group.add(bollard);
  });

  return group;
}

export function createGoalAndNet() {
  var group = new THREE.Group();
  group.userData.polishSystem = MATCHDAY_ASSET_POLISH_SYSTEM;
  group.userData.geometryPolishSystem = ROUNDED_BOX_BEVELED_PROP_SYSTEM;
  group.userData.assetSystem = "professional-freestanding-training-goal-kit";
  group.userData.goalConstructionSystem = "integrated-white-tube-return-frame";
  group.userData.frameDetailSystem = "rounded-posts-with-tensioned-net";
  group.userData.netPocketSystem = "localized-net-pocket-deformation";
  group.userData.netHardwareSystem = "integrated-frame-bound-net";
  group.userData.netWeaveSystem = "knotted-diagonal-net-weave";
  group.userData.netCordVolumeSystem = "raised-rope-net-cord-layer";
  group.userData.dynamicNetDetailSystem = "reactive-woven-net-detail-kit";
  group.userData.frameAssemblySystem = "slim-white-portable-goal-frame";
  group.userData.goalEquipmentPolishSystem = "clean-training-ground-goal-equipment";
  group.userData.depthReadabilitySystem = "goal-net-depth-contact-shadow-kit";
  group.userData.netReadabilitySystem = "ball-first-ultra-light-net-cords";
  group.userData.netRealismSystem = "naturally-sagged-square-training-net";
  group.userData.netTextureSystem = NET_CORD_TEXTURE_SYSTEM;
  group.userData.netSightlineSystem = NET_SIGHTLINE_SYSTEM;
  group.userData.netDepthSystem = NET_DEPTH_SYSTEM;
  group.userData.netProfessionalSystem = NET_PROFESSIONAL_SYSTEM;
  group.userData.netOcclusionBudgetSystem = NET_OCCLUSION_BUDGET_SYSTEM;
  group.userData.netCenterWindowSystem = NET_CENTER_WINDOW_SYSTEM;
  group.userData.netRealismUpgradeSystem = NET_REALISM_UPGRADE_SYSTEM;
  group.userData.netMatchdayLacingSystem = NET_MATCHDAY_LACING_SYSTEM;
  group.userData.netLaneGuardSystem = NET_LANE_GUARD_SYSTEM;
  group.userData.netMatchGradeTextureSystem = NET_MATCH_GRADE_TEXTURE_SYSTEM;
  group.userData.netShotLaneVisibilitySystem = NET_SHOT_LANE_VISIBILITY_SYSTEM;
  group.userData.netPhotorealTextureSystem = NET_PHOTOREAL_TEXTURE_SYSTEM;
  group.userData.netLandscapeSightlineSystem = NET_LANDSCAPE_SIGHTLINE_SYSTEM;
  group.userData.netVisualUpgradeSystem = NET_VISUAL_UPGRADE_SYSTEM;
  group.userData.netBroadcastSightlineSystem = NET_BROADCAST_SIGHTLINE_SYSTEM;
  group.userData.netLaneCutoutSystem = NET_LANE_CUTOUT_SYSTEM;
  group.userData.netContinuitySystem = NET_CONTINUITY_SYSTEM;
  group.userData.netFrameAttachmentSystem = NET_FRAME_ATTACHMENT_SYSTEM;
  group.userData.matchUseDetailSystem = "clean-match-goal-no-decorative-wear";
  var dynamicNetDetails = [];
  var keeperSightline = {
    halfWidth: 1.24,
    minY: 0.36,
    maxY: Math.min(RAPIER_GOAL.height - 0.14, 2.18),
  };

  function isInKeeperSightline(point) {
    return (
      Math.abs(point.x) < keeperSightline.halfWidth &&
      point.y > keeperSightline.minY &&
      point.y < keeperSightline.maxY
    );
  }

  function isInMobileLandscapeSightline(point) {
    return (
      Math.abs(point.x) < 1.34 &&
      point.y > 0.28 &&
      point.y < 2.24
    );
  }

  function registerDynamicNetDetail(object, motionScale, opacityScale) {
    object.userData.dynamicNetDetailSystem = "reactive-woven-net-detail-kit";
    object.userData.dynamicNetMotionScale = motionScale;
    dynamicNetDetails.push({
      name: object.name,
      object,
      basePosition: object.position.clone(),
      baseOpacity: Number.isFinite(object.material?.opacity) ? object.material.opacity : null,
      motionScale,
      opacityScale,
      anchoredPanel: Boolean(object.userData.anchoredPanel),
    });
    return object;
  }

  var frameMaterial = new THREE.MeshStandardMaterial({ color: "#f5fff7", roughness: 0.34, metalness: 0.04 });
  function markGoalFrameSegment(object, segmentName) {
    var segment = GOAL_FRAME_SEGMENTS.find((item) => item.name === segmentName);
    object.userData.goalFrameSegment = segmentName;
    object.userData.segmentStart = { ...segment.start };
    object.userData.segmentEnd = { ...segment.end };
    return object;
  }
  var postGeometry = new THREE.CylinderGeometry(0.065, 0.065, 1, 24);
  var left = new THREE.Mesh(postGeometry, frameMaterial);
  var right = new THREE.Mesh(postGeometry, frameMaterial);
  var top = new THREE.Mesh(postGeometry, frameMaterial);
  left.name = "goal-frame-left-post";
  right.name = "goal-frame-right-post";
  top.name = "goal-frame-crossbar";
  setLimb(left, { x: -RAPIER_GOAL.halfWidth, y: 0, z: RAPIER_GOAL.netPlaneZ }, {
    x: -RAPIER_GOAL.halfWidth,
    y: RAPIER_GOAL.height,
    z: RAPIER_GOAL.netPlaneZ,
  });
  setLimb(right, { x: RAPIER_GOAL.halfWidth, y: 0, z: RAPIER_GOAL.netPlaneZ }, {
    x: RAPIER_GOAL.halfWidth,
    y: RAPIER_GOAL.height,
    z: RAPIER_GOAL.netPlaneZ,
  });
  setLimb(top, { x: -RAPIER_GOAL.halfWidth - 0.02, y: RAPIER_GOAL.height, z: RAPIER_GOAL.netPlaneZ }, {
    x: RAPIER_GOAL.halfWidth + 0.02,
    y: RAPIER_GOAL.height,
    z: RAPIER_GOAL.netPlaneZ,
  });
  markGoalFrameSegment(left, "front-left-post");
  markGoalFrameSegment(right, "front-right-post");
  markGoalFrameSegment(top, "crossbar");
  group.add(left, right, top);

  GOAL_RETURN_FRAME_SEGMENTS.forEach(function addReturnFrameRail(segment) {
    var rail = makeLimb("#e8eeeb", GOAL_NET_GEOMETRY.frameRadius * 0.54);
    rail.name = "goal-frame-return-" + segment.name;
    rail.material.roughness = 0.48;
    rail.material.metalness = 0.02;
    rail.userData.visualOnly = true;
    rail.userData.goalSupportSystem = "integrated-white-return-frame";
    rail.userData.segmentStart = { ...segment.start };
    rail.userData.segmentEnd = { ...segment.end };
    setLimb(rail, segment.start, segment.end);
    group.add(rail);
  });

  var capMaterial = new THREE.MeshStandardMaterial({ color: "#fbfff3", roughness: 0.28, metalness: 0.05 });
  [
    ["left-bottom", -RAPIER_GOAL.halfWidth, 0.02, RAPIER_GOAL.netPlaneZ],
    ["left-top", -RAPIER_GOAL.halfWidth, RAPIER_GOAL.height, RAPIER_GOAL.netPlaneZ],
    ["right-bottom", RAPIER_GOAL.halfWidth, 0.02, RAPIER_GOAL.netPlaneZ],
    ["right-top", RAPIER_GOAL.halfWidth, RAPIER_GOAL.height, RAPIER_GOAL.netPlaneZ],
  ].forEach(function addFrameCap(item) {
    var cap = new THREE.Mesh(new THREE.SphereGeometry(0.072, 20, 14), capMaterial);
    cap.name = "goal-frame-post-cap-" + item[0];
    cap.position.set(item[1], item[2], item[3]);
    group.add(cap);
  });

  var netMaterial = new THREE.MeshBasicMaterial({
    color: "#dff8ff",
    transparent: true,
    opacity: 0,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  var net = new THREE.Mesh(new THREE.PlaneGeometry(GOAL_NET_GEOMETRY.rearHalfWidth * 2, GOAL_NET_GEOMETRY.rearHeight, 18, 8), netMaterial);
  net.name = "goal-net-back-panel";
  net.userData.deformationSystem = "localized-net-pocket-deformation";
  net.userData.anchoredPanel = true;
  net.position.set(0, GOAL_NET_GEOMETRY.rearHeight / 2, GOAL_CAGE_POINTS.rearBottomLeft.z);
  group.add(net);

  var continuousPocketShell = new THREE.Mesh(
    createContinuousNetPocketGeometry(),
    createContinuousNetPocketMaterial(),
  );
  continuousPocketShell.name = "goal-net-continuous-pocket-shell";
  continuousPocketShell.position.set(0, GOAL_NET_GEOMETRY.rearHeight / 2, RAPIER_GOAL.netPlaneZ + GOAL_NET_GEOMETRY.shellOffsetZ);
  continuousPocketShell.renderOrder = 2;
  continuousPocketShell.userData.netContinuitySystem = NET_CONTINUITY_SYSTEM;
  continuousPocketShell.userData.netVisualUpgradeSystem = NET_VISUAL_UPGRADE_SYSTEM;
  continuousPocketShell.userData.rearPocketLayer = "continuous-shaped-pocket";
  continuousPocketShell.userData.behindShotLane = true;
  continuousPocketShell.userData.crossesKeeperSightline = true;
  continuousPocketShell.userData.hasShotWindowCutout = false;
  continuousPocketShell.userData.frontShotLaneOcclusion = 0;
  continuousPocketShell.userData.ballPriorityRenderOrder = 12;
  continuousPocketShell.userData.goalNetPanel = "rear";
  continuousPocketShell.userData.anchoredPanel = true;
  continuousPocketShell.userData.netGridDivisions = {
    width: GOAL_NET_GRID.widthDivisions,
    height: GOAL_NET_GRID.rearHeightDivisions,
  };
  group.add(registerDynamicNetDetail(continuousPocketShell, 0.16, 0.035));

  var frameContactShadowMaterial = new THREE.MeshBasicMaterial({
    color: "#17242b",
    transparent: true,
    opacity: 0.22,
    depthWrite: false,
  });
  [
    ["left-post", -RAPIER_GOAL.halfWidth, RAPIER_GOAL.netPlaneZ + 0.02, 0.28, 0.12],
    ["right-post", RAPIER_GOAL.halfWidth, RAPIER_GOAL.netPlaneZ + 0.02, 0.28, 0.12],
    ["rear-cord", 0, GOAL_CAGE_POINTS.rearBottomLeft.z - 0.08, 1.55, 0.11],
  ].forEach(function addFrameContactShadow(item) {
    var shadow = new THREE.Mesh(new THREE.CircleGeometry(1, 32), frameContactShadowMaterial.clone());
    shadow.name = "goal-frame-contact-shadow-" + item[0];
    shadow.rotation.x = -Math.PI / 2;
    shadow.scale.set(item[3], item[4], 1);
    shadow.position.set(item[1], 0.008, item[2]);
    group.add(shadow);
  });

  if (BUILD_RETIRED_NET_LAYERS) {
    var depthHazeMaterial = new THREE.MeshBasicMaterial({
    color: "#dff8ff",
    transparent: true,
    opacity: 0,
    depthWrite: false,
    side: THREE.DoubleSide,
    });
  [
    ["back-panel", 0, RAPIER_GOAL.height * 0.54, RAPIER_GOAL.netPlaneZ + 0.24, RAPIER_GOAL.halfWidth * 1.7, RAPIER_GOAL.height * 0.72, 0],
    ["rear-pocket", 0, RAPIER_GOAL.height * 0.34, RAPIER_GOAL.netPlaneZ + 0.74, RAPIER_GOAL.halfWidth * 1.35, RAPIER_GOAL.height * 0.42, 0],
  ].forEach(function addNetDepthHaze(item) {
    var haze = new THREE.Mesh(new THREE.PlaneGeometry(item[4], item[5]), depthHazeMaterial.clone());
    haze.name = "goal-net-depth-haze-" + item[0];
    haze.position.set(item[1], item[2], item[3]);
    haze.rotation.y = item[6];
    group.add(haze);
  });
  }

  var gridMaterial = new THREE.LineBasicMaterial({
    color: "#f5ffff",
    transparent: true,
    opacity: 0,
    depthWrite: false,
  });
  var linePoints = [];
  function addGridSegment(a, b) {
    linePoints.push(new THREE.Vector3(a.x, a.y, a.z));
    linePoints.push(new THREE.Vector3(b.x, b.y, b.z));
  }
  for (var x = -RAPIER_GOAL.halfWidth; x <= RAPIER_GOAL.halfWidth + 0.01; x += 0.42) {
    if (Math.abs(x) < keeperSightline.halfWidth) {
      addGridSegment(
        { x, y: 0, z: RAPIER_GOAL.netPlaneZ + 0.09 },
        { x, y: keeperSightline.minY, z: RAPIER_GOAL.netPlaneZ + 0.09 },
      );
      addGridSegment(
        { x, y: keeperSightline.maxY, z: RAPIER_GOAL.netPlaneZ + 0.09 },
        { x, y: RAPIER_GOAL.height, z: RAPIER_GOAL.netPlaneZ + 0.09 },
      );
    } else {
      addGridSegment(
        { x, y: 0, z: RAPIER_GOAL.netPlaneZ + 0.09 },
        { x, y: RAPIER_GOAL.height, z: RAPIER_GOAL.netPlaneZ + 0.09 },
      );
    }
  }
  for (var y = 0; y <= RAPIER_GOAL.height + 0.01; y += 0.28) {
    if (y > keeperSightline.minY && y < keeperSightline.maxY) {
      addGridSegment(
        { x: -RAPIER_GOAL.halfWidth, y, z: RAPIER_GOAL.netPlaneZ + 0.09 },
        { x: -keeperSightline.halfWidth, y, z: RAPIER_GOAL.netPlaneZ + 0.09 },
      );
      addGridSegment(
        { x: keeperSightline.halfWidth, y, z: RAPIER_GOAL.netPlaneZ + 0.09 },
        { x: RAPIER_GOAL.halfWidth, y, z: RAPIER_GOAL.netPlaneZ + 0.09 },
      );
    } else {
      addGridSegment(
        { x: -RAPIER_GOAL.halfWidth, y, z: RAPIER_GOAL.netPlaneZ + 0.09 },
        { x: RAPIER_GOAL.halfWidth, y, z: RAPIER_GOAL.netPlaneZ + 0.09 },
      );
    }
  }
  var grid = new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(linePoints), gridMaterial);
  grid.name = "goal-net-back-grid";
  grid.visible = false;
  group.add(grid);

  var sharedNetTexture = continuousPocketShell.material.uniforms.netMap.value;
  function addCageNetPanel(panel, opacity, netGridDivisions) {
    var geometry = createDetailedCageNetPanelGeometry(panel);
    var material = new THREE.MeshBasicMaterial({
      color: "#dfe9e4",
      map: sharedNetTexture,
      transparent: true,
      opacity,
      alphaTest: 0.003,
      depthWrite: false,
      side: THREE.DoubleSide,
      toneMapped: false,
    });
    var object = new THREE.Mesh(geometry, material);
    object.name = "goal-net-panel-" + panel;
    object.renderOrder = 4;
    object.userData.goalNetPanel = panel;
    object.userData.netFrameAttachmentSystem = NET_FRAME_ATTACHMENT_SYSTEM;
    object.userData.netContinuitySystem = NET_CONTINUITY_SYSTEM;
    object.userData.behindShotLane = true;
    object.userData.frontShotLaneOcclusion = 0;
    object.userData.anchoredPanel = true;
    object.userData.netGridDivisions = netGridDivisions;
    group.add(registerDynamicNetDetail(object, panel === "top" ? 0.12 : 0.18, 0.04));
  }

  ["left", "right"].forEach(function addTrapezoidSidePanel(side) {
    addCageNetPanel(side, 0.14, {
      depth: GOAL_NET_GRID.depthDivisions,
      height: GOAL_NET_GRID.frontHeightDivisions,
    });
  });

  addCageNetPanel("top", 0.1, {
    depth: GOAL_NET_GRID.depthDivisions,
    width: GOAL_NET_GRID.widthDivisions,
  });

  if (!BUILD_RETIRED_NET_LAYERS) {
    group.userData.netPerformanceSystem = "single-shell-mobile-net-budget";
    group.userData.retiredNetLayerCount = 0;
    return { group, net, grid, dynamicNetDetails };
  }

  var cageSeamMaterial = new THREE.LineBasicMaterial({
    color: "#f8fff4",
    transparent: true,
    opacity: 0.18,
    depthWrite: false,
  });
  GOAL_FRAME_SEGMENTS.forEach(function addCageSeam(segment) {
    var seam = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(segment.start.x, segment.start.y, segment.start.z),
        new THREE.Vector3(segment.end.x, segment.end.y, segment.end.z),
      ]),
      cageSeamMaterial.clone(),
    );
    seam.name = "goal-net-cage-seam-" + segment.name;
    seam.renderOrder = 5;
    seam.userData.netFrameAttachmentSystem = NET_FRAME_ATTACHMENT_SYSTEM;
    seam.userData.goalFrameSegment = segment.name;
    group.add(seam);
  });

  var raisedRopeMaterial = createBraidedNetCordMaterial({
    color: "#f4fff8",
    opacity: 0.22,
    roughness: 0.74,
    bumpScale: 0.0048,
  });
  function makeRaisedRope(name, points, radius = 0.0085, opacity = 0.36) {
    var curve = new THREE.CatmullRomCurve3(points.map((point) => new THREE.Vector3(point.x, point.y, point.z)));
    var rope = new THREE.Mesh(
      new THREE.TubeGeometry(curve, Math.max(5, points.length * 5), radius, 6, false),
      raisedRopeMaterial.clone(),
    );
    rope.name = name;
    rope.material.opacity = opacity;
    rope.material.depthWrite = false;
    rope.material.userData.netMaterialSystem = NET_CORD_MATERIAL_SYSTEM;
    rope.material.userData.netTextureSystem = NET_CORD_TEXTURE_SYSTEM;
    rope.renderOrder = 3;
    rope.userData.netCordVolumeSystem = "raised-rope-net-cord-layer";
    rope.userData.netTextureSystem = NET_CORD_TEXTURE_SYSTEM;
    rope.userData.netSightlineSystem = NET_SIGHTLINE_SYSTEM;
    rope.userData.netProfessionalSystem = NET_PROFESSIONAL_SYSTEM;
    rope.userData.ropeRadius = radius;
    rope.userData.geometrySource = "three-tube-geometry-raised-net-rope";
    return rope;
  }
  [
    ["top", [
      { x: -RAPIER_GOAL.halfWidth + GOAL_NET_GEOMETRY.bindingInset, y: RAPIER_GOAL.height - 0.012, z: RAPIER_GOAL.netPlaneZ + 0.052 },
      { x: 0, y: RAPIER_GOAL.height - 0.012, z: RAPIER_GOAL.netPlaneZ + 0.052 },
      { x: RAPIER_GOAL.halfWidth - GOAL_NET_GEOMETRY.bindingInset, y: RAPIER_GOAL.height - 0.012, z: RAPIER_GOAL.netPlaneZ + 0.052 },
    ], 0.34],
    ["left", [
      { x: -RAPIER_GOAL.halfWidth + 0.008, y: 0.012, z: RAPIER_GOAL.netPlaneZ + 0.052 },
      { x: -RAPIER_GOAL.halfWidth + 0.008, y: RAPIER_GOAL.height * 0.5, z: RAPIER_GOAL.netPlaneZ + 0.052 },
      { x: -RAPIER_GOAL.halfWidth + 0.008, y: RAPIER_GOAL.height - 0.012, z: RAPIER_GOAL.netPlaneZ + 0.052 },
    ], 0.32],
    ["right", [
      { x: RAPIER_GOAL.halfWidth - 0.008, y: 0.012, z: RAPIER_GOAL.netPlaneZ + 0.052 },
      { x: RAPIER_GOAL.halfWidth - 0.008, y: RAPIER_GOAL.height * 0.5, z: RAPIER_GOAL.netPlaneZ + 0.052 },
      { x: RAPIER_GOAL.halfWidth - 0.008, y: RAPIER_GOAL.height - 0.012, z: RAPIER_GOAL.netPlaneZ + 0.052 },
    ], 0.32],
    ["bottom", [
      { x: -RAPIER_GOAL.halfWidth + 0.008, y: 0.018, z: RAPIER_GOAL.netPlaneZ + 0.058 },
      { x: 0, y: 0.018, z: RAPIER_GOAL.netPlaneZ + 0.058 },
      { x: RAPIER_GOAL.halfWidth - 0.008, y: 0.018, z: RAPIER_GOAL.netPlaneZ + 0.058 },
    ], 0.24],
  ].forEach(function addFrameBindingRope(item) {
    var bindingRope = makeRaisedRope("goal-net-frame-binding-rope-" + item[0], item[1], 0.0068, item[2]);
    bindingRope.renderOrder = 6;
    bindingRope.userData.netFrameAttachmentSystem = NET_FRAME_ATTACHMENT_SYSTEM;
    bindingRope.userData.anchorBehavior = "fixed-frame-edge";
    group.add(bindingRope);
  });
  function makeMatchdayLace(name, points, radius = 0.0054, opacity = 0.12, motionScale = 0.5, opacityScale = 0.16) {
    var lace = makeRaisedRope(name, points, radius, opacity);
    lace.renderOrder = 5;
    lace.userData.netMatchdayLacingSystem = NET_MATCHDAY_LACING_SYSTEM;
    lace.userData.netLaneGuardSystem = NET_LANE_GUARD_SYSTEM;
    lace.userData.crossesKeeperSightline = points.some((point) => isInKeeperSightline(point));
    return registerDynamicNetDetail(lace, motionScale, opacityScale);
  }
  function makeLaceKnot(name, x, y, z, radius = 0.016, opacity = 0.12) {
    var knotMaterial = raisedRopeMaterial.clone();
    knotMaterial.opacity = opacity;
    knotMaterial.depthWrite = false;
    knotMaterial.transparent = true;
    var knot = new THREE.Mesh(new THREE.SphereGeometry(radius, 8, 6), knotMaterial);
    knot.name = name;
    knot.position.set(x, y, z);
    knot.renderOrder = 6;
    knot.userData.netMatchdayLacingSystem = NET_MATCHDAY_LACING_SYSTEM;
    knot.userData.netLaneGuardSystem = NET_LANE_GUARD_SYSTEM;
    knot.userData.crossesKeeperSightline = isInKeeperSightline(knot.position);
    return registerDynamicNetDetail(knot, 0.36, 0.12);
  }
  function markMatchGradeNetDetail(object, options = {}) {
    object.userData.netMatchGradeTextureSystem = NET_MATCH_GRADE_TEXTURE_SYSTEM;
    object.userData.netShotLaneVisibilitySystem = NET_SHOT_LANE_VISIBILITY_SYSTEM;
    object.userData.netPhotorealTextureSystem = options.netPhotorealTextureSystem || NET_PHOTOREAL_TEXTURE_SYSTEM;
    object.userData.netLaneGuardSystem = NET_LANE_GUARD_SYSTEM;
    object.userData.rearPocketLayer = options.rearPocketLayer || "peripheral-depth-detail";
    object.userData.behindShotLane = Boolean(options.behindShotLane);
    object.userData.frontShotLaneOcclusion = options.frontShotLaneOcclusion || 0;
    if (typeof options.crossesKeeperSightline === "boolean") {
      object.userData.crossesKeeperSightline = options.crossesKeeperSightline;
    }
    return object;
  }
  function markLandscapeSightlineNetDetail(object) {
    object.userData.netLandscapeSightlineSystem = NET_LANDSCAPE_SIGHTLINE_SYSTEM;
    object.userData.netLaneGuardSystem = NET_LANE_GUARD_SYSTEM;
    object.userData.behindShotLane = true;
    object.userData.frontShotLaneOcclusion = 0;
    return object;
  }
  function markBroadcastSightlineNetDetail(object, options = {}) {
    object.userData.netBroadcastSightlineSystem = NET_BROADCAST_SIGHTLINE_SYSTEM;
    object.userData.netLandscapeSightlineSystem = NET_LANDSCAPE_SIGHTLINE_SYSTEM;
    object.userData.netLaneGuardSystem = NET_LANE_GUARD_SYSTEM;
    object.userData.behindShotLane = true;
    object.userData.frontShotLaneOcclusion = 0;
    if (typeof options.crossesKeeperSightline === "boolean") {
      object.userData.crossesKeeperSightline = options.crossesKeeperSightline;
    }
    return object;
  }
  function makeMatchWeaveThread(name, points, options = {}) {
    var thread = makeRaisedRope(name, points, options.radius || 0.0032, options.opacity || 0.052);
    thread.renderOrder = options.renderOrder || 5;
    thread.material.color.set(options.color || "#f8fffb");
    thread.material.opacity = options.opacity || 0.052;
    thread.material.depthWrite = false;
    thread.material.transparent = true;
    return markMatchGradeNetDetail(thread, options);
  }
  function makeMatchWeaveKnot(name, x, y, z, radius, opacity, options = {}) {
    var knotMaterial = raisedRopeMaterial.clone();
    knotMaterial.color.set(options.color || "#f8fffb");
    knotMaterial.opacity = opacity;
    knotMaterial.depthWrite = false;
    knotMaterial.transparent = true;
    var knot = new THREE.Mesh(new THREE.SphereGeometry(radius, 8, 6), knotMaterial);
    knot.name = name;
    knot.position.set(x, y, z);
    knot.renderOrder = options.renderOrder || 6;
    return markMatchGradeNetDetail(knot, options);
  }
  if (BUILD_RETIRED_NET_LAYERS) {
  for (var ropeX = -RAPIER_GOAL.halfWidth + 0.5, raisedVerticalIndex = 0; ropeX <= RAPIER_GOAL.halfWidth - 0.49; ropeX += 0.78, raisedVerticalIndex += 1) {
    var verticalName = "goal-net-raised-vertical-cord-" + raisedVerticalIndex;
    if (Math.abs(ropeX) < keeperSightline.halfWidth) {
      group.add(registerDynamicNetDetail(makeRaisedRope(verticalName + "-lower", [
        { x: ropeX, y: 0.1, z: RAPIER_GOAL.netPlaneZ + 0.118 },
        { x: ropeX + (raisedVerticalIndex % 2 ? -0.012 : 0.012), y: keeperSightline.minY, z: RAPIER_GOAL.netPlaneZ + 0.132 },
      ], 0.0062, 0.08), 0.82, 0.26));
      group.add(registerDynamicNetDetail(makeRaisedRope(verticalName + "-upper", [
        { x: ropeX + (raisedVerticalIndex % 2 ? -0.012 : 0.012), y: keeperSightline.maxY, z: RAPIER_GOAL.netPlaneZ + 0.132 },
        { x: ropeX, y: RAPIER_GOAL.height - 0.12, z: RAPIER_GOAL.netPlaneZ + 0.118 },
      ], 0.0062, 0.08), 0.82, 0.26));
    } else {
      group.add(registerDynamicNetDetail(makeRaisedRope(verticalName, [
        { x: ropeX, y: 0.1, z: RAPIER_GOAL.netPlaneZ + 0.118 },
        { x: ropeX + (raisedVerticalIndex % 2 ? -0.018 : 0.018), y: RAPIER_GOAL.height * 0.52, z: RAPIER_GOAL.netPlaneZ + 0.142 },
        { x: ropeX, y: RAPIER_GOAL.height - 0.12, z: RAPIER_GOAL.netPlaneZ + 0.118 },
      ], 0.0065, 0.14), 0.92, 0.38));
    }
  }
  for (var ropeY = 0.42, raisedHorizontalIndex = 0; ropeY <= RAPIER_GOAL.height - 0.32; ropeY += 0.42, raisedHorizontalIndex += 1) {
    var horizontalName = "goal-net-raised-horizontal-cord-" + raisedHorizontalIndex;
    if (ropeY > keeperSightline.minY && ropeY < keeperSightline.maxY) {
      [
        ["left", -RAPIER_GOAL.halfWidth + 0.16, -keeperSightline.halfWidth],
        ["right", keeperSightline.halfWidth, RAPIER_GOAL.halfWidth - 0.16],
      ].forEach(function addSplitHorizontal(item) {
        group.add(registerDynamicNetDetail(makeRaisedRope(horizontalName + "-" + item[0], [
          { x: item[1], y: ropeY, z: RAPIER_GOAL.netPlaneZ + 0.122 },
          { x: (item[1] + item[2]) * 0.5, y: ropeY + (raisedHorizontalIndex % 2 ? 0.01 : -0.01), z: RAPIER_GOAL.netPlaneZ + 0.142 },
          { x: item[2], y: ropeY, z: RAPIER_GOAL.netPlaneZ + 0.122 },
        ], 0.0062, 0.095), 0.78, 0.26));
      });
    } else {
      group.add(registerDynamicNetDetail(makeRaisedRope(horizontalName, [
        { x: -RAPIER_GOAL.halfWidth + 0.16, y: ropeY, z: RAPIER_GOAL.netPlaneZ + 0.122 },
        { x: 0, y: ropeY + (raisedHorizontalIndex % 2 ? 0.012 : -0.012), z: RAPIER_GOAL.netPlaneZ + 0.148 },
        { x: RAPIER_GOAL.halfWidth - 0.16, y: ropeY, z: RAPIER_GOAL.netPlaneZ + 0.122 },
      ], 0.0065, 0.13), 0.82, 0.36));
    }
  }
  }
  [
    ["top", [
      { x: -RAPIER_GOAL.halfWidth + 0.05, y: RAPIER_GOAL.height - 0.05, z: RAPIER_GOAL.netPlaneZ + 0.132 },
      { x: 0, y: RAPIER_GOAL.height - 0.06, z: RAPIER_GOAL.netPlaneZ + 0.154 },
      { x: RAPIER_GOAL.halfWidth - 0.05, y: RAPIER_GOAL.height - 0.05, z: RAPIER_GOAL.netPlaneZ + 0.132 },
    ]],
    ["bottom", [
      { x: -RAPIER_GOAL.halfWidth + 0.12, y: 0.12, z: RAPIER_GOAL.netPlaneZ + 0.13 },
      { x: 0, y: 0.1, z: RAPIER_GOAL.netPlaneZ + 0.154 },
      { x: RAPIER_GOAL.halfWidth - 0.12, y: 0.12, z: RAPIER_GOAL.netPlaneZ + 0.13 },
    ]],
    ["left", [
      { x: -RAPIER_GOAL.halfWidth + 0.08, y: 0.16, z: RAPIER_GOAL.netPlaneZ + 0.13 },
      { x: -RAPIER_GOAL.halfWidth + 0.06, y: RAPIER_GOAL.height * 0.5, z: RAPIER_GOAL.netPlaneZ + 0.154 },
      { x: -RAPIER_GOAL.halfWidth + 0.08, y: RAPIER_GOAL.height - 0.12, z: RAPIER_GOAL.netPlaneZ + 0.13 },
    ]],
    ["right", [
      { x: RAPIER_GOAL.halfWidth - 0.08, y: 0.16, z: RAPIER_GOAL.netPlaneZ + 0.13 },
      { x: RAPIER_GOAL.halfWidth - 0.06, y: RAPIER_GOAL.height * 0.5, z: RAPIER_GOAL.netPlaneZ + 0.154 },
      { x: RAPIER_GOAL.halfWidth - 0.08, y: RAPIER_GOAL.height - 0.12, z: RAPIER_GOAL.netPlaneZ + 0.13 },
    ]],
  ].forEach(function addRaisedBorderRope(item) {
    group.add(registerDynamicNetDetail(makeRaisedRope("goal-net-raised-border-rope-" + item[0], item[1], 0.01, 0.27), 0.72, 0.42));
  });

  var diagonalMaterial = new THREE.LineBasicMaterial({
    color: "#f7ffff",
    transparent: true,
    opacity: 0.006,
    depthWrite: false,
  });
  function addDiagonalWeave(name, direction) {
    var diagonalPoints = [];
    for (var offset = -RAPIER_GOAL.halfWidth - RAPIER_GOAL.height; offset <= RAPIER_GOAL.halfWidth; offset += 0.64) {
      var startX = Math.max(-RAPIER_GOAL.halfWidth, offset);
      var startY = direction > 0 ? 0 : RAPIER_GOAL.height;
      var endX = Math.min(RAPIER_GOAL.halfWidth, offset + RAPIER_GOAL.height * 1.18);
      var endY = direction > 0 ? (endX - startX) / 1.18 : RAPIER_GOAL.height - (endX - startX) / 1.18;
      if (endY < 0 || endY > RAPIER_GOAL.height) continue;
      diagonalPoints.push(new THREE.Vector3(startX, startY, RAPIER_GOAL.netPlaneZ + 0.105));
      diagonalPoints.push(new THREE.Vector3(endX, endY, RAPIER_GOAL.netPlaneZ + 0.105));
    }
    var weave = new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(diagonalPoints), diagonalMaterial.clone());
    weave.name = "goal-net-diagonal-weave-" + name;
    group.add(registerDynamicNetDetail(weave, 0.84, 0.14));
  }
  if (BUILD_RETIRED_NET_LAYERS) {
    addDiagonalWeave("rising", 1);
    addDiagonalWeave("falling", -1);
  }

  function addOpenDiamondRopeSet(label, direction) {
    var slope = 1.08;
    var width = RAPIER_GOAL.halfWidth * 2;
    var ropeIndex = 0;
    for (
      var offset = -RAPIER_GOAL.halfWidth - RAPIER_GOAL.height * slope;
      offset <= RAPIER_GOAL.halfWidth + RAPIER_GOAL.height * slope;
      offset += 0.92
    ) {
      var points = [];
      for (var sample = 0; sample <= 14; sample += 1) {
        var t = sample / 14;
        var x = -RAPIER_GOAL.halfWidth + (width * sample) / 14;
        var y = direction > 0
          ? (x - offset) / slope
          : RAPIER_GOAL.height - (x - offset) / slope;
        if (y < 0.1 || y > RAPIER_GOAL.height - 0.1) continue;
        var wave = Math.sin(sample * 0.74 + ropeIndex * 0.52) * 0.01;
        var sag = Math.sin(t * Math.PI) * (0.014 + (ropeIndex % 3) * 0.003);
        points.push({
          x,
          y: y + Math.sin((x + offset) * 0.9) * 0.004 - sag * 0.42,
          z: RAPIER_GOAL.netPlaneZ + 0.148 + wave + sag,
        });
      }
      if (points.length < 2) continue;

      var crossesGoalMouth = points.some((point) => isInKeeperSightline(point));
      var sideBias = points.reduce((total, point) => total + Math.abs(point.x) / RAPIER_GOAL.halfWidth, 0) / points.length;
      var opacity = crossesGoalMouth ? 0.0024 : 0.106 + sideBias * 0.022;
      var radius = crossesGoalMouth ? 0.0024 : 0.0052;
      var diamondRope = makeRaisedRope("goal-net-open-diamond-rope-" + label + "-" + ropeIndex, points, radius, opacity);
      diamondRope.userData.crossesKeeperSightline = crossesGoalMouth;
      diamondRope.userData.netOcclusionBudgetSystem = NET_OCCLUSION_BUDGET_SYSTEM;
      diamondRope.userData.netCenterWindowSystem = NET_CENTER_WINDOW_SYSTEM;
      group.add(registerDynamicNetDetail(
        diamondRope,
        1.04,
        crossesGoalMouth ? 0.06 : 0.42,
      ));
      ropeIndex += 1;
    }
  }
  if (BUILD_RETIRED_NET_LAYERS) {
    addOpenDiamondRopeSet("rising", 1);
    addOpenDiamondRopeSet("falling", -1);
  }

  if (BUILD_RETIRED_NET_LAYERS) {
  var topSagCord = makeRaisedRope("goal-net-top-sag-cord-main", [
    { x: -RAPIER_GOAL.halfWidth + 0.16, y: RAPIER_GOAL.height - 0.055, z: RAPIER_GOAL.netPlaneZ + 0.18 },
    { x: 0, y: RAPIER_GOAL.height - 0.125, z: RAPIER_GOAL.netPlaneZ + 0.3 },
    { x: RAPIER_GOAL.halfWidth - 0.16, y: RAPIER_GOAL.height - 0.055, z: RAPIER_GOAL.netPlaneZ + 0.18 },
  ], 0.0086, 0.158);
  topSagCord.userData.netProfessionalSystem = NET_PROFESSIONAL_SYSTEM;
  group.add(registerDynamicNetDetail(topSagCord, 0.64, 0.3));

  [0.54, 1.18, 1.84].forEach(function addRearPocketSagCord(rowY, rowIndex) {
    var rearSagCord = makeRaisedRope("goal-net-rear-pocket-sag-cord-" + rowIndex, [
      { x: -RAPIER_GOAL.halfWidth + 0.48, y: rowY, z: RAPIER_GOAL.netPlaneZ + 0.58 },
      { x: -RAPIER_GOAL.halfWidth * 0.35, y: rowY - 0.04, z: RAPIER_GOAL.netPlaneZ + 0.82 },
      { x: 0, y: rowY - 0.07, z: RAPIER_GOAL.netPlaneZ + 0.94 },
      { x: RAPIER_GOAL.halfWidth * 0.35, y: rowY - 0.04, z: RAPIER_GOAL.netPlaneZ + 0.82 },
      { x: RAPIER_GOAL.halfWidth - 0.48, y: rowY, z: RAPIER_GOAL.netPlaneZ + 0.58 },
    ], 0.0054, 0.082);
    rearSagCord.userData.netProfessionalSystem = NET_PROFESSIONAL_SYSTEM;
    group.add(registerDynamicNetDetail(rearSagCord, 0.56, 0.22));
  });
  }

  function makeRearPocketRope(name, points, radius, opacity, baseZ) {
    var rope = makeRaisedRope(name, points, radius, opacity);
    rope.position.z = baseZ;
    rope.userData.netRealismUpgradeSystem = NET_REALISM_UPGRADE_SYSTEM;
    rope.userData.netCenterWindowSystem = NET_CENTER_WINDOW_SYSTEM;
    return rope;
  }

  function addRearPocketDiamondRopeSet(label, direction) {
    var slope = 0.92;
    var ropeIndex = 0;
    for (
      var offset = -RAPIER_GOAL.halfWidth - RAPIER_GOAL.height * slope;
      offset <= RAPIER_GOAL.halfWidth + RAPIER_GOAL.height * slope;
      offset += 0.72
    ) {
      var points = [];
      for (var sample = 0; sample <= 12; sample += 1) {
        var t = sample / 12;
        var x = -RAPIER_GOAL.halfWidth + 0.34 + ((RAPIER_GOAL.halfWidth * 2 - 0.68) * sample) / 12;
        var y = direction > 0
          ? (x - offset) / slope
          : RAPIER_GOAL.height - (x - offset) / slope;
        if (y < 0.2 || y > RAPIER_GOAL.height - 0.16) continue;
        var sideBias = Math.abs(x) / RAPIER_GOAL.halfWidth;
        points.push({
          x,
          y: y - Math.sin(t * Math.PI) * 0.06,
          z: -0.055 + Math.sin(t * Math.PI) * (0.08 + sideBias * 0.018),
        });
      }
      if (points.length < 2) continue;

      var averageSideBias = points.reduce((total, point) => total + Math.abs(point.x) / RAPIER_GOAL.halfWidth, 0) / points.length;
      var rope = makeRearPocketRope(
        "goal-net-rear-pocket-diamond-rope-" + label + "-" + ropeIndex,
        points,
        0.0042,
        0.044 + averageSideBias * 0.026,
        RAPIER_GOAL.netPlaneZ + 0.72 + (ropeIndex % 3) * 0.035,
      );
      group.add(registerDynamicNetDetail(rope, 0.5, 0.18));
      ropeIndex += 1;
    }
  }
  if (BUILD_RETIRED_NET_LAYERS) {
    addRearPocketDiamondRopeSet("rising", 1);
    addRearPocketDiamondRopeSet("falling", -1);

  [0.36, 0.86, 1.38, 1.9].forEach(function addRearDepthRow(rowY, rowIndex) {
    var rowRope = makeRearPocketRope("goal-net-rear-depth-row-cord-" + rowIndex, [
      { x: -RAPIER_GOAL.halfWidth + 0.4, y: rowY, z: -0.035 },
      { x: -RAPIER_GOAL.halfWidth * 0.38, y: rowY - 0.045, z: 0.052 },
      { x: 0, y: rowY - 0.075, z: 0.076 },
      { x: RAPIER_GOAL.halfWidth * 0.38, y: rowY - 0.045, z: 0.052 },
      { x: RAPIER_GOAL.halfWidth - 0.4, y: rowY, z: -0.035 },
    ], 0.005, 0.058 + rowIndex * 0.006, RAPIER_GOAL.netPlaneZ + 0.86);
    group.add(registerDynamicNetDetail(rowRope, 0.46, 0.16));
  });
  }

  [
    ["top-left", [
      { x: -RAPIER_GOAL.halfWidth + 0.16, y: RAPIER_GOAL.height - 0.085, z: RAPIER_GOAL.netPlaneZ + 0.18 },
      { x: -RAPIER_GOAL.halfWidth * 0.66, y: RAPIER_GOAL.height - 0.14, z: RAPIER_GOAL.netPlaneZ + 0.32 },
      { x: -keeperSightline.halfWidth - 0.18, y: RAPIER_GOAL.height - 0.13, z: RAPIER_GOAL.netPlaneZ + 0.26 },
    ]],
    ["top-right", [
      { x: keeperSightline.halfWidth + 0.18, y: RAPIER_GOAL.height - 0.13, z: RAPIER_GOAL.netPlaneZ + 0.26 },
      { x: RAPIER_GOAL.halfWidth * 0.66, y: RAPIER_GOAL.height - 0.14, z: RAPIER_GOAL.netPlaneZ + 0.32 },
      { x: RAPIER_GOAL.halfWidth - 0.16, y: RAPIER_GOAL.height - 0.085, z: RAPIER_GOAL.netPlaneZ + 0.18 },
    ]],
    ["left-post", [
      { x: -RAPIER_GOAL.halfWidth + 0.055, y: 0.26, z: RAPIER_GOAL.netPlaneZ + 0.14 },
      { x: -RAPIER_GOAL.halfWidth + 0.022, y: RAPIER_GOAL.height * 0.5, z: RAPIER_GOAL.netPlaneZ + 0.22 },
      { x: -RAPIER_GOAL.halfWidth + 0.055, y: RAPIER_GOAL.height - 0.24, z: RAPIER_GOAL.netPlaneZ + 0.14 },
    ]],
    ["right-post", [
      { x: RAPIER_GOAL.halfWidth - 0.055, y: 0.26, z: RAPIER_GOAL.netPlaneZ + 0.14 },
      { x: RAPIER_GOAL.halfWidth - 0.022, y: RAPIER_GOAL.height * 0.5, z: RAPIER_GOAL.netPlaneZ + 0.22 },
      { x: RAPIER_GOAL.halfWidth - 0.055, y: RAPIER_GOAL.height - 0.24, z: RAPIER_GOAL.netPlaneZ + 0.14 },
    ]],
  ].forEach(function addMatchdayEdgeLace(item, index) {
    group.add(makeMatchdayLace("goal-net-matchday-edge-lace-" + item[0], item[1], index < 2 ? 0.0068 : 0.006, index < 2 ? 0.205 : 0.176, 0.44, 0.18));
  });

  if (BUILD_RETIRED_NET_LAYERS) ["left", "right"].forEach(function addSideCheekLaces(side) {
    var sign = side === "left" ? -1 : 1;
    [0.16, 0.34, 0.54, 0.74].forEach(function addSideCheekLace(depth, index) {
      group.add(makeMatchdayLace("goal-net-side-cheek-lace-" + side + "-" + index, [
        { x: sign * (RAPIER_GOAL.halfWidth + depth * 0.12), y: 0.28 + index * 0.035, z: RAPIER_GOAL.netPlaneZ + 0.14 + depth },
        { x: sign * (RAPIER_GOAL.halfWidth + 0.18 + depth * 0.16), y: RAPIER_GOAL.height * 0.5 - index * 0.028, z: RAPIER_GOAL.netPlaneZ + 0.36 + depth * 0.58 },
        { x: sign * (RAPIER_GOAL.halfWidth + 0.4), y: RAPIER_GOAL.height - 0.24 - index * 0.025, z: RAPIER_GOAL.netPlaneZ + 0.82 },
      ], 0.0052, 0.13 + index * 0.012, 0.42, 0.15));
    });
    [
      [
        { x: sign * (RAPIER_GOAL.halfWidth + 0.04), y: 0.36, z: RAPIER_GOAL.netPlaneZ + 0.18 },
        { x: sign * (RAPIER_GOAL.halfWidth + 0.28), y: RAPIER_GOAL.height * 0.48, z: RAPIER_GOAL.netPlaneZ + 0.58 },
        { x: sign * (RAPIER_GOAL.halfWidth + 0.43), y: RAPIER_GOAL.height - 0.28, z: RAPIER_GOAL.netPlaneZ + 0.86 },
      ],
      [
        { x: sign * (RAPIER_GOAL.halfWidth + 0.42), y: 0.42, z: RAPIER_GOAL.netPlaneZ + 0.86 },
        { x: sign * (RAPIER_GOAL.halfWidth + 0.24), y: RAPIER_GOAL.height * 0.52, z: RAPIER_GOAL.netPlaneZ + 0.58 },
        { x: sign * (RAPIER_GOAL.halfWidth + 0.04), y: RAPIER_GOAL.height - 0.34, z: RAPIER_GOAL.netPlaneZ + 0.18 },
      ],
    ].forEach(function addSideCheekCrossLace(points, crossIndex) {
      group.add(makeMatchdayLace("goal-net-side-cheek-lace-" + side + "-cross-" + crossIndex, points, 0.0054, 0.158 + crossIndex * 0.018, 0.45, 0.16));
    });
  });

  if (BUILD_RETIRED_NET_LAYERS) {
  ["left", "right"].forEach(function addRearPocketDepthLaces(side) {
    var sign = side === "left" ? -1 : 1;
    [0.42, 0.9, 1.38].forEach(function addRearDepthLace(rowY, rowIndex) {
      group.add(makeMatchdayLace("goal-net-rear-pocket-depth-lace-" + side + "-" + rowIndex, [
        { x: sign * (RAPIER_GOAL.halfWidth - 0.22), y: rowY, z: RAPIER_GOAL.netPlaneZ + 0.58 },
        { x: sign * (RAPIER_GOAL.halfWidth * 0.72), y: rowY - 0.045, z: RAPIER_GOAL.netPlaneZ + 0.82 + rowIndex * 0.025 },
        { x: sign * (keeperSightline.halfWidth + 0.22), y: rowY - 0.035, z: RAPIER_GOAL.netPlaneZ + 0.74 + rowIndex * 0.018 },
      ], 0.0048, 0.105 + rowIndex * 0.014, 0.38, 0.12));
    });
  });
  }

  [
    ["top-left", [
      { x: -RAPIER_GOAL.halfWidth + 0.24, y: RAPIER_GOAL.height - 0.04, z: RAPIER_GOAL.netPlaneZ + 0.105 },
      { x: -keeperSightline.halfWidth - 0.22, y: RAPIER_GOAL.height - 0.06, z: RAPIER_GOAL.netPlaneZ + 0.12 },
    ]],
    ["top-right", [
      { x: keeperSightline.halfWidth + 0.22, y: RAPIER_GOAL.height - 0.06, z: RAPIER_GOAL.netPlaneZ + 0.12 },
      { x: RAPIER_GOAL.halfWidth - 0.24, y: RAPIER_GOAL.height - 0.04, z: RAPIER_GOAL.netPlaneZ + 0.105 },
    ]],
    ["left-side", [
      { x: -RAPIER_GOAL.halfWidth + 0.035, y: 0.36, z: RAPIER_GOAL.netPlaneZ + 0.1 },
      { x: -RAPIER_GOAL.halfWidth + 0.035, y: RAPIER_GOAL.height - 0.32, z: RAPIER_GOAL.netPlaneZ + 0.1 },
    ]],
    ["right-side", [
      { x: RAPIER_GOAL.halfWidth - 0.035, y: 0.36, z: RAPIER_GOAL.netPlaneZ + 0.1 },
      { x: RAPIER_GOAL.halfWidth - 0.035, y: RAPIER_GOAL.height - 0.32, z: RAPIER_GOAL.netPlaneZ + 0.1 },
    ]],
  ].forEach(function addCordHighlight(item) {
    var highlight = makeMatchdayLace("goal-net-cord-highlight-" + item[0], item[1], 0.003, 0.095, 0.26, 0.08);
    highlight.material.color.set("#ffffff");
    group.add(highlight);
  });

  if (BUILD_RETIRED_NET_LAYERS) {
  var laceKnotIndex = 0;
  ["left", "right"].forEach(function addLaceKnotColumn(side) {
    var sign = side === "left" ? -1 : 1;
    [0.42, 0.78, 1.14, 1.5, 1.86, RAPIER_GOAL.height - 0.24].forEach(function addColumnKnot(y, rowIndex) {
      group.add(makeLaceKnot(
        "goal-net-lace-knot-" + laceKnotIndex,
        sign * (RAPIER_GOAL.halfWidth - 0.18 - (rowIndex % 2) * 0.12),
        y,
        RAPIER_GOAL.netPlaneZ + 0.18 + (rowIndex % 3) * 0.07,
        0.013 + (rowIndex % 2) * 0.002,
        0.095 + (rowIndex % 3) * 0.014,
      ));
      laceKnotIndex += 1;
    });
  });
  }

  function addMatchGradeRearPocketThreadSet(label, direction) {
    var slope = 0.86;
    var threadIndex = 0;
    for (
      var offset = -RAPIER_GOAL.halfWidth - RAPIER_GOAL.height * slope;
      offset <= RAPIER_GOAL.halfWidth + RAPIER_GOAL.height * slope;
      offset += 0.54
    ) {
      var points = [];
      for (var sample = 0; sample <= 16; sample += 1) {
        var t = sample / 16;
        var x = -RAPIER_GOAL.halfWidth + 0.42 + ((RAPIER_GOAL.halfWidth * 2 - 0.84) * sample) / 16;
        var y = direction > 0
          ? (x - offset) / slope
          : RAPIER_GOAL.height - (x - offset) / slope;
        if (y < 0.28 || y > RAPIER_GOAL.height - 0.2) continue;
        var sideBias = Math.abs(x) / RAPIER_GOAL.halfWidth;
        var pocketSag = Math.sin(t * Math.PI) * (0.045 + sideBias * 0.018);
        points.push({
          x,
          y: y - pocketSag * 0.48 + Math.sin(threadIndex * 0.71 + sample * 0.36) * 0.006,
          z: RAPIER_GOAL.netPlaneZ + 0.72 + Math.sin(t * Math.PI) * (0.12 + sideBias * 0.02),
        });
      }
      if (points.length < 2) continue;

      var crossesSightline = points.some((point) => isInKeeperSightline(point));
      var averageSideBias = points.reduce((total, point) => total + Math.abs(point.x) / RAPIER_GOAL.halfWidth, 0) / points.length;
      var opacity = crossesSightline ? 0.016 + averageSideBias * 0.004 : 0.052 + averageSideBias * 0.028;
      var thread = makeMatchWeaveThread(
        "goal-net-match-weave-rear-pocket-thread-" + label + "-" + threadIndex,
        points,
        {
          radius: crossesSightline ? 0.0024 : 0.0033,
          opacity,
          rearPocketLayer: crossesSightline ? "center-depth-detail" : "peripheral-depth-detail",
          behindShotLane: true,
          crossesKeeperSightline: crossesSightline,
          frontShotLaneOcclusion: 0,
          renderOrder: 4,
        },
      );
      group.add(registerDynamicNetDetail(thread, crossesSightline ? 0.32 : 0.44, crossesSightline ? 0.08 : 0.18));
      threadIndex += 1;
    }
  }
  if (BUILD_RETIRED_NET_LAYERS) {
    addMatchGradeRearPocketThreadSet("rising", 1);
    addMatchGradeRearPocketThreadSet("falling", -1);
  }

  if (BUILD_RETIRED_NET_LAYERS) {
  var matchWeaveKnotIndex = 0;
  [0.44, 0.76, 1.08, 1.4, 1.72, 2.04].forEach(function addMatchWeaveKnotRow(knotY, rowIndex) {
    [-2.82, -2.12, -1.42, -0.72, 0, 0.72, 1.42, 2.12, 2.82].forEach(function addMatchWeaveKnotColumn(knotX, columnIndex) {
      var x = knotX + (rowIndex % 2 ? 0.03 : -0.03);
      var y = knotY + (columnIndex % 2 ? 0.01 : -0.01);
      var crossesSightline = isInKeeperSightline({ x, y, z: RAPIER_GOAL.netPlaneZ + 0.78 });
      var sideBias = Math.abs(x) / RAPIER_GOAL.halfWidth;
      var knot = makeMatchWeaveKnot(
        "goal-net-match-weave-knot-" + matchWeaveKnotIndex,
        x,
        y,
        RAPIER_GOAL.netPlaneZ + 0.74 + (rowIndex % 3) * 0.035 + Math.sin(columnIndex * 0.62) * 0.012,
        crossesSightline ? 0.0062 : 0.0095,
        crossesSightline ? 0.02 : 0.058 + sideBias * 0.022,
        {
          rearPocketLayer: crossesSightline ? "center-depth-detail" : "peripheral-depth-detail",
          behindShotLane: true,
          crossesKeeperSightline: crossesSightline,
          frontShotLaneOcclusion: 0,
        },
      );
      group.add(registerDynamicNetDetail(knot, crossesSightline ? 0.24 : 0.34, crossesSightline ? 0.06 : 0.12));
      matchWeaveKnotIndex += 1;
    });
  });
  }

  function addRearHexPocketLayer() {
    var hexRows = [0.36, 0.68, 1.0, 1.32, 1.64, 1.96, 2.28].filter((rowY) => rowY < RAPIER_GOAL.height - 0.16);
    var hexColumns = [-2.66, -1.98, -1.3, -0.62, 0.06, 0.74, 1.42, 2.1, 2.78].filter(
      (columnX) => Math.abs(columnX) < RAPIER_GOAL.halfWidth - 0.28,
    );
    var threadIndex = 0;
    var knotIndex = 0;

    function addHexThread(points, crossesSightline, sideBias) {
      var opacity = crossesSightline ? 0.016 + sideBias * 0.003 : 0.052 + sideBias * 0.026;
      var thread = makeMatchWeaveThread(
        "goal-net-rear-hex-pocket-thread-" + threadIndex,
        points,
        {
          radius: crossesSightline ? 0.0022 : 0.0031,
          opacity,
          rearPocketLayer: crossesSightline ? "center-depth-detail" : "peripheral-depth-detail",
          behindShotLane: true,
          crossesKeeperSightline: crossesSightline,
          frontShotLaneOcclusion: 0,
          renderOrder: 4,
          netPhotorealTextureSystem: NET_PHOTOREAL_TEXTURE_SYSTEM,
        },
      );
      thread.userData.netPhotorealTextureSystem = NET_PHOTOREAL_TEXTURE_SYSTEM;
      group.add(registerDynamicNetDetail(thread, crossesSightline ? 0.28 : 0.4, crossesSightline ? 0.05 : 0.14));
      threadIndex += 1;
    }

    for (var rowIndex = 0; rowIndex < hexRows.length - 1; rowIndex += 1) {
      var yA = hexRows[rowIndex];
      var yB = hexRows[rowIndex + 1];
      var midpointY = (yA + yB) * 0.5;
      for (var columnIndex = 0; columnIndex < hexColumns.length - 1; columnIndex += 1) {
        var xA = hexColumns[columnIndex] + (rowIndex % 2 ? 0.08 : -0.04);
        var xB = hexColumns[columnIndex + 1] + (rowIndex % 2 ? 0.08 : -0.04);
        var midpointX = (xA + xB) * 0.5;
        var sideBias = Math.max(Math.abs(xA), Math.abs(xB)) / RAPIER_GOAL.halfWidth;
        var leftPoints = [
          { x: xA, y: yA, z: RAPIER_GOAL.netPlaneZ + 0.76 + (rowIndex % 3) * 0.025 },
          { x: midpointX - 0.035, y: midpointY - 0.025, z: RAPIER_GOAL.netPlaneZ + 0.91 + sideBias * 0.035 },
          { x: xA + 0.08, y: yB, z: RAPIER_GOAL.netPlaneZ + 0.78 + (columnIndex % 3) * 0.016 },
        ];
        var rightPoints = [
          { x: xB, y: yA, z: RAPIER_GOAL.netPlaneZ + 0.76 + (columnIndex % 3) * 0.018 },
          { x: midpointX + 0.035, y: midpointY - 0.025, z: RAPIER_GOAL.netPlaneZ + 0.91 + sideBias * 0.035 },
          { x: xB - 0.08, y: yB, z: RAPIER_GOAL.netPlaneZ + 0.78 + (rowIndex % 3) * 0.02 },
        ];
        var horizontalPoints = [
          { x: xA + 0.08, y: yB, z: RAPIER_GOAL.netPlaneZ + 0.78 + (columnIndex % 3) * 0.016 },
          { x: midpointX, y: yB - 0.02, z: RAPIER_GOAL.netPlaneZ + 0.86 + sideBias * 0.025 },
          { x: xB - 0.08, y: yB, z: RAPIER_GOAL.netPlaneZ + 0.78 + (rowIndex % 3) * 0.02 },
        ];

        [leftPoints, rightPoints, horizontalPoints].forEach(function addHexSegment(points) {
          var crossesSightline = points.some((point) => isInKeeperSightline(point));
          addHexThread(points, crossesSightline, sideBias);
        });
      }
    }

    hexRows.forEach(function addHexKnotRow(knotY, rowIndex) {
      hexColumns.forEach(function addHexKnot(columnX, columnIndex) {
        var x = columnX + (rowIndex % 2 ? 0.08 : -0.04);
        var y = knotY + (columnIndex % 2 ? 0.008 : -0.008);
        var crossesSightline = isInKeeperSightline({ x, y, z: RAPIER_GOAL.netPlaneZ + 0.82 });
        var sideBias = Math.abs(x) / RAPIER_GOAL.halfWidth;
        var knot = makeMatchWeaveKnot(
          "goal-net-rear-hex-pocket-knot-" + knotIndex,
          x,
          y,
          RAPIER_GOAL.netPlaneZ + 0.8 + (rowIndex % 3) * 0.026 + Math.sin(columnIndex * 0.58) * 0.012,
          crossesSightline ? 0.0048 : 0.0074,
          crossesSightline ? 0.02 : 0.046 + sideBias * 0.014,
          {
            rearPocketLayer: crossesSightline ? "center-depth-detail" : "peripheral-depth-detail",
            behindShotLane: true,
            crossesKeeperSightline: crossesSightline,
            frontShotLaneOcclusion: 0,
            netPhotorealTextureSystem: NET_PHOTOREAL_TEXTURE_SYSTEM,
          },
        );
        knot.userData.netPhotorealTextureSystem = NET_PHOTOREAL_TEXTURE_SYSTEM;
        group.add(registerDynamicNetDetail(knot, crossesSightline ? 0.2 : 0.3, crossesSightline ? 0.04 : 0.1));
        knotIndex += 1;
      });
    });
  }
  if (BUILD_RETIRED_NET_LAYERS) addRearHexPocketLayer();

  function addLandscapeRearNetTextureLayer() {
    var rowYs = [0.42, 0.74, 1.06, 1.38, 1.7, 2.02].filter((rowY) => rowY < RAPIER_GOAL.height - 0.2);
    var columnXs = [-2.4, -1.44, 1.44, 2.4].filter((columnX) => Math.abs(columnX) < RAPIER_GOAL.halfWidth - 0.32);

    rowYs.forEach(function addLandscapeRearRow(rowY, rowIndex) {
      var rowSag = 0.035 + rowIndex * 0.006;
      [
        ["left", -RAPIER_GOAL.halfWidth + 0.52, -keeperSightline.halfWidth - 0.24],
        ["right", keeperSightline.halfWidth + 0.24, RAPIER_GOAL.halfWidth - 0.52],
      ].forEach(function addSplitRearRow(segment) {
        var midX = (segment[1] + segment[2]) * 0.5;
        var cord = makeRearPocketRope(
          "goal-net-landscape-rear-catenary-cord-row-" + segment[0] + "-" + rowIndex,
          [
            { x: segment[1], y: rowY, z: -0.018 },
            { x: midX, y: rowY - rowSag, z: 0.074 },
            { x: segment[2], y: rowY - rowSag * 0.58, z: 0.034 },
          ],
          0.0038,
          0.046 + rowIndex * 0.007,
          RAPIER_GOAL.netPlaneZ + 0.58 + (rowIndex % 2) * 0.035,
        );
        markLandscapeSightlineNetDetail(cord);
        cord.userData.netLaneCutoutSystem = NET_LANE_CUTOUT_SYSTEM;
        cord.userData.rearPocketLayer = "landscape-catenary-depth-detail";
        cord.userData.crossesKeeperSightline = false;
        group.add(registerDynamicNetDetail(cord, 0.36, 0.1));
      });
    });

    columnXs.forEach(function addLandscapeRearColumn(columnX, columnIndex) {
      var sideBias = Math.abs(columnX) / RAPIER_GOAL.halfWidth;
      var cord = makeRearPocketRope(
        "goal-net-landscape-rear-catenary-cord-column-" + columnIndex,
        [
          { x: columnX, y: 0.34, z: -0.026 },
          { x: columnX + Math.sin(columnIndex * 0.9) * 0.025, y: 1.18, z: 0.074 + sideBias * 0.018 },
          { x: columnX + Math.cos(columnIndex * 0.7) * 0.018, y: RAPIER_GOAL.height - 0.22, z: -0.012 },
        ],
        0.0035,
        0.043 + sideBias * 0.026,
        RAPIER_GOAL.netPlaneZ + 0.64 + (columnIndex % 3) * 0.025,
      );
      markLandscapeSightlineNetDetail(cord);
      cord.userData.netLaneCutoutSystem = NET_LANE_CUTOUT_SYSTEM;
      cord.userData.rearPocketLayer = "landscape-catenary-depth-detail";
      cord.userData.crossesKeeperSightline = false;
      group.add(registerDynamicNetDetail(cord, 0.32, 0.08));
    });

    var tuftIndex = 0;
    rowYs.slice(0, 5).forEach(function addLandscapeTuftRow(rowY, rowIndex) {
      columnXs.forEach(function addLandscapeTuft(columnX, columnIndex) {
        var sideBias = Math.abs(columnX) / RAPIER_GOAL.halfWidth;
        var knot = makeMatchWeaveKnot(
          "goal-net-landscape-rear-knot-tuft-" + tuftIndex,
          columnX + (rowIndex % 2 ? 0.045 : -0.035),
          rowY + (columnIndex % 2 ? 0.01 : -0.01),
          RAPIER_GOAL.netPlaneZ + 0.62 + (rowIndex % 3) * 0.035 + sideBias * 0.04,
          0.0048 + sideBias * 0.0012,
          0.034 + sideBias * 0.034,
          {
            rearPocketLayer: "landscape-knotted-depth-detail",
            behindShotLane: true,
            crossesKeeperSightline: false,
            frontShotLaneOcclusion: 0,
            netPhotorealTextureSystem: NET_PHOTOREAL_TEXTURE_SYSTEM,
          },
        );
        markLandscapeSightlineNetDetail(knot);
        knot.userData.netLaneCutoutSystem = NET_LANE_CUTOUT_SYSTEM;
        group.add(registerDynamicNetDetail(knot, 0.18, 0.06));
        tuftIndex += 1;
      });
    });
  }
  if (BUILD_RETIRED_NET_LAYERS) addLandscapeRearNetTextureLayer();

  function addBroadcastRearPocketMeshLayer() {
    var meshWidth = RAPIER_GOAL.halfWidth * 2 - 1.04;
    var baseLeft = -RAPIER_GOAL.halfWidth + 0.52;
    var rearBaseZ = RAPIER_GOAL.netPlaneZ + 0.82;
    var cordIndex = 0;

    function addBroadcastCordSet(label, direction) {
      var slope = 0.78;
      for (
        var offset = -RAPIER_GOAL.halfWidth - RAPIER_GOAL.height * slope;
        offset <= RAPIER_GOAL.halfWidth + RAPIER_GOAL.height * slope;
        offset += 0.48
      ) {
        var points = [];
        for (var sample = 0; sample <= 14; sample += 1) {
          var t = sample / 14;
          var x = baseLeft + meshWidth * t;
          var y = direction > 0
            ? (x - offset) / slope
            : RAPIER_GOAL.height - (x - offset) / slope;
          if (y < 0.28 || y > RAPIER_GOAL.height - 0.2) continue;
          var sideBias = Math.abs(x) / RAPIER_GOAL.halfWidth;
          var rearSag = Math.sin(t * Math.PI) * (0.075 + sideBias * 0.022);
          points.push({
            x: x + Math.sin(sample * 0.52 + cordIndex * 0.31) * 0.01,
            y: y - rearSag * 0.42,
            z: 0.02 + rearSag + Math.sin(sample * 0.84 + cordIndex) * 0.012,
          });
        }
        if (points.length < 2) continue;

        var crossesSightline = points.some((point) => isInKeeperSightline(point));
        var averageSideBias = points.reduce((total, point) => total + Math.abs(point.x) / RAPIER_GOAL.halfWidth, 0) / points.length;
        var opacity = crossesSightline ? 0.016 + averageSideBias * 0.004 : 0.056 + averageSideBias * 0.042;
        var cord = makeRearPocketRope(
          "goal-net-broadcast-rear-mesh-cord-" + label + "-" + cordIndex,
          points,
          crossesSightline ? 0.0028 : 0.0039,
          Math.min(0.112, opacity),
          rearBaseZ + (cordIndex % 3) * 0.045,
        );
        cord.material.color.set(crossesSightline ? "#f7fffb" : "#fffdf2");
        cord.renderOrder = crossesSightline ? 4 : 5;
        markBroadcastSightlineNetDetail(cord, { crossesKeeperSightline: crossesSightline });
        cord.userData.rearPocketLayer = crossesSightline ? "broadcast-center-rear-pocket-mesh" : "broadcast-peripheral-rear-pocket-mesh";
        group.add(registerDynamicNetDetail(cord, crossesSightline ? 0.22 : 0.36, crossesSightline ? 0.035 : 0.09));
        cordIndex += 1;
      }
    }

    addBroadcastCordSet("rising", 1);
    addBroadcastCordSet("falling", -1);

    var knotIndex = 0;
    [0.46, 0.78, 1.1, 1.42, 1.74, 2.06].forEach(function addBroadcastKnotRow(knotY, rowIndex) {
      [-2.42, -1.74, -1.06, -0.38, 0.38, 1.06, 1.74, 2.42].forEach(function addBroadcastKnotColumn(knotX, columnIndex) {
        var x = knotX + (rowIndex % 2 ? 0.035 : -0.035);
        var y = knotY + (columnIndex % 2 ? 0.008 : -0.008);
        var crossesSightline = isInKeeperSightline({ x, y, z: rearBaseZ + 0.06 });
        var sideBias = Math.abs(x) / RAPIER_GOAL.halfWidth;
        var knot = makeMatchWeaveKnot(
          "goal-net-broadcast-rear-mesh-knot-" + knotIndex,
          x,
          y,
          rearBaseZ + 0.08 + (rowIndex % 3) * 0.026 + sideBias * 0.032,
          crossesSightline ? 0.0042 : 0.0066,
          crossesSightline ? 0.016 + sideBias * 0.004 : 0.038 + sideBias * 0.028,
          {
            rearPocketLayer: crossesSightline ? "broadcast-center-rear-pocket-mesh" : "broadcast-peripheral-rear-pocket-mesh",
            behindShotLane: true,
            crossesKeeperSightline: crossesSightline,
            frontShotLaneOcclusion: 0,
            netPhotorealTextureSystem: NET_PHOTOREAL_TEXTURE_SYSTEM,
            renderOrder: 6,
          },
        );
        knot.material.color.set(crossesSightline ? "#f7fffb" : "#fffdf2");
        markBroadcastSightlineNetDetail(knot, { crossesKeeperSightline: crossesSightline });
        group.add(registerDynamicNetDetail(knot, crossesSightline ? 0.12 : 0.22, crossesSightline ? 0.025 : 0.055));
        knotIndex += 1;
      });
    });
  }
  if (BUILD_RETIRED_NET_LAYERS) addBroadcastRearPocketMeshLayer();

  function makeMatchAlphaWeavePanel(name, width, height, x, y, z, opacity, options = {}) {
    var material = new THREE.MeshBasicMaterial({
      color: options.color || "#f7fffb",
      map: createMatchNetAlphaTexture(options.textureVariant || "edge"),
      transparent: true,
      opacity,
      depthWrite: false,
      side: THREE.DoubleSide,
      alphaTest: options.alphaTest ?? 0.012,
      polygonOffset: true,
      polygonOffsetFactor: -1,
    });
    material.userData.netVisualUpgradeSystem = NET_VISUAL_UPGRADE_SYSTEM;
    material.userData.netAlphaTextureSystem = NET_ALPHA_TEXTURE_SYSTEM;
    var panel = new THREE.Mesh(new THREE.PlaneGeometry(width, height, 1, 1), material);
    panel.name = name;
    panel.position.set(x, y, z);
    panel.rotation.y = options.rotationY || 0;
    panel.renderOrder = options.renderOrder || 2;
    panel.userData.netVisualUpgradeSystem = NET_VISUAL_UPGRADE_SYSTEM;
    panel.userData.netLandscapeSightlineSystem = NET_LANDSCAPE_SIGHTLINE_SYSTEM;
    panel.userData.netLaneGuardSystem = NET_LANE_GUARD_SYSTEM;
    panel.userData.rearPocketLayer = options.rearPocketLayer || "peripheral-edge-texture";
    panel.userData.behindShotLane = true;
    panel.userData.crossesKeeperSightline = Boolean(options.crossesKeeperSightline);
    panel.userData.frontShotLaneOcclusion = 0;
    return registerDynamicNetDetail(panel, options.motionScale ?? 0.18, options.opacityScale ?? 0.05);
  }

  if (BUILD_RETIRED_NET_LAYERS) {
  [
    ["center-depth", 2.28, 1.58, 0, 1.24, RAPIER_GOAL.netPlaneZ + 0.9, 0.02, {
      rearPocketLayer: "center-depth-texture",
      crossesKeeperSightline: true,
      textureVariant: "center",
      renderOrder: 1,
      motionScale: 0.12,
      opacityScale: 0.025,
    }],
    ["top-drape", RAPIER_GOAL.halfWidth * 1.72, 0.42, 0, RAPIER_GOAL.height - 0.26, RAPIER_GOAL.netPlaneZ + 0.66, 0.18, {
      textureVariant: "edge",
      motionScale: 0.22,
      opacityScale: 0.08,
    }],
    ["bottom-weighted", RAPIER_GOAL.halfWidth * 1.68, 0.34, 0, 0.28, RAPIER_GOAL.netPlaneZ + 0.72, 0.14, {
      textureVariant: "edge",
      motionScale: 0.18,
      opacityScale: 0.06,
    }],
    ["left-cheek", 0.78, 1.78, -RAPIER_GOAL.halfWidth + 0.34, 1.22, RAPIER_GOAL.netPlaneZ + 0.68, 0.22, {
      textureVariant: "edge",
      motionScale: 0.2,
      opacityScale: 0.08,
    }],
    ["right-cheek", 0.78, 1.78, RAPIER_GOAL.halfWidth - 0.34, 1.22, RAPIER_GOAL.netPlaneZ + 0.68, 0.22, {
      textureVariant: "edge",
      motionScale: 0.2,
      opacityScale: 0.08,
    }],
  ].forEach(function addMatchAlphaWeavePanel(item) {
    group.add(makeMatchAlphaWeavePanel(
      "goal-net-match-alpha-weave-panel-" + item[0],
      item[1],
      item[2],
      item[3],
      item[4],
      item[5],
      item[6],
      item[7],
    ));
  });
  }

  [
    ["top-left", [
      { x: -RAPIER_GOAL.halfWidth + 0.18, y: RAPIER_GOAL.height - 0.03, z: RAPIER_GOAL.netPlaneZ + 0.16 },
      { x: -keeperSightline.halfWidth - 0.34, y: RAPIER_GOAL.height - 0.075, z: RAPIER_GOAL.netPlaneZ + 0.2 },
    ], 0.15],
    ["top-right", [
      { x: keeperSightline.halfWidth + 0.34, y: RAPIER_GOAL.height - 0.075, z: RAPIER_GOAL.netPlaneZ + 0.2 },
      { x: RAPIER_GOAL.halfWidth - 0.18, y: RAPIER_GOAL.height - 0.03, z: RAPIER_GOAL.netPlaneZ + 0.16 },
    ], 0.15],
    ["bottom-left", [
      { x: -RAPIER_GOAL.halfWidth + 0.24, y: 0.11, z: RAPIER_GOAL.netPlaneZ + 0.16 },
      { x: -keeperSightline.halfWidth - 0.26, y: 0.1, z: RAPIER_GOAL.netPlaneZ + 0.2 },
    ], 0.13],
    ["bottom-right", [
      { x: keeperSightline.halfWidth + 0.26, y: 0.1, z: RAPIER_GOAL.netPlaneZ + 0.2 },
      { x: RAPIER_GOAL.halfWidth - 0.24, y: 0.11, z: RAPIER_GOAL.netPlaneZ + 0.16 },
    ], 0.13],
    ["left-post", [
      { x: -RAPIER_GOAL.halfWidth + 0.035, y: 0.32, z: RAPIER_GOAL.netPlaneZ + 0.13 },
      { x: -RAPIER_GOAL.halfWidth + 0.01, y: RAPIER_GOAL.height - 0.24, z: RAPIER_GOAL.netPlaneZ + 0.18 },
    ], 0.16],
    ["right-post", [
      { x: RAPIER_GOAL.halfWidth - 0.035, y: 0.32, z: RAPIER_GOAL.netPlaneZ + 0.13 },
      { x: RAPIER_GOAL.halfWidth - 0.01, y: RAPIER_GOAL.height - 0.24, z: RAPIER_GOAL.netPlaneZ + 0.18 },
    ], 0.16],
  ].forEach(function addFrontEdgeBraid(item) {
    var edgeStrand = makeMatchWeaveThread(
      "goal-net-front-edge-braided-strand-" + item[0],
      item[1],
      {
        radius: 0.0036,
        opacity: item[2],
        rearPocketLayer: "peripheral-edge-detail",
        behindShotLane: false,
        crossesKeeperSightline: false,
        frontShotLaneOcclusion: 0,
        renderOrder: 6,
      },
    );
    group.add(registerDynamicNetDetail(edgeStrand, 0.38, 0.12));
  });

  if (BUILD_RETIRED_NET_LAYERS) ["left", "right"].forEach(function addSideReturnCord(side) {
    var sign = side === "left" ? -1 : 1;
    [0.62, 1.42].forEach(function addSideReturnRow(rowY, rowIndex) {
      var sideReturn = makeRaisedRope("goal-net-side-return-cord-" + side + "-" + rowIndex, [
        { x: sign * (RAPIER_GOAL.halfWidth - 0.06), y: rowY + 0.12, z: RAPIER_GOAL.netPlaneZ + 0.13 },
        { x: sign * (RAPIER_GOAL.halfWidth + 0.18), y: rowY + 0.04, z: RAPIER_GOAL.netPlaneZ + 0.5 },
        { x: sign * (RAPIER_GOAL.halfWidth + 0.42), y: rowY - 0.1, z: RAPIER_GOAL.netPlaneZ + 0.9 },
      ], 0.0056, 0.106);
      sideReturn.userData.netProfessionalSystem = NET_PROFESSIONAL_SYSTEM;
      group.add(registerDynamicNetDetail(sideReturn, 0.58, 0.2));
    });
  });

  if (BUILD_RETIRED_NET_LAYERS) {
  var slackKnotGeometry = new THREE.SphereGeometry(0.014, 8, 6);
  var knotColumns = [-2.94, -2.12, -1.34, -0.66, 0.66, 1.34, 2.12, 2.94];
  var knotRows = [0.36, 0.78, 1.2, 1.62, 2.04];
  var slackKnotIndex = 0;
  knotRows.forEach(function addSlackKnotRow(knotY, rowIndex) {
    knotColumns.forEach(function addSlackKnot(knotX, columnIndex) {
      var finalKnotX = knotX + (rowIndex % 2 ? 0.035 : -0.025);
      var finalKnotY = knotY + (columnIndex % 2 ? -0.012 : 0.012);
      var crossesSightline =
        Math.abs(finalKnotX) < keeperSightline.halfWidth &&
        finalKnotY > keeperSightline.minY &&
        finalKnotY < keeperSightline.maxY;
      if (crossesSightline) return;
      var isMobileLandscapeKnot = isInMobileLandscapeSightline({ x: finalKnotX, y: finalKnotY });
      var knotMaterial = raisedRopeMaterial.clone();
      knotMaterial.opacity = isMobileLandscapeKnot ? 0.034 : 0.078 + Math.abs(finalKnotX) / RAPIER_GOAL.halfWidth * 0.036;
      knotMaterial.depthWrite = false;
      knotMaterial.transparent = true;
      var knot = new THREE.Mesh(slackKnotGeometry, knotMaterial);
      knot.name = "goal-net-slack-knot-" + slackKnotIndex;
      knot.position.set(
        finalKnotX,
        finalKnotY,
        RAPIER_GOAL.netPlaneZ + 0.162 + Math.sin(rowIndex * 0.78 + columnIndex * 0.46) * 0.018,
      );
      knot.scale.setScalar(crossesSightline ? 0.76 : 1);
      knot.renderOrder = 4;
      knot.userData.netProfessionalSystem = NET_PROFESSIONAL_SYSTEM;
      knot.userData.netOcclusionBudgetSystem = NET_OCCLUSION_BUDGET_SYSTEM;
      if (isMobileLandscapeKnot) {
        knot.userData.netBroadcastSightlineSystem = NET_BROADCAST_SIGHTLINE_SYSTEM;
      }
      knot.userData.crossesKeeperSightline = crossesSightline;
      group.add(registerDynamicNetDetail(knot, crossesSightline ? 0.34 : 0.52, crossesSightline ? 0.12 : 0.18));
      slackKnotIndex += 1;
    });
  });
  }

  var rearFrameNames = {
    "top-left-rail": "goal-frame-top-rail-left",
    "top-right-rail": "goal-frame-top-rail-right",
    "rear-left-upright": "goal-frame-rear-upright-left",
    "rear-right-upright": "goal-frame-rear-upright-right",
    "rear-top-rail": "goal-frame-rear-top-rail",
    "bottom-left-rail": "goal-frame-bottom-rail-left",
    "bottom-right-rail": "goal-frame-bottom-rail-right",
    "rear-bottom-rail": "goal-frame-rear-bottom-rail",
  };
  GOAL_FRAME_SEGMENTS.filter((segment) => rearFrameNames[segment.name]).forEach(function addRearFrameSegment(segment) {
    var rail = makeLimb("#b6c3bd", GOAL_NET_GEOMETRY.frameRadius * 0.62);
    rail.name = rearFrameNames[segment.name];
    setLimb(rail, segment.start, segment.end);
    markGoalFrameSegment(rail, segment.name);
    group.add(rail);
  });

  if (BUILD_RETIRED_NET_LAYERS) {
  for (var drapeIndex = 0; drapeIndex < 7; drapeIndex += 1) {
    var drapeT = drapeIndex / 6;
    var drapeX = -RAPIER_GOAL.halfWidth + 0.54 + drapeT * (RAPIER_GOAL.halfWidth * 2 - 1.08);
    var sideBias = Math.abs(drapeX) / RAPIER_GOAL.halfWidth;
    var drapeOpacity = 0.064 + sideBias * 0.036;
    group.add(registerDynamicNetDetail(makeRaisedRope("goal-net-rear-drape-cord-" + drapeIndex, [
      { x: drapeX, y: RAPIER_GOAL.height - 0.08, z: RAPIER_GOAL.netPlaneZ + 0.14 },
      { x: drapeX * 1.035, y: RAPIER_GOAL.height * 0.48, z: RAPIER_GOAL.netPlaneZ + 0.58 + Math.sin(drapeIndex * 0.9) * 0.025 },
      { x: drapeX * 1.055, y: 0.16, z: RAPIER_GOAL.netPlaneZ + 0.88 },
    ], 0.0049, drapeOpacity), 0.72, 0.32));
  }
  }

  if (BUILD_RETIRED_NET_LAYERS) ["left", "right"].forEach(function addSideDepthCords(side) {
    var sign = side === "left" ? -1 : 1;
    [0.46, 0.92, 1.42].forEach(function addSideDepthCord(rowY, rowIndex) {
      group.add(registerDynamicNetDetail(makeRaisedRope("goal-net-side-depth-cord-" + side + "-" + rowIndex, [
        { x: sign * RAPIER_GOAL.halfWidth, y: rowY + 0.08, z: RAPIER_GOAL.netPlaneZ + 0.1 },
        { x: sign * (RAPIER_GOAL.halfWidth + 0.22), y: rowY + 0.02, z: RAPIER_GOAL.netPlaneZ + 0.48 },
        { x: sign * (RAPIER_GOAL.halfWidth + 0.42), y: Math.max(0.16, rowY - 0.12), z: RAPIER_GOAL.netPlaneZ + 0.9 },
      ], 0.0048, 0.112), 0.62, 0.24));
    });
  });

  if (BUILD_RETIRED_NET_LAYERS) {
  var cordMaterial = new THREE.MeshBasicMaterial({ color: "#f5fffb", transparent: true, opacity: 0.32, depthWrite: false });
  [
    ["top-left", -RAPIER_GOAL.halfWidth, RAPIER_GOAL.height, RAPIER_GOAL.netPlaneZ, -RAPIER_GOAL.halfWidth - 0.42, 0.18, RAPIER_GOAL.netPlaneZ + 0.92],
    ["top-right", RAPIER_GOAL.halfWidth, RAPIER_GOAL.height, RAPIER_GOAL.netPlaneZ, RAPIER_GOAL.halfWidth + 0.42, 0.18, RAPIER_GOAL.netPlaneZ + 0.92],
    ["mid-left", -RAPIER_GOAL.halfWidth, RAPIER_GOAL.height * 0.55, RAPIER_GOAL.netPlaneZ, -RAPIER_GOAL.halfWidth - 0.42, 0.12, RAPIER_GOAL.netPlaneZ + 0.92],
    ["mid-right", RAPIER_GOAL.halfWidth, RAPIER_GOAL.height * 0.55, RAPIER_GOAL.netPlaneZ, RAPIER_GOAL.halfWidth + 0.42, 0.12, RAPIER_GOAL.netPlaneZ + 0.92],
  ].forEach(function addTensionCord(item) {
    var cord = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(item[1], item[2], item[3]),
        new THREE.Vector3(item[4], item[5], item[6]),
      ]),
      cordMaterial.clone(),
    );
    cord.name = "goal-net-tension-cord-" + item[0];
    group.add(registerDynamicNetDetail(cord, 0.86, 0.42));

    var knot = new THREE.Mesh(new THREE.SphereGeometry(0.035, 12, 8), cordMaterial.clone());
    knot.name = "goal-net-rope-knot-" + item[0];
    knot.position.set(item[4], item[5], item[6]);
    group.add(registerDynamicNetDetail(knot, 0.62, 0.36));
  });
  }

  var rearWeightCordMaterial = new THREE.LineBasicMaterial({
    color: "#f5fffb",
    transparent: true,
    opacity: 0.28,
  });
  var rearWeightCord = new THREE.Line(
    new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(-RAPIER_GOAL.halfWidth + 0.06, 0.08, GOAL_CAGE_POINTS.rearBottomLeft.z - 0.02),
      new THREE.Vector3(RAPIER_GOAL.halfWidth - 0.06, 0.08, GOAL_CAGE_POINTS.rearBottomRight.z - 0.02),
    ]),
    rearWeightCordMaterial,
  );
  rearWeightCord.name = "goal-net-rear-weight-cord-main";
  group.add(registerDynamicNetDetail(rearWeightCord, 0.42, 0.22));

  var sleeveMaterial = new THREE.MeshStandardMaterial({ color: "#fbfff4", roughness: 0.4, metalness: 0.02 });
  [
    ["front-left", -RAPIER_GOAL.halfWidth, RAPIER_GOAL.height - 0.22, RAPIER_GOAL.netPlaneZ + 0.035],
    ["front-right", RAPIER_GOAL.halfWidth, RAPIER_GOAL.height - 0.22, RAPIER_GOAL.netPlaneZ + 0.035],
    ["back-left", -RAPIER_GOAL.halfWidth, GOAL_NET_GEOMETRY.rearHeight - 0.22, GOAL_CAGE_POINTS.rearTopLeft.z - 0.035],
    ["back-right", RAPIER_GOAL.halfWidth, GOAL_NET_GEOMETRY.rearHeight - 0.22, GOAL_CAGE_POINTS.rearTopRight.z - 0.035],
  ].forEach(function addCornerSleeve(item) {
    var sleeve = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.032, 0.36, 12), sleeveMaterial);
    sleeve.name = "goal-net-corner-sleeve-" + item[0];
    sleeve.position.set(item[1], item[2], item[3]);
    group.add(registerDynamicNetDetail(sleeve, 0.42, 0.22));
  });

  if (BUILD_RETIRED_NET_LAYERS) {
  var weaveKnotMaterial = raisedRopeMaterial.clone();
  weaveKnotMaterial.color.set("#fafff7");
  weaveKnotMaterial.opacity = 0.056;
  weaveKnotMaterial.depthWrite = false;
  weaveKnotMaterial.transparent = true;
  for (var weaveKnotIndex = 0; weaveKnotIndex < 10; weaveKnotIndex += 1) {
    var knotX = -RAPIER_GOAL.halfWidth + 0.52 + (weaveKnotIndex % 5) * 1.42;
    var knotY = 0.46 + Math.floor(weaveKnotIndex / 5) * 0.96 + (weaveKnotIndex % 2) * 0.12;
    var isMobileLandscapeKnot = isInMobileLandscapeSightline({ x: knotX, y: knotY });
    var weaveKnotNodeMaterial = weaveKnotMaterial.clone();
    weaveKnotNodeMaterial.opacity = isMobileLandscapeKnot ? 0.034 : weaveKnotMaterial.opacity;
    var weaveKnot = new THREE.Mesh(new THREE.SphereGeometry(0.018, 8, 6), weaveKnotNodeMaterial);
    weaveKnot.name = "goal-net-weave-knot-" + weaveKnotIndex;
    weaveKnot.position.set(knotX, knotY, RAPIER_GOAL.netPlaneZ + 0.12);
    if (isMobileLandscapeKnot) {
      weaveKnot.userData.netBroadcastSightlineSystem = NET_BROADCAST_SIGHTLINE_SYSTEM;
    }
    group.add(registerDynamicNetDetail(weaveKnot, 0.76, 0.42));
  }
  }

  var netWeightMaterial = new THREE.MeshStandardMaterial({ color: "#eef4e9", roughness: 0.46, metalness: 0.05 });
  for (var weightIndex = 0; weightIndex < 5; weightIndex += 1) {
    var weight = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.045, 0.34, 14), netWeightMaterial);
    weight.name = "goal-net-bottom-weight-" + weightIndex;
    weight.rotation.z = Math.PI / 2;
    weight.position.set(-RAPIER_GOAL.halfWidth + 0.72 + weightIndex * 1.48, 0.055, GOAL_CAGE_POINTS.rearBottomLeft.z - 0.04);
    group.add(registerDynamicNetDetail(weight, 0.34, 0.16));
  }

  var strapMaterial = new THREE.MeshBasicMaterial({
    color: "#fff6d8",
    transparent: true,
    opacity: 0.5,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  for (var strapIndex = 0; strapIndex < 10; strapIndex += 1) {
    var topStrap = strapIndex < 5;
    var sideSign = strapIndex % 2 === 0 ? -1 : 1;
    var strap = new THREE.Mesh(new THREE.BoxGeometry(topStrap ? 0.035 : 0.028, topStrap ? 0.14 : 0.16, 0.016), strapMaterial.clone());
    strap.name = "goal-net-tie-strap-" + strapIndex;
    if (topStrap) {
      strap.position.set(-RAPIER_GOAL.halfWidth + 0.52 + strapIndex * 0.52, RAPIER_GOAL.height - 0.02, RAPIER_GOAL.netPlaneZ + 0.09);
      strap.rotation.z = Math.PI / 2;
    } else {
      var sideOrder = Math.floor((strapIndex - 5) / 2);
      strap.position.set(sideSign * RAPIER_GOAL.halfWidth, 0.52 + sideOrder * 0.52, RAPIER_GOAL.netPlaneZ + 0.08);
      strap.rotation.y = sideSign > 0 ? -Math.PI / 2 : Math.PI / 2;
    }
    group.add(registerDynamicNetDetail(strap, 0.48, 0.22));
  }

  var clipMaterial = new THREE.MeshStandardMaterial({ color: "#f9fff4", roughness: 0.36, metalness: 0.04 });
  for (var clipIndex = 0; clipIndex < 8; clipIndex += 1) {
    var clip = new THREE.Mesh(new THREE.BoxGeometry(0.075, 0.045, 0.028), clipMaterial);
    clip.name = "goal-frame-net-clip-" + clipIndex;
    if (clipIndex < 4) {
      clip.position.set(-RAPIER_GOAL.halfWidth + 1.08 + clipIndex * 1.72, RAPIER_GOAL.height - 0.02, RAPIER_GOAL.netPlaneZ + 0.055);
    } else {
      var clipSide = clipIndex % 2 === 0 ? -1 : 1;
      clip.position.set(clipSide * RAPIER_GOAL.halfWidth, 0.64 + Math.floor((clipIndex - 4) / 2) * 0.72, RAPIER_GOAL.netPlaneZ + 0.06);
      clip.rotation.z = Math.PI / 2;
    }
    group.add(clip);
  }

  var tensionerMaterial = new THREE.MeshStandardMaterial({ color: "#cfdad2", roughness: 0.32, metalness: 0.18 });
  [
    ["front-left", -RAPIER_GOAL.halfWidth, RAPIER_GOAL.height - 0.34, RAPIER_GOAL.netPlaneZ + 0.08],
    ["front-right", RAPIER_GOAL.halfWidth, RAPIER_GOAL.height - 0.34, RAPIER_GOAL.netPlaneZ + 0.08],
    ["rear-left", -RAPIER_GOAL.halfWidth, 0.3, GOAL_CAGE_POINTS.rearBottomLeft.z - 0.06],
    ["rear-right", RAPIER_GOAL.halfWidth, 0.3, GOAL_CAGE_POINTS.rearBottomRight.z - 0.06],
  ].forEach(function addRopeTensioner(item) {
    var tensioner = makeBeveledBox("goal-net-rope-tensioner-" + item[0], 0.12, 0.052, 0.04, 0.014, tensionerMaterial);
    tensioner.position.set(item[1], item[2], item[3]);
    tensioner.rotation.y = item[1] < 0 ? 0.28 : -0.28;
    group.add(registerDynamicNetDetail(tensioner, 0.38, 0.18));
  });

  var labelMaterial = new THREE.MeshBasicMaterial({ color: "#f0782f", transparent: true, opacity: 0.92, side: THREE.DoubleSide });
  [
    ["left", -RAPIER_GOAL.halfWidth - 0.018],
    ["right", RAPIER_GOAL.halfWidth + 0.018],
  ].forEach(function addNetLabel(item) {
    var label = new THREE.Mesh(new THREE.PlaneGeometry(0.16, 0.1), labelMaterial.clone());
    label.name = "goal-net-label-tab-" + item[0];
    label.position.set(item[1], 0.86, RAPIER_GOAL.netPlaneZ + 0.09);
    label.rotation.y = item[0] === "left" ? Math.PI / 2 : -Math.PI / 2;
    group.add(label);
  });

  var anchorMaterial = new THREE.MeshStandardMaterial({ color: "#dbe8dd", roughness: 0.48, metalness: 0.04 });
  var footPadMaterial = new THREE.MeshStandardMaterial({ color: "#2f363a", roughness: 0.66, metalness: 0.02 });
  [
    ["front-left", -RAPIER_GOAL.halfWidth, 0, RAPIER_GOAL.netPlaneZ],
    ["front-right", RAPIER_GOAL.halfWidth, 0, RAPIER_GOAL.netPlaneZ],
    ["back-left", -RAPIER_GOAL.halfWidth, 0, GOAL_CAGE_POINTS.rearBottomLeft.z],
    ["back-right", RAPIER_GOAL.halfWidth, 0, GOAL_CAGE_POINTS.rearBottomRight.z],
  ].forEach(function addAnchor(item, anchorIndex) {
    var anchor = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.085, 0.055, 14), anchorMaterial);
    anchor.name = "goal-net-anchor-" + item[0];
    anchor.position.set(item[1], 0.03, item[3]);
    group.add(anchor);

    var footPad = makeBeveledBox("goal-frame-ground-foot-pad-" + item[0], 0.28, 0.034, 0.18, 0.028, footPadMaterial);
    footPad.position.set(item[1], 0.018, item[3]);
    footPad.scale.set(item[0].startsWith("front") ? 1.12 : 0.92, 1, item[0].startsWith("front") ? 0.72 : 0.86);
    group.add(footPad);

    var footBolt = new THREE.Mesh(new THREE.SphereGeometry(0.016, 10, 8), boltMaterial);
    footBolt.name = "goal-frame-fastener-bolt-foot-" + anchorIndex;
    footBolt.position.set(item[1] + (item[0].includes("left") ? -0.048 : 0.048), 0.052, item[3] + 0.014);
    group.add(footBolt);
  });

  var groundShadowPadMaterial = new THREE.MeshBasicMaterial({
    color: "#172226",
    transparent: true,
    opacity: 0.2,
    depthWrite: false,
  });
  ["left", "right"].forEach(function addGroundShadowPad(side) {
    var sign = side === "left" ? -1 : 1;
    var shadowPad = new THREE.Mesh(new THREE.CircleGeometry(1, 36), groundShadowPadMaterial.clone());
    shadowPad.name = "goal-frame-ground-shadow-pad-" + side;
    shadowPad.rotation.x = -Math.PI / 2;
    shadowPad.scale.set(0.46, 0.16, 1);
    shadowPad.position.set(sign * RAPIER_GOAL.halfWidth, 0.006, RAPIER_GOAL.netPlaneZ + 0.08);
    group.add(shadowPad);
  });

  var ballMarkMaterial = new THREE.MeshBasicMaterial({
    color: "#62706a",
    transparent: true,
    opacity: 0.24,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  [
    ["left-low", -RAPIER_GOAL.halfWidth, 0.58, RAPIER_GOAL.netPlaneZ - 0.071, 0.07, 0.044, -0.18],
    ["left-high", -RAPIER_GOAL.halfWidth, 1.18, RAPIER_GOAL.netPlaneZ - 0.071, 0.052, 0.034, 0.22],
    ["right-low", RAPIER_GOAL.halfWidth, 0.72, RAPIER_GOAL.netPlaneZ - 0.071, 0.064, 0.038, 0.12],
    ["crossbar-center", -0.28, RAPIER_GOAL.height, RAPIER_GOAL.netPlaneZ - 0.071, 0.075, 0.036, -0.1],
    ["crossbar-right", 1.16, RAPIER_GOAL.height, RAPIER_GOAL.netPlaneZ - 0.071, 0.054, 0.032, 0.18],
  ].forEach(function addGoalFrameBallMark(item, index) {
    var mark = new THREE.Mesh(new THREE.CircleGeometry(1, 22), ballMarkMaterial.clone());
    mark.name = "goal-frame-ball-mark-" + item[0];
    mark.scale.set(item[4], item[5], 1);
    mark.rotation.z = item[6];
    mark.material.opacity = 0.14 + (index % 3) * 0.035;
    mark.position.set(item[1], item[2], item[3]);
    group.add(mark);
  });

  if (BUILD_RETIRED_NET_LAYERS) {
  var soilSmudgeMaterial = new THREE.MeshBasicMaterial({
    color: "#816f42",
    transparent: true,
    opacity: 0.18,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  for (var soilSmudgeIndex = 0; soilSmudgeIndex < 4; soilSmudgeIndex += 1) {
    var soilSmudge = new THREE.Mesh(new THREE.PlaneGeometry(0.62, 0.085), soilSmudgeMaterial.clone());
    soilSmudge.name = "goal-net-bottom-soil-smudge-" + soilSmudgeIndex;
    soilSmudge.rotation.z = (soilSmudgeIndex % 2 ? 0.05 : -0.05);
    soilSmudge.material.opacity = 0.12 + soilSmudgeIndex * 0.018;
    soilSmudge.position.set(-RAPIER_GOAL.halfWidth + 0.72 + soilSmudgeIndex * 1.48, 0.12, RAPIER_GOAL.netPlaneZ + 0.118);
    group.add(registerDynamicNetDetail(soilSmudge, 0.22, 0.12));
  }
  }

  var pegShadowMaterial = new THREE.MeshBasicMaterial({
    color: "#121f25",
    transparent: true,
    opacity: 0.22,
    depthWrite: false,
  });
  [
    ["front-left", -RAPIER_GOAL.halfWidth, RAPIER_GOAL.netPlaneZ],
    ["front-right", RAPIER_GOAL.halfWidth, RAPIER_GOAL.netPlaneZ],
    ["back-left", -RAPIER_GOAL.halfWidth, GOAL_CAGE_POINTS.rearBottomLeft.z],
    ["back-right", RAPIER_GOAL.halfWidth, GOAL_CAGE_POINTS.rearBottomRight.z],
  ].forEach(function addNetPegShadow(item) {
    var pegShadow = new THREE.Mesh(new THREE.CircleGeometry(1, 24), pegShadowMaterial.clone());
    pegShadow.name = "goal-net-peg-shadow-" + item[0];
    pegShadow.rotation.x = -Math.PI / 2;
    pegShadow.scale.set(0.16, 0.055, 1);
    pegShadow.position.set(item[1], 0.007, item[2] + 0.035);
    group.add(pegShadow);
  });

  var hingeMaterial = new THREE.MeshStandardMaterial({ color: "#d9e6dc", roughness: 0.38, metalness: 0.12 });
  ["left", "right"].forEach(function addDepthHinge(side) {
    var sign = side === "left" ? -1 : 1;
    var hinge = makeBeveledBox("goal-depth-hinge-bracket-" + side, 0.14, 0.075, 0.05, 0.016, hingeMaterial);
    hinge.position.set(
      sign * RAPIER_GOAL.halfWidth,
      0.13,
      RAPIER_GOAL.netPlaneZ + GOAL_NET_GEOMETRY.cageDepth * 0.55,
    );
    hinge.rotation.y = sign * 0.34;
    group.add(hinge);
  });

  var retiredNetVisualPatterns = [
    /^goal-net-raised-(vertical|horizontal)-cord-/,
    /^goal-net-diagonal-weave-/,
    /^goal-net-open-diamond-rope-/,
    /^goal-net-rear-pocket-(sag-cord|diamond-rope|depth-lace)-/,
    /^goal-net-rear-depth-row-cord-/,
    /^goal-net-match-weave-/,
    /^goal-net-rear-hex-pocket-/,
    /^goal-net-landscape-rear-/,
    /^goal-net-broadcast-rear-/,
    /^goal-net-match-alpha-weave-panel-/,
    /^goal-net-lace-knot-/,
    /^goal-net-slack-knot-/,
    /^goal-net-rear-drape-cord-/,
    /^goal-net-weave-knot-/,
    /^goal-net-bottom-soil-smudge-/,
    /^goal-net-depth-haze-/,
    /^goal-net-side-(left|right)$/,
  ];
  var retiredNetObjects = [];

  group.traverse(function collectRetiredNetVisual(node) {
    if (retiredNetVisualPatterns.some((pattern) => pattern.test(node.name || ""))) {
      retiredNetObjects.push(node);
    }
  });

  var retiredNetNames = new Set(retiredNetObjects.map((node) => node.name));
  retiredNetObjects.forEach(function removeRetiredNetVisual(node) {
    node.parent?.remove(node);
  });
  dynamicNetDetails = dynamicNetDetails.filter((detail) => !retiredNetNames.has(detail.name));
  group.userData.netPerformanceSystem = "single-shell-mobile-net-budget";
  group.userData.retiredNetLayerCount = retiredNetObjects.length;

  return { group, net, grid, dynamicNetDetails };
}

function makeLimb(color, radius = 0.055) {
  return new THREE.Mesh(
    new THREE.CylinderGeometry(radius, radius, 1, 10),
    new THREE.MeshStandardMaterial({ color: color, roughness: 0.72 }),
  );
}

export function setLimb(mesh, start, end) {
  var a = new THREE.Vector3(start.x, start.y, start.z);
  var b = new THREE.Vector3(end.x, end.y, end.z);
  var direction = new THREE.Vector3().subVectors(b, a);
  var length = Math.max(0.001, direction.length());
  mesh.position.copy(a.add(b).multiplyScalar(0.5));
  mesh.scale.set(1, length, 1);
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize());
}

export function createShooterModel() {
  var group = new THREE.Group();
  group.userData.visualStyle = "cohesive-autonomous-ball-launcher";
  group.userData.visualPurpose = "feed-aim-launch-without-operator-clutter";
  group.userData.geometryPolishSystem = ROUNDED_BOX_BEVELED_PROP_SYSTEM;
  group.userData.launcherStationSystem = "animated-launch-bay-with-ball-feed";
  group.userData.launcherRigSystem = "guarded-feed-aim-launch-rig";
  group.userData.launcherMechanismSystem = "hydraulic-recoil-aiming-cradle";
  group.userData.launcherReleaseFeedbackSystem = "recoil-exhaust-floor-shock-kit";
  group.userData.launcherFeedSystem = "indexed-rotary-ball-feed-servo";
  group.userData.launcherMaterialSystem = LAUNCHER_PBR_MATERIAL_SYSTEM;
  group.userData.launcherDecalSystem = LAUNCHER_DECAL_SYSTEM;
  group.userData.launcherReadabilitySystem = LAUNCHER_DISTANCE_CLARITY_SYSTEM;
  group.userData.matchUseDetailSystem = "clean-launcher-contact-shadow-layer";
  group.position.set(
    LAUNCHER_GEOMETRY.basePosition.x,
    LAUNCHER_GEOMETRY.basePosition.y,
    LAUNCHER_GEOMETRY.basePosition.z,
  );
  group.scale.setScalar(LAUNCHER_GEOMETRY.scale);

  var chassisMat = new THREE.MeshStandardMaterial({ color: "#365c66", roughness: 0.46, metalness: 0.08 });
  var panelMat = new THREE.MeshStandardMaterial({ color: "#f3fbf0", roughness: 0.42, metalness: 0.02 });
  var barrelMat = new THREE.MeshStandardMaterial({ color: "#19242a", roughness: 0.38, metalness: 0.16 });
  var wheelMat = new THREE.MeshStandardMaterial({ color: "#11191e", roughness: 0.5, metalness: 0.04 });
  var tireGrooveMat = new THREE.MeshStandardMaterial({ color: "#2f444d", roughness: 0.5 });
  applyLauncherMaterialMaps(chassisMat, "paint", 0.01);
  applyLauncherMaterialMaps(panelMat, "paint", 0.008);
  applyLauncherMaterialMaps(barrelMat, "gunmetal", 0.011);
  applyLauncherMaterialMaps(wheelMat, "rubber", 0.013);
  applyLauncherMaterialMaps(tireGrooveMat, "rubber", 0.011);
  var accentMat = new THREE.MeshBasicMaterial({ color: "#a8d6cf", transparent: true, opacity: 0.72 });
  var orangeAccentMat = new THREE.MeshBasicMaterial({ color: "#e77932", transparent: true, opacity: 0.82 });
  var ballMat = createFootballMaterial();
  var shadowMat = new THREE.MeshBasicMaterial({ color: "#1b252b", transparent: true, opacity: 0.2, depthWrite: false });
  var laneMat = new THREE.MeshBasicMaterial({ color: "#f8fff0", transparent: true, opacity: 0.18, depthWrite: false });
  var cableMat = new THREE.LineBasicMaterial({ color: "#20323a", transparent: true, opacity: 0.68 });
  var guardMat = new THREE.MeshBasicMaterial({ color: "#d8fbff", transparent: true, opacity: 0.18, depthWrite: false, side: THREE.DoubleSide });
  var screenMat = new THREE.MeshBasicMaterial({ color: "#61f0ff", transparent: true, opacity: 0.42, depthWrite: false });
  var ledMat = new THREE.MeshBasicMaterial({ color: "#fff1a8", transparent: true, opacity: 0.42, depthWrite: false });
  var railMat = new THREE.MeshBasicMaterial({ color: "#dff8ff", transparent: true, opacity: 0.28, depthWrite: false });
  var feedChuteMat = new THREE.MeshBasicMaterial({ color: "#dff8ff", transparent: true, opacity: 0.24, depthWrite: false, side: THREE.DoubleSide });
  var operatorMat = new THREE.MeshStandardMaterial({ color: "#203039", roughness: 0.68, metalness: 0.02 });
  var operatorAccentMat = new THREE.MeshStandardMaterial({ color: "#ff8b3d", roughness: 0.46, metalness: 0.02 });
  var flashMat = new THREE.MeshBasicMaterial({
    color: "#fff1a8",
    transparent: true,
    opacity: 0,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  var exhaustPuffMat = new THREE.MeshBasicMaterial({
    color: "#dff8ff",
    transparent: true,
    opacity: 0,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
  });
  var floorShockMat = new THREE.MeshBasicMaterial({
    color: "#fff1a8",
    transparent: true,
    opacity: 0,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
  });
  var releaseDustMat = new THREE.MeshBasicMaterial({
    color: "#e7d5a7",
    transparent: true,
    opacity: 0,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  var readabilityFrameMaterial = new THREE.MeshStandardMaterial({
    color: "#edf2ed",
    emissive: "#263b3d",
    emissiveIntensity: 0.08,
    roughness: 0.48,
    metalness: 0.04,
  });
  var readabilityFrame = [
    ["left", { x: -0.5, y: 0.28, z: -0.04 }, { x: -0.54, y: 1.76, z: -0.08 }],
    ["right", { x: 0.5, y: 0.28, z: -0.04 }, { x: 0.54, y: 1.76, z: -0.08 }],
    ["top", { x: -0.54, y: 1.76, z: -0.08 }, { x: 0.54, y: 1.76, z: -0.08 }],
  ].map(function createReadabilityFramePart(item) {
    var part = makeLimb("#edf2ed", 0.028);
    part.name = "launcher-protective-roll-frame-" + item[0];
    part.material = readabilityFrameMaterial.clone();
    part.userData.launcherReadabilitySystem = LAUNCHER_DISTANCE_CLARITY_SYSTEM;
    part.userData.visualPurpose = "protect-launcher-and-clarify-silhouette";
    setLimb(part, item[1], item[2]);
    return part;
  });

  var kickPad = makeBeveledBox("launcher-kick-pad", 1.22, 0.018, 0.52, 0.12, laneMat.clone(), 0, 0.012, 0.42, 8);

  var aimRailLeft = makeLimb("#f8fff0", 0.012);
  aimRailLeft.name = "launcher-aim-rail-left";
  aimRailLeft.material.transparent = true;
  aimRailLeft.material.opacity = 0.46;
  setLimb(aimRailLeft, { x: -0.19, y: 0.035, z: 0.28 }, { x: -0.34, y: 0.035, z: 1.35 });
  var aimRailRight = makeLimb("#f8fff0", 0.012);
  aimRailRight.name = "launcher-aim-rail-right";
  aimRailRight.material.transparent = true;
  aimRailRight.material.opacity = 0.46;
  setLimb(aimRailRight, { x: 0.19, y: 0.035, z: 0.28 }, { x: 0.34, y: 0.035, z: 1.35 });

  var chevronShape = new THREE.Shape();
  chevronShape.moveTo(0, 0.09);
  chevronShape.lineTo(0.18, -0.08);
  chevronShape.lineTo(0.08, -0.08);
  chevronShape.lineTo(0, -0.005);
  chevronShape.lineTo(-0.08, -0.08);
  chevronShape.lineTo(-0.18, -0.08);
  chevronShape.lineTo(0, 0.09);
  var chevronGeometry = new THREE.ShapeGeometry(chevronShape);
  var laneChevrons = Array.from({ length: 3 }, (_, index) => {
    var chevron = new THREE.Mesh(chevronGeometry, orangeAccentMat.clone());
    chevron.name = "launcher-lane-chevron-" + index;
    chevron.rotation.x = -Math.PI / 2;
    chevron.position.set(0, 0.02, 0.58 + index * 0.34);
    chevron.scale.setScalar(0.72 + index * 0.1);
    chevron.material.opacity = 0.36 + index * 0.1;
    return chevron;
  });

  var shadow = new THREE.Mesh(new THREE.CircleGeometry(0.58, 32), shadowMat);
  shadow.name = "launcher-shadow";
  shadow.rotation.x = -Math.PI / 2;
  shadow.scale.set(1.5, 0.48, 1);
  shadow.position.set(0, 0.01, 0.12);

  var treadShadowMat = new THREE.MeshBasicMaterial({
    color: "#182226",
    transparent: true,
    opacity: 0.2,
    depthWrite: false,
  });
  var wheelTreadShadows = [
    ["left", -0.34],
    ["right", 0.34],
  ].map((item) => {
    var treadShadow = new THREE.Mesh(new THREE.CircleGeometry(1, 28), treadShadowMat.clone());
    treadShadow.name = "launcher-wheel-tread-shadow-" + item[0];
    treadShadow.rotation.x = -Math.PI / 2;
    treadShadow.scale.set(0.2, 0.055, 1);
    treadShadow.position.set(item[1], 0.014, 0.08);
    return treadShadow;
  });

  var serviceMat = makeBeveledBox("launcher-service-mat", 0.82, 0.018, 0.42, 0.06, new THREE.MeshBasicMaterial({
    color: "#2f3d44",
    transparent: true,
    opacity: 0.28,
    depthWrite: false,
    side: THREE.DoubleSide,
  }), -0.72, 0.012, 0.42, 6);
  serviceMat.rotation.z = -0.08;

  var footprintScuffMat = new THREE.MeshBasicMaterial({
    color: "#756a42",
    transparent: true,
    opacity: 0.18,
    depthWrite: false,
  });
  var footprintScuffs = [
    [-1.02, 0.16, -0.16],
    [-0.72, 0.72, 0.12],
    [0.84, -0.12, 0.2],
    [1.08, 0.24, -0.08],
    [0.78, -0.42, -0.2],
  ].map((item, index) => {
    var footprint = new THREE.Mesh(new THREE.CircleGeometry(1, 20), footprintScuffMat.clone());
    footprint.name = "launcher-footprint-scuff-" + index;
    footprint.rotation.x = -Math.PI / 2;
    footprint.rotation.z = item[2];
    footprint.scale.set(0.18, 0.06, 1);
    footprint.material.opacity = 0.11 + (index % 3) * 0.025;
    footprint.position.set(item[0], 0.018, item[1]);
    return footprint;
  });

  var body = makeRoundedPart("launcher-body", 0.82, 0.5, 0.09, 0.38, chassisMat, 0, 0.84, 0);
  body.rotation.x = -0.05;
  var facePanel = makeRoundedPart("launcher-accent-face-panel", 0.48, 0.28, 0.045, 0.025, panelMat, 0, 0.86, 0.2);
  var statusLight = new THREE.Mesh(new THREE.CircleGeometry(0.045, 18), accentMat);
  statusLight.name = "launcher-accent-status-light";
  statusLight.position.set(-0.18, 0.92, 0.218);
  var powerLight = new THREE.Mesh(new THREE.CircleGeometry(0.035, 18), orangeAccentMat);
  powerLight.name = "launcher-accent-power-light";
  powerLight.position.set(0.2, 0.91, 0.219);

  var turret = new THREE.Group();
  turret.name = "launcher-turret";
  turret.position.set(
    LAUNCHER_GEOMETRY.turretPivot.x,
    LAUNCHER_GEOMETRY.turretPivot.y,
    LAUNCHER_GEOMETRY.turretPivot.z,
  );
  var yawBearing = new THREE.Mesh(new THREE.TorusGeometry(0.34, 0.018, 8, 36), barrelMat.clone());
  yawBearing.name = "launcher-turret-yaw-bearing";
  yawBearing.rotation.x = Math.PI / 2;
  yawBearing.position.set(0, 1.055, 0.12);
  var recoilSled = new THREE.Group();
  recoilSled.name = "launcher-recoil-sled";
  var recoilRails = [-1, 1].map((sign) => {
    var rail = makeLimb("#dff8ff", 0.011);
    rail.name = "launcher-recoil-rail-" + (sign < 0 ? "left" : "right");
    rail.material = railMat.clone();
    setLimb(rail, { x: sign * 0.14, y: -0.052, z: 0.08 }, { x: sign * 0.14, y: -0.052, z: 0.75 });
    return rail;
  });
  var recoilBuffers = [-1, 1].map((sign) => {
    var buffer = makeRoundedPart("launcher-recoil-buffer-" + (sign < 0 ? "left" : "right"), 0.064, 0.055, 0.012, 0.05, wheelMat, sign * 0.14, -0.052, 0.04);
    buffer.rotation.x = Math.PI / 2;
    return buffer;
  });
  var barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.12, 0.72, 20), barrelMat);
  barrel.name = "launcher-barrel";
  barrel.rotation.x = Math.PI / 2;
  barrel.position.set(0, 0, 0.34);
  var heatSleeves = [0.2, 0.38, 0.56].map((z, index) => {
    var sleeve = new THREE.Mesh(new THREE.TorusGeometry(0.095, 0.0045, 6, 24), panelMat.clone());
    sleeve.name = "launcher-heat-sleeve-" + index;
    sleeve.position.set(0, 0, z);
    return sleeve;
  });
  var muzzle = new THREE.Mesh(new THREE.TorusGeometry(0.125, 0.018, 8, 24), orangeAccentMat);
  muzzle.name = "launcher-accent-muzzle-ring";
  muzzle.position.set(
    LAUNCHER_GEOMETRY.muzzleOffset.x,
    LAUNCHER_GEOMETRY.muzzleOffset.y,
    LAUNCHER_GEOMETRY.muzzleOffset.z,
  );
  var chargeRing = new THREE.Mesh(new THREE.TorusGeometry(0.18, 0.01, 8, 28), accentMat.clone());
  chargeRing.name = "launcher-charge-ring";
  chargeRing.position.set(0, 0, 0.735);
  var muzzleFlash = new THREE.Mesh(new THREE.CircleGeometry(0.19, 28), flashMat);
  muzzleFlash.name = "launcher-muzzle-flash";
  muzzleFlash.position.set(0, 0, 0.765);
  muzzleFlash.visible = false;
  recoilSled.add(barrel, ...heatSleeves, muzzle, chargeRing, muzzleFlash);
  turret.add(...recoilRails, ...recoilBuffers, recoilSled);

  var exhaustPuffs = [-1, 1].map((sign) => {
    var puff = new THREE.Mesh(new THREE.CircleGeometry(0.16, 24), exhaustPuffMat.clone());
    puff.name = "launcher-exhaust-puff-" + (sign < 0 ? "left" : "right");
    puff.position.set(sign * 0.24, 1.02, 0.68);
    puff.rotation.y = sign * 0.28;
    puff.visible = false;
    return puff;
  });
  var floorShockRing = new THREE.Mesh(new THREE.RingGeometry(0.24, 0.34, 36), floorShockMat.clone());
  floorShockRing.name = "launcher-floor-shock-ring";
  floorShockRing.rotation.x = -Math.PI / 2;
  floorShockRing.position.set(0, 0.026, 0.8);
  floorShockRing.visible = false;
  var releaseDustFlecks = [
    [-0.46, 0.54, -0.08],
    [-0.26, 0.84, 0.18],
    [-0.08, 0.62, -0.18],
    [0.16, 0.86, 0.1],
    [0.34, 0.58, 0.22],
    [0.48, 0.76, -0.12],
  ].map((item, index) => {
    var fleck = new THREE.Mesh(new THREE.CircleGeometry(0.05, 12), releaseDustMat.clone());
    fleck.name = "launcher-release-dust-fleck-" + index;
    fleck.rotation.x = -Math.PI / 2;
    fleck.rotation.z = item[2];
    fleck.position.set(item[0], 0.032, item[1]);
    fleck.scale.set(1.1 + (index % 2) * 0.32, 0.42 + (index % 3) * 0.08, 1);
    fleck.visible = false;
    return fleck;
  });

  var wheelLeft = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.105, 28), wheelMat);
  wheelLeft.name = "launcher-wheel-left";
  wheelLeft.rotation.z = Math.PI / 2;
  wheelLeft.position.set(-0.34, 1.05, 0.08);
  var wheelRight = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.105, 28), wheelMat);
  wheelRight.name = "launcher-wheel-right";
  wheelRight.rotation.z = Math.PI / 2;
  wheelRight.position.set(0.34, 1.05, 0.08);
  [wheelLeft, wheelRight].forEach(function addGrooves(wheel, index) {
    var groove = new THREE.Mesh(new THREE.TorusGeometry(0.182, 0.008, 8, 24), tireGrooveMat);
    groove.name = "launcher-accent-wheel-groove-" + index;
    groove.rotation.y = Math.PI / 2;
    wheel.add(groove);
  });

  var hopper = makeBeveledBox("launcher-hopper", 0.48, 0.34, 0.36, 0.075, panelMat);
  hopper.position.set(0, 1.38, -0.16);
  hopper.rotation.x = -0.16;
  var feedRack = makeRoundedPart("launcher-feed-rack", 0.72, 0.08, 0.024, 0.08, chassisMat, 0, 1.55, -0.22);
  feedRack.rotation.x = -0.1;
  var feedCarousel = new THREE.Group();
  feedCarousel.name = "launcher-feed-carousel";
  feedCarousel.position.set(0, 1.5, -0.43);
  feedCarousel.rotation.x = -0.16;
  var feedCarouselHub = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.012, 8, 32), barrelMat.clone());
  feedCarouselHub.name = "launcher-feed-carousel-hub";
  var feedCarouselSpokes = Array.from({ length: 4 }, (_, index) => {
    var angle = (index / 4) * Math.PI * 2;
    var spoke = makeLimb(index % 2 === 0 ? "#dff8ff" : "#fff1a8", 0.006);
    spoke.name = "launcher-feed-carousel-spoke-" + index;
    spoke.material.transparent = true;
    spoke.material.opacity = index % 2 === 0 ? 0.48 : 0.36;
    setLimb(spoke, { x: 0, y: 0, z: 0 }, { x: Math.cos(angle) * 0.21, y: Math.sin(angle) * 0.21, z: 0 });
    return spoke;
  });
  feedCarousel.add(feedCarouselHub, ...feedCarouselSpokes);
  var feedServoArm = makeLimb("#ff8b3d", 0.012);
  feedServoArm.name = "launcher-feed-servo-arm";
  feedServoArm.material.transparent = true;
  feedServoArm.material.opacity = 0.78;
  setLimb(feedServoArm, { x: 0.22, y: 1.46, z: -0.38 }, { x: 0.42, y: 1.34, z: -0.08 });
  feedServoArm.userData.baseRotationZ = feedServoArm.rotation.z;
  var feedGuideChute = makeBeveledBox("launcher-feed-guide-chute", 0.54, 0.045, 0.11, 0.026, feedChuteMat.clone(), 0, 1.31, -0.02, 5);
  feedGuideChute.rotation.x = -0.16;
  feedGuideChute.rotation.z = 0.04;
  var feedIndexMarkers = [-0.18, 0, 0.18].map((x, index) => {
    var marker = new THREE.Mesh(new THREE.CircleGeometry(0.027, 16), index === 1 ? accentMat.clone() : orangeAccentMat.clone());
    marker.name = "launcher-feed-index-marker-" + index;
    marker.material.opacity = 0.28 + index * 0.035;
    marker.position.set(x, 1.39, -0.002);
    marker.rotation.x = -0.16;
    return marker;
  });
  var queueBalls = [-0.24, 0, 0.24].map((x, index) => {
    var queueBall = new THREE.Mesh(new THREE.SphereGeometry(0.095, 18, 12), ballMat);
    queueBall.name = "launcher-feed-queue-ball-" + index;
    queueBall.position.set(x, 1.6 + (index % 2) * 0.015, -0.23 - index * 0.035);
    return queueBall;
  });
  var feedBall = new THREE.Mesh(new THREE.SphereGeometry(0.11, 22, 16), ballMat);
  feedBall.name = "launcher-feed-ball";
  feedBall.position.set(0, 1.2, -0.12);

  var standHub = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.16, 0.18, 16), chassisMat);
  standHub.name = "launcher-stand-hub";
  standHub.position.set(0, 0.52, -0.04);
  var standLeft = makeLimb("#223139", 0.035);
  standLeft.name = "launcher-stand-left";
  var standRight = makeLimb("#223139", 0.035);
  standRight.name = "launcher-stand-right";
  var standBack = makeLimb("#223139", 0.035);
  standBack.name = "launcher-stand-back";
  setLimb(standLeft, { x: -0.08, y: 0.5, z: -0.02 }, { x: -0.44, y: 0.06, z: 0.22 });
  setLimb(standRight, { x: 0.08, y: 0.5, z: -0.02 }, { x: 0.44, y: 0.06, z: 0.22 });
  setLimb(standBack, { x: 0, y: 0.5, z: -0.06 }, { x: 0, y: 0.06, z: -0.44 });

  var baseFootLeft = makeRoundedPart("launcher-stand-foot-left", 0.28, 0.055, 0.018, 0.1, chassisMat, -0.44, 0.045, 0.22);
  var baseFootRight = makeRoundedPart("launcher-stand-foot-right", 0.28, 0.055, 0.018, 0.1, chassisMat, 0.44, 0.045, 0.22);
  var baseFootBack = makeRoundedPart("launcher-stand-foot-back", 0.3, 0.055, 0.018, 0.1, chassisMat, 0, 0.045, -0.44);
  var powerCable = new THREE.Line(
    new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(-0.28, 0.14, -0.26),
      new THREE.Vector3(-0.6, 0.055, -0.42),
      new THREE.Vector3(-0.82, 0.035, -0.18),
    ]),
    cableMat,
  );
  powerCable.name = "launcher-cable-power";
  var controlCable = new THREE.Line(
    new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0.28, 0.13, -0.24),
      new THREE.Vector3(0.58, 0.05, -0.38),
      new THREE.Vector3(0.76, 0.035, 0.05),
    ]),
    cableMat.clone(),
  );
  controlCable.name = "launcher-cable-control";

  var controlConsole = makeRoundedPart("launcher-control-console", 0.36, 0.24, 0.045, 0.22, chassisMat, -0.82, 0.34, 0.58);
  controlConsole.rotation.x = -0.18;
  controlConsole.rotation.y = 0.28;
  var controlScreen = makeRoundedPart("launcher-control-screen", 0.25, 0.12, 0.024, 0.012, screenMat, -0.82, 0.39, 0.7);
  controlScreen.rotation.x = -0.18;
  controlScreen.rotation.y = 0.28;
  var statusLeds = Array.from({ length: 4 }, (_, index) => {
    var led = new THREE.Mesh(new THREE.CircleGeometry(0.026, 16), ledMat.clone());
    led.name = "launcher-status-led-" + index;
    led.position.set(-0.94 + index * 0.075, 0.295, 0.702);
    led.rotation.x = -0.18;
    led.rotation.y = 0.28;
    return led;
  });

  var safetyGuards = [-1, 1].map((sign) => {
    var guard = makeRoundedPart("launcher-safety-guard-" + (sign < 0 ? "left" : "right"), 0.12, 0.42, 0.035, 0.012, guardMat.clone(), sign * 0.42, 0.82, 0.52);
    guard.rotation.y = sign * 0.12;
    return guard;
  });

  var calibrationBeams = [-1, 1].map((sign) => {
    var beam = makeLimb("#61f0ff", 0.008);
    beam.name = "launcher-calibration-beam-" + (sign < 0 ? "left" : "right");
    beam.material = new THREE.MeshBasicMaterial({ color: "#61f0ff", transparent: true, opacity: 0.2, depthWrite: false });
    setLimb(beam, { x: sign * 0.1, y: 1.1, z: 0.76 }, { x: sign * 0.58, y: 0.42, z: 1.58 });
    return beam;
  });

  var anchorPositions = [
    [-0.44, 0.035, 0.22],
    [0.44, 0.035, 0.22],
    [0, 0.035, -0.44],
    [-0.82, 0.032, -0.18],
  ];
  var groundAnchors = anchorPositions.map((position, index) => {
    var anchor = new THREE.Mesh(new THREE.TorusGeometry(0.06, 0.009, 8, 18), barrelMat);
    anchor.name = "launcher-ground-anchor-" + index;
    anchor.rotation.x = -Math.PI / 2;
    anchor.position.set(position[0], position[1], position[2]);
    return anchor;
  });

  var pressureHoseLeft = new THREE.Line(
    new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(-0.18, 0.62, -0.12),
      new THREE.Vector3(-0.54, 0.28, 0.04),
      new THREE.Vector3(-0.82, 0.34, 0.56),
    ]),
    cableMat.clone(),
  );
  pressureHoseLeft.name = "launcher-pressure-hose-left";
  var pressureHoseRight = new THREE.Line(
    new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0.22, 0.62, -0.12),
      new THREE.Vector3(0.56, 0.24, 0.08),
      new THREE.Vector3(0.78, 0.08, 0.32),
    ]),
    cableMat.clone(),
  );
  pressureHoseRight.name = "launcher-pressure-hose-right";

  var hydraulicPistons = [-1, 1].map((sign) => {
    var piston = makeLimb("#dfe6dc", 0.017);
    piston.name = "launcher-hydraulic-piston-" + (sign < 0 ? "left" : "right");
    piston.material = new THREE.MeshStandardMaterial({ color: "#dfe6dc", roughness: 0.34, metalness: 0.18 });
    setLimb(piston, { x: sign * 0.24, y: 0.82, z: -0.04 }, { x: sign * 0.15, y: 1.08, z: 0.46 });
    piston.userData.baseScaleY = piston.scale.y;
    return piston;
  });

  var serviceScrews = [
    [-0.26, 0.98],
    [0.26, 0.98],
    [-0.26, 0.74],
    [0.26, 0.74],
  ].map((position, index) => {
    var screw = new THREE.Mesh(new THREE.CircleGeometry(0.024, 14), barrelMat);
    screw.name = "launcher-service-panel-screw-" + index;
    screw.position.set(position[0], position[1], 0.218);
    return screw;
  });

  var numberPlate = makeRoundedPart("launcher-number-plate", 0.22, 0.095, 0.018, 0.012, orangeAccentMat.clone(), 0, 0.7, 0.218);
  numberPlate.material.opacity = 0.82;

  var operator = new THREE.Group();
  operator.name = "launcher-operator-context";
  operator.position.set(1.04, 0, -0.18);
  operator.scale.setScalar(0.72);
  var operatorShadow = new THREE.Mesh(new THREE.CircleGeometry(0.34, 24), shadowMat.clone());
  operatorShadow.name = "launcher-operator-shadow";
  operatorShadow.rotation.x = -Math.PI / 2;
  operatorShadow.scale.set(1, 0.44, 1);
  operatorShadow.position.set(0, 0.012, 0);
  var operatorTorso = makeRoundedPart("launcher-operator-torso", 0.24, 0.5, 0.06, 0.13, operatorMat, 0, 0.84, 0);
  var operatorHead = new THREE.Mesh(new THREE.SphereGeometry(0.12, 18, 12), new THREE.MeshStandardMaterial({ color: "#d6b18a", roughness: 0.58 }));
  operatorHead.name = "launcher-operator-head";
  operatorHead.position.set(0, 1.18, 0);
  var operatorCap = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.12, 0.055, 18), operatorAccentMat);
  operatorCap.name = "launcher-operator-cap";
  operatorCap.position.set(0, 1.29, 0);
  var operatorLegLeft = makeLimb("#182226", 0.04);
  operatorLegLeft.name = "launcher-operator-leg-left";
  setLimb(operatorLegLeft, { x: -0.055, y: 0.58, z: 0 }, { x: -0.14, y: 0.08, z: 0.07 });
  var operatorLegRight = makeLimb("#182226", 0.04);
  operatorLegRight.name = "launcher-operator-leg-right";
  setLimb(operatorLegRight, { x: 0.055, y: 0.58, z: 0 }, { x: 0.14, y: 0.08, z: -0.04 });
  var operatorArm = makeLimb("#203039", 0.032);
  operatorArm.name = "launcher-operator-arm-tablet";
  setLimb(operatorArm, { x: -0.09, y: 0.94, z: 0.03 }, { x: -0.3, y: 0.78, z: 0.14 });
  var operatorTablet = makeRoundedPart("launcher-operator-tablet", 0.18, 0.13, 0.02, 0.012, screenMat.clone(), -0.35, 0.76, 0.16);
  operatorTablet.rotation.y = -0.35;
  operator.add(operatorShadow, operatorTorso, operatorHead, operatorCap, operatorLegLeft, operatorLegRight, operatorArm, operatorTablet);

  group.add(
    kickPad,
    ...readabilityFrame,
    aimRailLeft,
    aimRailRight,
    ...laneChevrons,
    floorShockRing,
    ...releaseDustFlecks,
    powerCable,
    controlCable,
    shadow,
    standLeft,
    standRight,
    standBack,
    baseFootLeft,
    baseFootRight,
    baseFootBack,
    ...groundAnchors,
    ...safetyGuards,
    ...calibrationBeams,
    ...wheelTreadShadows,
    serviceMat,
    ...footprintScuffs,
    standHub,
    body,
    facePanel,
    statusLight,
    powerLight,
    numberPlate,
    ...serviceScrews,
    yawBearing,
    turret,
    ...exhaustPuffs,
    wheelLeft,
    wheelRight,
    hopper,
    feedRack,
    feedCarousel,
    feedServoArm,
    feedGuideChute,
    ...feedIndexMarkers,
    ...queueBalls,
    feedBall,
    controlConsole,
    controlScreen,
    ...statusLeds,
    pressureHoseLeft,
    pressureHoseRight,
    ...hydraulicPistons,
    operator,
  );
  group.updateMatrixWorld(true);

  function makeLauncherDecal(targetMesh, name, localPosition, localOrientation, localSize, color, opacity) {
    targetMesh.updateMatrixWorld(true);
    var worldPosition = targetMesh.localToWorld(new THREE.Vector3(localPosition[0], localPosition[1], localPosition[2]));
    var targetWorldQuaternion = targetMesh.getWorldQuaternion(new THREE.Quaternion());
    var localQuaternion = new THREE.Quaternion().setFromEuler(new THREE.Euler(
      localOrientation[0],
      localOrientation[1],
      localOrientation[2],
    ));
    var worldOrientation = new THREE.Euler().setFromQuaternion(targetWorldQuaternion.multiply(localQuaternion));
    var worldScale = group.getWorldScale(new THREE.Vector3());
    var decalSize = new THREE.Vector3(
      localSize[0] * worldScale.x,
      localSize[1] * worldScale.y,
      localSize[2] * worldScale.z,
    );
    var geometry = new DecalGeometry(targetMesh, worldPosition, worldOrientation, decalSize);
    geometry.type = "DecalGeometry";
    geometry.userData.geometrySource = "three/addons/geometries/DecalGeometry";
    geometry.applyMatrix4(new THREE.Matrix4().copy(group.matrixWorld).invert());
    var material = new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity,
      depthWrite: false,
      depthTest: true,
      polygonOffset: true,
      polygonOffsetFactor: -4,
      side: THREE.DoubleSide,
    });
    material.userData.launcherDecalSystem = LAUNCHER_DECAL_SYSTEM;
    var decal = new THREE.Mesh(geometry, material);
    decal.name = name;
    decal.renderOrder = 7;
    decal.userData.geometrySource = "three/addons/geometries/DecalGeometry";
    decal.userData.launcherDecalSystem = LAUNCHER_DECAL_SYSTEM;
    return decal;
  }

  var decals = [
    makeLauncherDecal(facePanel, "launcher-decal-serial-plate-main", [0, -0.02, 0.016], [0, 0, 0], [0.28, 0.075, 0.045], "#10191c", 0.42),
    makeLauncherDecal(body, "launcher-decal-caution-stripe-left", [-0.24, 0.12, 0.196], [0, 0, -0.18], [0.2, 0.055, 0.045], "#ffb23d", 0.46),
    makeLauncherDecal(body, "launcher-decal-caution-stripe-right", [0.24, 0.12, 0.196], [0, 0, 0.18], [0.2, 0.055, 0.045], "#ffb23d", 0.46),
    makeLauncherDecal(body, "launcher-decal-paint-wear-body-left", [-0.29, -0.12, 0.198], [0, 0, -0.12], [0.24, 0.04, 0.04], "#f3fbf0", 0.18),
    makeLauncherDecal(body, "launcher-decal-paint-wear-body-right", [0.28, -0.08, 0.198], [0, 0, 0.12], [0.22, 0.038, 0.04], "#f3fbf0", 0.16),
    makeLauncherDecal(hopper, "launcher-decal-service-arrow-hopper", [0.08, -0.04, 0.186], [0, 0, 0.08], [0.16, 0.052, 0.04], "#61f0ff", 0.34),
    makeLauncherDecal(barrel, "launcher-decal-muzzle-index-ring", [0, 0.09, 0.42], [Math.PI / 2, 0, 0], [0.18, 0.028, 0.035], "#fff1a8", 0.28),
    makeLauncherDecal(wheelLeft, "launcher-decal-wheel-sidewall-left", [0, 0.058, 0], [Math.PI / 2, 0, 0], [0.15, 0.15, 0.035], "#2f444d", 0.36),
    makeLauncherDecal(wheelRight, "launcher-decal-wheel-sidewall-right", [0, 0.058, 0], [Math.PI / 2, 0, 0], [0.15, 0.15, 0.035], "#2f444d", 0.36),
  ];
  group.add(...decals);

  var retiredLauncherPatterns = [
    /^launcher-aim-rail-/,
    /^launcher-lane-chevron-/,
    /^launcher-cable-/,
    /^launcher-calibration-beam-/,
    /^launcher-ground-anchor-/,
    /^launcher-pressure-hose-/,
    /^launcher-service-panel-screw-/,
    /^launcher-operator-/,
    /^launcher-footprint-scuff-/,
  ];
  var retiredLauncherDetails = [];
  group.traverse(function collectRetiredLauncherDetail(node) {
    if (retiredLauncherPatterns.some((pattern) => pattern.test(node.name || ""))) {
      retiredLauncherDetails.push(node);
    }
  });
  retiredLauncherDetails.forEach(function removeRetiredLauncherDetail(node) {
    node.parent?.remove(node);
  });
  group.userData.retiredLauncherDetailCount = retiredLauncherDetails.length;

  return {
    group,
    body,
    turret,
    recoilSled,
    recoilRails,
    recoilBuffers,
    hydraulicPistons,
    yawBearing,
    barrel,
    muzzle,
    wheelLeft,
    wheelRight,
    hopper,
    feedCarousel,
    feedServoArm,
    feedGuideChute,
    feedIndexMarkers,
    feedBall,
    queueBalls,
    laneChevrons: [],
    aimRails: [],
    kickPad,
    chargeRing,
    muzzleFlash,
    exhaustPuffs,
    floorShockRing,
    releaseDustFlecks,
    statusLight,
    powerLight,
    controlScreen,
    statusLeds,
    calibrationBeams: [],
    safetyGuards,
    operatorTablet: null,
    shadow,
    decals,
    readabilityFrame,
  };
}

export function updateShooterModel(model, director) {
  var shot = director.currentShot || { cue: { side: 1 }, cueDuration: 1 };
  var side = shot.cue?.side || 1;
  var cueProgress = director.phase === "cue" ? Math.min(1, director.phaseTime / Math.max(0.01, shot.cueDuration)) : 1;
  var liveProgress = director.phase === "live" ? Math.min(1, director.phaseTime / 0.65) : 0;
  var activeProgress = director.phase === "live" ? Math.max(0, 1 - liveProgress) : cueProgress;
  var charge = Math.sin(activeProgress * Math.PI);
  var muzzlePulse = director.phase === "live" ? Math.max(0, 1 - liveProgress / 0.2) : 0;
  var releasePulse = director.phase === "live" ? Math.max(0, 1 - liveProgress / 0.28) : 0;
  var aimYaw = side * (LAUNCHER_GEOMETRY.releaseYaw + charge * 0.045);
  var aimPitch = LAUNCHER_GEOMETRY.releasePitch - charge * 0.04;
  var spin = director.phaseTime * (director.phase === "live" ? 32 : 18) + cueProgress * 12;

  model.turret.rotation.set(aimPitch, aimYaw, 0);
  model.body.rotation.set(-0.05 + charge * 0.025, 0, side * charge * 0.025);
  if (model.recoilSled) {
    model.recoilSled.position.z = charge * 0.012 + muzzlePulse * LAUNCHER_GEOMETRY.releaseRecoilZ;
  }
  model.recoilRails?.forEach((rail, index) => {
    rail.material.opacity = 0.24 + charge * 0.1 + muzzlePulse * 0.36 - index * 0.015;
  });
  model.recoilBuffers?.forEach((buffer, index) => {
    buffer.scale.setScalar(1 + muzzlePulse * (0.12 + index * 0.025));
  });
  model.hydraulicPistons?.forEach((piston, index) => {
    var asymmetry = index === 0 ? 0.11 : -0.075;
    piston.scale.y = (piston.userData.baseScaleY || piston.scale.y || 1) * (1 + charge * 0.025 + muzzlePulse * asymmetry);
  });
  model.feedBall.visible = director.phase !== "live" || liveProgress > 0.35;
  model.feedBall.position.set(side * charge * 0.025, 1.2 - cueProgress * 0.02, -0.12 + cueProgress * 0.17);
  model.feedBall.scale.setScalar(1 - (director.phase === "live" && liveProgress < 0.22 ? liveProgress * 2.8 : 0));
  model.queueBalls?.forEach((ball, index) => {
    var readyOffset = director.phase === "cue" ? cueProgress * 0.025 : Math.max(0, 0.05 - liveProgress * 0.04);
    ball.position.x = -0.24 + index * 0.24 + side * charge * 0.006;
    ball.position.z = -0.23 - index * 0.035 + readyOffset;
    ball.rotation.y += 0.01 + index * 0.002;
  });
  if (model.feedCarousel) {
    var indexAdvance = director.phase === "live" ? 0.42 + muzzlePulse * 0.36 : cueProgress * 0.34;
    model.feedCarousel.rotation.z = side * (indexAdvance * Math.PI * 2 + charge * 0.18);
  }
  if (model.feedServoArm) {
    var servoBaseRotation = Number.isFinite(model.feedServoArm.userData.baseRotationZ) ? model.feedServoArm.userData.baseRotationZ : 0;
    var servoDirection = Math.sign(servoBaseRotation || -side || 1);
    model.feedServoArm.rotation.z = servoBaseRotation + servoDirection * (0.12 + charge * 0.18 + muzzlePulse * 0.32);
    model.feedServoArm.material.opacity = 0.58 + charge * 0.18 + muzzlePulse * 0.16;
  }
  if (model.feedGuideChute) {
    model.feedGuideChute.material.opacity = Math.min(0.5, 0.18 + charge * 0.18 + muzzlePulse * 0.12);
  }
  model.feedIndexMarkers?.forEach((marker, index) => {
    var markerPulse = Math.max(0, Math.sin((activeProgress + index * 0.16) * Math.PI));
    marker.material.opacity = 0.22 + markerPulse * 0.28 + (director.phase === "live" && index === 2 ? muzzlePulse * 0.12 : 0);
    marker.scale.setScalar(1 + markerPulse * 0.16 + muzzlePulse * 0.06);
  });
  model.laneChevrons?.forEach((chevron, index) => {
    chevron.material.opacity = 0.24 + charge * 0.18 + (index / Math.max(1, model.laneChevrons.length - 1)) * 0.12;
    chevron.scale.setScalar(0.72 + index * 0.1 + muzzlePulse * 0.08);
  });
  model.wheelLeft.rotation.y = spin;
  model.wheelRight.rotation.y = -spin;
  model.statusLight.material.opacity = 0.52 + charge * 0.42;
  model.powerLight.material.opacity = director.phase === "live" ? 0.95 : 0.58 + cueProgress * 0.28;
  if (model.controlScreen) {
    model.controlScreen.material.opacity = 0.36 + charge * 0.18 + muzzlePulse * 0.34;
  }
  model.statusLeds?.forEach((led, index) => {
    var phaseOffset = (index / Math.max(1, model.statusLeds.length - 1)) * 0.4;
    var ledPulse = Math.max(0, Math.sin((activeProgress + phaseOffset) * Math.PI));
    led.material.opacity = 0.24 + ledPulse * 0.4 + (director.phase === "live" && index === 0 ? muzzlePulse * 0.95 : 0);
    led.scale.setScalar(1 + ledPulse * 0.16 + muzzlePulse * (index === 0 ? 0.26 : 0.08));
  });
  model.calibrationBeams?.forEach((beam, index) => {
    var beamPulse = director.phase === "live" ? muzzlePulse : charge;
    beam.visible = beamPulse > 0.04;
    beam.material.opacity = Math.min(0.52, 0.12 + beamPulse * 0.34 - index * 0.03);
  });
  model.safetyGuards?.forEach((guard, index) => {
    var sign = index === 0 ? -1 : 1;
    guard.rotation.y = sign * (0.12 + charge * 0.055 + muzzlePulse * 0.045);
    guard.material.opacity = 0.14 + charge * 0.08 + muzzlePulse * 0.06;
  });
  if (model.operatorTablet) {
    model.operatorTablet.material.opacity = 0.34 + charge * 0.18 + muzzlePulse * 0.12;
  }
  model.chargeRing.material.opacity = 0.26 + charge * 0.36 + muzzlePulse * 0.28;
  model.chargeRing.scale.setScalar(1 + charge * 0.08 + muzzlePulse * 0.22);
  model.muzzleFlash.visible = muzzlePulse > 0.02;
  model.muzzleFlash.material.opacity = model.muzzleFlash.visible ? muzzlePulse * 0.78 : 0;
  model.muzzleFlash.scale.setScalar(0.85 + muzzlePulse * 0.8);
  if (model.floorShockRing) {
    model.floorShockRing.visible = releasePulse > 0.03;
    model.floorShockRing.material.opacity = model.floorShockRing.visible ? releasePulse * 0.22 : 0;
    model.floorShockRing.scale.setScalar(1 + (1 - releasePulse) * 0.72 + releasePulse * 0.16);
  }
  model.exhaustPuffs?.forEach((puff, index) => {
    var puffPulse = releasePulse * (1 - index * 0.08);
    puff.visible = puffPulse > 0.03;
    puff.material.opacity = puff.visible ? Math.min(0.3, puffPulse * 0.28) : 0;
    puff.scale.setScalar(0.7 + (1 - puffPulse) * 0.46 + puffPulse * 0.36);
    puff.position.z = 0.68 - (1 - puffPulse) * 0.08;
  });
  model.releaseDustFlecks?.forEach((fleck, index) => {
    var fleckPulse = Math.max(0, releasePulse - index * 0.018);
    fleck.visible = fleckPulse > 0.025;
    fleck.material.opacity = fleck.visible ? Math.min(0.18, fleckPulse * (0.14 + (index % 3) * 0.018)) : 0;
    fleck.scale.x = 1.1 + (index % 2) * 0.32 + (1 - fleckPulse) * 0.45;
    fleck.scale.y = 0.42 + (index % 3) * 0.08 + (1 - fleckPulse) * 0.2;
  });
  model.shadow.scale.set(1.5 + charge * 0.08, 0.48 + charge * 0.04, 1);
}

export function createGloveMesh(side) {
  var group = new THREE.Group();
  group.userData.visualStyle = "polished-orange-reference-glove";
  group.userData.polishSystem = MATCHDAY_ASSET_POLISH_SYSTEM;
  group.userData.materialSystem = "stitched-padded-match-glove";
  group.userData.gripSystem = "latex-ridge-and-stitched-fingerback";
  group.userData.pbrMaterialSystem = GLOVE_PBR_MATERIAL_SYSTEM;
  group.userData.wearDetailSystem = GLOVE_WEAR_DETAIL_SYSTEM;
  var palmMat = new THREE.MeshStandardMaterial({
    color: side === "left" ? "#ff6339" : "#ff7244",
    roughness: 0.42,
    metalness: 0.02,
  });
  var padMat = new THREE.MeshStandardMaterial({ color: "#ff9a5f", roughness: 0.46, metalness: 0.01 });
  var seamMat = new THREE.MeshStandardMaterial({ color: "#ffd2a5", roughness: 0.5 });
  var highlightMat = new THREE.MeshBasicMaterial({ color: "#fff0c8", transparent: true, opacity: 0.62 });
  var trimMat = new THREE.MeshStandardMaterial({ color: "#1c2528", roughness: 0.5 });
  var cuffTrimMat = new THREE.MeshStandardMaterial({ color: "#ff7543", roughness: 0.44 });
  applyGloveMaterialMaps(palmMat, "latex", 0.008);
  applyGloveMaterialMaps(padMat, "latex", 0.006);
  applyGloveMaterialMaps(seamMat, "latex", 0.0045);
  applyGloveMaterialMaps(trimMat, "textile", 0.01);
  applyGloveMaterialMaps(cuffTrimMat, "textile", 0.007);

  var palm = makeRoundedPart("glove-palm-shell", 0.38, 0.43, 0.085, 0.12, palmMat, 0, 0, 0);
  var pad = makeRoundedPart("glove-palm-pad", 0.27, 0.28, 0.06, 0.026, padMat, 0, -0.005, 0.07);
  group.add(palm, pad);

  [
    ["top", 0, 0.236, 0.093, 0.31, 0.018],
    ["bottom", 0, -0.198, 0.094, 0.29, 0.016],
    ["left", -0.194, 0.01, 0.092, 0.018, 0.35],
    ["right", 0.194, 0.01, 0.092, 0.018, 0.35],
  ].forEach(function addRolledLatexEdge(item) {
    var edge = makeRoundedPart(
      "glove-latex-edge-rolled-seam-" + item[0],
      item[4],
      item[5],
      0.01,
      0.014,
      seamMat,
      item[1],
      item[2],
      item[3],
    );
    edge.userData.pbrMaterialSystem = GLOVE_PBR_MATERIAL_SYSTEM;
    group.add(edge);
  });

  for (var i = 0; i < 4; i += 1) {
    var finger = new THREE.Mesh(new THREE.CapsuleGeometry(0.043, 0.16, 8, 14), palmMat);
    finger.name = "glove-finger-" + i;
    finger.position.set(-0.135 + i * 0.09, 0.305 + (i === 1 || i === 2 ? 0.018 : 0), 0.008);
    group.add(finger);

    var fingerSeam = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.17, 0.009), seamMat);
    fingerSeam.name = "glove-seam-finger-" + i;
    fingerSeam.position.set(finger.position.x, finger.position.y - 0.018, 0.06);
    group.add(fingerSeam);

    var fingerHighlight = new THREE.Mesh(new THREE.BoxGeometry(0.024, 0.13, 0.006), highlightMat);
    fingerHighlight.name = "glove-highlight-finger-" + i;
    fingerHighlight.position.set(finger.position.x - 0.012, finger.position.y + 0.006, 0.066);
    group.add(fingerHighlight);

    var fingerbackRidge = makeRoundedPart(
      "glove-fingerback-protection-ridge-" + i,
      0.055,
      0.12,
      0.014,
      0.018,
      padMat,
      finger.position.x,
      finger.position.y + 0.006,
      0.09,
    );
    fingerbackRidge.rotation.z = (i - 1.5) * 0.035;
    group.add(fingerbackRidge);
  }

  var thumbSide = side === "left" ? 1 : -1;
  var thumb = new THREE.Mesh(new THREE.CapsuleGeometry(0.052, 0.15, 8, 14), palmMat);
  thumb.name = "glove-thumb";
  thumb.position.set(thumbSide * 0.22, 0.015, 0.012);
  thumb.rotation.z = thumbSide * -0.62;
  group.add(thumb);

  var thumbSeam = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.12, 0.008), seamMat);
  thumbSeam.name = "glove-seam-thumb";
  thumbSeam.position.set(thumbSide * 0.205, 0.02, 0.066);
  thumbSeam.rotation.z = thumb.rotation.z;
  group.add(thumbSeam);

  [
    ["palm-left", -0.082],
    ["palm-center", 0],
    ["palm-right", 0.082],
  ].forEach(function addPalmSeam(item) {
    var seam = new THREE.Mesh(new THREE.BoxGeometry(0.014, 0.23, 0.008), seamMat);
    seam.name = "glove-seam-" + item[0];
    seam.position.set(item[1], 0.02, 0.086);
    group.add(seam);
  });

  for (var gripIndex = 0; gripIndex < 6; gripIndex += 1) {
    var grip = new THREE.Mesh(new THREE.BoxGeometry(0.23 - gripIndex * 0.012, 0.011, 0.01), seamMat);
    grip.name = "glove-latex-grip-ridge-" + gripIndex;
    grip.position.set(0, 0.118 - gripIndex * 0.047, 0.102);
    grip.rotation.z = (gripIndex % 2 ? 0.035 : -0.035) * (side === "left" ? 1 : -1);
    group.add(grip);
  }

  var scuffMaterial = new THREE.MeshBasicMaterial({
    color: "#fff1d6",
    transparent: true,
    opacity: 0.13,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  [
    [-0.11, 0.055, 0.082, 0.038, 0.012, -0.32],
    [0.055, 0.032, 0.104, 0.05, 0.012, 0.18],
    [0.108, -0.074, 0.092, 0.042, 0.01, -0.14],
    [-0.046, -0.128, 0.108, 0.052, 0.011, 0.28],
    [0.012, 0.17, 0.102, 0.045, 0.01, -0.08],
  ].forEach(function addLatexWearScuff(item, scuffIndex) {
    var scuff = new THREE.Mesh(new THREE.PlaneGeometry(item[3], item[4]), scuffMaterial.clone());
    scuff.name = "glove-latex-wear-scuff-" + scuffIndex;
    scuff.material.opacity = 0.09 + (scuffIndex % 3) * 0.025;
    scuff.position.set(item[0], item[1], item[2]);
    scuff.rotation.z = item[5];
    scuff.userData.wearDetailSystem = GLOVE_WEAR_DETAIL_SYSTEM;
    group.add(scuff);
  });

  [
    ["palm-sheen-a", -0.085, 0.07, 0.09],
    ["palm-sheen-b", 0.055, -0.055, 0.078],
  ].forEach(function addHighlight(item) {
    var sheen = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.018, 0.006), highlightMat);
    sheen.name = "glove-highlight-" + item[0];
    sheen.position.set(item[1], item[2], item[3]);
    sheen.rotation.z = -0.28;
    group.add(sheen);
  });

  var wrist = makeRoundedPart("glove-cuff", 0.36, 0.105, 0.026, 0.12, trimMat, 0, -0.285, 0.002);
  group.add(wrist);

  for (var ribIndex = 0; ribIndex < 7; ribIndex += 1) {
    var rib = new THREE.Mesh(new THREE.BoxGeometry(0.018, 0.09, 0.008), cuffTrimMat);
    rib.name = "glove-textile-knit-rib-" + ribIndex;
    rib.position.set(-0.145 + ribIndex * 0.048, -0.286, 0.068);
    rib.rotation.z = (ribIndex - 3) * 0.018;
    rib.userData.pbrMaterialSystem = GLOVE_PBR_MATERIAL_SYSTEM;
    group.add(rib);
  }

  var cuffTrim = new THREE.Mesh(new THREE.BoxGeometry(0.31, 0.018, 0.126), cuffTrimMat);
  cuffTrim.name = "glove-cuff-trim";
  cuffTrim.position.set(0, -0.23, 0.004);
  group.add(cuffTrim);

  var strap = makeRoundedPart("glove-wrist-strap-main", 0.31, 0.052, 0.018, 0.132, trimMat, 0, -0.246, 0.073);
  strap.rotation.z = side === "left" ? -0.04 : 0.04;
  group.add(strap);

  var brandPatch = makeRoundedPart("glove-brand-patch-front", 0.1, 0.046, 0.012, 0.01, cuffTrimMat, side === "left" ? -0.055 : 0.055, -0.245, 0.145);
  brandPatch.rotation.z = side === "left" ? -0.08 : 0.08;
  group.add(brandPatch);

  var stitchBeadMaterial = new THREE.MeshStandardMaterial({ color: "#ffd6aa", roughness: 0.52, metalness: 0.01 });
  for (var stitchIndex = 0; stitchIndex < 10; stitchIndex += 1) {
    var stitch = new THREE.Mesh(new THREE.SphereGeometry(0.011, 8, 6), stitchBeadMaterial);
    stitch.name = "glove-stitch-bead-" + stitchIndex;
    stitch.position.set(-0.18 + (stitchIndex % 5) * 0.09, stitchIndex < 5 ? 0.205 : -0.185, 0.107);
    stitch.scale.set(1, 0.72, 0.56);
    group.add(stitch);
  }

  var ventMat = new THREE.MeshBasicMaterial({ color: "#7b2f22", transparent: true, opacity: 0.58, side: THREE.DoubleSide });
  for (var ventIndex = 0; ventIndex < 10; ventIndex += 1) {
    var vent = new THREE.Mesh(new THREE.CircleGeometry(0.012, 12), ventMat);
    vent.name = "glove-vent-perforation-" + ventIndex;
    vent.position.set(-0.115 + (ventIndex % 5) * 0.057, -0.105 + Math.floor(ventIndex / 5) * 0.058, 0.146);
    group.add(vent);
  }

  return group;
}
