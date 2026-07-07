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

  it("defines restrained glove impact compression and rebound feedback", () => {
    expect(SCENE_TUNING.gloves.impactSystem).toBe("glove-impact-compression-rebound");
    expect(SCENE_TUNING.gloves.impactDecay).toBeGreaterThanOrEqual(0.035);
    expect(SCENE_TUNING.gloves.impactDecay).toBeLessThanOrEqual(0.09);
    expect(SCENE_TUNING.gloves.impactCompression).toBeGreaterThanOrEqual(0.1);
    expect(SCENE_TUNING.gloves.impactCompression).toBeLessThanOrEqual(0.2);
    expect(SCENE_TUNING.gloves.impactRebound).toBeGreaterThan(0.04);
    expect(SCENE_TUNING.gloves.impactRebound).toBeLessThan(SCENE_TUNING.gloves.impactCompression);
    expect(SCENE_TUNING.gloves.impactTwist).toBeGreaterThan(0.04);
    expect(SCENE_TUNING.gloves.impactTwist).toBeLessThanOrEqual(0.1);
  });

  it("turns save contact into side-specific glove compression state", async () => {
    const sceneModule = await import("../src/three/goalkeeper-scene.js");

    expect(sceneModule.createGloveImpactState).toBeTypeOf("function");
    expect(sceneModule.triggerGloveImpactState).toBeTypeOf("function");
    expect(sceneModule.advanceGloveImpactState).toBeTypeOf("function");
    expect(sceneModule.getGloveVisualTransform).toBeTypeOf("function");

    const state = sceneModule.createGloveImpactState();
    sceneModule.triggerGloveImpactState(
      state,
      {
        type: "glove",
        side: "left",
        point: { x: -0.48, y: 1.24, z: 3.15 },
        strength: 22,
      },
      {
        left: { x: -0.34, y: 1.2, z: 3.15 },
        right: { x: 0.34, y: 1.2, z: 3.15 },
      },
    );

    expect(state.left.life).toBe(1);
    expect(state.left.strength).toBeGreaterThan(0.5);
    expect(state.left.point).toEqual({ x: -0.48, y: 1.24, z: 3.15 });
    expect(state.right.life).toBe(0);

    const visual = sceneModule.getGloveVisualTransform("left", SCENE_TUNING.gloves.scale, state.left);
    expect(visual.scale.x).toBeGreaterThan(SCENE_TUNING.gloves.scale);
    expect(visual.scale.y).toBeLessThan(SCENE_TUNING.gloves.scale);
    expect(visual.scale.z).toBeGreaterThan(SCENE_TUNING.gloves.scale);
    expect(Math.abs(visual.rotation.z)).toBeGreaterThan(0.01);

    sceneModule.advanceGloveImpactState(state);
    expect(state.left.life).toBeLessThan(1);
    expect(state.right.life).toBe(0);
  });

  it("treats centered catches as a two-glove cushion", async () => {
    const sceneModule = await import("../src/three/goalkeeper-scene.js");
    const state = sceneModule.createGloveImpactState();

    sceneModule.triggerGloveImpactState(
      state,
      {
        type: "catch",
        side: "both",
        point: { x: 0.02, y: 1.31, z: 3.12 },
        strength: 13,
      },
      {
        left: { x: -0.34, y: 1.2, z: 3.15 },
        right: { x: 0.34, y: 1.2, z: 3.15 },
      },
    );

    expect(state.left.life).toBe(1);
    expect(state.right.life).toBe(1);
    expect(state.left.strength).toBeGreaterThan(0.35);
    expect(state.right.strength).toBeGreaterThan(0.35);
  });

  it("uses height-aware ball shadows so airborne and rolling balls read differently", () => {
    expect(SCENE_TUNING.ball.shadowAssetSystem).toBe("height-aware-ball-shadow");
    expect(SCENE_TUNING.ball.shadowGroundOpacity).toBeGreaterThan(SCENE_TUNING.ball.shadowAirOpacity);
    expect(SCENE_TUNING.ball.shadowGroundScale).toBeGreaterThan(SCENE_TUNING.ball.shadowAirScale);
    expect(SCENE_TUNING.ball.shadowHeightFade).toBeGreaterThanOrEqual(1.2);
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
    expect(SCENE_TUNING.feedback.turfContactAssetSystem).toBe("rolling-turf-contact-flecks");
    expect(SCENE_TUNING.feedback.turfFleckCount).toBeGreaterThanOrEqual(8);
    expect(SCENE_TUNING.feedback.turfFleckCount).toBeLessThanOrEqual(18);
    expect(SCENE_TUNING.feedback.turfFleckMaxOpacity).toBeLessThanOrEqual(0.5);
    expect(SCENE_TUNING.feedback.turfFleckTriggerAge).toBeLessThanOrEqual(0.16);
    expect(SCENE_TUNING.feedback.saveSparkCount).toBeGreaterThanOrEqual(6);
    expect(SCENE_TUNING.feedback.saveSparkMaxOpacity).toBeLessThanOrEqual(0.74);
    expect(SCENE_TUNING.feedback.netRippleLineCount).toBeGreaterThanOrEqual(4);
    expect(SCENE_TUNING.feedback.netRippleMaxOpacity).toBeLessThanOrEqual(0.42);
    expect(SCENE_TUNING.feedback.netRippleAssetSystem).toBe("localized-net-ripple");
    expect(SCENE_TUNING.feedback.netRippleContactRadius).toBeGreaterThanOrEqual(0.42);
    expect(SCENE_TUNING.feedback.netRippleContactRadius).toBeLessThanOrEqual(0.9);
    expect(SCENE_TUNING.feedback.netRippleTravel).toBeGreaterThan(0.04);
    expect(SCENE_TUNING.feedback.netPocketAssetSystem).toBe("localized-net-pocket-deformation");
    expect(SCENE_TUNING.feedback.netPocketPatchCount).toBeGreaterThanOrEqual(2);
    expect(SCENE_TUNING.feedback.netPocketMaxDepth).toBeGreaterThanOrEqual(0.18);
    expect(SCENE_TUNING.feedback.netPocketMaxDepth).toBeLessThanOrEqual(0.36);
    expect(SCENE_TUNING.feedback.frameReboundSystem).toBe("post-crossbar-rebound-highlight");
    expect(SCENE_TUNING.feedback.frameReboundMaxOpacity).toBeLessThanOrEqual(0.72);
    expect(SCENE_TUNING.feedback.goalWaveCount).toBeGreaterThanOrEqual(2);
    expect(SCENE_TUNING.feedback.goalWaveMaxOpacity).toBeLessThanOrEqual(0.48);
    expect(SCENE_TUNING.feedback.streakPulseCount).toBeGreaterThanOrEqual(2);
    expect(SCENE_TUNING.feedback.streakPulseMaxOpacity).toBeLessThanOrEqual(0.7);
  });

  it("plans a localized net pocket deformation around the ball impact", async () => {
    const sceneModule = await import("../src/three/goalkeeper-scene.js");

    expect(sceneModule.createNetPocketState).toBeTypeOf("function");
    expect(sceneModule.triggerNetPocketState).toBeTypeOf("function");
    expect(sceneModule.advanceNetPocketState).toBeTypeOf("function");
    expect(sceneModule.getNetPocketFeedbackPlan).toBeTypeOf("function");

    const state = sceneModule.createNetPocketState();
    sceneModule.triggerNetPocketState(state, {
      x: 1.2,
      y: 1.45,
      z: SHOT_3D.netPlaneZ,
      strength: 0.86,
    });

    expect(state.life).toBe(1);
    expect(state.point.x).toBeCloseTo(1.2);
    expect(state.point.y).toBeCloseTo(1.45);

    const plan = sceneModule.getNetPocketFeedbackPlan(state);
    expect(plan.marker).toBe("feedback-net-pocket-deformation");
    expect(plan.patches).toHaveLength(SCENE_TUNING.feedback.netPocketPatchCount);
    expect(plan.depth).toBeGreaterThan(0.16);
    expect(plan.radius).toBeGreaterThanOrEqual(SCENE_TUNING.feedback.netRippleContactRadius);
    expect(plan.patches[0].opacity).toBeLessThanOrEqual(0.72);
    expect(plan.patches[0].scale.x).toBeGreaterThan(plan.patches[0].scale.y);

    sceneModule.advanceNetPocketState(state);
    expect(state.life).toBeLessThan(1);

    expect(sceneModule.getNetPocketFeedbackPlan(sceneModule.createNetPocketState())).toBeNull();
  });

  it("plans post and crossbar rebound highlights from frame contacts", async () => {
    const sceneModule = await import("../src/three/goalkeeper-scene.js");

    expect(sceneModule.getFrameReboundFeedbackPlan).toBeTypeOf("function");

    const leftPost = sceneModule.getFrameReboundFeedbackPlan({
      type: "frame",
      part: "left-post",
      point: { x: -3.8, y: 1.2, z: SHOT_3D.netPlaneZ },
      strength: 0.82,
    });

    expect(leftPost.marker).toBe("feedback-frame-rebound-highlight");
    expect(leftPost.part).toBe("left-post");
    expect(leftPost.position.x).toBeLessThan(0);
    expect(leftPost.opacity).toBeLessThanOrEqual(SCENE_TUNING.feedback.frameReboundMaxOpacity);
    expect(leftPost.shake).toBeGreaterThan(0);

    const crossbar = sceneModule.getFrameReboundFeedbackPlan({
      type: "frame",
      part: "crossbar",
      point: { x: 0.75, y: 2.6, z: SHOT_3D.netPlaneZ },
    });

    expect(crossbar.part).toBe("crossbar");
    expect(crossbar.position.y).toBeCloseTo(2.44, 1);
  });

  it("plans directional turf flecks for fresh rolling ground contact", async () => {
    const sceneModule = await import("../src/three/goalkeeper-scene.js");

    expect(sceneModule.getTurfContactFleckPlan).toBeTypeOf("function");

    const flecks = sceneModule.getTurfContactFleckPlan({
      active: true,
      age: 0.02,
      intensity: 0.72,
      speed: 5.4,
      point: { x: -0.35, y: 0.012, z: 2.9 },
      direction: { x: 0.56, y: 0, z: -0.83 },
    });

    expect(flecks).toHaveLength(SCENE_TUNING.feedback.turfFleckCount);
    expect(flecks[0].marker).toBe("feedback-turf-fleck");
    expect(flecks[0].position.y).toBeGreaterThan(0.012);
    expect(flecks[0].velocity.y).toBeGreaterThan(0);
    expect(flecks[0].opacity).toBeLessThanOrEqual(SCENE_TUNING.feedback.turfFleckMaxOpacity);
    expect(flecks[0].scale.x).toBeGreaterThan(0);
    expect(flecks[0].scale.y).toBeGreaterThan(flecks[0].scale.x);
    expect(flecks.some((fleck) => fleck.velocity.x > 0)).toBe(true);
    expect(flecks.some((fleck) => fleck.velocity.z < 0)).toBe(true);

    expect(sceneModule.getTurfContactFleckPlan({ active: false })).toEqual([]);
    expect(sceneModule.getTurfContactFleckPlan({ active: true, age: 0.4, point: { x: 0, y: 0, z: 0 } })).toEqual([]);
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
