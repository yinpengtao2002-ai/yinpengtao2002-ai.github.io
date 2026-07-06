import { describe, expect, it } from "vitest";
import { createGameState } from "../src/game/game-state.js";
import { createHud } from "../src/ui/hud.js";

function createElement() {
  return {
    textContent: "",
    attributes: {},
    classList: {
      values: new Set(),
      toggle(name, enabled) {
        if (enabled) this.values.add(name);
        else this.values.delete(name);
      },
    },
    addEventListener() {},
    setAttribute(name, value) {
      this.attributes[name] = value;
    },
    getAttribute(name) {
      return this.attributes[name];
    },
  };
}

function createDocument() {
  var elements = {};
  [
    "scoreValue",
    "timeValue",
    "streakValue",
    "concededValue",
    "pauseButton",
    "soundButton",
    "startButton",
    "restartButton",
    "startOverlay",
    "endOverlay",
    "finalScore",
    "resultReason",
  ].forEach((id) => {
    elements[id] = createElement();
  });

  return {
    elements,
    getElementById(id) {
      return elements[id] || null;
    },
  };
}

describe("hud", () => {
  it("labels enabled sound as a state instead of a play prompt", () => {
    const documentRef = createDocument();
    const hud = createHud(documentRef);

    hud.update(createGameState(), true);

    expect(documentRef.elements.soundButton.textContent).toBe("音效开");
    expect(documentRef.elements.soundButton.getAttribute("aria-label")).toBe("关闭音效");

    hud.update(createGameState(), false);

    expect(documentRef.elements.soundButton.textContent).toBe("静音");
    expect(documentRef.elements.soundButton.getAttribute("aria-label")).toBe("开启音效");
  });
});
