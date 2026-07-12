import { describe, expect, it } from "vitest";
import {
  createGameState,
  recordGoal,
  recordMiss,
  recordPenaltyTeamKick,
  recordSave,
  startRound,
  tickRound,
  togglePause,
} from "../src/game/game-state.js";

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

  it("surfaces frame misses without counting them as conceded goals", () => {
    let state = startRound(createGameState());
    state = recordSave(state);

    state = recordMiss(state, "frame");

    expect(state.message).toBe("frame");
    expect(state.conceded).toBe(0);
    expect(state.streak).toBe(0);
    expect(state.bestStreak).toBe(1);
    expect(state.lastSavePoints).toBe(0);
  });

  it("pauses without consuming round time", () => {
    let state = startRound(createGameState());
    state = togglePause(state);
    state = tickRound(state, 10);

    expect(state.timeLeft).toBe(60);
    expect(state.paused).toBe(true);
  });

  it("starts penalty mode without a clock and maps physical outcomes into opponent kicks", () => {
    let state = startRound(createGameState({ mode: "penalty" }), { mode: "penalty" });

    expect(state.mode).toBe("penalty");
    expect(state.timeLeft).toBeNull();
    expect(state.shootout.phase).toBe("defend");

    state = tickRound(state, 90);
    expect(state.ended).toBe(false);
    expect(state.elapsed).toBe(90);

    state = recordSave(state);
    expect(state.shootout.opponentKicks).toEqual(["miss"]);
    expect(state.shootout.phase).toBe("team-kick");

    state = recordPenaltyTeamKick(state, "goal");
    expect(state.shootout.teamKicks).toEqual(["goal"]);
    expect(state.shootout.phase).toBe("defend");
  });

  it("finishes the game state when a penalty shootout winner is decided", () => {
    let state = startRound(createGameState({ mode: "penalty" }), { mode: "penalty" });

    for (let round = 0; round < 3; round += 1) {
      state = recordGoal(state);
      state = recordPenaltyTeamKick(state, "miss");
    }

    expect(state.ended).toBe(true);
    expect(state.running).toBe(false);
    expect(state.endReason).toBe("penalty-loss");
    expect(state.shootout.winner).toBe("opponent");
  });

  it("counts a frame or wide miss as a missed opponent penalty", () => {
    let state = startRound(createGameState({ mode: "penalty" }), { mode: "penalty" });

    state = recordMiss(state, "frame");

    expect(state.message).toBe("frame");
    expect(state.shootout.opponentKicks).toEqual(["miss"]);
    expect(state.shootout.lastEvent).toEqual({ side: "opponent", result: "miss", round: 1 });
  });
});
