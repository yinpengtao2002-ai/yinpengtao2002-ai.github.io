import { describe, expect, it } from "vitest";
import { readFile } from "node:fs/promises";
import * as THREE from "three";
import { createFieldGroup } from "../src/three/procedural-assets.js";
import {
  REUSABLE_ENVIRONMENT_ASSET_MANIFEST,
  REUSABLE_ENVIRONMENT_ASSET_SYSTEM,
  applyReusableCourtMaterial,
  configureReusableEnvironmentTexture,
  createReusableEnvironmentAssetPipeline,
  getReusableEnvironmentAssetPlan,
} from "../src/three/reusable-environment-assets.js";

describe("reusable matchday environment assets", () => {
  it("uses the current Three HDR loader instead of the deprecated RGBE alias", async () => {
    const source = await readFile(new URL("../src/three/reusable-environment-assets.js", import.meta.url), "utf8");

    expect(source).toMatch(/three\/addons\/loaders\/HDRLoader\.js/);
    expect(source).not.toMatch(/RGBELoader/);
  });

  it("keeps every third-party runtime asset local and records its CC0 source", () => {
    expect(REUSABLE_ENVIRONMENT_ASSET_SYSTEM).toBe("poly-haven-cc0-matchday-pbr");

    Object.values(REUSABLE_ENVIRONMENT_ASSET_MANIFEST).forEach((asset) => {
      expect(asset.localUrl).toMatch(/^\/tools\/goalkeeper-landscape\/assets\/environment\//);
      expect(asset.sourceUrl).toMatch(/^https:\/\/polyhaven\.com\/a\//);
      expect(asset.license).toBe("CC0-1.0");
    });
  });

  it("plans a restrained HDR reflection layer and real court surface detail", () => {
    const plan = getReusableEnvironmentAssetPlan({ maxAnisotropy: 16 });

    expect(plan.system).toBe(REUSABLE_ENVIRONMENT_ASSET_SYSTEM);
    expect(plan.environment.mapping).toBe("equirectangular-reflection-pmrem");
    expect(plan.environment.backgroundReplacement).toBe(false);
    expect(plan.environment.intensity).toBeGreaterThanOrEqual(0.08);
    expect(plan.environment.intensity).toBeLessThanOrEqual(0.1);
    expect(plan.court.repeat.x).toBeGreaterThanOrEqual(3);
    expect(plan.court.repeat.y).toBeGreaterThan(plan.court.repeat.x);
    expect(plan.court.normalScale).toBeGreaterThan(0);
    expect(plan.court.normalScale).toBeLessThanOrEqual(0.05);
    expect(plan.court.roughness).toBeGreaterThanOrEqual(0.96);
    expect(plan.court.anisotropy).toBeLessThanOrEqual(8);
  });

  it("configures local PBR maps for stable repeat and color handling", () => {
    const plan = getReusableEnvironmentAssetPlan({ maxAnisotropy: 4 });
    const normalMap = new THREE.Texture();
    const roughnessMap = new THREE.Texture();

    configureReusableEnvironmentTexture(normalMap, "normal", plan);
    configureReusableEnvironmentTexture(roughnessMap, "roughness", plan);

    [normalMap, roughnessMap].forEach((texture) => {
      expect(texture.wrapS).toBe(THREE.RepeatWrapping);
      expect(texture.wrapT).toBe(THREE.RepeatWrapping);
      expect(texture.repeat.x).toBe(plan.court.repeat.x);
      expect(texture.repeat.y).toBe(plan.court.repeat.y);
      expect(texture.anisotropy).toBe(4);
    });
    expect(normalMap.colorSpace).toBe(THREE.NoColorSpace);
    expect(roughnessMap.colorSpace).toBe(THREE.NoColorSpace);
  });

  it("upgrades the visual court material without replacing its geometry", () => {
    const field = createFieldGroup();
    const surface = field.getObjectByName("field-training-surface");
    const geometry = surface.geometry;
    const normalMap = new THREE.Texture();
    const roughnessMap = new THREE.Texture();
    const plan = getReusableEnvironmentAssetPlan({ maxAnisotropy: 8 });

    const result = applyReusableCourtMaterial(field, { normalMap, roughnessMap }, plan);

    expect(result.applied).toBe(true);
    expect(result.surface).toBe(surface);
    expect(surface.geometry).toBe(geometry);
    expect(surface.material.normalMap).toBe(normalMap);
    expect(surface.material.roughnessMap).toBe(roughnessMap);
    expect(surface.material.bumpMap).toBeNull();
    expect(surface.material.normalScale.x).toBeCloseTo(plan.court.normalScale);
    expect(surface.material.normalScale.y).toBeCloseTo(plan.court.normalScale);
    expect(surface.material.userData.reusableEnvironmentAssetSystem).toBe(REUSABLE_ENVIRONMENT_ASSET_SYSTEM);
  });

  it("loads the local assets asynchronously and keeps the authored sky background", async () => {
    const scene = new THREE.Scene();
    const authoredSky = new THREE.Group();
    scene.background = null;
    scene.add(authoredSky);
    const field = createFieldGroup();
    const hdrTexture = new THREE.Texture();
    const environmentMap = new THREE.Texture();
    const normalMap = new THREE.Texture();
    const roughnessMap = new THREE.Texture();
    const loadedUrls = [];
    const pmremGenerator = {
      compileEquirectangularShader() {},
      fromEquirectangular(texture) {
        expect(texture).toBe(hdrTexture);
        return { texture: environmentMap };
      },
      dispose() {},
    };
    const pipeline = createReusableEnvironmentAssetPipeline({
      renderer: { capabilities: { getMaxAnisotropy: () => 16 } },
      scene,
      fieldGroup: field,
      hdrLoader: {
        async loadAsync(url) {
          loadedUrls.push(url);
          return hdrTexture;
        },
      },
      textureLoader: {
        async loadAsync(url) {
          loadedUrls.push(url);
          return url.includes("normal") ? normalMap : roughnessMap;
        },
      },
      pmremGenerator,
    });

    const result = await pipeline.ready;
    const surface = field.getObjectByName("field-training-surface");

    expect(result.status).toBe("ready");
    expect(scene.environment).toBe(environmentMap);
    expect(scene.background).toBeNull();
    expect(scene.children).toContain(authoredSky);
    expect(scene.userData.reusableEnvironmentAssetStatus).toBe("ready");
    expect(surface.material.normalMap).toBe(normalMap);
    expect(surface.material.roughnessMap).toBe(roughnessMap);
    expect(loadedUrls).toEqual([
      REUSABLE_ENVIRONMENT_ASSET_MANIFEST.hdri.localUrl,
      REUSABLE_ENVIRONMENT_ASSET_MANIFEST.courtNormal.localUrl,
      REUSABLE_ENVIRONMENT_ASSET_MANIFEST.courtRoughness.localUrl,
    ]);
  });

  it("disposes every fulfilled texture when a sibling asset load fails", async () => {
    const scene = new THREE.Scene();
    const field = createFieldGroup();
    const hdrTexture = new THREE.Texture();
    const normalMap = new THREE.Texture();
    var hdrDisposeCount = 0;
    var normalDisposeCount = 0;
    hdrTexture.dispose = () => { hdrDisposeCount += 1; };
    normalMap.dispose = () => { normalDisposeCount += 1; };
    const pipeline = createReusableEnvironmentAssetPipeline({
      renderer: { capabilities: { getMaxAnisotropy: () => 4 } },
      scene,
      fieldGroup: field,
      hdrLoader: { async loadAsync() { return hdrTexture; } },
      textureLoader: {
        async loadAsync(url) {
          if (url.includes("roughness")) throw new Error("roughness-load-failed");
          return normalMap;
        },
      },
      pmremGenerator: {
        compileEquirectangularShader() {},
        fromEquirectangular() { throw new Error("pmrem-should-not-run"); },
        dispose() {},
      },
    });

    const result = await pipeline.ready;

    expect(result.status).toBe("fallback");
    expect(scene.userData.reusableEnvironmentAssetStatus).toBe("fallback");
    expect(hdrDisposeCount).toBe(1);
    expect(normalDisposeCount).toBe(1);
  });

  it("disposes HDR and court textures when PMREM conversion fails", async () => {
    const scene = new THREE.Scene();
    const field = createFieldGroup();
    const hdrTexture = new THREE.Texture();
    const normalMap = new THREE.Texture();
    const roughnessMap = new THREE.Texture();
    const disposeCounts = { hdr: 0, normal: 0, roughness: 0 };
    hdrTexture.dispose = () => { disposeCounts.hdr += 1; };
    normalMap.dispose = () => { disposeCounts.normal += 1; };
    roughnessMap.dispose = () => { disposeCounts.roughness += 1; };
    const pipeline = createReusableEnvironmentAssetPipeline({
      renderer: { capabilities: { getMaxAnisotropy: () => 4 } },
      scene,
      fieldGroup: field,
      hdrLoader: { async loadAsync() { return hdrTexture; } },
      textureLoader: {
        async loadAsync(url) {
          return url.includes("normal") ? normalMap : roughnessMap;
        },
      },
      pmremGenerator: {
        compileEquirectangularShader() {},
        fromEquirectangular() { throw new Error("pmrem-conversion-failed"); },
        dispose() {},
      },
    });

    const result = await pipeline.ready;

    expect(result.status).toBe("fallback");
    expect(disposeCounts).toEqual({ hdr: 1, normal: 1, roughness: 1 });
  });
});
