import { describe, expect, it } from "vitest";
import { getReplayDurationForOutcome } from "../src/game/three-game-runtime.js";

describe("three game runtime timing", () => {
  it("keeps blocked saves visible for five seconds before the next shot", () => {
    expect(getReplayDurationForOutcome("save")).toBe(5);
    expect(getReplayDurationForOutcome("goal")).toBeCloseTo(1.08);
    expect(getReplayDurationForOutcome("miss")).toBeCloseTo(0.58);
  });
});
