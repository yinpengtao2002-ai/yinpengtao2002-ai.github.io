import { BALL, FIELD } from "../config/game-config.js";
import { clamp, lerp } from "../math/vector.js";

export function createBall(options) {
  return {
    position: { ...options.position },
    velocity: { ...options.velocity },
    curve: options.curve || 0,
    spin: options.spin || 0,
    spinAngle: options.spinAngle || 0,
    radius: options.radius || BALL.radius,
    age: options.age || 0,
    goalAge: options.goalAge || 0,
    saveAge: options.saveAge || 0,
    netContactAge: typeof options.netContactAge === "number" ? options.netContactAge : null,
    outcome: options.outcome || "live",
    lastContact: null,
  };
}

export function integrateBall(ball, dt) {
  var damping = Math.pow(BALL.airDamping, Math.max(1, dt * 60));
  var isGoalReplay = ball.outcome === "conceded";
  var isSaveReplay = ball.outcome === "saved";
  var isNetTrapped = isGoalReplay && typeof ball.netContactAge === "number";
  var curveAcceleration = ball.curve * BALL.curveScale * (isGoalReplay ? 0.28 : 1);
  var gravity = BALL.gravity * (isNetTrapped ? 0.12 : isGoalReplay ? 0.44 : 1);
  var velocity = {
    x: (ball.velocity.x + curveAcceleration * dt) * damping * (isNetTrapped ? 0.955 : 1),
    y: (ball.velocity.y + gravity * dt) * damping * (isNetTrapped ? 0.945 : 1),
    z: ball.velocity.z * damping * (isNetTrapped ? 0.965 : 1),
  };
  var next = {
    ...ball,
    age: ball.age + dt,
    goalAge: isGoalReplay ? (ball.goalAge || 0) + dt : ball.goalAge || 0,
    saveAge: isSaveReplay ? (ball.saveAge || 0) + dt : ball.saveAge || 0,
    netContactAge: isNetTrapped ? ball.netContactAge + dt : ball.netContactAge,
    spinAngle: ball.spinAngle + ball.spin * dt,
    velocity: velocity,
    position: {
      x: ball.position.x + velocity.x * dt,
      y: ball.position.y + velocity.y * dt,
      z: ball.position.z + velocity.z * dt,
    },
    lastContact: isGoalReplay ? null : ball.lastContact,
  };

  if (isNetTrapped) {
    var pocketFrontZ = FIELD.backNetZ + 1.28;
    next = {
      ...next,
      position: {
        ...next.position,
        y: Math.max(0.42, next.position.y),
        z: Math.min(pocketFrontZ, Math.max(FIELD.backNetZ - 0.04, next.position.z)),
      },
      velocity: {
        x: next.velocity.x * 0.92,
        y: Math.max(-0.32, next.velocity.y * 0.86),
        z: next.position.z >= pocketFrontZ ? Math.min(0.08, next.velocity.z * 0.16) : Math.min(1.05, next.velocity.z),
      },
      spin: next.spin * 0.985,
    };
  }

  if (isGoalReplay && next.position.z <= FIELD.backNetZ && next.velocity.z < 0) {
    var netStrength = Math.abs(next.velocity.z);
    next = {
      ...next,
      position: {
        ...next.position,
        z: FIELD.backNetZ,
      },
      velocity: {
        x: next.velocity.x * 0.22,
        y: Math.max(-0.34, next.velocity.y * 0.18),
        z: Math.min(1.05, Math.abs(next.velocity.z) * 0.035),
      },
      spin: next.spin * 0.72,
      netContactAge: 0,
      lastContact: {
        type: "back-net",
        strength: netStrength,
      },
    };
  }

  return next;
}

export function didBallEnterGoal(ball) {
  return (
    ball.outcome === "live" &&
    ball.position.z <= FIELD.goalPlaneZ &&
    isInsideGoalMouth(ball.position)
  );
}

function isInsideGoalMouth(position) {
  return Math.abs(position.x) <= FIELD.goalHalfWidth && position.y >= 0 && position.y <= FIELD.goalHeight;
}

export function resolveGoalEntry(previousBall, ball) {
  if (ball.outcome !== "live") return null;
  if (!previousBall?.position || previousBall.outcome === "conceded") {
    return didBallEnterGoal(ball) ? markBallConceded(ball) : null;
  }

  var crossedGoalPlane = previousBall.position.z > FIELD.goalPlaneZ && ball.position.z <= FIELD.goalPlaneZ;
  if (!crossedGoalPlane) {
    return didBallEnterGoal(ball) ? markBallConceded(ball) : null;
  }

  var travelZ = previousBall.position.z - ball.position.z;
  var t = travelZ === 0 ? 1 : clamp((previousBall.position.z - FIELD.goalPlaneZ) / travelZ, 0, 1);
  var entryPosition = {
    x: lerp(previousBall.position.x, ball.position.x, t),
    y: lerp(previousBall.position.y, ball.position.y, t),
    z: FIELD.goalPlaneZ,
  };
  if (!isInsideGoalMouth(entryPosition)) return null;

  return markBallConceded({
    ...ball,
    age: lerp(previousBall.age || 0, ball.age || 0, t),
    position: entryPosition,
  });
}

export function markBallConceded(ball) {
  var goalDriveZ = ball.velocity.z < 0 ? Math.min(-18, ball.velocity.z * 0.48) : -18;
  return {
    ...ball,
    outcome: "conceded",
    goalAge: 0,
    netContactAge: null,
    velocity: {
      x: ball.velocity.x * 0.72,
      y: ball.velocity.y * 0.72,
      z: goalDriveZ,
    },
    curve: ball.curve * 0.24,
    lastContact: null,
  };
}

export function markBallSaved(ball) {
  return {
    ...ball,
    outcome: "saved",
    saveAge: 0,
    lastContact: ball.lastContact,
  };
}

export function didBallEscapeAfterDeflection(ball) {
  if (ball.outcome !== "deflected") return false;
  return (
    ball.position.z > FIELD.keeperPlaneZ + 6 ||
    Math.abs(ball.position.x) > FIELD.goalHalfWidth * 1.35 ||
    ball.position.y > FIELD.goalHeight + 1.2 ||
    ball.position.y < -0.8
  );
}

export function projectBall(ball, bounds) {
  var width = bounds.width || 1280;
  var height = bounds.height || 720;
  var goal = getProjectedGoal(bounds);
  var depth = clamp(1 - ball.position.z / FIELD.launchZ, 0, 1.18);
  var scale = Math.pow(depth, 1.28);
  var worldXScale = goal.width / (FIELD.goalHalfWidth * 2);
  var worldYScale = goal.height / FIELD.goalHeight;
  var perspective = clamp(Math.pow(depth, 1.05), 0, 1);
  var farX = width / 2 + ball.position.x * worldXScale * 0.18;
  var nearX = width / 2 + ball.position.x * worldXScale * (0.72 + depth * 0.34);
  var farY = height * 0.485 - ball.position.y * height * 0.09;
  var nearY = goal.bottom - ball.position.y * worldYScale * (0.82 + depth * 0.16) + depth * height * 0.09;
  var x = lerp(farX, nearX, perspective);
  var y = lerp(farY, nearY, perspective);
  var radius = clamp(BALL.minVisibleRadius + scale * 52, BALL.minVisibleRadius, BALL.maxVisibleRadius);
  if (ball.outcome === "conceded") {
    var netDepth = clamp(Math.abs(Math.min(0, ball.position.z)) / Math.abs(FIELD.backNetZ), 0, 1);
    var netAnchor = Math.pow(netDepth, 0.72) * 0.78;
    x = lerp(x, width / 2 + ball.position.x * worldXScale * 0.34, netAnchor);
    y = lerp(y, goal.y + goal.height * 0.59 - ball.position.y * worldYScale * 0.34, netAnchor);
    radius = clamp(radius - netDepth * 3.5, BALL.minVisibleRadius, BALL.maxVisibleRadius + 1);
  }

  return {
    x: x,
    y: y,
    radius: radius,
    depth: depth,
    alpha: clamp(ball.outcome === "expired" ? 0 : 1, 0, 1),
  };
}

export function getProjectedGoal(bounds) {
  var width = bounds.width || 1280;
  var height = bounds.height || 720;
  var goalWidth = width * 0.86;
  var goalHeight = height * 0.48;
  var x = (width - goalWidth) / 2;
  var y = height * 0.27;
  return {
    x: x,
    y: y,
    width: goalWidth,
    height: goalHeight,
    right: x + goalWidth,
    bottom: y + goalHeight,
  };
}
