import { describe, expect, it } from "vitest";
import {
  createGloveController,
  mapPointerToGloveTarget,
  updateGloveController,
} from "../src/input/glove-controller.js";

const bounds = { width: 1280, height: 720 };

describe("3D glove controller", () => {
  it("maps pointer position into a wider free goalkeeper reach", () => {
    const leftLow = mapPointerToGloveTarget({ x: 0, y: 720 }, bounds);
    const rightHigh = mapPointerToGloveTarget({ x: 1280, y: 0 }, bounds);
    const center = mapPointerToGloveTarget({ x: 640, y: 360 }, bounds);

    expect(leftLow.x).toBeLessThan(-4);
    expect(leftLow.y).toBeLessThan(0.18);
    expect(rightHigh.x).toBeGreaterThan(4);
    expect(rightHigh.y).toBeGreaterThan(3.25);
    expect(center.x).toBeCloseTo(0, 2);
    expect(center.z).toBeGreaterThan(3);
  });

  it("keeps the gloves smaller than the full goal width", () => {
    const target = mapPointerToGloveTarget({ x: 640, y: 360 }, bounds);

    expect(target.left.x).toBeLessThan(target.right.x);
    expect(target.right.x - target.left.x).toBeLessThan(0.64);
    expect(target.colliderRadius).toBeLessThanOrEqual(0.21);
  });

  it("mouse follows the target more directly than touch", () => {
    const mouse = updateGloveController(createGloveController(), { x: 1100, y: 180 }, 0.016, {
      ...bounds,
      inputMode: "mouse",
    });
    const touch = updateGloveController(createGloveController(), { x: 1100, y: 180 }, 0.016, {
      ...bounds,
      inputMode: "touch",
    });

    expect(mouse.center.x).toBeGreaterThan(touch.center.x);
    expect(mouse.center.y).toBeGreaterThan(touch.center.y);
    expect(mouse.velocity.x).toBeGreaterThan(touch.velocity.x);
  });
});
