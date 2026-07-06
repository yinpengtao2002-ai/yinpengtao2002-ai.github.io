import { describe, expect, it } from "vitest";
import {
  createBall,
  didBallEnterGoal,
  integrateBall,
  markBallConceded,
  markBallSaved,
  projectBall,
  resolveGoalEntry,
} from "../src/physics/ball-physics.js";
import { FIELD, SHOTS } from "../src/config/game-config.js";
import { createGloves, getProjectedGloves, resolveGloveCollision, updateGloves } from "../src/physics/glove-physics.js";
import { clamp, length3, normalize3 } from "../src/math/vector.js";

describe("vector helpers", () => {
  it("normalizes a 3D vector and clamps scalar values", () => {
    expect(clamp(12, 0, 10)).toBe(10);
    expect(length3({ x: 3, y: 4, z: 12 })).toBeCloseTo(13);
    expect(normalize3({ x: 0, y: 3, z: 4 })).toEqual({
      x: 0,
      y: 0.6,
      z: 0.8,
    });
  });
});

describe("2.5D ball physics", () => {
  it("moves a fast shot toward the keeper while gravity creates visible dip", () => {
    const ball = createBall({
      position: { x: 0, y: 1.9, z: 26 },
      velocity: { x: 0.2, y: 1.4, z: -30 },
      curve: 0,
      spin: 3,
    });

    const next = integrateBall(ball, 0.25);

    expect(next.position.z).toBeLessThan(ball.position.z);
    expect(next.velocity.y).toBeLessThan(ball.velocity.y);
    expect(projectBall(next, { width: 1280, height: 720 }).radius).toBeGreaterThan(12);
  });

  it("lets elastic gloves slap a ball away using relative velocity", () => {
    const gloves = updateGloves(createGloves(), { x: 650, y: 500 }, 0.016, {
      width: 1280,
      height: 720,
      inputMode: "mouse",
    });
    const ball = createBall({
      position: { x: 0.1, y: 1.3, z: 1.2 },
      velocity: { x: 0, y: -0.2, z: -28 },
      curve: 0,
      spin: 0,
    });

    const result = resolveGloveCollision(ball, gloves, { width: 1280, height: 720 });

    expect(result.hit).toBe(true);
    expect(result.ball.velocity.z).toBeGreaterThan(0);
    expect(result.ball.outcome).toBe("deflected");
  });

  it("catches fast balls that cross the glove plane between frames", () => {
    const gloves = createGloves();
    const previous = createBall({
      position: { x: 0.12, y: 1.12, z: 2.4 },
      velocity: { x: 0, y: 0, z: -56 },
      curve: 0,
      spin: 0,
    });
    const current = createBall({
      position: { x: 0.12, y: 1.12, z: -0.3 },
      velocity: { x: 0, y: 0, z: -56 },
      curve: 0,
      spin: 0,
    });

    const result = resolveGloveCollision(current, gloves, previous);

    expect(result.hit).toBe(true);
    expect(result.ball.outcome).toBe("deflected");
    expect(result.ball.velocity.z).toBeGreaterThan(18);
    expect(result.ball.position.z).toBeGreaterThan(1);
    expect(result.contact.swept).toBe(true);
  });

  it("catches a glove sweeping into the ball path between frames", () => {
    const gloves = createGloves();
    gloves.previousCenter = { x: -1.4, y: 1.12, z: 1.05 };
    gloves.center = { x: 0, y: 1.12, z: 1.05 };
    gloves.velocity = { x: 22, y: 0, z: 0 };
    gloves.bodies = [
      {
        side: "left",
        center: { x: -0.34, y: 1.12, z: 1.05 },
        velocity: { ...gloves.velocity },
        radius: 0.7,
      },
      {
        side: "right",
        center: { x: 0.34, y: 1.12, z: 1.05 },
        velocity: { ...gloves.velocity },
        radius: 0.7,
      },
    ];
    const previous = createBall({
      position: { x: -1.3, y: 1.12, z: 2.0 },
      velocity: { x: 0, y: 0, z: -52 },
      curve: 0,
      spin: 0,
    });
    const current = createBall({
      position: { x: -1.3, y: 1.12, z: 0.4 },
      velocity: { x: 0, y: 0, z: -52 },
      curve: 0,
      spin: 0,
    });

    const result = resolveGloveCollision(current, gloves, previous);

    expect(result.hit).toBe(true);
    expect(result.ball.outcome).toBe("deflected");
    expect(result.ball.velocity.x).toBeGreaterThan(3);
    expect(result.ball.velocity.z).toBeGreaterThan(18);
    expect(result.contact.swept).toBe(true);
    expect(result.contact.movingGlove).toBe(true);
  });

  it("transfers glove slap into lateral rebound, spin, and compression", () => {
    const gloves = createGloves();
    const rightGlove = gloves.bodies.find((body) => body.side === "right");
    rightGlove.center = { x: 0.34, y: 1.16, z: 1.05 };
    rightGlove.velocity = { x: 12, y: -1, z: 0 };
    const ball = createBall({
      position: { x: 0.34, y: 1.16, z: 1.08 },
      velocity: { x: -0.4, y: -0.2, z: -48 },
      curve: 0,
      spin: 0,
    });
    const previous = createBall({
      position: { x: 0.32, y: 1.18, z: 2.2 },
      velocity: { x: -0.4, y: -0.2, z: -48 },
      curve: 0,
      spin: 0,
    });

    const result = resolveGloveCollision(ball, gloves, previous);

    expect(result.hit).toBe(true);
    expect(result.ball.velocity.x).toBeGreaterThan(2);
    expect(Math.abs(result.ball.spin)).toBeGreaterThan(1);
    expect(result.contact.compression).toBeGreaterThan(0.2);
    expect(result.contact.reboundSpeed).toBeGreaterThan(30);
  });

  it("uses visible glove parts for edge saves instead of one inflated circle", () => {
    const gloves = createGloves();
    const ball = createBall({
      position: { x: 0.92, y: 1.14, z: 1.08 },
      velocity: { x: 0.2, y: -0.1, z: -46 },
      curve: 0,
      spin: 0,
    });
    const previous = createBall({
      position: { x: 0.92, y: 1.14, z: 2.2 },
      velocity: { x: 0.2, y: -0.1, z: -46 },
      curve: 0,
      spin: 0,
    });

    const result = resolveGloveCollision(ball, gloves, previous);

    expect(result.hit).toBe(true);
    expect(result.ball.outcome).toBe("deflected");
    expect(result.contact.compression).toBeGreaterThan(0.15);
    expect(["palm", "finger", "thumb"]).toContain(result.contact.part);
  });

  it("does not save a ball that only clips the old invisible glove halo", () => {
    const gloves = createGloves();
    const ball = createBall({
      position: { x: 1.08, y: 1.14, z: 1.08 },
      velocity: { x: 0.2, y: -0.1, z: -46 },
      curve: 0,
      spin: 0,
    });
    const previous = createBall({
      position: { x: 1.08, y: 1.14, z: 2.2 },
      velocity: { x: 0.2, y: -0.1, z: -46 },
      curve: 0,
      spin: 0,
    });

    const result = resolveGloveCollision(ball, gloves, previous);

    expect(result.hit).toBe(false);
  });

  it("lets the visible wrist guard block low shots between raised gloves", () => {
    let gloves = createGloves();
    for (let frame = 0; frame < 22; frame += 1) {
      gloves = updateGloves(gloves, { x: 640, y: 360 }, 0.016, {
        width: 1280,
        height: 720,
        inputMode: "mouse",
      });
    }
    const ball = createBall({
      position: { x: 0, y: 1.22, z: 1.08 },
      velocity: { x: 0, y: -0.2, z: -46 },
      curve: 0,
      spin: 0,
    });
    const previous = createBall({
      position: { x: 0, y: 1.22, z: 2.2 },
      velocity: { x: 0, y: -0.2, z: -46 },
      curve: 0,
      spin: 0,
    });

    const result = resolveGloveCollision(ball, gloves, previous);

    expect(result.hit).toBe(true);
    expect(result.contact.part).toBe("wrist");
    expect(result.ball.velocity.z).toBeGreaterThan(14);
  });

  it("classifies a live ball crossing the goal plane as a goal", () => {
    const ball = createBall({
      position: { x: 0, y: 1.2, z: -0.1 },
      velocity: { x: 0, y: 0, z: -20 },
      curve: 0,
      spin: 0,
    });

    expect(didBallEnterGoal(ball)).toBe(true);
  });

  it("keeps a failed save visible as the ball drives into the back net", () => {
    const crossed = createBall({
      position: { x: 0.25, y: 1.25, z: -0.08 },
      velocity: { x: 0.3, y: -0.2, z: -44 },
      curve: 0,
      spin: 3,
    });

    const replayBall = markBallConceded(crossed);
    const beforeNet = integrateBall(replayBall, 0.07);
    const afterNet = integrateBall(replayBall, 0.16);

    expect(replayBall.outcome).toBe("conceded");
    expect(beforeNet.outcome).toBe("conceded");
    expect(beforeNet.position.z).toBeLessThan(0);
    expect(beforeNet.position.z).toBeGreaterThan(FIELD.backNetZ);
    expect(beforeNet.lastContact?.type).not.toBe("back-net");
    expect(afterNet.outcome).toBe("conceded");
    expect(afterNet.goalAge).toBeGreaterThan(0);
    expect(afterNet.position.z).toBeLessThanOrEqual(0);
    expect(afterNet.position.z).toBeGreaterThanOrEqual(-2.65);
    expect(afterNet.velocity.z).toBeGreaterThan(0);
    expect(afterNet.lastContact?.type).toBe("back-net");
  });

  it("starts failed-save replay at the exact goal-plane crossing point", () => {
    const previous = createBall({
      position: { x: -0.42, y: 1.42, z: 0.92 },
      velocity: { x: 0.5, y: -0.12, z: -52 },
      curve: 0,
      spin: 3,
    });
    const current = createBall({
      position: { x: 0.28, y: 1.25, z: -0.88 },
      velocity: { x: 0.5, y: -0.12, z: -52 },
      curve: 0,
      spin: 3,
      age: 0.04,
    });

    const replayBall = resolveGoalEntry(previous, current);

    expect(replayBall?.outcome).toBe("conceded");
    expect(replayBall?.position.z).toBe(0);
    expect(replayBall?.position.x).toBeGreaterThan(-0.1);
    expect(replayBall?.position.x).toBeLessThan(0);
    expect(replayBall?.position.y).toBeGreaterThan(1.3);
    expect(replayBall?.position.y).toBeLessThan(1.4);
  });

  it("keeps failed-save replay visible long enough to read the net impact", () => {
    expect(SHOTS.goalReplayDuration).toBeGreaterThanOrEqual(1.2);
  });

  it("traps a failed save inside the net instead of bouncing back into the field", () => {
    let trapped = markBallConceded(
      createBall({
        position: { x: 1.9, y: 0.82, z: 0 },
        velocity: { x: 2, y: -1, z: -52 },
        curve: 0,
        spin: 3,
      })
    );

    for (let elapsed = 0; elapsed < 1.0; elapsed += 0.016) {
      trapped = integrateBall(trapped, 0.016);
    }

    const projected = projectBall(trapped, { width: 1280, height: 720 });

    expect(trapped.outcome).toBe("conceded");
    expect(trapped.position.z).toBeLessThanOrEqual(-0.9);
    expect(trapped.position.z).toBeGreaterThanOrEqual(FIELD.backNetZ - 0.08);
    expect(trapped.velocity.z).toBeLessThanOrEqual(1.2);
    expect(projected.y).toBeLessThan(720 * 0.7);
  });

  it("keeps a successful save visible while the ball flies away", () => {
    const deflected = createBall({
      position: { x: 0.4, y: 1.35, z: 7.2 },
      velocity: { x: 7.4, y: 2.2, z: 38 },
      curve: 0,
      spin: 6,
      outcome: "deflected",
    });

    const saved = markBallSaved(deflected);
    const replay = integrateBall(saved, 0.2);

    expect(saved.outcome).toBe("saved");
    expect(replay.outcome).toBe("saved");
    expect(replay.saveAge).toBeGreaterThan(0);
    expect(replay.position.z).toBeGreaterThan(saved.position.z);
    expect(projectBall(replay, { width: 1280, height: 720 }).radius).toBeGreaterThan(14);
  });

  it("renders a far launch ball as small and a keeper-plane ball as large", () => {
    const far = createBall({
      position: { x: 0, y: 0.3, z: 36 },
      velocity: { x: 0, y: 0, z: -42 },
      curve: 0,
      spin: 0,
    });
    const near = createBall({
      position: { x: 0, y: 1.2, z: 1 },
      velocity: { x: 0, y: 0, z: -42 },
      curve: 0,
      spin: 0,
    });

    expect(projectBall(far, { width: 1280, height: 720 }).radius).toBeLessThanOrEqual(7);
    expect(projectBall(near, { width: 1280, height: 720 }).radius).toBeGreaterThanOrEqual(42);
  });

  it("projects the far launch ball from the shooter's foot area", () => {
    const far = createBall({
      position: { x: 0, y: 0.25, z: 36 },
      velocity: { x: 0, y: 0, z: -42 },
      curve: 0,
      spin: 0,
    });
    const projected = projectBall(far, { width: 1280, height: 720 });

    expect(projected.x).toBeCloseTo(640, 1);
    expect(projected.y).toBeGreaterThanOrEqual(320);
    expect(projected.y).toBeLessThanOrEqual(380);
  });

  it("keeps projected gloves compact on a 16:9 viewport", () => {
    const gloves = getProjectedGloves(createGloves(), { width: 1280, height: 720 });

    expect(gloves[0].radius).toBeLessThanOrEqual(42);
    expect(gloves[1].radius).toBeLessThanOrEqual(42);
  });

  it("projects the glove midpoint near the drag target so saves feel direct", () => {
    let gloves = createGloves();
    const pointer = { x: 640, y: 360 };
    for (let frame = 0; frame < 22; frame += 1) {
      gloves = updateGloves(gloves, pointer, 0.016, {
        width: 1280,
        height: 720,
        inputMode: "mouse",
      });
    }

    const projected = getProjectedGloves(gloves, { width: 1280, height: 720 });
    const midpoint = {
      x: (projected[0].x + projected[1].x) / 2,
      y: (projected[0].y + projected[1].y) / 2,
    };

    expect(midpoint.x).toBeGreaterThan(pointer.x - 46);
    expect(midpoint.x).toBeLessThan(pointer.x + 46);
    expect(midpoint.y).toBeGreaterThan(pointer.y - 46);
    expect(midpoint.y).toBeLessThan(pointer.y + 46);
  });
});
