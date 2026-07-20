import * as THREE from "three";
import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { SCENE_TUNING } from "../src/three/goalkeeper-scene.js";
import { SHOT_3D } from "../src/game/shot-3d-director.js";
import { GOAL_NET_GEOMETRY } from "../src/physics/goal-net-geometry.js";

describe("goalkeeper 3D scene tuning", () => {
  it("round-trips a screen pointer through the camera onto the glove plane without visual offset", async () => {
    const sceneModule = await import("../src/three/goalkeeper-scene.js");
    const camera = new THREE.PerspectiveCamera(SCENE_TUNING.camera.fov, 844 / 390, 0.05, 90);
    camera.position.set(
      SCENE_TUNING.camera.position.x,
      SCENE_TUNING.camera.position.y,
      SCENE_TUNING.camera.position.z,
    );
    camera.lookAt(new THREE.Vector3(
      SCENE_TUNING.camera.lookAt.x,
      SCENE_TUNING.camera.lookAt.y,
      SCENE_TUNING.camera.lookAt.z,
    ));
    camera.updateProjectionMatrix();
    camera.updateMatrixWorld();

    const expected = new THREE.Vector3(2.7, 0.14, 3.15);
    const ndc = expected.clone().project(camera);
    const pointer = {
      x: ((ndc.x + 1) / 2) * 844,
      y: ((1 - ndc.y) / 2) * 390,
    };
    const projected = sceneModule.projectPointerToWorldPlane(camera, pointer, { width: 844, height: 390 }, 3.15);

    expect(sceneModule.projectPointerToWorldPlane).toBeTypeOf("function");
    expect(projected.x).toBeCloseTo(expected.x, 4);
    expect(projected.y).toBeCloseTo(expected.y, 4);
    expect(projected.z).toBeCloseTo(expected.z, 4);
  });

  it("collects physical net contacts separately from scoring contacts", async () => {
    const sceneModule = await import("../src/three/goalkeeper-scene.js");
    const gloveContact = { eventId: 11, type: "glove", point: { x: 0, y: 1.2, z: 3.15 } };
    const netContact = {
      eventId: "net:11",
      type: "net",
      point: { x: 0.08, y: 1.18, z: 5.45 },
      strength: 7.2,
      sourceContactEventId: 11,
    };

    const events = sceneModule.getPhysicalNetContactEvents({
      ball: { outcome: "saved", lastContact: gloveContact, netContact },
      lingeringBalls: [
        { outcome: "saved", lastContact: gloveContact, netContact },
        { outcome: "saved", lastContact: gloveContact },
      ],
    });

    expect(events).toHaveLength(1);
    expect(events[0]).toEqual(netContact);
    expect(events[0].eventId).not.toBe(gloveContact.eventId);
  });

  it("starts net deformation only from a physical panel contact, not the goal-line score event", async () => {
    const sceneModule = await import("../src/three/goalkeeper-scene.js");

    expect(sceneModule.getPhysicalNetAnimationContact).toBeTypeOf("function");
    expect(sceneModule.getPhysicalNetAnimationContact({
      type: "net",
      point: { x: 0.2, y: 1.2, z: SHOT_3D.netPlaneZ },
      strength: 18,
    })).toBeNull();

    const contact = sceneModule.getPhysicalNetAnimationContact({
      type: "net",
      panel: "rear",
      point: { x: 0.2, y: 1.2, z: GOAL_NET_GEOMETRY.netPlaneZ + GOAL_NET_GEOMETRY.cageDepth },
      strength: 18,
    });

    expect(contact).toMatchObject({
      panel: "rear",
      point: { x: 0.2, y: 1.2 },
    });
    expect(contact.strength).toBeGreaterThan(0.5);
    expect(contact.strength).toBeLessThanOrEqual(1);
  });

  it("merges streak payoff into the single glove-contact moment", async () => {
    const sceneModule = await import("../src/three/goalkeeper-scene.js");

    expect(sceneModule.getSaveContactFeedbackState).toBeTypeOf("function");
    expect(sceneModule.getSaveContactFeedbackState({ message: "play", streak: 2 })).toMatchObject({ streak: 3 });
    expect(sceneModule.getSaveContactFeedbackState({ message: "save", streak: 3 })).toMatchObject({ streak: 3 });
  });

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
    expect(sceneModule.getGloveSceneRotation).toBeTypeOf("function");

    expect(sceneModule.getGloveSceneRotation()).toEqual({ x: 0, y: 0, z: 0 });

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
    expect(sceneModule.getGloveSceneRotation(visual)).toEqual(visual.rotation);

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

  it("keeps only a restrained signal ring on a live ball near the goal mouth", () => {
    expect(SCENE_TUNING.ball.netReadabilitySystem).toBe("near-net-ball-priority-halo");
    expect(SCENE_TUNING.ball.renderOrder).toBeGreaterThanOrEqual(12);
    expect(SCENE_TUNING.ball.haloRenderOrder).toBeGreaterThanOrEqual(SCENE_TUNING.ball.renderOrder);
    expect(SCENE_TUNING.ball.haloGeometrySystem).toBe("thin-ring-no-ball-shell");
    expect(SCENE_TUNING.ball.haloInnerRadius).toBeGreaterThan(SCENE_TUNING.ball.haloRadius * 0.85);
    expect(SCENE_TUNING.ball.haloInnerRadius).toBeLessThan(SCENE_TUNING.ball.haloRadius);
    expect(SCENE_TUNING.ball.haloColor).toBe("#ff633e");
    expect(SCENE_TUNING.ball.liveHaloOpacity).toBeGreaterThanOrEqual(0.1);
    expect(SCENE_TUNING.ball.nearNetHaloBoost).toBeLessThanOrEqual(0.08);
    expect(SCENE_TUNING.ball.nearNetHaloMaxOpacity).toBeLessThanOrEqual(0.2);
  });

  it("removes the yellow foreground shell once the ball is inside the goal", async () => {
    const sceneModule = await import("../src/three/goalkeeper-scene.js");

    expect(sceneModule.getBallHaloAppearancePlan).toBeTypeOf("function");
    expect(SCENE_TUNING.ball.haloColor).toBe("#ff633e");
    expect(SCENE_TUNING.ball.goalHaloOpacity).toBe(0);
    expect(SCENE_TUNING.ball.settledHaloOpacity).toBe(0);

    const goal = sceneModule.getBallHaloAppearancePlan(
      { live: false, outcome: "goal" },
      { x: 0, y: 1.2, z: SHOT_3D.netPlaneZ + 0.6 },
    );
    const live = sceneModule.getBallHaloAppearancePlan(
      { live: true, outcome: "live" },
      { x: 0, y: 1.2, z: SHOT_3D.netPlaneZ - 0.2 },
    );

    expect(goal).toMatchObject({ visible: false, opacity: 0, color: "#ff633e" });
    expect(live.visible).toBe(true);
    expect(live.opacity).toBeGreaterThan(0);
    expect(live.opacity).toBeLessThanOrEqual(0.2);
    expect(live.color).toBe("#ff633e");
  });

  it("uses ring-only goal feedback so no warm contact disc sits behind the scored ball", async () => {
    const sceneModule = await import("../src/three/goalkeeper-scene.js");

    expect(sceneModule.getGoalContactFlashPlan).toBeTypeOf("function");
    expect(SCENE_TUNING.feedback.goalContactDiscOpacity).toBe(0);
    expect(sceneModule.getGoalContactFlashPlan({ impactStrength: 1 })).toMatchObject({
      visible: false,
      opacity: 0,
      system: "ring-only-goal-feedback",
    });
  });

  it("keeps runtime net feedback below the ball-first occlusion budget", () => {
    expect(SCENE_TUNING.feedback.netBaseOpacity).toBeLessThanOrEqual(0.0001);
    expect(SCENE_TUNING.feedback.netPulseOpacityBoost).toBeLessThanOrEqual(0.0001);
    expect(SCENE_TUNING.feedback.netRecoilOpacityBoost).toBeLessThanOrEqual(0.0001);
    expect(SCENE_TUNING.feedback.dynamicNetDetailOpacityBoost).toBeLessThanOrEqual(0.08);
  });

  it("adds close-to-ball spin glints without reintroducing shot helper lines", async () => {
    const sceneModule = await import("../src/three/goalkeeper-scene.js");

    expect(SCENE_TUNING.ball.showShotTrail).toBe(false);
    expect(SCENE_TUNING.ball.flightSpinGlintSystem).toBe("attached-ball-spin-glint-kit");
    expect(SCENE_TUNING.ball.flightSpinGlintCount).toBeGreaterThanOrEqual(2);
    expect(SCENE_TUNING.ball.flightSpinGlintMaxOpacity).toBeLessThanOrEqual(0.38);
    expect(sceneModule.getBallSpinGlintPlan).toBeTypeOf("function");

    const plan = sceneModule.getBallSpinGlintPlan({
      live: true,
      position: { x: 0.26, y: 1.2, z: -6.5 },
      velocity: { x: 2.4, y: 0.2, z: 19.5 },
      angularVelocity: { x: -6, y: 13, z: 2 },
      radius: 0.12,
    });

    expect(plan.system).toBe("attached-ball-spin-glint-kit");
    expect(plan.glints).toHaveLength(SCENE_TUNING.ball.flightSpinGlintCount);
    expect(plan.glints[0].marker).toBe("feedback-ball-spin-glint");
    expect(plan.glints[0].position.x).toBeCloseTo(0.26, 1);
    expect(Math.abs(plan.glints[0].position.z + 6.5)).toBeLessThanOrEqual(0.12);
    expect(plan.glints[0].opacity).toBeLessThanOrEqual(SCENE_TUNING.ball.flightSpinGlintMaxOpacity);
    expect(plan.glints[0].scale.x).toBeLessThanOrEqual(0.24);
    expect(plan.glints[0].scale.y).toBeLessThan(plan.glints[0].scale.x);
    expect(plan.glints[0].rotation).not.toBe(plan.glints[plan.glints.length - 1].rotation);

    expect(sceneModule.getBallSpinGlintPlan({ live: true, position: { x: 0, y: 0.2, z: 0 }, velocity: { x: 0.2, y: 0, z: 1.2 } }).glints).toEqual([]);
    expect(sceneModule.getBallSpinGlintPlan({ live: false, position: { x: 0, y: 1.1, z: 0 }, velocity: { x: 0, y: 0, z: 20 } }).glints).toEqual([]);
  });

  it("adds short attached speed ribbons to fast balls without drawing aiming guides", async () => {
    const sceneModule = await import("../src/three/goalkeeper-scene.js");

    expect(SCENE_TUNING.ball.showShotTrail).toBe(false);
    expect(SCENE_TUNING.ball.flightSpeedRibbonSystem).toBe("attached-ball-speed-ribbon-kit");
    expect(SCENE_TUNING.ball.flightSpeedRibbonCount).toBeGreaterThanOrEqual(2);
    expect(SCENE_TUNING.ball.flightSpeedRibbonMaxOpacity).toBeLessThanOrEqual(0.28);
    expect(sceneModule.getBallSpeedRibbonPlan).toBeTypeOf("function");

    const ball = {
      live: true,
      position: { x: -0.18, y: 1.34, z: -5.6 },
      velocity: { x: 3.2, y: -0.12, z: 24.5 },
      radius: 0.12,
    };
    const plan = sceneModule.getBallSpeedRibbonPlan(ball);

    expect(plan.system).toBe("attached-ball-speed-ribbon-kit");
    expect(plan.ribbons).toHaveLength(SCENE_TUNING.ball.flightSpeedRibbonCount);
    expect(plan.ribbons.map((ribbon) => ribbon.marker).join(" ")).not.toMatch(/aim|guide|helper|trajectory|shot-trail/i);

    plan.ribbons.forEach((ribbon, index) => {
      const distanceFromBall = Math.hypot(
        ribbon.position.x - ball.position.x,
        ribbon.position.y - ball.position.y,
        ribbon.position.z - ball.position.z,
      );
      expect(ribbon.marker).toBe("feedback-ball-speed-ribbon");
      expect(distanceFromBall).toBeLessThanOrEqual(ball.radius * 1.45);
      expect(ribbon.opacity).toBeGreaterThan(0);
      expect(ribbon.opacity).toBeLessThanOrEqual(SCENE_TUNING.ball.flightSpeedRibbonMaxOpacity);
      expect(ribbon.scale.x).toBeGreaterThan(ball.radius * 1.45);
      expect(ribbon.scale.x).toBeLessThanOrEqual(SCENE_TUNING.ball.flightSpeedRibbonMaxLength);
      expect(ribbon.scale.y).toBeLessThan(ribbon.scale.x);
      expect(ribbon.position.z).toBeGreaterThan(ball.position.z - ball.radius * 1.5);
      if (index > 0) {
        expect(ribbon.opacity).toBeLessThan(plan.ribbons[index - 1].opacity);
      }
    });

    expect(sceneModule.getBallSpeedRibbonPlan({ ...ball, velocity: { x: 0.4, y: 0, z: 2.5 } }).ribbons).toEqual([]);
    expect(sceneModule.getBallSpeedRibbonPlan({ ...ball, live: false }).ribbons).toEqual([]);
  });

  it("plans a restrained close-contact shockwave when the glove saves the ball", async () => {
    const sceneModule = await import("../src/three/goalkeeper-scene.js");

    expect(SCENE_TUNING.feedback.saveContactShockwaveSystem).toBe("close-contact-glove-ball-shockwave");
    expect(SCENE_TUNING.feedback.saveContactShockwaveCount).toBeGreaterThanOrEqual(2);
    expect(SCENE_TUNING.feedback.saveContactShockwaveCount).toBeLessThanOrEqual(4);
    expect(SCENE_TUNING.feedback.saveContactShockwaveMaxOpacity).toBeLessThanOrEqual(0.34);
    expect(SCENE_TUNING.feedback.saveContactShockwaveMaxRadius).toBeLessThanOrEqual(0.48);
    expect(sceneModule.getSaveContactShockwavePlan).toBeTypeOf("function");

    const contact = {
      type: "glove",
      side: "right",
      point: { x: 0.38, y: 1.34, z: 3.12 },
      normal: { x: 0.42, y: 0.05, z: -0.76 },
      strength: 24,
    };
    const gloves = {
      center: { x: 0.3, y: 1.28, z: 3.16 },
      velocity: { x: 1.2, y: 0.28, z: -0.4 },
    };
    const plan = sceneModule.getSaveContactShockwavePlan(contact, gloves);

    expect(plan.system).toBe("close-contact-glove-ball-shockwave");
    expect(plan.rings).toHaveLength(SCENE_TUNING.feedback.saveContactShockwaveCount);
    plan.rings.forEach((ring, index) => {
      const distanceFromContact = Math.hypot(
        ring.position.x - contact.point.x,
        ring.position.y - contact.point.y,
        ring.position.z - contact.point.z,
      );
      expect(ring.marker).toBe("feedback-save-contact-shockwave");
      expect(distanceFromContact).toBeLessThanOrEqual(0.08);
      expect(ring.opacity).toBeGreaterThan(0);
      expect(ring.opacity).toBeLessThanOrEqual(SCENE_TUNING.feedback.saveContactShockwaveMaxOpacity);
      expect(ring.scale.x).toBeLessThanOrEqual(SCENE_TUNING.feedback.saveContactShockwaveMaxRadius);
      expect(ring.scale.y).toBeLessThan(ring.scale.x);
      expect(ring.life).toBeGreaterThan(0.28);
      if (index > 0) {
        expect(ring.opacity).toBeLessThan(plan.rings[index - 1].opacity);
        expect(ring.scale.x).toBeGreaterThan(plan.rings[index - 1].scale.x);
      }
    });

    expect(sceneModule.getSaveContactShockwavePlan({ type: "net", point: contact.point }, gloves).rings).toEqual([]);
    expect(sceneModule.getMatchEventFeedbackPlan({ type: "save", contact, state: { streak: 1 } }).visualEffects).toContain(
      "feedback-save-contact-shockwave",
    );
  });

  it("renders a saved replay ball without also drawing the retired active physics ball", async () => {
    const sceneModule = await import("../src/three/goalkeeper-scene.js");

    expect(sceneModule.getSceneBallRenderPlan).toBeTypeOf("function");

    const savedActiveBall = {
      live: false,
      outcome: "saved",
      position: { x: 0.22, y: 1.35, z: 3.08 },
      velocity: { x: 3.4, y: 1.2, z: -3.8 },
      radius: 0.11,
      lastContact: {
        type: "glove",
        point: { x: 0.2, y: 1.32, z: 3.12 },
      },
    };
    const replayBall = {
      live: false,
      outcome: "saved",
      position: { x: 0.24, y: 1.3, z: 3.02 },
      velocity: { x: 3.2, y: 1.1, z: -3.6 },
      radius: 0.11,
      age: 0,
      duration: 5,
    };

    const plan = sceneModule.getSceneBallRenderPlan({
      director: { phase: "live" },
      ball: savedActiveBall,
      lingeringBalls: [replayBall],
    });

    expect(plan.activeBall.position).toBeNull();
    expect(plan.activeBall.live).toBe(false);
    expect(plan.activeBall.hiddenByReplay).toBe(true);
    expect(plan.lingeringBalls).toHaveLength(1);
    expect(plan.groundSkidBalls).toEqual([replayBall]);
    expect(plan.contactBall.lastContact).toBe(savedActiveBall.lastContact);
    expect(plan.visibleBallCount).toBe(1);

    const livePlan = sceneModule.getSceneBallRenderPlan({
      ball: {
        live: true,
        outcome: "deflected",
        position: { x: -0.2, y: 1.1, z: 2.9 },
      },
      lingeringBalls: [],
    });
    expect(livePlan.activeBall.position).toEqual({ x: -0.2, y: 1.1, z: 2.9 });
    expect(livePlan.groundSkidBalls).toHaveLength(1);
    expect(livePlan.visibleBallCount).toBe(1);
  });

  it("hides retired replay balls while another shot owns the live frame", async () => {
    const sceneModule = await import("../src/three/goalkeeper-scene.js");

    expect(sceneModule.shouldRenderLingeringBall).toBeTypeOf("function");

    const activeShot = {
      live: true,
      outcome: "live",
      position: { x: 0.18, y: 0.88, z: -8.4 },
      velocity: { x: 3.2, y: 1.4, z: 34 },
      radius: 0.11,
    };
    const airborneReplay = {
      live: false,
      outcome: "saved",
      position: { x: 1.15, y: 1.86, z: 2.4 },
      velocity: { x: 2.8, y: 2.6, z: -3.2 },
      radius: 0.11,
      age: 1.2,
      duration: 5,
    };
    const groundedReplay = {
      ...airborneReplay,
      position: { x: 1.7, y: 0.11, z: 2.1 },
      velocity: { x: 1.4, y: 0, z: -0.8 },
      groundFeedback: {
        active: true,
        point: { x: 1.7, y: 0.012, z: 2.1 },
        intensity: 0.32,
        speed: 1.6,
      },
    };
    const settledReplay = {
      ...airborneReplay,
      position: { x: -2.1, y: 0.11, z: 1.8 },
      velocity: { x: 0.08, y: 0, z: -0.04 },
      groundFeedback: {
        active: false,
        point: { x: -2.1, y: 0.012, z: 1.8 },
        intensity: 0,
        speed: 0.09,
      },
    };

    const plan = sceneModule.getSceneBallRenderPlan({
      director: { phase: "live" },
      ball: activeShot,
      lingeringBalls: [airborneReplay, groundedReplay, settledReplay],
    });

    expect(plan.visibleBallCount).toBe(1);
    expect(plan.lingeringBalls).toEqual([]);
    expect(plan.hiddenLingeringBalls).toEqual([airborneReplay, groundedReplay, settledReplay]);
    expect(sceneModule.shouldRenderLingeringBall(airborneReplay, { director: { phase: "live" }, ball: activeShot })).toBe(false);
    expect(sceneModule.shouldRenderLingeringBall(groundedReplay, { director: { phase: "live" }, ball: activeShot })).toBe(false);
    expect(sceneModule.shouldRenderLingeringBall(settledReplay, { director: { phase: "live" }, ball: activeShot })).toBe(false);
  });

  it("keeps deflected save replays from drawing a second active ball during shot transitions", async () => {
    const sceneModule = await import("../src/three/goalkeeper-scene.js");
    const deflectedActiveBall = {
      live: false,
      outcome: "deflected",
      position: { x: 1.45, y: 1.8, z: 2.52 },
      velocity: { x: 4.8, y: 2.4, z: -3.1 },
      radius: 0.11,
      lastContact: {
        type: "glove",
        point: { x: 1.1, y: 1.34, z: 3.08 },
      },
    };
    const replayBall = {
      live: false,
      outcome: "saved",
      position: { x: 1.35, y: 1.64, z: 2.45 },
      velocity: { x: 4.2, y: 2.1, z: -3 },
      radius: 0.11,
      age: 0.18,
      duration: 5,
      lastContact: deflectedActiveBall.lastContact,
    };

    const plan = sceneModule.getSceneBallRenderPlan({
      director: { phase: "cooldown" },
      ball: deflectedActiveBall,
      lingeringBalls: [replayBall],
    });

    expect(plan.hideActiveBallForReplay).toBe(true);
    expect(plan.activeBall.position).toBeNull();
    expect(plan.activeBall.hiddenByReplay).toBe(true);
    expect(plan.lingeringBalls).toEqual([replayBall]);
    expect(plan.groundSkidBalls).toEqual([replayBall]);
    expect(plan.visibleBallCount).toBe(1);
  });

  it("does not split an extreme saved shot when its final contact changes from glove to frame", async () => {
    const sceneModule = await import("../src/three/goalkeeper-scene.js");
    const frameSettledBall = {
      live: false,
      outcome: "saved",
      position: { x: 3.25, y: 2.18, z: 4.72 },
      velocity: { x: -4.8, y: -1.2, z: -2.4 },
      radius: 0.11,
      lastContact: {
        type: "frame",
        part: "right-post",
        point: { x: 3.66, y: 2.18, z: 4.65 },
      },
    };
    const replayBall = {
      ...frameSettledBall,
      position: { x: 3.2, y: 2.15, z: 4.68 },
      age: 0.04,
      duration: 5,
      replaySourceShotId: 7,
    };

    const plan = sceneModule.getSceneBallRenderPlan({
      director: { phase: "live", currentShot: { shotId: 7 } },
      ball: frameSettledBall,
      lingeringBalls: [replayBall],
    });

    expect(plan.hideActiveBallForReplay).toBe(true);
    expect(plan.activeBall.position).toBeNull();
    expect(plan.lingeringBalls).toEqual([replayBall]);
    expect(plan.visibleBallCount).toBe(1);
  });

  it("defines a restrained matchday feedback layer for saves, goals, streaks, and camera shake", () => {
    expect(SCENE_TUNING.feedback.assetSystem).toBe("matchday-feedback-kit");
    expect(SCENE_TUNING.feedback.impactRingCount).toBeGreaterThanOrEqual(3);
    expect(SCENE_TUNING.feedback.saveFlashColor).toBe("#fff1a8");
    expect(SCENE_TUNING.feedback.goalFlashColor).toBe("#ff7846");
    expect(SCENE_TUNING.feedback.dangerGoalFlashColor).toBe("#ff3f2f");
    expect(SCENE_TUNING.feedback.streakFlashColor).toBe("#61f0ff");
    expect(SCENE_TUNING.feedback.frameFlashColor).toBe("#f8fff2");
    expect(SCENE_TUNING.feedback.catchSaveStrength).toBeGreaterThan(SCENE_TUNING.feedback.parrySaveStrength);
    expect(SCENE_TUNING.feedback.goalImpactStrength).toBeGreaterThan(SCENE_TUNING.feedback.saveImpactStrength);
    expect(SCENE_TUNING.feedback.dangerGoalImpactStrength).toBeGreaterThan(SCENE_TUNING.feedback.goalImpactStrength);
    expect(SCENE_TUNING.feedback.frameImpactStrength).toBeLessThanOrEqual(0.85);
    expect(SCENE_TUNING.feedback.maxCameraShake).toBeLessThanOrEqual(0.055);
    expect(SCENE_TUNING.feedback.cameraShakeFalloff).toBeGreaterThanOrEqual(0.0035);
    expect(SCENE_TUNING.feedback.cameraShakeFalloff).toBeLessThanOrEqual(0.008);
    expect(SCENE_TUNING.feedback.netPulseDecay).toBeGreaterThanOrEqual(0.025);
    expect(SCENE_TUNING.feedback.netBaseOpacity).toBeLessThanOrEqual(0.006);
    expect(SCENE_TUNING.feedback.netPulseOpacityBoost).toBeLessThanOrEqual(0.065);
    expect(SCENE_TUNING.feedback.netRecoilOpacityBoost).toBeLessThanOrEqual(0.035);
    expect(SCENE_TUNING.feedback.netRecoilSystem).toBe("damped-net-spring-rebound");
    expect(SCENE_TUNING.feedback.netRecoilMaxTravel).toBeGreaterThanOrEqual(0.12);
    expect(SCENE_TUNING.feedback.netRecoilMaxTravel).toBeLessThanOrEqual(0.26);
    expect(SCENE_TUNING.feedback.netRecoilStiffness).toBeGreaterThanOrEqual(40);
    expect(SCENE_TUNING.feedback.netRecoilDamping).toBeGreaterThan(0.9);
    expect(SCENE_TUNING.feedback.netRecoilDamping).toBeLessThan(0.99);
    expect(SCENE_TUNING.feedback.groundSkidCount).toBeGreaterThanOrEqual(4);
    expect(SCENE_TUNING.feedback.groundSkidColor).toBe("#e7d5a7");
    expect(SCENE_TUNING.feedback.groundSkidMaxOpacity).toBeLessThanOrEqual(0.42);
    expect(SCENE_TUNING.feedback.courtContactAssetSystem).toBe("rolling-court-dust-skid-flecks");
    expect(SCENE_TUNING.feedback.courtDustFleckCount).toBeGreaterThanOrEqual(8);
    expect(SCENE_TUNING.feedback.courtDustFleckCount).toBeLessThanOrEqual(18);
    expect(SCENE_TUNING.feedback.courtDustFleckMaxOpacity).toBeLessThanOrEqual(0.36);
    expect(SCENE_TUNING.feedback.courtDustFleckTriggerAge).toBeLessThanOrEqual(0.16);
    expect(SCENE_TUNING.feedback.saveSparkCount).toBeGreaterThanOrEqual(6);
    expect(SCENE_TUNING.feedback.saveSparkMaxOpacity).toBeLessThanOrEqual(0.74);
    expect(SCENE_TUNING.feedback.saveAfterimageSystem).toBe("directional-glove-save-afterimage");
    expect(SCENE_TUNING.feedback.saveAfterimageCount).toBeGreaterThanOrEqual(3);
    expect(SCENE_TUNING.feedback.saveAfterimageCount).toBeLessThanOrEqual(5);
    expect(SCENE_TUNING.feedback.saveAfterimageMaxOpacity).toBeLessThanOrEqual(0.42);
    expect(SCENE_TUNING.feedback.saveAfterimageDecay).toBeGreaterThanOrEqual(0.04);
    expect(SCENE_TUNING.feedback.saveContactPressureSystem).toBe("glove-ball-contact-pressure-kit");
    expect(SCENE_TUNING.feedback.savePressureArcCount).toBeGreaterThanOrEqual(3);
    expect(SCENE_TUNING.feedback.savePressureArcCount).toBeLessThanOrEqual(5);
    expect(SCENE_TUNING.feedback.savePressureMaxOpacity).toBeLessThanOrEqual(0.52);
    expect(SCENE_TUNING.feedback.netRippleLineCount).toBe(0);
    expect(SCENE_TUNING.feedback.netRippleMaxOpacity).toBe(0);
    expect(SCENE_TUNING.feedback.netRippleAssetSystem).toBe("localized-net-ripple");
    expect(SCENE_TUNING.feedback.netRippleContactRadius).toBeGreaterThanOrEqual(0.42);
    expect(SCENE_TUNING.feedback.netRippleContactRadius).toBeLessThanOrEqual(0.9);
    expect(SCENE_TUNING.feedback.netRippleTravel).toBeGreaterThan(0.04);
    expect(SCENE_TUNING.feedback.netPocketAssetSystem).toBe("localized-net-pocket-deformation");
    expect(SCENE_TUNING.feedback.netSurfaceDeformationSystem).toBe("panel-aware-vertex-spring-net");
    expect(SCENE_TUNING.feedback.netImpactTriggerSystem).toBe("physical-panel-contact-only");
    expect(SCENE_TUNING.feedback.netPocketPatchCount).toBe(0);
    expect(SCENE_TUNING.feedback.netPocketMaxDepth).toBeGreaterThanOrEqual(0.18);
    expect(SCENE_TUNING.feedback.netPocketMaxDepth).toBeLessThanOrEqual(0.36);
    expect(SCENE_TUNING.feedback.netPocketRippleAmplitude).toBeGreaterThanOrEqual(0.05);
    expect(SCENE_TUNING.feedback.netPocketRippleAmplitude).toBeLessThanOrEqual(0.1);
    expect(SCENE_TUNING.feedback.netCordTensionAssetSystem).toBe("localized-net-cord-tension-shimmer");
    expect(SCENE_TUNING.feedback.netCordTensionCount).toBe(0);
    expect(SCENE_TUNING.feedback.netCordTensionMaxOpacity).toBe(0);
    expect(SCENE_TUNING.feedback.netCordTensionTravel).toBeGreaterThanOrEqual(0.04);
    expect(SCENE_TUNING.feedback.netCordTensionDecay).toBeGreaterThanOrEqual(0.035);
    expect(SCENE_TUNING.feedback.frameReboundSystem).toBe("post-crossbar-rebound-highlight");
    expect(SCENE_TUNING.feedback.frameReboundMaxOpacity).toBeLessThanOrEqual(0.72);
    expect(SCENE_TUNING.feedback.goalWaveCount).toBe(0);
    expect(SCENE_TUNING.feedback.goalWaveMaxOpacity).toBe(0);
    expect(SCENE_TUNING.feedback.streakPulseCount).toBeGreaterThanOrEqual(2);
    expect(SCENE_TUNING.feedback.streakPulseMaxOpacity).toBeLessThanOrEqual(0.7);
    expect(SCENE_TUNING.feedback.dynamicNetDetailSystem).toBe("reactive-woven-net-recoil");
    expect(SCENE_TUNING.feedback.dynamicNetDetailMaxTravel).toBeGreaterThanOrEqual(0.08);
    expect(SCENE_TUNING.feedback.dynamicNetDetailMaxTravel).toBeLessThanOrEqual(0.18);
  });

  it("keeps streak-only impact feedback from stopping the render loop", async () => {
    const sceneModule = await import("../src/three/goalkeeper-scene.js");

    expect(sceneModule.getEventBloomPlan).toBeTypeOf("function");
    expect(sceneModule.triggerPostprocessingBloomState).toBeTypeOf("function");

    const bloomState = sceneModule.createPostprocessingBloomState(SCENE_TUNING.postprocessing);

    expect(() => sceneModule.getEventBloomPlan(null, SCENE_TUNING.postprocessing)).not.toThrow();
    expect(() => sceneModule.triggerPostprocessingBloomState(bloomState, null, SCENE_TUNING.postprocessing)).not.toThrow();
    expect(sceneModule.getEventBloomPlan(null, SCENE_TUNING.postprocessing)).toMatchObject({
      active: false,
      tier: "ambient",
    });
  });

  it("maps match events to distinct visual feedback profiles instead of one generic flash", async () => {
    const sceneModule = await import("../src/three/goalkeeper-scene.js");

    expect(sceneModule.getMatchFeedbackProfile).toBeTypeOf("function");

    const catchSave = sceneModule.getMatchFeedbackProfile({
      type: "save",
      contact: { type: "catch", strength: 14 },
      state: { streak: 1, conceded: 0 },
    });
    const parrySave = sceneModule.getMatchFeedbackProfile({
      type: "save",
      contact: { type: "glove", strength: 24 },
      state: { streak: 1, conceded: 0 },
    });
    const normalGoal = sceneModule.getMatchFeedbackProfile({
      type: "goal",
      contact: { type: "net", strength: 0.72 },
      state: { conceded: 1 },
    });
    const dangerGoal = sceneModule.getMatchFeedbackProfile({
      type: "goal",
      contact: { type: "net", strength: 0.88 },
      state: { conceded: 4 },
    });
    const frame = sceneModule.getMatchFeedbackProfile({
      type: "frame",
      contact: { type: "frame", strength: 0.7 },
      state: { conceded: 0 },
    });

    expect(catchSave.kind).toBe("catch-save");
    expect(parrySave.kind).toBe("parry-save");
    expect(catchSave.impactStrength).toBeGreaterThan(parrySave.impactStrength);
    expect(catchSave.cameraShake).toBeLessThan(normalGoal.cameraShake);
    expect(parrySave.flashColor).toBe(SCENE_TUNING.feedback.saveFlashColor);

    expect(normalGoal.kind).toBe("goal");
    expect(normalGoal.flashColor).toBe(SCENE_TUNING.feedback.goalFlashColor);
    expect(normalGoal.netPocketStrength).toBeGreaterThanOrEqual(0.72);
    expect(normalGoal.netPulse).toBeGreaterThanOrEqual(0.82);

    expect(dangerGoal.kind).toBe("danger-goal");
    expect(dangerGoal.flashColor).toBe(SCENE_TUNING.feedback.dangerGoalFlashColor);
    expect(dangerGoal.impactStrength).toBeGreaterThan(normalGoal.impactStrength);
    expect(dangerGoal.cameraShake).toBeGreaterThan(normalGoal.cameraShake);
    expect(dangerGoal.netPocketStrength).toBeGreaterThan(normalGoal.netPocketStrength);

    expect(frame.kind).toBe("frame-rebound");
    expect(frame.flashColor).toBe(SCENE_TUNING.feedback.frameFlashColor);
    expect(frame.cameraShake).toBeLessThanOrEqual(SCENE_TUNING.feedback.maxCameraShake);
  });

  it("orchestrates complete event feedback packages across visuals, sound, HUD tone, and camera weight", async () => {
    const sceneModule = await import("../src/three/goalkeeper-scene.js");

    expect(sceneModule.getMatchEventFeedbackPlan).toBeTypeOf("function");
    expect(SCENE_TUNING.feedback.eventOrchestratorSystem).toBe("keeper-event-feedback-orchestrator");

    const streakSave = sceneModule.getMatchEventFeedbackPlan({
      type: "save",
      contact: {
        type: "glove",
        side: "right",
        strength: 30,
        point: { x: 0.44, y: 1.26, z: 3.14 },
      },
      state: { message: "save", streak: 4, conceded: 1 },
    });
    const dangerGoal = sceneModule.getMatchEventFeedbackPlan({
      type: "goal",
      contact: {
        type: "net",
        strength: 0.92,
        point: { x: -0.74, y: 1.42, z: SHOT_3D.netPlaneZ },
      },
      state: { message: "goal", conceded: 4 },
    });
    const frame = sceneModule.getMatchEventFeedbackPlan({
      type: "frame",
      contact: {
        type: "frame",
        part: "crossbar",
        strength: 0.72,
        point: { x: 0.52, y: 2.48, z: SHOT_3D.netPlaneZ },
      },
      state: { message: "frame", conceded: 1 },
    });
    const turf = sceneModule.getMatchEventFeedbackPlan({
      type: "ground",
      groundFeedback: {
        active: true,
        age: 0.02,
        intensity: 0.58,
        speed: 5.2,
        point: { x: -0.22, y: 0.012, z: 2.74 },
      },
    });

    expect(streakSave.system).toBe("keeper-event-feedback-orchestrator");
    expect(streakSave.audioEvent).toBe("save-streak");
    expect(streakSave.hudTone).toBe("streak");
    expect(streakSave.cameraShake).toBeGreaterThan(0);
    expect(streakSave.cameraShake).toBeLessThan(dangerGoal.cameraShake);
    expect(streakSave.visualEffects).toEqual(expect.arrayContaining([
      "feedback-save-spark",
      "feedback-save-pressure-arc",
      "feedback-save-afterimage",
      "feedback-streak-pulse",
    ]));
    expect(streakSave.visualEffects).not.toContain("feedback-impact-ring");
    expect(streakSave.ringCount).toBe(0);
    expect(streakSave.net.recoilStrength).toBe(0);
    expect(streakSave.durationMs).toBeGreaterThanOrEqual(520);

    expect(dangerGoal.audioEvent).toBe("danger-goal");
    expect(dangerGoal.hudTone).toBe("danger");
    expect(dangerGoal.visualEffects).toEqual(["feedback-goal-state-awaiting-physical-net-contact"]);
    expect(dangerGoal.ringCount).toBe(0);
    expect(dangerGoal.net.recoilStrength).toBeGreaterThan(streakSave.net.recoilStrength);
    expect(dangerGoal.net.pocketStrength).toBeGreaterThanOrEqual(0.9);
    expect(dangerGoal.cameraShake).toBeLessThanOrEqual(SCENE_TUNING.feedback.maxCameraShake * 1.24);

    expect(frame.audioEvent).toBe("frame-rattle");
    expect(frame.hudTone).toBe("frame");
    expect(frame.visualEffects).toEqual(expect.arrayContaining(["feedback-frame-rebound-highlight"]));
    expect(frame.cameraShake).toBeLessThan(dangerGoal.cameraShake);

    expect(turf.audioEvent).toBe("court-skid");
    expect(turf.hudTone).toBe("ambient");
    expect(turf.visualEffects).toEqual(expect.arrayContaining(["feedback-ground-skid", "feedback-court-dust-fleck"]));
    expect(turf.visualEffects.join(" ")).not.toMatch(/turf|grass|mowing/i);
    expect(turf.cameraShake).toBe(0);
    expect(turf.priority).toBe("ambient");
  });

  it("assigns restrained broadcast presentation tiers for save, goal, frame, and ground events", async () => {
    const sceneModule = await import("../src/three/goalkeeper-scene.js");

    const normalSave = sceneModule.getMatchEventFeedbackPlan({
      type: "save",
      contact: { type: "glove", strength: 20, point: { x: 0.22, y: 1.22, z: 3.14 } },
      state: { streak: 1, conceded: 0 },
    });
    const streakSave = sceneModule.getMatchEventFeedbackPlan({
      type: "save",
      contact: { type: "glove", strength: 34, point: { x: -0.18, y: 1.28, z: 3.14 } },
      state: { streak: 4, conceded: 0 },
    });
    const dangerGoal = sceneModule.getMatchEventFeedbackPlan({
      type: "goal",
      contact: { type: "net", strength: 1, point: { x: 0.5, y: 1.32, z: SHOT_3D.netPlaneZ } },
      state: { conceded: 4 },
    });
    const frame = sceneModule.getMatchEventFeedbackPlan({
      type: "frame",
      contact: { type: "frame", strength: 0.78, point: { x: -0.7, y: 2.32, z: SHOT_3D.netPlaneZ } },
    });
    const ground = sceneModule.getMatchEventFeedbackPlan({
      type: "ground",
      groundFeedback: { active: true, intensity: 0.4, speed: 4.2, point: { x: 0, y: 0.01, z: 2.6 } },
    });

    expect(normalSave.presentation.system).toBe("broadcast-event-feedback-presentation");
    expect(normalSave.presentation.tier).toBe("core");
    expect(normalSave.presentation.screenWashOpacity).toBeLessThan(0.18);
    expect(normalSave.presentation.cameraShakeMode).toBe("micro");

    expect(streakSave.presentation.tier).toBe("highlight");
    expect(streakSave.presentation.screenWashOpacity).toBeGreaterThan(normalSave.presentation.screenWashOpacity);
    expect(streakSave.presentation.hudBurst).toBe("streak-ribbon");

    expect(dangerGoal.presentation.tier).toBe("critical");
    expect(dangerGoal.presentation.screenWashOpacity).toBeGreaterThan(streakSave.presentation.screenWashOpacity);
    expect(dangerGoal.presentation.cameraShakeMode).toBe("recoil");
    expect(dangerGoal.presentation.slowMoMs).toBeLessThanOrEqual(120);

    expect(frame.presentation.tier).toBe("core");
    expect(frame.presentation.hudBurst).toBe("frame-chip");
    expect(ground.presentation.tier).toBe("ambient");
    expect(ground.presentation.screenWashOpacity).toBe(0);
  });

  it("defines a camera-attached broadcast presentation layer that stays subtle", () => {
    expect(SCENE_TUNING.presentation.system).toBe("camera-attached-broadcast-presentation-layer");
    expect(SCENE_TUNING.presentation.technique).toBe("three-camera-transparent-overlay-kit");
    expect(SCENE_TUNING.presentation.maxScreenWashOpacity).toBeLessThanOrEqual(0.1);
    expect(SCENE_TUNING.presentation.vignetteBaseOpacity).toBeLessThanOrEqual(0.18);
    expect(SCENE_TUNING.presentation.maxVignetteBoost).toBeLessThanOrEqual(0.1);
    expect(SCENE_TUNING.presentation.focusRingMaxOpacity).toBeLessThanOrEqual(0.08);
    expect(SCENE_TUNING.presentation.focusRingBaseScale).toBeLessThanOrEqual(0.4);
    expect(SCENE_TUNING.presentation.decay).toBeGreaterThanOrEqual(0.045);
    expect(SCENE_TUNING.presentation.decay).toBeLessThanOrEqual(0.085);
  });

  it("keeps normal saves crisp instead of bleaching the whole playfield", async () => {
    const sceneModule = await import("../src/three/goalkeeper-scene.js");
    const normalSave = sceneModule.getMatchEventFeedbackPlan({
      type: "save",
      contact: { type: "glove", strength: 22, point: { x: 0.22, y: 1.22, z: 3.14 } },
      state: { streak: 1, conceded: 0 },
    });
    const streakSave = sceneModule.getMatchEventFeedbackPlan({
      type: "save",
      contact: { type: "glove", strength: 34, point: { x: -0.18, y: 1.28, z: 3.14 } },
      state: { streak: 4, conceded: 0 },
    });

    expect(normalSave.presentation.screenWashOpacity).toBeLessThanOrEqual(0.035);
    expect(streakSave.presentation.screenWashOpacity).toBeLessThanOrEqual(0.065);
    expect(SCENE_TUNING.postprocessing.maxStrength).toBeLessThanOrEqual(0.065);
    expect(SCENE_TUNING.postprocessing.threshold).toBeGreaterThanOrEqual(0.88);
    expect(SCENE_TUNING.postprocessing.maxRadius).toBeLessThanOrEqual(0.24);
    expect(SCENE_TUNING.feedback.saveSparkCount).toBeLessThanOrEqual(8);
    expect(SCENE_TUNING.feedback.saveAfterimageCount).toBeLessThanOrEqual(3);
  });

  it("turns broadcast event plans into a short-lived screen presentation pulse", async () => {
    const sceneModule = await import("../src/three/goalkeeper-scene.js");

    expect(sceneModule.createCameraPresentationState).toBeTypeOf("function");
    expect(sceneModule.triggerCameraPresentationState).toBeTypeOf("function");
    expect(sceneModule.advanceCameraPresentationState).toBeTypeOf("function");
    expect(sceneModule.getCameraPresentationOverlayPlan).toBeTypeOf("function");
    expect(sceneModule.getCameraPresentationStatePlan).toBeTypeOf("function");

    const save = sceneModule.getMatchEventFeedbackPlan({
      type: "save",
      contact: { type: "glove", strength: 22, point: { x: 0.22, y: 1.22, z: 3.14 } },
      state: { streak: 1, conceded: 0 },
    });
    const dangerGoal = sceneModule.getMatchEventFeedbackPlan({
      type: "goal",
      contact: { type: "net", strength: 1, point: { x: 0.5, y: 1.32, z: SHOT_3D.netPlaneZ } },
      state: { conceded: 4 },
    });
    const ground = sceneModule.getMatchEventFeedbackPlan({
      type: "ground",
      groundFeedback: { active: true, intensity: 0.52, speed: 4.8, point: { x: 0, y: 0.01, z: 2.6 } },
    });

    const saveOverlay = sceneModule.getCameraPresentationOverlayPlan(save);
    const dangerOverlay = sceneModule.getCameraPresentationOverlayPlan(dangerGoal);
    const groundOverlay = sceneModule.getCameraPresentationOverlayPlan(ground);

    expect(saveOverlay.system).toBe("camera-attached-broadcast-presentation-layer");
    expect(saveOverlay.technique).toBe("three-camera-transparent-overlay-kit");
    expect(saveOverlay.active).toBe(true);
    expect(saveOverlay.screenWashOpacity).toBeGreaterThan(0);
    expect(saveOverlay.screenWashOpacity).toBeLessThanOrEqual(SCENE_TUNING.presentation.maxScreenWashOpacity);
    expect(saveOverlay.focusRingOpacity).toBeGreaterThan(0);
    expect(saveOverlay.vignetteOpacity).toBeGreaterThan(SCENE_TUNING.presentation.vignetteBaseOpacity);

    expect(dangerOverlay.screenWashOpacity).toBeGreaterThan(saveOverlay.screenWashOpacity);
    expect(dangerOverlay.focusRingOpacity).toBeGreaterThan(saveOverlay.focusRingOpacity);
    expect(dangerOverlay.tier).toBe("critical");
    expect(dangerOverlay.color).toBe(SCENE_TUNING.feedback.dangerGoalFlashColor);

    expect(groundOverlay.active).toBe(false);
    expect(groundOverlay.screenWashOpacity).toBe(0);
    expect(groundOverlay.focusRingOpacity).toBe(0);

    const state = sceneModule.createCameraPresentationState();
    sceneModule.triggerCameraPresentationState(state, dangerGoal);
    const livePlan = sceneModule.getCameraPresentationStatePlan(state);
    expect(livePlan.active).toBe(true);
    expect(livePlan.screenWashOpacity).toBeGreaterThan(0.07);

    sceneModule.advanceCameraPresentationState(state);
    const fadedPlan = sceneModule.getCameraPresentationStatePlan(state);
    expect(fadedPlan.life).toBeLessThan(livePlan.life);
    expect(fadedPlan.screenWashOpacity).toBeLessThan(livePlan.screenWashOpacity);
  });

  it("converts event feedback into restrained camera impulse modes instead of one generic shake", async () => {
    const sceneModule = await import("../src/three/goalkeeper-scene.js");

    expect(sceneModule.createCameraImpulseState).toBeTypeOf("function");
    expect(sceneModule.triggerCameraImpulseState).toBeTypeOf("function");
    expect(sceneModule.advanceCameraImpulseState).toBeTypeOf("function");
    expect(sceneModule.getCameraImpulseOffsetPlan).toBeTypeOf("function");

    const save = sceneModule.getMatchEventFeedbackPlan({
      type: "save",
      contact: { type: "glove", strength: 24, point: { x: 0.22, y: 1.22, z: 3.14 } },
      state: { streak: 1 },
    });
    const dangerGoal = sceneModule.getMatchEventFeedbackPlan({
      type: "goal",
      contact: { type: "net", strength: 1, point: { x: 0.7, y: 1.4, z: SHOT_3D.netPlaneZ } },
      state: { conceded: 4 },
    });

    const state = sceneModule.createCameraImpulseState();
    sceneModule.triggerCameraImpulseState(state, save);
    const saveImpulse = sceneModule.getCameraImpulseOffsetPlan(state, 7);

    expect(saveImpulse.system).toBe("event-weighted-camera-impulse");
    expect(saveImpulse.active).toBe(true);
    expect(saveImpulse.mode).toBe("micro");
    expect(Math.abs(saveImpulse.offset.x)).toBeGreaterThan(0);
    expect(Math.abs(saveImpulse.offset.y)).toBeGreaterThan(0);
    expect(Math.abs(saveImpulse.offset.z)).toBeLessThanOrEqual(SCENE_TUNING.feedback.maxCameraShake * 0.18);
    expect(Math.abs(saveImpulse.roll)).toBeLessThanOrEqual(0.008);
    expect(saveImpulse.amount).toBeLessThanOrEqual(SCENE_TUNING.feedback.maxCameraShake);

    sceneModule.triggerCameraImpulseState(state, dangerGoal);
    const dangerImpulse = sceneModule.getCameraImpulseOffsetPlan(state, 8);

    expect(dangerImpulse.mode).toBe("recoil");
    expect(dangerImpulse.amount).toBeGreaterThan(saveImpulse.amount);
    expect(dangerImpulse.offset.z).toBeGreaterThan(Math.abs(saveImpulse.offset.z));
    expect(Math.abs(dangerImpulse.roll)).toBeGreaterThan(Math.abs(saveImpulse.roll));
    expect(dangerImpulse.amount).toBeLessThanOrEqual(SCENE_TUNING.feedback.maxCameraShake * 1.24);

    sceneModule.advanceCameraImpulseState(state);
    const fadedImpulse = sceneModule.getCameraImpulseOffsetPlan(state, 9);
    expect(fadedImpulse.life).toBeLessThan(dangerImpulse.life);
    expect(fadedImpulse.amount).toBeLessThan(dangerImpulse.amount);
  });

  it("advances a damped spring net recoil so goals push the net then rebound and settle", async () => {
    const sceneModule = await import("../src/three/goalkeeper-scene.js");

    expect(sceneModule.createNetRecoilState).toBeTypeOf("function");
    expect(sceneModule.triggerNetRecoilState).toBeTypeOf("function");
    expect(sceneModule.advanceNetRecoilState).toBeTypeOf("function");
    expect(sceneModule.getNetRecoilMotionPlan).toBeTypeOf("function");

    const state = sceneModule.createNetRecoilState();
    sceneModule.triggerNetRecoilState(state, {
      point: { x: 0.82, y: 1.36, z: SHOT_3D.netPlaneZ },
      strength: 0.94,
    });

    const initialPlan = sceneModule.getNetRecoilMotionPlan(state);
    expect(initialPlan.marker).toBe("feedback-net-spring-rebound");
    expect(initialPlan.system).toBe("damped-net-spring-rebound");
    expect(initialPlan.point.x).toBeCloseTo(0.82);
    expect(initialPlan.netZOffset).toBeGreaterThan(0.1);
    expect(initialPlan.detailPulse).toBeGreaterThan(0.5);

    const samples = [];
    for (let index = 0; index < 44; index += 1) {
      sceneModule.advanceNetRecoilState(state, 1 / 60);
      samples.push(sceneModule.getNetRecoilMotionPlan(state).netZOffset);
    }

    expect(samples.some((offset) => offset < -0.01)).toBe(true);
    expect(Math.max(...samples)).toBeLessThanOrEqual(SCENE_TUNING.feedback.netRecoilMaxTravel);

    for (let index = 0; index < 160; index += 1) {
      sceneModule.advanceNetRecoilState(state, 1 / 60);
    }
    const settledPlan = sceneModule.getNetRecoilMotionPlan(state);
    expect(Math.abs(settledPlan.netZOffset)).toBeLessThan(0.012);
    expect(settledPlan.active).toBe(false);
  });

  it("plans reactive woven-net recoil for diagonal net and rope details", async () => {
    const sceneModule = await import("../src/three/goalkeeper-scene.js");

    expect(sceneModule.getDynamicNetDetailMotionPlan).toBeTypeOf("function");

    const plan = sceneModule.getDynamicNetDetailMotionPlan(
      {
        name: "goal-net-diagonal-weave-rising",
        basePosition: { x: 0.45, y: 1.35, z: 4.72 },
        motionScale: 1.1,
      },
      0.82,
      { x: 0.2, y: 1.24, z: SHOT_3D.netPlaneZ },
    );

    expect(plan.marker).toBe("feedback-dynamic-net-detail-recoil");
    expect(plan.name).toBe("goal-net-diagonal-weave-rising");
    expect(plan.position.z).toBeGreaterThan(4.72);
    expect(plan.position.x).not.toBeCloseTo(0.45);
    expect(plan.opacityBoost).toBeGreaterThan(0);
    expect(plan.opacityBoost).toBeLessThanOrEqual(0.24);

    const quiet = sceneModule.getDynamicNetDetailMotionPlan(
      {
        name: "goal-net-side-left",
        basePosition: { x: -3.4, y: 1.1, z: 5.1 },
        motionScale: 0.7,
      },
      0,
      { x: 0, y: 1.2, z: SHOT_3D.netPlaneZ },
    );

    expect(quiet.position).toEqual({ x: -3.4, y: 1.1, z: 5.1 });
    expect(quiet.opacityBoost).toBe(0);
  });

  it("keeps frame-anchored net panels at their base transform during recoil", async () => {
    const sceneModule = await import("../src/three/goalkeeper-scene.js");
    const basePosition = { x: 0, y: 0.975, z: 6.25 };
    const plan = sceneModule.getDynamicNetDetailMotionPlan(
      {
        name: "goal-net-panel-rear",
        basePosition,
        motionScale: 1,
        anchoredPanel: true,
      },
      0.9,
      { x: 1.2, y: 1.4, z: SHOT_3D.netPlaneZ },
    );

    expect(plan.anchoredPanel).toBe(true);
    expect(plan.position).toEqual(basePosition);
    expect(plan.opacityBoost).toBeGreaterThan(0);
  });

  it("keeps the rear net boundary vertices fixed during localized pocket deformation", async () => {
    const sceneModule = await import("../src/three/goalkeeper-scene.js");
    const halfHeight = GOAL_NET_GEOMETRY.rearHeight * 0.5;
    const impact = { point: { x: 3.1, y: 1.9 }, radius: 1, depth: 0.16 };

    expect(sceneModule.getNetPocketVertexDepthOffset(GOAL_NET_GEOMETRY.rearHalfWidth, halfHeight * 0.8, impact)).toBe(0);
    expect(sceneModule.getNetPocketVertexDepthOffset(3.1, halfHeight, impact)).toBe(0);
    expect(sceneModule.getNetPocketVertexDepthOffset(3.1, halfHeight * 0.8, impact)).toBeGreaterThan(0);
  });

  it("deforms the actual rear, side, and top net panels in their physical impact directions", async () => {
    const sceneModule = await import("../src/three/goalkeeper-scene.js");

    expect(sceneModule.getNetPanelVertexDisplacement).toBeTypeOf("function");
    const middleZ = GOAL_NET_GEOMETRY.netPlaneZ + GOAL_NET_GEOMETRY.cageDepth * 0.5;
    const sideHalfWidth = (GOAL_NET_GEOMETRY.halfWidth + GOAL_NET_GEOMETRY.rearHalfWidth) * 0.5;
    const roofHeight = (GOAL_NET_GEOMETRY.height + GOAL_NET_GEOMETRY.rearHeight) * 0.5;
    const common = { radius: 0.92, depth: 0.26, life: 0.92, strength: 0.86 };

    const rear = sceneModule.getNetPanelVertexDisplacement(
      "rear",
      { x: 0.2, y: 1.2, z: GOAL_NET_GEOMETRY.netPlaneZ + GOAL_NET_GEOMETRY.cageDepth },
      { ...common, panel: "rear", point: { x: 0.2, y: 1.2, z: GOAL_NET_GEOMETRY.netPlaneZ + GOAL_NET_GEOMETRY.cageDepth } },
    );
    const left = sceneModule.getNetPanelVertexDisplacement(
      "left",
      { x: -sideHalfWidth, y: 1.2, z: middleZ },
      { ...common, panel: "left", point: { x: -sideHalfWidth, y: 1.2, z: middleZ } },
    );
    const right = sceneModule.getNetPanelVertexDisplacement(
      "right",
      { x: sideHalfWidth, y: 1.2, z: middleZ },
      { ...common, panel: "right", point: { x: sideHalfWidth, y: 1.2, z: middleZ } },
    );
    const top = sceneModule.getNetPanelVertexDisplacement(
      "top",
      { x: 0, y: roofHeight, z: middleZ },
      { ...common, panel: "top", point: { x: 0, y: roofHeight, z: middleZ } },
    );
    const rearRebound = sceneModule.getNetPanelVertexDisplacement(
      "rear",
      { x: 0.2, y: 1.2, z: GOAL_NET_GEOMETRY.netPlaneZ + GOAL_NET_GEOMETRY.cageDepth },
      {
        ...common,
        panel: "rear",
        point: { x: 0.2, y: 1.2, z: GOAL_NET_GEOMETRY.netPlaneZ + GOAL_NET_GEOMETRY.cageDepth },
        depth: 0.08,
        springDisplacement: -0.15,
        rippleAmplitude: 0,
      },
    );

    expect(rear.z).toBeGreaterThan(0.12);
    expect(left.x).toBeLessThan(-0.1);
    expect(right.x).toBeGreaterThan(0.1);
    expect(top.y).toBeGreaterThan(0.1);
    expect(rearRebound.z).toBeLessThan(-0.04);
    expect(Math.abs(rear.x) + Math.abs(rear.y)).toBe(0);
  });

  it("keeps every panel edge attached to the goal frame during deformation", async () => {
    const sceneModule = await import("../src/three/goalkeeper-scene.js");
    const rearPlan = {
      panel: "rear",
      point: { x: 0, y: 1.2, z: GOAL_NET_GEOMETRY.netPlaneZ + GOAL_NET_GEOMETRY.cageDepth },
      radius: 1.1,
      depth: 0.28,
      life: 0.9,
      strength: 0.9,
    };
    const sidePlan = {
      ...rearPlan,
      panel: "left",
      point: { x: -GOAL_NET_GEOMETRY.halfWidth, y: 1.2, z: GOAL_NET_GEOMETRY.netPlaneZ },
    };

    expect(sceneModule.getNetPanelVertexDisplacement(
      "rear",
      { x: GOAL_NET_GEOMETRY.rearHalfWidth, y: 1.2, z: rearPlan.point.z },
      rearPlan,
    )).toEqual({ x: 0, y: 0, z: 0 });
    expect(sceneModule.getNetPanelVertexDisplacement(
      "left",
      { x: -GOAL_NET_GEOMETRY.halfWidth, y: 1.2, z: GOAL_NET_GEOMETRY.netPlaneZ },
      sidePlan,
    )).toEqual({ x: 0, y: 0, z: 0 });
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
    expect(plan.system).toBe("panel-aware-vertex-spring-net");
    expect(plan.panel).toBe("rear");
    expect(plan.patches).toEqual([]);
    expect(plan.depth).toBeGreaterThan(0.16);
    expect(plan.radius).toBeGreaterThanOrEqual(SCENE_TUNING.feedback.netRippleContactRadius);
    expect(plan.rippleAmplitude).toBeGreaterThan(0.04);
    expect(plan.life).toBe(1);

    sceneModule.advanceNetPocketState(state);
    expect(state.life).toBeLessThan(1);

    expect(sceneModule.getNetPocketFeedbackPlan(sceneModule.createNetPocketState())).toBeNull();
  });

  it("retires detached cord shimmer because the real net surface now carries the impact", async () => {
    const sceneModule = await import("../src/three/goalkeeper-scene.js");

    expect(sceneModule.getNetCordTensionFeedbackPlan).toBeTypeOf("function");

    const plan = sceneModule.getNetCordTensionFeedbackPlan(
      {
        point: { x: -0.68, y: 1.34, z: SHOT_3D.netPlaneZ },
        life: 0.92,
        strength: 0.88,
      },
      SCENE_TUNING.feedback,
    );

    expect(plan.marker).toBe("feedback-net-cord-tension-shimmer");
    expect(plan.system).toBe("localized-net-cord-tension-shimmer");
    expect(plan.segments).toEqual([]);

    const quiet = sceneModule.getNetCordTensionFeedbackPlan({ life: 0, point: plan.point }, SCENE_TUNING.feedback);
    expect(quiet).toBeNull();
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

  it("plans restrained court dust flecks for fresh rolling ground contact", async () => {
    const sceneModule = await import("../src/three/goalkeeper-scene.js");

    expect(sceneModule.getCourtDustFleckPlan).toBeTypeOf("function");

    const flecks = sceneModule.getCourtDustFleckPlan({
      active: true,
      age: 0.02,
      intensity: 0.72,
      speed: 5.4,
      point: { x: -0.35, y: 0.012, z: 2.9 },
      direction: { x: 0.56, y: 0, z: -0.83 },
    });

    expect(flecks).toHaveLength(SCENE_TUNING.feedback.courtDustFleckCount);
    expect(flecks[0].marker).toBe("feedback-court-dust-fleck");
    expect(flecks[0].position.y).toBeGreaterThan(0.012);
    expect(flecks[0].velocity.y).toBeGreaterThan(0);
    expect(flecks[0].opacity).toBeLessThanOrEqual(SCENE_TUNING.feedback.courtDustFleckMaxOpacity);
    expect(flecks[0].scale.x).toBeGreaterThan(0);
    expect(flecks[0].scale.y).toBeLessThanOrEqual(flecks[0].scale.x);
    expect(flecks.some((fleck) => fleck.velocity.x > 0)).toBe(true);
    expect(flecks.some((fleck) => fleck.velocity.z < 0)).toBe(true);
    expect(flecks.map((fleck) => fleck.marker).join(" ")).not.toMatch(/turf|grass|mowing/i);

    expect(sceneModule.getCourtDustFleckPlan({ active: false })).toEqual([]);
    expect(sceneModule.getCourtDustFleckPlan({ active: true, age: 0.4, point: { x: 0, y: 0, z: 0 } })).toEqual([]);
  });

  it("plans directional glove save afterimages without turning saves into noisy effects", async () => {
    const sceneModule = await import("../src/three/goalkeeper-scene.js");

    expect(sceneModule.getSaveAfterimagePlan).toBeTypeOf("function");

    const afterimages = sceneModule.getSaveAfterimagePlan(
      {
        type: "glove",
        side: "right",
        point: { x: 0.46, y: 1.28, z: 3.14 },
        normal: { x: 0.55, y: 0.08, z: -0.78 },
        strength: 24,
      },
      {
        left: { x: -0.34, y: 1.2, z: 3.15 },
        right: { x: 0.34, y: 1.2, z: 3.15 },
        center: { x: 0, y: 1.2, z: 3.15 },
        velocity: { x: 3.2, y: 0.45, z: 0 },
      },
    );

    expect(afterimages).toHaveLength(SCENE_TUNING.feedback.saveAfterimageCount);
    expect(afterimages[0].marker).toBe("feedback-save-afterimage");
    expect(afterimages[0].position.x).toBeGreaterThan(afterimages[afterimages.length - 1].position.x);
    expect(afterimages[0].position.z).toBeLessThanOrEqual(3.14);
    expect(afterimages[0].opacity).toBeLessThanOrEqual(SCENE_TUNING.feedback.saveAfterimageMaxOpacity);
    expect(afterimages[0].opacity).toBeGreaterThan(afterimages[afterimages.length - 1].opacity);
    expect(afterimages[0].scale.x).toBeGreaterThan(0);
    expect(afterimages[0].scale.y).toBeGreaterThan(afterimages[0].scale.x);
    expect(afterimages[0].life).toBeGreaterThan(0.38);

    expect(sceneModule.getSaveAfterimagePlan({ type: "net" }, null)).toEqual([]);
  });

  it("plans a restrained glove-ball contact pressure face for save impact readability", async () => {
    const sceneModule = await import("../src/three/goalkeeper-scene.js");

    expect(sceneModule.getSaveContactPressurePlan).toBeTypeOf("function");

    const pressure = sceneModule.getSaveContactPressurePlan(
      {
        type: "glove",
        side: "left",
        point: { x: -0.42, y: 1.18, z: 3.16 },
        normal: { x: -0.5, y: 0.08, z: -0.74 },
        strength: 26,
      },
      {
        left: { x: -0.34, y: 1.15, z: 3.15 },
        right: { x: 0.34, y: 1.15, z: 3.15 },
        center: { x: 0, y: 1.15, z: 3.15 },
        velocity: { x: -2.8, y: 0.2, z: 0 },
      },
    );

    expect(pressure.system).toBe("glove-ball-contact-pressure-kit");
    expect(pressure.arcs).toHaveLength(SCENE_TUNING.feedback.savePressureArcCount);
    expect(pressure.arcs[0].marker).toBe("feedback-save-pressure-arc");
    expect(pressure.arcs[0].position.x).toBeCloseTo(-0.42, 1);
    expect(pressure.arcs[0].position.z).toBeLessThanOrEqual(3.17);
    expect(pressure.arcs[0].opacity).toBeLessThanOrEqual(SCENE_TUNING.feedback.savePressureMaxOpacity);
    expect(pressure.arcs[0].scale.x).toBeGreaterThan(0.18);
    expect(pressure.arcs[0].scale.y).toBeLessThan(pressure.arcs[0].scale.x);
    expect(pressure.arcs[0].life).toBeGreaterThan(0.34);
    expect(pressure.arcs[0].rotation).not.toBe(pressure.arcs[pressure.arcs.length - 1].rotation);

    expect(sceneModule.getSaveContactPressurePlan({ type: "net" }, null)).toEqual({ system: "glove-ball-contact-pressure-kit", arcs: [] });
  });

  it("plans a localized glove palm deformation so saves feel materially connected", async () => {
    const sceneModule = await import("../src/three/goalkeeper-scene.js");

    expect(sceneModule.getGloveContactDeformationPlan).toBeTypeOf("function");

    const deformation = sceneModule.getGloveContactDeformationPlan(
      {
        type: "glove",
        side: "right",
        part: "palm",
        point: { x: 0.38, y: 1.22, z: 3.14 },
        normal: { x: 0.42, y: 0.1, z: -0.72 },
        strength: 30,
        compression: 0.58,
        reboundSpeed: 28,
      },
      {
        left: { x: -0.34, y: 1.18, z: 3.15 },
        right: { x: 0.34, y: 1.18, z: 3.15 },
        center: { x: 0, y: 1.18, z: 3.15 },
        velocity: { x: 4.6, y: 0.8, z: 0 },
      },
    );

    expect(deformation.system).toBe("localized-glove-palm-deformation");
    expect(deformation.side).toBe("right");
    expect(deformation.dimple.marker).toBe("feedback-glove-contact-dimple");
    expect(deformation.dimple.position.x).toBeCloseTo(0.38, 2);
    expect(deformation.dimple.position.z).toBeLessThanOrEqual(3.14);
    expect(deformation.dimple.scale.x).toBeGreaterThan(deformation.dimple.scale.y);
    expect(deformation.dimple.opacity).toBeLessThanOrEqual(SCENE_TUNING.gloves.contactDimpleMaxOpacity);
    expect(deformation.highlight.marker).toBe("feedback-glove-latex-rebound-highlight");
    expect(deformation.highlight.opacity).toBeGreaterThan(0.18);
    expect(deformation.creases).toHaveLength(SCENE_TUNING.gloves.contactCreaseCount);
    expect(deformation.creases[0].marker).toBe("feedback-glove-palm-crease");
    expect(deformation.creases[0].rotation).not.toBe(deformation.creases[deformation.creases.length - 1].rotation);

    expect(sceneModule.getGloveContactDeformationPlan({ type: "net" }, null)).toEqual({
      system: "localized-glove-palm-deformation",
      side: null,
      dimple: null,
      highlight: null,
      creases: [],
    });
  });

  it("uses a warm stadium lighting rig instead of flat prototype lighting", () => {
    expect(SCENE_TUNING.lighting.assetSystem).toBe("warm-stadium-three-point");
    expect(SCENE_TUNING.lighting.hemisphereIntensity).toBeGreaterThanOrEqual(2);
    expect(SCENE_TUNING.lighting.hemisphereGroundColor).toBe("#68737b");
    expect(SCENE_TUNING.lighting.sunIntensity).toBeGreaterThanOrEqual(2);
    expect(SCENE_TUNING.lighting.rimIntensity).toBeGreaterThanOrEqual(0.55);
    expect(SCENE_TUNING.lighting.fillIntensity).toBeLessThanOrEqual(0.9);
  });

  it("uses the reusable Three Sky shader for a restrained training-ground atmosphere", async () => {
    const sceneModule = await import("../src/three/goalkeeper-scene.js");

    expect(SCENE_TUNING.environment.system).toBe("three-sky-atmospheric-training-ground");
    expect(SCENE_TUNING.environment.technique).toBe("three-official-sky-shader");
    expect(SCENE_TUNING.environment.addonSource).toBe("three/addons/objects/Sky");
    expect(SCENE_TUNING.environment.scale).toBeGreaterThanOrEqual(60);
    expect(SCENE_TUNING.environment.scale).toBeLessThanOrEqual(100);
    expect(SCENE_TUNING.environment.turbidity).toBeLessThanOrEqual(2.2);
    expect(SCENE_TUNING.environment.rayleigh).toBeLessThanOrEqual(0.7);
    expect(SCENE_TUNING.environment.mieCoefficient).toBeLessThanOrEqual(0.003);
    expect(SCENE_TUNING.environment.showSunDisc).toBe(false);
    expect(SCENE_TUNING.environment.fogColor).toBe("#dfe6e8");

    expect(sceneModule.createSkyEnvironment).toBeTypeOf("function");
    const environment = sceneModule.createSkyEnvironment(SCENE_TUNING.environment);
    expect(environment.system).toBe(SCENE_TUNING.environment.system);
    expect(environment.sky.name).toBe("training-ground-atmospheric-sky");
    expect(environment.sky.userData.environmentSystem).toBe(SCENE_TUNING.environment.system);
    expect(environment.sky.userData.addonSource).toBe("three/addons/objects/Sky");
    expect(environment.sky.material.uniforms.showSunDisc.value).toBe(0);
    expect(environment.sunVector.length()).toBeCloseTo(1, 4);
  });

  it("uses reusable Three postprocessing bloom for event polish without making ambient play flashy", async () => {
    const sceneModule = await import("../src/three/goalkeeper-scene.js");

    expect(SCENE_TUNING.postprocessing.system).toBe("three-effectcomposer-unreal-bloom-event-pipeline");
    expect(SCENE_TUNING.postprocessing.technique).toBe("three-official-postprocessing-addons");
    expect(SCENE_TUNING.postprocessing.addonSources).toContain("three/addons/postprocessing/EffectComposer");
    expect(SCENE_TUNING.postprocessing.addonSources).toContain("three/addons/postprocessing/UnrealBloomPass");
    expect(SCENE_TUNING.postprocessing.addonSources).toContain("three/addons/postprocessing/SMAAPass");
    expect(SCENE_TUNING.postprocessing.baseStrength).toBeLessThanOrEqual(0.02);
    expect(SCENE_TUNING.postprocessing.maxStrength).toBeLessThanOrEqual(0.065);
    expect(SCENE_TUNING.postprocessing.threshold).toBeGreaterThanOrEqual(0.88);
    expect(SCENE_TUNING.postprocessing.maxRadius).toBeLessThanOrEqual(0.24);
    expect(SCENE_TUNING.postprocessing.eventDecay).toBeLessThanOrEqual(0.045);
    expect(SCENE_TUNING.postprocessing.pixelRatioCap).toBeGreaterThanOrEqual(2.5);
    expect(SCENE_TUNING.postprocessing.maxPixelCount).toBeGreaterThanOrEqual(7_000_000);

    expect(sceneModule.getEventBloomPlan).toBeTypeOf("function");
    expect(sceneModule.getRenderQualityPlan).toBeTypeOf("function");
    expect(sceneModule.createPostprocessingBloomState).toBeTypeOf("function");
    expect(sceneModule.triggerPostprocessingBloomState).toBeTypeOf("function");
    expect(sceneModule.advancePostprocessingBloomState).toBeTypeOf("function");
    expect(sceneModule.getPostprocessingBloomStatePlan).toBeTypeOf("function");

    const ambient = sceneModule.getEventBloomPlan(sceneModule.getMatchEventFeedbackPlan({ type: "ambient" }));
    const save = sceneModule.getEventBloomPlan(sceneModule.getMatchEventFeedbackPlan({
      type: "save",
      contact: { type: "glove", strength: 24 },
      state: { streak: 1 },
    }));
    const streak = sceneModule.getEventBloomPlan(sceneModule.getMatchEventFeedbackPlan({
      type: "save",
      contact: { type: "glove", strength: 28 },
      state: { streak: 3 },
    }));
    const dangerGoal = sceneModule.getEventBloomPlan(sceneModule.getMatchEventFeedbackPlan({
      type: "goal",
      contact: { type: "net", strength: 24 },
      state: { conceded: 4 },
    }));

    expect(ambient.active).toBe(false);
    expect(ambient.strength).toBe(SCENE_TUNING.postprocessing.baseStrength);
    expect(save.active).toBe(false);
    expect(save.strength).toBe(ambient.strength);
    expect(streak.active).toBe(true);
    expect(streak.strength).toBeGreaterThan(save.strength);
    expect(dangerGoal.strength).toBeGreaterThan(streak.strength);
    expect(dangerGoal.strength).toBeLessThanOrEqual(SCENE_TUNING.postprocessing.maxStrength);

    const state = sceneModule.createPostprocessingBloomState();
    sceneModule.triggerPostprocessingBloomState(state, dangerGoal);
    expect(state.life).toBe(1);
    expect(state.strength).toBe(dangerGoal.strength);
    expect(sceneModule.getPostprocessingBloomStatePlan(state).active).toBe(true);
    sceneModule.advancePostprocessingBloomState(state);
    expect(state.life).toBeLessThan(1);

    const mobileQuality = sceneModule.getRenderQualityPlan(844, 390, 3);
    expect(mobileQuality.pixelRatio).toBe(2.5);
    expect(mobileQuality.renderWidth).toBe(2110);
    expect(mobileQuality.renderHeight).toBe(975);
    expect(mobileQuality.antialiasSystem).toBe("hardware-msaa-plus-smaa");

    const retinaDesktopQuality = sceneModule.getRenderQualityPlan(1920, 1080, 2);
    expect(retinaDesktopQuality.pixelRatio).toBeGreaterThan(1.8);
    expect(retinaDesktopQuality.pixelRatio).toBeLessThan(2);
    expect(retinaDesktopQuality.pixelCount).toBeLessThanOrEqual(
      SCENE_TUNING.postprocessing.maxPixelCount,
    );
  });

  it("adds real Three spotlights that line up with the stadium floodlight props", async () => {
    const sceneModule = await import("../src/three/goalkeeper-scene.js");

    expect(sceneModule.createStadiumLightingRig).toBeTypeOf("function");
    expect(SCENE_TUNING.lighting.stadiumRigSystem).toBe("three-spotlight-broadcast-rig");

    const rig = sceneModule.createStadiumLightingRig(SCENE_TUNING.lighting);

    expect(rig.system).toBe("three-spotlight-broadcast-rig");
    expect(rig.group.name).toBe("stadium-spotlight-rig");
    expect(rig.lights).toHaveLength(4);
    expect(rig.targets).toHaveLength(4);
    expect(rig.lights.every((light) => light instanceof THREE.SpotLight)).toBe(true);
    expect(rig.lights.every((light) => light.userData.lightingSystem === "three-spotlight-broadcast-rig")).toBe(true);
    expect(rig.lights.every((light) => light.target?.name.startsWith("stadium-spotlight-target-"))).toBe(true);
    expect(rig.lights.every((light) => light.angle <= 0.7 && light.penumbra >= 0.45)).toBe(true);
    expect(rig.lights.some((light) => light.position.x < 0)).toBe(true);
    expect(rig.lights.some((light) => light.position.x > 0)).toBe(true);
    expect(rig.targets.every((target) => target.position.z > -3 && target.position.z < 3.8)).toBe(true);
  });

  it("integrates the local CC0 HDR and court PBR pipeline without replacing the authored sky", async () => {
    const sceneSource = await readFile(new URL("../src/three/goalkeeper-scene.js", import.meta.url), "utf8");

    expect(SCENE_TUNING.environment.reusableAssetSystem).toBe("poly-haven-cc0-matchday-pbr");
    expect(SCENE_TUNING.environment.backgroundReplacement).toBe(false);
    expect(sceneSource).toMatch(/createReusableEnvironmentAssetPipeline/);
    expect(sceneSource).toMatch(/fieldGroup:\s*field/);
    expect(sceneSource).toMatch(/environmentAssetPipeline\.dispose\(\)/);
  });

  it("keeps one canonical framing instead of composition demo presets", async () => {
    const sceneModule = await import("../src/three/goalkeeper-scene.js");

    expect(sceneModule.COMPOSITION_PRESETS).toBeUndefined();
    expect(sceneModule.DEFAULT_COMPOSITION_PRESET).toBeUndefined();
    expect(sceneModule.getGoalkeeperCompositionPreset).toBeUndefined();
  });
});
