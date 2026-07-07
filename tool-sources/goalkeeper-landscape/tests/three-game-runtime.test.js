import { describe, expect, it } from "vitest";
import {
  getLingeringBallDurationForOutcome,
  getNextShotDelayForOutcome,
  getReplayDurationForOutcome,
} from "../src/game/three-game-runtime.js";

describe("three game runtime timing", () => {
  it("keeps blocked saves visible without making the next shot wait five seconds", () => {
    expect(getLingeringBallDurationForOutcome("save")).toBe(5);
    expect(getNextShotDelayForOutcome("save")).toBeLessThan(1);
    expect(getNextShotDelayForOutcome("save")).toBeLessThan(getLingeringBallDurationForOutcome("save"));
    expect(getReplayDurationForOutcome("goal")).toBeCloseTo(1.08);
    expect(getReplayDurationForOutcome("miss")).toBeCloseTo(0.58);
  });
});
