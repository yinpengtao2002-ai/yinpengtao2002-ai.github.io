import { describe, expect, it } from "vitest";
import { createRuntimeLifecycle } from "../src/game/runtime-lifecycle.js";
import { createGameState, startRound, tickRound, togglePause } from "../src/game/game-state.js";

function setup() {
  const documentRef = new EventTarget();
  const windowRef = new EventTarget();
  const callbacks = new Map();
  let id = 0;
  let state = startRound(createGameState());
  let frames = 0;
  documentRef.hidden = false;
  windowRef.requestAnimationFrame = (fn) => { callbacks.set(++id, fn); return id; };
  windowRef.cancelAnimationFrame = (key) => callbacks.delete(key);
  const loop = createRuntimeLifecycle({
    windowRef, documentRef,
    onFrame(dt) { state = tickRound(state, dt); frames++; },
    onInterrupt() { if (!state.paused) state = togglePause(state); },
  });
  return {
    loop, callbacks, windowRef,
    get state() { return state; },
    get frames() { return frames; },
    step(now) { const pending = [...callbacks.values()]; callbacks.clear(); pending.forEach((fn) => fn(now)); },
    visible(visible) { documentRef.hidden = !visible; documentRef.dispatchEvent(new Event("visibilitychange")); },
    resume() { state = togglePause(state); },
  };
}

describe("runtime lifecycle", () => {
  it("freezes match time and rendering while hidden and waits for manual resume", () => {
    const game = setup();
    game.loop.start();
    game.step(1000);
    game.step(1020);
    game.visible(false);
    expect(game.state.paused).toBe(true);
    const timeLeft = game.state.timeLeft;
    expect(game.callbacks.size).toBe(0);
    game.visible(true);
    game.step(12000);
    expect(game.state.timeLeft).toBe(timeLeft);
    expect(game.state.paused).toBe(true);
    game.resume();
    game.step(12020);
    expect(game.state.timeLeft).toBeCloseTo(timeLeft - 0.02);
    game.loop.stop();
  });

  it("does not duplicate animation loops after quick stop/start or repeated start", () => {
    const game = setup();
    game.loop.start();
    game.loop.stop();
    game.loop.start();
    game.loop.start();
    expect(game.callbacks.size).toBe(1);
    game.step(1000);
    expect(game.frames).toBe(1);
    expect(game.callbacks.size).toBe(1);
    game.loop.stop();
    game.windowRef.dispatchEvent(new Event("blur"));
    game.visible(false);
    game.visible(true);
    expect(game.state.paused).toBe(false);
    expect(game.callbacks.size).toBe(0);
  });

  it("pauses on app focus loss but never toggles an already paused match", () => {
    const game = setup();
    game.loop.start();
    game.windowRef.dispatchEvent(new Event("blur"));
    game.visible(false);
    game.visible(true);
    expect(game.state.paused).toBe(true);
    game.loop.stop();
  });

  it("does not render a game started in a hidden tab", () => {
    const game = setup();
    game.visible(false);
    game.loop.start();
    expect(game.callbacks.size).toBe(0);
    expect(game.state.paused).toBe(true);
    game.loop.stop();
  });
});
