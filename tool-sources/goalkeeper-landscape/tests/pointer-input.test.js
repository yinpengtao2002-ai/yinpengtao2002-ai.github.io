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
    setPointerCapture() {
      throw new Error("No active pointer");
    },
    dispatch(type, event) {
      listeners[type](event);
    },
  };
}

describe("pointer input", () => {
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
