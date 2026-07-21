import { describe, expect, it, vi } from "vitest";

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
    dispose: vi.fn(),
  },
  scene: {
    dispose: vi.fn(),
  },
}));

vi.mock("../src/audio/audio-engine.js", () => ({
  createAudioEngine: () => fakes.audio,
}));

vi.mock("../src/input/pointer-input.js", () => ({
  createPointerInput: () => ({}),
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
  return {
    getElementById(id) {
      if (!elements.has(id)) elements.set(id, createElement());
      return elements.get(id);
    },
    querySelectorAll() {
      return [];
    },
  };
}

describe("runtime disposal", () => {
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

    runtime.dispose();
    documentRef.getElementById("restartButton").click();

    expect(fakes.audio.startMusic).not.toHaveBeenCalled();
    expect(runtime.getState().running).toBe(false);
  });
});
