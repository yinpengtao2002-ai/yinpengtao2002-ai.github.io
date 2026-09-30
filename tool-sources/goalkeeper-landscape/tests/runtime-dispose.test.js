import { beforeEach, describe, expect, it, vi } from "vitest";

const fakes = vi.hoisted(() => ({
  audio: {
    prime: vi.fn(),
    startMusic: vi.fn(),
    setMusicPaused: vi.fn(),
    stopMusic: vi.fn(),
    isEnabled: vi.fn(() => true),
    getStatus: vi.fn(() => "ready"),
    getMusicStatus: vi.fn(() => "stopped"),
    toggle: vi.fn(),
    play: vi.fn(),
    playEvent: vi.fn(),
  },
  physics: {
    setSaveAssist: vi.fn(),
    resetBall: vi.fn(),
    getBallState: () => null,
    getGloveState: () => ({}),
    dispose: vi.fn(),
  },
  scene: {
    resize: vi.fn(),
    updateVisuals: vi.fn(),
    dispose: vi.fn(),
  },
}));

vi.mock("../src/audio/audio-engine.js", () => ({
  createAudioEngine: () => fakes.audio,
}));

vi.mock("../src/physics/rapier-world.js", () => ({
  createRapierGoalkeeperWorld: async () => fakes.physics,
}));

vi.mock("../src/three/goalkeeper-scene.js", () => ({
  createGoalkeeperScene: () => fakes.scene,
}));

vi.mock("../src/ui/mobile-landscape.js", () => ({
  getStageRenderBounds: () => ({ width: 1280, height: 720 }),
  requestLandscapeOrientation: () => Promise.resolve(),
  shouldForceMobileLandscape: () => false,
  syncMobileLandscape: () => false,
}));

import { createThreeGameRuntime } from "../src/game/three-game-runtime.js";

function createElement() {
  const listeners = new Map();
  return {
    attributes: {},
    classList: {
      toggle() {},
    },
    dataset: {},
    style: {},
    textContent: "",
    addEventListener(name, listener) {
      if (!listeners.has(name)) listeners.set(name, new Set());
      listeners.get(name).add(listener);
    },
    removeEventListener(name, listener) {
      listeners.get(name)?.delete(listener);
    },
    click() {
      listeners.get("click")?.forEach((listener) => listener({ currentTarget: this }));
    },
    listenerCount(name) {
      return listeners.get(name)?.size || 0;
    },
    getAttribute(name) {
      return this.attributes[name];
    },
    setAttribute(name, value) {
      this.attributes[name] = value;
    },
  };
}

function createDocument() {
  const elements = new Map();
  return Object.assign(new EventTarget(), {
    hidden: false,
    getElementById(id) {
      if (!elements.has(id)) elements.set(id, createElement());
      return elements.get(id);
    },
    querySelectorAll() {
      return [];
    },
  });
}

describe("runtime disposal", () => {
  beforeEach(() => vi.clearAllMocks());

  it.each(["timed", "penalty"])("pauses a %s match and music on app switching, until the player resumes", async (mode) => {
    const documentRef = createDocument();
    const windowRef = Object.assign(new EventTarget(), {
      location: { hostname: "example.com", search: "?mode=" + mode },
      requestAnimationFrame: () => 1,
      cancelAnimationFrame() {},
    });
    const runtime = await createThreeGameRuntime({ canvas: createElement(), stage: documentRef.getElementById("stage"), documentRef, windowRef });
    runtime.start();
    runtime.resetRound();
    windowRef.dispatchEvent(new Event("blur"));
    const pausedState = runtime.getState();
    expect(pausedState.paused).toBe(true);
    expect(fakes.audio.setMusicPaused).toHaveBeenLastCalledWith(true);
    documentRef.hidden = true;
    documentRef.dispatchEvent(new Event("visibilitychange"));
    documentRef.hidden = false;
    documentRef.dispatchEvent(new Event("visibilitychange"));
    expect(runtime.getState()).toEqual(pausedState);
    documentRef.getElementById("pauseResumeButton").click();
    expect(runtime.getState().paused).toBe(false);
    expect(fakes.audio.setMusicPaused).toHaveBeenLastCalledWith(false);
    runtime.dispose();
    windowRef.dispatchEvent(new Event("blur"));
    expect(runtime.getState().paused).toBe(false);
  });

  it("keeps a disposed runtime inactive when the shared restart button is clicked", async () => {
    const documentRef = createDocument();
    const stage = documentRef.getElementById("stage");
    const windowRef = {
      location: { hostname: "example.com", search: "" },
      addEventListener() {},
      removeEventListener() {},
    };
    const runtime = await createThreeGameRuntime({
      canvas: createElement(),
      stage,
      documentRef,
      windowRef,
    });

    const restartButton = documentRef.getElementById("restartButton");
    expect(restartButton.listenerCount("click")).toBe(1);

    runtime.dispose();
    expect(restartButton.listenerCount("click")).toBe(0);
    restartButton.click();

    expect(fakes.audio.startMusic).not.toHaveBeenCalled();
    expect(runtime.getState().running).toBe(false);
  });
});
