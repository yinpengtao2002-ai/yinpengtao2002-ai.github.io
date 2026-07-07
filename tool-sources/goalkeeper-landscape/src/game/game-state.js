import { MAX_CONCEDED, MAX_STREAK_BONUS_STEPS, ROUND_SECONDS, SAVE_SCORE, SAVE_STREAK_BONUS } from "../config/game-config.js";

function pointsForStreak(streak) {
  var bonusSteps = Math.min(Math.max(0, streak - 1), MAX_STREAK_BONUS_STEPS);
  return SAVE_SCORE + bonusSteps * SAVE_STREAK_BONUS;
}

export function createGameState() {
  return {
    score: 0,
    saves: 0,
    conceded: 0,
    streak: 0,
    bestStreak: 0,
    lastSavePoints: 0,
    timeLeft: ROUND_SECONDS,
    elapsed: 0,
    running: false,
    paused: false,
    ended: false,
    endReason: null,
    message: "ready",
  };
}

export function startRound(state) {
  return {
    ...state,
    score: 0,
    saves: 0,
    conceded: 0,
    streak: 0,
    bestStreak: 0,
    lastSavePoints: 0,
    timeLeft: ROUND_SECONDS,
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
  return {
    ...state,
    saves: saves,
    streak: streak,
    bestStreak: Math.max(state.bestStreak || 0, streak),
    lastSavePoints: points,
    score: state.score + points,
    message: "save",
  };
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
  return conceded >= MAX_CONCEDED ? finishRound(next, "conceded") : next;
}

export function recordMiss(state, kind = "miss") {
  if (state.ended) return state;
  return {
    ...state,
    streak: 0,
    lastSavePoints: 0,
    message: kind === "frame" ? "frame" : "miss",
  };
}

export function togglePause(state) {
  if (!state.running || state.ended) return state;
  return {
    ...state,
    paused: !state.paused,
    message: state.paused ? "resume" : "pause",
  };
}
