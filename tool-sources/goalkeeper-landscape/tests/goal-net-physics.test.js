import { describe, expect, it } from "vitest";
import {
  GOAL_CAGE_POINTS,
  GOAL_FRAME_SEGMENTS,
  GOAL_NET_GRID,
  GOAL_NET_GEOMETRY,
  getGoalNetPocketVertex,
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
      "rear-top-rail",
      "bottom-left-rail",
      "bottom-right-rail",
      "rear-bottom-rail",
    ]);
    expect(GOAL_FRAME_SEGMENTS.every((segment) => segment.start && segment.end)).toBe(true);
    expect(GOAL_FRAME_SEGMENTS.find((segment) => segment.name === "top-left-rail")).toMatchObject({
      start: GOAL_CAGE_POINTS.frontTopLeft,
      end: GOAL_CAGE_POINTS.rearTopLeft,
    });
    expect(GOAL_FRAME_SEGMENTS.find((segment) => segment.name === "rear-top-rail")).toMatchObject({
      start: GOAL_CAGE_POINTS.rearTopLeft,
      end: GOAL_CAGE_POINTS.rearTopRight,
    });
  });

  it("keeps every rear net boundary vertex fixed to the shared rear frame", () => {
    const halfWidth = GOAL_NET_GEOMETRY.halfWidth;
    const halfHeight = GOAL_NET_GEOMETRY.rearHeight * 0.5;
    const rearDepth = GOAL_NET_GEOMETRY.cageDepth - GOAL_NET_GEOMETRY.shellOffsetZ;

    [-halfHeight, -halfHeight * 0.5, 0, halfHeight * 0.5, halfHeight].forEach((localY) => {
      [-halfWidth, halfWidth].forEach((localX) => {
        const vertex = getGoalNetPocketVertex(localX, localY);
        expect(vertex.x).toBeCloseTo(localX, 8);
        expect(vertex.y).toBeCloseTo(localY, 8);
        expect(vertex.z).toBeCloseTo(rearDepth, 8);
      });
    });

    [-halfWidth, -halfWidth * 0.5, 0, halfWidth * 0.5, halfWidth].forEach((localX) => {
      [-halfHeight, halfHeight].forEach((localY) => {
        const vertex = getGoalNetPocketVertex(localX, localY);
        expect(vertex.x).toBeCloseTo(localX, 8);
        expect(vertex.y).toBeCloseTo(localY, 8);
        expect(vertex.z).toBeCloseTo(rearDepth, 8);
      });
    });
  });

  it("derives every visible panel grid from one mobile-safe cell size", () => {
    expect(GOAL_NET_GRID.targetCellSize).toBeGreaterThanOrEqual(0.28);
    expect(GOAL_NET_GRID.targetCellSize).toBeLessThanOrEqual(0.32);
    expect(GOAL_NET_GRID.widthDivisions).toBe(
      Math.round((GOAL_NET_GEOMETRY.halfWidth * 2) / GOAL_NET_GRID.targetCellSize),
    );
    expect(GOAL_NET_GRID.depthDivisions).toBe(
      Math.round(GOAL_NET_GEOMETRY.cageDepth / GOAL_NET_GRID.targetCellSize),
    );
    expect(GOAL_NET_GRID.rearHeightDivisions).toBe(
      Math.round(GOAL_NET_GEOMETRY.rearHeight / GOAL_NET_GRID.targetCellSize),
    );
  });

  it.each([
    {
      panel: "rear",
      previousPosition: { x: 0, y: 1, z: getGoalNetSurfacePoint({ x: 0, y: 1 }).z - 0.2 },
      position: { x: 0, y: 1, z: getGoalNetSurfacePoint({ x: 0, y: 1 }).z + 0.04 },
      velocity: { x: 0, y: 0, z: 16 },
    },
    {
      panel: "left",
      previousPosition: {
        x: -GOAL_NET_GEOMETRY.halfWidth + 0.2,
        y: 1,
        z: GOAL_NET_GEOMETRY.netPlaneZ + 0.8,
      },
      position: {
        x: -GOAL_NET_GEOMETRY.halfWidth - 0.04,
        y: 1,
        z: GOAL_NET_GEOMETRY.netPlaneZ + 1,
      },
      velocity: { x: -12, y: 0, z: 10 },
    },
    {
      panel: "right",
      previousPosition: {
        x: GOAL_NET_GEOMETRY.halfWidth - 0.2,
        y: 1,
        z: GOAL_NET_GEOMETRY.netPlaneZ + 0.8,
      },
      position: {
        x: GOAL_NET_GEOMETRY.halfWidth + 0.04,
        y: 1,
        z: GOAL_NET_GEOMETRY.netPlaneZ + 1,
      },
      velocity: { x: 12, y: 0, z: 10 },
    },
    {
      panel: "top",
      previousPosition: {
        x: 0,
        y: getGoalRoofHeightAtZ(GOAL_NET_GEOMETRY.netPlaneZ + 1) - 0.2,
        z: GOAL_NET_GEOMETRY.netPlaneZ + 0.9,
      },
      position: {
        x: 0,
        y: getGoalRoofHeightAtZ(GOAL_NET_GEOMETRY.netPlaneZ + 1) + 0.04,
        z: GOAL_NET_GEOMETRY.netPlaneZ + 1,
      },
      velocity: { x: 0, y: 12, z: 5 },
    },
  ])("resolves a swept ball against the $panel net panel", ({ panel, ...shot }) => {
    const result = resolveGoalNetCollision(makeNetCollisionState(shot), 1 / 60);

    expect(result.collided).toBe(true);
    expect(result.panel).toBe(panel);
    expect(result.netContact).toMatchObject({
      panel,
      impactCount: 1,
      fresh: true,
    });
  });

  it("selects one panel and emits one contact when a ball reaches a net seam", () => {
    const z = GOAL_NET_GEOMETRY.netPlaneZ + 1.3;
    const roof = getGoalRoofHeightAtZ(z);
    const first = resolveGoalNetCollision(makeNetCollisionState({
      previousPosition: {
        x: GOAL_NET_GEOMETRY.halfWidth - 0.2,
        y: roof - 0.2,
        z: z - 0.1,
      },
      position: {
        x: GOAL_NET_GEOMETRY.halfWidth + 0.04,
        y: roof + 0.04,
        z,
      },
      velocity: { x: 12, y: 12, z: 5 },
    }), 1 / 60);

    expect(first.collided).toBe(true);
    expect(["right", "top"]).toContain(first.panel);
    expect(first.netContact.impactCount).toBe(1);

    const second = resolveGoalNetCollision(makeNetCollisionState({
      previousPosition: first.position,
      position: {
        x: first.position.x + 0.01,
        y: first.position.y + 0.01,
        z: first.position.z + 0.01,
      },
      velocity: first.velocity,
      angularVelocity: first.angularVelocity,
      netContact: first.netContact,
    }), 1 / 120);

    expect(second.collided).toBe(false);
    expect(second.netContact.eventId).toBe(first.netContact.eventId);
    expect(second.netContact.impactCount).toBe(1);
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
