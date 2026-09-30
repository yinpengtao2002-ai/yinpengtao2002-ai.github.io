export function createRuntimeLifecycle({ windowRef, documentRef, onFrame, onInterrupt }) {
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
    var dt = lastFrame === null ? 0 : Math.max(0, Math.min(0.04, (now - lastFrame) / 1000));
    lastFrame = now;
    onFrame(dt);
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
