import { describe, expect, it } from "vitest";
import { createGameState, recordGoal, recordSave, startRound, tickRound, togglePause } from "../src/game/game-state.js";

describe("game state", () => {
  it("starts a 60 second round and ends after time expires", () => {
    let state = startRound(createGameState());
    expect(state.running).toBe(true);
    expect(state.timeLeft).toBe(60);

    state = tickRound(state, 60.1);

    expect(state.running).toBe(false);
    expect(state.ended).toBe(true);
    expect(state.endReason).toBe("time");
  });

  it("adds score for saves and ends after five conceded goals", () => {
    let state = startRound(createGameState());
    state = recordSave(state);
    expect(state.score).toBeGreaterThan(0);

    for (let i = 0; i < 5; i += 1) {
      state = recordGoal(state);
    }

    expect(state.conceded).toBe(5);
    expect(state.ended).toBe(true);
    expect(state.endReason).toBe("conceded");
  });

  it("rewards save streaks and resets the streak after a goal", () => {
    let state = startRound(createGameState());

    state = recordSave(state);
    expect(state.streak).toBe(1);
    expect(state.bestStreak).toBe(1);
    expect(state.lastSavePoints).toBe(100);

    state = recordSave(state);
    expect(state.streak).toBe(2);
    expect(state.bestStreak).toBe(2);
    expect(state.lastSavePoints).toBeGreaterThan(100);
    expect(state.score).toBe(225);

    state = recordGoal(state);
    expect(state.streak).toBe(0);
    expect(state.bestStreak).toBe(2);
  });

  it("pauses without consuming round time", () => {
    let state = startRound(createGameState());
    state = togglePause(state);
    state = tickRound(state, 10);

    expect(state.timeLeft).toBe(60);
    expect(state.paused).toBe(true);
  });
});
