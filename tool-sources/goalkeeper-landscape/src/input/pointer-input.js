import { mapClientPointToStage } from "../ui/mobile-landscape.js";

export function createPointerInput(element) {
  var pointer = {
    x: 640,
    y: 560,
    active: false,
    mode: "mouse",
  };

  function updateFromEvent(event) {
    var point = mapClientPointToStage(event, element);
    pointer.x = point.x;
    pointer.y = point.y;
    pointer.mode = event.pointerType === "touch" ? "touch" : "mouse";
  }

  function shouldIgnore(event) {
    return event.target && event.target.closest && event.target.closest("button");
  }

  element.addEventListener("pointerdown", function onPointerDown(event) {
    if (shouldIgnore(event)) return;
    event.preventDefault();
    pointer.active = true;
    updateFromEvent(event);
    if (element.setPointerCapture && event.pointerId !== undefined) {
      element.setPointerCapture(event.pointerId);
    }
  });

  element.addEventListener("pointermove", function onPointerMove(event) {
    if (shouldIgnore(event)) return;
    event.preventDefault();
    updateFromEvent(event);
  });

  function releasePointer(event) {
    pointer.active = false;
    if (element.releasePointerCapture && event.pointerId !== undefined) {
      try {
        element.releasePointerCapture(event.pointerId);
      } catch (error) {
        // Pointer may already have been released by the browser.
      }
    }
  }

  element.addEventListener("pointerup", releasePointer);
  element.addEventListener("pointercancel", releasePointer);

  return {
    getPointer(bounds) {
      return {
        x: Math.max(0, Math.min(bounds.width, pointer.x)),
        y: Math.max(0, Math.min(bounds.height, pointer.y)),
      };
    },
    getMode() {
      return pointer.mode;
    },
    setDefault(bounds) {
      pointer.x = bounds.width * 0.5;
      pointer.y = bounds.height * 0.8;
    },
  };
}
