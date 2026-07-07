import { ROUND_SECONDS } from "../config/game-config.js";
import { clamp, lerp } from "../math/vector.js";

export const SHOT_3D = {
  gravity: -9.81,
  origin: { x: 0, y: 0.28, z: -19 },
  netPlaneZ: 4.65,
  goalHalfWidth: 3.66,
  goalHeight: 2.44,
  earlyCueDuration: 0.82,
  lateCueDuration: 0.46,
  kickDuration: 0.14,
  earlyFlightTime: 0.57,
  lateFlightTime: 0.42,
};

export const DEFAULT_SHOT_DIFFICULTY = "medium";

export const SHOT_DIFFICULTIES = {
  easy: {
    id: "easy",
    label: "容易",
    pressureOffset: -0.18,
    cueScale: 1.16,
    flightScale: 1.12,
    curveScale: 0.78,
  },
  medium: {
    id: "medium",
    label: "中等",
    pressureOffset: 0,
    cueScale: 1,
    flightScale: 1,
    curveScale: 1,
  },
  hard: {
    id: "hard",
    label: "困难",
    pressureOffset: 0.18,
    cueScale: 0.88,
    flightScale: 0.86,
    curveScale: 1.18,
  },
};

export function resolveShotDifficulty(id) {
  return SHOT_DIFFICULTIES[id] || SHOT_DIFFICULTIES[DEFAULT_SHOT_DIFFICULTY];
}

function makeRandom(seed) {
  var value = (seed || 1) >>> 0;
  return function random() {
    value = (value * 1664525 + 1013904223) >>> 0;
    return value / 4294967296;
  };
}

function pick(items, random) {
  return items[Math.floor(random() * items.length)];
}

export function difficultyFromElapsed3D(elapsed) {
  return clamp((elapsed || 0) / ROUND_SECONDS, 0, 1);
}

export function planBallisticVelocity(origin, target, flightTime, acceleration) {
  return {
    x: (target.x - origin.x - 0.5 * acceleration.x * flightTime * flightTime) / flightTime,
    y: (target.y - origin.y - 0.5 * acceleration.y * flightTime * flightTime) / flightTime,
    z: (target.z - origin.z - 0.5 * acceleration.z * flightTime * flightTime) / flightTime,
  };
}

export function predictShotPosition(ballPlan, time) {
  var acceleration = getShotAcceleration(ballPlan);
  return {
    x: ballPlan.origin.x + ballPlan.velocity.x * time + 0.5 * acceleration.x * time * time,
    y: ballPlan.origin.y + ballPlan.velocity.y * time + 0.5 * acceleration.y * time * time,
    z: ballPlan.origin.z + ballPlan.velocity.z * time + 0.5 * acceleration.z * time * time,
  };
}

export function getShotAcceleration(ballPlan) {
  return {
    x: ballPlan.curveForce?.x || 0,
    y: SHOT_3D.gravity + (ballPlan.curveForce?.y || 0),
    z: ballPlan.curveForce?.z || 0,
  };
}

function pickTargetX(random, side, difficulty) {
  var wideBias = lerp(0.28, 0.74, difficulty);
  var midBias = lerp(0.38, 0.18, difficulty);
  var roll = random();
  var absX;

  if (roll < wideBias) {
    absX = lerp(2.25, SHOT_3D.goalHalfWidth - 0.32, random());
  } else if (roll < wideBias + midBias) {
    absX = lerp(1.25, 2.18, random());
  } else {
    absX = lerp(0.42, 1.16, random());
  }

  return side * absX;
}

function pickTargetY(random, swing, difficulty) {
  var verticalEdgeBias = lerp(0.22, 0.64, difficulty);
  if (random() < verticalEdgeBias) {
    var favorLow = swing === "drive" ? 0.62 : swing === "dip" ? 0.36 : 0.48;
    return random() < favorLow ? lerp(0.46, 0.78, random()) : lerp(1.9, SHOT_3D.goalHeight - 0.16, random());
  }

  return swing === "drive"
    ? lerp(0.78, lerp(1.34, 1.52, difficulty), random())
    : swing === "dip"
      ? lerp(1.18, lerp(1.88, 2.06, difficulty), random())
      : lerp(0.86, lerp(1.7, 1.92, difficulty), random());
}

export function createShot3DDirector(options = {}) {
  var seed = options.seed || Math.floor(Math.random() * 1000000);
  var elapsed = options.elapsed || 0;
  var shotDifficulty = resolveShotDifficulty(options.difficulty);
  var random = makeRandom(seed);
  return {
    seed: seed,
    difficulty: shotDifficulty.id,
    shotIndex: 0,
    phase: "cue",
    phaseTime: 0,
    cooldown: 0,
    currentShot: createShot3D({ random: random, elapsed: elapsed, shotId: 0, difficulty: shotDifficulty.id }),
  };
}

export function createShot3D(context) {
  var random = context.random;
  var shotDifficulty = resolveShotDifficulty(context.difficulty);
  var difficulty = difficultyFromElapsed3D(context.elapsed || 0);
  var shotPressure = clamp(difficulty + shotDifficulty.pressureOffset, 0, 1);
  var swing = pick(["drive", "curl", "dip"], random);
  var lean = pick(["left", "right", "center"], random);
  var side = lean === "left" ? -1 : lean === "right" ? 1 : random() > 0.5 ? 1 : -1;
  var foot = side < 0 ? "right-foot-inside" : "left-foot-inside";
  var cueDuration = lerp(SHOT_3D.earlyCueDuration, SHOT_3D.lateCueDuration, difficulty) * shotDifficulty.cueScale;
  var flightTime = lerp(SHOT_3D.earlyFlightTime, SHOT_3D.lateFlightTime, difficulty) * shotDifficulty.flightScale;
  var origin = {
    x: lerp(-0.06, 0.06, random()),
    y: lerp(0.24, 0.32, random()),
    z: SHOT_3D.origin.z,
  };
  var targetX = pickTargetX(random, side, shotPressure);
  var targetY = pickTargetY(random, swing, shotPressure);
  var target = {
    x: clamp(targetX, -SHOT_3D.goalHalfWidth + 0.26, SHOT_3D.goalHalfWidth - 0.26),
    y: clamp(targetY, 0.46, SHOT_3D.goalHeight - 0.16),
    z: SHOT_3D.netPlaneZ,
  };
  var curveAmount =
    swing === "curl"
      ? lerp(1.0, 2.8, shotPressure) * side
      : swing === "dip"
        ? lerp(0.15, 0.55, random()) * side
        : lerp(0.05, 0.36, random()) * side;
  curveAmount *= shotDifficulty.curveScale;
  var dipForce = swing === "dip" ? -lerp(0.7, 1.6, shotPressure) * shotDifficulty.curveScale : swing === "drive" ? 0.18 : -0.24;
  var curveForce = {
    x: curveAmount,
    y: dipForce,
    z: 0,
  };
  var velocity = planBallisticVelocity(origin, target, flightTime, {
    x: curveForce.x,
    y: SHOT_3D.gravity + curveForce.y,
    z: 0,
  });
  var angularVelocity = {
    x: swing === "dip" ? -18 : -10,
    y: side * (swing === "curl" ? 26 : 14),
    z: side * 8,
  };

  return {
    shotId: context.shotId || 0,
    difficulty: shotDifficulty.id,
    cue: {
      lean: lean,
      swing: swing,
      foot: foot,
      side: side,
      plant: side < 0 ? "open-left" : "open-right",
    },
    cueDuration: cueDuration,
    kickDuration: SHOT_3D.kickDuration,
    flightTime: flightTime,
    origin: origin,
    target: target,
    curveForce: curveForce,
    ballPlan: {
      origin: origin,
      target: target,
      velocity: velocity,
      angularVelocity: angularVelocity,
      curveForce: curveForce,
      radius: 0.11,
      flightTime: flightTime,
      spin: angularVelocity,
    },
  };
}

export function updateShot3DDirector(director, dt, elapsed, difficulty = director.difficulty) {
  if (director.phase === "cooldown") {
    var cooldown = Math.max(0, director.cooldown - dt);
    if (cooldown > 0) return { ...director, cooldown: cooldown };
    var shotIndex = director.shotIndex + 1;
    var random = makeRandom(director.seed + shotIndex * 37 + 11);
    var shotDifficulty = resolveShotDifficulty(difficulty);
    return {
      ...director,
      difficulty: shotDifficulty.id,
      shotIndex: shotIndex,
      phase: "cue",
      phaseTime: 0,
      cooldown: 0,
      currentShot: createShot3D({ random: random, elapsed: elapsed, shotId: shotIndex, difficulty: shotDifficulty.id }),
    };
  }

  if (director.phase === "cue") {
    var cueTime = director.phaseTime + dt;
    var launchAt = director.currentShot.cueDuration + director.currentShot.kickDuration;
    if (cueTime < launchAt) {
      return { ...director, phaseTime: cueTime };
    }
    return {
      ...director,
      phase: "live",
      phaseTime: 0,
    };
  }

  return {
    ...director,
    phaseTime: director.phaseTime + dt,
  };
}

export function completeShot3D(director, cooldown = 0.38) {
  return {
    ...director,
    phase: "cooldown",
    phaseTime: 0,
    cooldown: cooldown,
  };
}
