export const ROUND_SECONDS = 60;
export const MAX_CONCEDED = 5;
export const SAVE_SCORE = 100;
export const SAVE_STREAK_BONUS = 25;
export const MAX_STREAK_BONUS_STEPS = 5;

export const FIELD = {
  goalHalfWidth: 3.66,
  goalHeight: 2.44,
  launchZ: 36,
  goalPlaneZ: 0,
  backNetZ: -2.55,
  keeperPlaneZ: 1.05,
};

export const BALL = {
  radius: 0.11,
  gravity: -3.6,
  airDamping: 0.9992,
  curveScale: 1.15,
  minVisibleRadius: 5,
  maxVisibleRadius: 58,
};

export const GLOVES = {
  baseY: 1.1,
  planeZ: 1.05,
  radius: 0.7,
  spread: 0.34,
  restitution: 1.62,
  friction: 0.12,
  absorption: 0.06,
  maxSpeedMouse: 24,
  maxSpeedTouch: 19,
  touchSmoothing: 0.34,
  mouseSmoothing: 0.12,
};

export const SHOTS = {
  earlyCueDuration: 0.82,
  lateCueDuration: 0.46,
  earlySpeed: 38,
  lateSpeed: 54,
  spawnDelayAfterOutcome: 0.46,
  goalReplayDuration: 1.35,
  saveReplayDuration: 0.62,
};
