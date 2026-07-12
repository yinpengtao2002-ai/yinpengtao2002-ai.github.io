export const PENALTY_REGULATION_KICKS = 5;
export const PENALTY_TEAM_CONVERSION_RATE = 0.76;

function countGoals(kicks) {
  return kicks.filter((result) => result === "goal").length;
}

function withDerivedScore(shootout) {
  var teamGoals = countGoals(shootout.teamKicks);
  var opponentGoals = countGoals(shootout.opponentKicks);
  var teamTaken = shootout.teamKicks.length;
  var opponentTaken = shootout.opponentKicks.length;
  var ended = false;
  var winner = null;
  var endReason = null;
  var suddenDeath = shootout.suddenDeath || (teamTaken >= PENALTY_REGULATION_KICKS && opponentTaken >= PENALTY_REGULATION_KICKS);

  if (!suddenDeath) {
    var teamRemaining = Math.max(0, PENALTY_REGULATION_KICKS - teamTaken);
    var opponentRemaining = Math.max(0, PENALTY_REGULATION_KICKS - opponentTaken);
    if (teamGoals > opponentGoals + opponentRemaining) {
      ended = true;
      winner = "team";
      endReason = "unreachable";
    } else if (opponentGoals > teamGoals + teamRemaining) {
      ended = true;
      winner = "opponent";
      endReason = "unreachable";
    }
  }

  if (!ended && teamTaken >= PENALTY_REGULATION_KICKS && opponentTaken >= PENALTY_REGULATION_KICKS && teamTaken === opponentTaken) {
    if (teamGoals !== opponentGoals) {
      ended = true;
      winner = teamGoals > opponentGoals ? "team" : "opponent";
      endReason = suddenDeath && teamTaken > PENALTY_REGULATION_KICKS ? "sudden-death" : "regulation";
    } else {
      suddenDeath = true;
    }
  }

  var phase = ended
    ? "complete"
    : opponentTaken > teamTaken
      ? "team-kick"
      : "defend";
  var round = ended
    ? Math.max(1, teamTaken, opponentTaken)
    : phase === "team-kick"
      ? opponentTaken
      : Math.max(teamTaken, opponentTaken) + 1;

  return {
    ...shootout,
    teamGoals,
    opponentGoals,
    suddenDeath,
    phase,
    round,
    ended,
    winner,
    endReason,
  };
}

export function createPenaltyShootout() {
  return withDerivedScore({
    teamKicks: [],
    opponentKicks: [],
    teamGoals: 0,
    opponentGoals: 0,
    suddenDeath: false,
    phase: "defend",
    round: 1,
    ended: false,
    winner: null,
    endReason: null,
    lastEvent: null,
  });
}

export function recordOpponentPenalty(shootout, result) {
  if (!shootout || shootout.ended || shootout.phase !== "defend") return shootout;
  var normalizedResult = result === "goal" ? "goal" : "miss";
  var round = shootout.opponentKicks.length + 1;
  return withDerivedScore({
    ...shootout,
    opponentKicks: [...shootout.opponentKicks, normalizedResult],
    lastEvent: { side: "opponent", result: normalizedResult, round },
  });
}

export function recordTeamPenalty(shootout, result) {
  if (!shootout || shootout.ended || shootout.phase !== "team-kick") return shootout;
  var normalizedResult = result === "goal" ? "goal" : "miss";
  var round = shootout.teamKicks.length + 1;
  return withDerivedScore({
    ...shootout,
    teamKicks: [...shootout.teamKicks, normalizedResult],
    lastEvent: { side: "team", result: normalizedResult, round },
  });
}

export function simulateTeamPenalty(shootout, randomValue = Math.random()) {
  var result = randomValue < PENALTY_TEAM_CONVERSION_RATE ? "goal" : "miss";
  return recordTeamPenalty(shootout, result);
}
