import { describe, expect, it } from "vitest";
import { createShot3D, createShot3DDirector } from "../src/game/shot-3d-director.js";
import {
  GOAL_CAGE_POINTS,
  GOAL_FRAME_SEGMENTS,
  getGoalRoofHeightAtZ,
  getGoalSideHalfWidthAtZ,
} from "../src/physics/goal-net-geometry.js";
import { RAPIER_GOAL, createRapierGoalkeeperWorld } from "../src/physics/rapier-world.js";

describe("Rapier goalkeeper world", () => {
  it("creates rigid colliders for only the legal front goal frame", async () => {
    const world = await createRapierGoalkeeperWorld();

    expect(world.goalFrameColliders.map((entry) => entry.name)).toEqual(
      GOAL_FRAME_SEGMENTS.map((segment) => segment.name),
    );
    expect(world.goalFrameColliders).toHaveLength(3);
    expect(world.goalFrameColliders.every((entry) => entry.collider && entry.body)).toBe(true);
    expect(world.goalFrameColliders.some((entry) => entry.name.includes("rear"))).toBe(false);

    world.dispose();
  });

  it("uses sensor-only glove colliders so one manual solver owns the save impulse", async () => {
    const world = await createRapierGoalkeeperWorld();

    expect(world.gloveParts.length).toBeGreaterThan(0);
    expect(world.gloveParts.every((part) => part.collider?.isSensor())).toBe(true);

    world.dispose();
  });

  it("launches a dynamic ball that advances from the shooter toward the goal", async () => {
    const world = await createRapierGoalkeeperWorld();
    const shot = createShot3DDirector({ seed: 2, elapsed: 10 }).currentShot;

    world.launchShot(shot.ballPlan);
    world.step(1 / 30);
    const ball = world.getBallState();

    expect(ball.live).toBe(true);
    expect(ball.position.z).toBeGreaterThan(shot.origin.z);
    expect(ball.velocity.z).toBeGreaterThan(30);

    world.dispose();
  });

  it("keeps curved shots in a plausible football corridor instead of exploding sideways", async () => {
    const world = await createRapierGoalkeeperWorld();
    const shot = createShot3DDirector({ seed: 14, elapsed: 16 }).currentShot;

    world.launchShot(shot.ballPlan);
    for (let i = 0; i < 36; i += 1) {
      world.step(1 / 120);
    }
    const ball = world.getBallState();

    expect(Math.abs(ball.position.x)).toBeLessThan(3.8);
    expect(ball.position.y).toBeGreaterThan(0);
    expect(ball.position.y).toBeLessThan(4);
    expect(ball.position.z).toBeGreaterThan(-20);

    world.dispose();
  });

  it("keeps low balls on the field instead of falling through the ground", async () => {
    const world = await createRapierGoalkeeperWorld();

    world.launchShot({
      origin: { x: 0, y: 0.38, z: 1.4 },
      target: { x: 0, y: 0.1, z: 2.4 },
      velocity: { x: 0, y: -4.2, z: 1.2 },
      angularVelocity: { x: 8, y: 0, z: 0 },
      curveForce: { x: 0, y: 0, z: 0 },
      radius: 0.11,
    });

    for (let i = 0; i < 90; i += 1) {
      world.step(1 / 120);
    }
    const ball = world.getBallState();

    expect(ball.position.y).toBeGreaterThanOrEqual(0.09);
    expect(ball.velocity.y).toBeGreaterThan(-1.2);

    world.dispose();
  });

  it("side-parries an offset waiting block without always driving it forward", async () => {
    const world = await createRapierGoalkeeperWorld();

    world.setGloveTarget({ x: 0.22, y: 1.25, z: 3.15 });
    world.step(1 / 30);
    world.launchShot({
      origin: { x: 0, y: 1.25, z: 2.25 },
      target: { x: 0, y: 1.25, z: 4.65 },
      velocity: { x: 0, y: 0, z: 30 },
      angularVelocity: { x: 0, y: 14, z: 0 },
      curveForce: { x: 0, y: 0, z: 0 },
      radius: 0.11,
    });

    for (let i = 0; i < 24; i += 1) {
      world.step(1 / 120);
    }
    const ball = world.getBallState();

    expect(ball.lastContact?.type).toBe("glove");
    expect(ball.lastContact?.eventId).toBeTypeOf("number");
    expect(ball.outcome).toBe("deflected");
    expect(Math.abs(ball.velocity.x)).toBeGreaterThan(2.5);
    expect(Math.abs(ball.velocity.x)).toBeLessThan(9);
    expect(ball.velocity.z).toBeLessThan(2);
    expect(ball.velocity.z).toBeGreaterThan(-6.5);
    expect(ball.velocity.y).toBeGreaterThan(-1.2);
    expect(ball.lastContact.strength).toBeGreaterThan(9);
    expect(ball.lastContact.strength).toBeLessThan(38);

    const contactEventId = ball.lastContact.eventId;
    for (let i = 0; i < 12; i += 1) world.step(1 / 120);
    expect(world.getBallState().lastContact?.eventId).toBe(contactEventId);

    world.dispose();
  });

  it("catches the ball when it is perfectly centered in the glove pocket", async () => {
    const world = await createRapierGoalkeeperWorld();

    world.setGloveTarget({ x: 0, y: 1.25, z: 3.15 });
    world.step(1 / 30);
    world.launchShot({
      origin: { x: 0, y: 1.25, z: 2.35 },
      target: { x: 0, y: 1.25, z: 4.65 },
      velocity: { x: 0, y: 0, z: 22 },
      angularVelocity: { x: 0, y: 10, z: 0 },
      curveForce: { x: 0, y: 0, z: 0 },
      radius: 0.11,
    });

    for (let i = 0; i < 18; i += 1) {
      world.step(1 / 120);
    }
    const ball = world.getBallState();

    expect(ball.lastContact?.type).toBe("catch");
    expect(ball.outcome).toBe("saved");
    expect(Math.hypot(ball.velocity.x, ball.velocity.y, ball.velocity.z)).toBeLessThan(0.8);
    expect(ball.lastContact.catchQuality).toBeGreaterThan(0.75);

    world.dispose();
  });

  it("still catches near-center pocket hits so the branch is reachable in play", async () => {
    const world = await createRapierGoalkeeperWorld();

    world.setGloveTarget({ x: 0.06, y: 1.25, z: 3.15 });
    world.step(1 / 30);
    world.launchShot({
      origin: { x: 0, y: 1.25, z: 2.35 },
      target: { x: 0, y: 1.25, z: 4.65 },
      velocity: { x: 0, y: 0, z: 26 },
      angularVelocity: { x: 0, y: 10, z: 0 },
      curveForce: { x: 0, y: 0, z: 0 },
      radius: 0.11,
    });

    for (let i = 0; i < 18; i += 1) {
      world.step(1 / 120);
    }
    const ball = world.getBallState();

    expect(ball.lastContact?.type).toBe("catch");
    expect(ball.outcome).toBe("saved");
    expect(ball.lastContact.catchQuality).toBeGreaterThan(0.55);

    world.dispose();
  });

  it("credits lower-edge visual glove overlaps instead of letting them become goals", async () => {
    const world = await createRapierGoalkeeperWorld();

    world.setGloveTarget({ x: 0, y: 1.53, z: 3.15 });
    world.step(1 / 30);
    world.launchShot({
      origin: { x: 0, y: 1.25, z: 2.35 },
      target: { x: 0, y: 1.25, z: 4.65 },
      velocity: { x: 0, y: 0, z: 28 },
      angularVelocity: { x: 0, y: 10, z: 0 },
      curveForce: { x: 0, y: 0, z: 0 },
      radius: 0.11,
    });

    for (let i = 0; i < 80; i += 1) {
      world.step(1 / 120);
    }
    const ball = world.getBallState();

    expect(ball.outcome).toBe("saved");
    expect(ball.lastContact?.type).toBe("glove");
    expect(ball.lastContact?.part).toBe("visual-pocket");
    expect(ball.lastContact?.saveResolution).toBe("glove-deflected-away-from-goal");

    world.dispose();
  });

  it("keeps a narrow glove miss as a goal when save assist is disabled", async () => {
    const world = await createRapierGoalkeeperWorld();

    world.setSaveAssist({ enabled: false, margin: 0.18 });
    world.setGloveTarget({ x: 0, y: 1.25, z: 3.15 });
    world.step(1 / 30);
    world.launchShot({
      origin: { x: 0.7, y: 1.25, z: 2.35 },
      target: { x: 0.7, y: 1.25, z: 4.65 },
      velocity: { x: 0, y: 0, z: 28 },
      angularVelocity: { x: 0, y: 10, z: 0 },
      curveForce: { x: 0, y: 0, z: 0 },
      radius: 0.11,
    });

    for (let i = 0; i < 80; i += 1) world.step(1 / 120);
    const ball = world.getBallState();

    expect(ball.outcome).toBe("goal");
    expect(ball.lastContact?.assisted).not.toBe(true);

    world.dispose();
  });

  it("turns a narrow glove miss into an outward parry when save assist is enabled", async () => {
    const world = await createRapierGoalkeeperWorld();

    world.setSaveAssist({ enabled: true, margin: 0.18 });
    world.setGloveTarget({ x: 0, y: 1.25, z: 3.15 });
    world.step(1 / 30);
    world.launchShot({
      origin: { x: 0.7, y: 1.25, z: 2.35 },
      target: { x: 0.7, y: 1.25, z: 4.65 },
      velocity: { x: 0, y: 0, z: 28 },
      angularVelocity: { x: 0, y: 10, z: 0 },
      curveForce: { x: 0, y: 0, z: 0 },
      radius: 0.11,
    });

    for (let i = 0; i < 24; i += 1) world.step(1 / 120);
    const ball = world.getBallState();

    expect(["deflected", "saved"]).toContain(ball.outcome);
    expect(ball.lastContact).toMatchObject({
      type: "glove",
      part: "save-assist",
      assisted: true,
    });
    expect(ball.velocity.z).toBeLessThan(0);

    world.dispose();
  });

  it("does not assist a shot outside the configured save margin", async () => {
    const world = await createRapierGoalkeeperWorld();

    world.setSaveAssist({ enabled: true, margin: 0.18 });
    world.setGloveTarget({ x: 0, y: 1.25, z: 3.15 });
    world.step(1 / 30);
    world.launchShot({
      origin: { x: 0.82, y: 1.25, z: 2.35 },
      target: { x: 0.82, y: 1.25, z: 4.65 },
      velocity: { x: 0, y: 0, z: 28 },
      angularVelocity: { x: 0, y: 10, z: 0 },
      curveForce: { x: 0, y: 0, z: 0 },
      radius: 0.11,
    });

    for (let i = 0; i < 80; i += 1) world.step(1 / 120);
    const ball = world.getBallState();

    expect(ball.outcome).toBe("goal");
    expect(ball.lastContact?.assisted).not.toBe(true);

    world.dispose();
  });

  it("adds a controlled sideways slap only when the glove swipes quickly into the save", async () => {
    const world = await createRapierGoalkeeperWorld();

    world.setGloveTarget({ x: -0.8, y: 1.25, z: 3.15 });
    world.step(1 / 30);
    world.launchShot({
      origin: { x: 0, y: 1.25, z: 2.7 },
      target: { x: 0, y: 1.25, z: 4.65 },
      velocity: { x: 0, y: 0, z: 24 },
      angularVelocity: { x: 0, y: 14, z: 0 },
      curveForce: { x: 0, y: 0, z: 0 },
      radius: 0.11,
    });
    world.setGloveTarget({ x: 0.25, y: 1.25, z: 3.15 });

    for (let i = 0; i < 18; i += 1) {
      world.step(1 / 120);
    }
    const ball = world.getBallState();

    expect(ball.lastContact?.type).toBe("glove");
    expect(ball.outcome).toBe("deflected");
    expect(Math.abs(ball.velocity.x)).toBeGreaterThan(4);
    expect(Math.abs(ball.velocity.x)).toBeLessThan(14);
    expect(ball.velocity.z).toBeLessThan(2);
    expect(ball.velocity.z).toBeGreaterThan(-8);
    expect(ball.velocity.y).toBeGreaterThan(-1.2);
    expect(ball.lastContact.strength).toBeGreaterThan(34);
    expect(ball.lastContact.strength).toBeLessThan(82);
    expect(ball.lastContact.slapSpeed).toBeGreaterThan(8);

    world.dispose();
  });

  it("can palm the ball upward when the glove rises into the shot", async () => {
    const world = await createRapierGoalkeeperWorld();

    world.setGloveTarget({ x: 0.22, y: 0.86, z: 3.15 });
    world.step(1 / 30);
    world.launchShot({
      origin: { x: 0, y: 1.24, z: 2.55 },
      target: { x: 0, y: 1.24, z: 4.65 },
      velocity: { x: 0, y: 0, z: 25 },
      angularVelocity: { x: 0, y: 12, z: 0 },
      curveForce: { x: 0, y: 0, z: 0 },
      radius: 0.11,
    });
    world.setGloveTarget({ x: 0.22, y: 1.45, z: 3.15 });

    for (let i = 0; i < 18; i += 1) {
      world.step(1 / 120);
    }
    const ball = world.getBallState();

    expect(ball.lastContact?.type).toBe("glove");
    expect(ball.outcome).toBe("deflected");
    expect(ball.velocity.y).toBeGreaterThan(3.5);
    expect(ball.velocity.z).toBeLessThan(2.5);
    expect(ball.velocity.z).toBeGreaterThan(-8);

    world.dispose();
  });

  it("counts a light glove brush as a goal when the whole ball still crosses the line", async () => {
    const world = await createRapierGoalkeeperWorld();

    world.setGloveTarget({ x: 0.74, y: 1.25, z: 3.15 });
    world.step(1 / 30);
    world.launchShot({
      origin: { x: 0.38, y: 1.25, z: 2.7 },
      target: { x: 0.38, y: 1.25, z: 4.65 },
      velocity: { x: 0, y: 0, z: 28 },
      angularVelocity: { x: 0, y: 10, z: 0 },
      curveForce: { x: 0, y: 0, z: 0 },
      radius: 0.11,
    });

    let gloveEventId = null;
    for (let i = 0; i < 28; i += 1) {
      world.step(1 / 120);
      const frame = world.getBallState();
      if (frame.lastContact?.type === "glove") gloveEventId = frame.lastContact.eventId;
    }
    const ball = world.getBallState();

    expect(gloveEventId).toBeTypeOf("number");
    expect(ball.outcome).toBe("goal");
    expect(ball.lastContact).toMatchObject({
      type: "net",
      sourceContactEventId: gloveEventId,
      reason: "deflection-crossed-goal-line",
    });

    world.dispose();
  });

  it("does not credit a parry until the deflected ball is safely away from goal", async () => {
    const world = await createRapierGoalkeeperWorld();

    world.setGloveTarget({ x: 0.38, y: 1.25, z: 3.15 });
    world.step(1 / 30);
    world.launchShot({
      origin: { x: 0, y: 1.25, z: 2.7 },
      target: { x: 0, y: 1.25, z: 4.65 },
      velocity: { x: 0, y: 0, z: 28 },
      angularVelocity: { x: 0, y: 10, z: 0 },
      curveForce: { x: 0, y: 0, z: 0 },
      radius: 0.11,
    });

    world.step(1 / 120);
    const parry = world.getBallState();
    expect(parry.outcome).toBe("deflected");
    expect(parry.lastContact?.type).toBe("glove");
    expect(parry.velocity.z).toBeGreaterThan(0);

    for (let i = 0; i < 22; i += 1) {
      world.step(1 / 120);
    }
    const ball = world.getBallState();

    expect(ball.outcome).toBe("goal");
    expect(ball.lastContact).toMatchObject({
      type: "net",
      sourceContactEventId: parry.lastContact.eventId,
      reason: "deflection-crossed-goal-line",
    });
    expect(ball.live).toBe(false);

    for (let i = 0; i < 48; i += 1) {
      world.step(1 / 120);
    }
    const nettedGoal = world.getBallState();
    expect(nettedGoal.outcome).toBe("goal");
    expect(nettedGoal.netContact?.type).toBe("net");

    world.dispose();
  });

  it("uses compact glove colliders that match smaller glove visuals", async () => {
    const world = await createRapierGoalkeeperWorld();
    const gloves = world.getGloveState();
    const maxPartRadius = Math.max(...gloves.parts.map((part) => part.radius));

    expect(gloves.right.x - gloves.left.x).toBeLessThan(0.64);
    expect(maxPartRadius).toBeLessThanOrEqual(0.21);

    world.dispose();
  });

  it("classifies a missed ball as a goal and keeps net impact data", async () => {
    const world = await createRapierGoalkeeperWorld();

    world.setGloveTarget({ x: 3.2, y: 2.6, z: 3.15 });
    world.launchShot({
      origin: { x: 0, y: 1.2, z: 3.55 },
      target: { x: 0, y: 1.2, z: 4.65 },
      velocity: { x: 0, y: 0, z: 24 },
      angularVelocity: { x: 0, y: 12, z: 0 },
      curveForce: { x: 0, y: 0, z: 0 },
      radius: 0.11,
    });

    for (let i = 0; i < 72; i += 1) {
      world.step(1 / 120);
    }
    const ball = world.getBallState();

    expect(ball.outcome).toBe("goal");
    expect(ball.lastContact?.type).toBe("net");
    expect(ball.lastContact?.eventId).toBeTypeOf("number");
    expect(ball.netContact).toMatchObject({
      type: "net",
      sourceContactEventId: ball.lastContact.eventId,
    });
    expect(ball.position.z).toBeLessThan(RAPIER_GOAL.netPlaneZ + 1);
    expect(ball.velocity.z).toBeLessThanOrEqual(0);

    world.dispose();
  });

  it("keeps a near-post goal inside the net after side and rear net contact", async () => {
    const world = await createRapierGoalkeeperWorld();

    world.setGloveTarget({ x: 0, y: 2.8, z: 3.15 });
    world.launchShot({
      origin: { x: 3.35, y: 1.1, z: 3.55 },
      target: { x: 3.35, y: 1.1, z: 4.65 },
      velocity: { x: 0, y: 0, z: 24 },
      angularVelocity: { x: 0, y: 10, z: 0 },
      curveForce: { x: 0, y: 0, z: 0 },
      radius: 0.11,
    });

    for (let i = 0; i < 120; i += 1) world.step(1 / 120);
    const ball = world.getBallState();

    expect(ball.outcome).toBe("goal");
    expect(ball.netContact?.type).toBe("net");
    expect(ball.netContact?.impactCount).toBe(1);
    expect(ball.position.z).toBeLessThanOrEqual(GOAL_CAGE_POINTS.rearBottomRight.z + ball.radius);
    expect(ball.position.z).toBeGreaterThanOrEqual(RAPIER_GOAL.netPlaneZ);
    expect(ball.velocity.z).toBeLessThanOrEqual(0);

    world.dispose();
  });

  it("contains an extreme top-corner penalty after the ball reaches the roof-rear seam", async () => {
    const world = await createRapierGoalkeeperWorld();
    const shot = createShot3DDirector({ seed: 15, difficulty: "extreme", keeperX: 0 }).currentShot;

    world.setGloveTarget({ x: 0, y: 3, z: 3.15 });
    world.launchShot(shot.ballPlan);

    let goalSeen = false;
    let maxRearPenetration = Number.NEGATIVE_INFINITY;
    let maxSidePenetration = Number.NEGATIVE_INFINITY;
    let maxRoofPenetration = Number.NEGATIVE_INFINITY;
    for (let frame = 0; frame < 180; frame += 1) {
      world.step(1 / 120);
      const ball = world.getBallState();
      if (ball.outcome === "goal") goalSeen = true;
      if (!goalSeen || !ball.position) continue;
      maxRearPenetration = Math.max(
        maxRearPenetration,
        ball.position.z + ball.radius - GOAL_CAGE_POINTS.rearBottomRight.z,
      );
      maxSidePenetration = Math.max(
        maxSidePenetration,
        Math.abs(ball.position.x) + ball.radius - getGoalSideHalfWidthAtZ(ball.position.z),
      );
      maxRoofPenetration = Math.max(
        maxRoofPenetration,
        ball.position.y + ball.radius - getGoalRoofHeightAtZ(ball.position.z),
      );
    }

    expect(goalSeen).toBe(true);
    expect(maxRearPenetration).toBeLessThanOrEqual(0.02);
    expect(maxSidePenetration).toBeLessThanOrEqual(0.02);
    expect(maxRoofPenetration).toBeLessThanOrEqual(0.02);

    world.dispose();
  });

  it("keeps a scored extreme penalty inside the goal mouth for the full replay hold", async () => {
    const world = await createRapierGoalkeeperWorld();
    const shot = createShot3DDirector({ seed: 27, difficulty: "extreme", keeperX: 0 }).currentShot;

    world.setGloveTarget({ x: 0, y: 3, z: 3.15 });
    world.launchShot(shot.ballPlan);

    let framesAfterGoal = 0;
    let minGoalZ = Number.POSITIVE_INFINITY;
    while (framesAfterGoal <= 130) {
      world.step(1 / 120);
      const ball = world.getBallState();
      if (ball.outcome !== "goal" || !ball.position) continue;
      framesAfterGoal += 1;
      minGoalZ = Math.min(minGoalZ, ball.position.z);
    }

    const ball = world.getBallState();
    expect(ball.outcome).toBe("goal");
    expect(minGoalZ).toBeGreaterThanOrEqual(RAPIER_GOAL.netPlaneZ + ball.radius - 0.02);

    world.dispose();
  });

  it("does not count a ball skimming the floor as a conceded goal", async () => {
    const world = await createRapierGoalkeeperWorld();

    world.setGloveTarget({ x: 0, y: 3, z: 3.15 });
    world.launchShot({
      origin: { x: 0, y: 0.05, z: 3.5 },
      target: { x: 0, y: 0.05, z: 4.65 },
      velocity: { x: 0, y: 0, z: 22 },
      angularVelocity: { x: 0, y: 10, z: 0 },
      curveForce: { x: 0, y: 0, z: 0 },
      radius: 0.11,
    });

    for (let i = 0; i < 30; i += 1) {
      world.step(1 / 120);
    }
    const ball = world.getBallState();

    expect(ball.outcome).toBe("missed");
    expect(ball.live).toBe(false);
    expect(ball.lastContact?.type).toBe("wide");
    expect(ball.lastContact?.reason).toBe("whole-ball-outside-goal-mouth");

    world.dispose();
  });

  it("marks direct post hits as frame contact misses instead of leaving the ball live", async () => {
    const world = await createRapierGoalkeeperWorld();

    world.setGloveTarget({ x: 0, y: 3, z: 3.15 });
    world.launchShot({
      origin: { x: -2.85, y: 1.25, z: 2.2 },
      target: { x: -3.72, y: 1.25, z: 4.65 },
      velocity: { x: -7.4, y: 0, z: 20.5 },
      angularVelocity: { x: 0, y: 16, z: 0 },
      curveForce: { x: 0, y: 0, z: 0 },
      radius: 0.11,
    });

    for (let i = 0; i < 22; i += 1) {
      world.step(1 / 120);
    }
    const ball = world.getBallState();

    expect(ball.outcome).toBe("missed");
    expect(ball.live).toBe(false);
    expect(ball.lastContact?.type).toBe("frame");
    expect(ball.lastContact.part).toBe("left-post");
    expect(ball.lastContact.point.x).toBeLessThan(-3.6);
    expect(ball.lastContact.strength).toBeGreaterThan(20);
    expect(ball.velocity.z).toBeLessThan(0);

    world.dispose();
  });

  it("turns the rare frame-shot plan into a real Rapier post collision", async () => {
    const world = await createRapierGoalkeeperWorld();
    const shot = createShot3D({
      random: () => 0.5,
      elapsed: 20,
      shotId: 191,
      difficulty: "medium",
      easterEggRoll: 0,
    });

    world.setGloveTarget({ x: 0, y: 3, z: 3.15 });
    world.launchShot(shot.ballPlan);
    for (let i = 0; i < 96 && world.getBallState().live; i += 1) {
      world.step(1 / 120);
    }
    const ball = world.getBallState();

    expect(shot.shotVariant).toBe("frame");
    expect(shot.easterEggPart).toBe("left-post");
    expect(ball.outcome).toBe("missed");
    expect(ball.lastContact?.type).toBe("frame");
    expect(ball.lastContact?.part).toBe("left-post");

    world.dispose();
  });

  it("lets the rare off-target plan fly past the goal without becoming a goal", async () => {
    const world = await createRapierGoalkeeperWorld();
    const shot = createShot3D({
      random: () => 0.5,
      elapsed: 20,
      shotId: 192,
      difficulty: "medium",
      easterEggRoll: 0.006,
    });

    world.setGloveTarget({ x: 0, y: 3, z: 3.15 });
    world.launchShot(shot.ballPlan);
    for (let i = 0; i < 96 && world.getBallState().live; i += 1) {
      world.step(1 / 120);
    }
    const ball = world.getBallState();

    expect(shot.shotVariant).toBe("wide");
    expect(ball.outcome).toBe("missed");
    expect(ball.lastContact?.type).toBe("wide");

    world.dispose();
  });
});
