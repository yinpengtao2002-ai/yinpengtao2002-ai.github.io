import { describe, expect, it } from "vitest";
import { SCENE_TUNING } from "../src/three/goalkeeper-scene.js";
import { SHOT_3D } from "../src/game/shot-3d-director.js";

describe("goalkeeper 3D scene tuning", () => {
  it("keeps the goal framed with smaller ball and glove visuals", () => {
    expect(SCENE_TUNING.camera.fov).toBeGreaterThanOrEqual(64);
    expect(SCENE_TUNING.camera.position.z).toBeGreaterThanOrEqual(8);
    expect(SCENE_TUNING.camera.lookAt.z).toBeGreaterThanOrEqual(-16);
    expect(SCENE_TUNING.ball.radius).toBeLessThanOrEqual(0.12);
    expect(SCENE_TUNING.ball.haloRadius).toBeLessThanOrEqual(0.25);
    expect(SCENE_TUNING.ball.nearScale).toBeLessThanOrEqual(1.42);
    expect(SCENE_TUNING.gloves.scale).toBeLessThanOrEqual(0.68);
    expect(SCENE_TUNING.depth.originZ).toBe(SHOT_3D.origin.z);
  });
});
