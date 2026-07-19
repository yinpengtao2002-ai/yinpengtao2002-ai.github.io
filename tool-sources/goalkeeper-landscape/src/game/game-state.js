import { MAX_CONCEDED, MAX_STREAK_BONUS_STEPS, ROUND_SECONDS, SAVE_SCORE, SAVE_STREAK_BONUS } from "../config/game-config.js";
import {
  createPenaltyShootout,
  recordOpponentPenalty,
  recordTeamPenalty,
  simulateTeamPenalty,
} from "./penalty-shootout.js";

export const GAME_MODES = {
  timed: { id: "timed", label: "经典模式" },
  penalty: { id: "penalty", label: "点球大战" },
};

export function resolveGameMode(value) {
  return GAME_MODES[value] || GAME_MODES.timed;
}

function pointsForStreak(streak) {
  var bonusSteps = Math.min(Math.max(0, streak - 1), MAX_STREAK_BONUS_STEPS);
  return SAVE_SCORE + bonusSteps * SAVE_STREAK_BONUS;
}

export function createGameState(options = {}) {
  var requestedMode = typeof options === "string" ? options : options.mode;
  var mode = resolveGameMode(requestedMode).id;
  return {
    mode,
    shootout: mode === "penalty" ? createPenaltyShootout() : null,
    score: 0,
    saves: 0,
    conceded: 0,
    streak: 0,
    bestStreak: 0,
    lastSavePoints: 0,
    timeLeft: mode === "penalty" ? null : ROUND_SECONDS,
    elapsed: 0,
    running: false,
    paused: false,
    ended: false,
    endReason: null,
    message: "ready",
  };
}

export function startRound(state, options = {}) {
  var requestedMode = typeof options === "string" ? options : options.mode;
  var mode = resolveGameMode(requestedMode || state?.mode).id;
  return {
    ...state,
    mode,
    shootout: mode === "penalty" ? createPenaltyShootout() : null,
    score: 0,
    saves: 0,
    conceded: 0,
    streak: 0,
    bestStreak: 0,
    lastSavePoints: 0,
    timeLeft: mode === "penalty" ? null : ROUND_SECONDS,
    elapsed: 0,
    running: true,
    paused: false,
    ended: false,
    endReason: null,
    message: "start",
  };
}

export function finishRound(state, reason) {
  return {
    ...state,
    running: false,
    paused: false,
    ended: true,
    endReason: reason,
    message: "ended",
  };
}

export function tickRound(state, dt) {
  if (!state.running || state.paused || state.ended) return state;
  var elapsed = state.elapsed + Math.max(0, dt);
  if (state.mode === "penalty") {
    return {
      ...state,
      elapsed,
      timeLeft: null,
    };
  }
  var timeLeft = Math.max(0, ROUND_SECONDS - elapsed);
  var next = {
    ...state,
    elapsed: elapsed,
    timeLeft: timeLeft,
  };
  return timeLeft <= 0 ? finishRound(next, "time") : next;
}

export function recordSave(state) {
  if (state.ended) return state;
  var saves = state.saves + 1;
  var streak = (state.streak || 0) + 1;
  var points = pointsForStreak(streak);
  var next = {
    ...state,
    saves: saves,
    streak: streak,
    bestStreak: Math.max(state.bestStreak || 0, streak),
    lastSavePoints: points,
    score: state.score + points,
    message: "save",
  };
  if (state.mode !== "penalty") return next;
  return applyPenaltyResult(next, recordOpponentPenalty(state.shootout, "miss"));
}

export function recordGoal(state) {
  if (state.ended) return state;
  var conceded = state.conceded + 1;
  var next = {
    ...state,
    conceded: conceded,
    streak: 0,
    lastSavePoints: 0,
    message: "goal",
  };
  if (state.mode === "penalty") {
    return applyPenaltyResult(next, recordOpponentPenalty(state.shootout, "goal"));
  }
  return conceded >= MAX_CONCEDED ? finishRound(next, "conceded") : next;
}

export function recordMiss(state, kind = "miss") {
  if (state.ended) return state;
  var next = {
    ...state,
    streak: 0,
    lastSavePoints: 0,
    message: kind === "frame" ? "frame" : "miss",
  };
  if (state.mode !== "penalty") return next;
  return applyPenaltyResult(next, recordOpponentPenalty(state.shootout, "miss"));
}

function applyPenaltyResult(state, shootout) {
  var next = {
    ...state,
    shootout,
  };
  if (!shootout?.ended) return next;
  return finishRound(next, shootout.winner === "team" ? "penalty-win" : "penalty-loss");
}

export function recordPenaltyTeamKick(state, result) {
  if (state.mode !== "penalty" || state.ended) return state;
  var shootout = recordTeamPenalty(state.shootout, result);
  return applyPenaltyResult({ ...state, message: result === "goal" ? "team-goal" : "team-miss" }, shootout);
}

export function simulatePenaltyTeamKick(state, randomValue = Math.random()) {
  if (state.mode !== "penalty" || state.ended) return state;
  var shootout = simulateTeamPenalty(state.shootout, randomValue);
  var result = shootout?.lastEvent?.result || "miss";
  return applyPenaltyResult({ ...state, message: result === "goal" ? "team-goal" : "team-miss" }, shootout);
}

export function togglePause(state) {
  if (!state.running || state.ended) return state;
  return {
    ...state,
    paused: !state.paused,
    message: state.paused ? "resume" : "pause",
  };
}
