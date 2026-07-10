import { describe, expect, it } from "vitest";
import {
  GOAL_NET_GEOMETRY,
  getGoalNetSurfacePoint,
  resolveGoalNetCollision,
} from "../src/physics/goal-net-geometry.js";

function makeNetCollisionState(overrides = {}) {
  return {
    previousPosition: { x: 0, y: 1.2, z: 5.28 },
    position: { x: 0, y: 1.2, z: 5.52 },
    velocity: { x: 0.4, y: 0.2, z: 12 },
    angularVelocity: { x: -8, y: 10, z: 1 },
    radius: 0.11,
    sourceContact: { eventId: 7, type: "glove" },
    ...overrides,
  };
}

describe("shared physical goal net", () => {
  it("does not create an invisible net wall outside the posts or above the crossbar", () => {
    const outsidePost = makeNetCollisionState({
      previousPosition: { x: GOAL_NET_GEOMETRY.halfWidth + 0.04, y: 1.2, z: 5.28 },
      position: { x: GOAL_NET_GEOMETRY.halfWidth + 0.04, y: 1.2, z: 5.52 },
    });
    const aboveCrossbar = makeNetCollisionState({
      previousPosition: { x: 0, y: GOAL_NET_GEOMETRY.height + 0.04, z: 5.28 },
      position: { x: 0, y: GOAL_NET_GEOMETRY.height + 0.04, z: 5.52 },
    });

    const postResult = resolveGoalNetCollision(outsidePost, 1 / 60);
    const crossbarResult = resolveGoalNetCollision(aboveCrossbar, 1 / 60);

    expect(postResult.collided).toBe(false);
    expect(postResult.velocity).toEqual(outsidePost.velocity);
    expect(crossbarResult.collided).toBe(false);
    expect(crossbarResult.velocity).toEqual(aboveCrossbar.velocity);
  });

  it("keeps one stable physical contact while the ball rebounds from the pocket", () => {
    const surface = getGoalNetSurfacePoint({ x: 0, y: 1.2 });
    const first = resolveGoalNetCollision(makeNetCollisionState({
      previousPosition: { x: 0, y: 1.2, z: surface.z - 0.22 },
      position: { x: 0, y: 1.2, z: surface.z - 0.06 },
    }), 1 / 60);

    expect(first.collided).toBe(true);
    expect(first.netContact).toMatchObject({
      eventId: "net:7",
      impactCount: 1,
      fresh: true,
    });

    const next = resolveGoalNetCollision({
      ...makeNetCollisionState(),
      previousPosition: first.position,
      position: { ...first.position, z: first.position.z - 0.03 },
      velocity: first.velocity,
      angularVelocity: first.angularVelocity,
      netContact: first.netContact,
    }, 1 / 60);

    expect(next.collided).toBe(false);
    expect(next.netContact.eventId).toBe(first.netContact.eventId);
    expect(next.netContact.impactCount).toBe(1);
    expect(next.netContact.fresh).toBe(false);
  });
});
