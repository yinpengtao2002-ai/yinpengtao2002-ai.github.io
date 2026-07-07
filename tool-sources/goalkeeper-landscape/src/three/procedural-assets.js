import * as THREE from "three";
import { SHOT_3D } from "../game/shot-3d-director.js";
import { RAPIER_GOAL } from "../physics/rapier-world.js";

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

  var texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  texture.userData.assetSystem = "modern-panel-match-ball-texture";
  texture.userData.panelSystem = "radial-accent-seamed-panels";
  return texture;
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
  return texture;
}

export function createFieldGroup() {
  var group = new THREE.Group();
  group.userData.visualStyle = "standard-football-match-pitch";
  group.userData.assetSystem = "stylized-reusable-matchday-kit";
  group.userData.markingSystem = "standard-football-pitch";
  group.userData.surfaceDetailSystem = "layered-turf-with-foreground-blades";
  group.userData.stadiumDressingSystem = "crowd-scoreboard-flags-matchday-dressing";
  var turf = new THREE.Mesh(
    new THREE.PlaneGeometry(18, 52, 1, 1),
    new THREE.MeshStandardMaterial({ color: "#69bd53", map: createGrassTexture(), roughness: 0.9 }),
  );
  turf.name = "field-turf";
  turf.rotation.x = -Math.PI / 2;
  turf.position.set(0, -0.025, -14);
  group.add(turf);

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

  var netMaterial = new THREE.MeshBasicMaterial({
    color: "#dff8ff",
    transparent: true,
    opacity: 0.16,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  var net = new THREE.Mesh(new THREE.PlaneGeometry(RAPIER_GOAL.halfWidth * 2, RAPIER_GOAL.height, 18, 8), netMaterial);
  net.name = "goal-net-back-panel";
  net.position.set(0, RAPIER_GOAL.height / 2, RAPIER_GOAL.netPlaneZ + 0.1);
  group.add(net);

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

  var sideNetMaterial = netMaterial.clone();
  sideNetMaterial.opacity = 0.12;
  ["left", "right"].forEach(function addSideNet(side) {
    var sign = side === "left" ? -1 : 1;
    var sideNet = new THREE.Mesh(new THREE.PlaneGeometry(0.95, RAPIER_GOAL.height, 5, 8), sideNetMaterial.clone());
    sideNet.name = "goal-net-side-" + side;
    sideNet.position.set(sign * RAPIER_GOAL.halfWidth, RAPIER_GOAL.height / 2, RAPIER_GOAL.netPlaneZ + 0.48);
    sideNet.rotation.y = sign > 0 ? -Math.PI / 2 : Math.PI / 2;
    group.add(sideNet);

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
    group.add(cord);

    var knot = new THREE.Mesh(new THREE.SphereGeometry(0.035, 12, 8), cordMaterial.clone());
    knot.name = "goal-net-rope-knot-" + item[0];
    knot.position.set(item[4], item[5], item[6]);
    group.add(knot);
  });

  var anchorMaterial = new THREE.MeshStandardMaterial({ color: "#dbe8dd", roughness: 0.48, metalness: 0.04 });
  [
    ["front-left", -RAPIER_GOAL.halfWidth, 0, RAPIER_GOAL.netPlaneZ],
    ["front-right", RAPIER_GOAL.halfWidth, 0, RAPIER_GOAL.netPlaneZ],
    ["back-left", -RAPIER_GOAL.halfWidth - 0.42, 0, RAPIER_GOAL.netPlaneZ + 0.92],
    ["back-right", RAPIER_GOAL.halfWidth + 0.42, 0, RAPIER_GOAL.netPlaneZ + 0.92],
  ].forEach(function addAnchor(item) {
    var anchor = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.085, 0.055, 14), anchorMaterial);
    anchor.name = "goal-net-anchor-" + item[0];
    anchor.position.set(item[1], 0.03, item[3]);
    group.add(anchor);
  });

  return { group, net, grid };
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
  turret.add(barrel, muzzle);

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

  group.add(
    shadow,
    standLeft,
    standRight,
    standBack,
    baseFootLeft,
    baseFootRight,
    baseFootBack,
    standHub,
    body,
    facePanel,
    statusLight,
    powerLight,
    turret,
    wheelLeft,
    wheelRight,
    hopper,
    feedBall,
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
    statusLight,
    powerLight,
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
  var aimYaw = side * (0.08 + charge * 0.045);
  var aimPitch = -0.08 - charge * 0.04;
  var spin = director.phaseTime * (director.phase === "live" ? 32 : 18) + cueProgress * 12;

  model.turret.rotation.set(aimPitch, aimYaw, 0);
  model.body.rotation.set(-0.05 + charge * 0.025, 0, side * charge * 0.025);
  model.feedBall.visible = director.phase !== "live" || liveProgress > 0.35;
  model.feedBall.position.set(side * charge * 0.025, 1.2 - cueProgress * 0.02, -0.12 + cueProgress * 0.17);
  model.feedBall.scale.setScalar(1 - (director.phase === "live" && liveProgress < 0.22 ? liveProgress * 2.8 : 0));
  model.wheelLeft.rotation.y = spin;
  model.wheelRight.rotation.y = -spin;
  model.statusLight.material.opacity = 0.52 + charge * 0.42;
  model.powerLight.material.opacity = director.phase === "live" ? 0.95 : 0.58 + cueProgress * 0.28;
  model.shadow.scale.set(1.5 + charge * 0.08, 0.48 + charge * 0.04, 1);
}

export function createGloveMesh(side) {
  var group = new THREE.Group();
  group.userData.visualStyle = "polished-orange-reference-glove";
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

  return group;
}
