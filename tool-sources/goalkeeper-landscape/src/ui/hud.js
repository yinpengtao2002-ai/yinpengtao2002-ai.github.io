import { MAX_CONCEDED, ROUND_SECONDS } from "../config/game-config.js";

export const ROUND_RESULT_SUMMARY_MARKER = "round-result-summary";
export const HUD_FLOW_POLISH_MARKER = "match-hud-flow-polish";
export const MATCH_PRESSURE_HUD_MARKER = "match-pressure-hud";
export const MATCH_PROGRESS_HUD_MARKER = "match-progress-hud";
export const ROUND_RESULT_TAGS_MARKER = "round-result-performance-tags";
export const MATCH_AUDIO_STATUS_MARKER = "match-audio-status-chip";
export const MATCH_PAUSE_HINT_MARKER = "match-pause-coach-hint";
export const ROUND_RESULT_COACH_MARKER = "round-result-coach-note";
export const ROUND_RESULT_REVIEW_MARKER = "round-result-review-cards";
export const MATCH_EVENT_RIBBON_MARKER = "single-match-event-feedback-layer";
export const MATCH_CONTROL_RAIL_MARKER = "live-match-control-rail";
export const MATCH_ATMOSPHERE_MARKER = "match-atmosphere-event-rail";
export const HUD_STATE_SKIN_MARKER = "match-state-scorebug-skin";
const LOW_TIME_SECONDS = 10;

function getSecondsLeft(state) {
  return Math.max(0, Math.ceil(Number.isFinite(state?.timeLeft) ? state.timeLeft : 0));
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

export function getMatchProgressPercent(state) {
  var timeLeft = Number.isFinite(state?.timeLeft) ? state.timeLeft : ROUND_SECONDS;
  return Math.round((clamp(timeLeft, 0, ROUND_SECONDS) / ROUND_SECONDS) * 100);
}

export function getResultGrade(state) {
  var score = state?.score || 0;
  var bestStreak = state?.bestStreak || 0;
  var saves = state?.saves || 0;
  var conceded = state?.conceded || 0;

  if (score >= 1250 || (bestStreak >= 7 && conceded === 0)) return "S";
  if (score >= 700 || bestStreak >= 4 || (saves >= 7 && conceded <= 1)) return "A";
  if (score >= 320 || bestStreak >= 2 || saves >= 3) return "B";
  return "C";
}

export function getResultVerdictText(state) {
  var grade = getResultGrade(state);
  if (grade === "S") return "满分级守门，节奏完全掌控";
  if (grade === "A") return "反应很稳，已经有比赛手感";
  if (grade === "B") return "有几次关键扑救，继续稳住节奏";
  return "先守住中路，再去赌边角";
}

export function getResultSummaryText(state) {
  if (!state?.ended) return "";
  var bestStreak = state.bestStreak || 0;
  var saves = state.saves || 0;
  var conceded = state.conceded || 0;

  if (bestStreak >= 3) return "最佳连扑 x" + String(bestStreak) + "，手感在线";
  if (state.endReason === "conceded") return "再守一轮，先稳近角";
  if (conceded <= 1 && saves >= 5) return "扑救 " + String(saves) + " 次，防线很稳";
  if (saves > 0) return "扑救 " + String(saves) + " 次，继续提速";
  return "再来一局，读准球路";
}

export function getResultCoachText(state) {
  if (!state?.ended) return "";
  var grade = getResultGrade(state);
  var saves = state.saves || 0;
  var conceded = state.conceded || 0;
  var bestStreak = state.bestStreak || 0;

  if (grade === "S") return "下一局可以切到困难，练边角反应";
  if (state.endReason === "conceded" || conceded >= MAX_CONCEDED - 1) return "下一局先守中路，边角球再提前压手套";
  if (conceded <= 1 && saves >= 5) return "保持站位，下一局可以多赌远角";
  if (bestStreak >= 3) return "连扑节奏不错，继续提前读球路";
  return "下一局先等球过半，再做大幅移动";
}

export function getResultReviewPlan(state) {
  var grade = getResultGrade(state);
  var saves = state?.saves || 0;
  var conceded = state?.conceded || 0;
  var bestStreak = state?.bestStreak || 0;
  var highlight = bestStreak >= 3 ? "连续扑救 x" + String(bestStreak) : saves > 0 ? "完成 " + String(saves) + " 次扑救" : "先读第一脚球";
  var weakness =
    conceded >= MAX_CONCEDED - 1
      ? "中路保护不稳"
      : conceded <= 1 && saves >= 5
        ? "远角别追太早"
        : bestStreak >= 3
          ? "远角别追太早"
          : "出手再慢一点";
  var nextTarget =
    grade === "S" || grade === "A"
      ? "困难练边角"
      : state?.endReason === "conceded" || conceded >= MAX_CONCEDED - 1
        ? "前 3 球守中路"
        : "先完成 3 次扑救";

  return {
    marker: ROUND_RESULT_REVIEW_MARKER,
    highlight: highlight,
    weakness: weakness,
    nextTarget: nextTarget,
  };
}

export function getResultPerformanceTags(state) {
  var saves = state?.saves || 0;
  var conceded = state?.conceded || 0;
  var attempts = saves + conceded;
  var saveRate = attempts > 0 ? Math.round((saves / attempts) * 100) : 0;
  var control =
    conceded <= 1 && saves >= 3
      ? "压制"
      : conceded <= 2
        ? "稳住"
        : conceded >= MAX_CONCEDED - 1
          ? "吃紧"
          : "承压";
  var rhythm =
    (state?.bestStreak || 0) >= 3
      ? "连扑 x" + String(state.bestStreak)
      : saves >= 3
        ? "稳定"
        : saves > 0
          ? "启动"
          : "待机";

  return [
    { label: "扑救率", value: String(saveRate) + "%" },
    { label: "节奏", value: rhythm },
    { label: "失球控制", value: control },
  ];
}

export function getPressureCueText(state) {
  if (!state?.running || state.paused || state.ended) return "";

  var secondsLeft = getSecondsLeft(state);
  var lowTime = secondsLeft <= LOW_TIME_SECONDS;
  var matchPoint = (state.conceded || 0) >= MAX_CONCEDED - 1;

  if (lowTime && matchPoint) return "最后 10 秒 · 别再丢";
  if (lowTime) return "最后 10 秒";
  if (matchPoint) return "再丢一球结束";
  return "";
}

export function getMatchAtmospherePlan(state) {
  var empty = {
    visible: false,
    tone: "idle",
    label: "",
    detail: "",
    progress: 0,
    marker: MATCH_ATMOSPHERE_MARKER,
  };
  if (!state?.running || state.paused || state.ended) return empty;

  if (state.message === "save") {
    var points = Math.max(0, state.lastSavePoints || 0);
    if ((state.streak || 0) >= 3) {
      return {
        visible: true,
        tone: "streak",
        label: "连扑压制",
        detail: "x" + String(state.streak),
        progress: 86,
        marker: MATCH_ATMOSPHERE_MARKER,
      };
    }
    return {
      visible: true,
      tone: "save",
      label: "扑救成功",
      detail: "+" + String(points),
      progress: 62,
      marker: MATCH_ATMOSPHERE_MARKER,
    };
  }

  if (state.message === "goal") {
    var conceded = Math.max(0, state.conceded || 0);
    var danger = conceded >= MAX_CONCEDED - 1;
    return {
      visible: true,
      tone: danger ? "danger" : "goal",
      label: danger ? "防线吃紧" : "失球",
      detail: String(conceded) + "/" + String(MAX_CONCEDED),
      progress: danger ? 96 : 78,
      marker: MATCH_ATMOSPHERE_MARKER,
    };
  }

  if (state.message === "frame") {
    return {
      visible: true,
      tone: "frame",
      label: "门框救险",
      detail: "REBOUND",
      progress: 58,
      marker: MATCH_ATMOSPHERE_MARKER,
    };
  }

  if (state.message === "miss") {
    return {
      visible: true,
      tone: "miss",
      label: "偏出",
      detail: "RESET",
      progress: 42,
      marker: MATCH_ATMOSPHERE_MARKER,
    };
  }

  var secondsLeft = getSecondsLeft(state);
  if (secondsLeft <= LOW_TIME_SECONDS) {
    return {
      visible: true,
      tone: "pressure",
      label: "最后守住",
      detail: String(secondsLeft) + "s",
      progress: 72,
      marker: MATCH_ATMOSPHERE_MARKER,
    };
  }

  return empty;
}

export function getHudTonePlan(state) {
  var neutral = {
    marker: HUD_STATE_SKIN_MARKER,
    tone: "neutral",
    intensity: "ambient",
    blocksShotLane: false,
  };
  if (!state?.running || state.paused || state.ended) return neutral;

  if (state.message === "save") {
    if ((state.streak || 0) >= 3) {
      return {
        marker: HUD_STATE_SKIN_MARKER,
        tone: "streak",
        intensity: "highlight",
        blocksShotLane: false,
      };
    }
    return {
      marker: HUD_STATE_SKIN_MARKER,
      tone: "save",
      intensity: "moment",
      blocksShotLane: false,
    };
  }

  if (state.message === "goal") {
    var conceded = Math.max(0, state.conceded || 0);
    var danger = conceded >= MAX_CONCEDED - 1;
    return {
      marker: HUD_STATE_SKIN_MARKER,
      tone: danger ? "danger" : "goal",
      intensity: danger ? "critical" : "high",
      blocksShotLane: false,
    };
  }

  var secondsLeft = getSecondsLeft(state);
  var pressure = secondsLeft <= LOW_TIME_SECONDS || (state.conceded || 0) >= MAX_CONCEDED - 1;
  if (pressure) {
    return {
      marker: HUD_STATE_SKIN_MARKER,
      tone: "pressure",
      intensity: "pressure",
      blocksShotLane: false,
    };
  }

  return neutral;
}

export function getEventRibbonPlan(state) {
  var empty = {
    visible: false,
    tone: "idle",
    priority: "ambient",
    kicker: "",
    text: "",
    ariaLabel: "",
    marker: MATCH_EVENT_RIBBON_MARKER,
  };
  if (!state?.running || state.paused || state.ended) return empty;

  if (state.message === "save") {
    var points = Math.max(0, state.lastSavePoints || 0);
    if ((state.streak || 0) >= 3) {
      return {
        visible: true,
        tone: "streak",
        priority: "highlight",
        kicker: "连扑 x" + String(state.streak),
        text: "+" + String(points),
        ariaLabel: "连续扑救 " + String(state.streak) + " 次，加 " + String(points) + " 分",
        marker: MATCH_EVENT_RIBBON_MARKER,
      };
    }
    return {
      visible: true,
      tone: "save",
      priority: "core",
      kicker: "扑救",
      text: "+" + String(points),
      ariaLabel: "扑救成功，加 " + String(points) + " 分",
      marker: MATCH_EVENT_RIBBON_MARKER,
    };
  }

  if (state.message === "goal") {
    var conceded = Math.max(0, state.conceded || 0);
    var danger = conceded >= MAX_CONCEDED - 1;
    return {
      visible: true,
      tone: danger ? "danger" : "goal",
      priority: danger ? "critical" : "high",
      kicker: danger ? "危险" : "失球",
      text: String(conceded) + "/" + String(MAX_CONCEDED),
      ariaLabel: danger
        ? "防线吃紧，失球 " + String(conceded) + "/" + String(MAX_CONCEDED)
        : "失球 " + String(conceded) + "/" + String(MAX_CONCEDED),
      marker: MATCH_EVENT_RIBBON_MARKER,
    };
  }

  if (state.message === "frame") {
    return {
      visible: true,
      tone: "frame",
      priority: "core",
      kicker: "门框",
      text: "",
      ariaLabel: "门框救险",
      marker: MATCH_EVENT_RIBBON_MARKER,
    };
  }

  if (state.message === "miss") {
    return {
      visible: true,
      tone: "miss",
      priority: "ambient",
      kicker: "偏出",
      text: "",
      ariaLabel: "射门偏出",
      marker: MATCH_EVENT_RIBBON_MARKER,
    };
  }

  return empty;
}

export function getPauseHintText(state) {
  var secondsLeft = getSecondsLeft(state);
  var conceded = state?.conceded || 0;
  var streak = state?.streak || 0;

  if (secondsLeft <= LOW_TIME_SECONDS && conceded >= MAX_CONCEDED - 1) return "最后几秒，先守中路";
  if (secondsLeft <= LOW_TIME_SECONDS) return "最后几秒，手套别追太远";
  if (conceded >= MAX_CONCEDED - 1) return "再丢一球结束，优先守近角";
  if (streak >= 3) return "连扑手感在线，继续压近角";
  return "先盯球速，再移动手套";
}

export function getSoundStatusLabel(enabled, audioStatus = "locked") {
  if (!enabled || audioStatus === "muted") {
    return {
      button: "",
      detail: "当前静音",
      aria: "音效已静音，点击开启",
      status: "muted",
    };
  }

  if (audioStatus === "ready") {
    return {
      button: "",
      detail: "音效已就绪",
      aria: "音效已就绪，点击静音",
      status: "ready",
    };
  }

  if (audioStatus === "unavailable") {
    return {
      button: "",
      detail: "此浏览器不支持音效",
      aria: "当前浏览器不支持音效",
      status: "unavailable",
    };
  }

  return {
    button: "",
    detail: "点开始后启用音效",
    aria: "音效待启用，开始挑战后会解锁",
    status: "locked",
  };
}

export function createHud(documentRef) {
  var refs = {
    stage: documentRef.getElementById("stage"),
    gameHud: documentRef.getElementById("gameHud"),
    scoreValue: documentRef.getElementById("scoreValue"),
    timeValue: documentRef.getElementById("timeValue"),
    streakValue: documentRef.getElementById("streakValue"),
    concededValue: documentRef.getElementById("concededValue"),
    pauseButton: documentRef.getElementById("pauseButton"),
    soundButton: documentRef.getElementById("soundButton"),
    soundStatus: documentRef.getElementById("soundStatus"),
    startButton: documentRef.getElementById("startButton"),
    restartButton: documentRef.getElementById("restartButton"),
    pauseResumeButton: documentRef.getElementById("pauseResumeButton"),
    difficultyButtons: Array.from(documentRef.querySelectorAll?.("[data-difficulty]") || []),
    startOverlay: documentRef.getElementById("startOverlay"),
    pauseOverlay: documentRef.getElementById("pauseOverlay"),
    endOverlay: documentRef.getElementById("endOverlay"),
    pauseHint: documentRef.getElementById("pauseHint"),
    finalScore: documentRef.getElementById("finalScore"),
    resultGrade: documentRef.getElementById("resultGrade"),
    resultReason: documentRef.getElementById("resultReason"),
    resultVerdict: documentRef.getElementById("resultVerdict"),
    resultSummary: documentRef.getElementById("resultSummary"),
    resultCoach: documentRef.getElementById("resultCoach"),
    resultReview: documentRef.getElementById("resultReview"),
    finalHighlight: documentRef.getElementById("finalHighlight"),
    finalWeakness: documentRef.getElementById("finalWeakness"),
    finalNextTarget: documentRef.getElementById("finalNextTarget"),
    feedbackToast: documentRef.getElementById("feedbackToast"),
    eventRibbon: documentRef.getElementById("eventRibbon"),
    matchAtmosphere: documentRef.getElementById("matchAtmosphere"),
    matchAtmosphereFill: documentRef.getElementById("matchAtmosphereFill"),
    matchAtmosphereCopy: documentRef.getElementById("matchAtmosphereCopy"),
    matchStatus: documentRef.getElementById("matchStatus"),
    pressureCue: documentRef.getElementById("pressureCue"),
    matchProgress: documentRef.getElementById("matchProgress"),
    matchProgressFill: documentRef.getElementById("matchProgressFill"),
    bottomControls: documentRef.getElementById("bottomControls"),
    finalSaves: documentRef.getElementById("finalSaves"),
    finalBestStreak: documentRef.getElementById("finalBestStreak"),
    finalConceded: documentRef.getElementById("finalConceded"),
    resultTags: documentRef.getElementById("resultTags"),
    finalSaveRate: documentRef.getElementById("finalSaveRate"),
    finalRhythmTag: documentRef.getElementById("finalRhythmTag"),
    finalControlTag: documentRef.getElementById("finalControlTag"),
  };

  function setVisible(element, visible) {
    if (element) element.classList.toggle("hidden", !visible);
  }

  function setClass(element, className, enabled) {
    if (element) element.classList.toggle(className, enabled);
  }

  function updateHudTone(state) {
    var plan = getHudTonePlan(state);
    var toneClasses = ["neutral", "save", "streak", "goal", "danger", "pressure"];

    if (refs.gameHud) {
      refs.gameHud.dataset.hudSkinSystem = plan.marker;
      refs.gameHud.dataset.hudTone = plan.tone;
      refs.gameHud.dataset.hudIntensity = plan.intensity;
      refs.gameHud.dataset.blocksShotLane = plan.blocksShotLane ? "true" : "false";
      toneClasses.forEach((tone) => {
        setClass(refs.gameHud, "is-" + tone + "-tone", plan.tone === tone);
      });
    }

    if (refs.stage) {
      refs.stage.dataset.hudSkinSystem = plan.marker;
      refs.stage.dataset.hudTone = plan.tone;
      refs.stage.dataset.hudIntensity = plan.intensity;
    }
  }

  function updateFeedback(state) {
    var toast = refs.feedbackToast;
    var message = state.message;
    var isSave = message === "save";
    var isGoal = message === "goal";
    var isStreak = isSave && (state.streak || 0) >= 3;
    var visible = isSave;

    if (toast) {
      toast.textContent = visible ? (isStreak ? "连扑 " : "") + "+" + String(state.lastSavePoints || 0) : "";
      setClass(toast, "is-visible", visible);
      setClass(toast, "is-save", isSave);
      setClass(toast, "is-goal", false);
      setClass(toast, "is-frame", false);
      setClass(toast, "is-miss", false);
      setClass(toast, "is-streak", isStreak);
    }

    setClass(refs.streakValue, "is-hot", (state.streak || 0) >= 3);
    setClass(refs.scoreValue, "is-score-pulse", isSave);
    setClass(refs.streakValue, "is-streak-pop", isStreak);
    setClass(refs.concededValue, "is-danger-pulse", isGoal);
  }

  function updateEventRibbon(state) {
    var ribbon = refs.eventRibbon;
    if (!ribbon) return;

    var plan = getEventRibbonPlan(state);
    ribbon.dataset.hudSystem = plan.marker;
    ribbon.dataset.tone = plan.tone;
    ribbon.dataset.priority = plan.priority;
    ribbon.setAttribute("aria-label", plan.ariaLabel || "");
    if (plan.visible) ribbon.textContent = (plan.kicker + " " + plan.text).trim();
    setClass(ribbon, "is-visible", plan.visible);
    ["save", "streak", "goal", "danger", "frame", "miss"].forEach((tone) => {
      setClass(ribbon, "is-" + tone, plan.visible && plan.tone === tone);
    });
  }

  function updateMatchAtmosphere(state) {
    var rail = refs.matchAtmosphere;
    var fill = refs.matchAtmosphereFill;
    var copy = refs.matchAtmosphereCopy;
    var plan = getMatchAtmospherePlan(state);
    var copyText = plan.visible ? (plan.label + " " + plan.detail).trim() : "";

    if (rail) {
      rail.dataset.hudSystem = plan.marker;
      rail.dataset.tone = plan.tone;
      setClass(rail, "is-visible", plan.visible);
      ["save", "streak", "goal", "danger", "frame", "miss", "pressure"].forEach((tone) => {
        setClass(rail, "is-" + tone, plan.visible && plan.tone === tone);
      });
    }

    if (copy) copy.textContent = copyText;
    if (fill) fill.style.width = String(plan.progress || 0) + "%";
  }

  function getResultReasonText(endReason) {
    if (endReason === "conceded") return "失球过多";
    if (endReason === "time") return "时间到";
    return "挑战结束";
  }

  function updateMatchStatus(state, context) {
    var status = refs.matchStatus;
    var roundIntroCue = context?.roundIntroCue || { visible: false, label: "" };
    var isPaused = state.running && state.paused && !state.ended;
    var isCountdown = !isPaused && roundIntroCue.visible;
    var visible = isPaused || isCountdown;

    if (!status) return;

    status.textContent = isPaused ? "暂停" : isCountdown ? roundIntroCue.label : "";
    setClass(status, "is-visible", visible);
    setClass(status, "is-paused", isPaused);
    setClass(status, "is-countdown", isCountdown);
  }

  function updatePressureCue(state) {
    var cue = refs.pressureCue;
    var secondsLeft = getSecondsLeft(state);
    var lowTime = state.running && !state.paused && !state.ended && secondsLeft <= LOW_TIME_SECONDS;
    var matchPoint = state.running && !state.paused && !state.ended && (state.conceded || 0) >= MAX_CONCEDED - 1;
    var cueText = getPressureCueText(state);

    if (refs.timeValue) {
      setClass(refs.timeValue, "is-low-time", lowTime);
      refs.timeValue.setAttribute(
        "aria-label",
        lowTime ? "剩余 " + String(secondsLeft) + " 秒，最后 10 秒" : "剩余 " + String(secondsLeft) + " 秒",
      );
    }

    if (refs.concededValue) {
      setClass(refs.concededValue, "is-match-point", matchPoint);
      refs.concededValue.setAttribute(
        "aria-label",
        "失球 " + String(state.conceded || 0) + "/" + String(MAX_CONCEDED) + (matchPoint ? "，再丢一球结束" : ""),
      );
    }

    if (cue) {
      cue.textContent = cueText;
      cue.dataset.hudSystem = MATCH_PRESSURE_HUD_MARKER;
      setClass(cue, "is-visible", Boolean(cueText));
      setClass(cue, "is-low-time", lowTime);
      setClass(cue, "is-match-point", matchPoint);
    }
  }

  function updateMatchProgress(state) {
    var progress = refs.matchProgress;
    var fill = refs.matchProgressFill;
    var secondsLeft = getSecondsLeft(state);
    var percent = getMatchProgressPercent(state);
    var liveVisible = state.running && !state.ended;
    var lowTime = state.running && !state.paused && !state.ended && secondsLeft <= LOW_TIME_SECONDS;
    var matchPoint = state.running && !state.paused && !state.ended && (state.conceded || 0) >= MAX_CONCEDED - 1;
    var text = "剩余 " + String(secondsLeft) + " 秒";

    if (progress) {
      progress.dataset.hudSystem = MATCH_PROGRESS_HUD_MARKER;
      progress.setAttribute("aria-valuemin", "0");
      progress.setAttribute("aria-valuemax", String(ROUND_SECONDS));
      progress.setAttribute("aria-valuenow", String(secondsLeft));
      progress.setAttribute("aria-valuetext", text);
      progress.setAttribute("aria-label", text);
      progress.setAttribute("aria-hidden", liveVisible ? "false" : "true");
      setClass(progress, "is-visible", liveVisible);
      setClass(progress, "is-low-time", lowTime);
      setClass(progress, "is-match-point", matchPoint);
    }

    if (fill) {
      fill.style.width = String(percent) + "%";
    }
  }

  function updateControlRail(state) {
    var controlMode = state.ended ? "result" : state.running ? "live" : "setup";
    var isLive = controlMode === "live";

    if (refs.bottomControls) {
      refs.bottomControls.dataset.controlMode = controlMode;
      refs.bottomControls.dataset.controlRailSystem = MATCH_CONTROL_RAIL_MARKER;
      refs.bottomControls.classList.toggle("is-live-compact", isLive);
    }

    refs.difficultyButtons.forEach((button) => {
      button.disabled = isLive;
      button.setAttribute("aria-disabled", isLive ? "true" : "false");
    });

    setVisible(refs.pauseButton, isLive);
    if (refs.pauseButton) refs.pauseButton.disabled = !isLive;
    if (refs.soundButton) refs.soundButton.disabled = false;
  }

  return {
    refs,
    bind(actions) {
      refs.startButton?.addEventListener("click", actions.onStart);
      refs.restartButton?.addEventListener("click", actions.onRestart);
      refs.pauseButton?.addEventListener("click", actions.onPause);
      refs.pauseResumeButton?.addEventListener("click", actions.onPause);
      refs.soundButton?.addEventListener("click", actions.onSound);
      refs.difficultyButtons.forEach((button) => {
        button.addEventListener("click", () => actions.onDifficulty?.(button.dataset.difficulty));
      });
    },
    updateDifficulty(selectedDifficulty) {
      refs.difficultyButtons.forEach((button) => {
        var active = button.dataset.difficulty === selectedDifficulty;
        button.classList.toggle("is-active", active);
        button.setAttribute("aria-pressed", active ? "true" : "false");
      });
    },
    update(state, soundEnabled, context = {}) {
      if (refs.scoreValue) refs.scoreValue.textContent = String(state.score);
      if (refs.timeValue) refs.timeValue.textContent = String(getSecondsLeft(state));
      if (refs.streakValue) refs.streakValue.textContent = "x" + String(state.streak || 0);
      if (refs.concededValue) refs.concededValue.textContent = state.conceded + "/" + MAX_CONCEDED;
      if (refs.pauseButton) {
        refs.pauseButton.textContent = state.paused ? "▶" : "Ⅱ";
        refs.pauseButton.setAttribute("aria-label", state.paused ? "继续挑战" : "暂停挑战");
      }
      if (refs.soundButton) {
        var soundLabel = getSoundStatusLabel(soundEnabled, context.audioStatus || (soundEnabled ? "locked" : "muted"));
        refs.soundButton.textContent = soundLabel.button;
        refs.soundButton.setAttribute("aria-label", soundLabel.aria);
        refs.soundButton.dataset.soundStatus = soundLabel.status;
        ["locked", "ready", "muted", "unavailable"].forEach((status) => {
          setClass(refs.soundButton, "is-sound-" + status, soundLabel.status === status);
        });
        if (refs.soundStatus) {
          refs.soundStatus.textContent = soundLabel.detail;
          refs.soundStatus.dataset.audioStatusSystem = MATCH_AUDIO_STATUS_MARKER;
          refs.soundStatus.dataset.soundStatus = soundLabel.status;
        }
      }
      if (refs.finalScore) refs.finalScore.textContent = String(state.score);
      if (refs.resultGrade) {
        var grade = getResultGrade(state);
        refs.resultGrade.textContent = grade + "级";
        refs.resultGrade.dataset.grade = grade;
      }
      if (refs.resultReason) refs.resultReason.textContent = getResultReasonText(state.endReason);
      if (refs.resultVerdict) refs.resultVerdict.textContent = getResultVerdictText(state);
      if (refs.resultSummary) {
        refs.resultSummary.textContent = getResultSummaryText(state);
        refs.resultSummary.dataset.summarySystem = ROUND_RESULT_SUMMARY_MARKER;
      }
      if (refs.resultCoach) {
        refs.resultCoach.textContent = getResultCoachText(state);
        refs.resultCoach.dataset.resultCoachSystem = ROUND_RESULT_COACH_MARKER;
      }
      var resultReview = getResultReviewPlan(state);
      if (refs.resultReview) refs.resultReview.dataset.resultReviewSystem = resultReview.marker;
      if (refs.finalHighlight) refs.finalHighlight.textContent = resultReview.highlight;
      if (refs.finalWeakness) refs.finalWeakness.textContent = resultReview.weakness;
      if (refs.finalNextTarget) refs.finalNextTarget.textContent = resultReview.nextTarget;
      if (refs.pauseHint) {
        refs.pauseHint.textContent = getPauseHintText(state);
        refs.pauseHint.dataset.pauseHintSystem = MATCH_PAUSE_HINT_MARKER;
      }
      if (refs.startOverlay) refs.startOverlay.dataset.uiSystem = HUD_FLOW_POLISH_MARKER;
      if (refs.finalSaves) refs.finalSaves.textContent = String(state.saves || 0);
      if (refs.finalBestStreak) refs.finalBestStreak.textContent = "x" + String(state.bestStreak || 0);
      if (refs.finalConceded) refs.finalConceded.textContent = state.conceded + "/" + MAX_CONCEDED;
      if (refs.resultTags) refs.resultTags.dataset.resultTagsSystem = ROUND_RESULT_TAGS_MARKER;
      var resultTags = getResultPerformanceTags(state);
      if (refs.finalSaveRate) refs.finalSaveRate.textContent = resultTags[0].value;
      if (refs.finalRhythmTag) refs.finalRhythmTag.textContent = resultTags[1].value;
      if (refs.finalControlTag) refs.finalControlTag.textContent = resultTags[2].value;
      updateHudTone(state);
      updateFeedback(state);
      updateEventRibbon(state);
      updateMatchAtmosphere(state);
      updateMatchStatus(state, context);
      updatePressureCue(state);
      updateMatchProgress(state);
      updateControlRail(state);
      setVisible(refs.startOverlay, !state.running && !state.ended);
      setVisible(refs.pauseOverlay, state.running && state.paused && !state.ended);
      setVisible(refs.endOverlay, state.ended);
    },
  };
}
