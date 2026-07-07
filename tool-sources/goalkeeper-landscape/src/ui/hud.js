import { MAX_CONCEDED } from "../config/game-config.js";

export const ROUND_RESULT_SUMMARY_MARKER = "round-result-summary";
export const HUD_FLOW_POLISH_MARKER = "match-hud-flow-polish";

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

export function createHud(documentRef) {
  var refs = {
    scoreValue: documentRef.getElementById("scoreValue"),
    timeValue: documentRef.getElementById("timeValue"),
    streakValue: documentRef.getElementById("streakValue"),
    concededValue: documentRef.getElementById("concededValue"),
    pauseButton: documentRef.getElementById("pauseButton"),
    soundButton: documentRef.getElementById("soundButton"),
    startButton: documentRef.getElementById("startButton"),
    restartButton: documentRef.getElementById("restartButton"),
    pauseResumeButton: documentRef.getElementById("pauseResumeButton"),
    difficultyButtons: Array.from(documentRef.querySelectorAll?.("[data-difficulty]") || []),
    startOverlay: documentRef.getElementById("startOverlay"),
    pauseOverlay: documentRef.getElementById("pauseOverlay"),
    endOverlay: documentRef.getElementById("endOverlay"),
    finalScore: documentRef.getElementById("finalScore"),
    resultGrade: documentRef.getElementById("resultGrade"),
    resultReason: documentRef.getElementById("resultReason"),
    resultVerdict: documentRef.getElementById("resultVerdict"),
    resultSummary: documentRef.getElementById("resultSummary"),
    feedbackToast: documentRef.getElementById("feedbackToast"),
    matchStatus: documentRef.getElementById("matchStatus"),
    finalSaves: documentRef.getElementById("finalSaves"),
    finalBestStreak: documentRef.getElementById("finalBestStreak"),
    finalConceded: documentRef.getElementById("finalConceded"),
  };

  function setVisible(element, visible) {
    if (element) element.classList.toggle("hidden", !visible);
  }

  function setClass(element, className, enabled) {
    if (element) element.classList.toggle(className, enabled);
  }

  function updateFeedback(state) {
    var toast = refs.feedbackToast;
    var message = state.message;
    var isSave = message === "save";
    var isGoal = message === "goal";
    var isFrame = message === "frame";
    var isMiss = message === "miss";
    var isStreak = isSave && (state.streak || 0) >= 3;
    var visible = isSave || isGoal || isFrame || isMiss;

    if (toast) {
      toast.textContent = isSave
        ? (isStreak ? "连扑 " : "") + "+" + String(state.lastSavePoints || 0)
        : isGoal
          ? "失球"
          : isFrame
            ? "门框"
            : isMiss
              ? "偏出"
              : "";
      setClass(toast, "is-visible", visible);
      setClass(toast, "is-save", isSave);
      setClass(toast, "is-goal", isGoal);
      setClass(toast, "is-frame", isFrame);
      setClass(toast, "is-miss", isMiss);
      setClass(toast, "is-streak", isStreak);
    }

    setClass(refs.streakValue, "is-hot", (state.streak || 0) >= 3);
    setClass(refs.scoreValue, "is-score-pulse", isSave);
    setClass(refs.streakValue, "is-streak-pop", isStreak);
    setClass(refs.concededValue, "is-danger-pulse", isGoal);
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
      if (refs.timeValue) refs.timeValue.textContent = String(Math.max(0, Math.ceil(state.timeLeft)));
      if (refs.streakValue) refs.streakValue.textContent = "x" + String(state.streak || 0);
      if (refs.concededValue) refs.concededValue.textContent = state.conceded + "/" + MAX_CONCEDED;
      if (refs.pauseButton) {
        refs.pauseButton.textContent = state.paused ? "▶ 继续" : "Ⅱ 暂停";
        refs.pauseButton.setAttribute("aria-label", state.paused ? "继续挑战" : "暂停挑战");
      }
      if (refs.soundButton) {
        refs.soundButton.textContent = soundEnabled ? "音效开" : "静音";
        refs.soundButton.setAttribute("aria-label", soundEnabled ? "关闭音效" : "开启音效");
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
      if (refs.startOverlay) refs.startOverlay.dataset.uiSystem = HUD_FLOW_POLISH_MARKER;
      if (refs.finalSaves) refs.finalSaves.textContent = String(state.saves || 0);
      if (refs.finalBestStreak) refs.finalBestStreak.textContent = "x" + String(state.bestStreak || 0);
      if (refs.finalConceded) refs.finalConceded.textContent = state.conceded + "/" + MAX_CONCEDED;
      updateFeedback(state);
      updateMatchStatus(state, context);
      setVisible(refs.startOverlay, !state.running && !state.ended);
      setVisible(refs.pauseOverlay, state.running && state.paused && !state.ended);
      setVisible(refs.endOverlay, state.ended);
    },
  };
}
