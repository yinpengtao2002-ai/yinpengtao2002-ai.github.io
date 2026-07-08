import { describe, expect, it } from "vitest";
import * as THREE from "three";
import {
  createFieldGroup,
  createFootballMaterial,
  createFootballTexture,
  createGloveMesh,
  createGoalAndNet,
  createShooterModel,
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
    expect(collectByName(launcher.group, /^launcher-wheel-/)).toHaveLength(2);
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

  it("uses a textured bright standard football pitch with readable white markings", () => {
    const field = createFieldGroup();
    const turf = collectByName(field, /^field-turf$/)[0];
    const stripes = collectByName(field, /^field-mowing-stripe-/);
    const markings = collectByName(field, /^field-standard-/);

    expect(field.userData.visualStyle).toBe("standard-football-match-pitch");
    expect(turf.material.color.getHexString()).toBe("69bd53");
    expect(turf.material.map).toBeTruthy();
    expect(turf.material.map.image.width).toBeGreaterThanOrEqual(128);
    expect(turf.material.map.magFilter).toBe(THREE.LinearFilter);
    expect(stripes.length).toBeGreaterThanOrEqual(8);
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

  it("adds foreground turf blade clusters and pitch depth shadows for a finished match surface", () => {
    const field = createFieldGroup();

    expect(field.userData.surfaceDetailSystem).toBe("layered-turf-with-foreground-blades");
    expect(collectByName(field, /^field-foreground-blade-cluster-/).length).toBeGreaterThanOrEqual(36);
    expect(collectByName(field, /^field-turf-maintenance-brush-/).length).toBeGreaterThanOrEqual(8);
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

  it("adds near-camera asset finishing details for turf, net hardware, gloves, and match ball material", () => {
    const field = createFieldGroup();
    const goal = createGoalAndNet();
    const glove = createGloveMesh("right");
    const ballTexture = createFootballTexture();

    expect(field.userData.surfaceFinishSystem).toBe("multi-layer-turf-edge-divot-kit");
    expect(collectByName(field, /^field-edge-tuft-cluster-/).length).toBeGreaterThanOrEqual(14);
    expect(collectByName(field, /^field-divot-scar-/).length).toBeGreaterThanOrEqual(10);
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

  it("uses an instanced turf finishing layer so the pitch reads as authored grass without excessive draw calls", () => {
    const field = createFieldGroup();
    const instancedTurf = collectByName(field, /^field-instanced-turf-blades-/);

    expect(field.userData.reusableAssetTechnique).toBe("instanced-turf-and-layered-material-kit");
    expect(instancedTurf.length).toBeGreaterThanOrEqual(2);
    expect(instancedTurf.every((mesh) => mesh.isInstancedMesh)).toBe(true);
    expect(instancedTurf.reduce((total, mesh) => total + mesh.count, 0)).toBeGreaterThanOrEqual(220);
    expect(collectByName(field, /^field-turf-color-variation-patch-/).length).toBeGreaterThanOrEqual(6);
  });

  it("uses reusable PBR-style material stacks for the turf and match ball", () => {
    const field = createFieldGroup();
    const turf = collectByName(field, /^field-turf$/)[0];
    const ballMaterial = createFootballMaterial();

    expect(field.userData.materialPipelineSystem).toBe("procedural-pbr-material-stack");
    expect(turf.material.userData.materialPipelineSystem).toBe("procedural-layered-turf-pbr");
    expect(turf.material.map).toBeTruthy();
    expect(turf.material.bumpMap).toBeTruthy();
    expect(turf.material.roughnessMap).toBeTruthy();
    expect(turf.material.bumpScale).toBeGreaterThan(0.015);
    expect(turf.material.roughness).toBeGreaterThanOrEqual(0.88);

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
    expect(collectByName(goal.group, /^goal-frame-corner-collar-/)).toHaveLength(4);
    expect(collectByName(goal.group, /^goal-frame-ground-foot-pad-/)).toHaveLength(4);
    expect(collectByName(goal.group, /^goal-net-tie-strap-/).length).toBeGreaterThanOrEqual(8);
    expect(collectByName(goal.group, /^goal-depth-hinge-bracket-/)).toHaveLength(2);
    expect(collectByName(goal.group, /^goal-frame-fastener-bolt-/).length).toBeGreaterThanOrEqual(8);
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
});
