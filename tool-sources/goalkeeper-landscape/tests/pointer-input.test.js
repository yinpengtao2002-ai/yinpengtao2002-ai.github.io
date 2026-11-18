import { describe, expect, it } from "vitest";
import { createPointerInput } from "../src/input/pointer-input.js";

function createFakeStage() {
  var listeners = {};
  return {
    dataset: { mobileLandscape: "forced" },
    clientWidth: 844,
    clientHeight: 390,
    getBoundingClientRect() {
      return { left: 0, top: 0, width: 390, height: 844 };
    },
    addEventListener(type, listener) {
      listeners[type] = listener;
    },
    removeEventListener(type, listener) {
      if (listeners[type] === listener) delete listeners[type];
    },
    setPointerCapture() {
      throw new Error("No active pointer");
    },
    dispatch(type, event) {
      listeners[type]?.(event);
    },
  };
}

describe("pointer input", () => {
  const bounds = { width: 844, height: 390 };
  const touch = (id, x, y) => ({ pointerId: id, clientX: x, clientY: y, pointerType: "touch", preventDefault() {} });

  it("keeps the first finger in control until release or cancellation", () => {
    const stage = createFakeStage();
    const input = createPointerInput(stage);
    stage.dispatch("pointerdown", touch(1, 40, 720));
    stage.dispatch("pointerdown", touch(2, 300, 100));
    stage.dispatch("pointermove", touch(2, 305, 115));
    stage.dispatch("pointerup", touch(2, 305, 115));
    expect(input.getPointer(bounds)).toEqual({ x: 720, y: 350 });
    stage.dispatch("pointermove", touch(1, 45, 715));
    expect(input.getPointer(bounds)).toEqual({ x: 715, y: 345 });
    stage.dispatch("pointercancel", touch(1, 45, 715));
    stage.dispatch("pointermove", touch(1, 0, 0));
    expect(input.getPointer(bounds)).toEqual({ x: 715, y: 345 });
    stage.dispatch("pointerdown", touch(3, 12, 28));
    expect(input.getPointer(bounds)).toEqual({ x: 28, y: 378 });
  });

  it("keeps the active finger under its screen position across resize", () => {
    const stage = createFakeStage();
    const input = createPointerInput(stage);
    input.resize(bounds);
    stage.dispatch("pointerdown", touch(9, 70, 720));
    stage.getBoundingClientRect = () => ({ left: 10, top: 20, width: 390, height: 844 });
    input.resize(bounds);
    expect(input.getPointer(bounds)).toEqual({ x: 700, y: 330 });
  });

  it("stops reacting to old stage events after leaving the game", () => {
    const stage = createFakeStage();
    const input = createPointerInput(stage);
    const before = input.getPointer({ width: 844, height: 390 });
    expect(input.dispose).toBeTypeOf("function");
    input.dispose();
    stage.dispatch("pointermove", { clientX: 70, clientY: 720, preventDefault() {} });
    expect(input.getPointer({ width: 844, height: 390 })).toEqual(before);
  });
  it("keeps synthetic mobile touches usable when pointer capture is unavailable", () => {
    const stage = createFakeStage();
    const input = createPointerInput(stage);
    const event = {
      clientX: 70,
      clientY: 720,
      pointerId: 9,
      pointerType: "touch",
      target: { closest: () => null },
      preventDefault() {},
    };

    expect(() => stage.dispatch("pointerdown", event)).not.toThrow();

    expect(input.getMode()).toBe("touch");
    expect(input.getPointer({ width: 844, height: 390 })).toEqual({ x: 720, y: 320 });
  });
});
