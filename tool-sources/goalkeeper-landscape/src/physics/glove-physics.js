import { FIELD, GLOVES } from "../config/game-config.js";
import { clamp, dot3, length3, normalize3, subtract3 } from "../math/vector.js";

function screenToWorld(pointer, bounds) {
  var width = bounds.width || 1280;
  var height = bounds.height || 720;
  var x = (pointer.x / width - 0.5) * FIELD.goalHalfWidth * 2.2;
  var y = (1 - pointer.y / height) * FIELD.goalHeight * 1.28 + 0.18;
  return {
    x: clamp(x, -FIELD.goalHalfWidth * 1.05, FIELD.goalHalfWidth * 1.05),
    y: clamp(y, 0.22, FIELD.goalHeight + 0.54),
    z: FIELD.keeperPlaneZ,
  };
}

function createBodies(center, velocity) {
  var spread = GLOVES.spread;
  return [
    ...createGloveBodyParts("left", { x: center.x - spread, y: center.y, z: center.z }, velocity),
    ...createGloveBodyParts("right", { x: center.x + spread, y: center.y, z: center.z }, velocity),
  ];
}

function createGloveBodyParts(sideName, palmCenter, velocity) {
  var side = sideName === "left" ? -1 : 1;
  var parts = [
    {
      part: "palm",
      center: { x: palmCenter.x, y: palmCenter.y, z: palmCenter.z },
      radius: 0.43,
    },
    {
      part: "thumb",
      center: { x: palmCenter.x + side * 0.34, y: palmCenter.y + 0.02, z: palmCenter.z },
      radius: 0.24,
    },
    {
      part: "wrist",
      center: { x: palmCenter.x - side * 0.05, y: palmCenter.y - 0.36, z: palmCenter.z },
      radius: 0.3,
    },
  ];
  [-0.24, -0.08, 0.08, 0.24].forEach(function addFinger(offset, index) {
    parts.push({
      part: "finger",
      fingerIndex: index,
      center: { x: palmCenter.x + offset, y: palmCenter.y + 0.34, z: palmCenter.z },
      radius: index === 1 || index === 2 ? 0.22 : 0.2,
    });
  });
  return parts.map(function withSharedFields(part) {
    return {
      ...part,
      side: sideName,
      palmCenter: { ...palmCenter },
      velocity: { ...velocity },
    };
  });
}

function closestPointOnSegment(point, start, end) {
  var segment = subtract3(end, start);
  var pointFromStart = subtract3(point, start);
  var lengthSquared = dot3(segment, segment);
  var t = lengthSquared === 0 ? 1 : clamp(dot3(pointFromStart, segment) / lengthSquared, 0, 1);
  return {
    t: t,
    point: {
      x: start.x + segment.x * t,
      y: start.y + segment.y * t,
      z: start.z + segment.z * t,
    },
  };
}

function interpolate3(start, end, t) {
  return {
    x: start.x + (end.x - start.x) * t,
    y: start.y + (end.y - start.y) * t,
    z: start.z + (end.z - start.z) * t,
  };
}

function getPreviousBody(body, gloves) {
  var sideOffset = body.side === "left" ? -GLOVES.spread : GLOVES.spread;
  var previousCenter = gloves.previousCenter || gloves.center;
  var palmCenter = {
    x: previousCenter.x + sideOffset,
    y: previousCenter.y,
    z: FIELD.keeperPlaneZ,
  };
  var offsetFromPalm = body.palmCenter
    ? {
        x: body.center.x - body.palmCenter.x,
        y: body.center.y - body.palmCenter.y,
        z: body.center.z - body.palmCenter.z,
      }
    : { x: 0, y: 0, z: 0 };
  return {
    ...body,
    center: {
      x: palmCenter.x + offsetFromPalm.x,
      y: palmCenter.y + offsetFromPalm.y,
      z: palmCenter.z + offsetFromPalm.z,
    },
    palmCenter: palmCenter,
  };
}

function closestMovingContact(previousBall, ball, previousBody, body) {
  var best = null;
  for (var i = 0; i <= 8; i += 1) {
    var t = i / 8;
    var ballPoint = interpolate3(previousBall.position, ball.position, t);
    var bodyPoint = interpolate3(previousBody.center, body.center, t);
    var delta = subtract3(ballPoint, bodyPoint);
    var distance = length3(delta);
    if (!best || distance < best.distance) {
      best = {
        t: t,
        ballPoint: ballPoint,
        bodyPoint: bodyPoint,
        delta: delta,
        distance: distance,
      };
    }
  }
  return best;
}

export function createGloves() {
  var center = { x: 0, y: GLOVES.baseY, z: FIELD.keeperPlaneZ };
  var velocity = { x: 0, y: 0, z: 0 };
  return {
    center: center,
    previousCenter: { ...center },
    velocity: velocity,
    inputMode: "mouse",
    impact: null,
    bodies: createBodies(center, velocity),
  };
}

export function updateGloves(gloves, pointer, dt, bounds) {
  var inputMode = bounds.inputMode || gloves.inputMode || "mouse";
  var target = screenToWorld(pointer, bounds);
  var smoothing = inputMode === "touch" ? GLOVES.touchSmoothing : GLOVES.mouseSmoothing;
  var maxSpeed = inputMode === "touch" ? GLOVES.maxSpeedTouch : GLOVES.maxSpeedMouse;
  var previous = gloves.center;
  var raw = {
    x: previous.x + (target.x - previous.x) * (1 - smoothing),
    y: previous.y + (target.y - previous.y) * (1 - smoothing),
    z: FIELD.keeperPlaneZ,
  };
  var dx = raw.x - previous.x;
  var dy = raw.y - previous.y;
  var distance = Math.hypot(dx, dy);
  var maxDistance = maxSpeed * Math.max(dt, 1 / 120);
  var center = raw;
  if (distance > maxDistance) {
    var ratio = maxDistance / distance;
    center = {
      x: previous.x + dx * ratio,
      y: previous.y + dy * ratio,
      z: FIELD.keeperPlaneZ,
    };
  }
  var safeDt = Math.max(dt, 1 / 120);
  var velocity = {
    x: (center.x - previous.x) / safeDt,
    y: (center.y - previous.y) / safeDt,
    z: 0,
  };

  return {
    center: center,
    previousCenter: previous,
    velocity: velocity,
    inputMode: inputMode,
    impact: null,
    bodies: createBodies(center, velocity),
  };
}

export function resolveGloveCollision(ball, gloves, previousBall) {
  if (ball.outcome !== "live") {
    return { hit: false, ball: ball, contact: null };
  }

  var best = null;
  var hasPreviousBall = previousBall?.position && previousBall.outcome !== "conceded";
  gloves.bodies.forEach(function eachBody(body) {
    var delta = subtract3(ball.position, body.center);
    var distance = length3(delta);
    var limit = body.radius + ball.radius;
    if (distance <= limit && (!best || distance < best.distance)) {
      best = {
        body: body,
        delta: delta,
        distance: distance,
        limit: limit,
        contactPoint: ball.position,
        swept: false,
      };
    }

    if (hasPreviousBall) {
      var closest = closestPointOnSegment(body.center, previousBall.position, ball.position);
      var sweptDelta = subtract3(closest.point, body.center);
      var sweptDistance = length3(sweptDelta);
      if (sweptDistance <= limit && (!best || sweptDistance < best.distance)) {
        best = {
          body: body,
          delta: sweptDelta,
          distance: sweptDistance,
          limit: limit,
          contactPoint: closest.point,
          swept: true,
          t: closest.t,
        };
      }

      var previousBody = getPreviousBody(body, gloves);
      var moving = closestMovingContact(previousBall, ball, previousBody, body);
      if (moving.distance <= limit && (!best || moving.distance < best.distance)) {
        best = {
          body: {
            ...body,
            center: moving.bodyPoint,
          },
          delta: moving.delta,
          distance: moving.distance,
          limit: limit,
          contactPoint: moving.ballPoint,
          swept: true,
          movingGlove: true,
          t: moving.t,
        };
      }
    }
  });

  if (!best) return { hit: false, ball: ball, contact: null };

  var fallbackNormal = hasPreviousBall ? subtract3(previousBall.position, best.body.center) : { x: 0, y: 0, z: 1 };
  var normal = normalize3(best.distance === 0 ? fallbackNormal : best.delta);
  if (normal.z < 0.08 && hasPreviousBall && previousBall.position.z > best.body.center.z) {
    normal = normalize3({
      x: normal.x * 0.35,
      y: normal.y * 0.35,
      z: Math.max(0.42, Math.abs(normal.z)),
    });
  }
  var bodyVelocity = {
    x: best.body.velocity.x,
    y: best.body.velocity.y,
    z: 1.8,
  };
  var relativeVelocity = {
    x: ball.velocity.x - bodyVelocity.x,
    y: ball.velocity.y - bodyVelocity.y,
    z: ball.velocity.z - bodyVelocity.z,
  };
  var closingSpeed = Math.min(0, dot3(relativeVelocity, normal));
  var impulse = -(1 + GLOVES.restitution) * closingSpeed;
  var slapBonus = Math.min(13, Math.hypot(bodyVelocity.x, bodyVelocity.y) * 0.42);
  var lateralTransfer = best.movingGlove ? 1.08 : 0.38;
  var verticalTransfer = best.movingGlove ? 0.46 : 0.32;
  var partMultiplier = best.body.part === "finger" ? 0.9 : best.body.part === "thumb" ? 0.86 : best.body.part === "wrist" ? 0.76 : 1;
  var reflected = {
    x: ball.velocity.x + normal.x * impulse * partMultiplier + bodyVelocity.x * lateralTransfer,
    y: ball.velocity.y + normal.y * impulse * partMultiplier + bodyVelocity.y * verticalTransfer,
    z: Math.abs(ball.velocity.z + normal.z * impulse * partMultiplier) + 7 + slapBonus,
  };
  reflected.x *= 1 - GLOVES.friction;
  reflected.y *= 1 - GLOVES.absorption;
  var tangentialSpin = (bodyVelocity.x * normal.y - bodyVelocity.y * normal.x) * 0.34 + bodyVelocity.x * 0.18 - bodyVelocity.y * 0.08;
  var faceSpin = normal.x * Math.abs(ball.velocity.z) * 0.045;
  var spinKick = clamp(tangentialSpin + faceSpin, -8, 8);
  var reboundSpeed = Math.hypot(reflected.x, reflected.y, reflected.z);
  var compression = clamp((impulse + slapBonus) / 112, 0.16, 1);

  var correctedPosition = {
    x: best.body.center.x + normal.x * (best.limit + 0.02),
    y: best.body.center.y + normal.y * (best.limit + 0.02),
    z: best.body.center.z + normal.z * (best.limit + 0.02),
  };
  var nextBall = {
    ...ball,
    position: correctedPosition,
    velocity: reflected,
    outcome: "deflected",
    spin: ball.spin + spinKick,
    lastContact: {
      side: best.body.side,
      part: best.body.part || "palm",
      normal: normal,
      strength: impulse + slapBonus,
      compression: compression,
      reboundSpeed: reboundSpeed,
      spinKick: spinKick,
      point: best.contactPoint,
      swept: best.swept,
      movingGlove: best.movingGlove || false,
      t: best.t ?? 1,
    },
  };

  return {
    hit: true,
    ball: nextBall,
    contact: nextBall.lastContact,
  };
}

export function getProjectedGloves(gloves, bounds) {
  var width = bounds.width || 1280;
  var height = bounds.height || 720;
  return ["left", "right"].map(function projectBody(sideName) {
    var sideOffset = sideName === "left" ? -GLOVES.spread : GLOVES.spread;
    var center = {
      x: gloves.center.x + sideOffset,
      y: gloves.center.y,
      z: FIELD.keeperPlaneZ,
    };
    return {
      side: sideName,
      x: width * (center.x / (FIELD.goalHalfWidth * 2.2) + 0.5),
      y: height * (1 - (center.y - 0.18) / (FIELD.goalHeight * 1.28)),
      radius: Math.max(30, Math.min(width, height) * 0.054),
    };
  });
}
