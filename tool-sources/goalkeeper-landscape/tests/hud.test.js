import { describe, expect, it } from "vitest";
import { createGameState } from "../src/game/game-state.js";
import * as HudModule from "../src/ui/hud.js";
import { createHud } from "../src/ui/hud.js";

function createElement() {
  return {
    textContent: "",
    attributes: {},
    dataset: {},
    style: {},
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
    "pauseResumeButton",
    "soundStatus",
    "startOverlay",
    "pauseOverlay",
    "endOverlay",
    "pauseHint",
    "finalScore",
    "resultGrade",
    "resultReason",
    "resultVerdict",
    "resultSummary",
    "resultCoach",
    "feedbackToast",
    "eventRibbon",
    "matchStatus",
    "pressureCue",
    "matchProgress",
    "matchProgressFill",
    "finalSaves",
    "finalBestStreak",
    "finalConceded",
    "resultTags",
    "finalSaveRate",
    "finalRhythmTag",
    "finalControlTag",
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
  it("surfaces browser audio readiness instead of pretending sound is already audible", () => {
    expect(HudModule.getSoundStatusLabel).toBeTypeOf("function");
    const documentRef = createDocument();
    const hud = createHud(documentRef);

    hud.update(createGameState(), true, { audioStatus: "locked" });

    expect(HudModule.getSoundStatusLabel(true, "locked")).toEqual({
      button: "待启用",
      detail: "点开始后启用音效",
      aria: "音效待启用，开始挑战后会解锁",
      status: "locked",
    });
    expect(documentRef.elements.soundButton.textContent).toBe("待启用");
    expect(documentRef.elements.soundButton.getAttribute("aria-label")).toBe("音效待启用，开始挑战后会解锁");
    expect(documentRef.elements.soundButton.dataset.soundStatus).toBe("locked");
    expect(documentRef.elements.soundButton.classList.contains("is-sound-locked")).toBe(true);
    expect(documentRef.elements.soundStatus.textContent).toBe("点开始后启用音效");
    expect(documentRef.elements.soundStatus.dataset.audioStatusSystem).toBe("match-audio-status-chip");

    hud.update(createGameState(), true, { audioStatus: "ready" });

    expect(documentRef.elements.soundButton.textContent).toBe("音效就绪");
    expect(documentRef.elements.soundButton.getAttribute("aria-label")).toBe("音效已就绪，点击静音");
    expect(documentRef.elements.soundButton.dataset.soundStatus).toBe("ready");
    expect(documentRef.elements.soundButton.classList.contains("is-sound-ready")).toBe(true);
    expect(documentRef.elements.soundButton.classList.contains("is-sound-locked")).toBe(false);

    hud.update(createGameState(), false, { audioStatus: "muted" });

    expect(documentRef.elements.soundButton.textContent).toBe("静音");
    expect(documentRef.elements.soundButton.getAttribute("aria-label")).toBe("音效已静音，点击开启");
    expect(documentRef.elements.soundButton.dataset.soundStatus).toBe("muted");
    expect(documentRef.elements.soundButton.classList.contains("is-sound-muted")).toBe(true);
    expect(documentRef.elements.soundStatus.textContent).toBe("当前静音");
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

    expect(documentRef.elements.feedbackToast.textContent).toBe("连扑 +150");
    expect(documentRef.elements.feedbackToast.classList.contains("is-visible")).toBe(true);
    expect(documentRef.elements.feedbackToast.classList.contains("is-save")).toBe(true);
    expect(documentRef.elements.feedbackToast.classList.contains("is-streak")).toBe(true);
    expect(documentRef.elements.scoreValue.classList.contains("is-score-pulse")).toBe(true);
    expect(documentRef.elements.streakValue.classList.contains("is-hot")).toBe(true);
    expect(documentRef.elements.streakValue.classList.contains("is-streak-pop")).toBe(true);

    hud.update({ ...state, message: "goal", streak: 0, lastSavePoints: 0 }, true);

    expect(documentRef.elements.feedbackToast.textContent).toBe("失球");
    expect(documentRef.elements.feedbackToast.classList.contains("is-goal")).toBe(true);
    expect(documentRef.elements.scoreValue.classList.contains("is-score-pulse")).toBe(false);
    expect(documentRef.elements.concededValue.classList.contains("is-danger-pulse")).toBe(true);
    expect(documentRef.elements.streakValue.classList.contains("is-hot")).toBe(false);
    expect(documentRef.elements.streakValue.classList.contains("is-streak-pop")).toBe(false);
  });

  it("distinguishes frame and wide misses without using the conceded goal treatment", () => {
    const documentRef = createDocument();
    const hud = createHud(documentRef);
    const state = {
      ...createGameState(),
      running: true,
      message: "frame",
      streak: 0,
      lastSavePoints: 0,
    };

    hud.update(state, true);

    expect(documentRef.elements.feedbackToast.textContent).toBe("门框");
    expect(documentRef.elements.feedbackToast.classList.contains("is-visible")).toBe(true);
    expect(documentRef.elements.feedbackToast.classList.contains("is-frame")).toBe(true);
    expect(documentRef.elements.feedbackToast.classList.contains("is-goal")).toBe(false);

    hud.update({ ...state, message: "miss" }, true);

    expect(documentRef.elements.feedbackToast.textContent).toBe("偏出");
    expect(documentRef.elements.feedbackToast.classList.contains("is-miss")).toBe(true);
    expect(documentRef.elements.feedbackToast.classList.contains("is-frame")).toBe(false);
  });

  it("adds a broadcast-style event ribbon for key moments without replacing the play field", () => {
    expect(HudModule.getEventRibbonPlan).toBeTypeOf("function");
    const documentRef = createDocument();
    const hud = createHud(documentRef);
    const saveState = {
      ...createGameState(),
      running: true,
      message: "save",
      streak: 1,
      lastSavePoints: 110,
    };

    expect(HudModule.getEventRibbonPlan(saveState)).toEqual({
      visible: true,
      tone: "save",
      kicker: "SAVE",
      text: "+110",
      marker: "broadcast-event-ribbon-hud",
    });

    hud.update(saveState, true);
    expect(documentRef.elements.eventRibbon.dataset.hudSystem).toBe("broadcast-event-ribbon-hud");
    expect(documentRef.elements.eventRibbon.dataset.tone).toBe("save");
    expect(documentRef.elements.eventRibbon.textContent).toBe("SAVE +110");
    expect(documentRef.elements.eventRibbon.classList.contains("is-visible")).toBe(true);
    expect(documentRef.elements.eventRibbon.classList.contains("is-save")).toBe(true);

    hud.update({ ...saveState, message: "save", streak: 4, lastSavePoints: 180 }, true);
    expect(documentRef.elements.eventRibbon.dataset.tone).toBe("streak");
    expect(documentRef.elements.eventRibbon.textContent).toBe("STREAK x4 +180");
    expect(documentRef.elements.eventRibbon.classList.contains("is-streak")).toBe(true);

    hud.update({ ...saveState, message: "goal", conceded: 4, streak: 0, lastSavePoints: 0 }, true);
    expect(documentRef.elements.eventRibbon.dataset.tone).toBe("danger");
    expect(documentRef.elements.eventRibbon.textContent).toBe("DANGER 4/5");
    expect(documentRef.elements.eventRibbon.classList.contains("is-danger")).toBe(true);

    hud.update({ ...saveState, message: "" }, true);
    expect(documentRef.elements.eventRibbon.classList.contains("is-visible")).toBe(false);
  });

  it("shows match flow states without replacing the playable field", () => {
    const documentRef = createDocument();
    const hud = createHud(documentRef);
    const state = {
      ...createGameState(),
      running: true,
      message: "start",
    };

    hud.update(state, true, { roundIntroCue: { visible: true, label: "3" } });

    expect(documentRef.elements.matchStatus.textContent).toBe("3");
    expect(documentRef.elements.matchStatus.classList.contains("is-visible")).toBe(true);
    expect(documentRef.elements.matchStatus.classList.contains("is-countdown")).toBe(true);

    hud.update({ ...state, paused: true, message: "pause" }, true, {
      roundIntroCue: { visible: false, label: "" },
    });

    expect(documentRef.elements.matchStatus.textContent).toBe("暂停");
    expect(documentRef.elements.matchStatus.classList.contains("is-visible")).toBe(true);
    expect(documentRef.elements.matchStatus.classList.contains("is-paused")).toBe(true);
    expect(documentRef.elements.matchStatus.classList.contains("is-countdown")).toBe(false);

    hud.update({ ...state, paused: false, message: "save" }, true, {
      roundIntroCue: { visible: false, label: "" },
    });

    expect(documentRef.elements.matchStatus.textContent).toBe("");
    expect(documentRef.elements.matchStatus.classList.contains("is-visible")).toBe(false);
  });

  it("surfaces last-seconds and match-point pressure without turning the HUD into a debug panel", () => {
    expect(HudModule.getPressureCueText).toBeTypeOf("function");
    const documentRef = createDocument();
    const hud = createHud(documentRef);
    const pressureState = {
      ...createGameState(),
      running: true,
      timeLeft: 9.2,
      conceded: 4,
    };

    hud.update(pressureState, true);

    expect(HudModule.getPressureCueText(pressureState)).toBe("最后 10 秒 · 别再丢");
    expect(documentRef.elements.pressureCue.textContent).toBe("最后 10 秒 · 别再丢");
    expect(documentRef.elements.pressureCue.classList.contains("is-visible")).toBe(true);
    expect(documentRef.elements.pressureCue.dataset.hudSystem).toBe("match-pressure-hud");
    expect(documentRef.elements.timeValue.classList.contains("is-low-time")).toBe(true);
    expect(documentRef.elements.timeValue.getAttribute("aria-label")).toBe("剩余 10 秒，最后 10 秒");
    expect(documentRef.elements.concededValue.classList.contains("is-match-point")).toBe(true);
    expect(documentRef.elements.concededValue.getAttribute("aria-label")).toBe("失球 4/5，再丢一球结束");

    hud.update({
      ...createGameState(),
      running: true,
      timeLeft: 42,
      conceded: 1,
    }, true);

    expect(documentRef.elements.pressureCue.textContent).toBe("");
    expect(documentRef.elements.pressureCue.classList.contains("is-visible")).toBe(false);
    expect(documentRef.elements.timeValue.classList.contains("is-low-time")).toBe(false);
    expect(documentRef.elements.concededValue.classList.contains("is-match-point")).toBe(false);
  });

  it("renders a slim match progress meter that supports pressure states without covering play", () => {
    expect(HudModule.getMatchProgressPercent).toBeTypeOf("function");
    const documentRef = createDocument();
    const hud = createHud(documentRef);
    const state = {
      ...createGameState(),
      running: true,
      timeLeft: 30.4,
      conceded: 1,
    };

    hud.update(state, true);

    expect(HudModule.getMatchProgressPercent(state)).toBe(51);
    expect(documentRef.elements.matchProgress.dataset.hudSystem).toBe("match-progress-hud");
    expect(documentRef.elements.matchProgress.getAttribute("aria-valuemin")).toBe("0");
    expect(documentRef.elements.matchProgress.getAttribute("aria-valuemax")).toBe("60");
    expect(documentRef.elements.matchProgress.getAttribute("aria-valuenow")).toBe("31");
    expect(documentRef.elements.matchProgress.getAttribute("aria-valuetext")).toBe("剩余 31 秒");
    expect(documentRef.elements.matchProgressFill.style.width).toBe("51%");
    expect(documentRef.elements.matchProgress.classList.contains("is-low-time")).toBe(false);
    expect(documentRef.elements.matchProgress.classList.contains("is-match-point")).toBe(false);

    hud.update({ ...state, timeLeft: 9.2, conceded: 4 }, true);

    expect(documentRef.elements.matchProgressFill.style.width).toBe("15%");
    expect(documentRef.elements.matchProgress.getAttribute("aria-valuenow")).toBe("10");
    expect(documentRef.elements.matchProgress.getAttribute("aria-valuetext")).toBe("剩余 10 秒");
    expect(documentRef.elements.matchProgress.classList.contains("is-low-time")).toBe(true);
    expect(documentRef.elements.matchProgress.classList.contains("is-match-point")).toBe(true);
  });

  it("uses a dedicated pause overlay and keeps the resume action reachable", () => {
    const documentRef = createDocument();
    const hud = createHud(documentRef);
    let pauseClicks = 0;
    const state = {
      ...createGameState(),
      running: true,
      paused: false,
      message: "start",
    };

    hud.bind({
      onStart() {},
      onRestart() {},
      onPause() {
        pauseClicks += 1;
      },
      onSound() {},
      onDifficulty() {},
    });

    hud.update(state, true);
    expect(documentRef.elements.pauseOverlay.classList.contains("hidden")).toBe(true);
    expect(documentRef.elements.pauseButton.getAttribute("aria-label")).toBe("暂停挑战");

    hud.update({ ...state, paused: true, message: "pause" }, true);

    expect(documentRef.elements.pauseOverlay.classList.contains("hidden")).toBe(false);
    expect(documentRef.elements.pauseButton.textContent).toBe("▶ 继续");
    expect(documentRef.elements.pauseButton.getAttribute("aria-label")).toBe("继续挑战");
    expect(documentRef.elements.pauseHint.textContent).toBe("先盯球速，再移动手套");
    expect(documentRef.elements.pauseHint.dataset.pauseHintSystem).toBe("match-pause-coach-hint");

    documentRef.elements.pauseResumeButton.click();
    expect(pauseClicks).toBe(1);
  });

  it("gives context-aware pause hints without blocking the resume action", () => {
    expect(HudModule.getPauseHintText).toBeTypeOf("function");
    const documentRef = createDocument();
    const hud = createHud(documentRef);
    const pressureState = {
      ...createGameState(),
      running: true,
      paused: true,
      timeLeft: 8.4,
      conceded: 4,
    };

    expect(HudModule.getPauseHintText(pressureState)).toBe("最后几秒，先守中路");

    hud.update(pressureState, true, { audioStatus: "ready" });

    expect(documentRef.elements.pauseHint.textContent).toBe("最后几秒，先守中路");
    expect(documentRef.elements.pauseOverlay.classList.contains("hidden")).toBe(false);

    hud.update({ ...pressureState, timeLeft: 34, conceded: 1, streak: 3 }, true, { audioStatus: "ready" });

    expect(documentRef.elements.pauseHint.textContent).toBe("连扑手感在线，继续压近角");
  });

  it("fills the end overlay with useful round statistics", () => {
    const documentRef = createDocument();
    const hud = createHud(documentRef);
    const state = {
      ...createGameState(),
      running: false,
      ended: true,
      endReason: "time",
      score: 475,
      saves: 4,
      conceded: 2,
      bestStreak: 3,
    };

    hud.update(state, true);

    expect(documentRef.elements.resultReason.textContent).toBe("时间到");
    expect(documentRef.elements.finalScore.textContent).toBe("475");
    expect(documentRef.elements.finalSaves.textContent).toBe("4");
    expect(documentRef.elements.finalBestStreak.textContent).toBe("x3");
    expect(documentRef.elements.finalConceded.textContent).toBe("2/5");
  });

  it("adds a concise result summary so the end screen feels intentional", () => {
    expect(HudModule.getResultSummaryText).toBeTypeOf("function");
    const documentRef = createDocument();
    const hud = createHud(documentRef);

    hud.update({
      ...createGameState(),
      ended: true,
      endReason: "time",
      saves: 7,
      conceded: 1,
      bestStreak: 4,
    }, true);

    expect(documentRef.elements.resultSummary.textContent).toBe("最佳连扑 x4，手感在线");

    hud.update({
      ...createGameState(),
      ended: true,
      endReason: "conceded",
      saves: 2,
      conceded: 5,
      bestStreak: 1,
    }, true);

    expect(documentRef.elements.resultSummary.textContent).toBe("再守一轮，先稳近角");
  });

  it("adds a compact coach note to the result screen so the next round has direction", () => {
    expect(HudModule.getResultCoachText).toBeTypeOf("function");
    const documentRef = createDocument();
    const hud = createHud(documentRef);
    const strongRound = {
      ...createGameState(),
      ended: true,
      score: 1280,
      saves: 9,
      conceded: 0,
      bestStreak: 7,
      endReason: "time",
    };
    const lostRound = {
      ...createGameState(),
      ended: true,
      score: 120,
      saves: 1,
      conceded: 5,
      bestStreak: 1,
      endReason: "conceded",
    };

    expect(HudModule.getResultCoachText(strongRound)).toBe("下一局可以切到困难，练边角反应");
    expect(HudModule.getResultCoachText(lostRound)).toBe("下一局先守中路，边角球再提前压手套");

    hud.update(strongRound, true, { audioStatus: "ready" });

    expect(documentRef.elements.resultCoach.textContent).toBe("下一局可以切到困难，练边角反应");
    expect(documentRef.elements.resultCoach.dataset.resultCoachSystem).toBe("round-result-coach-note");

    hud.update(lostRound, true, { audioStatus: "ready" });

    expect(documentRef.elements.resultCoach.textContent).toBe("下一局先守中路，边角球再提前压手套");
  });

  it("grades the round so the end screen feels like a complete game result", () => {
    expect(HudModule.getResultGrade).toBeTypeOf("function");
    expect(HudModule.getResultVerdictText).toBeTypeOf("function");
    const documentRef = createDocument();
    const hud = createHud(documentRef);

    hud.update({
      ...createGameState(),
      ended: true,
      score: 980,
      saves: 8,
      conceded: 1,
      bestStreak: 5,
      endReason: "time",
    }, true);

    expect(documentRef.elements.resultGrade.textContent).toBe("A级");
    expect(documentRef.elements.resultVerdict.textContent).toBe("反应很稳，已经有比赛手感");

    hud.update({
      ...createGameState(),
      ended: true,
      score: 120,
      saves: 1,
      conceded: 5,
      bestStreak: 1,
      endReason: "conceded",
    }, true);

    expect(documentRef.elements.resultGrade.textContent).toBe("C级");
    expect(documentRef.elements.resultVerdict.textContent).toBe("先守住中路，再去赌边角");
  });

  it("adds compact performance tags to make the end screen read like a match report", () => {
    expect(HudModule.getResultPerformanceTags).toBeTypeOf("function");
    const documentRef = createDocument();
    const hud = createHud(documentRef);
    const state = {
      ...createGameState(),
      ended: true,
      score: 860,
      saves: 8,
      conceded: 2,
      bestStreak: 4,
      endReason: "time",
    };

    const tags = HudModule.getResultPerformanceTags(state);
    expect(tags).toEqual([
      { label: "扑救率", value: "80%" },
      { label: "节奏", value: "连扑 x4" },
      { label: "失球控制", value: "稳住" },
    ]);

    hud.update(state, true);

    expect(documentRef.elements.resultTags.dataset.resultTagsSystem).toBe("round-result-performance-tags");
    expect(documentRef.elements.finalSaveRate.textContent).toBe("80%");
    expect(documentRef.elements.finalRhythmTag.textContent).toBe("连扑 x4");
    expect(documentRef.elements.finalControlTag.textContent).toBe("稳住");

    hud.update({
      ...createGameState(),
      ended: true,
      saves: 1,
      conceded: 5,
      bestStreak: 1,
      endReason: "conceded",
    }, true);

    expect(documentRef.elements.finalSaveRate.textContent).toBe("17%");
    expect(documentRef.elements.finalRhythmTag.textContent).toBe("启动");
    expect(documentRef.elements.finalControlTag.textContent).toBe("吃紧");
  });
});
