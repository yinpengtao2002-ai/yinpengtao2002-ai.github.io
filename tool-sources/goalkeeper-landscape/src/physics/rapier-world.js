import RAPIER from "@dimforge/rapier3d-compat";
import { SHOT_3D } from "../game/shot-3d-director.js";
import { GLOVE_3D } from "../input/glove-controller.js";
import { clamp, dot3, length3, normalize3, subtract3 } from "../math/vector.js";
import { GOAL_NET_GEOMETRY, resolveGoalNetCollision } from "./goal-net-geometry.js";

export const RAPIER_GOAL = {
  halfWidth: SHOT_3D.goalHalfWidth,
  height: SHOT_3D.goalHeight,
  glovePlaneZ: GLOVE_3D.planeZ,
  netPlaneZ: SHOT_3D.netPlaneZ,
  backNetZ: SHOT_3D.netPlaneZ + GOAL_NET_GEOMETRY.shellOffsetZ + GOAL_NET_GEOMETRY.anchorDepth + GOAL_NET_GEOMETRY.pocketDepth,
};

var rapierReady = null;

async function ensureRapier() {
  if (!rapierReady) {
    rapierReady =
      typeof window === "undefined"
        ? RAPIER.init({})
        : RAPIER.init({ module_or_path: "/vendor/rapier_wasm3d_bg.wasm" });
  }
  await rapierReady;
  return RAPIER;
}

function vector(value) {
  return { x: value.x, y: value.y, z: value.z };
}

function makeTarget(center) {
  var safeCenter = {
    x: clamp(center.x || 0, -GLOVE_3D.centerLimitX, GLOVE_3D.centerLimitX),
    y: clamp(center.y || 1.2, GLOVE_3D.minY, GLOVE_3D.maxY),
    z: center.z || GLOVE_3D.planeZ,
  };
  return {
    center: safeCenter,
    left: {
      x: safeCenter.x - GLOVE_3D.spread,
      y: safeCenter.y,
      z: safeCenter.z,
    },
    right: {
      x: safeCenter.x + GLOVE_3D.spread,
      y: safeCenter.y,
      z: safeCenter.z,
    },
  };
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

function isStrongVelocityChange(previousVelocity, velocity) {
  if (!previousVelocity || !velocity) return false;
  var delta = subtract3(previousVelocity, velocity);
  return length3(delta) > 8 && previousVelocity.z > 4 && velocity.z < previousVelocity.z - 8;
}

function getGoalLineCrossing(previousPosition, position) {
  if (!previousPosition || !position) return null;
  if (previousPosition.z >= RAPIER_GOAL.netPlaneZ || position.z < RAPIER_GOAL.netPlaneZ) return null;
  var travelZ = position.z - previousPosition.z;
  var t = Math.abs(travelZ) < 0.0001 ? 1 : clamp((RAPIER_GOAL.netPlaneZ - previousPosition.z) / travelZ, 0, 1);
  return {
    x: previousPosition.x + (position.x - previousPosition.x) * t,
    y: previousPosition.y + (position.y - previousPosition.y) * t,
    z: RAPIER_GOAL.netPlaneZ,
  };
}

function isBallCenterInsideGoalMouth(point) {
  return Math.abs(point.x) <= RAPIER_GOAL.halfWidth && point.y >= 0 && point.y <= RAPIER_GOAL.height;
}

function isWholeBallInsideGoalMouth(point, radius) {
  var margin = Math.max(0.06, radius * 0.9);
  return Math.abs(point.x) <= RAPIER_GOAL.halfWidth - margin && point.y >= margin && point.y <= RAPIER_GOAL.height - margin;
}

function getVisualPocketContact(previousPosition, ballPosition, gloveTarget, ballRadius) {
  if (!previousPosition || !ballPosition || !gloveTarget?.center) return null;
  var closest = closestPointOnSegment(gloveTarget.center, previousPosition, ballPosition);
  var delta = subtract3(closest.point, gloveTarget.center);
  var horizontalReach = GLOVE_3D.spread + GLOVE_3D.colliderRadius + ballRadius * 0.82;
  var verticalReach = delta.y < 0 ? 0.36 : 0.31;
  var zReach = ballRadius + 0.08;
  var normalizedPocket =
    (delta.x * delta.x) / (horizontalReach * horizontalReach) +
    (delta.y * delta.y) / (verticalReach * verticalReach);

  if (normalizedPocket > 1 || Math.abs(delta.z) > zReach) return null;

  var planarDistance = Math.hypot(delta.x, delta.y);
  return {
    part: { side: "both", part: "visual-pocket", radius: verticalReach },
    center: gloveTarget.center,
    point: closest.point,
    delta: delta,
    distance: Math.max(planarDistance, Math.abs(delta.z)),
    limit: Math.max(ballRadius + 0.2, planarDistance + 0.018),
  };
}

function createPartOffsets(side) {
  var thumbSide = side === "left" ? 1 : -1;
  var palmRadius = GLOVE_3D.colliderRadius;
  return [
    { part: "palm", offset: { x: 0, y: 0, z: 0 }, radius: palmRadius },
    { part: "wrist", offset: { x: 0, y: -0.22, z: 0.01 }, radius: 0.13 },
    { part: "thumb", offset: { x: thumbSide * 0.18, y: -0.02, z: 0 }, radius: 0.105 },
    { part: "finger", offset: { x: -0.115, y: 0.21, z: 0.01 }, radius: 0.105 },
    { part: "finger", offset: { x: -0.04, y: 0.24, z: 0.01 }, radius: 0.112 },
    { part: "finger", offset: { x: 0.04, y: 0.24, z: 0.01 }, radius: 0.112 },
    { part: "finger", offset: { x: 0.115, y: 0.21, z: 0.01 }, radius: 0.105 },
  ];
}

class RapierGoalkeeperWorld {
  constructor(R) {
    this.R = R;
    this.world = new R.World({ x: 0, y: SHOT_3D.gravity, z: 0 });
    this.world.timestep = 1 / 120;
    this.ballBody = null;
    this.ballCollider = null;
    this.ballRadius = 0.11;
    this.ballPlan = null;
    this.outcome = "idle";
    this.lastContact = null;
    this.netContact = null;
    this.contactSequence = 0;
    this.deflectionAge = null;
    this.previousBallPosition = null;
    this.time = 0;
    this.gloveTarget = makeTarget({ x: 0, y: 1.2, z: GLOVE_3D.planeZ });
    this.gloveVelocity = { x: 0, y: 0, z: 0 };
    this.gloveSwipeMemory = 0;
    this.gloveRiseMemory = 0;
    this.gloveBodies = {};
    this.gloveParts = [];
    this.createGloves();
    this.createGoalColliders();
    this.createFieldColliders();
  }

  createGloves() {
    ["left", "right"].forEach((side) => {
      var position = this.gloveTarget[side];
      var body = this.world.createRigidBody(
        this.R.RigidBodyDesc.kinematicPositionBased().setTranslation(position.x, position.y, position.z),
      );
      this.gloveBodies[side] = body;
      createPartOffsets(side).forEach((part) => {
        var desc = this.R.ColliderDesc.ball(part.radius)
          .setTranslation(part.offset.x, part.offset.y, part.offset.z)
          .setRestitution(0.3)
          .setFriction(0.48);
        var collider = this.world.createCollider(desc.setSensor(true), body);
        this.gloveParts.push({
          side: side,
          part: part.part,
          body: body,
          offset: part.offset,
          radius: part.radius,
          collider: collider,
        });
      });
    });
  }

  nextContactEventId() {
    this.contactSequence += 1;
    return this.contactSequence;
  }

  createGoalColliders() {
    var R = this.R;
    var frameDepth = 0.12;
    var z = RAPIER_GOAL.netPlaneZ;
    var frame = [
      { x: 0, y: RAPIER_GOAL.height + 0.06, z: z, hx: RAPIER_GOAL.halfWidth + 0.14, hy: 0.06, hz: frameDepth },
      { x: -RAPIER_GOAL.halfWidth - 0.06, y: RAPIER_GOAL.height / 2, z: z, hx: 0.06, hy: RAPIER_GOAL.height / 2, hz: frameDepth },
      { x: RAPIER_GOAL.halfWidth + 0.06, y: RAPIER_GOAL.height / 2, z: z, hx: 0.06, hy: RAPIER_GOAL.height / 2, hz: frameDepth },
    ];
    frame.forEach((box) => {
      var body = this.world.createRigidBody(R.RigidBodyDesc.fixed().setTranslation(box.x, box.y, box.z));
      this.world.createCollider(R.ColliderDesc.cuboid(box.hx, box.hy, box.hz).setRestitution(0.72).setFriction(0.3), body);
    });
  }

  createFieldColliders() {
    var body = this.world.createRigidBody(this.R.RigidBodyDesc.fixed().setTranslation(0, -0.055, -8.5));
    this.world.createCollider(
      this.R.ColliderDesc.cuboid(9.5, 0.055, 18.5).setRestitution(0.16).setFriction(0.88),
      body,
    );
  }

  dispose() {
    this.world.free();
  }

  resetBall() {
    if (this.ballBody) {
      this.world.removeRigidBody(this.ballBody);
    }
    this.ballBody = null;
    this.ballCollider = null;
    this.ballPlan = null;
    this.outcome = "idle";
    this.lastContact = null;
    this.netContact = null;
    this.deflectionAge = null;
    this.previousBallPosition = null;
    this.time = 0;
    this.gloveSwipeMemory = 0;
    this.gloveRiseMemory = 0;
  }

  launchShot(ballPlan) {
    this.resetBall();
    this.ballPlan = ballPlan;
    this.ballRadius = ballPlan.radius || 0.11;
    this.outcome = "live";
    this.time = 0;
    var bodyDesc = this.R.RigidBodyDesc.dynamic()
      .setTranslation(ballPlan.origin.x, ballPlan.origin.y, ballPlan.origin.z)
      .setLinvel(ballPlan.velocity.x, ballPlan.velocity.y, ballPlan.velocity.z)
      .setAngvel(ballPlan.angularVelocity || { x: 0, y: 0, z: 0 })
      .setLinearDamping(0.035)
      .setAngularDamping(0.08)
      .setCcdEnabled(true);
    this.ballBody = this.world.createRigidBody(bodyDesc);
    this.ballBody.setGravityScale(1, true);
    this.ballCollider = this.world.createCollider(
      this.R.ColliderDesc.ball(this.ballRadius).setRestitution(0.38).setFriction(0.62),
      this.ballBody,
    );
    this.previousBallPosition = vector(ballPlan.origin);
  }

  setGloveTarget(center) {
    this.gloveTarget = makeTarget(center);
  }

  updateGloves(dt) {
    var previousLeft = this.gloveBodies.left.translation();
    var previousCenter = {
      x: previousLeft.x + GLOVE_3D.spread,
      y: previousLeft.y,
      z: previousLeft.z,
    };
    var safeDt = Math.max(dt, 1 / 240);
    this.gloveVelocity = {
      x: (this.gloveTarget.center.x - previousCenter.x) / safeDt,
      y: (this.gloveTarget.center.y - previousCenter.y) / safeDt,
      z: (this.gloveTarget.center.z - previousCenter.z) / safeDt,
    };
    var planarSpeed = Math.hypot(this.gloveVelocity.x, this.gloveVelocity.y);
    this.gloveSwipeMemory = Math.max(planarSpeed, this.gloveSwipeMemory * 0.88);
    this.gloveRiseMemory = Math.max(Math.max(0, this.gloveVelocity.y), this.gloveRiseMemory * 0.86);
    this.gloveBodies.left.setNextKinematicTranslation(this.gloveTarget.left);
    this.gloveBodies.right.setNextKinematicTranslation(this.gloveTarget.right);
  }

  step(dt = 1 / 60) {
    var remaining = Math.max(0, Math.min(dt, 0.05));
    var substep = 1 / 120;
    while (remaining > 0) {
      var h = Math.min(substep, remaining);
      this.stepOnce(h);
      remaining -= h;
    }
  }

  stepOnce(dt) {
    this.world.timestep = dt;
    this.updateGloves(dt);

    if (this.ballBody && this.outcome === "live" && this.ballPlan?.curveForce) {
      var velocity = this.ballBody.linvel();
      this.ballBody.setLinvel(
        {
          x: velocity.x + (this.ballPlan.curveForce.x || 0) * dt,
          y: velocity.y + (this.ballPlan.curveForce.y || 0) * dt,
          z: velocity.z,
        },
        true,
      );
    }

    var previousPosition = this.ballBody ? vector(this.ballBody.translation()) : null;
    var previousVelocity = this.ballBody ? vector(this.ballBody.linvel()) : null;
    this.world.step();
    this.time += dt;

    if (!this.ballBody || this.outcome === "idle") return;

    if (this.outcome === "saved" && this.lastContact?.type === "catch") {
      this.ballBody.setGravityScale(0, true);
      this.ballBody.setTranslation(
        {
          x: this.gloveTarget.center.x,
          y: this.gloveTarget.center.y,
          z: this.gloveTarget.center.z - this.ballRadius * 0.45,
        },
        true,
      );
      this.ballBody.setLinvel({ x: 0, y: 0, z: 0 }, true);
      this.ballBody.setAngvel({ x: 0, y: 0, z: 0 }, true);
      this.previousBallPosition = vector(this.ballBody.translation());
      return;
    }

    var ballPosition = vector(this.ballBody.translation());
    var ballVelocity = vector(this.ballBody.linvel());

    if (this.outcome === "live") {
      this.resolveGloveContact(previousPosition || this.previousBallPosition, ballPosition, ballVelocity);
    }

    this.resolveFrameContact(previousPosition || this.previousBallPosition, previousVelocity, ballPosition, ballVelocity);
    this.resolveGoalOrSave(previousPosition || this.previousBallPosition);
    this.resolveNetContact(previousPosition || this.previousBallPosition, dt);
    this.previousBallPosition = vector(this.ballBody.translation());
  }

  resolveNetContact(previousPosition, dt) {
    if (!this.ballBody || (this.outcome !== "goal" && this.outcome !== "saved")) return;
    var result = resolveGoalNetCollision(
      {
        previousPosition,
        position: vector(this.ballBody.translation()),
        velocity: vector(this.ballBody.linvel()),
        angularVelocity: vector(this.ballBody.angvel()),
        radius: this.ballRadius,
        netContact: this.netContact,
        sourceContact: this.lastContact,
      },
      dt,
    );
    this.netContact = result.netContact;
    if (!result.collided) return;
    this.ballBody.setTranslation(result.position, true);
    this.ballBody.setLinvel(result.velocity, true);
    this.ballBody.setAngvel(result.angularVelocity, true);
  }

  resolveGloveContact(previousPosition, ballPosition, ballVelocity) {
    if (!previousPosition) return;
    var best = null;
    this.gloveParts.forEach((part) => {
      var bodyPosition = part.body.translation();
      var center = {
        x: bodyPosition.x + part.offset.x,
        y: bodyPosition.y + part.offset.y,
        z: bodyPosition.z + part.offset.z,
      };
      var closest = closestPointOnSegment(center, previousPosition, ballPosition);
      var delta = subtract3(closest.point, center);
      var distance = length3(delta);
      var limit = part.radius + this.ballRadius + 0.035;
      if (distance <= limit && (!best || distance < best.distance)) {
        best = {
          part: part,
          center: center,
          point: closest.point,
          delta: delta,
          distance: distance,
          limit: limit,
        };
      }
    });
    if (!best) {
      best = getVisualPocketContact(previousPosition, ballPosition, this.gloveTarget, this.ballRadius);
    }

    if (!best) return;

    var normal = best.distance < 0.0001 ? { x: 0, y: 0, z: -1 } : normalize3(best.delta);
    if (normal.z > -0.18) {
      normal = normalize3({
        x: normal.x * 0.45,
        y: normal.y * 0.45,
        z: -Math.max(0.52, Math.abs(normal.z)),
      });
    }

    var rawGloveSpeed = Math.hypot(this.gloveVelocity.x, this.gloveVelocity.y);
    var gloveSwipeSpeed = Math.min(34, Math.max(rawGloveSpeed, this.gloveSwipeMemory));
    var incomingSpeed = Math.max(0, ballVelocity.z - Math.min(0, this.gloveVelocity.z));
    var pocketClosest = closestPointOnSegment(this.gloveTarget.center, previousPosition, ballPosition);
    var pocketDelta = subtract3(pocketClosest.point, this.gloveTarget.center);
    var pocketPlanarDistance = Math.hypot(pocketDelta.x, pocketDelta.y);
    var catchWindow = 0.18;
    var catchQuality = clamp(1 - pocketPlanarDistance / catchWindow, 0, 1) * clamp(1 - gloveSwipeSpeed / 18, 0.35, 1);

    if (catchQuality > 0.58 && incomingSpeed <= 31 && Math.abs(pocketDelta.z) <= this.ballRadius + 0.13) {
      var catchPosition = {
        x: this.gloveTarget.center.x,
        y: this.gloveTarget.center.y,
        z: this.gloveTarget.center.z - this.ballRadius * 0.45,
      };
      this.ballBody.setTranslation(catchPosition, true);
      this.ballBody.setGravityScale(0, true);
      this.ballBody.setLinvel({ x: 0, y: 0, z: 0 }, true);
      this.ballBody.setAngvel({ x: 0, y: 0, z: 0 }, true);
      this.outcome = "saved";
      this.deflectionAge = null;
      this.lastContact = {
        eventId: this.nextContactEventId(),
        type: "catch",
        side: "both",
        part: "pocket",
        point: pocketClosest.point,
        normal: { x: 0, y: 0, z: -1 },
        strength: incomingSpeed * 0.42,
        catchQuality: catchQuality,
        gloveSpeed: gloveSwipeSpeed,
      };
      return;
    }

    var gloveVelocityScale = rawGloveSpeed > gloveSwipeSpeed && rawGloveSpeed > 0 ? gloveSwipeSpeed / rawGloveSpeed : 1;
    var effectiveGloveVelocity = {
      x: this.gloveVelocity.x * gloveVelocityScale,
      y: this.gloveVelocity.y * gloveVelocityScale,
      z: this.gloveVelocity.z,
    };
    var swipeFactor = clamp((gloveSwipeSpeed - 6) / 18, 0, 1);
    var softBlockSpeed = clamp(incomingSpeed * 0.25 + 0.9, 5.6, 9.8);
    var slapSpeed = Math.min(14, gloveSwipeSpeed * 0.62) * swipeFactor;
    var lateralPush = 0.75 + gloveSwipeSpeed * (0.035 + swipeFactor * 0.045);
    var pocketOffsetFactor = clamp(Math.abs(pocketDelta.x) / 0.32, 0, 1);
    var brushThroughFactor = clamp((Math.abs(pocketDelta.x) - 0.29) / 0.16, 0, 1) * (1 - swipeFactor * 0.72);
    var sideDirection =
      swipeFactor > 0.25 && Math.abs(effectiveGloveVelocity.x) > 1
        ? Math.sign(effectiveGloveVelocity.x)
        : Math.sign(pocketDelta.x || normal.x || 1);
    var sideParry =
      sideDirection * (pocketOffsetFactor * (3.6 + incomingSpeed * 0.05) + swipeFactor * Math.min(2.6, gloveSwipeSpeed * 0.075));
    var awaySpeed = clamp(softBlockSpeed * (0.5 - pocketOffsetFactor * 0.24) + slapSpeed * (0.24 + swipeFactor * 0.06), 1.2, 7.6);
    var throughSpeed = incomingSpeed * (0.22 + brushThroughFactor * 0.34);
    var nextZ = brushThroughFactor > 0.34 ? throughSpeed : -awaySpeed;
    var downwardPunch = 0.08 + incomingSpeed * 0.004 + slapSpeed * 0.006;
    var cushionedLift = incomingSpeed * 0.035 + slapSpeed * 0.055;
    var riseSpeed = Math.min(34, Math.max(Math.max(0, effectiveGloveVelocity.y), this.gloveRiseMemory));
    var upwardPalm = riseSpeed * (0.08 + swipeFactor * 0.09);
    var nextVelocity = {
      x: ballVelocity.x * 0.18 + normal.x * lateralPush + effectiveGloveVelocity.x * (0.04 + swipeFactor * 0.1) + sideParry,
      y:
        ballVelocity.y * 0.12 +
        normal.y * lateralPush * 0.35 +
        effectiveGloveVelocity.y * (0.04 + swipeFactor * 0.08) +
        cushionedLift +
        upwardPalm -
        downwardPunch,
      z: nextZ,
    };
    var contactStrength = softBlockSpeed + slapSpeed + Math.abs(sideParry) * 0.6 + gloveSwipeSpeed * (0.18 + swipeFactor * 1.25);

    var correctionZ = nextZ > 0 ? Math.abs(normal.z) * (best.limit + 0.012) : normal.z * (best.limit + 0.01);
    var corrected = {
      x: best.center.x + normal.x * (best.limit + 0.01),
      y: best.center.y + normal.y * (best.limit + 0.01),
      z: best.center.z + correctionZ,
    };
    this.ballBody.setTranslation(corrected, true);
    this.ballBody.setLinvel(nextVelocity, true);
    this.ballBody.setAngvel(
      {
        x: -8 - slapSpeed * 0.75 + effectiveGloveVelocity.y * 0.18,
        y: 9 + slapSpeed * 0.9 + effectiveGloveVelocity.x * 0.32,
        z: effectiveGloveVelocity.x * 0.18,
      },
      true,
    );
    this.outcome = "deflected";
    this.deflectionAge = 0;
    this.lastContact = {
      eventId: this.nextContactEventId(),
      type: "glove",
      side: best.part.side,
      part: best.part.part,
      point: best.point,
      normal: normal,
      strength: contactStrength,
      gloveSpeed: gloveSwipeSpeed,
      softBlockSpeed: softBlockSpeed,
      slapSpeed: slapSpeed,
    };
  }

  resolveGoalOrSave(previousPosition) {
    if (!this.ballBody) return;
    var position = vector(this.ballBody.translation());
    var velocity = vector(this.ballBody.linvel());
    var goalLineCrossing = getGoalLineCrossing(previousPosition, position);
    var crossedNet = goalLineCrossing && isBallCenterInsideGoalMouth(goalLineCrossing);

    if (this.outcome === "deflected" && crossedNet) {
      this.outcome = "saved";
      this.deflectionAge = null;
      this.lastContact = {
        ...(this.lastContact || {}),
        saveResolution: "glove-contact-before-net",
      };
      return;
    }

    if (this.outcome === "live" && crossedNet) {
      if (!isWholeBallInsideGoalMouth(goalLineCrossing, this.ballRadius)) {
        this.outcome = "missed";
        this.lastContact = {
          type: "wide",
          point: goalLineCrossing,
          strength: Math.abs(velocity.z),
          reason: "whole-ball-outside-goal-mouth",
        };
        return;
      }

      this.outcome = "goal";
      this.lastContact = {
        eventId: this.nextContactEventId(),
        type: "net",
        point: goalLineCrossing,
        strength: Math.abs(velocity.z),
      };
      return;
    }

    if (
      this.outcome === "live" &&
      position.z > RAPIER_GOAL.netPlaneZ + 1.2 &&
      (Math.abs(position.x) > RAPIER_GOAL.halfWidth || position.y < 0 || position.y > RAPIER_GOAL.height)
    ) {
      this.outcome = "missed";
      this.lastContact = {
        type: "wide",
        point: position,
        strength: Math.abs(velocity.z),
      };
      return;
    }

    if (this.outcome === "deflected") {
      this.deflectionAge = (this.deflectionAge || 0) + this.world.timestep;
      var escaped =
        position.z < -0.25 ||
        Math.abs(position.x) > RAPIER_GOAL.halfWidth + 0.55 ||
        position.y > RAPIER_GOAL.height + 0.6 ||
        position.y < -0.35;
      var travelingAwayFromGoal = velocity.z < -0.8 && position.z < RAPIER_GOAL.glovePlaneZ - 0.25;
      if (escaped && this.deflectionAge > 0.28) {
        this.outcome = "saved";
      } else if (travelingAwayFromGoal && this.deflectionAge > 0.32) {
        this.outcome = "saved";
        this.lastContact = {
          ...(this.lastContact || {}),
          saveResolution: "glove-deflected-away-from-goal",
        };
      }
    }
  }

  resolveFrameContact(previousPosition, previousVelocity, position, velocity) {
    if (!previousPosition || !this.ballBody) return;
    if (this.outcome !== "live" && this.outcome !== "deflected") return;
    if (!isStrongVelocityChange(previousVelocity, velocity)) return;
    if (Math.abs(position.z - RAPIER_GOAL.netPlaneZ) > 0.45) return;

    var postX = RAPIER_GOAL.halfWidth + 0.06;
    var nearLeftPost = Math.abs(position.x + postX) <= this.ballRadius + 0.17;
    var nearRightPost = Math.abs(position.x - postX) <= this.ballRadius + 0.17;
    var nearCrossbar = Math.abs(position.y - (RAPIER_GOAL.height + 0.06)) <= this.ballRadius + 0.2;
    var withinPostHeight = position.y >= -this.ballRadius && position.y <= RAPIER_GOAL.height + this.ballRadius * 1.8;
    var withinCrossbarWidth = Math.abs(position.x) <= RAPIER_GOAL.halfWidth + this.ballRadius * 1.8;
    var part = null;
    var point = null;

    if (nearLeftPost && withinPostHeight) {
      part = "left-post";
      point = {
        x: -postX,
        y: clamp(position.y, 0, RAPIER_GOAL.height),
        z: RAPIER_GOAL.netPlaneZ,
      };
    } else if (nearRightPost && withinPostHeight) {
      part = "right-post";
      point = {
        x: postX,
        y: clamp(position.y, 0, RAPIER_GOAL.height),
        z: RAPIER_GOAL.netPlaneZ,
      };
    } else if (nearCrossbar && withinCrossbarWidth) {
      part = "crossbar";
      point = {
        x: clamp(position.x, -RAPIER_GOAL.halfWidth, RAPIER_GOAL.halfWidth),
        y: RAPIER_GOAL.height + 0.06,
        z: RAPIER_GOAL.netPlaneZ,
      };
    }

    if (!part) return;

    this.lastContact = {
      type: "frame",
      part: part,
      point: point,
      strength: length3(subtract3(previousVelocity, velocity)),
    };
    this.outcome = this.outcome === "deflected" ? "saved" : "missed";
  }

  getBallState() {
    if (!this.ballBody) {
      return {
        live: false,
        outcome: this.outcome,
        position: null,
        velocity: null,
        angularVelocity: null,
        lastContact: this.lastContact,
        netContact: this.netContact,
      };
    }
    return {
      live: this.outcome === "live" || this.outcome === "deflected",
      outcome: this.outcome,
      position: vector(this.ballBody.translation()),
      velocity: vector(this.ballBody.linvel()),
      angularVelocity: vector(this.ballBody.angvel()),
      radius: this.ballRadius,
      lastContact: this.lastContact,
      netContact: this.netContact,
    };
  }

  getGloveState() {
    return {
      center: this.gloveTarget.center,
      left: this.gloveTarget.left,
      right: this.gloveTarget.right,
      velocity: this.gloveVelocity,
      parts: this.gloveParts.map((part) => {
        var bodyPosition = part.body.translation();
        return {
          side: part.side,
          part: part.part,
          center: {
            x: bodyPosition.x + part.offset.x,
            y: bodyPosition.y + part.offset.y,
            z: bodyPosition.z + part.offset.z,
          },
          radius: part.radius,
        };
      }),
    };
  }
}

export async function createRapierGoalkeeperWorld() {
  var R = await ensureRapier();
  return new RapierGoalkeeperWorld(R);
}
