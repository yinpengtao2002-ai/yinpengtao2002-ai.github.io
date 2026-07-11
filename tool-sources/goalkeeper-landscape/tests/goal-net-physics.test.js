import { describe, expect, it } from "vitest";
import {
  GOAL_CAGE_POINTS,
  GOAL_FRAME_SEGMENTS,
  GOAL_NET_GEOMETRY,
  getGoalNetSurfacePoint,
  getGoalRoofHeightAtZ,
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
  it("defines a balanced front-high rear-low trapezoid from shared points", () => {
    const rearZ = GOAL_NET_GEOMETRY.netPlaneZ + GOAL_NET_GEOMETRY.cageDepth;

    expect(GOAL_NET_GEOMETRY.rearHeight).toBe(1.95);
    expect(GOAL_NET_GEOMETRY.cageDepth).toBe(2.05);
    expect(GOAL_CAGE_POINTS.frontTopLeft).toEqual({
      x: -GOAL_NET_GEOMETRY.halfWidth,
      y: GOAL_NET_GEOMETRY.height,
      z: GOAL_NET_GEOMETRY.netPlaneZ,
    });
    expect(GOAL_CAGE_POINTS.rearTopLeft).toEqual({
      x: -GOAL_NET_GEOMETRY.halfWidth,
      y: GOAL_NET_GEOMETRY.rearHeight,
      z: rearZ,
    });
    expect(GOAL_CAGE_POINTS.rearTopRight.x).toBe(GOAL_NET_GEOMETRY.halfWidth);
    expect(getGoalRoofHeightAtZ(GOAL_NET_GEOMETRY.netPlaneZ)).toBe(GOAL_NET_GEOMETRY.height);
    expect(getGoalRoofHeightAtZ(rearZ)).toBe(GOAL_NET_GEOMETRY.rearHeight);
  });

  it("derives every visible and physical frame member from the cage corners", () => {
    expect(GOAL_FRAME_SEGMENTS.map((segment) => segment.name)).toEqual([
      "crossbar",
      "front-left-post",
      "front-right-post",
      "top-left-rail",
      "top-right-rail",
      "rear-left-upright",
      "rear-right-upright",
      "bottom-left-rail",
      "bottom-right-rail",
      "rear-bottom-rail",
    ]);
    expect(GOAL_FRAME_SEGMENTS.every((segment) => segment.start && segment.end)).toBe(true);
    expect(GOAL_FRAME_SEGMENTS.find((segment) => segment.name === "top-left-rail")).toMatchObject({
      start: GOAL_CAGE_POINTS.frontTopLeft,
      end: GOAL_CAGE_POINTS.rearTopLeft,
    });
  });

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
