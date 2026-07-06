import { describe, expect, it } from "vitest";
import * as THREE from "three";
import { createFieldGroup, createGloveMesh, createShooterModel } from "../src/three/procedural-assets.js";

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
});
