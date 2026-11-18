import { mapClientPointToStage } from "../ui/mobile-landscape.js";

export function createPointerInput(element) {
  var pointer = {
    x: 640,
    y: 560,
    mode: "mouse",
  };
  var activePointerId = null;
  var clientPoint = null;
  var needsMapping = false;
  var previousBounds = null;

  function updateFromEvent(event) {
    clientPoint = { clientX: event.clientX, clientY: event.clientY };
    needsMapping = true;
    pointer.mode = event.pointerType === "touch" ? "touch" : "mouse";
  }

  function shouldIgnore(event) {
    return event.target && event.target.closest && event.target.closest("button");
  }

  function onPointerDown(event) {
    if (shouldIgnore(event) || activePointerId !== null) return;
    event.preventDefault();
    activePointerId = event.pointerId;
    updateFromEvent(event);
    if (element.setPointerCapture && event.pointerId !== undefined) {
      try {
        element.setPointerCapture(event.pointerId);
      } catch {
        // Synthetic touch events and some embedded browsers may not create an
        // active pointer before pointerdown reaches this handler.
      }
    }
  }

  function onPointerMove(event) {
    if (shouldIgnore(event)) return;
    if ((activePointerId !== null || event.pointerType === "touch") && event.pointerId !== activePointerId) return;
    event.preventDefault();
    updateFromEvent(event);
  }

  function cancelGesture() {
    var id = activePointerId;
    activePointerId = null;
    if (id != null && element.hasPointerCapture?.(id)) {
      try {
        element.releasePointerCapture(id);
      } catch {
        // Pointer may already have been released by the browser.
      }
    }
  }

  function releasePointer(event) {
    if (activePointerId === event.pointerId) cancelGesture();
  }

  function onCaptureLost(event) {
    if (event.target === element) releasePointer(event);
  }

  element.addEventListener("pointerdown", onPointerDown);
  element.addEventListener("pointermove", onPointerMove);
  element.addEventListener("pointerup", releasePointer);
  element.addEventListener("pointercancel", releasePointer);
  element.addEventListener("lostpointercapture", onCaptureLost);

  return {
    cancelGesture,
    dispose() {
      cancelGesture();
      element.removeEventListener("pointerdown", onPointerDown);
      element.removeEventListener("pointermove", onPointerMove);
      element.removeEventListener("pointerup", releasePointer);
      element.removeEventListener("pointercancel", releasePointer);
      element.removeEventListener("lostpointercapture", onCaptureLost);
    },
    getPointer(bounds) {
      if (needsMapping) {
        var point = mapClientPointToStage(clientPoint, element);
        pointer.x = point.x;
        pointer.y = point.y;
        needsMapping = false;
      }
      return {
        x: Math.max(0, Math.min(bounds.width, pointer.x)),
        y: Math.max(0, Math.min(bounds.height, pointer.y)),
      };
    },
    getMode() {
      return pointer.mode;
    },
    resize(bounds) {
      if (!clientPoint) {
        pointer.x = bounds.width * 0.5;
        pointer.y = bounds.height * 0.8;
      } else if (pointer.mode === "touch" && activePointerId === null && previousBounds && !needsMapping) {
        pointer.x *= bounds.width / previousBounds.width;
        pointer.y *= bounds.height / previousBounds.height;
      } else {
        needsMapping = true;
      }
      previousBounds = bounds;
    },
  };
}
