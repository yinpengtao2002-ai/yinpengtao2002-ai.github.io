import { SHOT_3D } from "../game/shot-3d-director.js";

export const GOAL_NET_GEOMETRY = {
  halfWidth: SHOT_3D.goalHalfWidth,
  height: SHOT_3D.goalHeight,
  netPlaneZ: SHOT_3D.netPlaneZ,
  rearHeight: 2.24,
  cageDepth: 1.78,
  frameRadius: 0.06,
  netSlack: 0.12,
  shellOffsetZ: 0.022,
  anchorDepth: 0.035,
  pocketDepth: 0.84,
  bindingInset: 0.008,
  contactCooldown: 0.16,
};

function gridDivisions(length, targetCellSize) {
  return Math.max(1, Math.round(length / targetCellSize));
}

const TARGET_NET_CELL_SIZE = 0.12;

export const GOAL_NET_GRID = Object.freeze({
  targetCellSize: TARGET_NET_CELL_SIZE,
  widthDivisions: gridDivisions(GOAL_NET_GEOMETRY.halfWidth * 2, TARGET_NET_CELL_SIZE),
  depthDivisions: gridDivisions(GOAL_NET_GEOMETRY.cageDepth, TARGET_NET_CELL_SIZE),
  frontHeightDivisions: gridDivisions(GOAL_NET_GEOMETRY.height, TARGET_NET_CELL_SIZE),
  rearHeightDivisions: gridDivisions(GOAL_NET_GEOMETRY.rearHeight, TARGET_NET_CELL_SIZE),
});

function point(x, y, z) {
  return Object.freeze({ x, y, z });
}

var rearZ = GOAL_NET_GEOMETRY.netPlaneZ + GOAL_NET_GEOMETRY.cageDepth;

export const GOAL_CAGE_POINTS = Object.freeze({
  frontBottomLeft: point(-GOAL_NET_GEOMETRY.halfWidth, 0, GOAL_NET_GEOMETRY.netPlaneZ),
  frontTopLeft: point(-GOAL_NET_GEOMETRY.halfWidth, GOAL_NET_GEOMETRY.height, GOAL_NET_GEOMETRY.netPlaneZ),
  frontTopRight: point(GOAL_NET_GEOMETRY.halfWidth, GOAL_NET_GEOMETRY.height, GOAL_NET_GEOMETRY.netPlaneZ),
  frontBottomRight: point(GOAL_NET_GEOMETRY.halfWidth, 0, GOAL_NET_GEOMETRY.netPlaneZ),
  rearBottomLeft: point(-GOAL_NET_GEOMETRY.halfWidth, 0, rearZ),
  rearTopLeft: point(-GOAL_NET_GEOMETRY.halfWidth, GOAL_NET_GEOMETRY.rearHeight, rearZ),
  rearTopRight: point(GOAL_NET_GEOMETRY.halfWidth, GOAL_NET_GEOMETRY.rearHeight, rearZ),
  rearBottomRight: point(GOAL_NET_GEOMETRY.halfWidth, 0, rearZ),
});

function segment(name, startName, endName) {
  return Object.freeze({
    name,
    start: GOAL_CAGE_POINTS[startName],
    end: GOAL_CAGE_POINTS[endName],
  });
}

export const GOAL_FRAME_SEGMENTS = Object.freeze([
  segment("crossbar", "frontTopLeft", "frontTopRight"),
  segment("front-left-post", "frontBottomLeft", "frontTopLeft"),
  segment("front-right-post", "frontBottomRight", "frontTopRight"),
]);

function visualSegment(name, startName, endName) {
  return Object.freeze({
    ...segment(name, startName, endName),
    visualOnly: true,
  });
}

export const GOAL_RETURN_FRAME_SEGMENTS = Object.freeze([
  visualSegment("top-left-return", "frontTopLeft", "rearTopLeft"),
  visualSegment("top-right-return", "frontTopRight", "rearTopRight"),
  visualSegment("rear-left-upright", "rearBottomLeft", "rearTopLeft"),
  visualSegment("rear-right-upright", "rearBottomRight", "rearTopRight"),
  visualSegment("bottom-left-return", "frontBottomLeft", "rearBottomLeft"),
  visualSegment("bottom-right-return", "frontBottomRight", "rearBottomRight"),
  visualSegment("rear-base-rail", "rearBottomLeft", "rearBottomRight"),
]);

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

export function getGoalRoofHeightAtZ(z) {
  var depth = clamp(
    (z - GOAL_NET_GEOMETRY.netPlaneZ) / GOAL_NET_GEOMETRY.cageDepth,
    0,
    1,
  );
  return GOAL_NET_GEOMETRY.height +
    (GOAL_NET_GEOMETRY.rearHeight - GOAL_NET_GEOMETRY.height) * depth;
}

export function getGoalNetPocketVertex(localX, localY) {
  var halfWidth = GOAL_NET_GEOMETRY.halfWidth;
  var height = GOAL_NET_GEOMETRY.rearHeight;
  var normalizedX = Math.min(1, Math.abs(localX) / halfWidth);
  var normalizedY = Math.min(1, Math.max(0, localY / height + 0.5));
  var horizontalPocket = Math.pow(Math.max(0, 1 - normalizedX * normalizedX), 0.72);
  var verticalPocket = Math.pow(Math.max(0, Math.sin(normalizedY * Math.PI)), 0.68);
  var pocket = horizontalPocket * verticalPocket;
  var wovenSlack = Math.sin(localX * 2.18 + normalizedY * 5.4) * 0.012 * pocket;

  return {
    x: clamp(
      localX + Math.sin(normalizedY * Math.PI * 2) * 0.012 * horizontalPocket,
      -halfWidth,
      halfWidth,
    ),
    y: clamp(
      localY - pocket * (0.045 + Math.sin(normalizedX * Math.PI) * 0.008),
      -height * 0.5,
      height * 0.5,
    ),
    z: GOAL_NET_GEOMETRY.cageDepth - GOAL_NET_GEOMETRY.shellOffsetZ -
      pocket * GOAL_NET_GEOMETRY.netSlack + wovenSlack,
  };
}

export function getGoalNetSurfacePoint(position) {
  var safeX = clamp(position?.x || 0, -GOAL_NET_GEOMETRY.halfWidth, GOAL_NET_GEOMETRY.halfWidth);
  var safeY = clamp(position?.y || 0, 0, GOAL_NET_GEOMETRY.rearHeight);
  var vertex = getGoalNetPocketVertex(safeX, safeY - GOAL_NET_GEOMETRY.rearHeight * 0.5);
  return {
    x: vertex.x,
    y: vertex.y + GOAL_NET_GEOMETRY.rearHeight * 0.5,
    z: GOAL_NET_GEOMETRY.netPlaneZ + GOAL_NET_GEOMETRY.shellOffsetZ + vertex.z,
  };
}

function makeNetContactEventId(sourceContact, point) {
  if (sourceContact?.eventId !== undefined && sourceContact?.eventId !== null) {
    return "net:" + String(sourceContact.eventId);
  }
  return [
    "net",
    Math.round((point.x || 0) * 20),
    Math.round((point.y || 0) * 20),
    Math.round((point.z || 0) * 20),
  ].join(":");
}

function advanceNetContact(contact, dt) {
  if (!contact) return null;
  return {
    ...contact,
    age: (contact.age || 0) + Math.max(0, dt || 0),
    cooldown: Math.max(0, (contact.cooldown || 0) - Math.max(0, dt || 0)),
    fresh: false,
  };
}

function crossingTime(previousDistance, currentDistance) {
  if (previousDistance < -0.004 || currentDistance > 0) return null;
  var travel = previousDistance - currentDistance;
  return travel <= 0.000001 ? 0 : clamp(previousDistance / travel, 0, 1);
}

function interpolatePosition(previousPosition, position, t) {
  return {
    x: previousPosition.x + (position.x - previousPosition.x) * t,
    y: previousPosition.y + (position.y - previousPosition.y) * t,
    z: previousPosition.z + (position.z - previousPosition.z) * t,
  };
}

function isInsidePanelHeight(point, radius) {
  var roof = getGoalRoofHeightAtZ(point.z);
  return point.y >= radius * 0.35 && point.y <= roof + radius * 0.35;
}

function getNetCollisionCandidates(previousPosition, position, velocity, radius) {
  var candidates = [];
  var frontZ = GOAL_NET_GEOMETRY.netPlaneZ;
  var rearZ = GOAL_CAGE_POINTS.rearBottomLeft.z;
  var halfWidth = GOAL_NET_GEOMETRY.halfWidth;

  function addCandidate(panel, previousDistance, currentDistance, validPoint) {
    var t = crossingTime(previousDistance, currentDistance);
    if (t === null) return;
    var point = interpolatePosition(previousPosition, position, t);
    if (!validPoint(point)) return;
    candidates.push({ panel, point, t });
  }

  if ((velocity.z || 0) > 0.02) {
    var previousRearSurface = getGoalNetSurfacePoint(previousPosition).z;
    var currentRearSurface = getGoalNetSurfacePoint(position).z;
    addCandidate(
      "rear",
      previousRearSurface - (previousPosition.z + radius),
      currentRearSurface - (position.z + radius),
      (point) => Math.abs(point.x) <= halfWidth + radius * 0.2 &&
        point.y >= 0 && point.y <= GOAL_NET_GEOMETRY.rearHeight + radius * 0.2,
    );
  }

  if ((velocity.x || 0) < -0.02) {
    addCandidate(
      "left",
      previousPosition.x - radius + halfWidth,
      position.x - radius + halfWidth,
      (point) => point.z >= frontZ - radius * 0.2 &&
        point.z <= rearZ + radius * 0.2 && isInsidePanelHeight(point, radius),
    );
  }

  if ((velocity.x || 0) > 0.02) {
    addCandidate(
      "right",
      halfWidth - (previousPosition.x + radius),
      halfWidth - (position.x + radius),
      (point) => point.z >= frontZ - radius * 0.2 &&
        point.z <= rearZ + radius * 0.2 && isInsidePanelHeight(point, radius),
    );
  }

  var previousRoofDistance = getGoalRoofHeightAtZ(previousPosition.z) - (previousPosition.y + radius);
  var currentRoofDistance = getGoalRoofHeightAtZ(position.z) - (position.y + radius);
  if (currentRoofDistance < previousRoofDistance - 0.0001) {
    addCandidate(
      "top",
      previousRoofDistance,
      currentRoofDistance,
      (point) => point.z >= frontZ - radius * 0.2 && point.z <= rearZ + radius * 0.2 &&
        Math.abs(point.x) <= halfWidth + radius * 0.2,
    );
  }

  return candidates.sort((a, b) => a.t - b.t);
}

function resolvePanelVelocity(panel, velocity) {
  var next = { ...velocity };
  if (panel === "rear") {
    var rearImpact = Math.max(0, velocity.z || 0);
    next.x *= 0.44;
    next.y *= 0.52;
    next.z = -Math.min(3.6, Math.max(0.42, rearImpact * 0.16));
  } else if (panel === "left" || panel === "right") {
    var sideImpact = Math.abs(velocity.x || 0);
    next.x = (panel === "left" ? 1 : -1) * Math.min(3.2, Math.max(0.35, sideImpact * 0.18));
    next.y *= 0.72;
    next.z *= 0.58;
  } else {
    var topImpact = Math.abs(velocity.y || 0);
    next.x *= 0.72;
    next.y = -Math.min(2.8, Math.max(0.35, topImpact * 0.2));
    next.z *= 0.58;
  }
  return next;
}

function clampBallToPanel(panel, position, radius) {
  var inset = radius + 0.004;
  if (panel === "rear") {
    position.z = getGoalNetSurfacePoint(position).z - inset;
  } else if (panel === "left") {
    position.x = -GOAL_NET_GEOMETRY.halfWidth + inset;
  } else if (panel === "right") {
    position.x = GOAL_NET_GEOMETRY.halfWidth - inset;
  } else {
    position.y = getGoalRoofHeightAtZ(position.z) - inset;
  }
  return position;
}

function getPanelContactPoint(panel, position) {
  if (panel === "rear") return getGoalNetSurfacePoint(position);
  if (panel === "left" || panel === "right") {
    return {
      x: panel === "left" ? -GOAL_NET_GEOMETRY.halfWidth : GOAL_NET_GEOMETRY.halfWidth,
      y: position.y,
      z: position.z,
    };
  }
  return { x: position.x, y: getGoalRoofHeightAtZ(position.z), z: position.z };
}

export function resolveGoalNetCollision(state, dt = 1 / 60) {
  var radius = Math.max(0.01, state.radius || 0.11);
  var position = { ...state.position };
  var previousPosition = state.previousPosition || position;
  var velocity = { ...state.velocity };
  var angularVelocity = { ...(state.angularVelocity || { x: 0, y: 0, z: 0 }) };
  var netContact = advanceNetContact(state.netContact, dt);
  var candidates = getNetCollisionCandidates(previousPosition, position, velocity, radius);

  if (candidates.length === 0 || (netContact?.cooldown || 0) > 0) {
    return { position, velocity, angularVelocity, netContact, collided: false, panel: null };
  }

  var collision = candidates[0];
  var panel = collision.panel;
  var impactSpeed = panel === "rear"
    ? Math.max(0, velocity.z || 0)
    : panel === "top"
      ? Math.abs(velocity.y || 0)
      : Math.abs(velocity.x || 0);
  position = clampBallToPanel(panel, position, radius);
  velocity = resolvePanelVelocity(panel, velocity);
  angularVelocity.x *= 0.58;
  angularVelocity.y *= 0.58;
  angularVelocity.z *= 0.58;

  var contactPoint = getPanelContactPoint(panel, position);

  var sourceContactEventId = state.sourceContact?.eventId ?? netContact?.sourceContactEventId ?? null;
  netContact = {
    eventId: netContact?.eventId || makeNetContactEventId(state.sourceContact, contactPoint),
    type: "net",
    panel,
    point: contactPoint,
    strength: impactSpeed,
    sourceContactEventId,
    age: 0,
    cooldown: GOAL_NET_GEOMETRY.contactCooldown,
    fresh: true,
    impactCount: (netContact?.impactCount || 0) + 1,
  };

  return { position, velocity, angularVelocity, netContact, collided: true, panel };
}
