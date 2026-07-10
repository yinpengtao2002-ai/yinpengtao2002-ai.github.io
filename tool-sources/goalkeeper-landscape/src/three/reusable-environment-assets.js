import * as THREE from "three";
import { HDRLoader } from "three/addons/loaders/HDRLoader.js";

export const REUSABLE_ENVIRONMENT_ASSET_SYSTEM = "poly-haven-cc0-matchday-pbr";

export const REUSABLE_ENVIRONMENT_ASSET_MANIFEST = Object.freeze({
  hdri: Object.freeze({
    localUrl: "/tools/goalkeeper-landscape/assets/environment/autumn-field-puresky-1k.hdr",
    sourceUrl: "https://polyhaven.com/a/autumn_field_puresky",
    license: "CC0-1.0",
  }),
  courtNormal: Object.freeze({
    localUrl: "/tools/goalkeeper-landscape/assets/environment/clean-asphalt-normal-gl-1k.jpg",
    sourceUrl: "https://polyhaven.com/a/clean_asphalt",
    license: "CC0-1.0",
  }),
  courtRoughness: Object.freeze({
    localUrl: "/tools/goalkeeper-landscape/assets/environment/clean-asphalt-roughness-1k.jpg",
    sourceUrl: "https://polyhaven.com/a/clean_asphalt",
    license: "CC0-1.0",
  }),
});

export function getReusableEnvironmentAssetPlan(options = {}) {
  var maxAnisotropy = Number.isFinite(options.maxAnisotropy) ? options.maxAnisotropy : 8;
  return {
    system: REUSABLE_ENVIRONMENT_ASSET_SYSTEM,
    environment: {
      mapping: "equirectangular-reflection-pmrem",
      backgroundReplacement: false,
      intensity: 0.08,
    },
    court: {
      repeat: { x: 4.25, y: 12.5 },
      normalScale: 0.035,
      roughness: 1,
      anisotropy: Math.max(1, Math.min(8, maxAnisotropy || 1)),
    },
  };
}

export function configureReusableEnvironmentTexture(texture, role, plan = getReusableEnvironmentAssetPlan()) {
  if (!texture) return texture;

  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(plan.court.repeat.x, plan.court.repeat.y);
  texture.anisotropy = plan.court.anisotropy;
  texture.colorSpace = THREE.NoColorSpace;
  texture.magFilter = THREE.LinearFilter;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.needsUpdate = true;
  texture.userData.reusableEnvironmentAssetSystem = REUSABLE_ENVIRONMENT_ASSET_SYSTEM;
  texture.userData.surfaceRole = role;
  return texture;
}

export function applyReusableCourtMaterial(fieldGroup, textures = {}, plan = getReusableEnvironmentAssetPlan()) {
  var surface = fieldGroup?.getObjectByName?.("field-training-surface") || null;
  var material = surface?.material || null;
  if (!surface || !material || !textures.normalMap || !textures.roughnessMap) {
    return { applied: false, surface };
  }

  configureReusableEnvironmentTexture(textures.normalMap, "court-normal", plan);
  configureReusableEnvironmentTexture(textures.roughnessMap, "court-roughness", plan);

  if (material.bumpMap && material.bumpMap !== textures.normalMap) material.bumpMap.dispose?.();
  if (material.roughnessMap && material.roughnessMap !== textures.roughnessMap) material.roughnessMap.dispose?.();
  material.bumpMap = null;
  material.normalMap = textures.normalMap;
  material.normalScale = new THREE.Vector2(plan.court.normalScale, plan.court.normalScale);
  material.roughnessMap = textures.roughnessMap;
  material.roughness = plan.court.roughness;
  material.needsUpdate = true;
  material.userData.reusableEnvironmentAssetSystem = REUSABLE_ENVIRONMENT_ASSET_SYSTEM;
  material.userData.surfaceDetailSystem = "poly-haven-clean-asphalt-normal-roughness";
  fieldGroup.userData.reusableEnvironmentAssetSystem = REUSABLE_ENVIRONMENT_ASSET_SYSTEM;
  fieldGroup.userData.reusableEnvironmentAssetStatus = "ready";
  return { applied: true, surface };
}

export function createReusableEnvironmentAssetPipeline(options = {}) {
  var renderer = options.renderer;
  var scene = options.scene;
  var fieldGroup = options.fieldGroup;
  var maxAnisotropy = renderer?.capabilities?.getMaxAnisotropy?.() || 1;
  var plan = getReusableEnvironmentAssetPlan({ maxAnisotropy });
  var hdrLoader = options.hdrLoader || new HDRLoader();
  var textureLoader = options.textureLoader || new THREE.TextureLoader();
  var pmremGenerator = options.pmremGenerator || new THREE.PMREMGenerator(renderer);
  var disposed = false;
  var failed = false;
  var environmentTarget = null;
  var environmentMap = null;
  var hdrTexture = null;
  var normalMap = null;
  var roughnessMap = null;
  var disposedResources = new Set();
  var pmremDisposed = false;

  function disposeResource(resource) {
    if (!resource || disposedResources.has(resource)) return;
    disposedResources.add(resource);
    resource.dispose?.();
  }

  function disposePmremGenerator() {
    if (pmremDisposed) return;
    pmremDisposed = true;
    pmremGenerator.dispose?.();
  }

  function disposeLoadedResources() {
    disposeResource(environmentTarget);
    disposeResource(hdrTexture);
    disposeResource(normalMap);
    disposeResource(roughnessMap);
  }

  function rememberLoadedTexture(promise, assign) {
    return promise.then((texture) => {
      assign(texture);
      if (disposed || failed) disposeResource(texture);
      return texture;
    });
  }

  if (scene?.userData) {
    scene.userData.reusableEnvironmentAssetSystem = REUSABLE_ENVIRONMENT_ASSET_SYSTEM;
    scene.userData.reusableEnvironmentAssetStatus = "loading";
  }
  pmremGenerator.compileEquirectangularShader?.();

  var ready = Promise.all([
    rememberLoadedTexture(
      hdrLoader.loadAsync(REUSABLE_ENVIRONMENT_ASSET_MANIFEST.hdri.localUrl),
      (texture) => { hdrTexture = texture; },
    ),
    rememberLoadedTexture(
      textureLoader.loadAsync(REUSABLE_ENVIRONMENT_ASSET_MANIFEST.courtNormal.localUrl),
      (texture) => { normalMap = texture; },
    ),
    rememberLoadedTexture(
      textureLoader.loadAsync(REUSABLE_ENVIRONMENT_ASSET_MANIFEST.courtRoughness.localUrl),
      (texture) => { roughnessMap = texture; },
    ),
  ]).then(() => {
    if (disposed) {
      disposeLoadedResources();
      disposePmremGenerator();
      return { status: "disposed", plan };
    }

    hdrTexture.mapping = THREE.EquirectangularReflectionMapping;
    environmentTarget = pmremGenerator.fromEquirectangular(hdrTexture);
    environmentMap = environmentTarget.texture;
    disposeResource(hdrTexture);
    disposePmremGenerator();

    scene.environment = environmentMap;
    scene.environmentIntensity = plan.environment.intensity;
    applyReusableCourtMaterial(fieldGroup, { normalMap, roughnessMap }, plan);
    scene.userData.reusableEnvironmentAssetStatus = "ready";
    scene.userData.reusableEnvironmentAssetLicense = "CC0-1.0";
    return { status: "ready", plan };
  }).catch((error) => {
    failed = true;
    disposeLoadedResources();
    disposePmremGenerator();
    if (scene?.userData) {
      scene.userData.reusableEnvironmentAssetStatus = "fallback";
      scene.userData.reusableEnvironmentAssetError = String(error?.message || error || "asset-load-failed");
    }
    return { status: "fallback", plan, error };
  });

  return {
    system: REUSABLE_ENVIRONMENT_ASSET_SYSTEM,
    plan,
    ready,
    dispose() {
      disposed = true;
      if (scene?.environment === environmentMap) scene.environment = null;
      disposeLoadedResources();
      disposePmremGenerator();
    },
  };
}
