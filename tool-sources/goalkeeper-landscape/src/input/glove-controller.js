import { clamp } from "../math/vector.js";

export const GLOVE_3D = {
  goalHalfWidth: 3.66,
  goalHeight: 2.44,
  planeZ: 3.15,
  minY: 0.08,
  maxY: 3.38,
  centerLimitX: 4.28,
  pointerWorldWidth: 2.34,
  spread: 0.3,
  colliderRadius: 0.2,
  mouseFollow: 0.76,
  touchFollow: 0.48,
  maxSpeedMouse: 30,
  maxSpeedTouch: 21,
};

function withHands(center) {
  return {
    ...center,
    left: {
      x: center.x - GLOVE_3D.spread,
      y: center.y,
      z: center.z,
    },
    right: {
      x: center.x + GLOVE_3D.spread,
      y: center.y,
      z: center.z,
    },
    spread: GLOVE_3D.spread,
    colliderRadius: GLOVE_3D.colliderRadius,
  };
}

export function mapPointerToGloveTarget(pointer, bounds) {
  var pointerWorldTarget = bounds.pointerWorldTarget;
  if (
    Number.isFinite(pointerWorldTarget?.x) &&
    Number.isFinite(pointerWorldTarget?.y)
  ) {
    return withHands({
      x: clamp(pointerWorldTarget.x, -GLOVE_3D.centerLimitX, GLOVE_3D.centerLimitX),
      y: clamp(pointerWorldTarget.y, GLOVE_3D.minY, GLOVE_3D.maxY),
      z: GLOVE_3D.planeZ,
    });
  }

  var width = bounds.width || 1280;
  var height = bounds.height || 720;
  var nx = clamp(pointer.x / width, 0, 1);
  var ny = clamp(pointer.y / height, 0, 1);
  var center = {
    x: clamp(
      (nx - 0.5) * GLOVE_3D.goalHalfWidth * GLOVE_3D.pointerWorldWidth,
      -GLOVE_3D.centerLimitX,
      GLOVE_3D.centerLimitX,
    ),
    y: clamp(GLOVE_3D.maxY - ny * (GLOVE_3D.maxY - GLOVE_3D.minY), GLOVE_3D.minY, GLOVE_3D.maxY),
    z: GLOVE_3D.planeZ,
  };
  return withHands(center);
}

export function createGloveController() {
  var center = {
    x: 0,
    y: 1.2,
    z: GLOVE_3D.planeZ,
  };
  return {
    center: center,
    previousCenter: { ...center },
    velocity: { x: 0, y: 0, z: 0 },
    inputMode: "mouse",
    target: withHands(center),
    ...withHands(center),
  };
}

export function updateGloveController(controller, pointer, dt, bounds) {
  var inputMode = bounds.inputMode || controller.inputMode || "mouse";
  var target = mapPointerToGloveTarget(pointer, bounds);
  var previous = controller.center;
  var safeDt = Math.max(dt, 1 / 120);

  if (inputMode === "touch") {
    var touchVelocity = {
      x: (target.x - previous.x) / safeDt,
      y: (target.y - previous.y) / safeDt,
      z: 0,
    };

    return {
      center: { x: target.x, y: target.y, z: GLOVE_3D.planeZ },
      previousCenter: previous,
      velocity: touchVelocity,
      inputMode: inputMode,
      target: target,
      ...withHands({ x: target.x, y: target.y, z: GLOVE_3D.planeZ }),
    };
  }

  var follow = GLOVE_3D.mouseFollow;
  var maxSpeed = GLOVE_3D.maxSpeedMouse;
  var desired = {
    x: previous.x + (target.x - previous.x) * follow,
    y: previous.y + (target.y - previous.y) * follow,
    z: GLOVE_3D.planeZ,
  };
  var dx = desired.x - previous.x;
  var dy = desired.y - previous.y;
  var distance = Math.hypot(dx, dy);
  var maxDistance = maxSpeed * safeDt;
  var center = desired;

  if (distance > maxDistance) {
    var ratio = maxDistance / distance;
    center = {
      x: previous.x + dx * ratio,
      y: previous.y + dy * ratio,
      z: GLOVE_3D.planeZ,
    };
  }

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
    target: target,
    ...withHands(center),
  };
}
