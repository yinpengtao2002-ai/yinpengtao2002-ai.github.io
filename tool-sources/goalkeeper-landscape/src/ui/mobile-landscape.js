function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

export function shouldForceMobileLandscape() {
  return false;
}

export function syncMobileLandscape(stage, windowRef) {
  var width = windowRef?.innerWidth || 0;
  var height = windowRef?.innerHeight || 0;
  var portrait = Boolean(width && height && width < height);
  if (stage?.dataset) {
    stage.dataset.mobileLandscape = portrait ? "prompt" : "native";
  }
  return false;
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

export async function requestLandscapeOrientation(windowRef) {
  var orientation = windowRef?.screen?.orientation;
  if (!orientation?.lock) return false;

  try {
    await orientation.lock("landscape");
    return true;
  } catch (error) {
    return false;
  }
}
