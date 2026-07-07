import { describe, expect, it } from "vitest";
import { createGameState } from "../src/game/game-state.js";
import { createHud } from "../src/ui/hud.js";

function createElement() {
  return {
    textContent: "",
    attributes: {},
    dataset: {},
    listeners: {},
    classList: {
      values: new Set(),
      toggle(name, enabled) {
        if (enabled) this.values.add(name);
        else this.values.delete(name);
      },
      contains(name) {
        return this.values.has(name);
      },
    },
    addEventListener(name, listener) {
      this.listeners[name] = listener;
    },
    click() {
      this.listeners.click?.({ currentTarget: this });
    },
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
    "feedbackToast",
  ].forEach((id) => {
    elements[id] = createElement();
  });
  elements.easyDifficulty = createElement();
  elements.easyDifficulty.dataset.difficulty = "easy";
  elements.mediumDifficulty = createElement();
  elements.mediumDifficulty.dataset.difficulty = "medium";
  elements.hardDifficulty = createElement();
  elements.hardDifficulty.dataset.difficulty = "hard";

  return {
    elements,
    getElementById(id) {
      return elements[id] || null;
    },
    querySelectorAll(selector) {
      if (selector === "[data-difficulty]") {
        return [elements.easyDifficulty, elements.mediumDifficulty, elements.hardDifficulty];
      }
      return [];
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

  it("highlights the selected difficulty and reports difficulty changes", () => {
    const documentRef = createDocument();
    const hud = createHud(documentRef);
    let selected = "medium";

    hud.bind({
      onStart() {},
      onRestart() {},
      onPause() {},
      onSound() {},
      onDifficulty(value) {
        selected = value;
      },
    });

    hud.updateDifficulty("medium");
    expect(documentRef.elements.mediumDifficulty.getAttribute("aria-pressed")).toBe("true");
    expect(documentRef.elements.easyDifficulty.getAttribute("aria-pressed")).toBe("false");
    expect(documentRef.elements.hardDifficulty.getAttribute("aria-pressed")).toBe("false");

    documentRef.elements.hardDifficulty.click();
    expect(selected).toBe("hard");
    hud.updateDifficulty(selected);
    expect(documentRef.elements.hardDifficulty.classList.contains("is-active")).toBe(true);
  });

  it("turns game events into restrained status feedback without covering the play field", () => {
    const documentRef = createDocument();
    const hud = createHud(documentRef);
    const state = {
      ...createGameState(),
      running: true,
      message: "save",
      streak: 3,
      lastSavePoints: 150,
    };

    hud.update(state, true);

    expect(documentRef.elements.feedbackToast.textContent).toBe("+150");
    expect(documentRef.elements.feedbackToast.classList.contains("is-visible")).toBe(true);
    expect(documentRef.elements.feedbackToast.classList.contains("is-save")).toBe(true);
    expect(documentRef.elements.feedbackToast.classList.contains("is-streak")).toBe(true);
    expect(documentRef.elements.streakValue.classList.contains("is-hot")).toBe(true);

    hud.update({ ...state, message: "goal", streak: 0, lastSavePoints: 0 }, true);

    expect(documentRef.elements.feedbackToast.textContent).toBe("失球");
    expect(documentRef.elements.feedbackToast.classList.contains("is-goal")).toBe(true);
    expect(documentRef.elements.streakValue.classList.contains("is-hot")).toBe(false);
  });
});
