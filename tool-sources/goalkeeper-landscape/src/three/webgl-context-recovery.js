const CONTEXT_RECOVERY_RELOAD_KEY = "goalkeeper-webgl-recovery-reload-at";

export function createContextRecoveryReloadFallback(options = {}) {
  var windowRef = options.windowRef || window;
  var stage = options.stage;
  var now = options.now || Date.now;
  var cooldownMs = Number.isFinite(options.cooldownMs) ? options.cooldownMs : 15_000;
  var storageKey = options.storageKey || CONTEXT_RECOVERY_RELOAD_KEY;

  return function reloadAfterContextRecoveryTimeout() {
    var timestamp = now();
    var lastReloadAt = 0;

    try {
      lastReloadAt = Number(windowRef.sessionStorage?.getItem?.(storageKey)) || 0;
    } catch {
      lastReloadAt = 0;
    }

    if (lastReloadAt > 0 && timestamp - lastReloadAt < cooldownMs) {
      windowRef.goalkeeperBootStatus = "context-recovery-failed";
      if (stage?.dataset) stage.dataset.bootStatus = "context-recovery-failed";
      return false;
    }

    try {
      windowRef.sessionStorage?.setItem?.(storageKey, String(timestamp));
    } catch {
      // Reload recovery still works in browsers that block session storage.
    }

    windowRef.goalkeeperBootStatus = "context-reloading";
    if (stage?.dataset) stage.dataset.bootStatus = "context-reloading";
    windowRef.location?.reload?.();
    return true;
  };
}

export function createWebGLContextRecovery(options = {}) {
  var canvas = options.canvas;
  var context = options.context;
  var stage = options.stage;
  var windowRef = options.windowRef || window;
  var restoreDelayMs = Number.isFinite(options.restoreDelayMs) ? options.restoreDelayMs : 180;
  var fallbackDelayMs = Number.isFinite(options.fallbackDelayMs) ? options.fallbackDelayMs : 2_500;
  var setTimer = windowRef.setTimeout?.bind(windowRef) || setTimeout;
  var clearTimer = windowRef.clearTimeout?.bind(windowRef) || clearTimeout;
  var restoreTimer = null;
  var fallbackTimer = null;
  var callbackTimer = null;
  var contextRecoveryExtension = null;
  var previousBootStatus = "started";
  var recovering = false;
  var disposed = false;

  try {
    contextRecoveryExtension = context?.getExtension?.("WEBGL_lose_context") || null;
  } catch {
    contextRecoveryExtension = null;
  }

  function setBootStatus(status) {
    windowRef.goalkeeperBootStatus = status;
    if (stage?.dataset) stage.dataset.bootStatus = status;
    options.onStatusChange?.(status);
  }

  function clearRecoveryTimers() {
    if (restoreTimer !== null) clearTimer(restoreTimer);
    if (fallbackTimer !== null) clearTimer(fallbackTimer);
    restoreTimer = null;
    fallbackTimer = null;
  }

  function handleContextLost(event) {
    event?.preventDefault?.();
    if (disposed || recovering) return;

    recovering = true;
    previousBootStatus = windowRef.goalkeeperBootStatus || stage?.dataset?.bootStatus || "started";
    setBootStatus("context-lost");

    restoreTimer = setTimer(function requestContextRestore() {
      restoreTimer = null;
      if (disposed || !recovering) return;
      setBootStatus("context-restoring");
      try {
        contextRecoveryExtension?.restoreContext?.();
      } catch {
        // The timed fallback handles browsers that reject an explicit restore request.
      }
    }, restoreDelayMs);

    fallbackTimer = setTimer(function handleRecoveryTimeout() {
      fallbackTimer = null;
      if (disposed || !recovering) return;
      setBootStatus("context-recovery-failed");
      options.onRecoveryTimeout?.();
    }, fallbackDelayMs);
  }

  function handleContextRestored() {
    if (disposed || !recovering) return;
    recovering = false;
    clearRecoveryTimers();
    setBootStatus(previousBootStatus || "started");
    callbackTimer = setTimer(function finishContextRestore() {
      callbackTimer = null;
      if (!disposed) options.onRestored?.();
    }, 0);
  }

  if (!canvas?.addEventListener || !canvas?.removeEventListener) {
    return { dispose() {} };
  }

  canvas.addEventListener("webglcontextlost", handleContextLost);
  canvas.addEventListener("webglcontextrestored", handleContextRestored);

  return {
    dispose() {
      if (disposed) return;
      disposed = true;
      recovering = false;
      clearRecoveryTimers();
      if (callbackTimer !== null) clearTimer(callbackTimer);
      callbackTimer = null;
      canvas.removeEventListener("webglcontextlost", handleContextLost);
      canvas.removeEventListener("webglcontextrestored", handleContextRestored);
    },
  };
}
