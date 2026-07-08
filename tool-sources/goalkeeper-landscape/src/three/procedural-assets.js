import * as THREE from "three";
import { MAX_CONCEDED, ROUND_SECONDS } from "../config/game-config.js";
import { SHOT_3D } from "../game/shot-3d-director.js";
import { RAPIER_GOAL } from "../physics/rapier-world.js";

export const STADIUM_SCOREBOARD_DISPLAY_SYSTEM = "live-stadium-scoreboard-display";

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

function createGrassTexture() {
  var size = 256;
  var data = new Uint8Array(size * size * 4);
  for (var y = 0; y < size; y += 1) {
    for (var x = 0; x < size; x += 1) {
      var index = (y * size + x) * 4;
      var grain = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
      var noise = grain - Math.floor(grain);
      var blade = Math.sin((x + y * 0.6) * 0.65) * 0.5 + 0.5;
      data[index] = 82 + Math.floor(noise * 14 + blade * 7);
      data[index + 1] = 156 + Math.floor(noise * 22 + blade * 10);
      data[index + 2] = 68 + Math.floor(noise * 12);
      data[index + 3] = 255;
    }
  }
  var texture = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(2.8, 10);
  texture.magFilter = THREE.LinearFilter;
  texture.minFilter = THREE.LinearFilter;
  texture.needsUpdate = true;
  return texture;
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

function createTurfDetailTexture(kind) {
  return createSurfaceDetailTexture(
    256,
    (x, y) => {
      var grain = Math.sin(x * 16.17 + y * 73.31) * 24634.634;
      var noise = grain - Math.floor(grain);
      var blade = Math.sin((x * 0.82 + y * 0.26) * 1.8) * 0.5 + 0.5;
      var cross = Math.sin((x - y * 0.7) * 0.38) * 0.5 + 0.5;
      return kind === "roughness" ? 182 + noise * 42 + blade * 22 : 104 + noise * 56 + blade * 68 + cross * 22;
    },
    2.8,
    10,
  );
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

function createTurfMaterial() {
  var material = new THREE.MeshStandardMaterial({
    color: "#69bd53",
    map: createGrassTexture(),
    bumpMap: createTurfDetailTexture("bump"),
    bumpScale: 0.026,
    roughnessMap: createTurfDetailTexture("roughness"),
    roughness: 0.92,
    metalness: 0,
  });
  material.userData.materialPipelineSystem = "procedural-layered-turf-pbr";
  return material;
}

function createRoundedRectGeometry(width, height, radius, depth) {
  var x = -width / 2;
  var y = -height / 2;
  var shape = new THREE.Shape();
  shape.moveTo(x + radius, y);
  shape.lineTo(x + width - radius, y);
  shape.quadraticCurveTo(x + width, y, x + width, y + radius);
  shape.lineTo(x + width, y + height - radius);
  shape.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  shape.lineTo(x + radius, y + height);
  shape.quadraticCurveTo(x, y + height, x, y + height - radius);
  shape.lineTo(x, y + radius);
  shape.quadraticCurveTo(x, y, x + radius, y);
  var geometry = new THREE.ExtrudeGeometry(shape, {
    depth: depth,
    bevelEnabled: true,
    bevelThickness: Math.min(0.018, depth * 0.24),
    bevelSize: Math.min(radius * 0.45, 0.022),
    bevelSegments: 5,
    curveSegments: 8,
  });
  geometry.translate(0, 0, -depth / 2);
  return geometry;
}

function makeRoundedPart(name, width, height, radius, depth, material, x, y, z) {
  var mesh = new THREE.Mesh(createRoundedRectGeometry(width, height, radius, depth), material);
  mesh.name = name;
  mesh.position.set(x || 0, y || 0, z || 0);
  return mesh;
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
  baseGradient.addColorStop(0, "#fffdf1");
  baseGradient.addColorStop(0.58, "#f7f3e5");
  baseGradient.addColorStop(1, "#d9d2c0");
  ctx.fillStyle = baseGradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.strokeStyle = "rgba(23, 28, 30, 0.38)";
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
    [256, 256, 58, "#1f272b", -Math.PI / 2],
    [118, 120, 44, "#f0782f", -0.2],
    [392, 130, 44, "#61f0ff", 0.52],
    [145, 392, 42, "#1f272b", 0.2],
    [378, 378, 42, "#f0782f", -0.7],
  ].forEach(function drawPatch(patch) {
    ctx.beginPath();
    for (var i = 0; i < 6; i += 1) {
      var angle = patch[4] + (i / 6) * Math.PI * 2;
      var px = patch[0] + Math.cos(angle) * patch[2];
      var py = patch[1] + Math.sin(angle) * patch[2];
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fillStyle = patch[3];
    ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,0.58)";
    ctx.lineWidth = 3;
    ctx.stroke();
  });

  ctx.globalAlpha = 0.52;
  ["#f0782f", "#61f0ff", "#1f272b"].forEach(function drawAccent(color, index) {
    ctx.strokeStyle = color;
    ctx.lineWidth = 9 - index * 2;
    ctx.beginPath();
    ctx.arc(256, 256, 132 + index * 28, Math.PI * (0.12 + index * 0.16), Math.PI * (0.62 + index * 0.16));
    ctx.stroke();
  });
  ctx.globalAlpha = 1;

  ctx.globalAlpha = 0.28;
  ctx.strokeStyle = "#7f7465";
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
  texture.userData.assetSystem = "modern-panel-match-ball-texture";
  texture.userData.panelSystem = "radial-accent-seamed-panels";
  texture.userData.materialSystem = "raised-seam-accent-match-ball";
  texture.userData.finishSystem = "micro-scuffed-satin-panels";
  texture.userData.surfaceDetailSystem = "micro-scuffs-valve-and-panel-depth";
  texture.userData.valveSystem = "painted-rubber-air-valve";
  return texture;
}

export function createFootballMaterial() {
  var material = new THREE.MeshStandardMaterial({
    map: createFootballTexture(),
    bumpMap: createFootballSurfaceMap("bump"),
    bumpScale: 0.018,
    roughnessMap: createFootballSurfaceMap("roughness"),
    roughness: 0.44,
    metalness: 0.015,
  });
  material.userData.materialPipelineSystem = "procedural-match-ball-pbr";
  material.userData.surfaceDetailSystem = "raised-seam-and-scuffed-panel-relief";
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
      data[index] = seam ? 34 : accent ? 240 : 246 - Math.floor(radius * 28);
      data[index + 1] = seam ? 39 : accent ? 120 : 242 - Math.floor(radius * 24);
      data[index + 2] = seam ? 42 : accent ? 47 : 229 - Math.floor(radius * 22);
      data[index + 3] = 255;
    }
  }
  var texture = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  texture.needsUpdate = true;
  texture.userData.assetSystem = "modern-panel-match-ball-texture";
  texture.userData.panelSystem = "radial-accent-seamed-panels";
  texture.userData.materialSystem = "raised-seam-accent-match-ball";
  texture.userData.finishSystem = "micro-scuffed-satin-panels";
  texture.userData.surfaceDetailSystem = "micro-scuffs-valve-and-panel-depth";
  texture.userData.valveSystem = "painted-rubber-air-valve";
  return texture;
}

export function createFieldGroup() {
  var group = new THREE.Group();
  group.userData.visualStyle = "standard-football-match-pitch";
  group.userData.assetSystem = "stylized-reusable-matchday-kit";
  group.userData.materialPipelineSystem = "procedural-pbr-material-stack";
  group.userData.markingSystem = "standard-football-pitch";
  group.userData.surfaceDetailSystem = "layered-turf-with-foreground-blades";
  group.userData.surfaceFinishSystem = "multi-layer-turf-edge-divot-kit";
  group.userData.stadiumDressingSystem = "crowd-scoreboard-flags-matchday-dressing";
  group.userData.stadiumScoreboardSystem = STADIUM_SCOREBOARD_DISPLAY_SYSTEM;
  group.userData.reusableAssetTechnique = "instanced-turf-and-layered-material-kit";
  var turf = new THREE.Mesh(
    new THREE.PlaneGeometry(18, 52, 1, 1),
    createTurfMaterial(),
  );
  turf.name = "field-turf";
  turf.rotation.x = -Math.PI / 2;
  turf.position.set(0, -0.025, -14);
  group.add(turf);

  var patchMaterial = new THREE.MeshBasicMaterial({
    color: "#74c95b",
    transparent: true,
    opacity: 0.12,
    depthWrite: false,
  });
  for (var patchIndex = 0; patchIndex < 8; patchIndex += 1) {
    var patch = new THREE.Mesh(new THREE.CircleGeometry(1, 28), patchMaterial.clone());
    patch.name = "field-turf-color-variation-patch-" + patchIndex;
    patch.rotation.x = -Math.PI / 2;
    patch.rotation.z = patchIndex * 0.37;
    patch.scale.set(0.72 + (patchIndex % 3) * 0.18, 0.18 + (patchIndex % 4) * 0.06, 1);
    patch.material.color.set(patchIndex % 2 ? "#4fab4d" : "#a6df70");
    patch.material.opacity = 0.075 + (patchIndex % 4) * 0.018;
    patch.position.set(-4.9 + (patchIndex % 4) * 3.2, -0.014, -15.8 + Math.floor(patchIndex / 4) * 8.2);
    group.add(patch);
  }

  var stripeMaterial = new THREE.MeshBasicMaterial({ color: "#9ee87d", transparent: true, opacity: 0.14, depthWrite: false });
  var shadowStripeMaterial = new THREE.MeshBasicMaterial({
    color: "#3e9845",
    transparent: true,
    opacity: 0.1,
    depthWrite: false,
  });
  for (var i = 0; i < 10; i += 1) {
    var stripe = new THREE.Mesh(new THREE.PlaneGeometry(18, 2.65), i % 2 ? shadowStripeMaterial : stripeMaterial);
    stripe.name = "field-mowing-stripe-" + i;
    stripe.rotation.x = -Math.PI / 2;
    stripe.position.set(0, -0.018, -38 + i * 5.9);
    group.add(stripe);
  }

  var brushMaterial = new THREE.MeshBasicMaterial({
    color: "#d8f3bd",
    transparent: true,
    opacity: 0.12,
    depthWrite: false,
  });
  for (var brushIndex = 0; brushIndex < 12; brushIndex += 1) {
    var brush = new THREE.Mesh(new THREE.PlaneGeometry(0.08, 5.4), brushMaterial.clone());
    brush.name = "field-turf-maintenance-brush-" + brushIndex;
    brush.rotation.x = -Math.PI / 2;
    brush.rotation.z = brushIndex % 2 ? 0.07 : -0.07;
    brush.position.set(-5.6 + brushIndex * 1.02, -0.01, -13.2 + (brushIndex % 3) * 2.1);
    brush.material.opacity = 0.08 + (brushIndex % 4) * 0.018;
    group.add(brush);
  }

  var depthBandMaterial = new THREE.MeshBasicMaterial({
    color: "#1f7f42",
    transparent: true,
    opacity: 0.13,
    depthWrite: false,
  });
  [-15.6, -11.8, -8.0, -4.2, -0.4].forEach(function addDepthBand(z, index) {
    var band = new THREE.Mesh(new THREE.PlaneGeometry(14.5 - index * 0.75, 0.34), depthBandMaterial);
    band.name = "field-depth-band-" + index;
    band.rotation.x = -Math.PI / 2;
    band.position.set(0, -0.012, z);
    group.add(band);
  });

  var wearMaterial = new THREE.MeshBasicMaterial({
    color: "#d6c486",
    transparent: true,
    opacity: 0.24,
    depthWrite: false,
  });
  [
    ["center", 0, 1.2, 0.84, 0.22],
    ["left", -1.18, 1.0, 0.52, 0.13],
    ["right", 1.18, 1.0, 0.52, 0.13],
  ].forEach(function addGoalmouthWear(item) {
    var wear = new THREE.Mesh(new THREE.CircleGeometry(1, 36), wearMaterial);
    wear.name = "field-goalmouth-wear-" + item[0];
    wear.rotation.x = -Math.PI / 2;
    wear.scale.set(item[3], item[4], 1);
    wear.position.set(item[1], -0.009, RAPIER_GOAL.netPlaneZ - item[2]);
    group.add(wear);
  });

  var spot = new THREE.Mesh(
    new THREE.CircleGeometry(0.09, 24),
    new THREE.MeshBasicMaterial({ color: "#fafff4", transparent: true, opacity: 0.82, depthWrite: false }),
  );
  spot.name = "field-penalty-spot";
  spot.rotation.x = -Math.PI / 2;
  spot.position.set(0, 0.011, -6.35);
  group.add(spot);

  var lineMaterial = new THREE.LineBasicMaterial({ color: "#f7fff2", transparent: true, opacity: 0.88 });
  function addStandardLine(name, points, opacity) {
    var material = opacity === undefined ? lineMaterial : lineMaterial.clone();
    material.opacity = opacity === undefined ? lineMaterial.opacity : opacity;
    var line = new THREE.Line(new THREE.BufferGeometry().setFromPoints(points), material);
    line.name = "field-standard-" + name;
    group.add(line);
  }

  var pitchHalfWidth = 7.35;
  var goalLineZ = RAPIER_GOAL.netPlaneZ;
  var farLineZ = -22.4;
  var centerLineZ = SHOT_3D.origin.z;
  addStandardLine("goal-line", [
    new THREE.Vector3(-pitchHalfWidth, 0.012, goalLineZ),
    new THREE.Vector3(pitchHalfWidth, 0.012, goalLineZ),
  ]);
  addStandardLine("touchline-left", [
    new THREE.Vector3(-pitchHalfWidth, 0.012, goalLineZ),
    new THREE.Vector3(-pitchHalfWidth, 0.012, farLineZ),
  ], 0.72);
  addStandardLine("touchline-right", [
    new THREE.Vector3(pitchHalfWidth, 0.012, goalLineZ),
    new THREE.Vector3(pitchHalfWidth, 0.012, farLineZ),
  ], 0.72);
  addStandardLine("center-line", [
    new THREE.Vector3(-pitchHalfWidth, 0.012, centerLineZ),
    new THREE.Vector3(pitchHalfWidth, 0.012, centerLineZ),
  ], 0.62);

  var penaltyHalfWidth = 4.95;
  var penaltyTopZ = goalLineZ - 6.4;
  addStandardLine("penalty-area-left", [
    new THREE.Vector3(-penaltyHalfWidth, 0.013, goalLineZ),
    new THREE.Vector3(-penaltyHalfWidth, 0.013, penaltyTopZ),
  ]);
  addStandardLine("penalty-area-right", [
    new THREE.Vector3(penaltyHalfWidth, 0.013, goalLineZ),
    new THREE.Vector3(penaltyHalfWidth, 0.013, penaltyTopZ),
  ]);
  addStandardLine("penalty-area-top", [
    new THREE.Vector3(-penaltyHalfWidth, 0.013, penaltyTopZ),
    new THREE.Vector3(penaltyHalfWidth, 0.013, penaltyTopZ),
  ]);

  var goalAreaHalfWidth = 2.55;
  var goalAreaTopZ = goalLineZ - 2.45;
  addStandardLine("goal-area-left", [
    new THREE.Vector3(-goalAreaHalfWidth, 0.014, goalLineZ),
    new THREE.Vector3(-goalAreaHalfWidth, 0.014, goalAreaTopZ),
  ], 0.82);
  addStandardLine("goal-area-right", [
    new THREE.Vector3(goalAreaHalfWidth, 0.014, goalLineZ),
    new THREE.Vector3(goalAreaHalfWidth, 0.014, goalAreaTopZ),
  ], 0.82);
  addStandardLine("goal-area-top", [
    new THREE.Vector3(-goalAreaHalfWidth, 0.014, goalAreaTopZ),
    new THREE.Vector3(goalAreaHalfWidth, 0.014, goalAreaTopZ),
  ], 0.82);

  var centerCirclePoints = [];
  for (var c = 0; c <= Math.PI * 2 + 0.01; c += Math.PI / 40) {
    centerCirclePoints.push(new THREE.Vector3(Math.cos(c) * 1.42, 0.012, centerLineZ + Math.sin(c) * 1.42));
  }
  addStandardLine("center-circle", centerCirclePoints, 0.58);

  var penaltyArcPoints = [];
  for (var a = Math.PI * 0.18; a <= Math.PI * 0.82; a += Math.PI / 32) {
    penaltyArcPoints.push(new THREE.Vector3(Math.cos(a) * 1.55, 0.012, -6.35 - Math.sin(a) * 1.55));
  }
  addStandardLine("penalty-arc", penaltyArcPoints, 0.58);

  [
    ["left", -pitchHalfWidth, goalLineZ, 0, Math.PI / 2],
    ["right", pitchHalfWidth, goalLineZ, Math.PI / 2, Math.PI],
  ].forEach(function addCornerArc(item) {
    var points = [];
    for (var angle = item[3]; angle <= item[4] + 0.01; angle += Math.PI / 18) {
      points.push(new THREE.Vector3(item[1] + Math.cos(angle) * 0.36, 0.013, item[2] - Math.sin(angle) * 0.36));
    }
    addStandardLine("corner-arc-" + item[0], points, 0.7);
  });

  var touchlineShadowMaterial = new THREE.MeshBasicMaterial({
    color: "#184c2c",
    transparent: true,
    opacity: 0.16,
    depthWrite: false,
  });
  [-1, 1].forEach(function addTouchlineShadow(side) {
    var shadow = new THREE.Mesh(new THREE.PlaneGeometry(0.16, 18), touchlineShadowMaterial);
    shadow.name = "field-touchline-shadow-" + (side < 0 ? "left" : "right");
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.set(side * (pitchHalfWidth - 0.16), 0.006, -7.8);
    group.add(shadow);
  });

  var mouthShadowMaterial = new THREE.MeshBasicMaterial({
    color: "#123d24",
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

  var bladeGeometry = new THREE.PlaneGeometry(0.035, 0.18);
  bladeGeometry.translate(0, 0.09, 0);
  var bladeMaterials = [
    new THREE.MeshStandardMaterial({ color: "#7fda5f", roughness: 0.9, side: THREE.DoubleSide }),
    new THREE.MeshStandardMaterial({ color: "#4ba94e", roughness: 0.92, side: THREE.DoubleSide }),
    new THREE.MeshStandardMaterial({ color: "#b7e879", roughness: 0.88, side: THREE.DoubleSide }),
  ];
  for (var g = 0; g < 42; g += 1) {
    var cluster = new THREE.Group();
    cluster.name = "field-foreground-blade-cluster-" + g;
    var row = Math.floor(g / 7);
    var col = g % 7;
    cluster.position.set(-3.8 + col * 1.26 + (row % 2) * 0.18, 0.02, 2.15 + row * 0.54);
    cluster.rotation.y = -0.28 + (g % 5) * 0.14;
    for (var bladeIndex = 0; bladeIndex < 3; bladeIndex += 1) {
      var blade = new THREE.Mesh(bladeGeometry, bladeMaterials[(g + bladeIndex) % bladeMaterials.length]);
      blade.name = "field-foreground-blade-" + g + "-" + bladeIndex;
      blade.position.set((bladeIndex - 1) * 0.04, 0, (bladeIndex % 2) * 0.035);
      blade.rotation.set(0.12 + bladeIndex * 0.04, bladeIndex * 0.72, (bladeIndex - 1) * 0.18);
      blade.scale.setScalar(0.72 + ((g + bladeIndex) % 4) * 0.08);
      cluster.add(blade);
    }
    group.add(cluster);
  }

  var edgeBladeMaterials = [
    new THREE.MeshStandardMaterial({ color: "#c6e87a", roughness: 0.9, side: THREE.DoubleSide }),
    new THREE.MeshStandardMaterial({ color: "#5fbd4f", roughness: 0.92, side: THREE.DoubleSide }),
  ];
  for (var edgeIndex = 0; edgeIndex < 16; edgeIndex += 1) {
    var edgeCluster = new THREE.Group();
    edgeCluster.name = "field-edge-tuft-cluster-" + edgeIndex;
    var edgeSide = edgeIndex % 2 === 0 ? -1 : 1;
    var edgeRow = Math.floor(edgeIndex / 2);
    edgeCluster.position.set(edgeSide * (RAPIER_GOAL.halfWidth + 0.74 + (edgeRow % 2) * 0.08), 0.025, 2.55 + edgeRow * 0.34);
    edgeCluster.rotation.y = edgeSide * (0.22 + (edgeRow % 3) * 0.06);
    for (var edgeBladeIndex = 0; edgeBladeIndex < 4; edgeBladeIndex += 1) {
      var edgeBlade = new THREE.Mesh(bladeGeometry, edgeBladeMaterials[(edgeIndex + edgeBladeIndex) % edgeBladeMaterials.length]);
      edgeBlade.name = "field-edge-tuft-blade-" + edgeIndex + "-" + edgeBladeIndex;
      edgeBlade.position.set((edgeBladeIndex - 1.5) * 0.035, 0, (edgeBladeIndex % 2) * 0.03);
      edgeBlade.rotation.set(0.18 + edgeBladeIndex * 0.035, edgeBladeIndex * 0.62, edgeSide * (0.14 + edgeBladeIndex * 0.04));
      edgeBlade.scale.set(0.82 + edgeBladeIndex * 0.08, 0.88 + (edgeIndex % 3) * 0.07, 1);
      edgeCluster.add(edgeBlade);
    }
    group.add(edgeCluster);
  }

  var divotMaterial = new THREE.MeshBasicMaterial({
    color: "#cab77a",
    transparent: true,
    opacity: 0.2,
    depthWrite: false,
  });
  for (var divotIndex = 0; divotIndex < 12; divotIndex += 1) {
    var divot = new THREE.Mesh(new THREE.CircleGeometry(1, 22), divotMaterial.clone());
    divot.name = "field-divot-scar-" + divotIndex;
    divot.rotation.x = -Math.PI / 2;
    divot.rotation.z = (divotIndex % 5) * 0.34;
    divot.scale.set(0.12 + (divotIndex % 4) * 0.022, 0.032 + (divotIndex % 3) * 0.012, 1);
    divot.material.opacity = 0.12 + (divotIndex % 4) * 0.025;
    divot.position.set(-2.9 + (divotIndex % 6) * 1.12, 0.018, 0.8 + Math.floor(divotIndex / 6) * 1.25);
    group.add(divot);
  }

  function addInstancedTurfLayer(name, count, zStart, zSpan, halfWidth, yBase, color) {
    var geometry = new THREE.PlaneGeometry(0.028, 0.18);
    geometry.translate(0, 0.09, 0);
    var material = new THREE.MeshStandardMaterial({
      color,
      roughness: 0.92,
      metalness: 0,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.78,
    });
    var blades = new THREE.InstancedMesh(geometry, material, count);
    blades.name = name;
    blades.userData.assetTechnique = "deterministic-instanced-turf";
    var dummy = new THREE.Object3D();
    for (var bladeInstance = 0; bladeInstance < count; bladeInstance += 1) {
      var row = Math.floor(bladeInstance / 22);
      var col = bladeInstance % 22;
      var jitterA = Math.sin(bladeInstance * 12.9898) * 43758.5453;
      var jitterB = Math.sin(bladeInstance * 78.233) * 19341.372;
      var jx = jitterA - Math.floor(jitterA);
      var jz = jitterB - Math.floor(jitterB);
      dummy.position.set(
        -halfWidth + (col / 21) * halfWidth * 2 + (jx - 0.5) * 0.18,
        yBase,
        zStart + (row / Math.max(1, Math.floor(count / 22))) * zSpan + (jz - 0.5) * 0.24,
      );
      dummy.rotation.set(0.12 + (bladeInstance % 5) * 0.025, bladeInstance * 0.53, (jx - 0.5) * 0.38);
      dummy.scale.set(0.72 + jx * 0.55, 0.68 + jz * 0.8, 1);
      dummy.updateMatrix();
      blades.setMatrixAt(bladeInstance, dummy.matrix);
    }
    blades.instanceMatrix.needsUpdate = true;
    group.add(blades);
  }

  addInstancedTurfLayer("field-instanced-turf-blades-near", 132, 1.05, 3.3, 4.4, 0.018, "#8bdc62");
  addInstancedTurfLayer("field-instanced-turf-blades-goalmouth", 110, 2.3, 2.4, RAPIER_GOAL.halfWidth + 0.95, 0.02, "#d3e878");

  var chalkDustMaterial = new THREE.MeshBasicMaterial({
    color: "#f6fff2",
    transparent: true,
    opacity: 0.2,
    depthWrite: false,
  });
  for (var chalkIndex = 0; chalkIndex < 8; chalkIndex += 1) {
    var chalk = new THREE.Mesh(new THREE.PlaneGeometry(0.28, 0.055), chalkDustMaterial.clone());
    chalk.name = "field-line-chalk-dust-" + chalkIndex;
    chalk.rotation.x = -Math.PI / 2;
    chalk.rotation.z = chalkIndex % 2 ? 0.08 : -0.08;
    chalk.material.opacity = 0.12 + (chalkIndex % 3) * 0.035;
    chalk.position.set(-3.1 + chalkIndex * 0.88, 0.02, RAPIER_GOAL.netPlaneZ - 0.16 - (chalkIndex % 2) * 0.08);
    group.add(chalk);
  }

  var standMatA = new THREE.MeshStandardMaterial({ color: "#264c54", roughness: 0.64, metalness: 0.02 });
  var standMatB = new THREE.MeshStandardMaterial({ color: "#f2f0df", roughness: 0.7, metalness: 0.01 });
  var crowdColors = ["#f0782f", "#f5f0df", "#2d5963", "#61b979", "#23383d"];
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

  var boardMaterials = ["#f0782f", "#203f52", "#f6f1df", "#3f8f62"].map(
    (color) => new THREE.MeshStandardMaterial({ color, roughness: 0.5, metalness: 0.02 }),
  );
  for (var b = 0; b < 8; b += 1) {
    var board = new THREE.Mesh(new THREE.BoxGeometry(1.25, 0.34, 0.055), boardMaterials[b % boardMaterials.length]);
    board.name = "stadium-ad-board-" + b;
    var side = b % 2 === 0 ? -1 : 1;
    board.position.set(side * 7.08, 0.22, -8.8 + Math.floor(b / 2) * 3.6);
    board.rotation.y = side > 0 ? -Math.PI / 2 + 0.04 : Math.PI / 2 - 0.04;
    group.add(board);
  }

  var poleMat = new THREE.MeshStandardMaterial({ color: "#263538", roughness: 0.42, metalness: 0.12 });
  var lampMat = new THREE.MeshBasicMaterial({ color: "#fff4c8", transparent: true, opacity: 0.84 });
  [
    ["left-back", -7.2, -22.0],
    ["right-back", 7.2, -22.0],
    ["left-mid", -7.4, -8.0],
    ["right-mid", 7.4, -8.0],
  ].forEach(function addFloodlight(item) {
    var mast = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.052, 2.6, 10), poleMat);
    mast.name = "stadium-floodlight-mast-" + item[0];
    mast.position.set(item[1], 1.28, item[2]);
    group.add(mast);

    var head = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.2, 0.07), lampMat);
    head.name = "stadium-floodlight-head-" + item[0];
    head.position.set(item[1], 2.62, item[2] + 0.08);
    head.rotation.y = item[1] < 0 ? -0.32 : 0.32;
    group.add(head);
  });

  return group;
}

export function createGoalAndNet() {
  var group = new THREE.Group();
  group.userData.assetSystem = "layered-goal-and-net-kit";
  group.userData.frameDetailSystem = "rounded-posts-with-tensioned-net";
  group.userData.netPocketSystem = "localized-net-pocket-deformation";
  group.userData.netHardwareSystem = "weighted-net-label-and-clip-kit";
  group.userData.netWeaveSystem = "knotted-diagonal-net-weave";
  group.userData.dynamicNetDetailSystem = "reactive-woven-net-detail-kit";
  group.userData.frameAssemblySystem = "manufactured-goal-frame-hardware";
  group.userData.depthReadabilitySystem = "goal-net-depth-contact-shadow-kit";
  var dynamicNetDetails = [];

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
    });
    return object;
  }

  var frameMaterial = new THREE.MeshStandardMaterial({ color: "#f5fff7", roughness: 0.34, metalness: 0.04 });
  var trimMaterial = new THREE.MeshStandardMaterial({ color: "#f0782f", roughness: 0.36, metalness: 0.02 });
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
  group.add(left, right, top);

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

  var leftTrim = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.28, 0.135), trimMaterial);
  leftTrim.name = "goal-brand-trim-left-post";
  leftTrim.position.set(-RAPIER_GOAL.halfWidth, 0.42, RAPIER_GOAL.netPlaneZ - 0.005);
  var rightTrim = leftTrim.clone();
  rightTrim.name = "goal-brand-trim-right-post";
  rightTrim.position.x = RAPIER_GOAL.halfWidth;
  group.add(leftTrim, rightTrim);

  var collarMaterial = new THREE.MeshStandardMaterial({ color: "#e7efe7", roughness: 0.34, metalness: 0.12 });
  var boltMaterial = new THREE.MeshStandardMaterial({ color: "#cfd9d2", roughness: 0.32, metalness: 0.18 });
  [
    ["left-top", -RAPIER_GOAL.halfWidth, RAPIER_GOAL.height - 0.12, RAPIER_GOAL.netPlaneZ],
    ["right-top", RAPIER_GOAL.halfWidth, RAPIER_GOAL.height - 0.12, RAPIER_GOAL.netPlaneZ],
    ["left-base", -RAPIER_GOAL.halfWidth, 0.16, RAPIER_GOAL.netPlaneZ],
    ["right-base", RAPIER_GOAL.halfWidth, 0.16, RAPIER_GOAL.netPlaneZ],
  ].forEach(function addFrameCollar(item, index) {
    var collar = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.088, 0.095, 18), collarMaterial);
    collar.name = "goal-frame-corner-collar-" + item[0];
    collar.position.set(item[1], item[2], item[3]);
    collar.rotation.x = Math.PI / 2;
    group.add(collar);

    [-1, 1].forEach(function addCollarBolt(side) {
      var bolt = new THREE.Mesh(new THREE.SphereGeometry(0.018, 10, 8), boltMaterial);
      bolt.name = "goal-frame-fastener-bolt-collar-" + index + "-" + (side > 0 ? "outer" : "inner");
      bolt.position.set(item[1] + side * 0.054, item[2], item[3] - 0.05);
      group.add(bolt);
    });
  });

  var netMaterial = new THREE.MeshBasicMaterial({
    color: "#dff8ff",
    transparent: true,
    opacity: 0.16,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  var net = new THREE.Mesh(new THREE.PlaneGeometry(RAPIER_GOAL.halfWidth * 2, RAPIER_GOAL.height, 18, 8), netMaterial);
  net.name = "goal-net-back-panel";
  net.userData.deformationSystem = "localized-net-pocket-deformation";
  net.position.set(0, RAPIER_GOAL.height / 2, RAPIER_GOAL.netPlaneZ + 0.1);
  group.add(net);

  var frameContactShadowMaterial = new THREE.MeshBasicMaterial({
    color: "#102f24",
    transparent: true,
    opacity: 0.22,
    depthWrite: false,
  });
  [
    ["left-post", -RAPIER_GOAL.halfWidth, RAPIER_GOAL.netPlaneZ + 0.02, 0.28, 0.12],
    ["right-post", RAPIER_GOAL.halfWidth, RAPIER_GOAL.netPlaneZ + 0.02, 0.28, 0.12],
    ["rear-cord", 0, RAPIER_GOAL.netPlaneZ + 0.72, 1.55, 0.11],
  ].forEach(function addFrameContactShadow(item) {
    var shadow = new THREE.Mesh(new THREE.CircleGeometry(1, 32), frameContactShadowMaterial.clone());
    shadow.name = "goal-frame-contact-shadow-" + item[0];
    shadow.rotation.x = -Math.PI / 2;
    shadow.scale.set(item[3], item[4], 1);
    shadow.position.set(item[1], 0.008, item[2]);
    group.add(shadow);
  });

  var depthHazeMaterial = new THREE.MeshBasicMaterial({
    color: "#dff8ff",
    transparent: true,
    opacity: 0.08,
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

  var gridMaterial = new THREE.LineBasicMaterial({ color: "#ecfdff", transparent: true, opacity: 0.32 });
  var linePoints = [];
  for (var x = -RAPIER_GOAL.halfWidth; x <= RAPIER_GOAL.halfWidth + 0.01; x += 0.42) {
    linePoints.push(new THREE.Vector3(x, 0, RAPIER_GOAL.netPlaneZ + 0.09));
    linePoints.push(new THREE.Vector3(x, RAPIER_GOAL.height, RAPIER_GOAL.netPlaneZ + 0.09));
  }
  for (var y = 0; y <= RAPIER_GOAL.height + 0.01; y += 0.28) {
    linePoints.push(new THREE.Vector3(-RAPIER_GOAL.halfWidth, y, RAPIER_GOAL.netPlaneZ + 0.09));
    linePoints.push(new THREE.Vector3(RAPIER_GOAL.halfWidth, y, RAPIER_GOAL.netPlaneZ + 0.09));
  }
  var grid = new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(linePoints), gridMaterial);
  grid.name = "goal-net-back-grid";
  group.add(grid);

  var diagonalMaterial = new THREE.LineBasicMaterial({ color: "#f7ffff", transparent: true, opacity: 0.22 });
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
    group.add(registerDynamicNetDetail(weave, 1.08, 0.78));
  }
  addDiagonalWeave("rising", 1);
  addDiagonalWeave("falling", -1);

  var sideNetMaterial = netMaterial.clone();
  sideNetMaterial.opacity = 0.12;
  ["left", "right"].forEach(function addSideNet(side) {
    var sign = side === "left" ? -1 : 1;
    var sideNet = new THREE.Mesh(new THREE.PlaneGeometry(0.95, RAPIER_GOAL.height, 5, 8), sideNetMaterial.clone());
    sideNet.name = "goal-net-side-" + side;
    sideNet.position.set(sign * RAPIER_GOAL.halfWidth, RAPIER_GOAL.height / 2, RAPIER_GOAL.netPlaneZ + 0.48);
    sideNet.rotation.y = sign > 0 ? -Math.PI / 2 : Math.PI / 2;
    group.add(registerDynamicNetDetail(sideNet, 0.72, 0.52));

    var stanchion = makeLimb("#edf9f2", 0.038);
    stanchion.name = "goal-depth-stanchion-" + side;
    setLimb(
      stanchion,
      { x: sign * RAPIER_GOAL.halfWidth, y: RAPIER_GOAL.height, z: RAPIER_GOAL.netPlaneZ },
      { x: sign * (RAPIER_GOAL.halfWidth + 0.42), y: 0.12, z: RAPIER_GOAL.netPlaneZ + 0.92 },
    );
    group.add(stanchion);

    var baseRail = makeLimb("#eefaf0", 0.03);
    baseRail.name = "goal-frame-base-rail-" + side;
    setLimb(
      baseRail,
      { x: sign * RAPIER_GOAL.halfWidth, y: 0.045, z: RAPIER_GOAL.netPlaneZ },
      { x: sign * (RAPIER_GOAL.halfWidth + 0.42), y: 0.045, z: RAPIER_GOAL.netPlaneZ + 0.92 },
    );
    group.add(baseRail);
  });

  var cordMaterial = new THREE.MeshBasicMaterial({ color: "#f5fffb", transparent: true, opacity: 0.68 });
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

  var rearWeightCordMaterial = new THREE.LineBasicMaterial({
    color: "#f5fffb",
    transparent: true,
    opacity: 0.54,
  });
  var rearWeightCord = new THREE.Line(
    new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(-RAPIER_GOAL.halfWidth - 0.28, 0.11, RAPIER_GOAL.netPlaneZ + 0.76),
      new THREE.Vector3(RAPIER_GOAL.halfWidth + 0.28, 0.11, RAPIER_GOAL.netPlaneZ + 0.76),
    ]),
    rearWeightCordMaterial,
  );
  rearWeightCord.name = "goal-net-rear-weight-cord-main";
  group.add(registerDynamicNetDetail(rearWeightCord, 0.42, 0.22));

  var sleeveMaterial = new THREE.MeshStandardMaterial({ color: "#fbfff4", roughness: 0.4, metalness: 0.02 });
  [
    ["front-left", -RAPIER_GOAL.halfWidth, RAPIER_GOAL.height - 0.22, RAPIER_GOAL.netPlaneZ + 0.055],
    ["front-right", RAPIER_GOAL.halfWidth, RAPIER_GOAL.height - 0.22, RAPIER_GOAL.netPlaneZ + 0.055],
    ["back-left", -RAPIER_GOAL.halfWidth - 0.34, 0.24, RAPIER_GOAL.netPlaneZ + 0.86],
    ["back-right", RAPIER_GOAL.halfWidth + 0.34, 0.24, RAPIER_GOAL.netPlaneZ + 0.86],
  ].forEach(function addCornerSleeve(item) {
    var sleeve = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.032, 0.36, 12), sleeveMaterial);
    sleeve.name = "goal-net-corner-sleeve-" + item[0];
    sleeve.rotation.z = Math.PI / 2;
    sleeve.position.set(item[1], item[2], item[3]);
    group.add(registerDynamicNetDetail(sleeve, 0.42, 0.22));
  });

  var weaveKnotMaterial = new THREE.MeshBasicMaterial({ color: "#fafff7", transparent: true, opacity: 0.54 });
  for (var weaveKnotIndex = 0; weaveKnotIndex < 10; weaveKnotIndex += 1) {
    var knotX = -RAPIER_GOAL.halfWidth + 0.52 + (weaveKnotIndex % 5) * 1.42;
    var knotY = 0.46 + Math.floor(weaveKnotIndex / 5) * 0.96 + (weaveKnotIndex % 2) * 0.12;
    var weaveKnot = new THREE.Mesh(new THREE.SphereGeometry(0.018, 8, 6), weaveKnotMaterial.clone());
    weaveKnot.name = "goal-net-weave-knot-" + weaveKnotIndex;
    weaveKnot.position.set(knotX, knotY, RAPIER_GOAL.netPlaneZ + 0.12);
    group.add(registerDynamicNetDetail(weaveKnot, 0.76, 0.42));
  }

  var netWeightMaterial = new THREE.MeshStandardMaterial({ color: "#eef4e9", roughness: 0.46, metalness: 0.05 });
  for (var weightIndex = 0; weightIndex < 5; weightIndex += 1) {
    var weight = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.045, 0.34, 14), netWeightMaterial);
    weight.name = "goal-net-bottom-weight-" + weightIndex;
    weight.rotation.z = Math.PI / 2;
    weight.position.set(-RAPIER_GOAL.halfWidth + 0.72 + weightIndex * 1.48, 0.055, RAPIER_GOAL.netPlaneZ + 0.13);
    group.add(registerDynamicNetDetail(weight, 0.34, 0.16));
  }

  var strapMaterial = new THREE.MeshBasicMaterial({
    color: "#fff6d8",
    transparent: true,
    opacity: 0.7,
    side: THREE.DoubleSide,
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
  var footPadMaterial = new THREE.MeshStandardMaterial({ color: "#26312d", roughness: 0.66, metalness: 0.02 });
  [
    ["front-left", -RAPIER_GOAL.halfWidth, 0, RAPIER_GOAL.netPlaneZ],
    ["front-right", RAPIER_GOAL.halfWidth, 0, RAPIER_GOAL.netPlaneZ],
    ["back-left", -RAPIER_GOAL.halfWidth - 0.42, 0, RAPIER_GOAL.netPlaneZ + 0.92],
    ["back-right", RAPIER_GOAL.halfWidth + 0.42, 0, RAPIER_GOAL.netPlaneZ + 0.92],
  ].forEach(function addAnchor(item, anchorIndex) {
    var anchor = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.085, 0.055, 14), anchorMaterial);
    anchor.name = "goal-net-anchor-" + item[0];
    anchor.position.set(item[1], 0.03, item[3]);
    group.add(anchor);

    var footPad = new THREE.Mesh(new THREE.CylinderGeometry(0.115, 0.13, 0.032, 20), footPadMaterial);
    footPad.name = "goal-frame-ground-foot-pad-" + item[0];
    footPad.position.set(item[1], 0.018, item[3]);
    footPad.scale.set(item[0].startsWith("front") ? 1.12 : 0.92, 1, item[0].startsWith("front") ? 0.72 : 0.86);
    group.add(footPad);

    var footBolt = new THREE.Mesh(new THREE.SphereGeometry(0.016, 10, 8), boltMaterial);
    footBolt.name = "goal-frame-fastener-bolt-foot-" + anchorIndex;
    footBolt.position.set(item[1] + (item[0].includes("left") ? -0.048 : 0.048), 0.052, item[3] + 0.014);
    group.add(footBolt);
  });

  var hingeMaterial = new THREE.MeshStandardMaterial({ color: "#d9e6dc", roughness: 0.38, metalness: 0.12 });
  ["left", "right"].forEach(function addDepthHinge(side) {
    var sign = side === "left" ? -1 : 1;
    var hinge = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.075, 0.05), hingeMaterial);
    hinge.name = "goal-depth-hinge-bracket-" + side;
    hinge.position.set(sign * (RAPIER_GOAL.halfWidth + 0.26), 0.13, RAPIER_GOAL.netPlaneZ + 0.72);
    hinge.rotation.y = sign * 0.34;
    group.add(hinge);
  });

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
  group.userData.visualStyle = "polished-ball-launcher";
  group.userData.launcherStationSystem = "animated-launch-bay-with-ball-feed";
  group.userData.launcherRigSystem = "pro-matchday-machine-rig";
  group.position.set(0, 0, SHOT_3D.origin.z);
  group.scale.setScalar(1.45);

  var chassisMat = new THREE.MeshStandardMaterial({ color: "#2d4853", roughness: 0.48, metalness: 0.08 });
  var panelMat = new THREE.MeshStandardMaterial({ color: "#f3fbf0", roughness: 0.42, metalness: 0.02 });
  var barrelMat = new THREE.MeshStandardMaterial({ color: "#19242a", roughness: 0.38, metalness: 0.16 });
  var wheelMat = new THREE.MeshStandardMaterial({ color: "#11191e", roughness: 0.5, metalness: 0.04 });
  var tireGrooveMat = new THREE.MeshStandardMaterial({ color: "#2f444d", roughness: 0.5 });
  var accentMat = new THREE.MeshBasicMaterial({ color: "#61f0ff", transparent: true, opacity: 0.86 });
  var orangeAccentMat = new THREE.MeshBasicMaterial({ color: "#ff8b3d", transparent: true, opacity: 0.9 });
  var ballMat = new THREE.MeshStandardMaterial({ color: "#f8f5e8", roughness: 0.42, metalness: 0.01 });
  var shadowMat = new THREE.MeshBasicMaterial({ color: "#14351f", transparent: true, opacity: 0.2, depthWrite: false });
  var laneMat = new THREE.MeshBasicMaterial({ color: "#f8fff0", transparent: true, opacity: 0.18, depthWrite: false });
  var cableMat = new THREE.LineBasicMaterial({ color: "#20323a", transparent: true, opacity: 0.68 });
  var guardMat = new THREE.MeshBasicMaterial({ color: "#d8fbff", transparent: true, opacity: 0.18, depthWrite: false, side: THREE.DoubleSide });
  var screenMat = new THREE.MeshBasicMaterial({ color: "#61f0ff", transparent: true, opacity: 0.42, depthWrite: false });
  var ledMat = new THREE.MeshBasicMaterial({ color: "#fff1a8", transparent: true, opacity: 0.42, depthWrite: false });
  var operatorMat = new THREE.MeshStandardMaterial({ color: "#203039", roughness: 0.68, metalness: 0.02 });
  var operatorAccentMat = new THREE.MeshStandardMaterial({ color: "#ff8b3d", roughness: 0.46, metalness: 0.02 });
  var flashMat = new THREE.MeshBasicMaterial({
    color: "#fff1a8",
    transparent: true,
    opacity: 0,
    depthWrite: false,
    side: THREE.DoubleSide,
  });

  var kickPad = new THREE.Mesh(new THREE.CircleGeometry(0.72, 36), laneMat.clone());
  kickPad.name = "launcher-kick-pad";
  kickPad.rotation.x = -Math.PI / 2;
  kickPad.scale.set(1.22, 0.52, 1);
  kickPad.position.set(0, 0.012, 0.42);

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
  turret.position.set(0, 1.1, 0.12);
  var barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.12, 0.72, 20), barrelMat);
  barrel.name = "launcher-barrel";
  barrel.rotation.x = Math.PI / 2;
  barrel.position.set(0, 0, 0.34);
  var muzzle = new THREE.Mesh(new THREE.TorusGeometry(0.125, 0.018, 8, 24), orangeAccentMat);
  muzzle.name = "launcher-accent-muzzle-ring";
  muzzle.position.set(0, 0, 0.71);
  var chargeRing = new THREE.Mesh(new THREE.TorusGeometry(0.18, 0.01, 8, 28), accentMat.clone());
  chargeRing.name = "launcher-charge-ring";
  chargeRing.position.set(0, 0, 0.735);
  var muzzleFlash = new THREE.Mesh(new THREE.CircleGeometry(0.19, 28), flashMat);
  muzzleFlash.name = "launcher-muzzle-flash";
  muzzleFlash.position.set(0, 0, 0.765);
  muzzleFlash.visible = false;
  turret.add(barrel, muzzle, chargeRing, muzzleFlash);

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

  var hopper = new THREE.Mesh(new THREE.CylinderGeometry(0.27, 0.17, 0.38, 20), panelMat);
  hopper.name = "launcher-hopper";
  hopper.position.set(0, 1.38, -0.16);
  hopper.rotation.x = -0.16;
  var feedRack = makeRoundedPart("launcher-feed-rack", 0.72, 0.08, 0.024, 0.08, chassisMat, 0, 1.55, -0.22);
  feedRack.rotation.x = -0.1;
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
    aimRailLeft,
    aimRailRight,
    ...laneChevrons,
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
    standHub,
    body,
    facePanel,
    statusLight,
    powerLight,
    numberPlate,
    ...serviceScrews,
    turret,
    wheelLeft,
    wheelRight,
    hopper,
    feedRack,
    ...queueBalls,
    feedBall,
    controlConsole,
    controlScreen,
    ...statusLeds,
    pressureHoseLeft,
    pressureHoseRight,
    operator,
  );
  return {
    group,
    body,
    turret,
    barrel,
    muzzle,
    wheelLeft,
    wheelRight,
    hopper,
    feedBall,
    queueBalls,
    laneChevrons,
    aimRails: [aimRailLeft, aimRailRight],
    kickPad,
    chargeRing,
    muzzleFlash,
    statusLight,
    powerLight,
    controlScreen,
    statusLeds,
    calibrationBeams,
    safetyGuards,
    operatorTablet,
    shadow,
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
  var aimYaw = side * (0.08 + charge * 0.045);
  var aimPitch = -0.08 - charge * 0.04;
  var spin = director.phaseTime * (director.phase === "live" ? 32 : 18) + cueProgress * 12;

  model.turret.rotation.set(aimPitch, aimYaw, 0);
  model.body.rotation.set(-0.05 + charge * 0.025, 0, side * charge * 0.025);
  model.feedBall.visible = director.phase !== "live" || liveProgress > 0.35;
  model.feedBall.position.set(side * charge * 0.025, 1.2 - cueProgress * 0.02, -0.12 + cueProgress * 0.17);
  model.feedBall.scale.setScalar(1 - (director.phase === "live" && liveProgress < 0.22 ? liveProgress * 2.8 : 0));
  model.queueBalls?.forEach((ball, index) => {
    var readyOffset = director.phase === "cue" ? cueProgress * 0.025 : Math.max(0, 0.05 - liveProgress * 0.04);
    ball.position.x = -0.24 + index * 0.24 + side * charge * 0.006;
    ball.position.z = -0.23 - index * 0.035 + readyOffset;
    ball.rotation.y += 0.01 + index * 0.002;
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
  model.shadow.scale.set(1.5 + charge * 0.08, 0.48 + charge * 0.04, 1);
}

export function createGloveMesh(side) {
  var group = new THREE.Group();
  group.userData.visualStyle = "polished-orange-reference-glove";
  group.userData.materialSystem = "stitched-padded-match-glove";
  group.userData.gripSystem = "latex-ridge-and-stitched-fingerback";
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

  var palm = makeRoundedPart("glove-palm-shell", 0.38, 0.43, 0.085, 0.12, palmMat, 0, 0, 0);
  var pad = makeRoundedPart("glove-palm-pad", 0.27, 0.28, 0.06, 0.026, padMat, 0, -0.005, 0.07);
  group.add(palm, pad);

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
