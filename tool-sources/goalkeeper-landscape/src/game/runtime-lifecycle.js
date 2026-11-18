const MAX_FRAME_SECONDS = 0.1;
const MAX_STEP_SECONDS = 0.04;

export function createRuntimeLifecycle({ windowRef, documentRef, onStep, onFrame, onInterrupt }) {
  var running = false;
  var frameId = null;
  var lastFrame = null;

  function cancelFrame() {
    if (frameId !== null) windowRef.cancelAnimationFrame(frameId);
    frameId = null;
    lastFrame = null;
  }

  function scheduleFrame() {
    if (running && !documentRef.hidden && frameId === null) {
      frameId = windowRef.requestAnimationFrame(frame);
    }
  }

  function frame(now) {
    frameId = null;
    if (!running || documentRef.hidden) return;
    var dt = lastFrame === null ? 0 : Math.max(0, Math.min(MAX_FRAME_SECONDS, (now - lastFrame) / 1000));
    lastFrame = now;
    // Catch up short frames in steps the physics world can fully consume.
    var steps = Math.ceil(dt / MAX_STEP_SECONDS);
    for (var i = 0; i < steps; i++) onStep(dt / steps);
    onFrame();
    scheduleFrame();
  }

  function handleVisibility() {
    if (documentRef.hidden) {
      onInterrupt();
      cancelFrame();
    } else {
      // Returning to the tab restarts rendering, not the paused match.
      lastFrame = null;
      scheduleFrame();
    }
  }

  return {
    start() {
      if (running) return;
      running = true;
      documentRef.addEventListener("visibilitychange", handleVisibility);
      windowRef.addEventListener("blur", onInterrupt);
      handleVisibility();
    },
    stop() {
      running = false;
      cancelFrame();
      documentRef.removeEventListener("visibilitychange", handleVisibility);
      windowRef.removeEventListener("blur", onInterrupt);
    },
  };
}
