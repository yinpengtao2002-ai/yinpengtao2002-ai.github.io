import { describe, expect, it } from "vitest";
import { readGamePreferences, saveGamePreferences } from "../src/game/game-preferences.js";

function makeWindow(search = "") {
  const items = new Map();
  return {
    location: { search },
    localStorage: {
      getItem: (key) => items.get(key) ?? null,
      setItem: (key, value) => items.set(key, value),
    },
  };
}

describe("game preferences", () => {
  it("restores separate mode difficulties and explicit disabled switches", () => {
    const windowRef = makeWindow();
    const choices = { mode: "penalty", timedDifficulty: "easy", penaltyDifficulty: "hard", sound: false, assist: false };
    saveGamePreferences(windowRef, choices);
    expect(readGamePreferences(windowRef)).toEqual(choices);
  });

  it("lets a shared URL override only the selected mode's saved difficulty", () => {
    const windowRef = makeWindow("?mode=timed&difficulty=hard");
    saveGamePreferences(windowRef, { mode: "penalty", timedDifficulty: "easy", penaltyDifficulty: "hard" });
    expect(readGamePreferences(windowRef)).toMatchObject({ mode: "timed", timedDifficulty: "hard", penaltyDifficulty: "hard" });
    windowRef.location.search = "?mode=penalty&difficulty=extreme";
    expect(readGamePreferences(windowRef)).toMatchObject({ mode: "penalty", timedDifficulty: "easy", penaltyDifficulty: "extreme" });
  });

  it("ignores invalid saved values and malformed storage without blocking boot", () => {
    const windowRef = makeWindow();
    saveGamePreferences(windowRef, { mode: "unknown", timedDifficulty: "extreme", penaltyDifficulty: "easy", sound: "false", assist: null });
    const defaults = { mode: "timed", timedDifficulty: "medium", penaltyDifficulty: "extreme", sound: true, assist: true };
    expect(readGamePreferences(windowRef)).toEqual(defaults);
    windowRef.localStorage.getItem = () => "{broken";
    expect(readGamePreferences(windowRef)).toEqual(defaults);
  });

  it("works when privacy settings block even the storage getter", () => {
    const windowRef = { location: { search: "?mode=penalty&difficulty=hard" }, get localStorage() { throw new Error("Blocked"); } };
    expect(() => saveGamePreferences(windowRef, { sound: false })).not.toThrow();
    expect(readGamePreferences(windowRef)).toMatchObject({ mode: "penalty", penaltyDifficulty: "hard", sound: true });
  });
});
