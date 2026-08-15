import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  createContextRecoveryReloadFallback,
  createWebGLContextRecovery,
} from "../src/three/webgl-context-recovery.js";

function createCanvasHarness() {
  var listeners = new Map();
  return {
    canvas: {
      addEventListener(type, listener) {
        listeners.set(type, listener);
      },
      removeEventListener(type, listener) {
        if (listeners.get(type) === listener) listeners.delete(type);
      },
    },
    dispatch(type, event = {}) {
      listeners.get(type)?.(event);
    },
    listenerCount() {
      return listeners.size;
    },
  };
}

describe("WebGL context recovery", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("restores a lost canvas and cancels the hard-reload fallback", () => {
    var harness = createCanvasHarness();
    var restoreContext = vi.fn();
    var onRestored = vi.fn();
    var onRecoveryTimeout = vi.fn();
    var preventDefault = vi.fn();
    var stage = { dataset: { bootStatus: "started" } };
    var contextLost = false;
    var windowRef = {
      goalkeeperBootStatus: "started",
      setTimeout,
      clearTimeout,
    };

    var recovery = createWebGLContextRecovery({
      canvas: harness.canvas,
      context: {
        getExtension(name) {
          return name === "WEBGL_lose_context" && !contextLost ? { restoreContext } : null;
        },
      },
      stage,
      windowRef,
      restoreDelayMs: 120,
      fallbackDelayMs: 2_000,
      onRestored,
      onRecoveryTimeout,
    });

    contextLost = true;
    harness.dispatch("webglcontextlost", { preventDefault });
    expect(preventDefault).toHaveBeenCalledTimes(1);
    expect(stage.dataset.bootStatus).toBe("context-lost");

    vi.advanceTimersByTime(120);
    expect(restoreContext).toHaveBeenCalledTimes(1);
    expect(stage.dataset.bootStatus).toBe("context-restoring");

    harness.dispatch("webglcontextrestored");
    vi.runOnlyPendingTimers();

    expect(stage.dataset.bootStatus).toBe("started");
    expect(windowRef.goalkeeperBootStatus).toBe("started");
    expect(onRestored).toHaveBeenCalledTimes(1);
    expect(onRecoveryTimeout).not.toHaveBeenCalled();

    recovery.dispose();
    expect(harness.listenerCount()).toBe(0);
  });

  it("uses the fallback when the browser cannot restore the canvas", () => {
    var harness = createCanvasHarness();
    var onRecoveryTimeout = vi.fn();
    var stage = { dataset: { bootStatus: "started" } };

    createWebGLContextRecovery({
      canvas: harness.canvas,
      context: { getExtension: () => null },
      stage,
      windowRef: { goalkeeperBootStatus: "started", setTimeout, clearTimeout },
      restoreDelayMs: 100,
      fallbackDelayMs: 800,
      onRecoveryTimeout,
    });

    harness.dispatch("webglcontextlost", { preventDefault() {} });
    vi.advanceTimersByTime(800);

    expect(stage.dataset.bootStatus).toBe("context-recovery-failed");
    expect(onRecoveryTimeout).toHaveBeenCalledTimes(1);
  });

  it("allows one automatic reload inside the recovery cooldown", () => {
    var values = new Map();
    var reload = vi.fn();
    var stage = { dataset: {} };
    var now = 10_000;
    var windowRef = {
      location: { reload },
      sessionStorage: {
        getItem(key) {
          return values.get(key) || null;
        },
        setItem(key, value) {
          values.set(key, value);
        },
      },
    };

    var firstFallback = createContextRecoveryReloadFallback({
      windowRef,
      stage,
      now: () => now,
      cooldownMs: 15_000,
    });
    expect(firstFallback()).toBe(true);
    expect(reload).toHaveBeenCalledTimes(1);
    expect(stage.dataset.bootStatus).toBe("context-reloading");

    now += 1_000;
    var repeatedFallback = createContextRecoveryReloadFallback({
      windowRef,
      stage,
      now: () => now,
      cooldownMs: 15_000,
    });
    expect(repeatedFallback()).toBe(false);
    expect(reload).toHaveBeenCalledTimes(1);
    expect(stage.dataset.bootStatus).toBe("context-recovery-failed");
  });
});
