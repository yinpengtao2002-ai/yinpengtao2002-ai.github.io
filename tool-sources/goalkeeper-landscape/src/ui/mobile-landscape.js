function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

export function shouldForceMobileLandscape(windowRef) {
  var width = windowRef?.innerWidth || 0;
  var height = windowRef?.innerHeight || 0;
  var coarsePointer = Boolean(windowRef?.matchMedia?.("(pointer: coarse)")?.matches);
  var touchPoints = Number(windowRef?.navigator?.maxTouchPoints || 0);
  return Boolean(width && height && width < height && (coarsePointer || touchPoints > 0));
}

export function syncMobileLandscape(stage, windowRef) {
  var shouldForce = shouldForceMobileLandscape(windowRef);
  if (stage?.dataset) {
    stage.dataset.mobileLandscape = shouldForce
      ? stage.dataset.mobileLandscape === "manual" ? "manual" : "auto"
      : "native";
  }
  return shouldForce;
}

export function getStageRenderBounds(stage, fallback = { width: 1280, height: 720 }) {
  var rect = stage?.getBoundingClientRect?.() || {};
  return {
    width: stage?.clientWidth || rect.width || fallback.width,
    height: stage?.clientHeight || rect.height || fallback.height,
  };
}

export function mapClientPointToStage(event, element) {
  var rect = element.getBoundingClientRect();
  var rawX = event.clientX - rect.left;
  var rawY = event.clientY - rect.top;

  if (element.dataset?.mobileLandscape === "forced") {
    var width = element.clientWidth || rect.height;
    var height = element.clientHeight || rect.width;
    return {
      x: clamp(rawY, 0, width),
      y: clamp(height - rawX, 0, height),
    };
  }

  return {
    x: rawX,
    y: rawY,
  };
}

export async function requestLandscapeOrientation(windowRef, stage) {
  if (!shouldForceMobileLandscape(windowRef)) {
    if (stage?.dataset) stage.dataset.mobileLandscape = "native";
    return false;
  }

  var orientation = windowRef?.screen?.orientation;
  if (!orientation?.lock) {
    if (stage?.dataset) stage.dataset.mobileLandscape = "manual";
    return false;
  }

  var documentRef = windowRef?.document;
  var fullscreenTarget = stage || documentRef?.documentElement;
  var requestFullscreen = fullscreenTarget?.requestFullscreen || fullscreenTarget?.webkitRequestFullscreen;
  var hasFullscreen = Boolean(documentRef?.fullscreenElement || documentRef?.webkitFullscreenElement);

  if (!hasFullscreen && requestFullscreen) {
    try {
      await requestFullscreen.call(fullscreenTarget);
    } catch (error) {
      // Some browsers permit orientation lock without fullscreen.
    }
  }

  try {
    await orientation.lock("landscape");
    if (stage?.dataset) stage.dataset.mobileLandscape = "native";
    return true;
  } catch (error) {
    if (stage?.dataset) stage.dataset.mobileLandscape = "manual";
    return false;
  }
}
