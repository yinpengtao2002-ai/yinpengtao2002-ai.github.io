import * as THREE from "three";
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
import {
  GOAL_CAGE_POINTS,
  GOAL_FRAME_SEGMENTS,
  GOAL_NET_GRID,
  GOAL_NET_GEOMETRY,
  getGoalRoofHeightAtZ,
} from "../src/physics/goal-net-geometry.js";
import { createShot3DDirector } from "../src/game/shot-3d-director.js";

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

  it("keeps the distant launcher readable through the goal net", () => {
    const launcher = createShooterModel();
    const body = collectByName(launcher.group, /^launcher-body$/)[0];
    const readabilityFrame = collectByName(launcher.group, /^launcher-readability-frame-/);

    expect(launcher.group.userData.launcherReadabilitySystem).toBe("distance-clarity-silhouette-kit");
    expect(launcher.group.scale.x).toBeGreaterThanOrEqual(1.62);
    expect(readabilityFrame.length).toBeGreaterThanOrEqual(3);
    expect(readabilityFrame.every((part) => part.userData.launcherReadabilitySystem === "distance-clarity-silhouette-kit")).toBe(true);
    expect(body.material.color.getHexString()).toBe("365c66");
    expect(body.material.bumpMap.image.width).toBeGreaterThanOrEqual(256);
    expect(body.material.bumpMap.anisotropy).toBeGreaterThanOrEqual(4);
  });

  it("launches the physical ball from the animated muzzle instead of below the machine", () => {
    const launcher = createShooterModel();
    const shot = createShot3DDirector({ seed: 14, elapsed: 8 }).currentShot;

    updateShooterModel(launcher, {
      phase: "live",
      phaseTime: 0,
      currentShot: shot,
    });
    launcher.group.updateMatrixWorld(true);

    const muzzlePosition = launcher.muzzle.getWorldPosition(new THREE.Vector3());
    const plannedOrigin = new THREE.Vector3(shot.origin.x, shot.origin.y, shot.origin.z);

    expect(muzzlePosition.distanceTo(plannedOrigin)).toBeLessThanOrEqual(0.015);
    expect(plannedOrigin.y).toBeGreaterThan(launcher.body.getWorldPosition(new THREE.Vector3()).y);
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

  it("adds a hydraulic recoil aiming cradle so the launcher reads as real equipment", () => {
    const launcher = createShooterModel();

    expect(launcher.group.userData.launcherMechanismSystem).toBe("hydraulic-recoil-aiming-cradle");
    expect(collectByName(launcher.group, /^launcher-turret-yaw-bearing$/)).toHaveLength(1);
    expect(collectByName(launcher.group, /^launcher-recoil-sled$/)).toHaveLength(1);
    expect(collectByName(launcher.group, /^launcher-recoil-rail-/)).toHaveLength(2);
    expect(collectByName(launcher.group, /^launcher-hydraulic-piston-/)).toHaveLength(2);
    expect(collectByName(launcher.group, /^launcher-recoil-buffer-/)).toHaveLength(2);
    expect(collectByName(launcher.group, /^launcher-heat-sleeve-/).length).toBeGreaterThanOrEqual(3);

    expect(launcher.recoilSled).toBeTruthy();
    expect(launcher.hydraulicPistons).toHaveLength(2);
    expect(launcher.recoilRails).toHaveLength(2);
    expect(launcher.recoilBuffers).toHaveLength(2);
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

  it("animates launcher recoil mechanics at the shot release instead of leaving the machine rigid", () => {
    const launcher = createShooterModel();
    const restZ = launcher.recoilSled.position.z;
    const restRailOpacity = launcher.recoilRails[0].material.opacity;

    updateShooterModel(launcher, {
      phase: "cue",
      phaseTime: 0.72,
      currentShot: { cueDuration: 1, cue: { side: -1 } },
    });

    expect(launcher.recoilSled.position.z).toBeGreaterThanOrEqual(restZ - 0.025);

    updateShooterModel(launcher, {
      phase: "live",
      phaseTime: 0.06,
      currentShot: { cueDuration: 1, cue: { side: -1 } },
    });

    expect(launcher.recoilSled.position.z).toBeLessThan(restZ - 0.04);
    expect(launcher.recoilRails[0].material.opacity).toBeGreaterThan(restRailOpacity);
    expect(launcher.hydraulicPistons[0].scale.y).not.toBe(launcher.hydraulicPistons[1].scale.y);
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

  it("adds restrained launcher exhaust and floor shock feedback at shot release", () => {
    const launcher = createShooterModel();

    expect(launcher.group.userData.launcherReleaseFeedbackSystem).toBe("recoil-exhaust-floor-shock-kit");
    expect(collectByName(launcher.group, /^launcher-exhaust-puff-/)).toHaveLength(2);
    expect(collectByName(launcher.group, /^launcher-floor-shock-ring$/)).toHaveLength(1);
    expect(collectByName(launcher.group, /^launcher-release-dust-fleck-/)).toHaveLength(6);
    expect(launcher.exhaustPuffs).toHaveLength(2);
    expect(launcher.releaseDustFlecks).toHaveLength(6);
    expect(launcher.floorShockRing.material.transparent).toBe(true);
    expect(launcher.floorShockRing.material.opacity).toBe(0);

    updateShooterModel(launcher, {
      phase: "live",
      phaseTime: 0.06,
      currentShot: { cueDuration: 1, cue: { side: 1 } },
    });

    expect(launcher.floorShockRing.visible).toBe(true);
    expect(launcher.floorShockRing.material.opacity).toBeGreaterThan(0.08);
    expect(launcher.floorShockRing.material.opacity).toBeLessThanOrEqual(0.24);
    expect(launcher.floorShockRing.scale.x).toBeGreaterThan(1.1);
    expect(launcher.exhaustPuffs.every((puff) => puff.visible)).toBe(true);
    expect(launcher.exhaustPuffs.every((puff) => puff.material.opacity > 0.08 && puff.material.opacity <= 0.32)).toBe(true);
    expect(launcher.releaseDustFlecks.some((fleck) => fleck.material.opacity > 0.06)).toBe(true);

    updateShooterModel(launcher, {
      phase: "live",
      phaseTime: 0.48,
      currentShot: { cueDuration: 1, cue: { side: 1 } },
    });

    expect(launcher.floorShockRing.visible).toBe(false);
    expect(launcher.floorShockRing.material.opacity).toBe(0);
    expect(launcher.exhaustPuffs.every((puff) => !puff.visible && puff.material.opacity === 0)).toBe(true);
  });

  it("adds an indexed rotary ball-feed servo so the launcher reads as real training equipment", () => {
    const launcher = createShooterModel();

    expect(launcher.group.userData.launcherFeedSystem).toBe("indexed-rotary-ball-feed-servo");
    expect(collectByName(launcher.group, /^launcher-feed-carousel$/)).toHaveLength(1);
    expect(collectByName(launcher.group, /^launcher-feed-carousel-spoke-/)).toHaveLength(4);
    expect(collectByName(launcher.group, /^launcher-feed-servo-arm$/)).toHaveLength(1);
    expect(collectByName(launcher.group, /^launcher-feed-guide-chute$/)).toHaveLength(1);
    expect(collectByName(launcher.group, /^launcher-feed-index-marker-/)).toHaveLength(3);
    expect(launcher.feedCarousel).toBeTruthy();
    expect(launcher.feedServoArm).toBeTruthy();
    expect(launcher.feedGuideChute.material.transparent).toBe(true);
    expect(launcher.feedIndexMarkers).toHaveLength(3);

    const restRotation = launcher.feedCarousel.rotation.z;
    const restArmRotation = launcher.feedServoArm.rotation.z;

    updateShooterModel(launcher, {
      phase: "cue",
      phaseTime: 0.72,
      currentShot: { cueDuration: 1, cue: { side: -1 } },
    });

    expect(launcher.feedCarousel.rotation.z).not.toBe(restRotation);
    expect(launcher.feedServoArm.rotation.z).not.toBe(restArmRotation);
    expect(launcher.feedGuideChute.material.opacity).toBeGreaterThan(0.2);
    expect(launcher.feedIndexMarkers.some((marker) => marker.material.opacity > 0.42)).toBe(true);

    updateShooterModel(launcher, {
      phase: "live",
      phaseTime: 0.06,
      currentShot: { cueDuration: 1, cue: { side: -1 } },
    });

    expect(Math.abs(launcher.feedServoArm.rotation.z)).toBeGreaterThan(Math.abs(restArmRotation));
    expect(launcher.feedGuideChute.material.opacity).toBeLessThanOrEqual(0.5);
  });

  it("uses reusable PBR paint, rubber, and official decal geometry so the launcher no longer reads as flat primitives", () => {
    const launcher = createShooterModel();
    const decals = collectByName(launcher.group, /^launcher-decal-/);
    const body = collectByName(launcher.group, /^launcher-body$/)[0];
    const barrel = collectByName(launcher.group, /^launcher-barrel$/)[0];
    const hopper = collectByName(launcher.group, /^launcher-hopper$/)[0];
    const wheels = collectByName(launcher.group, /^launcher-wheel-(left|right)$/);

    expect(launcher.group.userData.launcherMaterialSystem).toBe("pbr-painted-metal-rubber-launcher-materials");
    expect(launcher.group.userData.launcherDecalSystem).toBe("three-decalgeometry-launcher-label-wear-kit");
    expect(body.material.userData.launcherMaterialSystem).toBe("pbr-painted-metal-rubber-launcher-materials");
    expect(body.material.bumpMap?.userData.assetSystem).toBe("procedural-painted-metal-launcher-texture");
    expect(body.material.roughnessMap?.userData.assetSystem).toBe("procedural-painted-metal-launcher-texture");
    expect(body.material.bumpScale).toBeGreaterThan(0.004);
    expect(body.material.bumpScale).toBeLessThanOrEqual(0.016);
    expect(hopper.material.bumpMap?.userData.assetSystem).toBe("procedural-painted-metal-launcher-texture");
    expect(barrel.material.bumpMap?.userData.assetSystem).toBe("procedural-gunmetal-launcher-texture");
    expect(wheels.every((wheel) => wheel.material.roughnessMap?.userData.assetSystem === "procedural-rubber-tire-launcher-texture")).toBe(true);
    expect(decals.length).toBeGreaterThanOrEqual(8);
    expect(decals.every((decal) => decal.geometry.type === "DecalGeometry")).toBe(true);
    expect(decals.every((decal) => decal.userData.geometrySource === "three/addons/geometries/DecalGeometry")).toBe(true);
    expect(decals.every((decal) => decal.material.transparent && decal.material.depthWrite === false)).toBe(true);
    expect(decals.every((decal) => decal.userData.launcherDecalSystem === "three-decalgeometry-launcher-label-wear-kit")).toBe(true);
    expect(decals.some((decal) => decal.name.includes("serial"))).toBe(true);
    expect(decals.some((decal) => decal.name.includes("caution"))).toBe(true);
    expect(decals.some((decal) => decal.name.includes("paint-wear"))).toBe(true);
    expect(launcher.decals).toHaveLength(decals.length);
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

  it("uses reusable PBR latex and textile material detail on gloves instead of flat prototype color", () => {
    const glove = createGloveMesh("right");
    const palm = collectByName(glove, /^glove-palm-shell$/)[0];
    const pad = collectByName(glove, /^glove-palm-pad$/)[0];
    const cuff = collectByName(glove, /^glove-cuff$/)[0];
    const strap = collectByName(glove, /^glove-wrist-strap-main$/)[0];
    const scuffs = collectByName(glove, /^glove-latex-wear-scuff-/);
    const textileRibs = collectByName(glove, /^glove-textile-knit-rib-/);
    const latexEdges = collectByName(glove, /^glove-latex-edge-rolled-seam-/);

    expect(glove.userData.pbrMaterialSystem).toBe("pbr-latex-textile-match-glove-materials");
    expect(glove.userData.wearDetailSystem).toBe("subtle-match-use-glove-wear");
    expect(palm.material.userData.gloveMaterialSystem).toBe("pbr-latex-textile-match-glove-materials");
    expect(palm.material.bumpMap?.userData.assetSystem).toBe("procedural-latex-micrograin-glove-texture");
    expect(palm.material.roughnessMap?.userData.assetSystem).toBe("procedural-latex-micrograin-glove-texture");
    expect(palm.material.bumpScale).toBeGreaterThan(0.004);
    expect(palm.material.bumpScale).toBeLessThanOrEqual(0.014);
    expect(pad.material.bumpMap?.userData.assetSystem).toBe("procedural-latex-micrograin-glove-texture");
    expect(cuff.material.bumpMap?.userData.assetSystem).toBe("procedural-woven-cuff-glove-texture");
    expect(strap.material.roughnessMap?.userData.assetSystem).toBe("procedural-woven-cuff-glove-texture");
    expect(scuffs.length).toBeGreaterThanOrEqual(5);
    expect(scuffs.every((scuff) => scuff.material.transparent && scuff.material.opacity <= 0.18)).toBe(true);
    expect(textileRibs.length).toBeGreaterThanOrEqual(6);
    expect(latexEdges.length).toBeGreaterThanOrEqual(4);
    expect([...textileRibs, ...latexEdges].every((detail) => detail.userData.pbrMaterialSystem === "pbr-latex-textile-match-glove-materials")).toBe(true);
  });

  it("uses a premium non-grass academy surface with reusable PBR detail", () => {
    const field = createFieldGroup();
    const surface = collectByName(field, /^field-training-surface$/)[0];
    const stripes = collectByName(field, /^field-mowing-stripe-/);
    const turfPatches = collectByName(field, /^field-turf-color-variation-patch-/);
    const markings = collectByName(field, /^field-standard-/);

    expect(field.userData.visualStyle).toBe("professional-goalkeeper-academy-court");
    expect(field.userData.markingSystem).toBe("clear-academy-court-no-pitch-stripes");
    expect(field.userData.surfaceFinishSystem).toBe("micro-speckled-polymer-court-no-grass");
    expect(surface.material.color.getHexString()).toBe("466a6d");
    expect(surface.material.color.b).toBeGreaterThan(surface.material.color.g);
    expect(surface.material.map?.userData.assetSystem).toBe("micro-speckled-academy-polymer-surface");
    expect(surface.material.bumpMap?.userData.assetSystem).toBe("micro-speckled-academy-polymer-surface");
    expect(surface.material.roughnessMap?.userData.assetSystem).toBe("micro-speckled-academy-polymer-surface");
    expect(surface.material.bumpScale).toBeGreaterThan(0.004);
    expect(surface.material.bumpScale).toBeLessThanOrEqual(0.014);
    expect(surface.material.roughness).toBeGreaterThanOrEqual(0.82);
    expect(stripes).toHaveLength(0);
    expect(turfPatches).toHaveLength(0);
    expect(markings).toHaveLength(0);
    expect(collectByName(field, /^field-penalty-spot$/)).toHaveLength(0);
  });

  it("keeps the academy floor blue-green and polymer-like so it cannot read as grass", () => {
    const field = createFieldGroup();
    const surface = collectByName(field, /^field-training-surface$/)[0];

    expect(surface.material.userData.surfacePaletteSystem).toBe("blue-green-academy-court-no-grass");
    expect(surface.material.color.getHexString()).toBe("466a6d");
    expect(surface.material.color.b).toBeGreaterThan(surface.material.color.g);
    expect(surface.material.userData.grassReadabilityGuard).toBe("synthetic-polymer-floor-no-turf-blades");
  });

  it("uses a recognizable neutral-white football texture instead of a yellow stylized shell", () => {
    const texture = createFootballTexture();

    expect(texture.userData.assetSystem).toBe("classic-neutral-match-ball-texture");
    expect(texture.image.width).toBeGreaterThanOrEqual(512);
    expect(texture.anisotropy).toBeGreaterThanOrEqual(4);
    expect(texture.userData.panelSystem).toBe("classic-dark-pentagon-panel-layout");
    expect(texture.userData.paletteSystem).toBe("neutral-white-charcoal-no-yellow-cast");
  });

  it("keeps the floor clear of football pitch markings while preserving goalmouth depth", () => {
    const field = createFieldGroup();

    expect(field.userData.markingSystem).toBe("clear-academy-court-no-pitch-stripes");
    expect(collectByName(field, /^field-standard-/)).toHaveLength(0);
    expect(collectByName(field, /^field-standard-touchline-/)).toHaveLength(0);
    expect(collectByName(field, /^field-standard-penalty-area-/)).toHaveLength(0);
    expect(collectByName(field, /^field-standard-goal-area-/)).toHaveLength(0);
    expect(collectByName(field, /^field-standard-center-circle/)).toHaveLength(0);
    expect(collectByName(field, /^field-standard-center-line/)).toHaveLength(0);
    expect(collectByName(field, /^field-penalty-spot$/)).toHaveLength(0);
    expect(collectByName(field, /^field-standard-corner-arc-/)).toHaveLength(0);
    expect(collectByName(field, /^field-goalmouth-depth-shadow-/)).toHaveLength(2);
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
    expect(collectByName(field, /^field-goalmouth-wear-/)).toHaveLength(0);
  });

  it("finishes the floodlights with lens cells and restrained glare halos", () => {
    const field = createFieldGroup();
    const heads = collectByName(field, /^stadium-floodlight-head-/);
    const lensCells = collectByName(field, /^stadium-floodlight-lens-cell-/);
    const glareCores = collectByName(field, /^stadium-floodlight-glare-core-/);
    const glareRings = collectByName(field, /^stadium-floodlight-glare-ring-/);

    expect(field.userData.stadiumLightingFinishSystem).toBe("floodlight-lens-and-glare-halo-kit");
    expect(heads).toHaveLength(4);
    expect(lensCells).toHaveLength(16);
    expect(glareCores).toHaveLength(4);
    expect(glareRings).toHaveLength(4);
    expect(lensCells.every((cell) => cell.material.transparent && cell.material.opacity <= 0.92)).toBe(true);
    expect(glareCores.every((glare) => glare.material.transparent && glare.material.opacity <= 0.34)).toBe(true);
    expect(glareRings.every((ring) => ring.material.transparent && ring.material.opacity <= 0.2)).toBe(true);
    expect(glareCores.every((glare) => glare.userData.lightingFinishSystem === "floodlight-lens-and-glare-halo-kit")).toBe(true);
    expect(glareRings.every((ring) => ring.renderOrder >= 2)).toBe(true);
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
      "training-floor",
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
    const depthVignettes = collectByName(field, /^stadium-depth-vignette-/);
    expect(lightCones.every((cone) => cone.material.transparent && cone.material.opacity <= 0.006)).toBe(true);
    expect(depthVignettes.every((vignette) => vignette.material.transparent && vignette.material.opacity <= 0.02)).toBe(true);
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

  it("keeps the floor clean and removes awkward decorative grass props", () => {
    const field = createFieldGroup();

    expect(field.userData.surfaceDetailSystem).toBe("micro-speckled-polymer-floor-goalmouth-shadows");
    expect(field.userData.surfaceFinishSystem).toBe("micro-speckled-polymer-court-no-grass");
    expect(collectByName(field, /^field-turf$/)).toHaveLength(0);
    expect(collectByName(field, /^field-foreground-blade-/)).toHaveLength(0);
    expect(collectByName(field, /^field-foreground-blade-cluster-/)).toHaveLength(0);
    expect(collectByName(field, /^field-edge-tuft-/)).toHaveLength(0);
    expect(collectByName(field, /^field-edge-tuft-cluster-/)).toHaveLength(0);
    expect(collectByName(field, /^field-instanced-turf-blades-/)).toHaveLength(0);
    expect(collectByName(field, /^field-turf-maintenance-brush-/)).toHaveLength(0);
    expect(collectByName(field, /^field-turf-color-variation-patch-/)).toHaveLength(0);
    expect(collectByName(field, /^field-mowing-stripe-/)).toHaveLength(0);
    expect(collectByName(field, /^field-goalmouth-wear-/)).toHaveLength(0);
    expect(collectByName(field, /^field-floor-scuff-/)).toHaveLength(0);
    expect(collectByName(field, /^field-shot-lane-compression-/)).toHaveLength(0);
    expect(collectByName(field, /^field-keeper-stance-scuff-/)).toHaveLength(0);
    expect(collectByName(field, /^field-boot-scuff-/)).toHaveLength(0);
    expect(collectByName(field, /^field-line-chalk-dust-/)).toHaveLength(0);
    expect(collectByName(field, /^field-surface-panel-/)).toHaveLength(0);
    expect(collectByName(field, /^field-surface-panel-seam-/)).toHaveLength(0);
    expect(collectByName(field, /^field-depth-band-/)).toHaveLength(0);
    expect(collectByName(field, /^field-goalmouth-depth-shadow-/)).toHaveLength(2);
    expect(collectByName(field, /^field-touchline-shadow-/)).toHaveLength(0);
  });

  it("models a white freestanding training goal without separate poles or cables", () => {
    const goal = createGoalAndNet();

    expect(goal.group.userData.assetSystem).toBe("professional-freestanding-training-goal-kit");
    expect(goal.group.userData.goalConstructionSystem).toBe("integrated-white-tube-return-frame");
    expect(goal.group.userData.netPocketSystem).toBe("localized-net-pocket-deformation");
    expect(goal.net.userData.deformationSystem).toBe("localized-net-pocket-deformation");
    expect(goal.net.geometry.attributes.position.count).toBeGreaterThanOrEqual(120);
    expect(collectByName(goal.group, /^goal-frame-(left-post|right-post|crossbar)$/)).toHaveLength(3);
    expect(collectByName(goal.group, /^goal-frame-return-/)).toHaveLength(7);
    expect(collectByName(goal.group, /^goal-net-support-post-/)).toHaveLength(0);
    expect(collectByName(goal.group, /^goal-net-support-cable-/)).toHaveLength(0);
    expect(collectByName(goal.group, /^goal-net-ground-rope-/)).toHaveLength(0);
    expect(collectByName(goal.group, /^goal-brand-trim-/)).toHaveLength(0);
    expect(collectByName(goal.group, /^goal-frame-crossbar-sleeve-/)).toHaveLength(0);
    expect(collectByName(goal.group, /^goal-depth-stanchion-/)).toHaveLength(0);
    expect(collectByName(goal.group, /^goal-net-continuous-pocket-shell$/)).toHaveLength(1);
    expect(collectByName(goal.group, /^goal-net-anchor-/)).toHaveLength(0);
    expect(goal.net.name).toBe("goal-net-back-panel");
    expect(goal.grid.name).toBe("goal-net-back-grid");

    const renderedSegments = [];
    goal.group.traverse((node) => {
      if (node.name.startsWith("goal-frame-") && node.userData.goalFrameSegment) renderedSegments.push(node);
    });
    expect(GOAL_FRAME_SEGMENTS.map((segment) => segment.name).sort()).toEqual([
      "crossbar",
      "front-left-post",
      "front-right-post",
    ]);
    expect(renderedSegments).toHaveLength(3);
    renderedSegments.forEach((object) => {
      const segment = GOAL_FRAME_SEGMENTS.find((item) => item.name === object.userData.goalFrameSegment);
      expect(segment).toBeTruthy();
      expect(object.userData.segmentStart).toEqual(segment.start);
      expect(object.userData.segmentEnd).toEqual(segment.end);
    });
  });

  it("keeps rounded front-frame caps and adds slim integrated return rails", () => {
    const goal = createGoalAndNet();

    expect(goal.group.userData.frameDetailSystem).toBe("rounded-posts-with-tensioned-net");
    expect(collectByName(goal.group, /^goal-frame-post-cap-/).length).toBeGreaterThanOrEqual(4);
    const returnRails = collectByName(goal.group, /^goal-frame-return-/);
    expect(returnRails).toHaveLength(7);
    expect(returnRails.every((rail) => rail.userData.visualOnly === true)).toBe(true);
    expect(returnRails.every((rail) => rail.userData.goalFrameSegment === undefined)).toBe(true);
    expect(returnRails.every((rail) => rail.material.color.getHexString() === "e8eeeb")).toBe(true);
    expect(collectByName(goal.group, /^goal-net-cage-seam-/)).toHaveLength(0);
    expect(collectByName(goal.group, /^goal-net-tension-cord-/)).toHaveLength(0);
  });

  it("keeps near-camera goal hardware restrained while preserving glove and ball finish", () => {
    const field = createFieldGroup();
    const goal = createGoalAndNet();
    const glove = createGloveMesh("right");
    const ballTexture = createFootballTexture();

    expect(field.userData.surfaceFinishSystem).toBe("micro-speckled-polymer-court-no-grass");
    expect(collectByName(field, /^field-edge-tuft-cluster-/)).toHaveLength(0);
    expect(collectByName(field, /^field-floor-scuff-/)).toHaveLength(0);
    expect(collectByName(field, /^field-line-chalk-dust-/)).toHaveLength(0);
    expect(collectByName(field, /^field-surface-panel-/)).toHaveLength(0);
    expect(collectByName(field, /^field-depth-band-/)).toHaveLength(0);

    expect(goal.group.userData.netHardwareSystem).toBe("integrated-frame-bound-net");
    expect(collectByName(goal.group, /^goal-net-bottom-weight-/)).toHaveLength(0);
    expect(collectByName(goal.group, /^goal-net-label-tab-/)).toHaveLength(0);
    expect(collectByName(goal.group, /^goal-frame-net-clip-/)).toHaveLength(0);
    expect(collectByName(goal.group, /^goal-net-ground-rope-/)).toHaveLength(0);

    expect(glove.userData.materialSystem).toBe("stitched-padded-match-glove");
    expect(collectByName(glove, /^glove-vent-perforation-/).length).toBeGreaterThanOrEqual(8);
    expect(collectByName(glove, /^glove-wrist-strap-/)).toHaveLength(1);
    expect(collectByName(glove, /^glove-brand-patch-/)).toHaveLength(1);

    expect(ballTexture.userData.materialSystem).toBe("stitched-classic-match-ball");
    expect(ballTexture.userData.finishSystem).toBe("micro-scuffed-satin-panels");
  });

  it("uses a reusable polymer training floor instead of grass-like surface striping", () => {
    const field = createFieldGroup();
    const instancedTurf = collectByName(field, /^field-instanced-turf-blades-/);

    expect(field.userData.reusableAssetTechnique).toBe("procedural-pbr-academy-court-kit");
    expect(instancedTurf).toHaveLength(0);
    expect(collectByName(field, /^field-standard-/)).toHaveLength(0);
    expect(collectByName(field, /^field-surface-panel-/)).toHaveLength(0);
    expect(collectByName(field, /^field-surface-panel-seam-/)).toHaveLength(0);
    expect(collectByName(field, /^field-depth-band-/)).toHaveLength(0);
    expect(collectByName(field, /^field-turf-color-variation-patch-/)).toHaveLength(0);
    expect(collectByName(field, /^field-mowing-stripe-/)).toHaveLength(0);
  });

  it("uses reusable PBR-style material stacks for the training surface and match ball", () => {
    const field = createFieldGroup();
    const surface = collectByName(field, /^field-training-surface$/)[0];
    const ballMaterial = createFootballMaterial();

    expect(field.userData.materialPipelineSystem).toBe("procedural-pbr-material-stack");
    expect(surface.material.userData.materialPipelineSystem).toBe("academy-polymer-training-surface-pbr");
    expect(surface.material.userData.surfacePaletteSystem).toBe("blue-green-academy-court-no-grass");
    expect(surface.material.color.getHexString()).toBe("466a6d");
    expect(surface.material.color.b).toBeGreaterThan(surface.material.color.g);
    expect(surface.material.map?.userData.assetSystem).toBe("micro-speckled-academy-polymer-surface");
    expect(surface.material.bumpMap?.userData.assetSystem).toBe("micro-speckled-academy-polymer-surface");
    expect(surface.material.roughnessMap?.userData.assetSystem).toBe("micro-speckled-academy-polymer-surface");
    expect(surface.material.bumpScale).toBeGreaterThan(0);
    expect(surface.material.roughness).toBeGreaterThanOrEqual(0.86);

    expect(ballMaterial.userData.materialPipelineSystem).toBe("procedural-match-ball-pbr");
    expect(ballMaterial.map.userData.assetSystem).toBe("classic-neutral-match-ball-texture");
    expect(ballMaterial.bumpMap).toBeTruthy();
    expect(ballMaterial.roughnessMap).toBeTruthy();
    expect(ballMaterial.bumpScale).toBeGreaterThan(0.01);
    expect(ballMaterial.roughness).toBeGreaterThanOrEqual(0.38);
    expect(ballMaterial.metalness).toBeLessThanOrEqual(0.03);
    expect(ballMaterial.color.getHexString()).toBe("ffffff");
    expect(ballMaterial.userData.paletteSystem).toBe("neutral-white-charcoal-no-yellow-cast");
  });

  it("uses one continuous low-occlusion 120mm square match net", () => {
    const goal = createGoalAndNet();
    const pocketShells = collectByName(goal.group, /^goal-net-continuous-pocket-shell$/);

    expect(goal.group.userData.netContinuitySystem).toBe("continuous-ball-priority-pocket-shell");
    expect(pocketShells).toHaveLength(1);

    const shell = pocketShells[0];
    const positions = shell.geometry.getAttribute("position");
    const depths = Array.from({ length: positions.count }, (_, index) => positions.getZ(index));
    const depthRange = Math.max(...depths) - Math.min(...depths);

    expect(shell.geometry.type).toBe("PlaneGeometry");
    expect(positions.count).toBeGreaterThanOrEqual(200);
    expect(depthRange).toBeGreaterThanOrEqual(0.08);
    expect(depthRange).toBeLessThanOrEqual(0.16);
    expect(shell.material.type).toBe("ShaderMaterial");
    expect(shell.material.transparent).toBe(true);
    expect(shell.material.depthWrite).toBe(false);
    expect(shell.material.forceSinglePass).toBe(true);
    expect(shell.material.userData.centerVisibilityFloor).toBeGreaterThanOrEqual(0.04);
    expect(shell.material.userData.centerVisibilityFloor).toBeLessThanOrEqual(0.08);
    expect(shell.material.userData.visibilityProfile).toBe("soft-center-fade-no-cutout");
    expect(shell.material.uniforms.netOpacity.value).toBeLessThanOrEqual(0.13);
    expect(shell.material.opacity).toBeLessThanOrEqual(0.13);
    expect(shell.material.userData.meshPattern).toBe("professional-square-120mm-knotted-net");
    expect(shell.material.uniforms.netMap.value.userData.alphaMeshPattern).toBe("professional-square-120mm-knotted-net");
    expect(shell.material.uniforms.netMap.value.userData.cellsAcross).toBe(GOAL_NET_GRID.widthDivisions);
    expect(shell.material.uniforms.netMap.value.userData.cellsHigh).toBe(GOAL_NET_GRID.rearHeightDivisions);
    expect(shell.userData.crossesKeeperSightline).toBe(true);
    expect(shell.userData.hasShotWindowCutout).toBe(false);
    expect(shell.userData.ballPriorityRenderOrder).toBeGreaterThan(shell.renderOrder);
    expect(goal.dynamicNetDetails.some((detail) => detail.name === shell.name)).toBe(true);
  });

  it("gives the freestanding training net a modest rearward roof slope", () => {
    const rearRoofHeight = getGoalRoofHeightAtZ(GOAL_CAGE_POINTS.rearTopLeft.z);

    expect(GOAL_NET_GRID.targetCellSize).toBeCloseTo(0.12, 3);
    expect(rearRoofHeight).toBeGreaterThanOrEqual(2.2);
    expect(rearRoofHeight).toBeLessThanOrEqual(GOAL_NET_GEOMETRY.height);
    expect(GOAL_NET_GEOMETRY.height - rearRoofHeight).toBeLessThanOrEqual(0.24);
  });

  it("keeps all four visible net panels inside the shared cage envelope", () => {
    const goal = createGoalAndNet();
    const panels = [];
    goal.group.updateMatrixWorld(true);
    goal.group.traverse((node) => {
      if (node.userData.goalNetPanel) panels.push(node);
    });

    expect(goal.group.userData.netFrameAttachmentSystem).toBe("frame-bound-continuous-net-seam");
    expect(panels.map((panel) => panel.userData.goalNetPanel).sort()).toEqual(["left", "rear", "right", "top"]);
    panels.forEach((panel) => {
      expect(panel.userData.anchoredPanel).toBe(true);
      const positions = panel.geometry.getAttribute("position");
      for (let index = 0; index < positions.count; index += 1) {
        const point = new THREE.Vector3().fromBufferAttribute(positions, index).applyMatrix4(panel.matrixWorld);
        expect(point.x).toBeGreaterThanOrEqual(-GOAL_NET_GEOMETRY.halfWidth - 0.0001);
        expect(point.x).toBeLessThanOrEqual(GOAL_NET_GEOMETRY.halfWidth + 0.0001);
        expect(point.y).toBeGreaterThanOrEqual(-0.0001);
        expect(point.z).toBeGreaterThanOrEqual(GOAL_NET_GEOMETRY.netPlaneZ - 0.0001);
        expect(point.z).toBeLessThanOrEqual(GOAL_CAGE_POINTS.rearBottomLeft.z + 0.0001);
        expect(point.y).toBeLessThanOrEqual(getGoalRoofHeightAtZ(point.z) + 0.0001);
      }
    });
  });

  it("uses the shared grid scale for the rear, side, and roof panels", () => {
    const goal = createGoalAndNet();
    const left = goal.group.getObjectByName("goal-net-panel-left");
    const right = goal.group.getObjectByName("goal-net-panel-right");
    const top = goal.group.getObjectByName("goal-net-panel-top");
    const rear = goal.group.getObjectByName("goal-net-continuous-pocket-shell");

    expect(left.type).toBe("Mesh");
    expect(right.type).toBe("Mesh");
    expect(top.type).toBe("Mesh");
    expect(left.material.map.userData.alphaMeshPattern).toBe("professional-square-120mm-knotted-net");
    expect(right.material.map).toBe(left.material.map);
    expect(top.material.map).toBe(left.material.map);
    expect(left.userData.netGridDivisions).toEqual({
      depth: GOAL_NET_GRID.depthDivisions,
      height: GOAL_NET_GRID.frontHeightDivisions,
    });
    expect(right.userData.netGridDivisions).toEqual(left.userData.netGridDivisions);
    expect(top.userData.netGridDivisions).toEqual({
      depth: GOAL_NET_GRID.depthDivisions,
      width: GOAL_NET_GRID.widthDivisions,
    });
    expect(rear.material.uniforms.netMap.value.userData.cellsAcross).toBe(GOAL_NET_GRID.widthDivisions);
    expect(rear.material.uniforms.netMap.value.userData.cellsHigh).toBe(GOAL_NET_GRID.rearHeightDivisions);
    expect(left.material.opacity).toBeLessThanOrEqual(0.18);
    expect(right.material.opacity).toBeLessThanOrEqual(0.18);
    expect(top.material.opacity).toBeLessThanOrEqual(0.16);
    expect(top.geometry.getAttribute("position").count).toBeGreaterThan(100);

    const topPositions = top.geometry.getAttribute("position");
    const centerIndex = Array.from({ length: topPositions.count }, (_, index) => index)
      .reduce((best, index) => {
        const distance = Math.abs(topPositions.getX(index)) +
          Math.abs(topPositions.getZ(index) - (GOAL_NET_GEOMETRY.netPlaneZ + GOAL_NET_GEOMETRY.cageDepth * 0.5));
        return distance < best.distance ? { index, distance } : best;
      }, { index: 0, distance: Infinity }).index;
    expect(topPositions.getY(centerIndex)).toBeLessThan(
      getGoalRoofHeightAtZ(topPositions.getZ(centerIndex)) - 0.04,
    );
  });

  it("removes decorative side-net fibers that protrude beyond the posts", () => {
    const goal = createGoalAndNet();

    expect(collectByName(goal.group, /^goal-net-side-cheek-lace-/)).toHaveLength(0);
    expect(collectByName(goal.group, /^goal-net-side-return-cord-/)).toHaveLength(0);
    expect(collectByName(goal.group, /^goal-net-side-depth-cord-/)).toHaveLength(0);
  });

  it("keeps the finished goal net within a mobile-safe draw and animation budget", () => {
    const goal = createGoalAndNet();
    let objectCount = 0;
    let transparentObjectCount = 0;

    goal.group.traverse((node) => {
      objectCount += 1;
      const materials = node.material ? (Array.isArray(node.material) ? node.material : [node.material]) : [];
      if (materials.some((material) => material.transparent)) transparentObjectCount += 1;
    });

    expect(goal.group.userData.netPerformanceSystem).toBe("single-shell-mobile-net-budget");
    expect(goal.group.userData.retiredNetLayerCount).toBe(0);
    expect(objectCount).toBeLessThanOrEqual(36);
    expect(transparentObjectCount).toBeLessThanOrEqual(16);
    expect(goal.dynamicNetDetails).toHaveLength(4);
  });

  it("keeps the freestanding training goal clean and free of decorative hardware", () => {
    const goal = createGoalAndNet();

    expect(goal.group.userData.frameAssemblySystem).toBe("slim-white-portable-goal-frame");
    expect(goal.group.userData.goalEquipmentPolishSystem).toBe("clean-training-ground-goal-equipment");
    expect(collectByName(goal.group, /^goal-frame-corner-collar-/)).toHaveLength(0);
    expect(collectByName(goal.group, /^goal-frame-ground-foot-pad-/)).toHaveLength(0);
    expect(collectByName(goal.group, /^goal-net-tie-strap-/)).toHaveLength(0);
    expect(collectByName(goal.group, /^goal-depth-hinge-bracket-/)).toHaveLength(0);
    expect(collectByName(goal.group, /^goal-frame-fastener-bolt-/)).toHaveLength(0);
    expect(collectByName(goal.group, /^goal-frame-crossbar-sleeve-/)).toHaveLength(0);
    expect(collectByName(goal.group, /^goal-net-rope-tensioner-/)).toHaveLength(0);
    expect(collectByName(goal.group, /^goal-frame-ground-shadow-pad-/)).toHaveLength(0);
  });

  it("registers woven net details as a reusable reactive asset layer", () => {
    const goal = createGoalAndNet();

    expect(goal.group.userData.dynamicNetDetailSystem).toBe("reactive-woven-net-detail-kit");
    expect(goal.dynamicNetDetails).toHaveLength(4);
    expect(goal.dynamicNetDetails.some((detail) => detail.name === "goal-net-continuous-pocket-shell")).toBe(true);
    expect(goal.dynamicNetDetails.some((detail) => detail.name.startsWith("goal-net-side-cheek-lace-"))).toBe(false);
    expect(goal.dynamicNetDetails.some((detail) => detail.name === "goal-net-panel-left")).toBe(true);
    expect(goal.dynamicNetDetails.some((detail) => detail.name === "goal-net-panel-top")).toBe(true);
    expect(
      goal.dynamicNetDetails
        .filter((detail) => detail.object.userData.goalNetPanel)
        .every((detail) => detail.anchoredPanel),
    ).toBe(true);
    expect(goal.dynamicNetDetails.some((detail) => detail.name.startsWith("goal-net-matchday-edge-lace-"))).toBe(false);
    expect(goal.dynamicNetDetails.every((detail) => detail.object.userData.dynamicNetDetailSystem)).toBe(true);
  });

  it("adds goalmouth contact shadows and a shaped pocket so the goal has readable space", () => {
    const goal = createGoalAndNet();

    expect(goal.group.userData.depthReadabilitySystem).toBe("goal-net-depth-contact-shadow-kit");
    expect(collectByName(goal.group, /^goal-frame-contact-shadow-/).length).toBeGreaterThanOrEqual(3);
    expect(collectByName(goal.group, /^goal-net-continuous-pocket-shell$/)).toHaveLength(1);
    expect(collectByName(goal.group, /^goal-frame-return-rear-base-rail$/)).toHaveLength(1);
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

  it("keeps match-use wear off the field while preserving goal and launcher wear", () => {
    const field = createFieldGroup();
    const goal = createGoalAndNet();
    const launcher = createShooterModel();

    const shotLaneCompression = collectByName(field, /^field-shot-lane-compression-/);
    const keeperStanceScuffs = collectByName(field, /^field-keeper-stance-scuff-/);
    const bootScuffs = collectByName(field, /^field-boot-scuff-/);
    expect(field.userData.matchUseDetailSystem).toBe("plain-field-no-grass-clutter");
    expect(shotLaneCompression).toHaveLength(0);
    expect(keeperStanceScuffs).toHaveLength(0);
    expect(bootScuffs).toHaveLength(0);

    expect(goal.group.userData.matchUseDetailSystem).toBe("clean-match-goal-no-decorative-wear");
    expect(collectByName(goal.group, /^goal-frame-ball-mark-/)).toHaveLength(0);
    expect(collectByName(goal.group, /^goal-net-bottom-soil-smudge-/)).toHaveLength(0);
    expect(collectByName(goal.group, /^goal-net-peg-shadow-/)).toHaveLength(0);

    expect(launcher.group.userData.matchUseDetailSystem).toBe("launcher-ground-contact-wear-layer");
    expect(collectByName(launcher.group, /^launcher-wheel-tread-shadow-/)).toHaveLength(2);
    expect(collectByName(launcher.group, /^launcher-service-mat$/)).toHaveLength(1);
    expect(collectByName(launcher.group, /^launcher-footprint-scuff-/).length).toBeGreaterThanOrEqual(4);
  });

  it("uses reusable rounded-box geometry on near-field props instead of hard prototype cubes", () => {
    const field = createFieldGroup();
    const goal = createGoalAndNet();
    const launcher = createShooterModel();

    expect(field.userData.geometryPolishSystem).toBe("three-rounded-box-beveled-prop-kit");
    expect(goal.group.userData.geometryPolishSystem).toBe("three-rounded-box-beveled-prop-kit");
    expect(launcher.group.userData.geometryPolishSystem).toBe("three-rounded-box-beveled-prop-kit");

    const roundedFieldProps = [
      ...collectByName(field, /^stadium-ad-board-/),
      ...collectByName(field, /^broadcast-sideline-safety-pad-/),
      ...collectByName(field, /^training-ground-equipment-cart-base$/),
      ...collectByName(field, /^training-ground-coach-bench-(seat|back)$/),
      ...collectByName(field, /^training-ground-hydration-cooler(-lid)?$/),
    ];
    const roundedGoalProps = [
      ...collectByName(goal.group, /^goal-brand-trim-/),
      ...collectByName(goal.group, /^goal-frame-crossbar-sleeve-/),
      ...collectByName(goal.group, /^goal-frame-ground-foot-pad-/),
      ...collectByName(goal.group, /^goal-net-rope-tensioner-/),
      ...collectByName(goal.group, /^goal-depth-hinge-bracket-/),
    ];
    const roundedLauncherProps = [
      ...collectByName(launcher.group, /^launcher-body$/),
      ...collectByName(launcher.group, /^launcher-hopper$/),
      ...collectByName(launcher.group, /^launcher-control-console$/),
      ...collectByName(launcher.group, /^launcher-service-mat$/),
      ...collectByName(launcher.group, /^launcher-kick-pad$/),
    ];

    const allRoundedProps = [...roundedFieldProps, ...roundedGoalProps, ...roundedLauncherProps];
    expect(roundedGoalProps).toHaveLength(0);
    expect(allRoundedProps.length).toBeGreaterThanOrEqual(20);
    expect(allRoundedProps.every((prop) => prop.geometry?.type === "RoundedBoxGeometry")).toBe(true);
    expect(allRoundedProps.every((prop) => prop.userData.geometrySource === "three/addons/geometries/RoundedBoxGeometry")).toBe(true);
    expect(allRoundedProps.every((prop) => prop.userData.beveledAssetSystem === "three-rounded-box-beveled-prop-kit")).toBe(true);
  });
});
