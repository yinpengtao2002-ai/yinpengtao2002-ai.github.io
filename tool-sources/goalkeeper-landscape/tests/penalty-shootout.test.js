import { describe, expect, it } from "vitest";
import {
  createPenaltyShootout,
  recordOpponentPenalty,
  recordTeamPenalty,
  simulateTeamPenalty,
} from "../src/game/penalty-shootout.js";

function playPair(shootout, opponentResult, teamResult) {
  return recordTeamPenalty(recordOpponentPenalty(shootout, opponentResult), teamResult);
}

describe("penalty shootout", () => {
  it("alternates a defended opponent kick with an automatically resolved team kick", () => {
    let shootout = createPenaltyShootout();

    expect(shootout.phase).toBe("defend");
    expect(shootout.round).toBe(1);

    shootout = recordOpponentPenalty(shootout, "goal");
    expect(shootout.opponentKicks).toEqual(["goal"]);
    expect(shootout.teamKicks).toEqual([]);
    expect(shootout.phase).toBe("team-kick");
    expect(shootout.ended).toBe(false);

    shootout = recordTeamPenalty(shootout, "miss");
    expect(shootout.teamKicks).toEqual(["miss"]);
    expect(shootout.phase).toBe("defend");
    expect(shootout.round).toBe(2);
  });

  it("ends regulation early when the trailing side cannot mathematically recover", () => {
    let shootout = createPenaltyShootout();

    for (let round = 0; round < 3; round += 1) {
      shootout = playPair(shootout, "goal", "miss");
    }
    expect(shootout.opponentGoals).toBe(3);
    expect(shootout.teamGoals).toBe(0);
    expect(shootout.ended).toBe(true);
    expect(shootout.winner).toBe("opponent");
    expect(shootout.endReason).toBe("unreachable");
  });

  it("enters sudden death when both teams remain level after five kicks", () => {
    let shootout = createPenaltyShootout();

    for (let round = 0; round < 5; round += 1) {
      shootout = playPair(shootout, round === 1 ? "miss" : "goal", round === 3 ? "miss" : "goal");
    }

    expect(shootout.opponentGoals).toBe(4);
    expect(shootout.teamGoals).toBe(4);
    expect(shootout.ended).toBe(false);
    expect(shootout.suddenDeath).toBe(true);
    expect(shootout.phase).toBe("defend");
    expect(shootout.round).toBe(6);
  });

  it("waits for both sudden-death kicks before declaring a winner", () => {
    let shootout = createPenaltyShootout();
    for (let round = 0; round < 5; round += 1) shootout = playPair(shootout, "goal", "goal");

    shootout = recordOpponentPenalty(shootout, "miss");
    expect(shootout.ended).toBe(false);
    expect(shootout.phase).toBe("team-kick");

    shootout = recordTeamPenalty(shootout, "goal");
    expect(shootout.ended).toBe(true);
    expect(shootout.winner).toBe("team");
    expect(shootout.endReason).toBe("sudden-death");
    expect(shootout.round).toBe(6);
  });

  it("simulates the unseen team kick with a stable football conversion rate", () => {
    const goal = simulateTeamPenalty(recordOpponentPenalty(createPenaltyShootout(), "miss"), 0.2);
    const miss = simulateTeamPenalty(recordOpponentPenalty(createPenaltyShootout(), "miss"), 0.92);

    expect(goal.teamKicks).toEqual(["goal"]);
    expect(goal.lastEvent).toEqual({ side: "team", result: "goal", round: 1 });
    expect(miss.teamKicks).toEqual(["miss"]);
    expect(miss.lastEvent).toEqual({ side: "team", result: "miss", round: 1 });
  });
});
