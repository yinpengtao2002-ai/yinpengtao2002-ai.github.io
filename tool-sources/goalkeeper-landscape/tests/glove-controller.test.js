import { describe, expect, it } from "vitest";
import {
  TOUCH_GLOVE_OFFSET_PX,
  createGloveController,
  mapPointerToGloveTarget,
  resolveInputPointerWorldTarget,
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

  it("touch follows the finger target immediately on mobile", () => {
    const pointer = { x: 1100, y: 180 };
    const target = mapPointerToGloveTarget(pointer, bounds);
    const touch = updateGloveController(createGloveController(), pointer, 0.016, {
      ...bounds,
      inputMode: "touch",
    });

    expect(touch.center.x).toBeCloseTo(target.x, 5);
    expect(touch.center.y).toBeCloseTo(target.y, 5);
    expect(touch.target.x).toBeCloseTo(target.x, 5);
  });

  it("uses the camera-projected target supplied for each input mode", () => {
    const pointer = { x: 1120, y: 520 };
    const pointerWorldTarget = { x: 2.35, y: 0.14, z: 3.15 };
    const target = mapPointerToGloveTarget(pointer, { ...bounds, pointerWorldTarget });
    const touch = updateGloveController(createGloveController(), pointer, 0.016, {
      ...bounds,
      inputMode: "touch",
      pointerWorldTarget,
    });
    const mouse = updateGloveController(createGloveController(), pointer, 0.016, {
      ...bounds,
      inputMode: "mouse",
      pointerWorldTarget,
    });

    expect(target.x).toBeCloseTo(pointerWorldTarget.x, 5);
    expect(target.y).toBeCloseTo(pointerWorldTarget.y, 5);
    expect(touch.target.x).toBeCloseTo(pointerWorldTarget.x, 5);
    expect(touch.target.y).toBeCloseTo(pointerWorldTarget.y, 5);
    expect(mouse.target.x).toBeCloseTo(pointerWorldTarget.x, 5);
    expect(mouse.target.y).toBeCloseTo(pointerWorldTarget.y, 5);
  });

  it("keeps mouse at zero offset while giving touch a restrained upward offset", () => {
    const direct = { x: 1.4, y: 1.2, z: 3.15 };
    const shifted = { x: 1.4, y: 1.68, z: 3.15 };

    expect(TOUCH_GLOVE_OFFSET_PX).toBe(28);
    expect(resolveInputPointerWorldTarget(direct, shifted, "mouse")).toEqual(direct);
    expect(resolveInputPointerWorldTarget(direct, shifted, "touch")).toEqual(shifted);
  });

  it("keeps a small touch offset at the lower save boundary", () => {
    const direct = { x: -2.8, y: 0.08, z: 3.15 };
    const shifted = { x: -2.8, y: 0.56, z: 3.15 };
    const target = resolveInputPointerWorldTarget(direct, shifted, "touch");

    expect(target.x).toBeCloseTo(direct.x, 5);
    expect(target.y).toBeGreaterThan(direct.y);
    expect(target.y).toBeLessThan(shifted.y);
    expect(target.y).toBeCloseTo(direct.y + (shifted.y - direct.y) * 0.25, 5);
    expect(target.z).toBeCloseTo(direct.z, 5);
  });

  it("mouse still eases into the target instead of snapping", () => {
    const pointer = { x: 1100, y: 180 };
    const target = mapPointerToGloveTarget(pointer, bounds);
    const mouse = updateGloveController(createGloveController(), pointer, 0.016, {
      ...bounds,
      inputMode: "mouse",
    });

    expect(mouse.center.x).toBeGreaterThan(0);
    expect(mouse.center.x).toBeLessThan(target.x);
  });
});
