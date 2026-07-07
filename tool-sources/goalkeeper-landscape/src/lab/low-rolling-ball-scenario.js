import { createRapierGoalkeeperWorld } from "../physics/rapier-world.js";

export const LOW_ROLLING_BALL_LAB_SCENARIO = {
  key: "ground-roll",
  name: "低平滚动球",
  steps: 90,
  dt: 1 / 120,
  ballPlan: {
    origin: { x: 0, y: 0.38, z: 1.4 },
    target: { x: 0, y: 0.1, z: 2.4 },
    velocity: { x: 0, y: -4.2, z: 1.2 },
    angularVelocity: { x: 8, y: 0, z: 0 },
    curveForce: { x: 0, y: 0, z: 0 },
    radius: 0.11,
  },
};

function round(value) {
  return Number(value.toFixed(4));
}

function vector(value) {
  if (!value) return null;
  return {
    x: round(value.x),
    y: round(value.y),
    z: round(value.z),
  };
}

function summarizeContact(samples, radius) {
  var contactSample = samples.reduce((best, sample) => {
    var clearance = sample.position.y - radius;
    if (!best || clearance < best.clearance) {
      return { sample: sample, clearance: clearance };
    }
    return best;
  }, null);

  if (!contactSample || contactSample.clearance > 0.08) {
    return {
      type: "none",
      point: null,
      normal: null,
      strength: 0,
    };
  }

  return {
    type: "ground",
    point: {
      x: contactSample.sample.position.x,
      y: 0,
      z: contactSample.sample.position.z,
    },
    normal: { x: 0, y: 1, z: 0 },
    strength: round(Math.abs(contactSample.sample.velocity.y)),
  };
}

export async function runLowRollingBallLabScenario(options = {}) {
  var steps = options.steps || LOW_ROLLING_BALL_LAB_SCENARIO.steps;
  var dt = options.dt || LOW_ROLLING_BALL_LAB_SCENARIO.dt;
  var world = await createRapierGoalkeeperWorld();

  try {
    world.launchShot(LOW_ROLLING_BALL_LAB_SCENARIO.ballPlan);

    var samples = [];
    for (var i = 0; i < steps; i += 1) {
      world.step(dt);
      var ball = world.getBallState();
      samples.push({
        frame: i + 1,
        time: round((i + 1) * dt),
        outcome: ball.outcome,
        position: vector(ball.position),
        velocity: vector(ball.velocity),
        angularVelocity: vector(ball.angularVelocity),
        lastContact: ball.lastContact,
      });
    }

    var finalBall = world.getBallState();
    var radius = finalBall.radius || LOW_ROLLING_BALL_LAB_SCENARIO.ballPlan.radius;
    var position = vector(finalBall.position);
    var velocity = vector(finalBall.velocity);
    var angularVelocity = vector(finalBall.angularVelocity);
    var contact = summarizeContact(samples, radius);

    return {
      key: LOW_ROLLING_BALL_LAB_SCENARIO.key,
      name: LOW_ROLLING_BALL_LAB_SCENARIO.name,
      steps: steps,
      dt: round(dt),
      outcome: finalBall.outcome,
      position: position,
      velocity: velocity,
      angularVelocity: angularVelocity,
      radius: radius,
      groundClearance: position ? round(position.y - radius) : null,
      contact: contact,
      samples: samples,
    };
  } finally {
    world.dispose();
  }
}
