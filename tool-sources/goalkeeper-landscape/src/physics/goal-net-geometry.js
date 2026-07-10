import { SHOT_3D } from "../game/shot-3d-director.js";

export const GOAL_NET_GEOMETRY = {
  halfWidth: SHOT_3D.goalHalfWidth,
  height: SHOT_3D.goalHeight,
  netPlaneZ: SHOT_3D.netPlaneZ,
  shellOffsetZ: 0.022,
  anchorDepth: 0.035,
  pocketDepth: 0.84,
  bindingInset: 0.008,
  contactCooldown: 0.16,
};

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

export function getGoalNetPocketVertex(localX, localY) {
  var halfWidth = GOAL_NET_GEOMETRY.halfWidth;
  var height = GOAL_NET_GEOMETRY.height;
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
      localY - pocket * 0.045 - Math.sin(normalizedX * Math.PI) * 0.008,
      -height * 0.5,
      height * 0.5,
    ),
    z: GOAL_NET_GEOMETRY.anchorDepth + pocket * GOAL_NET_GEOMETRY.pocketDepth + wovenSlack,
  };
}

export function getGoalNetSurfacePoint(position) {
  var safeX = clamp(position?.x || 0, -GOAL_NET_GEOMETRY.halfWidth, GOAL_NET_GEOMETRY.halfWidth);
  var safeY = clamp(position?.y || 0, 0, GOAL_NET_GEOMETRY.height);
  var vertex = getGoalNetPocketVertex(safeX, safeY - GOAL_NET_GEOMETRY.height * 0.5);
  return {
    x: vertex.x,
    y: vertex.y + GOAL_NET_GEOMETRY.height * 0.5,
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

export function resolveGoalNetCollision(state, dt = 1 / 60) {
  var radius = Math.max(0.01, state.radius || 0.11);
  var position = { ...state.position };
  var previousPosition = state.previousPosition || position;
  var velocity = { ...state.velocity };
  var angularVelocity = { ...(state.angularVelocity || { x: 0, y: 0, z: 0 }) };
  var netContact = advanceNetContact(state.netContact, dt);
  var insideEnvelope =
    Math.abs(position.x) <= GOAL_NET_GEOMETRY.halfWidth &&
    position.y >= 0 &&
    position.y <= GOAL_NET_GEOMETRY.height;

  if (!insideEnvelope || (velocity.z || 0) <= 0.02) {
    return { position, velocity, angularVelocity, netContact, collided: false };
  }

  var previousSurface = getGoalNetSurfacePoint(previousPosition);
  var currentSurface = getGoalNetSurfacePoint(position);
  var previousRear = previousPosition.z + radius;
  var currentRear = position.z + radius;
  var crossedSurface = previousRear <= previousSurface.z + 0.004 && currentRear >= currentSurface.z;
  var penetratingSurface = currentRear > currentSurface.z + 0.015 && previousPosition.z <= position.z;

  if ((!crossedSurface && !penetratingSurface) || (netContact?.cooldown || 0) > 0) {
    return { position, velocity, angularVelocity, netContact, collided: false };
  }

  var impactSpeed = Math.max(0, velocity.z || 0);
  var reboundSpeed = Math.min(3.6, Math.max(0.42, impactSpeed * 0.16));
  position.z = currentSurface.z - radius - 0.004;
  velocity.x *= 0.42;
  velocity.y *= 0.5;
  velocity.z = -reboundSpeed;
  angularVelocity.x *= 0.58;
  angularVelocity.y *= 0.58;
  angularVelocity.z *= 0.58;

  var sourceContactEventId = state.sourceContact?.eventId ?? netContact?.sourceContactEventId ?? null;
  netContact = {
    eventId: netContact?.eventId || makeNetContactEventId(state.sourceContact, currentSurface),
    type: "net",
    point: currentSurface,
    strength: impactSpeed,
    sourceContactEventId,
    age: 0,
    cooldown: GOAL_NET_GEOMETRY.contactCooldown,
    fresh: true,
    impactCount: (netContact?.impactCount || 0) + 1,
  };

  return { position, velocity, angularVelocity, netContact, collided: true };
}
