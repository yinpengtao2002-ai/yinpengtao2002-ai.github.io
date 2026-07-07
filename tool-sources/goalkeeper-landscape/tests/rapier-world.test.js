import { describe, expect, it } from "vitest";
import { createShot3DDirector } from "../src/game/shot-3d-director.js";
import { createRapierGoalkeeperWorld } from "../src/physics/rapier-world.js";

describe("Rapier goalkeeper world", () => {
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
    expect(ball.outcome).toBe("deflected");
    expect(Math.abs(ball.velocity.x)).toBeGreaterThan(2.5);
    expect(Math.abs(ball.velocity.x)).toBeLessThan(9);
    expect(ball.velocity.z).toBeLessThan(2);
    expect(ball.velocity.z).toBeGreaterThan(-6.5);
    expect(ball.velocity.y).toBeGreaterThan(-1.2);
    expect(ball.lastContact.strength).toBeGreaterThan(9);
    expect(ball.lastContact.strength).toBeLessThan(38);

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

  it("can brush the ball into the net when contact quality is poor", async () => {
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

    for (let i = 0; i < 28; i += 1) {
      world.step(1 / 120);
    }
    const ball = world.getBallState();

    expect(ball.outcome).toBe("goal");
    expect(ball.lastContact?.type).toBe("net");

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

    for (let i = 0; i < 18; i += 1) {
      world.step(1 / 120);
    }
    const ball = world.getBallState();

    expect(ball.outcome).toBe("goal");
    expect(ball.lastContact?.type).toBe("net");
    expect(ball.position.z).toBeGreaterThanOrEqual(4.55);

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
});
