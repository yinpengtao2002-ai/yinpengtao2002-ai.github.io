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
    "stage",
    "gameHud",
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
    "resultReview",
    "finalHighlight",
    "finalWeakness",
    "finalNextTarget",
    "feedbackToast",
    "eventRibbon",
    "matchAtmosphere",
    "matchAtmosphereFill",
    "matchAtmosphereCopy",
    "matchStatus",
    "pressureCue",
    "matchProgress",
    "matchProgressFill",
    "bottomControls",
    "finalSaves",
    "finalBestStreak",
    "finalConceded",
    "resultTags",
    "finalSaveRate",
    "finalRhythmTag",
    "finalControlTag",
    "scoreLabel",
    "timeLabel",
    "streakLabel",
    "concededLabel",
    "startKicker",
    "startTitle",
    "startRuleA",
    "startRuleB",
    "startRuleC",
    "startButtonLabel",
    "penaltyScoreboard",
    "penaltyTeamKicks",
    "penaltyOpponentKicks",
    "penaltyTeamScore",
    "penaltyOpponentScore",
    "penaltyRoundLabel",
    "penaltyPhaseLabel",
    "penaltyAnnouncement",
    "penaltyRoundBreak",
    "penaltyRoundBreakLabel",
    "penaltyRoundBreakScore",
    "penaltyRoundBreakDetail",
    "finalSavesLabel",
    "finalBestStreakLabel",
    "finalConcededLabel",
  ].forEach((id) => {
    elements[id] = createElement();
  });
  elements.easyDifficulty = createElement();
  elements.easyDifficulty.dataset.difficulty = "easy";
  elements.mediumDifficulty = createElement();
  elements.mediumDifficulty.dataset.difficulty = "medium";
  elements.hardDifficulty = createElement();
  elements.hardDifficulty.dataset.difficulty = "hard";
  elements.extremeDifficulty = createElement();
  elements.extremeDifficulty.dataset.difficulty = "extreme";
  elements.timedMode = createElement();
  elements.timedMode.dataset.mode = "timed";
  elements.penaltyMode = createElement();
  elements.penaltyMode.dataset.mode = "penalty";

  return {
    elements,
    getElementById(id) {
      return elements[id] || null;
    },
    querySelectorAll(selector) {
      if (selector === "[data-difficulty]") {
        return [elements.easyDifficulty, elements.mediumDifficulty, elements.hardDifficulty, elements.extremeDifficulty];
      }
      if (selector === "[data-mode]") {
        return [elements.timedMode, elements.penaltyMode];
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
      button: "",
      detail: "点开始后启用音乐与音效",
      aria: "音乐与音效待启用，开始挑战后会解锁",
      status: "locked",
    });
    expect(documentRef.elements.soundButton.textContent).toBe("");
    expect(documentRef.elements.soundButton.getAttribute("aria-label")).toBe("音乐与音效待启用，开始挑战后会解锁");
    expect(documentRef.elements.soundButton.dataset.soundStatus).toBe("locked");
    expect(documentRef.elements.soundButton.classList.contains("is-sound-locked")).toBe(true);
    expect(documentRef.elements.soundStatus.textContent).toBe("点开始后启用音乐与音效");
    expect(documentRef.elements.soundStatus.dataset.audioStatusSystem).toBe("match-audio-status-chip");

    hud.update(createGameState(), true, { audioStatus: "ready" });

    expect(documentRef.elements.soundButton.textContent).toBe("");
    expect(documentRef.elements.soundButton.getAttribute("aria-label")).toBe("音乐与音效已就绪，点击静音");
    expect(documentRef.elements.soundButton.dataset.soundStatus).toBe("ready");
    expect(documentRef.elements.soundButton.classList.contains("is-sound-ready")).toBe(true);
    expect(documentRef.elements.soundButton.classList.contains("is-sound-locked")).toBe(false);

    hud.update(createGameState(), false, { audioStatus: "muted" });

    expect(documentRef.elements.soundButton.textContent).toBe("");
    expect(documentRef.elements.soundButton.getAttribute("aria-label")).toBe("音乐与音效已静音，点击开启");
    expect(documentRef.elements.soundButton.dataset.soundStatus).toBe("muted");
    expect(documentRef.elements.soundButton.classList.contains("is-sound-muted")).toBe(true);
    expect(documentRef.elements.soundStatus.textContent).toBe("音乐与音效已静音");
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

  it("switches between timed and penalty modes while reserving extreme for shootouts", () => {
    const documentRef = createDocument();
    const hud = createHud(documentRef);
    let selectedMode = "timed";

    hud.bind({
      onStart() {},
      onRestart() {},
      onPause() {},
      onSound() {},
      onDifficulty() {},
      onMode(value) {
        selectedMode = value;
      },
    });

    hud.updateMode("timed");
    expect(documentRef.elements.timedMode.getAttribute("aria-pressed")).toBe("true");
    expect(documentRef.elements.penaltyMode.getAttribute("aria-pressed")).toBe("false");
    expect(documentRef.elements.extremeDifficulty.classList.contains("hidden")).toBe(true);
    expect(documentRef.elements.mediumDifficulty.classList.contains("hidden")).toBe(false);

    documentRef.elements.penaltyMode.click();
    expect(selectedMode).toBe("penalty");
    hud.updateMode(selectedMode);
    expect(documentRef.elements.penaltyMode.classList.contains("is-active")).toBe(true);
    expect(documentRef.elements.extremeDifficulty.classList.contains("hidden")).toBe(false);
    expect(documentRef.elements.mediumDifficulty.classList.contains("hidden")).toBe(true);
    expect(documentRef.elements.stage.dataset.mode).toBe("penalty");
  });

  it("renders a real penalty scoreline with kick-by-kick marks and sudden death", () => {
    expect(HudModule.getPenaltyHudPlan).toBeTypeOf("function");
    const documentRef = createDocument();
    const hud = createHud(documentRef);
    const state = {
      ...createGameState({ mode: "penalty" }),
      mode: "penalty",
      running: true,
      shootout: {
        teamKicks: ["goal", "miss", "goal", "goal", "miss"],
        opponentKicks: ["goal", "goal", "miss", "goal", "miss"],
        teamGoals: 3,
        opponentGoals: 3,
        suddenDeath: true,
        phase: "defend",
        round: 6,
        ended: false,
        winner: null,
        lastEvent: { side: "team", result: "miss", round: 5 },
      },
    };

    const plan = HudModule.getPenaltyHudPlan(state);
    expect(plan.visible).toBe(true);
    expect(plan.teamMarks).toBe("● × ● ● × ·");
    expect(plan.opponentMarks).toBe("● ● × ● × ·");
    expect(plan.scoreText).toBe("3 : 3");
    expect(plan.roundLabel).toBe("骤死 第 6 轮");
    expect(plan.phaseLabel).toBe("准备扑救");

    hud.update(state, true, { audioStatus: "ready" });
    expect(documentRef.elements.penaltyScoreboard.classList.contains("hidden")).toBe(false);
    expect(documentRef.elements.penaltyTeamKicks.textContent).toBe(plan.teamMarks);
    expect(documentRef.elements.penaltyOpponentKicks.textContent).toBe(plan.opponentMarks);
    expect(documentRef.elements.penaltyRoundLabel.textContent).toBe("骤死 第 6 轮");
    expect(documentRef.elements.scoreValue.textContent).toBe("0");
    expect(documentRef.elements.timeValue.textContent).toBe("6");
    expect(documentRef.elements.streakValue.textContent).toBe("骤死");
    expect(documentRef.elements.concededValue.textContent).toBe("3:3");
  });

  it("shows each completed penalty round score in the center before the next countdown", () => {
    const documentRef = createDocument();
    const hud = createHud(documentRef);
    const state = {
      ...createGameState({ mode: "penalty" }),
      mode: "penalty",
      running: true,
      shootout: {
        teamKicks: ["goal", "miss"],
        opponentKicks: ["goal", "goal"],
        teamGoals: 1,
        opponentGoals: 2,
        suddenDeath: false,
        phase: "defend",
        round: 3,
        ended: false,
        winner: null,
      },
    };

    hud.update(state, true, {
      audioStatus: "ready",
      penaltyRoundBreak: {
        visible: true,
        round: 2,
        roundLabel: "第 2 轮结束",
        scoreText: "1 : 2",
        teamResultLabel: "我方未进",
        teamGoals: 1,
        opponentGoals: 2,
      },
    });

    expect(documentRef.elements.penaltyRoundBreak.classList.contains("is-visible")).toBe(true);
    expect(documentRef.elements.penaltyRoundBreakLabel.textContent).toBe("第 2 轮结束");
    expect(documentRef.elements.penaltyRoundBreakScore.textContent).toBe("1 : 2");
    expect(documentRef.elements.penaltyRoundBreakDetail.textContent).toBe("我方未进");
    expect(documentRef.elements.penaltyAnnouncement.classList.contains("is-visible")).toBe(false);
  });

  it("labels the centered penalty countdown with its round", () => {
    const documentRef = createDocument();
    const hud = createHud(documentRef);
    const state = {
      ...createGameState({ mode: "penalty" }),
      mode: "penalty",
      running: true,
    };

    hud.update(state, true, {
      audioStatus: "ready",
      roundIntroCue: {
        visible: true,
        label: "3",
        kicker: "第 2 轮",
        ariaLabel: "第 2 轮点球，3 秒后射门",
      },
    });

    expect(documentRef.elements.matchStatus.textContent).toBe("第 2 轮 · 3");
    expect(documentRef.elements.matchStatus.classList.contains("is-penalty-countdown")).toBe(true);
    expect(documentRef.elements.matchStatus.getAttribute("aria-label")).toBe("第 2 轮点球，3 秒后射门");
  });

  it("turns the result card into a penalty win or loss summary", () => {
    const documentRef = createDocument();
    const hud = createHud(documentRef);
    const state = {
      ...createGameState({ mode: "penalty" }),
      mode: "penalty",
      running: false,
      ended: true,
      endReason: "penalty-win",
      saves: 2,
      shootout: {
        teamKicks: ["goal", "goal", "miss", "goal", "goal", "goal"],
        opponentKicks: ["goal", "miss", "goal", "goal", "goal", "miss"],
        teamGoals: 5,
        opponentGoals: 4,
        suddenDeath: true,
        round: 6,
        phase: "complete",
        ended: true,
        winner: "team",
      },
    };

    hud.update(state, true, { audioStatus: "ready" });

    expect(documentRef.elements.resultGrade.textContent).toBe("胜");
    expect(documentRef.elements.resultReason.textContent).toBe("点球大战胜利");
    expect(documentRef.elements.finalScore.textContent).toBe("5:4");
    expect(documentRef.elements.resultVerdict.textContent).toContain("关键点球");
    expect(documentRef.elements.resultSummary.textContent).toContain("骤死第 6 轮");
    expect(documentRef.elements.finalSaves.textContent).toBe("2");
    expect(documentRef.elements.finalConceded.textContent).toBe("4");
    expect(documentRef.elements.finalSavesLabel.textContent).toBe("扑出");
    expect(documentRef.elements.finalBestStreakLabel.textContent).toBe("决胜");
    expect(documentRef.elements.finalConcededLabel.textContent).toBe("对手进球");
  });

  it("uses penalty score language instead of the timed five-goal danger warning", () => {
    const state = {
      ...createGameState({ mode: "penalty" }),
      mode: "penalty",
      running: true,
      message: "goal",
      conceded: 7,
      shootout: {
        teamGoals: 6,
        opponentGoals: 7,
        teamKicks: Array(7).fill("goal"),
        opponentKicks: Array(7).fill("goal"),
        suddenDeath: true,
        phase: "team-kick",
        round: 7,
        ended: false,
      },
    };

    const ribbon = HudModule.getEventRibbonPlan(state);
    expect(ribbon.kicker).toBe("对手罚进");
    expect(ribbon.text).toBe("6:7");
    expect(ribbon.ariaLabel).toBe("对手点球罚进，比分 6 比 7");
    expect(ribbon.text).not.toContain("/5");
  });

  it("compacts setup controls during live play so difficulty buttons stop blocking the field", () => {
    const documentRef = createDocument();
    const hud = createHud(documentRef);

    hud.update(createGameState(), true, { audioStatus: "locked" });

    expect(documentRef.elements.bottomControls.dataset.controlMode).toBe("setup");
    expect(documentRef.elements.bottomControls.dataset.controlRailSystem).toBe("live-match-control-rail");
    expect(documentRef.elements.bottomControls.classList.contains("is-live-compact")).toBe(false);
    expect(documentRef.elements.pauseButton.classList.contains("hidden")).toBe(true);
    expect(documentRef.elements.easyDifficulty.disabled).toBe(false);
    expect(documentRef.elements.easyDifficulty.getAttribute("aria-disabled")).toBe("false");
    expect(documentRef.elements.soundButton.disabled).toBe(false);

    hud.update({
      ...createGameState(),
      running: true,
      paused: false,
      ended: false,
    }, true, { audioStatus: "ready" });

    expect(documentRef.elements.bottomControls.dataset.controlMode).toBe("live");
    expect(documentRef.elements.bottomControls.classList.contains("is-live-compact")).toBe(true);
    expect(documentRef.elements.pauseButton.classList.contains("hidden")).toBe(false);
    expect(documentRef.elements.easyDifficulty.disabled).toBe(true);
    expect(documentRef.elements.easyDifficulty.getAttribute("aria-disabled")).toBe("true");
    expect(documentRef.elements.mediumDifficulty.disabled).toBe(true);
    expect(documentRef.elements.hardDifficulty.disabled).toBe(true);
    expect(documentRef.elements.soundButton.disabled).toBe(false);

    hud.update({
      ...createGameState(),
      running: false,
      ended: true,
    }, true, { audioStatus: "ready" });

    expect(documentRef.elements.bottomControls.dataset.controlMode).toBe("result");
    expect(documentRef.elements.bottomControls.classList.contains("is-live-compact")).toBe(false);
    expect(documentRef.elements.pauseButton.classList.contains("hidden")).toBe(true);
    expect(documentRef.elements.easyDifficulty.disabled).toBe(false);
  });

  it("keeps the center toast for save moments while goals move to the edge event system", () => {
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

    expect(documentRef.elements.feedbackToast.textContent).toBe("");
    expect(documentRef.elements.feedbackToast.classList.contains("is-visible")).toBe(false);
    expect(documentRef.elements.feedbackToast.classList.contains("is-goal")).toBe(false);
    expect(documentRef.elements.scoreValue.classList.contains("is-score-pulse")).toBe(false);
    expect(documentRef.elements.concededValue.classList.contains("is-danger-pulse")).toBe(true);
    expect(documentRef.elements.streakValue.classList.contains("is-hot")).toBe(false);
    expect(documentRef.elements.streakValue.classList.contains("is-streak-pop")).toBe(false);
  });

  it("keeps frame and wide misses out of the center toast so the shot lane stays clear", () => {
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

    expect(documentRef.elements.feedbackToast.textContent).toBe("");
    expect(documentRef.elements.feedbackToast.classList.contains("is-visible")).toBe(false);
    expect(documentRef.elements.feedbackToast.classList.contains("is-frame")).toBe(false);
    expect(documentRef.elements.feedbackToast.classList.contains("is-goal")).toBe(false);

    hud.update({ ...state, message: "miss" }, true);

    expect(documentRef.elements.feedbackToast.textContent).toBe("");
    expect(documentRef.elements.feedbackToast.classList.contains("is-miss")).toBe(false);
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
      priority: "core",
      kicker: "扑救",
      text: "+110",
      ariaLabel: "扑救成功，加 110 分",
      marker: "single-match-event-feedback-layer",
    });

    hud.update(saveState, true);
    expect(documentRef.elements.eventRibbon.dataset.hudSystem).toBe("single-match-event-feedback-layer");
    expect(documentRef.elements.eventRibbon.dataset.tone).toBe("save");
    expect(documentRef.elements.eventRibbon.dataset.priority).toBe("core");
    expect(documentRef.elements.eventRibbon.getAttribute("aria-label")).toBe("扑救成功，加 110 分");
    expect(documentRef.elements.eventRibbon.textContent).toBe("扑救 +110");
    expect(documentRef.elements.eventRibbon.classList.contains("is-visible")).toBe(true);
    expect(documentRef.elements.eventRibbon.classList.contains("is-save")).toBe(true);

    hud.update({ ...saveState, message: "save", streak: 4, lastSavePoints: 180 }, true);
    expect(documentRef.elements.eventRibbon.dataset.tone).toBe("streak");
    expect(documentRef.elements.eventRibbon.dataset.priority).toBe("highlight");
    expect(documentRef.elements.eventRibbon.getAttribute("aria-label")).toBe("连续扑救 4 次，加 180 分");
    expect(documentRef.elements.eventRibbon.textContent).toBe("连扑 x4 +180");
    expect(documentRef.elements.eventRibbon.classList.contains("is-streak")).toBe(true);

    hud.update({ ...saveState, message: "goal", conceded: 4, streak: 0, lastSavePoints: 0 }, true);
    expect(documentRef.elements.eventRibbon.dataset.tone).toBe("danger");
    expect(documentRef.elements.eventRibbon.dataset.priority).toBe("critical");
    expect(documentRef.elements.eventRibbon.getAttribute("aria-label")).toBe("防线吃紧，失球 4/5");
    expect(documentRef.elements.eventRibbon.textContent).toBe("危险 4/5");
    expect(documentRef.elements.eventRibbon.classList.contains("is-danger")).toBe(true);

    hud.update({ ...saveState, message: "" }, true);
    expect(documentRef.elements.eventRibbon.classList.contains("is-visible")).toBe(false);
    expect(documentRef.elements.eventRibbon.dataset.priority).toBe("ambient");
    expect(documentRef.elements.eventRibbon.getAttribute("aria-label")).toBe("");
    expect(documentRef.elements.eventRibbon.textContent).toBe("危险 4/5");
  });

  it("adds a slim atmosphere rail that reacts to match events without blocking play", () => {
    expect(HudModule.getMatchAtmospherePlan).toBeTypeOf("function");
    const documentRef = createDocument();
    const hud = createHud(documentRef);
    const saveState = {
      ...createGameState(),
      running: true,
      paused: false,
      ended: false,
      message: "save",
      streak: 1,
      lastSavePoints: 120,
      conceded: 1,
      timeLeft: 42,
    };

    expect(HudModule.getMatchAtmospherePlan(saveState)).toMatchObject({
      visible: true,
      tone: "save",
      label: "扑救成功",
      detail: "+120",
      marker: "match-atmosphere-event-rail",
    });

    hud.update(saveState, true);

    expect(documentRef.elements.matchAtmosphere.dataset.hudSystem).toBe("match-atmosphere-event-rail");
    expect(documentRef.elements.matchAtmosphere.dataset.tone).toBe("save");
    expect(documentRef.elements.matchAtmosphere.classList.contains("is-visible")).toBe(true);
    expect(documentRef.elements.matchAtmosphere.classList.contains("is-save")).toBe(true);
    expect(documentRef.elements.matchAtmosphereCopy.textContent).toBe("扑救成功 +120");
    expect(documentRef.elements.matchAtmosphereFill.style.width).toBe("62%");

    hud.update({ ...saveState, streak: 4, lastSavePoints: 190 }, true);

    expect(documentRef.elements.matchAtmosphere.dataset.tone).toBe("streak");
    expect(documentRef.elements.matchAtmosphere.classList.contains("is-streak")).toBe(true);
    expect(documentRef.elements.matchAtmosphereCopy.textContent).toBe("连扑压制 x4");
    expect(documentRef.elements.matchAtmosphereFill.style.width).toBe("86%");

    hud.update({ ...saveState, message: "goal", conceded: 4, streak: 0, lastSavePoints: 0 }, true);

    expect(documentRef.elements.matchAtmosphere.dataset.tone).toBe("danger");
    expect(documentRef.elements.matchAtmosphereCopy.textContent).toBe("防线吃紧 4/5");
    expect(documentRef.elements.matchAtmosphereFill.style.width).toBe("96%");

    hud.update({ ...saveState, message: "", timeLeft: 8, conceded: 2 }, true);

    expect(documentRef.elements.matchAtmosphere.dataset.tone).toBe("pressure");
    expect(documentRef.elements.matchAtmosphereCopy.textContent).toBe("最后守住 8s");
    expect(documentRef.elements.matchAtmosphereFill.style.width).toBe("72%");

    hud.update(createGameState(), true);

    expect(documentRef.elements.matchAtmosphere.classList.contains("is-visible")).toBe(false);
    expect(documentRef.elements.matchAtmosphereCopy.textContent).toBe("");
    expect(documentRef.elements.matchAtmosphereFill.style.width).toBe("0%");
  });

  it("skins the scorebug with match state without adding a center-blocking overlay", () => {
    expect(HudModule.getHudTonePlan).toBeTypeOf("function");
    const documentRef = createDocument();
    const hud = createHud(documentRef);
    const liveState = {
      ...createGameState(),
      running: true,
      paused: false,
      ended: false,
      message: "save",
      streak: 1,
      lastSavePoints: 110,
      conceded: 1,
      timeLeft: 42,
    };

    expect(HudModule.getHudTonePlan(liveState)).toMatchObject({
      marker: "match-state-scorebug-skin",
      tone: "save",
      intensity: "moment",
      blocksShotLane: false,
    });

    hud.update(liveState, true);

    expect(documentRef.elements.gameHud.dataset.hudSkinSystem).toBe("match-state-scorebug-skin");
    expect(documentRef.elements.gameHud.dataset.hudTone).toBe("save");
    expect(documentRef.elements.gameHud.dataset.hudIntensity).toBe("moment");
    expect(documentRef.elements.gameHud.classList.contains("is-save-tone")).toBe(true);
    expect(documentRef.elements.gameHud.classList.contains("is-streak-tone")).toBe(false);
    expect(documentRef.elements.stage.dataset.hudTone).toBe("save");
    expect(documentRef.elements.stage.dataset.hudSkinSystem).toBe("match-state-scorebug-skin");

    hud.update({ ...liveState, streak: 4, lastSavePoints: 190 }, true);

    expect(documentRef.elements.gameHud.dataset.hudTone).toBe("streak");
    expect(documentRef.elements.gameHud.dataset.hudIntensity).toBe("highlight");
    expect(documentRef.elements.gameHud.classList.contains("is-streak-tone")).toBe(true);
    expect(documentRef.elements.gameHud.classList.contains("is-save-tone")).toBe(false);

    hud.update({ ...liveState, message: "goal", conceded: 4, streak: 0, lastSavePoints: 0 }, true);

    expect(documentRef.elements.gameHud.dataset.hudTone).toBe("danger");
    expect(documentRef.elements.gameHud.dataset.hudIntensity).toBe("critical");
    expect(documentRef.elements.gameHud.classList.contains("is-danger-tone")).toBe(true);
    expect(documentRef.elements.gameHud.classList.contains("is-goal-tone")).toBe(false);

    hud.update({ ...liveState, message: "", conceded: 1, timeLeft: 8 }, true);

    expect(documentRef.elements.gameHud.dataset.hudTone).toBe("pressure");
    expect(documentRef.elements.gameHud.classList.contains("is-pressure-tone")).toBe(true);

    hud.update(createGameState(), true);

    expect(documentRef.elements.gameHud.dataset.hudTone).toBe("neutral");
    expect(documentRef.elements.gameHud.classList.contains("is-pressure-tone")).toBe(false);
    expect(documentRef.elements.stage.dataset.hudTone).toBe("neutral");
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

    hud.update(createGameState(), true);

    expect(documentRef.elements.matchProgress.classList.contains("is-visible")).toBe(false);
    expect(documentRef.elements.matchProgress.getAttribute("aria-hidden")).toBe("true");

    hud.update(state, true);

    expect(HudModule.getMatchProgressPercent(state)).toBe(51);
    expect(documentRef.elements.matchProgress.dataset.hudSystem).toBe("match-progress-hud");
    expect(documentRef.elements.matchProgress.classList.contains("is-visible")).toBe(true);
    expect(documentRef.elements.matchProgress.getAttribute("aria-hidden")).toBe("false");
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
    expect(documentRef.elements.pauseButton.textContent).toBe("▶");
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

  it("adds a three-part round review so the end screen gives useful next-round direction", () => {
    expect(HudModule.getResultReviewPlan).toBeTypeOf("function");
    const documentRef = createDocument();
    const hud = createHud(documentRef);
    const strongRound = {
      ...createGameState(),
      ended: true,
      score: 1120,
      saves: 8,
      conceded: 1,
      bestStreak: 5,
      endReason: "time",
    };
    const lostRound = {
      ...createGameState(),
      ended: true,
      score: 150,
      saves: 2,
      conceded: 5,
      bestStreak: 1,
      endReason: "conceded",
    };

    expect(HudModule.getResultReviewPlan(strongRound)).toEqual({
      marker: "round-result-review-cards",
      highlight: "连续扑救 x5",
      weakness: "远角别追太早",
      nextTarget: "困难练边角",
    });

    hud.update(strongRound, true);

    expect(documentRef.elements.resultReview.dataset.resultReviewSystem).toBe("round-result-review-cards");
    expect(documentRef.elements.finalHighlight.textContent).toBe("连续扑救 x5");
    expect(documentRef.elements.finalWeakness.textContent).toBe("远角别追太早");
    expect(documentRef.elements.finalNextTarget.textContent).toBe("困难练边角");

    hud.update(lostRound, true);

    expect(documentRef.elements.finalHighlight.textContent).toBe("完成 2 次扑救");
    expect(documentRef.elements.finalWeakness.textContent).toBe("中路保护不稳");
    expect(documentRef.elements.finalNextTarget.textContent).toBe("前 3 球守中路");
  });
});
