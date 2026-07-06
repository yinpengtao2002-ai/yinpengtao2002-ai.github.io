import { FIELD, ROUND_SECONDS, SHOTS } from "../config/game-config.js";
import { createBall } from "../physics/ball-physics.js";
import { clamp, lerp } from "../math/vector.js";

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

export function difficultyFromElapsed(elapsed) {
  return clamp((elapsed || 0) / ROUND_SECONDS, 0, 1);
}

export function createShotDirector(options = {}) {
  var seed = options.seed || Math.floor(Math.random() * 1000000);
  var elapsed = options.elapsed || 0;
  var random = makeRandom(seed);
  var currentShot = createShot({ random: random, elapsed: elapsed });
  return {
    seed: seed,
    shotIndex: 0,
    phase: "cue",
    phaseTime: 0,
    cooldown: 0,
    currentShot: currentShot,
  };
}

export function createShot(context) {
  var random = context.random;
  var difficulty = difficultyFromElapsed(context.elapsed || 0);
  var swing = pick(["drive", "curl", "dip"], random);
  var lean = pick(["left", "right", "center"], random);
  var foot = lean === "left" ? "inside-right" : lean === "right" ? "inside-left" : pick(["laces", "inside"], random);
  var cueDuration = lerp(SHOTS.earlyCueDuration, SHOTS.lateCueDuration, difficulty);
  var side = lean === "left" ? -1 : lean === "right" ? 1 : random() > 0.5 ? 1 : -1;
  var targetX = side * lerp(lerp(0.22, 0.45, difficulty), lerp(1.25, 2.05, difficulty), random());
  var targetY =
    swing === "drive"
      ? lerp(0.62, lerp(1.32, 1.45, difficulty), random())
      : swing === "dip"
        ? lerp(lerp(1.34, 1.75, difficulty), lerp(1.82, 2.28, difficulty), random())
        : lerp(0.94, lerp(1.74, 2.05, difficulty), random());
  var speed = lerp(SHOTS.earlySpeed, SHOTS.lateSpeed, difficulty) + random() * 3.6;
  var curve = swing === "curl" ? side * lerp(0.025, 0.075, random()) : side * lerp(0.004, 0.028, random());
  var lift = swing === "dip" ? lerp(2.8, 3.6, random()) : swing === "drive" ? lerp(1.3, 2.2, random()) : lerp(2.0, 3.0, random());
  var ballPlan = {
    position: {
      x: -side * lerp(0.12, 0.44, random()),
      y: lerp(0.18, 0.38, random()),
      z: FIELD.launchZ,
    },
    velocity: {
      x: targetX / 1.15,
      y: lift,
      z: -speed,
    },
    curve: curve,
    spin: side * lerp(1.8, 5.2, random()),
    target: { x: targetX, y: targetY },
  };

  return {
    cue: {
      lean: lean,
      swing: swing,
      foot: foot,
      side: side,
    },
    cueDuration: cueDuration,
    ballPlan: ballPlan,
    ball: null,
  };
}

export function updateShotDirector(director, dt, elapsed) {
  if (director.phase === "cooldown") {
    var cooldown = Math.max(0, director.cooldown - dt);
    if (cooldown > 0) {
      return { ...director, cooldown: cooldown };
    }
    var seed = director.seed + director.shotIndex + 11;
    var random = makeRandom(seed);
    return {
      ...director,
      phase: "cue",
      phaseTime: 0,
      cooldown: 0,
      shotIndex: director.shotIndex + 1,
      currentShot: createShot({ random: random, elapsed: elapsed }),
    };
  }

  if (director.phase === "cue") {
    var phaseTime = director.phaseTime + dt;
    if (phaseTime < director.currentShot.cueDuration) {
      return { ...director, phaseTime: phaseTime };
    }
    return {
      ...director,
      phase: "live",
      phaseTime: 0,
      currentShot: {
        ...director.currentShot,
        ball: createBall(director.currentShot.ballPlan),
      },
    };
  }

  return {
    ...director,
    phaseTime: director.phaseTime + dt,
  };
}

export function completeCurrentShot(director) {
  return {
    ...director,
    phase: "cooldown",
    phaseTime: 0,
    cooldown: SHOTS.spawnDelayAfterOutcome,
    currentShot: {
      ...director.currentShot,
      ball: null,
    },
  };
}
