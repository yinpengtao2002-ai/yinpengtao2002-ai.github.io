import { MAX_CONCEDED, ROUND_SECONDS } from "../config/game-config.js";
import { drawGloveImpactReview, getGloveImpactReviewCopy } from "../game/glove-impact-review.js";

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
  if (state?.mode === "penalty") {
    if (state.shootout?.suddenDeath) return 100;
    var completedPairs = Math.min(state.shootout?.teamKicks?.length || 0, state.shootout?.opponentKicks?.length || 0);
    return Math.round((clamp(completedPairs, 0, 5) / 5) * 100);
  }
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
  if (state.mode === "penalty") return state.shootout?.phase === "team-kick" ? "我方罚球" : "准备扑救";

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

  if (state.mode === "penalty" && state.message === "goal") {
    return {
      visible: true,
      tone: "goal",
      label: "对手罚进",
      detail: String(state.shootout?.teamGoals || 0) + ":" + String(state.shootout?.opponentGoals || 0),
      progress: 78,
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

  if (state.message === "team-goal" || state.message === "team-miss") {
    return {
      visible: true,
      tone: state.message === "team-goal" ? "save" : "miss",
      label: state.message === "team-goal" ? "我方罚进" : "我方未进",
      detail: state.shootout ? String(state.shootout.teamGoals) + ":" + String(state.shootout.opponentGoals) : "",
      progress: state.message === "team-goal" ? 72 : 46,
      marker: MATCH_ATMOSPHERE_MARKER,
    };
  }

  if (state.mode === "penalty") return empty;

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

  if (state.mode === "penalty" && state.message === "goal") {
    return {
      marker: HUD_STATE_SKIN_MARKER,
      tone: "goal",
      intensity: "high",
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

  if (state.mode === "penalty") return neutral;

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

  if (state.mode === "penalty" && state.message === "goal") {
    var teamGoals = state.shootout?.teamGoals || 0;
    var opponentGoals = state.shootout?.opponentGoals || 0;
    return {
      visible: true,
      tone: "goal",
      priority: "high",
      kicker: "对手罚进",
      text: String(teamGoals) + ":" + String(opponentGoals),
      ariaLabel: "对手点球罚进，比分 " + String(teamGoals) + " 比 " + String(opponentGoals),
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

  if (state.message === "team-goal" || state.message === "team-miss") {
    var isTeamGoal = state.message === "team-goal";
    return {
      visible: true,
      tone: isTeamGoal ? "save" : "miss",
      priority: "core",
      kicker: isTeamGoal ? "我方罚进" : "我方未进",
      text: state.shootout ? String(state.shootout.teamGoals) + ":" + String(state.shootout.opponentGoals) : "",
      ariaLabel: isTeamGoal ? "我方点球罚进" : "我方点球未进",
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
      detail: "音乐与音效已静音",
      aria: "音乐与音效已静音，点击开启",
      status: "muted",
    };
  }

  if (audioStatus === "ready") {
    return {
      button: "",
      detail: "音乐与音效已就绪",
      aria: "音乐与音效已就绪，点击静音",
      status: "ready",
    };
  }

  if (audioStatus === "unavailable") {
    return {
      button: "",
      detail: "此浏览器不支持游戏音频",
      aria: "当前浏览器不支持游戏音频",
      status: "unavailable",
    };
  }

  return {
    button: "",
    detail: "点开始后启用音乐与音效",
    aria: "音乐与音效待启用，开始挑战后会解锁",
    status: "locked",
  };
}

const PENALTY_MARK_WINDOW = 5;

function formatPenaltyMarks(kicks, startIndex) {
  return Array.from({ length: PENALTY_MARK_WINDOW }, (_, index) => {
    var result = kicks[startIndex + index];
    if (result === "goal") return "●";
    if (result === "miss") return "×";
    return "·";
  }).join(" ");
}

export function getPenaltyHudPlan(state) {
  var shootout = state?.shootout;
  if (state?.mode !== "penalty" || !shootout) {
    return {
      visible: false,
      teamMarks: "",
      opponentMarks: "",
      teamScore: 0,
      opponentScore: 0,
      scoreText: "0 : 0",
      roundLabel: "",
      phaseLabel: "",
    };
  }

  var latestKickCount = Math.max(shootout.teamKicks?.length || 0, shootout.opponentKicks?.length || 0);
  var markStartIndex = Math.max(0, latestKickCount - PENALTY_MARK_WINDOW);
  var teamScore = shootout.teamGoals || 0;
  var opponentScore = shootout.opponentGoals || 0;
  return {
    visible: true,
    teamMarks: formatPenaltyMarks(shootout.teamKicks || [], markStartIndex),
    opponentMarks: formatPenaltyMarks(shootout.opponentKicks || [], markStartIndex),
    teamScore,
    opponentScore,
    scoreText: String(teamScore) + " : " + String(opponentScore),
    roundLabel: (shootout.suddenDeath ? "骤死 " : "") + "第 " + String(shootout.round || 1) + " 轮",
    phaseLabel: shootout.ended
      ? shootout.winner === "team" ? "我方胜" : "对手胜"
      : shootout.phase === "team-kick" ? "我方罚球" : "准备扑救",
  };
}

export function getPenaltyResultPlan(state) {
  var shootout = state?.shootout;
  var won = shootout?.winner === "team";
  var round = shootout?.round || Math.max(shootout?.teamKicks?.length || 0, shootout?.opponentKicks?.length || 0, 1);
  var teamGoals = shootout?.teamGoals || 0;
  var opponentGoals = shootout?.opponentGoals || 0;
  return {
    grade: won ? "胜" : "负",
    gradeTone: won ? "S" : "C",
    reason: won ? "点球大战胜利" : "点球大战惜败",
    score: String(teamGoals) + ":" + String(opponentGoals),
    verdict: won ? "扑出关键点球，拿下比赛" : "差一个身位，再战一轮",
    summary: shootout?.suddenDeath
      ? "骤死第 " + String(round) + " 轮决出胜负"
      : "常规点球 " + String(teamGoals) + ":" + String(opponentGoals),
    coach: won ? "极难球路守住了，下一局继续读远角" : "先稳住中路，等发球动作结束再扑",
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
    saveAssistSwitch: documentRef.getElementById("saveAssistSwitch"),
    soundStatus: documentRef.getElementById("soundStatus"),
    startButton: documentRef.getElementById("startButton"),
    restartButton: documentRef.getElementById("restartButton"),
    pauseResumeButton: documentRef.getElementById("pauseResumeButton"),
    difficultyButtons: Array.from(documentRef.querySelectorAll?.("[data-difficulty]") || []),
    modeButtons: Array.from(documentRef.querySelectorAll?.("[data-mode]") || []),
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
    finalSavesLabel: documentRef.getElementById("finalSavesLabel"),
    finalBestStreakLabel: documentRef.getElementById("finalBestStreakLabel"),
    finalConcededLabel: documentRef.getElementById("finalConcededLabel"),
    scoreLabel: documentRef.getElementById("scoreLabel"),
    timeLabel: documentRef.getElementById("timeLabel"),
    streakLabel: documentRef.getElementById("streakLabel"),
    concededLabel: documentRef.getElementById("concededLabel"),
    startKicker: documentRef.getElementById("startKicker"),
    startTitle: documentRef.getElementById("startTitle"),
    startRuleA: documentRef.getElementById("startRuleA"),
    startRuleB: documentRef.getElementById("startRuleB"),
    startRuleC: documentRef.getElementById("startRuleC"),
    startButtonLabel: documentRef.getElementById("startButtonLabel"),
    penaltyScoreboard: documentRef.getElementById("penaltyScoreboard"),
    penaltyTeamKicks: documentRef.getElementById("penaltyTeamKicks"),
    penaltyOpponentKicks: documentRef.getElementById("penaltyOpponentKicks"),
    penaltyTeamScore: documentRef.getElementById("penaltyTeamScore"),
    penaltyOpponentScore: documentRef.getElementById("penaltyOpponentScore"),
    penaltyRoundLabel: documentRef.getElementById("penaltyRoundLabel"),
    penaltyPhaseLabel: documentRef.getElementById("penaltyPhaseLabel"),
    penaltyAnnouncement: documentRef.getElementById("penaltyAnnouncement"),
    penaltyRoundBreak: documentRef.getElementById("penaltyRoundBreak"),
    penaltyRoundBreakLabel: documentRef.getElementById("penaltyRoundBreakLabel"),
    penaltyRoundBreakScore: documentRef.getElementById("penaltyRoundBreakScore"),
    penaltyRoundBreakDetail: documentRef.getElementById("penaltyRoundBreakDetail"),
    gloveImpactReview: documentRef.getElementById("gloveImpactReview"),
    gloveImpactCanvas: documentRef.getElementById("gloveImpactCanvas"),
    gloveImpactResult: documentRef.getElementById("gloveImpactResult"),
    gloveImpactDetail: documentRef.getElementById("gloveImpactDetail"),
  };
  var eventDisposers = [];

  function bindEvent(element, name, listener) {
    if (!element || typeof listener !== "function") return;
    element.addEventListener(name, listener);
    eventDisposers.push(() => element.removeEventListener(name, listener));
  }

  function disposeBindings() {
    eventDisposers.splice(0).forEach((dispose) => dispose());
  }

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
    var isPenaltyCountdown = isCountdown && state.mode === "penalty" && Boolean(roundIntroCue.kicker);
    var visible = isPaused || isCountdown;

    if (!status) return;

    status.textContent = isPaused
      ? "暂停"
      : isPenaltyCountdown
        ? roundIntroCue.kicker + " · " + roundIntroCue.label
        : isCountdown ? roundIntroCue.label : "";
    status.setAttribute("aria-label", isPenaltyCountdown ? roundIntroCue.ariaLabel || status.textContent : status.textContent);
    setClass(status, "is-visible", visible);
    setClass(status, "is-paused", isPaused);
    setClass(status, "is-countdown", isCountdown);
    setClass(status, "is-penalty-countdown", isPenaltyCountdown);
  }

  function updatePressureCue(state) {
    var cue = refs.pressureCue;
    var secondsLeft = getSecondsLeft(state);
    var timedMode = state.mode !== "penalty";
    var lowTime = timedMode && state.running && !state.paused && !state.ended && secondsLeft <= LOW_TIME_SECONDS;
    var matchPoint = timedMode && state.running && !state.paused && !state.ended && (state.conceded || 0) >= MAX_CONCEDED - 1;
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
    var isPenalty = state.mode === "penalty";
    var penaltyPlan = getPenaltyHudPlan(state);
    var text = isPenalty ? penaltyPlan.roundLabel + " " + penaltyPlan.phaseLabel : "剩余 " + String(secondsLeft) + " 秒";

    if (progress) {
      progress.dataset.hudSystem = MATCH_PROGRESS_HUD_MARKER;
      progress.setAttribute("aria-valuemin", "0");
      progress.setAttribute("aria-valuemax", isPenalty ? "5" : String(ROUND_SECONDS));
      progress.setAttribute("aria-valuenow", isPenalty ? String(Math.min(5, state.shootout?.teamKicks?.length || 0)) : String(secondsLeft));
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
    refs.modeButtons.forEach((button) => {
      button.disabled = isLive;
      button.setAttribute("aria-disabled", isLive ? "true" : "false");
    });
    if (refs.saveAssistSwitch) {
      refs.saveAssistSwitch.disabled = isLive;
      refs.saveAssistSwitch.setAttribute("aria-disabled", isLive ? "true" : "false");
    }

    setVisible(refs.pauseButton, isLive);
    if (refs.pauseButton) refs.pauseButton.disabled = !isLive;
    if (refs.soundButton) refs.soundButton.disabled = false;
  }

  function updateGloveImpactReview(review) {
    var panel = refs.gloveImpactReview;
    if (!panel) return;
    var visible = Boolean(review?.visible);
    var copy = getGloveImpactReviewCopy(review);
    var hasImpact = Boolean(review?.impact);

    panel.dataset.result = review?.result || "";
    panel.dataset.hasImpact = hasImpact ? "true" : "false";
    panel.setAttribute("aria-label", visible ? "上球触点，" + copy.result + "，" + copy.detail : "");
    setClass(panel, "is-visible", visible);
    setClass(panel, "is-save", review?.result === "save");
    setClass(panel, "is-goal", review?.result === "goal");
    if (refs.gloveImpactResult) refs.gloveImpactResult.textContent = visible ? copy.result : "";
    if (refs.gloveImpactDetail) refs.gloveImpactDetail.textContent = visible ? copy.detail : "";
    if (refs.gloveImpactCanvas) drawGloveImpactReview(refs.gloveImpactCanvas, review);
  }

  return {
    refs,
    bind(actions) {
      disposeBindings();
      bindEvent(refs.startButton, "click", actions.onStart);
      bindEvent(refs.restartButton, "click", actions.onRestart);
      bindEvent(refs.pauseButton, "click", actions.onPause);
      bindEvent(refs.pauseResumeButton, "click", actions.onPause);
      bindEvent(refs.soundButton, "click", actions.onSound);
      bindEvent(refs.saveAssistSwitch, "click", () => {
        actions.onAssist?.(refs.saveAssistSwitch.getAttribute("aria-checked") !== "true");
      });
      refs.difficultyButtons.forEach((button) => {
        bindEvent(button, "click", () => actions.onDifficulty?.(button.dataset.difficulty));
      });
      refs.modeButtons.forEach((button) => {
        bindEvent(button, "click", () => actions.onMode?.(button.dataset.mode));
      });
    },
    dispose: disposeBindings,
    updateMode(selectedMode) {
      var penaltyMode = selectedMode === "penalty";
      if (refs.stage) refs.stage.dataset.mode = penaltyMode ? "penalty" : "timed";
      refs.modeButtons.forEach((button) => {
        var active = button.dataset.mode === selectedMode;
        button.classList.toggle("is-active", active);
        button.setAttribute("aria-pressed", active ? "true" : "false");
      });
      refs.difficultyButtons.forEach((button) => {
        var difficulty = button.dataset.difficulty;
        var available = penaltyMode
          ? difficulty === "hard" || difficulty === "extreme"
          : difficulty !== "extreme";
        setClass(button, "hidden", !available);
        if (difficulty === "hard") button.textContent = penaltyMode ? "标准" : "困难";
        if (difficulty === "extreme") button.textContent = penaltyMode ? "极限" : "极难";
      });
      if (refs.startKicker) refs.startKicker.textContent = penaltyMode ? "点球模式" : "经典模式";
      if (refs.startTitle) refs.startTitle.textContent = penaltyMode ? "点球大战" : "守住球门";
      if (refs.startRuleA) refs.startRuleA.textContent = penaltyMode ? "五轮对决" : "限时 60 秒";
      if (refs.startRuleB) refs.startRuleB.textContent = penaltyMode ? "轮流罚球" : "失 5 球结束";
      if (refs.startRuleC) refs.startRuleC.textContent = penaltyMode ? "平局决胜" : "连扑加分";
      if (refs.startButtonLabel) refs.startButtonLabel.textContent = "开始比赛";
      if (refs.startButton) refs.startButton.setAttribute("aria-label", "开始比赛");
    },
    updateDifficulty(selectedDifficulty) {
      refs.difficultyButtons.forEach((button) => {
        var active = button.dataset.difficulty === selectedDifficulty;
        button.classList.toggle("is-active", active);
        button.setAttribute("aria-pressed", active ? "true" : "false");
      });
    },
    updateAssist(enabled) {
      if (!refs.saveAssistSwitch) return;
      refs.saveAssistSwitch.setAttribute("role", "switch");
      refs.saveAssistSwitch.setAttribute("aria-checked", enabled ? "true" : "false");
      refs.saveAssistSwitch.setAttribute("aria-label", enabled ? "扑救辅助已开启" : "扑救辅助已关闭");
      refs.saveAssistSwitch.classList.toggle("is-active", enabled);
    },
    update(state, soundEnabled, context = {}) {
      var penaltyPlan = getPenaltyHudPlan(state);
      var penaltyMode = state.mode === "penalty";
      var penaltyResult = penaltyMode ? getPenaltyResultPlan(state) : null;
      var penaltyRoundBreak = context.penaltyRoundBreak || { visible: false };
      if (refs.stage) {
        refs.stage.dataset.gameActive = state.running && !state.paused && !state.ended ? "true" : "false";
      }
      if (refs.scoreLabel) refs.scoreLabel.textContent = penaltyMode ? "扑出" : "扑救分";
      if (refs.timeLabel) refs.timeLabel.textContent = penaltyMode ? "轮次" : "时间";
      if (refs.streakLabel) refs.streakLabel.textContent = penaltyMode ? "阶段" : "连扑";
      if (refs.concededLabel) refs.concededLabel.textContent = penaltyMode ? "比分" : "失球";
      if (refs.scoreValue) refs.scoreValue.textContent = String(penaltyMode ? state.saves || 0 : state.score);
      if (refs.timeValue) refs.timeValue.textContent = String(penaltyMode ? state.shootout?.round || 1 : getSecondsLeft(state));
      if (refs.streakValue) refs.streakValue.textContent = penaltyMode ? state.shootout?.suddenDeath ? "骤死" : "常规" : "x" + String(state.streak || 0);
      if (refs.concededValue) refs.concededValue.textContent = penaltyMode ? String(penaltyPlan.teamScore) + ":" + String(penaltyPlan.opponentScore) : state.conceded + "/" + MAX_CONCEDED;
      setVisible(refs.penaltyScoreboard, penaltyPlan.visible);
      if (refs.penaltyTeamKicks) refs.penaltyTeamKicks.textContent = penaltyPlan.teamMarks;
      if (refs.penaltyOpponentKicks) refs.penaltyOpponentKicks.textContent = penaltyPlan.opponentMarks;
      if (refs.penaltyTeamScore) refs.penaltyTeamScore.textContent = String(penaltyPlan.teamScore);
      if (refs.penaltyOpponentScore) refs.penaltyOpponentScore.textContent = String(penaltyPlan.opponentScore);
      if (refs.penaltyRoundLabel) refs.penaltyRoundLabel.textContent = penaltyPlan.roundLabel;
      if (refs.penaltyPhaseLabel) refs.penaltyPhaseLabel.textContent = penaltyPlan.phaseLabel;
      if (refs.penaltyAnnouncement) {
        refs.penaltyAnnouncement.textContent = context.penaltyAnnouncement || "";
        setClass(
          refs.penaltyAnnouncement,
          "is-visible",
          Boolean(context.penaltyAnnouncement) && !penaltyRoundBreak.visible,
        );
      }
      if (refs.penaltyRoundBreak) {
        setClass(refs.penaltyRoundBreak, "is-visible", Boolean(penaltyRoundBreak.visible));
        refs.penaltyRoundBreak.setAttribute(
          "aria-label",
          penaltyRoundBreak.visible
            ? penaltyRoundBreak.roundLabel + "，比分 " + penaltyRoundBreak.scoreText + "，" + penaltyRoundBreak.teamResultLabel
            : "",
        );
      }
      if (refs.penaltyRoundBreakLabel) refs.penaltyRoundBreakLabel.textContent = penaltyRoundBreak.roundLabel || "";
      if (refs.penaltyRoundBreakScore) refs.penaltyRoundBreakScore.textContent = penaltyRoundBreak.scoreText || "";
      if (refs.penaltyRoundBreakDetail) refs.penaltyRoundBreakDetail.textContent = penaltyRoundBreak.teamResultLabel || "";
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
      if (refs.finalScore) refs.finalScore.textContent = penaltyMode ? penaltyResult.score : String(state.score);
      if (refs.resultGrade) {
        var grade = penaltyMode ? penaltyResult.gradeTone : getResultGrade(state);
        refs.resultGrade.textContent = penaltyMode ? penaltyResult.grade : grade + "级";
        refs.resultGrade.dataset.grade = grade;
      }
      if (refs.resultReason) refs.resultReason.textContent = penaltyMode ? penaltyResult.reason : getResultReasonText(state.endReason);
      if (refs.resultVerdict) refs.resultVerdict.textContent = penaltyMode ? penaltyResult.verdict : getResultVerdictText(state);
      if (refs.resultSummary) {
        refs.resultSummary.textContent = penaltyMode ? penaltyResult.summary : getResultSummaryText(state);
        refs.resultSummary.dataset.summarySystem = ROUND_RESULT_SUMMARY_MARKER;
      }
      if (refs.resultCoach) {
        refs.resultCoach.textContent = penaltyMode ? penaltyResult.coach : getResultCoachText(state);
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
      if (refs.finalSavesLabel) refs.finalSavesLabel.textContent = penaltyMode ? "扑出" : "扑救";
      if (refs.finalBestStreakLabel) refs.finalBestStreakLabel.textContent = penaltyMode ? "决胜" : "连扑";
      if (refs.finalConcededLabel) refs.finalConcededLabel.textContent = penaltyMode ? "对手进球" : "失球";
      if (refs.finalBestStreak) refs.finalBestStreak.textContent = penaltyMode ? "第" + String(state.shootout?.round || 1) + "轮" : "x" + String(state.bestStreak || 0);
      if (refs.finalConceded) refs.finalConceded.textContent = penaltyMode ? String(state.shootout?.opponentGoals || 0) : state.conceded + "/" + MAX_CONCEDED;
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
      updateGloveImpactReview(context.gloveImpactReview);
      setVisible(refs.startOverlay, !state.running && !state.ended);
      setVisible(refs.pauseOverlay, state.running && state.paused && !state.ended);
      setVisible(refs.endOverlay, state.ended);
    },
  };
}
