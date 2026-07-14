import { describe, expect, it, vi } from "vitest";
import {
  getStageRenderBounds,
  mapClientPointToStage,
  requestLandscapeOrientation,
  shouldForceMobileLandscape,
  syncMobileLandscape,
} from "../src/ui/mobile-landscape.js";

function makeStage({
  clientWidth = 844,
  clientHeight = 390,
  rect = { left: 0, top: 0, width: 390, height: 844 },
  mode,
} = {}) {
  return {
    clientWidth,
    clientHeight,
    dataset: mode ? { mobileLandscape: mode } : {},
    getBoundingClientRect() {
      return rect;
    },
  };
}

describe("mobile landscape helpers", () => {
  it("immediately uses the rotated landscape surface on portrait touch devices", () => {
    const stage = makeStage();
    const windowRef = {
      innerWidth: 390,
      innerHeight: 844,
      matchMedia: () => ({ matches: true }),
    };

    expect(shouldForceMobileLandscape(windowRef)).toBe(true);
    expect(syncMobileLandscape(stage, windowRef)).toBe(true);
    expect(stage.dataset.mobileLandscape).toBe("forced");
  });

  it("keeps native layout for an already-landscape viewport", () => {
    const stage = makeStage();
    const windowRef = {
      innerWidth: 844,
      innerHeight: 390,
      matchMedia: () => ({ matches: true }),
    };

    expect(shouldForceMobileLandscape(windowRef)).toBe(false);
    expect(syncMobileLandscape(stage, windowRef)).toBe(false);
    expect(stage.dataset.mobileLandscape).toBe("native");
  });

  it("uses unrotated stage dimensions for render bounds", () => {
    const stage = makeStage({
      clientWidth: 844,
      clientHeight: 390,
      rect: { left: 0, top: 0, width: 390, height: 844 },
    });

    expect(getStageRenderBounds(stage)).toEqual({ width: 844, height: 390 });
  });

  it("maps touch points through the forced landscape rotation", () => {
    const stage = makeStage({
      clientWidth: 844,
      clientHeight: 390,
      mode: "forced",
      rect: { left: 0, top: 0, width: 390, height: 844 },
    });

    expect(mapClientPointToStage({ clientX: 20, clientY: 160 }, stage)).toEqual({ x: 160, y: 370 });
  });

  it("enters fullscreen before requesting landscape from a portrait touch device", async () => {
    const calls = [];
    const requestFullscreen = vi.fn().mockImplementation(async () => {
      calls.push("fullscreen");
    });
    const lock = vi.fn().mockImplementation(async () => {
      calls.push("landscape");
    });
    const stage = { dataset: {}, requestFullscreen };
    const windowRef = {
      innerWidth: 390,
      innerHeight: 844,
      matchMedia: () => ({ matches: true }),
      document: { fullscreenElement: null },
      screen: { orientation: { lock } },
    };

    await expect(requestLandscapeOrientation(windowRef, stage)).resolves.toBe(true);
    expect(requestFullscreen).toHaveBeenCalledTimes(1);
    expect(lock).toHaveBeenCalledWith("landscape");
    expect(calls).toEqual(["fullscreen", "landscape"]);
    expect(stage.dataset.mobileLandscape).toBe("native");
  });

  it("keeps the automatic rotated surface when orientation locking is unavailable", async () => {
    const stage = makeStage({ mode: "forced" });
    const windowRef = {
      innerWidth: 390,
      innerHeight: 844,
      matchMedia: () => ({ matches: true }),
      screen: { orientation: {} },
    };

    await expect(requestLandscapeOrientation(windowRef, stage)).resolves.toBe(false);
    expect(stage.dataset.mobileLandscape).toBe("forced");
    expect(syncMobileLandscape(stage, windowRef)).toBe(true);
    expect(stage.dataset.mobileLandscape).toBe("forced");
  });

  it("keeps the automatic rotated surface when a zero-click request is rejected", async () => {
    const requestFullscreen = vi.fn().mockRejectedValue(new Error("gesture required"));
    const lock = vi.fn().mockRejectedValue(new Error("gesture required"));
    const stage = makeStage({ mode: "forced" });
    stage.requestFullscreen = requestFullscreen;
    const windowRef = {
      innerWidth: 390,
      innerHeight: 844,
      matchMedia: () => ({ matches: true }),
      document: { fullscreenElement: null },
      screen: { orientation: { lock } },
    };

    await expect(requestLandscapeOrientation(windowRef, stage)).resolves.toBe(false);
    expect(requestFullscreen).toHaveBeenCalledTimes(1);
    expect(lock).toHaveBeenCalledWith("landscape");
    expect(stage.dataset.mobileLandscape).toBe("forced");
  });

  it("does not fullscreen an already-landscape viewport", async () => {
    const requestFullscreen = vi.fn().mockResolvedValue(undefined);
    const lock = vi.fn().mockResolvedValue(undefined);
    const windowRef = {
      innerWidth: 844,
      innerHeight: 390,
      matchMedia: () => ({ matches: true }),
      screen: { orientation: { lock } },
    };

    await expect(requestLandscapeOrientation(windowRef, { requestFullscreen })).resolves.toBe(false);
    expect(requestFullscreen).not.toHaveBeenCalled();
    expect(lock).not.toHaveBeenCalled();
  });
});
