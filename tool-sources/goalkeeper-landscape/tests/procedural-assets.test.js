import { describe, expect, it } from "vitest";
import {
  createFieldGroup,
  createFootballMaterial,
  createFootballTexture,
  createGloveMesh,
  createGoalAndNet,
  createShooterModel,
  getMatchdayAssetPolishProfile,
  getStadiumScoreboardPlan,
  updateShooterModel,
} from "../src/three/procedural-assets.js";

function collectByName(root, pattern) {
  const matches = [];
  root.traverse((node) => {
    if (pattern.test(node.name || "")) matches.push(node);
  });
  return matches;
}

describe("procedural 3D assets", () => {
  it("places the shooter at the closer shot origin", () => {
    const shooter = createShooterModel();

    expect(shooter.group.position.z).toBeGreaterThanOrEqual(-20);
    expect(shooter.group.position.z).toBeLessThanOrEqual(-18);
  });

  it("replaces the distant shooter with a polished ball launcher machine", () => {
    const launcher = createShooterModel();

    expect(launcher.group.userData.visualStyle).toBe("polished-ball-launcher");
    expect(launcher.group.scale.x).toBeGreaterThanOrEqual(1.35);
    expect(collectByName(launcher.group, /^launcher-body/)).toHaveLength(1);
    expect(collectByName(launcher.group, /^launcher-barrel/)).toHaveLength(1);
    expect(collectByName(launcher.group, /^launcher-hopper/)).toHaveLength(1);
    expect(collectByName(launcher.group, /^launcher-wheel-(left|right)$/)).toHaveLength(2);
    expect(collectByName(launcher.group, /^launcher-feed-ball/)).toHaveLength(1);
    expect(collectByName(launcher.group, /^launcher-stand-/).length).toBeGreaterThanOrEqual(3);
    expect(collectByName(launcher.group, /^launcher-accent-/).length).toBeGreaterThanOrEqual(3);
    expect(collectByName(launcher.group, /^shooter-head|^shooter-neck|^shooter-jersey-/)).toHaveLength(0);
  });

  it("grounds the launcher in a finished launch bay with feed balls and restrained firing feedback", () => {
    const launcher = createShooterModel();

    expect(launcher.group.userData.launcherStationSystem).toBe("animated-launch-bay-with-ball-feed");
    expect(collectByName(launcher.group, /^launcher-kick-pad$/)).toHaveLength(1);
    expect(collectByName(launcher.group, /^launcher-aim-rail-/)).toHaveLength(2);
    expect(collectByName(launcher.group, /^launcher-lane-chevron-/).length).toBeGreaterThanOrEqual(3);
    expect(collectByName(launcher.group, /^launcher-feed-queue-ball-/)).toHaveLength(3);
    expect(collectByName(launcher.group, /^launcher-cable-/).length).toBeGreaterThanOrEqual(2);
    expect(collectByName(launcher.group, /^launcher-charge-ring$/)).toHaveLength(1);
    expect(collectByName(launcher.group, /^launcher-muzzle-flash$/)).toHaveLength(1);
    expect(launcher.muzzleFlash.material.transparent).toBe(true);
    expect(launcher.muzzleFlash.material.opacity).toBe(0);
  });

  it("adds a professional training rig and operator silhouette around the launcher", () => {
    const launcher = createShooterModel();

    expect(launcher.group.userData.launcherRigSystem).toBe("pro-matchday-machine-rig");
    expect(collectByName(launcher.group, /^launcher-control-console$/)).toHaveLength(1);
    expect(collectByName(launcher.group, /^launcher-control-screen$/)).toHaveLength(1);
    expect(collectByName(launcher.group, /^launcher-status-led-/).length).toBeGreaterThanOrEqual(4);
    expect(collectByName(launcher.group, /^launcher-safety-guard-/)).toHaveLength(2);
    expect(collectByName(launcher.group, /^launcher-calibration-beam-/)).toHaveLength(2);
    expect(collectByName(launcher.group, /^launcher-ground-anchor-/).length).toBeGreaterThanOrEqual(4);
    expect(collectByName(launcher.group, /^launcher-pressure-hose-/).length).toBeGreaterThanOrEqual(2);
    expect(collectByName(launcher.group, /^launcher-service-panel-screw-/).length).toBeGreaterThanOrEqual(4);
    expect(collectByName(launcher.group, /^launcher-number-plate$/)).toHaveLength(1);

    expect(collectByName(launcher.group, /^launcher-operator-/).length).toBeGreaterThanOrEqual(7);
    expect(collectByName(launcher.group, /^launcher-operator-tablet$/)).toHaveLength(1);
    expect(launcher.controlScreen.material.transparent).toBe(true);
    expect(launcher.calibrationBeams).toHaveLength(2);
    expect(launcher.statusLeds.length).toBeGreaterThanOrEqual(4);
  });

  it("animates the professional launcher rig without adding noisy shot helper lines", () => {
    const launcher = createShooterModel();

    updateShooterModel(launcher, {
      phase: "cue",
      phaseTime: 0.58,
      currentShot: { cueDuration: 1, cue: { side: 1 } },
    });

    const cueScreenOpacity = launcher.controlScreen.material.opacity;
    const cueBeamOpacity = launcher.calibrationBeams[0].material.opacity;
    expect(cueScreenOpacity).toBeGreaterThan(0.42);
    expect(cueBeamOpacity).toBeGreaterThan(0.18);
    expect(launcher.calibrationBeams[0].visible).toBe(true);
    expect(launcher.operatorTablet.material.opacity).toBeGreaterThan(0.38);

    updateShooterModel(launcher, {
      phase: "live",
      phaseTime: 0.06,
      currentShot: { cueDuration: 1, cue: { side: 1 } },
    });

    expect(launcher.controlScreen.material.opacity).toBeGreaterThan(cueScreenOpacity);
    expect(launcher.calibrationBeams[0].material.opacity).toBeLessThanOrEqual(0.55);
    expect(launcher.statusLeds.some((led) => led.material.opacity > 0.8)).toBe(true);
    expect(launcher.safetyGuards[0].rotation.y).not.toBe(0);
  });

  it("pulses the launcher muzzle only at the moment the shot leaves", () => {
    const launcher = createShooterModel();
    updateShooterModel(launcher, {
      phase: "cue",
      phaseTime: 0.72,
      currentShot: { cueDuration: 1, cue: { side: -1 } },
    });

    expect(launcher.muzzleFlash.visible).toBe(false);
    expect(launcher.chargeRing.material.opacity).toBeGreaterThan(0.36);

    updateShooterModel(launcher, {
      phase: "live",
      phaseTime: 0.08,
      currentShot: { cueDuration: 1, cue: { side: -1 } },
    });

    expect(launcher.muzzleFlash.visible).toBe(true);
    expect(launcher.muzzleFlash.material.opacity).toBeGreaterThan(0.28);
    expect(launcher.chargeRing.material.opacity).toBeGreaterThan(0.4);

    updateShooterModel(launcher, {
      phase: "live",
      phaseTime: 0.5,
      currentShot: { cueDuration: 1, cue: { side: -1 } },
    });

    expect(launcher.muzzleFlash.visible).toBe(false);
    expect(launcher.muzzleFlash.material.opacity).toBe(0);
  });

  it("builds polished orange gloves with highlights and black cuffs", () => {
    const glove = createGloveMesh("left");

    expect(glove.userData.visualStyle).toBe("polished-orange-reference-glove");
    expect(collectByName(glove, /^glove-finger-/)).toHaveLength(4);
    expect(collectByName(glove, /^glove-seam-/).length).toBeGreaterThanOrEqual(5);
    expect(collectByName(glove, /^glove-highlight-/).length).toBeGreaterThanOrEqual(3);
    expect(collectByName(glove, /^glove-cuff$/)).toHaveLength(1);
    expect(collectByName(glove, /^glove-palm-pad/)).toHaveLength(1);
  });

  it("uses a clean non-grass training surface with readable white markings", () => {
    const field = createFieldGroup();
    const surface = collectByName(field, /^field-training-surface$/)[0];
    const stripes = collectByName(field, /^field-mowing-stripe-/);
    const turfPatches = collectByName(field, /^field-turf-color-variation-patch-/);
    const markings = collectByName(field, /^field-standard-/);

    expect(field.userData.visualStyle).toBe("professional-keeper-training-court");
    expect(surface.material.color.getHexString()).toBe("657476");
    expect(surface.material.map).toBeNull();
    expect(surface.material.bumpMap).toBeNull();
    expect(surface.material.roughnessMap).toBeNull();
    expect(stripes).toHaveLength(0);
    expect(turfPatches).toHaveLength(0);
    expect(markings.length).toBeGreaterThanOrEqual(5);
  });

  it("uses a modern finished match ball texture instead of a plain prototype pattern", () => {
    const texture = createFootballTexture();

    expect(texture.userData.assetSystem).toBe("modern-panel-match-ball-texture");
    expect(texture.image.width).toBeGreaterThanOrEqual(512);
    expect(texture.anisotropy).toBeGreaterThanOrEqual(4);
    expect(texture.userData.panelSystem).toBe("radial-accent-seamed-panels");
  });

  it("adds lightweight field depth details around the goalmouth and shooting lane", () => {
    const field = createFieldGroup();

    expect(field.userData.markingSystem).toBe("standard-football-pitch");
    expect(collectByName(field, /^field-standard-touchline-/)).toHaveLength(2);
    expect(collectByName(field, /^field-standard-penalty-area-/)).toHaveLength(3);
    expect(collectByName(field, /^field-standard-goal-area-/)).toHaveLength(3);
    expect(collectByName(field, /^field-standard-center-circle/)).toHaveLength(1);
    expect(collectByName(field, /^field-standard-center-line/)).toHaveLength(1);
    expect(collectByName(field, /^field-penalty-spot$/)).toHaveLength(1);
    expect(collectByName(field, /^field-standard-corner-arc-/).length).toBeGreaterThanOrEqual(2);
  });

  it("adds stadium dressing and lighting props so the scene no longer reads as a bare prototype", () => {
    const field = createFieldGroup();

    expect(field.userData.assetSystem).toBe("stylized-reusable-matchday-kit");
    expect(field.userData.stadiumDressingSystem).toBe("crowd-scoreboard-flags-matchday-dressing");
    expect(collectByName(field, /^stadium-stand-/).length).toBeGreaterThanOrEqual(5);
    expect(collectByName(field, /^stadium-crowd-row-/).length).toBeGreaterThanOrEqual(5);
    expect(collectByName(field, /^stadium-scoreboard-/).length).toBeGreaterThanOrEqual(3);
    expect(collectByName(field, /^stadium-corner-flag-/).length).toBeGreaterThanOrEqual(2);
    expect(collectByName(field, /^stadium-ad-board-/).length).toBeGreaterThanOrEqual(6);
    expect(collectByName(field, /^stadium-floodlight-/).length).toBeGreaterThanOrEqual(4);
    expect(collectByName(field, /^field-goalmouth-wear-/)).toHaveLength(3);
  });

  it("exposes a reusable broadcast matchday polish profile across scene assets", () => {
    const profile = getMatchdayAssetPolishProfile();
    const field = createFieldGroup();
    const goal = createGoalAndNet();
    const glove = createGloveMesh("right");
    const football = createFootballMaterial();

    expect(profile.system).toBe("broadcast-matchday-polish-kit");
    expect(profile.reusableTechnique).toBe("procedural-threejs-matchday-assets");
    expect(profile.assetFamilies).toEqual(expect.arrayContaining([
      "pitch",
      "goal-net",
      "ball",
      "gloves",
      "launcher",
      "lighting",
      "broadcast-dressing",
    ]));

    expect(field.userData.polishSystem).toBe(profile.system);
    expect(goal.group.userData.polishSystem).toBe(profile.system);
    expect(glove.userData.polishSystem).toBe(profile.system);
    expect(football.userData.polishSystem).toBe(profile.system);
  });

  it("adds broadcast edge dressing, safety pads, and volumetric light props without blocking play", () => {
    const field = createFieldGroup();

    expect(field.userData.broadcastDressingSystem).toBe("sideline-camera-light-and-safety-pad-kit");
    expect(collectByName(field, /^broadcast-camera-pod-(left|right)$/)).toHaveLength(2);
    expect(collectByName(field, /^broadcast-sideline-safety-pad-/).length).toBeGreaterThanOrEqual(4);
    expect(collectByName(field, /^stadium-light-cone-/).length).toBeGreaterThanOrEqual(4);
    expect(collectByName(field, /^stadium-depth-vignette-/)).toHaveLength(2);

    const lightCones = collectByName(field, /^stadium-light-cone-/);
    expect(lightCones.every((cone) => cone.material.transparent && cone.material.opacity <= 0.2)).toBe(true);
    expect(lightCones.every((cone) => cone.position.z < 0)).toBe(true);
  });

  it("adds a finished training-ground identity layer without bringing back grass clutter", () => {
    const field = createFieldGroup();

    expect(field.userData.trainingFacilitySystem).toBe("professional-keeper-training-ground-kit");
    expect(collectByName(field, /^training-ground-tunnel-/).length).toBeGreaterThanOrEqual(3);
    expect(collectByName(field, /^training-ground-equipment-cart$/)).toHaveLength(1);
    expect(collectByName(field, /^training-ground-spare-ball-/)).toHaveLength(5);
    expect(collectByName(field, /^training-ground-coach-bench-/).length).toBeGreaterThanOrEqual(3);
    expect(collectByName(field, /^training-ground-hydration-cooler$/)).toHaveLength(1);
    expect(collectByName(field, /^training-ground-tactic-board$/)).toHaveLength(1);
    expect(collectByName(field, /^training-ground-identity-banner-/).length).toBeGreaterThanOrEqual(2);
    expect(collectByName(field, /grass|tuft|blade|turf|mowing/)).toHaveLength(0);
  });

  it("adds a live stadium scoreboard display that mirrors match state without covering play", () => {
    const field = createFieldGroup();
    const display = collectByName(field, /^stadium-scoreboard-display$/)[0];

    expect(field.userData.stadiumScoreboardSystem).toBe("live-stadium-scoreboard-display");
    expect(display).toBeTruthy();
    expect(display.userData.scoreboardSystem).toBe("live-stadium-scoreboard-display");
    expect(display.material.map).toBeTruthy();
    expect(display.material.map.userData.scoreboardSystem).toBe("live-stadium-scoreboard-display");
    expect(display.position.z).toBeGreaterThan(-24.72);

    const livePlan = getStadiumScoreboardPlan({
      running: true,
      paused: false,
      ended: false,
      score: 480,
      saves: 4,
      conceded: 1,
      streak: 2,
      timeLeft: 37.2,
      message: "save",
    }, { difficulty: "medium" });

    expect(livePlan.system).toBe("live-stadium-scoreboard-display");
    expect(livePlan.status).toBe("LIVE");
    expect(livePlan.scoreText).toBe("480");
    expect(livePlan.timeText).toBe("00:38");
    expect(livePlan.detailText).toBe("SAVES 4  LOST 1");
    expect(livePlan.accentColor).toBe("#61f0ff");
    expect(livePlan.signature).toContain("480");

    const pressurePlan = getStadiumScoreboardPlan({
      running: true,
      paused: false,
      ended: false,
      score: 620,
      saves: 5,
      conceded: 4,
      streak: 3,
      timeLeft: 8.1,
      message: "save",
    }, { difficulty: "hard" });

    expect(pressurePlan.status).toBe("HOLD");
    expect(pressurePlan.detailText).toContain("STREAK 3");
    expect(pressurePlan.accentColor).toBe("#ff7846");
    expect(pressurePlan.signature).not.toBe(livePlan.signature);

    expect(getStadiumScoreboardPlan({ running: true, paused: true, timeLeft: 22 }).status).toBe("PAUSED");
    expect(getStadiumScoreboardPlan({ ended: true, score: 1200, timeLeft: 0 }).status).toBe("FULL TIME");
  });

  it("keeps the pitch clean and removes awkward decorative grass props", () => {
    const field = createFieldGroup();

    expect(field.userData.surfaceDetailSystem).toBe("clean-non-grass-training-floor-depth-shadows");
    expect(collectByName(field, /^field-turf$/)).toHaveLength(0);
    expect(collectByName(field, /^field-foreground-blade-/)).toHaveLength(0);
    expect(collectByName(field, /^field-foreground-blade-cluster-/)).toHaveLength(0);
    expect(collectByName(field, /^field-edge-tuft-/)).toHaveLength(0);
    expect(collectByName(field, /^field-edge-tuft-cluster-/)).toHaveLength(0);
    expect(collectByName(field, /^field-instanced-turf-blades-/)).toHaveLength(0);
    expect(collectByName(field, /^field-turf-maintenance-brush-/)).toHaveLength(0);
    expect(collectByName(field, /^field-turf-color-variation-patch-/)).toHaveLength(0);
    expect(collectByName(field, /^field-mowing-stripe-/)).toHaveLength(0);
    expect(collectByName(field, /^field-goalmouth-depth-shadow-/)).toHaveLength(2);
    expect(collectByName(field, /^field-touchline-shadow-/)).toHaveLength(2);
  });

  it("models the goal with depth, side netting, anchors, and branded posts", () => {
    const goal = createGoalAndNet();

    expect(goal.group.userData.assetSystem).toBe("layered-goal-and-net-kit");
    expect(goal.group.userData.netPocketSystem).toBe("localized-net-pocket-deformation");
    expect(goal.net.userData.deformationSystem).toBe("localized-net-pocket-deformation");
    expect(goal.net.geometry.attributes.position.count).toBeGreaterThanOrEqual(120);
    expect(collectByName(goal.group, /^goal-frame-(left-post|right-post|crossbar)$/)).toHaveLength(3);
    expect(collectByName(goal.group, /^goal-depth-stanchion-/)).toHaveLength(2);
    expect(collectByName(goal.group, /^goal-net-side-/)).toHaveLength(2);
    expect(collectByName(goal.group, /^goal-net-anchor-/).length).toBeGreaterThanOrEqual(4);
    expect(goal.net.name).toBe("goal-net-back-panel");
    expect(goal.grid.name).toBe("goal-net-back-grid");
  });

  it("adds round frame caps, base rails, and tension cords to move the goal past boxy prototype geometry", () => {
    const goal = createGoalAndNet();

    expect(goal.group.userData.frameDetailSystem).toBe("rounded-posts-with-tensioned-net");
    expect(collectByName(goal.group, /^goal-frame-post-cap-/).length).toBeGreaterThanOrEqual(4);
    expect(collectByName(goal.group, /^goal-frame-base-rail-/)).toHaveLength(2);
    expect(collectByName(goal.group, /^goal-net-tension-cord-/).length).toBeGreaterThanOrEqual(4);
    expect(collectByName(goal.group, /^goal-net-rope-knot-/).length).toBeGreaterThanOrEqual(4);
  });

  it("adds near-camera asset finishing details for the clean pitch, net hardware, gloves, and match ball material", () => {
    const field = createFieldGroup();
    const goal = createGoalAndNet();
    const glove = createGloveMesh("right");
    const ballTexture = createFootballTexture();

    expect(field.userData.surfaceFinishSystem).toBe("clean-training-floor-scuff-and-line-kit");
    expect(collectByName(field, /^field-edge-tuft-cluster-/)).toHaveLength(0);
    expect(collectByName(field, /^field-floor-scuff-/).length).toBeGreaterThanOrEqual(10);
    expect(collectByName(field, /^field-line-chalk-dust-/).length).toBeGreaterThanOrEqual(6);

    expect(goal.group.userData.netHardwareSystem).toBe("weighted-net-label-and-clip-kit");
    expect(collectByName(goal.group, /^goal-net-bottom-weight-/).length).toBeGreaterThanOrEqual(4);
    expect(collectByName(goal.group, /^goal-net-label-tab-/)).toHaveLength(2);
    expect(collectByName(goal.group, /^goal-frame-net-clip-/).length).toBeGreaterThanOrEqual(6);

    expect(glove.userData.materialSystem).toBe("stitched-padded-match-glove");
    expect(collectByName(glove, /^glove-vent-perforation-/).length).toBeGreaterThanOrEqual(8);
    expect(collectByName(glove, /^glove-wrist-strap-/)).toHaveLength(1);
    expect(collectByName(glove, /^glove-brand-patch-/)).toHaveLength(1);

    expect(ballTexture.userData.materialSystem).toBe("raised-seam-accent-match-ball");
    expect(ballTexture.userData.finishSystem).toBe("micro-scuffed-satin-panels");
  });

  it("uses flat training-floor detail layers instead of grass geometry", () => {
    const field = createFieldGroup();
    const instancedTurf = collectByName(field, /^field-instanced-turf-blades-/);

    expect(field.userData.reusableAssetTechnique).toBe("flat-training-floor-detail-kit");
    expect(instancedTurf).toHaveLength(0);
    expect(collectByName(field, /^field-surface-panel-/).length).toBeGreaterThanOrEqual(6);
    expect(collectByName(field, /^field-turf-color-variation-patch-/)).toHaveLength(0);
    expect(collectByName(field, /^field-mowing-stripe-/)).toHaveLength(0);
  });

  it("uses reusable PBR-style material stacks for the training surface and match ball", () => {
    const field = createFieldGroup();
    const surface = collectByName(field, /^field-training-surface$/)[0];
    const ballMaterial = createFootballMaterial();

    expect(field.userData.materialPipelineSystem).toBe("procedural-pbr-material-stack");
    expect(surface.material.userData.materialPipelineSystem).toBe("clean-matte-training-surface-material");
    expect(surface.material.map).toBeNull();
    expect(surface.material.bumpMap).toBeNull();
    expect(surface.material.roughnessMap).toBeNull();
    expect(surface.material.bumpScale).toBe(0);
    expect(surface.material.roughness).toBeGreaterThanOrEqual(0.88);

    expect(ballMaterial.userData.materialPipelineSystem).toBe("procedural-match-ball-pbr");
    expect(ballMaterial.map.userData.assetSystem).toBe("modern-panel-match-ball-texture");
    expect(ballMaterial.bumpMap).toBeTruthy();
    expect(ballMaterial.roughnessMap).toBeTruthy();
    expect(ballMaterial.bumpScale).toBeGreaterThan(0.01);
    expect(ballMaterial.roughness).toBeGreaterThanOrEqual(0.38);
    expect(ballMaterial.metalness).toBeLessThanOrEqual(0.03);
  });

  it("adds diagonal net weave and rope sleeve details so the goal feels like a real object", () => {
    const goal = createGoalAndNet();

    expect(goal.group.userData.netWeaveSystem).toBe("knotted-diagonal-net-weave");
    expect(collectByName(goal.group, /^goal-net-diagonal-weave-/).length).toBeGreaterThanOrEqual(2);
    expect(collectByName(goal.group, /^goal-net-corner-sleeve-/).length).toBeGreaterThanOrEqual(4);
    expect(collectByName(goal.group, /^goal-net-weave-knot-/).length).toBeGreaterThanOrEqual(8);
  });

  it("adds assembled goal hardware details so the frame feels manufactured rather than procedural", () => {
    const goal = createGoalAndNet();

    expect(goal.group.userData.frameAssemblySystem).toBe("manufactured-goal-frame-hardware");
    expect(goal.group.userData.goalEquipmentPolishSystem).toBe("weighted-pro-goal-equipment-kit");
    expect(collectByName(goal.group, /^goal-frame-corner-collar-/)).toHaveLength(4);
    expect(collectByName(goal.group, /^goal-frame-ground-foot-pad-/)).toHaveLength(4);
    expect(collectByName(goal.group, /^goal-net-tie-strap-/).length).toBeGreaterThanOrEqual(8);
    expect(collectByName(goal.group, /^goal-depth-hinge-bracket-/)).toHaveLength(2);
    expect(collectByName(goal.group, /^goal-frame-fastener-bolt-/).length).toBeGreaterThanOrEqual(8);
    expect(collectByName(goal.group, /^goal-frame-crossbar-sleeve-/)).toHaveLength(3);
    expect(collectByName(goal.group, /^goal-net-rope-tensioner-/)).toHaveLength(4);
    expect(collectByName(goal.group, /^goal-frame-ground-shadow-pad-/)).toHaveLength(2);
  });

  it("registers woven net details as a reusable reactive asset layer", () => {
    const goal = createGoalAndNet();

    expect(goal.group.userData.dynamicNetDetailSystem).toBe("reactive-woven-net-detail-kit");
    expect(goal.dynamicNetDetails.length).toBeGreaterThanOrEqual(10);
    expect(goal.dynamicNetDetails.some((detail) => detail.name.startsWith("goal-net-diagonal-weave-"))).toBe(true);
    expect(goal.dynamicNetDetails.some((detail) => detail.name.startsWith("goal-net-side-"))).toBe(true);
    expect(goal.dynamicNetDetails.some((detail) => detail.name.startsWith("goal-net-tension-cord-"))).toBe(true);
    expect(goal.dynamicNetDetails.some((detail) => detail.name.startsWith("goal-net-weave-knot-"))).toBe(true);
    expect(goal.dynamicNetDetails.every((detail) => detail.object.userData.dynamicNetDetailSystem)).toBe(true);
  });

  it("adds goalmouth contact shadows and net depth haze so the goal has readable space", () => {
    const goal = createGoalAndNet();

    expect(goal.group.userData.depthReadabilitySystem).toBe("goal-net-depth-contact-shadow-kit");
    expect(collectByName(goal.group, /^goal-frame-contact-shadow-/).length).toBeGreaterThanOrEqual(3);
    expect(collectByName(goal.group, /^goal-net-depth-haze-/).length).toBeGreaterThanOrEqual(2);
    expect(collectByName(goal.group, /^goal-net-rear-weight-cord-/).length).toBeGreaterThanOrEqual(1);
  });

  it("adds close-range glove protection ridges and ball surface storytelling details", () => {
    const glove = createGloveMesh("left");
    const ballTexture = createFootballTexture();

    expect(glove.userData.gripSystem).toBe("latex-ridge-and-stitched-fingerback");
    expect(collectByName(glove, /^glove-fingerback-protection-ridge-/).length).toBeGreaterThanOrEqual(4);
    expect(collectByName(glove, /^glove-latex-grip-ridge-/).length).toBeGreaterThanOrEqual(5);
    expect(collectByName(glove, /^glove-stitch-bead-/).length).toBeGreaterThanOrEqual(8);

    expect(ballTexture.userData.surfaceDetailSystem).toBe("micro-scuffs-valve-and-panel-depth");
    expect(ballTexture.userData.valveSystem).toBe("painted-rubber-air-valve");
  });

  it("adds match-use wear traces so the pitch, goal, and launcher feel played on", () => {
    const field = createFieldGroup();
    const goal = createGoalAndNet();
    const launcher = createShooterModel();

    const shotLaneCompression = collectByName(field, /^field-shot-lane-compression-/);
    const keeperStanceScuffs = collectByName(field, /^field-keeper-stance-scuff-/);
    const bootScuffs = collectByName(field, /^field-boot-scuff-/);
    expect(field.userData.matchUseDetailSystem).toBe("match-use-trace-layer");
    expect(shotLaneCompression.length).toBeGreaterThanOrEqual(6);
    expect(keeperStanceScuffs.length).toBeGreaterThanOrEqual(4);
    expect(bootScuffs.length).toBeGreaterThanOrEqual(8);
    expect(shotLaneCompression.every((trace) => trace.material.transparent && trace.material.opacity <= 0.22)).toBe(true);
    expect(bootScuffs.every((trace) => trace.material.depthWrite === false)).toBe(true);

    expect(goal.group.userData.matchUseDetailSystem).toBe("match-use-equipment-wear-layer");
    expect(collectByName(goal.group, /^goal-frame-ball-mark-/).length).toBeGreaterThanOrEqual(5);
    expect(collectByName(goal.group, /^goal-net-bottom-soil-smudge-/).length).toBeGreaterThanOrEqual(4);
    expect(collectByName(goal.group, /^goal-net-peg-shadow-/).length).toBeGreaterThanOrEqual(4);

    expect(launcher.group.userData.matchUseDetailSystem).toBe("launcher-ground-contact-wear-layer");
    expect(collectByName(launcher.group, /^launcher-wheel-tread-shadow-/)).toHaveLength(2);
    expect(collectByName(launcher.group, /^launcher-service-mat$/)).toHaveLength(1);
    expect(collectByName(launcher.group, /^launcher-footprint-scuff-/).length).toBeGreaterThanOrEqual(4);
  });
});
