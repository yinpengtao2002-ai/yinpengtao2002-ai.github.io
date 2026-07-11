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
  it("shows a portrait prompt without rotating the whole game surface", () => {
    const stage = makeStage();
    const windowRef = {
      innerWidth: 390,
      innerHeight: 844,
      matchMedia: () => ({ matches: true }),
    };

    expect(shouldForceMobileLandscape(windowRef)).toBe(false);
    expect(syncMobileLandscape(stage, windowRef)).toBe(false);
    expect(stage.dataset.mobileLandscape).toBe("prompt");
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

  it("requests landscape orientation when the browser exposes a lock API", async () => {
    const lock = vi.fn().mockResolvedValue(undefined);

    await expect(requestLandscapeOrientation({ screen: { orientation: { lock } } })).resolves.toBe(true);
    expect(lock).toHaveBeenCalledWith("landscape");
  });
});
