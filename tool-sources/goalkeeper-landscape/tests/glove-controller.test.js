import { describe, expect, it } from "vitest";
import * as THREE from "three";
import {
  GLOVE_3D,
  TOUCH_GLOVE_MAX_HEIGHT_RATIO,
  TOUCH_GLOVE_OFFSET_PX,
  createGloveController,
  getTouchGlovePointer,
  mapPointerToGloveTarget,
  resolveInputPointerWorldTarget,
  updateGloveController,
} from "../src/input/glove-controller.js";
import {
  SCENE_TUNING,
  projectPointerToWorldPlane,
  projectWorldPointToScreen,
} from "../src/three/goalkeeper-scene.js";

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

  it("keeps mouse at zero offset while moving the mobile glove clearly above the finger", () => {
    const mobileBounds = { width: 844, height: 390 };
    const pointer = { x: 422, y: 195 };
    const touchPointer = getTouchGlovePointer(pointer, mobileBounds, "touch");

    expect(TOUCH_GLOVE_OFFSET_PX).toBe(76);
    expect(TOUCH_GLOVE_MAX_HEIGHT_RATIO).toBe(0.22);
    expect(getTouchGlovePointer(pointer, mobileBounds, "mouse")).toEqual(pointer);
    expect(touchPointer.x).toBe(pointer.x);
    expect(pointer.y - touchPointer.y).toBeGreaterThanOrEqual(70);
  });

  it("caps the touch offset on very short landscape screens", () => {
    const shortBounds = { width: 640, height: 240 };
    const pointer = { x: 320, y: 160 };
    const touchPointer = getTouchGlovePointer(pointer, shortBounds, "touch");

    expect(pointer.y - touchPointer.y).toBeCloseTo(240 * TOUCH_GLOVE_MAX_HEIGHT_RATIO, 5);
    expect(touchPointer.y).toBeGreaterThan(0);
  });

  it("keeps both mobile bottom corners reachable with the larger finger offset", () => {
    const mobileBounds = { width: 844, height: 390 };
    const camera = new THREE.PerspectiveCamera(
      SCENE_TUNING.camera.fov,
      mobileBounds.width / mobileBounds.height,
      0.05,
      90,
    );
    camera.position.set(
      SCENE_TUNING.camera.position.x,
      SCENE_TUNING.camera.position.y,
      SCENE_TUNING.camera.position.z,
    );
    camera.lookAt(new THREE.Vector3(
      SCENE_TUNING.camera.lookAt.x,
      SCENE_TUNING.camera.lookAt.y,
      SCENE_TUNING.camera.lookAt.z,
    ));
    camera.updateProjectionMatrix();
    camera.updateMatrixWorld();

    for (const x of [0, mobileBounds.width]) {
      const pointer = { x, y: mobileBounds.height };
      const shiftedPointer = getTouchGlovePointer(pointer, mobileBounds, "touch");
      const direct = projectPointerToWorldPlane(camera, pointer, mobileBounds, GLOVE_3D.planeZ);
      const shifted = projectPointerToWorldPlane(camera, shiftedPointer, mobileBounds, GLOVE_3D.planeZ);
      const resolved = resolveInputPointerWorldTarget(direct, shifted, "touch");
      const target = mapPointerToGloveTarget(pointer, {
        ...mobileBounds,
        pointerWorldTarget: resolved,
      });
      const screenPoint = projectWorldPointToScreen(camera, target, mobileBounds);

      expect(target.y).toBeCloseTo(GLOVE_3D.minY, 5);
      expect(Math.abs(target.x)).toBeGreaterThan(4);
      expect(screenPoint.y).toBeLessThan(pointer.y);
    }
  });

  it("uses the full touch projection after applying the reach-safe screen offset", () => {
    const direct = { x: 1.4, y: 1.2, z: 3.15 };
    const shifted = { x: 1.4, y: 1.68, z: 3.15 };

    expect(resolveInputPointerWorldTarget(direct, shifted, "mouse")).toEqual(direct);
    expect(resolveInputPointerWorldTarget(direct, shifted, "touch")).toEqual(shifted);
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
