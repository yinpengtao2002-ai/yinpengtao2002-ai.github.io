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
    expect(SCENE_TUNING.ball.showShotTrail).toBe(false);
    expect(SCENE_TUNING.ball.maxLingeringBalls).toBeGreaterThanOrEqual(4);
    expect(SCENE_TUNING.gloves.scale).toBeLessThanOrEqual(0.68);
    expect(SCENE_TUNING.depth.originZ).toBe(SHOT_3D.origin.z);
  });

  it("defines a restrained matchday feedback layer for saves, goals, streaks, and camera shake", () => {
    expect(SCENE_TUNING.feedback.assetSystem).toBe("matchday-feedback-kit");
    expect(SCENE_TUNING.feedback.impactRingCount).toBeGreaterThanOrEqual(3);
    expect(SCENE_TUNING.feedback.saveFlashColor).toBe("#fff1a8");
    expect(SCENE_TUNING.feedback.goalFlashColor).toBe("#ff7846");
    expect(SCENE_TUNING.feedback.streakFlashColor).toBe("#61f0ff");
    expect(SCENE_TUNING.feedback.frameFlashColor).toBe("#f8fff2");
    expect(SCENE_TUNING.feedback.frameImpactStrength).toBeLessThanOrEqual(0.85);
    expect(SCENE_TUNING.feedback.maxCameraShake).toBeLessThanOrEqual(0.055);
    expect(SCENE_TUNING.feedback.netPulseDecay).toBeGreaterThanOrEqual(0.025);
    expect(SCENE_TUNING.feedback.groundSkidCount).toBeGreaterThanOrEqual(4);
    expect(SCENE_TUNING.feedback.groundSkidColor).toBe("#e7d5a7");
    expect(SCENE_TUNING.feedback.groundSkidMaxOpacity).toBeLessThanOrEqual(0.42);
    expect(SCENE_TUNING.feedback.saveSparkCount).toBeGreaterThanOrEqual(6);
    expect(SCENE_TUNING.feedback.saveSparkMaxOpacity).toBeLessThanOrEqual(0.74);
    expect(SCENE_TUNING.feedback.netRippleLineCount).toBeGreaterThanOrEqual(4);
    expect(SCENE_TUNING.feedback.netRippleMaxOpacity).toBeLessThanOrEqual(0.42);
    expect(SCENE_TUNING.feedback.goalWaveCount).toBeGreaterThanOrEqual(2);
    expect(SCENE_TUNING.feedback.goalWaveMaxOpacity).toBeLessThanOrEqual(0.48);
    expect(SCENE_TUNING.feedback.streakPulseCount).toBeGreaterThanOrEqual(2);
    expect(SCENE_TUNING.feedback.streakPulseMaxOpacity).toBeLessThanOrEqual(0.7);
  });

  it("uses a warm stadium lighting rig instead of flat prototype lighting", () => {
    expect(SCENE_TUNING.lighting.assetSystem).toBe("warm-stadium-three-point");
    expect(SCENE_TUNING.lighting.hemisphereIntensity).toBeGreaterThanOrEqual(2);
    expect(SCENE_TUNING.lighting.sunIntensity).toBeGreaterThanOrEqual(2);
    expect(SCENE_TUNING.lighting.rimIntensity).toBeGreaterThanOrEqual(0.55);
    expect(SCENE_TUNING.lighting.fillIntensity).toBeLessThanOrEqual(0.9);
  });

  it("keeps one canonical framing instead of composition demo presets", async () => {
    const sceneModule = await import("../src/three/goalkeeper-scene.js");

    expect(sceneModule.COMPOSITION_PRESETS).toBeUndefined();
    expect(sceneModule.DEFAULT_COMPOSITION_PRESET).toBeUndefined();
    expect(sceneModule.getGoalkeeperCompositionPreset).toBeUndefined();
  });
});
