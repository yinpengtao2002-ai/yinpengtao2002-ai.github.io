import { describe, expect, it } from "vitest";
import { LOW_ROLLING_BALL_LAB_SCENARIO, runLowRollingBallLabScenario } from "../src/lab/low-rolling-ball-scenario.js";

describe("low rolling ball lab scenario", () => {
  it("replays the real Rapier world and returns ground-contact telemetry", async () => {
    const telemetry = await runLowRollingBallLabScenario({ steps: 90, dt: 1 / 120 });

    expect(LOW_ROLLING_BALL_LAB_SCENARIO.key).toBe("ground-roll");
    expect(telemetry.key).toBe("ground-roll");
    expect(telemetry.samples).toHaveLength(90);
    expect(telemetry.samples[0].position.z).toBeGreaterThan(LOW_ROLLING_BALL_LAB_SCENARIO.ballPlan.origin.z);
    expect(telemetry.samples.at(-1).time).toBeCloseTo(0.75, 3);
    expect(telemetry.contact.type).toBe("ground");
    expect(telemetry.groundClearance).toBeGreaterThanOrEqual(-0.02);
    expect(telemetry.groundClearance).toBeLessThan(0.08);
    expect(telemetry.position.y).toBeGreaterThanOrEqual(0.09);
    expect(telemetry.velocity.y).toBeGreaterThan(-1.2);
    expect(Number.isFinite(telemetry.angularVelocity.x)).toBe(true);
  });
});
