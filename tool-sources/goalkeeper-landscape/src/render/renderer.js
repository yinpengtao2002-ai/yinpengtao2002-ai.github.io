import { projectBall } from "../physics/ball-physics.js";
import { getProjectedGloves } from "../physics/glove-physics.js";
import { FIELD } from "../config/game-config.js";

function clamp01(value) {
  return Math.max(0, Math.min(1, value));
}

function mix(a, b, t) {
  return a + (b - a) * t;
}

function easeOutCubic(t) {
  return 1 - Math.pow(1 - clamp01(t), 3);
}

export function getShooterPose(director) {
  var shot = director.currentShot || {};
  var cue = shot.cue || { lean: "center", swing: "drive", side: 1 };
  var side = cue.side || 1;
  var cueProgress = director.phase === "cue" ? clamp01((director.phaseTime || 0) / (shot.cueDuration || 1)) : 1;
  var approach = easeOutCubic(Math.min(1, cueProgress / 0.42));
  var cueStrike = easeOutCubic(Math.max(0, (cueProgress - 0.4) / 0.42));
  var follow = easeOutCubic(Math.max(0, (cueProgress - 0.74) / 0.26));
  var liveRecovery = director.phase === "live" ? easeOutCubic(Math.min(1, (director.phaseTime || 0) / 0.62)) : 0;
  var strike = director.phase === "live" ? Math.max(0.25, 1 - liveRecovery * 0.75) : cueStrike;
  var motion = director.phase === "live" && liveRecovery < 0.92 ? "follow-through" : director.phase === "live" ? "recovery" : strike > 0.8 ? "strike" : "windup";
  var liveFollow = director.phase === "live" ? Math.max(0.28, 1 - liveRecovery * 0.72) : follow;
  var bodyTilt =
    (cue.lean === "left" ? -0.1 : cue.lean === "right" ? 0.1 : 0) +
    side * strike * 0.12 -
    side * liveFollow * 0.11;
  return {
    motion: motion,
    side: side,
    approach: approach,
    strike: strike,
    follow: liveFollow,
    bodyTilt: bodyTilt,
    plantFoot: { x: -side * 10, y: 0 },
    kickFoot: {
      x: side * (director.phase === "live" ? mix(12, -4, liveRecovery) : mix(-20, 9, strike)),
      y: director.phase === "live" ? mix(-6, 8, liveRecovery) : mix(5, -3, strike),
    },
    leftArm: {
      x: -28 - side * strike * 9 + side * liveFollow * 7,
      y: -31 - liveFollow * 4,
    },
    rightArm: {
      x: 30 + side * strike * 10 - side * liveFollow * 8,
      y: -41 - strike * 5 + liveRecovery * 10,
    },
    headBob: director.phase === "live" ? Math.sin(liveRecovery * Math.PI) * 2.4 : -strike * 1.8,
  };
}

export function getBallTrailStyle(ball) {
  if (!ball || !["live", "deflected", "saved", "conceded"].includes(ball.outcome)) {
    return { visible: false, strokeStyle: "rgba(255,248,202,0)" };
  }
  if (ball.outcome === "conceded") {
    return { visible: true, strokeStyle: "rgba(255,199,112,0.72)" };
  }
  if (ball.outcome === "deflected" || ball.outcome === "saved") {
    return { visible: true, strokeStyle: "rgba(154,255,190,0.78)" };
  }
  return { visible: true, strokeStyle: "rgba(255,248,202,0.72)" };
}

export function getNetPocketStyle(ball, bounds) {
  if (!ball || ball.outcome !== "conceded" || !ball.position) {
    return { visible: false, x: 0, y: 0, radius: 0, tension: 0 };
  }

  var projected = projectBall(ball, bounds);
  var netDepth = clamp01(Math.abs(Math.min(0, ball.position.z)) / Math.abs(FIELD.backNetZ));
  var contactAge = typeof ball.netContactAge === "number" ? ball.netContactAge : ball.goalAge || 0;
  var hitPulse = Math.max(0, 1 - contactAge / 0.72);
  var speed = ball.velocity ? Math.hypot(ball.velocity.x || 0, ball.velocity.y || 0, ball.velocity.z || 0) : 0;
  var tension = clamp01(netDepth * 0.5 + hitPulse * 0.42 + Math.min(0.2, speed * 0.025));
  return {
    visible: netDepth > 0.18 || hitPulse > 0.12,
    x: projected.x,
    y: projected.y,
    radius: projected.radius,
    tension: tension,
    depth: netDepth,
  };
}

function getActiveImpact(effects) {
  return effects
    .filter(function impactOnly(effect) {
      return effect.type === "impact";
    })
    .sort(function strongest(a, b) {
      return (b.strength || 0) - (a.strength || 0);
    })[0];
}

function drawRoundedRect(ctx, x, y, width, height, radius) {
  var r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + width - r, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + r);
  ctx.lineTo(x + width, y + height - r);
  ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
  ctx.lineTo(x + r, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function getCage(bounds) {
  var w = bounds.width;
  var h = bounds.height;
  var isLandscape = w / h > 1.2;
  return {
    left: w * (isLandscape ? 0.04 : 0.065),
    right: w * (isLandscape ? 0.96 : 0.935),
    top: h * (isLandscape ? 0.08 : 0.055),
    bottom: h * (isLandscape ? 0.94 : 0.935),
    backLeft: w * (isLandscape ? 0.28 : 0.255),
    backRight: w * (isLandscape ? 0.72 : 0.745),
    backTop: h * (isLandscape ? 0.24 : 0.215),
    backBottom: h * (isLandscape ? 0.72 : 0.705),
    post: Math.max(16, Math.min(w, h) * (isLandscape ? 0.028 : 0.034)),
  };
}

function drawBackground(ctx, bounds) {
  var w = bounds.width;
  var h = bounds.height;
  var wall = ctx.createLinearGradient(0, 0, 0, h);
  wall.addColorStop(0, "#cbd5c7");
  wall.addColorStop(0.38, "#879384");
  wall.addColorStop(0.7, "#39433a");
  wall.addColorStop(1, "#17211a");
  ctx.fillStyle = wall;
  ctx.fillRect(0, 0, w, h);

  ctx.save();
  ctx.globalAlpha = 0.78;
  var light = ctx.createRadialGradient(w * 0.2, h * 0.16, 0, w * 0.2, h * 0.16, h * 0.22);
  light.addColorStop(0, "rgba(255,255,245,0.95)");
  light.addColorStop(0.46, "rgba(255,255,245,0.28)");
  light.addColorStop(1, "rgba(255,255,245,0)");
  ctx.fillStyle = light;
  ctx.fillRect(0, 0, w, h);
  ctx.restore();

  ctx.save();
  ctx.globalAlpha = 0.42;
  ctx.fillStyle = "#121917";
  ctx.fillRect(0, 0, w * 0.08, h);
  ctx.fillRect(w * 0.92, 0, w * 0.08, h);
  ctx.restore();

  ctx.save();
  var vignette = ctx.createRadialGradient(w * 0.5, h * 0.52, h * 0.2, w * 0.5, h * 0.52, h * 0.86);
  vignette.addColorStop(0, "rgba(0,0,0,0)");
  vignette.addColorStop(1, "rgba(0,0,0,0.44)");
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, w, h);
  ctx.restore();
}

function fieldPoint(bounds, t, side) {
  var w = bounds.width;
  var h = bounds.height;
  var isLandscape = w / h > 1.2;
  var p = Math.pow(clamp01(t), 1.36);
  var topY = h * (isLandscape ? 0.46 : 0.43);
  var bottomY = h * 1.04;
  var topLeft = w * (isLandscape ? 0.405 : 0.365);
  var topRight = w * (isLandscape ? 0.595 : 0.635);
  var bottomLeft = -w * (isLandscape ? 0.08 : 0.18);
  var bottomRight = w * (isLandscape ? 1.08 : 1.18);
  return {
    x: side < 0 ? mix(topLeft, bottomLeft, p) : mix(topRight, bottomRight, p),
    y: mix(topY, bottomY, p),
  };
}

function drawField(ctx, bounds) {
  var w = bounds.width;
  var h = bounds.height;
  var horizon = h * (w / h > 1.2 ? 0.46 : 0.43);

  ctx.save();
  ctx.fillStyle = "#28b856";
  ctx.beginPath();
  ctx.moveTo(w * 0.365, horizon);
  ctx.lineTo(w * 0.635, horizon);
  ctx.lineTo(w * 1.18, h * 1.04);
  ctx.lineTo(-w * 0.18, h * 1.04);
  ctx.closePath();
  ctx.fill();

  for (var i = 0; i < 12; i += 1) {
    var p0 = fieldPoint(bounds, i / 12, -1);
    var p1 = fieldPoint(bounds, i / 12, 1);
    var p2 = fieldPoint(bounds, (i + 1) / 12, 1);
    var p3 = fieldPoint(bounds, (i + 1) / 12, -1);
    ctx.fillStyle = i % 2 === 0 ? "#35c961" : "#22b953";
    ctx.beginPath();
    ctx.moveTo(p0.x, p0.y);
    ctx.lineTo(p1.x, p1.y);
    ctx.lineTo(p2.x, p2.y);
    ctx.lineTo(p3.x, p3.y);
    ctx.closePath();
    ctx.fill();
  }

  ctx.strokeStyle = "rgba(226,255,229,0.34)";
  ctx.lineWidth = Math.max(1, w * 0.0013);
  for (var blade = 0; blade < 58; blade += 1) {
    var t = blade / 57;
    var left = fieldPoint(bounds, t, -1);
    var right = fieldPoint(bounds, t, 1);
    ctx.beginPath();
    ctx.moveTo(left.x, left.y);
    ctx.lineTo(right.x, right.y);
    ctx.stroke();
  }

  ctx.strokeStyle = "rgba(255,255,255,0.72)";
  ctx.lineWidth = Math.max(2, w * 0.0022);
  ctx.beginPath();
  ctx.moveTo(w * 0.34, horizon + h * 0.012);
  ctx.lineTo(w * 0.66, horizon + h * 0.012);
  ctx.stroke();

  ctx.strokeStyle = "rgba(255,255,255,0.42)";
  ctx.beginPath();
  ctx.moveTo(w * 0.5, horizon + 4);
  ctx.lineTo(w * 0.5, h * 0.98);
  ctx.stroke();
  ctx.restore();
}

function pointBetween(a, b, t) {
  return {
    x: mix(a.x, b.x, t),
    y: mix(a.y, b.y, t),
  };
}

function drawQuadGrid(ctx, corners, columns, rows, alpha) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = "#f8fbf0";
  ctx.lineWidth = Math.max(1, ctx.canvas.width * 0.00115);
  ctx.lineCap = "round";

  for (var c = 0; c <= columns; c += 1) {
    var t = c / columns;
    var top = pointBetween(corners.frontLeft, corners.frontRight, t);
    var bottom = pointBetween(corners.backLeft, corners.backRight, t);
    ctx.beginPath();
    ctx.moveTo(top.x, top.y);
    ctx.lineTo(bottom.x, bottom.y);
    ctx.stroke();
  }

  for (var r = 0; r <= rows; r += 1) {
    var rt = r / rows;
    var left = pointBetween(corners.frontLeft, corners.backLeft, rt);
    var right = pointBetween(corners.frontRight, corners.backRight, rt);
    ctx.beginPath();
    ctx.moveTo(left.x, left.y);
    ctx.lineTo(right.x, right.y);
    ctx.stroke();
  }
  ctx.restore();
}

function drawGoalCage(ctx, bounds) {
  var cage = getCage(bounds);
  var h = bounds.height;

  drawQuadGrid(
    ctx,
    {
      frontLeft: { x: cage.left, y: cage.top },
      frontRight: { x: cage.right, y: cage.top },
      backLeft: { x: cage.backLeft, y: cage.backTop },
      backRight: { x: cage.backRight, y: cage.backTop },
    },
    18,
    6,
    0.44
  );

  drawQuadGrid(
    ctx,
    {
      frontLeft: { x: cage.left, y: cage.top },
      frontRight: { x: cage.left, y: cage.bottom },
      backLeft: { x: cage.backLeft, y: cage.backTop },
      backRight: { x: cage.backLeft, y: cage.backBottom },
    },
    12,
    8,
    0.55
  );

  drawQuadGrid(
    ctx,
    {
      frontLeft: { x: cage.right, y: cage.top },
      frontRight: { x: cage.right, y: cage.bottom },
      backLeft: { x: cage.backRight, y: cage.backTop },
      backRight: { x: cage.backRight, y: cage.backBottom },
    },
    12,
    8,
    0.55
  );

  ctx.save();
  ctx.globalAlpha = 0.28;
  ctx.strokeStyle = "#f8fbf0";
  ctx.lineWidth = Math.max(1, bounds.width * 0.001);
  for (var row = 0; row < 9; row += 1) {
    var y = mix(cage.backTop, cage.backBottom, row / 8);
    ctx.beginPath();
    ctx.moveTo(cage.backLeft, y);
    ctx.lineTo(cage.backRight, y);
    ctx.stroke();
  }
  for (var col = 0; col < 16; col += 1) {
    var x = mix(cage.backLeft, cage.backRight, col / 15);
    ctx.beginPath();
    ctx.moveTo(x, cage.backTop);
    ctx.lineTo(x, cage.backBottom);
    ctx.stroke();
  }
  ctx.restore();

  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,0.26)";
  ctx.shadowBlur = h * 0.018;
  ctx.shadowOffsetY = h * 0.012;
  ctx.lineWidth = cage.post;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.strokeStyle = "#edf1e8";
  ctx.beginPath();
  ctx.moveTo(cage.left, cage.bottom);
  ctx.lineTo(cage.left, cage.top);
  ctx.lineTo(cage.right, cage.top);
  ctx.lineTo(cage.right, cage.bottom);
  ctx.stroke();

  ctx.shadowColor = "transparent";
  ctx.lineWidth = Math.max(2, cage.post * 0.13);
  ctx.strokeStyle = "rgba(92,100,91,0.42)";
  ctx.beginPath();
  ctx.moveTo(cage.left + cage.post * 0.24, cage.bottom - cage.post);
  ctx.lineTo(cage.left + cage.post * 0.24, cage.top + cage.post);
  ctx.moveTo(cage.right - cage.post * 0.24, cage.bottom - cage.post);
  ctx.lineTo(cage.right - cage.post * 0.24, cage.top + cage.post);
  ctx.moveTo(cage.left + cage.post, cage.top + cage.post * 0.24);
  ctx.lineTo(cage.right - cage.post, cage.top + cage.post * 0.24);
  ctx.stroke();
  ctx.restore();
}

function drawFrontFrame(ctx, bounds) {
  var cage = getCage(bounds);
  var h = bounds.height;
  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,0.34)";
  ctx.shadowBlur = h * 0.018;
  ctx.shadowOffsetY = h * 0.012;
  ctx.lineWidth = cage.post;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.strokeStyle = "#f2f4ec";
  ctx.beginPath();
  ctx.moveTo(cage.left, cage.bottom);
  ctx.lineTo(cage.left, cage.top);
  ctx.lineTo(cage.right, cage.top);
  ctx.lineTo(cage.right, cage.bottom);
  ctx.stroke();

  ctx.shadowColor = "transparent";
  ctx.lineWidth = Math.max(2, cage.post * 0.13);
  ctx.strokeStyle = "rgba(82,91,84,0.48)";
  ctx.beginPath();
  ctx.moveTo(cage.left + cage.post * 0.24, cage.bottom - cage.post);
  ctx.lineTo(cage.left + cage.post * 0.24, cage.top + cage.post);
  ctx.moveTo(cage.right - cage.post * 0.24, cage.bottom - cage.post);
  ctx.lineTo(cage.right - cage.post * 0.24, cage.top + cage.post);
  ctx.moveTo(cage.left + cage.post, cage.top + cage.post * 0.24);
  ctx.lineTo(cage.right - cage.post, cage.top + cage.post * 0.24);
  ctx.stroke();
  ctx.restore();
}

function drawShooter(ctx, bounds, director, state) {
  var shot = director.currentShot;
  var plan = shot?.ballPlan;
  if (!plan) return;

  var ballAtFoot = projectBall({ position: plan.position, outcome: "live" }, bounds);
  var pose = getShooterPose(director);
  var phase = director.phase === "cue" ? Math.min(1, director.phaseTime / shot.cueDuration) : 1;
  var side = pose.side;
  var approach = pose.approach;
  var strike = pose.strike;
  var follow = pose.follow;
  var scale = Math.max(0.78, Math.min(bounds.width, bounds.height) / 760);
  var rootX = ballAtFoot.x - side * (12 - approach * 8) * scale;
  var footY = ballAtFoot.y + 2 * scale;
  var bodyTilt = pose.bodyTilt;
  var hipY = -24 * scale;
  var shoulderY = -54 * scale;
  var headY = (-73 + pose.headBob) * scale;
  var plantFoot = { x: pose.plantFoot.x * scale, y: pose.plantFoot.y * scale };
  var kickFoot = { x: pose.kickFoot.x * scale, y: pose.kickFoot.y * scale };

  ctx.save();
  ctx.translate(rootX, footY);
  ctx.fillStyle = "rgba(0,0,0,0.22)";
  ctx.beginPath();
  ctx.ellipse(0, 5 * scale, 28 * scale, 5 * scale, 0, 0, Math.PI * 2);
  ctx.fill();

  if (state.running && director.phase === "cue") {
    ctx.save();
    ctx.globalAlpha = 0.22 + strike * 0.18;
    ctx.strokeStyle = "#fff5b5";
    ctx.lineWidth = Math.max(2, 2.4 * scale);
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(-side * 23 * scale, -4 * scale);
    ctx.lineTo(-side * (58 - approach * 18) * scale, 2 * scale);
    ctx.moveTo(-side * 17 * scale, -18 * scale);
    ctx.lineTo(-side * (47 - approach * 12) * scale, -20 * scale);
    ctx.stroke();
    ctx.restore();
  }

  if (state.running && director.phase === "live" && pose.motion === "follow-through") {
    ctx.save();
    ctx.globalAlpha = 0.18 + follow * 0.18;
    ctx.strokeStyle = "#fff5b5";
    ctx.lineWidth = Math.max(2, 2.6 * scale);
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(side * 8 * scale, -6 * scale);
    ctx.quadraticCurveTo(side * 32 * scale, -15 * scale, side * 54 * scale, -3 * scale);
    ctx.stroke();
    ctx.restore();
  }

  ctx.rotate(bodyTilt);

  ctx.strokeStyle = "#172126";
  ctx.lineWidth = 5.2 * scale;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.beginPath();
  ctx.moveTo(-5 * scale, hipY);
  ctx.lineTo(plantFoot.x, plantFoot.y);
  ctx.moveTo(6 * scale, hipY);
  ctx.lineTo(kickFoot.x, kickFoot.y);
  ctx.stroke();

  ctx.fillStyle = "#10191b";
  drawRoundedRect(ctx, plantFoot.x - 7 * scale, plantFoot.y - 3 * scale, 16 * scale, 6 * scale, 2.5 * scale);
  ctx.fill();
  drawRoundedRect(ctx, kickFoot.x - 7 * scale, kickFoot.y - 3 * scale, 16 * scale, 6 * scale, 2.5 * scale);
  ctx.fill();

  ctx.strokeStyle = "#f7fbf2";
  ctx.beginPath();
  ctx.moveTo(-8 * scale, shoulderY + 9 * scale);
  ctx.lineTo(pose.leftArm.x * scale, pose.leftArm.y * scale);
  ctx.moveTo(8 * scale, shoulderY + 9 * scale);
  ctx.lineTo(pose.rightArm.x * scale, pose.rightArm.y * scale);
  ctx.stroke();

  var shirt = ctx.createLinearGradient(0, shoulderY - 4 * scale, 0, hipY + 7 * scale);
  shirt.addColorStop(0, "#f7fbf2");
  shirt.addColorStop(0.62, "#e7efe7");
  shirt.addColorStop(1, "#30a86b");
  ctx.fillStyle = shirt;
  ctx.strokeStyle = "rgba(24,35,37,0.42)";
  ctx.lineWidth = Math.max(1, 1.4 * scale);
  drawRoundedRect(ctx, -12 * scale, shoulderY, 24 * scale, 34 * scale, 7 * scale);
  ctx.fill();
  ctx.stroke();

  ctx.save();
  ctx.font = "900 " + 11 * scale + "px system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = "rgba(24,35,37,0.72)";
  ctx.fillText("9", 0, shoulderY + 16 * scale);
  ctx.restore();

  ctx.fillStyle = "rgba(21,35,31,0.9)";
  drawRoundedRect(ctx, -8 * scale, hipY + 8 * scale, 16 * scale, 15 * scale, 5 * scale);
  ctx.fill();

  ctx.fillStyle = "#f07935";
  drawRoundedRect(ctx, -5 * scale, shoulderY + 4 * scale, 10 * scale, 14 * scale, 3 * scale);
  ctx.fill();

  ctx.fillStyle = "#2b211e";
  ctx.beginPath();
  ctx.arc(0, headY, 8 * scale, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "rgba(255,255,255,0.18)";
  ctx.beginPath();
  ctx.arc(-3 * scale, headY - 3 * scale, 3 * scale, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  if (director.phase === "cue" && !state.ended) {
    var ballRadius = Math.max(4.2, ballAtFoot.radius + 1.4 + strike * 0.8);
    drawBallShape(ctx, ballAtFoot.x, ballAtFoot.y, ballRadius, phase * side * 2.2);
  }
}

function drawBallShape(ctx, x, y, radius, rotation) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rotation || 0);
  ctx.shadowColor = "rgba(0,0,0,0.28)";
  ctx.shadowBlur = radius * 0.38;
  ctx.shadowOffsetY = radius * 0.18;

  var gradient = ctx.createRadialGradient(-radius * 0.42, -radius * 0.42, radius * 0.08, 0, 0, radius);
  gradient.addColorStop(0, "#ffffff");
  gradient.addColorStop(0.48, "#f8faf3");
  gradient.addColorStop(1, "#b9c3bc");
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(0, 0, radius, 0, Math.PI * 2);
  ctx.fill();

  ctx.shadowColor = "transparent";
  ctx.save();
  ctx.beginPath();
  ctx.arc(0, 0, radius * 0.96, 0, Math.PI * 2);
  ctx.clip();

  ctx.strokeStyle = "rgba(18,31,36,0.42)";
  ctx.lineWidth = Math.max(1, radius * 0.042);
  for (var seam = 0; seam < 5; seam += 1) {
    var seamAngle = -Math.PI / 2 + seam * ((Math.PI * 2) / 5);
    ctx.beginPath();
    ctx.moveTo(Math.cos(seamAngle) * radius * 0.28, Math.sin(seamAngle) * radius * 0.28);
    ctx.quadraticCurveTo(
      Math.cos(seamAngle + 0.34) * radius * 0.54,
      Math.sin(seamAngle + 0.34) * radius * 0.54,
      Math.cos(seamAngle + 0.78) * radius * 0.76,
      Math.sin(seamAngle + 0.78) * radius * 0.76
    );
    ctx.stroke();
  }

  ctx.fillStyle = "#18252b";
  ctx.beginPath();
  for (var p = 0; p < 5; p += 1) {
    var angle = -Math.PI / 2 + p * ((Math.PI * 2) / 5);
    var px = Math.cos(angle) * radius * 0.2;
    var py = Math.sin(angle) * radius * 0.2;
    if (p === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fill();

  for (var panel = 0; panel < 5; panel += 1) {
    var a = -Math.PI / 2 + panel * ((Math.PI * 2) / 5);
    var cx = Math.cos(a) * radius * 0.58;
    var cy = Math.sin(a) * radius * 0.58;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(a + Math.PI / 2);
    ctx.fillStyle = panel % 2 === 0 ? "#22323a" : "#f07135";
    ctx.beginPath();
    ctx.ellipse(0, 0, radius * 0.16, radius * 0.09, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  ctx.restore();

  ctx.strokeStyle = "rgba(255,255,255,0.72)";
  ctx.lineWidth = Math.max(1, radius * 0.04);
  ctx.beginPath();
  ctx.arc(-radius * 0.25, -radius * 0.28, radius * 0.25, 0, Math.PI * 1.4);
  ctx.stroke();
  ctx.restore();
}

function drawBallTrail(ctx, projected, ball, bounds) {
  var toFarX = bounds.width * 0.5 - projected.x;
  var toFarY = bounds.height * 0.45 - projected.y;
  var length = Math.max(1, Math.hypot(toFarX, toFarY));
  var ux = toFarX / length;
  var uy = toFarY / length;
  var stretch = projected.radius * (1.8 + projected.depth * 4.4);
  var trailStyle = getBallTrailStyle(ball);
  ctx.save();
  ctx.lineCap = "round";
  ctx.strokeStyle = trailStyle.strokeStyle;
  for (var i = 0; i < 4; i += 1) {
    var offset = (i - 1.5) * projected.radius * 0.18;
    ctx.globalAlpha = 0.42 - i * 0.075;
    ctx.lineWidth = Math.max(2, projected.radius * (ball.outcome === "deflected" ? 0.13 - i * 0.012 : 0.11 - i * 0.012));
    ctx.beginPath();
    ctx.moveTo(projected.x + offset, projected.y + offset * 0.3);
    ctx.lineTo(
      projected.x + ux * stretch * (ball.outcome === "deflected" ? 1.28 : 1) * (1 + i * 0.22),
      projected.y + uy * stretch * (ball.outcome === "deflected" ? 1.28 : 1) * (1 + i * 0.22)
    );
    ctx.stroke();
  }
  ctx.restore();
}

function drawBall(ctx, ball, bounds) {
  if (!ball) return;
  var projected = projectBall(ball, bounds);
  ctx.save();
  if (ball.outcome !== "conceded") {
    ctx.globalAlpha = 0.22 + projected.depth * 0.16;
    ctx.fillStyle = "rgba(0,0,0,0.34)";
    ctx.beginPath();
    ctx.ellipse(
      projected.x,
      projected.y + projected.radius * (0.9 + projected.depth * 0.4),
      projected.radius * 0.76,
      projected.radius * 0.22,
      0,
      0,
      Math.PI * 2
    );
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  if (getBallTrailStyle(ball).visible) {
    drawBallTrail(ctx, projected, ball, bounds);
  }
  ctx.globalAlpha = projected.alpha;
  drawBallShape(ctx, projected.x, projected.y, projected.radius, ball.spinAngle);
  ctx.restore();
}

function drawNetPocket(ctx, ball, bounds) {
  var pocket = getNetPocketStyle(ball, bounds);
  if (!pocket.visible) return;

  var tension = pocket.tension;
  var width = pocket.radius * (3.4 + tension * 2.2);
  var height = pocket.radius * (2.1 + tension * 1.3);
  var pull = pocket.radius * (0.52 + tension * 0.84);
  ctx.save();
  ctx.translate(pocket.x, pocket.y);
  ctx.globalAlpha = 0.2 + tension * 0.38;
  ctx.strokeStyle = "rgba(255,250,220,0.92)";
  ctx.lineWidth = Math.max(1.2, bounds.width * (0.0011 + tension * 0.0008));
  ctx.lineCap = "round";

  for (var row = -4; row <= 4; row += 1) {
    var y = (row / 4) * height * 0.5;
    ctx.beginPath();
    ctx.moveTo(-width * 0.5, y);
    ctx.quadraticCurveTo(-width * 0.12, y + pull * Math.sin(row * 0.8) * 0.16, 0, y + pull);
    ctx.quadraticCurveTo(width * 0.12, y + pull * Math.cos(row * 0.7) * 0.14, width * 0.5, y);
    ctx.stroke();
  }

  for (var column = -4; column <= 4; column += 1) {
    var x = (column / 4) * width * 0.5;
    ctx.beginPath();
    ctx.moveTo(x, -height * 0.5);
    ctx.quadraticCurveTo(x + pull * Math.sin(column * 0.7) * 0.15, -height * 0.08, x * 0.42, pull);
    ctx.quadraticCurveTo(x - pull * Math.cos(column * 0.9) * 0.12, height * 0.16, x, height * 0.5);
    ctx.stroke();
  }

  ctx.globalAlpha = 0.14 + tension * 0.18;
  ctx.fillStyle = "rgba(10,18,16,0.42)";
  ctx.beginPath();
  ctx.ellipse(0, pull * 0.8, width * 0.36, height * 0.32, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawForearm(ctx, glove, bounds, impact) {
  var side = glove.side === "left" ? -1 : 1;
  var bottomY = bounds.height + glove.radius * 0.72;
  var wristY = glove.y + glove.radius * 0.46;
  var wristX = glove.x - side * glove.radius * 0.05;
  var baseX = glove.x - side * glove.radius * 0.38;
  ctx.save();
  ctx.globalAlpha = 0.98;
  var sleeve = ctx.createLinearGradient(baseX, bottomY, wristX, wristY);
  sleeve.addColorStop(0, "#163a32");
  sleeve.addColorStop(0.55, "#1e6a55");
  sleeve.addColorStop(1, impact ? "#32a988" : "#239071");
  ctx.fillStyle = sleeve;
  ctx.strokeStyle = "rgba(10,22,20,0.42)";
  ctx.lineWidth = Math.max(1.5, glove.radius * 0.035);
  ctx.beginPath();
  ctx.moveTo(baseX - side * glove.radius * 0.24, bottomY);
  ctx.quadraticCurveTo(glove.x - side * glove.radius * 0.32, glove.y + glove.radius * 1.1, wristX - side * glove.radius * 0.24, wristY);
  ctx.lineTo(wristX + side * glove.radius * 0.22, wristY + glove.radius * 0.04);
  ctx.quadraticCurveTo(glove.x + side * glove.radius * 0.12, glove.y + glove.radius * 1.2, baseX + side * glove.radius * 0.36, bottomY);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

function drawGlove(ctx, glove, impact) {
  var r = glove.radius;
  var side = glove.side === "left" ? -1 : 1;
  var impactAge = impact ? impact.age : 0;
  var compression = impact ? impact.compression || 0.2 : 0;
  var squash = impact ? Math.max(0.78, 1 - compression * Math.max(0.18, 1 - impactAge * 2.3)) : 1;
  var flare = impact ? 1 + compression * Math.max(0.08, 0.22 - impactAge * 0.26) : 1;
  ctx.save();
  ctx.translate(glove.x, glove.y);
  ctx.rotate(side * 0.055 + (impact ? -side * compression * 0.08 : 0));
  ctx.scale(flare, squash);

  ctx.fillStyle = "rgba(0,0,0,0.18)";
  ctx.beginPath();
  ctx.ellipse(0, r * 0.67, r * 0.72, r * 0.15, 0, 0, Math.PI * 2);
  ctx.fill();

  if (impact) {
    ctx.save();
    ctx.globalAlpha = Math.max(0, 0.32 - impactAge * 0.7);
    ctx.strokeStyle = "#fff6b2";
    ctx.lineWidth = Math.max(2, r * 0.045);
    ctx.beginPath();
    ctx.arc(0, -r * 0.05, r * (0.74 + compression * 0.2), 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  var shell = ctx.createLinearGradient(-r * 0.52, -r, r * 0.5, r * 0.7);
  shell.addColorStop(0, "#ffffff");
  shell.addColorStop(0.58, "#f2f5ee");
  shell.addColorStop(1, "#c4cec8");
  ctx.fillStyle = shell;
  ctx.strokeStyle = "rgba(46,55,57,0.42)";
  ctx.lineWidth = Math.max(1.4, r * 0.038);
  ctx.lineJoin = "round";

  for (var i = 0; i < 4; i += 1) {
    var fingerX = -r * 0.38 + i * r * 0.25;
    var fingerH = r * (0.83 + (i === 1 || i === 2 ? 0.08 : 0));
    drawRoundedRect(ctx, fingerX, -r * 0.94, r * 0.2, fingerH, r * 0.1);
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = "rgba(28,39,42,0.34)";
    ctx.lineWidth = Math.max(1, r * 0.018);
    ctx.beginPath();
    ctx.moveTo(fingerX + r * 0.1, -r * 0.84);
    ctx.lineTo(fingerX + r * 0.1, -r * 0.18);
    ctx.stroke();
    ctx.strokeStyle = "rgba(46,55,57,0.42)";
    ctx.lineWidth = Math.max(1.4, r * 0.038);
    ctx.fillStyle = shell;
  }

  ctx.save();
  ctx.translate(side * r * 0.43, -r * 0.11);
  ctx.rotate(-side * 0.52);
  drawRoundedRect(ctx, -r * 0.09, -r * 0.05, r * 0.2, r * 0.68, r * 0.1);
  ctx.fill();
  ctx.stroke();
  ctx.restore();

  drawRoundedRect(ctx, -r * 0.46, -r * 0.34, r * 0.92, r * 0.92, r * 0.23);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = "#e7eee8";
  ctx.strokeStyle = "rgba(36,43,45,0.38)";
  ctx.lineWidth = Math.max(1.2, r * 0.032);
  ctx.beginPath();
  ctx.moveTo(-r * 0.28, -r * 0.2);
  ctx.quadraticCurveTo(-r * 0.1, -r * 0.05, -r * 0.24, r * 0.16);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(r * 0.28, -r * 0.2);
  ctx.quadraticCurveTo(r * 0.1, -r * 0.05, r * 0.24, r * 0.16);
  ctx.stroke();

  var palm = ctx.createLinearGradient(0, -r * 0.12, 0, r * 0.5);
  palm.addColorStop(0, "#fdfef9");
  palm.addColorStop(1, "#dce7df");
  ctx.fillStyle = palm;
  drawRoundedRect(ctx, -r * 0.29, r * 0.03, r * 0.58, r * 0.34, r * 0.12);
  ctx.fill();

  ctx.strokeStyle = "rgba(42,57,54,0.22)";
  ctx.lineWidth = Math.max(1, r * 0.018);
  for (var grip = -2; grip <= 2; grip += 1) {
    ctx.beginPath();
    ctx.moveTo(-r * 0.2, r * (0.12 + grip * 0.045));
    ctx.quadraticCurveTo(0, r * (0.08 + grip * 0.045), r * 0.2, r * (0.12 + grip * 0.045));
    ctx.stroke();
  }

  ctx.fillStyle = "#e8753b";
  drawRoundedRect(ctx, -r * 0.36, r * 0.4, r * 0.72, r * 0.18, r * 0.07);
  ctx.fill();
  ctx.fillStyle = "#272b2c";
  drawRoundedRect(ctx, -r * 0.23, r * 0.445, r * 0.46, r * 0.04, r * 0.02);
  ctx.fill();
  ctx.restore();
}

function drawGloves(ctx, gloves, bounds, effects) {
  var projectedGloves = getProjectedGloves(gloves, bounds);
  projectedGloves.forEach(function eachForearm(glove) {
    var sideImpact = effects.find(function findImpact(effect) {
      return effect.type === "impact" && effect.side === glove.side;
    });
    drawForearm(ctx, glove, bounds, sideImpact);
  });
  projectedGloves.forEach(function eachGlove(glove) {
    var sideImpact = effects.find(function findImpact(effect) {
      return effect.type === "impact" && effect.side === glove.side;
    });
    drawGlove(ctx, glove, sideImpact);
  });
}

function drawEffects(ctx, effects, bounds) {
  effects.forEach(function eachEffect(effect) {
    if (effect.type === "impact") {
      ctx.save();
      var strength = Math.min(1, (effect.strength || 28) / 110);
      var compression = effect.compression || 0.22;
      ctx.globalAlpha = Math.max(0, 1 - effect.age / 0.48);
      ctx.strokeStyle = "#fff3a6";
      ctx.lineWidth = Math.max(3, bounds.width * (0.0032 + strength * 0.0024));
      ctx.translate(effect.x, effect.y);
      ctx.beginPath();
      ctx.ellipse(0, 0, 34 + effect.age * 260 * (0.7 + strength), 19 + effect.age * 140 * (0.7 + compression), 0, 0, Math.PI * 2);
      ctx.stroke();
      for (var i = 0; i < 10; i += 1) {
        var angle = (i / 10) * Math.PI * 2 + (effect.spinKick || 0) * 0.08;
        ctx.beginPath();
        ctx.moveTo(Math.cos(angle) * 12, Math.sin(angle) * 9);
        ctx.lineTo(Math.cos(angle) * (42 + effect.age * 120), Math.sin(angle) * (30 + effect.age * 92));
        ctx.stroke();
      }
      ctx.fillStyle = "rgba(255,255,255,0.32)";
      ctx.beginPath();
      ctx.arc(0, 0, 10 + compression * 18, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    if (effect.type === "net") {
      ctx.save();
      var alpha = Math.max(0, 1 - effect.age / 1.18);
      ctx.globalAlpha = alpha;
      ctx.strokeStyle = "#fff8d4";
      ctx.lineWidth = Math.max(2, bounds.width * 0.0024);
      ctx.translate(effect.x, effect.y);
      var pulse = effect.radius + effect.age * bounds.height * 0.28;
      ctx.beginPath();
      ctx.ellipse(0, 0, pulse * 1.75, pulse * 0.88, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.strokeStyle = "rgba(255,255,255,0.72)";
      for (var line = -3; line <= 3; line += 1) {
        ctx.beginPath();
        ctx.moveTo(-pulse * 1.35, line * pulse * 0.28);
        ctx.quadraticCurveTo(0, line * pulse * 0.28 + Math.sin(effect.age * 18 + line) * 22, pulse * 1.35, line * pulse * 0.28);
        ctx.stroke();
      }
      ctx.strokeStyle = "rgba(255,243,166,0.58)";
      for (var column = -3; column <= 3; column += 1) {
        ctx.beginPath();
        ctx.moveTo(column * pulse * 0.36, -pulse * 0.78);
        ctx.quadraticCurveTo(column * pulse * 0.36 + Math.cos(effect.age * 16 + column) * 20, 0, column * pulse * 0.36, pulse * 0.78);
        ctx.stroke();
      }
      ctx.restore();
    }

    if (effect.type === "text") {
      ctx.save();
      var textDuration = effect.kind === "goal" ? 1.18 : 0.8;
      ctx.globalAlpha = Math.max(0, 1 - effect.age / textDuration);
      ctx.font = "900 " + Math.max(22, bounds.width * 0.028) + "px system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.fillStyle = effect.kind === "save" ? "#fff3a6" : "#ffb06b";
      ctx.shadowColor = "rgba(0,0,0,0.42)";
      ctx.shadowBlur = 10;
      ctx.fillText(effect.text, bounds.width / 2, bounds.height * 0.24 - effect.age * 30);
      ctx.restore();
    }
  });
}

export function renderFrame(ctx, snapshot) {
  var bounds = snapshot.bounds;
  ctx.clearRect(0, 0, bounds.width, bounds.height);
  var activeImpact = getActiveImpact(snapshot.effects);
  var shakeStrength = activeImpact ? Math.max(0, 1 - activeImpact.age / 0.32) * Math.min(8, (activeImpact.strength || 30) * 0.055) : 0;
  ctx.save();
  if (shakeStrength > 0) {
    ctx.translate(Math.sin(activeImpact.age * 94) * shakeStrength, Math.cos(activeImpact.age * 71) * shakeStrength * 0.72);
  }
  drawBackground(ctx, bounds);
  drawField(ctx, bounds);
  drawGoalCage(ctx, bounds);
  drawShooter(ctx, bounds, snapshot.director, snapshot.state);
  drawNetPocket(ctx, snapshot.ball, bounds);
  drawBall(ctx, snapshot.ball, bounds);
  drawEffects(ctx, snapshot.effects, bounds);
  drawGloves(ctx, snapshot.gloves, bounds, snapshot.effects);
  drawFrontFrame(ctx, bounds);
  ctx.restore();

  if (snapshot.state.paused) {
    ctx.save();
    ctx.fillStyle = "rgba(22,28,26,0.42)";
    ctx.fillRect(0, 0, bounds.width, bounds.height);
    ctx.font = "900 " + Math.max(34, bounds.width * 0.045) + "px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.fillStyle = "#f8fbf0";
    ctx.fillText("暂停", bounds.width / 2, bounds.height / 2);
    ctx.restore();
  }
}
